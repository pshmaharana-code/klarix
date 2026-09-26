import { PrismaClient } from '@prisma/client';
import * as metaAdapter from './integrations/metaAdapter.js';
import * as contentRepository from './repositories/contentRepository.js';
import * as cryptoLib from './lib/crypto.js';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const prisma = new PrismaClient();
  try {
    // Find a real account (not mock 'a1')
    const accounts = await prisma.socialAccount.findMany();
    
    for (const account of accounts) {
      if (account.externalAccountId.length < 5) continue; // Skip a1 etc
      
      const token = cryptoLib.decrypt(account.encryptedToken);
      const reels = await prisma.content.findMany({
        where: { type: 'REEL', socialAccountId: account.id }
      });
      
      for (const reel of reels) {
        if (reel.externalContentId.length < 5) continue;
        console.log(`Fetching insights for REEL ${reel.externalContentId}...`);
        try {
          const metrics = await metaAdapter.fetchMediaInsights(token, reel.externalContentId, 'REEL');
          console.log(`Got metrics for ${reel.externalContentId}:`, metrics);
          
          await contentRepository.createMetricSnapshot({
            contentId: reel.id,
            observedAt: new Date(),
            reach: metrics.reach,
            impressions: metrics.impressions,
            plays: metrics.plays,
            likes: metrics.likes,
            comments: metrics.comments,
            saves: metrics.saves,
            shares: metrics.shares,
            totalInteractions: metrics.totalInteractions,
            igReelsAvgWatchTime: metrics.igReelsAvgWatchTime,
            igReelsVideoViewTotalTime: metrics.igReelsVideoViewTotalTime,
            reelsSkipRate: metrics.reelsSkipRate,
            rawPayload: metrics.rawPayload
          });
          console.log(`Snapshot inserted for REEL ${reel.externalContentId}`);
        } catch (err) {
          console.log('Skipping due to error:', err.message);
        }
      }
    }
    
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

run();
