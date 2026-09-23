/**
 * The composition runtime — Phase 13 d7 (`46 §6.1/§7`; the plan's "composition engine status
 * resolved: routed through the facet-store compiler, or documented authoring-only. No third
 * option").
 *
 * Resolution: ROUTED. `compose()` was test-only (audit finding); the live library's scenario
 * tier was authored seeds + a derived skeleton, with no constraint-solved ENTITY ever
 * instantiated in production. This module runs the composition pipeline (46 §7 steps 1–5) over
 * the compiled facet store at service-creation time: one Situation entity per (cell ×
 * modality) whose pull is non-empty, deterministic from the store (same store ⇒ same entities),
 * and feeds them into the candidate library as the `composed:` tier.
 *
 * Degradation: a cell whose facet pull is empty (or whose poles hit an aversion) composes
 * NOTHING — the authored seed and the derived skeleton still carry the cell. Composition never
 * blocks, never fabricates (46 §7: the facet stock is canon; composition solves from it).
 *
 * Veil safety: composed entities are corpus-derived canon (facet payloads + tag ids); nothing
 * here reads C1/C2 state (MY-AD-0020 §3 — the same class the runtime bridge holds).
 */

import { ALL_LINES } from '../domain/Line.js';
import { ALL_STAGES } from '../domain/Stage.js';
import { ALL_MODALITIES } from '../domain/enums.js';
import type { FacetStore } from '../world/facets/FacetStore.js';
import type { TagStore } from '../world/tags/dialectic.js';
import { compose, type ComposedHolon } from './composition.js';
import type { PoleSelection } from './dialecticEngine.js';
import { selectPoles, pairKeyOf } from './dialecticEngine.js';
import type { PoolCandidate } from './pooling.js';
import type { TagId } from '../world/tags/types.js';

/** The composed entity as a pool candidate — the `composed:` scenario tier. */
export function composedAsCandidate(entity: ComposedHolon): PoolCandidate {
  // The entity's tag payload is the CHARACTERISTICS it was composed from — the facet stock's
  // own vocabulary, matched against the UDV like every candidate's tags. A holon's modality is
  // optional; an unmodal entity cannot serve a modality-matched pool slot, so it registers on
  // the FIRST modality as a carrier (the pool's modality-fitness filter still applies).
  const tags = [...new Set(entity.composedOf.map((b) => b.characteristic))] as unknown as readonly TagId[];
  const modality = entity.modality ?? ALL_MODALITIES[0]!;
  return {
    id: `composed:${entity.id}`,
    cell: { line: entity.line, stage: entity.stage, modality },
    tags,
    stratum: 0,
    depthFloor: 0,
    landsIn: tags,
  };
}

/**
 * Run the composition pipeline over the whole store: one Situation per (cell × modality) with a
 * non-empty, aversion-free pull. Deterministic; same store ⇒ byte-identical entity set.
 *
 * The dialectic poles for each cell use a FIXED fluent seed (the origin tag) and empty state —
 * composition-time pole selection is canon-level (which facets solve the entity), not
 * player-level personalization, which happens later at the pooling seam.
 */
export function composeSituationLibrary(
  store: FacetStore,
  tags: TagStore,
): { readonly entities: readonly ComposedHolon[]; readonly candidates: readonly PoolCandidate[]; readonly failures: number } {
  const entities: ComposedHolon[] = [];
  const candidates: PoolCandidate[] = [];
  let failures = 0;
  // Deterministic pole per pass: the spiral mode over the two canon fluent tags with their
  // pairs held in active-tension (the same shape G22 composes under). Composition-time pole
  // selection solves WHICH facets bind — it is not player personalization, which happens at
  // the pooling seam.
  const poles: PoleSelection = selectPoles(tags, {
    mode: 'spiral',
    fluentTags: ['technology', 'craft'],
    aversions: [],
    states: {
      [pairKeyOf('technology', 'nature')]: 'active-tension',
      [pairKeyOf('craft', 'music')]: 'active-tension',
    },
  });
  for (const line of ALL_LINES) {
    for (const stage of ALL_STAGES) {
      for (const modality of ALL_MODALITIES) {
        try {
          const result = compose(store, tags, {
            purpose: { line, stage, modality, shadowQuadrant: null },
            poles,
            aversions: [],
            seed: (line.length * 31 + stage.length * 17 + modality.length) * 7919,
          });
          entities.push(result.entity);
          candidates.push(composedAsCandidate(result.entity));
        } catch {
          failures += 1; // empty pull / aversion: the cell composes nothing this pass
        }
      }
    }
  }
  return { entities, candidates, failures };
}
