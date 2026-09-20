# Mysterium Post-Action-Layer System-Level Audit — Round 3

> **Date:** 2026-07-05
> **Scope:** Re-audit after 38 fixes (8 P0 + 12 P1 + 7 HoloOS-deviation + 6 P2 + 5 action-layer)
> **Method:** Two parallel deep-audit agents re-examined (1) remaining ontological gaps and (2) the 18-tool agent surface, cross-referencing against all 28 foundations docs + HoloOS 00.md.
> **Verdict:** The measurement layer is HoloOS-aligned and the agent's read-surface is deep. But the 5 action-layer fixes shipped **functions that nobody calls**. The action layer is a graveyard of well-named, well-tested, completely-unwired functions.

---

## 0. Executive Summary

**Key finding: The action-layer fixes are dead code.**

Of the 5 action-layer systems:
- **ACTION-2** (`diagnoseShadows`) is the only one wired into the agent tool surface
- **ACTION-1** (`shouldSurfaceReturn`), **ACTION-3** (`detectKnotPairs`) have **zero production callers** — pure dead code
- **ACTION-4** (consciousness states) is surfaced to the agent but **no engine reads `sig.states`** — the fields are never updated
- **ACTION-5** (32 archetype names) is wired into `generateShadowContent`, but that function is **only called from the legacy AgenticOrchestrator path**, not the canonical PersistentAgent path

The 18-tool surface is **unchanged in size** — still exactly 8 Mysterium + 10 TDG = 18 tools. Zero new tools were added across all 38 fixes. The system prompt was not updated to mention any action-layer capability.

**Numbers:**
- 9 gaps ✅ actually fixed (verified in code)
- 14 gaps ⚠️ partial (scaffolding only / wrong wiring / half-done)
- 13 gaps ❌ still missing (no code change)
- 4 **new gaps** introduced by the fixes
- 11 gaps that block "healing and evolution" (3 critical + 8 high)

---

## 1. The Dead-Code Pattern (CRITICAL — Systemic Engineering Anti-Pattern)

The project is accumulating "scaffold-only" code at an accelerating rate:

| Function | File | Production Callers | Status |
|---|---|---|---|
| `shouldSurfaceReturn` | ShadowDetector.ts | **ZERO** | ❌ Dead code |
| `isShadowResolved` | ShadowDetector.ts | **ZERO** | ❌ Dead code |
| `detectKnotPairs` | EncounterScheduler.ts | **ZERO** | ❌ Dead code |
| `diagnoseShadows` | ShadowDetector.ts | `mysterium_get_player_state` | ✅ Wired |
| `computeContactBoundaryPermeability` | GreaterCycleEngine.ts | **ZERO** | ❌ Dead code |
| `computeGreatWayAlignment` | GreaterCycleEngine.ts | `computeMetabolicHealth` only (always falls back — world never passed) | ⚠️ Half-wired |
| `getShadowArchetypeName` | ShadowContentGenerator.ts | `generateShadowContent` only (legacy path) | ⚠️ Legacy-only |
| `generateShadowContent` | ShadowContentGenerator.ts | `AgenticOrchestrator.ts:333` ONLY (not PersistentAgent) | ❌ Not on canonical path |
| `consciousnessStates` (sig.states) | surfaced in tool | **ZERO engine consumers** | ❌ Inert |
| `contactBoundaryPermeability` (sig field) | Significator.ts | Never updated by any engine | ❌ Static 0.5 |

**Verdict:** Future fixes must be measured by "does it fire in production?" not "does the function exist + is it unit-tested?"

---

## 2. Critical Remaining Gaps (4) — Block "Healing and Evolution"

### GAP-B1. AQAL 4-Quadrant Coherence Enforcement — ❌ STILL MISSING
Transformation can fire on cognitive-only evidence. No `quadrantsTested` field on Encounter. No AQAL gate in TransformationDetector. Zero progress across all 38 fixes.

### GAP-B2. Atman Project / Jonah Complex — ❌ STILL MISSING
Zero matches for "Atman" or "Jonah" in the codebase. Mysterium cannot distinguish genuine developmental arrest from genuine integration. Zero progress.

