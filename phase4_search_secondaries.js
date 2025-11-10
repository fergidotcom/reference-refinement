#!/usr/bin/env node

/**
 * PHASE 4B: SECONDARY URL SEARCH FOR MANUSCRIPT BODY INSTANCES
 *
 * Focuses on 11 meaningful instances from manuscript body (excludes bibliography)
 * Uses web search to find unique secondary URLs for each instance
 */

import fs from 'fs';

// Load instance data
const phase4Data = JSON.parse(fs.readFileSync('phase4_instances.json', 'utf8'));
const allInstances = phase4Data.instances;

// Load citation mapping for parent reference data
const mappingData = JSON.parse(fs.readFileSync('phase1_citation_mapping.json', 'utf8'));
const references = mappingData.references;

console.log('='.repeat(80));
console.log('PHASE 4B: SECONDARY URL SEARCH - MANUSCRIPT BODY INSTANCES');
console.log('='.repeat(80));

// Filter to only manuscript body instances (exclude bibliography)
const bodyInstances = allInstances.filter(inst =>
    !inst.manuscript_context.includes('References\nIntroduction References')
);

console.log(`\nFiltered instances:`);
console.log(`  Total instances: ${allInstances.length}`);
console.log(`  Bibliography instances (skipped): ${allInstances.length - bodyInstances.length}`);
console.log(`  Manuscript body instances: ${bodyInstances.length}`);

// Get parent reference data for each instance
const enrichedInstances = bodyInstances.map(inst => {
    const parentRef = references.find(r => r.id === inst.parent_rid);
    return {
        ...inst,
        parentPrimaryUrl: parentRef?.primaryUrl,
        parentSecondaryUrl: parentRef?.secondaryUrl,
        parentRelevance: parentRef?.relevance
    };
});

// ===== SECONDARY URL SEARCH STRATEGY =====
console.log('\n\n🔍 SECONDARY URL SEARCH STRATEGY');
console.log('─'.repeat(80));

console.log(`
For each of the ${bodyInstances.length} manuscript body instances:

1. Extract bibliographic info from parent reference
2. Identify manuscript chapter and context
3. Determine citation purpose (evidence, background, critique, etc.)
4. Generate search queries targeting:
   - Academic reviews of the work
   - Scholarly discussions related to chapter topic
   - Related research in the same domain
   - Alternative perspectives on the work

5. Search constraints:
   - Must be different from parent secondary URL
   - Must be different from sibling instance secondaries
   - Should match instance context and purpose
   - Prefer academic/scholarly sources

6. Quality scoring using Phase 2 framework
`);

// Display instances with search plan
console.log('\n📋 INSTANCE SEARCH PLAN');
console.log('─'.repeat(80));

enrichedInstances.forEach((inst, idx) => {
    console.log(`\n${idx + 1}. Instance [${inst.reference_id}]`);
    console.log(`   Parent: [${inst.parent_rid}] ${inst.bibInfo.slice(0, 60)}...`);
    console.log(`   Chapter context: ${extractChapter(inst.manuscript_context)}`);
    console.log(`   Purpose: ${inst.context_purpose}`);
    console.log(`   Parent secondary: ${inst.parentSecondaryUrl}`);
    console.log(`   Search focus: Find alternative ${inst.context_purpose.split(',')[0]} source`);
});

// ===== PREPARE FOR WEB SEARCH =====
console.log('\n\n🌐 READY FOR WEB SEARCH');
console.log('─'.repeat(80));

const searchPlan = enrichedInstances.map((inst, idx) => {
    const author = extractAuthor(inst.bibInfo);
    const title = extractTitle(inst.bibInfo);
    const chapter = extractChapter(inst.manuscript_context);

    return {
        instanceId: inst.reference_id,
        parentRid: inst.parent_rid,
        searchQueries: [
            `"${author}" "${title}" review`,
            `"${author}" ${chapter.toLowerCase()} analysis`,
            `"${title}" scholarly discussion`,
            `"${title}" critical analysis`
        ],
        avoidUrls: [inst.parentSecondaryUrl],
        preferredTypes: ['review', 'scholarly_discussion', 'reference'],
        bibInfo: inst.bibInfo.slice(0, 100),
        context: inst.manuscript_context.slice(0, 200)
    };
});

fs.writeFileSync('phase4_search_plan.json', JSON.stringify({
    totalInstances: bodyInstances.length,
    instances: enrichedInstances,
    searchPlan: searchPlan
}, null, 2));

console.log(`✅ Saved search plan for ${bodyInstances.length} instances to phase4_search_plan.json`);
console.log(`\nEstimated searches needed: ${bodyInstances.length * 4} (4 queries per instance)`);
console.log(`Ready to proceed with web searches to find unique secondary URLs`);

console.log('\n' + '='.repeat(80));
console.log('✅ PHASE 4B COMPLETE: Search plan ready');
console.log('='.repeat(80));

// ===== HELPER FUNCTIONS =====

function extractChapter(context) {
    const chapterMatch = context.match(/Chapter \d+[:\-]?\s*([^\n]+)/);
    if (chapterMatch) return chapterMatch[0];

    // Try section numbers
    const sectionMatch = context.match(/\d+\.\d+\s+([^\n]+)/);
    if (sectionMatch) return sectionMatch[0];

    return 'Introduction or body text';
}

function extractAuthor(bibInfo) {
    // Extract first author's last name
    const match = bibInfo.match(/^([^,]+)/);
    if (match) {
        const author = match[1].trim();
        // If it's "LastName, FirstName", take just LastName
        return author.split(',')[0].trim();
    }
    return '';
}

function extractTitle(bibInfo) {
    // Extract title between author and year/publication
    const match = bibInfo.match(/\([\d]+\)[.\s]*([^.]+)/);
    if (match) return match[1].trim();

    // Alternative: title after period
    const altMatch = bibInfo.match(/\.([^.]+)\./);
    if (altMatch) return altMatch[1].trim();

    return '';
}
