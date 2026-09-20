---
ID: MY-RG-0011
Title: "A generated surface drifts and the commit still looks green"
Status: Active
Date: 2026-09-20
Organ: platform
Severity: High
Source: "docs/audits/RED-TEAM-2026-09-20.md RT-4"
Description: "docs/INDEX.md was committed declaring 'Records (0)' while 23 records existed, and naming no authority for docs/historical. Nothing detected it: the derived file belonged to no rung and no gate compared it to its regeneration. Any generated artifact can drift silently."
Related: []
---

## The regression

A generated artifact is committed without re-generating it, and nothing notices, because the
artifact belongs to no rung and no gate compares it against its own regeneration.

**Observed:** `docs/INDEX.md` was committed declaring `## Records (0)` and `| historical | ... | — |`
while 23 records existed and `_org.yaml` named `docs/historical/AGENTS.md` (a dated record, never an authority) as the `historical` rung's authority.
Re-running `arch.py emit` corrected both. The repository's own index — the first artifact an agent
opens after `AGENTS.md` — lied about the repository, and the lie was committed.

## Prevention (executable)

DG11 (`dg11_derived_surfaces`): regenerate `docs/INDEX.md` and every organ router's auto-zone in
memory, and fail when on-disk content differs. `emit` is idempotent, so equality is the invariant.
The `> Generated:` date line is excluded from the comparison by `strip_generated_date()`.

## Consequences

- `docs/INDEX.md` and `docs/system/sub-systems/*/AGENTS.md` are declared under `_org.yaml → generated`
and `route` reports them as generated rather than unowned.
- The iteration protocol (`AGENTS.md` §7.5 step 1b) requires `emit` after any change to `_org.yaml`
or to a record.

## References

- `docs/audits/RED-TEAM-2026-09-20.md` RT-4
- `MY-RG-0010` (a gate passes because its fixture cannot fail)
