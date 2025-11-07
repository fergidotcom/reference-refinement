#!/usr/bin/env python3
"""
Enhanced HTML Converter for "Caught in the Act" References
Generates elegant HTML presentation with verified URLs
"""

import json
from pathlib import Path
from datetime import datetime
from typing import Dict, List


class HTMLConverter:
    """Converts reference data to elegant HTML format"""

    def __init__(self, data_file: str = 'data/references_master.json'):
        print(f"📖 Loading reference data from {data_file}...")
        with open(data_file, 'r', encoding='utf-8') as f:
            data = json.load(f)

        self.references = data['references']
        self.statistics = data['statistics']
        self.metadata = data['metadata']

        print(f"✓ Loaded {len(self.references)} references")

    def generate_html(self, output_file: str = 'outputs/html/caught_in_the_act_references.html'):
        """Generate complete HTML document"""
        print(f"🎨 Generating HTML...")

        html = self._build_html_document()

        # Write to file
        output_path = Path(output_file)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(html)

        print(f"✓ Generated HTML: {output_path}")
        print(f"   File size: {output_path.stat().st_size:,} bytes")

        return output_path

    def _build_html_document(self) -> str:
        """Build complete HTML document"""
        css = self._generate_css()
        header = self._generate_header()
        references_by_chapter = self._organize_by_chapter()
        content = self._generate_content(references_by_chapter)
        footer = self._generate_footer()
        javascript = self._generate_javascript()

        return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Caught in the Act - References</title>
    <style>
{css}
    </style>
