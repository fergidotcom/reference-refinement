/**
 * Complete Pipeline Test Script for Reference Refinement v30.0
 * Tests all 5 components together: Citation Parser → Context Extractor →
 * Relevance Generator → URL Discoverer → Decisions Writer
 *
 * Usage:
 *   node v30/test-complete-pipeline.js <path-to-docx> [options]
 *
 * Options:
 *   --no-relevance     Skip relevance generation
 *   --no-urls          Skip URL discovery
 *   --output-dir=DIR   Specify output directory
 *
 * Example:
 *   node v30/test-complete-pipeline.js v30/test-data/250714TheMythOfMaleMenopause.docx
 *   node v30/test-complete-pipeline.js v30/test-data/250625AuthoritarianAscentInTheUSA.docx --no-urls
 */

const path = require('path');
const { processDocument } = require('./server/services/document-processor');

// ============================================================================
// COLOR CODES
// ============================================================================

const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

function colorize(text, color) {
    return `${colors[color]}${text}${colors.reset}`;
}

// ============================================================================
// MAIN TEST FUNCTION
// ============================================================================

async function runPipelineTest(docxPath, options = {}) {
    console.log(colorize('\n' + '═'.repeat(80), 'cyan'));
    console.log(colorize('  COMPLETE PIPELINE TEST - REFERENCE REFINEMENT v30.0', 'cyan'));
    console.log(colorize('═'.repeat(80), 'cyan'));

    console.log('\n' + colorize('Input file:', 'bright'), docxPath);
    console.log(colorize('Configuration:', 'bright'));
    console.log('  Relevance generation:', options.enableRelevanceGeneration ? 'enabled' : 'disabled');
    console.log('  URL discovery:', options.enableUrlDiscovery ? 'enabled' : 'disabled');
    console.log('  Output directory:', options.outputDir);

    console.log(colorize('\nStarting pipeline...', 'blue'));

    try {
        // Run the complete pipeline
        const results = await processDocument(docxPath, options);

        // ====================================================================
        // DISPLAY RESULTS
        // ====================================================================

        console.log(colorize('\n' + '═'.repeat(80), 'cyan'));
        console.log(colorize('  TEST RESULTS', 'cyan'));
        console.log(colorize('═'.repeat(80), 'cyan'));

        // Overall Status
        if (results.success) {
            console.log('\n' + colorize('✅ PIPELINE SUCCEEDED', 'green'));
        } else {
            console.log('\n' + colorize('❌ PIPELINE FAILED', 'red'));
        }

        // Pipeline Stage
        console.log('\n' + colorize('Pipeline Status:', 'bright'));
        console.log('  Final stage:', colorize(results.pipeline.stage, results.success ? 'green' : 'red'));
        console.log('  Completed stages:', results.pipeline.completed.join(' → ') || 'none');

        // Overall Statistics
        console.log('\n' + colorize('Overall Statistics:', 'bright'));
        console.log('  Total citations:', colorize(results.stats.totalCitations, 'yellow'));
        console.log('  References processed:', colorize(results.stats.totalProcessed, 'yellow'));
        console.log('  With relevance:', colorize(results.stats.withRelevance, 'yellow'));
        console.log('  With URLs:', colorize(results.stats.withUrls, 'yellow'));
        console.log('  Time elapsed:', colorize(`${results.stats.timeElapsed}s`, 'yellow'));

        // Component Results
        console.log('\n' + colorize('Component Results:', 'bright'));

        if (results.components.citationParser) {
            const cp = results.components.citationParser;
            console.log(colorize('\n  1. Citation Parser:', 'cyan'));
            console.log(`     Format detected: ${cp.stats.formatDetected}`);
            console.log(`     Citations found: ${cp.stats.citationsFound}`);
            console.log(`     Citations converted: ${cp.stats.citationsConverted}`);
            console.log(`     Bibliography entries: ${cp.stats.bibliographyEntries}`);
            console.log(`     Status: ${cp.success ? colorize('✓', 'green') : colorize('✗', 'red')}`);
        }

        if (results.components.contextExtractor) {
            const ce = results.components.contextExtractor;
            console.log(colorize('\n  2. Context Extractor:', 'cyan'));
            console.log(`     Citations processed: ${ce.citationsProcessed}`);
            console.log(`     Contexts extracted: ${ce.contexts.length}`);
            console.log(`     Document sections: ${ce.documentStructure?.sections.length || 0}`);
            console.log(`     Status: ${ce.success ? colorize('✓', 'green') : colorize('✗', 'red')}`);
        }

        if (results.components.relevanceGenerator) {
            const rg = results.components.relevanceGenerator;
            console.log(colorize('\n  3. Relevance Generator:', 'cyan'));
            console.log(`     Relevances generated: ${rg.relevanceGenerated}`);
            console.log(`     API calls: ${rg.apiCalls}`);
            console.log(`     Total tokens: ${rg.totalTokensInput + rg.totalTokensOutput}`);
            console.log(`     Estimated cost: $${rg.totalCost.toFixed(4)}`);
            console.log(`     Cached: ${rg.cached}`);
            console.log(`     Failed: ${rg.failed}`);
            console.log(`     Status: ${rg.success ? colorize('✓', 'green') : colorize('✗', 'red')}`);
        }

        if (results.components.urlDiscoverer) {
            const ud = results.components.urlDiscoverer;
            console.log(colorize('\n  4. URL Discoverer:', 'cyan'));
            console.log(`     URLs discovered: ${ud.urlsDiscovered}`);
            console.log(`     Total candidates: ${ud.totalCandidates}`);
            console.log(`     Validated: ${ud.totalValidated}`);
            console.log(`     API calls: ${ud.apiCalls}`);
            console.log(`     Validation time: ${ud.validationTime}s`);
            console.log(`     Status: ${ud.success ? colorize('✓', 'green') : colorize('✗', 'red')}`);
        }

        if (results.components.decisionsWriter) {
            const dw = results.components.decisionsWriter;
            console.log(colorize('\n  5. Decisions Writer:', 'cyan'));
            console.log(`     Total references: ${dw.stats.totalReferences}`);
            console.log(`     Processing: ${dw.stats.processing}`);
            console.log(`     Finalized: ${dw.stats.finalized}`);
            console.log(`     With context: ${dw.stats.withContext}`);
            console.log(`     With relevance: ${dw.stats.withRelevance}`);
            console.log(`     With primary URL: ${dw.stats.withPrimaryUrl}`);
            console.log(`     With secondary URL: ${dw.stats.withSecondaryUrl}`);
            console.log(`     Status: ${dw.success ? colorize('✓', 'green') : colorize('✗', 'red')}`);
        }

        // Output File
        if (results.outputFile) {
            console.log('\n' + colorize('Output File:', 'bright'));
            console.log('  ' + colorize(results.outputFile, 'cyan'));
        }

        // Warnings
        if (results.warnings.length > 0) {
            console.log('\n' + colorize(`⚠️  WARNINGS (${results.warnings.length}):`, 'yellow'));
            results.warnings.forEach(warning => {
                console.log('  - ' + warning);
            });
        }

        // Errors
        if (results.errors.length > 0) {
            console.log('\n' + colorize(`❌ ERRORS (${results.errors.length}):`, 'red'));
            results.errors.forEach(error => {
                console.log('  - ' + error);
            });
        }

        // ====================================================================
        // SUCCESS CRITERIA EVALUATION
        // ====================================================================

        console.log('\n' + colorize('═'.repeat(80), 'cyan'));
        console.log(colorize('  SUCCESS CRITERIA EVALUATION', 'cyan'));
        console.log(colorize('═'.repeat(80), 'cyan'));

        const criteria = evaluateSuccessCriteria(results);

        console.log('\n' + colorize('Required (Must Have):', 'bright'));
        criteria.required.forEach(c => {
            const icon = c.pass ? colorize('✓', 'green') : colorize('✗', 'red');
            console.log(`  ${icon} ${c.name}`);
        });

        console.log('\n' + colorize('Desirable (Should Have):', 'bright'));
        criteria.desirable.forEach(c => {
            const icon = c.pass ? colorize('✓', 'green') : colorize('⚠', 'yellow');
            console.log(`  ${icon} ${c.name}`);
        });

        const allRequired = criteria.required.every(c => c.pass);
        const mostDesirable = criteria.desirable.filter(c => c.pass).length >= criteria.desirable.length * 0.7;

        console.log('\n' + colorize('Overall Assessment:', 'bright'));
        if (allRequired && mostDesirable) {
            console.log('  ' + colorize('✅ READY FOR PRODUCTION', 'green'));
        } else if (allRequired) {
            console.log('  ' + colorize('⚠️  ACCEPTABLE WITH WARNINGS', 'yellow'));
        } else {
            console.log('  ' + colorize('❌ NEEDS REFINEMENT', 'red'));
        }

        // ====================================================================
        // RECOMMENDATIONS
        // ====================================================================

        console.log('\n' + colorize('═'.repeat(80), 'cyan'));
        console.log(colorize('  RECOMMENDATIONS', 'cyan'));
        console.log(colorize('═'.repeat(80), 'cyan'));

        const recommendations = generateRecommendations(results, criteria);
        if (recommendations.length > 0) {
            recommendations.forEach((rec, i) => {
                console.log(`\n  ${i + 1}. ${rec}`);
            });
        } else {
            console.log('\n  ' + colorize('✓ No issues found - pipeline is working perfectly!', 'green'));
        }

        console.log('\n' + colorize('═'.repeat(80), 'cyan'));
        console.log(colorize('  TEST COMPLETE', 'cyan'));
        console.log(colorize('═'.repeat(80), 'cyan') + '\n');

        return results;

    } catch (error) {
        console.error('\n' + colorize('❌ TEST FAILED', 'red'));
        console.error(colorize('Error:', 'red'), error.message);
        console.error('\n' + colorize('Stack trace:', 'red'));
        console.error(error.stack);
        process.exit(1);
    }
}

