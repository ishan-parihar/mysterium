// @script-status: wired — imported by cli-game.ts, which `npm run cli` runs. No side effects of its own.
/**
 * The runner's printers — everything that writes to the player.
 *
 * Stage C of the CLI split (module-cohesion audit item 1). These are the flag-READING half of
 * the output: whether to print at all (`HEADLESS`), whether to print JSON instead (`JSON_MODE`),
 * and whether the machinery is visible (`VERBOSE`). They could not move until the invocation
 * state had one owner (`./flags.ts`) — the blocker was never the printers, it was that none of
 * them owned what they read.
 *
 * The pure half — truncation, felt-sense bands, shadow wording — is `./render.ts`, which imports
 * no state at all. The split between the two is the testability line: `render.ts` is unit-tested
 * (`tests/cli/RenderHelpers.test.ts`), this module is exercised by the subcommand matrix.
 *
 * Veil rule that shapes several of these: the player-facing register never carries numerals or
 * clinical vocabulary unless `--dev` asked for the machinery explicitly.
 */
import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import boxen from 'boxen';
import { DEV_MODE, JSON_MODE, VERBOSE } from './flags.js';
import { stripAnsi, describeShadowMovement, checkPrerequisiteGaps } from './render.js';
import { type WorldState } from '../../src/core/engines/CandidateGeneration.js';
import type { Significator } from '../../src/core/domain/Significator.js';
import type { KnowledgeState } from '../../src/core/curriculum/types.js';
import type { ScheduledEncounter } from '../../src/core/domain/EncounterSpecNew.js';
import { describePersonalResonance } from '../../src/core/presentation/veilDescriptors.js';
import type { ConsequenceRecord } from '../../src/core/domain/ConsequenceRecord.js';
import { getMysteriumProfileDir } from '../../src/infra/persistence/mysteriumDir.js';
import { getActiveProfileDir, loadUnlockedTerms } from '../../src/infra/profiles/ProfileManager.js';
import { toSnapshot } from '../../src/core/domain/SignificatorSnapshot.js';
import { computeCCI } from '../../src/core/engines/CCIEngine.js';
import { getCurriculumRegistry } from '../../src/core/curriculum/CurriculumRegistry.js';
import { probeCurriculum, formatProbeSummary } from '../../src/core/curriculum/MetaCognitiveProbe.js';

// ── Helpers ───────────────────────────────────────────────────────────
// ponytail: chalk auto-resets between calls, no explicit reset needed

export function banner(text: string): void {
  if (!JSON_MODE) console.log(`\n${chalk.bold.cyan(`═══ ${text} ═══`)}`);
}

export function info(label: string, value: string): void {
  if (!JSON_MODE) console.log(`  ${chalk.dim(label + ':')} ${value}`);
}

export function success(text: string): void {
  if (!JSON_MODE) console.log(`  ${chalk.green('✓')} ${text}`);
}

export function warn(text: string): void {
  if (!JSON_MODE) console.log(`  ${chalk.yellow('⚠')} ${text}`);
}

export function error(text: string): void {
  if (!JSON_MODE) console.log(`  ${chalk.red('✗')} ${text}`);
}

export function separator(label: string): void {
  if (!JSON_MODE) console.log(boxen(chalk.bold(label), {
    padding: { left: 1, right: 1 },
    borderStyle: 'round',
    borderColor: 'cyan',
    margin: { top: 1, bottom: 0 },
  }));
}

export function verbose(label: string, value: string): void {
  if (VERBOSE && !JSON_MODE) console.log(`  ${chalk.magenta(label + ':')} ${value}`);
}

export function emitEvent(type: string, data: Record<string, unknown>): void {
  if (JSON_MODE) {
    const cleaned: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(data)) {
      cleaned[k] = typeof v === 'string' ? stripAnsi(v) : v;
    }
    process.stdout.write(JSON.stringify({ type, ts: Date.now(), ...cleaned }) + '\n');
  }
}

