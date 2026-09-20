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
docs/CHANGELOG.md, and docs/PROGRESS.md describe the state at a date and
must keep their original vocabulary (CONSTITUTION rule 5 spirit: history is preserved).
docs/foundations/06 is EXCLUDED: it is the doc that *defines* the re-index, so its prose
about the retirement of `White` and the old file names is intentional, not stale.

HOLD CLASSES (never rewritten mechanically — reported as HELD for hand-edit):

  1. CODE-BEARING spans. The stage tokens are LIVE CODE IDENTIFIERS, not just prose:
     `src/core/assessments/<line>/white.ts` (8 modules), `type Stage = '...|Turquoise'|'White'`,
     `altitudeMin: 'White'` threshold maps, `TaskRenderers` keys, glossary data. Renaming them
     in docs alone would create doc↔code divergence; the CODE pass owns them and must land
     together with its tests. Protected: string literals, backticked identifiers, `.ts` paths,
     `key: value` data keys, union members.

  2. CLOSURE-SENSE prose. "White" is used for TWO things: the stage (→ Turquoise) and the
     harvest/closure EVENT (→ the Violet closure, 06 §5.1 / 16 §11.5). Only the stage sense is
     mechanical. Protected: post-White, beyond White, White→Harvest, White-stage gate/harvest,
     "at White stage", "closure (White)", "White = the sub-octave closure".

ONE-WAY MIGRATION — READ THIS BEFORE RUNNING TWICE.

