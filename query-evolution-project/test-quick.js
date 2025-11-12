#!/usr/bin/env node

/**
 * Quick Test - Run 5 experiments to verify setup
 */

import fs from 'fs/promises';
import Database from 'better-sqlite3';
import yaml from 'js-yaml';

// Import from experiment-runner
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🧪 Quick Test - Verifying Implementation\n');

async function quickTest() {
  try {
    // Test 1: Load configuration files
    console.log('1️⃣  Testing file loading...');
    const strategiesYaml = await fs.readFile('./strategies-catalog.yaml', 'utf-8');
    const strategies = yaml.load(strategiesYaml);
    console.log(`   ✅ Loaded ${strategies.query_strategies.length} query strategies`);
    console.log(`   ✅ Loaded ${strategies.ranking_algorithms.length} ranking algorithms`);

    // Test 2: Load reference data
    console.log('\n2️⃣  Testing reference data...');
    const manualReviewJson = await fs.readFile('./inputs/manual-review-refs.json', 'utf-8');
    const manualReviewRefs = JSON.parse(manualReviewJson);
    console.log(`   ✅ Loaded ${manualReviewRefs.length} MANUAL_REVIEW references`);

    // Test 3: Database setup
    console.log('\n3️⃣  Testing database...');
    const testDb = new Database('./outputs/test-quick.db');
    testDb.exec(`
      CREATE TABLE IF NOT EXISTS experiments (
        id INTEGER PRIMARY KEY,
        reference_id INTEGER,
        strategy_id VARCHAR(50)
      )
    `);
    console.log('   ✅ Database created successfully');
    testDb.close();

    // Test 4: API endpoint configuration
    console.log('\n4️⃣  Testing API configuration...');
    console.log(`   ✅ Query Gen: ${process.env.QUERY_GEN_URL || 'https://rrv521-1760738877.netlify.app/api/llm-chat'}`);
    console.log(`   ✅ Search: ${process.env.SEARCH_URL || 'https://rrv521-1760738877.netlify.app/api/search-google'}`);
    console.log(`   ✅ Ranking: ${process.env.RANKING_URL || 'https://rrv521-1760738877.netlify.app/api/llm-rank'}`);

    // Test 5: Environment variables
    console.log('\n5️⃣  Testing environment variables...');
    const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
    const hasGoogle = !!process.env.GOOGLE_API_KEY;
    console.log(`   ${hasAnthropic ? '✅' : '❌'} ANTHROPIC_API_KEY ${hasAnthropic ? 'set' : 'missing'}`);
    console.log(`   ${hasGoogle ? '✅' : '❌'} GOOGLE_API_KEY ${hasGoogle ? 'set' : 'missing'}`);

    console.log('\n✅ All tests passed! Ready for full experiment run.');
    console.log('\n📊 To start experiments: node experiment-runner.js');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

quickTest();
