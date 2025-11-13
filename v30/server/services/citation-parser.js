/**
 * Citation Parser - Component 1 of Phase 1
 *
 * Detects and converts various citation formats to standardized bracket notation [123]
 *
 * Supported formats:
 * - Superscript: ¹²³ → [123]
 * - Parenthetical: (Author, Year) → [X]
 * - Bracket notation: [123] (already standard)
 * - Empty brackets: [ ] (preserved for later)
 */

const mammoth = require('mammoth');
const fs = require('fs').promises;
const path = require('path');

/**
 * Main function to parse and convert citations in a Word document
 *
 * @param {string} docxPath - Path to the input .docx file
 * @param {object} options - Configuration options
 * @param {boolean} options.overwrite - Whether to overwrite original file (default: false)
 * @param {string} options.outputPath - Custom output path (optional)
 * @returns {Promise<object>} - Detailed results object
 */
async function parseCitations(docxPath, options = {}) {
    const results = {
        success: false,
        inputFile: docxPath,
        outputFile: null,
        stats: {
            citationsFound: 0,
            citationsConverted: 0,
            bibliographyEntries: 0,
            emptyBracketsFound: 0,
            formatDetected: 'unknown'
        },
        conversions: [],
        warnings: [],
        errors: []
    };

    try {
        // Read the document
        const buffer = await fs.readFile(docxPath);
        const result = await mammoth.extractRawText({ buffer });
        const text = result.value;

        // Detect citation format
        const format = detectFormat(text);
        results.stats.formatDetected = format;

        // Extract bibliography section
        const bibliography = extractBibliography(text);
        results.stats.bibliographyEntries = bibliography.length;

        if (bibliography.length === 0) {
            results.warnings.push('No bibliography section found in document');
        }

        // Process citations based on format
        let processedText = text;
        let conversions = [];

        if (format === 'superscript' || format === 'mixed') {
            const superscriptResult = convertSuperscript(processedText);
            processedText = superscriptResult.text;
            conversions = conversions.concat(superscriptResult.conversions);
        }

        if (format === 'parenthetical' || format === 'mixed') {
            const parentheticalResult = convertParenthetical(processedText, bibliography);
            processedText = parentheticalResult.text;
            conversions = conversions.concat(parentheticalResult.conversions);
        }

        // Count empty brackets
        const emptyBracketMatches = processedText.match(/\[\s*\]/g);
        results.stats.emptyBracketsFound = emptyBracketMatches ? emptyBracketMatches.length : 0;

        // Count all bracket citations (including converted ones)
        const bracketMatches = processedText.match(/\[\d+\]/g);
        results.stats.citationsFound = bracketMatches ? bracketMatches.length : 0;
        results.stats.citationsConverted = conversions.length;

        results.conversions = conversions;

        // Determine output path
        const outputPath = options.outputPath ||
            (options.overwrite ? docxPath :
                path.join(path.dirname(docxPath),
                    path.basename(docxPath, '.docx') + '_converted.docx'));

        // Note: Actual .docx modification requires additional library
        // For now, we save the converted text and provide instructions
        const textOutputPath = outputPath.replace('.docx', '_converted.txt');
        await fs.writeFile(textOutputPath, processedText, 'utf-8');

        results.outputFile = textOutputPath;
        results.success = true;
        results.warnings.push('Note: Output is in .txt format. .docx conversion requires docx library.');

    } catch (error) {
        results.success = false;
        results.errors.push(`Failed to process document: ${error.message}`);
    }

    return results;
}

/**
 * Detect the citation format used in the document
 *
 * @param {string} text - Document text
 * @returns {string} - Format type: 'superscript', 'parenthetical', 'bracket', 'mixed', or 'unknown'
 */
function detectFormat(text) {
    const hasSuperscript = /[⁰¹²³⁴⁵⁶⁷⁸⁹]+/.test(text);
    const hasParenthetical = /\([A-Z][a-z]+(?:\s+et al\.)?,\s+\d{4}\)/.test(text);
    const hasBrackets = /\[\d+\]/.test(text);

    const formatCount = [hasSuperscript, hasParenthetical, hasBrackets].filter(Boolean).length;

    if (formatCount > 1) return 'mixed';
    if (hasSuperscript) return 'superscript';
    if (hasParenthetical) return 'parenthetical';
    if (hasBrackets) return 'bracket';
    return 'unknown';
}

/**
 * Convert superscript citations to bracket notation
 *
 * @param {string} text - Document text
 * @returns {object} - { text: converted text, conversions: array of conversion records }
 */
function convertSuperscript(text) {
    const conversions = [];

    // Map of superscript digits to regular digits
    const superscriptMap = {
        '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4',
        '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9'
    };

    // Find all superscript sequences
    const regex = /[⁰¹²³⁴⁵⁶⁷⁸⁹]+/g;
    let match;
    const matches = [];

    while ((match = regex.exec(text)) !== null) {
        matches.push({
            original: match[0],
            index: match.index
        });
    }

    // Process in reverse order to maintain correct indices
    let convertedText = text;
    for (let i = matches.length - 1; i >= 0; i--) {
        const { original, index } = matches[i];

        // Convert superscript to regular digits
        let digits = '';
        for (const char of original) {
            digits += superscriptMap[char] || '';
        }

        const converted = `[${digits}]`;
        convertedText = convertedText.substring(0, index) + converted + convertedText.substring(index + original.length);

        conversions.push({
            original,
            converted,
            location: `position ${index}`
        });
    }

    return { text: convertedText, conversions };
}

/**
 * Convert parenthetical citations to bracket notation
 *
 * @param {string} text - Document text
 * @param {array} bibliography - Array of bibliography entries
 * @returns {object} - { text: converted text, conversions: array of conversion records }
 */
