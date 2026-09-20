# Red-Team Audit: Full Gameplay Flow & Catalyst Trajectory

**Date:** June 22, 2026
**Status:** Critical findings — requires architectural response before further implementation
**Scope:** End-to-end flow from encounter scheduling → player interaction → scoring → state mutation → next encounter, across both gameplay modes

---

## 0. Audit Methodology

This audit reads the **actual source code** (not documentation) against the **design intent** in the foundations documents and the EVERGREEN-TWO-MODE-PLAN. For each finding, I cite the exact file and line, explain the gap, and rate severity:

- 🔴 **CRITICAL** — Breaks the core promise of the game
- 🟡 **MAJOR** — Significantly degrades the experience
- 🟢 **MINOR** — Polish-level issue

---

## 1. EXECUTIVE SUMMARY: THE 7 DEADLIEST SINS

The game's current implementation has **7 fundamental problems** that make it function as a shallow MCQ personality test wrapped in RPG aesthetics, NOT as an evolutionary catalyst:

| # | Finding | Severity | File |
|---|---------|----------|------|
| 1 | **Two-mode system is not implemented** — both modes produce identical MCQ encounters | 🔴 | `cli-game.ts:1123` |
| 2 | **No background AI-agent** — the LLM generates questions but doesn't manage the player profile | 🔴 | `AgenticOrchestrator.ts` (entire) |
| 3 | **Questions are deterministic/static** — fallback pools have 3-5 canned questions per modality | 🔴 | `FallbackProvider.ts` |
| 4 | **Options are superficial** — MCQ choices don't probe genuine developmental edges | 🔴 | `AgenticOrchestrator.ts:862` |
| 5 | **No genuine catalyst pressure** — 2-question budget per encounter, binary PASSED/FAILED | 🔴 | `AgenticOrchestrator.ts:265-280` |
| 6 | **Shadow detection is keyword-based** — hardcoded word lists, not developmental pattern recognition | 🟡 | `AgenticOrchestrator.ts:108-165` |
| 7 | **Profile evolution is mechanical** — score → threshold → pass/fail, no synthesis layer | 🟡 | `ConsequenceEngine.ts` |

---

## 2. FINDING #1: Two-Mode System Is Not Implemented

### 2.1 What the EVERGREEN-TWO-MODE-PLAN promises

```
Direct Questioning = Assessment-first (efficient, systematic, clear)
Story-Driven = Engagement-first (immersive, narrative, implicit)
```

Direct Questioning should be:
- 8 questions (one per line), each probing the current stage
- Options mapped to drive × polarity (not correct/incorrect)
- Immediate feedback showing which drive was expressed
- Radar chart showing developmental profile
- Session ends when all 8 lines are assessed

Story-Driven should be:
- 20 encounters with narrative arc (warmup → peak → cooldown)
- Each encounter is a narrative scenario with an NPC
- Choices are story decisions (not assessment questions)
- Scoring happens in background
- Consequence propagation (choices affect future encounters)

### 2.2 What the code actually does

**`scripts/cli-game.ts:1123`** — The mode selection:
```typescript
let gameMode: string = 'story'; // default to story-driven
```

This variable is **never used** after being set. The entire session loop at lines 1180-1350 runs identically regardless of whether `gameMode === 'story'` or `gameMode === 'direct'`. Both modes:
- Call `runAgenticEncounter()` with the same signature
- Route through the same `AgenticOrchestrator`
- Present the same MCQ-style questions
- Show the same PASSED/FAILED output

**The mode selection is purely cosmetic.** The player is asked to choose but gets the same experience either way.

### 2.3 What "Direct Questioning" should look like (per plan)

For Direct Questioning mode, the encounter loop should:
1. **Not show holon names or story locations** — it's a clean self-assessment interface
2. **Rotate through all 8 lines** — one question per line, not random scheduler selection
3. **Use the Significator's current altitude to calibrate question difficulty** — "When you feel anger" at Red vs "How do you navigate the tension between contradictory values" at Green
4. **Show immediate developmental feedback** after each question — "Agency expressed: dominant. Communion: suppressed."
5. **Build a radar chart** that updates in real-time
6. **End after 8 questions** (one per line) with a comprehensive profile summary
7. **Not use the "encounter" metaphor** — it's a "reflection" or "assessment"

