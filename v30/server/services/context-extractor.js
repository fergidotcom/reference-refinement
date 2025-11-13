/**
 * Context Extractor - Component 2 of Phase 1
 *
 * Extracts paragraph context and metadata for each citation in a document
 *
 * Provides:
 * - Full paragraph containing the citation
 * - Section/heading information
 * - Citation position within document
 * - Surrounding context for relevance generation
 */

const mammoth = require('mammoth');
const fs = require('fs').promises;

/**
 * Extract context for all citations in a document
 *
 * @param {string} filePath - Path to the .docx or .txt file (with converted [123] citations)
 * @returns {Promise<object>} - Results with citation contexts
 */
async function extractContext(filePath) {
    const results = {
        success: false,
        inputFile: filePath,
        documentStructure: {
            title: '',
            sections: []
        },
        citations: [],
        stats: {
            totalCitations: 0,
            totalParagraphs: 0,
            totalSections: 0
        },
        warnings: [],
        errors: []
    };

    try {
        let markdown = '';
        let plainText = '';

        // Detect file type and read accordingly
        const fileExt = filePath.toLowerCase().endsWith('.txt') ? 'txt' : 'docx';

        if (fileExt === 'txt') {
            // Read text file directly
            plainText = await fs.readFile(filePath, 'utf-8');
            // Convert to simple markdown (headings detection)
            markdown = convertTextToMarkdown(plainText);
        } else {
            // Read Word document with structure preserved
            const buffer = await fs.readFile(filePath);

            // Extract with markdown for structure preservation
            const markdownResult = await mammoth.convertToMarkdown({ buffer });
            markdown = markdownResult.value;

            // Also get plain text for easier parsing
            const textResult = await mammoth.extractRawText({ buffer });
            plainText = textResult.value;
        }

        // Parse document structure
        const structure = parseDocumentStructure(markdown);
        results.documentStructure = structure;
        results.stats.totalSections = structure.sections.length;

        // Find all citations with their contexts
        const citationContexts = extractCitationContexts(plainText, structure);
        results.citations = citationContexts;
        results.stats.totalCitations = citationContexts.length;

        // Count paragraphs
        const paragraphs = plainText.split(/\n\n+/);
        results.stats.totalParagraphs = paragraphs.length;

        results.success = true;

    } catch (error) {
        results.success = false;
        results.errors.push(`Failed to extract context: ${error.message}`);
    }

    return results;
}

/**
 * Parse document structure from markdown
 *
 * @param {string} markdown - Markdown text from mammoth
 * @returns {object} - Document structure with sections and headings
 */
function parseDocumentStructure(markdown) {
    const structure = {
        title: '',
        sections: []
    };

    const lines = markdown.split('\n');
    let currentSection = null;
    let currentHeadingLevel = 0;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Check for markdown headings
        const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);

        if (headingMatch) {
            const level = headingMatch[1].length;
            const title = headingMatch[2].trim();

            // First heading is document title
            if (level === 1 && !structure.title) {
                structure.title = title;
            }

            // Create new section
            if (level <= 3) { // Only track up to h3
                currentSection = {
                    level,
                    heading: title,
                    startLine: i,
                    subsections: []
                };
                structure.sections.push(currentSection);
                currentHeadingLevel = level;
            } else if (currentSection && level > currentHeadingLevel) {
                // Add as subsection
                currentSection.subsections.push({
                    level,
                    heading: title,
                    startLine: i
                });
            }
        }
    }

    return structure;
}

/**
 * Extract context for each citation in the document
 *
 * @param {string} text - Plain text of document
 * @param {object} structure - Document structure
 * @returns {array} - Array of citation context objects
 */
function extractCitationContexts(text, structure) {
    const contexts = [];

    // Split into paragraphs (double newlines)
    const paragraphs = text.split(/\n\n+/);

    let charPosition = 0;
    let currentSection = null;

    for (let pIndex = 0; pIndex < paragraphs.length; pIndex++) {
        const paragraph = paragraphs[pIndex];
        const trimmedParagraph = paragraph.trim();

        // Update current section based on heading detection
        const sectionHeading = detectSectionHeading(trimmedParagraph, structure);
        if (sectionHeading) {
            currentSection = sectionHeading;
        }

        // Find all citations in this paragraph
        const citationPattern = /\[(\d+)\]/g;
        let match;

        while ((match = citationPattern.exec(paragraph)) !== null) {
            const citationId = parseInt(match[1]);
            const citationPos = charPosition + match.index;

            // Extract surrounding context (current paragraph + previous + next)
            const prevParagraph = pIndex > 0 ? paragraphs[pIndex - 1].trim() : '';
            const nextParagraph = pIndex < paragraphs.length - 1 ? paragraphs[pIndex + 1].trim() : '';

            // Create context window (200 chars before and after citation)
            const citationInParagraph = match.index;
            const contextStart = Math.max(0, citationInParagraph - 200);
            const contextEnd = Math.min(paragraph.length, citationInParagraph + match[0].length + 200);
            const immediateContext = paragraph.substring(contextStart, contextEnd).trim();

            contexts.push({
                citationId,
                citationText: match[0],
                paragraphIndex: pIndex,
                paragraphText: trimmedParagraph,
                immediateContext,
                position: citationPos,
                section: currentSection ? {
                    heading: currentSection.heading,
                    level: currentSection.level
                } : null,
                surroundingParagraphs: {
                    previous: prevParagraph.substring(0, 500), // Limit to 500 chars
                    current: trimmedParagraph,
                    next: nextParagraph.substring(0, 500)
                }
            });
        }

        charPosition += paragraph.length + 2; // +2 for \n\n
    }

    return contexts;
}

