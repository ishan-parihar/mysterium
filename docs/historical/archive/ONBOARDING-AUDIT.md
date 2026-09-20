# Onboarding Audit Report & Refactor Plan

> **Date:** 2026-05-17
> **Scope:** Onboarding system, probe modules, calibration algorithm
> **Verdict:** The current probes are structurally sound (modular, use real task engines) but **cannot measure the full 8-stage range** for most lines. The calibrator's accuracy→stage mapping is a placeholder with no construct validity. The resolution/rendering issues are now fixed.

---

## Part I — Resolution Issues (FIXED)

| Issue | Root cause | Fix applied |
|---|---|---|
| Text appears jagged/broken | CSS `image-rendering: pixelated` forces nearest-neighbor scaling on text | Removed; set to `auto` |
| Text blurry on HiDPI screens | Canvas renders at 1x, browser upscales | Added `zoom: 1/devicePixelRatio` to Phaser config |
| Sub-pixel text blur | `roundPixels: false` allowed fractional positioning | Set `roundPixels: true` |
| Font sizes too small at 720×1280 | 14-16px in a 720px-wide canvas scaled down to ~60% on most screens | Needs bump to 18-24px minimum (see Part III) |

**Status:** CSS and config fixes committed. Font size pass is in the refactor plan below.

---

## Part II — Fundamental Calibration Problem

### The current `accuracyToStage()` function is broken

```
accuracy >= 0.95 → White
accuracy >= 0.85 → Turquoise
accuracy >= 0.75 → Green
accuracy >= 0.65 → Orange
accuracy >= 0.5  → Amber
accuracy >= 0.35 → Red
accuracy >= 0.2  → Magenta
else             → Infrared
```

**Why this is wrong:**

1. **It treats all lines identically.** A 75% accuracy on n-back (Cognitive) and a 75% accuracy on affect-recognition (Emotional) do NOT mean the same developmental altitude. The tasks have different difficulty curves, different chance baselines, and different ceiling effects.

2. **It conflates task performance with developmental altitude.** Per `foundations/02`, stages are defined by *qualitative cognitive structures* (sensorimotor → preoperational → concrete → formal → post-formal), not by percentage scores on a single task variant.

3. **It cannot distinguish Infrared from Magenta from Red** in practice — because the probes all start at the same difficulty level. A player at Infrared (sensorimotor only) and a player at Red (early concrete operations) will both score ~50-70% on an n=1 n-back, because n=1 is trivially easy for anyone with symbolic capacity.

4. **It has no adaptive difficulty within the probe.** The staircase (1-up/2-down) is documented as the core mechanism (`foundations/08`) but is NOT used during onboarding. Each probe runs at a fixed difficulty.

### What the calibrator SHOULD do

Per `foundations/08 §2.5` and `MVP-BLUEPRINT.md §10-11`:

> Each onboarding probe runs a *fast staircase* (3–6 trials max) per
> task. The fast staircase uses larger step sizes than steady-state
> DDA (≈1.4× per reversal) and an aggressive convergence rule (any 2
> reversals → seat at midpoint).

The calibrator should:
1. Start each probe at a **known-easy level** for that task
2. **Increase difficulty** after correct responses (larger steps than steady-state)
3. **Decrease difficulty** after incorrect responses
4. After 2 reversals, **seat at the midpoint** — that's the estimated threshold
5. Map the **threshold difficulty level** to a stage using the **per-task difficulty→stage table** from `lines/01-cognitive.md §3.1`

---

## Part III — Per-Probe Audit Against First Principles

### Probe 1: CognitiveProbe (n-back)

| Aspect | Current state | Required per docs | Gap |
|---|---|---|---|
| Task used | n-back, n=1 fixed | n-back with adaptive n (1→2→3) | **Critical** — fixed n=1 cannot distinguish Red (n=2) from Orange (n=3) |
| Trials | 8 scored + 2 practice | 3-6 with fast staircase | Acceptable count, but no staircase |
| Difficulty adaptation | None | Fast staircase on `n` parameter | **Critical** — no adaptation |
| Stage discrimination | Can only distinguish "can do n=1" vs "cannot" | Must distinguish Infrared→White via n=1→5 | **Critical** — collapses 6 stages into 2 |
| Per `lines/01` | n=1 at Magenta, n=2 at Red, n=3 at Orange, n=4 at Turquoise | — | The probe must test at least n=1,2,3 |

**Verdict:** The probe uses the right task engine but at a fixed difficulty that cannot discriminate stages. Needs adaptive `n` parameter.

