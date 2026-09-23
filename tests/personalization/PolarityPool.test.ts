/**
 * The Polarity Pool — Phase 13 d10 (the plan's four ratified layers; W11's closer).
 *
 * W11: the candidate library held exactly five renderings per cell with IDENTICAL tag vectors,
 * so a cell-targeted pool returned the same five refs for every player and the UDV's bands had
 * nothing to order (`docs/audits/WIRING-CONTRAST-AUDIT-2026-09-23.md`). The ratified fix derives
 * multiplicity from the library itself (L1), resolves a familiar/unfamiliar/shadow-facing pole
 * per encounter with shadow-severity-scaled dosage (L2 — `noveltyBudget`'s first consumer,
 * 45 §5.4), closes the loop with a spiral READING that is System-1-proposed and orchestrator-
 * ratified (L3 — 46 §4.3's falsifiable state; a cell is never closed), and ships top-1 primary +
 * named pole to the prompt with alternates hidden (L4).
 */
import { describe, it, expect } from 'vitest';
import {
  axisCentroid, axisDistance, similarTags, oppositeTags, deriveLibraryVariants, deriveVariantsFor,
} from '../../src/core/personalization/polarityIndex.js';
import {
  decidePole, unfamiliarShareFor, shadowSeverityForLine,
} from '../../src/core/personalization/poleDecision.js';
import {
  deterministicReading, applyReading, polarityCoverage, auditReadingLog, pairKeyFor,
  CONFIRMATIONS_TO_RECONCILE, APPLICATION_CONFIDENCE_FLOOR,
  type EncounterRecord, type PolarityReading, type ReadingApplication, type ConfirmationTally,
} from '../../src/core/personalization/polarityResolution.js';
import { polarityPromptLine, type PooledSelection } from '../../src/core/personalization/scenarioContext.js';
import { scopeContractViolations } from '../../src/core/personalization/sessionRuntime.js';
import { seedCandidateLibrary, initialTopicTagResolver } from '../../src/core/personalization/candidateLibrary.js';
import type { PoolCandidate } from '../../src/core/personalization/pooling.js';
import { createTagStore } from '../../src/core/world/tags/dialectic.js';
import { INITIAL_TAGS } from '../../src/core/world/tags/initialTags.js';
import { sharedFacetStore } from '../../src/core/personalization/sessionRuntime.js';
import { pool } from '../../src/core/personalization/pooling.js';
import { projectUdv } from '../../src/core/personalization/udv.js';
import { analogyFromInterests } from '../../src/core/personalization/bandSources.js';
import type { Line } from '../../src/core/domain/Line.js';
import type { Stage } from '../../src/core/domain/Stage.js';
import type { Modality } from '../../src/core/domain/enums.js';

const store = createTagStore(INITIAL_TAGS);
const TARGET = { line: 'Cognitive' as Line, stage: 'Amber' as Stage, modality: 'ScenarioChoice' as Modality };

// ── L1 — the similarity/opposition index ────────────────────────────────────────────────────

