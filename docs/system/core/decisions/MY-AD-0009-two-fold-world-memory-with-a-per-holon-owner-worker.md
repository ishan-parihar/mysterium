---
ID: MY-AD-0009
Title: "Two-fold world memory with a per-holon owner worker"
Status: Active
Date: 2026-09-20
Organ: world
Source: "foundations/22-holon-context-engine §7.4-§7.5"
Description: "Profiling memory and object memory are separate ledgers; each holon has exactly one owning worker (local single writer) and context is handed to the game agent."
Related: [MY-AD-0010, MY-AD-0004]
---

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
