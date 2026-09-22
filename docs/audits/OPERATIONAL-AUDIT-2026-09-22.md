# Operational Audit — Simulation Engine Full-Surface Verification — 2026-09-22

> **Status:** canonical evidence record. `AGENTS.md §4.2` ("what is actually open") and
> `docs/DEVELOPMENT-PLAN.md §2.1` point HERE for the detailed evidence behind the
> configuration/calibration/development frontier. Historical audits (`DOC-SET-AUDIT-*`,
> `FULL-DEVELOPMENT-AUDIT-*`) describe earlier dates and are not superseded by this one — they
> are superseded only where their open items are discharged here.
> **Tree state at verification:** head `148e275` (2026-09-22), 125 test files / 1370 tests green,
> `arch.py validate` 0 violations (23 doc gates DG1–DG23), kernel gate suite G1–G27 green,
> workspace-lint clean, builds (Vite + SvelteKit + tsup CLI) green.
> **Method:** every claim below was verified by reading the live code path, not from memory or
> documentation: `AgenticOrchestrator.run()` + all five result paths, `ContextPipeline`
> `assembleSystemPrompt`, `sessionRuntime.ts` (envelope/coherence/sessionEnd/checkpoint),
> `ownerWorker`/`ownerWorkerPool`, `reportingFeed`/`feedBridge`, `cli-game.ts` session loop,
> `gameEngine.ts`, the validation gates, and the personalization module surface (21 modules).

---

## 1. Executive verdict

The engine **operationalizes end-to-end**: the
orchestrator → context → LLM → scoring → consequence → memory → feed → worker loop closes in
production code, not only in tests. The agentic infrastructure (arch CLI, 23 doc gates, 27 kernel
gates, 61 records across 14 organs, 512 concept-drafts) enforces its own discipline mechanically —
canon↔code is a checked edge in both directions (DG23).

What separates the current engine from the full ratified vision is **not architecture**. It is
accumulated state and wiring: play data for calibration, live writers for the interest/polarity
tiers, persistence of worker memory across sessions, and authored NPC depth. Those items are the
frontier in §7.

---

## 2. The live session loop (traced start → finish)

`AgenticOrchestrator.run()` (2745-line module):

1. **Path selection.** `noLlm` → `runFallback` (static + best-effort LLM prose, Veil-seamed);
   `LanguageReflective` → dedicated open-dialogue scoring path; module present →
   `runModuleAssessment` (real task renderers: n-back, dilemmas, emotion identification); else the
   agentic GM tool loop.
2. **Context assembly.** One `buildContext()` call fusing the nine-to-twelve prompt blocks of §3.
3. **Agentic tool loop.** The LLM drives via `ask_user_question` (contract: exactly 4 MCQ options +
   `allowWriteIn`) and `complete_encounter`, budget-capped at **4 exchanges** per encounter, each
   question required to probe deeper on prior answers.
4. **Scoring.** Rubric-based, independent of LLM self-evaluation. `TaskRenderer.evaluate()`
   produces `TrialResult` with timing/accuracy; write-in shadow-keyword detection overrides label
   matching (the "I" false-positive class); dimension-weighted drive scoring (the compressed-mean
   defect is fixed).
5. **Consequences.** `processOutcome` → `applyConsequences` (shadow entries, drive updates) →
   **altitude shift**: line stages move here; `currentStage` advances only when **all lines**
   converge (AgenticOrchestrator ~1687) — the holonic-integrity rule is enforced in code.
6. **Session end (all five result paths wired).** `recordSessionEnd` → feed session entry +
   owner-worker drain → result carries `workers`/`ownerCommitted` → `cli-game.ts:3586` persists
   worker state onto the world save.

**Verdict: operationally closed.** Degradation is engineered at every seam — no services →
byte-identical legacy behavior; empty library cell → facet fallback; LLM timeout → 5s stream
cutoff → Veil-seamed static prose. Nothing in the personalization tier can block a session.

## 3. Context curation & injection

