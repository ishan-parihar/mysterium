/**
 * Phase 13 d1/d2 surface tests — the UDV bands at the LIVE seam and the council role scoping.
 *
 * Locks (`docs/audits/WIRING-CONTRAST-AUDIT-2026-09-23.md` §5, gates G32/G33):
 *  - d1: every band reaches the live UDV from a real source; declared outranks observed;
 *        an empty input degrades to the ratified defaults; the analogy band is DERIVED at the seam;
 *        a band swap DISCRIMINATES (the differential test — the phase's success criterion).
 *  - d2: the live envelope produces all five role scopes; the assessment role is blind to the
 *        affective bands; a violating scope renders as nothing (fail-closed).
 */
import { describe, it, expect } from 'vitest';
import { createSignificator } from '../../src/core/domain/Significator.js';
import type { Line } from '../../src/core/domain/Line.js';
import { ALL_LINES } from '../../src/core/domain/Line.js';
import type { Stage } from '../../src/core/domain/Stage.js';
import { createOrchestrationServices, buildEnvelope, scopeContractViolations, assessmentScopeLine } from '../../src/core/personalization/sessionRuntime.js';
import {
  purposesFromVows, purposesFromGoals, analogyFromInterests, preferenceFromHistory,
  observedFromEngagement, sessionDurationsFromFeed, DEFAULT_PREFERENCE,
} from '../../src/core/personalization/bandSources.js';
import type { UdvBandSources } from '../../src/core/personalization/bandSources.js';

const sig = () => {
  const altitudes = Object.fromEntries(ALL_LINES.map((l) => [l, 'Amber' as Stage])) as Record<Line, Stage>;
  return createSignificator('phase13-probe', altitudes, 'Amber');
};

const TARGET = { line: 'Cognitive' as unknown as Line, stage: 'Amber' as Stage, modality: 'ScenarioChoice' as never };

function envelope(bands?: UdvBandSources, extra?: { declaredInterests?: string[]; aversions?: string[] }) {
  const services = createOrchestrationServices();
  return buildEnvelope(
    services,
    sig(),
    { usable: ['pronouns'], declaredInterests: extra?.declaredInterests ?? [], aversions: extra?.aversions ?? [], bands },
    TARGET,
    'a practice step toward steadiness',
    [],
    1000,
    null,
  );
}

