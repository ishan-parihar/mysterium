/**
 * The preference evidence ledger + tier gate — 47 §3/§8
 * (`docs/foundations/47-preference-inference-and-scaffolding.md`).
 *
 * Pipeline: observable extraction (deterministic) → evidence ledger (per distinction,
 * per context, recency-weighted) → tier gate (T1 field of record · T2 weight · T3 ephemeral)
 * → consumption (UDV write / scaffold selection / tag weighting).
 *
 * Structural properties (47 §9 checks 2 and 6):
 * - There is NO store for a T3 reading — the type does not exist here, so a T3 distinction
 *   cannot be persisted at all (47 §3: "T3 is ephemeral by design, so it cannot accumulate
 *   into a profile").
 * - This module's ONLY write output is tiered preference evidence. It cannot write player
 *   state: no engine state, no developmental record. The observation firewall (45 §3.1 rule 1)
 *   is a property of the module graph, not a promise.
 * - Contradiction is represented, not resolved: evidence is stored per context.
 * - A refusal is not evidence (§5.2): no API exists to record one.
 */

/** §4's 14 distinctions, with their evidence tier (§3). */
export const META_PROGRAMS = [
  { id: 'toward_away', tier: 'T1' },
  { id: 'internal_external', tier: 'T2' },
  { id: 'global_specific', tier: 'T1' },
  { id: 'sameness_difference', tier: 'T2' },
  { id: 'match_mismatch', tier: 'T3' },
  { id: 'proactive_reactive', tier: 'T1' },
  { id: 'options_procedures', tier: 'T1' },
  { id: 'in_time_through_time', tier: 'T2' },
  { id: 'associate_dissociate', tier: 'T1' },
  { id: 'independent_proximity_cooperative', tier: 'T1' },
  { id: 'perceptual_preference', tier: 'T3' },
  { id: 'necessity_possibility', tier: 'T3' },
  { id: 'convincer_channel', tier: 'T3' },
  { id: 'mastery_performance', tier: 'T2' },
] as const;

export type MetaProgramId = (typeof META_PROGRAMS)[number]['id'];
export type MetaProgramTier = 'T1' | 'T2' | 'T3';
export const META_PROGRAM_TIERS: Readonly<Record<MetaProgramId, MetaProgramTier>> = Object.freeze(
  Object.fromEntries(META_PROGRAMS.map((m) => [m.id, m.tier])) as Record<MetaProgramId, MetaProgramTier>,
);

/** §8's four evidence contexts — contradiction is represented per context, not resolved. */
export const EVIDENCE_CONTEXTS = ['solitary', 'social', 'work', 'play'] as const;
export type EvidenceContext = (typeof EVIDENCE_CONTEXTS)[number];

/** One deterministic observation: which pole of which distinction, in which context. Pole is -1..1. */
export interface Observation {
  readonly program: MetaProgramId;
  readonly pole: number;           // -1 = second pole, +1 = first pole, fractions = mixed markers
  readonly context: EvidenceContext;
  readonly at: number;             // deterministic clock (replay, 22 §9)
  readonly weight?: number;        // marker strength, default 1
}

export interface ContextEvidence {
  readonly observations: number;      // count
  readonly distinctSessions: number;  // §8: "across ≥3 distinct contexts" counts per-context sessions
  readonly sumPole: number;           // Σ pole×weight, for the recency-weighted mean
  readonly lastAt: number;
}

export interface ProgramEvidence {
  readonly program: MetaProgramId;
  readonly tier: MetaProgramTier;
  readonly byContext: Readonly<Record<EvidenceContext, ContextEvidence>>;
}

/** §8 minimum-evidence rule: a T2 write needs ≥6 observations across ≥3 distinct contexts. */
export const MIN_OBSERVATIONS = 6;
export const MIN_DISTINCT_CONTEXTS = 3;

/** Recency decay: evidence older than the half-life contributes half. Preference analogue of theta — analogous rule, NOT the same mechanism (§8). */
export const EVIDENCE_HALF_LIFE_MS = 30 * 24 * 3600 * 1000;

export interface TierVerdict {
  readonly program: MetaProgramId;
  readonly tier: MetaProgramTier;
  /** The recency-weighted mean pole per context — only meaningful if `gate === 'write'`. */
  readonly poleByContext: Readonly<Partial<Record<EvidenceContext, number>>>;
  /** 'field-of-record' (T1 validated) · 'weight' (T2 gated) · 'discard' (below minimum / T3) */
  readonly gate: 'field-of-record' | 'weight' | 'discard';
  /** Why the gate decided — required by 47 §9 check 1's provenance discipline. */
  readonly reason: string;
}

