# START HERE - Batch Processor v20.0 Production Run

**Mission:** Process all 139 unfinalized references using batch processor v20.0 with deep URL validation to reassign primary and secondary URLs.

---

## 🎯 YOUR TASK

Run the batch processor v20.0 on all 139 unfinalized references in `decisions.txt`. The batch processor will:

1. **Generate search queries** for each reference (8 queries: 6 primary + 2 secondary)
2. **Search Google** for URL candidates
3. **Rank candidates** using Claude AI (primary/secondary scores)
4. **Deep validate URLs** using content analysis (paywall/login/soft404 detection)
5. **Assign URLs** to references (primary + secondary, only if accessible and score ≥75)
6. **Flag for manual review** if no suitable URLs found
7. **Tag with v20.0** for version tracking

**DO NOT finalize any references** - user will review all recommendations on iPad first.

---

## 📋 PRE-FLIGHT CHECKLIST

Before starting, verify these conditions:

### 1. Check Current State
```bash
cd ~/Library/CloudStorage/Dropbox/Fergi/AI\ Wrangling/References

# Verify correct finalization status
grep "FLAGS\[FINALIZED" decisions.txt | wc -l
# Expected output: 149

# Total references
grep "^\[[0-9]" decisions.txt | wc -l
# Expected output: 288

# Calculation: 288 - 149 = 139 unfinalized ✅
```

### 2. Remove Old Progress File (CRITICAL!)
```bash
rm batch-progress.json 2>/dev/null
echo "Progress file removed"
```

### 3. Verify Selection Logic
```bash
node test-selection.js
# Expected output: "✅ SUCCESS: Correctly selected 139 unfinalized references!"
```

### 4. Verify Configuration
```bash
cat batch-config-v20-full-139.yaml | grep -A5 "selection_mode"
# Expected: selection_mode: "criteria"
#           not_finalized: true
```

---

## 🚀 RUN BATCH PROCESSOR

Once pre-flight checks pass, start the batch processor:

```bash
cd ~/Library/CloudStorage/Dropbox/Fergi/AI\ Wrangling/References

# Start batch processor in foreground (recommended for monitoring)
node batch-processor.js batch-config-v20-full-139.yaml

# OR run in background and monitor log:
nohup node batch-processor.js batch-config-v20-full-139.yaml > batch_v20_run.log 2>&1 &
tail -f batch_v20_run.log
```

---

## ⏱️ WHAT TO EXPECT

**Duration:** 4-5 hours (139 references × ~2 minutes per reference)

**Progress Indicators:**
```
🔄 Processing REF [123]: Title (5/139 - 4%)
  1️⃣  Generating queries...
      ✓ Generated 8 queries
  2️⃣  Searching...
      ✓ Found 47 unique candidates
  3️⃣  Ranking candidates...
      ✓ Ranked 38 candidates
  3.5️⃣ Deep validating candidate URLs...
      ✓ Validated: 25 valid, 13 invalid (checked top 20)
      ⚠️  Issues: 3 paywalled, 2 login-required, 1 soft-404

      Invalid URLs detected:
      ❌ https://www.jstor.org/...
         Paywall detected: JSTOR requires subscription [PAYWALL]

      Top valid candidates:
      P:95 S:15 [Score:100] - https://archive.org/...
      P:90 S:20 [Score:95] - https://example.edu/...

      ✓ Primary: https://archive.org/... (P:95)
      ✓ Secondary: https://scholar.edu/... (S:85)
ℹ️  📌 Tagged with v20.0
✓ REF [123] Complete
```

**Checkpoints:** Progress saved every 5 references (can resume if interrupted)

---

## 📊 EXPECTED RESULTS

After processing all 139 references:

**Primary URLs:**
- 100-120 found (72-86% coverage)
- All accessible (no paywalls, logins, or broken links)
- All scores ≥75 (prefer ≥90)

**Secondary URLs:**
- 90-110 found (65-79% coverage)
- All accessible
- All scores ≥75 (prefer ≥90)

**Manual Review Flagged:**
- 15-30 refs (11-22%) with `FLAGS[MANUAL_REVIEW]`
- These need user research on iPad

**Quality Metrics:**
- ~95% of recommended URLs actually accessible
- <10% expected override rate (down from 25-50% in v16.2)

---

## 🔍 MONITORING & TROUBLESHOOTING

### Monitor Progress in Real-Time

**Option 1: Watch main output**
```bash
# If running in foreground, output shows automatically
```

**Option 2: Watch log file**
```bash
tail -f batch-logs/batch_YYYY-MM-DDTHH-MM-SS.log
```

**Option 3: Check progress file**
```bash
cat batch-progress.json | grep -A2 "completed"
```

### Common Issues & Fixes

**Issue: "Selected 7 references" instead of 139**
```bash
# Cause: Old progress file causing cached state
# Fix:
rm batch-progress.json
node batch-processor.js batch-config-v20-full-139.yaml
```