// P0-2 (UX-R3): Emit holistic dev primitives when --dev is set, so the
// --help promise ("show holistic primitives (G_z/P_z, rayProfile, phase
// position)") is honored during sessions, not just in `status`.
// Called from both encounter loops (DQ + Story-Driven) after each encounter.
export function emitDevPrimitives(sig: Significator, label: string): void {
  if (!DEV_MODE) return;
  try {
    const snapshot = toSnapshot(sig);
    const cci = computeCCI(snapshot);
    const mh = cci.metabolicHealth;
    if (JSON_MODE) {
      emitEvent('dev_primitives', {
        label,
        gz: mh?.gz ?? null,
        pz: mh?.pz ?? null,
        metabolicTotal: mh?.total ?? null,
        interpretation: mh?.interpretation ?? null,
        cci: cci.composite,
        transformationPhase: sig.transformationPhase ?? 'idle',
        rayProfile: sig.rayProfile,
        transformationTargetStage: sig.transformationTargetStage ?? null,
        sessionsInPhase: sig.transformationSessionsInPhase ?? 0,
        knotsResolved: sig.transformationKnotsResolved ?? 0,
        internalizedHolons: sig.internalizedHolons?.length ?? 0,
        greatWayDirection: sig.greatWayDirection ?? null,
      });
    } else {
      info('dev', `${label} → G_z=${mh?.gz?.toFixed(4) ?? 'n/a'} P_z=${mh?.pz?.toFixed(4) ?? 'n/a'} CCI=${cci.composite.toFixed(4)} phase=${sig.transformationPhase ?? 'idle'}`);
    }
  } catch {
    // Best-effort — dev mode should never break a session.
  }
}

/** Render session arc position with progress bar */
export function renderSessionPosition(label: string, position: 'warmup' | 'peak' | 'cooldown', progress: number): void {
  if (JSON_MODE) return;
  const barLen = 12;
  const pos = Math.round(progress * barLen);
  let bar = '';
  for (let i = 0; i < barLen; i++) {
    if (position === 'warmup') {
      bar += i <= pos ? chalk.blue('▰') : chalk.dim('▱');
    } else if (position === 'peak') {
      bar += i <= pos ? chalk.magenta('▰') : chalk.dim('▱');
    } else {
      bar += i <= pos ? chalk.green('▰') : chalk.dim('▱');
    }
  }
  const posLabel = position === 'warmup' ? chalk.blue('WARMUP')
    : position === 'peak' ? chalk.magenta('PEAK')
    : chalk.green('COOLDOWN');
  console.log(`  ${posLabel} ${bar} ${chalk.dim(label)}`);
}

/** Render Direct Questioning progress — Veil-compliant (no line names, no stages, no pass/fail counts) */
export function renderLinesProgress(_sig: Significator, history: ConsequenceRecord[]): void {
  if (JSON_MODE) return;
  // Veil compliance: show only the count of questions answered so far,
  // not which lines, not their stages, not pass/fail counts.
  const totalAnswered = history.length;
  const totalQuestions = 8;
  const barWidth = 16;
  const filled = Math.round((totalAnswered / totalQuestions) * barWidth);
  const bar = '█'.repeat(filled) + '░'.repeat(barWidth - filled);
  console.log(`  ${chalk.bold('Progress')}  ${chalk.cyan(bar)} ${totalAnswered}/${totalQuestions}`);
  console.log('');
}

// ── Print state ───────────────────────────────────────────────────────
export function printSignificator(sig: Significator): void {
  // T-3.4 (Veil compliance): printSignificator is only called from
  // diagnostic/verbose paths. Show only id + qualitative state.
  // R11-R2: use describePersonalResonance for player-responsive resonance.
  info('id', sig.id);
  // NF-9 (Fresh-User Re-Audit): Add inline gloss so a new user doesn't think
  // 'fortress-sharp, weapon-walls' is a bug. The gloss explains it's the
  // poetic aesthetic of the current stage + shadow state.
  const resonance = describePersonalResonance(sig);
  info('resonance', `${resonance}  ${chalk.dim('(the poetic texture of your current stage)')}`);
}

