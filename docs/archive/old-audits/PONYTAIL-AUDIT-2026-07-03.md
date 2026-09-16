# Mysterium Ponytail Audit — Over-Engineering Scan

> **Status:** canonical (audit artifact; per `docs/03-research-methodology.md` §0.5 active-refactor-methodology).
>
> **Scope:** Entire `src/` tree, scanned for over-engineering ONLY (not correctness). Correctness findings are in `AUDIT-HOLOOS-ALIGNMENT.md`.
>
> **Method:** Systematic read of the 6 largest files, all 8 onboarding probes, all 8 Phaser renderers, all persistence files, all registry modules, `keys.ts`/`textures.ts`/`config.ts`/`events.ts`, `LLMClient.ts`, `EventBus.ts`, `HolonRegistry.ts`, `ConceptDraftIndex.ts`. Every "is it dead?" claim cross-checked via Grep across `src/`/`scripts/`/`tests/`/`package.json` scripts.
>
> **Date:** 2026-07-03.

---

## Findings (ranked biggest cut first)

```
shrink 16 copy-paste renderer fns in TaskRenderers.ts (renderNBack, renderStroop, renderGoNoGo, renderHold, renderPatternPrediction, renderEmotionIdentification, renderDilemma, renderSelfReport, renderValueRanking, renderReactionTime, renderRhythm, renderCooperation, renderImitation, renderGeneric, +8 renderXProbe). One buildRenderer({question,header,options,evaluate}) factory + per-task data tables. [src/core/assessments/cli/TaskRenderers.ts]
shrink ~30 hand-authored LR_*_RED/SC_*_RED/EMB_*_RED/DET_*_RED const arrays + 6 LR_BY_LINE_* routing maps in FallbackProvider.ts. Single fallback-content.json keyed by `${modality}:${line}:${stage}` + 20-LOC loader. [src/infra/llm/FallbackProvider.ts]
shrink 8 onboarding probe classes (Cognitive/Emotional/Moral/Intrapersonal/Spiritual/Somatic/Willpower/Interpersonal) duplicating scene/onComplete/container/results/staircase/start/runTrial/finish/destroy scaffolding. Abstract BaseProbe with template method presentTrial() + 8 thin subclasses. [src/game/onboarding/probes/]
shrink 8 Phaser renderer classes (Dilemma/Hold/Pattern/NBack/Emotion/Scenario/ReactionTime/LLMDialogue) duplicating (scene,task,onComplete) ctor + create/destroy/container/addButton lifecycle. Abstract BasePhaserRenderer with createContainer/addButton/cleanup helpers. [src/game/assessments/renderers/]
shrink 27 tiny registry module files (lines/01-cognitive.module.ts etc., 8 lines + 8 stages + 7 rays + 4 drives) each wrapping one Registry.register(key,{literal}) call, + boot.ts's 27 manual register() invocations. Single registries/data.ts with literal tables + bootRegistries() that iterates them. [src/core/registries/{lines,stages,rays,drives}/, src/core/registries/boot.ts]
shrink computeWeightBias(theme) and parameteriseArc(theme) — two 9-case switch statements returning literal config objects. Two Record<SessionTheme, ...> lookup tables. [src/core/engines/AutoModeStrategy.ts]
shrink evaluateResponse + queryLLM + queryLLMWithTools — 3 fns duplicating env-var lookup, anthropic-vs-openai branching, fetchWithTimeout, error-fallback. One callLLM({systemPrompt,messages,tools,json}) + thin wrappers. [src/infra/llm/LLMClient.ts]
delete src/infra/native/cliAgentLoop.ts (193 LOC) — never imported in src/scripts/tests, not in any npm script, superseded by scripts/cli-game.ts. DONE 2026-07-03. [src/infra/native/cliAgentLoop.ts]
delete src/game/objects/ProjectilePool.ts (41 LOC) — never imported anywhere (only mentioned in MVP-BLUEPRINT.md as "(exists)"). DONE 2026-07-03. [src/game/objects/ProjectilePool.ts]
delete src/game/systems/ConsequenceNarrator.ts (43 LOC) — KEPT (still used as fallback in EncounterScene after QualitativeFeedback wiring).
delete src/core/usecases/RandomSource.ts (24 LOC) — KEPT (mulberry32 used in 4 test files for seeded RNG).
delete src/infra/persistence/SignificatorStore.ts (26 LOC) — KEPT (test-only but tests depend on it; refactor would break PhaseB test).
delete src/infra/persistence/WorldStateStore.ts (26 LOC) — KEPT (test-only but tests depend on it; refactor would break PhaseB test).
shrink 4 near-identical JsonStore wrappers (SignificatorStore/WorldStateStore/TelemetryStore/AccessibilityStore) each doing JSON.stringify→kv.set / kv.get→JSON.parse. One generic jsonStore<T>(kv,key) factory + 4 one-line instantiations. [src/infra/persistence/]
shrink SaveRepository.ts's 6 CLI file-based functions (loadSave/saveGame/hasSave/deleteSave/loadWorldState/saveWorldState/deleteWorldSave, ~80 LOC) duplicating the async SaveRepository class via fs. Implement a FilesystemStore KeyValueStore adapter and reuse the class. [src/infra/persistence/SaveRepository.ts]
shrink AgenticOrchestrator's parallel detectShadowKeywords() + detectWriteInShadow() iterating the same SHADOW_KEYWORDS table with duplicated quadrant/drive/polarity mappings, + buildContinuityContext()/buildBriefHistory() both slicing history.slice(-3). Single SHADOW_MAP table with {quadrant,drive,polarity,intensityBase,intensityRange} + one detector; merge history methods. [src/core/assessments/AgenticOrchestrator.ts]
yagni HolonRegistry.ts — 6 of 8 exported fns are test-only (queryByKind/queryByAltitude/queryByNarrativeRole/addHolon/removeHolon/createRegistry unused at runtime); only getHolon + queryByLine called (both from ContextPipeline). Keep 2 helpers, delete the other 6 (requires test refactor). [src/core/data/HolonRegistry.ts]
yagni ConceptDraftIndex.ts — queryByModality() and allModuleKeys() dead (only queryByLineStage used). Delete 2 dead fns. [src/core/data/ConceptDraftIndex.ts]
delete GameEvents.Pause, GameEvents.Resume, TextureKeys.RuneAtlas in keys.ts — never referenced anywhere except the `void TextureKeys.RuneAtlas;` linter-suppression no-op in UIOverlayScene.ts:470. DONE 2026-07-03 (deleted 3 constants + the void statement + the now-unused TextureKeys import). [src/game/keys.ts, src/game/scenes/UIOverlayScene.ts]
shrink ProfileUpdater.ts — file was 14 LOC containing only driveForLine() (used by ShadowContentGenerator). Mis-named vestige of deleted A13 code. DONE 2026-07-03: moved driveForLine() into domain/Drive.ts (with HS-12 fix — Agape now reachable via Spiritual/Interpersonal) and deleted the file. [src/core/usecases/ProfileUpdater.ts]
delete tsc-alias devDependency — declared in package.json but never invoked in any npm script or tsup.config.ts (build:cli is just `tsup`, and tsup's noExternal:[/(.*)/] handles path aliases natively). DONE 2026-07-03. [package.json]
shrink DilemmaRenderer.ts unsafe `(this as unknown as Record<string,unknown>)._choiceResponseTime` casts (lines 301-302, 309-310) stashing timing state on `this` to avoid declaring fields. Declare 2 private fields. [src/game/assessments/renderers/DilemmaRenderer.ts]
shrink TaskRenderers.ts local shuffle() + repeated options.find(o=>answer.toLowerCase().includes(o.label.toLowerCase())) pattern (inlined in every renderer). One matchOption(answer,options) helper + import shuffle from a shared util. [src/core/assessments/cli/TaskRenderers.ts]
```

