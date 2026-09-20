# Report: Elevate Game Taxonomy & CLI Architecture Strategy

## Part 1: Deconstruction of Elevate’s Game Ecosystem

Elevate is not a monolithic game; it is a **cognitive training platform** composed of distinct micro-games categorized by cognitive domain. To replicate this effectively, you must understand that every game shares three underlying layers: *Cognitive Mechanic*, *Adaptive Difficulty Engine*, and *Performance Analytics*.

### 1. Core Cognitive Domains & Game Types
Elevate currently hosts 40+ games. For a CLI replication, focus on these five foundational archetypes which cover 90% of the cognitive load:

| Domain | Representative Games | Core Mechanic | CLI Adaptation Challenge |
| :--- | :--- | :--- | :--- |
| **Writing** | Brevity, Clarity, Concision | Text editing, synonym selection, grammar correction | Rendering rich text diffs; handling string input validation without GUI highlighting. |
| **Speaking** | Articulation, Persuasion, Tone | Vocabulary recall, rhetorical structure, pacing | Audio is impossible in pure CLI; must pivot to text-based rhetorical puzzles or timed typing/recall. |
| **Math** | Estimation, Proportion, Mental Math | Rapid calculation, number sense, visual approximation | ASCII visualization of charts/graphs; rapid numeric input handling. |
| **Reading** | Gist, Focus, Retention | Speed reading, information extraction, summarization | Terminal scrolling control; masking text; measuring WPM via keystroke timing. |
| **Memory** | Recall, Sequence, Association | Pattern matching, spatial memory, list retention | Grid rendering in terminal; managing cursor state for selection tasks. |

### 2. The "Meta-Game" Features (Non-Negotiable)
To truly replicate Elevate, your CLI must include these systemic features:
*   **Adaptive Difficulty Algorithm:** Games must adjust in real-time based on user accuracy and response time (not just pre-set levels).
*   **Spaced Repetition System (SRS):** The game selector shouldn't be random; it should prioritize skills where the user's "proficiency score" is decaying.
*   **Daily Workout Logic:** A curated sequence of 3-5 games based on user goals, not free play.
*   **Post-Game Analytics:** Immediate feedback showing percentile ranking, error patterns, and historical trend lines (rendered as ASCII/Braille charts).
*   **Gamification Layer:** Streaks, XP, and proficiency badges stored persistently.

---

## Part 2: TypeScript CLI Software Architecture

Since you already have a working CLI foundation, this architecture focuses on **integration points** for Elevate-specific features. This design assumes a modern TS stack (e.g., Ink for React-based TUI, or Ora/Chalk for imperative TUI) and emphasizes testability and domain purity.

### 1. High-Level Architectural Pattern: Hexagonal (Ports & Adapters)
Elevate’s logic is pure cognitive science; the CLI is merely a delivery mechanism. Strict separation is required so you can swap the CLI for a web UI later or run headless benchmarks.

```text
[CLI Adapter] <-> [Application Service Layer] <-> [Domain Core]
      ^                     ^                          ^
      |                     |                          |
[TUI Renderer]        [Workout Orchestrator]      [Game Engines]
[Input Handler]       [SRS Scheduler]           [Difficulty Algo]
[ASCII Charts]        [Analytics Aggregator]    [Scoring Rules]
      |                     |                          |
[FS/SQLite Adapter] <- [Persistence Port] <- [Repository Interface]
```

### 2. Module Breakdown

#### A. Domain Core (`/src/domain`)
*Pure TypeScript, zero dependencies, fully unit-testable.*

*   **`GameEngine` Interface:** Defines the contract for all games.
    *   `generateState(difficulty: number): GameState`
    *   `evaluateMove(state: GameState, input: UserInput): EvaluationResult`
    *   `calculateScore(evaluations: EvaluationResult[]): ProficiencyDelta`
*   **`AdaptiveDifficulty` Service:** Implements Bayesian Knowledge Tracing or Elo-like rating. Takes `(lastScore, responseTimeMs, currentDifficulty)` → returns `nextDifficulty`.
*   **`ProficiencyModel`:** Tracks skill decay curves per domain. Uses exponential moving averages.
*   **`WorkoutGenerator`:** Pure function taking `(userProfile, availableTime, goals)` → returns ordered `GameSession[]`.

#### B. Application Services (`/src/application`)
*Orchestrates domain logic with infrastructure concerns.*

*   **`SessionManager`:** Manages the lifecycle of a single game session. Handles timer interrupts, pause/resume state serialization, and graceful degradation on SIGINT.
*   **`AnalyticsPipeline`:** Transforms raw `EvaluationResult[]` into human-readable insights. Computes percentiles against a local benchmark dataset.
*   **`SRScheduler`:** Determines which games appear in the daily workout. Integrates with `ProficiencyModel` to identify atrophying skills.
*   **`ProgressionService`:** Handles XP calculation, streak validation, and badge unlocking logic.

