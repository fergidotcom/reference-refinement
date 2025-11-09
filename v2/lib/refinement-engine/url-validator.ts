/**
 * Reference Refinement v2 - URL Validator
 *
 * Validates URL accessibility using 3-level detection:
 * - Level 1: Hard 404 (HTTP status ≥400)
 * - Level 2: Soft 404 via content-type mismatch
 * - Level 3: Soft 404 via content analysis (enhanced mode)
 *
 * Based on proven patterns from v1 (v16.2 - v16.7)
 */

import type { ValidationResult } from '../types/index.js';

/**
 * Error patterns for soft-404 detection (Level 3)
 *
 * These patterns match common error pages that return HTTP 200
 * but actually indicate the document is not found.
 *
 * Detection rate: ~40% of remaining soft-404s after Level 1 & 2
 */
const SOFT_404_PATTERNS = [
  // Generic "not found" patterns
  /404.*not found|not found.*404/i,
  /page not found|page cannot be found/i,
  /sorry.*couldn't find.*page/i,
  /oops.*nothing here|there's nothing here/i,

  // Academic repository specific
  /doi not found|doi.*cannot be found/i,
  /document not found|document.*not available/i,
  /item.*not found|handle.*not found/i,
  /resource.*not found|resource.*unavailable/i,

  // Title-based detection
  /<title>[^<]*(404|not found|error)[^<]*<\/title>/i,

  // University repository patterns
  /this item is not available|item is not available/i,
  /the requested.*could not be found/i,
];

/**
 * Configuration for URL validation
 */
export interface ValidatorConfig {
  /** Request timeout in milliseconds */
  timeout: number;
  /** Delay between validation requests (rate limiting) */
  delay_between_requests: number;
  /** Enable enhanced soft-404 detection (Level 3) */
  enhanced_soft_404: boolean;
  /** Maximum content size to fetch for Level 3 detection (bytes) */
  max_content_size: number;
}

/**
 * Default validator configuration
 */
export const DEFAULT_VALIDATOR_CONFIG: ValidatorConfig = {
  timeout: 10000, // 10 seconds
  delay_between_requests: 200, // 200ms between requests
  enhanced_soft_404: true, // Enable by default
  max_content_size: 15360, // 15KB (enough to detect error pages)
};

/**
 * URL Validator
 *
 * Validates URL accessibility using 3-level detection strategy.
 */
export class URLValidator {
  private config: ValidatorConfig;

  constructor(config: Partial<ValidatorConfig> = {}) {
    this.config = { ...DEFAULT_VALIDATOR_CONFIG, ...config };
  }

