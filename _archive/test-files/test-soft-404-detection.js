#!/usr/bin/env node
/**
 * Test script for v16.7 Enhanced Soft 404 Detection
 *
 * Tests the validateURL() function against various URL types:
 * - Known good URLs (should pass)
 * - Known 404 URLs (should fail with hard 404)
 * - Known soft 404 URLs (should fail with soft 404 detection)
 */

/**
 * Simplified validation function for testing
 * (Copy from batch-processor.js with minimal dependencies)
 */
async function validateURL(url, timeout = 10000) {
    try {
        // Make HEAD request to check status and content-type
        const response = await fetch(url, {
            method: 'HEAD',
            redirect: 'follow',
            signal: AbortSignal.timeout(timeout)
        });

        const status = response.status;
        const contentType = (response.headers.get('content-type') || '').toLowerCase();

        // Level 1: Check for HTTP errors (hard 404s)
        if (status >= 400) {
            return {
                valid: false,
                status,
                reason: `HTTP ${status} error`
            };
        }

        // Level 2: Check for content-type mismatch (catches many soft 404s)
        if (url.toLowerCase().endsWith('.pdf')) {
            if (!contentType.includes('pdf') && contentType.includes('html')) {
                return {
                    valid: false,
                    status,
                    reason: 'PDF URL returns HTML (likely error page)'
                };
            }
        }

        // Level 3: Content-based soft 404 detection for HTML pages
        if (contentType.includes('html') || contentType.includes('text')) {
            try {
                // Fetch first 15KB of content
                const contentResponse = await fetch(url, {
                    method: 'GET',
                    redirect: 'follow',
                    signal: AbortSignal.timeout(timeout)
                });

                const reader = contentResponse.body.getReader();
                const decoder = new TextDecoder();
                let htmlContent = '';
                let bytesRead = 0;
                const maxBytes = 15000; // 15KB

                while (bytesRead < maxBytes) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    htmlContent += decoder.decode(value, { stream: true });
                    bytesRead += value.length;
                }

                reader.cancel();

                // Soft 404 detection patterns
                const errorPatterns = [
                    { pattern: /404.*not found|not found.*404/i, name: '404 error page' },
                    { pattern: /page not found|page cannot be found/i, name: 'Page not found' },
                    { pattern: /page.*could.*not.*be.*found/i, name: 'Could not be found' },
                    { pattern: /sorry.*couldn't find.*page/i, name: 'Sorry, couldn\'t find' },
                    { pattern: /oops.*nothing here|there's nothing here/i, name: 'Nothing here (Oops)' },
                    { pattern: /the requested page could not be found/i, name: 'Requested page not found' },
                    { pattern: /this page.*not exist|page does not exist/i, name: 'Page does not exist' },
                    { pattern: /document not found|document.*not available/i, name: 'Document not found' },
                    { pattern: /doi not found|doi.*cannot be found/i, name: 'DOI not found' },
                    { pattern: /item.*not found|item does not exist/i, name: 'Item not found (repository)' },
                    { pattern: /<title>[^<]*(404|not found|error)[^<]*<\/title>/i, name: '404/Error in title tag' }
                ];

                for (const { pattern, name } of errorPatterns) {
                    if (pattern.test(htmlContent)) {
                        return {
                            valid: false,
                            status,
                            reason: `Soft 404 detected: ${name}`,
                            contentSample: htmlContent.substring(0, 200) + '...'
                        };
                    }
                }

                const htmlLower = htmlContent.toLowerCase();
                if (htmlContent.length < 800 && htmlLower.includes('error')) {
                    return {
                        valid: false,
                        status,
                        reason: 'Soft 404: Suspiciously short error page'
                    };
                }

            } catch (contentError) {
                console.log(`   ⚠️  Content check failed: ${contentError.message}`);
            }
        }

        return {
            valid: true,
            status,
            contentType
        };
    } catch (error) {
        return {
            valid: false,
            error: error.message,
            reason: `Fetch failed: ${error.message}`
        };
    }
}

/**
 * Test runner
 */
async function runTests() {
    console.log('\n🧪 Testing v16.7 Enhanced Soft 404 Detection\n');
    console.log('=' .repeat(80));

    const testCases = [
        {
            name: 'Valid working URL (Archive.org)',
            url: 'https://archive.org',
            expected: 'PASS'
        },
        {
            name: 'Valid working URL (Google)',
            url: 'https://www.google.com',
            expected: 'PASS'
        },
        {
            name: 'Hard 404 (non-existent page)',
            url: 'https://httpstat.us/404',
            expected: 'FAIL (hard 404)'
        },
        {
            name: 'Known DOI error (from screenshot)',
            url: 'https://doi.org/10.1038/s41467-021-25915-5',
            expected: 'FAIL (soft 404 - DOI not found)',
            note: 'This is the DOI from your screenshot showing "DOI NOT FOUND"'
        },
        {
            name: 'Test: Generic 404 page',
            url: 'https://httpbin.org/status/404',
            expected: 'FAIL (hard 404)'
        }
    ];

    // Add user-provided URLs if specified via command line
    const args = process.argv.slice(2);
    if (args.length > 0) {
        console.log('\n📌 Testing user-provided URLs:\n');
        for (const url of args) {
            testCases.push({
                name: `User URL: ${url}`,
                url,
                expected: 'UNKNOWN'
            });
        }
    }

    let passCount = 0;
    let failCount = 0;
    let errorCount = 0;

    for (const test of testCases) {
        console.log(`\n🔍 Test: ${test.name}`);
        console.log(`   URL: ${test.url}`);
        if (test.note) {
            console.log(`   📝  ${test.note}`);
        }
        console.log(`   Expected: ${test.expected}`);
        console.log('');

        const result = await validateURL(test.url, 8000);

        if (result.valid) {
            console.log(`   ✅ VALID - HTTP ${result.status} - ${result.contentType || 'unknown type'}`);
            if (test.expected === 'PASS') {
                passCount++;
                console.log(`   ✓ Test PASSED (correctly identified as valid)`);
            } else if (test.expected.startsWith('FAIL')) {
                console.log(`   ⚠️  Test FAILED (expected invalid, but validated as valid)`);
                failCount++;
            }
        } else {
            console.log(`   ❌ INVALID - ${result.reason}`);
            if (result.httpStatus) {
                console.log(`   HTTP Status: ${result.httpStatus}`);
            }
            if (result.contentSample) {
                console.log(`   Content sample: ${result.contentSample}`);
            }
            if (test.expected.startsWith('FAIL')) {
                passCount++;
                console.log(`   ✓ Test PASSED (correctly identified as invalid)`);
            } else if (test.expected === 'PASS') {
                console.log(`   ⚠️  Test FAILED (expected valid, but rejected)`);
                failCount++;
            }
        }

        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('\n' + '='.repeat(80));
    console.log('\n📊 TEST RESULTS:');
    console.log(`   ✅ Passed: ${passCount}/${testCases.length}`);
    console.log(`   ❌ Failed: ${failCount}/${testCases.length}`);
    console.log(`   ⚠️  Errors: ${errorCount}/${testCases.length}`);
    console.log('');

    if (failCount === 0) {
        console.log('🎉 All tests passed!\n');
    } else {
        console.log('⚠️  Some tests failed - review results above\n');
    }
}

// Run tests
runTests().catch(err => {
    console.error('❌ Test runner error:', err);
    process.exit(1);
});
