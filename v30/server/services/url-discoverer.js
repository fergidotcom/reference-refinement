/**
 * URL Discoverer for Reference Refinement v30.0
 * Component 4 of Phase 1
 *
 * Find and validate Primary/Secondary URLs using:
 * - v21.0 Query Evolution strategies
 * - Google Custom Search API
 * - Deep URL validation (paywall, soft-404, login detection)
 * - Relevance-aware ranking
 *
 * Features:
 * - 3 query strategies with proven win rates
 * - Deep 3-level validation
 * - Parallel URL validation
 * - Rate limiting and retry logic
 * - Comprehensive result tracking
 */

const axios = require('axios');
const fs = require('fs').promises;

// ============================================================================
// CONFIGURATION
// ============================================================================

const GOOGLE_SEARCH_API_URL = 'https://www.googleapis.com/customsearch/v1';
const MAX_SEARCH_RESULTS = 10;
const MAX_CANDIDATES_TO_VALIDATE = 20;
const VALIDATION_TIMEOUT_MS = 10000;  // 10 seconds per URL
const MAX_CONCURRENT_VALIDATIONS = 10;
const RETRY_DELAY_MS = 2000;
const MAX_RETRIES = 3;

// v21.0 Query Strategies
const QUERY_STRATEGIES = {
    title_first_60_chars: {
        name: 'title_first_60_chars',
        winRate: 100.0,
        usageRate: 82.3,
        description: 'First 60 characters of title (default)'
    },
    title_keywords_5_terms: {
        name: 'title_keywords_5_terms',
        winRate: 91.4,
        usageRate: 14.2,
        description: '5 key terms from title (MANUAL_REVIEW cases)'
    },
    plus_best_2_from_tier_1: {
        name: 'plus_best_2_from_tier_1',
        winRate: 100.0,
        usageRate: 3.5,
        description: 'Title + 2 best relevance keywords (edge cases)'
    }
};

// ============================================================================
// MAIN DISCOVERY FUNCTION
// ============================================================================

/**
 * Discover URLs for all references
 *
 * @param {Array} references - Array of reference objects with relevance and biblio data
 * @param {object} options - Configuration options
 * @returns {Promise<object>} Discovery results
 */
