#!/usr/bin/env python3

"""
INTEGRATED PROCESSOR v17.0 - Deep URL Validation
Combines Production_Quality_Framework_Enhanced with deep_url_validation

This script demonstrates how to process references with:
1. Query generation (AI-powered)
2. Google search for candidates
3. DEEP URL validation (content-based accessibility checking)
4. AI-powered ranking with validated scores
5. Primary/Secondary URL assignment
6. Auto-finalization if criteria met

USAGE:
    python3 integrated_processor_v17_0.py --reference-id 5
    python3 integrated_processor_v17_0.py --batch 611-635
    python3 integrated_processor_v17_0.py --all-unfinalized

REQUIRES:
    - ANTHROPIC_API_KEY in environment
    - GOOGLE_API_KEY in environment
    - GOOGLE_CX in environment
    - Internet connectivity
"""

import asyncio
import os
import re
from typing import List, Dict, Optional
from dataclasses import dataclass
from datetime import datetime

# Import deep validation
from deep_url_validation import validate_url_deep, ValidationResult

# Import enhanced scorer (would need to be updated to use deep validation)
from Production_Quality_Framework_Enhanced import EnhancedURLQualityScorer


@dataclass
class Reference:
    """Structured reference data"""
    id: int
    author: str
    year: int
    title: str
    publication: str
    relevance: str = ""
    primary_url: str = ""
    secondary_url: str = ""
    tertiary_url: str = ""
    is_finalized: bool = False
    flags: List[str] = None

    def __post_init__(self):
        if self.flags is None:
            self.flags = []

    @property
    def citation(self) -> str:
        """Full citation for validation"""
        return f"{self.author} ({self.year}). {self.title}. {self.publication}."


