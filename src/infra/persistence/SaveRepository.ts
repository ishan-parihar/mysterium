/**
 * SaveRepository — persistence layer for game state.
 *
 * Two persistence mechanisms:
 * 1. SaveRepository class — async KeyValueStore-based (for Phaser game scenes)
 * 2. CLI file-based functions — synchronous JSON file (for CLI runner)
 *
 * T-0.8 (HS-16 fix): both load paths now call `validateSignificator()` to
 * ensure schema completeness with backward-compat shims for old saves.
 */
import {
  DEFAULT_COGNITIVE_PROFILE,
  type CognitiveProfile,
} from '@core/domain/Stats.js';
import type { Significator } from '@core/domain/Significator.js';
import type { WorldState } from '@core/engines/CandidateGeneration.js';
import type { KeyValueStore } from './KeyValueStore.js';
import { validateSignificator } from './validateSignificator.js';

import * as fs from 'fs';
import * as path from 'path';
import { getMysteriumProfileDir } from './mysteriumDir.js';
import { PROFILE_KEY, SAVE_KEY, WORLD_KEY } from './saveKeys.js';

const CURRENT_VERSION = 1;

/** The root persisted save document. */
export interface SaveData {
  readonly version: number;
  readonly playerName: string;
  readonly cognitive: CognitiveProfile;
  /** XP accumulated across sessions. */
  readonly xp: number;
  /** Level derived from XP curve. */
  readonly level: number;
  /** Total encounters completed. */
  readonly encountersCompleted: number;
  /** Last save timestamp (ms since epoch). */
  readonly updatedAt: number;
}

export const DEFAULT_SAVE: SaveData = {
  version: CURRENT_VERSION,
  playerName: 'Hero',
  cognitive: DEFAULT_COGNITIVE_PROFILE,
  xp: 0,
  level: 1,
  encountersCompleted: 0,
  updatedAt: 0,
};

/**
 * SaveRepository — typed wrapper around KeyValueStore that handles
 * serialization, default initialization, and (future) migrations.
 */
export class SaveRepository {
  constructor(private readonly store: KeyValueStore) {}

  async load(): Promise<SaveData> {
    const raw = await this.store.get(SAVE_KEY);
    if (!raw) return { ...DEFAULT_SAVE };
    try {
      const parsed = JSON.parse(raw) as Partial<SaveData>;
      return migrate(parsed);
    } catch {
      // Corrupted save — start fresh rather than crash.
      return { ...DEFAULT_SAVE };
    }
  }

  async save(data: SaveData): Promise<void> {
    const out: SaveData = {
      ...data,
      version: CURRENT_VERSION,
      updatedAt: Date.now(),
    };
    await this.store.set(SAVE_KEY, JSON.stringify(out));
  }

  async reset(): Promise<void> {
    await this.store.remove(SAVE_KEY);
  }

  // --- Significator persistence ---

  async loadProfile(): Promise<Significator | null> {
    const raw = await this.store.get(PROFILE_KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      // T-0.8 (HS-16 fix): validate with backward-compat shims
      return validateSignificator(parsed);
    } catch {
      return null;
    }
  }

  async saveProfile(sig: Significator): Promise<void> {
    await this.store.set(PROFILE_KEY, JSON.stringify(serializeSignificator(sig)));
  }

  async resetProfile(): Promise<void> {
    await this.store.remove(PROFILE_KEY);
  }

  // --- WorldState persistence ---

  async loadWorldState(): Promise<WorldState | null> {
    const raw = await this.store.get(WORLD_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as WorldState;
    } catch {
      return null;
    }
  }

  async saveWorldState(world: WorldState): Promise<void> {
    await this.store.set(WORLD_KEY, JSON.stringify(world));
  }

  async resetWorldState(): Promise<void> {
    await this.store.remove(WORLD_KEY);
  }
}

