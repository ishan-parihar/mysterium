#!/usr/bin/env python3
"""doc-path-reindex — rewrite links after the structural move (P3/P6, 2026-09-20).

The structural transmutation moved the flat `docs/architecture/` set into organ pools under
`docs/system/sub-systems/`, replaced the architecture overview with `docs/system/AGENTS.md`, moved
the validation benchmark into its organ, and quarantined the dormant directories under
`docs/historical/`. Every reference to an old path is rewritten here.

Unlike `doc-stage-reindex.py` (whose chained renaming is ONE-WAY and receipt-guarded for that
reason), this mapping is **idempotent**: no new path contains an old path as a substring, so a
second pass is a no-op. It is still receipt-guarded, because the cost of being wrong is the same
class of silent corruption.

Historical records are NOT rewritten: they describe where a file lived at a date.

Usage:
    python3 scripts/doc-path-reindex.py            # dry run: report only
    python3 scripts/doc-path-reindex.py --apply    # write changes

The map has TWO tables: `PATH_MAP` (bare whole-path rewrites from the P3 move) and `SHORT_MAP`
(backtick-anchored rewrites of the short citation forms — `combat/02`, `validation/02`,
`progression/06` — that the P3 move left behind). Both are idempotent; read `SHORT_MAP`'s comment
for why its keys are anchored.
"""
# @script-status: historical — the one-way path rewrite for the P3 structural move
#                              (`docs/architecture/` -> `docs/system/sub-systems/`). It was applied
#                              when that move landed; the old paths it maps no longer exist, so a
#                              re-run can only corrupt live links. A receipt guards it. Superseded by
#                              the tree as it now stands; retired by RT-ARCHIVE-MIGRATIONS.

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DOCS = ROOT / "docs"
RECEIPT = DOCS / ".doc-path-reindex.applied"

# Old path -> new path. Longer/more specific entries first.
PATH_MAP: list[tuple[str, str]] = [
    # the architecture set -> organ pools
    ("docs/architecture/10-stage-assessment-architecture", "docs/system/sub-systems/kernel/stage-assessment-architecture"),
    ("architecture/10-stage-assessment-architecture", "docs/system/sub-systems/kernel/stage-assessment-architecture"),
    ("docs/architecture/02-core-engine", "docs/system/sub-systems/kernel/core-engine"),
    ("architecture/02-core-engine", "docs/system/sub-systems/kernel/core-engine"),
    ("docs/architecture/03-encounter-system", "docs/system/sub-systems/catalyst/encounter-system"),
    ("architecture/03-encounter-system", "docs/system/sub-systems/catalyst/encounter-system"),
    ("docs/architecture/05-shadow-work", "docs/system/sub-systems/catalyst/shadow-work"),
    ("architecture/05-shadow-work", "docs/system/sub-systems/catalyst/shadow-work"),
    ("docs/architecture/06-polarity-engine", "docs/system/sub-systems/catalyst/polarity-engine"),
    ("architecture/06-polarity-engine", "docs/system/sub-systems/catalyst/polarity-engine"),
    ("docs/architecture/04-curriculum-system", "docs/system/sub-systems/curriculum/curriculum-system"),
    ("architecture/04-curriculum-system", "docs/system/sub-systems/curriculum/curriculum-system"),
    ("docs/architecture/11-curriculum-authoring", "docs/system/sub-systems/curriculum/curriculum-authoring"),
    ("architecture/11-curriculum-authoring", "docs/system/sub-systems/curriculum/curriculum-authoring"),
    ("docs/architecture/07-llm-integration", "docs/system/sub-systems/orchestration/llm-integration"),
    ("architecture/07-llm-integration", "docs/system/sub-systems/orchestration/llm-integration"),
    ("docs/architecture/08-persistence", "docs/system/sub-systems/persistence/persistence"),
    ("architecture/08-persistence", "docs/system/sub-systems/persistence/persistence"),
    ("docs/architecture/09-rendering-layer", "docs/system/sub-systems/presentation/rendering-layer"),
    ("architecture/09-rendering-layer", "docs/system/sub-systems/presentation/rendering-layer"),
    ("docs/architecture/00-mysterium-identity", "docs/system/00-identity"),
    ("architecture/00-mysterium-identity", "docs/system/00-identity"),
    # the overview dissolved into the system router
    ("docs/architecture/01-overview", "docs/system/AGENTS.md"),
    ("architecture/01-overview", "docs/system/AGENTS.md"),
    # the validation benchmark -> the validation organ
    ("docs/validation/BENCHMARK-ARCHITECTURE", "docs/system/sub-systems/validation/benchmark-architecture"),
    ("validation/BENCHMARK-ARCHITECTURE", "docs/system/sub-systems/validation/benchmark-architecture"),
    # quarantined material -> docs/historical/
    ("docs/RED-TEAM-AUDIT-DEFINITIVE.md", "docs/historical/audits/RED-TEAM-AUDIT-DEFINITIVE.md"),
    ("docs/PROGRESS.md", "docs/historical/PROGRESS.md"),
    ("docs/agentic-loop/", "docs/historical/agentic-loop/"),
    ("docs/brain-game-upgrade/", "docs/historical/brain-game-upgrade/"),
    ("docs/superpowers/", "docs/historical/superpowers/"),
    ("docs/research/", "docs/historical/research/"),
    ("docs/archive/", "docs/historical/archive/"),
    ("`archive/", "`docs/historical/archive/"),
]

