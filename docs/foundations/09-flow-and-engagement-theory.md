# foundations/09 — Flow and Engagement Theory

## 1. Purpose

Establish *why* the staircase converges to ~70%. The mathematics gives
the *what*; flow and engagement theory give the *why*. This document is
the bridge between psychophysics (engineering) and motivation (felt
experience). It is also the answer to the implicit question "why
gamify?" — the wrap of cognitive science in an action-RPG is not
decoration; it is the load-bearing motivational substrate.

## 2. Scientific basis

### 2.1 Flow (Csikszentmihalyi)

Csikszentmihalyi (1990, *Flow*) identifies eight conditions for flow:

1. Clear goals
2. Immediate, unambiguous feedback
3. **Challenge-skill balance** at the perceived edge
4. Action and awareness merge
5. Concentration without effort (loss of self-consciousness)
6. Sense of personal control
7. Time distortion
8. Autotelic experience (the activity is its own reward)

Of these, **(3) challenge-skill balance** is the one the staircase
directly engineers. The 70.7% threshold is *operationally* the
challenge-skill balance.

The other seven conditions are *engineering targets* for the rest of
the design:

| Flow condition | Mysterium design target |
|---|---|
| Clear goals | The encounter narrator states what this moment asks: answer the dilemma, hold the position, open the gate, keep the promise. |
| Immediate feedback | The consequence lands at once — the NPC's response changes, the world state shifts, the overlay's arc moves. |
| Challenge-skill balance | Staircase. |
| Action-awareness merge | Nothing between intent and response: instant rendering, no stutter, no loading seam. (`docs/system/sub-systems/presentation/rendering-layer.md`) |
| Concentration without effort | UI minimalism; cognitive overlay is *legible at a glance*. (`docs/system/sub-systems/presentation/rendering-layer.md`) |
| Personal control | Line choice, drive choice, modality choice, optional shadow encounters. |
| Time distortion | Pacing — encounters tuned to 90 s–3 min; flow research shows this is the typical sustained-flow envelope before a break is needed. |
| Autotelic experience | The progression must feel meaningful *without* end-state rewards. The radial chart filling IS the reward. |

### 2.2 Self-Determination Theory (SDT)

Deci & Ryan (1985, 2000) — three innate psychological needs:

| Need | Definition | Mysterium mechanism |
|---|---|---|
| **Autonomy** | Sense of self-authorship of one's actions | Drive selection, optional content, no forced "best" build. |
| **Competence** | Sense of growing capability | Staircase + radial chart — visible mastery curve. |
| **Relatedness** | Sense of meaningful connection | NPC arcs, multiplayer co-op, mentor figures. |

Lumosity-style apps satisfy *competence* well, *autonomy* poorly,
*relatedness* almost not at all. The RPG wrap is precisely the device
for satisfying autonomy and relatedness.

### 2.3 Flow channel and difficulty drift

Csikszentmihalyi's flow channel diagram shows two failure modes:

- **Anxiety** — challenge >> skill — the player burns out.
- **Boredom** — skill >> challenge — the player drops off.

Either edge is a churn risk. The staircase keeps the player in the
channel; flow theory adds the warning that *staying static at the
edge* itself becomes anxiety after long sessions. Mysterium must therefore
periodically *give* — easy fights, narrative beats, reflection moments —
to allow the flow channel to widen briefly, even if the staircase's
asymptote is the same.

### 2.4 Reward schedules and dopamine

Variable-ratio reward schedules (Skinner, slot machines, loot boxes)
produce the strongest engagement *but also the strongest pathology*.
Mysterium **does not** use variable-ratio rewards for stage progression —
progression is deterministic on demonstrated skill. Variable rewards
appear *only* in cosmetic loot drops (no gameplay impact) and in
narrative beats (which are scripted, not rolled).

The ethics here is non-negotiable. See `docs/system/sub-systems/safety/ethics-and-data-privacy.md`.

## 3. Game-design mapping

### 3.1 The session-arc

A typical Mysterium session, designed against flow theory:

| Beat | Duration | Purpose |
|---|---|---|
| Warm-up encounter (easy, narrative) | 2 min | Re-orient, friendly feedback |
| Skill-edge encounter (staircase active) | 3–5 min | Flow channel |
| Reflection (radial chart update, codex) | 1 min | Consolidation, autonomy |
| Skill-edge encounter | 3–5 min | Flow channel |
| Choice / dilemma | 1–2 min | Autonomy, narrative |
| Optional skill-edge or shadow | up to 10 min | Player-driven |
| End-session ritual (save, XP recap) | 30 s | Closure, anticipation |

Total: 15–25 minutes minimum, 45 minutes typical. Mysterium is **not**
designed for 4-hour binges. The design is **5–6 sessions per week, 30
minutes each** — closer to a meditation app's cadence than a typical RPG.

### 3.2 The boredom backstop

If the staircase has held a player at the same level for ≥ 5 sessions
without movement (suggesting capacity has plateaued), the game *adds
context complexity* — narrative stakes, environmental hazard, dual-task
challenges — without changing the staircase level itself. This widens
the flow channel sideways.

### 3.3 The anxiety backstop

If a player fails 3 sessions in a row at a single boss / gate, the game
offers (does not impose):

- A side-quest at lower altitude (regression as integration, not as
  punishment)
- A practice mode (no progression, just drilling)
- A mentor NPC who walks the player through the encounter mechanically

The anxiety backstop is *the* most important UX humility move. Failing
should never become humiliating.

## 4. Architectural contract

Flow theory gives engineering targets, not data structures. The
contract is therefore *non-functional*:

| Target | Measure | Acceptance |
|---|---|---|
| Frame-rate | fps median across a 5-min combat session on a Pixel 5a | ≥ 58 |
| Input-to-feedback latency | Time from tap to first visual / audio response | ≤ 50 ms |
| Encounter pacing | Median encounter duration | 90 s – 3 min |
| Session duration default | Recommended in onboarding | 30 min |
| Staircase plateau detection | Sessions at same level before context-added | 5 |
| Failure cluster detection | Failures at same gate before mentor offered | 3 |

These are NFRs; the perception-side targets live in
`docs/system/sub-systems/presentation/rendering-layer.md`, the pacing and measurement side in
`docs/system/sub-systems/validation/benchmark-architecture.md`.

## 5. Open questions

- **Cross-cultural flow.** Csikszentmihalyi's flow research is largely
  Western. Cross-cultural data is sparser. Whether the 70.7% is
  universal or culture-conditioned is debated. Mysterium defaults to 70.7%
  but allows per-locale tuning data in `docs/foundations/12-drive-assessment-mechanics.md`.
- **Flow vs. attainment.** Flow is hedonic; stage advancement is
  developmental. They coincide most of the time, but a serious
  Teal practitioner might prefer slow contemplation over a
  fast-pace flow channel. The state-training mini-game
  (`docs/foundations/04-states-of-consciousness.md`) is the safety valve.
- **Loot and ethics.** Even cosmetic variable-ratio rewards can be
  habit-forming. A simpler decision is "all rewards are deterministic on
  performance, with optional preference choice." Tracked in `docs/system/sub-systems/safety/ethics-and-data-privacy.md`.

## 6. Principles served

Principles **3** (growth edge), **5** (UX), **6** (honest engagement —
no exploitation patterns).
