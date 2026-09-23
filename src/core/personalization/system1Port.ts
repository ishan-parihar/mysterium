/**
 * The System-1 port — plan Phase 14 d6 (user-ratified: "approve Laya and wire the real System-1
 * adapter"; `43 §2`'s System-1 layer; `45 §5`).
 *
 * Three surfaces were ratified as the places a local decision model may be consulted, and nothing
 * else:
 *
 *  1. **Tag resolution** at the query-build seam (`pooling.ts`'s `TopicTagResolver`).
 *  2. **A polarity reading** proposal (`polarityResolution.ts`'s `System1Reader`).
 *  3. **A neighbour prefilter** for the index walk (`memory/LocalRetriever.ts`'s `boostIds`).
 *
 * The law the whole file is built around — `43 §2`'s boundary — is that a System-1 model
 * **proposes and never commits**, **never authors content**, and is **never the final authority**.
 * In code that is three properties, all of them enforced here rather than promised:
 *
 *  - **Vocabulary guard.** A proposed tag the store does not know is DROPPED, not passed on. A
 *    model that can widen the ontology is a model that can author canon, which is exactly what it
 *    may not do (`46 §11` invariant 4). The port cannot emit a tag outside the caller's vocabulary
 *    because this wrapper checks every one against the caller's own predicate.
 *  - **Total fallback.** Every operation degrades to the deterministic implementation on a throw, a
 *    `null`, or a rejected value. There is no call path in which a missing/broken model stops the
 *    loop (`45 §5` degradation law, `M6`).
 *  - **Agreement decides survival.** `evaluateSystem1Agreement` runs the port over a held-out set
 *    whose answers the deterministic path already knows, and `decideSystem1` keeps the model only
 *    above the threshold. A System-1 model earns its place by agreeing with the fallback where the
 *    fallback is right — which is the RV discipline (`12 §5.4`) applied to a model instead of an
 *    instrument.
 *
 * The reference implementation lives in `src/infra/llm/LayaSystem1Adapter.ts`; the interface and
 * the discipline live here so that the core never depends on the adapter (and so the fallback is
 * the thing the tests can hold still).
 */

import type { TagId } from '../world/tags/types.js';
import type { TopicTagResolver } from './pooling.js';
import type { PolarityReading, System1Reader } from './polarityResolution.js';
import type { EncounterRecord } from './polarityResolution.js';

// ─────────────────────────────────────────────────────────────────────────────
// The port
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A neighbour prefilter: given the seeds a query already has, propose the ids whose graph
 * neighbourhood should be boosted. A proposal, never a rewrite — the caller decides whether to
 * spend the walk on it, and the retriever remains correct with an empty answer.
 */
export type NeighbourPrefilter = (seedIds: readonly string[], candidates: readonly string[]) => readonly string[];

/** The three ratified surfaces, as one object. Absent fields mean "the fallback owns this". */
export interface System1Port {
  readonly id: string;
  readonly resolveTopicTag?: TopicTagResolver;
  readonly proposeReading?: System1Reader['proposeReading'];
  readonly prefilterNeighbours?: NeighbourPrefilter;
}

/** What a port is allowed to be trusted for. `provisional` is the standing of ANY model here. */
export type System1Standing = 'deterministic-fallback' | 'provisional-model';

export interface System1Binding {
  readonly port: System1Port;
  readonly standing: System1Standing;
  /** The agreement evidence that produced `standing` — empty for the deterministic fallback. */
  readonly evidence: readonly System1AgreementRow[];
}

// ─────────────────────────────────────────────────────────────────────────────
// The deterministic fallback (always available, always the floor)
// ─────────────────────────────────────────────────────────────────────────────

export interface DeterministicSystem1Deps {
  /** Tag resolution over the initial tag set (`candidateLibrary.initialTopicTagResolver`). */
  readonly resolveTopicTag: TopicTagResolver;
  /** The deterministic reading (`polarityResolution.deterministicReading`). */
  readonly proposeReading: NonNullable<System1Reader['proposeReading']>;
  /** The graph neighbourhood the retriever would walk anyway (its `boostIds` computation). */
  readonly prefilterNeighbours?: NeighbourPrefilter;
}

/**
 * The floor: no model, no randomness, total. This is what runs when nothing is configured, when
 * the model is unreachable, and when the model was discarded for disagreeing.
 */
