# Onboarding Redesign Plan

> **Depends on:** `architecture/10-stage-assessment-architecture.md` (the 64-module system + shadow diagnostics + holonic return)
> **Depends on:** `foundations/10-shadow-and-pathology.md` (the 128-shadow model)
> **Purpose:** Define the UX flow and player experience of the composite onboarding. For the underlying architecture (module contracts, scoring rubrics, drive-health probes), see the architecture doc. This document focuses on *how it feels to play*.

---

## Part I — Why the Current Onboarding Fails

### 1.1 Specific UX bugs (observed)

| # | Bug | Root cause | Impact |
|:-:|---|---|---|
| 1 | **Cognitive:** rectangle stays filled between trials — can't tell if symbol repeated | `symbolDisplay.setFillStyle(0x333355)` resets color but the rectangle is visually identical to the "no stimulus" state. No clear visual gap between trials. | Player cannot distinguish "waiting" from "stimulus shown" |
| 2 | **Intrapersonal:** same scenario repeats | Only 6 scenarios; `getScenarioForLevel` uses `this.currentTrial % matching.length` — at level 3-4, only 2 scenarios exist, so they repeat immediately | Feels broken, no new information gathered |
| 3 | **Moral:** limited spectrum, scratches surface | Only 4 dilemmas with 3 options each. Options are tagged Red/Amber/Orange/Green but the scenarios don't probe the *unconscious* moral structure — they test *stated preference* | Cannot distinguish genuine moral development from social desirability |
| 4 | **Spiritual:** same temptation repeats | `getTemptations(topValue)` returns exactly 4 per value, and the staircase stays at the same level, so the same temptation appears multiple times | Feels repetitive, easily gamed once you see the pattern |
| 5 | **Willpower:** easily spoofed | Just hold the button — no multi-dimensional challenge. No delay-of-gratification, no strategic allocation, no "release when told" | A robot could pass at L8 Teal |
| 6 | **Post-probe result:** "Strong/Developing/Emerging" | `showProbeComplete` shows a single word based on accuracy > 0.8/0.5 | No meaningful feedback; doesn't reflect the multi-dimensional reality |
| 7 | **Final calibration gives inflated results** | Somatic: Teal, Moral: Teal, Willpower: Green — from 3-6 trials each | The staircase converges too fast on too little data |
| 8 | **Emotional:** basic recognition only | Ekman 6 faces with 4 options — measures "can you name emotions" not "how deeply do you understand them" | Cannot distinguish Red (self-other split) from Green (pluralistic empathy) |

### 1.2 Structural problems

1. **One probe per line, one parameter per probe.** A single n-back score cannot span 8 qualitatively different stages.
2. **No content pool.** Each probe has 4-6 items. Repetition is inevitable.
3. **No LLM scoring.** Moral, Intrapersonal, and Spiritual require qualitative evaluation that multiple-choice cannot provide.
4. **No cross-validation.** A single measure can be spoofed. Multiple dimensions (accuracy × RT × consistency × depth) cannot.
5. **The staircase is the wrong tool for stage assessment.** A staircase finds a *threshold on a continuous parameter*. Stages are *qualitative shifts*. You need to test *at each stage* and see if the person can operate there.

---

## Part II — The Redesigned Onboarding Flow

### 2.1 Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    ONBOARDING (3 sessions)                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Session 1: "Body & Mind" (15-20 min)                            │
│  ├── Somatic: binary search (start at Red, test up/down)         │
│  ├── Cognitive: binary search (start at Red, test up/down)       │
│  └── Emotional: binary search (start at Red, test up/down)       │
│                                                                   │
│  Session 2: "Depth" (20-25 min)                                  │
│  ├── Moral: binary search (start at Amber, test up/down)         │
│  ├── Intrapersonal: binary search (start at Red, test up/down)   │
│  └── Spiritual: binary search (start at Red, test up/down)       │
│                                                                   │
│  Session 3: "Action" (12-15 min)                                 │
│  ├── Willpower: binary search (start at Red, test up/down)       │
│  └── Interpersonal: binary search (start at Red, test up/down)   │
│                                                                   │
├─────────────────────────────────────────────────────────────────┤
│  After each session: partial profile is saved and displayed       │
│  After all 3: full profile is synthesised                        │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 The binary search algorithm

For each line:

