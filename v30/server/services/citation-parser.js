/**
 * Citation Parser for Reference Refinement v30.0
 * Converts various citation formats to standardized bracket notation [123]
 *
 * Handles:
 * - Superscript citations: ¹²³ → [123]
 * - Parenthetical citations: (Author, Year) → [X]
 * - Bracket citations: [123] → preserved as-is
 * - Empty brackets: [ ] → preserved for AI filling
 */

const mammoth = require('mammoth');
const fs = require('fs').promises;
const path = require('path');

// ============================================================================
// SUPERSCRIPT DIGIT MAPPINGS
// ============================================================================

const SUPERSCRIPT_MAP = {
    '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4',
    '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9'
};

const SUPERSCRIPT_PATTERN = /[⁰¹²³⁴⁵⁶⁷⁸⁹]+/g;

// ============================================================================
// MAIN PARSING FUNCTION
// ============================================================================

/**
 * Parse citations in a .docx document and convert to bracket notation
 *
 * @param {string} docxPath - Path to input .docx file
 * @param {object} options - Configuration options
 * @param {boolean} options.preserveOriginal - Keep original file (default: true)
 * @param {string} options.outputFormat - Output format: 'html', 'text', 'both' (default: 'both')
 * @param {boolean} options.extractContext - Include paragraph context for each citation (default: true)
 * @returns {Promise<object>} Results with stats, conversions, warnings, errors
 */
