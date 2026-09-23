import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import { select } from '@clack/prompts';
import ora from 'ora';
import { AUDIT, HEADLESS_LLM, ACTIVE_MODEL, DEV_MODE, FORCE_LINE, FORCE_MODALITY, FORCE_MODE, FORCE_SHADOW, FORCE_STAGE, HEADLESS, JSON_MODE, LLM_ACTIVE, USER_ANSWERS, VERBOSE, apiKey, baseUrl, encounterCount, model, setLlmActive, subcommand } from './flags.js';
import { banner, info, success, warn, error, separator, verbose, emitEvent, emitDevPrimitives, renderSessionPosition, renderLinesProgress, printSignificator, printEncounter, renderPostSessionSummary, renderPrerequisiteGaps, readActiveFocus } from './output.js';
import { DQ_SCENE_SETTINGS, CHALLENGE_NAMES } from './data.js';
import { stageColor, truncateNarrative, truncateAtWordBoundary, cciToFeltSense, generatePracticeHint, somaticPracticeHint, curriculumLabel } from './render.js';
import { type SessionMode } from '../../src/core/domain/SessionMode.js';
import { validateModelIfFresh, queryLLM } from '../../src/infra/llm/LLMClient.js';
import { bootRegistries } from '../../src/core/registries/boot.js';
import { bootModuleRegistry } from '../../src/core/assessments/bootModules.js';
import { type WorldState } from '../../src/core/engines/CandidateGeneration.js';
import { type Significator } from '../../src/core/domain/Significator.js';
import { type Line } from '../../src/core/domain/Line.js';
import { ALL_LINES } from '../../src/core/domain/Line.js';
import { type Stage } from '../../src/core/domain/Stage.js';
import { DEFAULT_CCI_WEIGHTS, type CCIScore } from '../../src/core/engines/CCIEngine.js';
import { generateSessionStrategy } from '../../src/core/engines/AutoModeStrategy.js';
import { type ScheduledEncounter } from '../../src/core/domain/EncounterSpecNew.js';
import { type PlayerResponse } from '../../src/core/engines/ConsequenceEngine.js';
import { type SessionContext } from '../../src/core/engines/PriorityComputation.js';
import { startSession, tickWithStrategy, endSession, applyResponseOnly, type SessionState } from '../../src/core/GameLoop.js';
import { createInitialUserMatrixModel } from '../../src/core/engines/UserMatrixModel.js';
import { AgenticOrchestrator, type AgenticUIHandler } from '../../src/core/assessments/AgenticOrchestrator.js';
import { type ModuleRegistry } from '../../src/core/assessments/registry.js';
import { type AskUserQuestionParams, type AskUserQuestionResult, type UserAnswer } from '../../src/core/assessments/agentTypes.js';
import { activeDeclaredInterests, activeDeclaredAversions } from '../../src/core/domain/IdentityProfile.js';
import { saveAll } from '../../src/infra/persistence/SaveRepository.js';
import { buildTrainingIntegration, buildUnifiedProfileServices } from '../../src/cli/TrainingRuntime.js';
import { buildCLITelemetry, recordCLITelemetry, flushCLITelemetry } from '../../src/cli/CLITelemetry.js';
import { describePersonalResonance } from '../../src/core/presentation/veilDescriptors.js';
import { checkTermUnlocks } from '../../src/core/data/glossary.js';
import { type ConsequenceRecord } from '../../src/core/domain/ConsequenceRecord.js';
import { type Modality } from '../../src/core/domain/enums.js';
import { createOrchestrationServices, captureCheckpoint, type OrchestrationServices, type RuntimeCheckpoint } from '../../src/core/personalization/sessionRuntime.js';
import { appendJournalEntry, replayJournal, journalPathFor } from '../../src/infra/persistence/sessionJournal.js';
import { getMysteriumProfileDir } from '../../src/infra/persistence/mysteriumDir.js';
import { purposesFromVows, purposesFromGoals, preferenceFromHistory } from '../../src/core/personalization/bandSources.js';
import { feedPlanningBias } from '../../src/core/orchestration/feedReaders.js';
import { getLineProgress } from '../../src/core/engines/TransformationDetector.js';
import { pickFallbackNarrative } from '../../src/core/agent/FallbackNarratives.js';
import { loadAskedPrompts, saveAskedPrompts } from '../../src/core/fallback/FallbackProvider.js';
import { filterOutput } from '../../src/infra/llm/VeilFilter.js';
import { createProfile, loadProfile, buildContextInjection, updateProfileAfterSession, appendEncounterLog, getActiveProfileName, getActiveProfileDir, migrateLegacySave, loadUnlockedTerms, addUnlockedTerms } from '../../src/infra/profiles/ProfileManager.js';
import { SessionAgent } from '../../src/core/assessments/SessionAgent.js';
import { seedCurriculumRegistry } from '../../src/core/curriculum/CurriculumSeed.js';
import { type EncounterExecutionOptions } from './onboarding.js';
import { applyCurriculumMode, consumeUserAnswer, updateGoalsActiveFocus, ask, checkLLMAvailability, loadHolons, extractLastNarrativeAsFocus, extractMdSectionBullets, veilThemeHint, veilDriveDirection, loadVowFile } from './support.js';
import { createDefaultSignificator } from './onboarding.js';





// @script-status: wired — imported by cli-game.ts, which `npm run cli` runs.
/**
 * The session flows — the two ways the game runs (direct questioning and story), plus their
 * shared encounter-execution layer.
 *
 * Stage D, final leaf (module-cohesion audit item 1). This is the last thing that moved, and it
 * moved last deliberately: the flows own the checkpoint/journal writes that G36 asserts, so the
 * split that touches them is the one that can silently change WHEN those writes happen. The
 * verification below is therefore stronger than the other stages': the gate boots both modes
 * headless and requires a persisted checkpoint, which is exactly the behaviour that must not move.
 *
 * `runDirectQuestioningSession` is the default surface and is architecture-live: it receives the
 * `OrchestrationServices` its caller holds, passes them to `executeEncounter`, and at its save site
 * writes `captureCheckpoint` onto the world AND appends the sidecar journal (Phase 14 d4).
 */

export async function executeEncounter(
  encounter: ScheduledEncounter,
  sig: Significator,
  world: WorldState,
  history: ConsequenceRecord[],
  options: EncounterExecutionOptions = {},
): Promise<{
  outcome: import('../../src/core/assessments/AgenticOrchestrator.js').OrchestratorResult;
  response: PlayerResponse;
  narrativeSummary: string;
  effectiveEncounter: ScheduledEncounter;
}> {
  // Route to AgenticOrchestrator (default).
  // YAGNI-EFF-3: PersistentAgent routing removed. USE_PERSISTENT_AGENT is
  // always false; the DQ path is the proven architecture.
  const result = await runAgenticEncounter(
    encounter, sig, world, history, options.responsesPool, options.consecutivePasses, options.agentSynthesis,
    options.orchestration,
  );
  return { ...result, effectiveEncounter: encounter };
}

// ── AgenticOrchestrator encounter handler (all modalities) ────────────

