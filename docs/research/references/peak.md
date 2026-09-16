# Part 1: Analysis of Peak Mobile Game Features

Peak is not a single game but a **brain training platform** comprising over 40 distinct mini-games designed by neuroscientists and game developers. To replicate this in a CLI, you must understand the four core pillars that define the Peak experience.

### 1. The Game Taxonomy
Peak games are categorized into specific cognitive domains. A CLI version should support these categories via metadata tagging:

| Category | Core Cognitive Skill | Classic Peak Example | CLI Adaptation Challenge |
| :--- | :--- | :--- | :--- |
| **Memory** | Working memory, recall | *Perilous Path*, *Babble Bot* | Rendering grids/sequences in ASCII; relying on text-based input for recall. |
| **Focus** | Sustained attention, inhibition | *Agile Ants*, *Tunnel Vision* | Real-time terminal rendering; handling async input streams without blocking. |
| **Problem Solving** | Logic, planning, deduction | *Railroad Crossing*, *Decoder* | Text-based puzzle representation; parsing complex user commands. |
| **Language** | Vocabulary, fluency | *Word Weave*, *Anagram* | Natural fit for CLI; dictionary lookups and string manipulation. |
| **Math** | Arithmetic agility, estimation | *Quick Math*, *Bubble Pop* | Rapid numeric input handling; formatting equations clearly in monospace. |
| **Emotional Intelligence** | Empathy, facial recognition | *Face Value* | **High Difficulty:** Requires abstracting visual cues into textual descriptions or emoji/symbol patterns. |

### 2. The Meta-Game Loop (The "Peak" Experience)
Replicating individual games is insufficient. The value proposition lies in the wrapper:
*   **Adaptive Difficulty Engine:** Games do not have static levels. They use psychometric algorithms (often based on Item Response Theory or staircase methods) to adjust difficulty in real-time based on response time and accuracy.
*   **Gamification Layer:** XP, streaks, badges, and "Brain Score" aggregation across categories.
*   **Session Pacing:** Short bursts (2-3 minutes per game). The CLI must respect this temporal constraint.
*   **Analytics & Feedback:** Post-game breakdowns showing percentile rankings and historical trends.

### 3. CLI-Specific Constraints & Opportunities
*   **Constraint:** No touch/gesture input. All interaction must be keyboard-driven (hotkeys, typing, arrow keys).
*   **Constraint:** Limited visual bandwidth. You cannot show smooth animations. You must use ANSI escape codes, Unicode block characters, and strategic whitespace.
*   **Opportunity:** Zero-distraction environment. Perfect for focus and math games.
*   **Opportunity:** Speed. Terminal I/O is faster than GUI rendering for text-heavy games (Language/Math).

---

# Part 2: TypeScript CLI Software Architecture

Since you already have a working CLI foundation, this architecture focuses on **extensibility**, **adaptive difficulty**, and **separation of concerns**. It assumes Node.js/Bun runtime with TypeScript strict mode.

## 1. High-Level Architectural Pattern: Modular Monolith with Plugin System

Do not hardcode games into the core. Treat every game as a plugin that conforms to a strict interface. This allows you to add the 40+ Peak-style games without bloating the core engine.

```text
src/
├── core/               # Framework agnostic logic
│   ├── engine/         # Game loop, state machine, timer
│   ├── adaptive/       # Difficulty adjustment algorithms
│   ├── scoring/        # Brain score calculation, XP, normalization
│   └── persistence/    # Save/load abstraction (SQLite/JSON)
├── cli/                # Terminal-specific layer
│   ├── renderer/       # ANSI, Ink/Charm, layout managers
│   ├── input/          # Key mapping, debounce, raw mode handler
│   └── audio/          # Optional: terminal bell / beep feedback
├── games/              # Individual game plugins
│   ├── _template/      # Boilerplate for new games
│   ├── memory-grid/
│   ├── word-ladder/
│   └── math-sprint/
├── analytics/          # Session tracking, performance metrics
└── app.ts              # Composition root / DI container
```

## 2. Core Interfaces (The Contract)

Your existing CLI likely has a game loop. Refactor it to enforce this contract for every Peak-style game:

### `IGamePlugin`
Every game must implement:
*   `metadata`: ID, category, description, input schema.
*   `initialize(config: AdaptiveConfig)`: Setup with current difficulty parameters.
*   `getState(): GameState`: Pure serializable state for rendering.
*   `handleInput(input: CliInput): StateTransition`: Returns next state + any emitted events.
*   `evaluate(): RoundResult`: Accuracy, reaction time, error count.
*   `getDifficultyFeedback(result: RoundResult): DifficultyAdjustment`: Tells the engine how to scale next round.

### `IAdaptiveEngine`
The brain of Peak. Decoupled from games entirely.
*   `calculateNextParams(currentParams, history: RoundResult[]): AdaptiveConfig`
*   Supports multiple strategies: Staircase, Weighted Up-Down, Bayesian Adaptive.
*   Stores per-user calibration data separately from game logic.

### `IRenderer`
Abstraction over terminal output so games never call `console.log` directly.
*   `renderFrame(state: GameState, layout: LayoutConfig)`
*   `showFeedback(type: 'success' | 'error' | 'info', message: string)`
*   `clearRegion(region: RegionId)` — Critical for avoiding flicker in focus games.

