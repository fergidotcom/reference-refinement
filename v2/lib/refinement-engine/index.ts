/**
 * Reference Refinement v2 - Refinement Engine
 *
 * Complete URL refinement pipeline:
 * 1. Validate candidate URLs (3-level detection)
 * 2. Rank candidates using Claude AI
 * 3. Select best PRIMARY and SECONDARY URLs
 *
 * Based on proven patterns from v1 (v16.2 + v16.1 + v14.5 + v13.11)
 */

import { URLValidator } from './url-validator.js';
import { LLMRanker } from './llm-ranker.js';
import { URLSelector } from './url-selector.js';
import type { RefinementEngineConfig } from './refinement-config.js';
import { validateRefinementConfig } from './refinement-config.js';
import type { Reference, SearchCandidate, RankingResult, URLSelection } from '../types/index.js';

/**
 * Refinement Engine
 *
 * Orchestrates URL validation, ranking, and selection.
 */
export class RefinementEngine {
  private validator: URLValidator;
  private ranker: LLMRanker;
  private selector: URLSelector;
  private config: RefinementEngineConfig;

  constructor(config: RefinementEngineConfig) {
    validateRefinementConfig(config);
    this.config = config;

    this.validator = new URLValidator(config.validator);
    this.ranker = new LLMRanker({
      api_key: config.anthropic_api_key,
      ...config.ranker,
    });
    this.selector = new URLSelector(config.selector);
  }

  /**
   * Refine URLs for a reference
   *
   * Complete pipeline:
   * 1. Rank all candidates using Claude AI
   * 2. Validate top N candidates
   * 3. Select best PRIMARY and SECONDARY URLs
   *
   * @param reference - Academic reference
   * @param candidates - Search candidates
   * @returns URL selection and enriched rankings
   */
  async refineURLs(
    reference: Reference,
    candidates: SearchCandidate[]
  ): Promise<{
    selection: URLSelection;
    rankings: RankingResult[];
    stats: {
      total_candidates: number;
      ranked_candidates: number;
      validated_candidates: number;
      valid_candidates: number;
      invalid_candidates: number;
    };
  }> {
    if (candidates.length === 0) {
      return {
        selection: {
          high_confidence: false,
          needs_review: true,
        },
        rankings: [],
        stats: {
          total_candidates: 0,
          ranked_candidates: 0,
          validated_candidates: 0,
          valid_candidates: 0,
          invalid_candidates: 0,
        },
      };
    }

    // Step 1: Rank all candidates
    const rankings = await this.ranker.rankCandidates(reference, candidates);

    // Step 2: Validate top N candidates
    const topCandidates = rankings.slice(0, this.config.validate_top_n);
    const validationResults = await Promise.all(
      topCandidates.map((ranking) => this.validator.validateURL(ranking.url))
    );

    // Enrich rankings with validation results
    const enrichedRankings = rankings.map((ranking, index) => {
      if (index < topCandidates.length) {
        const validation = validationResults[index];
        return {
          ...ranking,
          valid: validation.valid,
          status: validation.status,
          validation_reason: validation.reason,
        };
      }
      // URLs beyond top N are not validated (assumed potentially valid)
      return {
        ...ranking,
        valid: undefined, // Not validated
      };
    });

    // Step 3: Select best URLs (only from validated candidates)
    const validatedRankings = enrichedRankings.filter((r) => r.valid !== undefined);
    const selection = this.selector.selectURLs(validatedRankings);

    // Calculate statistics
    const validCount = validatedRankings.filter((r) => r.valid === true).length;
    const invalidCount = validatedRankings.filter((r) => r.valid === false).length;

    return {
      selection,
      rankings: enrichedRankings,
      stats: {
        total_candidates: candidates.length,
        ranked_candidates: rankings.length,
        validated_candidates: validatedRankings.length,
        valid_candidates: validCount,
        invalid_candidates: invalidCount,
      },
    };
  }

  /**
   * Get cost statistics from ranker
   *
   * @returns API usage and cost statistics
   */
  getStatistics(): {
    api_calls: number;
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
    total_cost: number;
    avg_cost_per_call: number;
  } {
    return this.ranker.getStatistics();
  }

  /**
   * Reset statistics
   */
  resetStatistics(): void {
    this.ranker.resetStatistics();
  }
}

// Re-export components and types
export { URLValidator, LLMRanker, URLSelector };
export type { ValidatorConfig } from './url-validator.js';
export type { RankerConfig } from './llm-ranker.js';
export type { SelectorConfig } from './url-selector.js';
export type { RefinementEngineConfig };
export { createRefinementConfig, validateRefinementConfig, DEFAULT_REFINEMENT_CONFIG } from './refinement-config.js';
