/**
 * ContextPipeline - 7-step context aggregation pipeline for LLM system prompt assembly.
 * Per foundations/22 section 4 (steps 4.1 through 4.7).
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
import { type PolarityTexture } from '../../core/data/PolarityOntology.js';
import type { PersonalizationBlock } from '../../core/personalization/sessionRuntime.js';
import { generateFrequencySpec } from './FrequencyConditioner.js';
import {
  type DevelopmentalAgenda,
} from '../../core/domain/StageQuality.js';

// ---------------------------------------------------------------------------
// Public interfaces
// ---------------------------------------------------------------------------

export interface VeilFilteredSignificator {
  readonly perceivedLayer: Stage;
  readonly lineAltitudes: Readonly<Record<Line, Stage>>;
  readonly activeDriveSignals: readonly string[];
  readonly activeShadowSignals: readonly string[];
  readonly recentChoicePatterns: readonly string[];
  readonly transformationProximity: 'distant' | 'approaching' | 'threshold';
  readonly sessionEnergy: 'high' | 'moderate' | 'low';
}

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
  readonly cognitiveSnapshot?: ReadonlyArray<{
    readonly line: Line;
    readonly score01: number;
    readonly trend: 'rising' | 'stable' | 'decaying';
    readonly lastPlayedDaysAgo: number;
  }>;
  /**
   * P1-QW6 (Architecture Audit Phase A): Optional educational knowledge
   * state. When provided, the LLM sees the player's studied concepts,
   * depth distribution, and review candidates.
   */
  readonly knowledgeState?: {
    readonly conceptCount: number;
    readonly avgRetention: number;
    readonly reviewCandidates: ReadonlyArray<{ readonly conceptId: string; readonly urgency: number }>;
  };
  /**
   * P1-B2 (Architecture Audit Phase B): Optional per-line×stage polarity
   * textures. When provided, the LLM sees the STO/STS/exploratory texture
   * for the encounter's (line, stage) so it can frame polarity precisely
   * instead of guessing from the 4-drive model.
   */
  readonly polarityTextures?: ReadonlyArray<{
    readonly line: Line;
    readonly stage: Stage;
    readonly texture: PolarityTexture;
  }>;
  /**
   * QUALITY-WIRING (MY-AD-0030): the per-altitude DEVELOPMENTAL AGENDA, derived from the
   * ratified StageQuality by `buildDevelopmentalAgenda`. When provided, the LLM sees what the
   * player's centre of gravity is being called TOWARD (Eros) and which lower altitudes still
   * carry live shadow content (Agape) — so catalyst can aim at the actual work rather than at
   * the encounter's stage. Derived, Veil-safe (marker prose, never numbers), and never player-
   * facing — this is LLM-conditioning context only.
   */
  readonly developmentalAgenda?: DevelopmentalAgenda;
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
  readonly personalizationBlock?: PersonalizationBlock;
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

