import { readFileSync } from 'fs';
const j = JSON.parse(readFileSync('test_output_account_insights_timerange.json', 'utf-8'));
const results = j.results;
// Show ALL breakdown records to understand what Meta returns
const breakdownRecords = results.filter(r => r.request && r.request.breakdown);
for (const br of breakdownRecords) {
  console.log('=== Config:', JSON.stringify(br.request.breakdown), br.request.metric, br.request.period, br.request.timeWindowType, '===');
  console.log('Status:', br.status);
  if (br.data && br.data.length > 0) {
    for (const d of br.data) {
      console.log('  total_value:', JSON.stringify(d.total_value));
      console.log('  breakdowns:', JSON.stringify(d.breakdowns));
      console.log('  values count:', d.values ? d.values.length : 0);
    }
  }
}
