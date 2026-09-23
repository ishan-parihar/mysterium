/**
 * ProfileManager — multi-user profiling system with YAML-based persistent memory.
 *
 * Architecture:
 *   ~/.mysterium/profiles/<name>/
 *     ├── identity.yaml
 *     ├── developmental-state.yaml
 *     ├── session-history.yaml
 *     ├── narrative-memory.md
 *     ├── shadow-ledger.yaml
 *     ├── goals.yaml
 *     └── preferences.yaml
 *   ~/.mysterium/profiles/_active → symlink to active profile
 *
 * Design: human-readable YAML/MD (LLM-native, versionable, sandboxable).
 * No external YAML deps — lightweight parser handles our schema subset.
 */

import * as fs from 'fs';
import * as path from 'path';
import { getMysteriumLegacyDir } from '../persistence/mysteriumDir.js';
import { ALL_LINES } from '../../core/domain/Line.js';

// Single source (mysteriumDir.ts): honoring `MYSTERIUM_HOME` here is what lets a gate or a test
// run against a throwaway state root instead of the developer's real profile.
const Mysterium_DIR = getMysteriumLegacyDir();
const PROFILES_DIR = path.join(Mysterium_DIR, 'profiles');
const ACTIVE_SYMLINK = path.join(PROFILES_DIR, '_active');
const SAVES_DIR = path.join(Mysterium_DIR, 'saves');

// ── Types ────────────────────────────────────────────────────────────

export interface UserProfile {
  readonly identity: Record<string, any>;
  readonly preferences: Record<string, any>;
  readonly developmentalState: Record<string, any>;
  readonly sessionHistory: Record<string, any>;
  readonly narrativeMemory: string;
  readonly shadowLedger: Record<string, any>;
  readonly goals: Record<string, any>;
}

// ── YAML read/write (lightweight, no external deps) ──────────────────

function yamlRead(filePath: string): Record<string, any> {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return parseSimpleYaml(content);
  } catch { return {}; }
}

function yamlWrite(filePath: string, data: Record<string, any>): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, serializeSimpleYaml(data), 'utf8');
}

function mdRead(filePath: string): string {
  try { return fs.readFileSync(filePath, 'utf8'); } catch { return ''; }
}

function mdWrite(filePath: string, content: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

function parseSimpleYaml(content: string): Record<string, any> {
  
  const lines = content.split('\n');
  let i = 0;
  function parseBlock(indent: number): Record<string, any> {
    const obj: Record<string, any> = {};
    while (i < lines.length) {
      const line = lines[i]!;
      if (line.trim() === '' || line.trim().startsWith('#')) { i++; continue; }
      const currentIndent = line.length - line.trimStart().length;
      if (currentIndent < indent) break;
      const trimmed = line.trim();
      if (trimmed.startsWith('- ')) {
        const lastKey = Object.keys(obj).pop();
        if (lastKey && Array.isArray(obj[lastKey])) obj[lastKey].push(trimmed.slice(2));
        i++; continue;
      }
      const colonIdx = trimmed.indexOf(':');
      if (colonIdx === -1) { i++; continue; }
      const key = trimmed.slice(0, colonIdx).trim();
      const value = trimmed.slice(colonIdx + 1).trim();
      if (value === '' || value === '[]') {
        i++;
        if (i < lines.length) {
          const nextLine = lines[i]!;
          const nextIndent = nextLine.length - nextLine.trimStart().length;
          if (nextIndent > currentIndent && nextLine.trim().startsWith('- ')) {
            obj[key] = [];
            while (i < lines.length && lines[i]!.trim().startsWith('- ')) {
              obj[key].push(lines[i]!.trim().slice(2)); i++;
            }
            continue;
          }
          if (nextIndent > currentIndent) { obj[key] = parseBlock(nextIndent); continue; }
        }
        obj[key] = value === '[]' ? [] : {};
      } else {
        obj[key] = parseScalar(value); i++;
      }
    }
    return obj;
  }
  return parseBlock(0);
}

function parseScalar(value: string): any {
  if (value === 'null' || value === '~') return null;
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (/^-?\d+$/.test(value)) return parseInt(value, 10);
  if (/^-?\d+\.\d+$/.test(value)) return parseFloat(value);
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))
    return value.slice(1, -1);
  return value;
}

