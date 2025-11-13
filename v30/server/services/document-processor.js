/**
 * Document Processor - Phase 1 Orchestrator
 *
 * Runs all 5 components in sequence to process a manuscript:
 * 1. Citation Parser - Convert citations to brackets
 * 2. Context Extractor - Extract context around citations
 * 3. Relevance Generator - Generate 200-word explanations
 * 4. URL Discoverer - Find and validate URLs
 * 5. Decisions Writer - Format output file
 */

const citationParser = require('./citation-parser');
const contextExtractor = require('./context-extractor');
const relevanceGenerator = require('./relevance-generator');
const urlDiscoverer = require('./url-discoverer');
const decisionsWriter = require('./decisions-writer');

const fs = require('fs').promises;
const path = require('path');

/**
 * Process a complete manuscript through all 5 phases
 *
 * @param {string} docxPath - Path to input .docx file
 * @param {object} options - Configuration options
 * @param {string} options.outputDir - Directory for output files (default: same as input)
 * @param {boolean} options.generateUrls - Whether to discover URLs (default: true)
 * @param {number} options.maxReferences - Max references to process (default: all)
 * @param {function} options.progressCallback - Optional progress callback(phase, current, total, details)
 * @returns {Promise<object>} - Complete processing results
 */
async function processDocument(docxPath, options = {}) {
    const startTime = Date.now();

    const results = {
        success: false,
        inputFile: docxPath,
        outputFiles: {
            decisionsFile: null,
            finalFile: null,
            convertedDocx: null
        },
        phaseResults: {
            citationParser: null,
            contextExtractor: null,
            relevanceGenerator: null,
            urlDiscoverer: null,
            decisionsWriter: null
        },
        stats: {
            totalReferences: 0,
            processed: 0,
            failed: 0,
            withUrls: 0,
            processingTime: 0
        },
        warnings: [],
        errors: []
    };

    try {
        console.log('\n╔════════════════════════════════════════════════════════════╗');
        console.log('║       Reference Refinement v30.0 - Document Processor      ║');
        console.log('║                     Phase 1: Complete Pipeline             ║');
        console.log('╚════════════════════════════════════════════════════════════╝\n');

        const outputDir = options.outputDir || path.dirname(docxPath);
        const baseName = path.basename(docxPath, '.docx');

        // ============================================================
        // PHASE 1: Citation Parser
        // ============================================================
        console.log('📝 Phase 1: Parsing Citations...');
        logProgress('citation-parser', 0, 1);

        const citationResults = await citationParser.parseCitations(docxPath);
        results.phaseResults.citationParser = citationResults;

        if (!citationResults.success) {
            results.errors.push('Citation parsing failed');
            return results;
        }

        console.log(`   ✓ Found ${citationResults.stats.citationsFound} citations`);
        console.log(`   ✓ Converted ${citationResults.stats.citationsConverted} to bracket notation`);
        console.log(`   ✓ Format detected: ${citationResults.stats.formatDetected}`);

        // Note: Use the converted text file for subsequent steps
        const convertedFilePath = citationResults.outputFile;

        // ============================================================
        // PHASE 2: Context Extractor
        // ============================================================
        console.log('\n📚 Phase 2: Extracting Context...');
        logProgress('context-extractor', 0, 1);

        // Pass the converted text file (with bracket citations) instead of original docx
        const contextResults = await contextExtractor.extractContext(convertedFilePath);
        results.phaseResults.contextExtractor = contextResults;

        if (!contextResults.success) {
            results.errors.push('Context extraction failed');
            return results;
        }

        console.log(`   ✓ Found ${contextResults.stats.totalCitations} citation contexts`);
        console.log(`   ✓ Extracted ${contextResults.stats.totalParagraphs} paragraphs`);
        console.log(`   ✓ Identified ${contextResults.stats.totalSections} sections`);

        results.stats.totalReferences = contextResults.citations.length;

        // Limit processing if specified
        const maxRefs = options.maxReferences || contextResults.citations.length;
        const citationsToProcess = contextResults.citations.slice(0, maxRefs);

        // Build bibliography mapping (needed for relevance generation)
        const bibliography = await extractBibliographyEntries(docxPath);

        // ============================================================
        // PHASE 3: Relevance Generator
        // ============================================================
        console.log(`\n🧠 Phase 3: Generating Relevance (${citationsToProcess.length} references)...`);

        const relevanceResults = [];
        for (let i = 0; i < citationsToProcess.length; i++) {
            const citation = citationsToProcess[i];
            logProgress('relevance-generator', i + 1, citationsToProcess.length, citation.citationId);

            // Get bibliographic entry for this citation
            const bibEntry = bibliography[citation.citationId - 1] || `Reference ${citation.citationId}`;

            // Generate relevance
            const relevanceData = {
                bibEntry,
                context: citation.paragraphText,
                section: citation.section ? citation.section.heading : null
            };

            const relevanceResult = await relevanceGenerator.generateRelevance(relevanceData);
            relevanceResults.push({
                citationId: citation.citationId,
                ...relevanceResult
            });

            if (relevanceResult.success) {
                console.log(`   ✓ [${citation.citationId}] Generated (${relevanceResult.wordCount} words)`);
            } else {
                console.log(`   ✗ [${citation.citationId}] Failed: ${relevanceResult.errors.join(', ')}`);
            }
        }

        results.phaseResults.relevanceGenerator = relevanceResults;

        const successfulRelevance = relevanceResults.filter(r => r.success).length;
        console.log(`\n   Summary: ${successfulRelevance}/${citationsToProcess.length} relevance texts generated`);

        // ============================================================
        // PHASE 4: URL Discoverer (Optional)
        // ============================================================
        let urlResults = [];

        if (options.generateUrls !== false) {
            console.log(`\n🔍 Phase 4: Discovering URLs (${citationsToProcess.length} references)...`);

            for (let i = 0; i < citationsToProcess.length; i++) {
                const citation = citationsToProcess[i];
                const relevance = relevanceResults.find(r => r.citationId === citation.citationId);

                logProgress('url-discoverer', i + 1, citationsToProcess.length, citation.citationId);

                // Get bibliographic entry
                const bibEntry = bibliography[citation.citationId - 1] || `Reference ${citation.citationId}`;

                // Parse bibliographic entry for metadata
                const { title, authors, year } = parseBibliographicEntry(bibEntry);

                const urlData = {
                    title,
                    authors,
                    year,
                    relevanceText: relevance?.relevanceText || '',
                    flags: [],
                    existingUrls: {}
                };

                const urlResult = await urlDiscoverer.discoverUrls(urlData);
                urlResults.push({
                    citationId: citation.citationId,
                    ...urlResult
                });

                if (urlResult.success && urlResult.selectedUrls.primary) {
                    console.log(`   ✓ [${citation.citationId}] Found URLs (${urlResult.stats.validUrls} valid)`);
                    results.stats.withUrls++;
                } else {
                    console.log(`   ✗ [${citation.citationId}] No valid URLs found`);
                }
            }

            results.phaseResults.urlDiscoverer = urlResults;
            console.log(`\n   Summary: ${results.stats.withUrls}/${citationsToProcess.length} references with URLs`);
        } else {
            console.log('\n🔍 Phase 4: Skipped (URL discovery disabled)');
        }

        // ============================================================
        // PHASE 5: Decisions Writer
        // ============================================================
        console.log('\n📄 Phase 5: Writing Output Files...');

        // Build reference objects for decisions.txt
        const references = citationsToProcess.map(citation => {
            const bibEntry = bibliography[citation.citationId - 1] || `Reference ${citation.citationId}`;
            const relevance = relevanceResults.find(r => r.citationId === citation.citationId);
            const urls = urlResults.find(r => r.citationId === citation.citationId);

            return {
                id: citation.citationId,
                bibEntry,
                relevanceText: relevance?.relevanceText || '',
                urls: urls?.selectedUrls || {},
                flags: [] // No flags yet - would add FINALIZED manually later
            };
        });

        // Write decisions.txt
        const decisionsPath = path.join(outputDir, `${baseName}_decisions.txt`);
        const writeResults = await decisionsWriter.writeDecisionsFile(references, decisionsPath);
        results.phaseResults.decisionsWriter = writeResults;

        if (writeResults.success) {
            console.log(`   ✓ Wrote ${decisionsPath}`);
            results.outputFiles.decisionsFile = decisionsPath;
        }

        // ============================================================
        // Summary
        // ============================================================
        const processingTime = ((Date.now() - startTime) / 1000).toFixed(1);
        results.stats.processingTime = processingTime;
        results.stats.processed = citationsToProcess.length;
        results.success = true;

        console.log('\n╔════════════════════════════════════════════════════════════╗');
        console.log('║                    PROCESSING COMPLETE                      ║');
        console.log('╚════════════════════════════════════════════════════════════╝');
        console.log(`\n✅ Processed ${results.stats.processed} references in ${processingTime}s`);
        console.log(`📊 Success Rate: ${successfulRelevance}/${results.stats.processed} relevance texts`);
        console.log(`🔗 URLs Found: ${results.stats.withUrls}/${results.stats.processed} references\n`);
        console.log(`📁 Output: ${results.outputFiles.decisionsFile}\n`);

    } catch (error) {
        results.success = false;
        results.errors.push(`Processing failed: ${error.message}`);
        console.error('\n❌ Fatal error:', error.message);
    }

    return results;
}

