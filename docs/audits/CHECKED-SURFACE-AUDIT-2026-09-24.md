# Checked-Surface Audit — 2026-09-24

**Scope:** whether every production entry point is inside the *checked graph* — the set of files
that `tsc --noEmit`, the test suite, the kernel gates, and the workspace linter actually read.

**Method:** enumerated every `.ts` file outside `src/` + `tests/` (the tsconfig `include` set) →
added `scripts/**` to the compiler input → ran the project's own typecheck configuration over the
union → classified the errors (functional break vs. drift) → attempted the two shipped invocation
paths (`npm run cli`, `npm run build:cli`) → attempted a live headless session.

**Verdict: FAIL.** The entire `scripts/` layer — including the CLI, a documented ✅-implemented
surface — sits **outside the checked graph**. It carries a **P0 functional break** (the CLI cannot
boot at all) and **69 type errors**, none of which any gate, test, typecheck, build, or lint step
in the project can see. The green battery is real but **partial**: its domain is `src/` + `tests/`.

---

## 1. What is actually checked (and what is not)

| Surface | Files | In tsconfig | Tests | Gates | Status |
|---|---|---|---|---|---|
| `src/**` | ~600 | ✅ | ✅ | ✅ | **checked** |
| `tests/**` | 132 files | ✅ | — | — | **checked** |
| **`scripts/**`** | **37** | **❌** | **❌** | **❌** | **UNCHECKED** |
| `skills/**` | (python, own tests) | n/a | own | lint | checked by workspace-lint |
| Svelte components | ~80 | (`svelte-check`) | — | — | checked (`npm run check` 0/0) |

`tsconfig.json`'s `include` is:

```json
"include": ["src/**/*.ts", "src/**/*.js", "src/**/*.svelte", "tests/**/*.ts", ".svelte-kit/…"]
```

There is no `scripts/**`. `npm run build` runs `tsc --noEmit` — over `src/` + `tests/` only. So the
build reports **0 errors** while `npm run build:cli` (which bundles `scripts/cli-game.ts`) **fails**.

---

## 2. P0 — the CLI cannot boot (functional break, not type noise)

| # | Break | Cause | Effect |
|---|---|---|---|
| **P0-1** | `scripts/cli-game.ts:355` imports `../src/core/data/red-layer-holons.json` | `c634535` (WORLD-STORE-MOVE, 2026-09-21) renamed it to `src/core/world/data/red-layer-holons.json` (`R100`) and did not update this consumer | `ERR_MODULE_NOT_FOUND` at import time — **the CLI does not start at all** |
| **P0-2** | `scripts/cli-game.ts:359` imports `../src/core/data/stage-holons.json` | same rename (`R100` → `src/core/world/data/`) | same crash |
| **P0-3** | `scripts/cli-game.ts:5707` calls `declineVow(...)` — never imported | `VowService` moved to `src/core/practice/VowService.ts`; the consumer was not updated | the vow-decline path throws `ReferenceError` when reached |
| **P0-4** | `scripts/cli-game.ts:2198` references `responsesPool` — not declared anywhere | a removed local still referenced | `ReferenceError` when that path runs |
| **P0-5** | `scripts/tdg-probe.ts:14` imports `../src/infra/tdg/TDGClient.js` | module no longer exists | the TDG probe script is dead |

**Reproduction (verified):**

```
npx tsx scripts/cli-game.ts --headless --new-game --no-llm --encounters=3
  → Error [ERR_MODULE_NOT_FOUND]: Cannot find module '…/src/core/data/red-layer-holons.json'

npm run build:cli
  → esbuild fails on the same unresolved import

npm run build        → "0 errors"   ← the check cannot see scripts/
npm test             → 1507 passed  ← no test imports the CLI
python3 scripts/arch.py validate → 0 violations, 23 gates  ← gates read src/ only
```

**Break age:** introduced by `c634535` on **2026-09-21** and live for three days across several
"exhaustive pass" commits — including my own Phase-13 commit `1dcbe43`, which edited
`scripts/cli-game.ts` (journal wiring) and was verified by a battery that cannot read it.

