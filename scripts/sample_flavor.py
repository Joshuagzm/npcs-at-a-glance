"""Spot-check flavor text for a few monsters."""

import json
import sys

data = json.load(open(sys.argv[1], encoding="utf-8"))
by = {m["name"]: m for m in data}
for n in sys.argv[2:]:
    m = by.get(n)
    if not m:
        print(f"--- {n}: NOT FOUND")
        continue
    flavor = m.get("flavorText") or ""
    print(f"--- {n} ({'has' if flavor else 'NO'} flavor):")
    print(flavor[:400])
    print()
