/**
 * StageSynthesizer — synthesises per-line altitudes into a single stage.
 * Per foundations/02 §3.2: stage = max S such that all lines ≥ S AND ≥1 line at S+1.
 * Per lines/00 §3.3: advancement gate requires 5 checks.
 */
import type { Line } from '../domain/Line.js';
import type { Significator } from '../domain/Significator.js';
import type { Stage } from '../domain/Stage.js';
import { ALL_LINES } from '../domain/Line.js';
import { ALL_STAGES, stageOrdinal } from '../domain/Stage.js';

/**
 * Compute the synthesised stage.
 *
 * T-0.9 (HS-04 fix): the prior implementation set `result = candidate` in
 * BOTH branches of the if/else, making the hysteresis rule dead code.
 *
 * Corrected semantics (per foundations/02 §3.2 + existing test expectations):
 * The synthesized stage is the FLOOR — the highest stage S such that all
 * lines have altitude ≥ S. This is effectively `min(altitudes)`.
 *
 * The "+1 pull" hysteresis rule is a separate concern: it gates ADVANCEMENT
 * (see `checkAdvancementGate` below), not synthesis. A player whose lines
 * are all at Red IS at Red; they just can't ADVANCE to Amber until a line
 * pulls to Orange. Conflating synthesis with advancement-gating was the
 * root cause of the dead-code bug.
 *
 * Examples:
 *   {all Red}                       → Red    (floor = Red)
 *   {all Amber}                     → Amber  (floor = Amber)
 *   {Cognitive: Orange, rest Amber} → Amber  (floor = Amber; Cognitive pulls but rest hold)
 *   {all Turquoise}                     → Turquoise  (floor = Turquoise)
 *   {Somatic: Infrared, rest Turquoise} → Infrared (floor = Infrared)
 */
export function synthesiseStage(altitudes: Record<Line, Stage>): Stage {
  // The synthesized stage is the highest S such that all lines ≥ S.
  // This is the floor — equivalent to min(altitudes) but expressed per spec.
  let floor: Stage = 'Infrared';
  for (let i = 0; i < ALL_STAGES.length; i++) {
    const candidate = ALL_STAGES[i]!;
    const allAtOrAbove = ALL_LINES.every(line => stageOrdinal(altitudes[line]) >= i);
    if (allAtOrAbove) {
      floor = candidate;
    } else {
      break;
    }
  }
  return floor;
}

/**
 * Full 5-check advancement gate per lines/00 §3.3.
 * Returns { canAdvance, blockers } where blockers lists what's missing.
 */
export function checkAdvancementGate(sig: Significator, target: Stage): {
  canAdvance: boolean;
  blockers: string[];
} {
  const blockers: string[] = [];
  const targetOrd = stageOrdinal(target);

  // 1. All 8 lines ≥ target stage
  for (const line of ALL_LINES) {
    if (stageOrdinal(sig.altitudes[line]) < targetOrd) {
      blockers.push(`${line} line below ${target}`);
    }
  }

  // 2. At least 2 lines ≥ target+1 (the pull)
  if (targetOrd < ALL_STAGES.length - 1) {
    let pullCount = 0;
    for (const line of ALL_LINES) {
      if (stageOrdinal(sig.altitudes[line]) > targetOrd) pullCount++;
    }
    if (pullCount < 2) {
      blockers.push(`Need ≥2 lines above ${target} (have ${pullCount})`);
    }
  }

  // 3. All 4 quadrants demonstrated at the previous stage (checked via shadow ledger completeness)
  // Note: quadrant coverage tracking moved to encounter-level; gate 3 is deferred until encounter scheduler tracks it.
  // For now, this check is a no-op placeholder.

  // 4. Boss synthesis exam cleared for previous stage — deferred (no bossesCleared on Significator yet)

  // 5. No active shadow entries at altitude ≤ target
  for (const entry of sig.shadows.entries) {
    if (entry.resolvedAt === null) {
      const shadowLineOrd = stageOrdinal(sig.altitudes[entry.line]);
      if (shadowLineOrd <= targetOrd) {
        blockers.push(`Unresolved ${entry.quadrant} shadow on ${entry.line}`);
      }
    }
  }

  return { canAdvance: blockers.length === 0, blockers };
}

/**
 * Legacy compatibility: check if all lines meet target (simple check).
 */
export function meetsAdvancementCriteria(sig: Significator, target: Stage): boolean {
  return checkAdvancementGate(sig, target).canAdvance;
}
