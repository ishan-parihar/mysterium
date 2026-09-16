# Changelog -- Research Phase

> **Cross-references:** [[docs/architecture/10-stage-assessment-architecture|Stage Assessment Architecture]] · [[docs/architecture/ONBOARDING-REDESIGN-PLAN|Onboarding Redesign Plan]] · [[docs/foundations/06-law-of-one-correspondence|06 — Law Of One Correspondence]] · [[docs/foundations/24-encounter-scheduler|24 — Encounter Scheduler]] · [[docs/foundations/25-cumulative-consciousness-index|25 — Cumulative Consciousness Index]] · [[docs/foundations/26-unified-core-architecture|26 — Unified Core Architecture]] · [[docs/foundations/27-auto-mode-strategy-engine|27 — Auto Mode Strategy Engine]] · [[docs/foundations/00-integral-theory|00 — Integral Theory]]
A record of canon decisions and major restructurings of `/docs/`.
The implementation phase will track its own changelog at the repo
root (or in `CHANGELOG.md`).

---

## v3.0 -- WebUI LLM-Dependence v1 (2026-07-14)

The WebUI is now **fully LLM-driven** for every narrative surface the player
sees, with a graceful Veil-seam fallback when the LLM is genuinely
unreachable. Audit doc: `docs/audits/HARDCODE-AUDIT.md`. Plan executed
in eight steps.

### What changed

- **`src/core/fallback/FallbackProvider.ts`** moved from
  `src/infra/llm/` to `src/core/fallback/`. The LLM-tier
  infrastructure no longer owns pre-authored content — this is now a
  domain concern (validated developmental exercises).
- **`src/core/fallback/withFallbackVeil.ts`** added. Frozen corpus of
  five Veil-register disclosure lines. Used to surface fallback content
  politely to the player when the LLM is unavailable.
- **`src/infra/llm/templates.ts`** added. Three pure-function prompt
  templates: `modalityOpenerTemplate`, `moduleSummaryTemplate`,
  `responseOptionsTemplate`. Each carries its own voice / length /
  shape constraints.
- **`src/infra/llm/LLMClient.ts` + `src/infra/llm/ProxiedLLMClient.ts`**
  gained a streaming interface (`queryLLMStream`,
  `proxyQueryLLMStream`). Returns `ReadableStream<string>` chunks.
- **`src/routes/api/llm/_lib.ts`** gained `proxyChatCompletionStream`.
  Wired at `/api/llm/chat` via `Accept: text/event-stream` mode-detect.
  No `Accept` header (or non-SSE) → legacy buffered JSON path.
  VeilFilter runs once at end-of-stream on the concatenated text.
- **`src/core/assessments/AgenticOrchestrator.ts`:** the `runFallback`
  path now also attempts the LLM (opener, summary, options) before
  falling back to the static pool. `buildModuleNarrative` is now async
  and LLM-first. Three top-level helpers added: `collectStreamWithin`,
  `tryLLMCall`, `parseFourOptions`.
- **`tests/audits/hardcodeAuditV1.test.ts`** added — 13 invariant
  tests asserting post-audit contracts.
- **`tests/core/assessments/AgenticOrchestrator.test.ts`** updated —
  five test sites now mock multiple `fetch` calls because the WebUI
  makes an opener + summary call after fallback.

### What did NOT change

- The CLI's `--no-llm` flag still works exactly as before; smoke
  tests stay deterministic.
- `src/core/data/calibrationPrompts.ts` and the 1,280 assessment items
  in `src/core/data/` — unchanged. Assessment *inputs* must be
  deterministic.
- `src/core/presentation/veilDescriptors.ts` — unchanged. Veil-layer
  performers must stay static.
- `src/routes/diagnostic/`, `src/routes/telemetry/`, `src/routes/setup/`
  — unchanged. Diagnostic / telemetry / setup surface must remain
  exact and inspectable.
- `scripts/cli-game.ts`, `tests/infra/*.test.ts` — only imports were
  updated to the new `src/core/fallback/` path.

### Behavior contract

- **LLM-on path**: every encounter uses the LLM for the opener line,
  for summary text, and for response options. Static content is the
  fallback of last resort.
