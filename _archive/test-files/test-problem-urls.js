#!/usr/bin/env node
/**
 * Test v16.7 on specific problem URLs from MANUAL_REVIEW references
 */

/**
 * Validation function (from batch-processor.js v16.7)
 */
async function validateURL(url, timeout = 10000) {
    try {
        const response = await fetch(url, {
            method: 'HEAD',
            redirect: 'follow',
            signal: AbortSignal.timeout(timeout)
        });

        const status = response.status;
        const contentType = (response.headers.get('content-type') || '').toLowerCase();

        // Level 1: Hard 404s
        if (status >= 400) {
            return { valid: false, status, reason: `HTTP ${status} error` };
        }

        // Level 2: Content-type mismatch
        if (url.toLowerCase().endsWith('.pdf')) {
            if (!contentType.includes('pdf') && contentType.includes('html')) {
                return { valid: false, status, reason: 'PDF URL returns HTML (likely error page)' };
            }
        }

        // Level 3: Content-based soft 404 detection
        if (contentType.includes('html') || contentType.includes('text')) {
            try {
                const contentResponse = await fetch(url, {
                    method: 'GET',
                    redirect: 'follow',
                    signal: AbortSignal.timeout(timeout)
                });

                const reader = contentResponse.body.getReader();
                const decoder = new TextDecoder();
                let htmlContent = '';
                let bytesRead = 0;
                const maxBytes = 15000;

                while (bytesRead < maxBytes) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    htmlContent += decoder.decode(value, { stream: true });
                    bytesRead += value.length;
                }

                reader.cancel();

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
                            contentSample: htmlContent.substring(0, 300)
                        };
                    }
                }

                const htmlLower = htmlContent.toLowerCase();
                if (htmlContent.length < 800 && htmlLower.includes('error')) {
                    return { valid: false, status, reason: 'Soft 404: Suspiciously short error page' };
                }

            } catch (contentError) {
                console.log(`   ⚠️  Content check failed: ${contentError.message}`);
            }
        }

        return { valid: true, status, contentType };
    } catch (error) {
        return { valid: false, error: error.message, reason: `Fetch failed: ${error.message}` };
    }
}

/**
 * Test URLs from MANUAL_REVIEW references
 */
async function testProblemURLs() {
    console.log('\n🧪 Testing v16.7 Enhanced Soft 404 Detection');
    console.log('📋 Problem URLs from MANUAL_REVIEW References\n');
    console.log('='.repeat(80));

    const testCases = [
        {
            rid: 312,
            title: 'Yale Psychology - Reality Flexibility Scale',
            urls: [
                { type: 'PRIMARY', url: 'https://doi.org/10.1080/00223891.2023.2187654' },
                { type: 'SECONDARY', url: 'https://psychology.yale.edu/faculty-research/labs/social-cognitive-lab' }
            ]
        },
        {
            rid: 314,
            title: 'Gallup - State of the American Mind Report',
            urls: [
                { type: 'PRIMARY', url: 'https://news.gallup.com/poll/507714/state-american-mind-2024.aspx' },
                { type: 'SECONDARY', url: 'https://www.gallup.com/analytics/318875/gallup-poll-social-series.aspx' }
            ]
        },
        {
            rid: 315,
            title: 'Harvard IOP - Political Attitudes Among Young Americans',
            urls: [
                { type: 'PRIMARY', url: 'https://iop.harvard.edu/spring-2024-harvard-youth-poll' },
                { type: 'SECONDARY', url: 'https://www.harvard.edu/president/news/2024/youth-political-engagement-survey' }
            ]
        },
        {
            rid: 606,
            title: 'Meta - Form 10-K Annual Report',
            urls: [
                { type: 'PRIMARY', url: 'https://investor.fb.com/financials/sec-filings/' },
                { type: 'SECONDARY', url: 'https://investor.atmeta.com/financials/' }
            ]
        },
        {
            rid: 613,
            title: 'Statista - Social Network User Statistics',
            urls: [
                { type: 'PRIMARY', url: 'https://www.statista.com/statistics/272014/global-social-networks-ranked-by-number-of-users/' },
                { type: 'SECONDARY', url: 'https://www.smartinsights.com/social-media-marketing/social-media-strategy/new-global-social-media-research/' }
            ]
        },
        {
            rid: 620,
            title: 'Meta - Q4 and Full Year 2023 Results',
            urls: [
                { type: 'PRIMARY', url: 'https://investor.fb.com/investor-news/press-release-details/2024/Meta-Reports-Fourth-Quarter-and-Full-Year-2023-Results/default.aspx' },
                { type: 'SECONDARY', url: 'https://digiday.com/media-buying/two-years-into-apples-att-ad-tech-still-sees-growth-despite-slowdowns/' }
            ]
        }
    ];

    let totalTested = 0;
    let validCount = 0;
    let invalidCount = 0;

    for (const testCase of testCases) {
        console.log(`\n📚 REF [${testCase.rid}]: ${testCase.title}\n`);

        for (const { type, url } of testCase.urls) {
            totalTested++;
            console.log(`🔗 ${type} URL:`);
            console.log(`   ${url}`);
            console.log('');

            const result = await validateURL(url, 10000);

            if (result.valid) {
                validCount++;
                console.log(`   ✅ VALID - HTTP ${result.status}`);
                console.log(`   Content-Type: ${result.contentType || 'unknown'}`);
                console.log(`   ➡️  v16.7 would ACCEPT this URL`);
            } else {
                invalidCount++;
                console.log(`   ❌ INVALID - ${result.reason}`);
                if (result.status) {
                    console.log(`   HTTP Status: ${result.status}`);
                }
                if (result.contentSample) {
                    console.log(`   Content sample:\n   "${result.contentSample.substring(0, 200).replace(/\n/g, ' ')}..."`);
                }
                console.log(`   ➡️  v16.7 would REJECT this URL (preventing bad recommendation!)`);
            }
            console.log('');

            // Delay between requests
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        console.log('-'.repeat(80));
    }

    console.log('\n' + '='.repeat(80));
    console.log('\n📊 TEST RESULTS:\n');
    console.log(`   Total URLs tested: ${totalTested}`);
    console.log(`   ✅ Valid (would be recommended): ${validCount}`);
    console.log(`   ❌ Invalid (would be rejected): ${invalidCount}`);
    console.log('');
    console.log('🎯 KEY INSIGHT:');
    console.log('   v16.7 catches soft 404s BEFORE recommendation, preventing');
    console.log('   the "site says not found" problem you experienced.');
    console.log('');
    console.log('   These references were flagged for MANUAL_REVIEW because');
    console.log('   v16.2 could not find suitable URLs. v16.7 would either:');
    console.log('   1. Find working URLs and recommend them, OR');
    console.log('   2. Reject broken URLs and flag for manual research');
    console.log('');
}

// Run test
testProblemURLs().catch(err => {
    console.error('❌ Test error:', err);
    process.exit(1);
});
