/**
 * BFF-wide agent runtime registry.
 *
 * Per SESSION, not per process. This used to be a single module-global `DirectorAgent`, and both
 * callers discarded the session id they had already parsed (`probe/+server.ts:28` literally read
 * `void sessionId; // reserved for per-session routing later`). The consequence on a multi-player
 * deployment is not subtle: every browser session shared ONE director, so the first player to
 * calibrate completed calibration for everyone, and their probe state was overwritten by whoever
 * arrived next. It is worse than a cross-session leak on a long-lived process, because the state was
 * never reset — it persisted until the isolate recycled, which is not something code controls.
 *
 * Keyed by session id, and bounded: an unbounded map is a memory leak on a public endpoint, and the
 * bound is a LRU rather than "oldest wins" so a player who is mid-session is never evicted by traffic
 * from someone else. `''` is a legitimate key — a caller with no session still needs a director, and
 * collapsing it to a shared one would reintroduce the original bug.
 */

import { EventBus } from '../../core/events/EventBus.js';
import { DirectorAgent } from '../../core/agent/DirectorAgent.js';
import { AgentRuntime } from '../../core/agent/AgentRuntime.js';

interface RuntimeHandle {
  readonly bus: EventBus;
  readonly director: DirectorAgent;
  readonly runtime: AgentRuntime;
}

/**
 * How many sessions stay warm. A player returning to a tab within this window keeps their director —
 * which is the point, since rebuilding it would discard calibration progress. Beyond it, the least
 * recently used is disposed, so a burst of one-shot sessions cannot grow the map without bound.
 */
const MAX_LIVE_SESSIONS = 64;

const handles = new Map<string, RuntimeHandle>();

function create(): RuntimeHandle {
  const bus = new EventBus();
  const director = new DirectorAgent();
  const runtime = new AgentRuntime(bus, director);
  runtime.start();
  return { bus, director, runtime };
}

export function getOrCreateAgentRuntime(sessionId = ''): RuntimeHandle {
  const existing = handles.get(sessionId);
  if (existing) {
    // Re-insert to mark most-recently-used; Map preserves insertion order, so delete+set is the LRU
    // move. A plain `get` would leave the key in its original position and make the eviction below
    // pick a session that is still in use.
    handles.delete(sessionId);
    handles.set(sessionId, existing);
    return existing;
  }

  if (handles.size >= MAX_LIVE_SESSIONS) {
    const oldest = handles.keys().next();
    if (!oldest.done) {
      handles.get(oldest.value)?.runtime.dispose();
      handles.delete(oldest.value);
    }
  }

  const fresh = create();
  handles.set(sessionId, fresh);
  return fresh;
}

export function isAgentRuntimeStarted(sessionId = ''): boolean {
  return handles.get(sessionId)?.runtime.isRunning() ?? false;
}

export function disposeAgentRuntime(sessionId?: string): void {
  if (sessionId === undefined) {
    for (const h of handles.values()) h.runtime.dispose();
    handles.clear();
    return;
  }
  handles.get(sessionId)?.runtime.dispose();
  handles.delete(sessionId);
}

/** Live session count — for tests and for a diagnostic, never for gameplay. */
export function liveAgentSessionCount(): number {
  return handles.size;
}