### Probe 2: EmotionalProbe (affect recognition)

| Aspect | Current state | Required per docs | Gap |
|---|---|---|---|
| Task used | Ekman 6 emotion identification | Affect recognition (correct) | ✓ Right task |
| Difficulty axis | Fixed — always 4 options, always basic emotions | Should vary: basic→complex→subtle→mixed | **Moderate** — cannot distinguish Orange (reflective) from Green (pluralistic empathy) |
| Stage discrimination | Accuracy on basic emotions only | Per `lines/02`: Red = self-other split, Amber = in-group only, Orange = any, Green = contradictory | **Critical** — no stage-appropriate stimuli |
| What's missing | No emotional complexity gradient | Needs: basic faces (Red), masked/incongruent faces (Amber), subtle/mixed emotions (Orange+) | **Critical** |

**Verdict:** Measures *whether* you can recognise emotions, but not *at what developmental depth*. A 7-year-old and a therapist would score similarly on basic Ekman 6.

### Probe 3: MoralProbe (dilemma decisions)

| Aspect | Current state | Required per docs | Gap |
|---|---|---|---|
| Task used | 4 dilemma scenarios with 3 options each | Dilemma decisions (correct) | ✓ Right task |
| Scoring | "correct" = deliberation > 2 seconds | Per `lines/03`: stage = moral circle breadth, not speed | **Critical** — conflates speed with depth |
| Stage discrimination | Cannot distinguish stages at all | Per Kohlberg: Red = self-interest, Amber = group-loyalty, Orange = universal-rights, Green = contextual | **Critical** — the options don't map to Kohlberg stages |
| What's missing | Options should be *tagged by moral stage* and the *pattern* of choices reveals the player's centre of gravity | Currently just measures "did you think about it" | **Critical** |

**Verdict:** The dilemmas are well-written but the scoring is wrong. Deliberation time is a weak proxy. The actual signal is *which moral orientation the player consistently chooses* across multiple dilemmas — egocentric (Red), conformist (Amber), principled (Orange), contextual (Green).

### Probe 4: IntrapersonalProbe (Go/No-Go)

| Aspect | Current state | Required per docs | Gap |
|---|---|---|---|
| Task used | Go/No-Go (tap green, resist red) | Per `lines/04`: introspection, self-labelling, subject→object | **Critical mismatch** — Go/No-Go measures *inhibitory control* (Cognitive line), not *intrapersonal awareness* |
| What it actually measures | Behavioural inhibition (rIFG, pre-SMA) | Should measure: self-observation, accurate self-report, meta-awareness | **Fundamental design error** |
| What's needed | A task that asks "what are you feeling/thinking right now?" and scores accuracy of self-report | Go/No-Go belongs in the Cognitive probe as an IC sub-task | **Redesign required** |

**Verdict:** Wrong task entirely. Go/No-Go is a cognitive-line task (inhibitory control). Intrapersonal requires a *self-report accuracy* task — e.g., predict your own performance, then compare prediction to actual; or label your current state from options and check consistency.

### Probe 5: SpiritualProbe (breath rhythm)

| Aspect | Current state | Required per docs | Gap |
|---|---|---|---|
| Task used | Breath synchronisation (tap at peak of expanding circle) | Per `lines/05`: value-hierarchy identification, coherence under load | **Critical mismatch** — breath sync measures *somatic rhythm*, not *spiritual intelligence* |
| What it actually measures | Sensorimotor synchronisation (cerebellum, basal ganglia) | Should measure: what the player values most, how stably they hold it | **Fundamental design error** |
| What's needed | A value-priority task: "rank these 5 things by importance to you" → then test coherence under distraction/temptation | Breath rhythm belongs in the Somatic probe | **Redesign required** |

**Verdict:** Wrong task entirely. Breath rhythm is a somatic-line task. Spiritual requires a *value-coherence* task — identifying what matters most and holding it under competing demands.

### Probe 6: SomaticProbe (reaction time)

| Aspect | Current state | Required per docs | Gap |
|---|---|---|---|
| Task used | Simple reaction time with variable foreperiods | Per `lines/06`: proprioception, coordination, breath-paced control, rhythm | **Partial** — RT is one somatic sub-domain but misses rhythm and sustained posture |
| Stage discrimination | Fast/normal/slow RT bands | Per `lines/06`: Infrared = reflex only, Red = power-body, Amber = disciplined forms, Orange = multi-skill | **Moderate** — RT alone cannot distinguish Amber (disciplined) from Orange (multi-skill) |
| What's missing | A rhythm component (sensorimotor synchronisation) and a sustained-hold component | Currently only measures simple RT | **Moderate** |

