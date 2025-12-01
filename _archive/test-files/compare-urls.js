/**
 * URL Comparison Script
 *
 * Compares two decisions files focusing on:
 * - RID (reference ID)
 * - Bibliographic information
 * - PRIMARY_URL
 * - SECONDARY_URL
 *
 * Skips: Relevance text, CONTEXT blocks
 */

import fs from 'fs/promises';
import { parseDecisionsFile } from './batch-utils.js';

const FILE1 = 'CaughtInTheActGeneratedDecisions.txt';
const FILE2 = 'CaughtInTheAct_decisions.txt.backup-20251117-120110';

async function main() {
    console.log('🔍 URL Comparison Report');
    console.log('='.repeat(80));
    console.log('');
    console.log(`File 1: ${FILE1}`);
    console.log(`File 2: ${FILE2}`);
    console.log('');

    // Load and parse files
    const content1 = await fs.readFile(FILE1, 'utf-8');
    const content2 = await fs.readFile(FILE2, 'utf-8');

    const refs1 = parseDecisionsFile(content1);
    const refs2 = parseDecisionsFile(content2);

    console.log(`References in File 1: ${refs1.length}`);
    console.log(`References in File 2: ${refs2.length}`);
    console.log('');

    // Build lookup maps
    const map1 = new Map();
    const map2 = new Map();

    for (const ref of refs1) {
        map1.set(ref.id, ref);
    }

    for (const ref of refs2) {
        map2.set(ref.id, ref);
    }

    // Get all unique RIDs
    const allRids = new Set([...map1.keys(), ...map2.keys()]);
    const sortedRids = Array.from(allRids).sort((a, b) => a - b);

    // Statistics
    let perfectMatches = 0;
    let citationDiffs = 0;
    let urlDiffs = 0;
    let onlyInFile1 = 0;
    let onlyInFile2 = 0;

    const differences = [];

    // Compare each RID
    for (const rid of sortedRids) {
        const ref1 = map1.get(rid);
        const ref2 = map2.get(rid);

        // Check if RID exists in both
        if (!ref1) {
            onlyInFile2++;
            differences.push({
                rid,
                issue: 'MISSING_IN_FILE1',
                details: `RID [${rid}] only in File 2`
            });
            continue;
        }

        if (!ref2) {
            onlyInFile1++;
            differences.push({
                rid,
                issue: 'MISSING_IN_FILE2',
                details: `RID [${rid}] only in File 1`
            });
            continue;
        }

        // Compare citation (bibliographic info)
        const citation1 = `${ref1.authors} (${ref1.year}). ${ref1.title}. ${ref1.other}`.trim();
        const citation2 = `${ref2.authors} (${ref2.year}). ${ref2.title}. ${ref2.other}`.trim();

        const citationMatch = citation1 === citation2;

        // Compare URLs
        const primaryMatch = ref1.urls.primary === ref2.urls.primary;
        const secondaryMatch = ref1.urls.secondary === ref2.urls.secondary;

        if (citationMatch && primaryMatch && secondaryMatch) {
            perfectMatches++;
        } else {
            // Record differences
            const diff = {
                rid,
                citation1: citationMatch ? 'MATCH' : citation1.substring(0, 100),
                citation2: citationMatch ? 'MATCH' : citation2.substring(0, 100),
                primary1: ref1.urls.primary || 'NONE',
                primary2: ref2.urls.primary || 'NONE',
                secondary1: ref1.urls.secondary || 'NONE',
                secondary2: ref2.urls.secondary || 'NONE'
            };

            if (!citationMatch) citationDiffs++;
            if (!primaryMatch || !secondaryMatch) urlDiffs++;

            differences.push(diff);
        }
    }

    // Print summary
    console.log('📊 Summary:');
    console.log('-'.repeat(80));
    console.log(`Total unique RIDs: ${sortedRids.length}`);
    console.log(`Perfect matches: ${perfectMatches}`);
    console.log(`Citation differences: ${citationDiffs}`);
    console.log(`URL differences: ${urlDiffs}`);
    console.log(`Only in File 1: ${onlyInFile1}`);
    console.log(`Only in File 2: ${onlyInFile2}`);
    console.log('');

    // Print URL statistics
    const file1WithPrimary = refs1.filter(r => r.urls.primary).length;
    const file1WithSecondary = refs1.filter(r => r.urls.secondary).length;
    const file2WithPrimary = refs2.filter(r => r.urls.primary).length;
    const file2WithSecondary = refs2.filter(r => r.urls.secondary).length;

    console.log('📎 URL Coverage:');
    console.log('-'.repeat(80));
    console.log(`File 1 PRIMARY URLs: ${file1WithPrimary}/${refs1.length} (${(file1WithPrimary/refs1.length*100).toFixed(1)}%)`);
    console.log(`File 1 SECONDARY URLs: ${file1WithSecondary}/${refs1.length} (${(file1WithSecondary/refs1.length*100).toFixed(1)}%)`);
    console.log(`File 2 PRIMARY URLs: ${file2WithPrimary}/${refs2.length} (${(file2WithPrimary/refs2.length*100).toFixed(1)}%)`);
    console.log(`File 2 SECONDARY URLs: ${file2WithSecondary}/${refs2.length} (${(file2WithSecondary/refs2.length*100).toFixed(1)}%)`);
    console.log('');

    // Print differences (first 20)
    if (differences.length > 0) {
        console.log(`⚠️  Differences Found (showing first 20 of ${differences.length}):`);
        console.log('-'.repeat(80));

        for (let i = 0; i < Math.min(20, differences.length); i++) {
            const diff = differences[i];

            if (diff.issue) {
                console.log(`\n[${diff.rid}] ${diff.issue}`);
                console.log(`  ${diff.details}`);
                continue;
            }

            console.log(`\n[${diff.rid}]`);

            if (diff.citation1 !== 'MATCH') {
                console.log(`  Citation differs:`);
                console.log(`    File 1: ${diff.citation1}...`);
                console.log(`    File 2: ${diff.citation2}...`);
            }

            if (diff.primary1 !== diff.primary2) {
                console.log(`  PRIMARY_URL differs:`);
                console.log(`    File 1: ${diff.primary1}`);
                console.log(`    File 2: ${diff.primary2}`);
            }

            if (diff.secondary1 !== diff.secondary2) {
                console.log(`  SECONDARY_URL differs:`);
                console.log(`    File 1: ${diff.secondary1}`);
                console.log(`    File 2: ${diff.secondary2}`);
            }
        }

        if (differences.length > 20) {
            console.log(`\n... and ${differences.length - 20} more differences`);
        }
    } else {
        console.log('✅ No differences found - files are identical (RID, citation, URLs)');
    }

    console.log('');
    console.log('✅ Comparison complete');
}

main().catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
});