export interface EvidenceLedger {
  observe(o: Observation): void;
  /** The full ledger (auditable — the player reads, edits and deletes per §8's legibility rule). */
  readonly ledger: ReadonlyMap<MetaProgramId, ProgramEvidence>;
  /** Delete ALL evidence for a distinction — the §8 withdrawal rule (deletion is not itself recorded). */
  withdraw(program: MetaProgramId): void;
  /** §8's tier gate over the whole ledger. Deterministic: same ledger + clock → same verdicts. */
  evaluate(now: number, opts?: { t1Validated?: ReadonlySet<MetaProgramId> }): readonly TierVerdict[];
}

interface MutableContext {
  observations: number; sumPole: number; lastAt: number;
}
function emptyContext(): MutableContext {
  return { observations: 0, sumPole: 0, lastAt: 0 };
}

export function createEvidenceLedger(): EvidenceLedger {
  const store = new Map<MetaProgramId, Map<EvidenceContext, MutableContext>>();

  const ctxOf = (program: MetaProgramId, context: EvidenceContext) => {
    let m = store.get(program);
    if (!m) { m = new Map(); store.set(program, m); }
    let c = m.get(context);
    if (!c) { c = emptyContext(); m.set(context, c); }
    return c;
  };

  return {
    observe(o: Observation): void {
      // Structural firewall: a T3 distinction has no tier gate that can persist it, but it may
      // still enter the LEDGER (the audit surface) — the TIER GATE discards it at evaluate().
      const c = ctxOf(o.program, o.context);
      c.observations += 1;
      c.sumPole += o.pole * (o.weight ?? 1);
      c.lastAt = Math.max(c.lastAt, o.at);
    },
    ledger: store as unknown as ReadonlyMap<MetaProgramId, ProgramEvidence>,
    withdraw(program: MetaProgramId): void {
      store.delete(program);
    },
    evaluate(now, opts = {}) {
      const verdicts: TierVerdict[] = [];
      for (const [program, byContext] of store) {
        const tier = META_PROGRAM_TIERS[program];
        // T3: discarded by construction — nothing derived survives the session (§3).
        if (tier === 'T3') {
          verdicts.push({ program, tier, poleByContext: {}, gate: 'discard', reason: 'T3: descriptive only; never persisted (47 §3)' });
          continue;
        }
        let totalObs = 0;
        const contexts: EvidenceContext[] = [];
        const poles: Partial<Record<EvidenceContext, number>> = {};
        for (const ctx of EVIDENCE_CONTEXTS) {
          const c = byContext.get(ctx);
          if (!c || c.observations === 0) continue;
          totalObs += c.observations;
          contexts.push(ctx);
          // recency-weighted mean pole: exponential decay by half-life
          const age = Math.max(0, now - c.lastAt);
          const recency = Math.pow(0.5, age / EVIDENCE_HALF_LIFE_MS);
          poles[ctx] = (c.sumPole / c.observations) * recency;
        }
        const distinct = contexts.length;
        if (totalObs < MIN_OBSERVATIONS || distinct < MIN_DISTINCT_CONTEXTS) {
          verdicts.push({
            program, tier, poleByContext: poles, gate: 'discard',
            reason: `minimum evidence not met: ${totalObs} obs (<${MIN_OBSERVATIONS}) across ${distinct} contexts (<${MIN_DISTINCT_CONTEXTS})`,
          });
          continue;
        }
        if (tier === 'T1') {
          const validated = opts.t1Validated?.has(program) ?? false;
          verdicts.push({
            program, tier, poleByContext: poles,
            gate: validated ? 'field-of-record' : 'weight',
            reason: validated
              ? 'T1: instrument passed RV1–RV7 (12 §5.4); consent-bound field of record'
              : 'T1: instrument not yet validated — readings held at weight band (47 §7)',
          });
        } else {
          verdicts.push({
            program, tier, poleByContext: poles, gate: 'weight',
            reason: 'T2: correlational — ranking weight and scaffold input only, never a field of record (47 §3)',
          });
        }
      }
      return verdicts;
    },
  };
}