async function parseCitations(docxPath, options = {}) {
    const opts = {
        preserveOriginal: true,
        outputFormat: 'both',
        extractContext: true,
        ...options
    };

    const results = {
        success: false,
        inputFile: docxPath,
        outputFile: null,
        outputTextFile: null,
        stats: {
            citationsFound: 0,
            citationsConverted: 0,
            bibliographyEntries: 0,
            emptyBracketsFound: 0,
            formatDetected: 'unknown',
            paragraphsProcessed: 0
        },
        conversions: [],
        citationLocations: [],  // Detailed location info for database insertion
        warnings: [],
        errors: []
    };

    try {
        // Verify input file exists
        await fs.access(docxPath);

        console.log(`\n📖 Parsing document: ${path.basename(docxPath)}`);

        // ====================================================================
        // STEP 1: Extract document content
        // ====================================================================

        console.log('   Step 1: Extracting document content...');

        // Get raw text for pattern analysis
        const { value: rawText } = await mammoth.extractRawText({ path: docxPath });

        // Get HTML with paragraph structure
        const { value: html } = await mammoth.convertToHtml(
            { path: docxPath },
            {
                includeDefaultStyleMap: true,
                convertImage: mammoth.images.imgElement(function(image) {
                    return image.read("base64").then(function(imageBuffer) {
                        return {
                            src: "data:" + image.contentType + ";base64," + imageBuffer
                        };
                    });
                })
            }
        );

        // ====================================================================
        // STEP 2: Detect citation format
        // ====================================================================

        console.log('   Step 2: Detecting citation format...');
        const formatAnalysis = detectFormat(rawText);
        results.stats.formatDetected = formatAnalysis.primary;

        console.log(`   ✓ Format detected: ${formatAnalysis.primary}`);
        console.log(`     - Superscript: ${formatAnalysis.counts.superscript}`);
        console.log(`     - Parenthetical: ${formatAnalysis.counts.parenthetical}`);
        console.log(`     - Bracket: ${formatAnalysis.counts.bracket}`);
        console.log(`     - Empty: ${formatAnalysis.counts.empty}`);

        // ====================================================================
        // STEP 3: Extract bibliography
        // ====================================================================

        console.log('   Step 3: Extracting bibliography...');
        const bibliography = extractBibliography(rawText);
        results.stats.bibliographyEntries = bibliography.entries.length;

        if (bibliography.entries.length > 0) {
            console.log(`   ✓ Found ${bibliography.entries.length} bibliography entries`);
        } else {
            console.log(`   ⚠ No bibliography entries found`);
        }

        if (bibliography.warnings.length > 0) {
            results.warnings.push(...bibliography.warnings);
        }

        // ====================================================================
        // STEP 4: Split into paragraphs for context extraction
        // ====================================================================

        console.log('   Step 4: Splitting into paragraphs...');
        const paragraphs = splitIntoParagraphs(html, rawText);
        results.stats.paragraphsProcessed = paragraphs.length;
        console.log(`   ✓ Found ${paragraphs.length} paragraphs`);

        // ====================================================================
        // STEP 5: Convert citations paragraph by paragraph
        // ====================================================================

        console.log('   Step 5: Converting citations...');

        let convertedHtml = html;
        let convertedText = rawText;
        let totalConversions = 0;

        // Process superscript citations
        if (formatAnalysis.counts.superscript > 0) {
            console.log(`   - Converting ${formatAnalysis.counts.superscript} superscript citations...`);
            const superResult = convertSuperscript(convertedHtml, convertedText, paragraphs);
            convertedHtml = superResult.html;
            convertedText = superResult.text;
            results.conversions.push(...superResult.conversions);
            results.citationLocations.push(...superResult.locations);
            totalConversions += superResult.count;
        }

        // Process parenthetical citations
        if (formatAnalysis.counts.parenthetical > 0) {
            console.log(`   - Converting ${formatAnalysis.counts.parenthetical} parenthetical citations...`);
            const parentResult = convertParenthetical(convertedHtml, convertedText, bibliography, paragraphs);
            convertedHtml = parentResult.html;
            convertedText = parentResult.text;
            results.conversions.push(...parentResult.conversions);
            results.citationLocations.push(...parentResult.locations);
            totalConversions += parentResult.count;

            if (parentResult.warnings.length > 0) {
                results.warnings.push(...parentResult.warnings);
            }
        }

        // Count existing bracket citations (no conversion needed, but track them)
        const existingBrackets = findExistingBrackets(convertedText, paragraphs);
        results.citationLocations.push(...existingBrackets.locations);
        totalConversions += existingBrackets.count;

        // Count empty brackets (preserve these)
        results.stats.emptyBracketsFound = formatAnalysis.counts.empty;

        results.stats.citationsFound = totalConversions + results.stats.emptyBracketsFound;
        results.stats.citationsConverted = totalConversions;

        console.log(`   ✓ Converted ${totalConversions} citations`);

        // ====================================================================
        // STEP 6: Save output files
        // ====================================================================

        console.log('   Step 6: Saving output files...');

        const parsedPath = path.parse(docxPath);

        if (opts.outputFormat === 'html' || opts.outputFormat === 'both') {
            const outputHtmlPath = path.join(
                parsedPath.dir,
                `${parsedPath.name}_converted.html`
            );

            // Add some basic styling to the HTML output
            const styledHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${parsedPath.name} (Converted)</title>
    <style>
        body {
            font-family: Georgia, serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 40px auto;
            padding: 0 20px;
        }
        p { margin: 1em 0; }
        .citation {
            background-color: #ffffcc;
            padding: 2px 4px;
            border-radius: 3px;
        }
    </style>
</head>
<body>
${convertedHtml}
</body>
</html>`;

            await fs.writeFile(outputHtmlPath, styledHtml, 'utf8');
            results.outputFile = outputHtmlPath;
            console.log(`   ✓ Saved HTML: ${path.basename(outputHtmlPath)}`);
        }

        if (opts.outputFormat === 'text' || opts.outputFormat === 'both') {
            const outputTextPath = path.join(
                parsedPath.dir,
                `${parsedPath.name}_converted.txt`
            );
            await fs.writeFile(outputTextPath, convertedText, 'utf8');
            results.outputTextFile = outputTextPath;
            console.log(`   ✓ Saved text: ${path.basename(outputTextPath)}`);
        }

        // ====================================================================
        // STEP 7: Finalize results
        // ====================================================================

        results.success = true;

        console.log('\n✅ Parsing complete!');
        console.log(`   Citations found: ${results.stats.citationsFound}`);
        console.log(`   Citations converted: ${results.stats.citationsConverted}`);
        console.log(`   Bibliography entries: ${results.stats.bibliographyEntries}`);

        if (results.warnings.length > 0) {
            console.log(`\n⚠️  ${results.warnings.length} warning(s):`);
            results.warnings.forEach(w => console.log(`   - ${w}`));
        }

    } catch (error) {
        results.errors.push(`Failed to parse document: ${error.message}`);
        results.success = false;
        console.error(`\n❌ Error: ${error.message}`);
        console.error(error.stack);
    }

    return results;
}

// ============================================================================
// FORMAT DETECTION
// ============================================================================

/**
 * Detect the primary citation format(s) used in the document
 *
 * @param {string} text - Document text
 * @returns {object} Format analysis with counts and primary format
 */
function detectFormat(text) {
    const superscriptMatches = text.match(SUPERSCRIPT_PATTERN) || [];
    const parentheticalMatches = text.match(/\([A-Z][a-z]+(?:\s+(?:and|&)\s+[A-Z][a-z]+)?(?:\s+et\s+al\.)?,\s+\d{4}[a-z]?\)/g) || [];
    const bracketMatches = text.match(/\[(?![\s]*\])\d+\]/g) || [];  // Not empty brackets
    const emptyMatches = text.match(/\[\s*\]/g) || [];

    const counts = {
        superscript: superscriptMatches.length,
        parenthetical: parentheticalMatches.length,
        bracket: bracketMatches.length,
        empty: emptyMatches.length
    };

    let primary = 'none';
    const max = Math.max(counts.superscript, counts.parenthetical, counts.bracket);

    if (max === 0) {
        primary = 'none';
    } else if (counts.superscript === max) {
        primary = 'superscript';
    } else if (counts.parenthetical === max) {
        primary = 'parenthetical';
    } else if (counts.bracket === max) {
        primary = 'bracket';
    }

    // Check for mixed format
    const nonZeroCount = [counts.superscript, counts.parenthetical, counts.bracket].filter(c => c > 0).length;
    if (nonZeroCount > 1) {
        primary = 'mixed';
    }

    return { primary, counts };
}

// ============================================================================
// PARAGRAPH PROCESSING
// ============================================================================

/**
 * Split document into paragraphs with position tracking
 *
 * @param {string} html - HTML content
 * @param {string} text - Plain text content
 * @returns {Array} Array of paragraph objects
 */
function splitIntoParagraphs(html, text) {
    const paragraphs = [];

    // Split text by double newlines or by periods followed by newlines
    const textParas = text.split(/\n\n+|\n(?=[A-Z])/);

    let currentPosition = 0;
    let paraIndex = 0;

    for (const para of textParas) {
        const trimmed = para.trim();
        if (trimmed.length === 0) continue;

        paragraphs.push({
            index: paraIndex++,
            text: trimmed,
            startPos: currentPosition,
            endPos: currentPosition + trimmed.length,
            length: trimmed.length
        });

        currentPosition += para.length;
    }

    return paragraphs;
}

/**
 * Find which paragraph contains a given text position
 *
 * @param {number} position - Character position in text
 * @param {Array} paragraphs - Array of paragraph objects
 * @returns {object|null} Paragraph object or null
 */
function findParagraphAtPosition(position, paragraphs) {
    for (const para of paragraphs) {
        if (position >= para.startPos && position <= para.endPos) {
            return para;
        }
    }
    return null;
}

// ============================================================================
// SUPERSCRIPT CONVERSION
// ============================================================================

/**
 * Convert Unicode superscript digits to normal digits
 *
 * @param {string} superscriptStr - String with superscript digits
 * @returns {string} Normal digits
 */
function superscriptToNormal(superscriptStr) {
    let normal = '';
    for (const char of superscriptStr) {
        normal += SUPERSCRIPT_MAP[char] || char;
    }
    return normal;
}

/**
 * Convert superscript citations (¹²³) to bracket notation [123]
 *
 * @param {string} html - HTML content
 * @param {string} text - Plain text content
 * @param {Array} paragraphs - Paragraph objects
 * @returns {object} Conversion results
 */
function convertSuperscript(html, text, paragraphs) {
    const result = {
        html: html,
        text: text,
        count: 0,
        conversions: [],
        locations: []
    };

    // Find all superscript matches with positions
    const matches = [];
    let match;
    const regex = new RegExp(SUPERSCRIPT_PATTERN);

    while ((match = regex.exec(text)) !== null) {
        matches.push({
            original: match[0],
            position: match.index
        });
    }

    // Process matches in reverse order to maintain positions
    for (let i = matches.length - 1; i >= 0; i--) {
        const m = matches[i];
        const converted = superscriptToNormal(m.original);
        const replacement = `[${converted}]`;

        // Find context
        const para = findParagraphAtPosition(m.position, paragraphs);
        const context = para ? para.text : extractContext(text, m.position, 100);

        // Replace in text
        result.text = result.text.substring(0, m.position) +
                     replacement +
                     result.text.substring(m.position + m.original.length);

        // Replace in HTML
        result.html = result.html.replace(m.original, replacement);

        result.count++;

        result.conversions.push({
            original: m.original,
            converted: replacement,
            location: `Position ${m.position}`,
            paragraph: para ? para.index : -1
        });

        result.locations.push({
            citationNumber: parseInt(converted),
            originalFormat: m.original,
            convertedFormat: replacement,
            position: m.position,
            paragraphIndex: para ? para.index : -1,
            context: context
        });
    }

    // Also handle HTML <sup> tags with regular numbers
    const supTagPattern = /<sup>(\d+)<\/sup>/g;
    result.html = result.html.replace(supTagPattern, (match, number) => {
        return `[${number}]`;
    });

    return result;
}

// ============================================================================
// PARENTHETICAL CONVERSION
// ============================================================================

/**
 * Convert parenthetical citations (Author, Year) to bracket notation [X]
 *
 * @param {string} html - HTML content
 * @param {string} text - Plain text content
 * @param {object} bibliography - Bibliography data
 * @param {Array} paragraphs - Paragraph objects
 * @returns {object} Conversion results
 */
function convertParenthetical(html, text, bibliography, paragraphs) {
    const result = {
        html: html,
        text: text,
        count: 0,
        conversions: [],
        locations: [],
        warnings: []
    };

    // Pattern to match (Author, Year) or (Author et al., Year)
    // Also handles (Author & Author, Year) and (Author and Author, Year)
    const parentheticalPattern = /\(([A-Z][a-z]+(?:\s+(?:and|&)\s+[A-Z][a-z]+)?(?:\s+et\s+al\.)?,\s+(\d{4}[a-z]?))\)/g;

    const matches = [];
    let match;

    while ((match = parentheticalPattern.exec(text)) !== null) {
        matches.push({
            full: match[0],
            citation: match[1],
            index: match.index
        });
    }

    // Process matches in reverse order to maintain string positions
    for (let i = matches.length - 1; i >= 0; i--) {
        const m = matches[i];

        // Parse author and year from citation
        const authorYearMatch = m.citation.match(/^(.+),\s+(\d{4}[a-z]?)$/);
        if (!authorYearMatch) continue;

        const author = authorYearMatch[1];
        const year = authorYearMatch[2];

        // Try to find matching bibliography entry
        const bibEntry = findBibliographyEntry(author, year, bibliography);

        // Find context
        const para = findParagraphAtPosition(m.index, paragraphs);
        const context = para ? para.text : extractContext(text, m.index, 100);

        if (bibEntry) {
            const replacement = `[${bibEntry.number}]`;

            // Replace in text
            result.text = result.text.substring(0, m.index) +
                         replacement +
                         result.text.substring(m.index + m.full.length);

            // Replace in HTML
            result.html = result.html.replace(m.full, replacement);

            result.count++;

            result.conversions.push({
                original: m.full,
                converted: replacement,
                location: `Position ${m.index}`,
                paragraph: para ? para.index : -1
            });

            result.locations.push({
                citationNumber: bibEntry.number,
                originalFormat: m.full,
                convertedFormat: replacement,
                position: m.index,
                paragraphIndex: para ? para.index : -1,
                context: context
            });
        } else {
            result.warnings.push(
                `Could not find bibliography entry for "${m.citation}" at position ${m.index}`
            );
        }
    }

    return result;
}

// ============================================================================
// EXISTING BRACKET CITATIONS
// ============================================================================

/**
 * Find existing bracket citations [123] (no conversion needed, but track them)
 *
 * @param {string} text - Document text
 * @param {Array} paragraphs - Paragraph objects
 * @returns {object} Citation locations
 */
function findExistingBrackets(text, paragraphs) {
    const result = {
        count: 0,
        locations: []
    };

    const bracketPattern = /\[(\d+)\]/g;
    let match;

    while ((match = bracketPattern.exec(text)) !== null) {
        const citationNum = parseInt(match[1]);
        const position = match.index;

        const para = findParagraphAtPosition(position, paragraphs);
        const context = para ? para.text : extractContext(text, position, 100);

        result.count++;
        result.locations.push({
            citationNumber: citationNum,
            originalFormat: match[0],
            convertedFormat: match[0],  // Same
            position: position,
            paragraphIndex: para ? para.index : -1,
            context: context
        });
    }

    return result;
}

// ============================================================================
// BIBLIOGRAPHY EXTRACTION
// ============================================================================

/**
 * Extract and parse bibliography section from document
 *
 * @param {string} text - Document text
 * @returns {object} Bibliography entries and warnings
 */
function extractBibliography(text) {
    const result = {
        entries: [],
        warnings: []
    };

    // Find bibliography section (common headers)
    const bibHeaders = [
        /^References\s*$/mi,
        /^Bibliography\s*$/mi,
        /^Works Cited\s*$/mi,
        /^Literature Cited\s*$/mi,
        /^Sources\s*$/mi
    ];

    let bibStart = -1;
    let headerFound = '';

    for (const pattern of bibHeaders) {
        const match = pattern.exec(text);
        if (match) {
            bibStart = match.index + match[0].length;
            headerFound = match[0].trim();
            break;
        }
    }

    if (bibStart === -1) {
        result.warnings.push('Could not locate bibliography section (tried: References, Bibliography, Works Cited, Literature Cited, Sources)');
        return result;
    }

    console.log(`     Found bibliography section: "${headerFound}"`);

    // Extract bibliography text (from header to end of document)
    const bibText = text.substring(bibStart).trim();

    // Parse bibliography entries
    // Common formats:
    // 1. Author, A. (Year). Title...
    // [1] Author, A. (Year). Title...
    // 1 Author, A. (Year). Title...

    const lines = bibText.split('\n');
    let currentEntry = '';
    let entryNumber = 0;

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) {
            // Empty line might signal end of current entry
            if (currentEntry && entryNumber > 0) {
                result.entries.push({
                    number: entryNumber,
                    text: currentEntry.trim()
                });
                currentEntry = '';
                entryNumber = 0;
            }
            continue;
        }

        // Check if line starts with a number or [number]
        const numberMatch = trimmed.match(/^(?:\[)?(\d+)(?:\])?[\.\s)]/);

        if (numberMatch) {
            // Save previous entry if exists
            if (currentEntry && entryNumber > 0) {
                result.entries.push({
                    number: entryNumber,
                    text: currentEntry.trim()
                });
            }

            // Start new entry
            entryNumber = parseInt(numberMatch[1]);
            currentEntry = trimmed.substring(numberMatch[0].length).trim();
        } else {
            // Continuation of current entry OR start of unnumbered entry
            if (currentEntry) {
                currentEntry += ' ' + trimmed;
            } else {
                // Check if this looks like a bibliography entry (has author-year pattern)
                if (/^[A-Z][a-z]+.*\(?\d{4}\)?/.test(trimmed)) {
                    entryNumber = result.entries.length + 1;
                    currentEntry = trimmed;
                }
            }
        }
    }

    // Save last entry
    if (currentEntry && entryNumber > 0) {
        result.entries.push({
            number: entryNumber,
            text: currentEntry.trim()
        });
    }

    if (result.entries.length === 0) {
        result.warnings.push('Could not parse any bibliography entries from bibliography section');
    }

    return result;
}

/**
 * Find bibliography entry matching author and year
 *
 * @param {string} author - Author name (may include "et al.")
 * @param {string} year - Publication year
 * @param {object} bibliography - Bibliography data
 * @returns {object|null} Matching entry or null
 */
function findBibliographyEntry(author, year, bibliography) {
    // Clean author name (remove "et al.", "and", "&")
    const cleanAuthor = author
        .replace(/\s+et\s+al\./i, '')
        .replace(/\s+and\s+/i, ' ')
        .replace(/\s+&\s+/i, ' ')
        .trim()
        .split(/\s+/)[0];  // Get first author's last name

    for (const entry of bibliography.entries) {
        const entryLower = entry.text.toLowerCase();
        const authorLower = cleanAuthor.toLowerCase();

        // Check if entry starts with the author name (most reliable)
        const startsWithAuthor = entryLower.startsWith(authorLower);

        // Check if entry contains the author name anywhere
        const containsAuthor = entryLower.includes(authorLower);

        // Check if entry contains the year
        const containsYear = entry.text.includes(year);

        // Prioritize entries that start with author name and have year
        if (startsWithAuthor && containsYear) {
            return entry;
        }

        // Fallback: contains author and year
        if (containsAuthor && containsYear) {
            return entry;
        }
    }

    return null;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Extract context around a position in text
 *
 * @param {string} text - Full text
 * @param {number} position - Position to extract around
 * @param {number} radius - Characters before and after
 * @returns {string} Context string
 */
function extractContext(text, position, radius = 100) {
    const start = Math.max(0, position - radius);
    const end = Math.min(text.length, position + radius);

    let context = text.substring(start, end);

    // Add ellipsis if truncated
    if (start > 0) context = '...' + context;
    if (end < text.length) context = context + '...';

    return context.trim();
}

/**
 * Update document with conversions (placeholder for future .docx writing)
 *
 * NOTE: This is a placeholder. Full .docx writing requires additional libraries:
 * - Option 1: 'docx' package (https://www.npmjs.com/package/docx)
 * - Option 2: 'docxtemplater' (https://www.npmjs.com/package/docxtemplater)
 * - Option 3: Direct XML manipulation with JSZip
 *
 * For now, the module outputs HTML and TXT which can be imported back to Word.
 *
 * @param {string} inputPath - Input .docx path
 * @param {Array} conversions - Array of conversion objects
 * @param {string} outputPath - Output .docx path
 * @throws {Error} Not yet implemented
 */
async function updateDocument(inputPath, conversions, outputPath) {
    throw new Error(
        'Direct .docx writing not yet implemented. ' +
        'Use HTML/TXT output for now, or install a .docx writing library.'
    );
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
    // Main function
    parseCitations,

    // Core functions
    detectFormat,
    convertSuperscript,
    convertParenthetical,
    extractBibliography,
    updateDocument,

    // Helper functions (useful for testing)
    superscriptToNormal,
    findBibliographyEntry,
    splitIntoParagraphs,
    findParagraphAtPosition,
    extractContext
};