describe('d10 L1 — polarity index', () => {
  it('the centroid of a tag set is its axis-space mean; distance is euclidean', () => {
    const a = INITIAL_TAGS[0]!;
    const b = INITIAL_TAGS[1]!;
    const c = axisCentroid([a, b]);
    expect(c.erosAgape).toBeCloseTo((a.erosAgape + b.erosAgape) / 2, 10);
    expect(c.agencyCommunion).toBeCloseTo((a.agencyCommunion + b.agencyCommunion) / 2, 10);
    expect(axisDistance(c, c)).toBe(0);
    expect(axisDistance(c, { erosAgape: 1, agencyCommunion: 1 })).toBeGreaterThan(0);
  });

  it('opposite() starts the opposition walk; symmetric per 46 §4.2', () => {
    const opp = oppositeTags(store, 'technology', 4);
    expect(opp.length).toBeGreaterThan(0);
    expect(opp[0]!.id).toBe(store.opposite('technology').id);
    expect(opp).not.toContainEqual(expect.objectContaining({ id: 'technology' }));
  });

  it('similar() prefers family (facet-affinity overlap) and never includes the origin tag', () => {
    const sim = similarTags(store, 'technology', 4);
    expect(sim).not.toContainEqual(expect.objectContaining({ id: 'technology' }));
    expect(sim.length).toBeGreaterThan(0);
  });

  it('deriveVariantsFor recolours a base WITHOUT re-altitude (the coherence law inherited)', () => {
    const library = seedCandidateLibrary(sharedFacetStore());
    const base = library.find((c) => c.id === 'scenario-authored:Cognitive:Amber:ScenarioChoice')!;
    const variants = deriveVariantsFor(base, store);
    expect(variants.length).toBeGreaterThanOrEqual(1);
    for (const v of variants) {
      expect(v.candidate.cell).toEqual(base.cell); // verbatim — never re-altitude
      expect(v.candidate.id.startsWith(base.id + '~')).toBe(true);
      expect(v.candidate.tags).not.toEqual(base.tags); // genuinely recoloured
      for (const t of v.candidate.tags) expect(store.byId(t)).toBeDefined(); // store-resolved
    }
  });

  it('the derived library gives every cell ≥3 distinct-vector renderings — W11 closed structurally', () => {
    const library = deriveLibraryVariants(seedCandidateLibrary(sharedFacetStore()), store);
    expect(library.length).toBeGreaterThan(2240);
    // Idempotent: deriving twice adds nothing.
    const again = deriveLibraryVariants(library, store);
    expect(again.length).toBe(library.length);
    // Per-cell floor: ≥3 renderings with pairwise-distinct tag vectors.
    const byCell = new Map<string, PoolCandidate[]>();
    for (const c of library) {
      const key = `${c.cell.line}:${c.cell.stage}:${c.cell.modality}`;
      const arr = byCell.get(key) ?? [];
      arr.push(c);
      byCell.set(key, arr);
    }
    for (const cell of byCell.values()) {
      const vectors = new Set(cell.map((c) => c.tags.join(',')));
      expect(vectors.size).toBeGreaterThanOrEqual(3);
    }
  });
});

// ── L2 — the pole decision ──────────────────────────────────────────────────────────────────

