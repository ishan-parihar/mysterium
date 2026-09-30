import { ALL_LINES, type Line } from '$core/domain/Line.js';
import { stageOrdinal, type Stage } from '$core/domain/Stage.js';
import { ALL_DEPTH_LEVELS, type CurriculumHolon, type DepthLevel, type KnowledgeState } from '$core/curriculum/types.js';

/**
 * Developmental Radar — canon `33 §3.1` View 2, rendered "with curriculum data".
 *
 * THE SHAPE THIS ESTABLISHES. `33 §4.2:253` names this view as an "extension of existing radar
 * component with curriculum data", and `/profile` already draws an 8-line altitude radar inline. What
 * was missing is the curriculum half, which canon names three ways:
 *
 *   - which subjects exercise each line (`33 §3.1:104-106`)
 *   - cross-domain strengthening, from `dev.primaryLine` / `dev.secondaryLines` (`:107-108`)
 *   - the depth-level distribution of concepts per line (`:109-110`)
 *
 * WHY A PURE MODULE. `KnowledgeMap` shipped its geometry inside three `$derived.by` closures, untested,
 * and Views 2-5 were about to copy that four times. MY-AD-0035 sets the bar: a view with no extracted
 * pure module is not finished. So the arithmetic lives here, the component draws it, and neither is
 * tested through the other.
 *
 * READ-REGISTER DISCIPLINE (`AGENTS.md` §5.4, `20` §11.1). Line and altitude are OPEN register: a
 * player may see which line they are working and how far along it they are. The CLOSED class is
 * polarity, shadow quadrants, ray profile, harvest verdict and delegation inference. Nothing in this
 * module may reach a label from that class — `33 §3.1`'s own examples ("Physics (Orange)") are the
 * model: the line and the stage, nothing that names the scoring machinery behind them.
 */

/** One line's curriculum footprint. Counts are concepts, never a score. */
export interface LineCurriculum {
  readonly line: Line;
  /** Concepts whose PRIMARY line is this one. */
  readonly primary: number;
  /** Concepts listing this line among their SECONDARY lines — the cross-domain link canon names. */
  readonly secondary: number;
  /** Concepts at each depth, `absent` included so the bars sum to `total`. */
  readonly byDepth: Readonly<Record<DepthLevel, number>>;
  /** 0–1, `reached / total`. A breadth measure, deliberately not a score. */
  readonly coverage: number;
  readonly total: number;
}

function emptyDepth(): Record<DepthLevel, number> {
  return Object.fromEntries(ALL_DEPTH_LEVELS.map((d) => [d, 0])) as Record<DepthLevel, number>;
}

/**
 * A holon's line assignment, from `devMapping`.
 *
 * `primaryLine` and `secondaryLines` live inside `devMapping`, and BOTH ARE REQUIRED on
 * `CurriculumHolon` (`types.ts:254-257`). The first version of this module read `holon.dev?.primaryLine`
 * with an optional chain and a docblock about "legacy holons authored before devMapping" — a premise
 * with no evidence, and it read `undefined` against all 113 corpus holons, so every line came back
 * empty and every test passed on a hand-built fixture that agreed with the bug.
 *
 * That is the trap worth naming: a defensive `?.` on a REQUIRED field converts a type error into a
 * silent zero, and a test whose fixture shares the mistake cannot see it. The parameter is
 * `CurriculumHolon` now, so a wrong field name is a compile error rather than a blank dashboard.
 */
function lineOf(holon: CurriculumHolon): readonly Line[] {
  const { primaryLine, secondaryLines } = holon.devMapping;
  const out: Line[] = [];
  if (isLine(primaryLine)) out.push(primaryLine);
  for (const l of secondaryLines) if (isLine(l) && !out.includes(l)) out.push(l);
  return out;
}

function isLine(v: unknown): v is Line {
  return typeof v === 'string' && (ALL_LINES as readonly string[]).includes(v);
}

/**
 * NON-CANONICAL LINES ARE DROPPED, NOT ATTRIBUTED — and this is a corpus defect with a record, not a
 * tolerance.
 *
 * `bio.foundations.json`'s `bio.ecology` lists `"Naturalist"` among its `secondaryLines`. There is no
 * such line: the eight are Cognitive, Emotional, Moral, Intrapersonal, Spiritual, Somatic, Willpower,
 * Interpersonal (`docs/foundations/03`), and `git grep Naturalist -- docs/foundations` returns
 * NOTHING. So one holon names a capacity the theory does not have.
 *
 * WHY DROP RATHER THAN MAP. A default line would attribute an ecology concept to a capacity the corpus
 * never claimed, which is worse than omitting it: the count would be silently true-looking. Dropping
 * is also what keeps a view alive — without the guard, `tally.get('Naturalist')` is `undefined` and
 * the whole dashboard throws on one holon out of 113.
 *
 * The other two options are recorded as rejected: widen `ALL_LINES` (which would invent a ninth line
 * against canon §5.1) and make the throw the default (which trades a data defect for a blank page).
 * MY-RG-0035's sibling finding; the corpus repair is tracked against the `bio.ecology` record.
 */

