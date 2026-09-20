# lines/04 — Intrapersonal Line

## 1. Purpose

Specify the Intrapersonal line — the capacity to *introspect and report
clearly and accurately on what one sees, feels, and thinks*. The
gateway to wisdom. Without it, the other UL lines (Emotional, Moral,
Spiritual) cannot be honestly self-known. Mysterium's witness-pause,
self-tag, and integrate verbs live here.

## 2. Scientific basis

### 2.1 Construct definition

Synthesis:

- **Gardner** — intrapersonal as one of the multiple intelligences.
- **Loevinger** — ego development; sentence-completion test as gold
  standard.
- **Cook-Greuter** — ego-development extension to post-formal stages.
- **Kegan** — orders of consciousness — "subject becomes object" as the
  developmental motor.
- **Wilber** — intrapersonal as the *meta-line*: it is intelligence
  *about* the other lines.

Mysterium's working definition:

> Intrapersonal intelligence is the capacity to (a) attend to one's own
> interior, (b) accurately label what one finds, (c) hold internal
> states *as objects* of awareness rather than *as subjects* one is
> identified with, and (d) report this honestly.

### 2.2 Validated assessments

| Assessment | Measures |
|---|---|
| Loevinger Sentence Completion Test | Ego-stage assignment from open responses |
| Subject-Object Interview (Kegan) | Order-of-consciousness, what is held as object vs. subject |
| Mindfulness Attention Awareness Scale | Trait-level introspective access |
| Self-reflection and insight scale (Grant) | Two factors: reflection, insight |

### 2.3 Brain regions

Default-mode network (medial PFC, posterior cingulate, precuneus); insula
(interoception); fronto-insular regions for meta-awareness.

## 3. Stage trajectory

| Stage | Capacity | In-game expression |
|---|---|---|
| Infrared | None — pre-introspective; pure reaction | No introspective verbs |
| Magenta | Magical self — fantasy-image of self | Self-tag is the *imagined* identity, not the felt |
| Red | Egocentric self-identification — "I am the will" | First witness pauses; player can label "I am angry" |
| Amber | Conformist self — identity = role | Player labels "I am a soldier / priest / etc." |
| Orange | Reflective self — capacity for "what if I…" | Hypothetical self; prediction & reflection |
| Green | Pluralistic self — multiple selves, contextual | Multi-self awareness; able to say "part of me wants X, part Y" |
| Teal | Vision-logic self — meta-self; sees the developmental process | Witness of own stages; integrates pluralism |
| Turquoise | Non-dual — self transparent to awareness | Self as luminosity; no fixed identity |

## 4. Game-design mapping

### 4.1 Assessment modality affinity

**Slow, reflective, meta-tactical.** Intrapersonal-leaning builds excel at
*reading the long arc* of a fight, pausing to recompute, and avoiding
sunk-cost mistakes. They are weak in fast reflexive combat. They are
*the ones who survive the late-game by knowing when not to fight.*

### 4.2 Assessment tasks / defences / skills

| Verb | Task vehicle | Mechanic | Stage gating |
|---|---|---|---|
| Witness Pause | Sustained meta-awareness | Pauses encounter tasking for self/all; cost rises if used reactively | Red+ |
| Self-Tag | Affect / motive labelling | Correctly labels own current state from a list; unlocks next-action choices | Red+ |
| Integrate | Hold an aspect "as object" rather than "as subject" | Brief mini-game of describing a felt aspect *as if* from outside | Orange+ |
| Reflection Strike | Damage scales with accuracy of post-fight self-report | Post-fight quiz: "What did you do well? Where did you slip?" | Orange+ |
| Multi-Self Map | Visualise current motive composition | Pie-chart mini-game; correct allocation buffs subsequent attacks | Green+ |
| Process View | See the line's own development arc; gain insight buffs | Periodic glimpse of the radial chart with developmental commentary | Teal+ |

### 4.3 Module parameters(s) backed

- **Insight** — accuracy of self-report; gates Reflection Strike scaling
- **Witness** — meta-awareness duration in combat
- **Integration** — speed of subject-to-object shifts on charged content

### 4.4 Cognitive task vehicles

- Affect / motive labelling under load
- Self-other-perspective tasks
- Self-prediction (predict own next-fight performance, score accuracy)
- Replay analysis (watch own fight, identify moves)

### 4.5 Depth progression

The intrapersonal line is **fast at first, then slow**. Early gains
(Red → Amber → Orange) come from simple labelling exercises. Late
gains (Green → Teal → Turquoise) require sustained practice and
typically lag cognitive altitude by ~1 stage in MVP players.

The line's velocity is *strongly coupled* to the state-training
mini-game (`docs/foundations/04-states-of-consciousness.md`). Players who engage state practice
advance intrapersonal faster.

