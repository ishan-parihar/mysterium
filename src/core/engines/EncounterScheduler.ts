/**
 * EncounterScheduler — selects and ranks encounters using the full priority formula.
 * Spec: foundations/24 (full)
 */
import type { PolarityMode, ShadowQuadrant } from '../domain/enums.js';
import { ALL_LINES, type Line } from '../domain/Line.js';
import type { ScheduledEncounter } from '../domain/EncounterSpecNew.js';
import type { Significator } from '../domain/Significator.js';
import type { ShadowEntry } from '../domain/ShadowLedger.js';
import { generateCandidates, type EncounterCandidate, type WorldState } from './CandidateGeneration.js';
import { computePriority, DEFAULT_WEIGHTS, type SessionContext, type PriorityWeights } from './PriorityComputation.js';
import type { TransformationPhase } from './TransformationDetector.js';
import type { UserMatrixModel } from './UserMatrixModel.js';
// WIRE-1: Import shouldSurfaceReturn to wire Holonic Return into the scheduler
import { shouldSurfaceReturn } from '../usecases/ShadowDetector.js';

/** Threshold: if a line has more than this many unresolved shadows, shadow-work mode activates. */
const SHADOW_WORK_THRESHOLD = 3;

export type { WorldState } from './CandidateGeneration.js';
export type { SessionContext } from './PriorityComputation.js';

// ---------------------------------------------------------------------------
// §3.3 Tie-breaking — a comparator, never a score
// ---------------------------------------------------------------------------

/** Candidates scoring within this band of each other are considered tied (`24 §3.3`). */
export const TIE_BAND = 0.05;

interface ScoredCandidate {
  readonly candidate: EncounterCandidate;
  readonly priority: number;
}

/** Latest positive encounter timestamp for a line; initialized zero means unserved. */
function latestPositiveLineTimestamp(sig: Significator, line: Line): number {
  let newest = 0;
  for (const [key, timestamp] of Object.entries(sig.theta.lastEncounter)) {
    if (key.startsWith(`${line}:`) && timestamp > newest) newest = timestamp;
  }
  return newest;
}

/**
 * Reserve the one developmental primary slot. This is a developmental integrity policy, not a
 * priority score: among eligible lines, the least recently served line receives the first
 * developmental offer. The reserve may cross priority bands; candidate `priority` values remain
 * unchanged, and the remaining ranked offers retain their existing score order. A fresh
 * significator has zero for every cell, so canonical `ALL_LINES` order is the deterministic startup
 * tie-break; it does not claim that one line has greater developmental value. A zero timestamp
 * means never served; later ticks use the newest positive timestamp.
 */
function selectReservedPrimaryByLineCoverage(
  ranked: readonly ScoredCandidate[],
  sig: Significator,
): ScoredCandidate {
  const eligibleLines = new Set<Line>();
  for (const item of ranked) eligibleLines.add(item.candidate.line);

  let primary: ScoredCandidate | undefined;
  let primaryTimestamp = Number.POSITIVE_INFINITY;
  for (const line of ALL_LINES) {
    if (!eligibleLines.has(line)) continue;
    const timestamp = latestPositiveLineTimestamp(sig, line);
    if (timestamp < primaryTimestamp) {
      primary = ranked.find(item => item.candidate.line === line);
      primaryTimestamp = timestamp;
    }
  }
  return primary ?? ranked[0]!;
}

/**
 * Deterministic final key — FNV-1a over the encounter's module ref. Reproducibility is the point
 * (`24 §3.3` rule 5): two runs over the same state must order identically, and an ordering that
 * depends on `Array.prototype.sort` stability or insertion order is not reproducible when the
 * candidate set changes shape.
 */
