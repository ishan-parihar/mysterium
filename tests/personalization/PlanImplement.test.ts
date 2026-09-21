/**
 * PLAN-IMPLEMENT surface tests — 45/46/47 + MY-AD-0020.
 * Locks: UDV firewall (stage-label downgrade, observed-interest tagging), dialectic engine state
 * gates (46 §5.3), composition invariants (46 §11), pooling veto-routing with recorded deferrals
 * (45 §5.2.1), role scoping (45 §6.1), engagement register (45 §7.3), replay determinism (46 §7.1).
 */
import { describe, it, expect } from 'vitest';
import { createTagStore } from '../../src/core/world/tags/dialectic.js';
import { INITIAL_TAGS } from '../../src/core/world/tags/initialTags.js';
import { createFacetStore } from '../../src/core/world/facets/FacetStore.js';
import facetsJson from '../../src/core/world/facets/facets.json';
import { projectUdv, auditUdv } from '../../src/core/personalization/udv.js';
import { selectPoles, expansionBudget, EXPANSION_RATIO_FLOOR, pairKeyOf } from '../../src/core/personalization/dialecticEngine.js';
import {
  compose,
  buildLibraryViews,
  createCompositionStore,
  compositionOrder,
} from '../../src/core/personalization/composition.js';
import { pool, buildQuery, constraintFilter, routeWithVeto } from '../../src/core/personalization/pooling.js';
import { buildScenarioContext, scopeForRole, ROLE_SCOPES } from '../../src/core/personalization/scenarioContext.js';
import { createEngagementRegister } from '../../src/core/personalization/engagementRegister.js';
import type { PoolCandidate, DeferralRecord } from '../../src/core/personalization/pooling.js';
import type { Line } from '../../src/core/domain/Line.js';
import type { Modality } from '../../src/core/domain/enums.js';

const tagIds = new Set(INITIAL_TAGS.map((t) => t.id));
const tagStore = createTagStore();
const facetStore = createFacetStore(tagIds, (facetsJson as unknown as { facets: never }).facets as never);

const LINE: Line = 'Cognitive';
const MODALITY: Modality = 'ScenarioChoice';

function udvInputs(over: Partial<Parameters<typeof projectUdv>[0]> = {}) {
  return {
    usableFields: new Set<string>(),
    declaredInterests: [{ topic: 'sailing', weight: 0.9, depth: 'fluent', source: 'declared' }] as const,
    developmental: { stageOrdinals: { Cognitive: 3 } as never, activeShadowQuadrants: ['DarkAllergy'] as never },
    purpose: [{ kind: 'learning-quest', statement: 'navigation' }] as const,
    ...over,
  };
}

describe('UDV firewall (MY-AD-0020 §3 + 45 §3.1)', () => {
  it('downgrades stage ordinals to bands — no stage label in the projection', () => {
    const udv = projectUdv(udvInputs());
    expect(udv.developmental.lineAltitudeBand[0].band).toBe('emerging');
    const audit = auditUdv(udv);
    expect(audit.forbiddenTokens).toEqual([]);
  });

  it('rides observed interests along as ranking weight, never a field of record', () => {
    const udv = projectUdv(
      udvInputs({
        observedInterests: [{ topic: 'chess', weight: 0.5, depth: 'surface', source: 'observed' }],
      }),
    );
    const chess = udv.interests.find((i) => i.topic === 'chess');
    expect(chess?.source).toBe('observed');
  });

  it('aversions pass through fail-closed — the projector never drops or softens them', () => {
    const udv = projectUdv(udvInputs({ aversions: ['needles'] }));
    expect(udv.aversions).toEqual(['needles']);
  });
});

describe('dialectic engine (46 §5)', () => {
  const states = { [pairKeyOf('technology', 'nature')]: 'active-tension' } as const;

  it('spiral mode: surface in the fluent tag, structure in its opposite (46 §5.1)', () => {
    const poles = selectPoles(tagStore, {
      mode: 'spiral',
      fluentTags: ['technology'],
      aversions: [],
      states: { [pairKeyOf('technology', 'nature')]: 'active-tension' },
    });
    expect(poles.surface.id).toBe('technology');
    expect(poles.structure.id).toBe(tagStore.opposite('technology').id);
  });

  it('may not select a reconciled pair as the structural pole (saturation guard, 46 §5.2)', () => {
    const tech = tagStore.opposite('technology').id; // 'nature' (curated pair)
    expect(() =>
      selectPoles(tagStore, {
        mode: 'spiral',
        fluentTags: ['technology'],
        aversions: [],
        states: { [pairKeyOf('technology', tech)]: 'reconciled' },
      }),
    ).toThrow(/active-tension|no eligible structural pole/);
  });

  it('may not override an aversion — a vetoed tag never becomes either pole (46 §5.3)', () => {
    expect(() =>
      selectPoles(tagStore, { mode: 'spiral', fluentTags: ['technology'], aversions: ['technology'], states: { ...states } }),
    ).toThrow();
  });

  it('expansion ratio never drops below the comfort-engine floor (46 §5.2)', () => {
    const budget = expansionBudget({}, 0.0);
    expect(budget.expansionRatio).toBeGreaterThanOrEqual(EXPANSION_RATIO_FLOOR);
  });
});

