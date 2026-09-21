/**
 * The three-library views + composition pipeline — 46 §3/§6/§7, 45 §2.
 *
 * ONE store, three views (46 §6.1): world (altitude ≥ group), NPC (individual/dyadic), scenario
 * (kind = Situation). A view is a declared projection with its own index — not a second store
 * (MY-RG-0015: derive what can be derived).
 *
 * `Situation` is a holon kind (46 §3.1): a locus, a cast and a stake form an emergent whole with
 * its own developmental signature — the same move as 18 §2.2's dyadic relationship, one step out.
 * The canonical `Holon` kind taxonomy gains `Situation`; holons gain the `library` discriminator
 * and the optional `composedOf` facet-binding record.
 *
 * The composition pipeline (46 §7) generates entities; it does NOT invent canon. The facet stock
 * is canon; the composition is constraint-solved from it and reproducible from its recorded
 * `(facet keys, tag query, seed)` (46 §7.1 — invariant 1).
 */

import type { Line } from '../domain/Line.js';
import type { Stage } from '../domain/Stage.js';
import type { Holon, HolonDriveState } from '../world/Holon.js';
import type { HolonKind, Modality, ShadowQuadrant, EnergeticDirection } from '../domain/enums.js';
import type { Drive } from '../domain/Drive.js';
import { ALL_HOLON_KINDS } from '../domain/enums.js';
import type { Characteristic, TagId } from '../world/tags/types.js';
import { CHARACTERISTICS } from '../world/tags/types.js';
import type { Facet } from '../world/facets/types.js';
import type { FacetStore } from '../world/facets/FacetStore.js';
import type { TagStore } from '../world/tags/dialectic.js';
import type { PoleSelection } from './dialecticEngine.js';

// ─────────────────────────────────────────────────────────────────────────────
// Holon-kind extension (46 §3.1)
// ─────────────────────────────────────────────────────────────────────────────

/** The canonical kind taxonomy (enums.ts) extended with the emergent-composition kind. */
export const ALL_HOLON_KINDS_EXTENDED: readonly (HolonKind | 'Situation')[] = Object.freeze([
  ...ALL_HOLON_KINDS,
  'Situation',
] as (HolonKind | 'Situation')[]);

export type ExtendedHolonKind = (typeof ALL_HOLON_KINDS_EXTENDED)[number];

/** 45 §2 — the three libraries, as a discriminator on the holon record (46 §3.1 consequence). */
export type Library = 'world' | 'npc' | 'scenario';

/** 46 §3.1 consequence for `22 §2.1`: the composedOf facet-binding record. */
export interface ComposedOfBinding {
  readonly facetKey: string;
  readonly characteristic: Characteristic;
  /** The composition order this facet was applied in (dependency order, 46 §7 step 5). */
  readonly order: number;
}

