# Mysterium Gold-Standard Plan: Fixing All 31 Remaining Implementation Gaps

> **Objective:** Make Mysterium the gold-standard for "accelerating holonic healing and evolution" — every engine wired, every flow functional, every ontological concept operationalized, zero stale-state bugs, zero dead code, full altitude-scaling across all modalities and stages.

---

## Current Baseline
- 601 tests passing, 34 invariants passing, tsc clean
- Altitude-scaling works for LanguageReflective + ScenarioChoice + Deterministic (Red/Amber/Orange)
- UserMatrixModel wired into GameLoop
- Transformation state persists across sessions
- GreaterCycleEngine exists but CCIEngine uses a less-accurate inline duplicate
- CLI Direct Questioning bypasses GameLoop entirely
- CLI/Phaser Story-Driven passes null-response to tickWithStrategy (stale-state in 5 subsystems)

---

## Wave 1 — Critical Runtime Correctness (7 gaps, ~2 days)

**Goal:** Fix every stale-state bug so all 4 play-mode paths (CLI Direct, CLI Story, Phaser World, Phaser Encounter) correctly advance the full engine pipeline.

| # | Gap | Fix | LOC | Files |
|---|---|---|---|---|
| 1.1 | GAP-V3-15: CLI Story-Driven passes null,null to tickWithStrategy → UserMatrixModel not updated, recentOutcomes always 'avoided', transformation on stale sig | Decouple "apply consequences" from "advance state" in tickWithStrategy. Add a `applyResponseOnly(response, previousEncounter)` function that the CLI calls BEFORE tickWithStrategy, then tickWithStrategy focuses on scheduling+state-advance only. | ~60 | GameLoop.ts, cli-game.ts |
| 1.2 | GAP-V3-22: Phaser WorldScene same null-response bug | Same fix as 1.1 — WorldScene passes the previous encounter's response to the new `applyResponseOnly` before calling tickWithStrategy. | ~30 | WorldScene.ts |
| 1.3 | GAP-V3-14: CLI Direct Questioning bypasses GameLoop entirely | Route Direct Questioning encounters through tickWithStrategy (using the same decoupled pattern from 1.1). The synthetic encounter construction stays, but each encounter flows through the scheduler → consequence → UserMatrixModel update → transformation-advance pipeline. | ~80 | cli-game.ts |
| 1.4 | GAP-V3-34: CCIEngine uses less-accurate inline G_z/P_z instead of GreaterCycleEngine | Replace the inline G_z/P_z block in CCIEngine.computeCCI with a call to GreaterCycleEngine.computeMetabolicHealth. The CCI snapshot has enough data (drives, shadows, polarity, theta) to build a Significator-like object for the call. | ~20 | CCIEngine.ts |
| 1.5 | GAP-V3-16: rayProfile not consumed by PriorityComputation or CCIEngine | Add rayProfile term to PriorityComputation (5% weight: boost cells whose ray-center is activating) and to CCIEngine polarity dimension (blend with existing polarity score). | ~40 | PriorityComputation.ts, CCIEngine.ts |
| 1.6 | GAP-V3-36: REFRAME_LAYERS missing Green/Turquoise/White entries | Add 3 new stage entries to REFRAME_LAYERS (Green, Turquoise, White) with low/mid/high/peak band reframes. Total: 12 new reframe strings. | ~60 | FallbackProvider.ts |
| 1.7 | GAP-V3-38: No test verifies cross-altitude end-to-end through ContextPipeline → LLM system prompt | New test that builds a ContextPipelineInput with a Turquoise-player × Red-holon scenario and asserts the system prompt contains complexityRegister + crossAltitudeDirective. | ~40 | new test file |

**Wave 1 exit criteria:**
- All 4 play-mode paths correctly update UserMatrixModel, recentOutcomes, transformation state
- CCIEngine uses GreaterCycleEngine.computeMetabolicHealth (not inline duplicate)
- Altitude-scaling covers all 8 stages (Red through White)
- Cross-altitude ContextPipeline integration tested
- ~620 tests passing

---

## Wave 2 — Ontological Architecture (6 gaps, ~3 days)

**Goal:** Ingest the new HoloOS 08.8.25/26 concepts — endosymbiosis, 4-dimensional archetypal-class typology, Greater-Cycle role flows.

