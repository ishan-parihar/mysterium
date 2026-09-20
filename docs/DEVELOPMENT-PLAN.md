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

> **This section was stale from 2026-09-16 to 2026-09-20.** It described G-A…G-F as
> "spec'd but absent" while §8/§9 recorded them implemented; `AGENTS.md §4.2` inherited the
> staleness and declared Phase 1 current. An agent reading the root protocol would have rebuilt
> finished work. Re-verified 2026-09-20 — every row below now cites the code that closed it
> (recorded as `MY-AD-0017`).

| Gap | Spec | Closing evidence | State |
|---|---|---|---|
| **G-A: Delegation kernel** | 43 | `src/core/orchestration/{types,sessionLog,delegate,orchestratorTools,choicePolicy}.ts`; kernel gates **G14/G15** in `src/core/validation/gates.ts` | ✅ closed |
| **G-B: Practice tools** | 39 | `src/core/practice/practiceTools.ts` (`validatePracticeLoop`) wired into the kernel | ✅ closed |
| **G-C: Cohort pods** | 38 | `src/core/pods/podStateMachine.ts` + `src/infra/pods/PodTransport.ts`; **G18** privacy wall | ✅ closed |
| **G-D: Measurement packs** | 40 | `src/core/packs/{PackEngine,referencePacks,ReliabilityCollector}.ts`; **G19** | ✅ closed |
| **G-E: K-12 corpus** | 37 | `src/core/curriculum/data/*.foundations.json` (language-arts, arts, music, second-language, civics, health) + `scripts/author-k12-branches.py` | ✅ closed |
| **G-F: Credentialing** | 41 | `src/core/credential/ClaimLedger.ts` + `exportRPLPortfolio`; **G21** | ✅ closed |
| **G1 — Corpus depth** | — | 64/64 concept modules; 64/64 stage-holon cells; 108 curriculum holons, 0 lint errors | ✅ closed |
| **G2 — Play-route thinness** | — | Phase 6 parity harness proved browser binding ≡ kernel loop; `tests/engine/TrainingBeatParity.test.ts` | ✅ closed |
| **G3 — Onboarding composite** | — | `src/core/onboarding/BinarySearchPlacement.ts`; **G20** placement convergence (≤8 probes) | ✅ closed |
| **G4 — Orchestration stagnation** | — | 18 roles dispatch their complete allowlists through `delegate`; `scripts/cli/delegateArgs.ts` + `tests/cli/DelegateArgs.test.ts` | ✅ closed |

### 2.1 The true gap list is now somewhere else — deliberately

The remaining work is **not** a set of missing subsystems; it is (a) *ratified laws with no
consumer*, and (b) *documentation and knowledge-base integrity*. Both are tracked in the
record layer, which owns them — this plan owns **phase order and gates**, and must not
restate their contents (uniqueness principle):

- **Ratified laws awaiting implementation** — `AGENTS.md §4.2` §"current work" and the AD/RG
  ledger: `MY-AD-0006` (register classes), `MY-AD-0007` (one articulation ladder),
  `MY-AD-0008` (alignment bias — seam present, consumer absent), `MY-AD-0009` (two-fold world
  memory + per-holon owner worker), `MY-AD-0010` (background workers), `MY-AD-0011`
  (integrated human intervention), and the Auditor Projection Layer (`16 §2.4/§10.4`).
- **Documentation + KB integrity** — `_org.yaml → pending`: `CODE-PASS`, `RT-*` (gate
  fixtures, corpus reconciliation, organ-dir attribution, migration archiving) and `KB-*`
  (orphan-script triage, the six undocumented organs, skills provenance, `validate --json`,
  canon→code ingest).

Neither list is duplicated here. Run `python3 scripts/arch.py related <ID>` for any of them;
run `python3 scripts/arch.py validate` for the gate state.

## 3. Sequencing logic (why this order)

