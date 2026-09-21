# 23 — Polarity Ontology: The 64-Cell Texture Catalogue

> **Cross-references:** [[AGENTS.md|AGENTS.md (process protocol)]] · [[docs/foundations/16-significator-architecture|16 — Significator Architecture]] · [[docs/foundations/22-holon-context-engine|22 — Holon Context Engine]] · [[docs/foundations/24-encounter-scheduler|24 — Encounter Scheduler]]
> **Lateral:** Per-line × per-stage polarity textures grounded in concept-drafts
> **Depends on:** 19 (polarity engine), 10 (shadow model), 05 (drives), 06 (Law of One)
> **Referenced by:** 19 (§5), 22 (frequency conditioning), 24 (scheduler)

> **Heading-contract map (2026-09-16):** Purpose → §1–§2 (usage + how to read the catalogue); Scientific basis → §11 (cross-line patterns, the catalogue's empirical posture); Game-design mapping → §3–§10 (the 64 cells themselves are the game-design content); Architectural contract → §1 (usage contract for generation); Open questions → §12 (what this document does NOT cover, its forward boundary); Principles served → foundations/19's Critical Design Commitment, which this catalogue operationalises.
>
> **Open questions (added 2026-09-16):**
> - The 64 textures are authored priors — what is the update protocol when live telemetry shows a texture reads as stereotyped or fails to elicit its targeted polarity signal?
> - Should exploratory textures (the third axis) have their own catalogue entries rather than being the residual category?
> **Satisfied by:** `src/core/data/PolarityOntology.ts` (the 64-cell texture catalogue itself, and the lookup the LLM conditioning path reads)

---

## 1. Purpose and Usage

This document is the **periodic table of polarity textures** — a reference ontology specifying what STO and STS expression *look like* at each of the 64 line×stage cells. It is consumed by three systems:

- **The polarity engine (foundations/19):** When a cell's crystallization exceeds 0.6, the engine assigns a `polarity_texture_id` by matching the cell's `dominant_pattern` against this catalogue. The texture ID becomes part of the player's persistent Significator state (foundations/16).

- **The Holon Context Engine (foundations/22):** Uses texture names to condition LLM-generated narrative. A player with "Tactical Service" crystallized at Cognitive/Red receives encounters narrated with service-oriented framing; a player with "Cognitive Dominion" receives encounters narrated with mastery-oriented framing. The LLM never names the texture — it *embodies* it in tone.

- **The encounter scheduler (foundations/24):** Selects catalyst appropriate to the player's texture (depth-catalyst for crystallized cells) or counter-texture (temptation-catalyst for crystallizing cells). The scheduler uses texture IDs to determine which encounters from the concept-draft pool are appropriate.

Each entry names a *healthy, legitimate* expression of that polarity at that developmental frequency. STO and STS are equally valid evolutionary paths (foundations/06 §6). Shadow-risks identify where each polarity *degrades* into pathology — they are not judgements against the polarity itself.

This document is **developer-facing only**. Per the Veil requirement (foundations/20), no texture name, polarity label, or orientation indicator is ever surfaced to the player.

### 1.1 Design commitments

The following commitments govern every entry in this catalogue:

1. **Equal validity.** STO and STS textures are written with equal respect, equal specificity, and equal mechanical fairness. Neither polarity is presented as superior, healthier, or more desirable. Both are legitimate evolutionary paths in the Law of One (foundations/06 §6).

2. **Grounded in concept-drafts.** Every texture is derived from the shadow/drive ontology of its corresponding module-spec. If a concept-draft does not yet exist for a cell, the texture is extrapolated from the line's arc and the stage's developmental character — but must be validated when the concept-draft is written.

3. **Behavioural specificity.** Each texture description specifies *observable behaviour*, not abstract orientation. "Strategic mind deployed to protect the group" is specific; "being good" is not. The engine needs behavioural anchors to match traces against textures.

4. **Shadow-risk honesty.** Every polarity carries a shadow-risk — a way it can degrade into pathology. STO risks are not softer than STS risks. Both polarities can produce genuine suffering when they degrade.

---

## 2. Reading the Catalogue

Each line section (§3–§10) contains a table with the following schema per cell:

| Field | Meaning |
|---|---|
| **Stage** | The developmental stage (Infrared through Turquoise) |
| **STO Texture** | *Name* — radiative/overflow expression at this cell |
| **STS Texture** | *Name* — absorptive/concentrative expression at this cell |
| **Exploratory** | *Name* — uncommitted, sampling-both-directions expression |
| **STO Shadow-Risk** | Which shadow quadrant this polarity risks degrading into |
| **STS Shadow-Risk** | Which shadow quadrant this polarity risks degrading into |

### 2.1 Drive configuration conventions

Rather than repeating per cell, the following conventions apply throughout:

- **STO expressions** foreground **Agape** (descending overflow from transcendent source) + **Communion** (radiating outward toward other-selves). Source of nourishment: above. Energetic direction: radiative. The entity receives from the higher and becomes overflowing — naturally sharing the surplus.

- **STS expressions** foreground **Eros** (ascending concentration from material source) + **Agency** (absorbing inward toward self). Source of nourishment: below. Energetic direction: absorptive. The entity draws from the lower and becomes concentrating — naturally absorbing further to maintain density.

- **Exploratory expressions** show balanced or alternating drive configurations. Source: ambivalent. Direction: sovereign or diffuse. The entity has not yet committed to a consistent source-flow coupling.

### 2.2 Shadow-risk abbreviations

- **DA** = Dark-Addiction (submergent fixation — clings to lower capacity)
- **DAll** = Dark-Allergy (submergent aversion — rejects lower capacity)
- **GA** = Golden-Addiction (emergent fixation — bypasses toward higher without integration)
- **GAll** = Golden-Allergy (emergent aversion — refuses the call to grow)

### 2.3 Texture naming rules

- 2–4 words, evocative, unique across the full 64-cell catalogue
- Each description is one sentence specifying the concrete behavioural expression
- Names are identifiers used by the engine — they must be distinct and memorable

### 2.4 Worked example: reading a cell entry

Consider the entry **Cognitive × Red**:

```
STO Texture:     Tactical Service
Description:     Strategic mind deployed to protect and serve the group
STS Texture:     Cognitive Dominion
Description:     Strategic mind deployed to dominate and control others
Exploratory:     Power-Testing
Description:     Testing cognitive power without committed direction
STO Shadow-Risk: DAll (loses sovereign thinking in service)
STS Shadow-Risk: DA (compulsive strategist fixation)
```

**How the engine uses this:**
1. A player at Cognitive/Red produces traces showing radiative direction + higher-realm source + healthy Communion + healthy Agape → coherence builds toward STO pattern
2. When crystallization > 0.6, the engine assigns `polarity_texture_id = "tactical_service"`
3. The scheduler (foundations/24) now selects depth-catalyst for this texture: encounters that test whether the player can sustain tactical service under pressure, sacrifice, or temptation
4. The LLM (foundations/22) narrates encounters with a service-oriented tone without naming the texture
5. If the player's traces shift toward absorptive + lower-realm, crystallization drops and the texture ID is revoked — the cell returns to exploratory mode

### 2.5 The three-texture completeness requirement

Every cell MUST specify all three textures (STO, STS, Exploratory) because:
- The polarity engine needs to match traces against all three possible patterns
- The scheduler needs to know what catalyst to offer in each mode
- The LLM needs tone-guidance for all three player states
- A missing texture would create a detection gap where the engine cannot classify traces

After each table, commentary describes the line's polarity arc and drive-configuration specifics.

---

## 3. Cognitive Line

| Stage | STO Texture | STS Texture | Exploratory | STO Shadow-Risk | STS Shadow-Risk |
|---|---|---|---|---|---|
| Infrared | *Reflexive Alerting* — sensory vigilance deployed to detect threats for the dyad | *Survival Scanning* — sensory vigilance concentrated to maximise personal threat-detection | *Orienting Drift* — attention moves between self-protective and other-protective scanning | GA (bypasses reflex into premature cognition) | DA (hypervigilant fixation on threat) |
| Magenta | *Symbolic Sharing* — magical thinking offered as gift to comfort and protect others | *Symbolic Hoarding* — magical thinking concentrated as personal power over reality | *Fantasy Wandering* — magical cognition explored without directional commitment | GA (premature abstraction bypassing magic) | DA (magical-control fixation) |
| Red | *Tactical Service* — strategic mind deployed to protect and serve the group | *Cognitive Dominion* — strategic mind deployed to dominate and control others | *Power-Testing* — testing cognitive power without committed direction | DAll (loses sovereign thinking in service) | DA (compulsive strategist fixation) |
| Amber | *Doctrinal Teaching* — rule-knowledge shared to uplift the community's understanding | *Doctrinal Authority* — rule-knowledge concentrated as gatekeeping power over others | *Rule Apprenticeship* — learning the code without committing to its use-direction | GA (premature systems-thinking) | DAll (refuses cognitive growth beyond code) |
| Orange | *Open Inquiry* — rational investigation shared freely as knowledge-commons | *Intellectual Monopoly* — rational investigation concentrated as competitive advantage | *Hypothesis Sampling* — testing rational frameworks without commitment to application | DAll (dissolves rigour into accessibility) | GAll (refuses to share findings or grow) |
| Green | *Perspectival Weaving* — multiple frameworks synthesised in service of collective understanding | *Perspectival Mastery* — multiple frameworks concentrated as personal cognitive supremacy | *Framework Tasting* — sampling perspectives without integrative commitment | DA (relativistic paralysis from over-inclusion) | GA (premature integral performance) |
| Teal | *Vision-Logic Service* — integral cognition deployed to illuminate systemic patterns for all | *Vision-Logic Sovereignty* — integral cognition concentrated as unmatched systemic mastery | *Systemic Contemplation* — resting in integral cognition without directional commitment | DAll (loses precision in over-service) | GAll (refuses to release cognitive mastery) |
| Turquoise | *Transparent Knowing* — non-conceptual awareness radiating as effortless clarity for all | *Luminous Intellect* — non-conceptual awareness concentrated as absolute cognitive self-sufficiency | *Silent Witnessing* — resting in non-conceptual awareness without directional flow | DA (grasps at clarity-states as special) | DA (grasps at knowing-identity as self) |

**Polarity arc:** The Cognitive line polarises slowly (foundations/19 §4.3) because thinking itself is polarity-neutral — direction emerges only from *application*. At lower stages (Infrared–Red), STO/STS differ primarily in *who benefits* from cognitive output. At higher stages (Teal–Turquoise), the distinction becomes subtler: STO cognition becomes increasingly transparent and self-emptying while STS cognition becomes increasingly sovereign and self-contained. Both converge on non-conceptual awareness at Turquoise, approached from opposite directions.

**Drive specifics:** STO Cognitive expression couples Agape (returns to share knowledge with those below) with Communion (thinks *with* others). STS Cognitive expression couples Eros (reaches for ever-higher cognitive mastery) with Agency (thinks *for* self, hoards insight). The concept-draft at Cognitive/Red (module-spec §3) grounds this: Agency-healthy = "sovereign thinking for others" (STO) vs. Agency dark-addicted = "intelligence as weapon" (STS).

**Key-cell notes:**
- *Cognitive/Red* is the calibration cell for this line — the first stage where cognitive polarity becomes legible (tactical service vs. cognitive dominion). Below Red, cognitive polarity is too primitive to distinguish reliably.
- *Cognitive/Green* is the most dangerous cell for false-positive STS detection — perspectival mastery can look like healthy cognitive development. The engine must require high coherence (>0.8) before assigning STS texture here.
- *Cognitive/Turquoise* is unique in that both shadow-risks are DA — at non-conceptual awareness, the only pathology is grasping at the state itself, regardless of polarity direction.

---

## 4. Emotional Line

| Stage | STO Texture | STS Texture | Exploratory | STO Shadow-Risk | STS Shadow-Risk |
|---|---|---|---|---|---|
| Infrared | *Affective Resonance* — proto-emotional contagion radiating comfort to the dyad | *Affective Self-Soothing* — proto-emotional regulation concentrated inward for survival | *Feeling Drift* — affect moves between self-regulation and other-attunement | GA (premature empathy bypassing reflex) | DA (self-soothing fixation) |
| Magenta | *Feeling Gifting* — emotional states offered to family as magical nourishment | *Feeling Harvesting* — absorbing others' emotional states as personal fuel | *Emotional Play* — trying on different feeling-states without directional commitment | DAll (loses self in others' emotional needs) | DA (emotional vampirism fixation) |
| Red | *Passionate Protection* — raw emotion channelled to defend the vulnerable | *Passionate Dominance* — raw emotion channelled to intimidate and control | *Emotional Sparring* — testing emotional force without committed direction | DAll (burns out in emotional service) | DAll (refuses emotional vulnerability) |
| Amber | *Empathic Guardianship* — role-congruent affect deployed to nurture group belonging | *Emotional Enforcement* — role-congruent affect weaponised to shame deviants | *Duty-Feeling Apprenticeship* — learning role-emotions without committing to use | DA (duty-martyr; crushing guilt cycle) | DA (emotional rigidity and control) |
| Orange | *Emotional Transparency* — reflective affect shared openly to build authentic trust | *Emotional Intelligence* — reflective affect concentrated as interpersonal leverage | *Affect Examination* — examining emotional patterns without committing to direction | GA (premature vulnerability without ground) | GAll (refuses emotional openness) |
| Green | *Compassionate Holding* — pluralistic empathy radiating unconditional positive regard | *Empathic Absorption* — pluralistic empathy concentrated as emotional omniscience | *Empathic Sampling* — holding multiple emotional perspectives without commitment | DA (compassion fatigue; boundary-loss) | GA (premature non-dual feeling) |
| Teal | *Integral Compassion* — trans-perspectival feeling deployed to serve evolutionary healing | *Integral Affect Mastery* — trans-perspectival feeling concentrated as emotional sovereignty | *Feeling-Field Contemplation* — resting in integral affect without directional commitment | DAll (loses self in collective feeling-field) | GAll (refuses emotional release) |
| Turquoise | *Transparent Feeling* — non-dual affect radiating as effortless warmth without agenda | *Luminous Equanimity* — non-dual affect concentrated as absolute emotional self-sufficiency | *Sacred Stillness* — resting in equanimous feeling without directional flow | DA (grasps at bliss-states as special) | DA (residual feeling-identity) |

