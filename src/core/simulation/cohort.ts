// @script-status: wired — consumed by scripts/cohort-run.ts (`--generate N --seed S`).
/**
 * The cohort — the curated personas plus a generated parameter space.
 *
 * Spec: `docs/DEVELOPMENT-PLAN.md` §4 Phase 15 d2.
 *
 * ## Why a generator and not more curated cases
 *
 * The 10 kernel personas are *named* cases: each one is a hypothesis ("the therapy arc resolves its
 * shadow", "the golden-bypass persona must never cross the transformation threshold"). They are the
 * right fixture for a gate, which must ask a yes/no question about a specific claim. They are the
 * wrong fixture for calibration, which must ask *where the boundaries are* — and a boundary cannot be
 * located by adding more points that were each chosen by hand. A parameter space can: hold every
 * dimension fixed, vary one, and read where the observable changes.
 *
 * So the curated 10 stay exactly as they are, and the generator adds a cohort derived from DECLARED
 * dimensions. Two consequences worth stating:
 *
 *  - **Every generated persona is reproducible from `(seed, index)`** — the same seed yields the same
 *    cohort, byte for byte, which is what lets a gate assert over a population without a fixture list.
 *  - **Every dimension is independently settable**, including "hold all but one". That is the property
 *    a boundary search needs and a curated set cannot have.
 *
 * ## The dimensions, and why each one is a dimension
 *
 * | Dimension | What varying it tests |
 * |---|---|
 * | `altitudes` + `currentStage` | whether progression and theta behave as altitude moves |
 * | `driveTilt` | which drive the persona's signals fixate — `driveFixation` is the observable |
 * | `shadowQuadrant` | whether the four quadrants accumulate differently (the finding d1 surfaced) |
 * | `stance` | engaged / avoiding / bypassing — the response shape, independent of the above |
 * | `cadence` | sessions per virtual week, i.e. theta-decay between sessions |
 * | `neglectLines` | which developmental lines go untouched — theta-decay ON those lines only |
 *
 * `neglectLines` deserves its note: the scheduler chooses the line, so a persona cannot decline to be
 * OFFERED a line's encounter. What it can do is decline the offer — so a neglected line's encounters
 * are answered with an empty narrative (the engine's avoidance path), which is what neglect actually
 * looks like and what the theta-decay assertion needs to observe.
 */
import type { Line } from '../domain/Line.js';
import { ALL_LINES } from '../domain/Line.js';
import type { Stage } from '../domain/Stage.js';
import { ALL_STAGES } from '../domain/Stage.js';
import { ALL_DRIVES } from '../domain/Drive.js';
import type { Drive } from '../domain/Drive.js';
import type { DriveDirectionality, ShadowQuadrant } from '../domain/enums.js';
import { policy, type PersonaSpec, type ResponsePolicy } from '../validation/personas.js';
import { mulberry32, hashSeed } from '../usecases/RandomSource.js';

/** The declared dimensions a generated persona is built from. */
export interface CohortDimensions {
  /** One stage per line. `currentStage` is derived as the most common (the modal altitude). */
  readonly altitudes: Record<Line, Stage>;
  /** The drive this persona's signals fixate on, and in which direction. Null = balanced. */
  readonly driveTilt: { readonly drive: Drive; readonly direction: DriveDirectionality } | null;
  /** The quadrant that surfaces, or null. */
  readonly shadowQuadrant: ShadowQuadrant | null;
  /** How often the shadow surfaces: a step predicate would be opaque; a rate is a single number. */
  readonly shadowRate: number;
  readonly stance: 'engaged' | 'avoiding' | 'bypassing';
  /** Sessions per virtual week — converted to an inter-session gap. */
  readonly cadence: number;
  readonly sessions: number;
  readonly encountersPerSession: number;
  /** Lines this persona declines: their encounters are answered with avoidance (see the module doc). */
  readonly neglectLines: readonly Line[];
}

