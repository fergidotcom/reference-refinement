#!/usr/bin/env node

/**
 * PHASE 2: QUALITY PATTERN LEARNING
 *
 * Analyzes 288 finalized references to extract URL selection patterns and quality criteria
 */

import fs from 'fs';

// Load citation mapping from Phase 1
const mappingData = JSON.parse(fs.readFileSync('phase1_citation_mapping.json', 'utf8'));
const references = mappingData.references;

console.log('='.repeat(80));
console.log('PHASE 2: QUALITY PATTERN LEARNING');
console.log('='.repeat(80));

// ===== PRIMARY URL ANALYSIS =====
console.log('\n📊 PRIMARY URL PATTERN ANALYSIS');
console.log('─'.repeat(80));

// Extract domain from URL
function extractDomain(url) {
    if (!url) return null;
    try {
        const urlObj = new URL(url);
        return urlObj.hostname.replace('www.', '');
    } catch (e) {
        return null;
    }
}

// Classify domain tier
function classifyDomainTier(domain) {
    if (!domain) return 'unknown';

    // Tier 1: High-authority open access
    if (domain.includes('archive.org')) return 'tier1_archive';
    if (domain.includes('doi.org')) return 'tier1_doi';
    if (domain.includes('jstor.org')) return 'tier1_jstor';
    if (domain.match(/\.edu$/)) return 'tier1_edu';
    if (domain.match(/\.gov$/)) return 'tier1_gov';

    // Tier 2: Publishers and institutional
    if (domain.includes('press.') || domain.includes('publisher') || domain.includes('.org')) {
        return 'tier2_publisher';
    }

    // Tier 3: Purchase/commercial
    if (domain.includes('amazon') || domain.includes('google.com/books')) {
        return 'tier3_purchase';
    }

    // Tier 4: Other domains
    return 'tier4_other';
}

// Classify content type
function classifyContentType(url) {
    if (!url) return 'unknown';

    if (url.includes('.pdf')) return 'pdf';
    if (url.includes('doi.org')) return 'doi_link';
    if (url.includes('/books/')) return 'book_page';
    if (url.includes('/article')) return 'article_page';
    if (url.includes('amazon.com') || url.includes('google.com/books')) return 'purchase_page';

    return 'html_page';
}

// Analyze primary URLs
const primaryAnalysis = {
    total: 0,
    withPrimary: 0,
    noPrimary: 0,
    domainTiers: {},
    contentTypes: {},
    domains: {},
    samples: []
};

references.forEach(ref => {
    primaryAnalysis.total++;

    if (ref.primaryUrl) {
        primaryAnalysis.withPrimary++;

        const domain = extractDomain(ref.primaryUrl);
        const tier = classifyDomainTier(domain);
        const contentType = classifyContentType(ref.primaryUrl);

        // Count by tier
        if (!primaryAnalysis.domainTiers[tier]) {
            primaryAnalysis.domainTiers[tier] = 0;
        }
        primaryAnalysis.domainTiers[tier]++;

        // Count by content type
        if (!primaryAnalysis.contentTypes[contentType]) {
            primaryAnalysis.contentTypes[contentType] = 0;
        }
        primaryAnalysis.contentTypes[contentType]++;

        // Count by domain
        if (!primaryAnalysis.domains[domain]) {
            primaryAnalysis.domains[domain] = 0;
        }
        primaryAnalysis.domains[domain]++;

        // Collect samples
        if (primaryAnalysis.samples.length < 20) {
            primaryAnalysis.samples.push({
                id: ref.id,
                bibInfo: ref.bibInfo.slice(0, 80),
                domain: domain,
                tier: tier,
                contentType: contentType,
                url: ref.primaryUrl
            });
        }
    } else {
        primaryAnalysis.noPrimary++;
    }
});

console.log(`\nPrimary URL Coverage:`);
console.log(`  ✅ With primary URL: ${primaryAnalysis.withPrimary} (${(primaryAnalysis.withPrimary/primaryAnalysis.total*100).toFixed(1)}%)`);
console.log(`  ❌ No primary URL: ${primaryAnalysis.noPrimary}`);

console.log(`\nDomain Tier Distribution:`);
Object.keys(primaryAnalysis.domainTiers).sort().forEach(tier => {
    const count = primaryAnalysis.domainTiers[tier];
    const pct = (count/primaryAnalysis.withPrimary*100).toFixed(1);
    console.log(`  ${tier}: ${count} (${pct}%)`);
});

