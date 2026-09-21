/**
 * PolarityEngine — 4-level polarity aggregation.
 * Spec: foundations/19 §4, §6
 *
 * GAP-WB-1: Now wired to PolarityOntology — texture names are used for
 * narrative conditioning. The ContextPipeline and ConsequenceNarrator
 * can query getTextureName() to get stage-appropriate polarity texture
 * language for LLM prompt conditioning and narrative feedback.
 */
import type { Line } from '../domain/Line.js';
import { ALL_LINES } from '../domain/Line.js';
import type { Stage } from '../domain/Stage.js';
import { stageOrdinal } from '../domain/Stage.js';
import type { EnergeticDirection, PolarityMode } from '../domain/enums.js';
import type { PolarityTrace } from '../domain/PolarityTrace.js';
import type {
  LineProfile,
  MasterPolarity,
  PolarityCellVector,
  PolarityState,
} from '../domain/PolarityCellVector.js';
import { getTexture, DEFAULT_POLARITY_ONTOLOGY, type PolarityTexture } from '../data/PolarityOntology.js';

const CRYSTALLIZATION_THRESHOLD = 0.8;
const CRYSTALLIZING_THRESHOLD = 0.5;
const COHERENT_LINE_THRESHOLD = 0.6;
const MIN_LINES_FOR_MASTER = 6;

function cellKey(line: Line, stage: Stage): string {
  return `${line}:${stage}`;
}

/**
 * Compute crystallization via spec formula (foundations/19 §B2).
 * crystallization = coherence × sigmoid((traceCount - 5) / 7)
 */
export function computeCrystallization(coherence: number, traceCount: number): number {
  const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));
  return coherence * sigmoid((traceCount - 5) / 7);
}

/** Record a new polarity trace into the state, updating the relevant cell. */
export function recordTrace(state: PolarityState, trace: PolarityTrace, line: Line, stage: Stage): PolarityState {
  const key = cellKey(line, stage);
  const existing = state.cells[key] ?? {
    dominantPattern: null,
    exploratoryBreadth: 1,
    coherence: 0,
    crystallization: 0,
    traceCount: 0,
    textureId: key,
  };

  const count = existing.traceCount + 1;
  const dir = trace.energeticDirection;

  // Update dominant pattern via exponential moving average logic
  const matchesDominant = existing.dominantPattern === dir;
  const newCoherence = matchesDominant
    ? existing.coherence + (1 - existing.coherence) * 0.1
    : existing.coherence * 0.9;

  const newDominant = newCoherence < 0.3 ? dir : existing.dominantPattern ?? dir;
  const newBreadth = matchesDominant
    ? existing.exploratoryBreadth * 0.95
    : Math.min(1, existing.exploratoryBreadth + 0.05);

  const newCrystallization = computeCrystallization(newCoherence, count);

  const updatedCell: PolarityCellVector = {
    dominantPattern: newDominant,
    exploratoryBreadth: newBreadth,
    coherence: newCoherence,
    crystallization: newCrystallization,
    traceCount: count,
    textureId: existing.textureId,
  };

  const cells = { ...state.cells, [key]: updatedCell };
  const lineProfiles = computeAllLineProfiles(cells);
  const master = computeMasterPolarity(Object.values(lineProfiles));

  return { cells, lineProfiles, master };
}

/** Compute coherence for a single cell. */
export function computeCellCoherence(cell: PolarityCellVector): number {
  return cell.coherence;
}

/** Compute line profile from all cells belonging to that line. */
export function computeLineProfile(cells: PolarityCellVector[]): LineProfile {
  if (cells.length === 0) return { direction: null, coherence: 0, mode: 'Exploring' };

  const totalCoherence = cells.reduce((sum, c) => sum + c.coherence, 0) / cells.length;
  const totalCrystallization = cells.reduce((sum, c) => sum + c.crystallization, 0) / cells.length;

  // Find dominant direction across cells
  const dirCounts: Record<string, number> = {};
  for (const c of cells) {
    if (c.dominantPattern) {
      dirCounts[c.dominantPattern] = (dirCounts[c.dominantPattern] ?? 0) + 1;
    }
  }
  const dominant = Object.entries(dirCounts).sort((a, b) => b[1] - a[1])[0];
  const direction = dominant ? dominant[0] as EnergeticDirection : null;

  let mode: PolarityMode = 'Exploring';
  if (totalCrystallization >= CRYSTALLIZATION_THRESHOLD) mode = 'Crystallized';
  else if (totalCrystallization >= CRYSTALLIZING_THRESHOLD) mode = 'Crystallizing';

  return { direction, coherence: totalCoherence, mode };
}

