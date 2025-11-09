/**
 * URL Discoverer
 *
 * Processes search results to discover and categorize URL candidates.
 * Handles deduplication, metadata extraction, and initial scoring.
 */

import type { SearchResult, URLCandidate } from '../types/index.js';

/**
 * URL discoverer for processing search results
 *
 * @example
 * ```typescript
 * const discoverer = new URLDiscoverer();
 *
 * const searchResults = await googleClient.search(query);
 * const candidates = discoverer.discoverURLs(searchResults);
 *
 * console.log(`Discovered ${candidates.length} unique URLs`);
 * ```
 */
export class URLDiscoverer {
  /**
   * Discover URL candidates from search results
   *
   * Deduplicates URLs and creates URLCandidate objects with metadata.
   *
   * @param searchResults - Array of search results
   * @returns Array of unique URL candidates
   */
  discoverURLs(searchResults: SearchResult[]): URLCandidate[] {
    const urlMap = new Map<string, URLCandidate>();

    for (const result of searchResults) {
      // Normalize URL
      const normalizedUrl = this.normalizeURL(result.url);

      // Skip if already seen (keep first occurrence)
      if (urlMap.has(normalizedUrl)) {
        continue;
      }

      // Create candidate
      const candidate = this.createCandidate(result, normalizedUrl);

      // Store in map
      urlMap.set(normalizedUrl, candidate);
    }

    // Convert map to array and sort by initial score
    return Array.from(urlMap.values()).sort((a, b) => b.initialScore - a.initialScore);
  }

  /**
   * Create URL candidate from search result
   *
   * @param result - Search result
   * @param normalizedUrl - Normalized URL
   * @returns URL candidate
   */
  private createCandidate(result: SearchResult, normalizedUrl: string): URLCandidate {
    return {
      url: normalizedUrl,
      title: result.title,
      snippet: result.snippet,
      sourceQuery: result.queryText,
      queryType: result.queryType,
      domain: this.extractDomain(normalizedUrl),
      urlType: this.detectURLType(normalizedUrl),
      initialScore: this.calculateInitialScore(result, normalizedUrl),
      searchRank: result.rank,
    };
  }

  /**
   * Normalize URL for deduplication
   *
   * Handles:
   * - Remove trailing slashes
   * - Lowercase domain
   * - Remove common tracking parameters
   * - Normalize http/https
   *
   * @param url - Raw URL
   * @returns Normalized URL
   */
  private normalizeURL(url: string): string {
    try {
      const parsed = new URL(url);

      // Remove tracking parameters
      const paramsToRemove = ['utm_source', 'utm_medium', 'utm_campaign', 'fbclid', 'gclid'];
      paramsToRemove.forEach((param) => parsed.searchParams.delete(param));

      // Rebuild URL
      let normalized = `${parsed.protocol}//${parsed.host}${parsed.pathname}`;

      // Remove trailing slash
      if (normalized.endsWith('/') && parsed.pathname !== '/') {
        normalized = normalized.slice(0, -1);
      }

      // Add back search params if any remain
      const searchParams = parsed.searchParams.toString();
      if (searchParams) {
        normalized += `?${searchParams}`;
      }

      // Add hash if present
      if (parsed.hash) {
        normalized += parsed.hash;
      }

      return normalized;
    } catch {
      // If URL parsing fails, return as-is
      return url;
    }
  }

  /**
   * Extract domain from URL
   *
   * @param url - URL
   * @returns Domain name
   */
  private extractDomain(url: string): string {
    try {
      const parsed = new URL(url);
      return parsed.hostname;
    } catch {
      return '';
    }
  }

  /**
   * Detect URL type (PDF, HTML, DOI, etc.)
   *
   * @param url - URL
   * @returns URL type
   */
  private detectURLType(url: string): 'PDF' | 'HTML' | 'DOI' | 'Other' {
    const urlLower = url.toLowerCase();

    // Check for PDF
    if (urlLower.endsWith('.pdf') || urlLower.includes('.pdf?')) {
      return 'PDF';
    }

    // Check for DOI
    if (urlLower.includes('doi.org/') || urlLower.includes('dx.doi.org/')) {
      return 'DOI';
    }

    // Check for HTML indicators
    if (
      urlLower.endsWith('.html') ||
      urlLower.endsWith('.htm') ||
      urlLower.includes('.html?') ||
      urlLower.includes('.htm?')
    ) {
      return 'HTML';
    }

    // Default to HTML for most URLs
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return 'HTML';
    }

