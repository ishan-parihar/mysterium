/**
 * Facet model — 46 §2 (`docs/foundations/46-generative-world-composition.md`).
 *
 * A facet is the smallest independently varying unit of world content, keyed by
 * [line × stage × characteristic] — the exact grid the concept-draft corpus is organized by.
 * Facets are composed (not concatenated) into entities; `composedWith` names the other
 * characteristics a facet transforms.
 */

import type { Line } from '../../domain/Line.js';
import type { Stage } from '../../domain/Stage.js';
import type { Characteristic, TagId } from '../tags/types.js';

export type FacetKey = string; // `${line}:${stage}:${characteristic}`

export type FacetSource = 'corpus' | 'authored' | 'generated';

/** Characteristic-specific payload, discriminated by the facet's characteristic. */
export type FacetPayload =
  | { readonly kind: 'drive-profile'; readonly rows: readonly DriveProfileRow[] }
  | { readonly kind: 'shadow-expression'; readonly quadrants: readonly ShadowQuadrantExpr[] }
  | { readonly kind: 'polarity-texture'; readonly modes: readonly string[] }
  | { readonly kind: 'voice-register'; readonly modality: string; readonly register: string; readonly imagery: string }
  | { readonly kind: 'role-archetype'; readonly archetype: string; readonly narrativeFunction: string }
  | { readonly kind: 'stake'; readonly wants: string; readonly canLose: string }
  | { readonly kind: 'pressure-lever'; readonly modality: string; readonly lever: string }
  | { readonly kind: 'surface-aesthetic'; readonly modality: string; readonly aesthetic: string }
  | { readonly kind: 'relationship-pattern'; readonly binding: string }
  | { readonly kind: 'memory-schema'; readonly records: string };

export interface DriveProfileRow {
  readonly drive: string;      // Agency | Communion | Eros | Agape
  readonly domain: string;     // Dark | Golden
  readonly healthy: string;    // healthy expression (→1.0)
  readonly pathological: string; // pathological pole (→0.0)
}

export interface ShadowQuadrantExpr {
  readonly quadrant: string;    // DarkAddiction | DarkAllergy | GoldenAddiction | GoldenAllergy
  readonly name: string;        // the archetype's name, e.g. "The Compulsive Strategist"
  readonly corePattern: string;
  readonly behaviouralSignatures: readonly string[];
  readonly atmanDefense: string;
}

export interface Facet {
  readonly key: FacetKey;
  readonly line: Line;
  readonly stage: Stage;
  readonly characteristic: Characteristic;
  readonly tags: readonly TagId[];
  readonly tagAffinity: Readonly<Record<TagId, number>>;
  readonly payload: FacetPayload;
  readonly composedWith: readonly Characteristic[];
  readonly source: FacetSource;
  readonly generationSeed?: number;
}

/** The characteristics each characteristic composes WITH (46 §2.2 — the load-bearing transformer map). */
export const COMPOSED_WITH: Readonly<Record<Characteristic, readonly Characteristic[]>> = Object.freeze({
  'drive-profile': [],
  'shadow-expression': ['drive-profile', 'pressure-lever'],
  'polarity-texture': ['shadow-expression'],
  'voice-register': ['stake', 'surface-aesthetic'],
  'role-archetype': ['relationship-pattern', 'stake'],
  'stake': ['pressure-lever', 'drive-profile'],
  'pressure-lever': ['shadow-expression'],
  'surface-aesthetic': ['voice-register'],
  'relationship-pattern': ['memory-schema'],
  'memory-schema': [],
});
