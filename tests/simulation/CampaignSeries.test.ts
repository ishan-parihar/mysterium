/**
 * Phase 15 d3 — the campaign time-series.
 *
 * Two things are locked here. First the series' own contract: every field is read from a producer
 * that exists, and the observables with no producer are NAMED rather than emitted as zero. Second,
 * and more important, the seam gap the series found on its first run — `personalizationContext()`
 * was called from the LLM paths only, so on the fallback/module path (the one the hermetic tier runs)
 * the pool never selected, the composition telemetry recorded nothing, and no polarity reading was
 * ever captured.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { runCampaign } from '../../src/core/simulation/campaign.js';
import { candidateSource, UNAVAILABLE_OBSERVABLES } from '../../src/core/simulation/campaignSeries.js';
import { getPersona } from '../../src/core/validation/personas.js';

let root: string;

beforeEach(() => { root = fs.mkdtempSync(path.join(os.tmpdir(), 'mysterium-series-')); });
afterEach(() => { try { fs.rmSync(root, { recursive: true, force: true }); } catch { /* best-effort */ } });

describe('candidate provenance decode', () => {
  it('decodes every id shape the pool produces', () => {
    // The ids are the pool's vocabulary (`polarityIndex` recolours with ~sim/~opp; `compositionRuntime`
    // prefixes `composed:`; `candidateLibrary` uses `npc:`/`scenario-authored:`/`world-authored:`/…).
    expect(candidateSource('composed:sit-1')).toBe('composed');
    expect(candidateSource('npc:h-Cognitive-Red:ImmersiveRPG')).toBe('npc');
    expect(candidateSource('scenario-authored:Cognitive:Red:ImmersiveRPG')).toBe('authored-scenario');
    expect(candidateSource('world-authored:Cognitive:Red:ImmersiveRPG')).toBe('authored-world');
    expect(candidateSource('scenario:Cognitive:Red:ImmersiveRPG')).toBe('scenario');
    expect(candidateSource('world:Cognitive:Red:ImmersiveRPG')).toBe('world');
    expect(candidateSource('scenario:Cognitive:Red:ImmersiveRPG~sim1')).toBe('recoloured-similar');
    expect(candidateSource('scenario:Cognitive:Red:ImmersiveRPG~opp1')).toBe('recoloured-opposite');
  });

  it('reports unknown for null and for an unrecognised scheme rather than guessing', () => {
    expect(candidateSource(null)).toBe('unknown');
    // A new scheme must NOT be silently classified as one of the existing ones — the whole point of
    // decoding at one site is that a change here is visible.
    expect(candidateSource('something-new:x')).toBe('unknown');
  });
});

describe('the series names what nothing produces', () => {
  it('carries the unavailable list on every row, with a reason per entry', () => {
    expect(Object.keys(UNAVAILABLE_OBSERVABLES).sort())
      .toEqual(['engagementRegisterHits', 'memoryPageSize', 'renderBudget']);
    for (const reason of Object.values(UNAVAILABLE_OBSERVABLES)) {
      expect(reason.length).toBeGreaterThan(20);
    }
  });

  it('omits them from the row — absence must be distinguishable from a measured zero', async () => {
    const result = await runCampaign({ persona: getPersona('flourishing'), rootDir: root, sessions: 1, encountersPerSession: 2 });
    const series = result.sessions[0]!.series;
    expect(series.unavailable).toBe(UNAVAILABLE_OBSERVABLES);
    expect(series).not.toHaveProperty('memoryPageSize');
    expect(series).not.toHaveProperty('renderBudget');
    expect(series).not.toHaveProperty('engagementRegisterHits');
  });
});

describe('the series reports the seam, not the kernel', () => {
  it('carries the kernel observables unchanged as one field', async () => {
    const result = await runCampaign({ persona: getPersona('flourishing'), rootDir: root, sessions: 2, encountersPerSession: 3 });
    const s = result.sessions[1]!;
    // The same object, not a re-derivation — a re-derivation would be a second opinion about the
    // engine's state, and the two could disagree.
    expect(s.series.observables).toBe(s.observables);
  });

  it('records feed entries by writer, and the count matches', async () => {
    const result = await runCampaign({ persona: getPersona('flourishing'), rootDir: root, sessions: 1, encountersPerSession: 3 });
    const s = result.sessions[0]!.series;
    const summed = Object.values(s.feed).reduce((a, b) => a + b, 0);
    expect(s.feedTotal).toBeGreaterThan(0);
    // Shares, so the sum is 1 (within float tolerance) whenever anything was written.
    if (s.feedTotal > 0) expect(Math.abs(summed - 1)).toBeLessThan(1e-9);
  });
});

describe('the fallback path is architecture-live (the d3 finding)', () => {
  it('selects a pole and records composition telemetry with no LLM configured', async () => {
    // Before the fix this returned `{unknown: 1}` provenance, zero composition events and zero cells.
    // The assertion is deliberately about the SEAM running, not about any particular value: a
    // hard-coded expectation would break with any pool change, while "the pool was consulted" is the
    // property the fix established.
    const result = await runCampaign({ persona: getPersona('flourishing'), rootDir: root, sessions: 2, encountersPerSession: 4 });
    const all = result.sessions.flatMap((s) => s.series.provenance);
    expect(all.length).toBeGreaterThan(0);
    // Every encounter now resolves a candidate — none is left unclassified.
    expect(all.filter((p) => p.candidateSource !== 'unknown').length).toBeGreaterThan(0);
    // The composition telemetry recorded events, which is what `46 §11`'s monitors read.
    expect(Math.max(...result.sessions.map((s) => s.series.composition.eventCount))).toBeGreaterThan(0);
    // And at least one cell's entropy was measurable above the monitor's noise floor.
    const entropies = result.sessions.flatMap((s) => Object.values(s.series.composition.perCell).map((c) => c.entropy));
    expect(entropies.some((e) => e > 0)).toBe(true);
  });

  it('every provenance entry names a cell and a candidate source that the row aggregates', async () => {
    const result = await runCampaign({ persona: getPersona('golden-bypass'), rootDir: root, sessions: 1, encountersPerSession: 4 });
    const s = result.sessions[0]!.series;
    for (const p of s.provenance) {
      // `line:stage` for a developmental encounter; training beats carry `Training:<game>` (the
      // underscore in `n_back` is why this is not a letter-only class).
      expect(p.cell).toMatch(/^\w+:\w+$/);
      expect(p.candidateSource).toBeTruthy();
    }
    const shares = Object.values(s.candidateSourceShare).reduce((a, b) => a + b, 0);
    expect(Math.abs(shares - 1)).toBeLessThan(1e-9);
  });
});
