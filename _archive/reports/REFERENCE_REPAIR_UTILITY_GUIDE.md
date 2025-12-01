# Reference Repair Utility - User Guide

**Version:** 1.0
**Created:** October 29, 2025
**File:** `reference-repair-utility.html`

## Purpose

The Reference Repair Utility helps you repair and validate malformed or incomplete bibliographic references. It's designed to handle messy real-world data where references may be missing authors, years, titles, or other critical information.

## What It Can Do

### Robust Parsing
- **Guaranteed Detection:** Extracts [RID] from every reference
- **Flexible Author Detection:** Handles multiple name formats (Last, F. M.; Last, First; Last & Last; CORPORATE.)
- **Smart Year Detection:** Finds years with or without parentheses (1999) or 1999
- **Title Extraction:** Identifies titles even when formatting is inconsistent
- **Relevance Detection:** Finds relevance text with "Relevance:" prefix or uses heuristics
- **Contamination Detection:** Flags references that already have URLs or FLAGS (indicating prior processing)

### Exception Detection & Classification

**🔴 Critical Issues:**
- Missing RID (shouldn't happen per spec, but checked)
- Unparseable structure

**🟡 Warnings:**
- Missing author
- Missing year
- Missing title
- Unclear title (uncertain extraction)

**🔵 Info:**
- Missing relevance text
- Unclear relevance (heuristic detection)
- Missing publication info
- Contains URLs (contamination)
- Contains FLAGS (contamination)

### Interactive Repair
- Click any reference to view detailed parsing
- Edit any field inline (author, year, title, publication, relevance)
- Mark references as "clean" to suppress warnings
- Navigate through filtered references quickly

### Filtering & Sorting
- Filter by: All | Critical | Warnings | Clean | Has Issues
- Sort by: RID | Severity

### Export Options
1. **decisions.txt** - Clean format with FLAGS[UNFINALIZED] for batch processing
2. **Repair Report** - Detailed audit trail of all issues and fixes

## Usage Workflow

### Step 1: Load Source File
1. Open `reference-repair-utility.html` in your browser
2. Click "📁 Load Source File"
3. Select your source file (e.g., "250904 Caught In The Act - REFERENCES ONLY.txt")
4. Wait for parsing to complete

### Step 2: Review Statistics
The Statistics panel shows:
- **Total References** - How many references were found
- **✅ Clean** - References with no detected issues
- **🟡 Warnings** - References missing key fields
- **🔴 Critical** - Serious parsing problems

### Step 3: Filter & Prioritize
1. Use the Filter dropdown to focus on problematic references:
   - Start with "🔴 Critical Only" if any exist
   - Then switch to "🟡 Warnings Only"
2. Sort by "Severity" to work through issues in priority order

### Step 4: Repair Individual References
For each problematic reference:

1. **Click the reference** in the left pane
2. **Review the "Raw Text"** - see the original line as-is
3. **Check "Detected Issues"** - understand what's wrong
4. **Review "Parsed Fields"** - see what the parser extracted:
   - ✅ Found - Field was successfully extracted
   - ⚠️ Uncertain - Parser made a best guess
   - ❌ Missing - Field not detected
5. **Edit fields as needed** - fill in missing information
6. **Click "💾 Save Changes"** - updates the reference and re-runs detection
7. **Or click "✅ Mark as Clean"** - accepts the reference as-is
8. **Click "⏭️ Next"** - moves to next reference in current filter

### Step 5: Validate & Export
Once you've repaired critical and warning issues:

1. Switch filter to "All References" to review final stats
2. Click "💾 Export decisions.txt" to save cleaned references:
   ```
   [1] Author, A. (2020). Title of Work. Publisher.
   FLAGS[UNFINALIZED]
   Relevance: This work is relevant because...

   [2] Author, B. (2019). Another Title. Journal.
   FLAGS[UNFINALIZED]
   Relevance: Discusses the topic...
   ```

3. Click "📊 Export Report" to generate audit trail:
   - Statistics summary
   - Issues grouped by type
   - List of all problematic references
   - Documentation of manual edits

## Input File Requirements

### Guaranteed Elements (REQUIRED)
- Each reference MUST start with `[RID]` where RID is an integer
- Each reference is ONE non-blank line (no internal linefeeds)
- References separated by blank lines (optional but recommended)

### Optional Elements (Parser will try to find these)
- Author name (various formats supported)
- Year (YYYY or (YYYY))
- Title
- Publication info
- Relevance text (with or without "Relevance:" prefix)

### Example Valid Input
```
[1] Smith, J. (2020). Example Title. Example Publisher. Relevance: This is why it matters.

[2] Jones, A. & Brown, B. (2019). Another Example. Journal Name, 10(2), 123-145. This reference discusses important topics related to the research question.

[3] (2018). Untitled Work. Some Publisher.
```

The parser will handle all three examples, flagging missing fields appropriately.

## Export Formats

### decisions.txt Format
```
[RID] Author (Year). Title. Publication.
FLAGS[UNFINALIZED]
Relevance: Description of relevance...

[Next reference...]
```

This format is compatible with the batch processor and iPad app.

### Repair Report Format
```
Reference Repair Report
======================================================
Generated: [timestamp]
Source File: [filename]

STATISTICS
------------------------------------------------------
Total References: 288
Clean: 150 (52%)
Warnings: 120 (42%)
Critical: 18 (6%)
Manually Edited: 25

ISSUES BY TYPE
------------------------------------------------------
NO_AUTHOR: 45 occurrences
  RIDs: 7, 23, 34, 56, ...

NO_YEAR: 12 occurrences
  RIDs: 15, 89, 102, ...

PROBLEMATIC REFERENCES
------------------------------------------------------
[7] Untitled
  Severity: CRITICAL
  Issues: Author not detected, Title not detected
  Status: MANUALLY EDITED

[23] Making Things Happen
  Severity: WARNING
  Issues: Author not detected

...
```

## Tips for Efficient Repair

1. **Start with Critical Issues First** - These likely indicate serious formatting problems
2. **Use "Mark as Clean" for Good-Enough References** - Don't waste time perfecting every field
3. **Batch Similar Issues** - If you see a pattern (e.g., corporate authors), fix them together
4. **Export Often** - Save your progress periodically
5. **Keep the Report** - Documents your repair decisions for future reference

## Technical Notes

### Browser Compatibility
- Tested in modern browsers (Chrome, Firefox, Safari, Edge)
- Uses File API for loading files (no server required)
- All processing happens in-browser (no data uploaded)

### Performance
- Handles 300+ references easily
- Real-time parsing and filtering
- Instant UI updates on edits

### Limitations
- Cannot parse multi-line references (each reference must be one line)
- Heuristic parsing may misidentify fields in unusual formats
- Manual review still required for complex cases

## Troubleshooting

**Problem:** "No references loaded" after selecting file
**Solution:** Check that file contains lines starting with [RID] format

**Problem:** Too many false positives in issue detection
**Solution:** Use "Mark as Clean" to override automatic detection

**Problem:** Parser extracts wrong fields
**Solution:** Manually edit the fields and save changes

**Problem:** Export doesn't include my edits
**Solution:** Make sure you clicked "Save Changes" after editing

## Next Steps After Repair

Once you have a clean `decisions.txt`:

1. **Review the file** - Make sure references are formatted correctly
2. **Run through batch processor** - Use `batch-processor.js` to find URLs
3. **Final validation** - Use iPad app to finalize references

## File Locations

- **Utility:** `/Users/joeferguson/Library/CloudStorage/Dropbox/Fergi/AI Wrangling/References/reference-repair-utility.html`
- **Source File:** `/Users/joeferguson/Library/CloudStorage/Dropbox/Fergi/AI Wrangling/References/250904 Caught In The Act - REFERENCES ONLY.txt`
- **Exports:** Downloaded to browser's default download folder

## Questions?

This utility was designed specifically for the "Caught In The Act" manuscript references. For issues or enhancements, update CLAUDE.md or create documentation.
