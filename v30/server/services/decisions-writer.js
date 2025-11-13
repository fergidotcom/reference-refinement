/**
 * Decisions.txt Writer for Reference Refinement v30.0
 * Component 5 of Phase 1
 *
 * Export all processed references to decisions.txt format
 * Final output of Phase 1 - ready for author refinement in Phase 2
 *
 * Format features:
 * - Complete metadata (context, relevance, URLs, location)
 * - FLAGS system for tracking processing history
 * - Backward compatible with v18.0/v21.0 format
 * - Round-trip capable (can be read back and modified)
 */

const fs = require('fs').promises;
const path = require('path');

// ============================================================================
// MAIN WRITER FUNCTION
// ============================================================================

/**
 * Write all references to decisions.txt format
 *
 * @param {Array} references - Array of complete reference objects
 * @param {string} outputPath - Path to output file
 * @param {object} options - Configuration options
 * @returns {Promise<object>} Writer results
 */
async function writeDecisions(references, outputPath, options = {}) {
    const opts = {
        includeContext: true,
        includeRelevance: true,
        includeUrls: true,
        includeLocation: true,
        includeQuery: true,
        includeFlags: true,
        defaultStatus: 'PROCESSING',  // or 'FINALIZED'
        ...options
    };

    const results = {
        success: false,
        outputFile: outputPath,
        stats: {
            totalReferences: 0,
            processing: 0,
            finalized: 0,
            withContext: 0,
            withRelevance: 0,
            withPrimaryUrl: 0,
            withSecondaryUrl: 0,
            flagsApplied: {}
        },
        warnings: [],
        errors: []
    };

    try {
        console.log(`\n📝 Writing decisions.txt...`);
        console.log(`   Output: ${outputPath}`);
        console.log(`   References: ${references.length}`);

        // Ensure output directory exists
        const outputDir = path.dirname(outputPath);
        await fs.mkdir(outputDir, { recursive: true });

        // ====================================================================
        // FORMAT EACH REFERENCE
        // ====================================================================

        const formattedRefs = [];

        for (const ref of references) {
            try {
                const formatted = formatReference(ref, opts);
                formattedRefs.push(formatted);

                // Update stats
                results.stats.totalReferences++;

                if (ref.status === 'FINALIZED') {
                    results.stats.finalized++;
                } else {
                    results.stats.processing++;
                }

                if (ref.context) results.stats.withContext++;
                if (ref.relevanceText) results.stats.withRelevance++;
                if (ref.primaryUrl) results.stats.withPrimaryUrl++;
                if (ref.secondaryUrl) results.stats.withSecondaryUrl++;

                // Count flags
                if (ref.flags) {
                    for (const flag of ref.flags) {
                        results.stats.flagsApplied[flag] = (results.stats.flagsApplied[flag] || 0) + 1;
                    }
                }

            } catch (error) {
                results.warnings.push(
                    `Failed to format reference ${ref.citationId}: ${error.message}`
                );
            }
        }

        // ====================================================================
        // WRITE TO FILE
        // ====================================================================

        const content = formattedRefs.join('\n\n');
        await fs.writeFile(outputPath, content, 'utf8');

        results.success = true;

        console.log('   ✓ File written successfully');
        console.log(`\n📊 Statistics:`);
        console.log(`   Total references: ${results.stats.totalReferences}`);
        console.log(`   Processing: ${results.stats.processing}`);
        console.log(`   Finalized: ${results.stats.finalized}`);
        console.log(`   With context: ${results.stats.withContext}`);
        console.log(`   With relevance: ${results.stats.withRelevance}`);
        console.log(`   With primary URL: ${results.stats.withPrimaryUrl}`);
        console.log(`   With secondary URL: ${results.stats.withSecondaryUrl}`);

        if (Object.keys(results.stats.flagsApplied).length > 0) {
            console.log(`\n   Flags applied:`);
            for (const [flag, count] of Object.entries(results.stats.flagsApplied)) {
                console.log(`     ${flag}: ${count}`);
            }
        }

        if (results.warnings.length > 0) {
            console.log(`\n⚠️  ${results.warnings.length} warning(s):`);
            results.warnings.forEach(w => console.log(`   - ${w}`));
        }

    } catch (error) {
        results.errors.push(`Failed to write decisions.txt: ${error.message}`);
        results.success = false;
        console.error(`\n❌ Error: ${error.message}`);
    }

    return results;
}

// ============================================================================
// REFERENCE FORMATTING
// ============================================================================

/**
 * Format a single reference in decisions.txt format
 *
 * @param {object} ref - Reference object
 * @param {object} opts - Formatting options
 * @returns {string} Formatted reference text
 */