### GAP-B3. 17 Missing Agent Tools — ❌ NONE ADDED
The 8-tool Mysterium surface is unchanged since before Round 1. Still missing: `mysterium_commit_transformation`, `mysterium_holonic_return`, `mysterium_query_npc`/`mysterium_cultivate_npc`, `mysterium_query_narrative_beats`/`mysterium_author_beat`, `mysterium_get_pestle`/`mysterium_nudge_pestle`, `mysterium_query_user_matrix_cell`, `mysterium_assess_contact_boundary`, `mysterium_assess_atman_project`, `mysterium_query_vows`, `tdg_load_mind_state`, `tdg_list_nodes`.

### GAP-A6. Samsara Loop — ⚠️ PARTIAL (wrong inputs + no loop mode)
`checkHarvest` is wired into `endSession` at White stage, BUT:
- **Wrong input**: passes `polarity.lineProfiles[line].coherence` as "direction strength" — coherence ≠ direction strength
- **No loop mode**: when `harvestable === false`, nothing changes. No intensified catalysts, no Samsara mode.

---

## 3. High-Severity Remaining Gaps (8)

### GAP-A1. Holonic Return — ⚠️ FUNCTION EXISTS, ZERO CALLERS
`shouldSurfaceReturn` is defined + unit-tested but never called from `scheduleNext` or `tickWithStrategy`. Players can still advance to Turquoise while Red-stage shadows fester.

### GAP-A2. Knot-Untying — ⚠️ FUNCTION EXISTS, ZERO CALLERS
`detectKnotPairs` is defined + unit-tested but never called from `scheduleThresholdMode`. The Lovers Crucible is still "5 sessions of shadow mode" with no structural relationship between dark and golden shadows.

### GAP-A3. Contact Boundary — ⚠️ PERMEABILITY ONLY, NO DISTORTIONS, NOT WIRED
`computeContactBoundaryPermeability` exists but: (a) the 4 Gestalt distortions are missing, (b) the function is never called, (c) the `contactBoundaryPermeability` field on Significator is never updated (static 0.5 forever).

### GAP-A9. World-State Write-Side — ⚠️ READ-ONLY
`mysterium_get_world_state` is deepened (NPC identities, PESTLE values, beat IDs) but no cultivation/manipulation tools exist. The agent can see the world but cannot act on it.

### GAP-B4. Co-Creation Ripple — ❌ STILL MISSING
No `rippleDistance` or `pestleShift` on ConsequenceRecord. `holonDeltas` always empty. Player choices don't propagate through holon hierarchy.

### GAP-B10. HoloOS Deviation #2: 4-Dimension Redundancy — ❌ STILL NOT FIXED
`Dimension = 'Mental' | 'Biological' | 'Social' | 'Collective'` still used. HoloOS 08.8.44 corrected this to 3 realms (Gross/Subtle/Causal). UserMatrixModel still 256 cells (should be 192).

### GAP-B13. System-Prompt Governance — ❌ 9 OF 10 STILL OPEN
System prompt doesn't mention: Holonic Return, knot-pairs, driveHealthDiagnosis, consciousnessStates, archetype names, G_z·P_z interpretation, liminalitySignature, contact-boundary permeability, harvest.

### NEW-GAP-1. Action-Layer Dead-Code Pattern — ⚠️ SYSTEMIC
The project keeps repeating "implement the function, skip the integration." Round 2 flagged this for `checkHarvest`, `recordKnotResolution`, `buildShadowPromptSuffix`. Round 3 confirms 4 more functions added to the same dead-code pile.

---

## 4. What Was ACTUALLY Fixed (✅ Verified)

