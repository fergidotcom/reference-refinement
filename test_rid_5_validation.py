#!/usr/bin/env python3

"""
Test Deep URL Validation with RID 5

Verifies that:
1. UCI PDF (free) scores 90-100
2. Science.org (login required) scores 60-70
3. UCI PDF scores HIGHER than Science.org
"""

import asyncio
import os
from deep_url_validation import validate_url_deep

async def test_rid_5():
    """Test RID 5 URLs"""

    print("=" * 80)
    print("🧪 TESTING RID 5 - Deep URL Validation")
    print("=" * 80)
    print()

    # Reference info
    citation = "Tversky, A. (1974). Judgment under uncertainty: Heuristics and biases. Science, 185(4157), 1124-1131."

    # Test URLs
    tests = [
        {
            "name": "UCI Free PDF",
            "url": "https://sites.socsci.uci.edu/~bskyrms/bio/readings/tversky_k_heuristics_biases.pdf",
            "expected_score_min": 90,
            "expected_score_max": 100,
            "expected_accessible": True,
            "note": "FREE full-text PDF (domain looks like JSTOR but is FREE!)"
        },
        {
            "name": "Science.org DOI",
            "url": "https://www.science.org/doi/10.1126/science.185.4157.1124",
            "expected_score_min": 60,
            "expected_score_max": 70,
            "expected_accessible": False,
            "note": "LOGIN REQUIRED (not freely accessible)"
        }
    ]

    # Get API key if available
    api_key = os.environ.get('ANTHROPIC_API_KEY')

    results = []

    for i, test in enumerate(tests, 1):
        print(f"\n{'='*80}")
        print(f"Test {i}: {test['name']}")
        print(f"{'='*80}")
        print(f"URL: {test['url']}")
        print(f"Expected: {test['note']}")
        print(f"Expected score: {test['expected_score_min']}-{test['expected_score_max']}")
        print()

        # Validate
        result = await validate_url_deep(
            url=test['url'],
            citation=citation,
            url_type='primary',
            api_key=api_key
        )

        # Store result
        results.append({
            'name': test['name'],
            'url': test['url'],
            'result': result,
            'expected_min': test['expected_score_min'],
            'expected_max': test['expected_score_max'],
            'expected_accessible': test['expected_accessible']
        })

        # Display result
        print(f"✅ Validation complete:")
        print(f"   Score: {result.score}/100")
        print(f"   Accessible: {result.accessible}")
        print(f"   Valid: {result.valid}")
        print(f"   Reason: {result.reason}")

        if result.paywall:
            print(f"   🚫 Paywall detected")
        if result.login_required:
            print(f"   🔒 Login required")
        if result.preview_only:
            print(f"   👁️  Preview only")
        if result.soft_404:
            print(f"   ❌ Soft 404")

        if result.content_matches:
            print(f"   ✓ Content matches ({result.confidence:.0%} confidence)")

        # Check if score is in expected range
        score_ok = test['expected_score_min'] <= result.score <= test['expected_score_max']
        accessible_ok = result.accessible == test['expected_accessible']

        print()
        if score_ok and accessible_ok:
            print(f"   ✅ PASS - Score and accessibility match expectations")
        else:
            print(f"   ❌ FAIL - Score or accessibility mismatch")
            if not score_ok:
                print(f"      Expected score: {test['expected_score_min']}-{test['expected_score_max']}, got {result.score}")
            if not accessible_ok:
                print(f"      Expected accessible: {test['expected_accessible']}, got {result.accessible}")

    # Final comparison
    print(f"\n{'='*80}")
    print("🏆 FINAL VALIDATION")
    print(f"{'='*80}\n")

    uci_result = results[0]['result']
    science_result = results[1]['result']

    print(f"UCI PDF score:      {uci_result.score}/100")
    print(f"Science.org score:  {science_result.score}/100")
    print()

    if uci_result.score > science_result.score:
        print(f"✅ PASS - UCI PDF ({uci_result.score}) scores HIGHER than Science.org ({science_result.score})")
        print(f"   Difference: +{uci_result.score - science_result.score} points")
        print()
        print("🎉 Deep validation is working correctly!")
        print("   Free sources are scoring higher than paywalled sources.")
        return True
    else:
        print(f"❌ FAIL - Science.org ({science_result.score}) scores HIGHER than or EQUAL to UCI PDF ({uci_result.score})")
        print(f"   This is incorrect - free sources should score higher!")
        return False


if __name__ == '__main__':
    success = asyncio.run(test_rid_5())
    exit(0 if success else 1)
