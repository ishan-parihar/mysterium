import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';

/**
 * Vitest config — deliberately separate from vite.config.ts.
 *
 * Vitest gives vitest.config.ts precedence over vite.config.ts (it does NOT
 * merge), so this file re-declares everything tests need. It deliberately
 * EXCLUDES the sveltekit() plugin: its transform machinery keeps file
 * handles open in the Vite server, hanging process exit ~10s after every
 * run ("something prevents Vite server from exiting"). Verified via the
 * hanging-process reporter: 10 anonymous FILEHANDLEs appear only when the
 * plugin is loaded. No test imports .svelte files — they only need the
 * $lib/$app/$env aliases that src TS code transitively imports, provided
 * below with minimal non-browser stubs (tests/stubs/).
 *
 * Alias list mirrors svelte.config.js ($lib/$core/$infra/$shared) plus the
 * legacy @core/@infra aliases. String `find`s are intentional: Vite's alias
 * matches them as prefix + '/' boundary and preserves the remainder of the
 * specifier (regex `find`s replace the WHOLE match, which silently drops
 * the subpath). If a future test needs real Svelte component compilation,
 * reintroduce sveltekit() here and re-profile the exit hang.
 */
const r = (p: string): string => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  define: {
    __DEV__: JSON.stringify(true),
    // Svelte 5 client runtime checks these; components aren't compiled in
    // the test pipeline but modules imported by stores may reference them.
    __SVELTEKIT_DEV__: JSON.stringify(false),
  },
  resolve: {
    alias: [
      // SvelteKit virtual modules → stubs (most specific first)
      { find: '$app/environment', replacement: r('./tests/stubs/app-environment.ts') },
      { find: '$app/navigation', replacement: r('./tests/stubs/app-navigation.ts') },
      { find: '$app/paths', replacement: r('./tests/stubs/app-environment.ts') },
      { find: '$env/dynamic/private', replacement: r('./tests/stubs/env-dynamic-private.ts') },
      { find: '$env/static/private', replacement: r('./tests/stubs/env-dynamic-private.ts') },
      { find: '$env/dynamic/public', replacement: r('./tests/stubs/env-dynamic-private.ts') },
      { find: '$env/static/public', replacement: r('./tests/stubs/env-dynamic-private.ts') },
      // SvelteKit aliases (svelte.config.js)
      { find: '$lib', replacement: r('./src/lib') },
      { find: '$core', replacement: r('./src/core') },
      { find: '$infra', replacement: r('./src/infra') },
      { find: '$shared', replacement: r('./src/shared') },
      { find: '$src', replacement: r('./src') },
      // Legacy aliases (src/core + src/infra)
      { find: '@core', replacement: r('./src/core') },
      { find: '@infra', replacement: r('./src/infra') },
    ],
  },
  test: {
    environment: 'node',
    globals: false,
    // Deep import chains (engine boot, kernel harness) exceed the default
    // 5s on cold CI runs.
    testTimeout: 20_000,
    hookTimeout: 20_000,
  },
});
