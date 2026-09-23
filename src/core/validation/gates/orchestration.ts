/**
 * Orchestration gates — G14, G15, G26: delegation and the encounter priority formula.
 *
 * Split out of `gates.ts` (module-cohesion audit item 2). They assert the kernel's contracts
 * (`43`) and the scheduler's closure (`24 §3.2.9`).
 *
 * Spec: docs/validation/BENCHMARK-ARCHITECTURE.md §6.
 */

import type { Line } from '../../domain/Line.js';
import { createSignificator } from '../../domain/Significator.js';
import { createInitialWorldState } from '../../engines/CandidateGeneration.js';
import { ALL_LINES } from '../../domain/Line.js';
import { ALL_STAGES } from '../../domain/Stage.js';
import { delegateSession, emptyLedgerState } from '../../orchestration/orchestratorTools.js';
import { validateSpec } from '../../orchestration/delegate.js';
import type { DelegatedTool, DelegationSpec, ProjectionKey } from '../../orchestration/types.js';
import type { Stage } from '../../domain/Stage.js';
import { ALL_CRITERIA, CRITERION_SCORES, DEFAULT_WEIGHTS, FORMER_TERM_DISPOSITION, applyWeightBias, computePriority, effectiveWeights, weightSum } from '../../engines/PriorityComputation.js';
import { rankCandidates, TIE_BAND } from '../../engines/EncounterScheduler.js';
import type { GateResult } from './plumbing.js';

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