function computeAllLineProfiles(cells: Readonly<Record<string, PolarityCellVector>>): Record<string, LineProfile> {
  const profiles: Record<string, LineProfile> = {};
  for (const line of ALL_LINES) {
    const lineCells = Object.entries(cells)
      .filter(([k]) => k.startsWith(`${line}:`))
      .map(([_, v]) => v);
    profiles[line] = computeLineProfile(lineCells);
  }
  return profiles;
}

/** Compute master polarity from all line profiles. */
export function computeMasterPolarity(profiles: LineProfile[], altitudes?: Readonly<Record<string, Stage>>): MasterPolarity {
  const coherentLines = profiles.filter(p => p.coherence >= COHERENT_LINE_THRESHOLD);
  const coherentCount = coherentLines.length;

  // Find dominant direction across coherent lines
  const dirCounts: Record<string, number> = {};
  for (const p of coherentLines) {
    if (p.direction) {
      dirCounts[p.direction] = (dirCounts[p.direction] ?? 0) + 1;
    }
  }
  const dominant = Object.entries(dirCounts).sort((a, b) => b[1] - a[1])[0];
  const dominantDirection = dominant ? dominant[0] as EnergeticDirection : null;

  const avgCrystallization = profiles.length > 0
    ? profiles.reduce((sum, p) => sum + (p.mode === 'Crystallized' ? 1 : p.mode === 'Crystallizing' ? 0.5 : 0), 0) / profiles.length
    : 0;

  let mode: PolarityMode = 'Exploring';
  // P1-20: Add altitude_floor ≥ Orange check per foundations/19 §5.
  // Previously a Red-stage player with 6 coherent lines could be promoted to
  // 'Crystallizing' — the spec explicitly forbids this. Now we require the
  // player's current stage ≥ Orange for crystallization. When altitudes is not
  // provided (backward compat), the check is skipped.
  const ORANGE_ORDINAL = stageOrdinal('Orange');
  const playerStageOrdinal = altitudes
    ? Math.min(...Object.values(altitudes).map(s => stageOrdinal(s)))
    : ORANGE_ORDINAL; // default to passing if no altitudes provided
  const meetsAltitudeFloor = playerStageOrdinal >= ORANGE_ORDINAL;

  if (coherentCount >= MIN_LINES_FOR_MASTER && avgCrystallization >= CRYSTALLIZATION_THRESHOLD && meetsAltitudeFloor) {
    mode = 'Crystallized';
  } else if (coherentCount >= MIN_LINES_FOR_MASTER && avgCrystallization >= CRYSTALLIZING_THRESHOLD && meetsAltitudeFloor) {
    mode = 'Crystallizing';
  }

  return { mode, dominantDirection, coherentLineCount: coherentCount, crystallizationProgress: avgCrystallization };
}

// ---------------------------------------------------------------------------
// Eligibility and the Harvest are two different things (`19 §9.6`)
// ---------------------------------------------------------------------------
//
//   Choice-eligibility — a CONDITION: is this entity's Choice structurally authentic at all?
//                        Evaluated continuously; produces a STATE. Never an event.
//   The Harvest        — an EVENT: polarity locks, archive, retirement.
//                        eligibility ∧ arrival at the sub-octave closure (the Violet event).
//                        Fires once, at the apex.
//
// The function here was called `checkHarvest` and its verdict gated the post-Turquoise
// continuation directly, so a *condition* triggered an *event*. The rename is not cosmetic: the
// old name meant every reader — and every test — treated "the player qualifies" as "the player
// has finished", which is what let `Exploring → Harvesting` sit in the lifecycle table as a legal
// transition for a player who had crystallized nothing.

