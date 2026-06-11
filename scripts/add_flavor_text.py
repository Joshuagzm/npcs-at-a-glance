"""Attach Monster Manual lore ("flavor text"), traits, and actions
to dataset entries.

Works on the paragraph-oriented extraction (extract_mm_paragraphs.py).
For each monster parsed from the PDF we know its page; this script
drops the stat-block paragraphs (stats, traits, actions) from that
page and keeps the descriptive prose. Monsters sharing a page
(variants of one entry) share the group's lore. Entries without a
page (SRD gap-fill) keep whatever SRD description they already carry.

Usage: python add_flavor_text.py <mm_paragraphs.txt> <monster-manual.json>
"""

import json
import re
import sys

SIZES = ("Tiny", "Small", "Medium", "Large", "Huge", "Gargantuan")

# Paragraphs that belong to a stat block rather than lore.
STAT_PATTERNS = [
    rf"^({'|'.join(SIZES)})\s+\w+.*,",
    r"A\w{0,2}mor\s*C\w?lass\s*[\dlIO]",
    r"Hit\s*Po\w{0,4}\s*[\dlIO]",
    r"^Speed\s*[\dlIO]",
    r"^(STR|DEX|CON|INT|WIS|CHA)\b",
    r"^[\dlIO]{1,2}\s*\([+-]?\s*[\dlIO]+\s*\)",
    r"^(Skills|Senses|Languages|Challenge|Saving Throws)\b",
    r"^(Damage|Condition)\s+(Resistances|Immunit|Vulnerab)",
    r"^(ACTIONS|REACTIONS|LEGENDARY ACTIONS|VARIANT|LAIR ACTIONS|REGIONAL EFFECTS)",
    r"Weapon Attack:",
    r"\bHit:",
    r"DC\s*\d+",
    r"\bsaving throw",
    r"\d\s*d\s*[\dlIO]",
    r"legendary action",
    r"passive Perception",
    r"\(\d+\s*slots?\)",
    r"At will:",
    r"Challenge\s*[\dlIO]",
    # Trait/action paragraphs: "Trait Name. Sentence..." at the start.
    r"^([A-Z][\w'()/-]*\s+){0,4}[A-Z][\w'()/-]*\s*\.\s+(The|If|When|While|As|A|An|Each|Any|On|Melee|Ranged|Until|In|At)\b",
]
STAT_RES = [re.compile(p) for p in STAT_PATTERNS]


def is_lore(paragraph: str) -> bool:
    if len(paragraph) < 100:
        return False
    # Column-split continuations of trait text start mid-sentence.
    if not paragraph[0].isupper():
        return False
    letters = [c for c in paragraph if c.isalpha()]
    if not letters:
        return False
    # All-caps headings and page furniture.
    if sum(1 for c in letters if c.isupper()) / len(letters) > 0.6:
        return False
    return not any(r.search(paragraph) for r in STAT_RES)


def clean(text: str) -> str:
    text = text.replace("�", "'").replace("’", "'")
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r"\s+([,.;:!?])", r"\1", text)
    text = re.sub(r"(\w)- (\w)", r"\1\2", text)  # OCR hyphenated line breaks
    return text.strip()


# Trait/action paragraphs look like "Trait Name. Sentence..." - the
# same shape the lore filter excludes.
ENTRY_RE = re.compile(
    r"^((?:[A-Z][\w'()/-]*\s+){0,4}[A-Z][\w'()/-]*)\s*\.\s+"
    r"((?:The|If|When|While|As|A|An|Each|Any|On|Melee|Ranged|Until|In|At)\b.+)",
    re.DOTALL,
)
ACTION_HINTS = re.compile(
    r"Weapon Attack:|\bHit:|^Multiattack\b|Recharge|saving throw.*on a failed",
    re.IGNORECASE,
)


