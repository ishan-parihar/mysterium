# Red-Team Audit: Current State vs Design Intent

**Date:** June 23, 2026
**Status:** CRITICAL — architectural gaps remain between engine intelligence and player-facing experience
**Scope:** End-to-end audit of both gameplay modes (Direct Questioning + Story-Driven) against foundations docs and EVERGREEN-TWO-MODE-PLAN.md
**Method:** Full source code read (AgenticOrchestrator, FallbackProvider, EncounterScheduler, CandidateGeneration, ContextPipeline, ConsequenceEngine, cli-game.ts, scoring.ts) × 4 existing audits × 3 foundations docs (21, 26, EVERGREEN)

---

## 0. What Changed Since Previous Audits

Since RED-TEAM-AUDIT-FULL-FLOW.md (June 22), the following were implemented:

| Change | Status | Impact |
|--------|--------|--------|
| Direct Questioning has its own session flow (`runDirectQuestioningSession`) | ✅ DONE | 8-line rotation, write-in, no pass/fail labels |
| `evaluateSelfReflection()` for write-in analysis | ✅ DONE | Always passes — self-reflection is practice |
| Radar chart (`renderRadarChart`) | ✅ DONE | Shows developmental profile per line |
| Line-specific FallbackProvider content (Red/Orange/Amber stages) | ✅ DONE | 8 lines × 3 stages × 4 modalities = 96 content pools |
| `holonSource='self-reflection'` triggers write-in-only mode | ✅ DONE | AgenticOrchestrator skips MCQ for self-reflection |
| LLM exchange budget raised to 4 (was 2) | ✅ DONE | More room for genuine dialogue |
| Budget exhaustion prompt for `complete_encounter` | ✅ DONE | Prevents infinite loops |
| Null-safe driveScores with clamp() | ✅ DONE | Prevents NaN propagation |

**What did NOT change since the previous audits:**
- The LLM still acts as a narrative wrapper, not a profile-managing agent
- Questions are still deterministic/static when LLM is unreachable
- Options still don't probe genuine developmental edges
- No persistent session-level agent synthesizing across encounters
- No cross-encounter pattern recognition feeding into next question generation
- The two modes still share the same AgenticOrchestrator pipeline

---

## 1. EXECUTIVE SUMMARY: The Gap Between Engine and Experience

The game has **world-class architectural bones** — the Significator, encounter scheduler (7-criteria priority formula), CCI, auto-mode strategy, transformation detection, and all 10 core engines are implemented and wired. The FallbackProvider now has genuine line-specific content for 3 stages × 8 lines.

But the **player-facing experience** still has 5 fundamental problems that make it function as a shallow MCQ test rather than an evolutionary catalyst:

| # | Problem | Severity | Evidence |
|---|---------|----------|----------|
| 1 | **No persistent AI-agent managing the profile** — each encounter is isolated | 🔴 CRITICAL | `AgenticOrchestrator` runs per-encounter and terminates; no cross-encounter synthesis |
| 2 | **Questions are deterministic/static when LLM is down** — pre-authored pools, not adaptive | 🔴 CRITICAL | User's output: "LLM unreachable — falling back to module assessments" |
| 3 | **Options don't probe developmental edges** — MCQ choices are socially desirable, not revealing | 🔴 CRITICAL | "Stay honest — Integrity matters more than advancement" is obviously "correct" |
| 4 | **No genuine catalyst pressure** — 2-8 MCQ questions per session, no sustained engagement | 🟡 MAJOR | Direct Questioning: 8 questions, one per line, no follow-up probing |
| 5 | **Cross-contamination between modes** — Direct Questioning still shows story-level artifacts | 🟡 MAJOR | Holon names, modality headers appear in Direct Questioning mode |

---

## 2. THE TWO MODES: Design Intent vs Implementation

### 2.1 Direct Questioning Mode

**EVERGREEN-TWO-MODE-PLAN promises:**
```
Direct Questioning = Assessment-first (efficient, systematic, clear)
- 8 questions (one per line), probing current stage
- Options mapped to drive × polarity (not correct/incorrect)
- Immediate feedback showing which drive was expressed
- Radar chart showing developmental profile
- Session ends when all 8 lines are assessed
```

