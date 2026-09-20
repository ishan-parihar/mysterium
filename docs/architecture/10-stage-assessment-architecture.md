# Stage Assessment Architecture

> **Cross-references:** [[docs/foundations/10-shadow-and-pathology|10 — Shadow And Pathology]] · [[docs/foundations/11-game-modalities|11 — Game Modalities]] · [[docs/foundations/12-drive-assessment-mechanics|12 — Drive Assessment Mechanics]] · [[docs/foundations/24-encounter-scheduler|24 — Encounter Scheduler]]
> **Purpose:** Define the modular assessment system where each stage of each line has its own dedicated assessment module. The onboarding is then a composite that samples from these modules — not a separate system.

---

## Part I — The Core Problem with the Current Approach

The current onboarding runs **one probe per line** that measures a single parameter (accuracy or threshold) and maps it to a stage via a linear function. This is fundamentally broken because:

1. **A single task cannot span 8 stages.** An n=1 n-back and an n=5 n-back are qualitatively different cognitive operations — not just "harder versions of the same thing."
2. **Each stage represents a qualitative shift in structure**, not a quantitative increase in performance. Red-stage cognition is not "worse Orange-stage cognition" — it's a *different kind* of cognition.
3. **Multi-parameter assessment is required.** A person's stage on a line is revealed by the *pattern* across multiple measures (accuracy, response time, consistency, depth of reasoning, self-correction, etc.), not by any single number.
4. **The staircase converges too fast** on a single difficulty parameter, giving inflated or deflated readings based on 3-6 trials.

---

## Part II — The Architecture: Stage Assessment Modules

### 2.1 Structure

```
src/core/assessments/
├── types.ts                          ← shared types for all assessment modules
├── cognitive/
│   ├── infrared.ts                   ← Cognitive at Infrared stage
│   ├── magenta.ts                    ← Cognitive at Magenta stage
│   ├── red.ts                        ← Cognitive at Red stage
│   ├── amber.ts                      ← Cognitive at Amber stage
│   ├── orange.ts                     ← Cognitive at Orange stage
│   ├── green.ts                      ← Cognitive at Green stage
│   ├── turquoise.ts                  ← Cognitive at Teal stage
│   └── white.ts                      ← Cognitive at Teal stage (L8); identifier renamed in the code pass
├── emotional/
│   ├── infrared.ts → white.ts
├── moral/
│   ├── infrared.ts → white.ts
├── intrapersonal/
│   ├── infrared.ts → white.ts
├── spiritual/
│   ├── infrared.ts → white.ts
├── somatic/
│   ├── infrared.ts → white.ts
├── willpower/
│   ├── infrared.ts → white.ts
└── interpersonal/
    ├── infrared.ts → white.ts
```

**Total: 64 assessment modules** (8 lines × 8 stages).

### 2.2 Each module exports a `StageAssessment`

```ts
export interface StageAssessment {
  readonly line: Line;
  readonly stage: Stage;
  readonly tasks: readonly AssessmentTask[];
  readonly scoringRubric: ScoringRubric;
  readonly minimumTrials: number;
  readonly estimatedDurationMs: number;
}

export interface AssessmentTask {
  readonly id: string;
  readonly type: TaskType;
  readonly description: string;
  readonly parameters: Record<string, unknown>;
  readonly measures: readonly MeasureDimension[];
}

export type MeasureDimension =
  | 'accuracy'
  | 'response_time'
  | 'consistency'
  | 'depth'
  | 'self_correction'
  | 'complexity_handled'
  | 'transfer'
  | 'metacognition'
  | 'coherence'
  | 'integration';

export interface ScoringRubric {
  /** Minimum score (0-1) to be considered AT this stage */
  readonly passThreshold: number;
  /** How to weight each dimension */
  readonly dimensionWeights: Partial<Record<MeasureDimension, number>>;
  /** LLM rubric prompt for complex scoring (moral, intrapersonal, spiritual) */
  readonly llmRubric?: string;
}

export interface AssessmentResult {
  readonly line: Line;
  readonly stage: Stage;
  readonly passed: boolean;
  readonly confidence: number;  // 0-1, how confident we are in this result
  readonly dimensions: Record<MeasureDimension, number>;
  readonly rawTrials: readonly TrialResult[];
}
```

### 2.3 What each module does

