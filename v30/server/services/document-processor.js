/**
 * Document Processor (Orchestrator) for Reference Refinement v30.0
 * Coordinates all 5 components into complete Phase 1 pipeline
 *
 * Pipeline:
 * 1. Citation Parser - Convert citations to [123] format
 * 2. Context Extractor - Extract paragraph context
 * 3. Relevance Generator - Generate 200-word AI explanations
 * 4. URL Discoverer - Find and validate Primary/Secondary URLs
 * 5. Decisions Writer - Export to decisions.txt
 *
 * Features:
 * - Complete pipeline orchestration
 * - Progress tracking and reporting
 * - Error handling and recovery
 * - Database integration
 * - Comprehensive logging
 */

const path = require('path');
const { parseCitations } = require('./citation-parser');
const { extractContexts } = require('./context-extractor');
const { generateRelevance } = require('./relevance-generator');
const { discoverUrls } = require('./url-discoverer');
const { writeDecisions, addFlags } = require('./decisions-writer');

// ============================================================================
// MAIN PIPELINE FUNCTION
// ============================================================================

/**
 * Process a document through the complete Phase 1 pipeline
 *
 * @param {string} docxPath - Path to .docx file
 * @param {object} options - Configuration options
 * @returns {Promise<object>} Pipeline results
 */
