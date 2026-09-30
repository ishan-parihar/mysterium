/**
 * First-boot world bootstrap — the WebUI/CLI parity seam.
 *
 * Before this existed, the CLI seeded a world (`loadHolons`) and the browser did not, so a
 * first-time player calibrated successfully and then hit "Cannot start session: no Significator or
 * WorldState" on /play. The engine booted, the session refused, and no test in the repo failed:
 * the kernel harness builds its own world and never goes through persistence.
 */
import { describe, it, expect } from 'vitest';
import { createFirstBootWorld, mergeAuthoredHolons } from '$lib/engine/worldBootstrap.js';
import { createInitialWorldState } from '$core/engines/CandidateGeneration.js';
import type { Holon } from '$core/world/Holon.js';
import redLayerHolons from '$core/world/data/red-layer-holons.json';
import stageHolons from '$core/world/data/stage-holons.json';

describe('first-boot world', () => {
  it('builds a world the session guard will accept', () => {
    const world = createFirstBootWorld();
    // startGameSession() refuses when either half is null; this is the assertion that closes it.
    expect(world).not.toBeNull();
    expect(world.holons.length).toBeGreaterThan(0);
  });

  it('seeds from BOTH authored corpora, not one of them', () => {
    const total = createFirstBootWorld().holons.length;
    expect(total).toBe(redLayerHolons.length + stageHolons.length);
  });

  it('is the same factory the CLI seeds from, so the two surfaces start equal', () => {
    // Parity is asserted against the AUTHORED SET and the factory, not against a second copy of the
    // seed list — asserting it against `createFirstBootWorld()` would compare the function with
    // itself, which is the tautology this file exists to avoid.
    const fromBrowser = createFirstBootWorld();
    const fromCli = createInitialWorldState(
      [...redLayerHolons, ...stageHolons] as unknown as Holon[],
    );
    expect(fromBrowser.holons.map((h) => h.id)).toEqual(fromCli.holons.map((h) => h.id));
  });

  it('folds newly authored holons into an existing save without dropping the player’s', () => {
    // A REAL stale save, not a prefix of the authored set. The first version trimmed the authored
    // list itself, and every holon in that prefix is in the authored corpus — so the merge
    // reproduced it from either side and the test passed with the merge branch DELETED. A vacuous
    // assertion (MY-RG-0010). This save is keyed outside the authored set, so losing the merge
    // branch is visible.
    const authoredIds = new Set(
      [...redLayerHolons, ...stageHolons].map((h) => (h as { id: string }).id),
    );
    const seed = createFirstBootWorld().holons;
    const playerOnly: Holon[] = [
      { ...seed[0]!, id: 'player-holon-legacy-01', name: 'A place that is yours' },
      { ...seed[1]!, id: 'player-holon-legacy-02', name: 'Another' },
    ];
    expect(playerOnly.some((h) => authoredIds.has(h.id))).toBe(false);

    const merged = mergeAuthoredHolons(playerOnly);
    // the player's own holons survive the merge...
    expect(merged.map((h) => h.id)).toEqual(
      expect.arrayContaining(playerOnly.map((h) => h.id)),
    );
    // ...and the authored set arrives in full behind them.
    expect(merged.length).toBe(playerOnly.length + redLayerHolons.length + stageHolons.length);
  });

  it('is idempotent — re-merging an already-merged world changes nothing', () => {
    const once = mergeAuthoredHolons(createFirstBootWorld().holons);
    const twice = mergeAuthoredHolons(once);
    expect(twice.length).toBe(once.length);
  });
});
