/**
 * Authored-content tests — the seeding tier for the world/NPC/scenario + personalization
 * architecture (46 §2, 45 §5 §2, 47 §7) and the stage-coherence gate (46 §11 facet incoherence,
 * 44 altitude separation). Locks:
 *  - seed coverage: exactly one authored seed per cell, 64/64, no duplicates;
 *  - every seed's tags resolve in the tag store (46 §11 invariant 4 at the content layer);
 *  - every seed carries corpus provenance and stage-coherent prose (structural checks);
 *  - the coherence validator: same-cell passes, load-bearing off-stage fails, texture beyond
 *    ±1 adjacency fails, cross-line mixing fails;
 *  - the authored library registration: 64 authored scenarios × 7 modalities present in the
 *    candidate library, poolable against their cell;
 *  - probe content: 47 §7 shape, distinct resolvable poles, log-only until RV-passed.
 */
import { describe, it, expect } from 'vitest';
import { SCENARIO_SEEDS } from '../../src/core/personalization/scenarioSeeds.js';
import { AUTHORED_PROBES } from '../../src/core/personalization/probeContent.js';
import { checkCoherence, auditSeedLibrary } from '../../src/core/personalization/stageCoherence.js';
import { seedCandidateLibrary, seedScenarioCandidates } from '../../src/core/personalization/candidateLibrary.js';
import { createProbeLedger, recordProbePlay, instrumentIsRVValidated, canOfferProbe } from '../../src/core/personalization/probeSet.js';
import { INITIAL_TAGS } from '../../src/core/world/tags/initialTags.js';
import { createFacetStore } from '../../src/core/world/facets/FacetStore.js';
import { pool } from '../../src/core/personalization/pooling.js';
import { createTagStore } from '../../src/core/world/tags/dialectic.js';
import { projectUdv } from '../../src/core/personalization/udv.js';
import { ALL_LINES } from '../../src/core/domain/Line.js';
import type { Line } from '../../src/core/domain/Line.js';
import type { Stage } from '../../src/core/domain/Stage.js';
import { ALL_STAGES } from '../../src/core/domain/Stage.js';
import { ALL_MODALITIES } from '../../src/core/domain/enums.js';

const TAG_IDS = new Set(INITIAL_TAGS.map((t) => t.id));

