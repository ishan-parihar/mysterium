import { describe, it, expect } from 'vitest';
import { scheduleNext, rankCandidates } from '../../src/core/engines/EncounterScheduler.js';
import type { WorldState } from '../../src/core/engines/CandidateGeneration.js';
import type { SessionContext } from '../../src/core/engines/PriorityComputation.js';
import { createSignificator } from '../../src/core/domain/Significator.js';
import type { Line } from '../../src/core/domain/Line.js';
import type { Stage } from '../../src/core/domain/Stage.js';
import type { Holon } from '../../src/core/world/Holon.js';

function makeHolon(id: string, line: Line, stage: Stage): Holon {
  return {
    id, name: id, kind: 'NPC', line, stage,
    drives: { dominant: 'Agency', secondary: 'Eros', shadowQuadrant: null },
    polarity: 'Sovereign', narrativeRole: 'test', relationships: [], active: true,
  };
}

const altitudes: Record<Line, Stage> = {
  Cognitive: 'Red', Emotional: 'Red', Moral: 'Red', Intrapersonal: 'Red',
  Spiritual: 'Red', Somatic: 'Red', Willpower: 'Red', Interpersonal: 'Red',
};

describe('EncounterScheduler', () => {
  const sig = createSignificator('test-player', altitudes, 'Red');
  const world: WorldState = {
    holons: [
      makeHolon('h1', 'Cognitive', 'Red'),
      makeHolon('h2', 'Emotional', 'Red'),
      makeHolon('h3', 'Moral', 'Red'),
      makeHolon('h4', 'Somatic', 'Infrared'),
    ],
    recentEncounterIds: [],
    cooldowns: {},
    narrativeBeats: [],
    activeBeatId: null,
    completedBeatIds: [],
    factions: [],
    npcRelationships: [],
    pestleTension: { political: 0, economic: 0, social: 0, technological: 0, legal: 0, environmental: 0 },
    activeMacroEvents: [],
  };
  const session: SessionContext = {
    encountersSoFar: 2,
    sessionDurationMs: 600000,
    targetSessionLength: 10,
    recentLines: [],
  };

  it('returns encounters when candidates exist', () => {
    const result = scheduleNext(sig, world, session, Date.now(), 3);
    expect(result.length).toBeGreaterThan(0);
    expect(result.length).toBeLessThanOrEqual(3);
  });

  it('returns empty when no holons are active', () => {
    const emptyWorld: WorldState = { holons: [], recentEncounterIds: [], cooldowns: {}, narrativeBeats: [], activeBeatId: null, completedBeatIds: [], factions: [], npcRelationships: [], pestleTension: { political: 0, economic: 0, social: 0, technological: 0, legal: 0, environmental: 0 }, activeMacroEvents: [] };
    const result = scheduleNext(sig, emptyWorld, session, Date.now(), 3);
    expect(result).toHaveLength(0);
  });

  it('filters out holons above player perception', () => {
    const highWorld: WorldState = {
      holons: [makeHolon('h-high', 'Cognitive', 'Orange')], // 2 stages above Red
      recentEncounterIds: [],
      cooldowns: {},
      narrativeBeats: [],
      activeBeatId: null,
      completedBeatIds: [],
      factions: [],
      npcRelationships: [],
      pestleTension: { political: 0, economic: 0, social: 0, technological: 0, legal: 0, environmental: 0 },
      activeMacroEvents: [],
    };
    const result = scheduleNext(sig, highWorld, session, Date.now(), 3);
    expect(result).toHaveLength(0);
  });

  it('ranks decayed lines higher', () => {
    const oldSig = {
      ...sig,
      theta: { lastEncounter: { 'Cognitive:Red': 0, 'Emotional:Red': Date.now() } },
    };
    const result = scheduleNext(oldSig, world, session, Date.now(), 3);
    // Cognitive should rank higher due to staleness
    if (result.length >= 2) {
      const cogIdx = result.findIndex(r => r.targetLines.includes('Cognitive'));
      const emoIdx = result.findIndex(r => r.targetLines.includes('Emotional'));
      if (cogIdx >= 0 && emoIdx >= 0) {
        expect(cogIdx).toBeLessThan(emoIdx);
      }
    }
  });

  it('allows scheduling forced line and stage even if above player perception/altitude', () => {
    const highWorld: WorldState = {
      holons: [
        makeHolon('h-high', 'Cognitive', 'Orange'), // 2 stages above Red
        makeHolon('h-other', 'Emotional', 'Orange'),
      ],
      recentEncounterIds: [],
      cooldowns: {},
      narrativeBeats: [],
      activeBeatId: null,
      completedBeatIds: [],
      factions: [],
      npcRelationships: [],
      pestleTension: { political: 0, economic: 0, social: 0, technological: 0, legal: 0, environmental: 0 },
      activeMacroEvents: [],
    };
    const forcedSession: SessionContext = {
      ...session,
      forceLine: 'Cognitive',
      forceStage: 'Orange',
    };
    const result = scheduleNext(sig, highWorld, forcedSession, Date.now(), 3);
    expect(result.length).toBeGreaterThan(0);
    for (const item of result) {
      expect(item.targetLines).toContain('Cognitive');
      expect(item.stage).toBe('Orange');
      expect(item.holonSource).toBe('h-high');
    }
  });

  it('overrides eligible modalities when forceModality is provided', () => {
    const customWorld: WorldState = {
      holons: [
        {
          ...makeHolon('h-mod', 'Cognitive', 'Red'),
          modality: 'Deterministic',
        }
      ],
      recentEncounterIds: [],
      cooldowns: {},
      narrativeBeats: [],
      activeBeatId: null,
      completedBeatIds: [],
      factions: [],
      npcRelationships: [],
      pestleTension: { political: 0, economic: 0, social: 0, technological: 0, legal: 0, environmental: 0 },
      activeMacroEvents: [],
    };
    const forcedSession: SessionContext = {
      ...session,
      forceModality: 'LanguageReflective',
    };
    const result = scheduleNext(sig, customWorld, forcedSession, Date.now(), 3);
    expect(result.length).toBe(1);
    expect(result[0].modality).toBe('LanguageReflective');
  });

  it('bypasses cooldowns and recency checks when any forcing is active', () => {
    const now = Date.now();
    const cooldownWorld: WorldState = {
      holons: [
        makeHolon('h-cooldown', 'Cognitive', 'Red'),
      ],
      recentEncounterIds: [],
      cooldowns: {
        'Cognitive:Red': now + 100000,
      },
      recentEncounters: [
        { line: 'Cognitive', stage: 'Red', modality: 'Deterministic' },
      ],
      narrativeBeats: [],
      activeBeatId: null,
      completedBeatIds: [],
      factions: [],
      npcRelationships: [],
      pestleTension: { political: 0, economic: 0, social: 0, technological: 0, legal: 0, environmental: 0 },
      activeMacroEvents: [],
    };

    const normalResult = scheduleNext(sig, cooldownWorld, session, now, 3);
    expect(normalResult).toHaveLength(0);

    const forcedSession: SessionContext = {
      ...session,
      forceLine: 'Cognitive',
    };
    const forcedResult = scheduleNext(sig, cooldownWorld, forcedSession, now, 3);
    expect(forcedResult.length).toBeGreaterThan(0);
  });

  it('recency check matches the most recent (last) elements rather than oldest (first) elements', () => {
    const now = Date.now();
    const testWorld: WorldState = {
      holons: [
        makeHolon('h1', 'Cognitive', 'Red'),
      ],
      recentEncounterIds: [],
      cooldowns: {},
      recentEncounters: [
        { line: 'Emotional', stage: 'Red', modality: 'Deterministic' }, // index 0 (oldest)
        { line: 'Emotional', stage: 'Red', modality: 'Deterministic' }, // index 1
        { line: 'Emotional', stage: 'Red', modality: 'Deterministic' }, // index 2
        { line: 'Cognitive', stage: 'Red', modality: 'Deterministic' }, // index 3 (most recent)
      ],
      narrativeBeats: [],
      activeBeatId: null,
      completedBeatIds: [],
      factions: [],
      npcRelationships: [],
      pestleTension: { political: 0, economic: 0, social: 0, technological: 0, legal: 0, environmental: 0 },
      activeMacroEvents: [],
    };

    const result = scheduleNext(sig, testWorld, session, now, 3);
    const hasCognitive = result.some(r => r.targetLines.includes('Cognitive'));
    expect(hasCognitive).toBe(false);
  });

  it('recency check of last 2 module elements matches the end of the array', () => {
    const now = Date.now();
    const testWorld: WorldState = {
      holons: [
        makeHolon('h1', 'Cognitive', 'Red'),
      ],
      recentEncounterIds: [],
      cooldowns: {},
      recentEncounters: [
        { line: 'Emotional', stage: 'Red', modality: 'Deterministic' },
        { line: 'Emotional', stage: 'Red', modality: 'Deterministic' },
        { line: 'Emotional', stage: 'Red', modality: 'Deterministic' },
        { line: 'Cognitive', stage: 'Red', modality: 'Strategic' },
      ],
      narrativeBeats: [],
      activeBeatId: null,
      completedBeatIds: [],
      factions: [],
      npcRelationships: [],
      pestleTension: { political: 0, economic: 0, social: 0, technological: 0, legal: 0, environmental: 0 },
      activeMacroEvents: [],
    };

    const result = scheduleNext(sig, testWorld, session, now, 3);
    const hasCognitive = result.some(r => r.targetLines.includes('Cognitive'));
    expect(hasCognitive).toBe(false);
  });

  it('modality rotation constraint filters out a modality if it was used consecutively in the last two encounters', () => {
    const now = Date.now();
    const testWorld: WorldState = {
      holons: [
        {
          ...makeHolon('h1', 'Cognitive', 'Red'),
          modality: 'Deterministic',
        }
      ],
      recentEncounterIds: [],
      cooldowns: {},
      recentEncounters: [
        { line: 'Emotional', stage: 'Red', modality: 'Deterministic' },
        { line: 'Moral', stage: 'Red', modality: 'Deterministic' },
      ],
      narrativeBeats: [],
      activeBeatId: null,
      completedBeatIds: [],
      factions: [],
      npcRelationships: [],
      pestleTension: { political: 0, economic: 0, social: 0, technological: 0, legal: 0, environmental: 0 },
      activeMacroEvents: [],
    };

    const result = scheduleNext(sig, testWorld, session, now, 3);
    expect(result.length).toBeGreaterThan(0);
    for (const item of result) {
      expect(item.modality).not.toBe('Deterministic');
    }
  });

  it('modality rotation constraint is bypassed when any forcing is active', () => {
    const now = Date.now();
    const testWorld: WorldState = {
      holons: [
        {
          ...makeHolon('h1', 'Cognitive', 'Red'),
          modality: 'Deterministic',
        }
      ],
      recentEncounterIds: [],
      cooldowns: {},
      recentEncounters: [
        { line: 'Emotional', stage: 'Red', modality: 'Deterministic' },
        { line: 'Moral', stage: 'Red', modality: 'Deterministic' },
      ],
      narrativeBeats: [],
      activeBeatId: null,
      completedBeatIds: [],
      factions: [],
      npcRelationships: [],
      pestleTension: { political: 0, economic: 0, social: 0, technological: 0, legal: 0, environmental: 0 },
      activeMacroEvents: [],
    };

    const forcedSession: SessionContext = {
      ...session,
      forceModality: 'Deterministic',
    };

    const result = scheduleNext(sig, testWorld, forcedSession, now, 3);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].modality).toBe('Deterministic');
  });

  /**
   * `24 §3.2.9`: the formula is CLOSED. Two developmental twins — same line altitude, same
   * shadows, same drive state, same holon shape — score IDENTICALLY. Distinctness is not a
   * property of the score; a score that broke ties was carrying an unweighted additive term
   * (`tieBreaker`, ≤ 0.02) that sat outside the eight ratified criteria and could reorder them.
   */
  it('scores developmental twins identically — the formula is closed', () => {
    const twinWorld: WorldState = {
      holons: [
        { ...makeHolon('h-cog', 'Cognitive', 'Red'), modality: 'ImmersiveRPG' },
        { ...makeHolon('h-emo', 'Emotional', 'Red'), modality: 'ImmersiveRPG' },
      ],
      recentEncounterIds: [],
      cooldowns: {},
      narrativeBeats: [],
      activeBeatId: null,
      completedBeatIds: [],
      factions: [],
      npcRelationships: [],
      pestleTension: { political: 0, economic: 0, social: 0, technological: 0, legal: 0, environmental: 0 },
      activeMacroEvents: [],
    };

    const result = scheduleNext(sig, twinWorld, session, Date.now(), 2);
    expect(result).toHaveLength(2);
    expect(result[0].priority).toBe(result[1].priority);
  });

  it('ranks tied candidates reproducibly — the same state yields the same order', () => {
    const first = scheduleNext(sig, world, session, Date.now(), 3);
    const second = scheduleNext(sig, world, session, Date.now(), 3);
    expect(first.length).toBeGreaterThan(1);
    expect(first.map(e => e.moduleRef)).toEqual(second.map(e => e.moduleRef));
  });

  /**
   * `24 §3.3` is a comparator in canonical order — novel modality, novel line, familiar holon,
   * then a deterministic hash — and it is exercised through `rankCandidates` directly because the
   * GENERATOR already hard-filters anything the trace covers (last-3 by tuple, last-2 by
   * line+stage). Constructing the comparison by hand is the only way to assert the rule order
   * itself rather than the generator's filter.
   */
  it('§3.3 prefers a modality absent from the LAST three encounters', () => {
    const trace = [
      { line: 'Cognitive' as Line, stage: 'Red' as Stage, modality: 'ImmersiveRPG' as const },
      { line: 'Moral' as Line, stage: 'Red' as Stage, modality: 'ScenarioChoice' as const },
      { line: 'Somatic' as Line, stage: 'Red' as Stage, modality: 'Embodied' as const },
    ];
    const traceWorld: WorldState = { ...world, recentEncounters: trace };
    const mk = (line: Line, modality: 'Embodied' | 'Strategic', priority: number) => ({
      candidate: {
        moduleRef: `${line}:Red`, line, stage: 'Red' as Stage, modality,
        holonId: `h-${line}`, cooldownClear: true,
      },
      priority,
    });

    // Somatic/Embodied is the NEWEST trace entry; Cognitive/Strategic is not in the trace at all.
    // Both candidates are inside the tie band, so §3.3 rule 1 alone must order them.
    const ranked = rankCandidates(
      [mk('Somatic', 'Embodied', 0.5), mk('Cognitive', 'Strategic', 0.5)],
      sig,
      traceWorld,
    );
    expect(ranked[0]!.candidate.line).toBe('Cognitive');
  });
});
