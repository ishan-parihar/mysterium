/**
 * The scaffold library — 47 §6 (`docs/foundations/47-preference-inference-and-scaffolding.md`).
 *
 * A scaffold is a structural arrangement of a facet sequence — HOW composed content is presented —
 * independent of the content itself. It is a selectable object with a compatibility set and a
 * fading rule, not a decision re-made per encounter.
 *
 * Selection (§6.3) is a multiplicative bias in the same seam as every other bias (MY-AD-0008):
 * never a second scheduler, never a filter around 24. Deterministic over (profile, target, seed).
 * The catalyst target is fixed BEFORE selection — a scaffold arranges; it never chooses what is
 * being developed.
 */

import type { Stage } from '../../domain/Stage.js';
import { stageOrdinal } from '../../domain/Stage.js';

export type ScaffoldId =
  | 'worked-example' | 'stepped-ladder' | 'choice-set' | 'estrangement' | 'immersion'
  | 'compare-and-contrast' | 'quest-chain' | 'moment-press' | 'witness-and-invite' | 'solo-inquiry';

export interface Scaffold {
  readonly id: ScaffoldId;
  readonly arranges: string;
  /** §4 meta-program readings that favour it (a partial fit map, -1..1 per reading). */
  readonly selectedBy: Readonly<Partial<Record<string, number>>>;
  readonly modalities: readonly string[];
  readonly depthFloor: number;
  readonly stageFloor: Stage;
  /** §6.4 fading DAG edge. */
  readonly fadesTo: readonly ScaffoldId[];
  /** §6.4 — null only for the terminal scaffold. */
  readonly maxExposures: number | null;
}

/** §6.2 — the ten. */
export const SCAFFOLDS: readonly Scaffold[] = [
  {
    id: 'worked-example', arranges: 'a full model, then a partial, then independent practice',
    selectedBy: { global_specific: -0.6, options_procedures: -0.8 }, modalities: ['Deterministic', 'Strategic'],
    depthFloor: 0, stageFloor: 'Infrared', fadesTo: ['stepped-ladder'], maxExposures: 8,
  },
  {
    id: 'stepped-ladder', arranges: 'the procedure given first; choices only after it is executable',
    selectedBy: { options_procedures: -0.7, global_specific: -0.4 }, modalities: ['Deterministic', 'Strategic', 'Embodied'],
    depthFloor: 0, stageFloor: 'Magenta', fadesTo: ['choice-set'], maxExposures: 10,
  },
  {
    id: 'choice-set', arranges: 'options first; the principle is discovered from consequences',
    selectedBy: { options_procedures: 0.8, global_specific: 0.5, proactive_reactive: 0.4 },
    modalities: ['ScenarioChoice', 'Strategic', 'ImmersiveRPG'], depthFloor: 1, stageFloor: 'Amber',
    fadesTo: ['solo-inquiry'], maxExposures: 12,
  },
  {
    id: 'estrangement', arranges: 'the dialectical opposite is the structure, the familiar domain the surface (46 §5.1)',
    selectedBy: {}, modalities: ['ImmersiveRPG', 'LanguageReflective', 'SocialCooperative'],
    depthFloor: 1, stageFloor: 'Red', fadesTo: ['immersion'], maxExposures: null,
  },
  {
    id: 'immersion', arranges: 'wholly in the target domain, no bridge at all',
    selectedBy: { sameness_difference: 0.7 }, modalities: ['ImmersiveRPG', 'Embodied'],
    depthFloor: 2, stageFloor: 'Orange', fadesTo: ['estrangement'], maxExposures: 12,
  },
  {
    id: 'compare-and-contrast', arranges: 'two instances differing on exactly one dimension',
    selectedBy: { sameness_difference: -0.6 }, modalities: ['Deterministic', 'LanguageReflective', 'ScenarioChoice'],
    depthFloor: 1, stageFloor: 'Amber', fadesTo: ['solo-inquiry'], maxExposures: 10,
  },
  {
    id: 'quest-chain', arranges: 'one consequence horizon spanning several encounters',
    selectedBy: { in_time_through_time: 0.8, proactive_reactive: 0.4 }, modalities: ['ImmersiveRPG', 'Strategic'],
    depthFloor: 1, stageFloor: 'Amber', fadesTo: ['solo-inquiry'], maxExposures: 10,
  },
  {
    id: 'moment-press', arranges: 'one scene, immediate and recoverable stakes',
    selectedBy: { in_time_through_time: -0.8, proactive_reactive: 0.4 }, modalities: ['ScenarioChoice', 'Embodied', 'ImmersiveRPG'],
    depthFloor: 0, stageFloor: 'Red', fadesTo: ['quest-chain'], maxExposures: 12,
  },
  {
    id: 'witness-and-invite', arranges: 'an NPC models the act; the player is invited to follow',
    selectedBy: { proactive_reactive: -0.7, independent_proximity_cooperative: 0.5 },
    modalities: ['SocialCooperative', 'ImmersiveRPG'], depthFloor: 0, stageFloor: 'Magenta',
    fadesTo: ['choice-set'], maxExposures: 10,
  },
  {
    id: 'solo-inquiry', arranges: 'no guide; the situation alone',
    selectedBy: { independent_proximity_cooperative: -0.7, global_specific: 0.4, options_procedures: 0.4 },
    modalities: ['ImmersiveRPG', 'LanguageReflective', 'Strategic'],
    depthFloor: 2, stageFloor: 'Orange', fadesTo: [], maxExposures: null, // terminal
  },
];

