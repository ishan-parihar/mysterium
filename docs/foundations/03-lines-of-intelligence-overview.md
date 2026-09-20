# foundations/03 — Lines of Intelligence Overview

## 1. Purpose

Define what a *line* is, distinguish *altitude* from *stage*, and specify
the eight canonical lines Mysterium trains. Per-line detail is in the eight per-line
documents tabulated in §7; this is the unifier.

## 2. Scientific basis

### 2.1 What is a line?

A *line of intelligence* is a relatively-independent developmental stream
through the levels (= stages). The empirical evidence for line
independence:

- Gardner's multiple-intelligences research (Gardner 1983) — evidence for
  modular intelligences (linguistic, logical-mathematical, musical,
  spatial, bodily-kinaesthetic, interpersonal, intrapersonal,
  naturalistic).
- Cook-Greuter's longitudinal data (1999, 2005) — same person scoring
  Orange on cognition and Amber on ego development.
- Kegan's order-of-consciousness assessments — adults at the same
  cognitive level showing dramatically different self-other differentiation
  capacities.
- Fowler's faith stages — independent of cognitive Piagetian level beyond
  formal operational.

The non-obvious empirical finding: **cognitive development is necessary
but not sufficient for development of every other line**. You cannot
reach Stage-5 moral without formal-operational cognitive capacity, but
formal-operational cognition does not *cause* Stage-5 moral. Cognition is
the substrate; the other lines must develop on top.

Mysterium honours this asymmetry: cognitive-line altitude is a soft *cap* on
some other lines (Moral, Spiritual cannot exceed cognitive altitude by
more than one stage). This is documented in
`docs/foundations/25-cumulative-consciousness-index.md`.

### 2.2 Altitude vs. stage

- **Altitude** — the level a *single line* has reached. Per-line.
- **Stage** — the synthesised level of the *whole person*. The synthesis
  function in `foundations/02` defines this.

A player is *always* a vector of eight altitudes. The single "stage"
number is a useful abstraction for narrative pacing, but the real
psychograph is the eight-spoke radial chart.

### 2.3 The eight lines Mysterium canonises

| # | Line | Source theorist(s) | Quadrant home | Source assessments |
|:-:|---|---|---|---|
| 1 | Cognitive | Piaget, Diamond, Miyake | UR | Raven's matrices, n-back, Stroop, WCST |
| 2 | Emotional | Goleman, Mayer-Salovey | UL | EQ-i, MSCEIT, Difficulties in Emotion Regulation Scale |
| 3 | Moral | Kohlberg, Gilligan | UL→LL | Defining Issues Test, Moral Judgement Interview |
| 4 | Intrapersonal | Gardner, Loevinger | UL | Loevinger SCT, Hogan reflection scales |
| 5 | Spiritual | Fowler, Wilber | UL | Faith Development Interview, MOSIE |
| 6 | Somatic | Aposhyan, Hanna | UR | proprioceptive accuracy, dance / martial form |
| 7 | Willpower | Baumeister, Mischel | UL→UR | Delay-of-gratification, GRIT scale |
| 8 | Interpersonal | Gardner, Salovey | LL | IRI empathy, attunement assessments |

The eight are chosen because:

- They are *each* backed by a recognised assessment tradition (so
  gamification can preserve construct validity).
- They cover all four quadrants when placed by *primary expression*.
- They are mutually exclusive enough that gameplay testing one does not
  inevitably test another.
- They are exhaustive enough that the user's stated list (Cognitive,
  Emotional, Morals, Intrapersonal, Spiritual, Somatic, Willpower) is
  fully covered, with Interpersonal added for LL coverage and design
  symmetry.

## 3. Game-design mapping

### 3.1 The 8 × 8 matrix

Mysterium is structurally a {8 lines × 8 stages} matrix = 64 cells. Each cell
is a (line, stage) pair with:

- A combat verb at that stage's altitude
- A cognitive task vehicle
- A side-character archetype
- A skill-tree node

This matrix IS the skill tree. It is generated from the corpus
([[docs/concept-drafts/README|concept-drafts/README]]) and the curriculum data
(`src/core/curriculum/data/`), not hand-authored. The former skill-tree document was retired with
the combat spine ([[docs/system/core/decisions/MY-AD-0001-assessment-module-execution-replaces-the-atb-combat-spine|MY-AD-0001]]).

### 3.2 Line-specific combat verbs

Each line has its primary combat verbs (not exhaustive — full list in
each `lines/*` doc):

