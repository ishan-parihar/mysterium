/**
 * FrequencyConditioner - generates voice/register specs from line x stage signatures.
 * Per foundations/22 sections 4.4, 5.1, 5.2, 5.3.
 *
 * CRITICAL FIX (altitude-scaling audit): The player's CURRENT altitude now shapes
 * the complexity register of the catalyst, not just the encounter's target stage.
 * A Teal player encountering Red-stage material gets a DIFFERENT complexity
 * register than a Red player encountering the same material. This prevents the
 * "naive and childish" problem where high-altitude players get low-altitude-framed
 * questions that create no developmental edge.
 */
import type { Line } from '../../core/domain/Line.js';
import type { Stage } from '../../core/domain/Stage.js';
import type { Modality } from '../../core/domain/enums.js';
import { stageOrdinal } from '../../core/domain/Stage.js';
import { RAY_LENS } from '../../core/domain/Ray.js';
import { qualityOf } from '../../core/domain/StageQuality.js';

export interface FrequencySpec {
  readonly playerFrequency: { readonly line: Line; readonly stage: Stage };
  readonly holonFrequency: { readonly line: Line; readonly stage: Stage };
  readonly modality: Modality;
  readonly toneDirective: string;
  readonly vocabularyBand: string;
  readonly valueLens: string;
  readonly taboos: readonly string[];
  readonly crossAltitudeDynamic: string | null;
  /** Complexity register sourced from the PLAYER's altitude (not the holon's). */
  readonly complexityRegister: string;
  /** Structured directive telling the LLM how to handle cross-altitude framing. */
  readonly crossAltitudeDirective: string;
  /**
   * QUALITY-WIRING (MY-AD-0030 / MY-AD-0029): the RAY_LENS read of the holon's position — what
   * this ray position DOES (`rayFunction`) and the subtle vehicle it works through
   * (`subtleBody`) — plus the altitude's own emergent-order prose. The voice table above says
   * HOW to speak at an altitude; this says WHAT is being worked at it, from the two ratified
   * lenses rather than from a third hand-maintained table.
   */
  readonly lensRead: {
    readonly rayFunction: string;
    readonly subtleBody: string;
    readonly emergentOrder: string;
  };
}

interface StageVoice {
  readonly toneDirective: string;
  readonly vocabularyBand: string;
  readonly valueLens: string;
  readonly taboos: readonly string[];
  /** Cognitive complexity register — how the player PROCESSes material. */
  readonly complexityRegister: string;
}

const STAGE_VOICE_TABLE: Readonly<Record<Stage, StageVoice>> = {
  Infrared: {
    toneDirective: 'sensory/primal',
    vocabularyBand: 'fragments',
    valueLens: 'survival/warmth',
    taboos: ['abstraction', 'future-planning'],
    complexityRegister: 'pre-verbal-sensory',
  },
  Magenta: {
    toneDirective: 'symbolic/animistic',
    vocabularyBand: 'flowing/incantatory',
    valueLens: 'magic/belonging',
    taboos: ['rational analysis'],
    complexityRegister: 'symbolic-incantatory',
  },
  Red: {
    toneDirective: 'action verbs/force-words',
    vocabularyBand: 'short/imperative',
    valueLens: 'power/respect/will',
    taboos: ['vulnerability', 'compromise'],
    complexityRegister: 'concrete-imperative',
  },
  Amber: {
    toneDirective: 'formal/duty-words',
    vocabularyBand: 'structured/subordinate',
    valueLens: 'order/tradition/loyalty',
    taboos: ['questioning authority'],
    complexityRegister: 'rule-structured',
  },
  Orange: {
    toneDirective: 'precise/analytical',
    vocabularyBand: 'complex/logical',
    valueLens: 'reason/merit/evidence',
    taboos: ['dogma', 'sentiment'],
    complexityRegister: 'analytical-systemic',
  },
  Green: {
    toneDirective: 'inclusive/feeling-words',
    vocabularyBand: 'empathic/parenthetical',
    valueLens: 'sensitivity/equality',
    taboos: ['hierarchy', 'exclusion'],
    complexityRegister: 'pluralistic-contextual',
  },
  Teal: {
    toneDirective: 'integral/paradox-holding',
    vocabularyBand: 'multi-layered/both-and',
    valueLens: 'wholeness/emergence',
    taboos: ['reductionism', 'either/or'],
    complexityRegister: 'integral-paradox-holding',
  },
  Turquoise: {
    toneDirective: 'minimal/spacious',
    vocabularyBand: 'sparse/koan-like',
    valueLens: 'presence/release',
    taboos: ['grasping', 'identity-claims'],
    complexityRegister: 'meta-paradoxical-presence',
  },
};

interface LineRegister {
  readonly style: string;
  readonly focus: string;
  readonly mode: string;
}

