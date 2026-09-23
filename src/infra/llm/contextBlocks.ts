/**
 * Context blocks — the optional LLM-conditioning blocks the system prompt can carry.
 *
 * Split out of `ContextPipeline.ts` (module-cohesion audit item 5, rule M3: *named steps over
 * narrating comments*). The pipeline itself is seven steps and belongs together; what grew without
 * bound was the seventh step's block set — every new conditioning surface (composed world,
 * personalization envelope, holon memory, authored seeds, cross-session memory) added a formatter
 * and another concatenation inside one 100-line template literal. Adding the next one meant editing
 * four places in the assembler.
 *
 * Now a block is one entry in `OPTIONAL_BLOCKS`: its guard, its formatter, and its position in the
 * prompt order. `renderOptionalBlocks` walks the table, so the assembler's block section is a
 * single call and the order is declared once rather than implied by the argument list.
 *
 * Every formatter here is on the RENDER path, so each obeys the same law (Veil): qualitative prose
 * only — no scores, no stage ordinals, no drive/quadrant taxonomy labels a player could hear echoed
 * back as a diagnosis. The `formatPlayerState` doc-comment records what the LLM must not learn even
 * though the engine knows it.
 *
 * Spec: `docs/foundations/22-holon-context-engine.md` §4 (steps 4.1–4.7) · `45` §5/§6 · `46` §7.
 */
import type { Line } from '../../core/domain/Line.js';
import type { Stage } from '../../core/domain/Stage.js';
import type { Modality, ShadowQuadrant } from '../../core/domain/enums.js';
import type { Holon } from '../../core/world/Holon.js';
import { type PolarityTexture } from '../../core/data/PolarityOntology.js';
import type { DevelopmentalAgenda } from '../../core/domain/StageQuality.js';
import type { PersonalizationBlock } from '../../core/personalization/sessionRuntime.js';

// ---------------------------------------------------------------------------
// The block payload types
//
// These were inline object literals, written out three times each (the input interface, the
// assembler parameter list, and the formatter signature). A named type is the same information in
// one place — and it is what makes `ContextPipelineInput` readable as a list of what the prompt can
// be conditioned on.
// ---------------------------------------------------------------------------

/** P1-QW6 (Architecture Audit Phase A): per-line felt-sense summary of recent brain-game play. */
export interface CognitiveSnapshotEntry {
  readonly line: Line;
  readonly score01: number;
  readonly trend: 'rising' | 'stable' | 'decaying';
  readonly lastPlayedDaysAgo: number;
}

/** P1-QW6: the player's educational knowledge state, summarised for cognitive-complexity tuning. */
export interface KnowledgeSnapshot {
  readonly conceptCount: number;
  readonly avgRetention: number;
  readonly reviewCandidates: ReadonlyArray<{ readonly conceptId: string; readonly urgency: number }>;
}

