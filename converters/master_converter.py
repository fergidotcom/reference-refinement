#!/usr/bin/env python3
"""
Master Converter for "Caught in the Act" References
Orchestrates all conversion formats: HTML, EPUB, and Print with QR codes
"""

import sys
from pathlib import Path
from datetime import datetime

# Add converters to path
sys.path.insert(0, str(Path(__file__).parent))

from reference_data_manager import ReferenceDataManager
from html_converter_enhanced import HTMLConverter
from epub_converter_simple import SimpleEPUBConverter
from qr_generator import QRCodeGenerator


class MasterConverter:
    """Master orchestrator for all reference conversions"""

    def __init__(self):
        self.start_time = datetime.now()
        self.results = {}

    def run_all(self):
        """Run all conversion pipelines"""
        print("="*70)
        print(" "*15 + "CAUGHT IN THE ACT - MASTER CONVERTER")
        print("="*70)
        print(f"Started: {self.start_time.strftime('%B %d, %Y at %I:%M:%S %p')}")
        print()

        # Step 1: Parse and validate reference data
        print("STEP 1: Parse and Validate Reference Data")
        print("-"*70)
        try:
            manager = ReferenceDataManager()
            manager.parse_decisions_txt('source/decisions.txt')
            manager.print_summary()

            # Export master JSON
            json_path = manager.export_to_json('data/references_master.json')
            self.results['data_parsing'] = 'SUCCESS'
            self.results['json_file'] = str(json_path)

        except Exception as e:
            print(f"❌ ERROR: {e}")
            self.results['data_parsing'] = f'FAILED: {e}'
            return False

        print()

        # Step 2: Generate HTML
        print("STEP 2: Generate HTML Output")
        print("-"*70)
        try:
            html_converter = HTMLConverter('data/references_master.json')
            html_path = html_converter.generate_html('outputs/html/caught_in_the_act_references.html')
            self.results['html_generation'] = 'SUCCESS'
            self.results['html_file'] = str(html_path)
            self.results['html_size'] = html_path.stat().st_size

        except Exception as e:
            print(f"❌ ERROR: {e}")
            self.results['html_generation'] = f'FAILED: {e}'

        print()

        # Step 3: Generate EPUB
        print("STEP 3: Generate EPUB Output")
        print("-"*70)
        try:
            epub_converter = SimpleEPUBConverter('data/references_master.json')
            epub_path = epub_converter.generate_epub('outputs/epub/caught_in_the_act_references.epub')
            self.results['epub_generation'] = 'SUCCESS'
            self.results['epub_file'] = str(epub_path)
            self.results['epub_size'] = epub_path.stat().st_size

        except Exception as e:
            print(f"❌ ERROR: {e}")
            self.results['epub_generation'] = f'FAILED: {e}'

        print()

        # Step 4: Generate QR Codes
        print("STEP 4: Generate Print Version with QR Codes")
        print("-"*70)
        try:
            qr_generator = QRCodeGenerator('data/references_master.json')
            qr_path = qr_generator.generate_html('outputs/print/caught_in_the_act_qr_codes.html')
            self.results['qr_generation'] = 'SUCCESS'
            self.results['qr_file'] = str(qr_path)
            self.results['qr_size'] = qr_path.stat().st_size

        except Exception as e:
            print(f"❌ ERROR: {e}")
            self.results['qr_generation'] = f'FAILED: {e}'

        print()

        # Print summary
        self.print_summary()

        return True

    def print_summary(self):
        """Print final summary"""
        end_time = datetime.now()
        duration = end_time - self.start_time

        print("="*70)
        print(" "*20 + "CONVERSION SUMMARY")
        print("="*70)

        # Count successes
        successes = sum(1 for k, v in self.results.items() if k.endswith('_generation') and v == 'SUCCESS')
        total_steps = 4

        print(f"\n✅ Completed {successes}/{total_steps} conversion steps\n")

        # Data parsing
        if self.results.get('data_parsing') == 'SUCCESS':
            print("✓ Data Parsing: SUCCESS")
            print(f"  → {self.results.get('json_file')}")
        else:
            print(f"✗ Data Parsing: {self.results.get('data_parsing')}")

        # HTML
        if self.results.get('html_generation') == 'SUCCESS':
            print("\n✓ HTML Generation: SUCCESS")
            print(f"  → {self.results.get('html_file')}")
            print(f"  → Size: {self.results.get('html_size'):,} bytes")
        else:
            print(f"\n✗ HTML Generation: {self.results.get('html_generation')}")

        # EPUB
        if self.results.get('epub_generation') == 'SUCCESS':
            print("\n✓ EPUB Generation: SUCCESS")
            print(f"  → {self.results.get('epub_file')}")
            print(f"  → Size: {self.results.get('epub_size'):,} bytes")
        else:
            print(f"\n✗ EPUB Generation: {self.results.get('epub_generation')}")

        # QR Codes
        if self.results.get('qr_generation') == 'SUCCESS':
            print("\n✓ QR Code Generation: SUCCESS")
            print(f"  → {self.results.get('qr_file')}")
            print(f"  → Size: {self.results.get('qr_size'):,} bytes")
        else:
            print(f"\n✗ QR Code Generation: {self.results.get('qr_generation')}")

        # Timing
        print(f"\n⏱️  Total time: {duration.total_seconds():.1f} seconds")

        print("\n" + "="*70)

        # Next steps
        print("\n📋 NEXT STEPS:\n")
        print("1. Open HTML file in browser:")
        print(f"   {self.results.get('html_file', 'N/A')}\n")
        print("2. View EPUB with e-reader:")
        print(f"   {self.results.get('epub_file', 'N/A')}\n")
        print("3. Print QR code version:")
        print(f"   Open {self.results.get('qr_file', 'N/A')}")
        print("   Use browser Print → Save as PDF\n")

        print("="*70)


def main():
    """Main execution"""
    converter = MasterConverter()
    success = converter.run_all()

    if success:
        print("\n🎉 All conversions completed successfully!\n")
        return 0
    else:
        print("\n⚠️  Some conversions failed. Check errors above.\n")
        return 1


if __name__ == "__main__":
    sys.exit(main())
