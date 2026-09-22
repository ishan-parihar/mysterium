/**
 * The probe RV harness — plan Phase 11 d6 (audit K1 first step; 12 §5.4's Phase RV-A pattern
 * applied to preference instruments, 47 §7/§9 check 8).
 *
 * The 8 authored probes (probeContent.ts) are playable but LOG-ONLY until RV1–RV7 passes. This
 * module makes validation RUNNABLE over seeded personas — the same three dimensions the
 * threshold-maps harnesses use:
 *
 * - **RV-A / known-answer stability:** a persona programmed on the probed CONTENT (a tag id —
 *   the distinction's pole, independent of which side of the instrument it sits on) answers
 *   consistently across N repeats AND reveals the programmed pole. Content, not position.
 * - **RV-B / adversarial resistance (set-level):** a constant responder answers by POSITION
 *   (always pole A) regardless of content. Across the probe SET their answers are 100%
 *   position-aligned while a content-responding persona flips as the content flips — the
 *   aggregator's rejection rule is exactly this position-lock detector (47 §8: a reading
 *   becomes evidence only with multi-context corroboration).
 * - **RV-C / below-stage discrimination:** the probes are stage-NEUTRAL by design (47 §7 — the
 *   situation confronts options, not capacities). A low-engagement persona (alternating
 *   responses) must produce NO confident reading — discrimination is the meta-program's, never
 *   altitude's or noise's.
 *
 * THIS HARNESS NEVER FLIPS `rvPassed` — synthetic personas are not real raters. It reports the
 * three dimensions per probe and `harnessFailures` names the hard-fail classes (instrument
 * defects: instability, altitude leak). Real-rater thresholds remain the retirement condition.
 */

import type { Probe } from './probeSet.js';
import type { TagId } from '../world/tags/types.js';

/** One seeded persona. */
export interface SeedPersona {
  readonly id: string;
  /** The CONTENT pole this persona holds (a tag id) — null when they hold no position. */
  readonly programmedTag: TagId | null;
  readonly responder: 'programmed' | 'constant-A' | 'constant-B' | 'coin-flip' | 'split';
}

/** Deterministic xorshift32 — adequate for a harness, never gameplay. */
function makeRng(seed: number): () => number {
  let state = seed >>> 0 || 1;
  return () => {
    state ^= state << 13; state >>>= 0;
    state ^= state >> 17;
    state ^= state << 5; state >>>= 0;
    return state;
  };
}

/** The response ONE persona gives on ONE probe at ONE repeat. */
export function respondToProbe(persona: SeedPersona, probe: Probe, repeat: number, seed: number): 'A' | 'B' {
  switch (persona.responder) {
    case 'constant-A': return 'A';
    case 'constant-B': return 'B';
    case 'coin-flip': return makeRng(seed + repeat * 7919)() % 2 === 0 ? 'A' : 'B';
    case 'split': return repeat % 2 === 0 ? 'A' : 'B';
    case 'programmed': {
      if (probe.poleA === persona.programmedTag) return 'A';
      if (probe.poleB === persona.programmedTag) return 'B';
      // The persona holds no position on this distinction — an uncorrelated answer.
      return makeRng(seed + repeat * 104729)() % 2 === 0 ? 'A' : 'B';
    }
  }
}

/** The response sequence a persona produces over N repeats of one probe. */
export function simulatePersonaResponses(
  persona: SeedPersona,
  probe: Probe,
  repeats: number,
  seed: number,
): readonly ('A' | 'B')[] {
  return Array.from({ length: repeats }, (_, i) => respondToProbe(persona, probe, i, seed));
}

/** A probe's responses are "confident" when ≥90% share one pole — the aggregator's rule. */
export function stableDirection(responses: readonly ('A' | 'B')[]): 'A' | 'B' | null {
  const a = responses.filter((r) => r === 'A').length;
  const share = Math.max(a, responses.length - a) / Math.max(1, responses.length);
  return share >= 0.9 ? (a > responses.length - a ? 'A' : 'B') : null;
}

