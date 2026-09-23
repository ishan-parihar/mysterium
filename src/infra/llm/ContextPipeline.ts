/**
 * ContextPipeline - 7-step context aggregation pipeline for LLM system prompt assembly.
 * Per foundations/22 section 4 (steps 4.1 through 4.7).
 *
 * The seven steps are one coherent unit and live here in order. The OPTIONAL conditioning blocks
 * that step 7 can carry were split out to `contextBlocks.ts` (module-cohesion audit item 5, rule
 * M3): they were the part that grew unbounded, and a new conditioning surface should be one entry
 * in a table rather than another concatenation inside the prompt template.
 *
 * The prompt's mandatory sections are fixed; everything a caller can add is declared in
 * `OptionalBlockSources`, so `assembleSystemPrompt` receives rendered prose and never grows.
 */
import type { Line } from '../../core/domain/Line.js';
import type { Stage } from '../../core/domain/Stage.js';
import type { Modality } from '../../core/domain/enums.js';
import type { Holon } from '../../core/world/Holon.js';
import type { ScheduledEncounter } from '../../core/domain/EncounterSpecNew.js';
import type { Significator } from '../../core/domain/Significator.js';
import type { HolonRegistry } from '../../core/world/store/HolonStore.js';
import type { ConceptDraftIndex } from '../../core/data/ConceptDraftIndex.js';
import type { ConsequenceRecord } from '../../core/domain/ConsequenceRecord.js';
import type { FrequencySpec } from './FrequencyConditioner.js';

import { ALL_LINES } from '../../core/domain/Line.js';
import { getHolon, queryByLine } from '../../core/world/store/HolonStore.js';
import { queryByLineStage } from '../../core/data/ConceptDraftIndex.js';
import { generateFrequencySpec } from './FrequencyConditioner.js';
import {
  getOutputFormat,
  injectModalityRubric,
  formatHolonDescriptions,
  formatPlayerState,
  renderOptionalBlocks,
  type ComposedWorldTexture,
  type CognitiveSnapshotEntry,
  type HolonSelection,
  type KnowledgeSnapshot,
  type PolarityTextureEntry,
  type VeilFilteredSignificator,
} from './contextBlocks.js';

// The moved types stay part of this module's public surface: consumers import them from here, and
// where a type is imported from is not worth breaking for a file move.
export type {
  ComposedWorldTexture,
  CognitiveSnapshotEntry,
  KnowledgeSnapshot,
  PolarityTextureEntry,
  VeilFilteredSignificator,
} from './contextBlocks.js';

// ---------------------------------------------------------------------------
// Public interfaces
// ---------------------------------------------------------------------------

