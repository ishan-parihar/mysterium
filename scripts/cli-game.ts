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
import { select } from '@clack/prompts';
import { Command, Option } from 'commander';
import { loadConfig } from './cli/config.js';
import { info, warn, error, emitEvent } from './cli/output.js';
import { DEV_MODE, HEADLESS, JSON_MODE, RAW_VERBOSE, USER_ANSWERS, apiKey, baseUrl, fileConfig, model, provider, setHeadless, setInvocation, setProviderState, subcommand } from './cli/flags.js';
import { resolveConfig as resolveLLMConfig, isComplete as isLLMConfigComplete, type LLMConfig } from '../src/infra/llm/ProviderRegistry.js';
import { type SessionMode } from '../src/core/domain/SessionMode.js';
import { getActiveConfig } from '../src/infra/llm/LLMClient.js';
import type { Line } from '../src/core/domain/Line.js';
import type { Stage } from '../src/core/domain/Stage.js';
import { hasSave, deleteAllSaves } from '../src/infra/persistence/SaveRepository.js';
import { runTrainCommand, runInsightsCommand, runExportCommand, runCalibrateCommand } from '../src/cli/TrainingRuntime.js';
import { GLOSSARY_TERMS, PLAYER_GLOSSARY_TERMS } from '../src/core/data/glossary.js';
import type { Modality } from '../src/core/domain/enums.js';
import { runCurriculum } from './CurriculumCommands.js';
import { runSetupProfile, runSetup } from './cli/onboarding.js';
import { runProfile, runStatus, runGlossary, runEvents, runPrivacyCommand } from './cli/profileCmd.js';
import { runPodCommand, runCredentialCommand, runVowCommand } from './cli/practiceCmd.js';
import { runDelegateCommand } from './cli/delegateCmd.js';
import { runDiagnostic, runSingleEncounter, runFullSession } from './cli/runtime.js';

























































































































































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
// The loaded config is handed to the invocation-state owner (`cli/flags.ts`) with the rest of the
// start-up state, but it has to be READ here: the .env bootstrap and the provider resolution both
// depend on it, and those are side effects of the runner, not state.
const configFile = loadConfig();
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

const resolvedLLM: LLMConfig = resolveLLMConfig(
  { model: earlyModelOverride },
  configFile,
);
const llmComplete = isLLMConfigComplete(resolvedLLM);
// Phase 2 of the start-up state: the provider identity. Resolved before argv parsing because the
// parse may override the model, and `ACTIVE_MODEL` is what the parse writes on top of this default.
setProviderState({
  fileConfig: configFile,
  apiKey: resolvedLLM.apiKey || 'sk-placeholder',
  baseUrl: resolvedLLM.baseUrl,
  model: resolvedLLM.model,
  provider: resolvedLLM.providerId,
  llmComplete,
});

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
// YAGNI-PHASE-4: PersistentAgent + PersistentAgentBridge imports removed.
// USE_PERSISTENT_AGENT is always false; the DQ path is the proven architecture.
// YAGNI-EFF-3: createMysteriumToolRegistry import removed — only used in
// the deleted PersistentAgent block.
// P1-QW3 (Architecture Audit Phase A): CLI telemetry — opt-in only, no behaviour change when off.
// R11-R2: use canonical resonance from veilDescriptors instead of duplicated maps.

// WORLD-STORE-MOVE (c634535): the holon data moved from src/core/data/ to src/core/world/data/
// (the world organ owns it). These two imports kept pointing at the old path, which made the CLI
// fail at IMPORT TIME — invisible for three days because tsconfig never included scripts/
// (CHECKED-SURFACE-AUDIT-2026-09-24, P0-1/P0-2).
// P3-FIX (Full-Development Audit 2026-09-15): all 8 stages now have authored
// holons (8 per stage, one per line). Previously only Red had world content,
// so higher-stage scheduling relied entirely on module items + LLM generation.
// RuntimeLoop (43 §5.5 + 45 §5/§6 + 22 §7.5): the orchestration services — feed, candidate
// library, owner-worker pool. Carried across encounters in the session loop; persisted with the
// world save so NPC profiles survive the process.
// Phase 13 d9b (memory-audit P3): the crash-sidecar journal — appended at every checkpoint
// capture, replayed before the restored checkpoint is trusted, closing the crash window
// between sessionEnd and saveAll (the last session otherwise dies with the process).
// P1-3 (UX-R3): configurable saturation threshold + per-line progress.
// R5-BUG-5 (UX-R5): fallback narrative pool for empty LLM responses.
// NF-3 (Fresh-User Re-Audit): Cross-session question de-duplication.
// loadAskedPrompts / saveAskedPrompts persist the asked-prompts set to
// the profile directory so Session N doesn't repeat questions from
// Sessions 1..N-1.
// NF-5 (Fresh-User Re-Audit): Route verbose feedback through VeilFilter so
// clinical labels (DarkAllergy, DarkAverted, etc.) and metrics (93% conceptual
// density) don't leak through --verbose. The Veil principle applies to all
// user-facing output, not just the normal path.
// BUILD-FIX (Full-Development Audit 2026-09-15): removed the dead import of
// '../src/cli/LayerRenderer.js' — the file was purged in 42078ad but the import
// survived, breaking `npm run build:cli` (esbuild) while tsx runtime resolution
// masked it. renderLayers/renderLayersCompact had no remaining call sites.

