#!/usr/bin/env python3
"""
Fix relevance text truncation - restore full relevance text while keeping Web Sample 25 URLs
"""

import re

# Load the backup with full relevance text
backup_files = [
    'decisions_backup_before_sample25_20251110_142556.txt',
    'decisions_backup_before_sample25_20251110_142345.txt',
    'decisions_backup_before_sample25_20251110_142344.txt',
    'decisions_backup_before_sample25_20251110_142343.txt'
]

backup_file = None
for f in backup_files:
    try:
        with open(f, 'r', encoding='utf-8') as test:
            backup_file = f
            break
    except:
        continue

if not backup_file:
    print("ERROR: Could not find backup file")
    exit(1)

print(f"Using backup file: {backup_file}")

# Load backup (original with full relevance text)
with open(backup_file, 'r', encoding='utf-8') as f:
    backup_lines = f.readlines()

# Load current (with truncated relevance but good URLs)
with open('decisions.txt', 'r', encoding='utf-8') as f:
    current_lines = f.readlines()

# Parse both files
backup_refs = {}
current_refs = {}

for line in backup_lines:
    match = re.match(r'^\[(\d+)\]', line.strip())
    if match:
        rid = int(match.group(1))
        backup_refs[rid] = line.strip()

for line in current_lines:
    match = re.match(r'^\[(\d+)\]', line.strip())
    if match:
        rid = int(match.group(1))
        current_refs[rid] = line.strip()

# Build fixed version
fixed_lines = []

for rid in sorted(current_refs.keys()):
    current = current_refs[rid]

    # Check if this is a Web Sample 25 reference (611-635)
    if 611 <= rid <= 635 and 'WEB_SAMPLE25' in current:
        # Extract the new URLs from current
        primary_match = re.search(r'PRIMARY_URL\[([^\]]+)\]', current)
        secondary_match = re.search(r'SECONDARY_URL\[([^\]]+)\]', current)

        new_primary = primary_match.group(1) if primary_match else None
        new_secondary = secondary_match.group(1) if secondary_match else None

        # Get full relevance text from backup
        if rid in backup_refs:
            backup = backup_refs[rid]

            # Extract biblio and relevance from backup
            relevance_match = re.search(r'(Relevance:\s+[^F]+?)(?:\s+FLAGS\[|$)', backup)

            if relevance_match:
                relevance_text = relevance_match.group(1).strip()
            else:
                relevance_text = ""

            # Extract biblio (everything before Relevance or FLAGS)
            biblio_match = re.search(r'^\[(\d+)\]\s+(.+?)(?:\s+Relevance:|$)', backup)
            if biblio_match:
                biblio = biblio_match.group(2).strip()
            else:
                biblio = backup.split('Relevance:')[0].replace(f'[{rid}]', '').strip()

            # Build new line with full relevance and new URLs
            new_line = f"[{rid}] {biblio}"

            if relevance_text:
                new_line += f" {relevance_text}"

            new_line += " FLAGS[WEB_SAMPLE25 BATCH_v17.2]"

            if new_primary:
                new_line += f" PRIMARY_URL[{new_primary}]"

            if new_secondary:
                new_line += f" SECONDARY_URL[{new_secondary}]"

            fixed_lines.append(new_line)
        else:
            # No backup, keep current
            fixed_lines.append(current)
    else:
        # Not a Web Sample 25 ref, keep as-is
        fixed_lines.append(current)

# Write fixed file
with open('decisions_fixed.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(fixed_lines))

print(f"✅ Fixed file created: decisions_fixed.txt")
print(f"   Total references: {len(fixed_lines)}")
print(f"   Web Sample 25 refs (611-635) now have full relevance text")