function serializeSimpleYaml(data: Record<string, any>, indent = 0): string {
  const lines: string[] = [];
  const pad = '  '.repeat(indent);
  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined) { lines.push(`${pad}${key}: null`); }
    else if (Array.isArray(value)) {
      if (value.length === 0) { lines.push(`${pad}${key}: []`); }
      else {
        lines.push(`${pad}${key}:`);
        for (const item of value) {
          if (typeof item === 'object' && item !== null) {
            // Serialize object as multi-line YAML under the dash
            const subYaml = serializeSimpleYaml(item, indent + 2);
            const subLines = subYaml.split('\n');
            lines.push(`${pad}  - ${subLines[0]}`);
            for (let si = 1; si < subLines.length; si++) {
              lines.push(`${pad}   ${subLines[si]}`);
            }
          } else {
            lines.push(`${pad}  - ${formatScalar(item)}`);
          }
        }
      }
    } else if (typeof value === 'object') {
      lines.push(`${pad}${key}:`); lines.push(serializeSimpleYaml(value, indent + 1));
    } else { lines.push(`${pad}${key}: ${formatScalar(value)}`); }
  }
  return lines.join('\n');
}

function formatScalar(value: any): string {
  if (typeof value === 'string') {
    if (value.includes(':') || value.includes('#') || value.startsWith('-') || value.startsWith('['))
      return `"${value.replace(/"/g, '\\"')}"`;
    return value;
  }
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (value === null) return 'null';
  return String(value);
}

// ── Profile Management API ───────────────────────────────────────────

export function getProfilesDir(): string { return PROFILES_DIR; }

export function getActiveProfileDir(): string | null {
  try { if (fs.existsSync(ACTIVE_SYMLINK)) return fs.realpathSync(ACTIVE_SYMLINK); } catch {}
  return null;
}

export function getActiveProfileName(): string | null {
  const dir = getActiveProfileDir();
  return dir ? path.basename(dir) : null;
}

export function listProfiles(): string[] {
  try {
    if (!fs.existsSync(PROFILES_DIR)) return [];
    return fs.readdirSync(PROFILES_DIR, { withFileTypes: true })
      .filter(e => e.isDirectory() && !e.name.startsWith('_') && !e.name.startsWith('.'))
      .map(e => e.name);
  } catch { return []; }
}

export function createProfile(name: string, prefs?: Partial<Record<string, any>>): string {
  const profileDir = path.join(PROFILES_DIR, name);
  if (fs.existsSync(profileDir)) throw new Error(`Profile "${name}" already exists.`);
  fs.mkdirSync(profileDir, { recursive: true });
  const now = new Date().toISOString();
  const altitudes: Record<string, string> = {}; for (const l of ALL_LINES) altitudes[l] = 'Red';

  yamlWrite(path.join(profileDir, 'identity.yaml'), {
    name, created: now, last_active: now, lifecycle: 'Onboarding',
    total_sessions: 0, total_encounters: 0, current_stage: 'Red', inferred_stage: 'Red',
  });
  yamlWrite(path.join(profileDir, 'preferences.yaml'), {
    pronouns: prefs?.pronouns ?? 'they/them',
    metaphor_preference: prefs?.metaphor_preference ?? 'contemporary',
    intensity: prefs?.intensity ?? 'moderate', pacing: prefs?.pacing ?? 'reflective',
  });
  yamlWrite(path.join(profileDir, 'developmental-state.yaml'), {
    altitudes, drives: { agency: 0.5, communion: 0.5, eros: 0.5, agape: 0.5 },
    ray_profile: { Red: 0, Orange: 0, Yellow: 0, Green: 0, Blue: 0, Indigo: 0, Violet: 0 },
    transformation: { phase: 'idle', target_stage: null, sessions_in_phase: 0, knots_resolved: 0 },
    cci: 0.5,
  });
  // QA-FIX-2: JSON format for array-of-objects files (YAML serializer corrupts these)
  fs.writeFileSync(path.join(profileDir, 'session-history.json'), JSON.stringify({ sessions: [] }, null, 2), 'utf8');
  mdWrite(path.join(profileDir, 'narrative-memory.md'),
    `# Narrative Memory — ${name}\n\n## Key Insights\n(Insights from LLM responses that landed)\n\n## Patterns\n(Recurring themes)\n\n## Active Work\n(What the user is processing)\n\n## Resolved\n(Integrated patterns)\n\n## Unresolved\n(Surfaced but not worked through)\n`);
  fs.writeFileSync(path.join(profileDir, 'shadow-ledger.json'), JSON.stringify({ shadows: [] }, null, 2), 'utf8');
  yamlWrite(path.join(profileDir, 'goals.yaml'), { self_declared: [], inferred: [], active_focus: '' });

  setActiveProfile(name);
  return profileDir;
}