/** The composed-facet prose blocks the prompt may carry (46 §7 step 5's applied facets). */
export interface ComposedWorldTexture {
  readonly role: string;
  readonly stake: string;
  readonly lever: string;
  readonly voice: string;
  readonly aesthetic: string;
  readonly polarity: string;
  readonly relationship: string;
  readonly memory: string;
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

interface HolonSelection {
  readonly primary: Holon | null;
  readonly contextual: readonly Holon[];
}

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
// Step 5: injectModalityRubric
// ---------------------------------------------------------------------------

const MODALITY_RUBRICS: Readonly<Record<Modality, string>> = {
  Deterministic:
    'LLM provides narrative framing only. All mechanics are computed by fixed systems. Do not generate scores, rolls, or mechanical outcomes. Focus on atmosphere and consequence description.',
  Strategic:
    'LLM generates strategic scenario context and evaluates player reasoning. Fixed mechanics handle resource tracking and outcome resolution. Provide multi-option scenarios with hidden complexity.',
  Embodied:
    'LLM guides somatic awareness prompts and body-scan narratives. Fixed mechanics track timing and progression. Use sensory language. No abstract intellectualization.',
  ScenarioChoice:
    'LLM presents morally complex scenarios with multiple valid responses. Fixed mechanics score alignment and drive expression. Ensure all options feel viable. No obvious correct answer.',
  LanguageReflective:
    'LLM generates reflective prompts and mirrors player language patterns. Fixed mechanics analyze response depth and vocabulary complexity. Encourage elaboration without leading.',
  SocialCooperative:
    'LLM voices NPCs and manages dialogue flow. Fixed mechanics track relationship states and trust levels. Maintain character consistency. Honor NPC boundaries and motivations.',
  ImmersiveRPG:
    'LLM generates full narrative environment, NPC dialogue, and scene descriptions. Fixed mechanics handle combat, inventory, and stat progression. Maintain world consistency and dramatic tension.',
};

function injectModalityRubric(modality: Modality): string {
  return MODALITY_RUBRICS[modality];
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

function assembleSystemPrompt(
  frequencySpec: FrequencySpec,
  holonSelection: HolonSelection,
  encounterContext: EncounterContext,
  modalityRubric: string,
  consequenceContext: string,
  veilFilteredSig: VeilFilteredSignificator,
  agentSynthesis?: string,
  cognitiveSnapshot?: ReadonlyArray<{ readonly line: Line; readonly score01: number; readonly trend: 'rising' | 'stable' | 'decaying'; readonly lastPlayedDaysAgo: number }>,
  knowledgeState?: { readonly conceptCount: number; readonly avgRetention: number; readonly reviewCandidates: ReadonlyArray<{ readonly conceptId: string; readonly urgency: number }> },
  polarityTextures?: ReadonlyArray<{ readonly line: Line; readonly stage: Stage; readonly texture: PolarityTexture }>,
  developmentalAgenda?: DevelopmentalAgenda,
  composedWorld?: ComposedWorldTexture,
  personalizationBlock?: PersonalizationBlock,
  holonProfileBlock?: readonly string[],
  scenarioSeedBlock?: string,
  worldPlaceBlock?: string,
  continuityBlock?: readonly string[],
): string {
  const holonDescriptions = formatHolonDescriptions(holonSelection);
  const playerStateSignals = formatPlayerState(veilFilteredSig);
  const outputFormat = getOutputFormat(encounterContext.modality);
  const synthesisBlock = agentSynthesis
    ? `\n[SESSION SYNTHESIS] ${agentSynthesis}`
    : '';
  const cognitiveBlock = cognitiveSnapshot && cognitiveSnapshot.length > 0
    ? `\n[COGNITIVE STATE] ${formatCognitiveState(cognitiveSnapshot)}`
    : '';
  const knowledgeBlock = knowledgeState && knowledgeState.conceptCount > 0
    ? `\n[KNOWLEDGE STATE] ${formatKnowledgeState(knowledgeState)}`
    : '';
  const polarityBlock = polarityTextures && polarityTextures.length > 0
    ? `\n[POLARITY TEXTURES] ${formatPolarityTextures(polarityTextures)}`
    : '';
  // QUALITY-WIRING (MY-AD-0030): aim the catalyst at the player's actual developmental work.
  // The agenda names the threshold the centre of gravity is being pulled across (Eros) and the
  // lower altitudes' live pathology content (Agape) in marker prose — Veil-safe, no numbers, no
  // taxonomy labels. Absent when a caller has nothing to add; the block must NEVER appear for a
  // player-facing surface, which the format below enforces by carrying only qualitative prose.
  const agendaBlock = developmentalAgenda ? formatDevelopmentalAgenda(developmentalAgenda) : '';
  // PLAN-IMPLEMENT: the composed world texture — facet prose applied in dependency order, so the
  // LLM plays an entity composed from the store rather than improvising one. Veil-safe: facet
  // payloads are corpus-derived canon text carrying no developmental numbers.
  const composedBlock = composedWorld ? formatComposedWorld(composedWorld) : '';
  // RuntimeLoop: the personalization envelope — how the content is angled (mode/poles) and what
  // it echoes (interests). Qualitative; never shows numbers to the player, only conditions the LLM.
  const personalizationParts: string[] = [];
  if (personalizationBlock) {
    if (personalizationBlock.mode) personalizationParts.push(`mode=${personalizationBlock.mode}`);
    if (personalizationBlock.surface) personalizationParts.push(`fluent-in=${personalizationBlock.surface}`);
    if (personalizationBlock.structure) personalizationParts.push(`structured-by=${personalizationBlock.structure}`);
    if (personalizationBlock.interestEcho.length > 0) personalizationParts.push(`resonates=${personalizationBlock.interestEcho.join('/')}`);
    if (personalizationBlock.deferredCells.length > 0) personalizationParts.push(`deferred=${personalizationBlock.deferredCells.length} cells (route, don't force)`);
  }
  const personalizationBlockStr = personalizationParts.length > 0 ? `\n[PERSONALIZATION] ${personalizationParts.join('; ')}` : '';
  // RuntimeLoop: the holon's memory — an NPC that remembers the player is the world feeling real.
  const holonProfileStr = holonProfileBlock && holonProfileBlock.length > 0
    ? `\n[HOLON MEMORY] ${holonProfileBlock.join('; ')}`
    : '';
  // RuntimeLoop: the authored canonical situation for this cell — the ground the scene stands on.
  const scenarioSeedStr = scenarioSeedBlock && scenarioSeedBlock.trim()
    ? `\n[SCENARIO SEED] ${scenarioSeedBlock.replace(/\n+/g, ' | ')}`
    : '';
  // RuntimeLoop: the authored world place — the stage the scene stands on. Corpus-derived canon
  // text at the encounter's altitude; absent cell degrades to the composed facets alone.
  const worldPlaceStr = worldPlaceBlock && worldPlaceBlock.trim()
    ? `\n[WORLD PLACE] ${worldPlaceBlock.replace(/\n+/g, ' | ')}`
    : '';
  // 48 §3: the standing memory — what the world remembers across sittings (not this session's
  // [CONTINUITY], which lists recent encounters). Banded prose only; the envelope seam already
  // Veil-filtered each line, and this renderer re-checks nothing by design (single guard per path).
  const crossSessionStr = continuityBlock && continuityBlock.length > 0
    ? `\n[CROSS-SESSION MEMORY] ${continuityBlock.join(' | ')}`
    : '';

  return `[ROLE] You are the manifestation layer of Mysterium.
[COSMOLOGY] Third Density constraints. Veil enforced. Free will absolute.
[FREQUENCY] tone=${frequencySpec.toneDirective}; vocabulary=${frequencySpec.vocabularyBand}; values=${frequencySpec.valueLens}; taboos=${frequencySpec.taboos.join(',')}; complexity=${frequencySpec.complexityRegister}
${frequencySpec.crossAltitudeDirective}
[HOLONS] ${holonDescriptions}
[ENCOUNTER] lines=${encounterContext.lines.join(',')}; stage=${encounterContext.stage}; modality=${encounterContext.modality}; purpose=${encounterContext.catalyticPurpose}; module=${encounterContext.moduleRef}
[MODALITY] ${modalityRubric}
[CONTINUITY] ${consequenceContext}
[PLAYER STATE] ${playerStateSignals}${synthesisBlock}${cognitiveBlock}${knowledgeBlock}${polarityBlock}${agendaBlock}${composedBlock}${personalizationBlockStr}${holonProfileStr}${scenarioSeedStr}${worldPlaceStr}${crossSessionStr}
[OUTPUT FORMAT] ${outputFormat}
[RULES] No Veil violations. No clinical language. No scoring references. No frame-breaking. Stay in frequency. Scale cognitive complexity to the player's altitude, not the encounter's stage.`;
}

// PLAN-IMPLEMENT (46 §7 step 6): the composed world texture rendered for LLM conditioning. Each
// line is one applied facet's prose; empty facets collapse out so partial compositions degrade
// gracefully rather than printing blanks.
function formatComposedWorld(w: ComposedWorldTexture): string {
  const parts: string[] = [];
  if (w.role.trim()) parts.push(`role=${w.role}`);
  if (w.stake.trim()) parts.push(`stake=${w.stake}`);
  if (w.lever.trim()) parts.push(`pressure=${w.lever}`);
  if (w.voice.trim()) parts.push(`voice=${w.voice}`);
  if (w.aesthetic.trim()) parts.push(`aesthetic=${w.aesthetic}`);
  if (w.polarity.trim()) parts.push(`polarity=${w.polarity}`);
  if (w.relationship.trim()) parts.push(`binds=${w.relationship}`);
  if (w.memory.trim()) parts.push(`memory=${w.memory}`);
  if (parts.length === 0) return '';
  return `\n[COMPOSED WORLD] ${parts.join('; ')}`;
}

// QUALITY-WIRING (MY-AD-0030): the developmental agenda rendered for LLM conditioning.
// Deliberately qualitative — the markers are already felt-sense prose in StageQuality, and this
// formatter's only job is to keep them that way: no stage ordinals as scores, no quadrant labels
// the player could hear echoed back as a diagnosis. The encounter's stage is named because the
// prompt already names it; the agenda ADDS where the player's own edge and unhealed material sit.
function formatDevelopmentalAgenda(agenda: DevelopmentalAgenda): string {
  const parts: string[] = [];
  if (agenda.eros) {
    parts.push(
      `the player is being called toward ${agenda.eros.calledToward ?? 'what lies past the top of the ladder'}: ` +
        `${agenda.eros.thresholdMarkers}`,
    );
  }
  if (agenda.agape.length > 0) {
    const sample = agenda.agape.slice(0, 4).map(a => `${a.stage}: ${a.marker}`);
    const more = agenda.agape.length > sample.length ? ` (+${agenda.agape.length - sample.length} more)` : '';
    parts.push(`live undercurrents from earlier ground — ${sample.join('; ')}${more}`);
  }
  if (parts.length === 0) return '';
  return `\n[DEVELOPMENTAL AGENDA] ${parts.join(' | ')}`;
}

// P1-B2 (Architecture Audit Phase B): felt-sense rendering of polarity textures.
// STO/STS/exploratory terms are qualitative (no clinical labels) and grounded
// in the per-line×stage ontology so the LLM can frame polarity precisely.
function formatPolarityTextures(textures: ReadonlyArray<{ readonly line: Line; readonly stage: Stage; readonly texture: PolarityTexture }>): string {
  const parts = textures.map(t => {
    const { sto, sts, exploratory } = t.texture;
    return `${t.line.toLowerCase()}:${t.stage.toLowerCase()}=offering=${sto}, clinging=${sts}, exploring=${exploratory}`;
  });
  return parts.join('; ');
}

// P1-QW6 (Architecture Audit Phase A): Felt-sense rendering of cognitive
// snapshot. The LLM needs to know which lines are "sharp lately" vs
// "resting fallow" so it can calibrate cognitive complexity. We never
// expose raw scores; only the qualitative felt-sense.
function formatCognitiveState(snapshot: ReadonlyArray<{ readonly line: Line; readonly score01: number; readonly trend: 'rising' | 'stable' | 'decaying'; readonly lastPlayedDaysAgo: number }>): string {
  const parts = snapshot.map(s => {
    const felt = s.trend === 'rising' && s.score01 > 0.65
      ? 'sharp lately'
      : s.trend === 'rising'
      ? 'quietly strengthening'
      : s.trend === 'decaying'
      ? 'a little distant'
      : s.score01 < 0.4
      ? 'resting fallow'
      : 'steady';
    return `${s.line.toLowerCase()}=${felt} (last played ${s.lastPlayedDaysAgo.toFixed(1)}d ago)`;
  });
  return parts.join('; ');
}

// P1-QW6 (Architecture Audit Phase A): Felt-sense rendering of knowledge state.
function formatKnowledgeState(state: { readonly conceptCount: number; readonly avgRetention: number; readonly reviewCandidates: ReadonlyArray<{ readonly conceptId: string; readonly urgency: number }> }): string {
  const retentionFelt = state.avgRetention > 0.7 ? 'well-held' : state.avgRetention > 0.4 ? 'developing' : 'fading';
  const reviewPart = state.reviewCandidates.length > 0
    ? `; threads asking attention=${state.reviewCandidates.slice(0, 3).map(c => c.conceptId).join(',')}`
    : '';
  return `concepts=${state.conceptCount}; retention=${retentionFelt}${reviewPart}`;
}

function formatHolonDescriptions(holonSelection: HolonSelection): string {
  const parts: string[] = [];

  if (holonSelection.primary) {
    const h = holonSelection.primary;
    parts.push(`primary=${h.name}(${h.line}/${h.stage},role=${h.narrativeRole})`);
  }

  for (const h of holonSelection.contextual) {
    parts.push(`${h.name}(${h.line}/${h.stage},role=${h.narrativeRole})`);
  }

  if (parts.length === 0) {
    return 'none-available';
  }

  return parts.join('; ');
}

function formatPlayerState(sig: VeilFilteredSignificator): string {
  // UX-01 / HS-11 fix: replace raw labels (layer=Red, drives=agency-elevated,
  // shadows=DarkAddiction-cognitive-active) with qualitative descriptions
  // that do not leak the stage/drive/shadow taxonomy to the LLM. The LLM
  // can infer the taxonomy from raw labels and leak it back to the player;
  // qualitative descriptions preserve the signal without the label.
  //
  // Per HoloOS 08.8.8 "weirdness signature": Veil-filtered outputs should
  // preserve felt-sense, not flatten to normalcy. The qualitative
  // descriptions below preserve the felt-quality of the player's state.
  const signals: string[] = [];

  // layer → qualitative resonance description
  const layerResonance: Record<string, string> = {
    Infrared: 'player resonance = survival-focused, sensori-motor',
    Magenta: 'player resonance = symbolic, magical-agency',
    Red: 'player resonance = power-oriented, ego-driven',
    Amber: 'player resonance = belonging-seeking, rule-bound',
    Orange: 'player resonance = reason-driven, achievement-oriented',
    Green: 'player resonance = pluralistic, multi-perspective',
    Teal: 'player resonance = integral, vision-logic',
    Turquoise: 'player resonance = trans-rational, unity-seeking',
  };
  signals.push(layerResonance[sig.perceivedLayer] ?? `player resonance = ${sig.perceivedLayer.toLowerCase()}`);

  // transformation proximity (already qualitative)
  signals.push(`transformation proximity = ${sig.transformationProximity}`);

  // energy (already qualitative)
  signals.push(`session energy = ${sig.sessionEnergy}`);

  // drive signals → qualitative descriptions (no drive taxonomy)
  if (sig.activeDriveSignals.length > 0) {
    const driveDescriptions = sig.activeDriveSignals.map(s => {
      // s is already a qualitative string like "agency-elevated" from filterSignificator;
      // convert to a phrase that doesn't name the drive.
      if (s.includes('agency')) return s.replace(/agency/gi, 'active-asserting tendency');
      if (s.includes('communion')) return s.replace(/communion/gi, 'relating-connecting tendency');
      if (s.includes('eros')) return s.replace(/eros/gi, 'reaching-desiring tendency');
      if (s.includes('agape')) return s.replace(/agape/gi, 'receiving-holding tendency');
      return s;
    });
    signals.push(`player tendencies = ${driveDescriptions.join(', ')}`);
  }

  // shadow signals → qualitative descriptions (no quadrant taxonomy)
  if (sig.activeShadowSignals.length > 0) {
    const shadowDescriptions = sig.activeShadowSignals.map(s => {
      if (s.toLowerCase().includes('darkaddict')) return 'a familiar pull that clings';
      if (s.toLowerCase().includes('darkavert')) return 'a flinching-away from contact';
      if (s.toLowerCase().includes('goldenaddict')) return 'a reaching past the current step';
      if (s.toLowerCase().includes('goldenavert')) return 'a resistance to what wants to emerge';
      return s;
    });
    signals.push(`undercurrents = ${shadowDescriptions.join(', ')}`);
  }

  // recent choice patterns (already qualitative)
  if (sig.recentChoicePatterns.length > 0) {
    signals.push(`recent patterns = ${sig.recentChoicePatterns.join(', ')}`);
  }

  return signals.join('; ');
}

function getOutputFormat(modality: Modality): string {
  switch (modality) {
    case 'Deterministic':
      return '{ "narrative": string, "atmosphereHints": string[] }';
    case 'Strategic':
      return '{ "scenario": string, "options": { id: string, description: string }[], "hiddenFactors": string[] }';
    case 'Embodied':
      return '{ "guidance": string, "sensoryPrompts": string[], "pacing": "slow"|"medium"|"fast" }';
    case 'ScenarioChoice':
      return '{ "scenario": string, "choices": { id: string, text: string, subtext: string }[] }';
    case 'LanguageReflective':
      return '{ "prompt": string, "mirrorObservations": string[], "elaborationHooks": string[] }';
    case 'SocialCooperative':
      return '{ "npcDialogue": string, "emotionalTone": string, "relationshipSignals": string[] }';
    case 'ImmersiveRPG':
      return '{ "narration": string, "environment": string, "npcActions": { name: string, action: string }[], "availableActions": string[] }';
  }
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

  // Step 7: Assemble system prompt (T-2.9: inject agentSynthesis if provided)
  const systemPrompt = assembleSystemPrompt(
    frequencySpec,
    holonSelection,
    encounterContext,
    modalityRubric,
    consequenceContext,
    veilFilteredSig,
    input.agentSynthesis,
    input.cognitiveSnapshot,
    input.knowledgeState,
    input.polarityTextures,
    input.developmentalAgenda,
    input.composedWorld,
    input.personalizationBlock,
    input.holonProfileBlock,
    input.scenarioSeedBlock,
    input.worldPlaceBlock,
    input.continuityBlock,
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
