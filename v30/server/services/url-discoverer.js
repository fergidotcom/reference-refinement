/**
 * URL Discoverer - Component 4 of Phase 1
 *
 * Discovers and validates URLs for references using v21.0 Query Evolution algorithms
 *
 * Features:
 * - Smart query strategy selection (82.3% usage of title_first_60_chars)
 * - Google Custom Search integration
 * - Deep URL validation (paywall/login/soft404 detection)
 * - URL ranking and selection
 * - Primary/Secondary/Tertiary designation
 */

const axios = require('axios');
require('dotenv').config();

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const GOOGLE_CX = process.env.GOOGLE_CX;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const CLAUDE_MODEL = 'claude-sonnet-4-5-20250929';

// Rate limiting
const GOOGLE_RATE_LIMIT = 1000; // 1 second between searches
const VALIDATION_BATCH_SIZE = 20; // Validate top 20 candidates
const VALIDATION_TIMEOUT = 5000; // 5 seconds per URL

/**
 * Discover URLs for a reference
 *
 * @param {object} referenceData - Reference information
 * @param {string} referenceData.title - Reference title
 * @param {string} referenceData.authors - Reference authors
 * @param {string} referenceData.year - Publication year
 * @param {string} referenceData.relevanceText - Relevance explanation
 * @param {array} referenceData.flags - Reference flags (e.g., MANUAL_REVIEW)
 * @param {object} referenceData.existingUrls - Existing URLs (for edge case strategy)
 * @returns {Promise<object>} - Results with discovered URLs
 */
async function discoverUrls(referenceData) {
    const results = {
        success: false,
        strategy: '',
        queries: [],
        candidates: [],
        selectedUrls: {
            primary: null,
            secondary: null,
            tertiary: null
        },
        stats: {
            totalSearchResults: 0,
            validUrls: 0,
            invalidUrls: 0,
            paywallUrls: 0
        },
        warnings: [],
        errors: []
    };

    try {
        // Validate inputs
        if (!referenceData.title) {
            results.errors.push('Missing title');
            return results;
        }

        if (!GOOGLE_API_KEY || !GOOGLE_CX) {
            results.errors.push('Google Search API not configured');
            return results;
        }

        // Step 1: Select query strategy
        const strategy = selectQueryStrategy(referenceData);
        results.strategy = strategy;

        // Step 2: Generate search queries
        const queries = await generateQueries(referenceData, strategy);
        results.queries = queries;

        // Step 3: Execute Google searches
        const searchResults = await executeSearches(queries);
        results.stats.totalSearchResults = searchResults.length;

        // Step 4: Validate URLs (top 20 candidates)
        const candidates = searchResults.slice(0, VALIDATION_BATCH_SIZE);
        const validatedCandidates = await validateUrls(candidates);
        results.candidates = validatedCandidates;

        // Update stats
        results.stats.validUrls = validatedCandidates.filter(c => c.isValid).length;
        results.stats.invalidUrls = validatedCandidates.filter(c => !c.isValid).length;
        results.stats.paywallUrls = validatedCandidates.filter(c => c.isPaywall || c.isLogin).length;

        // Step 5: Select best URLs
        const selectedUrls = selectBestUrls(validatedCandidates);
        results.selectedUrls = selectedUrls;

        results.success = true;

        // Warn if no valid URLs found
        if (!selectedUrls.primary) {
            results.warnings.push('No valid primary URL found');
        }

    } catch (error) {
        results.success = false;
        results.errors.push(`Failed to discover URLs: ${error.message}`);
    }

    return results;
}

/**
 * Select query strategy based on reference characteristics
 * Based on v21.0 Query Evolution validation
 *
 * Usage stats:
 * - title_first_60_chars: 82.3% (DEFAULT, 100% win rate)
 * - title_keywords_5_terms: 14.2% (MANUAL_REVIEW, 91.4% win rate)
 * - plus_best_2_from_tier_1: 3.5% (EDGE CASES, 100% win rate)
 */
