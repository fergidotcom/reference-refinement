#!/usr/bin/env node

/**
 * Test Title Parsing Fixes
 * Validates that cleanTitle function correctly handles:
 * 1. Date prefixes (e.g., "November 10) Title...")
 * 2. Trailing ellipsis (e.g., "Title.................")
 * 3. Publisher contamination (e.g., "Title. American Public Media")
 */

import { parseDecisionsFile } from './batch-utils.js';

console.log('🧪 Testing Title Parsing Fixes\n');
console.log('=' .repeat(80) + '\n');

// Test cases based on actual errors found in session logs
const testCases = [
    {
        name: 'RID 126 - Date prefix + trailing dots + publisher',
        input: '[126] American Public Media (2014). November 10) Radio: The Internet of the 1930s. American Public Media................. Relevance: Test',
        expected: {
            id: 126,
            title: 'Radio: The Internet of the 1930s',
            authors: 'American Public Media',
            year: '2014'
        }
    },
    {
        name: 'RID 127 - Date prefix + trailing dots + publisher',
        input: '[127] U.S. Census Bureau (2023). September) Philo Farnsworth and the Invention of Television. Census.gov................. Relevance: Test',
        expected: {
            id: 127,
            title: 'Philo Farnsworth and the Invention of Television',
            authors: 'U.S. Census Bureau',
            year: '2023'
        }
    },
    {
        name: 'RID 243 - Date prefix with day + year + trailing dots',
        input: '[243] Pew Research Center (2024). January 31) Mobile Technology and Home Broadband 2024. Pew Research Center................. Relevance: Test',
        expected: {
            id: 243,
            title: 'Mobile Technology and Home Broadband 2024',
            authors: 'Pew Research Center',
            year: '2024'
        }
    },
    {
        name: 'RID 244 - Date prefix + no trailing dots',
        input: '[244] Parker, S. (2017). November 9) Interview at Axios event, National Constitution Center, Philadelphia. Relevance: Test',
        expected: {
            id: 244,
            title: 'Interview at Axios event, National Constitution Center, Philadelphia',
            authors: 'Parker, S.',
            year: '2017'
        }
    },
    {
        name: 'Clean title - no errors',
        input: '[100] Smith, J. (2020). A Normal Title Without Issues. Publisher Press. Relevance: Test',
        expected: {
            id: 100,
            title: 'A Normal Title Without Issues',
            authors: 'Smith, J.',
            year: '2020'
        }
    },
    {
        name: 'Trailing dots only',
        input: '[101] Jones, A. (2019). Important Research....... Publisher. Relevance: Test',
        expected: {
            id: 101,
            title: 'Important Research',
            authors: 'Jones, A.',
            year: '2019'
        }
    },
    {
        name: 'Date prefix only (no dots)',
        input: '[102] Brown, B. (2021). December 25) Special Report. Publisher. Relevance: Test',
        expected: {
            id: 102,
            title: 'Special Report',
            authors: 'Brown, B.',
            year: '2021'
        }
    },
    {
        name: 'Complex date prefix (month, day, year)',
        input: '[103] White, C. (2022). March 15, 2022) Research Findings. University. Relevance: Test',
        expected: {
            id: 103,
            title: 'Research Findings',
            authors: 'White, C.',
            year: '2022'
        }
    }
];

// Run tests
let passed = 0;
let failed = 0;
const failures = [];

for (const test of testCases) {
    console.log(`Test: ${test.name}`);
    console.log(`Input: ${test.input.substring(0, 100)}...`);

    try {
        const parsed = parseDecisionsFile(test.input);

        if (parsed.length === 0) {
            console.log(`  ❌ FAIL: No references parsed`);
            failed++;
            failures.push({
                name: test.name,
                reason: 'No references parsed',
                input: test.input
            });
            console.log('');
            continue;
        }

        const ref = parsed[0];
        let testPassed = true;
        const errors = [];

        // Check ID
        if (ref.id !== test.expected.id) {
            errors.push(`ID: expected ${test.expected.id}, got ${ref.id}`);
            testPassed = false;
        }

        // Check title
        if (ref.title !== test.expected.title) {
            errors.push(`Title: expected "${test.expected.title}", got "${ref.title}"`);
            testPassed = false;
        }

        // Check authors
        if (ref.authors !== test.expected.authors) {
            errors.push(`Authors: expected "${test.expected.authors}", got "${ref.authors}"`);
            testPassed = false;
        }

        // Check year
        if (ref.year !== test.expected.year) {
            errors.push(`Year: expected "${test.expected.year}", got "${ref.year}"`);
            testPassed = false;
        }

        if (testPassed) {
            console.log(`  ✅ PASS`);
            console.log(`     Title: "${ref.title}"`);
            passed++;
        } else {
            console.log(`  ❌ FAIL`);
            for (const error of errors) {
                console.log(`     ${error}`);
            }
            failed++;
            failures.push({
                name: test.name,
                reason: errors.join('; '),
                input: test.input,
                actual: ref
            });
        }
    } catch (error) {
        console.log(`  ❌ FAIL: ${error.message}`);
        failed++;
        failures.push({
            name: test.name,
            reason: error.message,
            input: test.input
        });
    }

    console.log('');
}

// Summary
console.log('=' .repeat(80));
console.log('\n📊 TEST SUMMARY\n');
console.log(`Total Tests: ${testCases.length}`);
console.log(`Passed: ${passed} ✅`);
console.log(`Failed: ${failed} ❌`);
console.log(`Success Rate: ${((passed / testCases.length) * 100).toFixed(1)}%`);

if (failures.length > 0) {
    console.log('\n❌ FAILURES:\n');
    for (const failure of failures) {
        console.log(`  ${failure.name}`);
        console.log(`  Reason: ${failure.reason}`);
        console.log('');
    }
    process.exit(1);
} else {
    console.log('\n✅ ALL TESTS PASSED!\n');
    process.exit(0);
}
