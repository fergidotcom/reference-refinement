#!/usr/bin/env python3

"""
Deep URL Validation Module v17.0

Provides validate_url_deep() function for content-based URL validation.
Actually fetches and analyzes URL content before scoring.

USAGE:
    from deep_url_validation import validate_url_deep, ValidationResult

    result = await validate_url_deep(
        url="https://example.com/article.pdf",
        citation="Author (2020). Title. Journal.",
        url_type="primary",
        api_key="sk-ant-..."
    )

    if result.accessible:
        print(f"✅ URL is accessible (score: {result.score})")
    else:
        print(f"❌ {result.reason}")
"""

import aiohttp
import asyncio
import re
from dataclasses import dataclass
from typing import Optional
from anthropic import Anthropic


# ============================================================================
# DETECTION PATTERNS
# ============================================================================

PAYWALL_PATTERNS = [
    {"pattern": re.compile(r'subscribe.*continue|subscription.*required', re.I), "name": "subscription required"},
    {"pattern": re.compile(r'\$\d+(\.\d{2})?\s*(to\s*)?(access|view|read|download)', re.I), "name": "price to access"},
    {"pattern": re.compile(r'purchase.*access|buy.*article|pay.*view', re.I), "name": "purchase required"},
    {"pattern": re.compile(r'paywall|payment.*required', re.I), "name": "paywall detected"},
    {"pattern": re.compile(r'login.*subscribe|sign\s*in.*subscribe', re.I), "name": "login to subscribe"},
    {"pattern": re.compile(r'member(s)?\s*only|members?\s*exclusive', re.I), "name": "members only"},
    {"pattern": re.compile(r'become\s*a\s*(member|subscriber)', re.I), "name": "subscription prompt"},
    {"pattern": re.compile(r'free\s*trial.*then\s*\$', re.I), "name": "trial then paid"},
    {"pattern": re.compile(r'upgrade\s*to\s*(premium|pro|plus)', re.I), "name": "upgrade required"},
    {"pattern": re.compile(r'limited\s*access.*subscribe', re.I), "name": "limited without subscription"},
    {"pattern": re.compile(r'full\s*text.*\$|complete\s*article.*\$', re.I), "name": "paid full text"},
    {"pattern": re.compile(r'price.*download|cost.*access', re.I), "name": "paid download"},
]

LOGIN_PATTERNS = [
    {"pattern": re.compile(r'sign\s*in.*continue|log\s*in.*continue', re.I), "name": "login to continue"},
    {"pattern": re.compile(r'authentication.*required|login.*required', re.I), "name": "authentication required"},
    {"pattern": re.compile(r'institutional.*access|institution.*login', re.I), "name": "institutional access"},
    {"pattern": re.compile(r'access.*through.*library', re.I), "name": "library access"},
    {"pattern": re.compile(r'credentials.*required|authorized.*users?\s*only', re.I), "name": "credentials required"},
    {"pattern": re.compile(r'please\s*(log\s*in|sign\s*in)', re.I), "name": "login prompt"},
    {"pattern": re.compile(r'restricted.*access|access.*restricted', re.I), "name": "restricted access"},
    {"pattern": re.compile(r'account.*required|create.*account', re.I), "name": "account required"},
    {"pattern": re.compile(r'university.*access|academic.*access', re.I), "name": "academic access"},
    {"pattern": re.compile(r'licensed.*content|license.*required', re.I), "name": "licensed content"},
]

PREVIEW_PATTERNS = [
    {"pattern": re.compile(r'limited\s*preview|preview\s*only', re.I), "name": "limited preview"},
    {"pattern": re.compile(r'first\s*\d+\s*pages?|sample\s*pages?', re.I), "name": "sample pages"},
    {"pattern": re.compile(r'excerpt|selected\s*pages?', re.I), "name": "excerpt only"},
    {"pattern": re.compile(r'table\s*of\s*contents\s*only', re.I), "name": "TOC only"},
    {"pattern": re.compile(r'abstract\s*only|summary\s*only', re.I), "name": "abstract only"},
    {"pattern": re.compile(r'partial\s*view|incomplete\s*view', re.I), "name": "partial view"},
    {"pattern": re.compile(r'preview\s*unavailable|full\s*view\s*not\s*available', re.I), "name": "no full view"},
    {"pattern": re.compile(r'\d+%?\s*visible|\d+\s*of\s*\d+\s*pages', re.I), "name": "percentage visible"},
    {"pattern": re.compile(r'sample\s*content|limited\s*content', re.I), "name": "sample content"},
]

