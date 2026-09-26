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
import { describe, it, expect } from 'vitest';
import { isPinnedInstrumentCell, isDeliberateInstrumentPin } from '../../src/core/engines/PriorityComputation.js';

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

  it('agrees with the kernel and the scheduler because they call it', () => {
    // The single-owner claim, asserted rather than assumed: the rule lives in one place, so a
    // future edit that changes the definition changes all three seams together.
    const session = { forceLine: 'Moral', forceStage: 'Magenta', focusedCell: true } as const;
    expect(isDeliberateInstrumentPin(session)).toBe(isPinnedInstrumentCell(session));
  });
});