export function printEncounter(enc: ScheduledEncounter, world?: WorldState): void {
  const isShadow = enc.executionMode === 'shadow';
  const posColor = enc.sessionPosition === 'warmup' ? chalk.blue
    : enc.sessionPosition === 'cooldown' ? chalk.green : chalk.magenta;
  const posTag = enc.sessionPosition === 'warmup' ? 'WARMUP'
    : enc.sessionPosition === 'cooldown' ? 'COOLDOWN' : 'PEAK';

  if (isShadow && !JSON_MODE) {
    console.log(`  ${chalk.bgRed.white.bold(' ◆ SHADOW-WORK ')} ${chalk.dim('— accumulated shadows exceed threshold')}`);
  }

  // Veil compliance: no holonSource ID, no shadowTarget quadrant name, no executionMode label.
  // Show only the arc position (warmup/peak/cooldown) which is structural, not developmental.
  info('arc', `${posColor(posTag)}`);

  // P1-2 (UX-R3): Surface the NPC name + narrative role so the user knows
  // WHO they're engaging with. Previously the encounter header showed only
  // 'arc: PEAK' and the user never met the 16 named NPCs (The Conqueror,
  // Bloodfury, Elder Ashmark, etc.) that the encounter was actually with.
  // Veil is preserved: we show name + narrativeRole (atmospheric), not
  // shadowQuadrant or drives (clinical).
  if (world && !JSON_MODE) {
    const holon = world.holons.find(h => h.id === enc.holonSource);
    if (holon && holon.kind === 'NPC') {
      const roleLabel = holon.narrativeRole
        ? holon.narrativeRole.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
        : 'presence';
      info('encounter', `${chalk.cyan(holon.name)} ${chalk.dim(`· ${roleLabel}`)}`);
    } else if (holon && holon.kind === 'Location') {
      info('place', `${chalk.cyan(holon.name)}`);
    }
  }

  if (isShadow) {
    // No quadrant name — just the shadow-work indicator
    info('mode', `${chalk.bgRed.white(' shadow ')}`);
  }
}

/**
 * P0-3 (Fresh-User UX Audit): Post-session summary.
 * Displays what emerged during the session without breaking the Veil.
 * Shows: shadows surfaced, patterns identified, suggested focus,
 * and glossary terms unlocked. All in felt-sense language.
 */
