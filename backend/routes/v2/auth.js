import express from 'express';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { requireAuth, getPasswordFingerprint } from '../../middleware/auth.js';
import { loadConfig } from '../../lib/config.js';
import { OAuth2Client } from 'google-auth-library';
import { Resend } from 'resend';

const router = express.Router();
const prisma = new PrismaClient();

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const resend = new Resend(process.env.RESEND_API_KEY);

// ─── Rate Limiting & Brute-Force Protection ──────────────────────────────────
const otpFailedAttempts = new Map();
const otpSendCooldowns = new Map();
const loginRateLimits = new Map();

const MAX_OTP_ATTEMPTS = 5;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds between OTP emails
const MAX_LOGIN_ATTEMPTS = 10;
const LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

const emailSchema = z.string().trim().toLowerCase().email().max(254);
// Cap password at 72 chars to prevent Bcrypt CPU DoS and silent truncation
const passwordSchema = z.string().min(6, 'Security key must be at least 6 characters.').max(72, 'Security key cannot exceed 72 characters.');

const normalizeEmail = (raw) => {
  const parsed = emailSchema.safeParse(raw);
  return parsed.success ? parsed.data : '';
};

const generateSecureOtp = () => crypto.randomInt(100000, 1000000).toString();
const hashOpaqueToken = (token) => crypto.createHash('sha256').update(String(token)).digest('hex');

const checkLoginRateLimit = (key) => {
  const now = Date.now();
  const record = loginRateLimits.get(key);
  if (!record || now > record.resetAt) {
    loginRateLimits.set(key, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
    return true;
  }
  if (record.count >= MAX_LOGIN_ATTEMPTS) return false;
  record.count += 1;
  return true;
};

const getCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000
});

// Issue 7-day session cookie bound to the user's current password fingerprint
const issueSessionCookie = (res, user) => {
  const token = jwt.sign(
    {
      userId: user.id,
      purpose: 'session',
      pwdFg: getPasswordFingerprint(user.password)
    },
    loadConfig().jwtSecret,
    { expiresIn: '7d', algorithm: 'HS256' }
  );
  res.cookie('token', token, getCookieOptions());
};

// ─────────────────────────────────────────────────────────────────────────────
// 1. GOOGLE OAUTH (Sign In & Sign Up)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/google', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ success: false, error: 'VALIDATION_ERROR', message: 'Google credential token is required' });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    const payload = ticket.getPayload();
    const googleId = payload?.['sub'];
    const email = normalizeEmail(payload?.['email']);

    if (!email || !googleId || !payload?.['email_verified']) {
      return res.status(400).json({ success: false, error: 'VALIDATION_ERROR', message: 'Verified Google email address is required' });
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

    issueSessionCookie(res, user);
    res.status(200).json({ success: true, data: { user: { id: user.id, email: user.email } } });
  } catch (error) {
    console.error('[Klarix API] Google Auth Error:', error.message);
    res.status(401).json({ success: false, error: 'UNAUTHENTICATED', message: 'Invalid Google token' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. MANUAL LOGIN (Email + Security Key)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const { password } = req.body;

    if (!email || typeof password !== 'string' || !password) {
      return res.status(400).json({ success: false, error: 'VALIDATION_ERROR', message: 'Valid email and security key are required' });
    }

    if (password.length > 72) {
      return res.status(401).json({ success: false, error: 'UNAUTHENTICATED', message: 'Invalid email or security key.' });
    }

    const rateKey = `${req.ip}:${email}`;
    if (!checkLoginRateLimit(rateKey)) {
      return res.status(429).json({
        success: false,
        error: 'TOO_MANY_ATTEMPTS',
        message: 'Too many sign-in attempts. Please wait 15 minutes before trying again.'
      });
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

    loginRateLimits.delete(rateKey);
    issueSessionCookie(res, user);
    res.status(200).json({ success: true, data: { user: { id: user.id, email: user.email } } });
  } catch (error) {
    console.error('[Klarix API] Login Error:', error.message);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'An error occurred during sign in' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. MANUAL REGISTRATION (3-Step Flow: Email -> Verify OTP -> Set Security Key)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/register/send-otp', async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    if (!email) {
      return res.status(400).json({ success: false, error: 'VALIDATION_ERROR', message: 'Valid email address is required' });
    }

    const lastSent = otpSendCooldowns.get(`reg:${email}`) || 0;
    if (Date.now() - lastSent < OTP_RESEND_COOLDOWN_MS) {
      return res.status(429).json({
        success: false,
        error: 'TOO_MANY_ATTEMPTS',
        message: 'Please wait 60 seconds before requesting another verification code.'
      });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser && existingUser.emailVerified && existingUser.password) {
      return res.status(409).json({ success: false, error: 'CONFLICT', message: 'Account already exists. Please sign in.' });
    }

    const otpCode = generateSecureOtp();
    // Namespace the OTP hash with 'REGISTER:' so it cannot be used on the forgot-password endpoint
    const hashedCode = await bcrypt.hash(`REGISTER:${otpCode}`, 10);

    await prisma.otpToken.deleteMany({ where: { email } });
    await prisma.otpToken.create({
      data: {
        email,
        code: hashedCode,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000)
      }
    });
    otpFailedAttempts.delete(`reg:${email}`);
    otpSendCooldowns.set(`reg:${email}`, Date.now());

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
      otpSendCooldowns.delete(`reg:${email}`);
      throw new Error(error.message);
    }

    res.status(200).json({ success: true, message: 'Verification code sent to your email.' });
  } catch (error) {
    console.error('[Klarix API] Register Send OTP Error:', error.message);
    res.status(502).json({ success: false, error: 'GATEWAY_ERROR', message: 'Failed to send verification email. Please check the address and try again.' });
  }
});

