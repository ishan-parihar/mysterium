---
ID: MY-AD-0024
Title: "A rung's router must name every document in its rung"
Status: Active
Date: 2026-09-20
Organ: platform
Source: "docs/foundations/AGENTS.md (canon rung router) + _org.yaml rungs.canon.router"
Description: "The file declared as a rung's authority is the only door into that rung; every live document in the rung must be named by it, and DG18 enforces this."
Related: [MY-AD-0017, MY-AD-0016, MY-RG-0022]
Consumer: "`scripts/arch.py` (gate DG18)"
---

## Context

The set is navigated through **routers**: `_org.yaml` declares a `rung`, and the rung's `authority`
file is what a reader — human or agent — actually reads to learn what the rung contains and which
document owns which concept. For the `canon` rung that file is `docs/foundations/AGENTS.md`.

Every existing gate checks documents that are *read*. None checked the map that *reaches* them. So
three ratified documents (`45`, `46`, `47` — the whole generative-world and personalization
architecture) could sit inside the canon rung, fully formed, correctly cited from `_org.yaml →
organ.contract_docs`, and still be invisible: `AGENTS.md §2.1`'s tree ended at `43` and
`docs/foundations/AGENTS.md` said "43 documents + 44". An agent following the root protocol would
never learn they existed. Report: green.

## Decision

(1) A rung may declare a `router` in `_org.yaml` (the authority file that is the door into it).
(2) Every **live** document in that rung must be **named** by its router — by its two-digit id as a
token, or inside an `NN–MM` range the router expands.
(3) `DG18` enforces this and fails closed on an unnamed document.

Naming is deliberately loose (id token *or* range) because a router is a *map*, not a manifest: it
summarises clusters (`23`–`36`) rather than enumerating every file, and that is its job. What it may
not do is silently omit a document.

## Consequences

- Positive: adding a foundation document now has a navigational obligation with a gate behind it —
the failure mode is reported at the moment of creation, not discovered by a reader a day later.
- Positive: the check is opt-in per rung (`router:` is declared, never inferred), so rungs whose
"authority" is itself an ordinary document are unaffected.
- Negative: a router range must be written as a range (`45`–`47`), not as prose ("the forties"), or
the gate cannot see the coverage. This is a small authoring constraint and it is visible.



<!-- 2026-09-20: DG19: declare where this law is consumed, or the pending key that will consume it (recon 2b4849c6b7) -->
