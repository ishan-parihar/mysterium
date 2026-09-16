# Evergreen Plan: Two-Mode Gameplay System

**Date:** June 22, 2026
**Status:** Superseded — the assessment/engagement duality this plan formalized is now canon in `docs/foundations/26-unified-core-architecture.md` (4 execution modes) and `docs/architecture/10-stage-assessment-architecture.md` (module contract). Retained as the design rationale for the two-mode principle.
**Nature:** First-principles-based, living document — evolved through development cycles until absorbed into the foundations

---

## 1. First Principles

### 1.1 The Core Insight

The game serves two fundamentally different purposes:
1. **Assessment** — Systematically map the player's developmental state across the 8×8×N matrix
2. **Engagement** — Create an immersive experience that drives developmental growth

These purposes require different interaction modes:
- **Direct Questioning** = Assessment-first (efficient, systematic, clear)
- **Story-Driven** = Engagement-first (immersive, narrative, implicit)

### 1.2 The Design Constraints

| Constraint | Rationale |
|---|---|
| Both modes update the same Significator | Player's developmental state is unified regardless of mode |
| Both modes use the same 64 modules | The 8×8×N matrix is the assessment substrate for both |
| Both modes must feel like a game, not a test | Engagement is non-negotiable |
| Both modes must be self-contained | Each mode works independently |
| Mode switching is possible mid-session | Player can explore both modes |

### 1.3 The Assessment Contract

Every encounter in either mode must:
1. **Probe** — Present a stimulus that reveals developmental state
2. **Detect** — Identify which drive × polarity is expressed
3. **Score** — Map the response to the 8×8×N matrix
4. **Feedback** — Show developmental consequences (immediately or deferred)
5. **Progress** — Advance the player's journey (assessment or narrative)

---

## 2. Mode Architecture

### 2.1 Direct Questioning Mode

**Purpose:** Systematically probe the player's developmental state

**Interaction Model:**
```
Question → Options (each maps to drive × polarity) → Selection → Feedback → Next Question
```

**Session Structure:**
- 8 questions (one per line of intelligence)
- Each question probes the current stage for that line
- Options represent different developmental responses (not correct/incorrect)
- Progress shown as radar chart of the 8×8 matrix
- Session ends when all 8 lines are assessed

**Assessment Mechanics:**
- Each option has: `drive`, `polarity`, `stageAlignment`, `shadowSignal`
- Scoring maps selection to drive × polarity expression
- No binary correct/incorrect — each option reveals something
- Shadow detection from option patterns (not just write-in)

**UI/UX:**
- Clean, structured layout (like a personality test)
- Progress bar showing which lines are assessed
- Radar chart showing developmental profile
- Summary at session end

### 2.2 Story-Driven Mode

**Purpose:** Assessment through immersive narrative

**Interaction Model:**
```
NPC Encounter → Narrative Context → Choice → Consequence → Next Encounter
```

**Session Structure:**
- 20 encounters (thematic arc: warmup → peak → cooldown)
- Each encounter is a narrative scenario with an NPC
- Choices are story decisions (not assessment questions)
- Scoring happens in background
- Progress shown as story advancement

**Assessment Mechanics:**
- Each choice maps to drive × polarity (implicit, not explicit)
- Shadow detection from choice patterns across encounters
- Consequence propagation (choices affect future encounters)
- NPC relationships evolve based on player choices

**UI/UX:**
- Narrative-first layout (story before mechanics)
- NPC dialogue with emotional context
- Choice consequences shown narratively ("The Scar Queen nods...")
- Session summary shows developmental insights (deferred)

---

## 3. Module System Integration

### 3.1 The 64-Module Foundation

Both modes use the same 64 modules (8 lines × 8 stages):
- **Cognitive:** Pattern Recognition, Analytical Thinking, Synthetic Reasoning, etc.
- **Emotional:** Emotional Recognition, Emotional Regulation, Emotional Expression, etc.
- **Moral:** Moral Reasoning, Ethical Decision-Making, Value Alignment, etc.
- **Intrapersonal:** Self-Awareness, Self-Regulation, Self-Motivation, etc.
- **Spiritual:** Meaning-Making, Purpose Alignment, Transcendent Connection, etc.
- **Interpersonal:** Social Cue Reading, Empathic Attunement, Relational Repair, etc.
- **Somatic:** Body Awareness, Somatic Regulation, Embodied Cognition, etc.
- **Willpower:** Sustained Attention, Impulse Control, Delayed Gratification, etc.

### 3.2 Module-to-Mode Mapping

| Module | Direct Questioning | Story-Driven |
|---|---|---|
| **Cognitive:Red** | "When you see a pattern, what's your first instinct?" | A puzzle encounter with an NPC |
| **Emotional:Red** | "When you feel anger, what do you do?" | A conflict scenario with emotional stakes |
| **Moral:Red** | "When you face a dilemma, how do you decide?" | A moral choice in a narrative context |
| **Interpersonal:Red** | "When someone is upset, how do you respond?" | A social encounter with an NPC |
| ... | ... | ... |

### 3.3 Cross-Mode Consistency

Both modes update the same Significator:
- Same altitude tracking
- Same shadow ledger
- Same drive balance
- Same transformation state
- Same CCI computation

The player can switch modes and the assessment continues seamlessly.

---

## 4. Assessment Engine

### 4.1 The Drive × Polarity Mapping

Every response in either mode maps to:
- **Drive:** Agency, Communion, Eros, Agape
- **Polarity:** STO (Service-to-Others), STS (Service-to-Self), Neutral
- **Stage Alignment:** Which stage of consciousness this response reflects
- **Shadow Signal:** Whether this response indicates a shadow pattern