describe('Phase 13 d1 — UDV band sources', () => {
  it('purposes: only ACTIVE vows state an aim; kinds map to the purpose taxonomy', () => {
    const ps = purposesFromVows([
      { text: 'sit each morning', kind: 'practice', status: 'active' },
      { text: 'done', kind: 'learning', status: 'fulfilled' },
      { text: 'abandoned', kind: 'service', status: 'lapsed' },
      { text: 're-negotiated', kind: 'exposure', status: 'renegotiated' },
      { text: '   ', kind: 'practice', status: 'active' },
    ]);
    expect(ps).toEqual([{ kind: 'practice-vow', statement: 'sit each morning' }]);
  });

  it('purposes: profile goals join the vow aims once, deduplicated by statement', () => {
    const vows = purposesFromVows([{ text: 'learn to sail', kind: 'learning', status: 'active' }]);
    const merged = purposesFromGoals(['learn to sail', 'write a book'], vows);
    expect(merged).toEqual([{ kind: 'learning-quest', statement: 'write a book' }]);
  });

  it('analogy: fluent domains come from the interest graph; aversions stay the veto list', () => {
    const band = analogyFromInterests(
      [
        { topic: 'music', weight: 0.9, depth: 'fluent', source: 'declared' },
        { topic: 'gardens', weight: 0.5, depth: 'working', source: 'declared' },
      ],
      ['violence'],
    );
    expect(band.fluentDomains.map((d) => d.domain)).toEqual(['music', 'gardens']);
    expect(band.landings).toEqual(['music', 'gardens']);
    expect(band.repels).toEqual(['violence']);
  });

  it('preference: median (not mean) tolerance, normalized mix, declared intensity and taste', () => {
    const pref = preferenceFromHistory({
      profile: { metaphorPreference: 'botanical', intensity: 'intense' },
      sessions: [
        { modality: 'ScenarioChoice' as never, durationMs: 40 * 60_000 },
        { modality: 'ScenarioChoice' as never, durationMs: 20 * 60_000 },
        { modality: 'Deterministic' as never, durationMs: 10 * 60_000 },
      ],
    });
    expect(pref.sessionToleranceMin).toBe(20); // median of 10/20/40 — the 10-min outlier does not lead
    expect(pref.difficultyAppetite).toBe('steep');
    expect(pref.aestheticLeanings).toEqual(['botanical']);
    expect(pref.modalityMix['ScenarioChoice' as never]).toBe(1);
    expect(pref.modalityMix['Deterministic' as never]).toBeCloseTo(0.5);
  });

  it('preference: an empty profile and no history degrade to the ratified default', () => {
    expect(preferenceFromHistory({})).toEqual(DEFAULT_PREFERENCE);
  });

  it('observed: rows are tagged observed and depth follows the weight ladder', () => {
    const rows = observedFromEngagement([{ topic: 'music', weight: 0.8 }, { topic: 'paths', weight: 0.45 }, { topic: 'mist', weight: 0.1 }, { topic: ' ' }]);
    expect(rows.map((r) => [r.topic, r.depth])).toEqual([['music', 'fluent'], ['paths', 'working'], ['mist', 'surface']]);
    expect(rows.every((r) => r.source === 'observed')).toBe(true);
  });

  it('sessionDurationsFromFeed: reads the feed refs and skips malformed ones', () => {
    const rows = sessionDurationsFromFeed([
      { ref: { startedAtMs: 0, endedAtMs: 60_000 } },
      { ref: { startedAtMs: 5, endedAtMs: 5 } },
      { ref: {} },
      { ref: null },
    ]);
    expect(rows).toEqual([{ durationMs: 60_000 }]);
  });

  it('the live envelope carries every band into the UDV', () => {
    const env = envelope({
      purposes: [{ kind: 'practice-vow', statement: 'sit each morning' }],
      analogy: analogyFromInterests([{ topic: 'music', weight: 0.9, depth: 'fluent', source: 'declared' }], ['violence']),
      preference: { difficultyAppetite: 'gentle', aestheticLeanings: ['botanical'] },
      constraints: { accessibility: ['dyslexia-friendly'], timeBudgetMin: 20 },
      observedInterests: observedFromEngagement([{ topic: 'gardens', weight: 0.5 }]),
    });
    const udv = env.context!.udv;
    expect(udv.purpose).toHaveLength(1);
    expect(udv.analogy.fluentDomains[0]!.domain).toBe('music');
    expect(udv.preference.difficultyAppetite).toBe('gentle');
    expect(udv.preference.aestheticLeanings).toEqual(['botanical']);
    expect(udv.constraints.accessibility).toEqual(['dyslexia-friendly']);
    expect(udv.interests.some((i) => i.topic === 'gardens' && i.source === 'observed')).toBe(true);
  });

  it('the analogy band is DERIVED at the seam when the caller supplies none (45 §5.4 live)', () => {
    const env = envelope(undefined, { declaredInterests: ['music'], aversions: ['violence'] });
    const udv = env.context!.udv;
    expect(udv.analogy.fluentDomains.map((d) => d.domain)).toEqual(['music']);
    expect(udv.analogy.repels).toEqual(['violence']);
  });

  it('declared outranks observed for the same topic (47 §3 field of record)', () => {
    const env = envelope(
      { observedInterests: observedFromEngagement([{ topic: 'music', weight: 0.95 }]) },
      { declaredInterests: ['music'] },
    );
    const music = env.context!.udv.interests.filter((i) => i.topic === 'music');
    expect(music).toHaveLength(1);
    expect(music[0]!.source).toBe('declared');
  });

  it('no identity at all still yields a valid, defaulted UDV (degradation law)', () => {
    const env = envelope(undefined);
    const udv = env.context!.udv;
    expect(udv.preference.sessionToleranceMin).toBe(DEFAULT_PREFERENCE.sessionToleranceMin);
    expect(udv.analogy.fluentDomains).toHaveLength(0);
    expect(udv.purpose).toHaveLength(0);
    expect(udv.constraints.accessibility).toHaveLength(0);
  });

  it('DIFFERENTIAL GAP LOCK: the bands reach the UDV but the pool is CELL-DETERMINISTIC', () => {
    // The phase's success criterion is that swapping a band changes what pools. It does NOT yet,
    // and the reason is structural, not a wiring defect: the candidate library holds exactly five
    // renderings per cell (one per tier — world / scenario / scenario-authored / world-authored /
    // npc-authored), so a cell-targeted pool returns the same five refs for every player and the
    // UDV's ranking inputs have nothing to order. Recorded as W11 in
    // `docs/audits/WIRING-CONTRAST-AUDIT-2026-09-23.md`; the fix is candidate MULTIPLICITY per cell
    // (Phase 13 d10). This test locks today's truth so the change that closes it is visible.
    const services = createOrchestrationServices();
    const run = (bands: UdvBandSources | undefined) => {
      const e = buildEnvelope(
        services, sig(),
        { usable: [], declaredInterests: [], bands },
        TARGET, 'a practice step toward steadiness', [], 1000, null,
      );
      return JSON.stringify(e.context?.pooled);
    };
    const plain = run(undefined);
    const withPurpose = run({ purposes: [{ kind: 'learning-quest', statement: 'music' }] });
    const withAnalogy = run({ analogy: analogyFromInterests([{ topic: 'music', weight: 1, depth: 'fluent', source: 'declared' }]) });
    expect(withPurpose).toBe(plain);
    expect(withAnalogy).toBe(plain);

    // ...and the cause, asserted directly: five candidates per cell, one per tier.
    const byPrefix = new Map<string, number>();
    for (const c of services.library) byPrefix.set(c.id.split(':')[0]!, (byPrefix.get(c.id.split(':')[0]!) ?? 0) + 1);
    expect(services.library.length).toBe(2240);
    expect([...byPrefix.entries()].every(([, n]) => n === 448)).toBe(true);
  });
});

