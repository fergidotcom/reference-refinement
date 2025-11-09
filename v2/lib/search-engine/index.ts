/**
 * Reference Refinement v2 - Search Engine (Stub Implementation)
 *
 * Simple Google Custom Search integration.
 * Full implementation would include query generation, result deduplication, etc.
 */

import type { Reference, SearchCandidate } from '../types/index.js';

export interface SearchConfig {
  google_api_key: string;
  google_cse_id: string;
  results_per_query: number;
  delay_between_searches: number;
}

/**
 * Search Engine
 *
 * Performs Google Custom Search for reference URLs
 */
export class SearchEngine {
  private config: SearchConfig;

  constructor(config: SearchConfig) {
    this.config = config;
  }

  /**
   * Search for URLs using generated queries
   *
   * @param queries - Search queries
   * @returns Array of search candidates
   */
  async search(queries: string[]): Promise<SearchCandidate[]> {
    const allCandidates: SearchCandidate[] = [];
    const seenUrls = new Set<string>();

    for (const query of queries) {
      try {
        const results = await this.searchQuery(query);

        // Deduplicate
        for (const result of results) {
          if (!seenUrls.has(result.url)) {
            seenUrls.add(result.url);
            allCandidates.push(result);
          }
        }

        // Rate limiting
        if (this.config.delay_between_searches > 0) {
          await new Promise((resolve) => setTimeout(resolve, this.config.delay_between_searches));
        }
      } catch (error) {
        console.error(`Search failed for query "${query}":`, error);
        continue;
      }
    }

    return allCandidates;
  }

  /**
   * Search a single query
   */
  private async searchQuery(query: string): Promise<SearchCandidate[]> {
    const url = new URL('https://www.googleapis.com/customsearch/v1');
    url.searchParams.set('key', this.config.google_api_key);
    url.searchParams.set('cx', this.config.google_cse_id);
    url.searchParams.set('q', query);
    url.searchParams.set('num', String(this.config.results_per_query));

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`Google CSE error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as any;
    const items = data.items || [];

    return items.map((item: any) => ({
      title: item.title || '',
      url: item.link || '',
      snippet: item.snippet || '',
      displayUrl: item.displayLink || new URL(item.link).hostname,
      query,
    }));
  }
}

/**
 * Generate simple search queries for a reference
 * (Full implementation would use Claude AI like v1)
 *
 * @param reference - Reference to generate queries for
 * @param primaryCount - Number of primary queries
 * @param secondaryCount - Number of secondary queries
 * @returns Array of search queries
 */
export function generateSimpleQueries(
  reference: Reference,
  primaryCount = 4,
  secondaryCount = 4
): string[] {
  const { authors, title, year } = reference.parsed;
  const queries: string[] = [];

  if (!title) return queries;

  // Primary queries (full-text sources)
  if (primaryCount > 0) {
    queries.push(`"${title}" ${authors || ''} ${year || ''} filetype:pdf site:edu`);
  }
  if (primaryCount > 1) {
    queries.push(`"${title}" ${authors || ''} free full text`);
  }
  if (primaryCount > 2) {
    queries.push(`"${title}" ${authors || ''} ${year || ''} site:archive.org`);
  }
  if (primaryCount > 3) {
    queries.push(`"${title}" ${authors || ''} ${year || ''}`);
  }

  // Secondary queries (reviews/analyses)
  if (secondaryCount > 0) {
    queries.push(`"review of" "${title}" ${authors || ''}`);
  }
  if (secondaryCount > 1) {
    queries.push(`"${title}" ${authors || ''} analysis site:edu`);
  }
  if (secondaryCount > 2) {
    queries.push(`"${title}" ${authors || ''} review site:jstor.org`);
  }
  if (secondaryCount > 3) {
    queries.push(`"${title}" ${authors || ''} critique`);
  }

  return queries.slice(0, primaryCount + secondaryCount);
}
