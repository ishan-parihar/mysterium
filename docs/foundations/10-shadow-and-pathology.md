# foundations/10 — Shadow, Pathology, and the 256-Shadow Model

> **Cross-references:** [[docs/foundations/13-architecture-of-consciousness|13 — Architecture Of Consciousness]]
> **Heading-contract map (2026-09-16):** all six sections present under canonical headings except Scientific basis, carried by §1 Purpose (theoretical grounding summary) + §3 (the drive-health determination model). §8 renamed from "Relationship to Combat" — legacy vocabulary purge, see docs/audits/DOC-SET-AUDIT-2026-09-16.md.
> **Satisfied by:** `src/core/domain/ShadowLedger.ts` (the shadow ledger: the four quadrants, resolution state and integration history) · `src/core/engines/ShadowContentGenerator.ts` (shadow-surfacing content generation) · `src/core/data/shadowKeywords.ts` (the detection vocabulary)

## 1. Purpose

Specify how *unhealthy* development manifests across the full 64-module matrix (8 lines × 8 stages), how each module can produce exactly **4 shadow pathologies** (dark-addiction, dark-allergy, golden-addiction, golden-allergy), how the **4 drives** determine the health or pathology of each capacity, and how the game implements **holonic return** — the requirement that a player must always come back to heal earlier-stage shadows before advancing.

> **Theoretical substrate:** `foundations/13-architecture-of-consciousness.md` provides the full psychological/cosmological theory (5-layer topography, contact boundary mechanics, Matrix/Potentiator dynamics, Atman Project). This document translates that theory into game-design mechanics.

Without this model, the game is a relentless ascent — which is itself a pathology (Eros without Agape; ascent without integration). Shadow material is what makes the game *honest about being human*.

---

## 2. The Four-Quadrant Shadow Model

### 2.1 The two axes of development

Per `foundations/13`, consciousness develops along two orthogonal axes:

| Axis | Direction | Drives | Archetypal Mind | Domain |
|---|---|---|---|---|
| **Vertical** | Between stages within a holon (up/down the developmental ladder) | **Eros** (ascending) / **Agape** (descending) | Matrix ↔ Potentiator | The emergent↔submergent unconscious |
| **Horizontal** | Across holons at a given stage (self↔other, interior↔exterior) | **Agency** (individuating) / **Communion** (joining) | Catalyst ↔ Experience | The contact boundary at a specific frequency |