```
1. Start at estimated_stage (default: Red for most, Amber for Moral)
2. Run the stage assessment module for (line, estimated_stage)
3. If PASSED with confidence > 0.6:
   a. Record: "player is AT LEAST at this stage"
   b. Move UP: estimated_stage = next_stage
   c. If at Turquoise: done (altitude = Turquoise)
   d. Else: go to step 2
4. If FAILED with confidence > 0.6:
   a. Record: "player is BELOW this stage"
   b. Move DOWN: estimated_stage = prev_stage
   c. If at Infrared: done (altitude = Infrared)
   d. Else: go to step 2
5. If confidence < 0.6:
   a. Run additional trials at this stage
   b. If still ambiguous after max_extra_trials: mark as "boundary" and report with low confidence
6. CONVERGED when: passed at S AND failed at S+1
   → altitude = S, confidence = min(pass_confidence, fail_confidence)
```

### 2.3 Quick-calibration mode (single session, ~20 min)

For players who want to start playing immediately:

1. Run ONE stage assessment per line at the estimated starting stage
2. If passed: altitude = that stage (with low confidence, refined during gameplay)
3. If failed: altitude = stage below (with low confidence)
4. Mark profile as `calibrationConfidence: 'low'`
5. The game's DDA system refines the profile over the first 5-10 encounters

This is the **MVP onboarding** — it uses the same modules but only runs one per line.

---

## Part III — Per-Probe Redesign Specifications

### 3.1 Cognitive Probe → Cognitive Assessment (Red stage)

**Current bug:** Rectangle stays filled, can't distinguish trials.

**Redesign:**
- **Visual:** Clear the stimulus area completely between trials (show empty dark circle, then flash the colored symbol). Add a 500ms blank gap with a visible "..." indicator.
- **Task 1:** n=2 n-back with distinct geometric shapes (not just colored rectangles). Each shape is clearly different (triangle, circle, square, star, diamond).
- **Task 2:** 2-step planning puzzle (simplified Tower of Hanoi: move 2 discs to target in minimum moves).
- **Measures:** accuracy, RT, planning time, error correction (did they undo a bad move?).
- **Trials:** 8 n-back + 3 planning = 11 total, ~3 minutes.

### 3.2 Emotional Probe → Emotional Assessment (Red stage)

**Current bug:** Too basic — just Ekman 6 recognition.

**Redesign:**
- **Task 1:** Emotion identification from *scenarios* (not faces). "Your friend just won a prize you also wanted. What are THEY feeling?" — tests self-other split.
- **Task 2:** Intensity rating. "How STRONG is this emotion?" (1-5 scale). Tests emotional granularity.
- **Task 3:** "What would YOU feel?" vs. "What would THEY feel?" — tests differentiation.
- **Measures:** accuracy, depth (can they name complex emotions?), self-other differentiation, RT.
- **Trials:** 4 scenarios × 3 questions each = 12 responses, ~4 minutes.

### 3.3 Moral Probe → Moral Assessment (Red/Amber stage)

**Current bug:** Limited spectrum, surface-level, easily gamed.

**Redesign:**
- **Task 1:** Dilemma with 5 options (not 3) spanning Red→Green. Each option is a *full sentence of reasoning*, not just an action.
- **Task 2:** "Why did you choose that?" — free-text response scored by LLM against Kohlberg rubric.
- **Task 3:** Follow-up: "What would change your mind?" — tests flexibility and depth.
- **Measures:** choice pattern (modal stage), justification depth (LLM), consistency across dilemmas, response to counter-argument.
- **Dilemma pool:** 12 dilemmas (not 4), randomly sampled. Player sees 4-5 per session.
- **Anti-gaming:** The LLM scores the *reasoning*, not the *choice*. A Green-stage choice with Red-stage reasoning scores as Red.

### 3.4 Intrapersonal Probe → Intrapersonal Assessment (Red stage)

**Current bug:** Repeats scenarios, measures emotional intelligence not intrapersonal.

**Redesign — fundamentally different approach:**
- **Task 1:** "Describe yourself in 3 words." Then: "Now describe yourself in 3 *different* words." Tests self-concept breadth.
- **Task 2:** Performance prediction: "How well do you think you did on the Cognitive test?" (1-10). Compare to actual. Tests metacognitive accuracy.
- **Task 3:** Scenario + "What part of you wants to do X? What part wants to do Y?" Tests parts-awareness.
- **Task 4:** "What are you feeling RIGHT NOW, in this moment?" Tests present-moment self-awareness.
- **Measures:** self-concept complexity (LLM), prediction accuracy, parts-language depth (LLM), present-moment awareness.
- **Scenario pool:** 15 scenarios (not 6), covering different domains (work, relationships, solitude, conflict, success, failure).
- **Anti-repetition:** Scenarios are drawn without replacement from the pool.

