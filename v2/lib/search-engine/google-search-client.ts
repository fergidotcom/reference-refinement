/**
 * Google Custom Search Client
 *
 * Handles integration with Google Custom Search API.
 * Executes search queries and parses results.
 */

import type {
  SearchQuery,
  SearchResult,
  GoogleSearchResponse,
  GoogleSearchItem,
  APIError,
} from '../types/index.js';

/**
 * Configuration for Google Search Client
 */
export interface GoogleSearchClientConfig {
  /** Google Custom Search API key */
  apiKey: string;
  /** Custom Search Engine ID */
  cseId: string;
  /** Number of results per query (max 10) */
  resultsPerQuery?: number;
}

/**
 * Google Custom Search API client
 *
 * @example
 * ```typescript
 * const client = new GoogleSearchClient({
 *   apiKey: process.env.GOOGLE_API_KEY,
 *   cseId: process.env.GOOGLE_CSE_ID
 * });
 *
 * const query = {
 *   text: '"The filter bubble" Pariser 2011 filetype:pdf',
 *   type: 'primary',
 *   queryNumber: 1,
 *   rid: '100'
 * };
 *
 * const results = await client.search(query);
 * console.log(`Found ${results.length} results`);
 * ```
 */
export class GoogleSearchClient {
  private readonly baseUrl = 'https://www.googleapis.com/customsearch/v1';
  private readonly resultsPerQuery: number;

  constructor(private config: GoogleSearchClientConfig) {
    this.resultsPerQuery = config.resultsPerQuery ?? 10;
  }

  /**
   * Execute a search query
   *
   * @param query - Search query to execute
   * @returns Array of search results
   * @throws APIError if the API request fails
   */
  async search(query: SearchQuery): Promise<SearchResult[]> {
    try {
      // Build API URL
      const url = this.buildSearchUrl(query.text);

      // Execute request
      const response = await fetch(url);

      // Check for HTTP errors
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw this.createAPIError(
          `Google API request failed: ${response.statusText}`,
          response.status,
          errorData
        );
      }

      // Parse response
      const data = (await response.json()) as GoogleSearchResponse;

      // Check for API errors in response
      if (data.error) {
        throw this.createAPIError(
          `Google API error: ${data.error.message}`,
          data.error.code,
          data.error
        );
      }

      // Convert to SearchResult format
      return this.parseSearchResults(data, query);
    } catch (error) {
      // Re-throw APIError as-is
      if (this.isAPIError(error)) {
        throw error;
      }

      // Wrap other errors
      throw this.createAPIError(
        `Search request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        0,
        error
      );
    }
  }

  /**
   * Execute multiple queries in sequence
   *
   * @param queries - Array of search queries
   * @param onProgress - Optional progress callback
   * @returns Array of search results (all queries combined)
   */
  async searchBatch(
    queries: SearchQuery[],
    onProgress?: (completed: number, total: number) => void
  ): Promise<SearchResult[]> {
    const allResults: SearchResult[] = [];

    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];

      try {
        const results = await this.search(query);
        allResults.push(...results);

        if (onProgress) {
          onProgress(i + 1, queries.length);
        }
      } catch (error) {
        // Log error but continue with other queries
        console.error(`Query ${i + 1}/${queries.length} failed:`, error);

        if (onProgress) {
          onProgress(i + 1, queries.length);
        }
      }
    }

    return allResults;
  }

  /**
   * Build Google Custom Search API URL
   *
   * @param queryText - Search query text
   * @returns Complete API URL
   */
  private buildSearchUrl(queryText: string): string {
    const params = new URLSearchParams({
      key: this.config.apiKey,
      cx: this.config.cseId,
      q: queryText,
      num: String(this.resultsPerQuery),
    });

    return `${this.baseUrl}?${params.toString()}`;
  }

  /**
   * Parse Google Search API response into SearchResult array
   *
   * @param response - Google API response
   * @param query - Original query
   * @returns Array of search results
   */
  private parseSearchResults(response: GoogleSearchResponse, query: SearchQuery): SearchResult[] {
    if (!response.items || response.items.length === 0) {
      return [];
    }

    return response.items.map((item, index) => this.parseSearchItem(item, index + 1, query));
  }

  /**
   * Parse a single search result item
   *
   * @param item - Google search result item
   * @param rank - Rank in search results (1-10)
   * @param query - Original query
   * @returns Parsed search result
   */
  private parseSearchItem(item: GoogleSearchItem, rank: number, query: SearchQuery): SearchResult {
    return {
      url: item.link,
      title: this.cleanTitle(item.title),
      snippet: this.cleanSnippet(item.snippet),
      displayUrl: item.displayLink,
      rank,
      queryText: query.text,
      queryType: query.type,
    };
  }

  /**
   * Clean title text (remove extra whitespace, truncate if needed)
   *
   * @param title - Raw title
   * @returns Cleaned title
   */
  private cleanTitle(title: string): string {
    return title
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 200);
  }

  /**
   * Clean snippet text (remove extra whitespace, HTML entities, truncate)
   *
   * @param snippet: Raw snippet
   * @returns Cleaned snippet
   */
  private cleanSnippet(snippet: string): string {
    return snippet
      .replace(/\s+/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim()
      .substring(0, 500);
  }

  /**
   * Create an APIError
   *
   * @param message - Error message
   * @param statusCode - HTTP status code
   * @param apiResponse - API response data
   * @returns APIError instance
   */
  private createAPIError(message: string, statusCode: number, apiResponse?: unknown): APIError {
    const error = new Error(message) as APIError;
    error.name = 'APIError';
    error.code = 'API_ERROR';
    error.statusCode = statusCode;
    error.apiResponse = apiResponse;
    return error;
  }

  /**
   * Type guard for APIError
   *
   * @param error - Error to check
   * @returns True if error is an APIError
   */
  private isAPIError(error: unknown): error is APIError {
    return error instanceof Error && error.name === 'APIError';
  }

  /**
   * Test API connectivity
   *
   * Executes a simple test query to verify API credentials work.
   *
   * @returns True if API is accessible
   * @throws APIError if credentials are invalid
   */
  async testConnection(): Promise<boolean> {
    const testQuery: SearchQuery = {
      text: 'test',
      type: 'primary',
      queryNumber: 1,
      rid: 'TEST',
      bibliographicData: {
        rid: 'TEST',
        fullText: 'Test reference',
      },
    };

    try {
      await this.search(testQuery);
      return true;
    } catch (error) {
      if (this.isAPIError(error)) {
        // Re-throw API errors (invalid credentials, etc.)
        throw error;
      }
      // Other errors (network, etc.) - return false
      return false;
    }
  }
}
