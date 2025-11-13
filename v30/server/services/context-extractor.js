/**
 * Context Extractor for Reference Refinement v30.0
 * Component 2 of Phase 1
 *
 * Extracts document context around each citation for hierarchical model:
 * Context → Relevance → URLs
 *
 * Features:
 * - Parse document structure (sections, chapters, headings)
 * - Extract context at multiple levels (sentence, paragraph, section)
 * - Identify what claim the citation supports
 * - Store metadata for database insertion
 * - Handle edge cases (boundaries, tables, etc.)
 */

const mammoth = require('mammoth');
const fs = require('fs').promises;
const path = require('path');

// ============================================================================
// MAIN EXTRACTION FUNCTION
// ============================================================================

/**
 * Extract context for all citations in a document
 *
 * @param {object} citationLocations - Array of citation locations from citation-parser
 * @param {string} docxPath - Path to .docx file
 * @param {object} options - Configuration options
 * @returns {Promise<object>} Context extraction results
 */
async function extractContexts(citationLocations, docxPath, options = {}) {
    const opts = {
        contextScope: 'paragraph',  // 'sentence', 'paragraph', 'extended'
        includeSectionInfo: true,
        identifyClaim: true,
        ...options
    };

    const results = {
        success: false,
        documentFile: docxPath,
        citationsProcessed: 0,
        contexts: [],
        documentStructure: null,
        warnings: [],
        errors: []
    };

    try {
        console.log(`\n📄 Extracting contexts from: ${path.basename(docxPath)}`);
        console.log(`   Citations to process: ${citationLocations.length}`);
        console.log(`   Context scope: ${opts.contextScope}`);

        // ====================================================================
        // STEP 1: Extract document content with structure
        // ====================================================================

        console.log('\n   Step 1: Parsing document structure...');

        const { value: html, messages } = await mammoth.convertToHtml(
            { path: docxPath },
            {
                includeDefaultStyleMap: true,
                styleMap: [
                    "p[style-name='Heading 1'] => h1:fresh",
                    "p[style-name='Heading 2'] => h2:fresh",
                    "p[style-name='Heading 3'] => h3:fresh",
                    "p[style-name='Heading 4'] => h4:fresh"
                ]
            }
        );

        const { value: rawText } = await mammoth.extractRawText({ path: docxPath });

        // Parse document structure
        const structure = parseDocumentStructure(html, rawText);
        results.documentStructure = structure;

        console.log(`   ✓ Found ${structure.sections.length} sections`);
        console.log(`   ✓ Found ${structure.paragraphs.length} paragraphs`);

        // ====================================================================
        // STEP 2: Extract context for each citation
        // ====================================================================

        console.log('\n   Step 2: Extracting contexts for citations...');

        for (const location of citationLocations) {
            try {
                const context = await extractCitationContext(
                    location,
                    structure,
                    rawText,
                    opts
                );

                results.contexts.push(context);
                results.citationsProcessed++;

                if (results.citationsProcessed % 10 === 0) {
                    console.log(`   - Processed ${results.citationsProcessed}/${citationLocations.length} citations`);
                }

            } catch (error) {
                results.warnings.push(
                    `Failed to extract context for citation ${location.citationNumber}: ${error.message}`
                );
            }
        }

        console.log(`   ✓ Extracted contexts for ${results.citationsProcessed} citations`);

        // ====================================================================
        // STEP 3: Identify claims and validate contexts
        // ====================================================================

        if (opts.identifyClaim) {
            console.log('\n   Step 3: Identifying claims supported by citations...');

            for (const context of results.contexts) {
                context.claimSupported = identifyClaim(context);
            }

            console.log(`   ✓ Identified claims for ${results.contexts.length} citations`);
        }

        results.success = true;

        console.log('\n✅ Context extraction complete!');
        console.log(`   Citations processed: ${results.citationsProcessed}`);
        console.log(`   Contexts extracted: ${results.contexts.length}`);

        if (results.warnings.length > 0) {
            console.log(`\n⚠️  ${results.warnings.length} warning(s):`);
            results.warnings.forEach(w => console.log(`   - ${w}`));
        }

    } catch (error) {
        results.errors.push(`Context extraction failed: ${error.message}`);
        results.success = false;
        console.error(`\n❌ Error: ${error.message}`);
    }

    return results;
}

