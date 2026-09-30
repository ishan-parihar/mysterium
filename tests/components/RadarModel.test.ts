import { describe, it, expect } from 'vitest';

import {
  lineCurriculum,
  radarPoints,
  radarPath,
  depthSummary,
  crossDomainLinks,
  type LineCurriculum,
} from '../../src/lib/components/displays/radarModel.js';
import { ALL_LINES, type Line } from '../../src/core/domain/Line.js';
import { getCurriculumRegistry } from '../../src/core/curriculum/CurriculumRegistry.js';
import { seedCurriculumRegistry } from '../../src/core/curriculum/CurriculumSeed.js';
import { ALL_DEPTH_LEVELS, type CurriculumHolon, type DepthLevel, type KnowledgeState } from '../../src/core/curriculum/types.js';
import { ALL_STAGES, type Stage } from '../../src/core/domain/Stage.js';

/**
 * Developmental Radar — canon `33 §3.1` View 2.
 *
 * MY-AD-0035 sets the bar this file exists to hold: a view with no extracted pure module is not
 * finished. `KnowledgeMap` shipped its geometry untested inside three `$derived.by` closures and that
 * is exactly the debt this pattern removes — Views 3-5 will be written this way.
 *
 * READ-REGISTER DISCIPLINE (`AGENTS.md` §5.4). Line and altitude are open register; polarity, shadow
 * quadrants, ray profile, harvest verdict and delegation inference are closed and must never appear in
 * anything this module produces. A test asserting a string never contains a closed-register token is
 * the cheap version of that law, and it is worth having: G55 guards templates and the corpus, and this
 * guards the ARITHMETIC that feeds them.
 */

/**
 * A holon with the REAL shape.
 *
 * The first version of this fixture built `{ id, dev: {…} }` — the same wrong field the module read,
 * so the two agreed with each other and every test passed while the module returned all zeros against
 * the 113-holon corpus. `devMapping` is REQUIRED on `CurriculumHolon` (`types.ts:254-257`), so the
 * fixture is cast once here rather than stubbing fifteen fields at every call site: the point of the
 * test is the ARITHMETIC, and the compiler now rejects a wrong field name rather than a wrong one
 * quietly returning zero.
 */
const holon = (
  id: string,
  primaryLine: Line,
  secondaryLines: readonly Line[] = [],
): CurriculumHolon =>
  ({ id, name: id, devMapping: { primaryLine, secondaryLines, stageRange: { min: 'Red', max: 'Turquoise' } } }) as unknown as CurriculumHolon;

/** One REAL holon from the seeded corpus — the assertion that could have caught the wrong field. */
function seedCorpusHolon(): CurriculumHolon {
  seedCurriculumRegistry();
  const id = getCurriculumRegistry().conceptIds()[0]!;
  const holon = getCurriculumRegistry().get(id);
  if (!holon) throw new Error(`seeded corpus has no holon ${id} — the registry is not seeded`);
  return holon;
}

const knowledgeOf = (entries: Record<string, DepthLevel>): KnowledgeState =>
  ({
    conceptStates: new Map(
      Object.entries(entries).map(([id, depthLevel]) => [
        id,
        { depthLevel, retention: 1, lastReviewedAt: 0, depthHistory: [] },
      ]),
    ),
    subjectProgress: new Map(),
    studyHistory: [],
  }) as unknown as KnowledgeState;