**Verdict:** Partially correct but too narrow. Should combine RT + rhythm tapping + brief held-input to cover the somatic line's breadth.

### Probe 7: WillpowerProbe (held input)

| Aspect | Current state | Required per docs | Gap |
|---|---|---|---|
| Task used | Hold a button for target duration, resist perturbation | Per `lines/07`: sustained effort, delay of gratification, goal-locking | ✓ Correct task family |
| Stage discrimination | Success/failure on 3-second holds | Per `lines/07`: Red = burst goals, Amber = long-form vows, Orange = multi-session | **Moderate** — fixed 3s hold cannot distinguish Red (burst) from Amber (sustained) |
| What's missing | Adaptive hold duration (staircase on targetMs) | Should start at 2s, increase to 5s, 8s, 12s | **Moderate** |
| Perturbation | Present but binary (flash or not) | Should scale: visual → auditory → temptation (early-release reward) | **Minor** |

**Verdict:** Right task, right direction, but needs adaptive difficulty on hold duration and perturbation intensity.

### Probe 8: InterpersonalProbe (Simon task)

| Aspect | Current state | Required per docs | Gap |
|---|---|---|---|
| Task used | Simon task (spatial inhibition) framed as "mirror the companion" | Per `lines/08`: attunement, coordination, theory-of-mind | **Moderate mismatch** — Simon measures spatial inhibition (Cognitive), not social attunement |
| What it actually measures | Stimulus-response compatibility (frontoparietal) | Should measure: reading another's intent, coordinating timing, perspective-taking | **Significant** |
| What's needed | A coordination task: NPC acts, player must predict/mirror with timing; or a false-belief task (what does the NPC think?) | Simon is a cognitive task with social framing | **Redesign recommended** |

**Verdict:** The social framing is good but the underlying task is cognitive (spatial inhibition), not interpersonal. Needs a genuine coordination/attunement mechanic.

---

## Part IV — The Calibrator Algorithm Problem

### Current: Linear accuracy→stage mapping

```
accuracy → stage (same for all lines)
```

This is a **placeholder**. It has no construct validity because:
- Different tasks have different chance baselines (Go/No-Go chance = 70%, n-back chance = ~30%, affect recognition chance = 25%)
- Different tasks have different ceiling effects
- The same accuracy on different tasks means different things developmentally

### Required: Per-task difficulty→stage mapping with adaptive staircase

Per `lines/01-cognitive.md §3.1`:

| Stage | n-back ceiling | Stroop SOA | WCST shift cadence |
|---|---|---|---|
| Infrared | n=1 (object permanence) | 1500 ms | — |
| Magenta | n=1 | 1200 ms | — |
| Red | n=2 | 1000 ms | rare |
| Amber | n=2 stable | 800 ms | low |
| Orange | n=3 | 700 ms | moderate |
| Green | n=3–4 | 600 ms | high |
| Turquoise | n=4 | 500 ms | very high |
| White | n=5 | 400 ms | continuous |

The calibrator should:
1. Run a fast staircase on the task's **difficulty parameter** (not accuracy)
2. Find the **threshold difficulty** where the player converges to ~70%
3. Map that threshold to a stage using the **per-task table above**

Example for Cognitive:
- Start at n=1. Player gets 4/4 correct → step up to n=2.
- Player gets 3/4 correct at n=2 → stay (below 2-consecutive threshold).
- Player gets 2/4 correct at n=2 → step down to n=1.
- After 2 reversals, seat at midpoint: threshold ≈ 1.5 → maps to Red (n=2 emerging).

---

## Part V — The Refactor Plan

### Priority 1: Fix the two fundamentally wrong probes

| Probe | Current task | Correct task | Redesign |
|---|---|---|---|
| **IntrapersonalProbe** | Go/No-Go (inhibitory control) | Self-report accuracy + meta-awareness | New probe: show the player a brief scenario, ask "what would you feel?", then show what happened and ask "were you right?" Score = prediction accuracy. Higher stages = more nuanced self-models. |
| **SpiritualProbe** | Breath rhythm (somatic) | Value-priority coherence | New probe: present 5 values, ask player to rank them. Then present 3 temptation scenarios that offer rewards for violating the top value. Score = coherence (did they hold their stated priority under pressure?). Higher stages = more stable value-hierarchy under load. |

