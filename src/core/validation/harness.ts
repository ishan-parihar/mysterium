/**
 * Validation harness — runs personas through the LIVE production loop.
 *
 * Spec: docs/validation/BENCHMARK-ARCHITECTURE.md §2, §4.
 *
 * Mirrors the exact contract the CLI orchestrator uses (verified in the
 * 2026-09-15 audit): tickWithStrategy(null,null) schedules; consequences apply
 * via processOutcome + applyConsequences (the orchestrator's path);
 * applyResponseOnly advances the UserMatrixModel + transformation state.
 * endSession applies retention decay, persists forgetting curves, runs the
 * needs probe, and stamps lastSessionAt.
 *
 * Determinism: fixed epoch (BENCH_EPOCH) + fixed step sizes; the harness itself
 * never calls Date.now() except for wall-time *measurement* (never fed to the
 * engine). The engine's internal Date.now() reads (startSession recalibration,
 * CCI theta freshness) are handled as documented in observables.ts: gates
 * assert on wall-clock-invariant quantities (relative staleness, deltas,
 * orderings, counts) — never on absolute time-derived values.
 */
import { ALL_STAGES } from '../domain/Stage.js';
import type { Stage } from '../domain/Stage.js';
import { ALL_LINES } from '../domain/Line.js';
import type { Holon } from '../world/Holon.js';
import type { Significator } from '../domain/Significator.js';
import { createSignificator } from '../domain/Significator.js';
import { startSession, endSession, tickWithStrategy, applyResponseOnly } from '../GameLoop.js';
import { createInitialWorldState, type WorldState } from '../engines/CandidateGeneration.js';
import { processOutcome, applyConsequences, type PlayerResponse } from '../engines/ConsequenceEngine.js';
import { seedInitialKnowledge } from '../curriculum/SeedInitialKnowledge.js';
import { seedCurriculumRegistry } from '../curriculum/CurriculumSeed.js';
import type { ScheduledEncounter } from '../domain/EncounterSpecNew.js';
import type { PersonaSpec } from './personas.js';
import { extractObservables, type Observables } from './observables.js';

/** Fixed epoch: 2026-01-01T00:00:00Z. All harness time derives from here. */
export const BENCH_EPOCH = Date.UTC(2026, 0, 1);

const DAY_MS = 86_400_000;

export interface HarnessOptions {
  sessions?: number;
  encountersPerSession?: number;
}

export interface SessionRecord {
  session: number;
  sig: Significator;
  observables: Observables;
}

export interface TrajectoryResult {
  persona: string;
  sessions: SessionRecord[];
  holons: number;
  wallTimeMs: number;
}

function makeWorld(): WorldState {
  return buildBenchWorld();
}

/**
 * The canonical benchmark world. Exported so a parity harness can drive its OWN loop over the
 * SAME world the trajectory runs on: two loops over two different worlds compare fixtures, not
 * the loop, and a duplicated fixture is exactly the drift the parity gate exists to catch.
 */
export function buildBenchWorld(): WorldState {
  const stages: readonly Stage[] = ALL_STAGES.slice(0, 3);  // the pre-conventional bench band
  const holons: Holon[] = [];
  for (const line of ALL_LINES) {
    for (const stage of stages) {
      holons.push({
        id: `h-${line}-${stage}`,
        name: `${line} ${stage} contact`,
        kind: 'NPC',
        line,
        stage,
        drives: { dominant: 'Agency', secondary: 'Eros', shadowQuadrant: null },
        polarity: 'Sovereign',
        narrativeRole: 'benchmark',
        relationships: [],
        active: true,
      } as Holon);
    }
  }
  return createInitialWorldState(holons);
}

function freshSignificator(persona: PersonaSpec, idPrefix: string): Significator {
  let sig = createSignificator(`${idPrefix}-${persona.name}`, persona.altitudes, persona.currentStage);
  if (persona.knowledgeLine) {
    sig = { ...sig, knowledge: seedInitialKnowledge(persona.knowledgeLine, persona.currentStage) } as Significator;
  }
  return sig;
}

/**
 * Run a full multi-session trajectory for one persona through the live loop.
 */
