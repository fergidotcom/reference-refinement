/**
 * Cost Tracker
 *
 * Tracks API usage costs for Google Custom Search.
 * Provides cost summaries and budget warnings.
 */

import type { CostTrackingConfig, CostEntry, SearchStats } from '../types/index.js';

/**
 * Cost tracker for search operations
 *
 * @example
 * ```typescript
 * const tracker = new CostTracker({
 *   costPerQuery: 0.005,
 *   budgetWarningThreshold: 10.0
 * });
 *
 * // Record queries
 * tracker.recordQueries('REF-001', 8);
 *
 * // Get current stats
 * const stats = tracker.getStats();
 * console.log(`Total cost: $${stats.totalCost.toFixed(2)}`);
 *
 * // Check for budget warnings
 * if (tracker.isOverBudget()) {
 *   console.warn('Budget threshold exceeded!');
 * }
 * ```
 */
export class CostTracker {
  private entries: CostEntry[] = [];
  private totalQueries: number = 0;
  private referencesProcessed: Set<string> = new Set();

  /**
   * Create a cost tracker
   *
   * @param config - Cost tracking configuration
   */
  constructor(private config: CostTrackingConfig) {}

  /**
   * Record queries executed
   *
   * @param rid - Reference ID
   * @param queryCount - Number of queries executed
   * @param operation - Operation type (default: search_execution)
   */
  recordQueries(
    rid: string,
    queryCount: number,
    operation: 'query_generation' | 'search_execution' = 'search_execution'
  ): void {
    const cost = queryCount * this.config.costPerQuery;

    this.entries.push({
      timestamp: new Date(),
      rid,
      operation,
      queryCount,
      cost,
    });

    this.totalQueries += queryCount;
    this.referencesProcessed.add(rid);
  }

  /**
   * Get total cost
   */
  getTotalCost(): number {
    return this.entries.reduce((sum, entry) => sum + entry.cost, 0);
  }

  /**
   * Get current statistics
   */
  getStats(): SearchStats {
    const totalCost = this.getTotalCost();
    const refsCount = this.referencesProcessed.size;

    return {
      queriesExecuted: this.totalQueries,
      urlsDiscovered: 0, // Set externally by SearchEngine
      totalCost,
      avgCostPerReference: refsCount > 0 ? totalCost / refsCount : 0,
      avgUrlsPerReference: 0, // Set externally by SearchEngine
      apiErrors: 0, // Set externally by SearchEngine
      referencesProcessed: refsCount,
    };
  }

  /**
   * Check if budget threshold is exceeded
   */
  isOverBudget(): boolean {
    return this.getTotalCost() >= this.config.budgetWarningThreshold;
  }

  /**
   * Get budget status
   */
  getBudgetStatus(): {
    currentCost: number;
    threshold: number;
    percentUsed: number;
    remaining: number;
    isOverBudget: boolean;
  } {
    const currentCost = this.getTotalCost();
    const threshold = this.config.budgetWarningThreshold;

    return {
      currentCost,
      threshold,
      percentUsed: (currentCost / threshold) * 100,
      remaining: Math.max(0, threshold - currentCost),
      isOverBudget: this.isOverBudget(),
    };
  }

  /**
   * Get cost projection for additional references
   *
   * @param additionalRefs - Number of additional references
   * @param queriesPerRef - Queries per reference (default: 8)
   */
  getProjection(additionalRefs: number, queriesPerRef: number = 8): {
    additionalQueries: number;
    additionalCost: number;
    projectedTotal: number;
    wouldExceedBudget: boolean;
  } {
    const additionalQueries = additionalRefs * queriesPerRef;
    const additionalCost = additionalQueries * this.config.costPerQuery;
    const projectedTotal = this.getTotalCost() + additionalCost;

    return {
      additionalQueries,
      additionalCost,
      projectedTotal,
      wouldExceedBudget: projectedTotal >= this.config.budgetWarningThreshold,
    };
  }

  /**
   * Generate cost summary report
   */
  generateSummary(): string {
    const stats = this.getStats();
    const budget = this.getBudgetStatus();
    const projection100 = this.getProjection(100);
    const projection500 = this.getProjection(500);

    const lines: string[] = [];
    lines.push('');
    lines.push('═══════════════════════════════════════════════════════════');
    lines.push('  COST TRACKING SUMMARY');
    lines.push('═══════════════════════════════════════════════════════════');
    lines.push('');
    lines.push('Current Session:');
    lines.push(`  References processed:  ${stats.referencesProcessed}`);
    lines.push(`  Queries executed:      ${stats.queriesExecuted}`);
    lines.push(`  Total cost:            $${stats.totalCost.toFixed(4)}`);
    lines.push(`  Avg cost per ref:      $${stats.avgCostPerReference.toFixed(4)}`);
    lines.push('');
    lines.push('Budget Status:');
    lines.push(`  Budget threshold:      $${budget.threshold.toFixed(2)}`);
    lines.push(`  Current cost:          $${budget.currentCost.toFixed(4)}`);
    lines.push(`  Percent used:          ${budget.percentUsed.toFixed(1)}%`);
    lines.push(`  Remaining:             $${budget.remaining.toFixed(4)}`);
    lines.push(`  Status:                ${budget.isOverBudget ? '⚠️  OVER BUDGET' : '✓ OK'}`);
    lines.push('');
    lines.push('Projections:');
    lines.push(
      `  100 refs:              $${projection100.projectedTotal.toFixed(2)} ${projection100.wouldExceedBudget ? '(exceeds budget)' : ''}`
    );
    lines.push(
      `  500 refs:              $${projection500.projectedTotal.toFixed(2)} ${projection500.wouldExceedBudget ? '(exceeds budget)' : ''}`
    );
    lines.push('');
    lines.push('═══════════════════════════════════════════════════════════');
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Get cost entries for a specific reference
   *
   * @param rid - Reference ID
   */
  getEntriesForReference(rid: string): CostEntry[] {
    return this.entries.filter((entry) => entry.rid === rid);
  }

  /**
   * Get all cost entries
   */
  getAllEntries(): CostEntry[] {
    return [...this.entries];
  }

  /**
   * Export cost data as JSON
   */
  exportJSON(): string {
    return JSON.stringify(
      {
        config: this.config,
        stats: this.getStats(),
        budget: this.getBudgetStatus(),
        entries: this.entries,
      },
      null,
      2
    );
  }

  /**
   * Reset cost tracker (for testing)
   */
  reset(): void {
    this.entries = [];
    this.totalQueries = 0;
    this.referencesProcessed.clear();
  }
}
