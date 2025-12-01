#!/usr/bin/env node

/**
 * Scan decisions.txt for title parsing errors
 * Identifies references with:
 * 1. Date prefixes (e.g., "November 10) Title...")
 * 2. Trailing ellipsis (e.g., "Title.................")
 */

import fs from 'fs/promises';
import path from 'path';

const DECISIONS_FILE = 'decisions.txt';

// Regex patterns for title errors
const DATE_PREFIX_PATTERN = /^(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:,?\s+\d{4})?\)\s+/i;
const TRAILING_DOTS_PATTERN = /\.{3,}$/;

async function scanTitleErrors() {
  console.log('📋 Scanning decisions.txt for title parsing errors...\n');

  // Read decisions.txt
  const content = await fs.readFile(DECISIONS_FILE, 'utf-8');
  const lines = content.split('\n');

  const errors = [];
  let currentRef = null;
  let refLine = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Match reference line: [123] Author (Year). Title...
    const refMatch = line.match(/^\[(\d+)\]\s+(.+)$/);
    if (refMatch) {
      const id = refMatch[1];
      refLine = refMatch[2];

      // Extract title portion (after year, before relevance/flags)
      // Pattern: Author (Year). Title. Publisher. Relevance:...
      const titleMatch = refLine.match(/\((\d{4})\)\.\s+([^\.]+(?:\.[^\.]+)*?)(?:\.\s+Relevance:|$)/);

      if (titleMatch) {
        const year = titleMatch[1];
        const titlePart = titleMatch[2].trim();

        // Check for date prefix
        const hasDatePrefix = DATE_PREFIX_PATTERN.test(titlePart);

        // Check for trailing dots
        const hasTrailingDots = TRAILING_DOTS_PATTERN.test(titlePart);

        if (hasDatePrefix || hasTrailingDots) {
          let cleanedTitle = titlePart;

          // Clean date prefix
          if (hasDatePrefix) {
            cleanedTitle = cleanedTitle.replace(DATE_PREFIX_PATTERN, '');
          }

          // Clean trailing dots
          if (hasTrailingDots) {
            cleanedTitle = cleanedTitle.replace(TRAILING_DOTS_PATTERN, '');
          }

          // Clean trailing publisher info (heuristic: after last period before dots)
          const lastPeriodMatch = cleanedTitle.match(/^(.+?)\.([^\.]*?)$/);
          if (lastPeriodMatch) {
            const potentialTitle = lastPeriodMatch[1].trim();
            const potentialPublisher = lastPeriodMatch[2].trim();

            // If the part after the last period looks like a publisher (short, capitalized)
            if (potentialPublisher.length < 50 && /^[A-Z]/.test(potentialPublisher)) {
              cleanedTitle = potentialTitle;
            }
          }

          cleanedTitle = cleanedTitle.trim();

          errors.push({
            id: parseInt(id),
            line: i + 1,
            original: titlePart,
            cleaned: cleanedTitle,
            hasDatePrefix,
            hasTrailingDots,
            fullLine: refLine.substring(0, 150) + (refLine.length > 150 ? '...' : '')
          });
        }
      }
    }
  }

  // Report findings
  console.log(`Found ${errors.length} references with title parsing errors:\n`);

  if (errors.length === 0) {
    console.log('✅ No title parsing errors found!');
    return errors;
  }

  // Group by error type
  const dateErrors = errors.filter(e => e.hasDatePrefix);
  const dotErrors = errors.filter(e => e.hasTrailingDots && !e.hasDatePrefix);
  const bothErrors = errors.filter(e => e.hasDatePrefix && e.hasTrailingDots);

  console.log(`📊 Error Summary:`);
  console.log(`   Date prefix errors: ${dateErrors.length + bothErrors.length}`);
  console.log(`   Trailing dot errors: ${dotErrors.length + bothErrors.length}`);
  console.log(`   Both errors: ${bothErrors.length}\n`);

  console.log(`📝 Detailed Results:\n`);
  console.log('─'.repeat(80));

  for (const error of errors) {
    console.log(`\n[${error.id}] Line ${error.line}`);

    if (error.hasDatePrefix) {
      console.log(`  ❌ Date Prefix: YES`);
    }
    if (error.hasTrailingDots) {
      console.log(`  ❌ Trailing Dots: YES`);
    }

    console.log(`\n  Original: ${error.original}`);
    console.log(`  Cleaned:  ${error.cleaned}`);
    console.log('\n' + '─'.repeat(80));
  }

  console.log(`\n✅ Scan complete. Found ${errors.length} references needing repair.`);

  // Save detailed report
  const reportPath = 'title-error-report.json';
  await fs.writeFile(reportPath, JSON.stringify(errors, null, 2));
  console.log(`\n📄 Detailed report saved to: ${reportPath}`);

  return errors;
}

// Run scan
scanTitleErrors().catch(err => {
  console.error('Error scanning titles:', err);
  process.exit(1);
});
