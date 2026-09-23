/**
 * The journey blocks a session prompt is assembled from — collaborator 2 of the
 * `AgenticOrchestrator` extraction (module-cohesion audit item 4).
 *
 * Each block is a function of the record history plus, for the continuity block, the agent's
 * cross-encounter synthesis. Both used to be private methods reading `this.history` and
 * `this.agentSynthesis`, which is the same data, but reaching it through the class made the block
 * untestable and hid the fact that these two are the ONLY readers of those fields in the prompt
 * build.
 *
 * What the blocks are FOR is the reason they are worded the way they are: the model is being told
 * that the player remembers what happened, so it must not narrate a reset. A block that loses that
 * instruction reads as a bug in the storytelling, not in the prompt — hence the explicit sentences.
 */
import type { ConsequenceRecord } from '../domain/ConsequenceRecord.js';

/** A record passed when every drive direction is healthy — the engine's definition of "passed". */
function passedRecord(r: ConsequenceRecord): boolean {
  return Object.values(r.polarityTrace.driveDirectionality).every((d) => d === 'HealthyBalanced');
}

/**
 * `[RECENT JOURNEY]` — the last three encounters, with the pass state, polarity, shadow surfaced
 * and any line advance, followed by the agent's synthesis when one exists. Empty when the player
 * has no history: a first encounter is not a continuation and must not be framed as one.
 */
export function continuityContext(
  history: readonly ConsequenceRecord[],
  agentSynthesis?: string,
): string {
  if (history.length === 0) return '';
  const recent = history.slice(-3);
  const lines = recent.map((r, i) => {
    const passed = passedRecord(r);
    const shadow = r.shadowSurfaced ? ` Shadow surfaced: ${r.shadowSurfaced}.` : '';
    const altShift = r.altitudeShift
      ? ` LINE ADVANCED: ${r.altitudeShift.line} ${r.altitudeShift.from}→${r.altitudeShift.to}.`
      : '';
    const polarity =
      r.polarityTrace.energeticDirection === 'Radiative'
        ? ' (STO/radiative)'
        : r.polarityTrace.energeticDirection === 'Absorptive'
          ? ' (STS/absorptive)'
          : '';
    const moduleRef = r.encounterId.split(':')[0] ?? '';
    return `  ${i + 1}. [${moduleRef}] ${passed ? '✓ PASSED' : '✗ FAILED'}${polarity} — ${r.narrativeSummary.slice(0, 150)}${shadow}${altShift}`;
  });
  const agentCtx = agentSynthesis
    ? `\n[SESSION SYNTHESIS — cross-encounter pattern recognition from the persistent agent. Use this to inform your next question. Reference specific patterns.]\n${agentSynthesis}`
    : '';
  return `\n[RECENT JOURNEY — the player's developmental arc. Build upon these encounters. Reference specific events from them. The player remembers what happened.]\n${lines.join('\n')}${agentCtx}`;
}

/**
 * The one-line history prefix for a prompt that has no room for the full journey block: how many
 * challenges the player has faced, then the last three narratives in brief, then `Now:` — the cue
 * the rest of the prompt answers.
 *
 * The pass state is deliberately NOT marked here (unlike `continuityContext`): this block is a
 * memory cue, not a scoreboard. The original branched on `passed` and then produced the same string
 * in both branches; the branch is collapsed rather than preserved, because a conditional that
 * changes nothing is a claim about behaviour that is not true.
 */
export function briefHistory(history: readonly ConsequenceRecord[]): string {
  if (history.length === 0) return '';
  const last3 = history.slice(-3);
  const parts: string[] = [`You have faced ${history.length} challenges before.`];
  for (const r of last3) {
    const shadow = r.shadowSurfaced ? ` A ${r.shadowSurfaced} pattern surfaced.` : '';
    parts.push(`Recently: ${r.narrativeSummary.slice(0, 100)}...${shadow}`);
  }
  return parts.join(' ') + ' Now: ';
}