function selectQueryStrategy(ref) {
    // Strategy 1: MANUAL_REVIEW references (14.2% usage, 91.4% win rate)
    if (ref.flags && ref.flags.includes('MANUAL_REVIEW')) {
        return 'title_keywords_5_terms';
    }

    // Strategy 2: Edge cases (3.5% usage, 100% win rate)
    const isEdgeCase = !ref.title ||
                      ref.title.length < 20 ||
                      !ref.authors ||
                      (ref.existingUrls && !ref.existingUrls.primary);

    if (isEdgeCase) {
        return 'plus_best_2_from_tier_1';
    }

    // Strategy 3: Typical references (82.3% usage, 100% win rate) - DEFAULT
    return 'title_first_60_chars';
}

/**
 * Generate search queries based on strategy
 */
async function generateQueries(ref, strategy) {
    switch (strategy) {
        case 'title_keywords_5_terms':
            return await generateTitleKeywords5Terms(ref);

        case 'plus_best_2_from_tier_1':
            return await generatePlusBest2FromTier1(ref);

        case 'title_first_60_chars':
            return generateTitleFirst60Chars(ref);

        default:
            return generateUnquotedFullTitle(ref);
    }
}

/**
 * Strategy 1: Title Keywords (5 terms)
 * Extract 5 most important keywords from title using Claude
 */
async function generateTitleKeywords5Terms(ref) {
    if (!ANTHROPIC_API_KEY) {
        // Fallback to simple extraction
        const words = ref.title.split(/\s+/).filter(w => w.length > 4).slice(0, 5);
        return [words.join(' ')];
    }

    try {
        const prompt = `Extract exactly 5 most important keywords from this title for academic search.
Title: ${ref.title}
${ref.relevanceText ? `Context: ${ref.relevanceText}` : ''}

Return ONLY the 5 keywords separated by spaces, no quotes, no explanations.
Example format: "climate change arctic wildlife impact"`;

        const response = await callClaudeAPI(prompt, 100);
        const keywords = response.content.trim();

        return [keywords, `"${ref.title.substring(0, 60)}"`]; // Include fallback query
    } catch (error) {
        // Fallback on error
        const words = ref.title.split(/\s+/).filter(w => w.length > 4).slice(0, 5);
        return [words.join(' ')];
    }
}

/**
 * Strategy 2: Plus Best 2 from Tier 1
 * Title + 2 best keywords from existing successful URLs
 */
async function generatePlusBest2FromTier1(ref) {
    // Extract domains from existing URLs
    const existingDomains = [];
    if (ref.existingUrls) {
        if (ref.existingUrls.primary) {
            try {
                const url = new URL(ref.existingUrls.primary);
                existingDomains.push(url.hostname);
            } catch (e) {}
        }
        if (ref.existingUrls.secondary) {
            try {
                const url = new URL(ref.existingUrls.secondary);
                existingDomains.push(url.hostname);
            } catch (e) {}
        }
    }

    if (!ANTHROPIC_API_KEY) {
        // Fallback: use title + "academic" + "pdf"
        return [`"${ref.title}" academic pdf`];
    }

    try {
        const prompt = `Generate search query using title plus 2 best keywords from existing successful sources.
Title: ${ref.title}
Authors: ${ref.authors || 'Unknown'}
Existing domains that worked: ${existingDomains.join(', ') || 'None'}

Return a search query that combines the title with 2 additional keywords that would help find similar sources.
Example format: "${ref.title}" academic repository pdf`;

        const response = await callClaudeAPI(prompt, 100);
        return [response.content.trim()];
    } catch (error) {
        // Fallback
        return [`"${ref.title}" academic pdf`];
    }
}

/**
 * Strategy 3: Title First 60 Chars (DEFAULT - 82.3% usage)
 * Use first 60 characters of title + author + year
 * Win rate: 100%
 */
function generateTitleFirst60Chars(ref) {
    const truncatedTitle = ref.title.substring(0, 60);
    const authorLastName = ref.authors ? ref.authors.split(',')[0].split(' ').pop() : '';
    const year = ref.year || '';

    const query = `"${truncatedTitle}" ${authorLastName} ${year}`.trim();
    return [query];
}

/**
 * Strategy 4: Unquoted Full Title (Baseline Fallback)
 */
function generateUnquotedFullTitle(ref) {
    const authorLastName = ref.authors ? ref.authors.split(',')[0].split(' ').pop() : '';
    const year = ref.year || '';

    const query = `${ref.title} ${authorLastName} ${year}`.trim();
    return [query];
}

