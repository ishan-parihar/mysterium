# World-Builder & Game-Scenario Audit Report

> **Status:** canonical-hypothesis (audit artifact per `docs/03-research-methodology.md` §0.5).
>
> **Date:** 2026-07-04
>
> **Scope:** Exhaustive audit of all world-building components, encounter scenarios, narrative frames, and content pools for efficacy in "accelerating holonic healing and evolution."

---

## 0. Executive Summary

The audit found **40 findings** (25 gaps + 15 overlooked aspects). The codebase is in a "rich data, poor wiring" state — significant authoring investment has been made (36 holons, 28 encounters, 96 content pools, 64-cell polarity grid, 6-dimension PESTLE) but the runtime has not been connected to much of it. Three structural disconnections dominate:

1. **PolarityOntology and RedPESTLE are dead data** — the most ontologically-rich artifacts (64-cell polarity texture grid, 6-dimension PESTLE state) are decorative. The runtime uses parallel, simpler structures.
2. **The Conqueror 4-phase boss is dead** — a rich UL→UR→LL→LR quadrant-arc design exists but only the single-encounter `red-main-tyrant` is used.
3. **The 36 holons are never placed in the world** — `WorldScene` renders an empty volcanic diorama with no Fortress of Iron, no Spirit Grove, no Bone Shaman.

---

## 1. Per-Component Findings

### 1.1 — `red-layer-holons.json` (36 holons)

**What works:** 16 NPCs with names, narrative roles, drive signatures, polarity directions, shadow quadrants. 4 factions with dispositions. 7 locations with stage-locked perceptual layers. 9 encounter holons.

**What's broken:** Holons are imported only by OnboardingScene, AssessmentScene, and ContextPipeline (for LLM-prompt flavor). `WorldScene.ts` doesn't query the holon registry — the player walks an empty world.

**What's missing:**
- No `transformations` field on NPC holons (violates HoloOS 02.1 — every holon has a Significator)
- No `archetypalClass` field (violates HoloOS 08.8.26 — each holon should carry its dimension)
- No endosymbiotic/biological grounding (violates HoloOS 08.8.25 — holons are incorporeal)
- All 7 Locations are martial; no hearth, farm, temple, or domestic space
- No holon has a `drive` field matching its `drives.dominant` — the `drive` field is used by ShadowContentGenerator but not populated on holons

### 1.2 — `encounters/red/*.ts` (28 encounters)

**What works:** 8 lines × multiple encounters per line + 4-phase Conqueror boss. Each encounter has `id`, `lines`, `stage`, `modality`, `narrative` (theme, allyBeat, enemyBeat, holonName), `quadrants`, `taskBinds`.

**What's broken:** The Conqueror 4-phase boss (`CONQUEROR_PHASES`) is imported only by tests. The actual main boss is `red-main-tyrant` (single encounter, no phase progression).

**What's missing:**
- No `drive` field on encounters (30 of 28+4 encounters lack it)
- No `catalystClass` field (violates HoloOS 08.8.26)
- No `holonId` on EncounterSpec — encounters reference holons by name string, not by ID
- No secondary-line `taskBinds` (all encounters are single-line)
- No quadrant-conditional `allyBeat` variations

### 1.3 — `FallbackProvider.ts` (96 content pools)

**What works:** Red/Amber/Orange have line-specific pools for LanguageReflective (16 prompts each) and ScenarioChoice (24 scenarios). Altitude-scaling reframe layers work for all 8 stages. Deterministic reframe now covers the `framing` field.

**What's broken:** Green/Turquoise/White have only 1 generic prompt each (no line-specificity). Strategic, SocialCooperative, and ImmersiveRPG modalities have single-prompt generics (no line-specificity at any stage).

**What's missing:**
- No line-specific content for Green/Turquoise/White (8 lines × 3 stages × 2 modalities = 48 missing pools)
- No line-specific content for Strategic/SocialCooperative/ImmersiveRPG (8 lines × 3 stages × 3 modalities = 72 missing pools)
- No Infrared/Magenta content beyond 1 generic prompt each
- No Embodied content for Amber/Orange/Green/Turquoise/White

