# Gameplay Modes Audit: Direct Questioning vs Story-Driven

**Date:** June 22, 2026
**Scope:** Red-team audit of current gameplay to design two distinct gameplay modes
**Foundation Cross-Reference:** 11 (game-modalities), 12 (drive-assessment), 14 (catalyst mechanics), 21 (incarnation)

---

## Executive Summary

The current gameplay has **three critical UX problems** that make it feel like "irrelevant QnA":

1. **Generic MCQ options** — "Focus", "Contentment", "Tiredness", "Suppression" are neutral labels that don't probe developmental state
2. **Score confusion** — 50% showing as PASSED breaks player trust in the assessment
3. **No mode distinction** — the game mixes assessment styles without committing to either

The user wants **two distinct gameplay modes** that serve different purposes:

| Mode | Purpose | Assessment Style | Player Experience |
|---|---|---|---|
| **Direct Questioning** | Systematic probe of 8×8×N matrix | Personality-test style questionnaires | "I'm discovering myself" |
| **Story-Driven** | Implicit assessment through narrative | RPG encounters where choices reveal state | "I'm living a story" |

---

## Root Cause Analysis: Why It Feels Like "Irrelevant QnA"

### Problem 1: Generic MCQ Options

**Current output:**
```
"Your partner says 'I'm fine' but their voice is flat and they turn away."
[1] Focus — A different interpretation
[2] Contentment — A different interpretation
[3] Tiredness — A different interpretation
[4] Suppression — something is wrong — Read the social cue
```

**Why it fails:**
- Options 1-3 have identical descriptions ("A different interpretation")
- No option reveals the player's actual developmental state
- The "correct" answer (Suppression) is obvious — it's not a developmental probe
- The player learns nothing about themselves

**What it should be:**
```
[INTERPERSONAL:RED — Social Cue Reading]

When someone says "I'm fine" but their body contradicts them,
what is your natural response?

[1] I notice the mismatch but stay silent — I sense they need space
    → Communion drive, Homeostatic polarity
[2] I directly ask what's wrong — I want to understand their truth
    → Agency drive, ReachingHigher polarity
[3] I mirror their energy — I meet them where they are
    → Eros drive, Homeostatic polarity
[4] I feel uncomfortable — I want to fix it but don't know how
    → Agape drive, ReachingHigher polarity
```

**Each option maps to a specific drive × polarity expression**, not just a "correct answer."

### Problem 2: Score Confusion

**Current output:**
```
Result: ✓ PASSED  score: 50%
```

**Why it fails:**
- 50% feels like a failure, not a pass
- The pass threshold is 0.5 (50%), which is too low
- Player trust in the assessment breaks

**Fix:**
- Raise pass threshold to 0.7 (70%)
- Display score as developmental depth, not percentage
- Show "Your response reveals [drive expression]" instead of "PASSED"

### Problem 3: No Mode Distinction

**Current output:**
```
Encounter 1: Embodied modality (social cue reading)
Encounter 2: Embodied modality (moral dilemma)
Encounter 3: Selection screen with 5 module options
```

**Why it fails:**
- The game mixes assessment styles without committing to either
- Encounters feel disconnected — no narrative arc
- The selection screen shows raw module identifiers

---

## The Two-Mode Design

### Mode 1: Direct Questioning (Personality-Test Style)

**Purpose:** Systematically probe the player's developmental state across the 8×8×N matrix

**Foundation mapping:** foundations/11 §2.1 (Language-Based Reflective) + foundations/12 (Drive Assessment Mechanics)

**Characteristics:**
- Structured, systematic assessment
- Clear questions about the player's actual capacities
- No narrative wrapper — pure assessment
- Like MBTI/Enneagram but for developmental capacity
- Each question maps to a specific line×stage×drive

**Implementation:**
- CLI: `mysterium --mode=direct` or menu selection
- Each encounter presents a question that directly probes a specific line×stage
- Options represent different developmental responses (not just correct/incorrect)
- Scoring maps directly to the 8×8 matrix
- Progress shows which lines/stages have been assessed

**Example session:**
```
═══ DIRECT QUESTIONING MODE ═══
Probing: Cognitive Line — Red Stage (Pattern Recognition)

Q1/8: When you encounter a new pattern, what is your first instinct?

  [1] Break it into parts and analyze each component
      → Agency drive, analytical mode
  [2] Look for connections between this and patterns I already know
      → Eros drive, synthetic mode
  [3] Trust my gut feeling about what it means
      → Communion drive, intuitive mode
  [4] Ask others what they see in it
      → Agape drive, collaborative mode

Progress: ████░░░░░░░░░░░░ 25% (2/8 lines assessed)
```

