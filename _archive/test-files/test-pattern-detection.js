#!/usr/bin/env node
/**
 * Pattern Detection Test
 * Verifies that soft 404 patterns correctly match error page content
 */

const testPatterns = [
    // Test cases: [pattern regex, test string, should match]
    { pattern: /404.*not found|not found.*404/i, text: '404 page not found', shouldMatch: true, name: '404 error page' },
    { pattern: /404.*not found|not found.*404/i, text: 'This page contains 404 examples', shouldMatch: false, name: '404 error page (should NOT match - no "not found")' },
    { pattern: /page not found|page cannot be found/i, text: 'Page not found', shouldMatch: true, name: 'Page not found' },
    { pattern: /page not found|page cannot be found/i, text: 'The requested page could not be found', shouldMatch: false, name: 'Page not found (different pattern)' },
    { pattern: /sorry.*couldn't find.*page/i, text: "Sorry, we couldn't find the page you were looking for", shouldMatch: true, name: 'Sorry couldn\'t find' },
    { pattern: /oops.*nothing here|there's nothing here/i, text: "Oops! There's nothing here", shouldMatch: true, name: 'Nothing here (Oops)' },
    { pattern: /doi not found|doi.*cannot be found/i, text: 'DOI NOT FOUND', shouldMatch: true, name: 'DOI not found' },
    { pattern: /doi not found|doi.*cannot be found/i, text: 'This DOI cannot be found in the DOI System', shouldMatch: true, name: 'DOI cannot be found' },
    { pattern: /<title>[^<]*(404|not found|error)[^<]*<\/title>/i, text: '<title>404 - Page Not Found</title>', shouldMatch: true, name: '404 in title tag' },
    { pattern: /<title>[^<]*(404|not found|error)[^<]*<\/title>/i, text: '<title>Error: Page Not Found | Harvard Kennedy School</title>', shouldMatch: true, name: 'Error in title tag' },
    { pattern: /page.*could.*not.*be.*found/i, text: 'The requested page could not be found', shouldMatch: true, name: 'Could not be found' },
];

console.log('\n🧪 Testing Soft 404 Pattern Detection\n');
console.log('='.repeat(80));

let passed = 0;
let failed = 0;

for (const test of testPatterns) {
    const matched = test.pattern.test(test.text);
    const testPassed = matched === test.shouldMatch;

    if (testPassed) {
        console.log(`✅ PASS: ${test.name}`);
        console.log(`   Pattern: ${test.pattern}`);
        console.log(`   Text: "${test.text}"`);
        console.log(`   Expected match: ${test.shouldMatch}, Got: ${matched}`);
        passed++;
    } else {
        console.log(`❌ FAIL: ${test.name}`);
        console.log(`   Pattern: ${test.pattern}`);
        console.log(`   Text: "${test.text}"`);
        console.log(`   Expected match: ${test.shouldMatch}, Got: ${matched}`);
        failed++;
    }
    console.log('');
}

console.log('='.repeat(80));
console.log(`\n📊 Results: ${passed}/${passed + failed} passed, ${failed} failed\n`);

if (failed === 0) {
    console.log('🎉 All pattern tests passed!\n');
    process.exit(0);
} else {
    console.log('⚠️  Some pattern tests failed\n');
    process.exit(1);
}
