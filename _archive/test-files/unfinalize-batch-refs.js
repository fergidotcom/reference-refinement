#!/usr/bin/env node
/**
 * Unfinalize BATCH-processed references from RID 312 onwards
 * Changes FLAGS[FINALIZED BATCH_vX.X] to FLAGS[BATCH_vX.X]
 */

import fs from 'fs/promises';

const REFS_TO_UNFINALIZE = [
    320, 600, 601, 602, 603, 604, 605, 607, 608, 609, 610,
    611, 612, 614, 615, 616, 617, 618, 619, 621, 622, 623, 624
];

async function main() {
    console.log('📝 Unfinalizing BATCH-processed references...\n');

    // Read decisions.txt
    const content = await fs.readFile('decisions.txt', 'utf-8');
    const lines = content.split('\n');

    let modified = 0;
    const newLines = lines.map(line => {
        // Check if this line is a reference we need to unfinalize
        const match = line.match(/^\[(\d+)\]/);
        if (!match) return line;

        const rid = parseInt(match[1]);
        if (!REFS_TO_UNFINALIZE.includes(rid)) return line;

        // Check if it has FINALIZED BATCH flag
        if (!line.includes('FLAGS[FINALIZED BATCH')) return line;

        // Remove FINALIZED from the flag
        const newLine = line.replace(/FLAGS\[FINALIZED (BATCH_v\d+\.\d+)\]/g, 'FLAGS[$1]');

        if (newLine !== line) {
            console.log(`✓ Unfinalized RID ${rid}`);
            modified++;
        }

        return newLine;
    });

    // Write back to decisions.txt
    await fs.writeFile('decisions.txt', newLines.join('\n'), 'utf-8');

    console.log(`\n✅ Unfinalized ${modified} references`);
    console.log(`   Ready for v16.7 reprocessing\n`);
}

main().catch(console.error);
