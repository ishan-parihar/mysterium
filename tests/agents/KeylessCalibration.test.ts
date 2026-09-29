/**
 * Keyless calibration — the no-LLM deployment mode's ONBOARDING half.
 *
 * D-1 made encounter narrative corpus-backed, so a deploy with no API key plays. Onboarding was
 * the gap: `CalibrationAgent.generateProbe` had two outcomes — call the provider, or throw
 * `'LLM not configured server-side'` — and `/api/agent/probe` surfaces that as an `{ error }` frame
 * at HTTP 200, which `onboarding/+page.svelte` reads as "no LLM, go to /setup". A keyless deploy
 * could not onboard, i.e. could not reach the game at all.
 *
 * The corpus is the fix, and these are the three properties it has to hold. Each one was a real
 * bug, found by writing the assertion and watching the code fail it:
 *   1. SEQUENTIAL. Selection must advance. Keying it on `Loom.render().events.length` looks
 *      reasonable and is always 0 during onboarding — `observeGameEvent` is only driven by play —
 *      so the same probe was served six times running.
 *   2. RAMPED. `signalWeight` drives `nextCalibrationConfidence`; a flat weight would close
 *      calibration on a fixed probe count regardless of how the player answered.
 *   3. CONTRACT-VALID. The corpus output goes through `assertAgenticProbe`, the same validator the
 *      LLM path uses, so a drifted corpus probe fails here rather than rendering malformed.
 *
 * Mutations proven red: freeze the selector (1,2 fail), flatten the ramp (2 fails), delete the
 * corpus branch (1,2 fail).
 */
import { describe, it, expect } from 'vitest';
import {
  checkRequestRateLimit,
  createRateLimiter,
  type MeteredRequest,
} from '../../src/lib/server/rateLimit.js';
import { CalibrationAgent } from '../../src/core/agent/CalibrationAgent.js';
import { Loom } from '../../src/core/agent/Loom.js';
import { DirectorAgent, CALIBRATION_THRESHOLD } from '../../src/core/agent/DirectorAgent.js';
import { assertAgenticProbe } from '../../src/core/agent/validateAgenticProbe.js';
import { CALIBRATION_CORPUS } from '../../src/core/fallback/CalibrationCorpus.js';

it('KEYLESS: 6 consecutive probes are DISTINCT (this is the frozen-selection test)', async () => {
  const agent = new CalibrationAgent({});
  const loom = new Loom();
  const ids: string[] = [];
  for (let i = 0; i < 6; i++) {
    const p = await agent.generateProbe(loom, i / 20, i);
    expect(() => assertAgenticProbe(p)).not.toThrow();
    ids.push(p.id);
  }
  console.log('DISTINCT 6:', ids.join(','), '->', new Set(ids).size, 'unique');
  expect(new Set(ids).size).toBe(6);
}, 60000);

it('KEYLESS: the served sequence is the authored order, under the REAL confidence trajectory', async () => {
  // The previous version of this test looped `generateCalibrationProbe` without ever driving
  // `observeProbeResponse`, so confidence stayed 0 for the whole run. Production POSTs
  // `probe-response` after every answer (`onboarding/+page.svelte:187`), which is what pushes
  // confidence up — and a test that never crosses 0.5 cannot see a defect that only fires above
  // 0.5. That is how a selection discontinuity shipped inside a green test.
  const d = new DirectorAgent();
  const served: string[] = [];
  for (let i = 0; i < 6; i++) {
    const p = await d.generateCalibrationProbe();
    served.push(p.id);
    await d.observeProbeResponse({
      probeId: p.id,
      selectedPolarity: 'action',
      selectedIndex: 0,
      freeInput: '',
    });
  }
  console.log('SERVED UNDER REAL CONFIDENCE:', served.join(', '));
  // Authored order, no jump. A set-membership check would pass on cal-01..04 + cal-11; asserting
  // the SEQUENCE is what catches it.
  expect(served).toEqual(['cal-01', 'cal-02', 'cal-03', 'cal-04', 'cal-05', 'cal-06']);
}, 60000);

  it('KEYLESS: probes are distinct, valid, and the ramp reaches the cap', async () => {
    const d = new DirectorAgent();
    const ids: string[] = [];
    let confidence = 0;
    for (let i = 0; i < 6; i++) {
      const p = await d.generateCalibrationProbe();
      expect(() => assertAgenticProbe(p)).not.toThrow();
      ids.push(p.id);
      // NO `setLatestProbeSignalWeight` HERE, deliberately. The Director stages the weight from the
      // probe it built, so a caller cannot forget; this test is what proves that, because it is
      // the shape of every caller other than the one that used to carry the convention.
      confidence = await d.observeProbeResponse({
        probeId: p.id,
        selectedPolarity: 'action',
        selectedIndex: 0,
        freeInput: '',
      });
    }
  console.log('DISTINCT 6:', ids.join(','), '->', new Set(ids).size, 'unique, confidence', confidence);
  expect(new Set(ids).size).toBe(6);
  // The ramp's job is to make calibration REACH a conclusion inside the client's six-probe cap
  // (`onboarding/+page.svelte:78`, MAX_PROBES = 6). Below the threshold, a keyless player is
  // walked to the cap and every line is seeded Red — the exact outcome the corpus exists to
  // avoid. Asserting the confidence rather than the private flag keeps this a public contract.
  expect(confidence).toBeGreaterThanOrEqual(CALIBRATION_THRESHOLD);
}, 60000);

it('the signal ramp is real, not flat', () => {
  const w = CALIBRATION_CORPUS.map((c) => c.metadata.signalWeight);
  console.log('RAMP:', w.join(','));
  expect(new Set(w).size).toBeGreaterThan(1);
  expect(w[w.length - 1]).toBe(1);
}, 30000);

/**
 * The agent tier is split by COST, not by route. `/api/agent/probe` spends a provider call at
 * `max_tokens: 2048`, issued directly against the provider rather than through `/api/llm/chat`, so
 * the 100/day `llm` tier never sees it — it was metered at the `agent` tier's 120/min, which is
 * sized for the bookkeeping sibling. `observe` carries no LLM call and keeps the roomy budget.
 */
describe('agent tier metering', () => {
  const req = (p: string): MeteredRequest => ({
    url: { pathname: p },
    request: { headers: { get: () => '2.2.2.2' } },
  });

  it('probe and observe resolve to different tiers', () => {
    expect(checkRequestRateLimit(req('/api/agent/probe'), 0, createRateLimiter())?.policy.name).toBe(
      'agent-probe',
    );
    expect(checkRequestRateLimit(req('/api/agent/observe'), 0, createRateLimiter())?.policy.name).toBe(
      'agent',
    );
  });

  it('the probe budget actually refuses, on the 11th probe of an hour', () => {
    const limiter = createRateLimiter();
    const verdicts: boolean[] = [];
    for (let i = 0; i < 11; i++) {
      verdicts.push(checkRequestRateLimit(req('/api/agent/probe'), 0, limiter)?.decision.allowed ?? true);
    }
    // The FIRST must be allowed, or a limiter wired to the wrong rule is broken the other way.
    expect(verdicts[0]).toBe(true);
    expect(verdicts[9]).toBe(true);
    expect(verdicts[10]).toBe(false);
  });
});
