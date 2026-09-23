import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
    const keys = Object.keys(prisma);
    console.log('Prisma keys:', keys.filter(k => k.toLowerCase().includes('oauth')));
    
    // try to access the model
    if (prisma.oAuthState) {
      console.log('oAuthState exists');
    } else if (prisma.oauthState) {
      console.log('oauthState exists');
    } else {
      console.log('Neither exists');
    }
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}
main();
