# Reference Refinement v16.10 - OAuth Token Refresh Fix

**Release Date:** November 9, 2025
**Version:** 16.10
**Type:** Critical Bug Fix

---

## Summary

v16.10 **fixes the critical 401 Unauthorized error** that prevented saving/finalizing references. The issue was caused by expired Dropbox access tokens (4-hour lifespan). This release restores the **OAuth PKCE flow with automatic token refresh** that was removed in v16.8.

---

## Critical Issue Fixed

### The Problem (v16.8-v16.9)

**Symptom:** When clicking "Finalize" or "Save Changes", users received:
```
❌ Save failed: Response failed with a 401 code
```

**Root Cause:**
- v16.8 replaced OAuth flow with hardcoded "generated access token"
- These tokens expire after **4 hours**
- No refresh mechanism existed
- First save attempt after 4 hours → 401 Unauthorized
- **Incorrect assumption:** v16.8 commit claimed "Generated access tokens don't expire" - this was **wrong**

**Impact:**
- Users could not finalize references
- Users could not save changes to Dropbox
- Data loss risk if user made changes and couldn't save

---

## Solution Implemented

### Restored OAuth PKCE Flow (from v16.7)

v16.10 restores the complete OAuth 2.0 authentication system with:

1. **PKCE Authorization Flow** - Secure OAuth for public clients
2. **Refresh Token Support** - Tokens auto-refresh before expiration
3. **Long-Lived Sessions** - No more 4-hour expiration issues
4. **Automatic Token Management** - No user intervention needed

---

## Technical Changes

### Frontend (index.html)

**Removed:**
```javascript
// v16.8-v16.9: Hardcoded token (EXPIRED AFTER 4 HOURS)
DROPBOX_ACCESS_TOKEN: 'sl.u.AGGkWK...' // 1000+ character token
```

**Restored:**
```javascript
// v16.10: OAuth token management
dropboxAppKey: 'q4ldgkwjmhxv6w2',
dropboxAccessToken: null,
dropboxRefreshToken: null,
dropboxTokenExpiry: null,
dropboxClient: null,
```

**Added Functions:**
- `handleDropboxOAuthCallback()` - Processes OAuth redirect with authorization code
- `connectDropbox()` - Initiates PKCE flow, redirects to Dropbox auth
- `ensureValidDropboxToken()` - Auto-refreshes token when < 5 minutes until expiry
- `generateCodeVerifier()` - Creates PKCE code verifier
- `generateCodeChallenge()` - Creates SHA-256 challenge from verifier
- `disconnectDropbox()` - Properly clears tokens and resets state
- `getCookie()` - Helper for PKCE verifier fallback
- `deleteCookie()` - Helper for cookie cleanup

**Updated Functions:**
- `init()` - Checks for OAuth callback, loads stored tokens, auto-refreshes if needed
- `initializeDropbox()` - Now stores access token in instance variable
- `saveToDropbox()` - Calls `ensureValidDropboxToken()` before every save
- `updateDropboxUI()` - Button text: "Connect to Dropbox" / "Disconnect"

### Backend (netlify/functions/dropbox-oauth.ts)

**No changes needed** - v16.8 only touched frontend, backend OAuth handler remained intact.

**Redirect URI:**
```
https://rrv521-1760738877.netlify.app/
```
(Points to root, which serves `index.html` - already correct)

---

## OAuth Flow Details

### Initial Connection

1. User clicks **"Connect to Dropbox"** button
2. App generates PKCE code verifier and challenge
3. Verifier encoded in OAuth `state` parameter
4. Browser redirects to Dropbox authorization page
5. User approves access
6. Dropbox redirects back with authorization `code`
7. App extracts verifier from `state` parameter
8. App calls Netlify function `/api/dropbox-oauth` with code + verifier
9. Function exchanges code for:
   - `access_token` (expires in 14,400 seconds = 4 hours)
   - `refresh_token` (long-lived, used to get new access tokens)
   - `expires_in` (14400)