describe('composition pipeline (46 §7, invariants §11)', () => {
  const poles = selectPoles(tagStore, {
    mode: 'spiral',
    fluentTags: ['technology', 'craft', 'music'],
    aversions: [],
    states: {
      [pairKeyOf('technology', 'nature')]: 'active-tension',
      [pairKeyOf('craft', 'music')]: 'active-tension',
      [pairKeyOf('music', 'architecture')]: 'active-tension',
    },
  });

  it('composes deterministically — same seed, same entity (invariant 1, 46 §7.1)', () => {
    const req = {
      purpose: { line: LINE, stage: 'Red', modality: MODALITY, shadowQuadrant: null },
      poles,
      aversions: [],
      seed: 4242,
    } as const;
    const a = compose(facetStore, tagStore, req);
    const b = compose(facetStore, tagStore, req);
    expect(a.entity.name).toBe(b.entity.name);
    expect(a.record).toEqual(b.record);
    expect(a.facets.map((f) => f.key)).toEqual(b.facets.map((f) => f.key));
  });

  it('every composed facet is inside the declared target cell (invariant 3)', () => {
    const res = compose(facetStore, tagStore, {
      purpose: { line: LINE, stage: 'Red', modality: MODALITY, shadowQuadrant: null },
      poles,
      aversions: [],
      seed: 7,
    } as const);
    for (const f of res.facets) {
      expect(f.line).toBe(LINE);
      expect(f.stage).toBe('Red');
    }
  });

  it('composition never overrides an aversion — a fully-vetoed cell fails closed (invariant 5)', () => {
    const cellFacets = facetStore.moduleFacets(LINE, 'Red');
    const allTags = [...new Set(cellFacets.flatMap((f) => f.tags))];
    const poles2 = selectPoles(tagStore, {
      mode: 'spiral',
      fluentTags: allTags,
      aversions: [],
      states: {
        [pairKeyOf('technology', 'nature')]: 'active-tension',
        [pairKeyOf('craft', 'music')]: 'active-tension',
        [pairKeyOf('music', 'architecture')]: 'active-tension',
      },
    });
    expect(() =>
      compose(
        facetStore,
        tagStore,
        {
          purpose: { line: LINE, stage: 'Red', modality: MODALITY, shadowQuadrant: null },
          poles: poles2,
          aversions: allTags, // every facet in the cell carries a vetoed tag → the pull empties
          seed: 9,
        } as const,
      ),
    ).toThrow(/aversion|defer|empty facet pull/);
  });

  it('applies facets in dependency order — shadow-expression after drive-profile (46 §7 step 5)', () => {
    const order = compositionOrder(['shadow-expression', 'drive-profile', 'voice-register', 'role-archetype']);
    expect(order.indexOf('drive-profile')).toBeLessThan(order.indexOf('shadow-expression'));
    expect(order.indexOf('voice-register')).toBeLessThan(order.indexOf('role-archetype'));
  });

  it('the three views index one store without copying it (46 §6.1)', () => {
    const composed = compose(facetStore, tagStore, {
      purpose: { line: LINE, stage: 'Red', modality: MODALITY, shadowQuadrant: null },
      poles,
      aversions: [],
      seed: 3,
    } as const);
    const views = buildLibraryViews([composed.entity]);
    expect(views.scenario.size + views.npc.size + views.world.size).toBe(1);
    expect(composed.entity.kind).toBe('NPC'); // template-less composition binds an NPC (46 §7 step 4)
    expect(views.npc.size).toBe(1);
  });

  it('replay from the composition record returns the same facet set (46 §7.1)', () => {
    const store = createCompositionStore();
    const res = compose(facetStore, tagStore, {
      purpose: { line: LINE, stage: 'Red', modality: MODALITY, shadowQuadrant: null },
      poles,
      aversions: [],
      seed: 11,
    } as const);
    store.record({ id: res.entity.compositionId, ...res.record, poles: { surface: poles.surface.id, structure: poles.structure.id }, reason: poles.reason });
    const replayed = store.replay(store.entries[0], facetStore);
    expect(replayed.map((f) => f.key)).toEqual(res.facets.map((f) => f.key));
  });
});

