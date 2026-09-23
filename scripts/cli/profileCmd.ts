import * as fs from 'fs';
import chalk from 'chalk';
import { CONFIG_DIR, CONFIG_FILE, loadConfig } from './config.js';
import { resolveConfig } from '../../src/infra/llm/ProviderRegistry.js';
import { DEV_MODE, JSON_MODE, LLM_ACTIVE, apiKey, baseUrl, model, provider } from './flags.js';
import { banner, info, success, warn, error } from './output.js';
import { stageColor, truncateAtWordBoundary, saturationToFeltSense, readinessToFeltSense } from './render.js';
/** The runner's display version — one string, stated here for the `status` report. */
const VERSION = '0.1.0';

/** The provider identity, resolved lazily for the status report (the entry resolves its own). */
const resolvedLLM = resolveConfig({}, loadConfig());

import { bootRegistries } from '../../src/core/registries/boot.js';
import { bootModuleRegistry } from '../../src/core/assessments/bootModules.js';
import { type Line } from '../../src/core/domain/Line.js';
import { ALL_LINES } from '../../src/core/domain/Line.js';
import { ALL_STAGES, stageOrdinal } from '../../src/core/domain/Stage.js';
import { type TelemetryEvent } from '../../src/core/telemetry/TelemetryEvent.js';
import { withdrawDeclaredPreference } from '../../src/core/domain/IdentityProfile.js';
import { loadSave, saveGame, hasSave } from '../../src/infra/persistence/SaveRepository.js';
import { withdrawIdentityField, IDENTITY_FIELDS, type IdentityField } from '../../src/core/domain/IdentityProfile.js';
import { buildCLITelemetry, flushCLITelemetry } from '../../src/cli/CLITelemetry.js';
import { describePersonalResonance } from '../../src/core/presentation/veilDescriptors.js';
import { GLOSSARY_TERMS, PLAYER_GLOSSARY_TERMS, ADVANCED_GLOSSARY_TERMS, TIER2_GLOSSARY_TERMS } from '../../src/core/data/glossary.js';
import { getLineProgress, computeReadiness } from '../../src/core/engines/TransformationDetector.js';
import { listProfiles, createProfile, setActiveProfile, deleteProfile, loadProfile, getActiveProfileName, getActiveProfileDir, migrateLegacySave, loadUnlockedTerms } from '../../src/infra/profiles/ProfileManager.js';
import { toSnapshot } from '../../src/core/domain/SignificatorSnapshot.js';
import { computeCCI } from '../../src/core/engines/CCIEngine.js';
import { extractMdSectionBullets } from './support.js';





// @script-status: wired — imported by cli-game.ts, which `npm run cli` runs.
/**
 * Read-only subcommands: `profile`, `status`, `glossary`, `events`, `privacy`.
 *
 * Stage D, leaf 3 (module-cohesion audit item 1). The commands that ANSWER rather than mutate a
 * session: profile administration, the system-status report, the glossary, the telemetry event log
 * and the privacy surface. They read the flags owner and the support leaf; nothing here writes a
 * save file — the one exception (`runProfile`'s set-active) is a metadata write, not gameplay.
 */

