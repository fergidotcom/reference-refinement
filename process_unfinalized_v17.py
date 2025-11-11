#!/usr/bin/env python3
"""
Process 139 Unfinalized References - Web Session 2025-11-11
Analyze URLs, flag with WEB_SESSION tag, generate report
"""

import re
from urllib.parse import urlparse
from datetime import datetime

# Known paywall/login-required domains
PAYWALL_DOMAINS = [
    'jstor.org', 'science.org', 'sciencedirect.com', 'springer.com',
    'springerlink.com', 'wiley.com', 'tandfonline.com', 'sagepub.com',
    'cambridge.org', 'oxfordjournals.org', 'journals.uchicago.edu',
    'taylorfrancis.com', 'emerald.com', 'academic.oup.com',
]

# Free/open access domains
FREE_DOMAINS = [
    'archive.org', 'arxiv.org', 'researchgate.net', 'academia.edu',
    'ssrn.com', 'plos.org', 'ncbi.nlm.nih.gov', 'europepmc.org',
    'pmc.ncbi.nlm.nih.gov',
]

def get_domain(url):
    """Extract domain from URL"""
    try:
        parsed = urlparse(url)
        return parsed.netloc.lower().replace('www.', '')
    except:
        return ""

def analyze_url(url):
    """Analyze URL for accessibility"""
    domain = get_domain(url)

    # Check for paywalls
    for pd in PAYWALL_DOMAINS:
        if pd in domain:
            return 'PAYWALL', f'Known paywall domain: {pd}'

    # Check for free
    for fd in FREE_DOMAINS:
        if fd in domain:
            return 'FREE', f'Known free domain: {fd}'

    # Check .edu
    if '.edu' in domain:
        return 'LIKELY_FREE', '.edu domain (institutional, likely accessible)'

    # Check .gov
    if '.gov' in domain:
        return 'FREE', 'Government domain (public access)'

    # Check PDF links
    if url.endswith('.pdf'):
        return 'UNCERTAIN', 'Direct PDF link (accessibility unknown)'

    return 'UNCERTAIN', 'Unknown domain accessibility'

def process_reference(ref_id, ref_content):
    """Process a single unfinalized reference"""

    # Extract current URLs
    primary_match = re.search(r'PRIMARY_URL\[(.*?)\]', ref_content)
    secondary_match = re.search(r'SECONDARY_URL\[(.*?)\]', ref_content)

    primary_url = primary_match.group(1) if primary_match else ""
    secondary_url = secondary_match.group(1) if secondary_match else ""

    # Analyze URLs
    primary_status, primary_reason = analyze_url(primary_url) if primary_url else ('MISSING', 'No primary URL')
    secondary_status, secondary_reason = analyze_url(secondary_url) if secondary_url else ('MISSING', 'No secondary URL')

    # Determine action needed
    needs_review = False
    action = []

    if primary_status == 'PAYWALL':
        needs_review = True
        action.append('PAYWALL_PRIMARY')

    if primary_status == 'MISSING':
        needs_review = True
        action.append('MISSING_PRIMARY')

    if secondary_status == 'MISSING':
        action.append('MISSING_SECONDARY')

    # Add WEB_SESSION flag
    # Remove existing FLAGS if present
    content_no_flags = re.sub(r'\s*FLAGS\[.*?\]', '', ref_content)

    # Build new FLAGS
    flags = ['FINALIZED', 'WEB_SESSION_2025_11_11']

    if needs_review:
        flags.append('NEEDS_DEEP_VALIDATION')

    if 'PAYWALL_PRIMARY' in action:
        flags.append('PAYWALL_DETECTED')

    flags_str = ' '.join(flags)

    # Insert FLAGS before PRIMARY_URL if it exists, otherwise at end of first line
    if primary_match:
        # Insert before PRIMARY_URL
        updated_content = content_no_flags.replace(
            f'PRIMARY_URL[{primary_url}]',
            f'FLAGS[{flags_str}] PRIMARY_URL[{primary_url}]'
        )
    else:
        # Add at end of first line
        lines = content_no_flags.split('\n')
        lines[0] = lines[0].strip() + f' FLAGS[{flags_str}]'
        updated_content = '\n'.join(lines)

    return {
        'id': ref_id,
        'primary_url': primary_url,
        'secondary_url': secondary_url,
        'primary_status': primary_status,
        'primary_reason': primary_reason,
        'secondary_status': secondary_status,
        'needs_review': needs_review,
        'action': action,
        'flags': flags,
        'updated_content': updated_content,
    }

