# 42 — The Developmental Levelling Mechanism

> **Status:** canonical-hypothesis (implemented: `src/core/curriculum/LevellingEngine.ts`, kernel-tested).
> **Lateral:** the UNIFIED grading/staging mechanism — how "level" is defined, computed,
> promoted, demoted, and displayed, such that progression is a pure function of
> developmental evidence. It owns: the rung model, the promotion/demotion laws, the
> stability window and hysteresis, the placement rule, and the demographic-blindness
> guarantees. It does NOT own the depth taxonomy (31), the mastery bridge (34), the
> scheduler that proposes encounters (24/27), or what credentials may attach to levels (41).

## 1. Purpose

The user's directive, as an architectural invariant: **age, sex, race, culture, class,
language, or any demographic property must never appear anywhere in the levelling
machinery — not in data, not in thresholds, not in scheduling, not in display.**
Progression is a pure function of demonstrated developmental evidence.

### 1.1 The competence/identity firewall (revision 2026-09-15)

The user's refinement: **"competence is what matters for the evolution, but identity
matters for the healing."** The blindness above governs the *measurement* machinery
(levels, difficulty, promotion, credentialed evidence). It does NOT forbid **identity
context as presentation/healing texture**: age, lineage, culture, locale, language —
collected at onboarding under explicit consent — may tune HOW catalyst is *voiced*,
*framed*, and *situated* (metaphor sets, example domains, life-stage resonance,
locale formatting), never WHAT level is assigned, WHAT difficulty is offered, or WHAT
evidence counts. The enforcement line:

| Healing paths (identity MAY flow) | Measurement paths (identity NEVER flows) |
|---|---|
| narrative voice / metaphor selection (22) | LevellingEngine inputs & rungs (42) |
| example domains & cultural resonance in content | encounter difficulty & scheduler weights (24) |
| life-stage texture in practice objectives (39) | depth classification & rubric thresholds (31) |
| locale/language of presentation | pack scoring & theta (40) |
| accessibility preferences (derived from context, not identity itself) | credential evidence claims (41) |

Implementation: identity lives in a **purpose-bound container** (`IdentityProfile`,
doc 16 §2.1) whose data is only reachable through a consent-checked projector
(`projectHealingContext`) that emits a *derived view* — never raw fields — and only
for the healing-column purposes above. `LevellingEngine` and all measurement paths
take NO parameter of this type; the kernel firewall gate (G12) asserts this
structurally (source lint: measurement modules must not import the projector), and
the one-way rule is: healing context may be *built from* engine state, engine state
is never *built from* healing context.

Mysterium already has the substrate: per-line altitudes and theta timestamps on the
Significator (developmental lines), per-concept `DepthLevel` + retention on the
KnowledgeState (syllabus side), the prerequisite graph with readiness checks, and a
hysteresis-gated stage transformation. What has been missing is one engine that
computes **level** as the single answer to "where is this learner on this ladder?"
for BOTH ladders, from evidence only — so that a 9-year-old at formal operations and a
45-year-old beginner occupy identical rungs under identical evidence, are proposed
identical encounters, and progress through identical laws.

## 2. Scientific basis

- **Criterion-referenced, not norm-referenced.** Grades in schooling compare students
  to each other; levelling here compares evidence to criteria only. There is no cohort,
  no curve, no percentile anywhere in the mechanism — structurally, not by policy.
- **Mastery learning + Bloom's 2-sigma.** Evidence-gated advancement with adequate
  time produces distribution-shifted outcomes. The gate is retention-anchored mastery,
  never time-served.
