---
ID: MY-AD-0009
Title: "Two-fold world memory with a per-holon owner worker"
Status: Active
Date: 2026-09-20
Organ: world
Source: "foundations/22-holon-context-engine §7.4-§7.5"
Description: "Profiling memory and object memory are separate ledgers; each holon has exactly one owning worker (local single writer) and context is handed to the game agent."
Consumer: "`src/core/world/ownerWorker.ts` + `src/core/world/ownerWorkerPool.ts` (single writer, caps, hot-set)"
Related: [MY-AD-0010, MY-AD-0004]
---

<!-- Discharged 2026-09-21: the per-holon owner worker exists at src/core/world/ownerWorker.ts (single writer, L2 commits under the §7.2 caps, L3 archetypal digest, player-facing effects as proposals) with the pool at src/core/world/ownerWorkerPool.ts (hot-set dispatch, W4 replay idempotence, W5 concurrency cap, offline degradation as a pure ledger fold). Locked by tests/world/OwnerWorker.test.ts (recon 06828d7aaa) -->
## Context
A single orchestrating agent cannot hold long-horizon consequences for every world object, and
concurrent writers silently corrupt shared world state. Long-horizon propagation had been
deferred on the assumption that no single writer could be identified.

## Decision
(1) Memory is two-fold: player/profiling (actions and tendencies) and object/world
(per-entity impact). (2) Every holon has exactly **one owner worker** — a local single writer.
(3) Owner workers hand context to the foreground game agent, which renders scenarios. Offline,
the pipeline degrades to deterministic ledger replay so the world never forgets.

## Consequences
- Positive: NPC/world causality becomes updatable without global locking.
- Negative: worker lifecycle and offline degradation must be tested as failure modes.

<!-- 2026-09-20: DG19: declare where this law is consumed, or the pending key that will consume it (recon 2b4849c6b7) -->