export function runPersonaTrajectory(persona: PersonaSpec, options: HarnessOptions = {}): TrajectoryResult {
  const sessions = options.sessions ?? persona.trajectory.sessions;
  const perSession = options.encountersPerSession ?? persona.trajectory.encountersPerSession;
  const t0Wall = Date.now();

  // Deterministic registry state (idempotent, cheap).
  seedCurriculumRegistry();

  let sig = freshSignificator(persona, 'bench');
  let world = makeWorld();
  const records: SessionRecord[] = [];

  let virtualNow = BENCH_EPOCH;
  let globalStep = 0;
  const counters = { curriculum: 0, training: 0 };

  for (let s = 0; s < sessions; s++) {
    // Inter-session gap: advance the virtual clock BEFORE this session.
    const gap = persona.trajectory.gapDaysBeforeSession?.[s] ?? 0;
    virtualNow += gap * DAY_MS;

    // Stamp lastSessionAt so the >30-day recalibration sees the virtual gap.
    if (s > 0) {
      sig = { ...sig, lastSessionAt: virtualNow - gap * DAY_MS } as Significator;
    }

    const session: any = {
      targetSessionLength: perSession,
      encountersSoFar: 0,
      recentLines: [],
    };
    let sessionState = startSession(sig, session);

    for (let e = 0; e < perSession; e++) {
      const now = virtualNow + e * 60_000;
      const { tickResult, sessionState: s1 } = tickWithStrategy(sig, world, session, sessionState, null, null, now);
      const primary = tickResult.encounters[0] ?? tickResult.encounter;
      if (!primary) break;

      sig = tickResult.sig;
      world = tickResult.world;

      // Which offers does this persona consume this tick?
      // Default: the primary offer only (the CLI's single-choice contract).
      // consumesAllOffers personas respond to EVERY offer (developmental +
      // curriculum + training beats) — the positive control for the
      // educational-stream gate.
      const offers: readonly ScheduledEncounter[] = persona.consumesAllOffers
        ? tickResult.encounters
        : [primary];

      for (const encounter of offers) {
        if (!encounter) continue;
        if (encounter.isTrainingBeat) counters.training++;
        else if (encounter.curriculumConceptId) counters.curriculum++;

        const response: PlayerResponse = persona.policy(encounter, globalStep);
        const record = processOutcome(encounter, response, now);
        const applied = applyConsequences(sig, world, record, encounter);
        sig = applied.sig;
        world = applied.world;

        const advanced = applyResponseOnly(sig, world, s1, response, encounter, now);
        sig = advanced.sig;
        world = advanced.world;
        sessionState = advanced.sessionState;
        globalStep++;
      }
    }

    const endResult = endSession(sig, sessionState, virtualNow + perSession * 60_000, world);
    sig = endResult.sig;
    world = endResult.world ?? world;

    records.push({
      session: s + 1,
      sig,
      observables: extractObservables(sig, sessionState, s + 1, counters),
    });
  }

  return { persona: persona.name, sessions: records, holons: world.holons.length, wallTimeMs: Date.now() - t0Wall };
}

/**
 * Run ONE session with a caller-specified entry configuration (used by the
 * G3 coherence gate: same persona, different surface configurations).
 */
export function runOneSession(persona: PersonaSpec, sessionConfig: Record<string, unknown>, epoch = BENCH_EPOCH): SessionRecord {
  seedCurriculumRegistry();
  let sig = freshSignificator(persona, 'bench1');
  const world = makeWorld();
  const session: any = { targetSessionLength: 5, encountersSoFar: 0, recentLines: [], ...sessionConfig };
  let sessionState = startSession(sig, session);
  for (let e = 0; e < 5; e++) {
    const now = epoch + e * 60_000;
    const { tickResult, sessionState: s1 } = tickWithStrategy(sig, world, session, sessionState, null, null, now);
    const encounter = tickResult.encounters[0] ?? tickResult.encounter;
    if (!encounter) break;
    sig = tickResult.sig;
    const response = persona.policy(encounter, e);
    const record = processOutcome(encounter, response, now);
    const applied = applyConsequences(sig, world, record, encounter);
    sig = applied.sig;
    const advanced = applyResponseOnly(sig, world, s1, response, encounter, now);
    sig = advanced.sig;
    sessionState = advanced.sessionState;
  }
  const endResult = endSession(sig, sessionState, epoch + 5 * 60_000, world);
  return { session: 1, sig: endResult.sig, observables: extractObservables(endResult.sig, sessionState, 1) };
}