/**
 * --curriculum flag: force curriculum encounters by injecting slots.
 * strategy is readonly in SessionState, so we cast through `any`.
 * Safe because startSession/startSessionWithTDG returns a fresh mutable object.
 */
const opts = program.opts();
const parsedSubcommand = program.args[0] as string | undefined;

// Phase 3 of the start-up state: the parsed invocation. The values live in `cli/flags.ts` and are
// read from there by every function in this file — that is what lets the printers and the commands
// move out of it (audit item 1, stages C and D).
setInvocation({
  subcommand: parsedSubcommand,
  headless: opts.headless ?? false,
  rawVerbose: opts.verbose ?? false,
  devMode: (opts as any).dev ?? false,
  jsonMode: opts.json ?? false,
  activeModel: opts.model ?? model,
  encounters: parseInt(opts.encounters ?? String(configFile.session?.defaultEncounters ?? 20), 10),
  line: opts.line as Line | undefined,
  stage: opts.stage as Stage | undefined,
  modality: opts.modality as Modality | undefined,
  mode: opts.mode as SessionMode | undefined,
  forceShadow: (opts.forceShadow ?? (opts as any).injectShadowKeyword) as string | undefined,
  newGame: opts.newGame ?? false,
  skipCalibration: opts.skipCalibration ?? false,
  curriculum: opts.curriculum ?? false,
  audit: opts.audit ?? false,
  headlessLlm: opts.llm ?? false,
});
// R5-BUG-1 (UX-R5): Propagate headless state to the PersistentAgent so it
// can lower its maxLoops budget. Without this, --agent + LLM hangs because
// the agent makes up to 30 sequential LLM calls (30×20s = 600s).
if (HEADLESS) process.env.Mysterium_HEADLESS = '1';
// P0-R4 (Fresh-User UX Audit): --verbose requires --dev. The audit found
// that --verbose exposes the entire machinery (XP bars, drive distortion
// mappings, line×stage coordinates, arc counters) which breaks the Veil
// principle. A curious user who tries --verbose without --dev now gets a
// warning and verbose is silently downgraded to false — the downgrade lives in
// `setInvocation` (`VERBOSE = rawVerbose && devMode`); the warning is a side
// effect and stays here.
if (RAW_VERBOSE && !DEV_MODE) {
  console.error(`${chalk.yellow('⚠ --verbose requires --dev')}: --verbose exposes internal metrics that break the contemplative frame (Veil principle). Use --dev --verbose together for debugging. Continuing without --verbose.`);
}
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
/** YAGNI-EFF-3 (Efficacy Audit): --agent path removed. USE_PERSISTENT_AGENT
 * is always false. The PersistentAgent / Story-Driven mode code stays in
 * src/core/agent/ for reference, but the CLI never activates it. */
// YAGNI-PHASE-4: FORCE_RESPONSES removed — --responses was never in commander spec.
// The two session flows live in `src/core/domain/SessionMode.ts` — the CLI reads the canonical
// list rather than re-declaring it (the class this file keeps re-learning, audit §10.4). G36
// boots every member, so a mode cannot exist without being reachable.

// R5-CRITICAL (UX-R5): Headless input mechanism. Load user-provided answers
// from --answers <file> (one per line) and/or --answer <text> (repeatable).
// These feed the writeInValue that the LLM actually sees, instead of the
// LLM hallucinating user answers in --headless mode.
// Priority: --answer flags first (in order), then --answers file (remaining lines).
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
    setHeadless(true);
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