#### C. CLI Adapters (`/src/adapters/cli`)
*Where your existing CLI architecture integrates.*

*   **`GameRendererFactory`:** Maps each `GameType` enum to a specific TUI component.
    *   *Critical:* Implement a **Frame Budget Manager**. Cognitive games require <16ms render updates for timers/animations. Use double-buffering or incremental DOM updates (if using Ink) to prevent flicker during rapid math/reading tasks.
*   **`InputNormalizer`:** Elevate games often accept multiple valid inputs (e.g., "twenty", "20", "XX"). Centralize fuzzy matching and alias resolution here, not in game engines.
*   **`ASCIIVisualizationAdapter`:** Wraps charting libraries (e.g., `asciichart`, `vega-lite-cli`) to render performance graphs consistently across all post-game screens.
*   **`AudioFeedbackShim`:** Since CLI lacks audio, map Elevate’s sound cues to haptic terminal bells, color flashes, or symbolic feedback (`✓`, `✗`, `⚡`). Make this configurable for accessibility.

#### D. Persistence Layer (`/src/infrastructure`)
*   **`SQLiteRepository`:** Recommended over JSON files. Elevate generates high-volume telemetry (every keystroke/tap matters for difficulty adjustment). Use WAL mode for concurrent read/write during active sessions.
*   **Schema Design:**
    *   `sessions`: id, timestamp, workout_id, duration
    *   `game_attempts`: session_id, game_type, difficulty, raw_score, response_times[], errors[]
    *   `proficiency_snapshots`: domain, score, decay_rate, last_updated
    *   `user_config`: display_prefs, input_aliases, accessibility_overrides

### 3. Critical Integration Points for Existing CLI

Since you have a working CLI, map these Elevate features to your current architecture:

| Elevate Feature | Integration Point | Key Consideration |
| :--- | :--- | :--- |
| Real-time Timer | Existing event loop / ticker | Must be drift-resistant. Use `performance.now()` deltas, not `setInterval` counts. Sync display refresh to timer ticks. |
| Adaptive Difficulty | Post-evaluation hook in SessionManager | Don’t adjust mid-game unless designed for it. Most Elevate games set difficulty *between* rounds. Store adjustment for next `generateState()` call. |
| Error Pattern Analysis | AnalyticsPipeline post-session | Tag every wrong answer with metadata (e.g., `{type: 'synonym', correct: 'concise', chosen: 'brief'}`). Enables targeted feedback. |
| Daily Workout | New command/route in CLI router | Add `elevate workout` alongside existing commands. Cache generated workout at startup to avoid regeneration on crash/restart. |
| Proficiency Decay | Background job / startup check | Run decay calculation on app init. If user hasn’t played in 3 days, lower scores by X%. Persist immediately. |

### 4. TypeScript-Specific Recommendations

*   **Discriminated Unions for Game States:** Each game has unique state shapes. Use tagged unions (`{ type: 'math_estimation'; value: number } | { type: 'reading_gist'; passage: string }`) to get exhaustive switch checking in renderers.
*   **Zod/Valibot for Input Validation:** Never trust CLI input. Define schemas for every game’s expected input format. Validate at the adapter boundary before reaching domain.
*   **Effect-TS or fp-ts Optional:** If your existing CLI is functional, consider these for managing side effects (timers, DB, randomness) in game engines while keeping them testable. If imperative, use strict DI containers.
*   **Benchmark Suite:** Create `/benchmarks` directory. Cognitive games are latency-sensitive. Profile render cycles and evaluation logic. Set CI thresholds (e.g., “Math game evaluation must complete in <2ms”).

### 5. Development Phasing Strategy

1.  **Phase 1: Domain Extraction** – Build 3 representative games (one per core domain: Math, Reading, Writing) as pure domain modules with comprehensive tests. No CLI integration yet.
2.  **Phase 2: Adaptive Engine** – Implement difficulty algorithm and proficiency model. Validate against synthetic user data.
3.  **Phase 3: CLI Integration** – Wire domain games into existing CLI renderer. Focus on input normalization and frame budget.
4.  **Phase 4: Meta Systems** – Add SRS, workouts, analytics, persistence. This is where Elevate’s *value* emerges beyond individual games.
5.  **Phase 5: Polish & Accessibility** – ASCII chart refinement, colorblind modes, keyboard shortcut optimization, offline-first resilience.

This architecture ensures your CLI isn’t just a collection of mini-games, but a **coherent cognitive training system** that mirrors Elevate’s pedagogical effectiveness while respecting terminal constraints. The hexagonal boundary protects your investment: if you later build a GUI or mobile version, 80% of this codebase transfers directly.
