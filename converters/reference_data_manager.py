#!/usr/bin/env python3
"""
Reference Data Manager
Parses and manages reference data from decisions.txt
Provides unified data structure for all converter formats
"""

import re
import json
from pathlib import Path
from typing import Dict, List, Optional
from dataclasses import dataclass, asdict


@dataclass
class Reference:
    """Data structure for a single reference"""
    number: int
    chapter: str
    bibliography: str
    relevance: str
    primary_url: Optional[str]
    secondary_url: Optional[str]
    flags: List[str]

    def to_dict(self):
        """Convert to dictionary for JSON serialization"""
        return asdict(self)

    @property
    def has_urls(self) -> bool:
        """Check if reference has at least a primary URL"""
        return self.primary_url is not None

    @property
    def is_finalized(self) -> bool:
        """Check if reference is marked as finalized"""
        return 'FINALIZED' in self.flags


class ReferenceDataManager:
    """Main class for managing reference data"""

    def __init__(self):
        self.references: Dict[int, Reference] = {}
        self.chapter_ranges = {
            "Introduction": (1, 99),
            "Chapter 1": (100, 199),
            "Chapter 2": (200, 299),
            "Chapter 3": (300, 399),
            "Chapter 4": (400, 499),
            "Chapter 5": (500, 599),
            "Chapter 6": (600, 699),
            "Chapter 7": (700, 799),
            "Chapter 8": (800, 899),
            "Chapter 9": (900, 999),
        }

    def determine_chapter(self, ref_num: int) -> str:
        """Determine chapter based on reference number"""
        for chapter, (start, end) in self.chapter_ranges.items():
            if start <= ref_num <= end:
                return chapter
        return "Unknown"

    def parse_decisions_txt(self, filepath: str = 'source/decisions.txt') -> Dict[int, Reference]:
        """
        Parse decisions.txt file from Reference Refinement tool

        Format:
        [NUM] Bibliography text. Relevance: description FLAGS[...] PRIMARY_URL[url] SECONDARY_URL[url]
        """
        print(f"📖 Loading {filepath}...")

        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        # Pattern to match reference entries
        # Matches: [number] ... (everything until next [number] or end of file)
        pattern = r'\[(\d+)\](.*?)(?=\n\[|\Z)'

        matches = list(re.finditer(pattern, content, re.DOTALL))
        print(f"   Found {len(matches)} reference entries")

        for match in matches:
            ref_num = int(match.group(1))
            ref_content = match.group(2).strip()

            # Parse components
            ref = self._parse_reference_content(ref_num, ref_content)
            self.references[ref_num] = ref

        print(f"✓ Parsed {len(self.references)} references")
        return self.references

    def _parse_reference_content(self, ref_num: int, content: str) -> Reference:
        """Parse the content of a single reference entry"""

        # Extract FLAGS
        flags = []
        flags_match = re.search(r'FLAGS\[(.*?)\]', content)
        if flags_match:
            flags_content = flags_match.group(1)
            # FLAGS can be space-delimited or contain single flag
            flags = [f.strip() for f in flags_content.split() if f.strip()]

        # Extract URLs
        primary_url = None
        secondary_url = None

        primary_match = re.search(r'PRIMARY_URL\[(https?://[^\]]+)\]', content)
        if primary_match:
            primary_url = primary_match.group(1)

        secondary_match = re.search(r'SECONDARY_URL\[(https?://[^\]]+)\]', content)
        if secondary_match:
            secondary_url = secondary_match.group(1)

        # Extract relevance text
        relevance = ""
        relevance_match = re.search(r'Relevance:\s*(.*?)(?:FLAGS\[|PRIMARY_URL\[|SECONDARY_URL\[|$)', content, re.DOTALL)
        if relevance_match:
            relevance = relevance_match.group(1).strip()

        # Extract bibliography (everything before "Relevance:" or FLAGS/URLs)
        bibliography = content

        # Remove FLAGS and URLs from bibliography
        bibliography = re.sub(r'FLAGS\[.*?\]', '', bibliography)
        bibliography = re.sub(r'PRIMARY_URL\[.*?\]', '', bibliography)
        bibliography = re.sub(r'SECONDARY_URL\[.*?\]', '', bibliography)

        # Remove "Relevance:" section from bibliography
        bibliography = re.sub(r'Relevance:.*', '', bibliography, flags=re.DOTALL)

        # Clean up bibliography
        bibliography = bibliography.strip()

        # Determine chapter
        chapter = self.determine_chapter(ref_num)

        return Reference(
            number=ref_num,
            chapter=chapter,
            bibliography=bibliography,
            relevance=relevance,
            primary_url=primary_url,
            secondary_url=secondary_url,
            flags=flags
        )

    def get_references_by_chapter(self) -> Dict[str, List[Reference]]:
        """Organize references by chapter"""
        by_chapter = {}

        for chapter in self.chapter_ranges.keys():
            by_chapter[chapter] = []

        for ref in self.references.values():
            if ref.chapter in by_chapter:
                by_chapter[ref.chapter].append(ref)

        # Sort references within each chapter
        for chapter in by_chapter:
            by_chapter[chapter].sort(key=lambda r: r.number)

        return by_chapter

    def validate_urls(self) -> Dict[str, any]:
        """Validate URL coverage across all references"""
        total = len(self.references)
        with_primary = sum(1 for r in self.references.values() if r.primary_url)
        with_secondary = sum(1 for r in self.references.values() if r.secondary_url)
        missing_urls = [r.number for r in self.references.values() if not r.primary_url]

        validation = {
            'total_references': total,
            'with_primary_url': with_primary,
            'with_secondary_url': with_secondary,
            'primary_coverage_pct': round(with_primary / total * 100, 1) if total > 0 else 0,
            'secondary_coverage_pct': round(with_secondary / total * 100, 1) if total > 0 else 0,
            'missing_primary_urls': missing_urls
        }

        return validation

    def generate_statistics(self) -> Dict[str, any]:
        """Generate comprehensive statistics about the reference data"""
        by_chapter = self.get_references_by_chapter()

        stats = {
            'total_references': len(self.references),
            'references_by_chapter': {
                chapter: len(refs) for chapter, refs in by_chapter.items() if refs
            },
            'url_coverage': self.validate_urls(),
            'finalized_count': sum(1 for r in self.references.values() if r.is_finalized),
            'flags_summary': {}
        }

        # Count flag occurrences
        flag_counts = {}
        for ref in self.references.values():
            for flag in ref.flags:
                flag_counts[flag] = flag_counts.get(flag, 0) + 1

        stats['flags_summary'] = flag_counts

        return stats

    def export_to_json(self, filepath: str = 'data/references_master.json'):
        """Export all references to JSON format"""
        output_path = Path(filepath)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        # Convert all references to dictionaries
        data = {
            'metadata': {
                'total_references': len(self.references),
                'source_file': 'source/decisions.txt',
                'generated_by': 'Reference Data Manager v1.0'
            },
            'statistics': self.generate_statistics(),
            'references': [ref.to_dict() for ref in sorted(self.references.values(), key=lambda r: r.number)]
        }

        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

        print(f"✓ Exported {len(self.references)} references to {filepath}")
        return filepath

    def print_summary(self):
        """Print a summary of the loaded references"""
        stats = self.generate_statistics()
        validation = stats['url_coverage']

        print("\n" + "="*60)
        print("REFERENCE DATA SUMMARY")
        print("="*60)
        print(f"Total References: {stats['total_references']}")
        print(f"Finalized: {stats['finalized_count']}")
        print()
        print("URL Coverage:")
        print(f"  Primary URLs:   {validation['with_primary_url']}/{validation['total_references']} ({validation['primary_coverage_pct']}%)")
        print(f"  Secondary URLs: {validation['with_secondary_url']}/{validation['total_references']} ({validation['secondary_coverage_pct']}%)")
        print()
        print("References by Chapter:")
        for chapter, count in stats['references_by_chapter'].items():
            print(f"  {chapter:15} {count:3} refs")

        if validation['missing_primary_urls']:
            print(f"\n⚠️  {len(validation['missing_primary_urls'])} references missing primary URLs")
            if len(validation['missing_primary_urls']) <= 10:
                print(f"   Missing: {validation['missing_primary_urls']}")

        print("="*60 + "\n")