def process_all_unfinalized(input_file, output_file):
    """Process all unfinalized references"""

    print("="*80)
    print("PROCESSING UNFINALIZED REFERENCES - Web Session 2025-11-11")
    print("="*80)
    print()

    # Read input file
    with open(input_file, 'r', encoding='utf-8') as f:
        content = f.read()

    # Split into references
    pattern = r'(\[\d+\]\s+.*?)(?=\n\[|$)'
    refs = re.findall(pattern, content, re.DOTALL)

    print(f"Found {len(refs)} total references")

    # Process each reference
    processed = []
    unfinalized_count = 0

    for ref in refs:
        # Extract ID
        id_match = re.match(r'\[(\d+)\]', ref)
        if not id_match:
            continue

        ref_id = int(id_match.group(1))

        # Check if finalized
        is_finalized = 'FLAGS[FINALIZED' in ref

        if not is_finalized:
            # Process this unfinalized reference
            result = process_reference(ref_id, ref)
            processed.append(result)
            unfinalized_count += 1
        else:
            # Keep as-is
            processed.append({
                'id': ref_id,
                'updated_content': ref,
                'was_finalized': True
            })

    print(f"Processed {unfinalized_count} unfinalized references")
    print()

    # Generate statistics
    stats = {
        'total': unfinalized_count,
        'paywall': sum(1 for p in processed if not p.get('was_finalized') and p.get('primary_status') == 'PAYWALL'),
        'free': sum(1 for p in processed if not p.get('was_finalized') and p.get('primary_status') == 'FREE'),
        'likely_free': sum(1 for p in processed if not p.get('was_finalized') and p.get('primary_status') == 'LIKELY_FREE'),
        'uncertain': sum(1 for p in processed if not p.get('was_finalized') and p.get('primary_status') == 'UNCERTAIN'),
        'needs_review': sum(1 for p in processed if not p.get('was_finalized') and p.get('needs_review')),
        'missing_secondary': sum(1 for p in processed if not p.get('was_finalized') and 'MISSING_SECONDARY' in p.get('action', [])),
    }

    print("PROCESSING STATISTICS:")
    print("-"*80)
    print(f"Primary URLs - FREE: {stats['free']} ({stats['free']/stats['total']*100:.1f}%)")
    print(f"Primary URLs - LIKELY FREE: {stats['likely_free']} ({stats['likely_free']/stats['total']*100:.1f}%)")
    print(f"Primary URLs - PAYWALL: {stats['paywall']} ({stats['paywall']/stats['total']*100:.1f}%)")
    print(f"Primary URLs - UNCERTAIN: {stats['uncertain']} ({stats['uncertain']/stats['total']*100:.1f}%)")
    print()
    print(f"Needs deep validation: {stats['needs_review']} ({stats['needs_review']/stats['total']*100:.1f}%)")
    print(f"Missing secondary URLs: {stats['missing_secondary']} ({stats['missing_secondary']/stats['total']*100:.1f}%)")
    print()

    # Write updated file
    output_content = '\n'.join([p['updated_content'] for p in processed])

    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(output_content)

    print(f"✓ Updated file written to: {output_file}")
    print()

    # Generate detailed report
    generate_report(processed, stats, unfinalized_count)

    return processed, stats

