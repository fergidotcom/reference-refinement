#!/usr/bin/env python3

"""
Test script for Pattern Detection in Deep URL Validation v17.0

Tests the pattern detection logic without requiring network access.
Uses sample HTML content to verify barrier detection works correctly.
"""

import sys
import os

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from Production_Quality_Framework_Enhanced import (
    detect_access_barriers,
    verify_content_match_basic,
    PAYWALL_PATTERNS,
    LOGIN_PATTERNS,
    PREVIEW_PATTERNS,
    SOFT_404_PATTERNS
)


# Sample HTML content for different scenarios
SAMPLE_CONTENT = {
    'PAYWALL': """
        <html>
        <head><title>Article Title - Science</title></head>
        <body>
            <h1>Judgment under uncertainty: Heuristics and biases</h1>
            <p>By A. Tversky and D. Kahneman (1974)</p>
            <div class="paywall-notice">
                <p>Subscribe to continue reading this article.</p>
                <button>Subscribe Now - $19.99 to access</button>
            </div>
        </body>
        </html>
    """,

    'LOGIN_REQUIRED': """
        <html>
        <head><title>Sign In Required - Science.org</title></head>
        <body>
            <h1>Judgment under uncertainty: Heuristics and biases</h1>
            <div class="auth-wall">
                <p>Sign in to continue reading</p>
                <p>You must be logged in to view this content.</p>
                <button>Sign In</button>
            </div>
        </body>
        </html>
    """,

    'PREVIEW_ONLY': """
        <html>
        <head><title>Preview - Google Books</title></head>
        <body>
            <h1>Judgment under uncertainty: Heuristics and biases</h1>
            <p>By Tversky and Kahneman</p>
            <div class="preview-notice">
                <p>Preview only - Limited preview available</p>
                <p>5 pages shown. Continue reading with subscription.</p>
            </div>
        </body>
        </html>
    """,

    'SOFT_404': """
        <html>
        <head><title>404 - Page Not Found</title></head>
        <body>
            <h1>Oops! There's nothing here</h1>
            <p>Sorry, we couldn't find the page you were looking for.</p>
            <p>The document you requested is not available.</p>
        </body>
        </html>
    """,

    'ACCESSIBLE_PDF': """
        %PDF-1.4
        1 0 obj
        << /Type /Catalog /Pages 2 0 R >>
        endobj
        2 0 obj
        << /Type /Pages /Kids [3 0 R] /Count 1 >>
        endobj
        3 0 obj
        << /Type /Page /Parent 2 0 R /Resources 4 0 R /Contents 5 0 R >>
        endobj
        5 0 obj
        << /Length 44 >>
        stream
        BT
        /F1 12 Tf
        100 700 Td
        (Judgment under uncertainty: Heuristics and biases) Tj
        ET
        endstream
        endobj
        Tversky, A., & Kahneman, D. (1974). Science, 185(4157), 1124-1131.
    """,

    'ACCESSIBLE_HTML': """
        <html>
        <head><title>Judgment under uncertainty: Heuristics and biases</title></head>
        <body>
            <article>
                <h1>Judgment under uncertainty: Heuristics and biases</h1>
                <div class="authors">
                    <p>Amos Tversky and Daniel Kahneman</p>
                    <p>Science (1974), Vol. 185, No. 4157, pp. 1124-1131</p>
                </div>
                <div class="abstract">
                    <h2>Abstract</h2>
                    <p>This article described three heuristics that are employed
                    in making judgments under uncertainty...</p>
                </div>
                <div class="full-text">
                    <h2>Introduction</h2>
                    <p>People rely on a limited number of heuristic principles which
                    reduce the complex tasks of assessing probabilities and predicting
                    values to simpler judgmental operations...</p>

                    <h2>Table of Contents</h2>
                    <ul>
                        <li>Representativeness</li>
                        <li>Availability</li>
                        <li>Adjustment and anchoring</li>
                    </ul>

                    <p>Copyright 1974 American Association for the Advancement of Science.
                    Published by AAAS.</p>
                </div>
            </article>
        </body>
        </html>
    """
}


# Test reference
TEST_REFERENCE = {
    'author': 'Tversky, A.',
    'title': 'Judgment under uncertainty: Heuristics and biases',
    'year': 1974,
    'publication': 'Science'
}


def test_pattern_detection(name: str, content: str, expected_accessible: bool,
                           expected_score_range: tuple, expected_flags: dict):
    """Test pattern detection on sample content"""
    print(f"\n{'='*80}")
    print(f"Test: {name}")
    print(f"Expected Accessible: {expected_accessible}")
    print(f"Expected Score: {expected_score_range[0]}-{expected_score_range[1]}")
    print(f"{'='*80}")

    result = detect_access_barriers(content, f"https://example.com/{name.lower()}")

    print(f"\nResults:")
    print(f"  Accessible: {result['accessible']}")
    print(f"  Score: {result['score']}")
    print(f"  Reason: {result['reason']}")

    # Check expected values
    tests_passed = []

    # Check accessibility
    if result['accessible'] == expected_accessible:
        print(f"  ✅ Accessibility matches expected")
        tests_passed.append(True)
    else:
        print(f"  ❌ Accessibility mismatch (got {result['accessible']}, expected {expected_accessible})")
        tests_passed.append(False)

    # Check score range
    if expected_score_range[0] <= result['score'] <= expected_score_range[1]:
        print(f"  ✅ Score in expected range")
        tests_passed.append(True)
    else:
        print(f"  ❌ Score out of range (got {result['score']}, expected {expected_score_range[0]}-{expected_score_range[1]})")
        tests_passed.append(False)

    # Check specific flags
    for flag, expected_value in expected_flags.items():
        actual_value = result.get(flag, False)
        if actual_value == expected_value:
            print(f"  ✅ {flag}: {actual_value} (expected)")
            tests_passed.append(True)
        else:
            print(f"  ❌ {flag}: {actual_value} (expected {expected_value})")
            tests_passed.append(False)

    all_passed = all(tests_passed)
    print(f"\n{'✅ TEST PASSED' if all_passed else '❌ TEST FAILED'}")

    return all_passed


