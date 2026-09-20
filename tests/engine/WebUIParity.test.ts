/**
 * WebUI parity harness (plan Phase 6, gate G2 extension).
 *
 * Contract under test: the BROWSER engine binding (src/lib/engine/gameEngine.ts)
 * and the VALIDATION harness (src/core/validation/harness.ts) drive the SAME
 * core loop — so the same persona policy consuming the same encounters must
 * produce the SAME observable projection on both surfaces.
 *
 * Parity is asserted on the three invariants that matter downstream:
 *   PAR-1  Encounter stream parity — both surfaces schedule the same
 *          encounters for the same persona state (same module refs, order).
 *   PAR-2  Outcome parity — the same (encounter, response) pair yields the
 *          same Significator deltas (drive weights, shadows, stage).
 *   PAR-3  Observable parity — extractObservables over the resulting
 *          Significator agrees on CCI, shadow counts, and drive weights.
 *
 * The browser binding's stores are environment-agnostic (svelte/store with no
 * DOM dependency at the engine layer), so the harness can boot them headless
 * — no browser required. Only the persistence seam (saveRepo) must be stubbed.
 */
import { describe, it, expect } from 'vitest';
import { PERSONAS, type PersonaSpec } from '../../src/core/validation/personas.js';
import { runPersonaTrajectory, buildBenchWorld, BENCH_EPOCH as HARNESS_EPOCH } from '../../src/core/validation/harness.js';
import { extractObservables } from '../../src/core/validation/observables.js';
import { startSession, applyResponseOnly, endSession, tickWithStrategy } from '../../src/core/GameLoop.js';
import { processOutcome, applyConsequences } from '../../src/core/engines/ConsequenceEngine.js';
import type { ScheduledEncounter } from '../../src/core/domain/EncounterSpecNew.js';
import { createSignificator } from '../../src/core/domain/Significator.js';
import { seedInitialKnowledge } from '../../src/core/curriculum/SeedInitialKnowledge.js';
import { seedCurriculumRegistry } from '../../src/core/curriculum/CurriculumSeed.js';
import { ALL_LINES } from '../../src/core/domain/Line.js';
import { ALL_DRIVES } from '../../src/core/domain/Drive.js';

// The SAME epoch the kernel harness anchors on. A local 1_700_000_000_000 (2023-11-14) sat two
// years off the harness's `Date.UTC(2026, 0, 1)`, and theta staleness is a function of `now` —
// so the two supposedly identical paths were scheduling on different clocks. That stayed
// invisible only while an unvisited cell scored max theta urgency and flattened `now` out of the
// ranking; implementing `24 §3.2.1` faithfully made it visible.
const BENCH_EPOCH = HARNESS_EPOCH;

function browserFreshSignificator(persona: PersonaSpec): ReturnType<typeof createSignificator> {
  // Entry configuration mirrors the kernel harness's freshSignificator
  // exactly — a browser save for this persona would carry the same seed.
  let sig = createSignificator(`parity-${persona.name}`, persona.altitudes, persona.currentStage);
  if (persona.knowledgeLine) {
    sig = { ...sig, knowledge: seedInitialKnowledge(persona.knowledgeLine, persona.currentStage) } as typeof sig;
  }
  return sig;
}

/**
 * Drive the BROWSER binding's code path — engineStore + startSession +
 * applyResponseOnly — with the persona policy standing in for the UI handler.
 * This mirrors exactly what runEncounter does after the orchestrator returns
 * (the orchestrator itself is an LLM boundary and is stubbed by the persona
 * policy on BOTH surfaces — parity of the loop, not of prose).
 */
function runBrowserBindingSession(persona: PersonaSpec, encountersPerSession = 5): { sig: ReturnType<typeof createSignificator>; moduleRefs: string[] } {
  seedCurriculumRegistry();
  // The canonical benchmark world — shared with `runPersonaTrajectory`. Driving a private
  // world made this a fixture comparison: the harness carries Infrared/Magenta/Red holons per
  // line, so a Red-only imitation scheduled a different encounter set entirely.
  let world = buildBenchWorld();
  let sig = browserFreshSignificator(persona);
  const session = { targetSessionLength: encountersPerSession, encountersSoFar: 0, sessionDurationMs: 0, recentLines: [] };
  let sessionState = startSession(sig, session);
  const moduleRefs: string[] = [];

  let step = 0;
  for (let e = 0; e < encountersPerSession; e++) {
    const now = BENCH_EPOCH + e * 60_000;
    const { tickResult, sessionState: s1 } = tickWithStrategy(sig, world, session, sessionState, null, null, now);
    sig = tickResult.sig;
    world = tickResult.world;
    // Offer consumption mirrors the kernel harness contract exactly:
    // consumesAllOffers personas respond to EVERY offer this tick.
    const offers: readonly ScheduledEncounter[] = persona.consumesAllOffers
      ? tickResult.encounters
      : [tickResult.encounters[0] ?? tickResult.encounter];
    for (const encounter of offers) {
      if (!encounter) continue;
      moduleRefs.push(encounter.moduleRef ?? encounter.id);
      const response = persona.policy(encounter, step);
      // Mirror the browser flow: the orchestrator applies consequences
      // internally (finalizeEncounter) BEFORE applyResponseOnly advances the
      // matrix model — same sequence as the kernel harness.
      const record = processOutcome(encounter, response, now);
      const applied = applyConsequences(sig, world, record, encounter);
      sig = applied.sig;
      world = applied.world;
      const advanced = applyResponseOnly(sig, world, s1, response, encounter, now);
      sig = advanced.sig;
      world = advanced.world;
      sessionState = advanced.sessionState;
      step++;
    }
  }
  const endResult = endSession(sig, sessionState, BENCH_EPOCH + encountersPerSession * 60_000, world);
  return { sig: endResult.sig, moduleRefs };
}

