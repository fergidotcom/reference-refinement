#!/usr/bin/env node

/**
 * Validate All References in decisions.txt
 * Ensures all 288 references parse correctly after title parsing fixes
 */

import fs from 'fs/promises';
import { parseDecisionsFile } from './batch-utils.js';

console.log('🔍 Validating All References in decisions.txt\n');

async function validateAllReferences() {
    // Read decisions.txt
    const content = await fs.readFile('decisions.txt', 'utf-8');

    console.log('📋 Parsing decisions.txt...\n');

    const references = parseDecisionsFile(content);

    console.log(`Total references parsed: ${references.length}\n`);

    // Count references by status
    let withTitles = 0;
    let withoutTitles = 0;
    let withAuthors = 0;
    let withYear = 0;
    let finalized = 0;
    let withPrimary = 0;
    let withSecondary = 0;
    let manualReview = 0;
    let batchProcessed = 0;

    const missingTitles = [];
    const suspiciousTitles = [];

    for (const ref of references) {
        if (ref.title && ref.title.trim()) {
            withTitles++;

            // Check for suspicious patterns that might indicate parsing errors
            if (ref.title.includes('...')) {
                suspiciousTitles.push({
                    id: ref.id,
                    title: ref.title,
                    reason: 'Contains ellipsis'
                });
            }
            // Only flag if it matches the exact pattern we're trying to clean (with closing paren)
            if (/^(January|February|March|April|May|June|July|August|September|October|November|December)(?:\s+\d{1,2})?(?:,?\s+\d{4})?\)\s+/i.test(ref.title)) {
                suspiciousTitles.push({
                    id: ref.id,
                    title: ref.title,
                    reason: 'Has uncleaned date prefix pattern'
                });
            }
        } else {
            withoutTitles++;
            missingTitles.push(ref.id);
        }

        if (ref.authors && ref.authors.trim()) withAuthors++;
        if (ref.year && ref.year.trim()) withYear++;
        if (ref.finalized) finalized++;
        if (ref.urls.primary) withPrimary++;
        if (ref.urls.secondary) withSecondary++;
        if (ref.manual_review) manualReview++;
        if (ref.batch_version) batchProcessed++;
    }

    // Report
    console.log('📊 PARSING STATISTICS\n');
    console.log('─'.repeat(60));
    console.log(`Total References:       ${references.length}`);
    console.log(`With Titles:            ${withTitles} (${((withTitles/references.length)*100).toFixed(1)}%)`);
    console.log(`Without Titles:         ${withoutTitles} (${((withoutTitles/references.length)*100).toFixed(1)}%)`);
    console.log(`With Authors:           ${withAuthors} (${((withAuthors/references.length)*100).toFixed(1)}%)`);
    console.log(`With Year:              ${withYear} (${((withYear/references.length)*100).toFixed(1)}%)`);
    console.log('─'.repeat(60));
    console.log(`Finalized:              ${finalized} (${((finalized/references.length)*100).toFixed(1)}%)`);
    console.log(`With Primary URL:       ${withPrimary} (${((withPrimary/references.length)*100).toFixed(1)}%)`);
    console.log(`With Secondary URL:     ${withSecondary} (${((withSecondary/references.length)*100).toFixed(1)}%)`);
    console.log(`Manual Review Needed:   ${manualReview} (${((manualReview/references.length)*100).toFixed(1)}%)`);
    console.log(`Batch Processed:        ${batchProcessed} (${((batchProcessed/references.length)*100).toFixed(1)}%)`);
    console.log('─'.repeat(60));

    // Warnings
    if (missingTitles.length > 0) {
        console.log(`\n⚠️  MISSING TITLES (${missingTitles.length} references):`);
        console.log(`    RIDs: ${missingTitles.slice(0, 20).join(', ')}${missingTitles.length > 20 ? '...' : ''}`);
    }

    if (suspiciousTitles.length > 0) {
        console.log(`\n⚠️  SUSPICIOUS TITLES (${suspiciousTitles.length} references):\n`);
        for (const item of suspiciousTitles.slice(0, 10)) {
            console.log(`    [${item.id}] ${item.reason}: "${item.title.substring(0, 80)}${item.title.length > 80 ? '...' : ''}"`);
        }
        if (suspiciousTitles.length > 10) {
            console.log(`    ... and ${suspiciousTitles.length - 10} more`);
        }
    }

    // Success criteria
    console.log('\n✅ VALIDATION RESULTS\n');

    const validationsPassed = [];
    const validationsFailed = [];

    // Check 1: All references parsed
    if (references.length === 288) {
        validationsPassed.push('All 288 references parsed successfully');
    } else {
        validationsFailed.push(`Expected 288 references, got ${references.length}`);
    }

    // Check 2: >95% have titles
    if (withTitles / references.length >= 0.95) {
        validationsPassed.push(`${((withTitles/references.length)*100).toFixed(1)}% of references have titles (≥95% threshold)`);
    } else {
        validationsFailed.push(`Only ${((withTitles/references.length)*100).toFixed(1)}% have titles (expected ≥95%)`);
    }

    // Check 3: No suspicious titles
    if (suspiciousTitles.length === 0) {
        validationsPassed.push('No suspicious title patterns detected');
    } else {
        validationsFailed.push(`${suspiciousTitles.length} suspicious titles detected`);
    }

    // Display results
    for (const pass of validationsPassed) {
        console.log(`  ✅ ${pass}`);
    }
    for (const fail of validationsFailed) {
        console.log(`  ❌ ${fail}`);
    }

    console.log('\n' + '='.repeat(60) + '\n');

    if (validationsFailed.length === 0) {
        console.log('🎉 ALL VALIDATIONS PASSED!\n');
        console.log('The title parsing fixes are working correctly.');
        console.log('All 288 references parse without errors.\n');
        return true;
    } else {
        console.log('⚠️  SOME VALIDATIONS FAILED\n');
        console.log('Please review the issues above before deploying.\n');
        return false;
    }
}

validateAllReferences()
    .then(success => {
        process.exit(success ? 0 : 1);
    })
    .catch(err => {
        console.error('Error:', err);
        process.exit(1);
    });