### 4.2 The Scoring Pipeline

```
Response → Drive Detection → Polarity Detection → Stage Mapping → Shadow Detection → Score Update
```

**Direct Questioning:**
- Options are pre-mapped to drive × polarity
- Selection directly reveals developmental state
- No inference needed — explicit mapping

**Story-Driven:**
- Choices are narrative decisions
- Drive × polarity inferred from choice context
- Pattern detection across multiple encounters
- Shadow detection from behavioral patterns

### 4.3 The Feedback System

**Immediate Feedback (Direct Questioning):**
- Show which drive was expressed
- Show polarity direction
- Show developmental insight ("This reveals a tendency toward...")

**Deferred Feedback (Story-Driven):**
- Show narrative consequences
- Show NPC reaction
- Show story progression
- Developmental insights shown at session end

---

## 5. Narrative Architecture

### 5.1 The Story Arc

Both modes follow a developmental arc:
1. **Warmup** (encounters 1-4): Exploration, discovery
2. **Rising Action** (encounters 5-12): Challenge, growth
3. **Climax** (encounters 13-16): Crisis, transformation
4. **Resolution** (encounters 17-20): Integration, completion

### 5.2 The NPC System

**Holon NPCs:**
- 36 holons (16 NPCs + 20 locations)
- Each NPC has: personality, narrative role, developmental focus
- NPCs remember previous encounters
- NPC relationships evolve based on player choices

**Encounter Generation:**
- Narrative beats gate encounter availability
- NPC relationships influence encounter selection
- Shadow state influences encounter difficulty
- Transformation state influences encounter type

### 5.3 The Consequence System

Every choice has consequences:
- **Immediate:** NPC reaction, narrative outcome
- **Short-term:** Encounter selection, difficulty adjustment
- **Long-term:** Shadow surfacing, transformation triggers
- **Developmental:** Drive balance, altitude shifts, CCI changes

---

## 6. Progress Visualization

### 6.1 Direct Questioning Progress

**Radar Chart:**
- 8 axes (one per line of intelligence)
- Each axis shows current stage (Infrared → White)
- Color indicates drive balance (green = healthy, red = shadow)
- Updates after each question

**Session Summary:**
- Lines assessed this session
- Dominant drive patterns
- Shadow signals detected
- Developmental recommendations

### 6.2 Story-Driven Progress

**Story Advancement:**
- Current encounter number / total
- Session position (warmup/peak/cooldown)
- Active narrative beats
- NPC relationship states

**Developmental Insights (Deferred):**
- Session summary at end
- Shadow patterns detected
- Developmental recommendations
- Next steps suggested

---

## 7. Technical Architecture

### 7.1 The Two-Mode Router

```typescript
interface GameMode {
  type: 'direct' | 'story';
  run(session: SessionContext): Promise<SessionResult>;
}
```

**DirectQuestioningMode:**
- Generates questions from module definitions
- Maps options to drive × polarity
- Shows immediate feedback
- Updates radar chart

**StoryDrivenMode:**
- Generates encounters from NPC narratives
- Maps choices to drive × polarity (implicit)
- Shows narrative consequences
- Updates story progression

### 7.2 The Shared Assessment Engine

Both modes use the same assessment engine:
- `AgenticOrchestrator` — runs encounters
- `ConsequenceEngine` — processes outcomes
- `Significator` — stores developmental state
- `EncounterScheduler` — selects next encounter

### 7.3 The Mode Switcher

```typescript
class ModeSwitcher {
  currentMode: GameMode;
  
  switchMode(newMode: 'direct' | 'story'): void {
    // Preserve session state
    // Switch mode
    // Resume from current encounter
  }
}
```

---

## 8. Implementation Roadmap

### Phase 1: Foundation (Week 1-2)
- [ ] Define mode interfaces
- [ ] Implement DirectQuestioningMode skeleton
- [ ] Implement StoryDrivenMode skeleton
- [ ] Add mode selection to CLI

### Phase 2: Direct Questioning (Week 3-4)
- [ ] Question generator (8 lines × current stage)
- [ ] Option mapper (drive × polarity × stage alignment)
- [ ] Radar chart visualization
- [ ] Session summary

### Phase 3: Story-Driven Polish (Week 5-6)
- [ ] NPC relationship system
- [ ] Narrative beat gating
- [ ] Consequence propagation
- [ ] Shadow integration

### Phase 4: Integration (Week 7-8)
- [ ] Mode switching
- [ ] Cross-mode consistency
- [ ] Adaptive difficulty
- [ ] A/B testing

---

## 9. Success Metrics

| Metric | Target | Measurement |
|---|---|---|
| **Assessment accuracy** | 80%+ correlation with expert assessment | Compare game scores with expert ratings |
| **Player engagement** | 70%+ session completion rate | Track session completions |
| **Developmental insight** | 90%+ players report self-discovery | Post-session survey |
| **Narrative immersion** | 80%+ players report story engagement | Post-session survey |
| **Mode preference** | Clear preference for one mode | Track mode selection |

---

## 10. Living Document Rules

This plan is **evergreen** — it evolves through development cycles:

1. **After each phase:** Review and update based on learnings
2. **After player testing:** Adjust based on feedback
3. **After new foundations:** Integrate new theoretical insights
4. **After technical discoveries:** Update implementation approach

**What changes:** Implementation details, timelines, specific mechanics
**What stays:** First principles, mode architecture, assessment contract
