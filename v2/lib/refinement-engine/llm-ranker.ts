/**
 * Reference Refinement v2 - LLM Ranker
 *
 * Ranks search candidates using Claude AI with proven pipe-delimited format.
 *
 * Key patterns from v1:
 * - Pipe-delimited output (not JSON - Claude struggles with JSON formatting)
 * - Mutual exclusivity rules (PRIMARY ≥70 → SECONDARY <30)
 * - Enhanced query prompts (v16.1)
 * - Batch ranking (10 URLs per API call)
 *
 * Based on v1 v16.1 (enhanced prompts) and v13.11 (pipe-delimited format)
 */

import Anthropic from '@anthropic-ai/sdk';
import type { Reference, SearchCandidate, RankingResult } from '../types/index.js';

/**
 * Configuration for LLM ranker
 */
export interface RankerConfig {
  /** Anthropic API key */
  api_key: string;
  /** Claude model to use */
  model: string;
  /** Maximum tokens in response */
  max_tokens: number;
  /** Temperature (0-1, lower = more deterministic) */
  temperature: number;
  /** Batch size for ranking */
  batch_size: number;
  /** Request timeout in milliseconds */
  timeout: number;
}

/**
 * Default ranker configuration
 */
export const DEFAULT_RANKER_CONFIG: Partial<RankerConfig> = {
  model: 'claude-3-5-haiku-20241022', // Fast and cost-effective
  max_tokens: 4096,
  temperature: 0.3,
  batch_size: 10, // Rank 10 URLs per API call
  timeout: 25000, // 25 seconds
};

/**
 * LLM Ranker
 *
 * Uses Claude AI to rank search candidates for academic references.
 */
export class LLMRanker {
  private client: Anthropic;
  private config: RankerConfig;
  private stats = {
    api_calls: 0,
    input_tokens: 0,
    output_tokens: 0,
    total_cost: 0,
  };

  constructor(config: Partial<RankerConfig> & { api_key: string }) {
    this.config = { ...DEFAULT_RANKER_CONFIG, ...config } as RankerConfig;
    this.client = new Anthropic({ apiKey: this.config.api_key });
  }

  /**
   * Rank search candidates for a reference
   *
   * @param reference - Academic reference to rank candidates for
   * @param candidates - Search candidates to rank
   * @returns Array of ranking results
   */
  async rankCandidates(
    reference: Reference,
    candidates: SearchCandidate[]
  ): Promise<RankingResult[]> {
    if (candidates.length === 0) {
      return [];
    }

    const allRankings: RankingResult[] = [];

    // Process candidates in batches
    for (let i = 0; i < candidates.length; i += this.config.batch_size) {
      const batch = candidates.slice(i, i + this.config.batch_size);
      const batchRankings = await this.rankBatch(reference, batch, i);
      allRankings.push(...batchRankings);
    }

    return allRankings;
  }

