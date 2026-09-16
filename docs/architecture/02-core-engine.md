# Core Engine Architecture

> **Cross-references:** [[docs/foundations/20-veil-of-forgetting|20 — Veil Of Forgetting]] · [[docs/foundations/24-encounter-scheduler|24 — Encounter Scheduler]] · [[docs/foundations/25-cumulative-consciousness-index|25 — Cumulative Consciousness Index]]
## 1. Purpose

Describes the 10+ core engines in `src/core/engines/` and how they wire into the game loop. The core engine layer is the "brain" of Mysterium — it processes encounters, updates developmental state, and drives the player's evolutionary trajectory.

## 2. Scientific basis

- **Significator** — Foundations/16: the player as persistent soul-pattern; the sole state vessel
- **CCI** — Foundations/25: Cumulative Consciousness Index as composite developmental metric
- **Theta Decay** — Foundations/24: exponential decay of engagement with neglected stages
- **Transformation Detection** — Foundations/17: frame-change at stage thresholds

## 3. Game-design mapping

### Significator (sole state vessel)

The Significator replaces the legacy PlayerProfile. It stores:
- `altitudes: Record<Line, Stage>` — per-line developmental stage
- `shadowLedger: ShadowEntry[]` — detected shadow patterns with quadrant, drive, intensity
- `driveBalance: Record<Drive, number>` — Agency, Communion, Eros, Agape scores
- `transformationPhase: TransformationPhase` — idle → threshold → unravelling → crucible → emergence → complete
- `theta: ThetaTimestamps` — last engagement time per line×stage cell
- `polarityTraces: PolarityTrace[]` — per-encounter polarity signals
- `recentEncounters: EncounterRecord[]` — last N encounters for context

### CCI (Cumulative Consciousness Index)

Five-dimension composite metric:
1. **Altitude breadth** — how many stages are active across all lines
2. **Altitude depth** — the highest stage reached on any line
3. **Line balance** — how evenly developed the 8 lines are
4. **Shadow integration** — how many shadows have been resolved vs detected
5. **Polarity crystallization** — STO/STS coherence

Updated at session end and displayed qualitatively (via Veil of Forgetting).

### Theta Decay

Exponential decay with 7-day half-life. When a line×stage cell hasn't been engaged:
- Priority boost in the encounter scheduler (bleed-through)
- Holonic return trigger (player pulled back to maintain neglected stages)
- Shadow activation (neglected stages surface shadows)

### Auto-Mode Strategy

9 thematic strategies for encounter selection:
1. Balanced development
2. Horizon focus (weakest line)
3. Shadow confrontation
4. Deepening (same line, higher stage)
5. Lateral exploration (different line, same stage)
6. Transformation readiness
7. Curriculum progression
8. Safety override (high-fixation players)
9. Post-transformation bias

### Encounter Scheduler

7-criteria priority formula:
```
priorityScore = thetaDecay * 0.25 + shadowActivation * 0.20 + polarityAlignment * 0.15 + transformation * 0.15 + driveBalance * 0.10 + narrative * 0.10 + sessionFit * 0.05
```

Selects the next encounter from 64 eligible modules based on the player's developmental state.

## 4. Architectural contract

- All engines are in `src/core/engines/` — no external dependencies
- All engines are wired into `src/core/GameLoop.ts` (the session engine driving assessment-module execution)
- State mutations flow through ConsequenceEngine → Significator
- No engine reads from or writes to the rendering layer

## 5. Open questions

- **Transformation crucible encounter generation** — currently session-count-based, not condition-based
- **Compound shadow creation** — compoundPartner field always null
- **Shadow severity aging** — no time-based decay or outcome-based updates

## 6. Principles served

Principles **1, 3, 4, 7** — training clarity, growth edge, earned progression, codebase honesty.