### Priority 2: Add adaptive difficulty (fast staircase) to all probes

Every probe must:
1. Start at the **easiest level** for its task
2. **Step up** after 2 consecutive correct responses (1-up/2-down)
3. **Step down** after 1 incorrect response
4. Use **large step sizes** (1.4× per step, halving after 2 reversals)
5. **Terminate** after 2 reversals OR 6 scored trials (whichever first)
6. Report the **threshold difficulty level**, not raw accuracy

Per-probe difficulty axes:

| Probe | Difficulty parameter | Low end | High end |
|---|---|---|---|
| Cognitive | n-back `n` | n=1 | n=4 |
| Emotional | Stimulus complexity | basic 6 emotions | mixed/subtle/masked |
| Moral | Dilemma moral-circle breadth | self-interest vs. other | multi-stakeholder systemic |
| Intrapersonal | Self-model complexity | "am I happy/sad?" | "what part of me wants X while another wants Y?" |
| Spiritual | Value-temptation intensity | obvious temptation | subtle/ambiguous temptation |
| Somatic | RT deadline + rhythm complexity | 2000ms, simple beat | 400ms, polyrhythm |
| Willpower | Hold duration + perturbation | 2s, no perturbation | 10s, strong perturbation |
| Interpersonal | Coordination complexity | simple mirror | predict intent under deception |

### Priority 3: Fix the calibrator's stage-mapping function

Replace `accuracyToStage()` with a **per-line threshold→stage map**:

```ts
const COGNITIVE_THRESHOLD_MAP: [number, Stage][] = [
  [1.0, 'Infrared'],   // can barely do n=1
  [1.3, 'Magenta'],    // n=1 stable
  [1.8, 'Red'],        // n=2 emerging
  [2.2, 'Amber'],      // n=2 stable
  [2.8, 'Orange'],     // n=3 emerging
  [3.5, 'Green'],      // n=3-4
  [4.0, 'Turquoise'],  // n=4
  [5.0, 'White'],      // n=5
];
```

Each line has its own map. The calibrator uses the probe's reported threshold level (not accuracy) to look up the stage.

### Priority 4: Fix the Moral probe scoring

Replace "deliberation time > 2s = correct" with:

1. Tag each dilemma option with a **Kohlberg stage** (not just an orientation)
2. Track the **pattern** of choices across 4+ dilemmas
3. The player's moral altitude = the **modal stage** of their choices
4. Consistency bonus: if all choices are at the same stage, confidence is high

Example option tagging:
```
"Strike it down — clear the path"     → Red (self-interest)
"Tend its wound — risk the delay"     → Amber (care/duty)
"Step around it — leave it be"        → Orange (autonomy/rights)
```

### Priority 5: Improve the Interpersonal probe

Replace Simon task with a **coordination/prediction task**:

1. An NPC "companion" performs a sequence of 3 actions (move left, move right, pause)
2. The player must **predict** the companion's next action before it happens
3. Difficulty scales: predictable patterns (Red) → semi-random (Amber) → deceptive (Orange) → multi-agent (Green)

This measures theory-of-mind and attunement, not spatial inhibition.

### Priority 6: Merge breath rhythm into SomaticProbe

The current SomaticProbe (reaction time only) should be extended to include:
1. Simple RT (current — measures Infrared/Magenta)
2. Rhythm tapping (moved from SpiritualProbe — measures Amber/Orange)
3. Brief held-input (measures Red/Amber)

This gives the somatic probe three sub-tasks covering the full stage range.

### Priority 7: Font size pass

All text in the 720×1280 viewport should use:
- **Titles:** 28-32px
- **Instructions:** 20-22px
- **Body/options:** 18-20px
- **Status/meta:** 16px minimum
- **Never below 16px** — anything smaller is unreadable on mobile

---

## Part VI — How Onboarding Connects to the Game

### Current flow (broken)

```
Onboarding → fixed-accuracy calibration → MainMenu → Battle (uses old SaveData, ignores profile)
```

### Required flow (per MVP-BLUEPRINT)

```
Onboarding (adaptive probes)
  → Calibrated PlayerProfile (per-line altitudes via threshold mapping)
    → MainMenu (shows radial chart, stage, drives)
      → Red Stage encounters (difficulty seeded from onboarding thresholds)
        → Each encounter uses the SAME task engines as onboarding
          → Staircase continues from where onboarding left off
```