// ============================================================================
// SUCCESS CRITERIA
// ============================================================================

function evaluateSuccessCriteria(results) {
    const required = [
        {
            name: 'Pipeline completed successfully',
            pass: results.success
        },
        {
            name: 'Citations parsed (> 0)',
            pass: results.stats.totalCitations > 0
        },
        {
            name: 'Contexts extracted',
            pass: results.components.contextExtractor?.success || false
        },
        {
            name: 'Output file created',
            pass: results.outputFile !== null
        },
        {
            name: 'No critical errors',
            pass: results.errors.length === 0
        }
    ];

    const desirable = [
        {
            name: 'Relevance generation succeeded',
            pass: results.components.relevanceGenerator?.success || false
        },
        {
            name: 'URL discovery succeeded',
            pass: results.components.urlDiscoverer?.success || false
        },
        {
            name: 'Most references have relevance (>80%)',
            pass: results.stats.totalCitations > 0 &&
                  (results.stats.withRelevance / results.stats.totalCitations) > 0.8
        },
        {
            name: 'Most references have URLs (>70%)',
            pass: results.stats.totalCitations > 0 &&
                  (results.stats.withUrls / results.stats.totalCitations) > 0.7
        },
        {
            name: 'Few warnings (<5)',
            pass: results.warnings.length < 5
        }
    ];

    return { required, desirable };
}

