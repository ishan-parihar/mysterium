---
ID: MY-AD-0014
Title: "The doc set is readable as a map: route resolves code and context emits the bundle"
Status: Active
Date: 2026-09-20
Organ: platform
Source: "docs/audits/RED-TEAM-2026-09-20.md RT-1"
Description: "Governance had an authoring half and no consumption half: a code path could not answer which foundation docs govern it. route now resolves code paths through the _org.yaml organ code: arrays, and context emits the start-of-work bundle (contract docs, organ invariants, organ-scoped records, governing AD/RG). Alignment stops being manual."
Related: []
Consumer: "`scripts/arch.py` (the route and context verbs)"
---

## Decision

The governance layer serves **consumption** as well as authoring. Two verbs close the loop:

- `arch.py route <path>` resolves **both directions**. A documentation path resolves to its rung and
authority; a **code path** resolves through the organ `code:` arrays already declared in `_org.yaml`
to its organ, its contract docs, and its records. Before this, the `code:` arrays were declared but
never read for routing, and `route src/core/assessments` answered `(unclaimed)`.
- `arch.py context <path>` emits the **start-of-work bundle** for an organ: the contract docs (with
titles), the organ's curated invariants, the records scoped to the organ, and the system-core
decisions/guards that name it via `Organ:`.

## Rationale

An agent can be told the rules and caught breaking them, and still not know what a module is
supposed to do. Canon↔code alignment was therefore manual, per-agent, and unreliable — the exact
failure the record system exists to prevent.

## Consequences

- Every `src/` domain is reachable from its governing documents in one command.
- `_org.yaml`'s `code:` arrays become load-bearing rather than declarative.
- `route` on an undeclared path exits 1 and names the rung, so "unowned" is visible.

## References

- `docs/audits/RED-TEAM-2026-09-20.md` RT-1
- `AGENTS.md` §2.0 (the advertised entry point), §7.5 step 1b
- `_org.yaml` (`organs.*.code`)

<!-- 2026-09-20: DG19: declare where this law is consumed, or the pending key that will consume it (recon 2b4849c6b7) -->
