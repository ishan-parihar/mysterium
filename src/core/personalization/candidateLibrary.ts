/**
 * The candidate library seeds — 45 §5's three libraries (world / NPC / scenario) as DATA.
 *
 * Pooling (pooling.ts) retrieves from a `CandidateLibrary`; the runtime needs actual candidates to
 * rank. These seeds are DERIVED, not authored in parallel: every candidate's tags come from the
 * compiled facet store's own tag assignments for the cell, and NPC candidates are derived from the
 * authored holon corpus (the SAME holons the owner workers write — one identity, not two, per
 * MY-RG-0015's derive-don't-duplicate).
 *
 * `PoolCandidate.cell` names the catalyst cell the candidate can carry (45 §5.2.1's structural
 * claim: a candidate is a RENDERING of a cell, so many candidates can carry one cell, and one
 * candidate can be rendered into many cells only by re-derivation — never by mutation).
 *
 * Scenario candidates are generated per (line × stage × modality) cell from the cell's facet tags:
 * the same 64-cell grid the concept-draft corpus is organized by, which keeps the library coverage
 * provable by the calibration harness's own math.
 */

import type { Line } from '../domain/Line.js';
import { ALL_STAGES } from '../domain/Stage.js';
import type { Stage } from '../domain/Stage.js';
import { ALL_LINES } from '../domain/Line.js';
import type { Modality } from '../domain/enums.js';
import { ALL_MODALITIES } from '../domain/enums.js';
import type { PoolCandidate } from './pooling.js';
import type { FacetStore } from '../world/facets/FacetStore.js';
import { INITIAL_TAGS } from '../world/tags/initialTags.js';
import { NPC_SEEDS, type NpcSeed } from './npcSeeds.js';
import type { TagId } from '../world/tags/types.js';
import { SCENARIO_SEEDS } from './scenarioSeeds.js';
import type { ScenarioSeed } from './scenarioSeeds.js';
import { WORLD_SEEDS } from './worldSeeds.js';
import type { WorldSeed } from './worldSeeds.js';

/** The 8 stages as authored — the ladder the concept-drafts grid by. */
/** Strata (18 §5): seeds live in the player-visible base layer. */
const BASE_STRATUM = 0;
/** Depth floor (31 §3.5a): seeds carry no depth gate. */
const BASE_DEPTH_FLOOR = 0;

/**
 * A topic→tag resolver over the initial tag set. Tags are `TagId` strings; the resolver is
 * case-insensitive and matches by id or label so LLM-derived topic strings ("music", "Craft")
 * resolve without a second vocabulary. Unknown topics return undefined — the query builder
 * drops them (45 §5.1: an unresolvable interest contributes no weight; it never fails the query).
 */
export function initialTopicTagResolver(topic: string): TagId | undefined {
  const needle = topic.trim().toLowerCase();
  if (needle.length === 0) return undefined;
  const byId = INITIAL_TAGS.find((t) => t.id.toLowerCase() === needle);
  if (byId) return byId.id;
  const byLabel = INITIAL_TAGS.find((t) => t.label.toLowerCase() === needle);
  if (byLabel) return byLabel.id;
  return undefined;
}

/**
 * The library for one cell (line × stage × modality), derived from the facet store's own tags.
 * The store is fail-closed on unresolved tags (46 §11 invariant 4), so every tag emitted here is
 * already store-valid — the seed layer cannot break pooling by inventing a vocabulary.
 */
function cellCandidates(store: FacetStore, line: Line, stage: Stage, modality: Modality): readonly PoolCandidate[] {
  // Collect the union of tags the cell's facets carry — the cell's texture vocabulary.
  const tagWeights = new Map<TagId, number>();
  for (const f of store.moduleFacets(line, stage)) {
    for (const t of f.tags) tagWeights.set(t, (tagWeights.get(t) ?? 0) + (f.tagAffinity[t] ?? 0.5));
  }
  const tags = [...tagWeights.keys()];
  if (tags.length === 0) return [];

  // landsIn: the domains this candidate speaks in (45 §5.3 relevance bias) — the cell's own tags.
  const landsIn = tags;

  const world: PoolCandidate = {
    id: `world:${line}:${stage}:${modality}`,
    cell: { line, stage, modality },
    tags,
    stratum: BASE_STRATUM,
    depthFloor: BASE_DEPTH_FLOOR,
    landsIn,
  };

  // The scenario rendering of the same cell — distinct id, same carrier capacity.
  const scenario: PoolCandidate = {
    id: `scenario:${line}:${stage}:${modality}`,
    cell: { line, stage, modality },
    tags,
    stratum: BASE_STRATUM,
    depthFloor: BASE_DEPTH_FLOOR,
    landsIn,
  };

  return [world, scenario];
}

/**
 * Derive NPC candidates from the authored holon corpus. One holon = one NPC candidate carrying
 * the cells its (line, stage) names, tagged by the holon's own narrative vocabulary mapped onto
 * the tag store. The mapping is deliberately conservative: only tags whose affinity surfaces in
 * the holon's role/relationship strings resolve — an unresolvable holon yields no candidate
 * (degradation, never fabrication).
 */