Each stage assessment module defines:
1. **What tasks to run** — specific to that stage's qualitative structure
2. **What to measure** — multiple dimensions, not just accuracy
3. **How to score** — a rubric that combines dimensions into a pass/fail + confidence
4. **What "passing" means** — the qualitative criteria for being AT this stage

---

## Part III — Per-Line Stage Definitions

### 3.1 Cognitive Line

| Stage | Qualitative structure | Assessment tasks | Key measures |
|---|---|---|---|
| **Infrared** | Sensorimotor only — object permanence, basic cause-effect | Simple reaction time; object tracking (does it exist when hidden?) | RT, tracking accuracy |
| **Magenta** | Symbolic capacity — can hold 1 symbol in mind | n=1 n-back (very easy); simple pattern completion (A-B-A-?) | accuracy, RT |
| **Red** | Concrete operations emerging — can hold 2 items, basic sequencing | n=2 n-back; 2-step planning (Tower of Hanoi, 2 discs) | accuracy, planning time, error correction |
| **Amber** | Concrete operations stable — rule-following, categorisation | n=2 stable + Stroop (rule conflict); WCST (category switching, low) | accuracy, interference resistance, consistency |
| **Orange** | Formal operations — abstract reasoning, hypothesis testing | n=3 n-back; WCST (high switch rate); analogical reasoning | accuracy, transfer, metacognition (do they notice errors?) |
| **Green** | Post-formal emerging — perspective coordination, dialectical | n=3-4; multi-rule coordination; "both/and" reasoning tasks | complexity handled, integration, perspective-taking |
| **Teal** | Vision-logic — systems thinking, pattern across patterns | n=4+; complex systems prediction; meta-pattern recognition | systems accuracy, transfer across domains, self-correction |
| **Turquoise** | Non-dual cognition — effortless complexity, no-mind | n=5; paradox resolution; "what is the question?" tasks | response quality under no-time-pressure, depth, coherence |

### 3.2 Emotional Line

| Stage | Qualitative structure | Assessment tasks | Key measures |
|---|---|---|---|
| **Infrared** | Undifferentiated arousal — pleasant/unpleasant only | "Is this face happy or not happy?" (binary) | accuracy, RT |
| **Magenta** | Basic emotions — can name 3-4 (happy, sad, angry, scared) | Identify basic emotions from faces/scenarios | accuracy, RT, consistency |
| **Red** | Self-other split — "I feel X" but no regulation | Identify own emotion from scenario + intensity rating | accuracy, self-report consistency |
| **Amber** | In-group empathy — can read familiar emotions, suppress own | Identify emotions in social scenarios; "what should you feel?" (norm) | accuracy, norm-awareness, suppression speed |
| **Orange** | Reflective emotion — can label complex emotions, basic regulation | Mixed/complex emotion identification; regulation strategy choice | depth (complex labels), strategy quality |
| **Green** | Pluralistic empathy — contradictory emotions, empathy for outgroup | Identify contradictory emotions; empathy for unlike-self scenarios | integration, breadth, tolerance of ambiguity |
| **Teal** | Emotional wisdom — emotions as information, no attachment | Emotion-as-signal tasks; "what is this emotion telling you?" | depth of interpretation, non-reactivity, coherence |
| **Turquoise** | Equanimity — all emotions arise and pass without identification | Emotional perturbation + recovery speed; non-attachment measures | recovery speed, equanimity under provocation |

### 3.3 Moral Line

| Stage | Qualitative structure | Assessment tasks | Key measures |
|---|---|---|---|
| **Infrared** | Pre-moral — no moral reasoning, pure impulse | N/A (cannot be assessed — default for very young) | — |
| **Magenta** | Magical morality — "bad things happen to bad people" | Simple fairness scenarios (who gets the cookie?) | choice pattern |
| **Red** | Egocentric — "right = what benefits me" (Kohlberg Stage 1) | Self-interest vs. other dilemmas; power-based choices | choice pattern, justification depth (LLM) |
| **Amber** | Conformist — "right = what the group/rules say" (Kohlberg Stage 3-4) | Rule-following vs. compassion dilemmas; loyalty scenarios | choice pattern, rule-rigidity, justification (LLM) |
| **Orange** | Principled — "right = universal principles" (Kohlberg Stage 5) | Principle vs. law dilemmas; rights-based reasoning | principle identification, consistency, justification (LLM) |
| **Green** | Contextual — "right = depends on all perspectives" (Kohlberg Stage 6) | Multi-stakeholder dilemmas; "no right answer" scenarios | perspective breadth, tolerance of ambiguity, integration (LLM) |
| **Teal** | Systemic — "right = what serves the whole system" | Systemic impact dilemmas; long-term vs. short-term; ecological | systems thinking, temporal breadth, coherence (LLM) |
| **Turquoise** | Non-dual morality — action arises from being, not from rules | Paradox dilemmas; "what would you do if there were no rules?" | depth, spontaneity, coherence, non-attachment to outcome (LLM) |