**Issue: Deep validation timing out**
```bash
# Cause: Some URLs take >15 seconds to validate
# This is normal - batch processor has graceful fallback
# URLs that timeout are marked invalid and skipped
```

**Issue: SSL certificate errors**
```bash
# Already handled - ssl=False in deep_url_validation.py
# These are automatically handled by the validation module
```

**Issue: Rate limiting from Google**
```bash
# Config has conservative delays:
# - 3 seconds between references
# - 1 second after each search
# This should prevent rate limiting
```

---

## 📝 POST-PROCESSING

When batch completes (after 4-5 hours):

### 1. Review Summary Stats
The batch processor will display:
```
📊 Batch Processing Complete

   Processed: 139
   Finalized: 0 (auto-finalize disabled)
   Manual Review: XX
   Total Time: 4h 32m
   Average per Reference: 1m 57s
```

### 2. Check Updated decisions.txt
```bash
# All processed refs now have:
grep "FLAGS\[BATCH_v20.0" decisions.txt | wc -l
# Expected: 139

# Count manual review flags
grep "FLAGS\[MANUAL_REVIEW" decisions.txt | wc -l
# Expected: 15-30
```

### 3. Review Log File
```bash
# Check for any errors or issues
grep "❌\|⚠️\|ERROR" batch-logs/batch_YYYY-MM-DDTHH-MM-SS.log
```

### 4. Create Summary Report
Tell me:
- How many refs processed
- Primary URL coverage (e.g., "112/139 = 81%")
- Secondary URL coverage (e.g., "97/139 = 70%")
- Manual review count (e.g., "18/139 = 13%")
- Any errors or issues encountered

---

## ✅ SUCCESS CRITERIA

Batch run is successful if:

1. ✅ All 139 references processed (no crashes, no interruptions)
2. ✅ Primary URL coverage: 72-86% (100-120 refs)
3. ✅ Secondary URL coverage: 65-79% (90-110 refs)
4. ✅ Manual review: 11-22% (15-30 refs)
5. ✅ All recommended URLs are accessible (no paywalls/logins)
6. ✅ decisions.txt updated with v20.0 tags
7. ✅ Detailed log file created for review

---

## 🎯 WHAT YOU SHOULD DO

**Your workflow:**

1. **Run pre-flight checks** (verify 139 unfinalized, remove progress file)
2. **Start batch processor** (`node batch-processor.js batch-config-v20-full-139.yaml`)
3. **Monitor progress** (watch for errors, checkpoint saves)
4. **Wait for completion** (~4-5 hours)
5. **Report results** (coverage stats, manual review count, any issues)

**Do NOT:**
- ❌ Stop the batch processor mid-run (unless there's an error)
- ❌ Edit decisions.txt while batch is running
- ❌ Open iPad app while batch is running (file conflicts!)
- ❌ Finalize any references (user reviews first)

**Important notes:**
- Batch processor has resume capability if interrupted
- Progress saved every 5 references
- All changes backed up before processing starts
- Can safely Ctrl+C if needed - will resume from checkpoint

---

## 📚 REFERENCE DOCUMENTATION

**Complete technical docs:**
- `BATCH_PROCESSOR_V20_0_RELEASE_NOTES.md` - Full v20.0 documentation
- `batch-config-v20-full-139.yaml` - Configuration file
- `test-selection.js` - Selection verification tool
- `deep_validate_batch.py` - Python validation wrapper

**GitHub commit:** 518595c (v20.0 committed and pushed)

---

## 🚨 IF SOMETHING GOES WRONG

**If batch processor crashes:**
```bash
# Check error in log
tail -50 batch-logs/batch_YYYY-MM-DDTHH-MM-SS.log

# Resume from checkpoint (progress saved every 5 refs)
node batch-processor.js batch-config-v20-full-139.yaml
```

**If results look wrong:**
```bash
# Restore backup
cp decisions_backup_pre_web_session_2025_11_11.txt decisions.txt

# Debug and restart
node test-selection.js  # Verify selection
rm batch-progress.json  # Clear cache
node batch-processor.js batch-config-v20-full-139.yaml
```

**If you need help:**
- Check `BATCH_PROCESSOR_V20_0_RELEASE_NOTES.md` troubleshooting section
- Review the commit message for technical details
- All code is in `batch-processor.js` v20.0

---

## 🎯 FINAL REMINDERS

**Before you start:**
- ✅ Verify 139 unfinalized references (`node test-selection.js`)
- ✅ Remove old progress file (`rm batch-progress.json`)
- ✅ Close iPad app (prevent file conflicts)

**During the run:**
- ⏳ Let it run for 4-5 hours (don't interrupt)
- 👀 Monitor for errors (but don't worry about individual invalid URLs)
- 📊 Checkpoints save every 5 references automatically

**After completion:**
- 📊 Report coverage statistics to user
- 🔍 Check log for any systemic issues
- ✅ Verify decisions.txt was updated correctly

---

**Ready to go! Start with the pre-flight checklist above.**

🚀 **Command to run:** `node batch-processor.js batch-config-v20-full-139.yaml`
