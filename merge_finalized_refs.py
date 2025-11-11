#!/usr/bin/env python3

"""
Merge finalized references back into complete decisions.txt

Replaces unfinalized references with WEB_V17_0 finalized versions
"""

import re
from datetime import datetime

def extract_ref_id(line: str) -> int:
    """Extract reference ID from line"""
    match = re.match(r'^\[(\d+)\]', line)
    return int(match.group(1)) if match else None

def merge_files():
    """Merge finalized refs into backup file"""

    print("="*80)
    print("MERGING FINALIZED REFERENCES")
    print("="*80)
    print()

    # Read backup file (all 288 refs)
    with open('decisions_backup_pre_web_session_2025_11_11.txt', 'r', encoding='utf-8') as f:
        backup_lines = f.readlines()

    # Read finalized refs (139 refs)
    with open('finalized_refs_v17_0.txt', 'r', encoding='utf-8') as f:
        finalized_lines = f.readlines()

    print(f"📋 Loaded {len(backup_lines)} lines from backup")
    print(f"✅ Loaded {len(finalized_lines)} finalized references")
    print()

    # Create lookup of finalized refs by ID
    finalized_by_id = {}
    for line in finalized_lines:
        ref_id = extract_ref_id(line)
        if ref_id:
            finalized_by_id[ref_id] = line

    print(f"📇 Created lookup for {len(finalized_by_id)} finalized references")
    print()

    # Process backup file, replacing unfinalized refs
    output_lines = []
    replaced_count = 0
    kept_count = 0

    for line in backup_lines:
        ref_id = extract_ref_id(line)

        if ref_id and ref_id in finalized_by_id:
            # Replace with finalized version
            output_lines.append(finalized_by_id[ref_id])
            replaced_count += 1
        else:
            # Keep original
            output_lines.append(line)
            kept_count += 1

    print(f"✅ Replaced {replaced_count} unfinalized references")
    print(f"✅ Kept {kept_count} already-finalized references")
    print(f"📊 Total: {len(output_lines)} references")
    print()

    # Write updated file
    output_file = 'decisions.txt'
    with open(output_file, 'w', encoding='utf-8') as f:
        f.writelines(output_lines)

    print(f"💾 Wrote updated decisions.txt ({len(output_lines)} references)")
    print()

    # Verify
    verify_file(output_file)

    return output_lines

def verify_file(filepath: str):
    """Verify the merged file"""

    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    total = len(lines)
    finalized = sum(1 for line in lines if 'FLAGS[FINALIZED' in line)
    web_v17 = sum(1 for line in lines if 'WEB_V17_0' in line)

    print("="*80)
    print("VERIFICATION")
    print("="*80)
    print()
    print(f"Total references: {total}")
    print(f"Finalized: {finalized} ({finalized/total*100:.1f}%)")
    print(f"WEB_V17_0 flagged: {web_v17} ({web_v17/total*100:.1f}%)")
    print()

    if finalized == total:
        print("✅ SUCCESS: All references are finalized!")
    else:
        print(f"⚠️  WARNING: {total - finalized} references still unfinalized")

    print()

if __name__ == '__main__':
    merge_files()

    print("="*80)
    print("✅ MERGE COMPLETE")
    print("="*80)
    print()
    print("Updated file: decisions.txt")
    print("Ready to commit and push!")
    print()