### 2.4 What "Story-Driven" should look like (per plan)

For Story-Driven mode, the encounter loop should:
1. **Generate narrative encounters** where the player IS the character making story decisions
2. **NOT show "PASSED" or "FAILED"** — story outcomes are felt, not graded
3. **Track choices across encounters** to build implicit developmental profile
4. **Show narrative consequences** — NPC reactions, world changes, relationship shifts
5. **Defer all developmental feedback** to a post-session summary
6. **Use the ImmersiveRPG modality as the ambient layer** — discrete encounters arise naturally within it

---

## 3. FINDING #2: No Background AI-Agent Managing the Profile

### 3.1 What the architecture promises

From AGENTS.md §5.4 and foundations/22:
> The game is not a test — it is a developmental practice that simultaneously diagnoses AND heals/evolves. Everything happens implicitly in the background.

From foundations/24 (encounter scheduler):
> The scheduler reads: theta-decay per line, drive-balance, shadow-ledger, polarity vector, transformation-readiness...

### 3.2 What the code actually does

The `AgenticOrchestrator` runs **per-encounter** and terminates. There is no persistent agent that:

1. **Tracks the evolving profile across encounters** — each encounter gets a snapshot of the Significator, but the LLM doesn't see a running synthesis of the player's patterns across sessions
2. **Synthesizes findings** — the LLM doesn't receive "based on your last 5 responses, your Agency drive shows Dark-Addiction patterns specifically in Moral contexts"
3. **Generates the NEXT question based on what was just learned** — the scheduler selects the next module, but the LLM generates content independently of the previous encounter's specific insights
4. **Manages the trajectory** — there's no agent that says "the player has shown Golden-Allergy on Spiritual for 3 encounters; it's time to surface a different angle"

**`AgenticOrchestrator.ts:265-280`** — The encounter budget:
```typescript
5. This encounter has a budget of 2 exchanges. After the player has responded 
   to 2 questions, you MUST call 'complete_encounter'. Do NOT generate more 
   than 2 ask_user_question calls.
```

Two MCQ questions is far too brief to build genuine developmental pressure. A real catalyst requires sustained engagement with difficult material.

### 3.3 What should exist

A **persistent SessionAgent** that:
- Lives across the entire session (not per-encounter)
- Receives the complete encounter history
- Maintains a running **developmental synthesis** (beyond raw scores)
- Decides what the player needs NEXT based on accumulated pattern recognition
- Generates encounter content that specifically targets the player's current edge
- Manages emotional/developmental pacing (when to push, when to consolidate)

---

## 4. FINDING #3: Questions Are Deterministic/Static

### 4.1 The FallbackProvider problem

**`FallbackProvider.ts`** contains pre-authored content pools:

```typescript
const LANGUAGE_REFLECTIVE_RED: readonly FallbackContent[] = [
  { prompt: 'You struck first. Why?', ... },
  { prompt: 'The enemy fell. What did you see in that moment?', ... },
  { prompt: 'Your blade chose its path. Name the path.', ... },
  { prompt: 'They offered surrender. You decided. What shaped your choice?', ... },
  { prompt: 'The battle turns. What will you do before it turns again?', ... },
];
```

**5 questions for Red-stage LanguageReflective across ALL 8 lines.** The same "You struck first" appears whether the line is Cognitive, Emotional, Moral, Intrapersonal, Spiritual, Somatic, Willpower, or Interpersonal. The `Line` parameter in `getFallback()` is prefixed with `_line` — it's **ignored**.

This means:
- Cognitive:Red asks "You struck first" (irrelevant to cognitive capacity)
- Emotional:Red asks "You struck first" (might be tangentially related)
- Somatic:Red asks "You struck first" (completely irrelevant)
- Willpower:Red asks "You struck first" (completely irrelevant)

### 4.2 Even with LLM, questions lack personalization

When the LLM IS available, the `AgenticOrchestrator` does pass some context via the `ContextPipeline`, but:

1. **The VeilFilter strips developmental data** — the LLM sees `layer=Red; transformation=distant; energy=high` but NOT the specific patterns from previous encounters
2. **The continuity context is superficial** — `buildContinuityContext()` builds a 3-encounter summary, but it's just "PASSED/FAILED + narrative summary" — no pattern recognition
3. **The ASK_USER_QUESTION_TOOL schema** mandates MCQ format — `options` array with `label` and `description`. This forces every question into personality-test format, even for LanguageReflective which should be open-ended

### 4.3 The UX output confirms this

From the user's pasted output:
```
When you are completely alone, what is your relationship with yourself like?
    [1] I see it clearly — Self-knowledge is available to me right now
    [2] I rest in not-knowing — The question itself is the practice
    [3] Something stirs but resists words — The unconscious is speaking
    [4] I need a mirror — Others see what I cannot see alone
```

This is a **generic personality-test question** with **static options** that don't reference:
- What the player's Significator reveals about their Intrapersonal line
- What shadows have been surfaced in previous encounters
- What the player's specific developmental edge is
- What the player wrote in previous encounters (write-in responses are forgotten)

---

## 5. FINDING #4: Options Are Superficial

### 5.1 The MCQ options don't probe developmental edges

The options presented to the player map to a **surface-level choice**, not a genuine developmental dilemma. Consider:

```
What do you do?
    [1] Stay honest — Integrity matters more than advancement
    [2] Find a third path — There's always another option
    [3] Share credit — Both of you deserve recognition
    [4] Take credit — Survival requires boldness
```

This is a **moral dilemma** presented as a multiple-choice question. The problems:

1. **Option 4 is obviously "wrong"** — "Take credit for someone else's work" is socially undesirable. Any player who has taken a basic ethics course will pick 1-3. This doesn't probe moral development; it probes social desirability bias.

2. **Options 1-3 are all "acceptable"** — they don't distinguish between Red-stage moral reasoning (survival/power), Amber-stage (duty/rules), Orange-stage (individual achievement), or Green-stage (systemic awareness). The options flatten all developmental stages into "which nice-sounding answer do you pick?"

3. **No option represents genuine shadow expression** — a real developmental probe would present options where BOTH the "healthy" and "shadow" expressions are plausible, forcing the player to reveal their actual developmental position.

### 5.2 What genuine developmental options look like

For a Red-stage Moral encounter, the options should be:
- **Option A (Red Agency/Healthy):** "You take the credit because the work was only possible through your leadership — without your direction, they'd have nothing to take credit for."
- **Option B (Red Agency/Shadow):** "You take the credit because weakness must be punished and strength rewarded — that's the natural order."
- **Option C (Red Communion/Healthy):** "You share credit because the work was collective — no single person owns what the group creates."
- **Option D (Amber aspiration):** "You follow the formal protocol — the institution decides who gets credit, not individuals."

Each option reveals the player's **actual developmental position**, not their ability to pick the socially correct answer.

### 5.3 The score output is equally superficial

```
✓ PASSED
Your response reveals: Healthy balanced
```

"Healthy balanced" is the **same output for every passing response**. It doesn't tell the player:
- What drive they expressed
- Why it was healthy or not
- How it relates to their overall pattern
- What the developmental implication is

The EVERGREEN-TWO-MODE-PLAN specifies:
> **Immediate Feedback (Direct Questioning):** Show which drive was expressed, Show polarity direction, Show developmental insight ("This reveals a tendency toward...")

None of this is implemented.

---

## 6. FINDING #5: No Genuine Catalyst Pressure

### 6.1 The 2-question budget kills developmental depth

**`AgenticOrchestrator.ts:276-278`:**
```typescript
4. Keep the flow interactive, building upon prior answers.
5. This encounter has a budget of 2 exchanges. After the player has responded 
   to 2 questions, you MUST call 'complete_encounter'.
```

Two MCQ questions per encounter cannot create genuine developmental pressure. Consider:
- A real therapeutic session lasts 50-90 minutes
- A genuine developmental catalyst requires sustained engagement with uncomfortable material
- Two multiple-choice questions take ~30 seconds to complete
- The player never has to sit with discomfort, elaborate on a difficult answer, or defend a position

### 6.2 The pass/fail binary destroys catalyst quality

```
✓ PASSED
Your response reveals: Healthy balanced
```

vs