export interface ChoiceEligibility {
  readonly eligible: boolean;
  readonly direction: 'STO' | 'STS' | null;
  readonly reason: string;
}

/** Arrival at the sub-octave closure — the Violet event, `06 §7.4` / `19 §9.6`. */
export interface ClosureArrival {
  readonly reached: boolean;
  readonly reason: string;
}

export interface ChoiceState extends ChoiceEligibility {
  readonly closure: ClosureArrival;
  /**
   * The Harvest EVENT: eligibility **∧** arrival. Never true on eligibility alone, and never true
   * before the closure — that conjunction is the whole difference between the two rows of
   * `19 §9.6`'s table.
   */
  readonly harvestEvent: boolean;
}

/**
 * Choice-readiness: is genuine self-conscious choice available at all?
 *
 * `01.4 §2.5.3` — D3 is the minimum density at which real choice is possible, so no authentic
 * Choice exists below it. This is deliberately NOT a claim that the harvest happens at a
 * particular Mysterium stage; `19 §9.6` re-expressed the old `altitude_floor ≥ Orange` criterion
 * as readiness for exactly that reason. The numeric bound is unchanged — the meaning is now
 * honest about what it is testing.
 */
export const CHOICE_READY_ORDINAL = stageOrdinal('Orange');

export function isChoiceReady(altitudes: Readonly<Record<string, Stage>>): boolean {
  const ordinals = Object.values(altitudes).map(s => stageOrdinal(s));
  if (ordinals.length === 0) return false;
  return Math.min(...ordinals) >= CHOICE_READY_ORDINAL;
}

/**
 * The rays the Violet expression must show distinctly — `lenses/rays.md` → "Harvest condition".
 *
 * The condition is a **rainbow-distinctness** one, not a threshold on the Violet total: a harvestable
 * expression is "tinged with a distinct green/blue/indigo rainbow … each color distinct, none
 * bypassed". Green is love/compassion, Blue is wisdom, Indigo is the gateway — and "none bypassed"
 * is the operative clause. This is why `rayProfile.Violet` is an independently accumulated quantity
 * rather than a lookup of the top stage's ray, and why checking the Violet total alone is NOT the
 * condition.
 */
export const RAINBOW_RAYS = ['Green', 'Blue', 'Indigo'] as const;

/** Every ray of the rainbow must be genuinely integrated, not merely present. */
export const RAINBOW_RAY_FLOOR = 0.5;

/**
 * And none may be *bypassed*: a ray an order of magnitude below its siblings was skipped, and a
 * gateway reached by skipping compassion is not the gateway. Expressed as a floor on min/max.
 */
export const RAINBOW_DISTINCTNESS_FLOOR = 0.5;

export function rainbowDistinctness(
  rayProfile: Readonly<Record<string, number>>,
): { ok: boolean; reason: string } {
  const values = RAINBOW_RAYS.map(r => rayProfile[r] ?? 0);
  const weakest = RAINBOW_RAYS[values.reduce((lo, v, i) => (v < values[lo]! ? i : lo), 0)]!;
  const lowest = Math.min(...values);
  const highest = Math.max(...values);

  const below = RAINBOW_RAYS.filter(r => (rayProfile[r] ?? 0) < RAINBOW_RAY_FLOOR);
  if (below.length > 0) {
    return {
      ok: false,
      reason: `rainbow not integrated: ${below.map(r => `${r} ${(rayProfile[r] ?? 0).toFixed(2)}`).join(', ')} < ${RAINBOW_RAY_FLOOR}`,
    };
  }
  if (highest > 0 && lowest / highest < RAINBOW_DISTINCTNESS_FLOOR) {
    return {
      ok: false,
      reason: `rainbow not distinct: ${weakest} ${lowest.toFixed(2)} is bypassed against the strongest ray ${highest.toFixed(2)}`,
    };
  }
  return { ok: true, reason: `rainbow distinct (min/max ${highest > 0 ? (lowest / highest).toFixed(2) : 'n/a'})` };
}

