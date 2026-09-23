/**
 * Seed accessors — the authored scenario/world/NPC seed for a cell, and the prompt block it renders to.
 *
 * Split out of `sessionRuntime.ts` (module-cohesion audit item 7) WITHOUT weakening the
 * single-seam rule (`M6`): `../sessionRuntime.ts` re-exports every symbol, so the seam is
 * still one import path for every caller. The split is a file change, not an interface change.
 */
import type { Line } from '../../domain/Line.js';
import type { Stage } from '../../domain/Stage.js';
import type { Modality } from '../../domain/enums.js';
import { SCENARIO_SEEDS, type ScenarioSeed } from '.././scenarioSeeds.js';
import { WORLD_SEEDS, type WorldSeed } from '.././worldSeeds.js';
import { NPC_SEEDS, type NpcSeed } from '.././npcSeeds.js';
import { contextualSeed } from '.././scenarioSeedVariants.js';

// ── The authored contextual seed (46 §2 × 11 — the cell's canonical situation, rendered) ────

/** The authored seed for a cell, or undefined (a cell without an authored seed is a content gap
 * the calibration harness reports — the runtime degrades rather than fabricates). */
export function scenarioSeedFor(line: Line, stage: Stage, seeds: readonly ScenarioSeed[] = SCENARIO_SEEDS): ScenarioSeed | undefined {
  return seeds.find((s) => s.line === line && s.stage === stage);
}

/**
 * The contextual seed text for this encounter: the authored seed bound to the modality's angle
 * (`scenarioSeedVariants.ts`). Null when the cell has no authored seed — the LLM then falls back
 * to the composed facets alone, which is degradation, never fabrication.
 */
export function contextualSeedBlock(line: Line, stage: Stage, modality: Modality): string | null {
  const seed = scenarioSeedFor(line, stage);
  if (!seed) return null;
  return contextualSeed(seed, modality);
}

/** The authored world seed for a cell, or undefined (degradation, never fabrication). */
export function worldSeedFor(line: Line, stage: Stage, seeds: readonly WorldSeed[] = WORLD_SEEDS): WorldSeed | undefined {
  return seeds.find((s) => s.line === line && s.stage === stage);
}

/**
 * The authored world PLACE text for this cell: the stage the situation stands on — locus,
 * texture, population, and the place's own quiet tension, as one prose block. Null when the
 * cell has no authored place; the prompt then falls back to the composed facets alone.
 */
export function worldPlaceBlock(line: Line, stage: Stage): string | null {
  const w = worldSeedFor(line, stage);
  if (!w) return null;
  return `Where: ${w.place} — ${w.texture} Around you: ${w.population} The place asks: ${w.tension}`;
}

/** The authored persona seed for a cell, or undefined (degradation, never fabrication). */
export function npcPersonaFor(line: Line, stage: Stage, seeds: readonly NpcSeed[] = NPC_SEEDS): NpcSeed | undefined {
  return seeds.find((s) => s.line === line && s.stage === stage);
}

/**
 * The authored persona VOICE for this cell: the canonical figure of the NPC library (46 §2),
 * given in stage-register prose — who stands in the situation, how they speak, and the tension
 * they carry. This is the SIGNIFICATOR's persona voice: how the game's voice toward this player
 * is registered (16 §2's vessel side). Null when the cell has no authored persona.
 */
export function personaVoiceBlock(line: Line, stage: Stage): string | null {
  const p = npcPersonaFor(line, stage);
  if (!p) return null;
  return `${p.name} — ${p.role}. They speak ${p.voice}; ${p.register}. Beneath it: ${p.tension}.`;
}
