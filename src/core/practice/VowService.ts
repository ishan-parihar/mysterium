/**
 * VowService — the practice-objective lifecycle (doc 39 §3.2).
 *
 * Lifecycle: proposed → accepted → active → fulfilled | lapsed | renegotiated.
 * Design commitments enforced here:
 *   - Accept/decline is always the player's choice; decline is preference
 *     signal only (three declines of a class reroutes proposals — never nags).
 *   - No deadlines: `horizonMs` is player-declared context, never enforced.
 *   - Lapse is material, not moral: it feeds the avoidance signal and may
 *     yield a smaller re-proposal. It is discovered at the next visit — the
 *     service NEVER generates notification guilt (39 §3.2).
 *   - Fulfilment comes from reflection depth + consistency (development
 *     evidence), never from fact-verification.
 */
import type { Significator } from '../domain/Significator.js';
import type { Vow, ReflectionRecord } from '../domain/SharedTypes.js';
import { fnv1a } from '../orchestration/sessionLog.js';

export type VowKind = NonNullable<Vow['kind']>;
export type VowStatus = NonNullable<Vow['status']>;

/** The external vow list — lives beside the Significator (client-side). */
export interface VowBook {
  readonly vows: readonly Vow[];
  /** Decline counts per objective class (preference learning, 39 §3.2). */
  readonly declineCounts: Readonly<Record<string, number>>;
}

export function emptyVowBook(): VowBook {
  return { vows: [], declineCounts: {} };
}

function vowId(text: string, now: number): string {
  return `vow-${fnv1a(`${text}|${now}`)}`;
}

// ---------------------------------------------------------------------------
// Proposals & acceptance
// ---------------------------------------------------------------------------

export interface ObjectiveProposal {
  readonly text: string;
  readonly kind: VowKind;
  readonly rationale: string;
  readonly suggestedIntention?: { when: string; then: string };
  /** Player-declared lapse context (39 §3.2): suggestions carry a horizon;
   * the player may amend or remove it. Never enforced as a deadline. */
  readonly suggestedHorizonMs?: number;
}

export function proposeVow(proposal: ObjectiveProposal, now: number): Vow {
  return {
    text: proposal.text,
    createdAtMs: now,
    fulfilled: false,
    kind: proposal.kind,
    status: 'active',
    implementationIntention: proposal.suggestedIntention,
    horizonMs: proposal.suggestedHorizonMs,
    checkInCount: 0,
  };
}

/** Accept = keep the proposed vow (proposals enter as active on acceptance). */
export function acceptVow(book: VowBook, proposal: ObjectiveProposal, now: number): { book: VowBook; vow: Vow } {
  const vow = proposeVow(proposal, now);
  return { book: { ...book, vows: [...book.vows, vow] }, vow };
}

/** Decline is preference signal only — no vow is created, no pressure follows. */
export function declineVow(book: VowBook, proposal: ObjectiveProposal): VowBook {
  const cls = proposal.kind;
  return {
    ...book,
    declineCounts: { ...book.declineCounts, [cls]: (book.declineCounts[cls] ?? 0) + 1 },
  };
}

/** Three declines of a class reroutes proposals (never nags). */
export function shouldRerouteClass(book: VowBook, kind: VowKind): boolean {
  return (book.declineCounts[kind] ?? 0) >= 3;
}

// ---------------------------------------------------------------------------
// Check-ins & transitions
// ---------------------------------------------------------------------------

export interface CheckInResult {
  readonly book: VowBook;
  readonly sig: Significator;
  readonly record: ReflectionRecord;
  readonly depthScore: 1 | 2 | 3 | 4 | 5;
  readonly vowFulfilled: boolean;
  readonly vowLapsed: boolean;
}

/**
 * Record a journal check-in against a vow (or as a free-standing reflection
 * when vowId is omitted). Appends the ReflectionRecord to the Significator and
 * increments the vow's checkInCount. Fulfilment is evaluated by the caller's
 * criteria function (depth + consistency), keeping this module policy-light.
 */
export function checkIn(
  book: VowBook,
  sig: Significator,
  args: {
    vow?: Vow;
    prompts: readonly { question: string; answer: string }[];
    now: number;
    depthScore: 1 | 2 | 3 | 4 | 5;
    fulfilmentCriteriaMet: boolean;
  },
): CheckInResult {
  const record: ReflectionRecord = {
    id: `ref-${fnv1a(`${args.vow?.text ?? 'free'}|${args.now}|${args.prompts.length}`)}`,
    vowId: args.vow ? vowId(args.vow.text, args.vow.createdAtMs) : undefined,
    prompts: args.prompts,
    depthScore: args.depthScore,
    createdAtMs: args.now,
  };

  const sigOut: Significator = { ...sig, reflections: [...(sig.reflections ?? []), record] };

  if (!args.vow) {
    return { book, sig: sigOut, record, depthScore: args.depthScore, vowFulfilled: false, vowLapsed: false };
  }

  const updated: Vow = {
    ...args.vow,
    checkInCount: (args.vow.checkInCount ?? 0) + 1,
    status: args.fulfilmentCriteriaMet ? 'fulfilled' : 'active',
    fulfilled: args.fulfilmentCriteriaMet || args.vow.fulfilled,
  };
  const bookOut: VowBook = {
    ...book,
    vows: book.vows.map((v) => (v.text === args.vow!.text && v.createdAtMs === args.vow!.createdAtMs ? updated : v)),
  };
  return { book: bookOut, sig: sigOut, record, depthScore: args.depthScore, vowFulfilled: args.fulfilmentCriteriaMet, vowLapsed: false };
}

/**
 * Lapse discovery — called at visit/session start, never via notifications.
 * A vow is lapsed when: status is active, it has a declared horizon, the
 * horizon passed, AND it has zero check-ins (an engaged vow never lapses on a
 * timer — engagement is what matters, not the calendar).
 */
export function discoverLapses(book: VowBook, now: number): { book: VowBook; lapsed: readonly Vow[] } {
  const lapsed: Vow[] = [];
  const vows = book.vows.map((v) => {
    const isActive = (v.status ?? 'active') === 'active';
    const pastHorizon = v.horizonMs !== undefined && now - v.createdAtMs > v.horizonMs;
    const untouched = (v.checkInCount ?? 0) === 0;
    if (isActive && pastHorizon && untouched) {
      const lapsedVow: Vow = { ...v, status: 'lapsed' };
      lapsed.push(lapsedVow);
      return lapsedVow;
    }
    return v;
  });
  return { book: { ...book, vows }, lapsed };
}

/** Renegotiation: an active/lapsed vow amended into a smaller active step. */
export function renegotiateVow(book: VowBook, vow: Vow, smallerStepText: string, now: number): { book: VowBook; vow: Vow } {
  const amended: Vow = {
    text: smallerStepText,
    createdAtMs: now,
    fulfilled: false,
    kind: vow.kind,
    status: 'active',
    implementationIntention: vow.implementationIntention,
    checkInCount: 0,
  };
  return {
    book: {
      ...book,
      vows: [
        ...book.vows.map((v) => (v.text === vow.text && v.createdAtMs === vow.createdAtMs ? { ...v, status: 'renegotiated' as const } : v)),
        amended,
      ],
    },
    vow: amended,
  };
}

/** Lapses feed the avoidance signal (material, not moral — 10/24). */
export function lapseAvoidanceDelta(lapsed: readonly Vow[]): number {
  return Math.min(0.1, lapsed.length * 0.02);
}
