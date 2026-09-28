import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  const analyses = await prisma.contentAnalysis.findMany({ orderBy: { createdAt: 'desc' } });
  const seen = new Set();
  for (const a of analyses) {
    const key = a.contentId + '_' + a.version;
    if (seen.has(key)) {
      await prisma.contentAnalysis.delete({ where: { id: a.id } });
      console.log('Deleted duplicate', a.id);
    } else {
      seen.add(key);
    }
  }
  console.log('Done');
}

run().finally(() => prisma.$disconnect());