def test_content_matching():
    """Test content matching logic"""
    print(f"\n{'='*80}")
    print("Test: Content Matching (Accessible HTML)")
    print(f"{'='*80}")

    result = verify_content_match_basic(
        SAMPLE_CONTENT['ACCESSIBLE_HTML'],
        TEST_REFERENCE
    )

    print(f"\nResults:")
    print(f"  Matches: {result['matches']}")
    print(f"  Confidence: {result['confidence']:.2f}")
    print(f"  Score: {result['score']}")
    print(f"  Reason: {result['reason']}")

    # Should match with high confidence
    tests_passed = []

    if result['matches']:
        print(f"  ✅ Content recognized as matching")
        tests_passed.append(True)
    else:
        print(f"  ❌ Content not recognized (should match)")
        tests_passed.append(False)

    if result['confidence'] >= 0.5:
        print(f"  ✅ Confidence >= 0.5")
        tests_passed.append(True)
    else:
        print(f"  ❌ Confidence too low ({result['confidence']:.2f})")
        tests_passed.append(False)

    all_passed = all(tests_passed)
    print(f"\n{'✅ TEST PASSED' if all_passed else '❌ TEST FAILED'}")

    return all_passed


def main():
    """Run all pattern detection tests"""
    print("""
╔══════════════════════════════════════════════════════════════════════════════╗
║              PATTERN DETECTION TEST SUITE v17.0                              ║
║                                                                              ║
║  Testing access barrier detection patterns without network access           ║
╚══════════════════════════════════════════════════════════════════════════════╝
""")

    print(f"\nPattern Counts:")
    print(f"  Paywall patterns: {len(PAYWALL_PATTERNS)}")
    print(f"  Login patterns: {len(LOGIN_PATTERNS)}")
    print(f"  Preview patterns: {len(PREVIEW_PATTERNS)}")
    print(f"  Soft 404 patterns: {len(SOFT_404_PATTERNS)}")

    results = {}

    # Test 1: Paywall detection
    results['paywall'] = test_pattern_detection(
        'PAYWALL',
        SAMPLE_CONTENT['PAYWALL'],
        expected_accessible=False,
        expected_score_range=(45, 55),
        expected_flags={'paywall': True}
    )

    # Test 2: Login required detection
    results['login'] = test_pattern_detection(
        'LOGIN_REQUIRED',
        SAMPLE_CONTENT['LOGIN_REQUIRED'],
        expected_accessible=False,
        expected_score_range=(55, 65),
        expected_flags={'login_required': True}
    )

    # Test 3: Preview-only detection
    results['preview'] = test_pattern_detection(
        'PREVIEW_ONLY',
        SAMPLE_CONTENT['PREVIEW_ONLY'],
        expected_accessible=False,
        expected_score_range=(35, 45),
        expected_flags={'preview_only': True}
    )

    # Test 4: Soft 404 detection
    results['soft_404'] = test_pattern_detection(
        'SOFT_404',
        SAMPLE_CONTENT['SOFT_404'],
        expected_accessible=False,
        expected_score_range=(0, 5),
        expected_flags={'soft_404': True}
    )

    # Test 5: Accessible PDF
    results['accessible_pdf'] = test_pattern_detection(
        'ACCESSIBLE_PDF',
        SAMPLE_CONTENT['ACCESSIBLE_PDF'],
        expected_accessible=True,
        expected_score_range=(85, 95),
        expected_flags={}
    )

    # Test 6: Accessible HTML
    results['accessible_html'] = test_pattern_detection(
        'ACCESSIBLE_HTML',
        SAMPLE_CONTENT['ACCESSIBLE_HTML'],
        expected_accessible=True,
        expected_score_range=(85, 95),
        expected_flags={}
    )

    # Test 7: Content matching
    results['content_match'] = test_content_matching()

    # Summary
    print(f"\n\n{'='*80}")
    print("SUMMARY")
    print(f"{'='*80}")
    print(f"Paywall detection:       {'✅ PASS' if results['paywall'] else '❌ FAIL'}")
    print(f"Login detection:         {'✅ PASS' if results['login'] else '❌ FAIL'}")
    print(f"Preview-only detection:  {'✅ PASS' if results['preview'] else '❌ FAIL'}")
    print(f"Soft 404 detection:      {'✅ PASS' if results['soft_404'] else '❌ FAIL'}")
    print(f"Accessible PDF:          {'✅ PASS' if results['accessible_pdf'] else '❌ FAIL'}")
    print(f"Accessible HTML:         {'✅ PASS' if results['accessible_html'] else '❌ FAIL'}")
    print(f"Content matching:        {'✅ PASS' if results['content_match'] else '❌ FAIL'}")

    all_passed = all(results.values())

    print(f"\n{'='*80}")
    if all_passed:
        print("🎉 ALL TESTS PASSED! Pattern detection is working correctly.")
        print("\nKey validations:")
        print("✅ Paywall detection (score 50)")
        print("✅ Login wall detection (score 60)")
        print("✅ Preview-only detection (score 40)")
        print("✅ Soft 404 detection (score 0)")
        print("✅ Accessible content detection (score 90)")
        print("✅ Content matching verification")
    else:
        print("⚠️ Some tests failed. Review results above.")

    print(f"{'='*80}\n")

    return all_passed


if __name__ == '__main__':
    all_passed = main()
    sys.exit(0 if all_passed else 1)