/** A generated persona carries its dimensions, so a report can group by axis rather than by name. */
export interface CohortPersona extends PersonaSpec {
  readonly generated: true;
  readonly dimensions: CohortDimensions;
}

const STANCES: readonly CohortDimensions['stance'][] = ['engaged', 'avoiding', 'bypassing'];

/** Pick one element deterministically. */
function pick<T>(rng: () => number, xs: readonly T[]): T {
  return xs[Math.floor(rng() * xs.length) % xs.length]!;
}

/**
 * Derive the dimensions for cohort member `index`.
 *
 * `overrides` is the boundary-search affordance: pass the axis under study and every other dimension
 * is still derived from the seed, so a swept run varies exactly one thing.
 */
export function dimensionsFor(seed: number, index: number, overrides: Partial<CohortDimensions> = {}): CohortDimensions {
  const rng = mulberry32(seed + hashSeed(`cohort-${index}`));

  const altitudes = {} as Record<Line, Stage>;
  for (const line of ALL_LINES) altitudes[line] = pick(rng, ALL_STAGES);

  const tiltDrive = pick(rng, ALL_DRIVES);
  const tiltDirection = pick(rng, ['DarkAddicted', 'DarkAverted', 'GoldenAddicted', 'GoldenAverted'] as const);
  const quadrant = pick(rng, ['DarkAddiction', 'DarkAllergy', 'GoldenAddiction', 'GoldenAllergy'] as const);

  const generated: CohortDimensions = {
    altitudes,
    driveTilt: { drive: tiltDrive, direction: tiltDirection },
    shadowQuadrant: quadrant,
    shadowRate: Math.round(rng() * 4) / 10,
    stance: pick(rng, STANCES),
    cadence: 1 + Math.floor(rng() * 4),
    sessions: 2 + Math.floor(rng() * 4),
    encountersPerSession: 3 + Math.floor(rng() * 3),
    neglectLines: rng() < 0.5 ? [pick(rng, ALL_LINES)] : [],
  };
  return { ...generated, ...overrides };
}

/** The stage a persona's altitudes are centred on — the modal value, ties broken by ladder order. */
function modalStage(altitudes: Record<Line, Stage>): Stage {
  const counts = new Map<Stage, number>();
  for (const line of ALL_LINES) {
    const s = altitudes[line];
    counts.set(s, (counts.get(s) ?? 0) + 1);
  }
  let best: Stage = ALL_STAGES[0]!;
  let bestCount = -1;
  for (const stage of ALL_STAGES) {
    const c = counts.get(stage) ?? 0;
    if (c > bestCount) { best = stage; bestCount = c; }
  }
  return best;
}

/**
 * The response policy for a generated persona.
 *
 * The three stances are deliberately the SAME three the kernel's curated personas use (`policy(...)`
 * with drives / shadow / avoidance), so a generated persona is not a new kind of player — it is the
 * curated kind at a different point in the space. A generator with its own response semantics would
 * make every population finding incomparable with the named cases.
 */
function policyFor(dims: CohortDimensions): ResponsePolicy {
  const drives: Partial<Record<Drive, DriveDirectionality>> = {};
  if (dims.driveTilt) drives[dims.driveTilt.drive] = dims.driveTilt.direction;

  const base = policy({
    drives: dims.driveTilt ? drives : undefined,
    surfaceShadow: dims.shadowQuadrant
      ? (step) => {
          // A rate, not a coin flip: `step % period` is stable across runs and lets a report count
          // the surfacings it expected.
          const period = dims.shadowRate > 0 ? Math.max(1, Math.round(1 / dims.shadowRate)) : 0;
          if (period === 0) return null;
          return step % period === 0 ? dims.shadowQuadrant : null;
        }
      : null,
    words: dims.stance === 'engaged' ? 45 : 0,
  });

  return (encounter, step) => {
    // Neglect is a property of the LINE, so it is decided per-encounter — and it OVERRIDES the stance,
    // because a persona that declines a line declines it whether or not it is otherwise engaged.
    const line = encounter.targetLines[0];
    if (line && dims.neglectLines.includes(line)) {
      return { ...policy({ words: 0 })(encounter, step) };
    }
    const response = base(encounter, step);
    if (dims.stance === 'bypassing') {
      // Spiritual bypass as the kernel persona models it: success-shaped signals while a golden
      // shadow accumulates — the shape must match `golden-bypass`, or the generated population is
      // not comparable with the named case.
      return { ...response, stageOrientation: 'ReachingHigher', sourceOfNourishment: 'HigherRealm' };
    }
    return response;
  };
}

