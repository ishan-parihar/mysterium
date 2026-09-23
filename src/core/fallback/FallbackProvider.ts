/**
 * FallbackProvider — pre-authored content for when the LLM is unavailable.
 *
 * Per foundations/22 §12. Content drawn from concept-drafts for each modality.
 *
 * The CORPUS lives in `./data/` (one module per modality family, authored against `data/schema.ts`);
 * this file is the SELECTOR: the line→pool routing tables, the stage-band reframing, the
 * asked-prompt memory and `getFallback`. Split per the module-cohesion audit (item 5) — the file was
 * 1 632 lines of prose around 300 lines of logic, so a wording change read as a selector change.
 *
 * Phase 4 upgrade: content is LINE-SPECIFIC. Each of the 8 lines (Cognitive, Emotional, Moral,
 * Intrapersonal, Spiritual, Interpersonal, Somatic, Willpower) gets distinct prompts and
 * drive-mapped MCQ options so the assessment actually probes the correct developmental dimension.
 *
 * Location note: this file was moved from src/infra/llm/ to src/core/fallback/ during
 * HARDCODE-AUDIT step 1. The LLM-tier infrastructure should not own pre-authored content — this is
 * a domain concern (validated developmental exercises), not a transport concern.
 *
 * Invariant: the WebUI's LLM-driven path NEVER imports this module. It exists exclusively as a
 * degradation target. The Veil seam surfaces the use of this content to the player.
 */
import * as fs from 'fs';
import type { Modality } from '../domain/enums.js';
import type { Line } from '../domain/Line.js';
import { stageOrdinal, type Stage } from '../domain/Stage.js';
import { driveOptionsToMCQ, type FallbackContent } from './data/schema.js';
export type { FallbackContent };
import {
  LR_COGNITIVE_RED,
  LR_EMOTIONAL_RED,
  LR_MORAL_RED,
  LR_INTRAPERSONAL_RED,
  LR_SPIRITUAL_RED,
  LR_INTERPERSONAL_RED,
  LR_SOMATIC_RED,
  LR_WILLPOWER_RED,
  LR_COGNITIVE_ORANGE,
  LR_EMOTIONAL_ORANGE,
  LR_MORAL_ORANGE,
  LR_INTRAPERSONAL_ORANGE,
  LR_SPIRITUAL_ORANGE,
  LR_INTERPERSONAL_ORANGE,
  LR_SOMATIC_ORANGE,
  LR_WILLPOWER_ORANGE,
  LR_COGNITIVE_AMBER,
  LR_EMOTIONAL_AMBER,
  LR_MORAL_AMBER,
  LR_INTRAPERSONAL_AMBER,
  LR_SPIRITUAL_AMBER,
  LR_INTERPERSONAL_AMBER,
  LR_SOMATIC_AMBER,
  LR_WILLPOWER_AMBER,
  LANGUAGE_REFLECTIVE_INFRARED,
  LANGUAGE_REFLECTIVE_MAGENTA,
  LR_COGNITIVE_GREEN,
  LR_EMOTIONAL_GREEN,
  LR_MORAL_GREEN,
  LR_INTRAPERSONAL_GREEN,
  LR_SPIRITUAL_GREEN,
  LR_INTERPERSONAL_GREEN,
  LR_SOMATIC_GREEN,
  LR_WILLPOWER_GREEN,
  LR_COGNITIVE_TURQUOISE,
  LR_EMOTIONAL_TURQUOISE,
  LR_MORAL_TURQUOISE,
  LR_INTRAPERSONAL_TURQUOISE,
  LR_SPIRITUAL_TURQUOISE,
  LR_INTERPERSONAL_TURQUOISE,
  LR_SOMATIC_TURQUOISE,
  LR_WILLPOWER_TURQUOISE,
  LR_COGNITIVE_WHITE,
  LR_EMOTIONAL_WHITE,
  LR_MORAL_WHITE,
  LR_INTRAPERSONAL_WHITE,
  LR_SPIRITUAL_WHITE,
  LR_INTERPERSONAL_WHITE,
  LR_SOMATIC_WHITE,
  LR_WILLPOWER_WHITE,
} from './data/languageReflective.js';
import {
  SC_COGNITIVE_RED,
  SC_EMOTIONAL_RED,
  SC_MORAL_RED,
  SC_INTRAPERSONAL_RED,
  SC_SPIRITUAL_RED,
  SC_INTERPERSONAL_RED,
  SC_SOMATIC_RED,
  SC_WILLPOWER_RED,
  SC_COGNITIVE_ORANGE,
  SC_EMOTIONAL_ORANGE,
  SC_MORAL_ORANGE,
  SC_INTRAPERSONAL_ORANGE,
  SC_SPIRITUAL_ORANGE,
  SC_INTERPERSONAL_ORANGE,
  SC_SOMATIC_ORANGE,
  SC_WILLPOWER_ORANGE,
  SC_COGNITIVE_AMBER,
  SC_EMOTIONAL_AMBER,
  SC_MORAL_AMBER,
  SC_INTRAPERSONAL_AMBER,
  SC_SPIRITUAL_AMBER,
  SC_INTERPERSONAL_AMBER,
  SC_SOMATIC_AMBER,
  SC_WILLPOWER_AMBER,
} from './data/scenarioChoice.js';
import {
  EMB_COGNITIVE_RED,
  EMB_EMOTIONAL_RED,
  EMB_MORAL_RED,
  EMB_INTRAPERSONAL_RED,
  EMB_SPIRITUAL_RED,
  EMB_INTERPERSONAL_RED,
  EMB_SOMATIC_RED,
  EMB_WILLPOWER_RED,
} from './data/embodied.js';
import {
  DET_COGNITIVE_RED,
  DET_EMOTIONAL_RED,
  DET_MORAL_RED,
  DET_INTRAPERSONAL_RED,
  DET_SPIRITUAL_RED,
  DET_INTERPERSONAL_RED,
  DET_SOMATIC_RED,
  DET_WILLPOWER_RED,
} from './data/deterministic.js';
import {
  GENERIC_LANGUAGE_REFLECTIVE,
  GENERIC_SCENARIO_CHOICE,
  GENERIC_DETERMINISTIC,
  GENERIC_STRATEGIC,
  GENERIC_EMBODIED,
  GENERIC_SOCIAL_COOPERATIVE,
  GENERIC_IMMERSIVE_RPG,
  GENERIC_FALLBACK,
} from './data/generic.js';