export async function runProfile(action?: string, profileName?: string): Promise<void> {

  if (!action || action === 'list') {
    const profiles = listProfiles();
    const active = getActiveProfileName();
    if (profiles.length === 0) {
      console.log(`\n  ${chalk.dim('No profiles found. Run `mysterium setup-profile` to create one.')}`);
      // Try migration
      const migrated = migrateLegacySave();
      if (migrated) {
        console.log(`  ${chalk.green('✓')} Migrated existing save to profile "${migrated}".`);
      }
    } else {
      console.log(`\n  ${chalk.bold('Profiles:')}`);
      for (const p of profiles) {
        const marker = p === active ? chalk.green(' ← active') : '';
        console.log(`    ${chalk.cyan(p)}${marker}`);
      }
    }
    console.log('');
    return;
  }

  if (action === 'switch') {
    if (!profileName) { error('Usage: mysterium profile switch <name>'); return; }
    try {
      setActiveProfile(profileName);
      console.log(`\n  ${chalk.green('✓')} Switched to profile "${profileName}".\n`);
    } catch (err: any) {
      error(err.message);
    }
    return;
  }

  if (action === 'create') {
    if (!profileName) { error('Usage: mysterium profile create <name>'); return; }
    try {
      createProfile(profileName);
      console.log(`\n  ${chalk.green('✓')} Created profile "${profileName}" and set as active.\n`);
    } catch (err: any) {
      error(err.message);
    }
    return;
  }

  if (action === 'delete') {
    if (!profileName) { error('Usage: mysterium profile delete <name>'); return; }
    try {
      deleteProfile(profileName);
      console.log(`\n  ${chalk.yellow('↻')} Deleted profile "${profileName}".\n`);
    } catch (err: any) {
      error(err.message);
    }
    return;
  }

  // P0-F3 (Fresh-User UX Audit): `profile show` — surface the synthesized
  // insights, patterns, and active focus that the post-session synthesis
  // (synthesizeSessionInsights) writes to narrative-memory.md and goals.yaml.
  // P0-R1 (Fresh-User UX Audit v2): Rewritten as a NARRATIVE LETTER format.
  // The previous version used categorized bullet lists (Surfacing Patterns,
  // Integrated Patterns, Active Focus) that read like a therapist's chart
  // despite Veil-compliant language. The audit subagent said: "Integrated
  // Patterns list reads like a therapist's chart: A rejection of a lower
  // capacity that still has something to offer × 14 entries — Veil feels
  // violated." The new format weaves the same data into a reflective letter
  // that honors the contemplative voice.
  if (action === 'show') {
    const targetName = profileName ?? getActiveProfileName();
    if (!targetName) {
      // NF-7 (Fresh-User Re-Audit): The old message told users to run
      // `mysterium setup-profile`, but that command requires interactive mode
      // and fails in headless. The game auto-creates a profile on the first
      // session anyway. The honest message: play a session first.
      error('No active profile yet. Play a session (mysterium session) and one will be created automatically. To customize your profile name and pronouns interactively, run `mysterium setup-profile` in a real terminal.');
      return;
    }
    const profile = loadProfile(targetName);
    if (!profile) {
      error(`Profile "${targetName}" not found. Run \`mysterium profile list\` to see options.`);
      return;
    }

    banner(`Profile: ${targetName}`);

    const id = profile.identity || {};
    const goals = profile.goals || {};

    // P0-R1: Narrative letter format. Instead of categorized bullet lists,
    // weave the same data into a flowing reflective letter. The letter has:
    //   1. Opening (greeting + stage/sessions context in natural language)
    //   2. Body (active focus + patterns + insights woven into prose)
    //   3. Closing (an invitation, not a label)
    // The clinical data (shadow quadrants, drive scores) stays in the
    // Significator for the engine to use; the player sees only the letter.

    // ── Letter Opening ──
    const stageName = id.current_stage || 'Red';
    const sessionCount = id.total_sessions ?? 0;
    const encounterCount = id.total_encounters ?? 0;
    const lifecycle = id.lifecycle || 'Onboarding';

    console.log(`\n  ${chalk.dim('═══ A letter to you ═══')}`);
    console.log(`\n  ${chalk.italic('Dear player,')}`);

    // Opening paragraph: context in natural language
    const sessionWord = sessionCount === 1 ? 'session' : 'sessions';
    const encounterWord = encounterCount === 1 ? 'encounter' : 'encounters';
    const openingLines = [
      `You have been with me for ${sessionCount} ${sessionWord}, across ${encounterCount} ${encounterWord}. You are currently at the ${stageColor(stageName)(stageName)} stage of the journey — ${lifecycle.toLowerCase()}.`,
      `I have been holding ${sessionCount} ${sessionWord} of your reflections — ${encounterCount} ${encounterWord} where you showed up and let something be seen. You are at ${stageColor(stageName)(stageName)} right now, and the work continues.`,
      `We have sat together ${sessionCount} times now. ${encounterCount} ${encounterWord} have passed between us. You are at the ${stageColor(stageName)(stageName)} stage — and there is more here than metrics can hold.`,
    ];
    console.log(`\n  ${chalk.dim(openingLines[Math.floor(Math.random() * openingLines.length)])}`);

    // ── Active Focus as prose, not a labeled field ──
    const rawFocus = goals.active_focus;
    const focusStr = (typeof rawFocus === 'string')
      ? rawFocus
      : (rawFocus && typeof rawFocus === 'object' && Object.keys(rawFocus).length === 0)
        ? ''
        : String(rawFocus ?? '');

    if (focusStr.trim()) {
      console.log(`\n  ${chalk.italic(focusStr)}`);
      // Subtle timestamp (not a "last updated:" clinical label)
      const rawSynthTime = goals.last_synthesis_session;
      const synthStr = (typeof rawSynthTime === 'string')
        ? rawSynthTime
        : (rawSynthTime && typeof rawSynthTime === 'object' && Object.keys(rawSynthTime).length === 0)
          ? ''
          : String(rawSynthTime ?? '');
      if (synthStr.trim()) {
        const isFallback = synthStr.includes('(fallback)');
        const timePart = synthStr.replace(/\s*\(fallback\)\s*$/, '').trim().replace(/^"|"$/g, '');
        const dateStr = timePart ? new Date(timePart).toLocaleString() : '';
        if (dateStr) {
          const suffix = isFallback ? chalk.yellow(' (still forming)') : '';
          console.log(`  ${chalk.dim(`— noticed ${dateStr}`)}${suffix}`);
        }
      }
    }

    // ── Narrative memory: weave insights + patterns into prose ──
    const mem = profile.narrativeMemory || '';
    if (mem.trim().length > 50) {
      const insights = extractMdSectionBullets(mem, 'Key Insights');
      const patterns = extractMdSectionBullets(mem, 'Patterns');
      const activeWork = extractMdSectionBullets(mem, 'Active Work');

      // Weave insights into a prose paragraph
      if (insights.length > 0) {
        console.log(`\n  ${chalk.dim('Some things have landed:')}`);
        // Take up to 3 insights and weave them into prose
        const topInsights = insights.slice(0, 3);
        for (const insight of topInsights) {
          // Strip the **label**: prefix if present, keep the text
          const cleanText = insight.replace(/^\*\*[^*]+\*\*:\s*/, '');
          console.log(`  ${chalk.dim('—')} ${chalk(cleanText)}`);
        }
      }

      // Weave patterns into a prose reflection
      if (patterns.length > 0) {
        console.log(`\n  ${chalk.dim('I have noticed some things returning:')}`);
        const topPatterns = patterns.slice(0, 3);
        for (const pattern of topPatterns) {
          const cleanText = pattern.replace(/^\*\*[^*]+\*\*:\s*/, '');
          console.log(`  ${chalk.dim('—')} ${chalk(cleanText)}`);
        }
      }

      // Active work as a gentle naming
      if (activeWork.length > 0) {
        console.log(`\n  ${chalk.dim('Something is being worked on:')}`);
        for (const work of activeWork.slice(0, 2)) {
          const cleanText = work.replace(/^\*\*[^*]+\*\*:\s*/, '');
          console.log(`  ${chalk.dim('—')} ${chalk.italic(cleanText)}`);
        }
      }
    }

    // ── Shadow ledger: woven into prose, NOT categorized bullet lists ──
    // P0-R1: The previous version had "Surfacing Patterns" and "Integrated
    // Patterns" as separate bullet lists with movement descriptions. The
    // audit found this reads like a therapist's chart. Now we weave the
    // same data into 1-2 prose sentences that acknowledge the movement
    // without categorizing it into lists.
    const shadows = profile.shadowLedger?.shadows ?? [];
    if (shadows.length > 0) {
      const surfacing = shadows.filter((s: any) => s.status !== 'integrated');
      const integrated = shadows.filter((s: any) => s.status === 'integrated') as ReadonlyArray<{ line?: string }>;

      if (surfacing.length > 0) {
        // Group by line for a more cohesive narrative
        const byLine: Record<string, number> = {};
        for (const s of surfacing) {
          const line = (s as any).line || 'an unnamed dimension';
          byLine[line] = (byLine[line] || 0) + 1;
        }
        const lineEntries = Object.entries(byLine);
        if (lineEntries.length === 1) {
          const [line, count] = lineEntries[0]!;
          const edgeWord = count === 1 ? 'an edge' : 'edges';
          console.log(`\n  ${chalk.dim(`There is ${edgeWord} in the ${line.toLowerCase()} dimension that keeps showing up. Something there wants to be met.`)}`);
        } else {
          const lines = lineEntries.map(([line, count]) => `${line.toLowerCase()} (${count})`).join(', ');
          console.log(`\n  ${chalk.dim(`There are edges showing up across several dimensions: ${lines}. Something in each wants to be met.`)}`);
        }
      }

      if (integrated.length > 0) {
        const count = integrated.length;
        const lineNames = [...new Set(
          integrated.map((s) => s.line).filter((l): l is string => Boolean(l)),
        )];
        if (lineNames.length === 1) {
          console.log(`  ${chalk.green.dim(`Something in the ${lineNames[0]!.toLowerCase()} dimension has shifted — a movement that was once surfacing has found its way through.`)}`);
        } else {
          console.log(`  ${chalk.green.dim(`${count} movements have found their way through — things that were once surfacing have settled in ${lineNames.length} dimensions.`)}`);
        }
      }
    }

    // ── Self-declared goals woven in naturally ──
    if (Array.isArray(goals.self_declared) && goals.self_declared.length > 0) {
      console.log(`\n  ${chalk.dim('You told me you wanted:')}`);
      for (const g of goals.self_declared) {
        console.log(`  ${chalk.dim('—')} ${chalk(g)}`);
      }
    }

    // ── Recent sessions as a gentle arc, not a log ──
    const sessions = profile.sessionHistory?.sessions ?? [];
    if (sessions.length > 0) {
      console.log(`\n  ${chalk.dim('Lately, you have been sitting with:')}`);
      for (const s of sessions.slice(-3)) {
        const ss: any = s;
        const raw = ss.key_shift || ss.theme || '';
        if (raw) {
          const truncated = truncateAtWordBoundary(raw, 180);
          console.log(`  ${chalk.dim('—')} ${chalk.italic(truncated)}`);
        }
      }
    }

    // ── Letter Closing ──
    const closings = [
      `Something wants to shift. The next session will find you where you are.`,
      `There is more here, and it will keep unfolding. The next session will meet you where you are.`,
      `Take your time. The work is not going anywhere, and neither is the invitation.`,
      `Something is moving beneath the surface. The next session will find it.`,
    ];
    console.log(`\n  ${chalk.italic.cyan(closings[Math.floor(Math.random() * closings.length)])}`);
    console.log(`\n  ${chalk.dim('— the game')}`);

    // ── Last active timestamp (subtle, at the bottom) ──
    if (id.last_active) {
      console.log(`\n  ${chalk.dim(`(last active: ${new Date(id.last_active as string).toLocaleString()})`)}`);
    }

    console.log('');
    return;
  }

  error(`Unknown profile action: ${action}. Valid: list, switch, create, delete, show`);
}

