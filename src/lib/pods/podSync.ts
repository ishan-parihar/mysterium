/**
 * The pod sync surface for the browser (`/pod`).
 *
 * `mysterium pod sync` is the client-polling half of M0 (38 §4.2): pull every event after the last
 * seen sequence number, in serial order, and fold them into the caller's mirror. **G48** locks the
 * CLI half — that the pod CLI constructs a `KVPodCoordinator`, applies through it, and polls through
 * it. This module is the web half, and the law it must not break is the same one: every mutating
 * action and every read goes through the `PodTransport` contract (`apply` + `snapshot` +
 * `pollEvents`), which puts the serial `applyEvent` discipline and the `payloadIsSafe` privacy wall
 * (L1, 38 §4.3) in front of every event. Reading the KV or the mirror file directly would produce a
 * tail that never passed the wall, which is precisely the bypass G48 exists to prevent.
 *
 * Two things follow from that and shape this file:
 *
 *  - **No `fs`.** `PodTransport.ts` imports `fs`/`path` for the CLI's `FileKV` double, and the
 *    browser bundle carries it only as a never-called external. So the browser binds its own
 *    `KVLike` — `localStorage`, one key per KV key, which is what the Cloudflare KV binding is on
 *    the other side of the same contract. The coordinator, the event discipline, the seq numbering
 *    and the privacy wall are the SHARED code; only the storage substrate differs, exactly as the
 *    M0 note in `PodTransport.ts` anticipates ("the app binds Cloudflare KV … while the local double
 *    stands in for the CLI and tests").
 *  - **"No pod configured" is a real state, not a zero.** A player who has never formed a pod has no
 *    `pod/<id>/state` key at all. Reporting that as "0 events, pod healthy" would be a number
 *    reading as real data (the failure mode the pack route must also avoid), so the status union
 *    below is explicit: `unformed` | `configured`, and the unformed branch explains what to do.
 *
 * The caller's mirror (`lastSeenSeq`, the player's own id) is the ONLY thing kept outside the
 * coordinator, exactly as the CLI keeps it outside the KV. The coordinator owns the pod's history
 * (L5: the pod object is the single writer); the mirror owns what this client has already read.
 */

import {
  KVPodCoordinator,
  type KVLike,
  type PodApplyResult,
  type PodTransport,
} from '$infra/pods/PodTransport.js';
import {
  quorumMet,
  POD_MAX_MEMBERS,
  POD_MIN_MEMBERS,
  type PodState,
  type SerializedEvent,
} from '$core/pods/podStateMachine.js';

/** localStorage-backed `KVLike` — the browser's binding of the M0 contract (Cloudflare KV on deploy). */
export class BrowserPodKV implements KVLike {
  constructor(private readonly ns = 'mysterium:pod-kv:') {}

  async get(key: string): Promise<string | null> {
    try { return globalThis.localStorage?.getItem(this.ns + key) ?? null; } catch { return null; }
  }

  async put(key: string, value: string): Promise<void> {
    try { globalThis.localStorage?.setItem(this.ns + key, value); } catch { /* quota — degrade, as LocalStorageStore does */ }
  }

  async list(prefix: string): Promise<readonly string[]> {
    try {
      const ls = globalThis.localStorage;
      if (!ls) return [];
      const out: string[] = [];
      for (let i = 0; i < ls.length; i++) {
        const full = ls.key(i);
        if (full?.startsWith(this.ns)) {
          const rest = full.slice(this.ns.length);
          if (rest.startsWith(prefix)) out.push(rest);
        }
      }
      // `KVPodCoordinator.currentSeq` takes the LAST key of a sorted list as the head of the log, so
      // the order here is load-bearing, not cosmetic. Zero-padded 8-digit keys sort correctly.
      return out.sort();
    } catch { return []; }
  }
}

// ── The caller's mirror (outside the coordinator, exactly as the CLI keeps it) ─────────────────

