#!/usr/bin/env node
/**
 * Reference Refinement - Batch Processor v20.0
 *
 * Automates bulk reference processing with DEEP URL VALIDATION:
 * 1. Generate Queries (llm-chat)
 * 2. Search (search-google)
 * 3. Autorank (llm-rank)
 * 4. DEEP Validation (Python deep_url_validation.py)
 * 5. Auto-Finalize (based on criteria)
 *
 * Version: 20.0 - MAJOR UPDATE
 * - Integrated deep_url_validation.py for content-based validation
 * - Paywall detection (12 patterns)
 * - Login wall detection (10 patterns)
 * - Soft 404 detection (8 patterns)
 * - Accessibility scoring (0-100)
 * - WEB_SESSION flag support
 */

// Batch version - gets written to FLAGS[BATCH_vX.X] for tracking
const BATCH_VERSION = 'v20.0';

import fs from 'fs/promises';
import { existsSync } from 'fs';
import { parse as parseYaml } from 'yaml';
import chalk from 'chalk';
import { exec } from 'child_process';
import { promisify } from 'util';
import {
    parseDecisionsFile,
    formatDecisionsFile,
    filterReferences,
    checkFinalizeCriteria,
    loadProgress,
    saveProgress,
    sleep,
    log,
    formatElapsedTime,
    estimateCosts
} from './batch-utils.js';

const execPromise = promisify(exec);

// Command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isResume = args.includes('--resume');
const configPath = args.find(arg => arg.startsWith('--config='))?.split('=')[1] || 'batch-config.yaml';

/**
 * Main batch processor
 */
