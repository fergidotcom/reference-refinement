/**
 * Type definitions for Reference Refinement v2
 *
 * Component 3: Search Engine
 */

// ============================================================================
// Bibliographic Data Types (from Component 2 - Format Controller)
// ============================================================================

/**
 * Parsed bibliographic data from a reference
 * This would come from Component 2's FormatController
 */
export interface BibliographicData {
  /** Reference ID (e.g., "100", "222") */
  rid: string;
  /** Full reference text */
  fullText: string;
  /** Author(s) - parsed */
  author?: string;
  /** Publication year */
  year?: string;
  /** Title of the work */
  title?: string;
  /** Publication venue (journal, publisher, etc.) */
  publication?: string;
  /** ISBN if available */
  isbn?: string;
  /** DOI if available */
  doi?: string;
}

// ============================================================================
// Search Engine Types
// ============================================================================

/**
 * Search query generated for a reference
 */
export interface SearchQuery {
  /** Query text to send to search engine */
  text: string;
  /** Type of query - primary (full-text) or secondary (reviews) */
  type: 'primary' | 'secondary';
  /** Query number within type (1-8) */
  queryNumber: number;
  /** Reference ID this query is for */
  rid: string;
  /** Bibliographic data used to generate this query */
  bibliographicData: BibliographicData;
}

/**
 * Raw search result from Google Custom Search
 */
export interface SearchResult {
  /** URL of the result */
  url: string;
  /** Title from search result */
  title: string;
  /** Snippet/description from search result */
  snippet: string;
  /** Display URL (may be formatted) */
  displayUrl: string;
  /** Rank in search results (1-10) */
  rank: number;
  /** The query text that produced this result */
  queryText: string;
  /** Type of query that produced this result */
  queryType: 'primary' | 'secondary';
}

/**
 * Discovered URL candidate after processing search results
 */
export interface URLCandidate {
  /** Normalized URL */
  url: string;
  /** Title of the resource */
  title: string;
  /** Description/snippet */
  snippet: string;
  /** Source query that discovered this URL */
  sourceQuery: string;
  /** Type of source query */
  queryType: 'primary' | 'secondary';
  /** Domain of the URL */
  domain: string;
  /** Type of resource */
  urlType: 'PDF' | 'HTML' | 'DOI' | 'Other';
  /** Initial relevance score (0-100) */
  initialScore: number;
  /** Search rank when discovered (1-10) */
  searchRank: number;
}

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Configuration for the Search Engine
 */
export interface SearchEngineConfig {
  /** Google Custom Search API key */
  googleApiKey: string;
  /** Google Custom Search Engine ID */
  googleCseId: string;
  /** Total queries per reference */
  queriesPerReference: number;
  /** Number of primary-focused queries */
  primaryQueryCount: number;
  /** Number of secondary-focused queries */
  secondaryQueryCount: number;
  /** Rate limiting configuration */
  rateLimit: RateLimitConfig;
  /** Cost tracking configuration */
  costTracking: CostTrackingConfig;
}

/**
 * Rate limiting configuration
 */
export interface RateLimitConfig {
  /** Maximum queries allowed per day */
  maxQueriesPerDay: number;
  /** Maximum queries per second */
  maxQueriesPerSecond: number;
}

/**
 * Cost tracking configuration
 */
export interface CostTrackingConfig {
  /** Cost per query in USD */
  costPerQuery: number;
  /** Budget threshold for warnings */
  budgetWarningThreshold: number;
}

// ============================================================================
// Statistics and Tracking Types
// ============================================================================

/**
 * Search statistics for a session
 */
export interface SearchStats {
  /** Total queries executed */
  queriesExecuted: number;
  /** Total URLs discovered */
  urlsDiscovered: number;
  /** Total cost in USD */
  totalCost: number;
  /** Average cost per reference */
  avgCostPerReference: number;
  /** Average URLs discovered per reference */
  avgUrlsPerReference: number;
  /** Number of API errors encountered */
  apiErrors: number;
  /** Number of references processed */
  referencesProcessed: number;
}

/**
 * Cost tracking entry
 */
export interface CostEntry {
  /** Timestamp of the operation */
  timestamp: Date;
  /** Reference ID */
  rid: string;
  /** Operation type */
  operation: 'query_generation' | 'search_execution';
  /** Number of queries */
  queryCount: number;
  /** Cost in USD */
  cost: number;
}

// ============================================================================
// Rate Limiter Types
// ============================================================================

/**
 * Token bucket state for rate limiting
 */
export interface TokenBucketState {
  /** Current number of tokens available */
  tokens: number;
  /** Maximum token capacity */
  capacity: number;
  /** Token refill rate (tokens per second) */
  refillRate: number;
  /** Last refill timestamp */
  lastRefill: Date;
}

/**
 * Rate limit status
 */
export interface RateLimitStatus {
  /** Whether rate limit allows request */
  allowed: boolean;
  /** Current tokens available */
  tokensAvailable: number;
  /** Tokens required for request */
  tokensRequired: number;
  /** Estimated wait time in milliseconds (if not allowed) */
  waitTimeMs?: number;
}

// ============================================================================
// Google Custom Search API Types
// ============================================================================

/**
 * Google Custom Search API response
 */
export interface GoogleSearchResponse {
  /** Search result items */
  items?: GoogleSearchItem[];
  /** Search information */
  searchInformation?: {
    totalResults: string;
    searchTime: number;
  };
  /** Error information if any */
  error?: {
    code: number;
    message: string;
    errors: Array<{
      domain: string;
      reason: string;
      message: string;
    }>;
  };
}

/**
 * Individual search result item from Google
 */
export interface GoogleSearchItem {
  /** Page title */
  title: string;
  /** Page URL */
  link: string;
  /** Display link (formatted) */
  displayLink: string;
  /** Snippet/description */
  snippet: string;
  /** MIME type if available */
  mime?: string;
  /** File format if available */
  fileFormat?: string;
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Search engine error
 */
export class SearchEngineError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'SearchEngineError';
  }
}

/**
 * Rate limit error
 */
export class RateLimitError extends SearchEngineError {
  constructor(message: string, public retryAfterMs: number) {
    super(message, 'RATE_LIMIT_EXCEEDED', { retryAfterMs });
    this.name = 'RateLimitError';
  }
}

/**
 * API error
 */
export class APIError extends SearchEngineError {
  constructor(
    message: string,
    public statusCode: number,
    public apiResponse?: unknown
  ) {
    super(message, 'API_ERROR', { statusCode, apiResponse });
    this.name = 'APIError';
  }
}
