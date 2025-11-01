# v14.1 Analysis - Autorank Refinement

**Based on:** System log `session_2025-10-28T02-33-00.txt` (Oct 27, 20:33)
**Date:** October 27, 2025
**Status:** Analysis complete - awaiting approval for implementation

---

## Test Results from v14.0

### **Reference #7: Searle (2010) "Making the Social World"**

**Query generation:** ✅ Working as designed
- Q1-Q3: Full-text PDF queries (working)
- Q4: Oxford University Press publisher page (working)
- Q5-Q7: Review queries (working)
- Q8: Topic query (working)

**Results:** 60 candidates found

**PRIMARY Override:**
```
AI Recommended: archive.org (P:95, S:40)
AI's Reasoning: "Free full-text from archive.org"

User Selected: Duke PDF (P:85, S:30) - Ranked #57
User's Reason: "This is actually a full source pdf where the recommended primary is not."
```

**Problem:** AI scored archive.org as P:95 ("free full-text") but it was NOT actually the full text.

---

**SECONDARY Override:**
```
AI Recommended: philpapers.org/rec/SEAMTS (P:50, S:95)
AI's Reasoning: "Review article"

User Selected: d-nb.info (P:40, S:95) - Ranked #1
User's Reason: "Book review is in the title and this is a perfect secondary.
Reviews trump other types of sites. The suggested secondary is a general
page about the reference but no review or analysis."
```

**Problem:** AI called PhilPapers entry a "review article" but it was just a bibliography page listing metadata about the book.

---

### **Reference #8: Hacking (1999) "The Social Construction of What?"**

**Results:** 56 candidates found

**PRIMARY Override:**
```
AI Recommended: journals.uchicago.edu/doi/pdfplus/... (P:95, S:40)
AI's Reasoning: "Free PDF from edu domain"

User Selected: larvalsubjects.files.wordpress.com PDF (P:95, S:30) - Ranked #1
User's Reason: "The suggested primary was a review rather than full text.
The author of the review is on the first page. The Autorank needs examine
candidates more carefully to distinguish reviews from full source."
```

**Problem:** AI scored a PDF from .edu domain as P:95 ("free PDF") but it was actually a BOOK REVIEW, not the book itself.

---

**SECONDARY Override:**
```
AI Recommended: philpapers.org/rec/HACTSC (P:40, S:95)
AI's Reasoning: "Review article"

User Selected: journals.sagepub.com PDF (P:50, S:85) - Ranked #7
User's Reason: "This is a book review, very clearly from a close
examination of this site."
```

**Problem:** Again, PhilPapers entry is not a review - it's a metadata page. The actual review (SAGE PDF) was ranked lower.

---

## Root Cause Analysis

### **Primary Detection Problem**

**Current ranking logic:**
```
PRIMARY SCORE:
1. FREE full-text (.edu/.gov/archive): 95-100
2. FREE full-text (other domains): 85-95
3. Paywalled full-text: 70-85
4. Publisher/purchase page: 60-75
5. Review/citation: 35-55
```

**What's wrong:**
- AI judges by **URL domain and snippet**, not actual content
- Cannot distinguish:
  - Book review PDF from book PDF
  - Archive.org preview page from full-text page
  - Bibliography entry from the work itself

**Evidence:**
- archive.org got P:95 (assumed full-text) but wasn't
- UChicago edu PDF got P:95 (free PDF!) but was a review

---

### **Secondary Detection Problem**

**Current ranking logic:**
```
SECONDARY SCORE:
1. Review of THIS WORK (title appears): 90-100
2. Discussion of THIS WORK: 75-90
3. Topic discussion: 55-70
```

**What's wrong:**
- AI cannot distinguish:
  - Actual book review (with analysis/critique)
  - Bibliography entry (just metadata listing)
  - General "about this work" page

**Evidence:**
- PhilPapers entries scored S:95 (marked as "review article")
- But PhilPapers = bibliography database, not reviews
- Actual reviews (d-nb.info, SAGE) were ranked lower or equal

---

## User Feedback

**Key comment:**
> "Scholarly reviews are best but rank other reviews as well."

**Translation:**
- Academic/journal reviews are ideal (highest S score)
- But non-academic reviews (blogs, magazines) should also rank well
- The key is: it must be a REVIEW (analysis/critique), not just a listing

