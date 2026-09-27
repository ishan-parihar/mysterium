/**
 * Phase 17 d4 — pod transport M0 is real (38 §4.2: KV + client polling,
 * last-write-wins on monotonic events, mirrored mode only).
 *
 * The KV adapter family (KVLike/InMemoryKV/FileKV/KVPodCoordinator) feeds the SAME serial
 * event discipline (applyEvent) behind the PodTransport contract; the pod CLI routes every
 * mutating action through it, and `mysterium pod sync` is the client-polling half. These
 * tests pin the behaviour the transport must produce:
 *
 *   M0-1 KV round-trip: events apply through the KV coordinator and a SECOND coordinator
 *        instance over the same KV sees the identical snapshot (persistence parity);
 *   M0-2 the privacy wall runs BEFORE any write — an unsafe payload never reaches the KV;
 *   M0-3 event keys are monotonic and pollEvents(sinceSeq) returns exactly the new tail,
 *        in serial order (the client-polling contract);
 *   M0-4 the FileKV double round-trips across process-shaped instances (the CLI's store);
 *   M0-5 idempotent no-ops (re-join) do not enter the replay log — at-least-once
 *        redelivery safety holds through the KV path.
 */
import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { InMemoryKV, FileKV, KVPodCoordinator } from '../../src/infra/pods/PodTransport.js';
import { emptyPodState } from '../../src/core/pods/podStateMachine.js';

const NOW = 1790000000000;
const ev = (type: 'form' | 'join' | 'ritual-start' | 'ritual-advance' | 'publish' | 'recognize', payload: Record<string, unknown>, occurredAtMs = NOW) =>
  ({ type, payload, occurredAtMs }) as const;

describe('pod transport M0 (38 §4.2)', () => {
  const tmps: string[] = [];
  afterEach(() => { for (const t of tmps) fs.rmSync(t, { force: true }); tmps.length = 0; });

  it('M0-1: events apply through the KV coordinator; a second instance sees the same snapshot', async () => {
    const kv = new InMemoryKV();
    const a = new KVPodCoordinator(kv, 'pod-a');
    const formed = await a.apply(ev('form', { id: 'pod-a', covenant: 'we practice together', createdAtMs: NOW, founderId: 'p1' }));
    expect(formed.ok).toBe(true);
    const joined = await a.apply(ev('join', { playerId: 'p2' }, NOW + 1));
    expect(joined.ok).toBe(true);
    const second = new KVPodCoordinator(kv, 'pod-a');
    const snap = await second.snapshot();
    expect(snap.pod?.id).toBe('pod-a');
    expect(snap.pod?.members.map((m) => m.playerId)).toContain('p2');
    expect((await second.events()).map((e) => e.type)).toEqual(['form', 'join']);
  });

  it('M0-2: the privacy wall refuses before any write — the KV never sees the payload', async () => {
    const kv = new InMemoryKV();
    const co = new KVPodCoordinator(kv, 'pod-b');
    const r = await co.apply(ev('form', { id: 'pod-b', shadowLedger: { darkAllergy: 0.9 }, createdAtMs: NOW }));
    expect(r.ok).toBe(false);
    expect(r.reason).toContain('privacy wall');
    expect(await kv.list('pod/pod-b/')).toEqual([]); // nothing written — not even the state key
  });

  it('M0-3: event keys are monotonic; pollEvents returns exactly the new tail in order', async () => {
    const kv = new InMemoryKV();
    const co = new KVPodCoordinator(kv, 'pod-c');
    await co.apply(ev('form', { id: 'pod-c', covenant: 'c', createdAtMs: NOW, founderId: 'p1' }));
    await co.apply(ev('join', { playerId: 'p2' }, NOW + 1));
    await co.apply(ev('join', { playerId: 'p3' }, NOW + 2));
    const keys = await kv.list('pod/pod-c/events/');
    expect(keys).toEqual(['pod/pod-c/events/00000001', 'pod/pod-c/events/00000002', 'pod/pod-c/events/00000003']);
    const tail = await co.pollEvents(1);
    expect(tail.map((e) => e.type)).toEqual(['join', 'join']); // exactly the new events, serial order
    expect((await co.pollEvents(3)).length).toBe(0);
  });

  it('M0-4: the FileKV double round-trips across instances (the CLI store)', async () => {
    const file = path.join(os.tmpdir(), `mys-pod-kv-${Date.now()}.json`);
    tmps.push(file);
    const first = new KVPodCoordinator(new FileKV(file), 'pod-d');
    await first.apply(ev('form', { id: 'pod-d', covenant: 'd', createdAtMs: NOW, founderId: 'p1' }));
    const second = new KVPodCoordinator(new FileKV(file), 'pod-d');
    expect((await second.snapshot()).pod?.id).toBe('pod-d');
    expect((await second.events()).length).toBe(1);
  });

  it('M0-5: idempotent re-join does not enter the replay log', async () => {
    const co = new KVPodCoordinator(new InMemoryKV(), 'pod-e');
    await co.apply(ev('form', { id: 'pod-e', covenant: 'e', createdAtMs: NOW, founderId: 'p1' }));
    const again = await co.apply(ev('join', { playerId: 'p1' }, NOW + 1));
    expect(again.ok).toBe(true);
    expect(again.seq).toBe(1); // no second event
    expect((await co.events()).map((e) => e.type)).toEqual(['form']);
    expect((await co.snapshot()).pod?.members.length).toBe(1);
  });

  it('M0-6: restore() seeds a fresh KV from a pre-M0 state (the legacy pods.json migration)', async () => {
    const kv = new InMemoryKV();
    const co = new KVPodCoordinator(kv, 'pod-f');
    const legacy = emptyPodState();
    const withPod = { ...legacy, pod: { id: 'pod-f', covenant: 'legacy', members: [{ playerId: 'p1', roles: ['founder'], joinedAtMs: NOW }], createdAtMs: NOW } };
    co.restore(withPod);
    expect((await co.snapshot()).pod?.id).toBe('pod-f');
    const next = new KVPodCoordinator(kv, 'pod-f');
    const joined = await next.apply(ev('join', { playerId: 'p2' }));
    expect(joined.ok).toBe(true);
    expect(joined.seq).toBe(1); // the restored history counts: first NEW event is seq 1
  });
});