export async function runAgenticEncounter(
  encounter: ScheduledEncounter,
  sig: Significator,
  world: WorldState,
  history: ConsequenceRecord[],
  responsesPool?: number[],
  consecutivePasses?: Map<string, number>,
  agentSynthesis?: string,
  orchestration?: OrchestrationServices,
): Promise<{
  outcome: import('../../src/core/assessments/AgenticOrchestrator.js').OrchestratorResult;
  response: PlayerResponse;
  narrativeSummary: string;
}> {
  const [encLine, encStage] = encounter.moduleRef.split(':') as [Line, Stage];
  const modRegistry = (globalThis as any).__moduleRegistry as ModuleRegistry | undefined;

  // If --line/--stage/--modality forcing is active, override the encounter
  let forcedEncounter = encounter;
  if (FORCE_LINE || FORCE_STAGE || FORCE_MODALITY) {
    const forcedLine = FORCE_LINE ?? encLine;
    const forcedStage = FORCE_STAGE ?? encStage;
    const forcedModality = FORCE_MODALITY ?? encounter.modality;
    const forcedModule = modRegistry?.get(forcedLine, forcedStage);
    if (forcedModule) {
      forcedEncounter = {
        ...encounter,
        moduleRef: `${forcedLine}:${forcedStage}`,
        modality: forcedModality,
        targetLines: [forcedLine],
        stage: forcedStage,
      };
    }
  }

  const uiHandler: AgenticUIHandler = {
    askUser: async (params: AskUserQuestionParams): Promise<AskUserQuestionResult> => {
      const answers: UserAnswer[] = [];

      for (const q of params.questions) {
        if (!JSON_MODE) {
          const mod = forcedEncounter.modality;
          const isShadow = forcedEncounter.executionMode === 'shadow';
          let modHeader = '';

          // P0-1 (Fresh-User UX Audit): If this is a curriculum encounter,
          // prepend the concept name so the player knows what they're studying.
          if (forcedEncounter.curriculumConceptId) {
            // P3-4: Show prerequisite gaps before the encounter label
            if (sig?.knowledge) {
              renderPrerequisiteGaps(forcedEncounter.curriculumConceptId, sig.knowledge);
            }
            const label = curriculumLabel(forcedEncounter.curriculumConceptId);
            if (label) {
              const actionLabel = {
                review: 'Review',
                deepen: 'Deepen',
                new_material: 'New Material',
                connect: 'Connect',
              }[forcedEncounter.curriculumAction ?? 'review'] ?? 'Study';
              modHeader = `\n  ${chalk.bold.cyan(`📚 ${actionLabel}:`)}${label}\n`;
            }
          }

          switch (mod) {
            case 'Deterministic':
              modHeader = isShadow
                ? `${chalk.bold.red('◆ [SHADOW TRIAL] ▬▬▬▬▬▬▬▬▬▬▬▬▬░ (9.5s remaining)')}\n`
                : `${chalk.bold.red('⏳ [TIMED TRIAL] ▬▬▬▬▬▬▬▬▬▬▬▬▬░ (9.5s remaining)')}\n`;
              break;
            case 'LanguageReflective':
              modHeader = isShadow
                ? `${chalk.bold.red('◆ [SHADOW REFLECTION] • Confront the unresolved pattern •')}\n`
                : `${chalk.bold.blue('🧘 [REFLECTION BEAT] • Tune in to your inner state •')}\n`;
              break;
            case 'ScenarioChoice':
              modHeader = isShadow
                ? `${chalk.bold.red('◆ [SHADOW CROSSROADS] • The shadow demands a choice •')}\n`
                : `${chalk.bold.yellow('🔀 [DECISION CROSSROADS] • A path diverges •')}\n`;
              break;
            case 'Embodied':
              modHeader = isShadow
                ? `${chalk.bold.red('◆ [SHADOW SCAN] • Feel where the shadow lives in the body •')}\n`
                : `${chalk.bold.green('💓 [SOMATIC SCAN] • Focus on body sensation •')}\n`;
              break;
            case 'Strategic':
              modHeader = isShadow
                ? `${chalk.bold.red('◆ [SHADOW WAR-TABLE] • Map the shadow\'s strategy •')}\n`
                : `${chalk.bold.magenta('♟️ [TACTICAL WAR-TABLE] • Assess constraints •')}\n`;
              break;
            case 'SocialCooperative':
              modHeader = isShadow
                ? `${chalk.bold.red('◆ [SHADOW DIPLOMACY] • Navigate the shadow in relation •')}\n`
                : `${chalk.bold.cyan('🤝 [DIPLOMACY] • Navigating connection •')}\n`;
              break;
            case 'ImmersiveRPG':
              modHeader = isShadow
                ? `${chalk.bold.red('◆ [SHADOW SCENE] • The shadow writes its chapter •')}\n`
                : `${chalk.bold.yellow('📖 [NARRATIVE SCENE] • The story unfolds •')}\n`;
              break;
            default:
              modHeader = isShadow
                ? `${chalk.bold.red('◆ [SHADOW WORK]')}\n`
                : `${chalk.bold.dim('[' + (mod as string).toUpperCase() + ']')}\n`;
          }

          console.log(`\n  ${modHeader}  ${chalk.magenta('[' + q.header + ']')}`);
          console.log(`  ${chalk.bold(q.question)}`);
          if (q.options?.length) {
            for (let i = 0; i < q.options.length; i++) {
              const opt = q.options[i];
              // R5-BUG-2 (UX-R5): Don't print ' — ' + description when description
              // is empty (was duplicating the label for ScenarioChoice/Strategic/
              // SocialCooperative where label and description were both o.text).
              const optLine = opt.description
                ? `${chalk.cyan('[' + (i + 1) + ']')} ${opt.label} — ${opt.description}`
                : `${chalk.cyan('[' + (i + 1) + ']')} ${opt.label}`;
              console.log(`    ${optLine}`);
            }
          }
        }

        // P0-1 (UX-R3): `header` previously referenced `line` and `i` which only
        // exist in runDirectQuestioningSession's for-loop scope — causing
        // `ReferenceError: line is not defined` on every DQ encounter. Use the
        // destructured `encLine` (always in scope here) and a stable hash for
        // the scene-setting index (no loop counter available in this closure).
        const dqSceneIdx = (encLine.length + (forcedEncounter.modality?.length ?? 0)) % DQ_SCENE_SETTINGS.length;
        emitEvent('ask_user', {
          // UX-R2-3: Use the line name as the header in DQ mode
          header: encLine,
          // UX-R2-7: Prepend the question with NPC scene-setting
          question: q.question,
          narrative: DQ_SCENE_SETTINGS[dqSceneIdx],
          options: q.options?.map((o, oi) => ({ index: oi + 1, label: o.label, description: o.description })),
          allowWriteIn: q.allowWriteIn,
        });

        if (HEADLESS) {
          // R5-CRITICAL (UX-R5): If the user provided an answer via --answer
          // or --answers, use it as the writeInValue. This is the difference
          // between the LLM hallucinating the user's stance and the LLM
          // responding to the user's actual reflection.
          const userAnswer = consumeUserAnswer();
          if (userAnswer !== undefined) {
            // User provided a real answer — inject it as the writeIn.
            // For MCQ questions, also try to match the answer to an option
            // label so the drive-scoring picks up the right signal. If no
            // match, fall back to the first option + the writeIn.
            let selectedIdx = 0;
            if (q.options && q.options.length > 0) {
              const matchIdx = q.options.findIndex(o =>
                o.label.toLowerCase().includes(userAnswer.toLowerCase()) ||
                userAnswer.toLowerCase().includes(o.label.toLowerCase()));
              selectedIdx = matchIdx >= 0 ? matchIdx : 0;
            }
            const selectedLabel = q.options?.[selectedIdx]?.label ?? '';
            answers.push({ selectedLabels: selectedLabel ? [selectedLabel] : [], writeInValue: userAnswer });
          } else if (responsesPool && responsesPool.length > 0) {
            // Use forced responses pool if provided (one index per question, consumed sequentially)
            const forcedIdx = responsesPool.shift()!;
            let selectedIdx: number;
            if (q.options && forcedIdx >= 1 && forcedIdx <= q.options.length) {
              selectedIdx = forcedIdx - 1;
            } else {
              selectedIdx = 0;
            }
            const selectedOpt = q.options?.[selectedIdx];
            const selectedLabel = selectedOpt?.label ?? '';

            // Shadow keyword injection for testing — randomly inject (10% chance)
            const shadowInjections = ['', 'i feel the need to withdraw from this confrontation', 'i must transcend these petty concerns and reach enlightenment', 'i prefer to stay here where it is safe and comfortable'];
            const injectShadow = FORCE_SHADOW !== 'none' && selectedIdx > 0 && Math.random() < 0.1;
            const writeInShadow = injectShadow ? (shadowInjections[selectedIdx] ?? '') : '';

            if (writeInShadow) {
              answers.push({ selectedLabels: [selectedLabel], writeInValue: writeInShadow });
            } else {
              answers.push({ selectedLabels: [selectedLabel] });
            }
          } else {
            // No user answer, no forced responses — vary selection to probe
            // different shadow patterns. (Previous default behavior.)
            const hash = (Date.now() + (q.options?.length ?? 4)) % 4;
            const selectedIdx = hash < (q.options?.length ?? 4) ? hash : 0;
            const selectedOpt = q.options?.[selectedIdx];
            const selectedLabel = selectedOpt?.label ?? '';
            answers.push({ selectedLabels: [selectedLabel] });
          }
        } else {
          const promptText = q.multiSelect
            ? '\n  Select (comma-separated): '
            : '\n  Select: ';
          const answer = await ask(promptText);
          const selections = answer.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
          const selectedLabels = selections
            .filter(n => n >= 1 && n <= (q.options?.length ?? 0))
            .map(n => q.options![n - 1]!.label);

          // Determine if input is a simple numeric choice from the options
          let isSimpleNumericChoice = false;
          if (q.options?.length && answer.trim()) {
            const parts = answer.split(',').map(s => s.trim());
            isSimpleNumericChoice = parts.every(part => {
              const num = parseInt(part, 10);
              return !isNaN(num) && String(num) === part && num >= 1 && num <= q.options!.length;
            });
          }

          if (q.allowWriteIn || (!q.options?.length && answer.trim())) {
            // Only populate writeInValue if it's NOT a simple numeric choice
            if (!isSimpleNumericChoice && answer.trim()) {
              answers.push({ selectedLabels, writeInValue: answer.trim() });
            } else {
              answers.push({ selectedLabels });
            }
          } else {
            answers.push({ selectedLabels });
          }
        }
      }

      return { answers };
    }
  };

  // Always route through AgenticOrchestrator — it handles LLM + fallback internally
  // Look up the assessment module from the registry to inject into the LLM context
  const baseModule = modRegistry?.get(encLine, encStage);

  // Build ConceptDraftIndex from the module registry so the LLM sees module metadata
  const conceptModules: Record<string, any> = {};
  if (modRegistry) {
    for (const m of modRegistry.getAll()) {
      const key = `${m.line.toLowerCase()}:${m.stage.toLowerCase()}`;
      conceptModules[key] = {
        line: m.line,
        stage: m.stage,
        title: `${m.line} ${m.stage} Module`,
        modalities: m.tasks.map(t => t.type === 'llm_dialogue' ? 'LanguageReflective' as const : 'Deterministic' as const),
      };
    }
  }

  const  orchestrator = new AgenticOrchestrator({
    encounter: forcedEncounter,
    significator: sig,
    world,
    history,
    conceptIndex: { modules: conceptModules },
    uiHandler,
    module: modRegistry?.get(FORCE_LINE ?? encLine, FORCE_STAGE ?? encStage) ?? baseModule,
    noLlm: HEADLESS && !HEADLESS_LLM,
    forceShadow: FORCE_SHADOW,
    consecutivePasses,
    agentSynthesis,
    // Brain-training + unified profile tools: Game Master can run games and orchestrate across psych/cog/education.
    training: await buildTrainingIntegration().catch(() => undefined),
    unifiedProfile: await buildUnifiedProfileServices().catch(() => undefined),
    // RuntimeLoop: the orchestration services — personalization envelope + feed + owner workers.
    orchestration,
    // Phase 11 d3 (G29): the consent-checked declared preferences ride the identity projection —
    // active (non-withdrawn) entries only; the UDV's declared band is empty without this.
    // Phase 13 d1 (45 §3): the remaining bands, each from a store the player already owns —
    //   purpose    ← 39's active vows + the profile's self-declared goals (one aim band, two sources)
    //   preference ← the profile's declared metaphor taste + intensity (the seam adds the
    //                feed-evidenced session tolerance itself)
    //   observed   ← no deterministic producer exists yet (see the wiring audit §4 W5); it stays a
    //                typed input with `observedFromEngagement` ready, rather than a fabricated one
    identity: {
      declaredInterests: activeDeclaredInterests(sig.identity).map((p) => p.phrase),
      aversions: activeDeclaredAversions(sig.identity).map((p) => p.phrase),
      bands: (() => {
        const profile = loadProfile()
        const vowPurposes = purposesFromVows(
          (loadVowFile().book.vows ?? []) as unknown as Parameters<typeof purposesFromVows>[0],
        )
        const goalPurposes = purposesFromGoals(
          (profile?.goals?.self_declared ?? []) as unknown as string[],
          vowPurposes,
        )
        const prefs = (profile?.preferences ?? {}) as Record<string, unknown>
        return {
          purposes: [...vowPurposes, ...goalPurposes],
          preference: preferenceFromHistory({
            profile: {
              metaphorPreference: prefs.metaphor_preference as string | undefined,
              intensity: prefs.intensity as string | undefined,
              pacing: prefs.pacing as string | undefined,
            },
          }),
        }
      })(),
    },
  });

  // P1-R5 (Fresh-User UX Audit): Thinking indicator during LLM round-trip.
  // The audit found 60-300s session runtimes with no 'thinking...' indicator,
  // making the wait feel broken. ora (already a dependency) displays a
  // contemplative spinner during the orchestrator's LLM call.
  // In JSON/headless mode, skip the spinner (would pollute JSON output).
  let spinner: any = null;
  if (!JSON_MODE && !HEADLESS) {
    const thinkingPhrases = [
      'the question is finding you',
      'the reflection is forming',
      'the moment is gathering',
      'the mirror is turning',
    ];
    const phrase = thinkingPhrases[Math.floor(Math.random() * thinkingPhrases.length)]!;
    spinner = ora({ text: chalk.dim(phrase + '...'), color: 'cyan' }).start();
  }

  // P1-QW3 (Architecture Audit Phase A): CLI telemetry. Opt-in via
  // ~/.mysterium/config.json.telemetry=true. When enabled, records
  // session_started + encounter_completed events. No-op when disabled.
  const telemetry = await buildCLITelemetry().catch(() => null);
  recordCLITelemetry(telemetry, 'encounter_started', { moduleRef: encounter.moduleRef, line: encounter.targetLines[0] ?? null, stage: encounter.stage });

  let outcome;
  try {
    outcome = await orchestrator.run();
  } finally {
    if (spinner) spinner.stop();
  }

  // Build a PlayerResponse from the orchestrator's consequence record
  const cr = outcome.consequenceRecord;
  const response: PlayerResponse = {
    encounterId: encounter.id,
    energeticDirection: cr.polarityTrace.energeticDirection,
    driveDirectionality: cr.polarityTrace.driveDirectionality,
    stageOrientation: cr.polarityTrace.stageOrientation,
    sourceOfNourishment: cr.polarityTrace.sourceOfNourishment,
    shadowSurfaced: cr.shadowSurfaced,
    shadowResolvedId: cr.shadowResolved,
    narrativeSummary: outcome.narrativeSummary,
    // BUG-1/7 fix: pass through user answer + question text for encounter-log.md
    writeInValue: outcome.playerWriteIn ?? undefined,
    questionText: (orchestrator as any)._lastQuestionText ?? undefined,
  };

  return { outcome, response, narrativeSummary: outcome.narrativeSummary };
}

// ── Diagnostic mode ───────────────────────────────────────────────────

export async function runDiagnostic(): Promise<void> {
  banner('Mysterium Diagnostic');

  console.log('\nRegistries:');
  bootRegistries();
  const moduleRegistry = bootModuleRegistry();
  (globalThis as any).__moduleRegistry = moduleRegistry;
  seedCurriculumRegistry();
  success(`${moduleRegistry.count()} assessment modules loaded`); // R11-Y4: 64 modules across 8 stages. Red has full visual theming; other stages use LLM-generated narratives with validated assessment tasks.

  console.log('\nHolons:');
  const world = loadHolons();
  const npcCount = world.holons.filter(h => h.kind === 'NPC').length;
  const factionCount = world.holons.filter(h => h.kind === 'Faction').length;
  const locationCount = world.holons.filter(h => h.kind === 'Location').length;
  const otherCount = world.holons.length - npcCount - factionCount - locationCount;
  // UX-P0-5: Fix holon count mismatch — show all kinds so math adds up
  const breakdown = `${npcCount} NPCs, ${factionCount} factions, ${locationCount} locations${otherCount > 0 ? `, ${otherCount} others` : ''}`;
  success(`${world.holons.length} total: ${breakdown}`);

  console.log('\nSignificator:');
  const sig = await createDefaultSignificator();
  printSignificator(sig);

  console.log('\nSession:');
  const session: SessionContext = {
    encountersSoFar: 0,
    sessionDurationMs: 0,
    targetSessionLength: encounterCount,
    recentLines: [],
  };
  const sessionState = startSession(sig, session);
  applyCurriculumMode(sessionState);
  // NF-6 (Fresh-User Re-Audit): Show CCI with a qualitative interpretation
  // so the user knows what the number means. The re-audit found users could
  // see CCI change (0.5036 → 0.4749) but had no idea if that was good or bad.
  // P1-Y4 (Fresh-User UX Audit v2): Cut the numeric CCI display entirely.
  // The audit found 'CCI 0.4115 with clinical interpretation bands' is a
  // Veil violation — a number with bands IS diagnostic regardless of labels.
  // Now we show only the qualitative band. The numeric value is available
  // via --dev for engineers.
  const cciVal = sessionState.cci.composite;
  const cciBand = cciToFeltSense(cciVal);
  // NF3-6 (Fresh-User Audit 3): Add trajectory interpretation. A CCI drop
  // during shadow work is EXPECTED (shadows surfacing is part of the work,
  // not a sign of getting worse). The audit found players couldn't tell if
  // a downward trajectory was healthy or unhealthy. Now we correlate CCI
  // with shadow activity to give a trajectory note.
  const activeShadows = (sig.shadows?.entries ?? []).filter(s => !s.resolvedAt).length;
  const trajectoryNote = activeShadows >= 2
    ? ' — shadows surfacing, which is expected during this phase'
    : activeShadows >= 1
      ? ' — a shadow is surfacing, the dip is part of the work'
      : '';
  if (DEV_MODE) {
    info('CCI', `${cciVal.toFixed(4)} (${cciBand}${trajectoryNote})`);
  } else {
    info('state', `${cciBand}${trajectoryNote}`);
  }
  // R4-P2-3 (UX-R4): Explain what 'theme' means — it biases encounter selection.
  info('theme', `${sessionState.strategy.theme} (session strategy — biases encounter selection)`);
  // R4-P2-2 (UX-R4): Explain what 'totalTarget' means — it's the encounter budget.
  info('totalTarget', `${sessionState.strategy.encounterBudget.totalTarget} encounters per session (warmup + peak + cooldown)`);

  console.log('\nEncounter scheduling:');
  const now = Date.now();
  const { tickResult } = tickWithStrategy(sig, world, session, sessionState, null, null, now);
  if (tickResult.encounter) {
    success('Scheduler produced encounter:');
    printEncounter(tickResult.encounter, world);
  } else {
    warn('Scheduler returned null — no encounters available');
  }

  console.log(`\n${chalk.dim('LLM: ' + (LLM_ACTIVE ? 'active' : 'fallback (placeholder key)') + ' | Endpoint: ' + baseUrl + ' | Model: ' + model)}`);
  console.log(`${chalk.dim('LLM endpoint: ' + baseUrl)}`);
  console.log(`${chalk.dim('LLM model: ' + model)}`);
}

// ── Single encounter mode ─────────────────────────────────────────────

export async function runSingleEncounter(): Promise<void> {
  banner('Mysterium Single Encounter');

  bootRegistries();
  const moduleRegistry = bootModuleRegistry();
  (globalThis as any).__moduleRegistry = moduleRegistry;
  seedCurriculumRegistry();
  success(`${moduleRegistry.count()} modules loaded`);

  const sig = await createDefaultSignificator();
  const world = loadHolons();
  const session: SessionContext = {
    encountersSoFar: 0,
    sessionDurationMs: 0,
    targetSessionLength: 1,
    recentLines: [],
    ...(FORCE_LINE ? { forceLine: FORCE_LINE } : {}),
    ...(FORCE_STAGE ? { forceStage: FORCE_STAGE } : {}),
    ...(FORCE_MODALITY ? { forceModality: FORCE_MODALITY } : {}),
  } as any;
  const sessionState = startSession(sig, session);
  applyCurriculumMode(sessionState);

  const now = Date.now();
  let { tickResult } = tickWithStrategy(sig, world, session, sessionState, null, null, now);

  // If forcing and no natural encounter, create a synthetic one
  if (!tickResult.encounter && (FORCE_LINE || FORCE_STAGE || FORCE_MODALITY)) {
    const synthLine = FORCE_LINE ?? 'Cognitive' as Line;
    const synthStage = FORCE_STAGE ?? 'Red' as Stage;
    const synthModality = FORCE_MODALITY ?? 'Deterministic' as Modality;
    const synthHolon = world.holons[0] ?? { id: 'synthetic', name: 'The Examiner', narrativeRole: 'guide' };
    const syntheticEncounter: ScheduledEncounter = {
      id: `synthetic:${synthLine}:${synthStage}:${now}`,
      moduleRef: `${synthLine}:${synthStage}`,
      modality: synthModality,
      targetLines: [synthLine],
      stage: synthStage,
      holonSource: synthHolon.id ?? 'synthetic',
      shadowTarget: null,
      polarityMode: 'Exploring',
      difficulty: 0.5,
      sessionPosition: 'peak',
      priority: 0.999,
      driveTarget: null,
      executionMode: 'capacity',
    };
    if (VERBOSE) warn(`No natural encounter at ${synthLine}:${synthStage} — using synthetic encounter`);
    tickResult = { ...tickResult, encounter: syntheticEncounter };
  }

  if (!tickResult.encounter) {
    error('No encounter available');
    return;
  }

  separator('Encounter');
  printEncounter(tickResult.encounter, world);

  // responsesPool was retired (YAGNI-PHASE-4) and its caller-side local removed; the parameter is
  // optional in `runAgenticEncounter`, so the reference is dropped rather than revived
  // (CHECKED-SURFACE-AUDIT-2026-09-24, P0-4).
  const result = await runAgenticEncounter(tickResult.encounter, sig, world, [], undefined, new Map());

  separator('Result');
  info('narrative', result.narrativeSummary);
}

