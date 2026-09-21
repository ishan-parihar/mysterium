/**
 * The stage-coherence validator — the gate the user's requirement names directly:
 * "their contextual combination must not result in a confusing or deviated stage simulation."
 *
 * A composed context mixes components (a world rendering, an NPC rendering, a scenario seed, a
 * facet composition). Each component carries its own cell. The combination is COHERENT only if
 * every component speaks at (or is explicitly licensed to speak at) the encounter's stage — an
 * Amber voice on a Green stake is `46 §11`'s "facet incoherence" failure, and mixing altitudes is
 * exactly how a simulation becomes confusing to the player (the catalyst stops making sense as
 * THEIR work) and deviated (the scheduler's intent is overwritten by whatever texture arrived).
 *
 * The canon being enforced (44, 02 §3):
 *  - a stage is an ALTITUDE, not a flavour — components from a different altitude change what the
 *    catalyst means, which no personalization preference may do (45 §4, 46 §11 invariant 5);
 *  - adjacency is a licence, not an equality: ±1 stage may appear as SUBORDINATE texture (the
 *    world's weather, an offhand register) because ladders are lived as transitions, but the
 *    load-bearing components — scenario seed, role-archetype, stake, pressure-lever — must be
 *    exactly at the encounter's stage;
 *  - tags are FLAVOUR and never checked against stage (44: altitude and lens are different axes).
 *
 * Fail-closed: a violation is a defect to be triaged by the development loop, never silently
 * repaired by substitution — silent substitution would itself be an un-audited editorial act.
 */

import type { Line } from '../domain/Line.js';
import type { Stage } from '../domain/Stage.js';
import { stageOrdinal } from '../domain/Stage.js';

/** One component entering a composed context, normalized for the check. */
export interface CoherenceComponent {
  /** Provenance label used in defect reports (e.g. 'scenario-seed', 'npc-rendering', 'facet:stake'). */
  readonly source: string;
  readonly line: Line;
  readonly stage: Stage;
  /** Load-bearing components must be exactly at the target stage; texture may be ±1. */
  readonly loadBearing: boolean;
}

export interface CoherenceTarget {
  readonly line: Line;
  readonly stage: Stage;
}

export interface CoherenceDefect {
  readonly source: string;
  readonly componentStage: Stage;
  readonly targetStage: Stage;
  /** The canon rule the combination violated. */
  readonly rule: 'load-bearing-off-stage' | 'texture-beyond-adjacent' | 'line-outside-target';
  readonly detail: string;
}

export interface CoherenceVerdict {
  readonly coherent: boolean;
  readonly defects: readonly CoherenceDefect[];
}

/**
 * Validate a composed combination. Pure, deterministic, fail-closed: `coherent === false` means
 * the caller must NOT deliver the context as-is — it re-composes, or the cell defers (45 §5.2.1).
 */
export function checkCoherence(
  components: readonly CoherenceComponent[],
  target: CoherenceTarget,
): CoherenceVerdict {
  const defects: CoherenceDefect[] = [];
  const targetOrd = stageOrdinal(target.stage);

  for (const c of components) {
    const ord = stageOrdinal(c.stage);

    // Load-bearing component at a different altitude: the catalyst itself is compromised.
    if (c.loadBearing && c.stage !== target.stage) {
      defects.push({
        source: c.source,
        componentStage: c.stage,
        targetStage: target.stage,
        rule: 'load-bearing-off-stage',
        detail: `${c.source} speaks at ${c.stage} but carries load for ${target.stage} — the catalyst's meaning changes with its altitude (46 §11 facet incoherence)`,
      });
      continue;
    }

    // Texture beyond adjacency: subordinate texture may differ by one altitude at most.
    if (!c.loadBearing && c.stage !== target.stage && Math.abs(ord - targetOrd) > 1) {
      defects.push({
        source: c.source,
        componentStage: c.stage,
        targetStage: target.stage,
        rule: 'texture-beyond-adjacent',
        detail: `${c.source} is ${c.stage} texture against a ${target.stage} target — beyond ±1 adjacency, this reads as a different simulation (44 altitude separation)`,
      });
    }

    // Line outside the target: the composed entity drifted off the catalyst's line entirely.
    if (c.line !== target.line) {
      defects.push({
        source: c.source,
        componentStage: c.stage,
        targetStage: target.stage,
        rule: 'line-outside-target',
        detail: `${c.source} belongs to ${c.line}, not the target line ${target.line} — cross-line content is texture at most and must be declared, not mixed silently`,
      });
    }
  }

  return { coherent: defects.length === 0, defects };
}

/**
 * Convenience: check a scenario seed against its own declared cell (the seed's stage coherence is
 * enforced at authoring time by this — the seed IS load-bearing for its cell).
 */
export function checkSeedSelfCoherence(
  seed: { readonly line: Line; readonly stage: Stage; readonly id: string },
): CoherenceVerdict {
  return checkCoherence(
    [{ source: `seed:${seed.id}`, line: seed.line, stage: seed.stage, loadBearing: true }],
    { line: seed.line, stage: seed.stage },
  );
}

/**
 * The library-level audit: every seed must be self-coherent by construction (it declares its own
 * cell), so this is really a check that the collection is COMPLETE and non-duplicative — the
 * authoring invariant, run by the calibration harness.
 */
export function auditSeedLibrary(
  seeds: readonly { readonly id: string; readonly line: Line; readonly stage: Stage }[],
): { readonly ok: boolean; readonly problems: readonly string[] } {
  const problems: string[] = [];
  const seen = new Map<string, number>();
  for (const s of seeds) {
    const key = `${s.line}:${s.stage}`;
    seen.set(key, (seen.get(key) ?? 0) + 1);
    const verdict = checkSeedSelfCoherence(s);
    if (!verdict.coherent) problems.push(...verdict.defects.map((d) => d.detail));
  }
  for (const [key, n] of seen) {
    if (n > 1) problems.push(`duplicate seeds for ${key} (${n})`);
  }
  return { ok: problems.length === 0, problems };
}
