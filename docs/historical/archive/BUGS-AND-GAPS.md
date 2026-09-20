# Mysterium ↔ TDG-Rust Integration — Bugs & Gaps Audit

> **Date:** 2026-07-04 (updated)
> **Status:** Living document. Update as bugs are fixed and new gaps are found.

This document tracks bugs and implementation gaps discovered during end-to-end
testing of the Mysterium ↔ TDG-Rust integration. Each entry includes: severity,
status (fixed / open / wontfix), file:line references, and a fix description.

---

## Summary

| Severity | Total | Fixed | Open |
|---|---|---|---|
| Critical | 3 | 3 | 0 |
| High | 4 | 4 | 0 |
| Medium | 5 | 5 | 0 |
| Low | 5 | 4 | 1 |

**Test counts:** 662 pass + 7 pre-existing environmental failures + 11 E2E
integration tests (run with `Mysterium_E2E_TDG=1`) + 8 GameLoop TDG feedback tests.

---

## Critical (fixed)

### C1. TDGClient passed `--stdio` arg the binary doesn't accept
- **File:** `src/infra/tdg/TDGClient.ts:82`
- **Symptom:** `tdg-rust serve --stdio` exits immediately with
  `error: unexpected argument '--stdio' found`. The MCP handshake then hangs
  for 30s until our request timeout fires.
- **Fix:** Removed `--stdio`. Per `tdg-rust serve --help`, the `serve`
  subcommand defaults to port 3000 which IS stdio mode.
- **Status:** ✅ Fixed

### C2. TDGClient didn't set LD_LIBRARY_PATH for libonnxruntime
- **File:** `src/infra/tdg/TDGClient.ts:82-94`
- **Symptom:** `error while loading shared libraries: libonnxruntime.so.1:
  cannot open shared object file`. The binary is dynamically linked against
  ONNX Runtime, which the install script places in `~/.hermes/tdg-rust/lib/`.
  Without LD_LIBRARY_PATH, the binary can't start.
- **Fix:** Spawn now injects `LD_LIBRARY_PATH=<libdir>:$LD_LIBRARY_PATH` so
  the dynamic linker finds libonnxruntime. Mirrors the env the install script
  uses (its own `init_database` step has the same bug — it doesn't set
  LD_LIBRARY_PATH either, so we work around it in `install.sh`).
- **Status:** ✅ Fixed

### C3. TDGToolAdapter returned the raw MCP content ARRAY instead of a string
- **File:** `src/infra/tdg/TDGToolAdapter.ts:55-61` (original)
- **Symptom:** The handler did `return (result as { content: string }).content`
  but `content` is actually `[{type:"text", text:"..."}]` (an array of
  content blocks), not a string. The cast suppressed the TS error. At runtime,
  the array got pushed into `AgentMessage.content` (typed `string | null`),
  corrupting the agent's message history and breaking the next LLM API request.
- **Fix:** Added `extractMCPContent()` helper that iterates the content array
  and concatenates all `text` blocks into a single string. Also handles
  `isError: true` by returning `{error: ...}` JSON.
- **Regression test:** `tests/agent/AgenticArchitecture.test.ts` →
  "TDGToolAdapter MCP envelope handling (regression for bug #3)" (4 tests)
- **Status:** ✅ Fixed

---

## High (fixed)

### H1. TDGHooks used invented parameter names (snake_case mismatch)
- **Files:** `src/infra/tdg/TDGHooks.ts` (all 6 hooks)
- **Symptom:** Every hook called tdg_create/tdg_connect/etc. with camelCase
  names (`kind`, `properties`, `source`, `target`, `edgeType`, `nodeId`)
  that the actual TDG-Rust binary rejects. The binary uses snake_case:
  `node_type`, `text`, `name`, `source_id`, `target_id`, `edge_type`,
  `node_id`. All hook calls silently failed (caught + swallowed).
- **Fix:** Rewrote all 6 hooks with correct snake_case parameter names.
  Verified against the real binary's `tools/list` response.
- **Status:** ✅ Fixed

### H2. TDGHooks parsed MCP responses with wrong shape
- **File:** `src/infra/tdg/TDGHooks.ts:265,283,303,321` (original)
- **Symptom:** Hooks did `JSON.parse(result.content)` assuming `content`
  was a JSON string. But the actual MCP envelope is
  `{content:[{type:"text", text:"<json>"}]}` — `content` is an array.
  `JSON.parse(array)` coerces to `JSON.parse("[object Object]")` → SyntaxError
  → caught + swallowed → returned null every time.
- **Fix:** Added `parseContent()` helper that extracts the text from the
  content array and parses it. Used by all 4 TDG→Mysterium hooks.
- **Status:** ✅ Fixed

### H3. getHealth didn't handle computed=false
- **File:** `src/infra/tdg/TDGHooks.ts:356-385`
- **Symptom:** tdg_health returns `{computed:false, message:"Health not yet
  computed. A recompute job has been enqueued."}` on first call. The original
  code parsed `gz/pz/total` from this (all undefined) and returned
  `{gz:0, pz:0, total:0}` — misleading callers into thinking health was
  computed and was zero.
