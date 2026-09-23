# 48 — Memory Architecture: Cross-Session Memory, the Standing Page, and the Retrieval Seam

> **Lateral this document owns:** how the engine **remembers across sessions** — the standing
> memory object, the retrieval seam, and the firewall that governs what memory may say. It does
> NOT re-own world-side consequence memory (`22 §7.4`), the reporting feed's record contract
> (`43 §5.5`), the evidence tiers (`47 §3`), or what the CCI computes (`25`) — it consumes all of
> those and adds the layer they imply but none of them states.
>
> Ratified 2026-09-22 from the memory-infrastructure study (agentmemory, Hindsight) and the
> red-team memory-surface survey; records `MY-AD-0032`, `MY-RG-0031`, `MY-RG-0032`.

## 1. Purpose and the gap this fills

The engine's loop is closed (`AGENTS.md §4.2`) and its session memory is event-sourced: the feed
(`43 §5.5`), the owner-worker digests (`22 §7.5`), the evidence ledger (`47 §3`). But every one of
those is a **ledger**, not a **memory**. At session boot the orchestrator re-derives continuity
from raw entries — there is no player-level standing object that says, in bounded prose, *what
happened before and what is still open*. And the candidate library (1792 renderings) is ranked by
tags and affinity alone; relevance never touches text.

The external study confirmed the shape of the missing pieces (Hindsight's *mental models* —
standing answers read without retrieval; agentmemory's *decay + consolidation*; both systems'
*hybrid retrieval fused by RRF*) and confirmed the boundary: their write paths are LLM-derived
belief consolidation, which this project's laws forbid (`MY-AD-0022`, feed law F1). So the
patterns are adopted; the machinery is not. **We build our own, lightweight and deterministic.**

## 2. The memory-surface inventory (red-team survey, 2026-09-22)

Every surface that remembers something, its residence, its half-life, and its owner. This table is
the completeness check: a memory surface missing from it is a defect of this document.

| # | Surface | Remembers | Residence today | Half-life | Owner |
|---|---|---|---|---|---|
| 1 | Developmental state | line stages, drive scores, knowledge | significator in the save | permanent | `42`, `16` |
| 2 | Reporting feed | session signals, proposals, verdicts, forecasts | persisted with the world save | permanent, bounded | `43 §5.5` |
| 3 | Owner-worker digests | per-holon L3 standing pages | persisted with the world save | until superseded | `22 §7.5`, `MY-AD-0009` |
| 4 | Evidence ledger | per-distinction preference evidence | in-process (writers: Phase 11 d3) | recency-weighted, expiring | `47 §3/§8` |
| 5 | Polarity pair states | dialectic-arc position per pair | in-process map (writers: Phase 11 d5) | until advanced | `46 §5.3` |
| 6 | Interest record | six-axis interest priors + probes | in-process, log-only (Phase 11 d6) | priors expire | `47 §5/§7` |
| 7 | **The standing page** | the player's cross-session narrative | **MISSING — this document** | rebuilt every session end | `48 §3` |
| 8 | **Retrieval over the libraries** | relevance-ranked candidates | tag/affinity only — **no text relevance** | n/a | `48 §4` |
| 9 | NPC relationship attribution | what the player did *to this holon* | worker L3 only (no attribution deltas) | with #3 | `22 §7.5` |
| 10 | World-side / civilizational | PESTLE macro-catalyst memory | dormant by design | long | `22 §7.4` |
| 11 | Composition telemetry | diversity events, defect reports | in-process, bounded | dev-loop only | `46 §11` |
| 12 | Cohort / pods | shared multiplayer memory | PodTransport only; no store | n/a | Phase 4 (external seam, `48 §7`) |
| 13 | Auditor projections | what a guardian sees | derived-only at render | n/a | `16 §10.4`, `33 §7` |

Gaps the survey found (each becomes a deliverable of Phase 12): **#7 does not exist**, **#8 has
no relevance signal**, #3 dies on restart without Phase 11's checkpoint restore (prerequisite),
and #9 has digests but no player-action→NPC-attribution write path beyond encounter outcomes.

## 3. The standing page (MemoryPage)

