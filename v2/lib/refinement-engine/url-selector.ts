/**
 * Reference Refinement v2 - URL Selector
 *
 * Selects best PRIMARY and SECONDARY URLs from ranked and validated candidates.
 *
 * Key features:
 * - Mutual exclusivity enforcement (PRIMARY ≥70 → SECONDARY <30)
 * - Confidence scoring based on score + validation
 * - Threshold-based selection
 * - Manual review flagging for low-confidence selections
 *
 * Based on v1 patterns (v14.5 mutual exclusivity, v16.2 validation)
 */

import type { RankingResult, URLSelection } from '../types/index.js';

/**
 * Configuration for URL selector
 */
export interface SelectorConfig {
  /** Minimum PRIMARY score to accept (0-100) */
  primary_threshold: number;
  /** Minimum SECONDARY score to accept (0-100) */
  secondary_threshold: number;
  /** Confidence threshold for auto-finalization */
  confidence_threshold: number;
  /** Require validation for selection */
  require_validation: boolean;
}

/**
 * Default selector configuration
 */
export const DEFAULT_SELECTOR_CONFIG: SelectorConfig = {
  primary_threshold: 75,
  secondary_threshold: 75,
  confidence_threshold: 0.8, // 80% confidence for auto-finalization
  require_validation: true,
};

/**
 * URL Selector
 *
 * Selects best URLs from ranked and validated candidates.
 */
export class URLSelector {
  private config: SelectorConfig;

  constructor(config: Partial<SelectorConfig> = {}) {
    this.config = { ...DEFAULT_SELECTOR_CONFIG, ...config };
  }

  /**
   * Select PRIMARY and SECONDARY URLs from candidates
   *
   * @param rankings - Ranked candidates (must include validation results)
   * @returns URL selection with confidence scores
   */
  selectURLs(rankings: RankingResult[]): URLSelection {
    // Filter to only valid URLs (if validation required)
    const validRankings = this.config.require_validation
      ? rankings.filter((r) => r.valid === true)
      : rankings;

    if (validRankings.length === 0) {
      return {
        high_confidence: false,
        needs_review: true,
      };
    }

    // Select PRIMARY URL
    const primary = this.selectPrimary(validRankings);

    // Select SECONDARY URL (excluding primary and enforcing mutual exclusivity)
    const secondary = this.selectSecondary(validRankings, primary?.url);

    // Calculate overall confidence
    const high_confidence = this.calculateOverallConfidence(primary, secondary);
    const needs_review = !high_confidence || (!primary && !secondary);

    return {
      primary,
      secondary,
      high_confidence,
      needs_review,
    };
  }

  /**
   * Select PRIMARY URL
   *
   * Criteria:
   * - Highest PRIMARY score ≥ threshold
   * - Valid (passed validation)
   * - PRIMARY score ≥ 70 OR SECONDARY score < 30 (mutual exclusivity)
   */
  private selectPrimary(
    rankings: RankingResult[]
  ):
    | {
        url: string;
        score: number;
        confidence: number;
        reason: string;
      }
    | undefined {
    // Filter candidates suitable for PRIMARY
    const primaryCandidates = rankings.filter((r) => {
      // Must meet threshold
      if (r.primary_score < this.config.primary_threshold) return false;

      // Mutual exclusivity: if SECONDARY score is high, this is a review, not primary
      if (r.secondary_score >= 70 && r.primary_score < 70) return false;

      return true;
    });

    if (primaryCandidates.length === 0) return undefined;

    // Sort by PRIMARY score descending
    primaryCandidates.sort((a, b) => b.primary_score - a.primary_score);

    const best = primaryCandidates[0];
    const confidence = this.calculateConfidence(best.primary_score, best.valid === true);

    return {
      url: best.url,
      score: best.primary_score,
      confidence,
      reason: best.primary_reason,
    };
  }