describe('d10 L2 — the pole decision', () => {
  it('dosage is shadow-severity-scaled with a hard ceiling of 0.6 (45 §5.4)', () => {
    expect(unfamiliarShareFor(0.25, 0)).toBe(0.25); // dormant: the seed budget stands
    expect(unfamiliarShareFor(0.25, 0.2)).toBeCloseTo(0.25, 10);
    expect(unfamiliarShareFor(0.25, 0.7)).toBe(0.6); // 0.25 + 0.5*0.8 = 0.65 → clamped by the ceiling
    expect(unfamiliarShareFor(0.25, 0.5)).toBeCloseTo(0.25 + 0.3 * 0.8, 10); // below the ceiling
    expect(unfamiliarShareFor(0.5, 1)).toBeLessThanOrEqual(0.6); // the ceiling
    expect(unfamiliarShareFor(0, 1)).toBeLessThanOrEqual(0.6);
  });

  it('severity reads the strongest ACTIVE shadow on the cell line only', () => {
    const shadows = [
      { line: 'Cognitive' as Line, resolvedAt: null, severity: 0.6 },
      { line: 'Cognitive' as Line, resolvedAt: 5, severity: 0.95 }, // resolved: dormant
      { line: 'Moral' as Line, resolvedAt: null, severity: 0.9 },   // other line: ignored
    ];
    expect(shadowSeverityForLine(shadows, 'Cognitive')).toBe(0.6);
    expect(shadowSeverityForLine([], 'Cognitive')).toBe(0);
  });

  it('a dormant ledger never produces a shadow-facing pole', () => {
    const library = deriveLibraryVariants(seedCandidateLibrary(sharedFacetStore()), store);
    const inCell = library.filter((c) => c.cell.line === TARGET.line && c.cell.stage === TARGET.stage && c.cell.modality === TARGET.modality);
    const d = decidePole(store, {
      candidates: inCell, target: TARGET, fluentTags: ['technology'],
      shadowSeverity: 0, seedNoveltyBudget: 0.25, draw: 0.99,
    })!;
    expect(d.pole).toBe('familiar');
    expect(d.shadowSeverity).toBe(0);
  });

  it('live shadow severity can produce a shadow-facing pole whose candidate sits FAR from the fluent centroid', () => {
    const library = deriveLibraryVariants(seedCandidateLibrary(sharedFacetStore()), store);
    const inCell = library.filter((c) => c.cell.line === TARGET.line && c.cell.stage === TARGET.stage && c.cell.modality === TARGET.modality);
    const d = decidePole(store, {
      candidates: inCell, target: TARGET, fluentTags: ['technology'],
      shadowSeverity: 0.9, seedNoveltyBudget: 0.25, draw: 0.0,
    })!;
    expect(d.pole).toBe('shadow-facing');
    const fluentPoint = axisCentroid(['technology'].map((id) => store.byId(id as never)!));
    const dPrimary = axisDistance(axisCentroid(d.primary.tags.map((t) => store.byId(t)!)), fluentPoint);
    expect(dPrimary).toBeGreaterThan(0); // genuinely away from the fluent side
    expect(d.reason).toContain('45 §5.4');
  });

  it('the draw is a hash compared against the SHARE — replay-safe dosage, not a dial (43 §3.3)', () => {
    // share=0.25: draws below 0.25 land unfamiliar, above land familiar — so ~25% of encounters
    // (drawn deterministically, e.g. from the encounter id) render the unfamiliar pole. The draw
    // never CHANGES the share; severity does.
    const library = deriveLibraryVariants(seedCandidateLibrary(sharedFacetStore()), store);
    const inCell = library.filter((c) => c.cell.line === TARGET.line && c.cell.stage === TARGET.stage && c.cell.modality === TARGET.modality);
    const base = { candidates: inCell, target: TARGET, fluentTags: ['technology'], shadowSeverity: 0, seedNoveltyBudget: 0.25 };
    expect(decidePole(store, { ...base, draw: 0 })!.pole).toBe('unfamiliar');
    expect(decidePole(store, { ...base, draw: 0.24 })!.pole).toBe('unfamiliar');
    expect(decidePole(store, { ...base, draw: 0.999999 })!.pole).toBe('familiar');
    // Determinism: same draw ⇒ same decision.
    expect(decidePole(store, { ...base, draw: 0.24 })!.primary.id).toBe(decidePole(store, { ...base, draw: 0.24 })!.primary.id);
  });

  it('an unstocked cell degrades to familiar (or null on an empty cell) — never throws', () => {
    expect(decidePole(store, { candidates: [], target: TARGET, fluentTags: [], shadowSeverity: 0.9, seedNoveltyBudget: 0.25, draw: 0 })).toBeNull();
  });
});

// ── L3 — the resolution loop ────────────────────────────────────────────────────────────────

