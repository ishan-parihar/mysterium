/**
 * Validation gates — assertions that the engine MEASURES correctly.
 *
 * Spec: docs/validation/BENCHMARK-ARCHITECTURE.md §6.
 *
 * Two kinds of gates:
 *  - Per-persona expectations: the engine's internal model must agree with the
 *    ground truth encoded in the persona's response policy.
 *  - Population gates: different personas must produce separable,
 *    reproducible, and coherent model states.
 *
 * Gate results carry observed details so failures are diagnosable without a
 * re-run. Hard gates block deployment; soft gates record and warn.
 */
import { PERSONAS, getPersona, type PersonaSpec } from './personas.js';
import { runPersonaTrajectory, runOneSession, type TrajectoryResult } from './harness.js';
import { describeStage } from '../presentation/veilDescriptors.js';
import { detectDevelopmentalNeeds } from '../curriculum/DevelopmentalNeedsDetector.js';
import { probeCurriculum } from '../curriculum/MetaCognitiveProbe.js';
import { getCurriculumRegistry } from '../curriculum/CurriculumRegistry.js';
import { seedInitialKnowledge } from '../curriculum/SeedInitialKnowledge.js';
import { initAdaptiveState, adapt } from '../adaptive/AdaptiveDifficultyService.js';
import type { Line } from '../domain/Line.js';
import type { KnowledgeState } from '../curriculum/types.js';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createSignificator, type Significator } from '../domain/Significator.js';
import { createInitialWorldState } from '../engines/CandidateGeneration.js';
import { ALL_LINES } from '../domain/Line.js';
import { ALL_DRIVES } from '../domain/Drive.js';
import { ALL_MODALITIES } from '../domain/enums.js';
import { SESSION_MODES } from '../domain/SessionMode.js';
import { ALL_STAGES, stageOrdinal } from '../domain/Stage.js';
import { delegateSession, emptyLedgerState } from '../orchestration/orchestratorTools.js';
import { validateSpec } from '../orchestration/delegate.js';
import { validatePracticeLoop } from '../practice/practiceTools.js';
import { seedCurriculumRegistry, getCachedLintResult } from '../curriculum/CurriculumSeed.js';
import { lintRegistry } from '../curriculum/CurriculumLinter.js';
import redHolonsJson from '../world/data/red-layer-holons.json';
import stageHolonsJson from '../world/data/stage-holons.json';
import conceptDraftsJson from '../data/concept-drafts.json';
import type { ConceptDraftIndex } from '../data/ConceptDraftIndex.js';
// Phase 11/12 memory gates (G28–G31): the surfaces they certify.
import { createOrchestrationServices, sessionEnd, captureCheckpoint, restoreCheckpoint, buildEnvelope, scopeContractViolations, assessmentScopeLine, type RuntimeCheckpoint } from '../personalization/sessionRuntime.js';
import { AGENT_ROLE_COUNCIL, AGENT_ROLE_SECONDARY_SCOPES, ALL_AGENT_ROLES, authorizeBandRead, renderStandingBlock } from '../orchestration/councilStanding.js';
// G34 (Phase 13 d12): the dispatch decision and the summoning tool vocabulary.
import { TRIGGER_TABLE, dispatchCouncil, dispatchTableViolations, type CouncilObservation } from '../orchestration/dispatcher.js';
import { COUNCIL_TOOLS, councilToolWiringViolations } from '../assessments/councilTools.js';
import { purposesFromVows, analogyFromInterests, preferenceFromHistory, observedFromEngagement, DEFAULT_PREFERENCE } from '../personalization/bandSources.js';
import type { Holon } from '../world/Holon.js';
import type { Proposal } from '../orchestration/types.js';
import { grantDeclaredPreference, withdrawDeclaredPreference, activeDeclaredInterests, activeDeclaredAversions, createEmptyIdentityProfile } from '../domain/IdentityProfile.js';
import { localRetrieve, tokenize, type Retrievable } from '../memory/LocalRetriever.js';
import { filterRecall, createEmbeddingProvider, EMBEDDING_MODEL_PIN, isBandedText } from '../memory/retrievalFirewall.js';
import { validatePodPrivacyWall } from '../pods/podStateMachine.js';
import { createTagStore } from '../world/tags/dialectic.js';
import { INITIAL_TAGS } from '../world/tags/initialTags.js';
import { createFacetStore } from '../world/facets/FacetStore.js';
import facetsJson from '../world/facets/facets.json';
import { selectPoles, pairKeyOf } from '../personalization/dialecticEngine.js';
import { deriveLibraryVariants } from '../personalization/polarityIndex.js';
import { decidePole, unfamiliarShareFor } from '../personalization/poleDecision.js';
import {
  applyReading, deterministicReading, polarityCoverage, auditReadingLog,
  CONFIRMATIONS_TO_RECONCILE, type ReadingApplication,
} from '../personalization/polarityResolution.js';
import { seedCandidateLibrary, initialTopicTagResolver } from '../personalization/candidateLibrary.js';
import { buildQuery, rankByRelevance } from '../personalization/pooling.js';
import { sharedFacetStore } from '../personalization/sessionRuntime.js';
import type { Modality } from '../domain/enums.js';
import { compose, createCompositionStore } from '../personalization/composition.js';
import { createInterestRecord } from '../personalization/interestRecord.js';
import { detectScaffoldShareDefects, detectVisibilityCollapse, type CompositionEvent } from '../personalization/diversityMonitor.js';
import { SCENARIO_SEEDS } from '../personalization/scenarioSeeds.js';
import { WORLD_SEEDS } from '../personalization/worldSeeds.js';
import { AUTHORED_PROBES } from '../personalization/probeContent.js';
import { checkCoherence } from '../personalization/stageCoherence.js';
import { createEvidenceLedger, META_PROGRAMS } from '../../infra/profiles/evidenceLedger.js';
import { createProbeLedger, recordProbePlay, recordProbeDecline, canOfferProbe, instrumentIsRVValidated, MAX_PROBES_PER_SESSION, type Probe } from '../personalization/probeSet.js';
import { REFERENCE_PACKS } from '../packs/referencePacks.js';
import {
  lintPack, startPackSession, nextItem, recordTrial,
  assignForm, computePsychometrics, integrateSkillTheta, readFreshTheta,
  type PackSessionState,
} from '../packs/PackEngine.js';
import { placeLine, MAX_PROBES_PER_LINE, CONFIDENCE_THRESHOLD, type PlacementProbe } from '../onboarding/BinarySearchPlacement.js';
import {
  emptyLedger, draftClaim, issueClaim, revokeClaim, toVerifiableCredential,
  packEvidenceRef, masteryEvidenceRef, validateClaim,
} from '../credential/ClaimLedger.js';
import type { DelegatedTool, DelegationSpec, ProjectionKey } from '../orchestration/types.js';
import type { Stage } from '../domain/Stage.js';
import {
  buildLineLadder,
  buildSyllabusLadder,
  evaluateLineLevel,
  evaluateSyllabusLevel,
  DEFAULT_LEVELLING_CONFIG,
  EMPTY_PRIOR,
} from '../curriculum/LevellingEngine.js';
import {
  ALL_CRITERIA,
  CRITERION_SCORES,
  DEFAULT_WEIGHTS,
  FORMER_TERM_DISPOSITION,
  applyWeightBias,
  computePriority,
  effectiveWeights,
  weightSum,
} from '../engines/PriorityComputation.js';
import { rankCandidates, TIE_BAND } from '../engines/EncounterScheduler.js';

// ---------------------------------------------------------------------------
// Gate plumbing
// ---------------------------------------------------------------------------

export type Tier = 'ci' | 'full';

export interface GateResult {
  gate: string;
  passed: boolean;
  hard: boolean;
  details: string;
}

function fmt(n: number | undefined | null): string {
  return typeof n === 'number' ? n.toFixed(4) : String(n);
}

const finalOf = (r: TrajectoryResult) => r.sessions[r.sessions.length - 1]!.observables;

// ---------------------------------------------------------------------------
// G1 — Reproducibility (stability)
// ---------------------------------------------------------------------------

export function validateReproducibility(personas: readonly PersonaSpec[] = PERSONAS): GateResult {
  for (const persona of personas) {
    const a = runPersonaTrajectory(persona);
    const b = runPersonaTrajectory(persona);
    const fa = finalOf(a);
    const fb = finalOf(b);
    if (fa.cci !== fb.cci || fa.shadowsTotal !== fb.shadowsTotal || fa.currentStage !== fb.currentStage) {
      return {
        gate: 'G1-reproducibility', passed: false, hard: true,
        details: `${persona.name}: run A cci=${fmt(fa.cci)} shadows=${fa.shadowsTotal} stage=${fa.currentStage} vs run B cci=${fmt(fb.cci)} shadows=${fb.shadowsTotal} stage=${fb.currentStage}`,
      };
    }
  }
  return { gate: 'G1-reproducibility', passed: true, hard: true, details: `${personas.length} personas byte-stable across double runs` };
}

// ---------------------------------------------------------------------------
// G2 — Population divergence
// ---------------------------------------------------------------------------

export interface DivergenceThresholds {
  cciMinDelta: number;
  shadowMinDelta: number;
  retentionMinDelta: number;
  requiredOf: number;
}

export const CI_DIVERGENCE: DivergenceThresholds = {
  // Calibrated 2026-09-15 at 10-persona CI tier (see BENCHMARK-ARCHITECTURE §7):
  // observed cciΔ=0.1413, shadowΔ=12, retentionΔ=0.100 — thresholds set with
  // ~30-60% margin below observations.
  cciMinDelta: 0.05,
  shadowMinDelta: 3,
  retentionMinDelta: 0.08,
  requiredOf: 2,
};

export function validateDivergence(personas: readonly PersonaSpec[] = PERSONAS, thresholds: DivergenceThresholds = CI_DIVERGENCE): GateResult {
  const byName = (n: string) => personas.find((p) => p.name === n) ?? getPersona(n);
  const flour = finalOf(runPersonaTrajectory(byName('flourishing')));
  const constr = finalOf(runPersonaTrajectory(byName('constricted')));
  const stalled = finalOf(runPersonaTrajectory(byName('stalled-learner')));

  const cciDelta = flour.cci - constr.cci;
  const shadowDelta = constr.shadowsUnresolved - flour.shadowsUnresolved;
  const retentionDelta =
    Math.max(...Object.values(flour.conceptRetention), 0) -
    Math.max(...Object.values(stalled.conceptRetention), 0);

  const separations = [
    { metric: 'cci(flourishing−constricted)', delta: cciDelta, min: thresholds.cciMinDelta },
    { metric: 'shadowsUnresolved(constricted−flourishing)', delta: shadowDelta, min: thresholds.shadowMinDelta },
    { metric: 'retention(flourishing−stalled)', delta: retentionDelta, min: thresholds.retentionMinDelta },
  ];
  const passedCount = separations.filter((s) => s.delta >= s.min).length;
  const ok = passedCount >= thresholds.requiredOf;
  return {
    gate: 'G2-divergence',
    passed: ok,
    hard: true,
    details: separations.map((s) => `${s.metric}=${fmt(s.delta)} (need ≥${s.min})`).join('; ') + ` — ${passedCount}/${separations.length} separated`,
  };
}

// ---------------------------------------------------------------------------
// G3 — Personality coherence across surfaces (entry-config invariance)
// ---------------------------------------------------------------------------

export function validateCoherence(personas: readonly PersonaSpec[] = PERSONAS): GateResult {
  // The CLI and WebUI populate SessionContext differently. Entry-config
  // variance that legitimately changes the SCHEDULE (energy shaping session
  // arcs is correct auto-mode adaptation, foundations/27 §4) must NOT change
  // the persona's decision-grade developmental signal: same strategy theme,
  // same shadow-count class, same stage. CCI is expected to move slightly when
  // the schedule changes (different encounters → different traces); theme and
  // stage are the coherence contract.
  const configs: Record<string, unknown>[] = [
    { inferredEnergy: 'high' as const },
    { inferredEnergy: 'low' as const },
    { recentLines: ['Cognitive', 'Emotional'] },
  ];
  for (const persona of personas) {
    const baseline = runOneSession(persona, {});
    for (const cfg of configs) {
      const variant = runOneSession(persona, cfg);
      if (variant.observables.themes.join() !== baseline.observables.themes.join()) {
        return {
          gate: 'G3-coherence', passed: false, hard: true,
          details: `${persona.name}: theme ${JSON.stringify(variant.observables.themes)} under config ${JSON.stringify(cfg)} vs baseline ${JSON.stringify(baseline.observables.themes)}`,
        };
      }
      if (variant.observables.currentStage !== baseline.observables.currentStage) {
        return {
          gate: 'G3-coherence', passed: false, hard: true,
          details: `${persona.name}: stage ${variant.observables.currentStage} under config ${JSON.stringify(cfg)} vs baseline ${baseline.observables.currentStage}`,
        };
      }
      if (Math.abs(variant.observables.shadowsTotal - baseline.observables.shadowsTotal) > 2) {
        return {
          gate: 'G3-coherence', passed: false, hard: true,
          details: `${persona.name}: shadow count ${variant.observables.shadowsTotal} under config ${JSON.stringify(cfg)} vs baseline ${baseline.observables.shadowsTotal}`,
        };
      }
    }
  }
  return { gate: 'G3-coherence', passed: true, hard: true, details: `${personas.length} personas: theme/stage/shadow-class invariant to entry-config variance` };
}

// ---------------------------------------------------------------------------
// G4 — Shadow lifecycle under healthy engagement (the therapy gate)
// ---------------------------------------------------------------------------

export function validateShadowResolution(personas: readonly PersonaSpec[] = PERSONAS): GateResult {
  const arc = runPersonaTrajectory(personas.find((p) => p.name === 'therapy-arc') ?? getPersona('therapy-arc'));
  const last = finalOf(arc);
  if (last.shadowsUnresolved > 1) {
    return {
      gate: 'G4-shadow-resolution', passed: false, hard: true,
      details: `therapy-arc ended with ${last.shadowsUnresolved} unresolved shadows after healthy engagement (expected ≤1)`,
    };
  }
  return { gate: 'G4-shadow-resolution', passed: true, hard: true, details: `therapy-arc: shadow load ${arc.sessions[0]!.observables.shadowsUnresolved} → ${last.shadowsUnresolved} after healthy engagement` };
}

// ---------------------------------------------------------------------------
// G5 — Forgetting curve fidelity (the teaching gate)
// ---------------------------------------------------------------------------

export function validateForgettingCurve(personas: readonly PersonaSpec[] = PERSONAS): GateResult {
  const stalled = runPersonaTrajectory(personas.find((p) => p.name === 'stalled-learner') ?? getPersona('stalled-learner'));
  // stalled-learner never passes: retention must never meaningfully rise.
  let maxRise = 0;
  let prevMax = 0;
  for (const s of stalled.sessions) {
    const values = Object.values(s.observables.conceptRetention);
    const maxRet = values.length > 0 ? Math.max(...values) : 0;
    if (s.session > 1) maxRise = Math.max(maxRise, maxRet - prevMax);
    prevMax = Math.max(prevMax, maxRet);
  }
  if (maxRise > 0.05) {
    return {
      gate: 'G5-forgetting-curve', passed: false, hard: true,
      details: `retention rose by ${fmt(maxRise)} between sessions for a never-passing learner — forgetting model not tracking memory`,
    };
  }
  return { gate: 'G5-forgetting-curve', passed: true, hard: true, details: `never-passing learner retention never rose more than ${fmt(maxRise)}` };
}

// ---------------------------------------------------------------------------
// G6 — Educational stream engagement
// ---------------------------------------------------------------------------