/**
 * Detect if a paragraph is a section heading
 *
 * @param {string} paragraph - Paragraph text
 * @param {object} structure - Document structure
 * @returns {object|null} - Section object or null
 */
function detectSectionHeading(paragraph, structure) {
    // Check against known sections from structure
    for (const section of structure.sections) {
        if (paragraph.includes(section.heading)) {
            return section;
        }
    }

    // Also check for common heading patterns (all caps, short lines)
    if (paragraph.length < 100 && paragraph === paragraph.toUpperCase()) {
        return {
            heading: paragraph,
            level: 2,
            detected: true
        };
    }

    return null;
}

/**
 * Get full context for a specific citation (used by relevance generator)
 *
 * @param {number} citationId - Citation ID number
 * @param {array} citationContexts - Array from extractCitationContexts
 * @returns {object|null} - Context object or null if not found
 */
function getCitationContext(citationId, citationContexts) {
    return citationContexts.find(ctx => ctx.citationId === citationId) || null;
}

/**
 * Format context for AI prompt (used by relevance generator)
 *
 * @param {object} context - Context object from extractCitationContexts
 * @returns {string} - Formatted context string
 */
function formatContextForAI(context) {
    let formatted = '';

    if (context.section) {
        formatted += `Section: ${context.section.heading}\n\n`;
    }

    formatted += `Context:\n${context.paragraphText}\n`;

    return formatted;
}

/**
 * Convert plain text to simple markdown format (for .txt files)
 *
 * @param {string} text - Plain text content
 * @returns {string} - Markdown formatted text
 */
function convertTextToMarkdown(text) {
    const lines = text.split('\n');
    const markdownLines = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Detect potential headings (all caps, short lines, or lines ending without punctuation)
        if (line.length > 0 && line.length < 100) {
            // Check if line is all caps (likely a heading)
            if (line === line.toUpperCase() && /[A-Z]/.test(line)) {
                markdownLines.push(`## ${line}`);
                continue;
            }

            // Check if next line is empty (paragraph break) and this line doesn't end with period
            if (i < lines.length - 1 && lines[i + 1].trim() === '' &&
                !line.endsWith('.') && !line.endsWith(',') && !line.endsWith(';')) {
                markdownLines.push(`## ${line}`);
                continue;
            }
        }

        markdownLines.push(lines[i]);
    }

    return markdownLines.join('\n');
}

// Export functions
module.exports = {
    extractContext,
    parseDocumentStructure,
    extractCitationContexts,
    getCitationContext,
    formatContextForAI,
    convertTextToMarkdown
};

// Example usage
if (require.main === module) {
    const testFile = process.argv[2];
    if (!testFile) {
        console.log('Usage: node context-extractor.js <path-to-docx>');
        process.exit(1);
    }

    extractContext(testFile)
        .then(results => {
            console.log('\n=== Context Extractor Results ===\n');
            console.log(`Input: ${results.inputFile}`);
            console.log(`Success: ${results.success}`);
            console.log('\nStats:');
            console.log(`  Total citations: ${results.stats.totalCitations}`);
            console.log(`  Total paragraphs: ${results.stats.totalParagraphs}`);
            console.log(`  Total sections: ${results.stats.totalSections}`);

            console.log('\nDocument Structure:');
            console.log(`  Title: ${results.documentStructure.title || '(none detected)'}`);
            console.log(`  Sections: ${results.documentStructure.sections.length}`);

            if (results.documentStructure.sections.length > 0) {
                console.log('\n  Section headings:');
                results.documentStructure.sections.slice(0, 5).forEach(section => {
                    console.log(`    ${' '.repeat(section.level * 2)}${section.heading}`);
                });
                if (results.documentStructure.sections.length > 5) {
                    console.log(`    ... and ${results.documentStructure.sections.length - 5} more`);
                }
            }

            if (results.citations.length > 0) {
                console.log('\nSample Citations:');
                results.citations.slice(0, 3).forEach(cit => {
                    console.log(`\n  [${cit.citationId}] in paragraph ${cit.paragraphIndex}`);
                    if (cit.section) {
                        console.log(`    Section: ${cit.section.heading}`);
                    }
                    console.log(`    Context: ${cit.immediateContext.substring(0, 100)}...`);
                });
                if (results.citations.length > 3) {
                    console.log(`\n  ... and ${results.citations.length - 3} more citations`);
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