  /**
   * Validate a single URL
   *
   * @param url - URL to validate
   * @returns Validation result with status and reason
   */
  async validateURL(url: string): Promise<ValidationResult> {
    try {
      // Level 1: Hard 404 Detection (HTTP status check)
      const response = await fetch(url, {
        method: 'HEAD',
        redirect: 'follow',
        signal: AbortSignal.timeout(this.config.timeout),
      });

      const status = response.status;
      const contentType = (response.headers.get('content-type') || '').toLowerCase();

      // Check for HTTP errors
      if (status >= 400) {
        return {
          valid: false,
          status,
          reason: `HTTP ${status} error`,
        };
      }

      // Level 2: Soft 404 Detection via Content-Type Mismatch
      // If URL ends with .pdf but server returns HTML, it's likely an error page
      // Detection rate: ~60-70% of soft-404s
      if (url.toLowerCase().endsWith('.pdf')) {
        if (!contentType.includes('pdf') && contentType.includes('html')) {
          return {
            valid: false,
            status,
            contentType,
            reason: 'PDF URL returns HTML (likely error page)',
          };
        }
      }

      // Level 3: Enhanced Soft 404 Detection via Content Analysis
      // Only if enhanced mode is enabled and content-type is HTML
      if (this.config.enhanced_soft_404 && contentType.includes('html')) {
        const contentResult = await this.checkContentForErrors(url);
        if (!contentResult.valid) {
          return contentResult;
        }
      }

      // URL is valid
      return {
        valid: true,
        status,
        contentType,
      };
    } catch (error) {
      // Network error, timeout, or other fetch failure
      return {
        valid: false,
        error: error instanceof Error ? error.message : String(error),
        reason: `Fetch failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Level 3: Check content for soft-404 error patterns
   *
   * Fetches first N KB of content and checks for error patterns.
   * This catches HTML error pages that return HTTP 200.
   *
   * @param url - URL to check
   * @returns Validation result
   */
  private async checkContentForErrors(url: string): Promise<ValidationResult> {
    try {
      // Fetch first N KB of content
      const response = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        signal: AbortSignal.timeout(this.config.timeout),
      });

      // Get first chunk of content
      const reader = response.body?.getReader();
      if (!reader) {
        return { valid: true }; // Can't read content, assume valid
      }

      const chunks: Uint8Array[] = [];
      let totalSize = 0;

      // Read up to max_content_size bytes
      while (totalSize < this.config.max_content_size) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        totalSize += value.length;
      }

      // Cancel remaining stream
      await reader.cancel();

      // Decode content
      const decoder = new TextDecoder();
      const content = chunks.map((chunk) => decoder.decode(chunk, { stream: true })).join('');

      // Check for error patterns
      for (const pattern of SOFT_404_PATTERNS) {
        if (pattern.test(content)) {
          return {
            valid: false,
            status: response.status,
            reason: 'Soft 404 detected in content',
          };
        }
      }

      // No error patterns found
      return { valid: true };
    } catch (error) {
      // If content check fails, don't mark as invalid
      // (better to have false positive than false negative)
      return { valid: true };
    }
  }

  /**
   * Validate multiple URLs in batch
   *
   * @param urls - Array of URLs to validate
   * @param maxConcurrent - Maximum concurrent validations (default: 5)
   * @returns Array of validation results in same order as input
   */
  async validateURLs(urls: string[], maxConcurrent = 5): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    const queue = [...urls];

    // Process URLs with limited concurrency
    const workers: Promise<void>[] = [];
    for (let i = 0; i < Math.min(maxConcurrent, urls.length); i++) {
      workers.push(this.processQueue(queue, urls, results));
    }

    await Promise.all(workers);
    return results;
  }

  /**
   * Worker function to process validation queue
   *
   * @param queue - Queue of URLs to process
   * @param allUrls - All URLs (for indexing)
   * @param results - Results array to populate
   */
  private async processQueue(
    queue: string[],
    allUrls: string[],
    results: ValidationResult[]
  ): Promise<void> {
    while (queue.length > 0) {
      const url = queue.shift();
      if (!url) break;

      const index = allUrls.indexOf(url);
      const result = await this.validateURL(url);
      results[index] = result;

      // Rate limiting delay
      if (queue.length > 0 && this.config.delay_between_requests > 0) {
        await new Promise((resolve) => setTimeout(resolve, this.config.delay_between_requests));
      }
    }
  }

  /**
   * Validate a URL and return boolean result
   *
   * Convenience method for simple valid/invalid check.
   *
   * @param url - URL to validate
   * @returns True if valid, false otherwise
   */
  async isValid(url: string): Promise<boolean> {
    const result = await this.validateURL(url);
    return result.valid;
  }

  /**
   * Get validator statistics for a batch validation
   *
   * @param results - Array of validation results
   * @returns Statistics object
   */
  getStatistics(results: ValidationResult[]): {
    total: number;
    valid: number;
    invalid: number;
    hard_404: number;
    soft_404_content_type: number;
    soft_404_content: number;
    network_errors: number;
    validity_rate: number;
  } {
    const total = results.length;
    const valid = results.filter((r) => r.valid).length;
    const invalid = total - valid;

    // Count different types of failures
    const hard_404 = results.filter((r) => !r.valid && r.status && r.status >= 400).length;
    const soft_404_content_type = results.filter(
      (r) => !r.valid && r.reason?.includes('PDF URL returns HTML')
    ).length;
    const soft_404_content = results.filter(
      (r) => !r.valid && r.reason?.includes('Soft 404 detected in content')
    ).length;
    const network_errors = results.filter((r) => !r.valid && r.error).length;

    return {
      total,
      valid,
      invalid,
      hard_404,
      soft_404_content_type,
      soft_404_content,
      network_errors,
      validity_rate: total > 0 ? valid / total : 0,
    };
  }
}

/**
 * Convenience function to validate a single URL
 *
 * @param url - URL to validate
 * @param config - Optional validator configuration
 * @returns Validation result
 */
export async function validateURL(
  url: string,
  config?: Partial<ValidatorConfig>
): Promise<ValidationResult> {
  const validator = new URLValidator(config);
  return validator.validateURL(url);
}

/**
 * Convenience function to validate multiple URLs
 *
 * @param urls - URLs to validate
 * @param config - Optional validator configuration
 * @param maxConcurrent - Maximum concurrent validations
 * @returns Array of validation results
 */
export async function validateURLs(
  urls: string[],
  config?: Partial<ValidatorConfig>,
  maxConcurrent = 5
): Promise<ValidationResult[]> {
  const validator = new URLValidator(config);
  return validator.validateURLs(urls, maxConcurrent);
}
