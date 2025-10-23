# v6.2 Quick Reference - What Changed

## Files Modified

### 1. netlify/functions/llm-chat.ts
**Changed:** OpenAI API → Claude Messages API
```typescript
// OLD (OpenAI)
https://api.openai.com/v1/chat/completions
model: "gpt-4o-mini"

// NEW (Claude)
https://api.anthropic.com/v1/messages
model: "claude-3-5-haiku-20241022" (default)
```

### 2. netlify/functions/llm-rank.ts
**Changed:** OpenAI API → Claude Messages API
- Same API switch as llm-chat.ts
- Now accepts `model` parameter from UI
- Better JSON parsing for Claude responses

### 3. rr_v62.html (formerly rr_v60.html)

#### Version Updates
- Title: `v6.0` → `v6.2`
- Header: `v6.0` → `v6.2`

#### CSS Changes
```css
/* ADDED to .reference-card */
overflow-wrap: break-word;
word-wrap: break-word;
word-break: break-word;

/* ADDED to .reference-content h3 */
overflow-wrap: break-word;
word-wrap: break-word;
word-break: break-word;

/* ADDED to .reference-authors */
overflow-wrap: break-word;
word-wrap: break-word;
word-break: break-word;
```

#### HTML Changes - Added Model Selector
```html
<!-- NEW in Search Assistance section -->
<div class="form-group">
    <label class="form-label">AI Model</label>
    <select id="aiModel" class="form-select">
        <option value="claude-3-5-haiku-20241022" selected>
            Claude 3.5 Haiku (Fast & Economical)
        </option>
        <option value="claude-3-5-sonnet-20241022">
            Claude 3.5 Sonnet (Most Capable)
        </option>
    </select>
</div>
```

#### JavaScript Changes

**generateQueries() function:**
```javascript
// ADDED
const model = document.getElementById('aiModel').value;

// MODIFIED
body: JSON.stringify({ prompt, model })  // added model parameter
```

**rankCandidates() function:**
```javascript
// ADDED
const model = document.getElementById('aiModel').value;

// MODIFIED
body: JSON.stringify({
    reference: {...},
    candidates: ref.searchResults,
    model: model  // added model parameter
})
```

## Environment Variables

### Required in Netlify
```bash
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

### No Longer Used (can be removed)
```bash
OPENAI_API_KEY=sk-proj-...  # Not needed anymore
```

## Testing Checklist

- [ ] Version shows v6.2 in header
- [ ] Reference cards don't overflow horizontally
- [ ] Long titles wrap properly
- [ ] Long author names wrap properly
- [ ] AI Model dropdown appears in Edit modal
- [ ] Default model is Haiku
- [ ] Can switch to Sonnet model
- [ ] "Generate Queries" works with Haiku
- [ ] "Generate Queries" works with Sonnet
- [ ] "Rank Candidates" works with Haiku
- [ ] "Rank Candidates" works with Sonnet
- [ ] Error messages appear if API fails
- [ ] No console errors

## Quick Deploy Command

```bash
cd ~/Library/CloudStorage/Dropbox/Fergi/AI\ Wrangling/References/reference-refinement-v6/
netlify deploy --prod --dir="." --message "v6.2 - Claude API + word-wrap fixes"
```

## Model Selection Guide

### Use Haiku (Default) when:
- Generating simple search queries
- Speed is important
- Cost needs to be minimized
- Task is straightforward

### Use Sonnet when:
- Ranking search results (better accuracy)
- Complex reference analysis
- Quality is more important than speed
- Working with ambiguous references

## Cost Comparison

Per reference operation:
- **Haiku**: ~$0.0002 (recommended for most tasks)
- **Sonnet**: ~$0.005 (use when accuracy critical)

For 100 references:
- **Haiku**: ~$0.02
- **Sonnet**: ~$0.50

## What This Fixes

### From v6.1 Issues:
1. ✅ Reference cards wider than viewport (word-wrap added)
2. ✅ Long titles breaking layout (word-break added)
3. ✅ Ready for Claude integration (API switched)

### New Features:
1. ✅ Choice between two AI models
2. ✅ Better cost control (default to Haiku)
3. ✅ Improved accuracy option (Sonnet)

## Backward Compatibility

- ✅ All existing data formats work unchanged
- ✅ decisions.txt format unchanged
- ✅ Export format unchanged
- ⚠️ Old OPENAI_API_KEY no longer used (can remove)
- ✅ UI functionality unchanged (just added dropdown)

## If Something Breaks

1. Check Netlify function logs
2. Check browser console
3. Verify ANTHROPIC_API_KEY is set
4. Try with Haiku first (more reliable)
5. Force refresh page (clear cache)
6. If all else fails, rollback to v6.1