```
◐ NEEDS GROWTH
This area needs more development.
```

This binary framing:
1. **Makes every encounter feel like a test** — the player is trying to "pass"
2. **Provides no nuance** — a response that's 70% healthy and 30% shadow gets the same "PASSED" as one that's 100% healthy
3. **Kills genuine exploration** — if the player knows there's a "right" answer, they'll pick it rather than expressing their genuine developmental position
4. **Violates the Veil principle** — the design says "The game is NEVER diagnostic to the user" but "PASSED/FAILED" is explicitly diagnostic

### 6.3 The score is mechanistic, not developmental

**`AgenticOrchestrator.ts:856-865`:**
```typescript
const rubricScore = totalWeight > 0 ? weightedSum / totalWeight : baseScore;
const blendedScore = rubricScore * 0.6 + baseScore * 0.4;
// ...
const passThreshold = module.scoringRubric.passThreshold ?? 0.7;
const passed = !hasShadow && effectiveScore >= passThreshold;
```

This is a **weighted average of numerical dimensions compared against a threshold**. It's:
- Not developmental — it doesn't measure growth
- Not catalytic — it doesn't create pressure for change
- Not personal — it applies the same formula regardless of the player's specific pattern
- Not emergent — it produces the same result structure every time

---

## 7. FINDING #6: Shadow Detection Is Keyword-Based

### 7.1 The keyword detection approach

**`AgenticOrchestrator.ts:108-165`:**
```typescript
private static readonly SHADOW_KEYWORDS = {
  darkAddiction: ['attack', 'dominate', 'crush', 'enslave', 'destroy', 'conquer',
    'prove myself', 'beneath me', 'weakness', 'force', 'control', 'punish', ...],
  darkAversion: ['withdraw', 'resist', 'refuse', 'flee', 'avoid', 'ignore',
    'not worth', 'pointless', 'give up', "can't be bothered", ...],
  goldenAddiction: ['transcend', 'bypass', 'enlighten', 'skip', 'higher self',
    "it's all good", 'everything happens', 'love and light', ...],
  goldenAllergy: ['stay', 'safe', 'comfortable', 'never change', 'fine as i am',
    "don't need", 'good enough', 'why change', ...],
};
```

Problems:
1. **Only fires for write-in responses** — MCQ selections NEVER trigger shadow detection (`detectShadowFromResponse` checks `isWriteIn` flag)
2. **Keyword matching is trivially gamed** — a player who says "I want to help others" doesn't trigger any shadow detection regardless of whether the motivation is genuine communion or golden-addiction spiritual bypassing
3. **No contextual analysis** — "I feel the need to withdraw" triggers DarkAllergy whether the context is healthy boundary-setting or avoidance-driven withdrawal
4. **Intensity is random** — `Math.min(1, 0.4 + Math.random() * 0.3)` — the shadow intensity is literally random noise

### 7.2 What shadow detection should look like

Shadow patterns should be detected by:
1. **Cross-encounter pattern analysis** — a single "withdraw" response is healthy; 5 consecutive avoidances of Intrapersonal encounters is a shadow pattern
2. **Behavioral signals from the scheduler** — avoidance patterns, modality preferences, which encounters the player skips
3. **LLM-mediated analysis** — the LLM should analyze the player's write-in responses in context of their entire profile, not just check for keywords
4. **Drive balance drift** — when Agency weights increase while Communion decreases over 5+ encounters, that's a shadow signal

---

## 8. FINDING #7: Profile Evolution Is Mechanical

### 8.1 The state mutation pipeline

**`ConsequenceEngine.ts:applyConsequences()`** — After each encounter:
1. Record polarity trace
2. Update theta timestamps
3. Update drive balance
4. Handle shadow surfacing (keyword-based)
5. Handle shadow resolution (if all drives HealthyBalanced)
6. Update NPC relationships
7. Accumulate PESTLE tension

This pipeline is **purely additive** — each encounter adds small deltas:
- Drive weight += 0.01 to 0.03
- Fixation risk += 0.02 to 0.05
- NPC relationship strength += 0.05 or -= 0.05

### 8.2 What's missing

