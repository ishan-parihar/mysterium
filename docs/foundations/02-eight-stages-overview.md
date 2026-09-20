# foundations/02 — Eight Stages of Consciousness Overview

> **Status:** canonical-hypothesis (Wilber synthesis + Law-of-One Ra material + Primal Distortion Genesis Theorem correspondence).
>
> HoloOS anchor: `_THEORY/02_Ontology/08.8.7_Primal_Distortion_Genesis_Theorem.md` (canonical-hypothesis). The Primal Distortion Genesis Theorem establishes that each Stage corresponds to an established Primal Law:
> **Vocabulary correction (2026-09-20, canon home = 06 §5.1):** the bands below are **substrate layers within D3** (the density of the Choice), **not densities**. Densities are VIBGYOR — D1 Red, D2 Orange, **D3 Yellow**, D4 Green … D7 Violet, with the 8th as the octave-closure — and Mysterium's stage names (Infrared … White) are Spiral-Dynamics colours. Each integrated substrate layer carries one of the three established Laws; Mysterium's eight stages traverse the **D3 sub-octave**, whose closure is White (`01.4` §2.5.2, 06 §5.1).
>
> - **Substrate layer 1 — Infrared/Magenta ≈ Free Will** (First Distortion, established by Octave N-3's complete D1→D7 harvest). Encounters about choice as such; quantum-like superposition of possibilities.
> - **Substrate layer 2 — Red/Amber ≈ Love / Logos** (Second Distortion, established by Octave N-2). Directed growth, Logos-focusing, the principle of unity-attracting.
> - **Substrate layer 3 — Orange/Green/Turquoise ≈ Light** (Third Distortion, established by Octave N-1). Self-reflective choice within archetypal form; manifestation.
> - **The sub-octave closure — White ≈ our octave's contributions** — the Light-Law fully operative across all substrate layers; this is the Yellow→Green harvest into D4 (06 §5.1, 19 §9.6), not a "D4+" density.
>
> This Law-correspondence is the metaphysical grounding for Mysterium's Stage semantics. Each Stage's content should express its corresponding Law's phenomenology.

## 1. Purpose

Establish the eight-stage macro-progression as Mysterium's vertical axis. The
stages are **canonical** — the names, ordering, and core capacities are
fixed across all docs. Per-stage detail is in `stages/01-…08-…`; this
document gives the *whole arc* in one read.

Every level / world / dungeon in Mysterium corresponds to a stage. The player
ascends through them in sequence (with optional regression for shadow
work). Stage advancement is the game's primary long-term loop.

## 2. Scientific basis

The eight stages synthesise:

- Wilber's altitudes (Wilber 2006, *Integral Psychology*)
- Spiral Dynamics colour-coding (Beck & Cowan 1996)
- Cook-Greuter's ego development (Cook-Greuter 2005)
- Kegan's orders of consciousness (Kegan 1994)
- Fowler's stages of faith (Fowler 1981)
- Kohlberg's moral stages (Kohlberg 1981)
- Piaget's cognitive stages (Piaget 1972)
- Loevinger's ego stages (Loevinger 1976)

All eight scholars converge on a sequence with the same shape, even
where they disagree on details. Mysterium uses the union; details are
disambiguated in per-stage docs.

### The summary table

| # | Stage | Defining capacity | Cognitive (Piaget) | Moral (Kohlberg) | Population* | HoloOS Law-correspondence |
|:-:|---|---|---|---|---|---|
| 1 | **Infrared / Archaic** | Survival; sensori-motor | Sensorimotor | Pre-moral (S0) | <2% adults | D1 ≈ Free Will (First Distortion) |
| 2 | **Magenta / Magic** | Symbol; magical agency | Pre-operational early | Stage 1 (early) | 5–10% | D1 ≈ Free Will (superposition of possibilities) |
| 3 | **Red / Power** | Ego; will; conquest | Pre-operational late / Concrete early | Stage 1–2 (egocentric) | 15–20% | D2 ≈ Love / Logos (directed growth, focusing) |
| 4 | **Amber / Mythic** | Belonging; rule-and-role | Concrete operational | Stage 3–4 (conformist) | 25–30% | D2 ≈ Love / Logos (unity-attracting) |
| 5 | **Orange / Rational** | Reason; achievement; objectivity | Formal operational | Stage 5 (post-conventional, social-contract) | 30–40% | D3 ≈ Light (self-reflective choice in form) |
| 6 | **Green / Pluralistic** | Sensitivity; multi-perspective | Late formal / early post-formal | Stage 6 (universal-ethical, relativistic) | 15–20% | D3 ≈ Light (multi-perspective illumination) |
| 7 | **Turquoise / Integral** | Vision-logic; integration | Post-formal vision-logic | Stage 7 (universal-systemic) | ~5% | D3 ≈ Light (integral vision) |
| 8 | **White / Super-Integral** | Non-dual; unity | Trans-rational | Stage 8 (kosmocentric) | <1% | D4+ ≈ our octave's contributions (Light fully operative) |

\* Adult-population estimates are approximate, drawn from Cook-Greuter's
sentence-completion data and Wilber's syntheses. They are illustrative —
not load-bearing for the design.

### The shape of the arc

Three macro-arcs are nested in the eight stages:

- **Pre-personal (1–2)** — sub-egoic; before stable self-other
  differentiation.
- **Personal (3–6)** — egoic; stable separate self, navigating power,
  belonging, reason, and pluralism.
- **Trans-personal (7–8)** — post-egoic; egoic self transcended-and-included
  into larger holons.

This 3-arc structure is reflected in Mysterium's narrative architecture
(`narrative/00`): the protagonist goes through three world-arcs, each
covering ~3 stages.

### Transcend and include

A higher stage *includes* the capacities of lower stages. A Green-stage
player can still operate with Red ferocity in survival; an Orange player
can still feel Amber belonging at a wedding. The stages are **not**
mutually exclusive; they are the *highest centre of gravity available*.

## 3. Game-design mapping

### 3.1 Stage as level / world

Each stage is a major *world* in the game:

- Visual aesthetic (palette, motifs, architecture)
- Sonic aesthetic (instrumentation, modal scales, rhythm)
- Bestiary (side, mini, main, shadow)
- Narrative arc within the world
- Stage advancement gate (synthesis exam)

Detailed in each `stages/0X-*.md`.

### 3.2 Stage advancement is multi-line

A single line maxing out does not advance the stage. The synthesised
`Stage` is **the lowest altitude across all eight lines, with hysteresis**:

```
Player.stage = max stage S such that
  for all line L in 8 lines:
    altitude(L) >= S     // every line cleared S
  and at least one line reaches S+1     // pulling forward
```

Hysteresis (the "+1 pull") prevents stage from oscillating when the
weakest line jitters. Implementation in
`core/usecases/StageSynthesizer.ts`.

### 3.3 Why eight, not seven or nine

The eight-stage sequence is what falls out of the union of the source
literatures, plus the user's stated framework. The mapping to the
Law-of-One seven-ray system is given in `foundations/06`; the eight-stage
sequence with the seven-ray system maps as **Blue-Ray = two stages
(Orange and Green; in-flowing and out-flowing)** and **Indigo-Ray = two
stages (Turquoise and White's lower half)**, totalling eight integral
stages over seven rays. This is documented as canon, not invented.

### 3.4 Backward access — the regression mechanic

A player at Orange may *deliberately* regress to Amber to clear a shadow
encounter rooted there. Regression in Mysterium is **a feature**, not a
penalty: it represents transcend-and-include. The progression UI
visualises the *current stage* and the *deepest visited stage*; the gap
between them is where shadow work lives. See
`progression/05-shadow-work-and-regression.md`.

## 4. Architectural contract

```
const STAGES: ReadonlyArray<Stage> =
  ['Infrared','Magenta','Red','Amber','Orange','Green','Turquoise','White'] as const;

function stageIndex(s: Stage): number;            // 0..7
function nextStage(s: Stage): Stage | null;       // White → null
function prevStage(s: Stage): Stage | null;       // Infrared → null
function synthesizeStage(altitudes: Record<Line, Stage>): Stage;
```

Invariants tested in `core/usecases/StageSynthesizer.spec.ts`:

1. `synthesizeStage` is monotonic in each altitude (no altitude going up
   can lower the synthesised stage).
2. If all eight altitudes equal `s`, the synthesised stage is `s`.
3. If exactly one altitude is `s+1` and the rest are `s`, synthesised
   stage is `s` (hysteresis pull-forward — but does not advance).
4. If at least two altitudes are `s+1` and the rest are `≥ s`, synthesised
   stage is `s+1`.

Rule 4 is the "two-line breakthrough" rule: stage-up requires the
weakest line to clear, and at least two to break the next ceiling.
Adjustable; see open questions.

## 5. Open questions

- **The "two-line breakthrough" threshold.** Is two enough? Three would
  be more conservative; one would be too lenient. The 70.7% staircase is
  a per-task threshold; this is a per-line aggregation threshold; they
  must compose without producing a system that takes 2,000 hours of play
  to reach Orange.
- **Compression.** Real human stage development takes decades. Mysterium
  must compress without lying. Targets: each stage in MVP playable in
  10–20 hours of focused play, with an explicit on-screen disclaimer
  that *in-game* stage progress is a *practice*, not a clinical
  attainment.
- **Eight vs. seven.** If the user promotes the seven-ray Law-of-One layer
  to canon, the design either splits Blue-Ray and Indigo-Ray as we have
  done, or it collapses to seven stages. The current canon is eight; the
  seven-ray layer is overlaid in `foundations/06`.

## 6. Principles served

Principles **1, 4** — the macro-progression spine.
