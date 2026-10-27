---
covers: "src/**"
verified: "2124f1e"
---

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
└── sub-systems/<organ>/   the 14 organs (_org.yaml `organs:`), each with its own router + core/{decisions,regressions}
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

## 5. System-wide records (hand-linked)

### Decisions

- [MY-AD-0001 — Assessment-module execution replaces the ATB combat spine](core/decisions/MY-AD-0001-assessment-module-execution-replaces-the-atb-combat-spine.md)
- [MY-AD-0002 — Layer rules: core is pure, infra integrates, surfaces consume, content is data](core/decisions/MY-AD-0002-layer-rules-core-is-pure-infra-integrates-surfaces-consume-c.md)
- [MY-AD-0003 — Vocabulary is owned by foundations/44; the ladder is ratified](core/decisions/MY-AD-0003-vocabulary-is-owned-by-foundations-44-the-ladder-is-ratified.md)
- [MY-AD-0004 — The objective is continuing development, not the harvest](core/decisions/MY-AD-0004-the-objective-is-continuing-development-not-the-harvest.md)
- [MY-AD-0005 — Eligibility is a condition; the closure is an event](core/decisions/MY-AD-0005-eligibility-is-a-condition-the-closure-is-an-event.md)
- [MY-AD-0006 — Register classes: the full metric register is available at any stage](core/decisions/MY-AD-0006-register-classes-the-full-metric-register-is-available-at-an.md)
- [MY-AD-0007 — One articulation ladder, two registers, no privilege tiers](core/decisions/MY-AD-0007-one-articulation-ladder-two-registers-no-privilege-tiers.md)
- [MY-AD-0008 — Objective alignment biases catalyst selection; it never replaces it](core/decisions/MY-AD-0008-objective-alignment-biases-catalyst-selection-it-never-repla.md)
- [MY-AD-0009 — Two-fold world memory with a per-holon owner worker](core/decisions/MY-AD-0009-two-fold-world-memory-with-a-per-holon-owner-worker.md)
- [MY-AD-0010 — One foreground orchestrator; background workers for menial jobs](core/decisions/MY-AD-0010-one-foreground-orchestrator-background-workers-for-menial-jo.md)
- [MY-AD-0011 — Human intervention is integrated, not a privileged handoff path](core/decisions/MY-AD-0011-human-intervention-is-integrated-not-a-privileged-handoff-pa.md)
- [MY-AD-0012 — Grading is evidence-only; competence and identity never mix](core/decisions/MY-AD-0012-grading-is-evidence-only-competence-and-identity-never-mix.md)
- [MY-AD-0013 — Documentation is governed as a three-record system](core/decisions/MY-AD-0013-documentation-is-governed-as-a-three-record-system.md)

### Regressions

- [MY-RG-0001 — A one-way migration script looks idempotent and is not](core/regressions/MY-RG-0001-a-one-way-migration-script-looks-idempotent-and-is-not.md)
- [MY-RG-0002 — Stage vocabulary drift (superseded names reappearing in active canon)](core/regressions/MY-RG-0002-stage-vocabulary-drift-superseded-names-reappearing-in-activ.md)
- [MY-RG-0003 — A document claims authority it does not own](core/regressions/MY-RG-0003-a-document-claims-authority-it-does-not-own.md)
- [MY-RG-0004 — A dormant directory reads as live canon](core/regressions/MY-RG-0004-a-dormant-directory-reads-as-live-canon.md)
- [MY-RG-0005 — Canon and code drift apart on a shared vocabulary](core/regressions/MY-RG-0005-canon-and-code-drift-apart-on-a-shared-vocabulary.md)
- [MY-RG-0006 — A ratified policy seam with no consumer (dormant proposals)](core/regressions/MY-RG-0006-a-ratified-policy-seam-with-no-consumer-dormant-proposals.md)
- [MY-RG-0007 — A lifecycle state machine permits a transition the canon forbids](core/regressions/MY-RG-0007-a-lifecycle-state-machine-permits-a-transition-the-canon-for.md)
- [MY-RG-0008 — Two documents own one formula](core/regressions/MY-RG-0008-two-documents-own-one-formula.md)
- [MY-RG-0009 — A partial purge leaves the old system's vocabulary in place](core/regressions/MY-RG-0009-a-partial-purge-leaves-the-old-system-s-vocabulary-in-place.md)
- [MY-RG-0010 — A gate passes because its fixture cannot fail](core/regressions/MY-RG-0010-a-gate-passes-because-its-fixture-cannot-fail.md)
