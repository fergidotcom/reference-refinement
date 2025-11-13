/**
 * Relevance Generator for Reference Refinement v30.0
 * Component 3 of Phase 1
 *
 * Generate 200-word "Relevance" explanations using Claude API
 * Core of hierarchical model: Context → Relevance → URLs
 *
 * Features:
 * - Call Anthropic Claude API to generate relevance text
 * - Batch processing with rate limiting
 * - Retry logic for failed API calls
 * - Token counting and cost tracking
 * - Cache responses to avoid duplicate calls
 * - Validate 200-word target (±10 words acceptable)
 */

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

// ============================================================================
// CONFIGURATION
// ============================================================================

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_MODEL = 'claude-3-5-sonnet-20241022';  // Latest model
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;
const RATE_LIMIT_DELAY_MS = 100;  // Delay between requests
const TARGET_WORD_COUNT = 200;
const WORD_COUNT_TOLERANCE = 10;

// ============================================================================
// MAIN GENERATION FUNCTION
// ============================================================================

/**
 * Generate relevance text for all references
 *
 * @param {Array} contexts - Array of context objects from context-extractor
 * @param {Array} bibliographicData - Array of bibliographic info
 * @param {object} options - Configuration options
 * @returns {Promise<object>} Generation results
 */
async function generateRelevance(contexts, bibliographicData, options = {}) {
    const opts = {
        apiKey: process.env.ANTHROPIC_API_KEY,
        batchSize: 10,  // Process in batches
        useCache: true,
        cacheFile: 'v30/cache/relevance-cache.json',
        ...options
    };

    if (!opts.apiKey) {
        throw new Error('ANTHROPIC_API_KEY environment variable not set');
    }

    const results = {
        success: false,
        relevanceGenerated: 0,
        relevances: [],
        apiCalls: 0,
        totalTokensInput: 0,
        totalTokensOutput: 0,
        totalCost: 0,
        cached: 0,
        failed: 0,
        warnings: [],
        errors: []
    };

    try {
        console.log(`\n🤖 Generating relevance for ${contexts.length} references...`);
        console.log(`   API: ${ANTHROPIC_MODEL}`);
        console.log(`   Target: ${TARGET_WORD_COUNT} words per relevance`);

        // Load cache if enabled
        let cache = {};
        if (opts.useCache) {
            cache = await loadCache(opts.cacheFile);
            console.log(`   Loaded ${Object.keys(cache).length} cached relevances`);
        }

        // Create bibliographic lookup map
        const bibMap = new Map();
        for (const bib of bibliographicData) {
            bibMap.set(bib.citationNumber, bib);
        }

        // ====================================================================
        // PROCESS CONTEXTS IN BATCHES
        // ====================================================================

        const batches = createBatches(contexts, opts.batchSize);
        console.log(`   Processing in ${batches.length} batches of ${opts.batchSize}`);

        for (let i = 0; i < batches.length; i++) {
            const batch = batches[i];
            console.log(`\n   Batch ${i + 1}/${batches.length}:`);

            for (const context of batch) {
                try {
                    // Check cache first
                    const cacheKey = generateCacheKey(context);
                    if (cache[cacheKey]) {
                        results.relevances.push(cache[cacheKey]);
                        results.cached++;
                        results.relevanceGenerated++;
                        continue;
                    }

                    // Get bibliographic info
                    const bibInfo = bibMap.get(context.citationId) || {};

                    // Generate relevance via API
                    const relevance = await generateSingleRelevance(
                        context,
                        bibInfo,
                        opts.apiKey,
                        results
                    );

                    results.relevances.push(relevance);
                    results.relevanceGenerated++;

                    // Update cache
                    if (opts.useCache) {
                        cache[cacheKey] = relevance;
                    }

                    // Rate limiting
                    await sleep(RATE_LIMIT_DELAY_MS);

                } catch (error) {
                    results.failed++;
                    results.errors.push(
                        `Failed to generate relevance for citation ${context.citationId}: ${error.message}`
                    );
                    console.error(`   ❌ Citation ${context.citationId}: ${error.message}`);
                }
            }

            console.log(`   - Generated: ${results.relevanceGenerated}/${contexts.length}`);
            console.log(`   - Cached: ${results.cached}`);
            console.log(`   - Failed: ${results.failed}`);
        }

        // ====================================================================
        // SAVE CACHE AND CALCULATE COSTS
        // ====================================================================

        if (opts.useCache && results.relevanceGenerated > 0) {
            await saveCache(opts.cacheFile, cache);
            console.log(`   ✓ Saved ${Object.keys(cache).length} relevances to cache`);
        }

        // Calculate costs (Claude 3.5 Sonnet pricing)
        const inputCostPer1M = 3.00;   // $3 per million input tokens
        const outputCostPer1M = 15.00;  // $15 per million output tokens

        results.totalCost =
            (results.totalTokensInput / 1000000 * inputCostPer1M) +
            (results.totalTokensOutput / 1000000 * outputCostPer1M);

        results.success = results.relevanceGenerated > 0;

        console.log('\n✅ Relevance generation complete!');
        console.log(`   Generated: ${results.relevanceGenerated}`);
        console.log(`   Cached: ${results.cached}`);
        console.log(`   Failed: ${results.failed}`);
        console.log(`   API calls: ${results.apiCalls}`);
        console.log(`   Total tokens: ${results.totalTokensInput + results.totalTokensOutput}`);
        console.log(`   Estimated cost: $${results.totalCost.toFixed(4)}`);

        if (results.warnings.length > 0) {
            console.log(`\n⚠️  ${results.warnings.length} warning(s):`);
            results.warnings.forEach(w => console.log(`   - ${w}`));
        }

    } catch (error) {
        results.errors.push(`Relevance generation failed: ${error.message}`);
        results.success = false;
        console.error(`\n❌ Error: ${error.message}`);
    }

    return results;
}

