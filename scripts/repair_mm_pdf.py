"""Repair the truncated Monster Manual PDF.

The file's tail (xref, trailer, catalog, page tree) is missing, but 380
plain page objects survive. This script scans for surviving objects,
appends a synthetic /Pages tree + /Catalog, and writes a classic xref
table + trailer so standard parsers can open the file.

Usage: python repair_mm_pdf.py <broken.pdf> <repaired.pdf>
"""

import re
import sys


def main() -> None:
    input_path, output_path = sys.argv[1], sys.argv[2]
    data = open(input_path, "rb").read()

    # Last occurrence wins for duplicate object numbers (newer generation).
    offsets: dict[int, int] = {}
    for m in re.finditer(rb"(?m)^(\d+)\s+0\s+obj\b", data):
        offsets[int(m.group(1))] = m.start()

    # Page objects, in object-number order.
    page_nums = []
    for m in re.finditer(rb"(?m)^(\d+)\s+0\s+obj\s*\r?\n?<<", data):
        num = int(m.group(1))
        head = data[m.start() : m.start() + 500]
        if rb"/Type/Page" in head and rb"/Type/Pages" not in head:
            page_nums.append(num)
    page_nums = sorted(set(page_nums))
    print(f"objects: {len(offsets)}, pages: {len(page_nums)}")

    pages_num = max(offsets) + 1
    catalog_num = pages_num + 1

    kids = " ".join(f"{n} 0 R" for n in page_nums)
    out = bytearray(data)
    if not out.endswith(b"\n"):
        out += b"\r\n"

    offsets[pages_num] = len(out)
    out += (
        f"{pages_num} 0 obj\r\n"
        f"<</Type/Pages/Count {len(page_nums)}/Kids[ {kids} ]>>\r\n"
        f"endobj\r\n"
    ).encode()

    offsets[catalog_num] = len(out)
    out += (
        f"{catalog_num} 0 obj\r\n"
        f"<</Type/Catalog/Pages {pages_num} 0 R>>\r\n"
        f"endobj\r\n"
    ).encode()

    # Classic xref table with one subsection per contiguous run.
    xref_start = len(out)
    nums = sorted(offsets)
    lines = [b"xref"]
    i = 0
    subsections = []
    while i < len(nums):
        j = i
        while j + 1 < len(nums) and nums[j + 1] == nums[j] + 1:
            j += 1
        subsections.append(nums[i : j + 1])
        i = j + 1
    # Object 0 must head the table as the free-list entry.
    if subsections and subsections[0][0] == 1:
        lines.append(b"0 " + str(len(subsections[0]) + 1).encode())
        lines.append(b"0000000000 65535 f ")
        for n in subsections[0]:
            lines.append(f"{offsets[n]:010d} 00000 n ".encode())
        subsections = subsections[1:]
    else:
        lines.append(b"0 1")
        lines.append(b"0000000000 65535 f ")
    for sub in subsections:
        lines.append(f"{sub[0]} {len(sub)}".encode())
        for n in sub:
            lines.append(f"{offsets[n]:010d} 00000 n ".encode())
    out += b"\r\n".join(lines) + b"\r\n"
    out += (
        f"trailer\r\n<</Size {catalog_num + 1}/Root {catalog_num} 0 R>>\r\n"
        f"startxref\r\n{xref_start}\r\n%%EOF\r\n"
    ).encode()

    open(output_path, "wb").write(out)
    print(f"Wrote {output_path} ({len(out)} bytes)")


if __name__ == "__main__":
    main()
