#!/usr/bin/env node

/**
 * Simple JSTOR Reference Fixer
 * Handles single-line reference format
 */

import fs from 'fs/promises';

async function fixJSTOR() {
    console.log('\n=== JSTOR REFERENCE FIXER (Single-Line Format) ===\n');

    // Create backup
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const backupPath = `decisions_backup_jstor_fix_${timestamp}.txt`;

    const content = await fs.readFile('/Users/joeferguson/Library/CloudStorage/Dropbox/Apps/Reference Refinement/decisions.txt', 'utf-8');
    await fs.writeFile(backupPath, content, 'utf-8');
    console.log(`✅ Backup created: ${backupPath}\n`);

    // Split into lines
    const lines = content.split('\n');
    const newLines = [];
    const modified = [];

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];

        // Check if this line contains a reference with JSTOR
        const refMatch = line.match(/^\[(\d+)\]/);
        if (refMatch && line.includes('jstor.org')) {
            const refId = parseInt(refMatch[1]);
            const isFinalized = line.includes('FLAGS[FINALIZED') || line.includes('FINALIZED BATCH') || line.includes('FINALIZED]');
            const hasPrimaryJSTOR = line.includes('PRIMARY_URL[') && line.includes('jstor.org');
            const hasSecondaryJSTOR = line.includes('SECONDARY_URL[') && line.includes('jstor.org');

            console.log(`\n[${refId}] Found JSTOR reference:`);
            if (hasPrimaryJSTOR) console.log('  🔒 PRIMARY = JSTOR');
            if (hasSecondaryJSTOR) console.log('  🔒 SECONDARY = JSTOR');
            console.log(`  Status: ${isFinalized ? 'FINALIZED ⚠️' : 'unfinalized'}`);

            if (isFinalized) {
                // Remove FINALIZED from FLAGS
                console.log('  → Removing FINALIZED flag');

                // Handle different FINALIZED patterns
                line = line.replace(/FLAGS\[FINALIZED BATCH_([^\]]+)\]/, 'FLAGS[BATCH_$1 NEEDS_FREE_ALTERNATIVE]');
                line = line.replace(/FLAGS\[FINALIZED\]/, 'FLAGS[NEEDS_FREE_ALTERNATIVE]');
                line = line.replace(/\sFINALIZED\s/, ' NEEDS_FREE_ALTERNATIVE ');
                line = line.replace(/\sFINALIZED([^\s])/, ' NEEDS_FREE_ALTERNATIVE$1');
                line = line.replace(/([^\s])FINALIZED\s/, '$1 NEEDS_FREE_ALTERNATIVE ');

                console.log('  → Added NEEDS_FREE_ALTERNATIVE flag');
            }

            modified.push({
                id: refId,
                primaryJSTOR: hasPrimaryJSTOR,
                secondaryJSTOR: hasSecondaryJSTOR,
                wasFinalized: isFinalized
            });
        }

        newLines.push(line);
    }

    // Write modified file
    await fs.writeFile('/Users/joeferguson/Library/CloudStorage/Dropbox/Apps/Reference Refinement/decisions.txt', newLines.join('\n'), 'utf-8');
    console.log(`\n✅ Updated decisions.txt`);

    // Summary
    console.log('\n=== SUMMARY ===\n');
    console.log(`Total references with JSTOR URLs: ${modified.length}`);

    const primaryCount = modified.filter(r => r.primaryJSTOR).length;
    const secondaryCount = modified.filter(r => r.secondaryJSTOR).length;
    const unfinalizedCount = modified.filter(r => r.wasFinalized).length;

    console.log(`  - PRIMARY = JSTOR: ${primaryCount}`);
    console.log(`  - SECONDARY = JSTOR: ${secondaryCount}`);
    console.log(`  - Unfinalized: ${unfinalizedCount}`);
    console.log(`  - Already unfinalized: ${modified.length - unfinalizedCount}`);

    console.log('\n=== MODIFIED REFERENCES ===\n');
    modified.sort((a, b) => a.id - b.id).forEach(ref => {
        const primary = ref.primaryJSTOR ? '🔒P' : '';
        const secondary = ref.secondaryJSTOR ? '🔒S' : '';
        const status = ref.wasFinalized ? 'UNFINALIZED ✓' : 'was unfinalized';
        console.log(`[${ref.id}] ${primary}${secondary} - ${status}`);
    });

    // Write report
    const report = `# JSTOR Reference Fix Report
Generated: ${new Date().toISOString()}

## Summary
- Total references with JSTOR URLs: **${modified.length}**
- PRIMARY = JSTOR: **${primaryCount}**
- SECONDARY = JSTOR: **${secondaryCount}**
- Unfinalized: **${unfinalizedCount}**
- Already unfinalized: **${modified.length - unfinalizedCount}**

## Modified References

${modified.map(ref => {
    const primary = ref.primaryJSTOR ? '🔒 PRIMARY' : '';
    const secondary = ref.secondaryJSTOR ? '🔒 SECONDARY' : '';
    const status = ref.wasFinalized ? 'UNFINALIZED ✓' : 'was unfinalized';
    return `- **[${ref.id}]** ${primary} ${secondary} - ${status}`;
}).join('\n')}

## Backup
\`${backupPath}\`

## Next Steps
1. ✅ All JSTOR references now unfinalized
2. Open iPad app at https://rrv521-1760738877.netlify.app
3. Review unfinalized references (they appear at top)
4. Search for free alternatives:
   - **Archive.org** - Often has scanned books/papers
   - **ResearchGate** - Authors upload PDFs
   - **Google Scholar** - Filter by "PDF" link
   - **Author's website** - Personal copies
   - **University repositories** - Open access papers
5. Update URLs with free sources
6. Re-finalize after verification

## Why JSTOR is Last Resort
- **Paywall**: Most content requires subscription (\$)
- **No Free Access**: Unlike Archive.org, ResearchGate
- **Limited Availability**: Many institutions don't have access
- **Better Alternatives**: Free sources should always be preferred

## RIDs to Fix

${modified.map(ref => `### REF [${ref.id}]
- Primary JSTOR: ${ref.primaryJSTOR ? 'YES ❌ NEEDS REPLACEMENT' : 'no ✓'}
- Secondary JSTOR: ${ref.secondaryJSTOR ? 'YES ❌ NEEDS REPLACEMENT' : 'no ✓'}
- Status: ${ref.wasFinalized ? 'Unfinalized (was finalized)' : 'Was already unfinalized'}
`).join('\n')}
`;

    await fs.writeFile(`JSTOR_FIX_REPORT_${timestamp}.md`, report, 'utf-8');
    console.log(`\n📄 Report saved: JSTOR_FIX_REPORT_${timestamp}.md\n`);

    console.log('\n=== NEXT ACTIONS ===\n');
    console.log('1. ✅ JSTOR references unfinalized and flagged');
    console.log('2. 🔄 Update batch-processor.js to penalize JSTOR');
    console.log('3. 📱 Review in iPad app and find free alternatives');
    console.log('4. ✅ Re-finalize after fixing\n');

    return modified;
}

// Run
fixJSTOR().catch(err => {
    console.error('❌ Error:', err.message);
    console.error(err.stack);
    process.exit(1);
});
