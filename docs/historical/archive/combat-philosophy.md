# combat/00 — Combat Philosophy

## 1. Purpose

Specify the *design intent* of Mysterium's combat layer — what every fight
must be doing, what every fight must not do, and the design contract
that subsequent (engineering-level) combat documents must satisfy.

The slogan:

> Every gameplay verb is the gamification of a validated developmental
> assessment. Every encounter probes a `(line × stage × quadrant)`
> coordinate. Combat is the *language* in which the game asks "where
> are you developmentally, right now?"

If a combat encounter cannot be located in `(line × stage × quadrant)`
space, it does not belong in Mysterium.

## 2. Scientific basis

The combat philosophy stands on the joint argument from:

- `foundations/07-neuroscience-of-development.md` — every micro-task
  has a network claim it must respect.
- `foundations/08-psychophysics-and-staircase.md` — the staircase IS
  the difficulty curve; "Easy / Normal / Hard" is forbidden.
- `foundations/09-flow-and-engagement-theory.md` — the flow channel
  is the felt-experience target; the staircase is the engineering
  target; both must be honoured.
- `foundations/03-lines-of-intelligence-overview.md` — every verb is
  tagged to a line; every encounter to a `(line × stage)` cell.
- `lines/01-…08-…` — the verbs and their cognitive task vehicles.

Mysterium's combat is **Active Time Battle (ATB)** rather than pure
real-time, deliberately. Pure real-time rewards twitch over thought; pure
turn-based eliminates the felt-pressure that activates the right networks.
ATB is the engineered compromise: each Battler has a hidden gauge
that fills in real time; when full, they enter an *action phase* during
which the game *injects a cognitive micro-task* whose outcome resolves
the action. The world keeps moving between actions; the cognitive
demand happens on a turn.

## 3. The seven combat principles

### 3.1 Every verb is a gamified assessment

A "spell" is not a fireball — it is an n-back run that *manifests as*
a fireball. A "parry" is not reflex — it is a Stroop trial that
*manifests as* a parry. Cosmetic flair is welcome; the cognitive
content is non-negotiable.

### 3.2 Every encounter has a coordinate

Every encounter ships with `(lines: Line[], stage: Stage, quadrants:
Quadrant[], role: 'side'|'mini'|'main'|'shadow')`. An encounter without
a coordinate does not pass review.

### 3.3 The ATB engine is the heartbeat

Real-time pressure provides the felt-edge that activates the relevant
networks. The pause-on-action moment provides the cognitive
deliberation space. The two must coexist; neither alone suffices.

### 3.4 The staircase is invisible

Players never see a difficulty number. The staircase adjusts; the
encounter feels *like a fight*, not *like a test*. The DDA is the
engineering substrate; the felt experience is *combat*.

### 3.5 Defensive and offensive verbs trade quadrants

- *Offensive* verbs typically live in **UR** (the act of doing).
- *Defensive* verbs (parry, block, dodge, witness-pause) live in
  **UR** with a strong **UL** component (the act of attending).
- *Coordinative* verbs (rally, support, co-parry) live in **LL**.
- *Tactical / system* verbs (terrain use, resource management) live
  in **LR**.

A fight that uses only one quadrant of verbs is *not* an integral
encounter. Synthesis-exam main bosses must touch all four.

### 3.6 Multi-line encounters carry a synergy bonus

When an encounter probes two lines together (typical mini-boss
pattern), passing both with high quality awards a *synergy bonus* on
top of single-line credit. This rewards integration without forcing
it.

### 3.7 The combat round has a cadence

The encounter pacing target (from `foundations/09`):

- **Warm-up** (10–15 s) — re-enter the world, no DDA pressure.
- **Edge** (60–120 s) — the staircase active; cognitive load high.
- **Resolution** (10–20 s) — outcome telegraphed clearly; reward
  read-time before the next encounter.

Within a single combat encounter:

- **First action phase** at ≤ 15 s after engagement — players cannot
  wait for the right moment without acting.
- **Cognitive overlay** appears within 100 ms of action-phase start
  — no perceptible lag.
- **Overlay lifetime** typically 2–8 s — a Stroop trial is short, an
  n-back charge is longer; both should *feel* like part of the fight.
