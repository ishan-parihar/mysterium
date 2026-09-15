# Mysterium — Full Development-State Audit (2026-09-15)

> Exhaustive audit of the developmental game, curriculum game, cognitive training,
> adaptivity, healing/shadow architecture, and efficacy-toward-intended-result.
> **Commit:** `c7b954681cc49cd3df7d3e564d922de8183bdceb` (main, clean tree).
> **Method:** docs-first entry-point tracing → empirical runtime probes → full
> verification battery. Every material claim is `fact` (cited file:line, verified
> this session) or `inference` (cited to its supporting facts).

---

## 0. Executive Summary

| Dimension | State | Verdict |
|---|---|---|
| **Build & CI health** | 884/884 tests, 33/33 invariants, tsc clean, 4-gate build green, workspace-lint 0/0/0 | ✅ Solid |
| **Developmental game (8×8)** | 64 modules / 1,280 items / 256 drive probes, verified empirically | ✅ Complete |
| **Curriculum game** | 48 holons / 3 subjects, full spaced-repetition + metacognitive probe stack | ⚠️ Working but narrow content |
| **Cognitive training** | 5 paradigms, adaptive staircase w/ convergence proof-tests | ✅ Solid kernel |
| **Adaptivity / per-individual fit** | 7-weight scheduler, CCI, session strategy, UserMatrixModel, recalibration | ✅ Architecturally comprehensive |
| **Healing / shadow mechanics** | 4-quadrant ledger, knot-pair crucible, veil presentation | ✅ Implemented, **1 verified crash path** |
| **Efficacy toward learning/healing** | Self-referential measurement; no external validation, no longitudinal evidence | ⚠️ Honest-but-unproven |

**The one-line verdict:** the architecture is genuinely comprehensive and
unusually well-tested for its scope; the verified runtime defect (P0 below) and
the thin world/curriculum content — not the design — are what separate it from
its intended efficacy.

---

## 1. Verification Battery (all run this session)

| Gate | Result | Evidence |
|---|---|---|
| `npm test` | **85 files / 884 tests pass** | vitest output, this session |
| `npm run check:invariants` | **33/33 PASS** (Significator validity, stage synthesis, metabolic health, complex altitudes, Veil compliance of qualitative feedback, line↔complex/drive completeness) | script output |
| `npx tsc --noEmit` | clean | script output |
| `npm run build` | all 4 gates pass (invariants → svelte-kit sync → tsc → vite build; Cloudflare adapter ✔) | build log |
| `workspace-lint` | Errors 0, Warnings 0, Info 0 | linter output |
| CI parity | `.github/workflows/ci.yml:15-25` runs the same five steps | file |

---

## 2. Dimension 1 — The Developmental Game (psychological engine)

### 2.1 The loop (traced end-to-end)

`GameLoop.startSession` (`src/core/GameLoop.ts:243`) → seeds curriculum registry,
migrates knowledge schema, auto-seeds KnowledgeState, applies >30-day
re-calibration (P1-B6, with the theta-timestamp fallback wired at
`GameLoop.ts:287-291`), computes CCI via `computeCCI(toSnapshot(sig), sig)`
delegating G_z/P_z to GreaterCycleEngine, and generates a SessionStrategy
(theme/arc/weightBias/curriculumSlots/trainingSlots).

Per encounter: `AgenticOrchestrator` runs the LLM tool loop
(`ask_user_question` → player → `complete_encounter`), `applyConsequences`
mutates the Significator, then `applyResponseOnly` (`GameLoop.ts:74`) advances
the UserMatrixModel and transformation state machine, then
`tickWithStrategy` (`GameLoop.ts:297`) schedules the next encounter — weaving
curriculum beats (`GameLoop.ts:798-861`) and training beats (`:803-836`).
`endSession` (`GameLoop.ts:922`) applies retention decay, persists forgetting
curves, runs the metacognitive probe, and flags consolidation intervention for
the next session (`_curriculumIntervention`).

**Empirical run:** `--headless --encounters=6 --answers file --json` produced
`6 ask_user` events across 6 different lines (Somatic, Cognitive, Emotional,
Spiritual, Intrapersonal, Willpower), `6 dq_line_completed` narrative events,
1 integration prompt, `session_ended` with save. The loop is live and
multi-line.

### 2.2 The 64-cell data depth — verified, not claimed

Ran `bootModuleRegistry()` and enumerated the registry:

