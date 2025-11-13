/**
 * Relevance Generator - Component 3 of Phase 1
 *
 * Generates 200-word relevance explanations for references using Claude API
 *
 * Takes:
 * - Bibliographic reference
 * - Context from manuscript
 * - Returns formatted relevance text
 */

const axios = require('axios');
require('dotenv').config();

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const CLAUDE_MODEL = 'claude-sonnet-4-5-20250929'; // Latest Sonnet model
const MAX_TOKENS = 500; // ~200 words

// Rate limiting
const RATE_LIMIT_DELAY = 1000; // 1 second between requests
let lastRequestTime = 0;

/**
 * Generate relevance explanation for a reference
 *
 * @param {object} referenceData - Reference information
 * @param {string} referenceData.bibEntry - Full bibliographic entry
 * @param {string} referenceData.context - Manuscript context where cited
 * @param {string} referenceData.section - Section heading (optional)
 * @returns {Promise<object>} - Result with relevance text
 */
async function generateRelevance(referenceData) {
    const results = {
        success: false,
        relevanceText: '',
        wordCount: 0,
        model: CLAUDE_MODEL,
        warnings: [],
        errors: []
    };

    try {
        // Validate inputs
        if (!referenceData.bibEntry) {
            results.errors.push('Missing bibliographic entry');
            return results;
        }

        if (!referenceData.context) {
            results.errors.push('Missing context');
            return results;
        }

        if (!ANTHROPIC_API_KEY) {
            results.errors.push('ANTHROPIC_API_KEY not set in environment');
            return results;
        }

        // Rate limiting
        await enforceRateLimit();

        // Build prompt
        const prompt = buildRelevancePrompt(referenceData);

        // Call Claude API
        const response = await callClaudeAPI(prompt);

        if (response.success) {
            results.relevanceText = response.content;
            results.wordCount = countWords(response.content);
            results.success = true;

            // Warn if word count is off
            if (results.wordCount < 150 || results.wordCount > 250) {
                results.warnings.push(`Word count ${results.wordCount} outside target range (150-250)`);
            }
        } else {
            results.errors.push(response.error || 'Unknown API error');
        }

    } catch (error) {
        results.success = false;
        results.errors.push(`Failed to generate relevance: ${error.message}`);
    }

    return results;
}

/**
 * Generate relevance for multiple references (batch processing)
 *
 * @param {array} referencesArray - Array of reference data objects
 * @param {function} progressCallback - Optional callback(current, total, reference)
 * @returns {Promise<array>} - Array of results
 */
async function generateRelevanceBatch(referencesArray, progressCallback = null) {
    const results = [];

    for (let i = 0; i < referencesArray.length; i++) {
        const refData = referencesArray[i];

        if (progressCallback) {
            progressCallback(i + 1, referencesArray.length, refData);
        }

        const result = await generateRelevance(refData);
        results.push({
            citationId: refData.citationId,
            ...result
        });

        // Rate limiting handled by generateRelevance
    }

    return results;
}

/**
 * Build the prompt for Claude API
 *
 * @param {object} referenceData - Reference information
 * @returns {string} - Formatted prompt
 */
function buildRelevancePrompt(referenceData) {
    let prompt = `You are helping an academic author explain why a particular reference is relevant to their manuscript.

**Reference:**
${referenceData.bibEntry}

**Context from manuscript:**
`;

    if (referenceData.section) {
        prompt += `Section: ${referenceData.section}\n\n`;
    }

    prompt += `${referenceData.context}

**Task:**
Write a 200-word explanation of why this reference is relevant to the manuscript context above. The explanation should:

1. Identify the key topic/argument of the reference
2. Explain how it connects to the manuscript context
3. Describe what specific information or evidence it provides
4. Be written in clear, professional academic language
5. Be exactly around 200 words (150-250 is acceptable)

**Format:**
Write ONLY the relevance explanation text. Do not include "Relevance:" as a prefix - that will be added automatically. Do not include any preamble or commentary, just the explanation itself.

**Example format:**
"This study examines the relationship between X and Y, finding that Z. In the context of the manuscript's discussion of [topic], this reference provides critical evidence for [specific point]. The authors demonstrate [key finding] which directly supports the manuscript's argument about [claim]..."

Now write the relevance explanation:`;

    return prompt;
}

/**
 * Call Claude API
 *
 * @param {string} prompt - The prompt to send
 * @returns {Promise<object>} - { success: boolean, content: string, error: string }
 */
async function callClaudeAPI(prompt) {
    try {
        const response = await axios.post(
            'https://api.anthropic.com/v1/messages',
            {
                model: CLAUDE_MODEL,
                max_tokens: MAX_TOKENS,
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
                    'x-api-key': ANTHROPIC_API_KEY,
                    'anthropic-version': '2023-06-01'
                },
                timeout: 30000 // 30 second timeout
            }
        );

        const content = response.data.content[0].text.trim();

        return {
            success: true,
            content,
            error: null
        };

    } catch (error) {
        let errorMessage = error.message;

        if (error.response) {
            errorMessage = `API error ${error.response.status}: ${error.response.data?.error?.message || error.response.statusText}`;
        }

        return {
            success: false,
            content: '',
            error: errorMessage
        };
    }
}

/**
 * Enforce rate limiting between API calls
 */
async function enforceRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;

    if (timeSinceLastRequest < RATE_LIMIT_DELAY) {
        const delay = RATE_LIMIT_DELAY - timeSinceLastRequest;
        await sleep(delay);
    }

    lastRequestTime = Date.now();
}

/**
 * Sleep helper
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Count words in text
 */
function countWords(text) {
    return text.trim().split(/\s+/).length;
}

/**
 * Format relevance text for decisions.txt
 *
 * @param {string} relevanceText - Raw relevance text from API
 * @returns {string} - Formatted with "Relevance:" prefix
 */
function formatRelevanceForOutput(relevanceText) {
    return `Relevance: ${relevanceText}`;
}

// Export functions
module.exports = {
    generateRelevance,
    generateRelevanceBatch,
    formatRelevanceForOutput,
    buildRelevancePrompt,
    callClaudeAPI
};

// Example usage
if (require.main === module) {
    // Test with sample data
    const testData = {
        citationId: 42,
        bibEntry: 'Smith, J. (2020). The Effects of Climate Change on Coastal Ecosystems. Nature Climate Change, 10(3), 234-245.',
        context: 'Rising sea levels have dramatically affected coastal wetlands in the past decade. These changes have led to significant biodiversity loss and ecosystem disruption.',
        section: 'Environmental Impact'
    };

    console.log('\n=== Relevance Generator Test ===\n');
    console.log('Generating relevance for sample reference...\n');

    generateRelevance(testData)
        .then(results => {
            console.log(`Success: ${results.success}`);
            console.log(`Model: ${results.model}`);
            console.log(`Word count: ${results.wordCount}`);

            if (results.success) {
                console.log('\nRelevance text:');
                console.log(formatRelevanceForOutput(results.relevanceText));
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