**Scoring:**
- Each option maps to a specific drive × polarity expression
- No "correct" answer — each reveals something about the player
- Progress shown as radar chart of the 8×8 matrix
- Session ends when all 8 lines are assessed (8 questions)

### Mode 2: Story-Driven (Immersive RPG)

**Purpose:** Assessment through narrative choices and encounters

**Foundation mapping:** foundations/11 §2.7 (Immersive RPG) + foundations/14 (Catalyst Mechanics)

**Characteristics:**
- Narrative-embedded assessment
- Player experiences the game world
- Assessment happens implicitly through choices
- Like a choose-your-own-adventure RPG
- Each encounter is a developmental catalyst

**Implementation:**
- CLI: `mysterium --mode=story` or menu selection
- Each encounter is a narrative scenario with an NPC
- Options are story choices, not assessment questions
- Scoring happens in the background
- Player sees narrative consequences, not scores

**Example session:**
```
═══ STORY-DRIVEN MODE ═══
Theme: balanced-development

  The Scar Queen stands before you in the Arena Pit.

  "You have faced the fire. Now face the mirror. What do you see?"

  [1] A survivor — scarred but standing
      → Agency drive, self-reliance
  [2] A warrior — ready for the next battle
      → Eros drive, aspiration
  [3] A learner — each scar teaches something
      → Communion drive, growth
  [4] A mystery — I don't know yet
      → Agape drive, openness

  ▰▰▱▱▱▱▱▱▱▱▱▱ WARMUP 1/20
```

**Scoring:**
- Each choice reveals the player's developmental state
- Scoring happens in the background (not shown to player)
- Player sees narrative consequences ("The Scar Queen nods..." vs "The Scar Queen frowns...")
- Progress shown as story advancement, not scores

---

## Blind Spots and Upgrade Areas

### Critical Gaps

| Gap | Current State | Required State | Priority |
|---|---|---|---|
| **Generic MCQ Options** | Options are neutral/generic | Options map to drive × polarity | CRITICAL |
| **Score Display** | 50% = PASSED | 70% threshold + developmental feedback | HIGH |
| **No Mode Selection** | One mixed mode | Player chooses mode at session start | HIGH |
| **Raw Module Identifiers** | "Intrapersonal:Red" | Narrative context | MEDIUM |
| **No Narrative Continuity** | Isolated encounters | Encounters build on each other | MEDIUM |

### Design Gaps

| Gap | Current State | Required State | Priority |
|---|---|---|---|
| **Direct Questioning Mode** | Not implemented | Structured 8×8×N assessment | HIGH |
| **Story-Driven Mode** | Partially implemented | Full narrative immersion | MEDIUM |
| **Mode-specific feedback** | Same for both modes | Different feedback per mode | MEDIUM |
| **Progress visualization** | Raw numbers | Radar chart (Direct) / story (Story) | LOW |

---

## Recommended Implementation Plan

### Phase 1: Fix Current UX Issues (1-2 days)
1. **Raise pass threshold to 0.7** — 50% should not feel like a pass
2. **Improve MCQ options** — each option maps to drive × polarity
3. **Fix score display** — show developmental feedback, not percentages
4. **Add narrative context** — wrap module identifiers in story

### Phase 2: Implement Direct Questioning Mode (3-5 days)
1. **Mode selection** — `mysterium --mode=direct` or menu
2. **Question generator** — create questions that probe specific line×stage
3. **Option mapping** — each option maps to drive × polarity
4. **Progress visualization** — radar chart of 8×8 matrix
5. **Session flow** — 8 questions (one per line), then summary

### Phase 3: Polish Story-Driven Mode (3-5 days)
1. **Narrative continuity** — encounters build on each other
2. **NPC relationships** — holons remember previous encounters
3. **Consequence propagation** — choices affect future encounters
4. **Shadow integration** — shadow encounters woven into narrative
5. **Transformation events** — crucible moments at stage transitions

### Phase 4: Integration and Testing (2-3 days)
1. **Mode switching** — can switch between modes mid-session
2. **Cross-mode consistency** — both modes update the same Significator
3. **Adaptive difficulty** — adjust based on player's actual level
4. **A/B testing** — compare engagement between modes

---

## Foundation Cross-Reference

| Foundation | Topic | Current Status | Required Status |
|---|---|---|---|
| 11 | Game Modalities | 7 modalities, mixed usage | Two distinct modes + 5 supporting |
| 12 | Drive Assessment | MCQ-based, generic options | Each option maps to drive × polarity |
| 14 | Catalyst Mechanics | Catalyst → Experience → Integration | Narrative catalyst delivery |
| 21 | Incarnation Architecture | Not implemented | Story-Driven mode as incarnation |
| 22 | Holon Context Engine | Minimal | Rich NPC context for encounters |
