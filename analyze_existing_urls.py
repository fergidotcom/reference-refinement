#!/usr/bin/env python3

"""
Analyze existing URLs in caught_in_the_act_decisions.txt

Extracts all PRIMARY and SECONDARY URLs and analyzes them for:
- Potential paywalls (based on domain)
- Missing secondaries
- URL quality indicators
- Recommendations for deep validation
"""

import re
from urllib.parse import urlparse
from collections import defaultdict
from typing import Dict, List, Tuple

# Known paywall domains (from deep_url_validation.py and user context)
PAYWALL_DOMAINS = [
    'jstor.org',
    'science.org',
    'sciencedirect.com',
    'springer.com',
    'springerlink.com',
    'wiley.com',
    'tandfonline.com',
    'sagepub.com',
    'cambridge.org',
    'oxfordjournals.org',
    'journals.uchicago.edu',
    'taylorfrancis.com',
    'emerald.com',
    'academic.oup.com',
]

# Free/open access domains
FREE_DOMAINS = [
    'archive.org',
    'arxiv.org',
    'researchgate.net',
    'academia.edu',
    'ssrn.com',
    'plos.org',
    'doi.org/10.1371',  # PLOS DOIs
    'ncbi.nlm.nih.gov',
    'europepmc.org',
]

def extract_domain(url: str) -> str:
    """Extract domain from URL"""
    try:
        parsed = urlparse(url)
        return parsed.netloc.lower().replace('www.', '')
    except:
        return ""

def classify_url(url: str) -> Tuple[str, str]:
    """
    Classify URL by type and accessibility

    Returns: (type, accessibility)
      type: 'paywall', 'free', 'unknown'
      accessibility: 'likely_free', 'likely_paywalled', 'uncertain', 'institutional'
    """
    domain = extract_domain(url)

    # Check if it's a known paywall
    for paywall_domain in PAYWALL_DOMAINS:
        if paywall_domain in domain:
            # Special case: institutional access
            if 'jstor.org' in domain or 'doi.org' in url:
                return ('paywall', 'institutional')
            return ('paywall', 'likely_paywalled')

    # Check if it's known free
    for free_domain in FREE_DOMAINS:
        if free_domain in domain:
            return ('free', 'likely_free')

    # Check for .edu domains (often free, but not always)
    if '.edu' in domain:
        return ('unknown', 'likely_free')

    # Check for .gov domains (usually free)
    if '.gov' in domain:
        return ('free', 'likely_free')

    # Check for publisher domains
    if any(x in domain for x in ['press', 'publisher', 'books', 'amazon', 'google.com/books']):
        return ('unknown', 'uncertain')

    return ('unknown', 'uncertain')

def analyze_urls(filepath: str):
    """Analyze all URLs in decisions.txt"""

    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    results = []
    url_stats = defaultdict(int)
    domain_counts = defaultdict(int)

    for i, line in enumerate(lines, 1):
        # Extract reference ID
        id_match = re.match(r'^\[(\d+)\]', line)
        if not id_match:
            continue

        ref_id = int(id_match.group(1))

        # Extract URLs
        primary_match = re.search(r'PRIMARY_URL\[(.*?)\]', line)
        secondary_match = re.search(r'SECONDARY_URL\[(.*?)\]', line)

        primary_url = primary_match.group(1) if primary_match else ""
        secondary_url = secondary_match.group(1) if secondary_match else ""

        # Extract title for context
        # Format: [ID] Author (YEAR). Title. ...
        title_match = re.search(r'\]\s+[^.]+\(\d{4}\)\.\s+([^.]+)', line)
        title = title_match.group(1) if title_match else ""

        # Classify URLs
        primary_type, primary_access = classify_url(primary_url) if primary_url else ("", "")
        secondary_type, secondary_access = classify_url(secondary_url) if secondary_url else ("", "")

        # Record result
        result = {
            'id': ref_id,
            'title': title[:60],
            'primary_url': primary_url,
            'secondary_url': secondary_url,
            'primary_domain': extract_domain(primary_url),
            'secondary_domain': extract_domain(secondary_url),
            'primary_type': primary_type,
            'primary_access': primary_access,
            'secondary_type': secondary_type,
            'secondary_access': secondary_access,
        }

        results.append(result)

        # Update statistics
        if primary_url:
            url_stats['has_primary'] += 1
            url_stats[f'primary_{primary_access}'] += 1
            domain_counts[result['primary_domain']] += 1

        if secondary_url:
            url_stats['has_secondary'] += 1
            url_stats[f'secondary_{secondary_access}'] += 1
        else:
            url_stats['missing_secondary'] += 1

    return results, url_stats, domain_counts

