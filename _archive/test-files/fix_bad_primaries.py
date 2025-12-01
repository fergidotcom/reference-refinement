#!/usr/bin/env python3
"""
Fix the 3 references that got review articles as primaries
"""

import json
import re

# Load the search log to get the candidate list
with open('SAMPLE25_progress.json', 'r') as f:
    data = json.load(f)

# Load current decisions.txt
with open('decisions.txt', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Parse into refs
refs = {}
for line in lines:
    match = re.match(r'^\[(\d+)\]', line.strip())
    if match:
        rid = int(match.group(1))
        refs[rid] = line.strip()

# Find the problematic references in search log
fixes = {
    611: None,  # Veblen - should be archive.org book
    613: None,  # Statista - should be actual data
    635: None   # Fuchs - should be actual book
}

for entry in data['search_log']:
    if entry['step'] == 'scoring' and entry['rid'] in fixes:
        rid = entry['rid']
        candidates = entry['primary_scores']

        print(f"\n{'='*80}")
        print(f"RID {rid} - Top 5 candidates:")
        print('='*80)

        for i, c in enumerate(candidates[:5], 1):
            print(f"{i}. Score: {c['score']}/100")
            print(f"   URL: {c['url']}")
            print(f"   Title: {c['title'][:80]}...")
            print()

        # Ask which to use
        print(f"Current (wrong): {entry['selected_primary']['url']}")

# Manual fixes based on analysis
manual_fixes = {
    611: {
        'old_primary': 'https://www.jstor.org/stable/20024186',
        'new_primary': 'https://archive.org/download/theoryofleisurec01vebl/theoryofleisurec01vebl.pdf',
        'reason': 'Archive.org PDF is the actual book, not a review'
    },
    613: {
        'old_primary': 'https://pmc.ncbi.nlm.nih.gov/articles/PMC12343085/',
        'new_primary': 'https://www.statista.com/statistics/272014/global-social-networks-ranked-by-number-of-users/',
        'reason': 'Original Statista URL is the actual data report'
    },
    635: {
        'old_primary': 'https://cinema.usc.edu/spectator/35.2/9_Bohrod.pdf',
        'new_primary': 'https://fuchsc.net/wp-content/uploads/CF_value.pdf',
        'reason': 'Original Fuchs URL is the actual work, not book review'
    }
}

print("\n" + "="*80)
print("APPLYING MANUAL FIXES")
print("="*80)

fixed_lines = []
for rid, line in sorted(refs.items()):
    if rid in manual_fixes:
        fix = manual_fixes[rid]

        # Replace the PRIMARY_URL
        new_line = re.sub(
            r'PRIMARY_URL\[' + re.escape(fix['old_primary']) + r'\]',
            f"PRIMARY_URL[{fix['new_primary']}]",
            line
        )

        print(f"\nRID {rid}:")
        print(f"  OLD: {fix['old_primary'][:60]}...")
        print(f"  NEW: {fix['new_primary'][:60]}...")
        print(f"  Reason: {fix['reason']}")

        fixed_lines.append(new_line)
    else:
        fixed_lines.append(line)

# Write fixed file
with open('decisions_fixed_primaries.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(fixed_lines))

print("\n" + "="*80)
print("✅ Fixed file created: decisions_fixed_primaries.txt")
print("="*80)
print("\nTo deploy: cp decisions_fixed_primaries.txt decisions.txt")
