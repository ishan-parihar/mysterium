---
ID: MY-AD-0008
Title: "Objective alignment biases catalyst selection; it never replaces it"
Status: Active
Date: 2026-09-20
Organ: catalyst
Source: "foundations/27-auto-mode-strategy-engine §5.4"
Description: "AlignmentContract (author, intent, target, deviation band, ceiling) applies through the existing scheduler bias seam, as a bias only."
Consumer: "`src/core/personalization/pooling.ts` (rankByRelevance — bias over the filtered set)"
Related: [MY-AD-0004, MY-RG-0008]
---

<!-- Discharged 2026-09-21: bias-as-bias is implemented in src/core/personalization/pooling.ts (rankByRelevance = ranking bias over the constraint-filtered set, never a replacement for the scheduler formula). Locked by tests/personalization/PlanImplement.test.ts (recon 06828d7aaa) -->
## Context
`propose_alignment_adjustment` and `propose_trajectory` existed in the tool system and
`ratifyProposals` dispositioned them, but nothing applied an adjustment — a dormant seam.

## Decision
An `AlignmentContract` (author, intent, target, deviation band, window, ceiling) is applied as a
**bias** over the priority computation, never as a replacement for it. Self and auditor use the
same route and the same laws (Veil, firewall, ceiling). The 8-criterion priority canon
(`foundations/24` §3.2) remains the single selection vocabulary.

## Consequences
- Positive: trajectory alignment becomes a first-class, bounded capability.
- Negative: objective alignment now needs its own invariants documented and tested.
- Guard: `MY-RG-0008` (orphan proposal types must have an applying consumer).

<!-- 2026-09-20: DG19: declare where this law is consumed, or the pending key that will consume it (recon 2b4849c6b7) -->
