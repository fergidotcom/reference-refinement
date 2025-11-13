/**
 * Decisions.txt Writer - Component 5 of Phase 1
 *
 * Formats complete reference entries for decisions.txt output
 *
 * Format:
 * [ID] Bibliographic Entry. Relevance: Explanation... FLAGS[status] PRIMARY_URL[url] SECONDARY_URL[url]
 */

const fs = require('fs').promises;

/**
 * Format a single reference entry for decisions.txt
 *
 * @param {object} reference - Complete reference data
 * @param {number} reference.id - Citation ID number
 * @param {string} reference.bibEntry - Complete bibliographic entry
 * @param {string} reference.relevanceText - 200-word relevance explanation
 * @param {object} reference.urls - URL object with primary, secondary, tertiary
 * @param {array} reference.flags - Array of flags (e.g., ['FINALIZED', 'BATCH_v30.0'])
 * @returns {string} - Formatted entry
 */
function formatReferenceEntry(reference) {
    let entry = '';

    // Start with [ID] and bibliographic entry
    entry += `[${reference.id}] ${reference.bibEntry}`;

    // Add relevance if present
    if (reference.relevanceText) {
        entry += ` Relevance: ${reference.relevanceText}`;
    }

    // Add flags
    if (reference.flags && reference.flags.length > 0) {
        const flagsStr = reference.flags.join(' ');
        entry += ` FLAGS[${flagsStr}]`;
    }

    // Add URLs
    if (reference.urls) {
        if (reference.urls.primary) {
            entry += ` PRIMARY_URL[${reference.urls.primary}]`;
        }
        if (reference.urls.secondary) {
            entry += ` SECONDARY_URL[${reference.urls.secondary}]`;
        }
        if (reference.urls.tertiary) {
            entry += ` TERTIARY_URL[${reference.urls.tertiary}]`;
        }
    }

    return entry;
}

/**
 * Write all references to decisions.txt file
 *
 * @param {array} references - Array of reference objects
 * @param {string} outputPath - Path to output file
 * @param {object} options - Options
 * @param {boolean} options.append - Whether to append or overwrite
 * @returns {Promise<object>} - Results with success status
 */
async function writeDecisionsFile(references, outputPath, options = {}) {
    const results = {
        success: false,
        outputFile: outputPath,
        stats: {
            totalReferences: references.length,
            withRelevance: 0,
            withUrls: 0,
            finalized: 0
        },
        warnings: [],
        errors: []
    };

    try {
        // Format all entries
        const formattedEntries = [];

        for (const ref of references) {
            // Validate reference has minimum required data
            if (!ref.id || !ref.bibEntry) {
                results.warnings.push(`Reference missing ID or bibliographic entry - skipping`);
                continue;
            }

            const entry = formatReferenceEntry(ref);
            formattedEntries.push(entry);

            // Update stats
            if (ref.relevanceText) results.stats.withRelevance++;
            if (ref.urls && ref.urls.primary) results.stats.withUrls++;
            if (ref.flags && ref.flags.includes('FINALIZED')) results.stats.finalized++;
        }

        // Join with newlines
        const content = formattedEntries.join('\n');

        // Write or append to file
        if (options.append) {
            await fs.appendFile(outputPath, '\n' + content, 'utf-8');
        } else {
            await fs.writeFile(outputPath, content, 'utf-8');
        }

        results.success = true;

    } catch (error) {
        results.success = false;
        results.errors.push(`Failed to write decisions file: ${error.message}`);
    }

    return results;
}

/**
 * Parse existing decisions.txt file
 * (Useful for updating or appending to existing file)
 *
 * @param {string} filePath - Path to decisions.txt
 * @returns {Promise<array>} - Array of parsed reference objects
 */
async function parseDecisionsFile(filePath) {
    const references = [];

    try {
        const content = await fs.readFile(filePath, 'utf-8');
        const lines = content.split('\n').filter(line => line.trim().length > 0);

        for (const line of lines) {
            const ref = parseReferenceLine(line);
            if (ref) {
                references.push(ref);
            }
        }
    } catch (error) {
        // File doesn't exist or can't be read
        throw new Error(`Failed to parse decisions file: ${error.message}`);
    }

    return references;
}

/**
 * Parse a single reference line from decisions.txt
 *
 * @param {string} line - Single line from decisions.txt
 * @returns {object|null} - Parsed reference object or null
 */