| Metric | Verified value |
|---|---|
| Modules | **64** (8 lines × 8 stages, `src/core/assessments/{line}/{stage}.ts`) |
| itemPool items | **1,280** — exactly 160 per line, 160 per stage (zero imbalance) |
| Drive probes | **256 total** — all 64 modules have **all 4** probes (agency/communion/eros/agape), each with healthy + addiction + allergy signal text |
| Tasks per module | 3 tasks + weighted scoringRubric (verified in `cognitive/red.ts`) |
| Fallback content | 1,564-line `FallbackProvider.ts` with 127 prompts + `getFallback(modality, line, stage)` (`FallbackProvider.ts:1564`) and asked-prompt persistence — the game degrades gracefully without any LLM |

Citation example: `src/core/assessments/cognitive/red.ts:35-55` — 20 items
spanning difficulty 0.2→0.9 across n-back/pattern_prediction task types.
README's "1,280 items" claim is **true**.

### 2.3 The scheduler & priority engine

`PriorityComputation.ts` computes 7 sub-scores (theta urgency, shadow
activation, polarity alignment, transformation readiness, drive correction,
narrative coherence, session fit); `AutoModeStrategy` biases these weights per
session; `EncounterScheduler.scheduleNextWithHolonicReturn` injects holonic-return
encounters for neglected lower stages (the "holon is never outgrown" commitment,
`EncounterScheduler.ts:11-22` imports `shouldSurfaceReturn`);
`scheduleThresholdMode` activates when the transformation state machine is in
unravelling/crucible/emergence (`GameLoop.ts:340-347`).

### 2.4 Transformation & stage integrity

3-phase crucible (unravelling → crucible → emergence) with knot-pair detection
(dark-anchor + golden-block on a shared drive axis, `EncounterScheduler.ts:57-130`)
— this is the "Lovers crucible" mechanic from foundations/17, actually
implemented. `commitTransformation` only ever promotes (stages never demote;
regression-guarded by `tests/engines/StageNoDemotion.test.ts`), the
transformation state survives across sessions via Significator persistence
(`GameLoop.ts` GAP-F4 fields + `tests/engines/TransformationPersistence.test.ts`),
and the double-advance bug (P0-1) and phantom-avoidance bug (P0-2) are fixed
with explanatory comments in `GameLoop.ts:465-475, 563-573`.

---

## 3. Dimension 2 — The Curriculum Game (educational engine)

**Verified:** 48 curriculum holons seeded across 16 subject tracks
(cs.foundations/program/algorithms/data_structures, math.foundations/number_theory/
algebra/geometry, physics.foundations/classical_mechanics/electromagnetism/
thermodynamics + program tracks) — probed via `seedCurriculumRegistry()`.

The subsystem is deep where it exists:
- `ForgettingCurve` (Ebbinghaus retention, review candidates, depth progression)
- `KnowledgeGraph` (topological prerequisites, learning paths, ready-concept detection)
- `DepthAssessment` (classify depth, calibration bias)
- `ProgressionValidator` + `RubricCalibrator` + `MetaCognitiveProbe` — the game
  audits *itself*: progression monotonicity, rubric discriminability/coverage,
  and fires `shouldIntervene` → next-session consolidation theme
  (`GameLoop.ts:endSession` WIRE-BRIDGE)
- `LearningAnalytics` → modality effectiveness feeds back into the learning
  profile (`GameLoop.ts:endSession` Phase 4C)
- Bidirectional WIRE-BRIDGE: developmental needs (theta decay >7d, drive
  fixation >0.6, ≥2 unresolved shadows — `DevelopmentalNeedsDetector.ts:15-95`)
  become curriculum recommendations, and curriculum outcomes become
  developmental signals (`CurriculumBridge.bridgeCurriculumToDevelopmental`)
- Depth never demotes (`GameLoop.ts:197-210` explicit guard)

**Limitation (fact, then inference):** 48 holons / 3 subjects vs. the 64-line
developmental matrix (fact). *Inference: curriculum coverage is ~1/13th of the
developmental surface; the educational stream is real but a sliver of the
promise. The 7.1 MB docs tree contains 515 concept-draft files that have not
been converted into curriculum holons.*

## 4. Dimension 3 — Cognitive Training (brain-game kernel)

`BrainGameEngine` is a clean port-adapter state machine (UI via `GameUiPort`,
difficulty via injected adjuster, records via sink — `BrainGameEngine.ts:1-80`),
with 5 paradigms (n_back, stroop, go_no_go, reaction_time, pattern_prediction)
and a design rule that no LLM call sits inside the trial loop (reaction-time
integrity — header comment, `BrainGameEngine.ts:1-10`).

**Adaptivity proof-tests exist and pass** (`tests/adaptive/SyntheticConvergence.test.ts`):
- Strong/weak/noisy synthetic players converge to distinct ability bands after
  100 trials (`:14-31`)
