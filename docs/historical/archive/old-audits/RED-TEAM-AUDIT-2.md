# Red-Team Audit 2.0: Theory vs Implementation

> **Date:** 2026-06-21
> **Scope:** End-to-end operational flow — encounter selection → assessment → scoring → profile update → evolutionary trajectory
> **Method:** 4 parallel codebase agents mapped implementation; 10+ foundation docs read for theoretical substrate

---

## Executive Summary

The game's **engine layer is solid** — all 10 core engines are implemented, wired, and called in the game loop. However, the **intelligence layer** (how engines produce developmental trajectory) has **23 systemic gaps** where the implementation diverges from or simplifies the theoretical substrate.

**By severity:**
- **Tier 0 (Architectural):** 5 gaps — fundamental design commitments not honored
- **Tier 1 (Core Mechanics):** 8 gaps — implemented engines produce incorrect or incomplete results
- **Tier 2 (Wiring):** 6 gaps — engines exist but are called incorrectly or with wrong data
- **Tier 3 (Polish):** 4 gaps — simplified paths that work but don't match theory

---

## Tier 0: Architectural Gaps

### G.01 — Veil of Forgetting Violated

**Theory (foundations/20):** The game must NEVER show:
- Assessment scores, drive-health values, or developmental measurements
- Polarity vectors or shadow ledgers
- Stage altitude or progression percentages
- The line×stage matrix

**Implementation:**
- `cli-game.ts:L594-615`: CCI displayed as bar + 5 dimension breakdown
- `cli-game.ts:L560-591`: Per-line stage bars displayed
- `cli-game.ts:L639-669`: Shadow ledger displayed with quadrant labels
- `cli-game.ts:L672-690`: Drive labels (Agency/Communion/Eros/Agape) displayed
- `cli-game.ts:L1267-1290`: Per-encounter score, pass/fail, polarity direction shown

**Impact:** The player can optimize for visible metrics rather than authentic expression. The game becomes a test, not a practice.

**Fix:** Hide all metrics behind experiential feedback channels. Show qualitative signals ("clean / tight / loose / fumbled"), not quantitative scores.

---

### G.02 — Modality Collapse (7 Modalities → 1 Active)

**Theory (foundations/11):** 7 modalities × 8 stages = 56 unique game experiences. Each modality probes different dimensions of the same shadow.

**Implementation:**
- `TaskRenderers.ts`: Only 15 task-type renderers exist (n_back, stroop, go_no_go, hold, pattern, dilemma, etc.)
- Most modules fall back to `n_back` or `stroop` regardless of modality
- `Strategic`, `Embodied`, `SocialCooperative`, `ImmersiveRPG` have no stage-specific content
- `FallbackProvider.ts`: Many stages have only 1-2 pre-authored content items

**Impact:** The game feels repetitive. The 7-modality system is a design document, not a playable reality.

**Fix:** Implement modality-specific content generators for each modality×stage combination. Prioritize `Deterministic` (already has most content) and `LanguageReflective` (already has LLM path).

---

### G.03 — LLM as Narrative Wrapper

**Theory (foundations/14):** The LLM should be an assessment engine that evaluates open-ended responses for depth, coherence, metacognition, and integration.

**Implementation:**
- `AgenticOrchestrator.ts:L352-428`: LLM loop max 10 iterations, 2-exchange budget
- `AgenticOrchestrator.ts:L337`: Hardcoded 2-exchange budget forces `complete_encounter` after 2 asks
- `AgenticOrchestrator.ts:L1596`: Confidence always hardcoded to 0.8
- Shadow keyword detection (`L198-209`) is static matching with random intensity (0.3-0.8)

**Impact:** The LLM acts as a narrative wrapper for deterministic MCQs, not an assessment engine. The "Language-Reflective" modality is the only path where the LLM actually evaluates responses.

**Fix:** Expand the LLM's role to evaluate responses across all modalities, not just Language-Reflective. Remove the 2-exchange budget and allow deeper dialogue when the LLM detects nuance.

---

