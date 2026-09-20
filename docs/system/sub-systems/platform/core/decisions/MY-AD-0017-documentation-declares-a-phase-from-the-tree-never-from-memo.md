---
ID: MY-AD-0017
Title: "Documentation declares a phase from the tree, never from memory"
Status: Active
Date: 2026-09-20
Organ: platform
Source: "docs/DEVELOPMENT-PLAN.md section 2"
Description: "AGENTS.md section 4.2 declared Phase 1 current while DEVELOPMENT-PLAN section 8 recorded all nine phases implemented; DEVELOPMENT-PLAN section 2 described G-A..G-F as absent while section 8 cited the code that closed them. Both were stale from 2026-09-16 to 2026-09-20. A phase claim is now re-verified against the tree and cites its closing evidence, and no document may state a phase status it has not re-verified."
Related: ["MY-AD-0013", "MY-RG-0002"]
Consumer: "`AGENTS.md`, `docs/DEVELOPMENT-PLAN.md`"
---

## Decision

A phase claim in any document is **re-verified against the tree in the same pass that writes it**, and it
cites the code or record that evidences it. No document may state a phase status it has not re-verified
in that pass. Where a document and the tree disagree, the tree wins and the document is corrected —
the root protocol is an authority map, so a stale claim there misdirects every downstream agent with
more force than a stale claim anywhere else.

## The failure this corrects

Two documents disagreed with the tree and with each other for four days, and no gate could see it —
because every gate checks that a document is *well-formed*, and a stale phase claim is perfectly
well-formed.

| Document | Claimed | Tree said |
|---|---|---|
| `AGENTS.md` §4.2 | "Current Phase: **Phase 1** — Delegation Kernel" | all nine phases implemented; the delegation kernel ships in `src/core/orchestration/` with kernel gates G14/G15 |
| `DEVELOPMENT-PLAN.md` §2 | G-A…G-F are "spec'd but absent" | §8 of the same document cited the code that closed every one of them |

Section 2 was written 2026-09-16 and never revised as §8/§9 recorded the closures. `AGENTS.md` §4.2
inherited the staleness because it *pointed at* §2 rather than re-checking. An agent following the
root protocol would have rebuilt finished work.

The class is the same as the router-drift and dead-citation classes already guarded (`MY-RG-0002`,
`MY-RG-0016`): **a derived claim that nothing re-derives.** The difference is leverage — this one sits
in the authority map.

## What changed

- `DEVELOPMENT-PLAN.md` §2 now carries a staleness banner, names the correction, and each row cites
  its closing evidence path.
- `AGENTS.md` §4.2 is corrected and cites `MY-AD-0017`.
- The plan owns phase *order and gates*; the foundations own *contracts*. On conflict the foundations
  document wins and the plan is revised — stated in §4.2, so the resolution rule is visible where the
  phase is declared.

## References

- `docs/DEVELOPMENT-PLAN.md` §2, §8, §9
- `AGENTS.md` §4.2
- `MY-RG-0002` (stage-vocabulary drift), `MY-RG-0016` (a reference that resolves to nothing)

<!-- 2026-09-20: DG19: declare where this law is consumed, or the pending key that will consume it (recon 2b4849c6b7) -->
