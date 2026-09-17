// Minimal `$app/*` virtual-module stubs for the vitest pipeline.
// The sveltekit() plugin provides these at runtime, but the plugin also keeps
// file handles open in the Vite server (tests hang 10s at exit). No test
// imports .svelte files, so tests only need these modules to RESOLVE with
// sensible non-browser semantics.
//
//   $app/environment — https://svelte.dev/docs/kit/$app-environment
//   $app/paths       — https://svelte.dev/docs/kit/$app-paths
export const browser = false;
export const dev = false;
export const building = false;
export const version = 'vitest-stub';

export const base = '';
export const assets = '';
export const asset = (path: string): string => path;
export const resolveRoute = (path: string): string => path;
