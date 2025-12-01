/**
 * Fix Line Breaks in CONTEXT Blocks
 *
 * Removes hard line breaks from within CONTEXT blocks
 * Joins multi-line context text into single paragraphs
 */

import fs from 'fs/promises';

async function fixContextLinebreaks(filename) {
    console.log(`🔧 Fixing CONTEXT linebreaks in: ${filename}`);

    const content = await fs.readFile(filename, 'utf-8');
    const lines = content.split('\n');
    const output = [];

    let insideContext = false;
    let contextLines = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        if (trimmed === '[CONTEXT_START]') {
            insideContext = true;
            output.push(line);
            contextLines = [];
            continue;
        }

        if (trimmed === '[CONTEXT_END]') {
            insideContext = false;
            // Join all context lines with space
            if (contextLines.length > 0) {
                output.push(contextLines.join(' '));
                contextLines = [];
            }
            output.push(line);
            continue;
        }

        if (insideContext) {
            // Collect context lines
            if (trimmed.length > 0) {
                contextLines.push(trimmed);
            }
        } else {
            // Outside context, keep as-is
            output.push(line);
        }
    }

    // Write back
    const fixed = output.join('\n');
    await fs.writeFile(filename, fixed, 'utf-8');

    // Stats
    const originalLines = content.split('\n').length;
    const fixedLines = fixed.split('\n').length;
    const removed = originalLines - fixedLines;

    console.log(`  Original lines: ${originalLines}`);
    console.log(`  Fixed lines: ${fixedLines}`);
    console.log(`  Lines removed from CONTEXT blocks: ${removed}`);
    console.log(`  ✅ Done`);
    console.log('');
}

async function main() {
    console.log('🧹 Fixing CONTEXT Block Line Breaks');
    console.log('='.repeat(70));
    console.log('');

    await fixContextLinebreaks('CaughtInTheActGeneratedDecisions.txt');
    await fixContextLinebreaks('CaughtInTheAct_decisions.txt');

    console.log('✅ COMPLETE - CONTEXT blocks now single-line');
}

main().catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
});
