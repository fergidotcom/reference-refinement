import { parseDecisionsFile } from './batch-utils.js';
import fs from 'fs/promises';

const content = await fs.readFile('decisions.txt', 'utf-8');
const refs = parseDecisionsFile(content);

console.log('=== REFERENCE PROCESSING STATUS ===\n');
console.log('Total references:', refs.length);

const finalized = refs.filter(r => r.finalized);
const batchProcessed = refs.filter(r => r.batch_version);
const unfinalized = refs.filter(r => !r.finalized);
const manualReview = refs.filter(r => r.manual_review);
const withPrimary = refs.filter(r => r.primary_url);
const withSecondary = refs.filter(r => r.secondary_url);

console.log('Finalized:', finalized.length);
console.log('Batch processed:', batchProcessed.length);
console.log('Unfinalized:', unfinalized.length);
console.log('Needs manual review:', manualReview.length);
console.log('Has primary URL:', withPrimary.length);
console.log('Has secondary URL:', withSecondary.length);

// Check batch versions
const batchVersions = {};
batchProcessed.forEach(r => {
  const v = r.batch_version || 'unknown';
  batchVersions[v] = (batchVersions[v] || 0) + 1;
});
console.log('\nBatch versions:');
Object.entries(batchVersions).sort().forEach(([v, count]) => {
  console.log(`  ${v}: ${count} references`);
});

// Find gaps in unprocessed references
const processedIds = new Set(batchProcessed.map(r => r.id));
const unfinalizedNoBatch = unfinalized.filter(r => !r.batch_version && !r.primary_url);
console.log('\nUnprocessed (no batch, no URLs):', unfinalizedNoBatch.length);

// Sample some unprocessed IDs
const sampleUnprocessed = unfinalizedNoBatch.slice(0, 30).map(r => r.id);
console.log('Sample unprocessed IDs (first 30):', sampleUnprocessed.join(', '));

// Find good range for next batch
const allIds = refs.map(r => parseInt(r.id)).filter(id => !isNaN(id)).sort((a,b) => a-b);
const processedIdNums = [...processedIds].map(id => parseInt(id)).filter(id => !isNaN(id));
const unprocessedIds = allIds.filter(id => !processedIdNums.includes(id));

console.log('\nTotal unprocessed IDs:', unprocessedIds.length);
console.log('\nSuggested ranges for next 50 refs:');
console.log('Option 1 (sequential from 1):', unprocessedIds.slice(0, 50));
console.log('Option 2 (IDs 1-50):', '1-50');
console.log('Option 3 (IDs 128-177):', '128-177 (continues after 127)');
console.log('Option 4 (IDs 204-253):', '204-253 (continues after 203)');

// Check manual review refs
console.log('\n=== MANUAL REVIEW REFERENCES ===');
manualReview.forEach(r => {
  console.log(`[${r.id}] ${r.title?.substring(0, 60)}... - Batch: ${r.batch_version || 'N/A'}`);
});