### G.04 — Shadow Detection Incomplete (3/4 Quadrants)

**Theory (foundations/10):** 4 shadow quadrants: DarkAddiction, DarkAllergy, GoldenAddiction, GoldenAllergy.

**Implementation:**
- `ProfileUpdater.ts:L39-43`: `SIGNAL_TO_QUADRANT` maps only 3 signal types → 3 quadrants
- `fixation` → `DarkAddiction`
- `regression` → `DarkAllergy`
- `repression` → `GoldenAddiction`
- **Missing: `GoldenAllergy` is never produced by detection**
- `ShadowContentGenerator.ts:L105-123`: Has templates for GoldenAllergy but they are unreachable

**Impact:** The game cannot detect when a player refuses to grow (GoldenAllergy). This is a critical shadow type for evolutionary trajectory.

**Fix:** Add a `GoldenAllergy` signal type to `ShadowDetector.ts` and map it in `SIGNAL_TO_QUADRANT`.

---

### G.05 — Behavioral Pattern Pipeline Dead

**Theory (foundations/12):** Shadow detection should use behavioral probes across encounters (avoidance patterns, failure streaks, defensive choices).

**Implementation:**
- `ShadowDetector.ts:L47-74`: `detectBehavioralPatterns()` accepts `BehavioralPattern[]` parameter
- **NO CALLER ever provides this parameter.** The `patterns` parameter is always omitted.
- Behavioral detection (avoidance > 0.7, failureStreak >= 3, defensiveChoiceRate > 0.6) is implemented but completely dead code.

**Impact:** Shadow detection relies solely on structural thresholds (altitude gaps) and ledger-based signals (existing shadows). No behavioral analysis occurs.

**Fix:** Wire behavioral pattern computation from encounter history into `detectShadows()`.

---

## Tier 1: Core Mechanics Gaps

### G.06 — Shadow Content Generator Never Invoked

**Theory (foundations/14):** Shadow encounters require specific content generation tailored to the shadow quadrant.

**Implementation:**
- `ShadowContentGenerator.ts`: Exists with `generateShadowContent()` and `buildShadowPromptSuffix()`
- **Neither function is called by GameLoop.ts, EncounterScene.ts, or ContextPipeline.ts**
- Shadow encounters receive the same LLM system prompt as capacity encounters, minus the shadow prompt suffix

**Impact:** Shadow encounters are not distinguishable from capacity encounters in the LLM's behavior.

**Fix:** Import and invoke `ShadowContentGenerator` in `ContextPipeline.ts` when `executionMode === 'shadow'`.

---

### G.07 — Knot Resolution Has No Content

**Theory (foundations/17):** The crucible phase should present specific "knot" content for the player to untie.

**Implementation:**
- `TransformationDetector.ts:L154-157`: `recordKnotResolution()` just increments a counter
- No concept of what a "knot" is, what content addresses it, or how resolution is determined
- Resolution occurs when `shadow encounter passed` — no specific knot content

**Impact:** The crucible phase feels like "do more shadow encounters" rather than "untie specific developmental knots."

**Fix:** Define knot types per line×stage and map them to specific encounter content.

---

### G.08 — Transformation State Machine Desynchronized

**Theory (foundations/17):** Single canonical transformation state.

**Implementation:**
- Two independent state machines:
  1. `GameLoop.tickWithStrategy()` (L108): creates `TransformationState` and advances it
  2. `EncounterScene.onAssessmentComplete()` (L79-101): reconstructs `TransformationState` from `sig.transformationPhase` string and advances independently
- These can desynchronize because GameLoop stores `transformationState` in `SessionState` while EncounterScene stores `transformationPhase` on `Significator`

**Impact:** Transformation events may fire multiple times or not at all depending on which path is taken.

**Fix:** Pick one canonical source (either `SessionState` or `Significator.transformationPhase`) and remove the other.

---

### G.09 — Polarity Engine Never Affects Encounter Selection

**Theory (foundations/19):** Polarity traces should influence which encounters are offered. STO-aligned players should receive different catalyst than STS-aligned players.

