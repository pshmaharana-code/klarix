import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { loadConfig } from '../lib/config.js';

const prisma = new PrismaClient();

export const requireAuth = async (req, res, next) => {
  try {
    const token = req.cookies.token;
    
    if (!token) {
      return res.status(401).json({ success: false, error: 'UNAUTHENTICATED', message: 'No authentication token provided' });
    }

    const decoded = jwt.verify(token, loadConfig().jwtSecret);
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });

    if (!user) {
      return res.status(401).json({ success: false, error: 'UNAUTHENTICATED', message: 'Invalid authentication token' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, error: 'UNAUTHENTICATED', message: 'Invalid or expired token' });
  }
};