### 1.4 — `PolarityOntology.ts` (64-cell polarity texture grid)

**What works:** Rich 64-cell catalogue with per-(line×stage) STO/STS/Exploratory texture names and shadow-risk tags. Structurally aligned with HoloOS 02.1.

**What's broken:** `DEFAULT_POLARITY_ONTOLOGY` is imported by ZERO runtime files. The polarity engine uses `sig.polarity.cells` (runtime data) but never consults the texture catalogue for content selection or narrative framing.

### 1.5 — `RedPESTLE.ts` (6-dimension PESTLE state)

**What works:** 6 dimensions (Political/Economic/Social/Technological/Legal/Environmental) each with a Red-stage `altitude: Stage` and `tension: number`. Structurally aligned with HoloOS 08.8.26's Social dimension.

**What's broken:** `RedPESTLE` is imported by ZERO runtime files. `MacroCatalystEngine` uses a parallel `PESTLETension` interface with numerical values but doesn't reference the Red-stage thematic content.

### 1.6 — `ConsequenceNarrator.ts` (narrative feedback)

**What works:** 7 modality-specific pools of 2-3 atmospheric strings each. Clean, minimal, Veil-compliant.

**What's broken:** Only 2-3 strings per modality — high repetition rate. No line-specificity, no stage-specificity, no altitude-scaling.

### 1.7 — `WorldScene.ts` (overworld renderer)

**What works:** Volcanic badlands rendering, encounter node placement, companion NPC, player movement, ecological tracker, perceptual layer shift on transformation.

**What's broken:** `WorldScene.ts:162` STILL passes `null, null` to `tickWithStrategy` — the Phaser path is NOT fixed for UserMatrixModel updates. The `applyResponseOnly` function exists but is only called from the CLI, not from WorldScene.

**What's missing:** No holon placement (the 36 holons from `red-layer-holons.json` are invisible). No spatial navigation to encounter locations. No NPC interaction outside encounters.

### 1.8 — Stage/Ray/Drive registries

**What works:** All 8 stages registered with palette/audioMode/physicsGravity. All 7 rays registered with paletteAnchor. All 4 drives registered with descriptions.

**What's missing:** No `complexityRegister` on the stage modules (it's in `FrequencyConditioner`'s `STAGE_VOICE_TABLE` but not on `StageModule`). No `audioMode` consumer — the strings exist but no audio engine plays them.

---

## 2. Gap Inventory (ranked by impact)

| # | Gap | Impact | Effort |
|---|---|---|---|
| GAP-WB-1 | Wire PolarityOntology into runtime | CRITICAL | ~80 LOC |
| GAP-WB-2 | Bridge RedPESTLE into MacroCatalystEngine | CRITICAL | ~60 LOC |
| GAP-WB-3 | Wire Conqueror 4-phase boss | HIGH | ~120 LOC |
| GAP-WB-4 | Place holons spatially in WorldScene | HIGH | ~200 LOC |
| GAP-WB-5 | Reconcile 3 parallel narrative layers per encounter | HIGH | ~150 LOC |
| GAP-WB-6 | Fix WorldScene null/null (OA-12) | CRITICAL | ~20 LOC |
| GAP-WB-7 | Add line-specific content for Green/Turquoise/White | HIGH | ~500 LOC |
| GAP-WB-8 | Add line-specific content for Strategic/SocialCooperative/ImmersiveRPG | MEDIUM | ~700 LOC |
| GAP-WB-9 | Add `drive` field to 30 encounters | MEDIUM | ~60 LOC |
| GAP-WB-10 | Add `holonId` to EncounterSpec | MEDIUM | ~40 LOC |
| GAP-WB-11 | Expand ConsequenceNarrator (line/stage specificity) | MEDIUM | ~200 LOC |
| GAP-WB-12 | Add domestic/hearth locations to Red world | LOW | ~100 LOC |
| GAP-WB-13 | Add audio engine consumer for `audioMode` | LOW | ~200 LOC |

---

## 3. Overlooked Aspects (15 findings)