// ============================================================================
// LINE → CONTENT POOL MAP — the routing tables
// ============================================================================

type ContentPool = readonly FallbackContent[];

/** Line-specific LanguageReflective pools — Red stage */
const LR_BY_LINE_RED: Record<string, ContentPool> = {
  Cognitive: LR_COGNITIVE_RED,
  Emotional: LR_EMOTIONAL_RED,
  Moral: LR_MORAL_RED,
  Intrapersonal: LR_INTRAPERSONAL_RED,
  Spiritual: LR_SPIRITUAL_RED,
  Interpersonal: LR_INTERPERSONAL_RED,
  Somatic: LR_SOMATIC_RED,
  Willpower: LR_WILLPOWER_RED,
};

/** Line-specific LanguageReflective pools — Orange stage */
const LR_BY_LINE_ORANGE: Record<string, ContentPool> = {
  Cognitive: LR_COGNITIVE_ORANGE,
  Emotional: LR_EMOTIONAL_ORANGE,
  Moral: LR_MORAL_ORANGE,
  Intrapersonal: LR_INTRAPERSONAL_ORANGE,
  Spiritual: LR_SPIRITUAL_ORANGE,
  Interpersonal: LR_INTERPERSONAL_ORANGE,
  Somatic: LR_SOMATIC_ORANGE,
  Willpower: LR_WILLPOWER_ORANGE,
};

/** Line-specific LanguageReflective pools — Amber stage */
const LR_BY_LINE_AMBER: Record<string, ContentPool> = {
  Cognitive: LR_COGNITIVE_AMBER,
  Emotional: LR_EMOTIONAL_AMBER,
  Moral: LR_MORAL_AMBER,
  Intrapersonal: LR_INTRAPERSONAL_AMBER,
  Spiritual: LR_SPIRITUAL_AMBER,
  Interpersonal: LR_INTERPERSONAL_AMBER,
  Somatic: LR_SOMATIC_AMBER,
  Willpower: LR_WILLPOWER_AMBER,
};