/**
 * Extract bullet lines from a named markdown section in narrative-memory.md.
 * Sections look like: `## Key Insights\n- **Session 1:** text\n- **...:** text\n\n## Next Section`
 * Returns the bullet text (without the leading `- ` and without the `## ` header).
 */

export async function runStatus(): Promise<void> {
  // P0-3 (UX-R3): JSON-mode branch. Previously `status --json` produced
  // broken output — section headers appeared but content was stripped
  // because the pretty-print helpers (info(), banner()) suppress themselves
  // in JSON mode, while console.log() for headers did not. This made the
  // CLI unscriptable. Now we emit a single structured JSON object.

  bootRegistries();
  const moduleRegistry = bootModuleRegistry();
  (globalThis as any).__moduleRegistry = moduleRegistry;

  // P1-3 (UX-R3): Mirror the session-entry threshold tuning so status
  // PILOT-5.5: No-LLM threshold lowering removed — game requires LLM.
  // Threshold is always 20 (the LLM-calibrated value).

  if (JSON_MODE) {
    const sig = hasSave() ? loadSave() : null;
    // Veil compliance: the JSON output respects the same Veil as the
    // pretty-print path — qualitative aesthetic + milestone, not raw
    // clinical state. Stage names and trace counts are exposed because
    // they are already user-visible in the pretty-print table.
    // R11-R2: stageAesthetics map removed — use describeStage from veilDescriptors.
    const stageAestheticsShort: Record<string, string> = {
      Infrared: 'primal', Magenta: 'symbolic', Red: 'power', Amber: 'order',
      Orange: 'reason', Green: 'harmony', Teal: 'vision', Turquoise: 'unity',
    };
    const out: any = {
      type: 'status',
      version: VERSION,
      node: process.version,
      config: {
        configDir: CONFIG_DIR,
        hasConfigFile: fs.existsSync(CONFIG_FILE),
        // P1-F5: resolved runtime config (env vars + config file + CLI flags),
        // not just the saved config file. Matches the pretty-print path.
        provider,
        providerName: resolvedLLM.providerName,
        endpoint: baseUrl,
        model,
        llmActive: LLM_ACTIVE,
        hasApiKey: !!(apiKey && apiKey !== 'sk-placeholder'),
        apiKeyPrefix: (apiKey && apiKey !== 'sk-placeholder') ? apiKey.slice(0, 8) + '...' : null,
      },
      system: {
        modulesLoaded: moduleRegistry.count(),
        holons: 36, // matches diagnostic; kept stable for scriptability
      },
    };
    if (sig) {
      // R11-R2: use describePersonalResonance for player-responsive resonance.
      const aesthetic = describePersonalResonance(sig);
      const milestone = sig.totalEncounters === 0
        ? 'Your path is yet to begin.'
        : sig.totalEncounters < 10
          ? 'You have tasted the first edges.'
          : sig.totalEncounters < 30
            ? 'Your path deepens with each step.'
            : 'The shape of your journey grows clear.';
      out.save = {
        playerId: sig.id,
        currentStage: sig.currentStage,
        stageAesthetic: aesthetic,
        resonance: `The world feels ${aesthetic}.`,
        journeyMilestone: milestone,
        totalEncounters: sig.totalEncounters,
        totalSessions: sig.totalSessions,
        shadowsActive: sig.shadows.activeCount,
        lines: ALL_LINES.map((line) => {
          const stage = sig.altitudes[line] ?? 'Red';
          const cellKey = `${line}:${stage}`;
          const traces = sig.polarity.cells[cellKey]?.traceCount ?? 0;
          return {
            line,
            stage,
            stageAesthetic: stageAestheticsShort[stage] ?? 'power',
            encounters: traces,
          };
        }),
      };
      if (DEV_MODE) {
        const snapshot = toSnapshot(sig);
        const cci = computeCCI(snapshot);
        const mh = cci.metabolicHealth;
        out.dev = {
          cci: cci.composite,
          gz: mh?.gz ?? null,
          pz: mh?.pz ?? null,
          metabolicTotal: mh?.total ?? null,
          interpretation: mh?.interpretation ?? null,
          transformationPhase: sig.transformationPhase ?? 'idle',
          rayProfile: sig.rayProfile,
          transformationTargetStage: sig.transformationTargetStage ?? null,
          sessionsInPhase: sig.transformationSessionsInPhase ?? 0,
          knotsResolved: sig.transformationKnotsResolved ?? 0,
          internalizedHolons: sig.internalizedHolons?.length ?? 0,
          greatWayDirection: sig.greatWayDirection ?? null,
        };
        // P0-R1 follow-up: Include curriculum data in JSON status output.
        try {
          if (sig.knowledge && sig.knowledge.conceptStates.size > 0) {
            const conceptCount = sig.knowledge.conceptStates.size;
            const conceptStates = [...sig.knowledge.conceptStates.values()];
            const avgRetention = conceptStates.reduce((sum, cs) => sum + cs.retention, 0) / conceptCount;
            out.save!.curriculum = {
              conceptsStudied: conceptCount,
              avgRetention: Math.round(avgRetention * 100) / 100,
            };
          }
        } catch { /* best-effort */ }
      }
      // R5-P2-2 (UX-R5): Add Transformation Readiness to status --json so
      // JSON consumers (scripts, CI, dashboards) can see the trajectory.
      // Previously this was only in the human-readable path.
      try {
        const currentOrd = stageOrdinal(sig.currentStage);
        if (currentOrd < ALL_STAGES.length - 1) {
          const targetStage = ALL_STAGES[currentOrd + 1]!;
          const report = computeReadiness(sig, targetStage);
          out.transformationReadiness = {
            currentStage: sig.currentStage,
            targetStage,
            readiness: report.overall,
            threshold: 0.8,
            convergence: report.convergence,
            saturation: report.saturation,
            shadowClearance: report.shadowClearance,
          };
        }
      } catch {
        // Best-effort — don't let readiness computation break JSON.
      }
    } else {
      out.save = null;
    }
    process.stdout.write(JSON.stringify(out) + '\n');
    return;
  }

  banner('Mysterium Status');
  console.log(`\n  ${chalk.bold('Configuration')}`);
  info('config', fs.existsSync(CONFIG_FILE) ? CONFIG_FILE : '(no config file — using env vars)');
  // P1-F5 (Fresh-User UX Audit): Show the RESOLVED runtime LLM config, not
  // the stale saved config file. Before this fix, `status` reported
  // 'provider: gemini (default)' and 'api key: not set' even when the LLM
  // was clearly active via env vars (OPENCODE_API_KEY + MODEL) — because it
  // read from the saved config file, which was empty. The `diagnostic`
  // command correctly showed 'LLM: active' because it used the resolved
  // config. This inconsistency made users think nothing was configured.
  // Now both commands use the resolved runtime config.
  info('provider', `${provider} (${resolvedLLM.providerName})`);
  info('endpoint', baseUrl);
  info('model', model);
  info('api key', apiKey && apiKey !== 'sk-placeholder' ? `${apiKey.slice(0, 8)}...` : 'not set');
  info('llm active', LLM_ACTIVE ? `${chalk.green('yes')}` : `${chalk.red('no')}`);

  console.log(`\n  ${chalk.bold('Game State')}`);
  if (hasSave()) {
    const sig = loadSave();
    if (sig) {
      // T-3.4 (Veil compliance): show only player id + qualitative state.
      // No stage name, no encounter count, no altitudes chart, no shadow/drive displays.
      info('player', sig.id);

      // R11-R2: use describePersonalResonance for player-responsive resonance.
      // The resonance now changes based on the player's shadow patterns and
      // drive imbalances, not just their stage label.
      const aesthetic = describePersonalResonance(sig);
      info('resonance', `The world feels ${aesthetic}. ${chalk.dim('(the poetic texture of your current stage)')}`);

      // Qualitative encounter milestone
      const milestone = sig.totalEncounters === 0
        ? 'Your path is yet to begin.'
        : sig.totalEncounters < 10
          ? 'You have tasted the first edges.'
          : sig.totalEncounters < 30
            ? 'Your path deepens with each step.'
            : 'The shape of your journey grows clear.';
      info('journey', milestone);
      info('encounters', `${sig.totalEncounters} completed across ${sig.totalSessions} session(s)`);

      // UX-P2-1: Show per-line progress as a Veil-compliant qualitative display.
      // Previously status showed only flavor text — no visible progression.
      // Now the user can see which lines they've explored and a sense of depth.
      // P2-Y5 (Fresh-User UX Audit v2): Cut the per-line stage bars (RPG
      // character-sheet frame). Replace with a single 'current edge' line
      // that names the line the player has been working on most. The per-line
      // data remains in the Significator for the engine; the player sees a
      // qualitative pointer to their current edge.
      const progressAll = getLineProgress(sig);
      // Find the line with the highest progress (the player's current edge)
      let edgeLine: Line | null = null;
      let edgeRatio = 0;
      for (const line of ALL_LINES) {
        const stage = sig.altitudes[line] ?? 'Red';
        const cellKey = `${line}:${stage}`;
        const traces = sig.polarity.cells[cellKey]?.traceCount ?? 0;
        const prog = progressAll.find(p => p.line === line);
        const ratio = prog?.ratio ?? 0;
        if (traces > 0 && ratio > edgeRatio) {
          edgeRatio = ratio;
          edgeLine = line;
        }
      }
      if (edgeLine) {
        const satBand = saturationToFeltSense(edgeRatio);
        console.log(`\n  ${chalk.bold('Current Edge')}`);
        console.log(`  ${chalk.dim('You have been sitting with the')}`);
        console.log(`  ${chalk.cyan(edgeLine.toLowerCase())} ${chalk.dim('dimension —')} ${chalk.italic(satBand)}`);
      } else {
        console.log(`\n  ${chalk.bold('Current Edge')}`);
        console.log(`  ${chalk.dim('The work is still opening. Play a session to find your edge.')}`);
      }

      // R4-P2-1 (UX-R4): Transformation Readiness indicator. Shows the user
      // their trajectory toward the next stage transition — closing Loop 3's
      // visibility gap. Previously, a fresh user could play 8 encounters and
      // see only "1/20" per line with no sense of what 1/20 meant or where it
      // was going. Now they see the composite readiness + what's blocking.
      // P1-R2 (Fresh-User UX Audit v2): De-quantified. Replaced percentages
      // and progress bars with qualitative felt-sense language. The numeric
      // data is available via --dev for engineers.
      // Veil-compliant: structural progress, not clinical state.
      try {
        const currentOrd = stageOrdinal(sig.currentStage);
        if (currentOrd < ALL_STAGES.length - 1) {
          const targetStage = ALL_STAGES[currentOrd + 1]!;
          const report = computeReadiness(sig, targetStage);
          console.log(`\n  ${chalk.bold('Trajectory')}`);
          const readinessBand = readinessToFeltSense(report.overall);
          if (DEV_MODE) {
            info('readiness', `${(report.overall * 100).toFixed(0)}% — ${readinessBand}`);
          } else {
            info('trajectory', readinessBand);
          }
          // Qualitative dimension descriptions
          const convergenceBand = saturationToFeltSense(report.convergence);
          const saturationBand = saturationToFeltSense(report.saturation);
          console.log(`    ${chalk.dim(`lines explored: ${convergenceBand}`)}`);
          console.log(`    ${chalk.dim(`depth at current stage: ${saturationBand}`)}`);
          // R11-P2 (Fresh-User UX Audit): Suppress the misleading "100% cleared"
          // report when no shadows have actually been detected. Without U3
          // (LLM-based shadow detection), shadows.entries is typically empty,
          // which the engine reads as "no blocking shadows" — but the player
          // reads as "my shadows are resolved." Make the absence visible.
          //
          // R11-Phase2 update: Now that the LLM fix (U1) is in place, shadow
          // detection actually fires. Distinguish three states:
          // 1. No shadows detected at all → "not yet engaged"
          // 2. Shadows detected but none critical (severity < 0.7) → "X patterns surfaced (working through)"
          // 3. Critical shadows blocking → original bar display
          const totalShadows = sig.shadows.entries.length;
          const unresolvedShadows = sig.shadows.entries.filter(e => e.resolvedAt === null).length;
          const shadowsDetected = totalShadows > 0; // NF3-9: define shadowsDetected (was undefined, causing the Focus hint to throw)
          if (unresolvedShadows === 0 && totalShadows === 0) {
            console.log(`    ${chalk.dim('shadows: not yet engaged (detection requires more encounters)')}`);
          } else if (unresolvedShadows === 0) {
            console.log(`    ${chalk.dim(`shadows: all ${totalShadows} pattern${totalShadows === 1 ? '' : 's'} resolved`)}`);
          } else if (report.shadowClearance >= 1) {
            console.log(`    ${chalk.dim(`shadows: ${unresolvedShadows} pattern${unresolvedShadows === 1 ? '' : 's'} surfaced, working through`)}`);
          } else {
            console.log(`    ${chalk.dim('shadows: critical patterns resolving')}`);
          }
          // Actionable hint based on the weakest dimension
          // R11-P2: only include shadow clearance in the focus hint if shadows
          // have actually been detected. Otherwise the hint would recommend
          // shadow-work to a player who has no detected shadows, which is
          // confusing.
          const dims = [
            { name: 'convergence', val: report.convergence, hint: 'Play encounters across more lines' },
            { name: 'saturation', val: report.saturation, hint: 'Play more encounters at your current stage' },
            ...(shadowsDetected
              ? [{ name: 'shadow clearance', val: report.shadowClearance, hint: 'Engage with shadow-work encounters' }]
              : []),
          ].sort((a, b) => a.val - b.val);
          if (report.overall < 0.8) {
            console.log(`    ${chalk.dim(`Focus: ${dims[0]!.hint}`)}`);
          } else {
            console.log(`    ${chalk.green('✓ The threshold is here — transformation may fire this session')}`);
          }
          // NF3-9 (Fresh-User Audit 3): Tell the player what transforming will
          // feel like. The audit found: 'The Transformation Readiness block
          // tells me the threshold (80%) but not what crossing it will feel
          // like or unlock. At 11% saturation after 4 sessions, I'd need ~36
          // more sessions to transform — a massive investment with no
          // emotional pull toward the work.' This line gives the pull.
          console.log(`    ${chalk.dim(`When you transform ${sig.currentStage} → ${targetStage}: the resonance will shift, new encounter types will unlock, and the work will deepen.`)}`);
        } else {
          console.log(`\n  ${chalk.bold('Trajectory')}`);
          info('stage', `${sig.currentStage} (maximum — no further transitions)`);
        }
      } catch {
        // Best-effort — don't let readiness computation break status.
      }

      // Wave 3.1: Dev-mode holistic primitives
      if (DEV_MODE) {
        console.log(`\n  ${chalk.bold('Holistic Primitives (dev mode)')}`);
        const snapshot = toSnapshot(sig);
        const cci = computeCCI(snapshot);
        info('G_z', cci.metabolicHealth?.gz.toFixed(4) ?? 'n/a');
        info('P_z', cci.metabolicHealth?.pz.toFixed(4) ?? 'n/a');
        info('total', cci.metabolicHealth?.total.toFixed(4) ?? 'n/a');
        info('interpretation', cci.metabolicHealth?.interpretation ?? 'n/a');
        info('transformationPhase', sig.transformationPhase ?? 'idle');
        info('rayProfile', JSON.stringify(sig.rayProfile));
        if (sig.transformationTargetStage) info('targetStage', sig.transformationTargetStage);
        info('sessionsInPhase', String(sig.transformationSessionsInPhase ?? 0));
        info('knotsResolved', String(sig.transformationKnotsResolved ?? 0));
        info('internalizedHolons', String(sig.internalizedHolons?.length ?? 0));
        info('greatWayDirection', sig.greatWayDirection ?? 'null');
        // Ponytail gap: expose indigoRayAccessibility in dev mode
        const indigoAccess = (sig.rayProfile.Green + sig.rayProfile.Blue + sig.rayProfile.Indigo) / 3;
        info('indigoRayAccess', indigoAccess.toFixed(4));
      }
    }
  } else {
    info('save', `${chalk.yellow('no saved game')} — run ${chalk.bold('mysterium session')} to start`);
    // P2-Y5 (Fresh-User UX Audit v2): The pre-play status previously showed
    // the full 8-line table with stage bars and '0 encounters' counts — an
    // RPG character-sheet frame that violates the Veil. Replaced with a
    // single qualitative invitation that matches the post-play format.
    console.log(`\n  ${chalk.bold('Current Edge')}`);
    console.log(`  ${chalk.dim('The work is still opening. Play a session to find your edge.')}`);
  }

  // P0-R1 (Curriculum Architecture Audit): Surface curriculum progress in status.
  {
    const _sig = hasSave() ? loadSave() : null;
    if (_sig && _sig.knowledge && _sig.knowledge.conceptStates.size > 0) {
      const conceptCount = _sig.knowledge.conceptStates.size;
      const avgRetention = [..._sig.knowledge.conceptStates.values()]
        .reduce((sum, cs) => sum + cs.retention, 0) / conceptCount;
      const retentionDesc = avgRetention > 0.7 ? 'well-held'
        : avgRetention > 0.4 ? 'developing'
        : 'fading';
      console.log(`\n  ${chalk.bold('Knowledge')}`);
      info('concepts', `${conceptCount} studied, ${retentionDesc}`);
    }
  }

  console.log(`\n  ${chalk.bold('System')}`);
  info('modules', `${moduleRegistry.count()} loaded`);
  info('config dir', CONFIG_DIR);
  info('node', process.version);
  info('version', VERSION);
}

