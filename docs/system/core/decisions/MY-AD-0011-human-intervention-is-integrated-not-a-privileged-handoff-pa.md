---
ID: MY-AD-0011
Title: "Human intervention is integrated, not a privileged handoff path"
Status: Active
Date: 2026-09-20
Organ: safety
Source: "foundations/43-agentic-orchestration-architecture §4.7"
Description: "No separate handoff policy: the platform stays one integrated system for user and auditor alike, with no privilege tiers."
Related: [MY-AD-0010, MY-AD-0007]
Consumer: "`src/core/orchestration/delegate.ts` (the ordinary path every intervention must enter)"
---

## Context
A deferred item proposed a separate human-handoff subsystem. Its premise was that a human
operator needs privileges the user lacks.

## Decision
The premise is rejected. There is **no separate handoff policy and no privileged class**:
escalation surfaces through the same consented-linkage and safety mechanisms the user already
has, and adverse events surface through the observers that already exist.

## Consequences
- Positive: one safety model; no parallel authorization surface to secure.
- Negative: safety content (local crisis patterns, escalation contacts) must be authored in the
  safety organ rather than assumed from a handoff protocol.

<!-- 2026-09-20: DG19: declare where this law is consumed, or the pending key that will consume it (recon 2b4849c6b7) -->

<!-- 2026-09-21: Deferral discharged 2026-09-21: the no-privilege access model is implemented — one ladder, consented traversal, no identity class (src/core/domain/articulationLadder.ts); a human auditor enters through it exactly like the self (AL1) (recon recon_id: b9ece22f08) -->