- **Item Response Theory (08's staircase).** Placement and promotion use response
  evidence at controlled difficulty — the same psychophysics for a child and an adult,
  because difficulty is a property of items, not persons.
- **Hysteresis (mechanical analogy).** Promotion and demotion thresholds must differ,
  or evidence noise around a boundary causes oscillation. Promote requires *sustained
  evidence above* the bar; demote requires *sustained evidence below* it. The existing
  transformation gate already applies this at stage scale; doc 42 generalizes it to
  every rung.
- **Forgetting-driven demotion is honest.** Retention decay (ForgettingCurve) is real
  developmental information — a lapsed skill is a lower current level even if prior
  achievement was real. Levelling reports *current* level; achievement history is
  preserved separately (in depthHistory), so demotion is never erasure.
- **Demographic-blindness as psychometric hygiene, not only ethics.** Any demographic
  conditioning of difficulty or thresholds is bias and invalidates measurement. The
  mechanism treats demographic fields as *forbidden inputs* (asserted by the kernel
  gate) — the strongest possible form: not "we promise not to use them" but "the
  function cannot receive them."

## 3. Game-design mapping

### 3.1 The rung model (one shape, two ladders)

A `LevelRung` is: `{ ladderId, index, title, entryCriteria, exitCriteria }`.

Two ladders instantiate it:

| Ladder | Rungs | Evidence source |
|---|---|---|
| `syllabus.<branch>` | 8 depth rungs per concept-cluster (absent → transformed), aggregated per branch | conceptStates depth + retention + prereq closure |
| `line.<line>` | 8 stage rungs (Infrared → White) | Significator altitudes + theta freshness + shadow load |

Both ladders share one evaluation law (§3.2), one promotion law (§3.3), one demotion
law (§3.4), one stability rule (§3.5). The aggregate display (§3.7) is also shared.

### 3.2 The evidence pipeline (what makes a level)

For a syllabus ladder at a branch:

1. **Concept mastery map:** every encountered concept contributes
   `depthOrdinal(depthLevel)` weighted by `retention` (decayed per ForgettingCurve).
2. **Prereq closure:** unmet prerequisites cap the branch rung (readiness, from
   `findReadyConcepts` semantics) — you cannot sit above what you cannot stand on.
3. **Aggregate:** rung = mastery-weighted mean mapped onto the 8-rung scale, then
   capped by prereq closure.

For a line ladder at a line:

1. **Altitude** is the recorded stage.
2. **Freshness:** theta staleness discounts displayed level (a stale line *displays*
   lower — the same honesty as forgetting) without rewriting the altitude.
3. **Shadow load:** unresolved shadows at/below the stage gate promotion eligibility
   (holonic integrity, §5.6 of the process doc).

### 3.3 Promotion law

Promotion requires ALL of:
1. **Evidence bar:** aggregate evidence at or above the rung's exit criteria;
2. **Stability window:** the evidence has held above the bar for `STABILITY_WINDOW`
   consecutive evaluations (not a single lucky session);
3. **Holonic integrity:** no unresolved shadow gate blocks the ladder's line (line
   ladders); prereq closure intact (syllabus ladders);
4. **Hysteresis margin:** promotion bar sits above demotion bar by `HYSTERESIS_MARGIN`
   — the two thresholds never touch.

### 3.4 Demotion law

Demotion fires only when evidence falls below the demotion bar for the same stability
window — retention decay, repeated misconception flags, or theta staleness. Demotion
preserves: full depthHistory (the player *was* there), and any lapsed rungs become
review-primed candidates for the scheduler (lapse routes back to practice, per 39/34).

### 3.5 Stability & anti-oscillation

- `STABILITY_WINDOW = 3` consecutive evaluations above/below the bar.
- One evaluation per session-end per ladder (bounded frequency — no within-session flapping).
- A promotion within the window resets only the demotion counter (asymmetric
  hysteresis); the counter never persists across a ladder jump.

### 3.6 Placement (first contact)

On first contact with a ladder (new player, new branch), **placement is measured, not
assumed**: a short adaptive probe (staircase, 08) at the ladder's diagnostic band
estimates entry rung with a declared SE target. There is no age prior, no grade prior,
no demographic prior in the probe — the item pool's difficulty span (0.2→0.9) *is* the
prior, and it is demographic-free.

### 3.7 Display (the Veil-compatible grading surface)

