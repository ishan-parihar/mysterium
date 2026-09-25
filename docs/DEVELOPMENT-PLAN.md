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

### Phase 11 — Closed-Loop Memory & Preference Intake (ratified + built 2026-09-22) — ✅ built

**Build record (2026-09-22, same day as ratification).** All eight deliverables landed:
D1 checkpoint restore with production callers in the CLI session loop (restore at boot,
capture after each encounter, save/load round trip — G28 proves save→load→save byte-identical
with worker pool + polarity map + feed replay across restart, W4); D2 feed readers (`feedReaders.ts`:
27 planning bias applied at `startSession`, committed-only accessor); D3 consented preference
intake (`grantDeclaredPreference`/`withdrawDeclaredPreference` in IdentityProfile, CLI intake +
privacy-dashboard display/withdrawal — G29); D4 ratification verdicts on every session
(G30); D5 polarity pair-state writers advancing under the saturation guard (rides the checkpoint);
D6 the probe RV harness (`probeValidation.ts` — RV-A known-answer, adversarial resistance,
below-stage discrimination over seeded personas); D7 64 authored NPC persona seeds (the triad's
third authored leg; envelope carries the persona voice; library 1792 → 2240); D8 tag tranche 2
(12 → 20 tags, 4 curated pairs added, all invariants hold). Tests 1370 → 1389; gates G28–G30.

Phase 10 closed the runtime loop but left its **memory half-life at one session** and its
**preference voice uncollected** (the C/K/D frontier of the operational audit). This phase closes
those gaps. Every deliverable wires or authors — no new architecture; each one has an owning law
that is already canon.

**Deliverables:**
1. **Checkpoint restore (audit C1; `22 §7.5` single-writer persistence).**
   `createOrchestrationServices` gains an optional restore input; the CLI session loop and
   `gameEngine.ts` rebuild `orchestrationWorkers` + feed from the persisted world save at session
   start (F3 replay makes restore exact). The `captureCheckpoint`/`restoreCheckpoint` API gains its
   production callers and a save→load→save round-trip test.
2. **Feed readers (audit C2; `43 §5.5` reader table).** Reader 1 — **27 (planning):**
   `generateSessionStrategy` consumes `progressDelta` + `forecast.deviation` from the feed when
   shaping the next session (ranking-as-bias; a feed with no entries behaves exactly as today).
   Reader 2 — **25 (CCI):** committed evidence only, asserted by test (F1's committed-not-observed
   becomes a checked edge, not a convention).
3. **Preference intake (audit C3; `16 §2.1` consent-bound identity + `45 §5.4` analogical
   resonance).** `collectIdentityConsent` extends with **declared interests and aversions** —
   consent-gated per field, all skippable, editable and deletable at the `privacy` dashboard
   (`47 §8` legibility: deletion removes the value AND the derived weight, and the deletion is not
   itself recorded). Both surfaces pass the identity projection into the orchestrator, so the UDV's
   declared band finally carries real content.
4. **Ratification loop (audit C4; `43 §5.5` writer 3 + L4).** The session loop records verdicts
   (`recordRatification`) after its ratification step, closing the fourth writer's live path —
   every proposal session now has a disposition on the feed.
5. **Polarity state writers (audit C5; `46 §5.3` pair states + `MY-AD-0031`).** Session end
   advances the dialectic pair-state map from the encounter's scored polarity direction
   (sto/sts/neutral → discovered/active-tension/reconciled transitions), under the saturation
   guard; the map rides the checkpoint and therefore persists.
6. **Probe RV harness (audit K1, first step; `12 §5.4` Phase RV-A pattern applied to preference
   instruments).** A validation harness over seeded personas: known-answer stability,
   adversarial-resistance, and below-stage discrimination fixtures for the 8 authored probes —
   making RV validation *runnable*. Probes stay log-only until real-rater thresholds are met; the
   harness is the instrument that will retire them from log-only.
7. **NPC persona seeds (audit D1; `46 §2` NPC library).** The third authored leg of the triad:
   64 canonical personas (name/role/voice/register per cell, module-spec provenance like the
   scenario and world tiers), registered as `npc-authored:` candidates and surfaced as a persona
   voice line in the envelope. Coverage asserted 64/64 at load; G27-extended coherence applies.
8. **Tag expansion, second tranche (audit D2; `46 §4` corpus change, bounded per `46 §13` res. 2).**
   Grow the vocabulary beyond the initial 12 with full axis positions and derived dialectic pairs
   (a tag without a resolvable opposite is a compile error); facet-affinity join re-compiled;
   calibration harness re-run to confirm discrimination actually improves.

**Gates:**
- **G28 — memory persistence.** Worker state + feed survive save→load→save byte-identical (W4
  replay across restart); no session start silently discards persisted orchestration state — the
  failure class is injected and proven caught.
- **G29 — the preference intake firewall.** A declared interest/aversion enters the UDV only
  through a consent-granted, purpose-scoped, withdrawable field; deletion removes value + derived
  weight; no declared preference ever becomes a field of record (`MY-RG-0021` class).
- **G30 — verdict completeness.** Every session whose proposals exist has a recorded verdict on
  the feed; raw signals never enter player state (F1 enforced end-to-end).
- The kernel suite unregressed throughout (27 gates, G1–G27 → 30).

**Duration:** ~2 weeks (deliverables 3, 7, 8 are content-adjacent; 1–5 are pure wiring).
**Depends:** nothing outstanding — Phase 10 is closed. **Post-phase (data-dependent, not
phase-able):** real-rater RV thresholds (K1 completion), `expansionRatio`/entropy calibration (K2),
per-line saturation curves (K3), pods deployment (D3, needs a hosting decision).

### Phase 12 — Semantic Memory Tier (ratified + built 2026-09-22, `MY-AD-0032` + `foundations/48`) — ✅ built

Phase 11 gives memory **persistence** (checkpoint restore) and **preference writers**. Phase 12
gives it a **standing object** and **relevance**: the player-level MemoryPage (48 §3) and the
MemoryRetriever seam (48 §4) — the two deterministic surfaces `MY-AD-0032` ratified, with the
retrieval firewall (48 §5) enforced from day one.

**Depends:** Phase 11 deliverable 1 (checkpoint restore) — the page is rebuilt from persisted
feed state, so a memory that dies at restart has nothing to stand on.

**Deliverables:**
1. **MemoryPage (48 §3).** Rebuilt at session end from committed deltas only — bounded
   trajectory prose, open threads with per-line provenance, holon stance mirrors — and read at
   session boot as the `[CONTINUITY]` head. Template prose (M1), hard budget (M2), provenance
   required (M3), banded language (M4), a view never a store (M5).
