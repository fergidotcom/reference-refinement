/**
 * Reverse Merge Script
 *
 * Copies URLs and FINALIZED flags FROM production TO generated file.
 * Creates complete production file with all Phase 1 enhancements + curated URLs.
 *
 * Direction: PRODUCTION → GENERATED
 * - Keep CONTEXT blocks from generated (full manuscript text)
 * - Keep ~200 word AI relevance from generated
 * - Keep FLAGS[v30.0_PHASE1_BASELINE] from generated
 * - Copy PRIMARY/SECONDARY URLs from production
 * - Copy FINALIZED flag from production
 *
 * Output: Overwrites CaughtInTheActGeneratedDecisions.txt with complete data
 */

import fs from 'fs/promises';
import { parseDecisionsFile } from './batch-utils.js';

const GENERATED_FILE = 'CaughtInTheActGeneratedDecisions.txt';
const PRODUCTION_FILE = 'CaughtInTheAct_decisions.txt';
const OUTPUT_FILE = 'CaughtInTheActGeneratedDecisions.txt'; // Overwrite in place

async function main() {
    console.log('🔄 Reverse Merge: Production URLs → Generated File');
    console.log('='.repeat(70));
    console.log('');
    console.log('Strategy: Copy URLs + FINALIZED from production to generated');
    console.log('Result: Enhanced generated file becomes new complete production');
    console.log('');

    // Load files
    console.log('📖 Loading files...');
    const generatedContent = await fs.readFile(GENERATED_FILE, 'utf-8');
    const productionContent = await fs.readFile(PRODUCTION_FILE, 'utf-8');

    // Parse files
    console.log('🔍 Parsing citations...');
    const generatedRefs = parseDecisionsFile(generatedContent);
    const productionRefs = parseDecisionsFile(productionContent);

    console.log(`   Generated: ${generatedRefs.length} citations`);
    console.log(`   Production: ${productionRefs.length} citations`);
    console.log('');

    // Build lookup map for production refs
    const productionMap = new Map();
    for (const ref of productionRefs) {
        productionMap.set(ref.id, ref);
    }

    // Statistics tracking
    let urlsCopied = 0;
    let primaryUrlsAdded = 0;
    let secondaryUrlsAdded = 0;
    let tertiaryUrlsAdded = 0;
    let finalizedAdded = 0;
    let contextsPreserved = 0;
    let relevancePreserved = 0;
    let phaseBaselinePreserved = 0;

    // Build enhanced file manually (preserving CONTEXT blocks from generated)
    console.log('✨ Creating enhanced references...');
    const lines = [];

    for (const genRef of generatedRefs) {
        const prodRef = productionMap.get(genRef.id);

        if (!prodRef) {
            console.log(`   ⚠️  [${genRef.id}] not in production file, keeping generated as-is`);
        }

        // Build citation line
        let entry = `[${genRef.id}] `;
        if (genRef.authors) entry += `${genRef.authors} `;
        if (genRef.year) entry += `(${genRef.year}). `;
        if (genRef.title) entry += `${genRef.title}. `;
        if (genRef.other) entry += `${genRef.other}. `;

        lines.push(entry.trim());

        // PRESERVE: Extract CONTEXT block from generated file (full manuscript text)
        const contextMatch = generatedContent.match(
            new RegExp(`\\[${genRef.id}\\][^\\n]*\\n\\[CONTEXT_START\\]\\n([\\s\\S]*?)\\[CONTEXT_END\\]`, 'm')
        );

        if (contextMatch) {
            lines.push('[CONTEXT_START]');
            lines.push(contextMatch[1].trim());
            lines.push('[CONTEXT_END]');
            contextsPreserved++;
        }

        // COPY: Add FINALIZED flag from production (all refs in production are finalized)
        if (prodRef) {
            lines.push('[FINALIZED]');
            finalizedAdded++;
        }

        // PRESERVE: Add enhanced relevance text from generated file
        if (genRef.relevance_text) {
            lines.push(`Relevance: ${genRef.relevance_text}`);
            relevancePreserved++;
        }

        // COMBINED FLAGS: Merge flags from both files
        const combinedFlags = [...new Set([...genRef.flags, ...(prodRef ? prodRef.flags : [])])];
        const flagsToWrite = combinedFlags.filter(f => f !== 'FINALIZED'); // FINALIZED already written above

        if (flagsToWrite.length > 0) {
            lines.push(`FLAGS[${flagsToWrite.join(' ')}]`);

            // Track v30.0_PHASE1_BASELINE preservation
            if (flagsToWrite.includes('v30.0_PHASE1_BASELINE')) {
                phaseBaselinePreserved++;
            }
        }

        // COPY: Add URLs from production
        if (prodRef) {
            if (prodRef.urls.primary) {
                lines.push(`PRIMARY_URL[${prodRef.urls.primary}]`);
                primaryUrlsAdded++;
                urlsCopied++;
            }
            if (prodRef.urls.secondary) {
                lines.push(`SECONDARY_URL[${prodRef.urls.secondary}]`);
                secondaryUrlsAdded++;
                urlsCopied++;
            }
            if (prodRef.urls.tertiary) {
                lines.push(`TERTIARY_URL[${prodRef.urls.tertiary}]`);
                tertiaryUrlsAdded++;
                urlsCopied++;
            }
        }

        // Blank line between references
        lines.push('');
    }

    console.log(`   ✅ Processing complete`);
    console.log('');

    // Create backup of generated file before overwriting
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const backupFile = `CaughtInTheActGeneratedDecisions.txt.backup-${timestamp}`;
    console.log('💾 Creating backup...');
    await fs.copyFile(GENERATED_FILE, backupFile);
    console.log(`   Backup created: ${backupFile}`);
    console.log('');

    // Write output (overwrite generated file)
    console.log('💾 Writing enhanced file...');
    await fs.writeFile(OUTPUT_FILE, lines.join('\n'), 'utf-8');
    console.log(`   ✅ Enhanced file written: ${OUTPUT_FILE}`);
    console.log('');

    // Statistics
    console.log('📊 Merge Summary:');
    console.log('-'.repeat(70));
    console.log(`   Total references: ${generatedRefs.length}`);
    console.log('');
    console.log('   PRESERVED from generated:');
    console.log(`     - CONTEXT blocks: ${contextsPreserved}`);
    console.log(`     - Enhanced relevance text: ${relevancePreserved}`);
    console.log(`     - v30.0_PHASE1_BASELINE flags: ${phaseBaselinePreserved}`);
    console.log('');
    console.log('   COPIED from production:');
    console.log(`     - FINALIZED flags: ${finalizedAdded}`);
    console.log(`     - PRIMARY URLs: ${primaryUrlsAdded}`);
    console.log(`     - SECONDARY URLs: ${secondaryUrlsAdded}`);
    console.log(`     - TERTIARY URLs: ${tertiaryUrlsAdded}`);
    console.log(`     - Total URLs copied: ${urlsCopied}`);
    console.log('');

    // File size comparison
    const generatedSizeBefore = (await fs.stat(backupFile)).size;
    const productionSize = (await fs.stat(PRODUCTION_FILE)).size;
    const enhancedSize = (await fs.stat(OUTPUT_FILE)).size;

    console.log('📈 File Sizes:');
    console.log(`   Generated (before): ${(generatedSizeBefore / 1024).toFixed(1)} KB`);
    console.log(`   Production (source): ${(productionSize / 1024).toFixed(1)} KB`);
    console.log(`   Enhanced (after): ${(enhancedSize / 1024).toFixed(1)} KB`);
    console.log(`   Size increase: ${((enhancedSize - generatedSizeBefore) / 1024).toFixed(1)} KB`);
    console.log('');

    // Validation checks
    console.log('✅ Validation:');
    console.log('-'.repeat(70));

    const allHaveContext = contextsPreserved === generatedRefs.length;
    const allHaveRelevance = relevancePreserved === generatedRefs.length;
    const allHaveFinalized = finalizedAdded === generatedRefs.length;
    const allHavePrimaryUrls = primaryUrlsAdded === generatedRefs.length;

    console.log(`   ✅ All ${generatedRefs.length} references have CONTEXT: ${allHaveContext ? 'PASS' : 'FAIL'}`);
    console.log(`   ✅ All ${generatedRefs.length} references have enhanced relevance: ${allHaveRelevance ? 'PASS' : 'FAIL'}`);
    console.log(`   ✅ All ${generatedRefs.length} references have FINALIZED: ${allHaveFinalized ? 'PASS' : 'FAIL'}`);
    console.log(`   ✅ All ${generatedRefs.length} references have PRIMARY URLs: ${allHavePrimaryUrls ? 'PASS' : 'FAIL'}`);
    console.log(`   ✅ Secondary URL coverage: ${((secondaryUrlsAdded / generatedRefs.length) * 100).toFixed(1)}%`);
    console.log('');

    if (allHaveContext && allHaveRelevance && allHaveFinalized && allHavePrimaryUrls) {
        console.log('✅ MERGE COMPLETE - All validations passed!');
    } else {
        console.log('⚠️  MERGE COMPLETE - Some validations failed, review output');
    }
    console.log('');

    console.log('📋 Next Steps:');
    console.log('-'.repeat(70));
    console.log('1. Review enhanced file: CaughtInTheActGeneratedDecisions.txt');
    console.log('2. Replace production file: cp CaughtInTheActGeneratedDecisions.txt CaughtInTheAct_decisions.txt');
    console.log('3. Test in iPad app (Context button should work)');
    console.log('4. Create completion report');
    console.log('');
}

main().catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
});