// ============================================================================
// DOCUMENT STRUCTURE PARSING
// ============================================================================

/**
 * Parse document structure (sections, paragraphs, headings)
 *
 * @param {string} html - HTML content
 * @param {string} text - Plain text content
 * @returns {object} Document structure
 */
function parseDocumentStructure(html, text) {
    const structure = {
        sections: [],
        paragraphs: [],
        headings: []
    };

    // Extract headings from HTML
    const headingRegex = /<h([1-4])>(.*?)<\/h\1>/gi;
    let match;
    let currentSection = null;
    let sectionCounter = 0;

    while ((match = headingRegex.exec(html)) !== null) {
        const level = parseInt(match[1]);
        const title = stripHtmlTags(match[2]);
        const position = text.indexOf(title);

        const heading = {
            level,
            title,
            position,
            number: extractSectionNumber(title)
        };

        structure.headings.push(heading);

        // Create sections from level 1 and 2 headings
        if (level <= 2) {
            if (currentSection) {
                currentSection.endPos = position;
            }

            currentSection = {
                id: ++sectionCounter,
                level,
                title,
                number: heading.number,
                startPos: position,
                endPos: text.length
            };

            structure.sections.push(currentSection);
        }
    }

    // Split text into paragraphs
    const paragraphTexts = text.split(/\n\n+|\n(?=[A-Z])/);
    let currentPos = 0;

    for (let i = 0; i < paragraphTexts.length; i++) {
        const paraText = paragraphTexts[i].trim();
        if (paraText.length < 10) {
            currentPos += paragraphTexts[i].length;
            continue;
        }

        const para = {
            index: structure.paragraphs.length,
            text: paraText,
            startPos: currentPos,
            endPos: currentPos + paraText.length,
            section: findContainingSection(currentPos, structure.sections)
        };

        structure.paragraphs.push(para);
        currentPos += paragraphTexts[i].length;
    }

    return structure;
}

/**
 * Find which section contains a given position
 *
 * @param {number} position - Character position
 * @param {Array} sections - Array of section objects
 * @returns {object|null} Containing section
 */
function findContainingSection(position, sections) {
    for (const section of sections) {
        if (position >= section.startPos && position < section.endPos) {
            return {
                id: section.id,
                title: section.title,
                number: section.number,
                level: section.level
            };
        }
    }
    return null;
}

/**
 * Extract section number from heading text
 *
 * @param {string} text - Heading text
 * @returns {string|null} Section number
 */
function extractSectionNumber(text) {
    // Match patterns like "1.2", "3.4.5", "Chapter 5", etc.
    const patterns = [
        /^(\d+(?:\.\d+)*)/,  // 1.2.3
        /^Chapter (\d+)/i,
        /^Section (\d+)/i,
        /^\(([IVX]+)\)/,  // Roman numerals
        /^([IVX]+)\./      // Roman numerals with period
    ];

    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
            return match[1];
        }
    }

    return null;
}

// ============================================================================
// CITATION CONTEXT EXTRACTION
// ============================================================================

/**
 * Extract context for a single citation
 *
 * @param {object} location - Citation location from parser
 * @param {object} structure - Document structure
 * @param {string} text - Full document text
 * @param {object} options - Extraction options
 * @returns {object} Citation context
 */