---

## 3. The 69 errors, classified

| Class | Count | Meaning | Example |
|---|---|---|---|
| **Functional** | 5 | missing module / undefined name — crashes when reached | P0-1…P0-5 above |
| **API drift (shape)** | 17 | `TS2339`/`TS2551`/`TS2322`/`TS2353` — the consumer calls an API that changed | `ConsequenceRecord.line` no longer exists (×3); `CheckInOutcome.vowFulfilled`; drive-record casing `agency` → `Agency` (×4); `toLowerCase` on `{}` |
| **API drift (arity)** | 16 | `TS2345`/`TS2554` — argument count/type changed | 6 `Expected N arguments, but got M` in the delegation/session paths |
| **Dead declarations** | 24 | `TS6133`/`TS6192` — unused imports/locals accumulated while unchecked | unused imports left by module moves |
| **Other** | 7 | `TS7006`/`TS7053`/`TS2352`/`TS2741`/`TS18004`/`TS2304` | implicit `any`, indexed access on a readonly record |

**Files:** `scripts/cli-game.ts` (64) · `scripts/compile-facets.ts` (2) · `scripts/tdg-probe.ts` (2)
· `scripts/check-invariants.ts` (1).

---

## 4. Why this class recurred (the mechanism, not the instance)

Every one of P0-1…P0-5 is the **same failure shape**: *a `src/` module moved or was renamed, and the
`scripts/` consumer was not updated* — because **nothing in the feedback loop reads `scripts/`**.

The project's three integrity mechanisms all scope to `src/` + `tests/`:

1. **Typecheck** — tsconfig `include` omits `scripts/**`.
2. **Kernel gates** — source scans (`G25`) and module-graph assertions read `src/core/`.
3. **Tests** — only `tests/cli/DelegateArgs.test.ts` touches the CLI layer, and it tests a
   *helpers* module (`scripts/cli/delegateArgs.ts`), never the entry point.

So the answer to "why did the green battery not catch it" is not negligence in any one step — it is
**a hole in the checked graph**, and the hole is exactly where the user-facing CLI lives.

**This is the class Phase 14 must close**; fixing the five breaks without closing the hole would
leave the next module move free to break it again.

---

## 5. What is NOT broken (verified, so the record is honest)

Run in this audit, all green:

- `npx tsc --noEmit` (the project config) → 0 errors (it simply does not read `scripts/`).
- `TMPDIR=$HOME/tmp npm test` → **1 507 passed / 1 507** (132 files).
- `npm run build` → 0 TS errors; `npm run check` (svelte-check) → **0 errors / 0 warnings**.
- `python3 scripts/arch.py validate` → **0 violations, 23 gates**.
- `workspace_lint.py` → 0 errors / 0 warnings / 0 info.
- `npm run personalization:calibrate` → PASS, 64 cells × 7 modalities structurally healthy.
- `vitest` run uses `TMPDIR=$HOME/tmp` because `/tmp` is a quota'd tmpfs (EDQUOT on writes) —
  the documented mitigation; it fired again during this audit.

---

## 6. Recommendations (→ Phase 14, pending ratification)