### 3.4 Intrapersonal Line

| Stage | Qualitative structure | Assessment tasks | Key measures |
|---|---|---|---|
| **Infrared** | No self-concept — pure sensation | Cannot be assessed at this stage | — |
| **Magenta** | Impulsive self — "I am my impulses" | "What do you want right now?" (single-word) | response exists |
| **Red** | Imperial self — "I am my needs/power" | "What are you good at? What do you want?" | self-concept clarity, granularity |
| **Amber** | Interpersonal self — "I am my roles/relationships" | "Who are you?" (role-based); predict own behaviour in scenarios | role-identification, prediction accuracy |
| **Orange** | Institutional self — "I am my goals/achievements" | Self-assessment accuracy (predict performance, then compare); identify own biases | prediction accuracy, bias awareness, metacognition |
| **Green** | Inter-individual self — "I am my values/process" | Identify internal contradictions; "what part of you wants X while another wants Y?" | contradiction awareness, parts-language, depth (LLM) |
| **Teal** | Construct-aware self — "I am the awareness that holds all parts" | Witness perspective tasks; "observe your reaction without acting on it" | dis-identification speed, meta-awareness, equanimity |
| **Turquoise** | Unitive self — "I am" (no predicate needed) | Paradox of self-description; "describe yourself without using roles, traits, or history" | depth, simplicity, coherence, non-attachment (LLM) |

### 3.5 Spiritual Line

| Stage | Qualitative structure | Assessment tasks | Key measures |
|---|---|---|---|
| **Infrared** | Pre-spiritual — no value hierarchy | N/A | — |
| **Magenta** | Magical faith — "the universe gives me what I want" | "What do you believe happens when you wish for something?" | belief structure |
| **Red** | Power-deity — "God rewards the strong" (transactional) | Value-ranking under zero-cost temptation (obvious) | coherence, speed |
| **Amber** | Mythic faith — "God has rules; follow them" (conformist) | Value-ranking under social-pressure temptation | coherence under social pressure |
| **Orange** | Rational spirituality — "I choose my values based on evidence" | Value-ranking under logical-argument temptation; "why do you value X?" | justification depth, resistance to sophistry (LLM) |
| **Green** | Pluralistic spirituality — "all paths are valid" | Value-ranking under relativistic challenge; "what if your value harms another's?" | tolerance + commitment simultaneously, integration (LLM) |
| **Teal** | Integral spirituality — "values arise from the structure of reality" | Value-coherence under paradox; "hold two contradictory values" | paradox tolerance, coherence, depth (LLM) |
| **Turquoise** | Non-dual spirituality — "value and valuelessness are one" | "What matters?" under conditions of radical uncertainty | depth, simplicity, non-attachment, spontaneity (LLM) |

### 3.6 Somatic Line

| Stage | Qualitative structure | Assessment tasks | Key measures |
|---|---|---|---|
| **Infrared** | Reflex only — startle, grasp, orient | Simple RT (tap when green) | RT, anticipation control |
| **Magenta** | Gross motor — can coordinate large movements | Rhythm tapping (simple beat: tap-tap-tap) | rhythm accuracy, consistency |
| **Red** | Power-body — explosive force, speed | Fast RT + rapid alternation (tap left-right-left-right fast) | speed, alternation accuracy |
| **Amber** | Disciplined body — sustained posture, endurance | Sustained hold + rhythm maintenance over time | endurance, consistency over time |
| **Orange** | Skilled body — multi-limb coordination, precision | Complex rhythm (polyrhythm: 3 against 2); precision tapping | polyrhythm accuracy, precision |
| **Green** | Expressive body — body as communication, flow | Free-form rhythm creation; "make a pattern that feels like X" | creativity, expressiveness (LLM for description) |
| **Teal** | Integrated body — body-mind unity, proprioceptive wisdom | Anticipatory timing (predict when stimulus will appear); body-scan accuracy | anticipation accuracy, interoceptive precision |
| **Turquoise** | Effortless body — wu-wei, action without actor | RT under no-urgency conditions; "respond when it feels right" | naturalness, consistency without effort |

