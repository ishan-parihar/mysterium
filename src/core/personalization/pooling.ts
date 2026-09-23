/**
 * Context pooling — 45 §5 (`docs/foundations/45-personalization-and-context-pooling.md`).
 *
 * A retrieval-then-rank pipeline that runs BEFORE `24`'s selection, producing the candidate set the
 * priority formula ranks. It is NOT a second scheduler (45 §5.3: relevance is a multiplicative bias
 * on the eight criteria, never a hard filter on the developmental decision, never a parallel queue).
 *
 * Pipeline: UDV → query (§5.1) → library retrieval → constraint filter (§5.2) → candidate set → (24).
 *
 * The veto is a ROUTING rule, never a scheduling rule (§5.2.1): an aversion removes renderings and
 * never targets. When the aversive candidate is the only carrier of the required catalyst cell, the
 * cell DEFERS and the deferral is recorded — it never overrides the player's stated boundary.
 */

import type { Line } from '../domain/Line.js';
import type { Stage } from '../domain/Stage.js';
import type { Modality } from '../domain/enums.js';
import type { TagId } from '../world/tags/types.js';
import type { TagStore } from '../world/tags/dialectic.js';
import type { UserDimensionalityVector } from './udv.js';
import { selectPoles, type PoleSelection, type PolarityStateMap, type DialecticMode } from './dialecticEngine.js';

/** A pooled candidate — one rendering of one catalyst cell (45 §5.2.1's structural claim). */
export interface PoolCandidate {
  readonly id: string;
  /** Which cell this candidate carries: the deferral rule operates on cells, not candidates. */
  readonly cell: { readonly line: Line; readonly stage: Stage; readonly modality: Modality };
  /** Library tags — matched against the UDV's interest graph and analogy domains. */
  readonly tags: readonly TagId[];
  /** Perceptibility stratum (18 §5) — 0 is the player-visible base layer. */
  readonly stratum: number;
  /** Depth floor (31 §3.5a, 24 §3.2.8) — above the player's depth, texture only. */
  readonly depthFloor: number;
  /** Which player-interested domains this candidate speaks in — the relevance bias (§5.3). */
  readonly landsIn: readonly string[];
}

export type CandidateLibrary = readonly PoolCandidate[];

/** 45 §5.1 — the weighted term set in three bands. */
export interface PoolQuery {
  /** interest terms — high weight (the UDV's interest graph, tags resolved). */
  readonly interestTerms: readonly { readonly tag: TagId; readonly weight: number }[];
  /** analogical vocabulary — high weight, surface rendering (fluent domains → tags). */
  readonly analogyTerms: readonly { readonly tag: TagId; readonly weight: number }[];
  /** purpose terms — medium weight. */
  readonly purposeTerms: readonly { readonly tag: TagId; readonly weight: number }[];
  /** aversions — never terms; the veto list rides alongside (§5.2 rule 3). */
  readonly aversions: readonly string[];
}

/** Interest topic → tag resolution. Topics that don't resolve to a tag are not terms (fail-soft). */
export type TopicTagResolver = (topic: string) => TagId | undefined;

export function buildQuery(store: TagStore, udv: UserDimensionalityVector, resolve: TopicTagResolver): PoolQuery {
  void store; // threaded for future direct tag lookups; resolution goes through `resolve` today
  const byTag = new Map<TagId, number>();
  const add = (topic: string, weight: number, sink: Map<TagId, number>) => {
    const t = resolve(topic);
    if (t === undefined) return;
    sink.set(t, Math.max(sink.get(t) ?? 0, weight));
  };

  const interests = new Map<TagId, number>();
  for (const i of udv.interests) add(i.topic, i.weight, interests);
  const purpose = new Map<TagId, number>();
  for (const p of udv.purpose) add(p.statement, 0.5, purpose);
  const analogy = new Map<TagId, number>();
  for (const d of udv.analogy.fluentDomains) add(d.domain, d.weight, analogy);

  void byTag;
  return {
    interestTerms: [...interests].map(([tag, weight]) => ({ tag, weight })),
    analogyTerms: [...analogy].map(([tag, weight]) => ({ tag, weight })),
    purposeTerms: [...purpose].map(([tag, weight]) => ({ tag, weight })),
    aversions: udv.aversions,
  };
}

/** 45 §5.2 — the hard constraint filter, in order. */
export function constraintFilter(
  candidates: CandidateLibrary,
  opts: {
    readonly query: PoolQuery;
    /** player's perceptibility depth (18 §5) — candidates above render only as lower strata. */
    readonly maxStratum: number;
    /** player's depth (31 §3.5a) — above this, candidates are texture, not primary. */
    readonly playerDepth: number;
    /** the candidate's modality must be able to probe the target (45 §5.2 rule 5). */
    readonly targetModality: Modality;
  },
): { readonly primary: readonly PoolCandidate[]; readonly texture: readonly PoolCandidate[] } {
  const primary: PoolCandidate[] = [];
  const texture: PoolCandidate[] = [];

  for (const c of candidates) {
    // Rule 1 — Veil: handled by the caller's veil-filtered view (20); this pipeline receives only
    // candidates already inside the veil. (Structural: the input type cannot carry veiled content.)
    // Rule 2 — perceptibility strata: above the player's layer → texture only.
    // Rule 3 — aversion veto: enforced by routeWithVeto (the pipeline's ROUTING step, §5.2.1) so
    //          the deferral record can see exactly which carriers were removed and why.
    // Rule 4 — depth: floor above the player → texture only.
    // Rule 5 — modality fitness: only candidates whose modality can probe the target stay primary.
    const isTexture = c.stratum > opts.maxStratum || c.depthFloor > opts.playerDepth;
    if (isTexture) {
      texture.push(c);
      continue;
    }
    if (c.cell.modality !== opts.targetModality) continue;
    primary.push(c);
  }
  return { primary, texture };
}

