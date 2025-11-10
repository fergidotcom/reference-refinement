#!/usr/bin/env python3

"""
PRODUCTION QUALITY FRAMEWORK
Automated URL scoring and selection system based on Phase 2 quality pattern analysis

Implements discovered quality criteria from 288 finalized references
"""

import re
from typing import Dict, List, Tuple, Optional
from urllib.parse import urlparse
from dataclasses import dataclass


@dataclass
class URLScore:
    """URL quality score with breakdown"""
    total_score: int
    domain_tier: str
    domain_score: int
    content_type: str
    content_modifier: int
    relationship_type: Optional[str] = None
    relationship_score: Optional[int] = None
    confidence: str = "medium"
    reasoning: str = ""


class URLQualityScorer:
    """
    Implements discovered quality criteria as quantitative scoring
    Based on analysis of 288 finalized references from "Caught in the Act" manuscript
    """

    # Phase 2 findings: Domain tier distribution from finalized references
    DOMAIN_TIER_SCORES = {
        'tier1_doi': 95,        # 28.1% of primaries - DOI links (persistent identifiers)
        'tier1_jstor': 95,      # 1.4% - JSTOR academic database
        'tier1_edu': 85,        # 10.1% - Educational institutions
        'tier1_gov': 85,        # 6.3% - Government sources
        'tier1_archive': 90,    # 0.3% - archive.org preservation
        'tier2_publisher': 80,  # 19.4% - Publishers and academic presses
        'tier3_purchase': 60,   # 1.0% - Amazon, Google Books purchase pages
        'tier4_other': 50       # 33.3% - Other domains (case by case)
    }

    # Content type modifiers
    CONTENT_TYPE_MODIFIERS = {
        'doi_link': +10,        # Direct DOI - highly stable
        'pdf': +5,              # PDF - full text likely
        'article_page': +5,     # Article page - content page
        'book_page': 0,         # Book page - may be info only
        'html_page': 0,         # HTML page - varies
        'purchase_page': -10    # Purchase page - not full text
    }

    # Secondary URL relationship types (from Phase 2 analysis)
    RELATIONSHIP_TYPE_SCORES = {
        'review': 95,                    # 2.8% - Academic review/critical analysis
        'scholarly_discussion': 90,      # 18.8% - Scholarly discussion/academic context
        'reference': 85,                 # Reference work - authoritative overview
        'archive': 80,                   # 2.8% - Preserved content
        'organization': 75,              # 28.5% - Institutional context
        'news_media': 70,                # 1.4% - Public discussion
        'other': 60                      # 45.8% - Evaluate individually
    }

    # Quality thresholds (production system settings)
    QUALITY_THRESHOLDS = {
        'auto_finalize_score': 85,      # Auto-finalize if score ≥ 85
        'human_review_score': 70,       # Human review if score < 70
        'rejection_score': 50,          # Reject if score < 50
        'primary_minimum': 70,          # Minimum acceptable primary
        'secondary_minimum': 65         # Minimum acceptable secondary
    }

    def __init__(self):
        """Initialize the quality scorer with learned patterns"""
        pass

    def score_primary_url(self, url: str, bibliographic_data: Dict) -> URLScore:
        """
        Score primary URL using Phase 2 discovered criteria

        Args:
            url: URL to score
            bibliographic_data: Dict with author, title, year, publication

        Returns:
            URLScore with total score (0-100), tier, type, and reasoning
        """
        if not url:
            return URLScore(
                total_score=0,
                domain_tier='none',
                domain_score=0,
                content_type='none',
                content_modifier=0,
                reasoning="No URL provided"
            )

        # Extract domain
        domain = self._extract_domain(url)

        # Classify domain tier
        tier = self._classify_domain_tier(domain)
        domain_score = self.DOMAIN_TIER_SCORES[tier]

        # Classify content type
        content_type = self._classify_content_type(url)
        content_modifier = self.CONTENT_TYPE_MODIFIERS.get(content_type, 0)

        # Calculate total score
        total_score = domain_score + content_modifier

        # Cap at 100
        total_score = min(100, max(0, total_score))

        # Determine confidence level
        confidence = self._determine_confidence(total_score, tier)

        # Generate reasoning
        reasoning = self._generate_primary_reasoning(
            domain, tier, domain_score, content_type, content_modifier
        )

        return URLScore(
            total_score=total_score,
            domain_tier=tier,
            domain_score=domain_score,
            content_type=content_type,
            content_modifier=content_modifier,
            confidence=confidence,
            reasoning=reasoning
        )

    def score_secondary_url(self, url: str, context: str, primary_url: str) -> URLScore:
        """
        Score secondary URL based on relationship type and quality

        Args:
            url: Secondary URL to score
            context: Manuscript context for this citation
            primary_url: Primary URL (to avoid duplicates)

        Returns:
            URLScore with relationship type scoring
        """
        if not url:
            return URLScore(
                total_score=0,
                domain_tier='none',
                domain_score=0,
                content_type='none',
                content_modifier=0,
                reasoning="No URL provided"
            )

        # Check if duplicate of primary
        if url == primary_url:
            return URLScore(
                total_score=0,
                domain_tier='duplicate',
                domain_score=0,
                content_type='duplicate',
                content_modifier=0,
                reasoning="ERROR: Duplicate of primary URL"
            )

        # Extract domain
        domain = self._extract_domain(url)

        # Classify domain tier (affects base score)
        tier = self._classify_domain_tier(domain)

        # Classify relationship type
        relationship_type = self._classify_relationship_type(url, domain)
        relationship_score = self.RELATIONSHIP_TYPE_SCORES.get(relationship_type, 60)

        # Total score is relationship score (relationship type matters most for secondaries)
        total_score = relationship_score

        # Confidence based on score
        confidence = self._determine_confidence(total_score, tier)

        # Reasoning
        reasoning = self._generate_secondary_reasoning(
            domain, tier, relationship_type, relationship_score
        )

        return URLScore(
            total_score=total_score,
            domain_tier=tier,
            domain_score=0,  # Not used for secondary scoring
            content_type='secondary',
            content_modifier=0,
            relationship_type=relationship_type,
            relationship_score=relationship_score,
            confidence=confidence,
            reasoning=reasoning
        )

    def predict_user_selection(
        self,
        primary_candidates: List[Tuple[str, Dict]],
        secondary_candidates: List[Tuple[str, str]],
        context: str
    ) -> Dict:
        """
        Rank candidates and predict user selection

        Args:
            primary_candidates: List of (url, bib_data) tuples
            secondary_candidates: List of (url, context) tuples
            context: Manuscript context

        Returns:
            Dict with ranked candidates, confidence scores, review flags
        """
        # Score all primary candidates
        primary_scores = []
        for url, bib_data in primary_candidates:
            score = self.score_primary_url(url, bib_data)
            primary_scores.append((url, score))

        # Sort by score (descending)
        primary_scores.sort(key=lambda x: x[1].total_score, reverse=True)

        # Score all secondary candidates
        secondary_scores = []
        primary_url = primary_scores[0][0] if primary_scores else None

        for url, ctx in secondary_candidates:
            score = self.score_secondary_url(url, ctx, primary_url)
            secondary_scores.append((url, score))

        # Sort by score (descending)
        secondary_scores.sort(key=lambda x: x[1].total_score, reverse=True)

        # Determine recommendation
        top_primary_score = primary_scores[0][1].total_score if primary_scores else 0
        top_secondary_score = secondary_scores[0][1].total_score if secondary_scores else 0

        # Auto-finalize if both meet threshold
        can_auto_finalize = (
            top_primary_score >= self.QUALITY_THRESHOLDS['auto_finalize_score'] and
            top_secondary_score >= self.QUALITY_THRESHOLDS['auto_finalize_score']
        )

        # Human review if either is low
        needs_review = (
            top_primary_score < self.QUALITY_THRESHOLDS['human_review_score'] or
            top_secondary_score < self.QUALITY_THRESHOLDS['human_review_score']
        )

        # Flag edge cases
        edge_cases = []
        if len([s for url, s in primary_scores if s.total_score >= 85]) > 1:
            edge_cases.append("Multiple high-quality primary options")

        if top_primary_score < self.QUALITY_THRESHOLDS['primary_minimum']:
            edge_cases.append("No acceptable primary URL found")

        return {
            'primary': {
                'recommended': primary_scores[0] if primary_scores else None,
                'all_scored': primary_scores,
                'top_score': top_primary_score
            },
            'secondary': {
                'recommended': secondary_scores[0] if secondary_scores else None,
                'all_scored': secondary_scores,
                'top_score': top_secondary_score
            },
            'recommendation': {
                'can_auto_finalize': can_auto_finalize,
                'needs_human_review': needs_review,
                'edge_cases': edge_cases,
                'confidence': 'high' if can_auto_finalize else 'medium' if not needs_review else 'low'
            }
        }

    def validate_instance_set(self, instances: List[Dict]) -> Dict:
        """
        Validate a set of instance references

        Args:
            instances: List of instance dicts with parent_rid, primaryUrl, secondaryUrl

        Returns:
            Validation results with pass/fail and issues
        """
        issues = []
        warnings = []

        # Group by parent
        by_parent = {}
        for inst in instances:
            parent_rid = inst.get('parent_rid')
            if parent_rid not in by_parent:
                by_parent[parent_rid] = []
            by_parent[parent_rid].append(inst)

        # Validate each parent's instances
        for parent_rid, parent_instances in by_parent.items():
            # Check: All instances share same primary URL
            primary_urls = set(inst.get('primaryUrl') for inst in parent_instances)
            if len(primary_urls) > 1:
                issues.append(f"Parent {parent_rid}: Instances have different primary URLs")

            # Check: No duplicate secondary URLs within instance set
            secondary_urls = [inst.get('secondaryUrl') for inst in parent_instances]
            seen = set()
            for url in secondary_urls:
                if url in seen:
                    issues.append(f"Parent {parent_rid}: Duplicate secondary URL: {url}")
                seen.add(url)

            # Check: All secondaries meet quality threshold
            for inst in parent_instances:
                score = self.score_secondary_url(
                    inst.get('secondaryUrl', ''),
                    inst.get('manuscript_context', ''),
                    inst.get('primaryUrl', '')
                )
                if score.total_score < self.QUALITY_THRESHOLDS['secondary_minimum']:
                    warnings.append(
                        f"Instance {inst.get('reference_id')}: "
                        f"Low quality secondary (score: {score.total_score})"
                    )

        return {
            'validation_passed': len(issues) == 0,
            'issues': issues,
            'warnings': warnings,
            'total_instances_validated': len(instances),
            'total_parent_groups': len(by_parent)
        }

    # ===== HELPER METHODS =====

    def _extract_domain(self, url: str) -> str:
        """Extract domain from URL"""
        try:
            parsed = urlparse(url)
            domain = parsed.netloc.replace('www.', '')
            return domain
        except:
            return ''

    def _classify_domain_tier(self, domain: str) -> str:
        """Classify domain into quality tier"""
        if not domain:
            return 'tier4_other'

        # Tier 1: High-authority sources
        if 'doi.org' in domain:
            return 'tier1_doi'
        if 'jstor.org' in domain:
            return 'tier1_jstor'
        if 'archive.org' in domain:
            return 'tier1_archive'
        if domain.endswith('.edu'):
            return 'tier1_edu'
        if domain.endswith('.gov'):
            return 'tier1_gov'

        # Tier 2: Publishers and institutions
        if any(keyword in domain for keyword in ['press', 'publisher', 'publishing']):
            return 'tier2_publisher'
        if domain.endswith('.org'):
            return 'tier2_publisher'

        # Tier 3: Purchase/commercial
        if 'amazon' in domain or 'google.com/books' in domain:
            return 'tier3_purchase'

        # Tier 4: Other
        return 'tier4_other'

    def _classify_content_type(self, url: str) -> str:
        """Classify content type from URL"""
        url_lower = url.lower()

        if 'doi.org' in url_lower:
            return 'doi_link'
        if url_lower.endswith('.pdf') or '/pdf' in url_lower:
            return 'pdf'
        if '/article' in url_lower or '/articles' in url_lower:
            return 'article_page'
        if '/book' in url_lower or '/books' in url_lower:
            return 'book_page'
        if 'amazon.com' in url_lower or 'google.com/books' in url_lower:
            return 'purchase_page'

        return 'html_page'

    def _classify_relationship_type(self, url: str, domain: str) -> str:
        """Classify secondary URL relationship type"""
        url_lower = url.lower()

        # Reviews
        if 'review' in url_lower or 'jstor.org' in domain:
            return 'review'

        # Scholarly discussion
        if domain.endswith('.edu') or 'scholar' in domain or 'academic' in domain:
            return 'scholarly_discussion'

        # Reference works
        if 'stanford.edu' in domain or 'britannica' in domain or 'encyclopedia' in url_lower:
            return 'reference'

        # Archives
        if 'archive.org' in domain or 'repository' in domain:
            return 'archive'

        # News media
        if any(news in domain for news in ['nytimes', 'washingtonpost', 'news', 'guardian']):
            return 'news_media'

        # Organizations
        if domain.endswith('.org'):
            return 'organization'

        return 'other'

    def _determine_confidence(self, score: int, tier: str) -> str:
        """Determine confidence level based on score and tier"""
        if score >= 90 and tier.startswith('tier1'):
            return 'high'
        elif score >= 75:
            return 'medium'
        else:
            return 'low'

    def _generate_primary_reasoning(
        self, domain: str, tier: str, domain_score: int,
        content_type: str, content_modifier: int
    ) -> str:
        """Generate human-readable reasoning for primary score"""
        parts = [
            f"Domain: {domain} ({tier}, base score: {domain_score})",
            f"Content type: {content_type} (modifier: {content_modifier:+d})"
        ]
        return "; ".join(parts)

    def _generate_secondary_reasoning(
        self, domain: str, tier: str, relationship_type: str, relationship_score: int
    ) -> str:
        """Generate human-readable reasoning for secondary score"""
        return f"Domain: {domain} ({tier}); Relationship: {relationship_type} (score: {relationship_score})"