2. **LocalRetriever (48 §4, default).** BM25 (the `arch.py` tokenizer/field-weighting pattern)
   + recency weighting + graph edges, RRF-fused; always present, keyless, file-persisted.
   Serves library ranking enrichment (audit #8), cross-session thread recall, continuity
   time-slices.
3. **EmbeddingRetriever (48 §4, optional).** Pinned `all-MiniLM-L6-v2`, local-only via
   transformers.js/onnxruntime-node; provider absent → LocalRetriever floor (`MY-RG-0032`).
4. **Retrieval firewall enforcement (48 §5).** G31 lands with the surface, with injected
   fixtures: banded-only output, read-only recall, Veil-filtered text, per-player isolation.

**Gates:** G31 — retrieval firewall (48 §5, `MY-RG-0031`); `MY-RG-0032` pinning enforced at
provider construction; MemoryPage replay byte-identical (G28's law extended to the page).
Kernel suite 27 → 31.

**Duration:** ~1 week (all four deliverables are infra + one content voice). **Post-phase
(data-dependent):** embedding-index calibration against real corpora; MemoryPage prose-register
tuning per stage.

**Build record (2026-09-22).** All four deliverables landed: `memoryPage.ts` (M1–M5, the
`[CONTINUITY]` head, `auditMemoryPage` Veil-guard); `LocalRetriever.ts` (BM25 + recency + graph
edges, RRF-fused, deterministic, dependency-free); the pinned-embedding seam (`EMBEDDING_MODEL_PIN`,
hard construction error per `MY-RG-0032`) with `fuseRanks` degradation to the local floor; and
`retrievalFirewall.ts` (R1–R4, fail-closed per hit) enforced by G31 with injected fixtures.
`MY-AD-0032`'s deferral resolved to its built consumer; `_org.yaml → pending` emptied — P15
graduated to `completed` in the same commit as the build, as the ratification declared.

**Audit record (2026-09-22, `docs/audits/MEMORY-AUDIT-2026-09-22.md`).** The exhaustive
memory-infrastructure audit found the Phase-12 modules **in-vitro green but in-vivo dark** (zero
production callers) and closed the gap at the envelope seam — `buildEnvelope` now computes the
page and returns a Veil-filtered `continuity` field, rendered by ContextPipeline as
`[CROSS-SESSION MEMORY]`. Further fixes, each locked by a regression test in
`tests/personalization/MemoryAudit.test.ts`: thread closure follows the ratifying verdict (not an
age/skip heuristic); verdict prose pluralizes via a phrase table (no more "a step was takens");
render-path and recall-path Veil vocabularies held in tested lockstep (MY-RG-0031 class);
`captureCheckpoint` windows the feed at 2000 entries with the MemoryPage as the compaction layer
(LM-c); the retriever tokenizer is Unicode-aware + NFKD-folded (non-Latin interests became
retrievable). Infra: `vitest.config.ts` moved to `pool: 'forks'` — the `MigrateLegacySave`
flake was a cross-worker `process.env.HOME` race present on the pre-audit baseline (verified via
stash). Residual (declared in the audit §4): the `observedInterests` band does not yet reach
pooling (designed feature gap, needs evidence-ledger wiring); the embedding tier has no runtime
consumer (by design — the local floor is the default).


### Phase 13 — Live-Surface Wiring & Council Alignment (planned 2026-09-23) — ✅ COMPLETE: ALL deliverables d1–d12 BUILT (d3–d9 closed 2026-09-24)

**Build record (2026-09-23, d1+d2).** The two critical-path deliverables landed with gates G32/G33:

- **d1 — UDV band population.** New `personalization/bandSources.ts` assembles every remaining band
  from a real store: `purposesFromVows` (39's ACTIVE vows only — a fulfilled/lapsed vow is no longer
  an aim) + `purposesFromGoals` (the profile's self-declared goals, one aim band from two sources),
  `analogyFromInterests` (**derived at the seam** — this is what turns 45 §5.4's analogical
  resonance into a live ranking input, since `pooling.ts:69` already consumed it), `preferenceFromHistory`
  (median session tolerance — median, not mean, so one abandoned 2-minute session cannot redefine
  tolerance — normalized modality mix, declared intensity → appetite, metaphor taste → aesthetic
  leanings) and `observedFromEngagement` (weight→depth ladder, tagged `source: 'observed'`).
  `buildEnvelope` merges the caller's partial declaration OVER the feed-evidenced tolerance (the
  feed's own session durations are the in-seam source) and passes all five to `projectUdv`. The CLI
  supplies the vows, profile goals and profile preferences.
- **d2 — Council role scoping live.** `buildEnvelope` now returns `scopes` — all five 45 §6.1 roles,
  built by `scopeForRole` — plus `scopeContractViolations` (fail-closed check for hand-assembled
  scopes) and `assessmentScopeLine`, the live consumer: the assessment role receives its banded
  placement + the encounter's cell + the encounter's purpose, and **never** the interest graph,
  purpose statements or analogy internals. The orchestrator appends that line to its
  assessment-facing prompt section, so the metric-bearing role is structurally blind on the live
  path rather than by convention (42 §1.1).
- **Gates:** **G32** (five roles scoped at the live seam; declared bands exact; an injected
  undeclared band renders as NOTHING) and **G33** (five bands reach the live UDV; declared outranks
  observed for the same topic; empty input degrades to the ratified defaults). Kernel 31 → 33.
- **Tests:** `tests/personalization/Phase13Wiring.test.ts` (19). Suite 1401 → 1420.

**The differential criterion did NOT close — and the reason is the audit's most important finding
(W11).** The candidate library is 2240 over 448 cells: **exactly five per cell**, one per tier. A
cell-targeted pool therefore returns the same five refs for every player, so supplying purpose,
analogy or a declared interest leaves `context.pooled` byte-identical (measured). The bands are
wired and gated, but a retrieval key that orders a fixed five is not yet a retrieval key — content
selection is still decided by the encounter's cell. **d10 (candidate multiplicity per cell) is what
closes the criterion**, and the gap is locked in the test file so its closure is visible in CI.

Ratified by `docs/audits/WIRING-CONTRAST-AUDIT-2026-09-23.md`, which traced every ratified
personalization / memory / world surface to its production callers and found **nine architected
surfaces with no production caller** and a live UDV carrying **3 of its 8 declared bands**. Nothing
is broken — every dark surface fails quiet by the degradation law (`45 §5`), which is why the gap
went unnoticed — but personalization is shallower than the docs describe. This phase adds no new
architecture: it populates already-ratified bands, calls already-written functions at the seams they
were written for, and retires one redundant envelope builder.

**Deliverables** (full detail, evidence and ordering rationale in the audit §5):
1. **d1 — UDV band population** (`sessionRuntime`): purpose (identity `purposes`), analogy (fluent
domains from the interest graph), preference (modality mix / difficulty appetite / session
tolerance / aesthetic leanings), constraints (accessibility), `observedInterests` (evidence-ledger
`evaluate()`, precedence-guarded) — each degrading to its ratified default.
2. **d2 — Council role scoping live** (`45 §6.1`): the live envelope exposes `ScopedEnvelope` per
role via `scopeForRole`; `sessionRuntime` becomes canonical and the stubbed `envelopeRuntime` is
consolidated into it.
3. **d3 — Retrieval on the candidate path** (`48 §4`): ✅ **Built 2026-09-24.**
`retrievalShortlist.ts`: above `SHORTLIST_THRESHOLD` (500) the derived library is shortlisted by
`localRetrieve` (BM25+recency+graph RRF, top-256); below it enumeration stands bit-identically.
`recallGuard` re-checks shortlist text at the same seam (R1/R3 — the candidate-path site of the
recall firewall's law); both steps degrade to enumeration, never block. `pool()` runs
shortlist → recallGuard → constraint filter. Locked in `Phase13Closing.test.ts` (shortlist head
keeps the fluent candidates under a 600-candidate query; guard drops forbidden-vocabulary
candidates fail-closed).
4. **d4 — Composition telemetry at the runtime seam** (`46 §11`): ✅ **Built 2026-09-24.**
`services.telemetry` (`createCompositionTelemetry`) on `OrchestrationServices`; every
`buildEnvelope` records a `CompositionEvent` (cell + pooled scenario facet keys, bounded FIFO).
Monitors evaluate on demand; defect reports reach the dev loop only — never the player.
5. **d5 — Probes reachable + RV harness live** (`47 §7`): ✅ **Built 2026-09-24.**
`probeRuntime.ts`: `createProbeRuntime`/`nextOfferable`/`recordProbeChoice`/`declineOffer` on
`OrchestrationServices.probes` — budget-paced (`MAX_PROBES_PER_SESSION`), the validated/log-only
band split enforced at the seam (flag/evidence drift DEMOTES to log-only, fail-closed), readings
ride the checkpoint (`probeReadings` in `RuntimeCheckpoint`). `harnessReport` is the production
caller of `runProbeRvHarness` (previously a dead module); the harness still never flips
`rvPassed`.
6. **d6 — Engagement-register enforcement at the mechanism seam** (`45 §7.3`, `MY-RG-0017`).
✅ **Built 2026-09-24.** `poleDecision.ts`: every pole maps to its registered mechanism
(`poleMechanism`: familiar → `analogical-resonance`; unfamiliar/shadow-facing → `curiosity-gap`);
a pole whose mechanism is not both-tests-passed is refused — the decision degrades to the lawful
pole, or null when nothing is lawful. `setMechanismRegister` is the config surface (the default
shared register passes all 8 pre-registered mechanisms, so behavior is unchanged; the teeth are
structural).
7. **d7 — Composition engine status resolved** (`46 §6.1/§7`): ✅ **Built 2026-09-24 — ROUTED.**
`compositionRuntime.ts` runs `compose()` over the compiled facet store at service creation: one
Situation entity per (cell × modality) with a non-empty, aversion-free pull (canon-level poles:
the G22 shape — technology/nature + craft/music in active-tension), deterministic from the store,
joining the library as the `composed:` tier. Empty pulls compose nothing — degradation, never
fabrication. 46 §7 status-marked accordingly.
8. **d8 — Doc status marks**: ✅ **Done 2026-09-24.** No present-tense foundation claim left
unbacked: 48 §4's LocalRetriever status now reads LIVE on the candidate path (d3); 45 §7.3's
register status reads ENFORCED at the mechanism seam (d6); 46 §7's pipeline status reads ROUTED
(d7); 46 §11's telemetry row reads LIVE (d4); 47 §7's probe set gained its reachable/log-only
status (d5). The embedding tier remains honestly marked seam-only (no runtime consumer — a new
dependency requiring approval).
9. **d9 — Memory-audit carry-overs**: ✅ **Built 2026-09-24.**
   - **d9a** — `memoryPageBlock` render budget (`MAX_BLOCK_LINES=12`, `MAX_LINE_CHARS=300`,
     `MAX_BLOCK_CHARS=1400`): defensive caps independent of the M2 build budgets, so a
     pathological page (any MemoryPage-shaped input) can never bloat the system prompt.
     Property-locked in `Phase13Closing.test.ts`.
   - **d9b** — crash-sidecar session journal (`infra/persistence/sessionJournal.ts`): one
     append-only NDJSON line per checkpoint capture; `replayJournal` merges pending lines into
     the restored checkpoint at boot BEFORE the older world state wins (a pending line = a
     session that ended after the last saveAll), skips consumed lines (checkpoint newer), drops
     torn lines without retry (a torn write is not a session). Wired into the CLI boot + every
     checkpoint capture. `appendJournalEntry` never throws to the session (degradation law).
     NOTE: lives in `infra/persistence`, NOT `core/personalization` — G25 correctly failed the
     first placement (`fs.writeFileSync` inside the inference module graph is a write-surface
     escape); the module graph is the enforcement, not a promise.
   - **d9c** — firewall randomized property sweep: 2,000 randomized documents (mixed scopes,
     banded/raw flags, clean/forbidden texts) — zero leaks pass `filterRecall`, drops are
     non-zero, and the page/recall guard vocabulary is asserted in lockstep (MY-RG-0031 class).
10. **d10 — The Polarity Pool** (the audit's W11; the finding that makes personalization real).
**Reshaped 2026-09-24 by user ratification** — no longer a fixed-N authoring task; variants are
*derived* from the existing library through a similarity/opposition index, and the pool gains a
closing resolution loop. Four layers:

    **L1 — The similarity/opposition index (derived, never authored — MY-RG-0015).** Each item's
tags → a point in the tag-ontology's axis space (Eros↔Agape × Agency↔Communion,
`initialTags.ts`); `similar(item)` = tag-overlap + axis-proximity (deepens familiarity);
`opposite(item)` = the store's own `reflect`/`dialecticPair` geometry (`46 §4.2` — total and
symmetric by construction) (polarity challenge). Variant count is DYNAMIC: rich library texture
synthesizes more renderings; **G35 becomes a floor** (≥2 per cell: one familiar-capable, one
unfamiliar-capable), not a fixed N. Cross-cell synthesis: documented annex in `46`, deferred.

    **L2 — Familiar/unfamiliar polarity (the shadow upgrade).** Each encounter resolves a polarity
decision: the FAMILIAR pole renders in the player's fluent/interest domains (the hook); the
UNFAMILIAR pole faces the player's active shadow on the cell's line (Distortion Ledger
`quadrant/line/stage/severity`). Hard boundaries carried over: the aversion veto is never
overridden and never selected from (`45 §5.2.1`); unfamiliar ≠ aversive. **Dosage is
shadow-severity-scaled** — the unfamiliar pole becomes `noveltyBudget`'s first real consumer.

    **L3 — The resolution loop (NOT a binary verdict — the user's transmutation ruling).** A
polarity decision resolves as a **reading, not a toggle**: a scored position on the cell's
inclination/altitude/balance toward conscious/light vs unconscious/shadow, with a direction of
travel. The local System-1 layer (Laya-shaped decision model behind an interface) PROPOSES the
reading from the session log; the orchestrator RATIFIES or vetoes it (43's L4). Effects on
ratification: (a) approve strengthens the pair's hold toward `reconciled` — reached only by
*repeated* confirming readings, per `46 §4.3`'s falsifiable-state law ("a synthesis that later
fails re-opens"); (b) disapprove **re-opens the pair + increments shadow severity** on that
cell's line, so the next encounter's unfamiliar dosage scales up automatically — the loop
tightens; (c) every reading updates the profile through the background workers (S2/S5, already
dispatched by d12) — the process reveals the player's tendencies and feeds them back. **The cell
is never closed**: its infinite polarities are probed across orthogonal dimensions (the index's
opposite-walk), and profiling of a cell completes only when the read is robust (probe-coverage
gate, not a counter).

    **L4 — Selection + prompt surface (user-ratified).** Pooled refs gain `primary` + `pole`
(`familiar | unfamiliar | shadow-facing`) + named alternates; **top-1 primary reaches the
scenario-catalyst's prompt with the pole named; alternates stay hidden** (authorized reads and
audit telemetry only) — the calibration loop sees the polarity balance over time, the Veil
surface stays tight.

    **The System-1 layer (user-ratified: wire it).** Laya (convaiinnovations/laya, Apache-2.0,
421M non-autoregressive decision model: state + typed choice/score/yes-no questions → one
forward pass) is wired as the project's local System-1 classifier behind an interface with a
deterministic fallback: (i) tag resolution (`TopicTagResolver` at `buildQuery`), (ii)
polarity-reading proposal (L3), (iii) neighbor prefilter for the index walk. **Never** for
content authoring (that stays frontier-LLM + human-audited, 46 §8's provenance discipline) and
never as final authority (43's L4). RV-style validation decides whether Laya stays; the
interfaces stand regardless. Broader integration surfaces to be audited in build (candidate:
assessment item pre-scoring, journal reflection triage for A2, pod-transport message
classification).

    Closes the phase's differential criterion: swapping a UDV band must change WHICH rendering
the player meets, and a disapprove must measurably raise the next encounter's unfamiliar dosage.
Both assertions locked as tests before build.
11. **d11 — Bind the two councils + standing context** (`43 §4.2`/`§5.6`, `45 §6.1`;
`docs/audits/COUNCIL-ORTHOGONALITY-AUDIT-2026-09-24.md` §4–§6). ✅ **Built 2026-09-24.**
`AGENT_ROLE_COUNCIL` binds all 18 roles (S2/S5 explicitly to none; J1–J5 carry narrative-voice as a
secondary scope); `buildEnvelope` returns `scopes` per row plus `healing`; the **standing block**
([MY MANDATE]/[MY VIEW]/[MY BOUNDARIES]/[MY TOOLS]/[MY SESSION]) rides every delegation,
Veil-guarded line by line; `read_my_scope`/`read_band` are universal read tools with per-band
authorization and a recorded refusal (a refusal is information); `delegateSession` records the
binding + block on the session log.
12. **d12 — Build the dispatcher** (audit O10 — the largest operational gap: the council is a
fully-built workforce with no summoner in play). ✅ **Built 2026-09-24.** The trigger table
(audit §3) is `TRIGGER_TABLE` in `src/core/orchestration/dispatcher.ts` — table order = precedence,
crisis preempts everything (the only bypass), a threshold assembles the whole foreground council
with the Therapist first, S2/S5 are background on every dispatch, determinism is seed-invariant.
Live surface: `councilTools.ts` (`summon_council` / `schedule_presence` / `delegate_session`,
registered on the orchestrator's loop only when a CouncilIntegration is provided — byte-identical
without) + the CLI drill `mysterium delegate --summon --trigger <name>`.
13. **d10 — The Polarity Pool** (W11's closer; the four ratified layers). ✅ **Built 2026-09-24**
(same-day build after the reshape; commit `docs`-preceded, this record). Evidence per layer:

    **L1 — the index.** `personalization/polarityIndex.ts`: `axisCentroid`/`axisDistance` over the
    two canonical axes; `similarTags` (facet-affinity family first, then axis proximity);
    `oppositeTags` (the store's dialectic opposite first, then reflection neighbours);
    `deriveLibraryVariants` recolours every base candidate into a `~sim` (familiar-capable) and a
    `~opp` (unfamiliar-capable) variant — the cell is copied verbatim (variants never
    re-altitude), whole-library derivation is idempotent, and the library grows 2 240 → ~6 720
    with every cell ≥3 pairwise-distinct tag vectors. `createOrchestrationServices` builds the
    derived library.

    **L2 — the pole decision.** `personalization/poleDecision.ts`: `decidePole` resolves
    familiar/unfamiliar/shadow-facing per encounter. The rank is **fluent-overlap** (the UDV's
    actual lever) with axis-distance as the tiebreak; the familiar/unfamiliar split is the
    **shadow-severity-scaled share** (`unfamiliarShareFor`: seed budget below the 0.2 dormancy
    threshold, linear rise above it, hard ceiling 0.6); the draw is a deterministic hash of the
    encounter target (replay-safe dosage; the seed reorders, never chooses); the aversion veto is
    untouched and never selected from. Live in `buildEnvelope` — the pole rides the envelope.

    **L3 — the resolution loop.** `personalization/polarityResolution.ts`: the READING (position
    + direction + confidence + evidence citations, never a toggle); the `System1Reader`
    interface (Laya-shaped propose-only; the deterministic fallback derives from pair-hold
    quality); `applyReading` with the bounded effects — unratified (L4) and below-floor-confidence
    readings move nothing; confirmations accumulate (`CONFIRMATIONS_TO_RECONCILE = 3`) before a
    pair reaches `reconciled`; a disconfirming reading re-opens it and increments shadow severity
    (the dosage tightens); `polarityCoverage` is the cell-never-closed judgment (≥3 orthogonal
    dimensions AND ≥6 readings — a counter never closes a cell). Wired at session end: the
    orchestrator builds the `EncounterRecord` from the encounter outcome, `sessionEnd` captures
    the reading always and applies it only when the caller ratified; readings/tallies ride the
    checkpoint.

    **L4 — the surface.** `PooledSelection` on the envelope (primary + pole + hidden alternates
    + reason); `polarityPromptLine` renders the ONE prompt line (top-1 primary + named pole,
    alternates never); scoped envelopes carry the pole NAME only; `PersonalizationBlock` gains
    `pole`. The orchestrator threads the `[POLARITY]` line into the prompt context.

    **The kernel discovery the build surfaced:** `rankByRelevance`'s raw tag-sum rewarded broad
    vectors over exact-flavour ones, which would have silently re-flattened the derived library.
    The rank is now NORMALIZED (weighted term mass as a fraction of the vector + a small breadth
    prior) — without this, d10's multiplicity would have been structurally inert even with the
    index in place. Recorded as a plan-level lesson: a derived library requires a scale-free
    rank, or multiplicity re-collapses into breadth.

    **G35** (`validatePolarityPool`) holds all of it: the per-cell floor + idempotency + no
    altitude drift; the dosage law (dormancy, ceiling, severity-monotonicity); the spiral (no
    single sweep; re-open + severity on failure; unratified/low-confidence inert); the rubric
    audit detecting evidence-less readings and out-of-bounds severity deltas; coverage open by
    default; and the kernel-level differential (a UDV fluent-domain swap reorders the pool).

**Gates:** **G32** role scope enforced at the live seam (injected violation fails closed;
extended 2026-09-24 with binding totality + standing-block completeness + read authorization);
**G33** UDV band population + consent firewall (declared precedence, withdrawal removes the band,
silent degradation); **G34** council dispatch (table coherence + reachability, crisis precedence,
single bypass, threshold assembles the foreground council, determinism, no band-less role
summoned) + the engagement-mechanism fail-closed check; **G35** the polarity pool (the derived
per-cell floor, the dosage law, the spiral, the rubric audit, the differential); **G31 extended**
with production recall traffic. Kernel suite 31 → **35**. Battery at completion: **1 483 tests**,
0 build errors, 23 doc gates, lint clean.

**Success criterion:** swapping a single UDV band measurably changes which candidates pool and what
each council role receives (differential test), proving the personalization stack is load-bearing
rather than merely present.

**Duration:** ~2 weeks. **Depends:** nothing outstanding — Phases 11–12 are built; d1→d2 is the
critical path.

### Phase 14 — Checked-Surface Closure & Operationally-Live Modes (planned 2026-09-24)

**Why this phase exists.** The `CHECKED-SURFACE-AUDIT-2026-09-24` swept every production entry
point for whether it sits inside the *checked graph* — the files `tsc --noEmit`, the tests, the
kernel gates and the linter actually read. It found that **`scripts/**` does not**: the CLI, a
documented ✅-implemented surface, was **non-bootable** (a JSON rename on 2026-09-21 left two
imports pointing at the pre-move path) and carried **69 type errors**, none of which any gate,
test, build or lint step could see. With the CLI restored, driving it surfaced the deeper finding:
**the default and every headless/JSON invocation bypass the entire orchestration / personalization
/ memory architecture** (`runDirectQuestioningSession` creates no `OrchestrationServices`, passes
none to the encounter, captures no checkpoint and appends no journal). The green battery was real
but *partial*, and the live architecture had no automated exerciser at all.

**Ratified 2026-09-24 by user decision:** fix the P0 break immediately, then execute the full
closure · **split the CLI while fixing** · **approve Laya** and wire the real System-1 adapter ·
**do K1 first** (the probe-validation protocol).

**Ratified 2026-09-24 (second round — the F2 disposition and K1's scope):**

- **Wire Direct Questioning into the architecture.** DQ ceases to be an engine-bypassing path:
  it creates and passes `OrchestrationServices`, captures the checkpoint and appends the journal.
  The user's framing: **the headless mode exists so AI agents can test and debug everything**, and
  **the CLI is the primary interface at this stage** — the WebUI is a later phase, after the CLI is
  finalised. So a dark surface is not acceptable anywhere an agent may drive: every mode an agent
  can invoke must exercise the real loop, and anything an agent cannot reach is a blind spot by
  construction.
- **K1 = instrumentation plus a synthetic pilot.** The protocol's executable half (rater-facing
  administration, known-answer / adversarial / below-stage statistics, agreement thresholds, the
  band-flip retirement condition) lands first, then a pilot over scripted personas establishes
  **provisional** thresholds, clearly labelled until real raters confirm them.

**Ratified 2026-09-24 (third round — the post-P0 error census, `CHECKED-SURFACE-AUDIT-2026-09-24`
§10):** with `scripts/**` finally type-checked, the 63 surviving errors triaged into **three tiers,
not one** — two `ReferenceError`s that make the story branch unable to dispatch an encounter (T1),
eight sites that **silently falsify** user-facing output on the default path (drive health pinned to
0.5; "1 aspect explored" always; the vow-fulfilment message never printing) (T2), and 53
type-shape-only (T3). The census also surfaced a semantic defect no count would show: **the retired
stage `White` is still live in four CLI ladders and the invariant checker** (F5), and the canonical
ladder is re-declared in ≥18 modules (F6). d2 therefore split into **d2a/d2b/d2c**, and G37 gained a
second assertion. **Direction of repair (Q9) and the inspection order (d2b before d2a) are the two
forks put to the user.**

**Deliverables:**
1. **d1 — Restore the CLI (P0).** ✅ **BUILT 2026-09-24.** Repointed the two holon-JSON imports at
   `src/core/world/data/` (WORLD-STORE-MOVE missed this consumer); destructured `declineVow` from
   `src/core/practice/VowService.ts` (the vow-decline path threw `ReferenceError`); dropped the
   `responsesPool` reference (branch retired); retired `scripts/tdg-probe.ts` (its module
   `src/infra/tdg/TDGClient` no longer exists); added `src/core/world/data/` to `package.json`
   `files` (the shipped CLI reads world data at runtime — the pre-rename path would have published
   a CLI that cannot start). **Verified:** headless session exit 0 · `npm run build:cli` success ·
   bundled `node dist/cli/cli-game.js --version` → 0.1.0 · bundled headless exit 0.
2. **d2 — Bring `scripts/**` into the checked graph.** Ratified as three sub-deliverables so the
   `include` change and the fixes land in **one commit** (the build is never red in history).
   **d2a ✅ BUILT 2026-09-24 (63 → 0 errors) · d2b ✅ BUILT 2026-09-24 (the retired ladder purged)
   — full change list and verification table in `CHECKED-SURFACE-AUDIT-2026-09-24` §11. d2c
   (single-source the canonical ladder) remains.**
   - **d2a — retire the census.** Add `scripts/**` to tsconfig's `include`, then retire all 63
     remaining errors (`CHECKED-SURFACE-AUDIT-2026-09-24` §10.1): 24 dead declarations, 7 arity,
     9 argument-type, 19 property/assignment/shape, 4 other. `scripts/cli-game.ts` carries 60.
     The T1 and T2 tiers are **correctness** fixes, not type fixes:
     - **T1 (2 sites):** `responsesPool` (v3644) and `telemetry` (v3818) are bare names with no value
       in scope — `ReferenceError`s inside `runFullSession`. The v3644 one is inside a `try`, so
       **the story branch cannot dispatch an encounter**: it degrades where it should run.
     - **T2 (8 sites):** `driveWeights.agency|communion|eros|agape` → `undefined ?? 0` → **every
       drive-health score is exactly 0.5 regardless of the drives**, on the **default DQ profile
       path**; `ConsequenceRecord.line` ×3 → the post-session summary **always reports "1 aspect
       explored"**; `vowFulfilled` → the fulfilment message never prints. These silently falsify
       user-facing output — the failure class the Veil-compliant design makes hardest to notice.
     - **T3 (53 sites):** type-shape only (dead declarations, unsafe casts, union mismatches).
   - **d2b — purge the retired stage ladder from `scripts/**` (F5, §10.3).** `'White'` was retired
     canonically (`GreaterCycleEngine.ts`: *"There is no D4 stage in Mysterium"*); the retirement
     reached `src/` and missed `scripts/`, so four CLI ladders and `check-invariants.ts` still use
     `Infrared…Green, Turquoise, White` — **dropping `Teal` and appending a stage that does not
     exist**. Calibration can never report `Teal`; its highest-detected-stage comparison orders
     against a phantom. Pending **Q7/Q8** (where `White`'s marker content relocates, and whether
     `Teal`'s absence is accidental).
   - **d2c — make the ladder single-source (F6, §10.4). ✅ BUILT 2026-09-24.** `domain/Stage.ts`
     already exported `ALL_STAGES` + `stageOrdinal()`, yet the literal was re-declared across the
     tree. **25 sites** were rebuilt from the owner, found by making G37's scan the enumeration
     rather than grepping for a stage name: the stage ladder (5), the line set (9), the drive set
     (7), the modality set (3), plus four JSON-schema `enum:` lists now spread from `ALL_LINES`.
     `SESSION_MODES` moved to `src/core/domain/SessionMode.ts` (the flag, the prompt, the branch and
     G36 now read one list) and a shadowing `const { ALL_LINES } = await import(...)` in the CLI —
     the M8 defect class — is gone. Only two documented exemptions remain (`udv.ts`'s
     forbidden-token denylist, which is a *superset* vocabulary including the ray markers, and
     `scenarioSeedVariants.ts`'s authored per-modality table); G37 holds both.
3. **d3 — Split `scripts/cli-game.ts` (user-ratified: split while fixing). ✅ BUILT 2026-09-24.**
   Landed as Q10's calibration extraction plus four stages, in dependency order so no cycle could
   form: **A** `scripts/cli/{config,data,render}.ts` (the pure helpers, now unit-tested by
   `tests/cli/RenderHelpers.test.ts` — the first CLI unit test in the repo) · **B** `flags.ts` (the
   parsed invocation state behind setters, with the `VERBOSE` derivation computed once instead of
   at every reader) · **C** `output.ts` (the flag-READING printers, separated from the pure half) ·
   **D** `support.ts` · `onboarding.ts` · `profileCmd.ts` · `practiceCmd.ts` · `delegateCmd.ts` ·
   `runtime.ts` (the commands and the two session flows). The entry is **775 lines** (commander
   chain, start-up, `main()`); `scripts/cli/` is 5 531 lines across 11 modules. Full record,
   including the four intentional deltas the losslessness check found (`opts.audit`/`opts.llm`/
   `llmComplete` were start-up values read outside the flags owner — three flows reaching back into
   `program.opts()` mid-session), in `MODULE-COHESION-AUDIT-2026-09-24` §4.
4. **d4 — Wire Direct Questioning into the architecture (the F2 fix; user-ratified).
   ✅ BUILT 2026-09-24.** `runDirectQuestioningSession` now takes the `OrchestrationServices` its
   caller already holds (`runFullSession` creates them for either flow), passes them to
   `executeEncounter`, and at its save site writes `captureCheckpoint` onto the world **and** appends
   the sidecar journal — the same two writes the story branch makes. **Verified live:** a headless
   `--mode=direct` session now leaves `orchestrationCheckpoint` in `world.json`/`save-all.json` and
   one line in `session-journal.ndjson`; before this, a completed DQ session left neither, so every
   reader (planning bias, CCI projections, retrieval) saw a fresh feed on the next boot. Missing
   services still degrade lawfully (the `sessionRuntime` seam), so the pre-personalization behaviour
   is the fallback rather than a crash. Rationale (user): **headless is the surface agents test and
   debug everything through**, so every agent-reachable mode must exercise the real loop; the CLI is
   the primary interface until the WebUI phase, which comes after the CLI is finalised.
   **Extended by F10 (§11): the mode must be selectable without a TTY.** `--agent` was removed
   (YAGNI-EFF-3) and the mode prompt is skipped under `--headless`/`--json`, so `gameMode` was
   hardcoded to `'direct'` and **the story branch — the architecture-live path — was unreachable by
   any agent**, which is how both T1 defects survived. A `--mode <direct|story>` flag (validated
   against one canonical `SESSION_MODES` list, shared by the flag, the prompt and the branch test)
   landed with d2a. Every agent-reachable surface must remain drivable this way.
   **Extended by the third sweep (§10.2 T1):** the repair is *two-sided*. The checkpoint capture
   (v3655) and `appendJournalEntry` (v3663) sit inside `runFullSession`'s **story branch** — the
   same branch whose encounter dispatch throws and is caught. So the architecture-live mode is not
   merely non-default, it is **broken**: d4 must (a) fix the story branch's dispatch so the loop
   runs, and (b) carry the checkpoint/journal capture onto the DQ return path, so *both* modes
   persist. `G36` must therefore smoke **both** modes, and `G28` must assert the checkpoint on
   both.
5. **d5 — The class-level gates (so this cannot recur). ✅ BUILT 2026-09-24.**
   - **G36 `cli boot`**: boots **every member of `SESSION_MODES`** headless against a throwaway
     `MYSTERIUM_HOME` and requires exit 0, a `session_ended` event on stdout, **and a persisted
     `orchestrationCheckpoint`** — the third assertion is what makes "architecture-live" a gate
     rather than a claim, and it is why d4 had to land in the same pass. To make the throwaway root
     possible at all, `MYSTERIUM_HOME` now redirects the state dir (`mysteriumDir.ts`, single
     source — `ProfileManager` and the CLI both read it instead of `os.homedir()`).
   - **G37 `checked graph`**: assertion 1 — every production `.ts` under `src/`/`scripts/` matches a
     `tsconfig.json` `include` pattern (parsed through a tiny JSONC reader, so it reads the REAL
     config rather than a copy); assertion 2 — no module outside an owner rebuilds a complete
     canonical set (stages/lines/drives/modalities), with a documented exemption registry.
   - **`tests/cli/CliMatrix.test.ts`**: the subcommand matrix — version against `package.json`, the
     full `--help` command surface, the read-only subcommands answering parseable JSON, rejection of
     an unknown command, and that `status` reports the redirected state root. A stray first token
     now reports `unknown command 'x'` instead of commander's `too many arguments`.
6. **d6 — The System-1 adapter (Laya, user-approved). ✅ BUILT 2026-09-24.** The three ratified
   surfaces are behind ONE port (`core/personalization/system1Port.ts`): tag resolution at the
   query-build seam, polarity-reading proposal, neighbour prefilter for the index walk. The three
   boundaries of `43 §2` are structural rather than promised — the core never imports the adapter
   (a gate asserts the DIRECTION of dependence), the adapter has no persistence verb so it cannot
   author, and every operation is total-fallback (a throw, a `null`, or an out-of-vocabulary value
   degrades to the deterministic implementation, including when the *fallback itself* throws). The
   vocabulary guard DROPS an invented tag instead of forwarding it — a model that can widen the
   ontology can author canon. Survival is decided by `evaluateSystem1Agreement` over a held-out set
   the deterministic path already answers, and an **unmeasured** model is not kept: an unmeasured
   dimension is not a passed one. `src/infra/llm/LayaSystem1Adapter.ts` is the reference
   implementation — a bounded json-in/json-out call per operation, never throwing, caching per
   adapter so a model answer can inform the NEXT decision rather than change the one in flight.
7. **d7 — K1 first: the probe-validation protocol (user-ratified: instrumentation + synthetic
   pilot). ✅ BUILT 2026-09-24.** Three modules by responsibility: `probeValidation.ts` (the
   synthetic harness), `probeRaterCohort.ts` (what only real raters supply), `probeThresholds.ts`
   (the decision). **RV1 reliability** is measured over rater PAIRS — a majority can be unanimous in
   error — but *within* a known-answer condition and reduced to the weakest; the first version
   pooled the archetype mix into the instrument and rated a conforming cohort at 0.33, which the
   module doc records. **RV3** scores a known answer only when the archetype is a pole belonging to
   that probe. Verdicts keep **`insufficient` distinct from `fail`** — a probe nobody administered is
   unknown, not bad, and collapsing the two is how a thin cohort validates an instrument. **RV7**
   retires an instrument whose live *validated* readings stopped agreeing with its validated pole; a
   log-only reading cannot drift a field it never seeded. The **synthetic pilot**
   (`scripts/probe-pilot.ts`, read-only `probe` class) calibrates `PILOT_THRESHOLDS` and labels them
   `provisional-synthetic-pilot`: it can reject an instrument, never certify one, and never writes
   `rvPassed`. Real-rater thresholds and ≥ 5 distinct raters remain the certification condition.

**Progress 2026-09-24:** **d1 ✅ · d2a ✅ · d2b ✅ · d2c ✅ · d3 ✅ · d4 ✅ · d5 ✅ · d6 ✅ · d7 ✅ —
Phase 14 is COMPLETE.** **d3** landed in two parts, both ratified: the calibration extraction (Q10's
ruling — `InitialAltitudeInference` + `QuickCalibrationScoring` into `src/core/usecases/`, so
calibration is engine code rather than a presentation-layer ladder) and the four-stage CLI split
(A `config`/`data`/`render` → B `flags` → C `output` → D `support`/`onboarding`/`profileCmd`/
`practiceCmd`/`delegateCmd`/`runtime`), moving **5 770 → 775 lines** in the entry and leaving
`scripts/cli/` as 11 single-responsibility modules. The split was checked for losslessness
against the pre-stage file at every stage (the check that caught a deleted `async function` and a
mis-scoped import, neither of which `tsc` can see), and `G36` — boot both `SESSION_MODES` headless
and require a persisted checkpoint — is its regression lock. The module-cohesion audit's eight-item
backlog is therefore **all closed** (`MODULE-COHESION-AUDIT-2026-09-24` §4). Kernel gates
**38** (G36/G37/G38 added; `tests/validation/Benchmark.test.ts` asserts the literal count).

**Gates:** **G36** CLI boot smoke · **G37** checked-graph assertion · **G38** System-1 boundary ·
**G31/G28 extended** to the
DQ/headless path once d4 lands (the memory loop is exercised on the default surface, not only
in-process).

**Success criterion:** every production entry point is inside the checked graph; the CLI's
subcommand matrix passes in CI; a headless session writes a checkpoint and a journal line; the
System-1 seams degrade deterministically when the model is absent.

### Phase 15 — The Simulated Cohort: long-horizon calibration through the live seam (RATIFIED 2026-09-24)

> **Status.** Proposed from a tree-verified finding on 2026-09-24 and **ratified the same day**: the
> spine is this phase (not WebUI parity, corpus depth or hosting); **F7** is fixed by declaring the
> fields on `ConsequenceRecord` and wiring the writer (not by retiring them); and the build proceeds
> **hermetic-first** — d1–d5 on the deterministic stub tier to green `G39`/`G40`, with cohort scale
> and the real-provider experiential run decided afterwards on the hermetic results. The three
> rulings are recorded at the end of this entry; `AGENTS.md §4.2` carries the state.

**Why this phase exists.** Every dev phase through 14 built *architecture*; what has never run is a
**long-horizon campaign through the live seam**. Verified against the tree 2026-09-24:

- `createOrchestrationServices` has exactly **two production callers** — the CLI
  (`scripts/cli/runtime.ts`, `scripts/cli/delegateCmd.ts`) and `src/lib/engine/gameEngine.ts`
  (WebUI).
- `src/core/validation/harness.ts`'s `runPersonaTrajectory` drives the **kernel** directly
  (`tickWithStrategy` → `processOutcome` → `applyConsequences` → `applyResponseOnly` → `endSession`)
  with no services, so no envelope is built, no personalization band is read, no checkpoint is
  captured, no journal is appended, and no council is ever dispatched.
- The 10 kernel personas declare **2–6 session** trajectories of 5–6 encounters; the longest
  "campaign" in the repo is four sessions long.

So `G22`–`G35` exercise the personalization and memory stacks in **isolated gate fixtures**, and
`G36` boots the CLI **once** and requires a checkpoint. Nothing runs *many sessions, over
trajectory time, through the live seam* — which is exactly the regime the architecture's central
claims are about: that the UDV adapts to a specific person, that the Polarity Pool renders
differently for different players (`G35`'s differential is kernel-level, not cohort-level), that
theta-decay and transformation fire on schedule across sessions, that composition does not
**collapse** into the same twenty textures (`46 §11`'s visibility-collapse countermeasure is
monitored, never *observed*), and that NPC/world memory accumulates without leaking.

Consequence: the calibration list in `AGENTS.md §4.2` is blocked on "real play data" that does not
exist yet, and the largest untested surface in the project is **the lived experience of the loop**.
The user's own ruling from Phase 14 settles the method: *the headless mode exists so agents can test
and debug everything*, and *a dark surface is not acceptable anywhere an agent may drive*. The play
data this project needs is therefore **generatable by its own agents**, and generating it is the
cheapest honest way to reach the calibration frontier — cheaper and more truthful than waiting for
human players to arrive before the system can be evaluated.

**Deliverables.**

0. **d0 — clear the two carried findings first** (`CHECKED-SURFACE-AUDIT-2026-09-24` §11): **F7** —
   `PlayerResponse.writeInValue`/`questionText` are populated by the orchestrator and **dropped by
   `processOutcome`**. This is a prerequisite rather than a tidy-up, because a campaign's richest
   evidence for the reflective/immersion modalities *is* the free-text answer; a cohort harness that
   cannot see it would calibrate reflective depth against nothing. **F9** — the facet compiler's
   quadrant aliasing (§2 Shadow-Archetype heading normalisation) is unwired; wire it with the
   extraction that consumes it, or delete the claim. **BUILT** — both closed, F7 wired per ruling
   F-1 and F9's claim deleted (the fail-closed all-4-quadrants check is the enforcement). The build
   also found that `_lastQuestionText` held the composed *prompt* rather than the question, and that
   the log rendered a bare `**Question:**` label with its content on the next line; both fixed, the
   log contract locked by `tests/infra/EncounterLog.test.ts`. See the ledger entry.
1. **d1 — The campaign runner** (new modules, planned: a campaign runner under
   `src/core/simulation/` plus `scripts/cohort-run.ts` (planned, `@script-status: wired`)). One
   persona, N sessions, over a **virtual clock** (the harness's
   `BENCH_EPOCH`/`gapDays` precedent), driving the **live seam**: services created for the persona,
   encounters executed through the same entry the CLI uses, and between sessions the checkpoint
   **persisted and restored through a throwaway `MYSTERIUM_HOME`** (d4's `mysteriumDir.ts` makes
   this hermetic). Restore fidelity therefore stops being a one-shot gate and becomes a per-session
   property. Writes only under the throwaway root; never touches the tree. **BUILT** —
   `src/core/simulation/campaign.ts` + `scripts/cohort-run.ts` (`npm run cohort`). To make "the same
   entry the CLI uses" true *by construction* rather than by discipline, the orchestrator
   construction and the response derivation were extracted to `usecases/EncounterSession.ts`
   (`buildEncounterOrchestrator` / `responseFromRecord`) and the CLI now delegates to them — the
   campaign runner is the second caller that made the extraction honest.

   **The build found the F7 gap was three times larger than reported.** `writeInValue`/`questionText`
   were populated on the LLM tool path *only*. The path every production encounter takes —
   `runFallback` delegating to `runModuleAssessment` whenever a module is present, which is always —
   read the answer into a local and set neither field, and the simple-fallback path set neither
   either. All three sites now assign, unconditionally, so an encounter with no write-in clears the
   previous one instead of reporting an earlier encounter's words as its own. Two further defects
   surfaced in the same pass: the module path had no way to report the question it asked (the
   renderer composes it), so `presentedQuestionText()` joins the presenter's existing
   `rendererEvaluate`/`taskStartTime` wire-backs; and the checkpoint was being written once per
   ENCOUNTER under a per-session filename, so every write but the last was work whose result was
   never read.

   **First calibration finding (for d3/d4), recorded rather than fixed:** across a 3-session ×
   4-encounter run the *drive* observables are IDENTICAL for every persona — `driveWeights` moves
   (0.04 → 0.08 → 0.12) but `driveFixation` is 0 for all four drives and `shadowsSurfaced` is 0 for
   all personas, including `golden-bypass` and `constricted`, which are authored to accumulate
   exactly that. The personas DO separate on `cci` (0.407 / 0.492 / 0.499) and on write-in count, so
   the stance reaches the engine; the drive/shadow channels do not move. That is the T2 pattern from
   Phase 14 d2a — a pinned number reads as a flat curve, not as a bug — and it is precisely what the
   campaign existed to make visible.
2. **d2 — The cohort** (planned module: a cohort generator beside the campaign runner). The 10 curated personas stay as the
   *named* cases; a generator derives **synthetic personas from declared dimensions** — altitude
   vector per line, drive balance, dominant shadow quadrant, response policy, cadence (sessions per
   virtual week), neglect pattern (which lines go untouched, to exercise theta-decay) — so the
   cohort is a *parameter space*, not a list, and a single dimension can be varied to test one claim.
   Target: the curated 10 plus ≥ 40 generated, seeded and reproducible. **BUILT** —
   `src/core/simulation/cohort.ts` (+ `--generate N --seed S --axis dim:value` on `cohort-run`).
   Every member is reproducible from `(seed, index)` — the derivation is per-member, not a shared
   random stream, so the first 10 of a 40-member cohort are the same 10 in a 10-member cohort; a
   sub-sample would otherwise be a different population from the one a gate certified. The axis
   override holds ONE dimension while the rest still vary, which is what makes a sweep a controlled
   comparison. `neglectLines` is decided per ENCOUNTER (the scheduler owns line choice, so a persona
   cannot decline to be offered a line — it declines the offer, which is the engine's avoidance path
   and what theta-decay needs to see). Two axes (`currentStage`, `driveTilt`) are reportable but not
   directly settable — they are compositions of `altitudes`, so pinning them would pin a derivation
   rather than a dimension; `--axis` rejects them loudly instead of ignoring them. **Refinement to
   the d1 finding:** the generator immediately showed shadows SUCCEEDING to accumulate for some
   configurations (`gen-7-2` surfaced 2 over 2 encounters), so the flat `shadowsSurfaced` is
   persona-specific rather than systemic; `driveFixation` is 0 across every configuration seen so
   far, which keeps it as d4's first target.3. **d3 — The campaign time-series** (planned module: campaign observables, distinct from
   the kernel's `src/core/validation/observables.ts`). **BUILT** — `src/core/simulation/campaignSeries.ts`
   (+ `OrchestratorResult.composition`, the provenance stamp). The kernel's `Observables` is REUSED as
   one field rather than duplicated: merging the two would force a kernel gate to import the seam,
   which is the coupling `G2` exists to prevent. The **producer rule** is enforced structurally —
   fields with no runtime producer are named in `UNAVAILABLE_OBSERVABLES` with the reason and OMITTED
   from the row (`memoryPageSize`, `renderBudget`, `engagementRegisterHits`), because a fabricated `0`
   is indistinguishable from a measured one. Candidate provenance is DECODED from the pool's own id
   vocabulary (`candidateSource()`), so the series reports the pool's actual decision instead of a
   second opinion formed at the report site.

   **The series found the seam gap on its first run, and it is the largest finding of the phase.**
   `personalizationContext()` — the one function that selects the pole, runs the pool, records
   composition telemetry, stashes `lastPoleServed`/`lastPairKey` and gathers the continuity material —
   was called from `run()` and `runLanguageReflective` ONLY. Both are LLM-prompt-assembly paths. The
   **module-assessment path** (`runFallback` → `runModuleAssessment`, which is what runs when no LLM is
   configured or the call fails, and what the hermetic tier runs) never called it. Measured before the
   fix: `candidateSourceShare: {unknown: 1}`, `compositionEvents: 0`, `composedCells: 0`,
   `polarityReadings: 0`. So on the fallback path the pool never selected, `46 §11`'s monitors read an
   empty window, the coverage query had no input *ever*, and no scenario seed, world place, persona
   voice or continuity line was gathered. This is Phase 13's failure class (*a consumer no live seam
   calls*) inside a single method's branch — and the reason the campaign exists: a gate that calls
   `buildEnvelope` directly cannot see that the orchestrator does not. Fixed by calling it on that
   path too (the block is discarded, since nothing assembles a prompt there; the SELECTIONS are
   decisions about what the encounter serves, not prompt decoration). Measured after: provenance
   resolves (`npc` / `composed` / `recoloured-similar`), poles resolve (`familiar` / `unfamiliar`),
   `compositionEvents` 3–4, `composedCells` 2–3, `minCellEntropy` 1.099 against the 0.5 floor.

   Per session, the
   observables the architecture actually claims: CCI and its components; per-line altitude/theta;
   the drive-health vector (the T2 defect of Phase 14 d2a is the cautionary tale — a pinned number
   looks like a flat curve, not a bug); shadow-quadrant accumulation; polarity readings/tallies and
   familiar/unfamiliar shares; council dispatches by trigger; encounter provenance
   (cell × modality × tier × pole × candidate source: base/similar/opposite/composed);
   **composition entropy per cell**; MemoryPage size and render budget; probe offers and verdicts;
   engagement-register hits. Emitted as one NDJSON row per session per persona — analysable by
   `jq`, diffable between runs.
4. **d4 — The calibration pass** (planned read-only script, `@script-status: probe` — exits
   non-zero on failure, never mutates the tree). Reads the campaign corpus and
   produces the numbers the calibration list is waiting for: `expansionRatio`, the composition
   entropy floor, per-line saturation thresholds, the MemoryPage budget from the *observed*
   distribution, and provisional probe thresholds over the synthetic rater cohort — every output
   labelled **`provisional-simulated-cohort`**, in the same discipline as `probe-pilot.ts`: it may
   reject, it may never certify, and it never writes `rvPassed`. Real raters remain the only
   certification path. **BUILT** — `src/core/simulation/calibration.ts` + `scripts/cohort-calibrate.ts`.
   Every threshold is IMPORTED from its owning module (`ENTROPY_FLOOR`, `MIN_COMPOSITIONS`,
   `EXPANSION_RATIO_FLOOR`) rather than restated, so an engine threshold change reaches the report
   instead of leaving it comparing confidently against a number nothing uses. A measurement with too
   few samples reports **`insufficient-data`**, not `above-floor`: the composition verdict requires
   `MIN_COMPOSITIONS` per cell, which is exactly the noise floor the monitor defines.

   **The pass's first run REJECTED on a measured defect — its purpose working.** Over 13 campaigns /
   26 sessions / 78 encounters: the unfamiliar-pole share is **19.2% against `EXPANSION_RATIO_FLOOR`
   0.25** (`46 §5.2` — the fraction of composed encounters whose structure must come from the opposite
   pole). A comfort engine is the failure mode that floor exists to prevent, so this is the first
   calibration number the project has ever produced and it is below its threshold. Two further
   observations of the same run, both distributions rather than verdicts: the   composition reached only
   **5 cells with 0 measurable** (fewer than 8 compositions each, so the entropy verdict is
   `insufficient-data` — reaching it needs a substantially larger cohort, which is d4's scale
   question), and encounter traffic concentrates: Cognitive 26 / Intrapersonal 24 / Spiritual 24
   against **0** for Emotional, Moral and Interpersonal — the neglect dimension needs the scheduler's
   line coverage examined, not the persona's.

   **A correction, recorded because the first reading was wrong and a gate would have been built on
   it.** The first run also showed `thetaStaleness` 0.000 on EVERY line, which reads as a second
   pinned observable beside `driveFixation`. It is not: `observables.ts` computes raw staleness from
   `computeStaleness(..., Date.now(), ...)` and then min-max normalizes ACROSS lines, with the
   doc-comment *"relative profile is invariant to wall-clock injection"*. The campaign runs on a
   VIRTUAL clock (`BENCH_EPOCH`), so every cell saturates against the real `Date.now()` and the
   per-line maxima are equal — `span === 0`, so every line reports exactly 0. The observable is doing
   what it documents; it is simply not fit for a virtual-clock campaign. G40 therefore asserts
   theta-decay over `sig.theta.lastEncounter` DIRECTLY (a neglected line's cells must be older than
   the newest active-line cell), and its failure detail says that if it ever fires while the
   observable reads 0, the observable is what needs fixing. A gate built on the first reading would
   have failed on a system whose decay works.

   Per-line saturation is reported as a DISTRIBUTION, deliberately: “saturation” has no threshold
   until real progression curves exist, and inventing one here would be the fabricated-zero mistake in
   a different costume. The MemoryPage budget is reported **unmeasurable** with its reason (the page is
   built inside `buildEnvelope` and never returned) rather than inferred from nothing.
5. **d5 — Gates G39/G40** (kernel 38 → 40). **BUILT** — `src/core/validation/gates/campaign.ts`,
   registered in the roster (suite 38 → 40). The two are the only gates that assert over a trajectory
   of sessions THROUGH THE SEAM, which is precisely why the gap d3 found was invisible to the other
   38: every one of them either drives the kernel's own functions or calls a single seam function in
   isolation. **Theta decay is asserted over `sig.theta.lastEncounter` directly, not over
   `thetaStaleness`** — see the d4 correction below; a gate written over the observable would have
   failed on a system whose decay works. G40 also fails explicitly when the theta book holds no cell
   for either neglected line, so the assertion cannot pass vacuously.
   - **G39 `campaign continuity`** — a seeded campaign of S sessions through the live seam is
     **deterministic** (same seed → identical observable series) and **restores on every boot**
     (per-session checkpoint round-trip, the `G28` contract extended from one restore to a
     trajectory; the feed must GROW across sessions, so a restore that reset it cannot pass).
   - **G40 `campaign invariants`** — over the campaign: theta-decay accumulates on deliberately
     neglected lines and only there; transformation fires **only** when its threshold predicate
     holds (never as an artefact of session count); composition entropy stays above the cell floor
     (the visibility-collapse countermeasure, now measured rather than asserted); **no Veil leak in
     any prompt built** across every session (the render/recall vocabularies stay in lockstep over
     N sessions, not one); and **discrimination** — two personas differing in exactly one declared
     dimension produce measurably different campaigns. That last assertion is the user's
     "adaptability to unique features" claim turned into a test.
6. **d6 — The report** — **BUILT: `docs/audits/CAMPAIGN-REPORT-2026-09-24.md`** (the plan's proposed
   filename, `COHORT-SIMULATION-<date>.md`, was renamed to say what the artifact measures: a CAMPAIGN,
   not a cohort — the cohort is the input). The observed distributions and
   curves, with the honest reading: where adaptation is real, where the loop flattens, which cells
   collapse, whether transformation occurs at all, and what each threshold now is and why. This is
   the artifact that answers "to what extent can transformation happen" with evidence instead of
   architecture. **It leads with the three defects the campaign found rather than with the numbers**
   (a reader has to know what the numbers mean before they are worth reading), states its scale and
   its two reproduce commands, and closes with §5 *what this report is not*: the cohort is a parameter
   space, not a population, so it can report what the ENGINE does when handed a stance and never what
   players do — and it certifies nothing.

**Determinism and cost (the phase's one hard constraint).** Two tiers, never mixed: a **hermetic
run** (deterministic stub provider, large cohort, what `G39`/`G40` and CI use — an
LLM-dependent number must never gate the kernel, the `G14`/`G1` discipline) and an **experiential
run** (the real provider, a handful of personas, producing the report's qualitative read). A
calibration number produced by the experiential tier is labelled as such or discarded; conflating
the tiers is how a stochastic artefact becomes a threshold.

**Gates:** **G39** campaign continuity · **G40** campaign invariants + discrimination · `G28`/`G31`
and the Veil gates re-asserted at campaign scale rather than fixture scale.

**Success criterion:** one command produces a reproducible multi-session campaign for a whole
cohort through the live seam, the two gates hold, the calibration list in `AGENTS.md §4.2` is
discharged from *observed distributions* (labelled provisional), and the report states — with
numbers — how much adaptation, variety and transformation the system actually shows.

**Dependencies:** Phase 14 d4 (`MYSTERIUM_HOME`, so a campaign is hermetic) — built; `G36` (the CLI
path the campaign mirrors) — built. **Explicitly NOT in this phase:** WebUI parity, corpus growth,
and further refactoring (the module-cohesion backlog is closed; re-opening it without a measurement
would be the cosmetic split `M1` forbids).

**The rulings (ratified 2026-09-24):**

- **F-1 — F7's disposition: WIRE IT.** `writeInValue`/`questionText` are declared on
  `ConsequenceRecord` and the encounter-log writer reads them, so the free-text answer becomes
  evidence the cohort, the encounter log and the player's own journal can all read. Retiring them
  was rejected: the reflective and immersion modalities are precisely where a free-text answer *is*
  the data, and Phase 15's reflective-depth reading depends on it.
- **F-2 — the spine: THE COHORT LEADS.** Not WebUI parity (the CLI is finalised structurally, but
  parity work would multiply content that has never been measured), not corpus depth (authoring
  before measuring collapse buys volume, not variety), not hosting. This phase is what tells us
  *where* depth is needed.
- **F-3 — cohort scale: HERMETIC FIRST.** d1–d5 are built on the deterministic stub tier and land
  with `G39`/`G40` green; the synthetic cohort's size and the real-provider experiential run are
  decided *after* the hermetic results exist, never before. No stochastic number enters a gate.

### Phase 16 — The Diagnostic Sweep: repair the instrument, then calibrate (RATIFIED 2026-09-24)

> **Status (2026-09-25).** Phase 16 remains **in progress**. d2 and d3 are built; d1, d4, d5, d6, and
> d7 are now delivered too, and five items are open. d3 reserves the first developmental offer for the
> least-recently-served eligible line, leaves candidate `priority` values and the non-primary ranked
> tail unchanged, and is locked by production-path tests plus **G43** in the 43-gate CI roster. The
> original campaign figures remain dated baseline evidence, not post-fix measurements.
>
> **d1 — one producer, one reclassification, one deliberate absence.** `memoryPage` is measured where
> the page is built (`buildEnvelope` → `memoryPageBlock`): block lines/chars plus the lines that
> survived the Veil guard. `renderBudget` was **reclassified, not measured** — the direct path
> Veil-filters inside `LLMClient`, but the WebUI BFF path returns *before* the filter, so the filtered
> prompt is knowable on one path and unknowable on the other; a per-request transport counter on both
> paths is the producer that would close it. The orphan field and both write sites were deleted.
> `engagementRegisterHits` stays deliberately unmeasured: the register answers a policy question and
> has no runtime event to count.
>
> **d4/d5** — raw `candidateId` provenance separating `missing` from `unrecognised`; a focused
> campaign pins one `Line:Stage` cell and fails loudly if any finalized encounter leaves it, with the
> four injection seams bypassed when a cell is pinned by BOTH axes so `--line` alone stays play.
>
> **d6/d7** — re-measured wide and focused, **no threshold moved** (F-4 stands), and the second dated
> report is `docs/audits/CAMPAIGN-REPORT-2026-09-25.md`. Headline: wide entropy is `insufficient-data`
> by scale while the focused pass produced the first measurable cell (`Cognitive:Red`, 12 compositions,
> entropy 2.138 vs a 0.5 floor); G43 passes on its own roster (quietest/busiest 1/2) while the
> 12-campaign cohort leaves `Interpersonal` at 0 — two populations, and the exclusion is open; the
> polarity loop is enterable but inert (70 readings, 0 reconciled, 100 % fallback). **The focused pass
> exits 1**, on the unfamiliar-pole check that pinning one cell makes structurally unreachable — the
> exit is expected and is a property of the tier, not a regression.
>
> The original two rulings remain conservative. **(F-4) the novelty floor is NOT decided yet** — the
> sweep repairs the remaining instruments and re-measures before any threshold moves; and **(F-5) the
> real-provider tier is NOT authorised yet** — a cell-focused hermetic run is tried first for the
> entropy measurement, keeping CI cheap and the two tiers unmixed (`Phase 15`'s one hard constraint).

**Why this phase exists.** Phase 15 built the instrument and its first reading produced seven open
items (`docs/audits/CAMPAIGN-REPORT-2026-09-24.md` §4.2). One is closed (item 5, with G41). The rest
share a shape that decides the ORDER: **they are not calibration problems, they are instrument
problems.** A calibration pass cannot calibrate `decay` against a producer that never writes, and it
cannot calibrate a floor against a scheduler that gives one line 1 encounter in 432. So the sweep
repairs producers first, re-measures, and only then touches a threshold.

**Deliverables:**

1. **d1 — the three unmeasured observables get producers.** `memoryPageSize`, `renderBudget` and
   `engagementRegisterHits` are named in `UNAVAILABLE_OBSERVABLES` with reasons and omitted from every
   row, so the calibration pass carries three dashes where it should carry three numbers. The reason
   strings ARE the work tickets: `buildEnvelope` builds the MemoryPage and consumes it via
   `memoryPageBlock` without returning it; the assembled prompt is private (`this.messages`); the
   engagement register records MECHANISMS at authoring time and has no runtime accumulator. Each
   needs a producer that does not invent a number — and where a producer genuinely should not exist
   (a hit-counter invented for a register that has no hits) the omission is re-justified rather than
   papered over.
2. **d2 — item 2: `driveFixation` BUILT (both channels; F-6 ratified). It was a starved INPUT, not a pinned observable.**
   `fixationRisk` moves only through `updateDriveBalance`, and only for a drive whose directionality is
   one of the four pathological signals (`HealthyBalanced` decrements it toward 0). The campaign never
   delivers one, for two independent reasons, both verified: **the persona harness drops the stance it
   declares** (`personaChoiceHandler` reads only the option index and `narrativeSummary` from
   `persona.policy()`, so the `driveDirectionality` that same call computes from the authored
   `options.drives` is never consumed — the kernel harness can pass it, the campaign cannot, because
   the orchestrator *derives* the evaluation), and **the narratives are filler** (`personas.ts`
   generates 50 tokens of `w${(step*7+i)%50}`, so the keyword-gated channel on the module path can
   never fire). Arithmetic confirmation rather than inference: `HealthyBalanced` is exactly `+0.01`
   weight and `−0.02` risk per encounter, and the measured weights are **0.03 after 3 encounters, 0.06
   after 6** — 1 × 0.01 per drive per encounter, all four drives, every persona. **The repair is a
   ratification, not a fix:** (a) route the stance through real prose (faithful to production, but
   `detectWriteInShadow` can express at most ONE drive's signal, so it cannot represent the 4-quadrant
   × 4-drive model the observable exists to watch), or (b) an explicit fixture-only injection seam.
   The gate follows the ruling.
3. **d3 — item 3: scheduler line coverage BUILT 2026-09-25. The historical baseline was Emotional
   at 1 encounter in 432 and three lines at 74 %; those numbers remain the diagnosis, not a post-fix
   campaign reading.** Diagnosis: supply was symmetric, the eight-criterion priority formula was not
   the cause, and the comparator's substantive novelty rules tied until the static
   `refHash(moduleRef)` reproducibility key chose the same line repeatedly.
   The implemented contract in `24 §3.3–§3.4` is: the comparator applies starvation, modality
   novelty, recent-line novelty, unfamiliar-first, then hash; after ranking, the **first developmental
   offer** is reserved for the eligible line with the oldest positive theta timestamp (`0` means
   never served). The reserve may cross a priority band but is not a ninth criterion, changes no
   candidate's `priority`, and leaves the remaining ranked tail in score-and-band order. Canonical
   `ALL_LINES` order is only the all-zero startup tie-break. Curriculum/training inserts are outside
   the developmental reserve. **G43** runs the production campaign path, counts finalized
   developmental provenance only, requires every canonical line, and retains the 2%
   quietest/busiest floor; it does not claim every ambient or secondary offer covers every line.
  Focused verification on 2026-09-25: `Benchmark.test.ts` plus `TieBreakStarvation.test.ts` and
    `CampaignSeries.test.ts`, 24/24 tests passed, and the benchmark executed the CI roster including
    G43.
4. **d4 — item 4: candidate provenance decoder repaired and residual classified 2026-09-25.**
   `candidateLibrary.ts` emits `npc-authored:` but `candidateSource()` had no branch, so authored NPC
   renderings were misreported as `unknown`; the decoder and its exhaustive regression test now
   include `authored-npc`. The campaign series and calibration report now retain the raw candidate id
   and separate `missing` stamps (`candidateId === null`) from `unrecognised` non-null schemes. A
   fresh 12-campaign / 24-session / 96-encounter hermetic reading measured **12.5% missing, 87.5%
   present, 0% unrecognised**; the historical 12.5% `unknown` result remains the dated baseline, not
   a post-fix rewrite. d4 is repaired and measured; any future unknown scheme remains fail-visible.
5. **d5 — item 6/7: reshape the cohort, do not grow it.** Entropy needs ⩾ `MIN_COMPOSITIONS` (8)
   compositions PER CELL; 11–16 cells composed and **0** measurable at 50 campaigns, so the binding
   constraint is encounters-per-cell, not cohort size. Deliverable: a cell-focused hermetic mode
   (few cells × many encounters × longer trajectories) and the honest verdict on whether the entropy
   floor is reachable hermetically at all — which is the question F-5's escalation would answer.
6. **d6 — re-measure, then calibrate (F-4's decision point).** With d2–d5 landed, re-run the pass and
   bring item 1 back with the instrument repaired. Only then decide: raise the dose (engine
   under-serves), lower the floor (miscalibrated), or neither. Report `shadow-facing`'s dormancy as
   separately diagnosable — a synthetic cohort whose shadow ledgers stay near-dormant cannot DEMAND a
   shadow-facing pole, so `0` may be the cohort's stance rather than the engine's ceiling.
7. **d7 — the second campaign report**, superseding the first's open list with the sweep's findings
   and the calibration decisions taken.

**Gates:** one per repaired producer (d2–d4), because the failure mode of every item here is *a
number that reads like health* — and `G41` is the precedent for how a silent zero becomes a gate.

**Success criterion:** every number the calibration pass prints has a producer behind it (no dashes
for things that should be measurable), item 1 is re-measured against a repaired instrument and decided
by ruling with the decision recorded, and the report's open list is either closed or explicitly
reclassified.

**Dependencies:** Phase 15 (the runner, the series, the pass) — built. **Explicitly NOT in this
phase:** the novelty-floor decision (d6 owns it), the real-provider run (F-5 defers it), WebUI
parity, corpus growth, and refactoring.

**The rulings (ratified 2026-09-24):**

- **F-4 — the novelty floor: DECIDE ONLY AFTER d1, d4, d5, AND THE RE-MEASUREMENT.** The historical
  19–21 % vs 0.25 breach and `shadow-facing` dormancy remain a provisional finding against a broken
  instrument: item 2's starved input and item 3's hash-decided line coverage are now repaired, but
  the remaining producers and provenance work still precede a valid reading. Moving the floor to match
  the old observation, or changing engine dosage before the repaired run, would calibrate against
  evidence known to be structurally invalid. No threshold changes in this revision.
- **F-5 — the entropy measurement: HERMETIC FIRST, RESHAPED.** Not the real-provider tier yet. The
  binding constraint is compositions-per-cell, so a cell-focused hermetic run is tried before any
  escalation, and the escalation is authorised only on a demonstrated impossibility rather than on a
  wide cohort's thin histogram.
- **F-6 — d2's repair: CLOSED 2026-09-25; both channels retained.** Production prose remains the
  production evaluation path. The campaign also has an explicit fixture-only
  `declaredDirectionality` seam because one derived player evaluation can express at most one
  pathological drive signal, while the 4-quadrant × 4-drive model requires more than one to test
  accumulation. No production caller sets the declared stance. `EncounterProvenance.declaredStance`
  records which channel carried each encounter, and **G42** asserts drive, direction, accumulation,
  and attribution. The historical trade-off remains documented; it is no longer an open ruling.

**Phase 16 finalization sequence (binding order; updated 2026-09-25).**

1. Keep the d3 production baseline: reserved developmental primary, unchanged candidate priorities and
   non-primary tail, production-path tests, and G43 over finalized developmental provenance.
2. Finish d1 by exposing genuine runtime measurements, or explicitly rejustify each structurally
   unavailable observable. Never replace a missing producer with a fabricated zero.
3. Finish d4 by identifying every unresolved candidate-id source at the production stamp boundary;
   the decoder must continue to refuse guesses.
4. Finish d5 with a cell-focused hermetic cohort that can reach `MIN_COMPOSITIONS` per cell, then
   record the measured entropy verdict before considering any real-provider escalation.
5. Run d6 only after d1, d4, and d5: re-measure the unfamiliar-pole share and diagnose
   `shadow-facing` dormancy separately. Only then may F-4 decide the novelty-floor ruling.
6. Publish d7 as a second dated report from the repaired-instrument evidence, without overwriting the
   2026-09-24 baseline or relabelling synthetic evidence as certification.
7. Productize only through exercised surfaces: the full build and built-CLI boot are release checks;
   WebUI parity through `usecases/EncounterSession` remains an explicit follow-up unless separately
   implemented and verified.
8. Treat real-rater validation, real-play evidence, networked deployment, and remote synchronization
   as external certification/release prerequisites. Synthetic evidence may reject; it may not certify.

### Current work (post-plan) — not a phase

Phases 1–15 are ratified and built. **Phase 16 remains in progress:** d2 and d3 are built and gated
through G42/G43; d1, d4, d5, d6, and d7 remain open in the order above. The frontier after those
repairs is external certification and deployment: real-rater thresholds, real-play evidence, partner
recognition, networked pod hosting, and remote synchronization. When current work is described to an
agent, cite `AGENTS.md §4.2` and the records — never a phase number from memory.

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
4. Full battery + 43 kernel gates green in CI; release checks exercised on the built CLI, and both remotes synchronized or the exact external blocker reported.

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
deploy the DO), and per-line LLM keys for delegated mandates.

**Wiring frontier (2026-09-23).** Beyond the external items above, the
`WIRING-CONTRAST-AUDIT-2026-09-23` found build-complete surfaces that are not yet
load-bearing — see **Phase 13** (§4). The two that matter most for the product's core
promise: the live UDV carries only 3 of its 8 declared bands (so purpose, analogy,
preference and observed evidence change nothing yet), and the council-role scoping
table (`45 §6.1`) never executes — meaning sub-agents are not yet aligned per role.
Phase 13 d1→d2 is the critical path for the personalization depth the architecture
was built for. **Closed 2026-09-24** — Phase 13 is complete (d1–d12, G32–G35) and
Phase 14 closed the adjacent checked-surface class (G36–G38).

**Evidence frontier (2026-09-24).** With the wiring closed, the binding constraint is
no longer architecture but **evidence**: the live seam has no long-horizon exerciser
(`AGENTS.md §4.2` open list 4), so the calibration items that were classified
"needs play data — not phase-able" have neither thresholds nor a way to get them, and
the system's central claims — persona adaptation, transformation over time, content
variety that does not collapse — have no observed evidence. **Phase 15 (the Simulated
Cohort, §4)** is the response, and it is the recommended next phase: it converts the
calibration list from blocked to executable by generating the play data with the
project's own agents, at the exact surface the user ruled must be agent-reachable
(Phase 14 d4). Until it is ratified, the honest statement of the frontier is *the
1–14 architecture is built and gated; its lived behaviour is unmeasured*.

## 9. Revision record

| Date | Revision |
|---|---|
| 2026-09-25 | **Phase 16 d3 built and the live status reconciled; d4 decoder omission fixed without declaring the residual closed.** `EncounterScheduler` now reserves the first developmental offer for the eligible line with the oldest positive theta timestamp; the reserve may cross a priority band but is not a ninth criterion, changes no candidate `priority`, and leaves the non-primary tail ranked. `24 §3.3–§3.4` owns the contract. G43 runs the production campaign path, counts finalized developmental provenance only, requires all eight canonical lines, and retains the 2% quietest/busiest floor; the kernel roster is now 43 gates. `candidateSource()` now decodes the production `npc-authored:` prefix as `authored-npc`, with a regression test; the historical 12.5% `unknown` measurement remains open pending a fresh campaign classification of residual null stamps. F-6 is closed by the built two-channel d2 repair. d1, the residual d4 measurement, d5, d6, d7, real-rater/real-play certification, and deployment remain open. |
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
| 2026-09-22 (audit pass) | **Memory infrastructure audited, live-wired, and hardened (`docs/audits/MEMORY-AUDIT-2026-09-22.md`).** Exhaustive adversarial audit of the Phase 11+12 memory integration. Headline finding (F0, critical): the Phase-12 modules (MemoryPage, LocalRetriever, retrieval firewall) were in-vitro green but had **zero production callers** — the `[CONTINUITY]` head never reached a prompt. Fixed at the envelope seam: `buildEnvelope` computes the page and returns a Veil-filtered `continuity` field; ContextPipeline renders it as `[CROSS-SESSION MEMORY]`, distinct from the in-session `[CONTINUITY]` block. Seven further findings fixed and regression-locked (`tests/personalization/MemoryAudit.test.ts`, 12 tests): F1 thread closure follows the ratifying verdict; F2 threads never expire by age (M2 cap is the only culler); F3 verdict pluralization via a phrase table; F4 render/recall Veil vocabularies in tested lockstep (MY-RG-0031 class); F5 checkpoint feed windowed at 2000 with the page as compaction layer (LM-c); F6 Unicode-aware NFKD-folded tokenizer (non-Latin interests became retrievable); F9 `vitest` moved to `pool: 'forks'` — the `MigrateLegacySave` flake was a cross-worker `process.env.HOME` race present on the pre-audit baseline (verified via stash). Residual declared in the audit §4: the `observedInterests` band does not yet reach pooling (designed feature gap — evidence-ledger wiring); the embedding tier has no runtime consumer (by design, local floor is default). Tests: 1389 → **1401** (12 audit + baseline-recovery). GitHub current; GitLab push remains credential-blocked. |
| 2026-09-22 (plan revision) | **Phase 11 ratified: Closed-Loop Memory & Preference Intake.** Contrasting the operational audit's frontier (`docs/audits/OPERATIONAL-AUDIT-2026-09-22.md`) against the owning laws produced an eight-deliverable wiring-and-authoring phase: checkpoint restore (C1, 22 §7.5), feed readers 27/25 (C2, 43 §5.5), preference intake (C3, 16 §2.1 + 45 §5.4 — declared interests/aversions with 47 §8 legibility), ratification verdicts (C4), polarity state writers (C5, 46 §5.3), probe RV harness (K1 step 1, 12 §5.4), NPC persona seeds (D1, 46 §2 third authored leg), tag expansion tranche 2 (D2, 46 §4). Gates G28 (memory persistence), G29 (preference intake firewall), G30 (verdict completeness) defined; suite 27 → 30. Remaining data-dependent work (real-rater RV, entropy calibration, saturation curves, pods deployment) is post-phase by nature and cannot be phase-able. |
| 2026-09-22 | **Runtime loop closed + authored seeding tier (`P13`/`P14`).** Phase 10's runtime half landed: the reporting feed as code (four idempotent writers, F3), the owner-worker pool (MY-AD-0009 consumer: ±0.3 caps, W4 replay, W5 concurrency), `OrchestrationServices` as the ONE orchestrator seam (envelope + holon digest + runtime coherence gate + session end on all five result paths; services omitted → byte-identical legacy), prompt blocks `[PERSONALIZATION]`/`[HOLON MEMORY]`/`[SCENARIO SEED]`/`[WORLD PLACE]`, and both surfaces (CLI + WebUI) carrying/persisting services. Then authored substance: 64 scenario seeds × 7 modality angles, 8 pole-probes (log-only until RV), 64 world seeds — library 1792 candidates, coherence enforced at authoring (G27, 26→27 gates) and at runtime (routes-don't-cancel), calibration harness extended to both seed tiers. `MY-AD-0009` deferral discharged with consumer; `_org.yaml → pending` graduated to `completed: P13/P14`; `AGENTS.md §4.2` and plan §2.1 corrected (the laws-without-consumer list fully discharged; the open frontier is configuration/calibration/development, owned by `AGENTS.md §4.2`). Tests: 1284 → 1370. GitLab push remains credential-blocked; GitHub current. |
| 2026-09-22 (same pass) | **Phases 11 + 12 BUILT — the memory infrastructure integrated.** All eleven deliverables across the two phases landed in one development sequence: D1 checkpoint restore with production callers in the CLI loop (G28 proves save→load→save byte-identical across restart); D2 feed readers (`feedReaders.ts` — 27 planning bias at `startSession`, committed-only accessor); D3 consented preference intake (`IdentityProfile` declared interests/aversions, CLI intake + privacy-dashboard withdrawal, G29 firewall); D4 ratification verdicts on every session (G30); D5 polarity pair-state writers under the saturation guard, riding the checkpoint; D6 the probe RV harness (`probeValidation.ts`); D7 64 authored NPC persona seeds (envelope voice line; library 1792 → 2240); D8 tag tranche 2 (12 → 20, 4 curated pairs); P12-1 MemoryPage (M1–M5, `[CONTINUITY]` head, Veil-guarded audit); P12-2 LocalRetriever (BM25+recency+graph, RRF-fused, dependency-free); P12-3 pinned-embedding seam (`EMBEDDING_MODEL_PIN`, `MY-RG-0032` hard error; degradation to the local floor); P12-4 the retrieval firewall (`retrievalFirewall.ts`, R1–R4, fail-closed per hit) enforced by G31 with injected fixtures. Kernel suite 27 → **31**. `_org.yaml → pending` emptied — P15 graduated to `completed` in the same commit as the build. Tests: 1370 → **1389**. GitHub current; GitLab push remains credential-blocked. |
| 2026-09-21 (same pass) | **One word, one axis (`VOCAB-SUBSTRATE` closed by user ruling).** The user ratified the proposal on the table: *substrate layer* now means ONLY the intra-holonic compositional vertical — `13`'s substrate→core→emergent stack, named by `44` axis E. The D3 bands (Free Will / Love / Light / the octave's contributions) are renamed **law-bands** across the four documents the key named: `02 §4` (table column + the term-scope note, which now records the retirement), `06`'s ownership pointer, `22`'s layer-stack law (`01.4 §2.5.3`'s "one concurrent lesser cycle per integrated band"), and `28`'s J-INV-7. The code constant followed: `SUBSTRATE_LAYER_LAW` → `LAW_BANDS_D3`, its `density` field → `band` (the rows were never densities — that misnomer was part of the collision). Two unrelated compounds stay: `06 §?`'s "energetic substrate (Ra)" (the ray's felt-tone vs energy-substrate distinction, not the vertical) and the "theoretical substrate" idiom (a metaphor, not a term of art). `MY-RG-0026`'s rule — one word never carries two frameworks — now holds on this axis, and DG23 verifies every citation touched by the rename still resolves. Tests 1186 green, 23 doc gates green. |
| 2026-09-24 | **Checked-surface audit → the CLI P0 fixed → Phase 14 planned (`docs/audits/CHECKED-SURFACE-AUDIT-2026-09-24.md`).** The audit swept every production entry point for membership in the *checked graph* (the files tsconfig, tests, gates and lint actually read) and found `scripts/**` outside it: **the CLI did not boot at all** — `c634535` (WORLD-STORE-MOVE) renamed `red-layer-holons.json` / `stage-holons.json` into `src/core/world/data/` and left two `scripts/cli-game.ts` imports pointing at the old path, so the entry point failed at import time for three days while `npm run build` reported 0 errors. It also carried **69 type errors** (64 in the CLI), none visible to any step. **P0 fixed and verified** (imports repointed, `declineVow` import restored — the decline path had been throwing, the retired `responsesPool` reference dropped, `scripts/tdg-probe.ts` retired with its removed subject module, `package.json` `files` gained `src/core/world/data/`): headless session exit 0, `npm run build:cli` success, bundled CLI `--version` → 0.1.0. Then the deeper finding, which only surfaced once the CLI could run: **the default and every headless/JSON invocation bypass the whole orchestration/personalization/memory architecture** — `runDirectQuestioningSession` creates no `OrchestrationServices`, passes none to the encounter, captures no checkpoint and appends no journal (verified: a completed headless session leaves no `orchestrationCheckpoint` and no journal file). The Phase 11–13 architecture therefore has **no automated exerciser**: the kernel gates and unit tests are its only live path. **Phase 14 (Checked-Surface Closure & Operationally-Live Modes) defined** — user-ratified shape: fix P0 first then the full closure, split the CLI while fixing, approve Laya for the real System-1 adapter, do K1 first. **Also recorded:** the two-mode structure (`direct` is the default; `story` is architecture-live), and that `--no-llm` (used by `regression-sweep.sh` and several audits) is not a declared flag — the sweep cannot have run since the flag was removed. |
| 2026-09-24 | **Phase 13 d3–d9 BUILT — the wiring-completion set is closed; Phase 13 is now FULLY complete.** d3: `retrievalShortlist.ts` (shortlist above 500 candidates via `localRetrieve`, `recallGuard` R1/R3 at the pooling seam, enumeration below bit-identical; wired into `pool()`). d4: `services.telemetry` — every `buildEnvelope` records a `CompositionEvent`; defects reach the dev loop only. d5: `probeRuntime.ts` on `services.probes` — budget-paced offers, the validated/log-only band split fail-closed at the seam (flag/evidence drift demotes), readings ride the checkpoint; `harnessReport` is `runProbeRvHarness`'s first production caller. d6: `poleMechanism` maps every pole to its registered mechanism; `decidePole` refuses an unregistered one (MY-RG-0017's teeth live; the default register passes all 8, so behavior is unchanged). d7: ROUTED — `compositionRuntime.ts` runs `compose()` over the compiled store at service creation (the G22 pole shape: technology/nature + craft/music active-tension), the `composed:` tier joins the library, empty pulls degrade. d8: five foundation status marks updated (48 §4 LIVE, 45 §7.3 ENFORCED, 46 §7 ROUTED, 46 §11 LIVE, 47 §7 reachable/log-only). d9a: `memoryPageBlock` render budget (12 lines / 300 chars / 1 400 total — defensive caps independent of M2). d9b: `infra/persistence/sessionJournal.ts` — append-only NDJSON sidecar per checkpoint, `replayJournal` at CLI boot merges pending sessions (crash between sessionEnd and saveAll no longer loses them), consumed lines skip, torn lines drop un-retried; PLACEMENT LESSON: the journal lives in infra, not the inference module graph — G25 correctly failed `fs.writeFileSync` inside `core/personalization`. d9c: randomized property sweep (2 000 docs, zero leaks; page/recall vocabulary lockstep). Tests: `Phase13Closing.test.ts` (24); suite 1 483 → **1 507** (132 files); 35 kernel gates; 23 doc gates; build 0 errors; lint clean. |
| 2026-09-24 | **Phase 13 d10 BUILT — the Polarity Pool is live and the differential criterion is CLOSED.** L1: `polarityIndex.ts` derives the library (every base gains `~sim`/`~opp` recolourings; cell copied verbatim; idempotent; 2 240 → ~6 720 candidates; every cell ≥3 pairwise-distinct tag vectors; `createOrchestrationServices` builds it). L2: `poleDecision.ts` resolves familiar/unfamiliar/shadow-facing by fluent-overlap rank with axis-distance tiebreak, split at the shadow-severity-scaled share (dormant 0.2, ceiling 0.6), deterministic hash draw, aversion veto untouched; live in `buildEnvelope`. L3: `polarityResolution.ts` — the reading (position/direction/confidence/evidence), the `System1Reader` interface + deterministic fallback, `applyReading`'s bounded effects (unratified/below-floor inert; 3 confirmations to reconcile; disapproval re-opens + severity +1), `polarityCoverage` (≥3 orthogonal dimensions AND ≥6 readings — a cell is never closed by a counter); wired at sessionEnd via the orchestrator's EncounterRecord, readings/tallies checkpointed. L4: `PooledSelection` + `polarityPromptLine` on the envelope — top-1 primary + named pole to the prompt, alternates hidden, scopes carry the pole name only. BUILD DISCOVERY: `rankByRelevance` normalized (raw tag-sum rewarded breadth over exact flavour and would have re-flattened the derived library) — a derived library requires a scale-free rank. **G35** added (kernel 34 → 35): floor + idempotency + no altitude drift + dosage law + spiral + rubric audit + coverage + kernel-level differential. Gap-lock test flipped to discrimination in `Phase13Wiring.test.ts`; `PolarityPool.test.ts` (21 tests); suite 1 462 → 1 483; 23 doc gates; build 0 errors; lint clean. Phase 13 is COMPLETE (d3–d9 remain post-phase calibration work, owned by the audit). |
| 2026-09-24 | **d10 RESHAPED by user ratification into the Polarity Pool (four rulings + a transmutation principle).** The W11 blocker (2240 candidates = 448 cells × exactly 5, identical tags per cell → pooling byte-identical for every player) now closes by *derivation* instead of authoring: a similarity/opposition index over the tag-ontology axis space (similar = tag-overlap + axis-proximity; opposite = the store's own reflect/dialecticPair geometry) synthesizes renderings dynamically, G35 becomes a per-cell floor (≥2: one familiar-capable, one unfamiliar-capable), cross-cell synthesis documented in 46 as a deferred annex. The familiar/unfamiliar polarity integrates the Distortion Ledger: unfamiliar flavour faces the cell's active shadow, dosage shadow-severity-scaled (noveltyBudget's first real consumer), aversion veto untouched. The resolution loop is a READING not a toggle (user: "hard polarities do not reconcile in a single sweep — the development is spiral"): the System-1 layer (Laya, user-ratified: wire it — tag resolution + reading-proposal + neighbor prefilter, behind interfaces with deterministic fallback, never authoring, never final authority) proposes the conscious/shadow reading, the orchestrator ratifies (L4); approve strengthens toward reconciled only via repeated confirmations (46 §4.3's falsifiable state), disapprove re-opens the pair + increments shadow severity (the loop tightens), every reading profile-updates through the background workers, and a cell is never closed — orthogonal-dimension probe coverage gates profiling completion. Prompt surface: top-1 primary + pole named, alternates hidden (user-ratified). Phase 13 heading updated: d10 is now the only remaining Phase-13 deliverable (d3–d9 remain post-phase calibration work). |
| 2026-09-24 | **Phase 13 d11 + d12 BUILT (`62ded8b` + this commit): the council is bound, standing, and dispatched.** d11: `AGENT_ROLE_COUNCIL` binds all 18 roles (S2/S5 to none; J1–J5 + therapist carry `narrative-voice` as a secondary scope — the inert row G32 caught); `buildEnvelope` returns `scopes` per row plus **`healing`**; the standing block ([MY MANDATE]/[MY VIEW]/[MY BOUNDARIES]/[MY TOOLS]/[MY SESSION]) rides every delegation, Veil-guarded line by line (an encounter's stage label never renders); `read_my_scope`/`read_band` are universal read tools (`43 §5.6`), grants can never widen the scope table, and every refusal is recorded with a reason; `delegateSession` logs the binding + block. d12: the dispatcher (`dispatcher.ts`) — `TRIGGER_TABLE` (11 rows, order = precedence; crisis the only bypass; threshold assembles the foreground council minus S2/S5 with the Therapist first; determinism seed-invariant), `observationForTrigger` (state↔row round-trip), the live tool surface (`councilTools.ts`: `summon_council`/`schedule_presence`/`delegate_session` + rules 12–15, registered on the orchestrator opt-in, byte-identical without), and the CLI drill `delegate --summon --trigger <name>`. **G34** added (kernel 33 → **34**); `Dispatcher.test.ts` (21 tests incl. end-to-end crisis summons delivering the healing scope) + `CouncilStanding.test.ts` (19). Canon updated in place: `43 §3.3` (the trigger table as canon), `43 §4.3` (`summon_council`), `43 §5.6` (status: built), `45 §6.1` (binding + read surface + delivery status), audit §9 (build record). Remaining in Phase 13: d10 (candidate multiplicity) is the gating dependency for the differential criterion; d3–d9 unchanged. |
| 2026-09-24 | **Council orthogonality audited + the envelope architecture designed (`docs/audits/COUNCIL-ORTHOGONALITY-AUDIT-2026-09-24.md`).** The two things called *the council* were audited against each other: `43 §4.2`'s 18-role workforce and `45 §6.1`'s 5 visibility scopes. Findings: one genuine redundancy (**O6** — A3 Validator and S1 Pack Agents hold identical toolsets and both "administer instruments"; ruling: S1 operates the pack, A3 judges the instrument); two adjacent pairs needing stated boundaries (**O3** A2 Reviewer vs Therapist arc notes; **O5** S2 Context Steward vs S4 Data Warden — S4 alone writes consent, S2 alone assembles projections); a producer/consumer pair to declare rather than merge (**O2** Therapist proposes shadow-work, J4 delivers it); a fidelity split (**O1** A1 owns the evidence contract, J2 is its diegetic delivery); and **two missing rows** (**O8** — no healing scope and no orchestrator scope). The largest operational finding is **O10: the council has no dispatcher** — the only production callers of `delegateSession` are the CLI and the kernel gate, so the loop never summons a sub-agent; the trigger table (audit §3) is designed to fix it. Canon updated: `45 §6.1` gains the **healing** row and the **orchestrator (steward)** row plus the explicit `AgentRole → CouncilRole` binding; `43 §4.2` gains the two-contracts statement (toolset = what I may do, scope = what I may see) and **`43 §5.6` the standing-context contract** (standing block + authorized access tools + "a refusal is information"). Phase 13 gains **d10** (candidate multiplicity per cell — closes the differential criterion), **d11** (binding + standing block in the delegation path) and **d12** (the dispatcher). Open decisions recorded for ratification: D1 healing-scope strictness, D2 the O6 ruling, D3 whether the foreground scoring step becomes a delegated A-role call, D4 summoning stays deterministic. |
| 2026-09-23 | **Live-surface wiring audit + Phase 13 planned (`docs/audits/WIRING-CONTRAST-AUDIT-2026-09-23.md`).** Every ratified personalization / memory / world surface was traced to its production callers. Nine have none: `LocalRetriever` + `retrievalFirewall` (gate-fixture traffic only), the stubbed `envelopeRuntime` (its UDV inputs hardcoded empty), `scopeForRole`/`ROLE_SCOPES` (45 §6.1 council alignment never executes), the UDV's own preference band (zero consumers anywhere), `compose()`/`buildLibraryViews` (test-only), `compositionTelemetry` (calibration script only), the probe tier (unreachable; `probeValidation.ts` has zero references — a dead module), and the engagement register (test-only). The live UDV carries 3 of 8 declared bands, so purpose, analogy, preference and observed evidence currently change no ranking. No defect is a crash or a leak — every dark surface degrades quiet by the `45 §5` law, which is why it went unnoticed. **Phase 13 (Live-Surface Wiring & Council Alignment) defined** with nine deliverables (d1 band population, d2 council scoping live + `envelopeRuntime` consolidation, d3 retrieval on the candidate path, d4 runtime composition telemetry, d5 probes reachable + RV harness live, d6 engagement-register enforcement, d7 composition-engine status resolved, d8 doc status marks, d9 memory-audit carry-overs) and gates **G32–G34** (kernel 31 → 34). Four foundation overclaims status-marked in the same commit (48 §4 retriever/embedding, 45 §7.3 register, 46 §11 telemetry) plus the live seam named (`sessionRuntime`) in 48 §3. `AGENTS.md §4.2` gained the third open-work list (live-surface wiring) — the failure class is *a documented consumer that no live seam calls*. |
| 2026-09-24 | **Third sweep — the post-P0 error census, and the semantic defect inside it (`docs/audits/CHECKED-SURFACE-AUDIT-2026-09-24.md` §10).** With `scripts/**` finally inside the tsconfig `include`, the errors existed for the first time: **63 survive** (60 `cli-game.ts`, 2 `compile-facets.ts`, 1 `check-invariants.ts`). Type errors erase at runtime, so they were triaged site-by-site by *enclosing function* into **three tiers, not one** — **T1 (2):** `responsesPool` (v3644) and `telemetry` (v3818) are bare names with no value in scope, both inside `runFullSession`; the v3644 one sits inside a `try`, so **the story branch — the architecture-live mode — cannot dispatch an encounter, it degrades where it should run**; **T2 (8):** `driveWeights.agency|communion|eros|agape` → `undefined ?? 0` → **every drive-health score is exactly 0.5 regardless of the drives**, on the **default DQ profile path**, plus `ConsequenceRecord.line` ×3 → the post-session summary **always reports "1 aspect explored"** and `vowFulfilled` → the fulfilment message never prints — silent falsification of user-facing output, the class the Veil-compliant design makes hardest to notice; **T3 (53):** type-shape only. The census also surfaced a semantic defect no count would show — **F5 (High): the retired stage `White` is still live in `scripts/**`.** `src/core/domain/Stage.ts` ends at `Turquoise` and `GreaterCycleEngine` records the retirement (*"the row previously read `'White'`, which named the retired stage 8 … There is no D4 stage in Mysterium"*), but the retirement reached `src/` and **missed `scripts/`**: four CLI ladders (`CAL_STAGES`, `stageOrder`, `allStages` ×2) and `check-invariants.ts` still read `Infrared…Green, Turquoise, White` — **dropping `Teal` and appending a stage that does not exist**, so calibration can never report `Teal` and its highest-detected-stage comparison orders against a phantom. This is the *"confusing, or deviated stage simulation"* the ladder ratification exists to prevent, and it survived for the same reason P0 did: the CLI is outside the checked graph, so a retired literal is never type-rejected. **F6 (Medium):** the canonical ladder is re-declared in ≥18 modules (`ALL_STAGES`/`stageOrdinal` bypassed with hand-rolled `.indexOf`); the `src/` copies agree today, which makes this the *precondition* for the next `White`, not a bug. **Phase 14 d2 split into d2a (retire the census — T1/T2 first, they are correctness not types) · d2b (purge the retired ladder) · d2c (make the ladder single-source)**, d4 extended to both sides (fix the story branch's dispatch **and** carry the checkpoint/journal onto the DQ return path — so `G36` smokes both modes and `G28` asserts the checkpoint on both), and **G37 gained a second assertion** (no module re-declares a canonical domain constant). Open forks put to the user: **Q7** where `White`'s marker content relocates (deleted / folded into `Turquoise` / moved to the Violet closure *event*), **Q8** whether `Teal`'s absence from the CLI ladder is accidental, **Q9** the direction of repair for API drift (`src` canonical → adapt the CLI, vs a call site expressing genuine feature intent `src` should grow), **Q10** whether d3's split also extracts the calibration block (v1100–1700, where F5 lives) from the presentation layer into `src/core/`. |
| 2026-09-24 | **Phase 14 d2a + d2b BUILT — `scripts/**` is inside the checked graph and the retired ladder is purged (`docs/audits/CHECKED-SURFACE-AUDIT-2026-09-24.md` §11).** Ratified before execution: Q7 White's markers relocate to the Violet closure event · Q8 the missing `Teal` is accidental (restore the canonical 8) · Q9 `src/` canonical with documented gated exceptions · Q10 d3's split also extracts the calibration block · Q11 execute d2a+d2b then verify. **d2b:** `CLOSURE_MARKERS` created in `Ray.ts` beside `CLOSURE_BINDING` (the `White` marker list relocated as the *closure's* vocabulary — deliberately NOT folded into `Turquoise`, because inferring an altitude from closure language would repeat the conflation the retirement corrected); `CAL_STAGES` deleted for `ALL_STAGES`/`stageOrdinal`; `stageMarkers`/`stageOrder`/`stageColor`/`stageAbbr`/`stageAestheticsShort` restored to the canonical 8 with `Teal` (L7 "gateway opens") and `Turquoise` (L8 "gateway traversed") split per `StageQuality`; both `allStages` literals deleted; `check-invariants` leak check iterates the imported `ALL_STAGES`. **d2a (63 → 0 errors):** T1 — the `responsesPool` ReferenceError and the stale `telemetry` flush removed, so **the story branch can dispatch and reach SESSION END** (it previously did neither); T2 — drive keys capitalised (the four health scores were pinned to exactly 0.5 for every player), `ConsequenceRecord.line` added as a required field with ONE derivation (`encounterLine()`, now shared with `applyConsequences`) + 7 fixtures, the vow-fulfilment message reads the returned book instead of a field that never existed, four single-arg `info()` calls corrected to `warn()`; T3 — 24 dead declarations retired, including **five retired clinical renderers** (`renderAltitudesChart`/`renderCCIDisplay`/`renderShadows`/`renderDrives`/`renderRadarChart` + `SHADOW_LABELS` + `stageAbbr`) deleted rather than re-wired because their output is exactly what `profile show`'s rewrite removed as Veil-violating (comment preserved in place), a duplicate `veilShadowMovement` (verbatim second copy of `describeShadowMovement` — §2.2 violation), and the facet compiler's unwired `QUADRANTS`/`QUADRANT_ALIASES` (replaced with a RETIRED note: they describe a normalisation that never happens). Also: `TelemetryEventType` gained `encounter_started` (always emitted, never representable; test 9 → 10) and `tsconfig.include` gained `scripts/**` so `include` + fixes land in ONE commit. **F10 (new, High): the architecture-live mode was unreachable by any agent** — `--agent` removed, mode prompt skipped under `--headless`/`--json`, so `gameMode` was hardcoded `'direct'`; a `--mode <direct|story>` flag now exists against one canonical `SESSION_MODES` list. **Verified:** tsc 0 (was 63) · build 0 · 1 507 tests (132 files) · 23 doc gates · lint clean · `--mode=direct` exit 0 · `--mode=story` exit 0 (previously threw twice) · story writes `orchestrationCheckpoint` into `world.json` and appends `session-journal.ndjson`. **Carried:** F7 (`writeInValue`/`questionText` collected but dropped by `processOutcome`), F9 (facet-compiler quadrant aliasing unwired), d2c (single-source the ladder), d4 (DQ still bypasses the capture), d5 (G36/G37 — the class is fixed but not yet gated). |
| 2026-09-24 | **Phase 14 d2c + d4 + d5 BUILT, and the module-cohesion doctrine ratified (`docs/audits/MODULE-COHESION-AUDIT-2026-09-24.md`).** **d2c:** the canonical domain sets are single-source — **25 re-declarations rebuilt from their owner** (stage ladder ×5, line set ×9, drive set ×7, modality set ×3, plus four JSON-schema `enum:` lists now spreading `ALL_LINES`), enumerated by making G37's scan the census rather than grepping for a stage name; `SESSION_MODES` moved to `src/core/domain/SessionMode.ts`; a shadowing `const { ALL_LINES } = await import(...)` in the CLI (the M8 defect class) removed. Two documented exemptions remain (`udv.ts` forbidden-token denylist, `scenarioSeedVariants.ts` authored per-modality table). **d4:** `runDirectQuestioningSession` now receives the `OrchestrationServices` its caller already holds, passes them to `executeEncounter`, and at its save site writes `captureCheckpoint` onto the world **and** appends the sidecar journal — the same two writes the story branch makes, so the **default** surface is architecture-live. Verified live: a headless `--mode=direct` session leaves `orchestrationCheckpoint` in `world.json`/`save-all.json` plus one journal line; previously it left neither. To make a hermetic boot possible, `MYSTERIUM_HOME` now redirects the state root (`mysteriumDir.ts`, single source — `ProfileManager` and the CLI read it instead of `os.homedir()`). **d5:** **G36** boots *every* `SESSION_MODES` member headless against a throwaway root and requires exit 0 **+ a `session_ended` event + a persisted checkpoint** (the third assertion is what makes "architecture-live" a gate rather than a claim); **G37** asserts every production `.ts` matches a `tsconfig` `include` pattern (via a tiny JSONC reader, so it reads the real config) and that no module rebuilds a complete canonical set, with a documented exemption registry; `tests/cli/CliMatrix.test.ts` adds the subcommand matrix (version vs `package.json`, the `--help` surface, read-only JSON, unknown-command rejection, redirected-root reporting) and a stray first token now says `unknown command 'x'` instead of commander's `too many arguments`. **Doctrine:** the *Rust Best Practices Handbook*'s transferable claims (structure and naming, not Rust) landed as **M1–M10** in `AGENTS.md §7.4` + the audit §2 — responsibility-not-line-count, Rule of Three, named steps over narrating comments, why-vs-what comments, types-as-documentation, no-throw-across-a-degrading-seam, DAMP tests, import order and no second binding for a canonical constant, no file outside the checked graph (enforced by G37), and advisory bands where >1 000 is a split candidate by default. The audit measured the whole surface (524 files / 92 254 lines, median 109) and found **seven concentrated outliers** rather than a codebase of monoliths: four genuine multi-responsibility files (`cli-game.ts` 5 770 · `gates.ts` 2 042 · `TaskRenderers.ts` 1 878 · `AgenticOrchestrator.ts` 2 878), three carrying embedded data or one long function (`FallbackProvider.ts` · `ContextPipeline.ts` · `sessionRuntime.ts`), and a Tier C list recorded so the large-but-cohesive files (`CCIEngine`, `delegate.ts`, `GameLoop.ts`, the DQM test files) are not "fixed" later. **Verified:** tsc 0 · build 0 · **1 514 tests (133 files)** · **37 kernel gates** · 23 doc gates · lint clean · both modes exit 0, complete a session and persist the checkpoint. **Carried:** d3 (the CLI split + calibration extraction — Q10's ruling stands), d6 (Laya), d7 (K1); the cohesion audit's split backlog items 2–7; F7/F9. |
| 2026-09-24 | **Phase 14 d6 + d7 BUILT — the System-1 boundary and the K1 probe-validation protocol.** **d6:** `core/personalization/system1Port.ts` holds the three ratified surfaces (tag resolution, reading proposal, neighbour prefilter) behind one port, plus the deterministic fallback, the vocabulary guard and the agreement decision; `infra/llm/LayaSystem1Adapter.ts` is the reference implementation (bounded json-in/json-out per op, never throwing, per-adapter memo so a model answer informs the NEXT decision rather than the one in flight). Four findings during the build: (1) the guard called `orElse()` OUTSIDE its try, so a throwing *fallback* escaped a seam documented as total — fixed, and the seam now degrades to `undefined`; (2) the prefilter guard accept-or-rejected, which discarded a candidate's useful reordering to punish one invented id — narrowing is that op's nature, so it now filters; (3) **G38 fired on itself** — a substring test matched the doc-comments that *name* the adapter, so the assertion now matches the import syntax (the class `DG20` documents on its own fixture); (4) `adjudicateCohort` initially synthesised a placeholder probe to satisfy a signature — removed, because a placeholder in a validation path is exactly the kind of thing the protocol exists to prevent. **d7:** the protocol's executable half in three modules by responsibility; **RV1 measured per known-answer condition and reduced to the weakest** (the pooled version rated a conforming cohort 0.33 — the module doc records the error), RV3 scored only where the archetype is a pole of that probe, `insufficient` kept distinct from `fail`, RV7 retiring instruments on VALIDATED readings only, and a synthetic pilot that labels its thresholds `provisional-synthetic-pilot` and cannot write `rvPassed`. `scripts/probe-pilot.ts` (read-only `probe` class) prints the standing: 8 probes, no instrument defects, 8 undecided with no real cohort. **Verified:** tsc 0 · **1 556 tests (135 files)** · **38 kernel gates** · 23 doc gates · lint clean. **Remaining: d3.** |
| 2026-09-24 | **The module-cohesion backlog is worked — five of eight items closed, and the two large ones have a verified first stage (`docs/audits/MODULE-COHESION-AUDIT-2026-09-24.md` §4).** Every split here was *regenerated from the pre-split file* rather than patched, and every one was checked for losslessness before it was trusted: the first attempt at both `gates.ts` and the CLI produced exactly the defect the check exists to catch (a line-range cut duplicated doc-comments and stranded gate headers; a scanner that did not treat `async function` as a declaration deleted two async functions along with the block preceding them). **Item 2 (`gates.ts`, 2 042 → 33):** nine family modules under `validation/gates/` named for the DOMAIN they assert — `plumbing` · `roster` · `trajectory` (G1–G9) · `veil` (G10–G12) · `curriculum` (G17–G21) · `orchestration` (G14/G15/G26) · `personalization` (G22–G25/G27) · `memory` (G28–G35) · `surface` (G36–G38) — with `gates.ts` as the re-export index; the landed families are named differently from the audit's proposed list, and the audit now says so, because a proposal a reader might chase is worse than no proposal. **Item 5 (`FallbackProvider.ts`, 1 632 → 558):** the corpus moved to `fallback/data/` (schema + five family modules, 98 pools) and the provider kept the routing tables, the reframe layers and `getFallback` — the file was 1 300 lines of prose around 300 lines of logic, so a wording change read as a selector change. **Item 3 (`TaskRenderers.ts`, 1 873 → 127):** six files under `renderers/` plus an index that re-exports the 24 renderers BY NAME (not `export *`, so the family files keep their palettes and tables private) and keeps `getRenderer`, whose dispatch table is the one reader of the whole set; the return shape became the named `TaskRenderer` instead of 24 inline repeats. **Item 7 (`sessionRuntime.ts`, 926 → 56):** nine modules under `sessionRuntime/` behind an index that the doc-comment now describes as *the* seam (`M6` — a seam is an INTERFACE contract, not a file), so the split cannot be read as permission to reach past it. **Item 1 stage A:** `scripts/cli/` gained `config.ts` · `data.ts` · `render.ts` (613 lines out of the runner) and `tests/cli/RenderHelpers.test.ts` is **the first unit test the CLI has ever had** — it locks the Veil felt-sense bands, which is precisely the kind of thing that drifts silently when the only way to read it is a session; stages B (flags) → C (printers) → D (commands + flows) are written into the audit with their prerequisites. **Item 4 collaborators 1–2:** `assessments/shadowSignals.ts` (both projections of ONE reading, so the quadrant detector and the write-in mapping cannot drift; precedence and substring matching are now locked rather than folkloric) and `assessments/promptBlocks.ts` (the journey blocks, with a dead `passed` branch in `briefHistory` collapsed rather than preserved — a conditional that changes nothing is a claim about behaviour that is not true). **Verified:** tsc 0 · build 0 · **1 611 tests (140 files)** · 23 doc gates · lint clean · arch 0 violations · G36 still boots both `SESSION_MODES`. |
| 2026-09-24 | **Cohesion item 1, stages B + C — the runner's invocation state and its printers have owners (`docs/audits/MODULE-COHESION-AUDIT-2026-09-24.md` §4).** **Stage B (`scripts/cli/flags.ts`, 131 lines):** the parsed option state moved behind explicit setters, and `setInvocation` now computes the `VERBOSE = RAW_VERBOSE && DEV_MODE` relation ONCE instead of at every reader — the scattered derivation was invisible while the state was module-level. `HEADLESS` stays the one deliberate `let` (the non-TTY guard in `main()` flips it) behind `setHeadless`. **Stage C (`scripts/cli/output.ts`, 342 lines):** the 15 flag-READING printers (`banner`/`info`/`success`/`warn`/`error`/`separator`/`verbose`/`emitEvent`/`emitDevPrimitives` + the session renderers) plus `readActiveFocus`, which exists only to be printed and was reached for twice at its two call sites. The runner is **5 770 → 5 483 → 5 199** lines. **The stage's real yield is the seam it makes explicit:** `render.ts` is the PURE half (imports no state, unit-tested by `tests/cli/RenderHelpers.test.ts`), `output.ts` is the flag-reading half (exercised by `tests/cli/CliMatrix.test.ts`) — before this split there was no line between "what to display" and "whether to display it", which is why neither half could be tested. **Two defects were caught by the losslessness check, not by `tsc`:** the block scanner swallowed the trailing `program.parse()` invocation block into the new module — leaving the CLI parsing *nothing* while still type-checking clean — and mis-scoped import pruning dropped `Option` from `commander`, silently resolving it to the DOM global `HTMLOptionElement`. Both are invisible to a compiler at the seam (the moved code compiled, the entry compiled), which is the argument for the check being part of the recorded method rather than an optional extra. **Verified:** tsc 0 · **35 CLI tests (3 files)** · `--help`/unknown-command/`--headless --encounters=1 --json` all exit 0 with `session_ended` · live smoke against a throwaway `MYSTERIUM_HOME` · losslessness: every code line of `output.ts` exists verbatim in the pre-stage runner. |
| 2026-09-24 | **Cohesion item 1 COMPLETE — Stage D: the commands and the session flows have modules, and the runner entry is 775 lines (`docs/audits/MODULE-COHESION-AUDIT-2026-09-24.md` §4).** The 4 294 remaining lines moved as six leaves in dependency order — `support.ts` (495, the shared bottom of the call graph) → `onboarding.ts` (537, calibration + default significator + `setup`) → `profileCmd.ts` (883) · `practiceCmd.ts` (291) · `delegateCmd.ts` (242) → `runtime.ts` (2 246, `executeEncounter` + the agentic drill + the two session flows) — so no import cycle could form. The flows moved LAST (the audit's sequencing ruling) because they own the checkpoint/journal writes `G36` asserts; the verification is therefore the strongest in the sequence: **G36 boots both modes headless and requires a persisted checkpoint**, `tests/cli` green (38 including the DelegateArgs collision guard, re-pointed at the new module), live smoke of `--headless`/`--mode=story`/`status --json`/`delegate --help` all exit 0. **The depth-normalized losslessness check found 4 intentional deltas, and they are the split's real finding:** the flows read `program.opts().llm`, `opts.audit` and `llmComplete` — three start-up values captured OUTSIDE the flags owner, re-pointed to `HEADLESS_LLM`/`AUDIT`/`LLM_ACTIVE` in `flags.ts` so every module now reads invocation state from exactly one place. Mechanical casualties of the move (all caught and fixed): the block scanner's quote artifacts on generated import lines (fixed line-wise), `clackText`/`DynamicLLMConfig` imports the pruner dropped, `VowFileShape` stranded in the entry while its users moved, and `resolvedLLM` — a start-up local — re-resolved in `profileCmd` from `loadConfig()` rather than exported out of the entry. **The runner is 5 770 → 775 lines; `scripts/cli/` is 5 531 lines across 11 modules, each with one responsibility and a stated seam.** **Verified:** tsc 0 · **1 617 tests (141 files)** · build 0 · workspace-lint 0 · arch 0 violations (23 gates). **Carried:** item 4 collaborators 4+ (task presenters), C6 (GitLab credentials). |
| 2026-09-24 | **Cohesion item 4 COMPLETE — the AgenticOrchestrator's last collaborators leave the class (`docs/audits/MODULE-COHESION-AUDIT-2026-09-24.md` §4).** `taskPresenters.ts` (161 lines) holds the three presenter methods — the modality→task preference order, the per-modality fallback generator, and the narrative framing that turns a task into the question the player answers. The extraction's design point is the state boundary: `presentModuleTask` now receives `history` and the `uiHandler` as PARAMETERS (the class no longer owns what the presenter reads), while the trial-evaluation wire-back moves to explicit accessors (`setRendererEvaluate`/`rendererEvaluate()`/`taskStartTime()`) so timing+accuracy capture is wired identically but the handoff is greppable rather than a private field two methods happen to share. The forced-shadow path's evaluator guard was captured ONCE (`const currentEvaluate = rendererEvaluate()`) instead of calling twice — the second call could theoretically observe a different evaluator than the first. Transform-normalized losslessness: 6 deltas, all the deliberate transforms (field→accessor, `this.X()`→`X()`). **The orchestrator is 2 878 → 2 629 lines; what remains is the encounter loop itself, which is the class's one responsibility.** **Verified:** tsc 0 · **1 617 tests (141 files)** · build 0 · workspace-lint 0 · arch 0 violations. **Cohesion backlog: all eight items closed.** Carried: C6 (GitLab credentials). |
| 2026-09-24 | **Phase 14 d3 BUILT — Phase 14 is COMPLETE; the module-cohesion backlog is fully closed (`docs/audits/MODULE-COHESION-AUDIT-2026-09-24.md` §4).** d3 landed as the two ratified halves: Q10's calibration extraction (`src/core/usecases/InitialAltitudeInference.ts` + `QuickCalibrationScoring.ts`, so calibration is engine code, not a CLI ladder) and the four-stage CLI split (A `config`/`data`/`render` → B `flags` → C `output` → D `support`/`onboarding`/`profileCmd`/`practiceCmd`/`delegateCmd`/`runtime`). The entry is **5 770 → 775 lines**; `scripts/cli/` is 5 531 lines across 11 modules. Every stage was verified by a losslessness check against the pre-stage file (the check that caught a swallowed `async function` and a mis-scoped import — neither visible to `tsc`) and locked by **G36**, which boots both `SESSION_MODES` headless and requires a persisted checkpoint. **Verified:** tsc 0 · **1 617 tests (141 files)** · build 0 · workspace-lint 0 · arch 0 violations (23 gates). **Documents reconciled in the same commit:** `AGENTS.md §4.2`'s heading and body still declared Phase 14 "IN PROGRESS … d2c/d3/d4/d5 pending" and `d3–d10 remain open` for Phase 13 — both stale since 2026-09-24 and both corrected here. Carried: C6 (GitLab credentials), F7/F9 (`CHECKED-SURFACE-AUDIT-2026-09-24` §11). |
| 2026-09-24 | **The evidence frontier identified; Phase 15 (the Simulated Cohort) PROPOSED — awaiting ratification.** A tree-verified finding: the **live seam has no long-horizon exerciser**. `createOrchestrationServices` has exactly two production callers (the CLI and `src/lib/engine/gameEngine.ts`), and `runPersonaTrajectory` drives the *kernel* directly (`tickWithStrategy` → `processOutcome` → `applyConsequences` → `applyResponseOnly` → `endSession`) with no services — no envelope, no bands, no checkpoint, no journal, no council dispatch — over 2–6-session trajectories. So `G22`–`G35` exercise personalization/memory in isolated fixtures and `G36` boots the CLI once; **nothing runs many sessions over trajectory time through the live seam**, which is why the calibration list (RV1–RV7 real-rater thresholds, `expansionRatio`, entropy floors, per-line saturation) has no distributions and why the architecture's central claims — persona adaptation, transformation over time, composition variety that does not collapse — have no evidence. **Phase 15 is written into §4 as PROPOSED** (d0 the carried F7/F9, d1 the campaign runner through the live seam with per-session checkpoint restore, d2 a generated cohort, d3 the campaign time-series, d4 the calibration pass labelled `provisional-simulated-cohort`, d5 gates **G39** continuity + **G40** invariants/discrimination, d6 the report), with one hard constraint: the hermetic (stub-provider) tier gates CI, the experiential (real-provider) tier produces the qualitative read, and the two are never mixed. `AGENTS.md §4.2` gained open-list **item 4** (this finding) and amended items 2–3 (the wiring list is empty — closed by Phases 13/14; calibration is now phase-able). Three forks are put to the user: F-1 F7's disposition, F-2 the spine (cohort vs WebUI parity vs corpus depth), F-3 cohort scale + whether the experiential tier is authorised now. |
| 2026-09-24 | **Phase 15 d0 BUILT — F7 wired and F9 closed, so the cohort harness will have the free-text evidence it calibrates against.** **F7 (user ruling F-1: wire it):** `writeInValue`/`questionText` are declared on `ConsequenceRecord` with the why-on-the-record doc-comment (an evaluator score reads what the encounter made of the player; these read what the player made of the encounter), carried by `processOutcome`, and set on **both** orchestrator finalise paths. The CLI now reads them from the record (`cr.writeInValue` / `cr.questionText`), replacing two other sources for one fact — `outcome.playerWriteIn` and a private orchestrator field reached through `as any`. **The extraction found a second defect inside the field F7 was about:** `_lastQuestionText` was assigned the composed `fullPrompt`, so the field named `questionText` held a narrative intro glued to the question — and the encounter log slices to 500 characters, so a long intro could push the actual question out of the evidence the log, the campaign series and session synthesis all read. It now holds the question; what is *asked* is still `fullPrompt`. **The live smoke then showed the log rendering `**Question:**` followed by a blank line**, the label detached from its content, so `appendEncounterLog` collapses whitespace per value — the log's one-labelled-line-per-field contract is now locked by `tests/infra/EncounterLog.test.ts`, which also proves the focus extractor can read a question back out of the echo path. **F9: claim deleted, not re-authored.** The `QUADRANTS`/`QUADRANT_ALIASES` declaration was already replaced in d2a by a RETIRED note naming the step that does not happen; re-authoring it would encode a normalisation nothing performs. The §2 extraction keeps its fail-closed all-4-quadrants check, which is the enforcement that actually catches heading-shape drift. **Verified:** tsc 0 · **1 623 tests (142 files, +6)** · build 0 · workspace-lint 0 · arch 0 violations (23 gates) · live `--headless --json --new-game -e 2` exit 0 with clean `**Question:**` lines. **Next: d1 (the campaign runner through the live seam).** |
| 2026-09-24 | **Phase 15 d1 BUILT — the live seam has a long-horizon exerciser, and it immediately found two things.** `src/core/simulation/campaign.ts` runs one persona over N sessions through the architecture-live path (services created per session, encounters via `buildEncounterOrchestrator` + `run()` + `responseFromRecord`, `applyResponseOnly` for the matrix/transformation advance, checkpoint captured at each session's end and READ BACK from the throwaway root at the next session's start); `scripts/cohort-run.ts` (`npm run cohort`) prints one NDJSON row per session per persona. **The extraction that made "the same entry the CLI uses" true by construction:** `usecases/EncounterSession.ts` holds `buildEncounterOrchestrator` (the orchestrator params) and `responseFromRecord` (the response as a PROJECTION of the record, so a caller cannot construct a response that disagrees with the record about what happened) — the CLI's `executeEncounter` now delegates to both, and the campaign runner is the second caller that justified the move. **F7 was three sites, not one.** The LLM tool path populated the fields; `runFallback`→`runModuleAssessment` (the path EVERY production encounter takes, since the CLI always supplies a module) and the simple-fallback path set neither, so the encounter log, the campaign series and session synthesis saw no question and no answer for the ordinary run. All three now assign UNCONDITIONALLY, so an encounter offering no write-in CLEARS the previous one instead of reporting an earlier encounter's words as its own. The module path also had no way to report the question it asked (the renderer composes it), so `presentedQuestionText()` joins the presenter's existing `rendererEvaluate`/`taskStartTime` wire-backs. And the campaign's checkpoint was written once per ENCOUNTER under a per-session filename — every write but the last was work whose result was never read; it is now one per session, the CLI's shape. **First calibration finding (for d3/d4), recorded not fixed:** over 3 sessions × 4 encounters the drive observables are IDENTICAL across every persona — `driveWeights` moves (0.04→0.08→0.12) but `driveFixation` is 0 for all four drives and `shadowsSurfaced` is 0 for every persona, including `golden-bypass` and `constricted` which are authored to accumulate exactly that. Personas DO separate on `cci` (0.407 / 0.492 / 0.499) and on write-in count, so the stance reaches the engine — the drive/shadow channels do not move. That is the T2 pattern (a pinned number reads as a flat curve, not as a bug) and it is what the campaign existed to make visible. **Verified:** tsc 0 · **1 630 tests (143 files, +7)** · build 0 · workspace-lint 0 · arch 0 violations (23 gates) · live `npm run cohort -- --personas flourishing,constricted,golden-bypass` produces a differencing series with working per-session restore. **Next: d2 (the generated cohort).** |
| 2026-09-24 | **Phase 15 d2 BUILT — the cohort is a parameter space, not a list.** `src/core/simulation/cohort.ts` derives synthetic personas from declared dimensions (per-line altitude vector, drive tilt + direction, shadow quadrant + rate, stance, cadence in sessions/virtual-week, session + encounter counts, neglected lines) with `--generate N --seed S --axis dim:value` on `cohort-run`. Two design points carry the value: **the derivation is per-member** (`mulberry32(seed + hash(name))` rather than one shared stream), so member 3 is the same member whether the cohort is 10 or 40 — otherwise a sub-sample would be a different population from the one a gate certified; and **`--axis` holds exactly one dimension while the rest still vary**, which is what makes a sweep a controlled comparison rather than N copies of one persona. `neglectLines` is decided per ENCOUNTER, because the scheduler owns line choice — a persona cannot decline to be offered a line, so it declines the offer, which is the engine's avoidance path (`narrativeSummary === ''` → `isAvoided`) and exactly what the theta-decay assertion needs to observe. `cadence` converts to `gapDaysBeforeSession` (7/cadence), so cadence variation exercises theta-decay between sessions. `currentStage` and `driveTilt` are reportable but not settable — both are compositions of `altitudes`, so pinning them would pin a derivation rather than a dimension, and `--axis` rejects them by name. **Refinement to the d1 finding:** the generator showed shadows SUCCEEDING to accumulate for some configurations (`gen-7-2` surfaced 2 over 2 encounters, writeIns 2), so the flat `shadowsSurfaced` is persona-specific rather than systemic. `driveFixation` remains 0 across EVERY configuration observed — curated and generated, all four drives, all stances, with and without a drive tilt authored to fixate. That is now d4's first target rather than a note. **Verified:** tsc 0 · **1 642 tests (144 files, +12)** · build 0 · workspace-lint 0 · arch 0 violations (23 gates). Lives confirmed: `--generate 3 --seed 7` emits three differencing rows carrying their axis values, and one of them (`gen-7-2`, engaged, DarkAllergy@0.4) accumulates shadows. **Next: d3 (the campaign time-series).** |
| 2026-09-24 | **Phase 15 d3 BUILT — and the series immediately found the phase's largest defect, in the seam itself.** `src/core/simulation/campaignSeries.ts` builds one row per session over the seam's own record: per-line altitudes, shadow accumulation by quadrant, encounter provenance (cell × modality × tier × pole × execution mode × candidate source), composition entropy per cell with the visibility-collapse verdict taken from `diversityMonitor`'s OWN floor and noise minimum (not a re-declared threshold), the probe ledger, feed entries by writer, the polarity readings/tallies, and holon relationships. `OrchestratorResult` gained a `composition` stamp (`pole`, `candidateId`, `pairKey`, `proposedBy`) stashed beside the existing pair/pole state, so provenance is the pool's own decision rather than a re-derivation at the report site. The kernel's `Observables` is REUSED as one field — merging the two would force a kernel gate to import the personalization seam, which is the coupling `G2` prevents. **The producer rule is structural:** observables the plan names with no runtime producer are named in `UNAVAILABLE_OBSERVABLES` with the reason and omitted from the row (`memoryPageSize` — the page is built inside `buildEnvelope` and never returned; `renderBudget` — the assembled prompt is private; `engagementRegisterHits` — the register records mechanisms at authoring time, not hits at runtime), because a fabricated `0` is indistinguishable from a measured one. **The finding: `personalizationContext()` was called from `run()` and `runLanguageReflective` only** — both LLM-prompt paths. The module-assessment path (`runFallback` → `runModuleAssessment`: what runs when no LLM is configured or the call fails, AND what the hermetic tier runs) never called it, so on that path the pool never selected, `46 §11`'s monitors read an empty window, the polarity coverage query had no input at all, and no scenario seed / world place / persona voice / continuity line was gathered. Measured before: `candidateSourceShare: {unknown: 1}`, `compositionEvents: 0`, `composedCells: 0`, `polarityReadings: 0`. Measured after the one-line fix: provenance resolves (`npc` 0.75 / `composed` 0.5 / `recoloured-similar` 0.25 by session), poles resolve (`familiar` 0.75 / `unfamiliar` 0.25), `compositionEvents` 3–4, `composedCells` 2–3, `minCellEntropy` 1.099 against the 0.5 floor. This is Phase 13's failure class (*a consumer that no live seam calls*) one level deeper — inside a single method's branch — and it is invisible to any gate that calls `buildEnvelope` directly, which is every gate that touches the envelope today. **Carried for d4:** `polarityReadings` is still 0 (a reading needs BOTH `context.poles` and `context.polarity`; the composition's canon-level poles are not the dialectic engine's player-level ones), and `probeValidated`/`probeLogOnly` are still 0 (the probe offer path is not reached on a 4-encounter session). Both are now MEASURED rather than unknown, which is what d4 needs. **Verified:** tsc 0 · **1 650 tests (145 files, +8)** · build 0 · workspace-lint 0 · arch 0 violations (23 gates). **Next: d4 (the calibration pass).** |
| 2026-09-24 | **Phase 15 d4 BUILT — and its first run REJECTED on a real measured defect, which is the point of it.** `src/core/simulation/calibration.ts` + `scripts/cohort-calibrate.ts` (`@script-status: probe`) produce the numbers `AGENTS.md §4.2` item 3 has waited for, every output stamped `provisional-simulated-cohort`: composition entropy per cell against `46 §11`'s floor, the pole mix against `46 §5.2`'s `EXPANSION_RATIO_FLOOR`, per-line altitude/encounter/staleness distributions, candidate provenance, and the probe standing. Thresholds are IMPORTED from their owning modules (`ENTROPY_FLOOR`, `MIN_COMPOSITIONS`, `EXPANSION_RATIO_FLOOR`) rather than restated — a pass carrying its own copy would keep reporting confidently after the engine changed the number it is supposed to calibrate. Thin samples report `insufficient-data`, never `above-floor`. It may reject (exit 1 on an observed defect) and may never certify; it writes no threshold and never touches `rvPassed`. **The first run's numbers (13 campaigns / 26 sessions / 78 encounters):** **unfamiliar-pole share 19.2% against the 0.25 floor → REJECTED** — a comfort engine is the failure mode that floor exists to prevent, so this is the first calibration number the project has produced and it is below its threshold; composition reached **5 cells with 0 measurable** (below the 8-composition noise minimum, so the entropy verdict is `insufficient-data` and reaching it is a cohort-SCALE question); **`thetaStaleness` is 0.000 on every line** — a second pinned observable alongside `driveFixation`; and encounter traffic concentrates on Cognitive 26 / Intrapersonal 24 / Spiritual 24 against **0** for Emotional, Moral, Interpersonal, which is a scheduler line-coverage question rather than a persona one. Per-line saturation is reported as a distribution ON PURPOSE — the threshold does not exist until real curves do, and inventing one would be the fabricated-zero mistake in another costume. The MemoryPage budget is reported **unmeasurable with its reason** rather than inferred. **Verified:** tsc 0 · **1 657 tests (146 files, +7)** · build 0 · workspace-lint 0 · arch 0 violations (23 gates). **Next: d5 (gates G39/G40).** |
| 2026-09-24 | **Phase 15 d5 BUILT — the campaign is now the kernel's conscience (suite 38 → 40).** `gates/campaign.ts` adds **G39 campaign continuity** and **G40 campaign invariants**, registered in the roster. These are the only two gates that assert over a TRAJECTORY of sessions through the live seam — every other gate either drives the kernel's own loop functions or calls one seam function in isolation — and that is exactly why the d3 gap (`personalizationContext()` never called on the fallback path) was invisible to all 38 of the others: a gate that calls `buildEnvelope` itself cannot see that the orchestrator does not. **G39** asserts both properties the plan names: *determinism* (the same spec against two empty roots yields an identical series over `cci`, `finalized`, `totalEncounters`, shadows, pole mix, candidate mix and composition events — without it every d4 number has an unstated error bar) and *restore at EVERY boundary* (session N's restored byte count and reattached feed-entry count must match session N−1's file exactly, and the feed must GROW across the trajectory, so a restore that reset it cannot pass). **G40** asserts the four invariants: declared neglect is visible in the theta book and only there; the stage does not advance over the trajectory (transformation must not be an artefact of session count); no cell with enough compositions to be measurable has collapsed below the entropy floor; and no session's provenance carries Veil vocabulary. **A correction recorded, because the first reading was wrong and a gate would have been built on it:** d4's first run showed `thetaStaleness` 0.000 on every line, which reads as a second pinned observable. It is not — `observables.ts` deliberately computes the profile against the real `Date.now()` and min-max normalizes across lines so it is *invariant to wall-clock injection*, and a campaign on the VIRTUAL clock saturates every cell until `span === 0` and all lines report 0. The observable does what it documents; it is simply not fit for a virtual-clock campaign. G40 therefore asserts decay over `sig.theta.lastEncounter` directly, and fails explicitly if the theta book holds no cell for a neglected line so the assertion cannot pass vacuously. **Verified:** tsc 0 · **1 657 tests (146 files)** · build 0 · workspace-lint 0 · arch 0 violations (23 gates) · **suite 40/40 gates, G39 and G40 both hard-pass** with non-vacuous details. **Next: d6 (the formal report).** |
| 2026-09-24 | **Phase 15 d6 BUILT — the report; Phase 15 is COMPLETE (`docs/audits/CAMPAIGN-REPORT-2026-09-24.md`).** 50 campaigns (10 curated + 40 generated) · 100 sessions · **400 finalized encounters**, every number stamped `provisional-simulated-cohort` and reproducible from two commands. **It leads with the three defects the campaign found, not with the numbers**, because a reader has to know what the numbers mean first: (1) **the fallback path was not architecture-live** — `personalizationContext()` was called from `run()` and `runLanguageReflective` only, so on the module-assessment path (what runs with no LLM, AND the hermetic tier that gates CI) the pool never selected, `46 §11`'s monitors read an empty window, the polarity coverage query had no input ever, and no seed/world-place/voice/continuity material was gathered; (2) **F7 was three sites** — the module path and the simple-fallback path set neither `writeInValue` nor `questionText`, i.e. not on the path every production encounter takes; (3) **the encounter log rendered a detached label** (`**Question:**` then a blank line). **The numbers:** unfamiliar-pole share **21.0 % against the 0.25 floor → REJECTED**, and `shadow-facing` served **never** (stable across 78 and 400 encounters, so it is not noise); the recolouring tiers skew 5:1 familiar (`~sim` 13 % vs `~opp` 2.5 %), the same comfort shape at a second layer; **12.5 % of encounters resolve no candidate id**; composition is **unmeasurable** (12 cells composed, 0 with the 8 compositions `MIN_COMPOSITIONS` requires, so the verdict is `insufficient-data` and the earlier 1.099 reading on 2–3 cells is marked encouraging-not-evidence); and the line distribution is **Spiritual 138 / Intrapersonal 86 / Cognitive 73 / Interpersonal 32 / Willpower 10 / Somatic 7 / Moral 3 / Emotional 1** — **74 % of encounters on three lines, one encounter on Emotional across 400**, which makes scheduler line coverage a first-class object of study rather than a persona property. **Two observables are pinned or unfit, and the difference is recorded:** `driveFixation` is 0 in every configuration (pinned — the T2 pattern of Phase 14 d2a in a new location); `thetaStaleness` reads 0.000 everywhere but is **unfit rather than pinned** (it is deliberately normalized against the real `Date.now()` to be wall-clock-invariant, so a virtual-clock campaign saturates every cell until `span === 0`) — which is why G40 asserts decay over `sig.theta.lastEncounter` directly. **§5 states what the report is NOT:** the cohort is a parameter space, not a population, so it can report what the ENGINE does when handed a stance and never what players do, and it certifies nothing; transformation is asserted only where its predicate holds, and what the campaign CAN say is that it does not fire as an artefact of session count. **Seven open items carried in priority order** (novelty floor, `driveFixation`, line coverage, unresolvable candidate ids, the never-resolving pair key, entropy measurability, cohort scale). **Phase 15 d0–d6 COMPLETE. Verified:** tsc 0 · 1 657 tests (146 files) · build 0 · workspace-lint 0 · arch 0 violations (23 gates) · **suite 40/40**. |
| 2026-09-24 | **Campaign-report item 5 CLOSED — the dialectic loop was UNENTERABLE, and the fix found a second defect underneath it (`docs/audits/CAMPAIGN-REPORT-2026-09-24.md` §4.2 item 5; new gate **G41**, suite 40 → 41).** d6 measured `polarityReadings: 0` and named it a symptom. Following it found three defects stacked on one seam, all invisible to the other 40 gates because each lives in the COMPOSITION of two seam calls over time rather than in either call: **(1) The loop had no entry point.** `sessionEnd`'s state advance is the only `undiscovered` → `active-tension` writer, and its pair came from `AgenticOrchestrator.lastDialecticPair`, built from `context.poles` — the pair the dialectic engine *structurally selected*. But `46 §5.3` forbids selecting on an `undiscovered` pair, and a pair only leaves `undiscovered` through that very advance. Verified on a bench sweep: `poles` null in **24/24** envelopes while `polarity` was non-null in 16/24 — the pool selected a rendering, the engine never had a selectable pole. `lastPairKey` (and so the reading, and so the coverage query) inherited the null. **Fix:** the pair the encounter ENGAGED IN TEXTURE is now exposed on the envelope (`ScenarioContext.engagedPair` = the pool's primary candidate's first store-known tag + its dialectical opposite) and is the discovery writer's input. `46 §4.3`'s table explicitly permits this ("the *familiar* pole may appear as texture; the pair is **not** a structural candidate"), so §5.3 is untouched — texture engagement is not structural selection, and it is the one reading a stage cannot refuse. The orchestrator's comment already *claimed* this fallback; the claim is now implemented. **(2) The advance reconciled in a single sweep.** It mapped `active-tension` → `reconciled` on one `sto` encounter — against `46 §4.3`'s ratified law ("`reconciled` is reached only by *repeated* confirmations, never in a single sweep") and against `polarityResolution.applyReading`, which owns reconciliation through the confirmation tallies. Measured: `nature|technology` went `undiscovered` → `active-tension` → **`reconciled` on its SECOND encounter** with no tally behind it; since a reconciled pair is unselectable as a structural pole (§5.3's saturation guard), the bug permanently removed the player's only edge after two encounters. **Fix:** the advance DISCOVERS and no longer reconciles; reconciliation is solely the reading path's, under ratification. **G28's assertion** ("the polarity pair advanced twice: undiscovered → active-tension → reconciled") encoded the wrong law and was corrected to `active-tension` — its lateral is persistence, so it asserts the state persistence must carry, not a law another writer owns. **(3) The advance took its direction from a stashed field.** `lastPolarityDirection` was set by `finalizeEncounter`, but the **module-assessment path** — the one the hermetic tier and production-with-modules take — calls `recordSessionEnd` *without* `finalizeEncounter`, so the advance ran with `direction === undefined` and returned the map unchanged. Instrumented over 8 advances in a 2-session campaign: 6 had **both** pair and direction missing, 1 had a pair and no direction. This is the **third occurrence of one failure class** (d3's missing composition stamp, F7's missing write-in fields, now this): *a fallback path that stashes less than the path it mirrors.* **Fix that deletes the class rather than documenting it:** `recordSessionEnd` takes `direction` as a **required parameter**, so the ordering invariant three call sites violated no longer exists — the field is gone and the compiler enforces the handoff. **Measured after (50 campaigns / 150 sessions / 627 encounters):** `polarityReadings 243 · pairs discovered 80 · reconciled 0 · distinct pairs 4`, verdict `loop-unenterable` → **`loop-open`**. The unfamiliar-pole share moved only 20.6 % → 21.2 %, still under the 0.25 floor — which **proves report item 1 independent of item 5**; the new reading to watch is `distinct pairs 4` across 627 encounters (the engine's edge is thin), now the leading hypothesis for item 1. The calibration pass gained a `polarity` section for this, because a measure that returns zero for a STRUCTURAL reason must be reported by the instrument that produces it or its silence looks like health. **Documents reconciled:** `46 §4.3`'s loop paragraph gained its status mark + the entry rule (and the `undiscovered` table row now names texture engagement as the state's only exit), `45 §5.4`'s guard, the report's addendum + item 5, and `AGENTS.md §4.2` item 3. **Verified:** tsc 0 · **1 659 tests (146 files, +2)** · build 0 · workspace-lint 0 · arch 0 violations (23 gates) · **suite 41/41**, G41 hard-pass with non-vacuous details. |
| 2026-09-24 | **Phase 16 RATIFIED and d2 DIAGNOSED — the sweep repairs the instrument before it calibrates.** Two rulings, both conservative: **F-4** the novelty floor is NOT decided yet (fix the instruments, then re-measure — a floor calibrated against a broken instrument is the fabricated-zero mistake in another costume), and **F-5** the real-provider tier is NOT authorised for entropy (reshape the cohort cell-first; escalate only on demonstrated impossibility). Phase 16 written into §4 with d1–d7 and a gate per producer repaired. **d2's finding: `driveFixation` is a starved INPUT, not a pinned observable.** `fixationRisk` moves only in `updateDriveBalance`, and only for a drive carrying one of the four pathological signals — `HealthyBalanced` *decrements* it toward 0. The campaign never delivers one, for two independent reasons: (1) **`personaChoiceHandler` drops the stance it declares** — it reads only the option index and `narrativeSummary` from `persona.policy()`, so the `driveDirectionality` that same call computes from the authored `options.drives` is never consumed (the kernel harness passes it; the campaign cannot, because the orchestrator *derives* the evaluation) — which is why "with and without a drive tilt authored to fixate" made no difference: the tilt exists, it never arrives; (2) **the narratives are filler** (`personas.ts` emits 50 tokens of `w${(step*7+i)%50}`), so the module path's keyword-gated channel (`detectWriteInShadow`) can never fire. **Arithmetic confirmation, not inference:** `HealthyBalanced` is exactly `+0.01` weight / `−0.02` risk, and measured weights are **0.03 after 3 encounters and 0.06 after 6** — 1 × 0.01 per drive per encounter, all four drives, every persona including `golden-bypass` and `constricted`. The fix is thus a **ratification (F-6, open)**: route the stance through real prose (faithful to production, but `detectWriteInShadow` emits at most ONE drive's signal, so it cannot represent the 4-quadrant × 4-drive model the observable exists to watch) versus an explicit fixture-only injection seam — or both, for different gates. **Verified:** the harness defect is in `src/core/simulation/campaign.ts` + `src/core/validation/personas.ts` (fixture-side, no production behaviour changed); tsc 0 · 1 659 tests · arch 0 violations (23 gates) · suite 41/41. **Next: F-6 ruling, then d3 (scheduler line coverage).** |
| 2026-09-24 | **Phase 16 d2 BUILT — `driveFixation` is a live observable, on both channels (F-6 ratified: BOTH).** The item read as the second pinned observable; it was a starved input. Both repairs landed, because they answer different questions. **(a) Prose, for the end-to-end question:** `personas.ts` gained a `prose` option, and the personas carrying a shadow stance now write in the vocabulary that stance would use, so `detectWriteInShadow` — the module path's ONLY route to a non-healthy drive signal — is exercised as production exercises it (every line ≥ 40 words, matching the depth estimator's full-bonus length). The filler default stays for personas with no shadow stance, since it keeps the word-count heuristics measurable without injecting vocabulary the other channel reads. **(b) A fixture-only seam, for the coverage question:** `declaredDirectionality` on the orchestrator and on `EncounterSessionInput` replaces the derived directionality, because the derivation emits at most ONE pathological signal per encounter and so cannot express the 4-quadrant × 4-drive model the observable exists to watch. **No production caller sets it** (a declared stance in production would assert a player's evaluation instead of measuring it, `43 §4.1` L4) and `EncounterProvenance.declaredStance` records the channel, so a reading is never credited to the wrong one. **Measured, both channels firing:** `golden-bypass` surfaces `GoldenAddiction` from its own prose with `Eros` **0.13 → 0.53**; `constricted` reaches **Communion 0.07 → 0.31** through the declaration (its `avoid: true` empties the write-in, so prose cannot serve it — exactly why (a) alone was insufficient); generated members move only their authored drive. **Locked by G42** (suite 41 → 42), which asserts the stance moves the **declared** drive, **only** it, that it **accumulates**, and that every contributing encounter is **attributed**. **Two corrections recorded rather than papered over:** (1) G42's first draft asserted `rate × encounters` and FAILED (0.53 vs 0.20) — the advance runs more times per encounter than the orchestrator's evaluation, so the true rate is a fact about the seam's CALL GRAPH, not about `updateDriveBalance`; the gate now asserts drive + direction + attribution, because a gate encoding a wrong call-graph model is the fabricated-zero mistake one level up. (2) **New, unfixed, carried into the sweep:** the kernel harness drives personas with a CUMULATIVE `step` while the campaign passes a per-question step plus a session-label HASH offset, so step- or session-indexed stances resolve differently in a campaign than in a trajectory — `therapy-arc` declares a surfacing arc and produced 0 shadows in a 2-session campaign while its kernel gate G4 passes. That is a harness-fidelity gap, not an engine one, and item 1's re-measurement inherits it. **Verified:** tsc 0 · **1 659 tests (146 files)** · build 0 · workspace-lint 0 · arch 0 violations (23 gates) · **suite 42/42**. **Next: d3 (scheduler line coverage).** |
| 2026-09-24 | **Phase 16 d3 DIAGNOSED — line coverage is decided by a hash, not by a policy.** The item read as "scheduler line coverage"; it is narrower and more serious. **Not supply:** the bench world has 3 holons per line, same stages, all active. **Not the priority formula:** measured over the first tick's 72 candidates the per-line mean priority spans **0.145–0.147**, and five of the eight criteria (`thetaUrgency`, `shadowActivation`, `driveCorrection`, `narrativeCoherence`, `masteryAlignment`) are **0.000** at session start — so ONE tie band holds **65–72 of 72** candidates and the band's comparator, not `computePriority`, selects the encounter. **It is the comparator's key order:** logged per tick, the winner and the starved line's best candidate BOTH carry a modality absent from the last 3, BOTH a line absent from the last 2, and BOTH equal familiarity — rules 1, 2 and 3 tie, so rule 4 `refHash(moduleRef)` decides. A hash is static, so it decides the SAME WAY every time; the only tick-to-tick change is which modalities sit in the 3-encounter recency window, which is why the rotation cycles through just Spiritual/Intrapersonal/Cognitive at the 74 % share measured. `24 §3.3` names that hash as "deterministic final key — reproducibility" and the doc-comment above it warns about reading the right END of `world.recentEncounters`: careful reasoning applied to a fallback that is in practice doing policy work. **This is not a fixture artefact** — the same `scheduleNext` → `rankCandidates` path runs in production, so a real player's line coverage is hash-decided too, and the personas DO differ on stance; they are simply never offered the lines. **The repair is a ruling (open):** a **starvation term ahead of the hash** (time since a line was served, or its share of the eligible set). The canon argument FOR it: `24 §3.3` already owns variety, the band is defined as candidates whose developmental value is indistinguishable, and `46 §11`'s visibility-collapse countermeasure plus `AGENTS.md §5.6`'s holonic-integrity commitment ("lower stages must remain healthy") both make coverage a developmental rather than administrative value. The argument AGAINST: asking a reproducibility key to carry policy is the actual defect, but a starvation term inside the band is a second policy layer where canon names three rules — so the precedence must be stated, not assumed. **Verified:** the diagnosis is measurement-only (probes deleted, no production behaviour changed); tsc 0 · 1 659 tests · arch 0 violations (23 gates) · suite 42/42. **Next: d4 (unresolvable candidate ids), then the d3 ruling.** |