/** Line-specific LanguageReflective pools — Green stage */
const LR_BY_LINE_GREEN: Record<string, ContentPool> = {
  Cognitive: LR_COGNITIVE_GREEN,
  Emotional: LR_EMOTIONAL_GREEN,
  Moral: LR_MORAL_GREEN,
  Intrapersonal: LR_INTRAPERSONAL_GREEN,
  Spiritual: LR_SPIRITUAL_GREEN,
  Interpersonal: LR_INTERPERSONAL_GREEN,
  Somatic: LR_SOMATIC_GREEN,
  Willpower: LR_WILLPOWER_GREEN,
};

const LR_BY_LINE_TURQUOISE: Record<string, ContentPool> = {
  Cognitive: LR_COGNITIVE_TURQUOISE,
  Emotional: LR_EMOTIONAL_TURQUOISE,
  Moral: LR_MORAL_TURQUOISE,
  Intrapersonal: LR_INTRAPERSONAL_TURQUOISE,
  Spiritual: LR_SPIRITUAL_TURQUOISE,
  Interpersonal: LR_INTERPERSONAL_TURQUOISE,
  Somatic: LR_SOMATIC_TURQUOISE,
  Willpower: LR_WILLPOWER_TURQUOISE,
};

const LR_BY_LINE_WHITE: Record<string, ContentPool> = {
  Cognitive: LR_COGNITIVE_WHITE,
  Emotional: LR_EMOTIONAL_WHITE,
  Moral: LR_MORAL_WHITE,
  Intrapersonal: LR_INTRAPERSONAL_WHITE,
  Spiritual: LR_SPIRITUAL_WHITE,
  Interpersonal: LR_INTERPERSONAL_WHITE,
  Somatic: LR_SOMATIC_WHITE,
  Willpower: LR_WILLPOWER_WHITE,
};

/** Line-specific ScenarioChoice pools — Red stage */
const SC_BY_LINE_RED: Record<string, ContentPool> = {
  Cognitive: SC_COGNITIVE_RED,
  Emotional: SC_EMOTIONAL_RED,
  Moral: SC_MORAL_RED,
  Intrapersonal: SC_INTRAPERSONAL_RED,
  Spiritual: SC_SPIRITUAL_RED,
  Interpersonal: SC_INTERPERSONAL_RED,
  Somatic: SC_SOMATIC_RED,
  Willpower: SC_WILLPOWER_RED,
};

/** Line-specific ScenarioChoice pools — Orange stage */
const SC_BY_LINE_ORANGE: Record<string, ContentPool> = {
  Cognitive: SC_COGNITIVE_ORANGE,
  Emotional: SC_EMOTIONAL_ORANGE,
  Moral: SC_MORAL_ORANGE,
  Intrapersonal: SC_INTRAPERSONAL_ORANGE,
  Spiritual: SC_SPIRITUAL_ORANGE,
  Interpersonal: SC_INTERPERSONAL_ORANGE,
  Somatic: SC_SOMATIC_ORANGE,
  Willpower: SC_WILLPOWER_ORANGE,
};

/** Line-specific ScenarioChoice pools — Amber stage */
const SC_BY_LINE_AMBER: Record<string, ContentPool> = {
  Cognitive: SC_COGNITIVE_AMBER,
  Emotional: SC_EMOTIONAL_AMBER,
  Moral: SC_MORAL_AMBER,
  Intrapersonal: SC_INTRAPERSONAL_AMBER,
  Spiritual: SC_SPIRITUAL_AMBER,
  Interpersonal: SC_INTERPERSONAL_AMBER,
  Somatic: SC_SOMATIC_AMBER,
  Willpower: SC_WILLPOWER_AMBER,
};

/** Line-specific Embodied pools — Red stage */
const EMB_BY_LINE_RED: Record<string, ContentPool> = {
  Cognitive: EMB_COGNITIVE_RED,
  Emotional: EMB_EMOTIONAL_RED,
  Moral: EMB_MORAL_RED,
  Intrapersonal: EMB_INTRAPERSONAL_RED,
  Spiritual: EMB_SPIRITUAL_RED,
  Interpersonal: EMB_INTERPERSONAL_RED,
  Somatic: EMB_SOMATIC_RED,
  Willpower: EMB_WILLPOWER_RED,
};

