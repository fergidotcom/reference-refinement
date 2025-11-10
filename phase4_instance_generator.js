#!/usr/bin/env node

/**
 * PHASE 4: INSTANCE REFERENCE CREATION
 *
 * Creates new unfinalized instance references for multi-citation references
 * Each instance gets unique secondary URL and context-specific relevance text
 */

import fs from 'fs';

// Load previous phase results
const mappingData = JSON.parse(fs.readFileSync('phase1_citation_mapping.json', 'utf8'));
const qualityData = JSON.parse(fs.readFileSync('phase2_quality_patterns.json', 'utf8'));

console.log('='.repeat(80));
console.log('PHASE 4: INSTANCE REFERENCE CREATION');
console.log('='.repeat(80));

// Load multi-citation candidates
const multiCitationRefs = mappingData.multiCitationCandidates;
console.log(`\nProcessing ${multiCitationRefs.length} references with multiple citations`);

// Calculate total instances needed
const totalInstancesNeeded = multiCitationRefs.reduce((sum, ref) => {
    // Each ref with N citations creates (N-1) new instances
    // (first citation stays with parent, rest become instances)
    return sum + (ref.citationCount - 1);
}, 0);

console.log(`Total instances to create: ${totalInstancesNeeded}`);

// ===== INSTANCE GENERATION STRATEGY =====
console.log('\n📋 INSTANCE GENERATION STRATEGY');
console.log('─'.repeat(80));

console.log(`
Strategy Overview:
1. Parent Reference Preservation:
   - Keep first citation with parent reference
   - Maintain finalized status, URLs, and relevance text
   - No modifications to parent

2. Instance Reference Creation:
   - Additional citations (2nd, 3rd, 4th) become new instances
   - RID format: parent_rid.instance_number (e.g., 42.1, 42.2)
   - Always unfinalized (require human review)
   - is_instance flag set to true

3. URL Strategy:
   - Primary URL: SAME as parent (same source material)
   - Secondary URL: UNIQUE per instance (context-specific)
   - Tertiary URL: Optional, if parent had one

4. Relevance Text:
   - Instance-specific based on manuscript context
   - Describes how reference serves that particular citation
   - Different from parent and other instances

5. Flags:
   - finalized: false (ALWAYS)
   - is_instance: true
   - parent_rid: original reference ID
   - instance_number: 1, 2, 3, etc.
   - batch_version: 'v17.0'
   - source: 'WEB_CREATED'
`);

// ===== GENERATE INSTANCES =====
console.log('\n🔧 GENERATING INSTANCE REFERENCES');
console.log('─'.repeat(80));

const instances = [];
let instanceCount = 0;

multiCitationRefs.forEach(ref => {
    const parentRid = ref.id;
    const citations = ref.citations;

    console.log(`\n[${parentRid}] ${ref.bibInfo.slice(0, 60)}...`);
    console.log(`  Citations: ${citations.length}`);
    console.log(`  Creating ${citations.length - 1} instance(s)`);

    // First citation stays with parent (no instance created)
    console.log(`  ├─ Citation 1: Parent reference (finalized, unchanged)`);

    // Create instances for additional citations
    for (let i = 1; i < citations.length; i++) {
        const citation = citations[i];
        const instanceNumber = i;
        const instanceRid = `${parentRid}.${instanceNumber}`;

        // Generate instance-specific relevance text from context
        const relevanceText = generateRelevanceText(citation, ref);

        // Placeholder for secondary URL (will be searched in production)
        // For now, mark as needing search
        const secondaryUrl = `[SEARCH_NEEDED: ${citation.purpose.join('/')} context for ${ref.bibInfo.slice(0, 40)}]`;

        const instance = {
            reference_id: instanceRid,
            parent_rid: parentRid,
            instance_number: instanceNumber,
            is_instance: true,
            finalized: false,

            // Bibliographic info (same as parent)
            bibInfo: ref.bibInfo,

            // URLs
            primaryUrl: `[SAME_AS_PARENT:${parentRid}]`, // Will copy from parent in final output
            secondaryUrl: secondaryUrl, // Unique per instance

            // Instance-specific content
            relevance: relevanceText,
            manuscript_context: citation.context,
            context_purpose: citation.purpose.join(', '),

            // Metadata
            batch_version: 'v17.0',
            source: 'WEB_CREATED',
            created_from_citation: i + 1 // Which citation number this came from
        };

        instances.push(instance);
        instanceCount++;

        console.log(`  ├─ Citation ${i + 1}: Instance ${instanceRid} (unfinalized, needs secondary URL)`);
        console.log(`     └─ Purpose: ${instance.context_purpose}`);
    }
});

console.log(`\n✅ Generated ${instanceCount} instance references`);

// ===== INSTANCE CATEGORIZATION =====
console.log('\n📊 INSTANCE CATEGORIZATION');
console.log('─'.repeat(80));

