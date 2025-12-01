#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';

async function analyzeDecisionsFile(filePath) {
  const content = await fs.readFile(filePath, 'utf-8');
  const lines = content.split('\n');

  const stats = {
    file: path.basename(filePath),
    fullPath: filePath,
    size: (await fs.stat(filePath)).size,
    totalRefs: 0,
    finalized: 0,
    withPrimaryURL: 0,
    withSecondaryURL: 0,
    withTertiaryURL: 0,
    withQueries: 0,
    withRelevance: 0,
    parsingErrors: 0,
    refIds: new Set(),
    duplicateIds: [],
    missingIds: [],
    flags: {
      finalized: 0,
      manualReview: 0,
      other: []
    },
    isSingleLineFormat: false,
    isMultiLineFormat: false
  };

  let currentRef = null;
  let expectedId = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Reference line: [ID] Author (YEAR). Title.
    const refMatch = line.match(/^\[(\d+)\]\s+(.+)/);
    if (refMatch) {
      const id = parseInt(refMatch[1]);
      const restOfLine = refMatch[2];

      // Track duplicate IDs
      if (stats.refIds.has(id)) {
        stats.duplicateIds.push(id);
      }
      stats.refIds.add(id);

      stats.totalRefs++;

      // Check if this is single-line format (has FLAGS or URLs on same line)
      if (restOfLine.includes('FLAGS[') || restOfLine.includes('PRIMARY_URL[') || restOfLine.includes('Secondary URL:')) {
        stats.isSingleLineFormat = true;

        // Parse single-line format
        if (restOfLine.includes('FLAGS[FINALIZED]')) {
          stats.finalized++;
          stats.flags.finalized++;
        }
        if (restOfLine.includes('FLAGS[MANUAL_REVIEW]')) {
          stats.flags.manualReview++;
        }
        if (restOfLine.includes('PRIMARY_URL[')) {
          stats.withPrimaryURL++;
        }
        if (restOfLine.includes('SECONDARY_URL[')) {
          stats.withSecondaryURL++;
        }
        if (restOfLine.includes('TERTIARY_URL[')) {
          stats.withTertiaryURL++;
        }
        if (restOfLine.includes('Relevance:')) {
          stats.withRelevance++;
        }
      } else {
        // Multi-line format
        stats.isMultiLineFormat = true;
        currentRef = { id, hasFlags: false };
      }
      continue;
    }

    // Multi-line format handling (only if not single-line)
    if (stats.isMultiLineFormat && !stats.isSingleLineFormat) {
      // FLAGS line
      if (line.startsWith('FLAGS[')) {
        const flagMatch = line.match(/FLAGS\[([^\]]+)\]/);
        if (flagMatch) {
          const flag = flagMatch[1];
          if (flag === 'FINALIZED') {
            stats.finalized++;
            stats.flags.finalized++;
          } else if (flag === 'MANUAL_REVIEW') {
            stats.flags.manualReview++;
          } else {
            stats.flags.other.push(flag);
          }
          if (currentRef) currentRef.hasFlags = true;
        }
        continue;
      }

      // [FINALIZED] (legacy format)
      if (line === '[FINALIZED]' && currentRef && !currentRef.hasFlags) {
        stats.finalized++;
        stats.flags.finalized++;
        continue;
      }

      // URLs
      if (line.startsWith('Primary URL:')) stats.withPrimaryURL++;
      if (line.startsWith('Secondary URL:')) stats.withSecondaryURL++;
      if (line.startsWith('Tertiary URL:')) stats.withTertiaryURL++;
      if (line.startsWith('Q:')) stats.withQueries++;
      if (line.startsWith('Relevance:')) stats.withRelevance++;
    }
  }

  // Check for missing IDs (gaps in sequence)
  const sortedIds = Array.from(stats.refIds).sort((a, b) => a - b);
  if (sortedIds.length > 0) {
    const minId = sortedIds[0];
    const maxId = sortedIds[sortedIds.length - 1];
    for (let i = minId; i <= maxId; i++) {
      if (!stats.refIds.has(i)) {
        stats.missingIds.push(i);
      }
    }
  }

  // Calculate percentages
  stats.percentFinalized = stats.totalRefs > 0 ? (stats.finalized / stats.totalRefs * 100).toFixed(1) : 0;
  stats.percentPrimaryURL = stats.totalRefs > 0 ? (stats.withPrimaryURL / stats.totalRefs * 100).toFixed(1) : 0;
  stats.percentSecondaryURL = stats.totalRefs > 0 ? (stats.withSecondaryURL / stats.totalRefs * 100).toFixed(1) : 0;

  return stats;
}

