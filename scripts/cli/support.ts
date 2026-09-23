// @script-status: wired — imported by cli-game.ts, which `npm run cli` runs.
import * as fs from 'fs';
import { text as clackText } from '@clack/prompts';
import * as path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { CONFIG_FILE, saveConfig } from './config.js';
import { CURRICULUM_MODE, FORCE_LINE, FORCE_MODALITY, FORCE_MODE, FORCE_SHADOW, FORCE_STAGE, HEADLESS, JSON_MODE, NEW_GAME, USER_ANSWERS, model } from './flags.js';
import { success } from './output.js';
import { type MysteriumConfig } from './config.js';
import { VALID_SHADOW_QUADRANTS } from './data.js';
import { getMysteriumDirForScope } from '../../src/infra/persistence/mysteriumDir.js';
import { SESSION_MODES } from '../../src/core/domain/SessionMode.js';
import { invalidateConfigCache } from '../../src/infra/llm/LLMClient.js';
import { type LLMConfig as DynamicLLMConfig } from '../../src/infra/llm/ProviderRegistry.js';
import { createInitialWorldState, type WorldState } from '../../src/core/engines/CandidateGeneration.js';
import { ALL_LINES } from '../../src/core/domain/Line.js';
import { ALL_STAGES } from '../../src/core/domain/Stage.js';
import { saveWorldState, loadWorldState } from '../../src/infra/persistence/SaveRepository.js';
import holonsJson from '../../src/core/world/data/red-layer-holons.json';
import stageHolonsJson from '../../src/core/world/data/stage-holons.json';
import { ALL_MODALITIES } from '../../src/core/domain/enums.js';
import { agentReadProfileFile, agentWriteProfileFile, getActiveProfileDir } from '../../src/infra/profiles/ProfileManager.js';
import { type ProviderProfile } from '../../src/infra/llm/ProviderRegistry.js';



















































/**
 * The runner's shared support functions — everything the commands and the session flows both reach for.
 *
 * Stage D, leaf 1 (module-cohesion audit item 1). This is the bottom of the runner's call graph:
 * nothing here calls a command or a flow, so it can move first without creating a cycle. Its
 * responsibilities are heterogeneous on purpose — flag validation, the LLM probe, holon loading,
 * the vow-file store, the md-section reader — and the name says what they share: each one exists
 * because two or more of the surfaces above it needed the same step, not because they belong
 * together. When a function here grows a second caller in `src/`, it graduates out of the CLI.
 */

export function applyCurriculumMode(sessionState: { strategy: any }): void {
  if (CURRICULUM_MODE) {
    sessionState.strategy = { ...sessionState.strategy, curriculumSlots: Math.max(sessionState.strategy.curriculumSlots ?? 0, 3) };
  }
}

export function consumeUserAnswer(): string | undefined {
  // Consume the next user answer. Returns undefined if none remain — caller
  // should fall back to default behavior. Trimming: preserve internal whitespace.
  if (USER_ANSWERS.length === 0) return undefined;
  const next = USER_ANSWERS.shift();
  // Skip purely-empty lines that were trailing in the file
  if (next === undefined) return undefined;
  return next.trim() === '' ? undefined : next.trim();
}

export function validateFlag<T extends string>(label: string, value: string | undefined, valid: readonly T[] | Set<T>, validSetName: string): void {
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

/**
 * P0-R2 helper: Update the active_focus field in goals.yaml with a new focus snippet.
 * Extracted from duplicated code in DQ and Story session paths.
 * Best-effort — never throws, never breaks the session.
 */

export function updateGoalsActiveFocus(focusText: string): void {
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


// Interactive prompt helper — uses @clack/prompts for beautiful UI

export async function ask(q: string): Promise<string> {
  if (HEADLESS || JSON_MODE) return '';
  const answer = await clackText({ message: q, defaultValue: '' });
  return typeof answer === 'string' ? answer : '';
}

// ── LLM availability check (3s timeout, uses chat/completions) ──────

export async function checkLLMAvailability(url: string, key: string): Promise<boolean> {
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

export function mergeAuthoredHolons(savedHolons: readonly any[]): any[] {
  const authored = [...(holonsJson as any[]), ...(stageHolonsJson as any[])];
  const byId = new Map<string, any>();
  for (const h of savedHolons) byId.set(h.id, h);
  for (const h of authored) if (!byId.has(h.id)) byId.set(h.id, h);
  return [...byId.values()];
}

export function loadHolons(): WorldState {
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

// GAP-6 (Efficacy Audit): Infer developmental altitude from user answers.
// Instead of defaulting all lines to Red, analyze the user's --answer
// content for stage-specific vocabulary and conceptual complexity.
// This is a lightweight binary-search — not a full developmental assessment,
// but enough to prevent experts from starting at Red.

export async function verifyProviderConnection(config: DynamicLLMConfig): Promise<{ ok: boolean; message: string }> {
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

export async function detectOllama(): Promise<{ running: boolean; models: string[] }> {
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

export async function saveAndVerify(
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

export function extractLastNarrativeAsFocus(encounterLogText: string): string | null {
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

export function extractMdSectionBullets(md: string, sectionName: string): string[] {
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

export function veilThemeHint(theme: string): string {
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

export function veilDriveDirection(direction: string): string {
  switch (direction) {
    case 'DarkAddicted':    return 'a pull toward the familiar';
    case 'DarkAverted':     return 'a rejection of something familiar';
    case 'GoldenAddicted':  return 'a pull to bypass toward the higher';
    case 'GoldenAverted':   return 'a resistance to the call forward';
    case 'HealthyBalanced': return 'balanced';
    default:                return 'an unnamed movement';
  }
}

export function vowFilePath(): string {
  const dir = getMysteriumDirForScope('auto');
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, 'vows.json');
}

interface VowFileShape {
  readonly book: import('../../src/core/practice/VowService.js').VowBook;
}

export function loadVowFile(): VowFileShape {
  const p = vowFilePath();
  if (fs.existsSync(p)) {
    try { return JSON.parse(fs.readFileSync(p, 'utf8')) as VowFileShape; } catch { /* fall through */ }
  }
  return { book: emptyVowBookLocal() };
}

export function saveVowFile(state: VowFileShape): void {
  fs.writeFileSync(vowFilePath(), JSON.stringify(state, null, 2));
}

export function emptyVowBookLocal(): import('../../src/core/practice/VowService.js').VowBook {
  return { vows: [], declineCounts: {} };
}

/**
 * `mysterium pod` — local pod surface (doc 38 M0). Single-machine simulation:
 * the pod state machine runs locally so formation, rituals, and recognition
 * can be exercised end-to-end before the DO transport lands. Same pure core
 * the DO adapter will drive (serial event application).
 */