describe('Phase 13 d2 — council role scoping at the live seam', () => {
  const env = envelope({ purposes: [{ kind: 'practice-vow', statement: 'sit each morning' }] }, { declaredInterests: ['music'], aversions: ['violence'] });

  it('the live envelope produces all five role scopes, each lawful', () => {
    const roles = ['scenario-catalyst', 'narrative-voice', 'assessment', 'curriculum-teacher', 'safety'] as const;
    for (const role of roles) {
      const scope = env.scopes[role];
      expect(scope.role).toBe(role);
      expect(scopeContractViolations(scope)).toEqual([]);
    }
  });

  it('45 §6.1 blindness holds as ABSENCE: assessment sees no interests, purpose or analogy', () => {
    const a = env.scopes.assessment;
    expect(a.interests).toBeUndefined();
    expect(a.purpose).toBeUndefined();
    expect(a.analogy).toBeUndefined();
    expect(a.aversions).toBeUndefined();
    expect(a.developmental).toBeDefined();
    expect(a.catalystTarget.stage).toBe('Amber');
  });

  it('safety sees the veto list only — never the interest graph or the analogy band', () => {
    const s = env.scopes.safety;
    expect(s.aversions).toEqual(['violence']);
    expect(s.interests).toBeUndefined();
    expect(s.analogy).toBeUndefined();
  });

  it('the candidate renders the whole band set; the narrative voice gets no developmental numbers', () => {
    expect(env.scopes['scenario-catalyst'].interests).toBeDefined();
    expect(env.scopes['scenario-catalyst'].analogy).toBeDefined();
    expect(env.scopes['narrative-voice'].developmental).toBeUndefined();
  });

  it('the assessment-facing line carries the cell + encounter purpose, never player content', () => {
    const line = assessmentScopeLine(env.scopes.assessment)!;
    expect(line).toContain('[ASSESSMENT SCOPE]');
    expect(line).toContain('a practice step toward steadiness');
    for (const banned of ['music', 'violence', 'sit each morning']) expect(line).not.toContain(banned);
  });

  it('a non-assessment scope is refused the assessment line (fail-closed)', () => {
    expect(assessmentScopeLine(env.scopes.safety)).toBeNull();
    expect(assessmentScopeLine(env.scopes['scenario-catalyst'])).toBeNull();
  });

  it('INJECTION: a hand-assembled scope carrying an undeclared band renders as NOTHING', () => {
    const injected = {
      ...env.scopes.assessment,
      analogy: { fluentDomains: [{ domain: 'music', weight: 1 }], landings: [], repels: [] },
    } as never;
    expect(scopeContractViolations(injected)).toContain('analogy');
    expect(assessmentScopeLine(injected)).toBeNull();
  });
});
