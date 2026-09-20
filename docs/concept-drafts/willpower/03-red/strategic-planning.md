# Willpower / Red — Strategic-Planning Game Concept

> **Axis:** The strategic-planning axis probes willpower through MULTI-STEP VOLITIONAL SEQUENCING — planning a chain of commitments, managing volitional resources across goals, and maintaining a goal-plan under changing conditions. Not "can you will one thing" but "can you will a SEQUENCE?"
>
> **Why this axis for Willpower/Red:** At Red, volitional planning is 2-step: "First I commit to THIS, then I commit to THAT." The player can sequence 2 vows but cannot yet manage goal-portfolios (Green) or nested goal-trees (Teal). This axis isolates the PLANNING component of will.

---

## 1. Game Identity

- **Title:** "The Campaign of Vows"
- **Core mechanic:** The player plans and executes multi-step volitional sequences — chaining commitments, allocating willpower-budget across goals, and maintaining a vow-plan when conditions shift.
- **Duration:** 4-8 minutes per session (infinite checkpoints; fatigue-aware)
- **Internal progression:** 2-Vow Chains → 3-Vow Chains → Budget-Managed Campaigns → Adaptive Campaigns → Contested Campaigns

---

## 2. Catalyst Delivery

**Catalyst:** Goals that CANNOT be achieved in a single burst — they require sequential commitment. "First vow to hold, THEN vow to strike." The contact boundary is: "Can you hold a 2-vow plan and execute it without losing the thread?"

**Unconscious response:**
- *Submergent:* Do they over-plan (golden-addiction — planning vows instead of keeping them)? Refuse to plan (dark-allergy — cannot commit to a sequence)? Execute compulsively without planning (dark-addiction)? Refuse longer chains (golden-allergy)?
- *Emergent:* Can they hold one more vow in the chain? Can they maintain the plan under fatigue?

**Integration path:** Rewards EXECUTED vow-chains (not just conceived ones). A simple 2-vow chain kept with power scores higher than a complex chain that collapses.

**Successful integration:** The player conceives vow-chains appropriate to capacity (2-3 at Red), holds them in working memory during execution, and adapts when conditions change.

---

## 3. Game Design

### Setup
A campaign map — territories to conquer through sequential vows. Each territory requires a CHAIN of commitments (hold this position, THEN strike that target, THEN secure the flank). The aesthetic: Red-stage war-table, campaign markers, territory map, firelight strategy.

### Interaction
- **2-Vow Chains:** "Hold the gate (15s), THEN strike the target (10s)." Plan two vows in order, execute sequentially.
- **3-Vow Chains:** "Defend (10s), advance (10s), hold new position (15s)." Three sequential commitments.
- **Budget-Managed:** "You have willpower for 30 total seconds. Allocate across 3 vows." Resource-constrained planning.
- **Adaptive:** "Mid-campaign, the enemy shifts. Your second vow must change. Revise NOW."
- **Contested:** "The enemy has their own campaign. Anticipate and counter with your vow-sequence."

### Feedback
- Chain completed → territory conquered; "Campaign successful. Vows kept in sequence."
- Chain broken → visible breakdown point (which vow failed); "The campaign broke at vow 2. Why?"
- Optimal chain (minimum vows) → bonus: "Efficient. No wasted will."

### Difficulty Adaptation
- Chain length: 2 → 3 → 4 vows
- Per-vow duration: 5s → 10s → 15s → 20s
- Budget constraints: unlimited → limited → scarce
- Adaptivity: static → changing conditions → adversarial
- Transition complexity: simple (hold-then-strike) → complex (hold-while-resisting-then-strike-then-hold)

### Internal Progression
| Phase | Checkpoint range | What changes |
|---|---|---|
| 2-Vow Chains | 1-5 | Simple two-vow plans; generous timing; clear goals |
| 3-Vow Chains | 5-15 | Longer sequences; timing constraints; varied vow-types |
| Budget-Managed | 15-30 | Limited willpower-budget; must allocate wisely |
| Adaptive Campaigns | 30-50 | Conditions change mid-chain; must revise |
| Contested Campaigns | 50+ | Adversarial planning; anticipation; counter-strategy |

---

## 4. Item Pool

### Item types
- **Campaign configurations:** Territory challenges requiring specific vow-sequences
- **Vow vocabularies:** Available commitment types (hold/strike/defend/advance/rest) with varied durations
- **Budget constraints:** Willpower-resource limits forcing prioritisation
- **Adaptation triggers:** Mid-campaign changes requiring revision
- **Enemy campaigns:** Adversarial vow-sequences to anticipate and counter

### Minimum pool size
- 30+ campaign configurations (2-vow), 25+ (3-vow), 20+ (budget-managed), 15+ (adaptive), 10+ (contested)

### Generation rules
- Campaigns generated from modular territory components
- Difficulty = minimum optimal chain-length (computed algorithmically)
- All campaigns must have at least one solution within willpower budget
- Adaptive scenarios: changes follow predictable logic
- Contested scenarios: enemy campaigns are 1 vow shorter than player's capacity

### Drive/shadow mapping
- Advisor acceptance/rejection → Agency probing
- Joint campaign quality → Communion probing
- Advancement rate → Eros probing
- Foundation campaign quality → Agape probing
- Zero planning time → dark-addiction signal
- Cannot initiate first vow → dark-allergy signal
- Over-complex chains → golden-addiction signal
- Disengagement at longer chains → golden-allergy signal

---

## 5. Technical Requirements

### Input types
- Sequence input (order vows in a queue before execution)
- Sustained hold (execute each vow with duration commitment)
- Tap-to-select (choose vow-types for the plan)
- Revision input (modify plan mid-execution)

### Timing requirements
- Planning time tracked (diagnostic); execution timing measured per vow; no millisecond precision needed for planning phase

### NPC/AI requirements
- Campaign-Advisor NPC: suggests plans, provides scaffolding
- Ally NPC: coordinates joint campaigns
- Recruit NPC: receives campaign-planning teaching
- Enemy AI: executes counter-campaigns

### LLM requirements
- **Medium:** Scenario generation, outcome narration, adaptive difficulty. Core scoring algorithmic.

### State persistence
- Maximum chain-length; execution quality history; transition quality; budget management patterns; planning-time patterns; drive/shadow signals; fatigue state; checkpoint position
