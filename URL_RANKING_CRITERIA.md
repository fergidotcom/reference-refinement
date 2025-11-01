# URL Selection Criteria (v14.5)

**Last Updated:** October 28, 2025
**System:** Reference Refinement Tool
**Location:** netlify/functions/llm-rank.ts (shared by iPad app and batch processor)

---

## Core Principle: Mutual Exclusivity

**A URL should be EITHER a primary candidate OR a secondary candidate, not both.**

- Full-text sources and publisher pages → **HIGH primary, LOW secondary**
- Reviews and analyses → **LOW primary, HIGH secondary**

---

## PRIMARY URL Criteria (0-100 score)

### Purpose
Find **THE WORK ITSELF** - the actual source material being referenced.

### Critical Rules

**Mutual Exclusivity:**
- Full-text sources and publisher pages → HIGH PRIMARY scores (60-100)
- Reviews, analyses, thematic discussions → LOW PRIMARY scores (0-55), HIGH SECONDARY scores
- A URL should be EITHER a primary candidate OR a secondary candidate, not both

### Scoring Tiers

#### LANGUAGE MISMATCH (max 70)
⚠️ **CRITICAL:** Non-English domain indicators → MAX SCORE 70

**Indicators:**
- Domains: `.de` (German), `.fr` (French), `.li` (Liechtenstein/German), `.es` (Spanish), `.it` (Italian), `.jp` (Japanese), `.cn` (Chinese)
- Examples: `books.google.li`, `books.google.de`, `books.google.fr` → Likely non-English content
- **Exception:** If snippet clearly shows English text, score normally

**Rationale:** Non-English sources aren't useful for English-language manuscripts.

---

#### FULL-TEXT SOURCE INDICATORS (95-100)
✓ Best possible primary URL

**Indicators:**
- Title/URL matches book title (no "review" language)
- Snippet mentions "full text", "complete", "entire work", "read online"
- PDF/HTML from academic repository (`.edu`, `.gov`, `archive.org`, `researchgate.net`)
- No reviewer or different author mentioned in snippet
- English language domain (`.com`, `.edu`, `.org`, `.gov`, `.uk`)

**Examples:**
- `archive.org/details/presidentreagan000cann` ✅
- `cornell.edu/papers/Inventingtheinternet.pdf` ✅
- `uvm.edu/~dguber/POLS293/articles/iyengar.pdf` ✅

---

#### FULL-TEXT (uncertain) (85-95)
✓ Good primary URL, but not guaranteed full text

**Indicators:**
- Free PDF/HTML from non-academic domains
- Archive.org links with "borrow" or "preview" signals (not guaranteed full text)
- Snippet unclear about completeness

**Examples:**
- `wordpress.com/.../book-title.pdf` (might be full text)
- `archive.org/details/book` with "borrow" signal

---

#### PAYWALLED/PREVIEW (70-85)
✓ Acceptable primary URL if free sources not available

**Indicators:**
- Publisher site with preview access
- Paywalled full text access

**Examples:**
- `jstor.org/stable/...` (requires subscription)
- `springer.com/article/...` (behind paywall)

---

#### PUBLISHER PAGE (60-75)
✓ Last resort primary URL (better than nothing)

**Indicators:**
- Official purchase page (no full text)
- URL contains "product", "buy", "isbn"

**Examples:**
- `routledge.com/Televised-Presidential-Debates/.../9780805816037`
- `amazon.com/President-Reagan-Lifetime/.../9780671542948`

---

#### REVIEW/ABOUT THE WORK (max 55)
❌ **NOT a primary candidate** - this is secondary material

⚠️ **CRITICAL:** If title contains "review of", "book review", "reviewed by" → MAX SCORE 55

**Indicators:**
- Title contains "review of", "book review", "reviewed by"
- Snippet mentions "reviewer", "I argue that", "this review"
- Author name in snippet differs from book author
- From journal domain but appears to be a review article
- Even if from `.edu` or as PDF, reviews are NOT the source

