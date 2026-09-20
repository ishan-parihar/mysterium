---
ID: MY-AD-0025
Title: "The priority formula is closed: eight criteria, everything else is a multiplicative bias"
Status: Active
Date: 2026-09-20
Organ: catalyst
Source: "foundations/24-encounter-scheduler §3.2.9"
Description: "The scheduler's eight criteria are the only additive terms; any other consideration (UDV relevance, user-Matrix targeting, session theme) enters as a multiplicative bias renormalised to 1.00, and G26 enforces conformance."
Related: [MY-AD-0008, MY-RG-0023, MY-AD-0019]
---

## Context

The scheduler's priority formula is the decision point of the whole catalyst loop: it is where the
player's developmental state (`16`), the world's state (`18`) and the session context (`24 §2.3`)
become *this encounter and not another one*. It is therefore the equation an auditor, a researcher
or an agent must be able to read the game's behaviour off.

Three versions of it were live at once. This document's §3.2 block declared eight weights and summed
only seven. Its §3.2.x sub-headings still carried the pre-renormalisation weights
(0.25/0.20/0.15/0.15/0.10/0.10/0.05). The implementation
(`src/core/engines/PriorityComputation.ts`) carried a *different* eighth criterion
(`userMatrixTargeting: 0.12`, where canon's eighth is `masteryAlignment: 0.10` — which has no
implementation at all) **plus six further unweighted additive terms** after the weighted sum:
`noveltyBonus` ≤ 0.25, `weaknessBonus` ≤ 0.15, `diversityBonus` ± 0.10, `bleedBoost` ≤ 0.15,
`rayBoost` ≤ 0.05, `tieBreaker` ≤ 0.02. Against a base score bounded by 1.00, that envelope is up to
**+0.72** — so the bonuses dominate and the ratified weights largely do not decide anything. The
file's own header comment still listed the pre-2026-09-17 seven-criterion formula, so the drift was
invisible from inside the file too.

## Decision

(1) The **eight criteria of §3.2 are the only additive terms** in the formula. They sum to exactly
1.00.
(2) Every other consideration enters as a **multiplicative bias** on those eight weights under `27`'s
parameterisation, renormalised back to 1.00 before scoring — never a ninth weight, never an additive
bonus. Two inputs are named as biases rather than criteria: relevance to the UDV (`45 §5.3`) and
user-Matrix/Potentiator targeting as a function of `ProfilePhase` (`15 §230`, `28`).
(3) `G26` enforces conformance: weights sum to 1.00, no additive term outside the eight criteria.

## Consequences

- Positive: the scheduler's behaviour is again derivable from its published state, which is what
makes the catalyst sequence explainable to the player, to an auditor and to the validation kernel.
- Positive: biases are total-order-preserving and `27`-parameterisable; a bonus is neither, so
`MY-AD-0008`'s bias contract now has exactly one place to speak.
- Negative: reconciling the implementation is real work with test impact (it moves selection
behaviour, so personas and kernel gates must be re-verified). Tracked as
`_org.yaml → pending → SCHEDULER-FORMULA`; until then the canon is the contract and the code is the
deviation.


