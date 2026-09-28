// Inspection-only script: carousel record state before sync
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config();
const p = new PrismaClient();

try {
  const contentId = 'b8527481-f90f-49f9-a634-c904cdc4c805';
  const content = await p.content.findUnique({
    where: { id: contentId },
    include: {
      media: { orderBy: { createdAt: 'asc' } },
      socialAccount: { select: { id: true, brandId: true, username: true, platform: true } }
    }
  });

  if (!content) { console.log('Content not found'); process.exit(1); }

  console.log('=== CAROUSEL RECORD (PRE-SYNC) ===');
  console.log(JSON.stringify({
    id: content.id,
    type: content.type,
    externalContentId: content.externalContentId,
    brandId: content.brandId,
    socialAccount: content.socialAccount,
    caption: content.caption?.substring(0, 60),
    mediaRowCount: content.media.length,
    media: content.media.map((m, i) => ({
      slot: i,
      id: m.id,
      mediaType: m.mediaType,
      hasSrc: !!m.sourceUrl,
      hasThumb: !!m.thumbnailUrl,
      contentId: m.contentId,
      createdAt: m.createdAt
    }))
  }, null, 2));

  // Check for the SYNC job associated with this brand
  const latestSync = await p.job.findFirst({
    where: { type: 'SYNC_ACCOUNT', brandId: content.brandId },
    orderBy: { createdAt: 'desc' },
    select: { id: true, state: true, createdAt: true }
  });
  console.log('\nLatest SYNC_ACCOUNT job:', latestSync);

} finally {
  await p.$disconnect();
}
