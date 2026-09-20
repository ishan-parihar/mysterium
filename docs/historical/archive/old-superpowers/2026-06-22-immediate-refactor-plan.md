# Immediate Refactor Plan: Quick Wins and UX Fixes

**Date:** June 22, 2026
**Status:** Active
**Nature:** Concrete, actionable — based on current codebase awareness, subject to change
**Estimated Effort:** 3-5 days

---

## Quick Reference

| Task | Priority | Effort | Impact |
|---|---|---|---|
| Raise pass threshold to 0.7 | CRITICAL | 1 hour | Fixes score confusion |
| Improve MCQ option labels | CRITICAL | 2-3 hours | Fixes generic options |
| Add developmental feedback | HIGH | 2-3 hours | Replaces "PASSED" with insight |
| Add mode selection | HIGH | 2-3 hours | Enables two-mode system |
| Fix narrative context | MEDIUM | 1-2 hours | Wraps module identifiers |
| Add session summary | MEDIUM | 2-3 hours | Shows developmental insights |

---

## Task 1: Raise Pass Threshold to 0.7

**Problem:** 50% = PASSED feels wrong. Player trust breaks.

**Solution:** Change pass threshold from 0.5 to 0.7 across all modules.

**Files to modify:**
- `src/core/assessments/AgenticOrchestrator.ts` — line 866: `const passThreshold = module.scoringRubric.passThreshold ?? 0.5;`
- `src/core/data/modules/*/index.ts` — update default passThreshold in module definitions

**Acceptance criteria:**
- 50% score shows as "NEEDS GROWTH" (not PASSED)
- 70%+ score shows as "PASSED"
- 85%+ score shows as "EXCELLENT"
- All module definitions updated

**Effort:** 1 hour

---

## Task 2: Improve MCQ Option Labels

**Problem:** Options are generic ("Focus", "Contentment", "Tiredness", "Suppression"). They don't probe developmental state.

**Solution:** Rewrite option labels to map to drive × polarity × stage alignment.

**Files to modify:**
- `src/core/assessments/cli/TaskRenderers.ts` — rewrite option labels in all renderers
- `src/core/assessments/AgenticOrchestrator.ts` — update fallback options

**Example transformation:**

Before:
```
[1] Focus — A different interpretation
[2] Contentment — A different interpretation
[3] Tiredness — A different interpretation
[4] Suppression — something is wrong — Read the social cue
```

After:
```
[1] I notice the mismatch but stay silent — I sense they need space
    → Communion drive, Homeostatic polarity
[2] I directly ask what's wrong — I want to understand their truth
    → Agency drive, ReachingHigher polarity
[3] I mirror their energy — I meet them where they are
    → Eros drive, Homeostatic polarity
[4] I feel uncomfortable — I want to fix it but don't know how
    → Agape drive, ReachingHigher polarity
```

**Acceptance criteria:**
- Each option has a descriptive label (not just a noun)
- Each option maps to a specific drive × polarity
- Options feel like meaningful developmental choices
- No option is obviously "correct"

**Effort:** 2-3 hours

---

## Task 3: Add Developmental Feedback

**Problem:** Score shows "PASSED" or "FAILED" — no developmental insight.

**Solution:** Replace percentage-based feedback with developmental feedback.

**Files to modify:**
- `scripts/cli-game.ts` — lines 1258-1278: update result display
- `src/core/assessments/AgenticOrchestrator.ts` — add feedback generation

**Example transformation:**

Before:
```
Result: ✓ PASSED  score: 50%
drives: Age:ok Com:ok Ero:ok Aga:ok  ·Homeostatic
```

After:
```
Result: ✓ PASSED
Your response reveals: Communion drive, ReachingHigher polarity
Insight: You tend to seek understanding through direct engagement.
Shadow check: No shadow patterns detected.
```

**Acceptance criteria:**
- No raw percentages shown (unless verbose mode)
- Developmental insight shown for each response
- Drive expression shown (not just "ok")
- Shadow status shown when relevant

**Effort:** 2-3 hours

---

## Task 4: Add Mode Selection

**Problem:** No mode selection — game mixes assessment styles.

**Solution:** Add mode selection at session start.

