#!/usr/bin/env node

/**
 * Analyze Batch v16.6 Results
 * Generates comprehensive statistics for RIDs 600-624
 */

import { parseDecisionsFile } from './batch-utils.js';
import fs from 'fs/promises';

async function analyzeBatch() {
    console.log('📊 BATCH v16.6 - COMPREHENSIVE STATISTICS\n');
    console.log('='.repeat(70) + '\n');

    const content = await fs.readFile('decisions.txt', 'utf-8');
    const allRefs = parseDecisionsFile(content);

    // Filter to batch range
    const batchRefs = allRefs.filter(r => r.id >= 600 && r.id <= 624);

    console.log(`📦 BATCH SCOPE\n`);
    console.log(`  Range: RIDs 600-624`);
    console.log(`  Total: ${batchRefs.length} references\n`);

    // Statistics
    const finalized = batchRefs.filter(r => r.finalized);
    const unfinalized = batchRefs.filter(r => !r.finalized);
    const withPrimary = batchRefs.filter(r => r.urls.primary);
    const withSecondary = batchRefs.filter(r => r.urls.secondary);
    const withBoth = batchRefs.filter(r => r.urls.primary && r.urls.secondary);
    const manualReview = batchRefs.filter(r => r.manual_review);
    const batchProcessed = batchRefs.filter(r => r.batch_version === 'v16.2');

    console.log(`✅ COMPLETION STATISTICS\n`);
    console.log(`  Finalized:              ${finalized.length}/${batchRefs.length} (${((finalized.length/batchRefs.length)*100).toFixed(1)}%)`);
    console.log(`  Unfinalized:            ${unfinalized.length}/${batchRefs.length} (${((unfinalized.length/batchRefs.length)*100).toFixed(1)}%)`);
    console.log(`  With Primary URL:       ${withPrimary.length}/${batchRefs.length} (${((withPrimary.length/batchRefs.length)*100).toFixed(1)}%)`);
    console.log(`  With Secondary URL:     ${withSecondary.length}/${batchRefs.length} (${((withSecondary.length/batchRefs.length)*100).toFixed(1)}%)`);
    console.log(`  With Both URLs:         ${withBoth.length}/${batchRefs.length} (${((withBoth.length/batchRefs.length)*100).toFixed(1)}%)`);
    console.log(`  Manual Review Flagged:  ${manualReview.length}/${batchRefs.length} (${((manualReview.length/batchRefs.length)*100).toFixed(1)}%)`);
    console.log(`  Batch Processed (v16.2):${batchProcessed.length}/${batchRefs.length} (${((batchProcessed.length/batchRefs.length)*100).toFixed(1)}%)\n`);

    // Breakdown by finalization status
    if (unfinalized.length > 0) {
        console.log(`⏸️  UNFINALIZED REFERENCES (${unfinalized.length}):\n`);
        for (const ref of unfinalized) {
            const reason = ref.manual_review ? 'Manual Review' : 'Unknown';
            console.log(`  [${ref.id}] ${ref.title?.substring(0, 60) || 'Untitled'}...`);
            console.log(`      Reason: ${reason}`);
            console.log(`      Primary: ${ref.urls.primary ? '✓' : '✗'}`);
            console.log(`      Secondary: ${ref.urls.secondary ? '✓' : '✗'}\n`);
        }
    }

    // Title parsing validation
    console.log(`🔍 TITLE PARSING VALIDATION (v16.6)\n`);

    const suspiciousTitles = [];
    for (const ref of batchRefs) {
        // Check for uncleaned date prefixes
        const datePrefix = /^(January|February|March|April|May|June|July|August|September|October|November|December)(?:\s+\d{1,2})?(?:,?\s+\d{4})?\)\s+/i;
        if (datePrefix.test(ref.title || '')) {
            suspiciousTitles.push({
                id: ref.id,
                title: ref.title,
                issue: 'Uncleaned date prefix'
            });
        }

        // Check for trailing ellipsis
        if ((ref.title || '').match(/\.{3,}$/)) {
            suspiciousTitles.push({
                id: ref.id,
                title: ref.title,
                issue: 'Trailing ellipsis'
            });
        }
    }

    if (suspiciousTitles.length === 0) {
        console.log(`  ✅ All ${batchRefs.length} titles parsed correctly`);
        console.log(`  ✅ No date prefixes detected`);
        console.log(`  ✅ No trailing ellipsis detected\n`);
    } else {
        console.log(`  ⚠️  Found ${suspiciousTitles.length} suspicious titles:\n`);
        for (const item of suspiciousTitles) {
            console.log(`  [${item.id}] ${item.issue}: "${item.title}"\n`);
        }
    }

    // URL Quality Metrics
    console.log(`🔗 URL QUALITY METRICS\n`);

    const primaryDomains = {};
    const secondaryDomains = {};

    for (const ref of batchRefs) {
        if (ref.urls.primary) {
            try {
                const domain = new URL(ref.urls.primary).hostname;
                primaryDomains[domain] = (primaryDomains[domain] || 0) + 1;
            } catch {}
        }
        if (ref.urls.secondary) {
            try {
                const domain = new URL(ref.urls.secondary).hostname;
                secondaryDomains[domain] = (secondaryDomains[domain] || 0) + 1;
            } catch {}
        }
    }

    console.log(`  Primary URL Domains (top 10):`);
    const sortedPrimary = Object.entries(primaryDomains).sort((a, b) => b[1] - a[1]).slice(0, 10);
    for (const [domain, count] of sortedPrimary) {
        console.log(`    ${domain}: ${count}`);
    }

    console.log(`\n  Secondary URL Domains (top 10):`);
    const sortedSecondary = Object.entries(secondaryDomains).sort((a, b) => b[1] - a[1]).slice(0, 10);
    for (const [domain, count] of sortedSecondary) {
        console.log(`    ${domain}: ${count}`);
    }

    // Performance Comparison
    console.log(`\n📈 BATCH PERFORMANCE vs PREVIOUS BATCHES\n`);

    // Get stats from all batches
    const allBatchRefs = allRefs.filter(r => r.batch_version);
    const v160Refs = allBatchRefs.filter(r => r.batch_version === 'v16.0');
    const v161Refs = allBatchRefs.filter(r => r.batch_version === 'v16.1');
    const v162Refs = allBatchRefs.filter(r => r.batch_version === 'v16.2');

    console.log(`  Batch v16.0:`);
    console.log(`    References: ${v160Refs.length}`);
    console.log(`    Primary Coverage: ${v160Refs.filter(r => r.urls.primary).length}/${v160Refs.length} (${((v160Refs.filter(r => r.urls.primary).length/v160Refs.length)*100).toFixed(1)}%)`);
    console.log(`    Secondary Coverage: ${v160Refs.filter(r => r.urls.secondary).length}/${v160Refs.length} (${((v160Refs.filter(r => r.urls.secondary).length/v160Refs.length)*100).toFixed(1)}%)`);

    console.log(`\n  Batch v16.1:`);
    console.log(`    References: ${v161Refs.length}`);
    console.log(`    Primary Coverage: ${v161Refs.filter(r => r.urls.primary).length}/${v161Refs.length} (${((v161Refs.filter(r => r.urls.primary).length/v161Refs.length)*100).toFixed(1)}%)`);
    console.log(`    Secondary Coverage: ${v161Refs.filter(r => r.urls.secondary).length}/${v161Refs.length} (${((v161Refs.filter(r => r.urls.secondary).length/v161Refs.length)*100).toFixed(1)}%)`);

    console.log(`\n  Batch v16.2 (previous 50 refs):`);
    console.log(`    References: ${v162Refs.length}`);
    console.log(`    Primary Coverage: ${v162Refs.filter(r => r.urls.primary).length}/${v162Refs.length} (${((v162Refs.filter(r => r.urls.primary).length/v162Refs.length)*100).toFixed(1)}%)`);
    console.log(`    Secondary Coverage: ${v162Refs.filter(r => r.urls.secondary).length}/${v162Refs.length} (${((v162Refs.filter(r => r.urls.secondary).length/v162Refs.length)*100).toFixed(1)}%)`);

    console.log(`\n  Batch v16.2 (THIS BATCH, RIDs 600-624):`);
    console.log(`    References: ${batchProcessed.length}`);
    console.log(`    Primary Coverage: ${batchProcessed.filter(r => r.urls.primary).length}/${batchProcessed.length} (${((batchProcessed.filter(r => r.urls.primary).length/batchProcessed.length)*100).toFixed(1)}%)`);
    console.log(`    Secondary Coverage: ${batchProcessed.filter(r => r.urls.secondary).length}/${batchProcessed.length} (${((batchProcessed.filter(r => r.urls.secondary).length/batchProcessed.length)*100).toFixed(1)}%)`);

    console.log('\n' + '='.repeat(70));
    console.log('\n✅ BATCH v16.6 ANALYSIS COMPLETE\n');
}

analyzeBatch().catch(console.error);
