# progression/00 — Progression Overview

> **Cross-references:** [[docs/foundations/24-encounter-scheduler|24 — Encounter Scheduler]]

## 1. Purpose

Specify how the player *grows* in Mysterium — the long-loop architecture
that turns individual encounters into a developmental arc. Detailed
algorithms (staircase tuning, threshold values, regression triggers)
are deferred to implementation; this document is the *philosophy*.

The slogan:

> Progression is what you have *demonstrated*, not what you have
> *unlocked*. There is no XP-to-stage. There is only practice and
> demonstration, recorded honestly.

## 2. The five progression timescales

Mysterium's progression operates at five interlocking timescales:

| Timescale | Loop | What changes |
|---|---|---|
| **Per-trial** (≈ 2–8 s) | Single cognitive micro-task | Staircase level on one task per line |
| **Per-encounter** (≈ 90 s – 4 min) | Single fight | Multiple staircases update; encounter-level reward; narrative beat |
| **Per-session** (≈ 30 min) | Play session | Per-line altitude estimates refine; horizon-line shifts; fatigue accumulates |
| **Per-season** (≈ 5 sessions) | Pattern of consistent choices | Slow lines (Moral, Spiritual, Willpower) advance; shadow signals consolidated |
| **Per-stage** (≈ 10–20 hours) | Stage advancement | Stage gate cleared; new world unlocks; codex entry written by player |

Each timescale has its own feedback loop and its own UI surface.
Confusing them — e.g., showing per-trial feedback at per-stage
cadence — produces poor UX.

## 3. The progression "shape"

Mysterium's progression is **not** a single XP bar. It is, in order of
importance:

### 3.1 The radial chart (psychograph)

Eight spokes, one per line. Concentric rings, one per stage. Quadrant
tinting on the spokes. This *is* the player's progression view.

Reading the chart:
- The **horizon line** (lowest spoke) is the developmental bottleneck.
- The **leading line** (highest spoke) is the player's edge.
- **Quadrant skew** tells the player whether they have been
  exteriorising or interiorising.
- **Repression patterns** (static spoke while others grow) surface as
  fading colour.

### 3.2 The synthesised stage (the marker)

A single stage label — Red, Amber, Orange, etc. — derived purely as a
*function* of the radial chart (the synthesizer in
`foundations/02 §3.2`). The stage is *visible*, but it is *secondary*
— a summary of the chart, not a separate quantity.

### 3.3 The state-access chart (optional, parallel)

The five states (`foundations/04`) tracked separately. Not a
progression bar; a *capacity-access* chart showing how often and how
deeply the player can summon each state.

### 3.4 The shadow log

Detected fixations, regressions, repressions; resolved or unresolved
shadow encounters. Browseable in the codex.

### 3.5 The codex / world-bible

Player-authored entries — what they encountered, what they chose,
what they noted. Not a checklist; a *journal*. The closing entry
(at Turquoise) is the player's own developmental summary.

These five surfaces together compose the progression view; no single
surface tells the whole story.

## 4. The four progression mechanisms

### 4.1 The transformed up-down staircase (per task, per line)

Already specified in `foundations/08`. Operates at per-trial cadence.
Adjusts the difficulty of *every* cognitive task to keep the player
at ~70.7% accuracy. Invisible to the player.

### 4.2 Altitude estimation (per line)

A *running estimate* of the player's altitude on each line, derived
from their staircase levels and recent encounter performance. Updates
at per-session cadence. The estimate has hysteresis so it doesn't
jitter.

### 4.3 Stage synthesis (whole-player)

A pure function of the eight altitudes. Derives the synthesised
stage with the two-line breakthrough rule from `foundations/02 §3.4`.
Updates whenever any altitude changes.

### 4.4 Shadow detection (per line)

The detector in `foundations/10`. Operates at per-session cadence.
Identifies fixation, regression, and repression patterns. Surfaces
shadow encounters to the player as *invitations*.

## 5. The line-balance problem and the gentle pull

Without a counter-mechanism, players will pump their strongest line.
Mysterium counters via *gentle pull*, never *hard wall*:

- The **stage gate** requires *every* line to clear (the floor) — so
  ignoring a line eventually blocks stage advancement.
- The **encounter scheduler** prefers encounters touching the
  horizon (lowest) line, but the player can override.
- The **synergy bonus** rewards multi-line encounters, encouraging
  weaker lines to be exercised in *combination* with stronger ones.
- The **line ceilings** (`docs/lines/00-overview-multi-line.md`) prevent any line from running
  more than +1 or +2 stages ahead of cognitive — keeping the
  development *integrated*.

What Mysterium **never** does: penalise or reduce a strong-line altitude
because a weak line is behind. Strength is honoured; weakness is
*invited*, not *punished*.

## 6. The session arc (per `foundations/09 §3.1`)

A typical session:

| Beat | Duration | Purpose |
|---|---|---|
| Warm-up encounter | 2 min | Re-orient, friendly feedback |
| Skill-edge encounter | 3–5 min | Flow channel |
| Reflection (radial chart, codex) | 1 min | Consolidation |
| Skill-edge encounter | 3–5 min | Flow channel |
| Choice / dilemma | 1–2 min | Autonomy, narrative |
| Optional skill-edge or shadow | up to 10 min | Player-driven |
| End-session ritual (save, codex) | 30 s | Closure, anticipation |

Mysterium is designed for **5–6 sessions per week, 30 minutes each** —
closer to a meditation app's cadence than a typical RPG. Long binges
are not supported by the progression model; the per-session staircase
warm-up actively undermines them.

## 7. Stage advancement — the rite

Stage advancement is *narratively marked*. After clearing a synthesis
exam (the main boss) and meeting all six advancement criteria from
the relevant world bible, the player enters a **stage rite**:

- A scripted contemplative interlude (~3–5 minutes).
- The player authors a brief *value commitment* — a one-line statement
  organising the next stage of play.
- The radial chart is shown filling toward the new stage's ring.
- The new world unlocks.

The stage rite is the mechanism by which progression *becomes
self-authored*. The game does not say "you have ascended"; the player
*declares* what they are ascending *toward*.

## 8. Regression as a feature

Regression in Mysterium is **not** a punishment. It is a *capacity*.

A player at Orange may *deliberately* regress to Amber to clear a
shadow encounter rooted there. Visited stages remain accessible
through "memory dungeon" overlays — the same world, with new content
visible only at the player's current altitude. This makes the older
stages alive, not abandoned.

The progression UI distinguishes *current stage* from *deepest
visited stage*; the gap between them is where shadow work lives.

## 9. The "no end-game grind" rule

Mysterium does **not** ship endless-grind end-game content of the
loot-treadmill kind. The end-game (`docs/stages/08-turquoise-superintegral.md`)
is *contemplative* — the player returns to mentor others (multiplayer),
to clear remaining shadow encounters, or to start a new character with
different drive weights.

This is commercially unusual but ethically necessary. Variable-ratio
reward grinds are *exactly* the design pattern Mysterium cannot use
without contradicting Principle 6 (honest engagement).

## 10. The downstream documents (deferred)

| Deferred doc | One-line intent |
|---|---|
| `progression/01-staircase-dda.md` *(planned)* | Implementation of the 1-up/2-down across tasks. Mostly captured in `docs/foundations/08-psychophysics-and-staircase.md`. |
| `progression/02-skill-tree-progression.md` *(planned)* | The data-driven skill tree generator from `(line × stage)`. |
| `progression/03-stage-advancement-criteria.md` *(planned)* | Concrete thresholds for each stage gate. |
| `docs/foundations/25-cumulative-consciousness-index.md` | Tuning of ceilings and gentle pulls. |
| `docs/foundations/10-shadow-and-pathology.md` | Shadow detection thresholds, encounter unlock flow. |
| `progression/06-state-training-meditation.md` *(planned)* | The state mini-game. |

*(planned)* = declared but not yet written; the overview above is the current owner of these
laterals until each file exists.

The *intent* for each is established here and in `foundations/*` and
`lines/*`. Implementation can proceed.

## 11. Theta-Decay: The Holonic Maintenance Mechanic

### 11.1 Purpose