// ── Glossary command (P2-2 / UX-R3) ───────────────────────────────────
// The fresh-user audit found a severe vocabulary wall. Terms like Holon,
// Significator, CCI, rayProfile, G_z/P_z appeared in CLI output with no
// explanation. Users felt like outsiders. The glossary command prints
// 1-line definitions for every term, breaching the wall without requiring
// users to read the docs. The Veil is preserved — these are system-facing
// terms, not player-facing diagnoses.
//
// R11-Y3 (Fresh-User UX Audit): The 23-term dump was experienced by fresh
// users as "walking into a graduate seminar 6 months late." Now shows only
// the Tier 1 essentials (Line, Stage, Shadow) + any Tier 2 terms the player
// has unlocked by encountering them in play.
// P2-U5 (Fresh-User UX Re-Audit): Progressive vocabulary unlock. The --full
// flag now requires --dev (it exposes clinical definitions). Default view
// shows Tier 1 + unlocked Tier 2 terms only.

export function runGlossary(showFull = false): void {
  // P2-U5: --full requires --dev (clinical definitions are engineering vocabulary)
  if (showFull && !DEV_MODE) {
    banner('Mysterium Glossary');
    console.log(`\n  ${chalk.yellow('⚠ --full requires --dev')}: the full glossary contains clinical definitions (CCI bands, G_z/P_z, shadow quadrants) that break the contemplative frame. Use --dev --full for engineering access.`);
    console.log(`\n  ${chalk.dim('Showing player-facing terms instead:')}\n`);
    showFull = false;
  }

  banner(showFull ? 'Mysterium Glossary (full — dev mode)' : 'Mysterium Glossary');

  // P2-U5: Load unlocked terms from profile
  const profileDir = getActiveProfileDir();
  const unlockedTerms = loadUnlockedTerms(profileDir);

  if (JSON_MODE) {
    // JSON consumers (WebUI, agents) always get the full set + unlock status.
    process.stdout.write(JSON.stringify({
      type: 'glossary',
      terms: GLOSSARY_TERMS,
      playerTerms: PLAYER_GLOSSARY_TERMS,
      tier2Terms: TIER2_GLOSSARY_TERMS,
      advancedTerms: ADVANCED_GLOSSARY_TERMS,
      unlockedTerms,
    }) + '\n');
    return;
  }

  if (showFull) {
    // --dev --full: show everything
    console.log('');
    for (const { term, def } of GLOSSARY_TERMS) {
      console.log(`  ${chalk.bold.cyan(term.padEnd(16))} ${chalk.dim(def)}`);
    }
    console.log(`\n  ${chalk.dim(`— ${GLOSSARY_TERMS.length} terms (dev mode). —`)}\n`);
    return;
  }

  // Default: Tier 1 (always available) + unlocked Tier 2 terms
  console.log('');
  console.log(`  ${chalk.dim('— Always available —')}`);
  for (const { term, def } of PLAYER_GLOSSARY_TERMS) {
    console.log(`  ${chalk.bold.cyan(term.padEnd(16))} ${chalk.dim(def)}`);
  }

  // Show unlocked Tier 2 terms
  const unlockedTier2 = TIER2_GLOSSARY_TERMS.filter(t => unlockedTerms.includes(t.term));
  if (unlockedTier2.length > 0) {
    console.log(`\n  ${chalk.dim('— Unlocked through play —')}`);
    for (const { term, def } of unlockedTier2) {
      console.log(`  ${chalk.bold.cyan(term.padEnd(16))} ${chalk.dim(def)}`);
    }
  }

  const lockedCount = TIER2_GLOSSARY_TERMS.length - unlockedTier2.length;
  if (lockedCount > 0) {
    console.log(`\n  ${chalk.dim(`— ${lockedCount} term${lockedCount === 1 ? '' : 's'} still locked. Play more sessions to unlock them. —`)}`);
  } else if (unlockedTier2.length > 0) {
    console.log(`\n  ${chalk.green.dim('— All player terms unlocked. —')}`);
  }
  console.log('');
}

