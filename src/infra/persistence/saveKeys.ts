/**
 * The logical storage keys, in one place.
 *
 * These used to be private constants inside `SaveRepository`, which made them unnameable from
 * anywhere else — and that is precisely what let the write/read asymmetry exist. Onboarding wrote
 * `localStorage.setItem('profile:v1', …)` while the engine wrote through `SaveRepository`, whose
 * `KeyValueStore` namespaces every key with `mysterium:`. The two therefore stored the same
 * profile at different physical keys, the read silently returned null, and `/play` redirected a
 * player who had completed calibration back to /onboarding, forever.
 *
 * One owner, imported by both the repository and the shell's hydration path, so the halves cannot
 * drift apart again. The PHYSICAL key is this name composed with the store's prefix — see
 * `resolveStorageKey` in `LocalStorageStore.ts` — because the prefix belongs to the store
 * implementation, which also has a non-localStorage implementation that must not be ignored.
 */

/** The player's Significator — the profile every route gates on. */
export const PROFILE_KEY = 'profile:v1';

/** The whole-save envelope (the CLI file path's shape). */
export const SAVE_KEY = 'save:v1';

/** The generated world state. */
export const WORLD_KEY = 'world:v1';
