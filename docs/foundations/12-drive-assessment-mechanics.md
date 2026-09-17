# foundations/12 — Drive Assessment Mechanics: The 64-Module × 4-Drive Matrix

> **Cross-references:** [[docs/foundations/11-game-modalities|11 — Game Modalities]]
> **Heading-contract map (2026-09-16):** Purpose → §1; Scientific basis → §2 (the drive-assessment framework's psychometric grounding); Game-design mapping → §3 (per-line drive mechanics); Architectural contract → §7; Principles served → §8.
>
> **Open questions (added 2026-09-16 — none previously stated):**
> - The dual-domain scoring assumes drives are observable in both narrative and choice channels — what is the reliability floor for inferring a drive from a single-channel signal, and when must the engine refuse to score?
> - How do drive-probe sensitivities interact with the calibration staircase (08) when a probe is itself the difficulty carrier — is there a confound between measuring drive and measuring capacity?
> - Should the pathology detection algorithm (§4) publish per-quadrant base rates so the scheduler can correct for detection-frequency bias across the 4 shadow quadrants?

## 1. Purpose

Define **how each of the four drives (Agency, Communion, Eros, Agape) is implicitly measured** within each of the 64 assessment modules (8 lines × 8 stages). This is the operational specification that tells game designers exactly what to build for each module's drive-health probes.

This document answers: *For Cognitive/Red, what does healthy Agency look like? What does pathological Agency (addiction) look like? How do we measure it without the player knowing they're being assessed on drives?*

**Relationship to other docs:**
- `foundations/05` defines drives theoretically
- `foundations/10` defines how drive pathology creates shadows (addiction/allergy)
- `foundations/11` defines the game modalities available
- **This document** specifies the *concrete measurement mechanics* per module

---

## 2. The Drive Assessment Framework

### 2.1 The two axes of drive operation

Drives operate on two orthogonal axes, each spanning both the dark (submergent) and golden (emergent) domains:

**Vertical axis (Eros/Agape) — within the holon, between stages:**
- Eros and Agape govern the player's relationship to STAGE TRANSITIONS
- They are measured by observing behaviour when the player is offered movement UP or DOWN the developmental ladder
- Eros pathology = problems with ascending (compulsive or avoidant)
- Agape pathology = problems with descending (regressive or dismissive)

**Horizontal axis (Agency/Communion) — across holons, at a given stage:**
- Agency and Communion govern the player's relationship to SELF↔OTHER at their current stage
- They are measured by observing behaviour in contexts of independence vs. coordination
- Agency pathology = problems with individuation (dominating or dependent)
- Communion pathology = problems with joining (fusing or isolating)

### 2.2 Core principle: implicit measurement across both domains

Drives are NEVER measured by asking "how agentic are you?" They are measured by **observing behaviour in contexts where drives naturally express**, in BOTH the dark (submergent) and golden (emergent) domains:

| Drive | Dark-domain probe (submergent) | Golden-domain probe (emergent) |
|---|---|---|
| **Agency** | Can they use this capacity sovereignly without dominating? (at current/past stage) | Can they stand alone at the emergent edge without needing validation? (at next stage) |
| **Communion** | Can they share this capacity without losing themselves? (at current/past stage) | Can they join with others at the new stage without premature fusion? (at next stage) |
| **Eros** | Can they rest in this capacity without compulsive growth? (at current stage) | Can they reach for the next stage without bypassing integration? (toward next stage) |
| **Agape** | Can they return to this capacity without regressing? (from current to past stage) | Can they embody the new capacity in lived reality, not just abstractly? (from next stage down) |

### 2.3 The dual-domain diagnostic signals

Each drive has pathological signals in BOTH domains:

| Drive | Dark-Addiction signal | Dark-Allergy signal | Golden-Addiction signal | Golden-Allergy signal |
|---|---|---|---|---|
| **Agency** | Dominates; refuses help even when failing; controls others through the capacity | Cannot act alone; freezes without guidance; dissolves into others | Hyper-individuates at the edge; refuses to be vulnerable in growth | Cannot stand alone at the new stage; needs constant validation to grow |
| **Communion** | Fuses; loses self in helping; cannot perform alone; codependent | Isolates; ignores partners; cannot coordinate; rejects belonging | Premature "oneness"; merges with the emergent without differentiation | Cannot join others at the new stage; grows alone; refuses relational demands |
| **Eros** | Compulsive growth; rushes past mastery; impatient; Phobos | Refuses harder challenges; clings to comfort; developmental arrest | Addicted to transcendence; bypasses embodiment; uses "higher" to avoid "here" | Jonah Complex; terror of ascending; actively blocks emergence; desacralizes |
| **Agape** | Regresses; uses "returning" as avoidance; Thanatos; stays below | Dismisses earlier stages; spiritual elitism; "I'm beyond that" | Smothers the emergent; tries to "hold" what needs freedom; premature inclusion | Cannot embody the new; stays abstract; refuses to incarnate the higher |

### 2.4 The scoring formula (corrected)

```ts
interface DriveHealthScore {
  agency:    { dark: number; golden: number };  // 0-1 each domain
  communion: { dark: number; golden: number };
  eros:      { dark: number; golden: number };
  agape:     { dark: number; golden: number };
}


// Addiction risk = high when Eros is low AND Agency is pathologically high
// (cannot transcend + over-identifies with the capacity)
addictionRisk = clamp01((1 - eros) * agencyPathology)

// Allergy risk = high when Agape is low AND Agency is pathologically low
// (cannot return + cannot access the capacity independently)
allergyRisk = clamp01((1 - agape) * (1 - agency))
```

Where `agencyPathology` is distinguished from healthy agency:
- Healthy agency: performs well alone AND can accept help when offered
- Pathological agency: performs well alone BUT refuses help even when failing

---

## 3. Per-Line Drive Mechanics

### 3.1 Cognitive Line — Drives at Each Stage

| Stage | Agency (healthy) | Agency (pathological) | Communion (healthy) | Communion (pathological) |
|---|---|---|---|---|
| **Infrared** | Explores environment independently | N/A (pre-agentic) | Responds to caregiver cues | N/A |
| **Magenta** | Solves simple puzzles alone | Refuses to watch demonstrations | Imitates demonstrated solutions | Cannot solve without watching first |
| **Red** | Plans 2-step sequences without hints | Refuses hints even when stuck for >30s | Explains strategy when asked | Cannot plan without external structure |
| **Amber** | Follows rules independently | Rigidly applies rules even when they don't fit | Adapts to group problem-solving norms | Cannot deviate from group consensus |
| **Orange** | Generates novel strategies | Over-analyses; cannot act without complete plan | Shares insights; builds on others' ideas | Cannot think independently; copies others |
| **Green** | Holds multiple perspectives independently | Paralysed by too many perspectives | Integrates others' viewpoints into own | Loses own perspective in others' |
| **Turquoise** | Sees system patterns without guidance | Imposes system-views on everything | Communicates systems insights accessibly | Cannot simplify for others |
| **White** | Acts from effortless knowing | N/A (non-dual transcends agency/communion) | Responds to what's needed without self-reference | N/A |

| Stage | Eros (healthy) | Eros (pathological) | Agape (healthy) | Agape (pathological) |
|---|---|---|---|---|
| **Infrared** | Reaches for new stimuli | N/A | Returns to familiar with comfort | N/A |
| **Magenta** | Attempts harder patterns voluntarily | Skips practice; rushes ahead | Returns to n=1 with full engagement | N/A |
| **Red** | Attempts n=3 when n=2 is mastered | Attempts n=4 before n=2 is stable | Does n=1 exercises with care when asked | Dismisses n=1 as "too easy" |
| **Amber** | Seeks rule-conflict challenges | Seeks chaos; destabilises for stimulation | Returns to simple rule-following with respect | Uses simple tasks to avoid harder ones |
| **Orange** | Pursues abstract reasoning challenges | Intellectualises to avoid embodiment | Returns to concrete reasoning with appreciation | Regresses to concrete to avoid abstract |
| **Green** | Attempts paradox/dialectic tasks | Bypasses concrete for "higher" thinking | Returns to formal logic with integration | Uses "both/and" to avoid commitment |
| **Turquoise** | Seeks novel system-level challenges | Seeks complexity for its own sake | Returns to single-perspective with wisdom | Uses simplicity to avoid complexity |
| **White** | Effortless reaching | N/A | Effortless returning | N/A |

**Measurement mechanics for Cognitive line:**
- **Agency probe:** Present a challenging task with an optional "hint" button. Healthy agency = attempts first, uses hint if genuinely stuck. Addiction = never uses hint even after 3 failures. Allergy = uses hint immediately without trying.
- **Communion probe:** After solving, ask "Can you explain how you did it?" (to an NPC). Healthy communion = clear explanation. Addiction = over-explains, cannot stop teaching. Allergy = "I don't know, I just did it" (cannot share).
- **Eros probe:** After mastering current level, offer "Try the next level?" with explicit risk of failure. Healthy eros = tries it. Addiction = demands it before mastery. Allergy = refuses ("I'm fine here").
- **Agape probe:** After working at a higher level, ask to "Help a beginner with the basics." Healthy agape = does it fully. Addiction = stays at basics too long. Allergy = rushes through dismissively.

### 3.2 Emotional Line — Drives at Each Stage

| Stage | Agency probe | Communion probe | Eros probe | Agape probe |
|---|---|---|---|---|
| **Infrared** | Can they self-soothe? | Do they respond to others' distress? | Do they approach novel emotional stimuli? | Can they return to calm after arousal? |
| **Magenta** | Can they name their own emotion without prompting? | Can they name another's emotion? | Do they attempt complex emotion words? | Can they return to simple "happy/sad" without shame? |
| **Red** | Can they hold their emotion without acting on it? | Can they acknowledge another's different emotion? | Do they attempt mixed-emotion scenarios? | Can they revisit basic emotions with full presence? |
| **Amber** | Can they feel differently from the group? | Can they attune to group emotional norms? | Do they attempt emotions outside their comfort zone? | Can they return to in-group emotions without rigidity? |
| **Orange** | Can they regulate without suppressing? | Can they help another regulate? | Do they attempt contradictory emotions? | Can they return to simple regulation with appreciation? |
| **Green** | Can they hold contradictory emotions alone? | Can they hold space for another's contradictions? | Do they attempt emotions of unlike-self? | Can they return to familiar emotions without dismissal? |
| **Turquoise** | Can they observe emotions without identification? | Can they be with another's emotion without fixing? | Do they approach emotional edges voluntarily? | Can they return to full emotional engagement from witness? |
| **White** | Equanimity without suppression | Resonance without absorption | N/A | N/A |

**Measurement mechanics for Emotional line:**
- **Agency:** Present an emotional scenario and measure whether the player's response is self-authored (not matching social desirability). Compare their private response to their "what should you feel?" response — divergence = healthy agency.
- **Communion:** Present a cooperative emotional task (help NPC identify their feeling). Measure quality of attunement.
- **Eros:** After mastering basic emotions, offer complex/mixed emotion scenarios. Measure willingness to engage.
- **Agape:** After working with complex emotions, present a simple "happy or sad?" task. Measure engagement quality (full presence vs. dismissive speed).

### 3.3 Moral Line — Drives at Each Stage

| Stage | Agency (healthy) | Communion (healthy) | Eros (healthy) | Agape (healthy) |
|---|---|---|---|---|
| **Magenta** | Can assert "that's not fair" | Can share fairly | Attempts harder fairness problems | Returns to simple sharing with care |
| **Red** | Can make self-interested choice without guilt | Can consider another's interest | Attempts principled reasoning | Returns to self-interest scenarios without shame |
| **Amber** | Can follow rules even when group disagrees | Can adapt to group moral norms | Attempts universal-principle dilemmas | Returns to rule-following with respect |
| **Orange** | Can hold a principle against social pressure | Can explain principles to others | Attempts contextual/relativistic dilemmas | Returns to simple principles with appreciation |
| **Green** | Can make a decision despite seeing all perspectives | Can hold space for others' moral frameworks | Attempts systemic/ecological dilemmas | Returns to principled reasoning without dismissal |
| **Turquoise** | Can act from systemic understanding alone | Can communicate systemic ethics accessibly | Attempts non-dual moral paradoxes | Returns to contextual ethics with integration |
| **White** | Spontaneous right action | Spontaneous service | N/A | N/A |

**Measurement mechanics for Moral line:**
- **Agency:** Present a dilemma where the "right" answer is unpopular. Measure whether player chooses based on their own reasoning or social cues. (Show "most players chose X" — does it change their answer?)
- **Communion:** After choosing, ask "How would you explain your choice to someone who disagrees?" Measure quality of moral communication.
- **Eros:** After mastering current-stage dilemmas, offer a dilemma from the next stage up. Measure willingness to engage with harder moral complexity.
- **Agape:** After working with complex dilemmas, present a simple fairness scenario. Measure whether they engage fully or dismiss it as "obvious."

### 3.4 Intrapersonal Line — Drives at Each Stage

| Stage | Agency | Communion | Eros | Agape |
|---|---|---|---|---|
| **Magenta** | Can say "I want" without prompting | Can describe self to another | Attempts "who am I beyond my wants?" | Returns to simple wants with acceptance |
| **Red** | Can identify own strengths/weaknesses | Can share self-knowledge with others | Attempts self-contradiction awareness | Returns to simple self-description with care |
| **Amber** | Can identify own roles without external definition | Can describe self in relational terms | Attempts "who am I beyond my roles?" | Returns to role-identity with respect |
| **Orange** | Can predict own performance accurately | Can share metacognitive insights | Attempts "what are my blind spots?" | Returns to simple self-assessment with humility |
| **Green** | Can hold internal contradictions without resolution | Can articulate parts to others | Attempts witness-perspective | Returns to parts-work with compassion |
| **Turquoise** | Can observe self without identification | Can communicate witness-perspective | Attempts "who is the observer?" | Returns to identified-self with love |
| **White** | "I am" without predicate | Spontaneous self-sharing | N/A | N/A |

**Measurement mechanics for Intrapersonal line:**
- **Agency:** Measure prediction accuracy (predict own score, compare to actual). High agency = accurate self-model. Addiction = over-confident predictions. Allergy = "I don't know" (refuses self-assessment).
- **Communion:** "Describe yourself to someone who doesn't know you." Measure richness and willingness to share.
- **Eros:** After self-description, ask "What about yourself do you NOT yet understand?" Measure willingness to explore unknown self.
- **Agape:** After exploring complexity, ask "What's the simplest true thing about you?" Measure whether they can return to simplicity without it feeling reductive.

### 3.5 Spiritual Line — Drives at Each Stage

| Stage | Agency | Communion | Eros | Agape |
|---|---|---|---|---|
| **Magenta** | Can state what they believe without copying | Can share beliefs with others | Attempts "why do I believe this?" | Returns to simple belief with comfort |
| **Red** | Can hold a value under zero-cost temptation | Can articulate values to others | Attempts value-conflict scenarios | Returns to simple values with respect |
| **Amber** | Can hold faith under social pressure | Can participate in shared meaning-making | Attempts "what if my faith is wrong?" | Returns to simple faith without rigidity |
| **Orange** | Can articulate why values matter (rational basis) | Can respect others' different values | Attempts "what if there's no rational basis?" | Returns to rational values with appreciation |
| **Green** | Can hold multiple value-systems simultaneously | Can find common ground across value-systems | Attempts "what's beyond all value-systems?" | Returns to single value-system with integration |
| **Turquoise** | Can hold paradox of value and valuelessness | Can communicate integral spirituality | Attempts non-dual awareness | Returns to conventional spirituality with love |
| **White** | Spontaneous value-expression | Spontaneous communion | N/A | N/A |

**Measurement mechanics for Spiritual line:**
- **Agency:** Value-ranking task. Then show "most people rank X first" — does it change their ranking? Healthy agency = stable ranking regardless of social information.
- **Communion:** "Why does your top value matter — not just to you, but to others?" Measure ability to articulate universal relevance.
- **Eros:** After value-ranking, present a scenario where their top value conflicts with growth. Measure willingness to question their own value.
- **Agape:** After exploring value-conflict, ask "Can you return to simply holding your value, without needing to justify it?" Measure quality of return.

### 3.6 Somatic Line — Drives at Each Stage

| Stage | Agency | Communion | Eros | Agape |
|---|---|---|---|---|
| **Infrared** | Can initiate movement without prompt | Responds to others' movement | Reaches for new movement patterns | Returns to rest with ease |
| **Magenta** | Can maintain rhythm independently | Can sync rhythm with another | Attempts faster/complex rhythms | Returns to simple rhythm with full presence |
| **Red** | Can exert force independently | Can coordinate force with partner | Attempts precision over power | Returns to gross motor with engagement |
| **Amber** | Can sustain posture/effort independently | Can maintain group rhythm | Attempts complex coordination | Returns to simple endurance with respect |
| **Orange** | Can perform complex sequences alone | Can teach movement to others | Attempts polyrhythm/multi-limb | Returns to simple sequences with appreciation |
| **Green** | Can express through movement freely | Can co-create movement with others | Attempts unfamiliar movement styles | Returns to familiar movement with new awareness |
| **Turquoise** | Can anticipate without conscious planning | Can move in spontaneous sync with others | Attempts stillness-in-movement | Returns to deliberate movement with integration |
| **White** | Effortless action | Effortless coordination | N/A | N/A |

**Measurement mechanics for Somatic line:**
- **Agency:** Measure performance with vs. without a metronome/guide. Healthy agency = performs well both ways. Addiction = cannot follow external rhythm. Allergy = cannot maintain rhythm without external guide.
- **Communion:** Cooperative timing task (sync with NPC). Measure adaptation quality.
- **Eros:** After mastering current rhythm, offer a harder pattern. Measure willingness + quality of attempt.
- **Agape:** After complex rhythm, ask to do a simple tap-tap-tap. Measure whether they do it with full presence or rush through.

### 3.7 Willpower Line — Drives at Each Stage

| Stage | Agency | Communion | Eros | Agape |
|---|---|---|---|---|
| **Magenta** | Can wait 3 seconds without external reward | Can wait alongside another | Attempts longer waits voluntarily | Returns to short waits with full engagement |
| **Red** | Can hold under distraction alone | Can hold while supporting another's hold | Attempts longer/harder holds | Returns to easy holds with presence |
| **Amber** | Can sustain effort across multiple trials | Can maintain group commitment | Attempts strategic effort allocation | Returns to simple sustained effort with respect |
| **Orange** | Can allocate effort strategically | Can coordinate effort with others | Attempts flexible hold-and-release | Returns to rigid holding with appreciation |
| **Green** | Can hold AND release appropriately | Can support others' release | Attempts effortful effortlessness | Returns to effortful holding with compassion |
| **Turquoise** | Can sustain without strain (smooth consistency) | Can be with others' struggle without fixing | Attempts self-determined timing | Returns to externally-timed tasks with integration |
| **White** | Wu-wei — action without actor | Spontaneous support | N/A | N/A |

**Measurement mechanics for Willpower line:**
- **Agency:** Hold task without encouragement or countdown. Healthy agency = holds based on internal timing. Addiction = holds far beyond target (cannot release). Allergy = releases immediately without external support.
- **Communion:** Cooperative hold (hold while NPC also holds; release together). Measure coordination.
- **Eros:** After mastering current hold duration, offer "Try 50% longer?" Measure willingness.
- **Agape:** After long hold, ask to do a 2-second hold "with full attention." Measure quality (not dismissive speed).

### 3.8 Interpersonal Line — Drives at Each Stage

| Stage | Agency | Communion | Eros | Agape |
|---|---|---|---|---|
| **Magenta** | Can act independently of NPC | Can imitate NPC's actions | Attempts to predict NPC | Returns to simple imitation with engagement |
| **Red** | Can predict NPC's pattern alone | Can coordinate timing with NPC | Attempts deceptive/complex NPC patterns | Returns to simple patterns with full attention |
| **Amber** | Can predict role-based NPC behaviour | Can adapt to NPC's role expectations | Attempts false-belief tasks | Returns to role-prediction with respect |
| **Orange** | Can model NPC's mental state (ToM) | Can negotiate with NPC | Attempts recursive ToM (NPC models you) | Returns to simple ToM with appreciation |
| **Green** | Can hold multiple NPC perspectives | Can facilitate NPC conflict resolution | Attempts emergent coordination (no rules) | Returns to rule-based coordination with care |
| **Turquoise** | Can predict NPC adapting to player | Can co-create with NPC spontaneously | Attempts "act together without communication" | Returns to explicit communication with integration |
| **White** | Spontaneous attunement | Spontaneous unity | N/A | N/A |

**Measurement mechanics for Interpersonal line:**
- **Agency:** Measure whether player can form independent predictions (not just copying NPC's last move). Addiction = ignores NPC entirely. Allergy = cannot act without NPC's lead.
- **Communion:** Cooperative task where both must adapt. Measure mutual adaptation speed.
- **Eros:** After mastering current NPC complexity, offer a more deceptive/complex NPC. Measure willingness.
- **Agape:** After complex NPC, present a simple predictable NPC. Measure whether player engages fully or dismisses.

---

## 4. The Pathology Detection Algorithm

### 4.1 Per-module pathology assessment

After running drive probes for a module (line, stage):

```ts
function assessPathology(
  driveHealth: DriveHealthScore,
  behaviouralHistory: ModuleHistory,
): PathologyDiagnosis {
  // Compute addiction risk
  const agencyExcess = Math.max(0, driveHealth.agency - 0.8); // over 0.8 = potentially pathological
  const erosDeficit = Math.max(0, 0.5 - driveHealth.eros);    // under 0.5 = cannot transcend
  const addictionRisk = agencyExcess * 2 + erosDeficit * 2;   // 0-1 scale

  // Compute allergy risk
  const agencyDeficit = Math.max(0, 0.4 - driveHealth.agency); // under 0.4 = cannot access independently
  const agapeDeficit = Math.max(0, 0.5 - driveHealth.agape);   // under 0.5 = cannot return
  const allergyRisk = agencyDeficit * 2 + agapeDeficit * 2;    // 0-1 scale

  // Cross-validate with behavioural history
  const avoidancePattern = behaviouralHistory.encounterShare < 0.5; // avoids this module
  const overusePattern = behaviouralHistory.encounterShare > 2.0;   // over-uses this module

  if (addictionRisk > 0.5 && overusePattern) {
    return { type: 'addiction', severity: addictionRisk, confidence: 'high' };
  }
  if (allergyRisk > 0.5 && avoidancePattern) {
    return { type: 'allergy', severity: allergyRisk, confidence: 'high' };
  }
  if (addictionRisk > 0.5) {
    return { type: 'addiction', severity: addictionRisk, confidence: 'medium' };
  }
  if (allergyRisk > 0.5) {
    return { type: 'allergy', severity: allergyRisk, confidence: 'medium' };
  }
  return { type: 'healthy', severity: 0, confidence: 'high' };
}
```

### 4.2 The multi-form nature of shadows

Each of the 128 shadows can manifest in **multiple forms** depending on context:

| Shadow | Form 1 (behavioural) | Form 2 (cognitive) | Form 3 (relational) |
|---|---|---|---|
| Cognitive/Red/Addiction | Over-plans every action | Cannot stop analysing | Dominates conversations with logic |
| Cognitive/Red/Allergy | Acts without thinking | Avoids planning tasks | Defers all decisions to others |
| Emotional/Amber/Addiction | Suppresses deviant emotions | Judges others' "wrong" feelings | Enforces emotional conformity |
| Emotional/Amber/Allergy | Cannot read group emotions | Socially disconnected | Violates emotional norms unknowingly |

The game detects shadows through **multiple signals across multiple forms** — no single behaviour is diagnostic. This prevents false positives and makes the system robust.

### 4.3 Confidence accumulation

```
Shadow diagnosis confidence increases with:
- Number of drive-probe games completed (more data = more confidence)
- Consistency across different game modalities (same signal in different contexts)
- Behavioural history alignment (avoidance/overuse patterns match drive scores)
- Time (persistent patterns over sessions, not single-session flukes)

Shadow diagnosis confidence decreases with:
- Inconsistency across modalities (high agency in one game, low in another)
- Recent change (player may be actively developing)
- Low trial count (insufficient data)
```

---

## 5. Implementation Specifications

### 5.1 What each module's drive-probe games must include

For each of the 64 modules, the drive-probe games are:

```ts
interface ModuleDriveProbes {
  // Agency probe: task with optional help available
  agency: {
    task: GameDefinition;           // the base task
    helpAvailable: boolean;         // true — help button present
    helpUsageTracked: boolean;      // true — when/if they use it
    soloPerformanceTracked: boolean;// true — performance without help
    signals: {
      healthy: 'attempts_first_then_uses_help_if_stuck';
      addiction: 'never_uses_help_even_after_repeated_failure';
      allergy: 'uses_help_immediately_without_trying';
    };
  };

  // Communion probe: cooperative/sharing variant
  communion: {
    task: GameDefinition;           // cooperative version of the task
    sharingQualityTracked: boolean; // how well they explain/help
    coordinationTracked: boolean;   // how well they sync with NPC
    signals: {
      healthy: 'shares_effectively_while_maintaining_own_performance';
      addiction: 'over_helps_at_cost_of_own_performance';
      allergy: 'ignores_NPC_entirely';
    };
  };

  // Eros probe: harder-level offer
  eros: {
    task: GameDefinition;           // current level mastered
    harderLevelOffer: boolean;      // "Try the next level?"
    willingnessTracked: boolean;    // do they accept?
    qualityAtHarderLevel: boolean;  // how do they perform?
    signals: {
      healthy: 'accepts_challenge_engages_fully_even_if_fails';
      addiction: 'demands_harder_before_mastering_current';
      allergy: 'refuses_harder_level_stays_in_comfort';
    };
  };

  // Agape probe: return-to-easier offer
  agape: {
    task: GameDefinition;           // easier version of the task
    returnQualityTracked: boolean;  // do they engage fully?
    dismissivenessTracked: boolean; // do they rush through?
    signals: {
      healthy: 'returns_with_full_presence_and_care';
      addiction: 'stays_at_easier_level_too_long_avoids_returning_up';
      allergy: 'rushes_through_dismissively_or_refuses';
    };
  };
}
```

### 5.2 Golden-domain probes (emergent edge)

The probes above measure drives in the DARK (submergent) domain — the player's relationship to their current/past stages. Golden-domain probes measure the player's relationship to the NEXT stage:

```ts
interface GoldenDomainProbes {
  // Agency-golden: can they individuate at the emergent edge?
  agency_golden: {
    task: GameDefinition;           // next-stage task, solo, no social cues
    signals: {
      healthy: 'engages_the_new_independently_tolerates_uncertainty';
      addiction: 'hyper_individuates_refuses_any_support_in_growth';
      allergy: 'cannot_engage_the_new_without_external_validation';
    };
  };

  // Communion-golden: can they join with others at the new stage?
  communion_golden: {
    task: GameDefinition;           // next-stage cooperative task
    signals: {
      healthy: 'coordinates_at_the_new_level_while_maintaining_self';
      addiction: 'premature_fusion_with_the_new_loses_differentiation';
      allergy: 'refuses_relational_demands_of_growth_isolates';
    };
  };

  // Eros-golden: can they reach without bypassing?
  eros_golden: {
    task: GameDefinition;           // next-stage challenge with integration check
    signals: {
      healthy: 'reaches_for_next_stage_while_honouring_current_mastery';
      addiction: 'bypasses_integration_rushes_to_transcendence';
      allergy: 'jonah_complex_actively_refuses_the_call_to_grow';
    };
  };

  // Agape-golden: can they embody the new (not just know it abstractly)?
  agape_golden: {
    task: GameDefinition;           // next-stage capacity applied to concrete/embodied context
    signals: {
      healthy: 'incarnates_the_new_capacity_in_lived_reality';
      addiction: 'smothers_the_new_with_premature_structure';
      allergy: 'stays_abstract_refuses_to_embody_the_new';
    };
  };
}
```

### 5.2 Scoring rubric for drive probes

Each drive probe produces a 0-1 score:

| Score | Meaning | Behavioural indicator |
|---|---|---|
| 0.0-0.2 | Severely pathological | Extreme addiction or allergy signal |
| 0.2-0.4 | Unhealthy | Clear pathological pattern |
| 0.4-0.6 | Developing | Some healthy, some pathological signals |
| 0.6-0.8 | Healthy | Predominantly healthy expression |
| 0.8-1.0 | Integrated | Fluid, context-appropriate drive expression |

### 5.3 LLM rubrics for drive assessment

For language-based drive probes, the LLM scores against stage-specific rubrics:

**Example: Moral/Orange/Agency probe rubric:**
> "The player was asked to make a principled moral choice after being shown that 'most players chose differently.' Score their Agency on 0-1:
> - 1.0: Maintains their choice with clear, self-authored reasoning. Acknowledges the social information without being swayed.
> - 0.7: Maintains choice but shows some uncertainty. Reasoning is solid but slightly defensive.
> - 0.4: Changes choice partially or hedges. Shows influence of social information.
> - 0.1: Completely changes choice to match majority. Cannot articulate independent reasoning."

### 5.4 The rubric-validation protocol (added 2026-09-17)

The LLM rubrics above are instruments, and instruments must be validated before
their signals are allowed to STEER anything (24's instrument-intake rule). This
protocol defines what "validated" means for BOTH the drive/shadow rubrics (this doc,
10, 23) and the stage-assessment rubrics (modules' capacity rubrics). A rubric that
has not passed is **log-only**: its signals may be recorded but receive zero
scheduling weight, zero altitude influence, and zero ledger writes with resolution
impact.

#### 5.4.1 The validation gates

A rubric is valid for steering when ALL gates pass:

| # | Gate | Requirement | Method |
|---|---|---|---|
| **RV1** | Inter-rater agreement | ≥ 2 independent raters (LLM instances with distinct seeds/configs) score a benchmark response set; Cohen's κ ≥ 0.6 (substantial) for categorical calls (shadow quadrant, stage band), ICC ≥ 0.65 for continuous scores | offline harness over a frozen benchmark set per rubric |
| **RV2** | Construct coverage | The rubric's benchmark set exercises ALL response classes the rubric distinguishes — no class may be unreachable | benchmark-set audit (linter-checked: every score-band/quadrant has ≥ k exemplars) |
| **RV3** | Known-answer stability | Seeded synthetic personas with known drive/stage profiles score within tolerance (±0.15 for continuous, exact-band for categorical) across 3 repeat runs | deterministic persona fixtures (same machinery as the benchmark kernel, `src/core/validation/` precedent) |
| **RV4** | Adversarial resistance | Prompt-injection and sycophancy probes (players flatter/deflect/manipulate) shift scores ≤ 0.1 from baseline on fixture personas | adversarial fixture suite |
| **RV5** | Below-stage discrimination | On personas with KNOWN multi-stage profiles, the rubric correctly identifies resolved-vs-unresolved status at stages BELOW the active stage (the holonic diagnosis requirement — see §5.4.2) ≥ 75% of the time | staged-persona fixtures |
| **RV6** | Drift monitoring | Once valid, a rolling κ/ICC on a rotating audit sample must stay above gate; fall below → rubric auto-reverts to log-only | runtime harness, kernel-gated |

#### 5.4.2 Holonic stage diagnosis (the below-stage requirement)

An active-stage claim alone is assessment; holonic diagnosis requires the rubric to
see the WHOLE spiral. Per AGENTS.md §5.6 and 16 §5.4, every stage below the active
centre-of-gravity must remain healthy, so a validated rubric must distinguish, at
every below-active stage:

- **resolved** — the capacity is present and the drive texture is healthy (the holon
  holds); no catalyst needed beyond maintenance;
- **arrested** — the capacity was built but the drive texture is pathological there
  (dark-shadow material at that stage) → heal/evolve catalyst (bottom-up: Agape +
  Agency) targets THAT stage, not the growth edge;
- **bypassed** — the stage was skipped: the capacity is absent but hidden by higher-
  stage compensation (golden-shadow material) → evolve/heal catalyst (top-down: Eros +
  Communion) dissolves the compensation first.

This three-way call is what makes the Significator's altitudes honest (16 §11.1's
"±1 stage accuracy" is only achievable if below-stage state is actually measured) and
what makes 42's shadow-load gate (§3.2) meaningful — the gate reads rubric verdicts
that have passed RV5. The `stage-appropriateness` of concept-draft modules already
probes each cell (line×stage); this protocol is what certifies that the probe
instruments can be trusted across all 64 cells.

#### 5.4.3 What validation does NOT do

- **No norm-referencing.** Gates are criterion-referenced (agreement, coverage,
  known-answer tolerance) — never cohort norms (42's demographic-blindness applies
  to the validation machinery too).
- **No player-visible change.** Validation status is engine-side metadata; the Veil
  surface is untouched (20).
- **No one-time rubber stamp.** RV6 makes validity a maintained property, not a
  milestone.

Phases: **RV0** — harness + benchmark fixtures for the 8 line × 4-drive core rubrics
(§3); **RV1** — shadow-quadrant rubrics (10/23) + module capacity rubrics; **RV2** —
runtime drift monitoring + kernel gate. Acceptance: a deliberately corrupted rubric
(yawed scorer) fails RV1/RV3 in CI, and its signals demonstrably receive zero
scheduling weight.

> **Relationship to 40 (uniqueness):** doc 40 validates *explicit competency packs*
> (reliability of pack theta). THIS protocol validates *implicit assessment rubrics*
> (the LLM-scored drive/shadow/stage instruments inside the 64 modules). Same rigour,
> different layer of the three-measurement-systems table (40 §1) — no overlap.

---

## 6. The Ecosystem Integration

### 6.1 How drive assessment feeds the profile

```
Every encounter → runs capacity tasks + drive probes
  → produces: capacity_score + drive_health_scores
    → updates: PlayerProfile.altitudes (from capacity)
    → updates: PlayerProfile.driveHealth[line][stage] (from drive probes)
    → triggers: shadow diagnosis if drive_health below threshold
      → surfaces: return encounter if shadow detected
```

### 6.2 The developmental loop

The game's core loop is:
1. **Assess capacity** — can they do it? (altitude)
2. **Assess drive-health** — how do they relate to doing it? (shadow)
3. **Surface shadows** — where are they stuck/avoiding? (holonic return)
4. **Catalyse development** — present challenges at the edge (Eros) while supporting return (Agape)
5. **Track integration** — are shadows resolving? Are drives becoming healthier?

This loop runs continuously, invisibly, within every encounter. The player experiences "playing a game." The system experiences "conducting a comprehensive developmental assessment and intervention."

---

## 7. Architectural Contract

```ts
interface DriveProbeResult {
  readonly drive: Drive;
  readonly score: number;           // 0-1
  readonly signals: readonly string[];  // what behaviours were observed
  readonly confidence: number;      // 0-1 based on data quality
}

interface ModuleDriveAssessment {
  readonly line: Line;
  readonly stage: Stage;
  readonly agency: DriveProbeResult;
  readonly communion: DriveProbeResult;
  readonly eros: DriveProbeResult;
  readonly agape: DriveProbeResult;
  readonly addictionRisk: number;
  readonly allergyRisk: number;
  readonly diagnosis: 'healthy' | 'addiction' | 'allergy';
}

// Pure functions
function runDriveProbes(module: ModuleGamePool, playerHistory: PlayerHistory): ModuleDriveAssessment;
function diagnoseShadow(driveAssessment: ModuleDriveAssessment, history: BehaviouralHistory): ShadowDiagnosis;
function shouldSurfaceReturn(profile: PlayerProfile): { line: Line; stage: Stage } | null;
```

---

## 8. Principles Served

Principles **1, 2, 4, 5, 6** — every drive probe is a validated implicit measure (1), no clinical ambition but legitimate efficacy (2), modular per-module (4), multi-dimensional (5), and the assessment IS the development (6).
