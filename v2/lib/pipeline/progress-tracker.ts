/**
 * Reference Refinement v2 - Progress Tracker
 *
 * Tracks batch processing progress with save/resume capability
 */

import * as fs from 'fs/promises';
import { existsSync } from 'fs';
import type { ProcessingProgress, CostBreakdown } from '../types/index.js';

/**
 * Progress Tracker
 *
 * Tracks processing progress and costs, with save/resume capability
 */
export class ProgressTracker {
  private progress: ProcessingProgress;
  private filepath: string;
  private autoSave: boolean;

  constructor(total: number, filepath = './batch-progress.json', autoSave = true) {
    this.filepath = filepath;
    this.autoSave = autoSave;
    this.progress = {
      total,
      completed: [],
      failed: [],
      current: undefined,
      stats: {
        queries_generated: 0,
        searches_performed: 0,
        candidates_discovered: 0,
        urls_validated: 0,
        references_finalized: 0,
        manual_review_needed: 0,
        total_cost: 0,
      },
      started_at: new Date(),
      updated_at: new Date(),
    };
  }

  /**
   * Load progress from file (for resume)
   *
   * @param filepath - Progress file path
   * @returns ProgressTracker instance
   */
  static async load(filepath: string): Promise<ProgressTracker | null> {
    if (!existsSync(filepath)) {
      return null;
    }

    try {
      const content = await fs.readFile(filepath, 'utf-8');
      const data = JSON.parse(content);

      const tracker = new ProgressTracker(data.total, filepath, true);
      tracker.progress = {
        ...data,
        started_at: new Date(data.started_at),
        updated_at: new Date(data.updated_at),
      };

      return tracker;
    } catch (error) {
      console.error('Failed to load progress file:', error);
      return null;
    }
  }

  /**
   * Mark reference as being processed
   *
   * @param refId - Reference ID
   */
  startReference(refId: number): void {
    this.progress.current = refId;
    this.progress.updated_at = new Date();
    if (this.autoSave) {
      void this.save();
    }
  }

  /**
   * Mark reference as completed
   *
   * @param refId - Reference ID
   */
  completeReference(refId: number): void {
    if (!this.progress.completed.includes(refId)) {
      this.progress.completed.push(refId);
    }
    this.progress.current = undefined;
    this.progress.updated_at = new Date();
    if (this.autoSave) {
      void this.save();
    }
  }

  /**
   * Mark reference as failed
   *
   * @param refId - Reference ID
   */
  failReference(refId: number): void {
    if (!this.progress.failed.includes(refId)) {
      this.progress.failed.push(refId);
    }
    this.progress.current = undefined;
    this.progress.updated_at = new Date();
    if (this.autoSave) {
      void this.save();
    }
  }

  /**
   * Update statistics
   *
   * @param updates - Statistics updates
   */
  updateStats(updates: Partial<ProcessingProgress['stats']>): void {
    this.progress.stats = {
      ...this.progress.stats,
      ...updates,
    };
    this.progress.updated_at = new Date();
    if (this.autoSave) {
      void this.save();
    }
  }

  /**
   * Increment a statistic
   *
   * @param stat - Statistic name
   * @param amount - Amount to increment (default: 1)
   */
  increment(stat: keyof ProcessingProgress['stats'], amount = 1): void {
    if (typeof this.progress.stats[stat] === 'number') {
      (this.progress.stats[stat] as number) += amount;
      this.progress.updated_at = new Date();
      if (this.autoSave) {
        void this.save();
      }
    }
  }

  /**
   * Add cost to total
   *
   * @param cost - Cost in USD
   */
  addCost(cost: number): void {
    this.progress.stats.total_cost += cost;
    this.progress.updated_at = new Date();
    if (this.autoSave) {
      void this.save();
    }
  }

  /**
   * Get current progress
   *
   * @returns Progress object
   */
  getProgress(): ProcessingProgress {
    return { ...this.progress };
  }

  /**
   * Get completion percentage
   *
   * @returns Percentage (0-100)
   */
  getCompletionPercentage(): number {
    const completed = this.progress.completed.length;
    const total = this.progress.total;
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  }