Levels are rendered through the felt-sense descriptor system (`veilDescriptors`
precedent) — "the Cognitive thread weaves steady" not "Cognitive: level 4." Explicit
numeric display is an opt-in dashboard view (33), never pushed, never compared across
players (38's recognition discipline). All ladders use the same descriptor bands so
cross-ladder reading is coherent.

### 3.8 Demographic-blindness guarantees (invariants, not promises)

| # | Guarantee | Enforcement |
|---|---|---|
| D1 | No demographic field exists in any levelling input type | kernel gate asserts input shapes |
| D2 | Thresholds/bars contain no demographic terms or age proxies | kernel gate lints constants |
| D3 | Encounter difficulty follows evidence, never identity | scheduler already evidence-only; gate asserts |
| D4 | Display never references demographics *in measurement reports* (healing context may voice levels qualitatively per §1.1) | descriptor layer enforces |
| D5 | Corpus voice is age-neutral *by default*; identity-tuned voicing is opt-in via consented healing context (37 §2.1 + 16 §2.1) | linter check |

**Revision note (2026-09-15):** D4/D5 originally forbade demographic vocabulary in
display/corpus outright. Per §1.1, identity-tuned *voicing* of qualitative, already-
veiled content is a healing use and is permitted behind consent — the quantitative
measurement surface remains absolutely identity-blind.

An "age proxy" is any threshold derivable from age bands (e.g., "expected tier by 8")
— D2's lint rejects the vocabulary that would express them.

## 4. Architectural contract

```ts
/** Pure, deterministic levelling — no clock reads, no randomness, no identity. */
export interface LevelRung {
  readonly ladderId: string;
  readonly index: number;                     // 0..7
  readonly title: string;
  readonly entryCriteria: LevelCriteria;
  readonly exitCriteria: LevelCriteria;
}
export interface LevelCriteria {
  readonly minMastery: number;                // evidence bar 0..1
  readonly minStableEvaluations: number;      // = STABILITY_WINDOW
}
export interface LevelEvaluation {
  readonly ladderId: string;
  readonly evidenceScore: number;             // 0..1
  readonly currentRung: number;
  readonly promoted: boolean;
  readonly demoted: boolean;
  readonly cappedBy: 'none' | 'prerequisites' | 'shadows';
}
```

`LevellingEngine.ts` exports: `buildSyllabusLadder(branchId, holons)`,
`buildLineLadder(line)`, `evaluateSyllabusLevel(knowledge, holons, ladder, prior)`,
`evaluateLineLevel(sig, line, prior)`, `evaluateAllLevels(sig, holons, priors)` —
pure functions over prior counter-state (`priors: Map<ladderId, { atBarCount, aboveCount, belowCount }>`),
which the caller persists on the Significator (optional field, back-compatible).

Constants live in `InfraConfig.LEVELLING` (single tuning source): `STABILITY_WINDOW=3`,
`HYSTERESIS_MARGIN=0.05`, `PROMOTION_BAR=0.75`, `DEMOTION_BAR=0.55`.

## 5. Phases

| Phase | Contents | Acceptance |
|---|---|---|
| **L0 (done this commit)** | Engine (ladders + evaluation + promotion/demotion laws) + unit tests + kernel gate D1–D3 | determinism tests pass; no demographic vocabulary in engine |
| **L1 (2–3 d)** | Significator persistence of priors + session-end hook + felt-sense display descriptors | levels update across sessions; display contains no scores by default |
| **L2 (3–4 d)** | Placement probe (diagnostic band staircase) for new ladders | SE ≤ 0.30 within ≤ 8 items on synthetic learners |
| **L3 (2–3 d)** | Scheduler integration: promotion runs feed encounter selection; demoted rungs become review-primed | scheduler consumes level deltas; no behavior change otherwise |

## 6. Open questions

1. Should syllabus branches at the same rung *cross-link* (e.g., a `math` rung gating a
   `physics` rung via crossBranchPrerequisites) — already expressible; needs content?
2. Display: do opt-in numeric views show rung indices or raw evidence scores?
3. Should theta staleness ever demote a line ladder rung directly, or only discount display?
4. Where do pod rituals (38) sit — can collaborative evidence count toward promotion bars?

## 7. Principles served

- **Uniqueness:** owns the levelling mechanism; 31 owns depth taxonomy, 34 owns the
  bridge, 41 owns credentials-on-levels.
- **Demographic-blindness (D1–D5):** the defining guarantee of this document — enforced
  by kernel gate, not policy.
- **Holonic integrity (§5.6):** prereq closure and shadow gates keep lower rungs healthy.
- **Veil (20):** levels are felt-sense by default; numbers are opt-in.
- **Infinite checkpoint (§5.7):** stability windows are evaluated at session-ends —
  progression works at any session cadence.