**Polarity arc:** The Emotional line polarises at moderate speed — empathy/absorption maps naturally to STO/STS but requires pattern accumulation across encounters. The key fork occurs at Amber, where role-congruent affect first creates a clear STO/STS split: nurturing (Empathic Guardianship) vs. enforcing (Emotional Enforcement). At Green and above, both polarities approach equanimity — STO through compassionate overflow, STS through mastered self-sufficiency — making the distinction increasingly subtle.

**Drive specifics:** STO Emotional expression couples Communion (shares feeling with others) with Agape (descends to hold others' pain). STS Emotional expression couples Agency (maintains emotional sovereignty) with Eros (reaches for ever-greater emotional mastery). The concept-draft at Emotional/Amber (module-spec §3) grounds this: Communion-healthy = "shares role-emotions with group without losing personal affect" (STO) vs. Communion dark-addicted = "imposes emotional standards on others" (STS).

**Key-cell notes:**
- *Emotional/Amber* is the sharpest fork in this line — Empathic Guardianship vs. Emotional Enforcement are behaviourally distinct and easily detected. This cell often crystallizes first within the Emotional line.
- *Emotional/Green* presents a detection challenge: Compassionate Holding (STO) and Empathic Absorption (STS) can look identical in short encounters. The engine must track whether the player's empathy *overflows* (leaves them energised) or *absorbs* (leaves others drained).
- *Emotional/Orange* is where the STO/STS distinction first becomes *strategic* rather than instinctive — Emotional Transparency is a deliberate choice to share, while Emotional Intelligence is a deliberate choice to leverage.

---

## 5. Moral Line

| Stage | STO Texture | STS Texture | Exploratory | STO Shadow-Risk | STS Shadow-Risk |
|---|---|---|---|---|---|
| Infrared | *Proto-Fairness* — pre-moral impulse toward equal distribution in the dyad | *Proto-Claiming* — pre-moral impulse toward securing all resources for self | *Resource Noticing* — attending to distribution without moral commitment | GA (premature moral reasoning) | DA (hoarding fixation) |
| Magenta | *Magical Justice* — belief that the world rewards goodness, deployed to comfort others | *Magical Entitlement* — belief that the world owes ME, concentrated as destiny | *Moral Fantasy* — trying on different magical-moral narratives | DAll (loses self in others' moral claims) | DA (entitlement fixation) |
| Red | *Power-for-Protection* — egocentric moral force deployed to shield the weak | *Power-for-Dominion* — egocentric moral force deployed to subjugate others | *Moral Muscle-Testing* — testing moral power without committed direction | DAll (loses sovereignty in protective service) | DAll (refuses moral vulnerability) |
| Amber | *Code Stewardship* — conventional morality deployed to protect community integrity | *Code Enforcement* — conventional morality concentrated as punitive control | *Code Learning* — internalising moral rules without committing to application | DA (rigid moralism; over-identification) | DA (punitive fixation; moral cruelty) |
| Orange | *Principled Advocacy* — universal principles deployed to expand justice for all | *Principled Self-Interest* — universal principles deployed to justify personal advantage | *Ethical Reasoning* — testing moral principles without commitment to action | DAll (loses ground in over-advocacy) | GAll (refuses moral growth) |
| Green | *Pluralistic Compassion* — contextual ethics radiating to include all perspectives | *Moral Gatekeeping* — contextual ethics concentrated to control who is 'in' and 'out' | *Ethical Sampling* — trying different moral frameworks without commitment | DA (moral relativism; paralysis) | GA (premature integral ethics) |
| Teal | *Evolutionary Ethics* — integral morality deployed to serve planetary evolution | *Evolutionary Sovereignty* — integral morality concentrated as moral supremacy | *Moral Integration* — holding all moral stages without committing to hierarchy | DAll (loses moral ground in service) | GAll (refuses moral release) |
| Turquoise | *Transparent Goodness* — non-dual morality radiating as effortless rightness | *Luminous Justice* — non-dual morality concentrated as absolute moral self-sufficiency | *Sacred Amorality* — resting beyond moral categories without directional flow | DA (grasps at moral purity) | DA (residual moral-identity) |

**Polarity arc:** The Moral line polarises fastest of all eight lines — every dilemma is inherently a polarity probe because moral choices directly reveal whether energy flows toward others (service) or toward self (control). The STO arc consistently radiates outward: protection → stewardship → advocacy → compassion → evolutionary service → transparent goodness. The STS arc consistently concentrates inward: claiming → dominion → enforcement → self-interest → gatekeeping → sovereignty → luminous justice. The Amber fork (stewardship vs. enforcement) is the sharpest single polarity distinction in the entire catalogue.

**Drive specifics:** STO Moral expression couples Agape (descends to care for those harmed) with Communion (joins with others in moral community). STS Moral expression couples Agency (asserts moral authority over others) with Eros (reaches for ever-higher moral status). The concept-draft at Moral/Green (module-spec §3) grounds this: Agape-healthy = "returns to embody care-ethics in concrete relationships" (STO) vs. Agency-pathological = "rigidifies into universal principles; refuses context" (STS seed).

**Key-cell notes:**
- *Moral/Amber* produces the single sharpest polarity distinction in the entire 64-cell catalogue. Code Stewardship (protecting the community through moral care) vs. Code Enforcement (controlling the community through moral punishment) are unmistakable in behaviour and crystallize rapidly.
- *Moral/Green* is the most complex cell — Pluralistic Compassion (STO) and Moral Gatekeeping (STS) both use the same contextual-ethical vocabulary. Detection requires tracking *who benefits* from the player's moral sensitivity: does it expand inclusion (STO) or contract it (STS)?
- *Moral/Infrared* is the most primitive cell — Proto-Fairness and Proto-Claiming are pre-verbal and detected only through resource-distribution behaviour in the earliest encounters.

---

## 6. Intrapersonal Line

| Stage | STO Texture | STS Texture | Exploratory | STO Shadow-Risk | STS Shadow-Risk |
|---|---|---|---|---|---|
| Infrared | *Boundary Offering* — self-other distinction deployed to create safe space for the other | *Boundary Fortification* — self-other distinction concentrated to maximise personal safety | *Boundary Sensing* — noticing where self ends without committing to use | DAll (boundary-dissolution in service) | DA (boundary-fixation; hypervigilant enclosure) |
| Magenta | *Self-as-Gift* — magical self-image offered as protective blessing to family | *Self-Inflation* — magical self-image concentrated as personal grandiosity | *Identity Play* — trying on different self-images without commitment | GA (premature self-concept bypassing body) | DA (self-image fixation; narcissistic seed) |
| Red | *Sovereign Service* — ego-strength deployed to champion others' causes | *Sovereign Dominion* — ego-strength concentrated as personal empire | *Ego-Testing* — testing self-power without committed direction | DAll (loses self in others' causes) | DAll (refuses self-examination) |
| Amber | *Role Devotion* — role-identity deployed to serve the group's needs faithfully | *Role Possession* — role-identity concentrated as personal territory and status | *Role Apprenticeship* — learning role-identity without committing to direction | DA (role-fusion; identity-loss in group) | GAll (refuses identity growth beyond role) |
| Orange | *Reflective Mentoring* — self-knowledge shared to help others know themselves | *Reflective Advantage* — self-knowledge concentrated as strategic self-optimisation | *Self-Examination* — examining self-patterns without committing to application | GA (premature self-transcendence) | GAll (refuses self-disclosure) |
| Green | *Authentic Vulnerability* — pluralistic self-awareness offered as bridge to connection | *Authentic Sovereignty* — pluralistic self-awareness concentrated as impenetrable self-knowledge | *Identity Sampling* — holding multiple self-perspectives without commitment | DA (self-loss in excessive vulnerability) | GA (premature integral self) |
| Teal | *Integral Witness Service* — trans-perspectival self-awareness deployed to mirror others' growth | *Integral Self-Mastery* — trans-perspectival self-awareness concentrated as absolute self-possession | *Witness Contemplation* — resting in integral self-awareness without direction | DAll (loses witness in service) | GAll (refuses self-release) |
| Turquoise | *Transparent Self* — non-dual self-awareness radiating as selfless presence | *Luminous Self-Sovereignty* — non-dual self-awareness concentrated as absolute self-sufficiency | *Sacred Self-Absence* — resting in no-self without directional flow | DA (grasps at selflessness as identity) | DA (residual self-identity; "I am awake") |

**Polarity arc:** The Intrapersonal line polarises at moderate speed — self-relationship reveals orientation indirectly through how self-knowledge is *used*. The STO arc progressively empties the self: boundary-offering → self-as-gift → sovereign service → role devotion → reflective mentoring → authentic vulnerability → witness service → transparent self. The STS arc progressively fills the self: boundary-fortification → self-inflation → sovereign dominion → role possession → reflective advantage → authentic sovereignty → integral self-mastery → luminous self-sovereignty. Both reach completion at Turquoise — one through self-emptying, the other through self-completion.

**Drive specifics:** STO Intrapersonal expression couples Agape (descends to offer self-knowledge to others) with Communion (uses self-awareness to bridge toward others). STS Intrapersonal expression couples Eros (reaches for ever-deeper self-mastery) with Agency (maintains absolute self-sovereignty). The concept-draft at Intrapersonal/Infrared (module-spec §4) grounds this: Communion-healthy = "permeable boundary, allowing world-contact without dissolution" (STO seed) vs. Agency-healthy = "asserting body-boundary, claiming space as mine" (STS seed).

**Key-cell notes:**
- *Intrapersonal/Infrared* is foundational — Boundary Offering vs. Boundary Fortification establishes the earliest self-other energetic direction. This cell's texture often predicts the line's eventual crystallization direction.
- *Intrapersonal/Green* is the most therapeutically significant cell — Authentic Vulnerability (STO) and Authentic Sovereignty (STS) represent two genuinely healthy ways of relating to self-knowledge. Neither is pathological; both are complete.
- *Intrapersonal/Turquoise* presents the deepest paradox: Transparent Self (STO) is selflessness-as-presence; Luminous Self-Sovereignty (STS) is self-sufficiency-as-presence. Both are non-dual; they differ only in residual energetic direction.

---

## 7. Spiritual Line

| Stage | STO Texture | STS Texture | Exploratory | STO Shadow-Risk | STS Shadow-Risk |
|---|---|---|---|---|---|
| Infrared | *Numinous Comfort* — proto-spiritual awe deployed to soothe the dyad | *Numinous Claiming* — proto-spiritual awe concentrated as personal specialness | *Wonder Drift* — attending to the numinous without directional commitment | GA (premature spiritual identity) | DA (awe-fixation; overwhelm) |
| Magenta | *Sacred Gifting* — magical faith offered to protect and bless others | *Sacred Power* — magical faith concentrated as personal invincibility | *Ritual Play* — trying on different sacred narratives without commitment | DAll (loses self in others' sacred needs) | DA (magical-spiritual fixation) |
| Red | *Warrior Devotion* — egocentric spiritual force deployed to champion the sacred for others | *Warrior Apotheosis* — egocentric spiritual force concentrated as personal divinity | *Sacred Power-Testing* — testing spiritual force without committed direction | DAll (burns out in devotional service) | DAll (refuses spiritual vulnerability) |
| Amber | *Faithful Service* — mythic-membership faith deployed to nurture the congregation | *Faithful Authority* — mythic-membership faith concentrated as doctrinal power | *Faith Apprenticeship* — learning the tradition without committing to use | DA (dogmatic service-addiction) | DA (dogmatic control-addiction) |
| Orange | *Rational Reverence* — demythologised spirituality shared as universal wisdom | *Rational Transcendence* — demythologised spirituality concentrated as personal mastery over the sacred | *Spiritual Inquiry* — examining spiritual claims without commitment | GA (premature post-traditional bypassing) | GAll (refuses spiritual deepening) |
| Green | *Interfaith Communion* — pluralistic spirituality radiating to honour all paths | *Spiritual Connoisseurship* — pluralistic spirituality concentrated as personal tradition-collection | *Path Sampling* — trying different spiritual traditions without commitment | DA (spiritual relativism; no ground) | GA (premature integral spirituality) |
| Teal | *Integral Priesthood* — cross-tradition synthesis deployed to serve collective awakening | *Integral Adeptship* — cross-tradition synthesis concentrated as spiritual supremacy | *Contemplative Integration* — resting in integral spirituality without direction | DAll (loses self in collective awakening) | GAll (refuses spiritual release) |
| Turquoise | *Transparent Presence* — non-dual awareness radiating as effortless compassion | *Luminous Sovereignty* — non-dual awareness concentrated as absolute spiritual self-sufficiency | *Sacred Equanimity* — resting in non-dual without directional commitment | DA (grasps at presence-states) | DA (residual seeker-identity) |

**Polarity arc:** The Spiritual line polarises fast — source-of-nourishment (transcendent vs. material) is directly probed at every stage. STO spiritual expression consistently draws from above and overflows outward as blessing, service, and communion. STS spiritual expression consistently draws from below and concentrates inward as power, mastery, and sovereignty. The distinction is clearest at Amber (faithful service vs. faithful authority) and becomes most subtle at Turquoise, where both polarities approach the same non-dual ground — one through self-emptying into the sacred, the other through absorbing the sacred into the self.

**Drive specifics:** STO Spiritual expression couples Agape (descends to share sacred experience with all) with Communion (joins with others in shared worship/practice). STS Spiritual expression couples Eros (reaches for ever-higher spiritual attainment) with Agency (maintains absolute spiritual sovereignty). The concept-draft at Spiritual/Turquoise (module-spec §3) grounds this: all drives equanimous in STO (transparent upward movement without grasping) vs. residual grasping-at-sacred concentrated into self-identity in STS.

**Key-cell notes:**
- *Spiritual/Amber* is the most culturally loaded cell — Faithful Service vs. Faithful Authority maps directly onto the priest/inquisitor archetype. Both shadow-risks are DA, reflecting that mythic-membership faith tends toward fixation regardless of polarity direction.
- *Spiritual/Green* presents a subtle detection challenge: Interfaith Communion (STO) and Spiritual Connoisseurship (STS) both engage multiple traditions. The distinction is whether engagement *serves* the traditions (STO) or *collects* them (STS).
- *Spiritual/Turquoise* is the capstone cell for the entire polarity system — Transparent Presence (STO) and Luminous Sovereignty (STS) are the two faces of harvest-readiness. This cell's crystallization is the final signal before harvestability assessment (foundations/19 §9).

---

## 8. Somatic Line

| Stage | STO Texture | STS Texture | Exploratory | STO Shadow-Risk | STS Shadow-Risk |
|---|---|---|---|---|---|
| Infrared | *Reflexive Shielding* — survival reflexes deployed to protect the dyad from harm | *Reflexive Self-Preservation* — survival reflexes concentrated for personal survival | *Somatic Alerting* — body-readiness without directional commitment | GA (premature body-control) | DA (hyperarousal fixation) |
| Magenta | *Body Blessing* — body-fantasy offered as magical protection for others | *Body Magic* — body-fantasy concentrated as personal somatic omnipotence | *Postural Play* — trying on different body-states without commitment | DAll (loses body-boundary in service) | DA (body-magic fixation) |
| Red | *Protective Strength* — power-body deployed to shield the vulnerable | *Dominant Strength* — power-body concentrated to intimidate and control | *Physical Sparring* — testing body-power without committed direction | DAll (burns out in physical service) | DAll (refuses somatic vulnerability) |
| Amber | *Disciplined Service* — trained body deployed in faithful service to the group | *Disciplined Dominion* — trained body concentrated as physical authority | *Form Practice* — learning bodily discipline without committing to use | DA (rigid body-discipline; cannot relax) | GAll (refuses somatic growth) |
| Orange | *Athletic Generosity* — skilled body shared through teaching and demonstration | *Athletic Excellence* — skilled body concentrated as competitive supremacy | *Skill Exploration* — testing physical capacities without commitment | GA (premature somatic transcendence) | GAll (refuses to share skill) |
| Green | *Embodied Compassion* — somatic sensitivity radiating as healing presence | *Embodied Mastery* — somatic sensitivity concentrated as personal body-wisdom | *Somatic Sensitivity* — exploring body-awareness without directional commitment | DA (somatic boundary-loss) | GA (premature integral embodiment) |
| Teal | *Integral Embodiment* — trans-somatic awareness deployed to serve collective healing | *Integral Body Sovereignty* — trans-somatic awareness concentrated as absolute self-mastery | *Somatic Contemplation* — resting in integral body-awareness without direction | DAll (loses body-self in collective) | GAll (refuses somatic release) |
| Turquoise | *Transparent Body* — non-dual embodiment radiating as effortless physical grace | *Luminous Physicality* — non-dual embodiment concentrated as absolute somatic self-sufficiency | *Sacred Embodiment* — resting in body without directional flow | DA (grasps at body-bliss) | DA (residual body-identity) |

**Polarity arc:** The Somatic line polarises slowest of all eight lines — body-use is inherently polarity-neutral, and direction emerges only from *purpose* of embodiment. At lower stages (Infrared–Red), the STO/STS distinction is primarily about *who* the body serves (others vs. self). At higher stages (Green–Turquoise), it becomes about whether embodiment *overflows* into the environment as healing presence or *concentrates* into the self as sovereign mastery. The line's late polarisation means somatic cells are typically the last to crystallize in a player's polarity profile.

**Drive specifics:** STO Somatic expression couples Agape (descends to embody care physically) with Communion (shares body-space and physical skill with others). STS Somatic expression couples Eros (reaches for ever-greater physical mastery) with Agency (maintains absolute physical sovereignty). The concept-draft at Somatic/Magenta (module-spec §2) grounds this: body-fantasy offered as protection (STO seed) vs. body-fantasy concentrated as omnipotence (STS seed — "my posture makes me powerful over you").

**Key-cell notes:**
- *Somatic/Magenta* is the earliest cell where somatic polarity becomes detectable — Body Blessing vs. Body Magic are behaviourally distinct in how the player relates to body-fantasy (for others vs. for self).
- *Somatic/Red* is the most physically legible cell — Protective Strength vs. Dominant Strength are visible in combat behaviour (shields allies vs. intimidates enemies). This is often the first somatic cell to crystallize.
- *Somatic/Green* is where the line transitions from physical to subtle — Embodied Compassion (STO) is healing presence, while Embodied Mastery (STS) is body-wisdom sovereignty. Detection shifts from observable behaviour to energetic quality.

---

## 9. Willpower Line

| Stage | STO Texture | STS Texture | Exploratory | STO Shadow-Risk | STS Shadow-Risk |
|---|---|---|---|---|---|
| Infrared | *Survival Persistence* — proto-will deployed to sustain the dyad through hardship | *Survival Tenacity* — proto-will concentrated to endure personal threat at all costs | *Effort Drift* — exerting will without directional commitment | GA (premature goal-setting) | DA (hypervigilant effort) |
| Magenta | *Wishing-for-Others* — magical will offered as blessing for others' wellbeing | *Wishing-for-Self* — magical will concentrated as personal destiny-claiming | *Wish Play* — trying on different desires without commitment | DAll (loses will in others' wishes) | DA (wish-fixation; entitlement) |
| Red | *Championing Will* — ego-force deployed to fight for others' goals | *Dominating Will* — ego-force concentrated to impose personal goals on others | *Will-Testing* — testing volitional force without committed direction | DAll (burns out championing) | DA (compulsive effort; cannot rest) |
| Amber | *Dutiful Commitment* — disciplined will deployed in faithful service to the code | *Dutiful Control* — disciplined will concentrated as authority over others' commitments | *Discipline Apprenticeship* — learning commitment without committing to direction | DA (rigid discipline; cannot rest) | GAll (refuses volitional growth) |
| Orange | *Achievement Sharing* — goal-directed will deployed to uplift others' achievement | *Achievement Hoarding* — goal-directed will concentrated as competitive supremacy | *Goal Sampling* — testing different achievement paths without commitment | GA (premature collaborative will) | GAll (refuses to share success) |
| Green | *Collaborative Commitment* — pluralistic will deployed to serve multiple legitimate goals | *Selective Commitment* — pluralistic will concentrated to advance personal priorities | *Volitional Pluralism* — holding multiple goals without committing to hierarchy | DA (commitment paralysis) | GA (premature integral will) |
| Teal | *Evolutionary Service* — integral will deployed to serve planetary evolution | *Evolutionary Mastery* — integral will concentrated as holonic supremacy | *Holonic Contemplation* — resting in integral will without directional commitment | DAll (loses will in collective purpose) | GAll (refuses volitional release) |
| Turquoise | *Effortless Service* — non-dual will radiating as spontaneous right action | *Effortless Sovereignty* — non-dual will concentrated as absolute volitional self-sufficiency | *Sacred Effortlessness* — resting in will-less action without directional flow | DA (grasps at effortlessness) | DA (residual doer-identity) |

**Polarity arc:** The Willpower line polarises slowly — discipline is polarity-neutral, and direction emerges only from *what* is willed and *for whom*. The key transition occurs at Orange, where achievement-orientation first creates a clear STO/STS fork: sharing success vs. hoarding it. At Teal and Turquoise, both polarities approach effortlessness — STO through surrender to evolutionary purpose (will dissolves into service), STS through absolute self-mastery that transcends effort (will concentrates into sovereignty). The line's slow polarisation means willpower cells often crystallize only after moral and spiritual cells have already set direction.

**Drive specifics:** STO Willpower expression couples Agape (descends to sustain effort for others) with Communion (wills *with* others toward shared goals). STS Willpower expression couples Eros (reaches for ever-greater achievement) with Agency (wills *for* self, maintains sovereign goal-direction). The concept-draft at Willpower/Teal (module-spec §3) grounds this: Communion-healthy = "will that serves the whole; goal-architecture includes all beings" (STO) vs. Agency-healthy = "sovereign holonic will; executes evolutionary purpose with precision" (STS).

**Key-cell notes:**
- *Willpower/Red* is the earliest legible cell — Championing Will (fighting for others' goals) vs. Dominating Will (imposing personal goals) are behaviourally distinct in combat and challenge encounters.
- *Willpower/Orange* is the key fork — Achievement Sharing vs. Achievement Hoarding is where willpower polarity first becomes *strategic* rather than instinctive. This cell often crystallizes in tandem with Interpersonal/Orange.
- *Willpower/Turquoise* presents the deepest paradox of this line: Effortless Service (STO) is will-that-has-dissolved-into-spontaneous-action; Effortless Sovereignty (STS) is will-that-has-concentrated-into-absolute-self-direction. Both transcend effort; they differ in residual flow.

---

## 10. Interpersonal Line

| Stage | STO Texture | STS Texture | Exploratory | STO Shadow-Risk | STS Shadow-Risk |
|---|---|---|---|---|---|
| Infrared | *Co-Presence Offering* — proto-relational awareness deployed to comfort the other | *Co-Presence Claiming* — proto-relational awareness concentrated to secure attachment | *Relational Noticing* — attending to the other without directional commitment | GA (premature relational sophistication) | DA (attachment fixation; clinging) |
| Magenta | *Magical Bonding* — fantasy-relationship offered as protective alliance | *Magical Possession* — fantasy-relationship concentrated as ownership of the other | *Relational Fantasy* — trying on different relational roles without commitment | DAll (loses self in magical bond) | DA (possessive fixation) |
| Red | *Transactional Generosity* — egocentric relating deployed to benefit allies | *Transactional Exploitation* — egocentric relating concentrated to extract maximum value | *Social Sparring* — testing relational power without committed direction | DAll (loses sovereignty in generosity) | DAll (refuses relational vulnerability) |
| Amber | *Communal Nurturing* — role-based relating deployed to strengthen group bonds | *Communal Control* — role-based relating concentrated as social authority | *Role-Relating Apprenticeship* — learning relational roles without direction | DA (codependent nurturing) | GAll (refuses relational growth) |
| Orange | *Contractual Fairness* — autonomous relating deployed to create mutual benefit | *Contractual Advantage* — autonomous relating concentrated to maximise personal gain | *Relational Negotiation* — testing contractual frameworks without commitment | DAll (loses boundaries in fairness) | DA (instrumentalising fixation) |
| Green | *Authentic Communion* — pluralistic relating radiating genuine vulnerability and care | *Authentic Influence* — pluralistic relating concentrated as sophisticated social mastery | *Relational Sampling* — trying different depths of relating without commitment | DA (boundary-loss in authenticity) | GA (premature transpersonal relating) |
| Teal | *Transpersonal Service* — integral relating deployed to serve collective evolution | *Transpersonal Sovereignty* — integral relating concentrated as relational supremacy | *Relational Integration* — resting in integral relating without directional commitment | DAll (loses self in collective field) | GAll (refuses relational release) |
| Turquoise | *Transparent Relating* — non-dual presence radiating as effortless communion with all | *Luminous Solitude* — non-dual presence concentrated as absolute relational self-sufficiency | *Sacred Togetherness* — resting in non-dual relating without directional flow | DA (grasps at communion-states) | DA (residual relational identity) |

**Polarity arc:** The Interpersonal line polarises at moderate speed — service/exploitation of others is legible but contextual, requiring pattern accumulation. The STO arc moves from co-presence offering through authentic communion to transparent relating (progressively deeper other-inclusion until self-other dissolves). The STS arc moves from co-presence claiming through contractual advantage to luminous solitude (progressively deeper self-sufficiency until relationship becomes unnecessary). The fork is clearest at Orange (fairness vs. advantage) and Green (communion vs. influence).

**Drive specifics:** STO Interpersonal expression couples Communion (joins with others in genuine mutuality) with Agape (descends to meet others where they are). STS Interpersonal expression couples Agency (maintains relational sovereignty) with Eros (reaches for ever-greater social mastery). The concept-draft at Interpersonal/Orange (module-spec §3) grounds this: Communion-healthy = "joins others through mutual contracts" (STO) vs. Agency-pathological = "instrumentalises others as resources" (STS shadow-risk).

**Key-cell notes:**
- *Interpersonal/Orange* is the most mechanically clear cell in this line — Contractual Fairness (STO) vs. Contractual Advantage (STS) are detectable through resource-distribution patterns in cooperative encounters. This cell often crystallizes first.
- *Interpersonal/Green* is the most therapeutically rich cell — Authentic Communion (STO) and Authentic Influence (STS) both require genuine relational skill. The distinction is whether vulnerability is offered as gift (STO) or deployed as tool (STS).
- *Interpersonal/Turquoise* represents the ultimate polarity expression for this line: Transparent Relating (STO) is communion-without-self; Luminous Solitude (STS) is self-without-need-for-communion. Both are complete; neither is lonely or merged.

---

### 10.1 Polarization Velocity Reference (all lines)

For scheduler and engine calibration, the expected crystallization speed per line:

| Line | Velocity | First-legible cell | Typical crystallization order | Trace-count to crystallize |
|---|---|---|---|---|
| Moral | Fast | Red | Amber → Red → Orange → Green | ~8–12 traces |
| Spiritual | Fast | Amber | Amber → Red → Green → Orange | ~8–12 traces |
| Emotional | Moderate | Amber | Amber → Red → Orange → Green | ~12–16 traces |
| Interpersonal | Moderate | Orange | Orange → Amber → Green → Red | ~12–16 traces |
| Intrapersonal | Moderate | Red | Red → Amber → Orange → Green | ~14–18 traces |
| Willpower | Slow | Red | Orange → Red → Amber → Green | ~16–22 traces |
| Cognitive | Slow | Red | Red → Orange → Amber → Green | ~18–24 traces |
| Somatic | Slow | Red | Red → Amber → Orange → Green | ~20–26 traces |

**Notes:**
- "First-legible cell" = the earliest stage where polarity signal is reliably detectable above noise
- "Typical crystallization order" = which stages tend to crystallize first within the line (based on encounter frequency and polarity-signal strength)
- "Trace-count to crystallize" = approximate number of high-intensity traces needed for crystallization > 0.6
- Higher stages (Teal, Turquoise) are excluded from typical order because they require extensive play to reach
- These are calibration estimates, not hard rules — individual players vary significantly

---

## 11. Cross-Line Patterns and Observations

Five structural patterns emerge across the full 64-cell catalogue:

### 11.1 STS becomes increasingly subtle at higher stages

At Infrared–Red, STS textures are visibly absorptive: hoarding, dominating, exploiting, possessing. These are legible to any observer. At Teal–Turquoise, STS textures are refined into sovereignty, mastery, and self-sufficiency — legitimate expressions that are difficult to distinguish from healthy autonomy without multi-encounter pattern analysis. This reflects Ra's 95% threshold: STS at high altitude requires extraordinary subtlety and sustained consistency to crystallize. The polarity engine must accumulate many traces before assigning high-stage STS textures with confidence.

**Implication for the scheduler:** At Teal+ stages, the scheduler must present encounters with higher catalytic intensity and more ambiguous choice-points to generate traces with sufficient signal for STS detection. Low-intensity encounters at high altitude produce noise, not signal.

### 11.2 The Somatic and Cognitive lines polarise last

Both lines are inherently polarity-neutral — thinking and body-use carry no intrinsic energetic direction. Polarity emerges only from *application* (what the cognition serves, what the body is used for). These lines' cells are typically the last to crystallize in a player's profile, often following the direction already established by faster-polarising lines. This has a mechanical consequence: the encounter scheduler (foundations/24) should not expect early polarity signal from these lines and should not weight them heavily in early-game crystallization calculations.

**Implication for line-to-master aggregation:** When computing master polarity (foundations/19 §6.5), Cognitive and Somatic lines should not be required for the `coherent_lines >= 6` threshold until the player has reached Orange altitude. Before Orange, these lines produce mostly exploratory traces that would dilute the signal.

### 11.3 The Moral and Spiritual lines polarise first

Every moral dilemma is inherently a polarity probe (service vs. self-interest). Every spiritual orientation directly probes source-of-nourishment (transcendent vs. material). These lines crystallize earliest and most decisively, often setting the direction that slower lines eventually follow. A player whose Moral and Spiritual lines both crystallize STO will likely see their Cognitive and Somatic lines follow — not because of mechanical coupling, but because the player's authentic orientation naturally expresses across all capacities once committed.

**Implication for early-game design:** The concept-drafts for Moral and Spiritual lines at Red–Amber stages carry disproportionate weight in establishing the player's polarity trajectory. These modules must offer genuinely balanced STO/STS catalyst — any bias in encounter design here will propagate through the entire polarity system.

### 11.4 Turquoise-stage textures converge toward shared ground

At the final stage across all eight lines, STO and STS textures approach the same non-dual ground from opposite directions — transparent selflessness vs. luminous self-sufficiency. Both shadow-risks at Turquoise are uniformly DA (residual grasping), reflecting that the only remaining pathology at this altitude is attachment to the polarity orientation itself rather than resting in its natural expression. This convergence is cosmologically significant: at the threshold of harvest, both polarities have transcended gross expression and differ only in the direction of their final energetic flow.

**Implication for closure detection:** At the closure (L8 Turquoise completed), the polarity engine cannot rely on behavioural observation alone — both STO and STS expressions look like equanimous presence. Detection must rely on the accumulated trace history from all prior stages, not on Turquoise-stage behaviour in isolation.

### 11.5 The Amber fork is the sharpest across all lines

Across all 8 lines, the Amber stage produces the most visibly distinct STO/STS textures: nurturing vs. enforcing, service vs. control, devotion vs. authority, offering vs. possession. This reflects Amber's nature as the first genuinely social-conformist stage — where the self-other relationship becomes explicit through role and code, and the direction of relational energy becomes unmistakable to the polarity engine. Amber is where most players first produce coherent polarity traces, even if master crystallization requires Orange-altitude minimum.

**Implication for the exploration→crystallizing transition:** Most players will show their first coherent polarity signal at Amber across the fast-polarising lines (Moral, Spiritual, Emotional). The system should expect this and not treat early Amber coherence as premature crystallization — it is the natural first expression of authentic orientation.

### 11.6 Cross-polarity line combinations

The most diagnostically powerful signal comes from *cross-line polarity agreement*. When a player shows consistent STO across Moral + Spiritual + Emotional (the three fast-polarising lines), the probability of eventual STO crystallization is very high. Conversely, consistent STS across these three lines strongly predicts STS crystallization. The slow-polarising lines (Cognitive, Somatic, Willpower) then typically follow the direction set by the fast lines, though exceptions exist and are diagnostically interesting — they may signal shadow distortion or genuine complexity in the player's orientation.

### 11.7 The exploratory texture as diagnostic signal

Exploratory textures are not merely "undecided" — they carry their own diagnostic value. A player who remains in exploratory mode at a cell where most players have crystallized (e.g., Moral/Amber after 20+ traces) may be:
- Genuinely exploring (healthy — the Veil is working)
- Shadow-driven (unhealthy — a shadow is preventing commitment)
- Strategically uncommitted (rare — conscious avoidance of crystallization)

The engine should flag persistent exploration at high-trace-count cells for shadow-system review (foundations/10) without forcing crystallization.

---

## 12. What This Document Does NOT Cover

This document specifies the *what* of polarity textures — the named patterns at each cell. It does not specify the *how* of detection, assignment, or use. Those responsibilities belong to other documents:

| Topic | Document | Relationship to this catalogue |
|---|---|---|
| How polarity traces are recorded and aggregated into cell vectors | foundations/19 §4–6 | This catalogue provides the texture IDs that §5.4 assigns |
| How texture IDs are assigned mechanically (crystallization > 0.6) | foundations/19 §5.4 | Consumes this catalogue as a lookup table |
| The 4-quadrant shadow model (DA, DAll, GA, GAll definitions) | foundations/10 | This catalogue references shadow quadrants; 10 defines them |
| The four drives and their healthy/pathological expressions | foundations/05 | This catalogue's drive configurations are grounded in 05 |
| How the LLM uses texture IDs for narrative frequency-conditioning | foundations/22 | Consumes texture names to condition narrative tone |
| How the scheduler selects encounters based on texture | foundations/24 | Consumes texture IDs to select appropriate catalyst |
| The Veil requirement (textures never surfaced to player) | foundations/20 | Constrains how this catalogue's content is used in-game |
| Per-module game design (the concept-drafts themselves) | concept-drafts/{line}/{stage}/ | This catalogue is grounded in concept-draft shadow models |
| The harvest thresholds and crystallization mechanics (51%/95%) | foundations/19 §9 | Uses crystallization data that texture assignment produces |
| The master synthesis of all systems into playable incarnation | foundations/21 | Integrates this catalogue into the full game architecture |
| The seven-ray cosmology grounding each stage's energetic substrate | foundations/06 | Provides the metaphysical ground for polarity itself |
| Transformation events that can reset cell crystallization | foundations/17 | Can invalidate texture assignments, forcing re-exploration |
| The Significator architecture that holds polarity state | foundations/16 | Stores the texture IDs this catalogue defines |

### 12.1 Maintenance protocol

When a new concept-draft module-spec is written or an existing one is revised, the corresponding cell in this catalogue must be reviewed for consistency. If the module-spec's shadow model or drive-health landscape changes, the cell's textures, shadow-risks, and drive configurations may need updating. The uniqueness principle (AGENTS.md §2.2) applies: this document specifies polarity textures; the concept-drafts specify game design. No duplication between them.

### 12.2 Versioning

This catalogue is version 1.0. As concept-drafts are completed for all 64 modules, individual cells may be refined. The texture *names* are stable identifiers once assigned — if a name must change, all references in foundations/19, 22, and 24 must be updated simultaneously.

---

*"The heart of the discipline of the personality is threefold: know yourself, accept yourself, become the Creator."* — Ra, Session 74
