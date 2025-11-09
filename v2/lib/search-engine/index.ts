/**
 * Search Engine Integration
 *
 * Orchestrates all search engine components to discover URLs for references.
 * Main entry point for Component 3.
 */

import type {
  BibliographicData,
  SearchQuery,
  SearchResult,
  URLCandidate,
  SearchStats,
  SearchEngineConfig,
} from '../types/index.js';

import { createSearchEngineConfig, PartialSearchEngineConfig } from './search-config.js';
import { QueryGenerator } from './query-generator.js';
import { GoogleSearchClient } from './google-search-client.js';
import { URLDiscoverer } from './url-discoverer.js';
import { RateLimiter } from './rate-limiter.js';
import { CostTracker } from './cost-tracker.js';

/**
 * Search operation result
 */
export interface SearchOperationResult {
  /** Reference ID */
  rid: string;
  /** Generated queries */
  queries: SearchQuery[];
  /** Raw search results */
  searchResults: SearchResult[];
  /** Discovered URL candidates */
  urlCandidates: URLCandidate[];
  /** Number of queries executed */
  queriesExecuted: number;
  /** Cost for this reference */
  cost: number;
  /** Any errors encountered */
  errors: Error[];
}

/**
 * Main Search Engine class
 *
 * Orchestrates query generation, search execution, and URL discovery.
 *
 * @example
 * ```typescript
 * const searchEngine = new SearchEngine({
 *   googleApiKey: process.env.GOOGLE_API_KEY,
 *   googleCseId: process.env.GOOGLE_CSE_ID
 * });
 *
 * // Process a single reference
 * const bibData = {
 *   rid: '100',
 *   author: 'Pariser, E.',
 *   year: '2011',
 *   title: 'The filter bubble',
 *   publication: 'Penguin Press'
 * };
 *
 * const result = await searchEngine.searchForReference(bibData);
 * console.log(`Found ${result.urlCandidates.length} URL candidates`);
 *
 * // Get statistics
 * const stats = searchEngine.getStats();
 * console.log(`Total cost: $${stats.totalCost.toFixed(2)}`);
 * ```
 */
export class SearchEngine {
  private config: SearchEngineConfig;
  private queryGenerator: QueryGenerator;
  private googleClient: GoogleSearchClient;
  private urlDiscoverer: URLDiscoverer;
  private rateLimiter: RateLimiter;
  private costTracker: CostTracker;

  // Statistics tracking
  private totalUrlsDiscovered: number = 0;
  private totalApiErrors: number = 0;

  /**
   * Create a Search Engine
   *
   * @param userConfig - User configuration (merges with environment variables)
   */
  constructor(userConfig: PartialSearchEngineConfig = {}) {
    // Create complete configuration
    this.config = createSearchEngineConfig(userConfig);

    // Initialize components
    this.queryGenerator = new QueryGenerator({
      primaryQueryCount: this.config.primaryQueryCount,
      secondaryQueryCount: this.config.secondaryQueryCount,
    });

    this.googleClient = new GoogleSearchClient({
      apiKey: this.config.googleApiKey,
      cseId: this.config.googleCseId,
    });

    this.urlDiscoverer = new URLDiscoverer();

    this.rateLimiter = new RateLimiter(this.config.rateLimit);

    this.costTracker = new CostTracker(this.config.costTracking);
  }

  /**
   * Search for URLs for a single reference
   *
   * Complete workflow:
   * 1. Generate queries
   * 2. Execute searches (with rate limiting)
   * 3. Discover and deduplicate URLs
   * 4. Track costs
   *
   * @param bibData - Bibliographic data
   * @param onProgress - Optional progress callback
   * @returns Search operation result
   */
  async searchForReference(
    bibData: BibliographicData,
    onProgress?: (stage: string, progress: number) => void
  ): Promise<SearchOperationResult> {
    const errors: Error[] = [];

    // Stage 1: Generate queries
    onProgress?.('Generating queries', 0);
    const queries = this.queryGenerator.generateQueries(bibData);

    // Stage 2: Execute searches
    const searchResults: SearchResult[] = [];
    let queriesExecuted = 0;

    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];