- **Fix:** Now checks `computed` first. If false, ticks the lesser cycle
  (which triggers metabolism) and re-queries with `force_recompute: true`.
  If still not ready, returns null (callers fall back to baseline).
- **Status:** ✅ Fixed

### H4. getTransformationPressure used wrong field name
- **File:** `src/infra/tdg/TDGHooks.ts:415-438`
- **Symptom:** Looked for `parsed.pressure` and `parsed.readiness`. The
  actual tdg_greater_cycle response uses `transformation_pressure` and
  `readiness.total`.
- **Fix:** Now reads `transformation_pressure` first, falls back to
  `readiness.total`.
- **Status:** ✅ Fixed

---

## Medium

### M1. `--agent` flag silently ignored in Direct Questioning mode
- **File:** `scripts/cli-game.ts:1348-1358`
- **Symptom:** In headless/JSON mode (or when the user picks Direct
  Questioning), `runDirectQuestioningSession()` returns before the
  PersistentAgent is instantiated. The `--agent` flag was silently ignored.
- **Fix:** Added a warning when `--agent` is passed but Direct Questioning
  mode is active: "To use the Persistent Developmental Agent, choose
  Story-Driven mode."
- **Future work:** Wire the PersistentAgent into the Direct Questioning flow
  (or auto-switch to Story mode when `--agent` is passed).
- **Status:** ✅ Warning added; full wiring is a future task

### M2. effectiveEncounter mismatch in applyResponseOnly
- **File:** `scripts/cli-game.ts:1565-1591`
- **Symptom:** When the PersistentAgent calls `mysterium_select_encounter` with a
  different moduleRef, the bridge uses the agent's pick for
  `processOutcome`/`applyConsequences` (correct), but cli-game.ts passed
  the original scheduler pick to `applyResponseOnly`. This updated the wrong
  (line, stage) cell in UserMatrixModel and fired shadow knot resolution on
  the wrong `executionMode`.
- **Fix:** The bridge now returns `effectiveEncounter`. cli-game.ts uses it
  for `applyResponseOnly` when the PersistentAgent path is active.
- **Status:** ✅ Fixed

### M3. tdg_greater_cycle may default to advancing the cycle
- **File:** `src/infra/tdg/TDGHooks.ts:194-203`
- **Symptom:** onTransformation called tdg_greater_cycle without `tick`,
  which could default to `tick=true` (advancing the cycle) instead of just
  querying.
- **Fix:** Now explicitly passes `tick: false` to query without advancing.
- **Status:** ✅ Fixed

### M4. TDG→Mysterium feedback hooks never invoked from production
- **Files:** `src/core/engines/CCIEngine.ts:822`, `src/core/GameLoop.ts`
- **Symptom:** `runReflection`, `getNewEdges`, `getTransformationPressure`
  are defined but never called from the live game loop. `computeCCIWithTDG`
  exists but `GameLoop.startSession` still uses sync `computeCCI`. The entire
  TDG→Mysterium feedback direction is dead code in the current runtime.
- **Fix:** Added `startSessionWithTDG()` (async) that augments baseline CCI
  with TDG G_z/P_z + runs graph-level reflection to annotate the session
  strategy. Added `getTDGTransformationPressure()` helper. Wired both into
  cli-game.ts via the `--agent` flag: `startSessionWithTDG` runs at session
  start, `getTDGTransformationPressure` fires after each encounter (emits
  `tdg_pressure` telemetry event). Both no-op when TDG is absent — zero
  regression.
- **Regression tests:** `tests/agent/GameLoopTDGFeedback.test.ts` (8 tests)
- **Status:** ✅ Fixed

### M5. PersistentAgent re-registers all 15 tools as source='tdg'
- **File:** `src/core/agent/PersistentAgent.ts:72-92`
- **Symptom:** `config.tdgToolRegistry` is the unified registry (8 Mysterium + 7
  TDG). The loop re-registers all 15 with `source: 'tdg'`, overwriting the 8
  Mysterium tools' source label. `getDefinitionsBySource('mysterium')` returns 0.
- **Fix:** Constructor now skips any tool name the Mysterium registry already has
  (`if (this.registry.has(name)) continue;`). Only genuinely-new TDG tools
  get registered with `source: 'tdg'`, preserving correct source attribution.
- **Regression tests:** `tests/agent/AgenticArchitecture.test.ts` →
  "PersistentAgent source attribution (regression for M5)" (1 test)
- **Status:** ✅ Fixed

---

## Low

### L1. Pending requests hung on process exit
- **File:** `src/infra/tdg/TDGClient.ts:110-113, 121-127` (original)
- **Symptom:** The `exit` and `error` handlers nulled `this.process` but
  never rejected `pendingRequests`. In-flight requests hung for 30s.
- **Fix:** Added `rejectAllPending()` helper, called from `exit`, `error`,
  and `stop()`.
- **Status:** ✅ Fixed

### L2. 30s timeout timer never cleared
- **File:** `src/infra/tdg/TDGClient.ts:194-199` (original)
- **Symptom:** `setTimeout` was never `clearTimeout`'d when the response
  arrived. Each request leaked a timer + closure refs for 30s.