export interface PodMirror {
  /** The pod this client belongs to; null = never formed / never joined. */
  readonly podId: string | null;
  /** This client's player id — the id the pod's members are recorded under. */
  readonly playerId: string;
  /** The last sequence number this client has folded in. `pollEvents` returns everything after it. */
  readonly lastSeenSeq: number;
}

const MIRROR_KEY = 'pod-mirror:v1';

export const UNFORMED_MIRROR: PodMirror = Object.freeze({ podId: null, playerId: 'local-player', lastSeenSeq: 0 });

export function loadPodMirror(): PodMirror {
  try {
    const raw = globalThis.localStorage?.getItem(MIRROR_KEY);
    if (!raw) return UNFORMED_MIRROR;
    const parsed = JSON.parse(raw) as Partial<PodMirror>;
    // Fail closed on a malformed mirror rather than coercing: a bad `podId` here would make the
    // coordinator read a pod that does not exist and the page would claim a membership it lacks.
    if (typeof parsed.playerId !== 'string' || parsed.playerId.length === 0) return UNFORMED_MIRROR;
    const podId = typeof parsed.podId === 'string' && parsed.podId.length > 0 ? parsed.podId : null;
    const lastSeenSeq = typeof parsed.lastSeenSeq === 'number' && Number.isFinite(parsed.lastSeenSeq) && parsed.lastSeenSeq >= 0
      ? Math.floor(parsed.lastSeenSeq)
      : 0;
    return { podId, playerId: parsed.playerId, lastSeenSeq };
  } catch {
    return UNFORMED_MIRROR;
  }
}

export function savePodMirror(mirror: PodMirror): void {
  try { globalThis.localStorage?.setItem(MIRROR_KEY, JSON.stringify(mirror)); } catch { /* degrade */ }
}

// ── Status — the honest union, never a zero that reads as data ───────────────────────────────

export type PodStatus =
  | {
      readonly kind: 'unformed';
      /** Why the page cannot show a tail, in one sentence the player can act on. */
      readonly reason: string;
    }
  | {
      readonly kind: 'configured';
      readonly podId: string;
      readonly covenant: string;
      readonly memberCount: number;
      /** L2 membership bounds: 3–9. Below the floor, a ritual cannot open — say so here, not later. */
      readonly quorumMet: boolean;
      readonly minMembers: number;
      readonly maxMembers: number;
      readonly isFounder: boolean;
      readonly ritual: { readonly mode: string; readonly state: string } | null;
      readonly recognitions: number;
      /** Events this client has already folded in. */
      readonly lastSeenSeq: number;
    };

/** The snapshot, read THROUGH the transport (`snapshot()`), never off the KV. */
export async function readPodStatus(transport: PodTransport, mirror: PodMirror): Promise<PodStatus> {
  const state: PodState = await transport.snapshot();
  if (!state.pod) {
    return {
      kind: 'unformed',
      reason: 'no pod is configured on this device — the cohort weave holds nothing for you yet, so there is no event tail to show',
    };
  }
  const isFounder = state.pod.members[0]?.playerId === mirror.playerId;
  return {
    kind: 'configured',
    podId: state.pod.id,
    covenant: state.pod.covenant,
    memberCount: state.pod.members.length,
    quorumMet: quorumMet(state),
    minMembers: POD_MIN_MEMBERS,
    maxMembers: POD_MAX_MEMBERS,
    isFounder,
    ritual: state.ritual ? { mode: state.ritual.mode, state: state.ritual.state } : null,
    recognitions: state.recognitions.length,
    lastSeenSeq: mirror.lastSeenSeq,
  };
}

// ── Sync — the client-polling half, byte-for-byte the CLI's contract ─────────────────────────

export interface PodSyncResult {
  /** Events returned by `pollEvents(lastSeenSeq)`, in serial order. */
  readonly events: readonly SerializedEvent[];
  /** The sequence number this client has now folded in. */
  readonly lastSeenSeq: number;
  /** Status AFTER the poll, re-read through the transport so the UI never shows a stale pod. */
  readonly status: PodStatus;
}

