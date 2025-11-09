/**
 * Reference Refinement v2 - Reference Pipeline
 *
 * Complete end-to-end pipeline for processing a single reference:
 * 1. Generate search queries (simple implementation)
 * 2. Search for URLs (Google Custom Search)
 * 3. Rank candidates (Claude AI)
 * 4. Validate URLs (3-level detection)
 * 5. Select best URLs (mutual exclusivity)
 * 6. Update reference with results
 */

import { SearchEngine, generateSimpleQueries } from '../search-engine/index.js';
import { RefinementEngine } from '../refinement-engine/index.js';
import type { PipelineConfig } from './pipeline-config.js';
import type { Reference } from '../types/index.js';

/**
 * Pipeline result for a single reference
 */
export interface PipelineResult {
  /** Updated reference with URLs */
  reference: Reference;
  /** Whether processing was successful */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** Processing statistics */
  stats: {
    queries_generated: number;
    candidates_found: number;
    candidates_validated: number;
    valid_candidates: number;
    primary_score: number | null;
    secondary_score: number | null;
    primary_confidence: number | null;
    secondary_confidence: number | null;
    cost: number;
    processing_time_ms: number;
  };
}

/**
 * Reference Pipeline
 *
 * Processes a single reference through the complete pipeline
 */
export class ReferencePipeline {
  private config: PipelineConfig;
  private searchEngine: SearchEngine;
  private refinementEngine: RefinementEngine;

  constructor(config: PipelineConfig) {
    this.config = config;

    this.searchEngine = new SearchEngine({
      google_api_key: config.google_api_key,
      google_cse_id: config.google_cse_id,
      results_per_query: config.search.results_per_query,
      delay_between_searches: config.rate_limiting.delay_after_search,
    });

    this.refinementEngine = new RefinementEngine({
      anthropic_api_key: config.anthropic_api_key,
      validator: {
        timeout: config.rate_limiting.timeout,
        delay_between_requests: config.rate_limiting.delay_after_validation,
        enhanced_soft_404: config.refinement.enhanced_soft_404,
        max_content_size: 15360, // 15KB
      },
      ranker: {
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 4096,
        temperature: 0.3,
        batch_size: 10,
        timeout: 25000,
      },
      selector: {
        primary_threshold: config.refinement.primary_threshold,
        secondary_threshold: config.refinement.secondary_threshold,
        confidence_threshold: 0.8,
        require_validation: true,
      },
      validate_top_n: config.refinement.validate_top_n,
    });
  }

  /**
   * Process a single reference
   *
   * @param reference - Reference to process
   * @returns Pipeline result
   */
  async processReference(reference: Reference): Promise<PipelineResult> {
    const startTime = Date.now();

    try {
      // Step 1: Generate search queries
      const queries = generateSimpleQueries(
        reference,
        this.config.search.primary_queries,
        this.config.search.secondary_queries
      );

      if (queries.length === 0) {
        return this.createErrorResult(
          reference,
          'No queries generated (missing title)',
          startTime
        );
      }

      // Update reference with queries
      reference.queries = queries;

      // Step 2: Search for URLs
      const candidates = await this.searchEngine.search(queries);

      if (candidates.length === 0) {
        return this.createErrorResult(
          reference,
          'No search candidates found',
          startTime
        );
      }

      // Step 3-5: Refine URLs (rank + validate + select)
      const refinement = await this.refinementEngine.refineURLs(reference, candidates);

      // Update reference with selected URLs
      if (refinement.selection.primary) {
        reference.urls.primary = refinement.selection.primary.url;
        if (reference.meta) {
          reference.meta.primary_confidence = refinement.selection.primary.confidence;
        } else {
          reference.meta = { primary_confidence: refinement.selection.primary.confidence };
        }
      }

      if (refinement.selection.secondary) {
        reference.urls.secondary = refinement.selection.secondary.url;
        if (reference.meta) {
          reference.meta.secondary_confidence = refinement.selection.secondary.confidence;
        } else {
          reference.meta = { secondary_confidence: refinement.selection.secondary.confidence };
        }
      }

      // Update meta information
      reference.meta = {
        ...reference.meta,
        processed_at: new Date(),
        candidates_count: candidates.length,
      };

      // Set flags based on configuration and results
      if (this.config.output.auto_finalize && refinement.selection.high_confidence) {
        reference.flags.finalized = true;
      }

      if (refinement.selection.needs_review) {
        reference.flags.manual_review = true;
      }

      if (this.config.output.batch_version) {
        reference.flags.batch_version = this.config.output.batch_version;
      }

      // Get cost from refinement engine
      const refinementStats = this.refinementEngine.getStatistics();
      const cost = refinementStats.total_cost + candidates.length * 0.005; // Google CSE cost

      // Update reference meta cost
      if (reference.meta) {
        reference.meta.cost = cost;
      }

      // Create successful result
      const processingTime = Date.now() - startTime;

      return {
        reference,
        success: true,
        stats: {
          queries_generated: queries.length,
          candidates_found: candidates.length,
          candidates_validated: refinement.stats.validated_candidates,
          valid_candidates: refinement.stats.valid_candidates,
          primary_score: refinement.selection.primary?.score ?? null,
          secondary_score: refinement.selection.secondary?.score ?? null,
          primary_confidence: refinement.selection.primary?.confidence ?? null,
          secondary_confidence: refinement.selection.secondary?.confidence ?? null,
          cost,
          processing_time_ms: processingTime,
        },
      };
    } catch (error) {
      return this.createErrorResult(
        reference,
        error instanceof Error ? error.message : String(error),
        startTime
      );
    }
  }

  /**
   * Create error result
   */
  private createErrorResult(
    reference: Reference,
    error: string,
    startTime: number
  ): PipelineResult {
    const processingTime = Date.now() - startTime;

    return {
      reference,
      success: false,
      error,
      stats: {
        queries_generated: reference.queries?.length ?? 0,
        candidates_found: 0,
        candidates_validated: 0,
        valid_candidates: 0,
        primary_score: null,
        secondary_score: null,
        primary_confidence: null,
        secondary_confidence: null,
        cost: 0,
        processing_time_ms: processingTime,
      },
    };
  }

  /**
   * Get statistics from refinement engine
   */
  getStatistics(): {
    api_calls: number;
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
    total_cost: number;
    avg_cost_per_call: number;
  } {
    return this.refinementEngine.getStatistics();
  }

  /**
   * Reset statistics
   */
  resetStatistics(): void {
    this.refinementEngine.resetStatistics();
  }
}