class IntegratedProcessor:
    """
    Processes references with deep URL validation
    """

    def __init__(self, anthropic_key: str, google_key: str, google_cx: str):
        self.anthropic_key = anthropic_key
        self.google_key = google_key
        self.google_cx = google_cx
        self.scorer = EnhancedURLQualityScorer(enable_content_fetching=False)

    async def process_reference(self, ref: Reference) -> Dict:
        """
        Process a single reference with deep validation

        Returns:
            {
                'ref_id': int,
                'old_primary': str,
                'new_primary': str,
                'old_secondary': str,
                'new_secondary': str,
                'primary_validation': ValidationResult,
                'secondary_validation': ValidationResult,
                'changed': bool,
                'finalized': bool,
                'reason': str
            }
        """
        print(f"\n{'='*80}")
        print(f"📚 Processing RID {ref.id}: {ref.title[:60]}...")
        print(f"{'='*80}\n")

        # Step 1: Generate search queries (would call Claude API)
        queries = await self.generate_queries(ref)
        print(f"✓ Generated {len(queries)} search queries")

        # Step 2: Search Google for candidates (would call Google API)
        candidates = await self.search_candidates(queries)
        print(f"✓ Found {len(candidates)} URL candidates")

        # Step 3: DEEP VALIDATE all candidates
        print(f"\n🔍 Deep validating {len(candidates)} candidates...")
        validated_candidates = await self.deep_validate_candidates(candidates, ref)
        print(f"✓ Validation complete: {sum(1 for c in validated_candidates if c['validation'].accessible)} accessible, "
              f"{sum(1 for c in validated_candidates if c['validation'].paywall)} paywalled, "
              f"{sum(1 for c in validated_candidates if c['validation'].login_required)} login required")

        # Step 4: Rank validated candidates
        ranked = self.rank_candidates(validated_candidates, ref)
        print(f"\n📊 Ranked candidates:")
        for i, cand in enumerate(ranked[:5], 1):
            val = cand['validation']
            status = "✅" if val.accessible else ("🔒" if val.login_required else ("💰" if val.paywall else "❌"))
            print(f"  {i}. {status} Score: {cand['final_score']}/100 - {cand['url'][:60]}...")
            print(f"     Validation: {val.reason}")

        # Step 5: Select primary and secondary
        primary_candidate = self.select_primary(ranked)
        secondary_candidate = self.select_secondary(ranked, exclude=primary_candidate)

        # Store old URLs
        old_primary = ref.primary_url
        old_secondary = ref.secondary_url

        # Store results
        result = {
            'ref_id': ref.id,
            'old_primary': old_primary,
            'new_primary': primary_candidate['url'] if primary_candidate else "",
            'old_secondary': old_secondary,
            'new_secondary': secondary_candidate['url'] if secondary_candidate else "",
            'primary_validation': primary_candidate['validation'] if primary_candidate else None,
            'secondary_validation': secondary_candidate['validation'] if secondary_candidate else None,
            'changed': False,
            'finalized': False,
            'reason': ""
        }

        # Check if URLs changed
        if result['new_primary'] != old_primary or result['new_secondary'] != old_secondary:
            result['changed'] = True
            result['reason'] = "URLs updated based on accessibility validation"

        # Auto-finalize if meets criteria
        if primary_candidate and primary_candidate['validation'].accessible:
            result['finalized'] = True
            result['reason'] += " | Auto-finalized (accessible primary URL found)"

        print(f"\n{'='*80}")
        print(f"✅ Processing complete for RID {ref.id}")
        if result['changed']:
            print(f"   PRIMARY: {old_primary[:50]}... → {result['new_primary'][:50]}...")
            if result['new_secondary']:
                print(f"   SECONDARY: {old_secondary[:50]}... → {result['new_secondary'][:50]}...")
        print(f"{'='*80}\n")

        return result

    async def generate_queries(self, ref: Reference) -> List[str]:
        """Generate search queries using Claude API"""
        # Placeholder - would call Claude API
        # For now, return basic queries
        return [
            f"{ref.author} {ref.year} {ref.title} pdf",
            f"{ref.author} {ref.year} {ref.title} full text",
            f'"{ref.title}" {ref.author}',
            f"{ref.title} archive.org",
            f"{ref.author} {ref.year} review",
            f'"{ref.title}" scholarly analysis',
        ]

    async def search_candidates(self, queries: List[str]) -> List[Dict]:
        """Search Google for URL candidates"""
        # Placeholder - would call Google Custom Search API
        # Return mock candidates for testing
        return [
            {'url': 'https://example.com/article1.pdf', 'title': 'Sample Article', 'snippet': '...'},
            {'url': 'https://example.com/article2', 'title': 'Another Article', 'snippet': '...'},
        ]

    async def deep_validate_candidates(self, candidates: List[Dict], ref: Reference) -> List[Dict]:
        """
        Deep validate all URL candidates

        This is the CRITICAL step that actually fetches and analyzes content
        """
        validated = []

        # Validate in parallel (batches of 5 to avoid rate limits)
        batch_size = 5
        for i in range(0, len(candidates), batch_size):
            batch = candidates[i:i+batch_size]

            # Validate batch in parallel
            tasks = [
                validate_url_deep(
                    url=cand['url'],
                    citation=ref.citation,
                    url_type='primary',
                    api_key=self.anthropic_key
                )
                for cand in batch
            ]

            validations = await asyncio.gather(*tasks)

            # Combine candidates with validation results
            for cand, validation in zip(batch, validations):
                validated.append({
                    **cand,
                    'validation': validation
                })

        return validated

    def rank_candidates(self, validated_candidates: List[Dict], ref: Reference) -> List[Dict]:
        """
        Rank candidates using BOTH traditional scoring AND validation results

        Key principle: Accessibility score is PRIMARY factor
        """
        ranked = []

        for cand in validated_candidates:
            validation = cand['validation']

            # Base score from validation (0-100)
            # This is the MOST IMPORTANT factor
            accessibility_score = validation.score

            # Traditional domain/content score (0-100)
            traditional_score = self.scorer.score_primary_url(
                cand['url'],
                {
                    'author': ref.author,
                    'title': ref.title,
                    'year': ref.year,
                    'publication': ref.publication
                },
                cand.get('title', '')
            ).total_score

            # Combined score: 70% accessibility, 30% traditional
            # This ensures free sources ALWAYS win over paywalled,
            # but among equally accessible sources, quality matters
            final_score = int(accessibility_score * 0.7 + traditional_score * 0.3)

            ranked.append({
                **cand,
                'accessibility_score': accessibility_score,
                'traditional_score': traditional_score,
                'final_score': final_score
            })

        # Sort by final score descending
        ranked.sort(key=lambda x: x['final_score'], reverse=True)

        return ranked

    def select_primary(self, ranked_candidates: List[Dict]) -> Optional[Dict]:
        """
        Select primary URL

        Criteria:
        - Must be accessible (score >= 90)
        - Highest final score
        """
        for cand in ranked_candidates:
            if cand['validation'].accessible and cand['final_score'] >= 75:
                return cand

        # If no accessible candidate with score >= 75, flag for manual review
        return None

    def select_secondary(self, ranked_candidates: List[Dict], exclude: Optional[Dict] = None) -> Optional[Dict]:
        """
        Select secondary URL

        Criteria:
        - Different from primary
        - Prefer accessible (score >= 80)
        - Can accept login-required (score >= 60) if no better option
        """
        exclude_url = exclude['url'] if exclude else None

        for cand in ranked_candidates:
            if cand['url'] == exclude_url:
                continue

            if cand['validation'].accessible and cand['final_score'] >= 70:
                return cand

            # Accept login-required as secondary if score decent
            if cand['validation'].login_required and cand['final_score'] >= 60:
                return cand

        return None


