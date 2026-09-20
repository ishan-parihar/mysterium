---
ID: MY-RG-0008
Title: "Two documents own one formula"
Status: Active
Date: 2026-09-20
Organ: platform
Severity: Medium
Source: "docs/audits/DOC-SET-AUDIT-2026-09-20 R4"
Description: "concept-drafts/SCORING-ARCHITECTURE.md and foundations/25 both carried the consciousness-index aggregation formula."
Related: [MY-AD-0003]
---

## Symptom
The composite index formula exists in two documents and they disagree; a reader cannot tell which
is current, and an implementer picks whichever they saw first.

## Root cause
No document owned "the composite", so each author restated what they needed. Redundancy was
invisible because nothing checked ownership.

## Detection
`python3 scripts/arch.py validate --gate DG7` (every concept has exactly one owner in `44 §8`).

## Prevention
- One owner per concept, named in `docs/foundations/44 §8`; other documents link, never restate.
- `foundations/25` owns the composite formula; `concept-drafts/SCORING-ARCHITECTURE.md` owns the
  per-module scoring skeleton and cites 25.