async function main() {
    const startTime = Date.now();

    // Print banner
    console.log(chalk.bold.cyan('\n📦 Reference Refinement - Batch Processor'));
    console.log(chalk.gray('━'.repeat(50)) + '\n');

    try {
        // Load configuration
        log.info('Loading configuration...');
        const config = await loadConfig(configPath);
        const batchConfig = config.batch_processor;

        // Load or create progress file
        const progressFile = 'batch-progress.json';
        const progress = await loadProgress(progressFile);

        if (isResume && progress.completed.length > 0) {
            log.info(`Resuming from reference #${progress.completed[progress.completed.length - 1]}`);
        }

        // Load decisions.txt
        log.info(`Reading ${batchConfig.input_file}...`);
        const decisionsContent = await fs.readFile(batchConfig.input_file, 'utf-8');
        const allReferences = parseDecisionsFile(decisionsContent);
        log.success(`Loaded ${allReferences.length} references`);

        // Filter references based on selection mode
        log.info(`Filtering references (mode: ${batchConfig.selection_mode})...`);
        let selectedRefs = filterReferences(allReferences, batchConfig);

        // Apply max_references limit if specified
        if (batchConfig.max_references && selectedRefs.length > batchConfig.max_references) {
            selectedRefs = selectedRefs.slice(0, batchConfig.max_references);
            log.info(`Limited to first ${batchConfig.max_references} references`);
        }

        // Filter out already completed references if resuming
        const refsToProcess = isResume
            ? selectedRefs.filter(ref => !progress.completed.includes(ref.id))
            : selectedRefs;

        log.success(`Selected ${refsToProcess.length} references to process`);

        // Display configuration
        console.log(chalk.gray('\nConfiguration:'));
        console.log(chalk.gray(`  Selection: ${batchConfig.selection_mode}`));
        if (batchConfig.selection_mode === 'range') {
            console.log(chalk.gray(`  Range: ${batchConfig.reference_range.start}-${batchConfig.reference_range.end}`));
        }
        console.log(chalk.gray(`  Query Mode: ${batchConfig.query_mode} (${batchConfig.query_mode === 'simple' ? '3' : '8'} queries)`));
        console.log(chalk.gray(`  Auto-finalize: ${batchConfig.auto_finalize ? 'YES' : 'NO'}`));
        if (batchConfig.auto_finalize) {
            console.log(chalk.gray(`  Finalize threshold: P≥${batchConfig.finalize_criteria.min_primary_score}, S≥${batchConfig.finalize_criteria.min_secondary_score}`));
        }

        // Cost estimation
        const costs = estimateCosts(refsToProcess.length, batchConfig.query_mode);
        console.log(chalk.gray('\nEstimated cost:'));
        console.log(chalk.gray(`  Google: $${costs.google.toFixed(2)} (${costs.searches} searches)`));
        console.log(chalk.gray(`  Claude: $${costs.claude.toFixed(2)}`));
        console.log(chalk.gray(`  Total: $${costs.total.toFixed(2)}`));
        console.log(chalk.gray(`  Estimated time: ~${Math.ceil(refsToProcess.length * 0.3)} minutes`));

        // Warning about iPad app conflicts
        console.log(chalk.yellow('\n⚠️  IMPORTANT: Close iPad app before running batch processor!'));
        console.log(chalk.yellow('   Running both simultaneously can cause file conflicts and data loss.'));
        console.log(chalk.yellow('   After batch completes: Terminate and restart iPad app to see changes.\n'));

        if (isDryRun) {
            console.log(chalk.yellow('\n🔍 DRY RUN - No changes will be made\n'));
            console.log(chalk.gray('References to process:'));
            for (const ref of refsToProcess.slice(0, 10)) {
                console.log(chalk.gray(`  [${ref.id}] ${ref.title || 'Untitled'}`));
            }
            if (refsToProcess.length > 10) {
                console.log(chalk.gray(`  ... and ${refsToProcess.length - 10} more`));
            }
            return;
        }

        // Give user 5 seconds to cancel if iPad app is open
        console.log(chalk.yellow('Starting in 5 seconds... (Ctrl+C to cancel)\n'));
        await sleep(5000);

        // Create backup of decisions.txt before making changes
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const backupFile = `decisions_backup_${timestamp}.txt`;
        await fs.writeFile(backupFile, decisionsContent, 'utf-8');
        log.success(`Created backup: ${backupFile}`);

        console.log(chalk.gray('━'.repeat(50)) + '\n');

        // Initialize log file
        let logFile = null;
        if (batchConfig.logging.save_logs) {
            const logDir = batchConfig.logging.log_directory;
            if (!existsSync(logDir)) {
                await fs.mkdir(logDir, { recursive: true });
            }
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
            logFile = `${logDir}/batch_${timestamp}.log`;
            await fs.writeFile(logFile, `Batch Processing Log - ${new Date().toISOString()}\n\n`, 'utf-8');
            log.info(`Logging to: ${logFile}`);
        }

        // Process each reference
        for (let i = 0; i < refsToProcess.length; i++) {
            const ref = refsToProcess[i];
            const progress_pct = Math.round(((i + 1) / refsToProcess.length) * 100);

            console.log(chalk.cyan(`\n🔄 Processing REF [${ref.id}]: ${ref.title || 'Untitled'} (${i + 1}/${refsToProcess.length} - ${progress_pct}%)`));

            try {
                // Step 1: Generate Queries
                log.step('1', 'Generating queries...');
                const queryResponse = await callLLMChat(
                    ref,
                    batchConfig.query_mode,
                    batchConfig.api_base_url,
                    batchConfig.rate_limiting
                );

                // Parse queries from response
                const queries = parseQueries(queryResponse.result);
                ref.queries = queries;
                log.result(`✓ Generated ${queries.length} queries`);

                // Update progress
                progress.stats.queries_generated++;

                // Step 2: Search
                log.step('2', 'Searching...');
                await sleep(batchConfig.rate_limiting.delay_after_search);

                const searchResults = await callSearchGoogle(
                    queries,
                    batchConfig.api_base_url,
                    batchConfig.rate_limiting
                );

                // Add existing URLs as candidates (no special status - will be ranked with all others)
                const existingUrls = new Set(searchResults.map(r => r.url));
                let addedExisting = 0;

                if (ref.urls.primary && ref.urls.primary.trim() && !existingUrls.has(ref.urls.primary)) {
                    searchResults.push({
                        title: `[EXISTING] ${ref.title || 'Primary URL'}`,
                        url: ref.urls.primary,
                        snippet: 'Previously assigned primary URL',
                        displayUrl: new URL(ref.urls.primary).hostname,
                        query: '[existing]'
                    });
                    existingUrls.add(ref.urls.primary);
                    addedExisting++;
                }

                if (ref.urls.secondary && ref.urls.secondary.trim() && !existingUrls.has(ref.urls.secondary)) {
                    searchResults.push({
                        title: `[EXISTING] ${ref.title || 'Secondary URL'}`,
                        url: ref.urls.secondary,
                        snippet: 'Previously assigned secondary URL',
                        displayUrl: new URL(ref.urls.secondary).hostname,
                        query: '[existing]'
                    });
                    existingUrls.add(ref.urls.secondary);
                    addedExisting++;
                }

                log.result(`✓ Found ${searchResults.length} unique candidates${addedExisting > 0 ? ` (${addedExisting} from existing)` : ''}`);

                // Update progress
                progress.stats.searches_run++;

                if (searchResults.length === 0) {
                    log.warning('No search results found, skipping autorank');
                    await logToFile(logFile, `[${ref.id}] No search results\n`);
                    progress.completed.push(ref.id);
                    await saveProgress(progressFile, progress);
                    continue;
                }

                // Step 3: Autorank
                log.step('3', 'Ranking candidates...');
                await sleep(batchConfig.rate_limiting.delay_after_search);

                const rankings = await callLLMRank(
                    ref,
                    searchResults,
                    batchConfig.api_base_url,
                    batchConfig.rate_limiting
                );
                log.result(`✓ Ranked ${rankings.length} candidates`);

                // Update progress
                progress.stats.autoranks_completed++;

                // v20.0: DEEP URL validation (paywall/login/soft404 detection)
                log.step('3.5', 'Deep validating candidate URLs...');

                // Build citation string for validation
                const citation = `${ref.authors || ''} ${ref.year ? `(${ref.year})` : ''}. ${ref.title || 'Untitled'}`.trim();

                const validatedRankings = await validateURLs(
                    rankings,
                    citation,
                    20 // Check top 20 candidates
                );

                // Validation summary is now logged inside validateURLs()

                // Log invalid URLs with details (paywall/login/soft404)
                if (batchConfig.logging.verbose) {
                    const invalidUrls = validatedRankings.filter(r => !r.valid && r.validationReason);
                    if (invalidUrls.length > 0) {
                        console.log(chalk.yellow('\n      Invalid URLs detected:'));
                        for (const r of invalidUrls.slice(0, 5)) {
                            const urlShort = r.url.length > 50 ? r.url.slice(0, 50) + '...' : r.url;
                            const issues = [];
                            if (r.paywall) issues.push('PAYWALL');
                            if (r.login_required) issues.push('LOGIN');
                            if (r.soft_404) issues.push('SOFT-404');
                            const issueTag = issues.length > 0 ? ` [${issues.join(', ')}]` : '';
                            console.log(chalk.yellow(`      ❌ ${urlShort}`));
                            console.log(chalk.gray(`         ${r.validationReason}${issueTag}`));
                        }
                        console.log('');
                    }
                }

                // Log top 5 VALID candidates with scores for debugging
                if (batchConfig.logging.verbose && validatedRankings.length > 0) {
                    console.log(chalk.gray('\n      Top valid candidates:'));
                    const topValid = validatedRankings
                        .filter(r => r.valid) // Only valid URLs
                        .sort((a, b) => Math.max(b.primary_score || 0, b.secondary_score || 0) - Math.max(a.primary_score || 0, a.secondary_score || 0))
                        .slice(0, 5);
                    for (const r of topValid) {
                        const url = r.url || 'NO URL';
                        const urlShort = url.length > 50 ? url.slice(0, 50) + '...' : url;
                        const scoreInfo = r.validationScore !== null ? ` [Score:${r.validationScore}]` : '';
                        console.log(chalk.gray(`      P:${r.primary_score || 0} S:${r.secondary_score || 0}${scoreInfo} - ${urlShort}`));
                    }
                    console.log('');
                }

                // Extract top recommendations (ONLY from valid URLs)
                const topPrimary = validatedRankings
                    .filter(r => r.valid && r.primary_score >= 75)
                    .sort((a, b) => b.primary_score - a.primary_score)[0];

                const topSecondary = validatedRankings
                    .filter(r => r.valid && r.secondary_score >= 75)
                    .sort((a, b) => b.secondary_score - a.secondary_score)[0];

                if (topPrimary) {
                    ref.urls.primary = topPrimary.url;
                    const urlDisplay = topPrimary.url.length > 60 ? topPrimary.url.slice(0, 60) + '...' : topPrimary.url;
                    log.result(`✓ Primary: ${urlDisplay} (P:${topPrimary.primary_score})`);
                } else {
                    log.warning('No suitable primary URL found');
                }

                if (topSecondary && topSecondary.url !== topPrimary?.url) {
                    ref.urls.secondary = topSecondary.url;
                    const urlDisplay = topSecondary.url.length > 60 ? topSecondary.url.slice(0, 60) + '...' : topSecondary.url;
                    log.result(`✓ Secondary: ${urlDisplay} (S:${topSecondary.secondary_score})`);
                }

                // v14.7: Flag for manual review if no suitable URLs found
                if (!topPrimary) {
                    ref.manual_review = true;
                    log.result(`🔍 Flagged for manual review: No suitable URLs found`);
                } else {
                    // Clear manual review flag if URLs were found
                    ref.manual_review = false;
                }

                // v16.0: Set batch version for tracking
                ref.batch_version = BATCH_VERSION;
                log.info(`📌 Tagged with ${BATCH_VERSION}`);

                // Step 4: Auto-Finalize (if enabled)
                if (batchConfig.auto_finalize && rankings.length > 0) {
                    const finalizeResult = checkFinalizeCriteria(ref, rankings, batchConfig.finalize_criteria);
                    if (finalizeResult.ok) {
                        ref.finalized = true;
                        log.result(`✅ Auto-finalized: ${finalizeResult.reason}`);
                        progress.stats.auto_finalized++;
                    } else {
                        log.result(`⏸️  Not finalized: ${finalizeResult.reason}`);
                    }
                }

                // Log to file
                await logToFile(logFile, formatReferenceLog(ref, topPrimary, topSecondary));

                // Update progress
                progress.completed.push(ref.id);

                // Save progress at checkpoint
                if (progress.completed.length % batchConfig.resume.checkpoint_frequency === 0) {
                    await saveProgress(progressFile, progress);

                    // Write updated decisions.txt at checkpoint
                    const updatedContent = formatDecisionsFile(allReferences);
                    await fs.writeFile(batchConfig.output_file, updatedContent, 'utf-8');
                    log.info(`Checkpoint: Saved progress and updated ${batchConfig.output_file}`);
                }

                log.success(`REF [${ref.id}] Complete`);

            } catch (error) {
                log.error(`REF [${ref.id}] Error: ${error.message}`);
                progress.errors.push({
                    id: ref.id,
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
                await logToFile(logFile, `[${ref.id}] ERROR: ${error.message}\n\n`);
            }

            // Rate limiting delay
            if (i < refsToProcess.length - 1) {
                await sleep(batchConfig.rate_limiting.delay_between_refs);
            }
        }

        // Final save
        progress.status = 'completed';
        await saveProgress(progressFile, progress);

        // Write final decisions.txt
        const finalContent = formatDecisionsFile(allReferences);
        await fs.writeFile(batchConfig.output_file, finalContent, 'utf-8');
        log.success(`Updated ${batchConfig.output_file}`);

        // Generate Final.txt if auto-finalize enabled
        if (batchConfig.auto_finalize) {
            const finalized = allReferences.filter(r => r.finalized);
            const finalTxt = formatFinalFile(finalized);
            await fs.writeFile('Final.txt', finalTxt, 'utf-8');
            log.success(`Generated Final.txt (${finalized.length} references)`);
        }

        // Print summary
        console.log(chalk.gray('\n' + '━'.repeat(50)));
        console.log(chalk.bold.green('\n📊 Batch Processing Complete\n'));
        console.log(chalk.gray(`   Processed: ${progress.completed.length}`));
        console.log(chalk.gray(`   Finalized: ${progress.stats.auto_finalized}`));
        console.log(chalk.gray(`   Errors: ${progress.errors.length}`));
        console.log(chalk.gray(`   Total Time: ${formatElapsedTime(startTime)}`));
        console.log(chalk.gray(`   Average per Reference: ${Math.round((Date.now() - startTime) / progress.completed.length / 1000)}s`));

        if (logFile) {
            console.log(chalk.gray(`\n📄 Log saved: ${logFile}`));
        }

        console.log(chalk.bold.green('\n✅ Batch complete!\n'));

    } catch (error) {
        log.error(`Fatal error: ${error.message}`);
        console.error(error);
        process.exit(1);
    }
}

/**
 * Load YAML configuration
 */
async function loadConfig(configPath) {
    if (!existsSync(configPath)) {
        throw new Error(`Configuration file not found: ${configPath}`);
    }
    const content = await fs.readFile(configPath, 'utf-8');
    return parseYaml(content);
}

/**
 * Call llm-chat function to generate queries
 */
async function callLLMChat(ref, queryMode, apiBaseUrl, rateLimiting) {
    const isSimple = queryMode === 'simple';

    // Build prompt based on reference
    const prompt = buildQueryPrompt(ref, isSimple);

    const response = await callWithRetry(async () => {
        const res = await fetch(`${apiBaseUrl}/llm-chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt,
                model: 'claude-sonnet-4-20250514',
                simpleQueries: isSimple
            }),
            signal: AbortSignal.timeout(rateLimiting.timeout)
        });

        if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${await res.text()}`);
        }

        return await res.json();
    }, rateLimiting.max_retries);

    return response;
}

/**
 * Build query generation prompt
 */
function buildQueryPrompt(ref, isSimple) {
    // Determine work type from title/other
    const workType = ref.title && (ref.title.toLowerCase().includes('chapter') || ref.title.toLowerCase().includes('article')) ? 'article' : 'book';

    if (isSimple) {
        // Simple 3-query mode
        return `You are helping find URLs for an academic reference. Generate EXACTLY 3 search queries using this simple structure:

REFERENCE:
Title: ${ref.title || 'Unknown'}
Authors: ${ref.authors || 'Unknown'}
Year: ${ref.year || 'Unknown'}
Other Info: ${ref.other || 'None'}

RELEVANCE (context for topic keywords):
${ref.relevance_text || 'No context provided'}

QUERY STRUCTURE (generate EXACTLY 3 queries):

Query 1 - BROAD TITLE+AUTHOR SEARCH:
Format: "{exact title}" {author last name}
Goal: Cast wide net for the work in any format
Example: "Making the Social World" Searle

Query 2 - REVIEW SEARCH:
Format: "{exact title}" ${workType} review
Goal: Find scholarly reviews or analyses of THIS SPECIFIC WORK
Example: "Making the Social World" book review

Query 3 - TOPIC KEYWORDS:
Format: {5-8 key concepts/topics from title and relevance, NO quotes}
Goal: Broader conceptual search for related discussions
Example: social ontology collective intentionality institutional facts Searle

IMPORTANT:
- Query 1: Use full exact title in quotes + author last name only
- Query 2: Use full exact title in quotes + "${workType} review"
- Query 3: Extract 5-8 core concepts/keywords, no quotes, space-separated
- Return ONLY 3 queries, one per line
- No labels, numbering, or explanations`;
    } else {
        // Standard 8-query mode
        return `You are helping find URLs for an academic reference. Generate 8 search queries using the structured approach below.

REFERENCE:
Title: ${ref.title || 'Unknown'}
Authors: ${ref.authors || 'Unknown'}
Year: ${ref.year || 'Unknown'}
Other Info: ${ref.other || 'None'}

RELEVANCE (why this matters):
${ref.relevance_text || 'No context provided'}

STRUCTURE (follow exactly - 8 queries total, 4 primary + 4 secondary):

PRIMARY-FOCUSED QUERIES (4 queries):
Q1-Q3 (3 queries): FULL-TEXT SOURCES (free preferred)
  - Exact title + author + year + filetype:pdf
  - Title/author + site:.edu OR site:.gov (academic repositories)
  - Title/author + site:archive.org OR site:researchgate.net OR site:academia.edu (free archives)
  Goal: Find FREE full-text PDFs or HTML versions. Prioritize open access.

Q4 (1 query): PUBLISHER/PURCHASE PAGE
  - Publisher name + title + author + year
  Goal: Official source where the work can be purchased or previewed.

SECONDARY-FOCUSED QUERIES (4 queries):
Q5-Q7 (3 queries): REVIEWS/ANALYSES OF THIS SPECIFIC WORK
  - Title + "review" + academic journal or scholarly
  - Title + author + "analysis" OR "critique" OR "discussion"
  - Title + author + "summary" OR "overview" + academic context
  Goal: Find scholarly reviews, critiques, or analyses of THIS SPECIFIC WORK (not just the topic).

Q8 (1 query): SCHOLARLY TOPIC ANALYSIS (fallback)
  - Use proper phrases, NOT keyword strings: "scholarly analysis of [key concepts]" OR "empirical research on [key concepts]" OR "theoretical frameworks for [key concepts]"
  - Add qualifiers like "peer-reviewed", "academic discussion", "research perspectives"
  Goal: Find academic discussions using complete phrases, not just keyword lists.

QUERY BEST PRACTICES:
✓ Use exact title in quotes for primary and review queries
✓ Keep queries 40-80 characters (max 120)
✓ Use 1-2 quoted phrases per query max
✓ Prioritize free sources over paywalled

AVOID:
❌ URLs or domain names in queries (except site: operator)
❌ Overly specific jargon combinations
❌ ISBN + publisher + full title together (too specific)

Return ONLY 8 queries, one per line, in order. No labels, categories, or explanations.`;
    }
}

/**
 * Parse queries from LLM response
 */
function parseQueries(response) {
    const queries = [];
    const lines = response.split('\n');

    for (const line of lines) {
        const trimmed = line.trim();

        // Skip empty lines or lines that look like headers/labels
        if (!trimmed || trimmed.length < 10) continue;
        if (trimmed.toLowerCase().includes('query 1') || trimmed.toLowerCase().includes('query 2') || trimmed.toLowerCase().includes('query 3')) continue;
        if (trimmed.startsWith('Q1') || trimmed.startsWith('Q2') || trimmed.startsWith('Q3')) continue;

        // Match lines starting with Q: or numbered like "1. query"
        if (trimmed.startsWith('Q:')) {
            queries.push(trimmed.replace('Q:', '').trim());
        } else if (/^\d+\.\s+/.test(trimmed)) {
            queries.push(trimmed.replace(/^\d+\.\s+/, '').trim());
        } else if (trimmed.length > 0) {
            // Any non-empty line that's not a header is likely a query
            queries.push(trimmed);
        }
    }

    // If we couldn't parse any queries, return the whole response as one query
    return queries.length > 0 ? queries : [response.trim()];
}

/**
 * Call search-google function for multiple queries
 */
async function callSearchGoogle(queries, apiBaseUrl, rateLimiting) {
    const allResults = [];
    const seenUrls = new Set();

    // Run each query individually
    for (const query of queries) {
        const response = await callWithRetry(async () => {
            const res = await fetch(`${apiBaseUrl}/search-google`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query }),  // Single query, not queries array
                signal: AbortSignal.timeout(rateLimiting.timeout)
            });

            if (!res.ok) {
                throw new Error(`HTTP ${res.status}: ${await res.text()}`);
            }

            return await res.json();
        }, rateLimiting.max_retries);

        // Add results, deduplicating by URL
        const results = response.results || [];
        for (const result of results) {
            if (!seenUrls.has(result.url)) {
                seenUrls.add(result.url);
                allResults.push(result);
            }
        }

        // Small delay between queries
        await sleep(500);
    }

    return allResults;
}