export function setActiveProfile(name: string): void {
  const profileDir = path.join(PROFILES_DIR, name);
  if (!fs.existsSync(profileDir)) throw new Error(`Profile "${name}" does not exist.`);
  try { fs.unlinkSync(ACTIVE_SYMLINK); } catch {}
  fs.symlinkSync(profileDir, ACTIVE_SYMLINK);
}

export function deleteProfile(name: string): void {
  if (name === '_active') throw new Error('Cannot delete _active');
  const dir = path.join(PROFILES_DIR, name);
  if (!fs.existsSync(dir)) throw new Error(`Profile "${name}" does not exist.`);
  fs.rmSync(dir, { recursive: true, force: true });
  try { fs.unlinkSync(path.join(SAVES_DIR, `${name}-save-all.json`)); } catch {}
  const active = getActiveProfileDir();
  if (active && path.basename(active) === name) { try { fs.unlinkSync(ACTIVE_SYMLINK); } catch {} }
}

export function loadProfile(name?: string): UserProfile | null {
  const dir = name ? path.join(PROFILES_DIR, name) : getActiveProfileDir();
  if (!dir || !fs.existsSync(dir)) return null;
  // QA-FIX-2: session-history and shadow-ledger use JSON (not YAML) to avoid
  // array-of-objects serialization corruption. Other files stay YAML (flat structure).
  let sessionHistory: Record<string, any> = { sessions: [] };
  try { sessionHistory = JSON.parse(fs.readFileSync(path.join(dir, 'session-history.json'), 'utf8')); } catch {}
  let shadowLedger: Record<string, any> = { shadows: [] };
  try { shadowLedger = JSON.parse(fs.readFileSync(path.join(dir, 'shadow-ledger.json'), 'utf8')); } catch {}
  return {
    identity: yamlRead(path.join(dir, 'identity.yaml')),
    preferences: yamlRead(path.join(dir, 'preferences.yaml')),
    developmentalState: yamlRead(path.join(dir, 'developmental-state.yaml')),
    sessionHistory,
    narrativeMemory: mdRead(path.join(dir, 'narrative-memory.md')),
    shadowLedger,
    goals: yamlRead(path.join(dir, 'goals.yaml')),
  };
}

/**
 * Build the LLM context injection string from the active profile.
 * This is prepended to the LLM system prompt so it knows the user.
 */
