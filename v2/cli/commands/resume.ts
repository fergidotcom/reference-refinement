/**
 * Reference Refinement v2 - Resume Command
 *
 * Resumes interrupted batch processing
 */

import chalk from 'chalk';
import { existsSync } from 'fs';
import { loadConfig } from '../../lib/pipeline/index.js';
import { ProgressTracker } from '../../lib/pipeline/index.js';

interface ResumeOptions {
  config: string;
  progress: string;
}

export async function resumeCommand(options: ResumeOptions): Promise<void> {
  console.log(chalk.bold.blue('\n🔄 Resume Batch Processing'));
  console.log(chalk.gray('━'.repeat(60)) + '\n');

  try {
    // Check if progress file exists
    if (!existsSync(options.progress)) {
      throw new Error(`Progress file not found: ${options.progress}\n\nNo batch to resume.`);
    }

    // Load progress
    console.log(chalk.gray(`📂 Loading progress: ${options.progress}\n`));
    const tracker = await ProgressTracker.load(options.progress);

    if (!tracker) {
      throw new Error('Failed to load progress file');
    }

    const progress = tracker.getProgress();

    // Print progress summary
    console.log(chalk.white('Progress Summary:'));
    console.log(chalk.gray(`  Total references: ${progress.total}`));
    console.log(chalk.gray(`  Completed: ${progress.completed.length}`));
    console.log(chalk.gray(`  Failed: ${progress.failed.length}`));
    console.log(
      chalk.gray(`  Remaining: ${progress.total - progress.completed.length - progress.failed.length}`)
    );
    console.log(chalk.gray(`  Started: ${progress.started_at.toLocaleString()}`));
    console.log(chalk.gray(`  Last update: ${progress.updated_at.toLocaleString()}\n`));

    // Load configuration
    if (!existsSync(options.config)) {
      throw new Error(`Configuration file not found: ${options.config}`);
    }

    await loadConfig(options.config);

    // Get input file from config
    // For resume, we need to determine the input file
    // This is a limitation - we should store the input file in progress
    // For now, we'll require the user to use the process command with --resume flag

    console.log(chalk.yellow('ℹ️  To resume, run the process command with the original input file:\n'));
    console.log(chalk.gray(`   refine process <input-file> --config ${options.config}\n`));
    console.log(
      chalk.gray('   The process command will automatically detect and resume from the progress file.\n')
    );

    process.exit(0);
  } catch (error) {
    console.error(chalk.red('\n❌ Error:'), error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