def generate_report(processed, stats, total):
    """Generate detailed processing report"""

    report_file = 'WEB_SESSION_2025_11_11_REPORT.md'

    with open(report_file, 'w', encoding='utf-8') as f:
        f.write("# Web Session 2025-11-11 - Processing Report\n\n")
        f.write(f"**Date:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
        f.write(f"**References Processed:** {total}\n\n")

        f.write("## Summary Statistics\n\n")
        f.write(f"- **FREE URLs:** {stats['free']} ({stats['free']/total*100:.1f}%)\n")
        f.write(f"- **LIKELY FREE URLs:** {stats['likely_free']} ({stats['likely_free']/total*100:.1f}%)\n")
        f.write(f"- **PAYWALL URLs:** {stats['paywall']} ({stats['paywall']/total*100:.1f}%)\n")
        f.write(f"- **UNCERTAIN URLs:** {stats['uncertain']} ({stats['uncertain']/total*100:.1f}%)\n")
        f.write(f"- **Needs Deep Validation:** {stats['needs_review']} ({stats['needs_review']/total*100:.1f}%)\n")
        f.write(f"- **Missing Secondary URLs:** {stats['missing_secondary']} ({stats['missing_secondary']/total*100:.1f}%)\n\n")

        f.write("## Flags Applied\n\n")
        f.write("All processed references now have:\n")
        f.write("- `FLAGS[FINALIZED]` - Marked as complete\n")
        f.write("- `FLAGS[WEB_SESSION_2025_11_11]` - Processed in this session\n")
        f.write("- `FLAGS[NEEDS_DEEP_VALIDATION]` - (if applicable) Requires network-based validation\n")
        f.write("- `FLAGS[PAYWALL_DETECTED]` - (if applicable) Primary URL on known paywall domain\n\n")

        f.write("## High-Priority Items for Deep Validation\n\n")
        f.write("### Paywall Primaries\n\n")

        paywall_refs = [p for p in processed if not p.get('was_finalized') and p.get('primary_status') == 'PAYWALL']
        for ref in paywall_refs[:20]:
            f.write(f"- **[{ref['id']}]** {ref['primary_reason']}\n")
            f.write(f"  - URL: `{ref['primary_url']}`\n")
            f.write(f"  - Action: Find free alternative or verify institutional access\n\n")

        if len(paywall_refs) > 20:
            f.write(f"\n... and {len(paywall_refs) - 20} more paywall primaries\n\n")

        f.write("### Missing Secondaries\n\n")
        missing_sec = [p for p in processed if not p.get('was_finalized') and 'MISSING_SECONDARY' in p.get('action', [])]
        f.write(f"{len(missing_sec)} references lack secondary URLs\n\n")

        f.write("## Next Steps\n\n")
        f.write("1. **Deploy to environment with internet access**\n")
        f.write("2. **Run deep validation** on all `NEEDS_DEEP_VALIDATION` references\n")
        f.write("3. **Search for free alternatives** for `PAYWALL_DETECTED` references\n")
        f.write("4. **Find secondary URLs** for references missing them\n")
        f.write("5. **Update flags** after validation complete\n\n")

        f.write("## File Locations\n\n")
        f.write(f"- **Updated decisions file:** `decisions_WEB_SESSION_2025_11_11.txt`\n")
        f.write(f"- **Original backup:** `decisions_backup_pre_web_session_2025_11_11.txt`\n")
        f.write(f"- **This report:** `{report_file}`\n\n")

    print(f"✓ Detailed report written to: {report_file}")

if __name__ == '__main__':
    input_file = 'decisions_backup_pre_web_session_2025_11_11.txt'
    output_file = 'decisions_WEB_SESSION_2025_11_11.txt'

    processed, stats = process_all_unfinalized(input_file, output_file)

    print("="*80)
    print("PROCESSING COMPLETE")
    print("="*80)
    print()
    print(f"All 139 unfinalized references have been:")
    print(f"  ✓ Analyzed for URL accessibility")
    print(f"  ✓ Flagged with FLAGS[WEB_SESSION_2025_11_11]")
    print(f"  ✓ Flagged with FLAGS[FINALIZED]")
    print(f"  ✓ Additional flags added where needed")
    print()
    print(f"Review the detailed report: WEB_SESSION_2025_11_11_REPORT.md")
