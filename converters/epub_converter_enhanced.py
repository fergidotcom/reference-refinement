#!/usr/bin/env python3
"""
Enhanced EPUB Converter for "Caught in the Act" References
Generates EPUB with Citation Narratives and enhanced navigation
"""

import json
from pathlib import Path
from datetime import datetime
from typing import Dict, List

try:
    from ebooklib import epub
    EBOOKLIB_AVAILABLE = True
except ImportError:
    EBOOKLIB_AVAILABLE = False
    print("⚠️  Warning: ebooklib not installed. Install with: pip install ebooklib")


class EPUBConverter:
    """Converts reference data to EPUB format with Citation Narratives"""

    def __init__(self, data_file: str = 'data/references_master.json'):
        if not EBOOKLIB_AVAILABLE:
            raise ImportError("ebooklib is required. Install with: pip install ebooklib")

        print(f"📖 Loading reference data from {data_file}...")
        with open(data_file, 'r', encoding='utf-8') as f:
            data = json.load(f)

        self.references = data['references']
        self.statistics = data['statistics']
        self.metadata = data['metadata']

        print(f"✓ Loaded {len(self.references)} references")

    def generate_epub(self, output_file: str = 'outputs/epub/caught_in_the_act_references.epub'):
        """Generate EPUB file"""
        print(f"📚 Generating EPUB...")

        # Create EPUB book
        book = epub.EpubBook()

        # Set metadata
        book.set_identifier('caught-in-the-act-references-001')
        book.set_title('Caught in the Act - References')
        book.set_language('en')
        book.add_author('Joe Ferguson')
        book.add_metadata('DC', 'description', 'Academic references for "Caught in the Act" with verified URLs')

        # Create chapters
        chapters = []

        # Title page
        title_chapter = self._create_title_page()
        book.add_item(title_chapter)
        chapters.append(title_chapter)

        # Table of contents chapter
        toc_chapter = self._create_toc()
        book.add_item(toc_chapter)
        chapters.append(toc_chapter)

        # Organize references by chapter
        refs_by_chapter = self._organize_by_chapter()

        # Create chapter sections
        chapter_items = []
        for chapter_name, refs in refs_by_chapter.items():
            chapter_item = self._create_chapter(chapter_name, refs)
            book.add_item(chapter_item)
            chapters.append(chapter_item)
            chapter_items.append((chapter_item, chapter_name))

        # Add CSS
        css = self._create_stylesheet()
        book.add_item(css)

        # Define Table of Contents
        book.toc = (
            epub.Link('title.xhtml', 'Title Page', 'title'),
            epub.Link('toc.xhtml', 'Table of Contents', 'toc'),
            (epub.Section('References'),
             tuple(epub.Link(f'chapter_{i}.xhtml', name, f'chapter_{i}')
                   for i, (_, name) in enumerate(chapter_items)))
        )

        # Add navigation files
        book.add_item(epub.EpubNcx())
        book.add_item(epub.EpubNav())

        # Define spine
        book.spine = ['nav'] + chapters

        # Write EPUB file
        output_path = Path(output_file)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        epub.write_epub(str(output_path), book, {})

        print(f"✓ Generated EPUB: {output_path}")
        print(f"   File size: {output_path.stat().st_size:,} bytes")

        return output_path

    def _create_stylesheet(self):
        """Create CSS stylesheet for EPUB"""
        css_content = '''
@namespace epub "http://www.idpf.org/2007/ops";

body {
    font-family: Georgia, serif;
    line-height: 1.6;
    margin: 1em;
    color: #333;
}

h1 {
    color: #2c3e50;
    font-size: 2em;
    margin-bottom: 0.5em;
    border-bottom: 3px solid #3498db;
    padding-bottom: 0.3em;
}

h2 {
    color: #2c3e50;
    font-size: 1.5em;
    margin-top: 1.5em;
    margin-bottom: 0.5em;
}

.title-page {
    text-align: center;
    padding: 3em 1em;
}

.title-page h1 {
    font-size: 2.5em;
    border: none;
}

.subtitle {
    font-size: 1.3em;
    color: #666;
    margin-top: 1em;
}

.stats {
    margin-top: 2em;
    padding: 1em;
    background: #f8f9fa;
    border-radius: 5px;
}

.stat-item {
    margin: 0.5em 0;
}

.toc-list {
    list-style-type: none;
    padding-left: 0;
}

.toc-list li {
    margin: 0.8em 0;
    padding: 0.5em;
    border-left: 3px solid #3498db;
    padding-left: 1em;
}

.reference {
    margin: 1.5em 0;
    padding: 1em;
    background: #f8f9fa;
    border-radius: 5px;
    page-break-inside: avoid;
}

.ref-number {
    display: inline-block;
    background: #3498db;
    color: white;
    padding: 0.2em 0.6em;
    border-radius: 3px;
    font-weight: bold;
    margin-bottom: 0.5em;
}

.bibliography {
    font-size: 1.1em;
    margin: 0.5em 0;
    line-height: 1.7;
}

.relevance {
    margin: 1em 0;
    padding: 0.8em;
    background: white;
    border-left: 4px solid #3498db;
    font-size: 0.95em;
    line-height: 1.6;
}

.relevance-label {
    font-weight: bold;
    color: #2c3e50;
    display: block;
    margin-bottom: 0.5em;
}

.urls {
    margin-top: 1em;
    padding-top: 1em;
    border-top: 1px solid #ddd;
}

.url-link {
    display: block;
    margin: 0.5em 0;
    color: #3498db;
    text-decoration: none;
    word-wrap: break-word;
    font-size: 0.9em;
}

.url-link:before {
    content: "🔗 ";
}

.url-link.secondary:before {
    content: "📎 ";
}

.chapter-intro {
    font-size: 0.95em;
    color: #666;
    margin-bottom: 1.5em;
    font-style: italic;
}
'''

        css = epub.EpubItem(
            uid="style",
            file_name="style.css",
            media_type="text/css",
            content=css_content
        )

        return css

    def _create_title_page(self):
        """Create title page"""
        stats = self.statistics

        content = f'''<?xml version='1.0' encoding='utf-8'?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
    <title>Caught in the Act - References</title>
    <link href="style.css" rel="stylesheet" type="text/css"/>
</head>
<body>
    <div class="title-page">
        <h1>Caught in the Act</h1>
        <p class="subtitle">Academic References with Verified URLs</p>

        <div class="stats">
            <p class="stat-item"><strong>{stats['total_references']}</strong> Total References</p>
            <p class="stat-item"><strong>{stats['url_coverage']['primary_coverage_pct']}%</strong> Primary URL Coverage</p>
            <p class="stat-item"><strong>{stats['url_coverage']['secondary_coverage_pct']}%</strong> Secondary URL Coverage</p>
            <p class="stat-item"><strong>{len(stats['references_by_chapter'])}</strong> Chapters</p>
        </div>

        <p style="margin-top: 3em; color: #666;">Generated: {datetime.now().strftime('%B %d, %Y')}</p>
    </div>
</body>
</html>'''

        title = epub.EpubHtml(
            title='Title Page',
            file_name='title.xhtml',
            lang='en',
            content=content
        )

        return title

    def _create_toc(self):
        """Create table of contents chapter"""
        refs_by_chapter = self._organize_by_chapter()

        toc_items = []
        for i, (chapter_name, refs) in enumerate(refs_by_chapter.items()):
            toc_items.append(
                f'<li><a href="chapter_{i}.xhtml">{chapter_name}</a> ({len(refs)} references)</li>'
            )

        toc_list = '\n'.join(toc_items)

        content = f'''<?xml version='1.0' encoding='utf-8'?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
    <title>Table of Contents</title>
    <link href="style.css" rel="stylesheet" type="text/css"/>
</head>
<body>
    <h1>Table of Contents</h1>
    <ul class="toc-list">
{toc_list}
    </ul>
</body>
</html>'''

        toc = epub.EpubHtml(
            title='Table of Contents',
            file_name='toc.xhtml',
            lang='en',
            content=content
        )

        return toc

    def _organize_by_chapter(self) -> Dict[str, List[dict]]:
        """Organize references by chapter"""
        by_chapter = {}

        # Preserve order from statistics
        for chapter in self.statistics['references_by_chapter'].keys():
            by_chapter[chapter] = []

        for ref in self.references:
            chapter = ref['chapter']
            if chapter in by_chapter:
                by_chapter[chapter].append(ref)

        return by_chapter

    def _create_chapter(self, chapter_name: str, refs: List[dict]):
        """Create a chapter with references"""
        ref_items = []

        for ref in refs:
            ref_html = self._format_reference(ref)
            ref_items.append(ref_html)

        refs_content = '\n'.join(ref_items)

        content = f'''<?xml version='1.0' encoding='utf-8'?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
    <title>{chapter_name}</title>
    <link href="style.css" rel="stylesheet" type="text/css"/>
</head>
<body>
    <h1>{chapter_name}</h1>
    <p class="chapter-intro">{len(refs)} references</p>
{refs_content}
</body>
</html>'''

        # Safe filename
        safe_name = chapter_name.lower().replace(' ', '_')
        chapter_index = list(self._organize_by_chapter().keys()).index(chapter_name)

        chapter = epub.EpubHtml(
            title=chapter_name,
            file_name=f'chapter_{chapter_index}.xhtml',
            lang='en',
            content=content
        )

        return chapter

    def _format_reference(self, ref: dict) -> str:
        """Format a single reference as HTML"""
        ref_num = ref['number']
        bibliography = self._escape_html(ref['bibliography'])
        relevance = ref['relevance']
        primary_url = ref.get('primary_url', '')
        secondary_url = ref.get('secondary_url', '')

        # Relevance section
        relevance_html = ''
        if relevance:
            relevance_html = f'''
        <div class="relevance">
            <span class="relevance-label">Citation Narrative:</span>
            {self._escape_html(relevance)}
        </div>'''

        # URLs section
        urls_html = ''
        if primary_url or secondary_url:
            url_links = []

            if primary_url:
                url_links.append(f'<a href="{primary_url}" class="url-link">Primary Source: {primary_url}</a>')

            if secondary_url:
                url_links.append(f'<a href="{secondary_url}" class="url-link secondary">Secondary Source: {secondary_url}</a>')

            urls_html = f'''
        <div class="urls">
{chr(10).join('            ' + link for link in url_links)}
        </div>'''

        return f'''    <div class="reference">
        <span class="ref-number">[{ref_num}]</span>
        <p class="bibliography">{bibliography}</p>
{relevance_html}
{urls_html}
    </div>'''

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
    if not EBOOKLIB_AVAILABLE:
        print("\n❌ Cannot generate EPUB: ebooklib not installed")
        print("   Install with: pip install ebooklib")
        return

    print("="*60)
    print("Enhanced EPUB Converter")
    print("="*60)

    converter = EPUBConverter('data/references_master.json')
    output_path = converter.generate_epub('outputs/epub/caught_in_the_act_references.epub')

    print("\n✅ EPUB generation complete!")
    print(f"   Output: {output_path}")
    print(f"   Open with an e-reader application to view")


if __name__ == "__main__":
    main()
