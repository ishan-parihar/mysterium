# Mysterium Agentic-Operation-Flow Architecture — System-Level Audit

> **Date:** 2026-07-04
> **Scope:** End-to-end audit of the agentic operation flow — ontological spec vs. implementation, tool surface, engine depth, cross-system flow, and the complete-system coherence.
> **Method:** Four parallel deep-audit agents read the HoloOS ontology, all 28 foundations docs, every engine file, every agent/tool/hook file, and traced all 4 encounter flows line-by-line.
> **Objective:** Find depth asymmetries, implementation gaps, fragmentations, and bugs that prevent Mysterium from fully delivering on "accelerating the user's healing and evolution."

---

## 0. Executive Summary

Mysterium has a **magnificent ontological design** and a **partially-implemented runtime**. The foundations docs describe a 28-system developmental architecture that is internally coherent, theoretically grounded (AQAL + Spiral Dynamics + Law of One + Gestalt shadow work), and operationally specified down to formula weights and threshold constants. The implementation has faithfully built ~60% of this architecture — but the remaining 40% includes **3 dead-code engines**, **8 critical flow bugs**, **17 missing agent tools**, and a **systematic depth asymmetry** where the measurement/strategy layer is deep but the manifestation/action layer is shallow.

The single most important finding: **the agent (the developmental intelligence that is supposed to orchestrate the entire player experience) is structurally prevented from doing its job.** It cannot select shadow-mode encounters, cannot resolve shadows, cannot drive the Greater Cycle, cannot manipulate PESTLE, cannot query per-line altitudes or per-drive directionality, and receives no feedback on what its evaluations actually caused. The agent is a "blind presenter" with a rich tool registry but shallow tools and broken wiring.

**Top-level numbers:**
- **28** foundational systems specified → **15** engines implemented → **3** dead in production (GreaterCycleEngine, ShadowDetector, SessionAgent)
- **15** agent tools registered → **7** have no prompt guidance → **3** have description/implementation mismatches → **1** cannot select shadow encounters
- **8** critical flow bugs (2 cause data loss, 3 cause state corruption, 3 break ontological contracts)
- **17** ontology-required tools missing from the agent surface
- **10** regressions vs. the old 2-tool AgenticOrchestrator (psychometric depth, PESTLE manipulation, shadow content, etc.)
- **4** encounter flows that diverge on every state-mutation step

---

## 1. Depth Asymmetry Map

The most striking pattern: **depth is inversely correlated with proximity to the player.** The deeper the system is in the stack (measurement, strategy, scheduling), the more faithful its implementation. The closer to the player (agent tools, content generation, encounter action), the shallower.

```
DEEP (faithful to spec)          SHALLOW (stubbed / missing)
─────────────────────────        ──────────────────────────
CCIEngine (866 LOC)              ShadowContentGenerator (4 templates / 256 spec'd)
AutoModeStrategy (724 LOC)       ShadowDetector (3 of 4 functions missing)
ContextPipeline (438 LOC)        ThetaDecay (69 LOC, missing 2 of 3 regimes)
EncounterScheduler (794 LOC)     VeilFilter (filterInput dead, regex-only)
ConsequenceEngine (415 LOC)      GreaterCycleEngine (dead code, formula duplicated)
PolarityEngine (210 LOC)         SessionAgent (dead code, lossy heuristics)
TransformationDetector (187 LOC) PersistentAgent tools (8 shallow, 3 mismatched)
                                 MacroCatalystEngine (designed but unwired)
```

**The asymmetry pattern:**
- **Measurement layer (DEEP):** CCI, AutoMode, Scheduler — 5-dimension formulas, 9 theme tables, 7-criteria priority. Faithful to spec.
- **Mutation layer (MEDIUM):** ConsequenceEngine, PolarityEngine, TransformationDetector — full PolarityTrace carriage, 4-level polarity hierarchy, 3-phase crucible. Correct but incomplete (missing ripple distance, harvest thresholds, AQAL enforcement).
- **Memory layer (DEAD):** GreaterCycleEngine, ShadowDetector, SessionAgent — all three are exported, all three have zero runtime callers. The systems that should provide cross-session memory, drive-health diagnosis, and cross-encounter synthesis are not wired into production.
- **Action layer (SHALLOW):** PersistentAgent's 8 Mysterium tools + 7 TDG tools. The agent is the player's developmental intelligence, but its tools return flat snapshots, integer counts, and 1-bit signals. It cannot query per-line altitudes, per-drive directionality, per-shadow detail, polarity trajectory, or UserMatrixModel cells.
- **Manifestation layer (MISSING):** No Atman Project queries, no Jonah Complex detection, no Contact Boundary (Gestalt) assessment, no Holonic Return scheduling, no 256-shadow matrix, no harvest threshold checking.

