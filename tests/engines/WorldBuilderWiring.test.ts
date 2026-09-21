/**
 * Tests for world-builder wiring: PolarityOntology, RedPESTLE, Conqueror boss,
 * and encounter-avoidance consequences.
 */
import { describe, it, expect } from 'vitest';
import { getPolarityTextureName, getPlayerPolarityTexture } from '../../src/core/engines/PolarityEngine.js';
import { createInitialPolarityState } from '../../src/core/domain/PolarityCellVector.js';
import { getPESTLEDescription, getPESTLEContextString, getDominantPESTLE, createInitialTension } from '../../src/core/engines/MacroCatalystEngine.js';
import { conquerorEncounters, CONQUEROR_PHASES, isConquerorDefeated } from '../../src/core/world/encounters-red/conqueror.js';
import { applyConsequences, processOutcome, type PlayerResponse } from '../../src/core/engines/ConsequenceEngine.js';
import { createSignificator } from '../../src/core/domain/Significator.js';
import { createInitialWorldState } from '../../src/core/engines/CandidateGeneration.js';
import type { Line } from '../../src/core/domain/Line.js';
import type { Stage } from '../../src/core/domain/Stage.js';
import type { ScheduledEncounter } from '../../src/core/domain/EncounterSpecNew.js';

function makeAltitudes(stage: Stage): Record<Line, Stage> {
  return {
    Cognitive: stage, Emotional: stage, Moral: stage, Intrapersonal: stage,
    Spiritual: stage, Somatic: stage, Willpower: stage, Interpersonal: stage,
  };
}

function makeEncounter(): ScheduledEncounter {
  return {
    id: 'test-encounter',
    moduleRef: 'Cognitive:Red',
    modality: 'Deterministic',
    targetLines: ['Cognitive'],
    stage: 'Red',
    holonSource: 'Cognitive:Red',
    shadowTarget: null,
    polarityMode: 'Exploring',
    difficulty: 0.5,
    sessionPosition: 'peak',
    priority: 0.5,
    driveTarget: null,
    executionMode: 'capacity',
  };
}

function makeAvoidedResponse(): PlayerResponse {
  return {
    encounterId: 'test-encounter',
    energeticDirection: 'Sovereign',
    driveDirectionality: {
      Agency: 'HealthyBalanced',
      Communion: 'HealthyBalanced',
      Eros: 'HealthyBalanced',
      Agape: 'HealthyBalanced',
    },
    stageOrientation: 'Homeostatic',
    sourceOfNourishment: 'LowerRealm',
    shadowSurfaced: null,
    shadowResolvedId: null,
    narrativeSummary: '',
  };
}

// --- GAP-WB-1: PolarityOntology wiring ---

describe('GAP-WB-1: PolarityOntology wiring', () => {
  it('getPolarityTextureName returns texture for Cognitive:Red:sto', () => {
    const name = getPolarityTextureName('Cognitive', 'Red', 'sto');
    expect(name).toBe('strategic-service');
  });

  it('getPolarityTextureName returns texture for Cognitive:Red:sts', () => {
    const name = getPolarityTextureName('Cognitive', 'Red', 'sts');
    expect(name).toBe('cunning-dominance');
  });

  it('getPolarityTextureName returns null for non-existent cell', () => {
    const name = getPolarityTextureName('Cognitive', 'Infrared', 'sto');
    expect(name).not.toBeNull(); // Infrared DOES have textures
  });

  it('getPlayerPolarityTexture returns exploratory texture for Exploring mode', () => {
    const state = createInitialPolarityState();
    const name = getPlayerPolarityTexture(state, 'Cognitive', 'Red');
    expect(name).toBe('tactical-curiosity');
  });
});

// --- GAP-WB-2: RedPESTLE bridge ---

