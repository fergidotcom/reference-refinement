#!/usr/bin/env node

/**
 * Extract References from decisions.txt
 *
 * Parses decisions.txt and extracts references based on filters:
 * - MANUAL_REVIEW flags
 * - Low scoring references
 * - Random validation set
 * - Edge cases
 */

import fs from 'fs/promises';
import path from 'path';

class ReferenceExtractor {
  constructor(decisionsPath) {
    this.decisionsPath = decisionsPath;
    this.references = [];
  }

  async loadDecisions() {
    console.log('📖 Loading decisions.txt...');
    const content = await fs.readFile(this.decisionsPath, 'utf-8');

    // Parse references from decisions.txt
    const refBlocks = content.split(/\n(?=\[\d+\])/);

    for (const block of refBlocks) {
      if (!block.trim()) continue;

      const ref = this.parseReference(block);
      if (ref) {
        this.references.push(ref);
      }
    }

    console.log(`✅ Loaded ${this.references.length} references`);
  }

  parseReference(block) {
    const lines = block.split('\n');

    // Extract reference ID and citation
    const firstLine = lines[0];
    const idMatch = firstLine.match(/\[(\d+)\]/);
    if (!idMatch) return null;

    const id = parseInt(idMatch[1]);
    const citation = firstLine.replace(/\[\d+\]\s*/, '').trim();

    // Extract flags - Format: FLAGS[MANUAL_REVIEW BATCH_v20.0]
    const flagsMatch = block.match(/FLAGS\[([^\]]+)\]/);
    const flags = flagsMatch ? flagsMatch[1].split(/\s+/).filter(f => f) : [];

    // Extract finalized status
    const isFinalized = flags.includes('FINALIZED') || block.includes('[FINALIZED]');