function refHash(ref: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < ref.length; i++) {
    h ^= ref.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

/**
 * Order candidates within a tie band per `24 §3.3`, rules 1–5 in priority order.
 *
 * Rules 1 and 2 read NOVELTY off the world's recent-encounter trace. They used to be an additive
 * `diversityBonus` inside the score; §3.2.9 moved them here, where canon always had them — a tie
 * band is exactly the set of candidates whose developmental value is indistinguishable, so
 * variety is how a decision gets made *between equals* rather than how a weaker candidate overtakes
 * a stronger one.
 */
function compareWithinBand(
  a: ScoredCandidate,
  b: ScoredCandidate,
  sig: Significator,
  world: WorldState,
): number {
  // `world.recentEncounters` is CHRONOLOGICAL (oldest first) — the generator reads recency off
  // its tail (`slice(-3)` / `slice(-2)`), so "the last 3" is the last three ELEMENTS. Reading the
  // head here would have inverted the rule and made the tie-break prefer what the player had just
  // been doing.
  const trace = world.recentEncounters ?? [];

  // 1. Prefer the line that has gone LONGEST without an encounter — the starvation key.
  //
  // This must precede novelty. A served line can carry a novel modality or line while an unserved
  // line does not; if novelty runs first, the served line wins the comparison and the starved line is
  // never rescued by this key. The key remains a comparator term inside `24 §3.3`'s priority band,
  // not an additive ninth priority criterion (`MY-AD-0025`).
  //
  // A line with NO encountered cell is the most starved of all — 0, older than any timestamp.
  // Determinism is preserved: the key is total and derived from state, not a clock.
  const lastServed = (line: string): number => {
    let newest = 0; // never encountered → oldest possible
    for (const [key, ts] of Object.entries(sig.theta.lastEncounter)) {
      if (key.startsWith(`${line}:`) && ts > newest) newest = ts;
    }
    return newest;
  };
  const aServed = lastServed(a.candidate.line);
  const bServed = lastServed(b.candidate.line);
  if (aServed !== bServed) return aServed - bServed; // smaller timestamp = longer starved = first

  // 2. Prefer a modality absent from the last 3 encounters.
  const recentModalities = trace.slice(-3).map(e => e.modality);
  const aNewModality = !recentModalities.includes(a.candidate.modality);
  const bNewModality = !recentModalities.includes(b.candidate.modality);
  if (aNewModality !== bNewModality) return aNewModality ? -1 : 1;

  // 3. Prefer a line absent from the last 2 encounters.
  const recentLines = trace.slice(-2).map(e => e.line);
  const aNewLine = !recentLines.includes(a.candidate.line);
  const bNewLine = !recentLines.includes(b.candidate.line);
  if (aNewLine !== bNewLine) return aNewLine ? -1 : 1;

  // 4. Prefer the line the player has NO relationship with yet (unfamiliar-first).
  //
  // Phase 16 d3b (user-ratified 2026-09-24): this rule previously read `bFam - aFam` — familiar
  // lines win — following the COMMENT in `24 §3.3`, whose own reference code contradicts it by
  // filtering `some(...) === false` (unfamiliar wins). The measured consequence of the comment
  // reading: a never-served line is never familiar, so it lost to every ever-served line whenever
  // rules 1–2 tied — a structural lockout. Across a 10-persona / 120-encounter roster run,
  // Emotional and Moral were served ZERO times. Rule 4 (starvation) could never rescue them:
  // it only ranks lines that already reached the comparison. Unfamiliar-first also agrees with
  // rule 1's own convention (never-served = most starved = wins), so the two rules cannot
  // disagree about which line is owed an encounter. `24 §3.3` is reconciled in the same commit.
  const familiar = (line: string): number =>
    Object.entries(sig.theta.lastEncounter).some(([k, ts]) => k.startsWith(`${line}:`) && ts > 0) ? 1 : 0;
  const aFam = familiar(a.candidate.line);
  const bFam = familiar(b.candidate.line);
  if (aFam !== bFam) return aFam - bFam;

  // 5. Deterministic final key — reproducibility. Reached now only when two candidates have equal
  // line recency, equal modality novelty, equal line novelty, and equal familiarity — which is the
  // case the key was always meant for.
  return refHash(a.candidate.moduleRef) - refHash(b.candidate.moduleRef);
}

/**
 * Rank scored candidates: descending priority, with `24 §3.3` tie-breaking inside each 0.05 band.
 * The returned order is total and reproducible — no ties survive.
 */
export function rankCandidates(
  scored: readonly ScoredCandidate[],
  sig: Significator,
  world: WorldState,
): ScoredCandidate[] {
  const byPriority = [...scored].sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    return refHash(a.candidate.moduleRef) - refHash(b.candidate.moduleRef);
  });

  const ranked: ScoredCandidate[] = [];
  let band: ScoredCandidate[] = [];
  for (const item of byPriority) {
    if (band.length === 0 || band[0]!.priority - item.priority <= TIE_BAND) {
      band.push(item);
    } else {
      ranked.push(...band.sort((a, b) => compareWithinBand(a, b, sig, world)));
      band = [item];
    }
  }
  if (band.length > 0) ranked.push(...band.sort((a, b) => compareWithinBand(a, b, sig, world)));
  return ranked;
}