export function createDeterministicSystem1(deps: DeterministicSystem1Deps): System1Port {
  return {
    id: 'deterministic-fallback',
    resolveTopicTag: deps.resolveTopicTag,
    proposeReading: deps.proposeReading,
    // No prefilter is a lawful answer: the retriever boosts exactly the seeds it was given.
    prefilterNeighbours: deps.prefilterNeighbours ?? ((seedIds) => seedIds),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// The vocabulary guard + the fallback combinator
// ─────────────────────────────────────────────────────────────────────────────

/** The caller's vocabulary. Anything outside it is not a proposal — it is an invention. */
export interface System1Vocabulary {
  /** Is this a tag the store knows? Fail-closed: an unknown tag is dropped, never forwarded. */
  readonly knowsTag: (t: TagId) => boolean;
  /** Is this an id the retriever's corpus contains? Unknown ids are dropped from a prefilter. */
  readonly knowsId?: (id: string) => boolean;
}

export interface System1GuardReport {
  readonly droppedTags: readonly string[];
  /** How many candidate ids a prefilter tried to introduce that the corpus does not contain. */
  droppedIds: number;
}

/**
 * Wrap a candidate port so every operation degrades to `fallback` on a throw, a `null`, or a
 * value outside the caller's vocabulary. The wrapper is where "proposes, never commits" stops
 * being a promise: the caller only ever sees values it can already accept.
 */
export function withSystem1Fallback(
  candidate: System1Port,
  fallback: System1Port,
  vocabulary: System1Vocabulary,
): { readonly port: System1Port; readonly report: System1GuardReport } {
  const droppedTags: string[] = [];
  const report: System1GuardReport = { droppedTags, droppedIds: 0 };

  /** Run `propose`, keep the result only if it is well-formed and in-vocabulary. */
  const guarded = <T>(propose: () => T | null | undefined, accept: (v: T) => boolean, orElse: () => T | undefined): T | undefined => {
    let proposed: T | null | undefined;
    try {
      proposed = propose();
    } catch {
      proposed = null;
    }
    if (proposed !== null && proposed !== undefined && accept(proposed)) return proposed;
    // The fallback is a seam, so a throw here is the last thing that may escape: degrade to
    // `undefined` rather than propagate (M6 — never throw across a seam that must degrade).
    try {
      return orElse();
    } catch {
      return undefined;
    }
  };

  const port: System1Port = {
    id: `${candidate.id}+fallback`,

    resolveTopicTag: (topic) => {
      const value = guarded(
        () => candidate.resolveTopicTag?.(topic),
        (tag) => {
          if (vocabulary.knowsTag(tag)) return true;
          droppedTags.push(tag);
          return false;
        },
        () => fallback.resolveTopicTag?.(topic),
      );
      return value;
    },

    proposeReading: (record: EncounterRecord) => {
      const value = guarded(
        () => candidate.proposeReading?.(record),
        (reading: PolarityReading) => Array.isArray(reading.evidence) && reading.evidence.length > 0 && Number.isFinite(reading.position),
        () => fallback.proposeReading?.(record) ?? undefined,
      );
      return value ?? null;
    },

    prefilterNeighbours: (seedIds, candidates) => {
      // Narrowing is this op's nature, so the guard FILTERS rather than accept-or-reject: a
      // prefilter that reorders usefully and also invents one id keeps the reordering and loses the
      // invention. (The other two ops propose a single value, so there accept-or-reject is right.)
      let proposed: readonly string[] | undefined;
      try {
        proposed = candidate.prefilterNeighbours?.(seedIds, candidates);
      } catch {
        proposed = undefined;
      }
      if (!Array.isArray(proposed)) {
        const fromFallback = (() => {
          try { return fallback.prefilterNeighbours?.(seedIds, candidates); } catch { return undefined; }
        })();
        return fromFallback ?? [...seedIds];
      }
      const filtered = vocabulary.knowsId ? proposed.filter((id) => vocabulary.knowsId!(id)) : [...proposed];
      report.droppedIds += proposed.length - filtered.length;
      return filtered;
    },
  };

  return { port, report };
}

// ─────────────────────────────────────────────────────────────────────────────
// The agreement check (RV discipline applied to a model)
// ─────────────────────────────────────────────────────────────────────────────

/** One held-out topic and the answer the deterministic resolver gives it. */
export interface System1AgreementCase {
  readonly topic: string;
  readonly expected: TagId | undefined;
}

export interface System1AgreementRow {
  readonly topic: string;
  readonly expected: TagId | undefined;
  readonly proposed: TagId | undefined;
  readonly agrees: boolean;
}

export interface System1AgreementResult {
  readonly rows: readonly System1AgreementRow[];
  /** Share of held-out cases where the model's proposal equals the deterministic answer. */
  readonly agreement: number;
  /** Cases the deterministic resolver could not answer are excluded from the denominator — a
   *  model cannot be scored against an answer nobody has. */
  readonly scored: number;
  readonly n: number;
}

/**
 * Score a candidate port against the deterministic resolver over a held-out topic set.
 *
 * Only cases where the deterministic resolver HAS an answer are scored. Measuring agreement over
 * unresolvable topics would reward a model for matching a shrug, which is the anti-pattern that
 * made the first version of the RV1 statistic rate a conforming cohort at 0.33.
 */
export function evaluateSystem1Agreement(
  candidate: System1Port,
  cases: readonly System1AgreementCase[],
  fallback: System1Port,
): System1AgreementResult {
  const rows: System1AgreementRow[] = [];
  let scored = 0;
  let agreed = 0;
  for (const c of cases) {
    const expected = fallback.resolveTopicTag?.(c.topic);
    let proposed: TagId | undefined;
    try {
      proposed = candidate.resolveTopicTag?.(c.topic);
    } catch {
      proposed = undefined; // a throwing port agrees with nothing; the combinator would fall back
    }
    const agrees = expected !== undefined && proposed === expected;
    rows.push({ topic: c.topic, expected, proposed, agrees });
    if (expected !== undefined) {
      scored += 1;
      if (agrees) agreed += 1;
    }
  }
  return { rows, agreement: scored === 0 ? 0 : agreed / scored, scored, n: cases.length };
}

/**
 * The threshold. Deliberately high: a model that agrees with the deterministic resolver only
 * sometimes is a second opinion the loop does not need, and every disagreement it wins is a
 * departure from canon. Provisional until a real held-out set exists — the same standing the
 * probe pilot's thresholds carry.
 */
export const SYSTEM1_AGREEMENT_THRESHOLD = 0.9;

export interface System1Decision {
  readonly keep: boolean;
  readonly standing: System1Standing;
  readonly agreement: number;
  readonly reason: string;
}

/** Keep the model only above the threshold; otherwise the loop stays on the fallback. */
export function decideSystem1(result: System1AgreementResult, threshold = SYSTEM1_AGREEMENT_THRESHOLD): System1Decision {
  if (result.scored === 0) {
    return {
      keep: false,
      standing: 'deterministic-fallback',
      agreement: 0,
      reason: 'no held-out case carried a deterministic answer — agreement is unmeasured, so the model cannot be kept (RV discipline: an unmeasured dimension is not a passed one)',
    };
  }
  const keep = result.agreement >= threshold;
  return {
    keep,
    standing: keep ? 'provisional-model' : 'deterministic-fallback',
    agreement: result.agreement,
    reason: keep
      ? `agreement ${result.agreement.toFixed(2)} ≥ ${threshold} over ${result.scored} scored case(s) — the model stays, provisional`
      : `agreement ${result.agreement.toFixed(2)} < ${threshold} over ${result.scored} scored case(s) — the model is discarded and the deterministic fallback takes its place`,
  };
}

/** Bind a port for a caller: run the agreement check, then return the port that has earned its place. */
export function bindSystem1(
  candidate: System1Port | undefined,
  fallback: System1Port,
  cases: readonly System1AgreementCase[],
  vocabulary: System1Vocabulary,
): System1Binding {
  if (!candidate) {
    return { port: fallback, standing: 'deterministic-fallback', evidence: [] };
  }
  const result = evaluateSystem1Agreement(candidate, cases, fallback);
  const decision = decideSystem1(result);
  if (!decision.keep) {
    return { port: fallback, standing: 'deterministic-fallback', evidence: result.rows };
  }
  // Kept — but still wrapped, because "kept" is a statement about agreement, not about every
  // future call. The guard is what makes that distinction real.
  const { port } = withSystem1Fallback(candidate, fallback, vocabulary);
  return { port, standing: 'provisional-model', evidence: result.rows };
}