console.log(`\nContent Type Distribution:`);
Object.keys(primaryAnalysis.contentTypes).sort().forEach(type => {
    const count = primaryAnalysis.contentTypes[type];
    const pct = (count/primaryAnalysis.withPrimary*100).toFixed(1);
    console.log(`  ${type}: ${count} (${pct}%)`);
});

console.log(`\nTop Primary Domains:`);
const topPrimaryDomains = Object.entries(primaryAnalysis.domains)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15);
topPrimaryDomains.forEach(([domain, count]) => {
    console.log(`  ${domain}: ${count}`);
});

// ===== SECONDARY URL ANALYSIS =====
console.log('\n\n📊 SECONDARY URL PATTERN ANALYSIS');
console.log('─'.repeat(80));

const secondaryAnalysis = {
    total: 0,
    withSecondary: 0,
    noSecondary: 0,
    domainTiers: {},
    contentTypes: {},
    domains: {},
    relationshipTypes: {},
    samples: []
};

// Classify relationship type based on URL/domain
function classifyRelationshipType(url, domain) {
    if (!url) return 'unknown';

    // Review sources
    if (domain.includes('jstor.org') || domain.includes('review')) {
        return 'review';
    }

    // Academic/scholarly discussion
    if (domain.match(/\.edu$/) || domain.includes('academic') || domain.includes('scholar')) {
        return 'scholarly_discussion';
    }

    // Archive/repository
    if (domain.includes('archive.org') || domain.includes('repository')) {
        return 'archive';
    }

    // News/media
    if (domain.includes('nytimes') || domain.includes('news') || domain.includes('washington')) {
        return 'news_media';
    }

    // Organization/institution
    if (domain.match(/\.org$/)) {
        return 'organization';
    }

    // Encyclopedia/reference
    if (domain.includes('britannica') || domain.includes('stanford.edu') || domain.includes('plato.stanford')) {
        return 'reference';
    }

    return 'other';
}

references.forEach(ref => {
    secondaryAnalysis.total++;

    if (ref.secondaryUrl) {
        secondaryAnalysis.withSecondary++;

        const domain = extractDomain(ref.secondaryUrl);
        const tier = classifyDomainTier(domain);
        const contentType = classifyContentType(ref.secondaryUrl);
        const relationType = classifyRelationshipType(ref.secondaryUrl, domain);

        // Count by tier
        if (!secondaryAnalysis.domainTiers[tier]) {
            secondaryAnalysis.domainTiers[tier] = 0;
        }
        secondaryAnalysis.domainTiers[tier]++;

        // Count by content type
        if (!secondaryAnalysis.contentTypes[contentType]) {
            secondaryAnalysis.contentTypes[contentType] = 0;
        }
        secondaryAnalysis.contentTypes[contentType]++;

        // Count by domain
        if (!secondaryAnalysis.domains[domain]) {
            secondaryAnalysis.domains[domain] = 0;
        }
        secondaryAnalysis.domains[domain]++;

        // Count by relationship type
        if (!secondaryAnalysis.relationshipTypes[relationType]) {
            secondaryAnalysis.relationshipTypes[relationType] = 0;
        }
        secondaryAnalysis.relationshipTypes[relationType]++;

        // Collect samples
        if (secondaryAnalysis.samples.length < 20) {
            secondaryAnalysis.samples.push({
                id: ref.id,
                bibInfo: ref.bibInfo.slice(0, 80),
                domain: domain,
                tier: tier,
                contentType: contentType,
                relationType: relationType,
                url: ref.secondaryUrl
            });
        }
    } else {
        secondaryAnalysis.noSecondary++;
    }
});

console.log(`\nSecondary URL Coverage:`);
console.log(`  ✅ With secondary URL: ${secondaryAnalysis.withSecondary} (${(secondaryAnalysis.withSecondary/secondaryAnalysis.total*100).toFixed(1)}%)`);
console.log(`  ❌ No secondary URL: ${secondaryAnalysis.noSecondary}`);

console.log(`\nDomain Tier Distribution:`);
Object.keys(secondaryAnalysis.domainTiers).sort().forEach(tier => {
    const count = secondaryAnalysis.domainTiers[tier];
    const pct = (count/secondaryAnalysis.withSecondary*100).toFixed(1);
    console.log(`  ${tier}: ${count} (${pct}%)`);
});

console.log(`\nRelationship Type Distribution:`);
Object.keys(secondaryAnalysis.relationshipTypes).sort().forEach(type => {
    const count = secondaryAnalysis.relationshipTypes[type];
    const pct = (count/secondaryAnalysis.withSecondary*100).toFixed(1);
    console.log(`  ${type}: ${count} (${pct}%)`);
});