/** Line-specific Deterministic pools — Red stage */
const DET_BY_LINE_RED: Record<string, ContentPool> = {
  Cognitive: DET_COGNITIVE_RED,
  Emotional: DET_EMOTIONAL_RED,
  Moral: DET_MORAL_RED,
  Intrapersonal: DET_INTRAPERSONAL_RED,
  Spiritual: DET_SPIRITUAL_RED,
  Interpersonal: DET_INTERPERSONAL_RED,
  Somatic: DET_SOMATIC_RED,
  Willpower: DET_WILLPOWER_RED,
};

// ============================================================================
// Public API
// ============================================================================

// PILOT-5.4 (Efficacy Pilot): Track asked questions to avoid repetition.
// NF-3 (Fresh-User Re-Audit): Cross-session de-dup is now implemented.
// The re-audit found Session 4 was entirely verbatim duplicates from
// earlier sessions — the in-memory Set was empty on each new process.
// Now the set is persisted to the profile directory (asked-prompts.json)
// and loaded at session start.
const _askedPrompts = new Set<string>();

const ASKED_PROMPTS_MAX = 200; // cap to prevent unbounded growth

/**
 * NF-3: Load the asked-prompts set from the active profile directory.
 * Called by the CLI at session start. No-op if no profile is active
 * or the file doesn't exist yet.
 */
export function loadAskedPrompts(profileDir: string | null): void {
  _askedPrompts.clear();
  if (!profileDir) return;
  try {
    const file = profileDir + '/asked-prompts.json';
    if (fs.existsSync(file)) {
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (Array.isArray(data.prompts)) {
        for (const p of data.prompts) {
          if (typeof p === 'string') _askedPrompts.add(p);
        }
      }
    }
  } catch { /* best-effort — start with empty set */ }
}

/**
 * NF-3: Save the asked-prompts set to the active profile directory.
 * Called by the CLI at session end. No-op if no profile is active.
 */
export function saveAskedPrompts(profileDir: string | null): void {
  if (!profileDir) return;
  try {
    fs.mkdirSync(profileDir, { recursive: true });
    // Cap the set to the most recent N prompts (Set preserves insertion order)
    const prompts = [..._askedPrompts];
    const capped = prompts.length > ASKED_PROMPTS_MAX
      ? prompts.slice(prompts.length - ASKED_PROMPTS_MAX)
      : prompts;
    const file = profileDir + '/asked-prompts.json';
    fs.writeFileSync(file, JSON.stringify({ prompts: capped }, null, 2), 'utf8');
  } catch { /* best-effort — don't break session end */ }
}

/** NF-3: Test helper — clear the in-memory set (for unit tests). */
export function _clearAskedPromptsForTest(): void {
  _askedPrompts.clear();
}

function pickRandom<T>(arr: readonly T[]): T {
  // If the array items have a 'prompt' field, try to avoid repeating
  if (arr.length > 0 && typeof arr[0] === 'object' && arr[0] !== null && 'prompt' in arr[0]) {
    const unasked = arr.filter(item => {
      const prompt = (item as any).prompt as string | undefined;
      return !prompt || !_askedPrompts.has(prompt);
    });
    // If all have been asked, clear the set and start fresh (but still pick randomly)
    const pool = unasked.length > 0 ? unasked : arr;
    const index = Math.floor(Math.random() * pool.length);
    const picked = pool[index] as any;
    if (picked?.prompt) _askedPrompts.add(picked.prompt);
    return picked as T;
  }
  const index = Math.floor(Math.random() * arr.length);
  return arr[index];
}

function pickFromStageLinePools(
  stagePools: Record<string, Record<string, ContentPool>>,
  stage: Stage,
  line: Line,
  genericFallback: ContentPool,
): FallbackContent {
  const linePool = stagePools[stage]?.[line];
  if (linePool && linePool.length > 0) return pickRandom(linePool);
  // Fall back to Red stage for this line if higher stages don't have line-specific content
  const redPool = stagePools['Red']?.[line];
  if (redPool && redPool.length > 0) return pickRandom(redPool);
  return pickRandom(genericFallback);
}

