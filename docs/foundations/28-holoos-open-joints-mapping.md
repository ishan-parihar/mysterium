# 28 — HoloOS Open-Joints Mapping

> **Status:** canonical (tracking document).
>
> **Cross-references:** [[docs/foundations/06-law-of-one-correspondence|06 — Law Of One Correspondence]] · [[docs/foundations/21-incarnation-architecture|21 — Incarnation Architecture]]
>
> **Purpose:** Maps each resolved HoloOS open joint to its Mysterium implementation status. This document is the Mysterium-side mirror of HoloOS `_THEORY/02_Ontology/OPEN_JOINTS.md`.
>
> **Heading-contract map (2026-09-16):** Purpose → the Purpose statement above; Scientific basis → the HoloOS joint references throughout both tables; Game-design mapping → the "Mysterium Relevance" column of each table; Architectural contract → the "Resolved Joints" table (what Mysterium commits to); Open questions → the "Open Joints" table (the doc's literal open-question inventory, 50+ tracked); Principles served → definition discipline and codebase honesty (02) — tracking open theory joints explicitly rather than silently assuming them.

---

## Resolved Joints with Mysterium Implementation

| Joint | Resolution | Mysterium Implementation | Status |
|---|---|---|---|
| J-INV-5 | First octave / modelable boundary (08.8.7) | Mysterium is single-octave (3rd density); first octave out of scope | ✅ N/A |
| J-INV-7 | Substrate-layer asymmetry (08.8.7 §6.2) | `SUBSTRATE_LAYER_LAW` constant in GreaterCycleEngine.ts | ✅ Implemented |
| J-HUS-1 | D3-experiential annotation policy (08.8.18) | Mysterium uses universal terms in player-facing output; `--dev` flag for system-terms | ✅ Implemented |
| J-HUS-2 | CLI language policy (08.8.18) | `mysterium status` uses felt-sense language; `--dev` flag exposes system-terms | ✅ Implemented |
| J-HUS-7 | Provenance policy (08.8.18) | Mysterium docs retain original language with status-ladder tags | ✅ Implemented |
| J-DU-2 | Depth-asymmetry documentation | Mysterium docs flagged via `AUDIT-HOLOOS-ALIGNMENT.md` | ✅ Implemented |
| J-ERC-3 | Energy-Ray-Center ↔ Complex mapping (08.8.22) | `RAY_COMPLEX` in Ray.ts; `LINE_COMPLEX` in Line.ts | ✅ Implemented |
| J-ERC-4 | rayProfile as Energy-Ray-Center Profile (08.8.22) | `rayProfile: Record<Ray, number>` on Significator; updated by ConsequenceEngine; read by TransformationDetector + PriorityComputation | ✅ Implemented |
| J-SEC-1 | Catalyst-class = 4 dimensions (08.8.26) | `Dimension` type + 32 archetypal-class matrix in ArchetypalClass.ts; UserMatrixModel extended to 4D (256 cells) | ✅ Implemented |
| J-SEC-2 | Compartment count variable (08.8.24) | Mysterium has fixed 3 complexes (Body/Mind/Spirit); variable compartments not modeled | ⚠️ Partial |
| J-HDG-3 | Catalyst-class origin (08.8.26) | Same as J-SEC-1 — archetypal-class matrix provides the origin | ✅ Implemented |
| J-CLI-2 | MCP parity | Mysterium has no MCP server (out of scope for game UX) | ❌ Future |
| J-UNAV-4 | Universal navigation | Mysterium CLI uses universal terminology via `--dev` flag | ✅ Implemented |
| J-PTD-* | Phase-Transition Liminality (08.8.14) | `liminalitySignature` in MetabolicHealth; `'transitional'` interpretation; `resetPhaseAfterTransformation` | ✅ Implemented |

## Open Joints with Mysterium Relevance

| Joint | Status | Mysterium Relevance |
|---|---|---|
| J-INV-1 | 🟡 Partial | Prior-octave count (3-4 hypothesis). Mysterium uses 3 (N-3, N-2, N-1) in INVOLUTION_GROUND. |
| J-INV-3 | 🔴 Open | Substrate of prior octaves. Mysterium doesn't model this (single-octave scope). |
| J-INV-4 | 🔴 Open | Weight of accumulated Experience. Mysterium models via `totalEncounters` but not as a weight. |
| J-INV-6 | 🔴 Open | Our octave's novel contributions. Mysterium's White stage = D4+ contributions. |
| J-VERT-1 through 5 | 🔴 Open | Sub-density validation, density-defaults derivation. Mysterium uses Spiral Dynamics stages, not HoloOS density-defaults. |
| J-COLL-1 through 5 | 🔴 Open | Collectivity axis. Mysterium has `HolonKind` (8 kinds) but not log₁₀-C. |
| J-REALM-1 through 7 | 🔴 Open | Realm-placement. Mysterium has State enum (Gross/Subtle/Causal/Witness/Non-Dual). |
| J-NEST-1 through 6 | 🔴 Open | Nesting direction. Mysterium has no nesting axis. |
| J-PDG-1 through 7 | 🔴 Open | Primal Distortion Genesis. Mysterium uses Law-correspondence in foundations/02. |
| J-ERC-1 through 7 | 🔴 Open (3 resolved) | Energy-Ray-Centers. 3 resolved (J-ERC-3,4, and J-ERC-5 partially via G_z/P_z). 4 remain open. |
| J-PTD-1 through 7 | 🔴 Open (1 resolved) | Phase-Transition Liminality. Liminality detection implemented; scaling law and Veil-density effects open. |

---

**Summary:** 14 resolved joints have Mysterium implementations (12 fully, 2 partially). 50+ open joints are tracked but out of scope for current Mysterium functionality.
