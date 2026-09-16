# lines/01 — Cognitive Line

> **Cross-references:** [[docs/foundations/07-neuroscience-of-development|07 — Neuroscience Of Development]] · [[docs/foundations/03-lines-of-intelligence-overview|03 — Lines Of Intelligence Overview]]

## 1. Purpose

Specify the Cognitive line — the depth-of-perspective-taking,
executive-function, reasoning capacity. Cognitive is the *substrate*
for several other lines (`lines/00`); Mysterium's combat verbs that target
spellcasting, planning, and combo sequencing all live here.

## 2. Scientific basis

### 2.1 Construct definition

Synthesis of:

- **Piaget** — sensorimotor → preoperational → concrete operational →
  formal operational → post-formal (vision-logic).
- **Diamond / Miyake-Friedman** — executive functions: inhibitory
  control, working memory, cognitive flexibility, plus higher-order
  reasoning, planning, fluid intelligence.
- **Cattell-Horn-Carroll** — fluid (Gf) and crystallised (Gc)
  intelligence as two evolutionary-psychological axes.
- **Wilber** — cognitive *altitude* as the capacity to take
  perspectives (1st → 2nd → 3rd → 4th → 5th-person and beyond).

Mysterium's working definition:

> Cognitive intelligence is the capacity to (a) hold information in
> mind, (b) inhibit prepotent responses, (c) shift mental sets, and
> (d) integrate these into perspective-taking, reasoning, and
> planning.

### 2.2 Validated assessments

| Domain | Assessment | What it measures |
|---|---|---|
| Working memory | n-back; Operation Span; Corsi block-tapping | dlPFC + parietal FPCN |
| Inhibitory control | Stroop, Simon, Go/No-Go, Flanker | dACC, anterior insula, rIFG |
| Cognitive flexibility | WCST, task-switching | PFC + striatum |
| Planning | Tower of London / Hanoi | rostral PFC (BA 10) |
| Reasoning | Raven's Advanced Progressive Matrices | FPCN as a whole |
| Sustained attention | Continuous Performance Test | DAN + cingulo-opercular |
| Processing speed | Choice RT, digit-symbol substitution | white-matter integrity, basal-ganglia |

Every Mysterium cognitive combat verb has a 1:1 mapping into one of these
laboratory tasks (`combat/02-cognitive-task-library.md`).

### 2.3 Brain regions

Frontoparietal control network (dlPFC, posterior parietal); cingulo-opercular
network for sustained control; salience network (dACC, anterior insula)
for interference detection; basal ganglia for set-switching. See
`foundations/07-neuroscience-of-development.md` for the canonical map.

## 3. Stage trajectory of the Cognitive line

| Stage | Capacity | In-game expression |
|---|---|---|
| **Infrared** | Sensorimotor; object permanence | Single-target tap-attack; no spell-casting |
| **Magenta** | Pre-operational; symbolic substitution | First spell unlocks; n=1 echo casting; symbolic match parries |
| **Red** | Pre-op late / concrete-op early; egocentric reasoning | n=2; combos of length 2; Stroop with low SOA tolerance |
| **Amber** | Concrete operational; rule-following | n=2 stable; combo length 3; WCST present but rare; sigil-tracing (Corsi) length 3 |
| **Orange** | Formal operational; hypothetical-deductive | n=3; combo length 4–5; ToL state-spaces of 4 disks; first dual-task |
| **Green** | Late formal / early post-formal; multi-perspective | n=3–4; complex span; rapid task-switching; 4-perspective dilemmas |
| **Turquoise** | Post-formal vision-logic | n=4; meta-WCST (rules-about-rules); recursive ToL |
| **White** | Trans-rational | n=5 rare; "still mind" combat states; cognitive load with spaciousness |

### 3.1 Per-stage cognitive task profile (defaults)

Pulled from `foundations/07` table; reproduced here so this doc is
self-contained:

| Stage | n-back ceiling | Stroop SOA (ms) | WCST shift cadence | ToL disks |
|---|---|---|---|---|
| Infrared | n=1 | 1500 | — | — |
| Magenta | n=1 | 1200 | — | 2 |
| Red | n=2 | 1000 | rare | 3 |
| Amber | n=2 | 800 | low | 3 |
| Orange | n=3 | 700 | moderate | 4 |
| Green | n=3–4 | 600 | high | 4–5 |
| Turquoise | n=4 | 500 | very high | 5 |
| White | n=5 | 400 | continuous | 5+ |

## 4. Game-design mapping

### 4.1 Assessment modality affinity associated

**Spellcaster, planner, controller.** A cognitive-leaning build favours
ranged abilities, multi-step combos, and area control. Compared with
somatic builds (which are dodge-heavy, present-moment) cognitive builds
*plan two moves ahead*.

### 4.2 Assessment tasks / defences / skills

| Verb | Cognitive task vehicle | Mechanic | Stage gating |
|---|---|---|---|
| Echo Casting (offensive spell) | n-back | Charge → spell payout scales with accuracy & sensitivity | Magenta+ for n=1; Red+ for n=2; Orange+ for n=3 |
| Chromatic Parry (defensive parry) | Stroop | Match aura colour, override word | Magenta+ |
| Sigil Tracing (boss-armour break) | Corsi | Reproduce flashed spatial sequence | Amber+ for length-3 |
| Combo Sequencing (planned chain) | Tower of London | Pre-program a 4–6 hit sequence | Orange+ |
| Elemental Shifting (stance-shift) | WCST | Detect rule change, swap stance | Amber+ |
| Focus Channeling (dual-task) | Complex span | Memorise commands while dodging projectiles | Orange+ |
| Asynchronous Wielding (task-switch) | Task-switching | Two enemies, two input sets, switching cue | Green+ |
| Spatial Counter (block direction) | Simon | Press direction matching strike side, not visual indicator | Red+ |
| Phantom Feint defence | Go/No-Go | Inhibit dodge on feint, dodge on strike | Magenta+ |

