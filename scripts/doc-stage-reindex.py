#!/usr/bin/env python3
"""doc-stage-reindex — migrate stage vocabulary to the ratified KosmOS ladder.

Ratified 2026-09-20 (docs/foundations/06 §5.1): Mysterium's eight stages are KosmOS
altitudes L1-L8. The former `07 Turquoise` (Integral) becomes `07 Teal`, and the former
`08 White` (Super-Integral) becomes `08 Turquoise`; the harvest becomes the Violet
closure event, not a stage.

This script performs the mechanical part of that migration across ACTIVE CANON ONLY:

    White -> Turquoise        (the stage token; path-before-word order matters)
    Turquoise -> Teal
    paths: 07-turquoise -> 07-teal, 08-white -> 08-turquoise

HISTORICAL RECORDS ARE NEVER REWRITTEN. docs/archive/**, docs/audits/**,
docs/brain-game-upgrade/**, docs/agentic-loop/**, docs/research/**, docs/superpowers/**,
docs/validation/**, docs/CHANGELOG.md, and docs/PROGRESS.md describe the state at a date and
must keep their original vocabulary (CONSTITUTION rule 5 spirit: history is preserved).
docs/foundations/06 is EXCLUDED: it is the doc that *defines* the re-index, so its prose
about the retirement of `White` and the old file names is intentional, not stale.

Usage:
    python3 scripts/doc-stage-reindex.py            # dry run: report only
    python3 scripts/doc-stage-reindex.py --apply    # write changes
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DOCS = ROOT / "docs"

# --- active canon -------------------------------------------------------------------
INCLUDE_DIRS = [
    "stages",
    "lines",
    "progression",
    "narrative",
    "architecture",
    "foundations",
    "concept-drafts",
]
INCLUDE_FILES = [
    "00-vision.md",
    "01-first-principles.md",
    "02-glossary.md",
    "03-research-methodology.md",
    "REQUIREMENTS.md",
    "INDEX.md",
    "ONBOARDING-REDESIGN-PLAN.md",
    "DEVELOPMENT-PLAN.md",
    "RED-TEAM-AUDIT-DEFINITIVE.md",
]

# search paths that are historical records or the vocabulary's own definition, never rewritten
EXCLUDE_PREFIXES = (
    "archive/",
    "audits/",
    "brain-game-upgrade/",
    "agentic-loop/",
    "research/",
    "superpowers/",
    "validation/",
)
EXCLUDE_FILES = {
    "CHANGELOG.md",
    "PROGRESS.md",
    # canon home of the migration itself: its prose about `White` retiring is intentional
    "foundations/06-law-of-one-correspondence.md",
    "foundations/23-polarity-ontology.md",  # handled separately: hand-reviewed (64 cells)
}

# --- transformations ----------------------------------------------------------------
# 1) paths first (specific -> generic), so links stay valid
PATH_SWAPS = [
    ("07-turquoise-integral", "07-teal-integral"),
    ("08-white-superintegral", "08-turquoise-superintegral"),
    ("07-turquoise", "07-teal"),
    ("08-white", "08-turquoise"),
]

# 2) stage tokens, single pass, case-preserving
TOKEN_RE = re.compile(r"\b(White|Turquoise|white|turquoise)\b")
TOKEN_MAP = {
    "White": "Turquoise",
    "Turquoise": "Teal",
    "white": "turquoise",
    "turquoise": "teal",
}


def candidates() -> list[Path]:
    out: list[Path] = []
    for d in INCLUDE_DIRS:
        base = DOCS / d
        if base.is_dir():
            out.extend(sorted(base.rglob("*.md")))
    for f in INCLUDE_FILES:
        p = DOCS / f
        if p.is_file():
            out.append(p)
    keep: list[Path] = []
    for p in out:
        rel = p.relative_to(DOCS).as_posix()
        if rel.startswith(EXCLUDE_PREFIXES) or rel in EXCLUDE_FILES:
            continue
        keep.append(p)
    return keep


def transform(text: str) -> str:
    for old, new in PATH_SWAPS:
        text = text.replace(old, new)
    return TOKEN_RE.sub(lambda m: TOKEN_MAP[m.group(1)], text)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true", help="write changes (default: dry run)")
    args = ap.parse_args()

    files = candidates()
    changed: list[tuple[str, int]] = []
    total = 0
    for p in files:
        before = p.read_text(encoding="utf-8")
        after = transform(before)
        if after == before:
            continue
        n = sum(1 for a, b in zip(before.splitlines(), after.splitlines()) if a != b)
        changed.append((p.relative_to(DOCS).as_posix(), n))
        total += n
        if args.apply:
            p.write_text(after, encoding="utf-8")

    mode = "APPLIED" if args.apply else "DRY RUN (no files written)"
    print(f"doc-stage-reindex — {mode}")
    print(f"scanned {len(files)} active-canon files; {len(changed)} need changes; {total} lines\n")
    for rel, n in changed:
        print(f"  {n:>4}  {rel}")
    if not changed:
        print("  (nothing to do — already migrated)")
    if not args.apply and changed:
        print("\nRe-run with --apply to write.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
