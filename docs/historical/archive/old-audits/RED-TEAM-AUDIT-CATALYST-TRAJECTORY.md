# Red-Team Audit: Catalyst Trajectory & Evolutionary Catalytic Flow

**Date:** June 23, 2026
**Status:** CRITICAL — the game's engine is sophisticated but the player-facing layer is a thin deterministic MCQ wrapper
**Scope:** End-to-end audit of how the game's process leads individuals through genuine evolutionary catalysts vs superficial QnA
**Mode:** Red-Team — adversarial analysis against design intent

---

## 0. Executive Summary: The Core Diagnosis

**The game has world-class architectural bones but the player-facing experience is a personality test with RPG aesthetics.**

The Significator, encounter scheduler (7-criteria priority formula), CCI, auto-mode strategy, transformation detection, and all 10 core engines are implemented and wired. The FallbackProvider now has genuine line-specific content for 3 stages × 8 lines. But the player-facing layer has **6 fundamental problems** that make the game function as a shallow MCQ test rather than an evolutionary catalyst:

| # | Problem | Severity | What the player sees |
|---|---------|----------|---------------------|
| 1 | **No persistent AI-agent managing the profile** | 🔴 CRITICAL | Each encounter is isolated; no cross-encounter synthesis |
| 2 | **Questions are deterministic/static** | 🔴 CRITICAL | Pre-authored pools, not adaptive to player's edge |
| 3 | **Options don't probe developmental edges** | 🔴 CRITICAL | "Stay honest — Integrity matters more than advancement" is obviously "correct" |
| 4 | **No genuine catalyst pressure** | 🔴 CRITICAL | 1 MCQ question per line, no sustained engagement, no follow-up probing |
| 5 | **Direct Questioning shows story-level artifacts** | 🟡 MAJOR | Holon names, modality headers, "PASSED" labels leak through |
| 6 | **Veil is systematically violated** | 🟡 MAJOR | "PASSED", "Healthy balanced", layer labels, CCI %, diff scores all shown |

**The single most impactful change:** Build a Persistent SessionAgent that lives across the entire session, synthesizes the player's evolving profile at each step, and generates adaptive questions that target the player's specific developmental edge — not a static pool.

---

## 1. THE CATALYST TRAJECTORY GAP: What Foundations Promise vs What Happens

### 1.1 The Design Intent (foundations/14, 21)

From foundations/14 §2.2, every game session must follow the **Catalyst→Experience→Integration cycle**:

```
Phase 1: Catalyst Presentation
  → The game presents a challenge CALIBRATED TO THE PLAYER'S DEVELOPMENTAL EDGE
  → The challenge activates BOTH submergent (dark) and emergent (golden) unconscious
  → The game works WITH the contact boundary, not against it

Phase 2: Experience Processing
  → The player engages; behaviour reveals which drives are active, which are pathological
  → The game OBSERVES without judgment
  → Multiple exchanges build genuine developmental pressure

Phase 3: Integration/Evolution
  → Based on what surfaced, progression mechanics guide toward integration
  → The game doesn't force — it invites
  → The player FEELS growth, not told about it
```

From foundations/14 §5.2, each game has **internal progression**:
- Stage 1: ENCOUNTER (first sessions) — calibrate to player's edge
- Stage 2: RECOGNITION (after pattern emerges) — reflect patterns back implicitly
- Stage 3: INTEGRATION — present opportunities to respond DIFFERENTLY
- Stage 4: EVOLUTION — present next stage's capacity

From foundations/21 §10.1:
> "The LLM is not the game's brain — it is the game's voice. The scheduler decides WHAT encounter to present; the LLM decides HOW to present it."

From foundations/14 §6.2, each game performs **four operations on drives**: Balance, Strengthen, Heal, Evolve. Each requires different encounter mechanics.

### 1.2 What the Code Actually Does

The `AgenticOrchestrator` runs **per-encounter and terminates**. Each encounter:
1. Receives a snapshot of the Significator
2. Builds a context prompt via `ContextPipeline`
3. Sends it to the LLM (or falls back to deterministic MCQ)
4. Gets 1-4 question-response exchanges
5. Evaluates the response (keyword-based or LLM-scored)
6. Updates the Significator
7. Returns the result