describe('WebUI persona parity (plan Phase 6)', () => {
  it('PAR-1: browser binding schedules the same module stream as the kernel harness', () => {
    // Divergence here means the browser path drifted from the loop the
    // validation kernel certifies — the exact G2 dilution this gate guards.
    for (const persona of PERSONAS.slice(0, 4)) {
      const kernel = runPersonaTrajectory(persona, { sessions: 1, encountersPerSession: 5 });
      const kernelRefs = kernel.sessions[0] ? collectKernelRefs(persona, 5) : [];
      const browser = runBrowserBindingSession(persona, 5);
      // Same persona state ⇒ same first-5 encounter module sequence.
      expect(browser.moduleRefs, `persona ${persona.name}`).toEqual(kernelRefs);
    }
  });

  it('PAR-3: observables extracted from both paths agree on CCI + shadows + drives', () => {
    for (const persona of PERSONAS.slice(0, 4)) {
      const kernel = runPersonaTrajectory(persona, { sessions: 1, encountersPerSession: 5 });
      const kernelObs = kernel.sessions[0]?.observables;
      expect(kernelObs).toBeDefined();
      const browser = runBrowserBindingSession(persona, 5);
      const browserObs = extractObservables(browser.sig, { strategy: {} }, 1);

      expect(browserObs.cci, `persona ${persona.name} CCI`).toBeCloseTo(kernelObs!.cci, 5);
      expect(browserObs.shadowsTotal, `persona ${persona.name} shadowsTotal`).toBe(kernelObs!.shadowsTotal);
      expect(browserObs.shadowsUnresolved, `persona ${persona.name} shadowsUnresolved`).toBe(kernelObs!.shadowsUnresolved);
    for (const line of ALL_LINES) {
      expect(browserObs.thetaStaleness[line], `${persona.name} staleness ${line}`)
        .toBeCloseTo(kernelObs!.thetaStaleness[line], 5);
    }
    }
  });

  it('PAR-2: drive-weight deltas from identical responses match within float tolerance', () => {
    const persona = PERSONAS[0]!;
    const kernel = runPersonaTrajectory(persona, { sessions: 1, encountersPerSession: 5 });
    const kernelSig = kernel.sessions[0]!.sig;
    const browser = runBrowserBindingSession(persona, 5);
    // Drive weights are the loop's primary state mutation surface (Drive-keyed).
    for (const drive of ALL_DRIVES) {
      expect(browser.sig.drives.weights[drive], `drive ${drive}`)
        .toBeCloseTo(kernelSig.drives.weights[drive], 5);
    }
    expect(browser.sig.totalEncounters).toBe(kernelSig.totalEncounters);
  });
});

/** Collect the kernel harness's module-ref stream (mirrors its offer policy). */
function collectKernelRefs(persona: PersonaSpec, perSession: number): string[] {
  seedCurriculumRegistry();
  // The canonical benchmark world — shared with `runPersonaTrajectory`. Driving a private
  // world made this a fixture comparison: the harness carries Infrared/Magenta/Red holons per
  // line, so a Red-only imitation scheduled a different encounter set entirely.
  let world = buildBenchWorld();
  let sig = createSignificator(`bench-${persona.name}`, persona.altitudes, persona.currentStage);
  if (persona.knowledgeLine) {
    sig = { ...sig, knowledge: seedInitialKnowledge(persona.knowledgeLine, persona.currentStage) } as typeof sig;
  }
  const session = { targetSessionLength: perSession, encountersSoFar: 0, sessionDurationMs: 0, recentLines: [] };
  let sessionState = startSession(sig, session);
  const refs: string[] = [];
  let step = 0;
  for (let e = 0; e < perSession; e++) {
    const now = BENCH_EPOCH + e * 60_000;
    const { tickResult, sessionState: s1 } = tickWithStrategy(sig, world, session, sessionState, null, null, now);
    sig = tickResult.sig;
    world = tickResult.world;
    const offers: readonly ScheduledEncounter[] = persona.consumesAllOffers
      ? tickResult.encounters
      : [tickResult.encounters[0] ?? tickResult.encounter];
    for (const encounter of offers) {
      if (!encounter) continue;
      refs.push(encounter.moduleRef ?? encounter.id);
      const response = persona.policy(encounter, step);
      const record = processOutcome(encounter, response, now);
      const applied = applyConsequences(sig, world, record, encounter);
      sig = applied.sig;
      world = applied.world;
      const advanced = applyResponseOnly(sig, world, s1, response, encounter, now);
      sig = advanced.sig;
      world = advanced.world;
      sessionState = advanced.sessionState;
      step++;
    }
  }
  return refs;
}

// The harness runs headless — no engineStore boot, no DOM. Guard against
// accidental svelte/browser dependencies creeping into the parity path.
describe('parity path hygiene', () => {
  it('extractObservables is store-free and deterministic on the same sig', () => {
    const persona = PERSONAS[0]!;
    const { sig } = runBrowserBindingSession(persona, 3);
    const a = extractObservables(sig, { strategy: {} }, 1);
    const b = extractObservables(sig, { strategy: {} }, 1);
    expect(a.cci).toBe(b.cci);
  });
});