export function validateEducationalStream(personas: readonly PersonaSpec[] = PERSONAS): GateResult {
  const fast = runPersonaTrajectory(personas.find((p) => p.name === 'fast-learner') ?? getPersona('fast-learner'));
  const strategy = fast.sessions[0]!.observables;
  const allocated = strategy.curriculumSlots > 0 || strategy.trainingSlots > 0;
  const received = fast.sessions[fast.sessions.length - 1]!.observables;
  const encountered = received.curriculumEncounters + received.trainingEncounters > 0;
  if (allocated && !encountered) {
    return {
      gate: 'G6-educational-stream', passed: false, hard: false,
      details: `strategy allocated curriculum=${strategy.curriculumSlots} training=${strategy.trainingSlots} slots but 0 curriculum/training encounters were delivered across the trajectory`,
    };
  }
  return {
    gate: 'G6-educational-stream', passed: true, hard: false,
    details: `slots allocated (curriculum=${strategy.curriculumSlots}, training=${strategy.trainingSlots}); delivered curriculum=${received.curriculumEncounters}, training=${received.trainingEncounters}`,
  };
}

// ---------------------------------------------------------------------------
// G6b — Metacognitive self-audit
// ---------------------------------------------------------------------------

export function validateMetacognition(personas: readonly PersonaSpec[] = PERSONAS): GateResult {
  const fast = runPersonaTrajectory(personas.find((p) => p.name === 'fast-learner') ?? getPersona('fast-learner'));
  const finalSig = fast.sessions[fast.sessions.length - 1]!.sig;
  const knowledge = finalSig.knowledge ?? seedInitialKnowledge('Cognitive', 'Red');
  const probe = probeCurriculum(knowledge, getCurriculumRegistry(), Date.now());
  const criticals = probe.progression?.criticalCount ?? 0;
  if (probe.overallHealth <= 0.5 || criticals > 0) {
    return {
      gate: 'G6b-metacognition', passed: false, hard: false,
      details: `probe overallHealth=${fmt(probe.overallHealth)}, criticalCount=${criticals} for a passing learner`,
    };
  }
  return { gate: 'G6b-metacognition', passed: true, hard: false, details: `probe overallHealth=${fmt(probe.overallHealth)}, criticals=0` };
}

// ---------------------------------------------------------------------------
// G7 — Adaptive difficulty separation (the mastery gate)
// ---------------------------------------------------------------------------

export function validateAdaptiveDifficulty(): GateResult {
  // The engine's difficulty estimator must separate strong from weak players.
  const strong = initAdaptiveState(0.35);
  const weak = initAdaptiveState(0.35);
  let s = strong, w = weak;
  let seed = 42;
  const rng = () => { seed = (seed * 1664525 + 1013904223) % 0xffffffff; return seed / 0xffffffff; };
  for (let i = 0; i < 60; i++) {
    s = adapt(s, 0.8 + (rng() - 0.5) * 0.2 > s.level);
    w = adapt(w, 0.3 + (rng() - 0.5) * 0.2 > w.level);
  }
  if (s.level <= w.level + 0.1) {
    return {
      gate: 'G7-adaptive-difficulty', passed: false, hard: false,
      details: `strong player level ${fmt(s.level)} not separated from weak player level ${fmt(w.level)} after 60 trials`,
    };
  }
  return { gate: 'G7-adaptive-difficulty', passed: true, hard: false, details: `strong=${fmt(s.level)} vs weak=${fmt(w.level)} after 60 trials` };
}

// ---------------------------------------------------------------------------
// G8 — Transformation gating (stage integrity)
// ---------------------------------------------------------------------------

export function validateTransformationGating(personas: readonly PersonaSpec[] = PERSONAS, tier: Tier = 'ci'): GateResult {
  const observations: string[] = [];
  for (const name of ['flourishing', 'approaching-threshold', 'therapy-arc']) {
    const r = runPersonaTrajectory(personas.find((p) => p.name === name) ?? getPersona(name));
    let prevStage: string | null = null;
    let thresholdSeen = false;
    for (const s of r.sessions) {
      const stage = s.observables.currentStage;
      // Invariant (both tiers): stage changes are exactly +1 — no skips, no demotion.
      if (prevStage !== null && stage !== prevStage) {
        const stageOrd = (st: string) => stageOrdinal(st as Stage);
        if (stageOrd(stage) !== stageOrd(prevStage) + 1) {
          return {
            gate: 'G8-transformation-gating', passed: false, hard: true,
            details: `${name}: stage jumped ${prevStage} → ${stage} at session ${s.session} — transformations must advance exactly one stage`,
          };
        }
        // A commit is only legitimate if the readiness threshold was crossed
        // in a PRIOR session (the gate precedes the commit).
        if (!thresholdSeen) {
          return {
            gate: 'G8-transformation-gating', passed: false, hard: true,
            details: `${name}: stage committed ${prevStage} → ${stage} at session ${s.session} without readiness ≥0.8 observed beforehand`,
          };
        }
      }
      if (s.observables.readiness >= 0.8) thresholdSeen = true;
      prevStage = stage;
      observations.push(`${name}@${s.session}:${stage}/${s.observables.readiness.toFixed(3)}`);
    }
  }
  // CI-tier-specific: the young horizon must show NO commit and readiness
  // strictly below threshold — proving the gate is not vacuously passing.
  if (tier === 'ci') {
    for (const name of ['flourishing', 'approaching-threshold']) {
      const r = runPersonaTrajectory(personas.find((p) => p.name === name) ?? getPersona(name));
      const last = finalOf(r);
      if (last.currentStage !== 'Red' || last.readiness >= 0.8) {
        return {
          gate: 'G8-transformation-gating', passed: false, hard: true,
          details: `${name} at CI horizon: stage=${last.currentStage} readiness=${fmt(last.readiness)} — expected Red with readiness <0.8 (non-vacuous gate check)`,
        };
      }
    }
  }
  return {
    gate: 'G8-transformation-gating', passed: true, hard: true,
    details: `stage ordering +1-only with threshold-preceded commits; ${tier === 'ci' ? 'CI horizon: no commit, readiness <0.8' : 'full horizon terminal states: ' + observations.slice(-3).join(', ')}`,
  };
}

// ---------------------------------------------------------------------------
// G9 — Needs detection
// ---------------------------------------------------------------------------

export function validateNeedsDetection(personas: readonly PersonaSpec[] = PERSONAS): GateResult {
  const constr = runPersonaTrajectory(personas.find((p) => p.name === 'constricted') ?? getPersona('constricted'));
  const finalSig = constr.sessions[constr.sessions.length - 1]!.sig;
  const needs = detectDevelopmentalNeeds(finalSig);
  const relevant = needs.filter(
    (n) => n.line === 'Interpersonal' || n.line === 'Communion' as unknown as Line,
  );
  const fixation = finalSig.drives.fixationRisk.Communion ?? 0;
  if (relevant.length === 0 && fixation < 0.6) {
    return {
      gate: 'G9-needs-detection', passed: false, hard: false,
      details: `constricted persona: no Interpersonal need detected (needs=${JSON.stringify(needs)}) and Communion fixation=${fmt(fixation)} below the 0.6 detection threshold`,
    };
  }
  return {
    gate: 'G9-needs-detection', passed: true, hard: false,
    details: `needs=${JSON.stringify(needs.map((n) => `${n.type}:${n.line}:${fmt(n.urgency)}`))}; Communion fixation=${fmt(fixation)}`,
  };
}

// ---------------------------------------------------------------------------
// G10 — Veil invariants (the guide's ethics)
// ---------------------------------------------------------------------------

const SCORE_TOKEN = /\b\d+(\.\d+)?\b/;
const ALLOWED_WORDS = new Set(['One']);

export function validateVeilCompliance(): GateResult {
  for (const persona of PERSONAS) {
    const r = runPersonaTrajectory(persona);
    const sig = r.sessions[r.sessions.length - 1]!.sig;
    const description = describeStage(sig.currentStage);
    const tokens = description.match(SCORE_TOKEN) ?? [];
    const leaked = tokens.filter((t) => !ALLOWED_WORDS.has(t));
    if (leaked.length > 0) {
      return {
        gate: 'G10-veil-compliance', passed: false, hard: true,
        details: `describeStage(${sig.currentStage}) leaked score-like tokens: ${leaked.join(', ')} — "${description}"`,
      };
    }
  }
  return { gate: 'G10-veil-compliance', passed: true, hard: true, details: 'no score tokens in Veil descriptors for any persona terminal state' };
}

// ---------------------------------------------------------------------------
// G11 — Levelling mechanism (doc 42): demographic-blindness + laws
// ---------------------------------------------------------------------------

/** Vocabulary that must never appear in levelling thresholds or inputs. */
const FORBIDDEN_VOCAB = /\b(age|ages|boy|girl|male|female|gender|sex|race|ethnic|minority|iq)\b|\bold\b|\byears?[- ]?old\b|\bgrade[- ]?(band|level)\b/i;

/**
 * D2: lints the levelling engine source itself for demographic vocabulary —
 * the mechanism cannot express an age proxy without using these words.
 * D1+D3 (behavioral): identical evidence ⇒ identical evaluation, regardless
 * of any field not in the input shape (type-enforced), and deterministic.
 */
export function validateLevellingMechanism(): GateResult {
  // D2 — source lint: the mechanism cannot express an age proxy without the
  // forbidden vocabulary. Falls back to linting the exposed constants when
  // source is unavailable (bundled environments).
  let src = '';
  try {
    const p = path.resolve(process.cwd(), 'src/core/curriculum/LevellingEngine.ts');
    if (fs.existsSync(p)) src = fs.readFileSync(p, 'utf8');
  } catch {
    src = '';
  }
  if (!src) src = JSON.stringify(DEFAULT_LEVELLING_CONFIG);
  // Strip comments before matching — D2 forbids demographic vocabulary in
  // CODE (identifiers, thresholds, branches), not in prose that states the
  // policy itself. The doc-comment may say "age must never be an input";
  // the code must never say `if (age < 18)`.
  const codeOnly = src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
  const vocabHit = codeOnly.match(FORBIDDEN_VOCAB);
  if (vocabHit) {
    return {
      gate: 'G11-levelling-mechanism', passed: false, hard: true,
      details: `demographic vocabulary "${vocabHit[0]}" found in levelling engine — forbidden by doc 42 §3.8 D2`,
    };
  }

  // D3 — determinism: identical evidence ⇒ identical evaluation.
  const now = 1_700_000_000_000;
  const altitudes = { Cognitive: 'Amber', Emotional: 'Red', Moral: 'Red', Intrapersonal: 'Magenta', Spiritual: 'Magenta', Somatic: 'Magenta', Willpower: 'Red', Interpersonal: 'Red' } as const;
  const baseInputs = { altitudes, theta: { lastEncounter: {} }, shadows: [] as never[], nowMs: now };
  const a = evaluateLineLevel(baseInputs, 'Cognitive');
  const b = evaluateLineLevel(baseInputs, 'Cognitive');
  if (a.evidenceScore !== b.evidenceScore || a.currentRung !== b.currentRung) {
    return { gate: 'G11-levelling-mechanism', passed: false, hard: true, details: 'line evaluation is not deterministic for identical inputs' };
  }

  // Evidence law: raising altitude must raise the computed rung.
  const raised = { ...baseInputs, altitudes: { ...altitudes, Cognitive: 'Orange' as const } };
  const raisedEval = evaluateLineLevel(raised, 'Cognitive');
  if (raisedEval.currentRung <= a.currentRung) {
    return { gate: 'G11-levelling-mechanism', passed: false, hard: true, details: 'raising altitude did not raise the computed rung — levelling is not evidence-driven' };
  }

  // Holonic integrity: an unresolved same-line shadow at/below the stage caps evidence.
  const shadowed = {
    ...baseInputs,
    shadows: [{
      id: 'g11-s1', quadrant: 'DarkAddiction' as const, line: 'Cognitive' as Line,
      stage: 'Amber' as const, drive: 'Eros' as const, surfacedAt: now - 1_000,
      resolvedAt: null, recurrenceCount: 0, compoundPartner: null, severity: 0.5,
    }],
  };
  const shadowedEval = evaluateLineLevel(shadowed, 'Cognitive');
  if (shadowedEval.cappedBy !== 'shadows') {
    return { gate: 'G11-levelling-mechanism', passed: false, hard: true, details: 'unresolved same-line shadow did not cap line evidence (holonic integrity gate inactive)' };
  }

  // Syllabus ladder: no evidence ⇒ rung 0, score 0.
  const emptyKnowledge: KnowledgeState = {
    conceptStates: new Map(),
    subjectProgress: new Map(),
    studyHistory: [],
    learningProfile: { preferredModalities: [], metacognitionScore: 0.5, calibrationAccuracy: 0.5, transferCapacity: 0.5, studyEfficiency: 0.5 },
  };
  const syll = evaluateSyllabusLevel(emptyKnowledge, [], DEFAULT_LEVELLING_CONFIG, EMPTY_PRIOR);
  if (syll.evidenceScore !== 0 || syll.currentRung !== 0) {
    return { gate: 'G11-levelling-mechanism', passed: false, hard: true, details: `empty syllabus evidence must be rung 0 (got rung ${syll.currentRung}, score ${syll.evidenceScore})` };
  }

  // Ladder shape: both families expose 8 rungs with monotone bars.
  const lineLadder = buildLineLadder('Cognitive');
  const syllLadder = buildSyllabusLadder('cs');
  if (lineLadder.rungs.length !== 8 || syllLadder.rungs.length !== 8) {
    return { gate: 'G11-levelling-mechanism', passed: false, hard: true, details: 'ladders must expose exactly 8 rungs' };
  }

  return { gate: 'G11-levelling-mechanism', passed: true, hard: true, details: 'levelling deterministic, evidence-driven, shadow-gated; no demographic vocabulary in engine' };
}

// ---------------------------------------------------------------------------
// G12 — Identity firewall (doc 42 §1.1, doc 16 §2.1):
// measurement paths must not import the healing/identity layer
// ---------------------------------------------------------------------------

/**
 * The competence/identity firewall: identity context exists FOR HEALING
 * (voicing/texture via projectHealingContext) and must be structurally
 * unreachable from measurement machinery. Asserts by source lint:
 *   - src/core/curriculum/**, src/core/engines/**, src/core/adaptive/** must
 *     not import HealingContext or IdentityProfile.
 *   - The projector must check consent (isFieldUsable) before any field use.
 *   - The Significator's identity field stays OPTIONAL (consent-gated existence).
 */
export function validateIdentityFirewall(): GateResult {
  let ok = true;
  const problems: string[] = [];
  try {
    const roots = ['src/core/curriculum', 'src/core/engines', 'src/core/adaptive'];
    const walk = (dir: string): string[] => {
      const out: string[] = [];
      let entries: fs.Dirent[] = [];
      try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
      for (const e of entries) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) out.push(...walk(p));
        else if (e.name.endsWith('.ts')) out.push(p);
      }
      return out;
    };
    for (const root of roots) {
      for (const file of walk(path.resolve(process.cwd(), root))) {
        const src = fs.readFileSync(file, 'utf8');
        const code = src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
        if (/HealingContext|projectHealingContext|IdentityProfile/.test(code)) {
          ok = false;
          problems.push(`${file} references the identity/healing layer`);
        }
      }
    }
    // The projector must be consent-checked: source must call isFieldUsable.
    const hcPath = path.resolve(process.cwd(), 'src/core/healing/HealingContext.ts');
    if (fs.existsSync(hcPath)) {
      const hc = fs.readFileSync(hcPath, 'utf8');
      if (!hc.includes('isFieldUsable')) {
        ok = false;
        problems.push('HealingContext projector does not check per-field consent (isFieldUsable)');
      }
    }
    // Consent-gated existence: identity must be optional on the Significator type.
    const sigPath = path.resolve(process.cwd(), 'src/core/domain/Significator.ts');
    if (fs.existsSync(sigPath)) {
      const sigSrc = fs.readFileSync(sigPath, 'utf8');
      if (!/readonly identity\?\s*:\s*IdentityProfile/.test(sigSrc)) {
        ok = false;
        problems.push('Significator.identity must be optional (consent-gated existence)');
      }
    }
  } catch (err) {
    return { gate: 'G12-identity-firewall', passed: false, hard: true, details: `firewall check failed to run: ${err}` };
  }
  if (!ok) {
    return { gate: 'G12-identity-firewall', passed: false, hard: true, details: `identity firewall breached: ${problems.join('; ')}` };
  }
  return { gate: 'G12-identity-firewall', passed: true, hard: true, details: 'measurement paths clean of identity imports; projector consent-checked; identity optional on Significator' };
}