  /**
   * Rank a batch of candidates
   *
   * @param reference - Academic reference
   * @param batch - Batch of candidates to rank
   * @param startIndex - Starting index for this batch
   * @returns Array of ranking results
   */
  private async rankBatch(
    reference: Reference,
    batch: SearchCandidate[],
    startIndex: number
  ): Promise<RankingResult[]> {
    const prompt = this.buildRankingPrompt(reference, batch);

    try {
      const message = await this.client.messages.create({
        model: this.config.model,
        max_tokens: this.config.max_tokens,
        temperature: this.config.temperature,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      // Update statistics
      this.stats.api_calls++;
      this.stats.input_tokens += message.usage.input_tokens;
      this.stats.output_tokens += message.usage.output_tokens;
      this.stats.total_cost += this.calculateCost(
        message.usage.input_tokens,
        message.usage.output_tokens
      );

      // Parse pipe-delimited response
      const content = message.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Claude');
      }

      const rankings = this.parseRankingResponse(content.text, batch, startIndex);
      return rankings;
    } catch (error) {
      console.error('LLM ranking error:', error);
      // Return fallback rankings (descending order with decreasing scores)
      return batch.map((candidate, i) => ({
        index: startIndex + i,
        url: candidate.url,
        primary_score: Math.max(0, 100 - i * 10),
        secondary_score: Math.max(0, 50 - i * 5),
        primary_reason: 'Fallback ranking (API error)',
        secondary_reason: 'Fallback ranking (API error)',
        recommendation: 'NEITHER' as const,
      }));
    }
  }

  /**
   * Build ranking prompt with enhanced criteria (v16.1 patterns)
   *
   * Uses pipe-delimited format (v13.11) - much more reliable than JSON
   */
  private buildRankingPrompt(reference: Reference, candidates: SearchCandidate[]): string {
    const { authors, title, year, publication } = reference.parsed;

    let prompt = `Rank these search results for the following academic reference:

REFERENCE:
Title: ${title || 'Unknown'}
Author(s): ${authors || 'Unknown'}
Year: ${year || 'Unknown'}
Publication: ${publication || 'Unknown'}

CANDIDATES:
`;

    candidates.forEach((candidate, i) => {
      prompt += `\n${i + 1}. ${candidate.title}
   URL: ${candidate.url}
   Snippet: ${candidate.snippet}\n`;
    });

    prompt += `

SCORING INSTRUCTIONS:

Score each URL on two dimensions (0-100):

PRIMARY SCORE (0-100):
How well does this URL provide the WORK ITSELF (the book, article, or paper)?

High PRIMARY scores (90-100):
• Free full-text PDF or HTML of the complete work
• Author's personal website with full text
• University repository with full document
• Archive.org with full text available

Medium PRIMARY scores (70-85):
• Publisher page with full text (may be paywalled)
• Google Books with substantial preview
• Academia.edu or ResearchGate with full text

Lower PRIMARY scores (60-75):
• Publisher page (purchase/abstract only)
• Bookstore or library catalog entry

Low PRIMARY scores (0-55):
• Reviews of the work (this is ABOUT the work, not the work itself)
• Bibliographies or citations
• Unrelated content

SECONDARY SCORE (0-100):
How well does this URL provide REVIEWS or ANALYSES of this specific work?

High SECONDARY scores (90-100):
• Peer-reviewed scholarly review of THIS SPECIFIC WORK
• Academic book review of THIS SPECIFIC WORK
• Title explicitly appears in the review

Medium SECONDARY scores (75-90):
• Non-academic review of THIS SPECIFIC WORK (e.g., NYT book review)
• Blog post analyzing THIS SPECIFIC WORK
• Title mentioned in discussion

Lower SECONDARY scores (55-70):
• Topic discussion (about same subject but doesn't mention THIS WORK)
• Thematic exploration related to the work's subject

Low SECONDARY scores (0-55):
• The work itself (not a review)
• Publisher pages
• Library catalogs
• Bibliographies
• PhilPapers listings (just metadata)
• WorldCat entries (just metadata)

⚠️ CRITICAL MUTUAL EXCLUSIVITY RULES:

1. If PRIMARY score ≥ 70:
   → This is the work itself or publisher page
   → SECONDARY score MUST be 0-30

2. If SECONDARY score ≥ 70:
   → This is a review/analysis of the work
   → PRIMARY score MUST be 0-55

3. A URL should be EITHER a primary candidate OR a secondary candidate, NOT BOTH

4. Full-text sources → HIGH PRIMARY (90-100), LOW SECONDARY (0-20)
5. Reviews/analyses → HIGH SECONDARY (75-100), LOW PRIMARY (0-50)

QUALITY INDICATORS:

For PRIMARY (work itself):
✓ .edu domains with /pdf/ or /bitstream/ paths
✓ archive.org with "borrow" or "download"
✓ Free PDF links from university sites
✓ Author's personal website
✓ ResearchGate or Academia.edu full text
✓ Mentions "complete", "full text", or author name

For SECONDARY (reviews/analyses):
✓ Contains "review of", "analysis of", "critique of"
✓ Academic journal review articles
✓ Scholarly discussion mentioning the title
✓ Evaluative/analytical language about THIS WORK

RED FLAGS:
❌ Generic bibliographies or reference lists
❌ Library catalogs (unless full text available)
❌ PhilPapers metadata pages
❌ "Page not found" indicators in snippet
❌ Unrelated topics despite matching keywords

OUTPUT FORMAT:

Return each candidate as pipe-delimited line:
INDEX|PRIMARY|SECONDARY|PRIMARY_REASON|SECONDARY_REASON|RECOMMEND

Where:
- INDEX = candidate number (1-${candidates.length})
- PRIMARY = PRIMARY score (0-100)
- SECONDARY = SECONDARY score (0-100)
- PRIMARY_REASON = brief reason for PRIMARY score (one sentence)
- SECONDARY_REASON = brief reason for SECONDARY score (one sentence)
- RECOMMEND = PRIMARY, SECONDARY, or NEITHER

Example output:
1|95|10|Free full-text PDF from university repository|Not a review, this is the work itself|PRIMARY
2|45|85|Review article, not the work itself|Scholarly peer review of this specific work|SECONDARY
3|30|20|Unrelated bibliography listing|Not about this specific work|NEITHER

Return ONLY the pipe-delimited lines, no other text.`;

    return prompt;
  }

  /**
   * Parse pipe-delimited ranking response
   *
   * Format: INDEX|PRIMARY|SECONDARY|PRIMARY_REASON|SECONDARY_REASON|RECOMMEND
   */
  private parseRankingResponse(
    response: string,
    candidates: SearchCandidate[],
    startIndex: number
  ): RankingResult[] {
    const rankings: RankingResult[] = [];
    const lines = response.trim().split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.includes('|')) continue;

      const parts = trimmed.split('|').map((p) => p.trim());
      if (parts.length < 6) continue;

      try {
        const index = parseInt(parts[0]) - 1; // Convert to 0-based
        const primary_score = parseInt(parts[1]);
        const secondary_score = parseInt(parts[2]);
        const primary_reason = parts[3];
        const secondary_reason = parts[4];
        const recommendation = parts[5].toUpperCase();

        if (
          index >= 0 &&
          index < candidates.length &&
          !isNaN(primary_score) &&
          !isNaN(secondary_score)
        ) {
          rankings.push({
            index: startIndex + index,
            url: candidates[index].url,
            primary_score: Math.max(0, Math.min(100, primary_score)),
            secondary_score: Math.max(0, Math.min(100, secondary_score)),
            primary_reason,
            secondary_reason,
            recommendation:
              recommendation === 'PRIMARY' || recommendation === 'SECONDARY'
                ? recommendation
                : 'NEITHER',
          });
        }
      } catch (error) {
        // Skip malformed lines
        continue;
      }
    }

