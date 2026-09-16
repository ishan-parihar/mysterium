/**
 * Practice tools (doc 39 §4.2) — the orchestrator-side toolset for the
 * practice loop, and the delegated mandates for the Teacher council (T2/T3)
 * and the Reviewer (A2).
 *
 *   propose_objective — engine state → Vow drafts (needs detector + ledger +
 *                       curriculum position, per 39 §3.2)
 *   process_checkin   — reflection answers → depth score + consequence record
 *   review_practice   — reflection corpus → qualitative, Veil-safe narrative
 *
 * Safety routing (39 §4.2 / crisis rule): reflection text crossing crisis
 * patterns returns a safety routing flag BEFORE any engine integration.
 */
import type { Significator } from '../domain/Significator.js';
import type { WorldState } from '../engines/EncounterScheduler.js';
import type { ReflectionRecord, Vow } from '../domain/SharedTypes.js';
import type { Line } from '../domain/Line.js';
import { createSignificator } from '../domain/Significator.js';
import { createInitialWorldState } from '../engines/CandidateGeneration.js';
import { ALL_LINES } from '../domain/Line.js';
import { validateSpec } from '../orchestration/delegate.js';
import { ROLE_TOOLSETS } from '../orchestration/types.js';
import type { GateResult } from '../validation/gates.js';
import {
  acceptVow, checkIn, discoverLapses, emptyVowBook, lapseAvoidanceDelta,
} from './VowService.js';
import { scoreReflectionDepth, classifyReflection, processReflection, REFLECTION_PROMPTS } from './ReflectionEvidence.js';
import type { ObjectiveProposal, VowBook } from './VowService.js';

// Crisis patterns (deterministic, offline-safe). Bypass everything → safety.
const CRISIS_PATTERNS: readonly RegExp[] = [
  /\bsuicid/i, /\bkill (myself|me)\b/i, /\bself[- ]harm/i, /\bwant to die\b/i,
  /\bhurt (myself|my self)\b/i, /\bend it all\b/i,
];

export function detectCrisis(text: string): boolean {
  return CRISIS_PATTERNS.some((r) => r.test(text));
}

// ---------------------------------------------------------------------------
// propose_objective
// ---------------------------------------------------------------------------

export interface ObjectiveContext {
  /** Top unmet need labels from the DevelopmentalNeedsDetector (may be empty offline). */
  readonly needs: readonly { label: string; urgency: number }[];
  /** Active shadow entries (line + quadrant) eligible for exposure objectives. */
  readonly activeShadows: readonly { line: Line; quadrant: string; severity: number }[];
}

const KIND_BY_NEED: Record<string, Vow['kind']> = {
  drive_rebalance: 'practice',
  shadow_integration: 'exposure',
  knowledge_decay: 'learning',
  stage_readiness: 'practice',
  theta_staleness: 'practice',
  polarity_clarification: 'service',
};

/** Generate 1–3 candidate objectives sized by the staircase (small steps). */
export function proposeObjectives(ctx: ObjectiveContext): readonly ObjectiveProposal[] {
  const out: ObjectiveProposal[] = [];
  const WEEK = 7 * 86_400_000;
  for (const s of [...ctx.activeShadows].sort((a, b) => b.severity - a.severity).slice(0, 2)) {
    out.push({
      text: `Take one small step toward what feels hard around ${s.line.toLowerCase()} themes (e.g., a two-minute contact, not a confrontation).`,
      kind: 'exposure',
      rationale: `active ${s.quadrant} shadow on ${s.line}`,
      suggestedIntention: { when: 'next low-pressure moment', then: 'the two-minute step above' },
      suggestedHorizonMs: WEEK,
    });
  }
  for (const n of [...ctx.needs].sort((a, b) => b.urgency - a.urgency).slice(0, 2)) {
    const kind = KIND_BY_NEED[n.label.split(':')[0]] ?? 'practice';
    out.push({
      text: `One small ${kind} step this week for what the mirror shows as ${n.label.replace(/_/g, ' ')}.`,
      kind,
      rationale: `need ${n.label} at urgency ${n.urgency.toFixed(2)}`,
      suggestedIntention: { when: 'this week, at a moment you choose', then: 'the step above, sized down if needed' },
      suggestedHorizonMs: WEEK,
    });
  }
  return out.slice(0, 3);
}

// ---------------------------------------------------------------------------
// process_checkin
// ---------------------------------------------------------------------------

export interface CheckInArgs {
  readonly book: VowBook;
  readonly sig: Significator;
  readonly world: WorldState;
  readonly vow?: Vow;
  readonly answers: readonly string[];
  readonly now: number;
  readonly primaryLine?: Line;
}

