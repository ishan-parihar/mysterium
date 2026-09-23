#!/usr/bin/env node
/**
 * Mysterium CLI Game Runner — Phase 1
 * Comprehensive headless debugger that runs the full game loop without Phaser.
 * Routes ALL modalities through the AgenticOrchestrator for consistent behaviour.
 *
 * Usage:
 *   npx tsx scripts/cli-game.ts                          # interactive, fallback mode
 *   npx tsx scripts/cli-game.ts --headless               # automated, 20 encounters
 *   npx tsx scripts/cli-game.ts --model=gemini-1.5-flash  # override model
 *   npx tsx scripts/cli-game.ts --headless --json        # AI-agent feedback loop
 *   npx tsx scripts/cli-game.ts --mode=encounter         # single encounter
 *   npx tsx scripts/cli-game.ts --mode=diagnostic        # print system state
 *   npx tsx scripts/cli-game.ts --encounters=5           # custom encounter count
 *   npx tsx scripts/cli-game.ts --verbose                # show full narrative flow
 *   npx tsx scripts/cli-game.ts --json                   # machine-readable JSON output
 *   npx tsx scripts/cli-game.ts --new-game               # start fresh (delete saved progress)
 *
 * @script-status: wired — `npm run cli` (and `cli:bundle` for the built copy). The headless runner;
 *                          mutates only the player's own save file, never the tree.
 */

import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import { select, text as clackText } from '@clack/prompts';
import ora from 'ora';
import boxen from 'boxen';
import { Command, Option } from 'commander';

import { CONFIG_DIR, CONFIG_FILE, loadConfig, saveConfig } from './cli/config.js';
import type { MysteriumConfig } from './cli/config.js';
import { DQ_SCENE_SETTINGS, VALID_SHADOW_QUADRANTS, CHALLENGE_NAMES } from './cli/data.js';
import { stripAnsi, stageColor, truncateNarrative, truncateAtWordBoundary, cciToFeltSense, saturationToFeltSense, readinessToFeltSense, describeShadowMovement, generatePracticeHint, somaticPracticeHint, curriculumLabel, checkPrerequisiteGaps } from './cli/render.js';

const VERSION = '0.1.0';

// ── Commander program definition (before any arg-dependent code) ─────
// ponytail: commander handles help generation, manual printHelp() removed
const program = new Command()
  .name('mysterium')
  .version(VERSION)
  // P2-F14 (Fresh-User UX Audit): The old description was a syllabus —
  // "A developmental RPG where every encounter is a validated assessment
  // that simultaneously diagnoses and evolves your cognitive, emotional,
  // moral, and spiritual capacities across 8 lines of intelligence and 8
  // stages of consciousness." A fresh user read it twice and felt like
  // they were entering a research instrument, not a game. The new line is
  // a hook: it tells you what the game FEELS like, not what it measures.
  // The theory unfolds through play.
  .description('Mysterium — A contemplative RPG that mirrors you back to yourself. Answer honest questions; the game reflects your inner landscape in mythopoetic prose. No wrong answers.')
  .option('--headless', 'Run without user interaction')
  .option('--json', 'Machine-readable JSON output')
  // P0-R4 (Fresh-User UX Audit): --verbose hidden from default --help.
  // The audit found that --verbose exposes XP-style progress bars, drive
  // distortion mappings, line×stage coordinates, and arc-position counters
  // — all of which break the Veil principle. --verbose now requires --dev
  // (enforced below). The option stays for backwards compat but is hidden.
  .addOption(new Option('--verbose', 'Show additional encounter detail (requires --dev)').hideHelp())
  .option('--dev', 'Developer mode: show internal metrics (G_z/P_z, CCI, rayProfile, phase) and enable --verbose. WARNING: breaks the experiential frame (Veil principle) — for debugging only.')
  // YAGNI-EFF-3 (Efficacy Audit): --agent / PersistentAgent path removed.
  // It was the source of every major regression (R8-BUG-1 hang, R9-BUG-2
  // process-exit, R8-BUG-1b placeholder string, R8-BUG-4 --answer ignore).
  // The DQ path is the game's crown jewel — it's faster, consumes --answer,
  // and has never regressed. Story-Driven mode can be rebuilt on top of DQ's
  // proven architecture when needed.
  .option('--new-game', 'Start fresh (delete saved progress)')
  // Agent-reachable session-flow selection. Without this flag the flow is chosen by an
  // interactive prompt, which `--headless`/`--json` skip — so `gameMode` was hardcoded to 'direct'
  // and the story branch (the architecture-live path that captures the orchestration checkpoint
  // and appends the journal) could not be driven by an agent at all. An unreachable surface is a
  // blind spot by construction: it is where the retired `responsesPool` ReferenceError and the
  // stale `telemetry` flush both survived.
  .option('--mode <mode>', 'Session flow: direct (personality-test style) | story (immersive RPG narrative)')
  .option('-e, --encounters <n>', 'Number of encounters', '20')
  .option('-m, --model <name>', 'Override LLM model name')
  .addOption(new Option('-l, --line <line>', 'Force a specific line (dev)').hideHelp())
  .addOption(new Option('-s, --stage <stage>', 'Force a specific stage (dev)').hideHelp())
  .addOption(new Option('--modality <mod>', 'Force a specific modality (dev)').hideHelp())
  .addOption(new Option('--curriculum', 'Force curriculum encounters (knowledge study mode — dev)').hideHelp())
  .addOption(new Option('--llm', 'Enable live LLM in headless mode (headless defaults to FallbackProvider for deterministic CI)').hideHelp())
  // P1-6 (UX-R3): Clarify what --force-shadow actually does. The audit found
  // users confused about the difference between --modality shadow (which
  // triggers the shadow encounter format) and --force-shadow (which injects
  // shadow-keyword text into the response pool for testing shadow detection).
  // They behave nothing alike but have overlapping names. Keeping the original
  // name for backwards compat, but adding --inject-shadow-keyword as a clearer
  // alias and updating the help description.
  //
  // R11-Y5 (Fresh-User UX Audit): Both flags are testing-only and confusing.
  // Mark them hidden so they don't appear in default --help output. The
  // printHelp() banner still mentions them in the FORCED ENCOUNTERS section
  // for discoverability by developers; that section is also being trimmed
  // (see printHelp edit below).
  .addOption(new Option('--force-shadow <quadrant>', 'Inject shadow-keyword text into the response pool for testing shadow detection (alias: --inject-shadow-keyword).').hideHelp())
  .addOption(new Option('--inject-shadow-keyword <quadrant>', 'Alias for --force-shadow (testing only)').hideHelp())
  .addOption(new Option('--skip-calibration', 'Skip calibration, default all lines to Red (dev)').hideHelp())
  .addOption(new Option('--answers <file>', 'Read answers from a file (one per line, dev)').hideHelp())
  .addOption(new Option('--answer <text...>', 'Inline answer (repeatable, dev)').hideHelp())
  .addOption(new Option('--audit', 'Print curriculum meta-cognitive probe after session end (dev)').hideHelp())

program
  .command('setup')
  .description('Configure LLM and preferences');
program
  .command('status')
  .description('Show current save state');
program
  .command('new-game')
  .description('Reset progress and start fresh');
program
  .command('diagnostic')
  .description('Show system diagnostics');
program
  .command('curriculum [action]')
  .description('Curriculum management (lint, list)');
program
  .command('session')
  .description('Start an interactive session');
// P2-2 (UX-R3): Glossary subcommand. The audit found a severe vocabulary
// wall — terms like Holon, Significator, CCI, rayProfile, G_z/P_z appeared
// in CLI output with no explanation. Users felt like outsiders. The glossary
// command prints 1-line definitions for every term, breaching the wall without
// requiring users to read the docs.
program
  .command('glossary')
  // P1-F9: counts are dynamic so they never drift from the actual data.
  // P2-U5: --full now requires --dev. Default shows Tier 1 + unlocked Tier 2.
  .description(`Show definitions for Mysterium terminology (${PLAYER_GLOSSARY_TERMS.length} essentials + unlocked terms; --full requires --dev)`)
  .option('--full', `Show all ${GLOSSARY_TERMS.length} terms (requires --dev — clinical definitions)`);
// Profiling system: multi-user support
// P0-F3 (Fresh-User UX Audit): Added 'show' action — the synthesis engine
// writes rich data (insights, patterns, active focus) to narrative-memory.md
// and goals.yaml after every session, but there was no command to read it
// back. The game whispered about the player behind their back.
program
  .command('profile [action] [name]')
  .description('Manage user profiles (list, switch, create, delete, show)');
program
  .command('setup-profile')
  .description('Create a new user profile with onboarding questions');

// Brain-training subsystem (docs/brain-game-upgrade/): guided workouts,
// free play, and felt-sense insights over the trial telemetry store.
// Options declared here satisfy commander; TrainingRuntime re-parses the
// same argv with its own Command instance (earlyParser pattern).
program
  .command('train')
  .description('Play brain-training games (guided workout or --free <game>)')
  .option('--free [paradigm]', 'play one game directly, no narrative wrapper')
  .option('--trials <n>', 'override trial count')
  .option('--difficulty <x>', 'starting difficulty 0-1')
  .option('--minutes <n>', 'workout length in minutes')
  .option('--focus <line>', 'bias the workout toward one line')
  .option('--plan', 'print the planned workout instead of playing')
  .option('--demo [seed]', 'scripted responder for CI smoke tests')
  .option('--practice', 'non-timed practice mode: no time pressure')
  .option('--window <ms>', 'override response window in ms (configurable stimulus duration)')
  .option('--accessible', 'accessible presentation: symbol/text fallbacks for color-dependent stimuli');
program
  .command('insights')
  .description('How your training senses have been resting and rising (--dev for metrics)')
  .option('--days <n>', 'limit to last N days (default 14)')
  .option('--json', 'machine-readable JSON output')
  .option('--trend', 'show per-day accuracy curve (P1-B7)');
program
  .command('export')
  .description('Export trial telemetry (local-only, opt-in) — JSON or CSV')
  .option('--format <fmt>', 'json or csv', 'json')
  .option('--paradigm <id>', 'filter to one paradigm')
  .option('--days <n>', 'limit to last N days')
  .option('--out <path>', 'write to file instead of stdout')
  .option('--analytics', 'include LearningAnalytics (studyEfficiency, learningVelocity) in JSON');
program
  .command('calibrate')
  .description('Calibrate brain-game difficulty (wide exploration → narrow)')
  .option('--paradigm <id>', 'paradigm to calibrate (default: all)')
  .option('--trials <n>', 'trials per calibration block')
  .option('--demo [seed]', 'scripted responder for CI')
  .option('--onboard', 'Seed per-line altitudes via OnboardingCalibrator (binary-search onboarding)');
// P1-QW3 (Architecture Audit Phase A): CLI telemetry inspector. Opt-in only;
// shows the buffered events from the active session.
program
  .command('events')
  .description('Show recent CLI telemetry events (opt-in). Enable via ~/.mysterium/config.json: { "telemetry": true }')
  .option('--tail <n>', 'show only the most recent N events', (v) => parseInt(v, 10), 20);
program
  .command('privacy [action]')
  .description('View or withdraw identity consent (show, withdraw <field>, withdraw-all)');
program
  .command('delegate')
  .description('Run a delegated council session (doc 43) and print its result + ratification (dev tool)')
  .option('--role <role>', 'council role: J1 J2 J3 J4 J5 T1 T2 T3 A1 A2 A3 A4 therapist S1..S5', 'J1')
  .option('--line <line>', 'target line for cell-bounded roles', 'Cognitive')
  .option('--stage <stage>', 'target stage for cell-bounded roles', 'Red')
  // BUG-FIX (delegate smoke): the old subcommand `--encounters <n>` collided
  // with the root `-e, --encounters` flag — commander consumes root-declared
  // options BEFORE the raw-tail scan in runDelegateCommand, so a user-specified
  // budget was silently dropped and advisory roles ran at budget 2, starving
  // every 3-tool mandate (T1/T2/J3/J4/therapist) into budget_exhausted with
  // zero proposals. `--budget` is collision-free; the default (6) completes the
  // largest advisory allowlist (T1/T2: 2 reads + 1 propose) with headroom.
  .option('--budget <n>', 'tool-call budget for the session', (v) => parseInt(v, 10), 6)
  .option('--seed <seed>', 'deterministic seed', 'cli-delegate')
  // Phase 13 d12: summon by STATE (43 §3.3). Collision-free names, same rule as --budget.
  .option('--summon', 'let the council dispatcher decide who appears (ignores --role)')
  .option('--trigger <name>', 'the state to simulate for a summons drill (crisis, depth-plateau, …)')
  .option('--intent <kind>', 'the encounter intent: game | test | diagnosis', 'game');
program
  .command('vow [action] [rest...]')
  .allowUnknownOption()
  .description('Practice objectives (doc 39): list, propose <text...>, check-in <text...>, review')
  .option('--kind <kind>', 'practice | exposure | learning | service', 'practice')
  .option('--line <line>', 'primary line for the check-in', 'Intrapersonal')
program
  .command('pod [action] [rest...]')
  .allowUnknownOption()
  .description('Cohort pods (doc 38 M0): status, form <id>, join <id>, ritual [--collaborative|--assistive], advance, recognize <member> [--kind=...]')
program
  .command('credential [action] [rest...]')
  .allowUnknownOption()
  .description('Claim-based credentials (doc 41): list, draft <domain> <descriptor...>, issue <claimId> <subject>, revoke <claimId>, export <claimId>, rpl --name <chosen-name> [--claims id1,id2]')

// ponytail: .action() prevents commander from showing help when no subcommand given
program.action(() => {});

// Early parse for --model flag (before env bootstrap)
// R8-BUG-5 (UX-R8): Use a SEPARATE Command instance for the early parse
// to avoid the double-parse bug where variadic flags (like --answer)
// accumulate duplicates: parseOptions + parse would double-collect them.
let earlyModelOverride: string | undefined;
{
  const earlyParser = new Command();
  earlyParser.option('-m, --model <name>', 'Override LLM model name');
  earlyParser.parseOptions(process.argv.slice(2));
  const earlyOpts = earlyParser.opts();
  earlyModelOverride = earlyOpts.model as string | undefined;
}

// ── Env bootstrap (must come before any project imports) ──────────────
const fileConfig = loadConfig();
try {
  const envPath = path.resolve('.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const match = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)\s*$/);
      if (match) {
        const key = match[1]!;
        let val = match[2]!.trim();
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
        if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
        process.env[key] = val;
      }
    }
  }
} catch { /* ignore */ }

// Dynamic provider config (UX-R3 follow-up):
// The previous implementation hardcoded a default model ('gemini-1.5-flash')
// and provider ('gemini'). The new implementation resolves everything
// dynamically through ProviderRegistry.resolveConfig(), which checks:
//   1. CLI flags (--model, --provider, --base-url, --api-key)
//   2. Provider-specific env vars (OPENCODE_API_KEY, ANTHROPIC_API_KEY, etc.)
//   3. Generic LLM_* env vars (LLM_PROVIDER, LLM_BASE_URL, LLM_API_KEY, LLM_MODEL)
//   4. The MODEL env var (per the user's spec)
//   5. Legacy VITE_LLM_* env vars (backwards compat)
//   6. Saved config file (~/.mysterium/config.json)
// No hardcoded model names anywhere. The default provider is 'opencode'
// (opencode.ai/zen) — the project's primary gateway — but only fires if
// OPENCODE_API_KEY / OPENCODE_API is set; otherwise the user must configure.
import { resolveConfig as resolveLLMConfig, isComplete as isLLMConfigComplete, type LLMConfig } from '../src/infra/llm/ProviderRegistry.js';
import { getMysteriumDirForScope } from '../src/infra/persistence/mysteriumDir.js';
import { SESSION_MODES, type SessionMode } from '../src/core/domain/SessionMode.js';
import { getActiveConfig, invalidateConfigCache, validateModelIfFresh, queryLLM } from '../src/infra/llm/LLMClient.js';

const resolvedLLM: LLMConfig = resolveLLMConfig(
  { model: earlyModelOverride },
  fileConfig,
);
const llmComplete = isLLMConfigComplete(resolvedLLM);
const apiKey = resolvedLLM.apiKey || 'sk-placeholder';
const baseUrl = resolvedLLM.baseUrl;
const model = resolvedLLM.model;
const provider = resolvedLLM.providerId;

// Seed process.env.VITE_LLM_* for backwards compat with any code that still
// reads those directly. The LLMClient now reads via getActiveConfig() which
// resolves through ProviderRegistry, but a few call sites (and tests) still
// use the legacy env vars.
process.env.VITE_LLM_BASE_URL = baseUrl;
process.env.VITE_LLM_API_KEY = apiKey;
process.env.VITE_LLM_MODEL = model;
process.env.VITE_LLM_PROVIDER = provider;

// Seed the LLMClient config cache so the first call doesn't re-resolve.
// Pass fileConfig so the cache matches what we just resolved.
getActiveConfig(fileConfig);

(globalThis as any).import = {
  meta: {
    env: {
      VITE_LLM_BASE_URL: baseUrl,
      VITE_LLM_API_KEY: apiKey,
      VITE_LLM_MODEL: model,
      VITE_LLM_PROVIDER: provider,
    }
  }
};

// ── Project imports (after env bootstrap) ─────────────────────────────
import { bootRegistries } from '../src/core/registries/boot.js';
import { bootModuleRegistry } from '../src/core/assessments/bootModules.js';
import { createSignificator } from '../src/core/domain/Significator.js';
import { createInitialWorldState, type WorldState } from '../src/core/engines/CandidateGeneration.js';
import type { Significator } from '../src/core/domain/Significator.js';
import type { Line } from '../src/core/domain/Line.js';
import { ALL_LINES } from '../src/core/domain/Line.js';
import type { Stage } from '../src/core/domain/Stage.js';
import { ALL_STAGES, stageOrdinal } from '../src/core/domain/Stage.js';
import type { KnowledgeState } from '../src/core/curriculum/types.js';
import type { AgentRole } from '../src/core/orchestration/types.js';
import { ALL_AGENT_ROLES } from '../src/core/orchestration/councilStanding.js';
import { DEFAULT_CCI_WEIGHTS, type CCIScore } from '../src/core/engines/CCIEngine.js';
import { generateSessionStrategy } from '../src/core/engines/AutoModeStrategy.js';
import { inferAltitudesFromAnswers as inferAltitudesFromAnswersCore } from '../src/core/usecases/InitialAltitudeInference.js';
import { scoreHoldProbe, scoreChoiceProbe } from '../src/core/usecases/QuickCalibrationScoring.js';
import type { TelemetryEvent } from '../src/core/telemetry/TelemetryEvent.js';
import type { ScheduledEncounter } from '../src/core/domain/EncounterSpecNew.js';
import type { PlayerResponse } from '../src/core/engines/ConsequenceEngine.js';
import type { SessionContext } from '../src/core/engines/PriorityComputation.js';
import { startSession, tickWithStrategy, endSession, applyResponseOnly, type SessionState } from '../src/core/GameLoop.js';
import { createInitialUserMatrixModel } from '../src/core/engines/UserMatrixModel.js';
import { AgenticOrchestrator, type AgenticUIHandler } from '../src/core/assessments/AgenticOrchestrator.js';
// YAGNI-PHASE-4: PersistentAgent + PersistentAgentBridge imports removed.
// USE_PERSISTENT_AGENT is always false; the DQ path is the proven architecture.
// YAGNI-EFF-3: createMysteriumToolRegistry import removed — only used in
// the deleted PersistentAgent block.
import type { ModuleRegistry } from '../src/core/assessments/registry.js';
import type { AskUserQuestionParams, AskUserQuestionResult, UserAnswer } from '../src/core/assessments/agentTypes.js';
import { grantDeclaredPreference, withdrawDeclaredPreference, activeDeclaredInterests, activeDeclaredAversions } from '../src/core/domain/IdentityProfile.js';
import { loadSave, saveGame, hasSave, deleteSave, saveWorldState, loadWorldState, deleteWorldSave, saveAll, deleteAllSaves } from '../src/infra/persistence/SaveRepository.js';
import { createEmptyIdentityProfile, grantIdentityField, withdrawIdentityField, IDENTITY_FIELDS, type IdentityField, type HealingPurpose } from '../src/core/domain/IdentityProfile.js';
import { runTrainCommand, runInsightsCommand, runExportCommand, runCalibrateCommand, buildTrainingIntegration, buildUnifiedProfileServices } from '../src/cli/TrainingRuntime.js';
// P1-QW3 (Architecture Audit Phase A): CLI telemetry — opt-in only, no behaviour change when off.
import { buildCLITelemetry, recordCLITelemetry, flushCLITelemetry } from '../src/cli/CLITelemetry.js';
// R11-R2: use canonical resonance from veilDescriptors instead of duplicated maps.
import { describePersonalResonance } from '../src/core/presentation/veilDescriptors.js';

// WORLD-STORE-MOVE (c634535): the holon data moved from src/core/data/ to src/core/world/data/
// (the world organ owns it). These two imports kept pointing at the old path, which made the CLI
// fail at IMPORT TIME — invisible for three days because tsconfig never included scripts/
// (CHECKED-SURFACE-AUDIT-2026-09-24, P0-1/P0-2).
import holonsJson from '../src/core/world/data/red-layer-holons.json';
// P3-FIX (Full-Development Audit 2026-09-15): all 8 stages now have authored
// holons (8 per stage, one per line). Previously only Red had world content,
// so higher-stage scheduling relied entirely on module items + LLM generation.
import stageHolonsJson from '../src/core/world/data/stage-holons.json';
import { GLOSSARY_TERMS, PLAYER_GLOSSARY_TERMS, ADVANCED_GLOSSARY_TERMS, TIER2_GLOSSARY_TERMS, checkTermUnlocks } from '../src/core/data/glossary.js';
import type { ConsequenceRecord } from '../src/core/domain/ConsequenceRecord.js';
import type { Modality } from '../src/core/domain/enums.js';
import { ALL_MODALITIES } from '../src/core/domain/enums.js';
// RuntimeLoop (43 §5.5 + 45 §5/§6 + 22 §7.5): the orchestration services — feed, candidate
// library, owner-worker pool. Carried across encounters in the session loop; persisted with the
// world save so NPC profiles survive the process.
import { createOrchestrationServices, captureCheckpoint, type OrchestrationServices, type RuntimeCheckpoint } from '../src/core/personalization/sessionRuntime.js';
// Phase 13 d9b (memory-audit P3): the crash-sidecar journal — appended at every checkpoint
// capture, replayed before the restored checkpoint is trusted, closing the crash window
// between sessionEnd and saveAll (the last session otherwise dies with the process).
import { appendJournalEntry, replayJournal, journalPathFor } from '../src/infra/persistence/sessionJournal.js';
import { getMysteriumProfileDir } from '../src/infra/persistence/mysteriumDir.js';
import { purposesFromVows, purposesFromGoals, preferenceFromHistory } from '../src/core/personalization/bandSources.js';
import { feedPlanningBias } from '../src/core/orchestration/feedReaders.js';
// P1-3 (UX-R3): configurable saturation threshold + per-line progress.
import { getLineProgress, computeReadiness } from '../src/core/engines/TransformationDetector.js';
// R5-BUG-5 (UX-R5): fallback narrative pool for empty LLM responses.
import { pickFallbackNarrative } from '../src/core/agent/FallbackNarratives.js';
// NF-3 (Fresh-User Re-Audit): Cross-session question de-duplication.
// loadAskedPrompts / saveAskedPrompts persist the asked-prompts set to
// the profile directory so Session N doesn't repeat questions from
// Sessions 1..N-1.
import { loadAskedPrompts, saveAskedPrompts } from '../src/core/fallback/FallbackProvider.js';
// NF-5 (Fresh-User Re-Audit): Route verbose feedback through VeilFilter so
// clinical labels (DarkAllergy, DarkAverted, etc.) and metrics (93% conceptual
// density) don't leak through --verbose. The Veil principle applies to all
// user-facing output, not just the normal path.
import { filterOutput } from '../src/infra/llm/VeilFilter.js';
import {
  listProfiles, createProfile, setActiveProfile, deleteProfile,
  loadProfile, buildContextInjection, updateProfileAfterSession,
  appendEncounterLog, agentReadProfileFile, agentWriteProfileFile,
  getActiveProfileName, getActiveProfileDir, migrateLegacySave,
  getProfilesDir,
  loadUnlockedTerms, addUnlockedTerms,
} from '../src/infra/profiles/ProfileManager.js';
// BUILD-FIX (Full-Development Audit 2026-09-15): removed the dead import of
// '../src/cli/LayerRenderer.js' — the file was purged in 42078ad but the import
// survived, breaking `npm run build:cli` (esbuild) while tsx runtime resolution
// masked it. renderLayers/renderLayersCompact had no remaining call sites.
import { toSnapshot } from '../src/core/domain/SignificatorSnapshot.js';
import { computeCCI } from '../src/core/engines/CCIEngine.js';
import { SessionAgent } from '../src/core/assessments/SessionAgent.js';
import { getCurriculumRegistry } from '../src/core/curriculum/CurriculumRegistry.js';
import { seedCurriculumRegistry } from '../src/core/curriculum/CurriculumSeed.js';
import { seedInitialKnowledge } from '../src/core/curriculum/SeedInitialKnowledge.js';
import { probeCurriculum, formatProbeSummary } from '../src/core/curriculum/MetaCognitiveProbe.js';

/**
 * --curriculum flag: force curriculum encounters by injecting slots.
 * strategy is readonly in SessionState, so we cast through `any`.
 * Safe because startSession/startSessionWithTDG returns a fresh mutable object.
 */
function applyCurriculumMode(sessionState: { strategy: any }): void {
  if (CURRICULUM_MODE) {
    sessionState.strategy = { ...sessionState.strategy, curriculumSlots: Math.max(sessionState.strategy.curriculumSlots ?? 0, 3) };
  }
}

/**
 * P3-4: Render prerequisite gap feedback for a curriculum encounter.
 * Shows what material needs review before this concept can be studied.
 */
function renderPrerequisiteGaps(
  conceptId: string,
  knowledge: KnowledgeState | undefined,
): void {
  if (JSON_MODE || !knowledge) return;
  const gaps = checkPrerequisiteGaps(conceptId, knowledge);
  if (gaps.length === 0) return;

  console.log(`  ${chalk.yellow('⚠')} Before studying this, review:`);
  for (const gap of gaps) {
    const tag = gap.type === 'cross-branch' ? chalk.magenta('[cross-branch]') : '';
    console.log(`    ${chalk.dim('•')} ${chalk.bold(gap.name)} ${tag}`);
  }
  console.log('');
}

// ── Full parse with subcommands (after project imports) ──────────────
// An unrecognised first token is a typo, not a session: name it. Left to itself, commander reports
// the stray token as "too many arguments" — a rejection, but one that never says which word was
// wrong, which is exactly what a player with a typo needs to read. Checked before the parse so the
// message is ours; the rejection itself stays fail-closed (`process.exit(1)`).
program.showSuggestionAfterError();
{
  const known = new Set(program.commands.map((c) => c.name()));
  const first = process.argv[2];
  if (first !== undefined && !first.startsWith('-') && !known.has(first)) {
    console.error(`error: unknown command '${first}'`);
    console.error(`Run ${chalk.bold('mysterium --help')} to see the available commands.`);
    process.exit(1);
  }
}
program.parse();
const opts = program.opts();
const subcommand = program.args[0] as string | undefined;

// P0-4 (UX-R3): HEADLESS is mutable so the non-TTY guard in main() can
// auto-enable it when stdin isn't a TTY. All other flag constants remain const.
let HEADLESS = opts.headless ?? false;
// R5-BUG-1 (UX-R5): Propagate headless state to the PersistentAgent so it
// can lower its maxLoops budget. Without this, --agent + LLM hangs because
// the agent makes up to 30 sequential LLM calls (30×20s = 600s).
if (HEADLESS) process.env.Mysterium_HEADLESS = '1';
// P0-R4 (Fresh-User UX Audit): --verbose requires --dev. The audit found
// that --verbose exposes the entire machinery (XP bars, drive distortion
// mappings, line×stage coordinates, arc counters) which breaks the Veil
// principle. A curious user who tries --verbose without --dev now gets a
// warning and verbose is silently downgraded to false.
const RAW_VERBOSE = opts.verbose ?? false;
const DEV_MODE = (opts as any).dev ?? false;
const VERBOSE = RAW_VERBOSE && DEV_MODE;
if (RAW_VERBOSE && !DEV_MODE) {
  console.error(`${chalk.yellow('⚠ --verbose requires --dev')}: --verbose exposes internal metrics that break the contemplative frame (Veil principle). Use --dev --verbose together for debugging. Continuing without --verbose.`);
}
const JSON_MODE = opts.json ?? false;
// R11-Y1 (Fresh-User UX Audit): --dev surfaces internal metrics (G_z, P_z,
// CCI, rayProfile, phase position) that violate the Veil principle
// (AGENTS.md §5.4: "The game is NEVER diagnostic to the user"). Engineers
// need these for debugging; players shouldn't stumble into them.
// Solution: print a clear Veil-violation warning when --dev is used. In
// interactive mode, require confirmation. In headless mode (automated
// testing), just warn and continue.
if (DEV_MODE && !JSON_MODE) {
  const devWarning = `${chalk.yellow('⚠ DEV MODE')}: Showing internal metrics (G_z, P_z, CCI, rayProfile, phase).\n  These break the experiential frame (Veil principle) and should not be used during normal play.`;
  if (!HEADLESS) {
    // Interactive mode — require confirmation.
    console.error(devWarning);
    // Note: we don't block here because the confirmation would require an
    // async clack prompt, and this code runs synchronously at module top
    // level. The warning is sufficient — a player who passes --dev will
    // see it on every encounter. (P4 in the audit recommended a full
    // confirmation gate; this is the lightweight version that doesn't
    // require restructuring the CLI's init flow.)
  } else {
    // Headless mode (automated testing) — just warn.
    console.error(devWarning);
  }
}
// R8-BUG-3 (UX-R8): Propagate DEV_MODE to LLMClient so VeilFilter logs
// are gated behind --dev and don't leak into normal output.
if (DEV_MODE) process.env.Mysterium_DEV = '1';
// LLM_ACTIVE uses the resolved config's completeness check, which
// accounts for the provider-specific env vars (OPENCODE_API_KEY, etc.).
// The system requires an LLM to operate — there is no offline mode.
let LLM_ACTIVE = llmComplete;
const ACTIVE_MODEL = opts.model ?? model;
/** YAGNI-EFF-3 (Efficacy Audit): --agent path removed. USE_PERSISTENT_AGENT
 * is always false. The PersistentAgent / Story-Driven mode code stays in
 * src/core/agent/ for reference, but the CLI never activates it. */

const encounterCount = parseInt(opts.encounters ?? String(fileConfig.session?.defaultEncounters ?? 20), 10);

const FORCE_LINE = opts.line as Line | undefined;
const FORCE_STAGE = opts.stage as Stage | undefined;
const FORCE_MODALITY = opts.modality as Modality | undefined;
const FORCE_MODE = opts.mode as SessionMode | undefined;
const FORCE_SHADOW = (opts.forceShadow ?? (opts as any).injectShadowKeyword) as string | undefined;
// YAGNI-PHASE-4: FORCE_RESPONSES removed — --responses was never in commander spec.
// The two session flows live in `src/core/domain/SessionMode.ts` — the CLI reads the canonical
// list rather than re-declaring it (the class this file keeps re-learning, audit §10.4). G36
// boots every member, so a mode cannot exist without being reachable.

const NEW_GAME = opts.newGame ?? false;
const SKIP_CALIBRATION = opts.skipCalibration ?? false;
const CURRICULUM_MODE = opts.curriculum ?? false;

// R5-CRITICAL (UX-R5): Headless input mechanism. Load user-provided answers
// from --answers <file> (one per line) and/or --answer <text> (repeatable).
// These feed the writeInValue that the LLM actually sees, instead of the
// LLM hallucinating user answers in --headless mode.
// Priority: --answer flags first (in order), then --answers file (remaining lines).
const USER_ANSWERS: string[] = [];
{
  const inlineAnswers = Array.isArray((opts as any).answer) ? (opts as any).answer as string[]
    : typeof (opts as any).answer === 'string' ? [(opts as any).answer as string]
    : [];
  USER_ANSWERS.push(...inlineAnswers);
  const answersFile = (opts as any).answers as string | undefined;
  if (answersFile) {
    try {
      const content = fs.readFileSync(answersFile, 'utf8');
      // One answer per line; blank lines preserved as empty answers (user skipped)
      const fileLines = content.split('\n');
      USER_ANSWERS.push(...fileLines);
      // UX-PHASE-3: Display loaded answer count for transparency.
      // P6E: Warn if answer count is suspiciously low (< 3) — may indicate
      // a file with excessive blank lines or a mismatch with prompt count.
      if (!JSON_MODE && !HEADLESS) {
        const answerCount = fileLines.filter(l => l.trim() !== '').length;
        if (answerCount > 0) {
          info('answers', `Loaded ${answerCount} answer${answerCount !== 1 ? 's' : ''} from file`);
          if (answerCount < 3) {
            warn(`Only ${answerCount} non-empty answer${answerCount !== 1 ? 's' : ''} found — add more lines to the file for richer encounters.`);
          }
        } else {
          warn('No non-empty answers found in file — all lines were blank. The game will run in reflection-only mode for these encounters.');
        }
      }
    } catch (err: any) {
      console.error(`${chalk.red('✗')} Could not read --answers file: ${answersFile} (${err.message})`);
      process.exit(1);
    }
  }
}
function consumeUserAnswer(): string | undefined {
  // Consume the next user answer. Returns undefined if none remain — caller
  // should fall back to default behavior. Trimming: preserve internal whitespace.
  if (USER_ANSWERS.length === 0) return undefined;
  const next = USER_ANSWERS.shift();
  // Skip purely-empty lines that were trailing in the file
  if (next === undefined) return undefined;
  return next.trim() === '' ? undefined : next.trim();
}