/**
 * Poll the tail and advance the mirror.
 *
 * `mysterium pod sync` computes `lastSeenSeq = since + events.length` and stores it; this does the
 * same arithmetic because the coordinator's `pollEvents` returns a CONTIGUOUS tail (the event keys
 * are written once, monotonically, and an idempotent no-op never enters the log). Deriving the new
 * seq from the last event's own position rather than the count would be more defensive, but it
 * would also disagree with the CLI about what "the same tail" means — the two clients share one
 * coordinator, so they must share the cursor rule too.
 *
 * The parameter is the concrete `KVPodCoordinator`, not the base `PodTransport`, and that is
 * deliberate: `pollEvents(sinceSeq)` is the M0 client-polling half and it is deliberately NOT on
 * the `PodTransport` interface, because `remotePodTransport` (the M1 Durable Object stub) has no
 * cursor to offer — the DO serializes requests itself and never asks "what have I read yet".
 * Typing the polling function against the family that cannot poll would hide the M0/M1 boundary;
 * typing it against the coordinator that can is the honest signature.
 */
export async function syncPod(transport: KVPodCoordinator, mirror: PodMirror): Promise<PodSyncResult> {
  const events = await transport.pollEvents(mirror.lastSeenSeq);
  const lastSeenSeq = mirror.lastSeenSeq + events.length;
  const status = await readPodStatus(transport, { ...mirror, lastSeenSeq });
  return { events, lastSeenSeq, status };
}

// ── Formation — the one mutating path, and it goes through `apply` ───────────────────────────

export interface PodMutationResult {
  readonly ok: boolean;
  /** The transport's own refusal reason (privacy wall, quorum, membership bounds). Always present when !ok. */
  readonly reason: string | null;
  readonly status: PodStatus;
}

/**
 * Form a pod on this device.
 *
 * Deliberately narrow: forming is the ONLY mutating action this surface offers, because it is the
 * only one a single browser can complete honestly. `join` needs a pod that exists on ANOTHER
 * machine, `publish`/`recognize` need other members, and the ritual lifecycle needs a quorum —
 * offering buttons for them here would produce refusals dressed as a broken page. Those live in the
 * CLI, where a founder and their members share one machine's file store.
 *
 * `payloadIsSafe` runs inside `apply` before anything is written (L1), so the formation payload is
 * checked by the wall rather than by this function trusting itself.
 */
export async function formPod(
  transport: PodTransport,
  mirror: PodMirror,
  podId: string,
  covenant: string,
  nowMs: number,
): Promise<PodMutationResult> {
  const trimmedId = podId.trim();
  if (trimmedId.length === 0) {
    return {
      ok: false,
      reason: 'a pod needs an id before it can be formed',
      status: { kind: 'unformed', reason: 'no pod is configured on this device' },
    };
  }
  const result: PodApplyResult = await transport.apply({
    type: 'form',
    payload: { id: trimmedId, covenant, createdAtMs: nowMs, founderId: mirror.playerId },
    occurredAtMs: nowMs,
  });
  if (!result.ok) {
    return { ok: false, reason: result.reason ?? 'the pod event was refused', status: await readPodStatus(transport, mirror) };
  }
  // A fresh pod is a fresh log: this client has read none of it, so the cursor resets to 0 rather
  // than carrying a seq from a pod it was never a member of.
  const formed: PodMirror = { podId: trimmedId, playerId: mirror.playerId, lastSeenSeq: 0 };
  savePodMirror(formed);
  return { ok: true, reason: null, status: await readPodStatus(transport, formed) };
}

/**
 * The coordinator a mirror reads and writes through.
 *
 * A mirror with no pod coordinates to the `unformed` bucket — its own namespace, so it can never
 * surface another pod's history, and its log is always empty. Exported because the DI seam matters
 * here: the route's tests must be able to bind a different `KVLike` than the browser's localStorage.
 */
export function coordinatorForMirror(kv: KVLike, mirror: PodMirror): KVPodCoordinator {
  return new KVPodCoordinator(kv, mirror.podId ?? 'unformed');
}

