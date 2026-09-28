// @vitest-environment jsdom
/**
 * `/pod` — the sync surface, and the transport seam it is not allowed to walk around.
 *
 * **G48** locks the CLI half of the M0 seam: the pod CLI constructs a `KVPodCoordinator`, applies
 * through it, and polls through it. The web half has the same obligation, and the interesting
 * property is not "the page shows a tail" — it is that the tail can only have come through
 * `applyEvent` + `payloadIsSafe`. So these tests drive the real browser KV binding and the real
 * coordinator, and check the properties that distinguish a seam-respecting surface from one that
 * reads the store directly:
 *
 *   POD-1 `BrowserPodKV` really is a `KVLike`: get/put/list behave, and `list` returns SORTED keys
 *        (the coordinator derives the log head from the last key, so an unsorted list would make
 *        `currentSeq` return a wrong sequence number and `pollEvents` lose events).
 *   POD-2 a device with no pod reads `unformed` — not a healthy pod with an empty tail.
 *   POD-3 forming goes through `apply`: the event lands in the log, the snapshot has the pod, the
 *        mirror's cursor resets to 0, and a one-member pod is NOT reported as having quorum.
 *   POD-4 **the privacy wall binds the web surface too.** A payload carrying psych state is refused
 *        by `apply` with the wall's own reason, and nothing is written. This is the test that fails
 *        if someone swaps `apply` for a direct KV write.
 *   POD-5 sync is the client-polling contract: `pollEvents(lastSeenSeq)` returns only the new tail,
 *        in serial order, and the cursor advances by exactly that tail — the CLI's arithmetic.
 *   POD-6 re-syncing returns nothing new (the cursor is honoured), and a fresh client at 0 still
 *        sees the whole log — the opposite failure, a cursor that advances without the log behind
 *        it, would show an empty tail forever.
 *   POD-7 a formation refusal keeps the transport's reason rather than a generic failure.
 *   POD-8 a malformed mirror fails CLOSED: a pod id that is not a string must not become a
 *        membership the player does not have.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  BrowserPodKV,
  coordinatorForMirror,
  formPod,
  loadPodMirror,
  readPodStatus,
  savePodMirror,
  syncPod,
  UNFORMED_MIRROR,
} from '../../src/lib/pods/podSync.js';
import { describeEvent } from '../../src/lib/pods/podEventNames.js';
import { InMemoryKV, KVPodCoordinator } from '../../src/infra/pods/PodTransport.js';
import { emptyPodState, type SerializedEvent } from '../../src/core/pods/podStateMachine.js';
import { ensureLocalStorage } from '../helpers/localStorageMock.js';

const NOW = 1_790_000_000_000;

describe('/pod — sync surface over the M0 transport', () => {
  beforeEach(() => {
    ensureLocalStorage();
    localStorage.clear();
  });

  it('POD-1: BrowserPodKV is a working KVLike, and list() is sorted', async () => {
    const kv = new BrowserPodKV('t1:');
    await kv.put('pod/p/events/00000010', 'b');
    await kv.put('pod/p/events/00000002', 'a');
    await kv.put('pod/p/events/00000009', 'c');
    await kv.put('other/x', 'ignored');
    // Sorted because `KVPodCoordinator.currentSeq` takes the LAST key as the log head; an
    // unsorted list would make the coordinator derive sequence 2 from a 10-event log.
    expect(await kv.list('pod/p/events/')).toEqual([
      'pod/p/events/00000002',
      'pod/p/events/00000009',
      'pod/p/events/00000010',
    ]);
    expect(await kv.get('pod/p/events/00000002')).toBe('a');
    expect(await kv.get('missing')).toBeNull();
  });

  it('POD-2: a device with no pod reads unformed, not a healthy pod with an empty tail', async () => {
    const status = await readPodStatus(new KVPodCoordinator(new BrowserPodKV(), 'p'), UNFORMED_MIRROR);
    expect(status.kind).toBe('unformed');
    // The reason must be actionable prose, not an empty string a UI would render as a blank card.
    if (status.kind === 'unformed') {
      expect(status.reason).toMatch(/no pod/i);
      expect(status.reason.length).toBeGreaterThan(20);
    }
  });

  it('POD-3: forming goes through apply — the event is in the log and the snapshot has the pod', async () => {
    const kv = new BrowserPodKV();
    const transport = new KVPodCoordinator(kv, 'p');
    const r = await formPod(transport, UNFORMED_MIRROR, 'pod-alpha', 'we practise together', NOW);
    expect(r.ok).toBe(true);
    expect(r.reason).toBeNull();
    expect(r.status.kind).toBe('configured');
    if (r.status.kind === 'configured') {
      expect(r.status.podId).toBe('pod-alpha');
      expect(r.status.memberCount).toBe(1);
      // A one-member pod has NOT met the 3-member quorum: reporting it as met would be a zero
      // that reads as readiness.
      expect(r.status.quorumMet).toBe(false);
      expect(r.status.minMembers).toBe(3);
      expect(r.status.isFounder).toBe(true);
    }
    const events = await transport.pollEvents(0);
    expect(events.map((e) => e.type)).toEqual(['form']);
    // The mirror reset to 0: a fresh pod's log is unread by this client, so a carried-over
    // sequence number from another pod would skip the beginning of this one.
    expect(loadPodMirror()).toEqual({ podId: 'pod-alpha', playerId: 'local-player', lastSeenSeq: 0 });
  });

  it('POD-4: the privacy wall refuses a psych payload on the web path and writes nothing', async () => {
    const kv = new BrowserPodKV();
    const transport = new KVPodCoordinator(kv, 'p');
    const before = await kv.list('pod/p/');
    // theta/skills are what `payloadIsSafe` (L1, 38 §4.3) exists to keep out of a pod log.
    const res = await transport.apply({
      type: 'publish',
      payload: { evidenceRef: 'pub-1', aggregate: { theta: 0.9, cci: 0.7 } },
      occurredAtMs: NOW,
    });
    expect(res.ok).toBe(false);
    expect(res.reason).toMatch(/privacy wall/i);
    // Nothing was written: the wall runs BEFORE any put, so a KV write after the apply would
    // show up here as a new key.
    expect(await kv.list('pod/p/')).toEqual(before);
    expect(await transport.snapshot()).toEqual(emptyPodState());
  });

  it('POD-5: sync returns only the new tail, in serial order, and advances the cursor by it', async () => {
    const kv = new BrowserPodKV();
    const transport = new KVPodCoordinator(kv, 'p');
    const formed = await formPod(transport, UNFORMED_MIRROR, 'pod-sync', 'we practise together', NOW);
    expect(formed.ok).toBe(true);

    // A second member joins through the transport (mirrored mode, two members: still no quorum).
    const joined = await transport.apply({
      type: 'join',
      payload: { playerId: 'other' },
      occurredAtMs: NOW + 1,
    });
    expect(joined.ok).toBe(true);

    const mirror = { podId: 'pod-sync', playerId: 'local-player', lastSeenSeq: 0 };
    const first = await syncPod(transport, mirror);
    expect(first.events.map((e) => e.type)).toEqual(['form', 'join']);
    expect(first.lastSeenSeq).toBe(2);

    // A third event, synced from the advanced cursor: only the NEW one comes back. `recognize` is
    // the one weave event two members can produce without a quorum or an open ritual (L3: the
    // evidence must point at something already published) — a `ritual-advance` here would be
    // REFUSED by `applyEvent` for want of an open ritual, and the test would assert nothing.
    await transport.apply({
      type: 'publish',
      payload: { evidenceRef: 'pub-1', aggregate: { consistency: 0.7, attempts: 9 } },
      occurredAtMs: NOW + 2,
    });
    const second = await syncPod(transport, { ...mirror, lastSeenSeq: first.lastSeenSeq });
    expect(second.events.map((e) => e.type)).toEqual(['publish']);
    expect(second.lastSeenSeq).toBe(3);
  });

  it('POD-4: a state-machine refusal is surfaced, not swallowed into an empty tail', async () => {
    const kv = new BrowserPodKV();
    const transport = new KVPodCoordinator(kv, 'p');
    await formPod(transport, UNFORMED_MIRROR, 'pod-refuse', 'we practise together', NOW);
    // A ritual advance with no open ritual: `applyEvent` refuses, and — critically — the refusal
    // must not advance the sequence. A transport that logged refused events would let a pod's
    // history record things that never happened.
    const refused = await transport.apply({ type: 'ritual-advance', payload: {}, occurredAtMs: NOW + 1 });
    expect(refused.ok).toBe(false);
    expect(refused.reason).toBeTruthy();
    expect(await transport.pollEvents(0)).toHaveLength(1);
  });

  it('POD-6: a second sync repeats nothing; a fresh client still sees the whole log', async () => {
    const kv = new BrowserPodKV();
    const transport = new KVPodCoordinator(kv, 'p');
    await formPod(transport, UNFORMED_MIRROR, 'pod-cursor', 'we practise together', NOW);
    const mirror = { podId: 'pod-cursor', playerId: 'local-player', lastSeenSeq: 0 };
    const first = await syncPod(transport, mirror);
    expect(first.events).toHaveLength(1);
    // Honouring the cursor is what makes at-least-once polling survivable.
    const repeat = await syncPod(transport, { ...mirror, lastSeenSeq: first.lastSeenSeq });
    expect(repeat.events).toHaveLength(0);
    // A client that has read nothing must still see everything — the opposite failure, a cursor
    // that advances without the log behind it, would show an empty tail forever.
    const fresh = await syncPod(transport, mirror);
    expect(fresh.events).toHaveLength(1);
  });

  it('POD-7: an empty pod id is refused with a reason, not silently formed', async () => {
    const transport = new KVPodCoordinator(new BrowserPodKV(), 'p');
    const r = await formPod(transport, UNFORMED_MIRROR, '   ', 'we practise together', NOW);
    expect(r.ok).toBe(false);
    expect(r.reason).toBeTruthy();
    expect(await transport.pollEvents(0)).toHaveLength(0);
  });

  it('POD-8: a malformed mirror fails closed rather than inventing a membership', async () => {
    localStorage.setItem('pod-mirror:v1', JSON.stringify({ playerId: 42, podId: 'pod-x' }));
    // A non-string playerId is not repairable by coercion: the mirror falls back entirely, so the
    // page cannot act as a member of a pod it has no record of joining.
    expect(loadPodMirror()).toEqual(UNFORMED_MIRROR);

    localStorage.setItem('pod-mirror:v1', JSON.stringify({ playerId: 'me', podId: '', lastSeenSeq: -4 }));
    const m = loadPodMirror();
    expect(m.podId).toBeNull();
    expect(m.lastSeenSeq).toBe(0);
  });

  it('POD-2: a mirror with no pod coordinates to the unformed bucket, whose log is empty', async () => {
    const kv = new InMemoryKV();
    const unformed = coordinatorForMirror(kv, UNFORMED_MIRROR);
    // The unformed bucket must not be a way to read another pod's history: it is its own namespace.
    await kv.put('pod/p/formed/events/00000001', JSON.stringify({ type: 'form', payload: {}, occurredAtMs: 1 }));
    expect(await unformed.pollEvents(0)).toHaveLength(0);
  });

  it('every event type the log can carry has a player-facing name', () => {
    // The wire union is the switch subject, so this walks it. An event type with no name would
    // render as a blank line rather than a gap the player could see.
    const every: SerializedEvent['type'][] = [
      'form', 'join', 'ritual-start', 'ritual-advance', 'publish', 'recognize',
    ];
    for (const type of every) {
      expect(describeEvent({ type, payload: {}, occurredAtMs: NOW }).length).toBeGreaterThan(0);
    }
  });

  it('a saved mirror round-trips through storage', () => {
    const mirror = { podId: 'pod-9', playerId: 'me', lastSeenSeq: 7 };
    savePodMirror(mirror);
    expect(loadPodMirror()).toEqual(mirror);
  });

  it('POD-3: the pod path never touches node `fs`/`path`, which the browser stubs to throw', async () => {
    // `PodTransport.ts` imports `fs`/`path` for the CLI's `FileKV` double, so the browser bundle
    // resolves them to `__vite-browser-external` — a module whose property access THROWS. Every
    // other route in this app carries that same external (it is why /journal bundles it too), and
    // the mitigation is that nothing in a browser path reads a property off it. This asserts that
    // directly, by replacing the globals with throwing proxies and running the whole surface: if
    // any of it reached for `fs.existsSync` or `path.join`, this is where it would surface.
    // Typed through one local alias: `globalThis` has no index signature, so reading `globalThis.fs`
    // directly is an implicit `any`. The alias is the cast target, so it is written once here.
    const globals = globalThis as unknown as Record<string, unknown>;
    const real = { fs: globals.fs, path: globals.path };
    const boom = (name: string) =>
      new Proxy({}, { get(_t, prop) { throw new Error(`browser-external ${name}.${String(prop)} touched`); } });
    globals.fs = boom('fs');
    globals.path = boom('path');
    try {
      const transport = coordinatorForMirror(new BrowserPodKV(), UNFORMED_MIRROR);
      const formed = await formPod(transport, UNFORMED_MIRROR, 'pod-browser', 'we practise together', NOW);
      expect(formed.ok).toBe(true);
      const synced = await syncPod(transport, { podId: 'pod-browser', playerId: 'local-player', lastSeenSeq: 0 });
      expect(synced.events).toHaveLength(1);
      expect((await readPodStatus(transport, { podId: 'pod-browser', playerId: 'local-player', lastSeenSeq: 1 })).kind).toBe('configured');
    } finally {
      globals.fs = real.fs;
      globals.path = real.path;
    }
  });
});
