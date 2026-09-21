/**
 * Runtime bridge — the seam between the personalization module and the game loop (46 §7 steps
 * 1–6 executed for a LIVE encounter). The orchestrator calls `composeWorldTexture` when building
 * its LLM context; everything degrades gracefully to `undefined` so an absent/partial store can
 * never break a session — the pre-personalization pipeline remains the fallback.
 *
 * Veil safety: facet payloads are corpus-derived canon prose; nothing here reads C1/C2 state, so
 * the block is safe for LLM conditioning (MY-AD-0020 §3 — this is not a projection of the player,
 * it is the world's own texture).
 */

import type { Line } from '../domain/Line.js';
import type { Stage } from '../domain/Stage.js';
import type { Modality } from '../domain/enums.js';
import type { ComposedWorldTexture } from '../../infra/llm/ContextPipeline.js';
import type { FacetStore } from '../world/facets/FacetStore.js';
import type { Facet } from '../world/facets/types.js';

function textOf(f: Facet | undefined): string {
  if (!f) return '';
  const p = f.payload;
  switch (p.kind) {
    case 'role-archetype': return `${p.archetype} — ${p.narrativeFunction}`;
    case 'stake': return `wants ${p.wants}; can lose ${p.canLose}`;
    case 'pressure-lever': return p.lever;
    case 'voice-register': return p.register;
    case 'surface-aesthetic': return p.aesthetic;
    case 'polarity-texture': return p.modes.join(' / ');
    case 'relationship-pattern': return p.binding;
    case 'memory-schema': return p.records;
    default: return '';
  }
}

/** Prefer the `@Modality` variant; fall back to the un-varianted base facet if any. */
function pick(store: FacetStore, line: Line, stage: Stage, characteristic: string, modality: Modality): Facet | undefined {
  return store.byKey(`${line}:${stage}:${characteristic}@${modality}`)
    ?? store.byKey(`${line}:${stage}:${characteristic}`);
}

export interface ComposeWorldInput {
  readonly line: Line;
  readonly stage: Stage;
  readonly modality: Modality;
  readonly facets: FacetStore;
  /** Shadow-quadrant selection from the encounter, if the scheduler named one. */
  readonly shadowQuadrant?: string | null;
}

/**
 * Compose the world texture for one encounter (46 §7 steps 3–5, minimal-form). Deterministic:
 * same cell + modality + store ⇒ same texture. Returns `undefined` when the cell has no facets at
 * all (so the prompt stays clean instead of printing an empty block).
 */
export function composeWorldTexture(input: ComposeWorldInput): ComposedWorldTexture | undefined {
  const { line, stage, modality } = input;
  const cell = [
    pick(input.facets, line, stage, 'role-archetype', modality),
    pick(input.facets, line, stage, 'stake', modality),
    pick(input.facets, line, stage, 'pressure-lever', modality),
    pick(input.facets, line, stage, 'voice-register', modality),
    pick(input.facets, line, stage, 'surface-aesthetic', modality),
    pick(input.facets, line, stage, 'polarity-texture', modality),
    pick(input.facets, line, stage, 'relationship-pattern', modality),
    pick(input.facets, line, stage, 'memory-schema', modality),
  ].filter((f): f is Facet => f !== undefined);

  if (cell.length === 0) return undefined;

  const shadow = input.shadowQuadrant
    ? pick(input.facets, line, stage, 'shadow-expression', modality)
    : undefined;
  void shadow; // shadow-expression rendering joins via ShadowContentGenerator (43's split)

  const texture: ComposedWorldTexture = {
    role: textOf(cell.find((f) => f.characteristic === 'role-archetype')),
    stake: textOf(cell.find((f) => f.characteristic === 'stake')),
    lever: textOf(cell.find((f) => f.characteristic === 'pressure-lever')),
    voice: textOf(cell.find((f) => f.characteristic === 'voice-register')),
    aesthetic: textOf(cell.find((f) => f.characteristic === 'surface-aesthetic')),
    polarity: textOf(cell.find((f) => f.characteristic === 'polarity-texture')),
    relationship: textOf(cell.find((f) => f.characteristic === 'relationship-pattern')),
    memory: textOf(cell.find((f) => f.characteristic === 'memory-schema')),
  };
  const any = Object.values(texture).some((v) => v.trim().length > 0);
  return any ? texture : undefined;
}
