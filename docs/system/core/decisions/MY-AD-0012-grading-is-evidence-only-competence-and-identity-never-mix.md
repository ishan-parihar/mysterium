---
ID: MY-AD-0012
Title: "Grading is evidence-only; competence and identity never mix"
Status: Active
Date: 2026-09-20
Organ: kernel
Source: "foundations/42-developmental-levelling-mechanism §1.1"
Description: "Ladder movement derives only from demonstrated evidence; knowledge-axis measures never feed identity diagnostics."
Related: [MY-AD-0003]
---

## Context
Curriculum progress could be mistaken for developmental attainment, letting a well-drilled player
appear to have outgrown a stage they still inhabit.

## Decision
Grading is **evidence-only**: ladder movement requires demonstrated competence on that rung with
the shadow gate satisfied (`MY-AD-0004`'s floor-health rule). A firewall separates competence
from identity in both directions.

## Consequences
- Positive: the corpus can be rigorous without corrupting the developmental reading.
- Enforcement: `G11-levelling-mechanism` and `G12-identity-firewall` in `src/core/validation/gates.ts`.
