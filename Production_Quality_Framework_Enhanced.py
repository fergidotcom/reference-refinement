#!/usr/bin/env python3

"""
PRODUCTION QUALITY FRAMEWORK - ENHANCED VERSION
Automated URL scoring with content matching and title analysis

ENHANCEMENTS OVER v1.0:
1. Title-based filtering for primary URLs (detects review articles)
2. Optional content fetching to verify work vs. review
3. Improved accuracy for distinguishing work-itself from reviews/analyses
"""

import re
import requests
from typing import Dict, List, Tuple, Optional
from urllib.parse import urlparse
from dataclasses import dataclass
from Production_Quality_Framework import URLQualityScorer, URLScore


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
