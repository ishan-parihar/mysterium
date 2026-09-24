// @script-status: wired — consumed by scripts/cohort-run.ts, which the G39/G40 gates and d4's
// calibration pass invoke.
/**
 * The campaign runner — one persona, N sessions, through the LIVE seam.
 *
 * Spec: `docs/DEVELOPMENT-PLAN.md` §4 Phase 15 d1.
 *
 * ## Why this module exists
 *
 * The validation kernel's `runPersonaTrajectory` drives the loop *directly* —
 * `tickWithStrategy` → `processOutcome` → `applyConsequences` → `applyResponseOnly` → `endSession` —
 * with no `OrchestrationServices`. That is the correct shape for a kernel gate (it must not depend
 * on the LLM seam), but it means the kernel exercises the personalization/memory stack only in
 * isolated fixtures, and nothing has ever run many sessions over trajectory time through the seam
 * the CLI actually uses. So the calibration list (`AGENTS.md §4.2` item 3) has no distributions, and
 * the architecture's central claims — adaptation to a specific persona, transformation over time,
 * composition variety that does not collapse — have no observed evidence.
 *
 * A campaign closes that: the same `AgenticOrchestrator` path, the same services record, the same
 * checkpoint contract, over a trajectory instead of a boot.
 *
 * ## The three properties a campaign must have, and how each is obtained
 *
 * 1. **It drives the live seam, not a model of it.** Encounters run through
 *    `buildEncounterOrchestrator` + `run()` + `responseFromRecord` (`usecases/EncounterSession`) —
 *    the SAME construction path the CLI's `executeEncounter` uses, extracted for exactly this second
 *    caller. A campaign that modelled the seam would measure the model.
 *
 * 2. **It is hermetic.** Every write goes under `spec.rootDir`, which the caller points at a
 *    throwaway directory; nothing here touches the tree or the developer's real state root. The
 *    kernel harness's `BENCH_EPOCH` + `gapDaysBeforeSession` precedent supplies the virtual clock, so
 *    a multi-week trajectory costs milliseconds and no wall-clock reading feeds the engine.
 *
 * 3. **It restores between sessions — through DISK.** The checkpoint is captured as the session runs,
 *    serialized, written, then read back and restored at the start of the next session. The round
 *    trip is deliberately not an in-memory carry: `G28` proved one process can restore once, and the
 *    property a campaign needs is that the seam survives a restart *at every session boundary* — a
 *    feed entry that survives one read and not the ninth is a defect only a trajectory can find.
 *
 * ## The persona is expressed as CHOICE, not as a response
 *
 * The kernel harness injects a full `PlayerResponse` because it bypasses the orchestrator. A campaign
 * cannot: the orchestrator's job is to *evaluate an answer*, so the only honest input is the answer.
 * `personaChoiceHandler` therefore translates a persona's stance (its policy's drive/shadow tilt and
 * its narrative words) into the two things a UI handler may return — a selection among the offered
 * options, and a write-in. The stance thus reaches the engine through the same door a human player's
 * does, which is what makes the resulting drive/shadow readings evidence rather than assertion.
 *
 * The write-in is also why F7 mattered: an authored narrative now rides the consequence record, so
 * the reflective/immersion evidence lands on the campaign series rather than in a caller's frame.
 */
