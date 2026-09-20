# 04 — Agent Tool Specification

> The concrete upgrade to the agentic loop: new function-tools, their exact schemas, execution semantics, and the rules that govern the agent's use of them. This is the contract between the LLM Game Master and the deterministic training kernel described in [03-target-architecture.md](03-target-architecture.md).

---

## 1. Current tool surface (baseline)

Registered in `AgenticOrchestrator.ts` (`TOOLS`, line 160), executed in `run()`:

| Tool | Role |
|---|---|
| `ask_user_question` | Narrative + MCQ presentation (3–4 options + write-in) |
| `complete_encounter` | Conclude with pass/fail, scores, drive signals, polarity, shadow signal |

Both schemas follow OpenAI function-tool JSON Schema style — new tools must match this convention exactly so `queryLLMWithTools` handles them without modification.

## 2. New tools

### 2.1 `run_brain_game` — execute a complete game session

The agent's primary execution tool. Launches one multi-trial brain game **synchronously inside native code**; returns an aggregate summary for interpretation.

```jsonc
{
  "type": "function",
  "function": {
    "name": "run_brain_game",
    "description": "Run a complete interactive brain-training game with the player (multiple timed trials). Call this when the session plan reaches a training beat or the player requests a game. The engine handles all trial presentation and timing; you will receive a summary afterward. Frame the game narratively BEFORE calling this tool; interpret results AFTER. Never invent or estimate the summary values.",
    "parameters": {
      "type": "object",
      "properties": {
        "paradigmId": { "type": "string", "enum": ["n_back","stroop","go_no_go","reaction_time","rhythm","hold","pattern_prediction","emotion_identification","dilemma","scenario","value_ranking","self_report","imitation","cooperation"] },
        "trialCount": { "type": "integer", "minimum": 4, "maximum": 30, "description": "Override default trial count (typically leave unset)." },
        "difficultyHint": { "type": "number", "minimum": 0, "maximum": 1, "description": "Optional starting difficulty 0-1. Omit to use the player's calibrated baseline." },
        "framing": { "type": "string", "description": "One-sentence in-fiction framing of why this challenge appears now (already shown to the player via prior narration)." }
      },
      "required": ["paradigmId"]
    }
  }
}
```

**Result payload** (returned as the tool message):

```jsonc
{
  "sessionId": "bg-17246…",
  "paradigmId": "n_back",
  "trialsCompleted": 12,
  "accuracyTrend": [0.5, 0.67, 0.75, 0.83],
  "rtMedianMs": 1420,
  "difficultyStart": 0.35,
  "difficultyEnd": 0.45,
  "dimensionAverages": { "accuracy": 0.72, "response_time": 0.64, "consistency": 0.7 },
  "calibrated": true,          // false if calibration block ran
  "fatigueFlag": false,        // RT degradation detected
  "feltSenseHint": "steady focus deepening under gentle pressure"  // pre-veiled phrase the agent may quote
}
```

**Execution semantics:**

1. Handler resolves paradigm from registry, difficulty from `AdaptiveDifficultyService` (hint overrides only if provided).
2. Engine runs trials through the CLI UI port — raw-mode keypress collection for timed paradigms, line input otherwise.
3. Trials stream to `TrialRecordStore`; adaptive state updates after each trial.
4. On abort (Ctrl-C / SIGINT): partial state persisted; result marks `aborted: true`; loop resumes narrative.

### 2.2 `get_training_profile` — read domain readiness

```jsonc
{
  "name": "get_training_profile",
  "description": "Read the player's current cognitive-training profile: per-domain readiness (decayed skill scores relative to their own baseline), stale skills, and recent play pattern. Use to decide what to train next and how to frame it. Values are internal context — translate them into felt-sense language for the player, never raw numbers.",
  "parameters": { "type": "object", "properties": {}, "required": [] }
}
```

**Result:** `{ domains: [{line, score01, trend: 'rising'|'stable'|'decaying', lastPlayedDaysAgo}], stalest: 'emotional', overallReadiness01 }`

### 2.3 `recommend_workout` — orchestrate a sequence

```jsonc
{
  "name": "recommend_workout",
  "description": "Request an ordered set of brain games tailored to available time and the player's decay profile. Returns the planned items; present them to the player as a choice (via ask_user_question) before running.",
  "parameters": {
    "type": "object",
    "properties": {
      "minutes": { "type": "integer", "minimum": 5, "maximum": 45 },
      "focusLine": { "type": "string", "description": "Optional line to bias toward." }
    },
    "required": ["minutes"]
  }
}
```