The critical connection: **onboarding's threshold levels become the initial staircase seeds for combat**. If onboarding found the player's n-back threshold at n=2.3, the first combat encounter starts the n-back staircase at level 2.3 — no cold-start, no re-calibration needed.

This means the `PlayerProfile.taskStaircases` field must be populated by onboarding with the threshold levels found during calibration, not with zeros.

---

## Part VII — Implementation Priority Order

| # | Task | Effort | Impact |
|:-:|---|---|---|
| 1 | Redesign IntrapersonalProbe (wrong task entirely) | Medium | Critical |
| 2 | Redesign SpiritualProbe (wrong task entirely) | Medium | Critical |
| 3 | Add fast-staircase to CognitiveProbe (adaptive n) | Medium | Critical |
| 4 | Fix Moral probe scoring (Kohlberg-stage tagging) | Low | Critical |
| 5 | Fix calibrator to use per-line threshold→stage maps | Low | Critical |
| 6 | Seed PlayerProfile.taskStaircases from onboarding thresholds | Low | High |
| 7 | Redesign InterpersonalProbe (coordination, not Simon) | Medium | High |
| 8 | Extend SomaticProbe with rhythm + held-input | Low | Moderate |
| 9 | Add adaptive difficulty to EmotionalProbe | Medium | Moderate |
| 10 | Add adaptive difficulty to WillpowerProbe | Low | Moderate |
| 11 | Font size pass across all probes | Low | UX |
| 12 | Add adaptive difficulty to InterpersonalProbe | Medium | Moderate |

Items 1-6 are **blockers** — without them, the onboarding cannot honestly calibrate a player's developmental profile. Items 7-12 are improvements that increase accuracy but don't break the system.

---

## Part VIII — What "Working Effectively" Looks Like

When the refactor is complete, the onboarding should:

1. **Take 12-20 minutes** — not 12 seconds, not 45 minutes
2. **Feel like a game** — each probe is a distinct mini-game with its own aesthetic
3. **Adapt in real time** — if you're crushing n=1, it jumps to n=2 within 3 trials
4. **Produce a valid psychograph** — per-line altitudes that match what a trained developmental psychologist would estimate from watching the player
5. **Seed the combat staircase** — so the first battle encounter is already at the player's edge
6. **Never feel like a test** — the player should feel they are *playing*, not being *assessed*
7. **Distinguish at least 4 stages per line** — Infrared/Magenta (low), Red/Amber (mid), Orange/Green (high), Turquoise/White (very high)
8. **Be honest about uncertainty** — if a probe has low confidence (few reversals, inconsistent responses), the system should say so and let the in-game DDA refine over the first few sessions

---

## Part IX — Relationship to Post-Onboarding Gameplay

The onboarding probes are **miniature versions of the same tasks used in combat**. This is by design — the player's first encounter with each task type happens in onboarding, in a low-stakes context. When they enter combat and see an n-back overlay, they already know what it is.

The Red stage encounter pool (per `stages/03-red-power.md §6`) uses:
- **Cognitive:** n-back at n=2, Stroop at 1000ms SOA
- **Emotional:** Affect recognition of anger/pride (egocentric emotions)
- **Moral:** "Kill/spare for advantage" dilemmas (Kohlberg Stage 1-2)
- **Intrapersonal:** "I am angry" self-labelling (first witness pauses)
- **Spiritual:** Power-deity invocation (transactional faith)
- **Somatic:** Power-body combat (dodge-or-die, strength-based)
- **Willpower:** Burst goals (short intense pursuits)
- **Interpersonal:** Allies as tools (transactional coordination)

If onboarding calibrates a player at Red, the game should present *exactly these* task variants at *exactly these* difficulty levels. The continuity between onboarding and gameplay is what makes the system feel coherent rather than arbitrary.

---

## Summary

The onboarding architecture (modular probes, per-line files, orchestrator) is **structurally correct**. The problems are:
1. Two probes use the **wrong task** for their line (Intrapersonal, Spiritual)
2. No probe uses **adaptive difficulty** (the staircase is documented but not implemented in onboarding)
3. The calibrator uses a **universal accuracy→stage map** instead of per-line threshold→stage maps
4. The Moral probe scores **deliberation time** instead of **choice-pattern stage**
5. The Interpersonal probe uses a **cognitive task** (Simon) with social framing instead of a genuine **coordination/attunement** task

Fix these five issues and the onboarding becomes a legitimate developmental calibration tool that feeds directly into the combat system.
