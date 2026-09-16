# 03 — Research Methodology

> **Cross-references:** [[docs/foundations/00-integral-theory|00 — Integral Theory]] · [[docs/foundations/08-psychophysics-and-staircase|08 — Psychophysics And Staircase]]

## 0. Epistemic discipline

Mysterium adopts a rigorous methodology combining Design Science Research (DSR), Objects→Mechanics→Dynamics→Emotions (OMDE), and Interaction Design For the Core Mechanic (INFORM).

### 0.1 Three Acts

1. **Grounding** — reduce every claim to a trusted anchor. The trusted anchor for Mysterium ontology is the integral developmental framework in `foundations/00-09`. The trusted anchor for game mechanics is the running code in `src/core/`.
2. **Construction** — build new claims via fractal recursion (every element is itself a holon) and structural mirroring (separate invariant from decoration).
3. **Validation** — red-team every claim; run Type Validation (T1/T2/T3, §0.2 below); retain provenance.

### 0.2 Type Validation Protocol (T1 / T2 / T3)

- **T1 Behavioral match** — observed patterns match the Type signature's predictions. For Mysterium: a player assigned PolarityTexture X should show drive-choice patterns consistent with X across ≥3 encounters.
- **T2 Excitation-invariance** — the Type signature stays fixed as Stage changes. For Mysterium: a player's underlying Type should persist across Stage transitions, with only surface expressions varying.
- **T3 Fixed-point persistence** — the Type signature persists across metabolic cycles without immediately firing Transformation. For Mysterium: a player's Type should be stable across ≥10 encounters before a Transformation event.

A Type claim that fails any test is demoted from `canonical-hypothesis` to `ai-draft`. A Type claim that passes all three is promoted to `canonical`.

### 0.3 Status ladder

Every claim in `docs/foundations/` is tagged with one of:

| Status | Meaning | When to use |
|---|---|---|
| `ai-draft` | Proposed, not yet validated | Initial proposals; brainstorming outputs |
| `canonical-hypothesis` | Derived from canonical anchor, not yet empirically validated | Theoretical claims grounded in canonical anchor but not yet tested |
| `canonical` | Validated | Empirically validated (for game-mechanics) or cross-scale homological (for metaphysics) |
| `superseded` | Replaced by a later claim; retained for provenance | Old claims that have been replaced |

A claim without a status tag is treated as `ai-draft`.

---

## 1. Purpose

How do we know we are doing the research right? This document specifies the methods, evidence hierarchy, citation rules, and conflict-resolution procedure used across the entire `/docs/` tree. It binds *us* to a process in the same way that the architecture docs bind the code to module boundaries.

## 2. Scientific basis

Three methodological frameworks structure this work:

### 2.1 DSR — Design Science Research

Hevner et al.'s seven-phase pattern, adapted for a cognitive-game context:

| Phase | Activity in Mysterium |
|---|---|
| 1. Problem identification | "Cognitive-training apps fail at retention." `00-vision.md`. |
| 2. Define objectives | The eight first-principles. `01-first-principles.md`. |
| 3. Design & development | This `/docs/` tree, then the codebase. |
| 4. Demonstration | Vertical-slice MVP (Red stage, all 8 lines). `concept-drafts/ROADMAP.md`. |
| 5. Evaluation | Construct-validity studies. Curriculum architecture audit. |
| 6. Communication | Open-source release; potentially a peer-reviewed paper. |
| 7. Iteration | The post-MVP roadmap. |

DSR is *iterative* — phases 3–5 cycle. Each cycle should refine *this* document.

### 2.2 OMDE — Objects → Mechanics → Dynamics → Emotions

A bottom-up gamification pattern:

- **Objects** — the entities (Significator, Encounter, Module, Stage, Line). Defined in the architecture docs.
- **Mechanics** — the rules that operate on objects (staircase scoring, drive detection, shadow surfacing). Defined in `src/core/`.
- **Dynamics** — the player-visible patterns that emerge when mechanics meet a player (the staircase converging, the radial chart filling, the shadow encounter unlocking). Defined in the progression and encounter system docs.
- **Emotions** — the felt-sense the player experiences (challenge, growth, insight, integration). Documented in the narrative architecture.

