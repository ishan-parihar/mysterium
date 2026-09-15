# Addendum (2026-09-15) — Status Corrections & Post-Audit Fix Record

> This addendum corrects two committed 2026-08-28 audit documents against the
> current state of the tree, and records the fixes applied following
> `docs/audits/FULL-DEVELOPMENT-AUDIT-2026-09-15.md`.
> It lives in `docs/audits/` per the project convention that audit documents are
> dated snapshots — corrections are appended as addenda, not silently rewritten
> into the historical snapshots.

## 1. Corrections to `docs/agentic-loop/02-system-architecture-audit-2026-08-28.md`

| Audit claim (2026-08-28) | Status at 2026-09-15 |
|---|---|
| `engines/hooks.ts` — "TRANSFORMATION HOOKS NOT WIRED" | **Superseded.** The hook stub was replaced by an explicit, documented no-op (`src/core/engines/hooks.ts:1-17`) after the TDG-Rust integration was removed. Transformation state advancement now lives in `GameLoop.applyResponseOnly`/`tickWithStrategy` and no longer depends on hooks. The 17-byte-stub description in the audit is historical. |
| `assessments/SessionAgent.ts` — "legacy, referenced but no longer in CLI path" | Still accurate. No change. |
| "Verification: `npx vitest run` 65 files / 722 tests pass" | Grown to **85 files / 884+ tests** (and further with the audit-fix regression tests) — all passing. |

## 2. Corrections to `docs/brain-game-upgrade/09-legacy-purge-and-unified-orchestrator-2026-08-28.md`

The legacy-purge narrative is accurate as of its date. Note for current readers:
the unified orchestrator (`AgenticOrchestrator`) has since gained static-import
session-end wiring (see §3 below, P0-FIX), and the `dist/cli` bundle is NOT
committed to git (gitignored) — any "shipped bundle" observations refer to
local build artifacts only. Always rebuild via `npm run build:cli` before
comparing `dist/` against source.

## 3. Fixes applied after the 2026-09-15 Full-Development Audit

All fixes verified by the regression tests in
`tests/engines/AuditFixes2026-09-15.test.ts`, `tests/data/StageHolons.test.ts`,
and `tests/core/curriculum/IntegralCurriculum.test.ts`.

### P0 — endSession ESM crash + silent harvest no-op (FIXED)
- `src/core/GameLoop.ts`: the three `require()` calls (macro-event advancement
  ×2, harvest check ×1) replaced with static imports. endSession no longer
  throws "require is not defined" when `world.activeMacroEvents` is non-empty,
  and the White-stage harvest check now actually executes.
- Latent SHAPE-FIX: the sync path's fallback `MacroEventState` now carries the
  `event` field (mirrors the async path); previously a first-session event
  resolved under an `undefined` tension key.
- Regression tests: macro-event advancement, resolution + PESTLE reset, fallback
  shape, harvest verdict at White, no harvest below White.

### P5 — typed session bookkeeping (FIXED, plus lifecycle bug found during fix)
- `lastSessionAt` and `curriculumIntervention` promoted from `as any` casts to
  real `Significator` fields (`src/core/domain/Significator.ts`), preserved by
  `validateSignificator` (`src/infra/persistence/validateSignificator.ts`).
- While fixing, a further bug was discovered and fixed: the intervention flag
  was consumed in `startSession` only in a local copy that was never persisted —
  once set, it stuck **forever**, forcing consolidation on every future session.
  Lifecycle is now: `endSession` overwrites the flag each session end (set on
  intervene, cleared otherwise); `startSession` reads it one-shot.
- `lastSessionAt` was previously read but NEVER written; now stamped by both
  `endSession` and `endSessionAsync`, so the >30-day re-calibration heuristic
  works on its primary signal.
- `validateSignificator` also now reconstructs `knowledge.forgettingCurves`
  (previously dropped on load — Phase 5A forgetting-curve persistence did not
  survive save/load).

### estimateResponseQuality verbosity reward (FIXED)
- Character-length classes replaced with a saturating word-count tier
  (≥40 words = full bonus; caps at 40). A 400-word answer now scores exactly
  what a 40-word answer scores. Note: no form-only heuristic can detect
  emptiness — rubric-based quality via the orchestrator remains the real
  long-term fix (tracked in the audit, not silently claimed here).

### P2 — stale local bundle (RESOLVED — and a real build bug found under it)
- `dist/` is gitignored; the stale "CCRPG"-branded artifact was a local build
  leftover. Rebuilt via `npm run build:cli`.
- **New bug discovered while rebuilding:** `npm run build:cli` had been broken
  since commit `42078ad` (legacy purge) — `scripts/cli-game.ts:347` still
  imported the deleted `src/cli/LayerRenderer.js`. It escaped CI because
  `scripts/` is outside `tsconfig`'s `include` and tsx runtime resolution
  tolerated the dangling specifier; only esbuild bundling caught it. The import
  was dead (no call sites since the T-3.4 leak fix). Fixed; bundle rebuilds and
  runs. This is exactly the audit's "stale bundle" symptom with a root cause
  one level deeper: the bundle could never have been refreshed.
- World-merge migration added: existing saves persisted the 36-holon Red-only
  world and would never receive new content; `loadHolons()` now merges authored
  holons into saved worlds idempotently (36 → 92 holons verified in the running
  CLI, save persisting the merge once).

### P3 — Red-only world content (FIXED)
- New `src/core/data/stage-holons.json`: **56 authored holons** — 8 per stage
  (one per line) for the 7 previously-unauthored stages (Infrared → White),
  every non-Red stage surfacing all 4 shadow quadrants, grounded in the
  `docs/stages/` world bibles (amber cathedral/guild world, orange lab/progress
  world, green consensus world, turquoise weave world, white harvest threshold).
- Wired into both surfaces: `scripts/cli-game.ts` `loadHolons()` (with the
  save-merge migration) and `src/routes/diagnostic/+page.svelte`. Total world
  content: 36 → 92 holons.
- Bug found during wiring: the WebUI diagnostic page read
  `(holonsJson as any).holons ?? []` on a JSON **array** — the holons panel
  always rendered 0. Fixed.
- Data-integrity tests enforce per-stage line coverage, shadow-quadrant
  coverage, enum validity, ID uniqueness across the combined corpus, and
  relationship resolution (these tests caught and corrected 3 authoring errors
  during development).

### P4 — thin curriculum corpus (PARTIALLY ADDRESSED)
- New subject **integral.foundations**: 8 fully-structured curriculum holons
  (branch + 7 subjects/topics) teaching the game's own developmental map —
  stages, lines, holons, quadrants, states, shadow, translation-vs-
  transformation — each with the 5-phase structure, rich content,
  misconceptions, complete depth rubrics, and developmental mappings.
  All 8 lint at 0 errors / 0 warnings / pedagogicalQuality 1.0 /
  developmentalIntegration 1.0. Registry: 48 → 56 holons, 3 → 4 subjects.
- Remaining gap (honest): the 515 concept-draft library is still not converted;
  this expansion is a beginning, not parity.

### P1 — stale audit docs (this document)
- Corrections recorded above rather than rewriting historical snapshots.

## 4. Verification at time of writing

- `npx tsc --noEmit` — clean
- `npm test` — full suite green including the new regression/data tests
- `npm run check:invariants` — 33/33
- `workspace-lint` — 0/0/0
- `npm run build` (all 4 gates) — green