async function discoverUrls(references, options = {}) {
    const opts = {
        googleApiKey: process.env.GOOGLE_API_KEY,
        googleCx: process.env.GOOGLE_CX,
        validateUrls: true,
        maxCandidates: MAX_CANDIDATES_TO_VALIDATE,
        ...options
    };

    if (!opts.googleApiKey || !opts.googleCx) {
        throw new Error('GOOGLE_API_KEY and GOOGLE_CX environment variables must be set');
    }

    const results = {
        success: false,
        urlsDiscovered: 0,
        references: [],
        apiCalls: 0,
        validationTime: 0,
        totalCandidates: 0,
        totalValidated: 0,
        warnings: [],
        errors: []
    };

    try {
        console.log(`\n🔍 Discovering URLs for ${references.length} references...`);
        console.log(`   Max candidates per reference: ${opts.maxCandidates}`);
        console.log(`   Deep validation: ${opts.validateUrls ? 'enabled' : 'disabled'}`);

        const startTime = Date.now();

        // ====================================================================
        // PROCESS EACH REFERENCE
        // ====================================================================

        for (let i = 0; i < references.length; i++) {
            const ref = references[i];

            try {
                console.log(`\n   [${i + 1}/${references.length}] Citation ${ref.citationId}:`);

                // Select query strategy
                const strategy = selectQueryStrategy(ref);
                console.log(`   - Strategy: ${strategy.name} (${strategy.winRate}% win rate)`);

                // Generate search query
                const query = generateSearchQuery(ref, strategy);
                console.log(`   - Query: "${query}"`);

                // Search Google
                const searchResults = await searchGoogle(query, opts);
                results.apiCalls++;
                results.totalCandidates += searchResults.length;

                console.log(`   - Found ${searchResults.length} candidates`);

                if (searchResults.length === 0) {
                    results.warnings.push(
                        `No search results for citation ${ref.citationId} (query: "${query}")`
                    );
                    continue;
                }

                // Validate URLs if enabled
                let candidates = searchResults;
                if (opts.validateUrls) {
                    console.log(`   - Validating top ${Math.min(opts.maxCandidates, searchResults.length)} URLs...`);

                    const toValidate = searchResults.slice(0, opts.maxCandidates);
                    candidates = await validateUrls(toValidate);
                    results.totalValidated += toValidate.length;

                    const validCount = candidates.filter(c => c.validation.valid).length;
                    console.log(`   - Valid: ${validCount}/${toValidate.length}`);
                }

                // Rank candidates
                const ranked = rankCandidates(candidates, ref);

                // Select Primary and Secondary URLs
                const selection = selectUrls(ranked);

                const refResult = {
                    citationId: ref.citationId,
                    citationText: ref.citationText,
                    searchQuery: query,
                    strategyUsed: strategy.name,
                    primaryUrl: selection.primary?.url || null,
                    primaryScore: selection.primary?.score || 0,
                    primaryValidation: selection.primary?.validation?.status || 'not_validated',
                    secondaryUrl: selection.secondary?.url || null,
                    secondaryScore: selection.secondary?.score || 0,
                    secondaryValidation: selection.secondary?.validation?.status || 'not_validated',
                    candidatesFound: searchResults.length,
                    candidatesValidated: candidates.length,
                    allCandidates: ranked,  // Store all for database
                    searchDate: new Date().toISOString()
                };

                results.references.push(refResult);

                if (selection.primary) {
                    results.urlsDiscovered++;
                    console.log(`   ✓ Primary: ${selection.primary.url.substring(0, 60)}...`);
                }
                if (selection.secondary) {
                    console.log(`   ✓ Secondary: ${selection.secondary.url.substring(0, 60)}...`);
                }

            } catch (error) {
                results.errors.push(
                    `Failed to discover URLs for citation ${ref.citationId}: ${error.message}`
                );
                console.error(`   ❌ Error: ${error.message}`);
            }

            // Small delay between references
            await sleep(200);
        }

        results.validationTime = Math.round((Date.now() - startTime) / 1000);
        results.success = results.urlsDiscovered > 0;

        console.log('\n✅ URL discovery complete!');
        console.log(`   References processed: ${results.references.length}`);
        console.log(`   URLs discovered: ${results.urlsDiscovered}`);
        console.log(`   Total candidates: ${results.totalCandidates}`);
        console.log(`   Total validated: ${results.totalValidated}`);
        console.log(`   API calls: ${results.apiCalls}`);
        console.log(`   Time: ${results.validationTime}s`);

        if (results.warnings.length > 0) {
            console.log(`\n⚠️  ${results.warnings.length} warning(s) - see results.warnings`);
        }

    } catch (error) {
        results.errors.push(`URL discovery failed: ${error.message}`);
        results.success = false;
        console.error(`\n❌ Error: ${error.message}`);
    }

    return results;
}

// ============================================================================
// QUERY STRATEGY SELECTION
// ============================================================================

/**
 * Select appropriate query strategy for a reference
 *
 * @param {object} ref - Reference object
 * @returns {object} Selected strategy
 */
function selectQueryStrategy(ref) {
    // Strategy 2: MANUAL_REVIEW cases
    if (ref.flags && ref.flags.includes('MANUAL_REVIEW')) {
        return QUERY_STRATEGIES.title_keywords_5_terms;
    }

    // Strategy 3: Edge cases
    const isEdgeCase =
        !ref.title ||
        ref.title.length < 20 ||
        !ref.author ||
        (ref.flags && ref.flags.includes('EDGE_CASE'));

    if (isEdgeCase) {
        return QUERY_STRATEGIES.plus_best_2_from_tier_1;
    }

    // Strategy 1: Default
    return QUERY_STRATEGIES.title_first_60_chars;
}

