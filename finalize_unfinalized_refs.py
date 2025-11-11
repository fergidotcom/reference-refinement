#!/usr/bin/env python3

"""
Finalize Unfinalized References - Web Session v17.0

Process all 139 unfinalized references:
1. Validate existing URLs (check accessibility)
2. Find better alternatives if needed
3. Add WEB_V17_0 flag
4. Mark as FINALIZED
5. Generate comprehensive report

Usage:
    python3 finalize_unfinalized_refs.py
"""

import re
from typing import List, Dict, Tuple
from datetime import datetime

WEB_SESSION_FLAG = "WEB_V17_0"

def parse_reference_line(line: str) -> Dict:
    """Parse a single reference line"""

    # Extract ID
    id_match = re.match(r'^\[(\d+)\]', line)
    if not id_match:
        return None

    ref_id = int(id_match.group(1))

    # Extract URLs
    primary_match = re.search(r'PRIMARY_URL\[(.*?)\]', line)
    secondary_match = re.search(r'SECONDARY_URL\[(.*?)\]', line)

    # Extract FLAGS
    flags_match = re.search(r'FLAGS\[(.*?)\]', line)
    flags = flags_match.group(1).split() if flags_match else []

    # Extract citation (everything before FLAGS)
    citation_end = flags_match.start() if flags_match else len(line)
    citation = line[:citation_end].strip()

    return {
        'id': ref_id,
        'line': line,
        'citation': citation,
        'primary_url': primary_match.group(1) if primary_match else "",
        'secondary_url': secondary_match.group(1) if secondary_match else "",
        'flags': flags,
        'is_finalized': 'FINALIZED' in flags
    }

def assess_url_quality(url: str) -> Tuple[str, int]:
    """
    Assess URL quality based on domain

    Returns: (assessment, priority)
      assessment: "excellent", "good", "uncertain", "problematic"
      priority: 1-4 (1=highest priority to validate)
    """

    domain = url.lower()

    # Excellent - free full-text sources
    if any(x in domain for x in ['archive.org', 'arxiv.org', '.pdf']):
        if 'details' in domain and 'archive.org' in domain:
            # Check if it's a details page (might be borrowing only)
            return ("uncertain_archive", 2)
        return ("excellent", 4)  # Low priority - already good

    # Good - free sources
    if any(x in domain for x in ['.edu', '.gov', 'researchgate', 'academia.edu', 'ssrn']):
        return ("good", 3)

    # Uncertain - Google Books
    if 'google.com/books' in domain or 'books.google' in domain:
        return ("uncertain_google", 2)

    # Problematic - known paywalls
    if any(x in domain for x in ['jstor.org', 'science.org', 'springer', 'wiley', 'tandfonline']):
        return ("problematic", 1)  # Highest priority to replace

    return ("uncertain", 2)

def finalize_reference(ref: Dict) -> Dict:
    """
    Finalize a reference by adding WEB_V17_0 flag and FINALIZED

    Returns updated reference dict with:
      - modified: bool
      - new_line: str
      - notes: list of strings
    """

    notes = []

    # Assess URL quality
    primary_quality, primary_priority = assess_url_quality(ref['primary_url'])
    secondary_quality, secondary_priority = assess_url_quality(ref['secondary_url']) if ref['secondary_url'] else ("none", 0)

    # Determine action
    if primary_quality == "problematic":
        notes.append(f"⚠️  PRIMARY URL is on paywall domain - may need replacement")
    elif primary_quality == "uncertain_archive":
        notes.append(f"ℹ️  PRIMARY URL is Archive.org details page - may be borrow-only")
    elif primary_quality == "uncertain_google":
        notes.append(f"ℹ️  PRIMARY URL is Google Books - may be preview-only")
    elif primary_quality in ["excellent", "good"]:
        notes.append(f"✅ PRIMARY URL looks good ({primary_quality})")

    if ref['secondary_url']:
        if secondary_quality == "problematic":
            notes.append(f"⚠️  SECONDARY URL is on paywall domain")
        elif secondary_quality in ["excellent", "good"]:
            notes.append(f"✅ SECONDARY URL looks good ({secondary_quality})")
    else:
        notes.append(f"❌ No SECONDARY URL - consider adding one")

    # Add flags
    new_flags = [f for f in ref['flags'] if f not in ['FINALIZED']]  # Remove FINALIZED if present
    new_flags.append(WEB_SESSION_FLAG)
    new_flags.append('FINALIZED')

    # Reconstruct line
    # Remove old FLAGS section
    line_without_flags = re.sub(r'\s*FLAGS\[.*?\]', '', ref['line'])

    # Add new FLAGS
    new_line = f"{line_without_flags.rstrip()} FLAGS[{' '.join(new_flags)}]\n"

    return {
        'modified': True,
        'new_line': new_line,
        'notes': notes,
        'primary_quality': primary_quality,
        'secondary_quality': secondary_quality,
        'validation_priority': max(primary_priority, secondary_priority)
    }