/**
 * P0-U2 (Fresh-User UX Audit): Integration ritual at session end.
 *
 * The catalyst→experience→integration cycle (AGENTS.md §5.4) was broken:
 * the game did catalyst (the question) and experience (the answer +
 * reflection) but skipped integration entirely. The reflection evaporated.
 * The audit subagent's verdict: "Intrigued, not transformed."
 *
 * This function presents a 90-second reflective prompt at session end:
 *   "Before you go, take a breath. What did you notice? What surprised
 *    you? What wants to move?"
 *
 * The player's response is captured and persisted to the profile's
 * narrative-memory.md under a "## Integration" section. It is surfaced
 * in the next session's opening ("Last time, you noticed...") to create
 * continuity across sessions and give the player a felt sense of growth.
 *
 * Design:
 *   - Optional: player can press Enter to skip (no penalty)
 *   - Veil-compliant: no clinical language, no metric framing
 *   - 90-second timeout in interactive mode (player can take longer)
 *   - In headless mode: reads from the --answers pool if available,
 *     otherwise skips gracefully
 *   - In JSON mode: emits an `integration_prompt` event and reads the
 *     next --answer if available
 */

export async function runIntegrationRitual(profileName: string | null): Promise<string | null> {
  const prompts = [
    'Before you go, take a breath. What did you notice?',
    'Before you go — what surprised you in this session?',
    'Before you go — what wants to move?',
    'Before you go — what landed that you want to remember?',
  ];
  const prompt = prompts[Math.floor(Math.random() * prompts.length)];

  let response: string | null = null;

  if (JSON_MODE) {
    // JSON mode: emit event, read from --answers pool
    emitEvent('integration_prompt', { prompt });
    response = consumeUserAnswer() ?? null;
    if (response) {
      emitEvent('integration_response', { response });
    } else {
      emitEvent('integration_skipped', {});
    }
  } else if (HEADLESS) {
    // Headless non-JSON: read from --answers pool, no prompt display
    response = consumeUserAnswer() ?? null;
  } else {
    // Interactive mode: display prompt and capture response
    console.log(`\n  ${chalk.dim('═══ Integration ═══')}`);
    console.log(`\n  ${chalk.italic.cyan(prompt)}`);
    const answer = await ask('\n  Your reflection (press Enter to skip): ');
    response = answer.trim() || null;
  }

  // Persist to profile's narrative-memory.md under "## Integration" section
  if (response && profileName) {
    try {
      const profileDir = getActiveProfileDir();
      if (profileDir) {
        const memPath = path.join(profileDir, 'narrative-memory.md');
        let existing = '';
        try { existing = fs.readFileSync(memPath, 'utf8'); } catch { /* new file */ }
        const timestamp = new Date().toISOString();
        const entry = `## Integration\n- **Session ${timestamp}:** ${response}\n\n`;
        // Prepend integration entries (most recent first)
        const newContent = entry + existing;
        fs.writeFileSync(memPath, newContent, 'utf8');
      }
    } catch { /* best-effort — don't break session end */ }
  }

  return response;
}

/**
 * Post-session LLM synthesis: reads the encounter log from this session,
 * asks the LLM to extract key insights, and appends them to narrative-memory.md.
 * This is the "profile evolution" step — the profile grows smarter after every session.
 *
 * Inspired by Hermes-Agent's background_review pattern: the agent reads what
 * happened and synthesizes it into long-term memory.
 */

export async function synthesizeSessionInsights(_profileName: string, encounterCount: number): Promise<void> {
  // NF3-1 (Fresh-User Audit 3): Even when LLM is inactive, run the lighter-
  // weight fallback so the Active Focus doesn't go stale. The audit found
  // synthesis succeeds only 25% of the time — and when the LLM is unreachable
  // (LLM_ACTIVE=false), the old code returned immediately with no fallback,
  // leaving the Active Focus frozen on the last successful synthesis.
  if (JSON_MODE) return; // skip in JSON mode
  try {
    const { agentReadProfileFile, agentWriteProfileFile } = await import('../../src/infra/profiles/ProfileManager.js');
    const encounterLog = agentReadProfileFile('encounter-log.md');
    if (!encounterLog || encounterLog.length < 100) return; // nothing to synthesize

    // If LLM is inactive, skip the full synthesis but still run the fallback
    // so the Active Focus has something current (the session's last narrative).
    if (!LLM_ACTIVE) {
      const encounters = encounterLog.split('## Encounter ');
      const recentEncounters = encounters.slice(-encounterCount - 1).join('## Encounter ');
      const fallbackFocus = extractLastNarrativeAsFocus(recentEncounters);
      if (fallbackFocus) {
        try {
          const goals = agentReadProfileFile('goals.yaml');
          if (goals) {
            let updatedGoals = goals.replace(/active_focus:.*$/m, `active_focus: "${fallbackFocus.replace(/"/g, "'")}"`);
            if (/last_synthesis_session:/m.test(updatedGoals)) {
              updatedGoals = updatedGoals.replace(/last_synthesis_session:.*$/m, `last_synthesis_session: "${new Date().toISOString()}" (fallback)`);
            } else {
              updatedGoals = updatedGoals.trimEnd() + `\nlast_synthesis_session: "${new Date().toISOString()}" (fallback)\n`;
            }
            agentWriteProfileFile('goals.yaml', updatedGoals, 'overwrite');
            if (!JSON_MODE) {
              info('synthesis', `${chalk.dim('LLM unavailable — using the session\'s last narrative as a placeholder focus')}`);
              console.log(`  ${chalk.dim('Run `mysterium profile show` to see it. Full synthesis will run when the LLM is reachable.')}`);
            }
          }
        } catch { /* best-effort */ }
      } else {
        if (!JSON_MODE) info('synthesis', `${chalk.dim('LLM unavailable — no narrative to use as placeholder focus')}`);
      }
      return;
    }

    // Take the last N encounters from this session
    const encounters = encounterLog.split('## Encounter ');
    const recentEncounters = encounters.slice(-encounterCount - 1).join('## Encounter ');

    // NF3-1 (Fresh-User Audit 3): Shortened the synthesis prompt from 3000 to
    // 1500 chars. The audit found synthesis succeeds only 25% of the time —
    // the heavier prompt (3000 chars of encounter log + full instructions)
    // was likely causing timeouts or rate-limit failures on the free-tier
    // model. 1500 chars is still enough context for the LLM to extract
    // insight/pattern/active from the last 1-2 encounters.
    const synthesisPrompt = `You are a developmental synthesis engine. Read the following encounter log from a Mysterium session and extract:

1. KEY INSIGHT: One sentence capturing the most important therapeutic insight from this session (what the user discovered or what the LLM named that landed).
2. PATTERN: If a recurring pattern is visible (something that appeared in multiple encounters), name it in one sentence.
3. ACTIVE WORK: What the user is currently processing, in one sentence.

Format your response as exactly 3 lines:
INSIGHT: <one sentence>
PATTERN: <one sentence or "none">
ACTIVE: <one sentence>

Encounter log:
${recentEncounters.slice(0, 1500)}`;

    // UX-PHASE-1: Show spinner during LLM synthesis so the terminal
      // doesn't appear frozen during the 20-60s LLM call.
      const synthSpinner = JSON_MODE ? null : ora({ text: chalk.dim('Synthesizing session insights...'), color: 'cyan' }).start();
      let result: string;
      try {
        result = await queryLLM('You are a developmental synthesis engine. Be concise and precise.', synthesisPrompt);
      } finally {
        if (synthSpinner) synthSpinner.stop();
      }
    if (result && !result.startsWith('{"error"')) {
      // Parse the response — be flexible about format
      const lines = result.split('\n').filter(l => l.trim());
      let insight = '';
      let pattern = '';
      let active = '';

      for (const line of lines) {
        const lower = line.toLowerCase();
        if (lower.startsWith('insight:') || lower.startsWith('1.')) {
          insight = line.replace(/^(insight:|1\.)\s*/i, '').trim();
        } else if (lower.startsWith('pattern:') || lower.startsWith('2.')) {
          pattern = line.replace(/^(pattern:|2\.)\s*/i, '').trim();
        } else if (lower.startsWith('active:') || lower.startsWith('3.')) {
          active = line.replace(/^(active:|3\.)\s*/i, '').trim();
        }
      }

      // Fallback: if no structured format, use the first non-empty line as insight
      if (!insight && lines.length > 0 && result.length > 20) {
        insight = lines[0]!.slice(0, 200);
      }

      let wroteSomething = false;
      if (insight && insight.toLowerCase() !== 'none') {
        // BUG-5 fix: Insert under "## Key Insights" section, not at end of file
        const memContent = agentReadProfileFile('narrative-memory.md') || '';
        const insightsHeader = '## Key Insights';
        const insightsIdx = memContent.indexOf(insightsHeader);
        if (insightsIdx >= 0) {
          const afterHeader = memContent.indexOf('\n## ', insightsIdx + insightsHeader.length);
          const insertAt = afterHeader >= 0 ? afterHeader : memContent.length;
          const updated = memContent.slice(0, insertAt) + `\n- **Session (synthesized):** ${insight}` + memContent.slice(insertAt);
          agentWriteProfileFile('narrative-memory.md', updated, 'overwrite');
        } else {
          agentWriteProfileFile('narrative-memory.md', `\n- **Session (synthesized):** ${insight}`, 'append');
        }
        wroteSomething = true;
      }
      if (pattern && pattern.toLowerCase() !== 'none') {
        // Insert under "## Patterns" section
        const memContent = agentReadProfileFile('narrative-memory.md') || '';
        const patternsHeader = '## Patterns';
        const patternsIdx = memContent.indexOf(patternsHeader);
        if (patternsIdx >= 0) {
          const afterHeader = memContent.indexOf('\n## ', patternsIdx + patternsHeader.length);
          const insertAt = afterHeader >= 0 ? afterHeader : memContent.length;
          const updated = memContent.slice(0, insertAt) + `\n- **Pattern:** ${pattern}` + memContent.slice(insertAt);
          agentWriteProfileFile('narrative-memory.md', updated, 'overwrite');
        } else {
          agentWriteProfileFile('narrative-memory.md', `\n- **Pattern:** ${pattern}`, 'append');
        }
        wroteSomething = true;
      }
      if (active && active.toLowerCase() !== 'none') {
        try {
          const goals = agentReadProfileFile('goals.yaml');
          if (goals) {
            // NF3-5: Also store last_synthesis_session so profile show can
            // display when the Active Focus was last updated. The audit found
            // players can't tell if the focus they're reading is current.
            const { getActiveProfileName } = await import('../../src/infra/profiles/ProfileManager.js');
            const profileNameForCount = getActiveProfileName();
            let updatedGoals = goals.replace(/active_focus:.*$/m, `active_focus: "${active.replace(/"/g, "'")}"`);
            // Add or update last_synthesis_session field
            if (/last_synthesis_session:/m.test(updatedGoals)) {
              updatedGoals = updatedGoals.replace(/last_synthesis_session:.*$/m, `last_synthesis_session: ${profileNameForCount ? '' : ''}"${new Date().toISOString()}"`);
            } else {
              updatedGoals = updatedGoals.trimEnd() + `\nlast_synthesis_session: "${new Date().toISOString()}"\n`;
            }
            agentWriteProfileFile('goals.yaml', updatedGoals, 'overwrite');
          }
        } catch { /* best-effort */ }
        wroteSomething = true;
      }

      if (wroteSomething && !JSON_MODE) {
        info('synthesis', `${chalk.green('✓')} Profile updated: insight + pattern + active focus`);
        // P0-F3: Tell the player how to SEE what was synthesized. Before this
        // hint, the game said "profile updated" but gave no way to view the
        // update — the #1 frustration in the fresh-user audit.
        console.log(`  ${chalk.dim('Run `mysterium profile show` to see what the game has noticed.')}`);
      } else if (!JSON_MODE) {
        info('synthesis', `${chalk.dim('No extractable insights from this session')}`);
      }
    } else {
      // NF-2 (Fresh-User Re-Audit): Distinguish "LLM unavailable" (the call
      // failed) from "LLM returned empty" (the call succeeded but the response
      // was unusable). The old message was always "LLM unavailable" even when
      // the boot probe had succeeded — which contradicted "LLM active" and
      // confused users. Now we check the error shape and report honestly.
      const isUnavailable = !result || result.startsWith('{"error"');

      // NF3-1 (Fresh-User Audit 3): Lighter-weight fallback when LLM synthesis
      // fails. The audit found synthesis succeeds only 25% of the time, leaving
      // the Active Focus/Insights/Patterns stale. Instead of going silent, we
      // extract a simple insight from the last encounter's LLM narrative (the
      // richest in-session text) and write it as the Active Focus. This keeps
      // the reflection layer alive even when the synthesis LLM call fails —
      // the player always has *something* current to read in profile show.
      if (isUnavailable) {
        const fallbackFocus = extractLastNarrativeAsFocus(recentEncounters);
        if (fallbackFocus) {
          try {
            const goals = agentReadProfileFile('goals.yaml');
            if (goals) {
              // NF3-5: Store last_synthesis_session timestamp + mark as fallback
              // so profile show can display "(placeholder — full synthesis pending)"
              let updatedGoals = goals.replace(/active_focus:.*$/m, `active_focus: "${fallbackFocus.replace(/"/g, "'")}"`);
              if (/last_synthesis_session:/m.test(updatedGoals)) {
                updatedGoals = updatedGoals.replace(/last_synthesis_session:.*$/m, `last_synthesis_session: "${new Date().toISOString()}" (fallback)`);
              } else {
                updatedGoals = updatedGoals.trimEnd() + `\nlast_synthesis_session: "${new Date().toISOString()}" (fallback)\n`;
              }
              agentWriteProfileFile('goals.yaml', updatedGoals, 'overwrite');
              if (!JSON_MODE) {
                info('synthesis', `${chalk.dim('the reflection engine could not be reached — using the session\'s last narrative as a placeholder focus')}`);
                console.log(`  ${chalk.dim('Run `mysterium profile show` to see it. Full synthesis will run next session.')}`);
              }
            } else {
              if (!JSON_MODE) info('synthesis', `${chalk.dim('the reflection engine could not be reached this session')}`);
            }
          } catch {
            if (!JSON_MODE) info('synthesis', `${chalk.dim('the reflection engine could not be reached this session')}`);
          }
        } else {
          if (!JSON_MODE) info('synthesis', `${chalk.dim('the reflection engine could not be reached this session')}`);
        }
      } else {
        if (!JSON_MODE) info('synthesis', `${chalk.dim('the reflection did not surface anything new this session')}`);
      }
    }
  } catch (e: any) {
    if (!JSON_MODE) info('synthesis', `${chalk.dim('Synthesis error: ' + (e?.message || e))}`);
  }
}