**Examples:**
- `nytimes.com/1991/04/24/books/books-of-the-times-damning-a-president...` → S:90, P:40 ✅
- `jstor.org/stable/2151744` (review article) → S:85, P:45 ✅

---

#### WRONG WORK (0-30)
❌ Completely wrong

**Indicators:**
- Different book/article entirely
- Unrelated content
- Wrong author or wrong title

---

## SECONDARY URL Criteria (0-100 score)

### Purpose
Find **CONTENT ABOUT THE WORK** - reviews, analyses, or explorations of the work's themes.

### Critical Rules

**Mutual Exclusivity:**
- If PRIMARY score is 70+: This is the work itself or a publisher page → SECONDARY score MUST be 0-30
- Full-text sources (PDFs, HTML of the work) → NOT candidates for SECONDARY
- Publisher/seller pages (buy links, product pages) → NOT candidates for SECONDARY
- SECONDARY candidates must be ABOUT the work, not the work itself

### Scoring Tiers

#### SCHOLARLY BOOK REVIEW (90-100)
✓ Best possible secondary URL

**Indicators:**
- PDF format AND title contains "review" (actual review article)
- From academic journal (`.edu`, `sagepub`, `oxford`, `cambridge`, etc.) AND title contains "review"
- Snippet discusses specific merits, flaws, critique, analysis of the book
- Mentions specific pages, chapters, or quotes from the book
- Evaluative/analytical language about THIS specific work

**Examples:**
- `muse.jhu.edu/article/33635/pdf` (review article) → S:95 ✅
- `jstor.org/stable/10.1111/1468-2508.t01...` (scholarly review) → S:80 ✅

---

#### NON-ACADEMIC REVIEW (75-90)
✓ Good secondary URL (journalistic or popular)

**Indicators:**
- Blog, magazine, or news review with critical analysis
- Title includes "review", "critique", "thoughts on"
- Contains discussion of book's arguments and quality
- Still analytical, just not scholarly

**Examples:**
- `nytimes.com/1991/04/24/books/books-of-the-times-damning-a-president-with-fairness.html` → S:90 ✅
- `claremontreviewofbooks.com/reagan-in-sacramento/` → S:75 ✅

---

#### REVIEW WEBSITE/AGGREGATOR (max 60)
⚠️ **NOT ideal** - aggregators are ABOUT reviews, not reviews themselves

⚠️ **CRITICAL:** Sites like `complete-review.com`, `goodreads.com` → MAX SCORE 60

**Indicators:**
- URL patterns: `complete-review.com/reviews/*`, `goodreads.com/book/*`
- These are ABOUT reviews or AGGREGATE reviews, not reviews themselves
- Typically show excerpts or summaries OF other reviews
- Not original critical analysis

---

#### ACADEMIC DISCUSSION (60-75)
✓ Acceptable secondary URL

**Indicators:**
- Paper that cites/discusses the work
- Not explicitly a review but analyzes themes
- Work-focused content

---

#### BIBLIOGRAPHY/METADATA PAGE (max 55)
❌ **NOT a secondary candidate** - just a listing

⚠️ **CRITICAL:** PhilPapers, WorldCat, library catalogs → MAX SCORE 55

**Indicators:**
- Just lists: title, author, ISBN, publisher, abstract
- No critical analysis or evaluation present
- URL pattern: `philpapers.org/rec/`, `worldcat.org`, library catalogs
- Even if title appears, these are listings not reviews

---

#### TOPIC DISCUSSION (40-60)
⚠️ Marginal secondary candidate

**Indicators:**
- Discusses concepts from the work
- No specific work reference or review
- Thematic exploration based on relevance text

---

#### UNRELATED (0-30)
❌ Completely wrong

**Indicators:**
- Different work or topic
- No connection to the reference

---

## Selection Rules

After scoring all candidates:

1. **PRIMARY RECOMMENDATION:** The candidate with the HIGHEST primary score (must be ≥ 60)
2. **SECONDARY RECOMMENDATION:** The candidate with the HIGHEST secondary score (must be ≥ 60, must NOT be the primary candidate)

### Thresholds

