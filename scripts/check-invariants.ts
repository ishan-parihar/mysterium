/**
 * Build-time invariant verification script.
 * Run with: npx tsx scripts/check-invariants.ts
 *
 * T-5.7: Expanded from 8 basic checks to comprehensive structural verification.
 * Verifies that core registries, data indices, enums, engines, and modules
 * are structurally valid and internally consistent.
 */
// @script-status: wired — `npm run check:invariants`, which `npm run build` runs first and
//                          install.sh calls as a smoke gate. Read-only structural verification of
//                          the registries, data indices and enums.

import { bootRegistries } from '../src/core/registries/boot.js';
import { allModuleKeys } from '../src/core/data/ConceptDraftIndex.js';
import { createRegistry } from '../src/core/world/store/HolonStore.js';
import {
  ALL_MODALITIES,
  ALL_SHADOW_QUADRANTS,
  ALL_HOLON_KINDS,
  ALL_POLARITY_MODES,
  ALL_ENERGETIC_DIRECTIONS,
} from '../src/core/domain/enums.js';
import { ALL_LINES, ALL_COMPLEXES, LINE_COMPLEX, linesForComplex } from '../src/core/domain/Line.js';
import { ALL_STAGES } from '../src/core/domain/Stage.js';
import { ALL_DRIVES, LINE_DRIVE, driveForLine } from '../src/core/domain/Drive.js';
import { createSignificator } from '../src/core/domain/Significator.js';
import { synthesiseStage } from '../src/core/usecases/StageSynthesizer.js';
import { validateSignificator } from '../src/infra/persistence/validateSignificator.js';
import { computeMetabolicHealth, computeComplexAltitudes } from '../src/core/engines/GreaterCycleEngine.js';
import { toQualitativeFeedback, formatQualitativeFeedback } from '../src/infra/llm/QualitativeFeedback.js';
import {
  LineRegistry,
  StageRegistry,
  RayRegistry,
  DriveRegistry,
} from '../src/core/registries/index.js';

let passed = 0;
let failed = 0;

function check(label: string, fn: () => void): void {
  try {
    fn();
    passed++;
    console.log(`  PASS: ${label}`);
  } catch (err) {
    failed++;
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`  FAIL: ${label} - ${msg}`);
  }
}

console.log('Running build-time invariant checks...\n');

// --- Boot & basic structure ---
check('bootRegistries() executes without throwing', () => {
  bootRegistries();
});

check('allModuleKeys is a callable function', () => {
  if (typeof allModuleKeys !== 'function') {
    throw new Error(`Expected function, got ${typeof allModuleKeys}`);
  }
});

check('createRegistry can create an empty registry', () => {
  const registry = createRegistry([]);
  if (!registry || !Array.isArray(registry.holons)) {
    throw new Error('createRegistry([]) did not return a valid registry');
  }
  if (registry.holons.length !== 0) {
    throw new Error(`Expected empty holons array, got length ${registry.holons.length}`);
  }
});

// --- Enum completeness ---
check('ALL_MODALITIES has at least 7 members', () => {
  if (ALL_MODALITIES.length < 7) throw new Error(`ALL_MODALITIES has ${ALL_MODALITIES.length}, expected ≥7`);
});

check('ALL_SHADOW_QUADRANTS has exactly 4 members', () => {
  if (ALL_SHADOW_QUADRANTS.length !== 4) throw new Error(`ALL_SHADOW_QUADRANTS has ${ALL_SHADOW_QUADRANTS.length}, expected 4`);
});

check('ALL_HOLON_KINDS has at least 1 member', () => {
  if (ALL_HOLON_KINDS.length < 1) throw new Error('ALL_HOLON_KINDS is empty');
});

check('ALL_POLARITY_MODES has at least 1 member', () => {
  if (ALL_POLARITY_MODES.length < 1) throw new Error('ALL_POLARITY_MODES is empty');
});

check('ALL_ENERGETIC_DIRECTIONS has at least 1 member', () => {
  if (ALL_ENERGETIC_DIRECTIONS.length < 1) throw new Error('ALL_ENERGETIC_DIRECTIONS is empty');
});

check('ALL_LINES has exactly 8 members', () => {
  if (ALL_LINES.length !== 8) throw new Error(`ALL_LINES has ${ALL_LINES.length}, expected 8`);
});

check('ALL_STAGES has exactly 8 members', () => {
  if (ALL_STAGES.length !== 8) throw new Error(`ALL_STAGES has ${ALL_STAGES.length}, expected 8`);
});

check('ALL_DRIVES has exactly 4 members', () => {
  if (ALL_DRIVES.length !== 4) throw new Error(`ALL_DRIVES has ${ALL_DRIVES.length}, expected 4`);
});

