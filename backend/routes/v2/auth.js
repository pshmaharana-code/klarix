import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../../middleware/auth.js';
import { loadConfig } from '../../lib/config.js';
import { OAuth2Client } from 'google-auth-library';
import { Resend } from 'resend';

const router = express.Router();
const prisma = new PrismaClient();

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const resend = new Resend(process.env.RESEND_API_KEY);

// ─────────────────────────────────────────────────────────────────────────────
// Email OTP Authentication (Passwordless)
// ─────────────────────────────────────────────────────────────────────────────

// Request OTP
router.post('/otp/request', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'VALIDATION_ERROR', message: 'Email address is required' });
    }

    // 1. Generate a 6-digit secure PIN
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // 2. Hash the PIN so it is never stored in plain text
    const hashedCode = await bcrypt.hash(otpCode, 10);

    // 3. Clear any existing unexpired tokens for this email to prevent spam
    await prisma.otpToken.deleteMany({
      where: { email: email } // Changed from phone to email
    });

    // 4. Save to database with a 5-minute expiration
    await prisma.otpToken.create({
      data: {
        email: email, // Changed from phone to email
        code: hashedCode,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000)
      }
    });

    // 5. DISPATCH LIVE EMAIL VIA RESEND
    try {
      const { data, error } = await resend.emails.send({
        from: 'Klarix Security <onboarding@resend.dev>',
        to: email,
        subject: 'Your Klarix Verification Code',
        html: `
          <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
            <h2>Klarix V2 Authentication</h2>
            <p>Your one-time access code is:</p>
            <h1 style="letter-spacing: 5px; font-size: 32px; background: #f4f4f5; padding: 20px; text-align: center; border-radius: 8px;">${otpCode}</h1>
            <p style="color: #666; font-size: 14px;">This code will expire in 5 minutes. Do not share this with anyone.</p>
          </div>
        `
      });

      if (error) {
        throw new Error(error.message);
      }

      console.log(`[Klarix API] Successfully dispatched OTP via Email to ${email}`);
    } catch (emailError) {
      console.error('[Klarix API] Resend Delivery Failed:', emailError);
      // Rollback the token if the email failed, so they can try again
      await prisma.otpToken.deleteMany({ where: { email: email } });
      return res.status(502).json({ success: false, error: 'GATEWAY_ERROR', message: 'Failed to deliver verification email. Please try again.' });
    }

    res.status(200).json({ success: true, message: 'OTP sent successfully' });
  } catch (error) {
    console.error('[Klarix API] OTP Request Error:', error);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to generate OTP' });
  }
});

// Verify OTP
router.post('/otp/verify', async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ success: false, error: 'VALIDATION_ERROR', message: 'Email and OTP code are required' });
    }

    // 1. Find the latest OTP token for this email
    const otpRecord = await prisma.otpToken.findFirst({
      where: { email: email }, // Changed from phone to email
      orderBy: { createdAt: 'desc' }
    });

    if (!otpRecord) {
      return res.status(400).json({ success: false, error: 'VALIDATION_ERROR', message: 'No active OTP found. Please request a new one.' });
    }

    // 2. Check Expiration
    if (new Date() > otpRecord.expiresAt) {
      await prisma.otpToken.delete({ where: { id: otpRecord.id } });
      return res.status(400).json({ success: false, error: 'VALIDATION_ERROR', message: 'OTP has expired. Please request a new one.' });
    }

    // 3. Verify the PIN against the hash
    const isValid = await bcrypt.compare(code, otpRecord.code);
    if (!isValid) {
      return res.status(401).json({ success: false, error: 'UNAUTHENTICATED', message: 'Invalid OTP code' });
    }

    // 4. Burn the token so it cannot be reused
    await prisma.otpToken.delete({ where: { id: otpRecord.id } });

    // 5. Find or Create the User (JIT Provisioning)
    let user = await prisma.user.findFirst({
      where: { email: email }
    });

    if (!user) {
      user = await prisma.user.create({
        data: { email: email }
      });
    }

    // 6. Issue Klarix JWT Cookie
    const jwtToken = jwt.sign({ userId: user.id }, loadConfig().jwtSecret, { expiresIn: '7d' });

    res.cookie('token', jwtToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.status(200).json({ success: true, data: { user: { id: user.id, email: user.email } } });
  } catch (error) {
    console.error('[Klarix API] OTP Verify Error:', error);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'An error occurred during verification' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Google OAuth Authentication (Passwordless)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/google', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ success: false, error: 'VALIDATION_ERROR', message: 'Google credential token is required' });

    const ticket = await googleClient.verifyIdToken({ idToken: token, audience: process.env.GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();
    const googleId = payload['sub'];
    const email = payload['email'];

    if (!email) return res.status(400).json({ success: false, error: 'VALIDATION_ERROR', message: 'Google account must have an email address' });

    let user = await prisma.user.findFirst({
      where: { OR: [{ googleId: googleId }, { email: email }] }
    });

    if (!user) {
      user = await prisma.user.create({ data: { email: email, googleId: googleId } });
    } else if (!user.googleId) {
      user = await prisma.user.update({ where: { id: user.id }, data: { googleId: googleId } });
    }

    const jwtToken = jwt.sign({ userId: user.id }, loadConfig().jwtSecret, { expiresIn: '7d' });
    res.cookie('token', jwtToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 7 * 24 * 60 * 60 * 1000 });
    res.status(200).json({ success: true, data: { user: { id: user.id, email: user.email } } });
  } catch (error) {
    console.error('[Klarix API] Google Auth Error:', error);
    res.status(401).json({ success: false, error: 'UNAUTHENTICATED', message: 'Invalid Google token' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Traditional Manual Registration & Login (Legacy)
// ─────────────────────────────────────────────────────────────────────────────

router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, error: 'VALIDATION_ERROR', message: 'Email and password are required' });

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return res.status(409).json({ success: false, error: 'CONFLICT', message: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({ data: { email, password: hashedPassword } });

    const token = jwt.sign({ userId: user.id }, loadConfig().jwtSecret, { expiresIn: '7d' });
    res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 7 * 24 * 60 * 60 * 1000 });
    res.status(201).json({ success: true, data: { user: { id: user.id, email: user.email } } });
  } catch (error) {
    console.error('[Klarix API] Registration Error:', error);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'An error occurred during registration' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, error: 'VALIDATION_ERROR', message: 'Email and password are required' });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.password) return res.status(401).json({ success: false, error: 'UNAUTHENTICATED', message: 'Invalid credentials or please sign in with Google.' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ success: false, error: 'UNAUTHENTICATED', message: 'Invalid credentials' });

    const token = jwt.sign({ userId: user.id }, loadConfig().jwtSecret, { expiresIn: '7d' });
    res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 7 * 24 * 60 * 60 * 1000 });
    res.status(200).json({ success: true, data: { user: { id: user.id, email: user.email } } });
  } catch (error) {
    console.error('[Klarix API] Login Error:', error);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'An error occurred during login' });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.status(200).json({ success: true, message: 'Logged out successfully' });
});

