# Upgrade/Refactor Plan: Closing the Foundation Gaps

**Date:** June 21, 2026
**Source:** `docs/RED-TEAM-AUDIT.md` (12 gaps identified)
**Status:** All Phases Complete
**Estimated Total Effort:** 8-10 weeks

---

## Quick Reference

| Phase | Focus | Gaps Addressed | Est. Time | Priority | Status |
|---|---|---|---|---|---|
| 1 | Fix the Foundation | G.1, G.3, G.4 | 1-2 weeks | CRITICAL | ✅ Complete |
| 2 | Restore the Intelligence | G.5, G.6, G.7 | 2-3 weeks | HIGH | ✅ Complete |
| 3 | Complete the Vision | G.2, G.8, G.9, G.10, G.11, G.12 | 3-4 weeks | MEDIUM | ✅ Complete |

---

## Phase 1: Fix the Foundation (1-2 weeks) ✅ COMPLETE

**Goal:** Ensure the game correctly detects what it claims to detect, and that modality assignment doesn't produce garbage encounters.

### 1.1 Fix Modality-Task Matching (G.1) ✅

**Problem:** The scheduler assigns modalities randomly, but modules only have 2-3 task types. When a modality's preferred chain doesn't match, a generic n_back fires.

**Solution:** Make `getEligibleModalities()` aware of the module's available tasks before assigning.

**Files modified:**
- `src/core/engines/CandidateGeneration.ts` — Added `MODALITY_TASK_TYPES` mapping, `getAllTaskTypes()`, updated `getEligibleModalities()` to filter by task availability

**Acceptance criteria:**
- Emotional:Red never gets Deterministic modality (no matching tasks)
- Interpersonal:Red never gets Deterministic or Strategic (no matching tasks)
- All assigned modalities have ≥1 matching task in the module's task set
- Modality diversification still works (3 different modalities per encounter)

**Effort:** 4 hours

---

### 1.2 Fix ScoringBridge DriveDirectionality (G.3) ✅

**Problem:** `ScoringBridge.computeDriveHealthFromTrials()` only produces `DarkAddicted` or `HealthyBalanced`. The full 5-value enum is never produced.

**Solution:** Implement proper 4-quadrant shadow detection based on score deviation from threshold.

**Files modified:**
- `src/core/assessments/cli/ScoringBridge.ts` — Updated `computeDriveHealthFromTrials()` to map score ranges to all 5 DriveDirectionality values

**Acceptance criteria:**
- All 5 `DriveDirectionality` values can be produced
- Shadow quadrant detection in trials feeds into drive directionality
- Existing passing encounters still pass
- Shadow encounters produce correct quadrant labels

**Effort:** 1 day

---

### 1.3 Fix ProfileUpdater Hardcoding (G.4) ✅

**Problem:** Shadow entries always get `quadrant: 'DarkAddiction'`, `drive: 'Agency'` regardless of actual signal.

**Solution:** Pass the detected quadrant and drive from the assessment result.

**Files modified:**
- `src/core/usecases/ProfileUpdater.ts` — Added `QUADRANT_TO_DRIVE`, `SIGNAL_TO_QUADRANT`, `driveForLine()` helper; updated shadow entry creation to use dynamic values

**Acceptance criteria:**
- Shadow entries carry correct quadrant from detection
- Shadow entries carry correct drive from detection
- Intensity is preserved from detection
- Existing shadow ledger data structure unchanged

**Effort:** 2 hours

---

## Phase 2: Restore the Intelligence (2-3 weeks)

**Goal:** Implement the encounter scheduler's 7-criteria priority formula, theta-decay mechanics, and polarity engine.

### 2.1 Implement 7-Criteria Encounter Scheduler (G.5)

**Problem:** The scheduler uses simplified scoring instead of the foundation's weighted formula.

**Solution:** Implement the 7 scoring functions from foundations/24 3.2 and wire them into priority computation.

