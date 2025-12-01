#!/usr/bin/env node

/**
 * Manual Research Script for Difficult References
 * Tests multiple URL patterns and search strategies
 */

async function testURL(url, description) {
    try {
        console.log(`\n🔍 Testing: ${description}`);
        console.log(`   URL: ${url}`);

        const response = await fetch(url, {
            method: 'HEAD',
            redirect: 'follow',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
            }
        });

        const status = response.status;
        const contentType = response.headers.get('content-type') || 'unknown';
        const finalUrl = response.url;

        if (status >= 200 && status < 300) {
            console.log(`   ✅ SUCCESS [${status}] - ${contentType}`);
            if (finalUrl !== url) {
                console.log(`   🔀 Redirected to: ${finalUrl}`);
            }
            return { success: true, url, finalUrl, status, contentType };
        } else {
            console.log(`   ❌ FAILED [${status}]`);
            return { success: false, url, status };
        }
    } catch (error) {
        console.log(`   ❌ ERROR: ${error.message}`);
        return { success: false, url, error: error.message };
    }
}

async function testREF315() {
    console.log('\n' + '='.repeat(80));
    console.log('REF 315: Harvard IOP Spring 2024 Youth Poll');
    console.log('='.repeat(80));

    const candidates = [
        // Try main youth poll page
        ['https://iop.harvard.edu/youth-poll', 'Main Youth Poll Page'],
        ['https://iop.harvard.edu/get-involved/harvard-political-review/survey-center', 'Survey Center'],
        
        // Try spring 2024 variants
        ['https://iop.harvard.edu/spring-2024-youth-poll', 'Spring 2024 variant 1'],
        ['https://iop.harvard.edu/youth-poll/spring-2024', 'Spring 2024 variant 2'],
        
        // Try PDF
        ['https://iop.harvard.edu/sites/default/files/content/Spring_2024_Youth_Poll.pdf', 'Spring 2024 PDF'],
    ];

    const results = [];
    for (const [url, desc] of candidates) {
        const result = await testURL(url, desc);
        if (result.success) {
            results.push(result);
        }
        await new Promise(resolve => setTimeout(resolve, 300));
    }
    return results;
}

async function testREF606() {
    console.log('\n' + '='.repeat(80));
    console.log('REF 606: Meta 10-K (FY2023, filed Feb 2024)');
    console.log('='.repeat(80));

    const candidates = [
        // SEC EDGAR (Meta CIK: 1326801)
        ['https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=1326801&type=10-K', 'SEC EDGAR Search'],
        ['https://www.sec.gov/Archives/edgar/data/1326801/000132680124000012/meta-20231231.htm', '10-K HTML FY2023'],
        
        // Investor sites
        ['https://investor.fb.com/financials/sec-filings/', 'FB Investor SEC Filings'],
        ['https://investor.atmeta.com/financials/sec-filings/', 'Meta Investor SEC Filings'],
        
        // Direct PDF attempts
        ['https://d18rn0p25nwr6d.cloudfront.net/CIK-0001326801/95fd0267-afc5-4e07-a1f5-7f39f5c99689.pdf', 'CloudFront PDF'],
    ];

    const results = [];
    for (const [url, desc] of candidates) {
        const result = await testURL(url, desc);
        if (result.success) {
            results.push(result);
        }
        await new Promise(resolve => setTimeout(resolve, 300));
    }
    return results;
}

async function main() {
    console.log('🔬 Manual Research: Testing Alternative URLs\n');

    const ref315Results = await testREF315();
    const ref606Results = await testREF606();

    console.log('\n' + '='.repeat(80));
    console.log('SUMMARY');
    console.log('='.repeat(80));

    if (ref315Results.length > 0) {
        console.log('\n✅ REF 315 - Working URLs:');
        ref315Results.forEach((r, i) => {
            console.log(`   ${i+1}. [${r.status}] ${r.finalUrl}`);
        });
    } else {
        console.log('\n❌ REF 315 - No working URLs');
    }

    if (ref606Results.length > 0) {
        console.log('\n✅ REF 606 - Working URLs:');
        ref606Results.forEach((r, i) => {
            console.log(`   ${i+1}. [${r.status}] ${r.finalUrl}`);
        });
    } else {
        console.log('\n❌ REF 606 - No working URLs');
    }
}

main().catch(console.error);