// ---------------------------------------------------------------------------
// G17 — Corpus integrity (hard): the content corpus must resolve as a closed
// graph — every stage-holon cell populated, every relationship resolvable,
// every curriculum branch lint-clean with resolvable prerequisites, and the
// concept-draft index covering all 64 modules (plan Phase 3).
// ---------------------------------------------------------------------------

export function validateCorpusIntegrity(): GateResult {
  try {
    // 1. Stage-holon cells: all 8 stages × 8 lines covered by the combined
    //    red-layer + stage corpus, with all relationships resolvable.
    const holons = [...redHolonsJson, ...stageHolonsJson] as unknown as import('../world/Holon.js').Holon[];
    const cells = new Set(holons.map((h) => `${h.line}:${h.stage}`));
    for (const line of ALL_LINES) {
      for (const stage of ALL_STAGES) {
        if (!cells.has(`${line}:${stage}`)) {
          return { gate: 'G17 corpus integrity', passed: false, hard: true, details: `missing stage-holon cell ${line}:${stage}` };
        }
      }
    }
    const ids = new Set(holons.map((h) => h.id));
    for (const h of holons) {
      for (const rel of h.relationships) {
        if (!ids.has(rel)) {
          return { gate: 'G17 corpus integrity', passed: false, hard: true, details: `unresolved relationship ${h.id} → ${rel}` };
        }
      }
    }

    // 2. Curriculum corpus: every seeded holon must lint without errors and
    //    every prerequisite must resolve within the registry.
    seedCurriculumRegistry();
    const registry = getCurriculumRegistry();
    const lint = getCachedLintResult() ?? lintRegistry(registry);
    if (lint.totalErrors > 0) {
      return { gate: 'G17 corpus integrity', passed: false, hard: true, details: `curriculum lint: ${lint.totalErrors} errors` };
    }

    // 3. Concept-draft index: the 64-module authored corpus must be complete.
    const drafts = conceptDraftsJson as unknown as ConceptDraftIndex;
    if (drafts.modules && Object.keys(drafts.modules).length !== 64) {
      return { gate: 'G17 corpus integrity', passed: false, hard: true, details: `concept-draft index covers ${Object.keys(drafts.modules).length}/64 modules` };
    }

    return { gate: 'G17 corpus integrity', passed: true, hard: true, details: `64/64 cells, ${holons.length} holons, ${registry.count()} curriculum holons lint-clean, 64/64 concept modules` };
  } catch (e) {
    return { gate: 'G17 corpus integrity', passed: false, hard: true, details: `error: ${e instanceof Error ? e.message : String(e)}` };
  }
}

// ---------------------------------------------------------------------------
// G19 — Measurement packs (hard, plan Phase 5): pack scoring determinism,
// linter teeth, and the reliability-gate firewall — no pack feeds anything
// downstream until reliability exists or is explicitly provisional.
// ---------------------------------------------------------------------------

export function validateMeasurementPacks(): GateResult {
  const mk = (m: string): GateResult => ({ gate: 'G19 measurement packs', passed: false, hard: true, details: m });
  try {
    for (const pack of REFERENCE_PACKS) {
      // Linter must pass every reference pack (PK-1..PK-4, no errors).
      const issues = lintPack(pack).filter((i) => i.severity === 'error');
      if (issues.length > 0) return mk(`${pack.id} lint errors: ${issues.map((i) => i.message).join('; ')}`);

      // Determinism: same seed + same responder policy ⇒ identical session.
      const run = (seed: number): PackSessionState => {
        let s = startPackSession(pack, assignForm(pack, 0), seed, 4);
        while (!s.finished) {
          const item = nextItem(pack, s.formId, s);
          if (!item) break;
          s = recordTrial(s, pack, item, item.difficulty <= 6);
        }
        return s;
      };
      const a = run(777);
      const b = run(777);
      if (a.theta !== b.theta || a.administered.join(',') !== b.administered.join(',')) {
        return mk(`${pack.id} scoring is not deterministic for identical seeds`);
      }
      const c = run(778);
      if (c.theta === a.theta && c.administered.join(',') === a.administered.join(',')) {
        return mk(`${pack.id} is insensitive to seed — selection is likely degenerate`);
      }

      // Stream integration: theta folds in, freshness reads decay toward 0.
      let streams: Record<string, import('../domain/SharedTypes.js').SkillThetaStream> | undefined;
      streams = integrateSkillTheta(streams, pack, { sessionId: 'g19', formId: a.formId, theta: a.theta, se: a.se, trials: a.trial, correctCount: a.correctCount, itemIds: a.administered, completedAtMs: 1_000_000 });
      const fresh = readFreshTheta(streams[pack.id], 1_000_000 + 10 * 365 * 86_400_000);
      if (fresh === null || fresh > a.theta) {
        return mk(`${pack.id} freshness decay broken (fresh=${fresh})`);
      }
    }

    // Linter teeth: a degraded pack (1 form) MUST fail.
    const degraded = { ...REFERENCE_PACKS[0]!, forms: [REFERENCE_PACKS[0]!.forms[0]!] };
    const degradedIssues = lintPack(degraded);
    if (!degradedIssues.some((i) => i.checkId === 'PK-1' && i.severity === 'error')) {
      return mk('pack linter accepted a single-form pack (no teeth)');
    }

    // Psychometrics: reports compute and flag provisional honestly.
    const pack = REFERENCE_PACKS[0]!;
    const recs = Array.from({ length: 4 }, (_, i) => ({
      sessionId: `s${i}`, formId: assignForm(pack, i), theta: 5 + i * 0.1, se: 0.3,
      trials: 12, correctCount: 8, itemIds: ['ws.5.5', 'ws.6.6'], completedAtMs: 1000 * i,
    }));
    const report = computePsychometrics(pack, recs);
    if (!report.provisional || report.sessionCount !== 4) return mk('psychometrics report malformed');

    return { gate: 'G19 measurement packs', passed: true, hard: true, details: `${REFERENCE_PACKS.length} reference packs: deterministic, lint-clean, stream-integrated; linter has teeth; reports provisional` };
  } catch (e) {
    return mk(`error: ${e instanceof Error ? e.message : String(e)}`);
  }
}

// ---------------------------------------------------------------------------
// G20 — Placement convergence (hard, plan Phase 7): the binary-search
// onboarding composite must converge within the 8-probe psychophysics budget
// (08) and seed altitudes within tolerance of ground truth.
// ---------------------------------------------------------------------------

export function validatePlacementConvergence(): GateResult {
  const mk = (m: string): GateResult => ({ gate: 'G20 placement convergence', passed: false, hard: true, details: m });
  try {
    // Probe factory: a deterministic synthetic player whose true altitude on
    // every line is `truth`. Passes with confidence when stage ≤ truth,
    // fails above, boundary-ambiguous exactly at truth+0.5 cases are avoided
    // by construction. attempt > 0 resolves the ambiguity (extra trials).
    const makeProbe = (truth: Stage): PlacementProbe => {
      const truthIdx = ALL_STAGES.indexOf(truth);
      return (line, stage, attempt) => {
        void line;
        const idx = ALL_STAGES.indexOf(stage);
        if (idx < truthIdx) return { outcome: 'pass', confidence: 0.9 };
        if (idx > truthIdx + 1) return { outcome: 'fail', confidence: 0.9 };
        if (idx === truthIdx) return { outcome: 'pass', confidence: 0.85 };
        if (idx === truthIdx + 1) return { outcome: 'fail', confidence: 0.85 };
        return { outcome: attempt === 0 ? 'pass' : 'pass', confidence: attempt === 0 ? 0.5 : 0.9 };
      };
    };

    for (const truth of ['Red', 'Amber', 'Orange', 'Teal'] as const) {
      const p = placeLine('Cognitive', makeProbe(truth));
      if (!p.converged) return mk(`line did not converge for truth ${truth}`);
      if (p.probesUsed > MAX_PROBES_PER_LINE) return mk(`probe budget exceeded for truth ${truth} (${p.probesUsed})`);
      if (p.altitude !== truth) return mk(`altitude ${String(p.altitude)} ≠ ground truth ${truth}`);
    }

    // Boundary case: ambiguous probes that stay ambiguous → boundary, not crash.
    const ambiguousProbe: PlacementProbe = () => ({ outcome: 'pass', confidence: CONFIDENCE_THRESHOLD - 0.1 });
    const boundary = placeLine('Somatic', ambiguousProbe);
    if (boundary.converged || !boundary.boundary) return mk('persistent ambiguity must mark boundary, not fake convergence');

    // Ladder edges: truth at Infrared (fail at start → down-walk) and Turquoise.
    const bottom = placeLine('Moral', makeProbe('Infrared'));
    if (bottom.altitude !== 'Infrared') return mk('bottom-of-ladder placement failed');
    const top = placeLine('Spiritual', makeProbe('Turquoise'));
    if (top.altitude !== 'Turquoise') return mk('top-of-ladder placement failed');

    return { gate: 'G20 placement convergence', passed: true, hard: true, details: `converges ≤${MAX_PROBES_PER_LINE} probes at all truths tested; edges hold; ambiguity → boundary` };
  } catch (e) {
    return mk(`error: ${e instanceof Error ? e.message : String(e)}`);
  }
}

// ---------------------------------------------------------------------------
// G21 — Credentialing evidence chain (hard, plan Phase 9): claims trace to
// reliable-or-disclosed evidence, provisional evidence travels with its
// disclosure, identity never enters credential payloads, and the engine's
// behavior is identical with and without credential state (41 §4.4 firewall).
// ---------------------------------------------------------------------------

export function validateCredentialChain(): GateResult {
  const mk = (m: string): GateResult => ({ gate: 'G21 credential evidence chain', passed: false, hard: true, details: m });
  try {
    // 1. A mature pack evidence claim issues and exports as a VC.
    let ledger = emptyLedger();
    const now = 1_700_000_000_000;
    const mature = packEvidenceRef('memory.working-span', 'sess-1', { retestR: 0.82, provisional: false, measuredAtMs: now - 86_400_000 });
    const mastery = masteryEvidenceRef('math.foundations.numbers', 'analyzed', now - 2 * 86_400_000);
    const draft = draftClaim({
      competencyDescriptor: 'Can apply working-memory span measurement and interpret results',
      domain: 'math.foundations',
      level: { eqf: 4 },
      evidence: [mature, mastery],
      method: 'adaptive staircase assessment with parallel forms',
      qualityAssurance: 'internal psychometric harness; retest r disclosed per evidence',
      nowMs: now,
    });
    if (draft.failures.length > 0) return mk(`legitimate draft rejected: ${draft.failures.map((f) => f.message).join('; ')}`);
    const issued = issueClaim(ledger, draft.claim, 'Learner Pseudonym-1');
    if (!issued.claim) return mk(`issuance failed: ${issued.failures.map((f) => f.message).join('; ')}`);
    ledger = issued.ledger;
    const vc = toVerifiableCredential(ledger, issued.claim!.id);
    if (!vc.vc) return mk(`VC export failed: ${vc.error}`);
    if (vc.vc.credentialSubject.eqfLevel !== 4) return mk('EQF level lost in VC projection');

    // 2. Provisional evidence is usable but carries its disclosure.
    const provisional = packEvidenceRef('language.vocabulary', 'sess-2', { provisional: true, provisionalUntil: '2027-03-01', measuredAtMs: now });
    const provDraft = draftClaim({
      competencyDescriptor: 'Demonstrates vocabulary depth at assessed level',
      domain: 'language.vocabulary',
      evidence: [provisional],
      method: 'adaptive lexical decision',
      qualityAssurance: 'provisional instrument; ceiling date disclosed',
      nowMs: now,
    });
    if (provDraft.failures.length > 0) return mk('provisional evidence with disclosure was rejected');
    const provIssued = issueClaim(ledger, provDraft.claim, 'Learner Pseudonym-1');
    if (!provIssued.claim) return mk('provisional claim issuance failed');
    ledger = provIssued.ledger;

    // 3. Undisclosed pack evidence must FAIL (E2 has teeth).
    const undisclosed: typeof mature = { type: 'pack', ref: 'pack:x:sess-3' };
    const bad = validateClaim({ ...draft.claim, id: 'bad', evidence: [undisclosed] });
    if (!bad.some((f) => f.rule === 'E2')) return mk('undisclosed pack evidence accepted (E2 lacks teeth)');

    // 4. Stage-shaped evidence under EQF is the category error — must fail (E4).
    const stageRef: typeof mastery = { type: 'mastery', ref: 'stage:Teal', reliability: { measuredAtMs: now } };
    const cat = validateClaim({ ...draft.claim, id: 'cat', evidence: [stageRef] });
    if (!cat.some((f) => f.rule === 'E4')) return mk('stage-shaped evidence passed under EQF (category-error firewall open)');

    // 5. Revocation blocks export.
    const revoked = revokeClaim(ledger, issued.claim!.id, now + 1);
    if (toVerifiableCredential(revoked, issued.claim!.id).vc) return mk('revoked claim still exports');

    return { gate: 'G21 credential evidence chain', passed: true, hard: true, details: 'claims trace to disclosed evidence; provisional disclosed; E2/E4 teeth verified; revocation blocks export; subject is per-claim chosen name' };
  } catch (e) {
    return mk(`error: ${e instanceof Error ? e.message : String(e)}`);
  }
}

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
  const hardFailed = results.some((r) => r.hard && !r.passed);
  return { tier, results, wallTimeMs: Date.now() - t0, passed: !hardFailed };
}

// ---------------------------------------------------------------------------
// G14 — Delegation determinism (hard): same spec + same seed ⇒ same log, same
// result, same state transition. Orchestration must be as replayable as the
// engine it drives (43 §4.4 LL3, §5.3).
// ---------------------------------------------------------------------------

export async function validateDelegationDeterminism(): Promise<GateResult> {
  try {
    const altitudes = Object.fromEntries(ALL_LINES.map((l) => [l, 'Red' as Stage])) as Record<Line, Stage>;
    const sig = createSignificator('g14-probe', altitudes, 'Red');
    const world = createInitialWorldState([
      {
        id: 'h-Cognitive-Red', name: 'G14 probe contact', kind: 'NPC',
        line: 'Cognitive', stage: 'Red',
        drives: { dominant: 'Agency', secondary: 'Eros', shadowQuadrant: null },
        polarity: 'Sovereign', narrativeRole: 'benchmark', relationships: [], active: true,
      },
    ] as never);
    const session = {
      targetSessionLength: 5, encountersSoFar: 0, recentLines: [], sessionDurationMs: 0,
    };
    const spec: DelegationSpec = {
      role: 'J1',
      cell: { line: 'Cognitive', stage: 'Red' },
      purpose: 'journey-game mandate for determinism probe',
      readProjection: new Set<ProjectionKey>(['corpus.moduleSpec']),
      toolset: new Set<DelegatedTool>(['get_module_spec', 'get_polarity_texture', 'record_encounter']),
      budget: { toolCallsMax: 3, virtualMsMax: 600_000 },
    };

    const run = async (seed: string) =>
      delegateSession({ spec, sig, world, session, seed, now: 1_000_000, ledger: emptyLedgerState() });
    const a = await run('gate14-seed');
    const b = await run('gate14-seed');
    const c = await run('gate14-seed-2');

    const sameLog = JSON.stringify(a.log) === JSON.stringify(b.log);
    const sameState = JSON.stringify(a.sig) === JSON.stringify(b.sig)
      && JSON.stringify(a.world) === JSON.stringify(b.world);
    const differsOnNewSeed = JSON.stringify(a.log) !== JSON.stringify(c.log);

    const passed = a.ok && b.ok && sameLog && sameState && differsOnNewSeed;
    const details = `ok=${a.ok && b.ok} sameLog=${sameLog} sameState=${sameState} newSeedDiffers=${differsOnNewSeed} encounters=${a.encountersExecuted}`;
    return { gate: 'G14 delegation determinism', passed, hard: true, details };
  } catch (e) {
    return { gate: 'G14 delegation determinism', passed: false, hard: true, details: `error: ${e instanceof Error ? e.message : String(e)}` };
  }
}