Theta-decay ensures that lower-stage health is MAINTAINED, not just achieved once and forgotten. It is the game-mechanical expression of the holonic principle: a holon that is not maintained degrades, and a degraded foundation cannot support higher development.

### 11.2 The two components

Theta-decay is a combination of **performance-based** (primary) and **time-based** (secondary, capped) decay:

#### Performance-based decay (primary)

Shadow signals accumulate when the player's behaviour reveals pathological drive patterns WITHOUT resolution. This is the dominant decay mechanism:

| Signal type | What it means | How it accumulates |
|---|---|---|
| **Avoidance patterns** | Player consistently avoids certain catalyst types | Each avoidance event adds to the module's decay counter |
| **Drive-health regression** | Drive scores in a module decline across sessions | Declining trend triggers decay proportional to regression rate |
| **Compensatory over-expression** | One drive hyper-dominates while others weaken | Imbalance severity contributes to decay of the weak-drive modules |
| **Stagnation at checkpoint** | Player engages but integration scores plateau | Prolonged plateau (no growth despite engagement) signals unresolved shadow |

**Key:** The player never sees "your shadow is accumulating." They experience it as: the game starts presenting more lower-stage catalyst, their consciousness index dips, and higher-stage content becomes slightly less accessible. The architecture is implicit.

#### Time-based decay (secondary, capped)

| Parameter | Value | Rationale |
|---|---|---|
| **Onset delay** | 2 weeks of absence | No decay for short breaks |
| **Maximum decay** | 20-30% of peak health | Player never loses more than ~30% from pure absence |
| **Decay curve** | Asymptotic (half-life model) | Fast initial decay, then slows — never reaches zero |
| **Recovery rate** | 3-5× faster than decay | A few sessions restore what weeks of absence degraded |

### 11.3 The combined formula (conceptual)

```
total_decay(module) = min(
  performance_decay(module) + time_decay(module),
  MAX_DECAY_CAP  // floor: never below 40% of peak health
)

performance_decay(module) = f(
  avoidance_frequency,        // how often they skip this module's catalyst
  drive_imbalance_severity,   // how skewed the 4 drives are at this module
  shadow_signal_persistence,  // how long a shadow pattern persists without shift
  stagnation_duration,        // how long since integration score improved
)

time_decay(module) = min(
  decay_rate × days_since_last_engagement,
  TIME_DECAY_CAP  // never more than 20-30% from time alone
)
```

### 11.4 What theta-decay is NOT

