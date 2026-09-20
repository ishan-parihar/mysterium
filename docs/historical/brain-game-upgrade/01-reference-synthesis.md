# 01 — Reference Synthesis

> What the four brain-training platform analyses in `docs/references/` converge on when read as a set. Sources: `lumosity.md`, `peak.md`, `elevate.md`, `neuronation.md`. Each was written against a hypothetical "working CLI game shell"; this synthesis extracts only what survives contact with Mysterium's actual codebase (see 00-current-state-audit.md).

---

## 1. The four platforms at a glance

| Source | Library size | Domain taxonomy | Distinctive emphasis |
|---|---|---|---|
| **Lumosity** | 50+ games | Memory, Attention, Problem Solving, Speed, Language | LPI normalized index; onboarding baseline calibration; insight dashboards |
| **Peak** | 40+ games | Memory, Focus, Problem Solving, Language, Math, Emotional Intelligence | Plugin game architecture (`IGamePlugin`); Brain Score aggregation; short-burst pacing (2–3 min) |
| **Elevate** | 40+ games | Writing, Speaking, Math, Reading, Memory (5 archetypes) | SRS-driven workout selection; proficiency decay curves; error-pattern analytics |
| **NeuroNation** | ~30 games (6 domains) | Working Memory, Attention, Processing Speed, Logic, Language, Math | Paradigm-first (not game-first); event-sourced trial data; scientific citation per paradigm |

## 2. Seven convergent requirements

All four documents independently demand the same seven subsystems. Convergence across independent analyses is strong evidence these are the load-bearing features of the genre — not vendor idiosyncrasies.

### R1. Adaptive difficulty engine as a first-class subsystem ★ unanimous

Every document names real-time difficulty adaptation as *the* differentiator between a toy and a trainer ("without it, a CLI brain trainer has no therapeutic value" — neuronation.md). Convergent design:

- **Strategy pattern** of algorithms: classic staircase → weighted up-down → composite accuracy+RT → Bayesian/KBT/Elo for production grade.
- Algorithms manipulate each paradigm's **own parameter space** (grid size, ISI duration, distractor count, operand range) rather than an abstract "level" (neuronation.md).
- Per-game calibration state persisted independently of game logic; mid-session crash recovery.
- Anti-frustration guardrails: forced ease after N consecutive failures; ceiling/boredom detection.
- Validation via synthetic-user simulation before live use.

Mysterium already owns the theory: `docs/foundations/08-psychophysics-and-staircase.md` specifies staircase/PEST psychophysics. The implementation gap is total.

### R2. Session/workout orchestration beyond free-play

- Curated daily workouts of 3–5 games balancing domain coverage and avoiding recent repetition (lumosity, elevate, neuronation).
- SRS-flavored selection: prioritize skills whose proficiency is decaying (elevate).
- Warm-up/calibration trials before scored performance; fatigue monitoring with suggested breaks or lower-intensity swaps (neuronation).
- Interruption resilience: serializable session state across terminal sessions (neuronation).
- Short bursts: 2–3 minutes per game (peak).

### R3. Normalized cross-game scoring index

- Raw scores (ms, %, counts) normalized into a comparable index (0–100 or z-score/percentile) via lookup tables or sigmoid functions anchored to baselines (lumosity, peak, neuronation).
- Composite aggregation: per-domain z-scores → weighted category score → overall Brain Score / LPI.
- **Decay model**: scores decay without practice; recomputed on session start (peak, elevate).
- Longitudinal trend detection (rolling regression over trailing sessions — neuronation).

### R4. Event-sourced trial-level data

- Every stimulus/response/RT/correctness stored as an immutable typed event (neuronation): `TrialCompleted { paradigmId, difficultyParams, accuracy, latencyMs }`.
- Granular schema with deterministic stimulus hashes for reproducibility (lumosity).
- Purpose: future algorithm refinement, error-pattern analysis (`{type:'synonym', chosen:'brief'}` tagging — elevate), percentile benchmarks.
- Storage: SQLite is recommended by all four — see §4 below for why that recommendation does not transfer.

