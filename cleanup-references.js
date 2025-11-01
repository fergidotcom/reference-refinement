import fs from 'fs';

console.log('='.repeat(80));
console.log('CAUGHT IN THE ACT - REFERENCE CLEANUP SCRIPT');
console.log('='.repeat(80));
console.log('');

// Read the original file
const content = fs.readFileSync('250904 Caught In The Act - REFERENCES ONLY.txt', 'utf-8');
const lines = content.split('\n');

const references = [];
let cleanedCount = 0;
let urlsExtracted = 0;

// Process each line
for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Check if this is a reference line
    const match = line.match(/^\[(\d+)\]/);
    if (!match) continue;

    const rid = match[1];

    // CRITICAL FIX: Remove the [ID] prefix from the line before processing
    let text = line.substring(match[0].length).trim();

    // Extract and collect information
    const ref = {
        id: rid,
        original: line,
        biblio: '',
        relevance: '',
        primaryURL: '',
        secondaryURL: '',
        tertiaryURL: '',
        flags: []
    };

    // Extract URLs (try multiple formats)
    // Format 1: "Primary URL: https://..." or "Primary URL:https://..."
    const primaryMatch1 = text.match(/Primary URL:\s*(https?:\/\/[^\s\[]+)/i);
    if (primaryMatch1) {
        ref.primaryURL = primaryMatch1[1];
        text = text.replace(/Primary URL:\s*https?:\/\/[^\s\[]+/gi, '').trim();
        urlsExtracted++;
    }

    // Format 2: "PRIMARY_URL[...]"
    const primaryMatch2 = text.match(/PRIMARY_URL\[(https?:\/\/[^\]]+)\]/);
    if (primaryMatch2) {
        ref.primaryURL = primaryMatch2[1];
        text = text.replace(/PRIMARY_URL\[[^\]]+\]/g, '').trim();
        urlsExtracted++;
    }

    // Extract Secondary URL
    // Format 1: "Secondary URL: https://..." or "Secondary: https://..."
    const secondaryMatch1 = text.match(/Secondary(?:\s+URL)?:\s*(https?:\/\/[^\s\[]+)/i);
    if (secondaryMatch1) {
        ref.secondaryURL = secondaryMatch1[1];
        text = text.replace(/Secondary(?:\s+URL)?:\s*https?:\/\/[^\s\[]+/gi, '').trim();
        urlsExtracted++;
    }

    const secondaryMatch2 = text.match(/SECONDARY_URL\[(https?:\/\/[^\]]+)\]/);
    if (secondaryMatch2 && !ref.secondaryURL) {
        ref.secondaryURL = secondaryMatch2[1];
        text = text.replace(/SECONDARY_URL\[[^\]]+\]/g, '').trim();
        urlsExtracted++;
    }

    // Remove "Secondary: [NO SECONDARY AVAILABLE]" type annotations
    text = text.replace(/Secondary(?:\s+URL)?:\s*\[NO\s+SECONDARY[^\]]*\]/gi, '').trim();

    // Extract embedded URLs (URLs after publisher info, before relevance)
    // Look for URLs that aren't labeled but appear in the text
    const embeddedURLs = text.match(/https?:\/\/[^\s\[\]]+/g);
    if (embeddedURLs && embeddedURLs.length > 0) {
        if (!ref.primaryURL) {
            ref.primaryURL = embeddedURLs[0];
            urlsExtracted++;
        }
        if (embeddedURLs.length > 1 && !ref.secondaryURL) {
            ref.secondaryURL = embeddedURLs[1];
            urlsExtracted++;
        }
        // Remove all embedded URLs from text
        text = text.replace(/https?:\/\/[^\s\[\]]+/g, '').trim();
    }

    // Extract FLAGS
    const flagMatches = text.match(/\[(VERIFIED|SEMINAL WORK|AMAZON|WORLDCAT|OXFORD|PENGUIN|MIT NEWS|SAGE DOI|OPEN ACCESS DOI|NYU PRESS DOI|HEWLETT|SELC|SHORENSTEIN CENTER|CAMBRIDGE DOI|ANNUAL REVIEWS|NATURE|FULL TEXT|PUBMED ABSTRACT|PUBMED|SAGE|DOI|PDF|FIRESIDE CHAT TRANSCRIPT|SCHOLARLY REVIEW|ACADEMIC SUMMARY|INVESTMENT ANALYSIS|COMMUNITY IMPACT|CRITICAL REVIEW|JOURNAL ARTICLE|ARXIV ABSTRACT|GOOGLE BOOKS PREVIEW|GOOGLE BOOKS|CAMBRIDGE CORE|PRINCETON ABSTRACT|SHORENSTEIN CENTER)\]/gi);
    if (flagMatches) {
        ref.flags = flagMatches.map(f => f.replace(/[\[\]]/g, ''));
        // Remove flags from text
        text = text.replace(/\[(VERIFIED|SEMINAL WORK|AMAZON|WORLDCAT|OXFORD|PENGUIN|MIT NEWS|SAGE DOI|OPEN ACCESS DOI|NYU PRESS DOI|HEWLETT|SELC|SHORENSTEIN CENTER|CAMBRIDGE DOI|ANNUAL REVIEWS|NATURE|FULL TEXT|PUBMED ABSTRACT|PUBMED|SAGE|DOI|PDF|FIRESIDE CHAT TRANSCRIPT|SCHOLARLY REVIEW|ACADEMIC SUMMARY|INVESTMENT ANALYSIS|COMMUNITY IMPACT|CRITICAL REVIEW|JOURNAL ARTICLE|ARXIV ABSTRACT|GOOGLE BOOKS PREVIEW|GOOGLE BOOKS|CAMBRIDGE CORE|PRINCETON ABSTRACT|SHORENSTEIN CENTER)\]/gi, '').trim();
    }

    // Extract Relevance text
    let relevanceMatch = text.match(/Relevance:\s*(.+)$/i);
    if (relevanceMatch) {
        ref.relevance = relevanceMatch[1].trim();
        text = text.replace(/Relevance:.+$/i, '').trim();
    } else {
        // IMPROVED: Try to extract relevance text that's not labeled
        // Look for descriptive text that appears after the bibliographic citation
        // Strategy: Find the LAST occurrence of bibliographic markers, then take everything after

        // Define patterns that typically mark the end of a citation
        const biblioMarkers = [
            /ISBN[:\s]+[\d\-X]+\.?\s+/i,
            /DOI[:\s]+[\d\.\/]+\.?\s+/i,
            /(?:Press|Publications?|University|Institute|Foundation)\.\s+/i,
            /pp?\.\s*\d+[\-–]\d+\.\s+/i,
            // Pattern for "Location: Publisher." format (e.g., "Garden City, NY: Doubleday.")
            /[A-Z][a-z]+(?:,\s+[A-Z]{2,})?\s*:\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\.\s+/
        ];

        let splitPoint = -1;
        let biblioEnd = '';

        // Find the LAST occurrence of any biblio marker
        for (const pattern of biblioMarkers) {
            const match = text.match(pattern);
            if (match) {
                const pos = text.indexOf(match[0]);
                if (pos > splitPoint) {
                    splitPoint = pos + match[0].length;
                    biblioEnd = match[0];
                }
            }
        }

        // If we found a split point and there's substantial text after it
        if (splitPoint > 0 && splitPoint < text.length) {
            const potentialRelevance = text.substring(splitPoint).trim();

            // If the text is substantial (>40 chars) and looks like prose, treat as relevance
            if (potentialRelevance.length > 40 && !potentialRelevance.match(/^https?:/)) {
                ref.relevance = potentialRelevance;
                text = text.substring(0, splitPoint).trim();
            }
        }
    }

    // What's left is bibliographic info
    ref.biblio = text.trim();

    // Clean up extra spaces and whitespace
    ref.biblio = ref.biblio.replace(/\s+/g, ' ').trim();
    ref.relevance = ref.relevance.replace(/\s+/g, ' ').trim();

    references.push(ref);
    cleanedCount++;
}