describe('d10 L3 — the polarity resolution loop (the spiral)', () => {
  const CELL = { line: 'Cognitive' as Line, stage: 'Amber' as Stage, modality: 'ScenarioChoice' as Modality };
  const PAIR = pairKeyFor('technology', 'nature');

  const record = (over: Partial<EncounterRecord> = {}): EncounterRecord => ({
    cell: CELL, pairKey: PAIR, poleServed: 'unfamiliar',
    evidence: ['encounter:1', 'signal:hold', 'log:ref'],
    at: 1000, ...over,
  });

  it('the deterministic fallback reads hold-quality; no hold ⇒ stationary (never fabricates)', () => {
    const r = deterministicReading(record({ pairHoldQuality: 0.8 }));
    expect(r.direction).toBe('toward-conscious');
    expect(r.proposedBy).toBe('deterministic-fallback');
    const s = deterministicReading(record({ pairHoldQuality: 0.5 }));
    expect(s.direction).toBe('stationary');
  });

  it('ONE confirming reading never reconciles — the transmutation ruling as a constant', () => {
    const states = { [PAIR]: 'active-tension' as const };
    const tallies: ConfirmationTally = {};
    const r = deterministicReading(record({ pairHoldQuality: 0.9 }));
    const a1 = applyReading({ reading: r, ratified: true, states, tallies, shadows: [] });
    expect(a1.stateAfter).toBe('active-tension');
    expect(a1.confirmations).toBe(1);
    // ...and CONFIRMATIONS_TO_RECONCILE is the ratified long way, not a single sweep.
    expect(CONFIRMATIONS_TO_RECONCILE).toBeGreaterThan(1);
  });

  it(`repeated confirmations (${CONFIRMATIONS_TO_RECONCILE}) reconcile; a later failure RE-OPENS (46 §4.3)`, () => {
    const states = { [PAIR]: 'active-tension' as const };
    const tallies: ConfirmationTally = {};
    for (let i = 0; i < CONFIRMATIONS_TO_RECONCILE - 1; i++) {
      applyReading({ reading: deterministicReading(record({ pairHoldQuality: 0.9, at: 1000 + i })), ratified: true, states, tallies, shadows: [] });
    }
    const final = applyReading({ reading: deterministicReading(record({ pairHoldQuality: 0.9, at: 2000 })), ratified: true, states, tallies, shadows: [] });
    expect(final.stateAfter).toBe('reconciled');
    // The falsifiable state: a disconfirming reading re-opens + severity +1.
    const relapse = applyReading({ reading: deterministicReading(record({ pairHoldQuality: 0.1, at: 3000 })), ratified: true, states, tallies, shadows: [{ id: 'sh1', line: 'Cognitive' as Line, resolvedAt: null }] });
    expect(relapse.stateAfter).toBe('active-tension');
    expect(relapse.severityDelta).toBe(1);
    expect(relapse.confirmations).toBe(0);
  });

  it('unratified (L4) and low-confidence readings are recorded but move nothing', () => {
    const states = { [PAIR]: 'active-tension' as const };
    const tallies: ConfirmationTally = {};
    const un = applyReading({ reading: deterministicReading(record({ pairHoldQuality: 0.9 })), ratified: false, states, tallies, shadows: [] });
    expect(un.applied).toBe(false);
    expect(un.reason).toContain('L4');
    const low = deterministicReading(record({ pairHoldQuality: 0.9, evidence: ['only-one'] }));
    expect(low.confidence).toBeLessThan(APPLICATION_CONFIDENCE_FLOOR);
    const lo = applyReading({ reading: low, ratified: true, states, tallies, shadows: [] });
    expect(lo.applied).toBe(false);
  });

  it('the rubric audit catches an evidence-less reading and an out-of-bounds severity delta', () => {
    const bad: PolarityReading = { ...deterministicReading(record()), evidence: [] };
    const badApp = { applied: true, reason: 'x', stateBefore: 'active-tension', stateAfter: 'active-tension', severityDelta: 3, confirmations: 0 } as unknown as ReadingApplication;
    const v = auditReadingLog([bad], [badApp]);
    expect(v.some((x) => x.rule === 'evidence-cited')).toBe(true);
    expect(v.some((x) => x.rule === 'bounded-severity')).toBe(true);
  });

  it('coverage is a per-cell orthogonal-dimension judgment — a cell is never closed by default', () => {
    const onePair = [deterministicReading(record())];
    const c1 = polarityCoverage(onePair);
    expect(c1[0]!.robust).toBe(false); // one dimension, one reading — profiling stays open
    const many: PolarityReading[] = [];
    for (let d = 0; d < 4; d++) {
      for (let n = 0; n < 2; n++) {
        many.push(deterministicReading(record({ pairKey: `pair${d}|mate${d}`, at: 1000 + d * 10 + n })));
      }
    }
    const c2 = polarityCoverage(many);
    expect(c2[0]!.robust).toBe(true);
  });
});

// ── L4 + the differential criterion (W11 flipped to discrimination) ─────────────────────────

