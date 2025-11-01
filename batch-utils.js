/**
 * Batch Processing Utilities
 * Helper functions for Reference Refinement batch processor
 */

import fs from 'fs/promises';
import { existsSync } from 'fs';
import chalk from 'chalk';

/**
 * Parse decisions.txt into reference objects
 */
export function parseDecisionsFile(content) {
    const references = [];
    let currentRef = null;
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        // Reference line: [ID] Author (YEAR). Title. Other info.
        const refMatch = trimmed.match(/^\[(\d+)\]\s+(.+)/);
        if (refMatch) {
            // Save previous reference
            if (currentRef) {
                references.push(currentRef);
            }

            // Start new reference
            const id = parseInt(refMatch[1]);
            const rest = refMatch[2];

            currentRef = {
                id,
                rawLine: line,
                title: '',
                authors: '',
                year: '',
                other: '',
                relevance_text: '',
                urls: {
                    primary: '',
                    secondary: '',
                    tertiary: ''
                },
                queries: [],
                finalized: false,
                manual_review: false,
                batch_version: null,
                flags: []
            };

            // Parse the rest of the line (handles both formats)
            const parsedInfo = parseReferenceLine(rest);
            Object.assign(currentRef, parsedInfo);

            // Extract URLs from bracket notation (compact format)
            const primaryUrlMatch = rest.match(/PRIMARY_URL\[([^\]]+)\]/);
            if (primaryUrlMatch) {
                currentRef.urls.primary = primaryUrlMatch[1];
            }
            const secondaryUrlMatch = rest.match(/SECONDARY_URL\[([^\]]+)\]/);
            if (secondaryUrlMatch) {
                currentRef.urls.secondary = secondaryUrlMatch[1];
            }
            const tertiaryUrlMatch = rest.match(/TERTIARY_URL\[([^\]]+)\]/);
            if (tertiaryUrlMatch) {
                currentRef.urls.tertiary = tertiaryUrlMatch[1];
            }

            // Extract FLAGS from bracket notation
            const flagsMatch = rest.match(/FLAGS\[([^\]]+)\]/);
            if (flagsMatch) {
                const flags = flagsMatch[1].split(/\s+/);
                currentRef.flags.push(...flags);
                if (flags.includes('FINALIZED')) {
                    currentRef.finalized = true;
                }
                if (flags.includes('MANUAL_REVIEW')) {
                    currentRef.manual_review = true;
                }
                // Extract BATCH version (e.g., BATCH_v16.0)
                const batchFlag = flags.find(f => f.startsWith('BATCH_'));
                if (batchFlag) {
                    currentRef.batch_version = batchFlag.replace('BATCH_', '');
                }
            }

            // Extract Relevance from inline format
            // Match everything after "Relevance: " until we hit a space followed by FLAGS[, PRIMARY_URL[, SECONDARY_URL[, or end of string
            const relevanceMatch = rest.match(/Relevance:\s*(.+?)(?=\s+FLAGS\[|\s+PRIMARY_URL\[|\s+SECONDARY_URL\[|$)/);
            if (relevanceMatch) {
                currentRef.relevance_text = relevanceMatch[1].trim();
            } else {
                // v14.8: Handle unlabeled relevance text
                // Extract everything after bibliographic info and before FLAGS
                // Remove FLAGS/URLs from end to isolate text
                let textOnly = rest.replace(/\s*FLAGS\[[^\]]*\]/g, '')
                                  .replace(/\s*PRIMARY_URL\[[^\]]*\]/g, '')
                                  .replace(/\s*SECONDARY_URL\[[^\]]*\]/g, '')
                                  .replace(/\s*TERTIARY_URL\[[^\]]*\]/g, '')
                                  .trim();

                // Find end of bibliographic info using publication end markers
                const pubEndPatterns = [
                    /(?:Press|Publications?|University|Institute|Foundation|Bureau|Center|Centre)\./i,
                    /ISBN[:\s]+[\dXx\-]+/i,
                    /DOI[:\s]+[\d\.\/]+/i,
                    /pp?\.\s*\d+[\-–]\d+/i,
                    /Vol\.\s*\d+,?\s*No\.\s*\d+/i
                ];

                let relevanceStartIndex = -1;
                for (const pattern of pubEndPatterns) {
                    const match = textOnly.match(pattern);
                    if (match) {
                        const matchEnd = match.index + match[0].length;
                        if (matchEnd > relevanceStartIndex) {
                            relevanceStartIndex = matchEnd;
                        }
                    }
                }

                // Extract everything after the last biblio marker
                if (relevanceStartIndex > 0 && relevanceStartIndex < textOnly.length) {
                    const potentialRelevance = textOnly.substring(relevanceStartIndex).trim();
                    // Only use if it's substantial
                    if (potentialRelevance.length > 20) {
                        currentRef.relevance_text = potentialRelevance;
                    }
                }
            }
        }
        // Finalized flag
        else if (trimmed === '[FINALIZED]' && currentRef) {
            currentRef.finalized = true;
            currentRef.flags.push('FINALIZED');
        }
        // Relevance text
        else if (trimmed.startsWith('Relevance:') && currentRef) {
            currentRef.relevance_text = trimmed.replace('Relevance:', '').trim();
        }
        // URLs
        else if (trimmed.startsWith('Primary URL:') && currentRef) {
            currentRef.urls.primary = trimmed.replace('Primary URL:', '').trim();
        }
        else if (trimmed.startsWith('Secondary URL:') && currentRef) {
            currentRef.urls.secondary = trimmed.replace('Secondary URL:', '').trim();
        }
        else if (trimmed.startsWith('Tertiary URL:') && currentRef) {
            currentRef.urls.tertiary = trimmed.replace('Tertiary URL:', '').trim();
        }
        // NOTE: Queries are NOT stored in decisions.txt anymore
        // If we encounter legacy Q: lines, skip them
        else if (trimmed.startsWith('Q:') && currentRef) {
            // Skip - queries are generated fresh each time, not persisted
            continue;
        }
        // FLAGS[] blocks
        else if (trimmed.startsWith('FLAGS[') && currentRef) {
            const flagsMatch = trimmed.match(/FLAGS\[([^\]]+)\]/);
            if (flagsMatch) {
                const flags = flagsMatch[1].split(/\s+/);
                currentRef.flags.push(...flags);
            }
        }
    }

    // Add last reference
    if (currentRef) {
        references.push(currentRef);
    }

    return references;
}