- **Fix:** Store the timeout handle in the pending request entry,
  `clearTimeout` it when the response arrives.
- **Status:** ✅ Fixed

### L3. All stderr silently discarded
- **File:** `src/infra/tdg/TDGClient.ts:101-111`
- **Symptom:** `void data;` — TDG-Rust crash diagnostics, libonnxruntime
  load errors, and MCP protocol warnings are invisible. Makes debugging
  impossible when hooks silently fail.
- **Fix:** stderr now routes to `console.debug` when `Mysterium_VERBOSE_TDG=1`
  or `Mysterium_VERBOSE=1` is set. Otherwise discarded (to avoid spamming the
  player's console with TDG internals). Use `Mysterium_VERBOSE_TDG=1 mysterium ...`
  to debug hook failures.
- **Status:** ✅ Fixed

### L4. PersistentAgent ctx.sessionState frozen at creation
- **File:** `src/core/agent/PersistentAgent.ts:68,130-132` + `scripts/cli-game.ts:1602-1616`
- **Symptom:** `sessionState.encountersSoFar` is set to 0 at agent creation
  and never updated between encounters. `mysterium_get_encounter_pool` always
  sees `encountersSoFar: 0` and `recentLines: []`, which can skew scheduler
  ranking.
- **Fix:** `sessionState` is now mutable (not `readonly`). Added
  `updateSessionState()` method. CLI calls it after each encounter with
  updated `encountersSoFar` + `recentLines` (last 5 lines) + `weightBias`.
- **Regression tests:** `tests/agent/AgenticArchitecture.test.ts` →
  "PersistentAgent.updateSessionState (regression for L4)" (1 test)
- **Status:** ✅ Fixed

### L5. mysterium_get_encounter_pool ignores session-strategy weights
- **File:** `src/core/agent/tools/MysteriumTools.ts:22-23,213-218,328-354`
- **Symptom:** Uses `DEFAULT_WEIGHTS` instead of the session strategy's
  biased weights. The agent sees a different ranking than the scheduler
  used to pick the original encounter.
- **Fix:** `ToolContext.sessionState` now has an optional `weightBias` field.
  When provided, `mysterium_get_encounter_pool` applies it via
  `applyWeightBias(DEFAULT_WEIGHTS, weightBias)`. CLI passes the session
  strategy's `weightBias` through `updateSessionState()`. Falls back to
  `DEFAULT_WEIGHTS` when absent (legacy behaviour).
- **Regression tests:** `tests/agent/AgenticArchitecture.test.ts` →
  "mysterium_get_encounter_pool weightBias (regression for L5)" (1 test)
- **Status:** ✅ Fixed

---

## Install-script bugs (in TDG-Rust's own install.sh, not Mysterium)

### I1. TDG-Rust install.sh requires Hermes Agent pre-installed
- **Symptom:** `err "HERMES_HOME not found"`, `err "Install Hermes Agent
  first"`. The install script aborts if `~/.hermes` doesn't exist.
- **Workaround:** Mysterium's `install.sh` creates `~/.hermes` before running
  the TDG installer. Mysterium only needs the binary + DB, not the full Hermes
  gateway.
- **Status:** ✅ Worked around in Mysterium install.sh

### I2. TDG-Rust install.sh init_database fails on LD_LIBRARY_PATH
- **Symptom:** The install script's `init_database()` calls
  `"$tdg_dir/tdg-rust" init` without setting LD_LIBRARY_PATH, so the binary
  fails to load libonnxruntime. The install script still exits 0 (its
  `set -e` doesn't catch the failure inside the pipe).
- **Workaround:** Mysterium's `install.sh` initializes the DB itself with the
  correct env, after running the TDG installer.
- **Status:** ✅ Worked around in Mysterium install.sh (upstream bug — should
  be filed against tdg-rust)

---

## How to run the E2E integration test

```bash
# Install everything (Mysterium + TDG-Rust)
bash install.sh

# Run the E2E suite (spawns the real TDG-Rust binary)
LD_LIBRARY_PATH=~/.hermes/tdg-rust/lib Mysterium_E2E_TDG=1 \
  npx vitest run tests/integration/TDGRustE2E.test.ts

# Or via bun (faster):
LD_LIBRARY_PATH=~/.hermes/tdg-rust/lib Mysterium_E2E_TDG=1 \
  bun test tests/integration/TDGRustE2E.test.ts
```

Without `Mysterium_E2E_TDG=1`, the E2E suite skips (1 always-on metadata test
reports install status). This keeps the default `bun test` run fast and
hermetic.

---

## How to verify the install works

```bash
# 1. Run the install script
bash install.sh

# 2. Verify the TDG probe
LD_LIBRARY_PATH=~/.hermes/tdg-rust/lib npx tsx scripts/tdg-probe.ts

# 3. Run a headless CLI session
npx tsx scripts/cli-game.ts session --headless --no-llm --encounters=1 --json

# 4. Run the --agent flag (Story mode only — Direct mode warns)
npx tsx scripts/cli-game.ts session --agent  # interactive, pick Story-Driven
```
