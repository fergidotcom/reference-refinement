#!/usr/bin/env python3

"""
PRODUCTION QUALITY FRAMEWORK - ENHANCED VERSION v17.0
Automated URL scoring with DEEP CONTENT VALIDATION

ENHANCEMENTS OVER v1.0:
1. Title-based filtering for primary URLs (detects review articles)
2. Optional content fetching to verify work vs. review
3. Improved accuracy for distinguishing work-itself from reviews/analyses

v17.0 ENHANCEMENTS (Deep URL Validation):
4. Actually fetch and analyze URL content before scoring
5. Detect access barriers (paywalls, login walls, preview-only)
6. Verify content matches expected reference (title/author/year)
7. Score based on ACCESSIBILITY, not just domain
8. Use AI-powered content verification for accuracy
"""

import re
import requests
import asyncio
import aiohttp
from typing import Dict, List, Tuple, Optional
from urllib.parse import urlparse
from dataclasses import dataclass, field
from Production_Quality_Framework import URLQualityScorer, URLScore
import anthropic
import os


# ============================================================================
# DEEP URL VALIDATION - v17.0
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


# Access barrier detection patterns
PAYWALL_PATTERNS = [
    r'subscribe to continue',
    r'subscription required',
    r'this article is available to subscribers',
    r'purchase this article',
    r'buy this article',
    r'\$\d+\.\d+ to access',  # "$19.99 to access"
    r'you do not have access',
    r'institutional subscription required',
    r'paywall',
    r'subscribe now',
    r'sign up to read',
    r'access through your institution'
]

LOGIN_PATTERNS = [
    r'sign in to continue',
    r'log in to view',
    r'login required',
    r'please log in',
    r'you must be logged in',
    r'authentication required',
    r'access denied',
    r'sign in to read',
    r'create account to continue',
    r'register to access'
]

PREVIEW_PATTERNS = [
    r'preview only',
    r'limited preview',
    r'read a preview',
    r'sample pages',
    r'\d+ pages shown',  # "5 pages shown"
    r'view \d+ pages',   # "view 3 pages"
    r'continue reading with subscription',
    r'preview this book',
    r'pages displayed by permission'
]

SOFT_404_PATTERNS = [
    r'404.*not found|not found.*404',
    r'page not found|page cannot be found',
    r'sorry.*couldn\'t find.*page',
    r'oops.*nothing here|there\'s nothing here',
    r'doi not found|doi.*cannot be found',
    r'document not found|document.*not available',
    r'item.*not found|handle.*not found',
    r'<title>[^<]*(404|not found|error)[^<]*</title>'
]


async def fetch_with_redirects(url: str, max_redirects: int = 5,
                               max_bytes: int = 100000) -> Optional[Tuple[str, str]]:
    """
    Fetch URL content following redirects

    Returns:
        Tuple of (final_url, content) or None if failed
    """
    try:
        timeout = aiohttp.ClientTimeout(total=10)
        async with aiohttp.ClientSession(timeout=timeout) as session:
            async with session.get(
                url,
                allow_redirects=True,
                max_redirects=max_redirects,
                headers={'User-Agent': 'Mozilla/5.0 (compatible; ReferenceRefinementBot/1.0)'}
            ) as response:
                if response.status >= 400:
                    return None

                # Read first max_bytes of content
                content_bytes = await response.content.read(max_bytes)

                # Try to decode as text
                try:
                    content = content_bytes.decode('utf-8', errors='ignore')
                except:
                    content = str(content_bytes)

                return (str(response.url), content)

    except Exception as e:
        print(f"Error fetching {url}: {e}")
        return None


