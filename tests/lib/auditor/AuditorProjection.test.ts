/**
 * The auditor projection seam — 33 §7, 16 §2.4.1, MY-AD-0034.
 *
 * G51 asserts the module GRAPH: the seam reaches both halves of the law, and every surface
 * reaches the seam. These assert what the seam DOES, which a graph cannot see — and they are
 * written against the PURE half (`projectWithConsent`) deliberately. With the grant lookup
 * inside the seam, every test would run against an empty store and could only ever observe the
 * refusal path, so a seam that renders nothing and refuses everything would look correct.
 */
import { describe, it, expect } from 'vitest';
import { projectWithConsent } from '../../../src/lib/components/auditor/auditorProjection.js';
import { createShare } from '../../../src/core/domain/shares.js';
import type { ShareRecord } from '../../../src/core/domain/shares.js';
import { createSignificator } from '../../../src/core/domain/Significator.js';
import type { Significator } from '../../../src/core/domain/Significator.js';
import { ALL_LINES } from '../../../src/core/domain/Line.js';
import type { Line } from '../../../src/core/domain/Line.js';

function aSignificator(stage: Significator['currentStage'] = 'Red'): Significator {
  // The REAL factory, not a hand-built object. A partial Significator renders in a browser and
  // then throws inside the payload bridge (`sig.shadows.entries`), which is how four of these
  // tests were passing for the wrong reason before this was fixed.
  const all = (s: Significator['currentStage']) =>
    Object.fromEntries(ALL_LINES.map((l) => [l, s])) as Record<Line, Significator['currentStage']>;
  return createSignificator('sig-test', all('Red'), stage);
}

const grant = (scopes: string[]): ShareRecord => createShare(scopes, Date.now()).share!;

describe('the auditor projection seam', () => {
  it('refuses without a Significator rather than narrating a fabricated profile', () => {
    // The hasSave honesty gate. A surface showing an empty profile is worse than one showing
    // nothing: it tells an auditor the player has no development when the truth is there is
    // no save to read.
    const out = projectWithConsent('guardian', undefined, ['L1'], 'Red', grant(['L1']));
    expect(out.rendered).toHaveLength(0);
    expect(out.refusal).toMatch(/no Significator loaded/);
  });

  it('refuses with no live grant, naming AL5 — and renders nothing', () => {
    const out = projectWithConsent('guardian', aSignificator(), ['L1'], 'Red', undefined);
    expect(out.rendered).toHaveLength(0);
    expect(out.refusal).toMatch(/no live consent grant/);
  });

  it('treats a REVOKED grant as no grant — revocation is instant, not deferred', () => {
    // 16 §2.4.1: revoke nulls the projection instantly. A revoked link is not a weak link.
    const revoked: ShareRecord = { ...grant(['L1', 'L2']), revoked: true };
    const out = projectWithConsent('guardian', aSignificator(), ['L1'], 'Red', revoked);
    expect(out.rendered).toHaveLength(0);
    expect(out.refusal).toMatch(/no live consent grant/);
  });

  it('renders the granted levels, and ONLY those', () => {
    // The positive path, which an empty-store test could never reach.
    const out = projectWithConsent('guardian', aSignificator(), ['L1', 'L2'], 'Red', grant(['L1', 'L2', 'L3']));
    expect(out.refusal).toBeUndefined();
    expect(out.rendered.map((r) => r.level)).toEqual(['L1', 'L2']);
    // Every rendered level must carry real content — a level that renders with no payload is a
    // panel an auditor reads as "no data" when the truth is "not derived".
    for (const r of out.rendered) expect(r.payload).toBeDefined();
  });

  it('refuses a level DEEPER than the grant, with the law\'s own reason', () => {
    // The player chose L1..L2. Asking for L4 is the auditor pressing a button; the scope is the
    // player's answer, and it is not a starting offer.
    const out = projectWithConsent('therapeutic', aSignificator(), ['L1', 'L4'], 'Red', grant(['L1', 'L2']));
    expect(out.rendered.map((r) => r.level)).toEqual(['L1']);
    expect(out.refusal).toMatch(/outside the consent link's scope/);
  });

  it('never renders L0 — and a grant smuggling it is refused wholesale', () => {
    // AL4/MY-AD-0034. L0 is the player's own felt-sense surface and is never shareable. createShare
    // already refuses an L0 grant, so the defence that matters is the RENDER half against a
    // hand-built record that skipped creation: scopeRunValid rejects `['L0','L1']` outright —
    // the run must start at L1 — so neither L0 nor L1 renders. Stricter than dropping L0 alone,
    // and that is the correct reading: a grant that violates the floor is not a partial grant.
    const forged: ShareRecord = { grantId: 'forged', scopes: ['L0', 'L1'], revoked: false, createdAtMs: 0 };
    const out = projectWithConsent('guardian', aSignificator(), ['L0', 'L1'], 'Red', forged);
    expect(out.rendered).toHaveLength(0);
    expect(out.refusal).toMatch(/contiguous run/);
  });

  it('refuses a gapped grant even when every requested level is named', () => {
    // A hand-built L1..L3 grant is not a valid grant (MY-AD-0034: contiguous from L1). The law
    // holds at render, not only at creation, so a corrupted store cannot widen a share.
    const gapped: ShareRecord = { grantId: 'gapped', scopes: ['L1', 'L3'], revoked: false, createdAtMs: 0 };
    const out = projectWithConsent('guardian', aSignificator(), ['L1', 'L2'], 'Red', gapped);
    expect(out.rendered).toHaveLength(0);
    expect(out.refusal).toMatch(/descent is progressive/);
  });

  it('reports the ceiling as the grant\'s top, so no surface can drill past it', () => {
    expect(projectWithConsent('therapeutic', aSignificator(), ['L1'], 'Red', grant(['L1', 'L2'])).ceiling).toBe('L2');
    expect(projectWithConsent('guardian', aSignificator(), ['L1'], 'Red', grant(['L1', 'L2', 'L3', 'L4', 'L5'])).ceiling).toBe('L5');
  });

  it('carries the player\'s stage into the presentation, not the auditor\'s', () => {
    // AL3: a grant to an infrared player reads in concrete markers; the same grant to a green
    // player reads in full structure. One payload, two readers.
    const g = grant(['L1', 'L2']);
    const low = projectWithConsent('guardian', aSignificator('Infrared'), ['L1'], 'Infrared', g);
    const high = projectWithConsent('guardian', aSignificator('Green'), ['L1'], 'Green', g);
    expect(low.rendered[0]?.presentation).toBe('concrete-markers');
    expect(high.rendered[0]?.presentation).toBe('full-structure');
  });
});
