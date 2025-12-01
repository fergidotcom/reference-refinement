/**
 * Compare Generated vs Production Citation Files
 *
 * Analyzes CaughtInTheActGeneratedDecisions.txt (306 citations) vs
 * CaughtInTheAct_decisions.txt (288 citations) to identify:
 * - References unique to each file
 * - Bibliographic discrepancies for matching references
 */

import fs from 'fs/promises';
import { parseDecisionsFile } from './batch-utils.js';

const GENERATED_FILE = 'CaughtInTheActGeneratedDecisions.txt';
const PRODUCTION_FILE = 'CaughtInTheAct_decisions.txt';

async function main() {
    console.log('📊 Citation File Comparison Analysis');
    console.log('=' .repeat(70));
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

    // Get all reference IDs
    const generatedIds = new Set(generatedMap.keys());
    const productionIds = new Set(productionMap.keys());

    // Find unique references
    const generatedOnly = [...generatedIds].filter(id => !productionIds.has(id)).sort((a, b) => a - b);
    const productionOnly = [...productionIds].filter(id => !generatedIds.has(id)).sort((a, b) => a - b);
    const commonIds = [...generatedIds].filter(id => productionIds.has(id)).sort((a, b) => a - b);

    console.log('📈 Analysis Summary:');
    console.log('-'.repeat(70));
    console.log(`   References in BOTH files:        ${commonIds.length}`);
    console.log(`   References ONLY in generated:    ${generatedOnly.length}`);
    console.log(`   References ONLY in production:   ${productionOnly.length}`);
    console.log('');

    // Analyze common references for differences
    const perfectMatches = [];
    const minorDifferences = [];
    const significantDifferences = [];

    for (const id of commonIds) {
        const gen = generatedMap.get(id);
        const prod = productionMap.get(id);

        // Build citation text for comparison (exclude relevance, URLs, flags)
        const genCitation = buildCitationText(gen);
        const prodCitation = buildCitationText(prod);

        if (genCitation === prodCitation) {
            perfectMatches.push(id);
        } else {
            // Check if difference is minor (whitespace, punctuation) or significant
            const genNorm = normalizeCitation(genCitation);
            const prodNorm = normalizeCitation(prodCitation);

            if (genNorm === prodNorm) {
                minorDifferences.push({ id, gen, prod, genCitation, prodCitation });
            } else {
                significantDifferences.push({ id, gen, prod, genCitation, prodCitation });
            }
        }
    }

    console.log('📊 Citation Quality Analysis:');
    console.log('-'.repeat(70));
    console.log(`   Perfect matches:           ${perfectMatches.length} (${percent(perfectMatches.length, commonIds.length)}%)`);
    console.log(`   Minor differences:         ${minorDifferences.length} (${percent(minorDifferences.length, commonIds.length)}%)`);
    console.log(`   Significant differences:   ${significantDifferences.length} (${percent(significantDifferences.length, commonIds.length)}%)`);
    console.log('');

    // Build detailed report
    const report = buildReport({
        generatedRefs,
        productionRefs,
        generatedOnly,
        productionOnly,
        perfectMatches,
        minorDifferences,
        significantDifferences,
        generatedMap,
        productionMap
    });

    // Write report
    const reportPath = '/Users/joeferguson/Downloads/Phase1_ValidationReport_GeneratedVsProduction.md';
    await fs.writeFile(reportPath, report, 'utf-8');

    console.log(`✅ Report written to:`);
    console.log(`   ${reportPath}`);
    console.log('');
}

function buildCitationText(ref) {
    let text = '';
    if (ref.authors) text += ref.authors + ' ';
    if (ref.year) text += `(${ref.year}) `;
    if (ref.title) text += ref.title + '. ';
    if (ref.other) text += ref.other;
    return text.trim();
}

function normalizeCitation(text) {
    // Remove extra whitespace, normalize punctuation
    return text
        .replace(/\s+/g, ' ')
        .replace(/\.\s*\./g, '.')
        .replace(/,\s*,/g, ',')
        .toLowerCase()
        .trim();
}

function percent(num, total) {
    return Math.round((num / total) * 100);
}