import * as fs from 'fs';
import * as path from 'path';
import { BENCH_EPOCH, buildBenchWorld } from '../validation/harness.js';
import type { PersonaSpec } from '../validation/personas.js';
import { extractObservables, type Observables } from '../validation/observables.js';
import { startSession, endSession, tickWithStrategy, applyResponseOnly } from '../GameLoop.js';
import type { Significator } from '../domain/Significator.js';
import { createSignificator } from '../domain/Significator.js';
import type { ConsequenceRecord } from '../domain/ConsequenceRecord.js';
import { seedInitialKnowledge } from '../curriculum/SeedInitialKnowledge.js';
import { seedCurriculumRegistry } from '../curriculum/CurriculumSeed.js';
import type { WorldState } from '../engines/CandidateGeneration.js';
import type { PlayerResponse } from '../engines/ConsequenceEngine.js';
import type { ScheduledEncounter } from '../domain/EncounterSpecNew.js';
import { ALL_LINES } from '../domain/Line.js';
import { bootModuleRegistry } from '../assessments/bootModules.js';
import { type ModuleRegistry } from '../assessments/registry.js';
import {
  createOrchestrationServices,
  captureCheckpoint,
  type OrchestrationServices,
  type RuntimeCheckpoint,
} from '../personalization/sessionRuntime.js';
import { feedPlanningBias } from '../orchestration/feedReaders.js';
import { detectShadowKeywords } from '../assessments/shadowSignals.js';
import { buildEncounterOrchestrator, responseFromRecord } from '../usecases/EncounterSession.js';
import { buildSeriesRow, candidateSource, type CampaignSeriesRow, type EncounterProvenance } from './campaignSeries.js';
import type { AgenticUIHandler } from '../assessments/AgenticOrchestrator.js';
import type { AskUserQuestionParams, AskUserQuestionResult, MCQQuestion, UserAnswer } from '../assessments/agentTypes.js';

const DAY_MS = 86_400_000;
/** The minute-scale step the kernel harness uses, kept identical so a campaign and a trajectory of
 *  the same shape observe the same per-encounter timestamps. */
const STEP_MS = 60_000;

export interface CampaignSpec {
  readonly persona: PersonaSpec;
  readonly sessions?: number;
  readonly encountersPerSession?: number;
  /** Throwaway state root — every campaign write goes under here. Never the tree. */
  readonly rootDir: string;
  /** Skip the LLM entirely (the hermetic tier). Default true: a campaign that needs a model is the
   *  experiential tier and is never what gates CI. */
  readonly noLlm?: boolean;
}

/** One session of a campaign — what it consumed and what it left behind. */
export interface CampaignSessionRecord {
  readonly session: number;
  /** Virtual-clock timestamp this session ended at (ms since the epoch). */
  readonly endedAt: number;
  readonly offered: number;
  /** Encounters the orchestrator actually finalized (a tick may yield no offer). */
  readonly finalized: number;
  /** The write-ins that reached the consequence records this session (F7's evidence surface). */
  readonly writeIns: readonly string[];
  /** Bytes of the checkpoint read back at the START of this session (0 for session 1). */
  readonly restoredBytes: number;
  /** Feed entries the restored services held when the session began — the restore's actual effect. */
  readonly restoredFeedEntries: number;
  /** Always 1: one checkpoint per session, written at its end (the CLI's shape). */
  readonly checkpointsWritten: number;
  readonly observables: Observables;
  /** Phase 15 d3 — the seam-side record around the kernel's observables (see `campaignSeries.ts`). */
  readonly series: CampaignSeriesRow;
  readonly sig: Significator;
  readonly world: WorldState;
}

export interface CampaignResult {
  readonly persona: string;
  readonly sessions: readonly CampaignSessionRecord[];
  readonly wallTimeMs: number;
}

// ── The persona as a UI handler ───────────────────────────────────────────────────────────────

/**
 * Index of the option a persona picks.
 *
 * The bias order is deliberate and matches what a player with that stance would do:
 *   1. an avoidance persona declines (the last option — the surface's disengagement slot);
 *   2. a surfacing persona picks an option whose text carries its shadow vocabulary, when one is
 *      offered — a shadow that is never chosen cannot surface, and a campaign whose shadow
 *      accumulation is flat because nobody ever chose the shadow is measuring the handler;
 *   3. otherwise a step-stable rotation, so a long campaign does not answer one option forever and
 *      pin an observable to a constant (the Phase 14 d2a lesson: a pinned number reads as a flat
 *      curve, not as a bug).
 */
