# Mysterium — Binding Development Plan

> **Cross-references:** [[AGENTS.md|AGENTS.md (process protocol)]] · [[docs/foundations/43-agentic-orchestration-architecture|43 — Agentic Orchestration Architecture]] · [[docs/foundations/42-developmental-levelling-mechanism|42 — Developmental Levelling Mechanism]] · [[docs/foundations/39-action-induction-journal-system|39 — Action Induction Journal System]] · [[docs/foundations/38-cohort-weave-multiplayer|38 — Cohort Weave Multiplayer]] · [[docs/foundations/37-k12-curriculum-expansion|37 — K12 Curriculum Expansion]] · [[docs/foundations/40-measurement-packs-efficacy-infra|40 — Measurement Packs Efficacy Infra]] · [[docs/foundations/41-global-recognition-credentialing|41 — Global Recognition Credentialing]]
> **Status:** canonical (the plan `AGENTS.md` §4.2 points at; revised in-place per the
> update protocol — revisions recorded in §9).
> **Method:** exhaustive codebase audit (2026-09-16) contrasted against the freshly
> reconciled doc set (`docs/audits/DOC-SET-AUDIT-2026-09-16.md` — the docs are now
> trustworthy, so the contrast is trustworthy). Every claim in §1–§3 was verified
> against `src/`, `scripts/`, `src/routes/`, and `tests/` on this date.
> **Scope fence:** this plan owns *what to build, in what order, and what gates each
> phase*. Foundations docs own *what each thing is*. Where a phase implements a doc,
> the doc is cited and the doc's contract wins on conflict.

---

## 1. What exists (verified against the tree)

The engine substrate is real and tested. This is the load-bearing inventory:

| Subsystem | Evidence | State |
|---|---|---|
| **Unified core loop** | `src/core/GameLoop.ts` — `tickWithStrategy` → `processOutcome`/`applyConsequences` → `applyResponseOnly` → `endSession`; 4 execution modes | ✅ implemented, kernel-gated |
| **14 engines** | `src/core/engines/` (6070 LOC): Scheduler, AutoMode, CCI, Consequence, Polarity, ThetaDecay, Transformation, UserMatrixModel, MacroCatalyst, PriorityComputation, CandidateGeneration, GreaterCycle, ShadowContentGenerator, hooks | ✅ implemented, G1 determinism gate green |
| **Curriculum subsystem** | `src/core/curriculum/` (4452 LOC, 17 modules): registry, bridge, depth assessment, forgetting curve, knowledge graph, prereq validation, needs detector, meta-cognitive probe, learning analytics, rubric calibrator, **LevellingEngine (42)** | ✅ implemented; levelling kernel-gated (G11) |
| **Assessment content engine** | `src/core/assessments/` (13,436 LOC, 84 files): per-line modules ×4, engine, scoring, item selection, AgenticOrchestrator (13-tool loop), SessionAgent, training + unified profile tools | ✅ implemented |
| **Validation kernel** | `src/core/validation/` (1205 LOC): 10 personas, harness, observables, **13 gates**; CLI tiers (`bench:validation`) | ✅ implemented, load-bearing |
| **Identity/healing firewall** | `src/core/domain/IdentityProfile.ts` + `src/core/healing/HealingContext.ts`; consent ledger, purpose-bound projector; G12 gate | ✅ implemented |
| **Adaptive + training** | `src/core/adaptive/` (CalibrationStore, AdaptiveDifficultyService), `src/core/training/` (WorkoutPlanner, plans persistence, 24h resume) | ✅ implemented |
| **Persistence** | `src/infra/persistence/` — SaveRepository over KV backends (file/localStorage/Capacitor/Cloudflare), AES-GCM CryptoStore, identity validator | ✅ implemented |
| **CLI** | `scripts/cli-game.ts` + runtimes — `mysterium` with session/diagnostic/curriculum/insights/export/events/privacy/curriculum-status/bench | ✅ implemented |
| **WebUI** | 24 SvelteKit routes (play, setup, onboarding, journal, knowledge, curriculum, profiles, telemetry, recovery, api/agent/*, api/llm/*) | ✅ implemented, thin on play wiring |
| **LLM stack** | `src/infra/llm/` — ProviderRegistry, ProxiedLLMClient, ContextPipeline, FrequencyConditioner, **VeilFilter, QualitativeFeedback (Veil mappers)**, ConsequenceParser, fallbacks | ✅ implemented |
| **Corpus** | concept-drafts.json (64 modules indexed), stage-holons (56), red-layer holons (36), curriculum data (6 programs/branches), polarity ontology, RedPESTLE | ⚠️ prototype-scale (see §3.G1) |
| **Tests** | 93 files / 949 tests / 14.6k LOC, incl. 13-gate validation kernel | ✅ green |

## 2. Gap closure status — all nine verified against the tree

> **This section was stale from 2026-09-16 to 2026-09-20.** It described PG-A…PG-F as
> "spec'd but absent" while §8/§9 recorded them implemented; `AGENTS.md §4.2` inherited the
> staleness and declared Phase 1 current. An agent reading the root protocol would have rebuilt
> finished work. Re-verified 2026-09-20 — every row below now cites the code that closed it
> (recorded as `MY-AD-0017`).
>
> **Gap IDs are `PG-n` (Plan Gap), never bare `Gn`** — `Gn` is the *kernel gate* namespace
> (`G1`–`G25`), and the two collided here until 2026-09-20 (`MY-AD-0024`). When this document
> says `G17`, it means the kernel gate; when it says `PG-1`, it means a gap row.

| Gap | Spec | Closing evidence | State |
|---|---|---|---|
| **PG-A: Delegation kernel** | 43 | `src/core/orchestration/{types,sessionLog,delegate,orchestratorTools,choicePolicy}.ts`; kernel gates **G14/G15** in `src/core/validation/gates.ts` | ✅ closed |
| **PG-B: Practice tools** | 39 | `src/core/practice/practiceTools.ts` (`validatePracticeLoop`) wired into the kernel | ✅ closed |
| **PG-C: Cohort pods** | 38 | `src/core/pods/podStateMachine.ts` + `src/infra/pods/PodTransport.ts`; **G18** privacy wall | ✅ closed |
| **PG-D: Measurement packs** | 40 | `src/core/packs/{PackEngine,referencePacks,ReliabilityCollector}.ts`; **G19** | ✅ closed |
| **PG-E: K-12 corpus** | 37 | `src/core/curriculum/data/*.foundations.json` (language-arts, arts, music, second-language, civics, health) + `scripts/author-k12-branches.py` | ✅ closed |
| **PG-F: Credentialing** | 41 | `src/core/credential/ClaimLedger.ts` + `exportRPLPortfolio`; **G21** | ✅ closed |
| **PG-1 — Corpus depth** | — | 64/64 concept modules; 64/64 stage-holon cells; 108 curriculum holons, 0 lint errors | ✅ closed |
| **PG-2 — Play-route thinness** | — | Phase 6 parity harness proved browser binding ≡ kernel loop; `tests/engine/TrainingBeatParity.test.ts` | ✅ closed |
| **PG-3 — Onboarding composite** | — | `src/core/onboarding/BinarySearchPlacement.ts`; **G20** placement convergence (≤8 probes) | ✅ closed |
| **PG-4 — Orchestration stagnation** | — | 18 roles dispatch their complete allowlists through `delegate`; `scripts/cli/delegateArgs.ts` + `tests/cli/DelegateArgs.test.ts` | ✅ closed |

### 2.1 The true gap list is now somewhere else — deliberately

The remaining work is **not** a set of missing subsystems. The ratified-laws list that stood here
through 2026-09-21 (`MY-AD-0006`…`MY-AD-0023` + the Auditor Projection Layer) is **fully
discharged** — every Active law declares its consumer (DG19-checked); deferral tags were discharged
2026-09-22 with the Phase-10 runtime wiring. What remains is the **configuration / calibration /
development frontier** verified against the tree on 2026-09-22 and owned by `AGENTS.md §4.2` §"what
is actually open" (the detailed evidence table lives in
`docs/audits/OPERATIONAL-AUDIT-2026-09-22.md`). Read it there — this plan must not restate its
contents (uniqueness principle).
- **Documentation + KB integrity** — `_org.yaml → pending` is now EMPTY of KB-tier keys. Closed in
  the 2026-09-20/21 conformance passes: gate fixtures
  (`RT-GATE-FIXTURES`), corpus reconciliation (`RT-CORPUS-RECONCILE`, gate `DG21`), orphan-script
  triage (`KB-ORPHAN-TRIAGE`, gate `DG20`), `validate --json` + the per-pass index
  (`KB-VALIDATE-JSON`), and skill provenance (`KB-SKILLS-PROVENANCE`, gate `DG22` —
  `skills/PROVENANCE.yaml` makes "the house utilities" decidable from the tree, corroborates a
  `house` claim against upstream artifacts, and is queryable as `arch skills`), and canon↔code
  ingest (`KB-FOUNDATIONS-INGEST`, gate `DG23` — every code path canon cites must resolve, every
  organ `contract_docs` entry must name code, and `arch context <file>` returns the canon naming
  that file, derived from the documents rather than declared).
- **Canon↔code conformance on the ladder itself** — closed 2026-09-20. `CODE-PASS` renamed the
  eight stage identifiers to the ratified ladder (Teal 7 / Turquoise 8, `White` retired) across
  87 content files and 18 paths via a guarded one-shot migration, and the pass it unblocked also
  settled two conflation defects it exposed: the ray is now a *lens* with sub-octave positions
  rather than a per-stage field (`MY-AD-0029`, `MY-RG-0025` — Turquoise is Indigo 6b, and the
  Violet position belongs to the closure event), and every altitude now carries its per-quadrant
  quality (`MY-AD-0030`, closing the AQAL *model* deferral of `AGENTS.md §6`). The vocabulary
  split that the same contrast work produced is `MY-AD-0031` / `MY-RG-0026` (service-polarity vs
  reconciliation-polarity). Fallout now tracked rather than latent: `QUALITY-WIRING`,
  `VOCAB-SUBSTRATE`.
- ~~**Canon↔code conformance on a load-bearing equation** — `SCHEDULER-FORMULA`~~ — **CLOSED
  2026-09-21.** The implementation of `24 §3.2`'s priority formula carried a substituted eighth
  weight plus six unweighted additive terms worth up to +0.72 on a 1.00 base score, so the
  ratified weights did not decide selection. `PriorityComputation` now implements the eight
  criteria as the only additive terms, `masteryAlignment` is implemented, every former term has a
  recorded disposition, and **G26** holds the closure by asserting *additivity* across a 6 144-point
  probe grid (the score must equal the weighted criterion sum exactly) rather than by checking a
  ceiling no candidate can reach. Verified against the personas and the full kernel battery
  (1 151 tests). Closing it surfaced three further defects, now guarded: an omitted
  `sessionDurationMs` scoring a fresh session as long (`MY-RG-0027`), a parity harness carrying its
  own clock and world (`MY-RG-0028`), and a tie-break reading recency off the head of a
  chronological trace (`MY-RG-0029`).
- ~~**The Choice conflated with its eligibility** — `CHOICE-CLOSURE`~~ — **CLOSED 2026-09-21.**
  `19 §9.6` ratified a distinction the runtime could not express: one function returned a single
  boolean that described a *condition* and also gated the post-Turquoise continuation, so "the
  player qualifies" and "the player has finished" were the same fact — and `Exploring →
  Harvesting` sat in `VALID_TRANSITIONS` for a Significator that had crystallized nothing. Now
  `checkChoiceEligibility` computes the condition, `subOctaveClosureReached` the arrival, and
  `evaluateChoice` is the **only** producer of the event (`harvestEvent = eligible ∧ reached`);
  `canHarvest` withdraws the enum's licence, so no caller can retire a player by walking the state
  machine (`MY-RG-0030`). The eligibility test also became the one `lenses/rays.md` actually
  specifies — **rainbow distinctness** (Green/Blue/Indigo floors *and* a min/max floor), so a
  saturated Violet total with a skipped ray is no longer eligible — which discharges the accepted
  negative `MY-AD-0029` carried and `06 §8`'s closing note. Verified by
  `tests/engines/ChoiceClosure.test.ts` (24 tests), both guard injections confirmed to fail.

Neither list is duplicated here. Run `python3 scripts/arch.py related <ID>` for any of them;
run `python3 scripts/arch.py validate` for the gate state.

## 3. Sequencing logic (why this order)

The dependency spine is: **nothing above the orchestrator can be honest until the
orchestrator can delegate** (43's L4 single-writer law). Practice tools (39) need a
delegable Reviewer; packs (40) need delegable S1 agents; pods (38) need witnessing
agents + practice tools. K-12 corpus (37) is orthogonal (data work) and feeds the
Teacher council once it exists. Credentialing (41) needs packs for claim evidence.

```
Phase 1  PG-A delegation kernel ────────────┐
Phase 2  PG-B practice tools ───────────────┤
Phase 3  PG-1 corpus expansion (parallel) ──┼──► Phase 4 PG-C pods
Phase 5  PG-D packs ────────────────────────┤
Phase 6  PG-2 WebUI play parity ────────────┤
Phase 7  PG-3 onboarding composite ─────────┤
Phase 8  PG-E K-12 corpus ──────────────────┤
                                            └──► Phase 9 PG-F credentialing
```

Phases 3/8 are corpus work runnable in parallel; 6/7 are UX-integrity work that can
interleave after Phase 2. The gate discipline below makes each phase independently
verifiable.

## 4. The phases

Every phase: workspace-lint → build → full test suite → invariants → the phase's gates
→ doc updates (concept→foundations feedback loop per AGENTS.md §3) → commit → push to
BOTH remotes. The kernel gate suite (22 gates, `G1–G26`) stays green throughout
(regression discipline).

**Phases 1–9 below are implemented and gated** (see §8, §9, and the closure evidence in §2); they
are retained as the record of *order and gates*. **Phase 10 is the first phase ratified after this
plan** and is the only outstanding build work — it is spec'd and not yet built.

### Phase 1 — Delegation Kernel (PG-A) — ✅ implemented

**Deliverables** (all spec'd in 43 §4–§6):
1. `src/core/orchestration/types.ts` — `DelegationSpec`, `DelegationResult`, `Proposal`,
   `AgentRole` union, `SessionSignals`, `LogRef`.
2. `src/core/orchestration/sessionLog.ts` — append-only store (KV-backed, client-side),
   signals extraction, transcript consent boundaries (39's journal rule).
3. `src/core/orchestration/delegate.ts` — `delegate_session(spec)` lifecycle:
   spec validation (toolset ⊆ role toolsets, readProjection purpose-scoping,
   HealingContext only for healing-path roles — G12 extension), execution through the
   existing AgenticOrchestrator persona lens, completion/handoff/safety/budget outcomes.
4. Orchestrator tools: `delegate_session`, `read_session_log`, `analyze_session_logs`,
   `ratify_proposal`, `schedule_presence` on the 13-tool loop.
5. Proposal ratification: validators per Proposal kind (`mastery_evidence`,
   `shadow_entry`, `encounter_record`, …) — engine-deterministic commits only.
6. Kernel gates: **G14** delegation determinism (same spec → same result, seeded),
   **G15** toolset firewall (role toolset violations fail closed), extending the G12
   firewall scan to orchestration imports.

**Gates:** G14/G15 green; every previously-shipped kernel gate unregressed; a headless CLI delegation smoke
(`mysterium session --delegate T1` proving spec→log→ratify→commit).
**Duration:** ~1 week. **Risk:** AgenticOrchestrator's in-process loop must not fork —
delegation wraps it, never bypasses the GameLoop.

### Phase 2 — Practice Tools on the Live Loop (PG-B)

1. `VowService` in core: accept/decline/lapse state machine over the existing `Vow`
   domain type; no deadlines (39's design commitment).
2. The 39 toolset (`propose_objective`, `process_checkin`, `review_practice`) as
   orchestrator tools + delegable mandates for T-council (propose/checkin) and A2
   Reviewer (review).
3. Reflection rubric scorer with offline degradation (39 P1 requirement).
4. Journal route upgrade: check-in flow over `/journal`, vow list, reflection history.
5. Kernel gate **G16**: a therapy-arc-adjacent persona runs a full
   vow→reflection→evidence cycle in the kernel harness; lapse never produces moral
   framing (Veil check).

**Gates:** G16 green; journal route e2e; CLI `mysterium vow` surface.
**Duration:** ~1 week. **Depends:** Phase 1 (mandates ride delegation).

### Phase 3 — Corpus Expansion (PG-1) — parallel track

1. Stage-holons 56 → 64 (the 8 missing cells; red-layer pattern reused).
2. Encounter-content depth: each cell ≥3 modality variants (from the 64 modules'
   concept-draft templates, LLM-assisted authoring with the 32 linter as QA).
3. Curriculum corpus: +4 branches (bio, chem, history, geography) with prereq graphs.
4. Kernel gate **G17**: corpus integrity — every (line, stage, modality) triple
   resolvable; no orphaned concept IDs; the registry lint-clean.

**Gates:** G17; coverage report 64/64 cells × 7 modalities.
**Duration:** ~2 weeks (content-heavy). **Parallelizable** with Phases 2–5.

### Phase 4 — Cohort Pods (PG-C)

1. `PodDO` Durable Object (38): membership, shared ritual state, event log.
2. Witness pipeline: `witness_objective` → pod event → recognition evidence (38 M2),
   journal-consent-gated.
3. CLI + WebUI pod surfaces (roster, ritual calendar, recognition view).
4. Kernel gate **G18**: pod privacy wall — two-persona pod simulation; witnessed
   objective produces recognition evidence without journal text crossing the client
   boundary.

**Gates:** G18; DO local dev (wrangler) verified; scope-fence assertions (38's NOT-list)
as kernel assertions. **Duration:** ~1.5 weeks. **Depends:** Phases 1–2.

### Phase 5 — Measurement Packs (PG-D)

1. Pack contract types + loader (40 §contract): manifest, instruments, scoring harness,
   reliability metadata.
2. Two reference packs (cognition: the canonical task set; language: vocabulary/
   comprehension) with test–retest and parallel-forms data collection in-app.
3. S1 Pack Agents as delegable roles; pack results stream into skill-theta (40).
4. Kernel gate **G19**: pack scoring determinism + the reliability-gate firewall (no
   pack feeds growth narrative until reliability passes).

**Gates:** G19; both reference packs pass reliability collection scaffolding.
**Duration:** ~1.5 weeks. **Depends:** Phase 1.

### Phase 6 — WebUI Play Parity (PG-2)

1. Play route: full encounter rendering across the 7 modalities (TaskRenderers parity
   with CLI), checkpoint save/resume, Veil-compliant feedback presentation.
2. Session strategy surface (27) visible in-UI; delegation presence indicators (43 §3.3)
   — which council members are "in the room".
3. Kernel: WebUI parity harness reuses the validation personas through the browser
   engine binding.

**Gates:** persona parity CLI↔WebUI (same evidence → same observable projection);
a11y pass; mobile viewport. **Duration:** ~1.5 weeks. **Depends:** Phase 1 (presence).

### Phase 7 — Onboarding Composite (PG-3)

1. Implement `ONBOARDING-REDESIGN-PLAN.md`: binary-search composite over the 8 lines →
   Significator seeding; placement via A4 Calibrator delegation.
2. Replace the legacy probe flow behind a feature flag; kernel personas gain a
   placement persona.

**Gates:** placement persona converges in ≤8 probes (08's psychophysics budget);
Significator seeded within tolerance of the calibration ground truth.
**Duration:** ~1 week. **Depends:** Phase 1.

### Phase 8 — K-12 Corpus (PG-E)

1. Subject→line mapping data (37's table) as registry data; grade bands as authoring
   metadata only (42's blindness law — enforced by G11 already).
2. Corpus: math/CS expansion + the 4 new branches to full K-12 span; authoring-guide
   conformance (37's rejection list applied).
3. Teacher-council readiness: T1/T2 mandates resolve against the expanded graph.

**Gates:** G11 green against the expanded corpus; G17 corpus integrity; sample
trajectory renders K-5 → undergraduate on one branch.
**Duration:** ~2 weeks. **Depends:** Phase 3 (corpus infrastructure).

### Phase 9 — Credentialing Surfaces (PG-F)

1. Claim-based credential ledger (41 §contract) — local-first, export as VCs.
2. Pack-evidence → claim → VC pipeline (41's evidence chain), consent-gated.
3. RPL evidence export format for partner institutions (41 P3).

**Gates:** G21 credential evidence chain (claims trace to pack reliability status);
consent firewall (identity never in credential payloads).
**Duration:** ~1.5 weeks. **Depends:** Phase 5.

### Phase 10 — Generative World & Personalization (ratified 45 / 46 / 47) — ✅ built (2026-09-21)

This phase's deliverables come from canon written **after** the plan (`45` 2026-09-20, `46` and `47`
same day), so it is recorded here as a phase rather than retro-fitted into §2's gap table. It is the
only outstanding *build* work in the repository.

**Deliverables:**
1. **World store** (`46 §10`) — the holon store, the facet store, the tag store with the derived
   dialectic relation, the composition pipeline, and the three library views. Correct
   `organs.world.code` (currently cohort pods) and move the world content out of `src/core/data`.
2. **Facet compiler** (`46 §8`) — compile the 512 concept-drafts into the facet store. The compiler is
   the **only** path, which is what keeps the corpus and the store from diverging.
3. **Tag ontology** (`46 §4`) — the initial tag set with axis positions and the curated dialectic
   pairs; a tag without a resolvable opposite is a compile error. Bounded per `46 §13` res. 2.
4. **Profile inference** (`47 §8`) — the evidence ledger, the tier gate, decay, and the deterministic
   commit path (an LLM proposes, the counter commits).
5. **Scaffold library** (`47 §6`) — the ten scaffolds, the selection function, and recorded selections
   with their inputs.
6. **Probe set** (`47 §7`) — in-world probes championed through `12 §5.4`'s RV protocol; a probe that
   has not passed runs log-only and may not seed a T1 field.
7. **ScenarioContext envelope** (`45 §6`) — the UDV + pooled set + bridge + catalyst target object the
   scenario-catalyst agent consumes, with `45 §6.1`'s per-role projection scoping.
8. **Engagement register** (`45 §7.3`) — the per-mechanism record of the two tests, seeded with the
   mechanisms already in the tree.

**Gates:**
- **G22 — composition integrity** (`46 §11`). Every composition records `(facet keys, tag query, seed)`
  and replays identically; `opposite(opposite(t)) == t` for every tag or the tag is excluded from
  dialectic selection; no composed facet falls outside its target cell; an unknown tag fails closed.
- **G23 — the tier gate** (`47 §9`). No field of record without `{tier, provenance, dataClass,
  consentRef}`; the store schema has no slot for a T3 reading; no archetype prior lacks an expiry or
  appears in an identity field; a T1 field cites a passing RV result.
- **G24 — scaffold integrity** (`47 §9`). No scaffold outside its compatibility set; none exceeds
  `maxExposures`; every selection is recorded; the expansion floor applies to the scaffold set; a
  load-bearing domain never occupies the structural pole.
- **G25 — the structural red line** (`47 §9` check 6). The inference module's only write path is the
  UDV field set, asserted at the **module-graph** level rather than by review — a pure reader over text
  cannot implement the forbidden technique set because there is nowhere for it to write.
- **The kernel gate suite unregressed** throughout (22 gates, `G1–G26`).

**Duration:** ~3 weeks (facet compilation and the probe set are content-heavy).
**Depends:** nothing outstanding — Phases 1–9 are closed.

**Build record (2026-09-21).** All eight deliverables exist and are gate-checked. (1)–(3) world
store / facet compiler / tag ontology: `src/core/world/{store,facets,tags,pestle,encounters-red}`,
the organ owns its code (`_org.yaml`), 1472 facets compiled from the 64 module-specs with the
authored facetAffinity matrix as the tag join. (4)–(5) profile inference + scaffold library:
`src/infra/profiles/evidenceLedger.ts` (tier gate, decay, per-context evidence), `src/core/world/
scaffolds/ScaffoldLibrary.ts` (selection recorded with inputs, fading DAG). (6) probe set:
`src/core/personalization/probeSet.ts` (playable-encounter instruments, RV1–RV7 citation, log-only
band for unvalidated, declinable without trace, session budget). (7)–(8) ScenarioContext envelope
+ engagement register: `src/core/personalization/{pooling,scenarioContext,engagementRegister}.ts`
with `ROLE_SCOPES` enforcing 45 §6.1's blindness table by structural absence. Kernel gates G22–G25
live in `src/core/validation/gates.ts` and run in `runValidationSuite` (26 gates). Locked by
`tests/personalization/` (36 tests) and `tests/validation/Benchmark.test.ts`.
**Risk:** the facet compiler is the single point where 512 prose documents become data. If it is not
*the only* path, corpus and store diverge silently — the failure class `RT-CORPUS-RECONCILE` tracks.

**Closure record (2026-09-21 → 2026-09-22).** The phase's runtime half landed in four commits and is
closed: `edb2707`/`48c40cd` (telemetry + diversity monitors), `1d45013` (composed facets into the live
LLM prompt), `7e6ce01` (feed + owner workers + the orchestrator seam), `3ff3992` (services through
`AgenticOrchestrator` on all five result paths; `cli-game.ts` + `gameEngine.ts` carrying and persisting
them), `6024a58` (live coherence gate, per-modality seed variants, persistence), then the authored
seeding tier `1906ecd` (64 scenario seeds + 8 pole-probes + G27) and `148e275` (64 world seeds — the
authored [scenario | world] legs of the 46 §2 triad; candidate library 1792). Kernel gates now
**G1–G27** (27); `_org.yaml → pending` is empty, graduated to `completed: P13/P14`.
**The configuration/calibration frontier that Phase 10's closure exposed** (checkpoint restore, feed
readers, identity intake, probe RV validation, NPC persona tier, tag growth) is owned by
`AGENTS.md §4.2` §"what is actually open", not by a new phase.

### Current work (post-plan) — not a phase

All nine phases are closed; what remains is listed in §2.1 and owned by the record layer. When
current work is described to an agent, cite `AGENTS.md §4.2` (which now carries the true state)
and the ledger — never a phase number. **Phase 10 is the exception**: it is a scope'd phase whose
deliverables were ratified after this plan, and it is the only outstanding build work.

## 5. Standing work-streams (not phases — continuous)

- **Validation-kernel growth:** every phase adds its gates (G14–G21 shipped; G22–G25
  defined by Phase 10); personas grow with features. The kernel is the project's
  regression conscience.
- **Doc⇄code feedback loop:** implementation feedback updates foundations docs in the
  same commit (AGENTS.md §3.2); no doc drift allowed to re-accumulate.
- **Cross-reference regeneration:** re-run the xref generator after adding numbered
  foundations docs (audit convention #4).
- **Veil & firewall vigilance:** G12 (identity), G11 (demographic blindness), and the
  43-extended toolset firewall are permanent CI assertions.

## 6. Definition of done for the whole plan

The system qualifies as the "complete education-system replacement" trajectory when:
1. 64/64 cells × 7 modalities resolvable with ≥3 variants (G1 closed).
2. A player can onboard (composite placement), play sessions across all surfaces with
   delegated councils, maintain vows with reflections, join a pod, take a pack, and
   export a credential — all kernel-gated end-to-end.
3. CCI/levelling/CCI-adjacent metrics all flow through the evidence-only law (42).
4. Full battery + 18 kernel gates green on both remotes.

## 7. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Delegation forks the single-writer law | Phase 1 wraps AgenticOrchestrator; L4 ratification is the only commit path; G14 determinism gate |
| LLM-dependent features degrade offline | Every delegated mandate degrades to deterministic fallbacks (39 P1 precedent) |
| Corpus authoring becomes the bottleneck | LLM-assisted authoring with CurriculumLinter (32) as QA; concept-drafts as templates |
| WebUI parity drift | Persona parity harness (Phase 6) reuses kernel observables — one definition of "same behavior" |
| Scope creep (social-media gravity) | 38's scope fence as kernel assertions; anti-gamification commitments (20 §6) as gates |

## 8. Immediate next actions

All 9 phases are IMPLEMENTED (see revision record). The post-plan frontier each phase
defered honestly is ALSO IMPLEMENTED (2026-09-17 — see revision record):

1. **Delegation (43):** ✅ LLM-backed choice policies behind the role interface
   (`src/core/orchestration/choicePolicy.ts`); the deterministic policies remain the
   kernel's test doubles and the offline fallback (G14 untouched).
2. **Pods (38):** ✅ the Durable-Object transport adapter binding `applyEvent`
   (`src/infra/pods/PodTransport.ts`: InMemoryPodCoordinator + PodDurableObject +
   remote stub); the pure core, CLI surface, and G18 were already done.
3. **Measurement packs (40):** ✅ the full §4.3 table (8 packs) + reliability data
   collection (`ReliabilityCollector`) that retires `provisionalUntil` ceilings —
   only on a mature report, disclosure traveling with the instrument.
4. **K-12 (37):** ✅ the planned branches authored (language-arts, arts, music,
   second-language, civics, health — 31 holons); the subject→line map's only
   remaining non-present row is SEL, partial *by design* (the 64-module engine IS
   that curriculum).
5. **Credentialing (41):** ✅ partner-institution RPL export (§4.5 step 3) —
   `exportRPLPortfolio` + `mysterium credential rpl`; recognition now requires
   institutions, not code.

What remains is genuinely external: real reliability data (retire ceilings from
evidence), a partner institution (assess a portfolio), networked pod hosting
(deploy the DO), and per-line LLM keys for delegated mandates.

## 9. Revision record

| Date | Revision |
|---|---|
| 2026-09-16 | Initial binding plan from exhaustive code-vs-docs audit (commits `1c432e9`→`a4c9bfd` era tree). Phases 1–9, gates G14–G18 defined. |
| 2026-09-16 (same day, full implementation) | **All 9 phases implemented and gated.** G14–G16 (delegation determinism/toolset firewall, practice loop) in Phases 1–2; Phase 3 audit-corrected — stage-holon cells were already 64/64 (red-layer file miscounted in the plan), so G17 became the corpus-integrity gate (cells + relationships + lint-clean registry + 64/64 concept modules) and 4 curriculum branches shipped (bio/chem/hist/geo, 21 holons). G18 renumbered to the pod privacy wall (two-persona pod simulation); Phase 4 delivered the pure pod state machine + CLI. G19: measurement-pack determinism/linter teeth/stream integration + 2 reference packs. G20: placement convergence (binary-search onboarding composite, ≤8 probes). G21: credential evidence chain (E2/E3/E4 teeth, revocation, VC export). Phase 6's parity harness proved browser-binding ≡ kernel loop and caught the offer-consumption + entry-config parity hazards. Gate count: 13 → 21. Tests: 949 → 1028. Deferred honestly to post-plan: LLM-backed choice policies, DO transport adapter, reliability data collection, planned-branch authoring, partner institutions. |
| 2026-09-17 | **Exhaustive operational verification pass.** Full battery green (lint, build, 1037 tests, 21 kernel gates). Three defects found by exercising the surfaces end-to-end and fixed in the same commit: (1) **Training-beat WebUI parity (WIRE-7)** — Phase 6's parity claim covered the narrative loop only; browser sessions never wove training beats and the new `TrainingBeatRunner` dropped its outcome entirely. Fix: the weave decision is now the exported `computeTrainingWeave()` policy in GameLoop (single definition, consumed by both `tickWithStrategy` and the browser `scheduleEncounters`), and `trainingBridge` + the play route give beats the CLI's exact persistence path (trials/index/calibration/staircase) with no narrative consequence. Contract locked by `tests/engine/TrainingBeatParity.test.ts`. (2) **Delegation CLI smoke was role-broken** — the smoke spec hardcoded a toolset that G15 correctly rejects for all T-roles, so the Phase 1 gate `spec→log→ratify→commit` was only reachable for J-roles; the spec now derives its toolset from `ROLE_TOOLSETS` (verified for T1/therapist/J1). (3) **Onboarding calibrator demo unit mismatch** — `calibrate --onboard` fed a 0–1 threshold to per-line task-unit maps, saturating Somatic to a spurious White; demo thresholds are now per-line task units and the ThresholdMaps contract has its first tests. Command-path note: the Phase 1 smoke lives at `mysterium delegate --role <role>` (not `session --delegate`). Tests: 1028 → 1046. |
| 2026-09-17 (same day) | **Post-plan frontier closed (§8 items 1–5).** (1) Delegation gains LLM-backed choice policies: `ChoicePolicy` seam (`orchestration/choicePolicy.ts`) with mandate-shaped prompts, Veil bidirectional filtering, OA-13 avoidance and TL1 surfacing hygiene preserved; ANY failure degrades to the deterministic role policy — the kernel never injects a policy so G14 stays byte-stable (`executeDelegatedSession`/`delegateSession` are now async; no outcome change without a policy). (2) Pods gain the networked coordinator: `infra/pods/PodTransport.ts` — `InMemoryPodCoordinator` (offline/M0 runtime + test double), `PodDurableObject` (Cloudflare DO class whose runtime serialization IS the L5 single-writer law; JSON RPC + fetch shell + replay log), and a `remotePodTransport` client stub; the privacy wall runs before the state machine for defense in depth. (3) Measurement packs complete the doc-40 §4.3 table (8 packs: +memory.spatial, cognition.speed, cognition.control, language.reading, coding.fluency, math.fluency) and gain `ReliabilityCollector`: interval-respecting session records, windowed retest r + form effect, and `retireProvisional` that flips the honesty flag ONLY on a mature report (r ≥ .70, ≥6 sessions, form effect within bound). (4) K-12: the 6 planned branches authored (language-arts, arts, music, second-language, civics, health — 31 holons, five phases each, full depth rubrics, devMapping per 37 §3.1, zero grade-band vocabulary); subject→line map rows flipped to `present`; corpus now 108 holons, 0 lint errors. (5) Credentialing gains the RPL partner route: `exportRPLPortfolio` (41 §4.5 step 3) — assessor-shaped portfolio, fail-closed on invalid/draft/revoked claims, chosen-name-only identity posture — surfaced as `mysterium credential rpl --name <chosen-name> [--claims id1,id2]`. New tests: `tests/postplan/Frontier.test.ts` (36). Tests: 1046 → 1082. |
| 2026-09-17 (same day, exhaustive re-verification) | **Delegation executor made toolset-conformant (43 §4.3).** Exercising the delegated-session surfaces end-to-end exposed a structural conformance defect: `executeDelegatedSession` logged a `record_encounter` tool call and emitted an `encounter_record` proposal for EVERY role — including T-roles whose allowlist excludes it (a TL1 violation by the executor itself, invisible to G15 which validates only specs) — while all declared read tools (`get_concept`, `get_module_spec`, …) and propose tools (`propose_mastery_evidence`, `propose_retention_estimate`, `propose_trajectory`) were never dispatched, and A3/S1's `pack_administer`/`pack_score` mandates (docs 40 §1 + 43 §4.3) were unreachable. Fix: execution now dispatches strictly by the validated toolset — J-council drives the live loop (unchanged, G14 byte-stable), non-encounter roles run a real advisory mandate (read projections served from live engines/registry/polarity ontology, one ratifiable proposal per role), and pack roles administer a deterministic seeded instrument over `REFERENCE_PACKS`. The `Proposal` union gains the `pack_score` kind and `ratifyProposals` now APPLIES the advisory kinds (L4 single commit path): `pack_score` → `integrateSkillTheta` (the sole sanctioned skillTheta write, 40 §4.2), `mastery_evidence` → monotone depth bump with evidence history (42 evidence-only grading), `retention_estimate` → retention+timestamp update, `trajectory`/`threshold_signal`/`consent_inform`/`alignment_adjustment` → validated and dispositioned (the forwarding channel to orchestrator planning) instead of silently default-rejected. Also fixed the `Date.now()` shadow-entry id (determinism, 43 §5.3). Tests: 1082 → 1090 (`Frontier` P6 suite: toolset conformance, ratification application, fail-closed payloads, G14 shape for advisory mandates). |
| 2026-09-17 (same day, third exhaustive pass) | **Eager-signals layer made real (43 §5.1/§4.5/§4.7) + WebUI engine integration coverage.** Doc-contrast audit found `SessionSignals` (the log's eager-reading layer) was dead scaffolding — every session log closed with `emptySignals()` and no consumer evaluated the §5.1 thresholds; §4.5's five handoff events were only reachable as `completion`/`handoff`/`budget_exhausted`. Fix: `computeEagerSignals()` in the delegation executor derives all five signals deterministically from the session record — `distressSignal` from the crisis-pattern detector over the transcript (extracted to `core/safety/crisis.ts` as the single definition shared with the practice loop; no import cycle), `frustrationSignal` from the OA-13 empty-narrative avoidance marker, `veilRisk` from the deterministic Veil scan (advisory; the §4.7 ratification gate remains enforcement), `progressDelta` as signed engagement share, `consentEvents` from consent-borne proposals — and outcome conformance now holds: crisis preempts to `safety` (event 3), sustained avoidance hands back for flow protection. Veil scan gained the "<noun> score was N" measurement-disclosure pattern (doc 20: the game never reveals assessments). Also: `tests/helpers/localStorageMock` now probes for a WORKING localStorage (node ≥22 exposes a global that throws without `--localstorage-file`, silently zeroing engine boot in headless runs) and a real gameEngine integration suite covers boot→session→weave→beat-completion→decline over the actual SaveRepository seam (`tests/engine/GameEngineIntegration.test.ts`). Tests: 1090 → 1107. |
| 2026-09-17 (same day, fourth exhaustive pass) | **Test-infrastructure integrity + UI correctness + doc-canon repairs.** Independent re-verification confirmed the full battery green (lint, build, 1107 tests, all 21 kernel gates, every CLI surface exercised end-to-end: session/delegate/vow lifecycle/pod fail-closed paths/credential draft→issue→export→revoke→RPL/curriculum lint/train demo/calibrate --onboard). Defects found and fixed in the same commit: (1) **Vitest exit-hang eliminated** — tests ran through the raw `vite.config.ts` (SvelteKit + PWA plugins loaded into the test pipeline); the sveltekit() plugin's transform machinery held 10 anonymous FILEHANDLEs open, forcing a 10s forced-exit after every run. New `vitest.config.ts` drops the plugin (no test compiles .svelte) and provides minimal `$app/*`/`$env/*` stubs (`tests/stubs/`) plus the full alias set from `svelte.config.js` ($lib/$core/$infra/$shared + legacy @core/@infra); suite now exits clean in ~5s. (2) **`svelte-check` was referenced but never installed** — the `check` script silently no-op'd (`command not found`), so no Svelte component was ever type-checked; devDependency added, 0 errors. (3) **Dead scoped styles on child-rendered elements** — `.encounter-card`, `.reflection-card` (play route), `.question-meta`, `.question-card`, `.question-actions`, `.options-list` (LLMDialogueRunner) styled elements rendered inside `<Card>/<Cluster>/<Stack>`, which scoped selectors can never reach; converted to `:global()` (the `.options-list` gap rule was redundant with the `<Stack gap>` prop and removed). (4) **Portal reactivity bug (Svelte 5)** — `host` assigned in `onMount` without `$state`, so `{#if browser && host}` never re-evaluated and portal content (Modal, Toaster) could never mount. (5) **a11y** — curriculum tree `treeitem` gained required `aria-selected`. (6) **Doc-canon repairs** — `docs/INDEX.md` pointed the binding plan at non-existent `superpowers/plans/` (now `docs/DEVELOPMENT-PLAN.md`); `AGENTS.md §2.1` listed 7 foundation filenames that don't exist (01-aqal-framework, 02-stages-of-consciousness, 03-lines-of-intelligence, 04-states-and-state-stages, 07-neuroscience-of-assessment, 08-psychophysics-and-adaptive-testing, 09-flow-and-engagement → actual `-quadrants`/`-overview`/`-of-consciousness`/`-of-development`/`-and-staircase`/`-theory` names). svelte-check: 0 errors / 0 warnings. Tests: 1107 (no count change; hang removed, coverage added). |
| 2026-09-17 (same day, fifth exhaustive pass) | **Delegation CLI surface made flag-correct and whole-allowlist-conformant.** Independent re-verification confirmed the full battery green (lint, build, 1107→1120 tests, svelte-check 0/0, all 21 kernel gates, every CLI surface + both WebUI build targets exercised). Defects found by driving the `delegate` smoke across all 18 roles and fixed in the same commit: (1) **Root/subcommand flag collision** — `delegate` parsed its flags from the raw argv tail, but commander consumes ROOT-declared flags (`--json`, the old subcommand `--encounters` colliding with root `-e, --encounters`) before that scan: `--json` was silently dead (the documented machine-readable output never existed for this command) and a user-specified budget was silently dropped. Fix: `--json` now reads the root opt (JSON_MODE); the budget flag renamed to the collision-free `--budget` with default 6. (2) **Advisory-mandate starvation** — the old default budget (2) could not complete any 3-tool allowlist, so T1/T2/J3/J4/therapist (5 of 18 roles) always ended `budget_exhausted` with ZERO proposals: the spec→log→ratify→commit gate was unreachable for them through the CLI. (3) **S2/S5 allowlist violation** — their tools were shadowed as "proposal tools" in `ADVISORY_PROPOSAL_TOOL` (both are read/ops tools with no proposal kind, per 43 §4.2: S2's output IS the alignment context S3 consumes; S5 reports ops health), which excluded them from the read dispatch — S2 never ran `assemble_healing_context`, S5 never ran `run_benchmark_tier`. Now all 18 roles dispatch their complete allowlists; 16 emit ratifiable proposals, S2/S5 correctly emit none. (4) **CLI arg contract extracted + locked** — `scripts/cli/delegateArgs.ts` (role vocabulary, budget floor ≥ the largest allowlist) with `tests/cli/DelegateArgs.test.ts` including a SOURCE-level guard that the delegate path never re-scans argv for root-declared flag names (the defect class, not just the instance). (5) **Stale `test:cli` npm script** pointed at non-existent `tests/cli.test.ts` (now `tests/cli/`). Meta-verification (doc⇄code contrast): doc-40 §4.3 pack table byte-faithful (ids, forms 3/3/3/3/2/2/2/3, ship order, stopSe 0.30), subject→line map 12 present + SEL partial-by-design with inversion note (37 §3.1), `consent_inform` ratification records disclosure without touching consent state (43 §4.7 — only the player executes consent), G17 corpus-integrity gate has real teeth, static/SPA build asset graph complete. Tests: 1107 → 1120. |
| 2026-09-17 (same day, foundations upgrade pass) | **Architectural documentation upgraded for the four verified weak links BEFORE implementation (user directive; foundations precede code per §4.3).** All upgrades extend existing owners — no new documents, no redundant infrastructure: (1) **Profiling-as-diagnostics** — doc 16 gains the **Auditor Projection Layer** (§2.4 + §10.4): the Significator is the single source for consented guardian diagnostics (parent/teacher-guardian/therapist), read through purpose-scoped projections (`guardian`/`educator`/`therapeutic`), hierarchical granularity drill-down (summary→line→line-stage→line-stage-cell, AP3 descent-only), consent re-checked at every render (AP4), auditors read-only + propose-only via `receive_auditor_request` (AP5). The four-layer observability model (§10.1) replaces three; §10.3 rule 6 rules the Veil binds the player surface only — auditor projections are the sanctioned metric-bearing surface (42 §1.1 firewall untouched). Doc 33 reframed as the render-contract document and gains §7: Guardian Mirror / Educator Desk / Therapeutic Pane over AuditorShell, with the unresolved auditor-authentication open question recorded. (2) **Knowledge-depth compilation validation** — doc 32 gains **Category E (E1–E7)**: deterministic depth-validation invariants (depth-profile completeness, task monotonicity, prerequisite DEPTH closure, blind-spot adjacency population + diagnosis validity, journey viability, rubric–agent consumability) that run first and gate the judgment checks; doc 31 gains **§3.5a** (`PrereqEdge.minDepth` + depth-closure computation with retention-demotion, `BlindSpotEntry` with four failure classes, `depthCeiling`) resolving two of its open questions, and doc 30's holon template gains the **depth-profile phase** at every hierarchy level. (3) **Mastery sequencing inside the catalyst loop** — doc 24 gains **§3.2.8 (mastery-sequence alignment, weight 0.10, weights renormalized)** so curriculum catalyst rides the SAME scheduler formula (no parallel queue, no study mode), consuming 31's blind-spot map for gap-directed probes; doc 34 §3.3's sketch is canonised-subordinate to 24 §3.2.8. (4) **Rubric-validation protocol** — doc 12 gains **§5.4 (RV1–RV6)**: inter-rater agreement (κ/ICC), construct coverage, known-answer stability on seeded personas, adversarial resistance, **below-stage discrimination (RV5: resolved/arrested/bypassed — the holonic diagnosis requirement making 16 §11.1's ±1 accuracy achievable and 42 §3.2's shadow gate meaningful)**, and runtime drift monitoring; unvalidated rubrics are log-only (24's instrument-intake rule); 40 §1's three-layer table stays unique (12 validates implicit instruments, 40 validates explicit packs). (5) **Deferments recorded** — doc 19 §13: long-horizon consequence propagation (cross-session world memory) deferred, ownership retained; doc 43 §4.7: human-handoff flows (escalation contacts, localized patterns, live handoff, adverse-event surfaces) deferred with `route_to_safety` contract unchanged. Focus ruling recorded in `docs/INDEX.md`: stage-development, evolution, and healing — via profiling-diagnostics + the validated agentic loop — take build priority. |
| 2026-09-17 (same day, foundations re-audit) | **Architectural re-audit of the upgrade pass — 10 consistency defects found and repaired in the owning docs.** (1) **8-criterion canon propagated**: docs 25, 27 (lateral note, §2.3 interface + `masteryAlignment` field, §5.2 parameterisation table, worked example), 34 now all cite the scheduler's 8 criteria — no doc still claims seven; `masteryAlignment` documented as a first-class `PriorityWeightBias` member with bias + arc-ceiling compatibility rules (24 §3.2.8 note) and the 27 §5.3 wrapping contract verified unchanged (auto-mode multiplies then renormalises). (2) **R1 hardenings**: doc 20's cross-reference table gains the auditor-projection row (metric-bearing surface named as 16 §10.3 rule 6); doc 43 §4.7 gains the minor-guardianship ruling (guardian as consent-holder-of-record for young players + player assent; **minor-guardianship product design explicitly DEFERRED to the 38-era** — auditor layer serves documented-guardian flows only, a product-surface deferral, not a dependency) and the auditor-request un-delegability bullet; educator/therapeutic projections explicitly allowed to carry `skillTheta` streams (derivation invariants unchanged). (3) **R2 completion**: doc 32 gains **E8** (hierarchy-level depth aggregation — Topic/Subject/Branch holons re-run the E-gate at their own altitude, giving the teacher/assessor/developmental/therapeutic sub-agents a depth-validated framework at every altitude); Teacher toolset's `get_prereq_gaps` annotated to read 31 §3.5a DEPTH closure (unsatisfied edges, not mere existence). (4) **R3 completion**: doc 12 §5.4 gains the two validity accounts (psychometric = active-stage; shadow = below-stage quadrant fidelity), **shadow-quadrant specificity folded into RV2** (≥ 95% precision/recall — an allergy must never classify as an addiction, dark never as golden; the Distortion Ledger and vector selection key on it), **RV6 active-stage placement accuracy added** (±1 in ≥ 90% / exact in ≥ 70%), drift monitoring renumbered **RV7**; phases renamed RV-A/B/C to stop colliding with gate numbers; INDEX/AGENTS canon references synced to RV1–RV7; doc 19's deferral row now cites Phases RV-A–RV-C. (5) **Naming sync**: 33 §7 Educator Desk renders "mastery-sequence status (24 §3.2.8)". Sweep verified: zero stale "7 criteria"/RV-count references remain; scheduler weights sum to exactly 1.00. |
| 2026-09-20 | **Phase 10 ratified: Generative World & Personalization (`45` / `46` / `47`).** The world/NPC/scenario + personalization architecture was ratified (`MY-AD-0018`, `MY-AD-0019`), then the generative model that makes it affordable (`MY-AD-0021` — entities composed from facets, a tag store whose dialectic opposites are *derived* by reflection rather than hand-paired), then the preference-inference and scaffolding model (`MY-AD-0022` — the evidence tier that makes `45 §10`'s inference boundary auditable; `MY-AD-0023` — delivery structure selected from a ten-scaffold library that fades along a DAG converging on unassisted practice). Four guards: `MY-RG-0017`/`MY-RG-0018` (engagement, data classes), `MY-RG-0019` (a static store reasserting itself), `MY-RG-0020` (a language-derived inference becoming a field of record without tier/data-class/consent), `MY-RG-0021` (a preference prior hardening into an identity label). Gates G22–G25 defined: composition integrity, the tier gate, scaffold integrity, and the *structural* red line (the inference module's only write path is the UDV field set — asserted at module-graph level, so the forbidden technique set has nowhere to write). `46 §13`'s six open questions resolved (stake/pressure-lever independence, tag bounds, situation lifecycle, compiler retro-fit, hot-cell index; `expansionRatio` remains data-dependent). New doc: `docs/foundations/47-preference-inference-and-scaffolding.md`. Also closed in the same pass: the stale `AGENTS.md §4.2` phase declaration and the plan's §2 gap rows (`MY-AD-0017`), and the documentation's relationality + BM25 retrieval (`MY-AD-0015`, `MY-AD-0016`; DG14–DG17). |
| 2026-09-20 (same day, canon↔code conformance pass) | **The ratified ladder made real end-to-end, and the backlog made visible.** Four KB-tier pending keys closed with gates rather than prose: `KB-VALIDATE-JSON` (`validate --json`/`--out` with per-gate structured results, an explicit `skipped` account so a gate that did not run can never read as passing, and a shared per-pass read index replacing the per-gate full scan — a *persisted* cache was designed and refused, because a stale cache is a gate that passes on a broken tree), `KB-ORPHAN-TRIAGE` (**DG20**: every `scripts/` file declares `@script-status: wired\|probe\|one-shot\|historical` plus a reason, and a `wired` claim must be corroborated — it caught `tdg-probe.ts` claiming it ran from `install.sh` when nothing invokes it, and then caught the gate itself corroborating claims via `arch.py`'s own fixture table), and `RT-CORPUS-RECONCILE` (**DG21**, which failed on arrival with 23 violations: `src/core/data/concept-drafts.json` still shipped the retired `:white` modules and was missing all eight `:teal` ones — the silent divergence RT-2 predicted, live in the shipped data). `CODE-PASS` then renamed the eight stage identifiers (87 files, 18 paths) via a guarded one-shot migration, in the same commit as its canon repairs (`02 §4` reproduced the retired union; `06 §8` carried a duplicate `Turquoise` key and a stale `STAGE_TO_RAY`). **The pass's substantive finding was not the rename.** Contrasting the code against the KosmOS ontology exposed that the ray had been modelled as a *per-stage field*, and a flat `Record<Stage, Ray>` cannot express two altitudes sharing a ray — so the missing distinction had been absorbed by inventing one, giving stage 8 the Violet ray while canon (`06 §5.1`) and `lenses/rays.md` both read Turquoise as Indigo 6b and reserve Violet for the closure *event*. Fixed as a lens (`RAY_LENS` + `SubOctave`, `STAGE_RAY_MAP` derived, `StageModule.ray` removed; `MY-AD-0029`, `MY-RG-0025`) with the same-ray transition signal no longer depending on the bug. Two further conformance decisions ratified in the same pass: **every altitude now carries its per-quadrant quality** ingested from KosmOS `_Ontology/stages/altitude.md`, which is what makes the Teal/Turquoise distinction qualitative rather than index-based and closes the AQAL *model* half of `AGENTS.md §6` while making the dual vectors computable (`MY-AD-0030`, `stage-quality`, `agapeScan`/`erosScan`); and **bare *polarity* now means service-polarity**, with the dialectical sense renamed reconciliation-polarity and regrounded on KosmOS's state-carrying `polar_pair` (`MY-AD-0031`, `MY-RG-0026` — `46 §4.3` gained the `reconciled`/`active-tension`/`undiscovered` state that its engine was missing). Three gate defects were found by building the gates: DG5/DG6's record exemption matched `docs/system/core/` only, so it silently stopped applying once records moved to organ cores; DG12 skipped records' wiki-links on the stated grounds that DG8 owns them, which is true of markdown links only; and DG20's corroboration could be satisfied by a mention. New: 18 ladder/lens/quality tests, `arch fixtures` now 21/21 proven. Tests: 1120 → 1138. |
| 2026-09-21 | **The scheduler made to obey the formula it publishes (`SCHEDULER-FORMULA` closed).** `24 §3.2` declares eight additive criteria summing to 1.00; the implementation carried `userMatrixTargeting: 0.12` as a *ninth* weight (canon's eighth, `masteryAlignment`, had no implementation at all) plus six unweighted additive terms after the weighted sum, worth up to +0.72 on a 1.00 base — so the bonuses governed selection and the ratified weights largely did not, while the file's own header still transcribed the pre-2026-09-17 seven-criterion formula and made the drift invisible from inside the file. The eight criteria are now the only additive terms, `masteryAlignment` is implemented, every former term has a recorded disposition, §3.3's tie-break moved to the comparator where canon always had it, and the ray/polarity bias enters multiplicatively. **G26** holds the closure by asserting *additivity* (score must equal the weighted criterion sum exactly) over a 6 144-point probe grid, rather than a ceiling no candidate can reach — canon's criterion maxima are all below 1. Closing it surfaced three further defects, each now guarded: an omitted `sessionDurationMs` made `undefined < 900_000` false so a fresh session scored as a *long* one (`MY-RG-0027`); the WebUI parity harness carried its own epoch and its own world, so it was comparing two different games (`MY-RG-0028`); and the tie-break read recency off the *head* of a chronological trace (`MY-RG-0029`). Tests: 1138 → 1140 + 13 formula closure tests. |
| 2026-09-21 (same pass) | **The Choice separated from its eligibility (`CHOICE-CLOSURE` closed, `19 §9.6`).** One function returned a single boolean that described a *condition* and also gated the post-Turquoise continuation, so "the player qualifies" and "the player has finished" were the same fact — and `Exploring → Harvesting` sat in `Significator.VALID_TRANSITIONS` as a legal transition for a player who had crystallized nothing. Now `checkChoiceEligibility` computes the condition, `subOctaveClosureReached` the arrival, and `evaluateChoice` is the **only** producer of the event (`harvestEvent = eligible ∧ reached`); `canHarvest` withdraws the enum's licence, so no caller can retire a Significator by walking the state machine (`MY-AD-0005` discharged its deferral; `MY-RG-0030` guards the class). The eligibility test also became the one `lenses/rays.md` actually specifies — **rainbow distinctness** (Green/Blue/Indigo integration floors *and* a min/max floor), so a saturated Violet total with a skipped ray is no longer eligible — which discharges the accepted negative `MY-AD-0029` carried and `06 §8`'s closing note. `_org.yaml → pending` lost its key and gained a `completed: P7` entry. Verified by `tests/engines/ChoiceClosure.test.ts` (24 tests), with both guard injections (re-adding the transition; dropping `∧ reached`) confirmed to fail. Tests: 1151 → 1175. |
| 2026-09-21 (same pass) | **"The house utilities" made decidable (`KB-SKILLS-PROVENANCE` closed, KB audit UT-9).** `skills/` held 2 house governance skills and 134 tracked files of third-party content with nothing distinguishing them, so the set was not decidable from the tree and vendored code sat committed as though it were ours. `skills/PROVENANCE.yaml` is now the single canonical declaration (`kind: house|vendored`, plus `source`/`author`/`license`/`license_file` for vendored and `spec` for house), and **DG22** keeps it total over `skills/*/` in both directions — an undeclared directory fails, a declared directory that is gone fails — so it cannot rot into a stale list (`MY-RG-0015`). It is a *root manifest* rather than a marker file inside each skill precisely because vendored directories must stay byte-identical to upstream for re-sync, which is the drift the declaration exists to prevent. The check that makes it provenance rather than a label: a `house` claim is **rejected** when upstream artifacts are present (third-party `license`/`metadata.author` frontmatter, or a `LICENSE*` file). The answer is also reachable from the CLI and not only from the gate — `arch skills [--kind house|vendored]`, and `arch route skills/<name>` resolves a skill to its provenance. **Limit stated in the gate, not implied** (this audit's own `MY-RG-0014` standard): two vendored entries were stripped of their upstream frontmatter before vendoring and carry no license file, so nothing in the tree distinguishes them from a house skill; for those the gate corroborates that the declaration is *complete*, not that its `kind` is *true*. Both boundaries are visible in the fixture choice — injection lands on `ui-styling`, whose artifacts exist, so the proof exercises the corroboration branch rather than only the coverage branch. Also corrected stale gate counts (`G1–G21` → the 22-gate `G1–G26` suite) in `AGENTS.md §4.2`, the plan and the audit. `arch fixtures` 22/22. |
| 2026-09-21 (same pass) | **Canon↔code made a checked edge in both directions (`KB-FOUNDATIONS-INGEST` closed, KB audit UT-11).** `docs/foundations/` was ingested by nothing: no generator, no index, no link between a document's contract and the code that must satisfy it beyond organ-level `contract_docs` pointers — which is why RT-9 and `MY-RG-0005` can exist. The fix is DERIVED rather than declared: a registry mapping 48 documents to implementing code would be a second place to be wrong and a hand-maintained list (`MY-RG-0015`), whereas the paths a document actually names already *are* its contract's footprint, and a gate can read them. **DG23** does two things. (1) Every code path cited in canon must resolve (75 citations), unless the citation sits in a `planned`/`removed` window — the same `declared_future` rule `DG10` uses, so a plan may still name the modules it intends to create; seven unresolved citations exist and all seven are honestly marked. A canon↔code drift now fails at the citation, one step earlier than RT-9 was found. (2) Every document an organ declares as its `contract_docs` entry must name code, because a contract doc anchored to nothing can never be returned by `arch context <file>`. **Nineteen docs were in that state** (02, 10, 11, 14, 18, 20, 21, 22, 23, 24, 26, 29, 30, 31, 32, 33, 34, 37, 38 — the organ lists were the only link that existed for them) and each now carries a `> **Satisfied by:** …` line naming the module(s) it binds. The pay-off is the reverse index: `arch context <any code path>` prints the canon that names that path *and the token it uses*, derived from the same text the gate validates so the two cannot disagree, with no index to keep stale. For `src/core/engines/CCIEngine.ts` it returns `25` and `36`, neither of which appears in `kernel`'s `contract_docs`. **Limit measured, not assumed:** 36 of 48 documents name code; the residual 12 (`00`, `01`, `04`, `05`, `07`, `08`, `09`, `13`, `17`, `28`, `35`, `39`) are theory with no implementation to name, so the criterion is enforced on *contract* docs and not on all canon — demanding a citation from pure theory would manufacture fake edges. The fixture harness also gained multi-branch fixtures (`DG23` carries two, one per direction) and now reports per-injection, because one injection per gate proves one branch and silently vouches for the rest — `MY-RG-0010` one level up. `arch fixtures` 23/23 gates, 24 injections. |
| 2026-09-21 (same pass) | **The one-way migrations archived (`RT-ARCHIVE-MIGRATIONS` closed, red-team RT-11).** The three stage/path re-index tools moved from `scripts/` to **`scripts/migrations/`** with a README stating what each did, why it is kept executable, and why re-running is refused; their receipts moved beside them and were converted from `docs/.<tool>.applied` dotfiles to JSON under `scripts/migrations/receipts/` — as `docs/` dotfiles they were governance artefacts living inside the documentation set, invisible to every index and to DG1. The move was not free, and that was the finding: **DG20's coverage silently dropped from 16 scripts to 14** because the gate walked `scripts/` with a flat `iterdir()`. A new directory shape had left the gate — the scaffolder-vs-linter triangle the house has a name for, recurring one level down. DG20 now walks recursively (`rglob`, `__pycache__` excluded), which caught `scripts/cli/delegateArgs.ts` declaring no `@script-status` (it was invisible to the flat walk too); both are now gate-checked. The move itself was validated BY the gates: DG10/DG16/DG23 all failed on the stale `scripts/<tool>.py` citations across `44`, two records, two audits and the plan, and each citation was repaired to the new home rather than exempted. `arch fixtures` 23/23 (24 injections), tests 1175 green. |
| 2026-09-21 (same pass) | **Phase 10 BUILT — Generative World & Personalization.** All eight deliverables: world store complete in the organ (`src/core/world/`, facades retired, encounters moved), 1472-facet store compiled from the 64 module-specs with the authored facetAffinity matrix as the 46 §4 tag join, tag ontology with derived symmetric dialectic, evidence ledger + tier gate (`src/infra/profiles/evidenceLedger.ts`), ten-scaffold library with recorded selections, probe set (`probeSet.ts` — playable-encounter instruments, RV1–RV7 citation, log-only band for unvalidated instruments, declinable-without-trace, session budget), ScenarioContext envelope with `ROLE_SCOPES` enforcing 45 §6.1's blindness table by structural absence, engagement register gating on both tests. New module `src/core/personalization/` (udv, dialecticEngine with pair-keyed reconciliation states, composition with replay determinism, pooling with the §5.2.1 veto-as-routing rule and recorded deferrals, interestRecord with the load-bearing guard, scenarioContext, engagementRegister). Kernel gates **G22–G25** shipped in `runValidationSuite` (22 → 26): composition integrity over the live store, the tier gate (T3 discards under full evidence; partial RV ≠ citation), scaffold integrity (load-bearing domain never the structural pole), and the inference write firewall (module-graph assertion: no write surface outside the UDV projection). Tests 1186 → 1284. |
| 2026-09-21 (same pass) | **The quality model gained its runtime readers (`QUALITY-WIRING` closed, `MY-AD-0030`'s deferral discharged).** `StageQuality` was data with a test and no consumer — `agapeScan`/`erosScan` had no runtime caller and the per-quadrant pathology markers never reached doc 10's shadow model or the scheduler. Three readers, each at the seam it belongs to. **(1)** `buildDevelopmentalAgenda` computes AGENTS.md §5.3's BOTH vectors in one pure record — Eros (the threshold the centre of gravity is pulled across) and Agape (the lower altitudes' live pathology content) — and the ContextPipeline renders it as a Veil-safe `[DEVELOPMENTAL AGENDA]` prompt block, so catalyst aims at the player's actual work rather than at the encounter's nominal stage. **(2)** `generateFrequencySpec().lensRead` gives `RAY_LENS`'s previously-unread `rayFunction`/`subtleBody` (plus the emergent order) their consumer: the LLM now knows WHAT an altitude works, not only HOW to speak at it — also closing the unread-fields half of `MY-AD-0029`. **(3)** `buildShadowPromptSuffix` grounds shadow encounters in `pathologyIn(stage, LINE_QUADRANT[line])` — doc 10's shadow model now reads the ratified markers, selected through the *line's* AQAL quadrant. That discriminator matters and is tested: shadow quadrants and AQAL quadrants are different axes (`10 §12` — every shadow quadrant manifests across all four AQAL quadrants), and the first implementation conflated them; the type error caught it, which is what types are for. **Deliberately untouched:** assessment *scoring* — the wiring aims catalyst and conditions prompts; moving measurement belongs to Phase 10's personalization work (`45`), where the UDV is the sanctioned write path. `tests/core/domain/QualityWiring.test.ts` locks all three consumers at their own seams plus the Veil invariants (no scores, no AQAL codes in any rendered block). Tests: 1175 → 1186. |
| 2026-09-22 | **Runtime loop closed + authored seeding tier (`P13`/`P14`).** Phase 10's runtime half landed: the reporting feed as code (four idempotent writers, F3), the owner-worker pool (MY-AD-0009 consumer: ±0.3 caps, W4 replay, W5 concurrency), `OrchestrationServices` as the ONE orchestrator seam (envelope + holon digest + runtime coherence gate + session end on all five result paths; services omitted → byte-identical legacy), prompt blocks `[PERSONALIZATION]`/`[HOLON MEMORY]`/`[SCENARIO SEED]`/`[WORLD PLACE]`, and both surfaces (CLI + WebUI) carrying/persisting services. Then authored substance: 64 scenario seeds × 7 modality angles, 8 pole-probes (log-only until RV), 64 world seeds — library 1792 candidates, coherence enforced at authoring (G27, 26→27 gates) and at runtime (routes-don't-cancel), calibration harness extended to both seed tiers. `MY-AD-0009` deferral discharged with consumer; `_org.yaml → pending` graduated to `completed: P13/P14`; `AGENTS.md §4.2` and plan §2.1 corrected (the laws-without-consumer list fully discharged; the open frontier is configuration/calibration/development, owned by `AGENTS.md §4.2`). Tests: 1284 → 1370. GitLab push remains credential-blocked; GitHub current. |
| 2026-09-21 (same pass) | **One word, one axis (`VOCAB-SUBSTRATE` closed by user ruling).** The user ratified the proposal on the table: *substrate layer* now means ONLY the intra-holonic compositional vertical — `13`'s substrate→core→emergent stack, named by `44` axis E. The D3 bands (Free Will / Love / Light / the octave's contributions) are renamed **law-bands** across the four documents the key named: `02 §4` (table column + the term-scope note, which now records the retirement), `06`'s ownership pointer, `22`'s layer-stack law (`01.4 §2.5.3`'s "one concurrent lesser cycle per integrated band"), and `28`'s J-INV-7. The code constant followed: `SUBSTRATE_LAYER_LAW` → `LAW_BANDS_D3`, its `density` field → `band` (the rows were never densities — that misnomer was part of the collision). Two unrelated compounds stay: `06 §?`'s "energetic substrate (Ra)" (the ray's felt-tone vs energy-substrate distinction, not the vertical) and the "theoretical substrate" idiom (a metaphor, not a term of art). `MY-RG-0026`'s rule — one word never carries two frameworks — now holds on this axis, and DG23 verifies every citation touched by the rename still resolves. Tests 1186 green, 23 doc gates green. |
