/**
 * The dev-fallback guard — "not configured" must be loud in production (Deployment Readiness B-1).
 *
 * Three BFF routes fall back to a process-local `Map` when their Workers KV binding is absent:
 * `/api/save` (SAVE_KV), `/api/recovery/generate` + `/api/recovery/restore` (RECOVERY_KV). In dev
 * that fallback is correct and useful. In production it is a data-loss bug wearing a success
 * message — a deploy that ships `wrangler.toml`'s `REPLACE_WITH_SAVE_KV_ID` placeholder accepts
 * every save into memory, answers `200 {accepted: true}`, and loses all of it on the next cold
 * start. The client cannot help: `cloudSyncStore` treats a failed request as a silent no-op, so
 * the player is told their progress is safe and it is not.
 *
 * So the fallback stays — it is the dev experience and the Capacitor/static path — but it is
 * unreachable in a built artifact. In `vite dev` and in `vitest` it is allowed; anywhere else a
 * missing binding is a 503, not a silent success.
 *
 * One rule, four call sites (MY-RG-0010: a rule stated once is a rule that can be checked once).
 */

import { dev } from '$app/environment';
import { error } from '@sveltejs/kit';

/** The process facts the fallback policy turns on. Explicit so the policy is testable. */
export interface ProcessEnv {
  /** `$app/environment`'s `dev` — true only under `vite dev`. */
  readonly dev: boolean;
  /** Vite's build mode; `'test'` under vitest, `'production'` in a built artifact. */
  readonly mode: string | undefined;
}

const currentEnv: ProcessEnv = { dev, mode: import.meta.env?.MODE };

/** True when this process may fall back to an in-memory store. */
export function fallbackAllowed(env: ProcessEnv): boolean {
  return env.dev || env.mode === 'test';
}

/**
 * Assert that a durable binding is present before a route falls back to memory.
 *
 * @param bound     whether `platform.env.<BINDING>` resolved to a real binding
 * @param binding   the binding name, for the failure message
 * @param devOnly   name of the dev-only path the fallback serves, for the failure message
 * @param env       the process facts; defaults to this process's
 * @throws 503 when the binding is missing outside a dev/test process
 */
export function requireBoundStorage(
  bound: boolean,
  binding: string,
  devOnly: string,
  env: ProcessEnv = currentEnv,
): void {
  if (bound || fallbackAllowed(env)) return;
  throw error(
    503,
    `storage not configured: ${binding} is unbound, so this route cannot serve the ${devOnly} path. ` +
      `Refusing rather than falling back to an in-memory store that a restart would erase.`,
  );
}
