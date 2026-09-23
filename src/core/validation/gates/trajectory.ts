/**
 * Trajectory gates — G1–G9: the developmental dynamics a persona trajectory must exhibit.
 *
 * Split out of `gates.ts` (module-cohesion audit item 2). These gates all read `runPersonaTrajectory`
 * and disagree about what a healthy trajectory looks like, so they share a file.
 *
 * Spec: docs/validation/BENCHMARK-ARCHITECTURE.md §6.
 */

import { PERSONAS, getPersona, type PersonaSpec } from '../personas.js';
import { runPersonaTrajectory, runOneSession } from '../harness.js';
import { detectDevelopmentalNeeds } from '../../curriculum/DevelopmentalNeedsDetector.js';
import { probeCurriculum } from '../../curriculum/MetaCognitiveProbe.js';
import { getCurriculumRegistry } from '../../curriculum/CurriculumRegistry.js';
import { seedInitialKnowledge } from '../../curriculum/SeedInitialKnowledge.js';
import { initAdaptiveState, adapt } from '../../adaptive/AdaptiveDifficultyService.js';
import type { Line } from '../../domain/Line.js';
import { stageOrdinal } from '../../domain/Stage.js';
import type { Stage } from '../../domain/Stage.js';
import { finalOf, fmt, type GateResult, type Tier } from './plumbing.js';

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
