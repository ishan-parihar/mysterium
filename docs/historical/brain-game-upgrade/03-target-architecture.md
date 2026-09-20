# 03 — Target Architecture

> The unified design: what we build, where it lives, and the canon constraints that shape it. Grounded in the existing layer map (00) and closing the gaps (02).

---

## 1. Design principles

1. **Hexagonal discipline** — all new logic is pure `core/` code; terminal rendering stays in adapters; persistence goes through `KeyValueStore` ports. Matches existing structure; matches the references' own advice.
2. **Timing isolation** — no LLM call ever sits inside a trial loop. Reaction-time integrity beats agentic granularity.
3. **Veil compliance** — raw metrics exist internally for adaptive math and agent context; player-facing surfaces render felt-sense, never clinical scores or percentiles.
4. **Reuse before new** — every service below names what it extends. No parallel taxonomies, no second scoring engine.
5. **The agent orchestrates, the engine executes** — the LLM decides *what/when/why*; deterministic code owns *how/trials/timing/scoring*.

## 2. New modules (all under `src/core/`)

```
src/core/
├── braingame/
│   ├── types.ts                  ← ParadigmDefinition, GameSessionState, TrialRecord, DifficultyParams
│   ├── BrainGameEngine.ts        ← trial-loop state machine (pure)
│   ├── registry.ts               ← paradigm registry + lookup
│   ├── paradigms/
│   │   ├── nback.ts  stroop.ts  gonogo.ts  rttiming.ts  rhythm.ts
│   │   ├── pattern.ts  emotionId.ts  dilemma.ts  …        ← extracted from TaskRenderers
│   └── TrialClock.ts             ← hrtime.bigint() measurement + calibration offset
├── adaptive/
│   ├── AdaptiveDifficultyService.ts ← staircase / weighted up-down strategies
│   └── CalibrationStore.ts          ← per-player-per-paradigm calibration via KeyValueStore
├── training/
│   ├── WorkoutPlanner.ts           ← ordered game-session lists (bridges AutoModeStrategy)
│   ├── CognitiveIndex.ts           ← per-domain normalized skill scores with decay
│   └── FatigueMonitor.ts           ← intra-workout load tracking & swaps
└── telemetry/
    └── TrialRecordStore.ts         ← event-sourced trial persistence over KeyValueStore
```