- NOT punishment for taking breaks (capped, easily recoverable)
- NOT visible as a "decay meter" (implicit — player feels it through game behaviour)
- NOT diagnostic to the user (the system adjusts silently)
- NOT a motivation hack (it's a developmental truth: unused capacities atrophy)

---

## 12. The Consciousness Index

### 12.1 Definition

A single number representing the player's overall developmental health across all 64 line-stage modules. It is derived from the multi-dimensional profile but presented as one cumulative score.

### 12.2 What it accounts for

| Factor | Contribution | Weight |
|---|---|---|
| **Stage health per line** | Each line-stage's capacity + drive-health + shadow-state | Positive |
| **Lower-stage integrity** | Health of stages BELOW the player's current altitude | Higher weight (foundation matters more) |
| **Shadow severity** | Unresolved shadows at any stage | Negative (subtracts from index) |
| **Integration quality** | Stages that are genuinely integrated vs. merely "passed" | Multiplier on positive contribution |
| **Drive balance** | How balanced the 4 drives are across the profile | Bonus for balance, penalty for extreme skew |

### 12.3 The unlock threshold mechanic

To access higher-stage content, the consciousness index must meet a threshold:

```
unlock_threshold(stage_N) = f(
  sum of all lower-stage health scores,
  minimum per-line health at all lower stages,
  shadow resolution rate,
  drive balance across the profile,
)
```

**Implication:** A player cannot simply grind the highest stage they can access. They must:
- Maintain lower-stage health (holonic return)
- Resolve shadows at earlier stages (heal/evolve)
- Keep drives balanced across the profile
- Demonstrate genuine integration (not just capacity)

### 12.4 How the consciousness index is computed (R&D required)

The exact scoring formula is an area of R&D that must be developed as part of the concept-draft process. Each of the 64 line-stage modules needs:
1. A health score formula (capacity × drive-health × shadow-state)
2. A weighting relative to other modules (how much does this module contribute to the index?)
3. A threshold definition (what score at this module is "healthy enough" to support higher stages?)

This scoring architecture forms the BASIS of what each game is trying to achieve — it defines what "success" means at each module.

### 12.5 Presentation to the player

The consciousness index is IMPLICIT in the game experience:
- Higher index = more content accessible, richer game world, deeper encounters
- Lower index = game gently redirects toward maintenance, lower-stage catalyst appears more
- The player FEELS their index through the game's behaviour, not through a number on screen

Whether to show the actual number is a UX decision deferred to implementation. The architecture supports both implicit (felt) and explicit (shown) presentation.

---

## 13. The Infinite Checkpoint Architecture

### 13.1 The session model

Each game is an infinite checkpoint game with variable session length:

```
Game Session (any line-stage module, any modality axis)
│
├── Checkpoint 0: Entry (player's current position in this module)
│   └── Catalyst presented at current mastery level
│   └── Profile updated with engagement signal
│
├── Checkpoint 1: First integration gate
│   └── Rubric evaluation: did the player meet criteria for this checkpoint?
│   └── YES → deeper catalyst, progression toward next mastery level
│   └── NO → same-level catalyst, different angle/axis
│   └── Profile updated with drive-health + shadow signals
│   └── CHOICE: Continue or explore another vibration?
│
├── Checkpoint N: Nth integration gate
│   └── Same structure, deeper mastery
│   └── Eventually: stage-transition threshold approached
│   └── CHOICE: Continue or explore?
│
└── ∞ (mastery deepens infinitely — the game never "ends")
```

### 13.2 Checkpoint properties

| Property | Specification |
|---|---|
| **Save granularity** | Every checkpoint saves full state — player can leave and return exactly here |
| **Profile update** | Drive-health, shadow-state, and consciousness index update at EVERY checkpoint |
| **Player choice** | At every checkpoint, the player can continue OR switch to any other module |
| **No punishment for leaving** | Leaving mid-session loses nothing — the last checkpoint is preserved |
| **Session length** | Determined entirely by the player — 2 minutes or 2 hours |

### 13.3 The rubric at each checkpoint

Each checkpoint evaluates against a rubric that includes:
- Capacity demonstration (can they do it at this level?)
- Drive-health signals (how are they relating to doing it?)
- Shadow-state signals (which quadrant is active?)
- Integration quality (are they growing or just performing?)

The rubric determines whether the player advances to deeper catalyst or receives the same-level catalyst from a different angle.

### 13.4 The "addictive but free" design

The game creates engagement through:
- **Felt-sense of growth** (not dopamine manipulation)
- **Micro-revelations** (each session reveals something about yourself)
- **Mystery/unfolding** (the game reveals depth gradually)
- **Flow state** (difficulty calibration keeps you in the zone)
- **The shadow hook** (when a shadow surfaces, there's a natural pull to resolve it)

The game creates freedom through:
- **Checkpoint saves** (leave anytime, lose nothing)
- **Multiple modules available** (bored? switch vibrations)
- **No streaks or guilt** (the game welcomes you back without judgment)
- **Player-determined session length** (the game adapts to whatever time you give it)

---

## 14. Open questions (updated)

- **Pacing variance.** Some players will outpace the design; some will lag. Both are valid.
- **Consciousness index formula.** The exact computation is R&D that must be developed per-module during concept-draft phase.
- **Theta-decay tuning.** The exact rates and caps need playtesting to calibrate.
- **Checkpoint rubric architecture.** The infinite array of rubrics for all checkpoints needs to be specified per-module — this is part of the concept-draft work.
- **Multi-character runs.** Should progression be cross-character? Default: no.
- **Multiplayer-only altitudes.** Some line altitudes can only be earned in multiplayer.

## 15. Principles served

Principles **3, 4, 6** — the staircase keeps the player at the
growth edge, every advancement is earned and demonstrated, the
engagement loop is honest about what it does and does not exploit.
