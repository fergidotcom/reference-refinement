/**
 * Reference Refinement v2 - Process Command
 *
 * Processes a manuscript or references file
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import { existsSync } from 'fs';
import { loadConfig, loadConfigFromEnv, mergeConfigs, validateConfig } from '../../lib/pipeline/index.js';
import { BatchProcessor } from '../../lib/pipeline/index.js';
import { OutputGenerator } from '../../lib/output-generator/index.js';
import type { PipelineConfig } from '../../lib/pipeline/index.js';

interface ProcessOptions {
  config: string;
  output?: string;
  format: string;
  autoFinalize?: boolean;
  batchVersion?: string;
  dryRun?: boolean;
}

export async function processCommand(input: string, options: ProcessOptions): Promise<void> {
  console.log(chalk.bold.blue('\n🔬 Reference Refinement v2 - Process'));
  console.log(chalk.gray('━'.repeat(60)) + '\n');

  try {
    // Check input file exists
    if (!existsSync(input)) {
      throw new Error(`Input file not found: ${input}`);
    }

    // Load configuration
    let config: PipelineConfig;

    if (existsSync(options.config)) {
      console.log(chalk.gray(`📋 Loading config: ${options.config}`));
      config = await loadConfig(options.config);
    } else {
      console.log(chalk.yellow(`⚠️  Config file not found: ${options.config}`));
      console.log(chalk.gray('   Using environment variables...\n'));

      const envConfig = loadConfigFromEnv();

      // Prompt for missing API keys
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'google_api_key',
          message: 'Google API Key:',
          when: !envConfig.google_api_key,
        },
        {
          type: 'input',
          name: 'google_cse_id',
          message: 'Google CSE ID:',
          when: !envConfig.google_cse_id,
        },
        {
          type: 'password',
          name: 'anthropic_api_key',
          message: 'Anthropic API Key:',
          when: !envConfig.anthropic_api_key,
        },
      ]);

      config = validateConfig(mergeConfigs(envConfig, answers as any));
    }

    // Apply command-line overrides
    if (options.output) {
      config.output.path = options.output;
    }
    if (options.format) {
      config.output.format = options.format as any;
    }
    if (options.autoFinalize !== undefined) {
      config.output.auto_finalize = options.autoFinalize;
    }
    if (options.batchVersion) {
      config.output.batch_version = options.batchVersion;
    }

    // Load references from input file
    console.log(chalk.gray(`📂 Loading references from: ${input}\n`));
    const outputGen = new OutputGenerator();
    const references = await outputGen.readFile(input);

    console.log(chalk.green(`✓ Loaded ${references.length} references\n`));

    // Dry run mode
    if (options.dryRun) {
      console.log(chalk.yellow('🔍 DRY RUN - No changes will be made\n'));
      console.log(chalk.gray('Configuration:'));
      console.log(chalk.gray(`  Input: ${input}`));
      console.log(chalk.gray(`  Output: ${config.output.path}`));
      console.log(chalk.gray(`  Format: ${config.output.format}`));
      console.log(chalk.gray(`  Auto-finalize: ${config.output.auto_finalize}`));
      console.log(chalk.gray(`  Batch version: ${config.output.batch_version}\n`));

      const unfinalized = references.filter((r) => !r.flags.finalized);
      console.log(chalk.gray(`References to process: ${unfinalized.length}`));
      if (unfinalized.length > 0) {
        console.log(chalk.gray('\nFirst 5:'));
        unfinalized.slice(0, 5).forEach((ref) => {
          console.log(chalk.gray(`  [${ref.id}] ${ref.parsed.title || 'Untitled'}`));
        });
      }
      return;
    }

    // Process batch
    const processor = new BatchProcessor(config);
    const result = await processor.processBatch(references);

    // Print result summary
    if (result.failed > 0) {
      console.log(chalk.yellow(`\n⚠️  Completed with ${result.failed} failures`));
      console.log(chalk.gray(`   Failed IDs: ${result.failed_ids.join(', ')}`));
    } else {
      console.log(chalk.green(`\n✅ All references processed successfully`));
    }
  } catch (error) {
    console.error(chalk.red('\n❌ Error:'), error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
