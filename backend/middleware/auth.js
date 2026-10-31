import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { loadConfig } from '../lib/config.js';

const prisma = new PrismaClient();

export const requireAuth = async (req, res, next) => {
  try {
    const token = req.cookies?.token;

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHENTICATED',
        message: 'No authentication token provided'
      });
    }

    const decoded = jwt.verify(token, loadConfig().jwtSecret, {
      algorithms: ['HS256']
    });

    // Strictly enforce that only full session tokens can authenticate API requests
    if (!decoded || !decoded.userId || decoded.purpose !== 'session') {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHENTICATED',
        message: 'Invalid token scope'
      });
    }

    // Explicitly select safe fields so the password hash is never attached to req.user
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
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

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'UNAUTHENTICATED',
      message: 'Invalid or expired session token'
    });
  }
};