    return rankings;
  }

  /**
   * Calculate cost for API call
   *
   * Claude 3.5 Haiku pricing (as of 2024):
   * - Input: $0.80 per million tokens
   * - Output: $4.00 per million tokens
   */
  private calculateCost(inputTokens: number, outputTokens: number): number {
    const inputCost = (inputTokens / 1_000_000) * 0.8;
    const outputCost = (outputTokens / 1_000_000) * 4.0;
    return inputCost + outputCost;
  }

  /**
   * Get ranking statistics
   *
   * @returns Statistics object with API usage and costs
   */
  getStatistics(): {
    api_calls: number;
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
    total_cost: number;
    avg_cost_per_call: number;
  } {
    return {
      ...this.stats,
      total_tokens: this.stats.input_tokens + this.stats.output_tokens,
      avg_cost_per_call: this.stats.api_calls > 0 ? this.stats.total_cost / this.stats.api_calls : 0,
    };
  }

  /**
   * Reset statistics
   */
  resetStatistics(): void {
    this.stats = {
      api_calls: 0,
      input_tokens: 0,
      output_tokens: 0,
      total_cost: 0,
    };
  }
}

/**
 * Convenience function to rank candidates
 *
 * @param reference - Academic reference
 * @param candidates - Search candidates
 * @param config - Ranker configuration (must include api_key)
 * @returns Array of ranking results
 */
export async function rankCandidates(
  reference: Reference,
  candidates: SearchCandidate[],
  config: Partial<RankerConfig> & { api_key: string }
): Promise<RankingResult[]> {
  const ranker = new LLMRanker(config);
  return ranker.rankCandidates(reference, candidates);
}
