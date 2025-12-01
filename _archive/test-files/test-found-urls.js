#!/usr/bin/env node

async function testURL(url, description) {
    console.log(`\n🔍 Testing: ${description}`);
    console.log(`   URL: ${url}`);

    try {
        // Test with HEAD request (what batch processor uses)
        const headResponse = await fetch(url, {
            method: 'HEAD',
            redirect: 'follow',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
            }
        });

        console.log(`   HEAD: [${headResponse.status}] ${headResponse.headers.get('content-type')}`);

        // Also test with GET to see if SEC blocks HEAD but allows GET
        const getResponse = await fetch(url, {
            method: 'GET',
            redirect: 'follow',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
            }
        });

        console.log(`   GET:  [${getResponse.status}] ${getResponse.headers.get('content-type')}`);

        if (headResponse.status >= 200 && headResponse.status < 300) {
            console.log(`   ✅ VALID for batch processor (HEAD works)`);
            return true;
        } else if (getResponse.status >= 200 && getResponse.status < 300) {
            console.log(`   ⚠️  GET works but HEAD fails - batch processor may reject`);
            return false;
        } else {
            console.log(`   ❌ Both methods failed`);
            return false;
        }
    } catch (error) {
        console.log(`   ❌ ERROR: ${error.message}`);
        return false;
    }
}

async function main() {
    console.log('🔍 Verifying Found URLs\n');

    console.log('='.repeat(80));
    console.log('REF 315: Harvard IOP Spring 2024 Youth Poll (47th Edition)');
    console.log('='.repeat(80));
    
    const url315 = 'https://iop.harvard.edu/youth-poll/47th-edition-spring-2024';
    await testURL(url315, 'Primary URL');

    console.log('\n' + '='.repeat(80));
    console.log('REF 606: Meta Platforms 10-K (FY2023)');
    console.log('='.repeat(80));
    
    await testURL('https://www.sec.gov/Archives/edgar/data/1326801/000132680124000012/meta-20231231.htm', 'SEC Direct URL');
    await testURL('https://last10k.com/sec-filings/meta/0001326801-24-000012.htm', 'Last10K (alternative)');
    await testURL('https://investor.atmeta.com/financials/sec-filings/', 'Meta Investor (landing page)');
}

main().catch(console.error);