**Result:** `{ items: [{paradigmId, estimatedMinutes, rationale}], totalMinutes }` — produced by `WorkoutPlanner` honoring AutoModeStrategy bias + SRS decay priority.

### 2.4 `set_difficulty_override` — honor player preference

```jsonc
{
  "name": "set_difficulty_override",
  "description": "Adjust difficulty calibration for a paradigm at the player's explicit request ('too easy', 'too hard'). Persists across sessions.",
  "parameters": {
    "type": "object",
    "properties": {
      "paradigmId": { "type": "string" },
      "direction": { "type": "string", "enum": ["easier", "harder"], "description": "Or omit both direction and delta and set level directly." },
      "level": { "type": "number", "minimum": 0, "maximum": 1 }
    },
    "required": ["paradigmId"]
  }
}
```

### 2.5 `complete_workout` — close the loop

```jsonc
{
  "name": "complete_workout",
  "description": "Concludes a brain-game workout after all planned items are run (or the player stops). Triggers index update and persistence. Provide a felt-sense summary of the session — supportive, never clinical.",
  "parameters": {
    "type": "object",
    "properties": {
      "summary": { "type": "string" },
      "playerStoppedEarly": { "type": "boolean" }
    },
    "required": ["summary"]
  }
}
```

**Result:** `{ domainsUpdated: [...], nextReviewSuggestion }` — handler commits CognitiveIndex deltas + saves profile.

## 3. Resulting tool surface

| Phase | TOOLS array |
|---|---|
| Today | `ask_user_question`, `complete_encounter` |
| Phase D | + `run_brain_game`, `get_training_profile`, `recommend_workout`, `set_difficulty_override`, `complete_workout` |

Five additions, not more — every reference document warns against tool sprawl; each maps to one verb the kernel owns (execute / read / plan / adjust / conclude).

## 4. Agent rules amendments

Appended to the `[AGENT RULES]` system-prompt block (`AgenticOrchestrator.ts:393–400`) when training tools are active:

```
8. TRAINING BEATS: When the workout plan contains brain games, frame each game in fiction first,
   then call run_brain_game. Quote only values present in the tool result. Never simulate gameplay.
9. VEIL: Translate all metrics into felt-sense language ("your recall felt steadier than last time").
   Never expose scores, percentages, reaction times, or difficulty numbers to the player.
10. CONSENT: Present the recommended workout via ask_user_question before the first run_brain_game;
    respect a declined item by moving on or shortening the session.
11. BUDGET: A workout ends with complete_workout. An encounter still ends with complete_encounter.
```

Budget enforcement mirrors the existing ask-budget pattern: after N `run_brain_game` calls matching planner items, inject a forcing user message requiring `complete_workout`.

## 5. CLI command wiring

New commander subcommands in `scripts/cli-game.ts` (following existing patterns at lines 100–137):

| Command | Behavior |
|---|---|
| `train [--minutes N] [--focus <line>]` | Full agentic workout: builds a lightweight training encounter whose orchestrator gets the five new tools; reuses `runAgenticEncounter` plumbing, UI handler, headless/JSON modes |
| `train --free <paradigmId> [--trials N] [--difficulty X]` | Direct game without LLM framing (pure BrainGameEngine through CLI renderer) — also the integration-test seam |
| `insights [--days N]` | Reads TrialRecordStore + CognitiveIndex; renders sparklines/trends via existing chart idioms (`renderAltitudesChart`, `renderRadarChart`); felt-sense framed |
| `calibrate [paradigmId]` | Runs calibration blocks only; persists baselines; prints Veil-safe confirmation |

Headless compatibility: `--answer` injection and `emitEvent` JSON events extend to game trials (each trial emits a `game_trial` event with sanitized fields) preserving the automation/test seam.

## 6. Failure & integrity rules

1. **LLM unavailable mid-workout:** fall back to `runFallback`-style plain sequencing (planner order, no framing) — games remain playable offline; matches Failure Integrity posture of the Director.
2. **Paradigm crash:** catch per-paradigm; mark item skipped; continue workout; log to telemetry. One broken paradigm never kills a session.
3. **Corrupt calibration/index records:** validate-on-load with defaults (mirroring `validateSignificator` shims); recalibrate rather than crash.
4. **Abort semantics:** SIGINT during trials → persist partial TrialRecords + resume marker (serializable engine state); SIGINT during framing → normal encounter abort path (existing AbortSignal support).
