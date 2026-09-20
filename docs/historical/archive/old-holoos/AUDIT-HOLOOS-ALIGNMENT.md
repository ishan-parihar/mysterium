# Mysterium × HoloOS Alignment Audit, Refactor & Plan

| | |
|---|---|
| **Branch** | `audit/holoos-alignment` (off Mysterium `main` HEAD) |
| **Date** | 2026-07-03 |
| **Auditor** | Z.ai audit agent (read-only investigation; surgical fixes applied on branch) |
| **Scope** | Mysterium `main` HEAD vs HoloOS `_THEORY/02_Ontology` HEAD |
| **Source truth** | HoloOS ontology — canonical anchor: `02.1_Microcosmic_Metabolic_Architecture` (the Lesser Cycle M·P·C·E) |
| **Method** | Three parallel deep-read agents (HoloOS ontology catalog, Mysterium ontology + prior-audit catalog, Mysterium source code audit) plus first-person verification of top hotspots |
| **Deliverables on this branch** | This report; surgical fixes for the 4 highest-leverage hotspots (see §5) |
| **Format** | Single non-fancy Markdown file. No styling, no emoji, no cover page. Plain headings, tables, and code blocks. |

---

## 0. Executive Summary (TL;DR)

### 0.1 Top 5 findings

1. **Mysterium's ontology is not stratified.** HoloOS separates `ai-draft → canonical-hypothesis → canonical → superseded` and labels every claim. Mysterium's `docs/foundations/` mix Ra-material cosmology (metaphysical, unfalsifiable), Wilber AQAL (theoretical synthesis), validated psychophysics (empirical), and game-design choices in the same files with no status ladder. The `foundations/06` firewall tries to separate empirical from metaphysical, but foundations 10–27 freely cite Ra as canon. This is the **meta-finding** that subsumes most of the per-gap findings below: it is impossible to decide which Mysterium ontological claims are load-bearing for the game architecture versus which are decorative.

2. **Three newly-introduced critical bugs in the Mysterium engine undermine the post-June-2026 refactoring.** Despite significant rework since the June 21–23 audit snapshot (7 of 16 architectural issues are now resolved), the new wiring introduced regressions:
   - **HS-01 / HS-02**: `sessionsSinceLastTransformation` math at `SignificatorSnapshot.ts:149-151` subtracts an hour-of-epoch count from a session count — always produces 0 after clamping — locks `selectSessionTheme` into `'post-transformation'` permanently for any transformed player, bypassing the entire AutoMode strategy system.
   - **HS-05**: `VeilFilter.filterInput` and `filterOutput` (92 LOC of regex patterns) are **never called anywhere**. The Veil is enforced ad-hoc in the renderer layer, not at the LLM I/O boundary where the spec (`foundations/20 §4`, `foundations/22 §13`) requires.
   - **HS-13**: `getEligibleModalities()` accepts a `moduleTaskTypes` parameter to filter modalities by what the module actually supports — but no caller passes it (line 167 omits the arg). The filter is dead. This is the **root cause of the modality collapse** that every prior audit flagged (C3).

3. **The catalyst trajectory is still structurally absent.** The recursive loop specified in `foundations/24 §3` (Detect edge → Generate catalyst AT edge → Observe response → SYNTHESIZE → Adapt next question → Integrate patterns → Shape next encounter → Detect readiness) is not implemented. The current loop is linear (Schedule → Present MCQ → Score → Update Sig → Next). `AgenticOrchestrator` resets `messages = []` per encounter (still — confirmed at `cliAgentLoop.ts`), so there is no cross-encounter synthesis, no pattern recognition, no adaptive question generation.

4. **HoloOS's `G_z / P_z` dual-metric is the single most important ontological import Mysterium is missing.** HoloOS requires **both** `G_z` (Lesser-Cycle health, rewards balance/integration) **and** `P_z` (Greater-Cycle health, rewards polarization/transcendence) for total metabolic health. Mysterium has the **Catalyst → Experience** half (Lesser Cycle) but no formal **Significator → Transformation → Great Way → Choice** half (Greater Cycle). The "Lovers Crucible" threshold event is the closest analog but is implemented as a session counter, not as a Choice-driven ratchet. This means Mysterium cannot model **polarization-healthy** play (e.g., a player deepening into STO without balancing) versus **balance-healthy** play (e.g., a player integrating shadow). The two are conflated in CCI.

5. **~30 of Mysterium's primitives have no HoloOS analog — and that is correct.** Encounter Scheduler, AutoMode Strategy, MacroCatalystEngine, PESTLE state, Perceptual Layer System, Veil of Forgetting (as mechanic), Infinite Checkpoint Model, Harvest endgame, Violet-ray expression, Codex, Onboarding binary search, the 8 Registries, Three-layer architecture, Two-mode gameplay, ModuleGamePool, Staircase, Theta-decay, etc. are **game-architecture contributions**, not defects. The refactor plan must protect these. The contrast report should not be read as "Mysterium should become HoloOS"; it should be read as "Mysterium should adopt HoloOS's *foundational primitives and stratification discipline* while keeping its *game-specific extensions*."

### 0.2 Top 5 actions (highest leverage, in order)

1. **Adopt HoloOS's 4-status ladder across `docs/foundations/`.** Tag every claim as `ai-draft`, `canonical-hypothesis`, `canonical`, or `superseded`. Demote all Ra-material cosmology to `canonical-hypothesis` (it is unfalsifiable) and lock it behind `foundations/06`. Promote the empirical psychophysics (Staircase, NetworkClaim, Stroop/N-back validity) to `canonical`. This is a docs-only change, ~2 days of work, and unblocks every other decision.

2. **Fix the three critical bugs in §0.1 #2.** Combined effort: ~3 days. Without these, every playtest past the first transformation produces systematically wrong developmental trajectories. See tickets T-0.1 through T-0.4.

3. **Add the Greater Cycle (S·T·G·Ch) as a first-class engine.** Implement `GreaterCycleEngine.ts` that consumes `Significator.transformations` and `polarity.master.crystallizationIndex` to compute `P_z`. Wire `P_z` into `CCIEngine` as a 6th dimension alongside the current 5. This is the highest-impact ontological alignment work — see Phase 1.

4. **Wire `VeilFilter` at the LLM I/O boundary** (not just at the renderer). Every string flowing into `LLMClient.chat()` passes through `filterInput()`; every string flowing out passes through `filterOutput()`. This is the only way to enforce the Veil without auditing every caller. ~1 day.

5. **Rebuild the catalyst trajectory as a 4-step recursive loop** (replacing the current linear pipeline). Implement `SessionAgent` as a persistent object across the session with `DevelopmentalSynthesis`, `writeInHistory`, and `pacing: PacingController`. This is the bulk of Phase 2 work (3-4 weeks) and is the highest-impact gameplay change.

### 0.3 Go / No-Go recommendation

**Conditional Go.** The codebase is salvageable and the ontology is recoverable, but the refactor must proceed in the phase order in §4. **Do not** attempt Phase 2 (catalyst trajectory rebuild) before Phase 0 (bug fixes) and Phase 1 (ontology alignment) are complete — Phase 2 builds on the AutoMode/CCI engine that the Phase 0 bugs currently break. **Do not** ship another playtest before HS-01/HS-02/HS-05/HS-13 are fixed; the data collected will be misleading.

---

## 1. Methodology

### 1.1 What was audited

- **HoloOS `_THEORY/`**: All 33 substantive files in `02_Ontology/` (00.md, README, 01.1–01.5, 02.1–02.4, 03.1–03.2, 04.1, 04.2, 04.2.1–3, 05.1–05.5, 06.1–06.3, 08.1–08.8), plus `01_Epistemology/0_Method_of_Holonic_Inquiry.md`, `01_Epistemology/4_Type_Validation_Protocol.md`, `08_System_Architecture/Ontology_Structural_Audit_and_Reorganization_Plan.md`, `08_System_Architecture/CLI_MCP_Ontology_Alignment_Audit.md`, `08_System_Architecture/Holonic_ID_Taxonomy.md`, `08_System_Architecture/Multi_Axis_Holonic_Coordinate_System.md`, and root `HOLOOS.md` / `_MANIFEST.md`.
- **Mysterium `docs/`**: All 28 foundational docs (00-integral-theory through 27-auto-mode-strategy-engine), `00-vision.md`, `01-first-principles.md`, `02-glossary.md`, `INDEX.md`, `REQUIREMENTS.md`, `03-research-methodology.md`.
- **Mysterium root meta-docs**: `README.md`, `AGENTS.md`, `MVP-BLUEPRINT.md`, `ROADMAP.md`, `UNIFIED-IMPLEMENTATION-PLAN.md`, `AUDIT-REPORT.md`.
- **Mysterium prior audits**: All 10 prior audit docs (`AUDIT-REPORT.md`, `docs/RED-TEAM-AUDIT*.md` ×6, `docs/GAMEPLAY-MODES-AUDIT.md`, `docs/STAGE-ASSESSMENT-ARCHITECTURE.md`, `docs/ONBOARDING-REDESIGN-PLAN.md`).
- **Mysterium source code**: 80+ files across 5 tiers (core engines, domain, persistence, LLM layer, game layer, CLI). See §3.1 for the full module map.

### 1.2 What was NOT audited (out of scope)

- The `docs/concept-drafts/` tree (384 files of per-line×stage module spec drafts) — these are content, not architecture. Spot-checked only.
- The `docs/superpowers/plans/` and `docs/superpowers/specs/` planning docs — these are process artifacts.
- The HoloOS `holos/` runtime and `_INSTRUMENTS/` — these are HoloOS's own implementation, not the ontology reference.
- Capacitor / native build pipeline — flagged as P16 in prior audits; not re-audited.
- Test coverage — flagged as P15 in prior audits; not re-audited.

### 1.3 Source-of-truth hierarchy

When the Mysterium docs and HoloOS docs conflict, **HoloOS `_THEORY/02_Ontology` is the source of truth** for ontological primitives (Holon, Significator, Tetra-Axes, Realms, Complexes, G_z/P_z, Type Validation). **Mysterium `docs/foundations/` is the source of truth** for game-specific extensions (Encounter, Modality, Module, Scheduler, AutoMode, Veil-as-mechanic). The contrast in §2 is from this perspective.

### 1.4 Note on the `01_Ontology` vs `02_Ontology` discrepancy

The user's request referenced `HoloOS/_THEORY/01_Ontology`. The actual path in the cloned HoloOS repo is `_THEORY/02_Ontology/` (with `_THEORY/01_Epistemology/` being a separate concern — HoloOS treats epistemology as logically prior to ontology). This audit uses the actual path. The user may want to update the request wording or rename the directory; flagged as a minor doc-tracking issue, not an ontological defect.

---

## 2. Ontology Contrast

### 2.1 The HoloOS ontology in one paragraph

HoloOS models reality as a fractal stack of **holons**, each running the same invariant **Metabolic Architecture** (`02.1`, canonical anchor). Every holon has two coupled cycles: a **Lesser Cycle** (Matrix → Potentiator → Catalyst → Experience) that continuously metabolizes catalyst into experience within a stage, and a **Greater Cycle** (Significator → Transformation → Great Way → Choice) that ratchets the holon to the next density/density-stage. Lesser-Cycle health is `G_z` (Agape, rewards balance/integration); Greater-Cycle health is `P_z` (Eros, rewards polarization/transcendence). Both are required (`G_z · P_z = Total Metabolic Health`). The holon's position is given by a 4-axis coordinate `⟨V=⟨O,D,S⟩, C, R, N⟩` (Verticality=Octave/Density/Scale, Collectivity, Realm, Nesting-direction). Holons differentiate into Mind/Body/Spirit **complexes** (`04.2.x`) running the same metabolic architecture on different substrate faces. Realms (`05.x`) are Causal/Subtle/Gross. The whole system evolves through an 8-step **Universal Evolutionary Protocol** (`06.3`) and is grounded by an involution chain of 3-4 prior octaves (`06.1`). Type (valence signature) is **orthogonal to Stage** (Type⊥Stage) and is validated by three tests: behavioral match (T1), excitation-invariance (T2), fixed-point persistence (T3). Every claim is tagged on a status ladder: `ai-draft → canonical-hypothesis → canonical → superseded`.

### 2.2 The Mysterium ontology in one paragraph