export interface CheckInOutcome {
  readonly routedToSafety: boolean;
  readonly book: VowBook;
  readonly sig: Significator;
  readonly world: WorldState;
  readonly record?: ReflectionRecord;
  readonly depthScore?: 1 | 2 | 3 | 4 | 5;
  readonly engineIntegrated: boolean;
  readonly lapseDeltaApplied: number;
}

/**
 * Full check-in flow: crisis gate → reflection record (persisted by VowService)
 * → engine evidence (attempted exposure = shadow relief; service = polarity
 * weighting; approach = drive vector) → lapse discovery (material, not moral).
 */
export function processCheckIn(args: CheckInArgs): CheckInOutcome {
  const joined = args.answers.join('\n');
  if (detectCrisis(joined)) {
    // Journal text never leaves the client; the flag routes the UI to the
    // safety layer. Nothing is integrated; nothing is scored.
    return { routedToSafety: true, book: args.book, sig: args.sig, world: args.world, engineIntegrated: false, lapseDeltaApplied: 0 };
  }

  const depth = scoreReflectionDepth(args.answers);
  const prompts = REFLECTION_PROMPTS.map((q: string, i: number) => ({ question: q, answer: args.answers[i] ?? '' }));

  // Record + vow counters (pure).
  const checked = checkIn(args.book, args.sig, {
    vow: args.vow,
    prompts,
    now: args.now,
    depthScore: depth,
    // Fulfilment: depth ≥3 sustained across ≥2 check-ins is development
    // evidence (39 §3.2); the criterion is intentionally modest.
    fulfilmentCriteriaMet: depth >= 3 && ((args.vow?.checkInCount ?? 0) + 1) >= 2,
  });

  // Engine integration as a real-world catalyst event — integrate from the
  // record-bearing state (checked.sig), not the pre-check-in state, so the
  // reflection survives the pipeline.
  const vowLine = args.vow?.kind === 'exposure'
    ? inferShadowLine(args.sig)
    : inferPrimaryLine(args.sig);
  const evidence = classifyReflection(checked.record, vowLine);
  const integrated = processReflection(checked.sig, args.world, checked.record, evidence, {}, args.now);

  // Lapse discovery at visit (never notifications).
  const lapses = discoverLapses(checked.book, args.now);
  const lapseDelta = lapseAvoidanceDelta(lapses.lapsed);

  return {
    routedToSafety: false,
    book: lapses.book,
    sig: integrated.sig,
    world: integrated.world,
    record: checked.record,
    depthScore: depth,
    engineIntegrated: integrated.applied,
    lapseDeltaApplied: lapseDelta,
  };
}

function inferPrimaryLine(sig: Significator): Line {
  // Lowest-freshness line wins (the neglected one gets the practice).
  const entries = Object.entries(sig.theta.lastEncounter ?? {});
  if (entries.length === 0) return 'Intrapersonal';
  const [line] = entries.sort((a, b) => a[1] - b[1])[0] as [Line, number];
  return line;
}

function inferShadowLine(sig: Significator): Line {
  const active = sig.shadows.entries.filter((e) => e.resolvedAt === null);
  if (active.length === 0) return 'Intrapersonal';
  return active.sort((a, b) => b.severity - a.severity)[0].line;
}

// ---------------------------------------------------------------------------
// review_practice (A2 Reviewer mandate)
// ---------------------------------------------------------------------------

export interface PracticeReview {
  readonly reflectionCount: number;
  readonly avgDepth: number;
  readonly narrative: string;
  /** Delegable: A2 Reviewer consumes this corpus projection only (TL2). */
  readonly corpusProjection: readonly { createdAtMs: number; depthScore?: number }[];
}

/**
 * Qualitative synthesis of the reflection corpus. Veil-safe: felt-sense
 * language, no scores, no clinical labels, no comparisons to other players.
 */
export function reviewPractice(sig: Significator): PracticeReview {
  const refs = sig.reflections ?? [];
  const corpusProjection = refs.map((r) => ({ createdAtMs: r.createdAtMs, depthScore: r.depthScore }));
  if (refs.length === 0) {
    return { reflectionCount: 0, avgDepth: 0, narrative: 'The journal waits, unhurried. Whenever you return, it meets you where you are.', corpusProjection };
  }
  const avgDepth = refs.reduce((a, r) => a + (r.depthScore ?? 1), 0) / refs.length;
  const recent = refs.slice(-3);
  const parts: string[] = [];
  if (avgDepth >= 4) {
    parts.push('Your reflections have been finding threads that run beneath single days — connections across moments, and sometimes a new way of seeing an old shape.');
  } else if (avgDepth >= 3) {
    parts.push('Something in your journaling has started asking *why*, not just *what* — the mirror shows a mind probing its own mechanisms.');
  } else {
    parts.push('You have been keeping honest company with your days — the simple act of writing it down is its own quiet practice.');
  }
  if (recent.some((r) => (r.depthScore ?? 1) >= 4)) {
    parts.push('A recent entry touched a pattern that has been waiting to be noticed.');
  }
  return {
    reflectionCount: refs.length,
    avgDepth,
    narrative: parts.join(' '),
    corpusProjection,
  };
}