| # | Aspect | Description |
|---|---|---|
| OA-1 | Three parallel narrative layers | Each encounter has holon + theme + enemy — these don't reference each other. LLM must improvise coherence every encounter. |
| OA-2 | No secondary-line taskBinds | All encounters are single-line. Cross-line interference (e.g., Cognitive+Emotional compound) is structurally absent. |
| OA-3 | No quadrant-conditional allyBeats | The allyBeat is the same regardless of which quadrant the player is working from. |
| OA-4 | No liminal-edge encounters | No encounters at the boundary between stages (e.g., Red→Amber transition encounters). |
| OA-5 | All Locations are martial | No hearth, farm, temple, or domestic space. Red world is a battlefield with no domesticity. |
| OA-6 | No Magenta-bleed encounters | No encounters that bring Magenta-stage material (magical thinking, animistic perception) into Red-stage content. |
| OA-7 | No Infrared-bleed encounters | No encounters that bring Infrared-stage material (survival, sensori-motor) into Red-stage content. |
| OA-8 | No endosymbiotic grounding on holons | Holons are incorporeal — no biological/substrate dimension (violates 08.8.25). |
| OA-9 | No archetypal-class field on holons | All Red NPCs are just `stage: "Red"` — no dimension tag (violates 08.8.26). |
| OA-10 | No audio engine | `audioMode` strings ('phrygian', 'tribal-percussive') have NO consumer. The most developmentally-direct modality (audio) is absent. |
| OA-11 | No NPC memory | NPC relationships track only `{strength, encounters, lastEncounterAt}` — no memory of what was said. |
| OA-12 | WorldScene STILL passes null/null | Despite Wave 1 claims, the Phaser path is NOT fixed for UserMatrixModel updates. |
| OA-13 | No encounter-avoidance consequences | When the player avoids an encounter, nothing happens — no developmental cost, no shadow surfacing. |
| OA-14 | No cross-session NPC development | NPCs don't change between sessions — no NPC developmental trajectory. |
| OA-15 | No collective/field dimension encounters | All encounters are individual (Mental dimension). No Social or Collective dimension encounters. |

---

## 4. Refactor Plan

### Wave W-1: Wire Dead Ontologies (2-3 days)
1. GAP-WB-6: Fix WorldScene null/null — call `applyResponseOnly` before `tickWithStrategy` (~20 LOC)
2. GAP-WB-1: Wire PolarityOntology into PolarityEngine — use texture names for narrative conditioning (~80 LOC)
3. GAP-WB-2: Bridge RedPESTLE into MacroCatalystEngine — use Red-stage thematic content for macro-event descriptions (~60 LOC)
4. GAP-WB-3: Wire Conqueror 4-phase boss — replace single `red-main-tyrant` with 4-phase progression (~120 LOC)

### Wave W-2: Author Missing Content (5-7 days)
5. GAP-WB-7: Add line-specific Green/Turquoise/White pools (48 pools × 2 prompts = 96 prompts)
6. GAP-WB-8: Add line-specific Strategic/SocialCooperative/ImmersiveRPG pools (72 pools × 1 prompt = 72 prompts)
7. Replace `concept-drafts.json` stub with actual narrative content
8. Add holon `transformations` history fields

### Wave W-3: Reconcile Narrative Layers (3-4 days)
9. GAP-WB-5: Add `holonId` to EncounterSpec; reconcile holon+theme+enemy into unified narrative
10. GAP-WB-4: Place holons spatially in WorldScene — player navigates to locations
11. Add line-specific shadow content (ShadowContentGenerator currently has generic quadrant templates)
12. Add secondary-line `taskBinds` for compound encounters

### Wave W-4: Polish & Depth (2-3 days)
13. GAP-WB-9: Add `drive` field to 30 encounters
14. GAP-WB-10: Add `catalystClass` field to encounters
15. GAP-WB-11: Expand ConsequenceNarrator with line/stage specificity
16. Add quadrant-conditional `allyBeat` variations
17. Add liminal-edge + Magenta-bleed encounters
18. Add domestic/hearth locations

**Total estimated effort: ~12-17 days**

---

**End of audit report.**