export interface ContextPipelineInput {
  readonly encounter: ScheduledEncounter;
  readonly significator: Significator;
  readonly holonRegistry: HolonRegistry;
  readonly conceptIndex: ConceptDraftIndex;
  readonly recentConsequences: readonly ConsequenceRecord[];
  readonly sessionContext: { readonly energy: 'high' | 'moderate' | 'low' };
  /**
   * T-2.9: Cross-encounter synthesis from SessionAgent.buildSynthesis().
   * When provided, this string gives the LLM context about the player's
   * accumulated patterns across the session (lines explored, dominant
   * drives, shadow patterns, write-in themes, engagement trend, suggested
   * focus). This enables the recursive catalyst trajectory.
   */
  readonly agentSynthesis?: string;
  /**
   * P1-QW6 (Architecture Audit Phase A): Optional cognitive snapshot for
   * the player. When provided, the LLM sees a per-line felt-sense summary
   * of recent brain-game performance (readiness, trend, lastPlayedDaysAgo).
   */
  readonly cognitiveSnapshot?: ReadonlyArray<CognitiveSnapshotEntry>;
  /**
   * P1-QW6 (Architecture Audit Phase A): Optional educational knowledge
   * state. When provided, the LLM sees the player's studied concepts,
   * depth distribution, and review candidates.
   */
  readonly knowledgeState?: KnowledgeSnapshot;
  /**
   * P1-B2 (Architecture Audit Phase B): Optional per-line×stage polarity
   * textures. When provided, the LLM sees the STO/STS/exploratory texture
   * for the encounter's (line, stage) so it can frame polarity precisely
   * instead of guessing from the 4-drive model.
   */
  readonly polarityTextures?: ReadonlyArray<PolarityTextureEntry>;
  /**
   * QUALITY-WIRING (MY-AD-0030): the per-altitude DEVELOPMENTAL AGENDA, derived from the
   * ratified StageQuality by `buildDevelopmentalAgenda`. When provided, the LLM sees what the
   * player's centre of gravity is being called TOWARD (Eros) and which lower altitudes still
   * carry live shadow content (Agape) — so catalyst can aim at the actual work rather than at
   * the encounter's stage. Derived, Veil-safe (marker prose, never numbers), and never player-
   * facing — this is LLM-conditioning context only.
   */
  readonly developmentalAgenda?: import('../../core/domain/StageQuality.js').DevelopmentalAgenda;
  /**
   * PLAN-IMPLEMENT (46 §7 step 6 → 45 §6): the composed world texture for this encounter, produced
   * by the personalization module's composition pipeline over the facet store. Veil-safe by
   * construction (facet prose is canon text; no C1/C2 fields, no scores). Absent → the prompt
   * falls back to the holon registry alone.
   */
  readonly composedWorld?: ComposedWorldTexture;
  /**
   * RuntimeLoop (45 §5/§6 via sessionRuntime): the personalization envelope's qualitative
   * rendering — dialectic mode + surface/structure poles, interest echo, deferral summary.
   * Veil-safe by construction: bands and tag labels only, no numbers, no stage labels.
   * Absent → no block (the pre-personalization pipeline is the fallback).
   */
  readonly personalizationBlock?: import('../../core/personalization/sessionRuntime.js').PersonalizationBlock;
  /**
   * RuntimeLoop (22 §7.4 L3 via sessionRuntime): the encounter holon's worker-maintained digest —
   * what this NPC/place remembers about the player. Qualitative prose only. Absent/empty → no
   * block (a cold holon has no history; that is correct, not an error).
   */
  readonly holonProfileBlock?: readonly string[];
  /**
   * RuntimeLoop (46 §2 × 11 via sessionRuntime): the cell's AUTHORED contextual seed bound to the
   * encounter's modality — the canonical situation the scenario-catalyst renders. Stage-coherent
   * by construction (scenarioSeeds + G27); absent when the cell has no authored seed.
   */
  readonly scenarioSeedBlock?: string;
  /** Authored world PLACE text for the cell (RuntimeLoop, 46 §2 world library) — Veil-safe prose. */
  readonly worldPlaceBlock?: string;
  /**
   * [CROSS-SESSION MEMORY] (48 §3): the standing MemoryPage lines — banded trajectory prose,
   * open threads, holon stances — rebuilt from committed feed state at the envelope seam and
   * Veil-filtered there. Distinct from the in-session [CONTINUITY] block: this one survives the
   * process (checkpoint-restored feed). Empty/absent → no block (first boot is correct, not an
   * error).
   */
  readonly continuityBlock?: readonly string[];
}

export interface ContextPipelineOutput {
  readonly systemPrompt: string;
  readonly frequencySpec: FrequencySpec;
  readonly selectedHolons: readonly Holon[];
  readonly veilFilteredSig: VeilFilteredSignificator;
}

// ---------------------------------------------------------------------------
// Step 1: selectHolons
// ---------------------------------------------------------------------------

function selectHolons(encounter: ScheduledEncounter, registry: HolonRegistry): HolonSelection {
  const primary = getHolon(registry, encounter.holonSource) ?? null;

  // Query holons for ALL target lines, not just the first
  const seenIds = new Set<string>();
  let contextual: Holon[] = [];

  for (const targetLine of encounter.targetLines) {
    const sameLineHolons = queryByLine(registry, targetLine);
    for (const h of sameLineHolons) {
      if (h.id !== encounter.holonSource && !seenIds.has(h.id)) {
        seenIds.add(h.id);
        contextual.push(h);
      }
    }
  }

  contextual = contextual.slice(0, 5);

  return { primary, contextual };
}

// ---------------------------------------------------------------------------
// Step 2: filterSignificator
// ---------------------------------------------------------------------------