/**
 * Check if a line has exceeded the shadow-work threshold (>3 unresolved shadows).
 * When true, encounters for this line should use shadow execution mode.
 */
export function detectShadowWorkThreshold(sig: Significator, line: string): boolean {
  const unresolved = sig.shadows.entries.filter(
    (e: ShadowEntry) => e.line === line && e.resolvedAt === null,
  );
  return unresolved.length > SHADOW_WORK_THRESHOLD;
}

/**
 * Find the most active (highest severity) unresolved shadow quadrant for a line.
 * Returns null if no unresolved shadows exist for that line.
 */
export function findMostActiveShadowQuadrant(sig: Significator, line: string): ShadowQuadrant | null {
  const unresolved = sig.shadows.entries
    .filter((e: ShadowEntry) => e.line === line && e.resolvedAt === null)
    .sort((a: ShadowEntry, b: ShadowEntry) => b.severity - a.severity);
  return unresolved[0]?.quadrant ?? null;
}

// ─── ACTION-3: Knot-Pair Generation (foundations/17 §5) ──────────────

export interface KnotPair {
  readonly anchorShadow: ShadowEntry;     // dark shadow at current stage
  readonly blockShadow: ShadowEntry;      // golden shadow at next stage
  readonly line: string;                  // shared line
  readonly drive: string;                 // shared drive axis
  readonly anchorEncounter: ScheduledEncounter; // Encounter A: surfaces dark anchor
  readonly blockEncounter: ScheduledEncounter;  // Encounter B: invites golden capacity
}

/**
 * ACTION-3: Detect knot-pairs — dark-anchor + golden-block shadow pairs
 * that share the same drive axis across current and next stage.
 *
 * Per foundations/17 §5: "A 'knot' is a compound shadow — a dark-shadow at
 * current stage structurally linked to a golden-allergy at next stage. Encounter
 * A surfaces the dark anchor; Encounter B (immediately follows) demands the
 * golden capacity."
 *
 * Knots are the CORE MECHANIC of the Lovers Crucible. Without them, the
 * Crucible is just "5 sessions of shadow mode" with no structural relationship
 * between dark and golden shadows. The evolve/heal vector (golden integration
 * dissolves dark knots) cannot fire without knot detection.
 *
 * @param sig The player's Significator
 * @param currentStage The player's current stage
 * @param nextStage The target stage (currentStage + 1)
 * @returns Array of KnotPairs (may be empty if no knots detected)
 */