/**
 * Arrival at the sub-octave closure: every line has completed the final stage of readiness (L8
 * Turquoise, `06 §5.1`). This is the Arrow's landing, not a reward — eligibility says the Choice is
 * authentic; arrival says the traversal it is made *from* is complete.
 */
export function subOctaveClosureReached(
  altitudes: Readonly<Record<string, Stage>>,
): ClosureArrival {
  const entries = Object.entries(altitudes);
  if (entries.length === 0) return { reached: false, reason: 'no line altitudes recorded' };
  const below = entries.filter(([, stage]) => stage !== 'Turquoise');
  if (below.length > 0) {
    return {
      reached: false,
      reason: `sub-octave closure not reached: ${below.length}/${entries.length} line(s) short of L8 Turquoise (${below.map(([l, s]) => `${l} ${s}`).slice(0, 3).join(', ')}${below.length > 3 ? ', …' : ''})`,
    };
  }
  return { reached: true, reason: `sub-octave closure reached: all ${entries.length} lines at L8 Turquoise` };
}

/**
 * CHOICE-ELIGIBILITY (`19 §5`, §9.2–§9.4) — the condition, evaluated continuously.
 *
 * Requirements:
 * - STO: mode='Crystallized', direction='STO', ≥6 coherent lines, choice-ready,
 *   mean(direction_strength) ≥ 0.51, violet_ray_integration ≥ 0.8, rainbow distinct
 * - STS: mode='Crystallized', direction='STS', ≥7 coherent lines, choice-ready,
 *   mean(direction_strength) ≥ 0.95 (stricter — STS requires near-total absorption efficiency),
 *   violet_ray_integration ≥ 0.8, rainbow distinct
 *
 * The 51% / 95% asymmetry follows from source-flow coupling: STO source=above (inexhaustible) →
 * a slight opening suffices; STS source=below (finite) → near-total efficiency required.
 *
 * The returned state is **never** an endgame trigger — see `evaluateChoice` for the event.
 */
export function checkChoiceEligibility(
  master: MasterPolarity,
  directionStrengths: readonly number[] | null,
  choiceReady: boolean,
  violetRayIntegration: number,
  rayProfile: Readonly<Record<string, number>> = {},
): ChoiceEligibility {
  if (master.mode !== 'Crystallized') {
    return { eligible: false, direction: null, reason: `Master mode is ${master.mode}, not Crystallized` };
  }
  if (!master.dominantDirection) {
    return { eligible: false, direction: null, reason: 'No dominant direction crystallized' };
  }
  if (!choiceReady) {
    return {
      eligible: false,
      direction: null,
      reason: `not choice-ready: a line below the choice-readiness line (${CHOICE_READY_ORDINAL}); no authentic Choice exists below it (01.4 §2.5.3)`,
    };
  }
  if (violetRayIntegration < 0.8) {
    return { eligible: false, direction: null, reason: `Violet-ray integration ${violetRayIntegration.toFixed(2)} < 0.80` };
  }
  // Rainbow distinctness: the Violet total is a SUM, so it can be reached while a ray was skipped.
  const rainbow = rainbowDistinctness(rayProfile);
  if (!rainbow.ok) {
    return { eligible: false, direction: null, reason: rainbow.reason };
  }
  if (!directionStrengths || directionStrengths.length === 0) {
    return { eligible: false, direction: null, reason: 'No direction strengths available' };
  }

  const meanStrength = directionStrengths.reduce((a, b) => a + b, 0) / directionStrengths.length;
  const direction = master.dominantDirection === 'Radiative' ? 'STO' : 'STS';

  if (direction === 'STO') {
    if (master.coherentLineCount < 6) {
      return { eligible: false, direction: null, reason: `STO requires ≥6 coherent lines, found ${master.coherentLineCount}` };
    }
    if (meanStrength < 0.51) {
      return { eligible: false, direction: null, reason: `STO requires mean strength ≥ 0.51, found ${meanStrength.toFixed(3)}` };
    }
    return { eligible: true, direction: 'STO', reason: `STO eligible: ${master.coherentLineCount} coherent lines, mean strength ${meanStrength.toFixed(3)}, ${rainbow.reason}` };
  }
  if (master.coherentLineCount < 7) {
    return { eligible: false, direction: null, reason: `STS requires ≥7 coherent lines, found ${master.coherentLineCount}` };
  }
  if (meanStrength < 0.95) {
    return { eligible: false, direction: null, reason: `STS requires mean strength ≥ 0.95, found ${meanStrength.toFixed(3)}` };
  }
  return { eligible: true, direction: 'STS', reason: `STS eligible: ${master.coherentLineCount} coherent lines, mean strength ${meanStrength.toFixed(3)}, ${rainbow.reason}` };
}