# Short-form dead references (added 2026-09-20, KB-UTILITIES-AUDIT RT-DEADREFS).
#
# Why these are BACKTICK-ANCHORED while PATH_MAP's entries are bare strings: these keys are short
# suffixes (`lines/00`, `stages/08`) that occur as substrings of their own live targets, so a bare
# .replace() would rewrite `docs/lines/00-overview-multi-line.md` into garbage. Including the
# closing backtick makes each key match only the standalone citation form, which also keeps the
# mapping idempotent: no new target text contains a key (`.../00-overview...` does not end in a
# backtick right after `00`). Keys WITH a file extension must precede their short forms.
SHORT_MAP: list[tuple[str, str]] = [
    # progression/ -> the docs/progression/ survivors and the foundations that inherited each lateral
    ("`progression/00-progression-overview.md`", "`docs/progression/00-progression-overview.md`"),
    ("`progression/03`", "`docs/foundations/42-developmental-levelling-mechanism.md`"),
    ("`progression/04-line-balancing-and-altitude.md`", "`docs/foundations/25-cumulative-consciousness-index.md`"),
    ("`progression/05-shadow-work-and-regression.md`", "`docs/foundations/10-shadow-and-pathology.md`"),
    ("`progression/06`", "`docs/foundations/04-states-of-consciousness.md`"),
    # combat/ -> the assessment-module spine (MY-AD-0001) and the probe/modality owners
    ("`combat/02-cognitive-task-library.md`", "`docs/foundations/12-drive-assessment-mechanics.md`"),
    ("`combat/02`", "`docs/foundations/12-drive-assessment-mechanics.md`"),
    ("`combat/03-skill-tree-architecture.md`", "`docs/system/sub-systems/kernel/stage-assessment-architecture.md`"),
    ("`combat/06`", "`docs/foundations/11-game-modalities.md`"),
    ("`combat/`", "`docs/system/sub-systems/kernel/stage-assessment-architecture.md`"),
    # ux/ -> the presentation organ
    ("`ux/02-skill-tree-visualisation.md`", "`docs/system/sub-systems/presentation/rendering-layer.md`"),
    ("`ux/01`", "`docs/system/sub-systems/presentation/rendering-layer.md`"),
    # validation/ -> the validation organ, and the ethics contract that did not exist
    ("`validation/02-ethics-and-data-privacy.md`", "`docs/system/sub-systems/safety/ethics-and-data-privacy.md`"),
    ("`validation/02`", "`docs/system/sub-systems/safety/ethics-and-data-privacy.md`"),
    ("`validation/00`", "`docs/system/sub-systems/validation/benchmark-architecture.md`"),
    ("`validation/01`", "`docs/system/sub-systems/validation/benchmark-architecture.md`"),
    # architecture/ (bare, pre-P3 numbering)
    ("`architecture/10`", "`docs/system/sub-systems/kernel/stage-assessment-architecture.md`"),
    # stages/ and lines/ short forms
    ("`stages/altitude.md`", "`docs/foundations/02-eight-stages-overview.md`"),
    ("`stages/framework-density.md`", "`docs/foundations/06-law-of-one-correspondence.md`"),
    ("`stages/08-turquoise-superintegral.md`", "`docs/stages/08-turquoise-superintegral.md`"),
    ("`stages/01-infrared-archaic.md`", "`docs/stages/01-infrared-archaic.md`"),
    ("`stages/08`", "`docs/stages/08-turquoise-superintegral.md`"),
    ("`lines/00`", "`docs/lines/00-overview-multi-line.md`"),
    ("`lines/05`", "`docs/lines/05-spiritual.md`"),
    ("`narrative/00-narrative-architecture.md`", "`docs/narrative/00-narrative-architecture.md`"),
    ("`narrative/00`", "`docs/narrative/00-narrative-architecture.md`"),
    ("`narrative/03`", "`docs/narrative/00-narrative-architecture.md`"),
]