function buildReport(data) {
    const {
        generatedRefs,
        productionRefs,
        generatedOnly,
        productionOnly,
        perfectMatches,
        minorDifferences,
        significantDifferences,
        generatedMap,
        productionMap
    } = data;

    const lines = [];

    lines.push('# Phase 1 Validation Report: Generated vs Production');
    lines.push('');
    lines.push(`**Analysis Date:** ${new Date().toISOString().split('T')[0]}`);
    lines.push(`**Generated File:** CaughtInTheActGeneratedDecisions.txt (${generatedRefs.length} citations)`);
    lines.push(`**Production File:** CaughtInTheAct_decisions.txt (${productionRefs.length} citations)`);
    lines.push('');
    lines.push('---');
    lines.push('');

    // Section 1: Executive Summary
    lines.push('## 1. Executive Summary');
    lines.push('');
    const commonCount = perfectMatches.length + minorDifferences.length + significantDifferences.length;
    lines.push(`- **Total citations in generated file:** ${generatedRefs.length}`);
    lines.push(`- **Total citations in production file:** ${productionRefs.length}`);
    lines.push(`- **References in both files:** ${commonCount}`);
    lines.push(`- **Unique to generated:** ${generatedOnly.length} (+${generatedOnly.length} references)`);
    lines.push(`- **Unique to production:** ${productionOnly.length}`);
    lines.push('');
    lines.push('### Citation Quality (for common references)');
    lines.push('');
    lines.push(`- **Perfect matches:** ${perfectMatches.length} (${percent(perfectMatches.length, commonCount)}%)`);
    lines.push(`- **Minor differences:** ${minorDifferences.length} (${percent(minorDifferences.length, commonCount)}%)`);
    lines.push(`- **Significant differences:** ${significantDifferences.length} (${percent(significantDifferences.length, commonCount)}%)`);
    lines.push('');
    lines.push('---');
    lines.push('');

    // Section 2: References Unique to Generated File
    lines.push('## 2. References Only in Generated File');
    lines.push('');
    lines.push(`**Count:** ${generatedOnly.length} references`);
    lines.push('');

    if (generatedOnly.length > 0) {
        lines.push('| Ref # | Citation Text | Suspected Reason |');
        lines.push('|-------|---------------|------------------|');

        for (const id of generatedOnly) {
            const ref = generatedMap.get(id);
            const citation = buildCitationText(ref).substring(0, 80) + '...';
            const reason = analyzeWhyUnique(ref, id, productionMap);
            lines.push(`| [${id}] | ${citation} | ${reason} |`);
        }
    } else {
        lines.push('*None*');
    }

    lines.push('');
    lines.push('---');
    lines.push('');

    // Section 3: References Unique to Production File
    lines.push('## 3. References Only in Production File');
    lines.push('');
    lines.push(`**Count:** ${productionOnly.length} references`);
    lines.push('');

    if (productionOnly.length > 0) {
        lines.push('| Ref # | Citation Text | Notes |');
        lines.push('|-------|---------------|-------|');

        for (const id of productionOnly) {
            const ref = productionMap.get(id);
            const citation = buildCitationText(ref).substring(0, 80) + '...';
            lines.push(`| [${id}] | ${citation} | Needs investigation |`);
        }
    } else {
        lines.push('*None*');
    }

    lines.push('');
    lines.push('---');
    lines.push('');

    // Section 4: Bibliographic Discrepancies
    lines.push('## 4. Bibliographic Discrepancies (Significant Differences)');
    lines.push('');
    lines.push(`**Count:** ${significantDifferences.length} references with significant citation text differences`);
    lines.push('');

    if (significantDifferences.length > 0) {
        for (const diff of significantDifferences.slice(0, 20)) { // Show first 20
            lines.push(`### Reference [${diff.id}]`);
            lines.push('');
            lines.push('**Generated:**');
            lines.push('```');
            lines.push(diff.genCitation);
            lines.push('```');
            lines.push('');
            lines.push('**Production:**');
            lines.push('```');
            lines.push(diff.prodCitation);
            lines.push('```');
            lines.push('');
            lines.push('**Difference Type:** ' + categorizeDifference(diff));
            lines.push('');
            lines.push('---');
            lines.push('');
        }

        if (significantDifferences.length > 20) {
            lines.push(`*... and ${significantDifferences.length - 20} more significant differences*`);
            lines.push('');
        }
    } else {
        lines.push('*None - all common references match perfectly or have only minor differences*');
        lines.push('');
    }

    // Section 5: Minor Differences
    lines.push('## 5. Minor Differences (Whitespace/Punctuation)');
    lines.push('');
    lines.push(`**Count:** ${minorDifferences.length} references with minor formatting differences`);
    lines.push('');

    if (minorDifferences.length > 0) {
        lines.push('These references have identical content but differ in spacing or punctuation.');
        lines.push('');
        lines.push('**Reference IDs:** ' + minorDifferences.map(d => `[${d.id}]`).join(', '));
    } else {
        lines.push('*None*');
    }

    lines.push('');
    lines.push('---');
    lines.push('');

    // Section 6: Statistics Summary
    lines.push('## 6. Statistics Summary');
    lines.push('');
    lines.push('| Category | Count | Percentage |');
    lines.push('|----------|-------|------------|');
    lines.push(`| Perfect matches | ${perfectMatches.length} | ${percent(perfectMatches.length, commonCount)}% |`);
    lines.push(`| Minor differences | ${minorDifferences.length} | ${percent(minorDifferences.length, commonCount)}% |`);
    lines.push(`| Significant differences | ${significantDifferences.length} | ${percent(significantDifferences.length, commonCount)}% |`);
    lines.push(`| Generated-only | ${generatedOnly.length} | ${percent(generatedOnly.length, generatedRefs.length)}% |`);
    lines.push(`| Production-only | ${productionOnly.length} | ${percent(productionOnly.length, productionRefs.length)}% |`);
    lines.push('');
    lines.push('---');
    lines.push('');

    // Section 7: Recommendations
    lines.push('## 7. Recommendations');
    lines.push('');
    lines.push('### Generated-Only References (+' + generatedOnly.length + ')');
    lines.push('');

    if (generatedOnly.length > 0) {
        lines.push('**Action Required:** Review each of the ' + generatedOnly.length + ' generated-only references to determine:');
        lines.push('');
        lines.push('1. **Valid additions** - References that should be added to production file');
        lines.push('2. **Duplicates** - References that duplicate existing entries (different numbering)');
        lines.push('3. **Errors** - References that were incorrectly extracted');
        lines.push('');
        lines.push('**Recommendation:** Manual review of generated-only references before proceeding with Phase 1b.');
    } else {
        lines.push('*No action needed - no generated-only references found*');
    }
    lines.push('');

    lines.push('### Bibliographic Discrepancies');
    lines.push('');

    if (significantDifferences.length > 0) {
        lines.push('**Action Required:** Review ' + significantDifferences.length + ' references with significant differences.');
        lines.push('');
        lines.push('**Recommendation:** Determine which version (generated vs production) is more accurate and update accordingly.');
    } else {
        lines.push('*No action needed - citation text matches between files*');
    }
    lines.push('');

    lines.push('### Next Steps');
    lines.push('');
    lines.push('1. **Review this report** - Understand scope of differences');
    lines.push('2. **Decide on Phase 1b scope** - Process all 306? Clean first?');
    lines.push('3. **Manual review** - Spot-check generated-only references');
    lines.push('4. **User approval** - Get approval before proceeding to Phase 1b');
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push('**End of Report**');

    return lines.join('\n');
}

