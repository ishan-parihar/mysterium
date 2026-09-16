# Scoring Architecture — Master Document

> **Cross-references:** [[docs/foundations/10-shadow-and-pathology|10 — Shadow And Pathology]] · [[docs/foundations/12-drive-assessment-mechanics|12 — Drive Assessment Mechanics]] · [[docs/foundations/14-game-as-developmental-catalyst|14 — Game As Developmental Catalyst]]
> **Purpose:** Define how the consciousness index is computed from 64 line-stage module health scores, how each module's health score is computed from capacity + drive-health + shadow-state, and what each per-module scoring skeleton must specify.
>
> **This document's unique lateral:** The AGGREGATION FORMULA — how individual module scores compose into line scores, and how line scores compose into the single consciousness index. Per-module scoring details live in each module's `scoring.md` file.

---

## 1. The Three-Layer Scoring Hierarchy

```
Layer 3: CONSCIOUSNESS INDEX (single number)
  ← aggregated from
Layer 2: LINE SCORES (8 numbers, one per line)
  ← aggregated from
Layer 1: MODULE HEALTH SCORES (64 numbers, one per line×stage)
  ← computed from
Layer 0: RAW SIGNALS (drive-health, shadow-state, capacity, checkpoint progression)
```

---

## 2. Layer 0: Raw Signals (Per-Game, Per-Checkpoint)

Every checkpoint in every game produces raw signals:

```ts
interface CheckpointSignals {
  // Capacity: can they do it?
  capacity: {
    accuracy: number;           // 0-1: task performance
    complexity: number;         // difficulty level achieved
    consistency: number;        // variance across trials
  };

  // Drive-health: how do they relate to doing it?
  drives: {
    agency:    { dark: number; golden: number };  // 0-1 each
    communion: { dark: number; golden: number };
    eros:      { dark: number; golden: number };
    agape:     { dark: number; golden: number };
  };

  // Shadow-state: which quadrant is active?
  shadow: {
    darkAddiction: number;      // 0-1 severity
    darkAllergy: number;
    goldenAddiction: number;
    goldenAllergy: number;
    dominantQuadrant: ShadowQuadrant | null;
  };

  // Integration: are they growing?
  integration: {
    progressionStage: 'encounter' | 'recognition' | 'integration' | 'evolution';
    sessionTrend: 'improving' | 'stable' | 'declining';
    checkpointDepth: number;    // how deep into the infinite progression
  };
}
```

---

## 3. Layer 1: Module Health Score (Per Line×Stage)

Each of the 64 modules produces a single health score (0-1) from three weighted components:

### 3.1 The formula

```
module_health(line, stage) = 
  w_capacity × capacity_score(line, stage)
  + w_drives × drive_health_score(line, stage)
  + w_shadow × shadow_integration_score(line, stage)
  - theta_decay(line, stage)
```

### 3.2 Component definitions

| Component | Range | What it measures | How it's computed |
|---|---|---|---|
| **capacity_score** | 0-1 | Can they operate at this stage? | Staircase level / ceiling for this module |
| **drive_health_score** | 0-1 | Are all 4 drives healthy in both domains? | Mean of 8 drive-domain scores (4 drives × 2 domains) |
| **shadow_integration_score** | 0-1 | Are shadows resolved? | 1 - max(shadow_severities across 4 quadrants) |
| **theta_decay** | 0-0.3 | Has this module been neglected? | Performance-based + time-based (capped) |

### 3.3 Weight distribution (default, tunable)

| Weight | Value | Rationale |
|---|---|---|
| w_capacity | 0.30 | Capacity is necessary but not sufficient |
| w_drives | 0.40 | Drive-health is the core of holonic health |
| w_shadow | 0.30 | Shadow integration is the healing dimension |

**Key insight:** A module can have high capacity (they CAN do it) but low health (their relationship to doing it is pathological). The weights ensure that capacity alone doesn't produce a healthy score.

### 3.4 What each module's scoring.md must specify