    return 'Other';
  }

  /**
   * Calculate initial relevance score
   *
   * Scoring factors:
   * - Search rank (1-10): Higher rank = higher score
   * - Query type: Primary queries weighted higher for full-text
   * - Domain reputation: .edu, .gov, archive.org, etc.
   * - URL type: PDFs scored higher
   *
   * @param result - Search result
   * @param url - Normalized URL
   * @returns Initial score (0-100)
   */
  private calculateInitialScore(result: SearchResult, url: string): number {
    let score = 0;

    // 1. Search rank (0-40 points)
    // Rank 1 = 40, Rank 10 = 4
    score += Math.max(0, 40 - (result.rank - 1) * 4);

    // 2. Query type bonus (0-20 points)
    if (result.queryType === 'primary') {
      score += 20;
    } else {
      score += 10;
    }

    // 3. Domain reputation (0-25 points)
    const domain = this.extractDomain(url).toLowerCase();

    if (domain.endsWith('.edu')) {
      score += 25;
    } else if (domain.endsWith('.gov')) {
      score += 25;
    } else if (domain.includes('archive.org')) {
      score += 25;
    } else if (domain.includes('jstor.org')) {
      score += 20;
    } else if (domain.includes('researchgate.net')) {
      score += 15;
    } else if (domain.includes('academia.edu')) {
      score += 15;
    } else if (domain.includes('sciencedirect.com')) {
      score += 15;
    } else if (domain.includes('springer.com')) {
      score += 15;
    } else if (domain.endsWith('.org')) {
      score += 10;
    }

    // 4. URL type bonus (0-15 points)
    const urlType = this.detectURLType(url);
    if (urlType === 'PDF') {
      score += 15;
    } else if (urlType === 'DOI') {
      score += 10;
    } else if (urlType === 'HTML') {
      score += 5;
    }

    // Cap at 100
    return Math.min(100, score);
  }

  /**
   * Filter candidates by minimum score
   *
   * @param candidates - URL candidates
   * @param minScore - Minimum score threshold
   * @returns Filtered candidates
   */
  filterByScore(candidates: URLCandidate[], minScore: number): URLCandidate[] {
    return candidates.filter((c) => c.initialScore >= minScore);
  }

  /**
   * Group candidates by query type
   *
   * @param candidates - URL candidates
   * @returns Object with primary and secondary arrays
   */
  groupByQueryType(candidates: URLCandidate[]): {
    primary: URLCandidate[];
    secondary: URLCandidate[];
  } {
    return {
      primary: candidates.filter((c) => c.queryType === 'primary'),
      secondary: candidates.filter((c) => c.queryType === 'secondary'),
    };
  }

  /**
   * Get statistics about discovered URLs
   *
   * @param candidates - URL candidates
   * @returns Statistics object
   */
  getStatistics(candidates: URLCandidate[]): {
    total: number;
    byType: Record<string, number>;
    byDomain: Record<string, number>;
    avgScore: number;
    scoreDistribution: {
      excellent: number; // 80-100
      good: number; // 60-79
      fair: number; // 40-59
      poor: number; // 0-39
    };
  } {
    const byType: Record<string, number> = {};
    const byDomain: Record<string, number> = {};
    let totalScore = 0;
    const scoreDistribution = { excellent: 0, good: 0, fair: 0, poor: 0 };

    for (const candidate of candidates) {
      // Count by type
      byType[candidate.urlType] = (byType[candidate.urlType] || 0) + 1;

      // Count by domain
      byDomain[candidate.domain] = (byDomain[candidate.domain] || 0) + 1;

      // Sum scores
      totalScore += candidate.initialScore;

      // Score distribution
      if (candidate.initialScore >= 80) {
        scoreDistribution.excellent++;
      } else if (candidate.initialScore >= 60) {
        scoreDistribution.good++;
      } else if (candidate.initialScore >= 40) {
        scoreDistribution.fair++;
      } else {
        scoreDistribution.poor++;
      }
    }

    return {
      total: candidates.length,
      byType,
      byDomain,
      avgScore: candidates.length > 0 ? totalScore / candidates.length : 0,
      scoreDistribution,
    };
  }
}