// ─── Altitude-conditional reframe layers ─────────────────────────────
// Per the altitude-scaling audit: a Teal player encountering Red-stage
// content needs a DIFFERENT framing than a Red player encountering the same
// content. These reframe layers wrap the base prompt with altitude-conditional
// meta-cognitive framing. The base prompt (Red-stage content) is preserved;
// the reframe layer adds the complexity the player's altitude demands.

type AltitudeBand = 'low' | 'mid' | 'high' | 'peak';

function altitudeBand(playerStage: Stage): AltitudeBand {
  const ord = stageOrdinal(playerStage);
  if (ord <= 2) return 'low';    // Infrared, Magenta, Red
  if (ord <= 4) return 'mid';    // Amber, Orange
  if (ord <= 6) return 'high';   // Green, Teal
  return 'peak';                  // Turquoise
}

interface ReframeLayer {
  readonly prefix: string;
  readonly suffix: string;
}

// Per-(holonStage × altitudeBand) reframe layers.
// When player altitude = holon stage (same band), no reframe (base prompt used as-is).
const REFRAME_LAYERS: Partial<Record<string, Record<AltitudeBand, ReframeLayer>>> = {
  Red: {
    low: { prefix: '', suffix: '' },  // co-altitudinal — no reframe
    mid: {
      prefix: 'You can see this Red-stage pattern from your current vantage. ',
      suffix: ' — What does the pattern still cost you, even now that you can name it?',
    },
    high: {
      prefix: 'Notice the Red-stage pattern arising. You can hold it as pattern, not identity. ',
      suffix: ' — Where does the pattern still live unmetabolized in you? Not the version you can name — the version that still names you.',
    },
    peak: {
      prefix: 'From presence, witness the Red pattern as it moves. ',
      suffix: ' — What is the felt-quality of recognizing it as pattern, without rejecting or identifying?',
    },
  },
  Amber: {
    low: { prefix: '', suffix: '' },
    mid: {
      prefix: 'You can see the structure this Amber-stage pattern imposes. ',
      suffix: ' — Where does the structure still shape you, even as you see through it?',
    },
    high: {
      prefix: 'Notice the Amber-stage pattern: inherited order, unexamined loyalty. You can hold it as pattern. ',
      suffix: ' — What in you still reaches for the structure even as you see its limits?',
    },
    peak: {
      prefix: 'From presence, witness the Amber pattern of order-seeking. ',
      suffix: ' — What is the felt-quality of the order-impulse arising and dissolving?',
    },
  },
  Orange: {
    low: { prefix: '', suffix: '' },
    mid: { prefix: '', suffix: '' },
    high: {
      prefix: 'Notice the Orange-stage pattern: achievement as identity, optimization as purpose. You can see it from above. ',
      suffix: ' — Where does the achiever-self still drive you, even as you witness its construct-nature?',
    },
    peak: {
      prefix: 'From presence, witness the Orange pattern of strategic optimization. ',
      suffix: ' — What is the felt-quality of the optimizing impulse arising and dissolving?',
    },
  },
  Green: {
    low: { prefix: '', suffix: '' },
    mid: { prefix: '', suffix: '' },
    high: {
      prefix: 'Notice the Green-stage pattern: sensitivity as identity, inclusion as purpose. You can see it from above. ',
      suffix: ' — Where does the sensitivity-self still bind you, even as you witness its compassion-nature?',
    },
    peak: {
      prefix: 'From presence, witness the Green pattern of empathic inclusion. ',
      suffix: ' — What is the felt-quality of the inclusion-impulse arising and dissolving?',
    },
  },
  Teal: {
    low: { prefix: '', suffix: '' },
    mid: { prefix: '', suffix: '' },
    high: { prefix: '', suffix: '' },  // co-altitudinal for high-band Teal players
    peak: {
      prefix: 'From presence, witness the Teal pattern of integral vision. ',
      suffix: ' — What is the felt-quality of the integral-impulse arising and dissolving?',
    },
  },
  Turquoise: {
    low: { prefix: '', suffix: '' },
    mid: { prefix: '', suffix: '' },
    high: { prefix: '', suffix: '' },
    peak: {
      prefix: 'From presence, witness the Turquoise pattern of non-dual release. ',
      suffix: ' — What is the felt-quality of presence itself, without object?',
    },
  },
};

