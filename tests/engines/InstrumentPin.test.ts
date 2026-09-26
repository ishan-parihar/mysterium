/**
 * The instrument-pin rule — Phase 16 d8.
 *
 * The rule has one owner (`isDeliberateInstrumentPin`) because three call sites had each grown their
 * own copy and the copies disagreed on the VALUE they tested. These tests pin the behaviour that
 * matters, not the implementation: a deliberate pin suppresses the injection seams, and an
 * INCIDENTAL one — a player choosing a line and a stage in settings — does not.
 *
 * The second case is the regression this rule exists to prevent, and it is the one no existing gate
 * could see: before d8 the settings page's force fields never reached a `SessionContext` at all, so
 * the question was moot; wiring them made it live.
 */
import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { isPinnedInstrumentCell, isDeliberateInstrumentPin } from '../../src/core/engines/PriorityComputation.js';
import { startSession, tickWithStrategy } from '../../src/core/GameLoop.js';
import { createSignificator } from '../../src/core/domain/Significator.js';
import type { Line } from '../../src/core/domain/Line.js';
import type { Stage } from '../../src/core/domain/Stage.js';
import type { Holon } from '../../src/core/world/Holon.js';
import type { WorldState } from '../../src/core/engines/CandidateGeneration.js';

describe('isPinnedInstrumentCell', () => {
  it('is true only when BOTH axes are set', () => {
    expect(isPinnedInstrumentCell({ forceLine: 'Cognitive', forceStage: 'Red' })).toBe(true);
  });

  it('is false when only one axis is set', () => {
    // A line pin on its own is ordinary play — the CLI sets the two independently.
    expect(isPinnedInstrumentCell({ forceLine: 'Cognitive' })).toBe(false);
    expect(isPinnedInstrumentCell({ forceStage: 'Red' })).toBe(false);
    expect(isPinnedInstrumentCell({})).toBe(false);
  });

  it('treats an empty-string pin as a pin, not as absent', () => {
    // The distinction the duplicated copies got wrong: the WebUI binding tested `!== null` on the
    // store's values while the kernel tested `!== undefined` on the context's. Mapping null→undefined
    // on the way in is what made them agree, so a caller passing a different falsy value would have
    // diverged silently. `!== undefined` is the definition, and it is the strict one.
    expect(isPinnedInstrumentCell({ forceLine: '', forceStage: '' })).toBe(true);
  });
});

