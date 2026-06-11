"""Print a summary of monster-manual.json for review."""

import json
import sys

data = json.load(open(sys.argv[1], encoding="utf-8"))
counts = {}
for m in data:
    src = "pdf" if m["source"].startswith("pdf") else m["source"]
    counts[src] = counts.get(src, 0) + 1
print(f"total: {len(data)}, by source: {counts}\n")
print("pdf-only entries (not in SRD):")
for m in data:
    if m["source"].startswith("pdf"):
        print(
            f"  {m['name']:<32} | {m['size']} {m['type']} | "
            f"AC {m['armorClass']} HP {m['hitPoints']} CR {m['challengeRating']}"
        )
issues = [
    m
    for m in data
    if not (5 <= (m["armorClass"] or 0) <= 25)
    or not (1 <= (m["hitPoints"] or 0) <= 700)
    or any(
        not (1 <= (m[a] or 0) <= 30)
        for a in (
            "strength",
            "dexterity",
            "constitution",
            "intelligence",
            "wisdom",
            "charisma",
        )
    )
]
print(f"\nentries with out-of-range stats: {len(issues)}")
for m in issues:
    print(f"  {m['name']} | AC {m['armorClass']} HP {m['hitPoints']}")