### 3.5 Spiritual Probe → Spiritual Assessment (Red stage)

**Current bug:** Same temptation repeats, measures value-holding not spiritual depth.

**Redesign:**
- **Phase 1:** Value ranking (keep — this is good).
- **Phase 2:** "Why is [top value] most important to you?" — free-text, LLM-scored for depth.
- **Phase 3:** Temptation scenarios — but with a LARGE pool (8 per value, not 4) and NO repetition.
- **Phase 4:** "After facing those temptations, has your ranking changed?" — tests coherence vs. rigidity.
- **Measures:** coherence (held value under pressure), depth of justification (LLM), flexibility (can they update without collapsing?), response time pattern (faster = more automatic = higher stage).
- **Anti-gaming:** The LLM evaluates whether the "hold" response is genuine conviction or performative. A player who always holds but gives shallow justification scores lower than one who occasionally yields but shows deep reasoning.

### 3.6 Somatic Probe (keep mostly as-is, extend)

**Current state:** Simple RT with foreperiods. This is actually decent for Red stage.

**Additions:**
- **Task 2:** Rhythm tapping (tap along with a beat, then continue after beat stops). Tests internalised rhythm.
- **Task 3:** Anticipatory timing (a ball moves across screen — tap when it reaches the target zone). Tests predictive motor control.
- **Measures:** RT, rhythm accuracy, anticipation accuracy, consistency.

### 3.7 Willpower Probe → Willpower Assessment (Red stage)

**Current bug:** Easily spoofed, single-dimensional.

**Redesign — multi-dimensional:**
- **Task 1:** Hold (keep, but with better perturbation — screen shakes, tempting "release for bonus" button appears).
- **Task 2:** Delay of gratification: "Tap now for 1 point, or wait 5 seconds for 3 points." Repeated 5 times with increasing wait.
- **Task 3:** Resist impulse: rapid stimuli appear — tap the GREEN ones, resist tapping the RED ones (even though they flash enticingly). This is Go/No-Go repurposed for willpower.
- **Task 4:** Strategic allocation: "You have 3 'effort tokens'. Some trials are worth more. Choose when to spend effort." Tests strategic willpower.
- **Measures:** hold duration, delay tolerance, impulse resistance (false alarm rate), strategic allocation quality, consistency across trials.
- **Anti-spoofing:** Multiple dimensions cross-validate. A player who holds perfectly but has zero delay tolerance and poor impulse resistance is inconsistent → low confidence → more testing.

### 3.8 Interpersonal Probe (keep structure, improve content)

**Current state:** Pattern prediction with arrows. Decent for Red stage.

**Improvements:**
- **Larger pattern pool:** 8 patterns per level (not 1 hardcoded pattern per level).
- **Social framing:** Instead of abstract arrows, use NPC character actions ("The companion moves left, then right, then..."). Add a character sprite.
- **Task 2:** "What is the companion trying to do?" — tests theory of intent, not just pattern recognition.
- **Measures:** prediction accuracy, adaptation speed (how quickly do they learn a new pattern?), intent-reading (LLM for free-text responses at higher stages).

---

## Part IV — Post-Assessment Results Display

### 4.1 Replace "Strong/Developing/Emerging" with meaningful feedback

After each line assessment, show:

```
┌─────────────────────────────────────────────────────────────────┐
│                     Cognitive: Red Stage                          │
│                                                                   │
│  You can hold 2 items in working memory and plan                 │
│  2 steps ahead. Your error-correction is developing.             │
│                                                                   │
│  ┌──────────────────────────────────────────────┐                │
│  │ Accuracy        ████████░░  80%              │                │
│  │ Speed           ██████░░░░  60%              │                │
│  │ Consistency     █████████░  90%              │                │
│  │ Self-correction ████░░░░░░  40%              │                │
│  └──────────────────────────────────────────────┘                │
│                                                                   │
│  Confidence: ████████░░ High                                     │
│                                                                   │
│  Next: this capacity will be exercised in combat                 │
│  through working-memory spells and planning puzzles.             │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Final profile display

After all lines are assessed, show the full radial chart with:
- Per-line altitude (stage name + ordinal)
- Per-line confidence (high/medium/low)
- Overall synthesised stage
- A narrative paragraph describing the player's developmental profile in plain language (LLM-generated)

---

## Part V — Integration with Existing Systems

### 5.1 The assessment modules feed into:

| System | How it uses assessment data |
|---|---|
| **Significator.altitudes** | Set from the binary-search convergence point |
| **Significator.taskStaircases** | Seeded from the assessment's difficulty parameters |
| **Significator.rayProfile** | Computed from altitudes via RayProfileComputer |
| **Significator.shadowLedger** | Detected from assessment patterns (e.g., high Cognitive but low Intrapersonal = repression signal) |
| **EncounterScheduler** | Uses the horizon line (lowest altitude) to schedule encounters |
| **Assessment DDA** | Uses the staircase seed to start encounters at the right difficulty |
| **Narrative** | Uses the synthesised stage to determine which story arc the player enters |

### 5.2 The `lineToTaskSlug` mapping

Correct (post-redesign):
```ts
Intrapersonal: 'self_report',
Spiritual: 'value_coherence',
Interpersonal: 'pattern_prediction',
```

---

## Part VI — Implementation Roadmap

### Immediate (this sprint): Fix UX bugs in current probes

These are quick fixes that make the current system usable while we build the proper one:

1. **Cognitive:** Add a clear visual gap between trials (hide rectangle, show "...", then show new stimulus)
2. **Intrapersonal:** Expand scenario pool to 15+, draw without replacement
3. **Moral:** Expand to 8+ dilemmas with 5 options each, add LLM justification scoring
4. **Spiritual:** Expand temptation pool to 8 per value, draw without replacement
5. **Willpower:** Add delay-of-gratification and impulse-resistance tasks
6. **Results display:** Replace "Strong/Developing/Emerging" with per-dimension bars
7. **lineToTaskSlug:** Fix the stale mapping

### Short-term (next 2 sprints): Build the assessment module system

1. Create `src/core/assessments/types.ts` with all shared types
2. Create `src/core/assessments/engine.ts` with the assessment runner
3. Implement Red-stage modules for all 8 lines
4. Implement Amber-stage modules for all 8 lines
5. Implement Magenta-stage modules for all 8 lines
6. Build the binary-search orchestrator
7. Build the AssessmentScene (generic Phaser renderer)

### Medium-term (next 4 sprints): Complete the 64-module system

1. Implement Orange through Turquoise for all lines
2. Build the multi-session onboarding flow
3. Build the quick-calibration mode
4. Integrate with combat (single-trial mode)
5. Build the practice mode (player-chosen training)

---

## Part VII — Anti-Gaming Design Principles

1. **Multiple dimensions cross-validate.** A player who scores high on accuracy but low on consistency is flagged for more testing.
2. **LLM scoring for depth.** You can't fake depth of reasoning by picking the "right" multiple-choice answer.
3. **Response time patterns reveal automaticity.** Genuine high-stage responses are *faster* (automatic), not slower (deliberate). A player who takes 30 seconds to pick the "Green" option is probably performing, not being.
4. **Consistency across sessions.** The profile is refined over time. A single lucky session doesn't permanently inflate.
5. **The game doesn't tell you what stage you're "supposed" to be at.** No social desirability cues.
6. **Regression is normal and visible.** The system expects fluctuation and doesn't penalise it — it just tracks it honestly.

---

## Part VIII — What Changes in the Player Experience

### Before (current):
- 8 quick probes, 2-3 minutes total
- Each probe is a single mini-game
- Result: "Strong/Developing/Emerging" per line
- Final: inflated stage assignments based on 3-6 trials
- Feels like: a quiz you can game

### After (redesigned):
- 3 sessions of 15-25 minutes each (or 1 quick session of 20 min)
- Each assessment is a rich, multi-task experience with narrative framing
- Result: per-dimension breakdown with confidence levels
- Final: honest stage assignments based on 30-50 data points per line
- Feels like: a deep, respectful exploration of who you are
- The assessment IS gameplay — the same tasks appear in combat
- You can always re-assess (practice mode) to refine your profile

The key shift: **the onboarding is not a gate you pass through once. It's the first chapter of an ongoing developmental conversation between you and the game.**
