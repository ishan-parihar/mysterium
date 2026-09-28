/**
 * `/delegate` — the council trigger table as the player is allowed to see it.
 *
 * The route's whole job is to render `TRIGGER_TABLE` without leaking the internal register, so the
 * tests are about the two properties that can actually fail:
 *
 *   D-1 the projection covers the table EXACTLY — 11 rows, in the table's order, with crisis at
 *       rank 1 and the ordinary encounter last. A route that hardcoded its own list would pass a
 *       "renders something" test and fail this one the day a row is added upstream.
 *   D-2 precedence is preserved: the ranks are 1..11 with no gap and no repeat, so a display that
 *       reorders cannot silently reorder the law.
 *   D-3 **no internal vocabulary crosses the boundary.** Every string the page can show — every
 *       trigger view, every dispatch view for every trigger, and the prose the view attaches — is
 *       run past `leaksInternalVocabulary`. This is the test that makes the guard a check rather
 *       than a decoration: `leaksInternalVocabulary('the therapist arrives')` is asserted true
 *       first, so a guard hardwired to `false` fails the suite before it can be trusted.
 *   D-4 a requested dispatch is a REAL dispatch: the view reports what `dispatchCouncil` decided
 *       for the same state, and the same state decides the same thing on a different seed (the seed
 *       reorders presence, never membership — MY-AD-0022 / `43 §3.3`).
 *   D-5 the background roles never hold the frame, and the view's presence count agrees with the
 *       dispatch's — the count is derived, not asserted, so a table change cannot make the page
 *       misreport how many figures appear.
 *   D-6 a bypass is reported as a bypass. The crisis row is the one that stops the game, and the
 *       view says so in the field the page renders.
 */
import { describe, it, expect } from 'vitest';
import {
  councilTriggerViews,
  dispatchView,
  observationFor,
  leaksInternalVocabulary,
  type CouncilTriggerView,
  type DispatchView,
} from '../../src/lib/orchestration/councilView.js';
import {
  TRIGGER_TABLE,
  ALL_TRIGGERS,
  dispatchCouncil,
  observationForTrigger,
} from '../../src/core/orchestration/dispatcher.js';

/**
 * Every player-facing string a view can produce, collected for the vocabulary wall.
 *
 * Walks the object's own string values DYNAMICALLY rather than listing fields by hand — a
 * hand-listed list goes stale the moment a field is added, and a newly added field is exactly how
 * an internal string (the dispatcher's `rationale`) would slip through. Mutation-proved: re-adding
 * `rationale` to `DispatchView` turns this red.
 *
 * `trigger` is excluded, and the exclusion is itself asserted below: it is the join key back to the
 * kernel row and is never rendered, so walking it would assert that the identifier a test must use
 * to look up a row is also forbidden prose. Every OTHER string field is fair game, which is what
 * keeps this from being a list that quietly shrinks to nothing.
 */
const INTERNAL_KEYS: readonly string[] = ['trigger'];

function renderableStrings(views: readonly CouncilTriggerView[], dispatches: readonly DispatchView[]): string[] {
  const out: string[] = [];
  const walk = (v: object): void => {
    for (const [key, value] of Object.entries(v as Record<string, unknown>)) {
      if (INTERNAL_KEYS.includes(key)) continue;
      if (typeof value === 'string') out.push(value);
      else if (Array.isArray(value)) for (const item of value) if (typeof item === 'string') out.push(item);
      else if (typeof value === 'object' && value !== null) walk(value);
    }
  };
  for (const v of views) walk(v);
  for (const d of dispatches) walk(d);
  return out;
}

