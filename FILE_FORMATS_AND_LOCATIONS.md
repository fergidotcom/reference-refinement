# Reference Refinement - File Formats and Locations

**Last Updated:** November 20, 2025
**Batch Processor Version:** v22.0
**iPad App Version:** v18.6.3

---

## Production Files

### iPad App Production File

**Location:**
`/Users/joeferguson/Library/CloudStorage/Dropbox/Apps/Reference Refinement/CaughtInTheActDecisions.txt`

**Format:** YAML (despite .txt extension)
**Size:** ~636 KB
**Total References:** 288
**Project:** Caught In The Act manuscript

**Why .txt extension for YAML?**
- Legacy naming from when file was text format
- iPad app has hardcoded path expecting .txt extension
- Changing would require iPad app update
- **Recommendation:** Keep .txt for existing files, use .yaml for new projects

**Structure:**
```yaml
references:
  - id: '1'
    citation: '[1] Author (Year). Title. Publisher.'
    finalized: true
    context: null  # Manuscript paragraph citing this ref
    relevance: 'Why this reference supports the argument...'
    flags:
      - BATCH_v22.0
    urls:
      primary: https://example.com/primary
      secondary: https://example.com/secondary
      tertiary: null
    queries: []
```

---

## Local Development Files

### Main Reference Refinement Directory

**Location:**
`/Users/joeferguson/Library/CloudStorage/Dropbox/Fergi/AI Wrangling/References/`

**Contents:**
- `batch-processor.js` - v22.0 with YAML support
- `batch-utils.js` - Parsing/formatting utilities (supports both formats)
- `batch-config-*.yaml` - Configuration files for batch runs
- `index.html` - v17.2 (local development version)
- `rr_v18.*.html` - Newer versions (v18.5.2 is latest)
- `decisions.txt` - Symlink to `/Apps/Reference Refinement/decisions.txt` (old production)

**Old Production File (Text Format):**
`decisions.txt` → 321 KB, Nov 13, 2025
- **Format:** Legacy text format
- **References:** 288 total, 191 finalized, 97 unfinalized
- **Status:** Superseded by CaughtInTheActDecisions.txt
- **Keep for:** Backward compatibility testing

---

## Format Detection Logic

### Batch Processor (v22.0)

**Auto-Detection on READ:**
```javascript
// In batch-utils.js parseDecisionsFile()
const isYAML = content.trim().startsWith('references:') || content.trim().startsWith('---');
if (isYAML) {
    return parseYamlFile(content);  // Parse as YAML
}
// else parse as legacy text format
```

**Auto-Detection on WRITE:**
```javascript
// In batch-utils.js formatDecisionsFile()
const hasContextField = references[0].hasOwnProperty('context');
if (hasContextField) {
    return formatYamlFile(references);  // Write as YAML
}
// else write as legacy text format
```

**Key Insight:** The `context` field only exists in YAML format, so its presence indicates YAML input.

---

## Format Comparison

| Feature | YAML Format | Text Format |
|---------|------------|-------------|
| **Extension** | .txt or .yaml | .txt |
| **Structure** | Multi-line, hierarchical | Single-line per ref |
| **Context Field** | ✅ Supported | ❌ Not supported |
| **Relevance Field** | ✅ Multi-line | ✅ Single-line only |
| **URLs** | Structured object | Bracket notation |
| **Flags** | Array | Space-delimited string |
| **Readability** | High (structured) | Medium (compact) |
| **File Size** | Larger (~2x) | Smaller |

### YAML Format Example:
```yaml
references:
  - id: '107'
    citation: '[107] Smith, J. (2020). Title. Journal, 10(2), 123-145.'
    finalized: true
    context: 'Manuscript paragraph...'
    relevance: |-
      Multi-line relevance text
      can span multiple lines
      with proper formatting.
    flags:
      - BATCH_v22.0
    urls:
      primary: https://example.com
      secondary: null
      tertiary: null
    queries:
      - 'Smith Title Journal 2020'
```

### Text Format Example:
```
[107] Smith, J. (2020). Title. Journal, 10(2), 123-145. Relevance: Single-line relevance text. FLAGS[FINALIZED BATCH_v22.0] PRIMARY_URL[https://example.com]
```

---

## Version Flags

### Current Standard (v22.0)