async function main() {
  const files = [
    '/Users/joeferguson/Library/CloudStorage/Dropbox/Fergi/AI Wrangling/References/caught_in_the_act_decisions.txt',
    '/Users/joeferguson/Library/CloudStorage/Dropbox/Fergi/AI Wrangling/References/decisions_backup_2025-10-28T23-11-43.txt',
    '/Users/joeferguson/Library/CloudStorage/Dropbox/Fergi/AI Wrangling/References/decisions_backup_2025-10-29T03-14-45.txt',
    '/Users/joeferguson/Library/CloudStorage/Dropbox/Fergi/AI Wrangling/References/decisions_backup_2025-10-29T04-31-47.txt',
    '/Users/joeferguson/Library/CloudStorage/Dropbox/Fergi/AI Wrangling/References/decisions_backup_2025-10-29_19-46-07.txt',
    '/Users/joeferguson/Library/CloudStorage/Dropbox/Apps/Reference Refinement/decisions.txt',
    '/Users/joeferguson/Library/CloudStorage/Dropbox/Apps/Reference Refinement/decisions_backup_2025-10-29_19-48-30.txt',
    '/Users/joeferguson/Library/CloudStorage/Dropbox/Apps/Reference Refinement/corrupted decision.txt'
  ];

  const allStats = [];

  for (const file of files) {
    try {
      const stats = await analyzeDecisionsFile(file);
      allStats.push(stats);
    } catch (error) {
      console.error(`Error analyzing ${file}: ${error.message}`);
    }
  }

  // Sort by quality score (finalized % + primary URL %)
  allStats.sort((a, b) => {
    const scoreA = parseFloat(a.percentFinalized) + parseFloat(a.percentPrimaryURL);
    const scoreB = parseFloat(b.percentFinalized) + parseFloat(b.percentPrimaryURL);
    return scoreB - scoreA;
  });

  console.log('='.repeat(80));
  console.log('DECISIONS.TXT FILE ANALYSIS - RANKED BY QUALITY');
  console.log('='.repeat(80));
  console.log('');

  allStats.forEach((stats, index) => {
    const qualityScore = parseFloat(stats.percentFinalized) + parseFloat(stats.percentPrimaryURL);
    console.log(`${index + 1}. ${stats.file}`);
    console.log(`   Path: ${stats.fullPath}`);
    console.log(`   Size: ${(stats.size / 1024).toFixed(1)} KB`);
    console.log(`   References: ${stats.totalRefs}`);
    console.log(`   Finalized: ${stats.finalized} (${stats.percentFinalized}%)`);
    console.log(`   Primary URLs: ${stats.withPrimaryURL} (${stats.percentPrimaryURL}%)`);
    console.log(`   Secondary URLs: ${stats.withSecondaryURL} (${stats.percentSecondaryURL}%)`);
    console.log(`   Tertiary URLs: ${stats.withTertiaryURL}`);
    console.log(`   With Queries: ${stats.withQueries}`);
    console.log(`   With Relevance: ${stats.withRelevance}`);
    console.log(`   Quality Score: ${qualityScore.toFixed(1)}/200`);

    if (stats.duplicateIds.length > 0) {
      console.log(`   ⚠️  DUPLICATE IDs: ${stats.duplicateIds.join(', ')}`);
    }
    if (stats.missingIds.length > 0) {
      console.log(`   ⚠️  MISSING IDs: ${stats.missingIds.slice(0, 10).join(', ')}${stats.missingIds.length > 10 ? '...' : ''}`);
    }
    if (stats.flags.manualReview > 0) {
      console.log(`   🔍 MANUAL_REVIEW flags: ${stats.flags.manualReview}`);
    }

    console.log('');
  });

  console.log('='.repeat(80));
  console.log('RECOMMENDATION');
  console.log('='.repeat(80));
  const best = allStats[0];
  console.log(`\nCleanest file: ${best.file}`);
  console.log(`Location: ${best.fullPath}`);
  console.log(`\nReasons:`);
  console.log(`- ${best.percentFinalized}% finalized (${best.finalized}/${best.totalRefs})`);
  console.log(`- ${best.percentPrimaryURL}% have primary URLs (${best.withPrimaryURL}/${best.totalRefs})`);
  console.log(`- ${best.percentSecondaryURL}% have secondary URLs (${best.withSecondaryURL}/${best.totalRefs})`);
  if (best.duplicateIds.length === 0) {
    console.log(`- No duplicate reference IDs`);
  }
  console.log('');
}

main().catch(console.error);
