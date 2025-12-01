#!/usr/bin/env python3
"""
Analyze URL changes from Web Sample 25 processing
"""

import json

# Load progress file with before/after data
with open('SAMPLE25_progress.json', 'r') as f:
    data = json.load(f)

updated_refs = data['updated_references']

print("="*80)
print("URL CHANGE ANALYSIS - WEB SAMPLE 25")
print("="*80)

primary_changed = 0
secondary_changed = 0
primary_same = 0
secondary_same = 0
primary_upgraded = 0
secondary_upgraded = 0

details = []

for ref in updated_refs:
    rid = ref['rid']
    old_primary = ref.get('primary_url')
    old_secondary = ref.get('secondary_url')
    new_primary = ref.get('new_primary_url')
    new_secondary = ref.get('new_secondary_url')

    primary_score = ref.get('primary_score', 0)
    secondary_score = ref.get('secondary_score', 0)

    # Analyze primary
    primary_status = "SAME"
    if old_primary != new_primary:
        primary_changed += 1
        primary_status = "CHANGED"
        if primary_score >= 85:
            primary_upgraded += 1
            primary_status = "UPGRADED"
    else:
        primary_same += 1

    # Analyze secondary
    secondary_status = "SAME"
    if old_secondary != new_secondary:
        secondary_changed += 1
        secondary_status = "CHANGED"
        if secondary_score >= 85:
            secondary_upgraded += 1
            secondary_status = "UPGRADED"
    else:
        secondary_same += 1

    details.append({
        'rid': rid,
        'biblio': ref['biblio_text'][:80],
        'primary_status': primary_status,
        'primary_score': primary_score,
        'old_primary': old_primary[:60] if old_primary else "NONE",
        'new_primary': new_primary[:60] if new_primary else "NONE",
        'secondary_status': secondary_status,
        'secondary_score': secondary_score,
        'old_secondary': old_secondary[:60] if old_secondary else "NONE",
        'new_secondary': new_secondary[:60] if new_secondary else "NONE"
    })

print("\n📊 SUMMARY STATISTICS")
print("-"*80)
print(f"Total references processed: {len(updated_refs)}")
print(f"\nPRIMARY URLs:")
print(f"  • Changed: {primary_changed}/25 ({primary_changed/25*100:.1f}%)")
print(f"  • Same: {primary_same}/25 ({primary_same/25*100:.1f}%)")
print(f"  • Upgraded (score ≥85): {primary_upgraded}/25 ({primary_upgraded/25*100:.1f}%)")
print(f"\nSECONDARY URLs:")
print(f"  • Changed: {secondary_changed}/25 ({secondary_changed/25*100:.1f}%)")
print(f"  • Same: {secondary_same}/25 ({secondary_same/25*100:.1f}%)")
print(f"  • Upgraded (score ≥85): {secondary_upgraded}/25 ({secondary_upgraded/25*100:.1f}%)")

print("\n"+"="*80)
print("DETAILED URL CHANGES")
print("="*80)

for d in details:
    print(f"\n[{d['rid']}] {d['biblio']}...")

    if d['primary_status'] == "SAME":
        print(f"  PRIMARY: ✓ KEPT (Score: {d['primary_score']}/100)")
        print(f"    {d['old_primary']}...")
    else:
        print(f"  PRIMARY: {d['primary_status']} (Score: {d['primary_score']}/100)")
        print(f"    OLD: {d['old_primary']}...")
        print(f"    NEW: {d['new_primary']}...")

    if d['secondary_status'] == "SAME":
        print(f"  SECONDARY: ✓ KEPT (Score: {d['secondary_score']}/100)")
        print(f"    {d['old_secondary']}...")
    else:
        print(f"  SECONDARY: {d['secondary_status']} (Score: {d['secondary_score']}/100)")
        print(f"    OLD: {d['old_secondary']}...")
        print(f"    NEW: {d['new_secondary']}...")

print("\n"+"="*80)
print("✅ Analysis complete!")
print("="*80)