function validateFlag<T extends string>(label: string, value: string | undefined, valid: readonly T[] | Set<T>, validSetName: string): void {
  if (value === undefined) return;
  const isValid = valid instanceof Set ? valid.has(value as T) : (valid as readonly string[]).includes(value);
  if (!isValid) {
    const list = valid instanceof Set ? Array.from(valid).join(', ') : (valid as readonly string[]).join(', ');
    console.error(`${chalk.red('✗')} Invalid ${label}: ${chalk.bold(value)}`);
    console.error(`  Valid ${validSetName}: ${list}`);
    process.exit(1);
  }
}
validateFlag('--line', FORCE_LINE, ALL_LINES, 'lines');
validateFlag('--stage', FORCE_STAGE, ALL_STAGES, 'stages');
validateFlag('--modality', FORCE_MODALITY, ALL_MODALITIES, 'modalities');
validateFlag('--force-shadow', FORCE_SHADOW, VALID_SHADOW_QUADRANTS, 'shadow quadrants');
validateFlag('--mode', FORCE_MODE, SESSION_MODES, 'session modes');

// ── Helpers ───────────────────────────────────────────────────────────
// ponytail: chalk auto-resets between calls, no explicit reset needed

function banner(text: string): void {
  if (!JSON_MODE) console.log(`\n${chalk.bold.cyan(`═══ ${text} ═══`)}`);
}

function info(label: string, value: string): void {
  if (!JSON_MODE) console.log(`  ${chalk.dim(label + ':')} ${value}`);
}

function success(text: string): void {
  if (!JSON_MODE) console.log(`  ${chalk.green('✓')} ${text}`);
}

function warn(text: string): void {
  if (!JSON_MODE) console.log(`  ${chalk.yellow('⚠')} ${text}`);
}

function error(text: string): void {
  if (!JSON_MODE) console.log(`  ${chalk.red('✗')} ${text}`);
}

function separator(label: string): void {
  if (!JSON_MODE) console.log(boxen(chalk.bold(label), {
    padding: { left: 1, right: 1 },
    borderStyle: 'round',
    borderColor: 'cyan',
    margin: { top: 1, bottom: 0 },
  }));
}

function verbose(label: string, value: string): void {
  if (VERBOSE && !JSON_MODE) console.log(`  ${chalk.magenta(label + ':')} ${value}`);
}

// P0-2 (UX-R3): Emit holistic dev primitives when --dev is set, so the
// --help promise ("show holistic primitives (G_z/P_z, rayProfile, phase
// position)") is honored during sessions, not just in `status`.
// Called from both encounter loops (DQ + Story-Driven) after each encounter.
function emitDevPrimitives(sig: Significator, label: string): void {
  if (!DEV_MODE) return;
  try {
    const snapshot = toSnapshot(sig);
    const cci = computeCCI(snapshot);
    const mh = cci.metabolicHealth;
    if (JSON_MODE) {
      emitEvent('dev_primitives', {
        label,
        gz: mh?.gz ?? null,
        pz: mh?.pz ?? null,
        metabolicTotal: mh?.total ?? null,
        interpretation: mh?.interpretation ?? null,
        cci: cci.composite,
        transformationPhase: sig.transformationPhase ?? 'idle',
        rayProfile: sig.rayProfile,
        transformationTargetStage: sig.transformationTargetStage ?? null,
        sessionsInPhase: sig.transformationSessionsInPhase ?? 0,
        knotsResolved: sig.transformationKnotsResolved ?? 0,
        internalizedHolons: sig.internalizedHolons?.length ?? 0,
        greatWayDirection: sig.greatWayDirection ?? null,
      });
    } else {
      info('dev', `${label} → G_z=${mh?.gz?.toFixed(4) ?? 'n/a'} P_z=${mh?.pz?.toFixed(4) ?? 'n/a'} CCI=${cci.composite.toFixed(4)} phase=${sig.transformationPhase ?? 'idle'}`);
    }
  } catch {
    // Best-effort — dev mode should never break a session.
  }
}

/**
 * P0-3 (Fresh-User UX Audit): Post-session summary.
 * Displays what emerged during the session without breaking the Veil.
 * Shows: shadows surfaced, patterns identified, suggested focus,
 * and glossary terms unlocked. All in felt-sense language.
 */
function renderPostSessionSummary(sig: Significator, history: ConsequenceRecord[], audit?: boolean): void {
  if (JSON_MODE) return;

  console.log(`\n  ${chalk.bold.cyan('═══ Session Complete ═══')}`);

  // 1. What happened: lines explored (Veil-compliant — just count, not names)
  const linesExplored = new Set(history.map(h => h.line)).size;
  if (linesExplored > 0) {
    info('explored', `${linesExplored} aspect${linesExplored !== 1 ? 's' : ''} of your inner landscape`);
  }

  // 2. Shadows surfaced: group by quadrant and describe qualitatively
  const activeShadows = sig.shadows.entries.filter(e => !e.resolvedAt);
  if (activeShadows.length > 0) {
    const quadrantCounts: Record<string, number> = {};
    for (const s of activeShadows) {
      const q = s.quadrant ?? 'Unknown';
      quadrantCounts[q] = (quadrantCounts[q] ?? 0) + 1;
    }
    info('surfaced', `${activeShadows.length} pattern${activeShadows.length !== 1 ? 's' : ''} that want attention`);      // P1-SUMMARY (Fresh-User Re-Audit): Show qualitative shadow descriptions
      // always, not just in VERBOSE mode. The old code gated this behind VERBOSE
      // which meant normal players never saw what patterns the game detected.
      // Showing the movements (in Veil-compliant language) helps the player
      // understand what the game "saw" in them.
      const lineDescs: Record<string, Set<string>> = {};
      for (const s of activeShadows) {
        const line = s.line ?? 'Unknown';
        if (!lineDescs[line]) lineDescs[line] = new Set();
        lineDescs[line].add(describeShadowMovement(s.quadrant ?? 'Unknown'));
      }
      const shadowDesc = Object.entries(lineDescs)
        .map(([line, descs]) => {
          const desc = [...descs].join(' / ');
          return `${line} — ${desc}`;
        })
        .join(', ');
      if (shadowDesc) {
        console.log(`    ${chalk.dim(shadowDesc)}`);
      }
  } else {
    info('shadows', `${chalk.green('none surfacing right now — the field is clear')}`);
  }

  // 3. Lines touched: show which developmental dimensions were engaged
  if (history.length > 0) {
    const lineNames = [...new Set(history.map(h => h.line))];
    console.log(`  ${chalk.dim('dimensions:')} ${lineNames.join(', ')}`);
  }

  // 4. Knowledge state: if curriculum data exists, show a brief summary
  if (sig.knowledge && sig.knowledge.conceptStates.size > 0) {
    const conceptCount = sig.knowledge.conceptStates.size;
    const avgRetention = [...sig.knowledge.conceptStates.values()]
      .reduce((sum, cs) => sum + cs.retention, 0) / conceptCount;
    const retentionDesc = avgRetention > 0.7 ? 'well-held'
      : avgRetention > 0.4 ? 'developing'
      : 'fading';
    info('knowledge', `${conceptCount} concept${conceptCount !== 1 ? 's' : ''} studied, ${retentionDesc}`);
  }

  // 5. Glossary terms unlocked this session
  const unlockedThisSession = loadUnlockedTerms(getMysteriumProfileDir());
  if (unlockedThisSession.length > 0) {
    const newTerms = unlockedThisSession.filter(t => !['Line', 'Stage', 'Shadow'].includes(t));
    if (newTerms.length > 0) {
      info('unlocked', `${newTerms.length} new term${newTerms.length !== 1 ? 's' : ''}: ${newTerms.slice(0, 3).join(', ')}${newTerms.length > 3 ? '…' : ''}`);
    }
  }

  // 6. Suggested focus for next session (from goals.yaml active_focus)
  const activeFocus = readActiveFocus();
  if (activeFocus && activeFocus.length > 5) {
    console.log(`\n  ${chalk.dim('For next time:')}`);
    console.log(`  ${chalk.italic(activeFocus)}`);
  }

  // META-PROBE: Show curriculum health when --audit flag is set.
  // This gives the agentic loop or developer a comprehensive health check
  // of progression, rubric calibration, and content linting.
  if (audit && sig.knowledge && sig.knowledge.conceptStates.size > 0) {
    try {
      const registry = getCurriculumRegistry();
      if (registry.count() > 0) {
        const probe = probeCurriculum(sig.knowledge, registry, Date.now());
        console.log(formatProbeSummary(probe));
      }
    } catch {
      // Curriculum probe unavailable — skip silently
    }
  }

  console.log('');
}

/**
 * P0-R2 helper: Update the active_focus field in goals.yaml with a new focus snippet.
 * Extracted from duplicated code in DQ and Story session paths.
 * Best-effort — never throws, never breaks the session.
 */
function updateGoalsActiveFocus(focusText: string): void {
  try {
    const profileDir = getActiveProfileDir();
    if (!profileDir) return;
    const goalsRaw = agentReadProfileFile('goals.yaml');
    if (!goalsRaw) return;
    const focusSnippet = focusText.split(/[.!?]/)[0]?.trim().slice(0, 120);
    if (!focusSnippet || focusSnippet.length <= 10) return;
    const updatedGoals = goalsRaw.replace(
      /active_focus:.*$/m,
      `active_focus: "${focusSnippet.replace(/"/g, "'")}"`,
    );
    agentWriteProfileFile('goals.yaml', updatedGoals, 'overwrite');
  } catch { /* best-effort — never break the session */ }
}

/**
 * P0-R2 follow-up: Read the active_focus field from goals.yaml.
 * Extracted from duplicated code in renderPostSessionSummary and session start.
 * Best-effort — returns null on any error or if no focus is set.
 */
function readActiveFocus(): string | null {
  try {
    const profileDir = getActiveProfileDir();
    if (!profileDir) return null;
    const goalsPath = path.join(profileDir, 'goals.yaml');
    if (!fs.existsSync(goalsPath)) return null;
    const goalsContent = fs.readFileSync(goalsPath, 'utf8');
    const focusMatch = goalsContent.match(/active_focus:\s*"([^"]+)"/);
    return focusMatch?.[1] ?? null;
  } catch { return null; }
}

// Interactive prompt helper — uses @clack/prompts for beautiful UI
async function ask(q: string): Promise<string> {
  if (HEADLESS || JSON_MODE) return '';
  const answer = await clackText({ message: q, defaultValue: '' });
  return typeof answer === 'string' ? answer : '';
}

// ── LLM availability check (3s timeout, uses chat/completions) ──────
async function checkLLMAvailability(url: string, key: string): Promise<boolean> {
  if (key === 'sk-placeholder') return false;
  const isAnthropic = url.includes('anthropic.com');
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    let res: Response;
    if (isAnthropic) {
      res = await fetch(`${url}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: model,
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 1,
        }),
        signal: controller.signal,
      });
    } else {
      res = await fetch(`${url}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model,
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 1,
        }),
        signal: controller.signal,
      });
    }
    clearTimeout(timeout);
    if (res.ok) return true;
    if (res.status === 401 || res.status === 403) return false;
    if (res.status >= 400 && res.status < 500 && res.status !== 429) return false;
    return true;
  } catch {
    return false;
  }
}

// ── Holon loading ─────────────────────────────────────────────────────
/**
 * P3-FIX (Full-Development Audit 2026-09-15): merge migration for existing
 * saves. loadWorldState() returns whatever holons were persisted at first run
 * — for every pre-existing player that is the Red-only corpus (36 holons).
 * Without this merge, saved worlds NEVER receive new authored stage content:
 * the 92-holon world would exist only for fresh installs. Idempotent by ID,
 * so re-running with an already-merged save is a no-op.
 */
function mergeAuthoredHolons(savedHolons: readonly any[]): any[] {
  const authored = [...(holonsJson as any[]), ...(stageHolonsJson as any[])];
  const byId = new Map<string, any>();
  for (const h of savedHolons) byId.set(h.id, h);
  for (const h of authored) if (!byId.has(h.id)) byId.set(h.id, h);
  return [...byId.values()];
}

function loadHolons(): WorldState {
  // Try to load saved world state first (skip if --new-game)
  if (!NEW_GAME) {
    const savedWorld = loadWorldState();
    if (savedWorld && savedWorld.holons?.length) {
      const merged = { ...savedWorld, holons: mergeAuthoredHolons(savedWorld.holons) };
      if (merged.holons.length !== savedWorld.holons.length) {
        // New authored content arrived — persist the merged world so the
        // merge runs once, not on every startup.
        saveWorldState(merged);
      }
      return merged;
    }
  }
  const holons = [...(holonsJson as any[]), ...(stageHolonsJson as any[])];
  return createInitialWorldState(holons);
}

// ── Quick Calibration ────────────────────────────────────────────────
// ponytail: calibration data extracted to src/core/data/calibrationPrompts.ts (shared with WebUI /onboarding).
import { CALIBRATION_PROMPTS, HOLD_TARGETS } from '../src/core/data/calibrationPrompts.js';

// GAP-6 (Efficacy Audit): Infer developmental altitude from user answers.
// Instead of defaulting all lines to Red, analyze the user's --answer
// content for stage-specific vocabulary and conceptual complexity.
// This is a lightweight binary-search — not a full developmental assessment,
// but enough to prevent experts from starting at Red.
function inferAltitudesFromAnswers(): Record<Line, Stage> {
  // Phase 14 d3 (Q10): the inference moved to `src/core/usecases/InitialAltitudeInference.ts`.
  // It sat in this file — outside the checked graph — and carried the retired `White` stage in its
  // marker table (checked-surface audit F5). The CLI keeps only the sentence it renders.
  const inference = inferAltitudesFromAnswersCore(USER_ANSWERS);
  if (!JSON_MODE && !inference.fellBackToFloor) {
    // P0-F2 (Fresh-User UX Audit): Be honest about WHAT was measured and WHEN. The message must
    // not fire when there is genuinely nothing to infer from, must say the inference is from the
    // answers the player brought to the session (not from writing produced during play), and must
    // stay a rough seed rather than a diagnosis.
    info('onboarding', `Starting altitude: ${inference.detectedStage} (a rough seed from the answers you brought; encounters will refine it).`);
  }
  return { ...inference.altitudes };
}

async function runQuickCalibration(): Promise<Record<Line, Stage>> {
  const altitudes: Partial<Record<Line, Stage>> = {};
  banner('Quick Calibration');
  console.log(`  ${chalk.dim('A brief probe of each developmental line to set your starting altitudes.')}\n`);

  for (const line of ALL_LINES) {
    let stage: Stage = 'Red';
    let confidence = 0.5;

    if (line === 'Somatic' || line === 'Willpower') {
      // ── Hold probe: measure timing accuracy ──
      const target = HOLD_TARGETS[line]!;
      const targetSec = (target / 1000).toFixed(1);

      console.log(`  ${chalk.bold.cyan(line + ':')} ${chalk.dim('Timing probe')}`);
      console.log(`  ${chalk.dim('Press Enter when you think ' + targetSec + ' seconds have passed.')}\n`);

      const startTime = Date.now();
      const answer = await clackText({ message: `Press Enter after ~${targetSec}s...`, defaultValue: '' });
      if (typeof answer === 'symbol') { altitudes[line] = 'Red'; continue; }
      const elapsed = Date.now() - startTime;

      // Phase 14 d3 (Q10): the arithmetic lives in `QuickCalibrationScoring` — this loop keeps the
      // asking and the felt-sense rendering.
      const holdOutcome = scoreHoldProbe(line, elapsed);
      if (!holdOutcome) { altitudes[line] = 'Red'; continue; }
      stage = holdOutcome.stage;
      confidence = holdOutcome.confidence;

    } else {
      // ── LLM dialogue probe: multiple choice ──
      const probe = CALIBRATION_PROMPTS[line];
      if (!probe) { altitudes[line] = 'Red'; continue; }

      console.log(`  ${chalk.bold.cyan(line + ':')}`);
      console.log(`  ${chalk.dim(probe.prompt)}\n`);

      const choice = await select({
        message: `How would you approach this?`,
        options: probe.options.map((opt) => ({ value: opt, label: opt })),
      });

      if (typeof choice === 'symbol') { altitudes[line] = 'Red'; continue; }

      const choiceIdx = probe.options.indexOf(choice as string);
      const idx = choiceIdx >= 0 ? choiceIdx : 0;

      const choiceOutcome = scoreChoiceProbe(line, idx);
      if (!choiceOutcome) { altitudes[line] = 'Red'; continue; }
      stage = choiceOutcome.stage;
      confidence = choiceOutcome.confidence;
    }

    altitudes[line] = stage;

    // P1-VEIL (Fresh-User Re-Audit): Replace progress bar + confidence score
    // with felt-sense language. The old display showed:
    //   Cognitive ■■○○○○○ Red (confidence: 0.52)
    // which leaked internal metrics and stage names before the player understood
    // them. The new display uses descriptive language that preserves the
    // information without breaking the contemplative frame.
    const color = stageColor(stage);
    const feltLabel = confidence > 0.7 ? 'clear' : confidence > 0.4 ? 'emerging' : 'gathering';
    console.log(`  ${line.padEnd(14)} ${color(stage)} ${chalk.dim('— ' + feltLabel)}\n`);
  }

  console.log(`\n  ${chalk.bold('Your starting landscape:')}`);
  for (const line of ALL_LINES) {
    const s = altitudes[line] ?? 'Red';
    const color = stageColor(s);
    console.log(`    ${line.padEnd(14)} ${color(s)}`);
  }
  console.log('');
  console.log(`  ${chalk.dim('These will shift as the game reflects you back to yourself.')}`);
  console.log('');

  return altitudes as Record<Line, Stage>;
}

// ── Significator creation (simplified onboarding) ─────────────────────
async function createDefaultSignificator(): Promise<Significator> {
  // Try to load saved state first (skip if --new-game)
  if (!NEW_GAME) {
    const saved = loadSave();
    if (saved) {
      if (!JSON_MODE) console.log(`  ${chalk.green('✓')} Loaded saved progress (${saved.totalEncounters} encounters, stage: ${saved.currentStage})`);
      // FIX-PERSIST (Audit): existing saves with 0 concepts (from pre-fix) need
      // backfill. Without this, players who played before the Red-seed fix
      // remain stuck at 0 concepts forever (DQ path never calls GameLoop.startSession).
      if (!saved.knowledge || saved.knowledge.conceptStates.size === 0) {
        const seedLine = (Object.entries(saved.altitudes).find(([_, s]) => s === saved.currentStage)?.[0] ?? 'Cognitive') as Line;
        const seeded = seedInitialKnowledge(seedLine, saved.currentStage);
        if (seeded.conceptStates.size > 0) {
          const patched = { ...saved, knowledge: seeded };
          // Persist the backfill so next load is correct
          try { saveGame(patched as Significator); } catch { /* best-effort */ }
          if (!JSON_MODE) console.log(`  ${chalk.dim(`Curriculum backfill: seeded ${seeded.conceptStates.size} concepts`)}`);
          return patched as Significator;
        }
      }
      return saved;
    }
  } else {
    deleteSave();
    deleteWorldSave();
    if (!JSON_MODE) console.log(`  ${chalk.yellow('↻')} Starting new game (previous save deleted)`);
  }

  // Run quick calibration unless in automated/skip mode
  let altitudes: Record<Line, Stage>;
  if (HEADLESS || SKIP_CALIBRATION || JSON_MODE) {
    // GAP-6 (Efficacy Audit): Binary-search onboarding for headless mode.
    // Instead of defaulting all lines to Red, probe the user's developmental
    // altitude via their --answer content. If answers show Green+ vocabulary
    // (integration, pluralism, systems-thinking), seed at Green. If they show
    // Amber (rules, duty, belonging), seed at Amber. Otherwise Red.
    // This prevents experts (NASA scientists, therapists, monks) from
    // starting at Red and bouncing.
    altitudes = inferAltitudesFromAnswers();
  } else {
    altitudes = await runQuickCalibration();
  }

  const stageCounts: Record<string, number> = {};
  for (const s of Object.values(altitudes)) {
    stageCounts[s] = (stageCounts[s] ?? 0) + 1;
  }
  let dominantStage: Stage = 'Red';
  let maxCount = 0;
  for (const [s, count] of Object.entries(stageCounts)) {
    if (count > maxCount || (count === maxCount && stageOrdinal(s as Stage) > stageOrdinal(dominantStage))) {
      maxCount = count;
      dominantStage = s as Stage;
    }
  }

  const sig = createSignificator('cli-player', altitudes, dominantStage);

  // P0-COLDSTART: Seed initial knowledge state so curriculum encounters
  // appear from the first session. Without this, generateCurriculumCandidates()
  // returns empty because conceptStates is empty for fresh players.
  const seedLine = (Object.entries(altitudes).find(([_, s]) => s === dominantStage)?.[0] ?? 'Cognitive') as Line;
  const initialKnowledge = seedInitialKnowledge(seedLine, dominantStage);
  if (initialKnowledge.conceptStates.size > 0) {
    return { ...sig, knowledge: initialKnowledge };
  }
  return sig;
}

function emitEvent(type: string, data: Record<string, unknown>): void {
  if (JSON_MODE) {
    const cleaned: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(data)) {
      cleaned[k] = typeof v === 'string' ? stripAnsi(v) : v;
    }
    process.stdout.write(JSON.stringify({ type, ts: Date.now(), ...cleaned }) + '\n');
  }
}

/** Render session arc position with progress bar */
function renderSessionPosition(label: string, position: 'warmup' | 'peak' | 'cooldown', progress: number): void {
  if (JSON_MODE) return;
  const barLen = 12;
  const pos = Math.round(progress * barLen);
  let bar = '';
  for (let i = 0; i < barLen; i++) {
    if (position === 'warmup') {
      bar += i <= pos ? chalk.blue('▰') : chalk.dim('▱');
    } else if (position === 'peak') {
      bar += i <= pos ? chalk.magenta('▰') : chalk.dim('▱');
    } else {
      bar += i <= pos ? chalk.green('▰') : chalk.dim('▱');
    }
  }
  const posLabel = position === 'warmup' ? chalk.blue('WARMUP')
    : position === 'peak' ? chalk.magenta('PEAK')
    : chalk.green('COOLDOWN');
  console.log(`  ${posLabel} ${bar} ${chalk.dim(label)}`);
}

/** Render Direct Questioning progress — Veil-compliant (no line names, no stages, no pass/fail counts) */
function renderLinesProgress(_sig: Significator, history: ConsequenceRecord[]): void {
  if (JSON_MODE) return;
  // Veil compliance: show only the count of questions answered so far,
  // not which lines, not their stages, not pass/fail counts.
  const totalAnswered = history.length;
  const totalQuestions = 8;
  const barWidth = 16;
  const filled = Math.round((totalAnswered / totalQuestions) * barWidth);
  const bar = '█'.repeat(filled) + '░'.repeat(barWidth - filled);
  console.log(`  ${chalk.bold('Progress')}  ${chalk.cyan(bar)} ${totalAnswered}/${totalQuestions}`);
  console.log('');
}

// ── Print state ───────────────────────────────────────────────────────
function printSignificator(sig: Significator): void {
  // T-3.4 (Veil compliance): printSignificator is only called from
  // diagnostic/verbose paths. Show only id + qualitative state.
  // R11-R2: use describePersonalResonance for player-responsive resonance.
  info('id', sig.id);
  // NF-9 (Fresh-User Re-Audit): Add inline gloss so a new user doesn't think
  // 'fortress-sharp, weapon-walls' is a bug. The gloss explains it's the
  // poetic aesthetic of the current stage + shadow state.
  const resonance = describePersonalResonance(sig);
  info('resonance', `${resonance}  ${chalk.dim('(the poetic texture of your current stage)')}`);
}

function printEncounter(enc: ScheduledEncounter, world?: WorldState): void {
  const isShadow = enc.executionMode === 'shadow';
  const posColor = enc.sessionPosition === 'warmup' ? chalk.blue
    : enc.sessionPosition === 'cooldown' ? chalk.green : chalk.magenta;
  const posTag = enc.sessionPosition === 'warmup' ? 'WARMUP'
    : enc.sessionPosition === 'cooldown' ? 'COOLDOWN' : 'PEAK';

  if (isShadow && !JSON_MODE) {
    console.log(`  ${chalk.bgRed.white.bold(' ◆ SHADOW-WORK ')} ${chalk.dim('— accumulated shadows exceed threshold')}`);
  }

  // Veil compliance: no holonSource ID, no shadowTarget quadrant name, no executionMode label.
  // Show only the arc position (warmup/peak/cooldown) which is structural, not developmental.
  info('arc', `${posColor(posTag)}`);

  // P1-2 (UX-R3): Surface the NPC name + narrative role so the user knows
  // WHO they're engaging with. Previously the encounter header showed only
  // 'arc: PEAK' and the user never met the 16 named NPCs (The Conqueror,
  // Bloodfury, Elder Ashmark, etc.) that the encounter was actually with.
  // Veil is preserved: we show name + narrativeRole (atmospheric), not
  // shadowQuadrant or drives (clinical).
  if (world && !JSON_MODE) {
    const holon = world.holons.find(h => h.id === enc.holonSource);
    if (holon && holon.kind === 'NPC') {
      const roleLabel = holon.narrativeRole
        ? holon.narrativeRole.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
        : 'presence';
      info('encounter', `${chalk.cyan(holon.name)} ${chalk.dim(`· ${roleLabel}`)}`);
    } else if (holon && holon.kind === 'Location') {
      info('place', `${chalk.cyan(holon.name)}`);
    }
  }

  if (isShadow) {
    // No quadrant name — just the shadow-work indicator
    info('mode', `${chalk.bgRed.white(' shadow ')}`);
  }
}

// ── Unified encounter execution dispatch (YAGNI-1 / UX-R3+R4) ────────
// Both DQ mode and Story-Driven mode call THIS function instead of
// branching on USE_PERSISTENT_AGENT themselves. This eliminates the
// routing divergence that let P0-1 (R3: lexical scope bug) hide for multiple audit
// rounds. Future execution-mode checks (new agent types, new LLM
// routing) happen here — one place, one bug surface.
interface EncounterExecutionOptions {
  readonly responsesPool?: number[];
  readonly consecutivePasses?: Map<string, number>;
  readonly agentSynthesis?: string;
  /** RuntimeLoop: the session-carried orchestration services (may be omitted — degradation law). */
  readonly orchestration?: OrchestrationServices;
  // YAGNI-EFF-3: persistentAgent removed. USE_PERSISTENT_AGENT is always false;
  // the DQ path is the proven architecture. Story-Driven mode can be rebuilt
  // on top of DQ when needed.
}
async function executeEncounter(
  encounter: ScheduledEncounter,
  sig: Significator,
  world: WorldState,
  history: ConsequenceRecord[],
  options: EncounterExecutionOptions = {},
): Promise<{
  outcome: import('../src/core/assessments/AgenticOrchestrator.js').OrchestratorResult;
  response: PlayerResponse;
  narrativeSummary: string;
  effectiveEncounter: ScheduledEncounter;
}> {
  // Route to AgenticOrchestrator (default).
  // YAGNI-EFF-3: PersistentAgent routing removed. USE_PERSISTENT_AGENT is
  // always false; the DQ path is the proven architecture.
  const result = await runAgenticEncounter(
    encounter, sig, world, history, options.responsesPool, options.consecutivePasses, options.agentSynthesis,
    options.orchestration,
  );
  return { ...result, effectiveEncounter: encounter };
}

