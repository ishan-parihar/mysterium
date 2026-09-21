---
ID: MY-AD-0006
Title: "Register classes: the full metric register is available at any stage"
Status: Active
Date: 2026-09-20
Organ: profiling
Source: "foundations/20-veil-of-forgetting §11"
Description: "Open vs closed register classes, with the HoloOS D3-Veil divergence recorded and its compensation specified."
Related: [MY-AD-0007, MY-AD-0003]
Consumer: "`src/core/domain/articulationLadder.ts`"
---

## Context
HoloOS states the Veil is active at D3 (thins at D4+, dissolves at D5+), which would forbid
showing a D3 player their own metrics. The user's ruling requires full metric availability.

## Decision
Registers are classes: **open** (available at any stage) and **closed** (identity diagnostics
that remain behind the operational veil). The divergence from HoloOS is **recorded with its
compensation** rather than silently absorbed.

## Consequences
- Positive: the self can see everything about itself; the game never withholds the user's own data.
- Negative: a recorded divergence must be maintained as HoloOS evolves.
- Pattern: this is the model for every future divergence (AGENTS.md §2.0).

<!-- 2026-09-20: DG19: declare where this law is consumed, or the pending key that will consume it (recon 2b4849c6b7) -->

<!-- 2026-09-21: Deferral discharged 2026-09-21: the register-class render path exists at src/core/domain/articulationLadder.ts (ARTICULATION-LAYER) (recon recon_id: fadd534b29) -->
