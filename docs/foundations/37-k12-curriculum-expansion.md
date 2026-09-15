# 37 — K-12+ Curriculum Expansion

> **Status:** canonical-hypothesis (architecture; content work follows 36's phase protocol).
> **Lateral:** HOW mainstream academic domains (primary school through pre-university) map
> onto the 8-line × 8-stage architecture and integrate with the existing curriculum engine.
> This document owns four things and nothing else: (1) the subject→line mapping,
> (2) the grade-band policy (and its deliberate non-authority), (3) the K-12 corpus
> expansion plan, (4) the explicit rejection list of schooling's assembly-line assumptions.
> WHAT knowledge content exists is owned by 30/36; HOW DEEP it goes by 31/35; HOW it
> plugs into the engine by 34; HOW it is credentialed by 41; HOW it is measured by 40.

## 1. Purpose

Mysterium's curriculum corpus currently spans four domain trees (`cs`, `math`, `physics`,
`integral` — 56 holons, 1,280 items). That covers a slice of adult self-directed learning.
A complete education-system replacement must cover the full K-12+ academic span — without
importing the factory assumptions of the systems it replaces.

The design stance, stated once: **school subjects are content vehicles for the 8 lines of
intelligence, not parallel tracks.** A child is never "a grade-4 student"; they are a
Significator at an individually-calibrated altitude on each of 8 lines, encountering
mathematics, literature, and civics as catalyst at whatever depth-tier their development
has actually reached. The grade-band system below exists only as an *authoring default*
for corpus builders. The runtime never sees it.

## 2. Scientific basis

### 2.1 Developmental mapping, done honestly

- **Piaget ↔ AQAL cautions.** Concrete/formal operations describe *typical* cognitive
  sequences, not identities. The mapping from school bands to Mysterium's depth tiers is a
  correlation used for authoring defaults, never a runtime gate. The adaptive engine
  (staircase per 08, scheduler per 24) places every learner individually; a 9-year-old at
  formal operations receives tier-4 mathematics, and an adult with weak literacy receives
  tier-appropriate literacy without condescension.