/**
 * Generate search query based on strategy
 *
 * @param {object} ref - Reference object
 * @param {object} strategy - Query strategy
 * @returns {string} Search query
 */
function generateSearchQuery(ref, strategy) {
    const title = ref.title || '';
    const author = ref.author || '';
    const year = ref.year || '';

    switch (strategy.name) {
        case 'title_first_60_chars':
            // First 60 characters of title
            return title.substring(0, 60).trim();

        case 'title_keywords_5_terms':
            // Extract 5 key terms from title
            const keywords = extractKeywords(title, 5);
            return keywords.join(' ');

        case 'plus_best_2_from_tier_1':
            // Title + 2 best keywords from relevance
            const titleShort = title.substring(0, 40);
            const relevanceKeywords = extractKeywordsFromRelevance(ref.relevanceText, 2);
            return `${titleShort} ${relevanceKeywords.join(' ')}`.trim();

        default:
            return title.substring(0, 60);
    }
}

/**
 * Extract keywords from title
 *
 * @param {string} title - Title text
 * @param {number} count - Number of keywords to extract
 * @returns {Array} Array of keywords
 */
function extractKeywords(title, count) {
    // Stop words to filter out
    const stopWords = new Set([
        'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
        'of', 'with', 'by', 'from', 'about', 'as', 'into', 'through', 'during',
        'before', 'after', 'above', 'below', 'between', 'under', 'again', 'further',
        'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all',
        'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'than', 'too',
        'very', 'can', 'will', 'just', 'should', 'now'
    ]);

    // Tokenize and filter
    const words = title
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 3 && !stopWords.has(word));

    // Return top N words (simple: first N after filtering)
    return words.slice(0, count);
}

/**
 * Extract keywords from relevance text
 *
 * @param {string} relevanceText - Relevance text
 * @param {number} count - Number of keywords to extract
 * @returns {Array} Array of keywords
 */
function extractKeywordsFromRelevance(relevanceText, count) {
    if (!relevanceText) return [];

    // Extract nouns and significant terms
    // Simple approach: words that appear capitalized or are longer
    const words = relevanceText
        .replace(/Relevance:/i, '')
        .split(/\s+/)
        .filter(word => word.length > 5 && /[A-Z]/.test(word[0]))
        .map(word => word.toLowerCase().replace(/[^\w]/g, ''));

    // Return unique top N
    return [...new Set(words)].slice(0, count);
}

// ============================================================================
// GOOGLE SEARCH
// ============================================================================

/**
 * Search Google Custom Search API
 *
 * @param {string} query - Search query
 * @param {object} opts - Options with API credentials
 * @returns {Promise<Array>} Array of search result objects
 */
async function searchGoogle(query, opts) {
    const params = {
        key: opts.googleApiKey,
        cx: opts.googleCx,
        q: query,
        num: MAX_SEARCH_RESULTS
    };

    let lastError = null;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const response = await axios.get(GOOGLE_SEARCH_API_URL, {
                params,
                timeout: 30000  // 30 second timeout
            });

            const items = response.data.items || [];

            return items.map(item => ({
                url: item.link,
                title: item.title,
                snippet: item.snippet,
                displayLink: item.displayLink
            }));

        } catch (error) {
            lastError = error;

            if (error.response && error.response.status === 429) {
                // Rate limit - wait longer
                const delay = RETRY_DELAY_MS * attempt * 2;
                console.log(`   ⚠️ Rate limit hit, waiting ${delay}ms...`);
                await sleep(delay);
            } else if (attempt < MAX_RETRIES) {
                await sleep(RETRY_DELAY_MS * attempt);
            }
        }
    }

    throw lastError || new Error('Google Search failed after retries');
}

// ============================================================================
// URL VALIDATION (3 LEVELS)
// ============================================================================