1. **No cross-encounter synthesis** — the Significator accumulates data but nothing synthesizes it into developmental insights
2. **No pattern recognition** — the system doesn't detect "you've been choosing Agency-dominant responses for the last 5 Moral encounters"
3. **No trajectory prediction** — the system doesn't model where the player is heading
4. **No adaptive challenge** — the system doesn't adjust question difficulty or angle based on the player's specific pattern
5. **No felt-sense of growth** — the player never experiences "I'm changing" because the feedback is binary pass/fail

---

## 9. GAP ANALYSIS: Design Intent vs Implementation

| Design Principle | Status | Evidence |
|---|---|---|
| Both modes update the same Significator | ✅ Implemented | Same Significator regardless of mode |
| Both modes use the same 64 modules | ✅ Implemented | ModuleRegistry shared |
| Both modes must feel like a game, not a test | 🔴 FAILS | "PASSED/FAILED" is explicitly a test |
| Both modes must be self-contained | 🟡 PARTIAL | FallbackProvider has per-stage content, but not per-line |
| Mode switching is possible mid-session | 🔴 NOT IMPLEMENTED | No mode switch mechanism exists |
| Direct Questioning: systematic probing | 🔴 FAILS | Same encounter loop for both modes |
| Direct Questioning: options map to drive × polarity | 🔴 FAILS | Options are generic MCQ, not drive-mapped |
| Direct Questioning: immediate feedback | 🔴 FAILS | Only "PASSED" or "NEEDS GROWTH" |
| Direct Questioning: radar chart | 🟡 PARTIAL | `renderAltitudesChart()` exists but isn't per-session |
| Story-Driven: narrative-first | 🔴 FAILS | Shows "PASSED/FAILED" in both modes |
| Story-Driven: choices are story decisions | 🔴 FAILS | Same MCQ format in both modes |
| Story-Driven: deferred feedback | 🔴 FAILS | Immediate pass/fail in both modes |
| Story-Driven: NPC relationships evolve | 🟡 PARTIAL | `npcRelationships` tracked but not surfaced in narrative |
| Veil enforced | 🟡 PARTIAL | VeilFilter exists but PASSED/FAILED leaks meta-info |
| Infinite checkpoints | ✅ Implemented | Checkpoint model in AssessmentScene |
| LLM as voice, not brain | 🟡 PARTIAL | LLM is asked to score (complete_encounter), violating this principle |
| Fixed mechanics + adaptive content | 🔴 FAILS | When LLM unavailable, everything is fixed and generic |
| Non-coercion (player chooses encounters) | ✅ Implemented | Scheduler offers 3-5 ranked options |

---

## 10. SPECIFIC UX FLOW ANALYSIS

### 10.1 What the user sees (from pasted output)

```
Encounter 1/20
  1. The Underground Passage  Embodied  diff:0.90  warmup
  module: Intrapersonal:Red
  modality: Embodied

  💓 [SOMATIC SCAN] • Focus on body sensation •
  [Intrapersonal Line — Introspective Probe]
  The Underground Passage presents a challenge.

  INTRAPERSONAL LINE — SELF-REFLECTION
  Look inward.
  When you are completely alone, what is your relationship with yourself like?
    [1] I see it clearly — Self-knowledge is available to me right now
    [2] I rest in not-knowing — The question itself is the practice
    [3] Something stirs but resists words — The unconscious is speaking
    [4] I need a mirror — Others see what I cannot see alone
```

**Problems visible in this output:**

1. **Modality mismatch** — "Embodied" modality shows "SOMATIC SCAN" header but asks a language-reflective question about self-awareness. Embodied modality should show a timing task, breath exercise, or body-scan — not an MCQ about self-knowledge.

2. **Question doesn't match the module** — "Intrapersonal:Red" should probe Intrapersonal capacity at the Red stage (self-awareness, self-regulation in survival/power contexts). "When you are completely alone, what is your relationship with yourself like?" is a generic Green/Turquoise-level question, not Red-stage.

3. **Options don't map to drives** — None of the 4 options map to Agency, Communion, Eros, or Agape. They map to different epistemological stances (direct knowing, apophatic knowing, unconscious, intersubjective) — which is sophisticated but not what the scoring system measures.