| Line | Primary verb(s) | Cognitive task vehicle |
|---|---|---|
| Cognitive | Cast spell, sequence combo, plan path | n-back, ToL, complex span |
| Emotional | Empath read, mood parry, affect channel | RT-affect-recognition, regulation tasks |
| Moral | Choose mercy / justice, vow, pledge | dilemma latencies, behavioural commitment |
| Intrapersonal | Witness pause, self-tag, integrate | introspective accuracy, mindfulness probes |
| Spiritual | Invoke value, sanctify ground, surrender | priority-test under load, value-coherence |
| Somatic | Dodge, posture, breath-gate | rhythm, proprioception, breath-paced inputs |
| Willpower | Lock goal, resist fatigue, finish | delay tasks, sustained-effort meters |
| Interpersonal | Attune, signal, support, rally | shared-attention, coordination latencies |

### 3.3 Side-character density

A stage's bestiary needs *at least one* side-character per line so that
each line is exercised within the stage. With eight lines and eight
stages, the minimum bestiary is 64 side-characters before any duplication
or theming. Per-stage docs enumerate them.

### 3.4 The "weakest line" gameplay loop

The post-fight UI surfaces the player's *currently weakest* line and
gently suggests encounters that exercise it. The player can decline; the
system never forces. But the next stage gate eventually requires that
line, so neglected lines become the natural focus over time. This is the
*spiritual gravity* of the staircase — pulling the player toward the
horizon line.

## 4. Architectural contract

```
const LINES: ReadonlyArray<Line> = [
  'Cognitive','Emotional','Moral','Intrapersonal',
  'Spiritual','Somatic','Willpower','Interpersonal',
] as const;

interface LineProfile {
  altitude: Stage;
  // running 1-up/2-down state for each task this line uses
  taskLevels: Record<TaskSlug, number>;
  // session counts, last-played-at, consistency metrics for fatigue / fairness
  meta: { sessionsPlayed: number; lastPlayedAtMs: number; };
}

type PlayerProfile['altitudes'] = Record<Line, Stage>;
type PlayerProfile['lines']     = Record<Line, LineProfile>;
```

Invariants:

- A line's altitude can never advance beyond `Cognitive.altitude + 1`
  (cognitive-substrate cap).
- A line's altitude can never advance more than two stages above the
  *minimum* altitude across all lines (development-balance cap, prevents
  a 5-stage gap).

These caps are conservative defaults; tuneable in
`docs/foundations/25-cumulative-consciousness-index.md`.

## 5. Open questions

- **Are eight lines too many for UX?** A radial chart with eight spokes
  is readable; with twelve it is not. Eight feels like the limit.
- **Are eight enough?** Aesthetic intelligence, financial intelligence,
  ecological intelligence are each defensible additional lines. Mysterium's
  decision: hold to eight in MVP; revisit in [[docs/concept-drafts/ROADMAP|concept-drafts/ROADMAP]].
- **The cognitive-substrate cap.** Is +1 the right slack? +2 would let
  emotional / moral / spiritual genuinely outpace cognition, which is
  closer to the empirical reality but creates strange in-game dynamics.

## 6. Principles served

Principles **1** (granular spec of *what* is being trained) and **4**
(prevents the single-bar fallacy).

## 7. The eight lines, in full

Each line has its own document; §2–§5 here are the unifier across them.

| Line | Document | Corpus |
|---|---|---|
| 1 Cognitive | [[docs/lines/01-cognitive|lines/01 — Cognitive Line]] | [[docs/concept-drafts/cognitive/01-infrared/module-spec|Cognitive / Infrared module]] |
| 2 Emotional | [[docs/lines/02-emotional|lines/02 — Emotional Line]] | [[docs/concept-drafts/emotional/01-infrared/module-spec|Emotional / Infrared module]] |
| 3 Moral | [[docs/lines/03-moral|lines/03 — Moral Line]] | [[docs/concept-drafts/moral/01-infrared/module-spec|Moral / Infrared module]] |
| 4 Intrapersonal | [[docs/lines/04-intrapersonal|lines/04 — Intrapersonal Line]] | [[docs/concept-drafts/intrapersonal/01-infrared/module-spec|Intrapersonal / Infrared module]] |
| 5 Spiritual | [[docs/lines/05-spiritual|lines/05 — Spiritual Line]] | [[docs/concept-drafts/spiritual/01-infrared/module-spec|Spiritual / Infrared module]] |
| 6 Somatic | [[docs/lines/06-somatic|lines/06 — Somatic Line]] | [[docs/concept-drafts/somatic/01-infrared/module-spec|Somatic / Infrared module]] |
| 7 Willpower | [[docs/lines/07-willpower|lines/07 — Willpower Line]] | [[docs/concept-drafts/willpower/01-infrared/module-spec|Willpower / Infrared module]] |
| 8 Interpersonal | [[docs/lines/08-interpersonal|lines/08 — Interpersonal Line]] | [[docs/concept-drafts/interpersonal/01-infrared/module-spec|Interpersonal / Infrared module]] |

The multi-line matrix in one document: [[docs/lines/00-overview-multi-line|lines/00 — Multi-Line Overview]].