/**
 * NF3-1 (Fresh-User Audit 3): Extract a simple one-sentence focus from the
 * last encounter's LLM narrative. Used as a fallback when the full LLM
 * synthesis call fails — so the Active Focus always has *something* current
 * rather than going stale. Returns null if no usable narrative is found.
 */

export async function runDirectQuestioningSession(
  initialSig: Significator,
  initialWorld: WorldState,
  orchestration?: OrchestrationServices,
): Promise<void> {
  banner('DIRECT QUESTIONING');
  if (!JSON_MODE) console.log(`  ${chalk.dim('A series of open questions. Answer each in your own words.')}\n`);

  // P0-U2 (Fresh-User UX Audit): Surface the previous session's integration
  // reflection at the start of the next session. This creates continuity
  // across sessions and gives the player a felt sense that their reflections
  // are being held by the game. The integration entries are stored in
  // narrative-memory.md under "## Integration" by runIntegrationRitual().
  if (!JSON_MODE) {
    try {
      const profileDir = getActiveProfileDir();
      if (profileDir) {
        const memPath = path.join(profileDir, 'narrative-memory.md');
        if (fs.existsSync(memPath)) {
          const mem = fs.readFileSync(memPath, 'utf8');
          const integrationBullets = extractMdSectionBullets(mem, 'Integration');
          if (integrationBullets.length > 0) {
            const lastIntegration = integrationBullets[0]!;
            // Strip the **Session <timestamp>:** prefix — the colon is inside
            // the bold markers, so we need to match **...:** (colon before closing **)
            const cleanText = lastIntegration.replace(/^\*\*[^*]+:\*\*\s*/, '')
              .replace(/^\*\*[^*]+\*\*:\s*/, '');
            if (cleanText.length > 10) {
              console.log(`  ${chalk.dim('Last time, you noticed:')}`);
              console.log(`  ${chalk.italic(cleanText)}`);
              console.log(`  ${chalk.dim('Has anything shifted since?')}\n`);
            }
          }
        }

        // NEXT-4 (Fresh-User UX Re-Audit): Felt-sense feedback between sessions.
        // Surface resonance shifts as a visible felt-sense change. The re-audit
        // found the resonance line shifts (fortress-sharp → cathedral-ordered)
        // but this is too subtle. Now we explicitly surface the shift at the
        // next session's opening so the player can feel the change.
        const identityPath = path.join(profileDir, 'identity.yaml');
        if (fs.existsSync(identityPath)) {
          const identityContent = fs.readFileSync(identityPath, 'utf8');
          // Lightweight YAML parse for the resonance fields
          const lastResMatch = identityContent.match(/^last_resonance:\s*(.+)$/m);
          const prevResMatch = identityContent.match(/^previous_resonance:\s*(.+)$/m);
          if (lastResMatch && prevResMatch) {
            const lastRes = lastResMatch[1]!.trim().replace(/^["']|["']$/g, '');
            const prevRes = prevResMatch[1]!.trim().replace(/^["']|["']$/g, '');
            if (lastRes && prevRes && lastRes !== prevRes) {
              console.log(`  ${chalk.dim('Something has shifted since last time:')}`);
              console.log(`  ${chalk.dim('The resonance was:')} ${chalk.italic(prevRes)}`);
              console.log(`  ${chalk.dim('The resonance is now:')} ${chalk.cyan.italic(lastRes)}`);
              console.log(`  ${chalk.dim('Feel the difference. What moved?')}\n`);
            }
          }
        }
      }
    } catch { /* best-effort — don't break session start */ }
  }

  // UX-PHASE-2: Cross-session practice hint recall. Surface the previous
  // session's practice invitation at the start of each new session, creating
  // a feedback loop that connects sessions and encourages real-world practice.
  if (!JSON_MODE) {
    const prevFocus = readActiveFocus();
    if (prevFocus && prevFocus.length > 10) {
      console.log(`\n  ${chalk.dim('Last time, you were invited to carry this practice:')}`);
      console.log(`  ${chalk.italic(prevFocus)}`);
      console.log(`  ${chalk.dim('Notice what arose. Carry it gently into today.')}\n`);
    }
  }

  // P1-F10 (Fresh-User UX Audit): Make the adaptive session focus perceptible.
  // The game silently shifts its session strategy based on the player's
  // surfacing shadows (e.g. from 'balanced-development' to 'shadow-integration')
  // — but this was completely invisible during normal play. The fresh-user
  // only discovered it by running `diagnostic`. Now we surface a Veil-compliant
  // qualitative hint at session start so the player can FEEL the game
  // responding to them, without breaking the Veil (no clinical labels, no
  // raw theme names, no metrics).
  if (!JSON_MODE) {
    const activeShadows = (initialSig.shadows?.entries ?? []).filter(s => !s.resolvedAt).length;
    const hint = activeShadows >= 3
      ? 'The work turns toward what has been avoided.'
      : activeShadows >= 1
        ? 'Something stirs beneath the surface — the work edges closer to it.'
        : 'The field is open; the work moves where it will.';
    console.log(`  ${chalk.dim(hint)}\n`);

    // NEXT-2 (Fresh-User UX Re-Audit): Session runtime expectation-setting.
    // The re-audit found 15-30s per encounter with no frame for the wait.
    // The thinking indicator (R5) makes the wait feel intentional, but the
    // player still doesn't know how long the session will take. This one-line
    // frame sets expectations without breaking the contemplative voice.
    const encounterCountForEstimate = FORCE_LINE ? 1 : Math.min(encounterCount, 8);
    const estimatedSeconds = encounterCountForEstimate * 20;
    const estimateWord = estimatedSeconds < 60 ? `${estimatedSeconds} seconds` : `${Math.round(estimatedSeconds / 60)} minutes`;
    console.log(`  ${chalk.dim(`Each encounter takes about 20 seconds. This session will take roughly ${estimateWord}. Take your time between them.`)}\n`);
  }

  // UX-P0-1: Respect --encounters, --line, --stage flags in DQ mode.
  // Previously these were silently ignored — user asks for 3 encounters, gets 8.
  // Now: if --line is set, run only that line. If --encounters is set and < 8,
  // run only that many lines. If --stage is set, force that stage.
  let linesToRun: Line[];
  if (FORCE_LINE) {
    linesToRun = [FORCE_LINE];
  } else {
    // Fisher-Yates shuffle
    const shuffledLines = [...ALL_LINES];
    for (let i = shuffledLines.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledLines[i]!, shuffledLines[j]!] = [shuffledLines[j]!, shuffledLines[i]!];
    }
    // Respect --encounters count (cap at 8 lines)
    const count = Math.min(encounterCount, shuffledLines.length);
    // P2-4 (UX-R3): Warn when --encounters exceeds the DQ cap (8 lines).
    // Previously this was a silent cap — the user asked for 999, got 8,
    // with no explanation. Now they see a clear notice.
    if (encounterCount > shuffledLines.length && !JSON_MODE) {
      warn(`--encounters=${encounterCount} exceeds the ${shuffledLines.length} available lines in Direct Questioning mode; running ${count}. (Use --agent for Story-Driven mode with more encounters.)`);
    }
    linesToRun = shuffledLines.slice(0, count);
  }

  let currentSig = initialSig;
  let currentWorld = initialWorld;
  const history: ConsequenceRecord[] = [];
  const consecutivePasses = new Map<string, number>();
  const agent = new SessionAgent();

  // R8-BUG-5 (UX-R8): Warn when --answer count doesn't match --encounters count.
  // Previously: too few answers → silent reuse/default; too many → silent drop.
  // Now: warn so the user knows their input isn't being used as expected.
  if (USER_ANSWERS.length > 0 && USER_ANSWERS.length !== linesToRun.length && !JSON_MODE) {
    if (USER_ANSWERS.length < linesToRun.length) {
      warn(`--answer count (${USER_ANSWERS.length}) is less than --encounters (${linesToRun.length}); remaining encounters will use default responses.`);
    } else {
      warn(`--answer count (${USER_ANSWERS.length}) exceeds --encounters (${linesToRun.length}); extra answers will be ignored.`);
    }
  }

  // P2-U5 (Fresh-User UX Re-Audit): Ensure profile exists BEFORE the DQ loop
  // so that progressive vocabulary unlock can persist terms during the session.
  // Previously the profile was created after the session ended, which meant
  // getActiveProfileDir() returned null during the encounter loop and unlocks
  // were silently dropped.
  if (!getActiveProfileName()) {
    // Try migrating legacy save first; if that fails, create a default profile
    const migrated = migrateLegacySave();
    if (!migrated) {
      try {
        createProfile('default');
      } catch { /* profile may already exist */ }
    }
  }

  for (let i = 0; i < linesToRun.length; i++) {
    const line = linesToRun[i]!;
    // UX-P0-1: Respect --stage forcing
    const currentStage = FORCE_STAGE ?? currentSig.altitudes[line] ?? 'Red';

    // T-3.4 (Veil compliance): don't leak the line taxonomy name.
    separator(`Question ${i + 1}/${linesToRun.length}`);

    // P1-U1 (Fresh-User UX Audit): Embodied pause protocol.
    // Before each encounter, invite the player to arrive in their body.
    // The audit found that all encounters are intellectual/cognitive, even
    // the somatic line. This 5-second breath cue is the lightest possible
    // intervention that honors the body the game claims to develop.
    // Skipped in JSON/headless mode for CI throughput.
    if (!JSON_MODE && !HEADLESS) {
      const breathCues = [
        'Take a breath. Feel your feet on the floor.',
        'Take a breath. Let your shoulders settle.',
        'Take a breath. Notice where you are holding.',
        'Take a breath. Arrive here, now.',
        'Take a breath. Let the body be present.',
      ];
      const cue = breathCues[i % breathCues.length]!;
      const spinner = ora({ text: chalk.dim(cue), color: 'cyan' }).start();
      await new Promise(r => setTimeout(r, 5000));
      spinner.stop();
      console.log(`  ${chalk.dim(cue)}`);
    }

    // ponytail: synthetic encounter forces LanguageReflective modality
    const encounter: ScheduledEncounter = {
      id: `dq-${line}:${currentStage}:${Date.now()}`,
      moduleRef: `${line}:${currentStage}`,
      modality: 'LanguageReflective',
      targetLines: [line],
      stage: currentStage,
      holonSource: 'self-reflection',
      shadowTarget: null,
      polarityMode: 'Exploring',
      difficulty: 0.5,
      sessionPosition: i < 2 ? 'warmup' : i >= 6 ? 'cooldown' : 'peak',
      priority: 1.0,
      driveTarget: null,
      executionMode: 'capacity',
    };

    try {
      // UX-PHASE-1: Show spinner during LLM processing so the terminal
      // doesn't appear frozen during the 20-60s LLM calls.
      const encounterSpinner = JSON_MODE ? null : ora({ text: chalk.dim('The game is reflecting...'), color: 'cyan' }).start();
      let result: Awaited<ReturnType<typeof executeEncounter>>;
      let encounterTimedOut = false;
      // UX-PHASE-5A: Per-encounter timeout (60s) with deterministic fallback.
      // When the reasoning model takes too long, fall back to a curated
      // narrative so the session doesn't hang. The player still gets a
      // meaningful response instead of a frozen terminal.
      const ENCOUNTER_TIMEOUT_MS = 60_000;
      try {
      const encounterPromise = executeEncounter(encounter, currentSig, currentWorld, history, {
        consecutivePasses,
        agentSynthesis: agent.buildSynthesis(),
        // Phase 14 d4: the default surface runs the REAL loop. Without `orchestration` the whole
        // Phase 11–13 architecture (feed, owner workers, personalization envelope, memory) had no
        // exerciser on the path an agent drives headlessly — the failure class the checked-surface
        // audit called "architecture-dark". `undefined` degrades lawfully (`sessionRuntime` seam).
        orchestration,
      });
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('encounter_timeout')), ENCOUNTER_TIMEOUT_MS);
      });
      result = await Promise.race([encounterPromise, timeoutPromise]);
      } catch (err: any) {
        if (err?.message === 'encounter_timeout') {
          // LLM timed out — use deterministic fallback so the session continues
          encounterTimedOut = true;
          const fallbackNarrative = pickFallbackNarrative();
          result = {
            outcome: {
              passed: false,
              confidence: 0.5,
              dimensions: {},
              modality: encounter.modality,
              line: encounter.targetLines[0] ?? 'Cognitive',
              stage: encounter.stage,
            } as any,
            response: {
              narrativeSummary: fallbackNarrative,
              driveDirectionality: {},
              shadowSurfaced: null,
              shadowResolvedId: null,
            } as PlayerResponse,
            narrativeSummary: fallbackNarrative,
            effectiveEncounter: encounter,
          };
          if (!JSON_MODE) warn('The game took longer than expected — continuing with a gentle reflection.');
        } else {
          throw err;
        }
      } finally {
        if (encounterSpinner) encounterSpinner.stop();
      }

      // Qualitative feedback — no pass/fail, no clinical labels
      // UX-PHASE-5A: When the encounter timed out, result.outcome has a minimal
      // fallback shape that lacks consequenceRecord. Guard all downstream code
      // that accesses cr.* to prevent crashes on the fallback path.
      const cr = encounterTimedOut ? null : (result.outcome as any).consequenceRecord ?? null;
      if (!encounterTimedOut) {
      if (!JSON_MODE && cr) {
        // P1-1 (UX-R3): word-boundary-aware truncation; was slice(0,120)+'...'
        // R5-BUG-5 (UX-R5): If the LLM returned an empty narrative, fall back
        // to the FallbackNarratives pool instead of showing an empty ✦ line.
        const rawNarrative = result.narrativeSummary?.trim() || pickFallbackNarrative();
        const briefNarrative = truncateNarrative(rawNarrative, 1000);
        // R11-P5 (Fresh-User UX Audit): The ✦ glyph precedes the narrative
        // and looks like the game is about to say something. When the
        // narrative is just the player's own write-in answer echoed back
        // (the DQ self-reflection path sets narrativeSummary = writeInValue),
        // the ✦ becomes a cruel punctuation mark — it promises a response
        // and delivers only your own words. Detect the echo case and show
        // an honest "recorded your response" indicator instead. The ✦ +
        // genuine LLM narrative path is preserved for when U1 ships.
        const userWriteIn = result.response?.writeInValue?.trim() ?? '';
        const isEcho = userWriteIn.length > 0
          && briefNarrative.trim().toLowerCase() === userWriteIn.toLowerCase();
        if (isEcho) {
          console.log(`\n  ${chalk.dim('· recorded your response ·')}`);
        } else {
          console.log(`\n  ${chalk.dim('\u2726')} ${briefNarrative}`);
        }

        // T-3.4 (Veil compliance): replace "The encounter stirred: ↑ Communion drive, Homeostatic"
        // with a qualitative felt-sense description that doesn't leak drive names.
        // R5-P2-1 (UX-R5): The felt-sense text was repeating every encounter because
        // the same drive directionality recurs. Now we vary the phrasing per encounter
        // using a stable hash so the same encounter doesn't repeat the same line.
        const driveEntries = Object.entries(cr.polarityTrace.driveDirectionality);
        const dominantDrive = driveEntries.find(([, v]) => v !== 'HealthyBalanced');
        if (dominantDrive) {
          const feltSenseVariants: Record<string, string[]> = {
            DarkAddicted: [
              'A familiar pull tugs underneath the surface.',
              'The old pattern reached for you again — and almost had you.',
              'Something in you wanted to slip back into the known shape.',
            ],
            DarkAverted: [
              'Something here is being avoided; the body flinches before the mind catches up.',
              'A part of you turned away before the question fully landed.',
              'There was a flinch — small, quick — toward the exit.',
            ],
            GoldenAddicted: [
              'A reaching toward the light that skips over the ground beneath your feet.',
              'The pull upward felt spiritual — and slightly disembodied.',
              'You reached for the higher thing before the lower thing was done.',
            ],
            GoldenAverted: [
              'A resistance to what is trying to emerge.',
              'Something in you braced against the next step.',
              'The call forward met a quiet, stubborn no.',
            ],
          };
          const variants = feltSenseVariants[dominantDrive[1] as string] ?? ['Something stirred.'];
          const idx = (encounter.id.length + Date.now()) % variants.length;
          console.log(`  ${chalk.dim(variants[idx] ?? variants[0]!)}`);
        }

        // R7-P1-2 (UX-R7): Vary the shadow-surfaced footer so it doesn't
        // repeat the same line every encounter.
        if (cr.shadowSurfaced) {
          const stirredVariants = [
            'Something beneath the surface stirred.',
            'A shadow edge caught the light.',
            'Something unnamed moved in the periphery.',
            'A pattern you haven\'t fully named flickered past.',
          ];
          const idx = (encounter.id.length + Date.now()) % stirredVariants.length;
          console.log(`  ${chalk.dim(stirredVariants[idx] ?? stirredVariants[0]!)}`);
        }
        // P1-3 (UX-R3): Progress bar is deferred until after currentSig is
        // updated (see below) so it reflects the encounter that just completed.
      }

      // Feed result to session agent for cross-encounter synthesis
      const driveExpr = cr.polarityTrace.driveDirectionality;
      agent.addEncounter({
        line,
        stage: currentStage,
        narrativeSummary: result.narrativeSummary,
        writeInResponse: result.outcome.playerWriteIn ?? result.narrativeSummary,
        driveExpression: {
          agency: result.outcome.driveScores?.agency ?? (driveExpr.Agency === 'HealthyBalanced' ? 0.6 : 0.3),
          communion: result.outcome.driveScores?.communion ?? (driveExpr.Communion === 'HealthyBalanced' ? 0.6 : 0.3),
          eros: result.outcome.driveScores?.eros ?? (driveExpr.Eros === 'HealthyBalanced' ? 0.6 : 0.3),
          agape: result.outcome.driveScores?.agape ?? (driveExpr.Agape === 'HealthyBalanced' ? 0.6 : 0.3),
        },
        shadowSurfaced: cr.shadowSurfaced,
        passed: result.outcome.finalResult.passed,
        timestamp: Date.now(),
      });

      history.push(cr);
      currentSig = result.outcome.updatedSig;
      currentWorld = result.outcome.updatedWorld;

      // Profiling: append encounter to the encounter-log.md (preserves user
      // words + LLM responses across sessions — the therapeutic conversation).
      const _activeName = getActiveProfileName();
      if (_activeName) {
        try {
          const userAnswer = result.response?.writeInValue ?? '';
          const questionText = result.response?.questionText ?? '';
          const npcName = currentWorld.holons.find(h => h.id === encounter.holonSource)?.name;
          appendEncounterLog(_activeName, {
            encounterNum: currentSig.totalEncounters,
            line, stage: currentStage,
            npc: npcName,
            question: questionText?.slice(0, 500),
            userAnswer: userAnswer?.slice(0, 500),
            llmNarrative: result.narrativeSummary?.slice(0, 500),
            driveSignal: Object.entries(cr.polarityTrace.driveDirectionality)
              .filter(([, v]) => v !== 'HealthyBalanced')
              .map(([k, v]) => `${k}:${v}`).join(', ') || 'HealthyBalanced',
            shadowSurfaced: cr.shadowSurfaced,
            timestamp: new Date().toISOString(),
          });
        } catch (e: any) { if (!JSON_MODE) console.error(`  ${chalk.dim('profile log error: ' + (e?.message || e))}`); }
      }

      // P1-3 (UX-R3): Surface per-line progress to next threshold AFTER the
      // sig is updated, so the bar reflects the encounter that just completed.
      if (!JSON_MODE) {
        const progress = getLineProgress(currentSig).find(p => p.line === line);
        if (progress) {
          const filled = Math.min(8, Math.round(progress.ratio * 8));
          const bar = '▓'.repeat(filled) + '░'.repeat(8 - filled);
          console.log(`  ${chalk.dim(`${line.padEnd(13)} ${bar} ${progress.traces}/${progress.threshold}`)}`);
        }

        // P1-F6 (Fresh-User UX Audit): --verbose was a no-op in the DQ
        // (headless) session path — the flag was advertised in --help but
        // never referenced in runDirectQuestioningSession(). Now it surfaces:
        //   1. The LLM feedback line (distinct from narrative; normally suppressed)
        //   2. The encounter's drive expression (qualitative, Veil-compliant)
        //   3. The session arc position (warmup/peak/cooldown)
        //   4. The running total encounters
        // This gives curious players / developers a window into the engine
        // without breaking the Veil (no raw G_z/P_z/CCI — those stay behind --dev).
        if (VERBOSE) {
          // NF-5: Route feedback through VeilFilter so clinical labels
          // (DarkAllergy, DarkAverted) and metrics (93% conceptual density)
          // don't leak through --verbose. The Veil applies to all user-facing
          // output, not just the normal path.
          // NF3-2 (Fresh-User Audit 3): Use truncateAtWordBoundary instead of
          // raw .slice(0, 280) so feedback doesn't cut mid-word ("patter" instead
          // of "pattern"). The audit found --verbose feedback was still truncating
          // mid-word because NF-8's fix only applied to Recent Sessions.
          const rawFeedback = result.outcome.feedback ?? '';
          const veiledFeedback = filterOutput(rawFeedback).filtered;
          const truncatedFeedback = truncateAtWordBoundary(veiledFeedback, 280);
          if (truncatedFeedback && truncatedFeedback !== truncateAtWordBoundary(result.narrativeSummary ?? '', 280)) {
            verbose('feedback', truncatedFeedback);
          }
          // NF-5: Translate clinical drive labels to Veil-compliant descriptions.
          // Old: 'Agency:DarkAverted' (clinical). New: 'Agency: a rejection of a lower capacity' (qualitative).
          const driveExpr = cr.polarityTrace.driveDirectionality;
          const driveSummary = Object.entries(driveExpr)
            .filter(([, v]) => v !== 'HealthyBalanced')
            .map(([k, v]) => `${k}: ${veilDriveDirection(v as string)}`).join(', ') || 'balanced';
          verbose('drives', driveSummary);
          verbose('arc', `${encounter.sessionPosition} · encounter ${i + 1}/${linesToRun.length}`);
          verbose('total', `${currentSig.totalEncounters} cumulative encounters`);
        }
      }

      // Wave 1.3: Apply the response to GameLoop state engines in Direct Questioning mode too.
      // DQ bypasses tickWithStrategy but should still update UserMatrixModel + transformation state.
      if (result.response) {
        // DQ doesn't have a sessionState from startSession — create a minimal one
        // The strategy is GENERATED, not hand-written. The literal that stood here had already
        // drifted from `SessionStrategy` (a `warmup` field that is now `warmupCount`, a
        // `midSessionAdjustmentThreshold` that never existed, weights missing `knowledgeHealth`,
        // and no `themeRationale`/`arc`/`modalityBias` at all) — which is what a second copy of a
        // shape converges on. DQ has no auto-mode arc, so it derives one from the neutral CCI.
        const dqCci: CCIScore = {
          composite: 0.5,
          dimensions: { altitude: 0.3, driveHealth: 0.5, polarity: 0.2, shadowTopology: 0.5, transformationReadiness: 0.2 },
          weights: DEFAULT_CCI_WEIGHTS,
          dominantDimension: 'driveHealth',
          sessionSignals: { recommendedTheme: 'balanced-development', intensityBudget: 0.5, shadowPressure: 'low', transformationProximity: 'distant', driveRebalancingTarget: null, polarityGuidance: { mode: 'exploration', recommendedDiversity: 0.7, temptationFrequency: 0.3 } },
        };
        const dqSessionState: SessionState = {
          strategy: generateSessionStrategy(dqCci, { encountersSoFar: i, targetSessionLength: 8, recentLines: [] }, null),
          cci: dqCci,
          recentOutcomes: [],
          encountersSinceRefresh: i,
          transformationState: { phase: currentSig.transformationPhase ?? 'idle', targetStage: currentSig.transformationTargetStage ?? null, sessionsInPhase: currentSig.transformationSessionsInPhase ?? 0, knotsResolved: currentSig.transformationKnotsResolved ?? 0, totalKnots: currentSig.transformationTotalKnots ?? 0 },
          userMatrixModel: (globalThis as any).__userMatrixModel ?? createInitialUserMatrixModel(),
        };
        const applied = applyResponseOnly(
          currentSig, currentWorld, dqSessionState,
          result.response, encounter, Date.now(),
        );
        currentSig = applied.sig;
        currentWorld = applied.world;
        (globalThis as any).__userMatrixModel = applied.sessionState.userMatrixModel;
      }

      emitEvent('dq_line_completed', {
        line, stage: currentStage,
        narrative: result.narrativeSummary,
        totalEncounters: currentSig.totalEncounters,
      });

      // P2-U5 (Fresh-User UX Re-Audit): Progressive vocabulary unlock.
      // Check the narrative for Tier 2 glossary terms. When a term is
      // encountered for the first time, it unlocks and is persisted to
      // the profile. The player is notified (non-JSON mode only).
      if (result.narrativeSummary) {
        const profileDir = getActiveProfileDir();
        if (profileDir) {
          const alreadyUnlocked = loadUnlockedTerms(profileDir);
          // P0-R3 (Curriculum Audit): Unlock glossary terms sooner.
          // Content-driven check plus encounter-count auto-unlock: after 3
          // encounters, unlock core Tier 2 terms that appear in narrative.
          let newlyUnlocked = checkTermUnlocks(result.narrativeSummary, alreadyUnlocked);
          if (newlyUnlocked.length === 0 && currentSig.totalEncounters >= 3) {
            const coreTerms = ['Shadow', 'Line', 'Drive'];
            const coreUnlocked = coreTerms.filter(t => !alreadyUnlocked.includes(t));
            if (coreUnlocked.length > 0) newlyUnlocked = coreUnlocked;
          }
          if (newlyUnlocked.length > 0) {
            const trulyNew = addUnlockedTerms(profileDir, newlyUnlocked);
            if (trulyNew.length > 0) {
              if (!JSON_MODE) {
                for (const term of trulyNew) {
                  console.log(`  ${chalk.dim('✦ New term unlocked:')} ${chalk.cyan(term)} ${chalk.dim('— run `mysterium glossary` to see its definition')}`);
                }
              }
              emitEvent('terms_unlocked', { terms: trulyNew });
            }
          }
        }
      }

      // P0-2 (UX-R3): Honor --dev during DQ sessions.
      emitDevPrimitives(currentSig, `dq:${line}:${currentStage}`);
      }
    } catch (err: any) {
      error(`Encounter failed: ${err.message || err}`);
      emitEvent('dq_line_error', { line, error: err.message });
    }
  }

  // T-3.4: Radar chart removed — Veil violation (shows line×stage matrix).

  // Session end — apply theta-decay and increment totalSessions.
  // P1-17: Previously DQ created a FRESH sessionState here (with empty
  // recentOutcomes + fresh userMatrixModel), causing endSession's summary to
  // report encountersCompleted=0 + shadowsSurfaced=0 + empty userMatrixSummary.
  // Now we reconstruct a sessionState that reflects the DQ session's actual
  // accumulated state (8 completed encounters + the globalThis userMatrixModel).
  const now = Date.now();
  const dqSessionState = startSession(currentSig, { encountersSoFar: 8, sessionDurationMs: 0, targetSessionLength: 8, recentLines: [] });
  // Override with the actual accumulated state from the DQ session
  const dqAccumulatedState: SessionState = {
    ...dqSessionState,
    recentOutcomes: Array.from({ length: 8 }, () => ({
      outcome: 'completed' as const,
      quality: 0.6,
      mode: 'capacity' as const,
      shadowIntegrated: false,
    })),
    encountersSinceRefresh: 8,
    userMatrixModel: (globalThis as any).__userMatrixModel ?? dqSessionState.userMatrixModel,
    sessionStartMs: now - 8 * 60000, // approximate session start
  };
  const sessionEnd = endSession(currentSig, dqAccumulatedState, now, currentWorld);
  currentSig = sessionEnd.sig;
  if (sessionEnd.world) {
    currentWorld = sessionEnd.world;
  }

  // Phase 14 d4 (G28): carry the runtime checkpoint onto the DEFAULT surface. The story branch
  // persisted it; this one did not, so a DQ session left no orchestration state and every reader
  // (planning bias, CCI projections, retrieval) saw a fresh feed on the next boot. Same two writes
  // as the story branch: the checkpoint rides the world save, and the sidecar journal makes it
  // crash-recoverable before the next saveAll.
  if (orchestration) {
    const checkpoint = captureCheckpoint(orchestration);
    (currentWorld as { orchestrationCheckpoint?: RuntimeCheckpoint }).orchestrationCheckpoint = checkpoint;
    appendJournalEntry(getMysteriumProfileDir(), checkpoint);
  }

  // No decorative closing — the session's per-encounter feedback is sufficient.
  // Atmospheric closing lines impose a specific vibe that may not resonate
  // universally and break the flow.

  // Save (P0-5: atomic saveAll for sig + world consistency)
  saveAll(currentSig, currentWorld);
  if (!JSON_MODE) info('save', `${chalk.green('Progress saved')}`);

  // NF3-3 (Fresh-User Audit 3): If no profile is active (first session),
  // migrate the legacy save NOW so the profile exists immediately — not
  // deferred to the next session start or a `profile list` invocation.
  // The audit found: after Session 1, `profile show` said "No active
  // profile yet" even though the player had just played, because
  // migrateLegacySave() was only called in runFullSession() (next session)
  // and profile list. Now it's called here, right after the save lands.
  if (!getActiveProfileName()) {
    const migrated = migrateLegacySave();
    if (migrated && !JSON_MODE) {
      info('profile', `${chalk.green('✓')} Profile "${migrated}" created.`);
    }
  }

  // Profiling system: update the active profile after session end.
  const _profileName = getActiveProfileName();
  if (_profileName) {
    try {
      // Build session entry for session-log.yaml
      // BUG-2 fix: PolarityTrace doesn't have a 'line' field. Get lines from the encounter moduleRefs.
      const linesTouched = [...new Set(history.map((r, i) => {
        // Try to extract line from the encounterId format "dq-Line:Stage:timestamp"
        const match = r.encounterId?.match(/dq-([^:]+):/);
        return match ? match[1] : `Encounter${i + 1}`;
      }))];
      const keyShift = history.length > 0
        ? (history.map(r => r.narrativeSummary).filter(n => n && n.length > 20).slice(-1)[0] || '').slice(0, 200)
        : '';
      const sessionEntry = {
        date: new Date().toISOString(),
        encounters: history.length,
        lines_touched: linesTouched.length > 0 ? linesTouched : ['Unknown'],
        themes: linesTouched.length > 0 ? linesTouched : ['Unknown'],
        key_shift: keyShift || 'No significant shift recorded',
        shadow_surfaced: history.some(r => r.shadowSurfaced) ? 'Yes' : 'No',
        llm_narrative_summary: keyShift || 'No narrative recorded',
      };

      // BUG-6 fix: Use drive DIRECTIONALITY (0-1 health scores) not raw weights.
      // The sig's drives.weights are cumulative offsets (-1 to +1), not health scores.
      // For the profile, convert to 0-1 range: 0.5 = balanced, >0.5 = healthy, <0.5 = pathological.
      const driveWeights = currentSig.drives.weights;
      const driveHealthScores = {
        // The Drive domain's keys are capitalised. These four read lowercase, so every lookup was
        // `undefined`, `?? 0` absorbed it, and the profile reported 0.5 ("perfectly balanced") for
        // all four drives regardless of the player's actual state.
        Agency: 0.5 + (driveWeights.Agency ?? 0) * 0.5,
        Communion: 0.5 + (driveWeights.Communion ?? 0) * 0.5,
        Eros: 0.5 + (driveWeights.Eros ?? 0) * 0.5,
        Agape: 0.5 + (driveWeights.Agape ?? 0) * 0.5,
      };

      updateProfileAfterSession(_profileName, {
        totalEncounters: currentSig.totalEncounters,
        totalSessions: currentSig.totalSessions,
        currentStage: currentSig.currentStage,
        altitudes: { ...currentSig.altitudes },
        drives: driveHealthScores,
        cci: 0.5,
        sessionEntry,
        shadows: currentSig.shadows.entries,
        // NEXT-4: Store the resonance for felt-sense feedback between sessions
        lastResonance: describePersonalResonance(currentSig),
      });
    } catch { /* best-effort — don't break session end */ }

    // Post-session LLM synthesis: read encounter log, extract insights,
    // append to narrative-memory.md, update goals.yaml active focus.
    if (!JSON_MODE) info('synthesis', `${chalk.dim('Synthesizing session insights...')}`);
    await synthesizeSessionInsights(_profileName, history.length);
  }

  // P0-U2 (Fresh-User UX Audit): Integration ritual at session end.
  // Closes the catalyst→experience→integration cycle (AGENTS.md §5.4).
  // The player is invited to reflect on what landed before the session
  // closes. Their response is persisted to narrative-memory.md and
  // surfaced in the next session's opening for continuity.
  const integrationResponse = await runIntegrationRitual(_profileName);

  // P0-2 (Fresh-User UX Audit): Connect integration response to practice.
  // When the player reflects on what surprised them or what wants to move,
  // seed a practice assignment for the next session based on their response.
  if (integrationResponse && !JSON_MODE) {
    const practiceHint = generatePracticeHint(integrationResponse, currentSig);
    if (practiceHint) {
      console.log(`\n  ${chalk.dim('═══ Practice ═══')}`);
      console.log(`  ${chalk.italic(practiceHint)}`);
    }
  }

  // P0-R2 (Curriculum Audit): Wire integration response to next-session focus.
  if (integrationResponse) updateGoalsActiveFocus(integrationResponse);

  // NF-3: Persist the asked-prompts set so the next session avoids repeats.
  saveAskedPrompts(getActiveProfileDir());

  // P2-R9 (Curriculum Audit): Somatic practice after Somatic-line encounters.
  const somaticHint = somaticPracticeHint(history);
  if (somaticHint && !JSON_MODE) {
    console.log(`\n  ${chalk.dim('═══ Body Practice ═══')}`);
    console.log(`  ${chalk.italic(somaticHint)}`);
  }

  // P0-3 (Fresh-User UX Audit): Post-session summary.
  // Gives the player a sense of what happened, what emerged, and what to
  // focus on next — without breaking the Veil (no metrics, no labels).
  renderPostSessionSummary(currentSig, history, AUDIT);

  emitEvent('session_ended', {
    mode: 'direct',
    linesAssessed: history.length,
    totalEncounters: currentSig.totalEncounters,
    totalSessions: currentSig.totalSessions,
    shadowsSurfaced: currentSig.shadows.activeCount,
    finalStage: currentSig.currentStage,
  });
  // FIX-A3 (Audit): flush the shared telemetry collector so the parent
  // FullSession's session_started event (recorded before DQ was called)
  // and any DQ encounter events are persisted. Without this, DQ sessions
  // return before FullSession's flush and no events are saved.
  try { const tel = await buildCLITelemetry().catch(() => null); await flushCLITelemetry(tel); } catch { /* best-effort */ }
}