/**
 * Clean common title parsing errors
 * Removes date prefixes, trailing dots, and publisher contamination
 */
function cleanTitle(title) {
    if (!title) return '';

    let cleaned = title;

    // Remove date prefix patterns: "November 10) " or "January 31, 2024) " or "September) "
    const datePrefix = /^(January|February|March|April|May|June|July|August|September|October|November|December)(?:\s+\d{1,2})?(?:,?\s+\d{4})?\)\s+/i;
    cleaned = cleaned.replace(datePrefix, '');

    // Remove trailing ellipsis (3 or more consecutive dots)
    cleaned = cleaned.replace(/\.{3,}$/, '');

    // Remove common publisher contamination from end
    // Pattern: ends with short capitalized segment like "Census.gov" or "American Public Media"
    // But be careful not to remove actual title words
    const publisherPattern = /\.\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3}|[A-Z]{2,}(?:\.[a-z]+)?)\s*$/;
    const publisherMatch = cleaned.match(publisherPattern);
    if (publisherMatch) {
        const potentialPublisher = publisherMatch[1];
        // Only remove if it looks like a publisher (short, no lowercase start, common patterns)
        if (potentialPublisher.length < 50 &&
            (potentialPublisher.includes('.') || // like "Census.gov"
             /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+$/.test(potentialPublisher) || // like "American Public Media"
             /^[A-Z]{2,}$/.test(potentialPublisher))) { // like "UNESCO"
            cleaned = cleaned.substring(0, cleaned.length - publisherMatch[0].length).trim();
        }
    }

    return cleaned.trim();
}

/**
 * Parse a reference line to extract title, authors, year, other
 * Handles both compact single-line format and multi-line format
 */
