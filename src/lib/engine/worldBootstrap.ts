/**
 * First-boot world bootstrap for the WebUI.
 *
 * THE PARITY GAP THIS CLOSES: the CLI had `loadHolons()` (scripts/cli/support.ts:217) and the
 * browser had nothing. `bootEngine` loads `world:v1`, finds null on any first-time player, and
 * `startGameSession` then refuses with "Cannot start session: no Significator or WorldState" — so
 * calibration completed, the player landed on /play, and the game was unstartable. The CLI could
 * play from a clean profile; the WebUI could not. That asymmetry is invisible to every test,
 * because the kernel harness builds its own world and never goes through persistence.
 *
 * Seeded from the SAME two authored corpora the CLI seeds from, via the SAME factory, so both
 * surfaces start with an identical world — the parity the CLI/kernel comparison is supposed to
 * measure, rather than two different games wearing one name.
 */

import { createInitialWorldState, type WorldState } from '$core/engines/CandidateGeneration.js';
import type { Holon } from '$core/world/Holon.js';
import redLayerHolons from '$core/world/data/red-layer-holons.json';
import stageHolons from '$core/world/data/stage-holons.json';

// The JSON imports widen `kind`, `line` and `stage` to `string`. The cast is asserted HERE, once, at
// the single point the authored corpus enters the typed world — rather than at each consumer, which
// is how a string-typed enum reaches an engine that expects a literal union.
const AUTHORED_HOLONS = [...redLayerHolons, ...stageHolons] as unknown as readonly Holon[];

/**
 * Merge authored holons into a saved world, idempotently by id.
 *
 * Copied from the CLI's `mergeAuthoredHolons` (support.ts:209) including its reason: a save
 * persisted before new holons were authored would otherwise never receive them, so the 92-holon
 * world would exist only for fresh installs. Keeping the two in step is the point of the parity.
 */
export function mergeAuthoredHolons(savedHolons: readonly Holon[]): readonly Holon[] {
  const byId = new Map<string, Holon>();
  for (const h of savedHolons) byId.set(h.id, h);
  for (const h of AUTHORED_HOLONS) if (!byId.has(h.id)) byId.set(h.id, h);
  return [...byId.values()];
}

/**
 * The world a first-time player starts with: the full authored corpus, no save read.
 *
 * Fresh installs and returning players therefore begin from the same holon set, which is what lets
 * the CLI and the browser be compared at all.
 */
export function createFirstBootWorld(): WorldState {
  return createInitialWorldState(AUTHORED_HOLONS);
}