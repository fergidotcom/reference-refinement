/**
 * Reference Refinement v2 - Refinement Configuration
 *
 * Configuration for the refinement engine (URL validation, ranking, selection)
 */

import type { ValidatorConfig } from './url-validator.js';
import type { RankerConfig } from './llm-ranker.js';
import type { SelectorConfig } from './url-selector.js';

/**
 * Complete refinement engine configuration
 */
export interface RefinementEngineConfig {
  /** Anthropic API key for Claude */
  anthropic_api_key: string;

  /** URL validator configuration */
  validator: ValidatorConfig;

  /** LLM ranker configuration */
  ranker: Omit<RankerConfig, 'api_key'>;

  /** URL selector configuration */
  selector: SelectorConfig;

  /** Number of top candidates to validate */
  validate_top_n: number;
}

/**
 * Default refinement engine configuration
 *
 * Based on proven patterns from v1:
 * - v16.2: URL validation (top 20 candidates)
 * - v16.1: Enhanced query prompts
 * - v14.5: Mutual exclusivity rules
 * - v13.11: Pipe-delimited ranking format
 */
export const DEFAULT_REFINEMENT_CONFIG: Omit<RefinementEngineConfig, 'anthropic_api_key'> = {
  validator: {
    timeout: 10000, // 10 seconds
    delay_between_requests: 200, // 200ms rate limiting
    enhanced_soft_404: true, // Enable Level 3 detection
    max_content_size: 15360, // 15KB for content analysis
  },
  ranker: {
    model: 'claude-3-5-haiku-20241022', // Fast and cost-effective
    max_tokens: 4096,
    temperature: 0.3,
    batch_size: 10, // Rank 10 URLs per API call
    timeout: 25000, // 25 seconds
  },
  selector: {
    primary_threshold: 75, // Minimum PRIMARY score
    secondary_threshold: 75, // Minimum SECONDARY score
    confidence_threshold: 0.8, // 80% confidence for auto-finalization
    require_validation: true, // Only select validated URLs
  },
  validate_top_n: 20, // Validate top 20 candidates (from v16.2)
};

/**
 * Create refinement engine configuration with API key
 *
 * @param api_key - Anthropic API key
 * @param overrides - Optional configuration overrides
 * @returns Complete refinement engine configuration
 */
export function createRefinementConfig(
  api_key: string,
  overrides: Partial<Omit<RefinementEngineConfig, 'anthropic_api_key'>> = {}
): RefinementEngineConfig {
  return {
    anthropic_api_key: api_key,
    validator: {
      ...DEFAULT_REFINEMENT_CONFIG.validator,
      ...overrides.validator,
    },
    ranker: {
      ...DEFAULT_REFINEMENT_CONFIG.ranker,
      ...overrides.ranker,
    },
    selector: {
      ...DEFAULT_REFINEMENT_CONFIG.selector,
      ...overrides.selector,
    },
    validate_top_n: overrides.validate_top_n ?? DEFAULT_REFINEMENT_CONFIG.validate_top_n,
  };
}

/**
 * Validate refinement engine configuration
 *
 * @param config - Configuration to validate
 * @throws Error if configuration is invalid
 */
export function validateRefinementConfig(config: RefinementEngineConfig): void {
  if (!config.anthropic_api_key) {
    throw new Error('Missing anthropic_api_key in refinement configuration');
  }

  if (config.validate_top_n < 1) {
    throw new Error('validate_top_n must be at least 1');
  }

  if (config.selector.primary_threshold < 0 || config.selector.primary_threshold > 100) {
    throw new Error('primary_threshold must be between 0 and 100');
  }

  if (config.selector.secondary_threshold < 0 || config.selector.secondary_threshold > 100) {
    throw new Error('secondary_threshold must be between 0 and 100');
  }

  if (config.selector.confidence_threshold < 0 || config.selector.confidence_threshold > 1) {
    throw new Error('confidence_threshold must be between 0 and 1');
  }

  if (config.validator.timeout < 1000) {
    throw new Error('validator timeout must be at least 1000ms');
  }

  if (config.ranker.max_tokens < 100) {
    throw new Error('ranker max_tokens must be at least 100');
  }
}
