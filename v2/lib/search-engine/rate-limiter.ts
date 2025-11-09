/**
 * Rate Limiter
 *
 * Token bucket algorithm for API rate limiting.
 * Prevents exceeding Google Custom Search API quotas.
 */

import type {
  RateLimitConfig,
  TokenBucketState,
  RateLimitStatus,
  RateLimitError,
} from '../types/index.js';

/**
 * Rate limiter using token bucket algorithm
 *
 * @example
 * ```typescript
 * const limiter = new RateLimiter({
 *   maxQueriesPerDay: 100,
 *   maxQueriesPerSecond: 1
 * });
 *
 * // Check if request is allowed
 * const status = await limiter.checkRateLimit(1);
 * if (status.allowed) {
 *   // Consume token and make request
 *   limiter.consumeTokens(1);
 *   await makeAPICall();
 * } else {
 *   // Wait before retrying
 *   await sleep(status.waitTimeMs);
 * }
 * ```
 */
export class RateLimiter {
  private perSecondBucket: TokenBucketState;
  private perDayBucket: TokenBucketState;

  /**
   * Create a rate limiter
   *
   * @param config - Rate limit configuration
   */
  constructor(private config: RateLimitConfig) {
    const now = new Date();

    // Per-second bucket (refills continuously)
    this.perSecondBucket = {
      tokens: config.maxQueriesPerSecond,
      capacity: config.maxQueriesPerSecond,
      refillRate: config.maxQueriesPerSecond,
      lastRefill: now,
    };

    // Per-day bucket (refills daily)
    this.perDayBucket = {
      tokens: config.maxQueriesPerDay,
      capacity: config.maxQueriesPerDay,
      refillRate: config.maxQueriesPerDay / (24 * 60 * 60), // tokens per second
      lastRefill: now,
    };
  }

  /**
   * Refill tokens based on elapsed time
   *
   * @param bucket - Token bucket to refill
   */
  private refillTokens(bucket: TokenBucketState): void {
    const now = new Date();
    const elapsedSeconds = (now.getTime() - bucket.lastRefill.getTime()) / 1000;

    // Calculate tokens to add
    const tokensToAdd = elapsedSeconds * bucket.refillRate;

    // Add tokens (capped at capacity)
    bucket.tokens = Math.min(bucket.capacity, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;
  }

  /**
   * Check if rate limit allows the request
   *
   * @param tokensRequired - Number of tokens needed (default: 1)
   * @returns Rate limit status
   */
  checkRateLimit(tokensRequired: number = 1): RateLimitStatus {
    // Refill both buckets
    this.refillTokens(this.perSecondBucket);
    this.refillTokens(this.perDayBucket);

    // Check per-second limit
    if (this.perSecondBucket.tokens < tokensRequired) {
      const tokensNeeded = tokensRequired - this.perSecondBucket.tokens;
      const waitTimeMs = (tokensNeeded / this.perSecondBucket.refillRate) * 1000;

      return {
        allowed: false,
        tokensAvailable: this.perSecondBucket.tokens,
        tokensRequired,
        waitTimeMs: Math.ceil(waitTimeMs),
      };
    }

    // Check per-day limit
    if (this.perDayBucket.tokens < tokensRequired) {
      const tokensNeeded = tokensRequired - this.perDayBucket.tokens;
      const waitTimeMs = (tokensNeeded / this.perDayBucket.refillRate) * 1000;

      return {
        allowed: false,
        tokensAvailable: this.perDayBucket.tokens,
        tokensRequired,
        waitTimeMs: Math.ceil(waitTimeMs),
      };
    }

    // Both limits allow the request
    return {
      allowed: true,
      tokensAvailable: Math.min(this.perSecondBucket.tokens, this.perDayBucket.tokens),
      tokensRequired,
    };
  }

  /**
   * Consume tokens from both buckets
   *
   * @param tokens - Number of tokens to consume (default: 1)
   * @throws RateLimitError if tokens not available
   */
  consumeTokens(tokens: number = 1): void {
    const status = this.checkRateLimit(tokens);

    if (!status.allowed) {
      const error = new Error(
        `Rate limit exceeded. Please wait ${status.waitTimeMs}ms before retrying.`
      ) as RateLimitError;
      error.name = 'RateLimitError';
      error.code = 'RATE_LIMIT_EXCEEDED';
      error.retryAfterMs = status.waitTimeMs!;
      throw error;
    }

    // Consume from both buckets
    this.perSecondBucket.tokens -= tokens;
    this.perDayBucket.tokens -= tokens;
  }

  /**
   * Wait until rate limit allows the request, then consume tokens
   *
   * @param tokens - Number of tokens needed (default: 1)
   * @returns Promise that resolves when tokens are consumed
   */
  async waitAndConsume(tokens: number = 1): Promise<void> {
    const status = this.checkRateLimit(tokens);

    if (!status.allowed && status.waitTimeMs !== undefined) {
      // Wait until tokens are available
      await new Promise((resolve) => setTimeout(resolve, status.waitTimeMs));
    }

    // Consume tokens
    this.consumeTokens(tokens);
  }

  /**
   * Get current bucket states (for debugging/monitoring)
   */
  getBucketStates(): {
    perSecond: TokenBucketState;
    perDay: TokenBucketState;
  } {
    this.refillTokens(this.perSecondBucket);
    this.refillTokens(this.perDayBucket);

    return {
      perSecond: { ...this.perSecondBucket },
      perDay: { ...this.perDayBucket },
    };
  }

  /**
   * Reset rate limiter (for testing)
   */
  reset(): void {
    const now = new Date();

    this.perSecondBucket.tokens = this.config.maxQueriesPerSecond;
    this.perSecondBucket.lastRefill = now;

    this.perDayBucket.tokens = this.config.maxQueriesPerDay;
    this.perDayBucket.lastRefill = now;
  }

  /**
   * Get available quota information
   */
  getQuotaInfo(): {
    perSecondAvailable: number;
    perSecondCapacity: number;
    perDayAvailable: number;
    perDayCapacity: number;
    perDayUsedPercent: number;
  } {
    this.refillTokens(this.perSecondBucket);
    this.refillTokens(this.perDayBucket);

    return {
      perSecondAvailable: Math.floor(this.perSecondBucket.tokens),
      perSecondCapacity: this.perSecondBucket.capacity,
      perDayAvailable: Math.floor(this.perDayBucket.tokens),
      perDayCapacity: this.perDayBucket.capacity,
      perDayUsedPercent:
        ((this.perDayBucket.capacity - this.perDayBucket.tokens) / this.perDayBucket.capacity) *
        100,
    };
  }
}

/**
 * Sleep helper function
 *
 * @param ms - Milliseconds to sleep
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
