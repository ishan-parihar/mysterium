# foundations/00 — Integral Theory

> **Cross-references:** [[docs/foundations/26-unified-core-architecture|26 — Unified Core Architecture]]
> **Status:** canonical-hypothesis (Mysterium-specific extension of HoloOS coordinate system).
>
> HoloOS uses a 4-axis coordinate `⟨V=⟨O,D,S⟩, C, R⟩` (Verticality, Collectivity, Realm-placement) with `N` as a query parameter — see HoloOS `_THEORY/02_Ontology/08.8_Redesigned_Coordinate_System.md` (rev 2, canonical-hypothesis). Mysterium uses a 7-tuple `(quadrant, stage, line, state, type, ray, polarity)` inherited from Wilber's AQAL plus Law-of-One Ray and Polarity extensions.
>
> The two systems overlap on:
> - Stage ≈ Verticality `V.D` (discrete density within an octave)
> - State ≈ Realm-placement `R` (Gross/Subtle/Causal; Mysterium extends with Witness + Non-Dual)
> - Quadrant ≈ Collectivity `C` × Realm-interior-exterior
>
> Mysterium's **Line** axis has no HoloOS analog. It is retained as a Mysterium-specific extension because the 64-module content grid depends on it. HoloOS's **Nesting-direction** `N` axis has no Mysterium analog and is omitted because Mysterium does not model cross-octave involution.
>
> See `docs/foundations/26-unified-core-architecture.md` for the full coordinate tuple. See HoloOS `_THEORY/02_Ontology/08.8_Redesigned_Coordinate_System.md` for the source-of-truth 4-axis system.

## 1. Purpose

Establish Wilber's Integral / AQAL framework as the **master organising
lens** of Mysterium. Every other framework the game uses (Piaget's cognitive
stages, Kohlberg's moral stages, Diamond's executive functions, Goleman's
emotional intelligence, Fowler's faith development, Spiral Dynamics
colour-coding, the Law-of-One ray system) is plugged into AQAL as a
*line*, a *level*, a *quadrant*, a *state*, or a *type*. AQAL is the
chassis; the others are the engines bolted onto it.

Without a master lens, the design devolves into a forced bag of features
("we have the Stroop *and* a moral choice *and* a chakra system"). With
AQAL, the design has structure: each feature is locatable in a
five-dimensional space (quadrants × levels × lines × states × types) and is
placed there for an explicit reason.

## 2. Scientific basis

### 2.1 What AQAL is

AQAL = "All Quadrants, All Levels, All Lines, All States, All Types"
(Wilber 2000, *A Theory of Everything*; Wilber 2006, *Integral Spirituality*).

- **Quadrants** — the four irreducible perspectives on any phenomenon:
  - **UL** Individual Interior — "I" — thoughts, feelings, awareness.
  - **UR** Individual Exterior — "It" — body, behaviour, brain regions.
  - **LL** Collective Interior — "We" — culture, shared values, mutual understanding.
  - **LR** Collective Exterior — "Its" — systems, institutions, infrastructure.
- **Levels (= stages)** — developmental altitudes any phenomenon can
  occupy. Mysterium canonises eight (Infrared → Turquoise).
- **Lines** — the relatively-independent developmental streams running
  through every level. Mysterium canonises eight: Cognitive, Emotional,
  Moral, Intrapersonal, Spiritual, Somatic, Willpower, Interpersonal.
- **States** — temporary, accessible conditions of consciousness (Gross,
  Subtle, Causal, Witness, Non-Dual). Orthogonal to stage; you can have a
  Non-Dual state experience at Amber stage and a stage-bound experience
  at Teal.
- **Types** — horizontal categories that do not develop (e.g., Myers-Briggs,
  enneagram). Mysterium mostly ignores types except as character-creation
  flavour.

### 2.2 What AQAL claims

The non-obvious empirical claim Wilber makes — supported by Cook-Greuter,
Kegan, Fowler, Loevinger, Piaget — is that **lines develop at different
altitudes within the same person**. A 50-year-old PhD physicist may sit at
Orange/Green on cognitive but Amber on emotional; a 22-year-old social
worker may sit at Green/Teal on moral but Red on financial. This is
the **psychograph**: a profile, not a number.

