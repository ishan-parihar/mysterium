import { describe, expect, it, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import type { RecentEncounter } from '$core/engines/AutoModeStrategy.js';

import { get } from 'svelte/store';
import { endSession, startSession } from '$core/GameLoop.js';
import { createSignificator } from '$core/domain/Significator.js';
import { createFirstBootWorld } from '$lib/engine/worldBootstrap.js';
import { engineStore, endGameSession } from '$lib/engine/gameEngine.js';

/**
 * Leaving `/play` must close the session.
 *
 * THE ABSENCE THIS PINS. `endSession` is where the kernel does what cannot happen mid-encounter:
 * theta-decay on neglected stages, the Choice evaluation at the apex (19 §9.6), and the harvest
 * check. The browser never called it. `/play` had exactly two exits and both did `goto('/')`, so for
 * a browser player `totalSessions` stayed 0 forever, neglected stages never decayed, and the Choice
 * was never evaluated — while the CLI reached all three. The engine and `/play` were not the same
 * product.
 *
 * WHY THE KERNEL'S OWN GUARD IS THE ASSERTION. `GameLoop` counts a session only when
 * `encountersCompleted > 0` (P2-1: a run where every encounter crashed must not count). So this
 * drives the real `endSession` and asserts on ITS decision rather than on a copy of the rule — if
 * the kernel's policy changes, this test follows it instead of pinning a stale expectation.
 */

const ALTITUDES = {
  Cognitive: 'Amber', Emotional: 'Red', Moral: 'Red', Intrapersonal: 'Amber',
  Spiritual: 'Red', Somatic: 'Red', Willpower: 'Red', Interpersonal: 'Red',
} as const;

function sigWith(encounters: number) {
  return { ...createSignificator('sig-test', { ...ALTITUDES }, 'Amber'), totalEncounters: encounters };
}

/** A session that has `completed` outcomes, which is what the kernel counts. */
function sessionWithCompleted(n: number) {
  const base = startSession(sigWith(n), {
    encountersSoFar: n, sessionDurationMs: 1000, targetSessionLength: 5, recentLines: [],
  });
  // The full `RecentEncounter` shape — a partial literal type-checks under vitest's transform but
  // svelte-check catches it, which is exactly the kind of error a test-only run will not find.
  const outcomes: RecentEncounter[] = Array.from({ length: n }, () => ({
    outcome: 'completed' as const,
    quality: 0.7,
    mode: 'capacity' as const,
    shadowIntegrated: false,
  }));
  return { ...base, recentOutcomes: outcomes };
}

describe('endGameSession', () => {
  beforeEach(() => {
    engineStore.set({
      significator: null, world: null, session: null, encounters: [], phase: 'idle', error: null,
    } as never);
  });

  it('a session with a completed encounter increments totalSessions', async () => {
    // The kernel's own decision, reached through the real function.
    const sig = sigWith(1);
    const closed = endSession(sig, sessionWithCompleted(1), Date.now(), createFirstBootWorld());
    expect(closed.sig.totalSessions).toBe(1);
  });

  it('a session where nothing completed does NOT count (the kernel owns that policy)', async () => {
    // Guards against someone "fixing" the browser counter by incrementing unconditionally here.
    const sig = sigWith(0);
    const closed = endSession(sig, sessionWithCompleted(0), Date.now(), createFirstBootWorld());
    expect(closed.sig.totalSessions).toBe(0);
  });

  it('applies the result to the store and clears the session', async () => {
    engineStore.set({
      significator: sigWith(1), world: createFirstBootWorld(),
      session: sessionWithCompleted(1), encounters: [], phase: 'world', error: null,
    } as never);

    await endGameSession();

    const after = get(engineStore);
    expect(after.session, 'the session survived its own boundary').toBeNull();
    expect(after.significator?.totalSessions).toBe(1);
  });

  it('is idempotent — a double Menu tap cannot double-apply', async () => {
    engineStore.set({
      significator: sigWith(1), world: createFirstBootWorld(),
      session: sessionWithCompleted(1), encounters: [], phase: 'world', error: null,
    } as never);

    await endGameSession();
    await endGameSession();

    expect(get(engineStore).significator?.totalSessions,
      'two calls counted two sessions').toBe(1);
  });

  it('is a no-op with no session, so a page that never started one is not corrupted', async () => {
    const before = sigWith(3);
    engineStore.set({
      significator: before, world: createFirstBootWorld(), session: null,
      encounters: [], phase: 'world', error: null,
    } as never);

    await endGameSession();

    expect(get(engineStore).significator?.id).toBe(before.id);
    expect(get(engineStore).significator?.totalEncounters).toBe(3);
  });

  it('/play actually calls it — the binding a unit test on the engine cannot prove', () => {
    // The engine test above passes even if `/play` never imports it — which is precisely how the
    // browser and the CLI drifted apart in the first place. This reads the route.
    const src = readFileSync('src/routes/play/+page.svelte', 'utf8');
    expect(src, '/play does not import endGameSession').toMatch(/endGameSession/);
    // It must be AWAITED before navigating, or `goto` races a half-written save.
    expect(src, '/play navigates before the session is closed').toMatch(
      /await endGameSession\(\)[\s\S]{0,400}?goto\('\/'\)/,
    );
  });
});
