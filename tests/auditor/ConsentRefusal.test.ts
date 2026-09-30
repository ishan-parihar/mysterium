/**
 * The auditor surfaces: what the consent link does and does not open.
 *
 * This is the one register boundary a RUNTIME test can see, because the refusal produces a value:
 * `renderLevel` (16 §10.4, AL5) returns a `RenderedLevel` whose `allowed` is false and whose `reason`
 * names the law, so a refused request is legible rather than silent. Every other veil rule in this
 * repo is an ABSENCE — a closed value that was never printed — and is guarded by a template/corpus
 * scan (G55). This one has an observable result, so it gets a behavioural test.
 *
 * Why it matters: the three auditor surfaces were ROUTES WITH NO ENTRY POINT until this session.
 * Making them reachable put a static link in front of every player, and that link is only safe
 * because the surface behind it refuses. The refusal is now pinned rather than assumed — driven in a
 * browser with no grant, `/auditor/guardian` renders "NO LIVE GRANT" and no closed-register value.
 */
import { describe, it, expect } from 'vitest';
import { renderLevel, LADDER, LADDER_BY_LEVEL, type LadderLevel, type LevelPayload } from '$core/domain/articulationLadder.js';

const payloads = new Map<LadderLevel, LevelPayload>(
  LADDER.map((spec) => [spec.level, { level: spec.level, narrative: `narrative for ${spec.level}` }]),
);

const CLOSED_LEVELS = LADDER.filter((s) => s.registerClass === 'closed').map((s) => s.level);
const OPEN_LEVELS = LADDER.filter((s) => s.registerClass === 'open').map((s) => s.level);

/** A grant scoped to a contiguous run from L1, which is the shape AL4 requires. */
function grant(...scopes: readonly LadderLevel[]) {
  return { grantId: 'g1', scopes, revoked: false };
}

describe('the self register', () => {
  it('the corpus really does contain both register classes, or this file is vacuous', () => {
    expect(CLOSED_LEVELS.length).toBeGreaterThan(0);
    expect(OPEN_LEVELS.length).toBeGreaterThan(0);
    expect(LADDER_BY_LEVEL.get('L4')?.registerClass).toBe('closed');
    expect(LADDER_BY_LEVEL.get('L5')?.registerClass).toBe('closed');
  });

  it('ALLOWS every open level directly, with no grant at all (AL1)', () => {
    // The player addressing their own ladder is not a request that needs authorising. Refusing it
    // would be a different bug, and an earlier draft of this file asserted exactly that.
    for (const level of OPEN_LEVELS) {
      const out = renderLevel({ register: 'self', level, playerStage: 'Red' }, payloads);
      expect(out.allowed, `${level} was refused in the self register`).toBe(true);
      expect(out.payload).toBeTruthy();
    }
  });

  it('REFUSES every closed level, at every stage, with the law named (20 §11.1)', () => {
    for (const stage of ['Red', 'Amber', 'Turquoise'] as const) {
      for (const level of CLOSED_LEVELS) {
        const out = renderLevel({ register: 'self', level, playerStage: stage }, payloads);
        expect(out.allowed, `${level} rendered to the player at ${stage}`).toBe(false);
        expect(out.reason).toMatch(/closed register class/i);
        // The whole point: no payload rides along with a refusal.
        expect(out.payload).toBeUndefined();
      }
    }
  });
});

describe('the auditor register', () => {
  it('refuses with NO consent at all, naming the grant (AL5)', () => {
    for (const level of LADDER.map((l) => l.level)) {
      const out = renderLevel({ register: 'auditor', level, playerStage: 'Red' }, payloads);
      expect(out.allowed, `${level} rendered to an auditor with no grant`).toBe(false);
      expect(out.reason).toMatch(/consent/i);
      expect(out.payload).toBeUndefined();
    }
  });

  it('refuses a REVOKED grant even for a level it did scope', () => {
    for (const level of CLOSED_LEVELS) {
      const out = renderLevel(
        { register: 'auditor', level, playerStage: 'Red', consent: { grantId: 'g1', scopes: grant('L1', 'L2', 'L3', 'L4').scopes, revoked: true } },
        payloads,
      );
      expect(out.allowed, `a revoked grant still opened ${level}`).toBe(false);
      expect(out.reason).toMatch(/consent/i);
    }
  });

  it('refuses a level OUTSIDE the grant, even for a live grant', () => {
    // Scoping is the point of the consent link: granting L1..L3 does not imply L4.
    const scoped = grant('L1', 'L2', 'L3');
    const out = renderLevel(
      { register: 'auditor', level: 'L4', playerStage: 'Red', consent: { grantId: 'g1', scopes: [...scoped.scopes], revoked: false } },
      payloads,
    );
    expect(out.allowed, 'L4 rendered from a grant scoped to L1..L3').toBe(false);
    expect(out.reason).toMatch(/scope/i);
  });

  it('refuses a NON-CONTIGUOUS grant, which is what makes descent progressive (AL4)', () => {
    // L1 and L4 with L2 missing is not a progressive descent; allowing it would let a grant jump
    // straight to the closed core.
    const gapped = grant('L1', 'L4');
    const out = renderLevel(
      { register: 'auditor', level: 'L4', playerStage: 'Red', consent: { grantId: 'g1', scopes: [...gapped.scopes], revoked: false } },
      payloads,
    );
    expect(out.allowed, 'a gapped grant opened L4').toBe(false);
    expect(out.reason).toMatch(/contiguous|progressive/i);
  });

  it('RENDERS a contiguous, live, in-scope grant — the positive control', () => {
    // Without this, "everything refuses" would satisfy every assertion above while the surface was
    // simply broken. The reader has to work, or the gate above proves nothing.
    const full = grant('L1', 'L2', 'L3', 'L4', 'L5');
    for (const level of ['L2', 'L4'] as const) {
      const out = renderLevel(
        { register: 'auditor', level, playerStage: 'Red', consent: { grantId: 'g1', scopes: [...full.scopes], revoked: false } },
        payloads,
      );
      expect(out.allowed, `${level} was refused for a properly consented auditor`).toBe(true);
      expect(out.payload?.narrative).toContain(level);
    }
  });
});
