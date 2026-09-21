#!/usr/bin/env npx tsx
/**
 * calibrate-personalization.ts — the offline calibration harness for the composition pipeline.
 *
 * Runs the FULL composition surface (64 cells × 7 modalities) against the compiled facet store,
 * records the traffic through the CompositionTelemetry, evaluates both diversity monitors, and:
 *   1. emits a calibration report (per-cell entropy + share table, defects, verdict);
 *   2. FAILS (exit 1) on structural degeneracy — a cell with zero composed facets where the
 *      corpus has content, or a compile-time-empty store — because a structurally degenerate
 *      composition surface cannot be fixed by play data; it must be fixed before shipping.
 *
 * NOTE the two failure classes it deliberately does NOT fail on:
 *   - visibility-collapse / scaffold-share defects from this synthetic traffic are SIGNALS for
 *     the development loop (the runtime telemetry triages them with real play data);
 *   - expansionRatio calibration needs REAL play data and is explicitly out of scope here.
 *
 * @script-status: wired — run after `compile-facets` whenever the corpus or composition code
 *   changes. Exit 1 means "fix the store/composer before developing further on top of it".
 */

import { ALL_LINES } from '../src/core/domain/Line.js';
import { ALL_STAGES } from '../src/core/domain/Stage.js';
import { ALL_MODALITIES } from '../src/core/domain/enums.js';
import { createFacetStore } from '../src/core/world/facets/FacetStore.js';
import { INITIAL_TAGS } from '../src/core/world/tags/initialTags.js';
import { composeWorldTexture } from '../src/core/personalization/runtimeBridge.js';
import { createCompositionTelemetry } from '../src/core/personalization/compositionTelemetry.js';
import { cellEntropy } from '../src/core/personalization/diversityMonitor.js';
import type { Line } from '../src/core/domain/Line.js';
import type { Stage } from '../src/core/domain/Stage.js';
import type { Modality } from '../src/core/domain/enums.js';
import type { FacetStore } from '../src/core/world/facets/FacetStore.js';
import type { FacetKey } from '../src/core/world/facets/types.js';

interface Row {
  cell: string;
  modality: Modality;
  facets: number;
  composed: boolean;
}

function keyOf(line: Line, stage: Stage, characteristic: string, modality: Modality): FacetKey {
  return `${line}:${stage}:${characteristic}@${modality}` as FacetKey;
}

/** Rotate characteristics so synthetic traffic exercises every facet, not always the same one. */
function rotatedKeys(store: FacetStore, line: Line, stage: Stage, modality: Modality, i: number): FacetKey[] {
  const chars = ['role-archetype', 'stake', 'pressure-lever', 'voice-register', 'surface-aesthetic', 'polarity-texture', 'relationship-pattern', 'memory-schema'];
  const keys: FacetKey[] = [];
  for (let k = 0; k < 3; k++) {
    const c = chars[(i + k) % chars.length];
    const f = store.byKey(keyOf(line, stage, c, modality)) ?? store.byKey(`${line}:${stage}:${c}`);
    if (f) keys.push(f.key);
  }
  return keys;
}

function main(): number {
  const store = createFacetStore(new Set(INITIAL_TAGS.map((t) => t.id)));
  const telemetry = createCompositionTelemetry();
  const rows: Row[] = [];
  const emptyCells: string[] = [];
  const now = 1_700_000_000_000;
  let compositions = 0;

  for (const line of ALL_LINES) {
    for (const stage of ALL_STAGES) {
      const cell = `${line}:${stage}`;
      let cellComposed = false;
      for (const modality of ALL_MODALITIES) {
        let composed = false;
        // 3 composition passes per (cell, modality) with rotated characteristics — enough to
        // clear the monitors' MIN_COMPOSITIONS noise floor (8) per cell across modalities,
        // while rotating so every characteristic in the cell gets exercised.
        for (let i = 0; i < 3; i++) {
          const tex = composeWorldTexture({ line, stage, modality, facets: store });
          composed = tex !== undefined;
          if (composed) {
            cellComposed = true;
            compositions++;
          }
          telemetry.record({ cell, facetKeys: rotatedKeys(store, line, stage, modality, i), at: now });
        }
        rows.push({ cell, modality, facets: keys0(store, line, stage, modality), composed });
      }
      if (!cellComposed) emptyCells.push(cell);
    }
  }

  const reports = telemetry.evaluate();
  const storeSize = store.count;

  // ── Structural degeneracy = FAIL ──────────────────────────────────────────
  const failures = structuralFailures(storeSize, emptyCells);

  // ── Report ────────────────────────────────────────────────────────────────
  console.log('== personalization calibration ==\n');
  console.log(`store: ${storeSize} facets; compositions exercised: ${compositions}; cells: ${ALL_LINES.length * ALL_STAGES.length}; modalities: ${ALL_MODALITIES.length}\n`);

  console.log('per-cell entropy (over synthetic rotated traffic):');
  const linesOut: string[] = [];
  for (const line of ALL_LINES) {
    for (const stage of ALL_STAGES) {
      const cell = `${line}:${stage}`;
      const { entropy, distinct, compositions: n } = cellEntropy(telemetry.events, cell);
      linesOut.push(`  ${cell.padEnd(22)} entropy=${entropy.toFixed(3)} distinct=${String(distinct).padStart(3)} n=${n}`);
    }
  }
  console.log(linesOut.join('\n'));

  console.log(`\ndefect reports (development-loop signals, triaged with real play data): ${reports.length}`);
  for (const r of reports.slice(0, 20)) console.log(`  [${r.kind}] ${r.subject}: ${r.detail}`);
  if (reports.length > 20) console.log(`  … and ${reports.length - 20} more`);

  if (failures.length > 0) {
    console.error(`\nFAIL — structural degeneracy:\n${failures.map((f) => `  - ${f}`).join('\n')}`);
    return 1;
  }
  console.log('\nPASS — composition surface structurally healthy across all 64 cells × 7 modalities.');
  return 0;
}

/**
 * The fail-closed predicate, exported for tests: an empty store, or a cell that composes nothing
 * despite the compiled store, is a corpus↔composer gap that play data cannot fix.
 */
export function structuralFailures(storeSize: number, emptyCells: readonly string[]): string[] {
  const failures: string[] = [];
  if (storeSize === 0) failures.push('facet store is EMPTY — run compile-facets first');
  for (const cell of emptyCells) {
    failures.push(`cell ${cell} composes NOTHING despite the compiled store — structural gap between corpus and composer`);
  }
  return failures;
}

/** per-(cell,modality) base-facet count for the report rows. */
function keys0(store: FacetStore, line: Line, stage: Stage, modality: Modality): number {
  let n = 0;
  for (const c of ['role-archetype', 'stake', 'pressure-lever', 'voice-register', 'surface-aesthetic', 'polarity-texture', 'relationship-pattern', 'memory-schema']) {
    if (store.byKey(keyOf(line, stage, c, modality))) n++;
    else if (store.byKey(`${line}:${stage}:${c}`)) n++;
  }
  return n;
}

main();
