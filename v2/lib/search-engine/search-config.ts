/**
 * Search Engine Configuration Management
 *
 * Handles configuration loading and validation for the Search Engine component.
 * Supports environment variables and programmatic configuration.
 */

import type { SearchEngineConfig, RateLimitConfig, CostTrackingConfig } from '../types/index.js';

/**
 * Default rate limit configuration
 * Free tier: 100 queries/day, 1 query/second
 */
const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  maxQueriesPerDay: 100,
  maxQueriesPerSecond: 1,
};

/**
 * Default cost tracking configuration
 * Google CSE: $5 per 1000 queries = $0.005 per query
 */
const DEFAULT_COST_TRACKING: CostTrackingConfig = {
  costPerQuery: 0.005,
  budgetWarningThreshold: 10.0,
};

/**
 * Partial configuration that can be provided by user
 */
export interface PartialSearchEngineConfig {
  googleApiKey?: string;
  googleCseId?: string;
  queriesPerReference?: number;
  primaryQueryCount?: number;
  secondaryQueryCount?: number;
  rateLimit?: Partial<RateLimitConfig>;
  costTracking?: Partial<CostTrackingConfig>;
}

/**
 * Load configuration from environment variables
 */
function loadFromEnv(): PartialSearchEngineConfig {
  return {
    googleApiKey: process.env.GOOGLE_API_KEY,
    googleCseId: process.env.GOOGLE_CSE_ID,
    queriesPerReference: process.env.QUERIES_PER_REFERENCE
      ? parseInt(process.env.QUERIES_PER_REFERENCE, 10)
      : undefined,
    primaryQueryCount: process.env.PRIMARY_QUERY_COUNT
      ? parseInt(process.env.PRIMARY_QUERY_COUNT, 10)
      : undefined,
    secondaryQueryCount: process.env.SECONDARY_QUERY_COUNT
      ? parseInt(process.env.SECONDARY_QUERY_COUNT, 10)
      : undefined,
    rateLimit: {
      maxQueriesPerDay: process.env.MAX_QUERIES_PER_DAY
        ? parseInt(process.env.MAX_QUERIES_PER_DAY, 10)
        : undefined,
      maxQueriesPerSecond: process.env.MAX_QUERIES_PER_SECOND
        ? parseInt(process.env.MAX_QUERIES_PER_SECOND, 10)
        : undefined,
    },
    costTracking: {
      costPerQuery: process.env.COST_PER_QUERY
        ? parseFloat(process.env.COST_PER_QUERY)
        : undefined,
      budgetWarningThreshold: process.env.BUDGET_WARNING_THRESHOLD
        ? parseFloat(process.env.BUDGET_WARNING_THRESHOLD)
        : undefined,
    },
  };
}

/**
 * Validate configuration
 *
 * @param config - Configuration to validate
 * @throws Error if configuration is invalid
 */
function validateConfig(config: SearchEngineConfig): void {
  // Required fields
  if (!config.googleApiKey || config.googleApiKey.trim() === '') {
    throw new Error('Google API key is required (GOOGLE_API_KEY)');
  }

  if (!config.googleCseId || config.googleCseId.trim() === '') {
    throw new Error('Google Custom Search Engine ID is required (GOOGLE_CSE_ID)');
  }

  // Query counts
  if (config.queriesPerReference < 1 || config.queriesPerReference > 20) {
    throw new Error('queriesPerReference must be between 1 and 20');
  }

  if (config.primaryQueryCount < 0 || config.primaryQueryCount > config.queriesPerReference) {
    throw new Error('primaryQueryCount must be between 0 and queriesPerReference');
  }

  if (config.secondaryQueryCount < 0 || config.secondaryQueryCount > config.queriesPerReference) {
    throw new Error('secondaryQueryCount must be between 0 and queriesPerReference');
  }

  if (config.primaryQueryCount + config.secondaryQueryCount !== config.queriesPerReference) {
    throw new Error('primaryQueryCount + secondaryQueryCount must equal queriesPerReference');
  }

  // Rate limits
  if (config.rateLimit.maxQueriesPerDay < 1) {
    throw new Error('maxQueriesPerDay must be at least 1');
  }

  if (config.rateLimit.maxQueriesPerSecond <= 0) {
    throw new Error('maxQueriesPerSecond must be greater than 0');
  }

  // Cost tracking
  if (config.costTracking.costPerQuery < 0) {
    throw new Error('costPerQuery must be non-negative');
  }

  if (config.costTracking.budgetWarningThreshold < 0) {
    throw new Error('budgetWarningThreshold must be non-negative');
  }
}