function pickOptionIndex(persona: PersonaSpec, question: MCQQuestion, desired: PlayerResponse, step: number): number {
  const options = question.options ?? [];
  if (options.length === 0) return -1;
  const shadow = desired.shadowSurfaced;
  if (shadow) {
    // Does any offered option carry shadow language? When none does, the surface is not offering the
    // shadow a choice, and picking the first described option would be a different act.
    const anyShadowLanguage = options.some(
      (o) => detectShadowKeywords(`${o.label} ${o.description}`) !== null,
    );
    if (anyShadowLanguage) {
      const withDescription = options.findIndex((o) => (o.description ?? '').length > 0);
      if (withDescription >= 0) return withDescription;
    }
  }
  // A persona whose policy authors an empty narrative is the avoidance stance: it takes the last
  // offered option, which is the disengagement slot.
  if (desired.narrativeSummary.trim() === '') return options.length - 1;
  return (persona.name.length + step) % options.length;
}

/**
 * Build the UI handler for a persona.
 *
 * `step` advances per QUESTION, not per encounter — the orchestrator may ask more than once in an
 * encounter, and a handler whose counter advanced per encounter would give every follow-up the same
 * stance as its opener. `sessionLabel` seeds the rotation so a persona's choice in session 3 differs
 * from its choice in session 1, while staying reproducible for a given campaign.
 */
export function personaChoiceHandler(
  persona: PersonaSpec,
  encounter: ScheduledEncounter,
  sessionLabel: string,
): AgenticUIHandler {
  let step = 0;
  let seedOffset = 0;
  for (let i = 0; i < sessionLabel.length; i++) seedOffset = (seedOffset * 31 + sessionLabel.charCodeAt(i)) % 1000;

  return {
    askUser: async (params: AskUserQuestionParams): Promise<AskUserQuestionResult> => {
      const answers: UserAnswer[] = [];
      for (const q of params.questions) {
        const desired = persona.policy(encounter, step + seedOffset);
        const idx = pickOptionIndex(persona, q, desired, step + seedOffset);
        const selectedLabel = idx >= 0 ? (q.options?.[idx]?.label ?? '') : '';
        // The write-in is the persona's narrative — the reflective/immersion evidence, and the reason
        // F7 declared these fields on the record. Offered only when the surface permits one.
        const writeIn = q.allowWriteIn ? desired.narrativeSummary : undefined;
        answers.push({
          selectedLabels: selectedLabel ? [selectedLabel] : [],
          ...(writeIn ? { writeInValue: writeIn } : {}),
        });
        step++;
      }
      return { answers };
    },
  };
}

// ── The checkpoint round trip ─────────────────────────────────────────────────────────────────

/** `campaign/checkpoint-<n>.json` under the throwaway root. Session 0 is written first. */
function checkpointPath(rootDir: string, session: number): string {
  return path.join(rootDir, 'campaign', `checkpoint-${session}.json`);
}

/**
 * Write a checkpoint for `session`.
 *
 * `JSON.stringify` IS the codec: `48 §2` requires every checkpoint field to be serializable
 * (`captureCheckpoint`'s doc states it), and `restoreCheckpoint` already normalizes the one field a
 * parsed checkpoint may omit (`proposals`, backfilled fail-closed). A bespoke encoder here would be a
 * second definition of the persisted shape — the drift `restoreCheckpoint`'s boundary normalization
 * exists to prevent.
 */
function writeCheckpoint(rootDir: string, session: number, cp: RuntimeCheckpoint): number {
  const p = checkpointPath(rootDir, session);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  const body = JSON.stringify(cp);
  fs.writeFileSync(p, body, 'utf-8');
  return body.length;
}

/** Read session `n`'s checkpoint, or undefined when it was never written. */
function readCheckpoint(rootDir: string, session: number): string | undefined {
  if (session < 0) return undefined;
  const p = checkpointPath(rootDir, session);
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf-8') : undefined;
}