/** A composed holon: the canonical record plus the composition provenance fields. */
export interface ComposedHolon extends Omit<Holon, 'kind'> {
  readonly kind: ExtendedHolonKind;
  /** Which of the three libraries this holon is playing a role in (46 §3.1). */
  readonly library: Library;
  /** The facet bindings the entity was composed from — the reproducibility record. */
  readonly composedOf: readonly ComposedOfBinding[];
  /** The composition record id in the CompositionStore (46 §7.1). */
  readonly compositionId: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// The three views (46 §6.1) — declared projections with their own index
// ─────────────────────────────────────────────────────────────────────────────

// Altitude ≥ group is expressed via `kind` in this codebase (18 §2's mapping: Faction/
// Location/Event are the collective-altitude kinds; NPC/Creature/Artifact are individual).
const WORLD_KINDS: readonly HolonKind[] = ['Faction', 'Location', 'Event'];

export interface LibraryViews {
  /** Altitude ≥ group — regions, cultures, organisations, ecosystems (45 §2 world library). */
  readonly world: ReadonlyMap<string, ComposedHolon>;
  /** Individual/dyadic altitude — agents with drives, voice, memory (45 §2 NPC library). */
  readonly npc: ReadonlyMap<string, ComposedHolon>;
  /** kind = Situation — situation templates, the unit of instantiation (45 §2 scenario library). */
  readonly scenario: ReadonlyMap<string, ComposedHolon>;
}

export function buildLibraryViews(holons: readonly ComposedHolon[]): LibraryViews {
  const world = new Map<string, ComposedHolon>();
  const npc = new Map<string, ComposedHolon>();
  const scenario = new Map<string, ComposedHolon>();
  for (const h of holons) {
    if (h.kind === 'Situation') scenario.set(h.id, h);
    else if (WORLD_KINDS.includes(h.kind as HolonKind)) world.set(h.id, h);
    else npc.set(h.id, h);
  }
  return { world, npc, scenario };
}

// ─────────────────────────────────────────────────────────────────────────────
// The composition pipeline (46 §7)
// ─────────────────────────────────────────────────────────────────────────────

/** 45 §2 invariant — the ONLY shape a scenario template may declare (DG-deferred, now enforced). */
export interface ScenarioTemplate {
  readonly locus_kind: string;
  readonly cast_shape: readonly string[];
  readonly catalyticPurpose: { readonly line: Line; readonly stage: Stage };
  readonly modality: Modality;
  readonly stake_kind: string;
  readonly pressure_levers: readonly string[];
}

export interface CompositionRequest {
  /** Step 1 — PURPOSE: the catalytic target from 24/16. Composition never substitutes it (§11 inv 5). */
  readonly purpose: { readonly line: Line; readonly stage: Stage; readonly modality: Modality; readonly shadowQuadrant: ShadowQuadrant | null };
  /** Step 2 — TAG QUERY: the poles from the dialectic engine. */
  readonly poles: PoleSelection;
  /** Aversion veto re-checked at composition time (45 §3.1 rule 2 — fail-closed twice). */
  readonly aversions: readonly string[];
  /** Bind target: an existing holon id, or instantiate a fresh Situation/NPC. */
  readonly bindTo?: string;
  readonly template?: ScenarioTemplate;
  /** Deterministic seed (46 §7.1). */
  readonly seed: number;
}

export interface CompositionResult {
  readonly entity: ComposedHolon;
  readonly facets: readonly Facet[];
  /** The reproducibility record (46 §7.1, invariant 1). */
  readonly record: { readonly facetKeys: readonly string[]; readonly tagQuery: readonly TagId[]; readonly seed: number };
}

/** Deterministic hash → [0,1). Same construction as the scaffold library's tie-break. */
function hash01(n: number): number {
  let x = (n | 0) + 0x6d2b79f5;
  x = Math.imul(x ^ (x >>> 15), 1 | x);
  x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
  return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
}

/**
 * Invariant 3: no composed entity may contain a facet whose line/stage is outside its declared
 * composition target. Enforced as a filter, then asserted.
 */
function facetsInTarget(store: FacetStore, line: Line, stage: Stage): Facet[] {
  const out: Facet[] = [];
  for (const c of CHARACTERISTICS) {
    const f = store.byCharacteristic(c, line, stage);
    if (f.length > 0) out.push(...f);
  }
  return out;
}

/**
 * Invariant 5 + 46 §5.3: a facet tagged with an aversion is dropped unconditionally. Composition
 * never overrides an aversion — if that empties the pull, the composition fails closed and the
 * caller defers (45 §5.2.1).
 */
function withoutAversions(facets: readonly Facet[], aversions: readonly string[]): Facet[] {
  if (aversions.length === 0) return [...facets];
  const veto = new Set(aversions);
  return facets.filter((f) => !f.tags.some((t) => veto.has(t)));
}

/** Facet ranking: tag affinity to the selected poles × deterministic seed tie-break. */
function rankFacets(facets: readonly Facet[], poles: PoleSelection, seed: number): Facet[] {
  return [...facets].sort((a, b) => {
    const affA = affinityOf(a, poles);
    const affB = affinityOf(b, poles);
    if (affB !== affA) return affB - affA;
    return hash01(seed + a.key.length * 31 + a.key.charCodeAt(0)) - hash01(seed + b.key.length * 31 + b.key.charCodeAt(0));
  });
}

function affinityOf(f: Facet, poles: PoleSelection): number {
  // Highest affinity to either pole wins: the surface pole makes it land, the structure pole
  // makes it train. A facet with no affinity to either is filler.
  return Math.max(scoreAgainst(f, poles.surface), scoreAgainst(f, poles.structure));
}

function scoreAgainst(f: Facet, tag: { readonly id: TagId }): number {
  const direct = f.tagAffinity[tag.id];
  if (direct !== undefined) return direct;
  if (f.tags.includes(tag.id)) return 0.5;
  return 0;
}

/** Dependency order: a characteristic's composites must apply after their dependencies (46 §7 step 5). */
export function compositionOrder(characteristics: readonly Characteristic[]): Characteristic[] {
  const order: Characteristic[] = [];
  const placed = new Set<Characteristic>();
  // Stable two-phase: primitives first (those nothing in the set depends on), then composites
  // after all their composedWith partners that are present.
  const remaining = [...characteristics];
  let progressed = true;
  while (remaining.length > 0 && progressed) {
    progressed = false;
    for (let i = remaining.length - 1; i >= 0; i -= 1) {
      const c = remaining[i];
      const deps = COMPOSITE_DEPS[c] ?? [];
      const unmet = deps.filter((d) => remaining.includes(d));
      if (unmet.length === 0) {
        order.push(c);
        placed.add(c);
        remaining.splice(i, 1);
        progressed = true;
      }
    }
  }
  if (remaining.length > 0) {
    // Cycle — fail closed rather than emit an incoherent order.
    throw new Error(`composition order: dependency cycle among [${remaining.join(', ')}] (46 §11 facet incoherence)`);
  }
  void placed;
  return order;
}

/**
 * The composite map (46 §2.2's COMPOSED_WITH, reduced to ordering constraints). A characteristic
 * listed here must be applied after each of its listed partners present in the pull.
 */
const COMPOSITE_DEPS: Readonly<Record<Characteristic, readonly Characteristic[]>> = Object.freeze({
  'drive-profile': [],
  'shadow-expression': ['drive-profile'],
  'polarity-texture': ['drive-profile'],
  'voice-register': ['drive-profile'],
  'role-archetype': ['shadow-expression', 'voice-register'],
  stake: ['drive-profile'],
  'pressure-lever': ['stake'],
  'surface-aesthetic': ['voice-register'],
  'relationship-pattern': ['role-archetype'],
  'memory-schema': ['relationship-pattern'],
});

/** Step 4 — BIND: pick the holon identity. */
function bindIdentity(req: CompositionRequest, existing: ComposedHolon | undefined, seed: number, index: number): { name: string; kind: ExtendedHolkKindBox; id: string } {
  if (existing) return { name: existing.name, kind: existing.kind, id: existing.id };
  const kind: ExtendedHolonKind = req.template ? 'Situation' : 'NPC';
  const entropy = Math.floor(hash01(seed + index * 977) * 1e6);
  return {
    name: req.template ? `situation-${req.template.locus_kind}-${entropy}` : `npc-${entropy}`,
    kind,
    id: `composed-${seed}-${index}`,
  };
}
type ExtendedHolkKindBox = ExtendedHolonKind;

/**
 * The composition pipeline (46 §7 steps 1–5). Steps 6 (envelope) and 7 (memory) are the caller's —
 * this function is pure and deterministic: same inputs, same entity (46 §7.1).
 */
export function compose(
  facets: FacetStore,
  tags: TagStore,
  req: CompositionRequest,
  existing?: ComposedHolon,
): CompositionResult {
  void tags; // the poles arrive resolved; the store is threaded for future coherence checks
  void existing;

  // Step 2 re-check: aversion excludes both poles and every tagged facet.
  const poles = req.poles;
  const veto = new Set(req.aversions);
  if (veto.has(poles.surface.id) || veto.has(poles.structure.id)) {
    throw new Error('composition: a selected pole is in the aversion set — defer the cell (45 §5.2.1, 46 §11 inv 5)');
  }

  // Step 3 — FACET PULL: the target cell only (invariant 3), aversion-filtered (invariant 5).
  let pulled = facetsInTarget(facets, req.purpose.line, req.purpose.stage);
  pulled = withoutAversions(pulled, req.aversions);
  if (pulled.length === 0) {
    throw new Error(
      `composition: empty facet pull for ${req.purpose.line}:${req.purpose.stage} after aversion filter — defer (46 §7 step 3)`,
    );
  }

  const ranked = rankFacets(pulled, poles, req.seed);

  // Step 5 — COMPOSE in dependency order.
  const orderedCharacteristics = compositionOrder(ranked.map((f) => f.characteristic));
  const byCharacteristic = new Map(ranked.map((f) => [f.characteristic, f]));
  const bindings: ComposedOfBinding[] = orderedCharacteristics.map((c, i) => ({
    facetKey: byCharacteristic.get(c)!.key,
    characteristic: c,
    order: i,
  }));
  const appliedFacets = bindings.map((b) => byCharacteristic.get(b.characteristic)!);

  const bound = bindIdentity(req, undefined, req.seed, 0);
  const entity: ComposedHolon = {
    id: bound.id,
    name: bound.name,
    kind: bound.kind,
    library: bound.kind === 'Situation' ? 'scenario' : 'npc',
    line: req.purpose.line,
    stage: req.purpose.stage,
    drives: drivesFromFacets(appliedFacets),
    polarity: 'Diffuse',
    narrativeRole: roleFromFacets(appliedFacets, req),
    relationships: [],
    modality: req.purpose.modality,
    active: true,
    composedOf: bindings,
    compositionId: `cmp-${req.seed}`,
  };

  return {
    entity,
    facets: appliedFacets,
    record: {
      facetKeys: bindings.map((b) => b.facetKey),
      tagQuery: [poles.surface.id, poles.structure.id],
      seed: req.seed,
    },
  };
}

function drivesFromFacets(applied: readonly Facet[]): HolonDriveState {
  const driveFacet = applied.find((f) => f.characteristic === 'drive-profile');
  const rows = driveFacet && driveFacet.payload.kind === 'drive-profile' ? driveFacet.payload.rows : [];
  const firstOf = (domain: string): Drive => {
    const row = rows.find((r) => r.domain === domain);
    if (row) return row.drive as Drive;
    return 'Agency';
  };
  const shadowFacet = applied.find((f) => f.characteristic === 'shadow-expression');
  const quadrant =
    shadowFacet && shadowFacet.payload.kind === 'shadow-expression' && shadowFacet.payload.quadrants[0]
      ? (shadowFacet.payload.quadrants[0].quadrant as ShadowQuadrant)
      : null;
  return {
    dominant: firstOf('Dark'),
    secondary: firstOf('Golden'),
    shadowQuadrant: quadrant,
  };
}

function roleFromFacets(applied: readonly Facet[], req: CompositionRequest): string {
  const roleFacet = applied.find((f) => f.characteristic === 'role-archetype');
  if (roleFacet && roleFacet.payload.kind === 'role-archetype') return roleFacet.payload.archetype;
  return req.template ? `situation:${req.template.locus_kind}` : 'unbound';
}

// ─────────────────────────────────────────────────────────────────────────────
// CompositionStore (46 §6.2, §7.1)
// ─────────────────────────────────────────────────────────────────────────────

export interface CompositionRecordEntry {
  readonly id: string;
  readonly facetKeys: readonly string[];
  readonly tagQuery: readonly TagId[];
  readonly seed: number;
  readonly poles: { readonly surface: TagId; readonly structure: TagId };
  readonly reason: string;
}

export interface CompositionStore {
  readonly entries: readonly CompositionRecordEntry[];
  record(entry: CompositionRecordEntry): void;
  /** Replay determinism (46 §7.1): same record → same facet set. Facet keys are the identity. */
  replay(entry: CompositionRecordEntry, facets: FacetStore): readonly Facet[];
}

export function createCompositionStore(): CompositionStore {
  const entries: CompositionRecordEntry[] = [];
  return {
    entries,
    record(entry) {
      entries.push(entry);
    },
    replay(entry, facets) {
      return entry.facetKeys
        .map((k) => facets.byKey(k))
        .filter((f): f is Facet => f !== undefined);
    },
  };
}

/** Type-level guard used by tests: an EnergeticDirection import that keeps the union honest. */
export type PolarityCheck = EnergeticDirection;