**What the code actually does (post-commit 612fd63):**

The `runDirectQuestioningSession()` function:
1. ✅ Shuffles 8 lines (Fisher-Yates)
2. ✅ Creates synthetic encounters with `holonSource: 'self-reflection'`
3. ✅ Forces `LanguageReflective` modality
4. ✅ Calls `runAgenticEncounter()` → AgenticOrchestrator
5. ✅ `evaluateSelfReflection()` always passes (correct — practice, not test)
6. ✅ Shows radar chart at end
7. ✅ Shows qualitative feedback (no PASSED/FAILED labels)

**What's STILL broken:**

#### Problem A: The Encounter List Shows Story Names in Direct Questioning

The user's output shows:
```
◇  Choose your encounter:
│  1. The Underground Passage  Embodied  diff:0.90  warmup
```

**Root cause:** `runDirectQuestioningSession()` creates encounters with `holonSource: 'self-reflection'` but the encounter list in the session loop at lines 1427-1441 still shows holon names from the world. The Direct Questioning path bypasses the normal encounter selection but the encounter metadata still carries story-level information.

**Fix:** In Direct Questioning mode, the encounter list should show LINE + STAGE, not holon names. The encounter selection message should be "Choose your developmental line:" not "Choose your encounter:".

Wait — looking at the code more carefully, this IS handled at line 1441:
```typescript
message: isDirectMode ? 'Choose your developmental line:' : 'Choose your encounter:',
```

But the encounter list at lines 1427-1441 still uses holon names even in Direct mode. The `isDirectMode` check at line 1427 shows:
```typescript
if (isDirectMode) {
  // Direct mode: show LINE + stage, personality-test style
  const lineLabel = CHALLENGE_NAMES[encLineName ?? ''] ?? encLineName;
  ...
}
```

**But this code is in the STORY-DRIVEN session loop** (lines 1343-1500), NOT in `runDirectQuestioningSession()`. The Direct Questioning session flow at lines 1127-1277 doesn't offer encounter selection at all — it just iterates through all 8 lines sequentially. So the user's pasted output showing "Choose your encounter" with holon names must be from the STORY-DRIVEN mode, not Direct Questioning.

**Actually, re-reading the user's output more carefully:**

```
◇  Choose your gameplay mode:
│  Direct Questioning — Personality-test style

═══ SESSION START ═══
  theme: balanced-development
  target: 20 encounters
```

Wait — this says "SESSION START" with "target: 20 encounters" — that's the STORY-DRIVEN session, not Direct Questioning. The Direct Questioning flow shows "DIRECT QUESTIONING" banner and "8 questions — one per line of intelligence."

So the user's output is actually from the STORY-DRIVEN mode, and the user is observing that:
1. The story-driven mode shows "Choose your encounter" with holon names — correct for story mode
2. The questions within story mode are still generic MCQ — this is the real problem
3. The questions don't reference the player's profile — no adaptive content

**Let me re-analyze the user's actual complaint:**

> "The UX-Flow for the direct-questioning still asks me the names of the world which are story-level gameplay"

This suggests the user ran Direct Questioning but encountered story-level names. Let me check if this is possible...

Looking at `runDirectQuestioningSession()` at line 1127-1277: It creates encounters with `holonSource: 'self-reflection'`. When it calls `runAgenticEncounter()`, the encounter has `holonSource: 'self-reflection'`. Inside `runAgenticEncounter()`:

1. If LLM is available: `runLanguageReflective()` is called. The LLM gets the system prompt from `buildContext()` which includes holon information. But `holonSource: 'self-reflection'` won't match any holon in the registry, so `selectHolons()` returns null primary. The LLM might still generate NPC-style content because the ASK_USER_QUESTION_TOOL description says "Always start with a narrative introduction that sets the scene — describe who is speaking."

2. If LLM is NOT available: `runFallback()` is called. Since `holonSource === 'self-reflection'`, the `isDirectQ` branch fires:
```typescript
narrativeIntro = '';
questionText = fallback.prompt ?? fallback.followUps?.[0] ?? 'What is present for you right now?';
options = []; // Empty → write-in only
```