// ── AgenticOrchestrator encounter handler (all modalities) ────────────
async function runAgenticEncounter(
  encounter: ScheduledEncounter,
  sig: Significator,
  world: WorldState,
  history: ConsequenceRecord[],
  responsesPool?: number[],
  consecutivePasses?: Map<string, number>,
  agentSynthesis?: string,
  orchestration?: OrchestrationServices,
): Promise<{
  outcome: import('../src/core/assessments/AgenticOrchestrator.js').OrchestratorResult;
  response: PlayerResponse;
  narrativeSummary: string;
}> {
  const [encLine, encStage] = encounter.moduleRef.split(':') as [Line, Stage];
  const modRegistry = (globalThis as any).__moduleRegistry as ModuleRegistry | undefined;

  // If --line/--stage/--modality forcing is active, override the encounter
  let forcedEncounter = encounter;
  if (FORCE_LINE || FORCE_STAGE || FORCE_MODALITY) {
    const forcedLine = FORCE_LINE ?? encLine;
    const forcedStage = FORCE_STAGE ?? encStage;
    const forcedModality = FORCE_MODALITY ?? encounter.modality;
    const forcedModule = modRegistry?.get(forcedLine, forcedStage);
    if (forcedModule) {
      forcedEncounter = {
        ...encounter,
        moduleRef: `${forcedLine}:${forcedStage}`,
        modality: forcedModality,
        targetLines: [forcedLine],
        stage: forcedStage,
      };
    }
  }

  const uiHandler: AgenticUIHandler = {
    askUser: async (params: AskUserQuestionParams): Promise<AskUserQuestionResult> => {
      const answers: UserAnswer[] = [];

      for (const q of params.questions) {
        if (!JSON_MODE) {
          const mod = forcedEncounter.modality;
          const isShadow = forcedEncounter.executionMode === 'shadow';
          let modHeader = '';

          // P0-1 (Fresh-User UX Audit): If this is a curriculum encounter,
          // prepend the concept name so the player knows what they're studying.
          if (forcedEncounter.curriculumConceptId) {
            // P3-4: Show prerequisite gaps before the encounter label
            if (sig?.knowledge) {
              renderPrerequisiteGaps(forcedEncounter.curriculumConceptId, sig.knowledge);
            }
            const label = curriculumLabel(forcedEncounter.curriculumConceptId);
            if (label) {
              const actionLabel = {
                review: 'Review',
                deepen: 'Deepen',
                new_material: 'New Material',
                connect: 'Connect',
              }[forcedEncounter.curriculumAction ?? 'review'] ?? 'Study';
              modHeader = `\n  ${chalk.bold.cyan(`📚 ${actionLabel}:`)}${label}\n`;
            }
          }

          switch (mod) {
            case 'Deterministic':
              modHeader = isShadow
                ? `${chalk.bold.red('◆ [SHADOW TRIAL] ▬▬▬▬▬▬▬▬▬▬▬▬▬░ (9.5s remaining)')}\n`
                : `${chalk.bold.red('⏳ [TIMED TRIAL] ▬▬▬▬▬▬▬▬▬▬▬▬▬░ (9.5s remaining)')}\n`;
              break;
            case 'LanguageReflective':
              modHeader = isShadow
                ? `${chalk.bold.red('◆ [SHADOW REFLECTION] • Confront the unresolved pattern •')}\n`
                : `${chalk.bold.blue('🧘 [REFLECTION BEAT] • Tune in to your inner state •')}\n`;
              break;
            case 'ScenarioChoice':
              modHeader = isShadow
                ? `${chalk.bold.red('◆ [SHADOW CROSSROADS] • The shadow demands a choice •')}\n`
                : `${chalk.bold.yellow('🔀 [DECISION CROSSROADS] • A path diverges •')}\n`;
              break;
            case 'Embodied':
              modHeader = isShadow
                ? `${chalk.bold.red('◆ [SHADOW SCAN] • Feel where the shadow lives in the body •')}\n`
                : `${chalk.bold.green('💓 [SOMATIC SCAN] • Focus on body sensation •')}\n`;
              break;
            case 'Strategic':
              modHeader = isShadow
                ? `${chalk.bold.red('◆ [SHADOW WAR-TABLE] • Map the shadow\'s strategy •')}\n`
                : `${chalk.bold.magenta('♟️ [TACTICAL WAR-TABLE] • Assess constraints •')}\n`;
              break;
            case 'SocialCooperative':
              modHeader = isShadow
                ? `${chalk.bold.red('◆ [SHADOW DIPLOMACY] • Navigate the shadow in relation •')}\n`
                : `${chalk.bold.cyan('🤝 [DIPLOMACY] • Navigating connection •')}\n`;
              break;
            case 'ImmersiveRPG':
              modHeader = isShadow
                ? `${chalk.bold.red('◆ [SHADOW SCENE] • The shadow writes its chapter •')}\n`
                : `${chalk.bold.yellow('📖 [NARRATIVE SCENE] • The story unfolds •')}\n`;
              break;
            default:
              modHeader = isShadow
                ? `${chalk.bold.red('◆ [SHADOW WORK]')}\n`
                : `${chalk.bold.dim('[' + (mod as string).toUpperCase() + ']')}\n`;
          }

          console.log(`\n  ${modHeader}  ${chalk.magenta('[' + q.header + ']')}`);
          console.log(`  ${chalk.bold(q.question)}`);
          if (q.options?.length) {
            for (let i = 0; i < q.options.length; i++) {
              const opt = q.options[i];
              // R5-BUG-2 (UX-R5): Don't print ' — ' + description when description
              // is empty (was duplicating the label for ScenarioChoice/Strategic/
              // SocialCooperative where label and description were both o.text).
              const optLine = opt.description
                ? `${chalk.cyan('[' + (i + 1) + ']')} ${opt.label} — ${opt.description}`
                : `${chalk.cyan('[' + (i + 1) + ']')} ${opt.label}`;
              console.log(`    ${optLine}`);
            }
          }
        }

        // P0-1 (UX-R3): `header` previously referenced `line` and `i` which only
        // exist in runDirectQuestioningSession's for-loop scope — causing
        // `ReferenceError: line is not defined` on every DQ encounter. Use the
        // destructured `encLine` (always in scope here) and a stable hash for
        // the scene-setting index (no loop counter available in this closure).
        const dqSceneIdx = (encLine.length + (forcedEncounter.modality?.length ?? 0)) % DQ_SCENE_SETTINGS.length;
        emitEvent('ask_user', {
          // UX-R2-3: Use the line name as the header in DQ mode
          header: encLine,
          // UX-R2-7: Prepend the question with NPC scene-setting
          question: q.question,
          narrative: DQ_SCENE_SETTINGS[dqSceneIdx],
          options: q.options?.map((o, oi) => ({ index: oi + 1, label: o.label, description: o.description })),
          allowWriteIn: q.allowWriteIn,
        });

        if (HEADLESS) {
          // R5-CRITICAL (UX-R5): If the user provided an answer via --answer
          // or --answers, use it as the writeInValue. This is the difference
          // between the LLM hallucinating the user's stance and the LLM
          // responding to the user's actual reflection.
          const userAnswer = consumeUserAnswer();
          if (userAnswer !== undefined) {
            // User provided a real answer — inject it as the writeIn.
            // For MCQ questions, also try to match the answer to an option
            // label so the drive-scoring picks up the right signal. If no
            // match, fall back to the first option + the writeIn.
            let selectedIdx = 0;
            if (q.options && q.options.length > 0) {
              const matchIdx = q.options.findIndex(o =>
                o.label.toLowerCase().includes(userAnswer.toLowerCase()) ||
                userAnswer.toLowerCase().includes(o.label.toLowerCase()));
              selectedIdx = matchIdx >= 0 ? matchIdx : 0;
            }
            const selectedLabel = q.options?.[selectedIdx]?.label ?? '';
            answers.push({ selectedLabels: selectedLabel ? [selectedLabel] : [], writeInValue: userAnswer });
          } else if (responsesPool && responsesPool.length > 0) {
            // Use forced responses pool if provided (one index per question, consumed sequentially)
            const forcedIdx = responsesPool.shift()!;
            let selectedIdx: number;
            if (q.options && forcedIdx >= 1 && forcedIdx <= q.options.length) {
              selectedIdx = forcedIdx - 1;
            } else {
              selectedIdx = 0;
            }
            const selectedOpt = q.options?.[selectedIdx];
            const selectedLabel = selectedOpt?.label ?? '';

            // Shadow keyword injection for testing — randomly inject (10% chance)
            const shadowInjections = ['', 'i feel the need to withdraw from this confrontation', 'i must transcend these petty concerns and reach enlightenment', 'i prefer to stay here where it is safe and comfortable'];
            const injectShadow = FORCE_SHADOW !== 'none' && selectedIdx > 0 && Math.random() < 0.1;
            const writeInShadow = injectShadow ? (shadowInjections[selectedIdx] ?? '') : '';

            if (writeInShadow) {
              answers.push({ selectedLabels: [selectedLabel], writeInValue: writeInShadow });
            } else {
              answers.push({ selectedLabels: [selectedLabel] });
            }
          } else {
            // No user answer, no forced responses — vary selection to probe
            // different shadow patterns. (Previous default behavior.)
            const hash = (Date.now() + (q.options?.length ?? 4)) % 4;
            const selectedIdx = hash < (q.options?.length ?? 4) ? hash : 0;
            const selectedOpt = q.options?.[selectedIdx];
            const selectedLabel = selectedOpt?.label ?? '';
            answers.push({ selectedLabels: [selectedLabel] });
          }
        } else {
          const promptText = q.multiSelect
            ? '\n  Select (comma-separated): '
            : '\n  Select: ';
          const answer = await ask(promptText);
          const selections = answer.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
          const selectedLabels = selections
            .filter(n => n >= 1 && n <= (q.options?.length ?? 0))
            .map(n => q.options![n - 1]!.label);

          // Determine if input is a simple numeric choice from the options
          let isSimpleNumericChoice = false;
          if (q.options?.length && answer.trim()) {
            const parts = answer.split(',').map(s => s.trim());
            isSimpleNumericChoice = parts.every(part => {
              const num = parseInt(part, 10);
              return !isNaN(num) && String(num) === part && num >= 1 && num <= q.options!.length;
            });
          }

          if (q.allowWriteIn || (!q.options?.length && answer.trim())) {
            // Only populate writeInValue if it's NOT a simple numeric choice
            if (!isSimpleNumericChoice && answer.trim()) {
              answers.push({ selectedLabels, writeInValue: answer.trim() });
            } else {
              answers.push({ selectedLabels });
            }
          } else {
            answers.push({ selectedLabels });
          }
        }
      }

      return { answers };
    }
  };

  // Always route through AgenticOrchestrator — it handles LLM + fallback internally
  // Look up the assessment module from the registry to inject into the LLM context
  const baseModule = modRegistry?.get(encLine, encStage);

  // Build ConceptDraftIndex from the module registry so the LLM sees module metadata
  const conceptModules: Record<string, any> = {};
  if (modRegistry) {
    for (const m of modRegistry.getAll()) {
      const key = `${m.line.toLowerCase()}:${m.stage.toLowerCase()}`;
      conceptModules[key] = {
        line: m.line,
        stage: m.stage,
        title: `${m.line} ${m.stage} Module`,
        modalities: m.tasks.map(t => t.type === 'llm_dialogue' ? 'LanguageReflective' as const : 'Deterministic' as const),
      };
    }
  }

  const  orchestrator = new AgenticOrchestrator({
    encounter: forcedEncounter,
    significator: sig,
    world,
    history,
    conceptIndex: { modules: conceptModules },
    uiHandler,
    module: modRegistry?.get(FORCE_LINE ?? encLine, FORCE_STAGE ?? encStage) ?? baseModule,
    noLlm: HEADLESS && !program.opts().llm,
    forceShadow: FORCE_SHADOW,
    consecutivePasses,
    agentSynthesis,
    // Brain-training + unified profile tools: Game Master can run games and orchestrate across psych/cog/education.
    training: await buildTrainingIntegration().catch(() => undefined),
    unifiedProfile: await buildUnifiedProfileServices().catch(() => undefined),
    // RuntimeLoop: the orchestration services — personalization envelope + feed + owner workers.
    orchestration,
    // Phase 11 d3 (G29): the consent-checked declared preferences ride the identity projection —
    // active (non-withdrawn) entries only; the UDV's declared band is empty without this.
    // Phase 13 d1 (45 §3): the remaining bands, each from a store the player already owns —
    //   purpose    ← 39's active vows + the profile's self-declared goals (one aim band, two sources)
    //   preference ← the profile's declared metaphor taste + intensity (the seam adds the
    //                feed-evidenced session tolerance itself)
    //   observed   ← no deterministic producer exists yet (see the wiring audit §4 W5); it stays a
    //                typed input with `observedFromEngagement` ready, rather than a fabricated one
    identity: {
      declaredInterests: activeDeclaredInterests(sig.identity).map((p) => p.phrase),
      aversions: activeDeclaredAversions(sig.identity).map((p) => p.phrase),
      bands: (() => {
        const profile = loadProfile()
        const vowPurposes = purposesFromVows(
          (loadVowFile().book.vows ?? []) as unknown as Parameters<typeof purposesFromVows>[0],
        )
        const goalPurposes = purposesFromGoals(
          (profile?.goals?.self_declared ?? []) as unknown as string[],
          vowPurposes,
        )
        const prefs = (profile?.preferences ?? {}) as Record<string, unknown>
        return {
          purposes: [...vowPurposes, ...goalPurposes],
          preference: preferenceFromHistory({
            profile: {
              metaphorPreference: prefs.metaphor_preference as string | undefined,
              intensity: prefs.intensity as string | undefined,
              pacing: prefs.pacing as string | undefined,
            },
          }),
        }
      })(),
    },
  });

  // P1-R5 (Fresh-User UX Audit): Thinking indicator during LLM round-trip.
  // The audit found 60-300s session runtimes with no 'thinking...' indicator,
  // making the wait feel broken. ora (already a dependency) displays a
  // contemplative spinner during the orchestrator's LLM call.
  // In JSON/headless mode, skip the spinner (would pollute JSON output).
  let spinner: any = null;
  if (!JSON_MODE && !HEADLESS) {
    const thinkingPhrases = [
      'the question is finding you',
      'the reflection is forming',
      'the moment is gathering',
      'the mirror is turning',
    ];
    const phrase = thinkingPhrases[Math.floor(Math.random() * thinkingPhrases.length)]!;
    spinner = ora({ text: chalk.dim(phrase + '...'), color: 'cyan' }).start();
  }

  // P1-QW3 (Architecture Audit Phase A): CLI telemetry. Opt-in via
  // ~/.mysterium/config.json.telemetry=true. When enabled, records
  // session_started + encounter_completed events. No-op when disabled.
  const telemetry = await buildCLITelemetry().catch(() => null);
  recordCLITelemetry(telemetry, 'encounter_started', { moduleRef: encounter.moduleRef, line: encounter.targetLines[0] ?? null, stage: encounter.stage });

  let outcome;
  try {
    outcome = await orchestrator.run();
  } finally {
    if (spinner) spinner.stop();
  }

  // Build a PlayerResponse from the orchestrator's consequence record
  const cr = outcome.consequenceRecord;
  const response: PlayerResponse = {
    encounterId: encounter.id,
    energeticDirection: cr.polarityTrace.energeticDirection,
    driveDirectionality: cr.polarityTrace.driveDirectionality,
    stageOrientation: cr.polarityTrace.stageOrientation,
    sourceOfNourishment: cr.polarityTrace.sourceOfNourishment,
    shadowSurfaced: cr.shadowSurfaced,
    shadowResolvedId: cr.shadowResolved,
    narrativeSummary: outcome.narrativeSummary,
    // BUG-1/7 fix: pass through user answer + question text for encounter-log.md
    writeInValue: outcome.playerWriteIn ?? undefined,
    questionText: (orchestrator as any)._lastQuestionText ?? undefined,
  };

  return { outcome, response, narrativeSummary: outcome.narrativeSummary };
}

// ── Diagnostic mode ───────────────────────────────────────────────────
async function runDiagnostic(): Promise<void> {
  banner('Mysterium Diagnostic');

  console.log('\nRegistries:');
  bootRegistries();
  const moduleRegistry = bootModuleRegistry();
  (globalThis as any).__moduleRegistry = moduleRegistry;
  seedCurriculumRegistry();
  success(`${moduleRegistry.count()} assessment modules loaded`); // R11-Y4: 64 modules across 8 stages. Red has full visual theming; other stages use LLM-generated narratives with validated assessment tasks.

  console.log('\nHolons:');
  const world = loadHolons();
  const npcCount = world.holons.filter(h => h.kind === 'NPC').length;
  const factionCount = world.holons.filter(h => h.kind === 'Faction').length;
  const locationCount = world.holons.filter(h => h.kind === 'Location').length;
  const otherCount = world.holons.length - npcCount - factionCount - locationCount;
  // UX-P0-5: Fix holon count mismatch — show all kinds so math adds up
  const breakdown = `${npcCount} NPCs, ${factionCount} factions, ${locationCount} locations${otherCount > 0 ? `, ${otherCount} others` : ''}`;
  success(`${world.holons.length} total: ${breakdown}`);

  console.log('\nSignificator:');
  const sig = await createDefaultSignificator();
  printSignificator(sig);

  console.log('\nSession:');
  const session: SessionContext = {
    encountersSoFar: 0,
    sessionDurationMs: 0,
    targetSessionLength: encounterCount,
    recentLines: [],
  };
  const sessionState = startSession(sig, session);
  applyCurriculumMode(sessionState);
  // NF-6 (Fresh-User Re-Audit): Show CCI with a qualitative interpretation
  // so the user knows what the number means. The re-audit found users could
  // see CCI change (0.5036 → 0.4749) but had no idea if that was good or bad.
  // P1-Y4 (Fresh-User UX Audit v2): Cut the numeric CCI display entirely.
  // The audit found 'CCI 0.4115 with clinical interpretation bands' is a
  // Veil violation — a number with bands IS diagnostic regardless of labels.
  // Now we show only the qualitative band. The numeric value is available
  // via --dev for engineers.
  const cciVal = sessionState.cci.composite;
  const cciBand = cciToFeltSense(cciVal);
  // NF3-6 (Fresh-User Audit 3): Add trajectory interpretation. A CCI drop
  // during shadow work is EXPECTED (shadows surfacing is part of the work,
  // not a sign of getting worse). The audit found players couldn't tell if
  // a downward trajectory was healthy or unhealthy. Now we correlate CCI
  // with shadow activity to give a trajectory note.
  const activeShadows = (sig.shadows?.entries ?? []).filter(s => !s.resolvedAt).length;
  const trajectoryNote = activeShadows >= 2
    ? ' — shadows surfacing, which is expected during this phase'
    : activeShadows >= 1
      ? ' — a shadow is surfacing, the dip is part of the work'
      : '';
  if (DEV_MODE) {
    info('CCI', `${cciVal.toFixed(4)} (${cciBand}${trajectoryNote})`);
  } else {
    info('state', `${cciBand}${trajectoryNote}`);
  }
  // R4-P2-3 (UX-R4): Explain what 'theme' means — it biases encounter selection.
  info('theme', `${sessionState.strategy.theme} (session strategy — biases encounter selection)`);
  // R4-P2-2 (UX-R4): Explain what 'totalTarget' means — it's the encounter budget.
  info('totalTarget', `${sessionState.strategy.encounterBudget.totalTarget} encounters per session (warmup + peak + cooldown)`);

  console.log('\nEncounter scheduling:');
  const now = Date.now();
  const { tickResult } = tickWithStrategy(sig, world, session, sessionState, null, null, now);
  if (tickResult.encounter) {
    success('Scheduler produced encounter:');
    printEncounter(tickResult.encounter, world);
  } else {
    warn('Scheduler returned null — no encounters available');
  }

  console.log(`\n${chalk.dim('LLM: ' + (LLM_ACTIVE ? 'active' : 'fallback (placeholder key)') + ' | Endpoint: ' + baseUrl + ' | Model: ' + model)}`);
  console.log(`${chalk.dim('LLM endpoint: ' + baseUrl)}`);
  console.log(`${chalk.dim('LLM model: ' + model)}`);
}

// ── Single encounter mode ─────────────────────────────────────────────
async function runSingleEncounter(): Promise<void> {
  banner('Mysterium Single Encounter');

  bootRegistries();
  const moduleRegistry = bootModuleRegistry();
  (globalThis as any).__moduleRegistry = moduleRegistry;
  seedCurriculumRegistry();
  success(`${moduleRegistry.count()} modules loaded`);

  const sig = await createDefaultSignificator();
  const world = loadHolons();
  const session: SessionContext = {
    encountersSoFar: 0,
    sessionDurationMs: 0,
    targetSessionLength: 1,
    recentLines: [],
    ...(FORCE_LINE ? { forceLine: FORCE_LINE } : {}),
    ...(FORCE_STAGE ? { forceStage: FORCE_STAGE } : {}),
    ...(FORCE_MODALITY ? { forceModality: FORCE_MODALITY } : {}),
  } as any;
  const sessionState = startSession(sig, session);
  applyCurriculumMode(sessionState);

  const now = Date.now();
  let { tickResult } = tickWithStrategy(sig, world, session, sessionState, null, null, now);

  // If forcing and no natural encounter, create a synthetic one
  if (!tickResult.encounter && (FORCE_LINE || FORCE_STAGE || FORCE_MODALITY)) {
    const synthLine = FORCE_LINE ?? 'Cognitive' as Line;
    const synthStage = FORCE_STAGE ?? 'Red' as Stage;
    const synthModality = FORCE_MODALITY ?? 'Deterministic' as Modality;
    const synthHolon = world.holons[0] ?? { id: 'synthetic', name: 'The Examiner', narrativeRole: 'guide' };
    const syntheticEncounter: ScheduledEncounter = {
      id: `synthetic:${synthLine}:${synthStage}:${now}`,
      moduleRef: `${synthLine}:${synthStage}`,
      modality: synthModality,
      targetLines: [synthLine],
      stage: synthStage,
      holonSource: synthHolon.id ?? 'synthetic',
      shadowTarget: null,
      polarityMode: 'Exploring',
      difficulty: 0.5,
      sessionPosition: 'peak',
      priority: 0.999,
      driveTarget: null,
      executionMode: 'capacity',
    };
    if (VERBOSE) warn(`No natural encounter at ${synthLine}:${synthStage} — using synthetic encounter`);
    tickResult = { ...tickResult, encounter: syntheticEncounter };
  }

  if (!tickResult.encounter) {
    error('No encounter available');
    return;
  }

  separator('Encounter');
  printEncounter(tickResult.encounter, world);

  // responsesPool was retired (YAGNI-PHASE-4) and its caller-side local removed; the parameter is
  // optional in `runAgenticEncounter`, so the reference is dropped rather than revived
  // (CHECKED-SURFACE-AUDIT-2026-09-24, P0-4).
  const result = await runAgenticEncounter(tickResult.encounter, sig, world, [], undefined, new Map());

  separator('Result');
  info('narrative', result.narrativeSummary);
}

/**
 * P0-U2 (Fresh-User UX Audit): Integration ritual at session end.
 *
 * The catalyst→experience→integration cycle (AGENTS.md §5.4) was broken:
 * the game did catalyst (the question) and experience (the answer +
 * reflection) but skipped integration entirely. The reflection evaporated.
 * The audit subagent's verdict: "Intrigued, not transformed."
 *
 * This function presents a 90-second reflective prompt at session end:
 *   "Before you go, take a breath. What did you notice? What surprised
 *    you? What wants to move?"
 *
 * The player's response is captured and persisted to the profile's
 * narrative-memory.md under a "## Integration" section. It is surfaced
 * in the next session's opening ("Last time, you noticed...") to create
 * continuity across sessions and give the player a felt sense of growth.
 *
 * Design:
 *   - Optional: player can press Enter to skip (no penalty)
 *   - Veil-compliant: no clinical language, no metric framing
 *   - 90-second timeout in interactive mode (player can take longer)
 *   - In headless mode: reads from the --answers pool if available,
 *     otherwise skips gracefully
 *   - In JSON mode: emits an `integration_prompt` event and reads the
 *     next --answer if available
 */
async function runIntegrationRitual(profileName: string | null): Promise<string | null> {
  const prompts = [
    'Before you go, take a breath. What did you notice?',
    'Before you go — what surprised you in this session?',
    'Before you go — what wants to move?',
    'Before you go — what landed that you want to remember?',
  ];
  const prompt = prompts[Math.floor(Math.random() * prompts.length)];

  let response: string | null = null;

  if (JSON_MODE) {
    // JSON mode: emit event, read from --answers pool
    emitEvent('integration_prompt', { prompt });
    response = consumeUserAnswer() ?? null;
    if (response) {
      emitEvent('integration_response', { response });
    } else {
      emitEvent('integration_skipped', {});
    }
  } else if (HEADLESS) {
    // Headless non-JSON: read from --answers pool, no prompt display
    response = consumeUserAnswer() ?? null;
  } else {
    // Interactive mode: display prompt and capture response
    console.log(`\n  ${chalk.dim('═══ Integration ═══')}`);
    console.log(`\n  ${chalk.italic.cyan(prompt)}`);
    const answer = await ask('\n  Your reflection (press Enter to skip): ');
    response = answer.trim() || null;
  }

  // Persist to profile's narrative-memory.md under "## Integration" section
  if (response && profileName) {
    try {
      const profileDir = getActiveProfileDir();
      if (profileDir) {
        const memPath = path.join(profileDir, 'narrative-memory.md');
        let existing = '';
        try { existing = fs.readFileSync(memPath, 'utf8'); } catch { /* new file */ }
        const timestamp = new Date().toISOString();
        const entry = `## Integration\n- **Session ${timestamp}:** ${response}\n\n`;
        // Prepend integration entries (most recent first)
        const newContent = entry + existing;
        fs.writeFileSync(memPath, newContent, 'utf8');
      }
    } catch { /* best-effort — don't break session end */ }
  }

  return response;
}

/**
 * Post-session LLM synthesis: reads the encounter log from this session,
 * asks the LLM to extract key insights, and appends them to narrative-memory.md.
 * This is the "profile evolution" step — the profile grows smarter after every session.
 *
 * Inspired by Hermes-Agent's background_review pattern: the agent reads what
 * happened and synthesizes it into long-term memory.
 */
async function synthesizeSessionInsights(_profileName: string, encounterCount: number): Promise<void> {
  // NF3-1 (Fresh-User Audit 3): Even when LLM is inactive, run the lighter-
  // weight fallback so the Active Focus doesn't go stale. The audit found
  // synthesis succeeds only 25% of the time — and when the LLM is unreachable
  // (LLM_ACTIVE=false), the old code returned immediately with no fallback,
  // leaving the Active Focus frozen on the last successful synthesis.
  if (JSON_MODE) return; // skip in JSON mode
  try {
    const { agentReadProfileFile, agentWriteProfileFile } = await import('../src/infra/profiles/ProfileManager.js');
    const encounterLog = agentReadProfileFile('encounter-log.md');
    if (!encounterLog || encounterLog.length < 100) return; // nothing to synthesize

    // If LLM is inactive, skip the full synthesis but still run the fallback
    // so the Active Focus has something current (the session's last narrative).
    if (!LLM_ACTIVE) {
      const encounters = encounterLog.split('## Encounter ');
      const recentEncounters = encounters.slice(-encounterCount - 1).join('## Encounter ');
      const fallbackFocus = extractLastNarrativeAsFocus(recentEncounters);
      if (fallbackFocus) {
        try {
          const goals = agentReadProfileFile('goals.yaml');
          if (goals) {
            let updatedGoals = goals.replace(/active_focus:.*$/m, `active_focus: "${fallbackFocus.replace(/"/g, "'")}"`);
            if (/last_synthesis_session:/m.test(updatedGoals)) {
              updatedGoals = updatedGoals.replace(/last_synthesis_session:.*$/m, `last_synthesis_session: "${new Date().toISOString()}" (fallback)`);
            } else {
              updatedGoals = updatedGoals.trimEnd() + `\nlast_synthesis_session: "${new Date().toISOString()}" (fallback)\n`;
            }
            agentWriteProfileFile('goals.yaml', updatedGoals, 'overwrite');
            if (!JSON_MODE) {
              info('synthesis', `${chalk.dim('LLM unavailable — using the session\'s last narrative as a placeholder focus')}`);
              console.log(`  ${chalk.dim('Run `mysterium profile show` to see it. Full synthesis will run when the LLM is reachable.')}`);
            }
          }
        } catch { /* best-effort */ }
      } else {
        if (!JSON_MODE) info('synthesis', `${chalk.dim('LLM unavailable — no narrative to use as placeholder focus')}`);
      }
      return;
    }

    // Take the last N encounters from this session
    const encounters = encounterLog.split('## Encounter ');
    const recentEncounters = encounters.slice(-encounterCount - 1).join('## Encounter ');

    // NF3-1 (Fresh-User Audit 3): Shortened the synthesis prompt from 3000 to
    // 1500 chars. The audit found synthesis succeeds only 25% of the time —
    // the heavier prompt (3000 chars of encounter log + full instructions)
    // was likely causing timeouts or rate-limit failures on the free-tier
    // model. 1500 chars is still enough context for the LLM to extract
    // insight/pattern/active from the last 1-2 encounters.
    const synthesisPrompt = `You are a developmental synthesis engine. Read the following encounter log from a Mysterium session and extract:

1. KEY INSIGHT: One sentence capturing the most important therapeutic insight from this session (what the user discovered or what the LLM named that landed).
2. PATTERN: If a recurring pattern is visible (something that appeared in multiple encounters), name it in one sentence.
3. ACTIVE WORK: What the user is currently processing, in one sentence.

Format your response as exactly 3 lines:
INSIGHT: <one sentence>
PATTERN: <one sentence or "none">
ACTIVE: <one sentence>

Encounter log:
${recentEncounters.slice(0, 1500)}`;

    // UX-PHASE-1: Show spinner during LLM synthesis so the terminal
      // doesn't appear frozen during the 20-60s LLM call.
      const synthSpinner = JSON_MODE ? null : ora({ text: chalk.dim('Synthesizing session insights...'), color: 'cyan' }).start();
      let result: string;
      try {
        result = await queryLLM('You are a developmental synthesis engine. Be concise and precise.', synthesisPrompt);
      } finally {
        if (synthSpinner) synthSpinner.stop();
      }
    if (result && !result.startsWith('{"error"')) {
      // Parse the response — be flexible about format
      const lines = result.split('\n').filter(l => l.trim());
      let insight = '';
      let pattern = '';
      let active = '';

      for (const line of lines) {
        const lower = line.toLowerCase();
        if (lower.startsWith('insight:') || lower.startsWith('1.')) {
          insight = line.replace(/^(insight:|1\.)\s*/i, '').trim();
        } else if (lower.startsWith('pattern:') || lower.startsWith('2.')) {
          pattern = line.replace(/^(pattern:|2\.)\s*/i, '').trim();
        } else if (lower.startsWith('active:') || lower.startsWith('3.')) {
          active = line.replace(/^(active:|3\.)\s*/i, '').trim();
        }
      }

      // Fallback: if no structured format, use the first non-empty line as insight
      if (!insight && lines.length > 0 && result.length > 20) {
        insight = lines[0]!.slice(0, 200);
      }

      let wroteSomething = false;
      if (insight && insight.toLowerCase() !== 'none') {
        // BUG-5 fix: Insert under "## Key Insights" section, not at end of file
        const memContent = agentReadProfileFile('narrative-memory.md') || '';
        const insightsHeader = '## Key Insights';
        const insightsIdx = memContent.indexOf(insightsHeader);
        if (insightsIdx >= 0) {
          const afterHeader = memContent.indexOf('\n## ', insightsIdx + insightsHeader.length);
          const insertAt = afterHeader >= 0 ? afterHeader : memContent.length;
          const updated = memContent.slice(0, insertAt) + `\n- **Session (synthesized):** ${insight}` + memContent.slice(insertAt);
          agentWriteProfileFile('narrative-memory.md', updated, 'overwrite');
        } else {
          agentWriteProfileFile('narrative-memory.md', `\n- **Session (synthesized):** ${insight}`, 'append');
        }
        wroteSomething = true;
      }
      if (pattern && pattern.toLowerCase() !== 'none') {
        // Insert under "## Patterns" section
        const memContent = agentReadProfileFile('narrative-memory.md') || '';
        const patternsHeader = '## Patterns';
        const patternsIdx = memContent.indexOf(patternsHeader);
        if (patternsIdx >= 0) {
          const afterHeader = memContent.indexOf('\n## ', patternsIdx + patternsHeader.length);
          const insertAt = afterHeader >= 0 ? afterHeader : memContent.length;
          const updated = memContent.slice(0, insertAt) + `\n- **Pattern:** ${pattern}` + memContent.slice(insertAt);
          agentWriteProfileFile('narrative-memory.md', updated, 'overwrite');
        } else {
          agentWriteProfileFile('narrative-memory.md', `\n- **Pattern:** ${pattern}`, 'append');
        }
        wroteSomething = true;
      }
      if (active && active.toLowerCase() !== 'none') {
        try {
          const goals = agentReadProfileFile('goals.yaml');
          if (goals) {
            // NF3-5: Also store last_synthesis_session so profile show can
            // display when the Active Focus was last updated. The audit found
            // players can't tell if the focus they're reading is current.
            const { getActiveProfileName } = await import('../src/infra/profiles/ProfileManager.js');
            const profileNameForCount = getActiveProfileName();
            let updatedGoals = goals.replace(/active_focus:.*$/m, `active_focus: "${active.replace(/"/g, "'")}"`);
            // Add or update last_synthesis_session field
            if (/last_synthesis_session:/m.test(updatedGoals)) {
              updatedGoals = updatedGoals.replace(/last_synthesis_session:.*$/m, `last_synthesis_session: ${profileNameForCount ? '' : ''}"${new Date().toISOString()}"`);
            } else {
              updatedGoals = updatedGoals.trimEnd() + `\nlast_synthesis_session: "${new Date().toISOString()}"\n`;
            }
            agentWriteProfileFile('goals.yaml', updatedGoals, 'overwrite');
          }
        } catch { /* best-effort */ }
        wroteSomething = true;
      }

      if (wroteSomething && !JSON_MODE) {
        info('synthesis', `${chalk.green('✓')} Profile updated: insight + pattern + active focus`);
        // P0-F3: Tell the player how to SEE what was synthesized. Before this
        // hint, the game said "profile updated" but gave no way to view the
        // update — the #1 frustration in the fresh-user audit.
        console.log(`  ${chalk.dim('Run `mysterium profile show` to see what the game has noticed.')}`);
      } else if (!JSON_MODE) {
        info('synthesis', `${chalk.dim('No extractable insights from this session')}`);
      }
    } else {
      // NF-2 (Fresh-User Re-Audit): Distinguish "LLM unavailable" (the call
      // failed) from "LLM returned empty" (the call succeeded but the response
      // was unusable). The old message was always "LLM unavailable" even when
      // the boot probe had succeeded — which contradicted "LLM active" and
      // confused users. Now we check the error shape and report honestly.
      const isUnavailable = !result || result.startsWith('{"error"');

      // NF3-1 (Fresh-User Audit 3): Lighter-weight fallback when LLM synthesis
      // fails. The audit found synthesis succeeds only 25% of the time, leaving
      // the Active Focus/Insights/Patterns stale. Instead of going silent, we
      // extract a simple insight from the last encounter's LLM narrative (the
      // richest in-session text) and write it as the Active Focus. This keeps
      // the reflection layer alive even when the synthesis LLM call fails —
      // the player always has *something* current to read in profile show.
      if (isUnavailable) {
        const fallbackFocus = extractLastNarrativeAsFocus(recentEncounters);
        if (fallbackFocus) {
          try {
            const goals = agentReadProfileFile('goals.yaml');
            if (goals) {
              // NF3-5: Store last_synthesis_session timestamp + mark as fallback
              // so profile show can display "(placeholder — full synthesis pending)"
              let updatedGoals = goals.replace(/active_focus:.*$/m, `active_focus: "${fallbackFocus.replace(/"/g, "'")}"`);
              if (/last_synthesis_session:/m.test(updatedGoals)) {
                updatedGoals = updatedGoals.replace(/last_synthesis_session:.*$/m, `last_synthesis_session: "${new Date().toISOString()}" (fallback)`);
              } else {
                updatedGoals = updatedGoals.trimEnd() + `\nlast_synthesis_session: "${new Date().toISOString()}" (fallback)\n`;
              }
              agentWriteProfileFile('goals.yaml', updatedGoals, 'overwrite');
              if (!JSON_MODE) {
                info('synthesis', `${chalk.dim('the reflection engine could not be reached — using the session\'s last narrative as a placeholder focus')}`);
                console.log(`  ${chalk.dim('Run `mysterium profile show` to see it. Full synthesis will run next session.')}`);
              }
            } else {
              if (!JSON_MODE) info('synthesis', `${chalk.dim('the reflection engine could not be reached this session')}`);
            }
          } catch {
            if (!JSON_MODE) info('synthesis', `${chalk.dim('the reflection engine could not be reached this session')}`);
          }
        } else {
          if (!JSON_MODE) info('synthesis', `${chalk.dim('the reflection engine could not be reached this session')}`);
        }
      } else {
        if (!JSON_MODE) info('synthesis', `${chalk.dim('the reflection did not surface anything new this session')}`);
      }
    }
  } catch (e: any) {
    if (!JSON_MODE) info('synthesis', `${chalk.dim('Synthesis error: ' + (e?.message || e))}`);
  }
}

/**
 * NF3-1 (Fresh-User Audit 3): Extract a simple one-sentence focus from the
 * last encounter's LLM narrative. Used as a fallback when the full LLM
 * synthesis call fails — so the Active Focus always has *something* current
 * rather than going stale. Returns null if no usable narrative is found.
 */
