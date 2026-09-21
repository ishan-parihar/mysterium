/**
 * Runtime-loop completion tests — the authored seeding reaching the live envelope, the runtime
 * coherence gate routing (not canceling), the per-modality variants, and the persistence
 * round-trip. Locks:
 *  - modality angles: total over ALL_MODALITIES, content-free (no cell leakage), contextual seed
 *    assembly binds seed + angle deterministically;
 *  - buildEnvelope carries the authored seed text for the target cell (and null when the cell is
 *    a content gap);
 *  - coherenceGate: same-cell holon passes, off-stage holon is blocked (routing not canceling —
 *    the session proceeds, the voice is withheld), unknown holon degrades to pass;
 *  - recordCoherenceInsight: defects reach the feed as an F4-forecast insight entry; all-clear
 *    records nothing;
 *  - persistence: capture → restore round-trip preserves feed + workers exactly (F3 replay).
 */
import { describe, it, expect } from 'vitest';
import {
  createOrchestrationServices, buildEnvelope, coherenceGate, recordCoherenceInsight,
  captureCheckpoint, restoreCheckpoint, holonDigestBlock, sessionEnd,
} from '../../src/core/personalization/sessionRuntime.js';
import { MODALITY_ANGLES, angleFor, contextualSeed } from '../../src/core/personalization/scenarioSeedVariants.js';
import { SCENARIO_SEEDS } from '../../src/core/personalization/scenarioSeeds.js';
import { ALL_MODALITIES } from '../../src/core/domain/enums.js';
import type { Modality } from '../../src/core/domain/enums.js';
import type { Line } from '../../src/core/domain/Line.js';
import { ALL_LINES } from '../../src/core/domain/Line.js';
import { ALL_STAGES, type Stage } from '../../src/core/domain/Stage.js';
import type { Significator } from '../../src/core/domain/Significator.js';
import { createSignificator } from '../../src/core/domain/Significator.js';
import type { Holon } from '../../src/core/world/Holon.js';
import type { ConsequenceRecord } from '../../src/core/domain/ConsequenceRecord.js';
import type { SessionSignals } from '../../src/core/orchestration/types.js';

const SIG: Significator = createSignificator('sig-c', {
  Cognitive: 'Orange', Emotional: 'Orange', Moral: 'Orange', Intrapersonal: 'Orange',
  Spiritual: 'Orange', Somatic: 'Orange', Willpower: 'Orange', Interpersonal: 'Orange',
} as Record<Line, never>, 'Orange');

const HOLONS: readonly Holon[] = [
  {
    id: 'the-optimist', name: 'The Optimist', kind: 'NPC', line: 'Cognitive', stage: 'Orange',
    drives: { dominant: 'Eros', secondary: 'Agency', shadowQuadrant: 'GoldenAddiction' },
    polarity: 'Radiative', narrativeRole: 'growth-market-mentor', relationships: ['commerce-guild'],
    active: true, significator: { transformations: [] },
  } as unknown as Holon,
  {
    id: 'the-canonist', name: 'The Canonist', kind: 'NPC', line: 'Moral', stage: 'Amber',
    drives: { dominant: 'Agency', secondary: 'Communion', shadowQuadrant: 'DarkAddiction' },
    polarity: 'Absorptive', narrativeRole: 'law-incarnate', relationships: ['guild-of-the-wall'],
    active: true, significator: { transformations: [] },
  } as unknown as Holon,
];

function mkRecord(holonId: string): ConsequenceRecord {
  return {
    encounterId: 'enc-c', timestamp: Date.now(),
    polarityTrace: {
      energeticDirection: 'Radiative',
      driveDirectionality: { Agency: 'HealthyBalanced', Communion: 'HealthyBalanced', Eros: 'HealthyBalanced', Agape: 'HealthyBalanced' },
    } as ConsequenceRecord['polarityTrace'],
    shadowSurfaced: null, shadowResolved: null,
    holonDeltas: [{ holonId, field: 'relationshipStrength', oldValue: 0.5, newValue: 0.56 }],
    altitudeShift: null, driveShift: null,
    narrativeSummary: 'The mentor pushed the player to optimize.',
  };
}