## 5. Enemy / encounter structure

### 5.1 Module-level encounters archetypes

| Stage | Side-character | Encoded test |
|---|---|---|
| Infrared | "Mirror-Pool" — passive; the player walks past | No intrapersonal demand |
| Magenta | "Phantom-Self" — projects a mirror of the player's *imagined* identity | Confront fantasy-self |
| Red | "Echo-Warrior" — repeats the player's last action; defeated by *not* repeating | Self-pattern recognition |
| Amber | "Role-Master" — accuses the player of identity violations | Hold or release a role |
| Orange | "Doubt-Whisperer" — projects hypothetical self-criticisms | Reflection accuracy under criticism |
| Green | "Council of Selves" — five aspects of the player; one is lying | Multi-self detection |
| Teal | "Process-Witness" — narrates the player's developmental arc; misnames triggers | Catch the misnaming |
| Turquoise | "Luminous Other" — the player's witness *as another being* | Recognition without grasping |

### 5.2 Cross-line encounterses

- **Intrapersonal × Cognitive:** "The Self-Strategist" — n-back where
  the stimuli include the player's own past actions.
- **Intrapersonal × Emotional:** "The Heart-Phantom" — affect-recognition
  task on the player's own affect (heart-rate-paced if available).
- **Intrapersonal × Willpower:** "The Inner Critic" — sustained-effort
  task with intrusive self-criticism prompts; willpower stabilises.

### 5.3 Main-boss role

The intrapersonal phase of synthesis exams typically appears as a
*reflection moment* — a forced stillness where the player must accurately
self-report. Misreports cost a phase rewind.

### 5.4 Shadow encounters

**"The Unexamined"** — at Orange stage. The shadow of running on
identity-by-default without inquiry. The fight is unwinnable until the
player names their *current motive* honestly from a forced-choice list
that includes uncomfortable options ("I want to win; I want to look
strong; I want to feel relief"). Honest naming → fight unlocks.

**"The Hall of Selves"** — at Green stage. The shadow of pluralism
without integration. The player meets ten selves; nine are aspects, one
is the integrating witness. Misidentifying causes fight reset.

## 6. Architectural contract

```
const INTRAPERSONAL_VERBS = {
  witnessPause: { task: 'meta_awareness_hold',  altitudeMin: 'Red' },
  selfTag:      { task: 'self_label',           altitudeMin: 'Red' },
  integrate:    { task: 'subject_to_object',    altitudeMin: 'Orange' },
  reflection:   { task: 'self_report_accuracy', altitudeMin: 'Orange' },
  multiSelf:    { task: 'motive_allocation',    altitudeMin: 'Green' },
  processView:  { task: 'developmental_meta',   altitudeMin: 'Turquoise' },
} as const;

interface IntrapersonalProfile {
  selfReportAccuracy: number;       // 0..1, rolling
  witnessDurationMs:  number;       // total
  motiveTaxonomy:     Record<string, number>; // tracked motive labels & frequencies
}
```

Pure functions:

- `scoreSelfReport(predicted: SelfReport, actual: SessionStats): number`
- `detectMisreporting(history: SelfReport[]): MisreportPattern | null`

## 7. Open questions

- **Self-report fidelity.** All intrapersonal data is self-report,
  inherently noisy. Mysterium mitigates with *behavioural* corroborates
  (does the player's reported "calm" predict their next fight's
  performance?), but this is imperfect.
- **Withholding and false report.** A player may consistently
  under-report negative affect (defensive style). The system must
  detect this gently — without weaponising the detection. Default: a
  soft narrator nudge in private codex, never a public scolding.
- **Trauma-adjacent prompts.** Some self-report prompts may surface
  difficult material. Skip options must always exist; mental-health
  resources surfaced if patterns suggest distress.

## 8. Principles served

Principles **1, 4, 6** — completes the developmental picture by giving
the meta-line proper weight, ensures progression is honest about what
is felt, and protects the player from being weaponised against
themselves.

## 9. Relations

- **Horizontal axis:** [[docs/foundations/03-lines-of-intelligence-overview|foundations/03 — Lines of Intelligence Overview]] (the eight lines tabulated)
- **Adjacent lines:** [[docs/lines/03-moral|lines/03 — Moral Line]] · [[docs/lines/05-spiritual|lines/05 — Spiritual Line]] (the UL triad this line underwrites)
- **Multi-line matrix:** [[docs/lines/00-overview-multi-line|lines/00 — Multi-Line Overview]]
- **Corpus for this line** (one module per stage, 8 total): [[docs/concept-drafts/intrapersonal/03-red/module-spec|Intrapersonal / Red]] · and the other seven under `docs/concept-drafts/intrapersonal/<stage>/`