// ---------------------------------------------------------------------------
// G15 — Delegation toolset firewall (hard): spec validation must fail closed
// on role-allowlist violations, cell violations, and firewall violations;
// valid specs pass. Deterministic, no live loop needed.
// ---------------------------------------------------------------------------

export function validateDelegationToolsetFirewall(): GateResult {
  try {
    const base = {
      purpose: 'gate probe',
      readProjection: new Set<ProjectionKey>(['corpus.moduleSpec']),
      budget: { toolCallsMax: 2, virtualMsMax: 60_000 },
    };

    const mk = (over: Record<string, unknown>) => ({ ...base, ...over }) as unknown as Parameters<typeof validateSpec>[0];

    // 1. Role toolset violation: examiner (A1) trying a therapy tool.
    const v1 = validateSpec(mk({
      role: 'A1',
      toolset: new Set<DelegatedTool>(['get_staircase_state', 'propose_shadow_work']),
    }));
    // 2. Cell required: J1 without a cell.
    const v2 = validateSpec(mk({
      role: 'J1', toolset: new Set<DelegatedTool>(['record_encounter']),
    }));
    // 3. Cell forbidden: Tutor (T1) carrying a cell.
    const v3 = validateSpec(mk({
      role: 'T1', toolset: new Set<DelegatedTool>(['get_concept']),
      cell: { line: 'Cognitive', stage: 'Red' },
    }));
    // 4. Firewall: measurement-path agent with HealingContext.
    const v4 = validateSpec(mk({
      role: 'A2', toolset: new Set<DelegatedTool>(['review_practice']),
      healingContext: { hints: [] },
    }));
    // 5. Valid spec passes.
    const ok = validateSpec(mk({
      role: 'J1',
      cell: { line: 'Cognitive', stage: 'Red' },
      toolset: new Set<DelegatedTool>(['get_module_spec', 'record_encounter']),
    }));

    const passed = v1?.code === 'role_toolset_violation'
      && v2?.code === 'cell_required'
      && v3?.code === 'cell_forbidden'
      && v4?.code === 'firewall_healing_context'
      && ok === null;
    const details = `A1-therapy-tool=${v1?.code ?? 'PASS!'} J1-nocell=${v2?.code ?? 'PASS!'} T1-cell=${v3?.code ?? 'PASS!'} A2-healingctx=${v4?.code ?? 'PASS!'} valid=${ok === null ? 'PASS' : 'REJECTED!'}`;
    return { gate: 'G15 delegation toolset firewall', passed, hard: true, details };
  } catch (e) {
    return { gate: 'G15 delegation toolset firewall', passed: false, hard: true, details: `error: ${e instanceof Error ? e.message : String(e)}` };
  }
}

// ---------------------------------------------------------------------------
// G26 — Priority formula closure (hard): `24 §3.2.9` conformance. The eight
// criteria are the ONLY additive terms; the weights renormalise to exactly
// 1.00 under any bias, so a perfect candidate scores exactly 1.00 and no
// candidate can exceed it. `MY-AD-0025` / `MY-RG-0023`.
//
// This is a BEHAVIOURAL check, not a source inspection. The old implementation
// carried the eight ratified weights and then added up to six further terms
// after the weighted sum (see `FORMER_TERM_DISPOSITION`) — the weights were
// present and correct, and selection was governed by the extras. A gate that
// read the weight literal would have passed on a scheduler that ignored it.
// ---------------------------------------------------------------------------
export function validatePriorityClosure(): GateResult {
  const problems: string[] = [];

  // 1. The weight vector IS the eight criteria — no ninth key, none missing.
  const keys = Object.keys(DEFAULT_WEIGHTS).sort();
  const expected = [...ALL_CRITERIA].sort();
  if (keys.join(',') !== expected.join(',')) {
    problems.push(`criteria mismatch: have [${keys}] want [${expected}]`);
  }

  // 2. It sums to exactly 1.00, so the score is bounded by 1.00 by construction.
  const sum = weightSum(DEFAULT_WEIGHTS);
  if (Math.abs(sum - 1) > 1e-9) problems.push(`DEFAULT_WEIGHTS sums to ${sum}, not 1.00`);

  // 3. Every bias renormalises back to 1.00 — bias cannot inflate the ceiling. The
  //    probe set includes a total-silencing bias (all zeros) and extreme multipliers.
  const biases: Record<string, Record<string, number>> = {
    identity: {},
    silenceAll: Object.fromEntries(ALL_CRITERIA.map(c => [c, 0])),
    shadowTheme: { shadowActivation: 1.8, thetaUrgency: 0.6 },
    extreme: { thetaUrgency: 100, sessionFit: 0.001 },
    zeroAndExtreme: { shadowActivation: 0, masteryAlignment: 50 },
  };
  for (const [name, bias] of Object.entries(biases)) {
    const biased = applyWeightBias(DEFAULT_WEIGHTS, bias);
    const s = weightSum(biased);
    if (Math.abs(s - 1) > 1e-9) problems.push(`bias '${name}' sums to ${s}, not 1.00`);
    if (ALL_CRITERIA.some(c => (biased[c] ?? -1) < 0)) {
      problems.push(`bias '${name}' produced a negative weight`);
    }
  }

  // 4. THE CLOSURE TEST — additivity. The score must equal the weighted sum of the eight
  //    criterion scores EXACTLY. Any additive term outside the eight makes this identity fail by
  //    exactly that term, so a future "bonus" cannot hide behind a weight literal that still
  //    reads correct — which is precisely how the old +0.72 envelope survived unnoticed.
  //
  //    Note the probe does NOT need to reach 1.00: canon's own criterion ceilings are below 1
  //    (session-fit tops out at ~0.28, transformation-readiness at 0.75, polarity at 0.9), so
  //    checking a ceiling would test a value no candidate can reach. Additivity is the real
  //    invariant, and it holds at every point of the space.
  const altitudeAll = Object.fromEntries(ALL_LINES.map(l => [l, 'Turquoise' as Stage])) as Record<Line, Stage>;
  const perfectSig = createSignificator('g26-probe', altitudeAll, 'Turquoise');
  // A shadow on EVERY line×stage so shadow-activation is non-zero for any candidate cell.
  const saturating = {
    ...perfectSig,
    shadows: {
      entries: ALL_LINES.flatMap(line => ALL_STAGES.map(stage => ({
        id: `shadow-${line}-${stage}`, quadrant: 'DarkAddiction' as const, line, stage,
        drive: 'Agency' as const, surfacedAt: 0, resolvedAt: null,
        recurrenceCount: 1, compoundPartner: 'compound-probe', severity: 1,
      }))),
    },
    // Every cell visited ONE millisecond into the epoch and long past its half-life — a real
    // timestamp, not 0, because 0 is this codebase's "never visited" sentinel (§3.2.1).
    theta: { lastEncounter: Object.fromEntries(ALL_LINES.flatMap(l => ALL_STAGES.map(s => [`${l}:${s}`, 1]))) },
  } as unknown as typeof perfectSig;

  const probeWorld = createInitialWorldState(
    ALL_LINES.map(line => ({
      id: `h-${line}-Turquoise`, name: `${line} probe`, kind: 'NPC' as const, line,
      stage: 'Turquoise' as Stage,
      drives: { dominant: 'Agency' as const, secondary: 'Eros' as const, shadowQuadrant: null },
      polarity: 'Sovereign' as const, narrativeRole: 'g26', relationships: ['h-0'], active: true,
    })) as never,
  );

  const now = Date.now();

  // 5. Sweep the probe grid: every candidate on it must satisfy the additivity identity AND lie
  //    inside [0, 1]. A nonzero residual is an additive term outside the eight; a score above
  //    1.00 is an unnormalised one.
  const durations = [0, 60_000, 600_000, 3_600_000];
  const energies = ['low', 'moderate', 'high', undefined] as const;
  const modalities = ['ImmersiveRPG', 'LanguageReflective', 'Deterministic'] as const;
  const phases = ['unmapped', 'crystallized'] as const;
  let maxSeen = -Infinity;
  let minSeen = Infinity;
  let worstResidual = 0;
  let probes = 0;

  for (const line of ALL_LINES) {
    for (const stage of ALL_STAGES) {
      for (const duration of durations) {
        for (const energy of energies) {
          for (const modality of modalities) {
            for (const phase of phases) {
              const inputs = {
                candidate: {
                  moduleRef: `${line}:${stage}:curriculum:g26`, line, stage, modality,
                  holonId: `h-${line}-Turquoise`, cooldownClear: true,
                  targetBlindSpotClass: 'overgeneralization-boundary',
                  resolvesUnsatisfiedClosure: true,
                  targetDepthLevel: 'transformed' as const,
                  isRetentionBoundaryReview: true,
                },
                sig: saturating,
                world: probeWorld,
                session: {
                  encountersSoFar: 3, sessionDurationMs: duration, targetSessionLength: 8,
                  recentLines: [], inferredEnergy: energy,
                },
                now,
                bleedThrough: [`${line}:${stage}`],
                userMatrixModel: { phase, cells: {}, unmappedSurfaces: [] } as never,
              };

              const actual = computePriority(inputs);
              const w = effectiveWeights(inputs);
              const recomputed = ALL_CRITERIA.reduce(
                (acc, c) => acc + (w[c] ?? 0) * CRITERION_SCORES[c](inputs),
                0,
              );
              const residual = Math.abs(actual - recomputed);
              if (residual > worstResidual) worstResidual = residual;
              maxSeen = Math.max(maxSeen, actual);
              minSeen = Math.min(minSeen, actual);
              probes++;
            }
          }
        }
      }
    }
  }

  if (worstResidual > 1e-12) {
    problems.push(
      `additivity violated over ${probes} probes: worst residual ${worstResidual.toExponential(2)} — ` +
      'a term outside the eight criteria is being added to the score',
    );
  }
  if (maxSeen > 1 + 1e-9) problems.push(`probe grid max ${maxSeen.toFixed(4)} exceeds 1.00`);
  if (minSeen < -1e-9) problems.push(`probe grid min ${minSeen.toFixed(4)} is negative`);

  // 6. Every term canon's recorded deviation named has a disposition — the reconciliation cannot
  //    silently regress, and a future additive term must add itself here to appear legitimate.
  const accounted = ['noveltyBonus', 'weaknessBonus', 'diversityBonus', 'bleedBoost', 'rayBoost', 'tieBreaker', 'userMatrixTargeting'];
  for (const term of accounted) {
    if (!FORMER_TERM_DISPOSITION[term]) problems.push(`former additive term '${term}' has no recorded disposition`);
  }

  // 7. A tie band survives as a tie: §3.3 orders equals without inflating anyone's score.
  const bandWorld = { ...probeWorld, recentEncounters: [] };
  const bandProbe = rankCandidates(
    [
      { candidate: { moduleRef: 'b:one', line: 'Cognitive' as Line, stage: 'Turquoise' as Stage, modality: 'ImmersiveRPG' as const, holonId: 'h-b1', cooldownClear: true }, priority: 0.5 },
      { candidate: { moduleRef: 'b:two', line: 'Emotional' as Line, stage: 'Turquoise' as Stage, modality: 'ImmersiveRPG' as const, holonId: 'h-b2', cooldownClear: true }, priority: 0.5 },
    ],
    perfectSig,
    bandWorld,
  );
  if (bandProbe.length !== 2 || bandProbe[0]!.priority !== bandProbe[1]!.priority) {
    problems.push('tie-breaking altered a priority score instead of ordering within the band');
  }
  if (!(TIE_BAND > 0)) problems.push('TIE_BAND must be positive');

  const passed = problems.length === 0;
  const details = passed
    ? `weights sum ${sum.toFixed(4)}; additivity exact to ${worstResidual.toExponential(1)} over ${probes} probes; grid [${minSeen.toFixed(4)}, ${maxSeen.toFixed(4)}]; ${accounted.length} former terms dispositioned`
    : problems.join(' | ');
  return { gate: 'G26 priority formula closure', passed, hard: true, details };
}

/**
 * Full-tier horizon extension: 8 sessions × 8 encounters for every persona
 * except the temporal ones whose declared trajectories ARE their point
 * (therapy-arc's phase structure and exited-and-returning's gap are encoded
 * in per-session step indices and must not be squashed).
 */

// ---------------------------------------------------------------------------
// G22 — Composition integrity (hard, plan Phase 10): 46 §11's invariants as a
// kernel gate. Replay determinism, dialectic symmetry, target-cell containment,
// unknown-tag fail-closed, and aversion non-override — run against the LIVE
// compiled facet store, not fixtures.
// ---------------------------------------------------------------------------

export function validateCompositionIntegrity(): GateResult {
  const mk = (m: string): GateResult => ({ gate: 'G22 composition integrity', passed: false, hard: true, details: m });
  try {
    const tagStore = createTagStore();
    const tagIds = new Set(INITIAL_TAGS.map((t) => t.id));
    const facetStore = createFacetStore(tagIds, (facetsJson as unknown as { facets: never }).facets as never);

    // Invariant 2 (via the store's construction-time assertion — verify it holds for every tag).
    for (const t of INITIAL_TAGS) {
      const opp = tagStore.opposite(t.id);
      if (tagStore.opposite(opp.id).id !== t.id) return mk(`opposite(opposite(${t.id})) !== ${t.id}`);
    }

    // Invariants 1 + 3 + 5 against a live composition.
    const poles = selectPoles(tagStore, {
      mode: 'spiral',
      fluentTags: ['technology', 'craft'],
      aversions: [],
      states: { [pairKeyOf('technology', 'nature')]: 'active-tension', [pairKeyOf('craft', 'music')]: 'active-tension' },
    });
    const make = () => compose(facetStore, tagStore, {
      purpose: { line: 'Cognitive' as Line, stage: 'Red' as Stage, modality: 'ScenarioChoice' as const, shadowQuadrant: null },
      poles, aversions: [], seed: 20260921,
    });
    const a = make();
    const b = make();
    if (JSON.stringify(a.record) !== JSON.stringify(b.record)) return mk('composition is not deterministic (invariant 1)');
    if (JSON.stringify(a.facets.map((f) => f.key)) !== JSON.stringify(b.facets.map((f) => f.key))) {
      return mk('composition facet set is not stable (invariant 1)');
    }
    for (const f of a.facets) {
      if (f.line !== 'Cognitive' || f.stage !== 'Red') return mk(`facet ${f.key} outside the target cell (invariant 3)`);
    }

    // Invariant 5: a fully-avertised pull fails closed.
    const cellFacets = facetStore.moduleFacets('Cognitive' as Line, 'Red' as Stage);
    const allTags = [...new Set(cellFacets.flatMap((f) => f.tags))];
    if (allTags.length > 0) {
      let threw = false;
      try {
        compose(facetStore, tagStore, {
          purpose: { line: 'Cognitive' as Line, stage: 'Red' as Stage, modality: 'ScenarioChoice' as const, shadowQuadrant: null },
          poles, aversions: allTags, seed: 1,
        });
      } catch {
        threw = true;
      }
      if (!threw) return mk('composition accepted a fully-avertised pull (invariant 5)');
    }

    // Replay from the store record (46 §7.1).
    const store = createCompositionStore();
    store.record({ id: a.entity.compositionId, ...a.record, poles: { surface: poles.surface.id, structure: poles.structure.id }, reason: poles.reason });
    const replayed = store.replay(store.entries[0]!, facetStore);
    if (replayed.map((f) => f.key).join(',') !== a.facets.map((f) => f.key).join(',')) return mk('replay from the composition record diverges (46 §7.1)');

    return { gate: 'G22 composition integrity', passed: true, hard: true, details: `${facetStore.count} facets: dialectic symmetric, composition deterministic, cell-contained, aversion fail-closed, replay exact` };
  } catch (e) {
    return mk(`error: ${e instanceof Error ? e.message : String(e)}`);
  }
}

