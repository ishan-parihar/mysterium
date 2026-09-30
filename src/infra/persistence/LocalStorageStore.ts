import type { KeyValueStore } from './KeyValueStore.js';

/**
 * The namespace every `LocalStorageStore` key lives under.
 *
 * Exported because it is one half of a two-part key: `SaveRepository` owns the logical name
 * (`profile:v1`), the store owns the prefix. `resolveStorageKey` is the single place the two are
 * composed — see the write/read asymmetry documented in `src/infra/persistence/saveKeys.ts`, which
 * is what this export exists to prevent recurring.
 */
export const MYSTERIUM_KEY_PREFIX = 'mysterium:';

/** Compose a logical key into the physical key this store reads and writes. */
export function resolveStorageKey(key: string, prefix: string = MYSTERIUM_KEY_PREFIX): string {
  return `${prefix}${key}`;
}

/**
 * LocalStorage-backed KV store. Used as the web/dev fallback. The
 * blueprint warns that mobile WebViews evict localStorage aggressively,
 * so on Android we prefer Capacitor Preferences (see CapacitorPreferencesStore).
 */
export class LocalStorageStore implements KeyValueStore {
  private readonly prefix: string;

  constructor(prefix: string = MYSTERIUM_KEY_PREFIX) {
    this.prefix = prefix;
  }

  private readonly k = (key: string) => resolveStorageKey(key, this.prefix);

  async get(key: string): Promise<string | null> {
    try {
      return globalThis.localStorage?.getItem(this.k(key)) ?? null;
    } catch {
      return null;
    }
  }

  async set(key: string, value: string): Promise<void> {
    try {
      globalThis.localStorage?.setItem(this.k(key), value);
    } catch {
      // Quota exceeded or storage disabled — silently degrade.
    }
  }

  async remove(key: string): Promise<void> {
    try {
      globalThis.localStorage?.removeItem(this.k(key));
    } catch {
      /* noop */
    }
  }

  async clear(): Promise<void> {
    try {
      const ls = globalThis.localStorage;
      if (!ls) return;
      const toRemove: string[] = [];
      for (let i = 0; i < ls.length; i++) {
        const key = ls.key(i);
        if (key && key.startsWith(this.prefix)) toRemove.push(key);
      }
      for (const k of toRemove) ls.removeItem(k);
    } catch {
      /* noop */
    }
  }
}