**Files to create:**
- `src/core/engines/scheduler/ThetaDecayScore.ts`
- `src/core/engines/scheduler/ShadowActivationScore.ts`
- `src/core/engines/scheduler/PolarityAlignmentScore.ts`
- `src/core/engines/scheduler/TransformationScore.ts`
- `src/core/engines/scheduler/DriveBalanceScore.ts`
- `src/core/engines/scheduler/NarrativeScore.ts`
- `src/core/engines/scheduler/SessionFitScore.ts`
- `src/core/engines/scheduler/PriorityFormula.ts`

**Files to modify:**
- `src/core/engines/EncounterScheduler.ts` — replace `PriorityComputation` with `PriorityFormula`

**Implementation reference:** foundations/24 3.2.1-3.2.7 (exact scoring functions specified)

**Key weights:**
```typescript
const PRIORITY_WEIGHTS = {
  thetaDecay: 0.25,      // most urgent: neglected stages
  shadowActivation: 0.20, // shadow activation potential
  polarityAlignment: 0.15, // polarity mode alignment
  transformation: 0.15,   // transformation readiness
  driveBalance: 0.10,     // drive correction
  narrative: 0.10,        // narrative coherence
  sessionFit: 0.05,       // session context fit
};
```

**Acceptance criteria:**
- Neglected stages (high theta-decay) get boosted priority
- Accumulated consequences boost shadow-activation score
- Polarity mode (exploration/crystallizing/crystallized) changes selection behavior
- Edge-line encounters get transformation-readiness boost
- Imbalanced drives get drive-correction targeting
- Narrative coherence respects active beats
- Session fit respects energy and time constraints

**Effort:** 5 days

---

### 2.2 Implement Theta-Decay Engine (G.6)

**Problem:** Theta timestamps are recorded but never used for decay, bleed-through, or holonic return.

**Solution:** Implement decay computation, bleed-through triggers, and holonic return mechanics.

**Files to create:**
- `src/core/engines/ThetaDecayEngine.ts`

**Files to modify:**
- `src/core/engines/EncounterScheduler.ts` — integrate theta-decay scoring
- `src/core/engines/ConsequenceEngine.ts` — add bleed-through triggers

**Implementation reference:** foundations/14 7.2, foundations/24 3.2.1

**Core mechanics:**
```typescript
interface ThetaDecayConfig {
  halfLifeMs: number;        // configurable per stage
  maxDecay: number;          // maximum decay factor (0.0-1.0)
  bleedThroughThreshold: number; // decay level that triggers bleed-through
}

function computeThetaDecay(
  lastEncounterTime: number,
  config: ThetaDecayConfig
): number {
  const elapsed = Date.now() - lastEncounterTime;
  const decay = 1 - Math.pow(0.5, elapsed / config.halfLifeMs);
  return Math.min(decay, config.maxDecay);
}

function checkBleedThrough(
  sig: Significator,
  currentStage: Stage
): ShadowSignal[] {
  // If any lower stage has decay > threshold, its shadows bleed through
  const signals: ShadowSignal[] = [];
  for (const stage of STAGES) {
    if (stage >= currentStage) continue;
    const decay = getThetaDecay(sig, stage);
    if (decay > THRESHOLD) {
      signals.push({
        type: 'bleed_through',
        sourceStage: stage,
        targetStage: currentStage,
        intensity: decay,
      });
    }
  }
  return signals;
}
```

**Acceptance criteria:**
- Neglected stages decay over time
- Decay triggers bleed-through shadow signals
- Bleed-through shadows appear in encounter selection
- Holonic return encounters are generated when decay exceeds threshold
- Decay rate is configurable per stage

**Effort:** 3 days

---

### 2.3 Implement Polarity Engine (G.7)

**Problem:** PolarityTrace is recorded per-encounter but never aggregated into master state.

**Solution:** Implement 4-level aggregation and 3-mode determination.

**Files to create:**
- `src/core/engines/PolarityEngine.ts`

**Files to modify:**
- `src/core/domain/Significator.ts` — add polarity state fields
- `src/core/engines/EncounterScheduler.ts` — use polarity mode for selection

**Implementation reference:** foundations/19 7, foundations/23