router.post('/register/verify-otp', async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const code = typeof req.body.code === 'string' ? req.body.code.trim() : '';
    if (!email || !/^\d{6}$/.test(code)) {
      return res.status(400).json({ success: false, error: 'VALIDATION_ERROR', message: 'Valid email and 6-digit verification code are required' });
    }

    const otpRecord = await prisma.otpToken.findFirst({
      where: { email },
      orderBy: { createdAt: 'desc' }
    });

    if (!otpRecord || new Date() > otpRecord.expiresAt) {
      if (otpRecord) await prisma.otpToken.delete({ where: { id: otpRecord.id } });
      return res.status(400).json({ success: false, error: 'VALIDATION_ERROR', message: 'Code is invalid or expired. Please request a new one.' });
    }

    const isValid = await bcrypt.compare(`REGISTER:${code}`, otpRecord.code);
    if (!isValid) {
      const attempts = (otpFailedAttempts.get(`reg:${email}`) || 0) + 1;
      otpFailedAttempts.set(`reg:${email}`, attempts);

      if (attempts >= MAX_OTP_ATTEMPTS) {
        await prisma.otpToken.deleteMany({ where: { email } });
        otpFailedAttempts.delete(`reg:${email}`);
        return res.status(429).json({ success: false, error: 'TOO_MANY_ATTEMPTS', message: 'Too many failed attempts. Code invalidated; please request a new one.' });
      }
      return res.status(401).json({ success: false, error: 'UNAUTHENTICATED', message: 'Invalid verification code.' });
    }

    await prisma.otpToken.delete({ where: { id: otpRecord.id } });
    otpFailedAttempts.delete(`reg:${email}`);

    // Store one-time verification token in PasswordResetToken table to prevent replay
    const rawVerificationToken = crypto.randomBytes(32).toString('base64url');
    const hashedToken = hashOpaqueToken(`REG_VERIFY:${email}:${rawVerificationToken}`);

    await prisma.passwordResetToken.deleteMany({ where: { email } });
    await prisma.passwordResetToken.create({
      data: {
        email,
        token: hashedToken,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000)
      }
    });

    res.status(200).json({
      success: true,
      message: 'Email verified. Please create your security key.',
      data: { verificationToken: rawVerificationToken }
    });
  } catch (error) {
    console.error('[Klarix API] Register Verify OTP Error:', error.message);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Verification failed' });
  }
});