**Files to modify:**
- `scripts/cli-game.ts` — add mode selection prompt
- `src/core/assessments/AgenticOrchestrator.ts` — add mode parameter

**Implementation:**

```typescript
// At session start
const mode = await select({
  message: 'Choose your gameplay mode:',
  options: [
    { value: 'direct', label: 'Direct Questioning', description: 'Personality-test style assessment' },
    { value: 'story', label: 'Story-Driven', description: 'Immersive RPG narrative' },
  ],
});
```

**Acceptance criteria:**
- Player can choose mode at session start
- `--mode=direct` and `--mode=story` CLI flags work
- Default mode is 'story' (more engaging)
- Mode selection persists for session

**Effort:** 2-3 hours

---

## Task 5: Fix Narrative Context

**Problem:** Player sees raw module identifiers ("Intrapersonal:Red").

**Solution:** Wrap module identifiers in narrative context.

**Files to modify:**
- `scripts/cli-game.ts` — lines 1180-1200: update encounter display
- `src/core/assessments/AgenticOrchestrator.ts` — add narrative context generation

**Example transformation:**

Before:
```
module: Interpersonal:Red
modality: Embodied
```

After:
```
Location: The Arena Pit
NPC: The Scar Queen
Challenge: Social Cue Reading
```

**Acceptance criteria:**
- No raw module identifiers shown
- Location, NPC, and challenge shown instead
- Narrative context matches encounter content
- Player feels immersed in story

**Effort:** 1-2 hours

---

## Task 6: Add Session Summary

**Problem:** No summary at session end — player doesn't know what they learned.

**Solution:** Add developmental summary at session end.

**Files to modify:**
- `scripts/cli-game.ts` — add session summary after last encounter

**Implementation:**

```
═══ SESSION COMPLETE ═══

Lines Assessed: 6/8 (Cognitive, Emotional, Moral, Intrapersonal, Interpersonal, Willpower)
Lines Pending: 2/8 (Spiritual, Somatic)

Dominant Drive: Agency (40% of responses)
Shadow Patterns: None detected
Developmental Stage: Red (survival/immediate)

Recommendation: Focus on Spiritual and Somatic lines to complete assessment.
Next Steps: Try Story-Driven mode for deeper engagement.
```

**Acceptance criteria:**
- Summary shows lines assessed/pending
- Dominant drive patterns shown
- Shadow patterns shown (if any)
- Developmental recommendations shown
- Mode suggestion for next session

**Effort:** 2-3 hours

---

## Implementation Order

| Order | Task | Dependencies | Effort |
|---|---|---|---|
| 1 | Raise pass threshold | None | 1 hour |
| 2 | Improve MCQ options | None | 2-3 hours |
| 3 | Add developmental feedback | Task 1, 2 | 2-3 hours |
| 4 | Fix narrative context | None | 1-2 hours |
| 5 | Add mode selection | None | 2-3 hours |
| 6 | Add session summary | Task 3 | 2-3 hours |

**Total estimated effort:** 10-15 hours (1.5-2 days)

---

## Acceptance Testing

### Test Case 1: Score Display
```
Input: Player selects option with 50% correctnessScore
Expected: "NEEDS GROWTH" (not "PASSED")
Actual: [to be verified]
```

### Test Case 2: MCQ Options
```
Input: Encounter presents social cue reading scenario
Expected: Options map to drive × polarity, not generic labels
Actual: [to be verified]
```

### Test Case 3: Developmental Feedback
```
Input: Player completes encounter
Expected: Developmental insight shown, not just "PASSED"
Actual: [to be verified]
```

### Test Case 4: Mode Selection
```
Input: Player starts session
Expected: Mode selection prompt appears
Actual: [to be verified]
```

### Test Case 5: Narrative Context
```
Input: Encounter is presented
Expected: Location/NPC/Challenge shown, not module identifiers
Actual: [to be verified]
```

### Test Case 6: Session Summary
```
Input: Player completes session
Expected: Developmental summary shown
Actual: [to be verified]
```

---

## Notes

This plan is **subject to change** based on:
- Player testing feedback
- Technical discoveries
- New theoretical insights
- Codebase evolution

**What's stable:** The six tasks and their acceptance criteria
**What's flexible:** Implementation details, specific code changes, timelines