export function buildContextInjection(profile: UserProfile): string {
  const parts: string[] = [];
  const id = profile.identity || {};
  const prefs = profile.preferences || {};

  parts.push(`# User Profile: ${id.name || 'Unknown'}`);
  parts.push(`Pronouns: ${prefs.pronouns || 'they/them'}`);
  parts.push(`Communication: ${prefs.metaphor_preference || 'contemporary'} metaphors, ${prefs.intensity || 'moderate'} intensity, ${prefs.pacing || 'reflective'} pacing`);
  parts.push(`Lifecycle: ${id.lifecycle || 'Exploring'} | Stage: ${id.current_stage || 'Red'} | Sessions: ${id.total_sessions || 0} | Encounters: ${id.total_encounters || 0}`);

  const goals = profile.goals || {};
  if (goals.active_focus) parts.push(`\n## Active Focus\n${goals.active_focus}`);
  if (goals.self_declared?.length) parts.push(`\n## User's Stated Goals\n${goals.self_declared.map((g: any) => `- ${g}`).join('\n')}`);

  const sessions = profile.sessionHistory?.sessions ?? [];
  if (sessions.length > 0) {
    parts.push(`\n## Recent Sessions`);
    for (const s of sessions.slice(-5)) parts.push(`- ${typeof s === 'object' ? (s as any).date || '' : s}: ${typeof s === 'object' ? (s as any).key_shift || '' : ''}`);
  }

  if (profile.narrativeMemory && profile.narrativeMemory.trim().length > 50) {
    parts.push(`\n## Narrative Memory\n${profile.narrativeMemory}`);
  }

  const shadows = profile.shadowLedger?.shadows ?? [];
  if (shadows.length > 0) {
    parts.push(`\n## Active Shadows`);
    for (const s of shadows) {
      if (typeof s === 'object' && (s as any).pattern)
        parts.push(`- ${(s as any).pattern} [${(s as any).status || 'surfacing'}]`);
    }
  }

  parts.push(`\n## Communication Style`);
  parts.push(`- Use ${prefs.pronouns || 'they/them'} pronouns for the user.`);
  parts.push(`- Metaphor style: ${prefs.metaphor_preference || 'contemporary'} (avoid warrior/blade metaphors if 'contemporary').`);
  parts.push(`- Intensity: ${prefs.intensity || 'moderate'}.`);
  parts.push(`- Pacing: ${prefs.pacing || 'reflective'}.`);

  return parts.join('\n');
}

