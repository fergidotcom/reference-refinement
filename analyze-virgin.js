#!/usr/bin/env node

import fs from 'fs/promises';

async function analyzeVirginity(filePath) {
  const content = await fs.readFile(filePath, 'utf-8');
  const lines = content.split('\n');

  const stats = {
    file: filePath.split('/').pop(),
    totalRefs: 0,
    hasFlags: 0,
    hasURLs: 0,
    hasQueries: 0,
    hasRelevance: 0,
    refIds: new Set(),
    virginRefs: [],
    contaminatedRefs: [],
    sampleVirginRef: null,
    sampleContaminatedRef: null
  };

  let currentRef = null;
  let currentLine = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Reference line: [ID] Author (YEAR). Title.
    const refMatch = line.match(/^\[(\d+)\]\s+(.+)/);
    if (refMatch) {
      const id = parseInt(refMatch[1]);
      const restOfLine = refMatch[2];

      stats.refIds.add(id);
      stats.totalRefs++;

      currentRef = {
        id,
        line: line.substring(0, 100),
        hasFlags: false,
        hasURLs: false,
        hasQueries: false,
        hasRelevance: false
      };

      // Check contamination on same line
      if (restOfLine.includes('FLAGS[')) {
        currentRef.hasFlags = true;
        stats.hasFlags++;
      }
      if (restOfLine.includes('PRIMARY_URL[') || restOfLine.includes('SECONDARY_URL[') || restOfLine.includes('Primary URL:')) {
        currentRef.hasURLs = true;
        stats.hasURLs++;
      }
      if (restOfLine.includes('Relevance:')) {
        currentRef.hasRelevance = true;
        stats.hasRelevance++;
      }

      // Determine virgin/contaminated
      if (!currentRef.hasFlags && !currentRef.hasURLs && !currentRef.hasQueries) {
        stats.virginRefs.push(id);
        if (!stats.sampleVirginRef) stats.sampleVirginRef = line;
      } else {
        stats.contaminatedRefs.push(id);
        if (!stats.sampleContaminatedRef) stats.sampleContaminatedRef = line;
      }
    }
  }

  // Check for missing IDs
  const sortedIds = Array.from(stats.refIds).sort((a, b) => a - b);
  const missingIds = [];
  if (sortedIds.length > 0) {
    const minId = sortedIds[0];
    const maxId = sortedIds[sortedIds.length - 1];
    for (let i = minId; i <= maxId; i++) {
      if (!stats.refIds.has(i)) {
        missingIds.push(i);
      }
    }
  }

  stats.missingIds = missingIds;
  stats.virginPercent = (stats.virginRefs.length / stats.totalRefs * 100).toFixed(1);
  stats.contaminatedPercent = (stats.contaminatedRefs.length / stats.totalRefs * 100).toFixed(1);

  return stats;
}

async function main() {
  const files = [
    'caught_in_the_act_CLEAN_intermediate.txt',
    'caught_in_the_act_decisions.txt',
    'decisions_backup_2025-10-29_19-46-07.txt',
    'decisions_backup_2025-10-29T04-31-47.txt',
    'decisions_backup_2025-10-28T23-11-43.txt',
    'decisions_backup_2025-10-29T03-14-45.txt'
  ];

  console.log('='.repeat(80));
  console.log('VIRGIN DECISIONS.TXT ANALYSIS');
  console.log('='.repeat(80));
  console.log('');

  const allStats = [];

  for (const file of files) {
    try {
      const stats = await analyzeVirginity(file);
      allStats.push(stats);
    } catch (error) {
      console.log(`❌ ${file}: Not found or error`);
    }
  }

  // Sort by virgin percentage
  allStats.sort((a, b) => parseFloat(b.virginPercent) - parseFloat(a.virginPercent));

  allStats.forEach((stats, index) => {
    console.log(`${index + 1}. ${stats.file}`);
    console.log(`   Total References: ${stats.totalRefs}`);
    console.log(`   Virgin (no FLAGS/URLs): ${stats.virginRefs.length} (${stats.virginPercent}%)`);
    console.log(`   Contaminated (has FLAGS/URLs): ${stats.contaminatedRefs.length} (${stats.contaminatedPercent}%)`);
    console.log(`   Has Relevance Text: ${stats.hasRelevance}`);

    if (stats.missingIds.length > 0) {
      const preview = stats.missingIds.slice(0, 20).join(', ');
      console.log(`   Missing IDs: ${preview}${stats.missingIds.length > 20 ? '...' : ''} (${stats.missingIds.length} total)`);
    } else {
      console.log(`   ✅ No missing IDs - complete sequence`);
    }

    if (stats.sampleVirginRef) {
      console.log(`   Sample Virgin: ${stats.sampleVirginRef.substring(0, 80)}...`);
    }
    if (stats.sampleContaminatedRef) {
      console.log(`   Sample Contaminated: ${stats.sampleContaminatedRef.substring(0, 80)}...`);
    }

    console.log('');
  });

  console.log('='.repeat(80));
  console.log('RECOMMENDATION FOR VIRGIN DECISIONS.TXT');
  console.log('='.repeat(80));

  const mostVirgin = allStats[0];
  console.log(`\nMost Virgin File: ${mostVirgin.file}`);
  console.log(`- ${mostVirgin.virginPercent}% virgin (${mostVirgin.virginRefs.length}/${mostVirgin.totalRefs} refs)`);
  console.log(`- ${mostVirgin.hasRelevance} refs have relevance text`);

  if (parseFloat(mostVirgin.virginPercent) === 100) {
    console.log(`\n✅ PERFECT VIRGIN FILE - Use this as your starting point!`);
  } else {
    console.log(`\n⚠️  Contains ${mostVirgin.contaminatedRefs.length} contaminated refs`);
    console.log(`   Contaminated IDs: ${mostVirgin.contaminatedRefs.slice(0, 20).join(', ')}${mostVirgin.contaminatedRefs.length > 20 ? '...' : ''}`);
  }
  console.log('');
}

main().catch(console.error);
