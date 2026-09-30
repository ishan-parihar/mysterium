/**
 * Lightweight save hydration for the Svelte shell.
 *
 * Audit fix I2: the root +layout.svelte previously did `await import('$game/main.js')` just to
 * reach `Services.saveRepo.loadProfile()`, which loaded the whole ~1MB Phaser bundle on every
 * route. This module reads the profile without any Phaser code, and `SaveRepository` is pure TS —
 * so it is used for the WRITE rather than re-implementing one, keeping a single owner of the key.
 */

import type { Significator } from '$core/domain/Significator.js';
import { validateSignificator } from '$infra/persistence/validateSignificator.js';
import { PROFILE_KEY } from '$infra/persistence/saveKeys.js';
import { resolveStorageKey } from '$infra/persistence/LocalStorageStore.js';

/**
 * loadSignificatorFromStorage — read a saved Significator, synchronously.
 *
 * This used to read the BARE `profile:v1` while the engine wrote through `SaveRepository`, whose
 * `KeyValueStore` namespaces keys with `mysterium:`. The two disagreed about where a profile lives,
 * so the read silently returned null, and `/play` read that null as "no save" and redirected a
 * player who had in fact completed calibration — back to /onboarding, forever. That is the loop a
 * player cannot escape, and nothing in the UI ever said why.
 *
 * The key is now COMPOSED from its two owners (`PROFILE_KEY` × the store's prefix) rather than
 * re-typed, so the halves cannot drift apart again. Synchronous on purpose: ten call sites read
 * this during `onMount`, and making it async would have turned every one of them into a stale read.
 *
 * Returns null when no save exists or the save is corrupt. Browser-only; null on the server (SSR).
 */
export function loadSignificatorFromStorage(): Significator | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(resolveStorageKey(PROFILE_KEY));
    if (!raw) return null;
    return validateSignificator(JSON.parse(raw));
  } catch {
    return null;
  }
}

/**
 * Write a Significator to the SAME place the engine reads it.
 *
 * This goes through the real repository rather than a hand-typed `localStorage.setItem`, because
 * the engine reads through `SaveRepository` and its `KeyValueStore` owns the namespacing AND the
 * `serializeSignificator` shaping. A hand-typed write skips both, and re-opens exactly the silent
 * asymmetry documented on the reader above.
 *
 * Imported LAZILY: `SaveRepository` has a CLI branch carrying `import * as fs from 'fs'`, and a
 * top-level import would drag Node's fs into the browser bundle for every route that mounts the
 * shell.
 */
export async function persistSignificator(sig: Significator): Promise<void> {
  if (typeof window === 'undefined') return;
  const [{ SaveRepository }, { createKeyValueStore }] = await Promise.all([
    import('$infra/persistence/SaveRepository.js'),
    import('$infra/persistence/createKeyValueStore.js'),
  ]);
  await new SaveRepository(createKeyValueStore()).saveProfile(sig);
}
