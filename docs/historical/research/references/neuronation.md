# Part 1: Research Report – NeuroNation Game Taxonomy & Mechanics

NeuroNation’s training catalog is built on established neuropsychological paradigms adapted for gamification. To replicate this effectively in a CLI environment, you must abstract the *visual* mechanics into *cognitive* mechanics that work via text, ASCII, or terminal UI (TUI) elements.

### 1. Core Cognitive Domains & Game Types
| Domain | NeuroNation Example | Core Mechanic | CLI Adaptation Strategy |
| :--- | :--- | :--- | :--- |
| **Working Memory** | *Memo Pair*, *Sequence Master* | N-back tasks, spatial recall, pattern reproduction | Grid-based ASCII matrices; sequential character streams; delayed echo tasks |
| **Attention / Focus** | *Focus Flow*, *Spot the Difference* | Selective attention, inhibition, vigilance | Rapid symbol scanning among distractors; Stroop-like color/word conflicts in TUI |
| **Processing Speed** | *Speed Match*, *Reaction Dash* | Rapid visual discrimination, timed responses | Millisecond-precision keypress windows; high-frequency stimulus presentation |
| **Logic / Reasoning** | *Chain Reaction*, *Rule Breaker* | Pattern completion, rule deduction, set shifting | Text-based logic puzzles; sequence prediction; conditional rule application |
| **Language / Verbal** | *Word Flow*, *Lexicon* | Semantic fluency, anagrams, verbal memory | Timed word generation; scrambled letter unscrambling; category listing |
| **Math / Numerical** | *Calc Power*, *Number Ninja* | Mental arithmetic, magnitude comparison | Flash arithmetic problems; number comparison under time pressure |

### 2. Key Meta-Features to Replicate
Beyond individual games, NeuroNation’s effectiveness comes from its systemic features:

-   **Adaptive Difficulty Algorithm:** Games dynamically adjust difficulty based on real-time performance (e.g., staircase method, Bayesian adaptive tracking). This is *essential*—without it, a CLI brain trainer has no therapeutic value.
-   **Session Structuring:** Curated daily workouts mixing domains to prevent fatigue and ensure balanced training.
-   **Longitudinal Analytics:** Percentile rankings, domain-specific scores over time, and comparative baselines.
-   **Immediate Feedback Loops:** Post-trial accuracy/speed metrics, streak tracking, and motivational reinforcement.
-   **Scientific Grounding:** Each game maps to a published cognitive paradigm with cited literature.

### 3. CLI-Specific Constraints & Opportunities
-   **No Mouse Dependency:** All interaction must be keyboard-driven (single-key responses, arrow navigation, vim-style bindings).
-   **Terminal Rendering Limits:** Use libraries like `ink` (React for CLI) or `blessed`/`terminal-kit` for smooth TUI rendering at 60fps-equivalent refresh rates.
-   **Color as a Mechanic:** ANSI/truecolor support enables Stroop-type tasks and visual categorization even without graphics.
-   **Accessibility Advantage:** CLI is inherently screen-reader compatible—a unique differentiator vs. NeuroNation’s visual-first approach.

---

# Part 2: Software Architecture Blueprint (TypeScript CLI)

> **Assumption:** You already have a working CLI game shell (input handling, basic rendering loop, project scaffolding). This architecture focuses exclusively on integrating the *NeuroNation feature set* into your existing codebase.

## Architectural Principles
1.  **Paradigm-First, Not Game-First:** Games are instances of cognitive paradigms, not standalone entities.
2.  **Adaptive Engine as First-Class Citizen:** Difficulty adjustment is decoupled from game logic.
3.  **Event-Sourced Performance Data:** Every keystroke/response is an immutable event for analytics.
4.  **Plugin-Based Game Registry:** New cognitive tasks can be added without modifying core systems.

## High-Level Module Map

```
src/
├── core/                  # Existing CLI shell (input, render, main loop)
├── cognitive-engine/      # NEW: Brain training domain layer
│   ├── paradigms/         # Abstract cognitive task definitions
│   ├── adaptive/          # Difficulty algorithms
│   ├── session/           # Workout orchestration
│   └── scoring/           # Domain-specific score normalization
├── games/                 # Concrete game implementations
│   ├── working-memory/
│   ├── attention/
│   ├── processing-speed/
│   ├── reasoning/
│   ├── language/
│   └── math/
├── analytics/             # Event store, aggregators, percentile engine
├── persistence/           # Local DB (SQLite/LowDB), import/export
├── tui/                   # CLI-specific adapters (bridges cognitive-engine → core)
└── config/                # Paradigm configs, difficulty curves, workout templates
```

## Detailed Component Design

### 1. Cognitive Paradigm Abstraction (`cognitive-engine/paradigms`)
Every game implements a standardized interface. This is the contract between game logic and the adaptive/scoring systems.

```typescript
// Conceptual interface — NOT implementation code
interface CognitiveParadigm<TConfig, TState, TResponse> {
  readonly id: string;
  readonly domain: CognitiveDomain;        // 'working-memory' | 'attention' | ...
  readonly citation: string;               // Scientific reference
  
  initialize(config: TConfig): TState;
  generateStimulus(state: TState): StimulusPresentation;
  evaluateResponse(state: TState, response: TResponse, latencyMs: number): TrialResult;
  getNextState(state: TState, result: TrialResult): TState;
  isComplete(state: TState): boolean;
}
```

