/**
 * Reference Refinement v2 - Shared Type Definitions
 *
 * Core types used across all components of the system.
 */

/**
 * Represents a parsed academic reference with all metadata
 */
export interface Reference {
  /** Reference ID (e.g., 100, 101, 222) */
  id: number;

  /** Full reference text as it appears in original document */
  text: string;

  /** Parsed bibliographic information */
  parsed: {
    /** Author name(s) */
    authors?: string;
    /** Publication year */
    year?: string;
    /** Work title */
    title?: string;
    /** Publication venue (journal, publisher, etc.) */
    publication?: string;
  };

  /** Generated search queries */
  queries: string[];

  /** Discovered URLs from search */
  urls: {
    /** Primary URL (full-text or authoritative source) */
    primary?: string;
    /** Secondary URL (review or alternative source) */
    secondary?: string;
    /** Tertiary URL (additional source) */
    tertiary?: string;
  };

  /** Relevance description (why this reference is important) */
  relevance?: string;

  /** Processing flags */
  flags: {
    /** Whether reference is finalized */
    finalized: boolean;
    /** Whether reference needs manual review */
    manual_review: boolean;
    /** Batch version that processed this reference */
    batch_version?: string;
  };

  /** Processing metadata */
  meta?: {
    /** When reference was last processed */
    processed_at?: Date;
    /** Processing costs (Google + Claude API) */
    cost?: number;
    /** Number of candidates discovered */
    candidates_count?: number;
    /** Primary URL confidence score */
    primary_confidence?: number;
    /** Secondary URL confidence score */
    secondary_confidence?: number;
  };
}

/**
 * Search result candidate from Google Custom Search
 */
export interface SearchCandidate {
  /** Page title */
  title: string;
  /** Full URL */
  url: string;
  /** Search result snippet */
  snippet: string;
  /** Display URL (domain) */
  displayUrl: string;
  /** Query that found this candidate */
  query: string;
}

/**
 * URL validation result
 */
export interface ValidationResult {
  /** Whether URL is valid/accessible */
  valid: boolean;
  /** HTTP status code */
  status?: number;
  /** Content-Type header value */
  contentType?: string;
  /** Validation failure reason */
  reason?: string;
  /** Error message if validation failed */
  error?: string;
}

/**
 * LLM ranking result for a single candidate
 */
export interface RankingResult {
  /** Candidate index (0-based) */
  index: number;
  /** Original URL */
  url: string;
  /** PRIMARY score (0-100) */
  primary_score: number;
  /** SECONDARY score (0-100) */
  secondary_score: number;
  /** Reasoning for PRIMARY score */
  primary_reason: string;
  /** Reasoning for SECONDARY score */
  secondary_reason: string;
  /** Recommendation (PRIMARY, SECONDARY, or NEITHER) */
  recommendation: 'PRIMARY' | 'SECONDARY' | 'NEITHER';
  /** Validation result (added during validation phase) */
  valid?: boolean;
  /** Validation status code */
  status?: number;
  /** Validation reason if invalid */
  validation_reason?: string;
}

/**
 * Selected URLs with confidence scores
 */
export interface URLSelection {
  /** Primary URL */
  primary?: {
    url: string;
    score: number;
    confidence: number;
    reason: string;
  };
  /** Secondary URL */
  secondary?: {
    url: string;
    score: number;
    confidence: number;
    reason: string;
  };
  /** Whether selection has high confidence */
  high_confidence: boolean;
  /** Whether manual review is needed */
  needs_review: boolean;
}

/**
 * Pipeline configuration
 */
export interface PipelineConfig {
  /** Google Custom Search API key */
  google_api_key: string;
  /** Google Custom Search Engine ID */
  google_cse_id: string;
  /** Anthropic API key for Claude */
  anthropic_api_key: string;

  /** Search configuration */
  search: {
    /** Number of queries to generate per reference */
    queries_per_reference: number;
    /** Number of queries focused on primary sources */
    primary_queries: number;
    /** Number of queries focused on secondary sources */
    secondary_queries: number;
  };

  /** Refinement configuration */
  refinement: {
    /** Number of top candidates to validate */
    validate_top_n: number;
    /** Minimum PRIMARY score threshold (0-100) */
    primary_threshold: number;
    /** Minimum SECONDARY score threshold (0-100) */
    secondary_threshold: number;
    /** Enable enhanced soft-404 detection */
    enhanced_soft_404: boolean;
  };

  /** Rate limiting */
  rate_limiting: {
    /** Maximum Google searches per day */
    google_max_per_day: number;
    /** Maximum Google searches per second */
    google_max_per_second: number;
    /** Delay after each search (ms) */
    delay_after_search: number;
    /** Delay after URL validation (ms) */
    delay_after_validation: number;
    /** Request timeout (ms) */
    timeout: number;
  };

  /** Output configuration */
  output: {
    /** Output format (decisions, final, json, markdown) */
    format: 'decisions' | 'final' | 'json' | 'markdown';
    /** Output file path */
    path: string;
    /** Batch version tag */
    batch_version: string;
    /** Auto-finalize references meeting criteria */
    auto_finalize: boolean;
  };
}

/**
 * Processing progress tracker
 */
export interface ProcessingProgress {
  /** Total references to process */
  total: number;
  /** Completed reference IDs */
  completed: number[];
  /** Failed reference IDs */
  failed: number[];
  /** Current reference being processed */
  current?: number;
  /** Statistics */
  stats: {
    /** Queries generated */
    queries_generated: number;
    /** Searches performed */
    searches_performed: number;
    /** Total candidates discovered */
    candidates_discovered: number;
    /** URLs validated */
    urls_validated: number;
    /** References finalized */
    references_finalized: number;
    /** References needing manual review */
    manual_review_needed: number;
    /** Total cost (USD) */
    total_cost: number;
  };
  /** Start time */
  started_at: Date;
  /** Last update time */
  updated_at: Date;
}

/**
 * Cost tracking
 */
export interface CostBreakdown {
  /** Google CSE costs */
  google: {
    /** Number of searches */
    searches: number;
    /** Cost per search */
    cost_per_search: number;
    /** Total cost */
    total: number;
  };
  /** Claude API costs */
  claude: {
    /** Number of API calls */
    calls: number;
    /** Input tokens */
    input_tokens: number;
    /** Output tokens */
    output_tokens: number;
    /** Total cost */
    total: number;
  };
  /** Total cost across all APIs */
  total: number;
}

/**
 * Error types
 */
export class RefinementError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'RefinementError';
  }
}

export class ValidationError extends RefinementError {
  constructor(message: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export class APIError extends RefinementError {
  constructor(message: string, details?: unknown) {
    super(message, 'API_ERROR', details);
    this.name = 'APIError';
  }
}

export class ConfigError extends RefinementError {
  constructor(message: string, details?: unknown) {
    super(message, 'CONFIG_ERROR', details);
    this.name = 'ConfigError';
  }
}