export const SCAFFOLD_BY_ID: ReadonlyMap<ScaffoldId, Scaffold> = new Map(SCAFFOLDS.map((s) => [s.id, s]));

/** §6.3 compatibility set. */
export interface SelectionInput {
  readonly metaProgramProfile: Readonly<Record<string, number>>; // -1..1 per §4 reading
  readonly depth: number;                                       // 31 depth level
  readonly stage: Stage;
  readonly modality: string;
  /** exposures per scaffold id so far — the fading rule's counter (§6.4). */
  readonly exposures: Readonly<Record<string, number>>;
  /** deterministic seed (46 §7.1 — recorded with the inputs). */
  readonly seed: number;
  /** aversion veto (45 §3.1 rule 2) — scaffold ids the player has excluded. */
  readonly vetoed?: readonly ScaffoldId[];
}

export interface SelectionRecord {
  readonly scaffold: ScaffoldId;
  readonly fit: number;
  readonly inputs: SelectionInput; // §6.3 determinism — recorded with its inputs
}

/** Deterministic hash → [0,1) for tie-breaking on the seed. */
function hash01(n: number): number {
  let x = (n | 0) + 0x6d2b79f5;
  x = Math.imul(x ^ (x >>> 15), 1 | x);
  x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
  return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
}

export function selectScaffold(input: SelectionInput): SelectionRecord {
  const compatible = SCAFFOLDS.filter((s) => {
    if (input.vetoed?.includes(s.id)) return false;                       // aversion veto (rule 2)
    if (!s.modalities.includes(input.modality)) return false;             // modality compatibility
    if (input.depth < s.depthFloor) return false;                         // 31 depth floor
    if (stageOrdinal(input.stage) < stageOrdinal(s.stageFloor)) return false; // 02 stage floor
    const seen = input.exposures[s.id] ?? 0;
    if (s.maxExposures !== null && seen >= s.maxExposures) return false;  // §6.4 fading
    return true;
  });
  if (compatible.length === 0) throw new Error('scaffold selection: empty compatibility set (47 §6.3)');

  let best: Scaffold | undefined;
  let bestScore = -Infinity;
  for (const s of compatible) {
    // fit(s, metaProgramProfile): multiplicative over the readings the scaffold is sensitive to
    let fit = 1;
    let touched = 0;
    for (const [program, affinity] of Object.entries(s.selectedBy) as [string, number][]) {
      const reading = input.metaProgramProfile[program];
      if (reading === undefined) continue;
      fit *= 1 + affinity * reading; // affinity·reading aligned → >1; opposed → <1
      touched += 1;
    }
    // an unread profile yields a neutral 1.0 — scaffolds still compete on determinism alone
    if (touched === 0) fit = 1;
    // deterministic tie-break on the seed
    const score = fit * 1000 + hash01(input.seed + s.id.length * 31 + s.id.charCodeAt(0));
    if (score > bestScore) { bestScore = score; best = s; }
  }
  if (best === undefined) throw new Error('scaffold selection: no compatible scaffold');
  return { scaffold: best.id, fit: bestScore, inputs: input };
}

/** §6.4 fading: after a scaffold hits maxExposures, selection naturally moves down fadesTo. */
export function fadeTargets(id: ScaffoldId): readonly ScaffoldId[] {
  return SCAFFOLD_BY_ID.get(id)?.fadesTo ?? [];
}