SOFT_404_PATTERNS = [
    {"pattern": re.compile(r'404.*not\s*found|not\s*found.*404', re.I), "name": "404 not found"},
    {"pattern": re.compile(r'page\s*not\s*found|cannot\s*find.*page', re.I), "name": "page not found"},
    {"pattern": re.compile(r'sorry.*couldn\'t\s*find|we\s*couldn\'t\s*locate', re.I), "name": "apology for not found"},
    {"pattern": re.compile(r'oops.*nothing\s*here|there\'s\s*nothing\s*here', re.I), "name": "nothing here"},
    {"pattern": re.compile(r'doi\s*not\s*found|doi.*not\s*available', re.I), "name": "DOI not found"},
    {"pattern": re.compile(r'document\s*not\s*found|article\s*not\s*available', re.I), "name": "document unavailable"},
    {"pattern": re.compile(r'item\s*not\s*found|handle\s*not\s*found', re.I), "name": "item/handle not found"},
    {"pattern": re.compile(r'<title>[^<]*(404|not\s*found|error)[^<]*</title>', re.I), "name": "error in title"},
]


# ============================================================================
# VALIDATION RESULT
# ============================================================================

@dataclass
class ValidationResult:
    """Result of deep URL validation"""
    valid: bool
    accessible: bool
    score: int  # 0-100
    reason: str
    paywall: bool = False
    login_required: bool = False
    preview_only: bool = False
    soft_404: bool = False
    confidence: float = 0.0  # 0-1
    content_matches: bool = False


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

async def fetch_with_redirects(url: str, max_redirects: int = 5, max_bytes: int = 100000) -> tuple[str, int, dict]:
    """
    Fetch URL content with redirect following

    Args:
        url: URL to fetch
        max_redirects: Maximum redirects to follow
        max_bytes: Maximum bytes to read

    Returns:
        (content, status_code, headers)
    """
    async with aiohttp.ClientSession() as session:
        try:
            async with session.get(
                url,
                allow_redirects=True,
                max_redirects=max_redirects,
                timeout=aiohttp.ClientTimeout(total=10),
                ssl=False  # Disable SSL verification to avoid certificate errors
            ) as response:
                status = response.status
                headers = dict(response.headers)

                # Read content in chunks
                content = b''
                async for chunk in response.content.iter_chunked(8192):
                    content += chunk
                    if len(content) >= max_bytes:
                        break

                # Decode
                try:
                    text = content.decode('utf-8', errors='ignore')
                except:
                    text = str(content)

                return text, status, headers

        except Exception as e:
            return "", 0, {"error": str(e)}


def detect_access_barriers(content: str) -> dict:
    """
    Detect access barriers in content using pattern matching

    Returns:
        {
            'paywall': bool,
            'login': bool,
            'preview': bool,
            'soft_404': bool,
            'reason': str
        }
    """
    result = {
        'paywall': False,
        'login': False,
        'preview': False,
        'soft_404': False,
        'reason': 'Accessible content'
    }

    # Check soft 404 first (highest priority)
    for pattern_dict in SOFT_404_PATTERNS:
        if pattern_dict['pattern'].search(content):
            result['soft_404'] = True
            result['reason'] = f"Soft 404 detected: {pattern_dict['name']}"
            return result

    # Check paywall
    for pattern_dict in PAYWALL_PATTERNS:
        if pattern_dict['pattern'].search(content):
            result['paywall'] = True
            result['reason'] = f"Paywall detected: {pattern_dict['name']}"
            return result

    # Check login required
    for pattern_dict in LOGIN_PATTERNS:
        if pattern_dict['pattern'].search(content):
            result['login'] = True
            result['reason'] = f"Login required: {pattern_dict['name']}"
            return result

    # Check preview only
    for pattern_dict in PREVIEW_PATTERNS:
        if pattern_dict['pattern'].search(content):
            result['preview'] = True
            result['reason'] = f"Preview only: {pattern_dict['name']}"
            return result

    return result


def verify_content_match_basic(content: str, citation: str) -> tuple[bool, float]:
    """
    Basic text matching to verify content matches citation

    Returns:
        (matches: bool, confidence: float)
    """
    # Extract key words from citation (author, title fragments)
    citation_lower = citation.lower()

    # Remove common words
    stop_words = {'the', 'and', 'of', 'in', 'a', 'an', 'to', 'for', 'on', 'with', 'by'}
    words = [w for w in citation_lower.split() if len(w) > 3 and w not in stop_words]

    # Count matches
    content_lower = content.lower()
    matches = sum(1 for word in words[:10] if word in content_lower)

    confidence = min(1.0, matches / 5)  # 5+ matches = high confidence
    return (matches >= 3, confidence)