| Prompt block | Source | State |
|---|---|---|
| `[FREQUENCY]` tone/vocabulary/values/taboos + lensRead | stage register + RAY_LENS | live |
| `[HOLONS]` | world registry | live |
| `[ENCOUNTER]` lines/stage/modality/purpose/module | scheduler (8-criterion formula, G26-closed) | live |
| `[MODALITY]` rubric | 7-modality rubrics | live |
| `[CONTINUITY]` | consequence history | live |
| `[PLAYER STATE]` + cognitive/knowledge snapshots | training index + significator.knowledge | live |
| `[POLARITY TEXTURES]` | PolarityOntology | live |
| `[DEVELOPMENTAL AGENDA]` (MY-AD-0030) | agapeScan/erosScan, refreshed on every altitude move | live |
| `[COMPOSED WORLD]` | facet store (1792 facets), dependency-ordered | live |
| `[PERSONALIZATION]` | UDV → pooling → mode/surface/structure/interest echo | live |
| `[HOLON MEMORY]` | owner-worker L2/L3 digest, **coherence-gated at runtime** | live |
| `[SCENARIO SEED]` | 64 authored canonical situations × 7 modality angles | live |
| `[WORLD PLACE]` | 64 authored canonical places | live |

Veil discipline is structural: no numbers, no taxonomy labels in any player-facing block; the
coherence gate routes off-stage components out of the prompt (never cancels the session, 45 §5.2.1)
and records the defect as a dev-loop insight with an F4 forecast.

## 4. How the agents operate

