"""Parse Monster Manual stat blocks out of the extracted OCR text and
name them by fingerprint-matching against the SRD monster database.

OCR'd stats (abilities, HP, CR) form a near-unique fingerprint per
monster, so SRD-matched blocks adopt the SRD's clean canonical data.
Unmatched blocks (non-SRD monsters) keep cleaned OCR values and the
name line preceding the block, flagged for manual review.

Usage: python parse_mm_statblocks.py <mm_text.txt> <srd_monsters.json> <out.json>
"""

import json
import os
import re
import sys

SIZES = ("Tiny", "Small", "Medium", "Large", "Huge", "Gargantuan")
ABILITIES = ("STR", "DEX", "CON", "INT", "WIS", "CHA")

# OCR confuses these inside numbers.
DIGIT_FIXES = str.maketrans({"l": "1", "I": "1", "O": "0", "o": "0"})


def to_int(raw: str) -> int | None:
    cleaned = raw.translate(DIGIT_FIXES)
    return int(cleaned) if cleaned.isdigit() else None


def parse_cr(raw: str) -> float | None:
    cleaned = raw.translate(DIGIT_FIXES).strip()
    if "/" in cleaned:
        num, _, den = cleaned.partition("/")
        if num.isdigit() and den.isdigit() and int(den) != 0:
            return int(num) / int(den)
        return None
    return float(cleaned) if cleaned.isdigit() else None


def looks_like_name(line: str) -> bool:
    line = line.strip()
    if not (3 <= len(line) <= 40) or line.endswith((".", ",", ":")):
        return False
    if "PAGE" in line or "=" in line:
        return False
    letters = [c for c in line if c.isalpha()]
    if len(letters) < 3 or len(letters) / max(len(line), 1) < 0.7:
        return False
    upper = sum(1 for c in letters if c.isupper())
    return upper / len(letters) > 0.6


def clean_name(line: str) -> str:
    words = re.sub(r"[^A-Za-z\- ']+", " ", line).split()
    return " ".join(w.capitalize() for w in words)


def parse_blocks(text: str):
    page_starts = [
        (m.start(), int(m.group(1)))
        for m in re.finditer(r"===== PAGE (\d+) =====", text)
    ]

    def page_of(pos: int) -> int:
        page = 0
        for start, num in page_starts:
            if start > pos:
                break
            page = num
        return page

    # OCR sometimes splits size words ("Med ium") and mangles the
    # alignment tail, so allow one optional space between letters and
    # any short tail after the comma.
    fuzzy_sizes = "|".join(r"\s?".join(size) for size in SIZES)
    size_re = re.compile(
        rf"(?m)^.{{0,2}}({fuzzy_sizes})\s+([A-Za-z()\-' ]+?),(.{{0,40}})$"
    )
    anchors = [(m.start(), m) for m in size_re.finditer(text)]

    # Secondary anchor: an Armor Class line with no size line shortly
    # before it (block whose size/type line was lost to OCR).
    ac_re = re.compile(r"A\w{0,2}mor\s*C\w?lass\s*[\dlIO]+")
    for ac_m in ac_re.finditer(text):
        preceding = text[max(0, ac_m.start() - 300) : ac_m.start()]
        if not size_re.search(preceding):
            anchors.append((ac_m.start(), None))
    anchors.sort(key=lambda a: a[0])

    blocks = []
    for idx, (start, anchor) in enumerate(anchors):
        end = anchors[idx + 1][0] if idx + 1 < len(anchors) else len(text)
        window = text[start : min(end, start + 3000)]

        ac_m = re.search(r"A\w{0,2}mor\s*C\w?lass\s*([\dlIO]+)", window)
        hp_m = re.search(r"Hit\s*Po\w{0,4}\s*([\dlIO]+)", window)
        speed_m = re.search(r"Speed\s*([^\n]+)", window)
        cr_m = re.search(r"Challenge\s*([\dlIO/]+)", window)

        scores = {}
        for ability in ABILITIES:
            a_m = re.search(rf"{ability}\s*\n?\s*([\dlIO]+)\s*\(", window)
            scores[ability] = to_int(a_m.group(1)) if a_m else None

        # Name candidate: nearest plausible line above the size line.
        before = text[max(0, start - 200) : start]
        name = None
        for line in reversed(before.splitlines()):
            if line.strip() and looks_like_name(line):
                name = clean_name(line)
                break

        blocks.append(
            {
                "page": page_of(start),
                "nameCandidate": name,
                "size": anchor.group(1).replace(" ", "") if anchor else None,
                "type": anchor.group(2).strip() if anchor else None,
                "armorClass": to_int(ac_m.group(1)) if ac_m else None,
                "hitPoints": to_int(hp_m.group(1)) if hp_m else None,
                "speed": re.sub(r"\s+", " ", speed_m.group(1)).strip(" ,")
                if speed_m
                else None,
                "challengeRating": parse_cr(cr_m.group(1)) if cr_m else None,
                **{a.lower(): v for a, v in scores.items()},
            }
        )
    return blocks


def srd_speed(speed: dict) -> str:
    parts = []
    for mode, value in speed.items():
        if isinstance(value, str):
            parts.append(value if mode == "walk" else f"{mode} {value}")
        else:
            parts.append(mode)
    return ", ".join(parts)