/**
 * Validate multiple URLs in parallel
 *
 * @param {Array} urls - Array of URL objects
 * @returns {Promise<Array>} Array of URLs with validation results
 */
async function validateUrls(urls) {
    const batches = createBatches(urls, MAX_CONCURRENT_VALIDATIONS);
    const results = [];

    for (const batch of batches) {
        const promises = batch.map(url => validateSingleUrl(url));
        const batchResults = await Promise.allSettled(promises);

        for (let i = 0; i < batchResults.length; i++) {
            const result = batchResults[i];
            const url = batch[i];

            if (result.status === 'fulfilled') {
                results.push({
                    ...url,
                    validation: result.value
                });
            } else {
                results.push({
                    ...url,
                    validation: {
                        valid: false,
                        status: 'validation_failed',
                        reason: result.reason.message
                    }
                });
            }
        }
    }

    return results;
}

/**
 * Validate a single URL (3-level validation from v21.0)
 *
 * @param {object} urlObj - URL object with .url property
 * @returns {Promise<object>} Validation result
 */
async function validateSingleUrl(urlObj) {
    const url = urlObj.url;

    try {
        // ====================================================================
        // LEVEL 1: HTTP Status Check
        // ====================================================================

        const headResponse = await axios.head(url, {
            timeout: VALIDATION_TIMEOUT_MS,
            maxRedirects: 5,
            validateStatus: () => true  // Don't throw on any status
        });

        const status = headResponse.status;

        if (status >= 400) {
            return {
                valid: false,
                status: 'http_error',
                reason: `HTTP ${status} error`,
                httpStatus: status
            };
        }

        const contentType = (headResponse.headers['content-type'] || '').toLowerCase();

        // ====================================================================
        // LEVEL 2: Content-Type Validation
        // ====================================================================

        // Check for PDF mismatch (PDF URL returning HTML = soft 404)
        if (url.toLowerCase().includes('.pdf') && contentType.includes('html')) {
            return {
                valid: false,
                status: 'soft_404',
                reason: 'PDF URL returns HTML (likely error page)',
                httpStatus: status,
                contentType: contentType
            };
        }

        // ====================================================================
        // LEVEL 3: Content-Based Detection (HTML pages only)
        // ====================================================================

        if (contentType.includes('html') || contentType.includes('text')) {
            // Fetch first 15KB of content
            const getResponse = await axios.get(url, {
                timeout: VALIDATION_TIMEOUT_MS,
                maxRedirects: 5,
                responseType: 'arraybuffer',
                validateStatus: () => true,
                headers: {
                    'Range': 'bytes=0-15000'  // Request only first 15KB
                }
            });

            let htmlContent = '';
            if (getResponse.data) {
                htmlContent = Buffer.from(getResponse.data).toString('utf8');
            }

            // Check for paywall patterns
            const paywallCheck = detectPaywall(htmlContent);
            if (paywallCheck.detected) {
                return {
                    valid: false,
                    status: 'paywall',
                    reason: `Paywall detected: ${paywallCheck.pattern}`,
                    httpStatus: status,
                    contentType: contentType
                };
            }

            // Check for login patterns
            const loginCheck = detectLogin(htmlContent);
            if (loginCheck.detected) {
                return {
                    valid: false,
                    status: 'login_required',
                    reason: `Login required: ${loginCheck.pattern}`,
                    httpStatus: status,
                    contentType: contentType
                };
            }

            // Check for soft 404 patterns
            const soft404Check = detectSoft404(htmlContent);
            if (soft404Check.detected) {
                return {
                    valid: false,
                    status: 'soft_404',
                    reason: `Soft 404 detected: ${soft404Check.pattern}`,
                    httpStatus: status,
                    contentType: contentType
                };
            }
        }

        // ====================================================================
        // VALIDATION PASSED
        // ====================================================================

        return {
            valid: true,
            status: 'valid',
            reason: 'All validation checks passed',
            httpStatus: status,
            contentType: contentType
        };

    } catch (error) {
        // Network error, timeout, etc.
        return {
            valid: false,
            status: 'network_error',
            reason: `Network error: ${error.message}`
        };
    }
}

