# Validation Benchmarking Architecture — Runtime Verification of the Mysterium Infrastructure

> **Status:** canonical-hypothesis (implemented; gates calibrated from observed engine behavior).
> **Lateral:** The benchmark/validation subsystem — synthetic personas with encoded ground
> truth, a deterministic simulation harness that runs them through the *live* engine loop
> (`tickWithStrategy` → `processOutcome`/`applyConsequences` → `applyResponseOnly` →
> `endSession`), canonicalized observable extraction, statistical separation metrics, and
> pass/fail gates. No other document covers *how the game proves it measures*.
>
> **Depends on:** foundations/25 (CCI), 27 (auto-mode), 16 (Significator), 24 (scheduler), 10 (shadow model)
> **Referenced by:** `src/core/validation/*`, `tests/validation/Benchmark.test.ts`, `scripts/run-validation-benchmark.ts`

---

## 1. Purpose and unique lateral

Mysterium's central claim — *the game diagnoses and heals while it entertains* — currently
rests on architecture and regression tests, not on demonstrated **measurement validity**.
Every previous audit reached the same verdict: the machinery is real, the efficacy is
unproven because nothing external ever checks the engine's outputs against a known truth.

This document defines the missing instrument: a **validation benchmark** that embeds
ground truth into synthetic players, runs them through the real engine, and gates
deployment on the engine's ability to recover that truth from behavior alone.

The core epistemological move: **we cannot ethically run controlled trials on real
players' psyches, but we CAN construct synthetic players whose "true" developmental
state is known by construction, and demand the engine agree with it.** A scheduler that
cannot distinguish a flourishing player from a struggling one must not be deployed as a
guide; a forgetting model that cannot detect an overwritten memory must not be deployed
as a teacher.

### 1.1 What the benchmark validates (the four higher-order roles)

| Role the system must play | Validation question | Persona axis / gate family |
|---|---|---|
| **Therapist** | Does distress produce care (safety override, integration themes), and does care work (shadows resolve under healthy engagement)? | shadow-implicit vs healthy trajectories; G4 shadow resolution |
| **Teacher** | Does the learning model track knowledge (retention decay, review recovery), and does the educational stream engage? | curriculum personas; G5 forgetting curve; G6 curriculum/training stream |
| **Master** | Does difficulty meet the player where they are, and does mastery gate progression? | ability personas; G7 adaptive difficulty; G8 transformation gating |
| **Guide** | Does the orchestrator *route differently per need* and *hold coherent personality across surfaces*? | full persona matrix; G2 divergence; G3 stability; G9 needs detection; G10 Veil invariants |

### 1.2 What this benchmark is NOT

- **Not a player-facing feature.** It lives in `src/core/validation/`, is only invoked by
  tests and the benchmark CLI, and never touches the Veil surface.
- **Not a clinical instrument.** "Ground truth" here means *engine-observable behavior
  encoded in response policies*, not clinical diagnoses of real humans.
- **Not a replacement for regression tests.** Regression tests pin *implementation
  behavior*; validation gates pin *measurement semantics*. Both are needed.

---

## 2. Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│  PERSONAS (ground truth by construction)                           │
│ (flourishing, constricted, approaching-threshold, golden-bypass,   │
│  fast-learner, slow-steady, surface-learner, stalled-learner,      │
│  struggling-but-engaged, exited-and-returning)                     │
└──────────────┬─────────────────────────────────────────────────────┘
               │ persona.policy(encounter, step) → PlayerResponse
               ▼
┌────────────────────────────────────────────────────────────────────┐
│  HARNESS (deterministic clock; mirrors CLI/orchestrator contract)  │
│  startSession → [tick(null,null) → policy → processOutcome/        │
│  applyConsequences → applyResponseOnly]×N → endSession             │
└──────────────┬─────────────────────────────────────────────────────┘
               │ Significator + world + sessionState per session
               ▼
┌────────────────────────────────────────────────────────────────────┐
│  OBSERVABLES (canonicalization layer)                              │
│  { cci, cciDims, driveWeights, driveFixation, shadowCounts,        │
│    thetaStaleness(line), conceptRetention(id), themes[],           │
│    modalityCounts, curriculumEncounters, trainingEncounters,       │
│    readiness, currentStage }                                       │
└──────────────┬─────────────────────────────────────────────────────┘
               ▼