export function detectKnotPairs(
  sig: Significator,
  currentStage: string,
  nextStage: string,
): readonly KnotPair[] {
  const knots: KnotPair[] = [];

  // Find dark shadows at current stage (the "anchor")
  const darkAnchors = sig.shadows.entries.filter(
    e => e.resolvedAt === null
      && e.stage === currentStage
      && (e.quadrant === 'DarkAddiction' || e.quadrant === 'DarkAllergy'),
  );

  // Find golden shadows at next stage (the "block")
  const goldenBlocks = sig.shadows.entries.filter(
    e => e.resolvedAt === null
      && e.stage === nextStage
      && (e.quadrant === 'GoldenAddiction' || e.quadrant === 'GoldenAllergy'),
  );

  // Match by shared drive axis (same drive on both sides = knot)
  for (const anchor of darkAnchors) {
    for (const block of goldenBlocks) {
      if (anchor.line === block.line && anchor.drive === block.drive) {
        // Generate the A→B encounter pair
        const anchorEncounter: ScheduledEncounter = {
          id: `knot-anchor:${anchor.line}:${currentStage}:${Date.now()}`,
          moduleRef: `${anchor.line}:${currentStage}`,
          modality: 'LanguageReflective',
          targetLines: [anchor.line as any],
          stage: currentStage as any,
          holonSource: `${anchor.line}:${currentStage}`,
          shadowTarget: anchor.quadrant,
          polarityMode: 'Exploring',
          difficulty: 0.7,
          sessionPosition: 'peak',
          priority: 0.9,
          driveTarget: anchor.drive,
          executionMode: 'shadow',
        };
        const blockEncounter: ScheduledEncounter = {
          id: `knot-block:${block.line}:${nextStage}:${Date.now()}`,
          moduleRef: `${block.line}:${nextStage}`,
          modality: 'ScenarioChoice',
          targetLines: [block.line as any],
          stage: nextStage as any,
          holonSource: `${block.line}:${nextStage}`,
          shadowTarget: block.quadrant,
          polarityMode: 'Exploring',
          difficulty: 0.8,
          sessionPosition: 'peak',
          priority: 0.9,
          driveTarget: block.drive,
          executionMode: 'shadow',
        };

        knots.push({
          anchorShadow: anchor,
          blockShadow: block,
          line: anchor.line,
          drive: anchor.drive,
          anchorEncounter,
          blockEncounter,
        });
      }
    }
  }

  return knots;
}

/**
 * Schedule the next N encounters, ranked by priority.
 *
 * T-0.4 (HS-13 fix): the optional `moduleTaskTypesProvider` callback is
 * forwarded to `generateCandidates` to filter modalities by module support.
 */
export function scheduleNext(
  sig: Significator,
  world: WorldState,
  session: SessionContext,
  now: number,
  count: number = 3,
  weights?: PriorityWeights,
  bleedThrough?: readonly string[],
  moduleTaskTypesProvider?: (moduleRef: string) => Set<string> | undefined,
  userMatrixModel?: UserMatrixModel,
): ScheduledEncounter[] {
  const candidates = generateCandidates(sig, world, now, session, moduleTaskTypesProvider);
  if (candidates.length === 0) return [];

  const scored = candidates.map(c => ({
    candidate: c,
    priority: computePriority({ candidate: c, sig, world, session, now, weights, bleedThrough, userMatrixModel }),
  }));

  // Sort descending by priority, then apply §3.3 tie-breaking inside each 0.05 band. Canon puts
  // variety here — not in the score — because a tie band is the set of candidates whose
  // developmental value is indistinguishable, and a comparator cannot outrank a stronger candidate.
  // The reserved developmental primary is the single documented exception: it is an offer-slot
  // policy, not a ninth score, and it leaves every candidate's priority value untouched.
  const ranked = rankCandidates(scored, sig, world);
  const primary = selectReservedPrimaryByLineCoverage(ranked, sig);
  const ordered = primary === ranked[0]
    ? ranked
    : [primary, ...ranked.filter(item => item !== primary)];

  // Determine session position
  const progress = session.encountersSoFar / Math.max(1, session.targetSessionLength);
  const position: 'warmup' | 'peak' | 'cooldown' =
    progress < 0.2 ? 'warmup' : progress > 0.8 ? 'cooldown' : 'peak';

  // Determine polarity mode from significator
  const polarityMode: PolarityMode = sig.polarity.master.mode;

  // Determine shadow target from active shadows
  const activeShadow = sig.shadows.entries.find(e => e.resolvedAt === null);
  const shadowTarget: ShadowQuadrant | null = activeShadow?.quadrant ?? null;

  // G.9: Holonic Return — detect shadow-work threshold per-line
  // When a line accumulates >3 unresolved shadows, force shadow execution mode
  // and target the most active (highest severity) shadow quadrant for that line.
  const lineShadowModes = new Map<string, boolean>();
  const lineShadowTargets = new Map<string, ShadowQuadrant | null>();

  // Take top N, diversifying by line (no more than 2 from same line)
  const result: ScheduledEncounter[] = [];
  const lineCounts: Record<string, number> = {};
  const moduleRefs = new Set<string>();

  for (const { candidate, priority } of ordered) {
    if (result.length >= count) break;
    const lc = lineCounts[candidate.line] ?? 0;
    if (lc >= 2) continue;
    // Deduplicate by moduleRef to prevent same encounter appearing multiple times
    if (moduleRefs.has(candidate.moduleRef)) continue;
    lineCounts[candidate.line] = lc + 1;
    moduleRefs.add(candidate.moduleRef);

    // G.9: Check shadow-work threshold for this candidate's line
    if (!lineShadowModes.has(candidate.line)) {
      lineShadowModes.set(candidate.line, detectShadowWorkThreshold(sig, candidate.line));
      lineShadowTargets.set(candidate.line, findMostActiveShadowQuadrant(sig, candidate.line));
    }
    const isShadowWork = lineShadowModes.get(candidate.line)!;
    const lineShadowTarget = lineShadowTargets.get(candidate.line) ?? shadowTarget;

    // G.20: During transformation crucible, force shadow mode for ego-dissolution
    const isCrucible = session.transformationState?.phase === 'crucible';
    const executionMode = isCrucible ? 'shadow' : (isShadowWork ? 'shadow' : 'capacity');

    result.push({
      id: `${candidate.moduleRef}:${candidate.holonId}:${now}`,
      moduleRef: candidate.moduleRef,
      modality: candidate.modality,
      targetLines: [candidate.line],
      stage: candidate.stage,
      holonSource: candidate.holonId,
      shadowTarget: lineShadowTarget,
      polarityMode,
      difficulty: computeDifficulty(sig, candidate.line, candidate.stage),
      sessionPosition: position,
      priority,
      driveTarget: activeShadow?.drive ?? null,
      executionMode,
    });
  }

  return result;
}