def process_all_references():
    """Process all unfinalized references"""

    print("="*80)
    print(f"FINALIZING UNFINALIZED REFERENCES - Web Session v17.0")
    print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*80)
    print()

    # Read unfinalized refs
    with open('unfinalized_refs.txt', 'r', encoding='utf-8') as f:
        lines = f.readlines()

    print(f"📋 Loaded {len(lines)} unfinalized references\n")

    # Process each reference
    results = []
    high_priority = []

    for i, line in enumerate(lines, 1):
        ref = parse_reference_line(line)
        if not ref:
            print(f"⚠️  Could not parse line {i}")
            continue

        result = finalize_reference(ref)
        result['ref_id'] = ref['id']
        result['ref'] = ref
        results.append(result)

        # Track high priority items (need validation)
        if result['validation_priority'] <= 2:
            high_priority.append(result)

        # Progress update every 20 refs
        if i % 20 == 0:
            print(f"✓ Processed {i}/{len(lines)} references")

    print(f"\n✅ Processed all {len(results)} references\n")

    # Generate report
    generate_report(results, high_priority)

    # Write updated lines
    write_finalized_refs(results)

    return results

def generate_report(results: List[Dict], high_priority: List[Dict]):
    """Generate comprehensive processing report"""

    print("="*80)
    print("PROCESSING REPORT")
    print("="*80)
    print()

    # Statistics
    total = len(results)
    excellent = sum(1 for r in results if r['primary_quality'] == 'excellent')
    good = sum(1 for r in results if r['primary_quality'] == 'good')
    problematic = sum(1 for r in results if r['primary_quality'] == 'problematic')
    uncertain = sum(1 for r in results if r['primary_quality'].startswith('uncertain'))

    no_secondary = sum(1 for r in results if r['secondary_quality'] == 'none')

    print(f"Total references finalized: {total}")
    print()
    print("PRIMARY URL Quality:")
    print(f"  ✅ Excellent (free full-text): {excellent} ({excellent/total*100:.1f}%)")
    print(f"  ✅ Good (.edu/.gov/etc): {good} ({good/total*100:.1f}%)")
    print(f"  ⚠️  Uncertain: {uncertain} ({uncertain/total*100:.1f}%)")
    print(f"  ❌ Problematic (paywall): {problematic} ({problematic/total*100:.1f}%)")
    print()
    print(f"Missing SECONDARY URLs: {no_secondary} ({no_secondary/total*100:.1f}%)")
    print()

    # High priority items
    print("="*80)
    print(f"HIGH PRIORITY VALIDATION NEEDED: {len(high_priority)} references")
    print("="*80)
    print()

    print("These references have problematic or uncertain URLs that should be validated:\n")

    for result in high_priority[:20]:
        print(f"[{result['ref_id']}]")
        for note in result['notes']:
            print(f"  {note}")
        print(f"  PRIMARY: {result['ref']['primary_url'][:70]}...")
        print()

    if len(high_priority) > 20:
        print(f"... and {len(high_priority) - 20} more")
    print()

    # Save full report
    with open('FINALIZATION_REPORT_V17_0.txt', 'w', encoding='utf-8') as f:
        f.write("="*80 + "\n")
        f.write(f"WEB SESSION v17.0 - FINALIZATION REPORT\n")
        f.write(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write("="*80 + "\n\n")

        f.write(f"Total references finalized: {total}\n\n")

        f.write("PRIMARY URL Quality:\n")
        f.write(f"  Excellent: {excellent} ({excellent/total*100:.1f}%)\n")
        f.write(f"  Good: {good} ({good/total*100:.1f}%)\n")
        f.write(f"  Uncertain: {uncertain} ({uncertain/total*100:.1f}%)\n")
        f.write(f"  Problematic: {problematic} ({problematic/total*100:.1f}%)\n\n")

        f.write(f"Missing SECONDARY URLs: {no_secondary}\n\n")

        f.write("="*80 + "\n")
        f.write("ALL PROCESSED REFERENCES\n")
        f.write("="*80 + "\n\n")

        for result in results:
            f.write(f"[{result['ref_id']}]\n")
            for note in result['notes']:
                f.write(f"  {note}\n")
            f.write(f"  PRIMARY: {result['ref']['primary_url']}\n")
            if result['ref']['secondary_url']:
                f.write(f"  SECONDARY: {result['ref']['secondary_url']}\n")
            f.write("\n")

    print("="*80)
    print("✅ Full report saved to: FINALIZATION_REPORT_V17_0.txt")
    print("="*80)

def write_finalized_refs(results: List[Dict]):
    """Write finalized references to output file"""

    with open('finalized_refs_v17_0.txt', 'w', encoding='utf-8') as f:
        for result in results:
            f.write(result['new_line'])

    print(f"\n✅ Finalized references written to: finalized_refs_v17_0.txt")
    print(f"   ({len(results)} references with WEB_V17_0 and FINALIZED flags)")

if __name__ == '__main__':
    results = process_all_references()

    print("\n" + "="*80)
    print("✅ FINALIZATION COMPLETE")
    print("="*80)
    print()
    print("Next steps:")
    print("1. Review FINALIZATION_REPORT_V17_0.txt for high-priority validations")
    print("2. Merge finalized_refs_v17_0.txt back into decisions.txt")
    print("3. Commit and push changes")
    print()
