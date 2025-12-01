# v18.2 iPad App Implementation Guide

**Session Date:** November 15, 2025
**Status:** Ready for Implementation
**Prerequisites:** ✅ Production backups verified, v30.0 baseline complete
**Estimated Time:** 2-3 hours

---

## 📋 Executive Summary

Implement two critical iPad app features that enable comparison of AI baseline vs human-refined production references:

1. **Multi-file Support** - Load/save different manuscript decision files
2. **Context Display** - Show manuscript context for each reference

**Why:** Generated baseline (CaughtInTheActGeneratedDecisions.txt) has manuscript context that production file lacks. These features enable safe experimentation and quality comparison.

---

## ✅ Pre-Implementation Checklist

### Production Backups (COMPLETED ✅)

**Backup 1 (Dropbox):**
```
~/Library/CloudStorage/Dropbox/Apps/Reference Refinement/CaughtInTheActDecisions_PRODUCTION_BACKUP_2025-11-15.txt
```

**Backup 2 (Downloads):**
```
~/Downloads/CaughtInTheActDecisions_PRODUCTION_BACKUP_2025-11-15.txt
```

**Verification:**
- ✅ File size: 322KB (all 3 files match)
- ✅ MD5 checksum: `c1212174384e7570cb7734d3775ed766` (all 3 match)
- ✅ Both backups readable and parsable

---

## 📂 File Information

### Current Files

**Production File (no context):**
```
~/Library/CloudStorage/Dropbox/Apps/Reference Refinement/CaughtInTheActDecisions.txt
- 288 references
- Format: [RID], Relevance, URLs, FLAGS
- NO [CONTEXT_START]/[CONTEXT_END] tags
```

**Generated Baseline (has context):**
```
~/Library/CloudStorage/Dropbox/Fergi/AI Wrangling/References/CaughtInTheActGeneratedDecisions.txt
- 288 references
- Format: [RID], [CONTEXT_START]...[CONTEXT_END], Relevance, FLAGS
- NO URLs (baseline mode)
- 2,876 lines total
```

**Note:** Need to copy baseline to Dropbox folder for iPad access:
```bash
cp ~/Library/CloudStorage/Dropbox/Fergi/AI\ Wrangling/References/CaughtInTheActGeneratedDecisions.txt \
   ~/Library/CloudStorage/Dropbox/Apps/Reference\ Refinement/CaughtInTheActGeneratedDecisions.txt
```

---

## 🎯 Implementation Tasks (8 Total)

### Task 1: File Discovery Function

**File:** `index.html`
**Location:** Add after existing Dropbox functions (search for "async function" blocks)
**Priority:** P0

**Code to add:**
```javascript
// ============================================================================
// MULTI-FILE SUPPORT - File Discovery
// ============================================================================

async function discoverManuscriptFiles() {
    const dropboxPath = '';  // Root of app folder

    try {
        const response = await fetch('/.netlify/functions/dropbox-oauth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'list',
                path: dropboxPath
            })
        });

        if (!response.ok) {
            console.error('Dropbox list failed:', response.status);
            return [];
        }

        const data = await response.json();

        // Filter for *Decisions.txt files
        const manuscriptFiles = (data.entries || [])
            .filter(entry => entry.name && entry.name.endsWith('Decisions.txt'))
            .map(entry => ({
                name: entry.name,
                path: entry.path_display || entry.path_lower,
                modified: entry.server_modified,
                size: entry.size
            }))
            .sort((a, b) => a.name.localeCompare(b.name));

        console.log(`Found ${manuscriptFiles.length} manuscript files`);
        return manuscriptFiles;

    } catch (error) {
        console.error('Failed to discover manuscript files:', error);
        return [];
    }
}
```

---

### Task 2: Current File Tracking

**File:** `index.html`
**Location:** Add near top of `<script>` section (after variable declarations)
**Priority:** P0

