import { PrismaClient } from '@prisma/client';
import { createAndEnqueueJob } from './jobs/jobService.js';
const p = new PrismaClient();
async function run() {
  for (const id of ['fd77c4f1-f187-48e0-bb7c-0130ddf65815', 'b8527481-f90f-49f9-a634-c904cdc4c805']) {
    const c = await p.content.findUnique({where:{id}});
    const j = await createAndEnqueueJob({brandId: c.brandId, type: 'ANALYZE_CONTENT', parentJobId: null, idempotencyKey: `analyze:${c.id}:1.0:${Date.now()}`, input: {contentId: c.id}});
    console.log('Queued', j.id);
  }
  await p.$disconnect();
}
run();
