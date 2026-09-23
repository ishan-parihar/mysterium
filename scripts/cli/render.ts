// @script-status: wired — imported by cli-game.ts, which `npm run cli` runs. No side effects of its own.
/**
 * Presentation-safe helpers — keeping the CLI out of the clinical register.
 *
 * These are the pure half of the runner's output: they take a value and return a string, and
 * they never read the flag state (`VERBOSE`/`JSON_MODE`), which is what lets them be
 * unit-tested without booting a session. The flag-reading printers (`info`, `warn`, `error`,
 * the session renderers) stay in `cli-game.ts` — extracting those needs a flags module first
 * (audit item 1, stage C).
 */
import chalk from 'chalk';
import type { Significator } from '../../src/core/domain/Significator.js';
import type { KnowledgeState } from '../../src/core/curriculum/types.js';
import { InfraConfig } from '../../src/core/config/InfraConfig.js';
import type { ConsequenceRecord } from '../../src/core/domain/ConsequenceRecord.js';
import { getCurriculumRegistry } from '../../src/core/curriculum/CurriculumRegistry.js';

// ── JSON event emitter for AI-agent consumption ───────────────────────
/** Strip ANSI escape codes from text for clean JSON output */
export const ANSI_REGEX = new RegExp(String.raw`\x1b\[[0-9;]*[a-zA-Z]`, 'g');

export function stripAnsi(text: string): string {
  return text.replace(ANSI_REGEX, '');
}

/** Stage color helper: returns ANSI color for a given stage */
// ponytail: returns chalk function, caller invokes with text
export function stageColor(stage: string): (text: string) => string {
  const colors: Record<string, (text: string) => string> = {
    Infrared: chalk.hex('#8B0000'),
    Magenta: chalk.hex('#BA55D3'),
    Red: chalk.hex('#FF0000'),
    Amber: chalk.hex('#FF8C00'),
    Orange: chalk.hex('#FFA500'),
    Green: chalk.hex('#00C853'),
    Teal: chalk.hex('#00BFA5'),
    Turquoise: chalk.hex('#00CED1'),
  };
  return colors[stage] ?? chalk.dim;
}

// P1-1 (UX-R3): Word-boundary-aware truncation. The previous slice(0, N)
// cut mid-word ("...beneath th..." instead of "...beneath the surface."),
// making narratives feel broken even though the full text existed in JSON.
// This helper preserves sentence boundaries when possible and always ends
// on a word boundary.
export function truncateNarrative(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  // Try to break on a sentence-ending punctuation first.
  const sentenceEnd = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '));
  if (sentenceEnd > max * 0.5) {
    return cut.slice(0, sentenceEnd + 1) + '…';
  }
  // Otherwise break on the last space within the cut window.
  const lastSpace = cut.lastIndexOf(' ');
  if (lastSpace > max * 0.5) {
    return cut.slice(0, lastSpace) + '…';
  }
  // Fallback: hard cut.
  return cut + '…';
}

/**
 * NF-8 (Fresh-User Re-Audit): Truncate at a word boundary under `max` chars.
 * Unlike truncateNarrative (which targets narrative prose), this is for
 * shorter fields like session key_shift where a mid-word cut is jarring.
 * Returns the text unchanged if it fits; otherwise cuts at the last space
 * under the limit and appends an ellipsis.
 */
export function truncateAtWordBoundary(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  if (lastSpace > max * 0.5) {
    return cut.slice(0, lastSpace) + '…';
  }
  // No good word boundary — hard cut with ellipsis
  return cut.trimEnd() + '…';
}

/**
 * P1-U4/Y4/R2 (Fresh-User UX Audit): Felt-sense indicator helpers.
 *
 * The audit found that CCI numeric displays (0.4115), readiness percentages
 * (76%), and saturation percentages (28%) violate the Veil principle and
 * read like an RPG quest tracker. These helpers convert quantitative metrics
 * to qualitative felt-sense language that preserves the information without
 * breaking the contemplative frame.
 *
 * Band vocabulary:
 *   < 0.30 → 'arriving'     (just beginning)
 *   0.30-0.50 → 'working'   (engaged with the work)
 *   0.50-0.70 → 'integrating' (patterns finding their place)
 *   0.70-0.85 → 'transforming' (something is shifting)
 *   > 0.85 → 'embodying'    (the shift has landed)
 *
 * Saturation vocabulary (encounters processed at current stage):
 *   < 0.3 → 'holding'       (still gathering)
 *   0.3-0.6 → 'opening'     (the work is opening up)
 *   0.6-0.9 → 'deepening'   (the work is deepening)
 *   > 0.9 → 'ready to shift' (threshold approaching)
 */