export function deriveNpcCandidates(holons: readonly { readonly id: string; readonly line: Line; readonly stage: Stage; readonly narrativeRole: string; readonly relationships: readonly string[] }[]): readonly PoolCandidate[] {
  const out: PoolCandidate[] = [];
  for (const h of holons) {
    // Vocabulary: role + relationship words matched against the initial tag set.
    const words = [...h.narrativeRole.split(/[^a-z]+/i), ...h.relationships.flatMap((r) => r.split(/[^a-z]+/i))]
      .map((w) => w.toLowerCase())
      .filter((w) => w.length > 3);
    const tags = [...new Set(words.map((w) => initialTopicTagResolver(w)).filter((t): t is TagId => t !== undefined))];
    for (const modality of ALL_MODALITIES) {
      out.push({
        id: `npc:${h.id}:${modality}`,
        cell: { line: h.line, stage: h.stage, modality },
        tags,
        stratum: BASE_STRATUM,
        depthFloor: BASE_DEPTH_FLOOR,
        landsIn: tags,
      });
    }
  }
  return out;
}

/**
 * The AUTHORED scenario renderings (46 §2's scenario library; 46 §11's anti-static-reassertion
 * rule is honoured because these are seeds — canonical situations per cell — not finished
 * entities; composition still instantiates them into entities from facets). One authored seed per
 * cell, registered per modality so the modality-fitness filter can match them.
 */
export function seedScenarioCandidates(seeds: readonly ScenarioSeed[] = SCENARIO_SEEDS): readonly PoolCandidate[] {
  const out: PoolCandidate[] = [];
  for (const s of seeds) {
    for (const modality of ALL_MODALITIES) {
      out.push({
        id: `scenario-authored:${s.line}:${s.stage}:${modality}`,
        cell: { line: s.line, stage: s.stage, modality },
        tags: [...s.tags],
        stratum: BASE_STRATUM,
        depthFloor: BASE_DEPTH_FLOOR,
        landsIn: [...s.tags],
      });
    }
  }
  return out;
}

/**
 * The AUTHORED world renderings (46 §2's world library) — the authored PLACE tier that deepens
 * the world library beyond the derived facet-tag skeletons. One authored place per cell
 * (`worldSeeds.ts`), registered per modality like the scenario seeds. The authored candidate
 * ranks ahead of the skeleton within the tier when tags tie (sessionRuntime's prefix sort),
 * because its place text is the cell's canon.
 */
export function seedWorldCandidates(seeds: readonly WorldSeed[] = WORLD_SEEDS): readonly PoolCandidate[] {
  const out: PoolCandidate[] = [];
  for (const s of seeds) {
    for (const modality of ALL_MODALITIES) {
      out.push({
        id: `world-authored:${s.line}:${s.stage}:${modality}`,
        cell: { line: s.line, stage: s.stage, modality },
        tags: [...s.tags],
        stratum: BASE_STRATUM,
        depthFloor: BASE_DEPTH_FLOOR,
        landsIn: [...s.tags],
      });
    }
  }
  return out;
}

/**
 * The AUTHORED NPC renderings (46 §2's NPC library; Phase 11 d7) — the authored PERSONA tier:
 * one canonical figure per cell (`npcSeeds.ts`), registered per modality like the scenario and
 * world tiers. Ranks ahead of the derived-from-holons `npc:` skeleton within the tier when tags
 * tie (the persona prose is the cell's canon).
 */
export function seedNpcCandidates(seeds: readonly NpcSeed[] = NPC_SEEDS): readonly PoolCandidate[] {
  const out: PoolCandidate[] = [];
  for (const s of seeds) {
    for (const modality of ALL_MODALITIES) {
      out.push({
        id: `npc-authored:${s.line}:${s.stage}:${modality}`,
        cell: { line: s.line, stage: s.stage, modality },
        tags: [...s.tags],
        stratum: BASE_STRATUM,
        depthFloor: BASE_DEPTH_FLOOR,
        landsIn: [...s.tags],
      });
    }
  }
  return out;
}

/**
 * The full seeded library: 64 cells × 7 modalities × 2 derived renderings (world + skeleton
 * scenario) + the 64×7 authored scenario-seed registrations + the 64×7 authored world-seed
 * registrations + NPC derivations from the authored corpus. Deterministic; safe to rebuild per
 * process (pure data, no I/O).
 */
export function seedCandidateLibrary(store: FacetStore): readonly PoolCandidate[] {
  const out: PoolCandidate[] = [];
  for (const line of ALL_LINES) {
    for (const stage of ALL_STAGES) {
      for (const modality of ALL_MODALITIES) {
        out.push(...cellCandidates(store, line, stage, modality));
      }
    }
  }
  out.push(...seedScenarioCandidates());
  out.push(...seedWorldCandidates());
  out.push(...seedNpcCandidates());
  return out;
}
