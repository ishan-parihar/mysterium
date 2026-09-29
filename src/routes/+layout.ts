/**
 * Root layout load function.
 *
 * The serving decision is NOT made here. It lives in `src/lib/config/serving.ts` and every
 * `+page.ts` re-exports it, because a per-route literal is a decision repeated 26 times, and this
 * layout used to be the one place the choice existed — which meant a route could not opt out and
 * a global switch could not be read honestly from a per-route file.
 *
 * The `static` BUILD_TARGET (Capacitor / offline demo) is handled by that module. There are no
 * `/api/*` endpoints under that target (svelte.config.js), so it is NOT a deployment; the only
 * production deploy is BUILD_TARGET=cloudflare, where pages are pre-rendered and served from the
 * edge. There is no GitHub Pages workflow.
 *
 * process.env requires a typeof guard: in dev this file is shipped to
 * both server and browser, and Vite does not inline non-VITE_* env
 * vars, so a bare `process.env` reference throws on the client.
 */
import { ssr, prerender } from '$lib/config/serving.js';

export { ssr, prerender };
