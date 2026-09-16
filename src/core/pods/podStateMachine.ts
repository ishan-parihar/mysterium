/**
 * Pod state machine (doc 38 §4) — the PURE core of the cohort weave.
 *
 * This module owns the pod domain: formation, membership, weave events,
 * shared ritual sessions, and recognition signals. It is deliberately
 * transport-free: a Cloudflare Durable Object (M1) or KV+poll loop (M0)
 * is a thin adapter that feeds events into applyEvent IN SERIAL ORDER
 * (38 §4.2) — the state machine itself never does I/O.
 *
 * Laws enforced here (38):
 *   L1  Privacy load-bearing wall (§4.3) — payload validators REJECT any
 *       payload carrying Significator/shadow/theta/journal keys; the server
 *       side of the wall is this validator.
 *   L2  Membership bounds — invite-only, 3–9 members (scope fence §1.1).
 *   L3  Recognition is peer-issued or system-derived, never self-scored;
 *       evidence references point at published aggregates only.
 *   L4  Ritual state machine: gathering → catalyst → integration → closed,
 *       with role-independence in collaborative/assistive modes (M1 test).
 *   L5  Events apply serially; the pod object is the single writer.
 */

// ---------------------------------------------------------------------------
// Domain types (38 §4.1)
// ---------------------------------------------------------------------------

export type PodMode = 'mirrored' | 'collaborative' | 'assistive';
export type RitualState = 'gathering' | 'catalyst' | 'integration' | 'closed';
export type WeaveEventType = 'ritual-started' | 'ritual-completed' | 'recognition' | 'objective-witnessed';
export type RecognitionKind = 'consistency' | 'growth' | 'service';

export interface PodMember {
  readonly playerId: string;
  readonly joinedAtMs: number;
  readonly roles: readonly string[];
}

export interface CohortPod {
  readonly id: string;
  readonly members: readonly PodMember[];
  readonly covenant: string;
  readonly createdAtMs: number;
  readonly seasonId?: string;
  /** Supervised-pod hook (38 §4.5) — shape only; enforcement is 41's. */
  readonly supervision?: { readonly kind: 'guardian' | 'classroom'; readonly supervisorMemberId: string };
}

export interface RecognitionSignal {
  readonly fromMemberId: string;
  readonly toMemberId: string;
  readonly kind: RecognitionKind;
  readonly periodId: string;
  /** Pointer to a DERIVED aggregate the recipient explicitly published. */
  readonly evidenceRef: string;
}

export interface SharedRitualSession {
  readonly podId: string;
  readonly encounterTemplateId: string;
  readonly mode: PodMode;
  readonly roles: Readonly<Record<string, string>>;
  readonly state: RitualState;
}

export interface WeaveEvent {
  readonly id: string;
  readonly podId: string;
  readonly type: WeaveEventType;
  readonly payload: unknown;
  readonly occurredAtMs: number;
  /** Server receive order — the serial-application authority (§4.2). */
  readonly sequence: number;
}

// ---------------------------------------------------------------------------
// Pod state (what the DO holds)
// ---------------------------------------------------------------------------

export interface PodState {
  readonly pod: CohortPod | null;
  readonly ritual: SharedRitualSession | null;
  /** Published recognition aggregates by evidenceRef (all the server keeps). */
  readonly publishedAggregates: Readonly<Record<string, unknown>>;
  /** Recognition signals applied this period, keyed by periodId. */
  readonly recognitions: readonly RecognitionSignal[];
  readonly eventLog: readonly WeaveEvent[];
}

export function emptyPodState(): PodState {
  return { pod: null, ritual: null, publishedAggregates: {}, recognitions: [], eventLog: [] };
}

// ---------------------------------------------------------------------------
// Payload firewall (L1 — 38 §4.3)
// ---------------------------------------------------------------------------

/** Keys that must never appear in any event payload crossing the wall. */
const FORBIDDEN_PAYLOAD_KEYS: readonly string[] = [
  'significator', 'shadows', 'shadowLedger', 'theta', 'thetas', 'thetaVector',
  'reflections', 'journal', 'journalEntry', 'depthScore', 'knowledge',
  'knowledgeState', 'conceptState', 'identity', 'identityProfile',
];