  /**
   * Select SECONDARY URL
   *
   * Criteria:
   * - Highest SECONDARY score ≥ threshold
   * - Valid (passed validation)
   * - Different from PRIMARY URL
   * - SECONDARY score ≥ 70 OR PRIMARY score < 70 (mutual exclusivity)
   */
  private selectSecondary(
    rankings: RankingResult[],
    primaryUrl?: string
  ):
    | {
        url: string;
        score: number;
        confidence: number;
        reason: string;
      }
    | undefined {
    // Filter candidates suitable for SECONDARY
    const secondaryCandidates = rankings.filter((r) => {
      // Must be different from primary
      if (primaryUrl && r.url === primaryUrl) return false;

      // Must meet threshold
      if (r.secondary_score < this.config.secondary_threshold) return false;

      // Mutual exclusivity: if PRIMARY score is high, this is the work itself, not a review
      if (r.primary_score >= 70 && r.secondary_score < 70) return false;

      return true;
    });

    if (secondaryCandidates.length === 0) return undefined;

    // Sort by SECONDARY score descending
    secondaryCandidates.sort((a, b) => b.secondary_score - a.secondary_score);

    const best = secondaryCandidates[0];
    const confidence = this.calculateConfidence(best.secondary_score, best.valid === true);

    return {
      url: best.url,
      score: best.secondary_score,
      confidence,
      reason: best.secondary_reason,
    };
  }

  /**
   * Calculate confidence score for a selection
   *
   * Factors:
   * - Score (normalized to 0-1)
   * - Validation status (boost if validated)
   * - Score distance from threshold (higher = more confident)
   */
  private calculateConfidence(score: number, validated: boolean): number {
    // Base confidence from score (0-1)
    let confidence = score / 100;

    // Boost for validated URLs
    if (validated) {
      confidence = Math.min(1.0, confidence + 0.1);
    }

    // Boost for scores well above threshold
    if (score >= 90) {
      confidence = Math.min(1.0, confidence + 0.1);
    }

    return Math.round(confidence * 100) / 100; // Round to 2 decimals
  }

  /**
   * Calculate overall confidence for selection
   *
   * High confidence if:
   * - Both PRIMARY and SECONDARY found with confidence ≥ threshold
   * - OR PRIMARY found with very high confidence (≥0.9)
   */
  private calculateOverallConfidence(
    primary:
      | {
          url: string;
          score: number;
          confidence: number;
          reason: string;
        }
      | undefined,
    secondary:
      | {
          url: string;
          score: number;
          confidence: number;
          reason: string;
        }
      | undefined
  ): boolean {
    // No URLs found
    if (!primary && !secondary) return false;

    // Very high confidence PRIMARY alone
    if (primary && primary.confidence >= 0.9) return true;

    // Both URLs with good confidence
    if (
      primary &&
      secondary &&
      primary.confidence >= this.config.confidence_threshold &&
      secondary.confidence >= this.config.confidence_threshold
    ) {
      return true;
    }

    // PRIMARY with good confidence
    if (primary && primary.confidence >= this.config.confidence_threshold) {
      return true;
    }

    return false;
  }

  /**
   * Get statistics for a selection result
   */
  getSelectionStatistics(selection: URLSelection): {
    has_primary: boolean;
    has_secondary: boolean;
    primary_confidence: number | null;
    secondary_confidence: number | null;
    overall_confidence: number | null;
    needs_review: boolean;
  } {
    return {
      has_primary: !!selection.primary,
      has_secondary: !!selection.secondary,
      primary_confidence: selection.primary?.confidence ?? null,
      secondary_confidence: selection.secondary?.confidence ?? null,
      overall_confidence: this.calculateNumericConfidence(selection),
      needs_review: selection.needs_review,
    };
  }

  /**
   * Calculate numeric overall confidence (0-1)
   */
  private calculateNumericConfidence(selection: URLSelection): number | null {
    if (!selection.primary && !selection.secondary) return null;

    const scores: number[] = [];
    if (selection.primary) scores.push(selection.primary.confidence);
    if (selection.secondary) scores.push(selection.secondary.confidence);

    // Average confidence
    return scores.reduce((a, b) => a + b, 0) / scores.length;
  }
}

/**
 * Convenience function to select URLs
 *
 * @param rankings - Ranked candidates with validation results
 * @param config - Optional selector configuration
 * @returns URL selection
 */
export function selectURLs(
  rankings: RankingResult[],
  config?: Partial<SelectorConfig>
): URLSelection {
  const selector = new URLSelector(config);
  return selector.selectURLs(rankings);
}