/**
 * The checkpoint a session starts from: session `n - 1`'s, exactly.
 *
 * Deliberately NOT "the newest file on disk with a lower index". A run always owns its own session 0,
 * and a rule that reached back into a previous run's files would make the SAME spec against the SAME
 * root produce different series depending on what a prior invocation left behind — which is precisely
 * the determinism `G39` asserts. Resuming an interrupted campaign is a real capability, but it needs
 * an explicit instruction (a session offset) rather than an inference from directory contents; until
 * that exists, a run starts fresh and says so here instead of appearing to resume.
 */
function previousCheckpoint(rootDir: string, session: number): string | undefined {
  return readCheckpoint(rootDir, session - 1);
}

// ── The runner ────────────────────────────────────────────────────────────────────────────────

function freshSignificator(persona: PersonaSpec): Significator {
  let sig = createSignificator(`campaign-${persona.name}`, persona.altitudes, persona.currentStage);
  if (persona.knowledgeLine) {
    sig = { ...sig, knowledge: seedInitialKnowledge(persona.knowledgeLine, persona.currentStage) } as Significator;
  }
  return sig;
}

/**
 * Run a campaign. Deterministic for a given `spec` and empty `rootDir`.
 *
 * Everything except the checkpoint files is local state: the only thing the root changes is whether
 * session N begins from a restored checkpoint. That is what makes `G39`'s two assertions possible —
 * same seed + empty root → identical observable series (determinism), and a root holding session N−1's
 * checkpoint → a session that starts from it (restore fidelity across the trajectory).
 */