INCLUDE_DIRS = ["foundations", "lines", "stages", "narrative", "progression", "concept-drafts", "system"]
INCLUDE_FILES = [
    "00-vision.md",
    "01-first-principles.md",
    "02-glossary.md",
    "03-research-methodology.md",
    "REQUIREMENTS.md",
    "DEVELOPMENT-PLAN.md",
    "ONBOARDING-REDESIGN-PLAN.md",
    "ARCHITECTURE-TRANSMUTATION-PLAN.md",
    "CHANGELOG.md",
]
EXCLUDE_PREFIXES = ("audits/", "historical/")


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
    return [p for p in out if not p.relative_to(DOCS).as_posix().startswith(EXCLUDE_PREFIXES)]


def write_targets(files: list[Path]) -> list[Path]:
    """Files eligible for ANY rewrite. Records and the move plan are all excluded (see `excluded`)."""
    return [p for p in files if not excluded(p.relative_to(DOCS).as_posix())]


# Files where an old path IS the subject matter, not a citation. `SHORT_MAP` is NOT applied to
# them: a record that documents "`combat/03-skill-tree-architecture.md` resolves to nothing" is
# falsified the moment its example is rewritten, and ARCHITECTURE-TRANSMUTATION-PLAN describes
# where files lived BEFORE the move. PATH_MAP still applies (their live cross-links must be current).
EXCLUDE_EXACT = (
    "ARCHITECTURE-TRANSMUTATION-PLAN.md",
)


def excluded(rel: str) -> bool:
    """True for files whose subject matter IS the old paths (records + the move's own plan)."""
    return rel in EXCLUDE_EXACT or "/core/" in rel or rel.startswith("system/core/")


def transform(text: str, short: bool = True) -> str:
    for old, new in PATH_MAP:
        text = text.replace(old, new)
    if short:
        for old, new in SHORT_MAP:
            text = text.replace(old, new)
    return text


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true")
    ap.add_argument("--force", action="store_true", help="override the receipt guard")
    args = ap.parse_args()

    if RECEIPT.exists() and not args.force:
        print(
            f"REFUSED — {RECEIPT.relative_to(ROOT)} exists; this migration already ran. "
            "The mapping is idempotent, so a re-run is a no-op — if you are sure, pass --force.",
            file=sys.stderr,
        )
        return 2

    all_files = candidates()
    files = write_targets(all_files)
    print(f"excluded (records + move plan): {len(all_files) - len(files)} files", file=sys.stderr)
    changed: list[tuple[str, int]] = []
    total = 0
    for p in files:
        before = p.read_text(encoding="utf-8")
        relp = p.relative_to(DOCS).as_posix()
        after = transform(before, short=not excluded(relp))
        if after == before:
            continue
        n = sum(1 for a, b in zip(before.splitlines(), after.splitlines()) if a != b)
        changed.append((p.relative_to(DOCS).as_posix(), n))
        total += n
        if args.apply:
            p.write_text(after, encoding="utf-8")

    mode = "APPLIED" if args.apply else "DRY RUN (no files written)"
    print(f"doc-path-reindex — {mode}")
    print(f"scanned {len(files)} files; {len(changed)} need changes; {total} lines\n")
    for rel, n in changed:
        print(f"  {n:>4}  {rel}")
    if args.apply:
        RECEIPT.write_text(
            "doc-path-reindex applied 2026-09-20 (structural move P3/P6); idempotent mapping\n",
            encoding="utf-8",
        )
    elif changed:
        print("\nRe-run with --apply to write.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