Each of the 64 `scoring.md` files defines:
1. **Capacity scoring rubric** — what constitutes stage-pass at this specific vibration
2. **Drive-health rubric** — what healthy/pathological expression of each drive looks like HERE
3. **Shadow integration criteria** — what "resolved" means for each of the 4 quadrants HERE
4. **Checkpoint progression rubric** — what mastery looks like at checkpoint 1, 5, 10, 50...
5. **Theta-decay sensitivity** — how quickly this module decays (some modules are more fragile)
6. **Cross-module dependencies** — which other modules' health affects this one's scoring

---

## 4. Layer 2: Line Scores (Per Line, Aggregated from Stages)

Each line produces a single score aggregated from its 8 stage-module health scores.

### 4.1 The formula

```
line_score(line) = Σ(stage=1..8) [ stage_weight(stage) × module_health(line, stage) ]
  × altitude_multiplier(line)
  × integration_depth_multiplier(line)
```

### 4.2 Stage weighting (lower stages weigh more)

The holonic principle: a cracked foundation matters more than a missing penthouse.

| Stage | Weight | Rationale |
|---|---|---|
| 1 (Infrared) | 1.0 | Survival substrate — must be healthy |
| 2 (Magenta) | 1.0 | Symbolic substrate — must be healthy |
| 3 (Red) | 0.95 | Ego substrate — critical foundation |
| 4 (Amber) | 0.85 | Belonging substrate — important |
| 5 (Orange) | 0.75 | Rational substrate — significant |
| 6 (Green) | 0.65 | Pluralistic — contributes |
| 7 (Turquoise) | 0.50 | Integral — bonus |
| 8 (White) | 0.35 | Non-dual — aspirational |

**Normalised:** Weights are normalised to the player's CURRENT ALTITUDE on that line. A player at Red only has stages 1-3 contributing; stages 4-8 are zero (not penalised for not having reached them yet).

### 4.3 Altitude multiplier

```
altitude_multiplier(line) = 1 + (current_altitude / max_altitude) × 0.3
```