def detect_access_barriers(content: str, url: str) -> Dict:
    """
    Detect access barriers in content

    Returns:
        Dict with accessibility info and score
    """
    content_lower = content.lower()

    # Check for soft 404s first
    for pattern in SOFT_404_PATTERNS:
        if re.search(pattern, content_lower):
            return {
                'accessible': False,
                'score': 0,
                'reason': 'Soft 404 detected - page not found',
                'soft_404': True
            }

    # Check for paywalls
    for pattern in PAYWALL_PATTERNS:
        if re.search(pattern, content_lower):
            return {
                'accessible': False,
                'score': 50,
                'reason': 'Paywall detected',
                'paywall': True
            }

    # Check for login requirements
    for pattern in LOGIN_PATTERNS:
        if re.search(pattern, content_lower):
            return {
                'accessible': False,
                'score': 60,
                'reason': 'Login required',
                'login_required': True
            }

    # Check for preview-only
    for pattern in PREVIEW_PATTERNS:
        if re.search(pattern, content_lower):
            return {
                'accessible': False,
                'score': 40,
                'reason': 'Preview only - full content not accessible',
                'preview_only': True
            }

    # No barriers detected - likely accessible
    return {
        'accessible': True,
        'score': 90,
        'reason': 'No access barriers detected'
    }


async def verify_content_match_with_ai(content: str, reference: Dict) -> Dict:
    """
    Use AI to verify content matches the expected reference

    Args:
        content: Retrieved page content (first portion)
        reference: Dict with author, title, year

    Returns:
        Dict with match confidence and details
    """
    # Get API key
    api_key = os.environ.get('ANTHROPIC_API_KEY')
    if not api_key:
        # Fallback to basic text matching if no API key
        return verify_content_match_basic(content, reference)

    try:
        client = anthropic.Anthropic(api_key=api_key)

        # Truncate content for AI analysis (first 3000 chars)
        content_sample = content[:3000]

        prompt = f"""Analyze this web page content and determine if it matches the expected reference.

Expected Reference:
- Title: {reference.get('title', 'Unknown')}
- Author: {reference.get('author', 'Unknown')}
- Year: {reference.get('year', 'Unknown')}

Retrieved Content (first 3000 chars):
{content_sample}

Questions to answer:
1. Does this appear to be the WORK ITSELF (the actual book/article)?
2. Or is it a REVIEW/ANALYSIS of the work?
3. Does the title match?
4. Does the author match?
5. Does the year match (or is close)?

Provide:
- match_confidence: 0-100 (how confident the content matches the reference)
- is_work_itself: true/false (is this the work, not a review?)
- reasoning: brief explanation

Format your response as:
CONFIDENCE: [0-100]
IS_WORK: [true/false]
REASONING: [explanation]"""

        message = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=500,
            messages=[{"role": "user", "content": prompt}]
        )

        response_text = message.content[0].text

        # Parse response
        confidence_match = re.search(r'CONFIDENCE:\s*(\d+)', response_text)
        is_work_match = re.search(r'IS_WORK:\s*(true|false)', response_text, re.IGNORECASE)
        reasoning_match = re.search(r'REASONING:\s*(.+)', response_text, re.DOTALL)

        confidence = int(confidence_match.group(1)) if confidence_match else 50
        is_work = is_work_match.group(1).lower() == 'true' if is_work_match else False
        reasoning = reasoning_match.group(1).strip() if reasoning_match else "Unable to parse AI response"

        return {
            'matches': confidence >= 60 and is_work,
            'confidence': confidence / 100.0,
            'score': confidence if is_work else min(confidence, 55),
            'reason': reasoning
        }

    except Exception as e:
        print(f"AI verification error: {e}")
        # Fallback to basic matching
        return verify_content_match_basic(content, reference)


