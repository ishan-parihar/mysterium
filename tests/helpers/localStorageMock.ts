/**
 * Shared localStorage mock for vitest tests.
 *
 * jsdom may not provide localStorage in all vitest configurations.
 * This helper creates a Map-based mock when localStorage is undefined.
 *
 * Usage:
 *   import { ensureLocalStorage } from '../helpers/localStorageMock.js';
 *   beforeEach(() => { ensureLocalStorage(); localStorage.clear(); });
 */
import { vi } from 'vitest';

/**
 * Ensure a WORKING localStorage is available in the global scope.
 * Creates a Map-based mock if localStorage is undefined — or if it exists
 * but is non-functional. Node ≥ 22 exposes a global `localStorage` that
 * throws on use unless launched with --localstorage-file, so a bare
 * `typeof` check is not enough: the engine's boot would silently fail
 * (LocalStorageStore degrades to no-ops on throw, profiles never load).
 * Safe to call multiple times — only stubs once.
 */
export function ensureLocalStorage(): void {
  if (localStorageIsWorking()) {
    return;
  }
  {
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => store.set(k, v),
      removeItem: (k: string) => store.delete(k),
      clear: () => store.clear(),
      get length() { return store.size; },
      key: (i: number) => [...store.keys()][i] ?? null,
    });
  }
}

function localStorageIsWorking(): boolean {
  try {
    const probe = '__mysterium_probe__';
    localStorage.setItem(probe, '1');
    const ok = localStorage.getItem(probe) === '1';
    localStorage.removeItem(probe);
    return ok;
  } catch {
    return false;
  }
}
