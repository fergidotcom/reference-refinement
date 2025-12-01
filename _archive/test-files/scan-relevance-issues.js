#!/usr/bin/env node

/**
 * Scan decisions.txt for references missing "Relevance: " label
 *
 * This script identifies references where relevance text exists but the
 * "Relevance: " label is missing, which causes the text to be incorporated
 * into the Other Bibliographic field during parsing.
 */

import { parseDecisionsFile } from './batch-utils.js';
import fs from 'fs/promises';

const content = await fs.readFile('decisions.txt', 'utf-8');
const refs = parseDecisionsFile(content);

console.log('═══════════════════════════════════════════════════════════');
console.log('  SCANNING FOR REFERENCES MISSING "Relevance: " LABEL');
console.log('═══════════════════════════════════════════════════════════\n');

const missingLabel = [];
const hasLabel = [];
const noRelevance = [];

for (const ref of refs) {
    // Find the reference block in the file
    // Must match at start of line: ^\[ID\]
    const refPattern = new RegExp(`^\\[${ref.id}\\]`, 'm');
    const match = content.match(refPattern);
    if (!match) continue;

    const refStart = match.index;
    const nextRefMatch = content.slice(refStart + 1).match(/\n\[\d+\]/);
    const refEnd = nextRefMatch ? refStart + 1 + nextRefMatch.index : content.length;
    const refBlock = content.slice(refStart, refEnd);

    // Check if "Relevance: " label exists in the block
    const hasRelevanceLabel = refBlock.includes('Relevance: ');

    // Check if parser extracted relevance text
    const hasRelevanceText = ref.relevance_text && ref.relevance_text.length > 20;

    if (hasRelevanceText) {
        if (hasRelevanceLabel) {
            hasLabel.push(ref.id);
        } else {
            missingLabel.push({
                id: ref.id,
                title: ref.title.substring(0, 70),
                relevance_length: ref.relevance_text.length,
                preview: ref.relevance_text.substring(0, 80)
            });
        }
    } else {
        noRelevance.push(ref.id);
    }
}

// Report results
console.log(`📊 SUMMARY:\n`);
console.log(`   Total references: ${refs.length}`);
console.log(`   Has relevance text: ${hasLabel.length + missingLabel.length}`);
console.log(`   ✅ Has "Relevance: " label: ${hasLabel.length}`);
console.log(`   ⚠️  Missing "Relevance: " label: ${missingLabel.length}`);
console.log(`   ℹ️  No relevance text: ${noRelevance.length}\n`);

if (missingLabel.length > 0) {
    console.log(`⚠️  REFERENCES MISSING "Relevance: " LABEL:\n`);

    for (const ref of missingLabel) {
        console.log(`   RID ${ref.id}: ${ref.title}${ref.title.length >= 70 ? '...' : ''}`);
        console.log(`      Length: ${ref.relevance_length} chars`);
        console.log(`      Preview: ${ref.preview}...`);
        console.log('');
    }

    console.log(`\n🔧 FIX REQUIRED:`);
    console.log(`   Manually add "Relevance: " before the relevance text in decisions.txt`);
    console.log(`   for the ${missingLabel.length} reference(s) listed above.\n`);

    console.log(`📝 EXAMPLE FIX:`);
    console.log(`   BEFORE: [123] Author. Title. Publisher. This text explains relevance...`);
    console.log(`   AFTER:  [123] Author. Title. Publisher. Relevance: This text explains relevance...\n`);

    console.log(`⚙️  WHY THIS MATTERS:`);
    console.log(`   Without the "Relevance: " label, the parser cannot distinguish between`);
    console.log(`   bibliographic information and relevance text, causing the relevance text`);
    console.log(`   to be incorporated into the "Other Bibliographic" field instead.\n`);
} else {
    console.log(`✅ ALL GOOD!\n`);
    console.log(`   All ${hasLabel.length} references with relevance text have the proper`);
    console.log(`   "Relevance: " label. No manual fixes needed.\n`);
}

console.log('═══════════════════════════════════════════════════════════\n');
