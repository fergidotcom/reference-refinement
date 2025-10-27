# Enhancement Requests for Future Releases

This file tracks enhancement requests and feature ideas for the Reference Refinement Tool.

## For Next Release (v13.8)

### UI/UX Improvements

#### 1. Fix Reference List Width - Horizontal Scrolling Issue
**Priority:** High
**Reported:** October 26, 2025
**Description:** References in the main window are too wide, requiring horizontal scrolling to read the full content. This makes it difficult to scan through references quickly.

**Proposed Solution:**
- Implement responsive text wrapping for reference entries
- Consider truncating long titles with ellipsis and show full text on hover/expand
- Adjust column widths to fit viewport without horizontal scrolling
- May need to adjust the reference list container's CSS max-width and overflow properties

**Affected Component:** Main reference list display (around line 1400-1600 in HTML)

---

## Backlog (Lower Priority)

*Additional enhancements will be added here as they are identified*

---

## Completed Enhancements

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