const LINE_REGISTER_TABLE: Readonly<Record<Line, LineRegister>> = {
  Cognitive: { style: 'analytical', focus: 'problem-oriented', mode: 'cause-effect' },
  Emotional: { style: 'felt-sense', focus: 'affect-rich', mode: 'atmosphere' },
  Moral: { style: 'principled', focus: 'dilemma-oriented', mode: 'stakeholder' },
  Intrapersonal: { style: 'reflective', focus: 'self-referential', mode: 'pattern-recognition' },
  Spiritual: { style: 'value-laden', focus: 'meaning-oriented', mode: 'mystery' },
  Somatic: { style: 'embodied', focus: 'rhythm-aware', mode: 'sensation' },
  Willpower: { style: 'effort-oriented', focus: 'commitment', mode: 'endurance' },
  Interpersonal: { style: 'relational', focus: 'other-aware', mode: 'attunement' },
};

function computeCrossAltitudeDynamic(playerStage: Stage, holonStage: Stage): string | null {
  const playerOrd = stageOrdinal(playerStage);
  const holonOrd = stageOrdinal(holonStage);
  const diff = playerOrd - holonOrd;

  if (diff === 0) return 'full-mutual-intelligibility';
  if (diff === 1 || diff === -1) return 'productive-tension-slight-misunderstanding';
  if (diff > 1) return 'holon-speaks-authentically-from-its-stage';
  return 'holon-speaks-from-its-stage-player-perceives-awe';
}

/**
 * Build a STRUCTURED cross-altitude directive (not just a label).
 * This tells the LLM exactly how to handle the player-vs-holon altitude gap.
 */
function buildCrossAltitudeDirective(playerStage: Stage, holonStage: Stage): string {
  const playerOrd = stageOrdinal(playerStage);
  const holonOrd = stageOrdinal(holonStage);
  const diff = playerOrd - holonOrd;

  if (diff === 0) {
    return `Player and holon are co-altitudinal (${playerStage}). Speak from within the encounter's register.`;
  }
  if (diff > 0) {
    return `[CROSS-ALTITUDE DIRECTIVE] Player is at ${playerStage} perceiving ${holonStage} material from above. ` +
      `Acknowledge the player's vantage: open with a brief meta-cognitive frame that names the ${holonStage} pattern ` +
      `as a ${holonStage} pattern. Do NOT collapse to the ${holonStage} register. Hold both stages simultaneously: ` +
      `the ${holonStage} pattern AS pattern, and the player's ${playerStage} capacity to witness and integrate it. ` +
      `Complexity register = ${STAGE_VOICE_TABLE[playerStage].complexityRegister}. ` +
      `The catalyst must create edge at the PLAYER's altitude, not at the encounter's stage. ` +
      `Ask the player to find the still-unmetabolized ${holonStage} in themselves — that is where the work lives.`;
  }
  // diff < 0: player below holon
  return `[CROSS-ALTITUDE DIRECTIVE] Player is at ${playerStage} encountering ${holonStage} material from below. ` +
    `The holon's ${holonStage} register will be partially opaque. Deliver the ${holonStage} content with scaffolding: ` +
    `concrete anchors, felt-sense imagery, minimal abstraction. Do not lower the holon's voice, but provide handholds.`;
}

export function generateFrequencySpec(
  playerLine: Line,
  playerStage: Stage,
  holonLine: Line,
  holonStage: Stage,
  modality: Modality,
): FrequencySpec {
  const holonVoice = STAGE_VOICE_TABLE[holonStage];
  const playerVoice = STAGE_VOICE_TABLE[playerStage];
  const holonRegister = LINE_REGISTER_TABLE[holonLine];

  const toneDirective = `${holonVoice.toneDirective}; ${holonRegister.style}/${holonRegister.mode}`;
  const vocabularyBand = `${holonVoice.vocabularyBand}; ${holonRegister.focus}`;
  const valueLens = holonVoice.valueLens;
  const taboos = holonVoice.taboos;
  const crossAltitudeDynamic = computeCrossAltitudeDynamic(playerStage, holonStage);
  const crossAltitudeDirective = buildCrossAltitudeDirective(playerStage, holonStage);

  return {
    playerFrequency: { line: playerLine, stage: playerStage },
    holonFrequency: { line: holonLine, stage: holonStage },
    modality,
    toneDirective,
    vocabularyBand,
    valueLens,
    taboos,
    crossAltitudeDynamic,
    complexityRegister: playerVoice.complexityRegister,
    crossAltitudeDirective,
    // The lens read of the holon's position: what this ray position does, the vehicle it works
    // through, and what emerges at this altitude. One consumer each for `RAY_LENS`'s unread
    // `rayFunction`/`subtleBody` fields and for StageQuality's emergent order (MY-AD-0030).
    lensRead: {
      rayFunction: RAY_LENS[holonStage].rayFunction,
      subtleBody: RAY_LENS[holonStage].subtleBody,
      emergentOrder: qualityOf(holonStage).emergentOrder,
    },
  };
}
