#!/usr/bin/env python3
"""
Archive Finalized References

Extracts finalized references from parsed log and appends them to
the Finalized_References.txt archive file.

Usage:
    python archive_finalized.py <parsed_log.json>
"""

import json
import sys
import os
from datetime import datetime
from pathlib import Path


def format_reference(ref: dict) -> str:
    """Format a reference entry for the archive"""
    lines = []

    # Reference citation
    parsed = ref.get('parsed_fields', {})
    ref_id = parsed.get('id', ref.get('id', '?'))
    title = parsed.get('title', 'Unknown')
    authors = parsed.get('authors', 'Unknown')
    year = parsed.get('year', '????')
    other = parsed.get('other', '')

    lines.append(f"[{ref_id}] {authors} ({year}). {title}.")
    if other:
        lines.append(f"    {other}")

    # URLs
    user_sel = ref.get('user_selections', {})
    primary = user_sel.get('primary', {})
    secondary = user_sel.get('secondary', {})
    tertiary = user_sel.get('tertiary', {})

    if primary.get('url'):
        lines.append(f"Primary URL: {primary['url']}")
    if secondary.get('url'):
        lines.append(f"Secondary URL: {secondary['url']}")
    if tertiary.get('url'):
        lines.append(f"Tertiary URL: {tertiary['url']}")

    # Finalization timestamp (extract just the time portion)
    finalized_at = ref.get('finalized_at', 'Unknown time')
    # Clean up - extract just the timestamp portion
    if ']' in finalized_at:
        finalized_at = finalized_at.split(']')[0].replace('[', '').strip()
    lines.append(f"Finalized: {finalized_at}")

    return '\n'.join(lines)


def archive_finalized_references(parsed_json_path: str, archive_path: str):
    """Extract finalized references and append to archive"""

    # Read parsed log
    try:
        with open(parsed_json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except FileNotFoundError:
        print(f"Error: File not found: {parsed_json_path}")
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON: {e}")
        sys.exit(1)

    # Extract finalized references
    references = data.get('references', [])
    finalized = [ref for ref in references if ref.get('finalized')]

    if not finalized:
        print("No finalized references found in this batch.")
        return 0

    # Create archive if it doesn't exist
    if not os.path.exists(archive_path):
        print(f"Creating new archive: {archive_path}")
        with open(archive_path, 'w', encoding='utf-8') as f:
            f.write(f"# Finalized References Archive\n")
            f.write(f"# Created: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write(f"# Auto-updated by System Log Analysis\n")
            f.write(f"\n{'='*80}\n\n")

    # Append finalized references
    with open(archive_path, 'a', encoding='utf-8') as f:
        # Add batch header
        batch_name = Path(parsed_json_path).stem.replace('_parsed', '')
        f.write(f"\n{'='*80}\n")
        f.write(f"Batch: {batch_name}\n")
        f.write(f"Added: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"{'='*80}\n\n")

        # Add each finalized reference
        for i, ref in enumerate(finalized, 1):
            f.write(format_reference(ref))
            f.write("\n\n")
            if i < len(finalized):
                f.write(f"{'-'*80}\n\n")

    print(f"✓ Added {len(finalized)} finalized reference(s) to archive")
    return len(finalized)


def main():
    if len(sys.argv) < 2:
        print("Usage: python archive_finalized.py <parsed_log.json>")
        sys.exit(1)

    parsed_json_path = sys.argv[1]

    # Archive goes in parent directory (References/)
    script_dir = Path(__file__).parent
    archive_path = script_dir.parent / "Finalized_References.txt"

    count = archive_finalized_references(parsed_json_path, str(archive_path))

    if count > 0:
        print(f"Archive location: {archive_path}")


if __name__ == '__main__':
    main()
