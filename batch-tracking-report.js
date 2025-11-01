#!/usr/bin/env node

/**
 * Batch Processing Tracking Report
 * Helps track which references were processed by which algorithm version
 */

import fs from 'fs';
import path from 'path';

// Load batch progress
const progressPath = './batch-progress.json';
const progress = JSON.parse(fs.readFileSync(progressPath, 'utf-8'));

// Load decisions.txt to check current state
const decisionsPath = './decisions.txt';
const decisionsContent = fs.readFileSync(decisionsPath, 'utf-8');

console.log('═══════════════════════════════════════════════════════════');
console.log('  BATCH PROCESSING TRACKING REPORT');
console.log('═══════════════════════════════════════════════════════════\n');

// Parse batch progress
const batchId = progress.batch_id;
const batchDate = new Date(progress.started_at).toLocaleString();
const completedRefs = [...new Set(progress.completed)].sort((a, b) => a - b);
const firstRID = Math.min(...completedRefs);
const lastRID = Math.max(...completedRefs);

console.log('📊 LAST BATCH (Current "Excellent" Algorithms)');
console.log('─────────────────────────────────────────────────────────');
console.log(`Batch ID:        ${batchId}`);
console.log(`Date:            ${batchDate}`);
console.log(`RID Range:       ${firstRID} - ${lastRID}`);
console.log(`Total Processed: ${completedRefs.length} references`);
console.log(`Status:          ${progress.status}`);
console.log();

// Show completed refs
console.log('✅ Processed RIDs (TRUST THESE):');
console.log(completedRefs.join(', '));
console.log();

// Show errors
if (progress.errors && progress.errors.length > 0) {
  console.log(`⚠️  Errors: ${progress.errors.length}`);
  progress.errors.forEach(err => {
    console.log(`   RID ${err.id}: ${err.error}`);
  });
  console.log();
}

// Check for FLAGS[MANUAL_REVIEW] in the processed batch
const manualReviewMatches = decisionsContent.match(/\[(\d+)\][^\[]*FLAGS\[MANUAL_REVIEW\]/g);
const manualReviewRIDs = manualReviewMatches ?
  manualReviewMatches.map(m => parseInt(m.match(/\[(\d+)\]/)[1])).filter(rid => rid >= firstRID && rid <= lastRID) :
  [];

if (manualReviewRIDs.length > 0) {
  console.log(`🔍 Manual Review Needed (${manualReviewRIDs.length}):`);
  console.log(manualReviewRIDs.join(', '));
  console.log();
}

// Count finalized in the batch range
const finalizedMatches = decisionsContent.match(/\[(\d+)\][^\[]*FLAGS\[FINALIZED\]/g);
const finalizedInBatch = finalizedMatches ?
  finalizedMatches.map(m => parseInt(m.match(/\[(\d+)\]/)[1])).filter(rid => rid >= firstRID && rid <= lastRID).length :
  0;

console.log('📋 Review Progress:');
console.log(`   Finalized: ${finalizedInBatch}/${completedRefs.length} (${Math.round(finalizedInBatch/completedRefs.length*100)}%)`);
console.log(`   Remaining: ${completedRefs.length - finalizedInBatch}`);
console.log();

// Stats
console.log('📈 Stats from Last Batch:');
console.log(`   Queries Generated:   ${progress.stats.queries_generated || 'N/A'}`);
console.log(`   Searches Run:        ${progress.stats.searches_run || 'N/A'}`);
console.log(`   Autoranks Completed: ${progress.stats.autoranks_completed || 'N/A'}`);
console.log(`   Auto Finalized:      ${progress.stats.auto_finalized || 0}`);
console.log();

// Determine what's next
console.log('═══════════════════════════════════════════════════════════');
console.log('  WHAT COMES NEXT');
console.log('═══════════════════════════════════════════════════════════\n');

console.log('🚧 Reference Status by Algorithm Version:');
console.log();
console.log(`   RIDs 1-${firstRID-1}:     ⚠️  OLD ALGORITHM URLs (Don't Trust)`);
console.log(`   RIDs ${firstRID}-${lastRID}:    ✅ NEW ALGORITHM URLs (Current Review Batch)`);
console.log(`   RIDs ${lastRID+1}-288:   ⏳ NOT YET PROCESSED`);
console.log();

console.log('💡 Recommended Next Steps:');
console.log();
console.log('1. FINISH REVIEWING: Complete RIDs 114-127 in iPad app');
console.log('2. NEXT BATCH OPTIONS:');
console.log(`   A. Continue Forward:  RIDs ${lastRID+1}-${lastRID+20} (process next 20)`);
console.log(`   B. Fill Backward:     RIDs 1-20 (replace old URLs)`);
console.log(`   C. Fill Gaps:         RIDs 9-99 (if any exist)`);
console.log();

console.log('To process next batch:');
console.log('   1. Edit batch-config.yaml');
console.log('   2. Set reference_range start/end');
console.log('   3. Run: node batch-processor.js --dry-run');
console.log('   4. Run: node batch-processor.js');
console.log();

console.log('═══════════════════════════════════════════════════════════');
console.log('  DONE - Last batch was RIDs 114-127');
console.log('═══════════════════════════════════════════════════════════');