Higher altitude = slightly higher line score (reaching further is rewarded), but ONLY if lower stages are healthy (because they're weighted more).

### 4.4 Integration depth multiplier

```
integration_depth_multiplier(line) = mean(checkpoint_depth across all active stages) / reference_depth
```

Deeper engagement (more checkpoints cleared) multiplies the line score. Surface-level passes contribute less than deeply integrated stages.

---

## 5. Layer 3: Consciousness Index (Single Number)

### 5.1 The formula

```
consciousness_index = Σ(line=1..8) [ line_weight(line) × line_score(line) ]
  × balance_multiplier
  × holonic_integrity_multiplier
```

### 5.2 Line weighting

All lines are weighted equally by default (each contributes 1/8). This reflects the integral principle: no line is more important than another.

```
line_weight(line) = 1/8 for all lines
```

**Exception:** If the player has a declared "ray profile" (from Law-of-One cosmology), certain lines may be weighted slightly higher for their specific path. This is a personalisation layer, not a default.

### 5.3 Balance multiplier

Rewards balanced development across lines; penalises extreme skew:

```
balance_multiplier = 1 - (std_deviation(line_scores) × penalty_factor)
```

A player with all lines at 0.6 scores higher than a player with one line at 1.0 and seven at 0.3. Balance IS health.

### 5.4 Holonic integrity multiplier

Rewards lower-stage health relative to upper-stage advancement:

```
holonic_integrity = min(lower_stage_health) / max(upper_stage_altitude)
```

If you've advanced to Orange but your Red is unhealthy, holonic integrity drops. This is the mathematical expression of "you can't outrun your foundation."

### 5.5 The unlock threshold

To access stage N content, the consciousness index must meet:

```
unlock_threshold(N) = base_threshold(N) + integrity_requirement(N)

where:
  base_threshold(N) = sum of minimum health scores required at stages 1..(N-1)
  integrity_requirement(N) = minimum holonic_integrity score for stage N
```

| Stage to unlock | Base threshold (approx) | Integrity requirement |
|---|---|---|
| 3 (Red) | 0.15 | 0.4 |
| 4 (Amber) | 0.30 | 0.5 |
| 5 (Orange) | 0.45 | 0.6 |
| 6 (Green) | 0.55 | 0.65 |
| 7 (Turquoise) | 0.65 | 0.7 |
| 8 (White) | 0.75 | 0.8 |

These are initial values — tuning requires playtesting.

---

## 6. The Per-Module Scoring Skeleton Template

Each of the 64 `scoring.md` files follows this template:

```markdown
# {Line}/{Stage} — Scoring Skeleton

## 1. The Vibration
- What IS this capacity at this stage? (one paragraph grounding)
- What does HEALTHY look like? (the integrated expression)
- What does PATHOLOGICAL look like? (the shadow expressions)

## 2. Capacity Scoring
- What task(s) demonstrate this capacity?
- What is the pass/fail threshold?
- What is the ceiling (maximum mastery)?
- How does the staircase adapt?

## 3. Drive-Health Scoring (4 drives × 2 domains = 8 scores)
- Agency dark: [what healthy vs pathological looks like HERE]
- Agency golden: [what healthy vs pathological looks like HERE]
- Communion dark: [...]
- Communion golden: [...]
- Eros dark: [...]
- Eros golden: [...]
- Agape dark: [...]
- Agape golden: [...]

## 4. Shadow Integration Scoring (4 quadrants)
- Dark-Addiction: [what "resolved" means at this module]
- Dark-Allergy: [what "resolved" means at this module]
- Golden-Addiction: [what "resolved" means at this module]
- Golden-Allergy: [what "resolved" means at this module]

## 5. Checkpoint Progression Rubric
- Checkpoint 1-5: [what mastery looks like at early engagement]
- Checkpoint 5-20: [what mastery looks like at deepening]
- Checkpoint 20-50: [what mastery looks like at integration]
- Checkpoint 50+: [what mastery looks like at evolution]

## 6. Theta-Decay Parameters
- Decay sensitivity: [high/medium/low — how quickly this module degrades]
- Recovery rate: [how quickly it restores with re-engagement]
- Minimum floor: [the lowest this module can decay to]

## 7. Cross-Module Dependencies
- Modules that SUPPORT this one (health here depends on health there)
- Modules that this one SUPPORTS (health there depends on health here)
- Compound shadow patterns involving this module
```

---

## 7. Directory Structure

The scoring skeletons live within each module's concept-draft directory:

```
concept-drafts/
├── SCORING-ARCHITECTURE.md          ← THIS DOCUMENT (master formula)
├── README.md                        ← Templates for game concepts
├── ROADMAP.md                       ← Development phases
├── {line}/{stage}/
│   ├── scoring.md                   ← Per-module scoring skeleton
│   ├── shadow-diagnostics.md        ← Shadow landscape (anchor)
│   ├── deterministic.md             ← Game concept: deterministic axis
│   ├── language-reflective.md       ← Game concept: language axis
│   ├── scenario-choice.md           ← Game concept: choice axis
│   ├── embodied-somatic.md          ← Game concept: body axis
│   ├── strategic-planning.md        ← Game concept: planning axis
│   ├── social-cooperative.md        ← Game concept: relational axis
│   └── immersive-rpg.md             ← Game concept: ecological axis
```

**Total per module:** 9 files (scoring + shadow-diagnostics + 7 game concepts)
**Total across all modules:** 64 × 9 = 576 files

---

## 8. Relationship to Other Documents

| Document | Relationship |
|---|---|
| progression/00 §12 | References this document for consciousness index computation |
| foundations/10 | Provides the shadow model that shadow_integration_score implements |
| foundations/12 | Provides the drive probes that drive_health_score implements |
| foundations/14 | Provides the catalyst→integration flow that checkpoint progression implements |
| STAGE-ASSESSMENT-ARCHITECTURE | Provides the module contract that this scoring system evaluates |
| Per-module scoring.md files | Implement this architecture for their specific vibration |

---

## 9. Roadmap for Developing 64 Per-Module Scoring Skeletons

### 9.1 The grounding problem

Each of the 64 modules represents a UNIQUE vibration — a specific developmental capacity at a specific stage of consciousness. The scoring skeleton must be grounded in the REALITY of that vibration, not a generic template filled in mechanically.

**What "grounded" means:** Before writing a scoring skeleton, the agent must understand:
- What IS this capacity at this stage? (not just "cognitive at Red" but "concrete-operational ego-driven planning with 2-step horizon")
- What does HEALTHY expression look like in lived reality?
- What does each drive look like when healthy vs. pathological AT THIS SPECIFIC VIBRATION?
- What are the actual developmental milestones (from the research literature)?
- How does this vibration relate to the ones above and below it on the same line?

### 9.2 Development phases (same as concept-drafts, scoring FIRST)

The scoring skeletons are developed BEFORE the game concepts, because they define what "success" means at each module. The game concepts then implement games that produce the signals the scoring skeleton expects.

| Phase | Modules | Scoring skeletons | Grounding required |
|---|---|---|---|
| **Phase 1** | Red × 8 lines | 8 files | Concrete-operational, egocentric, power-driven. Well-researched (Piaget, Kohlberg Stage 1-2, Loevinger Impulsive/Self-Protective) |
| **Phase 2** | Amber + Magenta × 8 lines | 16 files | Conformist + pre-operational. Well-researched (Kohlberg 3-4, Fowler Stage 2-3, Kegan Order 2-3) |
| **Phase 3** | Orange + Green × 8 lines | 16 files | Formal-operational + post-formal. Well-researched but more complex (Kohlberg 5-6, Cook-Greuter Achiever/Pluralist) |
| **Phase 4** | Infrared + Turquoise + White × 8 lines | 24 files | Pre-developmental + transpersonal. Less researched, more contemplative grounding needed |

### 9.3 Per-line grounding requirements

Each line has its own research tradition that must ground the scoring:

| Line | Primary research tradition | What grounds the scoring |
|---|---|---|
| **Cognitive** | Piaget, Diamond (EF), Miyake (unity/diversity) | Working memory capacity, inhibitory control, cognitive flexibility — measurable, objective |
| **Emotional** | Mayer-Salovey (EI), Gross (emotion regulation) | Emotion perception accuracy, regulation strategy sophistication, empathic accuracy |
| **Moral** | Kohlberg, Gilligan, Rest (DIT) | Moral reasoning complexity, justice/care balance, post-conventional reasoning |
| **Intrapersonal** | Loevinger (ego development), Kegan (subject-object) | Self-complexity, subject-object differentiation, reflexive capacity |
| **Spiritual** | Fowler (faith stages), Wilber (state-stages) | Meaning-making complexity, ultimate concern, state access, non-dual capacity |
| **Somatic** | Aposhyan, Hanna, Fogel (body sense) | Proprioceptive accuracy, interoceptive awareness, embodied presence |
| **Willpower** | Baumeister, Mischel, Duckworth (grit) | Delay of gratification, effort persistence, goal maintenance under distraction |
| **Interpersonal** | Selman (perspective-taking), Kegan (relational) | Perspective-taking complexity, attunement accuracy, relational repair capacity |

### 9.4 Per-stage grounding requirements

Each stage has its own developmental structure that must ground the scoring:

| Stage | Core structure | What makes scoring UNIQUE here |
|---|---|---|
| **Infrared** | Sensorimotor, pre-symbolic, survival | Scoring is purely behavioural — no language, no reflection. RT, habituation, orienting. |
| **Magenta** | Pre-operational, magical, symbolic | Scoring includes symbolic capacity but not logical operations. Animism, magical causality. |
| **Red** | Concrete-operational (early), egocentric, power | Scoring includes concrete logic, impulse expression, dominance. 2-step planning, self-other split. |
| **Amber** | Concrete-operational (full), conformist, rule-bound | Scoring includes rule-following, group-belonging, role-taking. Conventional morality. |
| **Orange** | Formal-operational, achievement, rational | Scoring includes abstract reasoning, hypothesis testing, self-authorship. Post-conventional begins. |
| **Green** | Post-formal (early), pluralistic, contextual | Scoring includes perspective-taking, contextual reasoning, systems sensitivity. Relativism. |
| **Turquoise** | Post-formal (mature), integral, vision-logic | Scoring includes meta-systematic reasoning, paradox tolerance, holistic integration. |
| **White** | Trans-rational, non-dual, unity | Scoring includes non-dual awareness, effortless presence, kosmocentric identity. Hardest to operationalise. |

### 9.5 The development process for each scoring skeleton

For each of the 64 modules, the process is:

```
1. GROUND: Read the relevant line doc + stage doc + developmental literature
   - What IS this capacity at this stage?
   - What does the research say about how it develops?
   - What are the validated assessment instruments for this level?

2. DEFINE CAPACITY: What constitutes "can do it" at this vibration?
   - What task(s) demonstrate this capacity?
   - What is the pass/fail threshold?
   - What is the ceiling?

3. DEFINE DRIVE-HEALTH: What do the 4 drives look like HERE?
   - Agency at this vibration: sovereign vs. dominating
   - Communion at this vibration: joining vs. fusing
   - Eros at this vibration: reaching vs. bypassing
   - Agape at this vibration: returning vs. regressing
   - Each in BOTH domains (dark/golden)

4. DEFINE SHADOW INTEGRATION: What does "resolved" mean HERE?
   - Dark-addiction resolved: can access without clinging
   - Dark-allergy resolved: can access without aversion
   - Golden-addiction resolved: can reach without bypassing
   - Golden-allergy resolved: can reach without terror

5. DEFINE PROGRESSION: What does deepening mastery look like?
   - Early checkpoints: basic capacity demonstration
   - Middle checkpoints: drive-health stabilisation
   - Late checkpoints: shadow integration
   - Deep checkpoints: effortless, integrated expression

6. DEFINE DECAY: How fragile is this module?
   - Some modules are robust (Cognitive/Red — once you can plan, it's stable)
   - Some modules are fragile (Emotional/Green — pluralistic empathy requires maintenance)

7. DEFINE DEPENDENCIES: What supports/depends on this module?
   - Vertical: the stage below must be healthy
   - Horizontal: related lines at the same stage
```

### 9.6 Sequencing within Phase 1 (Red × 8 lines)

Within Phase 1, the scoring skeletons should be developed in this order:

| Order | Module | Rationale |
|---|---|---|
| 1 | Cognitive/Red | Most concrete, most researched, sets the substrate for all other lines |
| 2 | Somatic/Red | Second most concrete — body-based, measurable, objective |
| 3 | Willpower/Red | Third most concrete — effort persistence, delay of gratification |
| 4 | Emotional/Red | Bridges concrete→qualitative — emotion recognition is measurable, regulation is qualitative |
| 5 | Interpersonal/Red | Relational — requires understanding of Red-stage self-other dynamics |
| 6 | Moral/Red | Requires understanding of egocentric moral reasoning (Kohlberg Stage 1-2) |
| 7 | Intrapersonal/Red | Requires understanding of Red-stage self-concept ("I am my impulses") |
| 8 | Spiritual/Red | Most qualitative — power-deity, transactional faith, magical agency |

This order moves from most objectively measurable to most qualitatively assessed, building understanding progressively.

### 9.7 Success criteria for scoring skeletons

A scoring skeleton is complete when:
1. The vibration is clearly articulated (not generic)
2. Capacity scoring is specific enough to implement (not "measures cognitive ability" but "measures 2-step sequential planning with concrete objects")
3. Drive-health scoring is specific to THIS vibration (not generic drive descriptions)
4. Shadow integration criteria are specific and observable
5. Checkpoint progression is realistic and grounded in developmental timelines
6. Cross-module dependencies are mapped
7. Any agent reading this skeleton could implement a scoring system without further design input