def verify_content_match_basic(content: str, reference: Dict) -> Dict:
    """
    Basic text matching without AI (fallback)
    """
    content_lower = content.lower()
    title = reference.get('title', '').lower()
    author = reference.get('author', '').lower()

    # Extract significant words from title (skip common words)
    title_words = [w for w in title.split()
                  if len(w) > 3 and w not in ['the', 'and', 'for', 'with', 'from']]

    # Count title word matches
    title_matches = sum(1 for word in title_words if word in content_lower)
    title_confidence = (title_matches / len(title_words)) if title_words else 0

    # Check author (last name)
    author_parts = author.split(',')
    author_last = author_parts[0].strip().lower() if author_parts else author
    author_match = author_last in content_lower

    # Overall confidence
    confidence = 0.0
    if title_confidence >= 0.5:
        confidence += 0.6
    if author_match:
        confidence += 0.4

    return {
        'matches': confidence >= 0.5,
        'confidence': confidence,
        'score': int(confidence * 100),
        'reason': f'Title match: {title_confidence:.0%}, Author match: {author_match}'
    }


async def validate_url_deep(url: str, reference: Dict) -> ValidationResult:
    """
    Deep validate URL by actually fetching and analyzing content

    This is the main validation function that:
    1. Fetches the URL with redirect following
    2. Downloads first 100KB of content
    3. Detects access barriers (paywall/login/preview)
    4. Verifies content matches expected reference

    Args:
        url: URL to validate
        reference: Dict with author, title, year, publication

    Returns:
        ValidationResult with detailed accessibility information
    """
    # Step 1: Fetch with redirects
    result = await fetch_with_redirects(url, max_redirects=5, max_bytes=100000)

    if result is None:
        return ValidationResult(
            valid=False,
            accessible=False,
            score=0,
            reason='Failed to fetch URL (timeout or error)',
            confidence=1.0
        )

    final_url, content = result

    # Step 2: Check HTTP status was OK (implicit in successful fetch)

    # Step 3: Detect access barriers
    access_check = detect_access_barriers(content, final_url)

    if not access_check['accessible']:
        return ValidationResult(
            valid=False,
            accessible=False,
            score=access_check['score'],
            reason=access_check['reason'],
            paywall=access_check.get('paywall', False),
            login_required=access_check.get('login_required', False),
            preview_only=access_check.get('preview_only', False),
            soft_404=access_check.get('soft_404', False),
            confidence=0.9
        )

    # Step 4: Verify content matches reference (AI-powered)
    content_match = await verify_content_match_with_ai(content, reference)

    if not content_match['matches']:
        return ValidationResult(
            valid=False,
            accessible=True,  # URL works but wrong content
            score=content_match['score'],
            reason=f"Content mismatch: {content_match['reason']}",
            confidence=content_match['confidence'],
            content_matches=False
        )

    # Success! URL is accessible and matches reference
    return ValidationResult(
        valid=True,
        accessible=True,
        score=min(100, 90 + int(content_match['confidence'] * 10)),  # 90-100 range
        reason=f"Accessible and verified: {content_match['reason']}",
        confidence=content_match['confidence'],
        content_matches=True
    )


# ============================================================================
# ENHANCED URL QUALITY SCORER (with Deep Validation Integration)
# ============================================================================