**UI Issue:**
> "Move the message flashes higher in the Edit Reference Window so they
> don't obscure the Done, Save Changes and Finalize buttons."

Toast messages are blocking bottom buttons.

---

## v14.1 Proposed Improvements

### **1. Enhanced Primary Detection**

**Add explicit content-type signals to ranking prompt:**

```
PRIMARY SCORE - Enhanced detection:

FULL-TEXT INDICATORS (95-100):
✓ File is PDF with author as creator/author field
✓ URL contains book title + author in path (e.g., /searle-making-social/)
✓ Snippet mentions "full text", "complete book", "entire work"
✓ Domain is academic repository (.edu, .gov, archive.org, researchgate)

REVIEW INDICATORS (35-55):
⚠️ Title contains "review of", "book review", "reviewed by"
⚠️ Snippet mentions "reviewer", "this review", "I argue that"
⚠️ Author of review is different from book author
⚠️ Journal/magazine domain (even if .edu)

PUBLISHER PAGE INDICATORS (60-75):
• URL contains "product", "book", "isbn", "buy"
• Domain is publisher (oup.com, harvard.edu/press, cambridge.org)
• Snippet mentions price, ISBN, table of contents

AMBIGUOUS ARCHIVE.ORG (investigate carefully):
? archive.org URLs may be preview-only (not full text)
? Check snippet for "borrow", "preview", "limited view"
? Lower score to 85-90 if uncertain
```

---

### **2. Enhanced Secondary Detection**

**Add explicit review-type classification:**

```
SECONDARY SCORE - Enhanced detection:

SCHOLARLY BOOK REVIEWS (90-100):
✓ From academic journal domain (.edu, journal publishers)
✓ Title explicitly says "review" or "reviewed by"
✓ Snippet discusses merits/flaws of the work
✓ Cites specific pages or chapters

NON-ACADEMIC REVIEWS (75-90):
✓ Magazine, blog, or news review
✓ Contains critical analysis or discussion
✓ Title includes "review", "critique", "thoughts on"

BIBLIOGRAPHY/METADATA PAGES (40-55):
⚠️ PhilPapers, WorldCat, Library catalog entries
⚠️ Just lists title, author, ISBN, abstract
⚠️ No analysis or critique present
⚠️ Even if domain says "philpapers.org/rec/..."

DISCUSSION OF WORK (60-75):
• Academic paper that cites/discusses the work
• Blog post analyzing themes from the work
• But not explicitly framed as a review
```

---

### **3. Scoring Adjustments**

**Current problem:** Both archive.org and actual PDF scored P:95

**Proposed scoring tiers:**

**PRIMARY:**
```
100: Confirmed full-text PDF (author metadata, complete work signals)
95:  Very likely full-text (academic domain + PDF + title match)
90:  Likely full-text but uncertain (archive.org with "borrow" signal)
85:  Free full-text from non-academic domain
75:  Paywalled full-text or publisher preview
65:  Publisher purchase page
50:  Uncertain if full-text or review
35:  Confirmed review (not the source)
```

**SECONDARY:**
```
100: Confirmed scholarly book review (journal + "review" in title)
90:  Very likely review (review signals + critical discussion)
85:  Non-academic review (blog/magazine review)
75:  Academic discussion of the work (cites it, not reviewing it)
65:  General "about this work" page with analysis
50:  Bibliography/metadata page (PhilPapers, library catalogs)
40:  Related work or topic discussion
```

---

### **4. Improved Ranking Prompt**

**Key additions:**

```
CRITICAL DISTINCTION - PRIMARY:
Before scoring, determine: Is this the WORK ITSELF or ABOUT the work?

WORK ITSELF signals:
- PDF filename matches book title
- No "review" or "reviewer" language
- Author field matches book author (for PDFs)
- Full chapters/complete text mentioned

ABOUT THE WORK signals:
- "Review of [title]" or "Reviewed by [name]"
- "I argue that Searle's argument..."
- Different author than the book
- Journal article format

If ABOUT THE WORK → Maximum primary score is 55, even from .edu domain

---

CRITICAL DISTINCTION - SECONDARY:
Before scoring, determine: Is this a REVIEW or just a LISTING?

REVIEW signals:
- Title contains "review", "critique", "thoughts on"
- Discusses strengths/weaknesses
- Quotes or analyzes specific passages
- Written in first person or evaluative tone

LISTING signals:
- Just shows: Title, Author, ISBN, Publisher, Abstract
- PhilPapers entries (bibliography database)
- Library catalog entries
- No evaluative or analytical language

If just a LISTING → Maximum secondary score is 55
If true REVIEW → Score 85-100 depending on source
```

