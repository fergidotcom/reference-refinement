# Citation Parser - Component 1 of Phase 1

## Overview

The Citation Parser is the foundation of the Reference Refinement v30.0 pipeline. It detects and converts various academic citation formats in Word documents to standardized bracket notation `[123]`.

## What It Does

### Input
- Word document (.docx) with citations in various formats

### Output
- Converted HTML file with standardized `[123]` citations
- Converted text file with standardized `[123]` citations
- Detailed JSON results with:
  - Statistics (citations found, converted, bibliography entries)
  - Conversion log (what changed)
  - Citation locations with context (for database insertion)
  - Warnings and errors

### Supported Citation Formats

1. **Superscript** (¹²³) → `[123]`
   - Most common in academic papers
   - Handles single (¹) and multiple digits (¹²³)
   - Example: "This research shows¹²³ that..." → "This research shows [123] that..."

2. **Parenthetical** ((Author, Year)) → `[X]`
   - Author-date style citations
   - Maps to bibliography entry number
   - Example: "Studies confirm (Smith, 2023) this finding" → "Studies confirm [5] this finding"

3. **Bracket** ([123]) → Preserved as-is
   - Already in standardized format
   - No conversion needed

4. **Empty** ([ ]) → Preserved
   - Placeholder brackets for AI-suggested references
   - Will be filled later in pipeline

## Testing

### Prerequisites

```bash
cd ~/reference-refinement
npm install  # Installs mammoth and other dependencies
```

### Test Data Location

Place test manuscripts in `v30/test-data/`:
- `250714TheMythOfMaleMenopause.docx` (superscript citations)
- `250625AuthoritarianAscentInTheUSA.docx` (superscript citations)
- `250916CaughtInTheAct.docx` (bracket citations)

### Running Tests

```bash
# Test with Myth of Male Menopause (superscript)
node v30/test-citation-parser.js v30/test-data/250714TheMythOfMaleMenopause.docx

# Test with Authoritarian Ascent (superscript)
node v30/test-citation-parser.js v30/test-data/250625AuthoritarianAscentInTheUSA.docx

# Test with Caught In The Act (bracket)
node v30/test-citation-parser.js v30/test-data/250916CaughtInTheAct.docx
```

### Expected Results

**Myth of Male Menopause:**
- Format: superscript
- Expected: ~40-60 citations converted from ¹²³ to [123]
- Bibliography: ~40-60 entries

**Authoritarian Ascent:**
- Format: superscript
- Expected: ~100-150 citations converted from ¹²³ to [123]
- Bibliography: ~100-150 entries

**Caught In The Act:**
- Format: bracket (already standardized)
- Expected: ~288 citations found (no conversion needed)
- Bibliography: ~288 entries

### Output Files

After running, find converted files in same directory as input:
- `<filename>_converted.html` - Styled HTML with citations converted
- `<filename>_converted.txt` - Plain text with citations converted

## Test Output Interpretation

### SUCCESS Criteria
✅ `success: true`
✅ Citations found > 0
✅ Conversion rate near 100%
✅ Bibliography entries detected
✅ No errors

### Common Warnings (Non-Critical)
⚠️ "Could not find bibliography entry for..." - Citation with no matching reference
⚠️ "Output saved as HTML and TXT" - .docx writing not yet implemented (expected)

### FAILURE Indicators
❌ `success: false`
❌ Errors array not empty
❌ Citations found = 0 (when document has citations)
❌ Conversion rate < 90%

## Code Structure

### Main Function
```javascript
const { parseCitations } = require('./server/services/citation-parser');

const results = await parseCitations(docxPath, options);
```

### Options
```javascript
{
    preserveOriginal: true,      // Keep original file
    outputFormat: 'both',         // 'html', 'text', or 'both'
    extractContext: true          // Include paragraph context
}
```