export function cciToFeltSense(cci: number): string {
  if (cci < 0.30) return 'arriving';
  if (cci < 0.50) return 'working';
  if (cci < 0.70) return 'integrating';
  if (cci < 0.85) return 'transforming';
  return 'embodying';
}

export function saturationToFeltSense(saturation: number): string {
  if (saturation < 0.3) return 'holding';
  if (saturation < InfraConfig.SATURATION_THRESHOLD) return 'opening';
  if (saturation < 0.9) return 'deepening';
  return 'ready to shift';
}

export function readinessToFeltSense(readiness: number): string {
  if (readiness < 0.3) return 'the work is still gathering';
  if (readiness < 0.5) return 'the work is finding its feet';
  if (readiness < 0.7) return 'something is building';
  if (readiness < 0.8) return 'something is approaching';
  return 'the threshold is here';
}

/**
 * Translate a clinical shadow-quadrant code into a Veil-compliant
 * qualitative movement description.
 */
export function describeShadowMovement(quadrant: string): string {
  switch (quadrant) {
    case 'DarkAddiction': return 'a pull toward a familiar capacity';
    case 'DarkAllergy': return 'an aversion to something still needed';
    case 'GoldenAddiction': return 'a reach toward something not yet integrated';
    case 'GoldenAllergy': return 'a resistance to growth in a specific area';
    default: return 'an unresolved pattern';
  }
}

/**
 * P0-2 (Fresh-User UX Audit): Generate a practice hint from the player's
 * integration response and current shadow state. Returns a single-sentence
 * practice assignment that the player can carry into their daily life.
 * Returns null if the response is too short or no practice can be inferred.
 */