  /**
   * Get estimated time remaining
   *
   * @returns Estimated milliseconds remaining, or null if can't estimate
   */
  getEstimatedTimeRemaining(): number | null {
    const completed = this.progress.completed.length;
    if (completed === 0) return null;

    const elapsed = Date.now() - this.progress.started_at.getTime();
    const avgTimePerRef = elapsed / completed;
    const remaining = this.progress.total - completed;

    return Math.round(remaining * avgTimePerRef);
  }

  /**
   * Get elapsed time
   *
   * @returns Elapsed milliseconds
   */
  getElapsedTime(): number {
    return Date.now() - this.progress.started_at.getTime();
  }

  /**
   * Get average time per reference
   *
   * @returns Average milliseconds per reference
   */
  getAverageTimePerReference(): number {
    const completed = this.progress.completed.length;
    if (completed === 0) return 0;

    const elapsed = this.getElapsedTime();
    return Math.round(elapsed / completed);
  }

  /**
   * Get cost breakdown
   *
   * @param googleCostPerSearch - Cost per Google search (default: $0.005)
   * @returns Cost breakdown
   */
  getCostBreakdown(googleCostPerSearch = 0.005): CostBreakdown {
    const googleSearches = this.progress.stats.searches_performed;
    const googleCost = googleSearches * googleCostPerSearch;

    // Claude cost is tracked directly
    const claudeCost = this.progress.stats.total_cost - googleCost;

    return {
      google: {
        searches: googleSearches,
        cost_per_search: googleCostPerSearch,
        total: googleCost,
      },
      claude: {
        calls: 0, // Not tracked separately
        input_tokens: 0, // Not tracked separately
        output_tokens: 0, // Not tracked separately
        total: Math.max(0, claudeCost),
      },
      total: this.progress.stats.total_cost,
    };
  }

  /**
   * Get summary string
   *
   * @returns Human-readable summary
   */
  getSummary(): string {
    const completed = this.progress.completed.length;
    const failed = this.progress.failed.length;
    const total = this.progress.total;
    const percentage = this.getCompletionPercentage();

    const elapsed = this.getElapsedTime();
    const elapsedStr = this.formatDuration(elapsed);

    const remaining = this.getEstimatedTimeRemaining();
    const remainingStr = remaining ? this.formatDuration(remaining) : 'unknown';

    return [
      `Progress: ${completed}/${total} (${percentage}%)`,
      `Failed: ${failed}`,
      `Elapsed: ${elapsedStr}`,
      `Remaining: ~${remainingStr}`,
      `Cost: $${this.progress.stats.total_cost.toFixed(4)}`,
    ].join(' | ');
  }

  /**
   * Format duration in milliseconds to human-readable string
   *
   * @param ms - Duration in milliseconds
   * @returns Formatted string (e.g., "1h 23m", "45m", "2m 30s")
   */
  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Save progress to file
   */
  async save(): Promise<void> {
    try {
      const content = JSON.stringify(this.progress, null, 2);
      await fs.writeFile(this.filepath, content, 'utf-8');
    } catch (error) {
      console.error('Failed to save progress:', error);
    }
  }

  /**
   * Delete progress file
   */
  async delete(): Promise<void> {
    try {
      if (existsSync(this.filepath)) {
        await fs.unlink(this.filepath);
      }
    } catch (error) {
      console.error('Failed to delete progress file:', error);
    }
  }

  /**
   * Check if reference should be skipped (already completed or failed)
   *
   * @param refId - Reference ID
   * @returns True if should skip
   */
  shouldSkip(refId: number): boolean {
    return this.progress.completed.includes(refId) || this.progress.failed.includes(refId);
  }
}

/**
 * Format elapsed time for display
 *
 * @param startTime - Start time (Date or timestamp)
 * @returns Formatted duration string
 */
export function formatElapsedTime(startTime: Date | number): string {
  const start = typeof startTime === 'number' ? startTime : startTime.getTime();
  const elapsed = Date.now() - start;

  const seconds = Math.floor(elapsed / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}