/**
 * Extract bibliography entries from document
 */
async function extractBibliographyEntries(docxPath) {
    const mammoth = require('mammoth');
    const buffer = await fs.readFile(docxPath);
    const result = await mammoth.extractRawText({ buffer });
    const text = result.value;

    // Use citation parser's extractBibliography function
    const entries = citationParser.extractBibliography(text);
    return entries;
}

/**
 * Parse bibliographic entry for metadata
 */
function parseBibliographicEntry(bibEntry) {
    // Simple parsing - can be enhanced
    const yearMatch = bibEntry.match(/\((\d{4})\)/);
    const year = yearMatch ? yearMatch[1] : '';

    // Extract title (usually after year, before publisher)
    const titleMatch = bibEntry.match(/\(\d{4}\)\.\s*(.+?)[\.\?]/);
    const title = titleMatch ? titleMatch[1].trim() : bibEntry.substring(0, 100);

    // Extract authors (usually at start, before year)
    const authorMatch = bibEntry.match(/^([^(]+)\s*\(/);
    const authors = authorMatch ? authorMatch[1].trim() : '';

    return { title, authors, year };
}

/**
 * Log progress helper
 */
function logProgress(phase, current, total, details = '') {
    if (current > 0 && current < total) {
        const pct = ((current / total) * 100).toFixed(0);
        const detailStr = details ? ` [${details}]` : '';
        process.stdout.write(`\r   Progress: ${current}/${total} (${pct}%)${detailStr}     `);
    } else if (current === total) {
        process.stdout.write('\r' + ' '.repeat(80) + '\r'); // Clear line
    }
}

// Export
module.exports = {
    processDocument,
    extractBibliographyEntries,
    parseBibliographicEntry
};

// CLI usage
if (require.main === module) {
    const docxPath = process.argv[2];
    const maxRefs = process.argv[3] ? parseInt(process.argv[3]) : null;

    if (!docxPath) {
        console.log('Usage: node document-processor.js <path-to-docx> [max-refs]');
        console.log('');
        console.log('Example:');
        console.log('  node document-processor.js manuscript.docx');
        console.log('  node document-processor.js manuscript.docx 5  # Process first 5 refs only');
        process.exit(1);
    }

    processDocument(docxPath, { maxReferences: maxRefs })
        .then(results => {
            if (!results.success) {
                console.error('\n❌ Processing failed');
                if (results.errors.length > 0) {
                    console.error('\nErrors:');
                    results.errors.forEach(e => console.error(`  - ${e}`));
                }
                process.exit(1);
            }
        })
        .catch(error => {
            console.error('\n❌ Fatal error:', error.message);
            console.error(error.stack);
            process.exit(1);
        });
}
