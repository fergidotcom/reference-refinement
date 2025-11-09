/**
 * Reference Refinement v2 - Stats Command
 *
 * Shows statistics for a references file
 */

import chalk from 'chalk';
import { existsSync } from 'fs';
import { OutputGenerator } from '../../lib/output-generator/index.js';

interface StatsOptions {
  format: string;
  detailed?: boolean;
}

export async function statsCommand(filepath: string, options: StatsOptions): Promise<void> {
  console.log(chalk.bold.blue('\n📊 Reference Statistics'));
  console.log(chalk.gray('━'.repeat(60)) + '\n');

  try {
    if (!existsSync(filepath)) {
      throw new Error(`File not found: ${filepath}`);
    }

    console.log(chalk.gray(`📂 Loading: ${filepath}\n`));

    const outputGen = new OutputGenerator();
    const references = await outputGen.readFile(filepath, options.format as any);

    const stats = outputGen.getStatistics(references);

    // Basic statistics
    console.log(chalk.white('Overview:'));
    console.log(chalk.gray(`  Total references: ${stats.total}`));
    console.log(
      chalk.gray(`  Finalized: ${stats.finalized} (${(stats.finalized / stats.total * 100).toFixed(1)}%)`)
    );
    console.log(
      chalk.gray(`  Unfinalized: ${stats.unfinalized} (${(stats.unfinalized / stats.total * 100).toFixed(1)}%)`)
    );
    console.log(chalk.gray(`  Manual review needed: ${stats.needs_review}`));

    console.log(chalk.white('\nURL Coverage:'));
    console.log(
      chalk.gray(`  Primary URLs: ${stats.with_primary} (${(stats.primary_coverage * 100).toFixed(1)}%)`)
    );
    console.log(
      chalk.gray(`  Secondary URLs: ${stats.with_secondary} (${(stats.secondary_coverage * 100).toFixed(1)}%)`)
    );

    // Detailed statistics
    if (options.detailed) {
      console.log(chalk.white('\nDetailed Breakdown:'));

      const batchVersions = [...new Set(references.map((r) => r.flags.batch_version).filter(Boolean))];
      if (batchVersions.length > 0) {
        console.log(chalk.gray(`  Batch versions: ${batchVersions.join(', ')}`));
      }

      // Coverage by finalization status
      const finalizedWithPrimary = references.filter((r) => r.flags.finalized && r.urls.primary).length;
      const finalizedWithSecondary = references.filter((r) => r.flags.finalized && r.urls.secondary).length;

      console.log(chalk.white('\nFinalized References:'));
      console.log(
        chalk.gray(`  With primary: ${finalizedWithPrimary} (${(finalizedWithPrimary / stats.finalized * 100).toFixed(1)}%)`)
      );
      console.log(
        chalk.gray(`  With secondary: ${finalizedWithSecondary} (${(finalizedWithSecondary / stats.finalized * 100).toFixed(1)}%)`)
      );

      // Unfinalized breakdown
      const unfinalizedRefs = references.filter((r) => !r.flags.finalized);
      const unfinalizedWithPrimary = unfinalizedRefs.filter((r) => r.urls.primary).length;
      const unfinalizedWithSecondary = unfinalizedRefs.filter((r) => r.urls.secondary).length;

      if (stats.unfinalized > 0) {
        console.log(chalk.white('\nUnfinalized References:'));
        console.log(
          chalk.gray(`  With primary: ${unfinalizedWithPrimary} (${(unfinalizedWithPrimary / stats.unfinalized * 100).toFixed(1)}%)`)
        );
        console.log(
          chalk.gray(`  With secondary: ${unfinalizedWithSecondary} (${(unfinalizedWithSecondary / stats.unfinalized * 100).toFixed(1)}%)`)
        );
      }
    }

    console.log('');
    process.exit(0);
  } catch (error) {
    console.error(chalk.red('\n❌ Error:'), error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