async def process_sample_25():
    """Process Sample 25 (RID 611-635)"""

    print("="*80)
    print("🎯 SAMPLE 25 REPROCESSING - RID 611-635")
    print("="*80)
    print()

    # Get API keys
    anthropic_key = os.environ.get('ANTHROPIC_API_KEY')
    google_key = os.environ.get('GOOGLE_API_KEY')
    google_cx = os.environ.get('GOOGLE_CX')

    if not all([anthropic_key, google_key, google_cx]):
        print("❌ ERROR: Missing API keys")
        print("   Required environment variables:")
        print("   - ANTHROPIC_API_KEY")
        print("   - GOOGLE_API_KEY")
        print("   - GOOGLE_CX")
        return

    processor = IntegratedProcessor(anthropic_key, google_key, google_cx)

    # Load references 611-635
    # (Would load from caught_in_the_act_decisions.txt)
    sample_refs = []  # Placeholder

    print(f"📋 Loaded {len(sample_refs)} references")
    print()

    # Process each reference
    results = []
    for ref in sample_refs:
        result = await processor.process_reference(ref)
        results.append(result)

        # Brief progress update
        print(f"✓ Completed {len(results)}/{len(sample_refs)}")

    # Generate report
    generate_sample_25_report(results)


def generate_sample_25_report(results: List[Dict]):
    """Generate Sample 25 reprocessing report"""

    print("\n" + "="*80)
    print("📊 SAMPLE 25 REPROCESSING REPORT")
    print("="*80 + "\n")

    # Statistics
    total = len(results)
    changed = sum(1 for r in results if r['changed'])
    finalized = sum(1 for r in results if r['finalized'])

    print(f"Total references: {total}")
    print(f"URLs changed: {changed} ({changed/total*100:.1f}%)")
    print(f"Auto-finalized: {finalized} ({finalized/total*100:.1f}%)")
    print()

    # Accessibility statistics
    accessible_primary = sum(1 for r in results if r['primary_validation'] and r['primary_validation'].accessible)
    accessible_secondary = sum(1 for r in results if r['secondary_validation'] and r['secondary_validation'].accessible)

    print(f"Accessible primaries: {accessible_primary}/{total} ({accessible_primary/total*100:.1f}%)")
    print(f"Accessible secondaries: {accessible_secondary}/{total} ({accessible_secondary/total*100:.1f}%)")
    print()

    # Detailed changes
    print("="*80)
    print("DETAILED CHANGES")
    print("="*80 + "\n")

    for result in results:
        if result['changed']:
            print(f"RID {result['ref_id']}:")
            print(f"  Old PRIMARY: {result['old_primary'][:60]}...")
            print(f"  New PRIMARY: {result['new_primary'][:60]}...")
            if result['primary_validation']:
                val = result['primary_validation']
                print(f"  Validation: {val.reason} (score: {val.score})")
            print()


if __name__ == '__main__':
    import argparse

    parser = argparse.ArgumentParser(description='Integrated processor v17.0 with deep URL validation')
    parser.add_argument('--reference-id', type=int, help='Process single reference by ID')
    parser.add_argument('--batch', help='Process batch (e.g., "611-635")')
    parser.add_argument('--all-unfinalized', action='store_true', help='Process all 139 unfinalized references')
    parser.add_argument('--test', action='store_true', help='Run in test mode (no API calls)')

    args = parser.parse_args()

    if args.batch == "611-635" or args.batch == "sample-25":
        asyncio.run(process_sample_25())
    else:
        print("Integrated Processor v17.0 - Deep URL Validation")
        print()
        print("Usage examples:")
        print("  python3 integrated_processor_v17_0.py --batch sample-25")
        print("  python3 integrated_processor_v17_0.py --reference-id 5")
        print("  python3 integrated_processor_v17_0.py --all-unfinalized")