export function updateProfileAfterSession(profileName: string, updates: {
  totalEncounters: number; totalSessions: number; currentStage: string;
  altitudes: Record<string, string>; drives: Record<string, number>; cci: number;
  sessionEntry?: Record<string, any>; narrativeInsight?: string;
  newShadow?: Record<string, any>; activeFocus?: string;
  shadows?: readonly any[]; // full shadow ledger from sig
  lastResonance?: string; // NEXT-4: for felt-sense feedback between sessions
}): void {
  const dir = path.join(PROFILES_DIR, profileName);
  if (!fs.existsSync(dir)) return;
  const now = new Date().toISOString();

  // Update identity
  const identity = yamlRead(path.join(dir, 'identity.yaml'));
  identity.last_active = now;
  identity.total_sessions = updates.totalSessions;
  identity.total_encounters = updates.totalEncounters;
  identity.current_stage = updates.currentStage;
  // NEXT-4 (Fresh-User UX Re-Audit): Store the resonance after each session
  // so the next session can detect and surface resonance shifts as felt-sense
  // feedback between sessions.
  if (updates.lastResonance) {
    identity.previous_resonance = identity.last_resonance ?? null;
    identity.last_resonance = updates.lastResonance;
  }
  if (identity.lifecycle === 'Onboarding') identity.lifecycle = 'Exploring';
  yamlWrite(path.join(dir, 'identity.yaml'), identity);

  // Sync developmental state (mirror from sig)
  const devState = yamlRead(path.join(dir, 'developmental-state.yaml'));
  devState.altitudes = updates.altitudes;
  devState.drives = updates.drives;
  devState.cci = updates.cci;
  yamlWrite(path.join(dir, 'developmental-state.yaml'), devState);

  // Sync shadow ledger (JSON format — QA-FIX-2: same array-of-objects corruption issue)
  if (updates.shadows && updates.shadows.length > 0) {
    const qualitativeShadows = updates.shadows.map((s: any) => ({
      first_surfaced: s.surfacedAt ? new Date(s.surfacedAt).toISOString() : now,
      line: s.line || 'Unknown',
      stage: s.stage || 'Red',
      pattern: `${s.quadrant || 'Unknown'} shadow in ${s.line || 'Unknown'} — drive: ${s.drive || 'unknown'}`,
      quadrant: s.quadrant || 'DarkAllergy',
      status: s.resolvedAt ? 'integrated' : 'surfacing',
      last_touched: now,
      sessions_active: s.recurrenceCount ?? 1,
    }));
    fs.writeFileSync(path.join(dir, 'shadow-ledger.json'), JSON.stringify({ shadows: qualitativeShadows }, null, 2), 'utf8');
  }

  // Append session entry to session-log (JSON format — QA-FIX-2: YAML serializer
  // corrupts arrays-of-objects on repeated appends. JSON handles them perfectly.)
  const historyPath = path.join(dir, 'session-history.json');
  let history: { sessions: any[] } = { sessions: [] };
  try {
    const raw = fs.readFileSync(historyPath, 'utf8');
    history = JSON.parse(raw);
    if (!Array.isArray(history.sessions)) history.sessions = [];
  } catch { /* file doesn't exist or is corrupt — start fresh */ }
  if (updates.sessionEntry) {
    history.sessions.push(updates.sessionEntry);
    if (history.sessions.length > 20) history.sessions = history.sessions.slice(-20);
  }
  fs.writeFileSync(historyPath, JSON.stringify(history, null, 2), 'utf8');

  // Append narrative insight to memory
  if (updates.narrativeInsight) {
    const memPath = path.join(dir, 'narrative-memory.md');
    let memory = mdRead(memPath);
    const insight = `- **Session ${updates.totalSessions}:** ${updates.narrativeInsight}\n`;
    const idx = memory.indexOf('## Key Insights');
    if (idx >= 0) {
      const next = memory.indexOf('\n## ', idx + 18);
      const at = next >= 0 ? next : memory.length;
      memory = memory.slice(0, at) + insight + memory.slice(at);
    }
    mdWrite(memPath, memory);
  }

  if (updates.activeFocus) {
    const goals = yamlRead(path.join(dir, 'goals.yaml'));
    goals.active_focus = updates.activeFocus;
    yamlWrite(path.join(dir, 'goals.yaml'), goals);
  }
}

/**
 * Append an encounter to the encounter-log.md after every encounter.
 * This preserves the therapeutic conversation (user words + LLM responses)
 * across sessions — the thing the pilot personas needed most.
 */
export function appendEncounterLog(profileName: string, entry: {
  encounterNum: number;
  line: string;
  stage: string;
  npc?: string;
  question?: string;
  userAnswer?: string;
  llmNarrative?: string;
  driveSignal?: string;
  shadowSurfaced?: boolean;
  timestamp: string;
}): void {
  const dir = path.join(PROFILES_DIR, profileName);
  if (!fs.existsSync(dir)) return;

  const logPath = path.join(dir, 'encounter-log.md');
  let log = mdRead(logPath);
  if (!log || log.trim() === '') {
    log = `# Encounter Log — ${profileName}\n\nA running record of every encounter: the question asked, the user's answer, the LLM's response.\n\n`;
  }

  const entry_text = [
    `## Encounter ${entry.encounterNum} — ${entry.timestamp}`,
    `**Line:** ${entry.line} | **Stage:** ${entry.stage}${entry.npc ? ` | **NPC:** ${entry.npc}` : ''}`,
    entry.question ? `**Question:** ${entry.question}` : '',
    entry.userAnswer ? `**User's answer:** ${entry.userAnswer}` : '',
    entry.llmNarrative ? `**LLM narrative:** ${entry.llmNarrative}` : '',
    entry.driveSignal ? `**Drive signal:** ${entry.driveSignal}` : '',
    entry.shadowSurfaced ? `**Shadow surfaced:** Yes` : '',
    '',
  ].filter(l => l !== '').join('\n');

  log += entry_text + '\n';
  mdWrite(logPath, log);
}

