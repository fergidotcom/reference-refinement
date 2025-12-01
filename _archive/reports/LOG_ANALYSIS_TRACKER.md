# System Log Analysis Tracker

This file tracks which session debug logs have been analyzed by Claude Code.

## Format
- ✅ = Fully analyzed with action items extracted
- 📋 = Noted but not fully analyzed
- 🔄 = Partial analysis, needs follow-up

---

## Analysis Log

### 2025-10-27 (Session with User)

**✅ session_2025-10-28T01-43-46.txt** (Oct 27, 19:43)
- **Reference:** #7 - Searle (2010) "Making the Social World"
- **User Comment Summary:**
  - Add RID to edit reference window header
  - Primary (OUP page P:95) is good but full text source would be better
  - Should not be paywalled
  - **ENHANCEMENT REQUEST:** Query generator should focus:
    - **PRIMARY queries:** 3 out of 4 for full source in any form (PDF preferred, not paywalled)
    - **PRIMARY queries:** 1 out of 4 for publisher page or purchase page
    - **SECONDARY queries:** 3 out of 4 for reviews/analyses of the reference work
    - **SECONDARY queries:** 1 out of 4 for discussions of the reference topic
- **Action Items:**
  - [x] Add RID to edit window header (v14.0 - COMPLETED)
  - [x] Redesign query generation with 3:1 ratio (v14.0 - COMPLETED)
  - [x] Update ranking criteria to match new query priorities (v14.0 - COMPLETED)
- **Analysis Date:** 2025-10-27
- **Implementation Date:** 2025-10-27 (v14.0 deployed)

**✅ session_2025-10-27T21-37-35.txt** (Oct 27, 15:37)
- **Reference:** #6 - Searle (1995) "Construction of Social Reality"
- **User Comment:** None - accepted AI recommendations
- **Outcome:** Both recommendations accepted (no overrides)
- **Analysis Date:** 2025-10-27

**✅ session_2025-10-27T16-52-16.txt** (Oct 27, 10:52)
- **Reference:** #5 - Tversky & Kahneman (1974)
- **User Comments:**
  - Why P:80 beats P:100 candidates?
  - Candidates not sorting by focal score
  - UI state not updating after override
  - **Secondary ranking needs work** - inappropriate material ranking too high
- **Action Items:**
  - [x] Fixed autorank to prioritize highest scores (v13.12)
  - [x] UI sorting already worked correctly
  - [ ] Secondary ranking criteria still needs refinement
- **Analysis Date:** 2025-10-27

---

## Older Logs (Pre-v13.12)

**📋 session_2025-10-27T03-53-47.txt** (Oct 26, 21:53)
**📋 session_2025-10-27T03-32-09.txt** (Oct 26, 21:32)
**📋 session_2025-10-27T02-47-23.txt** (Oct 26, 20:47)
**📋 session_2025-10-27T02-44-22.txt** (Oct 26, 20:44)

*Note: These contain override examples used to inform v13.12 design*

---

---

**✅ session_2025-10-28T02-33-00.txt** (Oct 27, 20:33)
- **References:** #7 (Searle 2010) + #8 (Hacking 1999)
- **Testing:** v14.0 query generation and autorank
- **User Comments:**
  - "Scholarly reviews are best but rank other reviews as well."
  - "Move the message flashes higher in the Edit Reference Window so they don't obscure the Done, Save Changes and Finalize buttons."
- **Overrides:** 4 total (2 primary, 2 secondary)
- **Primary Issues:**
  - Archive.org scored P:95 but wasn't full text
  - UChicago journal PDF scored P:95 but was a review, not the book
- **Secondary Issues:**
  - PhilPapers entries scored S:95 as "review article" but were just bibliography listings
  - Actual reviews (d-nb.info, SAGE) ranked lower
- **Root Cause:** AI judges by URL/domain/snippet, cannot distinguish:
  - Book vs. book review (for primaries)
  - Actual review vs. bibliography listing (for secondaries)
- **Action Items:**
  - [x] v14.1: Enhanced content-type detection in ranking prompt (COMPLETED)
  - [x] v14.1: Move toast messages higher (UI fix) (COMPLETED)
- **Analysis Date:** 2025-10-27
- **Implementation Date:** 2025-10-27 (v14.1 deployed)
- **Full Analysis:** V14_1_ANALYSIS.md

---

---

**✅ session_2025-10-28T02-59-26.txt** (Oct 27, 20:59)
- **References:** #8 (Hacking 1999 - retest) + #100 (Zarefsky 1990)
- **Testing:** v14.1 content-type detection
- **Overrides:** 2 total (1 secondary, 1 primary)
- **Results:**
  - Ref #8 Primary: ✅ ACCEPTED (AI correctly identified WordPress PDF as book)
  - Ref #8 Secondary: ❌ Override - AI suggested complete-review.com (review site), user wanted SAGE journal review
  - Ref #100 Primary: ❌ Override - AI suggested books.google.li (German), user wanted UChicago Press
- **User Comments:**
  - "This is a book review, as it states on the first page. THE SUGGESTED SECONDARY WAS clearly not. Refine the ai analysis in Autorank. This is sonnet doing the analysis. Surely sonnet can do this well if it has a big enough bite of each candidate site to analyze. Do better."
  - "The suggested primary was a German language site."
- **Root Cause:**
  - Review *website* (complete-review.com) scored same as review *article* (SAGE journal)
  - Language detection missing (books.google.li = German content)
- **Override Rate:** 50% (down from 100% in v14.0, but goal is <25%)
- **Action Items:**
  - [x] v14.2: Add query allocation control (user-configurable primary/secondary split) (COMPLETED)
  - [x] v14.2: Enhanced cost tracking in debug log (real-time + projections) (COMPLETED)
  - [x] v14.2: Detect review websites vs review articles (complete-review.com → max S:60) (COMPLETED)
  - [x] v14.2: Detect non-English domains (books.google.li → max P:70) (COMPLETED)
- **Analysis Date:** 2025-10-27
- **Implementation Date:** 2025-10-27 (v14.2 deployed)
- **Full Design:** V14_2_DESIGN.md

---

## Next Log to Analyze

Check for new logs with:
```bash
ls -lat "/Users/joeferguson/Library/CloudStorage/Dropbox/Apps/Reference Refinement/debug_logs/" | head -5
```

Last checked: 2025-10-27 21:15 PST