The corollary: a single XP bar is a *category error*. The richness of human
development cannot be compressed onto one axis without losing the design's
purpose.

### 2.3 The transcend-and-include rule

Each level integrates and adds to all previous levels. Orange does not
*replace* Amber — it *includes* the rule-following capacity of Amber and
*transcends* its absolutism. A healthy Orange has access to Amber when
groups need it; a regressed Orange is brittle when group cohesion demands
it.

This shapes Mysterium's progression UI: levels are *rings*, not check-marks. A
player at Orange retains all Amber and lower abilities; the question is
how cleanly they are integrated.

## 3. Game-design mapping

### 3.1 Five organising axes

Every Mysterium entity carries (or is decorated by) five tags:

| Axis | Where it lives in code | In-game expression |
|---|---|---|
| Quadrant | tag on enemies, abilities, encounters | Visual palette, overlay UI placement |
| Level (Stage) | tag on enemies, abilities, encounters | World aesthetic, enemy difficulty band |
| Line | tag on abilities, side-character archetypes | Combat verb category, skill-tree spoke |
| State | optional player meta-state | Meditation mini-game; subtle gameplay tints |
| Type | character-creation only | Cosmetic; does not gate progression |

### 3.2 Why this matters for combat design

A player attacks with a *spell* (cognitive line, UR quadrant, n-back task).
They parry with a *Stroop chromatic* (cognitive line, IC sub-line, UR
quadrant, Stroop task). They feel an enemy's grief and choose mercy or
slaying (emotional + moral lines, UL→LL quadrants, dilemma task).

If we did not have AQAL, those three encounters would seem unrelated. With
AQAL, they are coordinates in a coherent space, and we can verify that the
bestiary covers the space evenly.

### 3.3 The radial chart

The skill-tree visualisation in `docs/system/sub-systems/presentation/rendering-layer.md` is
literally a polar plot: angle = line (8 spokes), radius = altitude
(Infrared at centre, Turquoise at rim), tint = quadrant. The chart IS the
AQAL psychograph.

## 4. Architectural contract

```
type Quadrant = 'UL' | 'UR' | 'LL' | 'LR';
type Stage    = 'Infrared'|'Magenta'|'Red'|'Amber'|'Orange'|'Green'|'Turquoise'|'White';
type Line     = 'Cognitive'|'Emotional'|'Moral'|'Intrapersonal'|'Spiritual'|'Somatic'|'Willpower'|'Interpersonal';
type State    = 'Gross'|'Subtle'|'Causal'|'Witness'|'NonDual';

interface AqalCoordinate {
  quadrant: Quadrant;
  stage:    Stage;
  line:     Line;
}

interface PlayerProfile {
  altitudes: Record<Line, Stage>;          // per-line altitude
  stage:     Stage;                         // synthesised stage (= min altitude across all 8 lines, with hysteresis)
  states:    Record<State, number>;         // how much time spent / mastery in each state
}
```

The synthesised `stage` field is a **pure function** of `altitudes`. The
function lives in `core/usecases/StageSynthesizer.ts` (to be created). UI
never sets `stage`; it reads it.

## 5. Open questions

- **Whether "Interpersonal" deserves to be a line or a quadrant.** AQAL
  purists would say interpersonal IS LL — collective interior. Mysterium
  treats it as a line for design symmetry (8 spokes), but documents the
  category-pragmatism here.
- **State training as parallel progression.** Wilber distinguishes "growing
  up" (stages) from "waking up" (states). Most cognitive-training games
  ignore states entirely. Mysterium's stretch goal in `docs/foundations/04-states-of-consciousness.md` is to
  include them; whether MVP does is undecided.
- **How many types matter.** Currently zero. Some character-creation flavour
  could be added without polluting the model — but the temptation to let
  types gate content (e.g., "you're a feeler, take this skill tree") must
  be resisted, because types do not develop.

## 6. Principles served

Principles **1** (what is being trained — answers it five-dimensionally),
**4** (earned progression — psychograph, not single bar), **5** (UX —
gives the radial chart its grammar), **7** (codebase — provides the type
discipline).
