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
import { validateCheckedGraph, validateCliBoot, validateSessionControlsWired, validateSystem1Boundary, validatePackSeamWired, validateLadderWired } from './surface.js';
import {
  validateCampaignContinuity,
  validateCampaignInvariants,
  validatePolarityLoopEntry,
  validateDeclaredStanceChannel,
  validateLineCoverage,
} from './campaign.js';

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
  // Phase 15 d5: the campaign gates. Every gate above either drives the kernel's own functions or
  // calls one seam function in isolation; these are the only two that assert over a TRAJECTORY of
  // sessions through the live seam — which is why the gap d3 found (personalizationContext() never
  // called on the fallback path) was invisible to all of them.
  results.push(await validateCampaignContinuity(tier));
  results.push(await validateCampaignInvariants(tier));
  // G41 (2026-09-24): the dialectic loop's entry point and its reconciliation law. Both defects it
  // locks lived in the COMPOSITION of two seam calls over time — an `undiscovered` pair can only be
  // discovered by a writer the selection path could never reach, and a second writer reconciled a
  // pair in one `sto` step against §4.3. No single-seam gate could see either.
  results.push(await validatePolarityLoopEntry(tier));
  // G42 (Phase 16 d2): `driveFixation` read as a pinned observable; it was a starved input. The
  // campaign's personas declared a drive tilt that `personaChoiceHandler` discarded, and their
  // narratives were generated filler so the keyword route could not fire either. This gate asserts
  // the stance now arrives, on the declared drive and at the declared rate — a reading that moved a
  // different drive, or the right drive by the wrong amount, means the signal is misrouted.
  results.push(await validateDeclaredStanceChannel(tier));
  // G43 (Phase 16 d3): line coverage was hash-decided — three lines took 74 % of 432 encounters and
  // Emotional took ONE, because the band's substantive comparator rules tied across lines and the
  // final reproducibility key then decided identically every time. The reserved developmental primary
  // is locked by unit test; this gate asserts the consequence a player would notice: every canonical
  // line is consumed by a finalized developmental encounter, and no line is starved to effective
  // exclusion. It does not claim that every secondary or ambient offer contains every line.
  results.push(await validateLineCoverage(tier));
  // G44 (Phase 16 d8): the session-control store was a write-only surface for its whole life — a
  // settings control for every field, one importer (the settings page), and no `SessionContext`
  // builder reading it. The failure is ABSENCE, so no runtime assertion could see it: an unread field
  // behaves exactly like a missing one. This gate reads the module graph instead, the same technique
  // as G37, and fails if the parity fields stop reaching the WebUI engine.
  results.push(await validateSessionControlsWired());
  // G45 (Phase 17 d1): the pack engine's registry was test-only in production — registerPack had
  // no production caller, so delegate.ts's single getPack read was a fallback-masked always-miss,
  // and pack sessions existed only inside gates/tests/CLI-drills of the runner. An unseeded
  // registry behaves exactly like an empty one, so no runtime gate can see the absence; this is
  // the same module-graph technique as G37/G44, extended to the CLI pack seam.
  results.push(await validatePackSeamWired());
  // G46 (Phase 17 d2): the articulation ladder was in-vitro — law-holding render code with zero
  // importers. Same absence class as G45; the gate requires BOTH halves of the seam at each
  // consumer (the payload bridge AND the law-holder), so the ladder cannot be bypassed with raw
  // payloads any more than it can go dark.
  results.push(await validateLadderWired());
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