- Latency-gated escalation: composite_accuracy_rt does not escalate on
  slow-but-correct responses (`:33-44`)
- The in-engine staircase separates strong vs weak engines within 12 trials (`:46-83`)

This is the strongest evidence in the repo that a *measurement* channel
actually measures: convergence of an adaptive estimator under a known ground
truth is the correct psychometric test shape.

## 5. Dimension 4 — Adaptivity to the Unique Individual

Layered personalization, all wired:

1. **Onboarding** — separate binary-search composite assessment route
   (`src/routes/onboarding/`, README §"Routing map") seeding the initial
   Significator per line.
2. **CCI** (`CCIEngine.ts`) — 6 weighted dimensions (altitude .12, driveHealth
   .20, polarity .12, shadowTopology .20, transformationReadiness .16,
   knowledgeHealth .20, `CCIEngine.ts:28-36`), plus metabolic health G_z/P_z
   (lesser/greater-cycle health) and a liminality signature; explicitly
   non-normative and never player-facing (header, `CCIEngine.ts:1-11`).
3. **SessionStrategy** — theme (9 values), session arc (warmup/peak/cooldown),
   weight bias, encounter budget, modality bias, adjustment thresholds
   (`AutoModeStrategy.ts:37-106`); mid-session re-evaluation every 3 encounters
   with intensity/theme/bias adjustment; safety override forces consolidation
   on high fixation + unresolved shadows (`GameLoop.ts` step 9).
4. **UserMatrixModel** — per line×stage inference of the player's
   Matrix/Potentiator from every response, with phase promotion and reset at
   transformation (`UserMatrixModel.ts`, wired at `GameLoop.ts:110-135`).
5. **Returner care** — >30-day absence softens the session target
   (`GameLoop.ts:296-307`); holonic-return encounters arrest theta decay.
6. **Accessibility layer** (`src/core/accessibility/`, tested) and
   **personalized Veil resonance** — the stage aesthetic gets a personal
   modifier from the player's dominant shadow quadrant
   (`veilDescriptors.ts:44-70`, with the "Maya" rationale comment).