The dependency spine is: **nothing above the orchestrator can be honest until the
orchestrator can delegate** (43's L4 single-writer law). Practice tools (39) need a
delegable Reviewer; packs (40) need delegable S1 agents; pods (38) need witnessing
agents + practice tools. K-12 corpus (37) is orthogonal (data work) and feeds the
Teacher council once it exists. Credentialing (41) needs packs for claim evidence.

```
Phase 1  G-A delegation kernel ──────────────┐
Phase 2  G-B practice tools ─────────────────┤
Phase 3  G1 corpus expansion (parallel) ─────┼──► Phase 4 G-C pods
Phase 5  G-D packs ──────────────────────────┤
Phase 6  G2 WebUI play parity ───────────────┤
Phase 7  G3 onboarding composite ────────────┤
Phase 8  G-E K-12 corpus ────────────────────┤
                                             └──► Phase 9 G-F credentialing
```

Phases 3/8 are corpus work runnable in parallel; 6/7 are UX-integrity work that can
interleave after Phase 2. The gate discipline below makes each phase independently
verifiable.

## 4. The phases

Every phase: workspace-lint → build → full test suite → invariants → the phase's gates
→ doc updates (concept→foundations feedback loop per AGENTS.md §3) → commit → push to
BOTH remotes. Kernel gates G1–G21 stay green throughout (regression discipline).

**Phases 1–9 below are implemented and gated** (see §8, §9, and the closure evidence in §2); they
are retained as the record of *order and gates*. **Phase 10 is the first phase ratified after this
plan** and is the only outstanding build work — it is spec'd and not yet built.

### Phase 1 — Delegation Kernel (G-A) — ✅ implemented

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

**Gates:** G14/G15 green; G1–G13 unregressed; a headless CLI delegation smoke
(`mysterium session --delegate T1` proving spec→log→ratify→commit).
**Duration:** ~1 week. **Risk:** AgenticOrchestrator's in-process loop must not fork —
delegation wraps it, never bypasses the GameLoop.

### Phase 2 — Practice Tools on the Live Loop (G-B)

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

### Phase 3 — Corpus Expansion (G1) — parallel track

1. Stage-holons 56 → 64 (the 8 missing cells; red-layer pattern reused).
2. Encounter-content depth: each cell ≥3 modality variants (from the 64 modules'
   concept-draft templates, LLM-assisted authoring with the 32 linter as QA).
3. Curriculum corpus: +4 branches (bio, chem, history, geography) with prereq graphs.
4. Corpus-integrity gate in the kernel: every (line, stage, modality) triple
   resolvable; no orphaned concept IDs.

**Gates:** coverage report 64/64 cells × 7 modalities; corpus-integrity gate green.
**Duration:** ~2 weeks (content-heavy). **Parallelizable** with Phases 2–5.

### Phase 4 — Cohort Pods (G-C)

1. `PodDO` Durable Object (38): membership, shared ritual state, event log.
2. Witness pipeline: `witness_objective` → pod event → recognition evidence (38 M2),
   journal-consent-gated.
3. CLI + WebUI pod surfaces (roster, ritual calendar, recognition view).
4. Kernel gate **G17**: two-persona pod simulation — witnessed objective produces
   recognition evidence without journal text crossing the client boundary.

**Gates:** G17; DO local dev (wrangler) verified; scope-fence assertions (38's NOT-list)
as kernel assertions. **Duration:** ~1.5 weeks. **Depends:** Phases 1–2.

### Phase 5 — Measurement Packs (G-D)

1. Pack contract types + loader (40 §contract): manifest, instruments, scoring harness,
   reliability metadata.
2. Two reference packs (cognition: the canonical task set; language: vocabulary/
   comprehension) with test–retest and parallel-forms data collection in-app.
3. S1 Pack Agents as delegable roles; pack results stream into skill-theta (40).
4. Kernel gate **G18**: pack scoring determinism + the reliability-gate firewall (no
   pack feeds growth narrative until reliability passes).

**Gates:** G18; both reference packs pass reliability collection scaffolding.
**Duration:** ~1.5 weeks. **Depends:** Phase 1.

### Phase 6 — WebUI Play Parity (G2)

1. Play route: full encounter rendering across the 7 modalities (TaskRenderers parity
   with CLI), checkpoint save/resume, Veil-compliant feedback presentation.
2. Session strategy surface (27) visible in-UI; delegation presence indicators (43 §3.3)
   — which council members are "in the room".
3. Kernel: WebUI parity harness reuses the validation personas through the browser
   engine binding.

**Gates:** persona parity CLI↔WebUI (same evidence → same observable projection);
a11y pass; mobile viewport. **Duration:** ~1.5 weeks. **Depends:** Phase 1 (presence).

### Phase 7 — Onboarding Composite (G3)

1. Implement `ONBOARDING-REDESIGN-PLAN.md`: binary-search composite over the 8 lines →
   Significator seeding; placement via A4 Calibrator delegation.
2. Replace the legacy probe flow behind a feature flag; kernel personas gain a
   placement persona.

**Gates:** placement persona converges in ≤8 probes (08's psychophysics budget);
Significator seeded within tolerance of the calibration ground truth.
**Duration:** ~1 week. **Depends:** Phase 1.

### Phase 8 — K-12 Corpus (G-E)

1. Subject→line mapping data (37's table) as registry data; grade bands as authoring
   metadata only (42's blindness law — enforced by G11 already).
2. Corpus: math/CS expansion + the 4 new branches to full K-12 span; authoring-guide
   conformance (37's rejection list applied).
3. Teacher-council readiness: T1/T2 mandates resolve against the expanded graph.

**Gates:** G11 green against the expanded corpus; corpus-integrity gate; sample
trajectory renders K-5 → undergraduate on one branch.
**Duration:** ~2 weeks. **Depends:** Phase 3 (corpus infrastructure).

### Phase 9 — Credentialing Surfaces (G-F)

1. Claim-based credential ledger (41 §contract) — local-first, export as VCs.
2. Pack-evidence → claim → VC pipeline (41's evidence chain), consent-gated.
3. RPL evidence export format for partner institutions (41 P3).

**Gates:** G18 evidence-chain gate extended (claims trace to pack reliability status);
consent firewall (identity never in credential payloads).
**Duration:** ~1.5 weeks. **Depends:** Phase 5.

### Phase 10 — Generative World & Personalization (ratified 45 / 46 / 47) — ⬜ spec'd, not built

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
- **G1–G21 unregressed** throughout.

**Duration:** ~3 weeks (facet compilation and the probe set are content-heavy).
**Depends:** nothing outstanding — Phases 1–9 are closed.
**Risk:** the facet compiler is the single point where 512 prose documents become data. If it is not
*the only* path, corpus and store diverge silently — the failure class `RT-CORPUS-RECONCILE` tracks.

### Current work (post-plan) — not a phase

All nine phases are closed; what remains is listed in §2.1 and owned by the record layer. When
current work is described to an agent, cite `AGENTS.md §4.2` (which now carries the true state)
and the ledger — never a phase number. **Phase 10 is the exception**: it is a scope'd phase whose
deliverables were ratified after this plan, and it is the only outstanding build work.

## 5. Standing work-streams (not phases — continuous)

- **Validation-kernel growth:** every phase adds its gates (G14–G18); personas grow
  with features. The kernel is the project's regression conscience.
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