### R5. Paradigm-first plugin contract

- Games are instances of cognitive paradigms behind a strict interface (all four, in varying vocabulary): metadata + initialize/generateStimulus/evaluateResponse/getNextState/isComplete.
- Stimulus generators return **presentation descriptors**, never rendered output — rendering belongs to the adapter layer (neuronation). Immutable state per trial enables replay/debugging.
- Latency is passed into evaluation because speed paradigms weight RT while memory paradigms ignore it (neuronation).
- New games must require zero core changes (peak's `_template/` pattern).

### R6. CLI-specific execution concerns

- **Timing precision:** `process.hrtime.bigint()` never `Date.now()`; measure and subtract terminal render/input latency during calibration; publish ±15ms tolerance bands (lumosity); consider worker threads for timing-critical loops (neuronation).
- Input handling: single-keypress raw mode for reaction tasks vs buffered line input for language; debounce + latency measurement (lumosity).
- Rendering: presentation descriptors → ANSI grids/RSVP streams/progress bars; region-based layout to prevent flicker; Unicode fallback chains (peak).
- Accessibility: colorblind-safe symbol alternatives for every color-dependent task; configurable stimulus durations; non-timed practice modes before scored sessions (all four).
- Graceful degradation: terminal resize, non-TTY environments (pipe to log), tmux compatibility.

### R7. Meta-layer: feedback, streaks, motivation

Post-session analytics with trend charts; streaks/XP/badges persisted; immediate post-trial micro-feedback that doesn't disturb trial timing; motivational framing. (All four.)

## 3. Where the references are weak or contradictory

| Topic | Divergence | Resolution adopted by this plan |
|---|---|---|
| **Storage** | All four say SQLite/better-sqlite3 | Rejected as default. Mysterium has an established encrypted KV abstraction, local-first privacy posture (E2E-encrypted saves, server stores opaque blobs), and no multi-table query need at current scale. Trial store rides the existing `KeyValueStore` port. Revisit only if longitudinal queries outgrow JSON indexes. |
| **Diagnostic display** | Lumosity/Peak center percentile ranks & leaderboards | Conflicts with canon: Veil principle (AGENTS.md §5.4) — the game is NEVER diagnostic to the user. Metrics exist internally; player-facing surfaces render felt-sense progression (precedent: `cciToFeltSense`). |
| **Domain taxonomy** | Five different taxonomies across four docs | Not adopted. Mysterium's 8 lines × 8 stages grid is the canonical taxonomy; reference domains map onto it (see §4 mapping table in 02-gap-analysis.md). |
| **Emotional/social training** | Only Peak touches EQ; none do moral/somatic/spiritual | Mysterium is ahead: its paradigms already cover emotional identification, moral dilemmas, somatic rhythm, cooperation. The references undershoot our scope — we adopt their *machinery*, not their *content boundaries*. |
| **Narrative** | None of the four wrap games in narrative/agent context | Mysterium's differentiator. The references treat games as naked stimuli; our agent frames every game inside the encounter fiction. This plan keeps narrative framing and adds game execution beneath it. |

## 4. Net assessment

The references describe, in aggregate, a **cognitive training kernel**: adaptive engine (R1), workout orchestrator (R2), normalized index with decay (R3), trial event store (R4), paradigm contract (R5), precise CLI I/O (R6), motivation loop (R7).

Mysterium already has: the architectural shell (hexagonal), a superior taxonomy, session orchestration machinery, SRS/analytics components awaiting re-targeting, encrypted persistence, and an agentic narrative layer none of them have.

The genuine gaps are precisely: **R1, R2-retargeting, R3, R4, R5-formalization, R6, and the wiring of all of it into the agent's tool surface.** Gap-by-gap treatment follows in [02-gap-analysis.md](02-gap-analysis.md).