function applyReframe(content: FallbackContent, holonStage: Stage, playerStage: Stage): FallbackContent {
  const band = altitudeBand(playerStage);
  const stageReframes = REFRAME_LAYERS[holonStage];
  if (!stageReframes) return content;
  const layer = stageReframes[band];
  if (!layer || (layer.prefix === '' && layer.suffix === '')) return content;

  // Apply reframe to ALL text-bearing fields
  const reframedPrompt = content.prompt
    ? `${layer.prefix}${content.prompt}${layer.suffix}`
    : content.prompt;

  const reframedScenario = content.scenario
    ? `${layer.prefix}${content.scenario}${layer.suffix}`
    : content.scenario;

  // GAP-V3-35: Also reframe the 'framing' field (used by Deterministic modality)
  const reframedFraming = content.framing
    ? `${layer.prefix}${content.framing}${layer.suffix}`
    : content.framing;

  return {
    ...content,
    prompt: reframedPrompt,
    scenario: reframedScenario,
    framing: reframedFraming,
  };
}

export function getFallback(modality: Modality, line: Line, stage: Stage, playerStage?: Stage): FallbackContent {
  const playerAlt = playerStage ?? stage;  // default: co-altitudinal (no reframe)
  let content: FallbackContent;

  switch (modality) {
    case 'LanguageReflective': {
      const stageMap: Record<string, Record<string, ContentPool>> = {
        Red: LR_BY_LINE_RED,
        Orange: LR_BY_LINE_ORANGE,
        Amber: LR_BY_LINE_AMBER,
        Green: LR_BY_LINE_GREEN,
        Teal: LR_BY_LINE_TURQUOISE,
        Turquoise: LR_BY_LINE_WHITE,
      };
      if (stage === 'Infrared') content = pickRandom(LANGUAGE_REFLECTIVE_INFRARED);
      else if (stage === 'Magenta') content = pickRandom(LANGUAGE_REFLECTIVE_MAGENTA);
      else content = pickFromStageLinePools(stageMap, stage, line, LR_BY_LINE_RED[line] ?? [GENERIC_LANGUAGE_REFLECTIVE]);
      break;
    }

    case 'ScenarioChoice': {
      const stageMap: Record<string, Record<string, ContentPool>> = {
        Red: SC_BY_LINE_RED,
        Orange: SC_BY_LINE_ORANGE,
        Amber: SC_BY_LINE_AMBER,
      };
      if (stage === 'Infrared') content = pickRandom([
        { scenario: 'Raw sensation. Before interpretation, before story — something moves through you.', options: driveOptionsToMCQ({ agency: 'Follow it', communion: 'Share it with someone', eros: 'Let it transform you', agape: 'Hold it with acceptance' }) },
      ]);
      else if (stage === 'Magenta') content = pickRandom([
        { scenario: 'The ritual has begun. Something ancient stirs.', options: driveOptionsToMCQ({ agency: 'Lead the ritual', communion: 'Surrender to it', eros: 'Channel the energy', agape: 'Hold the space for all' }) },
      ]);
      else content = pickFromStageLinePools(stageMap, stage, line, SC_BY_LINE_RED[line] ?? [GENERIC_SCENARIO_CHOICE]);
      break;
    }

    case 'Deterministic': {
      const detStageMap: Record<string, Record<string, ContentPool>> = {
        Red: DET_BY_LINE_RED,
      };
      content = pickFromStageLinePools(detStageMap, stage, line, [GENERIC_DETERMINISTIC]);
      break;
    }

    case 'Embodied': {
      const embStageMap: Record<string, Record<string, ContentPool>> = {
        Red: EMB_BY_LINE_RED,
      };
      content = pickFromStageLinePools(embStageMap, stage, line, [GENERIC_EMBODIED]);
      break;
    }

    case 'Strategic':
      content = GENERIC_STRATEGIC;
      break;
    case 'SocialCooperative':
      content = GENERIC_SOCIAL_COOPERATIVE;
      break;
    case 'ImmersiveRPG':
      content = GENERIC_IMMERSIVE_RPG;
      break;
    default:
      content = GENERIC_FALLBACK;
  }

  // Apply altitude-conditional reframe
  return applyReframe(content, stage, playerAlt);
}
