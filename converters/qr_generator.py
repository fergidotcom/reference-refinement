#!/usr/bin/env python3
"""
QR Code Generator for "Caught in the Act" References
Generates QR codes and print-ready HTML for all references
"""

import json
import qrcode
import base64
from io import BytesIO
from pathlib import Path
from datetime import datetime
from typing import Dict, List


class QRCodeGenerator:
    """Generate QR codes for reference URLs"""

    def __init__(self, data_file: str = 'data/references_master.json'):
        print(f"📖 Loading reference data from {data_file}...")
        with open(data_file, 'r', encoding='utf-8') as f:
            data = json.load(f)

        self.references = data['references']
        self.statistics = data['statistics']

        print(f"✓ Loaded {len(self.references)} references")

    def generate_qr_code(self, url: str, size: int = 4) -> str:
        """Generate QR code as base64 encoded image"""
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=size,
            border=2,
        )

        qr.add_data(url)
        qr.make(fit=True)

        img = qr.make_image(fill_color="black", back_color="white")

        # Convert to base64
        buffer = BytesIO()
        img.save(buffer, format='PNG')
        img_str = base64.b64encode(buffer.getvalue()).decode()

        return f"data:image/png;base64,{img_str}"

    def generate_html(self, output_file: str = 'outputs/print/caught_in_the_act_qr_codes.html'):
        """Generate print-ready HTML with QR codes"""
        print(f"🎨 Generating QR codes and HTML...")

        html = self._build_print_html()

        # Write to file
        output_path = Path(output_file)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(html)

        print(f"✓ Generated HTML: {output_path}")
        print(f"   File size: {output_path.stat().st_size:,} bytes")
        print(f"   Total QR codes: {sum(1 for r in self.references if r.get('primary_url'))}")

        return output_path

    def _build_print_html(self) -> str:
        """Build complete print-ready HTML document"""
        css = self._generate_print_css()
        content = self._generate_content()

        return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Caught in the Act - References with QR Codes</title>
    <style>
{css}
    </style>
</head>
<body>
{content}
</body>
</html>"""

    def _generate_print_css(self) -> str:
        """Generate CSS optimized for printing"""
        return """
        @page {
            size: letter;
            margin: 0.75in;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: "Times New Roman", Times, serif;
            font-size: 11pt;
            line-height: 1.5;
            color: #000;
            background: #fff;
        }

        .cover-page {
            text-align: center;
            padding: 3in 1in;
            page-break-after: always;
        }

        .cover-title {
            font-size: 32pt;
            font-weight: bold;
            margin-bottom: 0.5in;
        }

        .cover-subtitle {
            font-size: 18pt;
            margin-bottom: 1in;
        }

        .cover-stats {
            font-size: 14pt;
            line-height: 2;
        }

        .chapter-section {
            page-break-before: always;
        }

        .chapter-title {
            font-size: 18pt;
            font-weight: bold;
            margin-bottom: 0.3in;
            padding-bottom: 0.1in;
            border-bottom: 2pt solid #000;
        }

        .reference {
            margin-bottom: 0.4in;
            page-break-inside: avoid;
            display: flex;
            gap: 0.2in;
        }

        .ref-main {
            flex: 1;
        }

        .ref-qr {
            width: 1in;
            flex-shrink: 0;
            text-align: center;
        }

        .ref-number {
            font-weight: bold;
            font-size: 12pt;
            margin-bottom: 0.05in;
        }

        .bibliography {
            margin-bottom: 0.1in;
            line-height: 1.4;
        }

        .relevance {
            font-size: 10pt;
            margin: 0.1in 0;
            padding: 0.1in;
            background: #f5f5f5;
            border-left: 3pt solid #666;
            line-height: 1.3;
        }

        .relevance-label {
            font-weight: bold;
            font-style: italic;
        }

        .urls {
            margin-top: 0.1in;
            font-size: 9pt;
            line-height: 1.3;
        }

        .url-label {
            font-weight: bold;
        }

        .url-text {
            font-family: "Courier New", monospace;
            word-wrap: break-word;
            color: #0066cc;
        }

        .qr-image {
            width: 1in;
            height: 1in;
            margin-bottom: 0.05in;
        }

        .qr-label {
            font-size: 7pt;
            font-weight: bold;
        }

        @media print {
            body {
                background: #fff;
            }

            .reference {
                page-break-inside: avoid;
            }

            .chapter-section {
                page-break-before: always;
            }

            a {
                color: #000;
                text-decoration: none;
            }
        }

        @media screen {
            body {
                max-width: 8.5in;
                margin: 0 auto;
                padding: 0.5in;
                background: #f0f0f0;
            }

            .page {
                background: #fff;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                margin-bottom: 0.5in;
                padding: 0.75in;
            }
        }