router.post('/register/complete', async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const { password, verificationToken } = req.body;
    if (!email || !password || !verificationToken) {
      return res.status(400).json({ success: false, error: 'VALIDATION_ERROR', message: 'Missing required registration fields' });
    }

    const parsedPassword = passwordSchema.safeParse(password);
    if (!parsedPassword.success) {
      return res.status(400).json({ success: false, error: 'VALIDATION_ERROR', message: parsedPassword.error.issues[0].message });
    }

    const hashedToken = hashOpaqueToken(`REG_VERIFY:${email}:${verificationToken}`);
    const tokenRecord = await prisma.passwordResetToken.findUnique({ where: { token: hashedToken } });

    if (!tokenRecord || tokenRecord.email !== email || new Date() > tokenRecord.expiresAt) {
      if (tokenRecord) await prisma.passwordResetToken.delete({ where: { id: tokenRecord.id } });
      return res.status(401).json({ success: false, error: 'UNAUTHENTICATED', message: 'Verification session expired or invalid. Please verify your email again.' });
    }

    // Consume the one-time token immediately
    await prisma.passwordResetToken.delete({ where: { id: tokenRecord.id } });

    let user = await prisma.user.findUnique({ where: { email } });
    if (user && user.emailVerified && user.password) {
      return res.status(409).json({ success: false, error: 'CONFLICT', message: 'Account already registered.' });
    }

    const hashedPassword = await bcrypt.hash(parsedPassword.data, 10);

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

    issueSessionCookie(res, user);
    res.status(201).json({ success: true, data: { user: { id: user.id, email: user.email } } });
  } catch (error) {
    console.error('[Klarix API] Register Complete Error:', error.message);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to finalize account registration' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. FORGOT PASSWORD (3-Step Flow: Email -> Verify OTP -> Reset Security Key)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/forgot-password/send-otp', async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    if (!email) {
      return res.status(400).json({ success: false, error: 'VALIDATION_ERROR', message: 'Valid email address is required' });
    }

    const lastSent = otpSendCooldowns.get(`reset:${email}`) || 0;
    if (Date.now() - lastSent < OTP_RESEND_COOLDOWN_MS) {
      return res.status(429).json({
        success: false,
        error: 'TOO_MANY_ATTEMPTS',
        message: 'Please wait 60 seconds before requesting another reset code.'
      });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'No registered account found with this email address.' });
    }

    const otpCode = generateSecureOtp();
    // Namespace with 'RESET:' to prevent cross-flow OTP reuse
    const hashedCode = await bcrypt.hash(`RESET:${otpCode}`, 10);

    await prisma.otpToken.deleteMany({ where: { email } });
    await prisma.otpToken.create({
      data: {
        email,
        code: hashedCode,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000)
      }
    });
    otpFailedAttempts.delete(`reset:${email}`);
    otpSendCooldowns.set(`reset:${email}`, Date.now());

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
      otpSendCooldowns.delete(`reset:${email}`);
      throw new Error(error.message);
    }

    res.status(200).json({ success: true, message: 'Reset code sent to your email.' });
  } catch (error) {
    console.error('[Klarix API] Forgot Password Send OTP Error:', error.message);
    res.status(502).json({ success: false, error: 'GATEWAY_ERROR', message: 'Failed to send reset code. Please try again.' });
  }
});

