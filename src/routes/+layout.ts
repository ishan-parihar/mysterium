/**
 * Root layout load function.
 *
 * Controls SSR globally based on BUILD_TARGET:
 *   - BUILD_TARGET=static (Capacitor / offline demo): SSR disabled.
 *     The app is a client-side SPA. Capacitor loads from file:// where
 *     SSR is impossible. NOTE: this target has no /api/* endpoints at all
 *     (svelte.config.js), so it is NOT a deployment — the only production
 *     deploy is BUILD_TARGET=cloudflare. There is no GitHub Pages workflow.
 *
 * process.env requires a typeof guard: in dev this file is shipped to
 * both server and browser, and Vite does not inline non-VITE_* env
 * vars, so a bare `process.env` reference throws on the client.
 */

const buildTarget =
  typeof process !== 'undefined' && process.env && process.env.BUILD_TARGET
    ? process.env.BUILD_TARGET
    : '';

export const ssr = buildTarget !== 'static';
export const prerender = buildTarget === 'static';
