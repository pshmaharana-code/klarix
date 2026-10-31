import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../../middleware/auth.js';
import { loadConfig } from '../../lib/config.js';
import { OAuth2Client } from 'google-auth-library';
import { Resend } from 'resend';

const router = express.Router();
const prisma = new PrismaClient();

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const resend = new Resend(process.env.RESEND_API_KEY);

// Helper: Issue 7-day session cookie
const issueSessionCookie = (res, userId) => {
  const token = jwt.sign({ userId }, loadConfig().jwtSecret, { expiresIn: '7d' });
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// 1. GOOGLE OAUTH (Sign In & Sign Up)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/google', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ success: false, error: 'VALIDATION_ERROR', message: 'Google credential token is required' });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    const payload = ticket.getPayload();
    const googleId = payload['sub'];
    const email = payload['email'];

    if (!email) {
      return res.status(400).json({ success: false, error: 'VALIDATION_ERROR', message: 'Google account must have an email address' });
    }

    let user = await prisma.user.findFirst({
      where: { OR: [{ googleId }, { email }] }
    });

    if (!user) {
      user = await prisma.user.create({
        data: { email, googleId, emailVerified: true }
      });
    } else if (!user.googleId || !user.emailVerified) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { googleId, emailVerified: true }
      });
    }

    issueSessionCookie(res, user.id);
    res.status(200).json({ success: true, data: { user: { id: user.id, email: user.email } } });
  } catch (error) {
    console.error('[Klarix API] Google Auth Error:', error);
    res.status(401).json({ success: false, error: 'UNAUTHENTICATED', message: 'Invalid Google token' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. MANUAL LOGIN (Email + Security Key)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'VALIDATION_ERROR', message: 'Email and security key are required' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.password) {
      return res.status(401).json({ success: false, error: 'UNAUTHENTICATED', message: 'Invalid credentials or account uses Google Sign-In.' });
    }

    if (!user.emailVerified) {
      return res.status(403).json({ success: false, error: 'UNVERIFIED', message: 'Email is not verified. Please complete registration.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'UNAUTHENTICATED', message: 'Invalid email or security key.' });
    }

    issueSessionCookie(res, user.id);
    res.status(200).json({ success: true, data: { user: { id: user.id, email: user.email } } });
  } catch (error) {
    console.error('[Klarix API] Login Error:', error);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'An error occurred during sign in' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. MANUAL REGISTRATION (3-Step Flow: Email -> Verify OTP -> Set Security Key)
// ─────────────────────────────────────────────────────────────────────────────

// STEP 1: Enter Email & Send OTP
router.post('/register/send-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'VALIDATION_ERROR', message: 'Email address is required' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser && existingUser.emailVerified && existingUser.password) {
      return res.status(409).json({ success: false, error: 'CONFLICT', message: 'Account already exists. Please sign in.' });
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedCode = await bcrypt.hash(otpCode, 10);

    await prisma.otpToken.deleteMany({ where: { email } });
    await prisma.otpToken.create({
      data: {
        email,
        code: hashedCode,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
      }
    });

    const { error } = await resend.emails.send({
      from: 'Klarix Security <onboarding@resend.dev>',
      to: email,
      subject: 'Verify your Klarix Email Address',
      html: `
        <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
          <h2>Welcome to Klarix V2</h2>
          <p>Use the following 6-digit verification code to confirm your email ownership:</p>
          <h1 style="letter-spacing: 5px; font-size: 32px; background: #f4f4f5; padding: 20px; text-align: center; border-radius: 8px;">${otpCode}</h1>
          <p style="color: #666; font-size: 14px;">This code expires in 10 minutes.</p>
        </div>
      `
    });

    if (error) {
      await prisma.otpToken.deleteMany({ where: { email } });
      throw new Error(error.message);
    }

    res.status(200).json({ success: true, message: 'Verification code sent to your email.' });
  } catch (error) {
    console.error('[Klarix API] Register Send OTP Error:', error);
    res.status(502).json({ success: false, error: 'GATEWAY_ERROR', message: 'Failed to send verification email. Please check the address and try again.' });
  }
});

// STEP 2: Verify OTP & Issue Temporary Verification Token
router.post('/register/verify-otp', async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ success: false, error: 'VALIDATION_ERROR', message: 'Email and verification code are required' });
    }

    const otpRecord = await prisma.otpToken.findFirst({
      where: { email },
      orderBy: { createdAt: 'desc' }
    });

    if (!otpRecord || new Date() > otpRecord.expiresAt) {
      if (otpRecord) await prisma.otpToken.delete({ where: { id: otpRecord.id } });
      return res.status(400).json({ success: false, error: 'VALIDATION_ERROR', message: 'Code is invalid or expired. Please request a new one.' });
    }

    const isValid = await bcrypt.compare(code, otpRecord.code);
    if (!isValid) {
      return res.status(401).json({ success: false, error: 'UNAUTHENTICATED', message: 'Invalid verification code.' });
    }

    // Burn OTP token after successful verification
    await prisma.otpToken.delete({ where: { id: otpRecord.id } });

    // Issue a 10-minute signed token proving this email was verified for Step 3
    const verificationToken = jwt.sign(
      { email, purpose: 'register_verified' },
      loadConfig().jwtSecret,
      { expiresIn: '10m' }
    );

    res.status(200).json({
      success: true,
      message: 'Email verified. Please create your security key.',
      data: { verificationToken }
    });
  } catch (error) {
    console.error('[Klarix API] Register Verify OTP Error:', error);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Verification failed' });
  }
});

