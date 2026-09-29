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
import { DirectorAgent } from '../../src/core/agent/DirectorAgent.js';
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

it('KEYLESS: the Director — the real caller — advances', async () => {
  const d = new DirectorAgent();
  const ids: string[] = [];
  for (let i = 0; i < 6; i++) ids.push((await d.generateCalibrationProbe()).id);
  console.log('DIRECTOR 6:', ids.join(','), '->', new Set(ids).size, 'unique');
  expect(new Set(ids).size).toBe(6);
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
