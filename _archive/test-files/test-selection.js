#!/usr/bin/env node
/**
 * Test Selection Logic - Verify batch processor selects correct refs
 */

import fs from 'fs/promises';
import { parse as parseYaml } from 'yaml';
import { parseDecisionsFile, filterReferences } from './batch-utils.js';

async function test() {
    console.log('Testing batch processor selection logic...\n');

    // Load config
    const configPath = 'batch-config-v20-full-139.yaml';
    const configYaml = await fs.readFile(configPath, 'utf-8');
    const config = parseYaml(configYaml).batch_processor;

    console.log('Config loaded:');
    console.log(`  Input file: ${config.input_file}`);
    console.log(`  Selection mode: ${config.selection_mode}`);
    console.log(`  Criteria: ${JSON.stringify(config.criteria)}`);
    console.log('');

    // Load references
    const decisionsContent = await fs.readFile(config.input_file, 'utf-8');
    const allRefs = parseDecisionsFile(decisionsContent);

    console.log(`Loaded ${allRefs.length} total references\n`);

    // Count finalized
    const finalized = allRefs.filter(r => r.finalized).length;
    const unfinalized = allRefs.length - finalized;

    console.log(`  Finalized: ${finalized}`);
    console.log(`  Unfinalized: ${unfinalized}\n`);

    // Test filtering
    const selected = filterReferences(allRefs, config);

    console.log(`\n✅ SELECTION RESULT:`);
    console.log(`  Selected ${selected.length} references\n`);

    if (selected.length === 139) {
        console.log('✅ SUCCESS: Correctly selected 139 unfinalized references!');
    } else {
        console.log(`❌ ERROR: Expected 139, got ${selected.length}`);
        console.log('\nFirst 5 selected refs:');
        selected.slice(0, 5).forEach(r => {
            console.log(`  [${r.id}] ${r.title?.slice(0, 50)}... finalized=${r.finalized}`);
        });
    }
}

test().catch(console.error);
