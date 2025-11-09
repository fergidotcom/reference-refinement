/**
 * Reference Refinement v2 - Validate Command
 *
 * Validates configuration file
 */

import chalk from 'chalk';
import { existsSync } from 'fs';
import { loadConfig } from '../../lib/pipeline/index.js';

export async function validateCommand(configPath: string): Promise<void> {
  console.log(chalk.bold.blue('\n🔍 Configuration Validation'));
  console.log(chalk.gray('━'.repeat(60)) + '\n');

  try {
    if (!existsSync(configPath)) {
      throw new Error(`Configuration file not found: ${configPath}`);
    }

    console.log(chalk.gray(`📋 Validating: ${configPath}\n`));

    const config = await loadConfig(configPath);

    console.log(chalk.green('✓ Configuration is valid\n'));

    // Print summary
    console.log(chalk.white('Configuration Summary:'));
    console.log(chalk.gray('  API Keys:'));
    console.log(chalk.gray(`    Google API Key: ${config.google_api_key ? '✓ Set' : '✗ Missing'}`));
    console.log(chalk.gray(`    Google CSE ID: ${config.google_cse_id ? '✓ Set' : '✗ Missing'}`));
    console.log(chalk.gray(`    Anthropic API Key: ${config.anthropic_api_key ? '✓ Set' : '✗ Missing'}`));

    console.log(chalk.gray('\n  Search:'));
    console.log(chalk.gray(`    Queries per reference: ${config.search.queries_per_reference}`));
    console.log(chalk.gray(`    Primary queries: ${config.search.primary_queries}`));
    console.log(chalk.gray(`    Secondary queries: ${config.search.secondary_queries}`));

    console.log(chalk.gray('\n  Refinement:'));
    console.log(chalk.gray(`    Validate top N: ${config.refinement.validate_top_n}`));
    console.log(chalk.gray(`    Primary threshold: ${config.refinement.primary_threshold}`));
    console.log(chalk.gray(`    Secondary threshold: ${config.refinement.secondary_threshold}`));
    console.log(chalk.gray(`    Enhanced soft-404: ${config.refinement.enhanced_soft_404}`));

    console.log(chalk.gray('\n  Output:'));
    console.log(chalk.gray(`    Format: ${config.output.format}`));
    console.log(chalk.gray(`    Path: ${config.output.path}`));
    console.log(chalk.gray(`    Auto-finalize: ${config.output.auto_finalize}`));
    console.log(chalk.gray(`    Batch version: ${config.output.batch_version}\n`));

    process.exit(0);
  } catch (error) {
    console.error(chalk.red('✗ Validation failed\n'));
    console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
