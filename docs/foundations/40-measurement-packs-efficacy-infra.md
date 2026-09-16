# 40 — Measurement Packs & the Efficacy Infrastructure

> **Cross-references:** [[docs/foundations/24-encounter-scheduler|24 — Encounter Scheduler]] · [[docs/validation/BENCHMARK-ARCHITECTURE|Validation Benchmark Architecture]]
> **Status:** canonical-hypothesis (architecture; kernel precedent exists and is load-bearing).
> **Lateral:** the *explicit measurement* substrate — swappable "measurement packs" that
> assess concrete competencies (coding, language, cognition, memory, …) with psychometric
> hygiene, plus the shared infrastructure that lets such packs be authored, validated, and
> scaled as add-on modules. This document owns: the pack contract, the psychometric gates
> a pack must pass, the skill-theta stream, the efficacy evidence chain, and the initial
> pack set. It does NOT own the engine's self-validation (that is the benchmark kernel in
> `docs/validation/BENCHMARK-ARCHITECTURE.md` and `src/core/validation/`), the implicit
> drive/shadow assessment inside the 64 modules (12), or what credentials may be built
> from pack evidence (41).
>
> **Orchestration note (43):** pack administration and scoring are delegated to Pack
> Agents (S1) with `pack_administer`/`pack_score` toolsets; the Validator (A3) handles
> certification-claim instruments. Pack agents sit on the measurement side of the
> competence/identity firewall (42 §1.1) — HealingContext never enters a
> DelegationSpec for them.

## 1. Purpose

Mysterium's core insight — that the game itself is the assessment (§5.4) — covers
developmental state. It does not yet cover **competency claims**: "your working memory
improved," "your reading comprehension is at X," "you code more fluently than in March."
Brain-training products measure such things constantly and mostly *badly* (unreliable
instruments, practice effects laundered as gains, marketing claims outrunning
psychometrics). The user's instruction is to do what good brain-games do — build
scoring-harness measurement per domain — and do it with the rigor they lack.

The layering that keeps this unique (three measurement systems, three owners):

| Layer | Measures | Owner | Mode |
|---|---|---|---|
| Engine validation | the *system's* correctness | benchmark kernel (`docs/validation/`) | CI |
| Implicit assessment | drives, shadows, stage | the 64 modules (10–12, 31) | always-on, never shown |
| **Explicit packs (this doc)** | concrete skill competencies | measurement packs | opt-in sessions, results on demand |

Explicit packs are opt-in and *scheduled sparingly* by the orchestrator (27) — a
measurement session is offered like any other encounter, never imposed, because
measurement pressure would poison both the Veil (20) and the construct being measured
(test anxiety is noise).

## 2. Scientific basis

- **Reliability first.** A pack may not feed any growth narrative until it demonstrates
  test–retest stability (r ≥ .70 for a two-week interval; r ≥ .60 for 48-hour retest
  with different forms) and acceptable internal structure. Reliability is measured by
  the pack's own harness on real sessions — the infra runs the stats (§4.4), packs
  just emit response data.
- **Parallel forms.** Practice effects are the central validity threat of any repeated
  measure. Packs ship ≥ 2 item forms; alternate forms across retests; the form effect
  is estimated and reported. Growth claims use form-adjusted deltas.
- **Adaptive testing (08 is the substrate).** Packs reuse the staircase machinery
  (item difficulty spanning a wide range, stop rule = standard error threshold,
  target SE ≤ 0.30) so each session is short yet precise. Item exposure is capped
  (syndicates) so frequent sessions don't overexpose items.
- **Construct hygiene.** Each pack declares its construct, its convergent anchors
  (what external instruments or in-game behaviors should correlate), and its
  discriminant divergents (what it should *not* correlate with — e.g., vocabulary
  speed ≠ reading comprehension). The pack linter rejects declarations lacking both.
- **Norming honesty.** Initial norms are ipsative (the player vs. their own baseline —
  always valid). Cohort-percentile norms may accrue from pod opt-in data (38) with
  consent. External norm anchoring is a later, credentialed-era activity (41) — until
  then, packs never print percentile claims against the world, only against self.