Every feature must be specified at all four OMDE levels before it is considered complete.

### 2.3 INFORM — Interaction Design For the Core Mechanic

Provides 12 micro-elements that link *representation* (how info is displayed) and *interaction* (what the player does with it) to *cognitive demand*. Mysterium uses INFORM to specify each assessment modality's interaction design. The 12 micro-elements are the checklist for "is this interaction unambiguously soliciting the cognitive demand we want?"

## 3. Game-design mapping

Methodology shapes every document via the **mandatory six headings** (`REQUIREMENTS.md §3`). Each document is a DSR mini-paper:

1. *Purpose* = problem identification
2. *Scientific basis* = literature review
3. *Game-design mapping* = design proposition
4. *Architectural contract* = falsifiable engineering claim
5. *Open questions* = future work
6. *Principles served* = positioning in the larger argument

Documents that lack any of these are not yet ready for review.

## 4. Architectural contract

Methodology compiles into three engineering rules:

1. **No undocumented science.** Every cognitive task in code must trace back to a validated assessment in the concept-drafts or foundations docs, which themselves cite the originating laboratory paradigm.
2. **No undocumented stage-line claims.** Any feature claiming to "train moral development at Orange" must point at a `lines/03-moral.md` × `stages/05-orange-rational.md` cell that explains *how*.
3. **All thresholds are sourced.** The 70.7% target, the n-back load ceilings, the dual-task interference ratios — all carry citations in `foundations/08-psychophysics-and-staircase.md`.

## 5. Evidence hierarchy

When sources conflict, this is the order of priority:

1. **Replicated empirical findings** in peer-reviewed literature with pre-registration or large meta-analyses (e.g., the n-back transfer debate — Au et al. 2015 vs. Melby-Lervåg 2016 — both cited; the *uncertainty* is documented; Mysterium does not claim transfer it cannot defend).
2. **Theoretical syntheses** by recognised integrators (Wilber, Diamond, Bavelier) — used as scaffolding, but never as a substitute for primary data on the specific claim.
3. **Practitioner consensus** in adjacent fields (clinical neuropsychology, developmental coaching) — used to inform aesthetic and narrative choices, not capacity claims.
4. **Esoteric / metaphysical sources** (Law-of-One, energy-ray correspondence, contemplative traditions) — used **canonically** in `foundations/06` and the world-building of `stages/*`. Never used to justify a cognitive-training mechanic.

A claim from level 4 cannot override a claim from levels 1–3. This is the firewall.

## 6. Citation policy

- Inline format: `(Author Year)` — e.g., `(Diamond 2013)`. Full references collated in a `BIBLIOGRAPHY.md` to be created in the architecture docs.
- Each foundation document ends with its references list inline; the global bibliography is a roll-up.
- When a claim has *no* citation, the document must say "design hypothesis, not yet validated" — and the claim is added to that document's *Open questions*.

## 7. Conflict-resolution procedure

When two documents disagree:

1. The conflict is recorded in *both* documents' *Open questions*.
2. A new entry in the architecture audit schedules an empirical or analytical tie-break.
3. Until tie-broken, the conflict is surfaced in the project's risk register.
4. Once resolved, the loser is corrected; this glossary or the relevant foundation is updated; the resolution is logged in `CHANGELOG.md`.

This procedure is itself reviewable — if it fails, edit it here.

## 8. Open questions

- **Pre-registration.** Should the eventual transfer / construct-validity studies be pre-registered? Cost: schedule pressure. Benefit: scientific credibility. Default: yes, when feasible.
- **Open vs. closed data.** Anonymised aggregate telemetry is a research asset. Releasing it is generous; the privacy / consent structure required to do so safely is non-trivial. The persistence and ethics docs must specify.
- **AI-assisted research.** Many of these documents are co-authored with language models. The question of *how* AI involvement is disclosed in the eventual write-ups is open.

## 9. Principles served

Principles **2** (validity), **6** (honesty), **7** (codebase honesty).
