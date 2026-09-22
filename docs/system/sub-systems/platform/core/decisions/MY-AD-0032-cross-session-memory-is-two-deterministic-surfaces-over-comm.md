---
ID: MY-AD-0032
Title: "Cross-session memory is two deterministic surfaces over committed state"
Status: Active
Date: 2026-09-22
Organ: platform
Source: "foundations/48-memory-architecture sections 1-5"
Description: "Standing MemoryPage + MemoryRetriever seam (48 §3/§4); patterns adopted from agentmemory/Hindsight, machinery rejected; recall firewalled by G31."
Related: []
Consumer: "G31 kernel gate (src/core/validation/gates.ts) + Phase-12 build (_org.yaml → completed: P15, graduated 2026-09-22)"
---

## Context

The engine's loop is closed but its memory half-life is one session: every remembering surface is
a ledger (feed, worker digests, evidence tiers) and no player-level standing object exists. The
memory-infrastructure study (agentmemory, Hindsight — 2026-09-22) confirmed both the shape of the
missing pieces and the boundary: those systems' write paths are LLM-derived belief consolidation,
which `MY-AD-0022` (deterministic commit) and feed law F1 (committed, not observed) forbid here.
The patterns are adopted; the machinery is not.

## Decision

Cross-session memory is built in-house as **two deterministic surfaces over committed state**
(`foundations/48`):

1. **The standing page (MemoryPage, 48 §3)** — a player-level memory object rebuilt at session
   end from committed deltas only: bounded trajectory prose, open threads with per-line
   provenance, holon stance mirrors. No LLM at write, no LLM at read; rebuild from the same feed
   state is byte-identical (M1); oldest threads close first (M2); every line cites its origin
   (M3); banded language only (M4); it is a view, never a second store (M5).
2. **The retrieval seam (MemoryRetriever, 48 §4)** — one interface, two providers:
   `LocalRetriever` (BM25 + recency + graph edges, RRF-fused; always present, keyless,
   deterministic) and `EmbeddingRetriever` (pinned `all-MiniLM-L6-v2`, local-only, optional).
   Provider choice and model version are replay inputs (G14).

Recall is a second data path into LLM context, so the render-path firewalls cross it:
banded-only output (R1), memory never writes (R2), Veil-filtered recall (R3), per-player
isolation (R4) — enforced by gate **G31**, regression classes **MY-RG-0031/0032**.

Rejected alternatives, on the record: wiring agentmemory or Hindsight into the engine (write-path
law collisions, external server processes violate layer law `MY-AD-0002`, embedding drift breaks
G14 determinism, per-scale mismatch — per-player memory is file scale). A Hindsight-*class*
external server remains the sanctioned shape ONLY for cohort/narrative world memory and
auditor-facing projections when pods deploy (48 §6).

## Consequences

- Positive: continuity prose, thread return, and library relevance ranking become real without a
  single new external dependency; every memory line stays auditable to its feed entry.
- Positive: Phase 11's checkpoint restore becomes the natural prerequisite and is honored as such.
- Negative: two new surfaces to keep law-conformant (G31, MY-RG-0031/0032 exist for exactly this).
- Negative: the embedding tier is build-optional until a local model is vendored; the floor is
  BM25-only behavior, which must therefore be *good*, not merely present.


<!-- 2026-09-22: ratified but unbuilt; implementation owned by Phase 12 in DEVELOPMENT-PLAN §4 (recon bb2f6392cf) -->

<!-- 2026-09-22: gate matches deferral tokens against pending keys verbatim; P15 = PHASE-12-MEMORY-TIER (recon bb2f6392cf) -->

<!-- 2026-09-22: Phase 12 memory tier implemented: P15 graduated to completed; the deferral resolves to its built consumer (G31 + the build record). (recon recon_id: af17583bc0) -->
