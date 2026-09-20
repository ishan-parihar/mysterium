# CLI Implementation Gaps & Implementation Plan

**Date:** June 18, 2026
**Audit scope:** Full CLI/TUI end-to-end audit across developmental depth, world orchestration, and UX polish
**Method:** 12+ CLI runtime tests + 447 unit tests + deep codebase analysis
**Status:** Implementation Phase — all gaps identified, fixes in progress

---

## Executive Summary

The CLI has solid architectural plumbing: 64 assessment modules, 7-modality encounter scheduler, drive-probe framework, shadow detection, altitude progression, CCI metric, theta-decay urgency, and PESTLE tension. The scheduler boots, encounters are produced, and state mutations work at the plumbing level.

**However, the system is functionally degenerate in every dimension that matters for evolutionary catalysis:**

1. Assessment tasks are described but never executed (no n-back sequences, no timing, no accuracy)
2. Every encounter shows identical 4-option MCQ regardless of module/line/stage
3. Response quality is binary (which option was selected — no depth, timing, consistency)
4. Full session mode crashes (reference-before-initialization bug)
5. World has no narrative continuity between encounters
6. TUI displays raw technical parameters instead of thematic content

---

## Gap Taxonomy

### Tier 0 — Blocking (system cannot run)
| # | Gap | File | Impact |
|---|---|---|---|
| 0.1 | `currentSig` used before initialization in `runFullSession()` | `cli-game.ts:694` | Multi-encounter sessions crash immediately |

### Tier 1 — Critical (system runs but produces zero developmental value)
| # | Gap | File | Impact |
|---|---|---|---|
| 1.1 | Assessment tasks never executed — text descriptions only | `AgenticOrchestrator.ts:presentModuleTask()` | n-back, stroop, go/no-go, hold tasks are dead code |
| 1.2 | Identical 4-option MCQ for every encounter | `AgenticOrchestrator.ts:presentModuleTask()` | No module-specific developmental content |
| 1.3 | Response quality is binary — option index only | `AgenticOrchestrator.ts:evaluateViaDriveProbes()` | 10 MeasureDimension slots never populated |
| 1.4 | Shadow detection only from write-in keywords | `AgenticOrchestrator.ts:detectShadowFromResponse()` | MCQ selections never trigger shadows |

### Tier 2 — Important (system runs but poorly)
| # | Gap | File | Impact |
|---|---|---|---|
| 2.1 | No mid-session state display | `cli-game.ts:runFullSession()` | Player sees nothing until SESSION END |
| 2.2 | Priority formula degenerate at session start | `PriorityComputation.ts` | All candidates score ~0.50-0.52, effectively random |
| 2.3 | No narrative continuity between encounters | `cli-game.ts` + `ContextPipeline.ts` | Each encounter is context-free |
| 2.4 | Altitude shift is binary gate | `AgenticOrchestrator.ts:computeAltitudeShift()` | Single pass = immediate advance, no gradual progression |
| 2.5 | Raw task parameters exposed | `cli-game.ts:presentModuleTask()` | `[Assessment parameters: n=2, trials=12]` shown to player |

### Tier 3 — Polish (system works but feels unfinished)
| # | Gap | File | Impact |
|---|---|---|---|
| 3.1 | CCI dimension labels cryptic | `cli-game.ts:renderCCIDisplay()` | `alt:29% drH:100%` not meaningful |
| 3.2 | Narrative summaries mechanical | `AgenticOrchestrator.ts:buildModuleNarrative()` | Reads like database entries |
| 3.3 | No encounter result feedback | `cli-game.ts` | No pass/fail indication after choices |
| 3.4 | No transition animations | CLI display | Instant appearance/disappearance |
| 3.5 | Modality headers show technical names | `cli-game.ts:askUser()` | "Deterministic" vs thematic label |
| 3.6 | 13 failing tests | `tests/` | AgenticOrchestrator (vi.mocked), ScreenReaderOverlay, ContextPipeline |

---

## Implementation Plan

### Phase 1: Critical Fixes (P0–P1)
**Goal:** Make the system runnable and start producing real developmental value

#### P0: Fix session crash (30 mins)
- Move `currentSig` declaration above the SESSION START banner in `runFullSession()`
- Verify with `--headless --encounters=5 --no-llm`

#### P1: Wire real assessment task renderers (3–5 days)
**This is the single highest-impact change.** Replace generic MCQ with actual cognitive challenges.

**Task renderers to implement:**
1. `renderNBack()` — Display symbol sequences, player identifies matches via [Match]/[No Match]
2. `renderStroop()` — Display colored words, player names ink color
3. `renderGoNoGo()` — Display stimuli, player responds/withholds
4. `renderHold()` — Display items, test retention after distraction
5. `renderDilemma()` — Show scenario narrative with genuine moral choices from module
6. `renderEmotionID()` — Show scenario descriptions, player identifies emotions
7. `renderPatternPrediction()` — Show sequence, player predicts next element
8. `renderValueRanking()` — Player ranks values/priorities