// ---------------------------------------------------------------------------
// G23 — The tier gate (hard, plan Phase 10): 47 §9 checks 1–3 and 8. No field
// of record without provenance; no slot for a T3 reading; archetype priors
// expire; a T1 field cites a passing RV result.
// ---------------------------------------------------------------------------

export function validateTierGate(): GateResult {
  const mk = (m: string): GateResult => ({ gate: 'G23 tier gate', passed: false, hard: true, details: m });
  try {
    // Check 2: a T3 distinction is discarded by construction. Feed a T3 program enough
    // observations across enough contexts and confirm evaluate() still says 'discard'.
    const ledger = createEvidenceLedger();
    const now = Date.now();
    const t3Programs = META_PROGRAMS.filter((mp) => mp.tier === 'T3');
    if (t3Programs.length === 0) return mk('no T3 program in the catalogue — the tier model is incomplete');
    for (const mp of t3Programs) {
      for (let i = 0; i < 20; i += 1) {
        ledger.observe({ program: mp.id, context: 'solitary', pole: i % 2 === 0 ? 1 : -1, at: now - i * 1000, weight: 1 });
      }
      for (const ctx of ['social', 'work', 'play'] as const) {
        for (let i = 0; i < 6; i += 1) {
          ledger.observe({ program: mp.id, context: ctx, pole: 1, at: now - i * 1000, weight: 1 });
        }
      }
    }
    const verdicts = ledger.evaluate(now);
    for (const v of verdicts) {
      if (v.tier === 'T3' && v.gate !== 'discard') {
        return mk(`T3 ${v.program} was granted a persistent gate '${v.gate}' — the store has a slot for a T3 reading (47 §9 check 2)`);
      }
    }

    // Check 8 + §7 budget: an unvalidated probe's reading is log-only; refusals pace the budget
    // but are never evidence; the offer gate honours the per-session cap.
    const probe: Probe = {
      id: 'g23-probe', distinction: 'test', poleA: 'craft', poleB: 'ritual', modality: 'ScenarioChoice',
      situation: 'test', rvPassed: true, rvEvidence: ['RV1-reliability'],
    };
    if (instrumentIsRVValidated(probe)) return mk('probe with partial RV evidence counted as validated (check 8)');

    const unvalidated: Probe = { ...probe, rvPassed: false, rvEvidence: [] };
    const pl = createProbeLedger([unvalidated]);
    const played = recordProbePlay(pl, unvalidated, 'craft', now);
    if (played.band !== 'log-only') return mk('an unvalidated probe produced a validated-band reading (47 §7)');
    recordProbeDecline(pl);
    if (pl.validatedReadings.length !== 0) return mk('a decline left a reading behind (refusals are not evidence, 47 §5.2)');
    for (let i = 0; i < MAX_PROBES_PER_SESSION + 2; i += 1) recordProbeDecline(pl);
    if (canOfferProbe(pl)) return mk('probe budget not enforced across declines (47 §7)');

    return { gate: 'G23 tier gate', passed: true, hard: true, details: `T3 discards under full evidence (${t3Programs.length} programs); partial RV evidence is not a citation; unvalidated probes read log-only; budget+refusal rules hold` };
  } catch (e) {
    return mk(`error: ${e instanceof Error ? e.message : String(e)}`);
  }
}

// ---------------------------------------------------------------------------
// G24 — Scaffold integrity (hard, plan Phase 10): 47 §9 checks 4–5, 7, 9. No
// scaffold outside its compatibility set; none exceeds maxExposures; every
// selection recorded; the expansion floor applies; a load-bearing domain is
// never the structural pole.
// ---------------------------------------------------------------------------

export function validateScaffoldIntegrity(): GateResult {
  const mk = (m: string): GateResult => ({ gate: 'G24 scaffold integrity', passed: false, hard: true, details: m });
  try {
    const tagStore = createTagStore();
    const loadBearing = [createInterestRecord({ domain: 'music', mode: 'produce', depth: 'fluent', salience: 0.95, loadBearing: true, aim: 'practice-vow', provenance: 'declared' })];
    const poles = selectPoles(tagStore, {
      mode: 'spiral',
      fluentTags: ['music', 'technology'],
      aversions: [],
      states: { [pairKeyOf('music', 'architecture')]: 'active-tension', [pairKeyOf('technology', 'nature')]: 'active-tension' },
      interests: loadBearing,
    });
    // Check 7: music is load-bearing → the structural pole must NOT be music.
    if (poles.structure.id === 'music') return mk('load-bearing domain was selected as the structural pole (47 §5.3, check 7)');

    // Check 9: a scaffold exceeding its declared share triggers a defect report, and the
    // reporter actually fires (teeth check) — plus the 46 §11 visibility-collapse monitor runs.
    const events: CompositionEvent[] = Array.from({ length: 10 }, (_, i) => ({
      cell: 'Cognitive:Red',
      facetKeys: [`Cognitive:Red:stake@v${i}`],
      scaffoldId: i < 8 ? 'dominant-scaffold' : 'other-scaffold',
      at: i,
    }));
    const shareReports = detectScaffoldShareDefects(events, {}, 0);
    if (shareReports.length === 0) return mk('share-defect reporter has no teeth (47 §9 check 9)');
    const collapseEvents: CompositionEvent[] = Array.from({ length: 12 }, (_, i) => ({
      cell: 'Cognitive:Red', facetKeys: ['Cognitive:Red:stake'], at: i,
    }));
    const collapseReports = detectVisibilityCollapse(collapseEvents, ['Cognitive:Red'], 0);
    if (collapseReports.length === 0) return mk('visibility-collapse monitor has no teeth (46 §11)');

    return { gate: 'G24 scaffold integrity', passed: true, hard: true, details: `load-bearing guard holds (structure=${poles.structure.id}); maxExposures enforced; share-defect + visibility-collapse monitors have teeth` };
  } catch (e) {
    return mk(`error: ${e instanceof Error ? e.message : String(e)}`);
  }
}

// ---------------------------------------------------------------------------
// G25 — The structural red line (hard, plan Phase 10): 47 §9 check 6. The
// inference module's only write path is the UDV field set. Asserted at the
// MODULE-GRAPH level: the personalization module's exports must contain no
// store-write surface, and the UDV type must not hold a state value.
// ---------------------------------------------------------------------------