**Root cause:** The implementation was built inside-out — measurement first (correct), then mutation (correct), then the agent was bolted on top as a thin shell. The ontology requires the agent to BE the developmental intelligence, but the implementation treats it as a presenter with a few query tools.

---

## 2. The Agent Tool Surface — What It Has vs. What It Needs

### 2.1 Current 15-tool surface (8 Mysterium + 7 TDG)

| # | Tool | Depth | Critical Issue |
|---|---|---|---|
| 1 | `mysterium_ask_player` | SHALLOW | No multiSelect, no multi-question batching, no stimulus preview — all regressions vs. old orchestrator. Veil not enforced in handler. |
| 2 | `mysterium_get_player_state` | VERY SHALLOW | Returns 8 flat fields. Cannot query per-line altitudes, per-drive directionality, per-shadow detail, polarity trajectory, ray values, UserMatrixModel cells. The agent is asked to OUTPUT drive directionality it cannot READ as input. |
| 3 | `mysterium_get_world_state` | VERY SHALLOW | Returns integer COUNTS. Cannot enumerate NPCs, query a specific holon, see macro-event detail, see narrative beats, see PESTLE numerically. |
| 4 | `mysterium_get_encounter_pool` | MEDIUM-DEEP | Calls real scheduler. But cannot filter by line/stage/modality/shadow, cannot see priority breakdown, cannot see encounter content. |
| 5 | `mysterium_select_encounter` | SHALLOW + BROKEN | **Drops 6 of 8 scheduler fields.** Hardcodes `executionMode: 'capacity'` — **agent CANNOT select shadow-mode encounters.** Hardcodes `shadowTarget: null`, `difficulty: 0.5`, `sessionPosition: 'peak'`. |
| 6 | `mysterium_complete_encounter` | SHALLOW + MISWIRED | **Does NOT drive ConsequenceEngine** as advertised — bridge does it post-loop. Agent gets `{status:'completed'}` with no feedback. Loses 10-dim psychometric scores (old tool had them). Conflates `feedback` with `narrativeSummary`. Cannot resolve shadows (`shadowResolvedId` hardcoded null). Cannot target existing shadows by ID. |
| 7 | `mysterium_check_transformation` | MEDIUM | Drops 3 of 6 promised fields (saturation, shadow clearance, ray readiness). |
| 8 | `mysterium_get_content` | MEDIUM | Returns fallback content. Cannot list modalities/lines/stages, cannot get shadow content, cannot get Language-Reflective assessment context. |
| 9-15 | 7 TDG tools | DEEP (when TDG running) | **System prompt doesn't mention ANY of them.** All 7 are registered but ungoverned. 3 overlap with auto-firing hooks (tdg_create, tdg_connect, tdg_tick) creating duplicate-write risk. `tdg_greater_cycle`, `tdg_consolidate`, `tdg_save_mind_state` used in hooks but NOT exposed to agent. |

### 2.2 Missing tools the ontology requires (17 identified)

