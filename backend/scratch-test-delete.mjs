import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function check() {
  const contentId = 'b8527481-f90f-49f9-a634-c904cdc4c805';
  
  const before = await p.contentMedia.count({ where: { contentId } });
  console.log(`Before: ${before}`);
  
  await p.contentMedia.deleteMany({ where: { contentId } });
  
  const after = await p.contentMedia.count({ where: { contentId } });
  console.log(`After deleteMany: ${after}`);
}
check().finally(() => p.$disconnect());
