# Monster Manual extraction pipeline

Extracts 5e stat blocks from a personal copy of the Monster Manual PDF
into `frontend/public/monster-manual.json`, which the NPC stat block
picker uses instead of the SRD API when present. The PDF and all
derived data live in `resources/` and are **gitignored** — the Monster
Manual is copyrighted, so the dataset must never be committed or
published; only this tooling is.

Requires Python 3 with `pymupdf` and `pikepdf` (`pip install pymupdf pikepdf`).

```sh
# 1. Repair the PDF if it is truncated/damaged (skip if it opens fine).
#    Scavenges surviving objects and grafts a synthetic page tree.
python scripts/repair_mm_pdf.py resources/monster_manual_5e.pdf resources/mm_repaired.pdf
python -c "import pikepdf; pikepdf.open('resources/mm_repaired.pdf').save('resources/mm_clean.pdf')"

# 2. Extract per-page text in two-column reading order.
python scripts/extract_mm_text.py resources/mm_clean.pdf resources/mm_text.txt

# 3. Parse stat blocks, name them, and build the dataset.
#    - OCR'd stats are fingerprint-matched against the SRD database
#      (resources/srd_monsters.json, from the 5e-bits/5e-database repo);
#      matches adopt clean SRD data.
#    - mm_name_overrides.json curates names/fixes for non-SRD blocks.
#    - SRD monsters missing from the parse are appended as gap-fill
#      (the current source PDF is truncated: pages 268-380 have no
#      text layer, losing late S-Z monsters and both appendices).
python scripts/parse_mm_statblocks.py resources/mm_text.txt resources/srd_monsters.json resources/monster-manual.json

# 4. Attach lore ("flavor text") plus traits and actions. Uses a
#    paragraph-oriented extraction; lore is matched to each monster by
#    name mentions within +/-2 pages of its stat block. SRD-sourced
#    entries get traits/actions from the SRD database; pdf-only blocks
#    get best-effort OCR-mined ones.
python scripts/extract_mm_paragraphs.py resources/mm_clean.pdf resources/mm_paragraphs.txt
python scripts/add_flavor_text.py resources/mm_paragraphs.txt resources/monster-manual.json

# 5. Review and install.
python scripts/report_dataset.py resources/monster-manual.json
cp resources/monster-manual.json frontend/public/monster-manual.json
```

With an undamaged PDF, re-run steps 2-4 against it directly; the
gap-fill entries will be replaced by real parsed blocks automatically.
