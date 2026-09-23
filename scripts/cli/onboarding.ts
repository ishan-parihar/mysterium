import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import { select, text as clackText } from '@clack/prompts';
import ora from 'ora';
import { CONFIG_DIR, loadConfig } from './config.js';
import { HEADLESS, JSON_MODE, NEW_GAME, SKIP_CALIBRATION, USER_ANSWERS } from './flags.js';
import { banner, info, success, error } from './output.js';
import { stageColor } from './render.js';
import { createSignificator } from '../../src/core/domain/Significator.js';
import { listProfiles as listProviderProfiles, getProfile as getProviderProfile, getModels as getProviderModels, type LLMConfig as DynamicLLMConfig } from '../../src/infra/llm/ProviderRegistry.js';
import { type Significator } from '../../src/core/domain/Significator.js';
import { type Line } from '../../src/core/domain/Line.js';
import { ALL_LINES } from '../../src/core/domain/Line.js';
import { type Stage } from '../../src/core/domain/Stage.js';
import { stageOrdinal } from '../../src/core/domain/Stage.js';
import { inferAltitudesFromAnswers as inferAltitudesFromAnswersCore } from '../../src/core/usecases/InitialAltitudeInference.js';
import { scoreHoldProbe, scoreChoiceProbe } from '../../src/core/usecases/QuickCalibrationScoring.js';
import { grantDeclaredPreference } from '../../src/core/domain/IdentityProfile.js';
import { loadSave, saveGame, deleteSave, deleteWorldSave } from '../../src/infra/persistence/SaveRepository.js';
import { createEmptyIdentityProfile, grantIdentityField, type IdentityField, type HealingPurpose } from '../../src/core/domain/IdentityProfile.js';
import { type OrchestrationServices } from '../../src/core/personalization/sessionRuntime.js';
import { createProfile, getProfilesDir } from '../../src/infra/profiles/ProfileManager.js';
import { seedInitialKnowledge } from '../../src/core/curriculum/SeedInitialKnowledge.js';
import { CALIBRATION_PROMPTS, HOLD_TARGETS } from '../../src/core/data/calibrationPrompts.js';
import { clearModelCache, type DiscoveredModel } from '../../src/infra/llm/ProviderRegistry.js';
import { detectOllama, saveAndVerify } from './support.js';



// @script-status: wired — imported by cli-game.ts, which `npm run cli` runs.
/**
 * Onboarding: calibration, the default significator and `setup`.
 *
 * Stage D, leaf 2 (module-cohesion audit item 1). Everything that turns a first contact into a
 * playable profile: the quick-calibration probe (which infers the starting altitudes), the default
 * significator it seeds, and the `setup` flow that gathers identity + consent + provider config.
 * It reaches down into `support.ts` and the printers, never sideways into the commands — the
 * dependency direction the entry relies on.
 */

export function inferAltitudesFromAnswers(): Record<Line, Stage> {
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

export async function runQuickCalibration(): Promise<Record<Line, Stage>> {
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

export async function createDefaultSignificator(): Promise<Significator> {
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

// ── Unified encounter execution dispatch (YAGNI-1 / UX-R3+R4) ────────
// Both DQ mode and Story-Driven mode call THIS function instead of
// branching on USE_PERSISTENT_AGENT themselves. This eliminates the
// routing divergence that let P0-1 (R3: lexical scope bug) hide for multiple audit
// rounds. Future execution-mode checks (new agent types, new LLM
// routing) happen here — one place, one bug surface.
export interface EncounterExecutionOptions {
  readonly responsesPool?: number[];
  readonly consecutivePasses?: Map<string, number>;
  readonly agentSynthesis?: string;
  /** RuntimeLoop: the session-carried orchestration services (may be omitted — degradation law). */
  readonly orchestration?: OrchestrationServices;
  // YAGNI-EFF-3: persistentAgent removed. USE_PERSISTENT_AGENT is always false;
  // the DQ path is the proven architecture. Story-Driven mode can be rebuilt
  // on top of DQ when needed.
}

export async function runSetupProfile(): Promise<void> {
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

export async function collectIdentityConsent(): Promise<void> {
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

export async function runSetup(): Promise<void> {
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