| # | Recommendation | Class |
|---|---|---|
| **R1** | Close P0-1…P0-5: repoint the two renamed JSON imports at `src/core/world/data/`, import `declineVow` from `src/core/practice/VowService.js`, resolve `responsesPool`, re-point or retire `tdg-probe.ts`. Then prove `npm run build:cli` + a headless 3-encounter session both pass. | instance |
| **R2** | Add `scripts/**` to tsconfig `include` (and keep `npm run build`'s typecheck as the enforcement), then retire all 69 errors. | **class** |
| **R3** | Add a **CLI boot smoke gate** to the kernel: boot the CLI headless in a temp profile with N encounters, assert exit 0 and a completed session — the executable form of "the entry point runs". | **class** |
| **R4** | Add a **source-level assertion** (the `G25` pattern applied to build config) that no production entry point sits outside the checked graph: every `scripts/*.ts` file that is an entry point must be reachable from the tsconfig include set. A hole in the checked graph becomes a failed gate, not a silent blind spot. | **class** |
| **R5** | Grow `tests/cli/` to the subcommand matrix (help/version/status/glossary/delegate/session/calibrate/pod/credential …) so the CLI surface has behavioural coverage, not just a boot check. | coverage |
| **R6** | Record the lesson in the plan + `AGENTS.md §4.2`: *a green battery is only as wide as its checked graph; a production surface outside it is unverified by construction.* | doctrine |

---

## 7. The second sweep — two deeper findings from driving the CLI

Fixing the import path was not the end of it: with the CLI booting again, driving it exposed two
further lapses that no in-process test could have shown.

### F2 (High) — the DEFAULT and ALL headless/JSON paths bypass the orchestration architecture

`runFullSession()` picks a `gameMode` (line ~3409): `'direct'` (Direct Questioning) or `'story'`.
It is initialised to **`'direct'`** — "default to direct-questioning for cleaner UX" — and the
mode prompt is skipped entirely under `--headless`/`--json`. In direct mode the CLI calls
`runDirectQuestioningSession()`, which:

| Live-architecture surface | In `runDirectQuestioningSession` (default + headless) | In `runFullSession` story mode |
|---|---|---|
| `createOrchestrationServices` (feed, library, workers, telemetry, probes) | **absent** | created (~3361) |
| `executeEncounter({ orchestration })` | **not passed** (~2790) | passed (~3643) |
| personalization envelope / UDV / pooling / council scopes | **never runs** (orchestrator degrades: `if (!this.orchestration) return {}`) | runs per encounter |
| `captureCheckpoint` (feed + workers + polarity states + probe readings) | **never captured** | captured (~3657) |
| crash-sidecar journal (Phase 13 d9b) | **never appended** | appended (~3661) |
| `saveAll` | at ~3104, **without** `orchestrationCheckpoint` | at ~3807, with it |

**Consequence:** the personalization / memory / council / probe / telemetry architecture built
across Phases 11–13 is **inert in the default mode and in every automated invocation**. Verified
empirically: a completed headless session leaves a save with **no `orchestrationCheckpoint`** and
**no journal file**.

This is why the Phase-13 verification was in-process only: no automated surface reaches the
architecture, so the kernel gates and unit tests are the *only* exercisers of the live loop.

### F4 (Medium) — CLI flag drift, and a stale regression sweep

`--no-llm` — used by `scripts/regression-sweep.sh` and several audits — is **not** a declared
option; the CLI reports `error: unknown option '--no-llm'`. The regression sweep cannot have run
successfully since the flag was removed, and no gate noticed because the sweep is a one-shot script.

---

## 8. Fix status (ratified and executed 2026-09-24)

The user ratified **"fix P0 now, then the full Phase 14"**. Applied and verified in the same
session:

| Fix | Change | Verification |
|---|---|---|
| P0-1/P0-2 | both holon-JSON imports repointed at `src/core/world/data/` | CLI boots (was `ERR_MODULE_NOT_FOUND`) |
| P0-3 | `declineVow` destructured from `src/core/practice/VowService.js` | typechecks; the decline path no longer throws |
| P0-4 | `responsesPool` reference dropped (branch already retired; the parameter is optional) | typechecks |
| P0-5 | `scripts/tdg-probe.ts` **retired** — its subject module (`src/infra/tdg/TDGClient`) no longer exists; the KB-UTILITIES audit had already flagged it unreferenced | file removed |
| P0-6 (new) | `package.json` `files` gained `src/core/world/data/` — the shipped CLI reads the world data at runtime and the pre-rename path would have published a CLI that cannot start | manifest corrected |

**Verified after the fix:**

```
npx tsx scripts/cli-game.ts --headless --new-game --encounters=3   → exit 0, full session
npm run build:cli                                                → Build success
node dist/cli/cli-game.js --version                              → 0.1.0
node dist/cli/cli-game.js --headless --new-game --encounters=2   → exit 0
```

**Ratified Phase-14 shape** (user's four rulings): fix P0 first, then the full closure → **split the
CLI while fixing** → **approve Laya** and wire the real System-1 adapter → **do K1 first** (the
real-rater probe-validation protocol).

---

## 9. Open questions carried into Phase 14

| # | Question | Why it matters |
|---|---|---|
| Q5 | **F2's disposition:** wire the orchestration services into the Direct-Questioning path (making the default + headless modes architecture-live), or invert the default to story mode and keep DQ as a deliberately thin legacy surface? | The architecture is currently dark in the default mode; the user's "no lapses" requirement points at wiring it, but DQ's thinner UX was a deliberate choice. |
| Q6 | **K1 protocol scope:** does RV1–RV7 run against a recruited rater cohort (external) or is the deliverable the *instrumentation* — the rater-facing administration + agreement-statistics harness that a cohort plugs into? | Decides whether K1 is an engineering deliverable or an external programme. |

---

## 10. The third sweep — the error census after the P0 fix, and what the survivors reveal

Run 2026-09-24 with `scripts/**` now in the tsconfig `include` (so the errors exist for the
first time). **63 errors remain** — the P0 set (5) plus the two `tdg-probe.ts` errors are retired.

### 10.1 Census

| File | Errors |
|---|---|
| `scripts/cli-game.ts` | 60 |
| `scripts/compile-facets.ts` | 2 |
| `scripts/check-invariants.ts` | 1 |

| Code | Count | Class |
|---|---|---|
| `TS6133` / `TS6192` | 24 | dead declarations (unused imports/locals) |
| `TS2345` | 9 | argument type drift |
| `TS2554` | 7 | **arity drift** |
| `TS2339` | 5 | property does not exist |
| `TS2322` | 5 | assignment type drift |
| `TS2551` | 4 | property does not exist (did-you-mean) |
| `TS2353` | 3 | unknown property in object literal |
| `TS2352` | 2 | unsafe cast |
| `TS7053`/`TS6192`/`TS2741`/`TS2552`/`TS18004` | 1 each | mixed |

### 10.2 Severity triage — three tiers, not one

Type errors are erased at runtime, so the *count* is not the risk. The risk is what each one does
when its line executes. Read site-by-site (each classified by its enclosing function):

| Tier | Meaning | Sites |
|---|---|---|
| **T1 — dies or degrades when reached** | `TS18004` `responsesPool` (v3644) and `TS2552` `telemetry` (v3818) are bare names with **no value in scope** → `ReferenceError`. Both sit inside `runFullSession` — the **story/architecture-live** branch — and the 3644 one is inside a `try`, so the encounter dispatch is caught and degrades. **The story branch cannot dispatch an encounter.** | 2 |
| **T2 — silently falsifies output** | `TS2551` drive casing ×4 (v3150–3153): `driveWeights.agency` → `undefined` → `?? 0` → **every drive health score is exactly 0.5 regardless of the drives**, on the **default (DQ) profile path**. `TS2339` `ConsequenceRecord.line` ×3 (v811/850/980) → `new Set([undefined]).size === 1` → the post-session summary **always reports "1 aspect explored"**. `TS2339` `vowFulfilled` (v5747) → the fulfilment message **never prints**. | 8 |
| **T3 — type-shape only** | dead declarations, unsafe casts, enum/union mismatches that cannot change behaviour at runtime. | 53 |

**T2 is the serious class.** A crash is loud and gets fixed; a profile that reports *balanced drives*
for every player, and a session that reports *one dimension explored* every time, is the failure the
Veil-compliant design makes hardest to notice — there is no error, only a plausible number. Both sit
on the path a headless agent drives.

### 10.3 F5 (High) — the retired stage `White` is still live in `scripts/**`

The census surfaced a *semantic* defect that no count would have shown. `src/core/domain/Stage.ts`
defines the canonical ladder as **8 stages ending at `Turquoise`** (with `Teal` as stage 7), and
`src/core/engines/GreaterCycleEngine.ts` records the retirement explicitly:

> *"The row previously read `'White'`, which named the retired stage 8 … There is no D4 stage in
> Mysterium."*

That retirement reached `src/` and **missed `scripts/`** — the same failure shape as P0:

| Site | Ladder in use |
|---|---|
| `scripts/cli-game.ts:1122` `CAL_STAGES` | `Infrared…Green, Turquoise, White` |
| `scripts/cli-game.ts:1164` `stageOrder` | `Red…Turquoise, White` |
| `scripts/cli-game.ts:1460`, `:1608` `allStages` | `Infrared…Green, Turquoise, White` |
| `scripts/check-invariants.ts:275` | `Infrared…Green, Turquoise, White` |

The script ladder **drops `Teal` and appends the retired `White`**. Consequences on live surfaces:
calibration can never report `Teal`; its "highest detected stage" comparison (v1375) orders against
a ladder containing a stage that does not exist; the stage colour/abbrev tables (v1436–1460) render a
retired stage and omit a canonical one. This is precisely the *"confusing, or deviated stage
simulation"* the stage-ladder ratification exists to prevent — and it survived because the CLI is
outside the checked graph, so a retired literal is never type-rejected.

### 10.4 F6 (Medium) — the ladder is re-declared instead of imported

`domain/Stage.ts` exports both `ALL_STAGES` and `stageOrdinal()`, yet the ladder literal is
re-declared in **at least 18 modules** (`AgenticOrchestrator`, `SignificatorSnapshot`, `CCIEngine`,
`FallbackProvider`, `observables`, `gates`, `udv`, `envelopeRuntime`, `candidateLibrary`,
`scenarioSeeds`, `npcSeeds`, `sessionRuntime`, `LLMClient`, …) and hand-rolled with
`.indexOf(...)` instead of `stageOrdinal()`. The `src/` copies **agree today** — so this is not a bug,
it is the *precondition* for one: the `White` leak is what happens when one copy drifts and nothing
compares them. It is a non-redundancy violation against `AGENTS.md §2.2` with a demonstrated outcome.

### 10.5 What this changes about Phase 14

- **d2 splits into three**: d2a retire the census, **d2b purge the retired ladder from `scripts/**`**
  (F5 — a correctness fix, not a type fix), d2c make the ladder single-source (F6).
- **d4 is promoted.** "Wire DQ into the architecture" is joined by "**the story branch cannot
  dispatch an encounter**" (T1) — the architecture-live mode is not merely non-default, it is
  broken. G36's boot smoke must exercise **both** modes, not just the default.
- **G37 gains a second assertion**: not only "is every entry point in the checked graph" but "does
  any module re-declare a canonical domain constant" — the F6 class made visible.

### 10.6 Open questions from this sweep

| # | Question | Why it matters |
|---|---|---|
| Q7 | **Where does `White`'s marker content go?** The CLI carries a real marker list under `White` (`emptiness`, `non-dual`, `witness`, `dissolution`, `formless`, `suchness`, `rigpa`). If `White` is the retired *stage 8*, is this content (a) deleted, (b) folded into `Turquoise` as the sub-octave closure, or (c) relocated to the Violet **closure event** (`Ray.ts CLOSURE_BINDING`, which is explicitly *not* a stage)? | Decides whether a purge loses authored content. |
| Q8 | **Is `Teal` absent from the CLI's calibration ladder by accident, or was calibration intentionally authored against a different ladder?** | The purge's direction depends on it. |
| Q9 | **Direction of repair for API drift:** is `src/` canonical (adapt every CLI call site), or does a CLI call site express a genuine feature intent that `src/` should grow (e.g. `CheckInOutcome.vowFulfilled`, which the CLI's message implies should exist)? | A blanket "adapt the CLI" would delete a feature; a blanket "extend src" would legitimise drift. |
| Q10 | **Does the CLI split (d3) also move domain logic out?** The calibration block (v1100–1700) is a domain algorithm living in a presentation layer — and it is where F5 lives. Split-only, or split + extract to `src/core/`? | The extraction is the structural fix for F5's class, but it is a larger change. |
