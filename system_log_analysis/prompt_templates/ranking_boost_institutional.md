# Ranking Prompt Template: Boost Institutional Archives

**Use When:** Analysis shows user consistently selects .edu, .gov, and institutional archive domains over other sources.

**Finding Pattern:**
- User domain distribution heavily weighted toward institutional sources
- AI recommends publisher sites, but user overrides with archive PDFs
- High override rate for references that have both options available

**File to Update:** `netlify/functions/llm-rank.ts`

**Location in File:** Within the ranking prompt, add/update domain scoring section

---

## Template Addition

```typescript
const prompt = `
You are ranking URL candidates for an academic reference. Score each on two dimensions:

PRIMARY SCORE (0-100): How well does this URL represent the actual work?
SECONDARY SCORE (0-100): How authoritative and accessible is this source?

DOMAIN SCORING GUIDELINES:

HIGH PRIORITY (add +30 to both scores):
1. Government/military archives: .gov, .mil (e.g., dtic.mil, archives.gov)
2. Institutional repositories: .edu domain with /repository/, /digital/, /archive/ in path
3. Academic databases with DOI: doi.org, jstor.org, pubmed.ncbi.nlm.nih.gov
4. Established open archives: archive.org, arxiv.org

MEDIUM PRIORITY (add +15 to scores):
5. Publisher official sites with free access: oup.com, cambridge.org, etc.
6. Academic faculty pages with PDFs: faculty.university.edu/~author
7. Google Scholar links to PDFs (not profile pages)

LOW PRIORITY (no bonus):
8. Publisher paywalled sites
9. Commercial vendors: Amazon, Google Books (only if no other option)

PENALTIES (subtract from scores):
- Google Scholar/ResearchGate PROFILE pages (not the work itself): -40 points
- Link aggregators without content: -60 points
- Random blogs or unknown personal sites: -30 points
- Wikipedia or general encyclopedias: -50 points

ACCESSIBILITY BONUS:
- If URL ends in .pdf and is from trusted domain: +10 PRIMARY
- If free access (no paywall detected): +5 SECONDARY

...rest of prompt
`;
```

---

## Verification Steps After Update

1. **Deploy changes:**
   ```bash
   cd ~/Library/CloudStorage/Dropbox/Fergi/AI\ Wrangling/References/
   npm run build
   netlify deploy --prod --message "Boost institutional archives in ranking"
   ```

2. **Test on 2-3 references that previously had overrides**

3. **Check if AI now recommends same URLs you previously selected**

4. **Monitor override rate in next batch**

---

## Expected Impact

- **Override Rate:** Should decrease by 20-40%
- **Domain Distribution:** AI recommendations should shift toward .edu/.gov
- **Query Effectiveness:** No direct impact (this only affects ranking)

---

## Rollback if Needed

If this makes things worse (e.g., AI now over-prefers low-quality .edu sites):

1. Reduce the +30 bonus to +15
2. Add quality checks: "If .edu URL but not from recognized university, no bonus"
3. Balance with other factors like recency, peer review status