function analyzeWhyUnique(ref, id, productionMap) {
    // Check if similar reference exists with different ID
    const refText = buildCitationText(ref).toLowerCase();

    for (const [prodId, prodRef] of productionMap.entries()) {
        const prodText = buildCitationText(prodRef).toLowerCase();

        // Check for high similarity (potential duplicate)
        if (calculateSimilarity(refText, prodText) > 0.8) {
            return `Possible duplicate of [${prodId}]`;
        }
    }

    return 'Likely new/missed citation';
}

function calculateSimilarity(str1, str2) {
    // Simple similarity check based on common words
    const words1 = new Set(str1.split(/\s+/));
    const words2 = new Set(str2.split(/\s+/));

    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
}

function categorizeDifference(diff) {
    const gen = diff.genCitation.toLowerCase();
    const prod = diff.prodCitation.toLowerCase();

    // Check what differs
    const genRef = diff.gen;
    const prodRef = diff.prod;

    const diffs = [];

    if (genRef.authors !== prodRef.authors) {
        diffs.push('Author');
    }
    if (genRef.year !== prodRef.year) {
        diffs.push('Year');
    }
    if (genRef.title !== prodRef.title) {
        diffs.push('Title');
    }
    if (genRef.other !== prodRef.other) {
        diffs.push('Publisher/Journal');
    }

    return diffs.join(', ') || 'Unknown';
}

main().catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
});