      try {
        onProgress?.('Executing searches', (i / queries.length) * 100);

        // Wait for rate limit
        await this.rateLimiter.waitAndConsume(1);

        // Execute search
        const results = await this.googleClient.search(query);
        searchResults.push(...results);
        queriesExecuted++;
      } catch (error) {
        errors.push(error instanceof Error ? error : new Error(String(error)));
        this.totalApiErrors++;
      }
    }

    // Track cost
    this.costTracker.recordQueries(bibData.rid, queriesExecuted);

    // Stage 3: Discover URLs
    onProgress?.('Discovering URLs', 100);
    const urlCandidates = this.urlDiscoverer.discoverURLs(searchResults);
    this.totalUrlsDiscovered += urlCandidates.length;

    // Calculate cost
    const cost = queriesExecuted * this.config.costTracking.costPerQuery;

    return {
      rid: bibData.rid,
      queries,
      searchResults,
      urlCandidates,
      queriesExecuted,
      cost,
      errors,
    };
  }

  /**
   * Search for URLs for multiple references
   *
   * @param references - Array of bibliographic data
   * @param onProgress - Optional progress callback
   * @returns Array of search operation results
   */
  async searchForReferences(
    references: BibliographicData[],
    onProgress?: (completed: number, total: number, rid: string) => void
  ): Promise<SearchOperationResult[]> {
    const results: SearchOperationResult[] = [];

    for (let i = 0; i < references.length; i++) {
      const bibData = references[i];

      onProgress?.(i, references.length, bibData.rid);

      const result = await this.searchForReference(bibData);
      results.push(result);

      onProgress?.(i + 1, references.length, bibData.rid);

      // Check budget warning
      if (this.costTracker.isOverBudget() && i < references.length - 1) {
        console.warn('\n⚠️  Budget threshold exceeded! Consider stopping the batch.\n');
      }
    }

    return results;
  }

  /**
   * Generate queries for a reference (without executing search)
   *
   * @param bibData - Bibliographic data
   * @returns Generated queries
   */
  generateQueries(bibData: BibliographicData): SearchQuery[] {
    return this.queryGenerator.generateQueries(bibData);
  }

  /**
   * Get current statistics
   *
   * @returns Search statistics
   */
  getStats(): SearchStats {
    const baseStats = this.costTracker.getStats();

    return {
      ...baseStats,
      urlsDiscovered: this.totalUrlsDiscovered,
      avgUrlsPerReference:
        baseStats.referencesProcessed > 0
          ? this.totalUrlsDiscovered / baseStats.referencesProcessed
          : 0,
      apiErrors: this.totalApiErrors,
    };
  }

  /**
   * Get cost summary report
   *
   * @returns Formatted cost summary
   */
  getCostSummary(): string {
    return this.costTracker.generateSummary();
  }

  /**
   * Get budget status
   *
   * @returns Budget status information
   */
  getBudgetStatus() {
    return this.costTracker.getBudgetStatus();
  }

  /**
   * Get rate limit quota information
   *
   * @returns Quota information
   */
  getQuotaInfo() {
    return this.rateLimiter.getQuotaInfo();
  }

  /**
   * Test Google API connection
   *
   * @returns True if API is accessible
   * @throws APIError if credentials are invalid
   */
  async testConnection(): Promise<boolean> {
    return this.googleClient.testConnection();
  }

  /**
   * Get configuration (read-only)
   *
   * @returns Current configuration
   */
  getConfig(): Readonly<SearchEngineConfig> {
    return { ...this.config };
  }

  /**
   * Reset statistics (for testing)
   */
  reset(): void {
    this.costTracker.reset();
    this.rateLimiter.reset();
    this.totalUrlsDiscovered = 0;
    this.totalApiErrors = 0;
  }
}

// Re-export types and utilities
export type { SearchEngineConfig } from '../types/index.js';
export type { PartialSearchEngineConfig } from './search-config.js';
export { createSearchEngineConfig, QUERY_ALLOCATION_PRESETS } from './search-config.js';
export type { URLCandidate, SearchQuery, SearchResult, SearchStats } from '../types/index.js';