def load_srd(path: str):
    monsters = json.load(open(path, encoding="utf-8"))
    entries = []
    for m in monsters:
        # The SRD splits the vampire into three shape forms.
        if m["name"] in ("Vampire, Bat Form", "Vampire, Mist Form"):
            continue
        if m["name"] == "Vampire, Vampire Form":
            m = {**m, "name": "Vampire"}
        ac = m["armor_class"][0]["value"] if m.get("armor_class") else None
        entries.append(
            {
                "name": m["name"],
                "size": m["size"],
                "type": m["type"],
                "armorClass": ac,
                "hitPoints": m["hit_points"],
                "speed": srd_speed(m.get("speed", {})),
                "strength": m["strength"],
                "dexterity": m["dexterity"],
                "constitution": m["constitution"],
                "intelligence": m["intelligence"],
                "wisdom": m["wisdom"],
                "charisma": m["charisma"],
                "challengeRating": m["challenge_rating"],
            }
        )
    return entries


FIELD_PAIRS = [
    ("hitPoints", "hitPoints"),
    ("challengeRating", "challengeRating"),
    ("armorClass", "armorClass"),
    ("str", "strength"),
    ("dex", "dexterity"),
    ("con", "constitution"),
    ("int", "intelligence"),
    ("wis", "wisdom"),
    ("cha", "charisma"),
]


def match_score(block: dict, srd: dict) -> int:
    return sum(
        1
        for bf, sf in FIELD_PAIRS
        if block.get(bf) is not None and block[bf] == srd[sf]
    )


def main() -> None:
    text_path, srd_path, out_path = sys.argv[1], sys.argv[2], sys.argv[3]
    text = open(text_path, encoding="utf-8").read()
    blocks = parse_blocks(text)
    srd = load_srd(srd_path)
    srd_by_name = {e["name"].lower(): e for e in srd}

    overrides_path = os.path.join(
        os.path.dirname(os.path.abspath(__file__)), "mm_name_overrides.json"
    )
    curation = json.load(open(overrides_path, encoding="utf-8"))
    overrides = curation["overrides"]
    override_map = {(o["page"], o["hitPoints"]): o for o in overrides}

    for block in blocks:
        override = override_map.get((block["page"], block["hitPoints"]))
        if override:
            block["nameCandidate"] = override["name"]
            for field, value in override.get("fixes", {}).items():
                key = {"str": "str"}.get(field, field)
                block[key] = value

    results = []
    unmatched = []
    for block in blocks:
        # Curated name that exists in the SRD: adopt the clean SRD data.
        candidate = (block["nameCandidate"] or "").lower()
        if candidate in srd_by_name:
            results.append({**srd_by_name[candidate], "source": "srd"})
            continue
        best, best_score = None, 0
        for entry in srd:
            score = match_score(block, entry)
            if score > best_score:
                best, best_score = entry, score
        if best is not None and best_score >= 7:
            results.append({**best, "source": "srd"})
        else:
            unmatched.append(block)
            if all(
                block.get(k) is not None
                for k in (
                    "size",
                    "type",
                    "armorClass",
                    "hitPoints",
                    "speed",
                    "challengeRating",
                    "str",
                    "dex",
                    "con",
                    "int",
                    "wis",
                    "cha",
                )
            ):
                results.append(
                    {
                        "name": block["nameCandidate"]
                        or f"UNKNOWN (page {block['page']})",
                        "size": block["size"],
                        "type": block["type"],
                        "armorClass": block["armorClass"],
                        "hitPoints": block["hitPoints"],
                        "speed": block["speed"],
                        "strength": block["str"],
                        "dexterity": block["dex"],
                        "constitution": block["con"],
                        "intelligence": block["int"],
                        "wisdom": block["wis"],
                        "charisma": block["cha"],
                        "challengeRating": block["challengeRating"],
                        "source": f"pdf-page-{block['page']}",
                    }
                )

    for entry in curation.get("additions", []):
        results.append({**entry, "source": "manual"})

    # The PDF's last third (pages 268-380) lost its text layer to file
    # truncation; fill those gaps with SRD monsters not already present.
    have = {r["name"].lower() for r in results}
    for entry in srd:
        if entry["name"].lower() not in have:
            results.append({**entry, "source": "srd-gapfill"})

    # Dedupe by name, keep first (PDF/curated beats gapfill).
    seen = set()
    deduped = []
    for r in results:
        key = r["name"].lower()
        if key not in seen:
            seen.add(key)
            deduped.append(r)
    deduped.sort(key=lambda r: r["name"])

    json.dump(deduped, open(out_path, "w", encoding="utf-8"), indent=2)
    srd_count = sum(1 for r in deduped if r["source"] == "srd")
    gapfill = sum(1 for r in deduped if r["source"] == "srd-gapfill")
    pdf_count = len(deduped) - srd_count - gapfill
    print(f"blocks parsed: {len(blocks)}")
    print(
        f"output monsters: {len(deduped)} "
        f"(srd: {srd_count}, pdf-only: {pdf_count}, srd-gapfill: {gapfill})"
    )
    print(f"\nunmatched blocks ({len(unmatched)}):")
    for b in unmatched:
        complete = all(
            b.get(k) is not None
            for k in ("armorClass", "hitPoints", "challengeRating", "str")
        )
        print(
            f"  page {b['page']:>3} | {b['nameCandidate'] or '???':<30} | "
            f"{b['size']} {b['type']} | AC {b['armorClass']} HP {b['hitPoints']} "
            f"CR {b['challengeRating']} | {'kept' if complete else 'DROPPED'}"
        )


if __name__ == "__main__":
    main()