4. **"PASSED" destroys the Veil** — The player sees "✓ PASSED" which tells them they "got it right," contradicting the principle that "each option reveals something" (no correct/incorrect).

5. **"Your response reveals: Healthy balanced"** — This is identical regardless of which option the player chose. Options 1-4 represent fundamentally different developmental positions but all produce the same feedback.

6. **layers: ⚡Infrared ⚡Magenta ●Red ◌Amber** — This layer display is decorative. It doesn't affect what encounters the player gets, what options are presented, or what feedback they receive.

### 10.2 Encounter selection is not personalized

```
Encounter 2/20
  1. The Broken Crown  Deterministic  diff:0.90  warmup
  module: Moral:Red
```

The encounter selection shows holon names ("The Broken Crown") and modalities, but the player has no information about:
- Why THIS encounter was selected for THEM
- How it relates to their previous encounter
- What developmental purpose it serves
- What they might discover about themselves

The scheduler's sophisticated priority formula (theta-decay, shadow activation, polarity alignment, etc.) is completely invisible. The player just sees "The Broken Crown" with no context.

---

## 11. UPGRADE AREAS: What Must Change

### 11.1 Architectural Changes (Phase 1)

#### A. Implement the Two-Mode Router

Create a `GameModeRouter` that produces fundamentally different encounter experiences:

**Direct Questioning Mode:**
```typescript
interface DirectQuestioningMode {
  // Rotates through all 8 lines systematically
  getNextLine(altitudes: Record<Line, Stage>): Line;
  // Generates a question calibrated to the player's specific altitude on that line
  generateQuestion(line: Line, stage: Stage, profile: DevelopmentalProfile): Question;
  // Shows immediate developmental feedback (not pass/fail)
  showFeedback(response: Response, expectedDrive: Drive): Feedback;
  // Updates radar chart after each question
  updateChart(chart: RadarChart, newDimension: Line, score: number): void;
}
```

**Story-Driven Mode:**
```typescript
interface StoryDrivenMode {
  // Generates a narrative encounter with NPC
  generateEncounter(npc: Holon, context: NarrativeContext): NarrativeEncounter;
  // Presents story choices (NOT MCQ — branching dialogue)
  presentChoices(encounter: NarrativeEncounter): StoryChoice[];
  // Records choice implicitly (no explicit scoring shown)
  recordChoice(choice: StoryChoice): void;
  // Shows narrative consequence (NPC reaction, world change)
  showConsequence(choice: StoryChoice): Consequence;
}
```

#### B. Create a Persistent SessionAgent

```typescript
interface SessionAgent {
  // Lives across the entire session
  readonly history: EncounterHistory[];
  // Maintains running developmental synthesis
  synthesize(): DevelopmentalSynthesis;
  // Decives what the player needs next
  nextTarget(synthesis: DevelopmentalSynthesis): TargetSpec;
  // Generates encounter content tailored to the player's edge
  generateContent(target: TargetSpec, modality: Modality): EncounterContent;
  // Tracks emotional pacing
  pacing: PacingController;
}
```

#### C. Remove Binary Pass/Fail from Player-Facing Output

Replace `✓ PASSED` / `✗ FAILED` with qualitative feedback:
- For Direct Questioning: "Agency dominant. Communion suppressed. This pattern has appeared 3 times."
- For Story-Driven: Show narrative consequence only, defer all assessment feedback

### 11.2 Content Changes (Phase 2)

#### A. Per-Line×Stage Question Banks

Each of the 64 modules needs 5-10 questions per modality that:
- Are specific to the line (not generic across lines)
- Are calibrated to the stage (Red questions are different from Green questions)
- Present options that map to drive × polarity
- Include at least one option that represents genuine shadow expression

#### B. Genuine Developmental Dilemmas

Options should be designed so that:
- NO option is obviously "correct" or "incorrect"
- Each option represents a genuine developmental position
- The "shadow" options are plausible and tempting
- The player's choice reveals their actual developmental stage, not their social desirability

#### C. Narrative Consequence System

In Story-Driven mode:
- NPC remembers previous interactions
- World state changes based on player choices
- Consequences compound across encounters
- The player FEELS the weight of their choices through narrative, not scores

### 11.3 Feedback Changes (Phase 3)