async function processDocument(docxPath, options = {}) {
    const opts = {
        outputDir: path.dirname(docxPath),
        outputFileName: 'decisions.txt',
        enableRelevanceGeneration: true,
        enableUrlDiscovery: true,
        skipIfNoUrls: false,  // Continue even if URL discovery fails
        ...options
    };

    const results = {
        success: false,
        documentFile: docxPath,
        outputFile: null,
        pipeline: {
            stage: 'not_started',
            completed: []
        },
        components: {
            citationParser: null,
            contextExtractor: null,
            relevanceGenerator: null,
            urlDiscoverer: null,
            decisionsWriter: null
        },
        stats: {
            totalCitations: 0,
            totalProcessed: 0,
            withRelevance: 0,
            withUrls: 0,
            timeElapsed: 0
        },
        errors: [],
        warnings: []
    };

    const startTime = Date.now();

    try {
        console.log('\n' + '='.repeat(80));
        console.log('  REFERENCE REFINEMENT v30.0 - PHASE 1 PIPELINE');
        console.log('='.repeat(80));
        console.log(`\n📄 Processing: ${path.basename(docxPath)}`);
        console.log(`   Output: ${path.join(opts.outputDir, opts.outputFileName)}`);

        // ====================================================================
        // STAGE 1: CITATION PARSING
        // ====================================================================

        console.log('\n' + '─'.repeat(80));
        console.log('  STAGE 1/5: Citation Parser');
        console.log('─'.repeat(80));

        results.pipeline.stage = 'citation_parsing';

        const parserResults = await parseCitations(docxPath, {
            preserveOriginal: true,
            outputFormat: 'both',
            extractContext: true
        });

        results.components.citationParser = parserResults;

        if (!parserResults.success) {
            throw new Error('Citation parsing failed: ' + parserResults.errors.join(', '));
        }

        results.stats.totalCitations = parserResults.stats.citationsFound;
        results.pipeline.completed.push('citation_parsing');

        console.log(`\n✅ Stage 1 complete: ${parserResults.stats.citationsFound} citations parsed`);

        // ====================================================================
        // STAGE 2: CONTEXT EXTRACTION
        // ====================================================================

        console.log('\n' + '─'.repeat(80));
        console.log('  STAGE 2/5: Context Extractor');
        console.log('─'.repeat(80));

        results.pipeline.stage = 'context_extraction';

        const contextResults = await extractContexts(
            parserResults.citationLocations,
            docxPath,
            {
                contextScope: 'paragraph',
                includeSectionInfo: true,
                identifyClaim: true
            }
        );

        results.components.contextExtractor = contextResults;

        if (!contextResults.success) {
            throw new Error('Context extraction failed: ' + contextResults.errors.join(', '));
        }

        results.pipeline.completed.push('context_extraction');

        console.log(`\n✅ Stage 2 complete: ${contextResults.citationsProcessed} contexts extracted`);

        // ====================================================================
        // STAGE 3: RELEVANCE GENERATION
        // ====================================================================

        if (opts.enableRelevanceGeneration) {
            console.log('\n' + '─'.repeat(80));
            console.log('  STAGE 3/5: Relevance Generator');
            console.log('─'.repeat(80));

            results.pipeline.stage = 'relevance_generation';

            // Extract bibliographic data from parser results
            const bibliographicData = extractBibliographicData(parserResults);

            const relevanceResults = await generateRelevance(
                contextResults.contexts,
                bibliographicData,
                {
                    apiKey: process.env.ANTHROPIC_API_KEY,
                    batchSize: 10,
                    useCache: true,
                    cacheFile: path.join(opts.outputDir, '.relevance-cache.json')
                }
            );

            results.components.relevanceGenerator = relevanceResults;

            if (!relevanceResults.success) {
                results.warnings.push('Relevance generation had errors: ' + relevanceResults.errors.join(', '));
            }

            results.stats.withRelevance = relevanceResults.relevanceGenerated;
            results.pipeline.completed.push('relevance_generation');

            console.log(`\n✅ Stage 3 complete: ${relevanceResults.relevanceGenerated} relevances generated`);
            console.log(`   API calls: ${relevanceResults.apiCalls}, Cost: $${relevanceResults.totalCost.toFixed(4)}`);
        } else {
            console.log('\n⏭️  Stage 3 skipped: Relevance generation disabled');
        }

        // ====================================================================
        // STAGE 4: URL DISCOVERY
        // ====================================================================

        if (opts.enableUrlDiscovery) {
            console.log('\n' + '─'.repeat(80));
            console.log('  STAGE 4/5: URL Discoverer');
            console.log('─'.repeat(80));

            results.pipeline.stage = 'url_discovery';

            // Combine all data for URL discovery
            const referencesForDiscovery = combineDataForUrlDiscovery(
                parserResults,
                contextResults,
                results.components.relevanceGenerator
            );

            const urlResults = await discoverUrls(
                referencesForDiscovery,
                {
                    googleApiKey: process.env.GOOGLE_API_KEY,
                    googleCx: process.env.GOOGLE_CX,
                    validateUrls: true,
                    maxCandidates: 20
                }
            );

            results.components.urlDiscoverer = urlResults;

            if (!urlResults.success && !opts.skipIfNoUrls) {
                throw new Error('URL discovery failed: ' + urlResults.errors.join(', '));
            }

            results.stats.withUrls = urlResults.urlsDiscovered;
            results.pipeline.completed.push('url_discovery');

            console.log(`\n✅ Stage 4 complete: ${urlResults.urlsDiscovered} URLs discovered`);
            console.log(`   API calls: ${urlResults.apiCalls}, Time: ${urlResults.validationTime}s`);
        } else {
            console.log('\n⏭️  Stage 4 skipped: URL discovery disabled');
        }

        // ====================================================================
        // STAGE 5: DECISIONS.TXT WRITER
        // ====================================================================

        console.log('\n' + '─'.repeat(80));
        console.log('  STAGE 5/5: Decisions.txt Writer');
        console.log('─'.repeat(80));

        results.pipeline.stage = 'decisions_writing';

        // Combine all data for final output
        const finalReferences = combineDataForOutput(
            parserResults,
            contextResults,
            results.components.relevanceGenerator,
            results.components.urlDiscoverer
        );

        // Apply standard flags
        for (const ref of finalReferences) {
            const flags = ['STAGE_1_GENERATED', 'AUTO_CONTEXT'];

            if (ref.relevanceText) {
                flags.push('AUTO_RELEVANCE');
            }

            if (ref.primaryUrl) {
                flags.push('AUTO_URLS');
            }

            if (ref.strategyUsed === 'title_keywords_5_terms') {
                flags.push('MANUAL_REVIEW');
            }

            if (ref.strategyUsed === 'plus_best_2_from_tier_1') {
                flags.push('EDGE_CASE');
            }

            addFlags(ref, flags);
        }

        const outputPath = path.join(opts.outputDir, opts.outputFileName);
        const writerResults = await writeDecisions(
            finalReferences,
            outputPath,
            {
                includeContext: true,
                includeRelevance: true,
                includeUrls: true,
                includeLocation: true,
                includeQuery: true,
                includeFlags: true,
                defaultStatus: 'PROCESSING'
            }
        );

        results.components.decisionsWriter = writerResults;

        if (!writerResults.success) {
            throw new Error('Decisions writing failed: ' + writerResults.errors.join(', '));
        }

        results.outputFile = outputPath;
        results.pipeline.completed.push('decisions_writing');
        results.stats.totalProcessed = writerResults.stats.totalReferences;

        console.log(`\n✅ Stage 5 complete: ${writerResults.stats.totalReferences} references written`);

        // ====================================================================
        // PIPELINE COMPLETE
        // ====================================================================

        results.success = true;
        results.pipeline.stage = 'completed';
        results.stats.timeElapsed = Math.round((Date.now() - startTime) / 1000);

        console.log('\n' + '='.repeat(80));
        console.log('  ✅ PHASE 1 PIPELINE COMPLETE');
        console.log('='.repeat(80));

        console.log(`\n📊 Final Statistics:`);
        console.log(`   Total citations: ${results.stats.totalCitations}`);
        console.log(`   References processed: ${results.stats.totalProcessed}`);
        console.log(`   With relevance: ${results.stats.withRelevance}`);
        console.log(`   With URLs: ${results.stats.withUrls}`);
        console.log(`   Time elapsed: ${results.stats.timeElapsed}s`);

        console.log(`\n📝 Output file: ${results.outputFile}`);

        if (results.warnings.length > 0) {
            console.log(`\n⚠️  ${results.warnings.length} warning(s):`);
            results.warnings.forEach(w => console.log(`   - ${w}`));
        }

        console.log('\n' + '='.repeat(80) + '\n');

    } catch (error) {
        results.errors.push(`Pipeline failed at stage ${results.pipeline.stage}: ${error.message}`);
        results.success = false;
        results.stats.timeElapsed = Math.round((Date.now() - startTime) / 1000);

        console.error('\n' + '='.repeat(80));
        console.error('  ❌ PIPELINE FAILED');
        console.error('='.repeat(80));
        console.error(`\nStage: ${results.pipeline.stage}`);
        console.error(`Error: ${error.message}`);
        console.error(`\nCompleted stages: ${results.pipeline.completed.join(', ') || 'none'}`);
        console.error('\n' + '='.repeat(80) + '\n');
    }

    return results;
}

