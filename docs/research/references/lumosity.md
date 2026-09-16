# Part 1: Lumosity Mobile Game Taxonomy & Feature Analysis

Lumosity’s library consists of over 50 games categorized into five primary cognitive domains. For a CLI adaptation, you must abstract these visual/spatial tasks into text-based, numeric, or symbolic equivalents.

### 1. Cognitive Domains & CLI Adaptation Strategy

| Domain | Core Cognitive Skill | Representative Lumosity Games | CLI Adaptation Strategy |
| :--- | :--- | :--- | :--- |
| **Memory** | Working memory, spatial recall, name-face association | *Memory Matrix*, *Pinball Recall*, *Familiar Faces* | Grid coordinates (e.g., "A3, B5"), sequence repetition (Simon-says style with chars), paired-associate learning via text prompts. |
| **Attention** | Selective attention, divided attention, processing speed | *Eagle Eye*, *Lost in Migration*, *Spatial Navigation* | Target detection in ASCII noise streams, dual-task prompts (answer math while tracking a moving cursor position), Stroop-like color/word conflicts using ANSI codes. |
| **Problem Solving** | Logical reasoning, planning, mental flexibility | *Raindrops*, *Puzzle Blocks*, *Organic Order* | Arithmetic under time pressure, text-based sliding puzzles, resource allocation riddles, pattern completion sequences. |
| **Speed** | Rapid visual processing, information scanning | *Speed Match*, *Chalkboard Challenge* | Rapid serial visual presentation (RSVP) of symbols, reaction-time key presses, timed true/false categorization tasks. |
| **Language** | Verbal fluency, vocabulary, reading comprehension | *Word Bubbles*, *Train of Thought*, *Babble Bot* | Anagram solving, synonym/antonym matching, sentence reconstruction, category generation within time limits. |

### 2. Non-Game Meta-Features (Critical for Retention)
To replicate Lumosity effectively, the CLI must include:
*   **Adaptive Difficulty Algorithm:** Games must scale based on real-time performance (staircase method or Bayesian adaptive tracking).
*   **LPI (Lumosity Performance Index) Equivalent:** A normalized scoring system that allows cross-game comparison and longitudinal tracking.
*   **Daily Training Suggestion:** A curated subset of 3–5 games per session to prevent fatigue.
*   **Insight Dashboard:** Post-session analytics showing percentile ranks and domain-specific trends.
*   **Onboarding/Baseline Assessment:** Initial calibration sessions to set starting difficulty parameters.

---

# Part 2: Software Architecture for TypeScript CLI

Since you already have a working CLI foundation, this architecture focuses on **integration points**, **cognitive engine design**, and **data persistence** specific to brain training. This assumes a Node.js/Bun runtime with TypeScript strict mode.

## 1. High-Level Architectural Pattern: Hexagonal (Ports & Adapters)

For a cognitive training app, decoupling game logic from the CLI rendering layer is non-negotiable. This allows future migration to TUI frameworks (Ink, Blessed) or even web without rewriting cognitive algorithms.

```text
[CLI Adapter Layer]  <--->  [Core Domain]  <--->  [Infrastructure Layer]
 (Rendering/Input)         (Pure TS Logic)        (DB/API/Analytics)
```

## 2. Module Breakdown

### A. Core Domain (`/src/core`)
*Pure TypeScript, zero dependencies on CLI libraries or filesystem.*

*   **`GameEngine`**: Abstract base class defining the lifecycle: `init()`, `presentStimulus()`, `evaluateResponse()`, `calculateScore()`, `adjustDifficulty()`.
*   **`CognitiveModel`**: Defines the 5 domains and their sub-skills as typed enums/interfaces. Each game declares which skills it trains and at what weight.
*   **`AdaptiveAlgorithm`**: Implements psychometric scaling. Recommended: **Weighted Up-Down Staircase** or **PEST algorithm**. Takes `(lastScore, currentLevel, threshold)` → returns `nextLevel`.
*   **`ScoringNormalizer`**: Converts raw game scores (ms, accuracy %, count) into a standardized 0–100+ index using pre-computed lookup tables or sigmoid functions derived from baseline data.
*   **`SessionPlanner`**: Generates daily workouts based on user history, balancing domain coverage and avoiding recent repetition.

### B. CLI Adapter Layer (`/src/adapters/cli`)
*Bridges core domain to terminal I/O.*

*   **`RendererFactory`**: Maps game stimulus types to CLI output strategies:
    *   `GridRenderer`: ASCII box-drawing characters for spatial memory games.
    *   `StreamRenderer`: Character-by-character RSVP for speed games.
    *   `PromptRenderer`: Formatted questions for language/problem-solving.
    *   `ANSIColorManager`: Handles color-coded stimuli (critical for attention/Stroop games).
