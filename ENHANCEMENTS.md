# Enhancement Requests for Future Releases

This file tracks enhancement requests and feature ideas for the Reference Refinement Tool.

## For Next Release (v13.10)

### Performance Improvements

#### 1. Monitoring Dashboard for Autorank Performance
**Priority:** Medium
**Description:** Add real-time performance metrics to the Debug tab showing:
- Average API response time per batch
- Success rate percentage
- Total tokens used per session
- Batch processing timeline visualization

**Benefit:** Help users understand performance and identify bottlenecks

### UI/UX Improvements

#### 2. Enhanced Reference Card Layout
**Priority:** Low
**Description:** Consider adding:
- Collapsible relevance sections for long descriptions
- Visual indicators for URL quality/availability
- Quick preview of URLs on hover

**Benefit:** Better information density and user experience

---

## Backlog (Lower Priority)

*Additional enhancements will be added here as they are identified*

---

## Completed Enhancements

### v13.9
- **Fixed horizontal scrolling in reference list** - Added CSS word-breaking and overflow handling
- **Drastically simplified ranking prompt** - Reduced from 118 lines to 20 lines for faster processing
- **Ultra-conservative batch size** - Reduced to 10 candidates per batch for reliable completion

### v13.8
- **Added 18-second API timeout** - Graceful failure instead of hard Netlify timeouts
- **Reduced max_tokens to 1500** - Faster Claude generation

### v13.0
- Dropbox OAuth with PKCE integration
- Enhanced ranking with search tool
- User notes panel in Debug tab
- Token refresh functionality

### v12.0
- AI-Powered Search During Ranking

### v11.0
- Initial Dropbox integration

---

**Note:** This file tracks user-requested enhancements. For bug fixes and technical debt, see individual version documentation files.