| # | Gap | Fix | LOC | Files |
|---|---|---|---|---|
| 2.1 | GAP-V3-5: UserMatrixModel is 2D (Line×Stage), not 4D per 08.8.26 | Extend CellMatrixState with a `dimension: Dimension` axis (Mental/Biological/Social/Collective). Each cell becomes 4 sub-cells. The inference function (`inferFromResponse`) gains dimension-detection logic (cognitive keywords → Mental, somatic keywords → Biological, relational keywords → Social, transpersonal keywords → Collective). | ~200 | UserMatrixModel.ts, new Dimension type |
| 2.2 | GAP-V3-7: 32 archetypal-class matrix not represented | New `ArchetypalClass.ts` type file with the 8×4=32 class table (Matrix-in-Mental = cognitive-schema, Matrix-in-Biological = structural-configuration, etc.). Used as a lookup table by the inference function and the scheduler. | ~120 | new domain/ArchetypalClass.ts |
| 2.3 | GAP-V3-8: AQAL quadrants vs 4-dimensions mapping not documented | Add a mapping table to docs/foundations/01-aqal-quadrants.md: UL≈Mental, UR≈Biological, LL≈Social, LR≈Collective. Document the correspondence and the differences. | ~50 | docs/foundations/01 |
| 2.4 | GAP-V3-1: Endosymbiosis not modeled | Add `internalizedHolons: readonly Holon[]` field to Significator. Add an endosymbiosis event type to ConsequenceEngine (triggered when an NPC holon's relationship strength reaches >0.9 and the player passes a threshold encounter — the NPC becomes a sub-holon, contributing its drive-state to the player's). | ~150 | Significator.ts, ConsequenceEngine.ts |
| 2.5 | GAP-V3-6: GreaterCycleEngine doesn't model S·T·G·Ch as class-typed flows | Extend GreaterCycleEngine with `computeGreaterCycleFlow(sig)` that tracks: Significator (accumulated identity-pattern from transformations), Great Way (accumulated Potentiator = the world-state's developmental trajectory), Transformation (the contact-boundary event), Choice (the directional commitment from the last transformation). Expose as a `GreaterCycleFlow` interface. | ~100 | GreaterCycleEngine.ts |
| 2.6 | GAP-V3-10: Encounters don't carry a catalyst-class field | Add `catalystClass?: CatalystClass` to the Encounter interface (cognitive-perturbation / physical-perturbation / relational-perturbation / field-perturbation). Populate in encounter data files. Optional scheduler filter. | ~80 | Encounter.ts, encounter data files |

**Wave 2 exit criteria:**
- UserMatrixModel tracks 4 dimensions per cell (256 sub-cells instead of 64)
- 32 archetypal-class matrix defined and consumed by inference function
- Endosymbiosis event type exists and can be triggered
- Greater-Cycle role flows (S·T·G·Ch) tracked
- AQAL ↔ 4-dimensions mapping documented
- ~660 tests passing

---

## Wave 3 — Coverage & Wiring Backfill (8 gaps, ~2 days)

**Goal:** Wire every exported-but-uncalled function, close every dead-code path, ensure every engine is tested.

| # | Gap | Fix | LOC | Files |
|---|---|---|---|---|
| 3.1 | GAP-V3-12: No --dev flag for status/diagnostic | Add `--dev` CLI flag. When active, `mysterium status` shows G_z/P_z, rayProfile, 6-phase position, UserMatrixModel phase, liminality signature. `mysterium diagnostic` shows the same + CCI dimensions + metabolic health breakdown. | ~80 | cli-game.ts |
| 3.2 | GAP-V3-20: MacroCatalystEngine has 5 dead exports (lifecycle dead) | Wire `advanceMacroEvent` + `recordMacroChoice` + `resolveMacroEvent` into GameLoop.endSession and AgenticOrchestrator's choice-handler. Macro-events now progress through onset → active → resolution. | ~80 | GameLoop.ts, AgenticOrchestrator.ts |
| 3.3 | GAP-V3-26: WorldScene doesn't emit transformation_triggered on phase change | Add `eventBus.emit('transformation_triggered', ...)` when phase changes in WorldScene. | ~3 | WorldScene.ts |
| 3.4 | GAP-V3-27: GameLoop.endSession uses approximate sessionStartMs | Track `sessionStartMs` explicitly in SessionState (set at startSession, used at endSession). | ~10 | GameLoop.ts |
| 3.5 | GAP-V3-24: summarizeUserMatrix never called from runtime | Wire into TelemetryCollector — call `summarizeUserMatrix(sessionState.userMatrixModel)` at session end, emit as telemetry event. | ~10 | TelemetryCollector.ts |
| 3.6 | GAP-V3-33: mysterium status/diagnostic don't expose holistic primitives | Covered by 3.1 (--dev flag). | — | — |
| 3.7 | GAP-V3-9: Tests for ShadowContentGenerator, MacroCatalystEngine, scheduleThresholdMode | New test files for each engine. Target: every engine has ≥5 tests. | ~200 | 3 new test files |
| 3.8 | GAP-V3-37: ConceptDraftIndex is a placeholder | Document FallbackProvider as the sole content source in a code comment. Leave ConceptDraftIndex as a structural index (line×stage→title lookup) — don't delete, just document the separation. | ~10 | ConceptDraftIndex.ts |