10. App stores tokens in localStorage:
    - `rr_dropbox_token`
    - `rr_dropbox_refresh_token`
    - `rr_dropbox_token_expiry` (timestamp)
11. App loads fresh data from Dropbox

### Automatic Token Refresh

**Triggered before every Dropbox API call:**

```javascript
await this.ensureValidDropboxToken();
```

**Logic:**
- If token expires in < 5 minutes → refresh
- Call `/api/dropbox-oauth` with `grant_type: 'refresh_token'`
- Function returns new `access_token` + `expires_in`
- Optionally returns new `refresh_token` (Dropbox may rotate them)
- Update localStorage with new tokens
- Update Dropbox client with new access token
- **User never sees this happen** - completely transparent

**Refresh Logging:**
```
[DROPBOX] Token expires soon, refreshing... (expires in 278 seconds)
[DROPBOX] Token refreshed successfully, new expiry in: 14400 seconds
```

---

## User Experience Changes

### Before (v16.8-v16.9)

1. App loads → hardcoded token used
2. **4 hours pass** → token expires silently
3. User clicks "Finalize" → ❌ 401 error
4. **No recovery** - user stuck, can't save
5. Must refresh page and regenerate token manually

### After (v16.10)

1. **First use:** User clicks "Connect to Dropbox"
2. Browser redirects to Dropbox auth page
3. User approves (one-time)
4. App stores tokens, loads data
5. **Subsequent uses:**
   - App auto-loads from localStorage
   - Tokens auto-refresh before expiry
   - **No user intervention needed**
6. **Token expires?** Auto-refreshed before any save
7. **Refresh token expires?** (Very rare, months/years)
   - App shows: "Dropbox token refresh failed. Please reconnect."
   - User clicks "Connect to Dropbox" again

---

## Token Lifespan

| Token Type | Lifespan | Auto-Refresh? |
|------------|----------|---------------|
| **Access Token** | 4 hours (14,400 sec) | ✅ Yes (< 5 min remaining) |
| **Refresh Token** | Very long (months/years) | ❌ No (get new one via OAuth) |

**Practical Impact:**
- User connects once
- Tokens auto-refresh indefinitely
- Only need to reconnect if:
  - Clear localStorage
  - Refresh token expires (rare)
  - Revoke app access in Dropbox settings

---

## Migration Path (v16.9 → v16.10)

### What Happens on First Load?

**Scenario 1: User has expired hardcoded token (most common)**
1. App loads, no valid tokens found
2. Dropbox UI shows: "Not connected"
3. User clicks **"Connect to Dropbox"**
4. OAuth flow starts, user approves
5. Tokens stored, data loads
6. ✅ Working again!

**Scenario 2: User has valid localStorage backup**
1. App loads, displays cached data
2. User tries to finalize → 401 error
3. App shows: "Dropbox token refresh failed. Please reconnect."
4. User clicks **"Connect to Dropbox"**
5. OAuth flow starts, tokens stored
6. ✅ Can save again!

**No data loss** - localStorage backup preserved during reconnection.

---

## Testing Recommendations

### Test Scenario 1: Fresh Connection
1. Open app in incognito/private window (no localStorage)
2. Click "Connect to Dropbox"
3. Approve on Dropbox page
4. Verify: redirects back, loads decisions.txt
5. Edit a reference, click "Finalize"
6. Verify: saves successfully, no 401 error

### Test Scenario 2: Token Refresh
1. Connect to Dropbox
2. Check localStorage: `rr_dropbox_token_expiry`
3. Manually set expiry to 4 minutes from now:
   ```javascript
   localStorage.setItem('rr_dropbox_token_expiry', Date.now() + 240000)
   ```
4. Reload page
5. Click "Finalize" on a reference
6. Check console: should see "Token expires soon, refreshing..."
7. Verify: token refreshed, save succeeds

### Test Scenario 3: Expired Token Recovery
1. Connect to Dropbox
2. Manually expire token:
   ```javascript
   localStorage.setItem('rr_dropbox_token_expiry', Date.now() - 1000)
   ```
