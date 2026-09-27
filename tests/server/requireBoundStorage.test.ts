/**
 * B-1 — the dev-fallback guard: "not configured" must be LOUD in production.
 *
 * The bug this pins: `/api/save` with an unbound `SAVE_KV` (exactly what deploying
 * `wrangler.toml`'s `REPLACE_WITH_SAVE_KV_ID` placeholder produces) fell through to a
 * process-local `Map` and answered `200 {accepted: true}`. Every save accepted, none persisted,
 * all lost on the next cold start, and `cloudSyncStore` treats a failed request as a silent
 * no-op — so the player is told their progress is safe and it is not.
 *
 * These assert the FAILURE, not the happy path: a test that only proves the fallback still works
 * would pass against the data-loss build. The dev/test branch is pinned too, because a guard that
 * refuses in dev would simply be deleted by the next person who could not get the app to boot.
 */
import { describe, it, expect } from 'vitest';
import { fallbackAllowed, requireBoundStorage, type ProcessEnv } from '../../src/lib/server/requireBoundStorage.js';

const PROD: ProcessEnv = { dev: false, mode: 'production' };
const DEV: ProcessEnv = { dev: true, mode: 'development' };
const TEST: ProcessEnv = { dev: false, mode: 'test' };

/** The thrown HttpError's status + the text a client would receive, or `undefined` if none. */
function catchThrown(fn: () => void): { status?: number; text: string } | undefined {
  try {
    fn();
    return undefined;
  } catch (e) {
    const h = e as { status?: number; body?: { message?: string } | string };
    // SvelteKit's `error(status, 'text')` wraps a string body as `{ message }` — that object is
    // what the client receives, so it is what the test reads.
    const body = h.body;
    return { status: h.status, text: typeof body === 'string' ? body : (body?.message ?? '') };
  }
}

describe('B-1 — the dev-fallback guard', () => {
  it('refuses the in-memory fallback in a built artifact when the binding is absent', () => {
    // SvelteKit's `error()` throws an HttpError whose `message` is the bare status text; the
    // operator-facing string lives in `body`, and `body` is what the client actually receives.
    // Asserting `body` is therefore the stronger check — it is the deployed contract, not a
    // property of this helper.
    const thrown = catchThrown(() => requireBoundStorage(false, 'SAVE_KV', 'save', PROD));
    expect(thrown?.status).toBe(503);
    expect(thrown?.text).toMatch(/storage not configured/);
    // The message must name the binding and the consequence, so an operator reading the 503 body
    // knows both what is missing and why the route refused instead of falling back.
    expect(thrown?.text).toMatch(/SAVE_KV/);
    expect(thrown?.text).toMatch(/restart would erase/);
  });

  it('never refuses when the binding IS bound — a real namespace is not an error', () => {
    expect(() => requireBoundStorage(true, 'SAVE_KV', 'save', PROD)).not.toThrow();
    expect(() => requireBoundStorage(true, 'RECOVERY_KV', 'recovery', PROD)).not.toThrow();
  });

  it('allows the fallback in dev and under test — the paths that legitimately have no binding', () => {
    expect(fallbackAllowed(DEV)).toBe(true);
    expect(fallbackAllowed(TEST)).toBe(true);
    expect(fallbackAllowed(PROD)).toBe(false);
    expect(() => requireBoundStorage(false, 'SAVE_KV', 'save', DEV)).not.toThrow();
    expect(() => requireBoundStorage(false, 'SAVE_KV', 'save', TEST)).not.toThrow();
  });

  it('treats an unknown mode as production, not as dev (fail-closed on an unknown build)', () => {
    expect(fallbackAllowed({ dev: false, mode: undefined })).toBe(false);
    expect(catchThrown(() => requireBoundStorage(false, 'SAVE_KV', 'save', { dev: false, mode: undefined }))?.status).toBe(503);
  });
});
