#!/usr/bin/env python3

"""
Parse decisions.txt and analyze current state
"""

import re
from typing import Dict, List
from dataclasses import dataclass, field

@dataclass
class Reference:
    """Reference data structure"""
    id: int
    raw_citation: str
    author: str = ""
    year: int = 0
    title: str = ""
    publication: str = ""
    relevance: str = ""
    primary_url: str = ""
    secondary_url: str = ""
    tertiary_url: str = ""
    queries: List[str] = field(default_factory=list)
    flags: List[str] = field(default_factory=list)
    is_finalized: bool = False

def parse_decisions_file(filepath: str) -> List[Reference]:
    """Parse decisions.txt file"""

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Split into reference blocks
    # Pattern: [ID] followed by content until next [ID] or end
    pattern = r'\[(\d+)\]\s+(.*?)(?=\[\d+\]|$)'
    matches = re.findall(pattern, content, re.DOTALL)

    references = []

    for ref_id, ref_content in matches:
        ref = Reference(id=int(ref_id), raw_citation="")

        # Split content into lines
        lines = ref_content.strip().split('\n')
        if not lines:
            continue

        # First line is the citation
        citation_line = lines[0].strip()
        ref.raw_citation = citation_line

        # Parse citation for author, year, title
        # Format: Author (YEAR). Title. Publication. ...
        year_match = re.search(r'\((\d{4})\)', citation_line)
        if year_match:
            ref.year = int(year_match.group(1))

        # Extract FLAGS
        flags_match = re.search(r'FLAGS\[(.*?)\]', citation_line)
        if flags_match:
            flags_str = flags_match.group(1)
            ref.flags = [f.strip() for f in flags_str.split()]
            ref.is_finalized = 'FINALIZED' in ref.flags
            # Remove FLAGS from citation
            citation_line = re.sub(r'\s*FLAGS\[.*?\]', '', citation_line)

        # Extract URLs
        primary_match = re.search(r'PRIMARY_URL\[(.*?)\]', citation_line)
        if primary_match:
            ref.primary_url = primary_match.group(1)
            citation_line = re.sub(r'\s*PRIMARY_URL\[.*?\]', '', citation_line)

        secondary_match = re.search(r'SECONDARY_URL\[(.*?)\]', citation_line)
        if secondary_match:
            ref.secondary_url = secondary_match.group(1)
            citation_line = re.sub(r'\s*SECONDARY_URL\[.*?\]', '', citation_line)

        tertiary_match = re.search(r'TERTIARY_URL\[(.*?)\]', citation_line)
        if tertiary_match:
            ref.tertiary_url = tertiary_match.group(1)
            citation_line = re.sub(r'\s*TERTIARY_URL\[.*?\]', '', citation_line)

        # Parse author and title from cleaned citation
        # Pattern: Author (year). Title. Publication.
        parts = citation_line.split('.')
        if parts:
            # First part contains author and year
            first_part = parts[0]
            author_part = re.sub(r'\(\d{4}\)', '', first_part).strip()
            ref.author = author_part

            # Second part is title
            if len(parts) > 1:
                ref.title = parts[1].strip()

            # Remaining parts are publication
            if len(parts) > 2:
                ref.publication = '. '.join(parts[2:]).strip()

        # Parse remaining lines for relevance and queries
        for line in lines[1:]:
            line = line.strip()
            if line.startswith('Relevance:'):
                ref.relevance = line.replace('Relevance:', '').strip()
            elif line.startswith('Q:'):
                ref.queries.append(line.replace('Q:', '').strip())

        references.append(ref)

    return references

def analyze_state(references: List[Reference]):
    """Analyze current state of references"""

    total = len(references)
    finalized = sum(1 for r in references if r.is_finalized)
    unfinalized = total - finalized

    with_primary = sum(1 for r in references if r.primary_url)
    with_secondary = sum(1 for r in references if r.secondary_url)

    print(f"{'='*80}")
    print(f"CURRENT STATE ANALYSIS")
    print(f"{'='*80}\n")

    print(f"Total references: {total}")
    print(f"Finalized: {finalized} ({finalized/total*100:.1f}%)")
    print(f"Unfinalized: {unfinalized} ({unfinalized/total*100:.1f}%)")
    print()

    print(f"References with PRIMARY URL: {with_primary} ({with_primary/total*100:.1f}%)")
    print(f"References with SECONDARY URL: {with_secondary} ({with_secondary/total*100:.1f}%)")
    print()

    # Unfinalized references
    unfinalized_refs = [r for r in references if not r.is_finalized]

    print(f"{'='*80}")
    print(f"UNFINALIZED REFERENCES ({len(unfinalized_refs)} total)")
    print(f"{'='*80}\n")

    # Show first 20
    for ref in unfinalized_refs[:20]:
        status = "📎" if ref.primary_url else "❌"
        print(f"{status} [{ref.id}] {ref.author} ({ref.year}). {ref.title[:50]}...")
        if ref.primary_url:
            print(f"    PRIMARY: {ref.primary_url[:70]}...")
        else:
            print(f"    PRIMARY: (none)")

    if len(unfinalized_refs) > 20:
        print(f"\n... and {len(unfinalized_refs) - 20} more")

    return {
        'total': total,
        'finalized': finalized,
        'unfinalized': unfinalized,
        'unfinalized_refs': unfinalized_refs
    }

if __name__ == '__main__':
    import sys

    filepath = 'caught_in_the_act_decisions.txt'
    if len(sys.argv) > 1:
        filepath = sys.argv[1]

    print(f"Parsing {filepath}...\n")

    refs = parse_decisions_file(filepath)
    stats = analyze_state(refs)

    print(f"\n{'='*80}")
    print(f"Parse complete: {len(refs)} references loaded")
    print(f"{'='*80}\n")