# ===== USAGE EXAMPLE =====

if __name__ == "__main__":
    scorer = URLQualityScorer()

    print("=" * 80)
    print("PRODUCTION QUALITY FRAMEWORK - USAGE EXAMPLES")
    print("=" * 80)

    # Example 1: Score primary URL
    print("\n1. PRIMARY URL SCORING")
    print("-" * 80)

    primary_url = "https://doi.org/10.1126/science.185.4157.1124"
    bib_data = {
        'author': 'Tversky, A., & Kahneman, D.',
        'title': 'Judgment under uncertainty',
        'year': '1974'
    }

    score = scorer.score_primary_url(primary_url, bib_data)
    print(f"URL: {primary_url}")
    print(f"Score: {score.total_score}/100")
    print(f"Confidence: {score.confidence}")
    print(f"Reasoning: {score.reasoning}")

    # Example 2: Score secondary URL
    print("\n2. SECONDARY URL SCORING")
    print("-" * 80)

    secondary_url = "https://www.jstor.org/stable/1738360"
    context = "Used to demonstrate cognitive biases in political judgment"

    score = scorer.score_secondary_url(secondary_url, context, primary_url)
    print(f"URL: {secondary_url}")
    print(f"Score: {score.total_score}/100")
    print(f"Relationship: {score.relationship_type}")
    print(f"Reasoning: {score.reasoning}")

    # Example 3: Predict selection
    print("\n3. CANDIDATE RANKING")
    print("-" * 80)

    primary_candidates = [
        ("https://doi.org/10.1126/science.185.4157.1124", bib_data),
        ("https://amazon.com/book/12345", bib_data),
        ("https://press.uchicago.edu/article", bib_data)
    ]

    secondary_candidates = [
        ("https://www.jstor.org/stable/1738360", context),
        ("https://wikipedia.org/cognitive-bias", context),
        ("https://scholar.edu/analysis", context)
    ]

    result = scorer.predict_user_selection(primary_candidates, secondary_candidates, context)

    print(f"Recommended primary: {result['primary']['recommended'][0]}")
    print(f"  Score: {result['primary']['recommended'][1].total_score}")
    print(f"Recommended secondary: {result['secondary']['recommended'][0]}")
    print(f"  Score: {result['secondary']['recommended'][1].total_score}")
    print(f"Can auto-finalize: {result['recommendation']['can_auto_finalize']}")
    print(f"Needs review: {result['recommendation']['needs_human_review']}")

    print("\n" + "=" * 80)
    print("✅ Framework ready for production deployment")
    print("=" * 80)
