"""Spot-check traits/actions for a few monsters."""

import json
import sys

data = json.load(open(sys.argv[1], encoding="utf-8"))
by = {m["name"]: m for m in data}
for n in sys.argv[2:]:
    m = by.get(n)
    if not m:
        print(f"=== {n}: NOT FOUND")
        continue
    print(f"=== {n} (source {m['source']})")
    print("traits:", [t["name"] for t in m["traits"]])
    print("actions:", [a["name"] for a in m["actions"]])
    if m["actions"]:
        first = m["actions"][0]
        print("sample action:", first["name"], "->", first["description"][:140])
    print()
