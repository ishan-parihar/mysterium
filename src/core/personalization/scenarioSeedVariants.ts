/**
 * Per-modality seed variants — 46 §2's modality axis applied to the authored scenario seeds
 * (`scenarioSeeds.ts`).
 *
 * One authored situation per cell is the canonical seed; the 7 game modalities (11) are 7 AXES
 * through which the SAME catalyst is delivered differently (AGENTS.md §5.8). A cell's Strategic
 * rendering and its ImmersiveRPG rendering are not two scenarios — they are two ANGLES on one
 * scenario: the same locus/cast/stakes at the same altitude, presented so the modality's
 * assessment surface is the one doing the work.
 *
 * This module binds each (cell × modality) to a deterministic ANGLE — a short authoring
 * directive that (a) tells the scenario-catalyst agent HOW to render the cell's seed in this
 * modality, and (b) records the modality's assessment register (11's modality×line affinity
 * compressed to the text the LLM conditions on). The directive is authored once per modality,
 * not per cell — the per-cell work stays in the seed, the per-modality work stays here, and the
 * product of the two is the per-(cell × modality) contextual seed. No duplication of seed prose
 * (uniqueness principle applied to content).
 */

import type { Modality } from '../domain/enums.js';

/** One modality's rendering angle: how its assessment surface takes over the seed. */
export interface ModalityAngle {
  readonly modality: Modality;
  /** How the seed's situation is presented so this modality measures the capacity. */
  readonly angle: string;
  /** What the player DOES — the assessment register the rendering must foreground. */
  readonly register: string;
}

/**
 * The 7 authored angles. Each is written so that combining it with ANY cell's seed produces a
 * coherent playable scene: the angle speaks about presentation and measurement register, never
 * about content (content is the seed's job — altitude is the seed's cell, flavour is its tags).
 */
export const MODALITY_ANGLES: readonly ModalityAngle[] = [
  {
    modality: 'Deterministic',
    angle: 'Present the situation as a fixed pattern with a correct structure hidden inside it — the scene offers the same inputs every time, and what varies is only how the player reads them.',
    register: 'The player responds by committing to a specific, checkable move. The developmental signal is precision under the seed\'s stakes.',
  },
  {
    modality: 'Strategic',
    angle: 'Present the situation as a board of forces two or more moves deep — the seed\'s stakes become a position, and the player sees the position before they act.',
    register: 'The player responds with a plan and its tradeoffs named. The developmental signal is choice of line under the seed\'s pressure.',
  },
  {
    modality: 'Embodied',
    angle: 'Present the situation as something the body is inside of — weather, rhythm, hunger, held breath. The seed\'s stakes are felt in tissue before they are thought.',
    register: 'The player responds by holding, enduring, or releasing in real time. The developmental signal is what the body does with the seed\'s demand.',
  },
  {
    modality: 'ScenarioChoice',
    angle: 'Present the situation as a fork already upon the player — the seed\'s cast speaks, the stakes are named, and the choice is live now, with costs visible on both tines.',
    register: 'The player responds by choosing and owning the cost. The developmental signal is which cost they can genuinely carry.',
  },
  {
    modality: 'LanguageReflective',
    angle: 'Present the situation as a question the seed\'s cast cannot answer without the player\'s own words — the scene is a mirror, and the stakes are answered in the first person.',
    register: 'The player responds in their own voice, at length if needed. The developmental signal is what their language does with the seed\'s edge.',
  },
  {
    modality: 'SocialCooperative',
    angle: 'Present the situation as something no single actor can resolve — the seed\'s cast and the player must coordinate, and the stakes bind them into one outcome.',
    register: 'The player responds by aligning, yielding, or leading within the group. The developmental signal is how they hold the we while keeping an I.',
  },
  {
    modality: 'ImmersiveRPG',
    angle: 'Present the situation as a world already in motion around the player — the seed\'s locus has texture, the cast has lives offscreen, and the stakes unfold over the scene\'s full depth.',
    register: 'The player responds in character, through action and dialogue. The developmental signal is who they become under the seed\'s pressure when no frame reminds them it is a game.',
  },
];

const BY_MODALITY: ReadonlyMap<Modality, ModalityAngle> = new Map(MODALITY_ANGLES.map((a) => [a.modality, a]));

/** The angle for a modality — total over ALL_MODALITIES (validated at construction). */
export function angleFor(modality: Modality): ModalityAngle {
  const a = BY_MODALITY.get(modality);
  if (!a) throw new Error(`modality angles: no angle for '${modality}' — 11's modalities are a closed set`);
  return a;
}

/**
 * The contextual seed for one (cell × modality): the authored seed's situation bound to the
 * modality's angle. This is the text the scenario-catalyst agent conditions on — the seed's
 * stage-coherent content and the modality's assessment register in one directive. Pure text
 * assembly; Veil-safe (seed prose is canon, angles carry no metrics).
 */
export function contextualSeed(
  seed: { readonly situation: string; readonly stakes: string; readonly cast: readonly string[] },
  modality: Modality,
): string {
  const a = angleFor(modality);
  const cast = seed.cast.join('; ');
  return [
    `Scene: ${seed.situation}`,
    `Present: ${cast}.`,
    `Rendering: ${a.angle}`,
    `At stake: ${seed.stakes}`,
    a.register,
  ].join('\n');
}