"""

    def _generate_content(self) -> str:
        """Generate content with QR codes"""
        # Cover page
        cover = f"""    <div class="cover-page page">
        <div class="cover-title">Caught in the Act</div>
        <div class="cover-subtitle">Academic References with QR Codes</div>
        <div class="cover-stats">
            <p>{self.statistics['total_references']} Total References</p>
            <p>{self.statistics['url_coverage']['with_primary_url']} with Primary URLs</p>
            <p>{self.statistics['url_coverage']['with_secondary_url']} with Secondary URLs</p>
            <p style="margin-top: 0.5in; font-size: 12pt;">Generated: {datetime.now().strftime('%B %d, %Y')}</p>
        </div>
    </div>"""

        # Organize by chapter
        by_chapter = {}
        for ref in self.references:
            ch = ref['chapter']
            if ch not in by_chapter:
                by_chapter[ch] = []
            by_chapter[ch].append(ref)

        # Generate chapters
        chapters = []
        for chapter_name, refs in sorted(by_chapter.items()):
            chapter_html = self._generate_chapter(chapter_name, refs)
            chapters.append(chapter_html)

        return cover + '\n'.join(chapters)

    def _generate_chapter(self, chapter_name: str, refs: List[dict]) -> str:
        """Generate a chapter section"""
        ref_htmls = []

        for ref in refs:
            ref_html = self._generate_reference(ref)
            ref_htmls.append(ref_html)

        refs_content = '\n'.join(ref_htmls)

        return f"""
    <div class="chapter-section page">
        <h1 class="chapter-title">{chapter_name}</h1>
        <p style="margin-bottom: 0.3in; font-style: italic;">{len(refs)} references</p>
{refs_content}
    </div>"""

    def _generate_reference(self, ref: dict) -> str:
        """Generate a single reference with QR code"""
        ref_num = ref['number']
        bibliography = self._escape_html(ref['bibliography'])
        relevance = ref['relevance']
        primary_url = ref.get('primary_url')
        secondary_url = ref.get('secondary_url')

        # Relevance section
        relevance_html = ''
        if relevance:
            relevance_text = self._escape_html(relevance)
            # Truncate if too long for print
            if len(relevance_text) > 500:
                relevance_text = relevance_text[:497] + '...'

            relevance_html = f"""
            <div class="relevance">
                <span class="relevance-label">Relevance:</span> {relevance_text}
            </div>"""

        # URLs section
        urls_html = ''
        if primary_url:
            urls_html += f"""
            <div class="urls">
                <span class="url-label">Primary:</span> <span class="url-text">{primary_url}</span>
            </div>"""

        if secondary_url:
            urls_html += f"""
            <div class="urls">
                <span class="url-label">Secondary:</span> <span class="url-text">{secondary_url}</span>
            </div>"""

        # QR code section
        qr_html = ''
        if primary_url:
            print(f"  Generating QR code for reference [{ref_num}]...", end='\r')
            qr_data = self.generate_qr_code(primary_url, size=3)
            qr_html = f"""
        <div class="ref-qr">
            <img src="{qr_data}" alt="QR Code" class="qr-image">
            <div class="qr-label">Primary</div>
        </div>"""

        return f"""
        <div class="reference">
            <div class="ref-main">
                <div class="ref-number">[{ref_num}]</div>
                <div class="bibliography">{bibliography}</div>
{relevance_html}
{urls_html}
            </div>
{qr_html}
        </div>"""

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
    print("QR Code Generator for Print")
    print("="*60)

    generator = QRCodeGenerator('data/references_master.json')
    output_path = generator.generate_html('outputs/print/caught_in_the_act_qr_codes.html')

    print("\n✅ QR code generation complete!")
    print(f"   Output: {output_path}")
    print(f"   Open in browser and print to PDF")
    print(f"   Recommended: Print → Save as PDF → Letter size")


if __name__ == "__main__":
    main()
