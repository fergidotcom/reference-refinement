#!/usr/bin/env python3

"""
Test script for Deep URL Validation v17.0

Tests the validate_url_deep() function with RID 5 test case:
- UCI PDF (free) should score 90-100
- Science.org (login required) should score 60-70
"""

import asyncio
import sys
import os

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from Production_Quality_Framework_Enhanced import validate_url_deep, ValidationResult


# Test case for RID 5: Tversky (1974)
RID_5_REFERENCE = {
    'author': 'Tversky, A.',
    'title': 'Judgment under uncertainty: Heuristics and biases',
    'year': 1974,
    'publication': 'Science'
}

# Test URLs
TEST_URLS = {
    'UCI_PDF': {
        'url': 'https://sites.socsci.uci.edu/~bskyrms/bio/readings/tversky_k_heuristics_biases.pdf',
        'expected_score_range': (90, 100),
        'expected_accessible': True,
        'description': 'Free UCI PDF (should score highest)'
    },
    'SCIENCE_ORG': {
        'url': 'https://www.science.org/doi/10.1126/science.185.4157.1124',
        'expected_score_range': (60, 70),
        'expected_accessible': False,
        'description': 'Science.org (login required)'
    }
}


async def test_url(name: str, test_config: dict):
    """Test a single URL"""
    print(f"\n{'='*80}")
    print(f"Testing: {name}")
    print(f"Description: {test_config['description']}")
    print(f"URL: {test_config['url']}")
    print(f"Expected Score: {test_config['expected_score_range'][0]}-{test_config['expected_score_range'][1]}")
    print(f"Expected Accessible: {test_config['expected_accessible']}")
    print(f"{'='*80}")

    try:
        result = await validate_url_deep(
            test_config['url'],
            RID_5_REFERENCE
        )

        print(f"\n✅ Validation Complete!")
        print(f"\nResults:")
        print(f"  Valid: {result.valid}")
        print(f"  Accessible: {result.accessible}")
        print(f"  Score: {result.score}/100")
        print(f"  Reason: {result.reason}")
        print(f"  Confidence: {result.confidence:.2f}")
        print(f"\nAccess Barriers:")
        print(f"  Paywall: {result.paywall}")
        print(f"  Login Required: {result.login_required}")
        print(f"  Preview Only: {result.preview_only}")
        print(f"  Soft 404: {result.soft_404}")
        print(f"  Content Matches: {result.content_matches}")

        # Check if results match expectations
        expected_min, expected_max = test_config['expected_score_range']
        score_in_range = expected_min <= result.score <= expected_max
        accessibility_matches = result.accessible == test_config['expected_accessible']

        print(f"\n{'🎯' if score_in_range else '⚠️'} Score in expected range: {score_in_range}")
        print(f"{'🎯' if accessibility_matches else '⚠️'} Accessibility matches: {accessibility_matches}")

        if score_in_range and accessibility_matches:
            print(f"\n✅ TEST PASSED!")
            return True
        else:
            print(f"\n⚠️ TEST PARTIALLY PASSED (check details above)")
            return False

    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        return False


async def run_all_tests():
    """Run all validation tests"""
    print("""
╔══════════════════════════════════════════════════════════════════════════════╗
║                   DEEP URL VALIDATION TEST SUITE v17.0                       ║
║                                                                              ║
║  Testing RID 5: Tversky (1974) - Judgment under uncertainty                 ║
╚══════════════════════════════════════════════════════════════════════════════╝
""")

    results = {}

    # Test UCI PDF (should be accessible, high score)
    results['UCI_PDF'] = await test_url('UCI_PDF', TEST_URLS['UCI_PDF'])

    # Wait a moment before next test
    await asyncio.sleep(2)

    # Test Science.org (should require login, lower score)
    results['SCIENCE_ORG'] = await test_url('SCIENCE_ORG', TEST_URLS['SCIENCE_ORG'])

    # Summary
    print(f"\n\n{'='*80}")
    print("SUMMARY")
    print(f"{'='*80}")
    print(f"UCI PDF (free):          {'✅ PASS' if results['UCI_PDF'] else '❌ FAIL'}")
    print(f"Science.org (login):     {'✅ PASS' if results['SCIENCE_ORG'] else '❌ FAIL'}")

    all_passed = all(results.values())

    print(f"\n{'='*80}")
    if all_passed:
        print("🎉 ALL TESTS PASSED! Deep validation is working correctly.")
        print("\nCritical requirement met:")
        print("✅ UCI PDF (free) scores higher than Science.org (login required)")
    else:
        print("⚠️ Some tests did not pass completely. Review results above.")

    print(f"{'='*80}\n")

    return all_passed


if __name__ == '__main__':
    # Check for ANTHROPIC_API_KEY
    if not os.environ.get('ANTHROPIC_API_KEY'):
        print("⚠️ Warning: ANTHROPIC_API_KEY not set.")
        print("AI-powered content verification will fallback to basic text matching.")
        print()

    # Run tests
    all_passed = asyncio.run(run_all_tests())

    # Exit code
    sys.exit(0 if all_passed else 1)