/** 45 §5.2.1 — the veto is a routing rule: cells defer, they are never forced. */
export interface DeferralRecord {
  readonly cell: { readonly line: Line; readonly stage: Stage; readonly modality: Modality };
  /** The veto that caused the deferral — diagnostic in its own right (45 §5.2.1). */
  readonly causedBy: string;
  readonly at: number;
}

export function routeWithVeto(
  primary: readonly PoolCandidate[],
  texture: readonly PoolCandidate[],
  target: { readonly line: Line; readonly stage: Stage; readonly modality: Modality },
  aversions: readonly string[],
  now: number,
  deferred: DeferralRecord[],
): readonly PoolCandidate[] {
  // Rule 3 — the aversion veto removes RENDERINGS unconditionally (45 §5.2 rule 3).
  const veto = new Set(aversions);
  const kept = primary.filter((c) => !veto.has(c.id) && !c.tags.some((t) => veto.has(t)));
  const carriers = kept.filter((c) => c.cell.line === target.line && c.cell.stage === target.stage);

  // §5.2.1 — the veto is a routing rule: another carrier of the same cell absorbs it invisibly
  // (the vetoed rendering is dropped, the alternative offered). Only when the vetoed candidate was
  // the cell's SOLE carrier does the cell defer — with the veto recorded, never forced.
  if (carriers.length > 0) return carriers;

  const removedCarriers = [...primary, ...texture].some(
    (c) =>
      c.cell.line === target.line &&
      c.cell.stage === target.stage &&
      (veto.has(c.id) || c.tags.some((t) => veto.has(t))),
  );
  if (removedCarriers) {
    deferred.push({ cell: target, causedBy: 'aversion veto — sole carrier of the cell (45 §5.2.1)', at: now });
  }
  return [];
}

/** 45 §5.3 — relevance-to-UDV as a RANK, the bias `24` multiplies by; never a selection.
 *
 * Normalized (Phase 13 d10): raw tag-sum scores rewarded BROAD vectors (a candidate carrying 12
 * tags including the fluent one outranked the candidate carrying EXACTLY the fluent flavour),
 * which silently re-flattened the derived library's distinctions. The score is now the weighted
 * term mass as a FRACTION of the vector, plus a small breadth prior so equal coverage still
 * prefers the fuller rendering. This is what makes the UDV's fluent domain the retrieval key:
 * a music-fluent player meets the music-recoloured variant, not whichever candidate happens to
 * be biggest. */
export function rankByRelevance(candidates: readonly PoolCandidate[], query: PoolQuery): readonly PoolCandidate[] {
  const weights = new Map<TagId, number>();
  for (const t of query.interestTerms) weights.set(t.tag, (weights.get(t.tag) ?? 0) + t.weight);
  for (const t of query.analogyTerms) weights.set(t.tag, (weights.get(t.tag) ?? 0) + t.weight);
  for (const t of query.purposeTerms) weights.set(t.tag, (weights.get(t.tag) ?? 0) + t.weight);
  const anyTerm = weights.size > 0;

  return [...candidates].sort((a, b) => score(b) - score(a) || a.id.localeCompare(b.id));
  function score(c: PoolCandidate): number {
    if (!anyTerm) return 0; // no query ⇒ no bias: library order stands (45 §5.3's degradation)
    let mass = 0;
    let total = 0;
    for (const t of c.tags) {
      const w = weights.get(t);
      total += 1;
      if (w !== undefined) mass += w;
    }
    for (const l of c.landsIn) {
      const w = weights.get(l as TagId);
      if (w !== undefined) mass += w * 0.5;
    }
    const breadth = Math.min(1, c.tags.length / 12) * 0.05; // small prior; never decides alone
    return total > 0 ? mass / total + breadth : breadth;
  }
}

/**
 * The full pooling step (45 §5) up to but not including `24`'s selection.
 * Returns the ranked candidates, the texture set, the poles chosen for the composition step, and
 * the deferrals recorded this pass.
 */
export function pool(
  store: TagStore,
  udv: UserDimensionalityVector,
  candidates: CandidateLibrary,
  opts: {
    readonly mode: DialecticMode;
    readonly states: PolarityStateMap;
    readonly target: { readonly line: Line; readonly stage: Stage; readonly modality: Modality };
    readonly maxStratum: number;
    readonly playerDepth: number;
    readonly resolve: TopicTagResolver;
    readonly now: number;
  },
): {
  readonly ranked: readonly PoolCandidate[];
  readonly texture: readonly PoolCandidate[];
  readonly poles: PoleSelection | null;
  readonly deferrals: readonly DeferralRecord[];
} {
  const query = buildQuery(store, udv, opts.resolve);
  const { primary, texture } = constraintFilter(candidates, {
    query,
    maxStratum: opts.maxStratum,
    playerDepth: opts.playerDepth,
    targetModality: opts.target.modality,
  });
  const deferrals: DeferralRecord[] = [];
  const routed = routeWithVeto(primary, texture, opts.target, query.aversions, opts.now, deferrals);
  const ranked = rankByRelevance(routed, query);

  // Poles: the dialectic engine decides the HOW. On failure the cell defers — never a forced pole.
  let poles: PoleSelection | null = null;
  try {
    poles = selectPoles(store, {
      mode: opts.mode,
      fluentTags: query.analogyTerms.map((t) => t.tag),
      aversions: query.aversions,
      states: opts.states,
    });
  } catch {
    deferrals.push({ cell: opts.target, causedBy: 'no eligible structural pole (46 §5.3)', at: opts.now });
  }

  return { ranked, texture, poles, deferrals };
}