So in fallback mode, Direct Questioning shows NO narrative intro and NO options — just the line-specific question. This is correct.

But if LLM IS available, the LLM path in `runLanguageReflective()` generates the prompt. The LLM receives a system prompt that says "You are conducting a deep developmental assessment through open-ended dialogue" and should generate a single evocative prompt. But the ASK_USER_QUESTION_TOOL description says "Always start with a narrative introduction that sets the scene — describe who is speaking." This CONFLICTS with the Direct Questioning intent.

**The user's observed output shows:**
```
INTRAPERSONAL LINE — SELF-REFLECTION
Look inward.
When you are completely alone, what is your relationship with yourself like?
    [1] I see it clearly — Self-knowledge is available to me right now
    [2] I rest in not-knowing — The question itself is the practice
    [3] Something stirs but resists words — The unconscious is speaking
    [4] I need a mirror — Others see what I cannot see alone
```

This has:
- A header "INTRAPERSONAL LINE — SELF-REFLECTION" — this is from the TaskRenderer's header
- Options [1]-[4] — these are MCQ options, not write-in
- "PASSED" — this is the evaluation result

This means the user ran into the `runModuleAssessment()` path, NOT the `runFallback()` path with `isDirectQ`. This happens when:
1. The module IS available (modRegistry has Intrapersonal:Red)
2. The modality is LanguageReflective
3. The LLM IS available (since `noLlm` is false)

Wait, but the user's output says "LLM unreachable". So `noLlm` would be true, and `runLanguageReflective()` wouldn't be called. Instead, `runFallback()` would be called.

But `runFallback()` checks `if (this.module)` first — if a module is available, it calls `runModuleAssessment()`. And `runModuleAssessment()` uses TaskRenderers which present MCQ options.

So the flow is:
1. LLM unreachable → `noLlm = true`
2. `AgenticOrchestrator.run()` → `this.noLlm` is true → `runFallback()`
3. `runFallback()` → `this.module` exists → `runModuleAssessment()`
4. `runModuleAssessment()` → `selectTaskForModality()` → picks `self_report` task
5. `presentModuleTask()` → TaskRenderer presents MCQ options
6. Player selects option → `evaluateViaDriveProbes()` or `evaluateSelfReflection()`

Wait, but `evaluateSelfReflection()` is only called when `holonSource === 'self-reflection'` in `runFallback()`. And `runModuleAssessment()` is called BEFORE the `runFallback()` switch statement. Let me re-read the code...

Actually, looking at `runFallback()`:
```typescript
private async runFallback(line: Line, stage: Stage, now: number): Promise<OrchestratorResult> {
    // CHECK: If we have an assessment module, use it for a real assessment
    if (this.module) {
      return this.runModuleAssessment(line, stage, now);
    }
    // ... rest of fallback
}
```

So if the module exists, `runModuleAssessment()` is called, which bypasses the `isDirectQ` check entirely. The `isDirectQ` check is only in the code AFTER `runModuleAssessment()` — which is dead code when a module exists.

This is a BUG: When the module exists AND LLM is unavailable, Direct Questioning encounters go through `runModuleAssessment()` which presents TaskRenderer MCQ options, NOT the write-in-only path.

**The fix should be:** In `runFallback()`, check `isDirectQ` BEFORE checking for module:
```typescript
if (this.encounter.holonSource === 'self-reflection') {
  // Direct Questioning: write-in only, no module assessment
  return this.runDirectQuestioningFallback(line, stage, now);
}
if (this.module) {
  return this.runModuleAssessment(line, stage, now);
}
```

Actually wait, let me re-read the runFallback more carefully...

```typescript
private async runFallback(line: Line, stage: Stage, now: number): Promise<OrchestratorResult> {
    // CHECK: If we have an assessment module, use it for a real assessment
    if (this.module) {
      return this.runModuleAssessment(line, stage, now);
    }

    // Original generic fallback when no module is available
    const fallback = getFallback(this.encounter.modality, line, stage);
    ...
    switch (encounterModality) {
      case 'LanguageReflective': {
        const isDirectQ = this.encounter.holonSource === 'self-reflection';
        if (isDirectQ) {
          narrativeIntro = '';
          questionText = fallback.prompt ?? ...;
          options = []; // Empty → write-in only
        } else {
          ...
        }
        break;
      }
      ...
    }
    ...
    const evaluated = isSelfReflection
      ? this.evaluateSelfReflection(narrativeSummary)
      : this.evaluateFallbackResponse(narrativeSummary);
}
```

