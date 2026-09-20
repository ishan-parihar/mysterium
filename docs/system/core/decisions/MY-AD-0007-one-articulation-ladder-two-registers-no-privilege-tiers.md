---
ID: MY-AD-0007
Title: "One articulation ladder, two registers, no privilege tiers"
Status: Active
Date: 2026-09-20
Organ: profiling
Source: "foundations/16-significator-architecture §10.5"
Description: "L0-L7 with AL1-AL6: the same derivation rendered in a self-register and an auditor-register; access is consented traversal, never a credential class."
Related: [MY-AD-0006]
---

## Context
The auditor surface was treated as a separate subsystem requiring its own authentication model
(`foundations/33` §5 open question). That premise is dissolved: there is no auditor identity
class, only a consented traversal of one ladder.

## Decision
One ladder (L0–L7) with two registers: self-register (phenomenological, stage-articulated,
scoreless) and auditor-register (metric-bearing). The same derivation feeds both. Access is a
player-issued, revocable, scope-bounded consent link, re-checked at every render.

## Consequences
- Positive: no privilege subsystem; the deepest level is available to the self too.
- Negative: consent plumbing becomes load-bearing (revocation must be immediate).
