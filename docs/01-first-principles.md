# 01 — First Principles

## 1. Purpose

This document is the *spine* of the research phase. It expands the eight first-principles questions from `REQUIREMENTS.md §1` into stand-alone arguments, with citations, counter-examples, and acceptance criteria. Every later document is, in effect, a long-form answer to one of the eight.

When a design decision is made anywhere in Mysterium, it must be possible to walk it back to one of these eight principles. If it cannot, either the decision is wrong or the principle list is incomplete.

### Principle 0 — *What is this actually for?*

**The objective (ratified 2026-09-20, `06 §7.4`): continuing developmental progression across all
dimensions — every line, every stage below the player's centre of gravity — without residual entropy
and without residual shadows.**

This sits *above* the eight principles because it disciplines all of them. Three of its consequences
are load-bearing and each has been violated in earlier designs:

1. **The harvest is a horizon, not a goal.** No mechanic may optimise toward the closure; selection
   (`24`), strategy (`27`) and the composite index (`25`) are all forbidden from using it as a
   target function. `Samsara` is not a failure state.
2. **Regression is maintenance, not loss.** The holon is never outgrown (`AGENTS.md §5.6`): lower
   stages must remain healthy, and theta-decay makes neglect visible. A player's growth at the top is
   *invalid* if their floor is unhealthy — Principle 4 (earned progression) depends on this.
3. **Zero residual entropy is measurable.** "No residual shadows" is not an aspiration here: it is
   the shadow-ledger invariant (`16 §3`, `10`), and lower-stage health is a gate on upper-stage
   unlocks (`25`). If an implementation cannot report floor health, it cannot satisfy Principle 0.

## 2. Scientific basis

The eight principles are not invented — they are the residue of merging six literatures:

| Literature | What it contributes |
|---|---|
| Cognitive-training meta-analyses (Simons et al. 2016, Melby-Lervåg 2016) | The hard truth that *most* brain-training transfer claims are invalid. → Principle 2. |
| Action-video-game cognition research (Bavelier, Green) | The validated finding that action games genuinely improve attention and "learning to learn." → Principle 1. |
| Psychophysical method (Levitt 1971, Cornsweet 1962) | The transformed up-down staircase as the only known way to keep a participant at threshold. → Principle 3. |
| Integral developmental psychology (Wilber, Cook-Greuter, Kegan) | The discovery that lines develop at *different* altitudes within the same person — i.e., progression is *not* a single bar. → Principle 4. |
| Meta-learning science (Bjork, Brown, Roediger) | Spaced repetition, desirable difficulties, depth-of-processing — the curriculum system's scientific foundation. → Principle 8. |
| Software architecture canon (Martin 2017, Evans 2003) | Clean architecture, DDD, the testability of pure use-cases. → Principle 7. |

Principles 5 (UX) and 6 (honesty/integrity) are emergent from the intersection — they are the constraints that prevent the science from being discarded by the player or weaponised against them.

## 3. Game-design mapping

### Principle 1 — *What is the game actually training?*

The game must, at all times, be able to answer "right now, this encounter — which line, which stage, which modality?" If the answer is *unspecified*, the encounter is illegal.

**Acceptance criterion:** every module in the 64-module registry carries an explicit `(line, stage, modality)` triple. Any module without one fails review.

### Principle 2 — *How do we know it is training that thing?*

For every cognitive task in the assessment module system, we cite its laboratory analogue, name its established psychometric properties, and specify the in-game parameter band that preserves the construct.

**Acceptance criterion:** the curriculum architecture audit specifies a correlation study design between in-game performance and the laboratory analogue with `r ≥ 0.5` as the bar.

### Principle 3 — *Growth edge without breaking immersion*

The 1-up/2-down staircase converges to 70.7% accuracy. Encounters must keep the player there *without* surfacing the algorithm. The player should feel *challenged*, not *measured*.

**Acceptance criterion:** in playtesting, when asked "did the game feel like it was adjusting difficulty," ≤ 30% of players say yes.

### Principle 4 — *Stage progression must be earned*

A player at apparent Orange (Rational) on the cognitive line but stuck at Red (Power) on the moral line is *not* an Orange player. Stage advancement requires demonstration across **all eight lines** at the relevant altitude.

**Acceptance criterion:** a synthetic player profile with 8/8 cognitive mastery but 1/8 moral or 1/8 interpersonal mastery is *blocked* from advancing by the gate logic.

### Principle 5 — *Multi-line, multi-quadrant on a phone*

The challenge: a phone viewport. The eight-line × eight-stage matrix is 64 cells. We cannot show 64 cells at once.

The chosen solution: *radial altitude chart* — eight spokes (lines), graduated rings (stages). The current "horizon" line shows the lowest line — the developmental bottleneck.

**Acceptance criterion:** new players can identify their weakest line within 10 seconds of viewing the chart.

### Principle 6 — *Honest simulation*

In a single-player context, *the game should still not lie to itself.* If the player exploits a glitch to bypass a cognitive task, the gate must not record a pass.

**Acceptance criterion:** automated adversarial testing of the client→server boundary; any client-spoofed cognitive result is rejected and logged.

### Principle 7 — *Honest codebase*

The `core/` directory imports from no game engine, no native bridge, no networking library. It is portable to any future runtime.

**Acceptance criterion:** `npm test` passes with `core/` mocked of all I/O. A future engine swap requires only changes to `game/` and `infra/`.

### Principle 8 — *Curriculum as education replacement*

The holonic curriculum system must be self-contained, adaptive, and depth-aware. It must replace formal education across all 8 lines of intelligence, scaling from foundational to transformative depth.

**Acceptance criterion:** a player can complete the curriculum without any external educational resource, and the system adapts to their forgetting curve and depth level.

## 4. Architectural contract

These principles compile down to five hard rules at the architectural layer:

1. **Every domain entity has a `(stage, line)` location** or is decorated by one of those at use-time. (Principle 1)
2. **Every cognitive use-case ships with a property-based test demonstrating construct validity.** (Principle 2)
3. **DDA state lives in `core/usecases/`, never in `game/scenes/`.** (Principles 3, 7)
4. **Stage-advancement is a pure function of the player profile.** Any UI that shows progress reads from this function; no UI ever sets stage directly. (Principles 4, 6, 7)
5. **The curriculum system is data-driven.** Adding a new concept, a new depth level, a new learning pathway must be a JSON/TS-data change, not a code change. (Principle 8)

## 5. Open questions

- **Are the eight principles complete?** A reasonable challenge is "where is *fun*?" Fun is implicit in Principles 3 and 5, but the literature on flow distinguishes *enjoyment* from *engagement*. Should we promote fun to Principle 9?
- **Trade-offs between principles.** Principle 6 (honesty) and Principle 5 (UX) frequently conflict — e.g., showing the staircase is honest but immersion-breaking. Each conflict needs a documented adjudication.
- **Falsifiability of Principle 2.** What would convince us the game is *not* training what it claims? The curriculum architecture audit must operationalise this.

## 6. Principles served

This document serves principles **1, 2, 3, 4, 5, 6, 7, 8** — it *is* the articulation of the eight.
