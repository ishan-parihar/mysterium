---
ID: MY-RG-0013
Title: "A verification step mutates the artefact it verifies, or a restore discards unrelated work"
Status: Active
Date: 2026-09-20
Organ: platform
Severity: High
Source: "docs/audits/RED-TEAM-2026-09-20.md RT-5c"
Description: "Gate efficacy is proven by injecting a violation and reverting it. Done on a dirty tree with git checkout -- <file>, the revert also discards every UNCOMMITTED edit to that file. Observed twice in one session: reverting an injected violation in _org.yaml silently reverted the new canon-root rung, the DG11/DG12 gate entries, the generated: block, and the pending ledger; and reverting an injected INDEX.md restored a version that was itself stale. The verification destroyed the thing it was verifying."
Related: []
---

## The regression

Proving that a gate can fail requires injecting a violation and reverting it. When the revert is
`git checkout -- <file>` on a **dirty** tree, it restores the last committed version — discarding
every *uncommitted* edit to that file along with the injection.

**Observed (twice, one session):**

1. Reverting an injected violation in `_org.yaml` silently reverted the new `canon-root` rung, the
   `dg11_derived_surfaces` / `dg12_canon_links` gate entries, the `generated:` block, and the
   rewritten `pending:` ledger. The next `arch.py validate` looked *green and smaller* — 10 gates —
   and only a deliberate grep caught it.
2. Reverting an injected `docs/INDEX.md` restored a version that was **itself stale**, so DG11 was
   left failing for the wrong reason.

## Why it is dangerous

The failure is silent and **narrows** the check: the tool keeps passing while checking less. A
verification step that destroys the artefact under test can only ever produce false confidence.

## Prevention (procedural, encoded here)

1. Never inject into a tracked file with uncommitted edits. Either `cp` the file and restore from the
   copy **in the same command**, or commit first and use `git stash`/`git checkout` knowingly.
2. After any injection cycle, re-run the **full** gate set and confirm the gate *count* and each
   gate's inspected-file count are what they were before — not merely that exit is 0.
3. The governance gate-fixture suite (declared as `RT-GATE-FIXTURES` in `_org.yaml → pending`) must
   inject into temporary copies, so the proof stops depending on a human reverting carefully.

## References

- `docs/audits/RED-TEAM-2026-09-20.md` §2 RT-5c, §5
- `MY-RG-0010` (a gate passes because its fixture cannot fail)
- `MY-RG-0001` (a one-way migration script looks idempotent and is not)
