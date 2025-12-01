/**
 * Remove Linebreaks from References
 *
 * Removes blank lines within relevance text paragraphs
 * Joins multi-paragraph relevance into single paragraph
 */

import fs from 'fs/promises';

async function removeLinebreaks(filename) {
    console.log(`🔧 Removing linebreaks from: ${filename}`);

    const content = await fs.readFile(filename, 'utf-8');
    const lines = content.split('\n');
    const output = [];

    let inReference = false;
    let currentRelevance = [];
    let pendingLines = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        // Start of reference
        if (trimmed.match(/^\[\d+\]/)) {
            // Flush any pending relevance
            if (currentRelevance.length > 0) {
                output.push(currentRelevance.join(' '));
                currentRelevance = [];
            }
            if (pendingLines.length > 0) {
                output.push(...pendingLines);
                pendingLines = [];
            }

            output.push(line);
            inReference = true;
            continue;
        }

        // CONTEXT blocks - keep as-is
        if (trimmed === '[CONTEXT_START]' || trimmed === '[CONTEXT_END]') {
            if (currentRelevance.length > 0) {
                output.push(currentRelevance.join(' '));
                currentRelevance = [];
            }
            output.push(line);
            continue;
        }

        // Relevance text - collect and join
        if (trimmed.startsWith('Relevance:')) {
            if (currentRelevance.length > 0) {
                output.push(currentRelevance.join(' '));
            }
            currentRelevance = [line];
            continue;
        }

        // Continuation of relevance (not empty, not a marker)
        if (currentRelevance.length > 0 &&
            trimmed.length > 0 &&
            !trimmed.startsWith('[FINALIZED]') &&
            !trimmed.startsWith('FLAGS[') &&
            !trimmed.startsWith('PRIMARY_URL[') &&
            !trimmed.startsWith('SECONDARY_URL[') &&
            !trimmed.startsWith('TERTIARY_URL[')) {
            currentRelevance.push(line);
            continue;
        }

        // Empty line within relevance - skip it
        if (currentRelevance.length > 0 && trimmed.length === 0) {
            continue; // Skip blank lines in relevance
        }

        // Other lines (FLAGS, URLs, etc.)
        if (currentRelevance.length > 0) {
            output.push(currentRelevance.join(' '));
            currentRelevance = [];
        }

        output.push(line);
    }

    // Flush any remaining relevance
    if (currentRelevance.length > 0) {
        output.push(currentRelevance.join(' '));
    }

    // Write back
    const cleaned = output.join('\n');
    await fs.writeFile(filename, cleaned, 'utf-8');

    // Stats
    const originalLines = content.split('\n').length;
    const cleanedLines = cleaned.split('\n').length;
    const removed = originalLines - cleanedLines;

    console.log(`  Original lines: ${originalLines}`);
    console.log(`  Cleaned lines: ${cleanedLines}`);
    console.log(`  Blank lines removed: ${removed}`);
    console.log(`  ✅ Done`);
    console.log('');
}

async function main() {
    console.log('🧹 Removing Linebreaks from Reference Files');
    console.log('='.repeat(70));
    console.log('');

    await removeLinebreaks('CaughtInTheActGeneratedDecisions.txt');
    await removeLinebreaks('CaughtInTheAct_decisions.txt');

    console.log('✅ COMPLETE - Both files cleaned');
}

main().catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
});