A **player-level memory object**, rebuilt deterministically at session end and read at session
boot. It is the Hindsight *mental-model* pattern made lawful: a standing answer, read without
retrieval, derived only from committed state.

```ts
interface MemoryPage {
  builtAt: number;               // deterministic clock (22 §9) of the rebuild
  derivedFrom: readonly string[]; // feed-entry ids + committed-delta ids it was built FROM
  trajectory: string;            // bounded prose: the arc so far, in stage-register voice
  openThreads: readonly {        // what is unresolved and should return
    ref: string;                 // the feed entry or proposal that opened it
    summary: string;             // one sentence, banded language only
    ageSessions: number;
  }[];
  holonStates: readonly { holonId: string; stance: string }[]; // mirrors worker L3 digests
}
```

Laws:

- **M1 — Deterministic build.** The page is produced by template prose over committed deltas
  (`MY-AD-0022` spirit applied to memory): no LLM at write, no LLM at read. Rebuild from the same
  feed state yields byte-identical prose (G28's replay law extended to the page).
- **M2 — Bounded by design.** Hard prose budget (trajectory + threads + holon states); oldest
  threads close first. Memory that grows without bound is a defect (red-team class LM-c).
- **M3 — Provenance required.** Every line cites the entry it was derived from (`derivedFrom` +
  per-thread `ref`). A memory line that cannot cite its origin is fabrication (class LM-e) and is
  a gate failure, not a style issue.
- **M4 — Banded language only.** The page carries the same downgraded vocabulary the UDV carries
  (`MY-AD-0020`): no raw scores, no assessment terms, no drive names. The Veil holds at recall
  (`20`), not only at prompt-render.
- **M5 — One page, no parallel profiles.** The page is a *view over* surfaces 1–6, never a second
  store (`MY-RG-0015`): delete the underlying entries and the rebuilt page loses the line.

Read path: session boot injects the page as the `[CONTINUITY]` block's head — the orchestrator's
narrative memory of "you" — before the per-holon `[HOLON MEMORY]` blocks.

**Live seam (2026-09-23):** the canonical builder is `src/core/personalization/sessionRuntime.ts`
(`buildEnvelope` → `continuity` → `ContextPipeline`'s `[CROSS-SESSION MEMORY]` block). The older
`personalization/envelopeRuntime.ts` is a pre-Phase-11 stub (its UDV inputs are hardcoded empty);
Phase 13 d2 consolidates it. Any doc or agent wiring personalization starts from `sessionRuntime`.

## 4. The retrieval seam (MemoryRetriever)

One interface, two providers, layered per `MY-AD-0002` (core stays pure; the seam is infra):

```ts
interface MemoryRetriever {
  rank(query: RetrievalQuery, corpus: ReadonlyArray<Retrievable>): Ranked;
}
```

- **`LocalRetriever` — default, always present.** BM25 over text fields (the `arch.py` tokenizer
  and field-weighting pattern, already in-house) + **recency weighting** + **graph edges**
  (holon `relationships`, feed refs) fused by **reciprocal-rank fusion**. Deterministic, keyless,
  file-persisted. Serves: library ranking enrichment (#8), cross-session thread recall, continuity
  time-slices ("the Amber arc, three weeks ago").
  **Status (2026-09-24): LIVE on the candidate path.** Phase 13 d3 wired the shortlist into the
  pooling seam (`retrievalShortlist.ts`): above `SHORTLIST_THRESHOLD` candidates the library is
  retrieved (BM25+recency+graph RRF), below it enumeration stands bit-identically; `recallGuard`
  re-checks shortlist text at the same seam (R1/R3). Cross-session thread recall and continuity
  time-slices remain declared, not wired (they need real play traffic to tune).
- **`EmbeddingRetriever` — optional, local-only.** Pinned model (`all-MiniLM-L6-v2`, version
  recorded in the save) via transformers.js (browser) / onnxruntime-node (CLI). Never an API call,
  never a key, never a field of record. Used for semantic candidate matching when the local model
  is present; `LocalRetriever` is the fallback and the floor.
  **Status (2026-09-23): seam only.** `createEmbeddingProvider` + `EMBEDDING_MODEL_PIN` + `fuseRanks`
  exist with `MY-RG-0032` enforced; no embedding runtime is installed (a new dependency requiring
  approval) and no production consumer attaches one. The local floor is the shipped tier.

Fusion and degradation rules:

- Both providers present → RRF over the two ranked lists (the agentmemory/Hindsight pattern).
- Embedding provider absent, failed, or version-mismatched → LocalRetriever alone, flagged in
  telemetry, never an error surfaced to the player (the degradation law, `45 §5`).
- Determinism is non-negotiable (`G14`): provider choice, model version, and corpus order are
  inputs to the replay record. A retrieval that cannot be replayed is a defect.

## 5. The retrieval firewall

Recall creates a **second path** by which data can reach an LLM context. Every law that guards
the render path guards this one too:

- **R1 — Banded data only at recall.** A retriever may rank by anything; it may *return* only
  banded/committed content. Raw C1/C2 signals are index fodder, never output (`MY-AD-0020`
  crosses the seam).
- **R2 — Memory never writes.** Retrieval results are context, never fields of record. No
  recall output is persisted into significator, evidence ledger, or profile state (F1 at the
  read side). Preference remains inferred only through the `47 §8` pipeline.
- **R3 — The Veil filters recall.** Anything the memory surfaces returns passes the same
  Veil-seam filter as prompt-render (`22 §13.2`, `20`): no assessment vocabulary, no stage
  naming of the player, no "the system has noticed…" constructions.
- **R4 — Isolation.** Retrieval is per-player-store scoped by construction; a cross-user hit is
  a gate failure (class LM-f), proven by injected fixture (the `MY-AD-0027` doctrine: a gate is
  not trusted until shown to fail).

Enforcement: **G31 — retrieval firewall** (banded-only output, Veil-filtered, isolated,
no-write) and **MY-RG-0031** (the regression class), plus **MY-RG-0032** (unpinned embedding
model drift — a model change without a version bump + rebuild record passes no gate).

## 6. What this document does NOT cover

- The feed's record shape and its four writers / three readers — `43 §5.5` (unchanged; the page
  is built *from* it, the retrievers rank *over* it).
- World-side consequence memory and the owner-worker contract — `22 §7.4/§7.5` (surface #10 and
  #3 remain owned there; Phase 11 d1 restores them across restarts).
- The evidence tiers, interest record, and the commit firewall — `47 §3/§5/§8` (surfaces #4/#6).
- What the CCI computes from committed evidence — `25`.
- Cohort shared-memory hosting — Phase 4 / `48 §7` below: when pods deploy, a Hindsight-*class*
  external server is the right shape for **cohort and narrative world memory and auditor-facing
  projections** (bank isolation + PII redaction genuinely fit server-side surfaces). Player
  developmental state stays in the ratified stores even then.

## 7. Principles served

- **F1 (43 §5.5)** — committed-not-observed, extended from write to read: memory surfaces return
  only what has been ratified or owner-committed.
- **MY-AD-0020** — the projection firewall crosses the recall path (R1); banded language in,
  banded language out.
- **MY-AD-0022** — deterministic commit over LLM-written profile state: the page is template
  prose over deltas, never synthesized belief.
- **20 (Veil)** — R3 closes the recall-time hole the render-time filter did not cover.
- **G14 / 22 §9** — replay determinism: provider, model version, and corpus order are replay
  inputs; nothing in memory is beyond byte-exact re-derivation.
- **45 §5 (degradation)** — every memory capability has a floor: no embeddings → BM25; no page →
  raw continuity derivation exactly as today.

## 8. References

- `43 §5.5` — the feed contract the page is built from
- `22 §7.4/§7.5` — world-side memory, owner workers, persistence
- `45 §3–§6`, `47 §3/§5/§8` — UDV, evidence tiers, interest record, inference firewall
- `44 §5` — vocabulary register (memory terms enter the alias map)
- Operational audit 2026-09-22 §7 (C1) — checkpoint restore, the prerequisite
- Study record: agentmemory (iii/MCP, BM25-first keyless) and Hindsight (banks, mental models,
  hybrid recall) — patterns adopted, machinery rejected (write-path law collisions, §1)