/**
 * Get the path for the live-state.json (Significator) inside the profile directory.
 * Replaces the old ~/.mysterium/save-all.json with a per-profile save.
 */
export function getLiveStatePath(profileName: string): string {
  const dir = path.join(PROFILES_DIR, profileName);
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, 'live-state.json');
}

/**
 * Get the path for the world-state.json inside the profile directory.
 */
export function getWorldStatePath(profileName: string): string {
  const dir = path.join(PROFILES_DIR, profileName);
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, 'world-state.json');
}

/**
 * Agent sandbox: read a file from the active profile directory.
 * Only turquoiselisted filenames are allowed.
 */
const READABLE_FILES = new Set([
  'identity.yaml', 'preferences.yaml', 'goals.yaml',
  'narrative-memory.md', 'shadow-ledger.json', 'session-history.json',
  'developmental-state.yaml', 'encounter-log.md',
]);

const WRITABLE_FILES = new Set([
  'narrative-memory.md', 'goals.yaml', 'encounter-log.md',
]);

export function agentReadProfileFile(filename: string): string | null {
  if (!READABLE_FILES.has(filename)) return null;
  const dir = getActiveProfileDir();
  if (!dir) return null;
  try {
    return fs.readFileSync(path.join(dir, filename), 'utf8');
  } catch { return null; }
}

export function agentWriteProfileFile(filename: string, content: string, mode: 'overwrite' | 'append' = 'append'): boolean {
  if (!WRITABLE_FILES.has(filename)) return false;
  const dir = getActiveProfileDir();
  if (!dir) return false;
  try {
    const filePath = path.join(dir, filename);
    if (mode === 'append' && fs.existsSync(filePath)) {
      const existing = fs.readFileSync(filePath, 'utf8');
      fs.writeFileSync(filePath, existing + '\n' + content, 'utf8');
    } else {
      fs.writeFileSync(filePath, content, 'utf8');
    }
    return true;
  } catch { return false; }
}

/**
 * Get the save file path for backwards compatibility.
 * Now points to the profile directory's live-state.json.
 */
export function getSaveFilePath(profileName: string): string {
  return getLiveStatePath(profileName);
}