/** P1-B2 (Architecture Audit Phase B): the per-line×stage polarity texture for this encounter. */
export interface PolarityTextureEntry {
  readonly line: Line;
  readonly stage: Stage;
  readonly texture: PolarityTexture;
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

/**
 * The Veil-filtered player state: what the manifest layer is allowed to know about the player.
 * Every field is qualitative — the stage is carried as a `perceivedLayer` rather than shown as a
 * taxonomy label, and the signal lists name felt-qualities rather than drives and quadrants.
 */
export interface VeilFilteredSignificator {
  readonly perceivedLayer: Stage;
  readonly lineAltitudes: Readonly<Record<Line, Stage>>;
  readonly activeDriveSignals: readonly string[];
  readonly activeShadowSignals: readonly string[];
  readonly recentChoicePatterns: readonly string[];
  readonly transformationProximity: 'distant' | 'approaching' | 'threshold';
  readonly sessionEnergy: 'high' | 'moderate' | 'low';
}

/** Step 1's product: the encounter's holon plus its same-line neighbours (≤ 5, de-duplicated). */
export interface HolonSelection {
  readonly primary: Holon | null;
  readonly contextual: readonly Holon[];
}

// ---------------------------------------------------------------------------
// Modality surfaces (steps 5 and 7)
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

export function injectModalityRubric(modality: Modality): string {
  return MODALITY_RUBRICS[modality];
}

/** The modality's required JSON response shape — the fixed half of fixed-mechanics + adaptive-content. */
export function getOutputFormat(modality: Modality): string {
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
// The formatters
// ---------------------------------------------------------------------------

export function formatHolonDescriptions(holonSelection: HolonSelection): string {
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

// THE SHADOW FELT-SENSE MAP — keyed by the canonical quadrant, not by a substring.
//
// This was four `includes()` tests against hand-written spellings, and two of them were the wrong
// word: the canonical quadrants are DarkAddiction / DarkAllergy / GoldenAddiction / GoldenAllergy
// (AGENTS.md §5.2), but the map tested for `darkavert` and `goldenavert`. `DarkAllergy-cognitive-
// active` contains neither `darkavert` nor any other arm, so it fell through and was passed through
// VERBATIM — the raw taxonomy label this function exists to hide, handed to the model that is told
// not to leak it. Half the quadrant labels leaked and nothing could notice, because a substring miss
// is indistinguishable from "not a shadow signal".
//
// An exhaustive Record over `ShadowQuadrant` is the fix and the guard: renaming or adding a quadrant
// is now a compile error here rather than a silent pass-through.
const SHADOW_FELT: Readonly<Record<ShadowQuadrant, string>> = {
  DarkAddiction: 'a familiar pull that clings',
  DarkAllergy: 'a flinching-away from contact',
  GoldenAddiction: 'a reaching past the current step',
  GoldenAllergy: 'a resistance to what wants to emerge',
};

/**
 * Translate one `{quadrant}-{line}-active` signal into felt-sense prose.
 * Total over the canonical quadrants; an unrecognised shape degrades to neutral prose rather than
 * echoing the input, because echoing is how the label escapes.
 */
export function describeShadowSignal(signal: string): string {
  const quadrant = signal.split('-')[0] as ShadowQuadrant;
  return SHADOW_FELT[quadrant] ?? 'something moving underneath';
}

/** Exposed for the Veil gate/test: every canonical quadrant must have a felt-sense rendering. */
export const SHADOW_FELT_SENSE: Readonly<Record<ShadowQuadrant, string>> = SHADOW_FELT;

export function formatPlayerState(sig: VeilFilteredSignificator): string {
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
    const shadowDescriptions = sig.activeShadowSignals.map(s => describeShadowSignal(s));
    signals.push(`undercurrents = ${shadowDescriptions.join(', ')}`);
  }

  // recent choice patterns (already qualitative)
  if (sig.recentChoicePatterns.length > 0) {
    signals.push(`recent patterns = ${sig.recentChoicePatterns.join(', ')}`);
  }

  return signals.join('; ');
}

// P1-QW6 (Architecture Audit Phase A): Felt-sense rendering of cognitive
// snapshot. The LLM needs to know which lines are "sharp lately" vs
// "resting fallow" so it can calibrate cognitive complexity. We never
// expose raw scores; only the qualitative felt-sense.
export function formatCognitiveState(snapshot: ReadonlyArray<CognitiveSnapshotEntry>): string {
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
export function formatKnowledgeState(state: KnowledgeSnapshot): string {
  const retentionFelt = state.avgRetention > 0.7 ? 'well-held' : state.avgRetention > 0.4 ? 'developing' : 'fading';
  const reviewPart = state.reviewCandidates.length > 0
    ? `; threads asking attention=${state.reviewCandidates.slice(0, 3).map(c => c.conceptId).join(',')}`
    : '';
  return `concepts=${state.conceptCount}; retention=${retentionFelt}${reviewPart}`;
}

// P1-B2 (Architecture Audit Phase B): felt-sense rendering of polarity textures.
// STO/STS/exploratory terms are qualitative (no clinical labels) and grounded
// in the per-line×stage ontology so the LLM can frame polarity precisely.
export function formatPolarityTextures(textures: ReadonlyArray<PolarityTextureEntry>): string {
  const parts = textures.map(t => {
    const { sto, sts, exploratory } = t.texture;
    return `${t.line.toLowerCase()}:${t.stage.toLowerCase()}=offering=${sto}, clinging=${sts}, exploring=${exploratory}`;
  });
  return parts.join('; ');
}

// QUALITY-WIRING (MY-AD-0030): the developmental agenda rendered for LLM conditioning.
// Deliberately qualitative — the markers are already felt-sense prose in StageQuality, and this
// formatter's only job is to keep them that way: no stage ordinals as scores, no quadrant labels
// the player could hear echoed back as a diagnosis. The encounter's stage is named because the
// prompt already names it; the agenda ADDS where the player's own edge and unhealed material sit.
export function formatDevelopmentalAgenda(agenda: DevelopmentalAgenda): string {
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

// PLAN-IMPLEMENT (46 §7 step 6): the composed world texture rendered for LLM conditioning. Each
// line is one applied facet's prose; empty facets collapse out so partial compositions degrade
// gracefully rather than printing blanks.
export function formatComposedWorld(w: ComposedWorldTexture): string {
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

// RuntimeLoop: the personalization envelope — how the content is angled (mode/poles) and what it
// echoes (interests). Qualitative; never shows numbers to the player, only conditions the LLM.
export function formatPersonalization(block: PersonalizationBlock): string {
  const parts: string[] = [];
  if (block.mode) parts.push(`mode=${block.mode}`);
  if (block.surface) parts.push(`fluent-in=${block.surface}`);
  if (block.structure) parts.push(`structured-by=${block.structure}`);
  if (block.interestEcho.length > 0) parts.push(`resonates=${block.interestEcho.join('/')}`);
  if (block.deferredCells.length > 0) parts.push(`deferred=${block.deferredCells.length} cells (route, don't force)`);
  return parts.length > 0 ? `\n[PERSONALIZATION] ${parts.join('; ')}` : '';
}

// ---------------------------------------------------------------------------
// The block table
// ---------------------------------------------------------------------------

/** Everything a caller may condition the prompt on, beyond the seven mandatory sections. */
export interface OptionalBlockSources {
  readonly agentSynthesis?: string;
  readonly cognitiveSnapshot?: ReadonlyArray<CognitiveSnapshotEntry>;
  readonly knowledgeState?: KnowledgeSnapshot;
  readonly polarityTextures?: ReadonlyArray<PolarityTextureEntry>;
  readonly developmentalAgenda?: DevelopmentalAgenda;
  readonly composedWorld?: ComposedWorldTexture;
  readonly personalizationBlock?: PersonalizationBlock;
  /** 22 §7.4 L3: the encounter holon's worker-maintained digest. Empty → no block (a cold holon). */
  readonly holonProfileBlock?: readonly string[];
  /** 46 §2 × 11: the cell's authored situation bound to this encounter's modality. */
  readonly scenarioSeedBlock?: string;
  /** 46 §2 world library: the authored place text for the cell. */
  readonly worldPlaceBlock?: string;
  /** 48 §3: the standing MemoryPage lines, already Veil-filtered at the envelope seam. */
  readonly continuityBlock?: readonly string[];
}

/**
 * The prompt's optional-block order, declared once. Each entry renders to `''` when absent, so a
 * caller with nothing to add contributes nothing rather than a blank section — and the order in
 * the assembled prompt is this list's order, not the order of an argument list.
 */
const OPTIONAL_BLOCKS: readonly ((s: OptionalBlockSources) => string)[] = [
  (s) => (s.agentSynthesis ? `\n[SESSION SYNTHESIS] ${s.agentSynthesis}` : ''),
  (s) => (s.cognitiveSnapshot && s.cognitiveSnapshot.length > 0
    ? `\n[COGNITIVE STATE] ${formatCognitiveState(s.cognitiveSnapshot)}` : ''),
  (s) => (s.knowledgeState && s.knowledgeState.conceptCount > 0
    ? `\n[KNOWLEDGE STATE] ${formatKnowledgeState(s.knowledgeState)}` : ''),
  (s) => (s.polarityTextures && s.polarityTextures.length > 0
    ? `\n[POLARITY TEXTURES] ${formatPolarityTextures(s.polarityTextures)}` : ''),
  (s) => (s.developmentalAgenda ? formatDevelopmentalAgenda(s.developmentalAgenda) : ''),
  (s) => (s.composedWorld ? formatComposedWorld(s.composedWorld) : ''),
  (s) => (s.personalizationBlock ? formatPersonalization(s.personalizationBlock) : ''),
  // RuntimeLoop: the holon's memory — an NPC that remembers the player is the world feeling real.
  (s) => (s.holonProfileBlock && s.holonProfileBlock.length > 0
    ? `\n[HOLON MEMORY] ${s.holonProfileBlock.join('; ')}` : ''),
  // RuntimeLoop: the authored canonical situation for this cell — the ground the scene stands on.
  (s) => (s.scenarioSeedBlock && s.scenarioSeedBlock.trim()
    ? `\n[SCENARIO SEED] ${s.scenarioSeedBlock.replace(/\n+/g, ' | ')}` : ''),
  // RuntimeLoop: the authored world place — the stage the scene stands on. Corpus-derived canon
  // text at the encounter's altitude; absent cell degrades to the composed facets alone.
  (s) => (s.worldPlaceBlock && s.worldPlaceBlock.trim()
    ? `\n[WORLD PLACE] ${s.worldPlaceBlock.replace(/\n+/g, ' | ')}` : ''),
  // 48 §3: the standing memory — what the world remembers across sittings (not this session's
  // [CONTINUITY], which lists recent encounters). Banded prose only; the envelope seam already
  // Veil-filtered each line, and this renderer re-checks nothing by design (single guard per path).
  (s) => (s.continuityBlock && s.continuityBlock.length > 0
    ? `\n[CROSS-SESSION MEMORY] ${s.continuityBlock.join(' | ')}` : ''),
];

/** Render every present block, in canonical order. Absent blocks contribute the empty string. */
export function renderOptionalBlocks(sources: OptionalBlockSources): string {
  return OPTIONAL_BLOCKS.map((render) => render(sources)).join('');
}
