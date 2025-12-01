#!/usr/bin/env node

/**
 * Analyze decisions.txt for publisher/location/ISBN contamination in titles
 * The problem: Title parsing captures too much bibliographic metadata
 * Example: "Making the Social World: The Structure of Human Civilization. Oxford: Oxford University Press"
 *   Should extract: "Making the Social World: The Structure of Human Civilization"
 *   Currently extracts: "Making the Social World: The Structure of Human Civilization. Oxford: Oxford University Press"
 */

import fs from 'fs/promises';

async function analyzeBibliographicContamination() {
  console.log('📋 Analyzing bibliographic metadata contamination in titles...\n');

  const content = await fs.readFile('decisions.txt', 'utf-8');
  const lines = content.split('\n');

  const issues = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Match reference line: [123] Author (Year). Title...
    const refMatch = line.match(/^\[(\d+)\]\s+(.+)$/);
    if (!refMatch) continue;
    
    const id = refMatch[1];
    const bibPart = refMatch[2];
    
    // Extract the part after year and before "Relevance:"
    const yearMatch = bibPart.match(/\((\d{4})\)\.\s*(.+?)(?:\s+Relevance:|$)/);
    if (!yearMatch) continue;
    
    const afterYear = yearMatch[2].trim();
    
    // Check for various bibliographic contamination patterns
    const hasPublisher = /(?:University Press|Press|Publishers?|Books|Media|Publishing|Inc\.|Ltd\.|LLC|Corporation)/i.test(afterYear);
    const hasLocation = /(?:New York|London|Oxford|Cambridge|Chicago|Boston|Baltimore|Los Angeles|San Francisco|Washington|Philadelphia)/i.test(afterYear);
    const hasISBN = /ISBN:\s*\d+/i.test(afterYear);
    const hasEdition = /\(\d+(?:st|nd|rd|th)\s+ed\.?\)/i.test(afterYear);
    const hasMultiplePeriods = (afterYear.match(/\./g) || []).length >= 3;
    
    if (hasPublisher || hasLocation || hasISBN || hasEdition || hasMultiplePeriods) {
      // Try to extract clean title (first sentence or before first location/publisher)
      const sentences = afterYear.split(/\.\s+/);
      const firstSentence = sentences[0];
      
      issues.push({
        id: parseInt(id),
        line: i + 1,
        fullAfterYear: afterYear.substring(0, 200),
        extractedTitle: firstSentence,
        hasPublisher,
        hasLocation,
        hasISBN,
        hasEdition,
        hasMultiplePeriods,
        severity: (hasPublisher ? 1 : 0) + (hasLocation ? 1 : 0) + (hasISBN ? 1 : 0) + (hasEdition ? 1 : 0)
      });
    }
  }

  // Sort by severity (most contaminated first)
  issues.sort((a, b) => b.severity - a.severity);

  console.log(`Found ${issues.length} references with potential bibliographic contamination:\n`);

  // Stats
  const publisherCount = issues.filter(i => i.hasPublisher).length;
  const locationCount = issues.filter(i => i.hasLocation).length;
  const isbnCount = issues.filter(i => i.hasISBN).length;
  const editionCount = issues.filter(i => i.hasEdition).length;

  console.log(`📊 Contamination Summary:`);
  console.log(`   Publisher names: ${publisherCount}`);
  console.log(`   Location names: ${locationCount}`);
  console.log(`   ISBN numbers: ${isbnCount}`);
  console.log(`   Edition info: ${editionCount}\n`);

  // Show first 15 examples
  console.log(`📝 Top 15 Examples (by severity):\n`);
  console.log('─'.repeat(80));

  for (const issue of issues.slice(0, 15)) {
    console.log(`\n[${issue.id}] Line ${issue.line} | Severity: ${issue.severity}`);
    
    const flags = [];
    if (issue.hasPublisher) flags.push('Publisher');
    if (issue.hasLocation) flags.push('Location');
    if (issue.hasISBN) flags.push('ISBN');
    if (issue.hasEdition) flags.push('Edition');
    
    console.log(`  Issues: ${flags.join(', ')}`);
    console.log(`\n  Current (contaminated): "${issue.fullAfterYear}${issue.fullAfterYear.length === 200 ? '...' : ''}"`);
    console.log(`  Should be: "${issue.extractedTitle}"`);
    console.log('\n' + '─'.repeat(80));
  }

  console.log(`\n✅ Analysis complete. Found ${issues.length} references with bibliographic contamination.`);
  console.log(`\n💡 Impact on AI functions:`);
  console.log(`   - Query generation uses contaminated titles → poor search queries`);
  console.log(`   - Autorank looks for exact title match → rarely finds it`);
  console.log(`   - Search results fail to match because title includes publisher/location`);

  // Save report
  await fs.writeFile('publisher-contamination-report.json', JSON.stringify(issues, null, 2));
  console.log(`\n📄 Detailed report saved to: publisher-contamination-report.json`);

  return issues;
}

analyzeBibliographicContamination().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