| Fix | Verification |
|---|---|
| P0-1: advanceTransformation no longer double-counts | Test confirms |
| P0-2: No phantom 'avoided' outcomes | `tickWithStrategy(null)` returns empty recentOutcomes |
| P0-3: endSessionAsync awaits TDG hook | Async wrapper exists |
| P0-5: Atomic save | `saveAll`/`loadAll`/`deleteAllSaves` with temp-file + rename |
| P0-7: startSession reconstructs transformationState | `reconstructTransformationState(sig)` |
| P0-8: mysterium_select_encounter uses pool + executionMode override | Pool cached, override applied |
| P1-15: CCI delegates G_z/P_z to GCE | `computeMetabolicHealth(sig)` called from CCI |
| P2-High: Dual-shadow window uses AND | Full boost requires both shadows |
| DEV-5: VeilFilter.filterInput wired | LLMClient applies filterInput to system prompt |
| P2-High: Dead telemetry fixed | ConsequenceRecord has feedback + scores fields; bridge enriches |
| P2-High: willResolveShadow fixed | Uses `allDrivesHealthy` (matches ConsequenceEngine) |
| P2-High: Veil leak fixed | Player-state numerics re-veiled as qualitative descriptors |
| P2-Medium: World state deepened | NPC identities, PESTLE values, beat IDs returned |

---

## 5. New Gaps Introduced by Fixes (4)

### NEW-GAP-1: Action-layer functions are dead code (systemic pattern)
### NEW-GAP-2: checkHarvest called with wrong input (coherence ≠ direction strength)
### NEW-GAP-3: Dual-shadow "partial boost" still allows single-shadow entry (spec requires strict AND)
### NEW-GAP-4: contactBoundaryPermeability is a static 0.5 (field never updated by any engine)

---

## 6. The Core Insight (Round 3)

**Round 1:** "Mysterium was built measurement-first, action-last. The agent is a blind presenter."

**Round 2:** "The P0/P1 fixes repaired measurement plumbing and agent I/O. The action ontology is untouched."

**Round 3:** "The 38 fixes (including the 5 'action-layer' fixes) successfully repaired the **measurement layer's alignment with HoloOS** and **deepened the agent's read surface**. But the 5 action-layer fixes shipped **functions that nobody calls**. The agent STILL has exactly 8 tools — the same count as before Round 1. The action layer is now a graveyard of well-named, well-tested, completely-unwired functions."

**The path forward is not "build more functions." It is "wire the functions that exist, then add the 3 critical missing pieces (AQAL gate, Atman/Jonah, agent action tools)."**

---

## 7. Recommended Next-Wave Action Plan

### P3-Critical: Wire the dead functions

1. **Wire `shouldSurfaceReturn` into `scheduleNext`** — inject return encounter every 3 encounters at current stage
2. **Wire `detectKnotPairs` into `scheduleThresholdMode('crucible')`** — generate A→B pairs during crucible
3. **Wire `computeContactBoundaryPermeability` into `ConsequenceEngine`** — modulate Catalyst intensity; UPDATE the field on Significator
4. **Wire `generateShadowContent` into PersistentAgent path** — not just AgenticOrchestrator
5. **Fix `checkHarvest` inputs** — pass direction strength, not coherence
6. **Implement Samsara loop mode** — when `harvestable === false` at White, intensify catalysts

### P3-Critical: Close the 3 unchanged critical gaps

7. **Implement AQAL 4-quadrant gate** in TransformationDetector
8. **Implement Atman Project + Jonah Complex detection** in ShadowDetector
9. **Add `mysterium_commit_transformation` + `mysterium_get_holonic_return` + `mysterium_get_knot_pairs` + `mysterium_get_shadow_content` + `mysterium_get_metabolic_health`** tools

### P3-High: Fix HoloOS deviations + system prompt

10. **Fix Deviation #2** — replace 4 dimensions with 3 realms
11. **Update system prompt** with 9 governance gaps
12. **Wire `diagnoseShadows` into the scheduler** — use drive-health formula as shadow-mode trigger
13. **Pass `world` to `computeMetabolicHealth`** from CCI so Great Way alignment actually computes
14. **Fix residual Veil leak** — re-veil `pestleValues` in world-state tool
15. **Wire feedback/scores into AgenticOrchestrator path** (not just PersistentAgentBridge)

### P3-Medium: Completeness

16. Implement `StatePractice.ts` + scheduler integration
17. Extend shadow matrix to per-(line, stage, drive, domain) — 256 names
18. Fix CCI inline path per-line theta
19. Wire SessionAgent into all 4 flows
20. Implement co-creation ripple
21. Implement golden-shadow horizon
22. Implement warm-up + long-absence theta decay
23. Implement endosymbiosis
24. Extend HolonKind to 8 values + lineStageSignature
25. Fix Flow C to use tickWithStrategy
