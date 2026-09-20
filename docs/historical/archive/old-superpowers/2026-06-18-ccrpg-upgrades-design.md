# Design Specification — Mysterium Backend & CLI Upgrades

**Date:** June 18, 2026  
**Status:** Approved  
**Topic:** CLI upgrades, fallback differentiation, LLM error detection, scheduler fixes, and premium CLI styling.

---

## 1. Context & Objectives

A runtime audit of the Mysterium CLI and backend engines revealed several critical issues that prevent the game from being truly evolutionarily catalytic:
1. The local LLM proxy's responses containing the word `"error"` in their markdown/narrative text trigger a false-positive check in the orchestrator, causing every encounter to fall back to the deterministic path.
2. The fallback path always completes with a generic pass and neutral polarity, causing degenerate state evolution (all drives healthy, no shadow integration, identical choices).
3. CLI forcing flags (`--line`, `--stage`, `--modality`) are applied after scheduling is finished, leading to display inconsistencies and scheduling bugs.
4. The priority scheduler produces identical scores (0.395) for all unvisited candidates because there is no tie-breaker, and modality rotation constraints are bypassed.
5. The recency filter checks the oldest entries rather than the newest due to a slicing error.

Our objective is to resolve these pipeline breaks, enabling the CLI to serve as an accurate test harness for the developmental engines.

---

## 2. Detailed Technical Design

### 2.1 Fix LLM False-Positive Error Detection
In `src/core/assessments/AgenticOrchestrator.ts`, replace the naive check:
```typescript
if (loopCount === 1 && res.content && res.content.includes('"error"') && (!res.toolCalls || res.toolCalls.length === 0))
```
with a check that verifies the content is a JSON-formatted error object rather than a casual occurrence of the word "error" in markdown:
```typescript
if (loopCount === 1 && res.content && res.content.startsWith('{"error"') && (!res.toolCalls || res.toolCalls.length === 0))
```

### 2.2 Differentiate Fallback Responses
In `src/core/assessments/AgenticOrchestrator.ts`, implement `evaluateFallbackResponse(selectedLabel: string, optionId?: string)` to map the user's choice to:
- `passed`: `boolean`
- `polarityDirection`: `'sto' | 'sts' | 'neutral'`
- `driveScores`: `Record<Drive, number>`
- `driveSignals`: `Record<Drive, DriveDirectionality>`
- `feedback`: `string`

#### Mapping Rules (Hybrid Approach):
1. **Option ID/Text Explicit Mapping:**
   - `'attack'`, `'betray'`, `'raid'`, `'dominate'`, `'sell'`, `'profit'`, `'betray'`: STS Polarity, Agency (0.8), Eros (0.8), Communion (0.2), Agape (0.2). Communion/Agape are marked as `DarkAverted` or `DarkAddicted`.
   - `'trust'`, `'negotiate'`, `'mercy'`, `'share'`, `'alliance'`, `'reform'`, `'compassion'`: STO Polarity, Agency (0.5), Eros (0.5), Communion (0.8), Agape (0.8). Drives are `HealthyBalanced`.
   - `'enforce'`, `'obey'`: STS or Neutral. Default to STS Polarity, Agency (0.7), Communion (0.5), Eros (0.5), Agape (0.3).
2. **Semantic Baseline Mapping (Fallback):**
   - **STS Keywords:** (e.g. "strike", "power", "control") -> STS Polarity, high Agency/Eros.
   - **STO Keywords:** (e.g. "help", "reflect", "cooperate", "breathe") -> STO Polarity, high Communion/Agape.
   - **Neutral Keywords / Withdrawal:** (e.g. "withdraw", "resist", "decline", "sit with it") -> `passed = false`, Neutral, low Eros (0.3 with `DarkAverted` signal).

Pass these parameters to `createAssessmentResult` and `finalizeEncounter`.

### 2.3 CLI Forcing Flags & Recency Filters
In `src/core/engines/CandidateGeneration.ts`:
1. Add optional fields to `SessionContext`:
   ```typescript
   readonly forceLine?: Line;
   readonly forceStage?: Stage;
   readonly forceModality?: Modality;
   ```
2. In `generateCandidates`:
   - Inspect the context forcing parameters.
   - If `forceLine` or `forceStage` is specified:
     - Filter candidate holons.
     - Bypass the altitude and layer-perception checks (`stageOrdinal(holon.stage) > maxStageOrd` and `stageOrdinal(holon.stage) > lineAltOrd + 1`).
   - If `forceModality` is specified, force the eligible modalities list to ONLY contain the forced modality.
   - If *any* forcing is active, bypass timestamp-based cooldowns and recency checks for the forced criteria.
3. **Fix Recency Slicing:** Change `recent.slice(0, 3)` to `recent.slice(-3)` and `recent.slice(0, 2)` to `recent.slice(-2)`.
4. **Enforce Modality Rotation:** If the last 2 completed encounters (`recent.slice(-2)`) have the same modality, filter out that modality from candidates to prevent consecutive runs of the same modality.

In `scripts/cli-game.ts`:
- Pass the CLI flags into the `SessionContext` object when ticking the loop.

### 2.4 Priority Formula Tie-Breaker
In `src/core/engines/PriorityComputation.ts`, append a tiny, deterministic hash-based tie-breaker to prevent identical priority scores:
```typescript
const hash = (candidate.moduleRef.charCodeAt(0) + candidate.modality.charCodeAt(0)) % 100;
const tieBreaker = hash / 10000; // max 0.0099
return baseScore + tieBreaker;
```

### 2.5 Premium CLI Rendering & Input Handling
In `scripts/cli-game.ts`:
1. Theme each modality with a distinct ASCII/Console decoration header and text formatting:
   - **Deterministic:** Yellow time countdown bar.
   - **LanguageReflective:** Deep blue italics.
   - **ScenarioChoice:** Red bold decision crossroads.
   - **Embodied:** Green breathing/scan cues.
   - **Strategic:** Cyan tactical war-table layout.
   - **SocialCooperative:** Yellow diplomatic relationship indicator.
   - **ImmersiveRPG:** Magenta narrative scene context.
2. In `askUser`, check if the user entered a valid numeric selection corresponding to an option. If so, do not populate `writeInValue` with the numeric choice index. This ensures the output summary maps properly to the text label.

---

## 3. Verification Plan

1. **Unit Tests:** Verify changes in `AgenticOrchestrator.test.ts`, `EncounterScheduler.test.ts`, and `CandidateGeneration.test.ts`.
2. **CLI Integration Test:** Run the CLI with combinations of forcing flags (`--line`, `--stage`, `--modality`) to confirm:
   - Display matches forced options.
   - Modalities render with the new premium styles.
   - Fallbacks successfully alter drive scores and polarity.
   - Priorities are non-degenerate.
