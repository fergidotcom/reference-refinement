#!/usr/bin/env node

/**
 * Restore processed references from batch log file to production YAML
 */

import fs from 'fs';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';

const LOG_FILE = './batch-logs/batch_2025-11-20T20-15-22.log';
const PRODUCTION_FILE = '/Users/joeferguson/Library/CloudStorage/Dropbox/Apps/Reference Refinement/CaughtInTheActDecisions.txt';

console.log('📋 Extracting processed references from log file...\n');

// Read and parse log file
const logContent = fs.readFileSync(LOG_FILE, 'utf-8');
// Split by double separator (section boundaries)
const sectionPattern = /={80}\n\[(\d+)\][^\n]*\n={80}\n([\s\S]*?)(?=\n={80}|$)/g;

const processedRefs = [];
let match;

while ((match = sectionPattern.exec(logContent)) !== null) {
    const refId = match[1];
    const section = match[2];

    // Extract URLs (handle multi-line format)
    const primaryMatch = section.match(/PRIMARY \(Score: (\d+)\):\s+URL: (https?:\/\/[^\s]+)/s);
    const secondaryMatch = section.match(/SECONDARY \(Score: (\d+)\):\s+URL: (https?:\/\/[^\s]+)/s);
    const noPrimaryMatch = section.match(/PRIMARY: None found/);
    const noSecondaryMatch = section.match(/SECONDARY: None found/);

    const result = {
        id: refId,
        primary: null,
        primaryScore: null,
        secondary: null,
        secondaryScore: null,
        queries: 8 // Log shows "Queries Generated: 8" for all
    };

    if (primaryMatch) {
        result.primary = primaryMatch[2];
        result.primaryScore = parseInt(primaryMatch[1]);
    }

    if (secondaryMatch) {
        result.secondary = secondaryMatch[2];
        result.secondaryScore = parseInt(secondaryMatch[1]);
    }

    processedRefs.push(result);
    console.log(`✓ REF [${refId}]: P=${result.primary ? result.primaryScore : 'none'}, S=${result.secondary ? result.secondaryScore : 'none'}`);
}

console.log(`\n📊 Extracted ${processedRefs.length} processed references\n`);

// Read production YAML file
console.log('📖 Reading production YAML file...');
const yamlContent = fs.readFileSync(PRODUCTION_FILE, 'utf-8');
const data = parseYaml(yamlContent);

console.log(`   Found ${data.references.length} total references\n`);

// Apply extracted results to YAML
console.log('✏️  Applying extracted results...\n');
let updatedCount = 0;

for (const processedRef of processedRefs) {
    const yamlRef = data.references.find(r => r.id === processedRef.id);

    if (!yamlRef) {
        console.log(`⚠️  REF [${processedRef.id}] not found in YAML`);
        continue;
    }

    // Update URLs
    if (processedRef.primary) {
        yamlRef.urls.primary = processedRef.primary;
    }
    if (processedRef.secondary) {
        yamlRef.urls.secondary = processedRef.secondary;
    }

    // Add BATCH_v22.0 flag
    if (!yamlRef.flags.includes('BATCH_v22.0')) {
        yamlRef.flags.push('BATCH_v22.0');
    }

    // Ensure not finalized
    yamlRef.finalized = false;

    updatedCount++;
    console.log(`   Updated REF [${processedRef.id}]`);
}

console.log(`\n✅ Updated ${updatedCount} references\n`);

// Write updated YAML back to production
console.log('💾 Writing updated YAML to production file...');
const updatedYaml = stringifyYaml(data);
fs.writeFileSync(PRODUCTION_FILE, updatedYaml, 'utf-8');

console.log('✅ Production file updated successfully!\n');

// Verify results
const finalCheck = parseYaml(fs.readFileSync(PRODUCTION_FILE, 'utf-8'));
const finalizedCount = finalCheck.references.filter(r => r.finalized).length;
const unfinalizedCount = finalCheck.references.filter(r => !r.finalized).length;
const batchFlagCount = finalCheck.references.filter(r => r.flags.includes('BATCH_v22.0')).length;

console.log('📊 Final verification:');
console.log(`   Total references: ${finalCheck.references.length}`);
console.log(`   Finalized: ${finalizedCount}`);
console.log(`   Unfinalized: ${unfinalizedCount}`);
console.log(`   With BATCH_v22.0 flag: ${batchFlagCount}`);
console.log(`\n✅ Restoration complete!`);
