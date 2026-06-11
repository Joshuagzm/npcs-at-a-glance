"""Extract per-page text as paragraphs (PyMuPDF text blocks) in
two-column reading order. Unlike extract_mm_text.py (line-oriented,
for stat block parsing), this keeps paragraph boundaries so lore can
be separated from stat-block traits.

Usage: python extract_mm_paragraphs.py <input.pdf> <output.txt>
"""

import re
import sys

import pymupdf


def page_paragraphs(page: pymupdf.Page) -> list[str]:
    midpoint = page.rect.width / 2
    blocks = page.get_text("blocks")
    text_blocks = [b for b in blocks if b[6] == 0]
    left = sorted((b for b in text_blocks if b[0] < midpoint), key=lambda b: b[1])
    right = sorted((b for b in text_blocks if b[0] >= midpoint), key=lambda b: b[1])
    paragraphs = []
    for b in left + right:
        text = re.sub(r"\s+", " ", b[4]).strip()
        if text:
            paragraphs.append(text)
    return paragraphs


def main() -> None:
    input_path, output_path = sys.argv[1], sys.argv[2]
    doc = pymupdf.open(input_path)
    parts = []
    for page in doc:
        body = "\n\n".join(page_paragraphs(page))
        parts.append(f"===== PAGE {page.number + 1} =====\n{body}")
    with open(output_path, "w", encoding="utf-8") as f:
        f.write("\n\n".join(parts))
    print(f"Wrote {output_path}")


if __name__ == "__main__":
    main()