// ── Curriculum management ─────────────────────────────────────────
// P1-C3 (Architecture Audit Phase C): runCurriculum extracted to
// scripts/CurriculumCommands.ts as part of the cli-game.ts modular split.

// P1-QW3 (Architecture Audit Phase A): CLI telemetry inspector.
// Reads the persisted telemetry events from the active profile directory and
// shows the most recent N (default 20). Opt-in only: if telemetry was never
// enabled the KV key is absent and we report that explicitly.

export async function runEvents(args: string[]): Promise<void> {
  banner('Telemetry Events');
  let tail = 20;
  for (const a of args) {
    const m = a.match(/^--tail=(\d+)$/);
    if (m) tail = Math.max(1, parseInt(m[1]!, 10));
  }
  const telemetry = await buildCLITelemetry().catch(() => null);
  if (!telemetry) {
    console.log(`\n  ${chalk.dim('Telemetry is disabled. Enable via ~/.mysterium/config.json: { "telemetry": true }')}`);
    console.log(`  ${chalk.dim('No data is recorded unless you opt in.')}`);
    return;
  }
  // Force the collector to drain to store by flushing.
  await flushCLITelemetry(telemetry);
  // FIX-A3 (Audit): Load persisted events from the store, not just the
  // in-memory collector. Each CLI invocation gets a fresh collector; without
  // loading the store, events from prior sessions are invisible.
  const { loadPersistedTelemetry } = await import('../../src/cli/CLITelemetry.js');
  const persisted: TelemetryEvent[] = await loadPersistedTelemetry().catch(() => []);
  const buffered = telemetry.getCollector().getEvents();
  // Merge: persisted (from prior processes) + buffered (current process not yet flushed), deduped by id
  const seen = new Set<string>();
  const events: TelemetryEvent[] = [];
  for (const e of [...persisted, ...buffered]) {
    const id = (e as unknown as Record<string, unknown>).id as string | undefined;
    if (id && seen.has(id)) continue;
    if (id) seen.add(id);
    events.push(e);
  }
  if (events.length === 0) {
    console.log(`\n  ${chalk.dim('No telemetry events buffered in this session. Play a session, then run this command.')}`);
    return;
  }
  const recent = events.slice(-tail);
  console.log(`\n  ${chalk.bold(`Recent ${recent.length} of ${events.length} event(s):`)}\n`);
  for (const e of recent) {
    const ts = new Date(e.timestamp).toISOString().replace('T', ' ').slice(0, 19);
    const data = JSON.stringify(e.data);
    console.log(`  ${chalk.dim(ts)}  ${chalk.cyan(e.type.padEnd(22))}  ${chalk.dim(data)}`);
  }
  console.log('');
}