Yes, confirmed: when `this.module` exists, `runModuleAssessment()` is called and the Direct Questioning write-in path is NEVER reached. This is the primary bug causing the user's observed behavior.

**Summary of the Direct Questioning mode issues:**

1. **BUG: Module-assessment bypass** — When module exists AND LLM is down, Direct Questioning goes through `runModuleAssessment()` which presents MCQ options, not write-in. The `isDirectQ` check in `runFallback()` is dead code when modules are loaded.

2. **LLM path doesn't manage profile** — When LLM IS available, `runLanguageReflective()` generates a prompt but doesn't receive the player's developmental patterns, previous responses, or shadow signals. The LLM operates in isolation per-encounter.

3. **No cross-encounter synthesis** — Each of the 8 questions is independent. The LLM doesn't know what the player said in questions 1-7 when generating question 8. The `buildContinuityContext()` only shows pass/fail + narrative summary, not "based on your Cognitive response, here's a deeper question for Emotional."

4. **Options still appear when they shouldn't** — The TaskRenderer always generates MCQ options. Even when `evaluateSelfReflection()` is designed for write-in, the presentation layer shows options.

### 2.2 Story-Driven Mode

**EVERGREEN-TWO-MODE-PLAN promises:**
```
Story-Driven = Engagement-first (immersive, narrative, implicit)
- 20 encounters with narrative arc (warmup → peak → cooldown)
- Each encounter is a narrative scenario with an NPC
- Choices are story decisions (not assessment questions)
- Scoring happens in background
- Consequence propagation (choices affect future encounters)
```

**What the code actually does:**

The story-driven session loop at lines 1343-1500:
1. ✅ Shows "SESSION START" with theme and target encounters
2. ✅ Renders session position (warmup/peak/cooldown)
3. ✅ Shows encounter metadata (holon name, modality, difficulty)
4. ✅ Offers 3-5 ranked encounter options (non-coercion)
5. ❌ Shows "PASSED" after each encounter — violates Veil
6. ❌ Shows "Your response reveals: Healthy balanced" — clinical feedback
7. ❌ No narrative consequence propagation between encounters
8. ❌ No NPC relationship evolution visible in narrative
9. ❌ Same MCQ format as Direct Questioning

**The core problem with Story-Driven mode:**

The story-driven mode uses the SAME `runAgenticEncounter()` → AgenticOrchestrator pipeline as everything else. The only difference is the encounter selection UI shows holon names instead of line names. The actual encounter content, evaluation, and feedback are identical.

For Story-Driven mode to work as designed:
- The AgenticOrchestrator should NOT show PASSED/FAILED
- The feedback should be narrative consequence only ("The Scar Queen nods...")
- The evaluation should be invisible — all scoring happens in background
- NPC relationships should evolve and be visible in narrative
- Choices should propagate consequences to future encounters

---

## 3. THE AI-AGENT GAP: Why No Genuine Catalyst

### 3.1 What the design requires

From foundations/21 §10.1:
> The LLM is not the game's brain — it is the game's voice. The scheduler decides what encounter to present; the LLM decides how to present it.

From foundations/24 §4:
> The scheduler reads: theta-decay per line, drive-balance, shadow-ledger, polarity vector, transformation-readiness...

From EVERGREEN §4.2:
> **Scoring Pipeline:** Response → Drive Detection → Polarity Detection → Stage Mapping → Shadow Detection → Score Update

### 3.2 What the code actually does

The `AgenticOrchestrator` runs **per-encounter** and terminates. Each encounter:
1. Receives a snapshot of the Significator
2. Builds a context prompt via `ContextPipeline`
3. Sends it to the LLM (or falls back to deterministic)
4. Gets 1-4 question-response exchanges
5. Evaluates the response
6. Updates the Significator
7. Returns the result

**What's missing:**

