/**
 * Enhance Production File
 *
 * Merges CaughtInTheActGeneratedDecisions.txt enhancements into production:
 * - Add CONTEXT blocks from generated
 * - Replace short relevance with ~200 word AI-generated relevance
 * - Preserve URLs from production
 * - Combine FLAGS
 */

import fs from 'fs/promises';
import { parseDecisionsFile, formatDecisionsFile } from './batch-utils.js';

const GENERATED_FILE = 'CaughtInTheActGeneratedDecisions.txt';
const PRODUCTION_FILE = 'CaughtInTheAct_decisions.txt';
const OUTPUT_FILE = 'CaughtInTheAct_decisions_enhanced.txt';

async function main() {
    console.log('🔄 Enhancing Production File');
    console.log('='.repeat(70));
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

    // Build lookup maps
    const generatedMap = new Map();
    const productionMap = new Map();

    for (const ref of generatedRefs) {
        generatedMap.set(ref.id, ref);
    }

    for (const ref of productionRefs) {
        productionMap.set(ref.id, ref);
    }

    // Create enhanced references
    console.log('✨ Creating enhanced references...');
    const enhancedRefs = [];
    let enhancedCount = 0;
    let urlsPreserved = 0;
    let contextsAdded = 0;

    for (const prodRef of productionRefs) {
        const genRef = generatedMap.get(prodRef.id);

        if (!genRef) {
            console.log(`   ⚠️  [${prodRef.id}] not in generated file, keeping as-is`);
            enhancedRefs.push(prodRef);
            continue;
        }

        // Create enhanced reference
        const enhanced = {
            id: prodRef.id,
            rawLine: prodRef.rawLine,
            authors: prodRef.authors,
            year: prodRef.year,
            title: prodRef.title,
            other: prodRef.other,

            // ENHANCED: Use long AI-generated relevance from generated file
            relevance_text: genRef.relevance_text,

            // PRESERVED: Keep URLs from production
            urls: {
                primary: prodRef.urls.primary || '',
                secondary: prodRef.urls.secondary || '',
                tertiary: prodRef.urls.tertiary || ''
            },

            queries: [],
            finalized: true, // Always finalized
            manual_review: false,
            batch_version: null,

            // COMBINED FLAGS
            flags: [...new Set([...prodRef.flags, ...genRef.flags, 'FINALIZED'])]
        };

        // Track enhancements
        enhancedCount++;
        if (prodRef.urls.primary) urlsPreserved++;

        enhancedRefs.push(enhanced);
    }

    console.log(`   Enhanced: ${enhancedCount} citations`);
    console.log(`   URLs preserved: ${urlsPreserved}`);
    console.log('');

    // Now add CONTEXT blocks manually (format doesn't support them yet)
    console.log('📝 Building enhanced file with CONTEXT blocks...');
    const lines = [];

    for (const ref of enhancedRefs) {
        const genRef = generatedMap.get(ref.id);

        // Build citation line
        let entry = `[${ref.id}] `;
        if (ref.authors) entry += `${ref.authors} `;
        if (ref.year) entry += `(${ref.year}). `;
        if (ref.title) entry += `${ref.title}. `;
        if (ref.other) entry += `${ref.other}. `;

        lines.push(entry.trim());

        // Add CONTEXT block from generated file if available
        if (genRef) {
            // Extract CONTEXT from generated file
            const contextMatch = generatedContent.match(
                new RegExp(`\\[${ref.id}\\][^\\n]*\\n\\[CONTEXT_START\\]\\n([\\s\\S]*?)\\[CONTEXT_END\\]`, 'm')
            );

            if (contextMatch) {
                lines.push('[CONTEXT_START]');
                lines.push(contextMatch[1].trim());
                lines.push('[CONTEXT_END]');
                contextsAdded++;
            }
        }

        // Add FINALIZED flag
        lines.push('[FINALIZED]');

        // Add enhanced relevance text
        if (ref.relevance_text) {
            lines.push(`Relevance: ${ref.relevance_text}`);
        }

        // Add FLAGS
        const flagsToWrite = [...new Set(ref.flags)].filter(f => f !== 'FINALIZED');
        if (flagsToWrite.length > 0) {
            lines.push(`FLAGS[${flagsToWrite.join(' ')}]`);
        }

        // Add URLs
        if (ref.urls.primary) {
            lines.push(`PRIMARY_URL[${ref.urls.primary}]`);
        }
        if (ref.urls.secondary) {
            lines.push(`SECONDARY_URL[${ref.urls.secondary}]`);
        }
        if (ref.urls.tertiary) {
            lines.push(`TERTIARY_URL[${ref.urls.tertiary}]`);
        }

        // Blank line between references
        lines.push('');
    }

    console.log(`   CONTEXT blocks added: ${contextsAdded}`);
    console.log('');

    // Write output
    console.log('💾 Writing enhanced file...');
    await fs.writeFile(OUTPUT_FILE, lines.join('\n'), 'utf-8');

    console.log(`✅ Enhanced file written: ${OUTPUT_FILE}`);
    console.log('');

    // Statistics
    console.log('📊 Enhancement Summary:');
    console.log('-'.repeat(70));
    console.log(`   Total references: ${enhancedRefs.length}`);
    console.log(`   CONTEXT blocks added: ${contextsAdded}`);
    console.log(`   Enhanced relevance text: ${enhancedCount}`);
    console.log(`   URLs preserved: ${urlsPreserved}`);
    console.log('');

    // File size comparison
    const generatedSize = (await fs.stat(GENERATED_FILE)).size;
    const productionSize = (await fs.stat(PRODUCTION_FILE)).size;
    const enhancedSize = (await fs.stat(OUTPUT_FILE)).size;

    console.log('📈 File Sizes:');
    console.log(`   Generated: ${(generatedSize / 1024).toFixed(1)} KB`);
    console.log(`   Production: ${(productionSize / 1024).toFixed(1)} KB`);
    console.log(`   Enhanced: ${(enhancedSize / 1024).toFixed(1)} KB`);
    console.log('');

    console.log('✅ COMPLETE');
    console.log('');
    console.log('Next steps:');
    console.log('1. Review enhanced file: CaughtInTheAct_decisions_enhanced.txt');
    console.log('2. If acceptable, replace production: mv CaughtInTheAct_decisions_enhanced.txt CaughtInTheAct_decisions.txt');
}

main().catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
});