export function generatePracticeHint(response: string, sig: Significator): string | null {
  if (response.length < 10) return null;

  const lower = response.toLowerCase();

  // Map integration response keywords to practice assignments
  // These are lightweight heuristics — the LLM synthesis handles deeper work
  const practiceMap: [RegExp, string][] = [
    [/surprise|unexpected|didn't expect/, `Tomorrow, notice the moment you feel surprised. Pause for 3 breaths before responding. What does the surprise reveal about your assumptions?`],
    [/stuck|stuck|can't move|paralyzed/, `When you notice being stuck this week, try doing the opposite of your first impulse. If you usually push harder, pause. If you usually withdraw, reach out.`],
    [/avoid|avoiding|run away|retreat/, `One time this week, stay with an uncomfortable feeling for 60 seconds longer than you usually would. Notice what happens in your body, not your mind.`],
    [/anger|furious|rage|mad/, `The next time anger rises, name it aloud before acting: "I notice anger." Then take one breath before choosing your response.`],
    [/honest|truth|lie|withhold/, `Notice one moment today where you choose honesty over comfort. You don't have to act on it — just notice the choice point.`],
    [/body|tension|breathe|physical/, `Set a timer for 3 random points tomorrow. When it rings, check in with your body for 10 seconds: where is the tension? What is it holding?`],
    [/relationship|connection|alone|lonely/, `Reach out to one person this week with a question you normally wouldn't ask. Not about them — about what you notice between you.`],
    [/pattern|repeat|again|same/, `Notice when the pattern you named shows up this week. You don't have to change it — just see it happening in real time.`],
    [/push|harder|force|will/, `One time this week, when you notice yourself pushing, stop. Ask: what would happen if I didn't? Stay with the answer for 3 breaths.`],
    [/meaning|purpose|why|point/, `Spend 5 minutes this week sitting with the question you named, without trying to answer it. Let the question be the practice.`],
  ];

  for (const [pattern, practice] of practiceMap) {
    if (pattern.test(lower)) {
      return practice;
    }
  }

  // P1-R5 (Curriculum Audit): Enhanced shadow-state-aware practice hints.
  // Instead of a single generic notice, tailor the practice to the shadow quadrant
  // and include a line-specific somatic grounding element.
  const activeShadows = sig.shadows.entries.filter(e => !e.resolvedAt);
  if (activeShadows.length > 0) {
    const shadow = activeShadows[0]!;
    const movement = describeShadowMovement(shadow.quadrant ?? 'Unknown');
    const quadrant = shadow.quadrant ?? 'Unknown';
    // Each quadrant gets a different practice modality
    switch (quadrant) {
      case 'DarkAddiction':
        return `This week, notice the pull toward ${movement}. When you feel it, place a hand on your chest for 3 breaths. You don't have to resist — just feel what it's like to hold the pull without following it.`;
      case 'DarkAllergy':
        return `Notice when ${movement} arises. This time, instead of pushing it away, breathe into the area of your body that tenses. Stay for 60 seconds. What is the aversion protecting?`;
      case 'GoldenAddiction':
        return `When ${movement} appears, pause. Ask: "What am I trying to reach toward before I'm ready?" Sit with the question for 3 breaths. Growth doesn't need to be forced.`;
      case 'GoldenAllergy':
        return `Notice ${movement} this week. Instead of ignoring it, ask: "What would it mean to let this in?" Stay with whatever answer arises for 3 breaths.`;
      default:
        return `Notice when ${movement} shows up this week. You don't have to fix it — just see it clearly.`;
    }
  }

  // P1-R5: Default practice for any response
  return `Tomorrow, notice one moment where you have a choice between comfort and growth. You don't have to choose differently — just see the choice.`;
}

/**
 * P2-R9 (Curriculum Audit): Display a somatic-body-specific practice after
 * Somatic-line encounters. Returns a short, body-focused practice prompt
 * when the last encounter was in the Somatic line.
 */
export function somaticPracticeHint(history: ConsequenceRecord[]): string | null {
  if (history.length === 0) return null;
  const lastEncounter = history[history.length - 1]!;
  if (lastEncounter.line !== 'Somatic') return null;
  const practices = [
    `Before bed tonight, scan your body from head to toe. Where are you holding tension? Breathe into that spot for 5 cycles. You don't need to release it — just acknowledge what your body is carrying.`,
    `Tomorrow morning, before reaching for your phone, stand with both feet on the floor. Notice the ground beneath you for 30 seconds. What does your body know that your mind hasn't caught up with?`,
    `Set a random alarm for some time today. When it sounds, stop everything and notice: posture, breath, jaw tension, shoulder position. Hold awareness for 10 seconds, then gently adjust one thing.`,
    `This evening, place both hands on your lower belly. Breathe slowly for 60 seconds, letting your belly soften with each exhale. What emotion lives in this part of your body?`,
  ];
  return practices[Math.floor(Math.random() * practices.length)]!;
}

/** P0-1: Resolve a curriculum concept ID to a display label. Returns empty string if not found. */
export function curriculumLabel(conceptId: string | undefined): string {
  if (!conceptId) return '';
  try {
    const reg = getCurriculumRegistry();
    const h = reg.get(conceptId);
    return h ? ` ${h.name}` : '';
  } catch { return ''; }
}

/**
 * P3-4: Check prerequisites for a curriculum concept and return missing ones.
 * Returns an array of { id, name, type } for each unmet prerequisite.
 * type is 'same-branch' or 'cross-branch'.
 */
export function checkPrerequisiteGaps(
  conceptId: string,
  knowledge: KnowledgeState | undefined,
): { id: string; name: string; type: 'same-branch' | 'cross-branch' }[] {
  if (!knowledge) return [];
  try {
    const reg = getCurriculumRegistry();
    const holon = reg.get(conceptId);
    if (!holon) return [];

    const missing: { id: string; name: string; type: 'same-branch' | 'cross-branch' }[] = [];

    // Check same-branch prerequisites
    for (const prereqId of holon.prerequisites) {
      if (!knowledge.conceptStates.has(prereqId)) {
        const prereqHolon = reg.get(prereqId);
        missing.push({
          id: prereqId,
          name: prereqHolon?.name ?? prereqId.split('.').pop() ?? prereqId,
          type: 'same-branch',
        });
      }
    }

    // Check cross-branch prerequisites
    for (const cbId of (holon.crossBranchPrerequisites ?? [])) {
      if (!knowledge.conceptStates.has(cbId)) {
        const cbHolon = reg.get(cbId);
        missing.push({
          id: cbId,
          name: cbHolon?.name ?? cbId.split('.').pop() ?? cbId,
          type: 'cross-branch',
        });
      }
    }

    return missing;
  } catch { return []; }
}