describe('lineCurriculum', () => {
  it('counts a concept under its PRIMARY line, not under every line it names', () => {
    const rows = lineCurriculum(
      [holon('a', 'Cognitive', ['Emotional'])],
      knowledgeOf({ a: 'applied' }),
    );
    const cog = rows.find((r) => r.line === 'Cognitive')!;
    const emo = rows.find((r) => r.line === 'Emotional')!;
    expect(cog.primary).toBe(1);
    expect(cog.secondary).toBe(0);
    expect(emo.primary).toBe(0);
    // The cross-domain link is still recorded — canon §3.1:108 is about the SECONDARY relationship.
    expect(emo.secondary).toBe(1);
  });

  it('every line is present even with no concepts — a missing row reads as "not supported"', () => {
    const rows = lineCurriculum([], undefined);
    expect(rows).toHaveLength(ALL_LINES.length);
    expect(rows.map((r) => r.line)).toEqual([...ALL_LINES]);
    expect(rows.every((r) => r.total === 0 && r.coverage === 0)).toBe(true);
  });

  it('byDepth keys are exactly the canonical depth levels, zero-filled', () => {
    const rows = lineCurriculum([holon('a', 'Cognitive')], knowledgeOf({ a: 'applied' }));
    const cog = rows.find((r) => r.line === 'Cognitive')!;
    expect(Object.keys(cog.byDepth).sort()).toEqual([...ALL_DEPTH_LEVELS].sort());
    expect(cog.byDepth.applied).toBe(1);
    expect(cog.byDepth.absent).toBe(0);
  });

  it('an UNREACHED concept counts as absent and drags coverage down', () => {
    // The distinction the view exists to show: "you have met 3 concepts" is not "you have reached 3".
    const rows = lineCurriculum(
      [holon('a', 'Cognitive'), holon('b', 'Cognitive'), holon('c', 'Cognitive'), holon('d', 'Cognitive')],
      knowledgeOf({ a: 'applied', b: 'applied' }),
    );
    const cog = rows.find((r) => r.line === 'Cognitive')!;
    expect(cog.total).toBe(4);
    expect(cog.byDepth.absent).toBe(2);
    expect(cog.coverage).toBe(0.5);
  });

  it('no knowledge at all means every concept is absent, not zero concepts', () => {
    const rows = lineCurriculum([holon('a', 'Cognitive')], undefined);
    const cog = rows.find((r) => r.line === 'Cognitive')!;
    expect(cog.total).toBe(1);
    expect(cog.byDepth.absent).toBe(1);
    expect(cog.coverage).toBe(0);
  });

  it('POSITIVE CONTROL over the WHOLE corpus — not one hand-built holon', () => {
    // THE TEST THAT MATTERS FOR VIEWS 3-5. The defect was not one wrong field read once; it was a
    // module whose fixtures SHARED the mistake, so 23 green tests sat on a function that returned all
    // zeros against every real holon. A single-holon assertion can be satisfied by a lucky fixture;
    // this one runs the real registry and checks the arithmetic end to end.
    //
    // It goes RED if a future view reads `holon.dev` again, because the totals would collapse to zero
    // while the fixture-based tests beside it keep passing.
    seedCurriculumRegistry();
    const registry = getCurriculumRegistry();
    const holons = registry.getAll();
    expect(holons.length).toBeGreaterThan(100);

    const rows = lineCurriculum(holons, knowledgeOf({}));
    const claimed = holons.filter((h) => h.devMapping?.primaryLine).length;
    const counted = rows.reduce((n, r) => n + r.total, 0);

    // NO non-canonical line remains. `bio.ecology` carried `"Naturalist"`, which is in no canon
    // document — `docs/foundations/03` §5 records "ecological intelligence [is a] defensible additional
    // line. Mysterium's decision: hold to eight in MVP" and names it as NOT adopted, so the CORPUS was
    // wrong and is corrected to `Interpersonal`: the line canon 03:106 gives "attune, signal, support,
    // rally", which is what the holon's own description exercises ("every population is both
    // constrained by and constitutive of its community").
    //
    // `total` is a LINE-SLOT count, not a holon count — a concept with two secondary lines contributes
    // to two lines, which is the whole point of the cross-domain count.
    //
    // This assertion was `toBe(1)` while the defect was live and is `toBe(0)` after the fix. A test that
    // re-asserts a corrected defect as expected would hold the defect in place; this one goes RED if a
    // retired line ever returns.
    const nonCanonical = holons.filter((h) => {
      const lines = [h.devMapping?.primaryLine, ...(h.devMapping?.secondaryLines ?? [])];
      return lines.some((l) => typeof l === 'string' && !(ALL_LINES as readonly string[]).includes(l));
    });
    const slots = holons.reduce((n, h) => n + 1 + (h.devMapping?.secondaryLines?.length ?? 0), 0);
    expect(nonCanonical.length, 'a corpus holon names a line the theory does not have').toBe(0);
    expect(counted, 'a line slot was counted against no line').toBe(slots);
    expect(rows.reduce((n, r) => n + r.primary, 0), 'no primary line was read from the corpus').toBe(claimed);
    expect(rows.some((r) => r.primary > 0), 'every line came back empty — the wrong field again').toBe(true);
  });

  it('reads devMapping, the field the corpus ACTUALLY carries', () => {
    // THE REGRESSION THIS PINS. The module read `holon.dev?.primaryLine`; the corpus carries
    // `devMapping.primaryLine`. Every line came back empty against the real 113 holons while these
    // tests passed on a fixture that had the same wrong field. Asserting against a real seeded holon
    // is the only version of this test that could have caught it.
    const real = seedCorpusHolon();
    expect(real.devMapping.primaryLine).toBeDefined();
    const rows = lineCurriculum([real], knowledgeOf({ [real.id]: 'applied' }));
    const owner = rows.find((r) => r.line === real.devMapping.primaryLine)!;
    expect(owner.total, 'the real corpus holon was counted against no line at all').toBe(1);
    expect(owner.byDepth.applied).toBe(1);
  });

  it('a concept naming its primary line as secondary is counted ONCE', () => {
    const rows = lineCurriculum([holon('a', 'Cognitive', ['Cognitive'])], knowledgeOf({ a: 'applied' }));
    const cog = rows.find((r) => r.line === 'Cognitive')!;
    expect(cog.total).toBe(1);
    expect(cog.primary + cog.secondary).toBe(1);
  });
});

