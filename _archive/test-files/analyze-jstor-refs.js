#!/usr/bin/env node

/**
 * JSTOR Reference Analyzer
 *
 * Finds all references with JSTOR URLs (primary or secondary)
 * Analyzes their finalized status
 * Reports statistics
 */

import fs from 'fs/promises';
import { parseDecisionsFile } from './batch-utils.js';

async function analyzeJSTORReferences() {
    console.log('\n=== JSTOR REFERENCE ANALYSIS ===\n');

    // Read decisions.txt
    const content = await fs.readFile('decisions.txt', 'utf-8');
    const references = parseDecisionsFile(content);

    // Find all references with JSTOR URLs
    const jstorRefs = references.filter(ref => {
        const hasPrimaryJSTOR = ref.primary_url && ref.primary_url.includes('jstor.org');
        const hasSecondaryJSTOR = ref.secondary_url && ref.secondary_url.includes('jstor.org');
        return hasPrimaryJSTOR || hasSecondaryJSTOR;
    });

    console.log(`Total references: ${references.length}`);
    console.log(`References with JSTOR URLs: ${jstorRefs.length}\n`);

    // Categorize by URL type
    const primaryJSTOR = jstorRefs.filter(ref => ref.primary_url && ref.primary_url.includes('jstor.org'));
    const secondaryJSTOR = jstorRefs.filter(ref => ref.secondary_url && ref.secondary_url.includes('jstor.org'));

    console.log(`Primary URL = JSTOR: ${primaryJSTOR.length}`);
    console.log(`Secondary URL = JSTOR: ${secondaryJSTOR.length}\n`);

    // Check finalized status
    const finalizedJSTOR = jstorRefs.filter(ref => ref.is_finalized);
    const unfinalizedJSTOR = jstorRefs.filter(ref => !ref.is_finalized);

    console.log(`Finalized with JSTOR: ${finalizedJSTOR.length}`);
    console.log(`Unfinalized with JSTOR: ${unfinalizedJSTOR.length}\n`);

    // List all JSTOR references
    console.log('=== JSTOR REFERENCES (by RID) ===\n');

    jstorRefs.sort((a, b) => a.id - b.id).forEach(ref => {
        const status = ref.is_finalized ? '✓ FINALIZED' : '○ unfinalized';
        const primaryJSTOR = ref.primary_url && ref.primary_url.includes('jstor.org') ? '🔒 PRIMARY' : '';
        const secondaryJSTOR = ref.secondary_url && ref.secondary_url.includes('jstor.org') ? '🔒 SECONDARY' : '';

        console.log(`[${ref.id}] ${status} ${primaryJSTOR} ${secondaryJSTOR}`);
        console.log(`    ${ref.authors} (${ref.year}). ${ref.title}`);

        if (primaryJSTOR) {
            console.log(`    PRIMARY: ${ref.primary_url}`);
        }
        if (secondaryJSTOR) {
            console.log(`    SECONDARY: ${ref.secondary_url}`);
        }
        console.log();
    });

    // Generate summary report
    console.log('\n=== SUMMARY ===\n');
    console.log(`Total JSTOR references to fix: ${jstorRefs.length}`);
    console.log(`  - Need to unfinalize: ${finalizedJSTOR.length}`);
    console.log(`  - Already unfinalized: ${unfinalizedJSTOR.length}`);
    console.log(`  - PRIMARY needs replacement: ${primaryJSTOR.length}`);
    console.log(`  - SECONDARY needs replacement: ${secondaryJSTOR.length}`);
    console.log();

    // Return data for use by other scripts
    return {
        total: jstorRefs.length,
        primary: primaryJSTOR,
        secondary: secondaryJSTOR,
        finalized: finalizedJSTOR,
        unfinalized: unfinalizedJSTOR,
        allJSTOR: jstorRefs
    };
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    analyzeJSTORReferences()
        .then(() => console.log('✅ Analysis complete'))
        .catch(err => {
            console.error('❌ Error:', err.message);
            process.exit(1);
        });
}

export { analyzeJSTORReferences };