describe('pooling: the veto is a routing rule, never a scheduling rule (45 §5.2.1)', () => {
  const target = { line: LINE, stage: 'Red' as const, modality: MODALITY };
  const candidate = (over: Partial<PoolCandidate>): PoolCandidate => ({
    id: 'c1',
    cell: target,
    tags: ['technology'],
    stratum: 0,
    depthFloor: 0,
    landsIn: [],
    ...over,
  });

  it('another carrier of the same cell absorbs the veto invisibly', () => {
    const deferred: DeferralRecord[] = [];
    const primary = [candidate({ id: 'vetoed', tags: ['technology'] }), candidate({ id: 'clean', tags: ['craft'] })];
    const kept = routeWithVeto(primary, [], target, ['technology'], 0, deferred);
    expect(kept.map((c) => c.id)).toEqual(['clean']);
    expect(deferred).toHaveLength(0);
  });

  it('the sole carrier defers and the deferral is recorded — never forced', () => {
    const deferred: DeferralRecord[] = [];
    const primary = [candidate({ id: 'vetoed', tags: ['technology'] })];
    const kept = routeWithVeto(primary, [], target, ['technology'], 1234, deferred);
    expect(kept).toEqual([]);
    expect(deferred).toHaveLength(1);
    expect(deferred[0].causedBy).toContain('aversion');
  });

  it('constraint filter: strata/depth overflow demotes to texture; the veto belongs to routing', () => {
    const q = { interestTerms: [], analogyTerms: [], purposeTerms: [], aversions: ['warfare'] };
    const out = constraintFilter(
      [
        candidate({ id: 'high-stratum', stratum: 5 }),
        candidate({ id: 'deep', depthFloor: 9 }),
        candidate({ id: 'vetoed-tag', tags: ['warfare'] }),
        candidate({ id: 'ok' }),
      ],
      { query: q, maxStratum: 1, playerDepth: 3, targetModality: MODALITY },
    );
    expect(out.texture.map((c) => c.id)).toEqual(['high-stratum', 'deep']);
    // the vetoed-tag candidate is still primary here — routeWithVeto owns rule 3 (§5.2.1)
    expect(out.primary.map((c) => c.id)).toEqual(['vetoed-tag', 'ok']);
  });

  it('query construction puts declared interests in, leaves unresolved topics out (fail-soft)', () => {
    const udv = projectUdv(udvInputs());
    const q = buildQuery(tagStore, udv, (topic) => (topic === 'sailing' ? undefined : 'craft'));
    expect(q.interestTerms).toHaveLength(0); // 'sailing' does not resolve → not a term
  });

  it('pool() defers (not throws) when the dialectic engine has no eligible pole', () => {
    const udv = projectUdv(udvInputs());
    const out = pool(tagStore, udv, [], {
      mode: 'spiral',
      states: {},
      target,
      maxStratum: 1,
      playerDepth: 3,
      resolve: () => 'technology',
      now: 0,
    });
    expect(out.poles).toBeNull();
    expect(out.deferrals.some((d) => d.causedBy.includes('structural pole'))).toBe(true);
  });
});

describe('ScenarioContext role scoping (45 §6.1)', () => {
  const ctx = buildScenarioContext({
    udv: projectUdv(udvInputs()),
    pooled: { world: ['w1'], npcs: ['n1'], scenarios: ['s1'] },
    analogicalBridge: { structuralMap: 'm', surfaceMap: 's', stakeHook: null, domain: 'sailing', noveltyBudget: 0.3 },
    catalystTarget: { line: LINE, stage: 'Red', modality: MODALITY, purpose: 'probe' },
    veiled: ['stage labels'],
    poles: null,
    entity: null,
  });

  it('assessment is blind to the interest graph and purpose (42 §1.1 evidence-only)', () => {
    const scoped = scopeForRole(ctx, 'assessment');
    expect(scoped.interests).toBeUndefined();
    expect(scoped.purpose).toBeUndefined();
    expect(scoped.developmental).toBeDefined();
  });

  it('curriculum receives purpose but never analogy internals', () => {
    const scoped = scopeForRole(ctx, 'curriculum-teacher');
    expect(scoped.purpose).toBeDefined();
    expect(scoped.analogy).toBeUndefined();
  });

  it('narrative/voice receives the veto list, never developmental numbers', () => {
    const scoped = scopeForRole(ctx, 'narrative-voice');
    expect(scoped.aversions).toBeDefined();
    expect(scoped.developmental).toBeUndefined();
  });

  it('safety receives aversions only — no interest graph, no analogy', () => {
    const scoped = scopeForRole(ctx, 'safety');
    expect(scoped.aversions).toBeDefined();
    expect(scoped.interests).toBeUndefined();
    expect(scoped.analogy).toBeUndefined();
  });

  it('the Veil rides into every scope (20)', () => {
    for (const role of Object.keys(ROLE_SCOPES) as (keyof typeof ROLE_SCOPES)[]) {
      expect(scopeForRole(ctx, role).veiled).toEqual(['stage labels']);
    }
  });
});

describe('engagement register (45 §7.3, MY-RG-0017)', () => {
  it('every pre-registered 45 §7.1 mechanism passes both tests', () => {
    const reg = createEngagementRegister();
    for (const e of reg.entries) {
      expect(reg.isMechanismAllowed(e.id), e.id).toBe(true);
    }
  });

  it('refuses to record a mechanism that has not passed both tests', () => {
    const reg = createEngagementRegister();
    expect(() =>
      reg.register({
        id: 'curiosity-gap',
        description: 'half-tested',
        binds: 'nowhere',
        endorsementPassed: true,
        reversalPassed: false,
      }),
    ).toThrow(/both tests/);
  });
});
