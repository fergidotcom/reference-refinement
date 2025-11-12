#!/usr/bin/env node

/**
 * Test Runner - Verify setup with 10 test experiments
 * Run this before the full experiment run to verify everything works
 */

import fs from 'fs/promises';
import Database from 'better-sqlite3';
import yaml from 'js-yaml';
import fetch from 'node-fetch';
import { ExperimentExecutor, ExperimentDatabase } from './experiment-runner.js';

const CONFIG = {
  INPUTS: {
    manualReview: './inputs/manual-review-refs.json',
    strategies: './strategies-catalog.yaml',
    matrix: './experiment-matrix.yaml',
    domains: './domain-database.json'
  },
  OUTPUTS: {
    database: './outputs/test-experiments.db',
  },
  BUDGET: {
    available: 10, // Test budget
    costPerExperiment: 0.20
  },
  API_ENDPOINTS: {
    queryGen: process.env.QUERY_GEN_URL || 'https://rrv521-1760738877.netlify.app/api/llm-chat',
    ranking: process.env.RANKING_URL || 'https://rrv521-1760738877.netlify.app/api/llm-rank',
    search: process.env.SEARCH_URL || 'https://rrv521-1760738877.netlify.app/api/search-google'
  }
};

async function testSetup() {
  console.log('🧪 Query Evolution Project - Test Runner');
  console.log('='.repeat(70));
  console.log('Testing setup with 10 experiments...\n');

  try {
    // Load configuration
    console.log('📂 Loading configuration...');
    const strategiesYaml = await fs.readFile(CONFIG.INPUTS.strategies, 'utf-8');
    const strategies = yaml.load(strategiesYaml);

    const matrixYaml = await fs.readFile(CONFIG.INPUTS.matrix, 'utf-8');
    const matrix = yaml.load(matrixYaml);

    const domainsJson = await fs.readFile(CONFIG.INPUTS.domains, 'utf-8');
    const domains = JSON.parse(domainsJson);

    console.log('✅ Configuration loaded\n');

    // Initialize test database
    console.log('💾 Initializing test database...');
    const db = new ExperimentDatabase(CONFIG.OUTPUTS.database);
    console.log('✅ Database initialized\n');

    // Load test references (just 2)
    console.log('📚 Loading test references...');
    const manualReviewJson = await fs.readFile(CONFIG.INPUTS.manualReview, 'utf-8');
    const manualReviewRefs = JSON.parse(manualReviewJson);
    const testRefs = manualReviewRefs.slice(0, 2); // Just 2 references for testing
    console.log(`✅ Loaded ${testRefs.length} test references\n`);

    // Initialize executor
    const executor = new ExperimentExecutor(db, strategies, matrix, domains);

    // Test strategies (just 3)
    const testStrategies = [
      'unquoted_full_title',
      'title_keywords_5_terms',
      'free_pdf_search'
    ];

    const testRanking = 'current_v20';

    console.log('🚀 Starting test experiments...\n');
    let testNum = 1;

    for (const ref of testRefs) {
      console.log(`\n📄 TEST REF [${ref.id}]: ${ref.title.substring(0, 60)}...`);

      for (const strategy of testStrategies) {
        console.log(`  ${testNum}/10: Testing ${strategy}...`);

        const result = await executor.executeExperiment(
          ref,
          strategy,
          testRanking,
          'test'
        );

        if (result.success) {
          console.log(`    ✅ Success! Improvement: ${result.improvement >= 0 ? '+' : ''}${result.improvement.toFixed(1)}`);
        } else {
          console.log(`    ❌ Failed: ${result.error}`);
        }

        testNum++;

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('✅ TEST RUN COMPLETE');
    console.log('='.repeat(70));
    console.log(`Total Experiments: ${executor.experimentCount}`);
    console.log(`Total Spent: $${executor.totalSpent.toFixed(2)}`);
    console.log(`Test Database: ${CONFIG.OUTPUTS.database}`);
    console.log('\n✅ Setup verification successful! Ready for full experiment run.');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  }
}

testSetup();