/** Forward-compatible migration. Currently there is only v1. */
function migrate(input: Partial<SaveData>): SaveData {
  return {
    ...DEFAULT_SAVE,
    ...input,
    cognitive: { ...DEFAULT_SAVE.cognitive, ...(input.cognitive ?? {}) },
    version: CURRENT_VERSION,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// CLI File-Based Persistence (synchronous, for cli-game.ts)
// Saves to ~/.mysterium/profiles/<active>/save.json so player progress persists
// per-profile. Falls back to ~/.mysterium/ for legacy saves.
// ═══════════════════════════════════════════════════════════════════════

function getSaveDir(): string { return getMysteriumProfileDir(); }

function getSaveFile(): string {
  return path.join(getSaveDir(), 'save.json');
}

function getWorldFile(): string {
  return path.join(getSaveDir(), 'world.json');
}

function getAtomicSaveFile(): string {
  return path.join(getSaveDir(), 'save-all.json');
}

// FIX-PERSIST (Audit): Maps serialize to {} via JSON.stringify. KnowledgeState
// holds 2-3 Maps (conceptStates, subjectProgress, forgettingCurves).
// Without conversion, curriculum progress is lost on every save — the
// curriculum_status bug (0 concepts after seed) was actually a persistence bug.
function serializeSignificator(sig: Significator): Record<string, unknown> {
  const out: Record<string, unknown> = { ...sig } as unknown as Record<string, unknown>;
  if (sig.knowledge) {
    const k = sig.knowledge as unknown as Record<string, unknown>;
    const conceptStates = k.conceptStates as unknown as Map<string, unknown> | Record<string, unknown>;
    const subjectProgress = k.subjectProgress as unknown as Map<string, unknown> | Record<string, unknown>;
    const forgettingCurves = (k as Record<string, unknown>).forgettingCurves as unknown as Map<string, unknown> | Record<string, unknown> | undefined;
    out.knowledge = {
      ...k,
      conceptStates: conceptStates instanceof Map ? Object.fromEntries(conceptStates) : conceptStates,
      subjectProgress: subjectProgress instanceof Map ? Object.fromEntries(subjectProgress) : subjectProgress,
      ...(forgettingCurves !== undefined ? { forgettingCurves: forgettingCurves instanceof Map ? Object.fromEntries(forgettingCurves) : forgettingCurves } : {}),
    };
  }
  return out;
}

// Keep old constants for backward compat (tests etc.)
// const CLI_SAVE_DIR — replaced by getSaveDir()
// const CLI_SAVE_FILE — replaced by getSaveFile()

/**
 * Load a previously saved Significator from disk.
 * Returns null if no save file exists or if parsing fails.
 */
export function loadSave(): Significator | null {
  try {
    const saveFile = getSaveFile();
    if (fs.existsSync(saveFile)) {
      const raw = fs.readFileSync(saveFile, 'utf8');
      const parsed = JSON.parse(raw);
      // T-0.8 (HS-16 fix): validate with backward-compat shims instead of
      // only checking 3 fields then trusting the rest.
      if (parsed && typeof parsed.id === 'string') {
        return validateSignificator(parsed);
      }
    }
  } catch { /* ignore corrupt saves */ }
  return null;
}

/**
 * Save the current Significator state to disk.
 */
export function saveGame(sig: Significator): void {
  try {
    const saveFile = getSaveFile();
    fs.mkdirSync(path.dirname(saveFile), { recursive: true });
    fs.writeFileSync(saveFile, JSON.stringify(serializeSignificator(sig), null, 2));
  } catch { /* ignore write errors in headless mode */ }
}

/**
 * Check if a save file exists.
 */
export function hasSave(): boolean {
  try {
    return fs.existsSync(getSaveFile());
  } catch {
    return false;
  }
}

/**
 * Delete the save file (for new game).
 */
export function deleteSave(): void {
  try {
    const saveFile = getSaveFile();
    if (fs.existsSync(saveFile)) {
      fs.unlinkSync(saveFile);
    }
  } catch { /* ignore */ }
}

// ═══════════════════════════════════════════════════════════════════════
// WorldState Persistence (CLI file-based, synchronous)
// Saves to ~/.mysterium/world.json so world state persists across CLI runs.
// ═══════════════════════════════════════════════════════════════════════

// const CLI_WORLD_FILE — replaced by getWorldFile()

/**
 * Load a previously saved WorldState from disk.
 * Returns null if no save file exists or if parsing fails.
 */
export function loadWorldState(): WorldState | null {
  try {
    const worldFile = getWorldFile();
    if (fs.existsSync(worldFile)) {
      const raw = fs.readFileSync(worldFile, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed && parsed.holons) {
        return parsed as WorldState;
      }
    }
  } catch { /* ignore corrupt saves */ }
  return null;
}

/**
 * Save the current WorldState to disk.
 */
export function saveWorldState(world: WorldState): void {
  try {
    const worldFile = getWorldFile();
    fs.mkdirSync(path.dirname(worldFile), { recursive: true });
    fs.writeFileSync(worldFile, JSON.stringify(world, null, 2));
  } catch { /* ignore write errors in headless mode */ }
}

/**
 * Delete the world save file (for new game).
 */
export function deleteWorldSave(): void {
  try {
    const worldFile = getWorldFile();
    if (fs.existsSync(worldFile)) {
      fs.unlinkSync(worldFile);
    }
  } catch { /* ignore */ }
}

// ═══════════════════════════════════════════════════════════════════════
// P0-5: Atomic Save (sig + world in a single transaction)
// Writes both Significator + WorldState to a single JSON envelope via
// temp-file + rename, so a crash between writes can't leave sig and world
// out of sync. The individual saveGame() + saveWorldState() calls remain
// for backward compatibility, but callers should prefer saveAll() when
// saving both at once (e.g. at session end).
// ═══════════════════════════════════════════════════════════════════════

// const CLI_ATOMIC_SAVE_FILE — replaced by getAtomicSaveFile()

/**
 * P0-5: Atomically save both Significator + WorldState to a single JSON file.
 *
 * Writes to a temp file first, then renames it to the final path. `fs.renameSync`
 * is atomic on POSIX systems (single inode operation), so a crash during the
 * write leaves either the old complete state or the new complete state — never
 * a half-written mix.
 *
 * Also writes the individual save.json + world.json files for backward
 * compatibility with older code paths that read them separately.
 */
export function saveAll(sig: Significator, world: WorldState): void {
  try {
    const atomicFile = getAtomicSaveFile();
    const saveFile = getSaveFile();
    const worldFile = getWorldFile();
    fs.mkdirSync(path.dirname(atomicFile), { recursive: true });

    // Build the combined envelope — serialize sig's Maps so JSON round-trips.
    const envelope = {
      version: 2,
      savedAt: Date.now(),
      sig: serializeSignificator(sig),
      world,
    };
    const json = JSON.stringify(envelope, null, 2);

    // Write to a temp file first, then atomically rename. On POSIX, rename is
    // an atomic inode operation — readers see either the old or new file, never
    // a partial write. On Windows, rename is also atomic if the target doesn't
    // exist (which we ensure by unlinking first).
    const tempFile = atomicFile + '.tmp';
    fs.writeFileSync(tempFile, json);

    // Remove the final target if it exists (Windows needs this; POSIX rename overwrites)
    try { fs.unlinkSync(atomicFile); } catch { /* doesn't exist — fine */ }

    // Atomic rename
    fs.renameSync(tempFile, atomicFile);

    // Also write the individual files for backward compat (older code reads
    // save.json / world.json directly). These are non-atomic individually but
    // the atomic envelope above is the source of truth for new code.
    fs.writeFileSync(saveFile, JSON.stringify(serializeSignificator(sig), null, 2));
    fs.writeFileSync(worldFile, JSON.stringify(world, null, 2));
  } catch { /* ignore write errors in headless mode */ }
}

/**
 * P0-5: Load the atomic save envelope (sig + world together).
 * Falls back to loading individual files if the envelope doesn't exist
 * (for saves created before P0-5).
 */
export function loadAll(): { sig: Significator; world: WorldState } | null {
  try {
    if (fs.existsSync(getAtomicSaveFile())) {
      const raw = fs.readFileSync(getAtomicSaveFile(), 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed && parsed.sig && parsed.world && typeof parsed.sig.id === 'string') {
        const validatedSig = validateSignificator(parsed.sig);
        if (validatedSig) {
          return {
            sig: validatedSig,
            world: parsed.world as WorldState,
          };
        }
      }
    }
  } catch { /* ignore corrupt saves */ }

  // Fallback: load individual files (pre-P0-5 saves)
  const sig = loadSave();
  const world = loadWorldState();
  if (sig && world) {
    return { sig, world };
  }
  return null;
}

/**
 * P0-5: Atomically delete both saves (for new game).
 */
export function deleteAllSaves(): void {
  // EFFICACY-PILOT (P0): Back up config.json before any deletion, then
  // restore it after. This is a HARD guarantee — config.json must survive
  // ALL save-deletion operations, no exceptions. The LLM config is system
  // preferences, not game state.
  const configFile = path.join(getSaveDir(), 'config.json');
  let configBackup: string | null = null;
  try {
    if (fs.existsSync(configFile)) {
      configBackup = fs.readFileSync(configFile, 'utf8');
    }
  } catch { /* ignore read errors */ }

  deleteSave();
  deleteWorldSave();
  try {
    if (fs.existsSync(getAtomicSaveFile())) {
      fs.unlinkSync(getAtomicSaveFile());
    }
  } catch { /* ignore */ }

  // Restore config.json if it was deleted by any of the above operations
  // (shouldn't happen, but this is the HARD guarantee).
  if (configBackup !== null) {
    try {
      if (!fs.existsSync(configFile)) {
        fs.writeFileSync(configFile, configBackup);
      }
    } catch { /* ignore write errors */ }
  }
}
