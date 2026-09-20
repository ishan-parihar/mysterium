# Mysterium Post-Fix System-Level Audit — Round 2

> **Date:** 2026-07-05
> **Scope:** Re-audit of the agentic-operation-flow architecture AFTER the 20 fixes (8 P0 + 12 P1) from the first audit.
> **Method:** Two parallel deep-audit agents re-examined (1) the ontological gaps remaining after P0/P1 and (2) the current 18-tool agent surface. Both cross-referenced against all 28 foundations docs + HoloOS.
> **Objective:** Find what depth asymmetries, implementation gaps, fragmentations, and bugs REMAIN after the first wave of fixes.

---

## 0. Executive Summary

The P0/P1 fixes successfully repaired **flow correctness** (double-count, phantom outcomes, save atomicity, scheduler pool selection, TDG wiring) and **agent I/O depth** (per-line altitudes, per-shadow detail, psychometric scores, full ScheduledEncounter preservation, TDG governance). They did **no work** on the *ontological action layer* — the manifestation systems that translate foundations theory into player-experienced reality.

**Key numbers:**
- 20 fixes completed (8 P0 + 12 P1)
- **25 remaining gaps** identified in this re-audit
- **3 critical** (AQAL coherence, Atman Project, missing agent tools)
- **7 high** (Holonic Return, 256-shadow matrix, knot-untying, drive-health formula, harvest wiring, states of consciousness, Contact Boundary)
- **15 medium/low** (dual-shadow window, co-creation ripple, theta half-lives, VeilFilter.filterInput, Samsara loop, SessionAgent, world-state shallowness, dead telemetry, golden-shadow horizon, warm-up decay, endosymbiosis, Type⊥Stage, Flow C bypass, behavioral shadows, Veil leak)

**The depth asymmetry pattern is unchanged:** measurement layer is deep, action layer is shallow. The agent can now *see* the player's per-line altitudes and per-shadow detail, but it still cannot *drive* an Atman-Project diagnosis, schedule a Holonic Return, generate a knot-pair, open a Samsara loop, commit a transformation, cultivate an NPC, author a narrative beat, or manipulate PESTLE. It is a "presenter with deeper glasses" rather than a "presenter with shallow glasses" — but it is still blind to the ontological machinery the foundations docs require.

---

## 1. Critical Remaining Gaps (3)

### GAP-1. AQAL 4-Quadrant Coherence Enforcement — ❌ MISSING

**Source:** foundations/01 §4 (quadrantsTested.length === 4 for main encounters), foundations/17 §2.3 (all 4 quadrants must shift at Transformation)

**Status:** Completely missing. No `quadrantsTested` field on `Encounter`. No AQAL gate in `TransformationDetector.computeReadiness()`. No engine enforces "all 4 quadrants shift" at transformation commit.

**Impact:** Mysterium cannot honor the integral-theory commitment that distinguishes it from single-quadrant cognitive trainers. Transformation can fire on cognitive-only evidence — exactly the "integral fallacy" foundations/01 §2 warns against.

**Fix:** Add `quadrantsTested` to Encounter; add AQAL coverage gate in TransformationDetector (require ≥1 crystallized cell in each of UL/UR/LL/LR before threshold); record 4-quadrant shift manifest at commit.

### GAP-2. Atman Project / Jonah Complex — ❌ MISSING

**Source:** foundations/13 §Atman Project (4 defense mechanisms: rationalization, isolation, desacralizing, substitution), foundations/10 §2.6 (detection signals), foundations/13 §Emergent Domain (Jonah Complex = fear of greatness)

**Status:** Zero matches for "Atman" or "Jonah" in the entire codebase. No tool, no engine, no detection heuristic, no LLM prompt suffix. The 4 defenses have no telemetry surface.

**Impact:** Mysterium cannot distinguish genuine developmental arrest from genuine integration. The agent has no way to know if a "healthy" player is actually exhibiting substitute-gratification behavior (chasing scores instead of growth, refusing cooperative modalities, rushing narrative, engaging only psychometric tasks). This is the single biggest theoretical gap in the runtime.