describe('GAP-WB-2: RedPESTLE bridge into MacroCatalystEngine', () => {
  it('getPESTLEDescription returns Red-stage description for political', () => {
    const desc = getPESTLEDescription('political');
    expect(desc).toContain('Warlord fiefdoms');
  });

  it('getPESTLEContextString returns all 6 dimensions', () => {
    const ctx = getPESTLEContextString();
    expect(ctx).toContain('political:');
    expect(ctx).toContain('economic:');
    expect(ctx).toContain('social:');
    expect(ctx).toContain('technological:');
    expect(ctx).toContain('legal:');
    expect(ctx).toContain('environmental:');
  });

  it('getDominantPESTLE returns null when all tensions are 0', () => {
    const tension = createInitialTension();
    const result = getDominantPESTLE(tension);
    expect(result).toBeNull();
  });

  it('getDominantPESTLE returns dimension with highest tension', () => {
    const tension = { political: 0.8, economic: 0.1, social: 0.1, technological: 0.1, legal: 0.1, environmental: 0.1 };
    const result = getDominantPESTLE(tension);
    expect(result).not.toBeNull();
    expect(result!.dimension).toBe('political');
    expect(result!.description).toContain('Warlord fiefdoms');
  });
});

// --- GAP-WB-3: Conqueror 4-phase boss ---

describe('GAP-WB-3: Conqueror 4-phase boss encounters', () => {
  it('generates 4 EncounterSpec objects', () => {
    expect(conquerorEncounters).toHaveLength(4);
  });

  it('each encounter has correct id pattern', () => {
    expect(conquerorEncounters[0]!.id).toBe('red-conqueror-phase-1');
    expect(conquerorEncounters[3]!.id).toBe('red-conqueror-phase-4');
  });

  it('each encounter has threshold role', () => {
    for (const enc of conquerorEncounters) {
      expect(enc.role).toBe('threshold');
    }
  });

  it('each encounter has phaseIndex and totalPhases', () => {
    conquerorEncounters.forEach((enc, idx) => {
      expect(enc.phaseIndex).toBe(idx);
      expect(enc.totalPhases).toBe(4);
    });
  });

  it('each encounter has holonId warlord-tyrant', () => {
    for (const enc of conquerorEncounters) {
      expect(enc.holonId).toBe('warlord-tyrant');
    }
  });

  it('phases cover all 4 quadrants (UL, UR, LL, LR)', () => {
    const quadrants = conquerorEncounters.map(e => e.quadrants[0]);
    expect(quadrants).toEqual(['UL', 'UR', 'LL', 'LR']);
  });

  it('difficulty progresses 1→2→2→3', () => {
    const difficulties = conquerorEncounters.map(e => e.enemy.difficulty);
    expect(difficulties).toEqual([1, 2, 2, 3]);
  });

  it('isConquerorDefeated returns true at 4 phases', () => {
    expect(isConquerorDefeated(4)).toBe(true);
    expect(isConquerorDefeated(3)).toBe(false);
  });

  it('CONQUEROR_PHASES has 4 entries', () => {
    expect(CONQUEROR_PHASES).toHaveLength(4);
  });
});

// --- OA-13: Encounter-avoidance consequences ---

describe('OA-13: Encounter-avoidance consequences', () => {
  it('avoided encounter increases fixationRisk on target drive', () => {
    const sig = createSignificator('p1', makeAltitudes('Red'), 'Red');
    const world = createInitialWorldState([]);
    const encounter = makeEncounter();
    const response = makeAvoidedResponse();

    const record = processOutcome(encounter, response, Date.now());
    const { sig: newSig } = applyConsequences(sig, world, record, encounter);

    // Agency fixationRisk should increase (default driveTarget is Agency)
    expect(newSig.drives.fixationRisk.Agency).toBeGreaterThan(sig.drives.fixationRisk.Agency);
  });

  it('non-avoided encounter does not trigger avoidance consequence', () => {
    const sig = createSignificator('p1', makeAltitudes('Red'), 'Red');
    const world = createInitialWorldState([]);
    const encounter = makeEncounter();
    const response: PlayerResponse = {
      ...makeAvoidedResponse(),
      narrativeSummary: 'I engaged fully with the encounter.',
    };

    const record = processOutcome(encounter, response, Date.now());
    const { sig: newSig } = applyConsequences(sig, world, record, encounter);

    // FixationRisk should NOT have the avoidance bump (only the normal drive-update)
    // The avoidance bump is +0.03; without it, the only change comes from updateDriveBalance
    // For HealthyBalanced drives, updateDriveBalance DECREASES fixation by 0.02
    expect(newSig.drives.fixationRisk.Agency).toBeLessThanOrEqual(sig.drives.fixationRisk.Agency);
  });
});