// ---------------------------------------------------------------------------
// G16 — Practice-loop kernel gate (hard)
// ---------------------------------------------------------------------------

export function validatePracticeLoop(): GateResult {
  const mk = (m: string): GateResult => ({ gate: 'G16 practice loop', passed: false, hard: true, details: m });
  try {
    // The gate runs the vow→check-in→evidence cycle over a fresh state.
    const altitudes = Object.fromEntries(ALL_LINES.map((l) => [l, 'Red'])) as never;
    const sig = createSignificator('g16-probe', altitudes, 'Red');
    const world = createInitialWorldState([]);

    // 1. propose → accept
    const proposals = proposeObjectives({ needs: [{ label: 'shadow_integration:Interpersonal', urgency: 0.9 }], activeShadows: [{ line: 'Interpersonal', quadrant: 'DarkAddiction', severity: 0.7 }]});
    if (proposals.length === 0) return mk('no objectives proposed');
    const { book } = acceptVow(emptyVowBook(), proposals[0], 1_000_000);
    if (book.vows.length !== 1) return mk('accept failed');

    // 2. delegated mandates reference real tools in real allowlists (G15 bridge)
    for (const role of ['T2', 'A2'] as const) {
      const probe = { role, purpose: 'probe', readProjection: new Set(), toolset: ROLE_TOOLSETS[role], budget: { toolCallsMax: 1, virtualMsMax: 60_000 } } as unknown as Parameters<typeof validateSpec>[0];
      if (validateSpec(probe) !== null) return mk(`${role} toolset invalid`);
    }
    void world;

    // 3. crisis routing: distress text routes to safety BEFORE integration
    const crisis = processCheckIn({ book, sig, world, answers: ['I want to die'], now: 1_001_000 });
    if (!crisis.routedToSafety) return mk('crisis text not routed to safety');
    if (crisis.record !== undefined) return mk('crisis text was scored/integrated');

    // 4. healthy check-in: depth scored, engine integrated, no moral framing
    const healthy = processCheckIn({
      book: crisis.book, sig: crisis.sig, world: crisis.world,
      answers: ['I tried speaking up once', 'It felt tense then lighter', 'The waiting was hard', 'Same as last time at work — I keep postponing', 'I will practice two minutes tomorrow'],
      now: 1_002_000,
    });
    if (healthy.routedToSafety) return mk('healthy text routed to safety');
    if (!healthy.record) return mk('no reflection record');
    if (!healthy.engineIntegrated) return mk('engine integration failed');
    if ((healthy.depthScore ?? 0) < 2) return mk('depth scoring too coarse for honest text');

    // 5. lapse discipline: untouched vow past horizon lapses; engaged vow does not
    const engagedBook = { ...healthy.book, vows: healthy.book.vows.map((v) => ({ ...v, checkInCount: 2 })) };
    const l1 = discoverLapses(healthy.book, 1_000_000 + 30 * 86_400_000);
    const l2 = discoverLapses(engagedBook, 1_000_000 + 30 * 86_400_000);
    if (l1.lapsed.length !== healthy.book.vows.length) return mk('untouched vow did not lapse');
    if (l2.lapsed.length !== 0) return mk('engaged vow lapsed — violates engagement-over-calendar rule');

    // 6. review: Veil-safe narrative (no scores, no clinical terms)
    const review = reviewPractice(healthy.sig);
    if (review.reflectionCount === 0) return mk('review saw empty corpus');
    if (/\b\d+(\.\d+)?\b/.test(review.narrative) || /shadow|drive|theta|CCI|quadrant/i.test(review.narrative)) {
      return mk(`veil leak in review narrative: ${review.narrative}`);
    }

    return { gate: 'G16 practice loop', passed: true, hard: true, details: `proposals=${proposals.length} depth=${healthy.depthScore} integrated=${healthy.engineIntegrated} lapseOK crisisOK veilOK` };
  } catch (e) {
    return mk(`error: ${e instanceof Error ? e.message : String(e)}`);
  }
}
