/**
 * PodTransport — the networked coordinator seam for the cohort weave
 * (doc 38 M1, plan §8 item 2). The pod state machine (core/pods) is pure;
 * this module is the transport adapter family that feeds it events IN
 * SERIAL ORDER (38 §4.2 — the pod object is the single writer, L5).
 *
 * Two adapters share one contract:
 *   - InMemoryPodCoordinator: deterministic single-process coordinator —
 *     the test double, the offline fallback, and the M0 KV+poll runtime.
 *   - PodDurableObject: the Cloudflare Durable Object binding. It wraps the
 *     SAME serial applyEvent path behind a fetch-style RPC surface; the DO
 *     runtime guarantees single-instance serialization, which is exactly
 *     the L5 law the pure core requires.
 *
 * Privacy: the transport never inspects payloads — the payloadIsSafe wall
 * in the state machine is the only gate (G18), and both adapters feed it.
 */

import {
  applyEvent, emptyPodState, payloadIsSafe,
  type PodState, type SerializedEvent,
} from '../../core/pods/podStateMachine.js';

// ---------------------------------------------------------------------------
// Transport contract
// ---------------------------------------------------------------------------

export interface PodApplyResult {
  readonly ok: boolean;
  readonly reason?: string;
  readonly seq: number;
}

export interface PodTransport {
  /** Apply one event in serial order; returns the new sequence number. */
  apply(event: SerializedEvent): Promise<PodApplyResult>;
  /** Current coordinator-side state (the pod object's authoritative copy). */
  snapshot(): Promise<PodState>;
  /** Restore from persistence (DO storage / KV), replacing in-memory state. */
  restore(state: PodState, events?: readonly SerializedEvent[]): void;
  /** Full event history (the DO's replay log). */
  events(): Promise<readonly SerializedEvent[]>;
}

// ---------------------------------------------------------------------------
// In-memory coordinator (test double + offline/M0 runtime)
// ---------------------------------------------------------------------------

export class InMemoryPodCoordinator implements PodTransport {
  private state: PodState;
  private log: SerializedEvent[];

  constructor(initial?: { state: PodState; events?: readonly SerializedEvent[] }) {
    this.state = initial?.state ?? emptyPodState();
    this.log = [...(initial?.events ?? [])];
  }

  async apply(event: SerializedEvent): Promise<PodApplyResult> {
    // Privacy wall runs BEFORE the state machine for defense in depth: the
    // coordinator refuses to even queue payloads carrying psych state.
    if (!payloadIsSafe(event.payload)) {
      return { ok: false, reason: 'payload violates the privacy wall', seq: this.log.length };
    }
    const applied = applyEvent(this.state, event);
    if (!applied.ok) {
      return { ok: false, reason: applied.reason, seq: this.log.length };
    }
    this.state = applied.state;
    // Idempotent no-ops (mutated: false) must not enter the replay log —
    // at-least-once redelivery would otherwise inflate the history.
    if (applied.mutated !== false) this.log.push(event);
    return { ok: true, seq: this.log.length };
  }

  async snapshot(): Promise<PodState> {
    return this.state;
  }

  restore(state: PodState, events?: readonly SerializedEvent[]): void {
    this.state = state;
    this.log = [...(events ?? [])];
  }

  async events(): Promise<readonly SerializedEvent[]> {
    return this.log;
  }
}

// ---------------------------------------------------------------------------
// Cloudflare Durable Object binding (M1)
// ---------------------------------------------------------------------------

/**
 * The DO request/response envelope. Deliberately JSON-only: the DO runtime
 * serializes it over the network, and every field must survive round-trip
 * (bigint-free payloads are a G18 payload rule anyway).
 */
export interface PodRpcRequest {
  readonly kind: 'apply' | 'snapshot' | 'events';
  readonly event?: SerializedEvent;
}

export interface PodRpcResponse {
  readonly kind: 'applied' | 'state' | 'history' | 'error';
  readonly result?: PodApplyResult;
  readonly state?: PodState;
  readonly events?: readonly SerializedEvent[];
  readonly error?: string;
}

/**
 * PodDurableObject — drop-in Durable Object class (Cloudflare Workers
 * `export { PodDurableObject }`). The runtime constructs one instance per
 * pod id and serializes its requests, which IS the L5 single-writer law;
 * this class only wires that serialization into applyEvent and a replay log.
 *
 * In production, `fetch(request)` carries a JSON PodRpcRequest; tests (and
 * the local CLI) call `handleRpc` directly, bypassing the HTTP layer while
 * exercising the identical code path.
 */
export class PodDurableObject {
  private transport: InMemoryPodCoordinator;

  constructor(initial?: { state: PodState; events?: readonly SerializedEvent[] }) {
    this.transport = new InMemoryPodCoordinator(initial);
  }

  async handleRpc(req: PodRpcRequest): Promise<PodRpcResponse> {
    switch (req.kind) {
      case 'apply': {
        if (!req.event) return { kind: 'error', error: 'apply requires an event' };
        const result = await this.transport.apply(req.event);
        return result.ok ? { kind: 'applied', result } : { kind: 'error', error: result.reason, result };
      }
      case 'snapshot':
        return { kind: 'state', state: await this.transport.snapshot() };
      case 'events':
        return { kind: 'history', events: await this.transport.events() };
      default:
        return { kind: 'error', error: `unknown rpc kind '${(req as { kind?: string }).kind}'` };
    }
  }

  /** Cloudflare DO fetch surface — thin JSON shell over handleRpc. */
  async fetch(request: { json: () => Promise<unknown> }): Promise<{ status: number; body: PodRpcResponse }> {
    try {
      const req = (await request.json()) as PodRpcRequest;
      const body = await this.handleRpc(req);
      return { status: body.kind === 'error' ? 400 : 200, body };
    } catch (e) {
      return { status: 400, body: { kind: 'error', error: e instanceof Error ? e.message : String(e) } };
    }
  }

  /** Persistence hook: the DO runtime's storage.sync() replays this log. */
  async replayLog(): Promise<readonly SerializedEvent[]> {
    return this.transport.events();
  }

  async snapshot(): Promise<PodState> {
    return this.transport.snapshot();
  }
}

/**
 * Client-side stub speaking to a remote PodDurableObject through any
 * JSON-over-HTTP binding (workers RPC, fetch, or a test double). Satisfies
 * PodTransport so core callers never see the network.
 */
export function remotePodTransport(
  send: (req: PodRpcRequest) => Promise<PodRpcResponse>,
): PodTransport {
  return {
    apply: async (event: SerializedEvent): Promise<PodApplyResult> => {
      const res = await send({ kind: 'apply', event });
      if (res.kind !== 'applied' || !res.result) {
        throw new Error(res.error ?? 'pod apply failed');
      }
      return res.result;
    },
    snapshot: async (): Promise<PodState> => {
      const res = await send({ kind: 'snapshot' });
      if (!res.state) throw new Error(res.error ?? 'pod snapshot failed');
      return res.state;
    },
    restore(): void {
      throw new Error('restore is a server-side operation on the DO, not the client stub');
    },
    events: async (): Promise<readonly SerializedEvent[]> => {
      const res = await send({ kind: 'events' });
      if (!res.events) throw new Error(res.error ?? 'pod history failed');
      return res.events;
    },
  };
}
