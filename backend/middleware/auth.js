import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { loadConfig } from '../lib/config.js';
export { requireBrandAccess } from './brandContext.js';

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