#!/usr/bin/env node

/**
 * Automated Reference Repair CLI
 * Parses source file and generates cleaned decisions.txt
 */

import fs from 'fs/promises';
import { CostTracker } from './cost-tracker.js';

// ============================================
// REFERENCE PARSER (same logic as HTML version)
// ============================================
const ReferenceParser = {
    parse(line) {
        const ref = {
            raw: line.trim(),
            rid: null,
            author: null,
            year: null,
            title: null,
            publication: null,
            relevance: null,
            urls: [],
            flags: [],
            confidence: {}
        };

        if (!ref.raw) return null;

        // Extract RID (GUARANTEED)
        const ridMatch = ref.raw.match(/^\[(\d+)\]/);
        if (!ridMatch) return null;
        ref.rid = parseInt(ridMatch[1]);

        // Get text after RID
        let remaining = ref.raw.substring(ridMatch[0].length).trim();

        // Extract and remove URLs with their labels
        // More precise URL regex: stops at whitespace OR square bracket OR period-space
        const urlRegex = /(https?:\/\/[^\s\[\]]+)/g;
        let urlMatch;
        while ((urlMatch = urlRegex.exec(remaining)) !== null) {
            ref.urls.push(urlMatch[1]);
        }
        // Remove URLs
        remaining = remaining.replace(urlRegex, '').trim();

        // Remove URL labels
        remaining = remaining.replace(/Primary URL:\s*/g, '').trim();
        remaining = remaining.replace(/Secondary URL:\s*/g, '').trim();
        remaining = remaining.replace(/Tertiary URL:\s*/g, '').trim();
        remaining = remaining.replace(/Secondary:\s*/g, '').trim(); // Also remove bare "Secondary:"
        remaining = remaining.replace(/Tertiary:\s*/g, '').trim(); // Also remove bare "Tertiary:"

        // Remove URL annotations in brackets
        // NOTE: Use [A-Z\s]* to match only uppercase letters and spaces, not numbers or punctuation
        // This prevents matching reference IDs like [116] when looking for [ORGANIZATIONAL REVIEW]
        remaining = remaining.replace(/\[VERIFIED\]/g, '').trim();
        remaining = remaining.replace(/\[AMAZON\]/g, '').trim();
        remaining = remaining.replace(/\[PENGUIN\]/g, '').trim();
        remaining = remaining.replace(/\[[A-Z\s]*REVIEW\]/g, '').trim(); // Only match [XXX REVIEW], not [123]...REVIEW]
        remaining = remaining.replace(/\[[A-Z\s]*EXCERPT\]/g, '').trim(); // Only match [XXX EXCERPT]
        remaining = remaining.replace(/\[[A-Z\s]*SUMMARY\]/g, '').trim(); // Only match [XXX SUMMARY]
        remaining = remaining.replace(/\[NO SECONDARY AVAILABLE[^\]]*\]/g, '').trim();

        // Clean up orphaned punctuation and whitespace
        remaining = remaining.replace(/\s+/g, ' ').trim();
        remaining = remaining.replace(/\.\s*\)/g, ')').trim(); // Remove periods before close parens
        remaining = remaining.replace(/\)\s*\./g, ')').trim(); // Period after close parens handled later

        // Extract FLAGS (contamination)
        const flagRegex = /FLAGS\[([^\]]+)\]/g;
        let flagMatch;
        while ((flagMatch = flagRegex.exec(remaining)) !== null) {
            ref.flags.push(flagMatch[1]);
        }
        remaining = remaining.replace(flagRegex, '').trim();

        // STEP 1: Extract explicit relevance (with "Relevance:" tag)
        let explicitRelevance = null;
        const relevanceMatch = remaining.match(/Relevance:\s*(.+)$/i);
        if (relevanceMatch) {
            explicitRelevance = relevanceMatch[1].trim();
            remaining = remaining.substring(0, relevanceMatch.index).trim();
        }

        // STEP 2: Extract Year (do this before anything else)
        const yearMatch = remaining.match(/\((\d{4})\)/) || remaining.match(/(\b19\d{2}\b|\b20\d{2}\b)/);
        if (yearMatch) {
            ref.year = yearMatch[1];
            ref.confidence.year = 'found';
        } else {
            ref.confidence.year = 'missing';
        }

        // Extract Author (before year)
        if (ref.year) {
            const yearIndex = remaining.indexOf(ref.year);
            const beforeYear = remaining.substring(0, yearIndex).trim();

            const authorPatterns = [
                /^([A-Z][a-z]+,\s+[A-Z]\.\s*(?:[A-Z]\.)?)/, // Last, F. M.
                /^([A-Z][a-z]+,\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/, // Last, First Middle
                /^([A-Z][a-z]+\s+&\s+[A-Z][a-z]+)/, // Last & Last
                /^([A-Z][A-Z\s]+\.)/, // CORPORATE NAME.
                /^([^(]+)\s+\(/ // Anything before first parenthesis
            ];

            for (const pattern of authorPatterns) {
                const authorMatch = beforeYear.match(pattern);
                if (authorMatch) {
                    ref.author = authorMatch[1].trim().replace(/\($/, '').trim();
                    ref.confidence.author = 'found';
                    break;
                }
            }

            if (!ref.author) {
                ref.confidence.author = 'missing';
            }
        } else {
            ref.confidence.author = 'missing';
        }

        // Extract Title and Publication
        // SIMPLE STRATEGY: Author (Year). Title. Location: Publisher. <-- END OF BIBLIO
        // EVERYTHING AFTER that = relevance text

        let afterYear = remaining;
        if (ref.year) {
            const yearIndex = remaining.indexOf(ref.year);
            afterYear = remaining.substring(yearIndex + 4).trim();
            // Remove closing paren and any punctuation/whitespace after the year
            afterYear = afterYear.replace(/^\)\s*[.,:\s]+/, '').trim();
            afterYear = afterYear.replace(/^[.,:\s]+/, '').trim();
        }

        // Find where publication ends - look for standard end-of-publication pattern
        // Pattern: "Publisher." or "Location: Publisher." or "ISBN..." or "pp. X-Y"
        const pubEndPattern = /((?:Press|Publications?|University|Institute|Foundation|Journal|Magazine|Review|Inc\.|LLC|Bureau|Center|Centre)\.|ISBN[:\s]+[\dXx\-]+|DOI[:\s]+[\d\.\/]+|pp?\.\s*\d+[\-–]\d+|Vol\.\s*\d+,?\s*No\.\s*\d+)/i;

        const pubEndMatch = afterYear.match(pubEndPattern);

        if (pubEndMatch) {
            // Found end of publication - split here
            const pubEndIndex = pubEndMatch.index + pubEndMatch[0].length;

            // Title = first sentence
            const titleMatch = afterYear.match(/^([^.]+)\./);
            if (titleMatch) {
                ref.title = titleMatch[1].trim();
                ref.confidence.title = 'found';

                // Publication = from after title to end of pub pattern
                const afterTitle = afterYear.substring(titleMatch[0].length).trim();
                const pubLength = pubEndIndex - titleMatch[0].length;
                ref.publication = afterTitle.substring(0, pubLength).trim();
                ref.confidence.publication = 'found';

                // EVERYTHING after publication end = relevance
                // BUT: if we already have explicitRelevance, use that instead
                if (explicitRelevance) {
                    ref.relevance = explicitRelevance;
                    ref.confidence.relevance = 'found';
                } else {
                    // Extract text after publication, removing leading punctuation/whitespace
                    let afterPub = afterYear.substring(pubEndIndex).trim();
                    // Remove leading periods, commas, semicolons that may appear after biblio
                    afterPub = afterPub.replace(/^[.,;:\s]+/, '').trim();
                    if (afterPub.length > 0) {
                        ref.relevance = afterPub;
                        ref.confidence.relevance = 'heuristic';
                    } else {
                        ref.confidence.relevance = 'missing';
                    }
                }
            } else {
                // No clear title
                ref.confidence.title = 'uncertain';
                ref.title = afterYear.substring(0, Math.min(100, afterYear.length));
            }
        } else {
            // No clear publication end - use simpler split
            const segments = afterYear.split(/\.\s+/);
            if (segments.length >= 2) {
                ref.title = segments[0].trim();
                ref.publication = segments[1].trim();
                ref.confidence.title = 'found';
                ref.confidence.publication = 'found';

                // Rest = relevance (BUT: prefer explicitRelevance if present)
                if (explicitRelevance) {
                    ref.relevance = explicitRelevance;
                    ref.confidence.relevance = 'found';
                } else if (segments.length > 2) {
                    ref.relevance = segments.slice(2).join('. ').trim();
                    ref.confidence.relevance = 'heuristic';
                } else {
                    ref.confidence.relevance = 'missing';
                }
            } else if (segments.length === 1) {
                ref.title = segments[0].trim();
                ref.confidence.title = 'uncertain';
                ref.confidence.publication = 'missing';
                if (explicitRelevance) {
                    ref.relevance = explicitRelevance;
                    ref.confidence.relevance = 'found';
                } else {
                    ref.confidence.relevance = 'missing';
                }
            } else {
                ref.confidence.title = 'missing';
                ref.confidence.publication = 'missing';
                if (explicitRelevance) {
                    ref.relevance = explicitRelevance;
                    ref.confidence.relevance = 'found';
                } else {
                    ref.confidence.relevance = 'missing';
                }
            }
        }

        return ref;
    }
};

// ============================================
// EXCEPTION DETECTOR
// ============================================
const ExceptionDetector = {
    detect(ref) {
        const issues = [];

        if (!ref.rid) {
            issues.push({ type: 'NO_RID', severity: 'critical', message: 'RID not found' });
        }

        if (ref.confidence.author === 'missing') {
            issues.push({ type: 'NO_AUTHOR', severity: 'warning', message: 'Author not detected' });
        }
        if (ref.confidence.year === 'missing') {
            issues.push({ type: 'NO_YEAR', severity: 'warning', message: 'Year not detected' });
        }
        if (ref.confidence.title === 'missing') {
            issues.push({ type: 'NO_TITLE', severity: 'warning', message: 'Title not detected' });
        }
        if (ref.confidence.title === 'uncertain') {
            issues.push({ type: 'UNCLEAR_TITLE', severity: 'warning', message: 'Title detection uncertain' });
        }

        if (ref.confidence.relevance === 'missing') {
            issues.push({ type: 'NO_RELEVANCE', severity: 'info', message: 'Relevance text not found' });
        }
        if (ref.confidence.relevance === 'uncertain') {
            issues.push({ type: 'UNCLEAR_RELEVANCE', severity: 'info', message: 'Relevance text uncertain (fallback heuristic)' });
        }
        if (ref.confidence.relevance === 'heuristic') {
            issues.push({ type: 'HEURISTIC_RELEVANCE', severity: 'info', message: 'Relevance text detected without tag (heuristic)' });
        }
        if (ref.confidence.publication === 'missing') {
            issues.push({ type: 'NO_PUBLICATION', severity: 'info', message: 'Publication info not found' });
        }

        if (ref.urls.length > 0) {
            issues.push({ type: 'HAS_URLS', severity: 'info', message: `Contains ${ref.urls.length} URL(s)` });
        }
        if (ref.flags.length > 0) {
            issues.push({ type: 'HAS_FLAGS', severity: 'info', message: `Contains FLAGS: ${ref.flags.join(', ')}` });
        }

        return issues;
    },

    getSeverity(issues) {
        if (issues.some(i => i.severity === 'critical')) return 'critical';
        if (issues.some(i => i.severity === 'warning')) return 'warning';
        if (issues.length > 0) return 'info';
        return 'clean';
    }
};

// ============================================
// MAIN PROCESSING
// ============================================
async function processFile(inputPath, outputPath) {
    console.log('═══════════════════════════════════════════════════');
    console.log('        AUTOMATED REFERENCE REPAIR CLI');
    console.log('═══════════════════════════════════════════════════\n');

    // Initialize cost tracker
    const costTracker = new CostTracker();

    // Note: No API costs for this operation since it's pure parsing
    // Cost tracking is ready for future operations that use APIs

    console.log(`Reading source file: ${inputPath}\n`);

    const content = await fs.readFile(inputPath, 'utf-8');
    const lines = content.split('\n');

    const references = [];
    let lineNum = 0;

    for (const line of lines) {
        lineNum++;
        if (!line.trim()) continue;

        const ref = ReferenceParser.parse(line);
        if (ref) {
            ref.issues = ExceptionDetector.detect(ref);
            ref.severity = ExceptionDetector.getSeverity(ref.issues);
            ref.lineNum = lineNum;
            references.push(ref);
        }
    }

    console.log(`✓ Parsed ${references.length} references from ${lineNum} lines\n`);

    // Calculate statistics
    const stats = {
        total: references.length,
        clean: references.filter(r => r.severity === 'clean').length,
        info: references.filter(r => r.severity === 'info').length,
        warning: references.filter(r => r.severity === 'warning').length,
        critical: references.filter(r => r.severity === 'critical').length
    };

    console.log('STATISTICS');
    console.log('─────────────────────────────────────────────────');
    console.log(`Total References: ${stats.total}`);
    console.log(`✅ Clean: ${stats.clean} (${(stats.clean/stats.total*100).toFixed(1)}%)`);
    console.log(`🔵 Info: ${stats.info} (${(stats.info/stats.total*100).toFixed(1)}%)`);
    console.log(`🟡 Warnings: ${stats.warning} (${(stats.warning/stats.total*100).toFixed(1)}%)`);
    console.log(`🔴 Critical: ${stats.critical} (${(stats.critical/stats.total*100).toFixed(1)}%)`);
    console.log('');

    // Show issue breakdown
    const issuesByType = {};
    for (const ref of references) {
        for (const issue of ref.issues) {
            if (!issuesByType[issue.type]) {
                issuesByType[issue.type] = { count: 0, rids: [] };
            }
            issuesByType[issue.type].count++;
            issuesByType[issue.type].rids.push(ref.rid);
        }
    }

    if (Object.keys(issuesByType).length > 0) {
        console.log('ISSUES BY TYPE');
        console.log('─────────────────────────────────────────────────');
        for (const [type, data] of Object.entries(issuesByType)) {
            console.log(`${type}: ${data.count} occurrences`);
            console.log(`  RIDs: [${data.rids.slice(0, 10).join(', ')}${data.rids.length > 10 ? '...' : ''}]`);
        }
        console.log('');
    }

    // Generate cleaned decisions.txt
    console.log('GENERATING OUTPUT');
    console.log('─────────────────────────────────────────────────');

    let output = '';
    for (const ref of references) {
        // SINGLE LINE FORMAT: [RID] Author (Year). Title. Publication. Relevance: text FLAGS[UNFINALIZED]
        // CRITICAL: Bibliographic section must have ONLY biblio info, no orphaned relevance text

        let line = `[${ref.rid}]`;

        if (ref.author) line += ` ${ref.author}`;
        if (ref.year) line += ` (${ref.year})`;

        // Add title, ensuring proper punctuation
        if (ref.title) {
            let title = ref.title.trim();
            // Add period before title if not present after year
            if (!line.endsWith('.')) line += '.';
            line += ` ${title}`;
            // Add period after title if not present
            if (!title.endsWith('.') && !title.endsWith('?') && !title.endsWith('!')) {
                line += '.';
            }
        }

        // Add publication info (ONLY bibliographic info, MUST NOT include any relevance text)
        if (ref.publication) {
            let pub = ref.publication.trim();
            line += ` ${pub}`;
            // Add period after publication if not present
            if (!pub.endsWith('.') && !pub.endsWith('?') && !pub.endsWith('!')) {
                line += '.';
            }
        }

        // Add relevance text IMMEDIATELY after biblio (if present)
        if (ref.relevance) {
            let relevance = ref.relevance.trim();
            // Ensure relevance ends with period
            if (!relevance.endsWith('.') && !relevance.endsWith('?') && !relevance.endsWith('!')) {
                relevance += '.';
            }
            line += ` Relevance: ${relevance}`;
        }

        // Add FLAGS at very end
        line += ' FLAGS[UNFINALIZED]';

        // Add URLs in iPad app format (after FLAGS)
        if (ref.urls.length > 0) {
            if (ref.urls[0]) line += ` PRIMARY_URL[${ref.urls[0]}]`;
            if (ref.urls[1]) line += ` SECONDARY_URL[${ref.urls[1]}]`;
            if (ref.urls[2]) line += ` TERTIARY_URL[${ref.urls[2]}]`;
        }

        // Write single line (no internal linefeeds) + newline separator
        output += line + '\n';
    }

    await fs.writeFile(outputPath, output);
    console.log(`✓ Wrote cleaned references to: ${outputPath}\n`);

    // Generate detailed report
    const reportPath = outputPath.replace('.txt', '-REPORT.txt');
    let report = 'REFERENCE REPAIR REPORT\n';
    report += '═══════════════════════════════════════════════════\n\n';
    report += `Source File: ${inputPath}\n`;
    report += `Output File: ${outputPath}\n`;
    report += `Generated: ${new Date().toLocaleString()}\n\n`;

    report += 'STATISTICS\n';
    report += '─────────────────────────────────────────────────\n';
    report += `Total References: ${stats.total}\n`;
    report += `Clean: ${stats.clean} (${(stats.clean/stats.total*100).toFixed(1)}%)\n`;
    report += `Info: ${stats.info} (${(stats.info/stats.total*100).toFixed(1)}%)\n`;
    report += `Warnings: ${stats.warning} (${(stats.warning/stats.total*100).toFixed(1)}%)\n`;
    report += `Critical: ${stats.critical} (${(stats.critical/stats.total*100).toFixed(1)}%)\n\n`;

    report += 'ISSUES BY TYPE\n';
    report += '─────────────────────────────────────────────────\n';
    for (const [type, data] of Object.entries(issuesByType)) {
        report += `${type}: ${data.count} occurrences\n`;
        report += `  RIDs: ${data.rids.join(', ')}\n\n`;
    }

    const problemRefs = references.filter(r => r.severity === 'critical' || r.severity === 'warning');
    if (problemRefs.length > 0) {
        report += '\nPROBLEMATIC REFERENCES (NEEDS REVIEW)\n';
        report += '─────────────────────────────────────────────────\n';
        for (const ref of problemRefs) {
            report += `\n[${ref.rid}] ${ref.title || 'Untitled'}\n`;
            report += `  Severity: ${ref.severity.toUpperCase()}\n`;
            report += `  Issues: ${ref.issues.map(i => i.message).join(', ')}\n`;
            report += `  Line: ${ref.lineNum}\n`;
        }
    }

    // Add cost tracking section
    report += '\n\n' + costTracker.generateReport();

    await fs.writeFile(reportPath, report);
    console.log(`✓ Wrote detailed report to: ${reportPath}\n`);

    // Save cost tracking data
    await costTracker.save('cost-tracking-repair.json');

    console.log('═══════════════════════════════════════════════════');
    console.log('SUMMARY');
    console.log('═══════════════════════════════════════════════════');
    console.log(`✓ Processed ${stats.total} references`);
    console.log(`✓ Generated: ${outputPath}`);
    console.log(`✓ Generated: ${reportPath}`);
    console.log(`✓ Cost tracking: cost-tracking-repair.json`);

    if (stats.critical > 0) {
        console.log(`\n⚠️  WARNING: ${stats.critical} critical issues detected!`);
        console.log('   Review report and consider manual repair.');
    } else if (stats.warning > 0) {
        console.log(`\n⚠️  NOTE: ${stats.warning} warnings detected.`);
        console.log('   Most references parsed successfully.');
    } else {
        console.log('\n✅ All references parsed cleanly!');
    }

    console.log('\n📊 No API costs incurred (pure parsing operation)');
    console.log('═══════════════════════════════════════════════════\n');

    return { references, stats, costTracker };
}

// ============================================
// CLI EXECUTION
// ============================================
const inputPath = process.argv[2] || '250904 Caught In The Act - REFERENCES ONLY.txt';
const outputPath = process.argv[3] || 'decisions-clean-AUTO.txt';

processFile(inputPath, outputPath)
    .then(() => {
        console.log('Processing complete!\n');
        process.exit(0);
    })
    .catch(error => {
        console.error('ERROR:', error.message);
        process.exit(1);
    });