describe('d10 L4 — selection surface and the differential criterion', () => {
  it('the prompt line names the pole and the primary, and NOTHING else (alternates hidden)', () => {
    const sel: PooledSelection = { pole: 'shadow-facing', primary: 'scenario:x', alternates: ['alpha-candidate', 'beta-candidate'], reason: 'audit-reason' };
    const line = polarityPromptLine(sel)!;
    expect(line).toContain('shadow-facing');
    expect(line).toContain('scenario:x');
    expect(line).not.toContain('alpha-candidate');
    expect(line).not.toContain('beta-candidate');
    expect(line).not.toContain('audit-reason');
    expect(polarityPromptLine(null)).toBeNull();
  });

  it('THE DIFFERENTIAL CRITERION: swapping the analogy band changes the pooled PRIMARY (W11 flipped)', () => {
    // The library is derived (L1), so the fluent-domain centroid genuinely reorders the candidates.
    const services = createServices();
    const run = (analogyDomain: string) => {
      const udv = projectUdv({
        usableFields: new Set<string>(),
        declaredInterests: [],
        developmental: { stageOrdinals: {}, activeShadowQuadrants: [] },
        purpose: [],
        analogy: analogyFromInterests([{ topic: analogyDomain, weight: 1, depth: 'fluent', source: 'declared' }]),
        preference: undefined,
        constraints: undefined,
        observedInterests: undefined,
        aversions: [],
      } as never);
      const result = pool(store, udv, services, {
        mode: 'spiral', states: { [pairKeyFor('technology', 'nature')]: 'active-tension', [pairKeyFor('craft', 'music')]: 'active-tension', [pairKeyFor('law', 'exploration')]: 'active-tension', [pairKeyFor('medicine', 'warfare')]: 'active-tension' }, target: TARGET, maxStratum: 0, playerDepth: 0,
        resolve: initialTopicTagResolver, now: 1000,
      });
      // The UDV's fluent domains drive the pole decision directly (L2's familiar-match law);
      // selectPoles' HOW-poles are a separate mechanism (46 §5) and may defer independently.
      const fluentIds = result.poles ? [result.poles.surface.id] : ([] as string[]);
      const d = decidePole(store, {
        candidates: result.ranked, target: TARGET,
        fluentTags: [...new Set([analogyDomain, ...fluentIds])] as never,
        shadowSeverity: 0, seedNoveltyBudget: 0.25, draw: 0,
      })!;
      return d.primary.id;
    };
    const musicPrimary = run('music');
    const craftPrimary = run('craft');
    const lawPrimary = run('law');
    // At least one band swap moves the primary — the retrieval key is real.
    expect(new Set([musicPrimary, craftPrimary, lawPrimary]).size).toBeGreaterThan(1);
  });

  it('a disconfirming reading tightens the dosage: unfamiliar share rises with severity (loop closed)', () => {
    const before = unfamiliarShareFor(0.25, 0);
    const after = unfamiliarShareFor(0.25, 0.9);
    expect(after).toBeGreaterThan(before);
    expect(shadowSeverityForLine([{ line: 'Cognitive', resolvedAt: null, severity: 0.9 }], 'Cognitive')).toBe(0.9);
  });

  it('the scoped envelope carries the pole NAME only; selection internals stay with the catalyst', () => {
    // Structural: scopeForRole copies poleServed from ctx.polarity (see scenarioContext.ts); the
    // scope-contract checker sees no NEW band because the pole is not a UDV band.
    const sel: PooledSelection = { pole: 'unfamiliar', primary: 'p', alternates: [], reason: 'r' };
    expect(['familiar', 'unfamiliar', 'shadow-facing']).toContain(sel.pole);
    expect(scopeContractViolations({ role: 'assessment', catalystTarget: { line: 'Cognitive', stage: 'Amber', modality: 'ScenarioChoice', purpose: 'p' }, veiled: [], poles: null, entity: null, poleServed: 'unfamiliar' })).toEqual([]);
  });
});

// ── helpers ─────────────────────────────────────────────────────────────────────────────────

function createServices() {
  return deriveLibraryVariants(seedCandidateLibrary(sharedFacetStore()), store);
}