### 4.3 Module parameters(s) backed

- **Magic / Mana** — backed primarily by working-memory capacity. Spell
  cost in mana scales with n-back load.
- **Precision** — backed primarily by sustained attention; affects hit
  rolls.
- **Cognitive Defense** — backed by inhibitory control; affects Chromatic
  Parry and Spatial Counter outcomes.

### 4.4 Cognitive task(s) used to evaluate it in real time

Listed in 4.2. The full library is in `combat/02-cognitive-task-library.md`.

### 4.5 Depth progression

The cognitive line is the *fastest-moving* line for most players in MVP,
because the tasks are familiar from cognitive-training apps. Expected
in-game pace:

- Magenta n=1 → Red n=2: ~3 hours of focused play
- Red n=2 → Orange n=3: ~10 hours
- Orange n=3 → Green n=3.5: ~25 hours (the first plateau)
- Green → Turquoise n=4: requires accompanying intrapersonal /
  meta-cognitive growth; usually a *waiting* stage for the cognitive
  line as other lines catch up
- Turquoise → White: very slow, deliberately

Note the asymptote: cognitive line does *not* pull ahead indefinitely —
the line-ceiling rules in `lines/00` keep it within +1 of the
synthesised stage.

## 5. Enemy / encounter structure that trains this line

### 5.1 Module-level encounters archetypes (one per stage)

| Stage | Side-character | Task encoded |
|---|---|---|
| Infrared | "Sense-Seeker" — tracks the player by scent | Sustained attention only |
| Magenta | "Glimmer-Sprite" — flashes runes the player must match | n-back, n=1 |
| Red | "Pyre-Knight" — feints / strikes patterned attacks | Go/No-Go + n-back, n=2 |
| Amber | "Ledger-Sergeant" — sigil-locked, breaks only on Corsi sequence | Corsi length-3 |
| Orange | "Loom-Weaver" — projects rule-trees the player must complete | ToL 4-disk |
| Green | "Mirror-Sophist" — multiple aspects, switching tasks | Task-switching |
| Turquoise | "Recursion-Wraith" — meta-rule changes mid-encounter | meta-WCST |
| White | "Witness-Echo" — task is to *not* react (paradox) | Sustained inhibition + meta |

### 5.2 Cross-line encounters archetypes (cognitive-line dual-task pairs)

- **Cognitive × Somatic:** "The Drumheart" — n-back stimuli must be
  matched on a beat. Late dropouts cost encounter momentum.
- **Cognitive × Emotional:** "The Sorrowful Geometer" — Stroop with
  emotional-face stimuli (Stroop-aff) instead of colour-word.
- **Cognitive × Willpower:** "The Long Vigil" — sustained n-back over
  3+ minutes; willpower buffs reduce decay.

### 5.3 Main-boss archetype (cognitive synthesis exam)

Each stage's main boss has a cognitive phase exercising the full task
library at that altitude. Specifically detailed in
`stages/01-…08-…` and `enemies/03-main-bosses-synthesis.md`.

### 5.4 Shadow encounters (cognitive regression)

**"The Cold Architect"** — at Orange stage. Cognitively perfect; emotionally
absent. The fight is impervious to spells (they bounce). Defeating it
requires demonstrating *emotional* line capacity (empathy, vulnerability),
which raises emotional altitude. The lesson: cognition without emotion
is a fortress that cannot be entered.

This shadow is unlocked when the player's Cognitive line ≥ Orange and
the player's Emotional line is ≥ 2 stages behind. The trigger condition
is in `progression/05-shadow-work-and-regression.md`.

## 6. Architectural contract

```
const COGNITIVE_VERBS = {
  echoCasting:        { task: 'n_back',       altitudeMin: 'Magenta' },
  chromaticParry:     { task: 'stroop',       altitudeMin: 'Magenta' },
  spatialCounter:     { task: 'simon',        altitudeMin: 'Red'     },
  phantomFeintDefence:{ task: 'go_no_go',     altitudeMin: 'Magenta' },
  sigilTracing:       { task: 'corsi',        altitudeMin: 'Amber'   },
  comboSequencing:    { task: 'tol',          altitudeMin: 'Orange'  },
  elementalShifting:  { task: 'wcst',         altitudeMin: 'Amber'   },
  focusChannelling:   { task: 'complex_span', altitudeMin: 'Orange'  },
  asyncWielding:      { task: 'task_switch',  altitudeMin: 'Green'   },
} as const;
```

Each verb has its own staircase per player. Combined cognitive altitude
is computed as a weighted aggregate over the staircases.

## 7. Open questions

- **Crystallised vs. fluid.** Mysterium primarily probes Gf (fluid). Gc
  (crystallised — vocabulary, world knowledge) is unaddressed. Should
  there be a "lore mastery" sub-line? It would let older players show
  developmental gains the FPCN tasks miss.
- **n-back ceiling at White.** n=5 is rare; even highly-trained subjects
  rarely sustain it. We should be cautious about staircase pressure
  pushing players into uncomfortable territory; the anti-frustration
  backstop must catch this.
- **Cross-task transfer claims.** Even if the player's in-game n-back
  scores climb, claiming "Gf has improved" requires offline validation.
  Mysterium's UI must avoid this overreach. `validation/00`.

## 8. Principles served

Principles **1, 2, 4, 7** — what is being trained, with established
validity, in a way that is earned, in a clean architecture.