/**
 * Build cohort member `index` from `seed`.
 *
 * The name is derived (`gen-<seed>-<index>`) rather than chosen, so a report row identifies the exact
 * generator call that produced it — a name a human typed would be a claim about the dimensions that
 * nothing verifies.
 */
export function generatePersona(seed: number, index: number, overrides: Partial<CohortDimensions> = {}): CohortPersona {
  const dimensions = dimensionsFor(seed, index, overrides);
  const currentStage = modalStage(dimensions.altitudes);
  const gapDays = 7 / dimensions.cadence;
  const gapDaysBeforeSession: Record<number, number> = {};
  for (let s = 1; s < dimensions.sessions; s++) gapDaysBeforeSession[s] = gapDays;

  return {
    generated: true,
    dimensions,
    name: `gen-${seed}-${index}`,
    description:
      `generated: stage=${currentStage} tilt=${dimensions.driveTilt ? `${dimensions.driveTilt.drive}:${dimensions.driveTilt.direction}` : 'balanced'} ` +
      `shadow=${dimensions.shadowQuadrant ?? 'none'}@${dimensions.shadowRate} stance=${dimensions.stance} ` +
      `cadence=${dimensions.cadence}/wk neglect=${dimensions.neglectLines.join(',') || 'none'}`,
    roleFocus: 'Generated',
    altitudes: dimensions.altitudes,
    currentStage,
    policy: policyFor(dimensions),
    expectations: {},
    trajectory: {
      sessions: dimensions.sessions,
      encountersPerSession: dimensions.encountersPerSession,
      gapDaysBeforeSession,
    },
  };
}

/**
 * Generate `count` cohort members from `seed`.
 *
 * `overrides` applies to EVERY member, which is what makes a single-axis sweep a one-line change:
 * `generateCohort({ count: 40, seed: 7, overrides: { stance: 'engaged' } })` holds the stance and
 * still varies everything else by seed.
 */
export function generateCohort(options: {
  readonly count: number;
  readonly seed: number;
  readonly overrides?: Partial<CohortDimensions>;
  readonly startIndex?: number;
}): readonly CohortPersona[] {
  const start = options.startIndex ?? 0;
  const out: CohortPersona[] = [];
  for (let i = 0; i < options.count; i++) {
    out.push(generatePersona(options.seed, start + i, options.overrides ?? {}));
  }
  return out;
}

/** The dimensions a report can group by — declared once so a reader and a writer agree. */
export const COHORT_AXES = ['currentStage', 'driveTilt', 'shadowQuadrant', 'stance', 'cadence', 'neglectLines'] as const;
export type CohortAxis = (typeof COHORT_AXES)[number];

/** The value of one axis for one member, as a comparable string (the grouping key). */
export function axisValue(persona: CohortPersona, axis: CohortAxis): string {
  const d = persona.dimensions;
  switch (axis) {
    case 'currentStage': return persona.currentStage;
    case 'driveTilt': return d.driveTilt ? `${d.driveTilt.drive}:${d.driveTilt.direction}` : 'balanced';
    case 'shadowQuadrant': return d.shadowQuadrant ?? 'none';
    case 'stance': return d.stance;
    case 'cadence': return String(d.cadence);
    case 'neglectLines': return [...d.neglectLines].sort().join(',') || 'none';
  }
}
