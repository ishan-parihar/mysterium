/**
 * Phase 15 d4 — the calibration pass.
 *
 * The pass's contract is what these lock: every output is stamped provisional, every threshold is
 * IMPORTED from the module that owns it (so a threshold change reaches the report instead of leaving
 * it confidently comparing against a stale number), a measurement with insufficient data says so
 * rather than reading as a pass, and an observable with no producer is carried with its reason
 * instead of omitted.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { buildCalibrationReport, CALIBRATION_PROVENANCE, calibrateCohort } from '../../src/core/simulation/calibration.js';
import { ENTROPY_FLOOR, MIN_COMPOSITIONS } from '../../src/core/personalization/diversityMonitor.js';
import { EXPANSION_RATIO_FLOOR } from '../../src/core/personalization/dialecticEngine.js';
import { UNAVAILABLE_OBSERVABLES } from '../../src/core/simulation/campaignSeries.js';

let root: string;

beforeEach(() => { root = fs.mkdtempSync(path.join(os.tmpdir(), 'mysterium-calib-')); });
afterEach(() => { try { fs.rmSync(root, { recursive: true, force: true }); } catch { /* best-effort */ } });

async function smallCohort() {
  return calibrateCohort({ rootDir: root, generated: 2, seed: 3, sessions: 1, encountersPerSession: 2 });
}

describe('calibration report — provenance and thresholds', () => {
  it('stamps every report provisional and never claims to certify', async () => {
    const { report } = await smallCohort();
    expect(report.provenance).toBe(CALIBRATION_PROVENANCE);
    expect(report.provenance).toBe('provisional-simulated-cohort');
    // The report says out loud what it is; a number without this is a number a reader will trust.
    expect(report.note).toMatch(/SIMULATED/);
    expect(report.note).toMatch(/never certify/);
  });

  it('keeps missing and unrecognised candidate stamps separate in the aggregate report', async () => {
    const { report } = await smallCohort();
    const statuses = Object.keys(report.candidateStamps);
    expect(statuses.every((key) => ['present', 'missing', 'unrecognised'].includes(key))).toBe(true);
    expect(statuses).not.toContain('unknown');
    expect(Object.values(report.candidateStamps).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
  });

  it('imports each threshold from its owning module rather than restating it', async () => {
    const { report } = await smallCohort();
    // If these were literals in the calibration module, an engine threshold change would leave the
    // report comparing against a number nothing uses.
    expect(report.composition.floor).toBe(ENTROPY_FLOOR);
    expect(report.composition.noiseMinimum).toBe(MIN_COMPOSITIONS);
    expect(report.expansion.floor).toBe(EXPANSION_RATIO_FLOOR);
  });
});

describe('calibration report — insufficient data is not a pass', () => {
  it('reports insufficient-data for a cohort too small to measure, rather than above-floor', async () => {
    const { report } = await smallCohort();
    // Two campaigns x one session cannot reach the composition noise minimum. An `above-floor`
    // verdict here would be a measurement of nothing, and that is the failure mode this asserts
    // against — `MIN_COMPOSITIONS` exists precisely so a thin sample is not read as signal.
    if (report.composition.cellsMeasurable === 0) {
      expect(report.composition.verdict).toBe('insufficient-data');
      expect(report.composition.minEntropy).toBeNull();
    }
    expect(['insufficient-data', 'above-floor', 'collapse-observed']).toContain(report.composition.verdict);
  });

  it('the expansion verdict is a comparison against the floor, not a bare number', async () => {
    const { report } = await smallCohort();
    if (report.scale.encounters === 0) {
      expect(report.expansion.verdict).toBe('insufficient-data');
    } else {
      expect(report.expansion.verdict).toBe(
        report.expansion.unfamiliarShare >= EXPANSION_RATIO_FLOOR ? 'above-floor' : 'below-floor',
      );
    }
  });
});

describe('calibration report — absence is carried with a reason', () => {
  it('names the unmeasurable observables and their reasons on the report', async () => {
    const { report } = await smallCohort();
    expect(report.unmeasurable).toBe(UNAVAILABLE_OBSERVABLES);
    // Every entry must explain itself: a reason is the work ticket, and a reader who cannot tell
    // WHY an observable is absent has no way to tell a deliberate classification from a gap.
    for (const reason of Object.values(report.unmeasurable)) {
      expect(reason.length).toBeGreaterThan(20);
    }
  });

  it('reports the MemoryPage as MEASURED, not as an unavailable observable', async () => {
    const { report } = await smallCohort();
    // d1's producer is `buildEnvelope` → `memoryPageBlock`. Not every encounter runs that seam —
    // `runFallback`'s self-reflection (write-in) branch never calls `personalizationContext()` — so
    // `null` is a real outcome and this cohort merely does not hit it. What the test asserts is the
    // discrimination: a cohort that DID produce readings reports the denominator honestly rather than
    // the hard-coded `unmeasurable` status this field used to carry.
    expect(report.memoryPage).not.toBeNull();
    expect(report.memoryPage!.sessions).toBeGreaterThan(0);
    expect(report.memoryPage!.encounters).toBeGreaterThan(0);
    expect(report.unmeasurable).not.toHaveProperty('memoryPageSize');
    expect(Object.keys(report.unmeasurable)).toContain('renderBudget');
  });
});

describe('calibration report — the per-line distribution', () => {
  it('reports every canonical line, including the ones with no encounters', async () => {
    const { report } = await smallCohort();
    // A line absent from the report would be indistinguishable from a line that was never offered;
    // the distribution is the evidence for which lines the scheduler actually reaches.
    for (const line of ['Cognitive', 'Emotional', 'Moral', 'Intrapersonal', 'Spiritual', 'Somatic', 'Willpower', 'Interpersonal']) {
      expect(report.perLine[line]).toBeDefined();
    }
    const total = Object.values(report.perLine).reduce((n, v) => n + v.encounters, 0);
    // Per-line encounter counts are a partition of the cohort's encounters: a total ABOVE the cohort
    // size would mean the same encounter was counted twice. (Training beats legitimately fall
    // outside the line partition, so the check is one-sided.)
    expect(total).toBeLessThanOrEqual(report.scale.encounters);
  });
});

describe('calibration report — it reads results without re-running anything', () => {
  it('builds from supplied results, and the report is a pure function of them', async () => {
    const { results } = await smallCohort();
    const a = buildCalibrationReport(results);
    const b = buildCalibrationReport(results);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(a.scale.sessions).toBe(results.reduce((n, r) => n + r.sessions.length, 0));
  });
});
