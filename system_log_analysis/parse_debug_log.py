#!/usr/bin/env python3
"""
Debug Log Parser for Reference Refinement System Log Analysis

Parses debug log text files into structured JSON data for analysis.

Usage:
    python parse_debug_log.py <log_file.txt> [output.json]

Output Structure:
    {
        "metadata": {
            "generated": "timestamp",
            "total_entries": int,
            "references_processed": int
        },
        "references": [
            {
                "id": int,
                "raw_reference": str,
                "parsed_fields": {...},
                "queries_generated": [...],
                "ai_model": str,
                "search_results": {
                    "total_unique": int,
                    "by_query": {...}
                },
                "autorank": {
                    "ai_primary": {...},
                    "ai_secondary": {...},
                    "candidates_ranked": int
                },
                "user_selections": {
                    "primary": {
                        "url": str,
                        "query": str or None,
                        "timestamp": str
                    },
                    "secondary": {...}
                },
                "finalized": bool,
                "finalized_at": str or None,
                "override": bool  # True if user selection != AI recommendation
            }
        ]
    }
"""

import re
import json
import sys
from typing import Dict, List, Optional, Any
from datetime import datetime


class DebugLogParser:
    """Parser for Reference Refinement debug logs"""

    def __init__(self, log_content: str):
        self.content = log_content
        self.references = []
        self.metadata = {}

    def parse(self) -> Dict[str, Any]:
        """Parse the complete log file"""
        # Extract metadata
        self._parse_metadata()

        # Split into reference sections
        ref_sections = self._split_by_reference()

        # Parse each reference
        for section in ref_sections:
            ref_data = self._parse_reference_section(section)
            if ref_data:
                self.references.append(ref_data)

        return {
            "metadata": self.metadata,
            "references": self.references
        }

    def _parse_metadata(self):
        """Extract log metadata from header"""
        # Generated timestamp
        gen_match = re.search(r'Generated: (.+)', self.content)
        if gen_match:
            self.metadata['generated'] = gen_match.group(1).strip()

        # Total entries
        entries_match = re.search(r'Total Entries: (\d+)', self.content)
        if entries_match:
            self.metadata['total_entries'] = int(entries_match.group(1))

    def _split_by_reference(self) -> List[str]:
        """Split log into sections by reference ID"""
        # Pattern: ===...=== REFERENCE ID: X ===...===
        sections = re.split(
            r'={80}\s+REFERENCE ID: (?:\d+|null)\s+={80}',
            self.content
        )
        # First section is header, skip it
        return sections[1:] if len(sections) > 1 else []

    def _parse_reference_section(self, section: str) -> Optional[Dict[str, Any]]:
        """Parse a single reference section"""
        ref_data = {
            "id": None,
            "raw_reference": None,
            "parsed_fields": {},
            "queries_generated": [],
            "ai_model": None,
            "search_results": {"total_unique": 0, "by_query": {}},
            "autorank": {},
            "user_selections": {},
            "finalized": False,
            "finalized_at": None,
            "override": False,
            "timeline": []
        }

        # Extract reference ID from any log entry
        id_match = re.search(r'<strong>ID:</strong> (\d+)', section)
        if id_match:
            ref_data['id'] = int(id_match.group(1))

        # Parse parsed fields
        ref_data['parsed_fields'] = self._extract_parsed_fields(section)

        # Extract AI model
        model_match = re.search(r'<strong>AI Model:</strong> ([\w-]+)', section)
        if model_match:
            ref_data['ai_model'] = model_match.group(1)

        # Extract queries
        queries_match = re.search(
            r'<strong>Queries Generated:</strong>\s+(.*?)\n\n',
            section,
            re.DOTALL
        )
        if queries_match:
            queries_text = queries_match.group(1).strip()
            ref_data['queries_generated'] = [
                q.strip() for q in queries_text.split('\n') if q.strip()
            ]

        # Extract search results
        unique_match = re.search(r'Total unique results: (\d+)', section)
        if unique_match:
            ref_data['search_results']['total_unique'] = int(unique_match.group(1))

        # Extract individual query results
        for query_result in re.finditer(
            r'Searching: (.+?)\n.*?Found (\d+) results',
            section,
            re.DOTALL
        ):
            query = query_result.group(1).strip()
            count = int(query_result.group(2))
            ref_data['search_results']['by_query'][query] = count

        # Extract autorank results
        autorank_section = re.search(
            r'\[.*?\] Autorank Results\s+.*?'
            r'<strong>Candidates Ranked:</strong> (\d+).*?'
            r'<strong>Primary Recommendation:</strong>.*?'
            r'URL: (.+?)\s+'
            r'Primary Score: (\d+)\s+'
            r'Secondary Score: (\d+)',
            section,
            re.DOTALL
        )
        if autorank_section:
            ref_data['autorank'] = {
                "candidates_ranked": int(autorank_section.group(1)),
                "ai_primary": {
                    "url": autorank_section.group(2).strip(),
                    "primary_score": int(autorank_section.group(3)),
                    "secondary_score": int(autorank_section.group(4))
                }
            }

            # Secondary recommendation
            secondary_match = re.search(
                r'<strong>Secondary Recommendation:</strong>.*?'
                r'URL: (.+?)\s+'
                r'Primary Score: (\d+|N/A)\s+'
                r'Secondary Score: (\d+)',
                section,
                re.DOTALL
            )
            if secondary_match:
                ref_data['autorank']['ai_secondary'] = {
                    "url": secondary_match.group(1).strip(),
                    "primary_score": secondary_match.group(2),
                    "secondary_score": int(secondary_match.group(3))
                }

        # Extract user URL selections
        for selection in re.finditer(
            r'\[(.+?)\] System Log\s+.*?'
            r'Selected as (primary|secondary) URL: (.+?)(?:\n|$)'
            r'(?:Found by query: (.+?))?(?:\n|$)',
            section,
            re.DOTALL
        ):
            timestamp = selection.group(1)
            url_type = selection.group(2)
            url = selection.group(3).strip()
            query = selection.group(4).strip() if selection.group(4) else None

            ref_data['user_selections'][url_type] = {
                "url": url,
                "query": query,
                "timestamp": timestamp
            }

        # Check for finalization
        finalized_match = re.search(
            r'\[(.+?)\] System Log\s+.*?=== FINALIZED REFERENCE ===',
            section,
            re.DOTALL
        )
        if finalized_match:
            ref_data['finalized'] = True
            ref_data['finalized_at'] = finalized_match.group(1)

        # Determine if user overrode AI
        if ref_data.get('autorank') and ref_data.get('user_selections'):
            ai_primary = ref_data['autorank'].get('ai_primary', {}).get('url')
            user_primary = ref_data['user_selections'].get('primary', {}).get('url')
            if ai_primary and user_primary and ai_primary != user_primary:
                ref_data['override'] = True

        return ref_data if ref_data['id'] is not None else None

    def _extract_parsed_fields(self, section: str) -> Dict[str, str]:
        """Extract parsed reference fields"""
        fields = {}

        patterns = {
            'id': r'<strong>ID:</strong> (\d+)',
            'title': r'<strong>Title:</strong> (.+)',
            'authors': r'<strong>Authors:</strong> (.+)',
            'year': r'<strong>Year:</strong> (.+)',
            'other': r'<strong>Other:</strong> (.+)',
            'primary_url': r'<strong>Primary URL:</strong> (.+)',
            'secondary_url': r'<strong>Secondary URL:</strong> (.+)'
        }

        for field, pattern in patterns.items():
            match = re.search(pattern, section)
            if match:
                value = match.group(1).strip()
                fields[field] = value if value != 'Not set' else None

        return fields


def main():
    if len(sys.argv) < 2:
        print("Usage: python parse_debug_log.py <log_file.txt> [output.json]")
        sys.exit(1)

    input_file = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else None

    # Read log file
    try:
        with open(input_file, 'r', encoding='utf-8') as f:
            log_content = f.read()
    except FileNotFoundError:
        print(f"Error: File not found: {input_file}")
        sys.exit(1)
    except Exception as e:
        print(f"Error reading file: {e}")
        sys.exit(1)

    # Parse log
    parser = DebugLogParser(log_content)
    result = parser.parse()

    # Add parsing metadata
    result['metadata']['parsed_at'] = datetime.now().isoformat()
    result['metadata']['references_processed'] = len(result['references'])

    # Output
    json_output = json.dumps(result, indent=2)

    if output_file:
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(json_output)
        print(f"✓ Parsed {len(result['references'])} references")
        print(f"✓ Output saved to: {output_file}")
    else:
        print(json_output)


if __name__ == '__main__':
    main()
