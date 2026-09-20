---
ID: MY-AD-0005
Title: "Eligibility is a condition; the closure is an event"
Status: Active
Date: 2026-09-20
Organ: catalyst
Source: "foundations/19-choice-and-polarity-engine §9.6"
Description: "checkChoiceEligibility computes a condition; the harvest is the event gated by eligibility AND arrival. The two were conflated."
Related: [MY-AD-0004, MY-RG-0006]
Consumer: "`src/core/engines/PolarityEngine.ts` (the eligibility half)"
Deferral: CHOICE-CLOSURE
---

## Context
`checkHarvest` computed a structural condition but its name implied an endgame trigger, and the
documentation used "harvest" for both. The code also permitted `Exploring -> Harvesting`.

## Decision
- **Choice-eligibility** — a condition (`§9.2`/`§9.3`), computed continuously, producing state.
- **The harvest / closure** — the event, gated on eligibility **and** arrival at the closure.
The function is renamed `checkChoiceEligibility` and its verdict never triggers an endgame.

## Consequences
- Positive: the lifecycle gate becomes expressible; the Samsara loop becomes coherent.
- Guard: `MY-RG-0006` (orphan policy seam) and the lifecycle transition contract test.

<!-- 2026-09-20: DG19: declare where this law is consumed, or the pending key that will consume it (recon 2b4849c6b7) -->