function convertParenthetical(text, bibliography) {
    const conversions = [];

    // Create mapping from (Author, Year) to bibliography index
    const authorYearMap = new Map();
    bibliography.forEach((entry, index) => {
        const refNum = index + 1;

        // Extract author and year from entry
        const authorMatch = entry.match(/^([A-Z][a-z]+(?:\s+[A-Z]\.)?(?:\s+et al\.)?)/);
        const yearMatch = entry.match(/\((\d{4})\)/);

        if (authorMatch && yearMatch) {
            const author = authorMatch[1].trim();
            const year = yearMatch[1];
            const key = `${author}, ${year}`;
            authorYearMap.set(key, refNum);
        }
    });

    // Find and replace parenthetical citations
    const regex = /\(([A-Z][a-z]+(?:\s+et al\.)?,\s+\d{4})\)/g;
    let match;
    const matches = [];

    while ((match = regex.exec(text)) !== null) {
        matches.push({
            original: match[0],
            citation: match[1],
            index: match.index
        });
    }

    // Process in reverse order
    let convertedText = text;
    for (let i = matches.length - 1; i >= 0; i--) {
        const { original, citation, index } = matches[i];

        const refNum = authorYearMap.get(citation);
        if (refNum) {
            const converted = `[${refNum}]`;
            convertedText = convertedText.substring(0, index) + converted + convertedText.substring(index + original.length);

            conversions.push({
                original,
                converted,
                location: `position ${index}`
            });
        }
    }

    return { text: convertedText, conversions };
}

/**
 * Extract bibliography section from document
 *
 * @param {string} text - Document text
 * @returns {array} - Array of bibliography entries
 */
function extractBibliography(text) {
    const entries = [];

    // Find bibliography section (look for common headers)
    const bibHeaders = [
        /\n\s*References\s*\n/i,
        /\n\s*Bibliography\s*\n/i,
        /\n\s*Works Cited\s*\n/i,
        /\n\s*Literature Cited\s*\n/i
    ];

    let bibStartIndex = -1;
    for (const header of bibHeaders) {
        const match = text.match(header);
        if (match) {
            bibStartIndex = match.index + match[0].length;
            break;
        }
    }

    if (bibStartIndex === -1) {
        return entries; // No bibliography found
    }

    // Extract bibliography text
    const bibText = text.substring(bibStartIndex);

    // Parse entries (simple approach: split by double newlines or numbered entries)
    const lines = bibText.split('\n');
    let currentEntry = '';

    for (const line of lines) {
        const trimmedLine = line.trim();

        // Check if this is a new entry (starts with number)
        if (/^\d+\.\s/.test(trimmedLine) || /^\[\d+\]\s/.test(trimmedLine)) {
            if (currentEntry) {
                entries.push(currentEntry.trim());
            }
            currentEntry = trimmedLine;
        } else if (trimmedLine.length > 0) {
            currentEntry += ' ' + trimmedLine;
        } else if (currentEntry.length > 0) {
            // Empty line - end of entry
            entries.push(currentEntry.trim());
            currentEntry = '';
        }
    }

    // Add final entry
    if (currentEntry) {
        entries.push(currentEntry.trim());
    }

    return entries;
}

/**
 * Update a Word document with converted citations
 * (Placeholder - requires docx library for actual implementation)
 *
 * @param {string} inputPath - Path to input .docx
 * @param {string} outputPath - Path to output .docx
 * @param {string} convertedText - Text with converted citations
 * @returns {Promise<void>}
 */
async function updateDocument(inputPath, outputPath, convertedText) {
    // This is a placeholder. Actual implementation would require:
    // 1. Using 'docx' library to parse the .docx structure
    // 2. Preserving all formatting (bold, italic, headings, tables)
    // 3. Replacing only citation text while maintaining styles
    // 4. Writing back to .docx format

    throw new Error('updateDocument not yet implemented - requires docx library');
}

// Export all functions
module.exports = {
    parseCitations,
    detectFormat,
    convertSuperscript,
    convertParenthetical,
    extractBibliography,
    updateDocument
};

// Example usage
if (require.main === module) {
    const testFile = process.argv[2];
    if (!testFile) {
        console.log('Usage: node citation-parser.js <path-to-docx>');
        process.exit(1);
    }

    parseCitations(testFile)
        .then(results => {
            console.log('\n=== Citation Parser Results ===\n');
            console.log(`Input: ${results.inputFile}`);
            console.log(`Output: ${results.outputFile}`);
            console.log(`Success: ${results.success}`);
            console.log('\nStats:');
            console.log(`  Format: ${results.stats.formatDetected}`);
            console.log(`  Citations found: ${results.stats.citationsFound}`);
            console.log(`  Citations converted: ${results.stats.citationsConverted}`);
            console.log(`  Bibliography entries: ${results.stats.bibliographyEntries}`);
            console.log(`  Empty brackets: ${results.stats.emptyBracketsFound}`);

            if (results.conversions.length > 0) {
                console.log('\nConversions:');
                results.conversions.slice(0, 10).forEach(conv => {
                    console.log(`  ${conv.original} → ${conv.converted} (${conv.location})`);
                });
                if (results.conversions.length > 10) {
                    console.log(`  ... and ${results.conversions.length - 10} more`);
                }
            }

            if (results.warnings.length > 0) {
                console.log('\nWarnings:');
                results.warnings.forEach(w => console.log(`  - ${w}`));
            }

            if (results.errors.length > 0) {
                console.log('\nErrors:');
                results.errors.forEach(e => console.log(`  - ${e}`));
            }
        })
        .catch(error => {
            console.error('Fatal error:', error.message);
            process.exit(1);
        });
}