console.log(`Processed ${cleanedCount} references`);
console.log(`Extracted ${urlsExtracted} URLs`);
console.log('');

// Generate INTERMEDIATE clean file (no URLs, no FLAGS)
console.log('Generating intermediate clean file...');
let intermediateContent = '';
for (const ref of references) {
    intermediateContent += `[${ref.id}] ${ref.biblio}`;
    if (ref.relevance) {
        intermediateContent += ` Relevance: ${ref.relevance}`;
    }
    intermediateContent += '\n';
}
fs.writeFileSync('caught_in_the_act_CLEAN_intermediate.txt', intermediateContent);
console.log('✅ Created: caught_in_the_act_CLEAN_intermediate.txt');
console.log('');

// Generate PRODUCTION decisions.txt file
console.log('Generating production decisions.txt file...');
let productionContent = '';
let withPrimary = 0;
let withSecondary = 0;
let withRelevance = 0;

for (const ref of references) {
    // FIXED: Output format with single [ID] prefix
    productionContent += `[${ref.id}] ${ref.biblio}`;

    if (ref.relevance) {
        productionContent += ` Relevance: ${ref.relevance}`;
        withRelevance++;
    }

    // Add FLAGS[FINALIZED] to all
    productionContent += ` FLAGS[FINALIZED]`;

    if (ref.primaryURL) {
        productionContent += ` PRIMARY_URL[${ref.primaryURL}]`;
        withPrimary++;
    }

    if (ref.secondaryURL) {
        productionContent += ` SECONDARY_URL[${ref.secondaryURL}]`;
        withSecondary++;
    }

    productionContent += '\n';
}

fs.writeFileSync('caught_in_the_act_decisions.txt', productionContent);
console.log('✅ Created: caught_in_the_act_decisions.txt');
console.log('');

// Generate stats
console.log('PRODUCTION FILE STATISTICS');
console.log('-'.repeat(80));
console.log(`Total References: ${references.length}`);
console.log(`With Relevance Text: ${withRelevance} (${(withRelevance/references.length*100).toFixed(1)}%)`);
console.log(`With Primary URL: ${withPrimary} (${(withPrimary/references.length*100).toFixed(1)}%)`);
console.log(`With Secondary URL: ${withSecondary} (${(withSecondary/references.length*100).toFixed(1)}%)`);
console.log(`All Marked as Finalized: ${references.length} (100%)`);
console.log('');

// Sample output
console.log('SAMPLE OUTPUT (First 3 references from production file):');
console.log('-'.repeat(80));
const sampleLines = productionContent.split('\n').slice(0, 3);
sampleLines.forEach((line, idx) => {
    console.log(`${line.substring(0, 200)}${line.length > 200 ? '...' : ''}`);
});
console.log('');

console.log('='.repeat(80));
console.log('CLEANUP COMPLETE!');
console.log('='.repeat(80));
console.log('');
console.log('Next steps:');
console.log('1. Review: caught_in_the_act_CLEAN_intermediate.txt (no URLs/FLAGS)');
console.log('2. Test load: caught_in_the_act_decisions.txt in v15.2 iPad app');
console.log('3. Check parser success rate in browser console');
console.log('4. Iterate if needed');
console.log('');