## 3. Key Subsystem Designs

### A. Adaptive Difficulty Engine
This is what separates a toy from a brain trainer. Implement a **Strategy Pattern**:

*   `StaircaseStrategy`: Increase difficulty after N correct, decrease after M wrong. Simple, effective for CLI.
*   `ResponseTimeStrategy`: Adjust based on median RT vs target RT window. Crucial for Focus/Math games.
*   `CompositeStrategy`: Combines accuracy + RT. Used for most Peak games.

Store calibration data in a normalized format:
```typescript
interface UserCalibration {
  gameId: string;
  baselineDifficulty: number;
  discriminationThreshold: number; // Just Noticeable Difference
  lastPlayed: Date;
  history: CompactRoundResult[];   // Ring buffer, max 100 entries
}
```

### B. CLI Rendering Pipeline
For Peak-style responsiveness in a terminal:

*   **Double Buffering:** Maintain a virtual screen buffer. Diff against previous frame. Only write changed cells. Prevents flicker during rapid updates (Focus games).
*   **Layout Engine:** Define regions (header, game area, footer, feedback bar). Games render to their region only. Enables consistent UX across 40+ games.
*   **Input Multiplexing:** Support simultaneous listeners. Global hotkeys (ESC=pause, Q=quit) overlay game-specific inputs. Use raw mode with proper cleanup on exit.
*   **Unicode Fallback Chain:** Define primary (box-drawing), secondary (ASCII), and emoji representations. Detect terminal capabilities at startup.

### C. Scoring & Brain Score System
Peak aggregates scores across categories. Replicate this:

*   **Normalization:** Each game outputs a raw score. Convert to z-score using population baselines (stored locally or fetched).
*   **Category Aggregation:** Weighted average of z-scores per category.
*   **Composite Brain Score:** Weighted sum of category scores.
*   **Decay Model:** Scores decay over time without practice. Implement exponential decay in the scoring service. Run decay calculation on session start.

### D. Persistence Layer
Use **SQLite** (via better-sqlite3 or libsql) over JSON files:
*   Structured queries for analytics ("Show me my Focus trend over 30 days").
*   Atomic writes for session data (prevent corruption on Ctrl+C).
*   Schema migrations for evolving game configs.
*   Tables: `users`, `sessions`, `rounds`, `calibrations`, `achievements`.

## 4. Integration with Existing CLI Architecture

Since you have a working CLI base, follow this migration path:

1.  **Audit Current Loop:** Map your existing game loop to the `IGamePlugin` interface. Identify gaps.
2.  **Extract Renderer:** Wrap current output logic behind `IRenderer`. Add double-buffering if missing.
3.  **Implement Adaptive Engine First:** Build this as a standalone module with unit tests. Use synthetic data to validate staircase behavior before integrating any game.
4.  **Create Game Template:** Build `_template/` with full interface compliance, placeholder rendering, and mock adaptive feedback. Validate it loads as a plugin.
5.  **Port One Canonical Game:** Choose a simple Memory game. Port end-to-end. Use this to validate the full pipeline: input → state → render → evaluate → adapt → persist.
6.  **Build Analytics Dashboard:** Create a CLI subcommand (`peak stats`) that reads SQLite and renders ASCII charts. This validates your persistence schema.
7.  **Iterate on Remaining Games:** Now each new game is just implementing `IGamePlugin` + configuring adaptive strategy. No core changes needed.

## 5. Critical Non-Functional Requirements for CLI Brain Training

*   **Sub-16ms Frame Budget:** Focus games require perceived instant feedback. Profile your render pipeline. Avoid garbage collection spikes during gameplay (pre-allocate buffers, reuse objects).
*   **Graceful Degradation:** Handle terminal resize mid-game. Pause, reflow layout, resume. Handle unsupported Unicode. Handle non-TTY environments (pipe output to log instead).
*   **Accessibility:** Screen reader compatibility via semantic output ordering. Colorblind-safe palettes (never rely solely on color). Configurable input delays for motor accessibility.
*   **Data Privacy:** All data local by default. Explicit opt-in for any cloud sync. Encrypt calibration data at rest if storing sensitive cognitive metrics.
*   **Testing Strategy:**
    *   Unit: Adaptive algorithms with deterministic seeds.
    *   Integration: Game plugins with mocked renderer/input.
    *   E2E: PTY automation (e.g., `node-pty`) simulating real terminal sessions.
    *   Visual Regression: Snapshot ANSI output sequences.

## 6. Recommended TypeScript Ecosystem

*   **Terminal Framework:** `@opentui/core` or `ink` (React-like) for complex layouts; raw `node:readline` + ANSI for maximum performance in focus games.
*   **CLI Arg Parsing:** `citty` or `commander` for subcommands (`play`, `stats`, `config`).
*   **Database:** `better-sqlite3` (sync, fast, perfect for CLI).
*   **Testing:** `vitest` + `@vitest/ui` for adaptive algorithm visualization.
*   **Config:** `zod` for runtime validation of game configs and save files.
*   **Charts:** `asciichart` or custom ASCII renderer for stats dashboard.

This architecture gives you a scalable, testable foundation that faithfully reproduces Peak's cognitive training value while respecting the unique constraints and advantages of the CLI medium. The key insight is treating adaptive difficulty as a first-class subsystem, not an afterthought buried in game logic.