// --- T-1.5: Complex differentiation ---
check('ALL_COMPLEXES has exactly 3 members (Mind, Body, Spirit)', () => {
  if (ALL_COMPLEXES.length !== 3) throw new Error(`ALL_COMPLEXES has ${ALL_COMPLEXES.length}, expected 3`);
  if (!ALL_COMPLEXES.includes('Mind')) throw new Error('Missing Mind');
  if (!ALL_COMPLEXES.includes('Body')) throw new Error('Missing Body');
  if (!ALL_COMPLEXES.includes('Spirit')) throw new Error('Missing Spirit');
});

check('LINE_COMPLEX maps all 8 lines', () => {
  for (const line of ALL_LINES) {
    const complex = LINE_COMPLEX[line];
    if (!complex) throw new Error(`Line ${line} has no Complex mapping`);
    if (!ALL_COMPLEXES.includes(complex)) throw new Error(`Line ${line} maps to invalid Complex ${complex}`);
  }
});

check('linesForComplex returns at least 1 line per Complex', () => {
  for (const complex of ALL_COMPLEXES) {
    const lines = linesForComplex(complex);
    if (lines.length === 0) throw new Error(`Complex ${complex} has no lines`);
  }
});

check('every Complex has at least 2 lines', () => {
  for (const complex of ALL_COMPLEXES) {
    const lines = linesForComplex(complex);
    if (lines.length < 2) throw new Error(`Complex ${complex} has only ${lines.length} line(s), expected ≥2`);
  }
});

// --- T-1.5: LINE_DRIVE (HS-12 fix) — Agape reachable ---
check('LINE_DRIVE maps all 8 lines', () => {
  for (const line of ALL_LINES) {
    const drive = LINE_DRIVE[line];
    if (!drive) throw new Error(`Line ${line} has no Drive mapping`);
    if (!ALL_DRIVES.includes(drive)) throw new Error(`Line ${line} maps to invalid Drive ${drive}`);
  }
});

check('driveForLine returns Agape for at least 1 line (HS-12 fix)', () => {
  const agapeLines = ALL_LINES.filter(l => driveForLine(l) === 'Agape');
  if (agapeLines.length === 0) throw new Error('No line maps to Agape — HS-12 not fixed');
});

check('all 4 drives are reachable via driveForLine', () => {
  for (const drive of ALL_DRIVES) {
    const lines = ALL_LINES.filter(l => driveForLine(l) === drive);
    if (lines.length === 0) throw new Error(`Drive ${drive} is unreachable via driveForLine`);
  }
});

// --- Registry population ---
check('LineRegistry has all 8 lines registered', () => {
  bootRegistries();
  for (const line of ALL_LINES) {
    if (!LineRegistry.get(line)) throw new Error(`Line ${line} not registered`);
  }
});

check('StageRegistry has all 8 stages registered', () => {
  bootRegistries();
  for (const stage of ALL_STAGES) {
    if (!StageRegistry.get(stage)) throw new Error(`Stage ${stage} not registered`);
  }
});

check('RayRegistry has at least 7 rays registered', () => {
  bootRegistries();
  // RayRegistry should have Red, Orange, Yellow, Green, Blue, Indigo, Violet
  const expectedRays = ['Red', 'Orange', 'Yellow', 'Green', 'Blue', 'Indigo', 'Violet'];
  for (const ray of expectedRays) {
    if (!RayRegistry.get(ray as never)) throw new Error(`Ray ${ray} not registered`);
  }
});

check('DriveRegistry has all 4 drives registered', () => {
  bootRegistries();
  for (const drive of ALL_DRIVES) {
    if (!DriveRegistry.get(drive)) throw new Error(`Drive ${drive} not registered`);
  }
});

// --- Significator factory ---
check('createSignificator produces a valid Significator', () => {
  const altitudes = {} as Record<string, string>;
  for (const line of ALL_LINES) altitudes[line] = 'Red';
  const sig = createSignificator('invariant-test', altitudes as never, 'Red');
  if (sig.id !== 'invariant-test') throw new Error('Wrong id');
  if (sig.currentStage !== 'Red') throw new Error('Wrong stage');
  if (sig.altitudes.Cognitive !== 'Red') throw new Error('Wrong altitude');
  if (sig.transformationPhase !== 'idle') throw new Error('Wrong transformationPhase');
  if (sig.transformationSessionsInPhase !== 0) throw new Error('Wrong transformationSessionsInPhase');
  if (sig.recentEncounters.length !== 0) throw new Error('recentEncounters not empty');
});

check('createSignificator round-trips through validateSignificator', () => {
  const altitudes = {} as Record<string, string>;
  for (const line of ALL_LINES) altitudes[line] = 'Amber';
  const sig = createSignificator('round-trip', altitudes as never, 'Amber');
  const json = JSON.parse(JSON.stringify(sig));
  const restored = validateSignificator(json);
  if (!restored) throw new Error('validateSignificator returned null');
  if (restored.id !== 'round-trip') throw new Error('ID mismatch');
  if (restored.currentStage !== 'Amber') throw new Error('Stage mismatch');
});