/**
 * Execute Google Custom Search for queries
 */
async function executeSearches(queries) {
    const allResults = [];

    for (const query of queries) {
        await sleep(GOOGLE_RATE_LIMIT); // Rate limiting

        try {
            const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
                params: {
                    key: GOOGLE_API_KEY,
                    cx: GOOGLE_CX,
                    q: query,
                    num: 10 // Get top 10 results per query
                },
                timeout: 10000
            });

            if (response.data.items) {
                response.data.items.forEach(item => {
                    allResults.push({
                        url: item.link,
                        title: item.title,
                        snippet: item.snippet,
                        query: query
                    });
                });
            }
        } catch (error) {
            console.error(`Search failed for query "${query}":`, error.message);
        }
    }

    // Remove duplicates
    const uniqueResults = [];
    const seenUrls = new Set();

    for (const result of allResults) {
        if (!seenUrls.has(result.url)) {
            seenUrls.add(result.url);
            uniqueResults.push(result);
        }
    }

    return uniqueResults;
}

/**
 * Validate URLs (deep validation: paywall/login/soft404 detection)
 */
async function validateUrls(candidates) {
    const validated = [];

    for (const candidate of candidates) {
        const validation = await validateSingleUrl(candidate.url);

        validated.push({
            ...candidate,
            isValid: validation.isValid,
            isPaywall: validation.isPaywall,
            isLogin: validation.isLogin,
            isSoft404: validation.isSoft404,
            validationError: validation.error
        });
    }

    return validated;
}

/**
 * Validate a single URL
 * Implements 3-level validation from v16.7
 */
async function validateSingleUrl(url) {
    const result = {
        isValid: false,
        isPaywall: false,
        isLogin: false,
        isSoft404: false,
        error: null
    };

    try {
        const response = await axios.get(url, {
            timeout: VALIDATION_TIMEOUT,
            maxRedirects: 5,
            validateStatus: () => true, // Don't throw on any status
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; AcademicBot/1.0)'
            }
        });

        // Level 1: HTTP status check
        if (response.status === 404 || response.status >= 500) {
            result.error = `HTTP ${response.status}`;
            return result;
        }

        // Level 2: Paywall/Login detection
        const contentLower = (response.data || '').toLowerCase().substring(0, 15000);

        const paywallPatterns = [
            'paywall', 'subscription required', 'login to read',
            'purchase access', 'subscriber only', 'premium content',
            'sign in to continue', 'create account to read',
            'available to subscribers', 'upgrade to access',
            'behind paywall', 'subscription wall'
        ];

        const loginPatterns = [
            'access denied', 'login required', 'authentication required',
            'please sign in', 'you must be logged in',
            'unauthorized access', 'forbidden', 'members only',
            'registration required', 'account required'
        ];

        for (const pattern of paywallPatterns) {
            if (contentLower.includes(pattern)) {
                result.isPaywall = true;
                result.error = 'Paywall detected';
                return result;
            }
        }

        for (const pattern of loginPatterns) {
            if (contentLower.includes(pattern)) {
                result.isLogin = true;
                result.error = 'Login required';
                return result;
            }
        }

        // Level 3: Soft 404 detection (content-based)
        const soft404Patterns = [
            'page not found', '404 not found', 'not found error',
            'doi not found', 'article not found', 'resource not found',
            'no longer available', 'has been removed'
        ];

        for (const pattern of soft404Patterns) {
            if (contentLower.includes(pattern)) {
                result.isSoft404 = true;
                result.error = 'Soft 404 (content indicates not found)';
                return result;
            }
        }

        // All checks passed
        result.isValid = true;

    } catch (error) {
        result.error = error.message;
    }

    return result;
}

/**
 * Select best URLs from validated candidates
 */
function selectBestUrls(candidates) {
    // Filter to only valid URLs
    const validCandidates = candidates.filter(c => c.isValid);

    if (validCandidates.length === 0) {
        return { primary: null, secondary: null, tertiary: null };
    }

    // Prioritize by domain trust score
    const scored = validCandidates.map(c => ({
        ...c,
        score: calculateTrustScore(c.url)
    }));

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    return {
        primary: scored[0] ? scored[0].url : null,
        secondary: scored[1] ? scored[1].url : null,
        tertiary: scored[2] ? scored[2].url : null
    };
}