router.get('/session', requireAuth, (req, res) => {
  res.status(200).json({ success: true, data: { user: { id: req.user.id, email: req.user.email, phoneNumber: req.user.phoneNumber } } });
});

// ─────────────────────────────────────────────────────────────────────────────
// Password Reset Architecture
// ─────────────────────────────────────────────────────────────────────────────

// 1. Request Password Reset Link
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'VALIDATION_ERROR', message: 'Email is required' });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    // SECURITY: Always return 200 to prevent email enumeration (guessing registered users)
    if (!user) {
      return res.status(200).json({ success: true, message: 'If an account exists, a reset link has been sent.' });
    }

    // Generate a secure 32-byte random token
    const resetToken = crypto.randomBytes(32).toString('hex');
    // Hash it before storing in the database
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Clear any existing reset tokens for this email to prevent spam
    await prisma.passwordResetToken.deleteMany({ where: { email } });

    // Save the hashed token to the database (Expires in 15 minutes)
    await prisma.passwordResetToken.create({
      data: {
        email,
        token: hashedToken,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000)
      }
    });

    // Generate the frontend reset URL
    // (Assuming frontend runs on localhost:5173 for dev)
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

    // Dispatch the email via Resend
    const { error } = await resend.emails.send({
      from: 'Klarix Security <onboarding@resend.dev>',
      to: email,
      subject: 'Reset your Klarix Security Key',
      html: `
        <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 10px;">
          <h2 style="color: #111;">Klarix Security</h2>
          <p style="color: #444; font-size: 15px;">You requested a security key reset. Click the button below to authorize a new key:</p>
          <a href="${resetLink}" style="display: block; width: 100%; text-align: center; padding: 14px 0; background-color: #4f46e5; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 25px 0;">Reset Security Key</a>
          <p style="color: #888; font-size: 12px; border-top: 1px solid #eaeaea; padding-top: 15px;">This secure link will expire in 15 minutes. If you did not request this, please ignore this email.</p>
        </div>
      `
    });

    if (error) throw new Error(error.message);

    res.status(200).json({ success: true, message: 'If an account exists, a reset link has been sent.' });
  } catch (error) {
    console.error('[Klarix API] Forgot Password Error:', error);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to process password reset request' });
  }
});

// 2. Validate Token and Update Password
router.post('/reset-password', async (req, res) => {
  try {
    const { email, token, newPassword } = req.body;

    if (!email || !token || !newPassword) {
      return res.status(400).json({ success: false, error: 'VALIDATION_ERROR', message: 'Missing required fields' });
    }

    // Hash the incoming URL token to compare with the database
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find the token record
    const resetRecord = await prisma.passwordResetToken.findFirst({
      where: { email, token: hashedToken }
    });

    if (!resetRecord) {
      return res.status(400).json({ success: false, error: 'VALIDATION_ERROR', message: 'Invalid or expired reset link.' });
    }

    // Check expiration
    if (new Date() > resetRecord.expiresAt) {
      await prisma.passwordResetToken.delete({ where: { id: resetRecord.id } });
      return res.status(400).json({ success: false, error: 'VALIDATION_ERROR', message: 'Reset link has expired.' });
    }

    // Hash the new password and update the user record
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { email },
      data: { password: hashedPassword }
    });

    // Burn the token so it cannot be reused
    await prisma.passwordResetToken.delete({ where: { id: resetRecord.id } });

    res.status(200).json({ success: true, message: 'Security key has been reset successfully.' });
  } catch (error) {
    console.error('[Klarix API] Reset Password Error:', error);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to reset password' });
  }
});

export default router;