Infra additions are minimal: one `NodeKeyValueStore` adapter (CLI file-backed JSON, mirroring `SaveRepository`'s file functions) so core services run headless in CLI and tests.

## 3. Component contracts

### 3.1 `ParadigmDefinition` (formalizes G9)

```ts
interface ParadigmDefinition<TParams, TState, TResponse> {
  readonly id: string;                    // 'n_back', 'stroop', … (reuses TaskType ids)
  readonly domains: readonly Line[];      // which Mysterium lines it trains (02 §mapping)
  readonly citation?: string;             // scientific grounding, per neuronation.md
  readonly defaultTrials: number;
  readonly paramSpace: ParamSpace<TParams>;   // tunable dimensions + min/max/step
  init(params: TParams): TState;
  presentStimulus(state: TState): StimulusDescriptor;   // descriptor, never rendered text
  evaluateResponse(state: TState, response: TResponse,
                   latencyMs: number): TrialEvaluation; // accuracy + dimension deltas
  nextState(state: TState, evaluation: TrialEvaluation): TState;  // immutable
  isComplete(state: TState): boolean;
}
```

- `StimulusDescriptor`: tagged union (`{kind:'grid'…}`, `{kind:'rsvp_stream'…}`, `{kind:'mcq'…}`) rendered by the CLI adapter — the references' presentation-descriptor rule.
- Migration path: each TaskRenderers renderer's stimulus generation + `evaluate()` logic moves into a paradigm module; the old renderer remains as a thin MCQ fallback for the narrative path until Phase C retires it.

### 3.2 `BrainGameEngine` (closes G2)

Pure state machine; constructed per game:

```
new BrainGameEngine(paradigm, difficulty, uiPort)
engine.start()            → presents trials through uiPort until complete
uiPort.present(descriptor), uiPort.collect(timeoutMs) → { response, latencyNs }
```

- Per-trial immutable states → replay/debug and serializable snapshots (pause/resume across terminal sessions).
- Emits `TrialRecord`s (below) to an injected sink — no direct I/O.
- On completion returns `GameSummary { trials, accuracyTrend, rtMedianMs, difficultyTrajectory, dimensionAverages }`.

### 3.3 `TrialClock` + `TrialRecord` (closes G7, feeds G4)

```ts
interface TrialRecord {
  gameId: string; sessionId: string; timestamp: number;   // epoch ms (storage); latency uses ns
  paradigmId: string;
  paramsHash: string;            // deterministic reproducibility (lumosity.md)
  difficultyParams: Record<string, number>;
  expected: unknown; actual: unknown; correct: boolean;
  latencyNs: bigint | null;      // hrtime.bigint(); null for untimed paradigms
  adjustedLatencyMs: number | null;  // after calibration-offset subtraction
}
```

Clock rules from the references, adopted wholesale: measure with `process.hrtime.bigint()`; capture a one-time input-latency offset during first calibration; store both raw and adjusted values.

### 3.4 `AdaptiveDifficultyService` (closes G3 ★)

Strategy pattern, staircase-first:

| Strategy | When |
|---|---|
| `WeightedUpDownStaircase` | default; +step after k consecutive correct, −larger step after m fails; reversals shrink step |
| `CompositeAccuracyRt` | speed/RT-weighted paradigms (reaction_time, go_no_go) |
| `BayesianAdaptive` (later) | post-v1 upgrade path, per foundations/08 |

- Operates on the paradigm's `paramSpace`, not abstract levels.
- Guardrails: forced ease after 3 consecutive failures; ceiling hold after 95% accuracy at max params.
- First-exposure runs a short calibration block (wide exploration → narrow).
- Persisted state: `{ paradigmId, baselineDifficulty, lastParams, streak, reversalCount, lastPlayed }` per player — through `CalibrationStore` → `KeyValueStore`.
- Cross-session decay of starting difficulty when `lastPlayed` is stale (ties into CognitiveIndex decay).

### 3.5 `CognitiveIndex` (closes G5)

Per-domain rolling skill score:

- Normalization: self-referenced z-scores against the player's own trailing baseline (no population norms — Veil-safe by construction and honest at n=1).
- Aggregation: domain score = weighted mean of paradigm scores touching that line.
- Decay: exponential per-skill decay on session start, reusing ForgettingCurve math idioms (`computeRetention`) retargeted from concepts to skills (closes G8 alongside).
- Feeds: adaptive warm-start, workout selection priority, agent's `get_training_profile`, insights charts.
- Player-facing rendering ALWAYS via felt-sense mapping (precedent: `cciToFeltSense`).

### 3.6 `WorkoutPlanner` + `FatigueMonitor` (closes G6, R2)

- Inputs: player profile, CognitiveIndex snapshot, available time budget, AutoModeStrategy's current session arc (warmup focus, weight bias) so brain-game workouts align with the narrative session rather than fighting it.
- Output: ordered `WorkoutItem[]` = `{ paradigmId, targetDifficulty, estimatedMinutes, rationale }` — 3–6 items, 2–4 min each (peak.md pacing), domain-balanced, SRS-prioritized toward decaying skills, avoiding immediate repetition.
- `FatigueMonitor`: tracks cumulative load + RT degradation across items; suggests swap-to-lighter or break; respects AutoModeStrategy's safety-override philosophy.
- Interruption resilience: planner output persisted at start; resume skips completed items.

### 3.7 `TrialRecordStore` (closes G4)

- Event-sourced append of `TrialRecord`s + periodic compaction into per-paradigm summary entries (rolling stats, last-N ring buffer).
- Storage: JSON documents via KeyValueStore, encrypted-at-rest using the same pattern as TelemetryStore (encrypt-then-set). Bounded size via compaction; export API (CSV/JSON) deferred to roadmap Phase E.
- Query surface kept intentionally small: `byParadigm(id, limitN)`, `domainSummaries()`, `recentSessions(n)`.

## 4. Integration with the existing loop

### 4.1 AgenticOrchestrator gains tools (the point of the upgrade)

New tools registered alongside `ask_user_question` / `complete_encounter` (schemas in [04-agent-tool-spec.md](04-agent-tool-spec.md)); handlers delegate to the services above. System-prompt `[AGENT RULES]` extended: when a workout item is active, frame the incoming game narratively before calling `run_brain_game`, interpret its summary afterward — never fabricate results.

### 4.2 GameLoop stays authoritative

Brain-game workouts compose INTO sessions rather than replacing them: a session may now include `workout` slots generated by the planner alongside narrative encounters. `tickWithStrategy` dispatches either kind. This preserves arcs, budgets, mid-session adjustment, and safety overrides untouched.

### 4.3 CLI commands (CLI-first preference)

```
mysterium train [--minutes N] [--focus line]    ← guided workout through the agentic loop
mysterium train --free <paradigmId>              ← single game, no narrative wrapper
mysterium insights                               ← trends/sparklines (felt-sense framed)
mysterium calibrate [paradigmId]                 ← re-run calibration blocks
```

All reuse existing CLI plumbing (commander program, chalk renderers, `--answer` headless mode, JSON event emission for tests).

## 5. Data flow end-to-end

```
player starts session
  → GameLoop/AutoModeStrategy emits arc incl. workout slot
  → orchestrator agent frames workout narratively
  → tool: recommend_workout → WorkoutPlanner (reads CognitiveIndex + strategy bias)
  → for each item:
       agent frames item (ask_user_question if consent/choice needed)
       tool: run_brain_game(paradigm, difficulty hint)
         → AdaptiveDifficultyService provides params (CalibrationStore)
         → BrainGameEngine runs trials (TrialClock timing, UI port renders)
         → trials stream to TrialRecordStore
         → GameSummary returned to agent
       agent interprets summary → next framing (Veil-safe language)
  → tool: complete_workout → CognitiveIndex update (decay + z-scores) → save
  → insights surfaces felt-sense progression on demand
```

## 6. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Terminal latency pollutes RT | Calibration offset; relative-scoring fallback bands; document tolerance (lumosity.md guidance) |
| Paradigm extraction regresses narrative encounters | Old renderer path retained behind flag during migration; 793-test suite gates every phase |
| Agent misuses tools / hallucinates results | Tool results carry structured summaries the prompt instructs it to quote; budget enforcement mirrors ask-budget pattern |
| Save-size growth from trial history | Ring buffers + compaction caps (bounded like FallbackProvider's capped prompts) |
| Scope creep toward full Lumosity clone | Roadmap phases are independently shippable; non-goals list in 02 §"Deliberate non-adoptions" |