**Implementation:**
- `PriorityComputation.ts:L136-150`: `computePolarityAlignment()` returns scores but these are only ONE of 7 priority components (weight 0.15)
- The polarity mode on `ScheduledEncounter` is set but never used to filter or modify encounter content
- No STO/STS path differentiation in encounter generation

**Impact:** Polarity is recorded but doesn't shape the player's journey. The "Choice" archetype (foundations/19) is decorative, not functional.

**Fix:** Use polarity mode to filter encounter candidates and modify LLM system prompts.

---

### G.10 — Altitude Shift Computation Oversimplified

**Theory (foundations/17):** Stage transitions require specific conditions: line convergence, shadow clearance, and integration readiness.

**Implementation:**
- `AgenticOrchestrator.ts:L907+`: `computeAltitudeShift()` only triggers when ALL drives are `HealthyBalanced` AND passed
- Advances line altitude by 1 stage (if not already at max)
- No convergence check (multiple lines must be ready)
- No integration readiness check

**Impact:** Players can advance individual lines without the broader developmental readiness that theory requires.

**Fix:** Implement the convergence check: require N lines at or above current stage before allowing advancement.

---

### G.11 — Shadow Resolution Is Binary

**Theory (foundations/14):** Integration should be tracked gradually across encounters.

**Implementation:**
- `ConsequenceEngine.ts:L111-124`: Implicit integration path resolves ALL shadows on a line when `allDrivesHealthy`
- This is a coarse binary: either ALL healthy → resolve all, or none
- No gradual integration tracking

**Impact:** A player who heals one shadow on a line while others remain gets no credit. The system doesn't track partial integration.

**Fix:** Implement per-shadow integration tracking based on encounter quality and shadow-specific scoring.

---

### G.12 — Dual Profile Update Paths

**Theory:** Profile updates should follow a single, consistent logic.

**Implementation:**
- **Path A:** `ProfileUpdater.updateProfile()` — used by `GameLoop.executeModule()` (headless/test mode)
  - Maps trial accuracy → proposed stage → ceiling enforcement → stage synthesis → ray profile → shadow detection
- **Path B:** `ConsequenceEngine.applyConsequences()` — used by `tick()`/`tickWithStrategy()` (game loop)
  - Records polarity trace → updates theta → updates drive balance → surfaces/resolves shadows → updates NPC relationships

**Impact:** Headless mode and game mode produce different developmental outcomes for the same encounter.

**Fix:** Unify into a single update path. Either use `applyConsequences` everywhere or reconcile the two paths.

---

### G.13 — Confidence Always 0.8

**Theory (foundations/08):** Confidence should reflect measurement reliability — more trials, higher consistency → higher confidence.

**Implementation:**
- `AgenticOrchestrator.ts:L1596`: `createAssessmentResult` hardcodes confidence to 0.8 regardless of actual trial count or consistency

**Impact:** The system treats all assessments as equally reliable, even when based on 1 trial vs 10 trials.

**Fix:** Use the `computeConfidence()` function in `engine.ts:L68-103` which calculates distance × consistency × trialFactor.

---

### G.14 — Shadow Severity Mostly Hardcoded

**Theory (foundations/10):** Shadow severity should reflect depth and persistence of the pattern.

**Implementation:**
- `ProfileUpdater.ts:L104`: All new shadow entries created with `severity: 1` (hardcoded max)
- `ConsequenceEngine.ts:L83`: Uses `Math.min(1, 0.3 + fixationRisk * 0.4)` — provides some gradient
- `ShadowDetector.ts`: No severity computation at all — signals are binary

**Impact:** Shadows appear at maximum severity from first detection, with no progression from mild to severe.

**Fix:** Compute severity based on encounter history, avoidance patterns, and recurrence count.

---

## Tier 2: Wiring Gaps

### G.15 — Legacy EncounterScheduler Dead Code

**Implementation:**
- `src/core/usecases/EncounterScheduler.ts` (73 lines): Contains `getHorizonLine()` and `suggestNextEncounter()`
- Exported from `core/index.ts:31` but never used by GameLoop or any scene
- The real scheduler is `engines/EncounterScheduler.ts`

