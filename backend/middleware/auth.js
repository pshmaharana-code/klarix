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

// Enforces that req.user owns or is a member of req.params.brandId
export const requireBrandAccess = async (req, res, next) => {
  try {
    const { brandId } = req.params;
    if (!brandId) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Brand ID is required'
      });
    }

    const brand = await prisma.brand.findFirst({
      where: {
        id: brandId,
        OR: [
          { ownerUserId: req.user.id },
          { members: { some: { userId: req.user.id } } }
        ]
      }
    });

    if (!brand) {
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'Access denied: You do not have permission to access this brand workspace.'
      });
    }

    req.brand = brand;
    next();
  } catch (error) {
    console.error('[Klarix Security] Brand access verification error:', error);
    return res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to verify workspace permissions'
    });
  }
};