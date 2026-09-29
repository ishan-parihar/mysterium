/**
 * Lightweight save hydration for the Svelte shell.
 *
 * Audit fix I2: The root +layout.svelte previously did `await import('$game/main.js')`
 * just to access Services.saveRepo.loadProfile(). This loaded the entire Phaser
 * bundle (~1MB) on every route — defeating the purpose of keeping Phaser out
 * of non-play routes.
 *
 * This module reads the Significator directly from localStorage (same key
 * SaveRepository uses: 'profile:v1') without importing any Phaser code.
 * It's ~20 lines vs ~1MB.
 *
 * The validateSignificator function is imported from infra/ (pure TS, no Phaser).
 */

import type { Significator } from '$core/domain/Significator.js';
import { validateSignificator } from '$infra/persistence/validateSignificator.js';

const PROFILE_KEY = 'profile:v1';

/**
 * Load the Significator from localStorage. Returns null if no save
 * exists or if the save is corrupt.
 *
 * This is the client-side hydration path — runs in onMount (browser only).
 * On the server (SSR), returns null immediately.
 */
export function loadSignificatorFromStorage(): Significator | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return validateSignificator(parsed);
  } catch {
    return null;
  }
}

