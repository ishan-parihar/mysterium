/**
 * Binary-search placement (docs/ONBOARDING-REDESIGN-PLAN §2.2) — the PURE core
 * of the onboarding composite. For each line, walks the stage ladder with
 * confident pass/fail results until convergence:
 *
 *   CONVERGED when: passed at S AND failed at S+1
 *     → altitude = S, confidence = min(pass_confidence, fail_confidence)
 *
 * Probe budget: ≤ 8 probes per line (08's psychophysics budget) — the
 * converged search over 8 stages needs at most 2·log₂(8)+boundary ≈ 8 probes.
 * Ambiguous results (confidence < threshold) trigger extra trials at the same
 * stage; still-ambiguous after budget marks the cell as a boundary.
 *
 * Pure: the caller (CLI onboarding, WebUI onboarding route, or the delegated
 * A4 Calibrator per plan Phase 7) supplies the probe function. No I/O here.
 */
import { ALL_LINES, type Line } from '../domain/Line.js';
import { ALL_STAGES, type Stage } from '../domain/Stage.js';

export const CONFIDENCE_THRESHOLD = 0.6;
export const MAX_PROBES_PER_LINE = 8;
export const MAX_EXTRA_TRIALS = 2;

export type ProbeOutcome = 'pass' | 'fail';

export interface PlacementProbeResult {
  readonly outcome: ProbeOutcome;
  /** 0..1 — confidence of the pass/fail verdict. */
  readonly confidence: number;
}

export type PlacementProbe = (line: Line, stage: Stage, attempt: number) => PlacementProbeResult;

export interface LinePlacement {
  readonly line: Line;
  /** Converged altitude, or undefined if the budget exhausted unresolved. */
  readonly altitude?: Stage;
  readonly confidence: number;
  readonly converged: boolean;
  readonly probesUsed: number;
  readonly boundary: boolean;
}

export interface PlacementResult {
  readonly placements: Readonly<Record<Line, LinePlacement>>;
  readonly probesUsed: number;
  readonly converged: boolean;
}

const STAGE_INDEX = new Map<string, number>(ALL_STAGES.map((s, i) => [s, i]));

function stageAt(i: number): Stage {
  return ALL_STAGES[Math.max(0, Math.min(ALL_STAGES.length - 1, i))]!;
}

export function defaultStartStage(line: Line): Stage {
  return line === 'Moral' ? 'Amber' : 'Red';
}

/**
 * Run the binary search for one line. Walks up while confidently passing,
 * down while confidently failing; converges at pass(S) + fail(S+1).
 */
export function placeLine(line: Line, probe: PlacementProbe): LinePlacement {
  let idx = STAGE_INDEX.get(defaultStartStage(line))!;
  let probesUsed = 0;
  // Track the tightest known bounds: passedBelow ≤ altitude < failedAbove.
  let bestPass: { idx: number; confidence: number } | null = null;
  let bestFail: { idx: number; confidence: number } | null = null;

  while (probesUsed < MAX_PROBES_PER_LINE) {
    const stage = stageAt(idx);
    const attempt = 0;
    const result = probe(line, stage, attempt);
    probesUsed++;

    if (result.confidence < CONFIDENCE_THRESHOLD) {
      // Ambiguous: extra trials at this stage (§2.2 step 5).
      let ambiguous = true;
      for (let extra = 1; extra <= MAX_EXTRA_TRIALS && probesUsed < MAX_PROBES_PER_LINE; extra++) {
        const retry = probe(line, stage, extra);
        probesUsed++;
        if (retry.confidence >= CONFIDENCE_THRESHOLD) {
          ambiguous = false;
          if (retry.outcome === 'pass') {
            if (bestPass === null || idx > bestPass.idx) bestPass = { idx, confidence: retry.confidence };
            idx = idx + 1;
          } else {
            if (bestFail === null || idx < bestFail.idx) bestFail = { idx, confidence: retry.confidence };
            idx = idx - 1;
          }
          break;
        }
      }
      if (ambiguous && probesUsed >= MAX_PROBES_PER_LINE) {
        return { line, confidence: 0, converged: false, probesUsed, boundary: true };
      }
      if (!ambiguous) continue;
      // Budget remains but the retry loop ended ambiguous (budget hit inside).
      if (probesUsed >= MAX_PROBES_PER_LINE) {
        return { line, confidence: 0, converged: false, probesUsed, boundary: true };
      }
      continue;
    }

    if (result.outcome === 'pass') {
      bestPass = { idx, confidence: result.confidence };
      if (idx >= ALL_STAGES.length - 1) {
        // Top of the ladder: altitude is White.
        return { line, altitude: stageAt(idx), confidence: result.confidence, converged: true, probesUsed, boundary: false };
      }
      // Check the convergence law with an already-known fail above.
      if (bestFail !== null && bestFail.idx === idx + 1) {
        return {
          line, altitude: stageAt(idx),
          confidence: Math.min(bestPass.confidence, bestFail.confidence),
          converged: true, probesUsed, boundary: false,
        };
      }
      idx = idx + 1;
    } else {
      bestFail = { idx, confidence: result.confidence };
      if (idx <= 0) {
        // Bottom of the ladder: altitude is Infrared.
        return { line, altitude: stageAt(idx), confidence: result.confidence, converged: true, probesUsed, boundary: false };
      }
      if (bestPass !== null && bestPass.idx === idx - 1) {
        return {
          line, altitude: stageAt(bestPass.idx),
          confidence: Math.min(bestPass.confidence, bestFail.confidence),
          converged: true, probesUsed, boundary: false,
        };
      }
      idx = idx - 1;
    }
  }

  // Budget exhausted: best-effort altitude from the tightest bounds.
  if (bestPass !== null && bestFail !== null && bestFail.idx === bestPass.idx + 1) {
    return {
      line, altitude: stageAt(bestPass.idx),
      confidence: Math.min(bestPass.confidence, bestFail.confidence),
      converged: true, probesUsed, boundary: false,
    };
  }
  return { line, confidence: 0, converged: false, probesUsed, boundary: true };
}

/** Full 8-line composite. */
export function placeAllLines(probe: PlacementProbe): PlacementResult {
  const placements = {} as Record<Line, LinePlacement>;
  let probesUsed = 0;
  let converged = true;
  for (const line of ALL_LINES) {
    const p = placeLine(line, probe);
    placements[line] = p;
    probesUsed += p.probesUsed;
    if (!p.converged) converged = false;
  }
  return { placements, probesUsed, converged };
}

/**
 * Seed altitudes from a placement result (the Significator input shape).
 * Unconverged lines fall back to the default start stage at low confidence.
 */
export function altitudesFromPlacement(result: PlacementResult): { altitudes: Record<Line, Stage>; lowConfidenceLines: readonly Line[] } {
  const altitudes = {} as Record<Line, Stage>;
  const lowConfidenceLines: Line[] = [];
  for (const line of ALL_LINES) {
    const p = result.placements[line];
    altitudes[line] = p.altitude ?? defaultStartStage(line);
    if (!p.converged) lowConfidenceLines.push(line);
  }
  return { altitudes, lowConfidenceLines };
}