// ============================================================================
// DATA COMBINATION FUNCTIONS
// ============================================================================

/**
 * Extract bibliographic data from parser results
 *
 * @param {object} parserResults - Parser results
 * @returns {Array} Array of bibliographic data objects
 */
function extractBibliographicData(parserResults) {
    const bibData = [];

    // TODO: Parse citation text to extract author, year, title
    // For now, return basic structure
    for (const location of parserResults.citationLocations) {
        bibData.push({
            citationNumber: location.citationNumber,
            citationText: location.convertedFormat,
            // These would be parsed from the bibliography:
            author: '',
            year: '',
            title: '',
            publication: ''
        });
    }

    return bibData;
}

/**
 * Combine data for URL discovery stage
 *
 * @param {object} parserResults - Parser results
 * @param {object} contextResults - Context results
 * @param {object} relevanceResults - Relevance results (may be null)
 * @returns {Array} Array of combined reference objects
 */
function combineDataForUrlDiscovery(parserResults, contextResults, relevanceResults) {
    const references = [];

    for (const context of contextResults.contexts) {
        const ref = {
            citationId: context.citationId,
            citationText: context.citationText,
            context: context.paragraphContext,
            sectionTitle: context.sectionTitle,
            relevanceText: '',
            // Bibliographic fields (would be parsed from citation text)
            author: '',
            year: '',
            title: '',
            flags: []
        };

        // Add relevance if available
        if (relevanceResults && relevanceResults.relevances) {
            const relevance = relevanceResults.relevances.find(
                r => r.citationId === context.citationId
            );
            if (relevance) {
                ref.relevanceText = relevance.relevanceText;
            }
        }

        references.push(ref);
    }

    return references;
}

/**
 * Combine all data for final output
 *
 * @param {object} parserResults - Parser results
 * @param {object} contextResults - Context results
 * @param {object} relevanceResults - Relevance results (may be null)
 * @param {object} urlResults - URL results (may be null)
 * @returns {Array} Array of complete reference objects
 */
function combineDataForOutput(parserResults, contextResults, relevanceResults, urlResults) {
    const references = [];

    for (const context of contextResults.contexts) {
        const ref = {
            citationId: context.citationId,
            citationText: context.citationText,
            status: 'PROCESSING',
            relevanceText: '',
            context: context.paragraphContext,
            sectionTitle: context.sectionTitle,
            sectionNumber: context.sectionNumber,
            paragraphNumber: context.paragraphNumber,
            pageNumber: context.pageNumber,
            primaryUrl: '',
            secondaryUrl: '',
            searchQuery: '',
            strategyUsed: '',
            flags: []
        };

        // Add relevance if available
        if (relevanceResults && relevanceResults.relevances) {
            const relevance = relevanceResults.relevances.find(
                r => r.citationId === context.citationId
            );
            if (relevance) {
                ref.relevanceText = relevance.relevanceText;
            }
        }

        // Add URLs if available
        if (urlResults && urlResults.references) {
            const urlRef = urlResults.references.find(
                r => r.citationId === context.citationId
            );
            if (urlRef) {
                ref.primaryUrl = urlRef.primaryUrl || '';
                ref.secondaryUrl = urlRef.secondaryUrl || '';
                ref.searchQuery = urlRef.searchQuery || '';
                ref.strategyUsed = urlRef.strategyUsed || '';
            }
        }

        references.push(ref);
    }

    // Sort by citation ID
    references.sort((a, b) => a.citationId - b.citationId);

    return references;
}

// ============================================================================
// PROGRESS TRACKING
// ============================================================================

/**
 * Create a progress tracker for pipeline execution
 *
 * @param {number} totalSteps - Total number of steps
 * @returns {object} Progress tracker
 */
function createProgressTracker(totalSteps) {
    let currentStep = 0;

    return {
        start: (stepName) => {
            currentStep++;
            console.log(`\n[${currentStep}/${totalSteps}] ${stepName}...`);
        },
        complete: (stepName) => {
            console.log(`✓ ${stepName} complete`);
        },
        error: (stepName, error) => {
            console.error(`✗ ${stepName} failed: ${error}`);
        },
        getCurrentStep: () => currentStep,
        getTotalSteps: () => totalSteps
    };
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
    // Main function
    processDocument,

    // Data combination functions
    extractBibliographicData,
    combineDataForUrlDiscovery,
    combineDataForOutput,

    // Utilities
    createProgressTracker
};
