import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const requireBrandAccess = async (req, res, next) => {
  try {
    // Prioritize URL path parameter over body to prevent body-override spoofing
    const rawBrandId = req.params?.brandId || req.body?.brandId;
    const brandId = typeof rawBrandId === 'string' ? rawBrandId.trim() : '';

    if (!brandId) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Valid Brand ID is required'
      });
    }

    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHENTICATED',
        message: 'Must be authenticated to access brand resources'
      });
    }

    // Fast-path: If a parent router already verified this exact brandId for this request, skip the second DB query
    if (req.brand && req.brand.id === brandId) {
      return next();
    }

    // Verify that the authenticated user is the brand owner or an authorized member
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
        message: 'Access denied: You do not have permission to access this brand'
      });
    }

    req.brand = brand;
    next();
  } catch (error) {
    console.error('[Klarix API] Brand Auth Error:', error);
    return res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Error verifying brand access'
    });
  }
};