┌────────────────────────────────────────────────────────────────────┐
│  GATES (per-persona expectations + population-level separation)    │
│  G1 stability · G2 divergence · G3 personality coherence ·         │
│  G4 shadow resolution · G5 forgetting curve · G6 educational       │
│  stream · G7 adaptive difficulty · G8 transformation gating ·      │
│  G9 needs detection · G10 Veil invariants                          │
└────────────────────────────────────────────────────────────────────┘
```

### 2.1 Determinism contract

The harness uses a **fixed epoch** (`2026-01-01T00:00:00Z`) and advances a virtual clock
by fixed steps (1 minute within sessions, 1 day between sessions, 45 days for the returner
persona). No `Date.now()` in the harness. The engine's time-dependent subsystems (theta
decay, forgetting curves, severity aging) therefore run on known inputs, making gates
reproducible in CI and across machines.

### 2.2 Persona contract

A persona is a named, documented synthetic player:

```ts
interface PersonaSpec {
  name: string;
  description: string;
  /** Initial per-line altitudes and centre of gravity. */
  altitudes: Record<Line, Stage>;
  currentStage: Stage;
  /** Optional initial knowledge seed (line → seedInitialKnowledge). */
  knowledgeLine?: Line;
  /** The behavior policy: fully determines the player's responses. */
  policy: ResponsePolicy;
  /** Ground-truth expectations evaluated against extracted observables. */
  expectations: PersonaExpectations;
  /** Trajectory plan (sessions, encounters, optional inter-session gaps). */
  trajectory: TrajectoryPlan;
}
```

The **response policy is the ground truth**: it is a pure function from
`(encounter, step) → PlayerResponse`, encoding *what a player of this type does*, and the
benchmark demands the engine's internal model agree with the *type*, not with any single
response. Policies are index-parameterized (the Nth response of the session) so they are
deterministic regardless of scheduler choices.

### 2.3 Response encoding rules (how behavior maps to engine inputs)

The engine consumes `PlayerResponse` fields; personas encode traits through them:

| Trait | Encoded as |
|---|---|
| Healthy engagement | `driveDirectionality` all `HealthyBalanced`, `energeticDirection: 'Radiative'` |
| Fixation (dark) | target drive `DarkAddicted`, others `HealthyBalanced` |
| Avoidance | `DarkAverted`/`GoldenAverted` on target axes |
| Golden bypass | `GoldenAddicted` + `sourceOfNourishment: 'HigherRealm'` + `stageOrientation: 'ReachingHigher'` while low-stage |
| Shadow surfacing willingness | `shadowSurfaced: <quadrant>` (self-report channel the engine treats as signal) |
| Engagement depth | `narrativeSummary` word count (quality estimator input) |
| Theta refresh | natural consequence of receiving encounters per line |

Drive mechanics (ConsequenceEngine `updateDriveBalance`): Healthy +0.01/−0.02 fixation,
Addicted +0.03/+0.05 fixation, Averted −0.02/+0.03 fixation per encounter. These rates
are the *calibration substrate* — gates were set from observed trajectories (§7).

---

## 3. The persona set

Ten personas spanning the four roles. (Implementation: `src/core/validation/personas.ts`.)

| # | Persona | Role focus | Behavior encoding | Ground truth |
|---|---|---|---|---|
| 1 | `flourishing` | Master/Guide | all healthy, ReachingHigher, reflective (40+ words) | CCI rises; themes stay growth-oriented; no shadows |
| 2 | `constricted` | Therapist | Communion `DarkAverted` every turn, non-reflective | fixation grows on Communion; needs detector flags Interpersonal |
| -relational avoidance pattern | | | | |
| 3 | `approaching-threshold` | Master | healthy + maximal line coverage | saturation accumulates; readiness climbs; **never transforms without the gate** |
| 4 | `golden-bypass` | Therapist | healthy drives + `GoldenAddicted` + HigherRealm + ReachingHigher + shadow surfacing | shadow ledger fills while "success" signals look perfect — the engine must still see the shadow load |
| 5 | `fast-learner` | Teacher | passes curriculum encounters (`HealthyBalanced`), depth-pushing | retention stays high under review; depth progresses |
| 6 | `slow-steady-learner` | Teacher | passes but sparser engagement | slower depth, but monotone depth under passed reviews |
| 7 | `surface-learner` | Teacher | mixes averted responses; shallow | depth stays below depth-pushers'; retention oscillates |
| 8 | `stalled-learner` | Teacher | averted on curriculum encounters | depth never advances; retention decays |
| 9 | `struggling-but-engaged` | Therapist | heavy surfacing + addiction signals, reflective | high shadow load; strategy reacts (integration/consolidation); safety override at extremes |
| 10 | `exited-and-returning` | Guide | healthy, then 45-day absence | theta staleness ~1.0 after gap; returner softening; needs fire on return |

**Why these ten:** they tile the 2×2 of (healthy ↔ pathological) × (learning ↔ relating),
plus the two *trajectory* personas (threshold approach, absence/return) that test
temporal dynamics rather than state classification.

---

## 4. The simulation harness

(`src/core/validation/harness.ts`) Mirrors the production loop **exactly** as the CLI's
orchestrator drives it — the same contract verified in the 2026-09-15 audit:

```ts
runPersonaTrajectory(persona, options?) → {
  persona: string;
  sessions: SessionRecord[];        // observables extracted per session
  holons: number;                   // world size used
  wallTimeMs: number;               // engine-only (excludes extraction)
}
```

Per encounter step:

1. `tickWithStrategy(sig, world, session, state, null, null, now)` — schedule
2. take `tickResult.encounters[0]` (fallback `tickResult.encounter`)
3. `sig = tickResult.sig; world = tickResult.world`
4. `response = persona.policy(encounter, stepIndex)`
5. `processOutcome` → `applyConsequences` (the orchestrator's path)
6. `applyResponseOnly(...)` — advance UserMatrixModel + transformation state
7. next step

Per session boundary: `endSession` (retention decay, needs probe, macro events,
`lastSessionAt` stamping), then apply any inter-session gap by advancing the virtual
clock before the next `startSession`.

**World:** one holon per line × current stage (the minimum the scheduler needs; content
realism is not under test here — measurement fidelity is).

---

## 5. Observables (the canonicalization layer)

`extractObservables(sig, sessionState, world)` returns a canonical, serializable snapshot
used by both per-persona gates and cross-persona statistics:

```ts
interface Observables {
  session: number;
  cci: number;                       // composite
  cciDims: Record<string, number>;   // 6 normalized dimensions
  driveWeights: Record<string, number>;
  driveFixation: Record<string, number>;
  shadowsTotal: number;
  shadowsUnresolved: number;
  thetaStaleness: Record<string, number>;  // per line: computeStaleness
  conceptRetention: Record<string, number>;
  themes: string[];                  // strategy themes this session
  modalityCounts: Record<string, number>;
  curriculumEncounters: number;
  trainingEncounters: number;
  readiness: number;                 // computeReadiness overall
  currentStage: Stage;
}
```

---

## 6. The gate system

(`src/core/validation/gates.ts`) Ten gates, each `validateX(personas, opts)` →
`{ gate, passed, details }`. Gates combine *per-persona expectations* (declared in the
persona) with *population-level statistics* (cross-persona separation).

### G1 — Reproducibility (stability)
Same persona run twice → identical final CCI, shadow counts, stage. The engine must be a
function of (persona, clock), nothing else. **Hard gate** (deployment-blocking).

### G2 — Population divergence
`flourishing` vs `constricted` vs `stalled-learner` (three archetypes, three roles) must
separate on ≥2 of 3 metrics: CCI composite, shadow load, knowledge depth. Paired per
session with tolerance (see §7 calibration). **Hard gate.**

### G3 — Personality coherence across surfaces
Same persona through both surfaces must produce the same **decision-grade** signal.
The CLI and the WebUI both drive `GameLoop` with identical contracts; the benchmark holds
`harness.runSession` fixed and permutes the *entry configuration* — SessionContext fields
the two surfaces populate differently (`inferredEnergy`, `recentLines`, target length).
Coherence = final observables equal (tolerance 1e-9 for identical config; themes equal
for realistic-config variants). **Hard gate.**

### G4 — Shadow lifecycle under healthy engagement (the therapy gate)
For `flourishing`: shadows surfaced ≈ 0. For `struggling-but-engaged`: shadow load
**monotonically non-increasing across sessions 2..N** once healthy engagement is applied
(`resolvesAtOrBelow`), because the engine's implicit-integration rule
(ConsequenceEngine §5b: all-healthy drive record resolves shadows at/below the
encounter's stage on the same line) is the system's core healing mechanic. Also asserts
`resolvesAtOrBelow` semantics via a direct unit probe (shadow on same line/stage resolves;
unrelated line does not). **Hard gate.**

### G5 — Forgetting curve fidelity (the teaching gate)
`stalled-learner` (averts everything): retention across sessions is **non-increasing**
(−tolerance). Any substantial increase (> 0.05 over the minimum seen) indicates the
forgetting model is not tracking memory. **Hard gate.**

### G6 — Educational stream engagement
Personas with knowledge seeds receive ≥1 curriculum encounter and ≥1 training-beat slot
allocation in the strategy; encounter-type counts in observables classify
curriculum (via `curriculumConceptId`) vs training (`isTrainingBeat`) vs developmental.
**Soft gate** (allocation depends on CCI/knowledge state; flaky in CI if hardcoded).

### G6b — Metacognitive self-audit
`probeCurriculum` on the post-trajectory knowledge state must report `overallHealth >
0.5` and no critical progression issues for passing personas. **Soft gate.**

### G7 — Adaptive difficulty / ability separation (the mastery gate)
`fast-learner` vs `surface-learner`: fast-learner's curriculum depth must exceed the
surface learner's after equal encounters, and the scheduler must produce distinct
difficulty distributions when the persona repeatedly passes vs fails at a cell
(direct probe against `generateTrainingSession`/staircase adjusters). **Soft gate**
(staircase convergence needs long runs; CI-tier asserts direction, full-tier asserts
magnitude).

### G8 — Transformation gating (the mastery gate, temporal form)
`approaching-threshold` accumulates saturation/readiness but **does not transform before
the gate fires** — stage remains constant while traces accumulate; and readiness stays
below the 0.8 commit threshold in the CI-tier horizon. **Hard gate** (the stage system's
integrity guarantee; also regression-guarded by StageNoDemotion tests).

### G9 — Needs detection
`constricted` (Communion aversion → Interpersonal fixation via the driveToLine map) must
produce a `drive_rebalance` need targeting Interpersonal, or a `theta_decay`/
`shadow_surface` need on Interpersonal. **Soft gate** (threshold-dependent).

### G10 — Veil invariants (the guide's ethics)
For every persona: (a) `describeSignificator`/`describeCCI` output contains no score
tokens (regex `\b\d+(\.\d+)?\b` filtered against stage names like "Red"/"Green" and
intentional words like "One"), (b) themes/rationales never leak into player-facing
descriptors. **Hard gate** (Veil is an architectural commitment).

---

## 7. Calibration methodology (how the gates were set)

Gates were **not** set by intuition. The calibration procedure (this session):

1. Ran the full persona matrix at the medium tier (3 sessions × 6 encounters).
2. Extracted every gated metric's observed range per persona.
3. Set thresholds at the boundary that separates the *predicted* ordering (e.g.,
   flourishing CCI > constricted CCI) with maximal observed margin.
4. Hard gates only assert what held with wide margin at medium tier; marginal
   observations became **soft gates** (warn) pending full-tier calibration.
5. Full-tier script (`scripts/run-validation-benchmark.ts`) exists to re-run
   calibration at 8×8 (sessions×encounters) and record margins for threshold tuning.

Example calibrations (medium tier, observed):
- flourishing vs constricted CCI separation: observed ~0.08–0.10 → gate `≥ 0.05`
- struggling shadow load vs flourishing: observed 6–8 vs 0 → gate `≥ 3`
- stalled-learner retention decline: observed monotone to ~0.45 → gate `non-increasing + max(0.05)`

This keeps hard gates honest: they assert *demonstrated* separations at CI-affordable
horizons, not theoretical ones.

---

## 8. Tiers

| Tier | Where | Matrix | Use |
|---|---|---|---|
| **CI** | `tests/validation/Benchmark.test.ts` | 10 personas × 2 sessions × 5 encounters (~2s) | merge-blocking |
| **Full** | `npm run bench:validation` | 10 personas × 8 sessions × 8 encounters + temporal personas | pre-release calibration, margin recording |

The CI tier asserts direction-of-effect with calibrated margins; the full tier can
tighten them. Gates that are calibrated only at longer horizons (e.g., actual
transformation firing) live in the full tier.

---

## 9. Failure semantics

- **Hard gate failure** = the engine has lost a measurement guarantee deployment depends
  on. Blocks merge (CI) / release (full). The gate's `details` field carries the
  observed values needed to diagnose.
- **Soft gate failure** = recorded, reported, non-blocking. A soft gate that fails in
  three consecutive full-tier runs must be either promoted (if the behavior is now
  trustworthy and stable), fixed, or explicitly re-scoped with a written rationale.

## 10. Relationship to existing test culture

| Layer | Example | Question answered |
|---|---|---|
| Unit/regression | `StageNoDemotion.test.ts` | Does this *implementation* behave as designed? |
| Invariants | `check-invariants.ts` | Are the architectural *constraints* upheld? |
| **Validation** (this doc) | `Benchmark.test.ts` | Does the system *measure and guide correctly* for different *kinds of players*? |

The benchmark composes existing engines only — it introduces no game mechanics. Its
entire surface is: personas (data), harness (the production loop), observables
(projection), gates (assertions).

---

## 11. Future extensions (explicit non-goals for v1)

- LLM-in-the-loop persona policies (currently deterministic; an LLM persona policy is a
  separate validation axis with its own non-determinism budget).
- Item-level psychometric validation (difficulty calibration against response matrices —
  requires the full 1,280-item selection path under test).
- Longitudinal full-tier soak (48-session trajectories) for threshold transformations.
- Statistical hypothesis testing (bootstrap CIs on separations) once margins are dense.