function parseReferenceLine(line) {
    // Extract ID
    const idMatch = line.match(/^\[(\d+)\]/);
    if (!idMatch) return null;

    const id = parseInt(idMatch[1]);

    // Extract FLAGS
    const flagsMatch = line.match(/FLAGS\[([^\]]+)\]/);
    const flags = flagsMatch ? flagsMatch[1].split(' ') : [];

    // Extract PRIMARY_URL
    const primaryMatch = line.match(/PRIMARY_URL\[([^\]]+)\]/);
    const primaryUrl = primaryMatch ? primaryMatch[1] : null;

    // Extract SECONDARY_URL
    const secondaryMatch = line.match(/SECONDARY_URL\[([^\]]+)\]/);
    const secondaryUrl = secondaryMatch ? secondaryMatch[1] : null;

    // Extract TERTIARY_URL
    const tertiaryMatch = line.match(/TERTIARY_URL\[([^\]]+)\]/);
    const tertiaryUrl = tertiaryMatch ? tertiaryMatch[1] : null;

    // Extract Relevance
    const relevanceMatch = line.match(/Relevance:\s*([^F]*?)(?=\s*FLAGS\[|$)/);
    const relevanceText = relevanceMatch ? relevanceMatch[1].trim() : '';

    // Extract bibliographic entry (everything between [ID] and "Relevance:" or "FLAGS[")
    let bibEntry = '';
    const bibMatch = line.match(/^\[\d+\]\s*(.+?)(?=\s+Relevance:|\s+FLAGS\[)/);
    if (bibMatch) {
        bibEntry = bibMatch[1].trim();
    }

    return {
        id,
        bibEntry,
        relevanceText,
        urls: {
            primary: primaryUrl,
            secondary: secondaryUrl,
            tertiary: tertiaryUrl
        },
        flags
    };
}

/**
 * Generate Final.txt from decisions.txt
 * Final.txt contains only finalized references with simplified format
 *
 * @param {array} references - Array of reference objects
 * @param {string} outputPath - Path to Final.txt
 * @returns {Promise<object>} - Results with success status
 */
async function writeFinalFile(references, outputPath) {
    const results = {
        success: false,
        outputFile: outputPath,
        stats: {
            totalReferences: 0,
            skipped: 0
        },
        warnings: [],
        errors: []
    };

    try {
        // Filter to only finalized references
        const finalized = references.filter(ref =>
            ref.flags && ref.flags.includes('FINALIZED')
        );

        if (finalized.length === 0) {
            results.warnings.push('No finalized references to write');
            return results;
        }

        // Format for Final.txt (simplified format)
        const entries = finalized.map(ref => {
            let entry = `[${ref.id}] ${ref.bibEntry}`;

            if (ref.urls && ref.urls.primary) {
                entry += `\nPrimary URL: ${ref.urls.primary}`;
            }
            if (ref.urls && ref.urls.secondary) {
                entry += `\nSecondary URL: ${ref.urls.secondary}`;
            }

            return entry;
        });

        const content = entries.join('\n\n');
        await fs.writeFile(outputPath, content, 'utf-8');

        results.stats.totalReferences = finalized.length;
        results.stats.skipped = references.length - finalized.length;
        results.success = true;

    } catch (error) {
        results.success = false;
        results.errors.push(`Failed to write Final.txt: ${error.message}`);
    }

    return results;
}

// Export functions
module.exports = {
    formatReferenceEntry,
    writeDecisionsFile,
    parseDecisionsFile,
    parseReferenceLine,
    writeFinalFile
};

// Example usage
if (require.main === module) {
    // Test data
    const testReferences = [
        {
            id: 1,
            bibEntry: 'Smith, J. (2020). The Effects of Climate Change. Nature, 123(4), 567-890.',
            relevanceText: 'This study examines the relationship between climate change and coastal ecosystems, finding significant biodiversity loss. The research provides critical evidence for understanding environmental impacts on marine life and demonstrates how warming temperatures affect species distribution patterns across multiple ocean regions.',
            urls: {
                primary: 'https://doi.org/10.1038/example123',
                secondary: 'https://nature.com/articles/backup'
            },
            flags: ['FINALIZED', 'BATCH_v30.0']
        },
        {
            id: 2,
            bibEntry: 'Jones, M. (2019). Political Discourse in the Digital Age. Journal of Politics, 45(2), 234-256.',
            relevanceText: 'Jones provides a comprehensive analysis of how digital platforms transform political communication, demonstrating the shift from traditional media to algorithm-driven content distribution.',
            urls: {
                primary: 'https://jstor.org/stable/12345'
            },
            flags: ['FINALIZED']
        }
    ];

    console.log('\n=== Decisions.txt Writer Test ===\n');
    console.log('Formatting test references...\n');

    // Test individual formatting
    console.log('Reference 1:');
    console.log(formatReferenceEntry(testReferences[0]));
    console.log('\nReference 2:');
    console.log(formatReferenceEntry(testReferences[1]));

    // Test file writing
    const testFile = '/tmp/test_decisions.txt';
    writeDecisionsFile(testReferences, testFile)
        .then(results => {
            console.log('\n=== Write Results ===');
            console.log(`Success: ${results.success}`);
            console.log(`Output: ${results.outputFile}`);
            console.log('\nStats:');
            console.log(`  Total references: ${results.stats.totalReferences}`);
            console.log(`  With relevance: ${results.stats.withRelevance}`);
            console.log(`  With URLs: ${results.stats.withUrls}`);
            console.log(`  Finalized: ${results.stats.finalized}`);

            if (results.warnings.length > 0) {
                console.log('\nWarnings:');
                results.warnings.forEach(w => console.log(`  - ${w}`));
            }

            if (results.errors.length > 0) {
                console.log('\nErrors:');
                results.errors.forEach(e => console.log(`  - ${e}`));
            }

            // Test parsing
            console.log('\n=== Testing Parser ===');
            return parseDecisionsFile(testFile);
        })
        .then(parsed => {
            console.log(`Parsed ${parsed.length} references successfully`);
            console.log('\nParsed Reference 1:');
            console.log(JSON.stringify(parsed[0], null, 2));
        })
        .catch(error => {
            console.error('Fatal error:', error.message);
            process.exit(1);
        });
}
