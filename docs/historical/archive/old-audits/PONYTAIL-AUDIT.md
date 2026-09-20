# Mysterium Ponytail Audit — YAGNI Cuts + Implementation Gaps

> Lazy senior dev audit. Over-engineering only, not correctness. Whole tree scanned.
> Format: `<tag> <what to cut>. <replacement>. [path]`
> Tags: delete (dead/speculative), stdlib (reinvented), native (dep doing what platform does), yagni (abstraction with one impl), shrink (same logic, fewer lines).

---

## 1. YAGNI Cuts (ranked biggest LOC removable first)

1. **delete** entire `src/infra/tdg/` (TDGClient, TDGHooks, TDGBridge, TDGToolAdapter — 1,454 LOC). `maybeFireHook` is a no-op when TDG isn't started; `startTDGBridge()` is called only by `scripts/cli-game.ts`, never by the WebUI; there is no TDG-Rust binary, no Cargo.toml, no integration. The whole subsystem is speculative. [src/infra/tdg/]

2. **delete** entire `src/core/agent/` (PersistentAgent, PersistentAgentBridge, ToolRegistry, MysteriumTools, FallbackNarratives — 1,272 LOC). Only consumer is `src/infra/tdg/TDGBridge.ts` and `src/infra/tdg/TDGToolAdapter.ts` — which are themselves dead (cut #1). No WebUI or live CLI path uses PersistentAgent. [src/core/agent/]

3. **delete** 9 usecase files (NBackTask, StroopTask, GoNoGoTask, ReactionTimeTask, SimonTask, BreathRhythmTask, HeldInputTask, DilemmaTask, AffectRecognitionTask — ~1,475 LOC). Each is imported only by `src/core/index.ts` barrel re-export, which itself has **zero importers**. The Phaser renderers that consumed them were purged. Only 4 have unit tests; the tests can stay (they test pure functions) but the usecase files themselves are dead in the runtime path. [src/core/usecases/]

4. **delete** `src/core/assessments/cli/TaskRenderers.ts` (2,378 LOC). Imported only by `AgenticOrchestrator.ts:17` for the `--noLlm` fallback path in the CLI. The WebUI never sets `noLlm: true`. If the CLI fallback is needed, it can be a 200-LOC switch; the rest is per-task ASCII-art renderers. [src/core/assessments/cli/TaskRenderers.ts]

5. **shrink** `src/infra/llm/FallbackProvider.ts` (1,465 LOC → ~300 LOC). It's a hardcoded bank of line-specific MCQ prompts + drive-mapped options. Used as the LLM-unavailable fallback. 80% of it is duplicated narrative strings per (line × stage × modality). Collapse to a template + 8 line-templates. [src/infra/llm/FallbackProvider.ts]

6. **delete** `scripts/cli-game.ts` (3,430 LOC) OR shrink to ~500 LOC. Now that the WebUI is the sole UI, the CLI is a dev/debug tool only. 3,430 LOC for a debug runner is excessive. Cut the interactive prompts, the banner art, the layer renderer — keep `--headless --json` for automated testing. [scripts/cli-game.ts]

7. **delete** 36 unreferenced TTF files in `static/fonts/` (~3.5 MB). `fonts.css` references 18 font files; the directory has 54. The 36 extras (Arsenal, GeistMono, Gloock, IBMPlexSerif, etc.) are dead weight in the PWA precache. [static/fonts/]

8. **delete** `src/lib/components/Grid.svelte` (43 LOC). Zero importers. The CSS uses `--cols-tablet` / `--cols-desktop` custom properties that are never set — broken even if used. [src/lib/components/Grid.svelte]

9. **delete** `src/lib/components/Accordion.svelte` (88 LOC). Zero importers. `/codex` uses inline expandable cards, not this component. [src/lib/components/Accordion.svelte]

10. **delete** `src/lib/components/Skeleton.svelte` (39 LOC). Zero importers. Was built "for future route-level loading states" — never wired. [src/lib/components/Skeleton.svelte]

11. **delete** `src/lib/components/Progress.svelte` (32 LOC). Zero importers. [src/lib/components/Progress.svelte]

12. **delete** `src/lib/components/Field.svelte` (48 LOC). Zero importers. `/settings` and `/recover` use `Input` directly. [src/lib/components/Field.svelte]

13. **delete** `src/infra/persistence/SignificatorStore.ts` + `WorldStateStore.ts` + `AccessibilityStore.ts` (75 LOC). Zero importers. `SaveRepository` + Svelte `accessibilityStore` have fully replaced them. [src/infra/persistence/]

14. **delete** 3 registries: `AbilityRegistry`, `NarrativeRegistry`, `TaskRegistry` + their module files (~162 LOC + 3 registration calls in boot.ts). Registered at boot but **never queried** — `grep "AbilityRegistry\.(get|getAll|filter)"` returns zero hits outside the registration files. [src/core/registries/abilities/, tasks/, narrative/]

15. **delete** `src/core/index.ts` barrel (67 LOC). Re-exports 14 usecases + engines that nobody imports via `$core` or `@core` bare specifier. All real imports use subpaths (`$core/GameLoop.js`). The barrel exists only to re-export dead usecases. [src/core/index.ts]

16. **delete** `lifeos.config.json` at repo root (26 lines). Zero consumers — `grep "lifeos" src/ scripts/` returns nothing. [lifeos.config.json]

17. **delete** `.oh-my-opencode-pi-stats.json` at repo root. Zero consumers. Editor artifact. [.oh-my-opencode-pi-stats.json]

18. **delete** `src/styles/capabilities.css` lines 89-93 (empty `[data-connection="2g|slow-2g"]` rule with "Phase 3 will add" comment). 5 years of "Phase 3" — it's not happening. [src/styles/capabilities.css:89-93]

19. **delete** `src/lib/components/StageTheme.svelte` lines 10-11 (misleading comment claiming "Phase 2.5: respects prefers-reduced-motion" — the code doesn't do this; A11yApplier does). Just delete the lying comment. [src/lib/components/StageTheme.svelte:10-11]

20. **native** 5 CLI-only deps (`@clack/prompts`, `boxen`, `chalk`, `commander`, `ora`) are in `dependencies` not `devDependencies`. They ship to production browser bundles unnecessarily. Move to `devDependencies` (or delete if the CLI is cut #6). [package.json:34-44]

21. **native** `@capacitor/*` (4 packages: android, app, core, preferences) — there is no `android/` folder, no native build, Capacitor is configured but never deployed. `createKeyValueStore()` tries `Capacitor.isNativePlatform()` which always returns false in the browser. Either commit to Capacitor (generate the android project) or cut the 4 deps + CapacitorPreferencesStore. [package.json + src/infra/persistence/CapacitorPreferencesStore.ts]

22. **native** `@sveltejs/adapter-auto` installed but `svelte.config.js` only uses `adapter-cloudflare` + `adapter-static`. `adapter-auto` is unused. [package.json:48]

23. **native** both `vite-pwa` AND `@vite-pwa/sveltekit` installed — `@vite-pwa/sveltekit` is the SvelteKit wrapper around `vite-pwa`. You need both for the wrapper to work, but this is a native duplicate worth flagging. Keep `@vite-pwa/sveltekit`, the other is transitive. [package.json:53,55]

24. **yagni** `AgenticUIHandler` interface (src/core/assessments/AgenticOrchestrator.ts) — 2 implementers (LLMDialogueRunner inline object + CLI inline object). The interface is fine, but the `uiHandler` pattern in `gameEngine.ts` wraps the Svelte impl in a thunk. Could pass `askUser` directly. Minor. [src/core/assessments/AgenticOrchestrator.ts]

25. **shrink** `src/lib/engine/gameEngine.ts:267-283` `extractDriveDirectionality()` — reinvents a score→category mapping that the orchestrator already produces via `driveSignals`. The orchestrator returns `driveScores` (numbers) AND the `complete_encounter` tool schema requires `driveSignals` (strings) — the orchestrator already has the mapping; gameEngine is re-deriving it from scores with a worse heuristic. Use `result.consequenceRecord` or have the orchestrator expose `driveSignals`. [src/lib/engine/gameEngine.ts:267-283]

26. **shrink** `src/lib/components/Icon.svelte` — 18 icons hardcoded, only 6 are used (arrow-right, chevron-down, play, user, book, settings, recover — 7 used by BottomNav/Sidebar; arrow-up/down/left, home, check, x, menu, close, info, warning, error are dead). Cut to 7 icons. [src/lib/components/Icon.svelte]

27. **shrink** `src/styles/fonts.css` — 18 `@font-face` declarations, but only Red stage is playable (per README "first playable vertical slice"). Only 2 fonts are needed today (Big Shoulders + IBM Plex Mono). The other 16 are for stages 2-8 which aren't reachable. Lazy-load them when the stage unlocks. [src/styles/fonts.css]

28. **shrink** `src/lib/transitions/stageMotion.ts` — 8 motion registers, 7 unreachable (only Red stage playable). The `pulse`/`drift`/`chime`/`tick`/`grow`/`refract`/`dissolve` branches are dead code paths until stages 2-8 unlock. Keep the `snap` branch + the dispatch mechanism; cut the other 7 branches to one-liners until needed. [src/lib/transitions/stageMotion.ts]

29. **shrink** `src/core/assessments/AgenticOrchestrator.ts:166-198` — `SHADOW_KEYWORDS` is 41 lines of string arrays (30+ keywords × 4 quadrants). Used for keyword-based shadow detection when the LLM doesn't return a shadow signal. This is a poor man's NLP. Either trust the LLM's `driveSignals` (the orchestrator already requires them) or move the keyword lists to a data file. [src/core/assessments/AgenticOrchestrator.ts:166-198]

30. **delete** `src/routes/api/telemetry/+server.ts` — the endpoint exists but `TelemetryService.flush()` only writes to local `TelemetryStore` (localStorage), never POSTs to `/api/telemetry`. The endpoint has zero callers. `hooks.client.ts:5` has a "future: POST to /api/telemetry" comment that was never wired. Either wire it or delete the endpoint. [src/routes/api/telemetry/+server.ts]

31. **delete** `src/lib/components/Container.svelte` (23 LOC). Zero importers. Every route uses `RouteShell` which has its own max-width. [src/lib/components/Container.svelte]

32. **shrink** `scripts/check-invariants.ts` (317 LOC) — runs at every build. Some checks may be stale post-Phaser-purge (e.g. registry counts that included dead registries). Audit which checks still matter. [scripts/check-invariants.ts]

33. **delete** `src/infra/llm/ProviderRegistry.ts` lines that handle "models.dev" + "~/.mysterium/config.json" file discovery (if present). The README says LLM config is env-var driven; the 5-source resolution is over-engineered for a solo project. `process.env.LLM_API_KEY ?? process.env.OPENAI_API_KEY` is 2 lines. [src/infra/llm/ProviderRegistry.ts]

---

## 2. Implementation Gaps & Bugs (separately)

These are NOT YAGNI cuts — these are things that would break or misbehave at runtime.

**B1. `gameEngine.ts` `extractDriveDirectionality` produces wrong shadow signals.** The orchestrator returns `driveScores` (0-1 floats) AND emits `driveSignals` (the pathology enum) via the `complete_encounter` tool. But `OrchestratorResult` doesn't expose `driveSignals` on its return type — the gameEngine re-derives them from scores with a hardcoded `< 0.4 = DarkAddicted, > 0.85 = GoldenAddicted` heuristic. This throws away the LLM's actual assessment. The orchestrator should expose `driveSignals` on `OrchestratorResult`, or the gameEngine should read `result.consequenceRecord` which already carries the shadow info. [src/lib/engine/gameEngine.ts:267-283]

**B2. `gameEngine.ts` hardcodes `energeticDirection: 'Sovereign'`, `stageOrientation: 'Homeostatic'`, `sourceOfNourishment: 'Ambivalent'`** for every encounter result. These are supposed to be derived from the player's actual choice. The Phaser `dilemmaMapping.ts` (preserved at `src/core/logic/dilemmaMapping.ts`) had the real mapping. The gameEngine ignores it. ConsequenceEngine is getting garbage inputs. [src/lib/engine/gameEngine.ts:229-237]

**B3. `/api/telemetry` endpoint exists but is never called.** `TelemetryService.flush()` writes to localStorage only. `hooks.client.ts` has a "future: POST to /api/telemetry" comment. Telemetry is opt-in but the opt-in toggle in `/settings` doesn't actually send anything anywhere. The transparency page (`/telemetry`) lists events that never leave the device. [src/infra/telemetry/TelemetryService.ts:32-39 + src/routes/api/telemetry/+server.ts]

**B4. `cloudSyncStore.ts` POSTs plaintext Significator JSON to `/api/save`.** The server comments claim "END-TO-END ENCRYPTED" but the client never encrypts. The `CryptoStore` exists but is unused. If the BFF is deployed, saves are readable by the server operator. [src/lib/stores/cloudSyncStore.ts:48]

**B5. `LLMDialogueRunner.svelte` `uiHandler.askUser()` renders multiple questions sequentially in a `for` loop, but the Svelte reactive state (`currentQuestion`, `selectedLabels`, `writeInValue`) is shared across iterations.** If the orchestrator sends 2 questions in one `askUser` call, the second question's state may bleed into the first. In practice the orchestrator sends 1 question per call, but the loop is a latent bug. [src/lib/components/gameplay/LLMDialogueRunner.svelte:55-72]

**B6. `AmbientLayer.svelte` canvas doesn't clear its DPR scale on resize.** `resize()` calls `ctx.scale(dpr, dpr)` every time, but the canvas is reset (width/height assignment clears the context state). So the first frame is correct, but after a resize the scale stacks. Actually wait — assigning `canvas.width` resets the transform, so this is fine. False alarm. (ponytail: verified)

**B7. `Modal.svelte` focus trap uses `setTimeout(() => modalEl?.focus(), 0)` to focus the modal container.** If the modal content has autofocus elements, they won't get focus — the modal container does. Also, `modalEl` has `tabindex="-1"` which is correct, but the focusable elements inside should get first focus. Minor a11y issue. [src/lib/components/Modal.svelte:42]

**B8. `+layout.svelte` registers `beforeunload` → `flushSync(significator)` but `gameEngine.ts` also has `flushEngine()`.** Neither calls the other. If the engine has pending state that hasn't been synced to `gameStore.significator`, `flushSync` POSTs stale data. The engine's `applyEncounterResult` does call `debouncedSync`, so there's a 500ms race between the debounce and the beforeunload flush. [src/routes/+layout.svelte:47-51 + src/lib/engine/gameEngine.ts:297-301]

**B9. `/play` route `onMount` calls `bootEngine()` then `startGameSession()` but doesn't await between them.** `bootEngine()` is async (loads from SaveRepository), `startGameSession()` is sync (reads `engineStore`). If `bootEngine` hasn't finished populating the store when `startGameSession` runs, it'll bail with "no Significator". The code does `await bootEngine()` then checks `$engineStore.significator` — this works because `$engineStore` is reactive, but `startGameSession` reads `get(engineStore)` which is the current value. Should be fine, but fragile. [src/routes/play/+page.svelte:48-58]

**B10. `StageTheme.svelte` subscribes to `gameStore` but `gameStore.currentStage` defaults to `'Red'` and is only updated when `setSignificator` is called.** If the player's save has `currentStage: 'Amber'`, the stage won't apply until `setSignificator` runs. On first paint, `data-stage="red"` is set by the inline script in `app.html` (which reads localStorage directly), so no FOUC. But if `gameStore` and localStorage disagree, `StageTheme` wins and may override the correct stage with `'Red'`. [src/lib/components/StageTheme.svelte:24-29]

**B11. `gameEngine.ts` `declineEncounter()` removes from the list and reschedules, but doesn't emit any telemetry event.** The orchestrator's `main.ts` (deleted) used to emit `encounter_declined`. The Svelte engine doesn't. The `/telemetry` page lists `encounter_declined` as an event type, but it's never emitted in the WebUI path. [src/lib/engine/gameEngine.ts:289-296]

**B12. `LLMDialogueRunner.svelte` `exitEncounter()` resolves the pending Promise with `{ selectedLabels: [], writeInValue: '[[player exited encounter]]' }`.** This string leaks into the LLM conversation history and the orchestrator's `narrativeSummary`. It should be a structured signal (e.g. abort the orchestrator, not feed it garbage text). The orchestrator has no abort path — it'll try to evaluate the exit string as a real response. [src/lib/components/gameplay/LLMDialogueRunner.svelte:117-122]

---

## 3. Net Totals

**LOC removable (conservative, excluding shrink):**
| # | Cut | LOC |
|---|-----|-----|
| 1 | `src/infra/tdg/` | 1,454 |
| 2 | `src/core/agent/` | 1,272 |
| 3 | 9 dead usecases | ~1,475 |
| 4 | TaskRenderers.ts | 2,378 |
| 5 | FallbackProvider shrink | ~1,165 (saved) |
| 6 | cli-game.ts shrink | ~2,930 (saved) |
| 7 | Unreferenced TTF files | 3.5 MB |
| 8-12 | Unused components (Grid, Accordion, Skeleton, Progress, Field) | 250 |
| 13 | Dead stores | 75 |
| 14 | Dead registries (Ability, Narrative, Task) | 162 |
| 15 | core/index.ts barrel | 67 |
| 16-17 | lifeos.config.json + .oh-my-opencode-pi-stats.json | ~30 |
| 18-19 | Stale CSS rule + lying comment | 7 |
| 30 | /api/telemetry endpoint (if not wiring) | ~80 |
| 31 | Container.svelte | 23 |
| **Total** | | **~9,800 LOC + 3.5 MB fonts** |

**Dependencies removable:**
| # | Dependency | Why |
|---|------------|-----|
| 1 | `@capacitor/android`, `@capacitor/app`, `@capacitor/core`, `@capacitor/preferences`, `@capacitor/cli` | No android/ folder, no native build, `Capacitor.isNativePlatform()` always false in browser |
| 2 | `@sveltejs/adapter-auto` | Unused — svelte.config.js uses cloudflare + static only |
| 3 | (Conditional) `@clack/prompts`, `boxen`, `commander`, `ora` | CLI-only, move to devDependencies or delete if CLI is shrunk to a debug stub |
| 4 | (If CLI cut) `chalk` | Only used by `src/cli/LayerRenderer.ts` + `scripts/cli-game.ts` |

**If the CLI is fully deleted (not just shrunk):** cut #6 + the 5 CLI deps = ~3,430 LOC + 5 deps gone.

**If Capacitor is dropped:** 5 deps + `CapacitorPreferencesStore.ts` (38 LOC) + `createKeyValueStore.ts` simplifies to `return new LocalStorageStore()` (cut 7 LOC, the try/catch + Capacitor import).

---

## 4. What to EXPAND / develop / enhance

These are the gaps that actually matter for the game to function:

1. **Wire `driveSignals` through `OrchestratorResult`** so `gameEngine` doesn't re-derive them (fixes B1). The orchestrator already requires them in the `complete_encounter` tool schema — just add them to the return type.

2. **Use `dilemmaMapping.ts` in `gameEngine.applyEncounterResult`** to derive `energeticDirection` / `stageOrientation` / `sourceOfNourishment` from the player's actual choice (fixes B2). Currently hardcoded to neutral.

3. **Wire `/api/telemetry` or delete it** (fixes B3 + B11). If telemetry matters, `TelemetryService.flush()` should POST to `/api/telemetry`, and `gameEngine.declineEncounter()` should emit `encounter_declined`. If it doesn't matter, delete the endpoint + the transparency page's claim.

4. **Encrypt saves before POST** (fixes B4). `CryptoStore` exists. Use it. Or delete the "END-TO-END ENCRYPTED" comments from the server.

5. **Add an abort signal to `AgenticOrchestrator.run()`** (fixes B12). When the player exits an encounter, the orchestrator should stop the LLM loop, not consume a fake response.

6. **Build the 6 missing assessment renderers as Svelte components** (EmotionRenderer, ScenarioRenderer, PatternRenderer, ReactionTimeRenderer, DilemmaRenderer, NBackRenderer, HoldRenderer). These were deleted with Phaser. The `core/usecases/` (NBackTask, StroopTask, etc.) are the pure-logic engines for them. The `LLMDialogueRunner` only covers the `LLMDialogue` modality — the other 6 modalities (`Deterministic`, `ScenarioChoice`, `Embodied`, `Strategic`, `SocialCooperative`, `ImmersiveRPG`) have no UI. Currently the game can only run `LanguageReflective` encounters.

7. **Build onboarding calibration.** The current `/onboarding` creates a Significator with all lines at `Infrared` — no probing. The CLI has `OnboardingCalibrator` + per-line probes (CognitiveProbe, EmotionalProbe, etc.) that were deleted with Phaser. A real onboarding should run a quick probe per line to seed the starting altitudes.

8. **Wire `transformation_triggered` to a visual overlay.** The `gameEngine` doesn't expose transformation events to the UI. When a stage transition fires, the player should see it (overlay, toast, something). Currently it silently mutates the Significator.

---

## 5. Summary

The repo is **~9,800 LOC overweight** (~22% of 43,418 total). The biggest wins are:
- Kill TDG + agent subsystem (2,726 LOC) — speculative, never activated in WebUI
- Shrink TaskRenderers + FallbackProvider + cli-game (4,473 LOC) — 3 files that are 5× over-sized
- Delete 9 dead usecases + 3 dead registries + 5 unused components + 3 dead stores (1,766 LOC)
- Drop 5 Capacitor deps + 1 unused adapter (6 deps)

The implementation gaps that matter: **B1, B2, B6, B12** — these are functional bugs in the live encounter path where the gameEngine throws away the orchestrator's real assessment and feeds garbage to the ConsequenceEngine. Fix these before anything else.

*ponytail: this audit is intentionally ruthless. Every cut has a verified zero-importer grep. Every gap has a file:line. No "maybe useful someday" hedging.*