**Code to add:**
```javascript
// ============================================================================
// MULTI-FILE SUPPORT - Current File Tracking
// ============================================================================

let currentManuscriptFile = {
    name: 'CaughtInTheActDecisions.txt',  // Default to production
    path: '/CaughtInTheActDecisions.txt',
    loadedAt: null
};

function setCurrentFile(name, path) {
    currentManuscriptFile = {
        name: name,
        path: path,
        loadedAt: new Date().toISOString()
    };

    localStorage.setItem('currentManuscriptFile', JSON.stringify(currentManuscriptFile));
    updateHeaderDisplay();

    console.log(`Current file set to: ${name}`);
}

function restoreCurrentFile() {
    const saved = localStorage.getItem('currentManuscriptFile');
    if (saved) {
        try {
            currentManuscriptFile = JSON.parse(saved);
            console.log(`Restored file: ${currentManuscriptFile.name}`);
        } catch (e) {
            console.error('Failed to restore current file:', e);
        }
    }
}

function updateHeaderDisplay() {
    const header = document.querySelector('h1');
    let filenameDisplay = document.getElementById('currentFilename');

    if (!filenameDisplay) {
        filenameDisplay = document.createElement('div');
        filenameDisplay.id = 'currentFilename';
        filenameDisplay.style.fontSize = '14px';
        filenameDisplay.style.fontWeight = 'normal';
        filenameDisplay.style.color = '#fff';
        filenameDisplay.style.marginTop = '4px';
        header.appendChild(filenameDisplay);
    }

    const isProduction = currentManuscriptFile.name === 'CaughtInTheActDecisions.txt';
    filenameDisplay.innerHTML = `
        📄 ${currentManuscriptFile.name}
        ${isProduction ? '' : '<span style="color: #FF9800; font-weight: bold;"> (TEST)</span>'}
    `;
}

// Initialize on page load
restoreCurrentFile();
```

---

### Task 3: File Selector Modal HTML

**File:** `index.html`
**Location:** Add before closing `</body>` tag
**Priority:** P0

**HTML to add:**
```html
<!-- File Selection Modal -->
<div id="fileSelectModal" class="modal" style="display: none;">
    <div class="modal-content" style="max-width: 500px;">
        <h2>Select Manuscript</h2>
        <div id="fileListContainer" style="max-height: 400px; overflow-y: auto; margin: 20px 0;">
            <!-- Populated dynamically -->
        </div>
        <div class="modal-actions" style="margin-top: 20px; text-align: right;">
            <button onclick="closeFileSelectModal()"
                    style="margin-right: 10px; padding: 10px 20px;">Cancel</button>
            <button onclick="loadSelectedFile()"
                    style="background: #4CAF50; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer;">Load Selected</button>
        </div>
    </div>
</div>

<!-- Context Display Modal -->
<div id="contextModal" class="modal" style="display: none;">
    <div class="modal-content" style="max-width: 700px; max-height: 80vh;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
            <h2 style="margin: 0;">Manuscript Context</h2>
            <button onclick="closeContextModal()"
                    style="background: #f44336; color: white; padding: 5px 15px; border: none; border-radius: 4px; cursor: pointer;">Close</button>
        </div>

        <div id="contextReferenceInfo" style="margin-bottom: 15px; padding: 10px; background: #f5f5f5; border-left: 4px solid #2196F3;">
            <!-- Shows which reference this context is for -->
        </div>

        <div id="contextText" style="max-height: 50vh; overflow-y: auto; padding: 15px; background: white; border: 1px solid #ddd; border-radius: 4px; line-height: 1.6; white-space: pre-wrap; font-family: Georgia, serif; font-size: 15px;">
            <!-- Context text inserted here -->
        </div>
    </div>
</div>
```

---

### Task 4: File Selector Modal CSS

**File:** `index.html`
**Location:** Add to `<style>` section
**Priority:** P0

**CSS to add:**
```css
/* Multi-file Support Styles */
.file-option {
    display: block;
    padding: 12px;
    margin: 8px 0;
    border: 1px solid #ddd;
    border-radius: 4px;
    cursor: pointer;
    transition: background 0.2s;
}

.file-option:hover {
    background: #f5f5f5;
}

.file-option input[type="radio"] {
    margin-right: 10px;
}

.file-info {
    display: inline-block;
    vertical-align: top;
}

.file-name {
    font-weight: bold;
    margin-bottom: 4px;
}

.file-meta {
    font-size: 12px;
    color: #666;
}

.current-file-indicator {
    display: inline-block;
    margin-left: 8px;
    padding: 2px 8px;
    background: #4CAF50;
    color: white;
    border-radius: 3px;
    font-size: 11px;
}

/* Context Display Styles */
#contextText {
    font-family: Georgia, serif;
    font-size: 15px;
    color: #333;
}

#contextText p {
    margin-bottom: 12px;
}

#contextReferenceInfo {
    font-size: 14px;
    color: #555;
}

.reference-actions button {
    margin-right: 8px;
    padding: 8px 16px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
}

.reference-actions button:hover {
    opacity: 0.9;
}
```