| Required Capability | Current State | Impact |
|---|---|---|
| **Profile synthesis across encounters** | `buildContinuityContext()` shows 3-encounter pass/fail summary | LLM doesn't know the player's patterns |
| **Adaptive question generation** | LLM generates questions from system prompt, not from player's specific edge | Questions are generic, not personalized |
| **Shadow trajectory tracking** | Shadow detection is keyword-based per-encounter | No pattern recognition across encounters |
| **Developmental pacing** | Fixed 4-question budget per encounter | No adjustment based on player's engagement |
| **Cross-encounter pattern recognition** | No persistent agent state | Each encounter is isolated |
| **Emotional regulation** | No pacing controller | Player can't be guided through difficult material |

### 3.3 The Persistent SessionAgent (What Should Exist)

```typescript
interface SessionAgent {
  // Lives across the entire session
  readonly history: EncounterHistory[];
  
  // Maintains running developmental synthesis
  synthesize(): DevelopmentalSynthesis {
    return {
      dominantPatterns: this.detectPatterns(),  // "Agency-dominant in Moral contexts"
      shadowTrajectory: this.trackShadows(),     // "DarkAddiction on Intrapersonal growing"
      emergentEdge: this.findEdge(),              // "Spiritual line at Amber threshold"
      emotionalPacing: this.assessPacing(),       // "Player is in deep engagement — push further"
    };
  }
  
  // Decides what the player needs NEXT
  nextTarget(synthesis: DevelopmentalSynthesis): TargetSpec;
  
  // Generates encounter content tailored to the player's edge
  generateContent(target: TargetSpec, modality: Modality): EncounterContent;
  
  // Tracks emotional pacing
  pacing: PacingController;
}
```

Without this agent, every encounter is isolated. The LLM generates questions from a static system prompt, not from the player's evolving profile. The game can never build genuine developmental pressure because it doesn't know what pressure the player has already been under.

---

## 4. THE SUPERFICIALITY PROBLEM: Why Options Don't Probe

### 4.1 The MCQ Options Problem

From the user's output:
```
What do you do?
    [1] Stay honest — Integrity matters more than advancement
    [2] Find a third path — There's always another option
    [3] Share credit — Both of you deserve recognition
    [4] Take credit — Survival requires boldness
```

**Problems:**
1. Option 4 is obviously "wrong" — socially undesirable
2. Options 1-3 are all "acceptable" — they don't distinguish between developmental stages
3. No option represents genuine shadow expression
4. The player learns to pick the "nice" answer, not express their actual position

### 4.2 What Genuine Developmental Options Look Like

For a Red-stage Moral encounter, options should be:
- **Option A (Red Agency/Healthy):** "You take the credit because the work was only possible through your leadership — without your direction, they'd have nothing to take credit for."
- **Option B (Red Agency/Shadow):** "You take the credit because weakness must be punished and strength rewarded — that's the natural order."
- **Option C (Red Communion/Healthy):** "You share credit because the work was collective — no single person owns what the group creates."
- **Option D (Amber aspiration):** "You follow the formal protocol — the institution decides who gets credit, not individuals."

Each option reveals the player's **actual developmental position**, not their ability to pick the socially correct answer.

### 4.3 The FallbackProvider Content Quality

The FallbackProvider has genuine line-specific content for Red/Orange/Amber stages. For example, `LR_MORAL_RED`:
```
'You witnessed someone being treated unfairly. What moved you — justice, loyalty, or self-preservation?'
```

This is better than generic content, but:
- It's still a single question per line×stage×modality combination
- The options are not provided — only the prompt
- When the LLM is unavailable, this single question is all the player gets
- No follow-up probing based on the response

---

## 5. THE PRESSURE PROBLEM: Why No Catalyst

### 5.1 The Exchange Budget

**LLM path:** 4 exchanges per encounter (was 2, raised in recent commit)
**Direct Questioning:** 8 questions total (one per line)
**Story-Driven:** 20 encounters × 4 exchanges = 80 total touchpoints

The exchange budget is now reasonable for individual encounters. The problem is not the budget — it's what happens within those exchanges.

### 5.2 Why 4 Exchanges Don't Create Pressure