**Minimum scores for assignment:**
- Primary: 60+ (publisher page minimum)
- Secondary: 60+ (academic discussion minimum)

**If no candidates meet threshold:**
- Leave slot empty (better than low-quality URL)

---

## Additional Matching Criteria

### Title Match
- **exact:** URL title exactly matches reference title
- **partial:** URL title contains key words from reference title
- **none:** URL title doesn't match

### Author Match
- **yes:** Author name appears in snippet or URL
- **no:** Author name not found

**Note:** These are used to break ties, not as hard requirements.

---

## Examples of Proper Scoring

### Example 1: Archive.org Full Text
**URL:** `archive.org/details/presidentreagan000cann`
**Scoring:**
- PRIMARY: 95 (full text from archive.org)
- SECONDARY: 10 (it's the work itself, not about the work)
- **Result:** Selected as PRIMARY ✅

---

### Example 2: NYT Book Review
**URL:** `nytimes.com/1991/04/24/books/books-of-the-times-damning-a-president-with-fairness.html`
**Scoring:**
- PRIMARY: 40 (it's about the work, not the work itself)
- SECONDARY: 90 (excellent non-academic review with critical analysis)
- **Result:** Selected as SECONDARY ✅

---

### Example 3: Publisher Purchase Page
**URL:** `routledge.com/Televised-Presidential-Debates/.../9780805816037`
**Scoring:**
- PRIMARY: 65 (publisher page, no full text)
- SECONDARY: 15 (not a review or analysis)
- **Result:** Selected as PRIMARY only if no better option ⚠️

---

### Example 4: ResearchGate PDF (Before v14.5 Problem)
**URL:** `researchgate.net/publication/.../Analyzing-Televised-Presidential-General-Election-Debates.pdf`
**OLD Scoring (Before v14.5):**
- PRIMARY: 90 (full text PDF)
- SECONDARY: 60 (contains analysis)
- **Problem:** Could be selected for BOTH slots ❌

**NEW Scoring (v14.5):**
- PRIMARY: 90 (full text PDF)
- SECONDARY: 25 (it's the work itself, not about the work)
- **Result:** Selected as PRIMARY only, not secondary ✅

---

### Example 5: MUSE Review Article
**URL:** `muse.jhu.edu/article/33635/pdf`
**Scoring:**
- PRIMARY: 15 (it's a review, not the work itself)
- SECONDARY: 95 (scholarly review article with critical analysis)
- **Result:** Selected as SECONDARY ✅

---

## System Behavior

### When Multiple Good Candidates Found
- Highest scoring primary → Primary URL
- Highest scoring secondary (excluding primary) → Secondary URL
- Both slots filled with appropriate content ✅

### When Only Primary Found
- Highest scoring primary → Primary URL
- Secondary left empty ✅

### When Only Secondary Found
- Primary left empty
- Highest scoring secondary → Secondary URL ✅

### When Neither Found
- Both slots left empty
- Requires manual intervention ⚠️

---

## Query Strategy Impact

The criteria above apply to ALL candidates regardless of query strategy:

**Simple Mode (3 queries):**
- Fewer candidates to rank
- Faster processing
- May miss some options

**Standard Mode (8 queries):**
- More candidates to rank
- Slower processing
- Better coverage

**The scoring criteria are identical in both modes.**

---

## Version History

**v14.5 (Oct 28, 2025):**
- Added mutual exclusivity rules
- Full-text sources capped at S:30
- Reviews capped at P:55
- Clear separation of primary vs secondary candidates

**v14.2 (Oct 27, 2025):**
- Language detection (non-English domains capped at P:70)
- Review website vs review article distinction
- Review aggregators capped at S:60

**v14.1 (Oct 27, 2025):**
- Content-type detection (work vs review)
- Bibliography listings capped at S:55

**v14.0 (Oct 27, 2025):**
- Initial query structure (8 queries: 4 primary, 4 secondary)

---

**Status:** Current production criteria (v14.5)
**Applies to:** Both iPad app and batch processor (shared logic)
**Location:** netlify/functions/llm-rank.ts