**Fix:** Add defense-signal computation to ShadowDetector (infer 4 Atman defenses from behavior patterns); add Jonah-Complex detector (high golden-allergy + low aspirational expression + avoidance of next-stage encounters); expose via new `mysterium_assess_atman_project` tool; wire into scheduler (increase golden-shadow catalyst frequency when defenses active).

### GAP-3. 17 Missing Agent Tools — ❌ NONE ADDED

**Source:** Prior audit §2.2 enumerated 17 ontology-required tools that don't exist.

**Status:** P0/P1 added zero new tools to the 8-tool Mysterium surface. P1 deepened existing tools (get_player_state, select_encounter, complete_encounter) but did not add:
- `mysterium_commit_transformation` (agent can detect readiness but cannot commit/decline/abort)
- `mysterium_holonic_return` (scan earlier stages, surface return encounter)
- `mysterium_query_npc` / `mysterium_cultivate_npc` (NPC relationship detail + deepening)
- `mysterium_query_narrative_beats` / `mysterium_advance_beat` / `mysterium_author_beat`
- `mysterium_get_pestle` / `mysterium_nudge_pestle` / `mysterium_resolve_macro_event`
- `mysterium_query_user_matrix_cell` (per-cell loads)
- `mysterium_assess_contact_boundary` (Gestalt boundary state)
- `mysterium_assess_atman_project` (substitution/translation defenses)
- `mysterium_query_vows` / `mysterium_author_vow`
- `tdg_load_mind_state` (rollback counterpart to save)
- `tdg_list_nodes` (bootstrap for fetch_context)

**Impact:** The agent's action surface is unchanged in size. It can see deeper but cannot act on the ontological machinery.

---

## 2. High-Severity Remaining Gaps (7)

### GAP-4. Holonic Return Cadence — ❌ MISSING (mislabeled in code)

