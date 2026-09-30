import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

import type { ScheduledEncounter } from '$core/domain/EncounterSpecNew.js';

/**
 * A declined encounter must not come back, and the key that excludes it is `moduleRef`.
 *
 * THE DEFECT THIS PINS. `declineEncounter` removed the card and immediately rescheduled, but
 * `scheduleNextWithHolonicReturn` is deterministic and takes no exclusion argument, so the same top
 * three were re-derived. Measured in the browser: Skip did nothing a player could see.
 *
 * THE FIRST REPAIR WAS ALSO WRONG, and the unit tests could not see it. `ScheduledEncounter.id` is
 * built as `moduleRef:holonId:<timestamp>`, so every pass mints a fresh id for the SAME encounter.
 * Excluding by id could therefore never match anything: four Skips produced
 * `Cognitive:Red:viper-tactician:1790773895026`, `…904656`, `…910766`, `…916876` — ten unique ids
 * accumulated on the profile while the screen never changed. The browser was the only instrument
 * that saw this; the assertions below are what makes it visible to CI.
 *
 * These are structural assertions, not a scheduler integration: the generator is deterministic and
 * the engine's filtering is a two-line predicate, so what is worth pinning is the SHAPE of the key —
 * that it is stable across passes and that it is the identity the player perceives.
 */

function encounter(moduleRef: string, holonId: string, at: number) {
  return {
    id: `${moduleRef}:${holonId}:${at}`,
    moduleRef,
    holonSource: holonId,
  } as unknown as ScheduledEncounter;
}

describe('encounter identity for exclusion', () => {
  it('an id is NOT stable across scheduling passes — which is why it cannot be the key', () => {
    const a = encounter('Cognitive:Red', 'viper-tactician', 1_000);
    const b = encounter('Cognitive:Red', 'viper-tactician', 2_000);

    expect(a.id).not.toBe(b.id);
    expect(a.moduleRef).toBe(b.moduleRef);
  });

  it('moduleRef IS stable across passes for the same encounter', () => {
    const refs = [1, 2, 3].map((t) => encounter('Spiritual:Infrared', 'firekeeper', t).moduleRef);
    expect(new Set(refs).size).toBe(1);
  });

  it('the engine filters by moduleRef, not by id', () => {
    // The binding a structural test cannot see: read the engine and require the moduleRef key.
    // Without this, the predicates above pass while the engine still filters on a timestamped id.
    const src = readFileSync('src/lib/engine/gameEngine.ts', 'utf8');
    const code = src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');

    expect(code, 'the filter is not keyed on moduleRef').toMatch(/filter\(\(e\) => !exclude\.has\(e\.moduleRef\)\)/);
    expect(code, 'the exclude set is still built from ids').not.toMatch(/exclude\.has\(e\.id\)/);
    // And the RECORDED value must be the moduleRef too, or the set is filled with keys the filter
    // never matches. `declinedRef = encounter.id` is exactly that, so it is asserted by name — the
    // first version of this assertion matched nothing and stayed green under mutation.
    expect(code, 'the decline records the id, not the perceived identity').toMatch(
      /const declinedRef = encounter\.moduleRef;/,
    );
    expect(code).not.toMatch(/const declinedRef = encounter\.id;/);
  });

  it('a declined moduleRef is excluded from a later scheduling pass', () => {
    // The property, expressed directly: given the same candidate set, the filter keeps the fresh
    // ones and drops the declined one.
    const declined = 'Cognitive:Red';
    const exclude = new Set([declined]);
    const candidates = [
      encounter(declined, 'viper-tactician', 1_000),
      encounter('Spiritual:Amber', 'firekeeper', 1_000),
      encounter('Interpersonal:Red', 'night-scout', 1_000),
    ];

    const kept = candidates.filter((e) => !exclude.has(e.moduleRef)).slice(0, 3);

    expect(kept.map((e) => e.moduleRef)).toEqual(['Spiritual:Amber', 'Interpersonal:Red']);
  });

  it('a training beat is exempt — it is a different instrument, not a declined encounter', () => {
    // A training beat's id is time-and-random stamped by design, so it must survive the filter or
    // the weave would silently stop producing beats once anything else was declined.
    const beat = encounter('Training:paradigm-x', 'paradigm-x', 1_000);
    const exclude = new Set(['Cognitive:Red']);
    expect(exclude.has(beat.moduleRef)).toBe(false);
  });
});