A genuine developmental catalyst requires:
1. **Sustained engagement** with uncomfortable material (not just 1 question)
2. **Follow-up probing** that goes deeper based on what the player reveals
3. **Resistance encounters** where the player's defenses are gently challenged
4. **Integration moments** where the player synthesizes what they've learned
5. **Emotional pacing** that builds toward a peak and then consolidates

Currently, the LLM path does 1-4 MCQ questions and then evaluates. There's no:
- Follow-up probing ("You said you 'rest in not-knowing' — what happens when you try to know?")
- Resistance encounters (the LLM never challenges the player's position)
- Integration moments (the encounter just ends with `complete_encounter`)
- Emotional pacing (the budget is fixed, not adaptive)

### 5.3 The PASSED/FAILED Problem

From the user's output:
```
✓ PASSED
Your response reveals: Healthy balanced
```

This is STILL showing in the user's experience. The `evaluateSelfReflection()` always passes, but the `runModuleAssessment()` path (which is what the user hit) uses `evaluateViaDriveProbes()` which can return `passed: false`.

The `runModuleAssessment()` path at lines 856-865:
```typescript
const passThreshold = module.scoringRubric.passThreshold ?? 0.7;
const effectiveScore = isWriteInWithNoShadow ? Math.max(blendedScore, 0.55) : blendedScore;
const hasShadow = !!shadowFromWriteIn;
const passed = !hasShadow && effectiveScore >= passThreshold;
```

So PASSED/FAILED is still present in the module-assessment path. The `evaluateSelfReflection()` path (which always passes) is only reached when `runFallback()` is called AND `holonSource === 'self-reflection'` AND no module exists.

---

## 6. BLIND SPOTS

### 6.1 The FallbackProvider Has Content But No Delivery Mechanism

The FallbackProvider has excellent line-specific content for 3 stages × 8 lines × 4 modalities = 96 content pools. But this content is only delivered when:
1. LLM is unavailable AND
2. No module exists (dead code path when modules are loaded)

The content is effectively unreachable in the current architecture because `runModuleAssessment()` takes precedence over the `isDirectQ` path in `runFallback()`.

### 6.2 The Direct Questioning Session Doesn't Use FallbackProvider Content

`runDirectQuestioningSession()` creates encounters with `holonSource: 'self-reflection'` and `modality: 'LanguageReflective'`. When it calls `runAgenticEncounter()`, the AgenticOrchestrator routes based on:
- `noLlm` flag → `runFallback()` → `runModuleAssessment()` (if module exists)
- LLM available → `runLanguageReflective()` → LLM generates prompt

Neither path uses the FallbackProvider's line-specific LanguageReflective content. The FallbackProvider content is only used in the dead-code path of `runFallback()` when no module exists.

### 6.3 The ContextPipeline Doesn't Inject Player Patterns

The `ContextPipeline.buildContext()` assembles:
- Holon descriptions
- Frequency spec (tone, vocabulary, values)
- Encounter spec (line, stage, modality)
- Modality rubric
- Consequence context (3-encounter narrative summaries)
- Player state (layer, transformation proximity, energy, drive signals, shadow signals)

What it DOESN'T inject:
- The player's specific developmental patterns across encounters
- Previous write-in responses and what they revealed
- Shadow trajectory (growing/stable/resolving)
- Drive balance trends (is Agency increasing while Communion decreases?)
- What the player's current developmental edge is
- What questions would be most catalytic right now

### 6.4 The Veil Is Violated in Both Modes

From foundations/20:
> The game must NEVER show: Assessment scores, drive-health values, developmental measurements, polarity vectors, shadow ledgers, stage altitude or progression percentages.

**Violations in current output:**
- `✓ PASSED` — diagnostic
- `Your response reveals: Healthy balanced` — clinical
- `layers: ⚡Infrared ⚡Magenta ●Red ◌Amber` — meta
- `module: Intrapersonal:Red` — raw identifier
- `diff:0.90` — scoring metric
- `CCI 45.2%` — composite index

The evergreen plan says both modes must "feel like a game, not a test." The current output feels like a test.

### 6.5 The Story-Driven Mode Has No Narrative Consequence Propagation

From foundations/21 §3.4:
> Every encounter produces outputs to at least one of: telemetry, consequence vector, polarity vector, integration signal

The `ConsequenceEngine.applyConsequences()` does update:
- Polarity traces ✅
- Theta timestamps ✅
- Drive balance ✅
- Shadow entries ✅
- NPC relationships ✅

But NONE of these are surfaced in the player's narrative experience. The player never sees:
- "The Scar Queen remembers your last choice and treats you differently"
- "The faction's disposition toward you has shifted"
- "A shadow pattern from your Moral line is beginning to affect your Interpersonal encounters"

The consequence pipeline runs silently. The player sees "PASSED" and moves on.

---

## 7. UPGRADE AREAS (Prioritized)

### Phase 0: Fix the Direct Questioning Bug (1 day)

**P0.1:** In `AgenticOrchestrator.runFallback()`, check `holonSource === 'self-reflection'` BEFORE checking for module. This ensures Direct Questioning encounters use the write-in path, not the TaskRenderer MCQ path.

**P0.2:** When LLM is available AND encounter is self-reflection, skip the ASK_USER_QUESTION_TOOL's "Always start with a narrative introduction" instruction. The Direct Questioning prompt should be clean and direct.

**P0.3:** Remove PASSED/FAILED from player-facing output in both modes. Replace with qualitative feedback.

### Phase 1: Build the Persistent SessionAgent (1-2 weeks)

**P1.1:** Create a `SessionAgent` class that lives across the entire session, maintaining:
- Running developmental synthesis
- Cross-encounter pattern recognition
- Shadow trajectory tracking
- Emotional pacing controller

**P1.2:** Inject the agent's synthesis into the ContextPipeline so the LLM receives:
- "Based on your last 5 responses, your Agency drive shows Dark-Addiction patterns in Moral contexts"
- "Your Spiritual line has been avoiding Golden-Allergy for 3 encounters"
- "The player is in deep engagement — push further on Intrapersonal"

**P1.3:** Allow the agent to generate follow-up questions within an encounter based on what the player reveals. Remove the fixed exchange budget in favor of agent-determined pacing.

### Phase 2: Genuine Developmental Options (1 week)

**P2.1:** Design options that map to drive × polarity × stage, where NO option is obviously "correct" and each represents a genuine developmental position.

**P2.2:** Include at least one option that represents genuine shadow expression (plausible, tempting, but revealing).

**P2.3:** Options should be calibrated to the player's current altitude — Red options are different from Green options for the same dilemma.

### Phase 3: Veil-Compliant Feedback (1 week)

**P3.1:** Remove all clinical/meta language from player-facing output:
- ❌ "PASSED" / "FAILED" → ✅ Narrative consequence only
- ❌ "Your response reveals: Healthy balanced" → ✅ NPC reaction
- ❌ "layers: ⚡Infrared ⚡Magenta ●Red ◌Amber" → ✅ Environmental shift
- ❌ "module: Intrapersonal:Red" → ✅ "The Underground Passage"
- ❌ "diff:0.90" → ✅ Hidden from player

**P3.2:** Show developmental insights as narrative, not data:
- ❌ "Agency: 0.8, Communion: 0.3" → ✅ "Something about you leans toward独自承担 rather than sharing the burden"

**P3.3:** Defer all quantitative feedback to a post-session summary (optional, player-initiated).

### Phase 4: Story-Driven Mode Differentiation (2 weeks)

**P4.1:** In Story-Driven mode, the AgenticOrchestrator should:
- NOT show PASSED/FAILED
- Show narrative consequence only
- Defer all assessment feedback to session end
- Surface NPC relationship changes in dialogue

**P4.2:** Implement consequence propagation:
- Choices affect future encounter selection
- NPC memories surface in later encounters
- Shadow patterns compound across encounters
- World state changes based on player choices

**P4.3:** Implement the narrative beat system:
- Active story arcs gate encounters
- Narrative coherence influences encounter selection
- Story milestones trigger developmental insights

---

## 8. WHAT'S WORKING WELL

Despite the critical findings, the architecture has strong foundations:

| Component | Status | Notes |
|---|---|---|
| 64 modules loaded | ✅ Working | Registry correctly stores all line×stage combinations |
| All 10 core engines | ✅ Wired | All engines called during gameplay |
| Significator as sole state vessel | ✅ Working | No legacy PlayerProfile pollution |
| ConsequenceEngine pipeline | ✅ Working | Encounter → consequence → Significator mutation |
| CCI computation | ✅ Working | 5-dimension composite index |
| Session arc | ✅ Working | Warmup → peak → cooldown |
| Infinite checkpoint model | ✅ Working | State saves after every encounter |
| Multi-provider LLM | ✅ Working | OpenAI, Anthropic, Gemini, Ollama supported |
| Line-specific FallbackProvider | ✅ Working | 96 content pools across 3 stages × 8 lines × 4 modalities |
| Direct Questioning session flow | ✅ Working | 8-line rotation, write-in, radar chart |
| Non-coercion (player chooses) | ✅ Working | Scheduler offers 3-5 ranked options |
| Theta-decay computation | ✅ Working | Exponential decay with 7-day half-life |
| Polarity 4-level aggregation | ✅ Working | Cell → line profile → master polarity |
| Transformation detection | ✅ Working | Threshold detection with convergence/saturation/clearance |
| Auto-mode strategy | ✅ Working | 9 themes, weight biasing |

---

## 9. CONCLUSION

The Mysterium codebase has **world-class architectural bones** — the Significator, encounter scheduler, CCI, auto-mode strategy, and transformation detection systems are all well-designed and properly implemented. The recent Direct Questioning mode improvements (write-in evaluation, radar chart, line-specific content) are genuine steps forward.

But the **player-facing layer** still doesn't leverage the engine's sophistication. The core problems are:

1. **No persistent AI-agent** — each encounter is isolated, so the game can never build genuine developmental pressure
2. **Deterministic fallback** — when LLM is down (which is the user's current state), everything becomes static MCQ
3. **Superficial options** — MCQ choices don't probe developmental edges
4. **Veil violations** — PASSED/FAILED and clinical labels destroy immersion
5. **Mode conflation** — Direct Questioning and Story-Driven share the same pipeline

The single most impactful change would be **building the Persistent SessionAgent** (Phase 1). Without it, every encounter is isolated and the game can never build the cross-encounter pattern recognition that makes a genuine evolutionary catalyst.

The second most impactful change would be **fixing the Direct Questioning fallback bug** (Phase 0) — ensuring that when LLM is down, Direct Questioning encounters use the write-in path, not the TaskRenderer MCQ path.

---

## 10. FOUNDATIONS CROSS-REFERENCE

| Foundation | Topic | Current Status | Gap |
|---|---|---|---|
| 10 | Shadow Model | Partial | Keyword detection works; no cross-encounter pattern recognition |
| 11 | Game Modalities | Broken | 7 modalities collapse to 1-2 active; modality-task mismatch |
| 12 | Drive Assessment | Partial | MCQ-based, generic options; not profile-adaptive |
| 14 | Catalyst Mechanics | Broken | No sustained engagement; no follow-up probing; no integration moments |
| 16 | Significator | Working | Sole state vessel; lifecycle functional |
| 17 | Transformation | Partial | Detection works; crucible lacks encounter logic |
| 18 | Great Way | Partial | MacroCatalystEngine partially wired; narrative system dead |
| 19 | Choice/Polarity | Implemented | 4-level aggregation works; doesn't shape encounter selection |
| 20 | Veil of Forgetting | Violated | PASSED/FAILED, clinical labels, raw metrics shown |
| 21 | Incarnation Architecture | Not implemented | No perceptual layer shift; no layered world |
| 22 | Holon Context Engine | Partial | LLM integration works; no profile synthesis |
| 24 | Encounter Scheduler | Implemented | 7-criteria formula works; doesn't respond to player patterns |
| 25 | CCI | Working | 5-dimension composite metric |
| 26 | Unified Core Architecture | Implemented | Module execution works; renderer abstraction works |
| 27 | Auto-Mode Strategy | Implemented | 9 themes, weight biasing |
| EVERGREEN | Two-Mode Plan | Partial | Direct Questioning has own flow; Story-Driven shares pipeline |