### 3.7 Willpower Line

| Stage | Qualitative structure | Assessment tasks | Key measures |
|---|---|---|---|
| **Infrared** | No volitional control — pure reflex | Cannot be assessed | — |
| **Magenta** | Impulse delay (seconds) — "wait for it" | Delay of gratification: wait 3s for bigger reward vs. tap now for small | choice, wait time |
| **Red** | Burst goals — intense short-term effort | Hold button for 3-5s under distraction; resist early-release temptation | hold duration, resistance to perturbation |
| **Amber** | Sustained effort — follow through on commitments | Hold for 8-12s; multi-trial consistency (don't degrade over trials) | duration, consistency across trials, no degradation |
| **Orange** | Strategic willpower — allocate effort wisely | Choose WHEN to exert effort (some trials are worth more); resource management | strategic allocation, total score optimisation |
| **Green** | Flexible willpower — hold AND release appropriately | Hold when told to hold, release when told to release (switching); "let go" tasks | switching accuracy, release speed, flexibility |
| **Teal** | Effortful effortlessness — sustained without strain | Long hold (15-20s) with minimal physiological cost (measured by consistency, not just duration) | consistency of hold (no jitter), smoothness |
| **Turquoise** | Wu-wei — action without actor, will without willing | "Hold until it feels right to release" (no external cue); self-determined timing | coherence of self-timing, non-reactivity to perturbation |

### 3.8 Interpersonal Line

| Stage | Qualitative structure | Assessment tasks | Key measures |
|---|---|---|---|
| **Infrared** | No other — solipsistic | Cannot be assessed | — |
| **Magenta** | Other as extension of self — "you do what I want" | Simple imitation (NPC does X, you copy) | imitation accuracy |
| **Red** | Other as tool — transactional coordination | Predict NPC's simple pattern (repeating); "what will they do?" | prediction accuracy |
| **Amber** | Other as role — "what should they do?" (norm-based) | Predict NPC's behaviour based on their stated role/rules | role-based prediction, norm awareness |
| **Orange** | Other as mind — theory of mind, false belief | False-belief tasks: "NPC doesn't know X — what will they do?" | ToM accuracy, perspective-taking |
| **Green** | Other as subject — empathic coordination, mutual | Cooperative timing: sync with NPC who is also trying to sync with you | mutual adaptation speed, coordination quality |
| **Teal** | Other as self — non-dual relating, field awareness | Predict NPC's behaviour when NPC is adapting to YOU (recursive ToM) | recursive prediction accuracy, adaptation speed |
| **Turquoise** | No other — unity, spontaneous coordination | "Act together without communication" — emergent synchrony | synchrony quality, spontaneity |

---

## Part IV — Multi-Parameter Scoring

### 4.1 Every assessment measures multiple dimensions

No assessment module produces a single number. Each produces a `Record<MeasureDimension, number>`:

| Dimension | What it measures | How |
|---|---|---|
| `accuracy` | Did they get it right? | % correct |
| `response_time` | How fast? (where speed matters) | Median RT, normalised |
| `consistency` | Same performance across trials? | Variance of accuracy/RT across trials |
| `depth` | How complex/nuanced was their response? | LLM scoring against rubric |
| `self_correction` | Did they catch and fix errors? | % of errors followed by correction |
| `complexity_handled` | What level of complexity could they manage? | Max difficulty level passed |
| `transfer` | Can they apply it in a new context? | Performance on novel variants |
| `metacognition` | Do they know what they know/don't know? | Prediction accuracy (predict own score) |
| `coherence` | Is their response internally consistent? | Cross-trial consistency of reasoning |
| `integration` | Can they hold multiple perspectives/dimensions? | Multi-factor response quality (LLM) |

### 4.2 Dimension weights vary by line and stage

- **Cognitive:** accuracy (0.3), response_time (0.2), complexity_handled (0.3), self_correction (0.2)
- **Emotional:** accuracy (0.2), depth (0.3), consistency (0.2), integration (0.3)
- **Moral:** depth (0.4), coherence (0.3), integration (0.3) — accuracy is meaningless (no "right answer")
- **Intrapersonal:** depth (0.3), metacognition (0.3), coherence (0.2), self_correction (0.2)
- **Spiritual:** coherence (0.4), depth (0.3), consistency (0.3) — under temptation
- **Somatic:** accuracy (0.3), response_time (0.3), consistency (0.4)
- **Willpower:** consistency (0.3), complexity_handled (0.3), transfer (0.2), response_time (0.2)
- **Interpersonal:** accuracy (0.3), response_time (0.2), transfer (0.2), depth (0.3)

### 4.3 LLM scoring for depth/coherence/integration

For lines where the response is qualitative (Moral, Intrapersonal, Spiritual, and higher stages of all lines), the LLM evaluates against a rubric:

```ts
interface LLMScoringRequest {
  readonly playerResponse: string;
  readonly rubric: string;
  readonly stage: Stage;
  readonly line: Line;
  readonly dimensions: MeasureDimension[];
}
```

The rubric is specific to the stage and line. Example for Moral/Green:

> "Score this response on a 0-1 scale for each dimension:
> - depth: Does the response acknowledge multiple valid perspectives without collapsing into relativism?
> - coherence: Is the reasoning internally consistent?
> - integration: Does it hold tension between competing goods without premature resolution?
> A Green-stage moral response recognises that all perspectives have partial truth, while still being able to act. It does not say 'anything goes' (that's regression to Red), nor does it impose a single principle (that's Orange)."

---

## Part V — The Assessment Engine

### 5.1 How a stage assessment runs

```
1. Load the StageAssessment module for (line, stage)
2. For each task in the module:
   a. Present the task to the player
   b. Collect their response (tap, choice, text, timing)
   c. Score the response on all relevant dimensions
   d. If LLM scoring needed: call evaluateResponse() with the rubric
3. Aggregate dimension scores across all tasks
4. Apply dimension weights from the scoring rubric
5. Compare weighted score to passThreshold
6. Return AssessmentResult { passed, confidence, dimensions }
```

### 5.2 Confidence calculation

Confidence is based on:
- **Number of trials:** more trials = higher confidence
- **Consistency:** low variance across trials = higher confidence
- **Discrimination:** clear pass or clear fail = higher confidence; borderline = lower

```ts
function computeConfidence(results: TrialResult[], passThreshold: number): number {
  const score = weightedScore(results);
  const distance = Math.abs(score - passThreshold);
  const consistency = 1 - variance(results.map(r => r.score));
  const trialFactor = Math.min(1, results.length / 6);
  return distance * consistency * trialFactor;
}
```

### 5.3 Adaptive termination

Each module has a `minimumTrials` (usually 3-4) but can terminate early if:
- Confidence > 0.8 (clear pass or fail)
- All dimensions are clearly above or below threshold

This keeps the assessment efficient without sacrificing validity.

---

## Part VI — How Onboarding Uses These Modules

The onboarding is NOT a separate system. It is a **composite assessment** that:

1. **Starts at a middle stage** (Red or Amber) for each line
2. **Runs the stage assessment** for that stage
3. **If passed:** moves UP one stage and tests again
4. **If failed:** moves DOWN one stage and tests again
5. **Converges** when it finds the boundary (passed at S, failed at S+1)
6. **Reports** the highest stage passed with confidence > 0.6

This is a **binary search on stages**, not a staircase on a single parameter. It takes 2-4 stage assessments per line to converge (log₂(8) ≈ 3).

### 6.1 Onboarding time budget

- 8 lines × 3 stage assessments × 2-3 minutes each = **48-72 minutes total**
- This is too long for a single session. Solution: **split across 2-3 sessions**
- Session 1: Somatic + Cognitive + Emotional (the "body and mind" session, ~20 min)
- Session 2: Moral + Intrapersonal + Spiritual (the "depth" session, ~25 min)
- Session 3: Willpower + Interpersonal (the "action" session, ~15 min)

Or: a **quick-calibration mode** that runs only 1 stage assessment per line at the estimated starting point (based on age/self-report), taking ~20 minutes total, with refinement happening during gameplay.

### 6.2 The onboarding samples from the pool

Each stage assessment module is a **standalone game** that can be:
- Used in onboarding (calibration)
- Used in combat (as the cognitive task overlay)
- Used in practice mode (player chooses to train a specific line/stage)
- Used in shadow work (revisiting earlier stages)

This is the key architectural insight: **the same modules serve all four purposes**.

---

## Part VII — Implementation Priority

### Phase 1: Red stage assessments (all 8 lines) — the MVP vertical slice

Since Red is the first gameplay stage, we need all 8 Red-stage assessments first:
1. Cognitive/Red: n=2 n-back + 2-step planning
2. Emotional/Red: self-other emotion split + intensity rating
3. Moral/Red: egocentric dilemmas with LLM-scored justification
4. Intrapersonal/Red: "what are you good at?" + self-concept clarity
5. Spiritual/Red: value-ranking under obvious temptation
6. Somatic/Red: fast RT + rapid alternation
7. Willpower/Red: 3-5s hold under distraction + early-release temptation
8. Interpersonal/Red: predict NPC's simple repeating pattern

### Phase 2: Amber + Magenta assessments (the adjacent stages)

To calibrate whether someone is below, at, or above Red, we need:
- All 8 Magenta assessments (below Red)
- All 8 Amber assessments (above Red)

### Phase 3: Orange + Green assessments

For players who are above Amber.

### Phase 4: Infrared + Teal + Turquoise assessments

Edge cases — very low or very high.

### Phase 5: Composite onboarding

Once all 64 modules exist, build the binary-search onboarding that samples from them.

---

## Part VIII — Relationship to Combat

In combat, the cognitive task overlay IS a stage assessment module running in "single-trial" mode:
- The encounter scheduler picks a line and stage
- The corresponding assessment module provides a single task at that difficulty
- The player's response updates their staircase AND contributes to their ongoing assessment
- Over many encounters, the system accumulates enough data to refine the altitude with high confidence

This means: **every combat encounter is also an assessment trial**. The game IS the test. The test IS the game.

---

## Part IX — File Structure for Implementation

```
src/core/assessments/
├── types.ts                          ← AssessmentTask, ScoringRubric, AssessmentResult, MeasureDimension
├── engine.ts                         ← runAssessment(), scoreTrials(), computeConfidence()
├── cognitive/
│   ├── index.ts                      ← exports all 8 stage modules
│   ├── infrared.ts                   ← { tasks, rubric, passThreshold }
│   ├── magenta.ts
│   ├── red.ts
│   ├── amber.ts
│   ├── orange.ts
│   ├── green.ts
│   ├── turquoise.ts
│   └── white.ts
├── emotional/                        ← same structure
├── moral/                            ← same structure
├── intrapersonal/                    ← same structure
├── spiritual/                        ← same structure
├── somatic/                          ← same structure
├── willpower/                        ← same structure
└── interpersonal/                    ← same structure

src/game/assessments/
├── AssessmentScene.ts                ← generic Phaser scene that runs any StageAssessment
├── renderers/
│   ├── NBackRenderer.ts             ← renders n-back tasks
│   ├── DilemmaRenderer.ts           ← renders moral dilemmas
│   ├── ScenarioRenderer.ts          ← renders intrapersonal/spiritual scenarios
│   ├── ReactionTimeRenderer.ts      ← renders somatic tasks
│   ├── HoldRenderer.ts              ← renders willpower tasks
│   ├── PatternRenderer.ts           ← renders interpersonal tasks
│   └── EmotionRenderer.ts           ← renders emotional tasks
└── CompositeOnboarding.ts           ← the binary-search orchestrator
```

---

## Part X — Success Criteria

The system is complete when:

1. **Each of the 64 modules** can be run independently and produces a multi-dimensional `AssessmentResult`
2. **The composite onboarding** converges on a per-line altitude within 3-4 assessments per line
3. **Combat encounters** draw from the same modules in single-trial mode
4. **The profile** updates based on accumulated assessment data, not single-trial snapshots
5. **LLM scoring** is used for depth/coherence/integration on qualitative lines (Moral, Intrapersonal, Spiritual)
6. **No single assessment can be spoofed** — multiple dimensions cross-validate each other
7. **The player never sees the same content twice** in a single session (large item pools per module)
8. **Confidence is tracked** — the system knows when it's uncertain and schedules more assessment

---

## Part XI — Shadow Diagnostics Within Assessment Modules

> Full shadow theory is in `foundations/10-shadow-and-pathology.md`. This section specifies how the 64 assessment modules implement shadow detection.

### 11.1 Dual-mode operation

Every assessment module operates in two modes:

| Mode | Scoring focus | When triggered |
|---|---|---|
| **Capacity mode** | Can the player perform at this stage? (accuracy, speed, depth) | Onboarding, advancement testing, combat |
| **Shadow mode** | Does the player have a healthy *relationship* to this capacity? (drive-health) | Holonic return encounters, shadow encounters |

The same tasks are used in both modes — only the scoring rubric changes.

### 11.2 Drive-health probes embedded in every module

Each of the 64 modules includes 4 drive-health probes alongside its capacity tasks:

```ts
export interface StageAssessment {
  // ... existing fields from Part II ...
  readonly driveProbes: {
    readonly agency: DriveProbe;      // "Can you do this independently?"
    readonly communion: DriveProbe;   // "Can you share/teach this?"
    readonly eros: DriveProbe;        // "Can you let go and try harder?"
    readonly agape: DriveProbe;       // "Can you return to easier without shame?"
  };
}

export interface DriveProbe {
  readonly description: string;
  readonly task: AssessmentTask;
  readonly healthyResponse: string;
  readonly addictionSignal: string;   // what addiction looks like here
  readonly allergySignal: string;     // what allergy looks like here
}
```

### 11.3 Per-line drive-probe examples

| Line | Stage | Agency probe | Communion probe | Eros probe | Agape probe |
|---|---|---|---|---|---|
| Cognitive | Red | n=2 without hints | Explain your strategy to NPC | Try n=3 (risk failure) | Do n=1 again fully (not dismissively) |
| Emotional | Amber | Identify emotion without group consensus | Help NPC identify their emotion | Attempt complex/mixed emotion | Return to basic emotion naming with care |
| Moral | Orange | Make principled choice alone (no social cues) | Justify your choice to someone who disagrees | Consider a dilemma with no clear principle | Revisit a simple fairness scenario with full engagement |
| Willpower | Red | Hold without encouragement | Hold while supporting NPC's hold | Attempt longer hold (risk failure) | Do a short easy hold with full presence |

### 11.4 Shadow scoring output

After running in shadow mode, the module produces:

```ts
export interface ShadowAssessmentResult extends AssessmentResult {
  readonly driveHealth: {
    readonly agency:    { dark: number; golden: number };  // 0-1 each domain
    readonly communion: { dark: number; golden: number };
    readonly eros:      { dark: number; golden: number };
    readonly agape:     { dark: number; golden: number };
  };
  readonly darkShadowSeverity: number;    // max pathology across drives in submergent domain
  readonly goldenShadowSeverity: number;  // max pathology across drives in emergent domain
  readonly dominantPathology: {
    drive: Drive;
    domain: 'dark' | 'golden';
    type: 'addiction' | 'allergy';
  } | null;
}
```

---

## Part XII — Holonic Return: Always Coming Back

### 12.1 The principle

A player at Orange with an unresolved Red-stage shadow cannot fully function at Orange. The game must always bring the player back to earlier stages where shadows exist. Advancement is not escape — it is deeper integration.

### 12.2 The return schedule

```
After every 3 encounters at the player's current stage:
  1. Scan all earlier stages for shadows with severity > 0.3
  2. If found: surface a "return encounter" at that (line, stage)
  3. Run the assessment module in SHADOW MODE
  4. Score drive-health, not capacity
  5. If drive-health exceeds threshold → shadow resolved → integration bonus
  6. If not → severity increases by 0.05 (shadow grows if ignored)
```

### 12.3 The return encounter experience

The player experiences a return encounter as:
1. **Narrative framing:** "Something from your past calls to you..." (not "you failed")
2. **Familiar tasks:** The same mechanics they've seen before, at an easier difficulty
3. **Different scoring:** The game watches HOW they engage, not WHETHER they succeed
4. **Resolution feedback:** "You've integrated this. It's part of you now, not a prison."

### 12.4 Advancement blocking (refined)

```
To advance from stage S to stage S+1:
  - All shadows at stages ≤ S must have severity < 0.3
  - OR: player must have attempted resolution (engagement counts)
  - Unresolved shadows manifest as debuffs in advancement encounters
  - The game NEVER permanently blocks — but makes advancement honestly harder
```

---

## Part XIII — The Complete Module Contract

> **Full specifications:**
> - Game modalities and multi-game architecture: `foundations/11-game-modalities.md`
> - Per-module drive assessment mechanics: `foundations/12-drive-assessment-mechanics.md`
> - Shadow/pathology model: `foundations/10-shadow-and-pathology.md`

Each of the 64 assessment modules is a **game pool** (not a single game). Per `foundations/11`, each module must contain ≥ 5 games across ≥ 3 modalities, plus 4 dedicated drive-probe games. The complete contract:

```ts
export interface CompleteStageModule {
  // Identity
  readonly line: Line;
  readonly stage: Stage;

  // Game pool (foundations/11)
  readonly games: readonly GameDefinition[];       // ≥ 5 games, ≥ 3 modalities
  readonly minimumModalities: 3;

  // Capacity assessment (Part II of this doc)
  readonly capacityScoringRubric: ScoringRubric;
  readonly minimumTrials: number;
  readonly estimatedDurationMs: number;

  // Drive-health probes (foundations/12)
  readonly driveProbes: {
    agency: DriveProbe;       // task with optional help
    communion: DriveProbe;    // cooperative variant
    eros: DriveProbe;         // harder-level offer
    agape: DriveProbe;        // return-to-easier offer
  };
  readonly shadowScoringRubric: ScoringRubric;

  // Content pool (anti-repetition)
  readonly itemPool: readonly AssessmentItem[];  // ≥ 20 items per game
  readonly itemSelector: (used: string[]) => AssessmentItem;

  // LLM rubrics (for qualitative lines)
  readonly llmCapacityRubric?: string;
  readonly llmDriveHealthRubric?: string;

  // Shadow archetypes (foundations/10)
  readonly addictionArchetype: string;   // "The Compulsive Planner"
  readonly allergyArchetype: string;     // "The Impulsive Actor"
  readonly healthyArchetype: string;     // "The Fluid Thinker"
}
```

### 13.1 Implementation priority (updated)

| Phase | Modules | What's built |
|---|---|---|
| **Phase 1** | Red × all 8 lines (8 modules) | Capacity tasks + drive probes + shadow archetypes |
| **Phase 2** | Amber + Magenta × all 8 lines (16 modules) | Adjacent stages for calibration |
| **Phase 3** | Orange + Green × all 8 lines (16 modules) | Mid-range stages |
| **Phase 4** | Infrared + Teal + Turquoise × all 8 lines (24 modules) | Edge stages |
| **Phase 5** | Composite onboarding + holonic return system | The orchestration layer |

Each phase delivers **playable, testable modules** that work in isolation before being composed.

---

## Part XIV — How This Replaces "Combat-Only" Progression

### 14.1 The old model (combat-centric)

```
Player → Combat encounter → Win/Lose → XP → Level up
```

This is a single-axis progression that measures nothing developmental.

### 14.2 The new model (integrative)

```
Player → Assessment encounter (capacity OR shadow mode)
  → Multi-dimensional scoring (accuracy, speed, depth, drive-health)
    → Profile update (altitude, ray, shadow, drive)
      → Encounter scheduler (what to surface next: advancement, shadow, variety)
        → Next encounter (tailored to the player's developmental edge)
```

Every encounter is:
- A **game** (fun, engaging, has stakes)
- An **assessment** (measures something real about the player)
- A **developmental catalyst** (pushes the player's edge, surfaces shadows, rewards integration)

### 14.3 The encounter types

| Type | Purpose | Frequency | Module mode |
|---|---|---|---|
| **Advancement** | Test capacity at current stage boundary | ~40% of encounters | Capacity mode |
| **Shadow return** | Heal earlier-stage shadows | ~20% of encounters | Shadow mode |
| **Variety** | Exercise under-used lines | ~20% of encounters | Capacity mode |
| **Integration** | Multi-line tasks that require coordination | ~10% of encounters | Both modes |
| **Boss synthesis** | Stage-gate exam requiring all lines + drives | ~10% of encounters | Both modes |

This replaces the "battle → XP → level" loop with a **developmental loop** where every encounter serves the player's actual growth.