*   **`InputHandler`**: Normalizes keyboard input across platforms. Supports both single-keypress (reaction time) and buffered line input (language games). Includes debounce and latency measurement.
*   **`DashboardView`**: Renders post-game stats and historical charts using ASCII charting libraries (e.g., `asciichart`).
*   **`ProgressBar/TimingWidget`**: Precise timing visualization essential for speed-based games.

### C. Infrastructure Layer (`/src/infrastructure`)
*Persistence and external integrations.*

*   **`LocalDatabaseAdapter`**: SQLite (via `better-sqlite3`) or LowDB for storing:
    *   Raw trial-level data (stimulus, response, RT, correctness)
    *   Session summaries
    *   User profile & baseline parameters
*   **`AnalyticsService`**: Computes rolling averages, domain balances, and predicted LPI-equivalent scores. Runs offline; optionally syncs to cloud.
*   **`ConfigManager`**: Stores user preferences, accessibility settings (colorblind modes, font size hints), and calibration data.

## 3. Key Integration Points with Existing CLI Architecture

| Existing CLI Component | Integration Action | New Addition Required |
| :--- | :--- | :--- |
| Command Router | Add `/train`, `/assess`, `/insights`, `/calibrate` commands | `SessionPlanner` port injection |
| State Manager | Extend to hold active game session state + cognitive model context | `GameSessionStateMachine` |
| Output Pipeline | Add middleware for ANSI escape code sanitization & timing precision | `HighResTimer` wrapper around `process.hrtime.bigint()` |
| Config System | Add schema for cognitive parameters (difficulty bounds, domain weights) | Zod/Joi validation schemas for cognitive config |
| Test Suite | Add property-based tests for adaptive algorithms | Fast-check generators for score distributions |

## 4. Critical Technical Considerations for CLI Brain Training

### Timing Precision
CLI environments introduce variable latency. For speed/reaction games:
*   Use `process.hrtime.bigint()` for all measurements, never `Date.now()`.
*   Measure and subtract average terminal render latency during calibration.
*   Document inherent CLI timing limitations to users; consider ±15ms tolerance bands.

### Adaptive Difficulty State Machine
Each game instance must maintain its own difficulty state independent of global config:
```
State: { level: number, streak: number, reversalCount: number, stepSize: number }
Transition Rules: Defined per-game in config, not hardcoded
Persistence: Saved mid-session for crash recovery
```

### Accessibility in Terminal
Brain training apps serve diverse cognitive profiles:
*   All color-dependent games MUST have symbol/shape alternatives.
*   Support configurable stimulus duration and inter-trial intervals.
*   Provide verbose/non-timed practice modes before scored sessions.
*   Screen reader compatibility: Semantic structure in output, avoid purely positional ASCII art for critical information.

### Data Schema Design (Trial-Level)
Store granular data for future algorithm refinement:
```typescript
interface TrialRecord {
  gameId: string;
  sessionId: string;
  timestamp: bigint;
  stimulusHash: string;      // Deterministic ID for reproducibility
  difficultyLevel: number;
  expectedResponse: unknown;
  actualResponse: unknown;
  reactionTimeNs: bigint;    // null if not timed
  isCorrect: boolean;
  metadata: Record<string, unknown>; // Game-specific params
}
```

## 5. Development Roadmap Recommendations

1.  **Phase 1 – Engine + 3 Prototype Games**: Build `GameEngine`, `AdaptiveAlgorithm`, one game per domain (Memory, Speed, Problem Solving). Validate timing precision and difficulty scaling.
2.  **Phase 2 – Scoring + Session Planning**: Implement `ScoringNormalizer`, `SessionPlanner`, baseline assessment flow. Users can now do meaningful daily training.
3.  **Phase 3 – Full Game Library + Insights**: Expand to 15–20 games covering all 5 domains. Build dashboard views and trend analytics.
4.  **Phase 4 – Polish + Accessibility Audit**: Colorblind modes, timing calibration wizard, screen reader testing, documentation of cognitive validity claims.

## 6. Risks & Mitigations

| Risk | Impact | Mitigation |
| :--- | :--- | :--- |
| CLI timing inaccuracy invalidates speed games | High | Calibration phase; publish known error margins; use relative scoring over absolute RT |
| Adaptive algorithm plateaus or oscillates | Medium | Extensive simulation testing with synthetic users before live deployment |
| Text-only format fails to translate spatial tasks | Medium | Pilot test each adapted game against original cognitive construct; discard poor translations |
| User fatigue from monochrome/text interface | Medium | Rich ANSI styling, varied game pacing, mandatory rest prompts, engaging narrative framing |

This architecture leverages your existing CLI foundation while introducing the specialized cognitive science infrastructure that distinguishes a brain training platform from a generic game collection. The hexagonal boundary ensures your CLI investment remains protected as the cognitive engine evolves independently.
