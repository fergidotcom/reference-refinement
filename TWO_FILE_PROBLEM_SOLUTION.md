# Two-File Problem - SOLVED

**Date:** October 28, 2025
**Status:** ✅ RESOLVED

---

## 🐛 The Problem

There were **TWO separate decisions.txt files** in different locations:

1. **Working Directory:** `/Dropbox/Fergi/AI Wrangling/References/decisions.txt`
   - Used by batch processor (WRONG)
   - Where we run commands from

2. **Dropbox Apps Folder:** `/Dropbox/Apps/Reference Refinement/decisions.txt`
   - Used by iPad app (CORRECT)
   - Where iPad app saves/loads data

**Result:** Batch processor and iPad app were modifying DIFFERENT files, causing data loss and confusion.

---

## 🔍 How It Happened

1. Batch processor created refs 107-111 with URLs
2. Saved to working directory decisions.txt
3. iPad app couldn't see the changes (reading from Apps folder)
4. I copied working directory file → Apps folder
5. **Overwrote REF 106 URLs** that user had finalized before

---

## ✅ The Solution

**Created a symlink** - Now there's only ONE file, accessed from both locations:

```bash
# Deleted the duplicate file
rm /Dropbox/Fergi/AI Wrangling/References/decisions.txt

# Created symlink pointing to the CORRECT file
ln -s "/Dropbox/Apps/Reference Refinement/decisions.txt" \
      "/Dropbox/Fergi/AI Wrangling/References/decisions.txt"
```

**Result:**
- ✅ Only ONE physical file exists (in Dropbox Apps folder)
- ✅ Working directory has a symlink pointing to it
- ✅ Batch processor uses symlink → updates real file
- ✅ iPad app reads real file → sees batch updates
- ✅ NO MORE CONFLICTS!

---

## 📊 Final Status (Refs 101-111)

| Ref | Primary | Secondary | Status |
|-----|---------|-----------|--------|
| 101 | ✗ | ✗ | Needs work |
| 102 | ✅ | ✅ | Complete |
| 103 | ✅ | ✅ | Complete |
| 104 | ✅ | ✗ | Partial |
| 105 | ✅ | ✅ | Complete |
| 106 | ✅ | ✅ | **RESTORED** ✅ |
| 107 | ✅ | ✅ | Finalized ✅ |
| 108 | ✅ | ✅ | Finalized ✅ |
| 109 | ✗ | ✗ | Needs manual work |
| 110 | ✗ | ✗ | Needs manual work |
| 111 | ✅ | ✅ | Complete |

---

## 🎯 What Was Restored

**REF 106** (The Web of Politics by Davis):
- **Primary:** https://www.semanticscholar.org/paper/The-Internet-and-Democratic-Discourse...
- **Secondary:** https://www.oxfordbibliographies.com/abstract/document/obo-9780199756841...
- **Status:** FLAGS[FINALIZED]

This was the ONLY ref that got lost during the file copy. Now restored.

---

## 📝 Configuration Updates

**batch-config.yaml:**
- Changed from absolute paths to relative path "decisions.txt"
- Now uses symlink automatically
- No need to specify full paths

**Before:**
```yaml
input_file: "/Users/.../Dropbox/Apps/Reference Refinement/decisions.txt"
output_file: "/Users/.../Dropbox/Apps/Reference Refinement/decisions.txt"
```

**After:**
```yaml
input_file: "decisions.txt"  # Uses symlink
output_file: "decisions.txt"  # Uses symlink
```

---

## ✅ How to Verify It's Working

**Check the symlink:**
```bash
ls -la /Users/joeferguson/Library/CloudStorage/Dropbox/Fergi/AI\ Wrangling/References/decisions.txt
```

Should show:
```
lrwxr-xr-x ... decisions.txt -> /Users/.../Dropbox/Apps/Reference Refinement/decisions.txt
```

**Check they're the same file:**
```bash
# Modify via symlink
echo "TEST" >> /Users/.../References/decisions.txt

# Check real file
tail -1 /Users/.../Dropbox/Apps/Reference Refinement/decisions.txt
# Should show "TEST"
```

---

## 🚫 What NOT to Do

**NEVER:**
- Delete the symlink and create a new regular file
- Copy files between the two locations
- Run batch processor from a different directory
- Manually edit both "files" (they're the same file!)

**ALWAYS:**
- Keep the symlink in place
- Run batch processor from `/Dropbox/Fergi/AI Wrangling/References/`
- Let the symlink handle the routing

---

## 📦 Backups Created

In case anything goes wrong, we have backups:

1. **decisions_backup_before_fix.txt** - Right before fixing REF 106
2. **decisions_broken_format_backup.txt** - From when format was wrong
3. **decisions_backup_2025-10-28T21-08-09.txt** - After batch run
4. All other timestamped backups

---

## 🎓 Lessons Learned

1. **Always verify file locations** before bulk operations
2. **Symlinks are perfect** for ensuring single source of truth
3. **Backups are essential** before any file modifications
4. **Test with small batches** before processing hundreds of refs

---

## ✨ Current System State

- ✅ One source of truth for decisions.txt
- ✅ Batch processor writes to correct file
- ✅ iPad app reads from correct file
- ✅ All refs 102-108 + 111 have URLs
- ✅ REF 106 restored with correct URLs
- ✅ Ready for next batch processing

**System is now stable and ready for continued use!**

---

**Next Steps for User:**
1. Reload iPad app to see all URLs (102-108, 111)
2. Verify REF 106 shows both URLs
3. Process REF 101, 109, 110 manually as needed
4. Continue with next batch (112-116) when ready
