---
ID: MY-RG-0010
Title: "A gate passes because its fixture cannot fail"
Status: Active
Date: 2026-09-20
Organ: validation
Severity: Medium
Source: "docs/ARCHITECTURE-TRANSMUTATION-PLAN.md §10 (success criteria 1)"
Description: "Every gate must demonstrably fail on an injected violation, or it is decoration rather than enforcement."
Related: [MY-AD-0013, MY-RG-0002]
---

## Symptom
A validator reports 0 violations while the defect it claims to prevent is present in the tree.

## Root cause
Gates are written against the happy path and validated only by running them on a clean tree, which
cannot distinguish "no violations" from "no detection". The validator's own config lookup had this
bug in its first draft (a key-shape mismatch silently enabled everything).

## Detection
For each gate: introduce a deliberate violation in a scratch copy, run the gate, assert a
non-zero exit; then revert.

## Prevention
- `scripts/arch.py validate --gate DGn` is part of the iteration protocol (`AGENTS.md §7.5`).
- Every new gate lands with a documented injection that proves it fails closed.
- Kernel gates (`src/core/validation/gates.ts`) follow the same rule: each hard gate must fail on
  an injected regression.