### Results Object
```javascript
{
    success: true/false,
    inputFile: '/path/to/input.docx',
    outputFile: '/path/to/output.html',
    outputTextFile: '/path/to/output.txt',
    stats: {
        citationsFound: 47,
        citationsConverted: 45,
        bibliographyEntries: 50,
        emptyBracketsFound: 2,
        formatDetected: 'superscript',
        paragraphsProcessed: 120
    },
    conversions: [
        {
            original: '¹²³',
            converted: '[123]',
            location: 'Position 4567',
            paragraph: 15
        }
    ],
    citationLocations: [
        {
            citationNumber: 123,
            originalFormat: '¹²³',
            convertedFormat: '[123]',
            position: 4567,
            paragraphIndex: 15,
            context: '...paragraph text with citation...'
        }
    ],
    warnings: [],
    errors: []
}
```

## Integration with Database

The `citationLocations` array is designed for database insertion:

```javascript
// Each location object has everything needed for citations table:
{
    citationNumber: 123,        // Maps to refs.ref_id
    position: 4567,             // Character position in document
    paragraphIndex: 15,         // Paragraph number
    context: '...'              // Surrounding text (for context extraction)
}
```

## Next Steps After Testing

1. **Mac Claude Code tests** with all 3 manuscripts
2. **Report back** with detailed results:
   - What worked perfectly
   - What failed or had warnings
   - Actual vs. expected conversions
   - Any edge cases discovered

3. **Refine code** based on test results:
   - Fix any parsing errors
   - Improve bibliography detection
   - Handle edge cases

4. **Iterate** until all 3 manuscripts work perfectly

5. **Move to Component 2**: Context Extractor

## Known Limitations

### .docx Output Not Implemented
The parser currently outputs HTML and TXT, not .docx. This is intentional for v1:
- HTML preserves structure and can be imported to Word
- TXT is useful for debugging
- Full .docx writing requires additional libraries (docx, docxtemplater)
- Can be added in future version if needed

### Bibliography Detection
The parser looks for common headers:
- "References"
- "Bibliography"
- "Works Cited"
- "Literature Cited"
- "Sources"

If your manuscript uses a different header, add it to the `bibHeaders` array in `extractBibliography()`.

### Parenthetical Citation Mapping
The parser attempts to match (Author, Year) to bibliography entries by:
1. Extracting first author's last name
2. Finding entries that start with that name
3. Checking for year match

This works for most cases but may fail if:
- Bibliography uses different author format (initials only, full names)
- Multiple publications by same author in same year (2023a, 2023b)
- Author name spelling variations

## Troubleshooting

### "Could not locate bibliography section"
- Check that manuscript has a References/Bibliography section
- Check that section header matches one of the expected patterns
- Add your section header to `bibHeaders` array if different

### "Could not parse any bibliography entries"
- Check bibliography format (should be numbered or author-year)
- Verify entries are separated by blank lines or numbered
- Enable debug logging to see what was extracted

### Low conversion rate
- Check if citations are in an unexpected format
- Review conversions array to see what was detected
- May need to add additional regex patterns

### Citations found = 0
- Verify document actually contains citations
- Check citation format (may not match expected patterns)
- Try opening .docx in Word to confirm citations are present

## Development Notes

### Adding New Citation Formats
To add support for new formats:

1. Add detection pattern in `detectFormat()`
2. Create conversion function (e.g., `convertFootnotes()`)
3. Call from `parseCitations()` main function
4. Add test cases

### Improving Bibliography Parsing
To improve bibliography detection:

1. Add new header patterns to `bibHeaders` array
2. Adjust entry parsing logic in `extractBibliography()`
3. Test with various bibliography styles

### Debugging
Enable detailed console logging by adding:
```javascript
console.log('DEBUG:', variableName);
```

The test script shows detailed output including conversions and locations.

## Contact

This component was built by Claude Code Web for Reference Refinement v30.0.

For issues or questions:
1. Review test output carefully
2. Check this README for common issues
3. Report detailed results back for refinement