/**
 * WIRE-1: Schedule with Holonic Return injection.
 *
 * Wraps scheduleNext with the Holonic Return cadence: every 3 encounters at
 * the current stage, if unresolved earlier-stage shadows with severity > 0.3
 * exist, inject a shadow-mode return encounter at the earlier (line, stage)
 * at the HEAD of the candidate list.
 *
 * This is the production wiring of shouldSurfaceReturn — previously the
 * function existed but had zero callers (dead code per Round 3 audit).
 */
export function scheduleNextWithHolonicReturn(
  sig: Significator,
  world: WorldState,
  session: SessionContext,
  now: number,
  count: number = 3,
  weights?: PriorityWeights,
  bleedThrough?: readonly string[],
  moduleTaskTypesProvider?: (moduleRef: string) => Set<string> | undefined,
  userMatrixModel?: UserMatrixModel,
  encountersAtCurrentStage?: number,
): ScheduledEncounter[] {
  // Get the normal ranked candidates
  let result = scheduleNext(sig, world, session, now, count, weights, bleedThrough, moduleTaskTypesProvider, userMatrixModel);

  // WIRE-1: Check if a Holonic Return should be surfaced
  // encountersAtCurrentStage defaults to session.encountersSoFar if not provided
  // Phase 16 d5: a FORCED cell is a per-cell diagnostic instrument, so the return cannot prepend an
  // earlier-stage shadow encounter to it — that would measure two cells and report one. `shouldSurfaceReturn`
  // still fires and is still recorded elsewhere; it simply does not replace a forced developmental offer.
  const stageEncounters = encountersAtCurrentStage ?? session.encountersSoFar;
  const forcedCell = session.forceLine !== undefined && session.forceStage !== undefined;
  const returnTarget = forcedCell ? null : shouldSurfaceReturn(sig, stageEncounters);

  if (returnTarget) {
    // Inject a shadow-mode return encounter at the HEAD of the list
    const returnEncounter: ScheduledEncounter = {
      id: `holonic-return:${returnTarget.line}:${returnTarget.stage}:${now}`,
      moduleRef: `${returnTarget.line}:${returnTarget.stage}`,
      modality: 'LanguageReflective',
      targetLines: [returnTarget.line as any],
      stage: returnTarget.stage as any,
      holonSource: `${returnTarget.line}:${returnTarget.stage}`,
      shadowTarget: sig.shadows.entries.find(e => e.id === returnTarget.shadowId)?.quadrant ?? null,
      polarityMode: sig.polarity.master.mode,
      difficulty: 0.7, // Higher difficulty for shadow work
      sessionPosition: 'peak',
      priority: 0.95, // High priority — Holonic Return overrides normal ranking
      driveTarget: sig.shadows.entries.find(e => e.id === returnTarget.shadowId)?.drive ?? null,
      executionMode: 'shadow',
    };
    // Prepend the return encounter (it takes priority over normal encounters)
    result = [returnEncounter, ...result].slice(0, count);
  }

  return result;
}