export function renderPostSessionSummary(sig: Significator, history: ConsequenceRecord[], audit?: boolean): void {
  if (JSON_MODE) return;

  console.log(`\n  ${chalk.bold.cyan('═══ Session Complete ═══')}`);

  // 1. What happened: lines explored (Veil-compliant — just count, not names)
  const linesExplored = new Set(history.map(h => h.line)).size;
  if (linesExplored > 0) {
    info('explored', `${linesExplored} aspect${linesExplored !== 1 ? 's' : ''} of your inner landscape`);
  }

  // 2. Shadows surfaced: group by quadrant and describe qualitatively
  const activeShadows = sig.shadows.entries.filter(e => !e.resolvedAt);
  if (activeShadows.length > 0) {
    const quadrantCounts: Record<string, number> = {};
    for (const s of activeShadows) {
      const q = s.quadrant ?? 'Unknown';
      quadrantCounts[q] = (quadrantCounts[q] ?? 0) + 1;
    }
    info('surfaced', `${activeShadows.length} pattern${activeShadows.length !== 1 ? 's' : ''} that want attention`);      // P1-SUMMARY (Fresh-User Re-Audit): Show qualitative shadow descriptions
      // always, not just in VERBOSE mode. The old code gated this behind VERBOSE
      // which meant normal players never saw what patterns the game detected.
      // Showing the movements (in Veil-compliant language) helps the player
      // understand what the game "saw" in them.
      const lineDescs: Record<string, Set<string>> = {};
      for (const s of activeShadows) {
        const line = s.line ?? 'Unknown';
        if (!lineDescs[line]) lineDescs[line] = new Set();
        lineDescs[line].add(describeShadowMovement(s.quadrant ?? 'Unknown'));
      }
      const shadowDesc = Object.entries(lineDescs)
        .map(([line, descs]) => {
          const desc = [...descs].join(' / ');
          return `${line} — ${desc}`;
        })
        .join(', ');
      if (shadowDesc) {
        console.log(`    ${chalk.dim(shadowDesc)}`);
      }
  } else {
    info('shadows', `${chalk.green('none surfacing right now — the field is clear')}`);
  }

  // 3. Lines touched: show which developmental dimensions were engaged
  if (history.length > 0) {
    const lineNames = [...new Set(history.map(h => h.line))];
    console.log(`  ${chalk.dim('dimensions:')} ${lineNames.join(', ')}`);
  }

  // 4. Knowledge state: if curriculum data exists, show a brief summary
  if (sig.knowledge && sig.knowledge.conceptStates.size > 0) {
    const conceptCount = sig.knowledge.conceptStates.size;
    const avgRetention = [...sig.knowledge.conceptStates.values()]
      .reduce((sum, cs) => sum + cs.retention, 0) / conceptCount;
    const retentionDesc = avgRetention > 0.7 ? 'well-held'
      : avgRetention > 0.4 ? 'developing'
      : 'fading';
    info('knowledge', `${conceptCount} concept${conceptCount !== 1 ? 's' : ''} studied, ${retentionDesc}`);
  }

  // 5. Glossary terms unlocked this session
  const unlockedThisSession = loadUnlockedTerms(getMysteriumProfileDir());
  if (unlockedThisSession.length > 0) {
    const newTerms = unlockedThisSession.filter(t => !['Line', 'Stage', 'Shadow'].includes(t));
    if (newTerms.length > 0) {
      info('unlocked', `${newTerms.length} new term${newTerms.length !== 1 ? 's' : ''}: ${newTerms.slice(0, 3).join(', ')}${newTerms.length > 3 ? '…' : ''}`);
    }
  }

  // 6. Suggested focus for next session (from goals.yaml active_focus)
  const activeFocus = readActiveFocus();
  if (activeFocus && activeFocus.length > 5) {
    console.log(`\n  ${chalk.dim('For next time:')}`);
    console.log(`  ${chalk.italic(activeFocus)}`);
  }

  // META-PROBE: Show curriculum health when --audit flag is set.
  // This gives the agentic loop or developer a comprehensive health check
  // of progression, rubric calibration, and content linting.
  if (audit && sig.knowledge && sig.knowledge.conceptStates.size > 0) {
    try {
      const registry = getCurriculumRegistry();
      if (registry.count() > 0) {
        const probe = probeCurriculum(sig.knowledge, registry, Date.now());
        console.log(formatProbeSummary(probe));
      }
    } catch {
      // Curriculum probe unavailable — skip silently
    }
  }

  console.log('');
}

/**
 * P3-4: Render prerequisite gap feedback for a curriculum encounter.
 * Shows what material needs review before this concept can be studied.
 */
export function renderPrerequisiteGaps(
  conceptId: string,
  knowledge: KnowledgeState | undefined,
): void {
  if (JSON_MODE || !knowledge) return;
  const gaps = checkPrerequisiteGaps(conceptId, knowledge);
  if (gaps.length === 0) return;

  console.log(`  ${chalk.yellow('⚠')} Before studying this, review:`);
  for (const gap of gaps) {
    const tag = gap.type === 'cross-branch' ? chalk.magenta('[cross-branch]') : '';
    console.log(`    ${chalk.dim('•')} ${chalk.bold(gap.name)} ${tag}`);
  }
  console.log('');
}

/**
 * Read the `active_focus` field from goals.yaml.
 *
 * It renders in two places — the post-session summary ("for next time") and the session
 * header — so it lives with the printers rather than at each call site. Best-effort by
 * design: a missing profile, a missing file or a malformed value all mean "no focus set",
 * which is not an error worth interrupting a session over.
 */
export function readActiveFocus(): string | null {
  try {
    const profileDir = getActiveProfileDir();
    if (!profileDir) return null;
    const goalsPath = path.join(profileDir, 'goals.yaml');
    if (!fs.existsSync(goalsPath)) return null;
    const goalsContent = fs.readFileSync(goalsPath, 'utf8');
    const focusMatch = goalsContent.match(/active_focus:\s*"([^"]+)"/);
    return focusMatch?.[1] ?? null;
  } catch { return null; }
}
