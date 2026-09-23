/**
 * The validation roster — the report shape and `runValidationSuite`, which runs the gates in order.
 *
 * Split out of `gates.ts` (module-cohesion audit item 2). `runValidationSuite` IS the order in which
 * the gates run, so a new gate is added HERE to be run rather than merely to exist.
 *
 * Spec: docs/validation/BENCHMARK-ARCHITECTURE.md §6.
 */

import { PERSONAS, type PersonaSpec } from '../personas.js';
import { validatePracticeLoop } from '../../practice/practiceTools.js';
import { validatePodPrivacyWall } from '../../pods/podStateMachine.js';
import type { GateResult, Tier } from './plumbing.js';
import { CI_DIVERGENCE, validateAdaptiveDifficulty, validateCoherence, validateDivergence, validateEducationalStream, validateForgettingCurve, validateMetacognition, validateNeedsDetection, validateReproducibility, validateShadowResolution, validateTransformationGating } from './trajectory.js';
import { validateIdentityFirewall, validateLevellingMechanism, validateVeilCompliance } from './veil.js';
import { validateCorpusIntegrity, validateCredentialChain, validateMeasurementPacks, validatePlacementConvergence } from './curriculum.js';
import { validateDelegationDeterminism, validateDelegationToolsetFirewall, validatePriorityClosure } from './orchestration.js';
import { validateAuthoredSeedCoherence, validateCompositionIntegrity, validateInferenceWriteFirewall, validateScaffoldIntegrity, validateTierGate } from './personalization.js';
import { validateCouncilDispatch, validateMemoryPersistence, validatePolarityPool, validatePreferenceIntakeFirewall, validateRetrievalFirewall, validateRoleScopeAlignment, validateUdvBandPopulation, validateVerdictCompleteness } from './memory.js';
import { validateCheckedGraph, validateCliBoot, validateSystem1Boundary } from './surface.js';

export interface ValidationReport {
  tier: Tier;
  results: GateResult[];
  wallTimeMs: number;
  passed: boolean;
}

export async function runValidationSuite(tier: Tier = 'ci', personas: readonly PersonaSpec[] = PERSONAS): Promise<ValidationReport> {
  const t0 = Date.now();
  // Full tier: extend the trajectory horizons (spec §8). The temporal/persona
  // dynamics gates (G2 divergence, G4 therapy arc, G8 gating) get 8×8; the
  // double-run reproducibility gate keeps personas' declared horizons so the
  // CI budget is unaffected at tier='ci'.
  const effective = tier === 'full' ? withExtendedTrajectories(personas) : personas;
  const results: GateResult[] = [];
  results.push(validateReproducibility(effective));
  results.push(validateDivergence(effective, CI_DIVERGENCE));
  results.push(validateCoherence(effective));
  results.push(validateShadowResolution(effective));
  results.push(validateForgettingCurve(effective));
  results.push(validateEducationalStream(effective));
  results.push(validateMetacognition(effective));
  results.push(validateAdaptiveDifficulty());
  results.push(validateTransformationGating(effective, tier));
  results.push(validateNeedsDetection(effective));
  results.push(validateVeilCompliance());
  results.push(validateLevellingMechanism());
  results.push(validateIdentityFirewall());
  results.push(await validateDelegationDeterminism());
  results.push(validateDelegationToolsetFirewall());
  results.push(validatePracticeLoop());
  results.push(validateCorpusIntegrity());
  results.push(validatePodPrivacyWall());
  results.push(validateMeasurementPacks());
  results.push(validatePlacementConvergence());
  results.push(validateCredentialChain());
  results.push(validatePriorityClosure());
  results.push(validateCompositionIntegrity());
  results.push(validateTierGate());
  results.push(validateScaffoldIntegrity());
  results.push(validateInferenceWriteFirewall());
  results.push(validateAuthoredSeedCoherence());
  results.push(validateMemoryPersistence());
  results.push(validatePreferenceIntakeFirewall());
  results.push(validateVerdictCompleteness());
  results.push(validateRetrievalFirewall());
  results.push(validateRoleScopeAlignment());
  results.push(validateUdvBandPopulation());
  results.push(validateCouncilDispatch());
  results.push(validatePolarityPool());
  // Phase 14 d5: the class-level gates. G36 boots the entry point (the CLI is not the engine, so
  // no other gate can see it); G37 asserts the checked graph itself.
  results.push(await validateCliBoot());
  results.push(validateCheckedGraph());
  // Phase 14 d6: the System-1 boundary (43 §2).
  results.push(validateSystem1Boundary());
  const hardFailed = results.some((r) => r.hard && !r.passed);
  return { tier, results, wallTimeMs: Date.now() - t0, passed: !hardFailed };
}

function withExtendedTrajectories(personas: readonly PersonaSpec[]): readonly PersonaSpec[] {
  return personas.map((p) =>
    p.name === 'therapy-arc' || p.name === 'exited-and-returning'
      ? p
      : { ...p, trajectory: { ...p.trajectory, sessions: 8, encountersPerSession: 8 } },
  );
}
