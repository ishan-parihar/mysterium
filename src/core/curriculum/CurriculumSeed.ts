/**
 * CurriculumSeed — loads seed curriculum data into the global CurriculumRegistry.
 * Called at session start to populate the registry with holon data.
 *
 * This is a lightweight loader that reads the JSON seed files and registers
 * each holon into the global CurriculumRegistry singleton.
 */
import type { CurriculumHolon } from './types.js';
import { getCurriculumRegistry, isRegistrySeeded, markSeeded } from './CurriculumRegistry.js';
import { lintRegistry } from './CurriculumLinter.js';

/** Cached lint result from seed time. Avoids re-linting all holons at every session end. */
let _cachedLintResult: { totalErrors: number; totalWarnings: number; overallPassed: boolean } | null = null;

/** Get the cached lint result from seed time. Returns null if not yet seeded. */
export function getCachedLintResult(): { totalErrors: number; totalWarnings: number; overallPassed: boolean } | null {
  return _cachedLintResult;
}

// Import seed data modules
import csFoundations from './data/cs.foundations.json';
import csProgram from './data/cs.program.json';
import mathFoundations from './data/math.foundations.json';
import physicsFoundations from './data/physics.foundations.json';
import physicsProgram from './data/physics.program.json';
// P4-FIX (Full-Development Audit 2026-09-15): add the integral.foundations
// subject — the game's own developmental map as studyable curriculum holons.
import integralFoundations from './data/integral.foundations.json';

/** All seed data modules. Each entry is an array of CurriculumHolon objects. */
const SEED_MODULES: readonly { name: string; data: CurriculumHolon[] }[] = [
  { name: 'cs.program', data: csProgram as unknown as CurriculumHolon[] },
  { name: 'cs.foundations', data: csFoundations as unknown as CurriculumHolon[] },
  { name: 'math.foundations', data: mathFoundations as unknown as CurriculumHolon[] },
  { name: 'physics.foundations', data: physicsFoundations as unknown as CurriculumHolon[] },
  { name: 'physics.program', data: physicsProgram as unknown as CurriculumHolon[] },
  { name: 'integral.foundations', data: integralFoundations as unknown as CurriculumHolon[] },
];

/**
 * Seed the global CurriculumRegistry with all curriculum data files.
 * Safe to call multiple times — idempotent (only seeds once).
 * Returns the total number of holons registered.
 */
export function seedCurriculumRegistry(): number {
  if (isRegistrySeeded()) {
    return getCurriculumRegistry().count();
  }

  const registry = getCurriculumRegistry();
  let total = 0;

  for (const module of SEED_MODULES) {
    for (const holon of module.data) {
      registry.register(holon);
      total++;
    }
  }

  // Run linter on the seeded registry to catch structural/pedagogical issues
  // at startup rather than at runtime.
  const lintResult = lintRegistry(registry);
  if (!lintResult.overallPassed) {
    console.warn(`[CurriculumSeed] Lint errors in seeded data (${lintResult.totalErrors} errors, ${lintResult.totalWarnings} warnings):`);
    for (const issue of lintResult.graphIssues) {
      console.warn(`  [${issue.severity}] ${issue.message}`);
    }
    for (const report of lintResult.holonReports) {
      for (const err of report.errors) {
        console.warn(`  [${err.checkId}] ${err.location}: ${err.message}`);
      }
    }
  }

  markSeeded();

  // Cache the lint result so MetaCognitiveProbe doesn't re-lint all holons
  // at every session end. The registry is immutable after seeding.
  _cachedLintResult = {
    totalErrors: lintResult.totalErrors,
    totalWarnings: lintResult.totalWarnings,
    overallPassed: lintResult.overallPassed,
  };

  return total;
}