#### A. Veil-Compliant Feedback

Remove all clinical/meta language from player-facing output:
- ❌ "PASSED" / "FAILED" — too diagnostic
- ❌ "Your response reveals: Healthy balanced" — too clinical
- ❌ "layers: ⚡Infrared ⚡Magenta ●Red ◌Amber" — too meta
- ✅ "Something shifted. The passage recognizes your presence." — qualitative
- ✅ NPC nods — "You know yourself well. The firelight agrees." — narrative
- ✅ World changes subtly — an ember brightens, a shadow recedes — environmental

#### B. Developmental Insights (deferred to session summary)

After the session, show:
- Which lines were explored
- Patterns noticed (without clinical labels)
- Which areas have the most energy right now
- Suggestions for next session (framed as invitations, not prescriptions)

---

## 12. PRIORITY RECOMMENDATIONS

### Immediate (before next playtest)

1. **Remove "PASSED/FAILED" from player output** — Replace with qualitative narrative feedback. This is the single highest-impact change for Veil compliance.

2. **Fix the modality-question mismatch** — When modality is "Embodied", show a body-awareness task, not an MCQ. The modality routing in `encounterRouting.ts` sends everything to `SceneKeys.Encounter` except LanguageReflective and ScenarioChoice — all other modalities need proper task rendering.

3. **Make options line-specific** — Each question's options should be specific to the line being probed. "Intrapersonal:Red" should ask about self-awareness at the survival/power stage, not a generic self-knowledge question.

### Short-term (this development cycle)

4. **Implement the two-mode router** — Even a minimal version where Direct Questioning uses the calibration probe flow and Story-Driven uses narrative framing would be a massive improvement.

5. **Remove the 2-question budget** — Allow 3-5 exchanges per encounter, with the LLM determining when sufficient material has been gathered.

6. **Add write-in analysis to the LLM path** — When the player writes a free-form response, send it to the LLM for genuine developmental analysis, not just keyword matching.

### Medium-term (next cycle)

7. **Build the Persistent SessionAgent** — This is the most important architectural addition. Without it, every encounter is isolated and the game can never build genuine developmental pressure.

8. **Implement narrative consequence propagation** — Choices in Story-Driven mode should compound across encounters.

9. **Build genuine developmental dilemma content** — The 64 modules need content where every option is a plausible developmental position, not a test with right/wrong answers.

---

## 13. WHAT'S WORKING WELL

Despite the critical findings, the architecture has strong foundations:

1. **The Significator is well-designed** — The data model for tracking developmental state is comprehensive and extensible
2. **The encounter scheduler is sophisticated** — The priority formula with 7 weighted criteria is well-thought-out
3. **The CCI → AutoMode → Scheduler pipeline is sound** — The session strategy engine is properly layered
4. **The LLM integration architecture is correct** — ContextPipeline → VeilFilter → ModalityRubric → LLM is the right pattern
5. **The modality system is well-conceived** — 7 modalities probing different dimensions of the same shadow is the right approach
6. **The assessment module types are well-specified** — The TaskType and MeasureDimension taxonomy is thorough

The problem is not the architecture — it's that the architecture hasn't been fully wired into the player-facing experience. The engines (scheduler, CCI, auto-mode, transformation detector) are all running, but the output layer (what the player actually sees and does) doesn't reflect their sophistication.

---

## 14. CONCLUSION

The Mysterium codebase has **world-class architectural bones** — the Significator, encounter scheduler, CCI, auto-mode strategy, and transformation detection systems are all well-designed and properly implemented. But the **player-facing layer is a thin MCQ wrapper** that doesn't leverage any of this sophistication.

The core problem is a **mismatch between the engine layer and the presentation layer**:
- The engine knows the player's shadow patterns, drive balance, theta-decay state, and transformation readiness
- The player sees "PASSED/FAILED" and 4 generic MCQ options

Until the presentation layer is rebuilt to reflect the engine's intelligence, the game will remain a personality test with RPG aesthetics rather than the evolutionary catalyst it's designed to be.

**The single most impactful change:** Replace the binary pass/fail system with qualitative, narrative, Veil-compliant feedback that tells the player something they didn't know about themselves — without telling them the game is assessing them.