def generate_report(results: List[Dict], url_stats: Dict, domain_counts: Dict):
    """Generate comprehensive analysis report"""

    print("="*80)
    print("URL ANALYSIS REPORT - Deep Validation Assessment")
    print("="*80)
    print()

    # Overall statistics
    print("OVERALL STATISTICS")
    print("-"*80)
    print(f"Total references analyzed: {len(results)}")
    print(f"References with PRIMARY URL: {url_stats['has_primary']}")
    print(f"References with SECONDARY URL: {url_stats['has_secondary']}")
    print(f"Missing SECONDARY URLs: {url_stats['missing_secondary']}")
    print()

    # Accessibility breakdown
    print("PRIMARY URL ACCESSIBILITY ASSESSMENT")
    print("-"*80)
    print(f"Likely FREE: {url_stats.get('primary_likely_free', 0)} "
          f"({url_stats.get('primary_likely_free', 0)/len(results)*100:.1f}%)")
    print(f"Likely PAYWALLED: {url_stats.get('primary_likely_paywalled', 0)} "
          f"({url_stats.get('primary_likely_paywalled', 0)/len(results)*100:.1f}%)")
    print(f"Institutional access: {url_stats.get('primary_institutional', 0)} "
          f"({url_stats.get('primary_institutional', 0)/len(results)*100:.1f}%)")
    print(f"Uncertain: {url_stats.get('primary_uncertain', 0)} "
          f"({url_stats.get('primary_uncertain', 0)/len(results)*100:.1f}%)")
    print()

    print("SECONDARY URL ACCESSIBILITY ASSESSMENT")
    print("-"*80)
    print(f"Likely FREE: {url_stats.get('secondary_likely_free', 0)} "
          f"({url_stats.get('secondary_likely_free', 0)/url_stats['has_secondary']*100:.1f}% of those with secondaries)")
    print(f"Likely PAYWALLED: {url_stats.get('secondary_likely_paywalled', 0)} "
          f"({url_stats.get('secondary_likely_paywalled', 0)/url_stats['has_secondary']*100:.1f}% of those with secondaries)")
    print()

    # Top domains
    print("TOP 15 PRIMARY URL DOMAINS")
    print("-"*80)
    sorted_domains = sorted(domain_counts.items(), key=lambda x: x[1], reverse=True)
    for domain, count in sorted_domains[:15]:
        # Check if it's a paywall domain
        is_paywall = any(pd in domain for pd in PAYWALL_DOMAINS)
        is_free = any(fd in domain for fd in FREE_DOMAINS)

        marker = "💰" if is_paywall else ("✅" if is_free else "❓")
        print(f"{marker} {domain}: {count} ({count/len(results)*100:.1f}%)")
    print()

    # High-priority validation targets
    print("="*80)
    print("HIGH-PRIORITY VALIDATION TARGETS")
    print("="*80)
    print()

    # Paywalled primaries
    paywalled_primaries = [r for r in results if r['primary_access'] in ['likely_paywalled', 'institutional']]

    print(f"PAYWALLED PRIMARY URLs: {len(paywalled_primaries)}")
    print("-"*80)
    print("These references have PRIMARY URLs on known paywall domains.")
    print("Deep validation needed to verify if actually accessible or needs free alternative.\n")

    for ref in paywalled_primaries[:10]:
        print(f"[{ref['id']}] {ref['title']}...")
        print(f"    PRIMARY: {ref['primary_domain']}")
        print(f"    URL: {ref['primary_url'][:70]}...")
        print()

    if len(paywalled_primaries) > 10:
        print(f"... and {len(paywalled_primaries) - 10} more\n")

    # Missing secondaries
    missing_secondaries = [r for r in results if not r['secondary_url']]

    print(f"MISSING SECONDARY URLs: {len(missing_secondaries)}")
    print("-"*80)
    print("These references lack backup URLs.\n")

    for ref in missing_secondaries[:10]:
        print(f"[{ref['id']}] {ref['title']}...")
        print(f"    PRIMARY: {ref['primary_domain']}")
        print()

    if len(missing_secondaries) > 10:
        print(f"... and {len(missing_secondaries) - 10} more\n")

    # Recommendations
    print("="*80)
    print("RECOMMENDATIONS FOR DEEP VALIDATION")
    print("="*80)
    print()

    print("1. IMMEDIATE PRIORITY - Validate paywalled primaries:")
    print(f"   {len(paywalled_primaries)} references with paywall domains")
    print("   Action: Run deep validation to check actual accessibility")
    print("   Goal: Replace paywalled URLs with free alternatives")
    print()

    print("2. HIGH PRIORITY - Find missing secondaries:")
    print(f"   {len(missing_secondaries)} references without backup URLs")
    print("   Action: Search for and validate secondary sources")
    print("   Goal: Achieve 100% secondary URL coverage")
    print()

    print("3. MEDIUM PRIORITY - Validate uncertain URLs:")
    uncertain = sum(1 for r in results if r['primary_access'] == 'uncertain')
    print(f"   {uncertain} references with uncertain accessibility")
    print("   Action: Deep validation to confirm accessibility")
    print()

    print("4. QUALITY ASSURANCE - Validate all 288 references:")
    print("   Comprehensive deep validation of entire dataset")
    print("   Action: Full validation run with accessibility scoring")
    print("   Goal: Ensure every URL is actually accessible")
    print()

    return paywalled_primaries, missing_secondaries

if __name__ == '__main__':
    filepath = 'caught_in_the_act_decisions.txt'

    print("Analyzing URLs in caught_in_the_act_decisions.txt...\n")

    results, url_stats, domain_counts = analyze_urls(filepath)
    paywalled, missing = generate_report(results, url_stats, domain_counts)

    print("="*80)
    print(f"Analysis complete: {len(results)} references processed")
    print("="*80)