// ── Full session mode ─────────────────────────────────────────────────

export async function runFullSession(): Promise<void> {
  banner('Mysterium Session Runner');

  // Profiling system: load active profile and inject context into LLM.
  // This gives the LLM long-term memory of the user across sessions.
  const activeProfileName = getActiveProfileName();
  if (activeProfileName) {
    const profile = loadProfile(activeProfileName);
    if (profile) {
      const contextInjection = buildContextInjection(profile);
      // Set as env var so AgenticOrchestrator can prepend it to the system prompt
      process.env.Mysterium_PROFILE_CONTEXT = contextInjection;
      if (!JSON_MODE) info('profile', `${chalk.cyan(profile.identity?.name || activeProfileName)} loaded — ${profile.identity?.total_sessions || 0} sessions, ${profile.identity?.total_encounters || 0} encounters`);
    }
  } else {
    // Auto-migrate legacy save if no profile exists
    const migrated = migrateLegacySave();
    if (migrated && !JSON_MODE) info('profile', `${chalk.green('✓')} Migrated existing save to profile "${migrated}"`);
    // NF-7: Don't tell the user to run setup-profile — it requires interactive
    // mode and fails in headless. The game will auto-create a 'default' profile
    // when the session saves. Just play.
    else if (!JSON_MODE) info('profile', `${chalk.dim('No profile yet — one will be created automatically when you play.')}`);
  }

  // NF-3 (Fresh-User Re-Audit): Load the cross-session asked-prompts set so
  // Session N doesn't repeat questions from Sessions 1..N-1. The re-audit
  // found Session 4 was entirely verbatim duplicates — the in-memory Set
  // was empty on each new process invocation. Now it's persisted to the
  // profile directory (asked-prompts.json).
  loadAskedPrompts(getActiveProfileDir());

  // P1-QW3 (Architecture Audit Phase A): CLI telemetry (opt-in via ~/.mysterium/config.json).
  // No-op when disabled. Used throughout the session to record lifecycle events.
  const cliTelemetry = await buildCLITelemetry().catch(() => null);
  recordCLITelemetry(cliTelemetry, 'session_started', { profileName: activeProfileName, sessionLength: encounterCount, line: FORCE_LINE ?? null, stage: FORCE_STAGE ?? null });

  // Boot with ora spinners for clean loading UX
  const s1 = JSON_MODE ? null : ora('Booting registries...').start();
  bootRegistries();
  const moduleRegistry = bootModuleRegistry();
  (globalThis as any).__moduleRegistry = moduleRegistry;
  seedCurriculumRegistry();
  s1?.succeed(`${moduleRegistry.count()} assessment modules loaded`);

  // LLM availability check
  const s2 = JSON_MODE ? null : ora('Checking LLM availability...').start();
  if (LLM_ACTIVE) {
    const llmUp = await checkLLMAvailability(baseUrl, apiKey);
    if (!llmUp) {
      setLlmActive(false);
      s2?.warn('LLM unreachable — please check your connection and configuration.');
      // UX-P0-3: Emit LLM-unavailable warning in JSON mode too
      if (JSON_MODE) {
        emitEvent('warning', { code: 'llm_unavailable', message: 'LLM unreachable — please check your connection and configuration.' });
      }
    } else {
      s2?.succeed(`LLM active: ${ACTIVE_MODEL}`);
      // R6-P1-1 (UX-R6): Warn when --headless is used without --answer/--answers
      // and the LLM is active. Without user-provided answers, the LLM will
      // hallucinate user responses (R5-CRITICAL was opt-in, not default).
      // This warning tells the user how to get a real reflective session.
      if (HEADLESS && USER_ANSWERS.length === 0 && !JSON_MODE) {
        warn('Headless mode without --answer: the LLM will generate narratives without your input. For a real reflective session, provide answers via --answer "your reflection" (repeatable) or --answers <file>.');
      }
      if (HEADLESS && USER_ANSWERS.length === 0 && JSON_MODE) {
        emitEvent('warning', { code: 'no_user_answers', message: 'Headless mode without --answer: the LLM will generate narratives without user input. Provide --answer or --answers for authentic participation.' });
      }
      // R5-P2-3 (UX-R5/R6): Lazy model validation. Warn (not error) if the
      // configured model isn't in the provider's /models list. Non-blocking.
      const modelCheck = await validateModelIfFresh();
      if (modelCheck && !modelCheck.valid && modelCheck.message) {
        if (!JSON_MODE) warn(modelCheck.message);
        else emitEvent('warning', { code: 'model_not_listed', message: modelCheck.message });
      }
    }
  } else {
    // EFFICACY-PILOT (P0): The game MUST run with LLM or not at all.
    // Fallback narratives cannot compensate for the infinite range of human
    // reflection. The pilot study proved that echo-only mode (no LLM) is
    // worse than silence — it returns the user's own words with no therapeutic
    // response, destroying trust after vulnerable disclosures.
    //
    // Actual session play REQUIRES the LLM.
    if (subcommand === 'session' || subcommand === undefined || subcommand === 'full') {
      if (!LLM_ACTIVE) {
        if (!JSON_MODE) {
          error('LLM not configured. Mysterium requires an active LLM to run sessions.');
          console.log(`\n  ${chalk.dim('No API key found. The game cannot run without the LLM.')}`);
          console.log(`\n  ${chalk.bold('To configure:')}`);
          console.log(`  ${chalk.dim('  1. Run `mysterium setup` in a real terminal, OR')}`);
          console.log(`  ${chalk.dim('  2. Set OPENCODE_API_KEY=<key> and MODEL=<model> env vars, OR')}`);
          console.log(`  ${chalk.dim('  3. Edit ~/.mysterium/config.json: {"llm":{"provider":"opencode","apiKey":"<key>","model":"mimo-v2.5-free","baseUrl":"https://opencode.ai/zen/v1"}}')}\n`);
        } else {
          emitEvent('fatal', { code: 'llm_not_configured', message: 'No LLM API key configured. Run `mysterium setup` or set env vars.' });
        }
        process.exit(1);
      }
    }
    s2?.info('LLM not configured — only non-reflective commands available');
  }

  // PILOT-5.5 (Efficacy Pilot): With LLM-required mode, the saturation
  // threshold stays at 20 (the LLM-calibrated value).
  // The threshold of 20 means ~20 encounters per line × 8 lines = ~160
  // encounters for a stage transition. This is intentional — stage
  // transitions are rare, dramatic, and require sustained practice.

  // Holons
  const s3 = JSON_MODE ? null : ora('Loading world...').start();
  const world = loadHolons();
  const npcCount = world.holons.filter(h => h.kind === 'NPC').length;
  s3?.succeed(`${world.holons.length} holons (${npcCount} NPCs)`);

  // Significator
  const s4 = JSON_MODE ? null : ora('Creating Significator...').start();
  const sig = await createDefaultSignificator();
  printSignificator(sig);
  s4?.succeed('Significator ready');
  const session: SessionContext = {
    encountersSoFar: 0,
    sessionDurationMs: 0,
    targetSessionLength: encounterCount,
    recentLines: [],
    ...(FORCE_LINE ? { forceLine: FORCE_LINE } : {}),
    ...(FORCE_STAGE ? { forceStage: FORCE_STAGE } : {}),
    ...(FORCE_MODALITY ? { forceModality: FORCE_MODALITY } : {}),
  } as any;
  // RuntimeLoop (43 §5.5 + 22 §7.5): one services record for the whole session — the feed and the
  // owner-worker profiles accumulate across encounters. Seeded from the authored holon corpus so
  // NPC candidates derive and workers have owners. Phase 11 d1 (G28): the PREVIOUS session's
  // checkpoint (feed entries + worker pool + polarity states) is restored so cross-session
  // memory survives the restart — F3 replay makes the restore exact. Created BEFORE startSession
  // so reader 1 (27 planning, Phase 11 d2) can see the restored feed's trend.
  const savedCheckpoint = (world as { orchestrationCheckpoint?: RuntimeCheckpoint }).orchestrationCheckpoint;
  // Phase 13 d9b: replay the crash-sidecar journal BEFORE trusting the restored checkpoint — a
  // session that ended after the last saveAll is pending here. The merged checkpoint seeds the
  // services; the summary is logged so recovery is never silent (LM-c's countermeasure).
  const journalReplay = savedCheckpoint
    ? replayJournal(getMysteriumProfileDir(), savedCheckpoint)
    : { checkpoint: undefined as unknown as RuntimeCheckpoint, replayed: 0, consumed: 0, droppedTorn: 0 };
  if (journalReplay.replayed > 0 || journalReplay.droppedTorn > 0) {
    console.log(
      `[journal] recovered ${journalReplay.replayed} unsaved session(s)` +
        `${journalReplay.droppedTorn > 0 ? `, dropped ${journalReplay.droppedTorn} torn line(s)` : ''}`,
    );
  }
  const orchestration = createOrchestrationServices(world.holons, savedCheckpoint ? journalReplay.checkpoint : undefined);

  // M4: When --agent is set, use the TDG-augmented session start. This blends
  // TDG G_z/P_z into the CCI's metabolicHealth dimension and runs a graph-level
  // reflection to seed the session strategy. No-op (returns baseline) when TDG
  // is not running — zero regression.
  // YAGNI-EFF-3: startSessionWithTDG removed. USE_PERSISTENT_AGENT is always
  // false; the DQ path is the proven architecture.
  // Phase 11 d2 (43 §5.5 reader 1): the restored feed's planning projection biases the
  // strategy — ranking-as-bias; an empty/restored feed yields byte-identical behaviour.
  let sessionState = startSession(sig, session, feedPlanningBias(orchestration.feed));
  applyCurriculumMode(sessionState);
  // Training decay: narrative-only sessions still age cognitive skills
  try {
    const tDecay = await buildTrainingIntegration().catch(() => undefined);
    if (tDecay) { tDecay.services.index.applyDecay(); await tDecay.services.persistIndex(); }
  } catch { /* best-effort */ }

  // P3-CONTINUITY (Fresh-User Re-Audit): Surface previous session's practice
  // hint at session start. The practice hint is written to goals.yaml at the
  // end of each session but never read back at the start of the next one.
  // This breaks the feedback loop — the game tells you what to practice but
  // never asks if you did.
  const prevFocus = readActiveFocus();
  if (prevFocus && prevFocus.length > 5 && !JSON_MODE) {
    console.log(`\n  ${chalk.italic(chalk.dim('From your last session:'))}`);
    console.log(`  ${chalk.italic(prevFocus)}`);
    console.log(`  ${chalk.dim('Did anything arise?')}\n`);
  }

  // Declare mutable state BEFORE the banner so it can reference them
  let currentSig = sig;
  let currentWorld = world;

  // Task 5: Mode selection — player chooses gameplay mode. `--mode` wins; otherwise an interactive
  // prompt; otherwise the direct flow (the default). The flag is what makes the story branch
  // reachable from `--headless`/`--json`, where the prompt is skipped.
  let gameMode: SessionMode = FORCE_MODE ?? 'direct';
  if (!HEADLESS && !JSON_MODE && !FORCE_LINE && !FORCE_MODALITY && !FORCE_MODE) {
    const modeChoice = await select({
      message: 'Choose your gameplay mode:',
      options: [
        { value: 'direct', label: 'Direct Questioning — Personality-test style' },
        { value: 'story', label: 'Story-Driven — Immersive RPG narrative' },
      ],
    });
    gameMode = modeChoice === 'story' ? 'story' : 'direct';
  }
  // M1: When --agent is set, auto-switch to Story mode (the PersistentAgent is
  // wired into the Story-Driven encounter loop, not the Direct Questioning flow).

  const isDirectMode = gameMode === 'direct';

  // ponytail: Direct Questioning gets its own session flow — 8 lines, write-in, no pass/fail
  if (isDirectMode) {
    await runDirectQuestioningSession(currentSig, currentWorld, orchestration);
    return;
  }

  banner('SESSION START');
  // P1-F10: Surface the adaptive theme with a Veil-compliant qualitative
  // gloss, so the player can feel the game responding to their state without
  // seeing raw engine labels. The raw theme name is still shown (in dim) for
  // developers, but the qualitative hint is what the player reads.
  const themeHint = veilThemeHint(sessionState.strategy.theme);
  info('focus', `${chalk.cyan(themeHint)}`);
  if (VERBOSE || DEV_MODE) info('theme', `${chalk.dim(sessionState.strategy.theme)}`);
  info('target', `${encounterCount} encounters`);
  console.log('');

  if (!JSON_MODE) {
    const atmospheres = [
      `${chalk.dim('The world stirs with latent potential. Fragments of memory surface — echoes of journeys not yet taken.')}`,
      `${chalk.dim('A pale light filters through the veil. The architecture of consciousness awaits your engagement.')}`,
      `${chalk.dim('The field of development hums with quiet energy. Each encounter will shape the landscape of your becoming.')}`,
      `${chalk.dim('Between the seen and unseen, the developmental engines prepare their catalysts. Step forward.')}`,
    ];
    console.log(`\n  ${atmospheres[Math.floor(Math.random() * atmospheres.length)]}`);
  }

  emitEvent('session_started', {
    cci: sessionState.cci.composite,
    theme: sessionState.strategy.theme,
    targetEncounters: encounterCount,
  });
  let completedCount = 0;
  let passedCount = 0;
  const now = Date.now();
  const sessionStartedAt = now;
  const history: ConsequenceRecord[] = [];
  const consecutivePasses = new Map<string, number>();

  for (let i = 0; i < encounterCount; i++) {
    separator(`Encounter ${i + 1}/${encounterCount}`);

    // Feed back the PREVIOUS encounter's response to apply consequences
    // NOTE: Don't pass prevResponse to tickWithStrategy — the orchestrator already
    // applies consequences via processOutcome + applyConsequences. Passing it here
    // would double-count encounters (totalEncounters increments twice per encounter).
    let { tickResult, sessionState: newState } = tickWithStrategy(
      currentSig,
      currentWorld,
      { ...session, encountersSoFar: i, sessionDurationMs: i * 5000 },
      sessionState,
      null,
      null,
      now + i * 5000,
    );

    currentSig = tickResult.sig;
    currentWorld = tickResult.world;
    sessionState = newState;

    // If no natural encounter and forcing is active, create a synthetic one
    if (!tickResult.encounter && (FORCE_LINE || FORCE_STAGE || FORCE_MODALITY)) {
      const synthLine = FORCE_LINE ?? 'Cognitive' as Line;
      const synthStage = FORCE_STAGE ?? 'Red' as Stage;
      const synthModality = FORCE_MODALITY ?? 'Deterministic' as Modality;
      const synthHolon = currentWorld.holons[0] ?? { id: 'synthetic', name: 'The Examiner', narrativeRole: 'guide' };
      const syntheticEncounter: ScheduledEncounter = {
        id: `synthetic:${synthLine}:${synthStage}:${now + i * 5000}`,
        moduleRef: `${synthLine}:${synthStage}`,
        modality: synthModality,
        targetLines: [synthLine],
        stage: synthStage,
        holonSource: synthHolon.id ?? 'synthetic',
        shadowTarget: null,
        polarityMode: 'Exploring',
        difficulty: 0.5,
        sessionPosition: 'peak',
        priority: 0.999,
        driveTarget: null,
        executionMode: 'capacity',
      };
      if (VERBOSE) warn(`No natural encounter found at ${synthLine}:${synthStage} — using synthetic encounter`);
      tickResult = { ...tickResult, encounter: syntheticEncounter, encounters: [syntheticEncounter] };
    }

    if (!tickResult.encounter) {
      warn('No encounter available — skipping');
      continue;
    }      // G.10: Non-coercion — present 3-5 ranked offers, player chooses
    let selectedEncounter: ScheduledEncounter = tickResult.encounter!;
    const offers = tickResult.encounters;
    if (offers.length > 1 && !HEADLESS && !JSON_MODE) {
      const posLabel = (pos: string) => pos === 'warmup' ? chalk.blue('warmup') : pos === 'cooldown' ? chalk.green('cooldown') : chalk.magenta('peak');
      const options = offers.map((enc, idx) => {
        const [encLineName, st] = enc.moduleRef.split(':');
        if (isDirectMode) {
          // Direct mode: show LINE + stage, personality-test style
          const lineLabel = CHALLENGE_NAMES[encLineName ?? ''] ?? encLineName;
          const stageCol = stageColor(st ?? 'Red');
          // P0-1 (Fresh-User UX Audit): Show curriculum concept name if available
          const curLabel = curriculumLabel(enc.curriculumConceptId);
          const label = `${idx + 1}. ${chalk.bold(lineLabel)}  ${stageCol(st ?? 'Red')}  ${chalk.dim(enc.modality)}  ${posLabel(enc.sessionPosition)}${curLabel ? ' 📚' + curLabel : ''}`;
          return { value: idx, label };
        }
        // Story mode: show location/NPC name
        const holon = world.holons.find(h => h.id === enc.holonSource);
        const location = holon?.name ?? encLineName;
        // P0-1 (Fresh-User UX Audit): Show curriculum concept name if available
        const curLabelStory = curriculumLabel(enc.curriculumConceptId);
        const label = `${idx + 1}. ${chalk.cyan(location)}  ${chalk.dim(enc.modality)}  ${posLabel(enc.sessionPosition)}${curLabelStory ? ' 📚' + curLabelStory : ''}`;
        return { value: idx, label };
      });
      const choice = await select({
        message: isDirectMode ? 'Choose your developmental line:' : 'Choose your encounter:',
        options,
        initialValue: 0,
      });
      if (typeof choice === 'number') {
        selectedEncounter = offers[choice];
        const skipped = offers.filter((_, idx) => idx !== choice).map(e => e.id);
        if (skipped.length > 0) {
          currentSig = { ...currentSig, avoidedEncounters: [...(currentSig.avoidedEncounters ?? []), ...skipped] };
        }
      }
    }
    // Direct mode: also show progress chart at the top of each encounter
    if (isDirectMode && !JSON_MODE) {
      renderLinesProgress(currentSig, history);
    }
    tickResult = { ...tickResult, encounter: selectedEncounter };

    // P1-QW8 (Architecture Audit Phase A): Show prerequisite gaps on every
    // encounter with a curriculumConceptId, not just in --curriculum mode.
    if (selectedEncounter.curriculumConceptId && currentSig?.knowledge && !JSON_MODE) {
      renderPrerequisiteGaps(selectedEncounter.curriculumConceptId, currentSig.knowledge);
    }

    // ── Training beat interlude: native brain game, no LLM ──
    if ((selectedEncounter as any).isTrainingBeat) {
      const paradigmId = (selectedEncounter as any).trainingParadigmId ?? 'stroop';
      const { getParadigm } = await import('../../src/core/braingame/registry.js');
      const paradigm = getParadigm(paradigmId);
      const label = paradigm?.label ?? paradigmId;
      if (!JSON_MODE) {
        console.log(`\n  ${chalk.dim('The world grows quiet. A practice arises —')} ${chalk.cyan(label)}`);
        console.log(`  ${chalk.dim('A brief remembering exercise surfaces within the journey.')}`);
      }
      try {
        const tBeat = await buildTrainingIntegration().catch(() => undefined);
        if (tBeat) {
          const outcome = await tBeat.runner.runGame(paradigmId, {});
          // Persistence is handled by the training tool handler for agentic beats,
          // but session beats use the runner directly — persist here.
          const sPersist = tBeat.services;
          // Reuse the same persistence path as handleTrainingTool: appendSession + index + calibration
          const { levelFromParadigm } = await import('../../src/core/adaptive/AdaptiveDifficultyService.js');
          await sPersist.trials.appendSession(outcome.trials as any, {
            sessionId: outcome.summary.sessionId,
            paradigmId: outcome.summary.paradigmId,
            startedAt: Date.now(),
            trialsCompleted: outcome.summary.trialsCompleted,
            accuracy: outcome.summary.overallAccuracy,
            rtMedianMs: outcome.summary.rtMedianMs,
            performance: outcome.summary.performance,
          });
          const pDef = getParadigm(paradigmId)!;
          sPersist.index.recordGame([...pDef.domains] as any, outcome.summary.performance);
          const prev = await sPersist.calibration.get(paradigmId);
          const endLevel = levelFromParadigm(pDef, outcome.summary.paramsEnd as any);
          await sPersist.calibration.put({
            paradigmId,
            baselineLevel: prev ? prev.baselineLevel * 0.7 + endLevel * 0.3 : endLevel,
            lastLevel: endLevel,
            calibratedAt: prev?.calibratedAt ?? Date.now(),
            lastPlayedAt: Date.now(),
            sessionsPlayed: (prev?.sessionsPlayed ?? 0) + 1,
          });
          await sPersist.persistIndex();
          if (!JSON_MODE) {
            console.log(`  ${chalk.dim(outcome.summary.feltSenseHint)}`);
          }
          emitEvent('training_beat_completed', { paradigmId, feltSense: outcome.summary.feltSenseHint, trialsCompleted: outcome.summary.trialsCompleted });
        }
      } catch (err: any) {
        if (!JSON_MODE) warn(`Practice stumbled: ${err?.message ?? err}`);
        emitEvent('training_beat_error', { paradigmId, error: String(err?.message ?? err) });
      }
      completedCount++;
      // Training beats do not advance narrative polarity/shadow; just continue
      continue;
    }

    // Show session position and encounter header
    const encProgress = (selectedEncounter.sessionPosition === 'warmup' ? 0.1
      : selectedEncounter.sessionPosition === 'cooldown' ? 0.9 : 0.5);
    renderSessionPosition(`${i + 1}/${encounterCount}`, selectedEncounter.sessionPosition, encProgress);
    printEncounter(selectedEncounter, currentWorld);

    // Transition indicator with processing spinner
    if (i > 0 && !JSON_MODE) {
      const transitions = [
        `${chalk.dim('The previous encounter settles into memory. A new catalyst emerges...')}`,
        `${chalk.dim('The developmental field shifts. What comes next is precisely what you need...')}`,
        `${chalk.dim('Integration ripples outward. The next challenge crystallizes...')}`,
        `${chalk.dim('The veil parts once more. A new mirror reflects...')}`,
        `${chalk.dim('The residue of the last encounter lingers. The next catalyst forms...')}`,
        `${chalk.dim('Memory folds into potential. A new edge of growth appears...')}`,
      ];
      console.log(`\n  ${transitions[Math.floor(Math.random() * transitions.length)]}`);
      // U.4: Smooth ora spinner
      const s = ora({ text: 'Preparing encounter...', color: 'cyan' }).start();
      await new Promise(r => setTimeout(r, 300));
      s.succeed('Encounter ready');
    }

    // Run encounter — YAGNI-1 (UX-R3+R4): both DQ and Story now route
    // through the unified executeEncounter dispatch. The routing logic
    // (PersistentAgent vs AgenticOrchestrator) lives in ONE place.
    try {
      const result = await executeEncounter(selectedEncounter, currentSig, currentWorld, history, {
        // `responsesPool` is deliberately NOT passed: the forced-response pool was retired
        // (YAGNI-PHASE-4) and its caller-side local removed. The bare shorthand left here threw
        // `ReferenceError` on every story-mode encounter — and because the dispatch is wrapped in
        // this `try`, the failure was caught and the mode degraded quietly instead of running.
        consecutivePasses,
        orchestration,
      });

      // Apply consequences from the orchestrator result
      const record = result.outcome.consequenceRecord;
      history.push(record);
      currentSig = result.outcome.updatedSig;
      currentWorld = result.outcome.updatedWorld;
      // RuntimeLoop + Phase 11 d1 (G28): persist the FULL runtime checkpoint (feed entries +
      // worker pool + polarity states) with the world save so NPC profiles, the reporting feed,
      // and the dialectic pair map survive the process (22 §7.5 — all serializable by design).
      (currentWorld as { orchestrationCheckpoint?: RuntimeCheckpoint }).orchestrationCheckpoint =
        captureCheckpoint(orchestration);
      // Phase 13 d9b: the sidecar journal — one append-only line per checkpoint, so a crash
      // before the next saveAll still leaves this session recoverable at next boot.
      appendJournalEntry(getMysteriumProfileDir(), (currentWorld as unknown as { orchestrationCheckpoint: RuntimeCheckpoint }).orchestrationCheckpoint);
      void journalPathFor; // path helper re-exported for diagnostics; the journal lives in the profile dir

      // Wave 1.1: Apply the response to the GameLoop's state engines
      // (UserMatrixModel + transformation state) WITHOUT re-applying consequences
      // (the orchestrator already did that). This fixes the stale-state bug where
      // UserMatrixModel was never updated and transformation state ran on stale sig.
      //
      // Phase 3 bugfix: when the PersistentAgent path is active, use the agent's
      // effectiveEncounter (which may differ from the scheduler's pick if the
      // agent called mysterium_select_encounter with a different moduleRef). Using
      if (result.response) {
        const applied = applyResponseOnly(
          currentSig,
          currentWorld,
          sessionState,
          result.response,
          selectedEncounter,
          Date.now(),
        );
        currentSig = applied.sig;
        currentWorld = applied.world;
        sessionState = applied.sessionState;
      }

      // Phase 3 + L4 + L5: Keep the PersistentAgent's sig/world/sessionState fresh
      // across encounters so its tool queries reflect the latest state. Without
      // the sessionState refresh, mysterium_get_encounter_pool always saw
      // encountersSoFar:0 + recentLines:[], skewing scheduler ranking. Without
      // the weightBias, the agent saw a different ranking than the scheduler.          // YAGNI-EFF-3: PersistentAgent state sync removed.


      verbose('narrative', result.narrativeSummary);

      // ── Per-encounter state display (Veil-compliant) ──
      // ponytail: no PASSED/FAILED, no clinical labels, no layer labels.
      // The player sees narrative consequence only.
      if (!JSON_MODE) {
        const cr = result.outcome.consequenceRecord;
        // P1-1 (UX-R3): word-boundary-aware truncation; was slice(0,100)+'...'
        // R5-BUG-5 (UX-R5): Fall back to FallbackNarratives if LLM returned empty.
        const rawNarrative = result.narrativeSummary?.trim() || pickFallbackNarrative();
        const briefNarrative = truncateNarrative(rawNarrative, 1000);
        // R11-P5 (Fresh-User UX Audit): Same echo-detection as DQ path (line ~1700).
        // Suppress ✦ when the "narrative" is just the player's write-in echoed back.
        const userWriteInStory = result.response?.writeInValue?.trim() ?? '';
        const isEchoStory = userWriteInStory.length > 0
          && briefNarrative.trim().toLowerCase() === userWriteInStory.toLowerCase();
        if (isEchoStory) {
          console.log(`\n  ${chalk.dim('· recorded your response ·')}`);
        } else {
          console.log(`\n  ${chalk.dim('✦')} ${briefNarrative}`);
        }

        // R7-P1-2 (UX-R7): Vary the shadow-surfaced footer (Story-Driven path).
        if (cr.shadowSurfaced) {
          const stirredVariants = [
            'Something beneath the surface stirred.',
            'A shadow edge caught the light.',
            'Something unnamed moved in the periphery.',
            'A pattern you haven\'t fully named flickered past.',
          ];
          const idx = (selectedEncounter.id.length + Date.now()) % stirredVariants.length;
          console.log(`  ${chalk.dim(stirredVariants[idx] ?? stirredVariants[0]!)}`);
        }
      }

      if (VERBOSE) {
        // R6-P2-2 (UX-R6): Only print 'feedback' if it differs from 'narrative'.
        // In no-LLM mode they're identical (both use fallback); in LLM mode
        // they should differ. Printing both when identical is wasteful.
        // NF-5: Route through VeilFilter to strip clinical labels + metrics.
        // NF3-2: Use truncateAtWordBoundary instead of raw .slice(0, 200).
        const rawFeedback = result.outcome.feedback ?? '';
        const veiled = filterOutput(rawFeedback).filtered;
        const truncated = truncateAtWordBoundary(veiled, 200);
        if (truncated && truncated !== truncateAtWordBoundary(result.narrativeSummary, 200)) {
          verbose('feedback', truncated);
        }
        verbose('updatedEncounters', String(currentSig.totalEncounters));
      }

      emitEvent('encounter_completed', {
        encounter: selectedEncounter.id,
        modality: selectedEncounter.modality,
        module: selectedEncounter.moduleRef,
        passed: result.outcome.finalResult.passed,
        narrative: result.narrativeSummary,
        totalEncounters: currentSig.totalEncounters,
        // P0-1: Include curriculum fields for downstream analytics
        ...(selectedEncounter.curriculumConceptId ? {
          curriculumConceptId: selectedEncounter.curriculumConceptId,
          curriculumAction: selectedEncounter.curriculumAction,
        } : {}),
      });

      // P0-2 (UX-R3): Honor --dev during Story-Driven sessions.
      emitDevPrimitives(currentSig, `enc:${selectedEncounter.moduleRef}`);

      completedCount++;
      if (result.outcome.finalResult.passed) passedCount++;
      // P1-QW3 (Architecture Audit Phase A): record encounter_completed event.
      // opt-in; no-op when telemetry is disabled.
      recordCLITelemetry(cliTelemetry, 'encounter_completed', { moduleRef: selectedEncounter.moduleRef, line: selectedEncounter.targetLines[0] ?? null, stage: selectedEncounter.stage, passed: result.outcome.finalResult.passed });
    } catch (err: any) {
      error(`Encounter failed: ${err.message || err}`);
      emitEvent('encounter_error', { encounter: selectedEncounter.id, error: err.message });
    }

      // Check transformation
    if (tickResult.transformation) {
      // T-3.4 (Veil compliance): don't leak the target stage name.
      if (!JSON_MODE) console.log(`\n  ${chalk.magenta('⚡ Something rearranges at the foundation.')}`);
      emitEvent('transformation', { targetStage: tickResult.transformation.targetStage, readiness: tickResult.transformation.readiness });
    }

    // M4: When --agent is active, query TDG's graph-level transformation pressure
    // to supplement Mysterium's detectThreshold signal. This is best-effort + async —
    // no-op when TDG is not running. We emit a tdg_pressure telemetry event so
    // the session can track graph-level readiness alongside the Mysterium signal.
    // YAGNI-EFF-3: getTDGTransformationPressure removed.

    // T-3.4: removed the `layers:` prefix + renderLayersCompact leak.
    // Bleed-through is now conveyed narratively through ConsequenceNarrator.

  }

  // Session end — apply theta-decay and persist.
  const sessionEnd = endSession(currentSig, sessionState, now + encounterCount * 5000, currentWorld);

  // P1-14: If endSession advanced macro-event lifecycle, use the updated world.
  if (sessionEnd.world) {
    currentWorld = sessionEnd.world;
  }

  // Save progress to disk (Significator + WorldState).
  // P0-5: Use atomic saveAll() — writes both sig + world to a single JSON
  // envelope via temp-file + rename, so a crash between writes can't leave
  // them out of sync. The individual saveGame()/saveWorldState() calls are
  // still made inside saveAll() for backward compat with older code paths.
  saveAll(sessionEnd.sig, currentWorld);
  if (!JSON_MODE) info('save', `${chalk.green('Progress saved')}`);

  // P1-QW3 (Architecture Audit Phase A): Record session_ended event + flush.
  // The telemetry is opt-in (read from ~/.mysterium/config.json.telemetry).
  // No-op when disabled; never blocks or throws.
  // (cliTelemetry is already instantiated at session start.)
  recordCLITelemetry(cliTelemetry, 'session_ended', { encounterCount, durationMs: Date.now() - sessionStartedAt });
  await flushCLITelemetry(cliTelemetry);

  // (The "agentic-encounter telemetry" flush that stood here referenced a `telemetry` object
  // that no longer exists in this scope, so a story-mode session threw `ReferenceError` at
  // SESSION END — after the player had already played it. `cliTelemetry` is the only collector on
  // this path and is flushed immediately above.)

  banner('SESSION END');

  // No decorative session closure — per-encounter feedback is sufficient.
  // The prior closure block leaked line names, shadow quadrant names, pass/fail
  // counts, and imposed atmospheric vibes that may not resonate universally.
  // The session's felt-sense is carried by the per-encounter qualitative
  // feedback, not by a summary block.

  // T-3.4: removed CCI bar, altitudes chart, shadow/drive displays, and
  // perceptual-layers rendering from session closure — all Veil violations.
  // The session's felt-sense is carried by the qualitative narrative above.

  if (VERBOSE) {
    console.log('\nFinal Significator:');
    printSignificator(sessionEnd.sig);
  }

  // P0-U2 (Fresh-User UX Audit): Integration ritual at session end.
  const integrationResponse2 = await runIntegrationRitual(getActiveProfileName());

  // P0-2 (Fresh-User UX Audit): Connect integration response to practice.
  if (integrationResponse2 && !JSON_MODE) {
    const practiceHint = generatePracticeHint(integrationResponse2, currentSig);
    if (practiceHint) {
      console.log(`\n  ${chalk.dim('═══ Practice ═══')}`);
      console.log(`  ${chalk.italic(practiceHint)}`);
    }
  }

  // P0-R2 (Curriculum Audit): Wire integration response to next-session focus.
  if (integrationResponse2) updateGoalsActiveFocus(integrationResponse2);  // NF-3: Persist the asked-prompts set for cross-session de-duplication.
  saveAskedPrompts(getActiveProfileDir());

  // P2-R9 (Curriculum Audit): Somatic practice after Somatic-line encounters.
  // Story path doesn't have history[], but sessionEnd.sig.recentEncounters has line data.
  if (sessionEnd.sig.recentEncounters.length > 0) {
    const lastEnc = sessionEnd.sig.recentEncounters[sessionEnd.sig.recentEncounters.length - 1]!;
    if (lastEnc.line === 'Somatic' && !JSON_MODE) {
      const somaticHintStory = somaticPracticeHint([{ line: lastEnc.line } as ConsequenceRecord]);
      if (somaticHintStory) {
        console.log(`\n  ${chalk.dim('═══ Body Practice ═══')}`);
        console.log(`  ${chalk.italic(somaticHintStory)}`);
      }
    }
  }

  // P0-3 (Fresh-User UX Audit): Post-session summary.
  renderPostSessionSummary(currentSig, [], AUDIT);

  emitEvent('session_ended', {
    encountersCompleted: completedCount,
    totalEncounters: currentSig.totalEncounters,
    totalSessions: sessionEnd.sig.totalSessions,
    shadowsSurfaced: sessionEnd.summary.shadowsSurfaced,
    shadowsResolved: sessionEnd.summary.shadowsResolved,
    finalStage: sessionEnd.sig.currentStage,
  });
}

// ── Provider registry (dynamic) ────────────────────────────────────
// The static PROVIDERS catalog with hardcoded model lists has been removed.
// Provider profiles now live in src/infra/llm/ProviderRegistry.ts and carry
// only the immutable bits (baseUrl, authStyle, env var name). The model list
// is fetched dynamically from each provider's /models endpoint, with
// models.dev as a fallback catalog. This mirrors opencode's architecture.

/**
 * Verify a provider connection by fetching /models (OpenAI-compat) or
 * sending a minimal /messages request (Anthropic). Returns ok + message.
 * Replaces the previous verifyProviderConnection that hard-coded per-provider logic.
 */
