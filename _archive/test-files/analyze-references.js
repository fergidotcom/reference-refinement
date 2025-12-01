import fs from 'fs';

// Read the file
const content = fs.readFileSync('250904 Caught In The Act - REFERENCES ONLY.txt', 'utf-8');
const lines = content.split('\n');

const references = [];
const issues = [];
let stats = {
    total: 0,
    withRelevance: 0,
    withPrimaryURL: 0,
    withSecondaryURL: 0,
    withISBN: 0,
    withDOI: 0,
    withFlags: 0,
    verified: 0,
    formatIssues: 0,
    missingTitle: 0,
    missingAuthor: 0,
    missingYear: 0
};

// Parse references
for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Check if this is a reference line
    const match = line.match(/^\[(\d+)\]/);
    if (match) {
        const rid = match[1];
        const ref = {
            id: rid,
            line: i + 1,
            text: line,
            hasRelevance: false,
            hasPrimaryURL: false,
            hasSecondaryURL: false,
            hasISBN: false,
            hasDOI: false,
            hasFlags: false,
            flags: [],
            hasAuthor: false,
            hasYear: false,
            hasTitle: false,
            issues: []
        };

        stats.total++;

        // Check for Relevance
        if (line.includes('Relevance:')) {
            ref.hasRelevance = true;
            stats.withRelevance++;
        } else {
            ref.issues.push('Missing Relevance: text');
        }

        // Check for URLs
        if (line.match(/Primary URL:/i) || line.match(/PRIMARY_URL\[/)) {
            ref.hasPrimaryURL = true;
            stats.withPrimaryURL++;
        }

        if (line.match(/Secondary URL:/i) || line.match(/SECONDARY_URL\[/)) {
            ref.hasSecondaryURL = true;
            stats.withSecondaryURL++;
        }

        // Check for ISBN
        if (line.match(/ISBN:\s*[\d-]+/) || line.match(/ISBN\s+[\d-]+/)) {
            ref.hasISBN = true;
            stats.withISBN++;
        }

        // Check for DOI
        if (line.match(/DOI:\s*10\.\d+/) || line.match(/doi\.org\/10\.\d+/)) {
            ref.hasDOI = true;
            stats.withDOI++;
        }

        // Check for flags [VERIFIED], [SEMINAL WORK], etc.
        const flagMatches = line.match(/\[(VERIFIED|SEMINAL WORK|AMAZON|WORLDCAT|OXFORD|PENGUIN|MIT NEWS|SAGE DOI|OPEN ACCESS DOI|NYU PRESS DOI|HEWLETT|SELC|SHORENSTEIN CENTER|CAMBRIDGE DOI|ANNUAL REVIEWS|NATURE|FULL TEXT|PUBMED ABSTRACT)\]/g);
        if (flagMatches) {
            ref.hasFlags = true;
            ref.flags = flagMatches.map(f => f.replace(/[\[\]]/g, ''));
            stats.withFlags++;
            if (ref.flags.includes('VERIFIED')) stats.verified++;
        }

        // Parse bibliographic info from the start
        const biblio = line.substring(match[0].length).trim();

        // Check for author (name before year or before title)
        // Basic pattern: "LastName, F." or "LastName, F. L." before a year
        if (biblio.match(/^[A-Z][a-z]+,\s+[A-Z]/)) {
            ref.hasAuthor = true;
        } else if (biblio.match(/^[A-Z][a-z]+\s+[A-Z]/)) {
            ref.hasAuthor = true;
        } else {
            ref.issues.push('Missing or unclear author');
            stats.missingAuthor++;
        }

        // Check for year (####) in parentheses
        if (biblio.match(/\((\d{4})\)/)) {
            ref.hasYear = true;
        } else {
            ref.issues.push('Missing publication year');
            stats.missingYear++;
        }

        // Check for title (text after year, before publisher/relevance)
        // This is tricky - basically any substantial text between year and "Relevance:" or URL
        const afterYear = biblio.split(/\(\d{4}\)/)[1];
        if (afterYear && afterYear.trim().length > 10) {
            ref.hasTitle = true;
        } else {
            ref.issues.push('Missing or very short title');
            stats.missingTitle++;
        }

        // Count issues
        if (ref.issues.length > 0) {
            stats.formatIssues++;
            issues.push({
                id: rid,
                line: i + 1,
                issues: ref.issues
            });
        }

        references.push(ref);
    }
}

// Generate report
console.log('='.repeat(80));
console.log('CAUGHT IN THE ACT - REFERENCE ANALYSIS REPORT');
console.log('='.repeat(80));
console.log('');

console.log('OVERVIEW STATISTICS');
console.log('-'.repeat(80));
console.log(`Total References: ${stats.total}`);
console.log(`References with Relevance text: ${stats.withRelevance} (${(stats.withRelevance/stats.total*100).toFixed(1)}%)`);
console.log(`References with Primary URL: ${stats.withPrimaryURL} (${(stats.withPrimaryURL/stats.total*100).toFixed(1)}%)`);
console.log(`References with Secondary URL: ${stats.withSecondaryURL} (${(stats.withSecondaryURL/stats.total*100).toFixed(1)}%)`);
console.log(`References with ISBN: ${stats.withISBN} (${(stats.withISBN/stats.total*100).toFixed(1)}%)`);
console.log(`References with DOI: ${stats.withDOI} (${(stats.withDOI/stats.total*100).toFixed(1)}%)`);
console.log(`References with Flags: ${stats.withFlags} (${(stats.withFlags/stats.total*100).toFixed(1)}%)`);
console.log(`  - [VERIFIED] flags: ${stats.verified}`);
console.log('');

console.log('COMPLETENESS ANALYSIS');
console.log('-'.repeat(80));
const complete = stats.total - stats.formatIssues;
console.log(`Fully valid references: ${complete} (${(complete/stats.total*100).toFixed(1)}%)`);
console.log(`References with issues: ${stats.formatIssues} (${(stats.formatIssues/stats.total*100).toFixed(1)}%)`);
console.log(`  - Missing author: ${stats.missingAuthor}`);
console.log(`  - Missing year: ${stats.missingYear}`);
console.log(`  - Missing title: ${stats.missingTitle}`);
console.log(`  - Missing Relevance: ${stats.total - stats.withRelevance}`);
console.log('');

console.log('CRITICAL ISSUES (First 20)');
console.log('-'.repeat(80));
issues.slice(0, 20).forEach(issue => {
    console.log(`[${issue.id}] Line ${issue.line}:`);
    issue.issues.forEach(i => console.log(`  - ${i}`));
});

if (issues.length > 20) {
    console.log(`... and ${issues.length - 20} more references with issues`);
}
console.log('');

// Save detailed issues to file
fs.writeFileSync('reference-analysis-issues.txt',
    issues.map(i => `[${i.id}] Line ${i.line}:\n${i.issues.map(x => '  - ' + x).join('\n')}`).join('\n\n')
);
console.log(`Full issues list saved to: reference-analysis-issues.txt`);
console.log('');

console.log('READY FOR PRODUCTION?');
console.log('-'.repeat(80));
if (complete / stats.total >= 0.95) {
    console.log('✅ EXCELLENT: Over 95% of references are complete');
} else if (complete / stats.total >= 0.90) {
    console.log('⚠️  GOOD: Over 90% of references are complete, some cleanup needed');
} else if (complete / stats.total >= 0.80) {
    console.log('⚠️  MODERATE: Over 80% complete, significant cleanup recommended');
} else {
    console.log('❌ POOR: Less than 80% complete, extensive cleanup required');
}
console.log('');

console.log('='.repeat(80));