check('validateSignificator rejects null/undefined/empty-id', () => {
  if (validateSignificator(null) !== null) throw new Error('null should return null');
  if (validateSignificator(undefined) !== null) throw new Error('undefined should return null');
  if (validateSignificator({}) !== null) throw new Error('empty object should return null');
  if (validateSignificator({ id: '' }) !== null) throw new Error('empty id should return null');
});

// --- StageSynthesizer ---
check('synthesiseStage returns floor (min altitude)', () => {
  const altitudes = {} as Record<string, string>;
  for (const line of ALL_LINES) altitudes[line] = 'Red';
  const result = synthesiseStage(altitudes as never);
  if (result !== 'Red') throw new Error(`Expected Red, got ${result}`);
});

check('synthesiseStage returns floor when lines differ', () => {
  const altitudes = {} as Record<string, string>;
  for (const line of ALL_LINES) altitudes[line] = 'Orange';
  altitudes['Moral'] = 'Red';
  const result = synthesiseStage(altitudes as never);
  if (result !== 'Red') throw new Error(`Expected Red (floor), got ${result}`);
});

// --- GreaterCycleEngine (T-1.8) ---
check('computeMetabolicHealth returns valid structure', () => {
  const altitudes = {} as Record<string, string>;
  for (const line of ALL_LINES) altitudes[line] = 'Red';
  const sig = createSignificator('gz-pz-test', altitudes as never, 'Red');
  const mh = computeMetabolicHealth(sig);
  if (typeof mh.gz !== 'number') throw new Error('gz not a number');
  if (typeof mh.pz !== 'number') throw new Error('pz not a number');
  if (typeof mh.total !== 'number') throw new Error('total not a number');
  if (mh.gz < 0 || mh.gz > 1) throw new Error(`gz out of range: ${mh.gz}`);
  if (mh.pz < 0 || mh.pz > 1) throw new Error(`pz out of range: ${mh.pz}`);
  if (Math.abs(mh.total - mh.gz * mh.pz) > 0.0001) throw new Error('total ≠ gz*pz');
  if (!['consolidating', 'polarizing-healthy', 'polarizing-unhealthy', 'stuck', 'transitional'].includes(mh.interpretation)) {
    throw new Error(`Invalid interpretation: ${mh.interpretation}`);
  }
});

check('computeComplexAltitudes returns all 3 Complexes', () => {
  const altitudes = {} as Record<string, string>;
  for (const line of ALL_LINES) altitudes[line] = 'Red';
  const sig = createSignificator('complex-test', altitudes as never, 'Red');
  const result = computeComplexAltitudes(sig);
  if (typeof result.Mind !== 'number') throw new Error('Mind missing');
  if (typeof result.Body !== 'number') throw new Error('Body missing');
  if (typeof result.Spirit !== 'number') throw new Error('Spirit missing');
});

// --- QualitativeFeedback (UX-01) ---
check('toQualitativeFeedback produces Veil-compliant output', () => {
  const fb = toQualitativeFeedback(
    { Agency: 'HealthyBalanced', Communion: 'HealthyBalanced', Eros: 'HealthyBalanced', Agape: 'HealthyBalanced' },
    null,
    true,
  );
  const text = formatQualitativeFeedback(fb);
  if (text.length === 0) throw new Error('Empty output');
  // Check no Veil-violating taxonomy leaks
  // The canonical ladder, imported — never a hand-copied list. This one previously carried the
  // retired stage `White`, so the leak check tested for a stage that does not exist while the
  // authority (domain/Stage.ts) said otherwise. See CHECKED-SURFACE-AUDIT-2026-09-24 §10.3.
  for (const s of ALL_STAGES) {
    if (text.includes(s)) throw new Error(`Stage label leaked: ${s}`);
  }
  const drives = ['Agency', 'Communion', 'Eros', 'Agape'];
  for (const d of drives) {
    if (new RegExp(`\\b${d}\\b`, 'i').test(text)) throw new Error(`Drive name leaked: ${d}`);
  }
});

// --- Cross-registry consistency ---
check('every Line in ALL_LINES has a LINE_COMPLEX entry', () => {
  for (const line of ALL_LINES) {
    if (!(line in LINE_COMPLEX)) throw new Error(`Line ${line} missing from LINE_COMPLEX`);
  }
});

check('every Line in ALL_LINES has a LINE_DRIVE entry', () => {
  for (const line of ALL_LINES) {
    if (!(line in LINE_DRIVE)) throw new Error(`Line ${line} missing from LINE_DRIVE`);
  }
});

check('every Complex in ALL_COMPLEXES has at least 2 lines', () => {
  for (const complex of ALL_COMPLEXES) {
    const lines = linesForComplex(complex);
    if (lines.length < 2) throw new Error(`Complex ${complex} has only ${lines.length} line(s)`);
  }
});

console.log(`\n${passed + failed} checks run: ${passed} passed, ${failed} failed.`);

if (failed > 0) {
  console.error('\nInvariant check FAILED.');
  process.exit(1);
} else {
  console.log('\nAll invariants passed.');
  process.exit(0);
}