- **LLM-off path (`--no-llm` or genuine network failure)**: each
  encounter shows a Veil-seam disclosure line ("*The mirror is silent;
  old reflections return to you.*") followed by the static fallback.
  Static content is unchanged — the seam is added, not the prose.

### Risk

- Streaming wire is new. The setup probe is unchanged because its
  caller doesn't send `Accept: text/event-stream`; we explicitly did
  not alter its request.
- VeilFilter is not run per-chunk during stream mode. It runs once at
  end-of-stream on the concatenated text. Mid-stream chunks may show
  un-veiled text transiently, but only the finalised veiled text is
  persisted (or rendered as final response).

---

## v2.0 -- Unified Architecture (2026-05-18)

The architectural pivot: ATB combat is completely removed from the
architecture. Assessment modules ARE the gameplay. Every encounter is a
module executing in one of four modes (calibration, encounter, practice,
shadow work).

### Key architectural decisions

- **BattleScene replaced by AssessmentScene** -- no more ATB rendering
- **PlayerProfile replaced by Significator** -- the sole state vessel
- **64-cell module architecture** (8 lines x 8 stages) is the game structure
- **No HP, Mana, Spells, Damage** in the architecture

### Documents added

| Document | Purpose |
|---|---|
| `foundations/24-encounter-scheduler.md` | Encounter selection algorithm & macro-catalyst engine |
| `foundations/25-cumulative-consciousness-index.md` | CCI composite metric |
| `foundations/26-unified-core-architecture.md` | The unified core architecture spec |
| `foundations/27-auto-mode-strategy-engine.md` | Auto-mode session strategy generation |
| `docs/architecture/10-stage-assessment-architecture.md` | Module contract, composition rules, 4 execution modes |
| `docs/ONBOARDING-REDESIGN-PLAN.md` | Binary-search composite assessment for Significator seeding |
| `UNIFIED-IMPLEMENTATION-PLAN.md` | The binding build plan (supersedes IMPLEMENTATION-PLAN.md) |

### Documents archived to `docs/archive/`

| Document | Reason |
|---|---|
| `plan.md` | Original ATB-based conceptual blueprint, fully superseded |
| `IMPLEMENTATION-PLAN.md` | Superseded by UNIFIED-IMPLEMENTATION-PLAN.md; retains ATB references |
| `docs/PROFILE-MAPPING-AUDIT.md` | Audits PlayerProfile which is replaced by Significator |
| `docs/combat/00-combat-philosophy.md` | Predicated on ATB combat which is removed |
| `docs/enemies/00-enemy-taxonomy.md` | "Enemy" concept replaced by encounter/assessment modules |

### What did not change

- The mandatory six-heading contract for every document.
- The seven first-principles.
- The line / stage / quadrant / state / drive vocabulary.
- The transformed up-down staircase (1u/2d, ~70.7% target).
- The clean-architecture split (core/ / infra/ / game/).
- The concept-drafts (all 512 remain valid content specifications).
- The Law-of-One canonical layer.

---

## v1.0 — Canon Lock (2026-05-17)

The five load-bearing open questions from `REQUIREMENTS.md §6` were
resolved by the user. The research phase is now **canon-locked** and
the build plan in `MVP-BLUEPRINT.md` is binding.

### Resolved canon decisions

1. **Law-of-One layer = canon, fully integrated.**
   - The seven energy rays (Red, Orange, Yellow, Green, Blue,
     Indigo, Violet) are first-class canonical types alongside
     `Stage`, `Line`, `Quadrant`, `State`, `Drive`.
   - The 8-stage / 7-ray sub-octave correspondence is canon.
   - The harvest into 4th density is the canonical post-White
     endgame.
   - Visuals, audio, narrative, codex, and the player's psychograph
     all carry ray information.

2. **No clinical / IRB ambition; effective efficacy required.**
   - No regulated medical-device claims.
   - Commitment to *legitimate* neurological / biological /
     psychological efficacy via validated tasks and honest telemetry.

3. **Adaptive onboarding for any age, any altitude.**
   - The game self-calibrates per line via a 10–20 minute interactive
     prologue.
   - Built personally, deployed globally.

4. **MVP = modular foundation of everything.**
   - All 8 lines, 8 stages, 7 rays, 4 quadrants registered as modules
     at MVP launch.
   - Red stage as the first vertical-slice playable content.
   - Adding the rest is content drops, not re-architecture.

5. **Multiplayer not in MVP** (post-MVP integration path documented).

### Documents updated under canon

| Path | Change |
|---|---|
| `MVP-BLUEPRINT.md` (NEW, repo root) | The definitive build plan — supersedes all conflicting prior docs. |
| `docs/REQUIREMENTS.md §6` | Open questions replaced with resolved canon decisions. |
| `docs/foundations/06-law-of-one-correspondence.md` | Promoted from "Optional Aesthetic Layer" to "Canonical Cosmology". Firewall refined (metaphysics canon; cognitive-training claims still peer-reviewed). |
| `docs/02-glossary.md` | `Ray` and `BlueFlow` types added as canonical. Stage table relabeled "Energy ray (canonical)". Rays-expanded section added. |

### Documents not yet updated under canon (deferred)

The per-stage world bibles (`docs/stages/01-…08-…`) reference
"optional" Law-of-One framing in places. They will be re-passed during
implementation when the Ray-tagged content is being authored. Not
urgent — the binding contract is in `MVP-BLUEPRINT.md` and
`docs/foundations/06`.

### What did not change

- The mandatory six-heading contract for every document.
- The seven first-principles.
- The line / stage / quadrant / state / drive vocabulary.
- The transformed up-down staircase (1u/2d, ~70.7% target).
- The clean-architecture split (`core/` / `infra/` / `game/`).
- The neuroscience / psychophysics evidence-hierarchy discipline.

---

## v0.1 — Initial Research Phase (2026-05-17)

Created 38 foundational design documents covering:

- Master `REQUIREMENTS.md`
- Meta layer (4 docs): vision, first-principles, glossary, methodology
- Foundations layer (11 docs): integral theory, AQAL, stages, lines,
  states, drives, Law-of-One, neuroscience, psychophysics, flow,
  shadow.
- Lines of intelligence (9 docs): overview + 8 line bibles.
- Stages of consciousness (9 docs): overview + 8 stage world bibles.
- Architecture-philosophy layer (4 docs): combat, enemies,
  progression, narrative.

Codebase untouched per user direction during research phase.
