import { describe, expect, it, beforeEach } from 'vitest';

import {
  getOrCreateAgentRuntime,
  isAgentRuntimeStarted,
  disposeAgentRuntime,
  liveAgentSessionCount,
} from '../../src/lib/server/agentRegistry.js';

/**
 * Two players on one isolate must not share a director.
 *
 * THE DEFECT THIS PINS. `agentRegistry` held a single module-global `DirectorAgent`, and both callers
 * discarded the session id they had already parsed — `probe/+server.ts:28` read
 * `void sessionId; // reserved for per-session routing later`, and `observe/+server.ts` validated that
 * a `sessionId` was present and then ignored it. So the first browser to calibrate completed
 * calibration for every other browser on the process, and each new arrival overwrote the previous
 * player's probe state. Unlike most leaks, nothing ever reset it: the state persisted until the
 * isolate recycled, which is not something application code controls.
 *
 * The public `/api/agent/*` surface is per-request and shared, so this cannot be tested through a
 * route. It is tested where the decision lives.
 */
describe('the agent runtime registry', () => {
  beforeEach(() => {
    disposeAgentRuntime();
  });

  it('gives two sessions DIFFERENT directors', () => {
    const a = getOrCreateAgentRuntime('player-a');
    const b = getOrCreateAgentRuntime('player-b');

    expect(a.director).not.toBe(b.director);
    expect(a.runtime).not.toBe(b.runtime);
  });

  it('gives one session the SAME director on every call', () => {
    const a1 = getOrCreateAgentRuntime('player-a');
    const a2 = getOrCreateAgentRuntime('player-a');

    expect(a2.director).toBe(a1.director);
    expect(liveAgentSessionCount()).toBe(1);
  });

  it('a session-less caller gets a director keyed on the empty session, not a shared global', () => {
    // `''` is a real key, so two callers that both omit the id DO share one director — which is the
    // documented behaviour, not a bug: they are indistinguishable sessions as far as the endpoint is
    // concerned. The defect was never "the default shares"; it was that an EXPLICIT session id was
    // accepted, validated, and then discarded. So the assertion is that a named session does not
    // collapse onto the default key, and that the default is stable across calls.
    const anonymous = getOrCreateAgentRuntime();
    expect(getOrCreateAgentRuntime().director).toBe(anonymous.director);
    expect(getOrCreateAgentRuntime('player-a').director).not.toBe(anonymous.director);
    expect(liveAgentSessionCount()).toBe(2);
  });

  it('calibrating one session does not complete another', () => {
    const a = getOrCreateAgentRuntime('player-a');
    const b = getOrCreateAgentRuntime('player-b');

    expect(a.director.snapshot().calibrationComplete).toBe(false);
    expect(b.director.snapshot().calibrationComplete).toBe(false);

    // `markCalibrationComplete` is a REAL method on DirectorAgent. The first version of this test
    // called `recordProbeResult?.(...)` — a method that does not exist, behind an optional call, so
    // it no-op'd silently and the assertion below passed for the wrong reason. This is the shape of a
    // vacuous test: `?.` turns a typo into a green run.
    a.director.markCalibrationComplete();

    expect(a.director.snapshot().calibrationComplete, 'a was not calibrated by its own call').toBe(true);
    expect(b.director.snapshot().calibrationComplete, 'b was completed by a').toBe(false);
  });

  it('reports started per session', () => {
    expect(isAgentRuntimeStarted('player-a')).toBe(false);
    getOrCreateAgentRuntime('player-a');
    expect(isAgentRuntimeStarted('player-a')).toBe(true);
    expect(isAgentRuntimeStarted('player-b'), 'an unstarted session reported started').toBe(false);
  });

  it('disposing one session leaves the others running', () => {
    getOrCreateAgentRuntime('player-a');
    getOrCreateAgentRuntime('player-b');

    disposeAgentRuntime('player-a');

    expect(isAgentRuntimeStarted('player-a')).toBe(false);
    expect(isAgentRuntimeStarted('player-b')).toBe(true);
  });

  it('is BOUNDED — a public endpoint must not grow this map without limit', () => {
    for (let i = 0; i < 200; i += 1) getOrCreateAgentRuntime(`s${i}`);

    expect(liveAgentSessionCount()).toBeLessThanOrEqual(64);
  });

  it('evicts the LEAST RECENTLY USED, not an arbitrary one', () => {
    // A player mid-session must not be evicted by traffic from someone else, so touching a session
    // has to move it to the young end of the queue.
    for (let i = 0; i < 64; i += 1) getOrCreateAgentRuntime(`s${i}`);
    getOrCreateAgentRuntime('s0');       // touch the oldest
    getOrCreateAgentRuntime('newcomer'); // and force one eviction

    expect(liveAgentSessionCount()).toBe(64);
    expect(isAgentRuntimeStarted('s0'), 'the touched session was evicted').toBe(true);
  });

  it('disposeAgentRuntime() with no argument clears everything', () => {
    getOrCreateAgentRuntime('a');
    getOrCreateAgentRuntime('b');
    disposeAgentRuntime();
    expect(liveAgentSessionCount()).toBe(0);
  });
});
