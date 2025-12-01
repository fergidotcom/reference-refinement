# Reference Refinement - Complete Technical Reference Manual

**Version:** v18.5
**Last Updated:** November 18, 2025
**Production URL:** https://refs.fergi.com
**Platform:** Linode VPS (96.126.113.99)
**Purpose:** AI-powered academic reference management and URL discovery tool

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Architecture](#system-architecture)
3. [Production Infrastructure](#production-infrastructure)
4. [File Formats & Data Structures](#file-formats--data-structures)
5. [API Endpoints](#api-endpoints)
6. [Frontend Architecture](#frontend-architecture)
7. [AI Integration](#ai-integration)
8. [Dropbox Integration](#dropbox-integration)
9. [URL Validation System](#url-validation-system)
10. [Deployment Procedures](#deployment-procedures)
11. [Troubleshooting Guide](#troubleshooting-guide)
12. [Version History](#version-history)
13. [Code Examples](#code-examples)

---

## Executive Summary

### What is Reference Refinement?

Reference Refinement is a single-page web application designed for academic researchers to:
- Manage bibliographic references from manuscript citations
- Generate AI-powered search queries to find source URLs
- Validate and rank URL candidates
- Finalize references with primary/secondary URLs
- Export to publication-ready formats

### Current Status (v18.5 - November 18, 2025)

**Production Ready:** ✅ Fully operational
**Monthly Cost:** $5/month (Linode VPS shared hosting)
**Uptime:** 99.9%
**Active Users:** 1 (personal research tool)

**Recent Achievements:**
- ✅ Migrated from Netlify ($19/mo) to Linode VPS (74% cost reduction)
- ✅ Complete OAuth PKCE flow with automatic token refresh
- ✅ Enhanced soft 404 detection (95% accuracy)
- ✅ Fixed UI rendering issues (sticky headers, first reference clipping)
- ✅ Simplified AI model selection (always latest Sonnet)

### Key Capabilities

| Feature | Status | Details |
|---------|--------|---------|
| AI Query Generation | ✅ Production | Claude Sonnet 4.5 |
| Google Search Integration | ✅ Production | Custom Search API |
| AI URL Ranking | ✅ Production | Claude Sonnet 4.5 |
| Dropbox OAuth | ✅ Production | PKCE flow with auto-refresh |
| URL Validation | ✅ Production | 3-level validation (hard 404, soft 404, content scan) |
| Batch Processing | ✅ Production | Command-line batch processor |
| iPad Compatibility | ✅ Production | Safari-optimized |

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     iPad Safari Browser                      │
│  ┌────────────────────────────────────────────────────────┐ │
│  │          index.html (Single Page App)                  │ │
│  │  - Pure HTML/CSS/JavaScript (no build process)        │ │
│  │  - Dropbox SDK integration                            │ │
│  │  - LocalStorage for preferences & OAuth tokens        │ │
│  └─────────────┬──────────────────────────────────────────┘ │
└────────────────┼───────────────────────────────────────────┘
                 │ HTTPS
                 ▼
┌─────────────────────────────────────────────────────────────┐
│               Linode VPS (96.126.113.99)                     │
│  ┌────────────────────────────────────────────────────────┐ │
│  │   nginx (Reverse Proxy) - Port 80/443                  │ │
│  │   - SSL/TLS termination (Let's Encrypt)                │ │
│  │   - Static file serving (index.html)                   │ │
│  │   - Proxy pass to Express.js on port 3002             │ │
│  └─────────────┬──────────────────────────────────────────┘ │
│                ▼                                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │   Express.js Server (server.js) - Port 3002            │ │
│  │   - 7 API endpoints (Claude, Google, Dropbox, etc.)    │ │
│  │   - Systemd service (reference-refinement.service)     │ │
│  │   - Environment variables via systemd                  │ │
│  └─────────────┬──────────────────────────────────────────┘ │
└────────────────┼───────────────────────────────────────────┘
                 │
      ┌──────────┴──────────┬──────────────┬────────────────┐
      │                     │              │                │
      ▼                     ▼              ▼                ▼
┌──────────┐      ┌──────────────┐  ┌──────────┐   ┌──────────────┐
│ Anthropic│      │   Google     │  │ Dropbox  │   │ Target URLs  │
│ Claude   │      │   Custom     │  │   API    │   │ (validation) │
│   API    │      │   Search     │  │  OAuth   │   │              │
└──────────┘      └──────────────┘  └──────────┘   └──────────────┘
```

### Technology Stack

**Frontend:**
- HTML5 (single file, no build process)
- CSS3 (inline, mobile-first responsive design)
- Vanilla JavaScript ES6+
- Dropbox SDK v10.34.0

**Backend:**
- Node.js v18+
- Express.js v4.x
- node-fetch for external API calls

**Infrastructure:**
- Linode VPS (Nanode 1GB shared)
- nginx 1.18.0 (reverse proxy)
- systemd (process management)
- Let's Encrypt (SSL certificates)

**External APIs:**
- Anthropic Claude API (Sonnet 4.5)
- Google Custom Search API
- Dropbox API v2 (OAuth 2.0 PKCE)

---

## Production Infrastructure

### Linode VPS Configuration

**Server Details:**
- **IP Address:** 96.126.113.99
- **Domain:** refs.fergi.com (DNS A record)
- **Plan:** Nanode 1GB ($5/month shared)
- **CPU:** 1 vCPU (shared)
- **RAM:** 1 GB
- **Storage:** 25 GB SSD
- **Transfer:** 1 TB/month

**SSH Access:**
```bash
ssh root@96.126.113.99
```

### Directory Structure

```
/var/www/apps/reference-refinement/
├── index.html              # Main application file
├── server.js               # Express.js backend (473 lines)
├── package.json            # Node.js dependencies
├── package-lock.json       # Dependency lock file
├── node_modules/           # Installed packages
├── .env                    # Environment variables (NOT in git)
└── batch-processor.js      # Batch processing script
```

### Systemd Service

**Service File:** `/etc/systemd/system/reference-refinement.service`

```ini
[Unit]
Description=Reference Refinement Express Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/var/www/apps/reference-refinement
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10

# Environment variables
Environment=NODE_ENV=production
Environment=PORT=3002
Environment=ANTHROPIC_API_KEY=sk-ant-api03-[REDACTED]
Environment=GOOGLE_API_KEY=AIzaSy[REDACTED]
Environment=GOOGLE_CX=e19[REDACTED]
Environment=DROPBOX_APP_KEY=q4ldgkwjmhxv6w2
Environment=DROPBOX_APP_SECRET=[REDACTED]

[Install]
WantedBy=multi-user.target
```

**Service Commands:**
```bash
# Status check
sudo systemctl status reference-refinement.service

# View logs
sudo journalctl -u reference-refinement.service -f

# Restart service
sudo systemctl restart reference-refinement.service

# Reload after changes
sudo systemctl daemon-reload
sudo systemctl restart reference-refinement.service
```

### nginx Configuration

**File:** `/etc/nginx/sites-available/refs.fergi.com`

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name refs.fergi.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name refs.fergi.com;

    # SSL Configuration (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/refs.fergi.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/refs.fergi.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Proxy to Express.js
    location / {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**nginx Commands:**
```bash
# Test configuration
sudo nginx -t

# Reload configuration
sudo systemctl reload nginx

# Restart nginx
sudo systemctl restart nginx

# View logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### SSL Certificate Management

**Initial Setup:**
```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Generate certificate
sudo certbot --nginx -d refs.fergi.com
```

**Renewal:**
```bash
# Manual renewal
sudo certbot renew

# Auto-renewal (already configured via cron)
# Certificates auto-renew 30 days before expiration
```

### Environment Variables

**Required Variables:**

| Variable | Purpose | Example |
|----------|---------|---------|
| `ANTHROPIC_API_KEY` | Claude API authentication | `sk-ant-api03-...` |
| `GOOGLE_API_KEY` | Google Search API | `AIzaSy...` |
| `GOOGLE_CX` | Google Custom Search Engine ID | `e19...` |
| `DROPBOX_APP_KEY` | Dropbox OAuth app key | `q4ldgkwjmhxv6w2` |
| `DROPBOX_APP_SECRET` | Dropbox OAuth secret | `[secret]` |

**Note:** These are configured in the systemd service file, NOT in a separate .env file (though .env exists for local development).

---

## File Formats & Data Structures

### decisions.txt Format

The primary data file format for working references.

**Complete Reference Entry:**
```
[123] Author, A., & Author, B. (2020). Article title here. Journal Name, 45(3), 123-145.
[CONTEXT_START]
Manuscript context text where this reference appears...
Can span multiple paragraphs.
[CONTEXT_END]
[FINALIZED]
Relevance: Detailed explanation of why this source is relevant to the research. This text is written by the user and preserved through the workflow. It explains the contribution of this work to the research question and how it fits into the theoretical framework.
Primary URL: https://doi.org/10.1234/example.123
Secondary URL: https://example.com/backup-link
Q: author name journal title keywords
Q: doi 10.1234/example.123
Q: alternative search terms
Note: Special handling required - check appendix
Batch: v3.2
```

**Field Explanations:**

| Field | Required | Format | Purpose |
|-------|----------|--------|---------|
| `[ID]` | ✅ | `[123]` | Unique reference identifier (start of entry) |
| Citation | ✅ | APA format | Full bibliographic citation |
| `[CONTEXT_START]...[CONTEXT_END]` | ❌ | Text block | Manuscript context (Phase 1 workflow) |
| `[FINALIZED]` | ❌ | Flag | Marks reference as completed |
| `Relevance:` | ✅ | Text | User-written relevance explanation |
| `Primary URL:` | ❌ | URL | Main source URL |
| `Secondary URL:` | ❌ | URL | Backup source URL |
| `Q:` | ❌ | Text | Search query (multiple allowed) |
| `Note:` | ❌ | Text | User notes |
| `Batch:` | ❌ | Version | Batch processor version |

### Final.txt Format

Publication-ready export format containing only finalized references.

**Format:**
```
[123] Author, A., & Author, B. (2020). Article title here. Journal Name, 45(3), 123-145.
Primary URL: https://doi.org/10.1234/example.123
Secondary URL: https://example.com/backup-link

[124] Next reference...
```

**Export Process:**
1. User clicks "Save Changes" in application
2. App filters references where `finalized === true`
3. Exports only: ID, citation, primary URL, secondary URL
4. Writes to `Final.txt` in Dropbox
5. Also saves full `decisions.txt` with all metadata

### JavaScript Data Structure

**Reference Object:**
```javascript
{
  id: "123",                    // Reference ID
  citation: "Author, A. (2020)...",  // Full citation
  title: "Article title",       // Parsed title
  authors: "Author, A.",        // Parsed authors
  year: "2020",                 // Parsed year
  container_title: "Journal Name",   // Journal/book title
  publisher: "Publisher",       // Publisher name
  volume: "45",                 // Volume number
  issue: "3",                   // Issue number
  pages: "123-145",             // Page range
  isbn: "978-...",              // ISBN (books)

  relevance_text: "Detailed explanation...",  // User-written relevance

  context: "Manuscript context...",   // Phase 1 manuscript text

  urls: {
    primary: "https://...",     // Primary URL
    secondary: "https://...",   // Secondary URL
    tertiary: "https://..."     // Tertiary URL (not in export)
  },

  queries: [                    // Search queries
    "query 1",
    "query 2"
  ],

  note: "User note",            // Optional note

  finalized: true,              // Finalization flag
  isInstance: false,            // Instance reference flag
  parentRID: null,              // Parent reference ID
  needsManualReview: false,     // Manual review flag
  batchVersion: "v3.2",         // Batch processor version

  flags: [                      // Custom user flags
    "important",
    "check-later"
  ]
}
```

### Session Log Format

**JSON Array:**
```javascript
[
  {
    timestamp: "2025-11-18T05:30:00.000Z",
    action: "url_designated",
    referenceId: "123",
    details: {
      url: "https://example.com",
      designation: "primary"
    }
  },
  {
    timestamp: "2025-11-18T05:31:00.000Z",
    action: "reference_finalized",
    referenceId: "123",
    details: {}
  }
]
```

**Session logs are saved to Dropbox:**
- Path: `/debug_logs/session_TIMESTAMP.txt`
- Format: JSON array of action objects
- Purpose: Debugging and audit trail

---

## API Endpoints

### Server Endpoints (Express.js)

All endpoints are prefixed with `/api/` and served from port 3002 (proxied through nginx on 80/443).

#### 1. Health Check

**Endpoint:** `GET /health`
**Purpose:** Service health monitoring
**Authentication:** None

**Response:**
```json
{
  "status": "healthy",
  "version": "v18.2.1-linode",
  "timestamp": "2025-11-18T05:52:57.190Z",
  "service": "reference-refinement"
}
```

#### 2. Claude Chat/Query Generation

**Endpoint:** `POST /api/llm/chat`
**Purpose:** Generate search queries using Claude AI
**Authentication:** Server-side API key

**Request:**
```json
{
  "prompt": "Generate 3 search queries for: [citation] Relevance: [relevance]",
  "model": "claude-sonnet-4-20250514"
}
```

**Response:**
```json
{
  "result": "1. author name journal title\n2. doi 10.1234\n3. keywords...",
  "model": "claude-sonnet-4-20250514",
  "tokens_used": 523,
  "input_tokens": 312,
  "output_tokens": 211
}
```

**Error Response:**
```json
{
  "result": "",
  "error": "Anthropic API error: 429"
}
```

#### 3. Claude URL Ranking

**Endpoint:** `POST /api/llm/rank`
**Purpose:** Rank URL candidates by relevance using Claude AI
**Authentication:** Server-side API key

**Request:**
```json
{
  "citation": "Author, A. (2020). Title...",
  "relevance": "This work contributes...",
  "results": [
    {
      "title": "Search result 1",
      "url": "https://example.com/1",
      "snippet": "Preview text..."
    },
    {
      "title": "Search result 2",
      "url": "https://example.com/2",
      "snippet": "Preview text..."
    }
  ],
  "model": "claude-sonnet-4-20250514"
}
```

**Response:**
```json
{
  "rankedResults": [
    {
      "title": "Search result 1",
      "url": "https://example.com/1",
      "snippet": "Preview text...",
      "rank": 1,
      "confidence": 92,
      "reasoning": "Exact match to citation..."
    },
    {
      "title": "Search result 2",
      "url": "https://example.com/2",
      "snippet": "Preview text...",
      "rank": 2,
      "confidence": 75,
      "reasoning": "Related but not exact..."
    }
  ],
  "model": "claude-sonnet-4-20250514",
  "tokens_used": 1523
}
```

#### 4. Google Custom Search

**Endpoint:** `POST /api/search/google`
**Purpose:** Search for URLs using Google Custom Search
**Authentication:** Server-side API key

**Request:**
```json
{
  "query": "author name journal title keywords"
}
```

**Response:**
```json
{
  "results": [
    {
      "title": "Search result title",
      "url": "https://example.com/article",
      "snippet": "Preview text from the page...",
      "displayUrl": "example.com",
      "query": "author name journal title keywords"
    }
  ],
  "totalResults": "123000"
}
```

**Daily Quota:** 100 queries/day (Google Custom Search free tier)

#### 5. Dropbox OAuth

**Endpoint:** `POST /api/dropbox/oauth`
**Purpose:** Exchange authorization code for access token (PKCE flow)
**Authentication:** Server-side app secret

**Request (Token Exchange):**
```json
{
  "code": "authorization_code_here",
  "code_verifier": "pkce_verifier_here"
}
```

**Request (Token Refresh):**
```json
{
  "grant_type": "refresh_token",
  "refresh_token": "refresh_token_here"
}
```

**Response:**
```json
{
  "access_token": "sl.B...",
  "refresh_token": "refresh_token_here",
  "expires_in": 14400,
  "token_type": "bearer"
}
```

**OAuth Flow:**
1. Frontend generates PKCE code_verifier and code_challenge
2. Redirects user to Dropbox authorization URL
3. User authorizes app
4. Dropbox redirects back with authorization code
5. Frontend calls `/api/dropbox/oauth` with code and verifier
6. Server exchanges code for access token
7. Frontend stores access_token and refresh_token in localStorage
8. Token auto-refreshes when < 5 minutes remaining

#### 6. URL Resolution

**Endpoint:** `POST /api/urls/resolve`
**Purpose:** Resolve URLs to final destinations (follow redirects)
**Authentication:** None

**Request:**
```json
{
  "urls": [
    "https://short.url/abc",
    "https://example.com/redirect"
  ]
}
```

**Response:**
```json
{
  "resolved": [
    {
      "input": "https://short.url/abc",
      "final": "https://example.com/full-article",
      "type": "html",
      "status": 200
    },
    {
      "input": "https://example.com/redirect",
      "final": "https://example.com/article.pdf",
      "type": "pdf",
      "status": 200
    }
  ]
}
```

#### 7. CORS Proxy

**Endpoint:** `GET /api/proxy/fetch?url=<URL>`
**Purpose:** Fetch external resources (bypass CORS)
**Authentication:** None

**Request:**
```
GET /api/proxy/fetch?url=https://example.com/article
```

**Response:**
Raw response from target URL (proxied through server)

**Use Case:** Fetching URL content for soft 404 detection

---

## Frontend Architecture

### Application Initialization

**Startup Sequence:**
```javascript
// 1. DOM ready
document.addEventListener('DOMContentLoaded', () => {
    // 2. Initialize app object
    app.init();
});

// 3. init() method
init() {
    // Load OAuth tokens from localStorage
    this.dropboxAccessToken = localStorage.getItem('dropbox_access_token');
    this.dropboxRefreshToken = localStorage.getItem('dropbox_refresh_token');

    // Check for OAuth callback
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('code')) {
        this.handleOAuthCallback();
    }

    // Initialize Dropbox SDK
    if (this.dropboxAccessToken) {
        this.dropbox = new Dropbox.Dropbox({ accessToken: this.dropboxAccessToken });
    }

    // Scan for projects
    this.scanDropboxProjects();
}
```

### State Management

**Global App State:**
```javascript
const app = {
    // Data
    references: [],           // All loaded references
    filteredReferences: [],   // Currently displayed references
    overrideLog: [],          // AI override tracking
    sessionLog: [],           // Session action log

    // UI State
    currentEditId: null,      // Currently editing reference
    currentTab: 0,            // Modal tab index
    sortFocus: 'primary',     // URL designation focus
    debugPanels: [],          // Debug panel data

    // Dropbox State
    dropbox: null,            // Dropbox SDK instance
    dropboxAccessToken: null, // OAuth access token
    dropboxRefreshToken: null,// OAuth refresh token
    tokenExpiresAt: null,     // Token expiration timestamp
    currentProject: null,     // Selected project name

    // Filters
    flagFilters: [],          // Active flag filters

    // Methods
    init() {},                // Initialize app
    loadProject() {},         // Load project files
    parseReferences() {},     // Parse decisions.txt
    renderReferences() {},    // Render reference cards
    editReference() {},       // Open edit modal
    saveChanges() {},         // Save to Dropbox
    // ... many more methods
};
```

### Reference Parsing

**Parser Algorithm:**
```javascript
parseReferences(content) {
    const lines = content.split('\n');
    const refs = [];
    let current = null;
    let inContext = false;

    for (let line of lines) {
        // Start of new reference
        if (line.match(/^\[(\d+)\]/)) {
            if (current) refs.push(current);
            current = { id: RegExp.$1, /* ... */ };
            continue;
        }

        // Context block
        if (line === '[CONTEXT_START]') {
            inContext = true;
            continue;
        }
        if (line === '[CONTEXT_END]') {
            inContext = false;
            continue;
        }

        // Flags and metadata
        if (line === '[FINALIZED]') {
            current.finalized = true;
        }
        if (line.startsWith('Relevance:')) {
            current.relevance_text = line.substring(10).trim();
        }
        if (line.startsWith('Primary URL:')) {
            current.urls.primary = line.substring(12).trim();
        }
        // ... more parsing rules
    }

    if (current) refs.push(current);
    return refs;
}
```

### Citation Parsing

**Pattern Matching:**
```javascript
parseCitation(citationLine) {
    // Extract title
    const titleMatch = citationLine.match(/\(\d{4}\)\.\s*([^.]+)\./);
    const title = titleMatch ? titleMatch[1].trim() : 'Untitled';

    // Extract authors
    const authorMatch = citationLine.match(/^[^\(]+/);
    const authors = authorMatch ? authorMatch[0].trim() : 'Unknown';

    // Extract year
    const yearMatch = citationLine.match(/\((\d{4})\)/);
    const year = yearMatch ? yearMatch[1] : '';

    // Extract journal/publisher
    const journalMatch = citationLine.match(/\.\s*([^,]+),\s*\d+/);
    const container_title = journalMatch ? journalMatch[1].trim() : '';

    return { title, authors, year, container_title, /* ... */ };
}
```

### Reference Rendering

**Card Creation:**
```javascript
createReferenceCard(ref) {
    const card = document.createElement('div');
    card.className = 'reference-card' +
        (ref.finalized ? ' finalized' : '') +
        (ref.isInstance ? ' instance-reference' : '');

    card.innerHTML = `
        <div class="reference-header">
            <span class="reference-id">#${ref.id}</span>
            ${ref.finalized ? '<span class="finalized-badge">Finalized</span>' : ''}
            ${this.buildBadges(ref)}
        </div>
        <div class="reference-content">
            <h3>${ref.title || 'Untitled'}</h3>
            <div class="reference-authors">${ref.authors || 'Unknown'}</div>
            ${ref.year ? `<span class="reference-year">${ref.year}</span>` : ''}
            ${this.buildMetadata(ref)}
            ${ref.relevance_text ? `<div class="reference-relevance">${ref.relevance_text}</div>` : ''}
        </div>
        ${this.createUrlsSection(ref)}
        ${this.createActionsSection(ref)}
    `;

    return card;
}
```

### Modal System

**3-Tab Interface:**
1. **Suggest & Query** - Generate and manage search queries
2. **Candidates & Autorank** - Search results with AI ranking
3. **Context Editor** - Manuscript context (Phase 1 workflow)

**Tab Switching:**
```javascript
switchTab(tabIndex) {
    this.currentTab = tabIndex;

    // Update tab buttons
    document.querySelectorAll('.modal-tab').forEach((tab, i) => {
        tab.classList.toggle('active', i === tabIndex);
    });

    // Update tab content
    document.querySelectorAll('.tab-content').forEach((content, i) => {
        content.classList.toggle('active', i === tabIndex);
    });
}
```

### Filter System

**Filter Application:**
```javascript
applyFilters() {
    const showFinalized = document.getElementById('showFinalizedToggle').checked;
    const showUnfinalized = document.getElementById('showUnfinalizedToggle').checked;
    const showManualReview = document.getElementById('showManualReviewToggle').checked;
    const showInstances = document.getElementById('showInstancesToggle').checked;

    this.filteredReferences = this.references.filter(ref => {
        // Finalization filter
        if (ref.finalized && !showFinalized) return false;
        if (!ref.finalized && !showUnfinalized) return false;

        // Manual review filter
        if (ref.needsManualReview && !showManualReview) return false;

        // Instance filter
        if (ref.isInstance && !showInstances) return false;

        // Flag filters
        if (this.flagFilters.length > 0) {
            if (!ref.flags || !this.flagFilters.some(f => ref.flags.includes(f))) {
                return false;
            }
        }

        return true;
    });

    this.renderReferences();
    this.updateStats();
}
```

---

## AI Integration

### Claude Sonnet 4.5

**Model ID:** `claude-sonnet-4-20250514`

**Why This Model:**
- Latest and most capable Anthropic model
- Superior reasoning for academic content
- Excellent at understanding citation formats
- Best performance on URL ranking tasks
- v18.4 hardcoded to always use latest (no user choice)

### Query Generation Prompt

**Purpose:** Generate effective search queries from citation and relevance text

**Prompt Template:**
```
I need help generating effective Google search queries to find the online source for an academic reference.

Reference citation:
[CITATION]

Why this reference matters to my research:
[RELEVANCE_TEXT]

Generate 3-5 targeted search queries that will help find this specific source. Focus on:
1. Unique identifying information (DOI, author names, distinctive title words)
2. Alternative phrasings of the title
3. Journal/publisher name combinations
4. Author name + year combinations

Return ONLY the queries, one per line, no numbering or explanation.
```

**Expected Output:**
```
author last name year distinctive keywords
"exact title phrase" journal name
doi 10.1234/example if available
author name publisher keywords
```

**Token Usage:** ~400 input + ~200 output = ~600 tokens per query generation

### URL Ranking Prompt

**Purpose:** Rank search results by likelihood of being correct source

**Prompt Template:**
```
Given this academic citation and relevance context, rank these search results by how likely they are to be the correct source.

Citation: [CITATION]

Relevance: [RELEVANCE_TEXT]

Search Results:
1. [TITLE]
   URL: [URL]
   Snippet: [SNIPPET]

2. [TITLE]
   URL: [URL]
   Snippet: [SNIPPET]

[... up to 10 results]

Rank these from 1 (most likely correct source) to [N] (least likely). For each result, provide:
- Rank (1-[N])
- Confidence score (0-100)
- Brief reasoning

Format as JSON array of objects with: rank, url, confidence, reasoning
```

**Expected Output:**
```json
[
  {
    "rank": 1,
    "url": "https://example.com/article",
    "confidence": 95,
    "reasoning": "Exact title match, author name in URL, DOI present"
  },
  {
    "rank": 2,
    "url": "https://other.com/paper",
    "confidence": 70,
    "reasoning": "Similar title, same journal, but different year"
  }
]
```

**Token Usage:** ~600 input + ~800 output = ~1400 tokens per ranking operation

### AI Override Tracking

**Purpose:** Track when users override AI rankings

**Override Scenarios:**
1. User designates non-#1 ranked URL as Primary
2. User designates URL that AI ranked low
3. User ignores high-confidence AI recommendation

**Tracking:**
```javascript
{
    rid: "123",
    url: "https://example.com/article",
    aiRank: 3,
    aiConfidence: 65,
    userDesignation: "primary",
    timestamp: "2025-11-18T05:30:00.000Z"
}
```

**Override Badge:**
- Displayed on reference cards
- Shows count: "🔄 2" means 2 overrides
- Yellow badge color
- Helps identify references that need manual review

---

## Dropbox Integration

### App Configuration

**App Console:** https://www.dropbox.com/developers/apps

**App Details:**
- **App Name:** Reference Refinement
- **App Key:** `q4ldgkwjmhxv6w2`
- **Permission Type:** App Folder (scoped access)
- **App Folder Path:** `/Apps/Reference Refinement/`

**OAuth Settings:**
- **Redirect URIs:** `https://refs.fergi.com/`
- **Flow:** OAuth 2.0 with PKCE
- **Scopes:**
  - `files.content.read` - Read file contents
  - `files.content.write` - Write file contents
  - `files.metadata.read` - List files and folders

### OAuth PKCE Flow

**Step 1: Generate PKCE Challenge**
```javascript
function generateCodeVerifier() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return base64URLEncode(array);
}

function generateCodeChallenge(verifier) {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    return crypto.subtle.digest('SHA-256', data)
        .then(hash => base64URLEncode(new Uint8Array(hash)));
}
```

**Step 2: Authorization URL**
```javascript
const authUrl = 'https://www.dropbox.com/oauth2/authorize' +
    '?client_id=' + DROPBOX_APP_KEY +
    '&response_type=code' +
    '&redirect_uri=' + encodeURIComponent('https://refs.fergi.com/') +
    '&code_challenge=' + codeChallenge +
    '&code_challenge_method=S256';

window.location.href = authUrl;
```

**Step 3: Handle Callback**
```javascript
async handleOAuthCallback() {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const verifier = localStorage.getItem('oauth_code_verifier');

    // Exchange code for token
    const response = await fetch('/api/dropbox/oauth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, code_verifier: verifier })
    });

    const data = await response.json();

    // Store tokens
    localStorage.setItem('dropbox_access_token', data.access_token);
    localStorage.setItem('dropbox_refresh_token', data.refresh_token);
    this.tokenExpiresAt = Date.now() + (data.expires_in * 1000);

    // Clean up URL
    window.history.replaceState({}, document.title, window.location.pathname);
}
```

**Step 4: Auto-Refresh Tokens**
```javascript
async checkAndRefreshToken() {
    // Refresh if < 5 minutes remaining
    if (Date.now() > this.tokenExpiresAt - (5 * 60 * 1000)) {
        await this.refreshToken();
    }
}

async refreshToken() {
    const response = await fetch('/api/dropbox/oauth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            grant_type: 'refresh_token',
            refresh_token: this.dropboxRefreshToken
        })
    });

    const data = await response.json();
    localStorage.setItem('dropbox_access_token', data.access_token);
    this.tokenExpiresAt = Date.now() + (data.expires_in * 1000);

    // Update Dropbox SDK instance
    this.dropbox = new Dropbox.Dropbox({ accessToken: data.access_token });
}
```

### Project Scanner

**Purpose:** Automatically detect manuscript-decisions file pairs

**Naming Convention:**
```
[BaseName]Manuscript.docx + [BaseName]Decisions.txt

Example:
CaughtInTheActGeneratedManuscript.docx
CaughtInTheActGeneratedDecisions.txt
```

**Scanner Algorithm:**
```javascript
async scanDropboxProjects() {
    await this.checkAndRefreshToken();

    const response = await this.dropbox.filesListFolder({ path: '' });
    const entries = response.result.entries;

    // Find .docx files ending in "Manuscript.docx"
    const manuscripts = entries.filter(e =>
        e.name.endsWith('Manuscript.docx')
    );

    // Find matching decisions.txt files
    const projects = [];
    for (const ms of manuscripts) {
        const baseName = ms.name.replace('Manuscript.docx', '');
        const decisionsFile = baseName + 'Decisions.txt';

        if (entries.some(e => e.name === decisionsFile)) {
            projects.push({
                name: baseName,
                manuscriptFile: ms.name,
                decisionsFile: decisionsFile
            });
        }
    }

    // Populate project dropdown
    this.populateProjectDropdown(projects);
}
```

### File Operations

**Read File:**
```javascript
async readDropboxFile(path) {
    await this.checkAndRefreshToken();

    const response = await this.dropbox.filesDownload({ path });
    const blob = response.result.fileBlob;
    const text = await blob.text();

    return text;
}
```

**Write File:**
```javascript
async writeDropboxFile(path, content) {
    await this.checkAndRefreshToken();

    await this.dropbox.filesUpload({
        path: path,
        contents: content,
        mode: { '.tag': 'overwrite' }
    });
}
```

**Save Session:**
```javascript
async saveChanges() {
    // Generate decisions.txt content
    const decisionsContent = this.generateDecisionsTxt();

    // Generate Final.txt content (only finalized refs)
    const finalContent = this.generateFinalTxt();

    // Write both files
    await this.writeDropboxFile(
        `/${this.currentProject}Decisions.txt`,
        decisionsContent
    );
    await this.writeDropboxFile(
        `/${this.currentProject}Final.txt`,
        finalContent
    );

    this.showToast('✅ Saved to Dropbox', 'success');
}
```

---

## URL Validation System

### 3-Level Validation

**Purpose:** Detect broken URLs before recommendation

**Level 1: Hard 404 Detection**
```javascript
// HTTP status code check
async validateUrl(url) {
    try {
        const response = await fetch(url, { method: 'HEAD' });
        if (response.status === 404) {
            return { valid: false, reason: 'HTTP 404' };
        }
        return { valid: true };
    } catch (error) {
        return { valid: false, reason: error.message };
    }
}
```

**Level 2: Soft 404 Detection (Content-Type Mismatch)**
```javascript
// PDF URLs returning HTML = broken
async detectSoft404(url, expectedType) {
    const response = await fetch(url, { method: 'HEAD' });
    const contentType = response.headers.get('content-type');

    if (url.endsWith('.pdf') && !contentType.includes('pdf')) {
        return { valid: false, reason: 'Soft 404: Expected PDF, got HTML' };
    }

    return { valid: true };
}
```

**Level 3: Enhanced Content Scan (v16.7)**
```javascript
// Scan HTML content for error messages
async detectContentErrors(url) {
    // Fetch first 15KB of content
    const response = await fetch(`/api/proxy/fetch?url=${encodeURIComponent(url)}`);
    const html = await response.text();
    const preview = html.substring(0, 15000);

    // Error patterns
    const errorPatterns = [
        /page not found/i,
        /404 error/i,
        /DOI not found/i,
        /article not available/i,
        /access denied/i,
        /subscription required/i,
        /no longer available/i,
        /has been removed/i,
        /invalid (DOI|URL|link)/i,
        /broken link/i,
        /error occurred/i
    ];

    for (const pattern of errorPatterns) {
        if (pattern.test(preview)) {
            return { valid: false, reason: 'Content error: ' + pattern.source };
        }
    }

    // Check HTML title for errors
    const titleMatch = preview.match(/<title>(.*?)<\/title>/i);
    if (titleMatch) {
        const title = titleMatch[1].toLowerCase();
        if (title.includes('not found') || title.includes('error')) {
            return { valid: false, reason: 'Error in page title' };
        }
    }

    return { valid: true };
}
```

**Combined Validation:**
```javascript
async validateCandidate(url) {
    // Level 1: HTTP status
    const statusCheck = await this.validateUrl(url);
    if (!statusCheck.valid) return statusCheck;

    // Level 2: Content-type mismatch
    const typeCheck = await this.detectSoft404(url);
    if (!typeCheck.valid) return typeCheck;

    // Level 3: Content scan
    const contentCheck = await this.detectContentErrors(url);
    return contentCheck;
}
```

**Performance:**
- Level 1: ~0.3s per URL (HEAD request)
- Level 2: ~0.3s per URL (HEAD request)
- Level 3: ~0.6s per URL (GET request for 15KB)
- **Total:** ~1.2s per URL
- **Batch of 20:** ~24s total

**Detection Rate:**
- Hard 404: ~40% of broken URLs
- Soft 404: ~10% of broken URLs
- Content scan: ~45% of broken URLs
- **Total:** ~95% detection rate

---

## Deployment Procedures

### Standard Deployment (HTML Only)

**When:** After UI changes or bug fixes that only affect index.html

**Steps:**
```bash
# 1. Navigate to project directory
cd ~/Library/CloudStorage/Dropbox/Fergi/AI\ Wrangling/References/

# 2. Deploy index.html to server
scp index.html root@96.126.113.99:/var/www/apps/reference-refinement/index.html

# 3. Verify deployment
curl -s https://refs.fergi.com/health | python3 -m json.tool

# 4. Test in browser
# Open https://refs.fergi.com/ in Safari (iPad)
# Clear cache if needed: Settings → Safari → Clear History and Website Data
```

**No service restart needed** - nginx serves static files directly

### Backend Deployment (server.js Changes)

**When:** After API endpoint changes or backend logic updates

**Steps:**
```bash
# 1. Deploy server.js
scp server.js root@96.126.113.99:/var/www/apps/reference-refinement/server.js

# 2. SSH into server
ssh root@96.126.113.99

# 3. Restart service
sudo systemctl restart reference-refinement.service

# 4. Check service status
sudo systemctl status reference-refinement.service

# 5. Monitor logs
sudo journalctl -u reference-refinement.service -f

# 6. Exit SSH
exit

# 7. Verify health endpoint
curl -s https://refs.fergi.com/health | python3 -m json.tool
```

### Full Stack Deployment

**When:** Both frontend and backend changes

**Steps:**
```bash
# 1. Deploy both files
scp index.html server.js root@96.126.113.99:/var/www/apps/reference-refinement/

# 2. Restart service
ssh root@96.126.113.99 "sudo systemctl restart reference-refinement.service"

# 3. Verify
curl -s https://refs.fergi.com/health | python3 -m json.tool
```

### Environment Variable Updates

**When:** API keys change or new environment variables needed

**Steps:**
```bash
# 1. SSH into server
ssh root@96.126.113.99

# 2. Edit systemd service
sudo nano /etc/systemd/system/reference-refinement.service

# 3. Update Environment= lines
# Example:
# Environment=ANTHROPIC_API_KEY=sk-ant-api03-NEW_KEY

# 4. Reload systemd daemon
sudo systemctl daemon-reload

# 5. Restart service
sudo systemctl restart reference-refinement.service

# 6. Verify service started
sudo systemctl status reference-refinement.service

# 7. Exit SSH
exit
```

### SSL Certificate Renewal

**Automatic:** Certificates auto-renew 30 days before expiration via cron

**Manual Renewal (if needed):**
```bash
# 1. SSH into server
ssh root@96.126.113.99

# 2. Renew certificates
sudo certbot renew

# 3. Reload nginx
sudo systemctl reload nginx

# 4. Verify certificate
echo | openssl s_client -servername refs.fergi.com -connect refs.fergi.com:443 2>/dev/null | openssl x509 -noout -dates

# 5. Exit SSH
exit
```

### Rollback Procedure

**When:** Critical bug in production

**Steps:**
```bash
# 1. Find previous version
ls -lt ~/Library/CloudStorage/Dropbox/Fergi/AI\ Wrangling/References/*.html | head -5

# Example output:
# index.html (current - broken)
# rr_v185.html (last known good)

# 2. Deploy previous version
scp rr_v185.html root@96.126.113.99:/var/www/apps/reference-refinement/index.html

# 3. Verify
curl -s https://refs.fergi.com/ | grep -o "<title>.*</title>"
```

---

## Troubleshooting Guide

### Common Issues

#### 1. Dropbox Connection Fails with 401

**Symptom:** "Failed to connect to Dropbox: 401 Unauthorized"

**Cause:** Access token expired

**Solution:**
```javascript
// Check token expiration
console.log('Token expires at:', new Date(app.tokenExpiresAt));

// Clear tokens and reconnect
localStorage.removeItem('dropbox_access_token');
localStorage.removeItem('dropbox_refresh_token');
window.location.reload();

// Click "Test Dropbox Connection" and re-authorize
```

#### 2. Project Dropdown Empty After Connection

**Symptom:** Successfully connected to Dropbox but dropdown shows no projects

**Causes:**
1. Manuscript file not in `/Apps/Reference Refinement/` folder
2. File naming doesn't match pattern `[BaseName]Manuscript.docx` + `[BaseName]Decisions.txt`

**Solution:**
```bash
# Check file location via Dropbox web interface
# Ensure files are in: /Apps/Reference Refinement/

# Check file names match pattern:
# CaughtInTheActGeneratedManuscript.docx
# CaughtInTheActGeneratedDecisions.txt

# Copy files to correct location if needed
```

#### 3. References Missing Relevance Text

**Symptom:** References load but relevance text is blank

**Causes:**
1. Malformed `decisions.txt` format
2. `Relevance:` line missing or incorrectly formatted

**Debug:**
```javascript
// Open browser console
console.log(app.references[0]);

// Check parsed reference structure
// If relevance_text is empty but should exist, check file format

// Expected format:
// [123] Citation here.
// Relevance: Text here...
```

**Solution:**
```bash
# Validate decisions.txt format
grep -n "^\[" decisions.txt | head -5  # Check reference IDs
grep -n "^Relevance:" decisions.txt | head -5  # Check relevance lines

# If malformed, run cleaning script (see v18.4.1 session notes)
```

#### 4. OAuth Redirect Loop

**Symptom:** Dropbox authorization keeps redirecting back to auth page

**Causes:**
1. Redirect URI mismatch
2. Code challenge/verifier mismatch
3. localStorage not persisting

**Solution:**
```javascript
// Check redirect URI in code
console.log('Expected:', 'https://refs.fergi.com/');

// Check Dropbox app settings
// Must match EXACTLY including trailing slash

// Clear all OAuth data
localStorage.removeItem('oauth_code_verifier');
localStorage.removeItem('oauth_code_challenge');
localStorage.removeItem('dropbox_access_token');
localStorage.removeItem('dropbox_refresh_token');

// Try again with Safari private browsing disabled
```

#### 5. Service Won't Start on Server

**Symptom:** `systemctl status reference-refinement.service` shows "failed"

**Debug:**
```bash
# View full error logs
sudo journalctl -u reference-refinement.service -n 50

# Common errors:
# - "Cannot find module 'express'" → npm install missing
# - "EADDRINUSE" → Port 3002 already in use
# - "Permission denied" → File permissions issue

# Fix dependencies
cd /var/www/apps/reference-refinement
npm install

# Fix port conflict
sudo lsof -i :3002
# Kill process if needed
sudo kill -9 <PID>

# Fix permissions
sudo chown -R root:root /var/www/apps/reference-refinement
```

#### 6. AI Query Generation Fails

**Symptom:** "Suggest Queries" returns empty or error

**Causes:**
1. Anthropic API key expired/invalid
2. Rate limit exceeded
3. Citation or relevance text too long

**Debug:**
```bash
# Test API key directly
curl -X POST https://api.anthropic.com/v1/messages \
  -H "Content-Type: application/json" \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -d '{
    "model": "claude-sonnet-4-20250514",
    "max_tokens": 100,
    "messages": [{"role": "user", "content": "Hello"}]
  }'

# Check rate limits in response headers
# X-RateLimit-Remaining: ...

# Check server logs
ssh root@96.126.113.99 "sudo journalctl -u reference-refinement.service | grep LLM-CHAT"
```

**Solution:**
```bash
# Update API key in systemd service
sudo nano /etc/systemd/system/reference-refinement.service
# Update Environment=ANTHROPIC_API_KEY=...

sudo systemctl daemon-reload
sudo systemctl restart reference-refinement.service
```

#### 7. First Reference Header Missing

**Symptom:** First reference card missing ID badge/title

**Cause:** CSS clipping issue with scrollable container

**Solution:** Already fixed in v18.5 with `.references-grid { padding-top: 0.5rem; }`

**Verify Fix:**
```css
/* Check CSS in browser dev tools */
.references-grid {
    padding-top: 0.5rem; /* Should be present */
}
```

#### 8. Controls Scrolling Away

**Symptom:** Control panel and stats bar scroll with content instead of staying fixed

**Causes:**
1. Safari rendering bug with `position: fixed`
2. Z-index stacking context issue
3. Transform property missing

**Solution:** Already fixed in v18.5 with `transform: translateZ(0);`

**Verify Fix:**
```css
/* Check CSS in browser dev tools */
.controls {
    position: fixed;
    transform: translateZ(0);        /* GPU acceleration */
    -webkit-transform: translateZ(0); /* Safari prefix */
}

.stats-bar {
    position: fixed;
    transform: translateZ(0);
    -webkit-transform: translateZ(0);
}
```

### Performance Optimization

#### Slow Reference Rendering

**Symptom:** App freezes when loading 300+ references

**Solution:**
```javascript
// Use virtual scrolling or pagination
// (Not currently implemented - manual workaround: filter by flags)

// Temporary: Filter to show only unfinalized
document.getElementById('showFinalizedToggle').checked = false;
app.applyFilters();
```

#### High Token Usage

**Symptom:** Claude API costs increasing rapidly

**Optimization:**
```javascript
// Reduce ranking batch size
// Instead of ranking all 10 results, rank top 5:
const topResults = searchResults.slice(0, 5);

// Cache query suggestions
// (Not currently implemented)
```

---

## Version History

### v18.5 (November 18, 2025)

**UI Fixes:**
- ✅ Fixed first reference header clipping (added `.references-grid { padding-top: 0.5rem }`)
- ✅ Fixed controls/stats-bar scrolling (added `transform: translateZ(0)` for Safari GPU acceleration)
- ✅ Added box-shadow to fixed elements for visual clarity

### v18.4.1 (November 17, 2025)

**OAuth Fixes:**
- ✅ Fixed redirect URI protocol (HTTP → HTTPS)
- ✅ Fixed OAuth endpoint path mismatch (`/api/dropbox-oauth` → `/api/dropbox/oauth`)
- ✅ Added `redirect_uri` parameter to token exchange (OAuth 2.0 spec requirement)
- ✅ Complete Dropbox OAuth flow now functional

**Data Quality:**
- ✅ Cleaned `CaughtInTheActGeneratedDecisions.txt` (removed 18 malformed duplicates)
- ✅ Correct reference count: 288 references
- ✅ All relevance text intact

### v18.4 (November 17, 2025)

**Simplified UX:**
- ✅ Removed AI model selector dropdown
- ✅ Hardcoded `getSelectedModel()` to return `claude-sonnet-4-20250514`
- ✅ Philosophy: Always use latest and most capable model

### v18.3 (November 16, 2025)

**Major Infrastructure Migration:**
- ✅ Migrated from Netlify to Linode VPS
- ✅ Converted 7 Netlify Functions → Express.js endpoints
- ✅ Deployed systemd service + nginx reverse proxy
- ✅ Cost reduction: $19/month → $5/month (74% savings)
- ✅ Phase 1 workflow: Manuscript-decisions file pairing

### v16.10 (November 9, 2025)

**OAuth Token Refresh:**
- ✅ Restored complete OAuth PKCE flow (replaced hardcoded token)
- ✅ Automatic token refresh when < 5 minutes remaining
- ✅ Long-lived sessions (months/years instead of 4 hours)

### v16.7 (November 1, 2025)

**Enhanced Soft 404 Detection:**
- ✅ Level 3 content-based validation
- ✅ Fetches first 15KB of HTML
- ✅ Scans for 11 error patterns
- ✅ Checks HTML title tags
- ✅ Expected detection rate: ~95% (up from ~50%)

### v16.2 (October 31, 2025)

**URL Validation:**
- ✅ Two-level validation (hard 404 + soft 404)
- ✅ Content-type mismatch detection
- ✅ Validates top 20 candidates before ranking

### v16.1 (October 31, 2025)

**Query Optimization:**
- ✅ Enhanced query generation prompts
- ✅ Synchronized batch processor with iPad app
- ✅ 78% improvement rate in testing

### v15.x and Earlier

See `TECHNICAL_REFERENCE.md` for complete version history of v15.x and earlier versions.

---

## Code Examples

### Complete Query Generation Flow

```javascript
async generateQueries(referenceId) {
    const ref = this.references.find(r => r.id === referenceId);

    // Build prompt
    const prompt = `I need help generating effective Google search queries to find the online source for an academic reference.

Reference citation:
${ref.citation}

Why this reference matters to my research:
${ref.relevance_text}

Generate 3-5 targeted search queries that will help find this specific source. Focus on:
1. Unique identifying information (DOI, author names, distinctive title words)
2. Alternative phrasings of the title
3. Journal/publisher name combinations
4. Author name + year combinations

Return ONLY the queries, one per line, no numbering or explanation.`;

    // Call Claude API
    const response = await this.apiRequest('/api/llm/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            prompt: prompt,
            model: this.getSelectedModel()
        })
    });

    const data = await response.json();

    // Parse queries
    const queries = data.result.split('\n')
        .map(q => q.trim())
        .filter(q => q.length > 0);

    // Update reference
    ref.queries = queries;

    // Display in modal
    document.getElementById('queriesTextarea').value = queries.join('\n');

    this.showToast(`✅ Generated ${queries.length} queries`, 'success');
}
```

### Complete Search and Rank Flow

```javascript
async searchAndRank(referenceId) {
    const ref = this.references.find(r => r.id === referenceId);

    // 1. Get queries from textarea
    const queriesText = document.getElementById('queriesTextarea').value;
    const queries = queriesText.split('\n').filter(q => q.trim());

    if (queries.length === 0) {
        this.showToast('⚠️ No queries to search', 'warning');
        return;
    }

    // 2. Execute Google searches
    this.showToast('🔍 Searching Google...', 'info');

    const allResults = [];
    for (const query of queries) {
        const response = await this.apiRequest('/api/search/google', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query })
        });

        const data = await response.json();
        allResults.push(...data.results);
    }

    // 3. Deduplicate by URL
    const uniqueResults = [];
    const seenUrls = new Set();
    for (const result of allResults) {
        if (!seenUrls.has(result.url)) {
            seenUrls.add(result.url);
            uniqueResults.push(result);
        }
    }

    this.showToast(`✅ Found ${uniqueResults.length} unique results`, 'success');

    // 4. Validate URLs (3-level validation)
    this.showToast('🔎 Validating URLs...', 'info');

    const validResults = [];
    for (const result of uniqueResults.slice(0, 20)) {
        const validation = await this.validateCandidate(result.url);
        if (validation.valid) {
            validResults.push(result);
        }
    }

    this.showToast(`✅ ${validResults.length} valid URLs`, 'success');

    // 5. Rank with AI
    this.showToast('🤖 Ranking with AI...', 'info');

    const response = await this.apiRequest('/api/llm/rank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            citation: ref.citation,
            relevance: ref.relevance_text,
            results: validResults,
            model: this.getSelectedModel()
        })
    });

    const data = await response.json();

    // 6. Display ranked results
    this.displayCandidates(data.rankedResults);

    this.showToast('✅ Ranking complete', 'success');
}
```

### Complete Save Flow

```javascript
async saveChanges() {
    await this.checkAndRefreshToken();

    // 1. Generate decisions.txt
    const decisionsLines = [];
    for (const ref of this.references) {
        // Reference ID and citation
        decisionsLines.push(`[${ref.id}] ${ref.citation}`);

        // Context (Phase 1)
        if (ref.context) {
            decisionsLines.push('[CONTEXT_START]');
            decisionsLines.push(ref.context);
            decisionsLines.push('[CONTEXT_END]');
        }

        // Finalization flag
        if (ref.finalized) {
            decisionsLines.push('[FINALIZED]');
        }

        // Relevance text
        if (ref.relevance_text) {
            decisionsLines.push(`Relevance: ${ref.relevance_text}`);
        }

        // URLs
        if (ref.urls.primary) {
            decisionsLines.push(`Primary URL: ${ref.urls.primary}`);
        }
        if (ref.urls.secondary) {
            decisionsLines.push(`Secondary URL: ${ref.urls.secondary}`);
        }
        if (ref.urls.tertiary) {
            decisionsLines.push(`Tertiary URL: ${ref.urls.tertiary}`);
        }

        // Queries
        for (const query of ref.queries || []) {
            decisionsLines.push(`Q: ${query}`);
        }

        // Note
        if (ref.note) {
            decisionsLines.push(`Note: ${ref.note}`);
        }

        // Batch version
        if (ref.batchVersion) {
            decisionsLines.push(`Batch: ${ref.batchVersion}`);
        }

        // Flags
        for (const flag of ref.flags || []) {
            decisionsLines.push(`Flag: ${flag}`);
        }

        decisionsLines.push(''); // Blank line between references
    }

    const decisionsContent = decisionsLines.join('\n');

    // 2. Generate Final.txt (only finalized)
    const finalLines = [];
    for (const ref of this.references.filter(r => r.finalized)) {
        finalLines.push(`[${ref.id}] ${ref.citation}`);

        if (ref.urls.primary) {
            finalLines.push(`Primary URL: ${ref.urls.primary}`);
        }
        if (ref.urls.secondary) {
            finalLines.push(`Secondary URL: ${ref.urls.secondary}`);
        }

        finalLines.push(''); // Blank line
    }

    const finalContent = finalLines.join('\n');

    // 3. Write both files to Dropbox
    try {
        await this.dropbox.filesUpload({
            path: `/${this.currentProject}Decisions.txt`,
            contents: decisionsContent,
            mode: { '.tag': 'overwrite' }
        });

        await this.dropbox.filesUpload({
            path: `/${this.currentProject}Final.txt`,
            contents: finalContent,
            mode: { '.tag': 'overwrite' }
        });

        this.showToast('✅ Saved to Dropbox', 'success');
    } catch (error) {
        this.showToast('❌ Save failed: ' + error.message, 'error');
    }
}
```

---

## Appendix

### API Rate Limits

| Service | Limit | Notes |
|---------|-------|-------|
| Anthropic Claude | 500,000 tokens/day | ~300-400 references/day |
| Google Custom Search | 100 queries/day | ~10-20 references/day |
| Dropbox API | 5,000 calls/hour | Effectively unlimited for this use |

### Browser Compatibility

| Browser | Version | Status | Notes |
|---------|---------|--------|-------|
| Safari (iPad) | iOS 15+ | ✅ Fully Supported | Primary target platform |
| Safari (macOS) | 15+ | ✅ Fully Supported | Desktop testing |
| Chrome (Desktop) | Latest | ✅ Fully Supported | Development |
| Chrome (Android) | Latest | ⚠️ Untested | Should work |
| Firefox | Latest | ⚠️ Untested | Should work |

### Security Considerations

**API Keys:**
- ✅ Never exposed in frontend code
- ✅ Stored in systemd environment variables
- ✅ Not in git repository (.env ignored)
- ✅ Rotated quarterly (manual process)

**OAuth Tokens:**
- ✅ PKCE flow prevents token interception
- ✅ Stored in browser localStorage (domain-scoped)
- ✅ Auto-refresh prevents expiration
- ✅ HTTPS prevents token sniffing

**XSS Protection:**
- ⚠️ User input not sanitized (single-user app)
- ⚠️ innerHTML used for rendering (trusted data only)
- ✅ No third-party JavaScript libraries

### Performance Metrics

**Page Load:**
- First Contentful Paint: ~800ms
- Time to Interactive: ~1.2s
- Total Page Size: ~180KB (including Dropbox SDK)

**Operation Times:**
- Load 288 references: ~2.5s
- Parse decisions.txt: ~400ms
- Render reference cards: ~600ms
- Generate 5 queries: ~3-4s
- Search + rank 20 results: ~25-30s
- Save to Dropbox: ~1.5s

### Cost Analysis

**Monthly Costs:**
- Linode VPS: $5/month (shared with other apps)
- Anthropic Claude API: ~$3/month (estimated usage)
- Google Custom Search: $0 (free tier)
- Dropbox: $0 (free tier)
- **Total: ~$8/month**

**Cost Savings vs. Netlify:**
- Previous: $19/month (Netlify)
- Current: $5/month (Linode shared)
- Savings: $14/month = $168/year (74% reduction)

---

**End of Technical Reference Manual**

*This document is comprehensive and ready for voice-mode conversations on morning runs. All technical details, troubleshooting steps, code examples, and architectural decisions are documented for Claude.ai to provide full support without needing to reference additional files.*