export async function runCampaign(spec: CampaignSpec): Promise<CampaignResult> {
  const sessions = spec.sessions ?? spec.persona.trajectory.sessions;
  const perSession = spec.encountersPerSession ?? spec.persona.trajectory.encountersPerSession;
  const noLlm = spec.noLlm ?? true;
  const t0Wall = Date.now();

  // Deterministic registry state (idempotent, cheap) — the same seeding the kernel harness does. The
  // module registry is BOOTED here rather than read off a global the CLI happens to set, so a
  // campaign run by a gate or a script is self-sufficient.
  seedCurriculumRegistry();
  const registry: ModuleRegistry = bootModuleRegistry();

  let sig = freshSignificator(spec.persona);
  let world: WorldState = buildBenchWorld();
  const records: CampaignSessionRecord[] = [];
  const history: ConsequenceRecord[] = [];
  const counters = { curriculum: 0, training: 0 };
  let virtualNow = BENCH_EPOCH;

  for (let s = 0; s < sessions; s++) {
    // Inter-session gap: advance the virtual clock BEFORE this session (the kernel harness's rule, so
    // theta-decay and the >30-day recalibration see a trajectory rather than a burst).
    const gap = spec.persona.trajectory.gapDaysBeforeSession?.[s] ?? 0;
    virtualNow += gap * DAY_MS;
    if (s > 0) {
      sig = { ...sig, lastSessionAt: virtualNow - gap * DAY_MS } as Significator;
    }

    // ── Restore through disk ────────────────────────────────────────────────────────────────
    // The previous session's checkpoint is READ BACK from the root rather than carried in memory: the
    // property under test is that the seam survives a process boundary at EVERY session boundary.
    const raw = previousCheckpoint(spec.rootDir, s);
    const restored: RuntimeCheckpoint | undefined = raw
      ? (JSON.parse(raw) as RuntimeCheckpoint)
      : undefined;

    // One services record per SESSION — the CLI's shape. Rebuilt each session because the campaign
    // round-trips it through the root; one record held for the whole campaign would hide exactly the
    // restore fidelity this runner exists to measure.
    const orchestration: OrchestrationServices = createOrchestrationServices(world.holons, restored);
    // Measured BEFORE the session runs — this is what the restore actually delivered.
    const restoredFeedEntries = orchestration.feed.entries.length;

    const sessionCtx = {
      targetSessionLength: perSession,
      encountersSoFar: 0,
      recentLines: [] as string[],
    };
    let sessionState = startSession(sig, sessionCtx as never, feedPlanningBias(orchestration.feed));

    let offered = 0;
    let finalized = 0;
    let checkpointsWritten = 0;
    const writeIns: string[] = [];
    const provenance: EncounterProvenance[] = [];

    for (let e = 0; e < perSession; e++) {
      const now = virtualNow + e * STEP_MS;
      const { tickResult, sessionState: s1 } = tickWithStrategy(
        sig, world, sessionCtx as never, sessionState, null, null, now,
      );
      const encounter: ScheduledEncounter | undefined = tickResult.encounters[0] ?? tickResult.encounter;
      if (!encounter) break;
      offered++;

      sig = tickResult.sig;
      world = tickResult.world;

      const [encLine, encStage] = encounter.moduleRef.split(':') as [string, string];
      const orchestrator = buildEncounterOrchestrator({
        encounter,
        significator: sig,
        world,
        history,
        uiHandler: personaChoiceHandler(spec.persona, encounter, `${spec.persona.name}/s${s}`),
        module: registry.get(encLine as never, encStage as never),
        noLlm,
        orchestration,
      });

      const outcome = await orchestrator.run();
      const record = outcome.consequenceRecord;
      history.push(record);
      // d3 provenance: read from the orchestrator's OWN stamp, never re-derived from the encounter.
      // The pool made a decision and the player received its result; a second opinion formed here
      // would describe the pool the runner imagines rather than the one that ran.
      provenance.push({
        cell: encounter.moduleRef,
        modality: encounter.modality,
        tier: encounter.executionMode,
        executionMode: encounter.executionMode,
        polarityMode: encounter.polarityMode,
        candidateSource: candidateSource(outcome.composition?.candidateId ?? null),
        pole: outcome.composition?.pole ?? null,
        isCurriculum: Boolean(encounter.curriculumConceptId),
        isTraining: Boolean(encounter.isTrainingBeat),
      });
      if (record.writeInValue) writeIns.push(record.writeInValue);
      const response = responseFromRecord(encounter, record, outcome.narrativeSummary);

      sig = outcome.updatedSig;
      world = outcome.updatedWorld;

      // The matrix model + transformation state advance exactly as the CLI's story branch does:
      // consequences were already applied by the orchestrator, so this must NOT re-apply them.
      const advanced = applyResponseOnly(sig, world, s1, response, encounter, now);
      sig = advanced.sig;
      world = advanced.world;
      sessionState = advanced.sessionState;

      if (encounter.isTrainingBeat) counters.training++;
      else if (encounter.curriculumConceptId) counters.curriculum++;
      finalized++;
    }

    // ONE checkpoint per session, at the session's end — the CLI's shape (`captureCheckpoint` at the
    // save site, then the sidecar journal for crash recovery). Writing per ENCOUNTER under a
    // per-session filename would overwrite itself, so each write but the last would be work whose
    // result is never read.
    writeCheckpoint(spec.rootDir, s, captureCheckpoint(orchestration));
    checkpointsWritten++;

    const endResult = endSession(sig, sessionState, virtualNow + perSession * STEP_MS, world);
    sig = endResult.sig;
    world = endResult.world ?? world;

    const observables = extractObservables(sig, sessionState, s + 1, counters);
    records.push({
      session: s + 1,
      endedAt: virtualNow + perSession * STEP_MS,
      offered,
      finalized,
      writeIns,
      restoredBytes: raw ? raw.length : 0,
      restoredFeedEntries,
      checkpointsWritten,
      observables,
      series: buildSeriesRow({
        session: s + 1,
        persona: spec.persona.name,
        sig,
        world,
        observables,
        services: orchestration,
        provenance,
      }),
      sig,
      world,
    });

    virtualNow += perSession * STEP_MS;
  }

  return { persona: spec.persona.name, sessions: records, wallTimeMs: Date.now() - t0Wall };
}

/** The lines a campaign's series should be reported over — re-exported so a reporter need not
 *  re-declare the canonical set (the `G37` rule). */
export { ALL_LINES };