const purposeCategories = {};
instances.forEach(inst => {
    const purposes = inst.context_purpose.split(', ');
    purposes.forEach(purpose => {
        if (!purposeCategories[purpose]) {
            purposeCategories[purpose] = 0;
        }
        purposeCategories[purpose]++;
    });
});

console.log('\nInstances by Purpose:');
Object.entries(purposeCategories)
    .sort((a, b) => b[1] - a[1])
    .forEach(([purpose, count]) => {
        const pct = (count/instanceCount*100).toFixed(1);
        console.log(`  ${purpose}: ${count} (${pct}%)`);
    });

// ===== SECONDARY URL SEARCH PLAN =====
console.log('\n\n🔍 SECONDARY URL SEARCH PLAN');
console.log('─'.repeat(80));

console.log(`
Search Requirements:
- Total instances needing secondary URLs: ${instanceCount}
- Each instance needs UNIQUE secondary URL
- Secondary must be different from:
  1. Parent reference secondary
  2. All sibling instance secondaries
  3. Should match instance context/purpose

Search Strategy:
For each instance:
  1. Extract key concepts from manuscript context
  2. Identify citation purpose (evidence/background/critique/comparison)
  3. Search for context-appropriate secondary sources:
     - Reviews if purpose includes 'critique' or 'comparison'
     - Scholarly discussions if 'theoretical' or 'evidence'
     - Background sources if 'background' or 'supporting_detail'
  4. Validate uniqueness within parent + siblings
  5. Score using Phase 2 quality framework

Estimated searches per instance: 3-5
Total estimated searches: ${instanceCount * 4} (conservative estimate)
`);

// ===== EXPORT RESULTS =====
const phase4Results = {
    summary: {
        multiCitationReferences: multiCitationRefs.length,
        instancesCreated: instanceCount,
        totalReferencesAfterExpansion: 288 + instanceCount
    },
    instances: instances,
    searchPlan: {
        instancesNeedingSecondaryUrls: instanceCount,
        estimatedSearchesPerInstance: 4,
        totalEstimatedSearches: instanceCount * 4,
        searchStrategy: 'Context-aware purpose-driven secondary URL discovery'
    },
    nextSteps: [
        'Use Web Search to find unique secondary URLs for each instance',
        'Validate uniqueness within parent + sibling instances',
        'Score using Phase 2 quality framework',
        'Generate PERFECTED_decisions.txt with parent + instance structure'
    ]
};

fs.writeFileSync('phase4_instances.json', JSON.stringify(phase4Results, null, 2));
console.log('\n✅ Saved instance data to phase4_instances.json');

// Sample output for verification
console.log('\n📄 SAMPLE INSTANCE REFERENCES (First 3)');
console.log('─'.repeat(80));
instances.slice(0, 3).forEach(inst => {
    console.log(`\n[${inst.reference_id}] *INSTANCE REFERENCE - REQUIRES REVIEW*`);
    console.log(`Parent RID: ${inst.parent_rid}`);
    console.log(`Bibliographic: ${inst.bibInfo.slice(0, 80)}...`);
    console.log(`Primary: ${inst.primaryUrl}`);
    console.log(`Secondary: ${inst.secondaryUrl}`);
    console.log(`Relevance: ${inst.relevance.slice(0, 150)}...`);
    console.log(`Context Purpose: ${inst.context_purpose}`);
    console.log(`Flags: finalized=${inst.finalized}, is_instance=${inst.is_instance}, source=${inst.source}`);
});

console.log('\n' + '='.repeat(80));
console.log('✅ PHASE 4 PARTIAL: Instance structure created, secondary URLs need searching');
console.log('='.repeat(80));

// ===== HELPER FUNCTIONS =====

function generateRelevanceText(citation, ref) {
    const context = citation.context;
    const purposes = citation.purpose;

    // Extract key sentences around the citation
    const sentences = context.split(/[.!?]+/).filter(s => s.trim().length > 20);

    // Find the sentence with the most context clues
    let relevantSentence = sentences[0] || context.slice(0, 200);

    // Build instance-specific relevance based on purpose
    if (purposes.includes('evidence')) {
        return `Provides empirical evidence: ${relevantSentence.trim()}. Used to support specific claims in this manuscript section.`;
    } else if (purposes.includes('critique')) {
        return `Critical analysis reference: ${relevantSentence.trim()}. Contrasts or critiques arguments presented in this section.`;
    } else if (purposes.includes('comparison')) {
        return `Comparative framework: ${relevantSentence.trim()}. Used to compare different approaches or perspectives.`;
    } else if (purposes.includes('background')) {
        return `Foundational background: ${relevantSentence.trim()}. Establishes theoretical or historical context for this section.`;
    } else if (purposes.includes('theoretical')) {
        return `Theoretical framework: ${relevantSentence.trim()}. Provides conceptual foundation for arguments in this section.`;
    } else if (purposes.includes('supporting_detail')) {
        return `Supporting detail: ${relevantSentence.trim()}. Illustrates or exemplifies concepts discussed in this section.`;
    } else {
        return `Reference context: ${relevantSentence.trim()}. ${purposes.join(', ')}`;
    }
}