</head>
<body>
    <div class="container">
{header}
{content}
{footer}
    </div>
{javascript}
</body>
</html>"""

    def _generate_css(self) -> str:
        """Generate modern CSS styling"""
        return """
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        :root {
            --primary-color: #2c3e50;
            --secondary-color: #3498db;
            --accent-color: #e74c3c;
            --text-color: #333;
            --bg-color: #f8f9fa;
            --card-bg: #ffffff;
            --border-color: #dee2e6;
            --link-color: #3498db;
            --link-hover: #2980b9;
            --shadow: 0 2px 4px rgba(0,0,0,0.1);
            --shadow-hover: 0 4px 12px rgba(0,0,0,0.15);
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: var(--text-color);
            background-color: var(--bg-color);
            padding: 20px;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            background-color: var(--card-bg);
            box-shadow: var(--shadow);
            border-radius: 8px;
            overflow: hidden;
        }

        header {
            background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
            color: white;
            padding: 40px;
            text-align: center;
        }

        header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
            font-weight: 700;
        }

        header .subtitle {
            font-size: 1.2em;
            opacity: 0.9;
            margin-bottom: 20px;
        }

        .stats {
            display: flex;
            justify-content: center;
            gap: 30px;
            margin-top: 20px;
            flex-wrap: wrap;
        }

        .stat-item {
            background: rgba(255,255,255,0.1);
            padding: 15px 25px;
            border-radius: 6px;
            backdrop-filter: blur(10px);
        }

        .stat-number {
            font-size: 2em;
            font-weight: bold;
            display: block;
        }

        .stat-label {
            font-size: 0.9em;
            opacity: 0.9;
        }

        .controls {
            padding: 30px 40px;
            background-color: #f8f9fa;
            border-bottom: 1px solid var(--border-color);
        }

        .search-box {
            width: 100%;
            padding: 12px 20px;
            font-size: 16px;
            border: 2px solid var(--border-color);
            border-radius: 6px;
            transition: border-color 0.3s;
        }

        .search-box:focus {
            outline: none;
            border-color: var(--secondary-color);
        }

        .chapter-nav {
            margin-top: 20px;
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
        }

        .chapter-btn {
            padding: 8px 16px;
            border: 2px solid var(--border-color);
            background: white;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.3s;
            font-size: 14px;
        }

        .chapter-btn:hover {
            border-color: var(--secondary-color);
            color: var(--secondary-color);
        }

        .chapter-btn.active {
            background: var(--secondary-color);
            color: white;
            border-color: var(--secondary-color);
        }

        .main-content {
            padding: 40px;
        }

        .chapter-section {
            margin-bottom: 50px;
        }

        .chapter-title {
            font-size: 2em;
            color: var(--primary-color);
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 3px solid var(--secondary-color);
        }

        .reference-card {
            background: var(--card-bg);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            padding: 25px;
            margin-bottom: 20px;
            transition: all 0.3s;
            position: relative;
        }

        .reference-card:hover {
            box-shadow: var(--shadow-hover);
            transform: translateY(-2px);
        }

        .ref-number {
            position: absolute;
            top: 15px;
            right: 15px;
            background: var(--secondary-color);
            color: white;
            padding: 5px 12px;
            border-radius: 20px;
            font-weight: bold;
            font-size: 0.9em;
        }

        .bibliography {
            font-size: 1.1em;
            margin-bottom: 15px;
            padding-right: 80px;
            line-height: 1.8;
        }

        .relevance {
            color: #555;
            font-size: 0.95em;
            line-height: 1.7;
            margin: 15px 0;
            padding: 15px;
            background: #f8f9fa;
            border-left: 4px solid var(--secondary-color);
            border-radius: 4px;
        }

        .relevance-label {
            font-weight: bold;
            color: var(--primary-color);
            display: block;
            margin-bottom: 8px;
        }

        .urls {
            display: flex;
            gap: 15px;
            flex-wrap: wrap;
            margin-top: 15px;
        }

        .url-link {
            display: inline-flex;
            align-items: center;
            padding: 10px 18px;
            background: linear-gradient(135deg, var(--link-color), var(--secondary-color));
            color: white;
            text-decoration: none;
            border-radius: 6px;
            transition: all 0.3s;
            font-size: 0.9em;
            font-weight: 500;
            box-shadow: var(--shadow);
        }

        .url-link:hover {
            transform: translateY(-2px);
            box-shadow: var(--shadow-hover);
            background: linear-gradient(135deg, var(--link-hover), var(--link-color));
        }

        .url-link::before {
            content: "🔗";
            margin-right: 8px;
        }

        .url-link.secondary {
            background: linear-gradient(135deg, #95a5a6, #7f8c8d);
        }

        .url-link.secondary::before {
            content: "📎";
        }

        .no-results {
            text-align: center;
            padding: 60px 20px;
            color: #999;
            font-size: 1.2em;
        }

        footer {
            background: var(--primary-color);
            color: white;
            padding: 30px 40px;
            text-align: center;
        }

        footer a {
            color: var(--secondary-color);
            text-decoration: none;
        }

        footer a:hover {
            text-decoration: underline;
        }

        @media (max-width: 768px) {
            header h1 {
                font-size: 1.8em;
            }

            .stats {
                gap: 15px;
            }

            .stat-item {
                padding: 10px 15px;
            }

            .main-content {
                padding: 20px;
            }

            .reference-card {
                padding: 20px;
            }

            .ref-number {
                position: static;
                display: inline-block;
                margin-bottom: 10px;
            }

            .bibliography {
                padding-right: 0;
            }
        }

        .hidden {
            display: none !important;
        }
"""

    def _generate_header(self) -> str:
        """Generate header section with statistics"""
        stats = self.statistics

        return f"""        <header>
            <h1>Caught in the Act</h1>
            <div class="subtitle">Academic References with Verified URLs</div>
            <div class="stats">
                <div class="stat-item">
                    <span class="stat-number">{stats['total_references']}</span>
                    <span class="stat-label">Total References</span>
                </div>
                <div class="stat-item">
                    <span class="stat-number">{stats['url_coverage']['primary_coverage_pct']}%</span>
                    <span class="stat-label">Primary URL Coverage</span>
                </div>
                <div class="stat-item">
                    <span class="stat-number">{stats['url_coverage']['secondary_coverage_pct']}%</span>
                    <span class="stat-label">Secondary URL Coverage</span>
                </div>
                <div class="stat-item">
                    <span class="stat-number">{len(stats['references_by_chapter'])}</span>
                    <span class="stat-label">Chapters</span>
                </div>
            </div>
        </header>"""

    def _organize_by_chapter(self) -> Dict[str, List[dict]]:
        """Organize references by chapter"""
        by_chapter = {}

        for ref in self.references:
            chapter = ref['chapter']
            if chapter not in by_chapter:
                by_chapter[chapter] = []
            by_chapter[chapter].append(ref)

        return by_chapter

    def _generate_content(self, references_by_chapter: Dict[str, List[dict]]) -> str:
        """Generate main content with references"""
        # Generate chapter navigation
        chapters = ['All'] + list(references_by_chapter.keys())
        nav_buttons = '\n'.join([
            f'            <button class="chapter-btn{" active" if ch == "All" else ""}" onclick="filterChapter(\'{ch}\')">{ch}</button>'
            for ch in chapters
        ])

        controls = f"""        <div class="controls">
            <input type="text" class="search-box" id="searchBox" placeholder="Search references by keyword, author, or title..." onkeyup="searchReferences()">
            <div class="chapter-nav">
{nav_buttons}
            </div>
        </div>"""

        # Generate reference sections
        sections = []
        for chapter, refs in references_by_chapter.items():
            section = self._generate_chapter_section(chapter, refs)
            sections.append(section)

        content_html = '\n'.join(sections)

        return f"""{controls}
        <div class="main-content" id="mainContent">
{content_html}
            <div class="no-results hidden" id="noResults">
                No references found matching your search.
            </div>
        </div>"""

    def _generate_chapter_section(self, chapter: str, refs: List[dict]) -> str:
        """Generate a chapter section with its references"""
        cards = []

        for ref in refs:
            card = self._generate_reference_card(ref)
            cards.append(card)

        cards_html = '\n'.join(cards)

        return f"""            <div class="chapter-section" data-chapter="{chapter}">
                <h2 class="chapter-title">{chapter}</h2>
{cards_html}
            </div>"""

    def _generate_reference_card(self, ref: dict) -> str:
        """Generate a single reference card"""
        ref_num = ref['number']
        bibliography = ref['bibliography']
        relevance = ref['relevance']
        primary_url = ref.get('primary_url')
        secondary_url = ref.get('secondary_url')

        # Build relevance section
        relevance_html = ''
        if relevance:
            relevance_html = f"""                    <div class="relevance">
                        <span class="relevance-label">Relevance:</span>
                        {self._escape_html(relevance)}
                    </div>"""

        # Build URLs section
        urls_html = ''
        if primary_url or secondary_url:
            url_links = []

            if primary_url:
                url_links.append(f'                        <a href="{primary_url}" class="url-link" target="_blank" rel="noopener">Primary Source</a>')

            if secondary_url:
                url_links.append(f'                        <a href="{secondary_url}" class="url-link secondary" target="_blank" rel="noopener">Secondary Source</a>')

            urls_html = f"""                    <div class="urls">
{chr(10).join(url_links)}
                    </div>"""

        return f"""                <div class="reference-card" data-ref-num="{ref_num}">
                    <div class="ref-number">[{ref_num}]</div>
                    <div class="bibliography">{self._escape_html(bibliography)}</div>
{relevance_html}
{urls_html}
                </div>"""

    def _generate_footer(self) -> str:
        """Generate footer section"""
        timestamp = datetime.now().strftime('%B %d, %Y at %I:%M %p')

        return f"""        <footer>
            <p><strong>Caught in the Act</strong> - Academic Reference Collection</p>
            <p>Generated on {timestamp}</p>
            <p>Total: {self.statistics['total_references']} references with verified URLs</p>
            <p style="margin-top: 15px; font-size: 0.9em;">
                Created with <a href="https://github.com/fergidotcom/reference-refinement" target="_blank">Reference Refinement Tool</a>
            </p>
        </footer>"""

    def _generate_javascript(self) -> str:
        """Generate JavaScript for interactivity"""
        return """    <script>
        let currentChapter = 'All';

        function filterChapter(chapter) {
            currentChapter = chapter;

            // Update active button
            document.querySelectorAll('.chapter-btn').forEach(btn => {
                btn.classList.remove('active');
                if (btn.textContent === chapter) {
                    btn.classList.add('active');
                }
            });

            // Filter sections
            const sections = document.querySelectorAll('.chapter-section');
            sections.forEach(section => {
                if (chapter === 'All') {
                    section.classList.remove('hidden');
                } else {
                    if (section.dataset.chapter === chapter) {
                        section.classList.remove('hidden');
                    } else {
                        section.classList.add('hidden');
                    }
                }
            });

            // Re-apply search filter
            searchReferences();
        }

        function searchReferences() {
            const searchTerm = document.getElementById('searchBox').value.toLowerCase();
            const cards = document.querySelectorAll('.reference-card');
            let visibleCount = 0;

            cards.forEach(card => {
                // Check if card's section is visible
                const section = card.closest('.chapter-section');
                if (section.classList.contains('hidden')) {
                    card.classList.add('hidden');
                    return;
                }

                const text = card.textContent.toLowerCase();
                if (searchTerm === '' || text.includes(searchTerm)) {
                    card.classList.remove('hidden');
                    visibleCount++;
                } else {
                    card.classList.add('hidden');
                }
            });

            // Show/hide no results message
            const noResults = document.getElementById('noResults');
            if (visibleCount === 0) {
                noResults.classList.remove('hidden');
            } else {
                noResults.classList.add('hidden');
            }
        }

        // Initialize on page load
        document.addEventListener('DOMContentLoaded', function() {
            console.log('Caught in the Act References loaded');
            console.log('Total references: ' + document.querySelectorAll('.reference-card').length);
        });
    </script>"""

    def _escape_html(self, text: str) -> str:
        """Escape HTML special characters"""
        if not text:
            return ''

        return (text
                .replace('&', '&amp;')
                .replace('<', '&lt;')
                .replace('>', '&gt;')
                .replace('"', '&quot;')
                .replace("'", '&#39;'))


def main():
    """Main execution"""
    print("="*60)
    print("Enhanced HTML Converter")
    print("="*60)

    converter = HTMLConverter('data/references_master.json')
    output_path = converter.generate_html('outputs/html/caught_in_the_act_references.html')

    print("\n✅ HTML generation complete!")
    print(f"   Output: {output_path}")
    print(f"   Open in browser to view")


if __name__ == "__main__":
    main()