function formatReference(ref, opts) {
    const lines = [];

    // ====================================================================
    // LINE 1: Citation text
    // ====================================================================

    const citationText = ref.citationText || `[${ref.citationId}] (No bibliographic data)`;
    lines.push(citationText);

    // ====================================================================
    // LINE 2: Status flag
    // ====================================================================

    const status = ref.status || opts.defaultStatus;
    lines.push(`[${status}]`);

    // ====================================================================
    // RELEVANCE
    // ====================================================================

    if (opts.includeRelevance && ref.relevanceText) {
        // Ensure starts with "Relevance:"
        let relevance = ref.relevanceText.trim();
        if (!relevance.startsWith('Relevance:')) {
            relevance = 'Relevance: ' + relevance;
        }
        lines.push(relevance);
    }

    // ====================================================================
    // CONTEXT
    // ====================================================================

    if (opts.includeContext && ref.context) {
        lines.push(`Context: "${ref.context}"`);
    }

    // ====================================================================
    // LOCATION
    // ====================================================================

    if (opts.includeLocation) {
        const locationParts = [];

        if (ref.sectionTitle) {
            if (ref.sectionNumber) {
                locationParts.push(`Section ${ref.sectionNumber} - ${ref.sectionTitle}`);
            } else {
                locationParts.push(ref.sectionTitle);
            }
        }

        if (ref.paragraphNumber !== undefined && ref.paragraphNumber !== null) {
            locationParts.push(`Paragraph ${ref.paragraphNumber}`);
        }

        if (ref.pageNumber) {
            locationParts.push(`Page ${ref.pageNumber}`);
        }

        if (locationParts.length > 0) {
            lines.push(`Location: ${locationParts.join(', ')}`);
        }
    }

    // ====================================================================
    // URLS
    // ====================================================================

    if (opts.includeUrls) {
        if (ref.primaryUrl) {
            lines.push(`Primary URL: ${ref.primaryUrl}`);
        }

        if (ref.secondaryUrl) {
            lines.push(`Secondary URL: ${ref.secondaryUrl}`);
        }

        if (ref.tertiaryUrl) {
            lines.push(`Tertiary URL: ${ref.tertiaryUrl}`);
        }
    }

    // ====================================================================
    // QUERY
    // ====================================================================

    if (opts.includeQuery && ref.searchQuery) {
        lines.push(`Q: ${ref.searchQuery}`);
    }

    if (opts.includeQuery && ref.strategyUsed) {
        lines.push(`Strategy: ${ref.strategyUsed}`);
    }

    // ====================================================================
    // FLAGS
    // ====================================================================

    if (opts.includeFlags && ref.flags && ref.flags.length > 0) {
        const flagsStr = ref.flags.map(f => f.toUpperCase()).join('][');
        lines.push(`FLAGS[${flagsStr}]`);
    }

    return lines.join('\n');
}

// ============================================================================
// READING/PARSING (for round-trip capability)
// ============================================================================

/**
 * Parse decisions.txt file back into reference objects
 *
 * @param {string} filePath - Path to decisions.txt
 * @returns {Promise<Array>} Array of reference objects
 */
async function readDecisions(filePath) {
    const content = await fs.readFile(filePath, 'utf8');
    const references = [];

    // Split by double newline (reference separator)
    const blocks = content.split(/\n\n+/);

    for (const block of blocks) {
        const lines = block.trim().split('\n');
        if (lines.length === 0) continue;

        const ref = {
            citationText: '',
            status: 'PROCESSING',
            relevanceText: '',
            context: '',
            sectionTitle: '',
            sectionNumber: '',
            paragraphNumber: null,
            pageNumber: null,
            primaryUrl: '',
            secondaryUrl: '',
            tertiaryUrl: '',
            searchQuery: '',
            strategyUsed: '',
            flags: []
        };

        // Parse each line
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            if (i === 0) {
                // First line: citation text
                ref.citationText = line;

                // Extract citation ID
                const idMatch = line.match(/^\[(\d+)\]/);
                if (idMatch) {
                    ref.citationId = parseInt(idMatch[1]);
                }

            } else if (line.startsWith('[') && line.endsWith(']') && !line.startsWith('FLAGS')) {
                // Status line
                ref.status = line.slice(1, -1);

            } else if (line.startsWith('Relevance:')) {
                // Relevance (may span multiple lines)
                let relevance = line;
                let j = i + 1;
                while (j < lines.length &&
                       !lines[j].startsWith('Context:') &&
                       !lines[j].startsWith('Location:') &&
                       !lines[j].startsWith('Primary URL:') &&
                       !lines[j].startsWith('Secondary URL:') &&
                       !lines[j].startsWith('Tertiary URL:') &&
                       !lines[j].startsWith('Q:') &&
                       !lines[j].startsWith('Strategy:') &&
                       !lines[j].startsWith('FLAGS')) {
                    relevance += ' ' + lines[j].trim();
                    j++;
                }
                ref.relevanceText = relevance;
                i = j - 1;

            } else if (line.startsWith('Context:')) {
                ref.context = line.substring(8).trim().replace(/^"|"$/g, '');

            } else if (line.startsWith('Location:')) {
                parseLocation(line.substring(9).trim(), ref);

            } else if (line.startsWith('Primary URL:')) {
                ref.primaryUrl = line.substring(12).trim();

            } else if (line.startsWith('Secondary URL:')) {
                ref.secondaryUrl = line.substring(14).trim();

            } else if (line.startsWith('Tertiary URL:')) {
                ref.tertiaryUrl = line.substring(13).trim();

            } else if (line.startsWith('Q:')) {
                ref.searchQuery = line.substring(2).trim();

            } else if (line.startsWith('Strategy:')) {
                ref.strategyUsed = line.substring(9).trim();

            } else if (line.startsWith('FLAGS[')) {
                // Parse flags
                const flagsMatch = line.match(/FLAGS\[(.*)\]/);
                if (flagsMatch) {
                    ref.flags = flagsMatch[1].split('][').map(f => f.trim());
                }
            }
        }

        references.push(ref);
    }

    return references;
}

