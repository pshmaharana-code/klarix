import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../../middleware/auth.js';
import { loadConfig } from '../../lib/config.js';
import { OAuth2Client } from 'google-auth-library';

const router = express.Router();
const prisma = new PrismaClient();

// Initialize Google OAuth Client
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ─────────────────────────────────────────────────────────────────────────────
// Google OAuth Authentication (Passwordless)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/google', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ success: false, error: 'VALIDATION_ERROR', message: 'Google credential token is required' });
    }

    // 1. Verify the token with Google securely
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const googleId = payload['sub'];
    const email = payload['email'];

    if (!email) {
      return res.status(400).json({ success: false, error: 'VALIDATION_ERROR', message: 'Google account must have an email address' });
    }

    // 2. Find existing user by Google ID or Email
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { googleId: googleId },
          { email: email }
        ]
      }
    });

    // 3. Create new user if they don't exist
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: email,
          googleId: googleId,
          // No password needed
        }
      });
    } else if (!user.googleId) {
      // If user exists via manual login but now used Google, link the accounts
      user = await prisma.user.update({
        where: { id: user.id },
        data: { googleId: googleId }
      });
    }

    // 4. Issue standard Klarix JWT Cookie
    const jwtToken = jwt.sign({ userId: user.id }, loadConfig().jwtSecret, { expiresIn: '7d' });

    res.cookie('token', jwtToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

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
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'VALIDATION_ERROR', message: 'Email and password are required' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ success: false, error: 'CONFLICT', message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword
      }
    });

    const token = jwt.sign({ userId: user.id }, loadConfig().jwtSecret, { expiresIn: '7d' });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.status(201).json({ success: true, data: { user: { id: user.id, email: user.email } } });
  } catch (error) {
    console.error('[Klarix API] Registration Error:', error);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'An error occurred during registration' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'VALIDATION_ERROR', message: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    // Check if the user exists AND if they actually have a password (they might be a Google-only user)
    if (!user || !user.password) {
      return res.status(401).json({ success: false, error: 'UNAUTHENTICATED', message: 'Invalid credentials or please sign in with Google.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'UNAUTHENTICATED', message: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user.id }, loadConfig().jwtSecret, { expiresIn: '7d' });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

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
  res.status(200).json({ success: true, data: { user: { id: req.user.id, email: req.user.email } } });
});

export default router;