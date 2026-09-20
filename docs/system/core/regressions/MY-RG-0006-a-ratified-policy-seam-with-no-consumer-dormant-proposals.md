---
ID: MY-RG-0006
Title: "A ratified policy seam with no consumer (dormant proposals)"
Status: Active
Date: 2026-09-20
Organ: orchestration
Severity: High
Source: "docs/audits/DOC-SET-AUDIT-2026-09-20 (R-class) + foundations/27 §5.4"
Description: "propose_alignment_adjustment was dispositioned by ratifyProposals but nothing applied it, so an approved policy had no effect."
Related: [MY-AD-0008]
---

## Symptom
A user or auditor approves an alignment adjustment; the tool reports success; play does not change.
Nothing errors, because "consumed by orchestrator planning" was a comment, not an implementation.

## Root cause
The proposal type and its disposition path were built together, but the *applier* was never built,
and no test asserted that each proposal type has an effect.

## Detection
A contract test enumerating every proposal type and asserting each has an applying consumer that
changes observable state.

## Prevention
- A proposal type may not ship without its consumer in the same change.
- `MY-AD-0008` specifies the applier for `alignment_adjustment` (a bias over the priority
  computation).