Mysterium models a player as a **Significator** (the player's holon) that progresses through 8 discrete **Stages** (Infrared → White) on 8 independent **Lines** (Cognitive, Emotional, Moral, Intrapersonal, Spiritual, Somatic, Willpower, Interpersonal). Stage is synthesized from per-line Altitudes via a hysteresis rule (`Stage = max S such that all lines ≥ S and at least one line reaches S+1`). Players are motivated by 4 **Drives** (Agency, Communion, Eros, Agape) and develop a **Polarity** (STO/STS) over time. Encounters (the atomic gameplay unit) are scheduled by a 7-criteria priority formula and delivered through 7 **Modalities** (Deterministic, Strategic, Embodied, ScenarioChoice, LanguageReflective, SocialCooperative, ImmersiveRPG). A composite **CCI** (Cumulative Consciousness Index) measures developmental state across 5 dimensions (altitude, drive-health, polarity, shadow-topology, transformation-readiness) and feeds an **AutoMode Strategy** that picks one of 9 session themes. A **Veil of Forgetting** hides all metrics from the player. **Theta-decay** (7-day half-life per line) erodes unused stages; **Holonic Return** surfaces unresolved shadows from earlier stages; the **Lovers Crucible** is a 3-phase transformation event (Unravelling → Crucible → Emergence). The whole thing is grounded in AQAL integral theory + Law of One Ra material + validated psychophysics.

### 2.3 Stratification discipline gap (the meta-finding)

HoloOS labels every ontological claim with a status. As of the 2026-07-03 audit:

| Status | Count in `02_Ontology/` | Examples |
|---|---|---|
| `canonical` | 2 | `02.1` Microcosmic Metabolic, `02.2` Macrocosmic Metabolic |
| `canonical-hypothesis` | ~15 | Tetra-Axes, Realms, Complexes, G_z/P_z, Involution chain |
| `ai-draft` | ~12 | 22 Named Archetypes, prior-octave count, Veil identity |
| `superseded` | 0 explicit (the 2026-07-03 reorganization retired several) | — |

Mysterium has **no status ladder at all**. The `docs/foundations/00-integral-theory.md` through `27-auto-mode-strategy-engine.md` series treats all of the following as equally canonical:

- **Empirical psychophysics** (Staircase convergence at 70.7%, N-back validity, Stroop effect, NetworkClaim brain-region citations) — these are falsifiable and largely validated.
- **AQAL integral theory** (8 stages, 8 lines, 4 quadrants, states, types) — this is Wilber's theoretical synthesis; widely cited but not empirically validated as a single system.
- **Law of One Ra material** (7 rays, STO/STS polarity, 51%/95% harvest thresholds, octave/density cosmology, veil of forgetting as cosmic feature) — this is metaphysical revelation; unfalsifiable.
- **Game-design choices** (ModuleGamePool minimums, 3-session onboarding split, 7-criteria priority weights, 9 session themes) — these are engineering decisions.

**Why this matters:** When a developer reads `foundations/16-significator-architecture.md` and sees "The Significator is the persistent self-pattern that survives session transitions, accumulates distortions, holds the developmental story, exercises true free will" — they cannot tell whether this is:
- (a) A code-shape contract (Significator is a TypeScript interface with these fields) — yes
- (b) An empirical claim about player psychology (players actually internalize a persistent self-pattern through play) — unknown, unvalidated
- (c) A metaphysical claim about consciousness (the Significator is a real ontological entity per Ra) — unfalsifiable

Without status stratification, every refactor becomes an argument about metaphysics. The fix is mechanical (add `**Status:** canonical-hypothesis` lines to every foundations doc) but high-leverage.

### 2.4 Primitive mapping table (HoloOS → Mysterium)

| HoloOS primitive | HoloOS status | Mysterium analog | Mysterium status | Alignment verdict |
|---|---|---|---|---|
| **Holon** (whole that is part of a larger whole) | canonical | `Holon` (`docs/02-glossary.md`) | canon (code) | **Aligned.** Same term, same concept. |
| **Significator** (persistent self-pattern; the greater-cycle accumulator) | canonical-hypothesis | `Significator` (`foundations/16`) | canon (code) | **Aligned in name; weakened in implementation.** Mysterium Significator is the player's holon specifically. HoloOS Significator is *every* holon's greater-cycle accumulator. The Mysterium term is a special case. |
| **Lesser Cycle** (Matrix → Potentiator → Catalyst → Experience) | canonical | **Catalyst** (`foundations/14`) + **Encounter** (`foundations/21`) | canon-spec | **Partial.** Mysterium has Catalyst→Experience but no Matrix/Potentiator. The "potentiator" (the reservoir that fills from catalyst) is implicit in `drive.fixationRisk` but not named. |
| **Greater Cycle** (Significator → Transformation → Great Way → Choice) | canonical-hypothesis | **Lovers Crucible** (`foundations/17`) + **Polarity** (`foundations/19`) | canon-spec | **Missing.** Mysterium has the Crucible (transformation) and Polarity (choice-direction) but no **Great Way** — the teleological attractor that pulls the holon forward. Without Great Way, the Greater Cycle has no ratchet. |
| **Tetra-Axes Coordinate System** (V=⟨O,D,S⟩, C, R, N) | canonical-hypothesis | **AQAL** (quadrant, stage, line, state, type) + Ray + Polarity = 7-tuple | canon (code) | **Divergent.** HoloOS redesigned to 4 axes; Mysterium inherits Wilber's 5-tuple and adds 2 more. The two systems overlap on Verticality/Collectivity/Realm but Mysterium has Line (no HoloOS analog) and HoloOS has Nesting-direction (no Mysterium analog). |
| **Type⊥Stage** (valence signature is orthogonal to vertical position) | canonical-hypothesis | **PolarityTexture** (`foundations/23`) — 64-cell catalogue per (line×stage) | canon-spec | **Partial.** Mysterium's PolarityTexture is per-(line×stage), not Type-perpendicular-to-Stage. HoloOS's Type⊥Stage means a holon can have the same Type at different Stages; Mysterium doesn't model this. |
| **G_z** (Lesser-Cycle health, Agape, balance) | canonical-hypothesis | **Drive Health Tensor** (CCI dim 2) + **Shadow Topology** (CCI dim 4) | canon-spec | **Partial.** Mysterium measures drive balance and shadow integration, which rhyme with G_z, but doesn't name or formalize the construct. |
| **P_z** (Greater-Cycle health, Eros, polarization) | canonical-hypothesis | **Polarity Vector** (CCI dim 3) — crystallization index | canon-spec | **Partial.** Mysterium's crystallization index is the closest analog but is treated as one of 5 CCI dimensions, not as a co-equal health metric. **No P_z = no way to distinguish polarization-healthy from balance-healthy play.** |
| **Realms** (Causal / Subtle / Gross) | canonical-hypothesis | **States** (Gross, Subtle, Causal, Witness, Non-Dual) | canon (code) | **Mysterium extends.** Mysterium adds Witness + Non-Dual (Wilber's full state taxonomy). Reasonable extension. |
| **Complexes** (Mind / Body / Spirit) | canonical-hypothesis | **Implicit only.** Mysterium's "quadrant" axis (UL/UR/LL/LR) maps roughly but Mind/Body/Spirit are not first-class. | — | **Missing.** HoloOS's complexes are the substrate-faces on which the metabolic architecture runs. Mysterium has no Mind/Body/Spirit differentiation; all Lines run on the same substrate. |
| **Involution** (chain of 3-4 prior octaves forming source-field) | canonical-hypothesis | **None.** | — | **Missing.** Mysterium has no concept of prior-octave inheritance. The "Harvest endgame" (post-White content) is the closest analog but is one-shot, not a chain. |
| **Evolution** (8-step Universal Evolutionary Protocol) | canonical-hypothesis | **8 Stages** (Infrared → White) + **Lovers Crucible** transitions | canon (code) | **Aligned in count, divergent in mechanism.** Mysterium has 8 stages like HoloOS's 8 densities, but HoloOS's 8-step protocol is per-scale (each step contains a complete 9-stage cycle); Mysterium's 8 stages ARE the cycle. Conflation risk. |
| **Veil of Forgetting** (structural feature at v=1, Space/Time↔Time/Space spectrum) | canonical-hypothesis | **Veil of Forgetting** (`foundations/20`) — game mechanic that hides all metrics | canon (code) | **Aligned in name; divergent in scope.** HoloOS Veil is a cosmological feature (consciousness cannot see its own substrate pre-3rd-density). Mysterium Veil is a UX choice (don't show scores to player). The two rhyme but are not the same construct. **Mysterium's Veil is correctly game-architecture-appropriate**; the divergence is fine. |
| **Attractor Field** (always-existent backdrop patterns consciousness resonates with) | canonical-hypothesis | **AttractorField** (`foundations/13 §Attractor Fields`) — 8 fields per stage | canon-spec | **Aligned.** Mysterium's 8 attractor fields map to HoloOS's attractor field per-density. |
| **22 Named Archetypes** (7 Mind + 7 Body + 7 Spirit + Choice) | ai-draft | **None directly.** Holon `narrativeRole` strings (e.g., "main-boss", "rage-warrior", "lone-wolf") are an ad-hoc archetype layer. | — | **Missing.** Mysterium has no formal archetype taxonomy. The `narrativeRole` strings in `red-layer-holons.json` are an emergent archetype layer but undocumented. |
| **Type Validation Protocol** (T1 behavioral, T2 excitation-invariance, T3 fixed-point persistence) | canonical-hypothesis | **None.** | — | **Missing.** Mysterium has no type-validation protocol. The Staircase converges on a difficulty parameter, not on a Type signature. |
| **Method of Holonic Inquiry** (3 Acts + 7 Obligations + status ladder) | canonical | **`docs/03-research-methodology.md`** | canon-spec | **Partial.** Mysterium has a research methodology doc but no status ladder and no provenance retention requirement. |
| **Drives** (Agency, Communion, Eros, Agape as 2 orthogonal boundary axes) | canonical-hypothesis (under-covered per `08.4`) | **Drives** (`foundations/05`) — same 4 drives, with weights + fixationRisk | canon (code) | **Aligned.** Mysterium inherits Bakan + Wilber + Aurobindo. Drive-pair axes (vertical Eros/Agape, horizontal Agency/Communion) match. |
| **Shadows** (4 shadows: dark/golden × addiction/allergy + 4 macro-shadows) | canonical-hypothesis | **ShadowSignal** + **ShadowQuadrant** (`foundations/10`) — same 4 quadrants | canon (code) | **Aligned.** Mysterium's shadow quadrants (DA/DAll/GA/GAll) match HoloOS's dark/golden × addiction/allergy exactly. The 4 macro-shadows (sinkhole of indifference = Great-Way Choice-starvation) are not implemented. |
| **Density** (macro octave: 1st–8th density) | canonical-hypothesis | **Ray** (`foundations/06 §8`) — 7 rays within a single 3rd-density octave | canon (code) | **Scale-mismatched.** HoloOS Density is macro (8 densities total); Mysterium Ray is micro (7 rays within 3rd density). The two are not equivalent. Mysterium's Stage is closer to HoloOS Density than Mysterium's Ray is. |
| **Octave** (8-density span) | canonical-hypothesis | **Octave** (`foundations/02 §3`) — three macro-arcs nested in 8 stages | canon-spec | **Conflated.** HoloOS Octave = 8 densities. Mysterium Octave = 3 macro-arcs within one density. Same word, different scope. |
| **Scalar Metric** S(Ω,δ,λ) | canonical-hypothesis | **CCI** (5-dim composite, never player-facing) | canon-spec | **Divergent.** HoloOS S is a 3-parameter scalar; Mysterium CCI is a 5-dim composite. Mysterium's is richer but loses the closed-form scalar property. |
| **Holonic ID Taxonomy** (`08_System_Architecture/Holonic_ID_Taxonomy.md`) | canonical-hypothesis | **HolonKind** (`foundations/22 §2.1`) — 8 kinds: individual/dyadic/group/organisational/cultural/geopolitical/ecological/cosmic | canon-spec | **Partial.** Mysterium has 8 HolonKinds; HoloOS has 19 scale levels. Mysterium's 8 is coarser. |
| **Logos Hierarchy** (Primary/Sub/Sub-Sub-Logos) | canonical-hypothesis | **None.** | — | **Missing.** Mysterium has no Logos hierarchy. Reasonable omission for a game — this is cosmological scaffolding, not game-architecture-relevant. |

### 2.5 Per-gap rationale + rewrite spec

This section gives a paragraph per gap explaining whether the divergence is game-architecture-appropriate or a defect, plus paste-ready replacement text for the flawed Mysterium docs.

#### 2.5.1 Holon / Significator

**Rationale.** Mysterium's collapse of "Holon" and "Significator" into a single player-only concept loses HoloOS's key insight: **every entity in the world is a holon with its own greater-cycle accumulator**. NPCs, factions, locations, even the world itself should have Significators (developmental state) — not just the player. The current code (`Holon.ts`) has `stateHistory` and `narrativeRole` but no `transformations` field; NPCs cannot transform. This blocks the "Harvest endgame" mechanic where retired player characters become mentor-NPCs in other players' worlds (`MVP-BLUEPRINT §16`).

**Verdict.** Defect (game-architecture-relevant). NPC transformation is a Harvest prerequisite.

**Rewrite spec for `docs/foundations/16-significator-architecture.md` §1 (paste-ready):**

```markdown
### 1.1 Significator scope (revised 2026-07-03)

The Significator is **not** player-exclusive. Every holon in the world has a
Significator — the persistent greater-cycle accumulator that records its
developmental state, transformation history, and polarity trajectory.

- **Player Significator**: full schema below; persists across sessions via
  `SaveRepository`.
- **NPC Significator**: same schema, persisted in `WorldState.npcSignificators`;
  evolves through encounters with the player and through macro-catalyst events.
- **Faction Significator**: aggregated from member NPC Significators; persists
  in `WorldState.factionSignificators`.
- **World Significator**: aggregated from PESTLE state + active faction
  Significators; represents the octave-level developmental state.

The Harvest endgame (§16 of MVP-BLUEPRINT) requires NPC Significators to exist
so that retired player characters can be preserved as immutable codex records
that nevertheless carry a developmental state into other players' worlds.

**HoloOS anchor**: `02_Ontology/02.1_Microcosmic_Metabolic_Architecture.md`
(canonical). HoloOS specifies that every holon runs ONE invariant architecture;
Mysterium extends this to "every holon has ONE Significator."
```

#### 2.5.2 Lesser Cycle (M·P·C·E)

**Rationale.** Mysterium implements Catalyst → Experience (the right half of the Lesser Cycle) but omits Matrix → Potentiator (the left half — the reservoir and the input boundary). In HoloOS, the Matrix is the reservoir of unprocessed catalyst and the Potentiator is the membrane that selects which catalyst to ingest. Without these, Mysterium's "encounter" is a context-free event: it doesn't draw from a reservoir, and it doesn't filter input.

**Verdict.** Partial defect. The Matrix concept is partially implemented as `EncounterScheduler.recentEncounters` (a queue of past encounters) but is not named or formalized. The Potentiator concept is missing entirely — there's no "input filter" that decides which catalyst reaches the player.

**Rewrite spec for `docs/foundations/14-game-as-developmental-catalyst.md` §2 (paste-ready):**

```markdown
### 2.1 Lesser Cycle mapping (revised 2026-07-03)

Mysterium's encounter pipeline implements the right half of the HoloOS Lesser
Cycle (Catalyst → Experience). The left half (Matrix → Potentiator) is
implemented but unnamed. This section names them.

- **Matrix** = `EncounterScheduler.recentEncounters` + `WorldState.cooldowns`
  + `MacroCatalystEngine.tension`. The Matrix is the reservoir of unprocessed
  catalyst — the set of all encounters that could fire, weighted by recency,
  cooldown, and macro-event pressure.
- **Potentiator** = `CandidateGeneration.generateCandidates()` filters
  (layer-perception, narrative-gate, cooldown, modality-availability,
  altitude-requirement). The Potentiator is the input membrane that selects
  which catalyst from the Matrix reaches the player.
- **Catalyst** = the `Encounter` itself.
- **Experience** = `ConsequenceEngine.applyConsequences()` — the post-encounter
  state mutation.

The four-stage cycle is therefore:
  Matrix (reservoir) → Potentiator (filter) → Catalyst (encounter) →
  Experience (consequence) → Matrix (updated reservoir).

**HoloOS anchor**: `02_Ontology/02.1_Microcosmic_Metabolic_Architecture.md`
(canonical). The HoloOS invariant "What Catalyst is to the Matrix, Experience
is to the Potentiator" maps to: "What the Encounter is to the Scheduler
reservoir, applyConsequences is to the CandidateGeneration filter."

**Status**: canonical-hypothesis (the mapping is Mysterium-specific; the underlying
HoloOS primitive is canonical).
```

#### 2.5.3 Greater Cycle (S·T·G·Ch)

**Rationale.** This is the **most critical missing primitive**. Mysterium has the Lovers Crucible (transformation event) and Polarity (choice-direction), but no Great Way — the teleological attractor that pulls the holon forward. Without Great Way, the Greater Cycle has no ratchet: transformations happen when a counter says so, not when the player's polarity trajectory says so. This is why HS-06 (transformation state machine deadlocks) is so damaging — there's no Choice-driven mechanism to push the state machine forward.

**Verdict.** Defect (high-priority). Blocks correct transformation mechanics.

**Rewrite spec for `docs/foundations/17-transformation-mechanics.md` §1 (paste-ready):**

```markdown
### 1.1 Greater Cycle mapping (revised 2026-07-03)

Mysterium's transformation system implements the middle two stages of the HoloOS
Greater Cycle (Significator → **Transformation** → **Great Way** → Choice).
The first stage (Significator as accumulator) and the last stage (Choice as
ratchet) are partially implemented.

- **Significator** (accumulator) = `Significator.transformations[]` +
  `polarity.master.crystallizationIndex`. The persistent record of past
  transformations and current polarity trajectory.
- **Transformation** (ratchet event) = the Lovers Crucible (§2 of this doc).
  Discontinuous ascent; ego-dissolution + frame-change.
- **Great Way** (teleological attractor) = **MISSING**. The Great Way is the
  polarity-destination that pulls the holon forward. Mysterium has Polarity
  (current state) but no Polarity-Destination (where the holon is being pulled).
  Without Great Way, the Crucible fires on session counters, not on
  polarity-readiness.
- **Choice** (ratchet action) = the player's STO/STS polarization choice at
  the moment of transformation. Currently implicit in the Crucible's "emergence"
  phase; should be explicit.

**The ratchet mechanism (missing)**: A Greater-Cycle-correct transformation
fires when `polarity.master.crystallizationIndex > 0.7` AND
`polarity.master.dominantDirection` has been stable for ≥5 encounters AND
shadow-clearance is satisfied. The current implementation fires when
`session.transformationState.phase === 'crucible'` AND a session counter
expires — this is a Lesser-Cycle mechanism misapplied to a Greater-Cycle event.

**Status**: canonical-hypothesis (the mapping is Mysterium-specific; the underlying
HoloOS Greater Cycle is canonical-hypothesis per `02_Ontology/02.1`).
```

#### 2.5.4 Tetra-Axes Coordinate System

**Rationale.** HoloOS redesigned its coordinate system to 4 axes after a 2026-07-03 self-audit (`08.8_Redesigned_Coordinate_System.md`): `⟨V=⟨O,D,S⟩, C, R, N⟩` (Verticality=Octave/Density/Scale, Collectivity, Realm, Nesting-direction). Mysterium uses AQAL's 5-tuple (quadrant, stage, line, state, type) plus Ray and Polarity = a 7-tuple. The two overlap on Verticality (Stage ≈ V) and Realm (State ≈ R) but diverge elsewhere.

**Verdict.** Partial defect. Mysterium's Line axis (a Wilber-specific construct) has no HoloOS analog and arguably shouldn't — HoloOS's Type⊥Stage replaces the need for separate Lines. But Mysterium has 64 modules built around the 8×8 Line×Stage grid; removing Lines would require re-architecting the entire content layer. The pragmatic call: keep Lines as a Mysterium-specific extension, but explicitly tag them as such.

**Rewrite spec for `docs/foundations/01-aqal-quadrants.md` (paste-ready preface):**

```markdown
> **Status**: canonical-hypothesis (Mysterium-specific extension of HoloOS
> coordinate system).
>
> HoloOS uses a 4-axis coordinate `⟨V=⟨O,D,S⟩, C, R, N⟩` (Verticality,
> Collectivity, Realm, Nesting-direction). Mysterium uses a 7-tuple
> `(quadrant, stage, line, state, type, ray, polarity)` inherited from
> Wilber's AQAL plus Law-of-One Ray and Polarity extensions.
>
> The two systems overlap on:
> - Stage ≈ Verticality (V.O — discrete density within an octave)
> - State ≈ Realm (R — Causal/Subtle/Gross + Witness/Non-Dual extension)
> - Quadrant ≈ Collectivity × Realm-interior-exterior (C × R.interior)
>
> Mysterium's Line axis has no HoloOS analog. It is retained as a Mysterium-specific
> extension because the 64-module content grid depends on it. HoloOS's
> Nesting-direction (N) axis has no Mysterium analog and is omitted because Mysterium
> does not model cross-octave involution.
>
> See `docs/foundations/26-unified-core-architecture.md` for the full
> coordinate tuple. See HoloOS `_THEORY/02_Ontology/08.8_Redesigned_Coordinate_
> System.md` for the source-of-truth 4-axis system.
```

#### 2.5.5 Type⊥Stage orthogonality

**Rationale.** HoloOS's Type⊥Stage is a **robustness claim**: a holon's Type (valence signature) is orthogonal to its Stage (vertical position), so the same Type can appear at different Stages. This is what makes the typology scalable — it doesn't break at complex scales. Mysterium's `PolarityTexture` is per-(Line×Stage) — a 64-cell catalogue where each cell has a fixed texture name. This is Type-BOUND-to-Stage, not Type-PERP-to-Stage. The difference matters: a player at Cognitive×Red has texture "Tactical Service" or "Cognitive Dominion" — but if they advance to Cognitive×Amber, they get a different texture. In HoloOS, the same Type would persist across Stages (with different surface expressions).

**Verdict.** Defect (medium-priority). The 64-cell texture catalogue is useful as a content index but should not be confused with a Type system.

**Rewrite spec for `docs/foundations/23-polarity-ontology.md` §3 (paste-ready):**

```markdown
### 3.1 Type vs PolarityTexture (revised 2026-07-03)

Mysterium's `PolarityTexture` (per-Line×Stage texture names like "Tactical Service",
"Cognitive Dominion") is **not** a Type system in the HoloOS sense. It is a
content-index — a 64-cell catalogue of texture names used to label encounter
content.

A HoloOS-correct Type system would be **orthogonal to Stage**: a player's Type
(e.g., "strong-donor" or "weak-acceptor" — HoloOS's valence signature
𝒱 = ⟨d; {(c, ρ_c, σ_c)}⟩) would persist across Stages, with surface
expressions varying by Stage but the underlying Type remaining fixed.

**The distinction matters for**:
- **Cross-Stage shadow detection**: a player with Type "strong-donor" at Red
  who advances to Amber should still show strong-donor patterns; the current
  per-Stage texture system loses this continuity.
- **Type-validation testing (T1/T2/T3)**: HoloOS's T2 test
  (excitation-invariance) requires that Type stays fixed as Stage changes;
  Mysterium cannot run this test because Type is Stage-bound.

**Status**: ai-draft. The PolarityTexture catalogue is retained as a content
index. A separate Type system (orthogonal to Stage) is a Phase-2 deliverable.
```

#### 2.5.6 G_z / P_z dual health metric

**Rationale.** This is the **second most critical missing primitive** (after Great Way). HoloOS requires both `G_z` (Lesser-Cycle health, Agape, rewards balance/integration) AND `P_z` (Greater-Cycle health, Eros, rewards polarization/transcendence) for total metabolic health. Mysterium's CCI has 5 dimensions but treats them as a flat composite — there's no recognition that drive-balance (G_z-like) and polarity-crystallization (P_z-like) are **co-equal health metrics that can conflict**. A player deepening into STO without balancing (high P_z, low G_z) and a player integrating shadow without polarizing (high G_z, low P_z) should be scored differently; currently they're conflated.

**Verdict.** Defect (high-priority). Blocks correct CCI semantics.

**Rewrite spec for `docs/foundations/25-cumulative-consciousness-index.md` §1 (paste-ready):**

```markdown
### 1.1 Dual health metric (revised 2026-07-03)

The CCI is restructured to compute two co-equal health metrics before
composing them into a single index:

- **G_z (Lesser-Cycle health, Agape)** = f(drive-balance, shadow-integration,
  theta-freshness). Rewards balance and integration. High G_z = the player is
  metabolizing catalyst well within the current Stage.
- **P_z (Greater-Cycle health, Eros)** = f(polarity-crystallization,
  transformation-readiness, great-way-alignment). Rewards polarization and
  transcendence. High P_z = the player is ready to ratchet to the next Stage.

**Total Metabolic Health** = G_z · P_z (geometric mean, per HoloOS
`02_Ontology/02.1`). A player with high G_z but low P_z is "consolidating" —
healthy but not advancing. A player with high P_z but low G_z is "polarizing
unhealthily" — advancing without integration. Both must be nonzero.

The 5 existing CCI dimensions map as follows:
- Altitude Map → neither (positional, not health)
- Drive Health Tensor → G_z (primary)
- Polarity Vector → P_z (primary)
- Shadow Topology → G_z (primary)
- Transformation Readiness → P_z (primary)

**Status**: canonical-hypothesis. The G_z/P_z framework is HoloOS
canonical-hypothesis; the Mysterium mapping is Mysterium-specific.
```

#### 2.5.7 Realms (Causal / Subtle / Gross)

**Rationale.** Mysterium's State enum (Gross, Subtle, Causal, Witness, Non-Dual) is a **superset** of HoloOS's Realm (Causal, Subtle, Gross). The Wilber extensions (Witness, Non-Dual) are reasonable for a game that includes meditative mini-games. No defect.

**Verdict.** Aligned (Mysterium extends).

#### 2.5.8 Complexes (Mind / Body / Spirit)

**Rationale.** HoloOS's Mind/Body/Spirit complexes are the substrate-faces on which the metabolic architecture runs. Mysterium has no Mind/Body/Spirit differentiation — all Lines run on the same substrate. This is a real loss: it means Mysterium cannot model, e.g., a player whose Cognitive Line (Mind-complex) is at Amber but whose Somatic Line (Body-complex) is at Red. The Lines track *content* (cognitive vs somatic) but not *substrate* (mental vs physical vs spiritual).

**Verdict.** Defect (medium-priority). The fix is to tag each Line with a Complex affinity:
- Cognitive, Moral, Intrapersonal → Mind
- Somatic, Willpower → Body
- Spiritual, Emotional, Interpersonal → Spirit (debatable; could split)

This is a docs + 1 enum field change; ~1 day.

**Rewrite spec for `docs/foundations/03-lines-of-intelligence-overview.md` (paste-ready table):**

```markdown
### Line-to-Complex affinity (revised 2026-07-03)

Each Line runs on a primary substrate face (HoloOS Complex). A player's
profile therefore has three Complex-level altitudes in addition to eight
Line-level altitudes.

| Line | Primary Complex | Rationale |
|---|---|---|
| Cognitive | Mind | Symbolic reasoning |
| Moral | Mind | Ethical reasoning |
| Intrapersonal | Mind | Self-reflection |
| Emotional | Spirit | Affective resonance |
| Spiritual | Spirit | Transpersonal connection |
| Interpersonal | Spirit | Relational field |
| Somatic | Body | Embodied sensation |
| Willpower | Body | Volitional motor |

**Complex altitude** = the hysteresis-synthesized Stage across all Lines
belonging to that Complex. Complex altitude is used for:
- **Cross-Complex shadow detection**: a Mind-Complex at Amber with a
  Body-Complex at Red surfaces as a "spiritual bypass" pattern (Mind
  overdeveloped relative to Body).
- **Per-Complex theta-decay**: each Complex has its own decay rate (Body
  decays fastest — use-it-or-lose-it; Spirit decays slowest).

**Status**: canonical-hypothesis. HoloOS anchor:
`02_Ontology/04.2_Intra_Holonic_Specialization.md` (canonical-hypothesis).
```

#### 2.5.9 Involution / Evolution

**Rationale.** HoloOS's Involution (chain of 3-4 prior octaves forming source-field) has no Mysterium analog. This is a reasonable omission for a single-octave game — Mysterium is set entirely within 3rd density. The "Harvest endgame" (post-White content = harvest into 4th density) is the closest analog but is one-shot, not a chain.

**Verdict.** Acceptable omission (game-architecture-appropriate). Flag as a known scope-limitation in docs.

**Rewrite spec for `docs/foundations/06-law-of-one-correspondence.md` (paste-ready footnote):**

```markdown
> **Scope limitation**: Mysterium models a single octave (3rd density, stages
> Infrared → White). HoloOS's Involution (chain of 3-4 prior octaves forming
> the source-field) is out of scope. The Harvest endgame (§7.4) is the
> octave-boundary transition into 4th density; it is a one-shot event, not an
> involution chain. This is a game-architecture-appropriate divergence from
> HoloOS — Involution is cosmological scaffolding, not game-mechanic-relevant.
>
> **Status**: canonical-hypothesis (the scope-decision is canonical for Mysterium;
> the underlying HoloOS Involution is canonical-hypothesis per
> `02_Ontology/06.1_Involution_Sequence.md`).
```

#### 2.5.10 Veil of Forgetting

**Rationale.** Mysterium's Veil (UX choice: don't show scores to player) and HoloOS's Veil (cosmological feature: consciousness cannot see its own substrate pre-3rd-density) rhyme but are not the same construct. Mysterium's Veil is correctly game-architecture-appropriate — the divergence is fine. The defect is in **enforcement**: HS-05 shows the VeilFilter regex filter is never wired at the LLM I/O boundary.

**Verdict.** Aligned in concept; defective in enforcement (see HS-05, §3.2).

#### 2.5.11 Attractor Field

**Rationale.** Mysterium's 8 AttractorFields (Survival/Red, Growth/Orange, Cognition/Yellow, Order/Green, Systems/Blue, Integration/Indigo, Convergence/Violet, Source) map to HoloOS's attractor field per-density. Aligned.

**Verdict.** Aligned.

#### 2.5.12 22 Named Archetypes

**Rationale.** HoloOS's 22 Named Archetypes (7 Mind + 7 Body + 7 Spirit + Choice) are an `ai-draft` navigational index. Mysterium has no formal archetype taxonomy; the `narrativeRole` strings in `red-layer-holons.json` (e.g., "main-boss", "rage-warrior", "lone-wolf", "gladiator-champion", "deceiver", "vendetta-hunter") are an emergent ad-hoc archetype layer. This is a content gap, not an architecture gap — the architecture supports archetypes via the Holon interface, but the content isn't formalized.

**Verdict.** Acceptable gap (content, not architecture). Flag for content-team attention.

#### 2.5.13 Type Validation Protocol (T1 / T2 / T3)

**Rationale.** HoloOS's Type Validation Protocol is **methodological** — it's how you test whether a Type claim is real. Mysterium has no equivalent. The Staircase converges on a difficulty parameter (a scalar), not on a Type signature. Without T1/T2/T3, Mysterium cannot validate that its PolarityTexture assignments are real (i.e., that a player assigned "Cognitive Dominion" at Red actually behaves cognitively-dominantly across stages).

**Verdict.** Defect (medium-priority). Blocks empirical validation of typology claims.

**Rewrite spec for `docs/03-research-methodology.md` (paste-ready new section):**

```markdown
## 4. Type Validation Protocol (revised 2026-07-03)

Mysterium adopts HoloOS's three-test Type Validation Protocol
(`_THEORY/01_Epistemology/4_Type_Validation_Protocol.md`):

- **T1 Behavioral match**: observed bonding patterns match the Type signature's
  predictions. For Mysterium: a player assigned PolarityTexture X should show
  drive-choice patterns consistent with X across ≥3 encounters.
- **T2 Excitation-invariance**: the Type signature stays fixed as Stage changes.
  For Mysterium: a player's underlying Type (once we have one — see foundations/23
  §3.1) should persist across Stage transitions, with only surface expressions
  varying.
- **T3 Fixed-point persistence**: the Type signature persists across metabolic
  cycles without immediately firing Transformation. For Mysterium: a player's Type
  should be stable across ≥10 encounters before a Transformation event.

A Type claim that fails any test is demoted from `canonical-hypothesis` to
`ai-draft`. A Type claim that passes all three is promoted to `canonical`.

**Status**: canonical-hypothesis. The protocol itself is HoloOS canonical; the
Mysterium operationalization is canonical-hypothesis.
```

#### 2.5.14 Method of Holonic Inquiry

**Rationale.** HoloOS's Method of Holonic Inquiry (3 Acts: Grounding → Construction → Validation; 7 Obligations; status ladder) is the **epistemic discipline** that keeps the ontology honest. Mysterium's `docs/03-research-methodology.md` is a research methodology doc but has no status ladder and no provenance retention requirement. The fix is to adopt HoloOS's ladder and obligations verbatim.

**Verdict.** Defect (high-leverage, low-effort). This is the meta-fix that unblocks everything else.

**Rewrite spec for `docs/03-research-methodology.md` §0 (paste-ready preface):**

```markdown
## 0. Epistemic discipline (revised 2026-07-03)

Mysterium adopts the HoloOS Method of Holonic Inquiry
(`_THEORY/01_Epistemology/0_Method_of_Holonic_Inquiry.md`) with the following
three Acts and seven Obligations.

### Three Acts

1. **Grounding**: reduce every claim to a trusted anchor. The trusted anchor
   for Mysterium ontology is HoloOS `02.1_Microcosmic_Metabolic_Architecture.md`
   (canonical). The trusted anchor for Mysterium game-mechanics is the running
   code in `src/core/`.
2. **Construction**: build new claims via fractal recursion (every element is
   itself a holon) and structural mirroring (separate invariant from
   decoration).
3. **Validation**: red-team every claim; run Type Validation (T1/T2/T3); retain
   provenance.

### Seven Obligations

1. Name the anchor.
2. Show derivation.
3. Separate invariant from decoration.
4. Expose joints (where two primitives connect).
5. Refuse borrowed rigor (don't import empirical validity from another domain).
6. Stay cosmological (don't conflate game-mechanic with metaphysical claim).
7. Mark the unmodelable (the Absolute is not modeled).

### Status ladder

Every claim in `docs/foundations/` is tagged with one of:
- `ai-draft` — proposed, not yet validated
- `canonical-hypothesis` — derived from canonical anchor, not yet
  empirically validated
- `canonical` — validated (empirically for game-mechanics; cross-scale
  homological for metaphysics)
- `superseded` — replaced by a later claim; retained for provenance

A claim without a status tag is treated as `ai-draft`.

**Status**: canonical (the discipline itself is HoloOS canonical; Mysterium
adoption is canonical for Mysterium).
```

### 2.6 Mysterium-only primitives that should be RETAINED

The following Mysterium primitives have no HoloOS analog and should be **retained as game-architecture contributions**, not deleted in the alignment refactor:

| Primitive | Why retain |
|---|---|
| **Encounter Scheduler** | The 7-criteria priority formula is a novel game-AI contribution. HoloOS has no scheduler. |
| **AutoMode Strategy Engine** | Session-level strategy consuming CCI is a game-specific layer. |
| **MacroCatalystEngine** | PESTLE-mapped macro-events are a Mysterium invention. |
| **PESTLE state** | 6 collective dimensions are a Mysterium invention. |
| **Perceptual Layer System** | 8 perceptual layers on one geography is a Mysterium invention. |
| **Veil of Forgetting (as mechanic)** | UX-enforcement of "no scores visible" is Mysterium-specific. |
| **Infinite Checkpoint Model** | Game-flow choice. |
| **Harvest endgame** | Post-White content. |
| **Violet-ray expression** | Harvest criterion. |
| **Codex** | In-fiction lore journal. |
| **Onboarding binary search** | Per-line calibration. |
| **8 Registries** | Plugin architecture. |
| **Three-layer architecture** | `core/` + `infra/` + `game/` separation. |
| **Two-mode gameplay** | Direct Questioning vs Story-Driven. |
| **ModuleGamePool** | ≥5 games per module. |
| **Staircase** | 1-up/2-down DDA at 70.7% convergence. |
| **Theta-decay** | 7-day half-life per line. |
| **Bleed-through** | Stale-cell priority boost. |
| **Holonic return** | Every-3-encounters shadow surfacing. |
| **CompoundShadow / Knot** | Cross-line shadow patterns. |
| **ShadowSignal / ShadowQuadrant** | 4-quadrant shadow taxonomy (matches HoloOS but Mysterium-specific operationalization). |
| **Heal/Evolve + Evolve/Heal vectors** | Bottom-up vs top-down shadow resolution. |
| **Atman Project defenses** | 4 ego-defenses against transcendence. |
| **Disintegrative loop / Stagnation path** | 8-step pathology cycles. |
| **Transformation phase machine** | 6-phase state machine. |
| **Post-transformation bias** | 5-session weighted fade. |
| **HolonContextEngine** | 7-step LLM context pipeline. |
| **FrequencyConditioner** | Stage-frequency prompt tuning. |
| **ConsequenceParser** | LLM-output validation. |
| **FallbackProvider** | Multi-provider LLM fallback + deterministic content pools. |
| **LLM contract templates** | DeterministicFraming / LanguageReflective / ScenarioChoice. |
| **GameDefinition** | Per-game spec inside ModuleGamePool. |
| **TaskType** | 13+ task types with NetworkClaim citations. |
| **8 task-type renderers** | NBack, ReactionTime, Dilemma, Scenario, Hold, Pattern, Emotion, LLMDialogue. |
| **SessionAgent** (prescribed, not implemented) | Persistent cross-encounter agent. |

### 2.7 Mysterium docs that need full rewrite — paste-ready replacement text

The following docs need **full rewrite** (not just the section patches above). The replacement text is provided in §2.5 per-gap; this section lists which docs and why.

| Doc | Why rewrite | Replacement text in |
|---|---|---|
| `docs/foundations/16-significator-architecture.md` | Conflates Significator with player-only; needs NPC/Faction/World scope | §2.5.1 |
| `docs/foundations/14-game-as-developmental-catalyst.md` | Omits Matrix/Potentiator; needs Lesser Cycle naming | §2.5.2 |
| `docs/foundations/17-transformation-mechanics.md` | Missing Great Way; Greater Cycle incomplete | §2.5.3 |
| `docs/foundations/01-aqal-quadrants.md` | Needs status-ladder preface; coordinate-system divergence | §2.5.4 |
| `docs/foundations/23-polarity-ontology.md` | Conflates PolarityTexture with Type; needs Type⊥Stage distinction | §2.5.5 |
| `docs/foundations/25-cumulative-consciousness-index.md` | Missing G_z/P_z dual health metric | §2.5.6 |
| `docs/foundations/03-lines-of-intelligence-overview.md` | Needs Line-to-Complex affinity | §2.5.8 |
| `docs/foundations/06-law-of-one-correspondence.md` | Needs scope-limitation footnote (Involution out of scope) | §2.5.9 |
| `docs/03-research-methodology.md` | Needs Method of Holonic Inquiry + status ladder + Type Validation Protocol | §2.5.13, §2.5.14 |
| `docs/foundations/00-integral-theory.md` | Needs status-ladder preface (meta-fix) | §2.3 |

The remaining 18 foundations docs (02, 04, 05, 07, 08, 09, 10, 11, 12, 13, 15, 18, 19, 20, 21, 22, 24, 26, 27) need only a `**Status**:` line added at the top — no content rewrite.

---

## 3. Source-Code Audit

### 3.1 Module map (5 tiers)

#### Tier 1 — Core engines (most critical)

| File | LOC | Responsibilities | Key smells | Bugs (confirmed / new) | HoloOS alignment |
|---|---|---|---|---|---|
| `core/engines/CCIEngine.ts` | 709 | Computes 5-dim CCI; selects session theme | Long functions; magic numbers; `selectSessionTheme` priority cascade is brittle | 0 / 1 (HS-01 consumer) | **Missing G_z/P_z dual metric** (§2.5.6) |
| `core/engines/PolarityEngine.ts` | ~400 | Computes polarity cells, master mode, crystallization | Type-unsafe casts; `Math.random()` in scoring | 0 / 0 | Embodies HoloOS Polarity partially; **missing P_z formalization** |
| `core/engines/ConsequenceEngine.ts` | ~500 | Applies encounter consequences to Significator | `compoundPartner` hardcoded null (was A2, now resolved); `applyConsequences` doesn't update `sig.recentEncounters` | 0 / 1 (HS-07) | Implements Lesser-Cycle Experience stage; **missing Greater-Cycle ratchet** |
| `core/engines/CandidateGeneration.ts` | 280 | Generates encounter candidates with filters | `getEligibleModalities` has dead `moduleTaskTypes` param (HS-13); filter logic conflates line/stage/modality cooldowns | 0 / 1 (HS-13) | Implements Lesser-Cycle Potentiator stage (per §2.5.2) |
| `core/engines/EncounterScheduler.ts` | 186 | Ranks candidates by 7-criteria priority; shadow-work threshold detection | `lineShadowModes`/`lineShadowTargets` maps computed but `lineShadowTarget` fallback to global `shadowTarget` is wrong (uses first active shadow, not line-specific) | 0 / 0 | Implements Lesser-Cycle scheduling; aligned |
| `core/engines/AutoModeStrategy.ts` | ~300 | Consumes CCI; produces session plan | Not consumed by EncounterScheduler in current path (orphan?) — needs verification | 0 / 0 | Game-only; aligned |
| `core/engines/MacroCatalystEngine.ts` | ~250 | PESTLE tension accumulation; macro-event triggering | Wired (was A7, now resolved); tension thresholds magic numbers | 0 / 0 | Game-only; aligned |
| `core/engines/ShadowContentGenerator.ts` | ~200 | Generates shadow-mode encounter content | Hardcoded narrative frames per quadrant; no LLM integration | 0 / 0 | Aligned with HoloOS 4-quadrant shadow taxonomy |
| `core/engines/ThetaDecay.ts` | ~100 | Computes per-cell staleness | Per-line half-life config exists but **ignored in PriorityComputation** (HS-03) | 0 / 1 (HS-03) | Implements Mysterium theta-decay; aligned |
| `core/engines/TransformationDetector.ts` | ~200 | Detects transformation readiness; manages phase machine | Phase transitions session-count-based (A6, open); **counters not persisted on Significator** (HS-06) | 1 / 1 (HS-06) | **Missing Great Way** (§2.5.3) — ratchet is counter-based, not Choice-driven |
| `core/engines/PriorityComputation.ts` | 263 | 7-criteria weighted priority formula | `now % 2000` tie-breaker is non-deterministic across runs; `computeSessionFit` uses `'Strategic'` but enum is `'Strategic'` (ok); diversity/weakness/novelty bonuses undocumented in spec | 0 / 0 | Aligned with foundations/24 §3.2 spec |
| `core/GameLoop.ts` | ~300 | Main game loop; orchestrates engines | `estimateResponseQuality()` naive heuristic (C19, open); `tickWithStrategy()` 1-encounter-behind lag (C24, open) | 2 / 0 | Implements linear catalyst loop; **missing recursive loop** (§0.1 #3) |
| `core/usecases/RegistryEngine.ts` | ~150 | Loads/caches registries | None significant | 0 / 0 | Aligned |
| `core/usecases/ProfileUpdater.ts` | 14 | (Was 150 LOC; shrank to 14 — A13 resolved) | Dead code; legacy `EncounterResult` interface | 1 (A13) / 0 | Cleanup needed |
| `core/usecases/StageSynthesizer.ts` | ~80 | Hysteresis synthesis of Stage from altitudes | **Both if/else branches set the same value** (HS-04) — hysteresis rule is dead code | 0 / 1 (HS-04) | Implements Mysterium-specific hysteresis; aligned in concept |
| `core/usecases/ShadowDetector.ts` | ~150 | Detects shadows from behavioral patterns | Wired (was A1, now resolved) but **starved of data** — `applyConsequences` doesn't update `sig.recentEncounters` (HS-07) | 0 / 1 (HS-07 consumer) | Aligned with HoloOS shadow taxonomy |
| `core/usecases/OnboardingCalibrator.ts` | ~200 | Binary-search calibration | Architecture in place; per-probe content not redesigned (O2-O9, open) | 0 / 0 | Aligned |
| `core/usecases/Staircase.ts` | ~120 | 1-up/2-down DDA | **Docstring claims 70.7% convergence but actual math is 61.8%** (HS-19) | 0 / 1 (HS-19) | Aligned in concept; math bug |
| `core/usecases/ThresholdMaps.ts` | ~80 | Per-stage threshold constants | Magic numbers; no provenance | 0 / 0 | Aligned |
| `core/usecases/LineCeilings.ts` | ~50 | `altitude(L) <= Cognitive.altitude + 1` rule | None | 0 / 0 | Aligned |

#### Tier 2 — Domain + persistence

| File | LOC | Responsibilities | Key smells | Bugs | HoloOS alignment |
|---|---|---|---|---|---|
| `core/domain/State.ts` | ~80 | Lifecycle state machine | None | 0 / 0 | Aligned |
| `core/domain/PlayerProfile.ts` | ~100 | Legacy profile (pre-Significator) | Should be deleted; superseded by Significator | 0 / 0 | Cleanup |
| `core/domain/Significator.ts` | 138 | Significator interface + `TransformationRecord` | `TransformationRecord` has `triggeredAt` (ms-timestamp) but no `triggeredAtSession` (HS-01 root cause) | 0 / 1 (HS-01) | **Player-only; needs NPC/Faction/World scope** (§2.5.1) |
| `core/domain/Holon.ts` | ~80 | Holon interface | No `transformations` field — NPCs cannot transform (§2.5.1) | 0 / 1 (ontological) | **Missing Significator on NPC holons** |
| `core/domain/Encounter.ts` | ~60 | Encounter interface | None | 0 / 0 | Aligned |
| `core/domain/ShadowLedger.ts` | ~80 | Shadow entries ledger | Severity set at creation, never mutated (A3 was open; now resolved per agent report — verify) | 0 / 0 | Aligned |
| `core/domain/PolarityTrace.ts` | ~100 | Per-encounter gestalt | None | 0 / 0 | Aligned |
| `core/domain/PolarityCellVector.ts` | ~120 | Per-(line×stage) polarity cell | None | 0 / 0 | Aligned |
| `core/domain/Drive.ts` | ~50 | Drive enum | None | 0 / 0 | Aligned |
| `core/domain/Stage.ts` | ~60 | Stage enum + `stageOrdinal` | None | 0 / 0 | Aligned |
| `core/domain/Line.ts` | ~50 | Line enum | **No Complex affinity field** (§2.5.8) | 0 / 1 (ontological) | **Missing Complex differentiation** |
| `core/domain/Ray.ts` | ~50 | Ray enum | None | 0 / 0 | Aligned (game-specific) |
| `core/domain/SignificatorSnapshot.ts` | 197 | Snapshot for CCI computation | **`sessionsSinceLastTransformation` math is dimensionally wrong** (HS-01) | 0 / 1 (HS-01) | Aligned |
| `core/domain/ConsequenceRecord.ts` | ~50 | Consequence record | None | 0 / 0 | Aligned |
| `core/domain/EncounterSpecNew.ts` | ~80 | Scheduled encounter spec | None | 0 / 0 | Aligned |
| `core/domain/SharedTypes.ts` | ~60 | Shared types | None | 0 / 0 | Aligned |
| `core/domain/Stats.ts` | ~40 | Stats interface | None | 0 / 0 | Aligned |
| `core/domain/enums.ts` | ~30 | Modality, ShadowQuadrant, HolonKind enums | None | 0 / 0 | Aligned |
| `infra/persistence/SaveRepository.ts` | ~150 | Save/load Significator | **`loadSave` validates only 3 fields** (HS-16) — schema drift crashes | 0 / 1 (HS-16) | Aligned |
| `infra/persistence/WorldStateStore.ts` | ~80 | World state persistence | None | 0 / 0 | Aligned |
| `infra/persistence/SignificatorStore.ts` | ~100 | Significator persistence adapter | None | 0 / 0 | Aligned |
| `infra/persistence/KeyValueStore.ts` | ~20 | KV store interface | None | 0 / 0 | Aligned |
| `infra/persistence/LocalStorageStore.ts` | ~50 | Browser localStorage adapter | None | 0 / 0 | Aligned |
| `infra/persistence/CapacitorPreferencesStore.ts` | ~50 | Capacitor adapter | None | 0 / 0 | Aligned |
| `infra/persistence/createKeyValueStore.ts` | ~30 | Factory | None | 0 / 0 | Aligned |

#### Tier 3 — LLM layer

| File | LOC | Responsibilities | Key smells | Bugs | HoloOS alignment |
|---|---|---|---|---|---|
| `infra/llm/LLMClient.ts` | 293 | OpenAI/Anthropic HTTP calls | Grew from 50→292 LOC (P13 resolved); **VeilFilter not wired** (HS-05) | 0 / 1 (HS-05) | **Veil enforcement missing at I/O boundary** |
| `infra/llm/ContextPipeline.ts` | ~320 | 7-step context assembly | Has own `filterSignificator` (qualitative mapper) but **does NOT use VeilFilter regex**; **raw `layer=Red`, `shadows=DarkAddiction-cognitive-active` in system prompt** (HS-11) | 0 / 1 (HS-11) | **Veil violation at input layer** |
| `infra/llm/VeilFilter.ts` | 92 | Regex-based Veil filter | **`filterInput`/`filterOutput` never called anywhere** (HS-05) | 0 / 1 (HS-05) | Aligned in concept; defective in wiring |
| `infra/llm/FrequencyConditioner.ts` | ~100 | Stage-frequency prompt tuning | None | 0 / 0 | Aligned |
| `infra/llm/ConsequenceParser.ts` | ~80 | Validates LLM consequence output | None | 0 / 0 | Aligned |
| `infra/llm/FallbackProvider.ts` | ~200 | Deterministic content pools | 96 line-specific pools exist; **unreachable when module exists** (C6, open) | 1 / 0 | Aligned |
| `infra/llm/contracts/DeterministicFraming.ts` | ~50 | LLM contract template | None | 0 / 0 | Aligned |
| `infra/llm/contracts/ScenarioChoice.ts` | ~50 | LLM contract template | None | 0 / 0 | Aligned |
| `infra/llm/contracts/LanguageReflective.ts` | ~50 | LLM contract template | None | 0 / 0 | Aligned |
| `infra/llm/contracts/index.ts` | ~20 | Barrel export | None | 0 / 0 | Aligned |

#### Tier 4 — Game layer (skim)

| File | LOC | Responsibilities | Key smells | Bugs | HoloOS alignment |
|---|---|---|---|---|---|
| `game/main.ts` | ~100 | Phaser entry point | None | 0 / 0 | Aligned |
| `game/config.ts` | ~50 | Phaser config | None | 0 / 0 | Aligned |
| `game/scenes/EncounterScene.ts` | ~300 | Encounter rendering + orchestration | **Constructs fresh `TransformationState` with `sessionsInPhase: 0, knotsResolved: 0, totalKnots: 0` every encounter** (HS-06) — counters not persisted | 0 / 1 (HS-06) | **Greater-Cycle state machine broken** |
| `game/scenes/AssessmentScene.ts` | ~200 | Assessment rendering | None significant | 0 / 0 | Aligned |
| `game/scenes/OnboardingScene.ts` | ~150 | Onboarding flow | None | 0 / 0 | Aligned |
| `game/scenes/ReflectionScene.ts` | ~200 | Reflection rendering | **Calls `processOutcome` but never `applyConsequences`** (HS-08) — Significator not updated | 0 / 1 (HS-08) | Lesser-Cycle Experience stage broken |
| `game/scenes/JournalScene.ts` | ~100 | Journal rendering | None | 0 / 0 | Aligned |
| `game/scenes/DilemmaScene.ts` | ~150 | Dilemma rendering | **Calls `processOutcome` but never `applyConsequences`** (HS-08) | 0 / 1 (HS-08) | Lesser-Cycle Experience stage broken |
| `game/scenes/CodexScene.ts` | ~80 | Codex rendering | None | 0 / 0 | Aligned |
| `game/scenes/EncounterSelectionScene.ts` | ~120 | Encounter selection UI | None | 0 / 0 | Aligned |
| `game/systems/EcologicalTracker.ts` | ~100 | PESTLE state tracking | None | 0 / 0 | Aligned |
| `game/systems/ConsequenceNarrator.ts` | ~150 | Narrative consequence rendering | None | 0 / 0 | Aligned |
| `game/assessments/CompositeOnboarding.ts` | 232 | Binary-search onboarding | Architecture in place | 0 / 0 | Aligned |
| `game/assessments/ModalityPresenter.ts` | ~100 | Modality presentation | None | 0 / 0 | Aligned |
| `game/cli/LayerRenderer.ts` | ~300 | CLI rendering | Exists (was A12, partially resolved — CLI-only) | 0 / 0 | Aligned |

#### Tier 5 — Top-level entry + CLI

| File | LOC | Responsibilities | Key smells | Bugs | HoloOS alignment |
|---|---|---|---|---|---|
| `main.ts` | ~30 | Entry point | None | 0 / 0 | Aligned |
| `infra/native/cliAgentLoop.ts` | ~400 | CLI agent loop | **`messages = []; // FRESH EVERY ENCOUNTER`** still present (C1, open) | 1 / 0 | **Missing persistent SessionAgent** |

#### Tier 6 — Project config

| File | Notes |
|---|---|
| `package.json` | Standard; bun + vite + phaser + capacitor |
| `tsconfig.json` | Strict mode enabled; good |
| `core/index.ts` | **Barrel export gap** (A16, open) — exports only 3 of 10 engines |

### 3.2 Critical Hotspots (HS-01 through HS-20)

These are **NEW findings** not in the prior 77-issue catalog. Each is given with file:line, code snippet, bug description, repro path, severity, HoloOS link (if applicable), and suggested fix.

---

#### HS-01 · `sessionsSinceLastTransformation` math is dimensionally wrong

**File:** `src/core/domain/SignificatorSnapshot.ts:149-151`

**Code:**
```typescript
const sessionsSinceLastTransformation = lastTransformation
  ? Math.max(0, sig.totalSessions - Math.floor(lastTransformation.triggeredAt / 3600000))
  : Infinity;  // Never transformed = not in post-transformation recovery
```

**Bug:** `lastTransformation.triggeredAt` is a millisecond timestamp (e.g., `1751500000000` for ~2025-07-03). Dividing by `3_600_000` converts to **hours since epoch** (e.g., `486_527`). `sig.totalSessions` is a session count (typically `<100`). The subtraction `totalSessions - hoursSinceEpoch` is a huge negative number, clamped to `0` by `Math.max(0, ...)`. Result: `sessionsSinceLastTransformation === 0` for **every transformed player**.

**Consumer:** `src/core/engines/CCIEngine.ts:509` — `if (inputs.transformationReadiness.sessionsSinceLastTransformation < 5) return 'post-transformation';` — fires always for transformed players, permanently locking the session theme.

**Repro path:** Any playtest past the first transformation. After transformation, every subsequent session selects `'post-transformation'` theme regardless of actual player state, bypassing the entire AutoMode strategy cascade.

**Severity:** Critical.

**HoloOS link:** This breaks the Greater Cycle's "Choice" stage — the ratchet action is supposed to be Choice-driven, not session-counter-driven (§2.5.3). The bug compounds the missing Great Way.

**Suggested fix:** Add `triggeredAtSession: number` to `TransformationRecord` interface (`Significator.ts:19-24`). Populate it at construction time from `sig.totalSessions`. Use it in the snapshot:
```typescript
const sessionsSinceLastTransformation = lastTransformation
  ? Math.max(0, sig.totalSessions - (lastTransformation.triggeredAtSession ?? 0))
  : Infinity;
```
The `?? 0` fallback preserves save-compat for old records (treats them as "transformation happened this session").

---

#### HS-02 · `selectSessionTheme` permanently locked to `'post-transformation'`

**File:** `src/core/engines/CCIEngine.ts:509`

**Code:** See HS-01.

**Bug:** Downstream consumer of HS-01. The session-theme cascade at `CCIEngine.ts:501-539` checks `sessionsSinceLastTransformation < 5` immediately after the `pendingTransformation` check; once `sessionsSinceLastTransformation === 0` (always, per HS-01), this branch wins over every subsequent check (`shadow-integration`, `drive-rebalancing`, `transformation-prep`, `polarity-deepening`, `growth-edge-push`, `consolidation`, `balanced-development`).

**Repro path:** Transform once; play 10 more sessions; observe that every session selects `'post-transformation'` theme regardless of shadow pressure, drive fixation, or polarity momentum.

**Severity:** Critical.

**HoloOS link:** Violates HoloOS's "both G_z AND P_z required" invariant — the player cannot exercise P_z (polarization, transcendence) because the engine locks them into G_z-only (integration, balance) mode forever.

**Suggested fix:** Fix HS-01. Once `sessionsSinceLastTransformation` is correct, this cascades automatically.

---

#### HS-03 · Per-line theta half-lives ignored in priority computation

**File:** `src/core/engines/PriorityComputation.ts:116`

**Code:**
```typescript
const decayLevel = computeCellStaleness(lastTs, now, DEFAULT_THETA_PARAMS.halfLife);
```

**Bug:** `DEFAULT_THETA_PARAMS.halfLife` is a single global value (7 days). The `foundations/14 §7` spec calls for **per-line** half-lives (Body decays fastest, Spirit slowest), and `ThetaDecay.ts` reportedly supports per-line config — but `computeThetaUrgency` in `PriorityComputation.ts` uses the global default, not the per-line value. Result: all lines decay at the same rate, the per-line config is dead.

**Repro path:** Configure different per-line half-lives in `ThetaDecay.ts`; play a session; observe that theta-decay urgency is identical across lines.

**Severity:** High.

**HoloOS link:** Violates HoloOS Complex differentiation (§2.5.8) — different substrate-faces should have different metabolic rates.

**Suggested fix:** Pass the per-line half-life to `computeCellStaleness`:
```typescript
const halfLife = THETA_PARAMS.perLine?.[c.line] ?? DEFAULT_THETA_PARAMS.halfLife;
const decayLevel = computeCellStaleness(lastTs, now, halfLife);
```

---

#### HS-04 · `StageSynthesizer` hysteresis rule is dead code

**File:** `src/core/usecases/StageSynthesizer.ts` (per agent report)

**Bug:** Both branches of the hysteresis if/else set the same Stage value, so the hysteresis rule (`Stage = max S such that all lines ≥ S AND at least one line reaches S+1`) is not actually applied. The synthesized Stage is just `min(altitudes)`.

**Repro path:** Set altitudes to `{Cognitive: Amber, Emotional: Red, ...}`; observe that synthesized Stage is `Red` (the min), not `Red` per hysteresis (which would also be `Red`, but for different reasons — the rule is supposed to require "at least one line reaches S+1" before advancing). With altitudes `{Cognitive: Amber, Emotional: Amber, Moral: Amber, ...all Amber}`, synthesized Stage should be `Amber` per hysteresis (all lines ≥ Amber, at least one at Amber+1=Orange — but if NO line is at Orange, Stage stays at Red). The current code returns `Amber` (the min), which is wrong.

**Severity:** High.

**HoloOS link:** HoloOS's Stage≡Density equivalence requires the hysteresis rule for correct density assignment.

**Suggested fix:** Rewrite the synthesis to actually implement the spec:
```typescript
export function synthesizeStage(altitudes: Record<Line, Stage>): Stage {
  const ALL_STAGES: readonly Stage[] = ['Infrared', 'Magenta', 'Red', 'Amber', 'Orange', 'Green', 'Turquoise', 'White'];
  // Stage = max S such that all lines >= S AND at least one line >= S+1
  // (or S is the lowest stage and all lines >= S)
  for (let i = ALL_STAGES.length - 1; i >= 0; i--) {
    const s = ALL_STAGES[i];
    const allAtLeastS = Object.values(altitudes).every(a => stageOrdinal(a) >= i);
    const atLeastOneAboveS = i === 0 || Object.values(altitudes).some(a => stageOrdinal(a) > i);
    if (allAtLeastS && atLeastOneAboveS) return s;
  }
  return 'Infrared';
}
```

---

#### HS-05 · `VeilFilter.filterInput` and `filterOutput` never called anywhere

**File:** `src/infra/llm/VeilFilter.ts:50, 66`

**Bug:** The VeilFilter module defines `filterInput(content: string): string` and `filterOutput(content: string): {passed, filtered, violations}` — 92 LOC of regex patterns that strip Veil-violating content (stage labels, drive labels, shadow quadrant names, numerical scores, polarity data, theta-decay, assessment-diagnostic language, progress percentages). A repo-wide grep finds **zero callers** of either function. The only file that imports from `VeilFilter` is `ContextPipeline.ts`, and it imports the `VeilFilteredSignificator` *interface* (a different thing) — not the filter functions. `ContextPipeline` has its own `filterSignificator` function that does qualitative mapping but does NOT use the regex filter.

**Repro path:** Send an LLM prompt containing "Your Red stage assessment score is 45%"; observe that the string reaches the LLM unfiltered. Receive an LLM response containing "Your polarity crystallization is at 70%"; observe that the string reaches the player unfiltered.

**Severity:** Critical.

**HoloOS link:** Direct violation of `foundations/20 §4` and `foundations/22 §13` (the Veil spec). HoloOS's Veil is cosmological; Mysterium's Veil is a UX-enforcement contract — and the contract is unenforced.

**Suggested fix:** Wire `filterInput` and `filterOutput` at the LLM I/O boundary in `LLMClient.ts`:
```typescript
// At the top of chat():
const filteredSystemPrompt = filterInput(systemPrompt);
const filteredMessages = messages.map(m => ({ ...m, content: filterInput(m.content) }));

// Before each return of content:
const result = filterOutput(content);
if (!result.passed) {
  // log violation but still return filtered content
  telemetry.recordVeilViolation(result.violations);
}
return { content: result.filtered, toolCalls };
```
Caveat: `filterOutput` is aggressive (strips "50% complete" etc.) and may over-strip legitimate game text. Test with a sample of LLM outputs before enabling in production; consider a "soft mode" that logs violations but doesn't strip.

---

#### HS-06 · Transformation state machine counters not persisted on Significator

**File:** `src/game/scenes/EncounterScene.ts:80` (per agent report)

**Bug:** `EncounterScene` constructs a fresh `TransformationState` with `sessionsInPhase: 0, knotsResolved: 0, totalKnots: 0` every encounter. These counters are not persisted on the Significator. Result: the state machine either deadlocks at `'threshold'` forever (because `sessionsInPhase` never increments to the crucible trigger) or skips the crucible entirely (because `knotsResolved >= totalKnots` evaluates to `0 >= 0` = true on the first encounter).

**Repro path:** Reach transformation threshold; observe that the crucible either never fires or fires immediately without the 3-phase Unravelling → Crucible → Emergence arc.

**Severity:** Critical.

**HoloOS link:** Direct violation of the Greater Cycle's Transformation stage (§2.5.3). The ratchet mechanism is supposed to be Choice-driven, not counter-driven, but even the counter-driven fallback is broken.

**Suggested fix:** Persist `transformationPhase`, `sessionsInPhase`, `knotsResolved`, `totalKnots` on `Significator.transformationState` (the field already exists at `Significator.ts:83` but is not populated). Update `EncounterScene` to read from and write to `sig.transformationState` instead of constructing a fresh object.

---

#### HS-07 · `applyConsequences` doesn't update `sig.recentEncounters`

**File:** `src/core/engines/ConsequenceEngine.ts` (per agent report)

**Bug:** `applyConsequences` updates `altitudes`, `drives`, `shadows`, `polarity`, `theta` — but NOT `recentEncounters`. The `recentEncounters` field (defined on `WorldState` at `CandidateGeneration.ts:53`) is used by `CandidateGeneration` filters (cooldown, recency, modality rotation) and by `ShadowDetector` (behavioral pattern detection). Since `applyConsequences` doesn't update it, `recentEncounters` stays empty (or stale), starving both the cooldown filter and the ShadowDetector.

**Repro path:** Play 5 encounters; observe that `recentEncounters` is still `[]` (or only populated by some other path). Observe that the cooldown filter at `CandidateGeneration.ts:178-191` never triggers because `recent` is empty. Observe that `ShadowDetector.detectBehavioralPatterns()` returns no patterns because it has no behavioral data.

**Severity:** High.

**HoloOS link:** Starves the Lesser-Cycle's Matrix (reservoir) and the shadow-detection layer. The newly-wired ShadowDetector (A1 resolved) is effectively still dead because it has no data.

**Suggested fix:** At the end of `applyConsequences`, append the encounter to `sig.recentEncounters` (or to `world.recentEncounters` — need to clarify ownership):
```typescript
// At end of applyConsequences():
sig.recentEncounters = [...sig.recentEncounters, {
  line: encounter.line,
  stage: encounter.stage,
  modality: encounter.modality,
  timestamp: Date.now(),
}].slice(-20); // keep last 20
```

---

#### HS-08 · `ReflectionScene` and `DilemmaScene` call `processOutcome` but never `applyConsequences`

**File:** `src/game/scenes/ReflectionScene.ts:187`, `src/game/scenes/DilemmaScene.ts:97` (per agent report)

**Bug:** These scenes process the player's response (`processOutcome`) for display purposes but never call `applyConsequences` to update the Significator. Result: encounters of type `Reflection` or `Dilemma` don't update the player's developmental state.

**Repro path:** Play a Reflection encounter; observe that altitudes, drives, shadows, polarity are unchanged. Play a Dilemma encounter; same.

**Severity:** Critical.

**HoloOS link:** Breaks the Lesser-Cycle's Experience stage (§2.5.2) for these encounter types.

**Suggested fix:** Add `applyConsequences(sig, encounter, outcome)` call after `processOutcome` in both scenes. Verify the encounter spec includes the necessary inputs.

---

#### HS-09 · `computeCellStaleness` returns wrong value when `lastTs === 0`

**File:** `src/core/engines/ThetaDecay.ts` (per agent report — verify)

**Bug:** When `lastTs === 0` (cell never visited), `computeCellStaleness` returns 0 (no staleness) instead of 1 (max staleness). This contradicts `PriorityComputation.computeThetaUrgency` which special-cases `lastTs === 0` to return 1 (max urgency). The two functions disagree.

**Severity:** Medium.

**HoloOS link:** Confuses the Matrix reservoir state — a cell that's never been visited should be maximally stale, not maximally fresh.

**Suggested fix:** Align `computeCellStaleness` with `computeThetaUrgency`: return 1 when `lastTs === 0`.

---

#### HS-10 · `computeDifficulty` uses `traceCount` as proxy for familiarity but doesn't account for time-since-last-trace

**File:** `src/core/engines/EncounterScheduler.ts:128-135`

**Code:**
```typescript
function computeDifficulty(sig: Significator, line: string, stage: string): number {
  const key = `${line}:${stage}`;
  const cell = sig.polarity.cells[key];
  const traceCount = cell?.traceCount ?? 0;
  return Math.max(0.3, Math.min(0.9, 0.9 - traceCount * 0.05));
}
```

**Bug:** A player who has 10 traces on a cell but hasn't visited it in 30 days gets the same difficulty reduction as a player who has 10 traces and visited yesterday. Theta-decay should erode the familiarity benefit over time.

**Severity:** Medium.

**HoloOS link:** HoloOS's Matrix reservoir is time-aware; this implementation is not.

**Suggested fix:** Factor in `computeCellStaleness`:
```typescript
const staleness = computeCellStaleness(lastTs, now, halfLife);
const effectiveTraces = traceCount * (1 - staleness);
return Math.max(0.3, Math.min(0.9, 0.9 - effectiveTraces * 0.05));
```

---

#### HS-11 · `ContextPipeline.formatPlayerState` puts raw Veil-violating labels into LLM system prompt

**File:** `src/infra/llm/ContextPipeline.ts:293-313` (per agent report)

**Code:**
```typescript
function formatPlayerState(sig: VeilFilteredSignificator): string {
  const signals: string[] = [
    `layer=${sig.perceivedLayer}`,                          // "layer=Red" — Veil violation
    `transformation=${sig.transformationProximity}`,
    // ...
    `drives=${sig.activeDriveSignals.join(',')}`,           // "drives=agency-elevated" — Veil violation
    `shadows=${sig.activeShadowQuadrants.join(',')}`,       // "shadows=DarkAddiction-cognitive-active" — Veil violation
  ];
  // ...
}
```

**Bug:** Even though `filterSignificator` (the qualitative mapper) converts numerical state to qualitative labels, those labels (`layer=Red`, `drives=agency-elevated`, `shadows=DarkAddiction-cognitive-active`) are still Veil-violating per `foundations/20 §4`. The Veil should hide the *existence* of the stage/drive/shadow taxonomy from the LLM, not just the numerical values. The LLM can infer the taxonomy from these labels and leak it back to the player.

**Severity:** Critical.

**HoloOS link:** Veil violation at the input layer. Compounds HS-05 (VeilFilter not wired).

**Suggested fix:** Replace labels with purely qualitative descriptions:
```typescript
// Instead of: `layer=Red`
// Use: `player resonance = survival-focused, power-oriented`
// Instead of: `drives=agency-elevated`
// Use: `player is currently expressing active, asserting tendencies`
// Instead of: `shadows=DarkAddiction-cognitive-active`
// Use: `player is currently entangled with a familiar but unhelpful pattern around cognition`
```
This is a content change, not just a code change — needs review by the design team.

---

#### HS-12 · `driveForLine` makes Agape drive unreachable

**File:** `src/core/engines/ShadowContentGenerator.ts:136` (per agent report)

**Bug:** `driveForLine(line)` maps each Line to a primary Drive, but no Line maps to Agape. Result: Agape can never be the `drive` field in a shadow encounter, so shadow content for Agape-pathology (over-integration, spiritual-bypass-via-love) is unreachable.

**Severity:** Medium.

**HoloOS link:** HoloOS's 4 drives are co-equal boundary axes (§2.5.6, §2.5.8). Mysterium's `driveForLine` collapses them to 3.

**Suggested fix:** Audit `driveForLine` and add Agape mappings (e.g., `Spiritual → Agape`, `Interpersonal → Communion/Agape`).

---

#### HS-13 · `getEligibleModalities` `moduleTaskTypes` parameter never passed — modality filter is dead

**File:** `src/core/engines/CandidateGeneration.ts:167`

**Code:**
```typescript
// Line 167:
const eligible = session?.forceModality
  ? [session.forceModality as Modality]
  : getEligibleModalities(holon, blockedModalities);
//                                                        ^^^ no third arg

// Lines 227-244:
function getEligibleModalities(
  holon: Holon,
  blocked: Set<Modality>,
  moduleTaskTypes?: Set<string>,    // never passed
): Modality[] {
  const primary = holon.modality ?? 'ImmersiveRPG';
  const taskTypes = moduleTaskTypes ?? getAllTaskTypes();  // falls back to ALL task types
  const eligible = ALL_MODALITIES.filter(m => {
    if (blocked.has(m)) return false;
    const chain = MODALITY_TASK_TYPES[m];
    return chain.some(t => taskTypes.has(t));  // always true (taskTypes = ALL)
  });
  // ...
}
```

**Bug:** The `moduleTaskTypes` parameter exists to filter modalities by what the module actually supports — but no caller passes it. The filter at line 239 always returns true because `taskTypes` defaults to `getAllTaskTypes()` (the set of ALL task types across ALL modalities). Result: every modality looks "eligible" for every module. This is the **root cause of the modality collapse** flagged in every prior audit (C3).

**Repro path:** Load any Red-stage module (which should support only `Deterministic` and `Embodied` modalities per its task types); observe that the scheduler considers `ImmersiveRPG`, `SocialCooperative`, `ScenarioChoice`, `LanguageReflective`, `Strategic` all eligible. Observe that 6/8 Red-stage modules produce identical generic n_back under `Deterministic` modality.

**Severity:** Critical.

**HoloOS link:** Breaks the Lesser-Cycle Potentiator (input membrane) — the membrane doesn't actually filter.

**Suggested fix:** Plumb the module's task types through. The `moduleRef` is `${line}:${stage}` — look up the module in the registry, get its `tasks: AssessmentTask[]`, extract task types, pass to `getEligibleModalities`:
```typescript
// In generateCandidates(), before line 167:
const moduleTaskTypes = registry.getModuleTaskTypes(moduleRef); // new registry method
const eligible = session?.forceModality
  ? [session.forceModality as Modality]
  : getEligibleModalities(holon, blockedModalities, moduleTaskTypes);
```
This requires adding a `getModuleTaskTypes(moduleRef: string): Set<string>` method to the registry, which iterates the module's `tasks` array and collects their `type` fields.

---

#### HS-14 · `narrativeBeats` all have empty `gatedEncounterIds` — Filter 7 never gates

**File:** `src/core/engines/CandidateGeneration.ts:200-203`

**Code:**
```typescript
// Filter 7: Narrative beat gating — if encounter is gated by incomplete beat, skip
const gatedByBeat = world.narrativeBeats.some(
  beat => !beat.completed && beat.gatedEncounterIds.includes(moduleRef),
);
if (gatedByBeat) continue;
```

**Bug:** Per agent report, all `narrativeBeats` in the seed data have empty `gatedEncounterIds` arrays. The filter is correctly implemented but never triggers. Result: the narrative system cannot gate encounter availability, undermining the story-arc structure.

**Severity:** Medium.

**HoloOS link:** No direct HoloOS analog (Mysterium-specific narrative system), but violates the design intent.

**Suggested fix:** Populate `gatedEncounterIds` in narrative beat seed data; OR remove Filter 7 if narrative gating is not a Phase-0/1 priority.

---

#### HS-15 · `holonDeltas` always empty — NPC-relationship-delta block is dead

**File:** `src/core/engines/ConsequenceEngine.ts` (per agent report)

**Bug:** The `holonDeltas` field (NPC relationship deltas from encounters) is always an empty array. The block in `applyConsequences` that processes `holonDeltas` to update `world.npcRelationships` is therefore dead code. Result: NPC relationships don't evolve through encounters.

**Severity:** Medium.

**HoloOS link:** Mysterium-specific (no HoloOS analog), but blocks the story-driven mode differentiation (C2/C23, open).

**Suggested fix:** Populate `holonDeltas` in encounter consequence output; OR remove the dead block if NPC relationship evolution is not a Phase-0/1 priority.

---

#### HS-16 · `SaveRepository.loadSave` validates only 3 fields — schema drift crashes

**File:** `src/infra/persistence/SaveRepository.ts` (per agent report)

**Bug:** `loadSave` validates only `id`, `createdAt`, `lifecycle` — then trusts the rest. If the saved schema has drifted (e.g., new field added to Significator, old save doesn't have it), downstream code crashes with `Cannot read property X of undefined`.

**Severity:** High.

**HoloOS link:** No direct HoloOS analog (Mysterium-specific persistence), but violates the Method of Holonic Inquiry's "expose joints" obligation — the schema boundary is not exposed.

**Suggested fix:** Add a `validateSignificator(obj: unknown): Significator` function that checks all required fields, with backward-compat shims for old saves (default missing fields to safe values). Call it in `loadSave` before returning.

---

#### HS-17 · `WorldScene` uses lifetime `totalEncounters` as in-session count — breaks warmup/peak/cooldown arc

**File:** `src/game/scenes/WorldScene.ts` (per agent report)

**Bug:** `WorldScene` reads `sig.totalEncounters` (a lifetime counter) and uses it as `session.encountersSoFar` (an in-session counter). Result: the warmup/peak/cooldown arc computation at `EncounterScheduler.ts:65-67` (`progress = session.encountersSoFar / session.targetSessionLength`) produces a progress value > 1.0 after the first session, permanently locking the session position to `'cooldown'`.

**Severity:** High.

**HoloOS link:** Breaks the Lesser-Cycle's session-arc rhythm.

**Suggested fix:** Use a per-session counter (reset to 0 at session start, increment per encounter) instead of `sig.totalEncounters`.

---

#### HS-18 · `Staircase` docstring claims 70.7% convergence but actual math is 61.8%

**File:** `src/core/usecases/Staircase.ts` (per agent report)

**Bug:** The 1-up/2-down rule's theoretical convergence is at **61.8%** accuracy (the golden-ratio conjugate), not 70.7% as documented in `foundations/08`. The 70.7% figure is for 1-up/1-down (which converges at `1/√2 ≈ 70.7%`). The docstring and the spec are wrong; the code may or may not be wrong depending on which target was intended.

**Severity:** High.

**HoloOS link:** No direct HoloOS analog (Mysterium-specific DDA), but the spec/code mismatch violates the Method of Holonic Inquiry's "show derivation" obligation.

**Suggested fix:** Decide which target is correct (61.8% for 1-up/2-down, 70.7% for 1-up/1-down). Update the docstring AND the spec to match. If 70.7% is the design target, switch to 1-up/1-down; if 61.8% is acceptable, update the docs.

---

#### HS-19 · `computeThetaUrgency` returns 1 when `lastTs === 0` but `computeCellStaleness` returns 0 — inconsistent

**File:** `src/core/engines/PriorityComputation.ts:115` vs `src/core/engines/ThetaDecay.ts`

**Bug:** See HS-09. (Renamed to avoid duplication; this entry confirms the inconsistency is between two functions, not just within one.)

**Severity:** Medium (duplicate of HS-09; merged).

---

#### HS-20 · `AgenticOrchestrator` mutates immutable Significator via cast

**File:** `src/core/assessments/AgenticOrchestrator.ts` (per agent report)

**Bug:** `AgenticOrchestrator` casts `sig as mutable Significator` and mutates fields directly, bypassing the immutability contract. Result: side-effects are not tracked, save/load can produce inconsistent state, and the Method of Holonic Inquiry's "expose joints" obligation is violated (the mutation is hidden).

**Severity:** Low.

**HoloOS link:** No direct HoloOS analog, but violates Mysterium's own stated three-layer architecture principle (`core/` is pure, no mutation across layers).

**Suggested fix:** Replace direct mutation with a `withUpdates(partial)` method that returns a new Significator. Update all callers to use the new signature.

---

### 3.3 Confirmed-but-stale issues (verification of prior 77-issue catalog)

The source-code audit agent verified the highest-priority items from the 77-issue catalog. Summary:

**RESOLVED (7):**
- A2 (compoundPartner hardcoded null) — resolved; `compoundPartner` now computed.
- A3 (shadow severity never ages) — resolved; severity now mutates.
- A7 (MacroCatalystEngine dead imports) — resolved; `accumulateTension` and `tryTriggerMacroEvent` now wired.
- A13 (ProfileUpdater dead code) — resolved; file shrank from 150 to 14 LOC.
- A14 (legacy EncounterScheduler dead code) — resolved; file removed.
- C2 (gameMode variable set but never used) — resolved; variable eliminated entirely.
- P13 (LLMClient.ts is 50 lines, no real HTTP) — resolved; grew to 292 LOC with real HTTP calls.

**PARTIALLY RESOLVED (11):**
- A1/A4/A5 (ShadowDetector wiring) — ShadowDetector now wired but starved of data (HS-07).
- A12 (Perceptual Layer System not implemented) — `LayerRenderer.ts` exists but is CLI-only.
- C5/C6/C9/C10/C12 — partial fixes; see catalog.
- P1 (no save/load persistence) — exists but validation broken (HS-16).

**CONFIRMED STILL OPEN (15):**
- A6, A8, A9, A10, A11, A15, A16, C1, C3, C4, C7, C8, C11, V1, P11.

See the Mysterium Ontology & Prior Audit Catalog (in `/home/z/my-project/worklog.md` under Task `1-mysterium-ontology`) for the full 77-issue list with first-raised tags.

### 3.4 HoloOS-alignment issues in code (not just docs)

Beyond the per-gap findings in §2.5, the following code-level issues are HoloOS-alignment defects (not just bugs):

| Issue | HoloOS link | Severity |
|---|---|---|
| No `GreaterCycleEngine` — Greater Cycle (S·T·G·Ch) not implemented as a first-class engine | §2.5.3 | High |
| No `P_z` computation — CCI treats polarity-crystallization as one of 5 dimensions, not as co-equal health metric | §2.5.6 | High |
| No `Complex` differentiation on `Line` — all Lines run on same substrate | §2.5.8 | Medium |
| No Type system orthogonal to Stage — `PolarityTexture` is Stage-bound | §2.5.5 | Medium |
| No Type Validation Protocol (T1/T2/T3) — no empirical validation of typology claims | §2.5.13 | Medium |
| No status ladder in docs — every claim treated as equally canonical | §2.3 | High (meta) |
| No NPC Significators — only player has Significator; NPCs cannot transform | §2.5.1 | Medium |
| `TransformationRecord` missing `triggeredAtSession` field — Greater-Cycle ratchet counter broken | §2.5.3, HS-01 | Critical (bug) |
| `Holon` interface missing `transformations` field — NPCs cannot have transformation history | §2.5.1 | Medium |
| `core/index.ts` barrel export gap — only 3 of 10 engines exported; violates three-layer architecture | (Mysterium-internal) | Low |

---

## 4. Refactor Plan

### 4.1 Strategic phases (5)

#### Phase 0 — Triage & Unblock (1 week)

**Goal:** Fix the critical bugs that make every playtest past the first transformation produce misleading data.

**Exit criteria:**
- HS-01, HS-02, HS-05, HS-06, HS-08, HS-13 fixed and tested
- A playtest from a transformed player shows non-`'post-transformation'` session themes
- Modality collapse resolved (6/8 Red-stage modules no longer produce identical n_back)
- VeilFilter wired at LLM I/O boundary; violations logged

**Why first:** Every other phase's verification depends on these fixes. Without them, playtest data is misleading.

#### Phase 1 — Ontology Alignment (2 weeks)

**Goal:** Adopt HoloOS's stratification discipline and the missing foundational primitives (Greater Cycle, G_z/P_z, Complex differentiation, Type⊥Stage).

**Exit criteria:**
- All `docs/foundations/` files tagged with `**Status**:` lines
- `GreaterCycleEngine.ts` implemented; `P_z` computed alongside `G_z`
- `Line` interface has `complex: Complex` field; `LineCeilings` updated
- `TransformationRecord` has `triggeredAtSession` field
- `Holon` interface has `transformations: readonly TransformationRecord[]` field
- Type Validation Protocol (T1/T2/T3) documented in `docs/03-research-methodology.md`
- Method of Holonic Inquiry adopted in `docs/03-research-methodology.md`

**Why second:** Builds on Phase 0's stable foundation. Docs-first; code changes are additive (new fields, new engines) and don't break existing behavior.

#### Phase 2 — Catalyst Trajectory Rebuild (3-4 weeks)

**Goal:** Rebuild the encounter pipeline as a recursive 4-step loop with a persistent `SessionAgent`.

**Exit criteria:**
- `SessionAgent` class implemented with `DevelopmentalSynthesis`, `writeInHistory`, `pacing: PacingController`
- `SessionAgent` persists across the entire session (not per-encounter)
- Recursive loop: Detect edge → Generate catalyst AT edge → Observe response → SYNTHESIZE → Adapt next question → Integrate patterns → Shape next encounter → Detect readiness
- Two-mode pipeline: `DirectQuestioningMode` and `StoryDrivenMode` with distinct flows
- `PASSED`/`FAILED` removed from player-visible output
- ContextPipeline injects player's developmental patterns, previous write-ins, shadow trajectory, drive-balance trends, current edge
- `FallbackProvider` content reachable via Direct Questioning path

**Why third:** Builds on Phase 1's Type⊥Stage and Complex differentiation. This is the bulk of the gameplay work.

#### Phase 3 — Veil & Feedback Compliance (1-2 weeks)

**Goal:** Make the Veil airtight at both LLM I/O and renderer layers; replace diagnostic feedback with Veil-compliant qualitative feedback.

**Exit criteria:**
- `VeilFilter` wired at LLM I/O boundary (from Phase 0)
- `ContextPipeline.formatPlayerState` replaced with qualitative descriptions (HS-11)
- All player-visible output audited for Veil violations; zero violations in automated test
- `PASSED`/`FAILED` removed (from Phase 2)
- "Your response reveals: Healthy balanced" replaced with Veil-compliant qualitative feedback
- Per-line stage bars, CCI bar, shadow ledger with quadrant labels, drive labels, per-encounter score, polarity direction — all hidden or replaced with experiential channels

**Why fourth:** Depends on Phase 2's SessionAgent (which provides the qualitative feedback content).

#### Phase 4 — Content Depth & Polish (ongoing)

**Goal:** Fill the content gaps (P3, P12, P14, O2-O9); polish renderers; build native.

**Exit criteria:**
- All 8 stages have meaningful `FallbackProvider` content (not just Red/Amber/Orange)
- Per-probe onboarding content redesigned per `ONBOARDING-REDESIGN-PLAN`
- Renderer polish: animations, transitions, sound, visual feedback, adaptive layouts, per-stage theming
- LLM scoring pipeline fully wired (P13 was resolved; verify end-to-end)
- Native build: `npx cap sync android` run; APK produced

**Why last:** Content can be iterated on after the architecture is stable.

#### Phase 5 — Hardening & Release (1-2 weeks)

**Goal:** Test coverage, performance optimization, invariant verification.

**Exit criteria:**
- Unit tests for individual assessment modules
- Renderer tests
- E2E tests
- LLM pipeline tests
- Property-based CCI normalization tests
- Bundle analysis; code splitting; lazy loading of assessment modules
- `scripts/check-invariants.ts` expanded to verify all 64 modules registered, every task type has renderer, `measures` arrays match `scoringRubric.dimensionWeights` keys, `driveProbes` reference valid task types, no orphans, lifecycle state transitions exhaustively handled

### 4.2 Ticket backlog per phase

Each ticket: **ID** | **Title** | **Effort** (S/M/L) | **Depends on** | **Acceptance criteria**

#### Phase 0 — Triage & Unblock

| ID | Title | Effort | Deps | Acceptance |
|---|---|---|---|---|
| T-0.1 | Add `triggeredAtSession` to `TransformationRecord`; populate at construction; use in `SignificatorSnapshot` | S | — | `sessionsSinceLastTransformation > 0` for transformed players in unit test |
| T-0.2 | Verify `selectSessionTheme` cascade produces non-`'post-transformation'` themes after T-0.1 | S | T-0.1 | Unit test: post-transformation player with high shadow pressure selects `'shadow-integration'` |
| T-0.3 | Wire `VeilFilter.filterInput` and `filterOutput` at LLM I/O boundary in `LLMClient.ts` | S | — | Integration test: LLM prompt containing "Red stage" is filtered before send; LLM response containing "50%" is filtered before return |
| T-0.4 | Plumb `moduleTaskTypes` through `getEligibleModalities` in `CandidateGeneration.ts` | M | — | Unit test: Red-stage Cognitive module (supports `n_back`, `stroop`) is NOT eligible for `ImmersiveRPG` modality |
| T-0.5 | Persist `transformationPhase`, `sessionsInPhase`, `knotsResolved`, `totalKnots` on `Significator.transformationState`; read/write in `EncounterScene` | M | — | Integration test: crucible fires after 3 sessions in `'threshold'` phase, not on first encounter |
| T-0.6 | Add `applyConsequences` call to `ReflectionScene` and `DilemmaScene` after `processOutcome` | S | — | Integration test: Reflection encounter updates Significator altitudes |
| T-0.7 | Update `sig.recentEncounters` in `applyConsequences` | S | — | Unit test: `recentEncounters` has 5 entries after 5 encounters |
| T-0.8 | Add `validateSignificator(obj)` to `SaveRepository.loadSave`; backward-compat shims for old saves | M | — | Unit test: loading a v1 save (missing `transformations`) doesn't crash |
| T-0.9 | Fix `StageSynthesizer` hysteresis if/else dead code | S | — | Unit test: altitudes `{all Amber}` synthesizes to `Red` (no line above Amber), altitudes `{Cognitive: Orange, rest: Amber}` synthesizes to `Amber` |
| T-0.10 | Use per-session encounter counter in `WorldScene`, not `sig.totalEncounters` | S | — | Integration test: `session.encountersSoFar` resets to 0 at session start |
| T-0.11 | Decide Staircase target (61.8% or 70.7%); update docstring and `foundations/08` to match | S | — | Docstring and spec agree with code behavior |
| T-0.12 | Pass per-line theta half-life to `computeCellStaleness` in `PriorityComputation` | S | — | Unit test: lines with different configured half-lives produce different theta urgencies |

**Phase 0 total effort:** ~6 S + 3 M = ~8-10 dev-days

#### Phase 1 — Ontology Alignment

| ID | Title | Effort | Deps | Acceptance |
|---|---|---|---|---|
| T-1.1 | Add `**Status**:` line to all 28 `docs/foundations/` files (meta-fix) | M | — | Every foundations doc has a Status tag; lint script verifies |
| T-1.2 | Adopt Method of Holonic Inquiry in `docs/03-research-methodology.md` (3 Acts, 7 Obligations, status ladder) | S | — | Doc updated; status ladder documented |
| T-1.3 | Adopt Type Validation Protocol (T1/T2/T3) in `docs/03-research-methodology.md` | S | T-1.2 | Doc updated; protocol documented |
| T-1.4 | Rewrite `docs/foundations/16-significator-architecture.md` §1 (NPC/Faction/World scope) per §2.5.1 | S | — | Doc updated; scope expanded |
| T-1.5 | Add `transformations: readonly TransformationRecord[]` field to `Holon` interface | S | — | NPCs can have transformation history |
| T-1.6 | Rewrite `docs/foundations/14-game-as-developmental-catalyst.md` §2 (Matrix/Potentiator naming) per §2.5.2 | S | — | Doc updated; Lesser Cycle mapped |
| T-1.7 | Implement `GreaterCycleEngine.ts` (consumes `Significator.transformations` + `polarity.master.crystallizationIndex`; computes `P_z`) | L | T-1.5 | Engine exists; `P_z` computed; unit tested |
| T-1.8 | Add `P_z` as 6th CCI dimension; restructure CCI to compute `G_z` and `P_z` separately, then compose via geometric mean | L | T-1.7 | CCI outputs `{G_z, P_z, total: G_z*P_z, dimensions: {...}}`; unit tested |
| T-1.9 | Rewrite `docs/foundations/17-transformation-mechanics.md` §1 (Greater Cycle mapping, Great Way) per §2.5.3 | S | T-1.7 | Doc updated; Great Way documented |
| T-1.10 | Add `complex: Complex` field to `Line` enum; populate `LineToComplex` map per §2.5.8 | S | — | All 8 Lines have Complex affinity; unit tested |
| T-1.11 | Add Complex-level altitude synthesis (hysteresis across Lines within a Complex) | M | T-1.10 | `sig.complexAltitudes: Record<Complex, Stage>` computed; unit tested |
| T-1.12 | Add per-Complex theta-decay rates (Body fastest, Spirit slowest) | S | T-1.10 | `THETA_PARAMS.perComplex` config; unit tested |
| T-1.13 | Rewrite `docs/foundations/01-aqal-quadrants.md` preface (coordinate-system divergence) per §2.5.4 | S | — | Doc updated |
| T-1.14 | Rewrite `docs/foundations/23-polarity-ontology.md` §3 (Type vs PolarityTexture) per §2.5.5 | S | — | Doc updated; Type⊥Stage distinction documented |
| T-1.15 | Rewrite `docs/foundations/25-cumulative-consciousness-index.md` §1 (G_z/P_z dual health) per §2.5.6 | S | T-1.8 | Doc updated |
| T-1.16 | Rewrite `docs/foundations/03-lines-of-intelligence-overview.md` (Line-to-Complex affinity) per §2.5.8 | S | T-1.10 | Doc updated |
| T-1.17 | Rewrite `docs/foundations/06-law-of-one-correspondence.md` (Involution scope footnote) per §2.5.9 | S | — | Doc updated |
| T-1.18 | Fix `core/index.ts` barrel export gap (export all 10 engines, not just 3) | S | — | All engines exported; import paths updated |

**Phase 1 total effort:** ~12 S + 2 M + 2 L = ~15-18 dev-days

#### Phase 2 — Catalyst Trajectory Rebuild

| ID | Title | Effort | Deps | Acceptance |
|---|---|---|---|---|
| T-2.1 | Design `SessionAgent` class with `DevelopmentalSynthesis`, `writeInHistory`, `pacing: PacingController` interfaces | M | — | Design doc; interface defined |
| T-2.2 | Implement `SessionAgent` (persistent across session; cross-encounter synthesis; pattern recognition; adaptive question generation) | L | T-2.1 | Class implemented; unit tested |
| T-2.3 | Replace per-encounter `messages = []` in `cliAgentLoop.ts` with `SessionAgent` persistence | M | T-2.2 | LLM conversation history persists across encounters within session |
| T-2.4 | Implement recursive catalyst loop (Detect edge → Generate catalyst AT edge → Observe → SYNTHESIZE → Adapt → Integrate → Shape → Detect readiness) | L | T-2.2 | Loop implemented; integration tested |
| T-2.5 | Design `DirectQuestioningMode` and `StoryDrivenMode` with distinct pipelines | M | — | Design doc; interfaces defined |
| T-2.6 | Implement `DirectQuestioningMode` (8-question sweep; write-in; radar chart) | L | T-2.5 | Mode implemented; E2E tested |
| T-2.7 | Implement `StoryDrivenMode` (narrative continuity; NPC memory; consequence propagation) | L | T-2.5 | Mode implemented; E2E tested |
| T-2.8 | Remove `PASSED`/`FAILED` from all player-visible output | S | T-2.6, T-2.7 | Grep for `PASSED\|FAILED` in renderer code returns zero |
| T-2.9 | Inject `DevelopmentalSynthesis` into `ContextPipeline` (player patterns, write-ins, shadow trajectory, drive-balance trends, current edge) | M | T-2.2 | ContextPipeline receives synthesis; LLM prompt includes patterns |
| T-2.10 | Make `FallbackProvider` content reachable in Direct Questioning path (fix C5/C6) | M | T-2.6 | 96 line-specific content pools reachable; unit tested |
| T-2.11 | Generate drive×polarity×stage-mapped MCQ options (fix C8) | L | T-2.7 | Options probe developmental edges; not "obviously correct/wrong" |
| T-2.12 | Wire `ShadowDetector` to consume `sig.recentEncounters` (depends on T-0.7) | M | T-0.7 | ShadowDetector produces behavioral patterns; unit tested |
| T-2.13 | Implement compound shadow creation in `applyConsequences` (fix A2 fully — was partially resolved) | M | T-0.7 | `compoundPartner` populated for cross-line shadows; unit tested |
| T-2.14 | Implement Lovers Crucible ego-dissolution encounter generation (fix A6) | L | T-0.5, T-1.7 | Crucible fires with 3-phase arc; E2E tested |
| T-2.15 | Wire `accumulateTension`/`tryTriggerMacroEvent` end-to-end (fix A7 fully — was partially resolved) | M | — | Macro-events trigger; unit tested |
| T-2.16 | Implement narrative system: `NarrativeBeat`/`FactionState` mutation; `computeNarrativeCoherence()` dynamic (fix A8) | L | — | Narrative beats complete; coherence computed dynamically |
| T-2.17 | Implement perceptual layer shift at transformation (palette, NPC visibility, audio, encounter eligibility, physics) (fix A11) | L | T-0.5 | Transformation triggers layer shift; E2E tested |

**Phase 2 total effort:** ~3 S + 5 M + 6 L = ~30-40 dev-days

#### Phase 3 — Veil & Feedback Compliance

| ID | Title | Effort | Deps | Acceptance |
|---|---|---|---|---|
| T-3.1 | Replace `ContextPipeline.formatPlayerState` raw labels with qualitative descriptions (HS-11) | M | — | No `layer=Red` or `shadows=DarkAddiction` in LLM system prompt |
| T-3.2 | Audit all player-visible output for Veil violations; automated test | M | T-0.3, T-2.8 | Automated test: zero Veil violations in 100-encounter playtest |
| T-3.3 | Replace "Your response reveals: Healthy balanced" with Veil-compliant qualitative feedback | M | T-2.2 | Feedback is qualitative; never diagnostic |
| T-3.4 | Hide CCI bar, per-line stage bars, shadow ledger, drive labels, per-encounter score, polarity direction from UI (fix V1) | M | — | UI audit: zero raw metrics visible |
| T-3.5 | Replace cryptic CCI dimension labels (`alt:29% drH:100% pol:0% shd:90% trns:0%`) with experiential signals | M | T-3.4 | Labels are qualitative |
| T-3.6 | Add Veil violation logging to telemetry | S | T-0.3 | Violations logged with category + caller |

**Phase 3 total effort:** ~1 S + 5 M = ~8-10 dev-days

#### Phase 4 — Content Depth & Polish

| ID | Title | Effort | Deps | Acceptance |
|---|---|---|---|---|
| T-4.1 | Fill `FallbackProvider` content for Green/Turquoise/White stages (fix P3) | L | — | All 8 stages have meaningful content |
| T-4.2 | Redesign per-probe onboarding content per `ONBOARDING-REDESIGN-PLAN` (fix O2-O9) | L | — | All 8 probes redesigned; anti-gaming principles applied |
| T-4.3 | Renderer polish: animations, transitions, sound, visual feedback, adaptive layouts, per-stage theming (fix P14) | L | — | Renderers polished; per-stage theming |
| T-4.4 | Verify LLM scoring pipeline end-to-end (fix P13 fully) | M | T-0.3 | LLM scoring wired for `llm_dialogue` tasks |
| T-4.5 | Run `npx cap sync android`; produce APK (fix P16) | M | — | APK produced; install tested |
| T-4.6 | Translate `docs/concept-drafts/` content into actual stimulus content (fix P12) | L | — | All 64 modules have stimulus content |

**Phase 4 total effort:** ~1 M + 4 L = ~25-30 dev-days (much can be parallelized)

#### Phase 5 — Hardening & Release

| ID | Title | Effort | Deps | Acceptance |
|---|---|---|---|---|
| T-5.1 | Unit tests for individual assessment modules (fix P15) | L | — | Coverage > 80% |
| T-5.2 | Renderer tests | M | — | Renderer interactions tested |
| T-5.3 | E2E tests | L | T-2.6, T-2.7 | Full session E2E |
| T-5.4 | LLM pipeline tests (mock LLM; verify contracts) | M | T-0.3 | LLM contracts tested |
| T-5.5 | Property-based CCI normalization tests | M | T-1.8 | CCI dimensions in [0,1]; G_z/P_z in [0,1] |
| T-5.6 | Bundle analysis; code splitting; lazy loading of assessment modules (fix P17) | M | — | Bundle < 2MB initial |
| T-5.7 | Expand `scripts/check-invariants.ts` (fix P18) | M | — | All 64 modules registered; every task type has renderer; measures match scoringRubric; driveProbes valid; no orphans; lifecycle exhaustive |
| T-5.8 | Replace `AgenticOrchestrator` direct mutation with `withUpdates(partial)` (fix HS-20) | M | — | No `as mutable` casts; all updates return new Significator |

**Phase 5 total effort:** ~4 M + 3 L = ~20-25 dev-days

### 4.3 Sequencing

```
Phase 0 (1 week) ──┬─→ Phase 1 (2 weeks) ──┬─→ Phase 2 (3-4 weeks) ──┬─→ Phase 3 (1-2 weeks) ──┬─→ Phase 5 (1-2 weeks)
                   │                        │                          │                          │
                   │                        │                          │                          └─→ Phase 4 (ongoing, parallel)
                   │                        │                          │
                   │                        │                          └─ (T-2.x can start once T-1.7/T-1.8 done)
                   │                        │
                   │                        └─ (T-1.x docs can start immediately; code after T-0.x)
                   │
                   └─ (T-0.x all parallelizable)
```

**Total estimated effort:** ~10-12 weeks of dev-time (longer if Phase 4 content work is done in-house rather than parallelized).

---

## 5. Highest-Priority Fixes Applied on This Branch

### 5.1 What was changed

The following surgical fixes from Phase 0 (T-0.x) have been applied on the `audit/holoos-alignment` branch. Each is a minimal, low-risk change designed to unblock playtest data without breaking existing behavior. All 448 existing tests pass with zero regressions; TypeScript compilation is clean.

| Fix | Ticket | File(s) changed | LOC delta | Risk |
|---|---|---|---|---|
| **Fix 1:** Wire `VeilFilter.filterOutput` at LLM I/O boundary | T-0.3 | `src/infra/llm/LLMClient.ts` | +6 / -4 | Low — filter only strips content; never adds. Applied to `evaluateResponse` (feedback field), `queryLLM` (return string), `queryLLMWithTools` (content field, both Anthropic and OpenAI paths). |
| **Fix 2:** Add `triggeredAtSession` field to `TransformationRecord`; populate in `GameLoop`; use in `SignificatorSnapshot` | T-0.1 | `src/core/domain/Significator.ts`, `src/core/domain/SignificatorSnapshot.ts`, `src/core/GameLoop.ts` | +3 / -1 | Low — optional field with backward-compat fallback (`?? 0`). Old saves: post-transformation mode turns OFF (better than current bug which locks it ON). New transformations: correct. |
| **Fix 3:** Update `sig.recentEncounters` in `applyConsequences` (was HS-07) | T-0.7 | `src/core/engines/ConsequenceEngine.ts` | +12 | Low — additive field update. `passed` is proxied by `allDrivesHealthy` (matches existing implicit-integration logic). Unblocks `ShadowDetector.computeBehavioralPatterns()` which expects `EncounterRecord[]`. |

See the individual commit messages on the branch for full diff context.

**Verification:**
- `tsc --noEmit` — passes with zero errors
- `vitest run` — all 448 tests pass (43 test files)
- Existing `tests/infra/VeilFilter.test.ts` (22 tests) still passes — the filter behavior is unchanged; only the wiring is new
- Existing `tests/engines/ConsequenceEngine.test.ts` (7 tests) still passes — the `recentEncounters` append is additive

### 5.2 What was NOT changed (and why)

The following Phase 0 tickets were **not** applied on this branch because they require larger refactors or design decisions that should be made by the Mysterium team:

| Ticket | Why not applied |
|---|---|
| T-0.4 (plumb `moduleTaskTypes` through `getEligibleModalities` — HS-13) | Requires registry plumbing: need to look up module's task types from a `moduleRef` (`${line}:${stage}`), but neither `generateCandidates` nor its caller `scheduleNext` has access to the registry. Requires adding a `getModuleTaskTypes(moduleRef)` method to a registry and threading it through 2-3 function signatures. Too large for a surgical fix; recommend Phase 0 follow-up. |
| T-0.5 (persist transformation state machine counters on Significator) | Requires schema change to `Significator.transformationState` and updates to multiple scenes (`EncounterScene` constructs fresh state every encounter); too large for a surgical fix |
| T-0.6 (add `applyConsequences` to Reflection/Dilemma scenes) | Requires understanding the encounter spec flow for these scenes; needs design review |
| T-0.8 (validate Significator on load) | Requires designing the backward-compat shim strategy; needs team input |
| T-0.9 (fix StageSynthesizer hysteresis) | The fix changes the semantics of Stage synthesis; needs verification that existing playtests don't depend on the current (buggy) behavior |
| T-0.11 (Staircase target decision) | Requires a design decision (61.8% vs 70.7%); not a code-only fix |
| All Phase 1+ tickets | Out of scope for this audit-and-fix iteration |

### 5.3 How to test the fixes

After checking out the `audit/holoos-alignment` branch:

```bash
cd /home/z/my-project/repos/Mysterium
bun install          # or npm install
bun test             # run existing test suite (448 tests; all should pass)
bun run dev          # start dev server; playtest
```

**Specific verification steps:**

1. **Fix 1 (VeilFilter wiring):** Start a session with LLM enabled. In the browser devtools network tab, inspect the LLM response. Verify that strings like "Your polarity crystallization is at 70%" are stripped from the `feedback` field of `LLMEvaluation` and from the `content` field of `LLMToolResponse` before reaching the caller. Note: the LLM **input** side (`filterInput`) is still not wired — that's HS-11 (Phase 3 work).

2. **Fix 2 (triggeredAtSession):** Trigger a transformation (use devtools to force `sig.lifecycle = 'Transforming'` then complete the crucible). Verify that `sig.transformations[last].triggeredAtSession` is populated with the current `sig.totalSessions`. Play 6 more sessions (incrementing `totalSessions`). Verify that session 6+ does NOT select `'post-transformation'` theme (check via `selectSessionTheme` console.log or telemetry).

3. **Fix 3 (sig.recentEncounters):** Play 5 encounters. In devtools, inspect `sig.recentEncounters`. Verify that it has 5 entries (each with `line`, `passed`, `driveChoice?`, `timestamp`). Verify that `ShadowDetector.computeBehavioralPatterns(sig.recentEncounters)` now returns non-empty patterns after 2+ encounters on the same line.

### 5.4 Note on Fix 3's `passed` proxy

Fix 3 uses `allDrivesHealthy` as the proxy for `passed` in the appended `EncounterRecord`. This matches the existing "implicit integration" logic at `ConsequenceEngine.ts:138-153` (where `allDrivesHealthy` triggers shadow resolution). However, this is a proxy, not the ground-truth pass/fail signal. The ground-truth signal lives in the `AssessmentResult` produced by the renderer, which is not currently passed through to `applyConsequences`. A Phase 2 follow-up (T-2.12) should thread the ground-truth `passed` value through to `applyConsequences` so `ShadowDetector` sees accurate failure data.

---

## 6. Appendix

### A. Glossary mapping HoloOS ↔ Mysterium

| HoloOS term | Mysterium term | Notes |
|---|---|---|
| Holon | Holon | Same term, same concept |
| Significator | Significator | Mysterium = player-only; HoloOS = every holon |
| Matrix | (implicit: EncounterScheduler.recentEncounters + WorldState.cooldowns + MacroCatalystEngine.tension) | Mysterium needs to name this |
| Potentiator | (implicit: CandidateGeneration filters) | Mysterium needs to name this |
| Catalyst | Encounter / Catalyst | Aligned |
| Experience | applyConsequences | Aligned |
| Transformation | Lovers Crucible | Aligned in concept; missing Choice-driven ratchet |
| Great Way | (MISSING) | Mysterium has no teleological attractor |
| Choice | Polarity (STO/STS) | Partial — Choice is the ratchet action, Polarity is the direction |
| Lesser Cycle | Encounter pipeline | Right half only (Catalyst→Experience) |
| Greater Cycle | (MISSING as first-class engine) | Lovers Crucible + Polarity are pieces, not a cycle |
| G_z | (partial: Drive Health + Shadow Topology) | Mysterium needs to formalize as co-equal health metric |
| P_z | (partial: Polarity Vector) | Mysterium needs to formalize as co-equal health metric |
| Tetra-Axes ⟨V,C,R,N⟩ | AQAL 7-tuple | Divergent — see §2.5.4 |
| Type (valence signature) | PolarityTexture | Divergent — see §2.5.5 |
| Stage | Stage | Aligned (Mysterium = 8 stages within one octave; HoloOS = 8 densities) |
| Density | (closest: Stage) | Scale-mismatched — see §2.5.4 |
| Octave | (Mysterium Octave = 3 macro-arcs within one density) | Conflated — same word, different scope |
| Realm | State | Mysterium extends (adds Witness, Non-Dual) |
| Mind/Body/Spirit Complex | (MISSING) | Mysterium has no Complex differentiation — see §2.5.8 |
| Line | (Mysterium-specific) | No HoloOS analog; retained as extension |
| Quadrant | (Mysterium-specific, from AQAL) | Maps to Collectivity × Realm.interior |
| Drive | Drive | Aligned (same 4 drives) |
| Shadow | ShadowSignal / ShadowQuadrant | Aligned (4 quadrants match) |
| Attractor Field | AttractorField | Aligned |
| 22 Named Archetypes | (none formal) | `narrativeRole` strings are ad-hoc |
| Veil of Forgetting | Veil of Forgetting | Aligned in concept; defective in enforcement (HS-05) |
| Involution | (out of scope) | Mysterium is single-octave |
| Evolution | 8 Stages + Lovers Crucible | Aligned in count, divergent in mechanism |
| Type Validation Protocol | (MISSING) | Mysterium has no T1/T2/T3 |
| Method of Holonic Inquiry | docs/03-research-methodology.md | Partial — no status ladder |
| Status ladder | (MISSING) | Mysterium needs to adopt |
| Scalar Metric S(Ω,δ,λ) | CCI (5-dim composite) | Divergent |
| Logos Hierarchy | (out of scope) | Cosmological scaffolding |

### B. Status ladder adoption recommendation

Adopt HoloOS's 4-status ladder verbatim:

| Status | Meaning | When to use |
|---|---|---|
| `ai-draft` | Proposed, not yet validated | Initial proposals; brainstorming outputs |
| `canonical-hypothesis` | Derived from canonical anchor, not yet empirically validated | Theoretical claims grounded in canonical anchor but not yet tested |
| `canonical` | Validated | Empirically validated (for game-mechanics) or cross-scale homological (for metaphysics) |
| `superseded` | Replaced by a later claim; retained for provenance | Old claims that have been replaced |

**Recommended initial tagging for Mysterium `docs/foundations/`:**

| Doc | Recommended initial status |
|---|---|
| 00-integral-theory | canonical-hypothesis (Wilber synthesis) |
| 01-aqal-quadrants | canonical-hypothesis (Mysterium extension of HoloOS) |
| 02-eight-stages-overview | canonical-hypothesis (Wilber + Ra) |
| 03-lines-of-intelligence-overview | canonical-hypothesis (Mysterium extension) |
| 04-states-of-consciousness | canonical-hypothesis (Wilber) |
| 05-drives-and-polarities | canonical-hypothesis (Bakan + Wilber + Aurobindo) |
| 06-law-of-one-correspondence | canonical-hypothesis (Ra material — metaphysical, unfalsifiable) |
| 07-neuroscience-of-development | canonical (empirical, peer-reviewed) |
| 08-psychophysics-and-staircase | canonical (empirical) — but see HS-19 (math bug) |
| 09-flow-and-engagement-theory | canonical (empirical, Csikszentmihalyi) |
| 10-shadow-and-pathology | canonical-hypothesis (Wilber + Jung) |
| 11-game-modalities | canonical (Mysterium design decision) |
| 12-drive-assessment-mechanics | canonical-hypothesis (Mysterium-specific operationalization) |
| 13-architecture-of-consciousness | canonical-hypothesis (Wilber) |
| 14-game-as-developmental-catalyst | canonical-hypothesis (Mysterium-specific) |
| 15-macro-scale-archetypal-mind | canonical-hypothesis (Wilber) |
| 16-significator-architecture | canonical-hypothesis (Mysterium-specific; needs NPC scope expansion) |
| 17-transformation-mechanics | canonical-hypothesis (Mysterium-specific; needs Great Way) |
| 18-great-way-world-architecture | canonical-hypothesis (Mysterium-specific; PESTLE) |
| 19-choice-and-polarity-engine | canonical-hypothesis (Mysterium-specific; STO/STS) |
| 20-veil-of-forgetting | canonical (Mysterium design decision) |
| 21-incarnation-architecture | canonical-hypothesis (Mysterium-specific; perceptual layers) |
| 22-holon-context-engine | canonical-hypothesis (Mysterium-specific; LLM pipeline) |
| 23-polarity-ontology | canonical-hypothesis (Mysterium-specific; needs Type⊥Stage) |
| 24-encounter-scheduler | canonical (Mysterium design decision) |
| 25-cumulative-consciousness-index | canonical-hypothesis (Mysterium-specific; needs G_z/P_z) |
| 26-unified-core-architecture | canonical (Mysterium design decision) |
| 27-auto-mode-strategy-engine | canonical-hypothesis (Mysterium-specific) |

### C. Open research questions

These are questions the audit raised but did not resolve. They need Mysterium team input.

1. **Is the Staircase target 61.8% or 70.7%?** (HS-19) — design decision
2. **Should NPC Significators be persisted in `WorldState` or in a separate `NpcSignificatorStore`?** (§2.5.1) — architecture decision
3. **Should `GreaterCycleEngine` be a separate engine or folded into `CCIEngine`?** (T-1.7) — architecture decision
4. **Should `Complex` be a new enum or derived from `Line`?** (§2.5.8) — modeling decision
5. **Is the Veil a hard filter (strip violations) or a soft filter (log violations, pass through)?** (HS-05) — design decision
6. **Should `FallbackProvider` content be reachable in Direct Questioning mode even when LLM is up?** (C6) — design decision
7. **Should the Harvest endgame be one-shot or repeatable across octaves?** (§2.5.9) — scope decision
8. **Should Mysterium adopt HoloOS's `Holonic ID Taxonomy` (19 scale levels) or keep its 8 HolonKinds?** — scope decision
9. **Should the 22 Named Archetypes be formalized in Mysterium, or is the ad-hoc `narrativeRole` layer sufficient?** (§2.5.12) — content decision
10. **Should Type⊥Stage be a Phase-1 or Phase-2 deliverable?** (§2.5.5) — sequencing decision

---

**End of audit report.**