function filterSignificator(
  sig: Significator,
  sessionEnergy: 'high' | 'moderate' | 'low',
): VeilFilteredSignificator {
  // Map drive weights to qualitative signals
  const activeDriveSignals: string[] = [];
  for (const [drive, weight] of Object.entries(sig.drives.weights)) {
    if (weight > 0.3) {
      activeDriveSignals.push(`${drive.toLowerCase()}-elevated`);
    } else if (weight < -0.3) {
      activeDriveSignals.push(`${drive.toLowerCase()}-suppressed`);
    }
  }

  // Map active shadows to signals
  const activeShadowSignals: string[] = sig.shadows.entries
    .filter(e => e.resolvedAt === null)
    .map(e => `${e.quadrant}-${e.line.toLowerCase()}-active`);

  // Determine transformation proximity based on how many lines are at the current stage
  const linesAtCurrentStage = ALL_LINES.filter(
    l => sig.altitudes[l] === sig.currentStage,
  ).length;

  let transformationProximity: 'distant' | 'approaching' | 'threshold';
  if (linesAtCurrentStage >= 6) {
    transformationProximity = 'threshold';
  } else if (linesAtCurrentStage >= 4) {
    transformationProximity = 'approaching';
  } else {
    transformationProximity = 'distant';
  }

  // Recent choice patterns from transformation records
  const recentChoicePatterns: string[] = sig.transformations
    .slice(-3)
    .map(t => `${t.fromStage}-to-${t.toStage}`);

  return {
    perceivedLayer: sig.currentStage,
    lineAltitudes: { ...sig.altitudes },
    activeDriveSignals,
    activeShadowSignals,
    recentChoicePatterns,
    transformationProximity,
    sessionEnergy,
  };
}

// ---------------------------------------------------------------------------
// Step 3: injectEncounterSpec
// ---------------------------------------------------------------------------

interface EncounterContext {
  readonly lines: readonly Line[];
  readonly stage: Stage;
  readonly modality: Modality;
  readonly catalyticPurpose: string;
  readonly moduleRef: string;
}

function injectEncounterSpec(
  encounter: ScheduledEncounter,
  conceptIndex: ConceptDraftIndex,
): EncounterContext {
  // Include all target lines in the encounter context
  const lines: Line[] = encounter.targetLines.length > 0
    ? [...encounter.targetLines]
    : ['Cognitive' as Line];
  const primaryLine = lines[0];
  const entry = queryByLineStage(conceptIndex, primaryLine, encounter.stage);
  const catalyticPurpose = entry ? entry.title : 'catalytic engagement';

  return {
    lines,
    stage: encounter.stage,
    modality: encounter.modality,
    catalyticPurpose,
    moduleRef: encounter.moduleRef,
  };
}

// ---------------------------------------------------------------------------
// Step 4: conditionFrequency
// ---------------------------------------------------------------------------

function conditionFrequency(
  encounter: ScheduledEncounter,
  sig: Significator,
  holonSelection: HolonSelection,
): FrequencySpec {
  // Use the primary target line (first) for frequency conditioning.
  // Multi-line encounters still use a single frequency to maintain voice consistency.
  const targetLine = encounter.targetLines[0] ?? 'Cognitive';
  const playerStage = sig.altitudes[targetLine] ?? sig.currentStage;
  const holonLine = holonSelection.primary?.line ?? targetLine;
  const holonStage = holonSelection.primary?.stage ?? encounter.stage;

  return generateFrequencySpec(targetLine, playerStage, holonLine, holonStage, encounter.modality);
}

// ---------------------------------------------------------------------------
// Step 6: assembleConsequenceContext
// ---------------------------------------------------------------------------

function assembleConsequenceContext(
  recentConsequences: readonly ConsequenceRecord[],
  holonSelection: HolonSelection,
): string {
  if (recentConsequences.length === 0) {
    return 'No prior encounter history in this session.';
  }

  const selectedHolonIds = new Set<string>();
  if (holonSelection.primary) {
    selectedHolonIds.add(holonSelection.primary.id);
  }
  for (const h of holonSelection.contextual) {
    selectedHolonIds.add(h.id);
  }

  // Filter to consequences involving selected holons, then take last 3
  const relevant = recentConsequences
    .filter(c => c.holonDeltas.some(d => selectedHolonIds.has(d.holonId)) || selectedHolonIds.size === 0)
    .slice(-3);

  if (relevant.length === 0) {
    // Fall back to most recent 3 regardless of holon match
    const fallback = recentConsequences.slice(-3);
    return fallback.map(c => c.narrativeSummary).join(' | ');
  }

  return relevant.map(c => c.narrativeSummary).join(' | ');
}