The mapping is NOT idempotent. After a correct pass, stage 8 is named `Turquoise`, which is
exactly the token the script maps to `Teal` (stage 7's new name). A second pass therefore
**corrupts** stage 8 into `Teal` (incident 2026-09-20: 194 files; reverted from git). The
tool is one-way: a receipt is written on --apply and a re-run refuses unless --force.

Usage:
    python3 scripts/doc-stage-reindex.py            # dry run: report only
    python3 scripts/doc-stage-reindex.py --apply    # write changes (once)
    python3 scripts/doc-stage-reindex.py --force    # override the receipt guard (dangerous)
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DOCS = ROOT / "docs"

# One-way receipt: proves a pass already happened, so a re-run cannot silently corrupt.
RECEIPT = DOCS / ".doc-stage-reindex.applied"

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
# docs/validation/ is NOT excluded: BENCHMARK-ARCHITECTURE.md is live canon (audit R6).
EXCLUDE_PREFIXES = (
    "archive/",
    "audits/",
    "brain-game-upgrade/",
    "agentic-loop/",
    "research/",
    "superpowers/",
    "historical/",
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

# 3) HOLD CLASS 1 — code-bearing spans: live identifiers, owned by the code pass.
CODE_HOLD = re.compile(
    r"`[^`]*(?:White|Turquoise|white|turquoise)[^`]*`"      # backticked identifier / inline code
    r"|'\s*(?:White|Turquoise)\s*'"                          # TS string literal
    r'|\"\s*(?:White|Turquoise)\s*\"'
    r"|\b(?:white|turquoise)\.ts\b"                          # module path
    r"|\b(?:white|turquoise)\s*:\s*[0-9\[]"                 # data key -> value
    r"|'[A-Za-z]*\|\s*(?:White|Turquoise)'"                   # union member
    r"|altitudeMin\s*:\s*'(?:White|Turquoise)'"
)

# 3b) HOLD CLASS 1a — PATH fragments. PATH_SWAPS runs first, so by the time tokens are
# substituted a correct path reads `08-turquoise-superintegral.md` — and the token pass would
# then corrupt it to `08-teal-superintegral.md`. Paths are never token-substituted.
PATH_HOLD = re.compile(r"\S*0[1-8]-(?:teal|turquoise)[\w.-]*|\S*0[1-8]-(?:white|turquoise)/")

# 4) HOLD CLASS 2 — closure/harvest-sense prose: the EVENT, not the stage (→ the Violet closure)
SEMANTIC_HOLD = re.compile(
    r"post-?\s*white"
    r"|beyond\s+white"
    r"|white\s*[→>]\s*harvest"
    r"|\bwhite\s*-\s*stage\s+(?:gate|harvest)"
    r"|\bat\s+white\s+stage"
    r"|closure\s*\(\s*white\s*\)"
    r"|white\s*=\s*the\s+sub-octave"
    r"|white-stage\s+(?:gate|harvest)",
    re.IGNORECASE,
)
HOLD_RES = (PATH_HOLD, CODE_HOLD, SEMANTIC_HOLD)


def held_spans(line: str) -> list[tuple[int, int]]:
    return [m.span() for r in HOLD_RES for m in r.finditer(line)]


def sub_tokens(text: str) -> str:
    return TOKEN_RE.sub(lambda m: TOKEN_MAP[m.group(1)], text)


def sub_line(line: str) -> str:
    """Substitute stage tokens, EXCEPT inside held spans (fail-safe)."""
    spans = sorted(held_spans(line))
    if not spans:
        return sub_tokens(line)
    out: list[str] = []
    pos = 0
    for a, b in spans:
        if a < pos:
            continue
        out.append(sub_tokens(line[pos:a]))
        out.append(line[a:b])
        pos = b
    out.append(sub_tokens(line[pos:]))
    return "".join(out)


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


def transform(text: str) -> tuple[str, list[tuple[int, str]]]:
    """Returns (new_text, held_spans) where held_spans are (line_no, matched_text)."""
    for old, new in PATH_SWAPS:
        text = text.replace(old, new)
    lines = text.split("\n")
    held: list[tuple[int, str]] = []
    for i, line in enumerate(lines, 1):
        spans = sorted(held_spans(line))
        if spans:
            if sub_tokens(line) != line:
                # mixed line: some tokens substituted, held spans untouched
                for a, b in spans:
                    held.append((i, line[a:b]))
            else:
                for a, b in spans:
                    held.append((i, line[a:b]))
        lines[i - 1] = sub_line(line)
    return "\n".join(lines), held


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true", help="write changes (default: dry run)")
    ap.add_argument("--force", action="store_true", help="override the one-way receipt guard")
    args = ap.parse_args()

    if RECEIPT.exists() and not args.force:
        print(
            "REFUSED — this migration already ran "
            f"({RECEIPT.relative_to(ROOT)} exists).\n"
            "It is ONE-WAY: a second pass maps the correct stage-8 name `Turquoise` to `Teal`\n"
            "and corrupts the tree (incident 2026-09-20). If that is genuinely intended, pass\n"
            "--force; otherwise revert with `git checkout -- docs/` and re-apply once.",
            file=sys.stderr,
        )
        return 2

    files = candidates()
    changed: list[tuple[str, int]] = []
    held_report: list[tuple[str, int, str]] = []
    total = 0
    for p in files:
        before = p.read_text(encoding="utf-8")
        after, held = transform(before)
        rel = p.relative_to(DOCS).as_posix()
        for ln, tok in held:
            held_report.append((rel, ln, tok))
        if after == before:
            continue
        n = sum(1 for a, b in zip(before.splitlines(), after.splitlines()) if a != b)
        changed.append((rel, n))
        total += n
        if args.apply:
            p.write_text(after, encoding="utf-8")

    if args.apply:
        import subprocess

        try:
            rev = subprocess.run(
                ["git", "rev-parse", "--short", "HEAD"],
                cwd=ROOT,
                capture_output=True,
                text=True,
                check=False,
            ).stdout.strip() or "unknown"
        except OSError:
            rev = "unknown"
        RECEIPT.write_text(
            f"# doc-stage-reindex receipt — ONE-WAY migration, do not re-run\n"
            f"applied_at: {__import__('datetime').datetime.now().isoformat(timespec='seconds')}\n"
            f"base_rev: {rev}\n"
            f"files_changed: {len(changed)}\n"
            f"lines_changed: {total}\n",
            encoding="utf-8",
        )

    mode = "APPLIED" if args.apply else "DRY RUN (no files written)"
    print(f"doc-stage-reindex — {mode}")
    print(f"scanned {len(files)} active-canon files; {len(changed)} need changes; {total} lines\n")
    for rel, n in changed:
        print(f"  {n:>4}  {rel}")
    if not changed:
        print("  (nothing to do — already migrated)")
    print(f"\nHELD — {len(held_report)} code-bearing / closure-sense spans (hand-edit required):")
    for rel, ln, tok in held_report:
        print(f"  {rel}:{ln}  [{tok.strip()[:72]}]")
    if not args.apply and changed:
        print("\nRe-run with --apply to write.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
