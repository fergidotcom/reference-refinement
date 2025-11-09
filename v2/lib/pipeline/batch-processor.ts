/**
 * Reference Refinement v2 - Batch Processor
 *
 * Processes multiple references in batch with:
 * - Progress tracking and save/resume
 * - Error handling and retry logic
 * - Cost tracking
 * - Detailed logging
 */

import * as fs from 'fs/promises';
import chalk from 'chalk';
import { ReferencePipeline, type PipelineResult } from './reference-pipeline.js';
import { ProgressTracker } from './progress-tracker.js';
import { OutputGenerator } from '../output-generator/index.js';
import type { PipelineConfig } from './pipeline-config.js';
import type { Reference } from '../types/index.js';

/**
 * Batch processing options
 */
export interface BatchOptions {
  /** Resume from previous run */
  resume: boolean;
  /** Create backup before processing */
  create_backup: boolean;
  /** Maximum retries for failed references */
  max_retries: number;
  /** Callback for progress updates */
  onProgress?: (current: number, total: number, result: PipelineResult) => void;
}

/**
 * Batch processing result
 */
export interface BatchResult {
  /** Total references processed */
  total: number;
  /** Successfully processed */
  successful: number;
  /** Failed references */
  failed: number;
  /** Skipped (already completed) */
  skipped: number;
  /** Total cost */
  total_cost: number;
  /** Processing time (ms) */
  processing_time_ms: number;
  /** Failed reference IDs */
  failed_ids: number[];
}

/**
 * Batch Processor
 *
 * Processes multiple references with progress tracking
 */
export class BatchProcessor {
  private config: PipelineConfig;
  private pipeline: ReferencePipeline;
  private outputGenerator: OutputGenerator;

  constructor(config: PipelineConfig) {
    this.config = config;
    this.pipeline = new ReferencePipeline(config);
    this.outputGenerator = new OutputGenerator();
  }

