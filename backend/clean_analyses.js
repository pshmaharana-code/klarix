import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  const count = await prisma.contentAnalysis.count();
  console.log('Count:', count);
  if (count > 0) {
    await prisma.contentAnalysis.deleteMany({});
    console.log('Deleted all analyses to allow migration');
  }
}

run().finally(() => prisma.$disconnect());