// ============================================================================
// SINGLE RELEVANCE GENERATION
// ============================================================================

/**
 * Generate relevance for a single citation
 *
 * @param {object} context - Citation context
 * @param {object} bibInfo - Bibliographic information
 * @param {string} apiKey - Anthropic API key
 * @param {object} results - Results object (for updating stats)
 * @returns {Promise<object>} Relevance data
 */
async function generateSingleRelevance(context, bibInfo, apiKey, results) {
    const prompt = buildRelevancePrompt(context, bibInfo);

    let lastError = null;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const response = await callClaudeAPI(prompt, apiKey);

            // Update token stats
            results.apiCalls++;
            results.totalTokensInput += response.usage.input_tokens;
            results.totalTokensOutput += response.usage.output_tokens;

            // Extract relevance text
            let relevanceText = response.content[0].text.trim();

            // Ensure it starts with "Relevance:"
            if (!relevanceText.startsWith('Relevance:')) {
                relevanceText = 'Relevance: ' + relevanceText;
            }

            // Count words
            const wordCount = countWords(relevanceText);

            // Validate word count
            if (Math.abs(wordCount - TARGET_WORD_COUNT) > WORD_COUNT_TOLERANCE) {
                results.warnings.push(
                    `Citation ${context.citationId}: Word count ${wordCount} outside target range (${TARGET_WORD_COUNT}±${WORD_COUNT_TOLERANCE})`
                );
            }

            return {
                citationId: context.citationId,
                citationText: context.citationText,
                relevanceText: relevanceText,
                wordCount: wordCount,
                tokensInput: response.usage.input_tokens,
                tokensOutput: response.usage.output_tokens,
                generatedDate: new Date().toISOString(),
                model: ANTHROPIC_MODEL
            };

        } catch (error) {
            lastError = error;
            console.error(`   ⚠️ Attempt ${attempt}/${MAX_RETRIES} failed: ${error.message}`);

            if (attempt < MAX_RETRIES) {
                const delay = RETRY_DELAY_MS * attempt;
                console.log(`   ⏳ Retrying in ${delay}ms...`);
                await sleep(delay);
            }
        }
    }

    throw lastError;
}

/**
 * Build prompt for Claude API
 *
 * @param {object} context - Citation context
 * @param {object} bibInfo - Bibliographic info
 * @returns {string} Prompt text
 */
