import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { loadConfig } from '../lib/config.js';
export { requireBrandAccess } from './brandContext.js';

const prisma = new PrismaClient();

export const getPasswordFingerprint = (passwordHash) => {
  if (!passwordHash) return 'oauth_only';
  return crypto.createHash('sha256').update(passwordHash).digest('hex').slice(0, 16);
};

export const requireAuth = async (req, res, next) => {
  try {
    const token = req.cookies?.token;

    if (!token || typeof token !== 'string') {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHENTICATED',
        message: 'No authentication token provided'
      });
    }

    const decoded = jwt.verify(token, loadConfig().jwtSecret, {
      algorithms: ['HS256']
    });

    if (!decoded || !decoded.userId || decoded.purpose !== 'session') {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHENTICATED',
        message: 'Invalid token scope'
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        password: true,
        emailVerified: true,
        googleId: true,
        createdAt: true
      }
    });

    if (!user || !user.emailVerified) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHENTICATED',
        message: 'Invalid or unverified user account'
      });
    }

    // Invalidate sessions issued prior to a password reset/change
    const currentFingerprint = getPasswordFingerprint(user.password);
    if (decoded.pwdFg && decoded.pwdFg !== currentFingerprint) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHENTICATED',
        message: 'Session expired due to security key change. Please sign in again.'
      });
    }

    const { password: _, ...safeUser } = user;
    req.user = safeUser;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'UNAUTHENTICATED',
      message: 'Invalid or expired session token'
    });
  }
};