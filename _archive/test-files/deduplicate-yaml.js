#!/usr/bin/env node
/**
 * Remove duplicate references from YAML file, keeping the first occurrence
 * Usage: node deduplicate-yaml.js <yaml-file>
 */

const fs = require('fs');
const yaml = require('js-yaml');

if (process.argv.length < 3) {
    console.error('Usage: node deduplicate-yaml.js <yaml-file>');
    process.exit(1);
}

const inputFile = process.argv[2];
const outputFile = inputFile.replace(/\.yaml$/, '.dedup.yaml');

console.log(`Deduplicating ${inputFile}...`);

// Read and parse YAML
const content = fs.readFileSync(inputFile, 'utf-8');
const data = yaml.load(content);

const originalCount = data.references.length;
console.log(`Original: ${originalCount} references`);

// Find duplicates
const seen = new Set();
const duplicates = [];
const unique = [];

data.references.forEach((ref, index) => {
    if (seen.has(ref.id)) {
        duplicates.push({ id: ref.id, index });
    } else {
        seen.add(ref.id);
        unique.push(ref);
    }
});

console.log(`\nDuplicates found: ${duplicates.length}`);
duplicates.forEach(dup => {
    console.log(`  - ID ${dup.id} at index ${dup.index}`);
});

console.log(`\nUnique references: ${unique.length}`);

// Save deduplicated version
data.references = unique;

const yamlContent = yaml.dump(data, {
    indent: 2,
    lineWidth: -1,
    noRefs: true,
    sortKeys: false
});

fs.writeFileSync(outputFile, yamlContent, 'utf-8');

console.log(`\n✅ Deduplicated file saved to: ${outputFile}`);
console.log(`   Removed: ${originalCount - unique.length} duplicates`);
console.log(`   Final count: ${unique.length} references`);