function computeDifficulty(sig: Significator, line: string, stage: string): number {
  // Difficulty relative to player's altitude in that line
  const key = `${line}:${stage}`;
  const cell = sig.polarity.cells[key];
  const traceCount = cell?.traceCount ?? 0;
  // More traces = more familiarity = lower difficulty; cap at 0.3-0.9
  return Math.max(0.3, Math.min(0.9, 0.9 - traceCount * 0.05));
}

/**
 * Threshold-mode scheduling: overrides normal scheduling during transformation.
 * Spec: foundations/24 §6.2
 */
export function scheduleThresholdMode(
  sig: Significator,
  world: WorldState,
  session: SessionContext,
  phase: TransformationPhase,
  now: number,
): ScheduledEncounter[] {
  switch (phase) {
    case 'unravelling':
      return scheduleNext(sig, world, session, now, 3, {
        ...DEFAULT_WEIGHTS,
        thetaUrgency: 0.10,
        shadowActivation: 0.35,
        transformationReadiness: 0.30,
        polarityAlignment: 0.10,
        driveCorrection: 0.05,
        narrativeCoherence: 0.05,
        sessionFit: 0.05,
      });
    case 'crucible': {
      // WIRE-2: Wire detectKnotPairs into the crucible phase.
      // Per foundations/17 §5, the crucible should present dark-anchor + golden-block
      // pairs. detectKnotPairs was previously dead code (zero callers per Round 3 audit).
      // Now during the crucible, we check for knot pairs and inject them at the HEAD
      // of the encounter list, ahead of the normal shadow-activation encounters.
      const currentStage = sig.currentStage;
      const nextStage = sig.transformationTargetStage ?? null;
      let result = scheduleNext(sig, world, session, now, 2, {
        ...DEFAULT_WEIGHTS,
        thetaUrgency: 0.05,
        shadowActivation: 0.40,
        transformationReadiness: 0.35,
        polarityAlignment: 0.05,
        driveCorrection: 0.05,
        narrativeCoherence: 0.05,
        sessionFit: 0.05,
      });

      // If we have a target stage, check for knot pairs
      if (nextStage) {
        const knots = detectKnotPairs(sig, currentStage, nextStage);
        if (knots.length > 0) {
          // Inject the first knot pair (A→B) at the HEAD of the list.
          // The A encounter surfaces the dark anchor; the B encounter invites
          // the golden capacity. This is the core mechanic of the Lovers Crucible.
          const knot = knots[0]!;
          result = [knot.anchorEncounter, knot.blockEncounter, ...result].slice(0, 3);
        }
      }
      return result;
    }
    case 'emergence':
      return scheduleNext(sig, world, session, now, 3, {
        ...DEFAULT_WEIGHTS,
        thetaUrgency: 0.05,
        shadowActivation: 0.10,
        transformationReadiness: 0.05,
        polarityAlignment: 0.20,
        driveCorrection: 0.10,
        narrativeCoherence: 0.30,
        sessionFit: 0.20,
      });
    default:
      return scheduleNext(sig, world, session, now, 3);
  }
}
