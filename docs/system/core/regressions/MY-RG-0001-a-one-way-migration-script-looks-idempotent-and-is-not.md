---
ID: MY-RG-0001
Title: "A one-way migration script looks idempotent and is not"
Status: Active
Date: 2026-09-20
Organ: platform
Severity: High
Source: "docs/ARCHITECTURE-TRANSMUTATION-PLAN.md §12 (Incident 1)"
Description: "doc-stage-reindex.py was applied twice in one pipeline; the second pass re-mapped the correct new stage name and corrupted 194 files."
Related: [MY-AD-0003]
---

## Symptom
After a documentation vocabulary migration, stage 8 read `Teal` everywhere: e.g.
`docs/concept-drafts/somatic/08-turquoise/module-spec.md` line 6,
`Stage: Teal (super-integral / non-dual / harvest)`. 194 files, no error, exit code 0.

## Root cause
The mapping is a **chained renaming** (White→Turquoise, Turquoise→Teal). It is therefore not
idempotent: after a correct pass, the newly-correct `Turquoise` is exactly the token that maps to
`Teal`. Nothing enforced one-way ness, and `--apply` looked like an ordinary idempotent command —
so a second invocation (used to print a different section of the report) ran live.

## What happened — Incident 1 (2026-09-20)
`python3 scripts/migrations/doc-stage-reindex.py --apply | sed -n 1,3p` followed by
`python3 scripts/migrations/doc-stage-reindex.py --apply | sed -n '/HELD/,$p'` in one shell command.      The first pass was correct; the second corrupted 194 files. Recovery: `git checkout -- docs/`,
      re-apply hand edits, re-run once.

      ## What happened — Incident 2 (2026-09-20, same day, other direction)

      After the clean re-run, a second corruption of the **same class** was found: every hand-edit made
      *before* the sweep that already contained the **new** stage name had been re-mapped by the sweep.
      The edits saying `L8 Turquoise completed`, `Teal→Turquoise`, `Stage: Turquoise (super-integral` and
      the glossary's `| Turquoise |` row came out reading `L8 Teal`, `Teal→Teal`, and `| Teal |`.
      Fourteen lines across 9 files (`16`, `17`, `19`, `20`, `21`, `stages/08`,
      `catalyst/polarity-engine`, `02-glossary`, `ONBOARDING-REDESIGN-PLAN`).

      Detection: `grep -rn "L8 Teal\|Teal→Teal" docs/`. The invariant at fault is ordering: in a chained
      renaming, **an edit made before the migration is migrated too**, so "fix the prose first, then
      sweep" is unsafe in exactly the same way as running the sweep twice.

## Detection
`grep -rn "L8 Teal\|Teal→Teal" docs/` — any hit is corruption. The script itself now refuses:
`python3 scripts/migrations/doc-stage-reindex.py` exits 2 when a receipt exists.

## Prevention
- `scripts/migrations/doc-stage-reindex.py` writes `scripts/migrations/receipts/doc-stage-reindex.json` on `--apply` and
  **refuses to re-run** (`--force` overrides, documented as dangerous).
- The one-way nature is stated in the script's first docstring paragraph.      - Class rule: a migration whose correctness depends on how many times it has run must ship with a
        receipt, and its report section must never be produced by re-running the migration.
      - Ordering rule (from Incident 2): a chained renaming runs **once, on untouched source**, and then
        hand-edits proceed **afterwards**. Where a hand-edit must precede it, the edit must avoid the
        migration's target tokens entirely (as the closure-sense edits now do — they name the *event*,
        "the Violet closure", not a stage token).
      - Files deliberately excluded from a sweep (hand-review pending) are corrected afterwards with an
        explicit single-file mode: `python3 scripts/migrations/doc-stage-reindex.py --only <path>`.

<!-- 2026-09-20: recorded Incident 2 (pre-sweep hand edits re-mapped by the chained renaming) (recon f8731f5aa2) -->