- **Vygotsky's ZPD.** The encounter scheduler already operates a ZPD-like band (difficulty
  bell 0.2→0.9 centered near 0.5). K-12 content inherits this: each concept-holon exists
  across a depth lattice (31's dual-depth model), and the learner climbs the lattice,
  not a grade ladder.
- **Bruner's spiral curriculum.** The same concept re-encountered at increasing depth is
  the native shape of the holarchy (30). K-12 expansion therefore does NOT add a parallel
  "grade track" — it populates the existing depth lattice per concept more densely.
- **Bloom's 2-sigma / mastery learning.** One-to-one adaptive placement with mastery
  gating is the strongest known schooling effect; Mysterium's architecture is a
  mastery-gated adaptive tutor by construction (36 Phase A prerequisite enforcement).
- **Age-independence principle.** Content is authored *age-neutral, depth-labeled*:
  narrative wrappers are archetypal (Veil, 20), never childish; depth tier, not age,
  selects voice. This is what allows one corpus to serve a gifted 8-year-old and a
  returning 45-year-old identically.

### 2.2 What schooling gets right (imported)

Spaced mastery; prerequisite graphs (36 Phase A); retrieval practice; worked-example →
fading gradient (35 §4.1's constructivism–direct-instruction gradient); credential
legibility (41). These are mechanisms, not ideology — they port cleanly.

### 2.3 What schooling gets wrong (rejected)

1. **Age-siloed cohorts as identity.** Replaced by per-line altitude.
2. **Single-track pacing** — social promotion *and* grade retention both manufacture
   false selves. Replaced by mastery gating with shadow-aware re-surfacing (10/24).
3. **High-stakes one-shot testing as the growth signal.** Replaced by continuous implicit
   assessment (the game's core mechanic) plus opt-in explicit measurement packs (40).
4. **Extrinsic, punitive grading.** Replaced by theta/CCI state with Veil-compliant
   qualitative reporting (20, 25). Nothing in Mysterium ever tells a player "you failed."
5. **Content-first, development-blind syllabi.** Replaced by line-aware orchestration
   (27's AutoModeStrategy allocates curriculum slots *between* developmental needs).
6. **The obedience pipeline.** Compliance-shaped reward systems are a Willpower-line
   fixation risk. Objectives in this system are agency-preserving (39) and drives are
   probed, not trained into submission (12).

## 3. Game-design mapping

### 3.1 Subject → line mapping (the core table)

| School domain | Primary line(s) | Complex | Modality affinity (11) | Corpus today |
|---|---|---|---|---|
| Mathematics | Cognitive | Mind | puzzle/strategy | `math` ✓ |
| Computing / CS | Cognitive (+ Willpower: tool-building) | Mind | puzzle, creation | `cs` ✓ |
| Physics / Chemistry | Cognitive (empirical mode) | Mind | experiment/simulation | `physics` ✓ |
| Biology / Earth & space | Cognitive + Somatic | Mind/Body | nature/simulation | — |
| Literacy (L1) | Cognitive (decoding) → Emotional (meaning) | Mind→Spirit | narrative | — |
| Literature / creative writing | Emotional + Intrapersonal | Spirit | narrative/reflection | — |
| Arts & music | Emotional + Somatic (+ Spiritual: resonance) | Spirit/Body | creation/performance | — |
| Second language (L2) | Cognitive + Interpersonal | Mind/Spirit | dialogue | — |
| History | Moral + Interpersonal (collective meaning) | Spirit | narrative/dilemma | — |
| Civics & ethics | Moral + Interpersonal | Spirit | dilemma/roleplay | — |
| Geography / social studies | Interpersonal + Cognitive | Spirit/Mind | strategy/simulation | — |
| PE / health | Somatic + Willpower | Body | physical/rhythm | — |
| Social-emotional learning | Intrapersonal + Emotional + Interpersonal | Spirit | (home turf — see below) | `integral` partial |

**The SEL inversion.** On every row above, mainstream schooling is the incumbent and
Mysterium is the challenger — except the last row, where Mysterium's entire 64-module
developmental engine IS the SEL curriculum, and schooling offers an hour a week of
worksheets. This inversion is the differentiating thesis: K-12 expansion *adds* academic
coverage to a developmental core that schooling largely lacks, not the reverse.

### 3.2 Grade-band authoring defaults (non-authoritative)

| School band | Typical cognition | Default depth tier (authoring aid, calibrated per 35 §2.1's ladder) |
|---|---|---|
| K–2 | emerging symbolic | tier 1–2 |
| 3–5 | concrete operations | tier 2–3 |
| 6–8 | abstract transition | tier 3–4 |
| 9–12 | formal / multi-system | tier 4–5 |
| 13+ / pre-university | complex systems | tier 5–6 |

Authors use this table to *seed* content density; the runtime distributes it by measured
altitude. A learner's placement on one line never constrains another.

## 4. Architectural contract

### 4.1 Domain trees to add

Per 35 §5.1's expansion contract and 35 §5.2's minimum-viable-curriculum-per-branch rule.
No new engine code is required — this is corpus work flowing through the existing
registry/linter/bridge chain (32 → 34).

| Phase | New domain trees | Notes |
|---|---|---|
| **K1 — academic spine** | `math` (extend), `language-arts`, `biology`, `chemistry`, `earth-science` | highest credential demand (41) |
| **K2 — humanities** | `history`, `civics`, `geography`, `second-language` (generic L2 scaffold) | dilemma-heavy; strong Moral/Interpersonal coupling |
| **K3 — expressive & embodied** | `arts`, `music`, `health` (PE + nutrition + sleep) | Somatic/Willpower lines finally get curriculum weight |

### 4.2 Corpus budget (targets, not promises)

| Phase | Target holons | Target items | Cumulative items |
|---|---|---|---|
| current | 56 | 1,280 | 1,280 |
| K1 | +45 (9 branches × ~5) | +2,200 | ~3,500 |
| K2 | +40 | +1,900 | ~5,400 |
| K3 | +25 | +1,200 | ~6,600 |

Difficulty distributions per branch must reproduce the observed bell curve (0.2→0.9,
peak ≈ 0.5); branch linting (32) rejects otherwise.

### 4.3 One optional metadata extension

`CurriculumHolon` gains an optional, **non-authoritative** field:

```ts
readonly standardsTags?: readonly string[];
// e.g. "CCSS.MATH.4.OA.A.1", "DE-BW-Bildungsplan-2016-Mathe-5.1"
```

Tags exist solely so 41's credential layer can align evidence to external competency
descriptors when a jurisdiction requires it. The engine never branches on them. Authors
per-jurisdiction tags opportunistically; the *competency core* stays jurisdiction-free.

### 4.4 Engine integration (already exists — cited, not rebuilt)

- Slot allocation: `computeCurriculumSlots` already weaves curriculum beats into sessions
  (24/27); K-12 branches need no scheduler change, only registry presence.
- Depth assessment: 31's dual-depth model applies unchanged.
- Reliability of school-outcome claims: parallel-form item generation per 40's pack
  contract; retest policy owned by 40, not here.

## 5. Phases, acceptance criteria, and risk

**Phases** ride 36's machinery: K1–K3 are content phases inside 36's Phase B (holarchy
deepening) workflow — each branch passes 32's three-agent linter (0 errors, warnings
triaged), then 34's bridge integration tests, then a corpus-invariant check
(`check:invariants` gains a per-branch minimum-density invariant).

**Acceptance per branch:** (a) minimum viable curriculum per 35 §5.2 satisfied at every
tier; (b) prerequisite graph acyclic (36 Phase A); (c) item difficulty bell verified;
(d) drive probes present (12) so academic content still feeds the developmental ledger;
(e) age-neutral voice audit sampled by the linter.

**Risks:** national-curriculum variance (mitigation: competency core + opportunistic
standards tags); L2 language-pair data (mitigation: generic scaffold first, language
packs later); lab-science simulation fidelity (mitigation: experiment *reasoning* first,
simulations later); arts assessment validity (mitigation: process-evidence over product
scoring; 40's reliability gates must pass before any arts credential claim).

## 6. Open questions

1. Should any K-12 content carry a *guardian mode* (younger learners get a supervised
   pod shape per 38) — and where is the age threshold, given our age-independence stance?
2. How much jurisdiction-specific authoring is worth the cost vs. generic competencies?
3. Do we author physics/chemistry *simulations* in-house (expensive) or consume existing
   open sims as encounter back-ends?
4. Should the `integral` tree's adult content be re-tiered to interleave with K-12
   branches (shared holarchy) or kept as a separate adult spine?

## 7. Principles served

- **Uniqueness:** owns the school-domain lateral only; references 30/31/34/35/36/40/41.
- **Self-contained & all-inclusive (§5.5):** every K-12 encounter still probes all 4
  drives × shadow polarities for its module — academic content is never assessment-free.
- **Holonic integrity (§5.6):** mastery gating keeps lower tiers healthy rather than
  abandoned; theta-decay applies to academic lines exactly as to developmental ones.
- **Veil (20):** no grades, no age identity, no failure language — growth is felt-sense.
- **Infinite checkpoint (§5.7):** school content, like all content, is checkpointed and
  session-length agnostic — homework as a level, not a deadline.
