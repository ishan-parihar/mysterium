#!/usr/bin/env python3
"""code-stage-reindex — the CODE half of the 2026-09-20 ladder re-index (CODE-PASS).

`doc-stage-reindex.py` migrated active canon prose. It deliberately HELD the code-bearing
spans, because the stage tokens are live CODE IDENTIFIERS, not just words: renaming them in
docs alone would have created doc<->code divergence. This is that held half.

Ratified ladder (docs/foundations/06 §5.1, KosmOS `_Ontology/stages/altitude.md`):

    former 07 Turquoise (Integral)       -> 07 Teal
    former 08 White (Super-Integral)     -> 08 Turquoise
    the harvest                          -> the Violet closure EVENT, not a stage

The mapping, applied in THIS ORDER (path-before-word; the order is load-bearing):

    1. turquoise -> teal          (identifier, path segment, data key)
    2. white     -> turquoise

Applied in the other order, step 2 would rename stage 8 onto a name step 1 then renames again
— the same non-idempotence incident that cost 194 files on the doc side (MY-RG-0001).

PROTECTED (never rewritten):

  1. `white-space` / `whitespace` — CSS properties, not stage tokens.
  2. `-for-` / `-dual-` id segments — matched by the abbreviation sweep but not stage names.
  3. `delegate.ts`'s veil-leak regex — its `White` is simultaneously a STAGE name and a COLOUR
     word the veil must block. Hand-edited (Teal is added, White is retained); see the note in
     that file. Rewriting it mechanically would drop coverage.
  4. The RAY BINDINGS (`Ray.ts`, `registries/stages/0[67]*.module.ts`). The mechanical pass
     produces `Teal: 'Indigo', Turquoise: 'Violet'`, which is WRONG: per the ray lens
     (`06 §5.1`, KosmOS `_Ontology/lenses/rays.md`) Turquoise is Indigo 6b and the Violet ray
     belongs to the closure event. Reported as HELD for hand-edit.

ONE-WAY MIGRATION — READ BEFORE RUNNING TWICE.

Not idempotent, for the same reason as the doc half: after a correct pass, stage 8 reads
`Turquoise`, which is exactly the token step 1 maps to `Teal`. A second pass corrupts stage 8.
A receipt is written on --apply and a re-run refuses unless --force.

Usage:
    python3 scripts/migrations/code-stage-reindex.py            # dry run: report only
    python3 scripts/migrations/code-stage-reindex.py --apply    # write changes (once)
    python3 scripts/migrations/code-stage-reindex.py --force    # override the receipt guard (dangerous)
"""
# @script-status: one-shot — the CODE half of the 2026-09-20 ladder re-index (`doc-stage-reindex.py`
#                            holds the doc half). It rewrites stage identifiers across src/ and
#                            tests/, so it is safe only from the pre-rename state; the mapping is
#                            NOT idempotent and a receipt guards the re-run. Retired by
#                            RT-ARCHIVE-MIGRATIONS together with the doc-side scripts.

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

# `scripts/migrations/` is one level deeper than `scripts/` was: parents[0] is this
# directory, parents[1] is `scripts/`, parents[2] is the repository root.
HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
RECEIPT = HERE / "receipts" / "code-stage-reindex.json"

TEXT_ROOTS = [ROOT / "src", ROOT / "tests"]
SUFFIXES = {".ts", ".svelte", ".js", ".json"}

# Applied in order. `turquoise` before `white` — see the docstring.
MAPPING: list[tuple[str, str]] = [
    ("turquoise", "teal"),
    ("Turquoise", "Teal"),
    ("white", "turquoise"),
    ("White", "Turquoise"),
]

# Not stage tokens. `white-space` is the reason a bare `\bwhite\b` sweep is unsafe.
PROTECT = [
    re.compile(r"white-space"),
    re.compile(r"whitespace", re.IGNORECASE),
    re.compile(r"-for-"),
    re.compile(r"-dual-"),
]

# Stage-abbreviation id segments, so `cog-wht-…` (stage 8) does not keep a `wht` label after
# the module it lives in is renamed. No external reference exists to these ids (verified: zero
# hits outside src/core/assessments/), so this is a pure clarity fix.
ABBREV: list[tuple[str, str]] = [
    ("-wht-", "-turq-"),
    ("-tur-", "-teal-"),
]

# Reported as HELD: the mechanical result here would be canon-wrong; a human fixes these.
HELD_FILES = {
    "src/core/domain/Ray.ts": "ray bindings — Turquoise is Indigo 6b, not Violet (canon §5.1)",
    "src/core/registries/stages/06-turquoise.module.ts": "becomes 06-teal; ray stays Indigo",
    "src/core/registries/stages/07-white.module.ts": "becomes 07-turquoise; ray must become Indigo",
    "src/core/orchestration/delegate.ts": "veil-leak regex — White is a colour word, not only a stage",
    "src/core/engines/GreaterCycleEngine.ts": "SUBSTRATE_LAYER_LAW's D4 row names the closure event",
}

