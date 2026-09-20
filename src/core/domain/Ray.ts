/**
 * Ray — the seven Law-of-One energy rays, and the LENS they form over the altitude ladder.
 *
 * Canon home: docs/foundations/06 (the 8-stage / 7-ray correspondence, §5, §5.1).
 * KosmOS source: `_Ontology/lenses/rays.md` (the altitude → ray mapping) and
 * `_Ontology/stages/altitude.md` (the altitudes themselves).
 *
 * THE AXES ARE SEPARATE FRAMEWORKS, NEVER CONFLATED (06 §5.1, 44 axis table, KosmOS
 * `framework-density.md` §"Three axes, never conflated", CONSTITUTION rule 13):
 *
 *   1. ALTITUDE — the developmental ladder (`Stage.ts`): Infrared … Teal (L7), Turquoise (L8).
 *      Quality-bearing: each altitude has its own emergent order and markers (`StageQuality`).
 *   2. RAY LENS — the Law-of-One overlay this module holds. Per `lenses/rays.md` it is
 *      "a lens, never a place": the same altitudes read through the 7-ray energy-centre system,
 *      with NINE sub-octave positions (Blue 5a/5b, Indigo 6a/6b). Optional; not the scale
 *      diagnosis runs on.
 *   3. ENERGY-RAY-CENTRE PROFILE — the seven centres that exist SIMULTANEOUSLY in every holon
 *      (`Significator.rayProfile`, a 7-element vector). Structural, not positional. This is why
 *      `Ray` names serve the profile too: the names are shared, the roles are not.
 *
 * The practical consequence, and the reason this file is shaped as it is: **Teal and Turquoise
 * are the same ray at two sub-octave positions** (Indigo 6a "gateway opens" / 6b "gateway
 * traversed"). The ladder distinguishes them by QUALITY, and the lens distinguishes them by
 * POSITION — never by giving one of them the Violet ray. The Violet ray (7th) is the CLOSURE
 * EVENT's position, not a stage's: it is the harvest into D4, and Mysterium models it as an
 * event (`CLOSURE_BINDING`), because there is no ninth stage.
 */
import type { Stage } from './Stage.js';
import { ALL_STAGES } from './Stage.js';
import type { Complex } from './Line.js';

export type Ray = 'Red' | 'Orange' | 'Yellow' | 'Green' | 'Blue' | 'Indigo' | 'Violet';

export type BlueFlow = 'in' | 'out';

export const ALL_RAYS: readonly Ray[] = [
  'Red',
  'Orange',
  'Yellow',
  'Green',
  'Blue',
  'Indigo',
  'Violet',
];

/**
 * The nine within-D3 sub-octave positions of the ray lens. Seven rays, with Blue and Indigo
 * each spanning two positions — Blue 5a/5b because the co-Creator both receives (Orange,
 * inflowing) and radiates (Green, outflowing); Indigo 6a/6b because the gateway first opens
 * (Teal) and is then traversed (Turquoise). Position count (9) > ray count (7) is exactly what
 * lets two altitudes share a ray and stay distinguishable.
 */
export type SubOctave = '1st' | '2nd' | '3rd' | '4th' | '5a' | '5b' | '6a' | '6b' | '7th';

export const ALL_SUB_OCTAVES: readonly SubOctave[] = [
  '1st',
  '2nd',
  '3rd',
  '4th',
  '5a',
  '5b',
  '6a',
  '6b',
  '7th',
];

/** One position in the ray lens. A lens, never a place. */
export interface RayBinding {
  readonly ray: Ray;
  readonly subOctave: SubOctave;
  /** What the lens reads this position as doing (`06 §5`, KosmOS `lenses/rays.md`). */
  readonly rayFunction: string;
  /** The subtle vehicle carried at this position. */
  readonly subtleBody: string;
  /** Required when `ray === 'Blue'` — the co-Creator's direction of flow. */
  readonly blueFlow?: BlueFlow;
}

/**
 * The ray lens over the eight altitudes — canon `06 §5`, KosmOS `lenses/rays.md`.
 *
 * Teal and Turquoise BOTH read Indigo. Giving Turquoise the Violet ray (which this codebase did
 * while stage 8 was named `White`) merged the altitude framework with the ray framework: the
 * Violet position is the harvest event, one rung past the end of the ladder.
 */
export const RAY_LENS: Readonly<Record<Stage, RayBinding>> = {
  Infrared: {
    ray: 'Red',
    subOctave: '1st',
    rayFunction: 'Foundation / survival',
    subtleBody: 'Chemical body',
  },
  Magenta: {
    ray: 'Orange',
    subOctave: '2nd',
    rayFunction: 'Emotional identity',
    subtleBody: 'Physical-complex body',
  },
  Red: {
    ray: 'Yellow',
    subOctave: '3rd',
    rayFunction: 'Ego / will / power',
    subtleBody: 'Physical vehicle',
  },
  Amber: {
    ray: 'Green',
    subOctave: '4th',
    rayFunction: 'Heart-opening (ethnocentric)',
    subtleBody: 'Astral body',
  },
  Orange: {
    ray: 'Blue',
    subOctave: '5a',
    blueFlow: 'in',
    rayFunction: 'Co-Creator: receive wisdom',
    subtleBody: 'Devachanic (light) body',
  },
  Green: {
    ray: 'Blue',
    subOctave: '5b',
    blueFlow: 'out',
    rayFunction: 'Co-Creator: radiate self',
    subtleBody: 'Devachanic (light) body',
  },
  Teal: {
    ray: 'Indigo',
    subOctave: '6a',
    rayFunction: 'Gateway opens — vision-logic',
    subtleBody: 'Etheric (form-maker) body',
  },
  Turquoise: {
    ray: 'Indigo',
    subOctave: '6b',
    rayFunction: 'Gateway traversed — adept; harvest readiness',
    subtleBody: 'Etheric (form-maker) body',
  },
};

