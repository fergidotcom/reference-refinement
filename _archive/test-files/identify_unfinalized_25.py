#!/usr/bin/env python3
"""
Identify first 25 unfinalized references from decisions.txt
"""

import re

def parse_decisions_file(filename):
    """Parse decisions.txt and extract unfinalized references"""
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()

    # Split into individual reference lines
    lines = content.strip().split('\n')

    unfinalized = []

    for line in lines:
        # Extract RID
        match = re.match(r'^\[(\d+)\]', line)
        if not match:
            continue

        rid = int(match.group(1))

        # Check if finalized
        is_finalized = 'FLAGS[FINALIZED' in line or 'FINALIZED]' in line

        if not is_finalized:
            unfinalized.append({
                'rid': rid,
                'line': line
            })

    # Sort by RID
    unfinalized.sort(key=lambda x: x['rid'])

    return unfinalized

def main():
    unfinalized = parse_decisions_file('decisions.txt')

    print(f"Total unfinalized references: {len(unfinalized)}")
    print(f"\nFirst 25 unfinalized references (by RID):")
    print("=" * 80)

    for i, ref in enumerate(unfinalized[:25], 1):
        # Extract title (simplified)
        title_match = re.search(r'\[(\d+)\]\s+([^.]+\..*?)(?:\s+Relevance:|$)', ref['line'])
        if title_match:
            title = title_match.group(2)[:100] + ('...' if len(title_match.group(2)) > 100 else '')
        else:
            title = ref['line'][:100]

        print(f"{i}. RID {ref['rid']}: {title}")

    print("\n" + "=" * 80)
    print(f"\nRID range: {unfinalized[0]['rid']} to {unfinalized[24]['rid']}")

    # Save full list to file
    with open('unfinalized_25_full.txt', 'w', encoding='utf-8') as f:
        for ref in unfinalized[:25]:
            f.write(f"{ref['line']}\n")

    print("\nFull references saved to: unfinalized_25_full.txt")

if __name__ == '__main__':
    main()