**Format:** `BATCH_vX.X`
**Example:** `BATCH_v22.0`

**Cleared on Processing:**
- All old version flags (`v30.0_PHASE1_BASELINE`, `V21.0`, etc.)
- Old batch flags (`BATCH_v20.0`, `BATCH_v21.0`)
- Web session flags (`WEB_SESSION`)

**Preserved:**
- Current batch version for newly processed refs
- No flags for finalized refs that weren't reprocessed

---

## Backup Strategy

### Automatic Backups

**Batch Processor:**
- Creates timestamped backup before processing
- Format: `decisions_backup_YYYYMMDD_HHMMSS.txt`
- Location: Same directory as input file

**iPad App:**
- Creates backups on save
- Format: `decisions_backup_YYYY-MM-DDTHH-MM-SS.txt`
- Location: `/Apps/Reference Refinement/`

### Manual Backups

**Recommended:**
- Before major batch runs
- Before format migrations
- After significant manual editing

**Dropbox Version History:**
- All files have 30-day version history
- Can recover any version from Dropbox web interface
- Automatic protection against accidental deletion

---

## Migration Guide

### Converting Text → YAML

1. Read text file with `parseDecisionsFile(content)`
2. References will have `context` field added (set to null)
3. Write with `formatDecisionsFile(references)`
4. Auto-detects context field → writes YAML

### Converting YAML → Text

1. Read YAML file with `parseDecisionsFile(content)`
2. Remove context field: `delete ref.context` for each ref
3. Write with `formatDecisionsFile(references, 'text')`
4. Force text format output

**Note:** Converting YAML → Text loses context and multi-line relevance formatting.

---

## Best Practices

### File Naming

**Production Files:**
- Use descriptive project names
- Keep .txt extension if iPad app expects it
- Example: `CaughtInTheActDecisions.txt`

**New Projects:**
- Use .yaml extension for clarity
- Example: `NewManuscriptDecisions.yaml`

**Backups:**
- Always include timestamp
- Format: `ProjectName_backup_YYYYMMDD_HHMMSS.ext`

### Format Selection

**Use YAML when:**
- ✅ Need manuscript context per reference
- ✅ Want multi-line relevance text
- ✅ Working with newer iPad app (v18.5+)
- ✅ Need structured, readable format

**Use Text when:**
- ✅ Backward compatibility required
- ✅ Minimal file size preferred
- ✅ Single-line relevance sufficient
- ✅ Working with older tools

### Batch Processing

**Always:**
- Create backup before batch run
- Use correct config file for your file
- Verify format detection in logs
- Check output preserves input format

**Never:**
- Run batch processor while iPad app is open
- Process finalized references unnecessarily
- Mix formats in same project

---

## Troubleshooting

### "Loaded 0 references"

**Cause:** Format mismatch - trying to parse YAML as text or vice versa

**Solution:** Check file starts with `references:` (YAML) or `[1]` (text)

### "Output format changed"

**Cause:** Auto-detection failed

**Solution:** Check references have `context` field for YAML output

### "Flags disappeared"

**Cause:** v22.0 clears old version flags

**Expected:** Old flags (v30.0_*, BATCH_v20.0) are intentionally removed

### "File size doubled"

**Cause:** Text → YAML conversion

**Expected:** YAML format is larger due to structure and multi-line fields

---

## Quick Reference

### File Locations Cheat Sheet

```bash
# Production (iPad viewing)
/Users/joeferguson/Library/CloudStorage/Dropbox/Apps/Reference\ Refinement/CaughtInTheActDecisions.txt

# Development
cd ~/Library/CloudStorage/Dropbox/Fergi/AI\ Wrangling/References/

# Backups
ls -lh /Users/joeferguson/Library/CloudStorage/Dropbox/Apps/Reference\ Refinement/*backup*

# Logs
tail -f ~/Library/CloudStorage/Dropbox/Fergi/AI\ Wrangling/References/batch-logs/batch_*.log
```

### Format Detection

```bash
# Check if file is YAML
head -1 CaughtInTheActDecisions.txt
# Output: "references:" = YAML
# Output: "[1] Author..." = Text

# Check context field (YAML-only)
grep -c "context:" CaughtInTheActDecisions.txt
# >0 = YAML, 0 = Text
```

---

**For Questions:** See CLAUDE.md or batch-processor.js comments
