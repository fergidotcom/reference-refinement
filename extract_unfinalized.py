#!/usr/bin/env python3
"""
Extract unfinalized references from decisions file
"""

import re

def extract_unfinalized(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Split by reference ID
    pattern = r'\[(\d+)\]\s+(.*?)(?=\n\[|$)'
    matches = re.findall(pattern, content, re.DOTALL)

    unfinalized = []
    finalized = []

    for ref_id, ref_content in matches:
        is_finalized = 'FLAGS[FINALIZED' in ref_content

        # Extract URLs if present
        primary = re.search(r'PRIMARY_URL\[(.*?)\]', ref_content)
        secondary = re.search(r'SECONDARY_URL\[(.*?)\]', ref_content)

        ref_data = {
            'id': int(ref_id),
            'content': f'[{ref_id}] {ref_content}',
            'first_line': ref_content.split('\n')[0].strip(),
            'is_finalized': is_finalized,
            'has_primary': primary is not None,
            'has_secondary': secondary is not None,
            'primary_url': primary.group(1) if primary else '',
            'secondary_url': secondary.group(1) if secondary else '',
        }

        if is_finalized:
            finalized.append(ref_data)
        else:
            unfinalized.append(ref_data)

    return unfinalized, finalized

if __name__ == '__main__':
    filepath = 'decisions_backup_pre_web_session_2025_11_11.txt'

    unfinalized, finalized = extract_unfinalized(filepath)

    print(f"Total references: {len(unfinalized) + len(finalized)}")
    print(f"Finalized: {len(finalized)}")
    print(f"Unfinalized: {len(unfinalized)}")
    print()

    print("UNFINALIZED REFERENCES:")
    print("="*80)

    # Categorize unfinalized
    with_urls = [r for r in unfinalized if r['has_primary']]
    without_urls = [r for r in unfinalized if not r['has_primary']]

    print(f"\nWith PRIMARY URLs (just needs finalization): {len(with_urls)}")
    print(f"Without PRIMARY URLs (needs URL assignment): {len(without_urls)}")
    print()

    print("Unfinalized WITH URLs (first 10):")
    for ref in with_urls[:10]:
        print(f"  [{ref['id']}] {ref['first_line'][:70]}...")
        print(f"       PRIMARY: {ref['primary_url'][:60]}...")
        print()

    print(f"\nUnfinalized WITHOUT URLs (first 10):")
    for ref in without_urls[:10]:
        print(f"  [{ref['id']}] {ref['first_line'][:70]}...")
        print()

    # Save full list to file
    with open('unfinalized_refs.txt', 'w') as f:
        f.write(f"UNFINALIZED REFERENCES: {len(unfinalized)}\n")
        f.write("="*80 + "\n\n")

        f.write(f"WITH URLs ({len(with_urls)}):\n")
        f.write("-"*80 + "\n")
        for ref in with_urls:
            f.write(f"[{ref['id']}]\n")
            f.write(f"  {ref['first_line']}\n")
            f.write(f"  PRIMARY: {ref['primary_url']}\n")
            if ref['has_secondary']:
                f.write(f"  SECONDARY: {ref['secondary_url']}\n")
            f.write("\n")

        f.write(f"\nWITHOUT URLs ({len(without_urls)}):\n")
        f.write("-"*80 + "\n")
        for ref in without_urls:
            f.write(f"[{ref['id']}]\n")
            f.write(f"  {ref['first_line']}\n\n")

    print(f"\nFull list saved to: unfinalized_refs.txt")