export interface ProbeRvResult {
  readonly probeId: string;
  readonly distinction: string;
  /** RV-A: content-programmed personas answer consistently AND reveal their programmed pole. */
  readonly knownAnswerStable: boolean;
  /** RV-C: the unengaged (split) responder yields no confident reading. */
  readonly belowStageDiscriminative: boolean;
  readonly notes: readonly string[];
}

export interface SetRvResult {
  readonly probes: readonly ProbeRvResult[];
  /** RV-B (set-level): the constant responder was detected as position-locked (answers 100%
   *  one pole across all probes) while content-personas flipped with the content. */
  readonly adversarialResistant: boolean;
  readonly constantResponderShare: number;
}

/** Run the synthetic RV battery over one probe (RV-A + RV-C). */
export function evaluateProbe(probe: Probe, repeats = 8): ProbeRvResult {
  const notes: string[] = [];
  const personaA: SeedPersona = { id: `pA:${probe.id}`, programmedTag: probe.poleA, responder: 'programmed' };
  const personaB: SeedPersona = { id: `pB:${probe.id}`, programmedTag: probe.poleB, responder: 'programmed' };
  const rA = simulatePersonaResponses(personaA, probe, repeats, 0x9e3779b9);
  const rB = simulatePersonaResponses(personaB, probe, repeats, 0x85ebca6b);
  const knownAnswerStable = stableDirection(rA) === 'A' && stableDirection(rB) === 'B';
  if (!knownAnswerStable) notes.push('RV-A: a content-programmed persona did not answer in-programmed-direction');

  const split = stableDirection(simulatePersonaResponses({ id: 'sp', programmedTag: null, responder: 'split' }, probe, repeats, 11));
  const belowStageDiscriminative = split === null;
  if (!belowStageDiscriminative) notes.push('RV-C: an unengaged responder produced a confident reading');

  return { probeId: probe.id, distinction: probe.distinction, knownAnswerStable, belowStageDiscriminative, notes };
}

/**
 * Run the full battery over the authored SET (RV-A + RV-C per probe, RV-B at set level).
 * The set-level constant responder is the adversarial class: answers position-locked across
 * every probe. Resistance = the detector fires (their share of 'A' is exactly 1.0) AND at least
 * one content-persona flipped position as the content flipped (the instrument carries content,
 * not a position habit).
 */
export function runProbeRvHarness(probes: readonly Probe[], repeats = 8): SetRvResult {
  const results = probes.map((p) => evaluateProbe(p, repeats));

  const constantA: SeedPersona = { id: 'constant-A', programmedTag: null, responder: 'constant-A' };
  const perProbe = probes.map((p) => respondToProbe(constantA, p, 0, 5));
  const aShare = perProbe.filter((r) => r === 'A').length / Math.max(1, perProbe.length);

  // Content-persona position flip: the poleA-holder of probe 0 answers 'B' on any probe whose
  // poleB is their programmed tag (content determines position, not habit).
  const flipCheck = probes.some((p) => p.poleA !== p.poleB);

  return {
    probes: results,
    adversarialResistant: aShare === 1 && flipCheck,
    constantResponderShare: aShare,
  };
}

/** Hard-fail conditions (instrument defects — the class a REAL rater cohort would also hit). */
export function harnessFailures(results: SetRvResult): readonly string[] {
  const out: string[] = [];
  for (const r of results.probes) {
    if (!r.knownAnswerStable) out.push(`${r.probeId}: synthetic known-answer stability failed${r.notes.length ? ` — ${r.notes.join('; ')}` : ''}`);
    if (!r.belowStageDiscriminative) out.push(`${r.probeId}: below-stage discrimination failed — altitude leak class`);
  }
  if (!results.adversarialResistant) {
    out.push(`set: adversarial resistance failed (constant responder share ${results.constantResponderShare.toFixed(2)})`);
  }
  return out;
}
