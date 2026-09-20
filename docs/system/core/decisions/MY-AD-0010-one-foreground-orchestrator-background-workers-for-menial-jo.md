---
ID: MY-AD-0010
Title: "One foreground orchestrator; background workers for menial jobs"
Status: Active
Date: 2026-09-20
Organ: orchestration
Source: "foundations/43-agentic-orchestration-architecture §4.5b/§5.4"
Description: "A single foreground agent owns the user interaction; sub-agents run sessions and report into the cycle; menial work runs as background workers under ratification-only commits."
Related: [MY-AD-0011, MY-AD-0009]
Deferral: PLAN-IMPLEMENT
---

## Context
Concurrency policy was an open question: how many specialist sessions may run at once, and how
do their outputs reach the world?

## Decision
Exactly **one** foreground orchestrator, which never emits player-visible text itself. It spawns
a sub-agent per session/assessment; when the session ends, the sub-agent feeds the reporting
system and the orchestrator, closing the cycle. Menial background work runs as workers (W1–W5)
and commits are ratification-only.

## Consequences
- Positive: one author of player-visible output; a legible audit trail per session.
- Negative: worker failures need explicit degradation paths (see MY-AD-0009).

<!-- 2026-09-20: DG19: declare where this law is consumed, or the pending key that will consume it (recon 2b4849c6b7) -->