**What's missing from the catalyst trajectory:**

| Foundation Requirement | Implementation Status | Impact |
|---|---|---|
| **Challenge calibrated to player's edge** | ❌ No edge detection — encounters are scheduler-selected, not edge-targeted | Player gets encounters at their stage, not at their growing edge |
| **Activates both dark and golden unconscious** | ⚠️ Shadow detection is keyword-based, not pattern-based | Shadow surfacing is random, not catalytic |
| **Works WITH contact boundary** | ❌ No boundary detection — game doesn't know if player is ready | Can overwhelm or underwhelm |
| **Multiple exchanges build pressure** | ❌ Direct Questioning: 1 question per line. Story: 4 MCQ exchanges max | No sustained engagement with uncomfortable material |
| **Reflects patterns back implicitly** | ❌ No cross-encounter pattern recognition | Each encounter is isolated; patterns invisible |
| **Presents opportunities to respond differently** | ❌ Same question types repeated; no adaptive re-presentation | Player can't demonstrate growth |
| **Performs 4 drive operations** | ⚠️ Scoring happens but doesn't shape next encounter | Operations are mechanical, not catalytic |
| **Player feels growth, not told** | ❌ "PASSED/FAILED" is explicitly diagnostic | Growth is told, not felt |

### 1.3 The Missing Catalyst Loop

The game currently runs a **linear loop**:
```
Schedule encounter → Present MCQ → Score → Update Significator → Next
```

The foundations require a **recursive catalyst loop**:
```
Detect player's edge → Generate catalyst AT that edge → Present via modality →
Observe response → Detect shadow/drive patterns → SYNTHESIZE findings →
Adapt next question based on what was just learned →
After encounter: integrate patterns into profile →
Shape next encounter based on accumulated synthesis →
Detect if player is ready for next stage's capacity →
```

**The recursive loop is completely absent.** Each encounter runs in isolation. The game never learns from what it just observed to generate the next question.

---

## 2. DIRECT QUESTIONING MODE: Detailed Audit

### 2.1 What the EVERGREEN plan promises

```
Direct Questioning = Assessment-first (efficient, systematic, clear)
- 8 questions (one per line), probing current stage
- Options mapped to drive × polarity (not correct/incorrect)
- Immediate feedback showing which drive was expressed
- Radar chart showing developmental profile
- Session ends when all 8 lines are assessed
```

### 2.2 What the code actually does

`runDirectQuestioningSession()` in cli-game.ts:
1. ✅ Shuffles 8 lines (Fisher-Yates)
2. ✅ Creates synthetic encounters with `holonSource: 'self-reflection'`
3. ✅ Forces `LanguageReflective` modality
4. ✅ Calls `runAgenticEncounter()` → AgenticOrchestrator
5. ✅ Shows radar chart at end
6. ✅ Shows qualitative feedback (no PASSED/FAILED labels in the DQ path)

### 2.3 What's STILL broken in Direct Questioning

**Problem A: The encounter list shows story names in Direct Questioning**

The user's output shows:
```
◇  Choose your encounter:
│  1. The Underground Passage  Embodied  diff:0.90  warmup
```

**Root cause:** When Direct Questioning is selected, `runDirectQuestioningSession()` handles the flow correctly with write-in prompts. BUT the user's output shows the STORY-DRIVEN session loop with holon names. This means the mode selection isn't routing correctly — the user selected "Direct Questioning" but got the story-driven encounter list.

Looking at the code: `runDirectQuestioningSession()` is called when `isDirectMode` is true, and it returns early. The encounter list with holon names only appears in the story-driven loop. So either:
1. The mode selection UI is confusing and the user selected "Story-Driven" thinking it was Direct Questioning
2. OR the Direct Questioning session flow is working but the encounter metadata still carries story-level information

**Problem B: Questions are deterministic when LLM is down**

