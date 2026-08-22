import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const requireBrandAccess = async (req, res, next) => {
  try {
    // Brand ID can be in params or body depending on the request
    const brandId = req.params.brandId || req.body.brandId;
    
    if (!brandId) {
      return res.status(400).json({ success: false, error: 'VALIDATION_ERROR', message: 'Brand ID is required' });
    }

    if (!req.user) {
      return res.status(401).json({ success: false, error: 'UNAUTHENTICATED', message: 'Must be authenticated to access brand resources' });
    }

    // Check if user is the owner or a member
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
      return res.status(403).json({ success: false, error: 'FORBIDDEN', message: 'You do not have permission to access this brand' });
    }

    req.brand = brand;
    next();
  } catch (error) {
    console.error('[Klarix API] Brand Auth Error:', error);
    return res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Error verifying brand access' });
  }
};