---

### **5. UI Fix: Toast Position**

**Problem:** Toast messages at bottom obscure action buttons

**Solution:**
```css
/* Current toast position */
.toast {
  bottom: 2rem; /* Conflicts with buttons */
}

/* New toast position */
.toast {
  top: 5rem;  /* Below header, well above buttons */
  bottom: auto;
}
```

---

## Expected Improvements (v14.1)

### **Reference #7 (Searle) - Expected behavior:**

**PRIMARY:**
```
❌ OLD: archive.org (P:95) - but wasn't full text
✅ NEW: Should score archive.org lower (P:85-90) if snippet shows "borrow"
✅ NEW: Duke PDF (P:95-100) - actual full text, confirmed by signals
```

**SECONDARY:**
```
❌ OLD: PhilPapers (S:95) - just a bibliography entry
✅ NEW: Should score PhilPapers lower (S:50) - detected as listing
✅ NEW: d-nb.info review (S:95-100) - actual review with "review" in title
```

---

### **Reference #8 (Hacking) - Expected behavior:**

**PRIMARY:**
```
❌ OLD: UChicago journal PDF (P:95) - but was a review
✅ NEW: Should detect "review" signals and score as (P:40) max
✅ NEW: WordPress PDF (P:95) - actual book, no review signals
```

**SECONDARY:**
```
❌ OLD: PhilPapers (S:95) - bibliography entry again
✅ NEW: PhilPapers (S:50) - correctly classified as listing
✅ NEW: SAGE journal PDF (S:95-100) - actual book review from journal
```

---

## Implementation Plan

### **Files to modify:**

1. **netlify/functions/llm-rank.ts** - Enhanced ranking prompt with content-type detection
2. **index.html** - CSS fix for toast positioning

### **No changes needed:**
- Query generation (v14.0 working well)
- UI header (RID display working)
- Batch sizing (15 is good)

---

## Testing Strategy

**After v14.1 deployment:**

1. **Retest Reference #7 (Searle)**
   - Verify Duke PDF scores higher than archive.org
   - Verify d-nb.info review scores higher than PhilPapers

2. **Retest Reference #8 (Hacking)**
   - Verify WordPress PDF scores higher than UChicago review
   - Verify SAGE review scores higher than PhilPapers

3. **New test cases:**
   - Reference with only archive.org "preview" (not full text)
   - Reference with both scholarly and blog reviews
   - Reference where PhilPapers is the only secondary option

---

## Success Metrics

**Goal:** Reduce override rate from 100% (4/4 in v14.0 test) to <25%

**Key indicators:**
- Primary: AI correctly distinguishes full-text from reviews
- Secondary: AI correctly distinguishes reviews from bibliography pages
- User accepts AI recommendations more often

---

## User Notes Captured

**From log:**
- "Scholarly reviews are best but rank other reviews as well."
- "Move the message flashes higher in the Edit Reference Window so they don't obscure the Done, Save Changes and Finalize buttons."

**Interpretation:**
1. Academic journal reviews = highest priority (S:90-100)
2. Other reviews (blogs, magazines) = also valuable (S:75-90)
3. Non-reviews (listings, general pages) = lower priority (S:40-60)
4. UI issue needs fixing

---

## Summary for v14.1

**Core problem:** AI cannot see PDF content or full page details. It judges by:
- URL patterns (.edu, archive.org, etc.)
- Snippets (which may say "free PDF" even for reviews)
- Domain reputation

**v14.1 solution:** Give AI explicit heuristics to detect content type:
- WORK ITSELF vs ABOUT THE WORK (for primaries)
- REVIEW vs LISTING (for secondaries)
- Use multiple signals: title keywords, author names, snippet language, URL patterns

**Plus:** Fix toast positioning UI issue

**Risk:** Heuristics may not be 100% accurate, but should significantly improve over v14.0's domain-based approach.

---

**Ready for implementation once approved.**