**Integration points:**
- New file: `src/core/assessments/cli/TaskRenderers.ts` — pure functions that translate TaskType → CLI prompts + collect responses
- Modified: `AgenticOrchestrator.ts:runModuleAssessment()` — use renderers instead of generic MCQ
- Modified: `AgenticOrchestrator.ts:presentModuleTask()` — dispatch to correct renderer
- New: `TrialResult` generation from renderer responses (populating all 10 MeasureDimension slots)

**Scoring integration:**
- Renderers return `TrialResult[]` with real timing/accuracy data
- `runAssessment()` from `engine.ts` scores trials against rubric
- Pass/fail uses actual performance, not option selection

### Phase 2: Developmental Depth (P2–P4)
**Goal:** Make encounters feel module-specific and responses measurable

#### P2: Differentiate options per module (1 day)
- Use each module's 4 drive probes to generate contextual options
- Replace "Act with agency" / "Seek connection" / "Reach higher" / "Return to foundation" with:
  - Agency probe: `driveProbes.agency.healthyResponse` / `addictionSignal` / `allergySignal`
  - Communion probe: `driveProbes.communion.healthyResponse` / ...
  - Eros probe: `driveProbes.eros.healthyResponse` / ...
  - Agape probe: `driveProbes.agape.healthyResponse` / ...
- Options vary per module and stage

#### P3: Add mid-session state display (2 hours)
After each encounter in `runFullSession()`:
```
  ── Encounter 3/5 Result ──
  CCI  ██████████░░░░░░░░░░ 50.8% (+0.4%)
  Emotional: Red ●○○○○○○○ → Amber ●●○○○○○○  ⬆
  ⚠ shadows: DarkAdd(12%)
  Agency: ████░░░░~fix:15%
```

#### P4: Fix priority formula degeneracy (1 day)
- Weight theta-urgency by encounter count (0 visits = 1.0, 1+ visits = decaying)
- Add "developmental need" signal from CCI weakest-dimension
- Ensure priority deltas > 0.05 between candidates

### Phase 3: World Coherence (P5–P6)
**Goal:** Encounters build upon each other, world feels alive

#### P5: Add narrative continuity (2–3 days)
- Pass `history` (last 3 encounter summaries) into encounter context
- Use NPC relationship state to modify encounter framing
- Build session narrative arc (introduction → escalation → resolution)
- Show consequence text referencing previous choices

#### P6: TUI polish (2 days)
- Replace raw parameters with thematic descriptions
- Improve narrative summaries with module-specific flavor
- Add pass/fail/dimension feedback after each encounter
- Fix CCI label abbreviations
- Add ASCII art for assessment tasks where applicable

### Phase 4: Test Health (P7)
#### P7: Fix failing tests (1 day)
- AgenticOrchestrator tests: Replace `vi.mocked()` with compatible API
- ScreenReaderOverlay tests: Fix JSDOM environment
- ContextPipeline tests: Fix stage inference parsing

---

## Validation Criteria

After implementation, the system must pass these AI-agent-as-player tests:

1. **Cognitive:Red n-back** — Player sees actual symbol sequences, must identify matches under time pressure. Scoring reflects accuracy + timing.
2. **Emotional:Red dilemma** — Player faces a genuine emotional scenario with distinct choices that map to different drive expressions.
3. **Willpower:Red hold** — Player must maintain focus through distraction stimuli. Duration tracked.
4. **Shadow surfacing** — Consistent STS choices across 3 encounters surfaces a DarkAddiction shadow entry.
5. **Altitude progression** — Consistent HealthyBalanced performance across 5 encounters advances Emotional from Red to Amber.
6. **Session arc** — Encounter 5 references themes from encounters 1-4. NPC relationships influence encounter content.
7. **Priority diversity** — Scheduler produces encounters across 3+ different lines in a 5-encounter session.
8. **Full session runs** — `--headless --encounters=10 --no-llm` completes without error.

---

## File Change Map

```
NEW:
  src/core/assessments/cli/TaskRenderers.ts     — Task type → CLI prompt + response collection
  src/core/assessments/cli/ScoringBridge.ts      — TrialResult generation from CLI responses
  src/core/assessments/cli/ModuleOptions.ts      — Module-specific option generation from drive probes

MODIFIED:
  scripts/cli-game.ts                            — Fix crash, add mid-session display, improve TUI
  src/core/assessments/AgenticOrchestrator.ts    — Wire task renderers, differentiated options, better scoring
  src/core/engines/PriorityComputation.ts        — Fix degeneracy at session start
  src/infra/llm/FallbackProvider.ts              — Add more stage-specific content

UNCHANGED:
  src/core/assessments/engine.ts                 — Already works for TrialResult scoring
  src/core/assessments/registry.ts               — Already works
  src/core/GameLoop.ts                           — Already works
  src/core/engines/ConsequenceEngine.ts          — Already works
  src/core/engines/EncounterScheduler.ts         — Already works
```