// ============================================================================
// RECOMMENDATIONS
// ============================================================================

function generateRecommendations(results, criteria) {
    const recommendations = [];

    // Check failed required criteria
    const failedRequired = criteria.required.filter(c => !c.pass);
    if (failedRequired.length > 0) {
        recommendations.push(`Critical: Fix ${failedRequired.length} required criteria failures`);
    }

    // Check component failures
    if (results.components.citationParser && !results.components.citationParser.success) {
        recommendations.push('Citation parser failed - check document format and bibliography');
    }

    if (results.components.relevanceGenerator && results.components.relevanceGenerator.failed > 0) {
        const failRate = results.components.relevanceGenerator.failed / results.stats.totalCitations;
        if (failRate > 0.1) {
            recommendations.push(`Relevance generation has high failure rate (${(failRate * 100).toFixed(1)}%) - check API key and rate limits`);
        }
    }

    if (results.components.urlDiscoverer && results.stats.withUrls < results.stats.totalCitations * 0.5) {
        recommendations.push('Low URL discovery rate (<50%) - check Google API credentials and search strategies');
    }

    // Check warnings
    if (results.warnings.length > 10) {
        recommendations.push(`High warning count (${results.warnings.length}) - review warning messages`);
    }

    // Performance recommendations
    if (results.stats.timeElapsed > 300) {
        recommendations.push('Pipeline took over 5 minutes - consider optimizing or using smaller batches');
    }

    return recommendations;
}

// ============================================================================
// COMMAND LINE PARSING
// ============================================================================

function parseArgs(args) {
    const options = {
        docxPath: null,
        enableRelevanceGeneration: true,
        enableUrlDiscovery: true,
        outputDir: null
    };

    for (const arg of args) {
        if (arg.startsWith('--')) {
            // Option flag
            if (arg === '--no-relevance') {
                options.enableRelevanceGeneration = false;
            } else if (arg === '--no-urls') {
                options.enableUrlDiscovery = false;
            } else if (arg.startsWith('--output-dir=')) {
                options.outputDir = arg.split('=')[1];
            }
        } else if (!options.docxPath) {
            // First non-option arg is the docx path
            options.docxPath = arg;
        }
    }

    return options;
}

// ============================================================================
// MAIN
// ============================================================================

if (require.main === module) {
    // Check command line arguments
    if (process.argv.length < 3) {
        console.log('\n' + colorize('Usage:', 'yellow'));
        console.log('  node v30/test-complete-pipeline.js <path-to-docx> [options]');
        console.log('\n' + colorize('Options:', 'yellow'));
        console.log('  --no-relevance      Skip relevance generation');
        console.log('  --no-urls           Skip URL discovery');
        console.log('  --output-dir=DIR    Specify output directory');
        console.log('\n' + colorize('Examples:', 'yellow'));
        console.log('  node v30/test-complete-pipeline.js v30/test-data/250714TheMythOfMaleMenopause.docx');
        console.log('  node v30/test-complete-pipeline.js v30/test-data/250625AuthoritarianAscentInTheUSA.docx --no-urls');
        console.log('  node v30/test-complete-pipeline.js v30/test-data/250916CaughtInTheAct.docx --output-dir=/tmp\n');
        process.exit(1);
    }

    const options = parseArgs(process.argv.slice(2));

    if (!options.docxPath) {
        console.error(colorize('\nError: No input file specified\n', 'red'));
        process.exit(1);
    }

    if (!options.outputDir) {
        options.outputDir = path.dirname(options.docxPath);
    }

    // Run the test
    runPipelineTest(options.docxPath, options)
        .then(results => {
            process.exit(results.success ? 0 : 1);
        })
        .catch(error => {
            console.error(colorize('Unexpected error:', 'red'), error);
            process.exit(1);
        });
}

module.exports = { runPipelineTest, evaluateSuccessCriteria, generateRecommendations };