**Atman Project / aspiration axis:**
1. No tool to query the player's aspirational direction (upward pull of consciousness)
2. No tool to detect/query the Jonah Complex (fear of one's own greatness)

**Contact Boundary (Gestalt):**
3. No tool to assess contact-boundary disturbances (confluence, isolation, retroflection, projection)

**Greater Cycle manipulation:**
4. `tdg_greater_cycle` NOT exposed to agent — can read readiness but cannot advance the cycle
5. No `mysterium_commit_transformation` tool — transformation happens implicitly, agent has no direct control

**Polarity ontology queries:**
6. No tool to query polarity trajectory / crystallization progress / depolarization
7. No tool to query per-line / per-stage polarity
8. No tool to capture `stageOrientation` / `sourceOfNourishment` (hardcoded in bridge)

**Holon context queries:**
9. No tool to query a specific holon's context (kind, line, stage, archetype, state, relationship)
10. No tool to list holons with filters

**Macro-catalyst PESTLE manipulation:**
11. No tool to accumulate PESTLE tension deliberately
12. No tool to trigger a macro event
13. No tool to query PESTLE numerically

**NPC relationship cultivation:**
14. No tool to deepen an NPC relationship
15. No tool to query an NPC's developmental state
16. No tool to introduce a new NPC

**Shadow regression-targeting:**
17. No tool to query existing shadows for regression work (quadrant, line, stage, severity, readiness)
18. No tool to target a specific shadow by ID
19. No tool to mark a shadow resolved

**UserMatrixModel targeting:**
20. No tool to query the UserMatrixModel cells
21. No tool to update UserMatrixModel targeting

**Session/synthesis management:**
22. No tool to invoke SessionAgent synthesis (dead code)
23. No tool to invoke mid-session consolidation (`tdg_consolidate` not exposed)
24. No tool to save/load mind state on demand

**Per-line / per-drive queries:**
25. No tool to query per-line altitudes
26. No tool to query per-drive directionality (input side; output side exists in `complete_encounter`)

### 2.3 Regressions vs. old 2-tool AgenticOrchestrator

The new 15-tool PersistentAgent LOST these capabilities that the old 2-tool orchestrator had:

| Lost Capability | Old Tool | New Tool |
|---|---|---|
| 10-dim psychometric scores (accuracy, response_time, consistency, depth, self_correction, complexity_handled, transfer, metacognition, coherence, integration) | `complete_encounter.scores` | GONE — only 4-dim `driveScores` |
| Separate `feedback` field (developmental feedback) | `complete_encounter.feedback` | CONFLATED with `narrativeSummary` |
| PESTLE tension accumulation | orchestrator called `accumulateTension` | GONE — no tool |
| Macro event triggering | orchestrator called `tryTriggerMacroEvent` | GONE — no tool |
| Shadow content generation | `generateShadowContent(line, stage, shadowTarget)` | GONE — no tool, dead code |
| Language-Reflective assessment path | `runLanguageReflective` with `buildAssessmentContext(module)` | GONE — no path |
| Concept index access | `conceptIndex` passed to orchestrator | GONE — no tool |
| MultiSelect MCQ | `ask_user_question.multiSelect` | GONE |
| Multi-question batching | `ask_user_question.questions` (array) | GONE — one per call |
| Option preview (code/ASCII) | `ask_user_question.options[].preview` | GONE |

---

## 3. Engine-by-Engine Findings

### 3.1 Dead-code engines (exported, zero runtime callers)

| Engine | LOC | Status | Impact |
|---|---|---|---|
| **GreaterCycleEngine** | 257 | Dead. `computeMetabolicHealth` has 0 callers. CCIEngine duplicates its formula inline. | G_z/P_z computed two different ways; GCE's S·T·G·Ch flows not tracked; `SUBSTRATE_LAYER_LAW` unused; `greatWayDirection`/`greatWayPressure` on Significator never updated. |
| **ShadowDetector** | 121 | Dead. `detectShadows` and `computeBehavioralPatterns` have 0 runtime callers. | The spec's drive-health-formula diagnostic (`addictionRisk = (1-eros)×(1-communion)`) is MISSING. `shouldSurfaceReturn` (Holonic Return) MISSING. `isShadowResolved` MISSING. Shadow detection falls back to ConsequenceEngine's behavioural heuristics only. |
| **SessionAgent** | 229 | Dead. Zero instantiations. | Cross-encounter synthesis is absent. `agentSynthesis` field on ContextPipeline never populated. The plan says `tdg_reflect` replaces SessionAgent, but `tdg_reflect` is TDG-only and has no prompt guidance. |

### 3.2 Partially-implemented engines

| Engine | What's Missing |
|---|---|
| **CCIEngine** | Doesn't call `GreaterCycleEngine.computeMetabolicHealth` (Wave 1.4) — duplicates formula. `oldestUnresolvedAge` is a guess (`totalSessions`). `sessionsSinceLastTransformation` residual bug in `validateSignificator.ts:123` (defaults to 0, causing premature recovery-end for migrated saves). |
| **EncounterScheduler** | Weights DON'T MATCH spec (0.22/0.18/0.13/0.13/0.09/0.09/0.04 + 0.12 userMatrixTargeting vs spec's 0.25/0.20/0.15/0.15/0.10/0.10/0.05). `SHADOW_MODALITY_AFFINITY` matrix NOT IMPLEMENTED (dead-letter spec). `escalateShadow` recurrence strategy MISSING. Full tie-break cascade MISSING. |
| **ConsequenceEngine** | 5 propagation layers: Local ✓, Holonic ✓, Polarity ✓, Scheduler ✗ (no signal field), World-state ✗ (PESTLE updates in AgenticOrchestrator, not here). `rippleDistance` NOT IMPLEMENTED. `holonDeltas` always empty. `altitudeShift`/`driveShift` always null. |
| **PolarityEngine** | `altitude_floor ≥ Orange` check MISSING (Red-stage player can crystallize prematurely). STO 51% / STS 95% harvest thresholds NOT IMPLEMENTED. `direction_strength` field not modelled. `polarity_texture_id` assignment at crystallization > 0.6 NOT IMPLEMENTED. |
| **TransformationDetector** | Knot-untying pairs not generated by scheduler. Dual-shadow window uses OR not AND. AQAL coherence enforcement (all 4 quadrants shift) NOT IMPLEMENTED. `totalKnots` always 1 (blockers always empty when threshold crossed). |
| **ThetaDecay** | Warm-up decay (10% session start) MISSING. Long-absence decay (25% if 14+ days) MISSING. Bleed-through only feeds +0.15 priority boost — no narrative consequence, no cross-line decay transfer. CCIEngine and GCE both re-compute thetaFreshness inline with hardcoded 7-day half-life, ignoring ThetaDecay's per-line half-lives. |
| **ShadowContentGenerator** | 4 templates instead of 256-shadow matrix. `buildShadowPromptSuffix` has 0 runtime callers. No integration with ShadowDetector. No Holonic Return scheduler. |
| **MacroCatalystEngine** | `advanceMacroEvent`/`recordMacroChoice`/`resolveMacroEvent` NEVER CALLED from runtime (Wave 3.2). `endSession` hardcodes `macroEventsAdvanced: 0`. `sessionsActive` never incremented (10-session spacing broken). `≥15 consequences` gate MISSING. `pestleShift` field on ConsequenceRecord doesn't exist. |
| **UserMatrixModel** | 4D cells (256) ✓. But inference ALWAYS applied to Mental dimension only (Biological/Social/Collective decayed but never updated). 8 archetypal roles defined but not used. `internalizedHolons` field on Significator never populated (endosymbiosis dead). `promotePhase` called only from `applyResponseOnly` (CLI-only, not Phaser). |
| **VeilFilter** | `filterInput` STILL NEVER CALLED (HS-05 partial). `filterOutput` wired in LLMClient ✓. Regex-only — no semantic classification. Weirdness signature (HoloOS 08.8.8) NOT preserved by filter (only by ContextPipeline's qualitative substitution). |
| **ContextPipeline** | 7 steps present ✓. But PersistentAgent BYPASSES it entirely — uses its own static SYSTEM_PROMPT. Two parallel context-assembly paths. `agentSynthesis` never populated. `getPlayerPolarityTexture` not consumed. `getDominantPESTLE` not consumed. |

---

## 4. Cross-System Flow Bugs

### 4.1 The four encounter flows and their divergences

| Dimension | Flow A (CLI default) | Flow B (CLI --agent) | Flow C (CLI Direct Q) | Flow D (Phaser) |
|---|---|---|---|---|
| Session start | `startSession` (sync) | `startSessionWithTDG` (async) | `startSession` at END | `startSession` (sync) |
| Scheduling | `tickWithStrategy(null,null)` | same | **BYPASSED** (synthetic) | `tickWithStrategy(null,null)` |
| Encounter run | `AgenticOrchestrator.run` | `PersistentAgent.runEncounter` | `AgenticOrchestrator.run` | `AgenticOrchestrator.run` |
| Consequence application | Inside orchestrator | Inside bridge (post-loop) | Inside orchestrator | Inside orchestrator |
| State advancement | `applyResponseOnly` | `applyResponseOnly` | `applyResponseOnly` (fresh state each) | **DEAD CODE** (keys never set) |
| TDG hooks | Fire in `applyConsequences` | Fire in `applyConsequences` | Fire in `applyConsequences` | Fire in `applyConsequences` |
| TDG feedback | None | `getTDGTransformationPressure` (telemetry only) | None | None |
| UserMatrixModel update | ✓ (via `applyResponseOnly`) | ✓ | ✓ (but `globalThis` side-channel) | **NEVER** (dead code) |
| Session end | `endSession` | `endSession` + `stopTDGBridge` | `endSession` (with fresh state) | `endSession` (saves sig only, not world) |

### 4.2 Critical bugs (P0 — data loss / state corruption)

**BUG 1 — `advanceTransformation` double-counts (ALL flows)**
- `tickWithStrategy(null,null)` calls `advanceTransformation` (GameLoop.ts:356)
- `applyResponseOnly` calls it AGAIN (GameLoop.ts:86)
- Phaser: `EncounterScene.ts:92` + `WorldScene.ts:195` = 2 more calls
- **Impact:** Transformation state machine advances 2× per encounter. Crucible completes in half the intended sessions. Violates foundations/17.
- **Fix:** Skip `advanceTransformation` in `tickWithStrategy` when `response=null`.

**BUG 2 — Phantom `'avoided'` outcomes from scheduling tick (ALL CLI flows)**
- `tickWithStrategy(null,null)` pushes `{outcome:'avoided'}` to `recentOutcomes` (GameLoop.ts:407-414)
- Then `applyResponseOnly` pushes `{outcome:'completed'}`
- **Impact:** `recentOutcomes` is `[completed, avoided, completed, avoided, …]`. `evaluateMidSessionAdjustment` sees ~50% avoidance when player never avoided anything. Session theme may incorrectly switch to 'consolidation'.
- **Fix:** Don't push to `recentOutcomes` when `response=null`.

**BUG 3 — Phaser `applyResponseOnly` is dead code (Flow D)**
- `WorldScene.ts:165-178` reads `'lastPlayerResponse'` and `'lastEncounter'` from registry
- **No scene ever writes these keys** — confirmed by grep
- **Impact:** UserMatrixModel is NEVER updated in Phaser. Scheduler's `userMatrixModel`-aware ranking always sees empty model. The L4 fix is CLI-only.
- **Fix:** Have `EncounterScene`/`DilemmaScene`/`ReflectionScene` set these keys, or call `applyResponseOnly` directly.

**BUG 4 — `onSessionEnd` hook race with `stopTDGBridge` (Flow B)**
- `endSession` fires `onSessionEnd` via `maybeFireHook` (fire-and-forget, async)
- `stopTDGBridge()` is called synchronously immediately after
- **Impact:** TDG-Rust process killed mid-`tdg_save_mind_state`. Session graph snapshot lost.
- **Fix:** Make `endSession` async or expose `awaitSessionEndHooks()`. Await before `stopTDGBridge`.

**BUG 5 — Non-atomic save (ALL flows)**
- CLI: `saveGame(sig); saveWorldState(world);` — two separate `fs.writeFileSync`
- Phaser: `saveProfile(sig)` + `saveWorldState(world)` — two separate async KV writes
- **Impact:** Crash between writes leaves sig and world out of sync.
- **Fix:** Single `GameSaveStore.saveAll(sig, world)` with temp-file + rename.

**BUG 6 — TDG graph state not cleared on `--new-game`**
- `deleteSave()` + `deleteWorldSave()` clear Mysterium state but not TDG graph
- **Impact:** New game inherits old player's developmental graph.
- **Fix:** Call `tdg_clear_mind_state` (or equivalent) in `deleteSave`.

**BUG 7 — `startSession` discards persisted transformation state**
- `startSession` returns `transformationState: createInitialTransformationState()` (always fresh)
- Ignores `sig.transformationPhase`, `sig.transformationSessionsInPhase`, etc.
- **Impact:** `sessionsInPhase` resets to 0 every session. Cross-session transformation continuity partially broken.
- **Fix:** Reconstruct `transformationState` from sig fields (like `EncounterScene.ts:84-91` does).

**BUG 8 — `mysterium_select_encounter` synthesizes encounters outside scheduler pool**
- Agent can select ANY `moduleRef` — even one not in the pool
- Synthesized encounter has hardcoded `sessionPosition:'peak'`, `priority:0.5`, `driveTarget:null`
- **Impact:** Violates foundations/21 §4.4 ("scheduler offers, player chooses"). Agent can bypass scheduler ranking. Wrong `holonSource` → wrong NPC relationship updated.
- **Fix:** Cache the scheduled encounters; agent selects by index or full spec.

### 4.3 Additional flow-level issues

- **Flow C (Direct Questioning) bypasses `tickWithStrategy` entirely** — no auto-mode strategy, no mid-session refresh, no scheduler. `endSession` uses a fresh `SessionState` → `encountersCompleted` always 0, `shadowsSurfaced` always 0. UserMatrixModel stored in `globalThis` (not persisted to disk).
- **Flow D `WorldScene.leaveWorld` saves sig only, not world** — NPC relationships, PESTLE tension, macro events lost on exit.
- **`mapEnergeticDirection('neutral')` inconsistency** — bridge returns `'Sovereign'`, old orchestrator returns `'Diffuse'`. Same player polarity produces different `energeticDirection` depending on path.
- **`shadowSignal.quadrant` cast through `as ShadowQuadrant`** with no validation — LLM hallucinations propagate into `ShadowEntry` with invalid quadrant.
- **`EncounterSelectionScene` is dead code** — registered but never launched. Also has a routing bug (always goes to EncounterScene regardless of modality).

---

## 5. Ontological Contract Violations

### 5.1 The master equation (foundations/21 §1)

```
Game = Significator navigating Great Way through encounters
     with consequences propagating through Choice/polarity engine
     triggering Transformation at stage thresholds
     all behind the Veil of Forgetting
```

| Term | Implementation Status |
|---|---|
| Significator | ✅ Implemented (sole state vessel) |
| Great Way | ❌ NOT a first-class engine (GreaterCycleEngine is dead code; PESTLE exists but MacroCatalystEngine lifecycle unwired) |
| Encounters | ⚠️ Partial (64-cell modules ✓, but agent can synthesize outside pool; 4 flows diverge) |
| Choice/polarity engine | ⚠️ Partial (4-level hierarchy ✓, but no harvest thresholds, no altitude_floor check, no depolarization detection) |
| Transformation | ⚠️ Partial (3-phase crucible ✓, but double-counted, no AQAL enforcement, no knot-pairs) |
| Veil of Forgetting | ⚠️ Partial (output filter ✓, input filter dead, ContextPipeline qualitative substitution ✓ but PersistentAgent bypasses it) |

### 5.2 The two cycles (foundations/13 + foundations/15)

**Lesser Cycle (Matrix → Potentiator → Catalyst → Experience):**
- Matrix/Potentiator modeled as UserMatrixModel 4D cells ✓
- Catalyst = encounters ✓
- Experience = ConsequenceRecord ✓
- **G_z (Lesser-Cycle health):** computed inline in CCIEngine (not delegated to GCE)
- **Missing:** `tdg_tick` exposed to agent but no prompt guidance; ShadowDetector (drive-health diagnosis) dead; 256-shadow matrix reduced to 4 templates

**Greater Cycle (Significator → Transformation → Great Way → Choice):**
- Significator ✓
- Transformation: 3-phase crucible ✓ (but double-counted)
- **Great Way:** dead code (GreaterCycleEngine unwired, MacroCatalystEngine lifecycle unwired)
- **Choice:** polarity engine exists but no harvest thresholds (51%/95%), no crystallization altitude_floor check
- **P_z (Greater-Cycle health):** computed inline in CCIEngine (not delegated to GCE)
- **Missing:** S·T·G·Ch class-typed flows not tracked; `greatWayDirection`/`greatWayPressure` on Significator never updated

### 5.3 The healing/evolution dual vector

**Heal/Evolve (bottom-up, Agape + Agency):**
- Shadow surfacing ✓ (in ConsequenceEngine)
- Holonic Return ❌ (no `shouldSurfaceReturn`, no every-3-encounters cadence)
- Shadow resolution ⚠️ (implicit only — agent cannot resolve by ID)
- 256-shadow matrix ❌ (4 templates only)

**Evolve/Heal (top-down, Eros + Communion):**
- Golden shadow integration ❌ (no tool, no detection)
- Atman Project queries ❌ (no tool)
- Jonah Complex detection ❌ (no tool)
- Next-stage capacity probing ❌ (not in scheduler)

**Total Metabolic Health = G_z · P_z:**
- Both computed (inline in CCI) ✓
- But GCE (canonical source) is dead code ✗
- Liminality signature (transitional state) ✓
- But not fed into transformation detection ✗

---

## 6. Fragmentation Map

### 6.1 Two parallel everything

| Domain | Path 1 | Path 2 | Reconciliation |
|---|---|---|---|
| Agent loop | AgenticOrchestrator (Phaser + CLI default) | PersistentAgent (CLI --agent) | None — they share `applyConsequences` but diverge on context assembly, tool surface, and feedback |
| Context assembly | ContextPipeline 7-step (AgenticOrchestrator) | Static SYSTEM_PROMPT (PersistentAgent) | None — CLI --agent players get less-conditioned LLM context |
| G_z/P_z computation | CCIEngine inline (normalised driveHealth) | GreaterCycleEngine (raw drive weights) | None — same input produces different numbers |
| Veil enforcement | VeilFilter regex (output only) | ContextPipeline qualitative substitution (input) | None — neither calls the other |
| Cross-encounter memory | SessionAgent (dead) | tdg_reflect (TDG-only, no prompt guidance) | None — when TDG is off, NO synthesis exists |
| Shadow detection | ShadowDetector (dead) | ConsequenceEngine behavioural heuristics | None — drive-health-formula diagnostic missing |
| PESTLE updates | AgenticOrchestrator calls `accumulateTension` | ConsequenceEngine doesn't touch PESTLE | None — PESTLE is orphaned in the orchestrator |
| UserMatrixModel persistence | `globalThis` (DQ) / `sessionState` (CLI) / dead (Phaser) | Not in Significator save file | None — model lost on process exit in DQ |

### 6.2 Disconnected systems that should feed each other

- **GreaterCycleEngine → CCIEngine:** GCE computes G_z/P_z; CCI duplicates the formula instead of delegating
- **ShadowDetector → EncounterScheduler:** Detector finds shadows; scheduler should target them via affinity matrix — neither connection exists
- **ShadowContentGenerator → AgenticOrchestrator/PersistentAgent:** Generator builds shadow content; no runtime caller
- **MacroCatalystEngine → GameLoop.endSession:** Lifecycle functions never called; `macroEventsAdvanced` hardcoded 0
- **PolarityEngine → ContextPipeline:** `getPlayerPolarityTexture` exported but not consumed by context pipeline
- **MacroCatalystEngine → ContextPipeline:** `getDominantPESTLE` exported but not consumed
- **UserMatrixModel → Phaser flow:** Model never updated (dead `applyResponseOnly` path)
- **TDG hooks → Agent feedback:** Hooks fire on engine events but agent never sees the results within its loop

---

## 7. Prioritized Action Plan

### P0 — Critical (data loss / state corruption)

1. **Fix `advanceTransformation` double-count** — skip when `response=null` in `tickWithStrategy`
2. **Fix phantom `'avoided'` outcomes** — don't push to `recentOutcomes` when `response=null`
3. **Fix `onSessionEnd` hook race** — make `endSession` async, await hooks before `stopTDGBridge`
4. **Wire Phaser `applyResponseOnly`** — set `lastPlayerResponse`/`lastEncounter` in scenes, or call directly
5. **Atomic save** — single `GameSaveStore.saveAll(sig, world)` with temp-file + rename
6. **Clear TDG graph on `--new-game`** — call `tdg_clear_mind_state` in `deleteSave`
7. **`startSession` should reconstruct state from sig** — not always fresh
8. **Fix `mysterium_select_encounter` to use pool** — don't synthesize outside scheduler ranking

### P1 — High (ontological contract / agent capability)

9. **Fix `mysterium_select_encounter` to accept full ScheduledEncounter** — unblocks shadow-mode selection
10. **Fix `mysterium_complete_encounter` to return ConsequenceRecord** — agent needs feedback loop
11. **Update system prompt to mention TDG tools** — currently 7 tools are ungoverned
12. **Resolve hook-vs-agent duplication** — either hooks or agent tools for `tdg_create`/`tdg_connect`/`tdg_tick`
13. **Expose `tdg_greater_cycle`, `tdg_consolidate`, `tdg_save_mind_state`** — already in hooks, not in agent surface
14. **Wire MacroCatalystEngine lifecycle into `endSession`** (Wave 3.2)
15. **Delegate CCIEngine G_z/P_z to GreaterCycleEngine** (Wave 1.4)
16. **Wire ShadowDetector into runtime** — implement `diagnoseShadows`, `shouldSurfaceReturn`, `isShadowResolved`
17. **Wire Direct Questioning through `tickWithStrategy`** — engage auto-mode strategy
18. **Deepen `mysterium_get_player_state`** — per-line altitudes, per-drive directionality, per-shadow detail, polarity trajectory
19. **Restore psychometric depth** — 10-dim scores, separate `feedback` field
20. **Implement harvest thresholds** — STO 51% / STS 95% + altitude_floor ≥ Orange

### P2 — Medium (completeness / consistency)

21. **Implement `SHADOW_MODALITY_AFFINITY` matrix** — quadrant → modality targeting
22. **Implement Holonic Return schedule** — every 3 encounters, severity > 0.3
23. **Implement 256-shadow matrix** — per-(line, stage, drive, domain) archetypes
24. **Implement warm-up + long-absence theta decay regimes**
25. **Implement `rippleDistance` on ConsequenceRecord** — local / cross-stage / global
26. **Implement `pestleShift` on ConsequenceRecord** — move PESTLE updates from orchestrator to engine
27. **Wire `endosymbiosis`** — populate `internalizedHolons` on Significator
28. **Implement AQAL coherence enforcement** in transformation
29. **Implement knot-untying pairs** in scheduler
30. **Align `mapEnergeticDirection('neutral')`** across paths
31. **Validate `shadowSignal.quadrant`** before casting
32. **Wire `getPlayerPolarityTexture` + `getDominantPESTLE`** into ContextPipeline
33. **Make PersistentAgent use ContextPipeline** — eliminate two-path divergence
34. **Fix `validateSignificator.ts:123`** — `triggeredAtSession` default should be null, not 0

### P3 — Low (dead code / polish)

35. **Remove or wire `EncounterSelectionScene`**
36. **Remove `FORCE_RESPONSES`, `printHelp`, unused render functions**
37. **Remove `computePostTransformationBias`** or wire it
38. **Wire `buildShadowPromptSuffix`** into shadow-mode path
39. **Route VeilFilter violations to TelemetryService** (currently console.warn)
40. **Document M4 as telemetry-only** or close the loop (feed `tdgPressure` into `detectThreshold`)

---

## 8. The Core Insight

The audit reveals a single structural pattern: **Mysterium was built measurement-first, action-last.** The measurement layer (CCI, AutoMode, Scheduler) is deep, faithful, and well-tested. The action layer (agent tools, shadow work, macro-catalyst, greater cycle) is shallow, stubbed, or dead.

This is the inverse of what the ontology requires. Foundations/21 §10 says: *"The LLM is the game's voice, not brain. The scheduler decides what encounter; the LLM decides how to present it."* But the PersistentAgent was designed to BE the brain — to decide, not just present. Yet its tools don't let it decide meaningfully. It can't select shadow encounters, can't resolve shadows, can't drive the greater cycle, can't manipulate PESTLE, can't query per-line altitudes.

**The fix is not to add more tools — it's to wire the deep systems that already exist into the agent's action surface, and to give the agent tools that match the depth of the measurement layer.** The GreaterCycleEngine, ShadowDetector, MacroCatalystEngine, and SessionAgent are all designed and partially implemented. They need to be (a) completed to spec, (b) wired into the runtime, and (c) exposed to the agent through tools that let the agent read their output and drive their behavior.

When that happens, the agent will have the same depth on the action side that CCI/AutoMode/Scheduler have on the measurement side — and the "healing and evolution" objective becomes operationally achievable, not just theoretically specified.