// ============================================================================
// CONTENT PATTERN DETECTION
// ============================================================================

/**
 * Detect paywall patterns in HTML content
 *
 * @param {string} html - HTML content
 * @returns {object} Detection result
 */
function detectPaywall(html) {
    const patterns = [
        { regex: /subscribe to continue|subscription required/i, name: 'subscription required' },
        { regex: /purchase access|buy article/i, name: 'purchase required' },
        { regex: /institutional access|login to access/i, name: 'institutional access' },
        { regex: /member content|members only/i, name: 'member content' },
        { regex: /premium article|premium content/i, name: 'premium content' },
        { regex: /paywall|pay wall/i, name: 'paywall' },
        { regex: /unlock full article|unlock this article/i, name: 'unlock required' },
        { regex: /register to read|sign up to read/i, name: 'registration required' },
        { regex: /this content is restricted/i, name: 'restricted content' },
        { regex: /access denied|access restricted/i, name: 'access denied' },
        { regex: /subscription only|subscriber only/i, name: 'subscriber only' },
        { regex: /become a member to access/i, name: 'membership required' }
    ];

    for (const { regex, name } of patterns) {
        if (regex.test(html)) {
            return { detected: true, pattern: name };
        }
    }

    return { detected: false };
}

/**
 * Detect login requirement patterns in HTML content
 *
 * @param {string} html - HTML content
 * @returns {object} Detection result
 */
function detectLogin(html) {
    const patterns = [
        { regex: /sign in to view|sign in to access/i, name: 'sign in required' },
        { regex: /log in to view|login to access/i, name: 'login required' },
        { regex: /create account to read|register to view/i, name: 'account required' },
        { regex: /please log in|please sign in/i, name: 'authentication required' },
        { regex: /authentication required|auth required/i, name: 'auth required' },
        { regex: /you must be logged in/i, name: 'logged in required' },
        { regex: /access requires login/i, name: 'login for access' },
        { regex: /sign in with your account/i, name: 'account sign in' },
        { regex: /login portal|authentication page/i, name: 'login portal' },
        { regex: /credentials required|enter credentials/i, name: 'credentials required' }
    ];

    for (const { regex, name } of patterns) {
        if (regex.test(html)) {
            return { detected: true, pattern: name };
        }
    }

    return { detected: false };
}

/**
 * Detect soft 404 patterns in HTML content
 *
 * @param {string} html - HTML content
 * @returns {object} Detection result
 */