function buildRelevancePrompt(context, bibInfo) {
    const author = bibInfo.author || 'Unknown Author';
    const year = bibInfo.year || 'n.d.';
    const title = bibInfo.title || 'Unknown Title';
    const publication = bibInfo.publication || '';

    return `You are analyzing an academic citation in context.

CITATION: ${context.citationText}
BIBLIOGRAPHIC INFO: ${author} (${year}). ${title}. ${publication}

DOCUMENT CONTEXT:
Section: ${context.sectionTitle || 'Unknown section'}
${context.sectionNumber ? `Section Number: ${context.sectionNumber}` : ''}
Paragraph: ${context.paragraphContext}

SENTENCE CONTAINING CITATION:
${context.sentenceContaining || context.paragraphContext.split('.')[0]}

${context.claimSupported ? `CLAIM SUPPORTED: ${context.claimSupported}` : ''}

Generate a 200-word explanation (labeled "Relevance:") that explains:
1. How this reference supports the specific claim in the context
2. What type of evidence it provides (empirical, theoretical, review, methodological)
3. Why this particular source is relevant to this argument
4. How it connects to the broader scholarly conversation

Be specific to this context. Focus on the relationship between the citation and the claim being made.
Start with "Relevance:" followed by your explanation.
Target exactly 200 words (±10 words acceptable).`;
}

/**
 * Call Claude API
 *
 * @param {string} prompt - Prompt text
 * @param {string} apiKey - API key
 * @returns {Promise<object>} API response
 */
async function callClaudeAPI(prompt, apiKey) {
    const response = await axios.post(
        ANTHROPIC_API_URL,
        {
            model: ANTHROPIC_MODEL,
            max_tokens: 500,  // ~350 words max
            temperature: 0.7,
            messages: [
                {
                    role: 'user',
                    content: prompt
                }
            ]
        },
        {
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            },
            timeout: 60000  // 60 second timeout
        }
    );

    return response.data;
}

// ============================================================================
// CACHING
// ============================================================================

/**
 * Generate cache key for a context
 *
 * @param {object} context - Citation context
 * @returns {string} Cache key
 */
function generateCacheKey(context) {
    // Use citation ID and paragraph context hash
    const textHash = simpleHash(context.paragraphContext);
    return `${context.citationId}_${textHash}`;
}

/**
 * Simple hash function for strings
 *
 * @param {string} str - String to hash
 * @returns {string} Hash
 */
function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;  // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
}

/**
 * Load cache from file
 *
 * @param {string} cacheFile - Cache file path
 * @returns {Promise<object>} Cache object
 */
async function loadCache(cacheFile) {
    try {
        // Ensure cache directory exists
        const cacheDir = path.dirname(cacheFile);
        await fs.mkdir(cacheDir, { recursive: true });

        const data = await fs.readFile(cacheFile, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            return {};  // File doesn't exist yet
        }
        console.warn(`Warning: Could not load cache: ${error.message}`);
        return {};
    }
}

/**
 * Save cache to file
 *
 * @param {string} cacheFile - Cache file path
 * @param {object} cache - Cache object
 * @returns {Promise<void>}
 */
async function saveCache(cacheFile, cache) {
    try {
        const cacheDir = path.dirname(cacheFile);
        await fs.mkdir(cacheDir, { recursive: true });
        await fs.writeFile(cacheFile, JSON.stringify(cache, null, 2), 'utf8');
    } catch (error) {
        console.warn(`Warning: Could not save cache: ${error.message}`);
    }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Count words in text
 *
 * @param {string} text - Text to count
 * @returns {number} Word count
 */
function countWords(text) {
    return text.trim().split(/\s+/).length;
}

/**
 * Sleep for specified milliseconds
 *
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create batches from array
 *
 * @param {Array} items - Items to batch
 * @param {number} batchSize - Size of each batch
 * @returns {Array} Array of batches
 */
function createBatches(items, batchSize) {
    const batches = [];
    for (let i = 0; i < items.length; i += batchSize) {
        batches.push(items.slice(i, i + batchSize));
    }
    return batches;
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
    // Main function
    generateRelevance,

    // Core functions
    generateSingleRelevance,
    buildRelevancePrompt,
    callClaudeAPI,

    // Cache functions
    loadCache,
    saveCache,
    generateCacheKey,

    // Utility functions
    countWords,
    sleep,
    createBatches
};