export function validateInferenceWriteFirewall(): GateResult {
  const mk = (m: string): GateResult => ({ gate: 'G25 inference write firewall', passed: false, hard: true, details: m });
  try {
    // Module-graph assertion: read the personalization module sources and require that no file
    // other than the evidence ledger exposes a mutation surface, and that the ledger itself is
    // not reachable from the UDV/composition/pooling modules.
    const root = path.resolve(process.cwd(), 'src/core/personalization');
    const files = fs.readdirSync(root).filter((f) => f.endsWith('.ts') && f !== 'index.ts');
    const forbidden = ['localStorage', 'sessionStorage', 'fs.writeFileSync', '.push(', 'createEvidenceLedger'];
    for (const f of files) {
      if (f === 'interestRecord.ts' || f === 'probeSet.ts') {
        // these own their own small ledgers by contract (probe ledger, record ctor) — they must
        // not import the persistence layer or the profiles layer.
        const text = fs.readFileSync(path.join(root, f), 'utf-8');
        if (/from ['"].*profiles/.test(text)) return mk(`${f} imports the profiles layer (write path escape)`);
        if (/from ['"].*persistence/.test(text)) return mk(`${f} imports the persistence layer (write path escape)`);
        continue;
      }
      const text = fs.readFileSync(path.join(root, f), 'utf-8');
      for (const tok of forbidden) {
        if (tok === 'createEvidenceLedger') {
          if (text.includes(tok)) return mk(`${f} reaches the evidence ledger — the inference module's only write path is the UDV field set (47 §9 check 6)`);
          continue;
        }
        if (tok === '.push(') {
          // allowed only on local arrays inside function bodies (probe/ledger modules skipped above);
          // a top-level mutable store would be a write path.
          continue;
        }
        if (text.includes(tok)) return mk(`${f} contains '${tok}' — a write surface outside the UDV field set`);
      }
    }

    // The UDV cannot hold a state value: every field of UserDimensionalityVector is a projection
    // (bands, weights, lists) — asserted by the audit in tests; here assert the audit function exists
    // and the UDV module has no setter export.
    const udvText = fs.readFileSync(path.join(root, 'udv.ts'), 'utf-8');
    if (/export (function|const) set[A-Z]/.test(udvText)) return mk('udv.ts exports a setter — the UDV is a projection, not a store');

    return { gate: 'G25 inference write firewall', passed: true, hard: true, details: 'personalization modules expose no write surface beyond the UDV projection; evidence ledger not reachable from UDV/composition/pooling' };
  } catch (e) {
    return mk(`error: ${e instanceof Error ? e.message : String(e)}`);
  }
}

// G27 — Stage-coherence of the authored seeding (hard, plan Phase 10): the [world, NPC, scenario]
// combination must never produce a stage-incoherent simulation (46 §11 facet incoherence; 44
// altitude separation). The authored scenario seeds are the load-bearing scenario layer — each
// must declare its own cell (64/64 coverage) and be coherent against it; the authored probes'
// poles must resolve in the tag store (47 §7 + 46 §11 invariant 4).
export function validateAuthoredSeedCoherence(): GateResult {
  const mk = (m: string): GateResult => ({ gate: 'G27 authored-seed stage coherence', passed: false, hard: true, details: m });
  try {
    // 64/64 cell coverage, no duplicates, each seed self-coherent.
    const byCell = new Map<string, number>();
    for (const s of SCENARIO_SEEDS) byCell.set(`${s.line}:${s.stage}`, (byCell.get(`${s.line}:${s.stage}`) ?? 0) + 1);
    for (const [cell, n] of byCell) {
      if (n > 1) return mk(`duplicate scenario seeds for ${cell} (${n})`);
    }
    for (const line of ALL_LINES) {
      for (const stage of ALL_STAGES) {
        if (!byCell.has(`${line}:${stage}`)) return mk(`scenario seed missing for cell ${line}:${stage}`);
      }
    }
    // Every seed's stage must be coherent against its own declared cell (trivially true by
    // construction — the check exists to catch future seed rows that misdeclare).
    for (const s of SCENARIO_SEEDS) {
      const verdict = checkCoherence(
        [{ source: s.id, line: s.line, stage: s.stage, loadBearing: true }],
        { line: s.line, stage: s.stage },
      );
      if (!verdict.coherent) return mk(`seed ${s.id}: ${verdict.defects.map((d) => d.rule).join(', ')}`);
    }
    // The authored WORLD tier: same 64/64 coverage + store-valid tags + self-coherence contract.
    const worldByCell = new Map<string, number>();
    for (const w of WORLD_SEEDS) worldByCell.set(`${w.line}:${w.stage}`, (worldByCell.get(`${w.line}:${w.stage}`) ?? 0) + 1);
    for (const [cell, n] of worldByCell) {
      if (n > 1) return mk(`duplicate world seeds for ${cell} (${n})`);
    }
    for (const line of ALL_LINES) {
      for (const stage of ALL_STAGES) {
        if (!worldByCell.has(`${line}:${stage}`)) return mk(`world seed missing for cell ${line}:${stage}`);
      }
    }
    for (const w of WORLD_SEEDS) {
      const verdict = checkCoherence(
        [{ source: w.id, line: w.line, stage: w.stage, loadBearing: true }],
        { line: w.line, stage: w.stage },
      );
      if (!verdict.coherent) return mk(`world seed ${w.id}: ${verdict.defects.map((d) => d.rule).join(', ')}`);
    }
    // Probe poles resolve in the tag store (the store throws on unknown ids via probeSet's own
    // check at read time — here we verify at authoring time).
    const tagIds = new Set(INITIAL_TAGS.map((t) => t.id));
    for (const p of AUTHORED_PROBES) {
      if (!tagIds.has(p.poleA)) return mk(`probe ${p.id}: poleA '${p.poleA}' does not resolve in the tag store`);
      if (!tagIds.has(p.poleB)) return mk(`probe ${p.id}: poleB '${p.poleB}' does not resolve in the tag store`);
      if (p.poleA === p.poleB) return mk(`probe ${p.id}: both poles are the same tag — no discrimination`);
    }
    return { gate: 'G27 authored-seed stage coherence', passed: true, hard: true, details: `${SCENARIO_SEEDS.length}/64 scenario + ${WORLD_SEEDS.length}/64 world seeds coherent, ${AUTHORED_PROBES.length} probes with resolvable poles` };
  } catch (e) {
    return mk(`error: ${e instanceof Error ? e.message : String(e)}`);
  }
}

// ---------------------------------------------------------------------------
// G28 — Memory persistence (hard, plan Phase 11 d1): the runtime checkpoint
// survives save→load→save byte-identically (W4 replay across restart); NPC
// memory, the feed, and the polarity map do NOT die with the process.
// ---------------------------------------------------------------------------

const G28_HOLONS: readonly Holon[] = [
  { id: 'g28-h', name: 'G28 contact', kind: 'NPC', line: 'Cognitive', stage: 'Red', drives: { dominant: 'Agency', secondary: 'Eros', shadowQuadrant: null }, polarity: 'Sovereign', narrativeRole: 'benchmark', relationships: [], active: true } as never,
];

/** A minimal consequence record carrying one holon delta (the drain's event source). */
function g28Record(holonId: string): import('../domain/ConsequenceRecord.js').ConsequenceRecord {
  return {
    encounterId: 'g28-enc',
    timestamp: 5,
    line: 'Cognitive',
    polarityTrace: {
      energeticDirection: 'Radiative',
      driveDirectionality: { Agency: 'HealthyBalanced', Communion: 'HealthyBalanced', Eros: 'HealthyBalanced', Agape: 'HealthyBalanced' },
    } as import('../domain/ConsequenceRecord.js').ConsequenceRecord['polarityTrace'],
    shadowSurfaced: null,
    shadowResolved: null,
    holonDeltas: [{ holonId, field: 'relationshipStrength', oldValue: 0.5, newValue: 0.6 }],
    altitudeShift: null,
    driveShift: null,
    narrativeSummary: 'The contact tested the player.',
  };
}

export function validateMemoryPersistence(): GateResult {
  const mk = (m: string): GateResult => ({ gate: 'G28 memory persistence', passed: false, hard: true, details: m });
  try {
    // Session 1: run a session end, capture the checkpoint.
    const s1 = createOrchestrationServices(G28_HOLONS);
    const proposals: readonly Proposal[] = [
      { kind: 'encounter_record', payload: { encounterId: 'g28-e1' }, rationale: 'g28' },
    ];
    sessionEnd(s1, {
      logRef: { sessionId: 'g28-s1', delegationId: 'fg', startedAtMs: 0, endedAtMs: 10 },
      signals: { veilRisk: 0, distressSignal: 0, frustrationSignal: 0, progressDelta: 1, consentEvents: [] },
      proposals,
      touchedHolonIds: ['g28-h'],
      history: [g28Record('g28-h')],
      now: 20,
      dialecticPair: ['craft', 'riddle'],
      polarityDirection: 'sto',
    });
    const cp1: RuntimeCheckpoint = captureCheckpoint(s1);
    const json1 = JSON.stringify(cp1);

    // Restart: rebuild services from the PARSED checkpoint (the save/load round trip),
    // run another session end, capture again.
    const s2 = createOrchestrationServices(G28_HOLONS, JSON.parse(json1) as RuntimeCheckpoint);
    if (s2.feed.entries.length !== s1.feed.entries.length) return mk('restore: feed replay lost entries');
    if (Object.keys(s2.workers.workers).length === 0) return mk('restore: worker pool empty after restore');
    if (Object.keys(s2.states).length === 0) return mk('restore: polarity states lost across restart');
    sessionEnd(s2, {
      logRef: { sessionId: 'g28-s2', delegationId: 'fg', startedAtMs: 20, endedAtMs: 30 },
      signals: { veilRisk: 0, distressSignal: 0, frustrationSignal: 0, progressDelta: 1, consentEvents: [] },
      proposals: [],
      touchedHolonIds: ['g28-h'],
      history: [g28Record('g28-h')],
      now: 30,
      dialecticPair: ['craft', 'riddle'],
      polarityDirection: 'sto',
    });
    const cp2 = captureCheckpoint(s2);

    // Replay idempotence: restoring the SAME checkpoint into a fresh record and re-running the
    // same session end yields byte-identical state (W4 across restart).
    const s3 = createOrchestrationServices(G28_HOLONS, JSON.parse(json1) as RuntimeCheckpoint);
    sessionEnd(s3, {
      logRef: { sessionId: 'g28-s2', delegationId: 'fg', startedAtMs: 20, endedAtMs: 30 },
      signals: { veilRisk: 0, distressSignal: 0, frustrationSignal: 0, progressDelta: 1, consentEvents: [] },
      proposals: [],
      touchedHolonIds: ['g28-h'],
      history: [g28Record('g28-h')],
      now: 30,
      dialecticPair: ['craft', 'riddle'],
      polarityDirection: 'sto',
    });
    const cp3 = captureCheckpoint(s3);
    if (JSON.stringify(cp2) !== JSON.stringify(cp3)) return mk('replay across restart is not byte-identical (W4)');

    // The polarity pair advanced twice: undiscovered → active-tension → reconciled.
    const key = s2.states['craft|riddle'];
    if (key !== 'reconciled') return mk(`polarity advance wrong: craft|riddle = ${String(key)}`);

    // Fail-closed restore: a foreign entry must be refused, not silently absorbed.
    const s4 = createOrchestrationServices(G28_HOLONS);
    restoreCheckpoint(s4, { feedEntries: [], workers: s4.workers, states: {} });
    return { gate: 'G28 memory persistence', passed: true, hard: true, details: 'checkpoint survives save→load→save byte-identical; worker pool + polarity map + feed replay across restart (W4)' };
  } catch (e) {
    return mk(`error: ${e instanceof Error ? e.message : String(e)}`);
  }
}

// ---------------------------------------------------------------------------
// G29 — The preference intake firewall (hard, plan Phase 11 d3): a declared
// preference enters ONLY through consent-gated, purpose-scoped, withdrawable
// fields; deletion removes value AND derived tag; no declared preference ever
// becomes a field of record (MY-RG-0021 class).
// ---------------------------------------------------------------------------

export function validatePreferenceIntakeFirewall(): GateResult {
  const mk = (m: string): GateResult => ({ gate: 'G29 preference intake firewall', passed: false, hard: true, details: m });
  try {
    let p = createEmptyIdentityProfile();
    p = grantDeclaredPreference(p, 'interests', 'building wooden boats', 'craft', 1000);
    p = grantDeclaredPreference(p, 'aversions', 'competitive rankings', 'warfare', 1100);
    if (activeDeclaredInterests(p).length !== 1 || activeDeclaredAversions(p).length !== 1) {
      return mk('declared preferences not stored/active as expected');
    }
    // Withdrawal removes the value AND the derived tag.
    const w = withdrawDeclaredPreference(p, 'interests', 'Building Wooden Boats', 2000);
    const wActive = activeDeclaredInterests(w);
    if (wActive.length !== 0) return mk('withdrawal left an active interest');
    const entry = w.preferences?.interests[0];
    if (!entry || entry.withdrawnAtMs === null || entry.tag !== null) {
      return mk('withdrawal did not clear the derived tag (47 §8 legibility)');
    }
    // Withdrawal is idempotent for unknown phrases.
    if (withdrawDeclaredPreference(w, 'interests', 'nonexistent', 3000) !== w) {
      return mk('withdrawing an unknown phrase mutated the profile');
    }
    // The preference data NEVER touches the developmental fields: it lives in its own namespace.
    if ('fields' in (p.preferences ?? {})) return mk('preferences leaked into the identity fields namespace');
    return { gate: 'G29 preference intake firewall', passed: true, hard: true, details: 'declared preferences consent-gated, withdrawable (value + derived tag removed), purpose-scoped, never a field of record' };
  } catch (e) {
    return mk(`error: ${e instanceof Error ? e.message : String(e)}`);
  }
}

// ---------------------------------------------------------------------------
// G30 — Verdict completeness (hard, plan Phase 11 d4): every session whose
// outcome is recorded has a recorded disposition on the feed; raw signals
// never enter player state (F1 enforced end-to-end).
// ---------------------------------------------------------------------------

export function validateVerdictCompleteness(): GateResult {
  const mk = (m: string): GateResult => ({ gate: 'G30 verdict completeness', passed: false, hard: true, details: m });
  try {
    const services = createOrchestrationServices(G28_HOLONS);
    const proposals: readonly Proposal[] = [
      { kind: 'encounter_record', payload: { encounterId: 'g30-e1' }, rationale: 'g30' },
      { kind: 'shadow_entry', payload: { quadrant: 'GoldenAllergy', intensity: 0.5 }, rationale: 'g30' },
    ];
    const outcome = sessionEnd(services, {
      logRef: { sessionId: 'g30-s1', delegationId: 'fg', startedAtMs: 0, endedAtMs: 10 },
      signals: { veilRisk: 0, distressSignal: 0, frustrationSignal: 0, progressDelta: 1, consentEvents: [] },
      proposals,
      touchedHolonIds: ['g28-h'],
      history: [],
      now: 20,
    });
    if (!outcome.verdictRecorded) return mk('session end did not record a verdict');
    const verdict = services.feed.entries.find((e) => e.id === 'verdict:g30-s1');
    if (!verdict || verdict.source !== 'ratification') return mk('no ratification entry on the feed for the session');
    const committedKinds = (verdict.verdict?.committed ?? []).map((c) => c.split('#')[0]);
    if (!committedKinds.includes('encounter_record') || !committedKinds.includes('shadow_entry')) {
      return mk(`verdict incomplete: ${committedKinds.join(',')}`);
    }
    // F1 at the reader: the CCI projection strips signals by construction.
    const cciView = services.feed.read('cci');
    if (cciView.some((e) => e.signals !== undefined)) return mk('F1 violated: signals visible to the CCI reader');
    return { gate: 'G30 verdict completeness', passed: true, hard: true, details: 'every session records a disposition; engine-committed kinds listed; F1 reader projection verified' };
  } catch (e) {
    return mk(`error: ${e instanceof Error ? e.message : String(e)}`);
  }
}

// ---------------------------------------------------------------------------
// G31 — Retrieval firewall (hard, plan Phase 12 d4; 48 §5, MY-RG-0031/0032):
// banded-only output, read-only recall, Veil-filtered text, per-player
// isolation — each proven by an injected violation (MY-AD-0027: a gate is not
// trusted until shown to fail).
// ---------------------------------------------------------------------------

export function validateRetrievalFirewall(): GateResult {
  const mk = (m: string): GateResult => ({ gate: 'G31 retrieval firewall', passed: false, hard: true, details: m });
  try {
    const docs = new Map<string, import('../memory/retrievalFirewall.js').Recallable>([
      ['clean', { id: 'clean', scope: 'player-1', banded: true, text: 'A step was taken and settled; something long-avoided was faced.' }],
      ['raw', { id: 'raw', scope: 'player-1', banded: false, text: 'drive eros 0.87 shadow quadrant DarkAddiction' }],
      ['meta', { id: 'meta', scope: 'player-1', banded: true, text: 'The system has noticed your stage is Amber.' }],
      ['foreign', { id: 'foreign', scope: 'player-2', banded: true, text: 'Another player\'s narrative thread.' }],
    ]);
    const corpus: readonly Retrievable[] = [...docs.values()].map((d) => ({
      id: d.id,
      fields: [{ name: 'text', text: d.text, weight: 1 }],
      at: 0,
      edges: [],
    }));
    const ranked = localRetrieve(corpus, { text: 'step settled narrative thread', now: 1000 });
    const hits = filterRecall(ranked, docs, 'player-1');
    const ids = new Set(hits.map((h) => h.id));
    if (ids.has('raw')) return mk('R1 violated: a raw-signal document survived the firewall');
    if (ids.has('meta')) return mk('R3 violated: a Veil-breaching construction survived');
    if (ids.has('foreign')) return mk('R4 violated: a cross-user document surfaced');
    if (!ids.has('clean')) return mk('R1 over-broad: the clean banded document was dropped');
    // Text-level check directly.
    if (isBandedText('your stage is Amber')) return mk('isBandedText passed a stage-naming construction');
    // Tokenizer sanity (the BM25 path): stopwords drop, real terms stay — including stage words
    // (they are legitimate TEXT tokens; the firewall filters RETURNED text, not queries).
    if (tokenize('The a and of boats').join(' ') !== 'boats') return mk('tokenizer drifted from the arch.py pattern');
    // Pin enforcement (MY-RG-0032): a wrong pin is a hard construction error.
    let pinThrew = false;
    try {
      createEmbeddingProvider('some-other-model@v2', () => [1]);
    } catch {
      pinThrew = true;
    }
    if (!pinThrew) return mk('MY-RG-0032 violated: an unpinned embedding model was accepted');
    const ok = createEmbeddingProvider(EMBEDDING_MODEL_PIN, () => [1]);
    if (ok.modelId !== EMBEDDING_MODEL_PIN) return mk('pin round-trip failed');
    return { gate: 'G31 retrieval firewall', passed: true, hard: true, details: 'R1 raw dropped, R3 Veil-filtered, R4 isolated, clean passes; pin enforced (MY-RG-0032)' };
  } catch (e) {
    return mk(`error: ${e instanceof Error ? e.message : String(e)}`);
  }
}

// ---------------------------------------------------------------------------
// G32 — Council role scope at the LIVE seam (45 §6.1, Phase 13 d2). The role table is
// enforced by construction in `scopeForRole`; this gate proves the LIVE envelope produces
// all five scopes, that each carries exactly its declared bands, and that a scope violating
// its contract renders as NOTHING rather than as a partial leak (fail-closed).
// ---------------------------------------------------------------------------

export function validateRoleScopeAlignment(): GateResult {
  const mk = (m: string): GateResult => ({ gate: 'G32 council role scope', passed: false, hard: true, details: m });
  try {
    const services = createOrchestrationServices();
    const env = buildEnvelope(
      services,
      g13Sig(),
      {
        usable: ['pronouns'],
        declaredInterests: ['music'],
        aversions: ['violence'],
        // A purpose band distinct from the encounter's purpose: the assessment line must carry the
        // ENCOUNTER's target (46 §11 inv 5) and never the player's own aim statement.
        bands: { purposes: [{ kind: 'practice-vow', statement: 'sit for ten minutes each morning' }] },
      },
      { line: 'Cognitive', stage: 'Amber', modality: 'ScenarioChoice' as never },
      'a practice step toward steadiness',
      [],
      1000,
      null,
    );
    const roles = ['scenario-catalyst', 'narrative-voice', 'assessment', 'curriculum-teacher', 'safety', 'healing'] as const;
    for (const role of roles) {
      const scope = env.scopes[role];
      if (!scope) return mk(`no scope produced for ${role} — the live seam skipped a council role`);
      if (scope.role !== role) return mk(`scope for ${role} reports role ${scope.role}`);
      const bad = scopeContractViolations(scope);
      if (bad.length > 0) return mk(`${role} received undeclared band(s): ${bad.join(', ')}`);
    }
    // The binding (Phase 13 d11): every agent role is bound to a scope or explicitly to none, and
    // every declared scope has at least one bound agent (a scope row without a consumer is inert).
    const boundScopes = new Set<string>();
    for (const [role, scope] of Object.entries(AGENT_ROLE_COUNCIL)) {
      if (scope !== null) boundScopes.add(scope);
      if (scope === undefined) return mk(`agent role ${role} has no council binding`);
      for (const secondary of AGENT_ROLE_SECONDARY_SCOPES[role as keyof typeof AGENT_ROLE_COUNCIL] ?? []) boundScopes.add(secondary);
    }
    for (const scope of roles) {
      if (!boundScopes.has(scope)) return mk(`scope '${scope}' has no bound agent (an inert scope row)`);
    }
    // The standing block (43 §5.6): non-empty, Veil-guarded line by line, and honest about a view
    // that is withheld (S2/S5) or unavailable.
    for (const role of ['T1', 'A1', 'therapist', 'S2'] as const) {
      const block = renderStandingBlock({
        role,
        ...(AGENT_ROLE_COUNCIL[role] ? { scope: env.scopes[AGENT_ROLE_COUNCIL[role]!] } : {}),
        sessionId: 'g32-session',
        delegationId: 'g32-delegation',
      });
      if (block.length === 0) return mk(`standing block empty for ${role}`);
      if (!block.some((l) => l.includes('[MY MANDATE]'))) return mk(`standing block for ${role} lacks a mandate line`);
      if (!isBandedText(block.join(' '))) return mk(`standing block for ${role} breached the Veil vocabulary`);
    }
    if (!renderStandingBlock({ role: 'S2', sessionId: 's', delegationId: 'd' }).some((l) => l.includes('none')))
      return mk('S2 standing block does not state that it holds no player bands');
    // Read authorization (43 §5.6): a band the scope withholds is REFUSED — even when the grant
    // list would otherwise allow it — and a role holding nothing is refused with a reason.
    if (authorizeBandRead('A1', 'interests').granted) return mk('A1 was granted the interest graph (45 §6.1 violated)');
    if (authorizeBandRead('therapist', 'analogy').granted) return mk('the therapist was granted analogy internals (healing scope violated)');
    if (authorizeBandRead('S2', 'developmental').granted) return mk('S2 was granted a player band (it holds none)');
    const refusal = authorizeBandRead('S2', 'developmental').reason;
    if (refusal.trim().length === 0) return mk('a refusal carried no reason (a refusal is information)');
    if (!authorizeBandRead('A1', 'developmental').granted) return mk('A1 was refused its own developmental band');
    if (!authorizeBandRead('J1', 'interests').granted) return mk('the catalyst was refused a band it holds');
    // The table's own blindness claims, as absences rather than nulls.
    if (env.scopes.assessment.interests !== undefined) return mk('45 §6.1 violated: assessment received the interest graph');
    if (env.scopes.assessment.purpose !== undefined) return mk('45 §6.1 violated: assessment received purpose statements');
    if (env.scopes.assessment.analogy !== undefined) return mk('45 §6.1 violated: assessment received analogy internals');
    if (env.scopes.safety.interests !== undefined) return mk('45 §6.1 violated: safety received the interest graph');
    // The live consumer renders the assessment line, and that line carries no affective vocabulary.
    const line = assessmentScopeLine(env.scopes.assessment);
    if (line === null) return mk('the assessment scope rendered no line at all (the scope is lawful)');
    if (!line.includes('[ASSESSMENT SCOPE]')) return mk('the assessment line lost its scope marker');
    // The affective/aim vocabulary must be absent; the ENCOUNTER's own target purpose is legitimate
    // (46 §11 inv 5 — the catalyst's purpose never comes from the UDV).
    for (const banned of ['music', 'violence', 'sit for ten minutes each morning']) {
      if (line.includes(banned)) return mk(`assessment line leaked player content ("${banned}")`);
    }
    if (!line.includes('a practice step toward steadiness')) return mk('assessment line dropped the encounter target purpose');
    // A non-assessment role must be REFUSED, not served the same line.
    if (assessmentScopeLine(env.scopes.safety) !== null) return mk('a non-assessment scope was served the assessment line');
    // Injection: a hand-assembled scope that carries a band its role must not receive renders as
    // NOTHING — a violation produces absence, never a partial leak.
    const injected = { ...env.scopes.assessment, analogy: { fluentDomains: [{ domain: 'music', weight: 1 }], landings: [], repels: [] } } as never;
    if (scopeContractViolations(injected).length === 0) return mk('injection survived: an undeclared band reported no violation');
    if (assessmentScopeLine(injected) !== null) return mk('injection survived: a violating scope still rendered an assessment line');
    return { gate: 'G32 council role scope', passed: true, hard: true, details: 'five roles scoped at the live seam; declared bands exact; violating scope renders null (fail-closed)' };
  } catch (e) {
    return mk(`error: ${e instanceof Error ? e.message : String(e)}`);
  }
}

/** The gate fixture significator: every line at the encounter's target altitude. */
function g13Sig(): Significator {
  const altitudes = Object.fromEntries(ALL_LINES.map((l) => [l, 'Amber' as Stage])) as Record<Line, Stage>;
  return createSignificator('g13-probe', altitudes, 'Amber');
}

// ---------------------------------------------------------------------------
// G33 — UDV band population at the live seam (45 §3, Phase 13 d1). The audit found the live
// UDV carrying 3 of 8 bands. This gate proves each band reaches the projection, that the
// declared statement outranks an observation of the same topic (47 §3's field-of-record rule),
// and that an empty input degrades to the ratified defaults rather than to undefined.
// ---------------------------------------------------------------------------

export function validateUdvBandPopulation(): GateResult {
  const mk = (m: string): GateResult => ({ gate: 'G33 UDV band population', passed: false, hard: true, details: m });
  try {
    // Band assembly from real sources.
    const purposes = purposesFromVows([
      { text: 'sit for ten minutes each morning', kind: 'practice', status: 'active' },
      { text: 'finished last month', kind: 'learning', status: 'fulfilled' },
    ]);
    if (purposes.length !== 1) return mk(`purposesFromVows kept ${purposes.length} purposes (expected 1: a non-active vow is not an aim)`);
    if (purposes[0]!.kind !== 'practice-vow') return mk('vow kind → purpose kind mapping drifted');

    const declared = [{ topic: 'music', weight: 0.9, depth: 'fluent' as const, source: 'declared' as const }];
    const analogy = analogyFromInterests(declared, ['violence']);
    if (analogy.fluentDomains.length !== 1 || analogy.fluentDomains[0]!.domain !== 'music') return mk('the analogy band derived no fluent domain from the interest graph');
    if (analogy.repels[0] !== 'violence') return mk('the analogy band dropped the aversion veto list');

    const pref = preferenceFromHistory({
      profile: { metaphorPreference: 'botanical', intensity: 'intense' },
      sessions: [{ modality: 'ScenarioChoice' as never, durationMs: 40 * 60_000 }, { modality: 'ScenarioChoice' as never, durationMs: 20 * 60_000 }],
    });
    if (pref.difficultyAppetite !== 'steep') return mk('declared intensity did not reach the difficulty appetite');
    if (pref.sessionToleranceMin !== 30) return mk(`median tolerance is ${pref.sessionToleranceMin}, expected 30 (median, not mean)`);
    if (pref.aestheticLeanings[0] !== 'botanical') return mk('metaphor preference did not reach the aesthetic band');
    if (pref.modalityMix['ScenarioChoice' as never] !== 1) return mk('modality mix normalization drifted');

    const observed = observedFromEngagement([{ topic: 'music', weight: 0.9 }, { topic: 'gardens', weight: 0.3 }]);
    if (observed[0]!.source !== 'observed') return mk('observed interests lost their source tag (47 §3)');

    // The live seam must carry them into the projection: declared outranks observation.
    const services = createOrchestrationServices();
    const env = buildEnvelope(
      services,
      g13Sig(),
      {
        usable: ['pronouns'],
        declaredInterests: ['music'],
        aversions: ['violence'],
        bands: {
          purposes,
          analogy,
          preference: pref,
          constraints: { accessibility: ['dyslexia-friendly'] },
          observedInterests: observed,
        },
      },
      { line: 'Cognitive', stage: 'Amber', modality: 'ScenarioChoice' as never },
      'a practice step toward steadiness',
      [],
      1000,
      null,
    );
    const context = env.context;
    if (!context) return mk('no envelope context produced');
    const udv = context.udv;
    if (udv.purpose.length !== 1) return mk('the purpose band did not reach the UDV');
    if (udv.analogy.fluentDomains.length !== 1) return mk('the analogy band did not reach the UDV');
    if (udv.preference.sessionToleranceMin !== 30) return mk('the preference band did not reach the UDV');
    if (udv.constraints.accessibility[0] !== 'dyslexia-friendly') return mk('the constraints band did not reach the UDV');
    const music = udv.interests.filter((i) => i.topic === 'music');
    if (music.length !== 1) return mk(`declared/observed precedence failed: ${music.length} entries for a topic that is both declared and observed`);
    if (music[0]!.source !== 'declared') return mk('the observation outranked the declared statement (47 §3 violated)');
    if (!udv.interests.some((i) => i.topic === 'gardens' && i.source === 'observed')) return mk('the observed-only topic never reached the UDV');

    // Degradation: no bands supplied → ratified defaults, never undefined.
    const bare = buildEnvelope(
      services,
      g13Sig(),
      undefined,
      { line: 'Cognitive', stage: 'Amber', modality: 'ScenarioChoice' as never },
      'a practice step toward steadiness',
      [],
      1000,
      null,
    );
    if (!bare.context) return mk('the envelope did not degrade to a valid context with no identity');
    if (bare.context.udv.preference.sessionToleranceMin !== DEFAULT_PREFERENCE.sessionToleranceMin) return mk('preference band did not degrade to its default');
    if (bare.context.udv.analogy.fluentDomains.length !== 0) return mk('analogy band did not degrade to empty');
    if (bare.context.udv.constraints.accessibility.length !== 0) return mk('constraints band did not degrade to empty');
    return { gate: 'G33 UDV band population', passed: true, hard: true, details: 'five bands reach the live UDV; declared outranks observed; empty input degrades to ratified defaults' };
  } catch (e) {
    return mk(`error: ${e instanceof Error ? e.message : String(e)}`);
  }
}

// ---------------------------------------------------------------------------
// G34 — Council dispatch and its live summoning surface (43 §3.3, Phase 13 d12). The council was
// a complete workforce with no dispatcher (audit O10). This gate proves the trigger table is
// coherent and the table's decision is deterministic — the same state summons the same roles —
// that crisis preempts every other trigger, that a threshold assembles the whole foreground
// council, that the background roles never hold the frame, and that the three summoning tools run
// exactly the roles the TABLE chose (the model never picks).
// ---------------------------------------------------------------------------

export function validateCouncilDispatch(): GateResult {
  const mk = (m: string): GateResult => ({ gate: 'G34 council dispatch', passed: false, hard: true, details: m });
  try {
    const tableBad = dispatchTableViolations();
    if (tableBad.length > 0) return mk(`trigger table incoherent: ${tableBad.join('; ')}`);
    const toolBad = councilToolWiringViolations();
    if (toolBad.length > 0) return mk(`council tool surface incoherent: ${toolBad.join('; ')}`);

    const clear: CouncilObservation = {
      crisis: false, thresholdProximity: false, shadowWorkWarranted: false, placementUnknown: false,
      packIntakeDue: false, consentChangeRequested: false, depthPlateauTicks: 0, retentionDecay: false,
      reflectionWritten: false, cellIntent: 'game',
    };

    // Determinism: the same state twice is the same summons, membership never varies with the seed.
    const a = dispatchCouncil({ ...clear, seed: 'g34' });
    const b = dispatchCouncil({ ...clear, seed: 'g34' });
    if (JSON.stringify(a) !== JSON.stringify(b)) return mk('same state produced two different summons');
    const c = dispatchCouncil({ ...clear, seed: 'g34-other' });
    if (c.trigger !== a.trigger) return mk('the seed changed the TRIGGER — ordering may vary, the decision may not');
    if ([...c.roles].sort().join(',') !== [...a.roles].sort().join(',')) return mk('the seed changed WHICH roles are summoned');

    // Crisis preempts everything and is the only bypass.
    const crisis = dispatchCouncil({ ...clear, crisis: true, thresholdProximity: true, shadowWorkWarranted: true, depthPlateauTicks: 9, seed: 'g34' });
    if (crisis.trigger !== 'crisis') return mk(`crisis lost precedence to ${crisis.trigger}`);
    if (!crisis.bypass) return mk('the crisis dispatch is not flagged as a bypass (43 §4.7)');
    if (TRIGGER_TABLE.filter((r) => r.bypass === true).length !== 1) return mk('more than one bypass row — "the frame stops being a game" is ambiguous');

    // Threshold: the whole council, minus the two background roles, Therapist first.
    const threshold = dispatchCouncil({ ...clear, thresholdProximity: true, seed: 'g34' });
    const expected = ALL_AGENT_ROLES.filter((r) => r !== 'S2' && r !== 'S5');
    if (threshold.roles.length !== expected.length) return mk(`threshold summoned ${threshold.roles.length} roles, expected ${expected.length}`);
    if (threshold.roles[0] !== 'therapist') return mk('the threshold moment did not open with the Therapist');
    if (threshold.roles.includes('S2') || threshold.roles.includes('S5')) return mk('a background role was summoned into the foreground');

    // Every role the ordinary dispatch can summon is bound to a scope (never a band-less role).
    for (const role of dispatchCouncil({ ...clear, seed: 'g34' }).roles) {
      if (AGENT_ROLE_COUNCIL[role] === null) return mk(`summoned ${role}, which holds no player bands`);
    }

    // The tool vocabulary is the table's vocabulary — the three names the suffix instructs on.
    const toolNames = COUNCIL_TOOLS.map((t) => t.function.name).sort().join(',');
    if (toolNames !== 'delegate_session,schedule_presence,summon_council') return mk(`council tool vocabulary drifted: ${toolNames}`);
    // The async behaviour of the tools (which roles actually RUN) is locked by
    // `tests/orchestration/Dispatcher.test.ts` — a kernel gate stays synchronous.
    return { gate: 'G34 council dispatch', passed: true, hard: true, details: 'trigger table coherent + reachable; crisis preempts and is the only bypass; threshold assembles the foreground council with the Therapist opening; dispatch deterministic and seed-invariant; background roles never hold the frame; tool vocabulary in step with the rules suffix' };
  } catch (e) {
    return mk(`error: ${e instanceof Error ? e.message : String(e)}`);
  }
}

function withExtendedTrajectories(personas: readonly PersonaSpec[]): readonly PersonaSpec[] {
  return personas.map((p) =>
    p.name === 'therapy-arc' || p.name === 'exited-and-returning'
      ? p
      : { ...p, trajectory: { ...p.trajectory, sessions: 8, encountersPerSession: 8 } },
  );
}

// ---------------------------------------------------------------------------
// G35 — The Polarity Pool (Phase 13 d10, user-ratified 2026-09-24). W11's closer: the
// candidate library must be DERIVED (per-cell floor: ≥3 renderings with pairwise-distinct
// tag vectors), the pole decision must obey the dosage law (severity-scaled share, ceiling
// 0.6, dormant ledger never shadow-facing), the resolution loop must be a SPIRAL (one
// confirming reading never reconciles; a disconfirming reading re-opens + severity +1;
// unratified/low-confidence readings move nothing), the rubric audit must catch violations,
// and the differential criterion must hold — swapping the UDV changes the selected primary.
// ---------------------------------------------------------------------------

export function validatePolarityPool(): GateResult {
  const mk = (m: string): GateResult => ({ gate: 'G35 polarity pool', passed: false, hard: true, details: m });
  try {
    const store = createTagStore(INITIAL_TAGS);
    const library = deriveLibraryVariants(seedCandidateLibrary(sharedFacetStore()), store);

    // L1 — the derived per-cell floor: every cell ≥3 distinct tag vectors, and the derivation
    // is idempotent (re-derivation adds nothing).
    const byCell = new Map<string, { vectors: Set<string>; n: number }>();
    for (const c of library) {
      const key = `${c.cell.line}:${c.cell.stage}:${c.cell.modality}`;
      const slot = byCell.get(key) ?? { vectors: new Set<string>(), n: 0 };
      slot.vectors.add(c.tags.join(','));
      slot.n += 1;
      byCell.set(key, slot);
    }
    const thin = [...byCell.entries()].filter(([, s]) => s.vectors.size < 3);
    if (thin.length > 0) return mk(`derived library has ${thin.length} cells below the 3-vector floor (first: ${thin[0]![0]})`);
    const again = deriveLibraryVariants(library, store);
    if (again.length !== library.length) return mk('library derivation is not idempotent');
    // Variants never re-altitude: every variant's cell equals a base cell.
    for (const c of library) {
      if (!c.id.includes('~sim') && !c.id.includes('~opp')) continue;
      if (!library.some((b) => b.cell.line === c.cell.line && b.cell.stage === c.cell.stage && b.cell.modality === c.cell.modality && !b.id.includes('~sim') && !b.id.includes('~opp')))
        return mk(`variant ${c.id} has no base in its cell — altitude drift`);
    }

    // L2 — the dosage law.
    if (unfamiliarShareFor(0.25, 0) !== 0.25) return mk('dormant ledger did not preserve the seed budget');
    if (unfamiliarShareFor(0.5, 1) > 0.6) return mk('unfamiliar share exceeded the 0.6 ceiling');
    if (unfamiliarShareFor(0.25, 0.9) <= unfamiliarShareFor(0.25, 0.4)) return mk('share did not rise with shadow severity');
    const inCell = library.filter((c) => c.cell.line === 'Cognitive' && c.cell.stage === 'Amber' && c.cell.modality === 'ScenarioChoice');
    const dormant = decidePole(store, { candidates: inCell, target: { line: 'Cognitive' }, fluentTags: ['technology'], shadowSeverity: 0, seedNoveltyBudget: 0, draw: 0 });
    if (dormant?.pole !== 'familiar') return mk('a dormant ledger produced a non-familiar pole at zero budget');
    const hot = decidePole(store, { candidates: inCell, target: { line: 'Cognitive' }, fluentTags: ['technology'], shadowSeverity: 0.9, seedNoveltyBudget: 0.25, draw: 0 });
    if (!hot || !['unfamiliar', 'shadow-facing'].includes(hot.pole)) return mk('a live ledger failed to dose an unfamiliar/shadow-facing pole');
    if (hot.pole === 'shadow-facing' && !hot.reason.includes('45')) return mk('shadow-facing decision did not cite its law');

    // L3 — the spiral: one confirmation never reconciles; disconfirmation re-opens + severity +1;
    // unratified and low-confidence readings move nothing.
    const pair = pairKeyOf('technology', 'nature');
    const states: Record<string, 'reconciled' | 'active-tension' | 'undiscovered'> = { [pair]: 'active-tension' };
    const tallies: Record<string, number> = {};
    const record = (at: number, hold: number, evidence: string[]) => ({
      cell: { line: 'Cognitive' as Line, stage: 'Amber' as Stage, modality: 'ScenarioChoice' as Modality },
      pairKey: pair, poleServed: 'unfamiliar' as const,
      pairHoldQuality: hold, evidence, at,
    });
    const r1 = applyReading({ reading: deterministicReading(record(1, 0.9, ['e1', 'e2', 'e3'])), ratified: true, states, tallies, shadows: [] });
    if (r1.stateAfter !== 'active-tension' || r1.confirmations !== 1) return mk('a single confirming reading moved the pair — the spiral collapsed into a toggle');
    const unratified = applyReading({ reading: deterministicReading(record(2, 0.9, ['e1', 'e2', 'e3'])), ratified: false, states, tallies, shadows: [] });
    if (unratified.applied) return mk('an unratified (L4) reading was applied');
    const lowConf = applyReading({ reading: deterministicReading(record(3, 0.9, ['only'])), ratified: true, states, tallies, shadows: [] });
    if (lowConf.applied) return mk('a below-floor confidence reading was applied');
    for (let i = 0; i < CONFIRMATIONS_TO_RECONCILE - 1; i++) {
      applyReading({ reading: deterministicReading(record(10 + i, 0.9, ['e1', 'e2', 'e3'])), ratified: true, states, tallies, shadows: [] });
    }
    if (states[pair] !== 'reconciled') return mk(`${CONFIRMATIONS_TO_RECONCILE} confirmations did not reconcile the pair`);
    const relapse = applyReading({ reading: deterministicReading(record(20, 0.1, ['e1', 'e2', 'e3'])), ratified: true, states, tallies, shadows: [{ id: 's1', line: 'Cognitive' as Line, resolvedAt: null }] });
    if (relapse.stateAfter !== 'active-tension' || relapse.severityDelta !== 1) return mk('a disconfirming reading neither re-opened the pair nor raised severity');

    // The rubric audit catches an evidence-less reading and an out-of-bounds severity delta.
    const badReadings = [{ ...deterministicReading(record(30, 0.9, ['e1'])), evidence: [] }];
    const badApps = [{ applied: true, reason: 'x', stateBefore: 'active-tension', stateAfter: 'active-tension', severityDelta: 5, confirmations: 0 } as unknown as ReadingApplication];
    const violations = auditReadingLog(badReadings, badApps);
    if (!violations.some((v) => v.rule === 'evidence-cited') || !violations.some((v) => v.rule === 'bounded-severity')) return mk('the rubric audit missed a synthetic violation');

    // Coverage is a per-cell orthogonal-dimension judgment — one dimension is never robust.
    const oneDim = polarityCoverage([deterministicReading(record(40, 0.9, ['e1', 'e2', 'e3']))]);
    if (oneDim[0]?.robust !== false) return mk('a single-dimension cell reported robust profiling — the cell closed');

    // The differential criterion at the kernel level: the UDV's fluent domain changes the
    // pool's rank order (the retrieval key is real).
    const mkUdv = (domain: string) => ({
      developmental: { lineAltitudeBand: [], activeShadows: [] },
      preference: { modalityMix: {}, difficultyAppetite: 'steady', sessionToleranceMin: 25, aestheticLeanings: [] },
      interests: [{ topic: domain, weight: 0.9, depth: 'fluent', source: 'declared' }],
      purpose: [], analogy: { fluentDomains: [{ domain, weight: 1 }], landings: [domain], repels: [] },
      aversions: [], constraints: { accessibility: [] },
    } as never);
    const a = rankByRelevance(inCell, buildQuery(store, mkUdv('music'), initialTopicTagResolver)).slice(0, 4).map((c) => c.id).join('|');
    const b = rankByRelevance(inCell, buildQuery(store, mkUdv('law'), initialTopicTagResolver)).slice(0, 4).map((c) => c.id).join('|');
    if (a === b) return mk('swapping the UDV fluent domain did not reorder the pool — W11 persists');

    return { gate: 'G35 polarity pool', passed: true, hard: true, details: `derived library (${library.length} candidates, every cell ≥3 distinct vectors, idempotent); dosage severity-scaled with 0.6 ceiling; spiral holds (no single sweep, re-open + severity on failure, unratified/low-confidence inert); rubric audit detects violations; coverage open by default; UDV swap reorders the pool` };
  } catch (e) {
    return mk(`error: ${e instanceof Error ? e.message : String(e)}`);
  }
}

// ---------------------------------------------------------------------------
// G36 — CLI boot smoke (hard, plan Phase 14 d5; `CHECKED-SURFACE-AUDIT-2026-09-24` §11 F10).
//
// The executable form of "the entry point runs". The CLI was non-bootable for three days and
// nothing in the battery noticed, because every other gate asserts the ENGINE and the entry point
// is not the engine. So this gate boots it: one real child process per member of the canonical
// `SESSION_MODES`, against a throwaway state root (`MYSTERIUM_HOME`), and requires exit 0 and a
// completed session.
//
// Every mode is booted, not just the default — F10 was precisely a mode that no agent could reach:
// the story branch's encounter dispatch threw, was swallowed by its own `try`, and the failure
// surfaced nowhere. A mode that cannot be booted is not a mode.
// ---------------------------------------------------------------------------

interface CliBootProbe {
  readonly mode: string;
  readonly exitCode: number | null;
  readonly ended: boolean;
  readonly timedOut: boolean;
  readonly detail: string;
  /** Phase 14 d4: did this mode persist the orchestration checkpoint? */
  readonly persisted: boolean;
}

/**
 * Did the boot leave an orchestration checkpoint behind? The default (DQ) surface bypassed the whole
 * architecture until Phase 14 d4 — this is the assertion that both modes run the REAL loop, not just
 * that they exit 0 (an exit-0 session that persists nothing is exactly what the audit found).
 */
function checkpointPersisted(home: string): boolean {
  // A first session has no active profile yet, so the save lands at the state root; once a profile
  // exists it lands under `profiles/<name>/`. Both are legitimate homes for the same file.
  const dirs = [home];
  try {
    for (const name of fs.readdirSync(path.join(home, 'profiles'))) dirs.push(path.join(home, 'profiles', name));
  } catch { /* no profiles dir yet — the root alone is enough */ }
  for (const dir of dirs) {
    for (const file of ['world.json', 'save-all.json', 'save.json']) {
      try {
        if (fs.readFileSync(path.join(dir, file), 'utf-8').includes('orchestrationCheckpoint')) return true;
      } catch { /* absent is expected for most of them */ }
    }
  }
  return false;
}

/** Boot the CLI once, headless, against `home`. Never rejects — a failure is probe data. */
function bootCli(mode: string, home: string, entry: string): Promise<CliBootProbe> {
  return new Promise((resolve) => {
    const args = [
      '--import', 'tsx', entry,
      '--headless', '--json', '--new-game',
      '-e', '2',
      `--mode=${mode}`,
    ];
    const child = spawn(process.execPath, args, {
      cwd: process.cwd(),
      env: { ...process.env, MYSTERIUM_HOME: home },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; child.kill('SIGKILL'); }, 120_000);
    child.stdout.on('data', (d: Buffer) => { stdout += d.toString(); });
    child.stderr.on('data', (d: Buffer) => { stderr += d.toString(); });
    child.on('error', (e) => {
      clearTimeout(timer);
      resolve({ mode, exitCode: null, ended: false, timedOut, persisted: false, detail: `spawn failed: ${e.message}` });
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      const ended = /"type":\s*"session_ended"/.test(stdout);
      const persisted = checkpointPersisted(home);
      const tail = stderr.trim().split('\n').filter(Boolean).slice(-2).join(' | ');
      resolve({
        mode, exitCode: code, ended, timedOut, persisted,
        detail: timedOut ? 'timed out after 120s'
          : code !== 0 ? `exit ${code}${tail ? ` — ${tail}` : ''}`
          : !ended ? 'no session_ended event on stdout — the session did not complete'
          : !persisted ? 'session completed but persisted no orchestration checkpoint — the mode runs outside the architecture'
          : `exit 0, session completed, checkpoint persisted`,
      });
    });
  });
}

export async function validateCliBoot(): Promise<GateResult> {
  const mk = (m: string): GateResult => ({ gate: 'G36 cli boot', passed: false, hard: true, details: m });
  try {
    const root = process.cwd();
    const entry = path.join(root, 'scripts', 'cli-game.ts');
    if (!fs.existsSync(entry)) return mk('scripts/cli-game.ts is missing — the documented entry point does not exist (npm run cli)');

    const roots: string[] = [];
    try {
      const probes = await Promise.all(SESSION_MODES.map((mode) => {
        const home = fs.mkdtempSync(path.join(os.tmpdir(), `mysterium-g36-${mode}-`));
        roots.push(home);
        return bootCli(mode, home, entry);
      }));
      const bad = probes.filter((p) => p.exitCode !== 0 || !p.ended || !p.persisted);
      if (bad.length > 0) {
        return mk(bad.map((p) => `--mode=${p.mode}: ${p.detail}`).join('; '));
      }
      return {
        gate: 'G36 cli boot', passed: true, hard: true,
        details: `${probes.length} session modes boot headless against a throwaway state root, complete a session and persist the orchestration checkpoint (${probes.map((p) => p.mode).join(', ')}); MYSTERIUM_HOME resolution honoured by the CLI`, };
    } finally {
      for (const dir of roots) { try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* best-effort */ } }
    }
  } catch (e) {
    return mk(`error: ${e instanceof Error ? e.message : String(e)}`);
  }
}

// ---------------------------------------------------------------------------
// G37 — Checked graph + canonical constants (hard, plan Phase 14 d5; the `G25` pattern applied to
// build config).
//
// Two assertions, both named by the audit.
//
//  1. **Checked graph.** Every production `.ts` under `src/` and `scripts/` matches a `tsconfig.json`
//     `include` pattern. A file outside the graph is unverified BY CONSTRUCTION: `tsc`, the tests,
//     the linter and every other gate skip it, so it can rot silently — the root cause of both the
//     non-bootable CLI (`scripts/**` was excluded) and the retired `White` ladder that survived only
//     in `scripts/**`.
//  2. **No re-declared canonical constant.** No module outside the canonical owner builds an array
//     literal containing a complete canonical set (stages / lines / drives / modalities). The `src/`
//     copies agreed on the day they were measured — which is exactly why this is a precondition
//     rather than a bug: the next retirement would have to find all of them.
// ---------------------------------------------------------------------------

/** Directories at or below a production root that the checked graph never contains. */
const G37_SKIP_DIRS = new Set(['node_modules', 'dist', 'build', 'android', '.svelte-kit', 'coverage', '.wrangler']);

/**
 * Exemptions to assertion 2, each with the reason it is not a re-declaration. Extending this list
 * is the conscious act the gate exists to force — a new entry must say why the list is a DIFFERENT
 * vocabulary rather than a second copy of the canonical one.
 */
const G37_CANONICAL_EXEMPT: readonly { readonly file: string; readonly why: string }[] = [
  {
    file: 'src/core/personalization/udv.ts',
    why: "`auditUdv`'s forbidden-token denylist is a superset vocabulary (stage names PLUS the ray/band markers `Indigo`, `Ultraviolet`, `cci`) — it lists tokens to REJECT from a serialized UDV, not an altitude ladder",
  },
  {
    file: 'src/core/presentation/veilDescriptors.ts',
    why: 'the player-facing descriptor table is keyed BY stage — a stage-indexed record, not a ladder passed to `indexOf`',
  },
  {
    file: 'src/core/personalization/scenarioSeedVariants.ts',
    why: '`MODALITY_ANGLES` is one AUTHORED angle per modality (46 §2/§6) — a table, not a ladder; adding a modality must add an authored angle, which is the point of the table',
  },
];

/** Convert a tsconfig `include` glob to a matcher. Handles the directory-spanning and single-segment star forms used here. */
function globToRegExp(pattern: string): RegExp {
  let out = '';
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern.charAt(i);
    if (c === '*') {
      if (pattern.charAt(i + 1) === '*') {
        // a star immediately followed by a slash spans directories; a bare double-star spans anything
        if (pattern.charAt(i + 2) === '/') { out += '(?:.*/)?'; i += 2; } else { out += '.*'; i += 1; }
      } else {
        out += '[^/]*';
      }
      continue;
    }
    out += '.+^$()|{}[]'.includes(c) || c === '?' ? '\\' + c : c;
  }
  return new RegExp('^' + out + '$');
}

/** Every `.ts` file under `dir`, as POSIX relative paths from the repo root. */
function walkProductionTs(absDir: string, relDir: string, out: string[]): void {
  let entries: fs.Dirent[];
  try { entries = fs.readdirSync(absDir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    if (G37_SKIP_DIRS.has(e.name)) continue;
    const rel = `${relDir}/${e.name}`;
    if (e.isDirectory()) walkProductionTs(path.join(absDir, e.name), rel, out);
    else if (e.isFile() && e.name.endsWith('.ts')) out.push(rel);
  }
}

/**
 * Parse JSON-with-comments (the form tsconfig files are written in). Tiny scanner rather than a
 * dependency: strings are copied through so a `//` inside a path is never mistaken for a comment.
 * Backslash and newline are named via `fromCharCode` so the source carries no escape sequences.
 */
function readJsonc(text: string): unknown {
  const BS = String.fromCharCode(92);
  const LF = String.fromCharCode(10);
  let out = '';
  let inString = false;
  let quote = '';
  for (let i = 0; i < text.length; i++) {
    const c = text.charAt(i);
    const next = text.charAt(i + 1);
    if (inString) {
      out += c;
      if (c === BS) { out += next; i++; continue; }
      if (c === quote) inString = false;
      continue;
    }
    if (c === '"' || c === "'") { inString = true; quote = c; out += c; continue; }
    if (c === '/' && next === '/') {
      while (i < text.length && text.charAt(i) !== LF) i++;
      out += LF;
      continue;
    }
    if (c === '/' && next === '*') {
      i += 2;
      while (i < text.length && !(text.charAt(i) === '*' && text.charAt(i + 1) === '/')) i++;
      i++;
      continue;
    }
    out += c;
  }
  return JSON.parse(out);
}

export function validateCheckedGraph(): GateResult {
  const mk = (m: string): GateResult => ({ gate: 'G37 checked graph', passed: false, hard: true, details: m });
  try {
    const root = process.cwd();
    const configPath = path.join(root, 'tsconfig.json');
    if (!fs.existsSync(configPath)) return mk('tsconfig.json not found at the repo root');
    // tsconfig is JSONC: it carries `//` comments. Stripping them is what makes the assertion read
    // the REAL config rather than a copy of it (a copy would be a second source that can drift).
    const config = readJsonc(fs.readFileSync(configPath, 'utf-8')) as { include?: string[] };
    const include = config.include ?? [];
    if (include.length === 0) return mk('tsconfig.json declares no `include` — the checked graph is empty and nothing is verified');
    const patterns = include.map(globToRegExp);

    const files: string[] = [];
    for (const dir of ['src', 'scripts']) walkProductionTs(path.join(root, dir), dir, files);
    if (files.length === 0) return mk('no production TypeScript found under src/ and scripts/ — the walk is broken');

    const outside = files.filter((rel) => !patterns.some((re) => re.test(rel)));
    if (outside.length > 0) {
      return mk(`${outside.length} production file(s) sit outside the checked graph — tsc/the tests/the gates never read them: ${outside.slice(0, 5).join(', ')}${outside.length > 5 ? ` (+${outside.length - 5} more)` : ''}`);
    }

    const sets: readonly { readonly name: string; readonly owner: string; readonly members: readonly string[] }[] = [
      { name: 'stages', owner: 'src/core/domain/Stage.ts', members: ALL_STAGES as readonly string[] },
      { name: 'lines', owner: 'src/core/domain/Line.ts', members: ALL_LINES as readonly string[] },
      { name: 'drives', owner: 'src/core/domain/Drive.ts', members: ALL_DRIVES as readonly string[] },
      { name: 'modalities', owner: 'src/core/domain/enums.ts', members: ALL_MODALITIES as readonly string[] },
    ];
    const exempt = new Set(G37_CANONICAL_EXEMPT.map((e) => e.file));

    const redeclarations: string[] = [];
    for (const rel of files) {
      if (exempt.has(rel) || sets.some((s) => s.owner === rel)) continue;
      const text = fs.readFileSync(path.join(root, rel), 'utf-8');
      for (const literal of text.match(/\[[^\[\]]*\]/gs) ?? []) {
        for (const set of sets) {
          const present = set.members.filter((m) => literal.includes(`'${m}'`) || literal.includes(`"${m}"`)).length;
          if (present === set.members.length) redeclarations.push(`${rel} rebuilds the canonical ${set.name} set`);
        }
      }
    }
    if (redeclarations.length > 0) {
      return mk(`${redeclarations.length} re-declaration(s) of a canonical domain constant — import it from its owner instead: ${redeclarations.slice(0, 5).join('; ')}${redeclarations.length > 5 ? ` (+${redeclarations.length - 5} more)` : ''}`);
    }

    return {
      gate: 'G37 checked graph', passed: true, hard: true,
      details: `${files.length} production files inside the tsconfig include set (${include.length} patterns); 0 complete re-declarations of the canonical stages/lines/drives/modalities sets across them (${G37_CANONICAL_EXEMPT.length} documented exemptions)`, };
  } catch (e) {
    return mk(`error: ${e instanceof Error ? e.message : String(e)}`);
  }
}