**Source:** foundations/10 §7.1 (every 3 encounters at current stage → scan earlier stages for severity > 0.3 → surface return encounter at shadow's (line, stage) in SHADOW MODE)

**Status:** The code has a comment "G.9: Holonic Return" at EncounterScheduler.ts:82, but the implementation (`detectShadowWorkThreshold`) triggers when a line has >3 unresolved shadows — this is shadow-mode escalation on the CURRENT line, NOT Holonic Return to EARLIER stages. `shouldSurfaceReturn()` does not exist. No code counts encounters-at-current-stage and triggers an earlier-stage return.

**Impact:** Players can advance to Turquoise while their Red-stage shadows fester untreated. The "holon is never outgrown" principle is unenforced. The "relentless ascent — which is itself a pathology" (foundations/10 §1) is fully realized.

### GAP-5. 256-Shadow Matrix — ❌ MISSING (4 templates only)

**Source:** foundations/10 §2.3 (256 = 8 lines × 8 stages × 4 drives × 2 domains) + §6 (128 named archetypes)

**Status:** ShadowContentGenerator has 4 templates (one per quadrant). Line/stage/drive are template-substituted, not archetypally distinct. `buildShadowPromptSuffix` is dead code (zero callers). A shadow encounter at Cognitive/Red/Eros/Dark looks identical to Spiritual/White/Agape/Golden — only the substituted strings differ.

### GAP-6. Knot-Untying Mechanic — ❌ MISSING (scaffolding only)

**Source:** foundations/17 §5 (dark-anchor + golden-block pairs, A→B scheduling, shadow correlation analysis)

**Status:** `recordKnotResolution()` exists but is never called from production. `totalKnots` is always 1 (because `detectThreshold` only returns when blockers.length === 0). No scheduler logic generates knot-pairs. `ShadowEntry.compoundPartner` field exists but is never populated. No "shadow correlation analysis" (when dark at current + golden at next share the same drive axis → flag as knot).

**Impact:** The Lovers Crucible is just "5 sessions of shadow mode" with no structural relationship between dark and golden shadows. The evolve/heal vector (golden integration dissolves dark knots) cannot fire.

### GAP-7. `diagnoseShadows` Drive-Health Formula — ❌ MISSING

**Source:** foundations/10 §5.3 — `addictionRisk = (1 - eros) × (1 - communion)`, `allergyRisk = (1 - agape) × (1 - agency)`

**Status:** P1-16 wired `detectShadows` into the agent tool, but `detectShadows` is behavioral + structural only — it does NOT compute the drive-health formula. The spec's canonical shadow diagnostic is absent. Shadows are detected by keyword matching + behavioral heuristics, not by the math foundations/10 mandates.

### GAP-8. `checkHarvest` Defined but Never Called — ⚠️ PARTIAL

**Source:** foundations/19 §9 (harvest check at White stage)

**Status:** P1-20 implemented `checkHarvest()` in PolarityEngine, but it has **zero production callers**. The harvest logic exists on paper but cannot fire. This blocks the Samsara loop and the entire endgame Choice pathway.

### GAP-9. 5 States of Consciousness — ❌ MISSING (inert field)

**Source:** foundations/04 (entire document — Gross/Subtle/Causal/Witness/NonDual)

**Status:** `sig.states` is initialized at `createInitialSignificator` but **never read by any engine, scheduler, agent tool, or assessment pipeline**. `StatePractice.ts` (spec'd in §4) does not exist. The contemplative half of human development is absent. Mysterium is currently a "capacity only" game, which foundations/04 §3.4 explicitly calls out as the failure mode of every cognitive-training app.

### GAP-10. Contact Boundary (Gestalt) — ❌ MISSING

**Source:** foundations/13 §Gestalt Dynamics (confluence/isolation/retroflection/projection)

**Status:** Zero matches for "confluence", "retroflection", "contactBoundary" in the codebase. The contact boundary is the *mechanism* by which catalyst becomes experience — without modeling it, the game has no way to distinguish "player processed this catalyst cleanly" from "player ingested pathological catalyst that mirrors their fixation".

---

## 3. Medium-Severity Remaining Gaps (10)

### GAP-11. Dual-Shadow Window Uses OR Not AND — ⚠️ PARTIAL

`PriorityComputation.computeTransformationReadiness()` uses `hasShadowAtCoG || hasShadowAtTarget` (OR). Spec requires AND — both shadows must be active simultaneously. This lets a player enter the Crucible with only one shadow vector, enabling spiritual bypassing.

### GAP-12. Co-Creation Ripple — ⚠️ PARTIAL

`ConsequenceRecord` has `holonDeltas` but NOT `rippleDistance` or `pestleShift`. PESTLE updates happen in AgenticOrchestrator (not in the engine pipeline). No ripple propagation through holon hierarchy (NPC → Faction → PESTLE).

### GAP-13. Per-Line Theta Half-Lives in GCE + CCI — ⚠️ PARTIAL

P1-15 delegated CCI → GCE, but GCE still hardcodes `7 * 24 * 60 * 60 * 1000` (7-day global). The scheduler uses per-line half-lives (Somatic=3d → Spiritual=10d), but the metabolic health metric reports a different freshness number. Two parallel computations persist.

### GAP-14. VeilFilter.filterInput — ❌ STILL DEAD

P0/P1 did not touch it. `filterInput` is defined but has zero callers. The LLM receives unfiltered system prompts that may contain veil-violating terms. The Veil is bidirectional per foundations/20 — filtering only output is half a Veil.

### GAP-15. Samsara Loop — ❌ MISSING

No code checks "is player at White && not harvestable → enter Samsara loop". `checkHarvest` is defined but never called. A White-stage player just stops receiving transformation signals with no Samsara handling. The endgame is silently broken for uncrystallized White-stage players.

### GAP-16. SessionAgent — ⚠️ PARTIAL (Flow C only)

The prior audit called SessionAgent dead code; the truth is "alive but Flow-C-only" (Direct Questioning). Flows A (CLI default), B (CLI --agent), D (Phaser) do NOT instantiate it. `PersistentAgent` uses a static system prompt, not `SessionAgent.buildSynthesis()`. Cross-encounter synthesis is unavailable in 3 of 4 flows.

### GAP-17. `mysterium_get_world_state` Still Shallow — ❌ UNCHANGED

Returns counts only: `holonCount`, `npcCount`, `activeRelationships` (count), `activeMacroEvents` (count), `pestleTensions` (string list), `narrativeBeats` (count). Cannot identify any specific NPC, report per-dimension PESTLE values, report macro-event lifecycle phase, or report narrative beat IDs. The most underdeepened Mysterium tool.

### GAP-18. `mysterium_complete_encounter` Scores + Feedback Are Dead Telemetry — ⚠️ WIRED WRONG

P1-19 added `feedback` and `scores` fields to the tool, but:
- `PlayerResponse` interface has no `scores` field — `processOutcome` ignores them
- `feedback` is stored on `EncounterResult` but never written to `ConsequenceRecord` or `history`
- The 10-dim psychometric depth is accepted by the tool but dropped on the floor

### GAP-19. Veil Leak in `mysterium_get_player_state` — ⚠️ NEW BUG (P1-18 regression)

P1-18 added raw `driveWeights`, `driveFixationRisk`, `rayProfileValues`, `perLineAltitudes` to the tool return. The system prompt's Veil claim ("The player never sees: scores … percentages") is now partially FALSE — these raw numbers are in the agent's message history and could leak into `mysterium_ask_player` narratives.

### GAP-20. `downstreamEffects.willResolveShadow` Heuristic Is Wrong — ⚠️ WIRED WRONG

The tool computes `allDrivesHealthy && executionMode === 'shadow'`, but `ConsequenceEngine.applyConsequences` resolves shadows implicitly whenever `allDrivesHealthy` on the encounter's line, **regardless of executionMode**, for all shadows at-or-below the encounter's stage. The agent's mental model of when shadows resolve is incorrect.

---

## 4. Low-Severity Remaining Gaps (5)

### GAP-21. Golden-Shadow Horizon — ❌ MISSING
No "one-above-next" weight tier in scheduler. No faint next-stage impressions. Players never glimpse the next stage until they're already transforming.

### GAP-22. Warm-Up / Long-Absence Theta Decay — ❌ MISSING
No 10% session-start downstep. No 25% downstep for 14+ day absence. Returning players face full difficulty immediately.

### GAP-23. Endosymbiosis — ❌ MISSING (field only)
`internalizedHolons` declared on Significator, initialized empty, never populated. No `relationshipStrength >= 0.9` check.

### GAP-24. Type⊥Stage Orthogonality — ⚠️ PARTIAL
`HolonKind` has 6 values (spec requires 8). Holons have single `line`/`stage` (spec requires `lineStageSignature: Record<Line, Stage>` — full 8-line profile per holon). NPCs cannot be "Orange in Cognitive, Amber in Moral".

### GAP-25. Flow C Bypasses tickWithStrategy — ❌ NOT DONE
P1-17 only fixed the session-end summary; DQ still synthesizes encounters directly, bypassing the scheduler, auto-mode strategy, and mid-session refresh.

---

## 5. System-Prompt Governance Gaps (10)

The system prompt covers all 10 TDG tools but has these gaps:

1. No player TDG node_id convention (`player:${sig.id}`)
2. No TDG `node_type` vocabulary (encounter, shadow, transformation, polarity_event, npc_interaction, player)
3. No TDG `edge_type` vocabulary (EXPERIRED_BY, CARRIED_BY, INTERACTS_WITH, RESONATES_WITH, DERIVES_FROM)
4. No Holonic Return playbook
5. No Atman Project framework
6. No Vow system mention
7. No `behavioralShadows` (P1-16) mention — agent doesn't know a second shadow channel exists
8. No `shadowResolvedId` flow reinforcement
9. No `downstreamEffects` interpretation guide (and the heuristic is wrong)
10. No `mysterium_get_world_state` shallowness warning — agent will waste turns querying for detail that isn't there

---

## 6. Recommended Next-Wave Action Plan

### P2-Critical (ontological contract)

1. **Implement AQAL 4-quadrant gate** in TransformationDetector (GAP-1)
2. **Implement Atman Project + Jonah Complex detection** in ShadowDetector + expose via `mysterium_assess_atman_project` tool (GAP-2, GAP-3)
3. **Wire `checkHarvest` into runtime** — call from endSession at White; trigger Samsara loop if not harvestable (GAP-8, GAP-15)

### P2-High (action-layer depth)

4. **Implement Holonic Return cadence** — `shouldSurfaceReturn` + every-3-encounters injection (GAP-4)
5. **Implement `diagnoseShadows` drive-health formula** — `(1-eros)×(1-communion)` etc. (GAP-7)
6. **Implement knot-pair generation** in scheduler — `generateKnotPairs(sig)` + populate `compoundPartner` + schedule A→B pairs (GAP-6)
7. **Fix dual-shadow window** — change OR to AND; add `dualShadowWindow` flag (GAP-11)
8. **Wire `filterInput`** into LLMClient + ContextPipeline + PersistentAgent (GAP-14)
9. **Fix per-line theta half-lives in GCE + CCI inline path** (GAP-13)
10. **Implement Contact Boundary state** + distortion detection (GAP-10)
11. **Pass `patterns` to `detectShadows`** in mysterium_get_player_state — agent should see behavioral shadows (GAP-7 partial)
12. **Implement 5 states of consciousness** — at minimum read `sig.states`; create `StatePractice.ts` (GAP-9)

### P2-Medium (completeness + correctness)

13. **Deepen `mysterium_get_world_state`** — NPC identities, per-dimension PESTLE, macro-event lifecycle, narrative beat IDs (GAP-17)
14. **Wire `feedback` + `scores` into ConsequenceRecord** — or remove the dead fields (GAP-18)
15. **Fix `downstreamEffects.willResolveShadow` heuristic** to match ConsequenceEngine (GAP-20)
16. **Fix Veil leak in `mysterium_get_player_state`** — re-veil numerics or update prompt (GAP-19)
17. **Add `mysterium_commit_transformation`** tool (GAP-3)
18. **Add `mysterium_holonic_return`** tool (GAP-3, GAP-4)
19. **Add NPC cultivation tools** (GAP-3)
20. **Add PESTLE manipulation tools** (GAP-3)
21. **Add per-cell UserMatrixModel query** (GAP-3)
22. **Implement 256-shadow matrix** (GAP-5)
23. **Implement rippleDistance + pestleShift** on ConsequenceRecord (GAP-12)
24. **Implement warm-up + long-absence theta decay** (GAP-22)
25. **Implement golden-shadow horizon** weight tier (GAP-21)
26. **Wire SessionAgent into all 4 flows** + PersistentAgent + ContextPipeline (GAP-16)
27. **Fix Flow C to use tickWithStrategy** (GAP-25)
28. **Extend HolonKind to 8 values** + add `lineStageSignature` (GAP-24)
29. **Implement endosymbiosis** — populate `internalizedHolons` (GAP-23)
30. **Add `tdg_load_mind_state`** + `tdg_list_nodes` (GAP-3)
31. **Update system prompt** with 10 governance gaps (§5)
32. **Add `tdg_health` retry wrapper** in TDGToolAdapter
33. **Fix `mysterium_complete_encounter` scores/feedback dead telemetry** — wire into ConsequenceRecord or remove

---

## 7. The Core Insight (Updated)

The prior audit concluded: **Mysterium was built measurement-first, action-last.** The P0/P1 fixes confirmed this — they repaired the measurement *plumbing* (state reconstruction, save atomicity, TDG wiring, CCI→GCE delegation) and the agent *I/O* (deeper player_state, restored psychometric scores, full ScheduledEncounter preservation). They did not touch the action *ontology*.

The agent is no longer a "blind presenter" — it has deep glasses. It can see per-line altitudes, per-shadow detail, per-drive directionality, polarity trajectory, transformation state. But it still cannot *drive* the ontological machinery the foundations docs require:

- It cannot detect Atman Project defenses (substitution, rationalization, isolation, desacralizing)
- It cannot schedule a Holonic Return to an earlier stage
- It cannot generate a knot-untying pair
- It cannot commit or decline a transformation
- It cannot cultivate an NPC relationship
- It cannot author or advance a narrative beat
- It cannot manipulate PESTLE tension
- It cannot query per-cell UserMatrixModel loads
- It cannot assess Contact Boundary distortions
- It cannot open a Samsara loop
- It cannot practice states of consciousness
- It cannot resolve shadows via the drive-health formula

The 28-system architecture remains ~60% implemented. The 40% that's missing is the half that makes Mysterium *developmentally honest* rather than just *developmentally observant*. The next wave must build the action layer — the Atman/Jonah/Contact-Boundary/Holonic-Return/knot-pair/256-shadow/Samsara/states machinery that the foundations docs specify but the runtime doesn't implement.

**The measurement layer is done. The action layer is the remaining 40%.**