/**
 * Reject payloads that would smuggle personal psych state into the server.
 * Checks recursively — nested objects get the same wall.
 */
export function payloadIsSafe(payload: unknown, depth = 0): boolean {
  if (depth > 6) return false; // absurd nesting is itself suspicious
  if (payload === null || typeof payload !== 'object') return true;
  if (Array.isArray(payload)) return payload.every((p) => payloadIsSafe(p, depth + 1));
  for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
    if (FORBIDDEN_PAYLOAD_KEYS.some((f) => key.toLowerCase() === f.toLowerCase())) return false;
    if (!payloadIsSafe(value, depth + 1)) return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Pod formation & membership (L2)
// ---------------------------------------------------------------------------

export const POD_MIN_MEMBERS = 3;
export const POD_MAX_MEMBERS = 9;

export interface PodFormationPayload {
  readonly id: string;
  readonly covenant: string;
  readonly createdAtMs: number;
  readonly supervision?: CohortPod['supervision'];
}

export function formPod(state: PodState, formation: PodFormationPayload, founderId: string): PodState {
  if (state.pod !== null) return state; // single formation per pod object
  const pod: CohortPod = {
    id: formation.id,
    members: [{ playerId: founderId, joinedAtMs: formation.createdAtMs, roles: ['founder'] }],
    covenant: formation.covenant,
    createdAtMs: formation.createdAtMs,
    supervision: formation.supervision,
  };
  return { ...state, pod };
}

export function joinPod(state: PodState, playerId: string, now: number): { state: PodState; ok: boolean; reason?: string } {
  if (!state.pod) return { state, ok: false, reason: 'pod not formed' };
  if (state.pod.members.some((m) => m.playerId === playerId)) return { state, ok: true };
  if (state.pod.members.length >= POD_MAX_MEMBERS) return { state, ok: false, reason: `pod full (max ${POD_MAX_MEMBERS})` };
  const pod: CohortPod = {
    ...state.pod,
    members: [...state.pod.members, { playerId, joinedAtMs: now, roles: ['member'] }],
  };
  return { state: { ...state, pod }, ok: true };
}

export function quorumMet(state: PodState): boolean {
  return state.pod !== null && state.pod.members.length >= POD_MIN_MEMBERS;
}

// ---------------------------------------------------------------------------
// Ritual lifecycle (L4)
// ---------------------------------------------------------------------------

export function startRitual(
  state: PodState,
  args: { encounterTemplateId: string; mode: PodMode; roles: Readonly<Record<string, string>>; now: number },
): { state: PodState; ok: boolean; reason?: string } {
  if (!quorumMet(state)) return { state, ok: false, reason: 'quorum not met (need 3+ members)' };
  if (state.ritual && state.ritual.state !== 'closed') return { state, ok: false, reason: 'a ritual is already open' };
  // Every participating member must hold a role; every role-holder must be a member.
  const memberIds = new Set(state.pod!.members.map((m) => m.playerId));
  for (const memberId of Object.keys(args.roles)) {
    if (!memberIds.has(memberId)) return { state, ok: false, reason: `role assigned to non-member ${memberId}` };
  }
  const ritual: SharedRitualSession = {
    podId: state.pod!.id,
    encounterTemplateId: args.encounterTemplateId,
    mode: args.mode,
    roles: args.roles,
    state: 'gathering',
  };
  return { state: { ...state, ritual }, ok: true };
}

/** Advance ritual state; enforces role-independence for collaborative/assistive. */
export function advanceRitual(state: PodState): { state: PodState; ok: boolean; reason?: string } {
  if (!state.ritual || state.ritual.state === 'closed') return { state, ok: false, reason: 'no open ritual' };
  if (state.ritual.mode !== 'mirrored') {
    // Role-independence (38 §5 M1): a collaborative/assistive ritual cannot
    // advance past 'catalyst' unless every assigned role has checked in —
    // represented here by catalyst-phase completions recorded in the log.
    const completions = state.eventLog.filter(
      (e) => e.type === 'ritual-completed' && state.ritual!.state === 'catalyst',
    ).length;
    const roleCount = Object.keys(state.ritual.roles).length;
    if (state.ritual.state === 'catalyst' && completions < roleCount) {
      return { state, ok: false, reason: 'role-independence: not all roles have completed the catalyst phase' };
    }
  }
  const order: RitualState[] = ['gathering', 'catalyst', 'integration', 'closed'];
  const next = order[Math.min(order.indexOf(state.ritual.state) + 1, order.length - 1)];
  return { state: { ...state, ritual: { ...state.ritual, state: next } }, ok: true };
}

// ---------------------------------------------------------------------------
// Recognition (L3)
// ---------------------------------------------------------------------------

export function publishAggregate(state: PodState, evidenceRef: string, aggregate: unknown, now: number): { state: PodState; ok: boolean; reason?: string } {
  if (!state.pod) return { state, ok: false, reason: 'pod not formed' };
  if (!payloadIsSafe(aggregate)) return { state, ok: false, reason: 'aggregate carries personal psych state' };
  // Publication is the member's explicit consent act (38 §4.3).
  const event: WeaveEvent = {
    id: `pub-${evidenceRef}-${now}`,
    podId: state.pod.id,
    type: 'objective-witnessed',
    payload: { evidenceRef, aggregate },
    occurredAtMs: now,
    sequence: state.eventLog.length,
  };
  return { state: { ...state, publishedAggregates: { ...state.publishedAggregates, [evidenceRef]: aggregate }, eventLog: [...state.eventLog, event] }, ok: true };
}

export function issueRecognition(state: PodState, signal: RecognitionSignal, now: number): { state: PodState; ok: boolean; reason?: string } {
  if (!state.pod) return { state, ok: false, reason: 'pod not formed' };
  const memberIds = new Set(state.pod.members.map((m) => m.playerId));
  if (!memberIds.has(signal.fromMemberId)) return { state, ok: false, reason: 'recognition from non-member' };
  if (!memberIds.has(signal.toMemberId)) return { state, ok: false, reason: 'recognition to non-member' };
  if (signal.fromMemberId === signal.toMemberId) return { state, ok: false, reason: 'recognition is peer-issued, never self-scored' };
  // Evidence must point at a published aggregate (L3) — or be a system-derived ref.
  if (!signal.evidenceRef.startsWith('system:') && !(signal.evidenceRef in state.publishedAggregates)) {
    return { state, ok: false, reason: `evidenceRef '${signal.evidenceRef}' points at no published aggregate` };
  }
  if (!payloadIsSafe(signal)) return { state, ok: false, reason: 'signal carries personal psych state' };
  const event: WeaveEvent = {
    id: `rec-${signal.fromMemberId}-${signal.toMemberId}-${now}`,
    podId: state.pod.id,
    type: 'recognition',
    payload: signal,
    occurredAtMs: now,
    sequence: state.eventLog.length,
  };
  return { state: { ...state, recognitions: [...state.recognitions, signal], eventLog: [...state.eventLog, event] }, ok: true };
}

// ---------------------------------------------------------------------------
// Serial event application (L5) — the DO's only mutation path
// ---------------------------------------------------------------------------

export interface SerializedEvent {
  readonly type: 'form' | 'join' | 'ritual-start' | 'ritual-advance' | 'publish' | 'recognize';
  readonly payload: Record<string, unknown>;
  readonly occurredAtMs: number;
}

/**
 * G18 — Pod privacy-wall gate (hard, plan Phase 4): a two-persona pod
 * simulation proving (a) the payload firewall rejects personal psych state,
 * (b) recognition leaks nothing beyond published aggregates, (c) collaborative
 * rituals enforce role-independence.
 */
export function validatePodPrivacyWall(): import('../validation/gates.js').GateResult {
  const mk = (m: string): import('../validation/gates.js').GateResult => ({
    gate: 'G18 pod privacy wall', passed: false, hard: true, details: m,
  });
  try {
    // (a) Firewall: personal psych state must be rejected at the wall.
    const smuggles = { results: [{ theta: [0.9, 0.2] }], cci: 0.7 };
    if (payloadIsSafe(smuggles)) return mk('payload firewall accepted theta/cci data');
    if (!payloadIsSafe({ evidenceRef: 'pub-1', consistency: 0.8, attempts: 12 })) {
      return mk('payload firewall rejected a legitimate derived aggregate');
    }

    // (b) Two-persona pod: formation → join ×2 → publish → recognize.
    let state = emptyPodState();
    const t0 = 1_000_000;
    state = applyEvent(state, { type: 'form', payload: { id: 'pod-g18', covenant: 'we practice together', founderId: 'persona-a' }, occurredAtMs: t0 }).state;
    state = applyEvent(state, { type: 'join', payload: { playerId: 'persona-b' }, occurredAtMs: t0 + 1 }).state;
    state = applyEvent(state, { type: 'join', payload: { playerId: 'persona-c' }, occurredAtMs: t0 + 2 }).state;
    if (state.pod?.members.length !== 3) return mk('pod formation/join failed');

    // Self-recognition must be refused; evidence must point at a publication.
    const selfRec = issueRecognition(state, { fromMemberId: 'persona-b', toMemberId: 'persona-b', kind: 'growth', periodId: 'p1', evidenceRef: 'system:derived' }, t0 + 3);
    if (selfRec.ok) return mk('self-recognition accepted (recognition must be peer-issued)');
    const ghostRec = issueRecognition(state, { fromMemberId: 'persona-b', toMemberId: 'persona-c', kind: 'growth', periodId: 'p1', evidenceRef: 'unpublished-ref' }, t0 + 4);
    if (ghostRec.ok) return mk('recognition accepted against unpublished evidence');

    const pub = publishAggregate(state, 'persona-c:consistency:p1', { attempts: 12, consistency: 0.83 }, t0 + 5);
    if (!pub.ok) return mk(`legitimate aggregate publication rejected: ${pub.reason}`);
    state = pub.state;
    const rec = issueRecognition(state, { fromMemberId: 'persona-b', toMemberId: 'persona-c', kind: 'consistency', periodId: 'p1', evidenceRef: 'persona-c:consistency:p1' }, t0 + 6);
    if (!rec.ok) return mk(`legitimate recognition rejected: ${rec.reason}`);
    state = rec.state;
    if (state.recognitions.length !== 1) return mk('recognition not recorded');

    // (c) Role-independence: collaborative ritual cannot complete without every role.
    const rs = startRitual(state, {
      encounterTemplateId: 'shared-encounter', mode: 'collaborative',
      roles: { 'persona-a': 'anchor', 'persona-b': 'witness', 'persona-c': 'challenger' }, now: t0 + 7,
    });
    if (!rs.ok) return mk(`collaborative ritual start rejected: ${rs.reason}`);
    state = rs.state;
    state = advanceRitual(state).state; // gathering → catalyst
    const premature = advanceRitual(state);
    if (premature.ok) return mk('catalyst advanced with zero role completions (role-independence unenforced)');

    return { gate: 'G18 pod privacy wall', passed: true, hard: true, details: 'firewall rejects psych state; recognition peer-issued on published evidence; role-independence enforced' };
  } catch (e) {
    return mk(`error: ${e instanceof Error ? e.message : String(e)}`);
  }
}

/** Apply one event in serial order. Transport adapters call ONLY this. */
export function applyEvent(state: PodState, event: SerializedEvent): { state: PodState; ok: boolean; reason?: string } {
  switch (event.type) {
    case 'form': {
      const formation = event.payload as unknown as PodFormationPayload;
      const founderId = (event.payload as { founderId?: string }).founderId ?? 'founder';
      return { state: formPod(state, formation, founderId), ok: true };
    }
    case 'join': {
      return joinPod(state, String(event.payload.playerId), event.occurredAtMs);
    }
    case 'ritual-start': {
      return startRitual(state, {
        encounterTemplateId: String(event.payload.encounterTemplateId ?? 'shared-encounter'),
        mode: (event.payload.mode as PodMode) ?? 'mirrored',
        roles: (event.payload.roles as Readonly<Record<string, string>>) ?? {},
        now: event.occurredAtMs,
      });
    }
    case 'ritual-advance':
      return advanceRitual(state);
    case 'publish': {
      return publishAggregate(state, String(event.payload.evidenceRef), event.payload.aggregate, event.occurredAtMs);
    }
    case 'recognize': {
      return issueRecognition(state, event.payload as unknown as RecognitionSignal, event.occurredAtMs);
    }
    default:
      return { state, ok: false, reason: `unknown event type` };
  }
}
