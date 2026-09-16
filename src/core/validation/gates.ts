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
import path from 'node:path';
import { createSignificator } from '../domain/Significator.js';
import { createInitialWorldState } from '../engines/CandidateGeneration.js';
import { ALL_LINES } from '../domain/Line.js';
import { delegateSession, emptyLedgerState } from '../orchestration/orchestratorTools.js';
import { validateSpec } from '../orchestration/delegate.js';
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
        const stageOrd = (st: string) => ['Infrared', 'Magenta', 'Red', 'Amber', 'Orange', 'Green', 'Turquoise', 'White'].indexOf(st);
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

export interface ValidationReport {
  tier: Tier;
  results: GateResult[];
  wallTimeMs: number;
  passed: boolean;
}

export function runValidationSuite(tier: Tier = 'ci', personas: readonly PersonaSpec[] = PERSONAS): ValidationReport {
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
  results.push(validateDelegationDeterminism());
  results.push(validateDelegationToolsetFirewall());
  const hardFailed = results.some((r) => r.hard && !r.passed);
  return { tier, results, wallTimeMs: Date.now() - t0, passed: !hardFailed };
}

// ---------------------------------------------------------------------------
// G14 — Delegation determinism (hard): same spec + same seed ⇒ same log, same
// result, same state transition. Orchestration must be as replayable as the
// engine it drives (43 §4.4 LL3, §5.3).
// ---------------------------------------------------------------------------

export function validateDelegationDeterminism(): GateResult {
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

    const run = (seed: string) =>
      delegateSession({ spec, sig, world, session, seed, now: 1_000_000, ledger: emptyLedgerState() });
    const a = run('gate14-seed');
    const b = run('gate14-seed');
    const c = run('gate14-seed-2');

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

/**
 * Full-tier horizon extension: 8 sessions × 8 encounters for every persona
 * except the temporal ones whose declared trajectories ARE their point
 * (therapy-arc's phase structure and exited-and-returning's gap are encoded
 * in per-session step indices and must not be squashed).
 */
function withExtendedTrajectories(personas: readonly PersonaSpec[]): readonly PersonaSpec[] {
  return personas.map((p) =>
    p.name === 'therapy-arc' || p.name === 'exited-and-returning'
      ? p
      : { ...p, trajectory: { ...p.trajectory, sessions: 8, encountersPerSession: 8 } },
  );
}