- **Outcome read-time** ≥ 1 s before the consequence lands — the
  player must *see what is happening* before it hits them.

## 4. The combat-layer contract (architectural intent)

The detailed engineering specification (event flow, scene composition,
overlay UI, network sync) is left to implementation. The contract that
implementation must satisfy:

1. **The cognitive evaluation core is pure of any rendering / network
   library.** The staircase, the n-back generator, the Stroop scorer
   — all live in `core/usecases/`. They run from a CLI test, a
   Vitest suite, or a future engine swap with zero changes.
2. **The combat scene reads from the core; never the reverse.** Phaser
   never knows whether a cognitive task succeeded; it asks the core
   and renders the answer.
3. **Encounters are *data*, not *code*.** A new encounter is a JSON /
   TS-data row specifying `(lines, stage, quadrants, role, taskBinds,
   narrative)`. Adding an encounter is a content change.
4. **Multiplayer combat is server-authoritative for cognitive
   evaluation.** A client never decides "the player passed the
   n-back." The fixed-tick evaluator on the server does, against a
   universal clock, so reaction-time validity is preserved.
5. **Telemetry is encrypted at rest and never sold.** Cognitive data
   is sensitive; the privacy contract is in `validation/02` (deferred
   to implementation).

## 5. The forbidden patterns

Combat patterns that Mysterium **will not** ship:

- **Random number generators determining cognitive outcomes.** RNG
  drives cosmetic / loot; never cognitive.
- **Variable-ratio rewards on cognitive performance.** Slot-machine
  patterns are off-limits, full stop. (`foundations/09 §2.4`)
- **Pay-to-win on cognitive load.** No microtransaction lowers a
  cognitive task's difficulty.
- **Twitch-only encounters.** A fight that rewards only reaction-time
  with no cognitive content fails the "every verb is an assessment"
  test.
- **Encounters longer than 4 minutes** without a checkpoint. Sustained
  flow has a half-life; respect it.
- **Punitive cognitive failure.** A missed n-back lowers damage; it
  does not insta-kill or remove progression. Failure is *information*,
  not *catastrophe*.

## 6. The downstream documents (deferred)

The following combat documents were planned in `REQUIREMENTS.md` but
are explicitly deferred to the implementation phase per user
direction. The *intent* for each is captured here as a single line so
that future authoring stays anchored:

| Deferred doc | One-line intent |
|---|---|
| `combat/01-atb-engine.md` | Specify ATB fill-rate maths, turn-stack semantics, pause/resume behaviour. Already partly captured in existing `src/core/usecases/ATBEngine.ts`. |
| `combat/02-cognitive-task-library.md` | Catalogue every micro-task with its parameters, scoring function, and stage-band difficulty envelope. Critical content asset; large. |
| `combat/03-skill-tree-architecture.md` | The skill tree as data — the `(line × stage)` matrix generator. |
| `combat/04-damage-and-resistance-model.md` | The maths translating cognitive performance to combat outcome. |
| `combat/05-stance-and-state-shifting.md` | Stance / state mid-fight; WCST as the core mechanic. |
| `combat/06-multiplayer-combat.md` | Colyseus schema, fixed tickrate, anti-cheat. |

These can be authored by AI agents during implementation, using this
philosophy doc as the contract. Any deferred-doc decision that
conflicts with this philosophy is a bug.

## 7. Open questions

- **Single-task vs. dual-task default.** Should the default encounter
  be single-line or dual-line? Single-line is cleaner for assessment;
  dual-line is more game-like. Default: single-line for side-characters,
  dual-line for mini-bosses. Settled.
- **Visibility of cognitive scoring.** Players want feedback; honesty
  values transparency; immersion suffers from numerical exposure.
  Default: a *qualitative* feedback band ("clean," "tight," "loose,"
  "fumbled") rather than a percentage. Numbers visible only in the
  per-stage debrief.
- **Failure recovery.** A player who fails three encounters in a row
  needs the anxiety backstop from `foundations/09 §3.3`. The exact
  mechanism (mentor NPC, practice mode, regression option) is per
  encounter and per stage.

## 8. Principles served

Principles **1, 2, 3, 5, 6, 7** — the combat layer is where most of
the seven principles are *operationalised* into felt experience.