/**
 * Parse location string and update reference object
 *
 * @param {string} locationStr - Location string
 * @param {object} ref - Reference object to update
 */
function parseLocation(locationStr, ref) {
    // Parse: "Section 3.2 - Methodology, Paragraph 15, Page 47"
    const parts = locationStr.split(',').map(p => p.trim());

    for (const part of parts) {
        if (part.startsWith('Section')) {
            const sectionMatch = part.match(/Section\s+([\d.]+)\s*-\s*(.+)/);
            if (sectionMatch) {
                ref.sectionNumber = sectionMatch[1];
                ref.sectionTitle = sectionMatch[2];
            } else {
                ref.sectionTitle = part.substring(7).trim();
            }
        } else if (part.startsWith('Paragraph')) {
            const paraMatch = part.match(/Paragraph\s+(\d+)/);
            if (paraMatch) {
                ref.paragraphNumber = parseInt(paraMatch[1]);
            }
        } else if (part.startsWith('Page')) {
            const pageMatch = part.match(/Page\s+(\d+)/);
            if (pageMatch) {
                ref.pageNumber = parseInt(pageMatch[1]);
            }
        }
    }
}

// ============================================================================
// FLAG MANAGEMENT
// ============================================================================

/**
 * Add flags to a reference
 *
 * @param {object} ref - Reference object
 * @param {Array|string} flags - Flag(s) to add
 */
function addFlags(ref, flags) {
    if (!ref.flags) {
        ref.flags = [];
    }

    const flagsToAdd = Array.isArray(flags) ? flags : [flags];

    for (const flag of flagsToAdd) {
        if (!ref.flags.includes(flag)) {
            ref.flags.push(flag);
        }
    }
}

/**
 * Remove flags from a reference
 *
 * @param {object} ref - Reference object
 * @param {Array|string} flags - Flag(s) to remove
 */
function removeFlags(ref, flags) {
    if (!ref.flags) return;

    const flagsToRemove = Array.isArray(flags) ? flags : [flags];
    ref.flags = ref.flags.filter(f => !flagsToRemove.includes(f));
}

/**
 * Check if reference has flag
 *
 * @param {object} ref - Reference object
 * @param {string} flag - Flag to check
 * @returns {boolean} True if has flag
 */
function hasFlag(ref, flag) {
    return ref.flags && ref.flags.includes(flag);
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Create backup of existing decisions.txt file
 *
 * @param {string} filePath - Path to file
 * @returns {Promise<string>} Backup file path
 */
async function backupFile(filePath) {
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const parsedPath = path.parse(filePath);
        const backupPath = path.join(
            parsedPath.dir,
            `${parsedPath.name}_backup_${timestamp}${parsedPath.ext}`
        );

        await fs.copyFile(filePath, backupPath);
        console.log(`   ✓ Backup created: ${path.basename(backupPath)}`);

        return backupPath;

    } catch (error) {
        if (error.code === 'ENOENT') {
            // File doesn't exist - no backup needed
            return null;
        }
        throw error;
    }
}

/**
 * Merge new data into existing decisions.txt
 *
 * @param {string} existingFile - Path to existing decisions.txt
 * @param {Array} newReferences - Array of new/updated references
 * @param {string} outputFile - Path to output file
 * @returns {Promise<object>} Merge results
 */
async function mergeDecisions(existingFile, newReferences, outputFile) {
    // Read existing references
    const existing = await readDecisions(existingFile);

    // Create map by citation ID
    const existingMap = new Map();
    for (const ref of existing) {
        if (ref.citationId) {
            existingMap.set(ref.citationId, ref);
        }
    }

    // Merge new data
    let updated = 0;
    let added = 0;

    for (const newRef of newReferences) {
        if (!newRef.citationId) continue;

        if (existingMap.has(newRef.citationId)) {
            // Update existing
            const existingRef = existingMap.get(newRef.citationId);
            Object.assign(existingRef, newRef);
            updated++;
        } else {
            // Add new
            existing.push(newRef);
            added++;
        }
    }

    // Write merged result
    const result = await writeDecisions(existing, outputFile);

    return {
        ...result,
        merged: {
            existing: existingMap.size,
            updated,
            added
        }
    };
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
    // Main functions
    writeDecisions,
    readDecisions,
    mergeDecisions,

    // Formatting
    formatReference,

    // Flag management
    addFlags,
    removeFlags,
    hasFlag,

    // Utilities
    backupFile,
    parseLocation
};