router.post('/forgot-password/verify-otp', async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const code = typeof req.body.code === 'string' ? req.body.code.trim() : '';
    if (!email || !/^\d{6}$/.test(code)) {
      return res.status(400).json({ success: false, error: 'VALIDATION_ERROR', message: 'Valid email and 6-digit code are required' });
    }

    const otpRecord = await prisma.otpToken.findFirst({
      where: { email },
      orderBy: { createdAt: 'desc' }
    });

    if (!otpRecord || new Date() > otpRecord.expiresAt) {
      if (otpRecord) await prisma.otpToken.delete({ where: { id: otpRecord.id } });
      return res.status(400).json({ success: false, error: 'VALIDATION_ERROR', message: 'Code is invalid or expired. Please request a new one.' });
    }

    const isValid = await bcrypt.compare(`RESET:${code}`, otpRecord.code);
    if (!isValid) {
      const attempts = (otpFailedAttempts.get(`reset:${email}`) || 0) + 1;
      otpFailedAttempts.set(`reset:${email}`, attempts);

      if (attempts >= MAX_OTP_ATTEMPTS) {
        await prisma.otpToken.deleteMany({ where: { email } });
        otpFailedAttempts.delete(`reset:${email}`);
        return res.status(429).json({ success: false, error: 'TOO_MANY_ATTEMPTS', message: 'Too many failed attempts. Code invalidated; please request a new one.' });
      }
      return res.status(401).json({ success: false, error: 'UNAUTHENTICATED', message: 'Invalid verification code.' });
    }

    await prisma.otpToken.delete({ where: { id: otpRecord.id } });
    otpFailedAttempts.delete(`reset:${email}`);

    // Issue a database-backed single-use reset token in PasswordResetToken
    const rawResetToken = crypto.randomBytes(32).toString('base64url');
    const hashedToken = hashOpaqueToken(`PWD_RESET:${email}:${rawResetToken}`);

    await prisma.passwordResetToken.deleteMany({ where: { email } });
    await prisma.passwordResetToken.create({
      data: {
        email,
        token: hashedToken,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000)
      }
    });

    res.status(200).json({
      success: true,
      message: 'Code verified. Please enter your new security key.',
      data: { resetToken: rawResetToken }
    });
  } catch (error) {
    console.error('[Klarix API] Forgot Password Verify OTP Error:', error.message);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Verification failed' });
  }
});

router.post('/forgot-password/reset', async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const { newPassword, resetToken } = req.body;
    if (!email || !newPassword || !resetToken) {
      return res.status(400).json({ success: false, error: 'VALIDATION_ERROR', message: 'Missing required fields' });
    }

    const parsedPassword = passwordSchema.safeParse(newPassword);
    if (!parsedPassword.success) {
      return res.status(400).json({ success: false, error: 'VALIDATION_ERROR', message: parsedPassword.error.issues[0].message });
    }

    const hashedToken = hashOpaqueToken(`PWD_RESET:${email}:${resetToken}`);
    const tokenRecord = await prisma.passwordResetToken.findUnique({ where: { token: hashedToken } });

    if (!tokenRecord || tokenRecord.email !== email || new Date() > tokenRecord.expiresAt) {
      if (tokenRecord) await prisma.passwordResetToken.delete({ where: { id: tokenRecord.id } });
      return res.status(401).json({ success: false, error: 'UNAUTHENTICATED', message: 'Reset session expired or invalid. Please request a new code.' });
    }

    // Burn the single-use reset token immediately
    await prisma.passwordResetToken.delete({ where: { id: tokenRecord.id } });

    const hashedPassword = await bcrypt.hash(parsedPassword.data, 10);
    await prisma.user.update({
      where: { email },
      data: { password: hashedPassword, emailVerified: true }
    });

    res.status(200).json({ success: true, message: 'Security key updated successfully. Please sign in.' });
  } catch (error) {
    console.error('[Klarix API] Forgot Password Reset Error:', error.message);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to update security key' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. SESSION & LOGOUT
// ─────────────────────────────────────────────────────────────────────────────
router.post('/logout', (req, res) => {
  const { maxAge, ...clearOptions } = getCookieOptions();
  res.clearCookie('token', clearOptions);
  res.status(200).json({ success: true, message: 'Logged out successfully' });
});

router.get('/session', requireAuth, (req, res) => {
  res.status(200).json({ success: true, data: { user: { id: req.user.id, email: req.user.email } } });
});

export default router;