**Wave 3 exit criteria:**
- `--dev` flag exposes all holistic primitives
- Macro-event lifecycle is fully wired
- Every engine has tests
- Telemetry includes UserMatrixModel summary
- ~720 tests passing

---

## Wave 4 — Documentation Alignment (6 gaps, ~1 day)

**Goal:** Every ontological doc references the correct HoloOS source, every code-level concept is documented, stale descriptions are corrected.

| # | Gap | Fix | LOC | Files |
|---|---|---|---|---|
| 4.1 | GAP-V3-4: docs/foundations/ has no reference to 08.8.25 (endosymbiosis, biological grounding) | Add "Holonic-Dynamics Grounding" section to foundations/13-architecture-of-consciousness.md referencing 08.8.25's biological hierarchy (atoms→molecules→cells→tissues→organs→organisms→civilizations). | ~100 | docs/foundations/13 |
| 4.2 | GAP-V3-9: docs/foundations/ has no reference to 08.8.26 (archetypal-class typology) | Add "Archetypal-Class Typology" section to foundations/15-macro-scale-archetypal-mind.md referencing 08.8.26's 8×4=32 class matrix and 4 dimensions. | ~100 | docs/foundations/15 |
| 4.3 | GAP-V3-11: No tracking of which OPEN_JOINTS resolutions are reflected in Mysterium | Create `docs/foundations/28-holoos-open-joints-mapping.md` — a table mapping each resolved HoloOS open joint to its Mysterium implementation status. | ~100 | new doc |
| 4.4 | GAP-V3-2: Substrate-transformation dynamic not documented | Add substrate-transformation note to foundations/17-transformation-mechanics.md (the stage transition IS a substrate transformation — D3 substrate transforms from Red-configured to Amber-configured). | ~30 | docs/foundations/17 |
| 4.5 | GAP-V3-3: Parallel co-evolution not documented | Add parallel co-evolution note to foundations/03-lines-of-intelligence-overview.md (Body/Mind/Spirit complexes co-evolve with feedback loops, not strictly sequential). | ~30 | docs/foundations/03 |
| 4.6 | GAP-V3-30+31+32: substrate_layer_law, involution_ground, indigoRayAccessibility fields | Add these as documented-but-optional fields in foundations/16. The code can add them later as static/derived fields. | ~50 | docs/foundations/16 |

**Wave 4 exit criteria:**
- Every HoloOS 08.8.x concept is referenced in Mysterium docs
- OPEN_JOINTS mapping exists
- No stale doc descriptions remain
- All 28 foundations docs have status tags

---

## Wave 5 — Dead Code Cleanup (5 gaps, ~0.5 days)

**Goal:** Delete every dead file, dead export, and dead function. Zero unused code.

| # | Gap | Fix | LOC | Files |
|---|---|---|---|---|
| 5.1 | GAP-V3-19: PlayerProfile.ts is dead code, still exported | Delete file, remove barrel export, update docs that reference it. | ~5 | PlayerProfile.ts, index.ts, docs |
| 5.2 | GAP-V3-18: OnboardingCalibrator.calibrate is dead at runtime | Wire `calibrate()` into CLI's `runQuickCalibration` (replace the inline implementation), OR delete the function and update tests. Prefer wiring. | ~20 | OnboardingCalibrator.ts, cli-game.ts |
| 5.3 | GAP-V3-13: No MCP server | Out of scope for gold-standard game UX. Document as future work. | ~5 | README.md |
| 5.4 | GAP-V3-30+31: substrate_layer_law + involution_ground as static fields | Add as constant fields on Significator (always the same for a D3 player: D1→Free-Will, D2→Love, D3→Light; 3 prior octaves). Self-documenting, no behavioral impact. | ~15 | Significator.ts |
| 5.5 | GAP-V3-32: indigoRayAccessibility derived field | Add as a derived getter: `(rayProfile.Green + rayProfile.Blue + rayProfile.Indigo) / 3`. Computed on demand, not stored. | ~10 | Significator.ts or GreaterCycleEngine.ts |