- **Known effects, declared.** Practice effects, regression to the mean, circadian and
  fatigue variance, and Flynn-style cohort drift are each listed per pack as *expected
  effect sizes with mitigation* (forms, time-of-day capture, baseline windowing).
- **Transfer skepticism.** Near transfer to the trained task is measurable; far
  transfer to school/work/life is weak in the literature. Packs therefore measure the
  trained competency honestly, and *far-transfer claims come from behavior elsewhere*
  (curriculum mastery deltas, 39's practice reflections) — never from pack score
  extrapolation.

## 3. Game-design mapping

- **A measurement session is an encounter**, not an exam: it arrives through the normal
  scheduler as a modality-flavored challenge, is checkpointed like every session (§5.7),
  and its narrative wrapper is archetypal (Veil) — "the Memory Keepers weigh your
  recall," never "working memory subtest 2 of 3."
- **Results reporting is Veil-compliant:** the default report is qualitative felt-sense
  ("your recall held deeper patterns than the last weighing"). The player may opt into
  explicit numbers (pack scores, trajectories) at any time via the dashboard (33) —
  the numbers exist, are honest, but are never pushed.
- **Packs never gate.** No content, stage, or credential *requires* a pack session;
  packs inform (orchestrator personalization, 41 evidence, 39 learning-quest sizing)
  but never gate. A player who never touches a pack loses nothing developmental.
- **No IQ framing, ever.** Packs measure *named competencies with trajectories* (e.g.,
  "spatial working memory, trending ↑ over 6 weeks"). Rank-flavored labels, single
  summary quotients across packs, and cross-player comparison boards are out of scope
  and would violate 38's recognition discipline.

## 4. Architectural contract

### 4.1 The pack contract

```ts
/** A self-contained, swappable competency instrument. */
interface MeasurementPack {
  readonly id: string;                        // e.g. 'memory.working-span'
  readonly construct: string;                 // human-readable construct name
  readonly skillThetaKey: string;             // stream key in the Significator
  readonly forms: readonly PackForm[];        // ≥ 2 parallel forms
  readonly staircase: StaircasePolicy;        // per 08; stop: SE ≤ 0.30
  readonly scoringModel: ScoringModel;        // e.g. 1PL/2PL-lite, RT-adjusted
  readonly convergentAnchors: readonly string[];   // declared + testable
  readonly discriminantDivergents: readonly string[];
  readonly retestPolicy: RetestPolicy;        // interval, form alternation
  readonly expectedArtefacts: EffectDeclarations;  // practice/fatigue/etc.
}
```

Packs are **add-on modules** by construction: a pack is data + a small adapter
(presentation of items + response capture) registered in a `MeasurementPackRegistry`
(parallel to `CurriculumRegistry`); nothing in the core engine branches on pack
presence. New domains (music aptitude, spatial navigation, …) are new packs, not core
changes — this is the "add-on / build / scale like modules" requirement, honored
structurally.

### 4.2 The skill-theta stream

Each pack maintains `skillTheta[packId] = { theta, se, lastMeasuredAtMs, sessionCount }`
on the Significator (optional field, back-compatible). Streams get freshness decay
with pack-declared half-lives (perceptual-motor skills decay faster than vocabulary —
mirror the per-line decay rationale from the CCI work). Orchestrator (27) reads
staleness the same way it reads line staleness when composing sessions.

### 4.3 Initial pack set (shipped in this order)

| Pack id | Paradigm | Construct | Forms |
|---|---|---|---|
| `memory.working-span` | adaptive digit/span + spatial span | working memory capacity | 3 |
| `memory.spatial` | adaptive path recall on grid | spatial memory | 3 |
| `cognition.speed` | choice-RT battery, RT-adjusted | processing speed | 3 |
| `cognition.control` | task-switch + interference hybrid | executive control | 3 |
| `language.vocabulary` | adaptive lexical decision + cloze | vocabulary depth | 2 |
| `language.reading` | adaptive cloze comprehension | reading comprehension | 2 |
| `coding.fluency` | cs-holon item bank + timed micro-exercises | coding fluency | 2 |
| `math.fluency` | adaptive arithmetic → algebraic retrieval | math fact fluency | 3 |

Language packs ship English-first; the pack contract carries a locale field so packs
can be localized without core changes (ties to 37's second-language branch).

### 4.4 The shared measurement infrastructure (what the repo gains)

1. **`MeasurementPackRegistry`** — registration, lookup, session runner (staircase
   loop + stop rule + response capture), form assignment.
2. **Psychometric harness (the scoring harness the user asked for)** — from raw
   session responses it computes per-pack: theta/SE estimates, test–retest r
   (windowed), form effect, internal-consistency report, item difficulty curves,
   exposure stats. Output is a standard `PackPsychometrics` report consumed by CI.
3. **Pack linter (CI gate)** — a pack fails CI unless: ≥ 2 forms; difficulty span
   covers the declared population; SE-stop achievable within session budget;
   psychometrics report present with reliability above gate (r ≥ .70 on mature data,
   or explicitly flagged `provisional` on young data with a ceiling date).
4. **Efficacy evidence chain** — see §5.

### 4.5 Efficacy evidence chain (the honest version)

| Claim type | Evidence source | Status |
|---|---|---|
| Within-user skill trajectory | pack theta slopes, form-adjusted | available at pack maturity |
| System-induced change | A/B across cohorts (needs 38 pods or deployment cohorts) + baseline windows | infra now, data later |
| Convergent validity | declared anchors: correlation vs. curriculum mastery deltas, 39 reflection depth, external short instruments where licensable | per-pack, ongoing |
| Far transfer (the real claim) | *behavioral* outcomes outside packs: 37 curriculum deltas, 39 practice-quest reflections, 34 bridge mastery — packs contribute only the trained-competency leg | assembled, honest about weakness |
| External criterion anchoring | norms against public datasets / partnered institutions | gated to 41-era |

The kernel precedent matters here: `src/core/validation/` proved the repo can run
persona-grounded, gate-checked validation of its own machinery. This doc extends the
same pattern from *validating the engine* to *validating measurement instruments*.

## 5. Phases

| Phase | Contents | Acceptance |
|---|---|---|
| **MP0 (3–5 d)** | Registry + session runner + skill-theta streams + one pilot pack (`memory.working-span`) end-to-end | pack session runs headless; theta stream persists; dashboard shows opt-in numbers |
| **MP1 (1–2 wks)** | Psychometric harness + pack linter + CI gate; remaining memory/cognition packs | CI fails a deliberately-degraded pack (linter has teeth) |
| **MP2 (1–2 wks)** | Language + coding + math packs; orchestrator integration (sparse scheduling, staleness reads) | scheduler proposes pack sessions at target rarity (≤ 1 in ~8 sessions) and reads staleness |
| **MP3 (evidence era)** | A/B machinery with 38 cohorts; convergent-anchor studies; report the first form-adjusted trajectory cohort | first efficacy report drafted from real data, limitations section honest |

## 6. Open questions

1. Do pack sessions share the encounter-scheduler slot economy (and at what rarity
   ceiling), or live only on the dashboard as on-demand instruments?
2. RT-adjusted scoring: how much speed weighting is construct-valid per pack (speed
   is a facet of `cognition.speed`, a confound of `language.vocabulary`)?
3. Should `coding.fluency` share the cs-holon item bank (34) — one bank, two uses —
   or run a separate bank to keep implicit assessment and explicit measurement
   statistically independent?
4. What is the minimal cohort size before percentile claims are honest (vs. staying
   ipsative indefinitely)?
5. Do skill-theta streams ever feed the CCI, or is that a category error (CCI is
   developmental; packs are competency)? Tentative: never directly; only 41's
   evidence layer may *combine* them, with explicit derivation records.

## 7. Principles served

- **Uniqueness:** owns explicit competency measurement; engine validation stays with
  the benchmark kernel; implicit assessment stays with the 64 modules.
- **Veil (20):** qualitative default reporting, opt-in numbers, no pushed scores —
  measurement without measurement-pressure.
- **Self-contained modules (§5.5):** each pack is a complete, swappable instrument
  with its own forms, staircase, and harness report.
- **Adaptive testing lineage (08):** packs are the staircase machinery applied to
  named competencies — same psychophysics, different construct.
- **Infinite checkpoint (§5.7):** a pack session is checkpointed and short; results
  accrue across as many tiny sessions as the player chooses.