const SIGNALS: SessionSignals = { veilRisk: 0, distressSignal: 0, frustrationSignal: 0, progressDelta: 1, consentEvents: [] };

describe('per-modality angles (46 §2 × 11)', () => {
  it('cover ALL_MODALITIES exactly — total, no extras', () => {
    expect(MODALITY_ANGLES.length).toBe(ALL_MODALITIES.length);
    for (const m of ALL_MODALITIES) expect(() => angleFor(m)).not.toThrow();
    expect(() => angleFor('Nonexistent' as Modality)).toThrow();
  });

  it('angles are content-free — they never name a cell, line, or stage (content is the seed\'s job)', () => {
    const stageNames = ['infrared', 'magenta', 'red', 'amber', 'orange', 'green', 'teal', 'turquoise'];
    for (const a of MODALITY_ANGLES) {
      const text = `${a.angle} ${a.register}`.toLowerCase();
      for (const line of ALL_LINES) expect(text.includes(line.toLowerCase())).toBe(false);
      for (const st of stageNames) expect(text.includes(` ${st} `)).toBe(false);
    }
  });

  it('contextualSeed binds seed + angle deterministically', () => {
    const seed = SCENARIO_SEEDS[0]!;
    const a = contextualSeed(seed, 'Strategic');
    const b = contextualSeed(seed, 'Strategic');
    expect(a).toBe(b);
    expect(a).toContain(seed.situation.slice(0, 40));
    expect(a).toContain('board of forces'); // the Strategic angle's rendering directive
    const c = contextualSeed(seed, 'Embodied');
    expect(c).not.toBe(a);
    expect(c).toContain('the body is inside of');
  });
});

describe('the authored seed in the live envelope', () => {
  it('buildEnvelope returns the authored seed text for the target cell', () => {
    const services = createOrchestrationServices(HOLONS);
    const { seedText } = buildEnvelope(
      services, SIG, undefined,
      { line: 'Cognitive', stage: 'Orange', modality: 'ScenarioChoice' },
      'purpose from the encounter', [], Date.now(),
      'the-optimist',
    );
    expect(seedText).not.toBeNull();
    const seed = SCENARIO_SEEDS.find((s) => s.line === 'Cognitive' && s.stage === 'Orange')!;
    expect(seedText!).toContain(seed.situation.slice(0, 40));
    expect(seedText!).toContain('fork already upon the player'); // ScenarioChoice angle
  });

  it('every (cell × modality) combination resolves a seed text — 64×7 total coverage', () => {
    for (const line of ALL_LINES) {
      for (const stage of ALL_STAGES) {
        for (const modality of ALL_MODALITIES) {
          const text = (() => {
            const services = createOrchestrationServices([]);
            const { seedText } = buildEnvelope(
              services, SIG, undefined, { line, stage, modality }, 'p', [], Date.now(), null,
            );
            return seedText;
          })();
          expect(text, `${line}:${stage}:${modality}`).not.toBeNull();
          expect(text!.length).toBeGreaterThan(100);
        }
      }
    }
  });
});