// STEP 3: Create Security Key & Finalize Account
router.post('/register/complete', async (req, res) => {
  try {
    const { email, password, verificationToken } = req.body;
    if (!email || !password || !verificationToken) {
      return res.status(400).json({ success: false, error: 'VALIDATION_ERROR', message: 'Missing required registration fields' });
    }

    let payload;
    try {
      payload = jwt.verify(verificationToken, loadConfig().jwtSecret);
    } catch (err) {
      return res.status(401).json({ success: false, error: 'UNAUTHENTICATED', message: 'Verification session expired. Please verify your email again.' });
    }

    if (payload.email !== email || payload.purpose !== 'register_verified') {
      return res.status(401).json({ success: false, error: 'UNAUTHENTICATED', message: 'Invalid verification token.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    let user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      user = await prisma.user.update({
        where: { email },
        data: { password: hashedPassword, emailVerified: true }
      });
    } else {
      user = await prisma.user.create({
        data: { email, password: hashedPassword, emailVerified: true }
      });
    }

    issueSessionCookie(res, user.id);
    res.status(201).json({ success: true, data: { user: { id: user.id, email: user.email } } });
  } catch (error) {
    console.error('[Klarix API] Register Complete Error:', error);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to finalize account registration' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. FORGOT PASSWORD (3-Step Flow: Email -> Verify OTP -> Reset Security Key)
// ─────────────────────────────────────────────────────────────────────────────

// STEP 1: Enter Registered Email & Send Reset OTP
router.post('/forgot-password/send-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'VALIDATION_ERROR', message: 'Email address is required' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'No registered account found with this email address.' });
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedCode = await bcrypt.hash(otpCode, 10);

    await prisma.otpToken.deleteMany({ where: { email } });
    await prisma.otpToken.create({
      data: {
        email,
        code: hashedCode,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000)
      }
    });

    const { error } = await resend.emails.send({
      from: 'Klarix Security <onboarding@resend.dev>',
      to: email,
      subject: 'Klarix Security Key Reset Code',
      html: `
        <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
          <h2>Reset Your Klarix Security Key</h2>
          <p>Enter the following 6-digit verification code to reset your security key:</p>
          <h1 style="letter-spacing: 5px; font-size: 32px; background: #f4f4f5; padding: 20px; text-align: center; border-radius: 8px;">${otpCode}</h1>
          <p style="color: #666; font-size: 14px;">This code expires in 10 minutes. If you did not request this, ignore this email.</p>
        </div>
      `
    });

    if (error) {
      await prisma.otpToken.deleteMany({ where: { email } });
      throw new Error(error.message);
    }

    res.status(200).json({ success: true, message: 'Reset code sent to your email.' });
  } catch (error) {
    console.error('[Klarix API] Forgot Password Send OTP Error:', error);
    res.status(502).json({ success: false, error: 'GATEWAY_ERROR', message: 'Failed to send reset code. Please try again.' });
  }
});

// STEP 2: Verify Reset OTP
router.post('/forgot-password/verify-otp', async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ success: false, error: 'VALIDATION_ERROR', message: 'Email and code are required' });
    }

    const otpRecord = await prisma.otpToken.findFirst({
      where: { email },
      orderBy: { createdAt: 'desc' }
    });

    if (!otpRecord || new Date() > otpRecord.expiresAt) {
      if (otpRecord) await prisma.otpToken.delete({ where: { id: otpRecord.id } });
      return res.status(400).json({ success: false, error: 'VALIDATION_ERROR', message: 'Code is invalid or expired. Please request a new one.' });
    }

    const isValid = await bcrypt.compare(code, otpRecord.code);
    if (!isValid) {
      return res.status(401).json({ success: false, error: 'UNAUTHENTICATED', message: 'Invalid verification code.' });
    }

    await prisma.otpToken.delete({ where: { id: otpRecord.id } });

    const resetToken = jwt.sign(
      { email, purpose: 'password_reset_verified' },
      loadConfig().jwtSecret,
      { expiresIn: '10m' }
    );

    res.status(200).json({
      success: true,
      message: 'Code verified. Please enter your new security key.',
      data: { resetToken }
    });
  } catch (error) {
    console.error('[Klarix API] Forgot Password Verify OTP Error:', error);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Verification failed' });
  }
});

// STEP 3: Save New Security Key
router.post('/forgot-password/reset', async (req, res) => {
  try {
    const { email, newPassword, resetToken } = req.body;
    if (!email || !newPassword || !resetToken) {
      return res.status(400).json({ success: false, error: 'VALIDATION_ERROR', message: 'Missing required fields' });
    }

    let payload;
    try {
      payload = jwt.verify(resetToken, loadConfig().jwtSecret);
    } catch (err) {
      return res.status(401).json({ success: false, error: 'UNAUTHENTICATED', message: 'Reset session expired. Please request a new code.' });
    }

    if (payload.email !== email || payload.purpose !== 'password_reset_verified') {
      return res.status(401).json({ success: false, error: 'UNAUTHENTICATED', message: 'Invalid reset token.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { email },
      data: { password: hashedPassword, emailVerified: true }
    });

    res.status(200).json({ success: true, message: 'Security key updated successfully. Please sign in.' });
  } catch (error) {
    console.error('[Klarix API] Forgot Password Reset Error:', error);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to update security key' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. SESSION & LOGOUT
// ─────────────────────────────────────────────────────────────────────────────
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.status(200).json({ success: true, message: 'Logged out successfully' });
});

router.get('/session', requireAuth, (req, res) => {
  res.status(200).json({ success: true, data: { user: { id: req.user.id, email: req.user.email } } });
});

export default router;