# Path renames. Order matters for the same reason as MAPPING: existing `turquoise` -> `teal`
# must land before `white` -> `turquoise`, or the second would clobber the first.
PATH_MAPPING: list[tuple[str, str]] = [
    ("/turquoise.", "/teal."),
    ("/white.", "/turquoise."),
    ("06-turquoise", "06-teal"),
    ("07-white", "07-turquoise"),
]


def protected(line: str) -> bool:
    return any(p.search(line) for p in PROTECT)


def rewrite(text: str) -> tuple[str, int]:
    """Line-wise, so a protected line is skipped whole (a `white-space` property and a stage
    token can share a file, and a sub-line split is not worth the ambiguity). Returns the new
    text and the number of lines actually changed."""
    out: list[str] = []
    hits = 0
    for line in text.splitlines(keepends=True):
        if protected(line):
            out.append(line)
            continue
        new = line
        for src, dst in MAPPING + ABBREV:
            new = new.replace(src, dst)
        if new != line:
            hits += 1
        out.append(new)
    return "".join(out), hits


def targets() -> list[Path]:
    out: list[Path] = []
    for root in TEXT_ROOTS:
        if not root.is_dir():
            continue
        for p in sorted(root.rglob("*")):
            if p.is_file() and p.suffix in SUFFIXES:
                out.append(p)
    return out


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(prog="code-stage-reindex", description=__doc__.split("\n")[0])
    ap.add_argument("--apply", action="store_true", help="write the changes (once)")
    ap.add_argument("--force", action="store_true", help="override the receipt guard (dangerous)")
    args = ap.parse_args(argv)

    if args.apply and RECEIPT.exists() and not args.force:
        prev = json.loads(RECEIPT.read_text(encoding="utf-8"))
        print(
            f"code-stage-reindex: REFUSING to re-apply. A receipt exists "
            f"({prev.get('files_changed')} files, {prev.get('applied_at')}).\n"
            f"  The mapping is NOT idempotent: a second pass renames stage 8 (`Turquoise`) into\n"
            f"  `Teal`. Pass --force only if you have reverted the tree to the pre-rename state.",
            file=sys.stderr,
        )
        return 1

    files = targets()
    changed: list[tuple[Path, int]] = []
    held: list[str] = []
    for p in files:
        rel = p.relative_to(ROOT).as_posix()
        text = p.read_text(encoding="utf-8")
        new, hits = rewrite(text)
        if rel in HELD_FILES and hits:
            held.append(f"{rel}  ({hits} line(s)) — {HELD_FILES[rel]}")
        if hits:
            changed.append((p, hits))
            if args.apply:
                p.write_text(new, encoding="utf-8")

    renamed: list[tuple[str, str]] = []
    # Path renames are computed against the CURRENT names; two-step so `turquoise`->`teal` lands
    # before `white`->`turquoise` (Microsoft-corporation ordering hazard).
    for p in sorted(files, key=lambda x: -len(x.as_posix())):
        cur = p.relative_to(ROOT).as_posix()
        new_rel = cur
        for src, dst in PATH_MAPPING:
            if src in new_rel:
                new_rel = new_rel.replace(src, dst)
                break
        if new_rel != cur:
            renamed.append((cur, new_rel))
            if args.apply and p.exists():
                dest = ROOT / new_rel
                dest.parent.mkdir(parents=True, exist_ok=True)
                p.rename(dest)

    print(f"code-stage-reindex — {'APPLY' if args.apply else 'DRY RUN'}")
    print(f"  scanned : {len(files)} file(s) under src/ + tests/")
    print(f"  content : {len(changed)} file(s) rewritten")
    print(f"  paths   : {len(renamed)} file(s) renamed")
    for cur, new_rel in renamed:
        print(f"      {cur}  ->  {new_rel}")
    if held:
        print(f"\n  HELD for hand-edit ({len(held)}) — the mechanical result is canon-wrong:")
        for h in held:
            print(f"      {h}")
    if args.apply:
        RECEIPT.parent.mkdir(parents=True, exist_ok=True)
        RECEIPT.write_text(
            json.dumps(
                {
                    "tool": "code-stage-reindex",
                    "mapping": [{"from": a, "to": b} for a, b in MAPPING],
                    "files_changed": len(changed),
                    "paths_renamed": len(renamed),
                    "held": held,
                },
                indent=2,
            )
            + "\n",
            encoding="utf-8",
        )
        print(f"\n  receipt : {RECEIPT.relative_to(ROOT).as_posix()}")
        print("  Next: hand-fix the HELD files, regenerate the corpus index, then run the battery.")
    else:
        print("\n  (dry run — pass --apply to write)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
