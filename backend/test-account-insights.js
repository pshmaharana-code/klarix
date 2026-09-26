import { PrismaClient } from '@prisma/client';
import * as cryptoLib from './lib/crypto.js';
import { GRAPH_API_VERSION } from './integrations/metaAdapter.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Phase 4A: Read-Only Meta Account Insights Validation
 * 
 * Strict constraints applied:
 * - NO modification to external data.
 * - NO printing of access tokens or secrets.
 * - Isolated requests (no batching).
 * - Full capture of breakdown arrays and time windows.
 */

const MATRIX = [
  { metric: 'reach', breakdown: null },
  { metric: 'reach', breakdown: 'media_product_type' },
  { metric: 'accounts_engaged', breakdown: null },
  { metric: 'total_interactions', breakdown: null },
  { metric: 'total_interactions', breakdown: 'media_product_type' },
  { metric: 'profile_views', breakdown: null },
  { metric: 'views', breakdown: null },
  { metric: 'views', breakdown: 'media_product_type' },
  { metric: 'views', breakdown: 'follow_type' },
  { metric: 'views', breakdown: 'media_product_type,follow_type' },
];

const PERIODS = ['day', 'lifetime'];

function maskString(str) {
  if (!str) return '***';
  if (str.length <= 4) return '***';
  return '***' + str.slice(-4);
}

async function runValidation() {
  const prisma = new PrismaClient();
  const reportData = {
    metadata: {
      timestamp: new Date().toISOString(),
      apiVersion: GRAPH_API_VERSION,
      accountId: null // Will be masked
    },
    results: []
  };

  try {
    // 1. Select the intended account
    const accounts = await prisma.socialAccount.findMany({
      where: { 
        platform: 'INSTAGRAM',
        connectionStatus: 'CONNECTED' 
      }
    });

    if (accounts.length === 0) {
      console.log('❌ No connected INSTAGRAM accounts found in the database.');
      return;
    }

    // Prefer piyush._maharana, fallback to first non-mock account
    let account = accounts.find(a => a.username === 'piyush._maharana');
    if (!account) {
      account = accounts.find(a => a.externalAccountId.length > 5 && !a.externalAccountId.includes('mock'));
    }

    if (!account) {
      console.log('❌ Could not identify an unambiguous real Instagram account. Available accounts appear to be mocks.');
      return;
    }

    const maskedAccountId = maskString(account.externalAccountId);
    reportData.metadata.accountId = maskedAccountId;

    const accessToken = cryptoLib.decrypt(account.encryptedToken);
    if (!accessToken) {
      console.log('❌ Failed to decrypt access token.');
      return;
    }

    console.log(`\n==================================================`);
    console.log(`🚀 STARTING META ACCOUNT INSIGHTS VALIDATION`);
    console.log(`API Version: ${GRAPH_API_VERSION}`);
    console.log(`Account ID:  ${maskedAccountId} (${account.username})`);
    console.log(`==================================================\n`);

    // 3. Define time window configurations
    const sinceDate = new Date('2026-09-23T00:00:00Z');
    const untilDate = new Date('2026-09-25T23:59:59Z');
    const sinceUnix = Math.floor(sinceDate.getTime() / 1000);
    const untilUnix = Math.floor(untilDate.getTime() / 1000);

    const timeConfigs = [
      { name: 'baseline', params: {} },
      { name: 'explicit_window', params: { since: sinceUnix, until: untilUnix } }
    ];

    // 4. Execute Matrix
    for (const testCase of MATRIX) {
      for (const period of PERIODS) {
        for (const timeConfig of timeConfigs) {
          console.log(`--------------------------------------------------`);
          console.log(`Testing: Metric = ${testCase.metric} | Period = ${period} | Breakdown = ${testCase.breakdown || 'none'} | Window = ${timeConfig.name}`);
          
          const url = new URL(`https://graph.instagram.com/${GRAPH_API_VERSION}/${account.externalAccountId}/insights`);
          url.searchParams.set('metric', testCase.metric);
          url.searchParams.set('period', period);
          if (testCase.breakdown) {
            url.searchParams.set('breakdown', testCase.breakdown);
          }
          if (timeConfig.params.since) {
            url.searchParams.set('since', timeConfig.params.since);
          }
          if (timeConfig.params.until) {
            url.searchParams.set('until', timeConfig.params.until);
          }

          const safeUrl = url.toString().replace(account.externalAccountId, maskedAccountId);
          
          const resultRecord = {
            request: {
              metric: testCase.metric,
              period: period,
              breakdown: testCase.breakdown || null,
              timeWindowType: timeConfig.name,
              since: timeConfig.params.since || null,
              until: timeConfig.params.until || null,
              safeUrl
            },
            status: null,
            httpCode: null,
            error: null,
            data: []
          };

          try {
            const response = await fetch(url.toString(), {
              headers: { Authorization: `Bearer ${accessToken}` }
            });
            
            resultRecord.httpCode = response.status;
            const json = await response.json();

            if (!response.ok || json.error) {
              resultRecord.status = 'ERROR';
              resultRecord.error = {
                type: json.error?.type,
                code: json.error?.code,
                message: json.error?.message,
                error_subcode: json.error?.error_subcode
              };
              console.log(`❌ FAILED (HTTP ${response.status}) - ${json.error?.message}`);
            } else if (!json.data || json.data.length === 0) {
              resultRecord.status = 'EMPTY_SUCCESS';
              console.log(`⚠️ EMPTY_SUCCESS (HTTP 200 but empty array)`);
            } else {
              resultRecord.status = 'SUCCESS';
              console.log(`✅ SUCCESS`);
              
              // Capture full array of returned metrics/periods
              for (const item of json.data) {
                const itemRecord = {
                  name: item.name,
                  period: item.period,
                  title: item.title,
                  description: item.description,
                  id: item.id ? maskString(item.id) : undefined,
                  values: [],
                  total_value: null,
                  breakdowns: []
                };

                if (Array.isArray(item.values)) {
                  itemRecord.values = item.values.map(v => ({
                    value: v.value,
                    start_time: v.start_time,
                    end_time: v.end_time
                  }));
                }

                if (item.total_value) {
                  itemRecord.total_value = {
                    value: item.total_value.value,
                    start_time: item.total_value.start_time,
                    end_time: item.total_value.end_time
                  };
                }
                
                if (Array.isArray(item.breakdowns)) {
                  itemRecord.breakdowns = item.breakdowns.map(b => ({
                    dimension_keys: b.dimension_keys,
                    results: b.results?.map(r => ({
                      value: r.value,
                      start_time: r.start_time,
                      end_time: r.end_time
                    })) || []
                  }));
                }

                resultRecord.data.push(itemRecord);
              }
            }
          } catch (err) {
            resultRecord.status = 'EXCEPTION';
            resultRecord.error = { message: err.message };
            console.log(`🔥 EXCEPTION: ${err.message}`);
          }

          reportData.results.push(resultRecord);
        }
      }
    }

    console.log(`\n==================================================`);
    console.log(`🏁 VALIDATION COMPLETE`);
    
    // 5. Save JSON Report safely
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const reportPath = path.join(__dirname, 'test_output_account_insights_timerange.json');
    await fs.writeFile(reportPath, JSON.stringify(reportData, null, 2));
    
    console.log(`Report saved to: ${reportPath}`);
    console.log(`==================================================\n`);

  } catch (error) {
    console.error('Fatal execution error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

runValidation();