describe('radarPoints', () => {
  const altitudes = Object.fromEntries(ALL_LINES.map((l) => [l, 'Orange'])) as Record<Line, Stage>;

  it('one point per line, in canonical order — the shape is comparable between players', () => {
    const pts = radarPoints(altitudes, 360, ALL_STAGES.length);
    expect(pts).toHaveLength(ALL_LINES.length);
    expect(pts.map((p) => p.line)).toEqual([...ALL_LINES]);
  });

  it('a HIGHER stage sits FURTHER from the centre', () => {
    const low = radarPoints(
      { ...altitudes, Cognitive: 'Red' } as Record<Line, Stage>, 360, ALL_STAGES.length,
    );
    const high = radarPoints(
      { ...altitudes, Cognitive: 'Turquoise' } as Record<Line, Stage>, 360, ALL_STAGES.length,
    );
    const r = (p: { x: number; y: number }) => Math.hypot(p.x - 180, p.y - 180);
    expect(r(high[0]!)).toBeGreaterThan(r(low[0]!));
  });

  it('every coordinate is finite — a NaN here renders an empty svg and looks like a load failure', () => {
    const pts = radarPoints(altitudes, 360, ALL_STAGES.length);
    expect(pts.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y))).toBe(true);
  });

  it('a line absent from the altitudes reads as the floor rather than NaN', () => {
    const partial = { Cognitive: 'Amber' } as unknown as Record<Line, Stage>;
    const pts = radarPoints(partial, 360, ALL_STAGES.length);
    expect(pts).toHaveLength(ALL_LINES.length);
    expect(pts.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y))).toBe(true);
  });
});

describe('radarPath', () => {
  it('closes the shape', () => {
    expect(radarPath([{ x: 0, y: 0 }, { x: 10, y: 0 }])).toMatch(/^M 0 0 L 10 0 Z$/);
  });

  it('a single point is a dot — no NaN coordinates from an undefined rest', () => {
    const d = radarPath([{ x: 5, y: 6 }]);
    // The exact spacing is cosmetic; what must hold is that there is no NaN and the path is closed.
    expect(d).not.toContain('NaN');
    expect(d).toMatch(/^M 5 6\s+Z$/);
  });

  it('the empty-input branch is NOT a reached safety net, and this says so', () => {
    // `radarPath([]) === ''` used to be asserted as if the branch mattered. It cannot be reached from
    // the component: `radarPoints` maps over `ALL_LINES`, so it returns 8 points for every input and
    // the `d=""` path never renders. A test that certifies an unreachable branch is decoration that
    // reads as coverage — the same shape as the two dead decay guards deleted from `paceProjection`.
    //
    // So the assertion is replaced rather than kept: this pins the fact that makes the branch dead, so
    // if `radarPoints` ever becomes fallible the test fails HERE and the branch gets a real caller
    // instead of silently staying unreachable.
    const altitudes = Object.fromEntries(ALL_LINES.map((l) => [l, 'Infrared'])) as Record<Line, Stage>;
    for (const ringCount of [ALL_STAGES.length, 4, 1]) {
      expect(radarPoints(altitudes, 400, ringCount).length, 'radarPoints became fallible').toBe(ALL_LINES.length);
    }
  });
});