  /**
   * Process multiple references in batch
   *
   * @param references - References to process
   * @param options - Batch processing options
   * @returns Batch result
   */
  async processBatch(
    references: Reference[],
    options: Partial<BatchOptions> = {}
  ): Promise<BatchResult> {
    const startTime = Date.now();

    const opts: BatchOptions = {
      resume: options.resume ?? this.config.batch?.save_progress ?? true,
      create_backup: options.create_backup ?? this.config.batch?.create_backup ?? true,
      max_retries: options.max_retries ?? 2,
      onProgress: options.onProgress,
    };

    // Filter references based on selection mode
    const selectedRefs = this.filterReferences(references);

    console.log(chalk.bold.cyan('\n📦 Reference Refinement - Batch Processor v2.0'));
    console.log(chalk.gray('━'.repeat(60)) + '\n');

    // Load or create progress tracker
    const progressFile = this.config.batch?.progress_file || './batch-progress.json';
    let tracker: ProgressTracker;

    if (opts.resume) {
      const loaded = await ProgressTracker.load(progressFile);
      tracker = loaded || new ProgressTracker(selectedRefs.length, progressFile);
      if (loaded) {
        console.log(chalk.yellow(`📂 Resumed from previous run`));
        console.log(chalk.gray(`   Completed: ${loaded.getProgress().completed.length}\n`));
      }
    } else {
      tracker = new ProgressTracker(selectedRefs.length, progressFile);
    }

    // Create backup if requested
    if (opts.create_backup && this.config.output.path) {
      await this.createBackup(this.config.output.path);
    }

    // Print configuration
    this.printConfiguration(selectedRefs.length);

    // Give user time to cancel
    console.log(chalk.yellow('⏳ Starting in 3 seconds... (Ctrl+C to cancel)\n'));
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Process each reference
    let successful = 0;
    let failed = 0;
    let skipped = 0;
    const failedIds: number[] = [];

    for (let i = 0; i < selectedRefs.length; i++) {
      const ref = selectedRefs[i];

      // Skip if already completed (resume mode)
      if (tracker.shouldSkip(ref.id)) {
        skipped++;
        continue;
      }

      // Mark as current
      tracker.startReference(ref.id);

      const progress = Math.round(((i + 1) / selectedRefs.length) * 100);
      console.log(
        chalk.cyan(
          `\n🔄 Processing [${ref.id}]: ${ref.parsed.title || 'Untitled'} (${i + 1}/${selectedRefs.length} - ${progress}%)`
        )
      );

      try {
        // Process reference
        const result = await this.pipeline.processReference(ref);

        if (result.success) {
          // Update tracker
          tracker.completeReference(ref.id);
          tracker.increment('queries_generated', result.stats.queries_generated);
          tracker.increment('searches_performed', result.stats.queries_generated); // 1 search per query
          tracker.increment('candidates_discovered', result.stats.candidates_found);
          tracker.increment('urls_validated', result.stats.candidates_validated);
          tracker.addCost(result.stats.cost);

          if (ref.flags.finalized) {
            tracker.increment('references_finalized');
          }
          if (ref.flags.manual_review) {
            tracker.increment('manual_review_needed');
          }

          successful++;

          // Print result
          this.printReferenceResult(result);

          // Call progress callback
          if (opts.onProgress) {
            opts.onProgress(i + 1, selectedRefs.length, result);
          }
        } else {
          throw new Error(result.error || 'Unknown error');
        }
      } catch (error) {
        console.log(chalk.red(`   ❌ Error: ${error instanceof Error ? error.message : String(error)}`));
        tracker.failReference(ref.id);
        failed++;
        failedIds.push(ref.id);
      }

      // Print progress summary
      console.log(chalk.gray(`\n   ${tracker.getSummary()}`));
    }

    // Save final progress
    await tracker.save();

    // Save output
    if (this.config.output.path) {
      await this.outputGenerator.writeFile(
        references,
        this.config.output.path,
        this.config.output.format
      );
      console.log(chalk.green(`\n💾 Saved output to: ${this.config.output.path}`));
    }

    // Delete progress file if completed successfully
    if (failed === 0 && skipped === 0) {
      await tracker.delete();
    }

    const processingTime = Date.now() - startTime;

    // Print final summary
    this.printFinalSummary(tracker, successful, failed, skipped, processingTime);

    return {
      total: selectedRefs.length,
      successful,
      failed,
      skipped,
      total_cost: tracker.getProgress().stats.total_cost,
      processing_time_ms: processingTime,
      failed_ids: failedIds,
    };
  }

  /**
   * Filter references based on selection mode
   */
  private filterReferences(references: Reference[]): Reference[] {
    const mode = this.config.batch?.selection_mode || 'unfinalized';

    switch (mode) {
      case 'all':
        return references;

      case 'unfinalized':
        return references.filter((ref) => !ref.flags.finalized);

      case 'manual_review':
        return references.filter((ref) => ref.flags.manual_review);

      case 'range':
        const range = this.config.batch?.reference_range;
        if (!range || !range.start || !range.end) {
          return references;
        }
        return references.filter((ref) => ref.id >= range.start! && ref.id <= range.end!);

      default:
        return references;
    }
  }

  /**
   * Create backup of output file
   */
  private async createBackup(filepath: string): Promise<void> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const backupPath = filepath.replace(/\.txt$/, `_backup_${timestamp}.txt`);

