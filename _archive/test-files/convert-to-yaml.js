#!/usr/bin/env node
/**
 * Convert decisions.txt from multi-line format to YAML format
 * Usage: node convert-to-yaml.js CaughtInTheActGeneratedDecisions.txt
 */

const fs = require('fs');
const yaml = require('js-yaml');

if (process.argv.length < 3) {
    console.error('Usage: node convert-to-yaml.js <input-file>');
    process.exit(1);
}

const inputFile = process.argv[2];
const outputFile = inputFile.replace(/\.txt$/, '.yaml');

console.log(`Converting ${inputFile} to ${outputFile}...`);

// Read the input file
const content = fs.readFileSync(inputFile, 'utf-8');

// Parse the multi-line format (same logic as in index.html)
const references = [];
const lines = content.split('\n');
let currentRef = null;
let capturingContext = false;
let capturingRelevance = false;
let contextLines = [];
let relevanceParagraphs = [];

for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    // Reference ID line
    if (trimmed.match(/^\[[\dC\-\.]+\]/)) {
        // Save previous reference
        if (currentRef) {
            if (capturingRelevance && relevanceParagraphs.length > 0) {
                currentRef.relevance = relevanceParagraphs.join('\n\n');
            }
            if (capturingContext && contextLines.length > 0) {
                currentRef.context = contextLines.join('\n');
            }
            references.push(currentRef);
        }

        // Reset state
        capturingContext = false;
        capturingRelevance = false;
        contextLines = [];
        relevanceParagraphs = [];

        // Create new reference
        const idMatch = trimmed.match(/^\[([\dC\-\.]+)\]/);
        currentRef = {
            id: idMatch[1],
            citation: trimmed,
            finalized: false,
            context: null,
            relevance: null,
            flags: [],
            urls: {
                primary: null,
                secondary: null,
                tertiary: null
            },
            queries: []
        };
    }
    // Context markers
    else if (trimmed === '[CONTEXT_START]' && currentRef) {
        capturingContext = true;
        contextLines = [];
    }
    else if (trimmed === '[CONTEXT_END]' && currentRef) {
        capturingContext = false;
        if (contextLines.length > 0) {
            currentRef.context = contextLines.join('\n');
        }
    }
    // FINALIZED flag
    else if (trimmed === '[FINALIZED]' && currentRef) {
        currentRef.finalized = true;
    }
    // Relevance text start
    else if (trimmed.startsWith('Relevance:') && currentRef) {
        const relevanceText = trimmed.replace('Relevance:', '').trim();
        if (!['high', 'medium', 'low', 'remove', 'unknown'].includes(relevanceText.toLowerCase())) {
            capturingRelevance = true;
            relevanceParagraphs = [relevanceText];
        }
    }
    // FLAGS line
    else if (trimmed.startsWith('FLAGS[') && currentRef) {
        if (capturingRelevance && relevanceParagraphs.length > 0) {
            currentRef.relevance = relevanceParagraphs.join('\n\n');
            capturingRelevance = false;
            relevanceParagraphs = [];
        }
        // Extract flags
        const flagMatch = trimmed.match(/FLAGS\[(.*?)\]/);
        if (flagMatch && flagMatch[1]) {
            currentRef.flags = flagMatch[1].split(',').map(f => f.trim()).filter(f => f);
        }
    }
    // URL lines
    else if (trimmed.startsWith('Primary URL:') && currentRef) {
        if (capturingRelevance && relevanceParagraphs.length > 0) {
            currentRef.relevance = relevanceParagraphs.join('\n\n');
            capturingRelevance = false;
            relevanceParagraphs = [];
        }
        currentRef.urls.primary = trimmed.replace('Primary URL:', '').trim() || null;
    }
    else if (trimmed.startsWith('Secondary URL:') && currentRef) {
        currentRef.urls.secondary = trimmed.replace('Secondary URL:', '').trim() || null;
    }
    else if (trimmed.startsWith('Tertiary URL:') && currentRef) {
        currentRef.urls.tertiary = trimmed.replace('Tertiary URL:', '').trim() || null;
    }
    // Query lines
    else if (trimmed.startsWith('Q:') && currentRef) {
        if (capturingRelevance && relevanceParagraphs.length > 0) {
            currentRef.relevance = relevanceParagraphs.join('\n\n');
            capturingRelevance = false;
            relevanceParagraphs = [];
        }
        currentRef.queries.push(trimmed.substring(2).trim());
    }
    // Continue capturing context
    else if (capturingContext && trimmed.length > 0) {
        contextLines.push(trimmed);
    }
    // Continue capturing relevance
    else if (capturingRelevance && trimmed.length > 0) {
        relevanceParagraphs.push(trimmed);
    }
}

// Save last reference
if (currentRef) {
    if (capturingRelevance && relevanceParagraphs.length > 0) {
        currentRef.relevance = relevanceParagraphs.join('\n\n');
    }
    if (capturingContext && contextLines.length > 0) {
        currentRef.context = contextLines.join('\n');
    }
    references.push(currentRef);
}

console.log(`Parsed ${references.length} references`);

// Generate YAML
const yamlData = {
    references: references
};

const yamlContent = yaml.dump(yamlData, {
    indent: 2,
    lineWidth: -1,  // No line wrapping
    noRefs: true,   // Don't use YAML references
    sortKeys: false  // Preserve field order
});

// Write output
fs.writeFileSync(outputFile, yamlContent, 'utf-8');

console.log(`✅ Conversion complete!`);
console.log(`   Input:  ${inputFile} (${content.length} bytes)`);
console.log(`   Output: ${outputFile} (${yamlContent.length} bytes)`);
console.log(`   References: ${references.length}`);
