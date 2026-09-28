import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function check() {
  const c = await p.content.findUnique({
    where: { id: 'b8527481-f90f-49f9-a634-c904cdc4c805' },
    include: { media: { orderBy: { createdAt: 'asc' } } }
  });
  console.log(`Carousel media count: ${c.media.length}`);
  c.media.forEach((m, i) => {
    console.log(`[${i}] type=${m.mediaType}, src=${m.sourceUrl?.substring(0, 40)}..., createdAt=${m.createdAt.toISOString()}`);
  });
}
check().finally(() => p.$disconnect());