function parseReferenceLine(line) {
    const result = {
        title: '',
        authors: '',
        year: '',
        other: ''
    };

    // Strip compact format metadata (Relevance, FLAGS, URLs) before parsing bibliographic info
    // Extract only the bibliographic portion (before "Relevance:" or "FLAGS[" or "PRIMARY_URL[")
    let bibLine = line;
    const metadataStart = line.search(/\s+(Relevance:|FLAGS\[|PRIMARY_URL\[|SECONDARY_URL\[)/);
    if (metadataStart !== -1) {
        bibLine = line.substring(0, metadataStart).trim();
    }

    // Try to extract year: (YYYY)
    const yearMatch = bibLine.match(/\((\d{4})\)/);
    if (yearMatch) {
        result.year = yearMatch[1];

        // Split on year to get before and after
        const parts = bibLine.split(`(${result.year})`);
        const beforeYear = parts[0].trim();
        const afterYear = parts.slice(1).join('').trim();

        // Before year is authors
        result.authors = beforeYear;

        // After year: extract title and other
        // Title usually ends with a period before publisher info
        const titleMatch = afterYear.match(/^\.?\s*([^.]+)\./);
        if (titleMatch) {
            result.title = cleanTitle(titleMatch[1].trim());
            // Everything after title is "other"
            const titleEnd = afterYear.indexOf(titleMatch[1]) + titleMatch[1].length + 1;
            result.other = afterYear.substring(titleEnd).trim();
        } else {
            // No period found, whole thing might be title
            result.title = cleanTitle(afterYear.replace(/^\.?\s*/, '').trim());
        }
    } else {
        // No year found, try to parse anyway
        // Assume format: Authors. Title. Other.
        const parts = bibLine.split('.');
        if (parts.length >= 2) {
            result.authors = parts[0].trim();
            result.title = cleanTitle(parts[1].trim());
            if (parts.length > 2) {
                result.other = parts.slice(2).join('.').trim();
            }
        } else {
            result.title = cleanTitle(bibLine.trim());
        }
    }

    return result;
}

/**
 * Write references back to decisions.txt format
 */
export function formatDecisionsFile(references) {
    const lines = [];

    for (const ref of references) {
        // NEW COMPACT SINGLE-LINE FORMAT (matching iPad app)
        // Format: [RID] Author (Year). Title. Other. Relevance: text FLAGS[FINALIZED] PRIMARY_URL[...] SECONDARY_URL[...]

        let entry = `[${ref.id}] `;

        // Add author if present
        if (ref.authors) {
            entry += `${ref.authors} `;
        }

        // Add year if present
        if (ref.year) {
            entry += `(${ref.year}). `;
        }

        // Add title if present
        if (ref.title) {
            entry += `${ref.title}. `;
        }

        // Add other bibliographic information if present
        if (ref.other) {
            entry += `${ref.other}. `;
        }

        // Add relevance text if present
        if (ref.relevance_text) {
            entry += `Relevance: ${ref.relevance_text} `;
        }

        // Add FLAGS if finalized or needs manual review
        const flagsToWrite = [];
        if (ref.finalized || ref.flags.includes('FINALIZED')) {
            flagsToWrite.push('FINALIZED');
        }
        if (ref.manual_review && !ref.finalized) {
            // Only add MANUAL_REVIEW if not finalized
            flagsToWrite.push('MANUAL_REVIEW');
        }
        // Add BATCH version if present
        if (ref.batch_version) {
            flagsToWrite.push(`BATCH_${ref.batch_version}`);
        }
        if (flagsToWrite.length > 0) {
            entry += `FLAGS[${flagsToWrite.join(' ')}] `;
        }

        // Add URLs in bracket format
        if (ref.urls.primary) {
            entry += `PRIMARY_URL[${ref.urls.primary}] `;
        }
        if (ref.urls.secondary) {
            entry += `SECONDARY_URL[${ref.urls.secondary}] `;
        }
        if (ref.urls.tertiary) {
            entry += `TERTIARY_URL[${ref.urls.tertiary}] `;
        }

        lines.push(entry.trim());

        // NOTE: Queries are NOT persisted to decisions.txt
        // They are generated fresh each time and used only during processing
        // The iPad app does NOT store queries in decisions.txt

        // Blank line between references
        lines.push('');
    }

    return lines.join('\n');
}

/**
 * Format a reference object back to the [ID] line format
 */
function formatReferenceLine(ref) {
    let line = `[${ref.id}] `;

    if (ref.authors) {
        line += `${ref.authors} `;
    }
    if (ref.year) {
        line += `(${ref.year})`;
    }
    if (ref.title) {
        line += `. ${ref.title}`;
    }
    if (ref.other) {
        line += `. ${ref.other}`;
    }

    return line;
}

/**
 * Filter references based on selection criteria
 */
export function filterReferences(references, config) {
    const mode = config.selection_mode;

    if (mode === 'range') {
        const { start, end } = config.reference_range;
        return references.filter(r => r.id >= start && r.id <= end);
    }
    else if (mode === 'criteria') {
        return references.filter(ref => {
            const criteria = config.criteria;

            // Check each criterion
            if (criteria.missing_primary_url && ref.urls.primary) {
                return false;
            }
            if (criteria.missing_secondary_url && ref.urls.secondary) {
                return false;
            }
            if (criteria.not_finalized && ref.finalized) {
                return false;
            }
            if (criteria.has_queries === false && ref.queries.length > 0) {
                return false;
            }
            if (criteria.has_queries === true && ref.queries.length === 0) {
                return false;
            }

            return true;
        });
    }
    else if (mode === 'all_incomplete') {
        return references.filter(ref => {
            return !ref.finalized || !ref.urls.primary || ref.queries.length === 0;
        });
    }

    return [];
}

/**
 * Check if reference meets finalization criteria
 */
export function checkFinalizeCriteria(ref, rankings, criteria) {
    // Find best primary and secondary candidates
    const primaryCandidates = rankings
        .filter(r => r.primary_score >= 75)
        .sort((a, b) => b.primary_score - a.primary_score);

    const secondaryCandidates = rankings
        .filter(r => r.secondary_score >= 75)
        .sort((a, b) => b.secondary_score - a.secondary_score);

    const bestPrimary = primaryCandidates[0];
    const bestSecondary = secondaryCandidates[0];

    // Must have primary URL
    if (!bestPrimary) {
        return { ok: false, reason: 'No primary URL found' };
    }

    // Check primary score threshold
    if (bestPrimary.primary_score < criteria.min_primary_score) {
        return {
            ok: false,
            reason: `Primary score ${bestPrimary.primary_score} below threshold ${criteria.min_primary_score}`
        };
    }

    // Check secondary score threshold (if secondary exists)
    if (bestSecondary && bestSecondary.secondary_score < criteria.min_secondary_score) {
        return {
            ok: false,
            reason: `Secondary score ${bestSecondary.secondary_score} below threshold ${criteria.min_secondary_score}`
        };
    }

    // Check title match requirement
    if (criteria.require_title_match) {
        const titleMatch = bestPrimary.title_match || 'none';
        if (titleMatch === 'none') {
            return { ok: false, reason: 'No title match' };
        }
    }

    // Check author match requirement
    if (criteria.require_author_match && !bestPrimary.author_match) {
        return { ok: false, reason: 'No author match' };
    }

    // Check warning count (if any rankings have warnings)
    const warnings = countWarnings(bestPrimary, bestSecondary);
    if (warnings > criteria.max_warnings) {
        return {
            ok: false,
            reason: `${warnings} warnings (max: ${criteria.max_warnings})`
        };
    }

    // All checks passed
    const secondaryInfo = bestSecondary ? `S:${bestSecondary.secondary_score}` : 'N/A';
    return {
        ok: true,
        reason: `P:${bestPrimary.primary_score}, ${secondaryInfo}, matches confirmed`,
        primary: bestPrimary,
        secondary: bestSecondary
    };
}

/**
 * Count warning indicators in ranking results
 */
function countWarnings(primary, secondary) {
    let warnings = 0;

    // Low scores are warnings
    if (primary && primary.primary_score < 85) warnings++;
    if (secondary && secondary.secondary_score < 85) warnings++;

    // Check for warning flags in reasoning (if provided)
    const checkReasons = (ranking) => {
        if (!ranking) return;
        const reason = (ranking.primary_reason || '') + (ranking.secondary_reason || '');
        if (reason.toLowerCase().includes('warning')) warnings++;
        if (reason.toLowerCase().includes('uncertain')) warnings++;
        if (reason.toLowerCase().includes('may not')) warnings++;
    };

    checkReasons(primary);
    checkReasons(secondary);

    return warnings;
}

/**
 * Load progress file
 */
export async function loadProgress(progressFile) {
    if (!existsSync(progressFile)) {
        return {
            batch_id: `batch_${new Date().toISOString().replace(/[:.]/g, '-')}`,
            started_at: new Date().toISOString(),
            status: 'in_progress',
            completed: [],
            errors: [],
            stats: {
                queries_generated: 0,
                searches_run: 0,
                autoranks_completed: 0,
                auto_finalized: 0
            }
        };
    }

    const content = await fs.readFile(progressFile, 'utf-8');
    return JSON.parse(content);
}

/**
 * Save progress file
 */
export async function saveProgress(progressFile, progress) {
    progress.last_updated = new Date().toISOString();
    await fs.writeFile(progressFile, JSON.stringify(progress, null, 2), 'utf-8');
}

/**
 * Sleep helper
 */
export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Colored logging helpers
 */
export const log = {
    info: (msg) => console.log(chalk.blue('ℹ️ '), msg),
    success: (msg) => console.log(chalk.green('✓'), msg),
    warning: (msg) => console.log(chalk.yellow('⚠️ '), msg),
    error: (msg) => console.log(chalk.red('❌'), msg),
    processing: (msg) => console.log(chalk.cyan('🔄'), msg),
    step: (num, msg) => console.log(chalk.gray(`  ${num}️⃣ `), msg),
    result: (msg) => console.log(chalk.gray('     '), msg)
};

/**
 * Format elapsed time
 */
export function formatElapsedTime(startTime) {
    const elapsed = Date.now() - startTime;
    const seconds = Math.floor(elapsed / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes > 0) {
        return `${minutes}m ${remainingSeconds}s`;
    }
    return `${seconds}s`;
}

/**
 * Calculate cost estimates
 */
export function estimateCosts(refCount, queryMode) {
    const perRefCost = queryMode === 'simple' ? 0.064 : 0.120;
    const totalCost = refCount * perRefCost;

    const googleSearches = queryMode === 'simple' ? refCount * 3 : refCount * 8;
    const googleCost = googleSearches * 0.005;
    const claudeCost = totalCost - googleCost;

    return {
        total: totalCost,
        google: googleCost,
        claude: claudeCost,
        searches: googleSearches
    };
}
