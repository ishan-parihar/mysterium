# foundations/04 — States of Consciousness

## 1. Purpose

Specify the *state* axis of AQAL — the temporary, accessible conditions
of consciousness — and distinguish it sharply from *stage*. Mysterium's
optional state-training mini-game (in `docs/foundations/04-states-of-consciousness.md`) lives here.

The slogan: **stages are slow vertical growth; states are fast horizontal
access.** A player at Amber stage can have a Non-Dual peak experience.
Conversely, a Teal-stage player who has never meditated may have
poor access to subtle states. Stage and state are independent axes.

## 2. Scientific basis

### 2.1 The five states

Drawn from the contemplative traditions (Vedanta, Vajrayana, Sufi,
mystical Christianity, Wilber's synthesis):

| State | Slug | Subtle body | Phenomenological description |
|---|---|---|---|
| **Gross** | `Gross` | Physical | Ordinary waking awareness; sense data; bodily presence. |
| **Subtle** | `Subtle` | Energy / dream | Inner imagery, archetypes, dream space, emotion-as-luminosity. |
| **Causal** | `Causal` | Formless | Contentless awareness, deep sleep, "I-am" prior to qualities. |
| **Witness** | `Witness` | Pure observer | The seer of all three above; not identified with any. |
| **Non-Dual** | `NonDual` | Unity | The witness collapses into what is witnessed; subject-object distinction transcended. |

### 2.2 State stages

Wilber distinguishes:

- **State experience** — temporary, peak, episodic.
- **State stage** — stable trait-level access, the result of practice.

Both are *fast* on the developmental clock relative to stages, but state
*stages* take serious meditative practice to install. A weekend retreat
can produce state experiences; a 10-year practice tradition produces
state stages.

### 2.3 The state-stage interaction

Wilber's empirical observation (Wilber 2006): **stage colours how a
state is interpreted.** A Non-Dual peak experience interpreted at:

- **Magenta** — "I saw God! Magic is real!"
- **Amber** — "I had a vision granted by my tradition's deity."
- **Orange** — "Interesting altered state, probably temporal-lobe."
- **Green** — "All paths lead to the same truth."
- **Teal** — "The non-dual is a feature of consciousness as such."

The same state, eight different interpretive frames. Mysterium's narrative
honours this: a state-experience cutscene is *interpreted* by the
player's current stage's NPC commentary.

## 3. Game-design mapping

### 3.1 State as accessibility, not progression

States are **not** a parallel XP bar. They are a *practice mini-game*
that increases:

- **Access frequency** — how often the player can summon a non-default
  state during combat (e.g., entering a Witness stance to slow time
  perceptually before a dilemma).
- **Access depth** — how cleanly the state holds under stress (cognitive
  load reduces state access; willpower stabilises it).

State access becomes a *resource* for hard encounters, not a gate.

### 3.2 The state mini-game

A breath-paced meditation interlude between encounters:

- **Gross** practice — body-scan rhythm task; trains proprioceptive
  baseline. Always available.
- **Subtle** practice — image-recall and affect-recognition under
  reduced sensory input. Unlocks at Magenta stage onward.
- **Causal** practice — "do nothing" game with contentless-awareness
  scoring (paradoxically, *not* trying is the success condition).
  Unlocks at Orange stage onward, when the player has the cognitive
  metacognition to register doing-nothing as a doing.
- **Witness** practice — a meta-task where the player observes their own
  performance on a previous fight in replay and answers questions about
  it. Unlocks at Green stage onward.
- **Non-Dual** practice — appears only as fleeting, gift-like cutscenes
  triggered by integration milestones. Cannot be ground / farmed.

### 3.3 In-assessment state expressions

State access translates to assessment options:

| State | In-assessment expression |
|---|---|
| Gross | Default; full sensory awareness; standard assessment module execution. |
| Subtle | Read encounter's emotional aura more clearly; better empathy / mood reads; enhanced intuitive assessment responses. |
| Causal | Emergency "still point" -- pause time, single free action; high cooldown; cannot be used in synthesis assessments. |
| Witness | Slow time during a dilemma; gain extra read of encounter intention; vulnerable to Stroop interference if breaks. |
| Non-Dual | Scripted moments only; full engagement, no cognitive penalties; lasts seconds. |

### 3.4 Why this matters

Without states, Mysterium is a game about *capacity*. With states, it is
also a game about *access* — and therefore about practice, about
discipline, about what one *does* between fights. The state mini-game
represents the contemplative half of human development that
cognitive-training apps systematically ignore.

It is also the surest way to tell the player "the game world is bigger
than the game." A 30-second daily breath practice that rewards in-game
state access is a friendly bridge from screen to life.

## 4. Architectural contract

```
type State = 'Gross' | 'Subtle' | 'Causal' | 'Witness' | 'NonDual';

interface StateProfile {
  unlocked:        Record<State, boolean>;
  accessFrequency: Record<State, number>;   // 0..1 — practiced uses per session
  accessDepth:     Record<State, number>;   // 0..1 — stability under cognitive load
  totalMinutesPracticed: Record<State, number>;
}

type Significator['states'] = StateProfile;
```

The state mini-game is a `core/usecases/StatePractice.ts` use-case (to
be written), pure of any Phaser dependency. The state effects on
assessments are applied in the assessment execution pipelines as
multipliers / option unlocks.

## 5. Open questions

- **MVP inclusion.** State training is a stretch goal. Including it
  doubles the design surface. Decision in `roadmap/01`.
- **Real-life practice integration.** Should the game prompt the player
  to do a 1-minute breath practice off-screen? Strong contemplative
  argument in favour; UX risk of the game becoming preachy. Default:
  optional and opt-in.
- **Non-Dual as a designed reward.** Designing a representation of
  non-dual experience risks trivialising it. The current decision is to
  represent it *minimally* — a quiet visual collapse and silence — and
  let the player project meaning. Open to revision.

## 6. Principles served

Principles **1, 4** — broadens the "what" beyond stages-and-lines, and
deepens the "earned" by including practice as a non-grindable axis.