// ── Main ──────────────────────────────────────────────────────────────
/**
 * `mysterium privacy` — the player's identity-consent dashboard (doc 16 §2.1).
 * show: lists shared fields + active consents. withdraw <field|all>: removes
 * the value and records the withdrawal. The game continues unimpaired.
 */

export async function runPrivacyCommand(action: string | undefined, fieldArg: string | undefined): Promise<void> {
  const sig = loadSave();
  const identity = sig?.identity;

  if (action === 'withdraw-all') {
    if (!sig || !identity) { warn('No identity context stored.'); return; }
    let updated = identity;
    for (const f of IDENTITY_FIELDS) {
      if (identity.fields[f] !== undefined) updated = withdrawIdentityField(updated, f, Date.now());
    }
    saveGame({ ...sig, identity: updated });
    success('All identity context withdrawn. The game continues in its universal voice.');
    return;
  }

  if (action === 'withdraw') {
    const field = fieldArg as IdentityField | undefined;
    if (!field || !(IDENTITY_FIELDS as readonly string[]).includes(field)) {
      error(`Specify a field to withdraw: ${IDENTITY_FIELDS.join(', ')} — or an interest/aversion phrase`);
      return;
    }
    if (!sig || !identity || identity.fields[field] === undefined) {
      warn(`No identity data stored for "${field}".`);
      return;
    }
    const updated = withdrawIdentityField(identity, field, Date.now());
    saveGame({ ...sig, identity: updated });
    success(`Identity field "${field}" withdrawn. Voicing falls back to the universal voice.`);
    return;
  }

  // Phase 11 d3 (G29): withdraw a declared preference by its phrase — the value AND the derived
  // tag are removed; nothing new is stored about the withdrawal (47 §8: deletion is not memory).
  if (action === 'withdraw-preference' && fieldArg) {
    if (!sig || !identity) { warn('No identity context stored.'); return; }
    const before = identity;
    let updated = withdrawDeclaredPreference(before, 'interests', fieldArg, Date.now());
    if (updated === before) updated = withdrawDeclaredPreference(before, 'aversions', fieldArg, Date.now());
    if (updated === before) { warn(`No active preference matches "${fieldArg}".`); return; }
    saveGame({ ...sig, identity: updated });
    success(`Preference "${fieldArg}" withdrawn. The game stops reaching for it immediately.`);
    return;
  }

  // default: show
  if (!identity || Object.keys(identity.fields).length === 0) {
    console.log(`\n  ${chalk.dim('No identity context shared. The game speaks in its universal voice.')}`);
    console.log(`  ${chalk.dim('You can share context during')} ${chalk.bold('mysterium setup-profile')}${chalk.dim('.')}`);
    return;
  }
  console.log(`\n  ${chalk.bold('Identity context (local-only)')}`);
  for (const f of IDENTITY_FIELDS) {
    const value = identity.fields[f];
    if (value === undefined) continue;
    const consent = identity.consents[f];
    const purposes = consent ? consent.purposes.join(', ') : 'no purposes';
    console.log(`  ${chalk.cyan(f.padEnd(14))} ${value}  ${chalk.dim('· used for: ' + purposes)}`);
  }
  // Phase 11 d3 (G29): declared preferences, shown exactly as stored (47 §8 legibility —
  // the player's own phrase plus what the game derived from it).
  const prefs = identity.preferences;
  if (prefs && (prefs.interests.some((p) => p.withdrawnAtMs === null) || prefs.aversions.some((p) => p.withdrawnAtMs === null))) {
    console.log(`\n  ${chalk.bold('Declared preferences (tune what the game reaches for — never levels)')}`);
    for (const [kind, list] of [['interest', prefs.interests], ['aversion', prefs.aversions]] as const) {
      for (const p of list) {
        if (p.withdrawnAtMs !== null) continue;
        const derived = p.tag ? chalk.dim(` · shapes: ${p.tag}`) : chalk.dim(' · no tag derived');
        console.log(`  ${chalk.magenta(kind.padEnd(9))} "${p.phrase}"${derived}`);
      }
    }
  }
  console.log(`\n  ${chalk.dim('Withdraw any field:')} ${chalk.bold('mysterium privacy withdraw <field>')}`);
  console.log(`  ${chalk.dim('Withdraw everything:')} ${chalk.bold('mysterium privacy withdraw-all')}`);
  console.log(`  ${chalk.dim('Withdraw a preference:')} ${chalk.bold('mysterium privacy withdraw-preference "<phrase>')}`);
  console.log(`  ${chalk.dim('This data never leaves your device and never affects levels or difficulty.')}`);
}

// ── Delegation smoke (doc 43 Phase-1 gate) ──────────────────────────