**Fix:** Delete the legacy file and its barrel export.

---

### G.16 — Barrel Export Gap (7/10 Engines Missing)

**Implementation:**
- `core/index.ts` exports only 3 of 10 engines: CCIEngine, AutoModeStrategy, GameLoop
- The other 7 engines are imported directly by consumers, violating the stated architecture principle: *"The Phaser layer should only import from this barrel — never from individual files."*

**Fix:** Add all 10 engines to `core/index.ts`.

---

### G.17 — `tick()` Function May Be Dead Code

**Implementation:**
- `GameLoop.ts:L282`: `tick()` labeled "preserved for backward compatibility when auto-mode is not active"
- No scene currently calls it directly — all game paths use `tickWithStrategy()`

**Fix:** Confirm no external consumers depend on `tick()`. If none, remove it.

---

### G.18 — Shadow Keyword Detection Is Static

**Implementation:**
- `AgenticOrchestrator.ts:L198-209`: Pure keyword matching against 4 expanded keyword lists (~30 keywords each)
- Each quadrant returns `0.3-0.8` random intensity (NOT deterministic)
- Only fires for write-in text (MCQ selections do NOT trigger shadow detection)

**Impact:** The system cannot detect nuanced shadow patterns. A player writing "I don't want to change" in a reflective prompt gets the same intensity as "I'm terrified of growth."

**Fix:** Implement contextual shadow detection using the LLM to evaluate responses for shadow patterns.

---

### G.19 — No Perceptual Layer Shift at Transformation

**Theory (foundations/21):** At Transformation, the player's dominant perceptual layer shifts. Previously invisible NPCs become visible, environments change, audio shifts.

**Implementation:**
- `EncounterScene.ts:L83-86`: When shadow encounter passed during crucible, `recordKnotResolution()` called
- No renderer palette shift, no NPC visibility change, no audio shift
- `LayerRenderer.ts`: Displays layers in CLI but doesn't change based on transformation

**Impact:** Transformation events don't feel like "revelation" — they're invisible state changes.

**Fix:** Implement the perceptual layer shift at transformation: palette change, NPC visibility masks, audio modulation.

---

### G.20 — PESTLE Tension Random

**Theory (foundations/18):** PESTLE dimensions should accumulate tension based on player choices and world events.

**Implementation:**
- `AgenticOrchestrator.ts:L989-990`: Random PESTLE dimension selected each encounter (uniform random), fixed 0.05 increment

**Impact:** PESTLE tension is noise, not signal. It doesn't reflect the player's actual impact on the world.

**Fix:** Map encounter outcomes to specific PESTLE dimensions based on the encounter's content and the player's choices.

---

## Tier 3: Simplification Gaps

### G.21 — NPC Relationships Oversimplified

**Theory (foundations/18):** NPCs are developmental beings with their own shadow dynamics and evolutionary trajectories.

**Implementation:**
- `AgenticOrchestrator.ts:L1659-1661`: Fixed +/-0.05 per encounter, with progressive degradation multiplier on failures
- No NPC shadow state, no NPC developmental trajectory, no NPC-driven catalyst

**Impact:** NPCs are flat relationship meters, not co-evolving holons.

**Fix:** Implement NPC developmental profiles that mirror the player's system.

---

### G.22 — Response Quality Estimation Heuristic

**Theory:** Mid-session adjustments should be based on actual assessment data.

**Implementation:**
- `GameLoop.ts:L253-273`: `estimateResponseQuality()` uses a naive heuristic based on drive diversity, shadow surfacing, narrative length
- Not grounded in actual assessment scoring

**Impact:** Mid-session adjustments may be based on incorrect quality estimates.

**Fix:** Use actual `AssessmentResult` scores for quality estimation.

---

### G.23 — Calibration Covers Only 6/8 Lines

**Implementation:**
- `cli-game.ts:L362`: Only 6 of 8 lines have calibration prompts
- Somatic and Willpower use timing probes but have no validation of measurement accuracy