// ---------------------------------------------------------------------------
// Step 7: assembleSystemPrompt
// ---------------------------------------------------------------------------

/**
 * The mandatory sections, in order. Every one of them is always present: the sections a caller can
 * add or omit are the OPTIONAL_BLOCKS table in `contextBlocks.ts`, appended after [PLAYER STATE].
 */
function assembleSystemPrompt(
  frequencySpec: FrequencySpec,
  holonSelection: HolonSelection,
  encounterContext: EncounterContext,
  modalityRubric: string,
  consequenceContext: string,
  veilFilteredSig: VeilFilteredSignificator,
  optionalBlocks: string,
): string {
  const holonDescriptions = formatHolonDescriptions(holonSelection);
  const playerStateSignals = formatPlayerState(veilFilteredSig);
  const outputFormat = getOutputFormat(encounterContext.modality);

  return `[ROLE] You are the manifestation layer of Mysterium.
[COSMOLOGY] Third Density constraints. Veil enforced. Free will absolute.
[FREQUENCY] tone=${frequencySpec.toneDirective}; vocabulary=${frequencySpec.vocabularyBand}; values=${frequencySpec.valueLens}; taboos=${frequencySpec.taboos.join(',')}; complexity=${frequencySpec.complexityRegister}
${frequencySpec.crossAltitudeDirective}
[HOLONS] ${holonDescriptions}
[ENCOUNTER] lines=${encounterContext.lines.join(',')}; stage=${encounterContext.stage}; modality=${encounterContext.modality}; purpose=${encounterContext.catalyticPurpose}; module=${encounterContext.moduleRef}
[MODALITY] ${modalityRubric}
[CONTINUITY] ${consequenceContext}
[PLAYER STATE] ${playerStateSignals}${optionalBlocks}
[OUTPUT FORMAT] ${outputFormat}
[RULES] No Veil violations. No clinical language. No scoring references. No frame-breaking. Stay in frequency. Scale cognitive complexity to the player's altitude, not the encounter's stage.`;
}

// ---------------------------------------------------------------------------
// Public export: buildContext
// ---------------------------------------------------------------------------

export function buildContext(input: ContextPipelineInput): ContextPipelineOutput {
  // Step 1: Select holons
  const holonSelection = selectHolons(input.encounter, input.holonRegistry);

  // Step 2: Filter significator
  const veilFilteredSig = filterSignificator(input.significator, input.sessionContext.energy);

  // Step 3: Inject encounter spec
  const encounterContext = injectEncounterSpec(input.encounter, input.conceptIndex);

  // Step 4: Condition frequency
  const frequencySpec = conditionFrequency(input.encounter, input.significator, holonSelection);

  // Step 5: Inject modality rubric
  const modalityRubric = injectModalityRubric(input.encounter.modality);

  // Step 6: Assemble consequence context
  const consequenceContext = assembleConsequenceContext(input.recentConsequences, holonSelection);

  // Step 7: Assemble system prompt — the mandatory sections plus whichever optional blocks the
  // caller supplied (T-2.9 synthesis, P1-QW6 snapshots, PLAN-IMPLEMENT composed world, RuntimeLoop
  // envelope/holon memory/seeds, 48 §3 cross-session memory). Each renders '' when absent.
  const optionalBlocks = renderOptionalBlocks(input);
  const systemPrompt = assembleSystemPrompt(
    frequencySpec,
    holonSelection,
    encounterContext,
    modalityRubric,
    consequenceContext,
    veilFilteredSig,
    optionalBlocks,
  );

  // Collect selected holons for output
  const selectedHolons: Holon[] = [];
  if (holonSelection.primary) {
    selectedHolons.push(holonSelection.primary);
  }
  selectedHolons.push(...holonSelection.contextual);

  return {
    systemPrompt,
    frequencySpec,
    selectedHolons,
    veilFilteredSig,
  };
}
