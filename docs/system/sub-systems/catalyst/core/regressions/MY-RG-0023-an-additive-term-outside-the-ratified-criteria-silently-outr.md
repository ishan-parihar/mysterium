---
ID: MY-RG-0023
Title: "An additive term outside the ratified criteria silently outranks them"
Status: Active
Date: 2026-09-20
Organ: catalyst
Severity: high
Source: "MY-AD-0025; src/core/engines/PriorityComputation.ts"
Description: "A scheduler term added outside the eight weighted criteria is unnormalized, unparameterisable by 27, and can reorder the criteria without any doc or gate noticing."
Related: [MY-AD-0025, MY-AD-0008, MY-RG-0006]
---

## The failure

A selection term added to the scheduler **outside** the eight weighted criteria does not merely bend
the outcome — it removes the outcome's auditability. An additive bonus is unnormalized (it is not
on the criteria's scale), unparameterisable (`27` biases weights, not bonuses), and unrestricted
(nothing bounds its sum). The published weights then predict the wrong rank order, silently.

## How it actually happened

`src/core/engines/PriorityComputation.ts` accreted six such terms over time — `noveltyBonus`,
`weaknessBonus`, `diversityBonus`, `bleedBoost`, `rayBoost`, `tieBreaker` — alongside a substituted
eighth weight. Total envelope: up to **+0.72** on a base score bounded by 1.00. Tests passed
throughout, because tests encode the implementation: a test asserting *the scheduler does what it
does* cannot notice that it no longer does what canon says.

## The guard

`G26` (`MY-AD-0025`): the weights sum to exactly 1.00 and no additive term exists outside the eight
criteria. Plus the standing rule that the implementation's header comment must transcribe the canon
formula — the stale comment was what made the drift unreadable from the file itself.

## The generalisation

Same class as `MY-RG-0006` (a dormant seam) one level up: there, a ratified law had no consumer;
here, a consumer has terms the ratified law does not contain. Both are canon↔code divergence on a
load-bearing equation, and both are invisible to a green test suite.