describe('the runtime coherence gate (routing, not canceling)', () => {
  it('a same-cell holon passes; an off-stage holon is blocked; an unknown holon degrades to pass', () => {
    const services = createOrchestrationServices(HOLONS);
    const target = { line: 'Cognitive' as Line, stage: 'Orange' as Stage, modality: 'ScenarioChoice' as Modality };
    expect(coherenceGate(services, 'the-optimist', target).blocked).toBe(false);

    const offStage = coherenceGate(services, 'the-canonist', target);
    expect(offStage.blocked).toBe(true); // Amber holon against an Orange target
    expect(offStage.defects[0]!.rule).toBe('load-bearing-off-stage');

    expect(coherenceGate(services, 'no-such-holon', target).blocked).toBe(false);
    expect(coherenceGate(services, null, target).blocked).toBe(false);
  });

  it('a blocked holon still had its profile advanced (the world moves; the voice is withheld)', () => {
    const services = createOrchestrationServices(HOLONS);
    // Play a session touching the canonist (Amber)…
    sessionEnd(services, {
      logRef: { sessionId: 's-c1', delegationId: 'fg', startedAtMs: 0, endedAtMs: 10 },
      signals: SIGNALS, proposals: [],
      touchedHolonIds: ['the-canonist'],
      history: [mkRecord('the-canonist')],
      now: 20,
    });
    expect(holonDigestBlock(services, 'the-canonist').length).toBeGreaterThan(0);

    // …then target an Orange Cognitive encounter: the canonist is coherence-blocked from the prompt
    const { coherenceBlocked } = buildEnvelope(
      services, SIG, undefined,
      { line: 'Cognitive', stage: 'Orange', modality: 'LanguageReflective' },
      'p', [], Date.now(), 'the-canonist',
    );
    expect(coherenceBlocked).toBe(true);
  });
});

describe('the dev loop sees coherence defects (43 §5.5 W4 + F4)', () => {
  it('defects land as an insight entry with a forecast; all-clear records nothing', () => {
    const services = createOrchestrationServices(HOLONS);
    const before = services.feed.entries.length;

    const recorded = recordCoherenceInsight(
      services, 'orch:enc-x',
      [{ source: 'npc:the-canonist', componentStage: 'Amber', targetStage: 'Orange', rule: 'load-bearing-off-stage', detail: 'off-stage voice withheld' }],
      Date.now(),
    );
    expect(recorded).toBe(true);
    expect(services.feed.entries.length).toBe(before + 1);
    const entry = services.feed.entries[services.feed.entries.length - 1]!;
    expect(entry.id).toBe('insight:orch:enc-x');
    expect(entry.forecast).toBeDefined(); // F4 — the orchestrator's self-criticism is mandatory

    expect(recordCoherenceInsight(services, 'orch:enc-y', [], Date.now())).toBe(false);
    expect(services.feed.entries.length).toBe(before + 1);
  });
});

describe('persistence round-trip (the checkpoint story)', () => {
  it('capture → restore preserves feed entries and worker profiles exactly (F3 replay)', () => {
    const services = createOrchestrationServices(HOLONS);
    sessionEnd(services, {
      logRef: { sessionId: 's-p1', delegationId: 'fg', startedAtMs: 0, endedAtMs: 10 },
      signals: SIGNALS, proposals: [],
      touchedHolonIds: ['the-optimist'],
      history: [mkRecord('the-optimist')],
      now: 20,
    });
    recordCoherenceInsight(services, 'orch:enc-p',
      [{ source: 'npc:the-canonist', componentStage: 'Amber', targetStage: 'Orange', rule: 'load-bearing-off-stage', detail: 'x' }],
      25);

    const checkpoint = captureCheckpoint(services);
    const serialized = JSON.parse(JSON.stringify(checkpoint)); // the JSON boundary is the test

    const fresh = createOrchestrationServices(HOLONS);
    const feedBefore = fresh.feed.entries.length;
    restoreCheckpoint(fresh, serialized);

    expect(fresh.feed.entries.length).toBe(feedBefore + serialized.feedEntries.length);
    expect(fresh.feed.entries.map((e: { id: string }) => e.id)).toEqual(
      expect.arrayContaining(serialized.feedEntries.map((e: { id: string }) => e.id)),
    );
    // Worker profile survived: the digest reads the same after restore.
    const before = holonDigestBlock(services, 'the-optimist');
    const after = holonDigestBlock(fresh, 'the-optimist');
    expect(after.length).toBe(before.length);
    expect(after[0]).toBe(before[0]);
    // And F3: restoring the SAME checkpoint again adds nothing.
    const countAfterFirst = fresh.feed.entries.length;
    restoreCheckpoint(fresh, serialized);
    expect(fresh.feed.entries.length).toBe(countAfterFirst);
  });
});
