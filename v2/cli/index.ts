#!/usr/bin/env node
/**
 * Reference Refinement v2 - CLI
 *
 * Command-line interface for the reference refinement system
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { processCommand } from './commands/process.js';
import { validateCommand } from './commands/validate.js';
import { statsCommand } from './commands/stats.js';
import { resumeCommand } from './commands/resume.js';

const program = new Command();

program
  .name('refine')
  .description('Reference Refinement v2 - AI-powered academic reference processing')
  .version('2.0.0');

// Process command
program
  .command('process')
  .description('Process a manuscript and refine references')
  .argument('<input>', 'Input file (decisions.txt, manuscript.txt, etc.)')
  .option('-c, --config <file>', 'Configuration file (YAML)', 'config.yaml')
  .option('-o, --output <file>', 'Output file path')
  .option('-f, --format <format>', 'Output format (decisions|final|json|markdown)', 'decisions')
  .option('--auto-finalize', 'Auto-finalize high-confidence references')
  .option('--batch-version <version>', 'Batch version tag', 'v2.0')
  .option('--dry-run', 'Preview without making changes')
  .action(processCommand);

// Validate command
program
  .command('validate')
  .description('Validate configuration file')
  .argument('[config]', 'Configuration file to validate', 'config.yaml')
  .action(validateCommand);

// Stats command
program
  .command('stats')
  .description('Show statistics for a references file')
  .argument('<file>', 'References file (decisions.txt, JSON, etc.)')
  .option('-f, --format <format>', 'Input format (decisions|json)', 'decisions')
  .option('--detailed', 'Show detailed statistics')
  .action(statsCommand);

// Resume command
program
  .command('resume')
  .description('Resume interrupted batch processing')
  .option('-c, --config <file>', 'Configuration file (YAML)', 'config.yaml')
  .option('-p, --progress <file>', 'Progress file', 'batch-progress.json')
  .action(resumeCommand);

// Error handling
program.exitOverride();

try {
  program.parse(process.argv);
} catch (error) {
  if (error instanceof Error && 'code' in error && error.code === 'commander.help') {
    process.exit(0);
  } else if (error instanceof Error && 'code' in error && error.code === 'commander.version') {
    process.exit(0);
  } else {
    console.error(chalk.red('\n❌ Error:'), error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