/**
 * The Violet-ray position (7th) — the CLOSURE EVENT, not a stage.
 *
 * `06 §5` lists it in the same table as the altitudes with the note *(closure, not a stage)*:
 * "the total expression; the D3→D4 horizon event". `lenses/rays.md` calls it "total integration /
 * harvest", carrying the Buddha body. Mysterium has no ninth stage, so this binding is addressed
 * by the closure rather than by an altitude — see `19 §9` (the Choice) and `16 §11.5`.
 *
 * The harvest is assessed HERE, and the assessment is a *rainbow-distinctness* one: a Violet
 * expression "tinged with a distinct green/blue/indigo rainbow … each color distinct, none
 * bypassed" (`lenses/rays.md` → "Harvest condition"). That is why `rayProfile.Violet` is an
 * independently accumulated quantity rather than a lookup of the top stage's ray, and why
 * checking the Violet total alone is not the condition (CHOICE-CLOSURE).
 */
export const CLOSURE_BINDING: RayBinding = {
  ray: 'Violet',
  subOctave: '7th',
  rayFunction: 'Total integration — the D3→D4 harvest',
  subtleBody: 'Buddha body',
};

/**
 * Canonical stage → ray correspondence.
 *
 * DERIVED from `RAY_LENS`, never restated: this flat view exists because
 * `ConsequenceEngine` / `PriorityComputation` / `TransformationDetector` index it directly, and
 * a second hand-maintained copy of the mapping is precisely how the conflation above survived
 * (a flat map cannot express that two stages share a ray, so the missing distinction gets
 * absorbed by inventing one).
 */
export const STAGE_RAY_MAP: Readonly<Record<Stage, Ray>> = Object.freeze(
  Object.fromEntries(ALL_STAGES.map(s => [s, RAY_LENS[s].ray])) as Record<Stage, Ray>,
);

/** Blue-flow direction, derived from the lens for the same reason as `STAGE_RAY_MAP`. */
export const STAGE_BLUE_FLOW: Readonly<Partial<Record<Stage, BlueFlow>>> = Object.freeze(
  Object.fromEntries(
    ALL_STAGES.filter(s => RAY_LENS[s].blueFlow !== undefined).map(s => [s, RAY_LENS[s].blueFlow]),
  ) as Partial<Record<Stage, BlueFlow>>,
);

/**
 * Reverse lens lookup: which altitude occupies a given (ray, sub-octave) position?
 * Returns `undefined` for the closure position, which has no altitude.
 */
export function stageAtRayPosition(ray: Ray, subOctave: SubOctave): Stage | undefined {
  return ALL_STAGES.find(s => RAY_LENS[s].ray === ray && RAY_LENS[s].subOctave === subOctave);
}

/**
 * True when two stages occupy the SAME ray (Teal/Turquoise, Orange/Green). A ray-transition
 * signal cannot distinguish these pairs — the ladder's own quality axis does (see
 * `StageQuality`), which is why `TransformationDetector` must not treat a same-ray step as a
 * ray transition.
 */
export function sameRay(a: Stage, b: Stage): boolean {
  return RAY_LENS[a].ray === RAY_LENS[b].ray;
}

/**
 * GAP-D2-1 (per HoloOS 08.8.22): Energy-Ray-Center → Complex mapping.
 * The 7 energy-ray-centers are organized into three structural complexes
 * that map to the three realms:
 *   - Body  (Red/Orange/Yellow) ↔ Gross   (physical substrate)
 *   - Mind  (Green/Blue)        ↔ Subtle  (archetypal/cognitive)
 *   - Spirit(Indigo/Violet)     ↔ Causal  (formless/transpersonal)
 *
 * This is DISTINCT from LINE_COMPLEX (which maps Lines to Complexes).
 * Both mappings coexist: Lines are the developmental streams; Rays are the
 * structural energy-centers. A player has 8 Lines AND 7 Ray-Centers.
 */
export const RAY_COMPLEX: Readonly<Record<Ray, Complex>> = {
  Red: 'Body',
  Orange: 'Body',
  Yellow: 'Body',
  Green: 'Mind',
  Blue: 'Mind',
  Indigo: 'Spirit',
  Violet: 'Spirit',
};

/** All rays belonging to a given Complex. */
export function raysForComplex(complex: Complex): readonly Ray[] {
  return ALL_RAYS.filter(r => RAY_COMPLEX[r] === complex);
}