    // Extract URLs - Format: PRIMARY_URL[https://...]
    const primaryMatch = block.match(/PRIMARY_URL\[([^\]]+)\]/);
    const secondaryMatch = block.match(/SECONDARY_URL\[([^\]]+)\]/);
    const tertiaryMatch = block.match(/TERTIARY_URL\[([^\]]+)\]/);

    const primaryUrl = primaryMatch ? primaryMatch[1].trim() : null;
    const secondaryUrl = secondaryMatch ? secondaryMatch[1].trim() : null;
    const tertiaryUrl = tertiaryMatch ? tertiaryMatch[1].trim() : null;

    // Extract scores (if present)
    const primaryScoreMatch = block.match(/P:(\d+)/);
    const secondaryScoreMatch = block.match(/S:(\d+)/);

    const primaryScore = primaryScoreMatch ? parseInt(primaryScoreMatch[1]) : null;
    const secondaryScore = secondaryScoreMatch ? parseInt(secondaryScoreMatch[1]) : null;

    // Extract relevance text
    const relevanceMatch = block.match(/Relevance:\s*([^\n]+(?:\n(?!Primary|Secondary|Tertiary|Q:|FLAGS:|\[)[^\n]+)*)/);
    const relevanceText = relevanceMatch ? relevanceMatch[1].trim() : null;

    // Extract queries
    const queries = [];
    const queryMatches = block.matchAll(/Q:\s*([^\n]+)/g);
    for (const match of queryMatches) {
      queries.push(match[1].trim());
    }

    // Extract author, year, title from citation
    const authorMatch = citation.match(/^([^(]+?)\s*\(/);
    const yearMatch = citation.match(/\((\d{4}[a-z]?)\)/);
    const titleMatch = citation.match(/\)\.\s*(.+?)(?:\.|$)/);

    const author = authorMatch ? authorMatch[1].trim() : null;
    const year = yearMatch ? yearMatch[1] : null;
    const title = titleMatch ? titleMatch[1].trim() : citation;

    return {
      id,
      citation,
      author,
      year,
      title,
      flags,
      isFinalized,
      primaryUrl,
      secondaryUrl,
      tertiaryUrl,
      primaryScore,
      secondaryScore,
      relevanceText,
      queries,
      titleLength: title ? title.length : 0,
      hasManualReview: flags.includes('MANUAL_REVIEW'),
      rawBlock: block
    };
  }

  filterManualReview() {
    return this.references.filter(ref => ref.hasManualReview);
  }

  filterLowScoring() {
    return this.references.filter(ref =>
      (ref.primaryScore !== null && ref.primaryScore < 75) ||
      (ref.secondaryScore !== null && ref.secondaryScore < 70)
    );
  }

  filterValidation(count = 30) {
    // Random selection of high-scoring references
    const highScoring = this.references.filter(ref =>
      ref.primaryScore >= 75 && ref.secondaryScore >= 70
    );

    // Shuffle and take first N
    const shuffled = highScoring.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }

  filterEdgeCases() {
    return this.references.filter(ref =>
      ref.titleLength > 80 ||
      (ref.author && ref.author.split(',').length > 3) ||
      !ref.title.match(/^[A-Za-z0-9\s.,;:!?'"()-]+$/) // Contains non-English chars
    );
  }

  async exportManualReview() {
    console.log('\n📊 Extracting MANUAL_REVIEW references...');
    const refs = this.filterManualReview();
    console.log(`Found ${refs.length} MANUAL_REVIEW references`);

    const outputPath = path.join(path.dirname(this.decisionsPath), 'manual-review-refs.json');
    await fs.writeFile(outputPath, JSON.stringify(refs, null, 2));
    console.log(`✅ Saved to ${outputPath}`);

    return refs;
  }

  async exportBaseline() {
    console.log('\n📊 Creating v20.1 baseline snapshot...');

    const baseline = {
      timestamp: new Date().toISOString(),
      version: 'v20.1',
      totalReferences: this.references.length,
      finalizedCount: this.references.filter(r => r.isFinalized).length,
      manualReviewCount: this.references.filter(r => r.hasManualReview).length,
      references: this.references.map(ref => ({
        id: ref.id,
        citation: ref.citation,
        flags: ref.flags,
        primaryUrl: ref.primaryUrl,
        secondaryUrl: ref.secondaryUrl,
        primaryScore: ref.primaryScore,
        secondaryScore: ref.secondaryScore,
        isFinalized: ref.isFinalized
      }))
    };

    const outputPath = path.join(path.dirname(this.decisionsPath), 'v20.1-baseline.json');
    await fs.writeFile(outputPath, JSON.stringify(baseline, null, 2));
    console.log(`✅ Saved baseline with ${baseline.totalReferences} references`);

    return baseline;
  }

  async exportAllSets() {
    console.log('\n📊 Extracting all reference sets...');

    const sets = {
      manualReview: this.filterManualReview(),
      lowScoring: this.filterLowScoring(),
      validation: this.filterValidation(30),
      edgeCases: this.filterEdgeCases()
    };

    console.log('\nReference Set Counts:');
    console.log(`  MANUAL_REVIEW: ${sets.manualReview.length}`);
    console.log(`  Low Scoring: ${sets.lowScoring.length}`);
    console.log(`  Validation: ${sets.validation.length}`);
    console.log(`  Edge Cases: ${sets.edgeCases.length}`);

    const outputPath = path.join(path.dirname(this.decisionsPath), 'all-reference-sets.json');
    await fs.writeFile(outputPath, JSON.stringify(sets, null, 2));
    console.log(`\n✅ Saved all sets to ${outputPath}`);

    return sets;
  }
}

// Main execution
async function main() {
  const decisionsPath = process.argv[2] || './inputs/decisions.txt';

  console.log('🔬 Reference Extractor - Query Evolution Project');
  console.log('='.repeat(60));

  const extractor = new ReferenceExtractor(decisionsPath);
  await extractor.loadDecisions();

  // Export all data sets
  await extractor.exportManualReview();
  await extractor.exportBaseline();
  await extractor.exportAllSets();

  console.log('\n✅ Reference extraction complete!');
}

main().catch(console.error);