When `LLM_ACTIVE = false` (which is the user's state — "LLM unreachable"), the flow is:
1. `AgenticOrchestrator.run()` → `this.noLlm = true` → `runFallback()`
2. `runFallback()` checks `isSelfReflection` first ✅ (this was fixed in recent commits)
3. If self-reflection: uses `getFallback()` to get line-specific content
4. Presents write-in prompt with no MCQ options ✅

So the fallback path IS correct for Direct Questioning now. The problem is that `getFallback()` returns a **single static prompt** per line×stage×modality. There's no adaptation based on the player's profile.

**Problem C: Questions don't reference the player's profile**

The FallbackProvider content for Direct Questioning (LanguageReflective + self-reflection) looks like:
```
'When you are completely alone, what is your relationship with yourself like?'
```

This is a **good question** — but it's the SAME question regardless of:
- What the player said in previous encounters
- What the Significator reveals about their Intrapersonal line
- What shadows have been surfaced
- What the player's specific developmental edge is
- What drive patterns have emerged across the session

**Problem D: No cross-encounter synthesis in Direct Questioning**

The `buildContinuityContext()` method builds a 3-encounter summary:
```
[RECENT JOURNEY — the player's developmental arc]
  1. [Intrapersonal:Red] ✓ PASSED — The Underground Passage witnessed your...
  2. [Moral:Red] ✗ FAILED — The Broken Crown presented...
```

This is injected into the LLM prompt. But:
- When LLM is unavailable, this context is irrelevant (fallback doesn't use it)
- Even when LLM IS available, the context is just pass/fail + narrative summary — no pattern recognition
- The LLM doesn't receive "based on your Emotional response, here's a deeper question for Moral"
- The LLM doesn't receive the player's write-in responses from previous questions

**Problem E: The LLM path doesn't manage profile across 8 questions**

When LLM IS available, `runLanguageReflective()` generates ONE prompt and ONE evaluation. But the Direct Questioning session calls `runAgenticEncounter()` 8 times (once per line). Each call creates a NEW `AgenticOrchestrator` instance with:
- Fresh `this.messages = []`
- No carry-over of previous encounter's messages
- No synthesis of what the player revealed in questions 1-7

The `initialMessages` parameter exists but is never populated across Direct Questioning encounters. Each of the 8 questions runs in complete isolation.

**Problem F: The Direct Questioning encounter shows MCQ options when LLM is down**

Looking at the user's output:
```
INTRAPERSONAL LINE — SELF-REFLECTION
Look inward.
When you are completely alone, what is your relationship with yourself like?
    [1] I see it clearly — Self-knowledge is available to me right now
    [2] I rest in not-knowing — The question itself is the practice
    [3] Something stirs but resists words — The unconscious is speaking
    [4] I need a mirror — Others see what I cannot see alone
```

This has MCQ options. But the `runFallback()` path for self-reflection sets `options = []` (empty array). So where are these options coming from?

**Root cause analysis:** The options shown are from the `TaskRenderer` path, not the fallback path. When `runFallback()` checks `if (!isSelfReflection && this.module)` — if the module exists AND it's NOT self-reflection, it calls `runModuleAssessment()`. But for self-reflection, it should go to the write-in path.

Wait — looking at the git diff from the recent commit, the fix was:
```typescript
const isSelfReflection = this.encounter.holonSource === 'self-reflection';
if (!isSelfReflection && this.module) {
  return this.runModuleAssessment(line, stage, now);
}
```

This should work. But the user's output shows MCQ options. This means either:
1. The `holonSource` is NOT 'self-reflection' in the user's encounter
2. OR the user is running a different code path than expected

Looking at the user's output more carefully:
```
module: Intrapersonal:Red
modality: Embodied
```

The modality is **Embodied**, not LanguageReflective! And the `holonSource` is `underground-passage`, not `self-reflection`. This is the STORY-DRIVEN session, not Direct Questioning. The user selected "Direct Questioning" but the mode selection routed them to the story-driven loop with encounter selection.

**This is the critical bug:** The mode selection UI shows "Direct Questioning — Personality-test style" but when selected, the code routes to `runDirectQuestioningSession()`. However, the user's output shows the story-driven encounter list. This means the user actually selected "Story-Driven" from the mode menu, NOT "Direct Questioning".

The user's complaint is valid though — even in Direct Questioning mode, the experience would still be superficial because of Problems A-E above.

---

## 3. STORY-DRIVEN MODE: Detailed Audit

### 3.1 What the EVERGREEN plan promises

```
Story-Driven = Engagement-first (immersive, narrative, implicit)
- 20 encounters with narrative arc (warmup → peak → cooldown)
- Each encounter is a narrative scenario with an NPC
- Choices are story decisions (not assessment questions)
- Scoring happens in background
- Consequence propagation (choices affect future encounters)
```

### 3.2 What the code actually does

The story-driven session loop at lines 1343-1500 of cli-game.ts:
1. ✅ Shows "SESSION START" with theme and target encounters
2. ✅ Renders session position (warmup/peak/cooldown)
3. ✅ Shows encounter metadata (holon name, modality, difficulty)
4. ✅ Offers 3-5 ranked encounter options (non-coercion)
5. ❌ Shows "PASSED" after each encounter — violates Veil
6. ❌ Shows "Your response reveals: Healthy balanced" — clinical feedback
7. ❌ No narrative consequence propagation between encounters
8. ❌ No NPC relationship evolution visible in narrative
9. ❌ Same MCQ format as Direct Questioning

### 3.3 The story-driven mode uses the SAME pipeline

The story-driven mode uses the identical `runAgenticEncounter()` → AgenticOrchestrator pipeline. The only difference is the encounter selection UI shows holon names instead of line names. The actual encounter content, evaluation, and feedback are identical.

For Story-Driven mode to work as designed:
- The AgenticOrchestrator should NOT show PASSED/FAILED
- The feedback should be narrative consequence only ("The Scar Queen nods...")
- The evaluation should be invisible — all scoring happens in background
- NPC relationships should evolve and be visible in narrative
- Choices should propagate consequences to future encounters

---

## 4. THE AI-AGENT GAP: Why No Genuine Catalyst

### 4.1 What the design requires

From foundations/24 §4:
> The scheduler reads: theta-decay per line, drive-balance, shadow-ledger, polarity vector, transformation-readiness...

From EVERGREEN §4.2:
> Scoring Pipeline: Response → Drive Detection → Polarity Detection → Stage Mapping → Shadow Detection → Score Update

The game needs a **persistent SessionAgent** that:
- Lives across the entire session (not per-encounter)
- Receives the complete encounter history
- Maintains a running **developmental synthesis** (beyond raw scores)
- Decides what the player needs NEXT based on accumulated pattern recognition
- Generates encounter content that specifically targets the player's current edge
- Manages emotional/developmental pacing (when to push, when to consolidate)

### 4.2 What the code actually does

The `AgenticOrchestrator` runs **per-encounter and terminates**. Each encounter:
1. Receives a snapshot of the Significator
2. Builds a context prompt via `ContextPipeline`
3. Sends it to the LLM (or falls back to deterministic MCQ)
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

### 4.3 What should exist

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

## 5. THE SUPERFICIALITY PROBLEM: Why Options Don't Probe

### 5.1 The MCQ Options Problem

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

### 5.2 What Genuine Developmental Options Look Like

For a Red-stage Moral encounter, options should be:
- **Option A (Red Agency/Healthy):** "You take the credit because the work was only possible through your leadership — without your direction, they'd have nothing to take credit for."
- **Option B (Red Agency/Shadow):** "You take the credit because weakness must be punished and strength rewarded — that's the natural order."
- **Option C (Red Communion/Healthy):** "You share credit because the work was collective — no single person owns what the group creates."
- **Option D (Amber aspiration):** "You follow the formal protocol — the institution decides who gets credit, not individuals."

Each option reveals the player's **actual developmental position**, not their ability to pick the socially correct answer.

### 5.3 The FallbackProvider Content Quality

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

## 6. THE PRESSURE PROBLEM: Why No Catalyst

### 6.1 The Exchange Budget

**LLM path:** 4 exchanges per encounter (was 2, raised in recent commit)
**Direct Questioning:** 8 questions total (one per line)
**Story-Driven:** 20 encounters × 4 exchanges = 80 total touchpoints

The exchange budget is now reasonable for individual encounters. The problem is not the budget — it's what happens within those exchanges.

### 6.2 Why 4 Exchanges Don't Create Pressure

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

### 6.3 The PASSED/FAILED Problem

From the user's output:
```
✓ PASSED
Your response reveals: Healthy balanced
```

This is STILL showing in the user's experience. The `evaluateSelfReflection()` always passes, but the `runModuleAssessment()` path (which is what the user hit) uses `evaluateViaDriveProbes()` which can return `passed: false`.

---

## 7. VEIL VIOLATIONS: The Game Tells, Not Shows

From foundations/20 §4:
> The game must NEVER show: Assessment scores, drive-health values, developmental measurements, polarity vectors, shadow ledgers, stage altitude or progression percentages.

**Violations in current output:**
- `✓ PASSED` — diagnostic
- `Your response reveals: Healthy balanced` — clinical
- `layers: ⚡Infrared ⚡Magenta ●Red ◌Amber` — meta
- `module: Intrapersonal:Red` — raw identifier
- `diff:0.90` — scoring metric
- `CCI 45.2%` — composite index

The evergreen plan says both modes must "feel like a game, not a test." The current output feels like a test.

---

## 8. BLIND SPOTS

### 8.1 The FallbackProvider Has Content But No Delivery Mechanism

The FallbackProvider has excellent line-specific content for 3 stages × 8 lines × 4 modalities = 96 content pools. But this content is only delivered when:
1. LLM is unavailable AND
2. No module exists (dead code path when modules are loaded)

The content is effectively unreachable in the current architecture because `runModuleAssessment()` takes precedence over the `isDirectQ` path in `runFallback()`.

### 8.2 The Direct Questioning Session Doesn't Use FallbackProvider Content

`runDirectQuestioningSession()` creates encounters with `holonSource: 'self-reflection'` and `modality: 'LanguageReflective'`. When it calls `runAgenticEncounter()`, the AgenticOrchestrator routes based on:
- `noLlm` flag → `runFallback()` → checks `isSelfReflection` → uses FallbackProvider
- LLM available → `runLanguageReflective()` → LLM generates prompt

Neither path uses the FallbackProvider's line-specific LanguageReflective content in a profile-adaptive way.

### 8.3 The ContextPipeline Doesn't Inject Player Patterns

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

### 8.4 The Veil Is Violated in Both Modes

The evergreen plan says both modes must "feel like a game, not a test." The current output feels like a test.

### 8.5 The Story-Driven Mode Has No Narrative Consequence Propagation

The `ConsequenceEngine.applyConsequences()` DOES update:
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

### 8.6 The 8-Line Rotation in Direct Questioning Is Mechanical

`runDirectQuestioningSession()` shuffles 8 lines and iterates through them sequentially. This is mechanically correct but developmentally wrong because:
- It doesn't prioritize lines based on the player's needs
- It doesn't adjust difficulty based on previous responses
- It doesn't allow the player to go deeper on a line that's particularly active
- It treats all 8 lines as equally important, which violates the holonic principle

---

## 9. UPGRADE AREAS (Prioritized)

### Phase 0: Fix Critical Bugs (1 day)

**P0.1:** Ensure Direct Questioning mode routing works correctly. The user's output shows story-driven encounter selection when they selected Direct Questioning. Verify the mode selection → session flow routing.

**P0.2:** When LLM is available AND encounter is self-reflection, ensure the ASK_USER_QUESTION_TOOL's "Always start with a narrative introduction" instruction is overridden. The Direct Questioning prompt should be clean and direct.

**P0.3:** Remove PASSED/FAILED from player-facing output in BOTH modes. Replace with qualitative feedback.

### Phase 1: Build the Persistent SessionAgent (1-2 weeks)

This is the single most impactful change. Without it, every encounter is isolated and the game can never build genuine developmental pressure.

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

**P1.4:** Pass the agent's state across Direct Questioning encounters (populate `initialMessages` with synthesis from previous questions).

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

## 10. WHAT'S WORKING WELL

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

## 11. CONCLUSION

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

## 12. FOUNDATIONS CROSS-REFERENCE

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