      await fs.copyFile(filepath, backupPath);
      console.log(chalk.gray(`📋 Created backup: ${backupPath}\n`));
    } catch (error) {
      // File may not exist yet, ignore
    }
  }

  /**
   * Print configuration
   */
  private printConfiguration(totalRefs: number): void {
    console.log(chalk.gray('Configuration:'));
    console.log(chalk.gray(`  Selection: ${this.config.batch?.selection_mode || 'unfinalized'}`));
    console.log(chalk.gray(`  References: ${totalRefs}`));
    console.log(chalk.gray(`  Queries per ref: ${this.config.search.queries_per_reference}`));
    console.log(chalk.gray(`  Auto-finalize: ${this.config.output.auto_finalize ? 'YES' : 'NO'}`));
    console.log(chalk.gray(`  Batch version: ${this.config.output.batch_version}`));

    // Cost estimation
    const estimatedCost = totalRefs * 0.14; // ~$0.14 per reference
    console.log(chalk.gray('\nEstimated:'));
    console.log(chalk.gray(`  Cost: ~$${estimatedCost.toFixed(2)}`));
    console.log(chalk.gray(`  Time: ~${Math.ceil(totalRefs * 0.3)} minutes\n`));
  }

  /**
   * Print result for a single reference
   */
  private printReferenceResult(result: PipelineResult): void {
    const ref = result.reference;

    console.log(chalk.gray(`   ✓ Queries: ${result.stats.queries_generated}`));
    console.log(chalk.gray(`   ✓ Candidates: ${result.stats.candidates_found}`));
    console.log(chalk.gray(`   ✓ Validated: ${result.stats.valid_candidates}/${result.stats.candidates_validated}`));

    if (ref.urls.primary) {
      const conf = result.stats.primary_confidence
        ? ` (${Math.round(result.stats.primary_confidence * 100)}%)`
        : '';
      console.log(chalk.green(`   ✓ Primary: ${ref.urls.primary}${conf}`));
    } else {
      console.log(chalk.yellow(`   ⚠ Primary: Not found`));
    }

    if (ref.urls.secondary) {
      const conf = result.stats.secondary_confidence
        ? ` (${Math.round(result.stats.secondary_confidence * 100)}%)`
        : '';
      console.log(chalk.green(`   ✓ Secondary: ${ref.urls.secondary}${conf}`));
    }

    if (ref.flags.finalized) {
      console.log(chalk.green(`   ✅ Finalized`));
    } else if (ref.flags.manual_review) {
      console.log(chalk.yellow(`   ⚠️  Manual review needed`));
    }
  }

  /**
   * Print final summary
   */
  private printFinalSummary(
    tracker: ProgressTracker,
    successful: number,
    failed: number,
    skipped: number,
    processingTime: number
  ): void {
    const stats = tracker.getProgress().stats;

    console.log(chalk.bold.cyan('\n\n📊 Batch Processing Complete'));
    console.log(chalk.gray('━'.repeat(60)));

    console.log(chalk.white('\nResults:'));
    console.log(chalk.green(`  ✓ Successful: ${successful}`));
    if (failed > 0) console.log(chalk.red(`  ✗ Failed: ${failed}`));
    if (skipped > 0) console.log(chalk.gray(`  ⊝ Skipped: ${skipped}`));

    console.log(chalk.white('\nStatistics:'));
    console.log(chalk.gray(`  Queries generated: ${stats.queries_generated}`));
    console.log(chalk.gray(`  Searches performed: ${stats.searches_performed}`));
    console.log(chalk.gray(`  Candidates discovered: ${stats.candidates_discovered}`));
    console.log(chalk.gray(`  URLs validated: ${stats.urls_validated}`));
    console.log(chalk.gray(`  References finalized: ${stats.references_finalized}`));
    console.log(chalk.gray(`  Manual review needed: ${stats.manual_review_needed}`));

    console.log(chalk.white('\nCost & Time:'));
    console.log(chalk.gray(`  Total cost: $${stats.total_cost.toFixed(4)}`));
    console.log(chalk.gray(`  Processing time: ${this.formatDuration(processingTime)}`));
    console.log(
      chalk.gray(
        `  Average time/ref: ${this.formatDuration(processingTime / (successful + failed))}`
      )
    );

    console.log('');
  }

  /**
   * Format duration
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
}