export function migrateLegacySave(): string | null {
  // P0-F4 (Fresh-User UX Audit): Fixed migration file-path mismatch.
  //
  // BUG: The original code copied the legacy save-all.json envelope to
  // getSaveFilePath(name) which returns 'live-state.json'. But SaveRepository
  // reads from getSaveFile() which returns 'save.json', and loadAll() reads
  // from getAtomicSaveFile() which returns 'save-all.json'. Neither of those
  // files was written during migration, so on the NEXT session loadSave()/
  // loadAll() found nothing and created a FRESH Significator with
  // totalEncounters=0 — silently destroying all progress from the session
  // that ran before migration.
  //
  // FIX: Write ALL THREE files the SaveRepository expects:
  //   1. save-all.json  (atomic envelope: {version, savedAt, sig, world})
  //   2. save.json      (raw Significator, for loadSave() fallback)
  //   3. world.json     (WorldState, for loadWorldState() fallback)
  // Then DELETE the legacy file so a future re-migration can't pick up
  // stale data and overwrite the profile's now-live progress.
  const legacy = path.join(Mysterium_DIR, 'save-all.json');
  if (!fs.existsSync(legacy)) return null;

  // Also check for the legacy world.json + save.json (pre-profile format).
  const legacyWorld = path.join(Mysterium_DIR, 'world.json');
  const legacySave = path.join(Mysterium_DIR, 'save.json');

  try {
    const raw = fs.readFileSync(legacy, 'utf8');
    const data = JSON.parse(raw);
    // The legacy save-all.json is an envelope {version, savedAt, sig, world}.
    // Older formats may be a raw Significator (no envelope).
    const isEnvelope = data && typeof data === 'object' && data.sig && data.world;
    const sig = isEnvelope ? data.sig : data;
    const world = isEnvelope ? data.world : null;
    const name = (sig.id && sig.id !== 'cli-player') ? sig.id : 'default';

    // createProfile sets the active symlink and writes fresh profile metadata.
    createProfile(name);
    const dir = path.join(PROFILES_DIR, name);

    // Write all three save files the SaveRepository expects.
    fs.writeFileSync(path.join(dir, 'save-all.json'), raw, 'utf8'); // envelope (source of truth)
    fs.writeFileSync(path.join(dir, 'save.json'), JSON.stringify(sig, null, 2), 'utf8'); // raw sig
    if (world) {
      fs.writeFileSync(path.join(dir, 'world.json'), JSON.stringify(world, null, 2), 'utf8');
    } else if (fs.existsSync(legacyWorld)) {
      fs.copyFileSync(legacyWorld, path.join(dir, 'world.json'));
    }

    // Update identity.yaml with the migrated counts.
    const id = yamlRead(path.join(dir, 'identity.yaml'));
    id.total_sessions = sig.totalSessions ?? 0;
    id.total_encounters = sig.totalEncounters ?? 0;
    id.current_stage = sig.currentStage ?? 'Red';
    id.lifecycle = sig.lifecycle ?? 'Exploring';
    yamlWrite(path.join(dir, 'identity.yaml'), id);

    // Sync developmental state.
    const ds = yamlRead(path.join(dir, 'developmental-state.yaml'));
    ds.altitudes = sig.altitudes ?? ds.altitudes;
    ds.drives = sig.drives?.weights ?? ds.drives;
    ds.ray_profile = sig.rayProfile ?? ds.ray_profile;
    yamlWrite(path.join(dir, 'developmental-state.yaml'), ds);

    // P0-F4: Delete the legacy files so a future re-migration (e.g. if the
    // profile is deleted) can't pick up stale data and overwrite live progress.
    try { fs.unlinkSync(legacy); } catch { /* already gone */ }
    try { fs.unlinkSync(legacySave); } catch { /* already gone */ }
    try { fs.unlinkSync(legacyWorld); } catch { /* already gone */ }

    return name;
  } catch { return null; }
}

// ── P2-U5: Progressive vocabulary unlock ──────────────────────────────

/**
 * P2-U5 (Fresh-User UX Re-Audit): Load the set of Tier 2 glossary terms
 * the player has unlocked by encountering them in play. Stored as a simple
 * JSON array in unlocked-terms.json. Returns empty array if no profile
 * or no file.
 */
export function loadUnlockedTerms(profileDir: string | null): readonly string[] {
  if (!profileDir) return [];
  try {
    const filePath = path.join(profileDir, 'unlocked-terms.json');
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (Array.isArray(data.terms)) return data.terms as string[];
    return [];
  } catch { return []; }
}

/**
 * P2-U5: Save the updated set of unlocked terms. Creates the file if it
 * doesn't exist. Called after each encounter when new terms are unlocked.
 */
export function saveUnlockedTerms(profileDir: string | null, terms: readonly string[]): void {
  if (!profileDir) return;
  try {
    const filePath = path.join(profileDir, 'unlocked-terms.json');
    fs.writeFileSync(filePath, JSON.stringify({ terms, updatedAt: new Date().toISOString() }, null, 2), 'utf8');
  } catch { /* best-effort — don't break encounter flow */ }
}

/**
 * P2-U5: Add newly unlocked terms to the profile and return the list of
 * terms that were newly unlocked (for the CLI to display a notification).
 * If no new terms, returns empty array and does not write.
 */
export function addUnlockedTerms(profileDir: string | null, newTerms: readonly string[]): readonly string[] {
  if (!profileDir || newTerms.length === 0) return [];
  const existing = loadUnlockedTerms(profileDir);
  const trulyNew = newTerms.filter(t => !existing.includes(t));
  if (trulyNew.length === 0) return [];
  const updated = [...existing, ...trulyNew];
  saveUnlockedTerms(profileDir, updated);
  return trulyNew;
}