3. Reload page
4. Click "Finalize"
5. Check console: should see token refresh attempt
6. Verify: save succeeds after refresh

---

## Dropbox App Configuration

**App Console:** https://www.dropbox.com/developers/apps
**App Name:** Reference Refinement
**App Key:** `q4ldgkwjmhxv6w2`
**App Secret:** Set as `DROPBOX_APP_SECRET` in Netlify env vars

**OAuth 2 Redirect URIs:**
```
https://rrv521-1760738877.netlify.app/
```

**Permission Type:** App Folder (scoped to `/Apps/Reference Refinement/`)
**Access Type:** Offline (returns refresh tokens)

---

## Files Modified

- `index.html`
  - Line 9: Updated title to v16.10
  - Line 1127: Updated header to v16.10
  - Line 1530-1535: Removed hardcoded token, restored OAuth variables
  - Line 1538-1558: Updated `init()` with OAuth callback handling
  - Line 4370-4619: Restored complete OAuth implementation
  - **Total:** ~250 lines changed (OAuth restoration)

---

## Deployment Checklist

- [ ] Update `index.html` version to v16.10
- [ ] Test OAuth flow in incognito window
- [ ] Test token refresh mechanism
- [ ] Test finalize operation after fresh connection
- [ ] Verify `DROPBOX_APP_SECRET` set in Netlify env vars
- [ ] Verify redirect URI in Dropbox app settings
- [ ] Deploy to Netlify
- [ ] Test on iPad Safari (primary device)
- [ ] Verify no 401 errors on save/finalize
- [ ] Create git tag: `v16.10`
- [ ] Update CLAUDE.md with v16.10 status

---

## Breaking Changes

**None** - v16.10 is a drop-in replacement for v16.9.

**User Impact:**
- Existing users must reconnect to Dropbox (one-time OAuth)
- localStorage data preserved
- No data loss

---

## Future Improvements

**Optional enhancements for future versions:**

1. **Token Status UI** - Show token expiry time in Debug tab
2. **Auto-Reconnect** - If refresh fails, auto-trigger OAuth flow
3. **Offline Mode** - Better handling when token refresh fails
4. **Token Monitoring** - Log refresh events to debug panel

---

## Commit Message

```
v16.10: Restore OAuth PKCE with automatic token refresh

CRITICAL FIX: v16.8-v16.9 used hardcoded tokens that expired after 4 hours,
causing 401 errors on save/finalize operations.

Changes:
- Removed hardcoded access token (expired after 4 hours)
- Restored OAuth PKCE flow from v16.7
- Automatic token refresh before API calls (< 5 min remaining)
- Refresh tokens enable long-lived sessions (months/years)
- Users must reconnect once (OAuth approval)
- No data loss, localStorage preserved

Fixes #1: 401 Unauthorized error on finalize/save
```

---

## Version History Context

- **v16.7:** Full OAuth PKCE implementation ✅
- **v16.8:** ❌ Replaced OAuth with hardcoded token (broke after 4 hours)
- **v16.9:** ❌ Enhanced features but still had hardcoded token
- **v16.10:** ✅ Restored OAuth, fixed 401 errors

**Lesson Learned:** "Generated access tokens" are **NOT** permanent - they expire in 4 hours just like regular OAuth tokens. Always use OAuth with refresh tokens for production apps.

---

## Support

**If users encounter issues:**

1. **"Connect to Dropbox" button doesn't work**
   - Check browser console for errors
   - Verify redirect URI in Dropbox app settings
   - Ensure DROPBOX_APP_SECRET set in Netlify

2. **"Invalid redirect_uri" error**
   - Dropbox app must be in Production mode, OR
   - Add exact redirect URI to Development mode settings

3. **Token refresh fails repeatedly**
   - Refresh token may have expired/been revoked
   - User should disconnect and reconnect

4. **401 errors persist**
   - Clear localStorage: `localStorage.clear()`
   - Reload page
   - Reconnect to Dropbox

---

**Status:** ✅ Ready for deployment