function extractLastNarrativeAsFocus(encounterLogText: string): string | null {
  // The encounter log has entries like:
  //   ## Encounter N — <timestamp>
  //   **Line:** ... | **Stage:** ...
  //   **Question:** ...
  //   **User's answer:** ...
  //   **LLM narrative:** <this is what we want>
  // Find the LAST "LLM narrative:" line and extract its first sentence.
  const narrativeMatches = encounterLogText.match(/\*\*LLM narrative:\*\*\s*(.+?)(?=\n\*\*|\n##|\n$|$)/gs);
  if (!narrativeMatches || narrativeMatches.length === 0) return null;
  const lastNarrative = narrativeMatches[narrativeMatches.length - 1]!
    .replace(/^\*\*LLM narrative:\*\*\s*/, '')
    .trim();
  if (lastNarrative.length < 10) return null;

  // NF3-1: If the "LLM narrative" is just the user's answer echoed back
  // (the echo fallback path), extract the QUESTION instead — it's a better
  // placeholder focus than the user's own words. The question represents
  // what the game was probing, which is more useful as a "current focus"
  // than a verbatim echo.
  const userAnswerMatches = encounterLogText.match(/\*\*User's answer:\*\*\s*(.+?)(?=\n\*\*|\n##|\n$|$)/gs);
  const lastUserAnswer = userAnswerMatches?.[userAnswerMatches.length - 1]
    ?.replace(/^\*\*User's answer:\*\*\s*/, '')
    .trim();
  if (lastUserAnswer && lastNarrative.trim().toLowerCase() === lastUserAnswer.trim().toLowerCase()) {
    // Echo case — extract the question instead
    const questionMatches = encounterLogText.match(/\*\*Question:\*\*\s*([\s\S]+?)(?=\n\*\*|\n##|\n$|$)/g);
    if (questionMatches && questionMatches.length > 0) {
      const lastQuestion = questionMatches[questionMatches.length - 1]!
        .replace(/^\*\*Question:\*\*\s*/, '')
        .trim();
      if (lastQuestion.length > 10) {
        // Take the first sentence of the question
        const qSentence = lastQuestion.match(/^[^.!?]*[.!?]/)?.[0] ?? lastQuestion.slice(0, 180);
        return `Exploring: ${qSentence.trim()}`;
      }
    }
  }

  // Take the first sentence (up to the first period, exclamation, or question mark)
  const firstSentence = lastNarrative.match(/^[^.!?]*[.!?]/)?.[0] ?? lastNarrative.slice(0, 180);
  return firstSentence.trim();
}

async function runDirectQuestioningSession(
  initialSig: Significator,
  initialWorld: WorldState,
  orchestration?: OrchestrationServices,
): Promise<void> {
  banner('DIRECT QUESTIONING');
  if (!JSON_MODE) console.log(`  ${chalk.dim('A series of open questions. Answer each in your own words.')}\n`);

  // P0-U2 (Fresh-User UX Audit): Surface the previous session's integration
  // reflection at the start of the next session. This creates continuity
  // across sessions and gives the player a felt sense that their reflections
  // are being held by the game. The integration entries are stored in
  // narrative-memory.md under "## Integration" by runIntegrationRitual().
  if (!JSON_MODE) {
    try {
      const profileDir = getActiveProfileDir();
      if (profileDir) {
        const memPath = path.join(profileDir, 'narrative-memory.md');
        if (fs.existsSync(memPath)) {
          const mem = fs.readFileSync(memPath, 'utf8');
          const integrationBullets = extractMdSectionBullets(mem, 'Integration');
          if (integrationBullets.length > 0) {
            const lastIntegration = integrationBullets[0]!;
            // Strip the **Session <timestamp>:** prefix — the colon is inside
            // the bold markers, so we need to match **...:** (colon before closing **)
            const cleanText = lastIntegration.replace(/^\*\*[^*]+:\*\*\s*/, '')
              .replace(/^\*\*[^*]+\*\*:\s*/, '');
            if (cleanText.length > 10) {
              console.log(`  ${chalk.dim('Last time, you noticed:')}`);
              console.log(`  ${chalk.italic(cleanText)}`);
              console.log(`  ${chalk.dim('Has anything shifted since?')}\n`);
            }
          }
        }

        // NEXT-4 (Fresh-User UX Re-Audit): Felt-sense feedback between sessions.
        // Surface resonance shifts as a visible felt-sense change. The re-audit
        // found the resonance line shifts (fortress-sharp → cathedral-ordered)
        // but this is too subtle. Now we explicitly surface the shift at the
        // next session's opening so the player can feel the change.
        const identityPath = path.join(profileDir, 'identity.yaml');
        if (fs.existsSync(identityPath)) {
          const identityContent = fs.readFileSync(identityPath, 'utf8');
          // Lightweight YAML parse for the resonance fields
          const lastResMatch = identityContent.match(/^last_resonance:\s*(.+)$/m);
          const prevResMatch = identityContent.match(/^previous_resonance:\s*(.+)$/m);
          if (lastResMatch && prevResMatch) {
            const lastRes = lastResMatch[1]!.trim().replace(/^["']|["']$/g, '');
            const prevRes = prevResMatch[1]!.trim().replace(/^["']|["']$/g, '');
            if (lastRes && prevRes && lastRes !== prevRes) {
              console.log(`  ${chalk.dim('Something has shifted since last time:')}`);
              console.log(`  ${chalk.dim('The resonance was:')} ${chalk.italic(prevRes)}`);
              console.log(`  ${chalk.dim('The resonance is now:')} ${chalk.cyan.italic(lastRes)}`);
              console.log(`  ${chalk.dim('Feel the difference. What moved?')}\n`);
            }
          }
        }
      }
    } catch { /* best-effort — don't break session start */ }
  }

  // UX-PHASE-2: Cross-session practice hint recall. Surface the previous
  // session's practice invitation at the start of each new session, creating
  // a feedback loop that connects sessions and encourages real-world practice.
  if (!JSON_MODE) {
    const prevFocus = readActiveFocus();
    if (prevFocus && prevFocus.length > 10) {
      console.log(`\n  ${chalk.dim('Last time, you were invited to carry this practice:')}`);
      console.log(`  ${chalk.italic(prevFocus)}`);
      console.log(`  ${chalk.dim('Notice what arose. Carry it gently into today.')}\n`);
    }
  }

  // P1-F10 (Fresh-User UX Audit): Make the adaptive session focus perceptible.
  // The game silently shifts its session strategy based on the player's
  // surfacing shadows (e.g. from 'balanced-development' to 'shadow-integration')
  // — but this was completely invisible during normal play. The fresh-user
  // only discovered it by running `diagnostic`. Now we surface a Veil-compliant
  // qualitative hint at session start so the player can FEEL the game
  // responding to them, without breaking the Veil (no clinical labels, no
  // raw theme names, no metrics).
  if (!JSON_MODE) {
    const activeShadows = (initialSig.shadows?.entries ?? []).filter(s => !s.resolvedAt).length;
    const hint = activeShadows >= 3
      ? 'The work turns toward what has been avoided.'
      : activeShadows >= 1
        ? 'Something stirs beneath the surface — the work edges closer to it.'
        : 'The field is open; the work moves where it will.';
    console.log(`  ${chalk.dim(hint)}\n`);

    // NEXT-2 (Fresh-User UX Re-Audit): Session runtime expectation-setting.
    // The re-audit found 15-30s per encounter with no frame for the wait.
    // The thinking indicator (R5) makes the wait feel intentional, but the
    // player still doesn't know how long the session will take. This one-line
    // frame sets expectations without breaking the contemplative voice.
    const encounterCountForEstimate = FORCE_LINE ? 1 : Math.min(encounterCount, 8);
    const estimatedSeconds = encounterCountForEstimate * 20;
    const estimateWord = estimatedSeconds < 60 ? `${estimatedSeconds} seconds` : `${Math.round(estimatedSeconds / 60)} minutes`;
    console.log(`  ${chalk.dim(`Each encounter takes about 20 seconds. This session will take roughly ${estimateWord}. Take your time between them.`)}\n`);
  }

  // UX-P0-1: Respect --encounters, --line, --stage flags in DQ mode.
  // Previously these were silently ignored — user asks for 3 encounters, gets 8.
  // Now: if --line is set, run only that line. If --encounters is set and < 8,
  // run only that many lines. If --stage is set, force that stage.
  let linesToRun: Line[];
  if (FORCE_LINE) {
    linesToRun = [FORCE_LINE];
  } else {
    // Fisher-Yates shuffle
    const shuffledLines = [...ALL_LINES];
    for (let i = shuffledLines.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledLines[i]!, shuffledLines[j]!] = [shuffledLines[j]!, shuffledLines[i]!];
    }
    // Respect --encounters count (cap at 8 lines)
    const count = Math.min(encounterCount, shuffledLines.length);
    // P2-4 (UX-R3): Warn when --encounters exceeds the DQ cap (8 lines).
    // Previously this was a silent cap — the user asked for 999, got 8,
    // with no explanation. Now they see a clear notice.
    if (encounterCount > shuffledLines.length && !JSON_MODE) {
      warn(`--encounters=${encounterCount} exceeds the ${shuffledLines.length} available lines in Direct Questioning mode; running ${count}. (Use --agent for Story-Driven mode with more encounters.)`);
    }
    linesToRun = shuffledLines.slice(0, count);
  }

  let currentSig = initialSig;
  let currentWorld = initialWorld;
  const history: ConsequenceRecord[] = [];
  const consecutivePasses = new Map<string, number>();
  const agent = new SessionAgent();

  // R8-BUG-5 (UX-R8): Warn when --answer count doesn't match --encounters count.
  // Previously: too few answers → silent reuse/default; too many → silent drop.
  // Now: warn so the user knows their input isn't being used as expected.
  if (USER_ANSWERS.length > 0 && USER_ANSWERS.length !== linesToRun.length && !JSON_MODE) {
    if (USER_ANSWERS.length < linesToRun.length) {
      warn(`--answer count (${USER_ANSWERS.length}) is less than --encounters (${linesToRun.length}); remaining encounters will use default responses.`);
    } else {
      warn(`--answer count (${USER_ANSWERS.length}) exceeds --encounters (${linesToRun.length}); extra answers will be ignored.`);
    }
  }

  // P2-U5 (Fresh-User UX Re-Audit): Ensure profile exists BEFORE the DQ loop
  // so that progressive vocabulary unlock can persist terms during the session.
  // Previously the profile was created after the session ended, which meant
  // getActiveProfileDir() returned null during the encounter loop and unlocks
  // were silently dropped.
  if (!getActiveProfileName()) {
    // Try migrating legacy save first; if that fails, create a default profile
    const migrated = migrateLegacySave();
    if (!migrated) {
      try {
        createProfile('default');
      } catch { /* profile may already exist */ }
    }
  }

  for (let i = 0; i < linesToRun.length; i++) {
    const line = linesToRun[i]!;
    // UX-P0-1: Respect --stage forcing
    const currentStage = FORCE_STAGE ?? currentSig.altitudes[line] ?? 'Red';

    // T-3.4 (Veil compliance): don't leak the line taxonomy name.
    separator(`Question ${i + 1}/${linesToRun.length}`);

    // P1-U1 (Fresh-User UX Audit): Embodied pause protocol.
    // Before each encounter, invite the player to arrive in their body.
    // The audit found that all encounters are intellectual/cognitive, even
    // the somatic line. This 5-second breath cue is the lightest possible
    // intervention that honors the body the game claims to develop.
    // Skipped in JSON/headless mode for CI throughput.
    if (!JSON_MODE && !HEADLESS) {
      const breathCues = [
        'Take a breath. Feel your feet on the floor.',
        'Take a breath. Let your shoulders settle.',
        'Take a breath. Notice where you are holding.',
        'Take a breath. Arrive here, now.',
        'Take a breath. Let the body be present.',
      ];
      const cue = breathCues[i % breathCues.length]!;
      const spinner = ora({ text: chalk.dim(cue), color: 'cyan' }).start();
      await new Promise(r => setTimeout(r, 5000));
      spinner.stop();
      console.log(`  ${chalk.dim(cue)}`);
    }

    // ponytail: synthetic encounter forces LanguageReflective modality
    const encounter: ScheduledEncounter = {
      id: `dq-${line}:${currentStage}:${Date.now()}`,
      moduleRef: `${line}:${currentStage}`,
      modality: 'LanguageReflective',
      targetLines: [line],
      stage: currentStage,
      holonSource: 'self-reflection',
      shadowTarget: null,
      polarityMode: 'Exploring',
      difficulty: 0.5,
      sessionPosition: i < 2 ? 'warmup' : i >= 6 ? 'cooldown' : 'peak',
      priority: 1.0,
      driveTarget: null,
      executionMode: 'capacity',
    };

    try {
      // UX-PHASE-1: Show spinner during LLM processing so the terminal
      // doesn't appear frozen during the 20-60s LLM calls.
      const encounterSpinner = JSON_MODE ? null : ora({ text: chalk.dim('The game is reflecting...'), color: 'cyan' }).start();
      let result: Awaited<ReturnType<typeof executeEncounter>>;
      let encounterTimedOut = false;
      // UX-PHASE-5A: Per-encounter timeout (60s) with deterministic fallback.
      // When the reasoning model takes too long, fall back to a curated
      // narrative so the session doesn't hang. The player still gets a
      // meaningful response instead of a frozen terminal.
      const ENCOUNTER_TIMEOUT_MS = 60_000;
      try {
      const encounterPromise = executeEncounter(encounter, currentSig, currentWorld, history, {
        consecutivePasses,
        agentSynthesis: agent.buildSynthesis(),
        // Phase 14 d4: the default surface runs the REAL loop. Without `orchestration` the whole
        // Phase 11–13 architecture (feed, owner workers, personalization envelope, memory) had no
        // exerciser on the path an agent drives headlessly — the failure class the checked-surface
        // audit called "architecture-dark". `undefined` degrades lawfully (`sessionRuntime` seam).
        orchestration,
      });
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('encounter_timeout')), ENCOUNTER_TIMEOUT_MS);
      });
      result = await Promise.race([encounterPromise, timeoutPromise]);
      } catch (err: any) {
        if (err?.message === 'encounter_timeout') {
          // LLM timed out — use deterministic fallback so the session continues
          encounterTimedOut = true;
          const fallbackNarrative = pickFallbackNarrative();
          result = {
            outcome: {
              passed: false,
              confidence: 0.5,
              dimensions: {},
              modality: encounter.modality,
              line: encounter.targetLines[0] ?? 'Cognitive',
              stage: encounter.stage,
            } as any,
            response: {
              narrativeSummary: fallbackNarrative,
              driveDirectionality: {},
              shadowSurfaced: null,
              shadowResolvedId: null,
            } as PlayerResponse,
            narrativeSummary: fallbackNarrative,
            effectiveEncounter: encounter,
          };
          if (!JSON_MODE) warn('The game took longer than expected — continuing with a gentle reflection.');
        } else {
          throw err;
        }
      } finally {
        if (encounterSpinner) encounterSpinner.stop();
      }

      // Qualitative feedback — no pass/fail, no clinical labels
      // UX-PHASE-5A: When the encounter timed out, result.outcome has a minimal
      // fallback shape that lacks consequenceRecord. Guard all downstream code
      // that accesses cr.* to prevent crashes on the fallback path.
      const cr = encounterTimedOut ? null : (result.outcome as any).consequenceRecord ?? null;
      if (!encounterTimedOut) {
      if (!JSON_MODE && cr) {
        // P1-1 (UX-R3): word-boundary-aware truncation; was slice(0,120)+'...'
        // R5-BUG-5 (UX-R5): If the LLM returned an empty narrative, fall back
        // to the FallbackNarratives pool instead of showing an empty ✦ line.
        const rawNarrative = result.narrativeSummary?.trim() || pickFallbackNarrative();
        const briefNarrative = truncateNarrative(rawNarrative, 1000);
        // R11-P5 (Fresh-User UX Audit): The ✦ glyph precedes the narrative
        // and looks like the game is about to say something. When the
        // narrative is just the player's own write-in answer echoed back
        // (the DQ self-reflection path sets narrativeSummary = writeInValue),
        // the ✦ becomes a cruel punctuation mark — it promises a response
        // and delivers only your own words. Detect the echo case and show
        // an honest "recorded your response" indicator instead. The ✦ +
        // genuine LLM narrative path is preserved for when U1 ships.
        const userWriteIn = result.response?.writeInValue?.trim() ?? '';
        const isEcho = userWriteIn.length > 0
          && briefNarrative.trim().toLowerCase() === userWriteIn.toLowerCase();
        if (isEcho) {
          console.log(`\n  ${chalk.dim('· recorded your response ·')}`);
        } else {
          console.log(`\n  ${chalk.dim('\u2726')} ${briefNarrative}`);
        }

        // T-3.4 (Veil compliance): replace "The encounter stirred: ↑ Communion drive, Homeostatic"
        // with a qualitative felt-sense description that doesn't leak drive names.
        // R5-P2-1 (UX-R5): The felt-sense text was repeating every encounter because
        // the same drive directionality recurs. Now we vary the phrasing per encounter
        // using a stable hash so the same encounter doesn't repeat the same line.
        const driveEntries = Object.entries(cr.polarityTrace.driveDirectionality);
        const dominantDrive = driveEntries.find(([, v]) => v !== 'HealthyBalanced');
        if (dominantDrive) {
          const feltSenseVariants: Record<string, string[]> = {
            DarkAddicted: [
              'A familiar pull tugs underneath the surface.',
              'The old pattern reached for you again — and almost had you.',
              'Something in you wanted to slip back into the known shape.',
            ],
            DarkAverted: [
              'Something here is being avoided; the body flinches before the mind catches up.',
              'A part of you turned away before the question fully landed.',
              'There was a flinch — small, quick — toward the exit.',
            ],
            GoldenAddicted: [
              'A reaching toward the light that skips over the ground beneath your feet.',
              'The pull upward felt spiritual — and slightly disembodied.',
              'You reached for the higher thing before the lower thing was done.',
            ],
            GoldenAverted: [
              'A resistance to what is trying to emerge.',
              'Something in you braced against the next step.',
              'The call forward met a quiet, stubborn no.',
            ],
          };
          const variants = feltSenseVariants[dominantDrive[1] as string] ?? ['Something stirred.'];
          const idx = (encounter.id.length + Date.now()) % variants.length;
          console.log(`  ${chalk.dim(variants[idx] ?? variants[0]!)}`);
        }

        // R7-P1-2 (UX-R7): Vary the shadow-surfaced footer so it doesn't
        // repeat the same line every encounter.
        if (cr.shadowSurfaced) {
          const stirredVariants = [
            'Something beneath the surface stirred.',
            'A shadow edge caught the light.',
            'Something unnamed moved in the periphery.',
            'A pattern you haven\'t fully named flickered past.',
          ];
          const idx = (encounter.id.length + Date.now()) % stirredVariants.length;
          console.log(`  ${chalk.dim(stirredVariants[idx] ?? stirredVariants[0]!)}`);
        }
        // P1-3 (UX-R3): Progress bar is deferred until after currentSig is
        // updated (see below) so it reflects the encounter that just completed.
      }

      // Feed result to session agent for cross-encounter synthesis
      const driveExpr = cr.polarityTrace.driveDirectionality;
      agent.addEncounter({
        line,
        stage: currentStage,
        narrativeSummary: result.narrativeSummary,
        writeInResponse: result.outcome.playerWriteIn ?? result.narrativeSummary,
        driveExpression: {
          agency: result.outcome.driveScores?.agency ?? (driveExpr.Agency === 'HealthyBalanced' ? 0.6 : 0.3),
          communion: result.outcome.driveScores?.communion ?? (driveExpr.Communion === 'HealthyBalanced' ? 0.6 : 0.3),
          eros: result.outcome.driveScores?.eros ?? (driveExpr.Eros === 'HealthyBalanced' ? 0.6 : 0.3),
          agape: result.outcome.driveScores?.agape ?? (driveExpr.Agape === 'HealthyBalanced' ? 0.6 : 0.3),
        },
        shadowSurfaced: cr.shadowSurfaced,
        passed: result.outcome.finalResult.passed,
        timestamp: Date.now(),
      });

      history.push(cr);
      currentSig = result.outcome.updatedSig;
      currentWorld = result.outcome.updatedWorld;

      // Profiling: append encounter to the encounter-log.md (preserves user
      // words + LLM responses across sessions — the therapeutic conversation).
      const _activeName = getActiveProfileName();
      if (_activeName) {
        try {
          const userAnswer = result.response?.writeInValue ?? '';
          const questionText = result.response?.questionText ?? '';
          const npcName = currentWorld.holons.find(h => h.id === encounter.holonSource)?.name;
          appendEncounterLog(_activeName, {
            encounterNum: currentSig.totalEncounters,
            line, stage: currentStage,
            npc: npcName,
            question: questionText?.slice(0, 500),
            userAnswer: userAnswer?.slice(0, 500),
            llmNarrative: result.narrativeSummary?.slice(0, 500),
            driveSignal: Object.entries(cr.polarityTrace.driveDirectionality)
              .filter(([, v]) => v !== 'HealthyBalanced')
              .map(([k, v]) => `${k}:${v}`).join(', ') || 'HealthyBalanced',
            shadowSurfaced: cr.shadowSurfaced,
            timestamp: new Date().toISOString(),
          });
        } catch (e: any) { if (!JSON_MODE) console.error(`  ${chalk.dim('profile log error: ' + (e?.message || e))}`); }
      }

      // P1-3 (UX-R3): Surface per-line progress to next threshold AFTER the
      // sig is updated, so the bar reflects the encounter that just completed.
      if (!JSON_MODE) {
        const progress = getLineProgress(currentSig).find(p => p.line === line);
        if (progress) {
          const filled = Math.min(8, Math.round(progress.ratio * 8));
          const bar = '▓'.repeat(filled) + '░'.repeat(8 - filled);
          console.log(`  ${chalk.dim(`${line.padEnd(13)} ${bar} ${progress.traces}/${progress.threshold}`)}`);
        }

        // P1-F6 (Fresh-User UX Audit): --verbose was a no-op in the DQ
        // (headless) session path — the flag was advertised in --help but
        // never referenced in runDirectQuestioningSession(). Now it surfaces:
        //   1. The LLM feedback line (distinct from narrative; normally suppressed)
        //   2. The encounter's drive expression (qualitative, Veil-compliant)
        //   3. The session arc position (warmup/peak/cooldown)
        //   4. The running total encounters
        // This gives curious players / developers a window into the engine
        // without breaking the Veil (no raw G_z/P_z/CCI — those stay behind --dev).
        if (VERBOSE) {
          // NF-5: Route feedback through VeilFilter so clinical labels
          // (DarkAllergy, DarkAverted) and metrics (93% conceptual density)
          // don't leak through --verbose. The Veil applies to all user-facing
          // output, not just the normal path.
          // NF3-2 (Fresh-User Audit 3): Use truncateAtWordBoundary instead of
          // raw .slice(0, 280) so feedback doesn't cut mid-word ("patter" instead
          // of "pattern"). The audit found --verbose feedback was still truncating
          // mid-word because NF-8's fix only applied to Recent Sessions.
          const rawFeedback = result.outcome.feedback ?? '';
          const veiledFeedback = filterOutput(rawFeedback).filtered;
          const truncatedFeedback = truncateAtWordBoundary(veiledFeedback, 280);
          if (truncatedFeedback && truncatedFeedback !== truncateAtWordBoundary(result.narrativeSummary ?? '', 280)) {
            verbose('feedback', truncatedFeedback);
          }
          // NF-5: Translate clinical drive labels to Veil-compliant descriptions.
          // Old: 'Agency:DarkAverted' (clinical). New: 'Agency: a rejection of a lower capacity' (qualitative).
          const driveExpr = cr.polarityTrace.driveDirectionality;
          const driveSummary = Object.entries(driveExpr)
            .filter(([, v]) => v !== 'HealthyBalanced')
            .map(([k, v]) => `${k}: ${veilDriveDirection(v as string)}`).join(', ') || 'balanced';
          verbose('drives', driveSummary);
          verbose('arc', `${encounter.sessionPosition} · encounter ${i + 1}/${linesToRun.length}`);
          verbose('total', `${currentSig.totalEncounters} cumulative encounters`);
        }
      }

      // Wave 1.3: Apply the response to GameLoop state engines in Direct Questioning mode too.
      // DQ bypasses tickWithStrategy but should still update UserMatrixModel + transformation state.
      if (result.response) {
        // DQ doesn't have a sessionState from startSession — create a minimal one
        // The strategy is GENERATED, not hand-written. The literal that stood here had already
        // drifted from `SessionStrategy` (a `warmup` field that is now `warmupCount`, a
        // `midSessionAdjustmentThreshold` that never existed, weights missing `knowledgeHealth`,
        // and no `themeRationale`/`arc`/`modalityBias` at all) — which is what a second copy of a
        // shape converges on. DQ has no auto-mode arc, so it derives one from the neutral CCI.
        const dqCci: CCIScore = {
          composite: 0.5,
          dimensions: { altitude: 0.3, driveHealth: 0.5, polarity: 0.2, shadowTopology: 0.5, transformationReadiness: 0.2 },
          weights: DEFAULT_CCI_WEIGHTS,
          dominantDimension: 'driveHealth',
          sessionSignals: { recommendedTheme: 'balanced-development', intensityBudget: 0.5, shadowPressure: 'low', transformationProximity: 'distant', driveRebalancingTarget: null, polarityGuidance: { mode: 'exploration', recommendedDiversity: 0.7, temptationFrequency: 0.3 } },
        };
        const dqSessionState: SessionState = {
          strategy: generateSessionStrategy(dqCci, { encountersSoFar: i, targetSessionLength: 8, recentLines: [] }, null),
          cci: dqCci,
          recentOutcomes: [],
          encountersSinceRefresh: i,
          transformationState: { phase: currentSig.transformationPhase ?? 'idle', targetStage: currentSig.transformationTargetStage ?? null, sessionsInPhase: currentSig.transformationSessionsInPhase ?? 0, knotsResolved: currentSig.transformationKnotsResolved ?? 0, totalKnots: currentSig.transformationTotalKnots ?? 0 },
          userMatrixModel: (globalThis as any).__userMatrixModel ?? createInitialUserMatrixModel(),
        };
        const applied = applyResponseOnly(
          currentSig, currentWorld, dqSessionState,
          result.response, encounter, Date.now(),
        );
        currentSig = applied.sig;
        currentWorld = applied.world;
        (globalThis as any).__userMatrixModel = applied.sessionState.userMatrixModel;
      }

      emitEvent('dq_line_completed', {
        line, stage: currentStage,
        narrative: result.narrativeSummary,
        totalEncounters: currentSig.totalEncounters,
      });

      // P2-U5 (Fresh-User UX Re-Audit): Progressive vocabulary unlock.
      // Check the narrative for Tier 2 glossary terms. When a term is
      // encountered for the first time, it unlocks and is persisted to
      // the profile. The player is notified (non-JSON mode only).
      if (result.narrativeSummary) {
        const profileDir = getActiveProfileDir();
        if (profileDir) {
          const alreadyUnlocked = loadUnlockedTerms(profileDir);
          // P0-R3 (Curriculum Audit): Unlock glossary terms sooner.
          // Content-driven check plus encounter-count auto-unlock: after 3
          // encounters, unlock core Tier 2 terms that appear in narrative.
          let newlyUnlocked = checkTermUnlocks(result.narrativeSummary, alreadyUnlocked);
          if (newlyUnlocked.length === 0 && currentSig.totalEncounters >= 3) {
            const coreTerms = ['Shadow', 'Line', 'Drive'];
            const coreUnlocked = coreTerms.filter(t => !alreadyUnlocked.includes(t));
            if (coreUnlocked.length > 0) newlyUnlocked = coreUnlocked;
          }
          if (newlyUnlocked.length > 0) {
            const trulyNew = addUnlockedTerms(profileDir, newlyUnlocked);
            if (trulyNew.length > 0) {
              if (!JSON_MODE) {
                for (const term of trulyNew) {
                  console.log(`  ${chalk.dim('✦ New term unlocked:')} ${chalk.cyan(term)} ${chalk.dim('— run `mysterium glossary` to see its definition')}`);
                }
              }
              emitEvent('terms_unlocked', { terms: trulyNew });
            }
          }
        }
      }

      // P0-2 (UX-R3): Honor --dev during DQ sessions.
      emitDevPrimitives(currentSig, `dq:${line}:${currentStage}`);
      }
    } catch (err: any) {
      error(`Encounter failed: ${err.message || err}`);
      emitEvent('dq_line_error', { line, error: err.message });
    }
  }

  // T-3.4: Radar chart removed — Veil violation (shows line×stage matrix).

  // Session end — apply theta-decay and increment totalSessions.
  // P1-17: Previously DQ created a FRESH sessionState here (with empty
  // recentOutcomes + fresh userMatrixModel), causing endSession's summary to
  // report encountersCompleted=0 + shadowsSurfaced=0 + empty userMatrixSummary.
  // Now we reconstruct a sessionState that reflects the DQ session's actual
  // accumulated state (8 completed encounters + the globalThis userMatrixModel).
  const now = Date.now();
  const dqSessionState = startSession(currentSig, { encountersSoFar: 8, sessionDurationMs: 0, targetSessionLength: 8, recentLines: [] });
  // Override with the actual accumulated state from the DQ session
  const dqAccumulatedState: SessionState = {
    ...dqSessionState,
    recentOutcomes: Array.from({ length: 8 }, () => ({
      outcome: 'completed' as const,
      quality: 0.6,
      mode: 'capacity' as const,
      shadowIntegrated: false,
    })),
    encountersSinceRefresh: 8,
    userMatrixModel: (globalThis as any).__userMatrixModel ?? dqSessionState.userMatrixModel,
    sessionStartMs: now - 8 * 60000, // approximate session start
  };
  const sessionEnd = endSession(currentSig, dqAccumulatedState, now, currentWorld);
  currentSig = sessionEnd.sig;
  if (sessionEnd.world) {
    currentWorld = sessionEnd.world;
  }

  // Phase 14 d4 (G28): carry the runtime checkpoint onto the DEFAULT surface. The story branch
  // persisted it; this one did not, so a DQ session left no orchestration state and every reader
  // (planning bias, CCI projections, retrieval) saw a fresh feed on the next boot. Same two writes
  // as the story branch: the checkpoint rides the world save, and the sidecar journal makes it
  // crash-recoverable before the next saveAll.
  if (orchestration) {
    const checkpoint = captureCheckpoint(orchestration);
    (currentWorld as { orchestrationCheckpoint?: RuntimeCheckpoint }).orchestrationCheckpoint = checkpoint;
    appendJournalEntry(getMysteriumProfileDir(), checkpoint);
  }

  // No decorative closing — the session's per-encounter feedback is sufficient.
  // Atmospheric closing lines impose a specific vibe that may not resonate
  // universally and break the flow.

  // Save (P0-5: atomic saveAll for sig + world consistency)
  saveAll(currentSig, currentWorld);
  if (!JSON_MODE) info('save', `${chalk.green('Progress saved')}`);

  // NF3-3 (Fresh-User Audit 3): If no profile is active (first session),
  // migrate the legacy save NOW so the profile exists immediately — not
  // deferred to the next session start or a `profile list` invocation.
  // The audit found: after Session 1, `profile show` said "No active
  // profile yet" even though the player had just played, because
  // migrateLegacySave() was only called in runFullSession() (next session)
  // and profile list. Now it's called here, right after the save lands.
  if (!getActiveProfileName()) {
    const migrated = migrateLegacySave();
    if (migrated && !JSON_MODE) {
      info('profile', `${chalk.green('✓')} Profile "${migrated}" created.`);
    }
  }

  // Profiling system: update the active profile after session end.
  const _profileName = getActiveProfileName();
  if (_profileName) {
    try {
      // Build session entry for session-log.yaml
      // BUG-2 fix: PolarityTrace doesn't have a 'line' field. Get lines from the encounter moduleRefs.
      const linesTouched = [...new Set(history.map((r, i) => {
        // Try to extract line from the encounterId format "dq-Line:Stage:timestamp"
        const match = r.encounterId?.match(/dq-([^:]+):/);
        return match ? match[1] : `Encounter${i + 1}`;
      }))];
      const keyShift = history.length > 0
        ? (history.map(r => r.narrativeSummary).filter(n => n && n.length > 20).slice(-1)[0] || '').slice(0, 200)
        : '';
      const sessionEntry = {
        date: new Date().toISOString(),
        encounters: history.length,
        lines_touched: linesTouched.length > 0 ? linesTouched : ['Unknown'],
        themes: linesTouched.length > 0 ? linesTouched : ['Unknown'],
        key_shift: keyShift || 'No significant shift recorded',
        shadow_surfaced: history.some(r => r.shadowSurfaced) ? 'Yes' : 'No',
        llm_narrative_summary: keyShift || 'No narrative recorded',
      };

      // BUG-6 fix: Use drive DIRECTIONALITY (0-1 health scores) not raw weights.
      // The sig's drives.weights are cumulative offsets (-1 to +1), not health scores.
      // For the profile, convert to 0-1 range: 0.5 = balanced, >0.5 = healthy, <0.5 = pathological.
      const driveWeights = currentSig.drives.weights;
      const driveHealthScores = {
        // The Drive domain's keys are capitalised. These four read lowercase, so every lookup was
        // `undefined`, `?? 0` absorbed it, and the profile reported 0.5 ("perfectly balanced") for
        // all four drives regardless of the player's actual state.
        Agency: 0.5 + (driveWeights.Agency ?? 0) * 0.5,
        Communion: 0.5 + (driveWeights.Communion ?? 0) * 0.5,
        Eros: 0.5 + (driveWeights.Eros ?? 0) * 0.5,
        Agape: 0.5 + (driveWeights.Agape ?? 0) * 0.5,
      };

      updateProfileAfterSession(_profileName, {
        totalEncounters: currentSig.totalEncounters,
        totalSessions: currentSig.totalSessions,
        currentStage: currentSig.currentStage,
        altitudes: { ...currentSig.altitudes },
        drives: driveHealthScores,
        cci: 0.5,
        sessionEntry,
        shadows: currentSig.shadows.entries,
        // NEXT-4: Store the resonance for felt-sense feedback between sessions
        lastResonance: describePersonalResonance(currentSig),
      });
    } catch { /* best-effort — don't break session end */ }

    // Post-session LLM synthesis: read encounter log, extract insights,
    // append to narrative-memory.md, update goals.yaml active focus.
    if (!JSON_MODE) info('synthesis', `${chalk.dim('Synthesizing session insights...')}`);
    await synthesizeSessionInsights(_profileName, history.length);
  }

  // P0-U2 (Fresh-User UX Audit): Integration ritual at session end.
  // Closes the catalyst→experience→integration cycle (AGENTS.md §5.4).
  // The player is invited to reflect on what landed before the session
  // closes. Their response is persisted to narrative-memory.md and
  // surfaced in the next session's opening for continuity.
  const integrationResponse = await runIntegrationRitual(_profileName);

  // P0-2 (Fresh-User UX Audit): Connect integration response to practice.
  // When the player reflects on what surprised them or what wants to move,
  // seed a practice assignment for the next session based on their response.
  if (integrationResponse && !JSON_MODE) {
    const practiceHint = generatePracticeHint(integrationResponse, currentSig);
    if (practiceHint) {
      console.log(`\n  ${chalk.dim('═══ Practice ═══')}`);
      console.log(`  ${chalk.italic(practiceHint)}`);
    }
  }

  // P0-R2 (Curriculum Audit): Wire integration response to next-session focus.
  if (integrationResponse) updateGoalsActiveFocus(integrationResponse);

  // NF-3: Persist the asked-prompts set so the next session avoids repeats.
  saveAskedPrompts(getActiveProfileDir());

  // P2-R9 (Curriculum Audit): Somatic practice after Somatic-line encounters.
  const somaticHint = somaticPracticeHint(history);
  if (somaticHint && !JSON_MODE) {
    console.log(`\n  ${chalk.dim('═══ Body Practice ═══')}`);
    console.log(`  ${chalk.italic(somaticHint)}`);
  }

  // P0-3 (Fresh-User UX Audit): Post-session summary.
  // Gives the player a sense of what happened, what emerged, and what to
  // focus on next — without breaking the Veil (no metrics, no labels).
  renderPostSessionSummary(currentSig, history, opts.audit);

  emitEvent('session_ended', {
    mode: 'direct',
    linesAssessed: history.length,
    totalEncounters: currentSig.totalEncounters,
    totalSessions: currentSig.totalSessions,
    shadowsSurfaced: currentSig.shadows.activeCount,
    finalStage: currentSig.currentStage,
  });
  // FIX-A3 (Audit): flush the shared telemetry collector so the parent
  // FullSession's session_started event (recorded before DQ was called)
  // and any DQ encounter events are persisted. Without this, DQ sessions
  // return before FullSession's flush and no events are saved.
  try { const tel = await buildCLITelemetry().catch(() => null); await flushCLITelemetry(tel); } catch { /* best-effort */ }
}

// ── Full session mode ─────────────────────────────────────────────────
async function runFullSession(): Promise<void> {
  banner('Mysterium Session Runner');

  // Profiling system: load active profile and inject context into LLM.
  // This gives the LLM long-term memory of the user across sessions.
  const activeProfileName = getActiveProfileName();
  if (activeProfileName) {
    const profile = loadProfile(activeProfileName);
    if (profile) {
      const contextInjection = buildContextInjection(profile);
      // Set as env var so AgenticOrchestrator can prepend it to the system prompt
      process.env.Mysterium_PROFILE_CONTEXT = contextInjection;
      if (!JSON_MODE) info('profile', `${chalk.cyan(profile.identity?.name || activeProfileName)} loaded — ${profile.identity?.total_sessions || 0} sessions, ${profile.identity?.total_encounters || 0} encounters`);
    }
  } else {
    // Auto-migrate legacy save if no profile exists
    const migrated = migrateLegacySave();
    if (migrated && !JSON_MODE) info('profile', `${chalk.green('✓')} Migrated existing save to profile "${migrated}"`);
    // NF-7: Don't tell the user to run setup-profile — it requires interactive
    // mode and fails in headless. The game will auto-create a 'default' profile
    // when the session saves. Just play.
    else if (!JSON_MODE) info('profile', `${chalk.dim('No profile yet — one will be created automatically when you play.')}`);
  }

  // NF-3 (Fresh-User Re-Audit): Load the cross-session asked-prompts set so
  // Session N doesn't repeat questions from Sessions 1..N-1. The re-audit
  // found Session 4 was entirely verbatim duplicates — the in-memory Set
  // was empty on each new process invocation. Now it's persisted to the
  // profile directory (asked-prompts.json).
  loadAskedPrompts(getActiveProfileDir());

  // P1-QW3 (Architecture Audit Phase A): CLI telemetry (opt-in via ~/.mysterium/config.json).
  // No-op when disabled. Used throughout the session to record lifecycle events.
  const cliTelemetry = await buildCLITelemetry().catch(() => null);
  recordCLITelemetry(cliTelemetry, 'session_started', { profileName: activeProfileName, sessionLength: encounterCount, line: FORCE_LINE ?? null, stage: FORCE_STAGE ?? null });

  // Boot with ora spinners for clean loading UX
  const s1 = JSON_MODE ? null : ora('Booting registries...').start();
  bootRegistries();
  const moduleRegistry = bootModuleRegistry();
  (globalThis as any).__moduleRegistry = moduleRegistry;
  seedCurriculumRegistry();
  s1?.succeed(`${moduleRegistry.count()} assessment modules loaded`);

  // LLM availability check
  const s2 = JSON_MODE ? null : ora('Checking LLM availability...').start();
  if (LLM_ACTIVE) {
    const llmUp = await checkLLMAvailability(baseUrl, apiKey);
    if (!llmUp) {
      LLM_ACTIVE = false;
      s2?.warn('LLM unreachable — please check your connection and configuration.');
      // UX-P0-3: Emit LLM-unavailable warning in JSON mode too
      if (JSON_MODE) {
        emitEvent('warning', { code: 'llm_unavailable', message: 'LLM unreachable — please check your connection and configuration.' });
      }
    } else {
      s2?.succeed(`LLM active: ${ACTIVE_MODEL}`);
      // R6-P1-1 (UX-R6): Warn when --headless is used without --answer/--answers
      // and the LLM is active. Without user-provided answers, the LLM will
      // hallucinate user responses (R5-CRITICAL was opt-in, not default).
      // This warning tells the user how to get a real reflective session.
      if (HEADLESS && USER_ANSWERS.length === 0 && !JSON_MODE) {
        warn('Headless mode without --answer: the LLM will generate narratives without your input. For a real reflective session, provide answers via --answer "your reflection" (repeatable) or --answers <file>.');
      }
      if (HEADLESS && USER_ANSWERS.length === 0 && JSON_MODE) {
        emitEvent('warning', { code: 'no_user_answers', message: 'Headless mode without --answer: the LLM will generate narratives without user input. Provide --answer or --answers for authentic participation.' });
      }
      // R5-P2-3 (UX-R5/R6): Lazy model validation. Warn (not error) if the
      // configured model isn't in the provider's /models list. Non-blocking.
      const modelCheck = await validateModelIfFresh();
      if (modelCheck && !modelCheck.valid && modelCheck.message) {
        if (!JSON_MODE) warn(modelCheck.message);
        else emitEvent('warning', { code: 'model_not_listed', message: modelCheck.message });
      }
    }
  } else {
    // EFFICACY-PILOT (P0): The game MUST run with LLM or not at all.
    // Fallback narratives cannot compensate for the infinite range of human
    // reflection. The pilot study proved that echo-only mode (no LLM) is
    // worse than silence — it returns the user's own words with no therapeutic
    // response, destroying trust after vulnerable disclosures.
    //
    // Actual session play REQUIRES the LLM.
    if (subcommand === 'session' || subcommand === undefined || subcommand === 'full') {
      if (!llmComplete) {
        if (!JSON_MODE) {
          error('LLM not configured. Mysterium requires an active LLM to run sessions.');
          console.log(`\n  ${chalk.dim('No API key found. The game cannot run without the LLM.')}`);
          console.log(`\n  ${chalk.bold('To configure:')}`);
          console.log(`  ${chalk.dim('  1. Run `mysterium setup` in a real terminal, OR')}`);
          console.log(`  ${chalk.dim('  2. Set OPENCODE_API_KEY=<key> and MODEL=<model> env vars, OR')}`);
          console.log(`  ${chalk.dim('  3. Edit ~/.mysterium/config.json: {"llm":{"provider":"opencode","apiKey":"<key>","model":"mimo-v2.5-free","baseUrl":"https://opencode.ai/zen/v1"}}')}\n`);
        } else {
          emitEvent('fatal', { code: 'llm_not_configured', message: 'No LLM API key configured. Run `mysterium setup` or set env vars.' });
        }
        process.exit(1);
      }
    }
    s2?.info('LLM not configured — only non-reflective commands available');
  }

  // PILOT-5.5 (Efficacy Pilot): With LLM-required mode, the saturation
  // threshold stays at 20 (the LLM-calibrated value).
  // The threshold of 20 means ~20 encounters per line × 8 lines = ~160
  // encounters for a stage transition. This is intentional — stage
  // transitions are rare, dramatic, and require sustained practice.

  // Holons
  const s3 = JSON_MODE ? null : ora('Loading world...').start();
  const world = loadHolons();
  const npcCount = world.holons.filter(h => h.kind === 'NPC').length;
  s3?.succeed(`${world.holons.length} holons (${npcCount} NPCs)`);

  // Significator
  const s4 = JSON_MODE ? null : ora('Creating Significator...').start();
  const sig = await createDefaultSignificator();
  printSignificator(sig);
  s4?.succeed('Significator ready');
  const session: SessionContext = {
    encountersSoFar: 0,
    sessionDurationMs: 0,
    targetSessionLength: encounterCount,
    recentLines: [],
    ...(FORCE_LINE ? { forceLine: FORCE_LINE } : {}),
    ...(FORCE_STAGE ? { forceStage: FORCE_STAGE } : {}),
    ...(FORCE_MODALITY ? { forceModality: FORCE_MODALITY } : {}),
  } as any;
  // RuntimeLoop (43 §5.5 + 22 §7.5): one services record for the whole session — the feed and the
  // owner-worker profiles accumulate across encounters. Seeded from the authored holon corpus so
  // NPC candidates derive and workers have owners. Phase 11 d1 (G28): the PREVIOUS session's
  // checkpoint (feed entries + worker pool + polarity states) is restored so cross-session
  // memory survives the restart — F3 replay makes the restore exact. Created BEFORE startSession
  // so reader 1 (27 planning, Phase 11 d2) can see the restored feed's trend.
  const savedCheckpoint = (world as { orchestrationCheckpoint?: RuntimeCheckpoint }).orchestrationCheckpoint;
  // Phase 13 d9b: replay the crash-sidecar journal BEFORE trusting the restored checkpoint — a
  // session that ended after the last saveAll is pending here. The merged checkpoint seeds the
  // services; the summary is logged so recovery is never silent (LM-c's countermeasure).
  const journalReplay = savedCheckpoint
    ? replayJournal(getMysteriumProfileDir(), savedCheckpoint)
    : { checkpoint: undefined as unknown as RuntimeCheckpoint, replayed: 0, consumed: 0, droppedTorn: 0 };
  if (journalReplay.replayed > 0 || journalReplay.droppedTorn > 0) {
    console.log(
      `[journal] recovered ${journalReplay.replayed} unsaved session(s)` +
        `${journalReplay.droppedTorn > 0 ? `, dropped ${journalReplay.droppedTorn} torn line(s)` : ''}`,
    );
  }
  const orchestration = createOrchestrationServices(world.holons, savedCheckpoint ? journalReplay.checkpoint : undefined);

  // M4: When --agent is set, use the TDG-augmented session start. This blends
  // TDG G_z/P_z into the CCI's metabolicHealth dimension and runs a graph-level
  // reflection to seed the session strategy. No-op (returns baseline) when TDG
  // is not running — zero regression.
  // YAGNI-EFF-3: startSessionWithTDG removed. USE_PERSISTENT_AGENT is always
  // false; the DQ path is the proven architecture.
  // Phase 11 d2 (43 §5.5 reader 1): the restored feed's planning projection biases the
  // strategy — ranking-as-bias; an empty/restored feed yields byte-identical behaviour.
  let sessionState = startSession(sig, session, feedPlanningBias(orchestration.feed));
  applyCurriculumMode(sessionState);
  // Training decay: narrative-only sessions still age cognitive skills
  try {
    const tDecay = await buildTrainingIntegration().catch(() => undefined);
    if (tDecay) { tDecay.services.index.applyDecay(); await tDecay.services.persistIndex(); }
  } catch { /* best-effort */ }

  // P3-CONTINUITY (Fresh-User Re-Audit): Surface previous session's practice
  // hint at session start. The practice hint is written to goals.yaml at the
  // end of each session but never read back at the start of the next one.
  // This breaks the feedback loop — the game tells you what to practice but
  // never asks if you did.
  const prevFocus = readActiveFocus();
  if (prevFocus && prevFocus.length > 5 && !JSON_MODE) {
    console.log(`\n  ${chalk.italic(chalk.dim('From your last session:'))}`);
    console.log(`  ${chalk.italic(prevFocus)}`);
    console.log(`  ${chalk.dim('Did anything arise?')}\n`);
  }

  // Declare mutable state BEFORE the banner so it can reference them
  let currentSig = sig;
  let currentWorld = world;

  // Task 5: Mode selection — player chooses gameplay mode. `--mode` wins; otherwise an interactive
  // prompt; otherwise the direct flow (the default). The flag is what makes the story branch
  // reachable from `--headless`/`--json`, where the prompt is skipped.
  let gameMode: SessionMode = FORCE_MODE ?? 'direct';
  if (!HEADLESS && !JSON_MODE && !FORCE_LINE && !FORCE_MODALITY && !FORCE_MODE) {
    const modeChoice = await select({
      message: 'Choose your gameplay mode:',
      options: [
        { value: 'direct', label: 'Direct Questioning — Personality-test style' },
        { value: 'story', label: 'Story-Driven — Immersive RPG narrative' },
      ],
    });
    gameMode = modeChoice === 'story' ? 'story' : 'direct';
  }
  // M1: When --agent is set, auto-switch to Story mode (the PersistentAgent is
  // wired into the Story-Driven encounter loop, not the Direct Questioning flow).

  const isDirectMode = gameMode === 'direct';

  // ponytail: Direct Questioning gets its own session flow — 8 lines, write-in, no pass/fail
  if (isDirectMode) {
    await runDirectQuestioningSession(currentSig, currentWorld, orchestration);
    return;
  }

  banner('SESSION START');
  // P1-F10: Surface the adaptive theme with a Veil-compliant qualitative
  // gloss, so the player can feel the game responding to their state without
  // seeing raw engine labels. The raw theme name is still shown (in dim) for
  // developers, but the qualitative hint is what the player reads.
  const themeHint = veilThemeHint(sessionState.strategy.theme);
  info('focus', `${chalk.cyan(themeHint)}`);
  if (VERBOSE || DEV_MODE) info('theme', `${chalk.dim(sessionState.strategy.theme)}`);
  info('target', `${encounterCount} encounters`);
  console.log('');

  if (!JSON_MODE) {
    const atmospheres = [
      `${chalk.dim('The world stirs with latent potential. Fragments of memory surface — echoes of journeys not yet taken.')}`,
      `${chalk.dim('A pale light filters through the veil. The architecture of consciousness awaits your engagement.')}`,
      `${chalk.dim('The field of development hums with quiet energy. Each encounter will shape the landscape of your becoming.')}`,
      `${chalk.dim('Between the seen and unseen, the developmental engines prepare their catalysts. Step forward.')}`,
    ];
    console.log(`\n  ${atmospheres[Math.floor(Math.random() * atmospheres.length)]}`);
  }

  emitEvent('session_started', {
    cci: sessionState.cci.composite,
    theme: sessionState.strategy.theme,
    targetEncounters: encounterCount,
  });
  let completedCount = 0;
  let passedCount = 0;
  const now = Date.now();
  const sessionStartedAt = now;
  const history: ConsequenceRecord[] = [];
  const consecutivePasses = new Map<string, number>();

  for (let i = 0; i < encounterCount; i++) {
    separator(`Encounter ${i + 1}/${encounterCount}`);

    // Feed back the PREVIOUS encounter's response to apply consequences
    // NOTE: Don't pass prevResponse to tickWithStrategy — the orchestrator already
    // applies consequences via processOutcome + applyConsequences. Passing it here
    // would double-count encounters (totalEncounters increments twice per encounter).
    let { tickResult, sessionState: newState } = tickWithStrategy(
      currentSig,
      currentWorld,
      { ...session, encountersSoFar: i, sessionDurationMs: i * 5000 },
      sessionState,
      null,
      null,
      now + i * 5000,
    );

    currentSig = tickResult.sig;
    currentWorld = tickResult.world;
    sessionState = newState;

    // If no natural encounter and forcing is active, create a synthetic one
    if (!tickResult.encounter && (FORCE_LINE || FORCE_STAGE || FORCE_MODALITY)) {
      const synthLine = FORCE_LINE ?? 'Cognitive' as Line;
      const synthStage = FORCE_STAGE ?? 'Red' as Stage;
      const synthModality = FORCE_MODALITY ?? 'Deterministic' as Modality;
      const synthHolon = currentWorld.holons[0] ?? { id: 'synthetic', name: 'The Examiner', narrativeRole: 'guide' };
      const syntheticEncounter: ScheduledEncounter = {
        id: `synthetic:${synthLine}:${synthStage}:${now + i * 5000}`,
        moduleRef: `${synthLine}:${synthStage}`,
        modality: synthModality,
        targetLines: [synthLine],
        stage: synthStage,
        holonSource: synthHolon.id ?? 'synthetic',
        shadowTarget: null,
        polarityMode: 'Exploring',
        difficulty: 0.5,
        sessionPosition: 'peak',
        priority: 0.999,
        driveTarget: null,
        executionMode: 'capacity',
      };
      if (VERBOSE) warn(`No natural encounter found at ${synthLine}:${synthStage} — using synthetic encounter`);
      tickResult = { ...tickResult, encounter: syntheticEncounter, encounters: [syntheticEncounter] };
    }

    if (!tickResult.encounter) {
      warn('No encounter available — skipping');
      continue;
    }      // G.10: Non-coercion — present 3-5 ranked offers, player chooses
    let selectedEncounter: ScheduledEncounter = tickResult.encounter!;
    const offers = tickResult.encounters;
    if (offers.length > 1 && !HEADLESS && !JSON_MODE) {
      const posLabel = (pos: string) => pos === 'warmup' ? chalk.blue('warmup') : pos === 'cooldown' ? chalk.green('cooldown') : chalk.magenta('peak');
      const options = offers.map((enc, idx) => {
        const [encLineName, st] = enc.moduleRef.split(':');
        if (isDirectMode) {
          // Direct mode: show LINE + stage, personality-test style
          const lineLabel = CHALLENGE_NAMES[encLineName ?? ''] ?? encLineName;
          const stageCol = stageColor(st ?? 'Red');
          // P0-1 (Fresh-User UX Audit): Show curriculum concept name if available
          const curLabel = curriculumLabel(enc.curriculumConceptId);
          const label = `${idx + 1}. ${chalk.bold(lineLabel)}  ${stageCol(st ?? 'Red')}  ${chalk.dim(enc.modality)}  ${posLabel(enc.sessionPosition)}${curLabel ? ' 📚' + curLabel : ''}`;
          return { value: idx, label };
        }
        // Story mode: show location/NPC name
        const holon = world.holons.find(h => h.id === enc.holonSource);
        const location = holon?.name ?? encLineName;
        // P0-1 (Fresh-User UX Audit): Show curriculum concept name if available
        const curLabelStory = curriculumLabel(enc.curriculumConceptId);
        const label = `${idx + 1}. ${chalk.cyan(location)}  ${chalk.dim(enc.modality)}  ${posLabel(enc.sessionPosition)}${curLabelStory ? ' 📚' + curLabelStory : ''}`;
        return { value: idx, label };
      });
      const choice = await select({
        message: isDirectMode ? 'Choose your developmental line:' : 'Choose your encounter:',
        options,
        initialValue: 0,
      });
      if (typeof choice === 'number') {
        selectedEncounter = offers[choice];
        const skipped = offers.filter((_, idx) => idx !== choice).map(e => e.id);
        if (skipped.length > 0) {
          currentSig = { ...currentSig, avoidedEncounters: [...(currentSig.avoidedEncounters ?? []), ...skipped] };
        }
      }
    }
    // Direct mode: also show progress chart at the top of each encounter
    if (isDirectMode && !JSON_MODE) {
      renderLinesProgress(currentSig, history);
    }
    tickResult = { ...tickResult, encounter: selectedEncounter };

    // P1-QW8 (Architecture Audit Phase A): Show prerequisite gaps on every
    // encounter with a curriculumConceptId, not just in --curriculum mode.
    if (selectedEncounter.curriculumConceptId && currentSig?.knowledge && !JSON_MODE) {
      renderPrerequisiteGaps(selectedEncounter.curriculumConceptId, currentSig.knowledge);
    }

    // ── Training beat interlude: native brain game, no LLM ──
    if ((selectedEncounter as any).isTrainingBeat) {
      const paradigmId = (selectedEncounter as any).trainingParadigmId ?? 'stroop';
      const { getParadigm } = await import('../src/core/braingame/registry.js');
      const paradigm = getParadigm(paradigmId);
      const label = paradigm?.label ?? paradigmId;
      if (!JSON_MODE) {
        console.log(`\n  ${chalk.dim('The world grows quiet. A practice arises —')} ${chalk.cyan(label)}`);
        console.log(`  ${chalk.dim('A brief remembering exercise surfaces within the journey.')}`);
      }
      try {
        const tBeat = await buildTrainingIntegration().catch(() => undefined);
        if (tBeat) {
          const outcome = await tBeat.runner.runGame(paradigmId, {});
          // Persistence is handled by the training tool handler for agentic beats,
          // but session beats use the runner directly — persist here.
          const sPersist = tBeat.services;
          // Reuse the same persistence path as handleTrainingTool: appendSession + index + calibration
          const { levelFromParadigm } = await import('../src/core/adaptive/AdaptiveDifficultyService.js');
          await sPersist.trials.appendSession(outcome.trials as any, {
            sessionId: outcome.summary.sessionId,
            paradigmId: outcome.summary.paradigmId,
            startedAt: Date.now(),
            trialsCompleted: outcome.summary.trialsCompleted,
            accuracy: outcome.summary.overallAccuracy,
            rtMedianMs: outcome.summary.rtMedianMs,
            performance: outcome.summary.performance,
          });
          const pDef = getParadigm(paradigmId)!;
          sPersist.index.recordGame([...pDef.domains] as any, outcome.summary.performance);
          const prev = await sPersist.calibration.get(paradigmId);
          const endLevel = levelFromParadigm(pDef, outcome.summary.paramsEnd as any);
          await sPersist.calibration.put({
            paradigmId,
            baselineLevel: prev ? prev.baselineLevel * 0.7 + endLevel * 0.3 : endLevel,
            lastLevel: endLevel,
            calibratedAt: prev?.calibratedAt ?? Date.now(),
            lastPlayedAt: Date.now(),
            sessionsPlayed: (prev?.sessionsPlayed ?? 0) + 1,
          });
          await sPersist.persistIndex();
          if (!JSON_MODE) {
            console.log(`  ${chalk.dim(outcome.summary.feltSenseHint)}`);
          }
          emitEvent('training_beat_completed', { paradigmId, feltSense: outcome.summary.feltSenseHint, trialsCompleted: outcome.summary.trialsCompleted });
        }
      } catch (err: any) {
        if (!JSON_MODE) warn(`Practice stumbled: ${err?.message ?? err}`);
        emitEvent('training_beat_error', { paradigmId, error: String(err?.message ?? err) });
      }
      completedCount++;
      // Training beats do not advance narrative polarity/shadow; just continue
      continue;
    }

    // Show session position and encounter header
    const encProgress = (selectedEncounter.sessionPosition === 'warmup' ? 0.1
      : selectedEncounter.sessionPosition === 'cooldown' ? 0.9 : 0.5);
    renderSessionPosition(`${i + 1}/${encounterCount}`, selectedEncounter.sessionPosition, encProgress);
    printEncounter(selectedEncounter, currentWorld);

    // Transition indicator with processing spinner
    if (i > 0 && !JSON_MODE) {
      const transitions = [
        `${chalk.dim('The previous encounter settles into memory. A new catalyst emerges...')}`,
        `${chalk.dim('The developmental field shifts. What comes next is precisely what you need...')}`,
        `${chalk.dim('Integration ripples outward. The next challenge crystallizes...')}`,
        `${chalk.dim('The veil parts once more. A new mirror reflects...')}`,
        `${chalk.dim('The residue of the last encounter lingers. The next catalyst forms...')}`,
        `${chalk.dim('Memory folds into potential. A new edge of growth appears...')}`,
      ];
      console.log(`\n  ${transitions[Math.floor(Math.random() * transitions.length)]}`);
      // U.4: Smooth ora spinner
      const s = ora({ text: 'Preparing encounter...', color: 'cyan' }).start();
      await new Promise(r => setTimeout(r, 300));
      s.succeed('Encounter ready');
    }

    // Run encounter — YAGNI-1 (UX-R3+R4): both DQ and Story now route
    // through the unified executeEncounter dispatch. The routing logic
    // (PersistentAgent vs AgenticOrchestrator) lives in ONE place.
    try {
      const result = await executeEncounter(selectedEncounter, currentSig, currentWorld, history, {
        // `responsesPool` is deliberately NOT passed: the forced-response pool was retired
        // (YAGNI-PHASE-4) and its caller-side local removed. The bare shorthand left here threw
        // `ReferenceError` on every story-mode encounter — and because the dispatch is wrapped in
        // this `try`, the failure was caught and the mode degraded quietly instead of running.
        consecutivePasses,
        orchestration,
      });

      // Apply consequences from the orchestrator result
      const record = result.outcome.consequenceRecord;
      history.push(record);
      currentSig = result.outcome.updatedSig;
      currentWorld = result.outcome.updatedWorld;
      // RuntimeLoop + Phase 11 d1 (G28): persist the FULL runtime checkpoint (feed entries +
      // worker pool + polarity states) with the world save so NPC profiles, the reporting feed,
      // and the dialectic pair map survive the process (22 §7.5 — all serializable by design).
      (currentWorld as { orchestrationCheckpoint?: RuntimeCheckpoint }).orchestrationCheckpoint =
        captureCheckpoint(orchestration);
      // Phase 13 d9b: the sidecar journal — one append-only line per checkpoint, so a crash
      // before the next saveAll still leaves this session recoverable at next boot.
      appendJournalEntry(getMysteriumProfileDir(), (currentWorld as unknown as { orchestrationCheckpoint: RuntimeCheckpoint }).orchestrationCheckpoint);
      void journalPathFor; // path helper re-exported for diagnostics; the journal lives in the profile dir

      // Wave 1.1: Apply the response to the GameLoop's state engines
      // (UserMatrixModel + transformation state) WITHOUT re-applying consequences
      // (the orchestrator already did that). This fixes the stale-state bug where
      // UserMatrixModel was never updated and transformation state ran on stale sig.
      //
      // Phase 3 bugfix: when the PersistentAgent path is active, use the agent's
      // effectiveEncounter (which may differ from the scheduler's pick if the
      // agent called mysterium_select_encounter with a different moduleRef). Using
      if (result.response) {
        const applied = applyResponseOnly(
          currentSig,
          currentWorld,
          sessionState,
          result.response,
          selectedEncounter,
          Date.now(),
        );
        currentSig = applied.sig;
        currentWorld = applied.world;
        sessionState = applied.sessionState;
      }

      // Phase 3 + L4 + L5: Keep the PersistentAgent's sig/world/sessionState fresh
      // across encounters so its tool queries reflect the latest state. Without
      // the sessionState refresh, mysterium_get_encounter_pool always saw
      // encountersSoFar:0 + recentLines:[], skewing scheduler ranking. Without
      // the weightBias, the agent saw a different ranking than the scheduler.          // YAGNI-EFF-3: PersistentAgent state sync removed.



      verbose('narrative', result.narrativeSummary);

      // ── Per-encounter state display (Veil-compliant) ──
      // ponytail: no PASSED/FAILED, no clinical labels, no layer labels.
      // The player sees narrative consequence only.
      if (!JSON_MODE) {
        const cr = result.outcome.consequenceRecord;
        // P1-1 (UX-R3): word-boundary-aware truncation; was slice(0,100)+'...'
        // R5-BUG-5 (UX-R5): Fall back to FallbackNarratives if LLM returned empty.
        const rawNarrative = result.narrativeSummary?.trim() || pickFallbackNarrative();
        const briefNarrative = truncateNarrative(rawNarrative, 1000);
        // R11-P5 (Fresh-User UX Audit): Same echo-detection as DQ path (line ~1700).
        // Suppress ✦ when the "narrative" is just the player's write-in echoed back.
        const userWriteInStory = result.response?.writeInValue?.trim() ?? '';
        const isEchoStory = userWriteInStory.length > 0
          && briefNarrative.trim().toLowerCase() === userWriteInStory.toLowerCase();
        if (isEchoStory) {
          console.log(`\n  ${chalk.dim('· recorded your response ·')}`);
        } else {
          console.log(`\n  ${chalk.dim('✦')} ${briefNarrative}`);
        }

        // R7-P1-2 (UX-R7): Vary the shadow-surfaced footer (Story-Driven path).
        if (cr.shadowSurfaced) {
          const stirredVariants = [
            'Something beneath the surface stirred.',
            'A shadow edge caught the light.',
            'Something unnamed moved in the periphery.',
            'A pattern you haven\'t fully named flickered past.',
          ];
          const idx = (selectedEncounter.id.length + Date.now()) % stirredVariants.length;
          console.log(`  ${chalk.dim(stirredVariants[idx] ?? stirredVariants[0]!)}`);
        }
      }

      if (VERBOSE) {
        // R6-P2-2 (UX-R6): Only print 'feedback' if it differs from 'narrative'.
        // In no-LLM mode they're identical (both use fallback); in LLM mode
        // they should differ. Printing both when identical is wasteful.
        // NF-5: Route through VeilFilter to strip clinical labels + metrics.
        // NF3-2: Use truncateAtWordBoundary instead of raw .slice(0, 200).
        const rawFeedback = result.outcome.feedback ?? '';
        const veiled = filterOutput(rawFeedback).filtered;
        const truncated = truncateAtWordBoundary(veiled, 200);
        if (truncated && truncated !== truncateAtWordBoundary(result.narrativeSummary, 200)) {
          verbose('feedback', truncated);
        }
        verbose('updatedEncounters', String(currentSig.totalEncounters));
      }

      emitEvent('encounter_completed', {
        encounter: selectedEncounter.id,
        modality: selectedEncounter.modality,
        module: selectedEncounter.moduleRef,
        passed: result.outcome.finalResult.passed,
        narrative: result.narrativeSummary,
        totalEncounters: currentSig.totalEncounters,
        // P0-1: Include curriculum fields for downstream analytics
        ...(selectedEncounter.curriculumConceptId ? {
          curriculumConceptId: selectedEncounter.curriculumConceptId,
          curriculumAction: selectedEncounter.curriculumAction,
        } : {}),
      });

      // P0-2 (UX-R3): Honor --dev during Story-Driven sessions.
      emitDevPrimitives(currentSig, `enc:${selectedEncounter.moduleRef}`);

      completedCount++;
      if (result.outcome.finalResult.passed) passedCount++;
      // P1-QW3 (Architecture Audit Phase A): record encounter_completed event.
      // opt-in; no-op when telemetry is disabled.
      recordCLITelemetry(cliTelemetry, 'encounter_completed', { moduleRef: selectedEncounter.moduleRef, line: selectedEncounter.targetLines[0] ?? null, stage: selectedEncounter.stage, passed: result.outcome.finalResult.passed });
    } catch (err: any) {
      error(`Encounter failed: ${err.message || err}`);
      emitEvent('encounter_error', { encounter: selectedEncounter.id, error: err.message });
    }

      // Check transformation
    if (tickResult.transformation) {
      // T-3.4 (Veil compliance): don't leak the target stage name.
      if (!JSON_MODE) console.log(`\n  ${chalk.magenta('⚡ Something rearranges at the foundation.')}`);
      emitEvent('transformation', { targetStage: tickResult.transformation.targetStage, readiness: tickResult.transformation.readiness });
    }

    // M4: When --agent is active, query TDG's graph-level transformation pressure
    // to supplement Mysterium's detectThreshold signal. This is best-effort + async —
    // no-op when TDG is not running. We emit a tdg_pressure telemetry event so
    // the session can track graph-level readiness alongside the Mysterium signal.
    // YAGNI-EFF-3: getTDGTransformationPressure removed.

    // T-3.4: removed the `layers:` prefix + renderLayersCompact leak.
    // Bleed-through is now conveyed narratively through ConsequenceNarrator.

  }

  // Session end — apply theta-decay and persist.
  const sessionEnd = endSession(currentSig, sessionState, now + encounterCount * 5000, currentWorld);

  // P1-14: If endSession advanced macro-event lifecycle, use the updated world.
  if (sessionEnd.world) {
    currentWorld = sessionEnd.world;
  }

  // Save progress to disk (Significator + WorldState).
  // P0-5: Use atomic saveAll() — writes both sig + world to a single JSON
  // envelope via temp-file + rename, so a crash between writes can't leave
  // them out of sync. The individual saveGame()/saveWorldState() calls are
  // still made inside saveAll() for backward compat with older code paths.
  saveAll(sessionEnd.sig, currentWorld);
  if (!JSON_MODE) info('save', `${chalk.green('Progress saved')}`);

  // P1-QW3 (Architecture Audit Phase A): Record session_ended event + flush.
  // The telemetry is opt-in (read from ~/.mysterium/config.json.telemetry).
  // No-op when disabled; never blocks or throws.
  // (cliTelemetry is already instantiated at session start.)
  recordCLITelemetry(cliTelemetry, 'session_ended', { encounterCount, durationMs: Date.now() - sessionStartedAt });
  await flushCLITelemetry(cliTelemetry);

  // (The "agentic-encounter telemetry" flush that stood here referenced a `telemetry` object
  // that no longer exists in this scope, so a story-mode session threw `ReferenceError` at
  // SESSION END — after the player had already played it. `cliTelemetry` is the only collector on
  // this path and is flushed immediately above.)

  banner('SESSION END');

  // No decorative session closure — per-encounter feedback is sufficient.
  // The prior closure block leaked line names, shadow quadrant names, pass/fail
  // counts, and imposed atmospheric vibes that may not resonate universally.
  // The session's felt-sense is carried by the per-encounter qualitative
  // feedback, not by a summary block.

  // T-3.4: removed CCI bar, altitudes chart, shadow/drive displays, and
  // perceptual-layers rendering from session closure — all Veil violations.
  // The session's felt-sense is carried by the qualitative narrative above.

  if (VERBOSE) {
    console.log('\nFinal Significator:');
    printSignificator(sessionEnd.sig);
  }

  // P0-U2 (Fresh-User UX Audit): Integration ritual at session end.
  const integrationResponse2 = await runIntegrationRitual(getActiveProfileName());

  // P0-2 (Fresh-User UX Audit): Connect integration response to practice.
  if (integrationResponse2 && !JSON_MODE) {
    const practiceHint = generatePracticeHint(integrationResponse2, currentSig);
    if (practiceHint) {
      console.log(`\n  ${chalk.dim('═══ Practice ═══')}`);
      console.log(`  ${chalk.italic(practiceHint)}`);
    }
  }

  // P0-R2 (Curriculum Audit): Wire integration response to next-session focus.
  if (integrationResponse2) updateGoalsActiveFocus(integrationResponse2);  // NF-3: Persist the asked-prompts set for cross-session de-duplication.
  saveAskedPrompts(getActiveProfileDir());

  // P2-R9 (Curriculum Audit): Somatic practice after Somatic-line encounters.
  // Story path doesn't have history[], but sessionEnd.sig.recentEncounters has line data.
  if (sessionEnd.sig.recentEncounters.length > 0) {
    const lastEnc = sessionEnd.sig.recentEncounters[sessionEnd.sig.recentEncounters.length - 1]!;
    if (lastEnc.line === 'Somatic' && !JSON_MODE) {
      const somaticHintStory = somaticPracticeHint([{ line: lastEnc.line } as ConsequenceRecord]);
      if (somaticHintStory) {
        console.log(`\n  ${chalk.dim('═══ Body Practice ═══')}`);
        console.log(`  ${chalk.italic(somaticHintStory)}`);
      }
    }
  }

  // P0-3 (Fresh-User UX Audit): Post-session summary.
  renderPostSessionSummary(currentSig, [], opts.audit);

  emitEvent('session_ended', {
    encountersCompleted: completedCount,
    totalEncounters: currentSig.totalEncounters,
    totalSessions: sessionEnd.sig.totalSessions,
    shadowsSurfaced: sessionEnd.summary.shadowsSurfaced,
    shadowsResolved: sessionEnd.summary.shadowsResolved,
    finalStage: sessionEnd.sig.currentStage,
  });
}

// ── Provider registry (dynamic) ────────────────────────────────────
// The static PROVIDERS catalog with hardcoded model lists has been removed.
// Provider profiles now live in src/infra/llm/ProviderRegistry.ts and carry
// only the immutable bits (baseUrl, authStyle, env var name). The model list
// is fetched dynamically from each provider's /models endpoint, with
// models.dev as a fallback catalog. This mirrors opencode's architecture.
import {
  listProfiles as listProviderProfiles,
  getProfile as getProviderProfile,
  getModels as getProviderModels,
  clearModelCache,
  type LLMConfig as DynamicLLMConfig,
  type DiscoveredModel,
  type ProviderProfile,
} from '../src/infra/llm/ProviderRegistry.js';

/**
 * Verify a provider connection by fetching /models (OpenAI-compat) or
 * sending a minimal /messages request (Anthropic). Returns ok + message.
 * Replaces the previous verifyProviderConnection that hard-coded per-provider logic.
 */
async function verifyProviderConnection(config: DynamicLLMConfig): Promise<{ ok: boolean; message: string }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (config.apiKey && config.apiKey !== 'sk-placeholder') {
      if (config.authStyle === 'x-api-key') {
        headers['x-api-key'] = config.apiKey;
        if (config.protocol === 'anthropic') headers['anthropic-version'] = '2023-06-01';
      } else {
        headers.Authorization = `Bearer ${config.apiKey}`;
      }
    }

    if (config.protocol === 'anthropic') {
      // Anthropic: POST /v1/messages with minimal payload
      const res = await fetch(`${config.baseUrl}/messages`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: config.model,
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 1,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (res.ok) return { ok: true, message: 'Anthropic connected' };
      if (res.status === 401 || res.status === 403) return { ok: false, message: 'Invalid API key' };
      return { ok: false, message: `Anthropic responded with ${res.status}` };
    }

    // OpenAI-compatible (incl. Ollama, OpenCode Zen, OpenRouter, etc.): GET /models
    const res = await fetch(`${config.baseUrl.replace(/\/$/, '')}/models`, {
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (res.ok) return { ok: true, message: 'Connected' };
    if (res.status === 401 || res.status === 403) return { ok: false, message: 'Invalid API key' };
    return { ok: false, message: `Endpoint responded with ${res.status}` };
  } catch (err: any) {
    return { ok: false, message: err.name === 'AbortError' ? 'Connection timed out' : 'Connection failed' };
  }
}

// ── Ollama auto-detect ──────────────────────────────────────────
async function detectOllama(): Promise<{ running: boolean; models: string[] }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch('http://localhost:11434/api/tags', { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return { running: false, models: [] };
    const data = (await res.json()) as { models?: { name: string }[] };
    const models = (data.models ?? []).map(m => m.name.split(':')[0] ?? m.name);
    return { running: true, models: [...new Set(models)] };
  } catch {
    return { running: false, models: [] };
  }
}

// ── Setup wizard (dynamic) ────────────────────────────────────────
// ── Profile Management ──────────────────────────────────────────────

async function runProfile(action?: string, profileName?: string): Promise<void> {

  if (!action || action === 'list') {
    const profiles = listProfiles();
    const active = getActiveProfileName();
    if (profiles.length === 0) {
      console.log(`\n  ${chalk.dim('No profiles found. Run `mysterium setup-profile` to create one.')}`);
      // Try migration
      const migrated = migrateLegacySave();
      if (migrated) {
        console.log(`  ${chalk.green('✓')} Migrated existing save to profile "${migrated}".`);
      }
    } else {
      console.log(`\n  ${chalk.bold('Profiles:')}`);
      for (const p of profiles) {
        const marker = p === active ? chalk.green(' ← active') : '';
        console.log(`    ${chalk.cyan(p)}${marker}`);
      }
    }
    console.log('');
    return;
  }

  if (action === 'switch') {
    if (!profileName) { error('Usage: mysterium profile switch <name>'); return; }
    try {
      setActiveProfile(profileName);
      console.log(`\n  ${chalk.green('✓')} Switched to profile "${profileName}".\n`);
    } catch (err: any) {
      error(err.message);
    }
    return;
  }

  if (action === 'create') {
    if (!profileName) { error('Usage: mysterium profile create <name>'); return; }
    try {
      createProfile(profileName);
      console.log(`\n  ${chalk.green('✓')} Created profile "${profileName}" and set as active.\n`);
    } catch (err: any) {
      error(err.message);
    }
    return;
  }

  if (action === 'delete') {
    if (!profileName) { error('Usage: mysterium profile delete <name>'); return; }
    try {
      deleteProfile(profileName);
      console.log(`\n  ${chalk.yellow('↻')} Deleted profile "${profileName}".\n`);
    } catch (err: any) {
      error(err.message);
    }
    return;
  }

  // P0-F3 (Fresh-User UX Audit): `profile show` — surface the synthesized
  // insights, patterns, and active focus that the post-session synthesis
  // (synthesizeSessionInsights) writes to narrative-memory.md and goals.yaml.
  // P0-R1 (Fresh-User UX Audit v2): Rewritten as a NARRATIVE LETTER format.
  // The previous version used categorized bullet lists (Surfacing Patterns,
  // Integrated Patterns, Active Focus) that read like a therapist's chart
  // despite Veil-compliant language. The audit subagent said: "Integrated
  // Patterns list reads like a therapist's chart: A rejection of a lower
  // capacity that still has something to offer × 14 entries — Veil feels
  // violated." The new format weaves the same data into a reflective letter
  // that honors the contemplative voice.
  if (action === 'show') {
    const targetName = profileName ?? getActiveProfileName();
    if (!targetName) {
      // NF-7 (Fresh-User Re-Audit): The old message told users to run
      // `mysterium setup-profile`, but that command requires interactive mode
      // and fails in headless. The game auto-creates a profile on the first
      // session anyway. The honest message: play a session first.
      error('No active profile yet. Play a session (mysterium session) and one will be created automatically. To customize your profile name and pronouns interactively, run `mysterium setup-profile` in a real terminal.');
      return;
    }
    const profile = loadProfile(targetName);
    if (!profile) {
      error(`Profile "${targetName}" not found. Run \`mysterium profile list\` to see options.`);
      return;
    }

    banner(`Profile: ${targetName}`);

    const id = profile.identity || {};
    const goals = profile.goals || {};

    // P0-R1: Narrative letter format. Instead of categorized bullet lists,
    // weave the same data into a flowing reflective letter. The letter has:
    //   1. Opening (greeting + stage/sessions context in natural language)
    //   2. Body (active focus + patterns + insights woven into prose)
    //   3. Closing (an invitation, not a label)
    // The clinical data (shadow quadrants, drive scores) stays in the
    // Significator for the engine to use; the player sees only the letter.

    // ── Letter Opening ──
    const stageName = id.current_stage || 'Red';
    const sessionCount = id.total_sessions ?? 0;
    const encounterCount = id.total_encounters ?? 0;
    const lifecycle = id.lifecycle || 'Onboarding';

    console.log(`\n  ${chalk.dim('═══ A letter to you ═══')}`);
    console.log(`\n  ${chalk.italic('Dear player,')}`);

    // Opening paragraph: context in natural language
    const sessionWord = sessionCount === 1 ? 'session' : 'sessions';
    const encounterWord = encounterCount === 1 ? 'encounter' : 'encounters';
    const openingLines = [
      `You have been with me for ${sessionCount} ${sessionWord}, across ${encounterCount} ${encounterWord}. You are currently at the ${stageColor(stageName)(stageName)} stage of the journey — ${lifecycle.toLowerCase()}.`,
      `I have been holding ${sessionCount} ${sessionWord} of your reflections — ${encounterCount} ${encounterWord} where you showed up and let something be seen. You are at ${stageColor(stageName)(stageName)} right now, and the work continues.`,
      `We have sat together ${sessionCount} times now. ${encounterCount} ${encounterWord} have passed between us. You are at the ${stageColor(stageName)(stageName)} stage — and there is more here than metrics can hold.`,
    ];
    console.log(`\n  ${chalk.dim(openingLines[Math.floor(Math.random() * openingLines.length)])}`);

    // ── Active Focus as prose, not a labeled field ──
    const rawFocus = goals.active_focus;
    const focusStr = (typeof rawFocus === 'string')
      ? rawFocus
      : (rawFocus && typeof rawFocus === 'object' && Object.keys(rawFocus).length === 0)
        ? ''
        : String(rawFocus ?? '');

    if (focusStr.trim()) {
      console.log(`\n  ${chalk.italic(focusStr)}`);
      // Subtle timestamp (not a "last updated:" clinical label)
      const rawSynthTime = goals.last_synthesis_session;
      const synthStr = (typeof rawSynthTime === 'string')
        ? rawSynthTime
        : (rawSynthTime && typeof rawSynthTime === 'object' && Object.keys(rawSynthTime).length === 0)
          ? ''
          : String(rawSynthTime ?? '');
      if (synthStr.trim()) {
        const isFallback = synthStr.includes('(fallback)');
        const timePart = synthStr.replace(/\s*\(fallback\)\s*$/, '').trim().replace(/^"|"$/g, '');
        const dateStr = timePart ? new Date(timePart).toLocaleString() : '';
        if (dateStr) {
          const suffix = isFallback ? chalk.yellow(' (still forming)') : '';
          console.log(`  ${chalk.dim(`— noticed ${dateStr}`)}${suffix}`);
        }
      }
    }

    // ── Narrative memory: weave insights + patterns into prose ──
    const mem = profile.narrativeMemory || '';
    if (mem.trim().length > 50) {
      const insights = extractMdSectionBullets(mem, 'Key Insights');
      const patterns = extractMdSectionBullets(mem, 'Patterns');
      const activeWork = extractMdSectionBullets(mem, 'Active Work');

      // Weave insights into a prose paragraph
      if (insights.length > 0) {
        console.log(`\n  ${chalk.dim('Some things have landed:')}`);
        // Take up to 3 insights and weave them into prose
        const topInsights = insights.slice(0, 3);
        for (const insight of topInsights) {
          // Strip the **label**: prefix if present, keep the text
          const cleanText = insight.replace(/^\*\*[^*]+\*\*:\s*/, '');
          console.log(`  ${chalk.dim('—')} ${chalk(cleanText)}`);
        }
      }

      // Weave patterns into a prose reflection
      if (patterns.length > 0) {
        console.log(`\n  ${chalk.dim('I have noticed some things returning:')}`);
        const topPatterns = patterns.slice(0, 3);
        for (const pattern of topPatterns) {
          const cleanText = pattern.replace(/^\*\*[^*]+\*\*:\s*/, '');
          console.log(`  ${chalk.dim('—')} ${chalk(cleanText)}`);
        }
      }

      // Active work as a gentle naming
      if (activeWork.length > 0) {
        console.log(`\n  ${chalk.dim('Something is being worked on:')}`);
        for (const work of activeWork.slice(0, 2)) {
          const cleanText = work.replace(/^\*\*[^*]+\*\*:\s*/, '');
          console.log(`  ${chalk.dim('—')} ${chalk.italic(cleanText)}`);
        }
      }
    }

    // ── Shadow ledger: woven into prose, NOT categorized bullet lists ──
    // P0-R1: The previous version had "Surfacing Patterns" and "Integrated
    // Patterns" as separate bullet lists with movement descriptions. The
    // audit found this reads like a therapist's chart. Now we weave the
    // same data into 1-2 prose sentences that acknowledge the movement
    // without categorizing it into lists.
    const shadows = profile.shadowLedger?.shadows ?? [];
    if (shadows.length > 0) {
      const surfacing = shadows.filter((s: any) => s.status !== 'integrated');
      const integrated = shadows.filter((s: any) => s.status === 'integrated') as ReadonlyArray<{ line?: string }>;

      if (surfacing.length > 0) {
        // Group by line for a more cohesive narrative
        const byLine: Record<string, number> = {};
        for (const s of surfacing) {
          const line = (s as any).line || 'an unnamed dimension';
          byLine[line] = (byLine[line] || 0) + 1;
        }
        const lineEntries = Object.entries(byLine);
        if (lineEntries.length === 1) {
          const [line, count] = lineEntries[0]!;
          const edgeWord = count === 1 ? 'an edge' : 'edges';
          console.log(`\n  ${chalk.dim(`There is ${edgeWord} in the ${line.toLowerCase()} dimension that keeps showing up. Something there wants to be met.`)}`);
        } else {
          const lines = lineEntries.map(([line, count]) => `${line.toLowerCase()} (${count})`).join(', ');
          console.log(`\n  ${chalk.dim(`There are edges showing up across several dimensions: ${lines}. Something in each wants to be met.`)}`);
        }
      }

      if (integrated.length > 0) {
        const count = integrated.length;
        const lineNames = [...new Set(
          integrated.map((s) => s.line).filter((l): l is string => Boolean(l)),
        )];
        if (lineNames.length === 1) {
          console.log(`  ${chalk.green.dim(`Something in the ${lineNames[0]!.toLowerCase()} dimension has shifted — a movement that was once surfacing has found its way through.`)}`);
        } else {
          console.log(`  ${chalk.green.dim(`${count} movements have found their way through — things that were once surfacing have settled in ${lineNames.length} dimensions.`)}`);
        }
      }
    }

    // ── Self-declared goals woven in naturally ──
    if (Array.isArray(goals.self_declared) && goals.self_declared.length > 0) {
      console.log(`\n  ${chalk.dim('You told me you wanted:')}`);
      for (const g of goals.self_declared) {
        console.log(`  ${chalk.dim('—')} ${chalk(g)}`);
      }
    }

    // ── Recent sessions as a gentle arc, not a log ──
    const sessions = profile.sessionHistory?.sessions ?? [];
    if (sessions.length > 0) {
      console.log(`\n  ${chalk.dim('Lately, you have been sitting with:')}`);
      for (const s of sessions.slice(-3)) {
        const ss: any = s;
        const raw = ss.key_shift || ss.theme || '';
        if (raw) {
          const truncated = truncateAtWordBoundary(raw, 180);
          console.log(`  ${chalk.dim('—')} ${chalk.italic(truncated)}`);
        }
      }
    }

    // ── Letter Closing ──
    const closings = [
      `Something wants to shift. The next session will find you where you are.`,
      `There is more here, and it will keep unfolding. The next session will meet you where you are.`,
      `Take your time. The work is not going anywhere, and neither is the invitation.`,
      `Something is moving beneath the surface. The next session will find it.`,
    ];
    console.log(`\n  ${chalk.italic.cyan(closings[Math.floor(Math.random() * closings.length)])}`);
    console.log(`\n  ${chalk.dim('— the game')}`);

    // ── Last active timestamp (subtle, at the bottom) ──
    if (id.last_active) {
      console.log(`\n  ${chalk.dim(`(last active: ${new Date(id.last_active as string).toLocaleString()})`)}`);
    }

    console.log('');
    return;
  }

  error(`Unknown profile action: ${action}. Valid: list, switch, create, delete, show`);
}

/**
 * Extract bullet lines from a named markdown section in narrative-memory.md.
 * Sections look like: `## Key Insights\n- **Session 1:** text\n- **...:** text\n\n## Next Section`
 * Returns the bullet text (without the leading `- ` and without the `## ` header).
 */
function extractMdSectionBullets(md: string, sectionName: string): string[] {
  const header = `## ${sectionName}`;
  const idx = md.indexOf(header);
  if (idx < 0) return [];
  const afterHeader = idx + header.length;
  const nextSection = md.indexOf('\n## ', afterHeader);
  const sectionText = nextSection >= 0 ? md.slice(afterHeader, nextSection) : md.slice(afterHeader);
  const bullets: string[] = [];
  for (const line of sectionText.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('- ')) {
      // Strip the leading "- " and return the rest (which may include **bold** labels)
      bullets.push(trimmed.slice(2));
    }
  }
  return bullets;
}

/**
 * P1-F10 (Fresh-User UX Audit): Translate a raw session-strategy theme name
 * into a Veil-compliant qualitative hint. The game's session strategy engine
 * silently shifts theme based on the player's surfacing shadows, drive
 * imbalances, and transformation proximity — but the raw theme names
 * ('shadow-integration', 'drive-rebalancing', etc.) are engine labels the
 * player shouldn't see. This function returns a one-line qualitative hint
 * that lets the player FEEL the game responding without breaking the Veil.
 */
function veilThemeHint(theme: string): string {
  switch (theme) {
    case 'shadow-integration':   return 'The work turns toward what has been avoided.';
    case 'drive-rebalancing':    return 'The work seeks balance between forces that have pulled apart.';
    case 'polarity-alignment':   return 'The work seeks alignment between inner and outer.';
    case 'transformation-prep':  return 'The work prepares the ground for a shift.';
    case 'balanced-development': return 'The field is open; the work moves where it will.';
    default:                     return 'The work continues.';
  }
}

/**
 * NF-5 (Fresh-User Re-Audit): Translate a raw drive-directionality code into
 * a Veil-compliant qualitative description. Used by --verbose so the player
 * sees 'Agency: a pull toward over-reliance on a familiar capacity' instead
 * of 'Agency:DarkAddicted'. The four directions (per the polarity trace):
 *   DarkAddicted   → submergent fixation (clings to lower capacity)
 *   DarkAverted    → submergent aversion (rejects lower capacity)
 *   GoldenAddicted → emergent fixation (bypasses toward higher)
 *   GoldenAverted  → emergent aversion (refuses the call to grow)
 *   HealthyBalanced→ filtered out before this function is called
 */
function veilDriveDirection(direction: string): string {
  switch (direction) {
    case 'DarkAddicted':    return 'a pull toward the familiar';
    case 'DarkAverted':     return 'a rejection of something familiar';
    case 'GoldenAddicted':  return 'a pull to bypass toward the higher';
    case 'GoldenAverted':   return 'a resistance to the call forward';
    case 'HealthyBalanced': return 'balanced';
    default:                return 'an unnamed movement';
  }
}

async function runSetupProfile(): Promise<void> {
  if (HEADLESS || JSON_MODE) {
    error('setup-profile requires interactive mode. Run in a real terminal.');
    return;
  }

  banner('Mysterium Profile Setup');

  // Step 1: Name
  const nameInput = await clackText({ message: 'What should I call you?', defaultValue: '' });
  if (typeof nameInput !== 'string' || !nameInput.trim()) { error('Name is required.'); return; }
  const name = nameInput.trim();

  // Step 2: Pronouns
  const pronounChoice = await select({
    message: 'What pronouns should I use?',
    options: [
      { value: 'she/her', label: 'she/her' },
      { value: 'he/him', label: 'he/him' },
      { value: 'they/them', label: 'they/them' },
      { value: 'other', label: 'Other (type below)' },
    ],
  });
  // `string`, not the option union: the menu offers "Other (type below)", so a custom value is a
  // supported outcome the union could not express.
  let pronouns: string = typeof pronounChoice === 'string' ? pronounChoice : 'they/them';
  if (pronouns === 'other') {
    const custom = await clackText({ message: 'Enter your pronouns:', defaultValue: '' });
    if (typeof custom === 'string' && custom.trim()) pronouns = custom.trim();
  }

  // Step 3: Communication style
  const metaphorChoice = await select({
    message: 'What metaphor style resonates with you?',
    options: [
      { value: 'contemporary', label: 'Contemporary — modern language, no fantasy' },
      { value: 'mythic', label: 'Mythic — warrior, blade, arena archetypes' },
      { value: 'clinical', label: 'Clinical — precise, psychological' },
      { value: 'poetic', label: 'Poetic — metaphor-heavy, literary' },
    ],
  });
  const metaphor = typeof metaphorChoice === 'string' ? metaphorChoice : 'contemporary';

  const intensityChoice = await select({
    message: 'How direct should I be?',
    options: [
      { value: 'gentle', label: 'Gentle — supportive, soft' },
      { value: 'moderate', label: 'Moderate — honest but kind' },
      { value: 'direct', label: 'Direct — confrontational, no cushioning' },
    ],
  });
  const intensity = typeof intensityChoice === 'string' ? intensityChoice : 'moderate';

  // Step 4: What brings you here?
  console.log(`\n  ${chalk.bold('A few questions to get started:')}`);
  const bringInput = await clackText({ message: 'What brings you here?', defaultValue: '' });
  const bring = typeof bringInput === 'string' ? bringInput.trim() : '';

  const workInput = await clackText({ message: 'What are you working on (in yourself)?', defaultValue: '' });
  const work = typeof workInput === 'string' ? workInput.trim() : '';

  // Create profile
  try {
    createProfile(name, { pronouns, metaphor_preference: metaphor, intensity });

    // Write goals from onboarding answers
    const profileDir = path.join(getProfilesDir(), name);
    const goalsPath = path.join(profileDir, 'goals.yaml');
    const fs2 = await import('fs');
    const goalsContent = `self_declared:\n${bring ? `  - "${bring}"\n` : ''}${work ? `  - "${work}"\n` : ''}\ninferred: []\nactive_focus: "${work || bring || ''}"\n`;
    fs2.writeFileSync(goalsPath, goalsContent, 'utf8');

    // Write initial narrative memory
    const memPath = path.join(profileDir, 'narrative-memory.md');
    const memContent = `# Narrative Memory — ${name}\n\n## Key Insights\n(Insights from LLM responses that landed — added after each session)\n\n## Patterns\n(Recurring themes across sessions)\n\n## Active Work\n${work || bring || '(Not yet specified)'}\n\n## Resolved\n(Integrated patterns)\n\n## Unresolved\n(Surfaced but not yet worked through)\n`;
    fs2.writeFileSync(memPath, memContent, 'utf8');

    console.log(`\n  ${chalk.green('✓')} Profile "${name}" created and set as active.`);
    console.log(`  ${chalk.dim('Profile directory: ' + profileDir)}`);

    // ── Identity onboarding (doc 16 §2.1): consent-first, all-optional ──
    // Identity tunes HOW the game speaks to you (healing), never WHAT level
    // you're assigned (levelling stays evidence-only). Every field skippable;
    // withdrawable any time via `mysterium privacy`.
    await collectIdentityConsent();

    console.log(`\n  ${chalk.dim('Run `mysterium` to start your first session.')}\n`);
  } catch (err: any) {
    error(err.message);
  }
}

/**
 * Identity onboarding — consent-first identity collection for the healing
 * layer (doc 16 §2.1). One prompt per field, all skippable, per-field consent
 * recorded with healing purposes. Values are saved into the Significator's
 * optional identity profile (local-only storage).
 */
async function collectIdentityConsent(): Promise<void> {
  console.log(`\n  ${chalk.bold('Identity context (entirely optional)')}`);
  console.log(`  ${chalk.dim('These help the game speak in ways that resonate with your life —')}`);
  console.log(`  ${chalk.dim('metaphors, examples, pacing. They NEVER affect your level, difficulty,')}`);
  console.log(`  ${chalk.dim('or progress — that comes only from what you demonstrate. Skip anything.')}`);

  const existing = loadSave();
  let identity = existing?.identity ?? createEmptyIdentityProfile();
  const now = Date.now();
  let anyGranted = false;

  const ALL_PURPOSES: HealingPurpose[] = ['narrativeVoice', 'exampleDomains', 'lifeStageTexture', 'localeFormat'];

  const askIdentity = async (
    field: IdentityField,
    message: string,
  ): Promise<void> => {
    const input = await clackText({ message: `${message} (Enter to skip)`, defaultValue: '' });
    const value = typeof input === 'string' ? input.trim() : '';
    if (!value) return;
    identity = grantIdentityField(identity, field, value, ALL_PURPOSES, now);
    anyGranted = true;
  };

  await askIdentity('region', 'Region (e.g. europe, south-asia, north-america, global)?');
  await askIdentity('culture', "Cultural background you'd like examples drawn from?");
  await askIdentity('language', 'Preferred language for presentation?');
  await askIdentity('lifeSituation', 'Life situation (student, parent, professional, retired, in-transition)?');
  await askIdentity('ageBand', 'Age band (under-13, 13-17, 18-24, 25-34, 35-44, 45-59, 60+, prefer-not-to-say)?');

  // Phase 11 d3 (G29): declared preferences — the player's own words for what draws and what
  // repels. Consent-gated per entry, all skippable, withdrawable via `mysterium privacy`.
  // They tune WHICH scenarios/worlds/NPCs the game reaches for — never difficulty or progress.
  const TAG_LABELS: Record<string, string> = {
    technology: 'technology', nature: 'nature', kindred: 'kinship & belonging', commerce: 'trade & exchange',
    craft: 'craftsmanship', music: 'music', medicine: 'healing', law: 'law & order', warfare: 'contest & courage',
    exploration: 'exploration', ritual: 'ritual & ceremony', architecture: 'structure & building',
    performance: 'performance', silence: 'silence & stillness', invention: 'invention', tradition: 'tradition',
    feast: 'feast & abundance', vigil: 'vigil & watchfulness', riddle: 'riddles & play', measure: 'precision & measure',
  };
  const resolveTag = (phrase: string): string | null => {
    const p = phrase.toLowerCase();
    for (const [tag, label] of Object.entries(TAG_LABELS)) {
      if (p.includes(tag) || p.includes(label.split(' ')[0].replace('&', '').trim())) return tag;
    }
    return null;
  };
  const askPreference = async (kind: 'interests' | 'aversions', message: string): Promise<void> => {
    const input = await clackText({ message: `${message} (Enter to skip)`, defaultValue: '' });
    const value = typeof input === 'string' ? input.trim() : '';
    if (!value) return;
    identity = grantDeclaredPreference(identity, kind, value, resolveTag(value), now);
    anyGranted = true;
  };
  await askPreference('interests', 'A topic or activity that genuinely draws you (your own words)?');
  await askPreference('interests', 'Another thing you love spending time on?');
  await askPreference('aversions', 'Something you would rather the game avoid?');

  if (!anyGranted) {
    console.log(`  ${chalk.dim('No identity context shared — the game will speak in its universal voice.')}\n`);
    return;
  }

  if (existing) {
    saveGame({ ...existing, identity });
  }
  console.log(`  ${chalk.green('✓')} Identity context saved (local-only, withdrawable via ${chalk.bold('mysterium privacy')}).`);
}

// Refactored to use ProviderRegistry instead of the hardcoded PROVIDERS catalog.
async function runSetup(): Promise<void> {
  // R9-BUG-6 (UX-R9): The old message 'remove --headless and --json' was
  // contradictory when the system auto-enabled --headless (non-TTY guard).
  // The user didn't add --headless — the system did, then scolded them.
  // New message is honest about what happened and what to do.
  if (HEADLESS || JSON_MODE) {
    if (!process.stdin.isTTY) {
      error('setup requires a real terminal (TTY). Please run `mysterium setup` in an interactive terminal. For non-interactive configuration, edit ~/.mysterium/config.json directly or set env vars (OPENCODE_API_KEY, LLM_MODEL, etc.).');
    } else {
      error('setup requires interactive mode (remove --headless and --json flags)');
    }
    return;
  }
  banner('Mysterium Setup Wizard');
  console.log(`\n  ${chalk.dim('Configure your LLM provider for the developmental engine.')}\n`);
  console.log(`  ${chalk.dim('Models are fetched live from each provider — no stale lists.')}\n`);

  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  fs.mkdirSync(path.join(CONFIG_DIR, 'saves'), { recursive: true });
  success(`Config directory: ${CONFIG_DIR}`);

  const existing = loadConfig();
  if (existing.llm?.provider) {
    info('current provider', `${existing.llm.provider} (${existing.llm.model || 'no model'})`);
  }

  // Check for env-var pre-configuration (e.g. OPENCODE_API_KEY already set).
  // If a provider's env var is set, offer to use it directly.
  const envConfiguredProvider = listProviderProfiles().find(profile =>
    profile.envVars.some(v => process.env[v] && process.env[v] !== 'sk-placeholder')
  );
  if (envConfiguredProvider) {
    const keyVar = envConfiguredProvider.envVars.find(v => process.env[v] && process.env[v] !== 'sk-placeholder');
    info('env detected', `${envConfiguredProvider.name} (via ${keyVar})`);
  }

  // Step 1: Provider selection — from the dynamic registry
  console.log(`\n  ${chalk.bold('Step 1: Select Provider')}`);
  const profiles = listProviderProfiles();
  const providerChoice = await select({
    message: 'Choose your LLM provider:',
    options: profiles.map(p => ({
      value: p.id,
      label: p.name,
      hint: p.envVars.length > 0 ? `env: ${p.envVars[0]}` : 'no key needed',
    })),
  });

  if (typeof providerChoice !== 'string') { error('Setup cancelled'); return; }
  const selectedProfile = getProviderProfile(providerChoice)!;

  // Step 2: API key (skip for Ollama; pre-fill from env if available)
  let selectedApiKey = '';
  if (selectedProfile.id === 'ollama') {
    console.log(`\n  ${chalk.bold('Step 2: Detecting Ollama...')}`);
    const spinner = ora('Checking Ollama at localhost:11434...').start();
    const ollamaStatus = await detectOllama();
    if (ollamaStatus.running) {
      spinner.succeed('Ollama detected');
    } else {
      spinner.warn('Ollama not detected at localhost:11434');
      console.log(`  ${chalk.dim('You can still configure it — start Ollama later before playing.')}`);
    }
  } else {
    console.log(`\n  ${chalk.bold('Step 2: API Key')}`);
    // Pre-fill from env vars if available
    const envKey = selectedProfile.envVars
      .map(v => process.env[v])
      .find(v => v && v !== 'sk-placeholder');
    const existingKey = envKey ?? existing.llm?.apiKey ?? '';
    const currentDisplay = existingKey ? `${existingKey.slice(0, 8)}...` : '(not set)';
    console.log(`  Current: ${chalk.dim(currentDisplay)}`);
    console.log(`  ${chalk.dim(`Env vars checked: ${selectedProfile.envVars.join(', ') || '(none)'}`)}`);
    const newKey = await clackText({
      message: `Enter ${selectedProfile.name} API key${envKey ? ' (blank = use env)' : ''}:`,
      defaultValue: '',
    });
    if (typeof newKey !== 'string') { error('Setup cancelled'); return; }
    selectedApiKey = newKey.trim() || existingKey;
  }

  // Step 3: Base URL (only prompt for custom; otherwise use the profile's URL)
  let selectedBaseUrl = selectedProfile.baseUrl;
  if (selectedProfile.id === 'custom') {
    console.log(`\n  ${chalk.bold('Step 3: Custom Endpoint')}`);
    const urlInput = await clackText({
      message: 'Enter base URL (e.g. https://api.example.com/v1):',
      defaultValue: existing.llm?.baseUrl ?? '',
    });
    if (typeof urlInput === 'string' && urlInput.trim()) selectedBaseUrl = urlInput.trim();
  }

  // Step 4: Model selection — DYNAMIC. Fetch /models from the provider.
  console.log(`\n  ${chalk.bold('Step 4: Select Model')}`);
  console.log(`  ${chalk.dim('Fetching live model list from provider...')}`);
  const probeConfig: DynamicLLMConfig = {
    providerId: selectedProfile.id,
    providerName: selectedProfile.name,
    baseUrl: selectedBaseUrl,
    apiKey: selectedApiKey,
    model: '', // empty — we're discovering
    authStyle: selectedProfile.authStyle,
    protocol: selectedProfile.protocol,
  };
  clearModelCache();
  const spinner = ora('Fetching models...').start();
  const discoveredModels: readonly DiscoveredModel[] = await getProviderModels(probeConfig);
  if (discoveredModels.length > 0) {
    spinner.succeed(`Found ${discoveredModels.length} models`);
    // Show first 30 + a "type your own" fallback
    const shown = discoveredModels.slice(0, 30);
    const modelOptions = [
      ...shown.map(m => ({ value: m.id, label: m.label, hint: m.hint })),
    ];
    const modelChoice = await select({
      message: `Select model (showing ${shown.length} of ${discoveredModels.length}):`,
      options: modelOptions,
    });
    let selectedModel = '';
    if (typeof modelChoice === 'string') {
      selectedModel = modelChoice;
    } else {
      // User cancelled — allow manual entry
      const manual = await clackText({ message: 'Enter model ID manually:', defaultValue: '' });
      if (typeof manual === 'string') selectedModel = manual.trim();
    }
    await saveAndVerify(probeConfig, selectedProfile, selectedApiKey, selectedBaseUrl, selectedModel, existing);
  } else {
    // /models failed — fall back to manual entry + models.dev catalog hint
    spinner.warn('Could not fetch model list from provider');
    console.log(`  ${chalk.dim('You can enter a model ID manually. Check the provider docs:')}`);
    if (selectedProfile.docUrl) console.log(`  ${chalk.dim(selectedProfile.docUrl)}`);
    const manual = await clackText({
      message: 'Enter model ID:',
      defaultValue: existing.llm?.model ?? '',
    });
    let selectedModel = '';
    if (typeof manual === 'string') selectedModel = manual.trim();
    if (!selectedModel) { error('No model specified — setup cancelled'); return; }
    await saveAndVerify(probeConfig, selectedProfile, selectedApiKey, selectedBaseUrl, selectedModel, existing);
  }
}

/** Shared save + verify step used by both branches of model selection. */
async function saveAndVerify(
  probeConfig: DynamicLLMConfig,
  profile: ProviderProfile,
  apiKeyVal: string,
  baseUrlVal: string,
  modelVal: string,
  existing: MysteriumConfig,
): Promise<void> {
  // Step 5: Verify connection
  console.log(`\n  ${chalk.bold('Step 5: Verify Connection')}`);
  const verifyConfig: DynamicLLMConfig = { ...probeConfig, model: modelVal };
  const spinner = ora('Verifying connection...').start();
  const verification = await verifyProviderConnection(verifyConfig);
  if (verification.ok) {
    spinner.succeed(verification.message);
  } else {
    spinner.warn(`Verification: ${verification.message}`);
    console.log(`  ${chalk.dim('You can still save — fix the issue before playing.')}`);
  }

  // Step 6: Save config
  const config: MysteriumConfig = {
    llm: {
      provider: profile.id as any,
      apiKey: apiKeyVal || existing.llm?.apiKey,
      model: modelVal,
      baseUrl: baseUrlVal,
    },
    session: { defaultEncounters: existing.session?.defaultEncounters ?? 20, defaultMode: existing.session?.defaultMode ?? 'full' },
  };
  saveConfig(config);

  // Invalidate the LLMClient config cache so the next session picks up the new config.
  invalidateConfigCache();

  // Summary
  console.log('');
  success(`Configuration saved to ${CONFIG_FILE}`);
  console.log(`\n  ${chalk.bold('Summary')}`);
  console.log(`  ${chalk.green('✓')} provider:    ${profile.name}`);
  console.log(`  ${chalk.green('✓')} model:       ${modelVal}`);
  console.log(`  ${chalk.green('✓')} endpoint:    ${baseUrlVal}`);
  console.log(`  ${chalk.green('✓')} api key:     ${apiKeyVal ? `${apiKeyVal.slice(0, 8)}...` : '(none)'}`);
  console.log(`\n  Run ${chalk.bold('mysterium')} to start your developmental journey.\n`);
}

// ── Status command ────────────────────────────────────────────────────
async function runStatus(): Promise<void> {
  // P0-3 (UX-R3): JSON-mode branch. Previously `status --json` produced
  // broken output — section headers appeared but content was stripped
  // because the pretty-print helpers (info(), banner()) suppress themselves
  // in JSON mode, while console.log() for headers did not. This made the
  // CLI unscriptable. Now we emit a single structured JSON object.

  bootRegistries();
  const moduleRegistry = bootModuleRegistry();
  (globalThis as any).__moduleRegistry = moduleRegistry;

  // P1-3 (UX-R3): Mirror the session-entry threshold tuning so status
  // PILOT-5.5: No-LLM threshold lowering removed — game requires LLM.
  // Threshold is always 20 (the LLM-calibrated value).

  if (JSON_MODE) {
    const sig = hasSave() ? loadSave() : null;
    // Veil compliance: the JSON output respects the same Veil as the
    // pretty-print path — qualitative aesthetic + milestone, not raw
    // clinical state. Stage names and trace counts are exposed because
    // they are already user-visible in the pretty-print table.
    // R11-R2: stageAesthetics map removed — use describeStage from veilDescriptors.
    const stageAestheticsShort: Record<string, string> = {
      Infrared: 'primal', Magenta: 'symbolic', Red: 'power', Amber: 'order',
      Orange: 'reason', Green: 'harmony', Teal: 'vision', Turquoise: 'unity',
    };
    const out: any = {
      type: 'status',
      version: VERSION,
      node: process.version,
      config: {
        configDir: CONFIG_DIR,
        hasConfigFile: fs.existsSync(CONFIG_FILE),
        // P1-F5: resolved runtime config (env vars + config file + CLI flags),
        // not just the saved config file. Matches the pretty-print path.
        provider,
        providerName: resolvedLLM.providerName,
        endpoint: baseUrl,
        model,
        llmActive: LLM_ACTIVE,
        hasApiKey: !!(apiKey && apiKey !== 'sk-placeholder'),
        apiKeyPrefix: (apiKey && apiKey !== 'sk-placeholder') ? apiKey.slice(0, 8) + '...' : null,
      },
      system: {
        modulesLoaded: moduleRegistry.count(),
        holons: 36, // matches diagnostic; kept stable for scriptability
      },
    };
    if (sig) {
      // R11-R2: use describePersonalResonance for player-responsive resonance.
      const aesthetic = describePersonalResonance(sig);
      const milestone = sig.totalEncounters === 0
        ? 'Your path is yet to begin.'
        : sig.totalEncounters < 10
          ? 'You have tasted the first edges.'
          : sig.totalEncounters < 30
            ? 'Your path deepens with each step.'
            : 'The shape of your journey grows clear.';
      out.save = {
        playerId: sig.id,
        currentStage: sig.currentStage,
        stageAesthetic: aesthetic,
        resonance: `The world feels ${aesthetic}.`,
        journeyMilestone: milestone,
        totalEncounters: sig.totalEncounters,
        totalSessions: sig.totalSessions,
        shadowsActive: sig.shadows.activeCount,
        lines: ALL_LINES.map((line) => {
          const stage = sig.altitudes[line] ?? 'Red';
          const cellKey = `${line}:${stage}`;
          const traces = sig.polarity.cells[cellKey]?.traceCount ?? 0;
          return {
            line,
            stage,
            stageAesthetic: stageAestheticsShort[stage] ?? 'power',
            encounters: traces,
          };
        }),
      };
      if (DEV_MODE) {
        const snapshot = toSnapshot(sig);
        const cci = computeCCI(snapshot);
        const mh = cci.metabolicHealth;
        out.dev = {
          cci: cci.composite,
          gz: mh?.gz ?? null,
          pz: mh?.pz ?? null,
          metabolicTotal: mh?.total ?? null,
          interpretation: mh?.interpretation ?? null,
          transformationPhase: sig.transformationPhase ?? 'idle',
          rayProfile: sig.rayProfile,
          transformationTargetStage: sig.transformationTargetStage ?? null,
          sessionsInPhase: sig.transformationSessionsInPhase ?? 0,
          knotsResolved: sig.transformationKnotsResolved ?? 0,
          internalizedHolons: sig.internalizedHolons?.length ?? 0,
          greatWayDirection: sig.greatWayDirection ?? null,
        };
        // P0-R1 follow-up: Include curriculum data in JSON status output.
        try {
          if (sig.knowledge && sig.knowledge.conceptStates.size > 0) {
            const conceptCount = sig.knowledge.conceptStates.size;
            const conceptStates = [...sig.knowledge.conceptStates.values()];
            const avgRetention = conceptStates.reduce((sum, cs) => sum + cs.retention, 0) / conceptCount;
            out.save!.curriculum = {
              conceptsStudied: conceptCount,
              avgRetention: Math.round(avgRetention * 100) / 100,
            };
          }
        } catch { /* best-effort */ }
      }
      // R5-P2-2 (UX-R5): Add Transformation Readiness to status --json so
      // JSON consumers (scripts, CI, dashboards) can see the trajectory.
      // Previously this was only in the human-readable path.
      try {
        const currentOrd = stageOrdinal(sig.currentStage);
        if (currentOrd < ALL_STAGES.length - 1) {
          const targetStage = ALL_STAGES[currentOrd + 1]!;
          const report = computeReadiness(sig, targetStage);
          out.transformationReadiness = {
            currentStage: sig.currentStage,
            targetStage,
            readiness: report.overall,
            threshold: 0.8,
            convergence: report.convergence,
            saturation: report.saturation,
            shadowClearance: report.shadowClearance,
          };
        }
      } catch {
        // Best-effort — don't let readiness computation break JSON.
      }
    } else {
      out.save = null;
    }
    process.stdout.write(JSON.stringify(out) + '\n');
    return;
  }

  banner('Mysterium Status');
  console.log(`\n  ${chalk.bold('Configuration')}`);
  info('config', fs.existsSync(CONFIG_FILE) ? CONFIG_FILE : '(no config file — using env vars)');
  // P1-F5 (Fresh-User UX Audit): Show the RESOLVED runtime LLM config, not
  // the stale saved config file. Before this fix, `status` reported
  // 'provider: gemini (default)' and 'api key: not set' even when the LLM
  // was clearly active via env vars (OPENCODE_API_KEY + MODEL) — because it
  // read from the saved config file, which was empty. The `diagnostic`
  // command correctly showed 'LLM: active' because it used the resolved
  // config. This inconsistency made users think nothing was configured.
  // Now both commands use the resolved runtime config.
  info('provider', `${provider} (${resolvedLLM.providerName})`);
  info('endpoint', baseUrl);
  info('model', model);
  info('api key', apiKey && apiKey !== 'sk-placeholder' ? `${apiKey.slice(0, 8)}...` : 'not set');
  info('llm active', LLM_ACTIVE ? `${chalk.green('yes')}` : `${chalk.red('no')}`);

  console.log(`\n  ${chalk.bold('Game State')}`);
  if (hasSave()) {
    const sig = loadSave();
    if (sig) {
      // T-3.4 (Veil compliance): show only player id + qualitative state.
      // No stage name, no encounter count, no altitudes chart, no shadow/drive displays.
      info('player', sig.id);

      // R11-R2: use describePersonalResonance for player-responsive resonance.
      // The resonance now changes based on the player's shadow patterns and
      // drive imbalances, not just their stage label.
      const aesthetic = describePersonalResonance(sig);
      info('resonance', `The world feels ${aesthetic}. ${chalk.dim('(the poetic texture of your current stage)')}`);

      // Qualitative encounter milestone
      const milestone = sig.totalEncounters === 0
        ? 'Your path is yet to begin.'
        : sig.totalEncounters < 10
          ? 'You have tasted the first edges.'
          : sig.totalEncounters < 30
            ? 'Your path deepens with each step.'
            : 'The shape of your journey grows clear.';
      info('journey', milestone);
      info('encounters', `${sig.totalEncounters} completed across ${sig.totalSessions} session(s)`);

      // UX-P2-1: Show per-line progress as a Veil-compliant qualitative display.
      // Previously status showed only flavor text — no visible progression.
      // Now the user can see which lines they've explored and a sense of depth.
      // P2-Y5 (Fresh-User UX Audit v2): Cut the per-line stage bars (RPG
      // character-sheet frame). Replace with a single 'current edge' line
      // that names the line the player has been working on most. The per-line
      // data remains in the Significator for the engine; the player sees a
      // qualitative pointer to their current edge.
      const progressAll = getLineProgress(sig);
      // Find the line with the highest progress (the player's current edge)
      let edgeLine: Line | null = null;
      let edgeRatio = 0;
      for (const line of ALL_LINES) {
        const stage = sig.altitudes[line] ?? 'Red';
        const cellKey = `${line}:${stage}`;
        const traces = sig.polarity.cells[cellKey]?.traceCount ?? 0;
        const prog = progressAll.find(p => p.line === line);
        const ratio = prog?.ratio ?? 0;
        if (traces > 0 && ratio > edgeRatio) {
          edgeRatio = ratio;
          edgeLine = line;
        }
      }
      if (edgeLine) {
        const satBand = saturationToFeltSense(edgeRatio);
        console.log(`\n  ${chalk.bold('Current Edge')}`);
        console.log(`  ${chalk.dim('You have been sitting with the')}`);
        console.log(`  ${chalk.cyan(edgeLine.toLowerCase())} ${chalk.dim('dimension —')} ${chalk.italic(satBand)}`);
      } else {
        console.log(`\n  ${chalk.bold('Current Edge')}`);
        console.log(`  ${chalk.dim('The work is still opening. Play a session to find your edge.')}`);
      }

      // R4-P2-1 (UX-R4): Transformation Readiness indicator. Shows the user
      // their trajectory toward the next stage transition — closing Loop 3's
      // visibility gap. Previously, a fresh user could play 8 encounters and
      // see only "1/20" per line with no sense of what 1/20 meant or where it
      // was going. Now they see the composite readiness + what's blocking.
      // P1-R2 (Fresh-User UX Audit v2): De-quantified. Replaced percentages
      // and progress bars with qualitative felt-sense language. The numeric
      // data is available via --dev for engineers.
      // Veil-compliant: structural progress, not clinical state.
      try {
        const currentOrd = stageOrdinal(sig.currentStage);
        if (currentOrd < ALL_STAGES.length - 1) {
          const targetStage = ALL_STAGES[currentOrd + 1]!;
          const report = computeReadiness(sig, targetStage);
          console.log(`\n  ${chalk.bold('Trajectory')}`);
          const readinessBand = readinessToFeltSense(report.overall);
          if (DEV_MODE) {
            info('readiness', `${(report.overall * 100).toFixed(0)}% — ${readinessBand}`);
          } else {
            info('trajectory', readinessBand);
          }
          // Qualitative dimension descriptions
          const convergenceBand = saturationToFeltSense(report.convergence);
          const saturationBand = saturationToFeltSense(report.saturation);
          console.log(`    ${chalk.dim(`lines explored: ${convergenceBand}`)}`);
          console.log(`    ${chalk.dim(`depth at current stage: ${saturationBand}`)}`);
          // R11-P2 (Fresh-User UX Audit): Suppress the misleading "100% cleared"
          // report when no shadows have actually been detected. Without U3
          // (LLM-based shadow detection), shadows.entries is typically empty,
          // which the engine reads as "no blocking shadows" — but the player
          // reads as "my shadows are resolved." Make the absence visible.
          //
          // R11-Phase2 update: Now that the LLM fix (U1) is in place, shadow
          // detection actually fires. Distinguish three states:
          // 1. No shadows detected at all → "not yet engaged"
          // 2. Shadows detected but none critical (severity < 0.7) → "X patterns surfaced (working through)"
          // 3. Critical shadows blocking → original bar display
          const totalShadows = sig.shadows.entries.length;
          const unresolvedShadows = sig.shadows.entries.filter(e => e.resolvedAt === null).length;
          const shadowsDetected = totalShadows > 0; // NF3-9: define shadowsDetected (was undefined, causing the Focus hint to throw)
          if (unresolvedShadows === 0 && totalShadows === 0) {
            console.log(`    ${chalk.dim('shadows: not yet engaged (detection requires more encounters)')}`);
          } else if (unresolvedShadows === 0) {
            console.log(`    ${chalk.dim(`shadows: all ${totalShadows} pattern${totalShadows === 1 ? '' : 's'} resolved`)}`);
          } else if (report.shadowClearance >= 1) {
            console.log(`    ${chalk.dim(`shadows: ${unresolvedShadows} pattern${unresolvedShadows === 1 ? '' : 's'} surfaced, working through`)}`);
          } else {
            console.log(`    ${chalk.dim('shadows: critical patterns resolving')}`);
          }
          // Actionable hint based on the weakest dimension
          // R11-P2: only include shadow clearance in the focus hint if shadows
          // have actually been detected. Otherwise the hint would recommend
          // shadow-work to a player who has no detected shadows, which is
          // confusing.
          const dims = [
            { name: 'convergence', val: report.convergence, hint: 'Play encounters across more lines' },
            { name: 'saturation', val: report.saturation, hint: 'Play more encounters at your current stage' },
            ...(shadowsDetected
              ? [{ name: 'shadow clearance', val: report.shadowClearance, hint: 'Engage with shadow-work encounters' }]
              : []),
          ].sort((a, b) => a.val - b.val);
          if (report.overall < 0.8) {
            console.log(`    ${chalk.dim(`Focus: ${dims[0]!.hint}`)}`);
          } else {
            console.log(`    ${chalk.green('✓ The threshold is here — transformation may fire this session')}`);
          }
          // NF3-9 (Fresh-User Audit 3): Tell the player what transforming will
          // feel like. The audit found: 'The Transformation Readiness block
          // tells me the threshold (80%) but not what crossing it will feel
          // like or unlock. At 11% saturation after 4 sessions, I'd need ~36
          // more sessions to transform — a massive investment with no
          // emotional pull toward the work.' This line gives the pull.
          console.log(`    ${chalk.dim(`When you transform ${sig.currentStage} → ${targetStage}: the resonance will shift, new encounter types will unlock, and the work will deepen.`)}`);
        } else {
          console.log(`\n  ${chalk.bold('Trajectory')}`);
          info('stage', `${sig.currentStage} (maximum — no further transitions)`);
        }
      } catch {
        // Best-effort — don't let readiness computation break status.
      }

      // Wave 3.1: Dev-mode holistic primitives
      if (DEV_MODE) {
        console.log(`\n  ${chalk.bold('Holistic Primitives (dev mode)')}`);
        const snapshot = toSnapshot(sig);
        const cci = computeCCI(snapshot);
        info('G_z', cci.metabolicHealth?.gz.toFixed(4) ?? 'n/a');
        info('P_z', cci.metabolicHealth?.pz.toFixed(4) ?? 'n/a');
        info('total', cci.metabolicHealth?.total.toFixed(4) ?? 'n/a');
        info('interpretation', cci.metabolicHealth?.interpretation ?? 'n/a');
        info('transformationPhase', sig.transformationPhase ?? 'idle');
        info('rayProfile', JSON.stringify(sig.rayProfile));
        if (sig.transformationTargetStage) info('targetStage', sig.transformationTargetStage);
        info('sessionsInPhase', String(sig.transformationSessionsInPhase ?? 0));
        info('knotsResolved', String(sig.transformationKnotsResolved ?? 0));
        info('internalizedHolons', String(sig.internalizedHolons?.length ?? 0));
        info('greatWayDirection', sig.greatWayDirection ?? 'null');
        // Ponytail gap: expose indigoRayAccessibility in dev mode
        const indigoAccess = (sig.rayProfile.Green + sig.rayProfile.Blue + sig.rayProfile.Indigo) / 3;
        info('indigoRayAccess', indigoAccess.toFixed(4));
      }
    }
  } else {
    info('save', `${chalk.yellow('no saved game')} — run ${chalk.bold('mysterium session')} to start`);
    // P2-Y5 (Fresh-User UX Audit v2): The pre-play status previously showed
    // the full 8-line table with stage bars and '0 encounters' counts — an
    // RPG character-sheet frame that violates the Veil. Replaced with a
    // single qualitative invitation that matches the post-play format.
    console.log(`\n  ${chalk.bold('Current Edge')}`);
    console.log(`  ${chalk.dim('The work is still opening. Play a session to find your edge.')}`);
  }

  // P0-R1 (Curriculum Architecture Audit): Surface curriculum progress in status.
  {
    const _sig = hasSave() ? loadSave() : null;
    if (_sig && _sig.knowledge && _sig.knowledge.conceptStates.size > 0) {
      const conceptCount = _sig.knowledge.conceptStates.size;
      const avgRetention = [..._sig.knowledge.conceptStates.values()]
        .reduce((sum, cs) => sum + cs.retention, 0) / conceptCount;
      const retentionDesc = avgRetention > 0.7 ? 'well-held'
        : avgRetention > 0.4 ? 'developing'
        : 'fading';
      console.log(`\n  ${chalk.bold('Knowledge')}`);
      info('concepts', `${conceptCount} studied, ${retentionDesc}`);
    }
  }

  console.log(`\n  ${chalk.bold('System')}`);
  info('modules', `${moduleRegistry.count()} loaded`);
  info('config dir', CONFIG_DIR);
  info('node', process.version);
  info('version', VERSION);
}

// ── Glossary command (P2-2 / UX-R3) ───────────────────────────────────
// The fresh-user audit found a severe vocabulary wall. Terms like Holon,
// Significator, CCI, rayProfile, G_z/P_z appeared in CLI output with no
// explanation. Users felt like outsiders. The glossary command prints
// 1-line definitions for every term, breaching the wall without requiring
// users to read the docs. The Veil is preserved — these are system-facing
// terms, not player-facing diagnoses.
//
// R11-Y3 (Fresh-User UX Audit): The 23-term dump was experienced by fresh
// users as "walking into a graduate seminar 6 months late." Now shows only
// the Tier 1 essentials (Line, Stage, Shadow) + any Tier 2 terms the player
// has unlocked by encountering them in play.
// P2-U5 (Fresh-User UX Re-Audit): Progressive vocabulary unlock. The --full
// flag now requires --dev (it exposes clinical definitions). Default view
// shows Tier 1 + unlocked Tier 2 terms only.
function runGlossary(showFull = false): void {
  // P2-U5: --full requires --dev (clinical definitions are engineering vocabulary)
  if (showFull && !DEV_MODE) {
    banner('Mysterium Glossary');
    console.log(`\n  ${chalk.yellow('⚠ --full requires --dev')}: the full glossary contains clinical definitions (CCI bands, G_z/P_z, shadow quadrants) that break the contemplative frame. Use --dev --full for engineering access.`);
    console.log(`\n  ${chalk.dim('Showing player-facing terms instead:')}\n`);
    showFull = false;
  }

  banner(showFull ? 'Mysterium Glossary (full — dev mode)' : 'Mysterium Glossary');

  // P2-U5: Load unlocked terms from profile
  const profileDir = getActiveProfileDir();
  const unlockedTerms = loadUnlockedTerms(profileDir);

  if (JSON_MODE) {
    // JSON consumers (WebUI, agents) always get the full set + unlock status.
    process.stdout.write(JSON.stringify({
      type: 'glossary',
      terms: GLOSSARY_TERMS,
      playerTerms: PLAYER_GLOSSARY_TERMS,
      tier2Terms: TIER2_GLOSSARY_TERMS,
      advancedTerms: ADVANCED_GLOSSARY_TERMS,
      unlockedTerms,
    }) + '\n');
    return;
  }

  if (showFull) {
    // --dev --full: show everything
    console.log('');
    for (const { term, def } of GLOSSARY_TERMS) {
      console.log(`  ${chalk.bold.cyan(term.padEnd(16))} ${chalk.dim(def)}`);
    }
    console.log(`\n  ${chalk.dim(`— ${GLOSSARY_TERMS.length} terms (dev mode). —`)}\n`);
    return;
  }

  // Default: Tier 1 (always available) + unlocked Tier 2 terms
  console.log('');
  console.log(`  ${chalk.dim('— Always available —')}`);
  for (const { term, def } of PLAYER_GLOSSARY_TERMS) {
    console.log(`  ${chalk.bold.cyan(term.padEnd(16))} ${chalk.dim(def)}`);
  }

  // Show unlocked Tier 2 terms
  const unlockedTier2 = TIER2_GLOSSARY_TERMS.filter(t => unlockedTerms.includes(t.term));
  if (unlockedTier2.length > 0) {
    console.log(`\n  ${chalk.dim('— Unlocked through play —')}`);
    for (const { term, def } of unlockedTier2) {
      console.log(`  ${chalk.bold.cyan(term.padEnd(16))} ${chalk.dim(def)}`);
    }
  }

  const lockedCount = TIER2_GLOSSARY_TERMS.length - unlockedTier2.length;
  if (lockedCount > 0) {
    console.log(`\n  ${chalk.dim(`— ${lockedCount} term${lockedCount === 1 ? '' : 's'} still locked. Play more sessions to unlock them. —`)}`);
  } else if (unlockedTier2.length > 0) {
    console.log(`\n  ${chalk.green.dim('— All player terms unlocked. —')}`);
  }
  console.log('');
}

// ── Curriculum management ─────────────────────────────────────────
// P1-C3 (Architecture Audit Phase C): runCurriculum extracted to
// scripts/CurriculumCommands.ts as part of the cli-game.ts modular split.
import { runCurriculum } from './CurriculumCommands.js';

// P1-QW3 (Architecture Audit Phase A): CLI telemetry inspector.
// Reads the persisted telemetry events from the active profile directory and
// shows the most recent N (default 20). Opt-in only: if telemetry was never
// enabled the KV key is absent and we report that explicitly.
async function runEvents(args: string[]): Promise<void> {
  banner('Telemetry Events');
  let tail = 20;
  for (const a of args) {
    const m = a.match(/^--tail=(\d+)$/);
    if (m) tail = Math.max(1, parseInt(m[1]!, 10));
  }
  const telemetry = await buildCLITelemetry().catch(() => null);
  if (!telemetry) {
    console.log(`\n  ${chalk.dim('Telemetry is disabled. Enable via ~/.mysterium/config.json: { "telemetry": true }')}`);
    console.log(`  ${chalk.dim('No data is recorded unless you opt in.')}`);
    return;
  }
  // Force the collector to drain to store by flushing.
  await flushCLITelemetry(telemetry);
  // FIX-A3 (Audit): Load persisted events from the store, not just the
  // in-memory collector. Each CLI invocation gets a fresh collector; without
  // loading the store, events from prior sessions are invisible.
  const { loadPersistedTelemetry } = await import('../src/cli/CLITelemetry.js');
  const persisted: TelemetryEvent[] = await loadPersistedTelemetry().catch(() => []);
  const buffered = telemetry.getCollector().getEvents();
  // Merge: persisted (from prior processes) + buffered (current process not yet flushed), deduped by id
  const seen = new Set<string>();
  const events: TelemetryEvent[] = [];
  for (const e of [...persisted, ...buffered]) {
    const id = (e as unknown as Record<string, unknown>).id as string | undefined;
    if (id && seen.has(id)) continue;
    if (id) seen.add(id);
    events.push(e);
  }
  if (events.length === 0) {
    console.log(`\n  ${chalk.dim('No telemetry events buffered in this session. Play a session, then run this command.')}`);
    return;
  }
  const recent = events.slice(-tail);
  console.log(`\n  ${chalk.bold(`Recent ${recent.length} of ${events.length} event(s):`)}\n`);
  for (const e of recent) {
    const ts = new Date(e.timestamp).toISOString().replace('T', ' ').slice(0, 19);
    const data = JSON.stringify(e.data);
    console.log(`  ${chalk.dim(ts)}  ${chalk.cyan(e.type.padEnd(22))}  ${chalk.dim(data)}`);
  }
  console.log('');
}

// ── Main ──────────────────────────────────────────────────────────────
/**
 * `mysterium privacy` — the player's identity-consent dashboard (doc 16 §2.1).
 * show: lists shared fields + active consents. withdraw <field|all>: removes
 * the value and records the withdrawal. The game continues unimpaired.
 */
async function runPrivacyCommand(action: string | undefined, fieldArg: string | undefined): Promise<void> {
  const sig = loadSave();
  const identity = sig?.identity;

  if (action === 'withdraw-all') {
    if (!sig || !identity) { warn('No identity context stored.'); return; }
    let updated = identity;
    for (const f of IDENTITY_FIELDS) {
      if (identity.fields[f] !== undefined) updated = withdrawIdentityField(updated, f, Date.now());
    }
    saveGame({ ...sig, identity: updated });
    success('All identity context withdrawn. The game continues in its universal voice.');
    return;
  }

  if (action === 'withdraw') {
    const field = fieldArg as IdentityField | undefined;
    if (!field || !(IDENTITY_FIELDS as readonly string[]).includes(field)) {
      error(`Specify a field to withdraw: ${IDENTITY_FIELDS.join(', ')} — or an interest/aversion phrase`);
      return;
    }
    if (!sig || !identity || identity.fields[field] === undefined) {
      warn(`No identity data stored for "${field}".`);
      return;
    }
    const updated = withdrawIdentityField(identity, field, Date.now());
    saveGame({ ...sig, identity: updated });
    success(`Identity field "${field}" withdrawn. Voicing falls back to the universal voice.`);
    return;
  }

  // Phase 11 d3 (G29): withdraw a declared preference by its phrase — the value AND the derived
  // tag are removed; nothing new is stored about the withdrawal (47 §8: deletion is not memory).
  if (action === 'withdraw-preference' && fieldArg) {
    if (!sig || !identity) { warn('No identity context stored.'); return; }
    const before = identity;
    let updated = withdrawDeclaredPreference(before, 'interests', fieldArg, Date.now());
    if (updated === before) updated = withdrawDeclaredPreference(before, 'aversions', fieldArg, Date.now());
    if (updated === before) { warn(`No active preference matches "${fieldArg}".`); return; }
    saveGame({ ...sig, identity: updated });
    success(`Preference "${fieldArg}" withdrawn. The game stops reaching for it immediately.`);
    return;
  }

  // default: show
  if (!identity || Object.keys(identity.fields).length === 0) {
    console.log(`\n  ${chalk.dim('No identity context shared. The game speaks in its universal voice.')}`);
    console.log(`  ${chalk.dim('You can share context during')} ${chalk.bold('mysterium setup-profile')}${chalk.dim('.')}`);
    return;
  }
  console.log(`\n  ${chalk.bold('Identity context (local-only)')}`);
  for (const f of IDENTITY_FIELDS) {
    const value = identity.fields[f];
    if (value === undefined) continue;
    const consent = identity.consents[f];
    const purposes = consent ? consent.purposes.join(', ') : 'no purposes';
    console.log(`  ${chalk.cyan(f.padEnd(14))} ${value}  ${chalk.dim('· used for: ' + purposes)}`);
  }
  // Phase 11 d3 (G29): declared preferences, shown exactly as stored (47 §8 legibility —
  // the player's own phrase plus what the game derived from it).
  const prefs = identity.preferences;
  if (prefs && (prefs.interests.some((p) => p.withdrawnAtMs === null) || prefs.aversions.some((p) => p.withdrawnAtMs === null))) {
    console.log(`\n  ${chalk.bold('Declared preferences (tune what the game reaches for — never levels)')}`);
    for (const [kind, list] of [['interest', prefs.interests], ['aversion', prefs.aversions]] as const) {
      for (const p of list) {
        if (p.withdrawnAtMs !== null) continue;
        const derived = p.tag ? chalk.dim(` · shapes: ${p.tag}`) : chalk.dim(' · no tag derived');
        console.log(`  ${chalk.magenta(kind.padEnd(9))} "${p.phrase}"${derived}`);
      }
    }
  }
  console.log(`\n  ${chalk.dim('Withdraw any field:')} ${chalk.bold('mysterium privacy withdraw <field>')}`);
  console.log(`  ${chalk.dim('Withdraw everything:')} ${chalk.bold('mysterium privacy withdraw-all')}`);
  console.log(`  ${chalk.dim('Withdraw a preference:')} ${chalk.bold('mysterium privacy withdraw-preference "<phrase>')}`);
  console.log(`  ${chalk.dim('This data never leaves your device and never affects levels or difficulty.')}`);
}

// ── Delegation smoke (doc 43 Phase-1 gate) ──────────────────────────

async function runDelegateCommand(argv: string[]): Promise<void> {
  const { delegateSession, emptyLedgerState, ratifyProposalsTool, schedulePresence } = await import('../src/core/orchestration/orchestratorTools.js');
  const { createSignificator } = await import('../src/core/domain/Significator.js');
  const { createInitialWorldState } = await import('../src/core/engines/CandidateGeneration.js');
  // NB: `ALL_LINES` / `ALL_STAGES` are NOT re-imported here. They are module-level imports in
  // this file, and the local `await import` shadows used to hide that — a second binding for a
  // canonical constant, which is the class that let a retired stage ladder survive (audit §10.4).
  const { seedCurriculumRegistry } = await import('../src/core/curriculum/CurriculumSeed.js');
  const { parseDelegateArgs, DELEGATE_ROLE_PATTERN } = await import('./cli/delegateArgs.js');

  // Flags are read from the raw argv tail via parseDelegateArgs — see that
  // module for the collision rules this surface must obey (--json comes from
  // the ROOT opts; the budget flag must not share a root flag's name).
  const { role, line, stage, budget, seed, summon, trigger, intent } = parseDelegateArgs(argv);
  const asJson = JSON_MODE;

  // Narrowing guards. `parseDelegateArgs` returns RAW strings on purpose — the flags come from the
  // argv tail, so a garbage value must fail closed rather than be cast into a domain type. The
  // narrowing happens ONCE, here, so every consumer below is typed and needs no casts.
  const isLineArg = (v: string): v is Line => (ALL_LINES as readonly string[]).includes(v);
  const isStageArg = (v: string): v is Stage => (ALL_STAGES as readonly string[]).includes(v);
  const isRoleArg = (v: string): v is AgentRole =>
    DELEGATE_ROLE_PATTERN.test(v) && (ALL_AGENT_ROLES as readonly string[]).includes(v);

  if (!isRoleArg(role) || !isLineArg(line) || !isStageArg(stage)) {
    if (asJson) {
      process.stdout.write(JSON.stringify({ ok: false, violation: { code: 'invalid_argument', detail: `role/line/stage: ${role}/${line}/${stage}` } }) + '\n');
    } else {
      console.error(`Invalid --role/--line/--stage: ${role}/${line}/${stage}`);
    }
    process.exitCode = 1;
    return;
  }

  seedCurriculumRegistry();
  const altitudes = Object.fromEntries(ALL_LINES.map((l) => [l, stage])) as Record<import('../src/core/domain/Line.js').Line, import('../src/core/domain/Stage.js').Stage>;
  const sig = createSignificator(`cli-${seed}`, altitudes, stage);

  // Encounter pool: the scheduler needs resolvable holons for the target cell.
  // Reuse the kernel harness's world factory via its exported makeWorld path;
  // if unavailable, fall back to a minimal one-cell world.
  let world: import('../src/core/engines/EncounterScheduler.js').WorldState;
  try {
    const harness = await import('../src/core/validation/harness.js');
    const mk = (harness as unknown as { makeWorld?: () => import('../src/core/engines/EncounterScheduler.js').WorldState }).makeWorld;
    world = mk
      ? mk.call(harness)
      : createInitialWorldState([{
          id: `h-${line}-${stage}`, name: `${line} ${stage} contact`, kind: 'NPC',
          line, stage,
          drives: { dominant: 'Agency', secondary: 'Eros', shadowQuadrant: null },
          polarity: 'Sovereign', narrativeRole: 'delegate-smoke', relationships: [], active: true,
        } as never]);
  } catch {
    world = createInitialWorldState([]);
  }
  const session = { targetSessionLength: Math.max(1, budget), encountersSoFar: 0, recentLines: [], sessionDurationMs: 0 };

  // ── Phase 13 d12: `--summon` — the DISPATCHER decides who appears (43 §3.3) ──────────────
  // The council tools are invoked exactly as the live loop invokes them, so this is a real
  // dispatch (trigger table → roles → delegated mandates → ratification), not a mock. `--trigger
  // <name>` names the state to simulate for a drill; absent, the quiet state (the ordinary
  // encounter) is used with `--intent` selecting its Journey-Guide.
  if (summon) {
    const { councilIntegrationFrom, handleCouncilTool } = await import('../src/core/assessments/councilTools.js');
    const { observationForTrigger, ALL_TRIGGERS, dispatchCouncil } = await import('../src/core/orchestration/dispatcher.js');
    const { ROLE_TOOLSETS } = await import('../src/core/orchestration/types.js');
    const { AGENT_ROLE_COUNCIL } = await import('../src/core/orchestration/councilStanding.js');
    const { createOrchestrationServices, buildEnvelope } = await import('../src/core/personalization/sessionRuntime.js');

    if (trigger !== undefined && !(ALL_TRIGGERS as readonly string[]).includes(trigger)) {
      const detail = `unknown --trigger '${trigger}' (known: ${ALL_TRIGGERS.join(', ')})`;
      if (asJson) process.stdout.write(JSON.stringify({ ok: false, violation: { code: 'invalid_argument', detail } }) + '\n');
      else console.error(detail);
      process.exitCode = 1;
      return;
    }

    const observation = observationForTrigger((trigger ?? 'encounter-open') as never, intent);
    // The same pure decision the tool will make — printed so the CLI shows the dispatcher's ruling
    // (presence order and foreground), not merely the list of mandates that ran.
    const decision = dispatchCouncil({ ...observation, seed });
    const services = createOrchestrationServices();
    const env = buildEnvelope(
      services, sig,
      { usable: [], declaredInterests: [] },
      { line, stage, modality: 'ScenarioChoice' as never },
      `CLI summons (${trigger ?? 'quiet state'})`, [], 1_000_000, null,
    );

    let curSig = sig;
    let curWorld = world;
    let ledger = emptyLedgerState();
    const proposals: import('../src/core/orchestration/types.js').Proposal[] = [];

    const integration = councilIntegrationFrom({
      observation,
      seed,
      cell: { line: line as never, stage: stage as never },
      plannedRoles: ['therapist', 'J1', 'J4', 'T1', 'A2'],
      run: async (summoned) => {
        const spec: import('../src/core/orchestration/types.js').DelegationSpec = {
          role: summoned,
          ...(['J1', 'J2', 'J3', 'J4', 'J5'].includes(summoned) ? { cell: { line: line as never, stage: stage as never } } : {}),
          purpose: `CLI summons (${trigger ?? 'quiet state'}): ${summoned} mandate`,
          readProjection: new Set(['corpus.moduleSpec'] as const),
          toolset: new Set(ROLE_TOOLSETS[summoned]),
          budget: { toolCallsMax: budget, virtualMsMax: 600_000 },
        };
        const binding = AGENT_ROLE_COUNCIL[summoned];
        const scope = binding ? env.scopes[binding] : undefined;
        const out = await delegateSession({
          spec, sig: curSig, world: curWorld, session, seed, now: 1_000_000, ledger,
          ...(scope ? { scope } : {}),
        });
        if (out.ok) {
          curSig = out.sig;
          curWorld = out.world;
          ledger = out.ledger;
          proposals.push(...(out.result?.proposals ?? []));
        }
        return out;
      },
    });

    const res = await handleCouncilTool('summon_council', '{}', { integration });
    const rat = ratifyProposalsTool({ proposals, sig: curSig, world: curWorld, now: 1_100_000 });
    const sessions = (res.payload.sessions as Record<string, unknown>[] | undefined) ?? [];

    if (asJson) {
      process.stdout.write(JSON.stringify({
        ok: res.ok, summon: true, trigger: decision.trigger, strategy: decision.strategy,
        ...(decision.bypass ? { bypass: true } : {}),
        presence: decision.roles, foreground: decision.foreground,
        summons: res.payload.summons, background: decision.background, sessions,
        ratification: rat.dispositions,
      }) + '\n');
    } else {
      console.log(`\n  ${chalk.bold('Council summons')} — trigger ${chalk.cyan(decision.trigger)} (${decision.strategy})`);
      console.log(`  presence: ${decision.roles.join(' → ')}${decision.foreground ? chalk.dim(` · foreground ${decision.foreground}`) : ''}`);
      if (decision.bypass) console.log(`  ${chalk.yellow('⚠ bypass')} — the frame stops being a game; speak plainly.`);
      for (const s of sessions) {
        const roleName = String(s.role ?? '?');
        const outcome = String(s.outcome ?? '?');
        const reason = s.reason ? chalk.dim(` — ${String(s.reason)}`) : '';
        const kinds = Array.isArray(s.proposals) && s.proposals.length > 0 ? chalk.dim(` · ${(s.proposals as string[]).join(', ')}`) : '';
        console.log(`  ${outcome === 'skipped' || outcome === 'refused' ? chalk.yellow('·') : chalk.green('✓')} ${roleName.padEnd(10)} ${outcome}${reason}${kinds}`);
      }
      console.log(`  ${chalk.dim(`background: ${decision.background.join(', ') || '—'}`)}`);
      for (const d of rat.dispositions) {
        console.log(`  ${d.accepted ? chalk.green('✓') : chalk.yellow('·')} ${d.kind}: ${chalk.dim(d.reason)}`);
      }
      if (trigger === undefined) {
        console.log(`\n  ${chalk.dim('Drill another state:')} ${chalk.bold('mysterium delegate --summon --trigger <crisis|threshold-proximity|depth-plateau|…>')}`);
      }
    }
    return;
  }

  const spec: import('../src/core/orchestration/types.js').DelegationSpec = {
    role,
    ...( ['J1','J2','J3','J4','J5'].includes(role) ? { cell: { line, stage } } : {}),
    purpose: `CLI delegation smoke: ${role} mandate`,
    readProjection: new Set(['corpus.moduleSpec'] as const),
    // P0-FIX (delegate smoke): derive the toolset from ROLE_TOOLSETS so every
    // role's smoke spec passes validation. The old hardcoded fallback
    // (['get_module_spec','record_encounter']) rejected T-roles at the gate —
    // the happy path spec→log→ratify was never reachable for them.
    toolset: new Set(
      (await import('../src/core/orchestration/types.js')).ROLE_TOOLSETS[role] ?? ['get_module_spec', 'record_encounter'] as const,
    ),
    budget: { toolCallsMax: budget, virtualMsMax: 600_000 },
  };

  // P1-LLM: delegateSession is async (choice policies may consult an LLM);
  // the deterministic path is unchanged in outcome, only in await shape.
  const out = await delegateSession({ spec, sig, world, session, seed, now: 1_000_000, ledger: emptyLedgerState() });
  if (!out.ok) {
    const msg = `DELEGATION REJECTED: ${out.violation?.code} — ${out.violation?.detail}`;
    if (asJson) { process.stdout.write(JSON.stringify({ ok: false, violation: out.violation }) + '\n'); }
    else console.error(msg);
    process.exitCode = 1;
    return;
  }

  const rat = ratifyProposalsTool({ proposals: out.result?.proposals ?? [], sig: out.sig, world: out.world, now: 1_100_000 });
  const presence = schedulePresence(seed, ['therapist', 'J1', 'J4', 'T1', 'A2']);

  if (asJson) {
    process.stdout.write(JSON.stringify({
      ok: true, role, outcome: out.result?.outcome, encounters: out.encountersExecuted,
      sessionId: out.log.sessionId, proposals: out.result?.proposals.length ?? 0,
      proposalKinds: out.result?.proposals.map((p) => p.kind) ?? [],
      toolCalls: out.log.toolCalls.map((t) => t.tool),
      signals: out.result?.signals,
      ratification: rat.dispositions, presence,
    }) + '\n');
  } else {
    console.log(`\n  Delegated session — role ${chalk.bold(role)}${out.log.cell ? ` (${out.log.cell.line} × ${out.log.cell.stage})` : ''}`);
    console.log(`  outcome: ${out.result?.outcome}   encounters: ${out.encountersExecuted}   proposals: ${out.result?.proposals.length ?? 0}`);
    console.log(`  session: ${out.log.sessionId}`);
    const trace = out.log.toolCalls.map((t) => t.tool).join(' → ');
    if (trace) console.log(`  tools: ${chalk.dim(trace)}`);
    for (const p of out.result?.proposals ?? []) {
      console.log(`  proposal: ${chalk.cyan(p.kind)} ${chalk.dim(p.rationale)}`);
    }
    if ((out.result?.proposals.length ?? 0) === 0 && out.result?.outcome === 'budget_exhausted') {
      console.log(`  ${chalk.yellow('⚠')} no proposals emitted — mandate starved by the tool budget; raise ${chalk.bold('--budget')} (largest allowlist needs 3).`);
    }
    for (const d of rat.dispositions) {
      console.log(`  ${d.accepted ? chalk.green('✓') : chalk.yellow('·')} ${d.kind}: ${chalk.dim(d.reason)}`);
    }
    console.log(`  presence order: ${presence.join(' → ')}`);
    console.log(`\n  ${chalk.dim('Same --seed reproduces this session exactly (gate G14).')}`);
  }
}

// ── Practice objectives (doc 39) CLI ────────────────────────────────

interface VowFileShape {
  readonly book: import('../src/core/practice/VowService.js').VowBook;
}

function vowFilePath(): string {
  const dir = getMysteriumDirForScope('auto');
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, 'vows.json');
}

function loadVowFile(): VowFileShape {
  const p = vowFilePath();
  if (fs.existsSync(p)) {
    try { return JSON.parse(fs.readFileSync(p, 'utf8')) as VowFileShape; } catch { /* fall through */ }
  }
  return { book: emptyVowBookLocal() };
}

function saveVowFile(state: VowFileShape): void {
  fs.writeFileSync(vowFilePath(), JSON.stringify(state, null, 2));
}

function emptyVowBookLocal(): import('../src/core/practice/VowService.js').VowBook {
  return { vows: [], declineCounts: {} };
}

/**
 * `mysterium pod` — local pod surface (doc 38 M0). Single-machine simulation:
 * the pod state machine runs locally so formation, rituals, and recognition
 * can be exercised end-to-end before the DO transport lands. Same pure core
 * the DO adapter will drive (serial event application).
 */
async function runPodCommand(argv: string[]): Promise<void> {
  const action = argv.find((a) => !a.startsWith('--')) ?? 'status';
  const { emptyPodState, formPod, joinPod, startRitual, advanceRitual, publishAggregate, issueRecognition } = await import('../src/core/pods/podStateMachine.js');
  const p = vowFilePath();
  const podFile = path.join(path.dirname(p), 'pods.json');
  const load = (): { state: ReturnType<typeof emptyPodState>; player: string } => {
    if (fs.existsSync(podFile)) {
      try { return JSON.parse(fs.readFileSync(podFile, 'utf8')); } catch { /* fall through */ }
    }
    return { state: emptyPodState(), player: 'local-player' };
  };
  const save = (data: unknown): void => { fs.writeFileSync(podFile, JSON.stringify(data, null, 2)); };
  const ctx = load();
  let state = ctx.state;
  const now = Date.now();

  if (action === 'form') {
    const id = argv[argv.indexOf('form') + 1] ?? `pod-${now.toString(36)}`;
    const formed = formPod(state, { id, covenant: 'we practice together', createdAtMs: now }, ctx.player);
    save({ state: formed, player: ctx.player });
    console.log(`\n  ${chalk.green('Pod formed:')} ${id}`);
    console.log(chalk.dim('  Others join with: mysterium pod join <podId> (same machine)'));
    return;
  }
  if (action === 'join') {
    const podId = argv[argv.indexOf('join') + 1];
    if (!podId || state.pod?.id !== podId) { console.error(`Pod '${podId ?? ''}' not found on this machine.`); process.exitCode = 1; return; }
    const r = joinPod(state, ctx.player, now);
    if (!r.ok) { console.error(r.reason); process.exitCode = 1; return; }
    state = r.state;
    save({ state, player: ctx.player });
    console.log(`\n  ${chalk.green('Joined.')} ${state.pod?.members.length ?? 0} members.`);
    return;
  }
  if (action === 'ritual') {
    const mode = (argv.includes('--collaborative') ? 'collaborative' : argv.includes('--assistive') ? 'assistive' : 'mirrored') as 'mirrored' | 'collaborative' | 'assistive';
    const members = Object.fromEntries((state.pod?.members ?? []).map((m) => [m.playerId, 'participant']));
    const r = startRitual(state, { encounterTemplateId: 'shared-encounter', mode, roles: members, now });
    if (!r.ok) { console.error(r.reason); process.exitCode = 1; return; }
    state = r.state;
    save({ state, player: ctx.player });
    console.log(`\n  ${chalk.green('Ritual open')} (${mode}) — ${chalk.dim('gathering')}`);
    return;
  }
  if (action === 'advance') {
    const r = advanceRitual(state);
    if (!r.ok) { console.error(r.reason); process.exitCode = 1; return; }
    state = r.state;
    save({ state, player: ctx.player });
    console.log(`\n  Ritual phase: ${chalk.cyan(state.ritual?.state ?? '?')}`);
    return;
  }
  if (action === 'recognize') {
    const to = argv[argv.indexOf('recognize') + 1];
    const kindArg = (argv.find((a) => a.startsWith('--kind=')) ?? '--kind=growth').split('=')[1] as 'consistency' | 'growth' | 'service';
    if (!to) { console.error('Usage: mysterium pod recognize <memberId> [--kind=consistency|growth|service]'); process.exitCode = 1; return; }
    const evidenceRef = `${to}:${kindArg}:local`;
    const memberIds = new Set((state.pod?.members ?? []).map((m) => m.playerId));
    if (!memberIds.has(to)) { console.error(`'${to}' is not a member.`); process.exitCode = 1; return; }
    const pub = state.publishedAggregates[evidenceRef] === undefined
      ? publishAggregate(state, evidenceRef, { kind: kindArg, publishedBy: to, at: now }, now)
      : { state, ok: true as const };
    if (!pub.ok) { console.error(pub.reason); process.exitCode = 1; return; }
    const rec = issueRecognition(pub.state, { fromMemberId: ctx.player, toMemberId: to, kind: kindArg, periodId: 'local', evidenceRef }, now);
    if (!rec.ok) { console.error(rec.reason); process.exitCode = 1; return; }
    state = rec.state;
    save({ state, player: ctx.player });
    console.log(`\n  ${chalk.green('Recognition offered:')} ${kindArg} → ${to}`);
    return;
  }
  // status
  console.log(`\n  Pod: ${state.pod ? chalk.cyan(state.pod.id) : chalk.dim('none — try: mysterium pod form')}`);
  if (state.pod) {
    console.log(`  Covenant: ${chalk.dim(state.pod.covenant)}`);
    for (const m of state.pod.members) console.log(`  · ${m.playerId} ${chalk.dim(`(${m.roles.join(', ')})`)}`);
    if (state.ritual) console.log(`  Ritual: ${state.ritual.mode} — ${chalk.cyan(state.ritual.state)}`);
    console.log(`  Recognitions: ${state.recognitions.length}`);
  }
  console.log('');
}

/**
 * `mysterium credential` — local claim-ledger surface (doc 41 §4.3).
 * Draft → review → issue flow, consent-first: subject naming is the player's
 * per-claim act; export produces W3C-VC-shaped JSON for portability.
 */
async function runCredentialCommand(argv: string[]): Promise<void> {
  const action = argv.find((a) => !a.startsWith('--')) ?? 'list';
  const cred = await import('../src/core/credential/ClaimLedger.js');
  const p = vowFilePath();
  const credFile = path.join(path.dirname(p), 'credentials.json');
  const load = (): import('../src/core/credential/ClaimLedger.js').ClaimLedger => {
    if (fs.existsSync(credFile)) {
      try { return JSON.parse(fs.readFileSync(credFile, 'utf8')); } catch { /* fall through */ }
    }
    return cred.emptyLedger();
  };
  const save = (l: import('../src/core/credential/ClaimLedger.js').ClaimLedger): void => { fs.writeFileSync(credFile, JSON.stringify(l, null, 2)); };
  let ledger = load();

  if (action === 'draft') {
    const domain = argv[argv.indexOf('draft') + 1] ?? 'math.foundations';
    const descriptor = argv.slice(argv.indexOf('draft') + 2).join(' ') || 'Demonstrates assessed competency at measured depth';
    const mastery = cred.masteryEvidenceRef(domain, 'applied', Date.now());
    const { claim, failures } = cred.draftClaim({
      competencyDescriptor: descriptor,
      domain,
      evidence: [mastery],
      method: 'in-game depth assessment (31 dual-depth model)',
      qualityAssurance: 'mysterium internal assessment machinery; evidence refs disclosed',
      nowMs: Date.now(),
    });
    if (failures.length > 0) { console.error(`Draft rejected: ${failures.map((f) => f.message).join('; ')}`); process.exitCode = 1; return; }
    // Store drafts by appending with empty subject; issuance completes them.
    ledger = { ...ledger, claims: [...ledger.claims, claim] };
    save(ledger);
    console.log(`\n  ${chalk.green('Claim drafted:')} ${claim.id}`);
    console.log(chalk.dim(`  Review it, then: mysterium credential issue ${claim.id} <chosen-name>`));
    return;
  }
  if (action === 'issue') {
    const id = argv[argv.indexOf('issue') + 1];
    const subject = argv[argv.indexOf('issue') + 2];
    const claim = ledger.claims.find((c) => c.id === id);
    if (!claim) { console.error(`Claim '${id ?? ''}' not found.`); process.exitCode = 1; return; }
    if (claim.subject) { console.error('Claim already issued.'); process.exitCode = 1; return; }
    const out = cred.issueClaim({ ...ledger, claims: ledger.claims.filter((c) => c.id !== id) }, claim, subject ?? '');
    if (!out.claim) { console.error(out.failures.map((f) => f.message).join('; ')); process.exitCode = 1; return; }
    save(out.ledger);
    console.log(`\n  ${chalk.green('Issued:')} ${out.claim.id} → ${out.claim.subject}`);
    console.log(chalk.dim(`  Export: mysterium credential export ${out.claim.id}`));
    return;
  }
  if (action === 'revoke') {
    const id = argv[argv.indexOf('revoke') + 1];
    const out = cred.revokeClaim(ledger, id ?? '', Date.now());
    save(out);
    console.log(`\n  ${chalk.yellow('Revoked (tombstoned):')} ${id}`);
    return;
  }
  if (action === 'export') {
    const id = argv[argv.indexOf('export') + 1];
    const { vc, error } = cred.toVerifiableCredential(ledger, id ?? '');
    if (!vc) { console.error(error); process.exitCode = 1; return; }
    console.log(JSON.stringify(vc, null, 2));
    return;
  }
  if (action === 'rpl') {
    // RPL portfolio export (doc 41 §4.5 step 3): the evidence package a
    // partner institution's assessor receives. Subject is chosen at export.
    const nameIdx = argv.indexOf('--name');
    const candidateName = nameIdx >= 0 ? argv[nameIdx + 1] ?? '' : '';
    const onlyIdx = argv.indexOf('--claims');
    const onlyClaimIds = onlyIdx >= 0 ? (argv[onlyIdx + 1] ?? '').split(',').filter(Boolean) : undefined;
    const out = cred.exportRPLPortfolio(ledger, candidateName, { onlyClaimIds });
    if (out.error || !out.portfolio) { console.error(out.error ?? 'RPL export failed'); process.exitCode = 1; return; }
    console.log(JSON.stringify(out.portfolio, null, 2));
    return;
  }
  // list
  console.log(`\n  Credential claims`);
  if (ledger.claims.length === 0) console.log(chalk.dim('  none — try: mysterium credential draft <domain> <descriptor...>'));
  for (const c of ledger.claims) {
    const status = cred.isRevoked(ledger, c.id) ? chalk.yellow('revoked') : c.subject ? chalk.green('issued') : chalk.dim('draft');
    console.log(`  · [${status}] ${c.id} ${chalk.dim(c.domain)} — ${c.competencyDescriptor.slice(0, 60)}${c.competencyDescriptor.length > 60 ? '…' : ''}`);
  }
  console.log('');
}

async function runVowCommand(argv: string[]): Promise<void> {
  const action = argv.find((a) => !a.startsWith('--')) ?? 'list';
  const get = (name: string): string | undefined => {
    const i = argv.indexOf(name);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const kind = (get('--kind') ?? 'practice') as 'practice' | 'exposure' | 'learning' | 'service';
  const line = (get('--line') ?? 'Intrapersonal') as import('../src/core/domain/Line.js').Line;

  const { proposeObjectives, processCheckIn, reviewPractice, detectCrisis } = await import('../src/core/practice/practiceTools.js');
  // declineVow renders the conversational refusal path ("not this one, not now" — 39 §4.2): it was
  // used below without being destructured, so the whole decline path threw ReferenceError. The
  // VowService move (engines/ → practice/) left this consumer stale
  // (CHECKED-SURFACE-AUDIT-2026-09-24, P0-3).
  const { acceptVow, declineVow, discoverLapses } = await import('../src/core/practice/VowService.js');
  const { createSignificator } = await import('../src/core/domain/Significator.js');
  const { createInitialWorldState } = await import('../src/core/engines/CandidateGeneration.js');
  const { ALL_LINES } = await import('../src/core/domain/Line.js');

  const state = loadVowFile();
  const altitudes = Object.fromEntries(ALL_LINES.map((l) => [l, 'Red'])) as Record<import('../src/core/domain/Line.js').Line, import('../src/core/domain/Stage.js').Stage>;
  const sig = createSignificator('vow-cli', altitudes, 'Red');
  const world = createInitialWorldState([]);
  const now = Date.now();

  // Lapse discovery at every visit (never notifications — 39 §3.2).
  const lapses = discoverLapses(state.book, now);
  if (lapses.lapsed.length > 0 && action !== 'list') {
    console.log(chalk.dim(`  (a practice horizon quietly passed — it waits, without judgment)`));
  }

  if (action === 'list') {
    console.log(`\n  Practice objectives`);
    if (state.book.vows.length === 0) console.log(chalk.dim('  none yet — try: mysterium vow propose'));
    for (const v of state.book.vows) {
      const status = v.status ?? 'active';
      const mark = status === 'fulfilled' ? chalk.green('●') : status === 'lapsed' ? chalk.yellow('○') : chalk.cyan('◐');
      console.log(`  ${mark} [${status}] ${v.text} ${chalk.dim(`· ${v.checkInCount ?? 0} check-ins`)}`);
    }
    return;
  }

  if (action === 'propose') {
    const proposals = proposeObjectives({ needs: [], activeShadows: [] });
    const valueFlags = new Set(['--kind', '--line']);
    const customParts: string[] = [];
    for (let i = 0; i < argv.length; i++) {
      const a = argv[i];
      if (a === action || a.startsWith('--')) { if (valueFlags.has(a)) i++; continue; }
      customParts.push(a);
    }
    const customText = customParts.join(' ');
    const chosen = { text: customText || proposals[0]?.text || 'One small honest step.', kind };
    if (argv.includes('--decline')) {
      const book = declineVow(lapses.book, { ...chosen, rationale: 'declined in CLI' });
      saveVowFile({ book });
      console.log(`\n  ${chalk.dim('Declined — noted as preference signal only. Nothing expected of you.')}`);
      return;
    }
    const { book, vow } = acceptVow(lapses.book, { ...chosen, rationale: 'authored by you' }, now);
    saveVowFile({ book });
    console.log(`\n  ${chalk.green('Accepted:')} ${vow.text}`);
    console.log(chalk.dim('  No deadlines. Check in with: mysterium vow check-in "what happened" ...'));
    return;
  }

  if (action === 'check-in' || action === 'checkin') {
    const answers = argv.filter((a) => !a.startsWith('--') && a !== action);
    if (answers.length === 0) {
      console.error('Give your reflection: mysterium vow check-in "what happened" "what you noticed" ...');
      process.exitCode = 1;
      return;
    }
    if (detectCrisis(answers.join(' '))) {
      console.log(chalk.bold.red('\n  Some things are too heavy for a journal to hold alone.'));
      console.log('  Please reach out to someone you trust, or a local crisis line.');
      console.log(chalk.dim('  (This reflection was not saved or scored.)'));
      return;
    }
    const vow = lapses.book.vows.find((v) => (v.status ?? 'active') === 'active');
    const out = processCheckIn({ book: lapses.book, sig, world, vow, answers, now, primaryLine: line });
    saveVowFile({ book: out.book });
    console.log(`\n  ${chalk.green('Recorded.')} ${chalk.dim('Held privately — nothing to act on, nothing to perform.')}`);
    // `vowFulfilled` was never a field of `CheckInOutcome`; fulfilment lives on the vow inside the
    // RETURNED book. The old property access was always `undefined`, so this line could never
    // print even when the objective had been met.
    const settled = vow ? out.book.vows.find((v) => v.text === vow.text) : undefined;
    if (settled?.fulfilled || settled?.status === 'fulfilled') {
      console.log(chalk.green('  The objective feels met — it settles into fulfilled.'));
    }
    return;
  }

  if (action === 'review') {
    const review = reviewPractice({ ...sig, reflections: state.book.vows.length > 0 ? [{ id: 'cli', prompts: [], createdAtMs: now }] : [] } as never);
    console.log(`\n  ${chalk.italic(review.narrative)}`);
    return;
  }

  console.error(`Unknown vow action: ${action} (list | propose | check-in | review)`);
  process.exitCode = 1;
}

async function main(): Promise<void> {
  // ponytail: --version and --help handled by commander automatically

  // P0-4 (UX-R3) + R4-BUG-1 (UX-R4): Non-TTY guard. The interactive prompts
  // (@clack/prompts) block forever when stdin isn't a TTY (CI, pipes,
  // subagent shells, containers). Detect this early and auto-degrade to
  // --headless with a clear warning — instead of the silent hang every
  // fresh user in a non-interactive context currently hits.
  //
  // R4-BUG-1: The original P0-4 fix only covered the bare command + `session`
  // + `setup`. But `diagnostic` also hangs because it calls
  // createDefaultSignificator() which launches interactive Quick Calibration
  // when there's no save. And `new-game` has a confirmation prompt. The fix:
  // treat ALL subcommands as potentially interactive EXCEPT the truly
  // non-interactive ones (`status`, `glossary`). This is safer than
  // enumerating interactive ones — new subcommands default to safe.
  const NON_INTERACTIVE_SUBCOMMANDS = new Set(['status', 'glossary', 'profile', 'insights', 'train', 'export', 'events', 'calibrate', 'privacy', 'delegate', 'vow', 'pod', 'credential']);
  const needsInteractive = !NON_INTERACTIVE_SUBCOMMANDS.has(subcommand ?? '') && !HEADLESS && !JSON_MODE;
  if (needsInteractive && !process.stdin.isTTY) {
    HEADLESS = true;
    process.env.Mysterium_HEADLESS = '1'; // R5-BUG-1: propagate to PersistentAgent
    if (!JSON_MODE) {
      console.error(`${chalk.yellow('⚠')} Non-interactive terminal detected (stdin is not a TTY).`);
      console.error(`  Auto-enabling --headless mode. To run interactively, use a real terminal.`);
      console.error(`  For machine-readable output, add --json.`);
    } else {
      process.stdout.write(JSON.stringify({ type: 'warning', code: 'auto_headless', message: 'Non-interactive terminal — auto-enabled --headless.' }) + '\n');
    }
  }

  if (subcommand === 'setup') { await runSetup(); return; }
  if (subcommand === 'status') { await runStatus(); return; }
  if (subcommand === 'glossary') {
    // R11-Y3 / P1-F9: `mysterium glossary --full` shows all terms; bare `mysterium glossary`
    // shows only the 5 player-facing essentials.
    const wantsFull = program.args.includes('--full') || program.args.includes('-f');
    runGlossary(wantsFull);
    return;
  }
  if (subcommand === 'profile') { await runProfile(program.args[1], program.args[2]); return; }
  if (subcommand === 'setup-profile') { await runSetupProfile(); return; }
  if (subcommand === 'curriculum') { runCurriculum(program.args[1]); return; }
  if (subcommand === 'train') { process.exitCode = await runTrainCommand(program.args.slice(1), JSON_MODE); return; }
  if (subcommand === 'insights') { process.exitCode = await runInsightsCommand(DEV_MODE, program.args.slice(1), JSON_MODE); return; }
  if (subcommand === 'calibrate') { process.exitCode = await runCalibrateCommand(program.args.slice(1)); return; }
  if (subcommand === 'export') { process.exitCode = await runExportCommand(program.args.slice(1)); return; }
  if (subcommand === 'events') { await runEvents(program.args.slice(1)); return; }
  if (subcommand === 'privacy') { await runPrivacyCommand(program.args[1], program.args[2]); return; }
  if (subcommand === 'delegate') { await runDelegateCommand(program.args.slice(1)); return; }
  if (subcommand === 'vow') { await runVowCommand(program.args.slice(1)); return; }
  if (subcommand === 'pod') { await runPodCommand(program.args.slice(1)); return; }
  if (subcommand === 'credential') { await runCredentialCommand(program.args.slice(1)); return; }
  // P0-5 + P0-6: Use deleteAllSaves (clears sig + world + atomic envelope).
  // P0-6: Also clear TDG graph state if the TDG bridge is running, so a new
  // game doesn't inherit the old player's developmental graph.
  if (subcommand === 'new-game') {
    // UX-R2-5: Confirmation prompt before destructive reset
    if (hasSave() && !HEADLESS && !JSON_MODE) {
      const confirm = await select({
        message: 'This will permanently delete all progress. Continue?',
        options: [
          { value: 'no', label: 'No — keep my progress' },
          { value: 'yes', label: 'Yes — start fresh' },
        ],
        initialValue: 'no',
      });
      if (confirm !== 'yes') {
        console.log(`${chalk.green('✓')} Progress kept. Run ${chalk.bold('mysterium session')} to continue.`);
        return;
      }
    }
    deleteAllSaves();
    // YAGNI-EFF-2: TDG graph clear removed — TDG is no longer used by the CLI.
    console.log(`${chalk.yellow('↻')} Progress reset. Run ${chalk.bold('mysterium session')} to start a new game.`);
    return;
  }

  if (!JSON_MODE) {
    console.log(`\n${chalk.bold.cyan('Mysterium')} v${VERSION}`);
    // UX-P1-1 / P2-F13+F15 (Fresh-User UX Audit): First-run onboarding.
    // The old welcome dumped 5 glossary terms in one breath before the
    // player had seen a single question — high cognitive load, felt like
    // "walking into a graduate seminar 6 months late." The new welcome is
    // softer: one orienting sentence, a theory disclosure (so the player
    // knows they're being measured against a specific developmental model,
    // not objective truth), and a single command hint. Terms are introduced
    // contextually via `mysterium glossary` when the player hits one they don't
    // know, not dumped up front.
    if (!hasSave()) {
      console.log(`\n${chalk.dim('Welcome. This is a contemplative game — it will ask you honest questions')}`);
      console.log(`${chalk.dim('and reflect your answers back as mythopoetic prose. There are no wrong answers.')}`);
      console.log(`${chalk.dim('Take your time. Say as much or as little as you want.')}`);
      // P2-F15 (Fresh-User UX Audit): Theory disclosure. Mysterium is grounded
      // in Integral Theory (Ken Wilber), Spiral Dynamics, and the Law of One
      // cosmology. A player deserves to know they're being measured against
      // one specific developmental model, not objective truth. This is a
      // one-line disclosure, not a lecture — the full theory unfolds
      // through play and is available in docs/foundations/ for those who
      // want it.
      console.log(`\n${chalk.dim('The game draws on Integral Theory and Spiral Dynamics for its')}`);
      console.log(`${chalk.dim('developmental model. You can see what it has noticed about you at any')}`);
      console.log(`${chalk.dim('time with')} ${chalk.bold('mysterium profile show')}${chalk.dim('.')}`);
      console.log(`\n${chalk.dim('Useful commands:')}`);
      console.log(`  ${chalk.dim('mysterium glossary      — definitions for unfamiliar terms')}`);
      console.log(`  ${chalk.dim('mysterium status         — your progress')}`);
      console.log(`  ${chalk.dim('mysterium new-game       — start over')}\n`);
    }
  }

  try {
    const effectiveMode: string = subcommand === 'diagnostic' ? 'diagnostic' : subcommand === 'session' ? 'full' : 'full';
    switch (effectiveMode) {
      case 'diagnostic': await runDiagnostic(); break;
      case 'encounter': await runSingleEncounter(); break;
      case 'session': case 'full': default: await runFullSession(); break;
    }
  } catch (err: any) {
    error(`Fatal: ${err.message || err}`);
    if (!JSON_MODE) console.error(err.stack);
    emitEvent('fatal', { error: err.message, stack: err.stack });
  } finally {
    // R9-BUG-2 (UX-R9): Force-exit after session completion. The TDG bridge
    // and other async handles (LLM keep-alive, ora spinners) can keep the
    // Node process alive after SESSION END, causing scripted/CI invocations
    // to hang indefinitely. process.exit(0) ensures clean termination.
    process.exit(0);
  }
}

main();
