#!/usr/bin/env python3
"""
Check for manuscript and generate complete books
Simple script to verify everything is ready and run conversions
"""

import sys
from pathlib import Path
import subprocess


def check_file(path: str, description: str) -> bool:
    """Check if a file exists"""
    file_path = Path(path)
    if file_path.exists():
        size = file_path.stat().st_size
        print(f"✅ {description}")
        print(f"   {path} ({size:,} bytes)")
        return True
    else:
        print(f"❌ {description}")
        print(f"   Missing: {path}")
        return False


def main():
    """Main check and convert logic"""
    print("="*70)
    print("Complete Book Converter - System Check")
    print("="*70)
    print()

    # Check all required files
    print("📋 Checking required files...")
    print()

    all_ready = True

    # Check manuscript
    manuscript = 'source/250827_Caught_In_The_Act_Kindle.docx'
    has_manuscript = check_file(manuscript, "Complete manuscript DOCX")

    if not has_manuscript:
        all_ready = False

    print()

    # Check reference data
    decisions = 'source/decisions.txt'
    has_decisions = check_file(decisions, "Enhanced references (decisions.txt)")

    if not has_decisions:
        all_ready = False

    print()

    # Check JSON data
    json_data = 'data/references_master.json'
    has_json = check_file(json_data, "Reference database (JSON)")

    if not has_json:
        print("\n⚠️  Reference JSON not found")
        print("   Generating now...")
        try:
            subprocess.run([sys.executable, 'converters/reference_data_manager.py'], check=True)
            has_json = True
        except Exception as e:
            print(f"❌ Failed to generate: {e}")
            all_ready = False

    print()
    print("="*70)
    print()

    if not all_ready:
        print("❌ NOT READY - Missing required files\n")

        if not has_manuscript:
            print("📥 TO GET STARTED:\n")
            print("1. Place your complete manuscript file here:")
            print(f"   {manuscript}\n")
            print("2. The file should be the complete 'Caught in the Act' DOCX")
            print("   with all chapters, foreword, and introduction\n")
            print("3. Once added, run this script again:\n")
            print("   python3 check_and_convert.py\n")

        return 1

    # All files present - offer to convert
    print("✅ ALL FILES PRESENT - Ready to generate complete books!\n")
    print("This will generate:")
    print("  1. Complete HTML book (outputs/complete_book.html)")
    print("  2. Complete EPUB book (outputs/complete_book.epub)")
    print()

    response = input("Generate complete books now? [Y/n]: ").strip().lower()

    if response in ['', 'y', 'yes']:
        print()
        print("="*70)
        print("Generating Complete Books")
        print("="*70)
        print()

        # Generate HTML
        print("📚 Generating HTML book...")
        try:
            result = subprocess.run(
                [sys.executable, 'converters/full_book_html_converter.py'],
                check=True,
                capture_output=False
            )
            print("✅ HTML book generated\n")
        except Exception as e:
            print(f"❌ HTML generation failed: {e}\n")

        # Generate EPUB
        print("📚 Generating EPUB book...")
        try:
            result = subprocess.run(
                [sys.executable, 'converters/full_book_epub_converter.py'],
                check=True,
                capture_output=False
            )
            print("✅ EPUB book generated\n")
        except Exception as e:
            print(f"❌ EPUB generation failed: {e}\n")

        print("="*70)
        print()
        print("🎉 Complete books generated!")
        print()
        print("📖 View your books:")
        print("   HTML: outputs/complete_book.html")
        print("   EPUB: outputs/complete_book.epub")
        print()
        print("💡 Next steps:")
        print("   - Open HTML in browser to review")
        print("   - Copy EPUB to your e-reader")
        print("   - Share with readers or publish!")
        print()

        return 0
    else:
        print("\n⏸️  Skipped generation")
        print("\nTo generate later, run:")
        print("  python3 converters/full_book_html_converter.py")
        print("  python3 converters/full_book_epub_converter.py")
        print()

        return 0


if __name__ == "__main__":
    sys.exit(main())