**Net: ~4400 lines, 1 dependency removable.**

**Executed on 2026-07-03 (this commit):**
- Deleted `src/infra/native/cliAgentLoop.ts` (193 LOC)
- Deleted `src/game/objects/ProjectilePool.ts` (41 LOC) + empty `src/game/objects/` directory
- Deleted `TextureKeys.RuneAtlas`, `GameEvents.Pause`, `GameEvents.Resume` from `src/game/keys.ts`
- Deleted `void TextureKeys.RuneAtlas;` no-op + unused `TextureKeys` import from `src/game/scenes/UIOverlayScene.ts`
- Deleted `src/core/usecases/ProfileUpdater.ts` (14 LOC); moved `driveForLine()` to `src/core/domain/Drive.ts` with HS-12 fix (Agape now reachable)
- Removed `tsc-alias` from `package.json` devDependencies
- Removed `ProfileUpdater` barrel export from `src/core/index.ts`

**Total executed: ~250 LOC + 1 dependency removed. Zero test regressions (448/448 pass).**

**Remaining (deferred — multi-day refactors):**
- TaskRenderers.ts factory consolidation (~1500 LOC → ~800): needs careful per-task data-table extraction
- FallbackProvider.ts JSON data extraction (~800 LOC → ~200): needs JSON schema design
- BaseProbe abstraction for 8 onboarding probes (~600 LOC savings): needs template-method design
- BasePhaserRenderer abstraction for 8 renderers (~400 LOC savings): needs lifecycle hook design
- 27 registry module files → single data.ts (~400 LOC savings): needs boot refactor
- AutoModeStrategy switch → lookup tables (~80 LOC savings)
- LLMClient 3-fn consolidation (~100 LOC savings)
- AgenticOrchestrator shadow-map consolidation (~80 LOC savings)
- SaveRepository FilesystemStore adapter (~80 LOC savings)
- DilemmaRenderer private-field declaration (~10 LOC savings)

**Estimated total remaining: ~4000 LOC removable across ~9 multi-day refactors.**

---

## Notes on what was NOT flagged (and why)

- **`EventBus.ts`** — looks like a `stdlib` reinvention of Node's `EventEmitter`, but it preserves `GameEventMap` typing on event names/handlers and Node's `events` module isn't available in the Phaser browser bundle. Typed wrapper, kept.
- **`boxen` / `chalk` / `ora` / `commander` / `@clack/prompts`** — only imported in `scripts/cli-game.ts` (not `src/`), but `scripts/cli-game.ts` IS the bundled CLI entry per `tsup.config.ts`. Legitimate runtime deps. Kept.
- **`jsdom`** — used by exactly one test file's `@vitest-environment jsdom` pragma. Legitimate devDep. Kept.
- **`tsup`** — used by `build:cli` script and `tsup.config.ts`. Kept.
- **Capacitor packages** — wrapped by `NativeBridge` (live in `main.ts`) and `CapacitorPreferencesStore` (live via `createKeyValueStore`). Kept.
- **`GameLoop.ts`, `SessionAgent.ts`, `EcologicalTracker.ts`** — all wired into runtime. Not flagged.
- **`RandomSource.ts`** — `mulberry32()` and `hashSeed()` used in 4 test files for seeded RNG. Kept.
- **`ConsequenceNarrator.ts`** — still used as fallback in `EncounterScene` after QualitativeFeedback wiring. Kept.
- **`SignificatorStore.ts` / `WorldStateStore.ts`** — test-only but `PhaseB.test.ts` depends on them. Refactor would break tests. Kept (flagged for test refactor).

---

**End of ponytail audit.**
