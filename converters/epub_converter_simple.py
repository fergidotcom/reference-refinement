#!/usr/bin/env python3
"""
Simple EPUB Converter for "Caught in the Act" References
Generates basic but functional EPUB with verified URLs
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


class SimpleEPUBConverter:
    """Simple EPUB converter"""

    def __init__(self, data_file: str = 'data/references_master.json'):
        if not EBOOKLIB_AVAILABLE:
            raise ImportError("ebooklib is required")

        print(f"📖 Loading {data_file}...")
        with open(data_file, 'r', encoding='utf-8') as f:
            data = json.load(f)

        self.references = data['references']
        self.statistics = data['statistics']
        print(f"✓ Loaded {len(self.references)} references")

    def generate_epub(self, output_file: str = 'outputs/epub/caught_in_the_act_references.epub'):
        """Generate EPUB file"""
        print(f"📚 Generating EPUB...")

        book = epub.EpubBook()

        # Metadata
        book.set_identifier('caught-in-the-act-001')
        book.set_title('Caught in the Act - References')
        book.set_language('en')
        book.add_author('Joe Ferguson')

        # Create CSS
        style = '''
body { font-family: Georgia, serif; line-height: 1.6; margin: 1em; }
h1 { color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 0.5em; }
h2 { color: #2c3e50; margin-top: 1.5em; }
.reference { margin: 1.5em 0; padding: 1em; background: #f8f9fa; border-radius: 5px; }
.ref-number { background: #3498db; color: white; padding: 0.2em 0.6em; border-radius: 3px; font-weight: bold; }
.bibliography { margin: 0.5em 0; line-height: 1.7; }
.relevance { margin: 1em 0; padding: 0.8em; background: white; border-left: 4px solid #3498db; font-size: 0.95em; }
.url-link { display: block; margin: 0.5em 0; color: #3498db; word-wrap: break-word; }
'''

        nav_css = epub.EpubItem(uid="style_nav", file_name="style/nav.css", media_type="text/css", content=style)
        book.add_item(nav_css)

        # Organize by chapter
        by_chapter = {}
        for ref in self.references:
            ch = ref['chapter']
            if ch not in by_chapter:
                by_chapter[ch] = []
            by_chapter[ch].append(ref)

        # Create chapters
        chapters = []
        toc_entries = []

        for ch_name, refs in sorted(by_chapter.items()):
            chapter = self._create_chapter(ch_name, refs)
            book.add_item(chapter)
            chapters.append(chapter)
            toc_entries.append(epub.Link(chapter.file_name, ch_name, chapter.id))

        # Set TOC and spine
        book.toc = tuple(toc_entries)
        book.add_item(epub.EpubNcx())
        book.add_item(epub.EpubNav())
        book.spine = ['nav'] + chapters

        # Write file
        output_path = Path(output_file)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        epub.write_epub(str(output_path), book)

        print(f"✓ Generated: {output_path}")
        print(f"   Size: {output_path.stat().st_size:,} bytes")

        return output_path

    def _create_chapter(self, chapter_name: str, refs: List[dict]):
        """Create chapter HTML"""
        ref_htmls = []

        for ref in refs:
            bib = self._esc(ref['bibliography'])
            rel = self._esc(ref['relevance'])
            purl = ref.get('primary_url', '')
            surl = ref.get('secondary_url', '')

            rel_html = f'<div class="relevance"><strong>Relevance:</strong> {rel}</div>' if rel else ''

            urls_html = ''
            if purl:
                urls_html += f'<div class="url-link">🔗 Primary: <a href="{purl}">{purl}</a></div>'
            if surl:
                urls_html += f'<div class="url-link">📎 Secondary: <a href="{surl}">{surl}</a></div>'

            ref_html = f'''
<div class="reference">
  <span class="ref-number">[{ref['number']}]</span>
  <div class="bibliography">{bib}</div>
  {rel_html}
  {urls_html}
</div>'''
            ref_htmls.append(ref_html)

        content = f'''
<html>
<head>
  <title>{chapter_name}</title>
  <link href="style/nav.css" type="text/css" rel="stylesheet"/>
</head>
<body>
  <h1>{chapter_name}</h1>
  <p><em>{len(refs)} references</em></p>
  {''.join(ref_htmls)}
</body>
</html>'''

        safe_name = chapter_name.lower().replace(' ', '_')
        c = epub.EpubHtml(title=chapter_name, file_name=f'{safe_name}.xhtml', lang='en')
        c.content = content.encode('utf-8')

        return c

    def _esc(self, text: str) -> str:
        """Escape HTML"""
        if not text:
            return ''
        return text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')


def main():
    if not EBOOKLIB_AVAILABLE:
        print("❌ ebooklib not installed")
        print("   Install: pip install ebooklib")
        return

    print("="*60)
    print("Simple EPUB Converter")
    print("="*60)

    converter = SimpleEPUBConverter()
    converter.generate_epub()

    print("\n✅ EPUB generation complete!")


if __name__ == "__main__":
    main()