class EnhancedURLQualityScorer(URLQualityScorer):
    """
    Enhanced scorer with content matching, title analysis, and paywall detection
    """

    # Review/analysis indicators for PRIMARY URLs (these should NOT be primaries)
    PRIMARY_REJECTION_PHRASES = [
        'review of',
        ': a review',
        'book review',
        'analysis of',
        'critique of',
        'commentary on',
        'discussion of',
        'response to',
        'examining',
        'evaluating',
        'assessing',
        'essay on',
        'thoughts on'
    ]

    # Paywall domains (prefer free alternatives when available)
    PAYWALL_DOMAINS = [
        'jstor.org',
        'sciencedirect.com',
        'springer.com',
        'wiley.com',
        'tandfonline.com',
        'sagepub.com',
        'cambridge.org',
        'oxfordjournals.org',
        'journals.uchicago.edu'
    ]

    def __init__(self, enable_content_fetching=False):
        """
        Initialize enhanced scorer

        Args:
            enable_content_fetching: If True, fetch page content for verification
                                    (slower but more accurate)
        """
        super().__init__()
        self.enable_content_fetching = enable_content_fetching

    def score_primary_url(self, url: str, bibliographic_data: Dict,
                         candidate_title: str = "") -> URLScore:
        """
        Enhanced primary URL scoring with title and content analysis

        Args:
            url: URL to score
            bibliographic_data: Dict with author, title, year, publication
            candidate_title: Title/snippet from search result

        Returns:
            URLScore with enhanced accuracy
        """
        # Get base score from parent class
        base_score = super().score_primary_url(url, bibliographic_data)

        # Apply title-based filtering
        title_penalty = self._check_title_for_primary(candidate_title,
                                                       bibliographic_data)

        # Apply paywall penalty
        paywall_penalty = self._check_paywall(url)

        # Apply content-based verification if enabled
        content_penalty = 0
        if self.enable_content_fetching and base_score.total_score >= 75:
            content_penalty = self._verify_content_for_primary(url,
                                                               bibliographic_data)

        # Calculate final score
        final_score = base_score.total_score - title_penalty - paywall_penalty - content_penalty
        final_score = max(0, min(100, final_score))

        # Update reasoning
        reasoning_parts = [base_score.reasoning]
        if title_penalty > 0:
            reasoning_parts.append(f"Title penalty: -{title_penalty} (appears to be review/analysis)")
        if paywall_penalty > 0:
            reasoning_parts.append(f"Paywall penalty: -{paywall_penalty} (prefer free alternatives)")
        if content_penalty > 0:
            reasoning_parts.append(f"Content penalty: -{content_penalty} (content doesn't match expected work)")

        return URLScore(
            total_score=final_score,
            domain_tier=base_score.domain_tier,
            domain_score=base_score.domain_score,
            content_type=base_score.content_type,
            content_modifier=base_score.content_modifier,
            confidence=self._determine_confidence(final_score, base_score.domain_tier),
            reasoning="; ".join(reasoning_parts)
        )

    def _check_paywall(self, url: str) -> int:
        """
        Check if URL is behind a paywall

        Strategy: Penalize known paywall domains, but only slightly
        (they're still high-quality scholarly sources, just not free)

        Returns:
            Penalty amount (0-10 points)
        """
        domain = self._extract_domain(url)

        # Check if domain is in paywall list
        for paywall_domain in self.PAYWALL_DOMAINS:
            if paywall_domain in domain:
                return 10  # Small penalty - prefer free when equally good

        return 0

    def _check_title_for_primary(self, candidate_title: str,
                                 bibliographic_data: Dict) -> int:
        """
        Check if candidate title suggests it's a review/analysis (not the work itself)

        Returns:
            Penalty amount (0-40 points)
        """
        if not candidate_title:
            return 0

        title_lower = candidate_title.lower()

        # Check for review/analysis language
        for phrase in self.PRIMARY_REJECTION_PHRASES:
            if phrase in title_lower:
                return 40  # Major penalty - clearly not the work itself

        # Check for work title match
        expected_title = bibliographic_data.get('title', '').lower()
        if expected_title:
            # Extract first few significant words from expected title
            expected_words = [w for w in expected_title.split()[:5]
                            if len(w) > 3 and w not in ['the', 'and', 'for', 'with']]

            # Count how many expected words appear in candidate title
            matches = sum(1 for word in expected_words if word in title_lower)

            if matches == 0:
                return 20  # Moderate penalty - title doesn't match at all
            elif matches < len(expected_words) / 2:
                return 10  # Small penalty - partial match

        return 0

    def _verify_content_for_primary(self, url: str,
                                   bibliographic_data: Dict) -> int:
        """
        Fetch page content and verify it's the work itself (not a review)

        Returns:
            Penalty amount (0-30 points)
        """
        try:
            # Fetch first 10KB of content
            response = requests.get(url, timeout=5, stream=True,
                                  headers={'User-Agent': 'Mozilla/5.0'})

            if response.status_code != 200:
                return 0  # Can't verify, don't penalize

            # Read first 10KB
            content = ''
            for chunk in response.iter_content(chunk_size=1024, decode_unicode=True):
                if chunk:
                    content += chunk
                    if len(content) >= 10000:
                        break

            content_lower = content.lower()

            # Check for review indicators in content
            review_patterns = [
                r'this (book|article|paper|work) (review|critiques|analyzes|examines)',
                r'(review|analysis|critique) of',
                r'the author (argues|claims|suggests|proposes)',
                r'(in this|this) (review|analysis|commentary)',
                r'reviewer\'s? (note|comment|opinion)',
            ]

            for pattern in review_patterns:
                if re.search(pattern, content_lower):
                    return 30  # Major penalty - content suggests review

            # Check for work-itself indicators
            work_indicators = [
                'chapter',
                'contents',
                'table of contents',
                'introduction',
                'preface',
                'copyright',
                'published by',
            ]

            work_indicator_count = sum(1 for indicator in work_indicators
                                      if indicator in content_lower)

            if work_indicator_count >= 3:
                return 0  # Likely the work itself
            elif work_indicator_count == 0:
                return 15  # Might be review (no work indicators)

            return 0

        except Exception:
            # If fetching fails, don't penalize
            return 0

    def score_primary_url_with_candidates(self, candidates: List[Dict],
                                         bibliographic_data: Dict) -> List[Dict]:
        """
        Score multiple primary URL candidates with enhanced logic

        Args:
            candidates: List of dicts with 'url', 'title', 'snippet'
            bibliographic_data: Reference info

        Returns:
            List of candidates with scores added, sorted by score descending
        """
        scored = []

        for candidate in candidates:
            score = self.score_primary_url(
                candidate['url'],
                bibliographic_data,
                candidate.get('title', '')
            )

            scored.append({
                **candidate,
                'score': score.total_score,
                'tier': score.domain_tier,
                'reasoning': score.reasoning
            })

        # Sort by score descending
        scored.sort(key=lambda x: x['score'], reverse=True)

        return scored


