# Dropbox Authentication Persistence Fix

**Issue:** Clearing browser cache loses Dropbox OAuth tokens, requiring re-authentication.

**Root Cause:** Tokens stored in localStorage, which Safari clears with cache.

---

## Current Implementation

```javascript
// Token storage (gets cleared with cache)
localStorage.setItem('rr_dropbox_token', accessToken);
localStorage.setItem('rr_dropbox_refresh_token', refreshToken);
localStorage.setItem('rr_dropbox_token_expiry', expiry);
```

---

## Proposed Solutions

### Option 1: Multi-Layer Storage (Recommended)

Store tokens in multiple places, with fallback chain:

```javascript
// Priority order:
1. IndexedDB (more persistent than localStorage)
2. Cookie (with 90-day expiration)
3. localStorage (current, least persistent)

// On load, try in order:
const token = await getTokenFromIndexedDB()
           || getTokenFromCookie()
           || getTokenFromLocalStorage();
```

**Pros:**
- More resilient to cache clears
- IndexedDB survives cache clears better
- Cookies can persist longer
- Graceful degradation

**Cons:**
- More complex code
- Still clearable if user really wants

### Option 2: Server-Side Session

Store tokens on Netlify server, use session cookie:

```javascript
// After OAuth:
1. Send tokens to Netlify function
2. Function stores in encrypted database
3. Returns session ID as cookie
4. App uses session ID to retrieve tokens
```

**Pros:**
- Most persistent
- Survives all cache clears
- More secure (tokens never in browser)

**Cons:**
- Requires backend database
- More complex architecture
- Privacy considerations

### Option 3: "Remember Me" Checkbox

Let user choose persistence level:

```javascript
if (rememberMe) {
    // Use cookie with 90-day expiration
    setCookie('rr_dropbox_token', token, 90);
} else {
    // Use sessionStorage (cleared when tab closes)
    sessionStorage.setItem('rr_dropbox_token', token);
}
```

**Pros:**
- User control
- Clear expectations
- Simple to implement

**Cons:**
- Still clearable with cache
- User might forget to check box

### Option 4: Accept Current Behavior (Simplest)

Improve UX instead of fighting browser behavior:

```javascript
// Better re-auth experience:
1. Detect missing tokens on load
2. Show friendly "Connect to Dropbox" button
3. Remember last file state (show what they were working on)
4. One-click re-auth (no multi-step flow)
```

**Pros:**
- Respects browser security model
- Simple, maintainable
- Industry standard (most apps do this)

**Cons:**
- Still requires re-auth after cache clear

---

## Recommendation: Option 1 + Option 4

**Implement multi-layer storage** for better persistence, but **accept that cache clears require re-auth** as normal behavior.

### Implementation Plan:

1. **Add IndexedDB storage** (primary, most persistent)
2. **Keep localStorage** (fallback, quick access)
3. **Improve re-auth UX** (one-click reconnect)
4. **Add warning** when about to lose tokens

Example warning:
```
⚠️ Clearing cache will require Dropbox re-authentication
   Consider using Cmd+Shift+R (hard refresh) instead
```

---

## Cost/Benefit Analysis

| Solution | Complexity | Persistence | User Impact |
|----------|-----------|-------------|-------------|
| Current | Low | Weak | High (re-auth often) |
| IndexedDB | Medium | Good | Low (rare re-auth) |
| Server-side | High | Excellent | Very Low |
| Remember Me | Low | Medium | Medium |
| Better UX | Low | Weak | Low (easier re-auth) |

**Best balance:** IndexedDB + Better UX

---

## Implementation Code

### IndexedDB Token Storage

```javascript
// Store tokens in IndexedDB
async function saveTokensToIndexedDB(accessToken, refreshToken, expiry) {
    const db = await openDB('rr_storage', 1, {
        upgrade(db) {
            db.createObjectStore('tokens');
        }
    });

    await db.put('tokens', {
        access_token: accessToken,
        refresh_token: refreshToken,
        expiry: expiry
    }, 'dropbox');
}

// Load tokens from IndexedDB
async function loadTokensFromIndexedDB() {
    try {
        const db = await openDB('rr_storage', 1);
        return await db.get('tokens', 'dropbox');
    } catch {
        return null;
    }
}

// Fallback chain
async function loadTokens() {
    // Try IndexedDB first
    const idbTokens = await loadTokensFromIndexedDB();
    if (idbTokens) return idbTokens;

    // Fall back to localStorage
    return {
        access_token: localStorage.getItem('rr_dropbox_token'),
        refresh_token: localStorage.getItem('rr_dropbox_refresh_token'),
        expiry: localStorage.getItem('rr_dropbox_token_expiry')
    };
}
```

---

## Testing Strategy

1. **Test cache clear:** Verify IndexedDB survives
2. **Test incognito:** Verify graceful fallback
3. **Test token refresh:** Verify both storages update
4. **Test across devices:** Verify Dropbox sync works

---

## Timeline

- **Quick fix (today):** Document hard refresh as alternative
- **Short term (next release):** Improve re-auth UX
- **Medium term (future):** Implement IndexedDB storage

---

**Status:** Documented
**Priority:** Medium (not critical, but annoying)
**User Workaround:** Use Cmd+Shift+R instead of clearing cache