---

### Task 5: File Selector JavaScript

**File:** `index.html`
**Location:** Add after file discovery function
**Priority:** P0

**Code to add:**
```javascript
// ============================================================================
// MULTI-FILE SUPPORT - File Selector UI
// ============================================================================

async function showFileSelectModal() {
    const files = await discoverManuscriptFiles();

    if (files.length === 0) {
        alert('No manuscript files found in Dropbox folder');
        return;
    }

    const container = document.getElementById('fileListContainer');
    container.innerHTML = files.map(file => {
        const isCurrent = file.name === currentManuscriptFile.name;
        const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString();
        const formatSize = (bytes) => {
            const kb = Math.round(bytes / 1024);
            return `${kb} KB`;
        };

        return `
            <label class="file-option">
                <input type="radio"
                       name="manuscriptFile"
                       value="${file.name}"
                       data-path="${file.path}"
                       ${isCurrent ? 'checked' : ''}>
                <div class="file-info">
                    <div class="file-name">
                        ${file.name}
                        ${isCurrent ? '<span class="current-file-indicator">Current</span>' : ''}
                    </div>
                    <div class="file-meta">
                        Modified: ${formatDate(file.modified)} · Size: ${formatSize(file.size)}
                    </div>
                </div>
            </label>
        `;
    }).join('');

    document.getElementById('fileSelectModal').style.display = 'block';
}

function closeFileSelectModal() {
    document.getElementById('fileSelectModal').style.display = 'none';
}

async function loadSelectedFile() {
    const selected = document.querySelector('input[name="manuscriptFile"]:checked');
    if (!selected) {
        alert('Please select a file');
        return;
    }

    const selectedName = selected.value;
    const selectedPath = selected.getAttribute('data-path');

    setCurrentFile(selectedName, selectedPath);
    closeFileSelectModal();

    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'loadingIndicator';
    loadingDiv.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 20px; border: 2px solid #333; border-radius: 8px; z-index: 10000;';
    loadingDiv.innerHTML = `<h3>Loading ${selectedName}...</h3>`;
    document.body.appendChild(loadingDiv);

    try {
        await loadDecisionsFromDropbox();
        document.body.removeChild(loadingDiv);
        updateReferenceList();
        alert(`✅ Loaded ${selectedName}\n\n${references.length} references found`);
    } catch (error) {
        document.body.removeChild(loadingDiv);
        alert(`❌ Failed to load ${selectedName}\n\nError: ${error.message}`);
        console.error('Load error:', error);
    }
}
```

---

### Task 6: Update Load Button

**File:** `index.html`
**Location:** Find the "Load" button in HTML (search for `>Load</button>`)
**Priority:** P0

**Find this:**
```html
<button class="header-button" onclick="loadDecisions()">Load</button>
```

**Replace with:**
```html
<button class="header-button" onclick="showFileSelectModal()">Load</button>
```

---

### Task 7: Update loadDecisionsFromDropbox Function

**File:** `index.html`
**Location:** Search for `async function loadDecisionsFromDropbox()`
**Priority:** P0

**Find the hardcoded filename line** (usually near the top of the function):
```javascript
const filename = 'CaughtInTheActDecisions.txt';
```

**Replace with:**
```javascript
if (!currentManuscriptFile.loadedAt) {
    restoreCurrentFile();
}

const filename = currentManuscriptFile.name;
console.log(`Loading manuscript from: ${filename}`);
```

---

### Task 8: Update saveToDropbox Function

**File:** `index.html`
**Location:** Search for `async function saveToDropbox(`
**Priority:** P0

**Find the hardcoded filename line:**
```javascript
const filename = 'CaughtInTheActDecisions.txt';
```

**Replace with:**
```javascript
const filename = currentManuscriptFile.name;
console.log(`Saving to: ${filename}`);

// Safety check for production file
if (filename === 'CaughtInTheActDecisions.txt') {
    const confirmed = confirm(
        '⚠️ You are about to save changes to PRODUCTION file.\n\n' +
        'File: CaughtInTheActDecisions.txt\n\n' +
        'Continue with save?'
    );

    if (!confirmed) {
        console.log('Save cancelled by user');
        return false;
    }
}
```