/**
 * Call llm-rank function to rank candidates
 */
async function callLLMRank(ref, candidates, apiBaseUrl, rateLimiting) {
    const referenceText = `[${ref.id}] ${ref.authors || ''} ${ref.year ? `(${ref.year})` : ''}. ${ref.title || 'Untitled'}. ${ref.other || ''}`.trim();

    const response = await callWithRetry(async () => {
        const res = await fetch(`${apiBaseUrl}/llm-rank`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                reference: referenceText,
                candidates,
                model: 'claude-sonnet-4-20250514'
            }),
            signal: AbortSignal.timeout(rateLimiting.timeout)
        });

        if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${await res.text()}`);
        }

        return await res.json();
    }, rateLimiting.max_retries);

    // Map rankings back to candidates using index
    const rankings = response.rankings || [];
    const allCandidates = response.allCandidates || candidates;

    // Enrich rankings with URL and other candidate data
    const enrichedRankings = rankings.map(ranking => {
        const candidate = allCandidates[ranking.index];
        return {
            ...ranking,
            url: candidate?.url || '',
            title: candidate?.title || '',
            snippet: candidate?.snippet || '',
            displayUrl: candidate?.displayUrl || ''
        };
    });

    return enrichedRankings;
}

/**
 * Retry wrapper with exponential backoff
 */
async function callWithRetry(fn, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            if (attempt === maxRetries) {
                throw error;
            }
            const delay = attempt * 2000; // 2s, 4s, 6s
            log.warning(`Attempt ${attempt} failed: ${error.message}`);
            log.warning(`Retrying in ${delay / 1000}s...`);
            await sleep(delay);
        }
    }
}

/**
 * DEEP URL Validation - Content-based accessibility checking
 * v20.0: Calls Python deep_url_validation.py for comprehensive validation
 *
 * Features:
 * - Paywall detection (12 patterns)
 * - Login wall detection (10 patterns)
 * - Soft 404 detection (8 patterns)
 * - Accessibility scoring (0-100)
 * - Content matching
 */
async function validateURLDeep(url, citation, urlType = 'primary') {
    try {
        const citationEscaped = citation.replace(/"/g, '\\"');
        const command = `python3 deep_validate_batch.py "${url}" "${citationEscaped}" "${urlType}"`;

        const { stdout, stderr } = await execPromise(command, {
            cwd: process.cwd(),
            timeout: 15000  // 15 second timeout for deep validation
        });

        if (stderr && stderr.length > 0 && !stderr.includes('DeprecationWarning')) {
            console.error(chalk.yellow(`      ⚠️  Validation warning: ${stderr.slice(0, 100)}`));
        }

        const result = JSON.parse(stdout);

        return {
            valid: result.accessible && result.score >= 75,  // Valid = accessible AND good score
            accessible: result.accessible,
            score: result.score,
            reason: result.reason,
            paywall: result.paywall,
            login_required: result.login_required,
            soft_404: result.soft_404,
            preview_only: result.preview_only
        };
    } catch (error) {
        // Fall back to basic validation on error
        console.error(chalk.yellow(`      ⚠️  Deep validation failed for ${url.slice(0, 50)}: ${error.message}`));
        return {
            valid: false,
            accessible: false,
            score: 0,
            reason: `Deep validation error: ${error.message}`,
            paywall: false,
            login_required: false,
            soft_404: false,
            preview_only: false
        };
    }
}

/**
 * Validate multiple URLs in batch with DEEP validation
 * v20.0: Deep content-based validation (paywall/login/soft404 detection)
 */
async function validateURLs(rankings, citation, maxToCheck = 20) {
    const candidatesToCheck = rankings.slice(0, maxToCheck);
    const results = [];
    let validCount = 0;
    let invalidCount = 0;
    let paywallCount = 0;
    let loginCount = 0;
    let soft404Count = 0;

    for (const ranking of candidatesToCheck) {
        if (!ranking.url) {
            results.push({ ...ranking, valid: false, accessible: false, reason: 'No URL' });
            invalidCount++;
            continue;
        }

        // Determine if this is likely a primary or secondary candidate
        const urlType = ranking.primary_score >= ranking.secondary_score ? 'primary' : 'secondary';

        const validation = await validateURLDeep(ranking.url, citation, urlType);

        results.push({
            ...ranking,
            valid: validation.valid,
            accessible: validation.accessible,
            validationScore: validation.score,
            validationReason: validation.reason,
            paywall: validation.paywall,
            login_required: validation.login_required,
            soft_404: validation.soft_404,
            preview_only: validation.preview_only
        });

        if (validation.valid) validCount++;
        else invalidCount++;
        if (validation.paywall) paywallCount++;
        if (validation.login_required) loginCount++;
        if (validation.soft_404) soft404Count++;

        // Small delay between validations
        await sleep(300);
    }

    // Include unvalidated rankings as potentially valid (benefit of doubt)
    const remaining = rankings.slice(maxToCheck).map(r => ({
        ...r,
        valid: true,
        accessible: true,
        validationScore: null,
        validationReason: 'Not validated (beyond top 20)'
    }));

    // Log validation summary
    console.log(chalk.blue(`      ✓ Validated: ${validCount} valid, ${invalidCount} invalid (checked top ${candidatesToCheck.length})`));
    if (paywallCount > 0 || loginCount > 0 || soft404Count > 0) {
        console.log(chalk.yellow(`      ⚠️  Issues: ${paywallCount} paywalled, ${loginCount} login-required, ${soft404Count} soft-404`));
    }

    return [...results, ...remaining];
}

/**
 * Format reference for log file
 * v14.7: Enhanced logging for iPad review comparison
 */
function formatReferenceLog(ref, primary, secondary) {
    let log = `\n${'='.repeat(80)}\n`;
    log += `[${ref.id}] ${ref.title || 'Untitled'}\n`;
    log += `${'='.repeat(80)}\n`;
    log += `Queries Generated: ${ref.queries.length}\n`;
    log += `\n--- BATCH PROCESSOR RECOMMENDATIONS ---\n`;
    if (primary) {
        log += `PRIMARY (Score: ${primary.primary_score}):\n`;
        log += `  URL: ${primary.url}\n`;
        log += `  Reason: ${primary.primary_reason || 'N/A'}\n`;
    } else {
        log += `PRIMARY: None found\n`;
    }
    if (secondary) {
        log += `\nSECONDARY (Score: ${secondary.secondary_score}):\n`;
        log += `  URL: ${secondary.url}\n`;
        log += `  Reason: ${secondary.secondary_reason || 'N/A'}\n`;
    } else {
        log += `\nSECONDARY: None found\n`;
    }
    log += `\nAuto-Finalized: ${ref.finalized ? 'YES' : 'NO (manual review required)'}\n`;
    log += `\n--- USER REVIEW NOTES (fill in after iPad review) ---\n`;
    log += `Final PRIMARY URL: \n`;
    log += `Final SECONDARY URL: \n`;
    log += `URL Changes: \n`;
    log += `Override Reason: \n`;
    log += `Commentary: \n`;
    log += `${'='.repeat(80)}\n\n`;
    return log;
}

/**
 * Write to log file
 */
async function logToFile(logFile, content) {
    if (logFile) {
        await fs.appendFile(logFile, content, 'utf-8');
    }
}

/**
 * Format Final.txt content
 */
function formatFinalFile(references) {
    const lines = [];

    for (const ref of references) {
        lines.push(`[${ref.id}] ${ref.authors || ''} ${ref.year ? `(${ref.year})` : ''}. ${ref.title || 'Untitled'}. ${ref.other || ''}`.trim());

        if (ref.urls.primary) {
            lines.push(`Primary URL: ${ref.urls.primary}`);
        }
        if (ref.urls.secondary) {
            lines.push(`Secondary URL: ${ref.urls.secondary}`);
        }
        if (ref.urls.tertiary) {
            lines.push(`Tertiary URL: ${ref.urls.tertiary}`);
        }

        lines.push('');
    }

    return lines.join('\n');
}

// Run main
main().catch(error => {
    console.error(chalk.red('\n❌ Fatal error:'), error);
    process.exit(1);
});
