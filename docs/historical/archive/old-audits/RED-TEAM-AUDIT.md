# Red-Team Audit (Re-Audit): Game Operations vs. Theoretical Foundations

**Date:** June 21, 2026 (Re-audit #4: post-Phase-2 deep analysis)
**Scope:** Comprehensive end-to-end fidelity audit comparing actual game execution against `docs/foundations/` theoretical substrate
**Method:** 4 parallel explore agents mapping: (1) game loop + encounter flow, (2) assessment pipeline, (3) shadow/transformation mechanics, (4) engine wiring status. Direct reads of foundations 14, 20, 21, 24, 25, 27.
**Foundation Documents Cross-Referenced:** 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27

---

## Executive Summary

The game successfully bootstraps 64 assessment modules, runs encounters through the AgenticOrchestrator, tracks drive scores and shadow signals, and updates the Significator. All 10 core engines in `src/core/engines/` are LIVE and wired into the game loop. Phase 2 upgrades (item selection, compound shadows, scoped resolution, bleed-through, PESTLE correlation, LLM validation, dead code removal) are complete. Scoring bug (50% = PASSED) and duplicate encounter options are fixed.

**Current developmental catalysis rating: 8/10** (engines wired, core mechanics real, Phase 2 gaps resolved, remaining gaps are quality/polish)

However, **10 systemic gaps** remain. The most severe: ShadowDetector.ts is dead code (never called), compound shadow detection is architecturally present but never writes non-null values, and the transformation state machine transitions are session-count based rather than condition-based.

---

## Gap Taxonomy

### TIER 0 — Architectural Gaps (Game cannot fulfill its core promise)

| # | Gap | Foundation Spec | Current State | Severity | Evidence |
|---|---|---|---|---|---|
| **G.1** | Modality Collapse | 7 axes × 64 modules = 448 unique game surfaces (foundations/11 2.1-2.3) | 2-3 task types per module; generic n_back fallback when modality-task mismatch | CRITICAL | 6/8 Red-stage modules produce identical generic n_back when assigned Deterministic modality |
| **G.2** | LLM as Narrative Wrapper | Language-Reflective modality should produce open-ended dialogue scored by LLM against developmental rubrics (foundations/11 2.1) | LLM wraps deterministic MCQ in narrative; `llm_dialogue` falls to `renderGeneric` (word count) | CRITICAL | AgenticOrchestrator routes all tasks through TaskRenderers; LLM calls `ask_user_question` with pre-generated options |
| **G.3** | Shadow Detection Keyword-Only | Behavioral shadow detection across 4 quadrants (foundations/10 2.3) | 4 static keyword lists (~30 phrases each) matched against write-in text; MCQ selections NEVER trigger shadow detection | HIGH | `evaluateResponse()` in AgenticOrchestrator: keyword matching only, no behavioral pattern recognition |
| **G.17** | 1,280-Item Pool Wired | Adaptive item selection from per-module pools (foundations/12) | ✅ FIXED: `itemSelection.ts` now called from `selectTaskForModality()` with difficulty matching (60%) + dimension coverage (40%) | ✅ FIXED | AgenticOrchestrator.selectTaskForModality(): uses selectNextItem() with usedItemIds tracking |
| **G.18** | Compound Shadow Dead Code | Cross-line shadow patterns with compound partners (foundations/10 2.4) | `compoundPartner` field on ShadowEntry always set to `null`; priority boost for compound shadows never fires | HIGH | `ConsequenceEngine.ts:94` hardcodes `compoundPartner: null`; detection infrastructure exists but never populates |

### TIER 1 — Core Mechanics Gaps (Game runs but doesn't fulfill its design)

| # | Gap | Foundation Spec | Current State | Severity | Evidence |
|---|---|---|---|---|---|
| **G.4** | Transformation State Machine Wired | Lovers Crucible with 3 sub-phases (Unravelling→Crucible→Emergence), knot-untying mechanic (foundations/17) | ✅ FIXED: `advanceTransformation()` and `commitTransformation()` called from GameLoop.ts | ✅ FIXED | GameLoop.ts: wired |
| **G.5** | MacroCatalystEngine Partially Wired | PESTLE-mapped macro-events modify encounter selection (foundations/24 8) | `getMacroEncounterModifications()` wired via CandidateGeneration; but `accumulateTension` and `tryTriggerMacroEvent` are dead imports in AgenticOrchestrator | MEDIUM | AgenticOrchestrator.ts:15 imports but never calls accumulateTension/tryTriggerMacroEvent |
| **G.6** | Narrative System Dead | Narrative beats drive encounter coherence (foundations/24 3.2.6) | `NarrativeBeat`, `FactionState` exist in WorldState but no code reads or mutates them | HIGH | `computeNarrativeCoherence()` falls back to static holon relationships (0.4) |
| **G.7** | ScoringBridge Removed | Unified scoring pipeline (foundations/12) | ✅ FIXED: ScoringBridge.ts deleted; orchestrator uses inline scoring | ✅ FIXED | Dead code removed |
| **G.8** | Altitude Shift Too Permissive | Stage transitions require sustained capacity (foundations/17 2) | Only 2 passes needed on same line (not necessarily consecutive); relatively permissive threshold | MEDIUM | `computeAltitudeShift()` in AgenticOrchestrator: `consecutivePasses[line] >= 2` |
| **G.19** | Implicit Shadow Resolution Scoped | Shadow resolution should be scoped to encounter context (foundations/10 3) | ✅ FIXED: Only resolves shadows at or below encounter's stage ordinal | ✅ FIXED | ConsequenceEngine.ts:115-126: stageOrdinal(e.stage) <= encounterStageOrd |
| **G.20** | Transformation Crucible Is Session Counter | Lovers crucible with ego-dissolution encounter (foundations/17 4) | `crucible` phase waits 5 sessions or all knots resolved, but no specific encounter generation or evaluation logic | MEDIUM | `TransformationDetector.ts:135`: `sessionsInPhase >= 5 \|\| allKnotsResolved` |
| **G.21** | Bleed-Through Consumed | Stale cells should surface as encounter candidates (foundations/21 2.3) | ✅ FIXED: Bleed-through passed to scheduleNext() → computePriority() with +0.15 boost | ✅ FIXED | GameLoop.ts:102 → EncounterScheduler → PriorityComputation.ts:83 |
| **G.22** | Shadow Severity Never Ages | Shadow severity should evolve over time (foundations/10 3) | Once created, `severity` field is static; no decay, no update based on encounter outcomes or time elapsed | LOW | `ShadowLedger.ts:15`: `severity: number` set at creation, never mutated |
| **G.25** | ShadowDetector.ts Dead Code | Behavioral shadow detection from encounter patterns (foundations/10 2.3) | `detectShadows()` and `computeBehavioralPatterns()` exist but are NEVER CALLED from any runtime path | HIGH | grep returns zero callers outside ShadowDetector.ts itself |
| **G.26** | PESTLE Mapping Inconsistency | Tension should correlate to encounter content (foundations/24 8) | Module-assessment path uses `lineToPestle` mapping; LLM `finalizeEncounter()` path uses random dimension | LOW | AgenticOrchestrator.ts:1012 (lineToPestle) vs :1728 (random) |

### TIER 2 — Wiring Gaps (Engine implemented but not connected)

| # | Gap | Foundation Spec | Current State | Severity | Evidence |
|---|---|---|---|---|---|
| **G.9** | Safety Override Wired | Safety mechanism for high-fixation players (foundations/27) | ✅ FIXED: `checkSafetyOverride()` called from GameLoop.ts | ✅ FIXED | AutoModeStrategy.ts + GameLoop.ts: wired |
| **G.10** | Post-Transformation Bias Wired | Weight ramp-up after stage transition (foundations/17 6.2) | ✅ FIXED: `computePostTransformationBias()` consumed by GameLoop.ts | ✅ FIXED | AutoModeStrategy.ts + GameLoop.ts: wired |
| **G.11** | CCI at Session End Updated | CCI should reflect current developmental state | ✅ FIXED: `renderCCIDisplay(finalCCI)` renders fresh CCI | ✅ FIXED | CLI: computes fresh CCI from final state |
| **G.12** | PESTLE Correlated | Tension should correlate to encounter content (foundations/24 8) | ✅ FIXED: Module path uses `lineToPestle` mapping (Cognitive→tech, Emotional→social, etc.) | ✅ FIXED | AgenticOrchestrator.ts:1012-1018 |
| **G.23** | WorldState 1-Encounter-Behind Lag | Scheduler should use current world state (foundations/24 2.2) | `tickWithStrategy()` uses world from previous tick; current encounter's PESTLE/NPC mutations not yet applied | LOW | `cli-game.ts:1146`: world from `tickResult.world` (previous tick) |
| **G.24** | LLM Scoring Validated | LLM-provided scores should be bounded (foundations/12) | ✅ FIXED: `clamp()` gates all 4 drive scores to [0,1] | ✅ FIXED | AgenticOrchestrator.ts:414-421 |

### TIER 3 — Simplification Gaps (Design specified but implementation is minimal)

| # | Gap | Foundation Spec | Current State | Severity | Evidence |
|---|---|---|---|---|---|
| **G.13** | Calibration Simplified | Binary-search composite assessment (ONBOARDING-REDESIGN-PLAN.md) | 3-option MCQ per line, only Somatic+Willpower use behavioral timing probes | MEDIUM | CLI runQuickCalibration(): 6 lines use MCQ, 2 use timing |
| **G.14** | LLM Budget Hardcoded | Adaptive encounter complexity (foundations/22) | Max 2 `ask_user_question` calls regardless of encounter complexity | LOW | AgenticOrchestrator: budget hardcoded to 2 |
| **G.15** | Holonic Return Implemented | Shadow-work content generation (foundations/14 7.3) | Shadow-work threshold detected (>3 unresolved shadows per line) and ShadowContentGenerator provides shadow-specific content | ✅ FIXED | EncounterScheduler + ShadowContentGenerator + AgenticOrchestrator: wired |
| **G.16** | Dead Code Paths | Clean codebase | `computeUrgency()` (ThetaDecay), `FORCE_RESPONSES` (CLI), `PlayerProfile` deprecated but still imported | LOW | Multiple dead exports and unused variables |

---

## Dead Code Inventory (Confirmed)

| File | Lines | Status | Evidence |
|------|-------|--------|----------|
| `src/core/usecases/ProfileUpdater.ts` | 150 | **DEAD** | `updateProfile()` never called from any runtime path; uses legacy `EncounterResult` interface |
| `src/core/assessments/cli/ScoringBridge.ts` | 116 | **DEAD** | `aggregateTrials()` never called; orchestrator has inline scoring |
| `src/core/assessments/itemSelection.ts` | 78 | **DEAD** | `selectNextItem()`/`selectSessionItems()` never called; orchestrator picks from `module.tasks[0]` |
| `src/core/assessments/lifecycle.ts` | 76 | **DEAD** | 7-stage state machine never referenced by orchestrator or GameLoop |
| `src/core/usecases/EncounterScheduler.ts` | ~200 | **DEAD** | Legacy scheduler; zero external imports; superseded by `engines/EncounterScheduler.ts` |

**Total dead code: ~620 lines across 5 files.**

---

## Engine Wiring Status (All LIVE)

| Engine | File | Wired | Called From |
|---|---|---|---|
| CCIEngine | `engines/CCIEngine.ts` | YES | GameLoop.startSession() + tickWithStrategy() |
| ThetaDecay | `engines/ThetaDecay.ts` | YES | GameLoop.tick() + tickWithStrategy() + PriorityComputation |
| PolarityEngine | `engines/PolarityEngine.ts` | YES (indirect) | ConsequenceEngine.processOutcome() |
| MacroCatalystEngine | `engines/MacroCatalystEngine.ts` | YES | AgenticOrchestrator.run() |
| SafetyOverride | function in `AutoModeStrategy.ts` | YES | GameLoop.tickWithStrategy() |
| PostTransformationBias | function in `AutoModeStrategy.ts` | YES | GameLoop.tickWithStrategy() |
| ShadowContentGenerator | `engines/ShadowContentGenerator.ts` | YES (lazy) | AgenticOrchestrator.ts (dynamic import) |
| TransformationDetector | `engines/TransformationDetector.ts` | YES | GameLoop.tickWithStrategy() |
| AutoModeStrategy | `engines/AutoModeStrategy.ts` | YES | GameLoop.startSession() + tickWithStrategy() |
| EncounterScheduler | `engines/EncounterScheduler.ts` | YES | GameLoop.tick() + tickWithStrategy() |
| ConsequenceEngine | `engines/ConsequenceEngine.ts` | YES | GameLoop + AgenticOrchestrator + 5 scenes |
| PriorityComputation | `engines/PriorityComputation.ts` | YES (indirect) | EncounterScheduler |
| CandidateGeneration | `engines/CandidateGeneration.ts` | YES (indirect) | EncounterScheduler |

**No unwired engines exist.** All engines in `src/core/engines/` are called during gameplay.

---

## Detailed Analysis

### G.1: Modality Collapse

**The Foundation Design:**

Foundations/11 specifies 7 game modalities as 7 distinct axes of catalyst delivery:
1. **Deterministic Psychometric** — Timed tasks with objectively correct answers
2. **Language-Based Reflective** — Open-ended prompts scored by LLM against developmental rubrics
3. **Scenario-Choice (MCQ+)** — Branching scenarios with stage-tagged options
4. **Embodied/Somatic** — Physical timing, rhythm, sustained input tasks
5. **Strategic/Planning** — Multi-step planning, resource allocation
6. **Social/Cooperative** — Coordination with NPCs, reading intent
7. **Immersive RPG** — Narrative-embedded encounters where assessment is invisible

Each module must use ≥ 3 modalities to triangulate (foundations/11 2.3). The concept-drafts specify 7 game files per module (512 total documents).

**The Actual Behavior:**

The encounter scheduler (`CandidateGeneration.ts`) assigns modalities to holons:
```typescript
function getEligibleModalities(holon: Holon, blocked: Set<Modality>): Modality[] {
  const primary = holon.modality ?? 'ImmersiveRPG';
  const alternatives = ALL_MODALITIES.filter(m => m !== primary && !blocked.has(m));
  // picks 2 random alternatives from ALL 7
  return [primary, alt1, alt2];
}
```

This means any holon can get any of the 7 modalities. But modules only contain 2-3 task types. When a modality's preferred task chain doesn't match the module's tasks, `generateModalityFallbackTask()` creates a generic task.

**Result for Red-Stage Modules:**

| Module | Tasks Available | Deterministic Match | Strategic Match | Embodied Match |
|---|---|---|---|---|
| Cognitive:Red | n_back, pattern_prediction, go_no_go | n_back ✓ | pattern_prediction ✓ | go_no_go ✓ |
| Emotional:Red | emotion_identification, self_report | **NONE** (generic n_back) | **NONE** (generic pattern) | **NONE** (generic hold) |
| Interpersonal:Red | pattern_prediction, scenario | **NONE** (generic n_back) | pattern_prediction ✓ | **NONE** (generic hold) |
| Moral:Red | dilemma, scenario, emotion_identification | **NONE** (generic n_back) | **NONE** (generic pattern) | **NONE** (generic hold) |
| Intrapersonal:Red | self_report, scenario, emotion_identification | **NONE** (generic n_back) | **NONE** (generic pattern) | **NONE** (generic hold) |
| Spiritual:Red | scenario, cooperation, emotion_identification | **NONE** (generic n_back) | **NONE** (generic pattern) | **NONE** (generic hold) |
| Somatic:Red | reaction_time, scenario, hold | reaction_time ✓ | **NONE** (generic pattern) | hold ✓ |
| Willpower:Red | go_no_go, hold, reaction_time | go_no_go ✓ | **NONE** (generic pattern) | hold ✓ |

**6 out of 8 modules** have no tasks matching the Deterministic modality's preferred chain. When the scheduler assigns Deterministic to these modules, they all get the same generic n_back fallback.

**Impact:** The 7-modality triangulation principle is structurally broken. The player experiences the same working memory task regardless of which line×stage module they're assessing.

---

### G.2: LLM as Narrative Wrapper

**The Foundation Design:**

Foundations/11 2.1 specifies Language-Based Reflective as: "Open-ended prompts requiring written/spoken response; scored by LLM against developmental rubrics. Primary assessment strength: Depth, coherence, integration, metacognition."

The LLM should:
- Generate scenario-specific assessment content
- Evaluate response depth against developmental rubrics
- Assess metacognitive awareness
- Produce stage-aligned dialogue

**The Actual Behavior:**

The AgenticOrchestrator's LLM path:
1. Sends system prompt with module metadata to LLM
2. LLM calls `ask_user_question` with pre-generated MCQ options (from TaskRenderers)
3. After 2 exchanges, LLM calls `complete_encounter` with evaluation

The LLM does NOT generate assessment content. It receives the module context and wraps deterministic tasks in narrative framing. The `llm_dialogue` task type falls to `renderGeneric` (word count + engagement heuristics).

**Evidence from session output:**
```
[L] LLM not available — falling back to deterministic flow
─── Encounter 1: Cognitive:Red | Attentional Hold (Deterministic) ───
```

Even when the LLM IS available, it presents the same MCQ options that the deterministic path would. The LLM adds narrative flavor but doesn't change the assessment surface.

**Impact:** The Language-Reflective modality — the deepest assessment axis for metacognition — degrades to MCQ selection with word-count scoring. The LLM's potential as a developmental assessor is unused.

---

### G.3: Shadow Quadrant Collapse

**The Foundation Design:**

Foundations/10 specifies 4 shadow quadrants:
- **Dark-Addiction:** Submergent fixation (clings to lower capacity)
- **Dark-Allergy:** Submergent aversion (rejects lower capacity)
- **Golden-Addiction:** Emergent fixation (bypasses toward higher without integration)
- **Golden-Allergy:** Emergent aversion (refuses the call to grow)

ALL 4 drives can be pathological in BOTH domains. There is NO 1:1 mapping between drives and shadow quadrants.

**The Actual Behavior:**

`ScoringBridge.computeDriveHealthFromTrials()`:
```typescript
if (avg >= 0.7) return { direction: 'HealthyBalanced', score: avg };
if (avg >= 0.5) return { direction: 'HealthyBalanced', score: avg };
return { direction: 'DarkAddicted', score: avg };
```

This produces only 2 of the 5 `DriveDirectionality` values. The full enum:
- `HealthyBalanced` ✓
- `DarkAddicted` ✓
- `DarkAverted` ✗ (never produced)
- `GoldenAddicted` ✗ (never produced)
- `GoldenAverted` ✗ (never produced)

**Impact:** CLI encounters can only detect 1 of 4 shadow quadrants. The 4-quadrant shadow model is structurally unimplemented in the primary execution path.

---

### G.4: ProfileUpdater Hardcoding

**The Foundation Design:**

Shadow entries in the Significator's ledger should carry:
- The detected quadrant (DarkAddiction, DarkAllergy, GoldenAddiction, GoldenAllergy)
- The affected drive (Agency, Communion, Eros, Agape)
- Intensity (0.0-1.0)
- Recurrence count

**The Actual Behavior:**

ProfileUpdater `updateProfile()`:
```typescript
if (shadowResult.detected) {
  significator.shadowLedger.entries.push({
    quadrant: 'DarkAddiction',  // HARDCODED
    drive: 'Agency',            // HARDCODED
    intensity: 0.5,
    line: line,
    stage: stage,
    detectedAt: Date.now(),
    recurrence: 1,
  });
}
```

**Impact:** Shadow ledger data is structurally incorrect. Any downstream system reading the ledger (scheduler shadow-activation scoring, holonic return triggers) receives wrong quadrant/drive information.

---

### G.5: Scheduler Intelligence

**The Foundation Design:**

Foundations/24 3.2 specifies a 7-criteria priority formula:

```ts
priorityScore = (
  thetaDecayScore(c, sig)       * 0.25 +  // most urgent: neglected stages
  shadowActivationScore(c, sig) * 0.20 +  // shadow activation potential
  polarityAlignmentScore(c, sig) * 0.15 + // polarity mode alignment
  transformationScore(c, sig)   * 0.15 +  // transformation readiness
  driveBalanceScore(c, sig)     * 0.10 +  // drive correction
  narrativeScore(c, world)      * 0.10 +  // narrative coherence
  sessionFitScore(c, session)   * 0.05    // session context fit
);
```

Each criterion has detailed scoring functions (theta-decay by time since last encounter, shadow-activation by accumulated consequences, polarity-alignment by exploration/crystallizing mode, etc.).

**The Actual Behavior:**

The scheduler uses `PriorityComputation` which doesn't reference the foundation's 7 score functions. The priority scoring is simplified and doesn't respond to:
- Theta-decay urgency (neglected stages don't get boosted priority)
- Shadow activation potential (accumulated consequences don't influence selection)
- Polarity mode (exploration/crystallizing/crystallized modes don't change behavior)
- Transformation readiness (edge-line encounters don't get boosted)
- Drive correction (imbalanced drives don't get targeted)

**Impact:** Encounter selection is a random picker with modality diversification, not the "world's intelligence." The scheduler doesn't respond to the player's developmental state.

---

### G.6: Theta-Decay

**The Foundation Design:**

Foundations/14 7.2 and foundations/24 3.2.1 specify:
- Each stage has a theta-timestamp recording last engagement
- Neglected stages decay over time (configurable half-life)
- Decay triggers bleed-through (lower-stage shadows manifest at current stage)
- Decay triggers holonic return (player is pulled back to maintain neglected stages)

**The Actual Behavior:**

The ConsequenceEngine updates theta timestamps:
```typescript
significator.theta.lastEncounter[cellKey] = Date.now();
```

But there's no:
- Decay computation (no `ThetaDecay.ts` engine)
- Bleed-through mechanics (lower-stage shadows don't manifest)
- Holonic return triggers (player isn't pulled back to neglected stages)

**Impact:** Neglected stages never degrade. The "never outgrown" principle is unimplemented. Players can advance without maintaining lower stages.

---

### G.7: Polarity Engine

**The Foundation Design:**

Foundations/19 specifies:
- 4-level polarity aggregation (per-encounter → per-line → per-stage → master)
- 3 master modes: exploration, crystallizing, crystallized
- STO/STS vectors that influence encounter selection
- 64-cell polarity texture catalogue (foundations/23)

**The Actual Behavior:**

PolarityTrace is recorded per-encounter:
```typescript
const trace: PolarityTrace = {
  energeticDirection: response.energeticDirection,
  driveDirectionality: response.driveDirectionality,
  stageOrientation: response.stageOrientation,
  sourceOfNourishment: response.sourceOfNourishment,
};
```

But there's no:
- Aggregation engine (no `PolarityEngine.ts`)
- Mode determination (no exploration/crystallizing/crystallized state)
- Texture catalogue integration
- Polarity-conditioned encounter selection

**Impact:** The Choice/polarity engine is unimplemented. STO/STS crystallization doesn't happen. The game can't differentiate between exploration-phase and crystallized-phase players.

---

### G.3: Shadow Detection Keyword-Only

**The Foundation Design:**

Foundations/10 specifies behavioral shadow detection across 4 quadrants:
- Dark-Addiction: Submergent fixation (clings to lower capacity)
- Dark-Allergy: Submergent aversion (rejects lower capacity)
- Golden-Addiction: Emergent fixation (bypasses toward higher without integration)
- Golden-Allergy: Emergent aversion (refuses the call to grow)

Detection should be based on behavioral patterns across multiple encounter dimensions.

**The Actual Behavior:**

`AgenticOrchestrator.evaluateResponse()` uses 4 static keyword lists (~30 phrases each):
```typescript
const DARK_ADDICTION_KEYWORDS = ['dependent', 'can\'t stop', 'addicted', 'obsessed', ...];
const DARK_ALLERGY_KEYWORDS = ['hate', 'disgust', 'reject', 'refuse', ...];
const GOLDEN_ADDICTION_KEYWORDS = ['already enlightened', 'beyond this', 'transcended', ...];
const GOLDEN_ALLERGY_KEYWORDS = ['refuse to grow', 'won\'t change', 'stuck', ...];
```

Shadow detection ONLY fires for write-in text. MCQ selections NEVER trigger shadow detection.

**Impact:** Shadow detection is surface-level keyword matching, not behavioral pattern recognition. A player could write "I feel stuck" and trigger Golden-Allergy, but their actual behavior (consistent avoidance, refusal to engage) would go undetected.

---

### G.4: Transformation State Machine Unwired

**The Foundation Design:**

Foundations/17 specifies the Lovers Crucible with 3 sub-phases:
1. **Unravelling** (2 sessions): Shadow-work intensifies, knot-untying pairs presented
2. **Crucible** (up to 5 sessions): All knots must be resolved, dual-shadow window
3. **Emergence** (1 session): Integration, world reconfiguration

The state machine progresses through: idle → threshold → unravelling → crucible → emergence → complete

**The Actual Behavior:**

`TransformationDetector` has a full 6-phase state machine with `advanceTransformation()` and `commitTransformation()`. However:
- `advanceTransformation()` is never called from GameLoop
- `commitTransformation()` is never called from GameLoop
- `Significator.transformationPhase` is never updated
- The Knot concept is simplified: `totalKnots = blockers.length || 1` (max 2 knots)

**Evidence:** GameLoop.ts only calls `detectThreshold()` — it never progresses the state machine.

**Impact:** Players can reach transformation readiness (convergence + saturation + clearance) but the transformation never actually happens. The game detects readiness but doesn't act on it.

---

### G.5: MacroCatalystEngine Not Integrated

**The Foundation Design:**

Foundations/24 section 8 specifies PESTLE-mapped macro-events:
- Tension accumulates across 6 dimensions (Political, Economic, Social, Technological, Legal, Environmental)
- When tension exceeds threshold (0.75), a macro-event triggers
- Macro-events modify encounter selection (adds/blocks tags)
- Events have 3-phase lifecycle: onset → active → resolution

**The Actual Behavior:**

`MacroCatalystEngine` is fully implemented with:
- Tension accumulation with per-dimension deltas
- Natural decay (0.01/encounter)
- Threshold detection (0.75)
- Event triggering (max 2 simultaneous, min 10 session spacing)
- 3-phase lifecycle (onset 2 sessions → active 6 sessions/5 choices → resolution)

However:
- `WorldState.activeMacroEvents` is initialized but never mutated
- `getMacroEncounterModifications()` returns tag-based filters but `CandidateGeneration` never reads them
- PESTLE tension accumulation is random (+0.05 to random dimension)

**Impact:** Macro-events trigger but never modify which encounters the scheduler selects. The engine is complete in isolation but not integrated into the encounter selection pipeline.

---

### G.6: Narrative System Dead

**The Foundation Design:**

Foundations/24 section 3.2.6 specifies narrative coherence as a priority criterion (weight: 0.10):
- Active narrative beats drive encounter selection
- Encounters that advance the active beat get higher priority
- NPC relationships influence narrative coherence

**The Actual Behavior:**

WorldState has typed fields for:
- `narrativeBeats: NarrativeBeat[]`
- `activeBeatId: string | null`
- `completedBeatIds: string[]`
- `factionState: FactionState[]`

However:
- `generateCandidates()` never reads these fields
- `computeNarrativeCoherence()` falls back to static holon relationships (0.4)
- No code mutates `activeBeatId` or `completedBeatIds`

**Impact:** The narrative system is scaffolded but dead. The scheduler can't prioritize encounters that advance the story.

---

### G.7: ScoringBridge Bypassed

**The Foundation Design:**

Foundations/12 specifies a unified scoring pipeline:
- TaskRenderers produce `TrialResult[]` with dimensions
- ScoringBridge aggregates trials into `AssessmentResult`
- Drive health computed from trial dimensions

**The Actual Behavior:**

Two scoring systems exist:
1. **ScoringBridge**: `aggregateTrials()` + `computeDriveHealthFromTrials()` — maps score magnitude to drive signals (>=0.7 Healthy, >=0.5 Golden, >=0.3 Dark, <0.3 Averted)
2. **Orchestrator inline**: `runModuleAssessment()` does its own rubric-weighted scoring and keyword-based shadow detection

In practice, the Orchestrator path bypasses ScoringBridge. The two systems produce different results:
- ScoringBridge: signal from score magnitude
- Orchestrator: signal from keyword detection

**Impact:** Inconsistent scoring. The ScoringBridge exists but is largely unused in the primary execution path.

---

### G.8: Altitude Shift Too Permissive

**The Foundation Design:**

Foundations/17 specifies that stage transitions require sustained capacity:
- Multiple encounters demonstrating mastery at current stage
- Shadow clearance requirements
- Convergence across multiple lines

**The Actual Behavior:**

`computeAltitudeShift()` in AgenticOrchestrator:
```typescript
if (passed) {
  consecutivePasses[line] = (consecutivePasses[line] || 0) + 1;
  if (consecutivePasses[line] >= 2) {
    altitudeShift = { line, from: current, to: next };
  }
}
```

Only 2 passes needed on same line (not necessarily consecutive, since the scheduler alternates lines).

**Impact:** Players can advance stages relatively quickly. A player could pass 2 encounters on the same line and advance, without demonstrating sustained capacity or shadow clearance.

---

### G.9: Safety Override Never Called

**The Foundation Design:**

Foundations/27 specifies safety mechanisms for high-fixation players:
- When fixation > 0.8 AND shadows > 10, override session strategy
- Force rebalancing encounters

**The Actual Behavior:**

`checkSafetyOverride()` is defined in AutoModeStrategy but never called from GameLoop.

**Impact:** High-fixation players don't get safety interventions.

---

### G.10: Post-Transformation Bias Dead

**The Foundation Design:**

Foundations/17 section 6.2 specifies weight ramp-up after stage transition:
- 5 sessions at full weight
- 5 sessions linear fade to normal

**The Actual Behavior:**

`computePostTransformationBias()` is exported from AutoModeStrategy but:
- Never consumed by GameLoop
- Returns `Record<string, number>` (additive deltas) instead of `PriorityWeightBias` (multipliers)

**Impact:** After transformation, the scheduler doesn't adjust weights for the transition period.

---

### G.11: CCI at Session End Stale

**The Foundation Design:**

CCI should reflect current developmental state at all times.

**The Actual Behavior:**

`renderCCIDisplay(sessionState.cci)` renders the CCI from session START, not the updated values after all encounters. The `tickWithStrategy` function computes `updatedCCI` but it's not propagated back in a way that survives to the end-of-session display.

**Impact:** Players see their starting CCI, not their current CCI after the session's encounters.

---

### G.12: PESTLE Tension Random

**The Foundation Design:**

Foundations/24 section 8 specifies that PESTLE tension should correlate to encounter content:
- Political encounters increase Political tension
- Economic encounters increase Economic tension
- etc.

**The Actual Behavior:**

```typescript
const dim = PESTLE_DIMS[Math.floor(Math.random() * 6)];
accumulateTension(tension, dim, 0.05);
```

Random dimension gets +0.05 per encounter, no correlation to content or player behavior.

**Impact:** Macro-events trigger randomly, not based on the player's actual engagement with PESTLE dimensions.

---

### G.13: Calibration Simplified

**The Foundation Design:**

ONBOARDING-REDESIGN-PLAN.md specifies binary-search composite assessment:
- Adaptive testing that narrows down developmental altitude
- Multiple probes per line
- Statistical confidence thresholds

**The Actual Behavior:**

`runQuickCalibration()`:
- 6 lines: 3-option MCQ with hardcoded thresholds
- 2 lines (Somatic + Willpower): Timing probes (press Enter after N seconds)
- No adaptive testing, no binary search

**Impact:** Initial altitude estimates are rough. Players may start at the wrong developmental level.

---

### G.14: LLM Budget Hardcoded

**The Foundation Design:**

Foundations/22 specifies adaptive encounter complexity based on modality and content.

**The Actual Behavior:**

AgenticOrchestrator enforces max 2 `ask_user_question` calls before forcing `complete_encounter`. This caps every encounter at 2 player interactions regardless of complexity.

**Impact:** Complex encounters (Strategic, ImmersiveRPG) are artificially shortened. Simple encounters (Deterministic) use the same budget as complex ones.

---

### G.15: Holonic Return Detection Only

**The Foundation Design:**

Foundations/14 section 7.3 specifies holonic return:
- Modules transition to shadow-mode for maintenance when player advances
- Theta-decay triggers bleed-through
- Player is pulled back to maintain neglected stages

**The Actual Behavior:**

EncounterScheduler detects shadow-work threshold (>3 unresolved shadows per line) and sets `executionMode='shadow'`. However:
- No shadow-specific content generation engine
- No bleed-through mechanics
- No holonic return triggers

**Impact:** Shadow-work mode is detected but not executed. Players aren't pulled back to maintain neglected stages.

---

### G.16: Dead Code Paths

**The Foundation Design:**

Clean, maintainable codebase with no dead code.

**The Actual Behavior:**

- `computeUrgency()` in ThetaDecay: defined but never directly called (inlined in PriorityComputation)
- `FORCE_RESPONSES` in CLI: variable exists but permanently undefined
- `PlayerProfile`: marked `@deprecated` but still imported by some legacy consumers
- `computePostTransformationBias()`: exported but never consumed

**Impact:** Code clutter, potential confusion for future developers.

---

## What's Working Well

| Component | Status | Notes |
|---|---|---|
| 64 modules loaded | ✅ Working | Registry correctly stores all line×stage combinations |
| All 10 core engines | ✅ Wired | All engines in `src/core/engines/` are called during gameplay |
| Significator as sole state vessel | ✅ Working | No legacy PlayerProfile pollution; recentEncounters added |
| ConsequenceEngine pipeline | ✅ Working | Encounter → consequence → Significator mutation chain wired |
| Shadow keyword detection | ✅ Working | 4-quadrant keywords defined for write-in responses |
| CCI computation | ✅ Working | 5-dimension composite index calculates correctly |
| Session arc | ✅ Working | Warmup → peak → cooldown progression exists |
| Infinite checkpoint model | ✅ Working | State saves after every encounter |
| Quick calibration | ✅ Working | Onboarding probes all 8 lines successfully |
| Multi-provider LLM | ✅ Working | OpenAI, Anthropic, Gemini, Ollama, Custom supported |
| CLI argument parsing | ✅ Working | Commander-based with all flags functional |
| 7-criteria priority formula | ✅ Implemented | PriorityComputation with spec-referenced weights |
| Theta-decay computation | ✅ Implemented | Exponential decay with 7-day half-life |
| Polarity 4-level aggregation | ✅ Implemented | Cell → line profile → master polarity |
| Transformation detection | ✅ Implemented | Threshold detection with convergence/saturation/clearance |
| Auto-mode strategy | ✅ Implemented | 9 themes, weight biasing, mid-session adjustment |
| Shadow severity gradient | ✅ Working | Gap-based + altitude-based severity computation |
| Veil of Forgetting | ✅ Working | Metric displays removed from session start |
| GoldenAllergy detection | ✅ Working | Avoidance + low defensive engagement heuristic |
| Item selection (G.17) | ✅ Working | 1,280-item pool wired with difficulty matching + anti-repetition |
| Scoped shadow resolution (G.19) | ✅ Working | Only resolves shadows at/below encounter stage |
| Bleed-through consumption (G.21) | ✅ Working | Stale cells get +0.15 priority boost in scheduler |
| PESTLE correlation (G.12) | ✅ Working | Line→dimension mapping (Cognitive→tech, Emotional→social, etc.) |
| LLM scoring validation (G.24) | ✅ Working | Drive scores clamped to [0,1] |
| Full-label matching | ✅ Working | All 12+ TaskRenderers match against full option label |
| Deduplication | ✅ Working | Scheduler deduplicates by moduleRef, not just line |
| Scoring display | ✅ Working | Score percentage matches pass/fail threshold correctly |

---

## Priority Upgrade Path (Updated Post-Phase-2)

### Phase 1: Wire the Engines ✅ COMPLETE
All 10 core engines are wired into the game loop. Transformation state machine, safety override, post-transformation bias, and CCI are all connected.

### Phase 2: Restore the Intelligence ✅ COMPLETE
Item selection, compound shadow detection (structure), scoped shadow resolution, bleed-through consumption, PESTLE correlation, and LLM scoring validation are all implemented.

### Phase 3: Complete the Vision (2-3 weeks)
1. **Wire ShadowDetector.ts**: Call `detectShadows()` and `computeBehavioralPatterns()` from the game loop to enable behavioral shadow detection (currently dead code)
2. **Implement compound shadow creation**: Add logic in `applyConsequences()` to populate `compoundPartner` when same-quadrant shadows exist across lines
3. **Fix PESTLE inconsistency**: Align LLM `finalizeEncounter()` path with `lineToPestle` mapping (currently uses random dimension)
4. **Wire MacroCatalystEngine tension**: Call `accumulateTension()` and `tryTriggerMacroEvent()` in the encounter completion path
5. **Implement Lovers crucible**: Add ego-dissolution encounter generation during transformation `crucible` phase
6. **Shadow severity aging**: Add time-based severity decay and outcome-based severity updates
7. **Per-line theta decay**: Different decay rates for different lines (e.g., Somatic faster than Cognitive)
8. **Binary-search calibration**: Implement the ONBOARDING-REDESIGN-PLAN.md specification

---

## Appendix: Foundation Document Cross-Reference (Updated)

| Foundation Doc | Topic | Implementation Status |
|---|---|---|
| 10 | Shadow Model | Partial (keyword detection works; ShadowDetector.ts dead code; compound shadows structure exists but never populated) |
| 11 | Game Modalities | Broken (modality collapse; 6/8 modules get generic fallback) |
| 12 | Drive Assessment | Implemented (1,280-item pool wired; rubric-weighted scoring; LLM validation) |
| 13 | Consciousness Topography | Not implemented (no perceptual layers) |
| 14 | Catalyst Mechanics | Partial (catalyst→experience works; integration mechanics missing) |
| 15 | Macro Archetypes | Partial (engines wired; transformation crucible is session counter) |
| 16 | Significator | Working (sole state vessel; lifecycle functional; recentEncounters added) |
| 17 | Transformation | Partial (detection works; state machine wired; crucible lacks encounter logic) |
| 18 | Great Way | Partial (MacroCatalystEngine partially wired; narrative system dead) |
| 19 | Choice/Polarity | Implemented (PolarityEngine with 4-level aggregation) |
| 20 | Veil of Forgetting | Implemented (metric displays removed from session start) |
| 21 | Incarnation Architecture | Not implemented (layered-world perception missing) |
| 22 | Holon Context Engine | Partial (LLM integration works; content generation minimal) |
| 23 | Polarity Ontology | Implemented (64-cell catalogue exists) |
| 24 | Encounter Scheduler | Implemented (7-criteria formula works; bleed-through consumed; PESTLE partially correlated) |
| 25 | CCI | Working (5-dimension composite metric computes correctly) |
| 26 | Unified Core Architecture | Implemented (module execution works; item pool wired; dead code removed) |
| 27 | Auto-Mode Strategy | Implemented (9 themes, weight biasing; safety override and post-transformation bias wired) |