**Wave 5 exit criteria:**
- Zero dead files
- Zero dead exports (verified by grep)
- Zero `as any` casts (verified by grep)
- Every exported function is called from at least one runtime path or test
- ~730 tests passing

---

## Execution Order & Dependencies

```
Wave 1 (Critical Runtime) ──┬── 1.1 (decouple tickWithStrategy)
                             ├── 1.2 (WorldScene fix — depends on 1.1)
                             ├── 1.3 (Direct Questioning — depends on 1.1)
                             ├── 1.4 (CCIEngine → GreaterCycleEngine)
                             ├── 1.5 (rayProfile in priority+CCI)
                             ├── 1.6 (REFRAME_LAYERS for Green/Turquoise/White)
                             └── 1.7 (ContextPipeline test)
                                     │
Wave 2 (Ontological) ───────┬── 2.1 (4D UserMatrixModel)
                             ├── 2.2 (32 archetypal-class matrix — depends on 2.1)
                             ├── 2.3 (AQAL ↔ 4D mapping doc)
                             ├── 2.4 (Endosymbiosis)
                             ├── 2.5 (Greater-Cycle role flows)
                             └── 2.6 (catalystClass field)
                                     │
Wave 3 (Coverage) ──────────┬── 3.1 (--dev flag)
                             ├── 3.2 (MacroCatalyst lifecycle)
                             ├── 3.3-3.5 (small wirings)
                             └── 3.7 (engine tests — depends on Wave 1+2)
                                     │
Wave 4 (Documentation) ─────── 4.1-4.6 (all independent, can parallelize)
                                     │
Wave 5 (Cleanup) ───────────── 5.1-5.5 (all independent)
```

**Total estimated effort:** ~8.5 days (2 + 3 + 2 + 1 + 0.5)
**Total new LOC:** ~1,500 (code) + ~500 (docs) + ~300 (tests)
**Target test count:** ~730 (601 + ~130 new tests)

---

## Gold-Standard Definition

When all 5 waves are complete, Mysterium will be "gold-standard" for holonic healing and evolution:

1. **Every play-mode path** (CLI Direct, CLI Story, Phaser World, Phaser Encounter) correctly advances the full engine pipeline — UserMatrixModel updated, transformation state persisted, consequences applied, CCI refreshed.

2. **Every encounter scales in cognitive complexity** based on the player's CURRENT altitude — a Turquoise player encountering Red-stage material gets meta-cognitive reframing, not naive questions. All 8 stages have reframe layers. All 4 modalities (LanguageReflective, ScenarioChoice, Deterministic, Embodied) get reframed.

3. **The user's Matrix/Potentiator is explicitly modeled** in 4 dimensions (Mental, Biological, Social, Collective) per HoloOS 08.8.26 — the game knows WHAT KIND of unprocessed material the user carries, not just how much.

4. **The transformation pipeline is fully wired** — threshold detection → 6-phase state machine → threshold-mode scheduling → knot resolution → commit → UserMatrixModel reset → perceptual layer shift. No dead code, no stale state.

5. **The Greater Cycle (S·T·G·Ch) is tracked** — Significator accumulation, Great Way trajectory, Transformation contact-boundary, Choice directional commitment.

6. **Endosymbiosis is possible** — high-relationship NPCs can be internalized as sub-holons, contributing their drive-state to the player's developmental profile.

7. **Zero dead code** — every exported function is called from a runtime path or test. Zero `as any` casts. Zero stale docs.

8. **Developer mode** (`--dev`) exposes all holistic primitives (G_z/P_z, rayProfile, 6-phase position, UserMatrixModel phase, liminality signature, metabolic health breakdown) for debugging and playtesting.

9. **Every ontological concept** from HoloOS 02_Ontology (through 08.8.26) has a Mysterium implementation or documented mapping. The OPEN_JOINTS register is tracked.

10. **~730 tests** cover every engine, every flow, every altitude-scaling scenario, and every transformation phase.

---

**End of plan.**