def extract_entries(
    name: str, pages: dict[int, list[str]], page: int
) -> tuple[list[dict], list[dict]]:
    """Trait and action paragraphs near the stat block that mention
    the monster. OCR noise means this is best-effort: only well-formed
    "Name. Description" paragraphs with a name mention are kept."""
    tokens = name_tokens(name)
    traits: list[dict] = []
    actions: list[dict] = []
    seen: set[str] = set()
    for p in range(page, page + 2):
        for paragraph in pages.get(p, []):
            if len(paragraph) < 60 or not any(
                t in paragraph.lower() for t in tokens
            ):
                continue
            m = ENTRY_RE.match(clean(paragraph))
            if not m:
                continue
            entry_name, description = m.group(1), m.group(2)
            if len(entry_name) > 40 or len(description) < 40:
                continue
            if entry_name.lower() in seen:
                continue
            seen.add(entry_name.lower())
            entry = {"name": entry_name, "description": description[:600]}
            if entry_name.lower() == "multiattack" or ACTION_HINTS.search(
                description
            ):
                actions.append(entry)
            else:
                traits.append(entry)
    return traits, actions


GENERIC_NAME_WORDS = {"adult", "young", "ancient", "giant", "swarm", "form"}


def name_tokens(name: str) -> list[str]:
    words = re.findall(r"[a-z-]+", name.lower())
    return [w for w in words if len(w) >= 3 and w not in GENERIC_NAME_WORDS]


def monster_lore(
    name: str, pages: dict[int, list[str]], page: int, limit: int = 1200
) -> str | None:
    """Lore paragraphs near the stat block that mention the monster.

    Entries put their lore anywhere from two pages before the block to
    the page after it, so requiring a name mention keeps a neighbouring
    entry's lore from bleeding in (singular tokens also match plurals).
    """
    tokens = name_tokens(name)
    if not tokens:
        return None
    lore = []
    for p in range(page - 2, page + 2):
        for paragraph in pages.get(p, []):
            if is_lore(paragraph) and any(
                t in paragraph.lower() for t in tokens
            ):
                lore.append(clean(paragraph))
    if not lore:
        return None
    text = " ".join(lore)
    if len(text) < 120:
        return None
    if len(text) > limit:
        cut = text.rfind(".", 0, limit)
        text = text[: cut + 1] if cut > 0 else text[:limit]
    return text


def main() -> None:
    text_path, dataset_path = sys.argv[1], sys.argv[2]
    text = open(text_path, encoding="utf-8").read()

    pages: dict[int, list[str]] = {}
    parts = re.split(r"===== PAGE (\d+) =====", text)
    for i in range(1, len(parts) - 1, 2):
        pages[int(parts[i])] = [
            p.strip() for p in parts[i + 1].split("\n\n") if p.strip()
        ]

    monsters = json.load(open(dataset_path, encoding="utf-8"))
    attached = 0
    entries_attached = 0
    for monster in monsters:
        page = monster.get("page")
        if not monster.get("flavorText"):
            if page is None:
                monster.setdefault("flavorText", None)
            else:
                lore = monster_lore(monster["name"], pages, page)
                monster["flavorText"] = lore
                if lore:
                    attached += 1
        # SRD entries already carry clean traits/actions; mine the OCR
        # only for pdf-only blocks that have none.
        if page is not None and not (
            monster.get("traits") or monster.get("actions")
        ):
            traits, actions = extract_entries(monster["name"], pages, page)
            monster["traits"] = traits
            monster["actions"] = actions
            if traits or actions:
                entries_attached += 1
        monster.setdefault("traits", [])
        monster.setdefault("actions", [])

    json.dump(monsters, open(dataset_path, "w", encoding="utf-8"), indent=2)
    total = len(monsters)
    with_flavor = sum(1 for m in monsters if m.get("flavorText"))
    with_entries = sum(
        1 for m in monsters if m.get("traits") or m.get("actions")
    )
    print(
        f"attached lore to {attached} monsters; "
        f"{with_flavor}/{total} have flavor text; "
        f"OCR traits/actions for {entries_attached}; "
        f"{with_entries}/{total} have traits or actions"
    )


if __name__ == "__main__":
    main()
