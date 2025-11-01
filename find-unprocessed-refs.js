#!/usr/bin/env node

/**
 * Find Unprocessed References
 * Identifies references that have NOT been batch processed
 */

import { parseDecisionsFile } from './batch-utils.js';
import fs from 'fs/promises';

async function findUnprocessedRefs() {
    const content = await fs.readFile('decisions.txt', 'utf-8');
    const refs = parseDecisionsFile(content);

    // Separate into processed vs unprocessed
    const batchProcessed = [];
    const notBatchProcessed = [];
    const finalized = [];
    const unfinalized = [];

    for (const ref of refs) {
        if (ref.batch_version) {
            batchProcessed.push(ref.id);
        } else {
            notBatchProcessed.push(ref.id);
        }

        if (ref.finalized) {
            finalized.push(ref.id);
        } else {
            unfinalized.push(ref.id);
        }
    }

    console.log('📊 BATCH PROCESSING STATUS\n');
    console.log('─'.repeat(60));
    console.log(`Total References:           ${refs.length}`);
    console.log(`Batch Processed:            ${batchProcessed.length} (${((batchProcessed.length/refs.length)*100).toFixed(1)}%)`);
    console.log(`NOT Batch Processed:        ${notBatchProcessed.length} (${((notBatchProcessed.length/refs.length)*100).toFixed(1)}%)`);
    console.log('─'.repeat(60));
    console.log(`Finalized (any method):     ${finalized.length} (${((finalized.length/refs.length)*100).toFixed(1)}%)`);
    console.log(`Unfinalized:                ${unfinalized.length} (${((unfinalized.length/refs.length)*100).toFixed(1)}%)`);
    console.log('─'.repeat(60));

    // Find overlap: batch processed but not finalized (shouldn't happen with auto-finalize)
    const batchButNotFinalized = batchProcessed.filter(id => !finalized.includes(id));
    if (batchButNotFinalized.length > 0) {
        console.log(`\n⚠️  Batch processed but NOT finalized: ${batchButNotFinalized.length}`);
        console.log(`    RIDs: ${batchButNotFinalized.join(', ')}`);
    }

    // Show unprocessed references
    console.log(`\n📋 NOT BATCH PROCESSED (${notBatchProcessed.length} references):\n`);

    // Group into ranges for readability
    const ranges = [];
    let start = notBatchProcessed[0];
    let end = notBatchProcessed[0];

    for (let i = 1; i < notBatchProcessed.length; i++) {
        if (notBatchProcessed[i] === end + 1) {
            end = notBatchProcessed[i];
        } else {
            ranges.push(start === end ? `${start}` : `${start}-${end}`);
            start = notBatchProcessed[i];
            end = notBatchProcessed[i];
        }
    }
    if (start !== undefined) {
        ranges.push(start === end ? `${start}` : `${start}-${end}`);
    }

    console.log(`Ranges: ${ranges.join(', ')}`);

    // Recommend next batch
    console.log(`\n📌 NEXT BATCH RECOMMENDATION:\n`);

    // Find the smallest unprocessed range with at least 25 refs
    const unprocessedRanges = [];
    for (let i = 0; i < notBatchProcessed.length; i++) {
        const id = notBatchProcessed[i];
        const rangeStart = id;
        let rangeEnd = id;
        let count = 1;

        while (i + 1 < notBatchProcessed.length && notBatchProcessed[i + 1] === rangeEnd + 1 && count < 50) {
            i++;
            rangeEnd = notBatchProcessed[i];
            count++;
        }

        unprocessedRanges.push({ start: rangeStart, end: rangeEnd, count });
    }

    // Find first range with 25+ refs
    const viableRanges = unprocessedRanges.filter(r => r.count >= 25);

    if (viableRanges.length > 0) {
        const recommended = viableRanges[0];
        const batch25 = notBatchProcessed.slice(
            notBatchProcessed.indexOf(recommended.start),
            notBatchProcessed.indexOf(recommended.start) + 25
        );

        console.log(`Recommended: RIDs ${batch25[0]} to ${batch25[24]} (25 references)`);
        console.log(`\nList: ${batch25.join(', ')}`);

        // Save to file for batch config
        await fs.writeFile('next-batch-25.txt', batch25.join('\n'));
        console.log(`\n✅ Saved to next-batch-25.txt`);

    } else {
        console.log(`⚠️  Not enough contiguous unprocessed references for a 25-ref batch`);
        console.log(`    Largest unprocessed range: ${unprocessedRanges[0]?.count || 0} references`);
    }

    // Summary by batch version
    const versionCounts = {};
    for (const ref of refs) {
        if (ref.batch_version) {
            versionCounts[ref.batch_version] = (versionCounts[ref.batch_version] || 0) + 1;
        }
    }

    console.log(`\n📊 BATCH VERSION SUMMARY:\n`);
    for (const [version, count] of Object.entries(versionCounts).sort()) {
        console.log(`  ${version}: ${count} references`);
    }

    console.log('\n' + '='.repeat(60) + '\n');
}

findUnprocessedRefs().catch(console.error);