async function extractCitationContext(location, structure, text, options) {
    const context = {
        citationId: location.citationNumber,
        citationText: location.convertedFormat,
        paragraphNumber: location.paragraphIndex,
        charOffset: location.position,
        paragraphContext: '',
        sentenceBefore: '',
        sentenceAfter: '',
        sentenceContaining: '',
        sectionTitle: '',
        sectionNumber: '',
        pageNumber: null,
        claimSupported: ''
    };

    // Find containing paragraph
    const paragraph = structure.paragraphs.find(
        p => p.index === location.paragraphIndex
    );

    if (!paragraph) {
        throw new Error(`Paragraph ${location.paragraphIndex} not found`);
    }

    context.paragraphContext = paragraph.text;

    // Extract sentences
    const sentences = extractSentences(paragraph.text);
    const citationInPara = location.position - paragraph.startPos;

    // Find which sentence contains the citation
    let currentPos = 0;
    let sentenceIndex = -1;

    for (let i = 0; i < sentences.length; i++) {
        const sentenceEnd = currentPos + sentences[i].length;
        if (citationInPara >= currentPos && citationInPara < sentenceEnd) {
            sentenceIndex = i;
            context.sentenceContaining = sentences[i];
            break;
        }
        currentPos = sentenceEnd;
    }

    if (sentenceIndex > 0) {
        context.sentenceBefore = sentences[sentenceIndex - 1];
    }

    if (sentenceIndex < sentences.length - 1) {
        context.sentenceAfter = sentences[sentenceIndex + 1];
    }

    // Add section information
    if (paragraph.section) {
        context.sectionTitle = paragraph.section.title;
        context.sectionNumber = paragraph.section.number || '';
    }

    // Estimate page number (rough: ~500 words per page)
    const wordsBeforeCitation = text.substring(0, location.position).split(/\s+/).length;
    context.pageNumber = Math.ceil(wordsBeforeCitation / 500);

    return context;
}

/**
 * Split text into sentences
 *
 * @param {string} text - Text to split
 * @returns {Array} Array of sentences
 */
function extractSentences(text) {
    // Split on sentence boundaries (. ! ?) followed by space and capital letter
    // But not on abbreviations like "Dr." or "Ph.D."
    const sentences = [];
    const sentenceRegex = /([^.!?]+[.!?]+)(?=\s+[A-Z]|$)/g;
    let match;

    while ((match = sentenceRegex.exec(text)) !== null) {
        sentences.push(match[1].trim());
    }

    // If no sentences found, return whole text
    if (sentences.length === 0) {
        sentences.push(text);
    }

    return sentences;
}

// ============================================================================
// CLAIM IDENTIFICATION
// ============================================================================

/**
 * Identify what claim the citation supports
 *
 * @param {object} context - Citation context
 * @returns {string} Identified claim
 */
function identifyClaim(context) {
    const sentence = context.sentenceContaining;

    if (!sentence) {
        return 'Unknown claim - citation at paragraph boundary';
    }

    // Remove the citation marker from sentence
    const cleanSentence = sentence
        .replace(/\[\d+\]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    // Look for claim indicators
    const indicators = {
        empirical: /research shows|studies indicate|data suggest|evidence demonstrates|findings reveal|results show/i,
        theoretical: /theory suggests|framework proposes|model indicates|concept implies|argues that/i,
        review: /review found|meta-analysis|systematic review|literature shows/i,
        methodological: /method|approach|technique|procedure|analysis|measurement/i,
        causal: /causes|leads to|results in|produces|affects|influences|determines/i,
        correlational: /associated with|related to|correlated|linked to|connected to/i,
        comparative: /compared to|in contrast|unlike|different from|similar to/i,
        statistical: /significant|p <|correlation|regression|confidence interval/i
    };

    const types = [];
    for (const [type, pattern] of Object.entries(indicators)) {
        if (pattern.test(cleanSentence)) {
            types.push(type);
        }
    }

    // Extract the main claim (up to 150 chars)
    let claim = cleanSentence;
    if (claim.length > 150) {
        claim = claim.substring(0, 147) + '...';
    }

    // Add type tags if identified
    if (types.length > 0) {
        claim = `[${types.join(', ')}] ${claim}`;
    }

    return claim;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Strip HTML tags from text
 *
 * @param {string} html - HTML text
 * @returns {string} Plain text
 */
function stripHtmlTags(html) {
    return html.replace(/<[^>]*>/g, '').trim();
}

/**
 * Find paragraph by position
 *
 * @param {number} position - Character position
 * @param {Array} paragraphs - Array of paragraph objects
 * @returns {object|null} Paragraph object
 */
function findParagraphByPosition(position, paragraphs) {
    for (const para of paragraphs) {
        if (position >= para.startPos && position < para.endPos) {
            return para;
        }
    }
    return null;
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
    // Main function
    extractContexts,

    // Core functions
    parseDocumentStructure,
    extractCitationContext,
    identifyClaim,

    // Helper functions
    extractSentences,
    findContainingSection,
    extractSectionNumber,
    stripHtmlTags,
    findParagraphByPosition
};