console.log(`\nTop Secondary Domains:`);
const topSecondaryDomains = Object.entries(secondaryAnalysis.domains)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15);
topSecondaryDomains.forEach(([domain, count]) => {
    console.log(`  ${domain}: ${count}`);
});

// ===== QUALITY SCORING FRAMEWORK =====
console.log('\n\n🎯 QUALITY SCORING FRAMEWORK');
console.log('─'.repeat(80));

const qualityFramework = {
    primary: {
        domain_tiers: {
            'tier1_archive': { score: 90, description: 'archive.org - Open access preservation' },
            'tier1_doi': { score: 95, description: 'DOI links - Persistent identifiers' },
            'tier1_jstor': { score: 95, description: 'JSTOR - Academic database' },
            'tier1_edu': { score: 85, description: '.edu domains - Educational institutions' },
            'tier1_gov': { score: 85, description: '.gov domains - Government sources' },
            'tier2_publisher': { score: 80, description: 'Publishers and academic presses' },
            'tier3_purchase': { score: 60, description: 'Amazon, Google Books - Purchase pages' },
            'tier4_other': { score: 50, description: 'Other domains - Case by case' }
        },
        content_types: {
            'doi_link': { bonus: 10, description: 'Direct DOI - Highly stable' },
            'pdf': { bonus: 5, description: 'PDF - Full text likely' },
            'article_page': { bonus: 5, description: 'Article page - Content page' },
            'book_page': { bonus: 0, description: 'Book page - May be info only' },
            'purchase_page': { penalty: -10, description: 'Purchase page - Not full text' }
        }
    },
    secondary: {
        relationship_types: {
            'review': { score: 95, description: 'Academic review - Critical analysis' },
            'scholarly_discussion': { score: 90, description: 'Scholarly discussion - Academic context' },
            'reference': { score: 85, description: 'Reference work - Authoritative overview' },
            'archive': { score: 80, description: 'Archive - Preserved content' },
            'organization': { score: 75, description: 'Organization - Institutional context' },
            'news_media': { score: 70, description: 'News media - Public discussion' },
            'other': { score: 60, description: 'Other - Evaluate individually' }
        }
    }
};

console.log('\nPrimary URL Scoring Rules:');
console.log('  Base scores by domain tier:');
Object.entries(qualityFramework.primary.domain_tiers).forEach(([tier, info]) => {
    console.log(`    ${tier}: ${info.score} - ${info.description}`);
});

console.log('\n  Content type modifiers:');
Object.entries(qualityFramework.primary.content_types).forEach(([type, info]) => {
    const modifier = info.bonus !== undefined ? `+${info.bonus}` : info.penalty;
    console.log(`    ${type}: ${modifier} - ${info.description}`);
});

console.log('\nSecondary URL Scoring Rules:');
console.log('  Base scores by relationship type:');
Object.entries(qualityFramework.secondary.relationship_types).forEach(([type, info]) => {
    console.log(`    ${type}: ${info.score} - ${info.description}`);
});

// ===== EXPORT RESULTS =====
const phase2Results = {
    primaryAnalysis: primaryAnalysis,
    secondaryAnalysis: secondaryAnalysis,
    qualityFramework: qualityFramework,
    insights: {
        primary: {
            coverage: `${(primaryAnalysis.withPrimary/primaryAnalysis.total*100).toFixed(1)}% of references have primary URLs`,
            dominantTier: Object.entries(primaryAnalysis.domainTiers).sort((a, b) => b[1] - a[1])[0],
            dominantContentType: Object.entries(primaryAnalysis.contentTypes).sort((a, b) => b[1] - a[1])[0],
            topDomain: topPrimaryDomains[0]
        },
        secondary: {
            coverage: `${(secondaryAnalysis.withSecondary/secondaryAnalysis.total*100).toFixed(1)}% of references have secondary URLs`,
            dominantTier: Object.entries(secondaryAnalysis.domainTiers).sort((a, b) => b[1] - a[1])[0],
            dominantRelationType: Object.entries(secondaryAnalysis.relationshipTypes).sort((a, b) => b[1] - a[1])[0],
            topDomain: topSecondaryDomains[0]
        }
    }
};

fs.writeFileSync('phase2_quality_patterns.json', JSON.stringify(phase2Results, null, 2));
console.log('\n✅ Saved quality analysis to phase2_quality_patterns.json');

console.log('\n' + '='.repeat(80));
console.log('✅ PHASE 2 COMPLETE: Quality pattern analysis successful');
console.log('='.repeat(80));
