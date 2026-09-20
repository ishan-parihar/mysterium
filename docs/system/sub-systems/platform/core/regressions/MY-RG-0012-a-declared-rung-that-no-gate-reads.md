---
ID: MY-RG-0012
Title: "A declared rung that no gate reads"
Status: Active
Date: 2026-09-20
Organ: platform
Severity: Medium
Source: "docs/audits/RED-TEAM-2026-09-20.md RT-3"
Description: "live_files() collected whole directories and hardcoded the plans special case, so a rung declared with files: was never scanned by DG4/DG5/DG6/DG12 and its docs resolved to (unclaimed). Six root documents (00-vision, 01-first-principles, 02-glossary, 03-research-methodology, INDEX, CHANGELOG) sat outside every rung entirely."
Related: []
---

## The regression

A rung is declared in `_org.yaml` with `files:` instead of `dirs:`, and the gate layer never scans
it. The declaration reads as governance while enforcing nothing.

**Observed:** `live_files()` collected whole directories from `live_roots()` and added `plans.files`
via a hardcoded special case. Any other files-only rung contributed nothing. Six root documents —
`docs/00-vision.md`, `01-first-principles.md`, `02-glossary.md`, `03-research-methodology.md`,
`INDEX.md`, `CHANGELOG.md` — belonged to **no rung at all**: DG4/DG5/DG6/DG12 never opened them and
`arch.py route docs/00-vision.md` answered `(unclaimed)`. The vision, the first principles and the
glossary are the first documents a new agent reads.

## Prevention (executable)

`live_files()` collects `files:` from every live rung (deduplicated against directory-scanned
paths), not just `plans`. The `canon-root` rung declares the four root canon docs; `generated`
declares the derived surfaces (owned by DG11, not by DG4/DG5/DG6).

## Consequences

- A rung that no gate reads is a defect, not a declaration.
- Adding `docs/CHANGELOG.md` to a live rung would be wrong: it is a log, and `historical` (`live:
false`) is its correct home.

## References

- `docs/audits/RED-TEAM-2026-09-20.md` RT-3
- `_org.yaml` (`rungs.canon-root`, `rungs.generated`)