- **Vertical (Eros/Agape):** Spans the entire spectrum of the emergent and submergent unconscious WITHIN the holon. Eros reaches from Matrix toward Potentiator (ascending to the next stage). Agape reaches from Potentiator back to Matrix (descending to embrace and integrate what's below).
- **Horizontal (Agency/Communion):** Operates ACROSS holons at a specific stage — between the self and the environment, between interior and exterior. Agency individuates (Catalyst is processed through sovereign will). Communion joins (Experience is shared, relational, co-created).

### 2.2 All four drives have BOTH dark and golden shadow expressions

The previous model incorrectly mapped drives 1:1 to shadow quadrants. The correct model: **every drive can be pathological in BOTH the submergent (dark) and emergent (golden) domains.**

| Drive | Dark-Addiction (submergent fixation) | Dark-Allergy (submergent aversion) | Golden-Addiction (emergent fixation) | Golden-Allergy (emergent aversion) |
|---|---|---|---|---|
| **Agency** | Domination; rigid autonomy at a lower stage; uses sovereignty to control others | Cannot access sovereignty; codependent at a lower stage; dissolves self into others | Hyper-individualism at the emergent edge; refuses communion with the new stage's demands | Terror of standing alone at the next stage; cannot individuate into the unknown |
| **Communion** | Fusion; herd-mind at a lower stage; loses self in group belonging | Isolation; cannot connect at a lower stage; rejects belonging entirely | Premature merging with the emergent ("we are all one" as bypassing); dissolves into transcendence without integration | Terror of joining/belonging at the next stage; refuses relational demands of growth |
| **Eros** | Compulsive growth; cannot rest in what IS; Phobos (fear of stillness); uses "growth" to avoid being present | Refuses to grow; clings to current stage; developmental arrest; "this is enough" | Addicted to transcendence; spiritual bypassing; rushes past integration; uses higher states to avoid embodiment | Jonah Complex; terror of ascending; actively blocks emergence; desacralizes the call to grow |
| **Agape** | Regression disguised as "embrace"; Thanatos (death-drive); uses "returning" to avoid the demands of the present | Cannot return to lower stages; spiritual elitism; dismisses earlier capacities as "beneath me" | Smothering the emergent with premature inclusion; tries to "hold" what needs to be released into freedom | Refuses to descend and embody the new capacity; stays abstract; cannot incarnate the higher into the lower |

### 2.3 The 256-shadow matrix

```
256 shadows = 8 lines × 8 stages × 4 drives × 2 domains (dark/golden)
```

Practically, at any given module (line × stage), the assessment must detect:
- How each of the 4 drives is functioning at that stage (healthy or pathological)
- Whether the pathology is submergent (dark — relating to the past/below) or emergent (golden — relating to the future/above)

For game design, we focus on the **dominant pathology pattern** — which drive is most distorted and in which domain.

### 2.4 The vertical and horizontal shadow dynamics

**Vertical shadows (Eros/Agape pathologies):**
These manifest as problems with STAGE TRANSITIONS — the player's relationship to ascending or descending within the developmental ladder.

- Eros dark-addiction: "I must always be growing" → cannot rest, cannot integrate, cannot be present
- Eros golden-allergy: "I refuse to grow" → Jonah Complex, terror of the next stage
- Agape dark-addiction: "I must always return" → regression, uses "integration" as avoidance of challenge
- Agape golden-allergy: "I refuse to embody" → stays abstract, cannot bring the higher into lived reality

**Horizontal shadows (Agency/Communion pathologies):**
These manifest as problems with RELATING AT A GIVEN STAGE — the player's relationship to self↔other at their current developmental frequency.

- Agency dark-addiction: "I dominate through this capacity" → uses the stage's power to control
- Agency golden-allergy: "I cannot stand alone at the new stage" → needs others to validate the emergent
- Communion dark-addiction: "I lose myself in others at this stage" → fusion, herd-mind
- Communion golden-allergy: "I cannot join others at the new stage" → isolation at the emergent edge

### 2.5 The heal/evolve and evolve/heal vectors

Per `foundations/13`, transformation operates in two directions:

| Vector | Direction | Mechanism | Drives involved | Game implementation |
|---|---|---|---|---|
| **Heal/Evolve** | Bottom-up | Excavate and integrate dark shadows first, then advance | Agape (descend to heal) + Agency (sovereign self-examination) | Shadow return encounters at earlier stages |
| **Evolve/Heal** | Top-down | Integrate golden shadow (next stage), which automatically dissolves dark knots below | Eros (ascend to grow) + Communion (join with the emergent) | Advancement encounters that pull the player forward |

The game supports BOTH vectors simultaneously:
- **Heal/evolve:** Holonic return encounters surface dark shadows for integration (Agape + Agency)
- **Evolve/heal:** When a player successfully integrates a golden shadow (Eros + Communion), their dark shadows at earlier stages automatically reduce in severity

This dual-vector approach means: **advancing genuinely (not bypassing) heals the past; healing the past enables genuine advancement.**

### 2.6 The Atman Project defenses (per foundations/13)

Golden-allergies (across ALL four drives) are maintained by specific ego defenses:

| Defense | Mechanism | Which drive it blocks | Game detection signal |
|---|---|---|---|
| **Rationalization** | Dismisses transcendence as impossible | Blocks Eros (golden-allergy) | Player avoids non-deterministic modalities; only engages psychometric tasks |
| **Isolation** | Maintains rigid self-boundary | Blocks Communion (golden-allergy) | Player refuses cooperative/social modalities; never helps NPCs |
| **Desacralizing** | Strips meaning from experience | Blocks Agape (golden-allergy) | Player rushes through narrative; skips reflective prompts |
| **Substitution** | Chases finite gratification instead of growth | Blocks Eros (golden-addiction of Agency) | Player optimises for score/XP rather than genuine engagement |

### 2.7 Examples across the four quadrants

| Line | Stage | Dark shadow (submergent) | Golden shadow (emergent) |
|---|---|---|---|
| Cognitive | Red | Agency-addiction: compulsive planning to dominate. Communion-allergy: cannot think collaboratively | Eros-allergy: refuses abstract reasoning (Jonah Complex for formal operations). Agape-allergy: cannot return to simple thinking without dismissal |
| Emotional | Amber | Communion-addiction: emotional conformity, suppresses deviant feelings. Agency-allergy: cannot feel differently from group | Eros-allergy: refuses emotional complexity ("feelings are simple"). Agape-addiction: regresses into group-feeling to avoid individual emotional depth |
| Moral | Orange | Agency-addiction: rigid principles applied without context. Communion-allergy: cannot consider others' moral frameworks | Eros-allergy: refuses contextual/post-conventional ethics. Communion-addiction: premature "all perspectives are valid" without commitment |
| Willpower | Red | Agency-addiction: cannot stop exerting effort; burnout. Eros-addiction: compulsive growth, never rests | Agape-allergy: refuses to return to easy tasks with presence. Eros-allergy: refuses longer/harder challenges ("this is my limit") |

Every module in the 64-module assessment system has a corresponding **addiction shadow** and **allergy shadow**. These are not abstract — they are specific, diagnosable patterns with specific gameplay manifestations.

### 2.3 Examples across the matrix

| Line | Stage | Addiction shadow | Allergy shadow |
|---|---|---|---|
| Cognitive | Red | Compulsive planning; cannot act without a plan; over-thinks simple situations | Cannot plan at all; acts purely on impulse; avoids any sequential thinking |
| Emotional | Amber | Emotional conformity addiction; suppresses own feelings to match group; cannot tolerate emotional deviance | Emotional isolation; cannot read or respond to group emotional norms; socially disconnected |
| Moral | Orange | Rigid principled morality; applies rules without context; cannot bend even when compassion demands it | Moral relativism; cannot commit to any principle; "anything goes" as avoidance of moral responsibility |
| Intrapersonal | Green | Hyper-self-awareness; paralysed by self-observation; cannot act spontaneously | Self-blindness; cannot observe own patterns; acts out unconsciously |
| Spiritual | Amber | Dogmatic faith; clings to belief system; cannot tolerate doubt | Spiritual nihilism; rejects all meaning-making; cannot access faith or purpose |
| Somatic | Red | Power-body addiction; uses force for everything; cannot be gentle | Body-avoidance; lives "in the head"; cannot access physical power or presence |
| Willpower | Amber | Rigid discipline; cannot relax or yield; over-controls everything | Collapse of will; cannot sustain effort; gives up at first resistance |
| Interpersonal | Orange | Theory-of-mind addiction; manipulates others via prediction; instrumentalises relationships | Social blindness; cannot model others' minds; surprised by others' reactions |

---

## 3. The Four Drives as Health Determinants

### 3.1 The two drive-pairs and their domains

Per `foundations/05`, the four drives form two complementary pairs operating on orthogonal axes:

**Vertical pair (Eros/Agape) — within the holon, between stages:**
- **Eros** = the ascending impulse. Reaches from Matrix toward Potentiator. Drives growth, transcendence, evolution. Pathology: Phobos (compulsive ascent, fear of stillness, spiritual bypassing).
- **Agape** = the descending impulse. Reaches from Potentiator back to Matrix. Drives embrace, inclusion, embodiment. Pathology: Thanatos (compulsive descent, regression, smothering).

**Horizontal pair (Agency/Communion) — across holons, at a given stage:**
- **Agency** = the individuating impulse. Processes Catalyst through sovereign will. Drives autonomy, boundaries, self-preservation. Pathology: domination, alienation, hyper-individualism.
- **Communion** = the joining impulse. Transforms Catalyst into shared Experience. Drives connection, belonging, mutual adaptation. Pathology: fusion, herd-mind, loss of self.

### 3.2 How drives determine shadow health

The **health** of any capacity (line × stage) is determined by how ALL FOUR drives operate within that capacity. Each drive can be healthy or pathological in BOTH the dark (submergent) and golden (emergent) domains:

| Drive | Healthy expression | Dark pathology (submergent) | Golden pathology (emergent) |
|---|---|---|---|
| **Agency** | Sovereign use of the capacity; appropriate boundaries; can say no | Domination via the capacity; uses it to control/exclude (dark-addiction) | Cannot individuate at the next stage; needs validation to grow (golden-allergy) |
| **Communion** | Shares the capacity; uses it in service of connection; co-creates | Loses self in others' use of the capacity; fusion (dark-addiction) | Premature merging with the emergent; "oneness" as bypassing (golden-addiction) |
| **Eros** | Reaches for the next level; willingness to grow; aspiration | Compulsive growth; cannot rest; uses "progress" to avoid being present (dark-addiction) | Addicted to transcendence; bypasses integration; rushes past embodiment (golden-addiction) |
| **Agape** | Returns to earlier capacities with compassion; integrates fully; embodies | Regresses into earlier capacity; uses "embrace" to avoid challenge (dark-addiction) | Refuses to descend and embody the new; stays abstract; cannot incarnate (golden-allergy) |

### 3.3 The drive-health formula (corrected)

For any module (line L, stage S), the shadow state is a function of all 4 drives across both domains:

```
drive_health(L, S) = {
  agency:    { dark: 0-1, golden: 0-1 },
  communion: { dark: 0-1, golden: 0-1 },
  eros:      { dark: 0-1, golden: 0-1 },
  agape:     { dark: 0-1, golden: 0-1 },
}

// Dark shadow severity = how pathological are the drives in the submergent domain?
dark_shadow_severity(L, S) = max(
  agency_dark_pathology,
  communion_dark_pathology,
  eros_dark_pathology,
  agape_dark_pathology,
)

// Golden shadow severity = how pathological are the drives in the emergent domain?
golden_shadow_severity(L, S) = max(
  agency_golden_pathology,
  communion_golden_pathology,
  eros_golden_pathology,
  agape_golden_pathology,
)
```

The dominant pathology pattern reveals WHICH drive is most distorted and in WHICH domain, guiding the shadow encounter design.

### 3.4 Drive-health assessment per module

Each of the 64 assessment modules must measure all 4 drives in BOTH domains:

| Drive | Dark-domain probe | Golden-domain probe |
|---|---|---|
| **Agency** | Can they use this capacity sovereignly without dominating? | Can they stand alone at the emergent edge without needing validation? |
| **Communion** | Can they share this capacity without losing themselves? | Can they join with others at the new stage without premature fusion? |
| **Eros** | Can they rest in this capacity without compulsive growth? | Can they reach for the next stage without bypassing integration? |
| **Agape** | Can they return to this capacity without regressing? | Can they embody the new capacity in lived reality (not just abstractly)? |

---

## 4. Holonic Return: The Architecture of Integration

### 4.1 The principle

A holon is a whole that is also a part of a larger whole. Each stage is a holon: it is complete in itself AND it is included in every subsequent stage. **Healthy development requires that every earlier stage remains accessible, integrated, and healthy.**

This means:
- A player at Orange who has an unresolved Red-stage shadow **cannot fully function at Orange**
- The game must **always bring the player back** to earlier stages where shadows exist
- Advancement is not escape from earlier stages — it is *deeper integration* of them

### 4.2 The holonic return mechanic

```
After every N encounters at the current stage:
  1. Check all earlier stages for unresolved shadows
  2. If any exist: surface a "return encounter" at that stage
  3. The return encounter uses the SAME assessment module for that (line, stage)
     but in "shadow mode" — testing drive-health, not just capacity
  4. Resolution = demonstrating healthy drive function at that stage
  5. Unresolved shadows accumulate and eventually BLOCK advancement
```

### 4.3 Shadow mode vs. capacity mode

Every assessment module has TWO modes:

| Mode | Purpose | What it measures | When used |
|---|---|---|---|
| **Capacity mode** | Assess whether the player CAN operate at this stage | Accuracy, speed, depth, complexity | Onboarding, advancement testing |
| **Shadow mode** | Assess whether the player has HEALTHY RELATIONSHIP to this stage | Drive-health (agency, communion, eros, agape) | Shadow encounters, holonic return |

In shadow mode, the same tasks are presented but the scoring rubric changes:
- **Addiction test:** Can the player *stop* using this capacity when asked? Can they switch to a different approach? Do they over-rely on it?
- **Allergy test:** Can the player *access* this capacity without resistance? Do they avoid it? Do they show discomfort when asked to use it?

### 4.4 The shadow encounter structure

A shadow encounter:
1. **Names the shadow** explicitly ("You are avoiding your body's power" or "You cannot stop planning")
2. **Presents the capacity** in a context where the healthy response is NOT the obvious one
3. **For addiction:** rewards *letting go* — the player must succeed by NOT using the addicted capacity
4. **For allergy:** rewards *accessing* — the player must succeed by USING the avoided capacity
5. **Scores drive-health** — did they demonstrate agency, communion, eros, agape appropriately?
6. **Records resolution** — the shadow is marked resolved when drive-health exceeds threshold

---

## 5. Detection and Diagnostics

### 5.1 Three detection layers

| Layer | What it detects | Data source | Timeframe |
|---|---|---|---|
| **Behavioural** | Fixation, regression, repression (the original 3) | Altitude history, encounter frequency | Sessions (macro) |
| **Drive-pattern** | Addiction/allergy risk per module | Drive-health scores from assessments | Per-encounter (micro) |
| **Cross-line** | Compensatory patterns (one line substituting for another) | Line-usage patterns, strategy choices | Sessions (macro) |

### 5.2 Behavioural detection (existing, refined)

```ts
interface BehaviouralSignal {
  type: 'fixation' | 'regression' | 'repression';
  line: Line;
  stage: Stage;
  sessionsOfEvidence: number;
  confidence: number;
}
```

- **Fixation:** altitude unchanged for ≥ 5 sessions despite encounters
- **Regression:** altitude dropped ≥ 1 stage and held for ≥ 3 sessions
- **Repression:** line encounter-share < 50% of expected for ≥ 5 sessions

### 5.3 Drive-pattern detection (new)

```ts
interface DriveHealthScore {
  line: Line;
  stage: Stage;
  agency: number;      // 0-1
  communion: number;   // 0-1
  eros: number;        // 0-1
  agape: number;       // 0-1
}

interface ShadowDiagnosis {
  line: Line;
  stage: Stage;
  type: 'addiction' | 'allergy';
  severity: number;    // 0-1
  primaryDrive: Drive; // which drive is most pathological
  evidence: string[];  // what behaviours triggered this
}

function diagnoseShadow(driveHealth: DriveHealthScore): ShadowDiagnosis | null {
  const addictionRisk = (1 - driveHealth.eros) * (1 - driveHealth.communion);
  const allergyRisk = (1 - driveHealth.agape) * (1 - driveHealth.agency);

  if (addictionRisk > ADDICTION_THRESHOLD) {
    return {
      line: driveHealth.line,
      stage: driveHealth.stage,
      type: 'addiction',
      severity: addictionRisk,
      primaryDrive: driveHealth.eros < driveHealth.communion ? 'Eros' : 'Communion',
      evidence: [],
    };
  }
  if (allergyRisk > ALLERGY_THRESHOLD) {
    return {
      line: driveHealth.line,
      stage: driveHealth.stage,
      type: 'allergy',
      severity: allergyRisk,
      primaryDrive: driveHealth.agape < driveHealth.agency ? 'Agape' : 'Agency',
      evidence: [],
    };
  }
  return null;
}
```

### 5.4 How assessment modules measure drive-health

Each of the 64 assessment modules includes **drive-health probes** alongside capacity probes:

| Drive | Probe type | Example (Cognitive/Red) |
|---|---|---|
| **Agency** | "Can you do this without help?" | Present n=2 task with optional hint button. Agency = not using hints. |
| **Communion** | "Can you help another do this?" | Present a cooperative variant where player must explain their strategy. |
| **Eros** | "Can you let go of this and try something harder?" | After success at n=2, offer n=3 with risk of failure. Eros = willingness to try. |
| **Agape** | "Can you return to this without shame?" | After working at n=3, ask to do n=1 again. Agape = doing it fully, not dismissively. |

---

## 6. The Full Shadow Taxonomy (128 entries)

### 6.1 Structure

Each of the 128 shadows has:
```ts
interface ShadowDefinition {
  readonly line: Line;
  readonly stage: Stage;
  readonly type: 'addiction' | 'allergy';
  readonly name: string;                    // e.g., "The Compulsive Planner"
  readonly description: string;             // what it looks like in behaviour
  readonly healthyExpression: string;       // what the integrated version looks like
  readonly triggerDrives: Drive[];          // which drives are pathological
  readonly healingDrives: Drive[];          // which drives must be strengthened
  readonly assessmentCriteria: string[];    // how to detect it
  readonly resolutionCriteria: string[];    // how to know it's healed
}
```

### 6.2 Naming convention

Each shadow is named as an archetype:
- **Addiction shadows** are named as "The [Over-doer]" — e.g., "The Compulsive Planner" (Cognitive/Red/Addiction)
- **Allergy shadows** are named as "The [Avoider]" — e.g., "The Impulsive Actor" (Cognitive/Red/Allergy)

### 6.3 Per-line shadow families

| Line | Addiction family | Allergy family |
|---|---|---|
| Cognitive | The Over-Thinkers | The Under-Thinkers |
| Emotional | The Over-Feelers | The Under-Feelers |
| Moral | The Over-Judgers | The Under-Judgers |
| Intrapersonal | The Over-Observers | The Under-Observers |
| Spiritual | The Over-Believers | The Under-Believers |
| Somatic | The Over-Doers | The Under-Doers |
| Willpower | The Over-Controllers | The Under-Controllers |
| Interpersonal | The Over-Connectors | The Under-Connectors |

Each family has 8 members (one per stage), for 16 shadows per line, 128 total.

---

## 7. Holonic Return in Practice

### 7.1 The return schedule

```
Every 3 encounters at the player's current stage:
  1. Compute shadow_priority = max(severity) across all unresolved shadows
  2. If shadow_priority > 0.3:
     → Surface a return encounter at the shadow's (line, stage)
  3. The return encounter runs the assessment module in SHADOW MODE
  4. If resolved: mark shadow as healed, award integration bonus
  5. If not resolved: increase severity slightly (the shadow grows if ignored)
```

### 7.2 Advancement blocking

Per `lines/00 §3.3`, stage advancement requires "no active shadow signals at altitude ≤ target." This is now refined:

```
To advance from stage S to stage S+1:
  - All shadows at stages ≤ S must have severity < 0.3
  - OR: the player must have ATTEMPTED resolution (even if not fully resolved)
  - The game never permanently blocks — but unresolved shadows make advancement
    encounters significantly harder (the shadow manifests as a debuff)
```

### 7.3 The integration bonus

Resolving a shadow awards:
- **Altitude stability** — the line's altitude becomes more resistant to regression
- **Drive-health improvement** — the healed drive gets a permanent boost
- **Narrative unlock** — a codex entry explaining the shadow and its resolution
- **Combat advantage** — encounters at that stage become easier (the capacity is now fluid, not rigid)

---

## 8. Relationship to Encounters and Gameplay

### 8.1 Shadow encounters ARE gameplay

Shadow encounters are not separate from the game — they ARE the game at a deeper level:
- They use the same assessment modules (same tasks, same mechanics)
- They just score differently (drive-health instead of capacity)
- They are framed narratively as "returning to heal" rather than "being tested"

### 8.2 The combat loop includes shadow

```
Normal encounter → capacity assessment → altitude update
  ↓ (every 3 encounters)
Shadow check → if shadow detected → return encounter → drive-health assessment
  ↓
Shadow resolution → integration bonus → back to normal encounters
```

### 8.3 Enemies as shadow projections

Major enemies are *projections* of the player's own shadows:
- An enemy's combat style mirrors the player's addiction (what they over-use)
- The enemy's weakness is the player's allergy (what they avoid)
- Defeating the enemy requires accessing the avoided capacity

This means: **every player faces a different version of each boss**, tailored to their specific shadow profile.

---

## 9. Architectural Contract

```ts
type ShadowPathology = 'addiction' | 'allergy';

interface ShadowSignal {
  readonly type: ShadowPathology;
  readonly line: Line;
  readonly stage: Stage;
  readonly severity: number;           // 0-1
  readonly primaryDrive: Drive;        // which drive is most pathological
  readonly detectedAtMs: number;
  readonly resolved: boolean;
  readonly resolutionAttempts: number;
}

interface DriveHealth {
  readonly line: Line;
  readonly stage: Stage;
  readonly agency: number;
  readonly communion: number;
  readonly eros: number;
  readonly agape: number;
}

interface PlayerProfile {
  // ... existing fields ...
  readonly shadows: readonly ShadowSignal[];
  readonly driveHealth: readonly DriveHealth[];  // one per assessed module
}
```

Pure functions:
- `diagnoseShadows(profile): ShadowSignal[]` — from drive-health scores
- `computeDriveHealth(assessmentResult): DriveHealth` — from assessment data
- `shouldSurfaceReturn(profile): { line: Line; stage: Stage } | null`
- `isShadowResolved(signal, newDriveHealth): boolean`

Tested invariants:
1. A new player has zero shadows (no false positives)
2. Addiction and allergy are mutually exclusive for the same (line, stage) — you cannot be both addicted to and allergic to the same capacity
3. Resolution requires drive-health above threshold on the *healing* drives
4. Severity increases by 0.05 per session if unaddressed (caps at 1.0)
5. A resolved shadow does not re-trigger from the same evidence

---

## 10. Open Questions

- **Severity decay:** Should shadows naturally decay if the player demonstrates health elsewhere? Tentative: yes, at 0.01 per session, so mild shadows self-resolve.
- **Shadow interaction:** Can two shadows reinforce each other? (e.g., Cognitive/Red addiction + Emotional/Red allergy = "thinks instead of feeling"). Tentative: yes, and this creates "compound shadows" that require multi-line resolution.
- **Multiplayer shadows:** Two players' shadows can be each other's medicine. A co-op shadow encounter is powerful design space. Underspecified for now.
- **Age-appropriateness:** Shadow content must be age-appropriate. A child's "shadow" is not the same as an adult's. The system must calibrate language and framing.

---

## 11. Principles Served

Principles **1, 4, 5, 6** — completes the developmental picture (integration, not just ascent), keeps stage advancement honest, makes the game a genuine developmental tool (not just a proxy), and prevents the game from masquerading as therapy while still being legitimately efficacious.

---

## 12. Disintegrative Negative Feedback Loops

### 12.1 The active decomposition cycle

When drives are pathologized through **ADDICTION** (fixation), the holon enters an active decomposition cycle. This is not a one-time event — it is a self-reinforcing feedback loop that accelerates over time. The holon does not simply "have a shadow"; it actively deepens that shadow through each cycle of pathological catalyst processing.

The loop operates across all 4 axes simultaneously:

| Axis | How the loop manifests |
|---|---|
| **UL — Matrix** (conscious will) | The unfed mind becomes increasingly hijacked by the fixation; free will narrows to serve the addiction |
| **UR — Infrastructure** (external behaviour) | Behavioural patterns rigidify; the player's actions become predictable, repetitive, and compulsive |
| **LL — Potentiator** (emergent unconscious) | The emergent unconscious is sealed off; higher capacities cannot emerge because the boundary is distorted |
| **LR — Catalyst Field** (environmental interaction) | The contact boundary selectively ingests only pathological catalyst; the environment is recruited to feed the addiction |

### 12.2 The 8-step disintegrative loop

```
1. DRIVE PATHOLOGY
   ↓ A drive becomes fixated (addiction) — the holon clings to a specific capacity or pattern

2. CONTACT BOUNDARY DISTORTS
   ↓ The boundary's selective permeability warps to serve the fixation;
     it admits catalyst that reinforces the addiction and rejects catalyst that would break it

3. CATALYST SELECTION BECOMES PATHOLOGICAL
   ↓ The environment is scanned for stimuli that mirror the fixation;
     the holon unconsciously recreates the conditions that feed the addiction

4. EXPERIENCE GENERATION BECOMES SKEWED
   ↓ Because the catalyst is pathological and the processing is distorted,
     the resulting Experience reinforces the original pathology rather than resolving it

5. SHADOW DEEPENS
   ↓ The skewed Experience strengthens the shadow material;
     the fixation becomes more entrenched, the knot tighter

6. STRUCTURAL INTEGRITY DEGRADES
   ↓ The holon's ability to function at its developmental level weakens;
     other capacities are starved of energy as resources flow to the fixation

7. CROSS-AXIS CONTAMINATION
   ↓ The pathology spreads to adjacent axes:
     a dark-addiction in one line contaminates the drive-health of related lines;
     a dark-addiction at one stage contaminates adjacent stages

8. RETURN TO STEP 1 WITH INCREASED INTENSITY
   → The loop restarts with a more entrenched fixation, a more distorted boundary,
     narrower catalyst selection, and more skewed experience generation
```

### 12.3 Manifestation at each developmental step

The disintegrative loop manifests differently at each of the 8 developmental steps, because the nature of the fixation and the available catalyst change with each stage:

| Step | Primary fixation risk | How the loop manifests at this step |
|---|---|---|
| **Red (Survival/Foundation)** | Agency-addiction: domination through raw power | The holon clings to force as the only tool; boundary admits only threats; experience confirms the world is hostile; structural integrity reduces to fight-or-flight |
| **Orange (Growth/Expansion)** | Agency-addiction: domination through achievement | The holon clings to metrics and winning; boundary admits only competitive stimuli; experience becomes zero-sum; other capacities atrophy in service of performance |
| **Yellow (Cognition/Symbolic)** | Eros-addiction: compulsive abstraction | The holon clings to conceptual mastery; boundary admits only intellectual stimuli; experience becomes disembodied; somatic and relational capacities degrade |
| **Green (Order/Institutional)** | Communion-addiction: fusion with the group | The holon clings to belonging; boundary dissolves into the collective; experience is mediated through the group; individual agency atrophies |
| **Blue (Formal Systems)** | Eros-addiction: compulsive systematizing | The holon clings to formal structure; boundary admits only system-compatible stimuli; experience is reduced to categories; intuitive and emergent capacities are blocked |
| **Indigo (Integration)** | Agape-addiction: premature inclusion | The holon clings to unity; boundary collapses (confluence); experience is homogenized; differentiation and individuation are lost |
| **Violet (Convergence)** | Eros-addiction: rushing toward completion | The holon clings to finality; boundary admits only terminal stimuli; experience is compressed; the rich complexity of the journey is flattened |
| **Source (Return)** | Agape-addiction: dissolution of boundaries | The holon clings to transcendence; boundary dissolves entirely; experience becomes undifferentiated; the individual cannot maintain coherent selfhood |

### 12.4 Breaking the loop

The disintegrative loop can only be broken by introducing a **counter-drive** — the complementary drive that opposes the fixation:

- Agency-addiction is broken by Communion (joining with what is other)
- Communion-addiction is broken by Agency (individuating from the group)
- Eros-addiction is broken by Agape (descending to embrace what IS)
- Agape-addiction is broken by Eros (ascending to reach toward what COULD BE)

In game terms: the shadow encounter must present a context where the FIXATED DRIVE CANNOT SUCCEED and the COMPLEMENTARY DRIVE is the only path forward.

---

## 13. Stagnation Paths

### 13.1 The passive decomposition cycle

When drives are pathologized through **ALLERGY** (aversion), the holon enters a passive decomposition cycle. Unlike the active, accelerating spiral of the disintegrative loop, stagnation is a slow atrophy — a gradual death from disuse. The holon does not destroy itself through fixation; it starves itself through avoidance.

The stagnation path operates across all 4 axes simultaneously:

| Axis | How stagnation manifests |
|---|---|
| **UL — Matrix** (conscious will) | The unfed mind becomes increasingly empty; the capacity is avoided so thoroughly that the neural substrate degrades |
| **UR — Infrastructure** (external behaviour) | The avoided capacity is never exercised; behavioural competence atrophies; the player loses the *ability* to engage even if they wanted to |
| **LL — Potentiator** (emergent unconscious) | The emergent unconscious cannot feed the Matrix through the avoided capacity; a developmental channel is sealed shut |
| **LR — Catalyst Field** (environmental interaction) | The contact boundary blocks all catalyst related to the avoided capacity; the environment stops offering it (confirmation bias) |

### 13.2 The 8-step stagnation path

```
1. DRIVE AVERSION
   ↓ A drive becomes avoided (allergy) — the holon refuses to engage a specific capacity or pattern

2. CONTACT BOUNDARY BECOMES BLOCKED
   ↓ The boundary's selective permeability seals against the avoided domain;
     it rejects catalyst that would require engagement with the avoided capacity

3. CATALYST STARVATION
   ↓ Because the boundary blocks the relevant catalyst, the holon receives
     no nourishment in the avoided domain; the environment stops offering it

4. EXPERIENCE STARVATION
   ↓ Without catalyst, no Experience can be generated in the avoided domain;
     the holon has no raw material for growth in this capacity

5. EVOLUTION STOPS
   ↓ The developmental trajectory halts in the avoided domain;
     the holon cannot advance because it cannot process what it refuses to receive

6. STRUCTURAL INTEGRITY DEGRADES FROM DISUSE
   ↓ The avoided capacity atrophies; neural pathways weaken;
     the holon's overall structural integrity weakens as this foundation crumbles

7. REGRESSION BEGINS
   ↓ Because the foundation is weak, higher capacities that depend on it
     begin to collapse; the holon regresses to whatever is supported
     by its remaining healthy capacities

8. CROSS-AXIS ATROPHY
   ↓ The pathology spreads as a VACUUM:
     adjacent lines lose the support of the atrophied capacity;
     the holon's overall complexity decreases
```

### 13.3 The co-occurrence of loops and stagnation

**The disintegrative loop and the stagnation path are NOT separate — they are two faces of the same pathology and often co-occur.**

A holon rarely has only addictions or only allergies. More commonly:

- An addiction in one domain produces an allergy in the complementary domain (e.g., Eros-addiction → compulsive growth → produces Agape-allergy → cannot return to what was "left behind")
- An allergy in one domain produces an addiction in a compensatory domain (e.g., Communion-allergy → cannot connect → produces Agency-addiction → compensates through domination)

This means the full pathological picture at any module (line × stage) is typically a **coupled loop-stagnation pair**:

```
Addiction (active loop) ←→ Allergy (passive stagnation)
   ↓                          ↓
Accelerates the fixation    Starves the complementary capacity
   ↓                          ↓
Reinforces the allergy      Reinforces the addiction
   ↓                          ↓
The holon spirals           The holon atrophies
```

In game terms: a player who is addicted to planning (Cognitive/Red/Agency-addiction) will simultaneously be allergic to spontaneity (Cognitive/Red/Agency-allergy in the golden domain). The shadow encounter must address BOTH — breaking the loop AND re-opening the atrophied channel.

### 13.4 The stagnation-allergy table

| Drive | Allergy manifestation | What stagnates | Recovery mechanism |
|---|---|---|---|
| **Agency** | Cannot stand alone; needs validation for every action | Sovereignty, boundaries, self-trust | Present contexts where the player MUST act alone; scaffold success in isolation |
| **Communion** | Cannot join; rejects belonging and co-creation | Connection, empathy, relational intelligence | Present contexts where the player MUST coordinate; scaffold success in joining |
| **Eros** | Cannot grow; clings to current stage (Jonah Complex) | Aspiration, transcendence, forward movement | Present the next stage's capacity as safe, achievable, and rewarding |
| **Agape** | Cannot return; dismisses earlier capacities as "beneath" | Integration, embodiment, compassion for the past | Present earlier capacities in a new light that requires genuine engagement |
