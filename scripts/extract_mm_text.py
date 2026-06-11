"""Extract per-page text from the Monster Manual PDF in two-column
reading order. PyMuPDF tolerates the file's truncated xref.

Usage: python extract_mm_text.py <input.pdf> <output.txt>
"""

import sys

import pymupdf


def page_text(page: pymupdf.Page) -> str:
    midpoint = page.rect.width / 2
    blocks = page.get_text("blocks")  # (x0, y0, x1, y1, text, no, type)
    text_blocks = [b for b in blocks if b[6] == 0]
    left = sorted((b for b in text_blocks if b[0] < midpoint), key=lambda b: b[1])
    right = sorted((b for b in text_blocks if b[0] >= midpoint), key=lambda b: b[1])
    return "\n".join(b[4].rstrip() for b in left + right)


def main() -> None:
    input_path, output_path = sys.argv[1], sys.argv[2]
    doc = pymupdf.open(input_path)
    print(f"Pages: {doc.page_count}")
    parts = []
    for page in doc:
        parts.append(f"\n===== PAGE {page.number + 1} =====\n{page_text(page)}")
    with open(output_path, "w", encoding="utf-8") as f:
        f.write("\n".join(parts))
    print(f"Wrote {output_path}")


if __name__ == "__main__":
    main()
