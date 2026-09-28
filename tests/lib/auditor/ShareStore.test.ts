/**
 * @vitest-environment jsdom
 *
 * The share store — 16 §2.4.1, MY-AD-0034, 33 §7.
 *
 * The regression this file exists for: `AuditorSurface` read `void liveShares` — the VARIABLE,
 * not its value — so the effect never subscribed, a revoked grant never re-ran the projection,
 * and an open auditor page kept rendering a share the player had already revoked. The live
 * revocation test below is the one that would have caught it.
 *
 * The store reads localStorage, so each test gets a clean key and a fresh module.
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { get } from 'svelte/store';
import { sanitizeRecords } from '../../../src/lib/stores/shareStore.js';
import { ensureLocalStorage } from '../../helpers/localStorageMock.js';

async function freshStore() {
  vi.resetModules();
  return await import('../../../src/lib/stores/shareStore.js');
}

beforeEach(() => {
  // jsdom may not provide a WORKING localStorage, and Node ≥22 exposes one that throws — which
  // the store's try/catch would swallow into a silent empty state, making every test here pass
  // for the wrong reason. ensureLocalStorage is what stops that.
  ensureLocalStorage();
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

describe('the share store', () => {
  it('issues a share and publishes it as live', async () => {
    const { issueShare, liveShares } = await freshStore();
    const out = issueShare(['L1', 'L2']);
    expect(out.grantId).toBeTruthy();
    expect(get(liveShares).map((s) => s.grantId)).toContain(out.grantId);
  });

  it('drops a revoked share from the live set immediately', async () => {
    const { issueShare, revoke, liveShares } = await freshStore();
    const { grantId } = issueShare(['L1', 'L2']);
    expect(get(liveShares)).toHaveLength(1);

    revoke(grantId!);
    expect(get(liveShares)).toHaveLength(0);
  });

  it('notifies a subscriber the moment a grant is revoked', async () => {
    // The regression itself: a page that has SUBSCRIBED must re-derive. A store that only
    // updates its own value without notifying leaves every open view showing stale consent.
    const { issueShare, revoke, liveShares } = await freshStore();
    const seen: number[] = [];
    const stop = liveShares.subscribe((v) => seen.push(v.length));
    issueShare(['L1', 'L2']);
    revoke(get(liveShares)[0]!.grantId);
    stop();
    expect(seen[seen.length - 1]).toBe(0);
  });

  it('revoking an unknown grant is a no-op, not a wipe', async () => {
    const { issueShare, revoke, liveShares } = await freshStore();
    issueShare(['L1', 'L2']);
    expect(revoke('not-a-grant')).toBe(false);
    expect(get(liveShares)).toHaveLength(1);
  });

  it('refuses a gapped scope run and issues nothing', async () => {
    const { issueShare, liveShares } = await freshStore();
    const out = issueShare(['L1', 'L3'] as never);
    expect(out.grantId).toBeUndefined();
    expect(out.reason).toBeTruthy();
    expect(get(liveShares)).toHaveLength(0);
  });

  it('drops a gapped scope run that skipped creation', async () => {
    // A hand-edited store: the run L1,L3 is not a grant, and the scope selection IS the security
    // interface, so it is dropped at read time as well as refused at render.
    expect(sanitizeRecords([{ grantId: 'forged', scopes: ['L1', 'L3'], revoked: false, createdAtMs: 0 }])).toEqual([]);
  });

  it('drops a run that smuggles L0 — the player\'s own felt-sense surface', async () => {
    expect(sanitizeRecords([{ grantId: 'l0', scopes: ['L0', 'L1'], revoked: false, createdAtMs: 0 }])).toEqual([]);
  });

  it('drops a record with an unknown scope level', async () => {
    expect(sanitizeRecords([{ grantId: 'junk', scopes: ['L9', 'L1'], revoked: false, createdAtMs: 0 }])).toEqual([]);
  });

  it('keeps a well-formed grant, revoked or not', async () => {
    const good = sanitizeRecords([{ grantId: 'g1', scopes: ['L1', 'L2'], revoked: false, createdAtMs: 5 }]);
    expect(good).toHaveLength(1);
    expect(good[0]).toMatchObject({ grantId: 'g1', scopes: ['L1', 'L2'], revoked: false });
    // A revoked record is a real record; only `liveShares` filters it. Dropping revoked records at
    // read time would make an audit of "what was ever issued" impossible.
    expect(sanitizeRecords([{ grantId: 'g2', scopes: ['L1'], revoked: true, createdAtMs: 5 }])).toHaveLength(1);
  });

  it('ignores a non-array payload rather than spreading it', async () => {
    expect(sanitizeRecords({ grantId: 'not-an-array' })).toEqual([]);
    expect(sanitizeRecords('a string')).toEqual([]);
    expect(sanitizeRecords(null)).toEqual([]);
    expect(sanitizeRecords(undefined)).toEqual([]);
  });

  it('ignores a corrupt payload without throwing', async () => {
    // `readStore` catches this, but the filter is the thing that must never throw, because a
    // throw here would take down the surface rather than just hide the grant.
    expect(() => sanitizeRecords([null, 7, 'x', {}, { grantId: '' }])).not.toThrow();
    expect(sanitizeRecords([null, 7, 'x', {}, { grantId: '' }])).toEqual([]);
  });

  it('drops a record whose revoked flag is missing or non-boolean', async () => {
    // A record that cannot answer "is this revoked?" must not be treated as live by default —
    // that is the failure mode where a malformed record becomes an open grant.
    expect(sanitizeRecords([{ grantId: 'x', scopes: ['L1'] }])).toEqual([]);
    expect(sanitizeRecords([{ grantId: 'x', scopes: ['L1'], revoked: 'yes' }])).toEqual([]);
  });

  it('is inert outside a browser — the read path is localStorage-only by design', async () => {
    // The vitest `$app/environment` stub is permanently browser: false, so the read path cannot
    // run here. That is why the filter above is tested PURE rather than through storage: a test
    // of `readStore` in this file would only ever observe the empty branch and would certify
    // nothing. This test names that fact so the next reader does not add one.
    const { get } = await import('svelte/store');
    const { liveShares } = await freshStore();
    expect(get(liveShares)).toEqual([]);
  });
});