Key design decisions:
-   **`generateStimulus` returns a presentation descriptor**, not rendered output. The TUI adapter handles rendering. This keeps paradigm logic platform-agnostic.
-   **`latencyMs` is passed to evaluation.** Processing speed paradigms weight response time; memory paradigms may ignore it.
-   **State is immutable.** Each trial produces a new state, enabling replay/debugging.

### 2. Adaptive Difficulty Engine (`cognitive-engine/adaptive`)
This is the most critical differentiator from a casual CLI game.

**Architecture:**
-   **Strategy Pattern:** Multiple algorithms swappable per paradigm.
    -   `StaircaseAdapter`: Classic up/down based on threshold correct responses.
    -   `BayesianAdaptive`: Estimates ability parameter θ using psychometric function fitting (recommended for production-grade training).
    -   `WeightedComposite`: Combines accuracy + RT into single difficulty signal.
-   **Difficulty Parameter Space:** Each paradigm defines its own tunable dimensions (e.g., grid size, ISI duration, distractor count, operand range). The adaptive engine manipulates these parameters, not an abstract "level."
-   **Calibration Phase:** First N trials use wide exploration; subsequent trials narrow around estimated ability.
-   **Anti-Frustration Guardrails:** Maximum consecutive failures before forced ease; ceiling detection to prevent boredom.

**Integration Point:** After each `TrialResult`, the adaptive engine emits a `DifficultyAdjustmentEvent` consumed by the paradigm's `getNextState`.

### 3. Session Orchestrator (`cognitive-engine/session`)
Manages structured workouts rather than free-play only.

-   **Workout Template Engine:** Declarative JSON/YAML definitions specifying paradigm sequence, target duration, domain balance constraints, and rest intervals.
-   **Fatigue Monitor:** Tracks cumulative cognitive load across session; suggests breaks or swaps to lower-intensity paradigms when degradation detected.
-   **Warm-up / Cool-down Protocol:** Mandatory calibration trials before scored performance begins.
-   **Interruption Resilience:** Serializable session state allowing pause/resume across terminal sessions.

### 4. Analytics Pipeline (`analytics/`)
**Event-Sourced Design:**
Every interaction produces typed events:
-   `TrialCompleted { paradigmId, difficultyParams, accuracy, latencyMs, timestamp }`
-   `SessionStarted / SessionCompleted`
-   `DifficultyAdjusted { oldParams, newParams, reason }`

**Aggregation Layer:**
-   **Per-Domain Scoring:** Raw metrics normalized against population baselines (stored locally or fetched periodically). Uses z-score or percentile transformation.
-   **Longitudinal Trend Detection:** Rolling regression over trailing N sessions to surface improvement/stagnation/regression.
-   **CLI Dashboard Generator:** Produces ASCII sparklines, tables, and progress bars consumable by your existing TUI renderer.

### 5. TUI Adapter Layer (`tui/`)
Bridges your existing CLI shell with the cognitive engine.

-   **Stimulus Renderer Factory:** Maps `StimulusPresentation` descriptors to terminal output (ASCII grids, colored text, progress bars).
-   **Input Mapper:** Translates raw keypresses into paradigm-specific `TResponse` objects with precise timestamps (using `process.hrtime.bigint()` for sub-ms accuracy).
-   **Feedback Animator:** Non-blocking micro-animations for correct/incorrect responses that don't disrupt the trial timing loop.
-   **Layout Manager:** Responsive terminal layouts that adapt to window resize while maintaining stimulus integrity.

### 6. Persistence Strategy (`persistence/`)
-   **Local-First:** SQLite via `better-sqlite3` for structured query capability over thousands of trial events. Avoids JSON file scaling issues.
-   **Schema Versioning:** Migration system for evolving analytics schema as new paradigms are added.
-   **Export API:** CSV/JSON export for users who want external analysis.
-   **Privacy-by-Design:** All data local by default. Optional encrypted sync as future opt-in.

## Integration Checklist for Your Existing Codebase

Since you already have a working CLI game, here is the integration priority order:

1.  **Define the `CognitiveParadigm` interface** and refactor your existing game(s) to implement it. This is the foundational abstraction.
2.  **Implement the Staircase adaptive algorithm** first (simplest viable version). Wire it into your game loop so difficulty changes after every N trials.
3.  **Add event emission** to your existing trial completion logic. Start collecting data immediately—even before analytics dashboards exist.
4.  **Build one additional paradigm in a different domain** to validate that your abstraction generalizes. If it doesn't, revise the interface now.
5.  **Implement session orchestration** once you have ≥3 paradigms across ≥2 domains.
6.  **Build analytics/dashboard last.** Data collection and adaptive difficulty deliver training value before visualization does.

## Critical Technical Considerations for CLI Brain Training

-   **Timing Precision:** Node.js event loop introduces jitter. Use `worker_threads` for stimulus timing-critical loops, communicating via `SharedArrayBuffer` or `MessageChannel`. Never rely on `setTimeout` for millisecond-accurate RT measurement.
-   **Terminal Compatibility Matrix:** Test across iTerm2, Alacritty, Windows Terminal, GNOME Terminal, and tmux. ANSI escape sequence support varies. Graceful degradation for limited-color terminals.
-   **Input Latency Measurement:** Account for terminal input buffering. Measure round-trip latency during calibration and subtract systematic offset from RT calculations.
-   **Cognitive Load of CLI Itself:** Ensure the interface never becomes the bottleneck. Users should think about the *task*, not how to interact with the terminal. Minimize navigation depth; maximize single-key responses during active trials.

This architecture gives you a scientifically-grounded, extensible, and CLI-native brain training platform that faithfully reproduces NeuroNation's core value proposition while leveraging the unique strengths of the terminal environment.