def main():
    """Main execution"""
    print("Reference Data Manager v1.0")
    print("="*60)

    # Initialize manager
    manager = ReferenceDataManager()

    # Parse decisions.txt
    manager.parse_decisions_txt('source/decisions.txt')

    # Print summary
    manager.print_summary()

    # Export to JSON
    manager.export_to_json('data/references_master.json')

    # Generate validation report
    validation = manager.validate_urls()

    report_path = Path('data/validation_report.md')
    with open(report_path, 'w', encoding='utf-8') as f:
        f.write("# Reference Data Validation Report\n\n")
        f.write(f"**Generated:** {Path('source/decisions.txt').stat().st_mtime}\n\n")
        f.write(f"## Summary\n\n")
        f.write(f"- **Total References:** {validation['total_references']}\n")
        f.write(f"- **With Primary URLs:** {validation['with_primary_url']} ({validation['primary_coverage_pct']}%)\n")
        f.write(f"- **With Secondary URLs:** {validation['with_secondary_url']} ({validation['secondary_coverage_pct']}%)\n")
        f.write(f"- **Missing Primary URLs:** {len(validation['missing_primary_urls'])}\n\n")

        if validation['missing_primary_urls']:
            f.write("## References Missing Primary URLs\n\n")
            for ref_num in validation['missing_primary_urls'][:20]:
                ref = manager.references[ref_num]
                f.write(f"- **[{ref_num}]** {ref.bibliography[:80]}...\n")

    print(f"✓ Generated validation report: {report_path}")

    print("\n✅ Reference Data Manager completed successfully!")


if __name__ == "__main__":
    main()
