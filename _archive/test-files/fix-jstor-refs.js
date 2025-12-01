#!/usr/bin/env node

/**
 * JSTOR Reference Fixer
 *
 * 1. Finds all references with JSTOR URLs (PRIMARY or SECONDARY)
 * 2. Unfinalizes them (removes FINALIZED flag)
 * 3. Adds NEEDS_FREE_ALTERNATIVE flag
 * 4. Creates backup before modification
 * 5. Generates report of changes
 *
 * Usage: node fix-jstor-refs.js
 */

import fs from 'fs/promises';

async function fixJSTORReferences() {
    console.log('\n=== JSTOR REFERENCE FIXER ===\n');

    // Create backup
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `decisions_backup_jstor_fix_${timestamp}.txt`;

    const content = await fs.readFile('decisions.txt', 'utf-8');
    await fs.writeFile(backupPath, content, 'utf-8');
    console.log(`✅ Backup created: ${backupPath}\n`);

    // Parse references manually (line-by-line)
    const lines = content.split('\n');
    const newLines = [];
    let currentRef = null;
    let modifiedCount = 0;
    const modifiedRefs = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Check if this is a reference header line
        const refMatch = line.match(/^\[(\d+)\]/);
        if (refMatch) {
            currentRef = {
                id: parseInt(refMatch[1]),
                startLine: i,
                hasJSTOR: false,
                isFinalized: false,
                primaryJSTOR: false,
                secondaryJSTOR: false
            };
        }

        // Check for JSTOR URLs
        if (currentRef && line.includes('jstor.org')) {
            currentRef.hasJSTOR = true;

            if (line.includes('PRIMARY_URL') && line.includes('jstor.org')) {
                currentRef.primaryJSTOR = true;
            }
            if (line.includes('SECONDARY_URL') && line.includes('jstor.org')) {
                currentRef.secondaryJSTOR = true;
            }
        }

        // Check if finalized
        if (currentRef && line.includes('FLAGS[') && line.includes('FINALIZED')) {
            currentRef.isFinalized = true;
        }

        // If we hit a new reference or end of file, process the previous one
        if ((refMatch && currentRef && currentRef.id !== parseInt(refMatch[1])) ||
            (i === lines.length - 1 && currentRef)) {

            // Process last line if at end
            if (i === lines.length - 1) {
                newLines.push(line);
            }

            // Check if we need to modify this reference
            if (currentRef.hasJSTOR) {
                console.log(`\n[${currentRef.id}] Has JSTOR URL(s):`);
                if (currentRef.primaryJSTOR) console.log('  🔒 PRIMARY = JSTOR');
                if (currentRef.secondaryJSTOR) console.log('  🔒 SECONDARY = JSTOR');

                if (currentRef.isFinalized) {
                    console.log('  ⚠️  Was FINALIZED - will unfinalize');
                } else {
                    console.log('  ○  Already unfinalized');
                }

                modifiedCount++;
                modifiedRefs.push({
                    id: currentRef.id,
                    primaryJSTOR: currentRef.primaryJSTOR,
                    secondaryJSTOR: currentRef.secondaryJSTOR,
                    wasFinalized: currentRef.isFinalized
                });
            }

            // Reset for next reference
            currentRef = refMatch ? {
                id: parseInt(refMatch[1]),
                startLine: i,
                hasJSTOR: false,
                isFinalized: false,
                primaryJSTOR: false,
                secondaryJSTOR: false
            } : null;
        }

        newLines.push(line);
    }

    // Now modify the lines
    console.log('\n=== MODIFYING REFERENCES ===\n');

    const finalLines = [];
    currentRef = null;
    let shouldUnfinalize = false;

    for (let i = 0; i < newLines.length; i++) {
        let line = newLines[i];

        // Check if this is a reference header
        const refMatch = line.match(/^\[(\d+)\]/);
        if (refMatch) {
            const refId = parseInt(refMatch[1]);
            const modRef = modifiedRefs.find(r => r.id === refId);
            shouldUnfinalize = modRef && modRef.wasFinalized;
        }

        // Unfinalize if needed
        if (shouldUnfinalize && line.includes('FLAGS[') && line.includes('FINALIZED')) {
            console.log(`[${refMatch[1]}] Removing FINALIZED flag`);

            // Remove FINALIZED from FLAGS
            line = line.replace(/FINALIZED\s+/g, '');
            line = line.replace(/\s+FINALIZED/g, '');
            line = line.replace(/FINALIZED/g, '');

            // Add NEEDS_FREE_ALTERNATIVE flag
            if (!line.includes('NEEDS_FREE_ALTERNATIVE')) {
                line = line.replace(/FLAGS\[/, 'FLAGS[NEEDS_FREE_ALTERNATIVE ');
            }

            console.log(`[${refMatch[1]}] Added NEEDS_FREE_ALTERNATIVE flag`);
        }

        finalLines.push(line);
    }

    // Write modified file
    await fs.writeFile('decisions.txt', finalLines.join('\n'), 'utf-8');
    console.log(`\n✅ Updated decisions.txt`);

    // Generate report
    console.log('\n=== SUMMARY ===\n');
    console.log(`Total references with JSTOR URLs: ${modifiedCount}`);

    const primaryCount = modifiedRefs.filter(r => r.primaryJSTOR).length;
    const secondaryCount = modifiedRefs.filter(r => r.secondaryJSTOR).length;
    const unfinalizedCount = modifiedRefs.filter(r => r.wasFinalized).length;

    console.log(`  - PRIMARY = JSTOR: ${primaryCount}`);
    console.log(`  - SECONDARY = JSTOR: ${secondaryCount}`);
    console.log(`  - Unfinalized: ${unfinalizedCount}`);
    console.log(`  - Already unfinalized: ${modifiedCount - unfinalizedCount}`);

    console.log('\n=== REFERENCE LIST ===\n');
    modifiedRefs.forEach(ref => {
        const primary = ref.primaryJSTOR ? '🔒P' : '';
        const secondary = ref.secondaryJSTOR ? '🔒S' : '';
        const status = ref.wasFinalized ? 'UNFINALIZED' : 'was unfinalized';
        console.log(`[${ref.id}] ${primary}${secondary} - ${status}`);
    });

    console.log('\n=== NEXT STEPS ===\n');
    console.log('1. Review modified references in iPad app');
    console.log('2. Search for free alternatives (Archive.org, ResearchGate, etc.)');
    console.log('3. Update PRIMARY/SECONDARY URLs with free sources');
    console.log('4. Re-finalize after finding free alternatives');
    console.log('\n✅ JSTOR fix complete!\n');

    // Write report file
    const reportPath = `JSTOR_FIX_REPORT_${timestamp}.md`;
    const report = `# JSTOR Reference Fix Report
Generated: ${new Date().toISOString()}

## Summary
- Total references with JSTOR URLs: ${modifiedCount}
- PRIMARY = JSTOR: ${primaryCount}
- SECONDARY = JSTOR: ${secondaryCount}
- Unfinalized: ${unfinalizedCount}
- Already unfinalized: ${modifiedCount - unfinalizedCount}

## Modified References

${modifiedRefs.map(ref => {
    const primary = ref.primaryJSTOR ? '🔒 PRIMARY' : '';
    const secondary = ref.secondaryJSTOR ? '🔒 SECONDARY' : '';
    const status = ref.wasFinalized ? 'UNFINALIZED' : 'was unfinalized';
    return `- [${ref.id}] ${primary} ${secondary} - ${status}`;
}).join('\n')}

## Backup
Created: ${backupPath}

## Next Steps
1. Review modified references in iPad app
2. Search for free alternatives:
   - Archive.org
   - ResearchGate
   - Google Scholar "PDF" search
   - Author's personal website
   - University repositories
3. Update PRIMARY/SECONDARY URLs with free sources
4. Re-finalize after finding free alternatives

## References to Fix

${modifiedRefs.map(ref => `### REF [${ref.id}]
- Primary JSTOR: ${ref.primaryJSTOR ? 'YES ❌' : 'no'}
- Secondary JSTOR: ${ref.secondaryJSTOR ? 'YES ❌' : 'no'}
- Status: ${ref.wasFinalized ? 'Unfinalized ✓' : 'Was already unfinalized'}
`).join('\n')}
`;

    await fs.writeFile(reportPath, report, 'utf-8');
    console.log(`📄 Report saved: ${reportPath}\n`);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    fixJSTORReferences()
        .catch(err => {
            console.error('❌ Error:', err.message);
            console.error(err.stack);
            process.exit(1);
        });
}

export { fixJSTORReferences };
