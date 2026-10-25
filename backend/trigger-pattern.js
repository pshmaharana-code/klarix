import { createAndEnqueueJob } from './jobs/jobService.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
    // Explicitly targeting the Brand ID from your worker logs
    const targetBrandId = 'cb4e53f4-119d-4aaf-acc8-6e818cae21a4';
    console.log(`🔍 Looking up your brand: ${targetBrandId}...`);

    const brand = await prisma.brand.findUnique({
        where: { id: targetBrandId }
    });

    if (!brand) {
        console.error("Brand not found in database. Check the ID!");
        process.exit(1);
    }

    console.log(`🚀 Forcing Pattern Discovery for Brand: ${brand.name} (${brand.id})`);

    await createAndEnqueueJob({
        brandId: brand.id,
        type: 'DISCOVER_PATTERNS',
        idempotencyKey: `manual-pattern-test-${Date.now()}`,
        input: { force: true }
    });

    console.log("✅ Job enqueued! Watch your worker terminal.");
    process.exit(0);
}

run();