describe('/delegate — council trigger surface', () => {
  const views = councilTriggerViews();

  it('D-1: the projection covers the trigger table exactly, in table order', () => {
    expect(views).toHaveLength(TRIGGER_TABLE.length);
    expect(views.map((v) => v.trigger)).toEqual(TRIGGER_TABLE.map((r) => r.trigger));
    // The table order IS the ruling; a view that reordered it would misreport the law.
    expect(views[0]?.trigger).toBe('crisis');
    expect(views[views.length - 1]?.trigger).toBe('encounter-open');
  });

  it('D-2: ranks are 1..n with no gap and no repeat, so no display can reorder the law', () => {
    expect(views.map((v) => v.rank)).toEqual(views.map((_, i) => i + 1));
    expect(new Set(views.map((v) => v.rank)).size).toBe(views.length);
  });

  it('D-3: the vocabulary guard has teeth before the wall is trusted', () => {
    // If this ever goes false, every D-3 wall assertion below is vacuous — so it is asserted first.
    expect(leaksInternalVocabulary('the therapist arrives')).toBe(true);
    expect(leaksInternalVocabulary('a J4 summons')).toBe(true);
    expect(leaksInternalVocabulary('a depth-plateau')).toBe(true);
    expect(leaksInternalVocabulary('called summon_council')).toBe(true);
    // And it must not fire on ordinary prose — a guard that fires on everything is as useless.
    expect(leaksInternalVocabulary('a companion sits with the heavy thing')).toBe(false);
    expect(leaksInternalVocabulary('the world reorganises')).toBe(false);
    // Word boundaries, not substrings: 'thread' must not match a role id.
    expect(leaksInternalVocabulary('a thread of continuity')).toBe(false);
  });

  it('D-3: the string wall actually covers a wide surface, not a token list', () => {
    // The wall skips exactly one key (the kernel join key). If the exclusion list grew, the wall
    // would shrink toward vacuity — a check that can be satisfied by deleting what it inspects.
    expect(INTERNAL_KEYS).toEqual(['trigger']);
    // And it is not walking an empty set: the sample below is what a real render produces, and the
    // count is checked per-view so dropping a FIELD (not a row) is also caught.
    const dispatches = ALL_TRIGGERS.map((t) => dispatchView({ ...observationFor(t), seed: 'test' }));
    const strings = renderableStrings(views, dispatches);
    // 3 rendered strings per trigger view (occasion, frameBecomes, calledBy) and 4 per dispatch
    // view (frameBecomes, whatChanged, whatItMeans, plus the empty withheld array contributing
    // none) — so 11 views × 3 + 11 dispatches × 3.
    expect(strings.length).toBe(views.length * 3 + dispatches.length * 3);
  });

  it('D-3: no player-facing string leaks the internal register', () => {
    const dispatches = ALL_TRIGGERS.map((t) => dispatchView({ ...observationFor(t), seed: 'test' }));
    const strings = renderableStrings(views, dispatches);
    expect(strings.length).toBeGreaterThan(0);
    const leaks = strings.filter(leaksInternalVocabulary);
    expect(leaks).toEqual([]);
  });

  it('D-4: a requested dispatch reports what dispatchCouncil actually decided', () => {
    for (const trigger of ALL_TRIGGERS) {
      const state = { ...observationFor(trigger), seed: 's1' };
      const view = dispatchView(state);
      const summon = dispatchCouncil(state);
      expect(view.trigger).toBe(summon.trigger);
      expect(view.presenceCount).toBe(summon.roles.length);
      expect(view.backgroundCount).toBe(summon.background.length);
      expect(view.bypass).toBe(summon.bypass);
      expect(view.whatChanged).not.toBe('');
    }
  });

  it('D-3: the view does not carry the dispatcher\'s internal rationale through', () => {
    // `Summon.rationale` is written in the internal register ("a crisis pattern is present",
    // "the loop-health tick fired"). A view that exposed it would leak by type, not by accident —
    // so the field is absent from the type, and this asserts the leak that motivated removing it.
    const view = dispatchView({ ...observationFor('loop-health'), seed: 's' });
    expect(Object.keys(view)).not.toContain('rationale');
    expect(leaksInternalVocabulary('the loop-health tick fired')).toBe(true);
  });

  it('D-4: the seed reorders presence but never membership, so the ruling is stable', () => {
    const observation = observationForTrigger('threshold-proximity');
    const a = dispatchCouncil({ ...observation, seed: 'alpha' });
    const b = dispatchCouncil({ ...observation, seed: 'omega' });
    // Membership is seed-invariant; the presence ORDER may differ, which is the point of the seed.
    expect([...a.roles].sort()).toEqual([...b.roles].sort());
    // The view reports a count, so a reorder cannot change what the player is told.
    expect(dispatchView({ ...observation, seed: 'alpha' }).presenceCount).toBe(
      dispatchView({ ...observation, seed: 'omega' }).presenceCount,
    );
  });

  it('D-5: the displayed presence count matches a real dispatch, and never includes background', () => {
    for (const view of views) {
      const summon = dispatchCouncil({ ...observationFor(view.trigger), seed: 's' });
      expect(view.presenceCount).toBe(summon.roles.length);
      for (const role of summon.background) {
        expect(summon.roles).not.toContain(role);
      }
    }
    // The loop-health row summons nobody into the foreground — and the view says so.
    const health = views.find((v) => v.trigger === 'loop-health');
    expect(health?.infrastructureOnly).toBe(true);
    expect(health?.presenceCount).toBe(0);
  });

  it('D-6: a crisis dispatch is reported as the frame stopping, not as a scene', () => {
    const crisis = views.find((v) => v.trigger === 'crisis');
    expect(crisis?.bypass).toBe(true);
    const view = dispatchView({ ...observationFor('crisis'), seed: 's' });
    expect(view.bypass).toBe(true);
    expect(view.whatItMeans.toLowerCase()).toContain('stops');
    // No other row is a bypass: if one were, the page would teach the wrong rule.
    expect(views.filter((v) => v.bypass).map((v) => v.trigger)).toEqual(['crisis']);
  });

  it('D-6: crisis preempts every other trigger when both are present in the state', () => {
    // The table's whole ordering claim, exercised on a state where nine rows would otherwise fire.
    const loaded = {
      ...observationForTrigger('crisis'),
      thresholdProximity: true,
      shadowWorkWarranted: true,
      packIntakeDue: true,
      depthPlateauTicks: 5,
      retentionDecay: true,
    };
    const view = dispatchView({ ...loaded, seed: 's' });
    expect(view.trigger).toBe('crisis');
    expect(view.rank).toBe(1);
  });
});