/**
 * Create search engine configuration
 *
 * Merges environment variables, defaults, and user-provided config.
 * Validates the final configuration.
 *
 * @param userConfig - User-provided configuration (optional)
 * @returns Complete validated configuration
 * @throws Error if configuration is invalid
 *
 * @example
 * ```typescript
 * // Load from environment variables
 * const config = createSearchEngineConfig();
 *
 * // Override with custom values
 * const config = createSearchEngineConfig({
 *   primaryQueryCount: 6,
 *   secondaryQueryCount: 2,
 * });
 * ```
 */
export function createSearchEngineConfig(
  userConfig: PartialSearchEngineConfig = {}
): SearchEngineConfig {
  // Load from environment
  const envConfig = loadFromEnv();

  // Default query allocation (4+4)
  const defaultQueriesPerReference = 8;
  const defaultPrimaryCount = 4;
  const defaultSecondaryCount = 4;

  // Merge configurations (user > env > defaults)
  const merged: SearchEngineConfig = {
    googleApiKey: userConfig.googleApiKey ?? envConfig.googleApiKey ?? '',
    googleCseId: userConfig.googleCseId ?? envConfig.googleCseId ?? '',
    queriesPerReference:
      userConfig.queriesPerReference ??
      envConfig.queriesPerReference ??
      defaultQueriesPerReference,
    primaryQueryCount:
      userConfig.primaryQueryCount ?? envConfig.primaryQueryCount ?? defaultPrimaryCount,
    secondaryQueryCount:
      userConfig.secondaryQueryCount ?? envConfig.secondaryQueryCount ?? defaultSecondaryCount,
    rateLimit: {
      maxQueriesPerDay:
        userConfig.rateLimit?.maxQueriesPerDay ??
        envConfig.rateLimit?.maxQueriesPerDay ??
        DEFAULT_RATE_LIMIT.maxQueriesPerDay,
      maxQueriesPerSecond:
        userConfig.rateLimit?.maxQueriesPerSecond ??
        envConfig.rateLimit?.maxQueriesPerSecond ??
        DEFAULT_RATE_LIMIT.maxQueriesPerSecond,
    },
    costTracking: {
      costPerQuery:
        userConfig.costTracking?.costPerQuery ??
        envConfig.costTracking?.costPerQuery ??
        DEFAULT_COST_TRACKING.costPerQuery,
      budgetWarningThreshold:
        userConfig.costTracking?.budgetWarningThreshold ??
        envConfig.costTracking?.budgetWarningThreshold ??
        DEFAULT_COST_TRACKING.budgetWarningThreshold,
    },
  };

  // Validate
  validateConfig(merged);

  return merged;
}

/**
 * Common query allocation presets
 */
export const QUERY_ALLOCATION_PRESETS = {
  /** Balanced: 4 primary + 4 secondary */
  BALANCED: { primaryQueryCount: 4, secondaryQueryCount: 4 },
  /** Primary focus: 6 primary + 2 secondary */
  PRIMARY_FOCUS: { primaryQueryCount: 6, secondaryQueryCount: 2 },
  /** Secondary focus: 2 primary + 6 secondary */
  SECONDARY_FOCUS: { primaryQueryCount: 2, secondaryQueryCount: 6 },
  /** Primary only: 8 primary + 0 secondary */
  PRIMARY_ONLY: { primaryQueryCount: 8, secondaryQueryCount: 0 },
  /** Secondary only: 0 primary + 8 secondary */
  SECONDARY_ONLY: { primaryQueryCount: 0, secondaryQueryCount: 8 },
} as const;
