#!/usr/bin/env node

/**
 * PHASE 1: CITATION INSTANCE MAPPING
 *
 * Extracts all citations from manuscript, maps to references, identifies multi-instance citations
 */

import fs from 'fs';

// Load manuscript content
const manuscriptText = fs.readFileSync('manuscript_content.txt', 'utf8');
const decisionsText = fs.readFileSync('caught_in_the_act_decisions.txt', 'utf8');

console.log('='.repeat(80));
console.log('PHASE 1: CITATION INSTANCE MAPPING');
console.log('='.repeat(80));

// Parse references from decisions.txt
function parseReferences(text) {
    const references = [];
    const refRegex = /^\[(\d+)\]\s+(.*?)(?=FLAGS\[|PRIMARY_URL\[|SECONDARY_URL\[|Relevance:|$)/gm;

    let match;
    while ((match = refRegex.exec(text)) !== null) {
        const refId = match[1];
        const bibInfo = match[2].trim();

        // Extract finalized status
        const finalizedMatch = text.slice(match.index).match(/FLAGS\[([^\]]*)\]/);
        const flags = finalizedMatch ? finalizedMatch[1] : '';
        const isFinalized = flags.includes('FINALIZED');

        // Extract URLs
        const primaryMatch = text.slice(match.index).match(/PRIMARY_URL\[([^\]]*)\]/);
        const secondaryMatch = text.slice(match.index).match(/SECONDARY_URL\[([^\]]*)\]/);

        // Extract relevance
        const relevanceMatch = text.slice(match.index).match(/Relevance:\s*([^\n]*(?:\n(?!\[).*)*)/);

        references.push({
            id: refId,
            bibInfo: bibInfo,
            isFinalized: isFinalized,
            flags: flags,
            primaryUrl: primaryMatch ? primaryMatch[1] : null,
            secondaryUrl: secondaryMatch ? secondaryMatch[1] : null,
            relevance: relevanceMatch ? relevanceMatch[1].trim() : null,
            citations: [] // Will populate with citation instances
        });
    }

    return references;
}

// Extract all citations from manuscript
function extractCitations(text) {
    const citations = [];

    // Match citation patterns: [number] or [number-number] or [number,number,...]
    const citationRegex = /\[(\d+(?:[-,]\d+)*)\]/g;

    let match;
    while ((match = citationRegex.exec(text)) !== null) {
        const citationText = match[1];
        const position = match.index;

        // Parse individual reference IDs from citation
        const refIds = [];
        if (citationText.includes('-')) {
            // Range like [100-105]
            const [start, end] = citationText.split('-').map(Number);
            for (let i = start; i <= end; i++) {
                refIds.push(i.toString());
            }
        } else if (citationText.includes(',')) {
            // List like [1,5,7]
            refIds.push(...citationText.split(',').map(s => s.trim()));
        } else {
            // Single reference [42]
            refIds.push(citationText);
        }

        // Extract context (500 chars before and after)
        const contextStart = Math.max(0, position - 500);
        const contextEnd = Math.min(text.length, position + 500);
        const context = text.slice(contextStart, contextEnd);

        // Extract paragraph context (more comprehensive)
        const paragraphStart = text.lastIndexOf('\n\n', position);
        const paragraphEnd = text.indexOf('\n\n', position);
        const paragraphContext = text.slice(
            paragraphStart !== -1 ? paragraphStart : 0,
            paragraphEnd !== -1 ? paragraphEnd : text.length
        ).trim();

        citations.push({
            refIds: refIds,
            position: position,
            shortContext: context,
            paragraphContext: paragraphContext,
            citationText: match[0]
        });
    }

    return citations;
}

// Map citations to references
function mapCitationsToReferences(references, citations) {
    const citationMap = new Map();

    citations.forEach(citation => {
        citation.refIds.forEach(refId => {
            if (!citationMap.has(refId)) {
                citationMap.set(refId, []);
            }
            citationMap.get(refId).push(citation);
        });
    });

    // Populate references with their citations
    references.forEach(ref => {
        const refCitations = citationMap.get(ref.id) || [];
        ref.citations = refCitations;
        ref.citationCount = refCitations.length;
    });

    return references;
}

// Analyze citation usage patterns
function analyzeCitationPatterns(references) {
    const stats = {
        total: references.length,
        finalized: 0,
        unfinalized: 0,
        singleCitation: 0,
        multiCitation: 0,
        noCitation: 0,
        citationDistribution: {},
        finalizedMultiCitation: 0,
        unfinalizedMultiCitation: 0
    };

    references.forEach(ref => {
        if (ref.isFinalized) stats.finalized++;
        else stats.unfinalized++;

        const count = ref.citationCount;
        if (count === 0) {
            stats.noCitation++;
        } else if (count === 1) {
            stats.singleCitation++;
        } else {
            stats.multiCitation++;
            if (ref.isFinalized) stats.finalizedMultiCitation++;
            else stats.unfinalizedMultiCitation++;
        }

        if (!stats.citationDistribution[count]) {
            stats.citationDistribution[count] = 0;
        }
        stats.citationDistribution[count]++;
    });

    return stats;
}

// Identify context purpose for each citation
function identifyContextPurpose(context) {
    const purposes = [];

    // Evidence patterns
    if (/demonstrates?|shows?|proves?|establishes|evidence|empirical|data/i.test(context)) {
        purposes.push('evidence');
    }

    // Background patterns
    if (/background|foundation|context|established|earlier|previous|historical/i.test(context)) {
        purposes.push('background');
    }

    // Critique patterns
    if (/however|but|critique|challenges?|contradicts?|disputes?|argues against/i.test(context)) {
        purposes.push('critique');
    }

    // Comparison patterns
    if (/similar|contrast|compared|unlike|whereas|different|parallel/i.test(context)) {
        purposes.push('comparison');
    }

    // Theoretical patterns
    if (/theory|framework|model|concept|argues?|proposes?/i.test(context)) {
        purposes.push('theoretical');
    }

    // Supporting detail patterns
    if (/for example|instance|illustrates?|shows how|demonstrates how/i.test(context)) {
        purposes.push('supporting_detail');
    }

    return purposes.length > 0 ? purposes : ['general'];
}

// Main execution
const references = parseReferences(decisionsText);
const citations = extractCitations(manuscriptText);
const mappedReferences = mapCitationsToReferences(references, citations);
const stats = analyzeCitationPatterns(mappedReferences);

// Add purpose analysis to citations
mappedReferences.forEach(ref => {
    ref.citations.forEach((citation, idx) => {
        citation.purpose = identifyContextPurpose(citation.paragraphContext);
        citation.instanceNumber = idx + 1;
    });
});

// Report results
console.log('\n📊 CITATION MAPPING STATISTICS');
console.log('─'.repeat(80));
console.log(`Total References: ${stats.total}`);
console.log(`  ✅ Finalized: ${stats.finalized} (${(stats.finalized/stats.total*100).toFixed(1)}%)`);
console.log(`  ⚠️  Unfinalized: ${stats.unfinalized} (${(stats.unfinalized/stats.total*100).toFixed(1)}%)`);
console.log();
console.log(`Citation Usage:`);
console.log(`  🔴 No citations: ${stats.noCitation}`);
console.log(`  🟡 Single citation: ${stats.singleCitation}`);
console.log(`  🟢 Multi-citation: ${stats.multiCitation}`);
console.log(`     └─ Finalized multi-citation: ${stats.finalizedMultiCitation}`);
console.log(`     └─ Unfinalized multi-citation: ${stats.unfinalizedMultiCitation}`);
console.log();
console.log('Citation Distribution:');
Object.keys(stats.citationDistribution).sort((a, b) => Number(a) - Number(b)).forEach(count => {
    const num = stats.citationDistribution[count];
    console.log(`  ${count}x citations: ${num} references`);
});

// Multi-citation candidates for instance expansion
console.log('\n🎯 INSTANCE EXPANSION CANDIDATES');
console.log('─'.repeat(80));
const multiCitationRefs = mappedReferences.filter(ref => ref.citationCount >= 2);
console.log(`Found ${multiCitationRefs.length} references with 2+ citations`);
console.log(`  Finalized: ${multiCitationRefs.filter(r => r.isFinalized).length}`);
console.log(`  Unfinalized: ${multiCitationRefs.filter(r => !r.isFinalized).length}`);

// Sample multi-citation references
console.log('\nSample Multi-Citation References:');
multiCitationRefs.slice(0, 10).forEach(ref => {
    console.log(`\n[${ref.id}] (${ref.citationCount} citations, ${ref.isFinalized ? 'FINALIZED' : 'UNFINALIZED'})`);
    console.log(`  ${ref.bibInfo.slice(0, 80)}...`);
    ref.citations.forEach((cit, idx) => {
        const purposes = cit.purpose.join(', ');
        console.log(`  ${idx + 1}. Purpose: ${purposes}`);
        console.log(`     Context: ${cit.paragraphContext.slice(0, 150)}...`);
    });
});

// Save detailed mapping to JSON
const outputData = {
    stats: stats,
    references: mappedReferences.map(ref => ({
        id: ref.id,
        bibInfo: ref.bibInfo,
        isFinalized: ref.isFinalized,
        primaryUrl: ref.primaryUrl,
        secondaryUrl: ref.secondaryUrl,
        relevance: ref.relevance,
        citationCount: ref.citationCount,
        citations: ref.citations.map(cit => ({
            instanceNumber: cit.instanceNumber,
            purpose: cit.purpose,
            paragraphContext: cit.paragraphContext,
            shortContext: cit.shortContext
        }))
    })),
    multiCitationCandidates: multiCitationRefs.map(ref => ({
        id: ref.id,
        bibInfo: ref.bibInfo,
        isFinalized: ref.isFinalized,
        citationCount: ref.citationCount,
        citations: ref.citations.map(cit => ({
            instanceNumber: cit.instanceNumber,
            purpose: cit.purpose,
            context: cit.paragraphContext
        }))
    }))
};

fs.writeFileSync('phase1_citation_mapping.json', JSON.stringify(outputData, null, 2));
console.log('\n✅ Saved detailed mapping to phase1_citation_mapping.json');

// Generate instance expansion plan
console.log('\n📋 INSTANCE EXPANSION PLAN');
console.log('─'.repeat(80));

const estimatedInstances = multiCitationRefs.reduce((sum, ref) => sum + (ref.citationCount - 1), 0);
console.log(`Current references: ${stats.total}`);
console.log(`New instances to create: ${estimatedInstances}`);
console.log(`Total after expansion: ${stats.total + estimatedInstances}`);
console.log();
console.log(`Breakdown:`);
console.log(`  Parent references (preserved): ${stats.total}`);
console.log(`  New instance references: ${estimatedInstances}`);
console.log(`    └─ From finalized parents: ${multiCitationRefs.filter(r => r.isFinalized).reduce((sum, r) => sum + (r.citationCount - 1), 0)}`);
console.log(`    └─ From unfinalized parents: ${multiCitationRefs.filter(r => !r.isFinalized).reduce((sum, r) => sum + (r.citationCount - 1), 0)}`);

console.log('\n' + '='.repeat(80));
console.log('✅ PHASE 1 COMPLETE: Citation mapping successful');
console.log('='.repeat(80));