- **One foreground orchestrator** per session (MY-AD-0010's ratified shape) holding
  `OrchestrationServices | undefined` — the single seam to feed, library, workers, coherence.
- **Delegation kernel (43).** DelegationSpec → session → ratification-only commits; G14
  determinism (byte-stable seeded fallback policy), G15 toolset firewall, eager signals (crisis →
  `safety`, frustration → flow-protection handback, veilRisk advisory).
- **Owner workers (22 §7.5; MY-AD-0009 consumer).** Per-holon single writer: L1 event ledger → L2
  profile commits under **±0.3/encounter caps** → L3 archetypal pattern digest → L4 player-facing
  effects **only as proposals**. Pool: hot-set dispatch, W4 idempotent replay (byte-stable, tested),
  W5 concurrency cap = 4 with priority backlog (queued holons cannot starve).
- **Reporting feed (43 §5.5).** All four writers live: session entries, worker entries (including
  owner drains), ratification verdicts, orchestrator insights — F3-idempotent per unit of work;
  reader projections (planning / cci / projection) exist as contract.

## 5. Memory & profile management

| Store | Writes live | Persists | Reads back |
|---|---|---|---|
| Significator (altitudes, drives, shadows, knowledge) | ✅ every encounter | ✅ atomic `saveAll` | ✅ |
| Owner-worker NPC profiles | ✅ per drain | ✅ onto world save (`orchestrationWorkers`) | **❌ GAP — write-only**: services are rebuilt fresh per session; nothing restores from the save |
| Reporting feed | ✅ per session | ❌ session-scoped | projections exist; **no live reader in the loop** |
| Checkpoint API (`captureCheckpoint`/`restoreCheckpoint`) | implemented + tested | — | **no production caller** |
| Polarity state map (`services.states`) | ❌ created empty, never updated | ❌ | poles re-select from scratch per composition |
| Asked-prompts de-duplication | ✅ | ✅ | ✅ cross-session |
| Interest record + probe ledger (47) | ❌ log-only tier | — | gates only; no live session writer |
| Composition telemetry (46 §11) | ✅ (harness) | bounded FIFO 2000 | reports until acknowledged |

**The single most impactful configuration gap** is the first row: NPC memory has a one-session
half-life at the CLI despite the persistence machinery being fully built and tested.

## 6. Personalization, emergence, transformation

**Live now:** stage-coherent authored [scenario | world] seeding (G27-gated), UDV envelope with the
consent firewall (C1/C2 downgraded to bands; `auditUdv`), aversion routes-don't-cancel, modality
angles, holon memory, developmental agenda aiming, polarity textures, runtime coherence routing,
engagement register as a design gate, per-line altitude evolution with all-lines convergence,
theta-decay, CCI, GreaterCycleEngine.

**Dormant by design (built, gated, awaiting data or UI):** the interest/probe tier (log-only until
RV1–RV7), declared interests/aversions (no intake UI), pole-state accumulation (states never
persist), the 12-tag vocabulary (growth is a 46 §4 corpus change), NPC persona seeds (the third
authored leg of the triad).

**Transformational capacity:** real and dual-pathed — orchestrator altitude shifts +
`TransformationDetector`/`commitTransformation` (saturation threshold, readiness reports, per-line
transformation, knot resolution). Depth ceiling is set by probe validity (RV unpassed) and tag
granularity, not by progression logic.

## 7. The frontier register (the evidence table)

> **Ownership (2026-09-22, same day):** the configuration and first-step calibration items below
> (C1–C6, K1's harness step, D1, D2) were **claimed by Phase 11 — Closed-Loop Memory & Preference
> Intake** (`docs/DEVELOPMENT-PLAN.md §4`, gates G28–G30). The red-team memory survey (same day,
> `foundations/48-memory-architecture` §2) added two frontier items the audit's own survey had not
> enumerated — the standing page (memory surface #7) and retrieval over the libraries (#8) — owned
> by **Phase 12 — Semantic Memory Tier** (plan §4; `MY-AD-0032`, gate G31), which depends on
> Phase 11's checkpoint restore (C1). This section remains the evidence table that justifies both
> phases; mark items ✅ here as they land.

**CONFIGURATION — wire what exists (no new architecture):**

| # | Item | Evidence |
|---|---|---|
| C1 | Restore `orchestrationWorkers` + feed checkpoint at session boot | `captureCheckpoint`/`restoreCheckpoint` have zero production callers; `createOrchestrationServices(world.holons)` at `cli-game.ts:3391` discards the persisted pool |
| C2 | Feed readers consumed by the orchestrator at session start | reader projections exist (`reportingFeed.ts:57`); no consumer in the loop |
| C3 | Identity/consent intake UI → `declaredInterests`/`aversions` → UDV | orchestrator accepts the projection (`AgenticOrchestrator.ts:236`); no route collects it |
| C4 | Production ratification caller after L4 review | `recordRatification` exists; no surface invokes it |
| C5 | Live writers for the polarity state map | `services.states` created `{}` and never written |
| C6 | GitLab dual-remote sync | SSH permission denied; GitHub current through `148e275` |

**CALIBRATION — needs play data, not code:**

| # | Item | Evidence |
|---|---|---|
| K1 | RV1–RV7 validation of the 8 authored probes | unlocks the interest tier from log-only (G23 citations) |
| K2 | `expansionRatio` + entropy thresholds from observed distributions | `EXPANSION_RATIO_FLOOR` is a floor, not a calibration |
| K3 | Per-line saturation thresholds from real progression curves | `setSaturationThreshold` is configurable with defaults uncalibrated |

**DEVELOPMENT — new capacity:**

| # | Item | Evidence |
|---|---|---|
| D1 | Author the NPC persona tier (64 seeds) | completes the authored triad; NPC leg is derived from holon text only |
| D2 | Tag-ontology growth beyond 12 tags | 46 §4 corpus change, deliberately gated |
| D3 | Cohort/pods production runtime | `PodTransport` DO adapter exists; no networked deployment |

**Scale notes:** per-player complexity space is 64 cells × 7 modalities; composition/pooling/
coherence are O(library) per encounter; worker commits capped at 4 concurrent regardless of holon
count; every store is per-player/per-browser (one `OrchestrationServices` per client); no
multi-tenant server runtime exists (by design until pods deploy). Single-process, file-persisted;
the feed is the only unbounded-within-session structure.

## 8. Verification state

Battery at verification: 125 files / 1370 tests; DG1–DG23 clean; G1–G27 green (G22 composition
integrity, G23 tier gate, G24 scaffold integrity, G25 inference write firewall, G26 priority-formula
closure, G27 authored-seed stage coherence); calibration harness PASS (entropy 2.820/cell, 0
defects, 1792 facets / 1792 candidates); `arch fixtures` 23/23 gates; ledger current through
`148e275`.
