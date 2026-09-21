/**
 * Composition-diversity monitor — the countermeasures for two named failure modes:
 *
 * 1. **Visibility collapse** (46 §11): the same facets composed everywhere, so players see the
 *    same 20 textures regardless of trajectory. Countermeasure: measure the composition's
 *    ENTROPY per line×stage and flag low-diversity cells as defects.
 * 2. **Scaffold hardening read as success** (47 §9 check 9): a scaffold exceeding its declared
 *    share of selections triggers a defect report — hardening is a calibration signal, not a win.
 *
 * Both produce `DefectReport`s: records to be triaged by the development loop, never thrown at
 * runtime (a low-diversity session must still run; it must also be SEEN).
 */

import type { FacetKey } from '../world/facets/types.js';

export interface CompositionEvent {
  readonly cell: string;          // `${line}:${stage}`
  readonly facetKeys: readonly FacetKey[];
  readonly scaffoldId?: string;
  readonly at: number;
}

export interface DefectReport {
  readonly kind: 'visibility-collapse' | 'scaffold-share-exceeded';
  readonly subject: string;       // cell or scaffold id
  readonly detail: string;
  readonly measuredAt: number;
}

/** Natural log is fine — thresholds are relative; only ratios matter. */
function shannonEntropy(counts: readonly number[]): number {
  const total = counts.reduce((a, b) => a + b, 0);
  if (total === 0) return 0;
  let h = 0;
  for (const c of counts) {
    if (c === 0) continue;
    const p = c / total;
    h -= p * Math.log(p);
  }
  return h;
}

/** A cell's diversity = entropy of its composed facet-key distribution. Max = ln(distinct keys). */
export function cellEntropy(events: readonly CompositionEvent[], cell: string): { entropy: number; distinct: number; compositions: number } {
  const inCell = events.filter((e) => e.cell === cell);
  const counts = new Map<string, number>();
  for (const e of inCell) for (const k of e.facetKeys) counts.set(k, (counts.get(k) ?? 0) + 1);
  return {
    entropy: shannonEntropy([...counts.values()]),
    distinct: counts.size,
    compositions: inCell.length,
  };
}

/** 46 §11's flag: a cell whose entropy is below the floor despite real traffic. */
export const ENTROPY_FLOOR = 0.5;      // nats; ~half of max diversity for the observed support
export const MIN_COMPOSITIONS = 8;    // below this the measurement is noise, not signal

export function detectVisibilityCollapse(
  events: readonly CompositionEvent[],
  cells: readonly string[],
  now: number,
): DefectReport[] {
  const reports: DefectReport[] = [];
  for (const cell of cells) {
    const { entropy, distinct, compositions } = cellEntropy(events, cell);
    if (compositions < MIN_COMPOSITIONS) continue;
    if (entropy < ENTROPY_FLOOR || distinct <= 2) {
      reports.push({
        kind: 'visibility-collapse',
        subject: cell,
        detail: `${compositions} compositions but only ${distinct} distinct facet keys (entropy ${entropy.toFixed(3)} < ${ENTROPY_FLOOR}) — the same textures are repeating`,
        measuredAt: now,
      });
    }
  }
  return reports;
}

// ── 47 §9 check 9: the scaffold share-defect reporter ───────────────────────

/** Declared share ceilings per scaffold id (47 §9 check 9); 0.35 default from the fading DAG's shape. */
export const DEFAULT_SCAFFOLD_SHARE_CEILING = 0.35;

export function detectScaffoldShareDefects(
  events: readonly CompositionEvent[],
  ceilings: Readonly<Record<string, number>> = {},
  now: number,
): DefectReport[] {
  const reports: DefectReport[] = [];
  const scaffolded = events.filter((e) => e.scaffoldId !== undefined);
  if (scaffolded.length === 0) return reports;
  const counts = new Map<string, number>();
  for (const e of scaffolded) counts.set(e.scaffoldId!, (counts.get(e.scaffoldId!) ?? 0) + 1);
  for (const [id, n] of counts) {
    const share = n / scaffolded.length;
    const ceiling = ceilings[id] ?? DEFAULT_SCAFFOLD_SHARE_CEILING;
    if (share > ceiling) {
      reports.push({
        kind: 'scaffold-share-exceeded',
        subject: id,
        detail: `scaffold selected in ${(share * 100).toFixed(1)}% of scaffolded compositions (ceiling ${(ceiling * 100).toFixed(0)}%) — hardening must be investigated, not celebrated (47 §9 check 9)`,
        measuredAt: now,
      });
    }
  }
  return reports;
}
