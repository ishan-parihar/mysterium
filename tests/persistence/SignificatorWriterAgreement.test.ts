// @vitest-environment jsdom
/**
 * Every client-side writer of the Significator must be reachable by the reader that hydrates it.
 *
 * THE CLASS THIS EXISTS FOR. `loadSignificatorFromStorage` reads
 * `resolveStorageKey(PROFILE_KEY)` — namespaced with `mysterium:` — while four separate routes
 * hand-typed `localStorage.setItem('profile:v1', …)`. Each one was a silent, total loss: onboarding
 * left a returning player unable to reach `/play`, `/journal` lost every vow fulfilment on reload,
 * and `/recover` decrypted a valid save, told the player "Save restored", and restored nothing.
 *
 * WHY A SOURCE SCAN IS NOT ENOUGH. The readers are shared modules, so the only question that has
 * teeth is behavioural: write the way each route writes, then read it back the way the engine reads.
 * A bare-key write MUST fail `loadSignificatorFromStorage` — that negative control is the test's
 * proof that a green result means "reachable" rather than "the assertion cannot fail".
 */

import { beforeEach, describe, expect, it } from 'vitest';

import { createSignificator } from '$core/domain/Significator.js';
import { PROFILE_KEY } from '$infra/persistence/saveKeys.js';
import { MYSTERIUM_KEY_PREFIX, resolveStorageKey } from '$infra/persistence/LocalStorageStore.js';
import { loadSignificatorFromStorage, persistSignificator } from '$lib/stores/saveHydration.js';
import { createKeyValueStore } from '$infra/persistence/createKeyValueStore.js';
import { SaveRepository } from '$infra/persistence/SaveRepository.js';

function ensureLocalStorage(): void {
  if (typeof globalThis.localStorage === 'undefined') {
    Object.defineProperty(globalThis, 'localStorage', {
      value: new Map<string, string>(),
      writable: true,
      configurable: true,
    });
  }
}

function fresh(): ReturnType<typeof createSignificator> {
  return createSignificator(`sig-test-${Math.random().toString(36).slice(2, 9)}`, {
    Cognitive: 'Amber', Emotional: 'Red', Moral: 'Red', Intrapersonal: 'Amber',
    Spiritual: 'Red', Somatic: 'Red', Willpower: 'Red', Interpersonal: 'Red',
  }, 'Amber');
}

describe('Significator writer/reader agreement', () => {
  beforeEach(() => {
    ensureLocalStorage();
    localStorage.clear();
  });

  it('NEGATIVE CONTROL: a bare `profile:v1` write is NOT readable — proving the assertion has teeth', () => {
    // This is what all four routes used to do. If it ever became readable, the test below would be
    // vacuous: it would pass for a wrong reason.
    localStorage.setItem(PROFILE_KEY, JSON.stringify(fresh()));

    expect(localStorage.getItem(PROFILE_KEY)).not.toBeNull();   // the write DID land
    expect(resolveStorageKey(PROFILE_KEY)).not.toBe(PROFILE_KEY); // and it is a different key
    expect(localStorage.getItem(resolveStorageKey(PROFILE_KEY))).toBeNull();
    expect(loadSignificatorFromStorage()).toBeFalsy();
  });

  it('the canonical writer is readable by the engine reader', async () => {
    const sig = fresh();
    await persistSignificator(sig);

    const read = loadSignificatorFromStorage();
    expect(read).toBeDefined();
    expect(read?.id).toBe(sig.id);
    expect(read?.currentStage).toBe(sig.currentStage);
    expect(read?.altitudes.Cognitive).toBe('Amber');
  });

  it('the engine writer (SaveRepository) is readable by the same reader', async () => {
    // The other half of the round trip: `/play` writes here, and the profile must come back.
    const sig = fresh();
    await new SaveRepository(createKeyValueStore()).saveProfile(sig);

    expect(loadSignificatorFromStorage()?.id).toBe(sig.id);
  });

  it('persists totalEncounters, so an encounter survives a reload', async () => {
    // The counter a player actually sees. 6c03d2d fixed the pre-encounter-stale-state bug by
    // persisting `result.updatedSig`; this asserts the property survives the storage boundary.
    const sig = { ...fresh(), totalEncounters: 7 };
    await persistSignificator(sig);

    expect(loadSignificatorFromStorage()?.totalEncounters).toBe(7);
  });

  it('writes the namespaced key and leaves the bare one absent', async () => {
    await persistSignificator(fresh());

    expect(localStorage.getItem(`${MYSTERIUM_KEY_PREFIX}${PROFILE_KEY}`)).not.toBeNull();
    expect(localStorage.getItem(PROFILE_KEY)).toBeNull();
  });

  it('NO ROUTE hand-types the bare key — proven by mutation', async () => {
    // The behavioural tests above cover the shared writer, which is exactly why they are NOT
    // sufficient: a route that regresses to `localStorage.setItem('profile:v1', …)` keeps every
    // one of them green, because the helper is still correct. This is the assertion with teeth for
    // this class — mutation-verified by reverting `/journal` to the bare key, which turns it red.
    const { readFile, glob } = await import('node:fs/promises');
    const routes: string[] = [];
    for await (const entry of glob('src/routes/**/+page.svelte')) routes.push(entry);

    expect(routes.length).toBeGreaterThan(20); // the glob itself must work, or this is vacuous

    // COMMENTS ARE STRIPPED FIRST, and that is not tidiness. The three routes that HAD this bug each
    // carry a comment explaining it, so a naive scan reported all three as offenders on a clean tree
    // — a gate that cries wolf on correct code is a gate nobody runs. A raw regex over a file that
    // documents its own defect cannot tell prose from code.
    const stripComments = (s: string): string =>
      s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');

    const offenders: string[] = [];
    for (const file of routes) {
      const src = stripComments(await readFile(file, 'utf8'));
      if (/setItem\(\s*['"`]profile:v1['"`]/.test(src)) offenders.push(file);
    }

    expect(offenders).toEqual([]);
  });
});