/** The distribution of a learner's concepts across the eight lines. */
export function lineCurriculum(
  holons: readonly CurriculumHolon[],
  knowledge: KnowledgeState | undefined,
): readonly LineCurriculum[] {
  const depthOf = (id: string): DepthLevel => knowledge?.conceptStates.get(id)?.depthLevel ?? 'absent';

  const tally = new Map<Line, { primary: number; secondary: number; byDepth: Record<DepthLevel, number>; total: number }>();
  for (const line of ALL_LINES) {
    tally.set(line, { primary: 0, secondary: 0, byDepth: emptyDepth(), total: 0 });
  }

  for (const holon of holons) {
    const depth = depthOf(holon.id);
    for (const line of lineOf(holon)) {
      const row = tally.get(line)!;
      // `byDepth` is typed readonly for CONSUMERS; the tally is built mutable and frozen below.
      row.byDepth[depth] += 1;
      row.total += 1;
      // Primary is counted by the corpus, not inferred here: a concept that lists a line secondarily
      // has still not had that line exercised as its anchor.
      if (holon.devMapping.primaryLine === line) row.primary += 1;
      else row.secondary += 1;
    }
  }

  return ALL_LINES.map((line) => {
    const row = tally.get(line)!;
    return {
      line,
      primary: row.primary,
      secondary: row.secondary,
      byDepth: row.byDepth,
      total: row.total,
      coverage: row.total === 0 ? 0 : (row.total - row.byDepth.absent) / row.total,
    };
  });
}

/** Spoke order is the canonical line order, so the shape is comparable between players and runs. */
export function radarPoints(
  altitudes: Readonly<Record<Line, Stage>>,
  size: number,
  ringCount: number,
): { line: Line; stage: Stage; x: number; y: number }[] {
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 24;
  return ALL_LINES.map((line, i) => {
    const angle = (2 * Math.PI * i) / ALL_LINES.length - Math.PI / 2;
    const stage = altitudes[line] ?? 'Infrared';
    const r = radius * (stageOrdinal(stage) / (ringCount - 1));
    return { line, stage, x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  });
}

/** Closed SVG path through the eight points. `M` then `L` then `Z`; a single point is a dot, not a NaN. */
export function radarPath(points: readonly { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  const [first, ...rest] = points;
  if (!first) return '';
  return `M ${first.x} ${first.y} ${rest.map((p) => `L ${p.x} ${p.y}`).join(' ')} Z`;
}

/**
 * The three curriculum strings canon §3.1 asks for, per line.
 *
 * Counts, never percentages and never a score: "12 concepts at 'applied', 5 at 'comprehended'" is
 * `33 §3.1:110` almost verbatim, and the register is the point — a learner reads their own reach, not
 * a ranking. `absent` is omitted because "6 concepts absent" is noise on a dashboard whose job is to
 * show what has been reached.
 */
export function depthSummary(row: LineCurriculum): string {
  // DEEPEST FIRST, deliberately. `ALL_DEPTH_LEVELS` runs ascending (absent → transformed) and using
  // it directly prints "3 at memorized, 5 at comprehended, 12 at applied" — which reads as noise,
  // because the learner sees the biggest number last. Canon §3.1:110 writes it the other way round
  // ("12 concepts at 'applied', 5 at 'comprehended', 3 at 'memorized'") and the canon is describing
  // what a learner wants to read: where they have REACHED, first.
  const parts = [...ALL_DEPTH_LEVELS]
    .reverse()
    .filter((d) => d !== 'absent' && row.byDepth[d] > 0)
    .map((d) => `${row.byDepth[d]} at ${d}`);
  if (parts.length === 0) return 'no concepts reached yet';
  return `${parts.join(', ')}`;
}

/**
 * Cross-domain strengthening, canon §3.1:108 — "Studying Ethics (Moral line) is also strengthening
 * your Emotional line".
 *
 * A real from→to edge, from each concept's PRIMARY line to a line it also names. The first version
 * of this function returned `{from: line, to: line}` pairs, which is a number with a from and a to
 * and says nothing: the whole claim of the view is that one line feeds another, so an edge that
 * cannot differ at its endpoints cannot make it.
 *
 * Only SECONDARY links count, and only among concepts the learner has actually reached. A concept at
 * `absent` is not strengthening anything, and a link drawn from it would be canon-correct in form and
 * false in fact.
 */
export function crossDomainLinks(
  holons: readonly CurriculumHolon[],
  knowledge: KnowledgeState | undefined,
): readonly { from: Line; to: Line; count: number; concepts: readonly string[] }[] {
  const byPair = new Map<string, { from: Line; to: Line; concepts: string[] }>();
  for (const holon of holons) {
    const primary = holon.devMapping.primaryLine;
    if ((knowledge?.conceptStates.get(holon.id)?.depthLevel ?? 'absent') === 'absent') continue;
    for (const secondary of holon.devMapping.secondaryLines) {
      if (secondary === primary) continue;
      const key = `${primary}\u0000${secondary}`;
      const edge = byPair.get(key);
      if (edge) edge.concepts.push(holon.id);
      else byPair.set(key, { from: primary, to: secondary, concepts: [holon.id] });
    }
  }
  return [...byPair.values()]
    .map((e) => ({ ...e, count: e.concepts.length }))
    .sort((a, b) => b.count - a.count || ALL_LINES.indexOf(a.to) - ALL_LINES.indexOf(b.to));
}