**Veil compliance** (the "never diagnostic to the user" commitment) is enforced
in one place (`veilDescriptors.ts` is the declared single source of truth,
`:8-13`), verified by an invariant ("toQualitativeFeedback produces
Veil-compliant output") and the glossary/status output observed this session —
all felt-sense language, no scores.

## 6. Dimension 5 — Healing / Efficacy Architecture

What "healing" mechanically means here and its honest state:

**Implemented:** 4-quadrant shadow ledger (Dark/Golden × Addiction/Allergy)
with recurrence counting; shadow-work mode triggers at >3 unresolved shadows on
a line (`EncounterScheduler.ts:19-25`); knot-pair crucible; drive probes
scoring healthy vs addiction vs allergy signals; integration prompts after
encounters (observed in the headless run); harvest check at White (STO 51% /
STS 95% per foundations/19) with Samsara-mode intent (`GameLoop.ts:endSession`
P2-Critical).

**The efficacy gap (inference, high confidence):** every "did it work" signal
is self-referential — quality is estimated from response richness
(`estimateResponseQuality`, `GameLoop.ts:656-677`: drive diversity + shadow
surfacing + narrative length), retention from an assumed half-life, and
transformation from accumulated encounter counts. There is no external
criterion measure, no test-retest stability check on the developmental axes,
no longitudinal drift analysis, and no control condition. The README's own
canon decision #2 ("legitimate efficacy via validated tasks and honest
telemetry, without clinical certification") is *aspirational* here: the tasks
are gamifications of validated paradigms (n-back, ToL, Stroop — acknowledged
in README acknowledgements), but no validation study of Mysterium's scoring of
them exists in-repo. `docs/validation/BIBLIOGRAPHY.md` is named in the README
as a Phase-5 deliverable and does not exist yet (fact).

**Verdict:** as a *practice* scaffold (catalyst → experience → integration)
the loop is genuinely constructed; as a *measurement* of psychological change
it is currently a well-instrumented hypothesis.

## 7. Findings (ordered by severity)

### P0 — `endSession` crashes on active macro events in ESM runtime
`src/core/GameLoop.ts:953` and `:1133` call `require('./engines/MacroCatalystEngine.js')`
inside an ESM module. Verified empirically: `typeof require === 'undefined'`
under tsx/ESM, and `endSession` **throws "require is not defined"** when
`world.activeMacroEvents` is non-empty (probe with one synthetic macro event
crashed). Consequences:
- In dev/tests/CI (tsx/vitest ESM), **any session ending with an active
  macro event crashes session-end persistence**.
- There is **no test** covering endSession with macro events — CI cannot see this.
- The shipped tsup bundle is immune *by accident*: esbuild converts the call to
  a bundled reference (`dist/cli/cli-game.js:21257` shows the inlined
  `advanceMacroEvent`), i.e. production works while every dev/test path fails.
- The same pattern at `GameLoop.ts:1011` (`checkHarvest`) is inside try/catch,
  so the **White-stage harvest check silently no-ops** (verified: returns `null`
  at White stage for reasons of the dead path, not game logic — direct import
  of `checkHarvest` works and returns a real verdict).

**Fix:** static `import { advanceMacroEvent, resolveMacroEvent } from './engines/MacroCatalystEngine.js'`
at top of file and delete the three `require` sites; add a regression test:
"endSession with active macro event advances lifecycle and does not throw."

### P1 — Known-issues docs are stale relative to HEAD
`docs/agentic-loop/02-system-architecture-audit-2026-08-28.md` (committed) still
lists `hooks.ts` as "TRANSFORMATION HOOKS NOT WIRED" and `SessionAgent.ts` as
"legacy — referenced but no longer in CLI path", but the hooks stub has since
been replaced by an explicit no-op with rationale (`hooks.ts:1-17`) and the
transformation wiring has moved into GameLoop. Not a code bug; an audit-trail
drift that will mislead the next auditor (it nearly did this one).

### P2 — Stale shipped bundle
`dist/cli/cli-game.js` in the tree identifies as "CCRPG v0.1.0" while current
source is "Mysterium v0.1.0" — `npm run build:cli` regenerates it, but the
committed artifact (and thus any `node dist/cli/cli-game.js` user and the
published npm tarball if built from a stale checkout) lags the source.

### P3 — World content is Red-only
All 36 holons are `stage: Red` (verified via `red-layer-holons.json`). Stages
2–8 have zero authored holons; the scheduler for higher stages relies entirely
on module items + LLM generation + ShadowContentGenerator. Consistent with the
README's "first vertical slice (Red)" status, but it means 7/8 of the stage
surface is scaffolding-only today.

### P4 — Curriculum content depth
48 holons across 3 subjects (see §3) — the strongest subsystem with the
thinnest corpus relative to the 512-concept-draft library it was designed to
consume.

### P5 — Minor
- `_curriculumIntervention` and `lastSessionAt` are cast through `as any`
  onto the Significator (`GameLoop.ts:315-331, endSession`) — schema-drift
  smell; they deserve real fields.
- `estimateResponseQuality` rewards *longer* narratives (`GameLoop.ts:672-674`)
  — verbose-but-empty answers score higher than terse-but-insightful ones;
  consider rubric-based quality via the orchestrator instead.
- Vitest leaves the Vite server hanging after runs ("close timed out after
  10000ms" in this session's run) — cosmetic CI noise.

## 8. What is genuinely strong (worth saying plainly)

1. **The uniqueness discipline is real.** The docs→concept-draft→code chain is
   traceable; every engine file cites its foundations doc; the module contract
   is uniform across all 64 modules.
2. **Self-auditing subsystems.** A curriculum system that lints its own
   progression, calibrates its own rubrics, and forces consolidation when
   unhealthy is rare even in production learning software.
3. **Regression culture.** Fixed bugs stay fixed with named tests
   (StageNoDemotion, TransformationPersistence, SyntheticConvergence) and
   explanatory comments at the fix sites.
4. **Veil as an architectural constraint**, not a UI afterthought — single
   rendering source, invariant-checked.
5. **Failure-mode honesty.** No-LLM operation is a first-class mode (1,564-line
   fallback corpus, asked-prompt de-duplication), not an error path.

## 9. Scope & method notes

- **Inspected:** full GameLoop trace; CCI/AutoMode/Scheduler/CandidateGeneration/
  Consequence/Transformation/UserMatrix engines; all 8 assessment line dirs
  (enumerated) + deep read of cognitive/red; curriculum subsystem (registry,
  bridge, needs detector, seed data); braingame kernel + adaptive service +
  convergence tests; veil descriptors; unified profile & training tools;
  fallback provider; CI workflow; README/architecture audit docs; runtime
  probes (diagnostic, headless×3 configs, glossary, status, bundle smoke).
- **Not inspected:** Svelte component internals, BFF API endpoints, Cloudflare
  KV/persistence implementation details, infra/llm provider internals,
  concept-drafts content quality (515 files — sampled via index only).
- **Method note:** `docs/agentic-loop/02` audit (2026-08-28, commit 3f80ec1)
  was used as a prior and spot-verified; discrepancies are recorded as P1.