**Core mechanics:**
```typescript
interface PolarityState {
  masterMode: 'exploration' | 'crystallizing' | 'crystallized';
  coherentLines: number;        // lines with consistent STO/STS orientation
  stovector: number;            // -1.0 (pure STS) to +1.0 (pure STO)
  crystallizationIndex: number; // 0.0 (fully exploratory) to 1.0 (fully crystallized)
  perLineTraces: Record<Line, PolarityTrace[]>;
}

function aggregatePolarity(sig: Significator): PolarityState {
  // Level 1: Per-line aggregation (last N encounters per line)
  // Level 2: Cross-line consistency (how many lines agree on STO vs STS)
  // Level 3: Master mode determination
  // Level 4: Crystallization index computation
}

function determineMasterMode(coherentLines: number, crystallizationIndex: number): PolarityState['masterMode'] {
  if (coherentLines < 3) return 'exploration';
  if (coherentLines >= 6 && crystallizationIndex > 0.7) return 'crystallized';
  return 'crystallizing';
}
```

**Acceptance criteria:**
- Polarity traces aggregate per-line, per-stage, and cross-line
- Master mode is determined by coherent line count and crystallization index
- Encounter selection respects polarity mode (exploration → diversity, crystallizing → challenge, crystallized → depth)
- STO/STS vectors influence encounter variant selection

**Effort:** 4 days

---

## Phase 3: Complete the Vision (3-4 weeks)

**Goal:** Implement the missing features that complete the game's developmental architecture.

### 3.1 LLM-Driven Language-Reflective Assessment (G.2)

**Problem:** The LLM wraps deterministic MCQ in narrative instead of generating assessment content.

**Solution:** Create a dedicated LLM assessment path for Language-Reflective modality.

**Files to create:**
- `src/core/assessments/llm/LanguageReflectiveEngine.ts`

**Files to modify:**
- `src/core/assessments/AgenticOrchestrator.ts` — route LanguageReflective to new engine

**Key design:**
- LLM generates scenario-specific prompts based on module context
- LLM evaluates response depth against developmental rubrics
- LLM assesses metacognitive awareness (does the player reference their own process?)
- LLM produces stage-aligned scoring (not just pass/fail)

**Effort:** 5 days

---

### 3.2 Non-Coercion Principle (G.10)

**Problem:** Single encounter forced; no alternative offers.

**Solution:** Scheduler produces 3-5 ranked offers; player chooses.

**Files to modify:**
- `src/core/engines/EncounterScheduler.ts` — return ranked list
- `scripts/cli-game.ts` — present encounter selection menu

**Effort:** 2 days

---

### 3.3 Shadow-Work Mode (G.9)

**Problem:** All encounters run in `encounter` mode; `shadow_work` never triggered.

**Solution:** When shadow accumulation exceeds threshold, generate shadow-work encounters.

**Files to create:**
- `src/core/engines/ShadowWorkGenerator.ts`

**Files to modify:**
- `src/core/engines/EncounterScheduler.ts` — check shadow threshold
- `src/core/assessments/AgenticOrchestrator.ts` — handle shadow_work mode

**Effort:** 3 days

---

### 3.4 Macro-Catalyst Engine (G.8)

**Problem:** PESTLE-mapped macro-events not implemented.

**Solution:** Track PESTLE tension, trigger world-level events when thresholds exceeded.

**Files to create:**
- `src/core/engines/MacroCatalystEngine.ts`

**Effort:** 4 days

---

### 3.5 Perceptual Layers (G.11)

**Problem:** CLI has no visual layer perception system.

**Solution:** Implement textual representation of perceptual layers for CLI mode.

**Files to create:**
- `src/game/cli/LayerRenderer.ts`

**Effort:** 3 days

---

### 3.6 Drive-Probe Mechanics (G.12)

**Problem:** Generic MCQ options with drive labels instead of probe-specific interactions.

**Solution:** Implement per-line probe mechanics (hint buttons, timing accuracy, cooperation quality).

**Files to modify:**
- `src/core/assessments/cli/TaskRenderers.ts` — add probe-specific rendering

**Effort:** 4 days

---

## Risk Assessment

| Phase | Risk | Mitigation |
|---|---|---|
| 1 | Breaking existing passing encounters | Run full test suite after each change; verify 64 modules still load |
| 2 | Scheduler changes break encounter flow | Implement behind feature flag; gradual rollout |
| 3 | LLM assessment changes break fallback | Keep deterministic path as fallback; A/B test |