/**
 * Calculate trust score for a URL
 * Higher score = more trustworthy domain
 */
function calculateTrustScore(url) {
    let score = 100;

    try {
        const urlObj = new URL(url);
        const domain = urlObj.hostname.toLowerCase();

        // Tier 1: Highly trusted academic domains (+50)
        const tier1 = [
            'doi.org', 'jstor.org', 'pubmed.ncbi.nlm.nih.gov',
            'springer.com', 'nature.com', 'science.org',
            'wiley.com', 'elsevier.com', 'oxford.ac.uk',
            'cambridge.org', 'nih.gov', 'edu'
        ];

        for (const trusted of tier1) {
            if (domain.includes(trusted)) {
                score += 50;
                break;
            }
        }

        // Tier 2: Academic repositories (+30)
        const tier2 = [
            'arxiv.org', 'researchgate.net', 'academia.edu',
            'semanticscholar.org', 'ssrn.com', 'biorxiv.org'
        ];

        for (const repo of tier2) {
            if (domain.includes(repo)) {
                score += 30;
                break;
            }
        }

        // Bonus for PDF (+20)
        if (url.toLowerCase().endsWith('.pdf')) {
            score += 20;
        }

        // Penalty for suspicious domains (-50)
        const suspicious = ['sci-hub', 'libgen', 'blogspot', 'wordpress.com'];
        for (const bad of suspicious) {
            if (domain.includes(bad)) {
                score -= 50;
                break;
            }
        }

    } catch (e) {
        // Invalid URL
        score = 0;
    }

    return score;
}

/**
 * Call Claude API helper
 */
async function callClaudeAPI(prompt, maxTokens = 100) {
    const response = await axios.post(
        'https://api.anthropic.com/v1/messages',
        {
            model: CLAUDE_MODEL,
            max_tokens: maxTokens,
            messages: [{ role: 'user', content: prompt }]
        },
        {
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': ANTHROPIC_API_KEY,
                'anthropic-version': '2023-06-01'
            },
            timeout: 30000
        }
    );

    return {
        success: true,
        content: response.data.content[0].text.trim()
    };
}

/**
 * Sleep helper
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Export functions
module.exports = {
    discoverUrls,
    selectQueryStrategy,
    generateQueries,
    validateUrls,
    selectBestUrls,
    calculateTrustScore
};

// Example usage
if (require.main === module) {
    const testData = {
        title: 'The Effects of Climate Change on Coastal Ecosystems',
        authors: 'Smith, J., Jones, M.',
        year: '2020',
        relevanceText: 'This study examines coastal wetland biodiversity loss.',
        flags: [],
        existingUrls: {}
    };

    console.log('\n=== URL Discoverer Test ===\n');
    console.log('Discovering URLs for test reference...\n');

    discoverUrls(testData)
        .then(results => {
            console.log(`Success: ${results.success}`);
            console.log(`Strategy: ${results.strategy}`);
            console.log(`Queries: ${results.queries.join(', ')}`);
            console.log('\nStats:');
            console.log(`  Total results: ${results.stats.totalSearchResults}`);
            console.log(`  Valid URLs: ${results.stats.validUrls}`);
            console.log(`  Invalid URLs: ${results.stats.invalidUrls}`);
            console.log(`  Paywall URLs: ${results.stats.paywallUrls}`);

            if (results.selectedUrls.primary) {
                console.log('\nSelected URLs:');
                console.log(`  Primary: ${results.selectedUrls.primary}`);
                if (results.selectedUrls.secondary) {
                    console.log(`  Secondary: ${results.selectedUrls.secondary}`);
                }
                if (results.selectedUrls.tertiary) {
                    console.log(`  Tertiary: ${results.selectedUrls.tertiary}`);
                }
            }

            if (results.warnings.length > 0) {
                console.log('\nWarnings:');
                results.warnings.forEach(w => console.log(`  - ${w}`));
            }

            if (results.errors.length > 0) {
                console.log('\nErrors:');
                results.errors.forEach(e => console.log(`  - ${e}`));
            }
        })
        .catch(error => {
            console.error('Fatal error:', error.message);
            process.exit(1);
        });
}
