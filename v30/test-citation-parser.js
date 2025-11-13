/**
 * Test Script for Citation Parser
 *
 * Usage:
 *   node v30/test-citation-parser.js <path-to-docx-file>
 *
 * Example:
 *   node v30/test-citation-parser.js v30/test-data/250714TheMythOfMaleMenopause.docx
 */

const path = require('path');
const { parseCitations } = require('./server/services/citation-parser');

// ============================================================================
// COLOR CODES FOR TERMINAL OUTPUT
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

async function runTest(docxPath) {
    console.log(colorize('\n' + '='.repeat(80), 'cyan'));
    console.log(colorize('  CITATION PARSER TEST', 'cyan'));
    console.log(colorize('='.repeat(80), 'cyan'));

    console.log('\n' + colorize('Input file:', 'bright'), docxPath);
    console.log(colorize('Starting test...', 'blue'));

    try {
        // Run the parser
        const results = await parseCitations(docxPath, {
            preserveOriginal: true,
            outputFormat: 'both',
            extractContext: true
        });

        // ====================================================================
        // DISPLAY RESULTS
        // ====================================================================

        console.log('\n' + colorize('='.repeat(80), 'cyan'));
        console.log(colorize('  TEST RESULTS', 'cyan'));
        console.log(colorize('='.repeat(80), 'cyan'));

        // Success/Failure
        if (results.success) {
            console.log('\n' + colorize('✅ SUCCESS', 'green'));
        } else {
            console.log('\n' + colorize('❌ FAILURE', 'red'));
        }

        // Statistics
        console.log('\n' + colorize('📊 STATISTICS:', 'bright'));
        console.log('   Format detected:        ', colorize(results.stats.formatDetected, 'yellow'));
        console.log('   Citations found:        ', colorize(results.stats.citationsFound, 'yellow'));
        console.log('   Citations converted:    ', colorize(results.stats.citationsConverted, 'yellow'));
        console.log('   Bibliography entries:   ', colorize(results.stats.bibliographyEntries, 'yellow'));
        console.log('   Empty brackets:         ', colorize(results.stats.emptyBracketsFound, 'yellow'));
        console.log('   Paragraphs processed:   ', colorize(results.stats.paragraphsProcessed, 'yellow'));

        // Output files
        if (results.outputFile) {
            console.log('\n' + colorize('📄 OUTPUT FILES:', 'bright'));
            console.log('   HTML: ', colorize(results.outputFile, 'cyan'));
            if (results.outputTextFile) {
                console.log('   Text: ', colorize(results.outputTextFile, 'cyan'));
            }
        }

        // Conversions (show first 10)
        if (results.conversions.length > 0) {
            console.log('\n' + colorize('🔄 CONVERSIONS (first 10):', 'bright'));
            const displayCount = Math.min(10, results.conversions.length);
            for (let i = 0; i < displayCount; i++) {
                const conv = results.conversions[i];
                console.log(`   ${colorize(conv.original, 'red')} → ${colorize(conv.converted, 'green')} (para ${conv.paragraph})`);
            }
            if (results.conversions.length > 10) {
                console.log(`   ... and ${results.conversions.length - 10} more`);
            }
        }

        // Citation locations (show first 5 with context)
        if (results.citationLocations.length > 0) {
            console.log('\n' + colorize('📍 CITATION LOCATIONS (first 5 with context):', 'bright'));
            const displayCount = Math.min(5, results.citationLocations.length);
            for (let i = 0; i < displayCount; i++) {
                const loc = results.citationLocations[i];
                console.log(`\n   ${colorize(`[${loc.citationNumber}]`, 'green')} at position ${loc.position}`);
                console.log(`   Original: ${colorize(loc.originalFormat, 'yellow')}`);
                console.log(`   Paragraph: ${loc.paragraphIndex}`);
                console.log(`   Context: "${loc.context.substring(0, 100)}..."`);
            }
            if (results.citationLocations.length > 5) {
                console.log(`\n   ... and ${results.citationLocations.length - 5} more citation locations`);
            }
        }

        // Warnings
        if (results.warnings.length > 0) {
            console.log('\n' + colorize('⚠️  WARNINGS:', 'yellow'));
            results.warnings.forEach(warning => {
                console.log('   - ' + warning);
            });
        }

        // Errors
        if (results.errors.length > 0) {
            console.log('\n' + colorize('❌ ERRORS:', 'red'));
            results.errors.forEach(error => {
                console.log('   - ' + error);
            });
        }

        // Summary
        console.log('\n' + colorize('='.repeat(80), 'cyan'));
        console.log(colorize('  SUMMARY', 'cyan'));
        console.log(colorize('='.repeat(80), 'cyan'));

        const conversionRate = results.stats.citationsFound > 0
            ? (results.stats.citationsConverted / results.stats.citationsFound * 100).toFixed(1)
            : 0;

        console.log(`\n   Conversion rate: ${colorize(conversionRate + '%', 'yellow')}`);

        if (results.success) {
            console.log(`\n   ${colorize('✓', 'green')} Parser completed successfully`);
            if (results.warnings.length === 0) {
                console.log(`   ${colorize('✓', 'green')} No warnings`);
            } else {
                console.log(`   ${colorize('⚠', 'yellow')} ${results.warnings.length} warning(s) - review above`);
            }
            if (results.errors.length === 0) {
                console.log(`   ${colorize('✓', 'green')} No errors`);
            }
        }

        console.log('\n' + colorize('='.repeat(80), 'cyan'));
        console.log(colorize('  TEST COMPLETE', 'cyan'));
        console.log(colorize('='.repeat(80), 'cyan') + '\n');

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
// RUN TESTS
// ============================================================================

// Check command line arguments
if (process.argv.length < 3) {
    console.log('\n' + colorize('Usage:', 'yellow'));
    console.log('  node v30/test-citation-parser.js <path-to-docx-file>');
    console.log('\n' + colorize('Example:', 'yellow'));
    console.log('  node v30/test-citation-parser.js v30/test-data/250714TheMythOfMaleMenopause.docx');
    console.log('  node v30/test-citation-parser.js v30/test-data/250625AuthoritarianAscentInTheUSA.docx');
    console.log('  node v30/test-citation-parser.js v30/test-data/250916CaughtInTheAct.docx\n');
    process.exit(1);
}

const docxPath = process.argv[2];

// Run the test
runTest(docxPath)
    .then(results => {
        // Exit with appropriate code
        process.exit(results.success ? 0 : 1);
    })
    .catch(error => {
        console.error(colorize('Unexpected error:', 'red'), error);
        process.exit(1);
    });