---

### Task 9: Add Context Parsing

**File:** `index.html`
**Location:** Find the reference parsing logic (search for where reference objects are created)
**Priority:** P0

**Add context extraction logic in the parsing section:**
```javascript
// Extract context if present (baseline format)
let context = null;
const contextStartIdx = text.indexOf('[CONTEXT_START]');
const contextEndIdx = text.indexOf('[CONTEXT_END]');

if (contextStartIdx !== -1 && contextEndIdx !== -1 && contextEndIdx > contextStartIdx) {
    const contextStart = contextStartIdx + '[CONTEXT_START]'.length;
    context = text.substring(contextStart, contextEndIdx).trim();
    console.log(`Extracted context for reference (${context.length} chars)`);
}

// Add context to reference object
return {
    id: rid,
    bibEntry: bibEntry,
    relevance: relevance,
    primaryUrl: primaryUrl,
    secondaryUrl: secondaryUrl,
    context: context,  // NEW: Add context property
    // ... other properties
};
```

---

### Task 10: Add View Context Button

**File:** `index.html`
**Location:** Find where reference action buttons are rendered (Finalize, Edit Reference)
**Priority:** P0

**Find the section that renders buttons** (search for "Finalize" button):
```html
<button onclick="finalizeReference(${ref.id})">Finalize</button>
<button onclick="editReference(${ref.id})">Edit Reference</button>
```

**Modify to include View Context button:**
```html
<button onclick="finalizeReference(${ref.id})">Finalize</button>
<button onclick="editReference(${ref.id})">Edit Reference</button>
${ref.context ?
    `<button onclick="viewContext(${ref.id})" style="background: #2196F3; color: white;">View Context</button>`
    : ''}
```

---

### Task 11: Add Context Display JavaScript

**File:** `index.html`
**Location:** Add after file selector functions
**Priority:** P0

**Code to add:**
```javascript
// ============================================================================
// CONTEXT DISPLAY
// ============================================================================

function viewContext(refId) {
    const ref = references.find(r => r.id === refId);

    if (!ref || !ref.context) {
        alert('No context available for this reference');
        return;
    }

    // Populate modal
    document.getElementById('contextReferenceInfo').innerHTML = `
        <strong>Reference [${ref.id}]:</strong> ${ref.bibEntry.substring(0, 100)}...
    `;

    document.getElementById('contextText').textContent = ref.context;

    // Show modal
    document.getElementById('contextModal').style.display = 'block';
}

function closeContextModal() {
    document.getElementById('contextModal').style.display = 'none';
}

// Close modal on background click
document.addEventListener('DOMContentLoaded', function() {
    const contextModal = document.getElementById('contextModal');
    if (contextModal) {
        contextModal.onclick = function(event) {
            if (event.target === this) {
                closeContextModal();
            }
        };
    }
});
```

---

## 🧪 Testing Plan

### Preparation
```bash
# Copy baseline to Dropbox for testing
cp ~/Library/CloudStorage/Dropbox/Fergi/AI\ Wrangling/References/CaughtInTheActGeneratedDecisions.txt \
   ~/Library/CloudStorage/Dropbox/Apps/Reference\ Refinement/CaughtInTheActGeneratedDecisions.txt

# Start local dev server
cd ~/Library/CloudStorage/Dropbox/Fergi/AI\ Wrangling/References
npm run dev

# Open in browser
open http://localhost:8888
```

### Test 1: File Discovery
- ✅ Click "Load" button
- ✅ Verify modal appears
- ✅ Verify both files listed (CaughtInTheActDecisions.txt, CaughtInTheActGeneratedDecisions.txt)
- ✅ Verify file metadata shown (size, date)

### Test 2: Load Generated File
- ✅ Select CaughtInTheActGeneratedDecisions.txt
- ✅ Click "Load Selected"
- ✅ Verify 288 references load
- ✅ Verify header shows filename with "(TEST)" indicator
- ✅ Verify references have NO URLs (baseline format)