describe('isDeliberateInstrumentPin', () => {
  it('suppresses the seams for a deliberate pin', () => {
    expect(isDeliberateInstrumentPin({ forceLine: 'Cognitive', forceStage: 'Red', focusedCell: true })).toBe(true);
  });

  it('does NOT suppress the seams for an incidental settings pin', () => {
    // The regression d8 would otherwise have shipped: a player picks a line AND a stage in the
    // settings page, and silently loses the crucible, Holonic Return, curriculum interleave and
    // training beats — four mechanics, no visible cause.
    expect(isDeliberateInstrumentPin({ forceLine: 'Cognitive', forceStage: 'Red' })).toBe(false);
  });

  it('does not suppress the seams when focusedCell is set without a full pin', () => {
    // The flag alone is not a licence: a modality pin does not pin a cell, so a caller that sets
    // `focusedCell` alongside only one axis gets ordinary play.
    expect(isDeliberateInstrumentPin({ forceLine: 'Cognitive', focusedCell: true })).toBe(false);
    expect(isDeliberateInstrumentPin({ forceStage: 'Red', focusedCell: true })).toBe(false);
  });

  it('is false for an empty session', () => {
    expect(isDeliberateInstrumentPin({})).toBe(false);
  });

  it('is consulted by both kernel seams, not re-derived', () => {
    // The single-owner claim, asserted on the module graph (the same technique as G37/G44): the rule
    // lives in one place and BOTH seam sites call it. A future edit that re-derives the condition
    // locally at either site — instead of consulting the shared predicate — breaks this test.
    const gameLoop = readFileSync(new URL('../../src/core/GameLoop.ts', import.meta.url), 'utf8');
    const scheduler = readFileSync(new URL('../../src/core/engines/EncounterScheduler.ts', import.meta.url), 'utf8');
    expect(gameLoop).toMatch(/\bisDeliberateInstrumentPin\s*\(/);
    expect(scheduler).toMatch(/\bisDeliberateInstrumentPin\s*\(/);
    expect(gameLoop).not.toMatch(/const\s+(?:pinnedCell|instrumentPin)\s*=/);
    expect(scheduler).not.toMatch(/const\s+(?:pinnedCell|instrumentPin)\s*=/);
  });
});

// The player-path half: the predicate's EFFECT, driven through the real loop. A settings-shaped
// session (both force fields, no `focusedCell`) must keep the training weave; a deliberate pin must
// lose it. Copied DAMP from `GameLoopTraining.test.ts` — inline fixtures, no shared helper.
function makeHolon(id: string, line: Line, stage: Stage): Holon {
  return { id, name: id, kind: 'NPC', line, stage, drives: { dominant: 'Agency', secondary: 'Eros', shadowQuadrant: null }, polarity: 'Sovereign', narrativeRole: 'test', relationships: [], active: true };
}
const world: WorldState = {
  holons: [makeHolon('h1','Cognitive','Red'), makeHolon('h2','Emotional','Red'), makeHolon('h3','Moral','Red'), makeHolon('h4','Somatic','Red'), makeHolon('h5','Willpower','Red'), makeHolon('h6','Interpersonal','Red'), makeHolon('h7','Intrapersonal','Red'), makeHolon('h8','Spiritual','Red')],
  recentEncounterIds: [], cooldowns: {}, narrativeBeats: [], activeBeatId: null, completedBeatIds: [], factions: [], npcRelationships: [], pestleTension: { political:0, economic:0, social:0, technological:0, legal:0, environmental:0 }, activeMacroEvents: [],
};
const altitudes: Record<Line, Stage> = { Cognitive:'Red', Emotional:'Red', Moral:'Red', Intrapersonal:'Red', Spiritual:'Red', Somatic:'Red', Willpower:'Red', Interpersonal:'Red' };

describe('the instrument-pin rule on the real loop', () => {
  it('keeps the training weave for an incidental settings pin', () => {
    const sig = createSignificator('pin-keep', altitudes, 'Red');
    const session = { encountersSoFar: 0, sessionDurationMs: 0, targetSessionLength: 8, recentLines: [] as string[], forceLine: 'Cognitive' as Line, forceStage: 'Red' as Stage };
    let state = startSession(sig, session as never);
    let tick = tickWithStrategy(sig, world, session as never, state, null, null, Date.now());
    state = tick.sessionState;
    tick = tickWithStrategy(tick.tickResult.sig as never, tick.tickResult.world, session as never, state, null, null, Date.now() + 5000);
    const hasTraining = tick.tickResult.encounters.some((e: any) => e.isTrainingBeat) || !!tick.tickResult.encounter?.isTrainingBeat;
    expect(hasTraining).toBe(true);
  });

  it('suppresses the training weave for a deliberate pin', () => {
    const sig = createSignificator('pin-drop', altitudes, 'Red');
    const session = { encountersSoFar: 0, sessionDurationMs: 0, targetSessionLength: 8, recentLines: [] as string[], forceLine: 'Cognitive' as Line, forceStage: 'Red' as Stage, focusedCell: true as const };
    let state = startSession(sig, session as never);
    let tick = tickWithStrategy(sig, world, session as never, state, null, null, Date.now());
    state = tick.sessionState;
    tick = tickWithStrategy(tick.tickResult.sig as never, tick.tickResult.world, session as never, state, null, null, Date.now() + 5000);
    const hasTraining = tick.tickResult.encounters.some((e: any) => e.isTrainingBeat) || !!tick.tickResult.encounter?.isTrainingBeat;
    expect(hasTraining).toBe(false);
  });
});
