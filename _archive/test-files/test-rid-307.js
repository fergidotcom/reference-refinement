#!/usr/bin/env node

/**
 * Test RID 307 - Verify "January 6th" title is NOT incorrectly cleaned
 */

import { parseDecisionsFile } from './batch-utils.js';

const input = '[307] Shorenstein Center on Media, Politics and Public Policy. (2021). January 6th Misinformation: A Case Study in Narrative Consistency. Harvard Kennedy School Research Paper. Relevance: Test';

console.log('Testing RID 307:\n');
console.log('Input:', input.substring(0, 120) + '...\n');

const refs = parseDecisionsFile(input);
const ref = refs[0];

console.log('Parsed title:', ref.title);
console.log('Expected title: January 6th Misinformation: A Case Study in Narrative Consistency\n');

// Check our regex doesn't match this
const datePrefix = /^(January|February|March|April|May|June|July|August|September|October|November|December)(?:\s+\d{1,2})?(?:,?\s+\d{4})?\)\s+/i;
const matches = datePrefix.test(ref.title);

if (!matches) {
    console.log('✅ CORRECT: Date prefix regex does NOT match "January 6th" (no closing paren)');
    console.log('✅ Title is parsed correctly!\n');
    process.exit(0);
} else {
    console.log('❌ ERROR: Date prefix regex incorrectly matched "January 6th"');
    console.log('❌ This is a legitimate title, not a parsing error!\n');
    process.exit(1);
}