def test_enhanced_framework():
    """Test the enhanced framework"""
    print("="*80)
    print("TESTING ENHANCED QUALITY FRAMEWORK")
    print("="*80)

    scorer = EnhancedURLQualityScorer(enable_content_fetching=False)

    # Test case 1: Veblen book vs review
    biblio = {
        'author': 'Veblen, T.',
        'title': 'The Theory of the Leisure Class',
        'year': 1899,
        'publication': 'Macmillan'
    }

    test_candidates = [
        {
            'url': 'https://www.jstor.org/stable/20024186',
            'title': '"The Theory of the Leisure Class" by Thorstein Veblen: A Review',
            'snippet': 'Review of Veblen\'s classic work...'
        },
        {
            'url': 'https://archive.org/details/theoryofleisurec01vebl',
            'title': 'The theory of the leisure class : an economic study of institutions',
            'snippet': 'Full text of the book...'
        },
        {
            'url': 'https://www.jstor.org/stable/23722430',
            'title': 'Analysis of The Theory of the Leisure Class',
            'snippet': 'This paper examines Veblen\'s arguments...'
        }
    ]

    print("\nTest Case: Veblen - Theory of the Leisure Class")
    print("-"*80)

    results = scorer.score_primary_url_with_candidates(test_candidates, biblio)

    for i, result in enumerate(results, 1):
        print(f"\n{i}. Score: {result['score']}/100")
        print(f"   URL: {result['url']}")
        print(f"   Title: {result['title'][:60]}...")
        print(f"   Reasoning: {result['reasoning'][:100]}...")

    print("\n"+"="*80)
    print("Expected: archive.org should score highest (actual book)")
    print("Actual top result:", results[0]['url'])
    print("="*80)


if __name__ == '__main__':
    test_enhanced_framework()