### Test 3: Context Display (Baseline)
- ✅ With generated file loaded
- ✅ Navigate to first reference
- ✅ Verify "View Context" button visible
- ✅ Click "View Context"
- ✅ Verify modal opens with context text
- ✅ Verify context is readable and properly formatted
- ✅ Close modal

### Test 4: Context Missing (Production)
- ✅ Load CaughtInTheActDecisions.txt
- ✅ Navigate to first reference
- ✅ Verify NO "View Context" button (production has no context)
- ✅ Verify reference displays normally
- ✅ No JavaScript errors in console

### Test 5: Save to Generated File
- ✅ Load generated file
- ✅ Edit a reference
- ✅ Click Finalize
- ✅ Verify NO confirmation dialog (not production)
- ✅ Reload app
- ✅ Verify edit persisted

### Test 6: Production Save Confirmation
- ✅ Load production file
- ✅ Make small edit
- ✅ Click Finalize
- ✅ Verify confirmation dialog appears
- ✅ Test Cancel (prevents save)
- ✅ Test OK (allows save)

### Test 7: Persistence
- ✅ Load generated file
- ✅ Close browser
- ✅ Reopen app
- ✅ Verify app remembers last file loaded

---

## 🚀 Deployment

### Update Version Number

**File:** `index.html`
**Line:** ~10

Change:
```html
<title>Reference Refinement v18.1</title>
```

To:
```html
<title>Reference Refinement v18.2 - Multi-file + Context</title>
```

### Deploy to Netlify

```bash
cd ~/Library/CloudStorage/Dropbox/Fergi/AI\ Wrangling/References

# Verify changes
git status

# Optional: Commit changes
git add index.html
git commit -m "v18.2 - Multi-file support + context display"

# Deploy to production
netlify deploy --prod --dir="." --message "v18.2 - Multi-file + context display"

# Note the deployment URL (should be https://rrv521-1760738877.netlify.app)
```

### iPad Testing

1. **Open on iPad:** https://rrv521-1760738877.netlify.app
2. **Test multi-file loading** (touch interface)
3. **Test context display** (modal on iPad)
4. **Test save operations**
5. **Verify all features functional**

---

## 📝 Success Criteria

### Must Have (All Required)
- ✅ Production file backed up (2 copies) - **COMPLETE**
- ✅ Can load different manuscript files
- ✅ Header shows current filename
- ✅ Saves to correct file only
- ✅ Confirmation for production saves
- ✅ View Context button for baseline references
- ✅ Context displays in readable modal
- ✅ No View Context button for production (no context)
- ✅ No errors when context missing
- ✅ Works on iPad Safari

### Should Have
- File metadata in selection modal
- Clean context display formatting
- Loading indicator during file load
- Persistence across sessions

---

## 🐛 Troubleshooting

### File Discovery Not Working
- Check Dropbox OAuth function supports 'list' action
- Verify API token has folder list permissions
- Check console for error messages

### Context Not Displaying
- Verify context parsing logic extracts between tags
- Check that reference object has `context` property
- Verify modal HTML is present in DOM

### Save Confirmation Not Appearing
- Check filename comparison logic
- Verify `currentManuscriptFile.name` is set correctly
- Test with console.log before confirmation

### Persistence Not Working
- Check localStorage is enabled
- Verify JSON parse/stringify logic
- Check browser console for errors

---

## 📦 Deliverables

### Code Changes
- `index.html` - Modified with ~350 lines of new code
- Optional: `netlify/functions/dropbox-oauth.ts` - Add list support

### Backups (COMPLETE)
- ✅ `CaughtInTheActDecisions_PRODUCTION_BACKUP_2025-11-15.txt` (Dropbox)
- ✅ `CaughtInTheActDecisions_PRODUCTION_BACKUP_2025-11-15.txt` (Downloads)

### Documentation
- `V18_2_RELEASE_NOTES.md` - User-facing changelog
- `V18_2_IMPLEMENTATION_COMPLETE.md` - Technical completion report

---

## 🎯 Next Steps After v18.2

1. **Quality Comparison** - Compare AI baseline vs production
2. **Track Decision** - Track A (continue v30) vs Track B (evolutionary refinement)
3. **Production Update** - Decide if baseline quality justifies replacing production

---

**Implementation Guide Version:** 1.0
**Created:** November 15, 2025
**Status:** Ready for implementation
**Estimated Duration:** 2-3 hours
