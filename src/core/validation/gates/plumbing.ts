/**
 * Gate plumbing — the result shape, the tier, and the two formatters the trajectory gates share.
 *
 * Split out of `gates.ts` (module-cohesion audit item 2). A gate has to live beside the assertions
 * it belongs with, and the shape every gate returns belongs to none of them — so it lives here, and
 * every family imports it rather than re-declaring it.
 *
 * Spec: docs/validation/BENCHMARK-ARCHITECTURE.md §6.
 */

import { type TrajectoryResult } from '../harness.js';

// ---------------------------------------------------------------------------
// Gate plumbing
// ---------------------------------------------------------------------------

export type Tier = 'ci' | 'full';

export interface GateResult {
  gate: string;
  passed: boolean;
  hard: boolean;
  details: string;
}

export function fmt(n: number | undefined | null): string {
  return typeof n === 'number' ? n.toFixed(4) : String(n);
}

export const finalOf = (r: TrajectoryResult) => r.sessions[r.sessions.length - 1]!.observables;