**Impact:** 2 lines start with potentially inaccurate defaults.

**Fix:** Add calibration prompts for Somatic and Willpower lines.

---

## Upgrade Roadmap

### Phase 1: Fix Foundation (Week 1-2)

| Gap | Effort | Impact |
|-----|--------|--------|
| G.01 — Veil violation | 2 days | HIGH — restores game's core design commitment |
| G.04 — GoldenAllergy detection | 1 day | HIGH — completes 4-quadrant shadow system |
| G.05 — Behavioral pattern wiring | 2 days | HIGH — enables behavioral shadow detection |
| G.06 — Shadow content generator | 1 day | HIGH — shadow encounters become distinct |
| G.13 — Confidence computation | 0.5 day | MEDIUM — measurement reliability |
| G.14 — Shadow severity gradient | 1 day | MEDIUM — shadow progression |
| G.15 — Legacy dead code cleanup | 0.5 day | LOW — code hygiene |

### Phase 2: Restore Intelligence (Week 3-4)

| Gap | Effort | Impact |
|-----|--------|--------|
| G.02 — Modality content expansion | 5 days | HIGH — makes 7 modalities playable |
| G.03 — LLM as assessment engine | 3 days | HIGH — removes 2-exchange budget |
| G.07 — Knot resolution content | 2 days | MEDIUM — crucible phase becomes meaningful |
| G.08 — Transformation state unification | 1 day | MEDIUM — prevents desync bugs |
| G.09 — Polarity → encounter selection | 2 days | MEDIUM — polarity shapes journey |
| G.10 — Altitude shift convergence | 1 day | MEDIUM — prevents premature advancement |
| G.11 — Gradual shadow resolution | 2 days | MEDIUM — tracks partial integration |
| G.12 — Unified profile update | 1 day | MEDIUM — consistent outcomes |

### Phase 3: Complete Vision (Week 5-6)

| Gap | Effort | Impact |
|-----|--------|--------|
| G.17 — Remove legacy tick() | 0.5 day | LOW — code hygiene |
| G.18 — Contextual shadow detection | 3 days | HIGH — nuanced shadow recognition |
| G.19 — Perceptual layer shift | 3 days | HIGH — transformation becomes visceral |
| G.20 — PESTLE → encounter mapping | 2 days | MEDIUM — world responds to choices |
| G.21 — NPC developmental profiles | 3 days | MEDIUM — NPCs become co-evolving |
| G.22 — Quality estimation from assessment | 1 day | LOW — better mid-session adjustments |
| G.23 — Calibration for all 8 lines | 1 day | LOW — accurate defaults |

---

## Appendix: Engine Status Summary

All 10 core engines are **fully implemented and wired**:

| Engine | Lines | Status | Called in GameLoop |
|--------|-------|--------|-------------------|
| ThetaDecay | 54 | ✅ FULLY FUNCTIONAL | YES |
| PolarityEngine | 151 | ✅ FULLY FUNCTIONAL | INDIRECTLY |
| MacroCatalystEngine | 218 | ✅ FULLY FUNCTIONAL | INDIRECTLY |
| CCIEngine | 708 | ✅ FULLY FUNCTIONAL | YES |
| ConsequenceEngine | 287 | ✅ FULLY FUNCTIONAL | YES |
| EncounterScheduler | 177 | ✅ FULLY FUNCTIONAL | YES |
| CandidateGeneration | 269 | ✅ FULLY FUNCTIONAL | INDIRECTLY |
| PriorityComputation | 259 | ✅ FULLY FUNCTIONAL | INDIRECTLY |
| TransformationDetector | 172 | ✅ FULLY FUNCTIONAL | YES |
| AutoModeStrategy | 720 | ✅ FULLY FUNCTIONAL | YES |

**Total engine lines:** ~2,787
**Total assessment/orchestration lines:** ~4,000+
**Total CLI/game layer lines:** ~3,500+

The engine layer is clean. The gaps are in how engines produce developmental trajectory, not in whether they're called.