describe('depthSummary — canon §3.1:110', () => {
  const row = (byDepth: Partial<Record<DepthLevel, number>>): LineCurriculum => ({
    line: 'Cognitive', primary: 0, secondary: 0, total: 0, coverage: 0,
    byDepth: Object.fromEntries(ALL_DEPTH_LEVELS.map((d) => [d, byDepth[d] ?? 0])) as Record<DepthLevel, number>,
  });

  it('reads DEEPEST FIRST, in the canon\'s own voice', () => {
    // `33 §3.1:110`: "Your Cognitive line: 12 concepts at 'applied', 5 at 'comprehended', 3 at
    // 'memorized'". Printing in `ALL_DEPTH_LEVELS` order (ascending) puts the biggest number LAST,
    // which reads as noise. The order is a reading decision, so it is stated and tested.
    expect(depthSummary(row({ applied: 12, comprehended: 5, memorized: 3 })))
      .toBe('12 at applied, 5 at comprehended, 3 at memorized');
  });

  it('omits absent — "6 concepts absent" is noise on a reach dashboard', () => {
    expect(depthSummary(row({ applied: 1, absent: 6 }))).toBe('1 at applied');
  });

  it('says so plainly when nothing has been reached', () => {
    expect(depthSummary(row({ absent: 4 }))).toBe('no concepts reached yet');
  });

  it('carries NO closed-register vocabulary — G55 guards templates, this guards the arithmetic', () => {
    // `AGENTS.md` §5.4: polarity, shadow, ray profile, harvest verdict, delegation inference are
    // never player-readable. A count string is exactly the kind of place a quadrant name would slip in.
    const s = depthSummary(row({ applied: 2, transformed: 1 }));
    for (const closed of [
      'polarity', 'shadow', 'quadrant', 'DarkAddiction', 'GoldenAllergy', 'DarkAllergy',
      'GoldenAddiction', 'rayProfile', 'harvest', 'crystallization',
    ]) {
      expect(s.toLowerCase()).not.toContain(closed.toLowerCase());
    }
  });
});

describe('crossDomainLinks — canon §3.1:107-108', () => {
  it('produces a REAL edge: from and to can differ', () => {
    // THE DEFECT. The first version returned `{from: line, to: line}` — a number wearing a from and a
    // to, saying nothing. The claim of the view is that one line FEEDS another.
    const links = crossDomainLinks(
      [holon('ethics', 'Moral', ['Emotional'])],
      knowledgeOf({ ethics: 'analyzed' }),
    );
    expect(links).toHaveLength(1);
    expect(links[0]!.from).toBe('Moral');
    expect(links[0]!.to).toBe('Emotional');
    expect(links[0]!.from).not.toBe(links[0]!.to);
  });

  it('counts several concepts on one edge', () => {
    const links = crossDomainLinks(
      [holon('a', 'Moral', ['Emotional']), holon('b', 'Moral', ['Emotional'])],
      knowledgeOf({ a: 'analyzed', b: 'applied' }),
    );
    expect(links[0]!.count).toBe(2);
    expect(links[0]!.concepts).toEqual(['a', 'b']);
  });

  it('never links a line to itself', () => {
    const links = crossDomainLinks([holon('a', 'Cognitive', ['Cognitive'])], knowledgeOf({ a: 'applied' }));
    expect(links).toEqual([]);
  });

  it('ignores concepts the learner has not reached', () => {
    // Form-correct and factually false: a concept at `absent` is not strengthening anything.
    const links = crossDomainLinks(
      [holon('a', 'Moral', ['Emotional'])],
      knowledgeOf({ a: 'absent' }),
    );
    expect(links).toEqual([]);
  });

  it('sorts strongest first, then by canonical line order for a stable tie', () => {
    const links = crossDomainLinks(
      [
        holon('a', 'Moral', ['Emotional']),
        holon('b', 'Spiritual', ['Cognitive']),
        holon('c', 'Spiritual', ['Cognitive']),
      ],
      knowledgeOf({ a: 'applied', b: 'applied', c: 'applied' }),
    );
    expect(links.map((l) => l.count)).toEqual([2, 1]);
  });

  it('is empty for a corpus with no secondary assignments', () => {
    expect(crossDomainLinks([holon('a', 'Cognitive')], knowledgeOf({ a: 'applied' }))).toEqual([]);
  });
});