---

## Success Metrics

| Metric | Current | Target (After Phase 1) | Target (After Phase 3) |
|---|---|---|---|
| Modality-task match rate | ~25% (6/8 modules mismatch) | 100% | 100% |
| Shadow quadrants detected | 2/4 | 4/4 | 4/4 |
| Scheduler criteria implemented | 0/7 | 3/7 | 7/7 |
| Encounter offers per selection | 1 | 1 | 3-5 |
| LLM assessment depth | Narrative wrapper | Narrative wrapper | Full dialogue scoring |

---

## Phase 4: Red-Team Audit 2.0 (2026-06-21)

### Audit Summary

**Date:** 2026-06-21
**Scope:** End-to-end operational flow — encounter selection → assessment → scoring → profile update → evolutionary trajectory
**Method:** 4 parallel codebase agents mapped implementation; 10+ foundation docs read for theoretical substrate

**Result:** 23 systemic gaps identified across 4 tiers:
- **Tier 0 (Architectural):** 5 gaps — fundamental design commitments not honored
- **Tier 1 (Core Mechanics):** 8 gaps — implemented engines produce incorrect/incomplete results
- **Tier 2 (Wiring):** 6 gaps — engines exist but are called incorrectly
- **Tier 3 (Polish):** 4 gaps — simplified paths that work but don't match theory

**Key finding:** The engine layer is solid (all 10 engines fully implemented and wired). The gaps are in how engines produce developmental trajectory.

**Full audit document:** `docs/RED-TEAM-AUDIT-2.md`

### Phase 5: Fix Foundation (Week 1-2) — NOT STARTED

| Gap | Effort | Impact | Status |
|-----|--------|--------|--------|
| G.01 — Veil violation | 2 days | HIGH | NOT STARTED |
| G.04 — GoldenAllergy detection | 1 day | HIGH | NOT STARTED |
| G.05 — Behavioral pattern wiring | 2 days | HIGH | NOT STARTED |
| G.06 — Shadow content generator | 1 day | HIGH | NOT STARTED |
| G.13 — Confidence computation | 0.5 day | MEDIUM | NOT STARTED |
| G.14 — Shadow severity gradient | 1 day | MEDIUM | NOT STARTED |
| G.15 — Legacy dead code cleanup | 0.5 day | LOW | NOT STARTED |

### Phase 6: Restore Intelligence (Week 3-4) — NOT STARTED

| Gap | Effort | Impact | Status |
|-----|--------|--------|--------|
| G.02 — Modality content expansion | 5 days | HIGH | NOT STARTED |
| G.03 — LLM as assessment engine | 3 days | HIGH | NOT STARTED |
| G.07 — Knot resolution content | 2 days | MEDIUM | NOT STARTED |
| G.08 — Transformation state unification | 1 day | MEDIUM | NOT STARTED |
| G.09 — Polarity → encounter selection | 2 days | MEDIUM | NOT STARTED |
| G.10 — Altitude shift convergence | 1 day | MEDIUM | NOT STARTED |
| G.11 — Gradual shadow resolution | 2 days | MEDIUM | NOT STARTED |
| G.12 — Unified profile update | 1 day | MEDIUM | NOT STARTED |

### Phase 7: Complete Vision (Week 5-6) — NOT STARTED

| Gap | Effort | Impact | Status |
|-----|--------|--------|--------|
| G.17 — Remove legacy tick() | 0.5 day | LOW | NOT STARTED |
| G.18 — Contextual shadow detection | 3 days | HIGH | NOT STARTED |
| G.19 — Perceptual layer shift | 3 days | HIGH | NOT STARTED |
| G.20 — PESTLE → encounter mapping | 2 days | MEDIUM | NOT STARTED |
| G.21 — NPC developmental profiles | 3 days | MEDIUM | NOT STARTED |
| G.22 — Quality estimation from assessment | 1 day | LOW | NOT STARTED |
| G.23 — Calibration for all 8 lines | 1 day | LOW | NOT STARTED |
