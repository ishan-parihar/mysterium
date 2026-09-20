# docs/system/AGENTS.md — System Rung Router

> **Role:** the canonical entry point for the **system rung** (`_org.yaml → rungs.system`), and its
> authority of record. It describes how the canon composes into a working system, organ by organ.
> **It is a router, not a contract:** the contracts are `docs/foundations/*`, the build order and
> gates are `docs/DEVELOPMENT-PLAN.md`, and the decisions are the ADs in `core/decisions/`.
> **Status:** Active (2026-09-20).

---

## 1. What this rung is

```
docs/system/
├── AGENTS.md              ← you are here (system router)
├── 00-identity.md         ← what Mysterium is, as a system
├── core/
│   ├── decisions/         MY-AD-NNNN — what we chose and why
│   ├── regressions/       MY-RG-NNNN — what broke and the guard against it
│   └── worklog/           NNNN-<action>-<target>.md — directory-native worklog
├── logs/mutations.jsonl   the append-only architectural ledger
└── sub-systems/<organ>/   the 13 organs, each with its own router + core/{decisions,regressions}
```

**The organ index, the rung map and the record list are generated** — see `docs/INDEX.md`
(`python3 scripts/arch.py emit`). Do not hand-maintain an organ table here; it would duplicate
`_org.yaml`.

## 2. The composition view (why the organs are what they are)

Six functions compose into one contemplative practice. Each is owned by an organ; the mapping is the
reason the organ boundaries exist:

| Function | Primary engines | Scale | Organ |
|---|---|---|---|
| Developmental assessment | AgenticOrchestrator, TaskRenderers, ItemSelection | micro (per encounter) | `kernel` |
| Holonic curriculum | CurriculumEngine, DepthAssessment, SpacedRepetition | meso (knowledge acquisition) | `curriculum` |
| Shadow work | ShadowDetector, ConsequenceEngine, ShadowContentGenerator | micro (per shadow) | `catalyst` |
| Polarity & the Choice | PolarityEngine, PolarityTrace, STO/STS crystallisation | macro (lifetime arc) | `catalyst` |
| Incarnation architecture | WorldState, EncounterScheduler, MacroCatalystEngine | macro (world-system) | `world` |
| The Veil | VeilFilter, FallbackProvider, qualitative descriptors | meta (experiential) | `presentation` + `profiling` |

## 3. Layer rules

> These are **decisions**, not prose: `MY-AD-0002` (layer rules) in `core/decisions/` is their
> normative home. Summary only:

- **`src/core/` is pure** — no game engine, no native bridge, no networking. It holds the domain
  types, engines, assessments, curriculum logic, and presentation descriptors.
- **`src/infra/` holds every external integration** — LLM, persistence, profiles, telemetry, crypto.
- **Rendering surfaces are consumers** — `src/routes/` (SvelteKit WebUI) and the CLI are first-class
  peers, not a debug path.
- **Content is data, not code** — a new line, stage, shadow archetype, curriculum concept or
  assessment item is a data change.

## 4. Records

- **Decisions (AD)** — `core/decisions/` (system-wide) and `sub-systems/<organ>/core/decisions/`
  (organ-scoped). Written **only** via `python3 scripts/arch.py new`.
- **Regressions (RG)** — same homes; every RG's `Prevention` must be an executable guard (a gate, a
  test, or a validator check).
- **Ledger** — every record mutation appends to `logs/mutations.jsonl`; `arch.py validate` (DG9)
  fails a record with no receipt.
- **System-wide verdicts never live in an organ core** (holoarchic rule, `44 §10`).

Vocabulary and ownership: `docs/foundations/44`. Rung/organ structure: `_org.yaml`.
Process and phases: `docs/ARCHITECTURE-TRANSMUTATION-PLAN.md`.