describe('scenario seed coverage and hygiene', () => {
  it('has exactly one authored seed per cell — 64/64, no duplicates', () => {
    expect(SCENARIO_SEEDS.length).toBe(64);
    const seen = new Set<string>();
    for (const s of SCENARIO_SEEDS) {
      const key = `${s.line}:${s.stage}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
    expect(seen.size).toBe(64);
    for (const line of ALL_LINES) {
      for (const stage of ALL_STAGES) {
        expect(seen.has(`${line}:${stage}`)).toBe(true);
      }
    }
  });

  it('every seed\'s tags resolve in the tag store (46 §11 invariant 4 at the content layer)', () => {
    for (const s of SCENARIO_SEEDS) {
      expect(s.tags.length).toBeGreaterThan(0);
      for (const t of s.tags) expect(TAG_IDS.has(t)).toBe(true);
    }
  });

  it('every seed carries provenance and substantive prose', () => {
    for (const s of SCENARIO_SEEDS) {
      expect(s.groundedIn).toContain('module-spec');
      expect(s.situation.length).toBeGreaterThan(80);
      expect(s.cast.length).toBeGreaterThan(0);
      expect(s.stakes.length).toBeGreaterThan(20);
      expect(s.id).toBe(`scenario:${s.line}:${s.stage}:authored`);
    }
  });

  it('the library audit passes (self-coherence + no duplicates)', () => {
    const audit = auditSeedLibrary(SCENARIO_SEEDS);
    expect(audit.ok).toBe(true);
    expect(audit.problems).toEqual([]);
  });
});

describe('the stage-coherence validator', () => {
  const target = { line: 'Moral' as Line, stage: 'Amber' as Stage };

  it('passes a fully coherent combination', () => {
    const v = checkCoherence(
      [
        { source: 'seed', line: 'Moral', stage: 'Amber', loadBearing: true },
        { source: 'npc', line: 'Moral', stage: 'Amber', loadBearing: true },
        { source: 'texture:voice', line: 'Moral', stage: 'Red', loadBearing: false }, // adjacent texture
      ],
      target,
    );
    expect(v.coherent).toBe(true);
    expect(v.defects).toEqual([]);
  });

  it('fails a load-bearing component at the wrong stage (the Amber-voice-on-Green-stake case)', () => {
    const v = checkCoherence(
      [
        { source: 'seed', line: 'Moral', stage: 'Amber', loadBearing: true },
        { source: 'stake', line: 'Moral', stage: 'Green', loadBearing: true },
      ],
      target,
    );
    expect(v.coherent).toBe(false);
    expect(v.defects[0]!.rule).toBe('load-bearing-off-stage');
  });

  it('fails texture beyond ±1 adjacency', () => {
    const v = checkCoherence(
      [{ source: 'weather', line: 'Moral', stage: 'Turquoise', loadBearing: false }],
      target,
    );
    expect(v.coherent).toBe(false);
    expect(v.defects[0]!.rule).toBe('texture-beyond-adjacent');
  });

  it('fails silent cross-line mixing', () => {
    const v = checkCoherence(
      [{ source: 'npc', line: 'Somatic', stage: 'Amber', loadBearing: true }],
      target,
    );
    expect(v.coherent).toBe(false);
    expect(v.defects[0]!.rule).toBe('line-outside-target');
  });
});

describe('authored scenarios in the candidate library', () => {
  it('registers 64 authored seeds × 7 modalities and pools them at their own cell', () => {
    const store = createFacetStore(TAG_IDS);
    const lib = seedCandidateLibrary(store);
    const authored = lib.filter((c) => c.id.startsWith('scenario-authored:'));
    expect(authored.length).toBe(64 * 7);

    // The authored seed is poolable at its own cell for every modality — an interest in one of
    // its tags biases the rank, but the cell match comes from the candidate's own registration.
    for (const modality of ALL_MODALITIES) {
      const hit = authored.find((c) => c.id === `scenario-authored:Moral:Amber:${modality}`);
      expect(hit).toBeDefined();
    }

    // A UDV with an interest in a seed's tag ranks the authored rendering, not just skeleton ones.
    const udv = projectUdv({
      usableFields: new Set<string>(),
      declaredInterests: [{ topic: 'law', weight: 1, depth: 'fluent', source: 'declared' }],
      developmental: { stageOrdinals: {} as Record<Line, number>, activeShadowQuadrants: [] },
      purpose: [],
    });
    const tags = createTagStore(INITIAL_TAGS);
    const result = pool(tags, udv, lib, {
      mode: 'spiral',
      states: {},
      target: { line: 'Moral', stage: 'Amber', modality: 'ScenarioChoice' },
      maxStratum: 0,
      playerDepth: 0,
      resolve: (topic) => (TAG_IDS.has(topic) ? topic : undefined),
      now: Date.now(),
    });
    const topIds = result.ranked.slice(0, 6).map((c) => c.id);
    expect(topIds.some((id) => id.startsWith('scenario-authored:Moral:Amber:'))).toBe(true);
  });

  it('seedScenarioCandidates is deterministic', () => {
    const a = seedScenarioCandidates();
    const b = seedScenarioCandidates();
    expect(a.length).toBe(b.length);
    expect(a.map((c) => c.id).join()).toBe(b.map((c) => c.id).join());
  });
});

describe('authored probe content (47 §7)', () => {
  it('probes are playable situations with distinct resolvable poles', () => {
    expect(AUTHORED_PROBES.length).toBeGreaterThanOrEqual(8);
    for (const p of AUTHORED_PROBES) {
      expect(TAG_IDS.has(p.poleA)).toBe(true);
      expect(TAG_IDS.has(p.poleB)).toBe(true);
      expect(p.poleA).not.toBe(p.poleB);
      expect(p.situation.length).toBeGreaterThan(120); // a scene, not a questionnaire item
      expect(p.rvPassed).toBe(false); // honest state: authored, not yet validated
    }
  });

  it('unvalidated probes record log-only readings; the band is enforced by probeSet', () => {
    const ledger = createProbeLedger(AUTHORED_PROBES);
    const probe = AUTHORED_PROBES[0]!;
    expect(instrumentIsRVValidated(probe)).toBe(false);
    const { band } = recordProbePlay(ledger, probe, probe.poleA, Date.now());
    expect(band).toBe('log-only');
    expect(ledger.validatedReadings.length).toBe(0);
    expect(ledger.logOnlyReadings.length).toBe(1);
  });

  it('the session budget still bounds offering', () => {
    const ledger = createProbeLedger(AUTHORED_PROBES);
    expect(canOfferProbe(ledger)).toBe(true);
    ledger.playedThisSession = 3;
    expect(canOfferProbe(ledger)).toBe(false);
  });
});