function detectSoft404(html) {
    const patterns = [
        { regex: /404.*not found|not found.*404/i, name: '404 error' },
        { regex: /page not found|page cannot be found/i, name: 'page not found' },
        { regex: /sorry.*couldn't find.*page/i, name: 'page not found (polite)' },
        { regex: /oops.*nothing here|there's nothing here/i, name: 'nothing here' },
        { regex: /doi not found|doi.*cannot be found/i, name: 'DOI not found' },
        { regex: /document not found|document.*not available/i, name: 'document not found' },
        { regex: /item.*not found|handle.*not found/i, name: 'item not found' },
        { regex: /<title>[^<]*(404|not found|error)[^<]*<\/title>/i, name: 'error in title' }
    ];

    for (const { regex, name } of patterns) {
        if (regex.test(html)) {
            return { detected: true, pattern: name };
        }
    }

    return { detected: false };
}

// ============================================================================
// CANDIDATE RANKING
// ============================================================================

/**
 * Rank URL candidates based on multiple factors
 *
 * @param {Array} candidates - Array of candidate URLs
 * @param {object} ref - Reference object
 * @returns {Array} Ranked candidates
 */
function rankCandidates(candidates, ref) {
    const ranked = candidates.map(candidate => {
        let score = 0;

        // Factor 1: Relevance match (40%)
        const relevanceScore = calculateRelevanceMatch(candidate, ref);
        score += relevanceScore * 0.4;

        // Factor 2: Domain authority (20%)
        const domainScore = calculateDomainAuthority(candidate.url);
        score += domainScore * 0.2;

        // Factor 3: Direct PDF link (20%)
        const formatScore = candidate.url.toLowerCase().includes('.pdf') ? 1.0 : 0.5;
        score += formatScore * 0.2;

        // Factor 4: Validation status (20%)
        const validationScore = candidate.validation?.valid ? 1.0 : 0.0;
        score += validationScore * 0.2;

        return {
            ...candidate,
            score: score,
            scoreBreakdown: {
                relevance: relevanceScore,
                domain: domainScore,
                format: formatScore,
                validation: validationScore
            }
        };
    });

    // Sort by score descending
    return ranked.sort((a, b) => b.score - a.score);
}

/**
 * Calculate relevance match between candidate and reference
 *
 * @param {object} candidate - Candidate URL object
 * @param {object} ref - Reference object
 * @returns {number} Score 0-1
 */
function calculateRelevanceMatch(candidate, ref) {
    const title = (ref.title || '').toLowerCase();
    const author = (ref.author || '').toLowerCase();
    const snippet = (candidate.snippet || '').toLowerCase();
    const urlText = (candidate.url || '').toLowerCase();

    let matches = 0;
    let possible = 0;

    // Check title words in snippet
    const titleWords = title.split(/\s+/).filter(w => w.length > 3);
    possible += titleWords.length;
    matches += titleWords.filter(word => snippet.includes(word)).length;

    // Check author in snippet
    if (author) {
        const authorWords = author.split(/\s+/);
        possible += authorWords.length;
        matches += authorWords.filter(word => snippet.includes(word)).length;
    }

    // Check title in URL
    if (titleWords.some(word => urlText.includes(word))) {
        matches += 2;
        possible += 2;
    }

    return possible > 0 ? matches / possible : 0.5;
}

/**
 * Calculate domain authority score
 *
 * @param {string} url - URL string
 * @returns {number} Score 0-1
 */
function calculateDomainAuthority(url) {
    const urlLower = url.toLowerCase();

    // Tier 1: High authority (.edu, .gov, .org)
    if (urlLower.includes('.edu') || urlLower.includes('.gov')) {
        return 1.0;
    }

    if (urlLower.includes('.org')) {
        return 0.9;
    }

    // Tier 2: Academic publishers
    const publishers = ['springer', 'wiley', 'elsevier', 'jstor', 'sage', 'oxford', 'cambridge', 'taylor'];
    if (publishers.some(pub => urlLower.includes(pub))) {
        return 0.8;
    }

    // Tier 3: DOI and archives
    if (urlLower.includes('doi.org') || urlLower.includes('archive.org')) {
        return 0.7;
    }

    // Tier 4: Everything else
    return 0.5;
}

// ============================================================================
// URL SELECTION
// ============================================================================

/**
 * Select Primary and Secondary URLs from ranked candidates
 *
 * @param {Array} rankedCandidates - Ranked array of candidates
 * @returns {object} Selected URLs
 */
function selectUrls(rankedCandidates) {
    // Filter to only valid URLs
    const valid = rankedCandidates.filter(c => c.validation?.valid);

    return {
        primary: valid[0] || null,
        secondary: valid[1] || null
    };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

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
    discoverUrls,

    // Core functions
    selectQueryStrategy,
    generateSearchQuery,
    searchGoogle,
    validateUrls,
    validateSingleUrl,
    rankCandidates,
    selectUrls,

    // Detection functions
    detectPaywall,
    detectLogin,
    detectSoft404,

    // Utility functions
    extractKeywords,
    extractKeywordsFromRelevance,
    calculateRelevanceMatch,
    calculateDomainAuthority,

    // Constants
    QUERY_STRATEGIES
};
