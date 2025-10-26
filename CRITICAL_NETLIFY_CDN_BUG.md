# CRITICAL: Netlify CDN Serving Wrong Version to Browsers

## Date: October 26, 2025, 5:13 PM

## The Smoking Gun

**curl returns v13.7:**
```bash
curl -s "https://68fea9e46ac664553caef88e--rrv521-1760738877.netlify.app/rr_v60.html" | grep "<title>"
# OUTPUT: <title>Reference Refinement v13.7</title>
```

**Mac Safari (and iPad Safari) return v13.4:**
- Same URL: `https://68fea9e46ac664553caef88e--rrv521-1760738877.netlify.app/rr_v60.html`
- Browser displays: "Reference Refinement v13.4"
- Screenshot proof: "v13.4 On Mac Too.png"

## This is NOT a Browser Cache Issue

**Evidence:**
1. Unique deploy URLs (never accessed before) show v13.4 in browsers
2. Same URLs return v13.7 via curl
3. Both Mac Safari and iPad Safari affected
4. User cleared Safari cache multiple times - no effect
5. Even brand new deployments show old version to browsers

## Root Cause: Netlify CDN Bug

**Hypothesis:** Netlify's CDN is serving a stale cached version of `rr_v60.html` to browsers (based on User-Agent header) but serving the correct version to command-line tools.

**Why this happened:**
- File was named `rr_v60.html` across v13.0 → v13.7
- Netlify CDN cached v13.4 version of this file
- CDN is ignoring cache-control headers for browser requests
- CDN is NOT invalidating cache even for unique deploy URLs

## The Solution: Rename the File

**What we did:**
1. Copied `rr_v60.html` → `rr_v137.html`
2. Deployed as new file (never cached before)
3. Git commit: `096dca7`

**New URL:**
```
https://rrv521-1760738877.netlify.app/rr_v137.html
```

**Verification:**
```bash
curl -s "https://rrv521-1760738877.netlify.app/rr_v137.html" | grep "<title>"
# OUTPUT: <title>Reference Refinement v13.7</title>
```

## TEST THIS NOW

**On Mac Safari:**
Open this URL: `https://rrv521-1760738877.netlify.app/rr_v137.html`

**Expected result:** Should show "Reference Refinement v13.7" at top of page

If this STILL shows v13.4, then we have a bigger Netlify CDN problem.

## What This Means

1. **Netlify CDN has a bug** where it serves different content to browsers vs curl
2. **Cache-control headers are being ignored** by Netlify for browser requests
3. **Unique deploy URLs don't help** - CDN caches based on filename
4. **Only solution:** Change filename to bypass CDN cache entirely

## Implications for Future

**Best Practice Going Forward:**
- Include version number in filename: `rr_v138.html`, `rr_v139.html`, etc.
- Update redirects in netlify.toml for each version
- This guarantees no CDN caching issues

**OR:**

- Implement cache-busting query parameters in app
- Use timestamp or version hash: `rr_v60.html?v=13.7.20251026`
- Force reload with new parameter each version

## If rr_v137.html Still Shows v13.4

Then we need to:
1. Contact Netlify support - this is a CDN bug
2. Try completely new Netlify site (different domain)
3. Consider moving to different hosting platform (Vercel, Cloudflare Pages)

---

**Status:** Waiting for user to test `rr_v137.html` in Safari
**Next Update:** After user confirms what version they see