/**
 * THE CHOICE STATE — eligibility plus closure, and the event that is the conjunction.
 *
 * The event fires **once, at the apex**, and the lifecycle machine may only enter `Harvesting`
 * through it (`Significator`'s `VALID_TRANSITIONS` no longer lets `Exploring` reach `Harvesting`
 * directly — that hole let a player who had crystallized nothing lock a polarity for life).
 */
export function evaluateChoice(
  master: MasterPolarity,
  directionStrengths: readonly number[] | null,
  altitudes: Readonly<Record<string, Stage>>,
  violetRayIntegration: number,
  rayProfile: Readonly<Record<string, number>> = {},
): ChoiceState {
  const eligibility = checkChoiceEligibility(
    master, directionStrengths, isChoiceReady(altitudes), violetRayIntegration, rayProfile,
  );
  const closure = subOctaveClosureReached(altitudes);
  const harvestEvent = eligibility.eligible && closure.reached;
  const reason = harvestEvent
    ? `HARVEST: ${eligibility.reason}; ${closure.reason}`
    : eligibility.eligible
      ? `eligible, closure pending — ${closure.reason}`
      : eligibility.reason;
  return { ...eligibility, closure, harvestEvent, reason };
}

/** Detect current polarity mode from master state. */
export function detectCrystallizationMode(master: MasterPolarity): PolarityMode {
  return master.mode;
}

// ─── GAP-WB-1: PolarityOntology integration ──────────────────────────

/**
 * Get the polarity texture name for a (line, stage, direction) combination.
 * Used by ContextPipeline for LLM prompt conditioning and by
 * ConsequenceNarrator for narrative feedback.
 *
 * Example: getPolarityTextureName('Cognitive', 'Red', 'sto')
 * → 'strategic-service'
 */
export function getPolarityTextureName(
  line: Line,
  stage: Stage,
  direction: 'sto' | 'sts' | 'exploratory',
): string | null {
  const texture = getTexture(DEFAULT_POLARITY_ONTOLOGY, line, stage);
  if (!texture) return null;
  return texture[direction] ?? null;
}

/**
 * Get the full PolarityTexture for a (line, stage) combination.
 * Returns all three direction textures (sto, sts, exploratory).
 */
export function getPolarityTexture(line: Line, stage: Stage): PolarityTexture | undefined {
  return getTexture(DEFAULT_POLARITY_ONTOLOGY, line, stage);
}

/**
 * Get the player's current polarity texture based on their master direction.
 * If crystallized STO → returns the sto texture; if STS → returns sts;
 * if Exploring → returns exploratory.
 */
export function getPlayerPolarityTexture(
  state: PolarityState,
  line: Line,
  stage: Stage,
): string | null {
  const masterMode = state.master.mode;
  const dominantDir = state.master.dominantDirection;
  if (masterMode === 'Exploring') {
    return getPolarityTextureName(line, stage, 'exploratory');
  }
  if (dominantDir === 'Radiative') {
    return getPolarityTextureName(line, stage, 'sto');
  }
  if (dominantDir === 'Absorptive') {
    return getPolarityTextureName(line, stage, 'sts');
  }
  return getPolarityTextureName(line, stage, 'exploratory');
}