async def verify_content_match_ai(content: str, citation: str, api_key: str) -> tuple[bool, float]:
    """
    Use Claude API to verify content matches citation

    Returns:
        (matches: bool, confidence: float)
    """
    try:
        client = Anthropic(api_key=api_key)

        # Extract title/author/year from citation
        # Citation format: Author (YEAR). Title. Publication.
        year_match = re.search(r'\((\d{4})\)', citation)
        year = year_match.group(1) if year_match else "unknown"

        parts = citation.split('.')
        author = parts[0].split('(')[0].strip() if parts else "unknown"
        title = parts[1].strip() if len(parts) > 1 else "unknown"

        prompt = f"""You are verifying if a document's content matches expected metadata.

Expected:
- Author: {author}
- Title: {title}
- Year: {year}

Content (first 2000 chars):
{content[:2000]}

Does this content match the expected work? Consider:
1. Does the author name appear?
2. Does the title or key title words appear?
3. Does the year match (±1 year tolerance)?

Respond with ONLY:
MATCH: [0-100 confidence score]
REASON: [one sentence]

Example: MATCH: 95 | REASON: Author name and title both appear, year matches."""

        response = client.messages.create(
            model="claude-3-haiku-20240307",
            max_tokens=100,
            messages=[{"role": "user", "content": prompt}]
        )

        text = response.content[0].text

        # Parse response
        match = re.search(r'MATCH:\s*(\d+)', text)
        confidence = int(match.group(1)) / 100 if match else 0.0

        matches = confidence >= 0.7
        return (matches, confidence)

    except Exception as e:
        # Fall back to basic matching
        return verify_content_match_basic(content, citation)


# ============================================================================
# MAIN VALIDATION FUNCTION
# ============================================================================

async def validate_url_deep(
    url: str,
    citation: str,
    url_type: str,  # 'primary' or 'secondary'
    api_key: Optional[str] = None
) -> ValidationResult:
    """
    Deep URL validation - actually fetches and analyzes content

    Args:
        url: URL to validate
        citation: Full citation text (for content matching)
        url_type: 'primary' or 'secondary'
        api_key: Anthropic API key for AI verification (optional)

    Returns:
        ValidationResult with detailed analysis
    """

    # Fetch content
    content, status, headers = await fetch_with_redirects(url)

    # Check HTTP status
    if status == 0:
        return ValidationResult(
            valid=False,
            accessible=False,
            score=0,
            reason=f"Connection failed: {headers.get('error', 'unknown error')}"
        )

    if status >= 400:
        return ValidationResult(
            valid=False,
            accessible=False,
            score=0,
            reason=f"HTTP {status} error",
            soft_404=(status == 404)
        )

    # Detect access barriers
    barriers = detect_access_barriers(content)

    # Determine score based on accessibility
    if barriers['soft_404']:
        score = 0
    elif barriers['preview']:
        score = 40
    elif barriers['paywall']:
        score = 50
    elif barriers['login']:
        score = 60
    else:
        # Accessible content
        score = 90

        # Try content matching for bonus points
        if api_key:
            matches, confidence = await verify_content_match_ai(content, citation, api_key)
        else:
            matches, confidence = verify_content_match_basic(content, citation)

        if matches and confidence > 0.7:
            score = 100
            barriers['reason'] = f"Accessible content with high confidence match ({confidence:.0%})"

    return ValidationResult(
        valid=(score > 0),
        accessible=(score >= 90),
        score=score,
        reason=barriers['reason'],
        paywall=barriers['paywall'],
        login_required=barriers['login'],
        preview_only=barriers['preview'],
        soft_404=barriers['soft_404'],
        confidence=confidence if 'confidence' in locals() else 0.0,
        content_matches=matches if 'matches' in locals() else False
    )


# ============================================================================
# TESTING
# ============================================================================

async def test_validation():
    """Test the validation function"""

    print("🧪 Testing Deep URL Validation v17.0\n")
    print("=" * 80)

    # Test cases
    tests = [
        {
            "url": "https://www.example.com/404",
            "citation": "Smith (2020). Test Article. Journal.",
            "expected": "soft 404"
        },
        {
            "url": "https://httpstat.us/200",
            "citation": "Jones (2019). Sample. Publisher.",
            "expected": "accessible"
        },
    ]

    for i, test in enumerate(tests, 1):
        print(f"\nTest {i}: {test['expected']}")
        print(f"URL: {test['url']}")

        result = await validate_url_deep(
            test['url'],
            test['citation'],
            'primary'
        )

        print(f"Score: {result.score}")
        print(f"Accessible: {result.accessible}")
        print(f"Reason: {result.reason}")
        print("-" * 80)


if __name__ == '__main__':
    asyncio.run(test_validation())
