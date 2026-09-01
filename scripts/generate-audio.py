#!/usr/bin/env python3
"""
Generate per-page MP3 audio for Koltey Golai using edge-tts.

edge-tts uses Microsoft Edge's neural TTS engine (free, no API key needed).
Nepali voices: ne-NP-HemkalaNeural (♀ female) and ne-NP-SagarNeural (♂ male).

Setup:
  pip install edge-tts

Usage:
  python scripts/generate-audio.py                        # female voice, all pages
  python scripts/generate-audio.py --voice male           # male voice
  python scripts/generate-audio.py --pages 7,13,15        # specific pages only
  python scripts/generate-audio.py --list-voices          # list Nepali voices
  python scripts/generate-audio.py --rate -10%            # speak 10% slower

Output:
  public/audio/page-{N}.mp3   (one file per page in BOOK_TEXT)

File sizes: ~40–80 KB per page, ~8–12 MB total for the full book.
Commit the public/audio/ directory so Vercel serves the files as static assets.
"""

import asyncio
import re
import sys
import os
import argparse

try:
    import edge_tts
except ImportError:
    print("edge-tts is not installed. Run:")
    print("  pip install edge-tts")
    sys.exit(1)

VOICES = {
    "female": "ne-NP-HemkalaNeural",
    "male":   "ne-NP-SagarNeural",
}

# ---------------------------------------------------------------------------
# Parse lib/bookText.ts  →  { page_number: raw_text }
# ---------------------------------------------------------------------------

def parse_book_text(ts_path: str) -> dict[int, str]:
    with open(ts_path, encoding="utf-8") as f:
        content = f.read()
    # Match:  123: `...template literal...`,
    # Non-greedy so each entry stops at its closing backtick.
    pattern = re.compile(r'(\d+):\s*`(.*?)`', re.DOTALL)
    result: dict[int, str] = {}
    for m in pattern.finditer(content):
        page = int(m.group(1))
        result[page] = m.group(2).strip()
    return result


# ---------------------------------------------------------------------------
# Text cleanup  (mirrors cleanForSpeech in VoiceControls.tsx)
# ---------------------------------------------------------------------------

def clean_for_speech(text: str) -> str:
    text = re.sub(r'https?://\S+', '', text, flags=re.IGNORECASE)   # URLs
    text = re.sub(r'www\.\S+',     '', text, flags=re.IGNORECASE)   # www links
    text = re.sub(r'\S+@\S+\.\S+', '', text)                        # emails
    text = re.sub(r'[+]?\d[\d\s\-]{7,}', '', text)                  # phone numbers
    text = re.sub(r'ISBN\s*:?\s*[\d\-]+', '', text, flags=re.IGNORECASE)
    text = re.sub(r'[|।॥]', ' ', text)                              # danda
    text = re.sub(r'[^\S\n]+', ' ', text)                            # collapse spaces
    return text.strip()


# ---------------------------------------------------------------------------
# Generate one page
# ---------------------------------------------------------------------------

async def generate_page(
    page: int,
    raw_text: str,
    voice: str,
    rate: str,
    out_dir: str,
    overwrite: bool,
) -> bool:
    out_path = os.path.join(out_dir, f"page-{page}.mp3")

    if not overwrite and os.path.exists(out_path):
        print(f"  page {page:4d}: skipped (already exists, use --overwrite to regenerate)")
        return True

    cleaned = clean_for_speech(raw_text)
    if not cleaned:
        print(f"  page {page:4d}: skipped (no readable text)")
        return False

    try:
        communicate = edge_tts.Communicate(cleaned, voice, rate=rate)
        await communicate.save(out_path)
        size_kb = os.path.getsize(out_path) / 1024
        print(f"  page {page:4d}: ✓  {size_kb:5.0f} KB  →  {os.path.basename(out_path)}")
        return True
    except Exception as exc:
        print(f"  page {page:4d}: ✗  {exc}")
        return False


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

async def main() -> None:
    parser = argparse.ArgumentParser(
        description="Generate per-page MP3 audio for Koltey Golai",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "--voice", choices=["female", "male"], default="female",
        help="Voice gender (default: female = HemkalaNeural)",
    )
    parser.add_argument(
        "--pages",
        help="Comma-separated page numbers to (re)generate, e.g. 7,13,15",
    )
    parser.add_argument(
        "--rate", default="-5%",
        help="Speaking rate adjustment, e.g. -10%% for slower (default: -5%%)",
    )
    parser.add_argument(
        "--overwrite", action="store_true",
        help="Overwrite existing MP3 files (default: skip existing)",
    )
    parser.add_argument(
        "--list-voices", action="store_true",
        help="List available Nepali voices and exit",
    )
    args = parser.parse_args()

    if args.list_voices:
        all_voices = await edge_tts.list_voices()
        nepali = [v for v in all_voices if v["Locale"].lower().startswith("ne")]
        if nepali:
            print("Available Nepali voices:")
            for v in nepali:
                print(f"  {v['ShortName']:40s}  {v['Gender']}")
        else:
            print("No Nepali voices found (edge-tts may need updating: pip install -U edge-tts)")
        return

    voice = VOICES[args.voice]
    rate  = args.rate

    # Locate files relative to this script
    script_dir = os.path.dirname(os.path.abspath(__file__))
    repo_root  = os.path.dirname(script_dir)
    ts_path    = os.path.join(repo_root, "lib", "bookText.ts")
    out_dir    = os.path.join(repo_root, "public", "audio")

    if not os.path.exists(ts_path):
        print(f"ERROR: bookText.ts not found at {ts_path}")
        sys.exit(1)

    os.makedirs(out_dir, exist_ok=True)

    book = parse_book_text(ts_path)
    if not book:
        print("ERROR: no pages parsed from bookText.ts — check the regex.")
        sys.exit(1)

    if args.pages:
        requested = {int(p.strip()) for p in args.pages.split(",")}
        book = {p: t for p, t in book.items() if p in requested}
        missing = requested - set(book)
        if missing:
            print(f"WARNING: pages not found in bookText.ts: {sorted(missing)}")

    print(f"Voice : {voice}")
    print(f"Rate  : {rate}")
    print(f"Pages : {len(book)}")
    print(f"Output: {out_dir}")
    print()

    ok = skipped = failed = 0
    for page in sorted(book):
        result = await generate_page(page, book[page], voice, rate, out_dir, args.overwrite)
        if result:
            out_path = os.path.join(out_dir, f"page-{page}.mp3")
            if os.path.exists(out_path):
                ok += 1
            else:
                skipped += 1
        else:
            failed += 1

    print()
    print(f"Done — generated: {ok}  skipped: {skipped}  failed: {failed}")
    if failed:
        print("Tip: re-run with --pages to retry individual pages.")
    total_mb = sum(
        os.path.getsize(os.path.join(out_dir, f))
        for f in os.listdir(out_dir)
        if f.endswith(".mp3")
    ) / (1024 * 1024)
    print(f"Total audio size: {total_mb:.1f} MB in {out_dir}")


if __name__ == "__main__":
    asyncio.run(main())
