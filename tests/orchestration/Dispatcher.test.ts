/**
 * Phase 13 d12 — the council dispatcher and its live summoning surface
 * (`43 §3.3` + the trigger table, audit `COUNCIL-ORTHOGONALITY-AUDIT-2026-09-24` §3–§4, O10).
 *
 * Locks:
 *  - the trigger table is coherent (`dispatchTableViolations()` empty, every row reachable);
 *  - precedence is the ruling: crisis preempts everything, a threshold assembles the whole council,
 *    the ordinary encounter is last;
 *  - determinism: the same state summons the same roles; the seed reorders, never chooses;
 *  - law 3: S2/S5 are background and never hold the player's frame;
 *  - the tools: `summon_council` runs exactly the summoned roles, a cell-bound summons without a
 *    cell is skipped WITH a reason, unknown roles are refused, nothing payloaded is a measurement;
 *  - registration: the three tools exist on the loop only when a CouncilIntegration is provided.
 */
import { describe, it, expect } from 'vitest';
import {
  TRIGGER_TABLE, ALL_TRIGGERS, dispatchCouncil, dispatchTableViolations, observationForTrigger,
  type CouncilObservation, type DispatchState,
} from '../../src/core/orchestration/dispatcher.js';
import { AGENT_ROLE_COUNCIL, ALL_AGENT_ROLES } from '../../src/core/orchestration/councilStanding.js';
import {
  COUNCIL_TOOLS, COUNCIL_TOOL_NAMES, COUNCIL_RULES_SUFFIX,
  councilToolWiringViolations, handleCouncilTool, councilIntegrationFrom,
} from '../../src/core/assessments/councilTools.js';
import type { AgentRole } from '../../src/core/orchestration/types.js';
import type { DelegateSessionOutcome } from '../../src/core/orchestration/orchestratorTools.js';
import { delegateSession, emptyLedgerState } from '../../src/core/orchestration/orchestratorTools.js';
import { ROLE_TOOLSETS } from '../../src/core/orchestration/types.js';
import { buildEnvelope, createOrchestrationServices } from '../../src/core/personalization/sessionRuntime.js';
import { AgenticOrchestrator } from '../../src/core/assessments/AgenticOrchestrator.js';
import { createSignificator } from '../../src/core/domain/Significator.js';
import { createInitialWorldState } from '../../src/core/engines/CandidateGeneration.js';

const CLEAR: CouncilObservation = {
  crisis: false, thresholdProximity: false, shadowWorkWarranted: false, placementUnknown: false,
  packIntakeDue: false, consentChangeRequested: false, depthPlateauTicks: 0, retentionDecay: false,
  reflectionWritten: false, cellIntent: 'game',
};

const state = (over: Partial<CouncilObservation> = {}, seed = 'seed-a'): DispatchState => ({ ...CLEAR, ...over, seed });

describe('d12 — the trigger table', () => {
  it('is coherent: no unknown role, no background role in the foreground, every row reachable', () => {
    expect(dispatchTableViolations()).toEqual([]);
  });

  it('crisis preempts EVERY other trigger, and is the only bypass', () => {
    const everything = state({
      crisis: true, thresholdProximity: true, shadowWorkWarranted: true, placementUnknown: true,
      packIntakeDue: true, consentChangeRequested: true, depthPlateauTicks: 9, retentionDecay: true,
      reflectionWritten: true,
    });
    const summon = dispatchCouncil(everything);
    expect(summon.trigger).toBe('crisis');
    expect(summon.bypass).toBe(true);
    expect(summon.roles).toEqual(['therapist']);
    expect(summon.summoner).toBe('bypass');
    // Exactly one bypass row in the table — a second would make "the frame stops being a game"
    // ambiguous.
    expect(TRIGGER_TABLE.filter((r) => r.bypass === true)).toHaveLength(1);
  });

  it('threshold proximity assembles the WHOLE council in canonical order', () => {
    const summon = dispatchCouncil(state({ thresholdProximity: true }));
    expect(summon.trigger).toBe('threshold-proximity');
    expect(summon.strategy).toBe('transformation');
    // The WHOLE council — every role except the two that by law work behind the curtain (law 3).
    const expected = ALL_AGENT_ROLES.filter((r) => r !== 'S2' && r !== 'S5');
    expect([...summon.roles].sort()).toEqual([...expected].sort());
    expect(summon.roles[0]).toBe('therapist'); // canonical order, no rotation — the pacing IS the moment
    expect(summon.background).toEqual(['S2', 'S5']);
    expect(summon.roles).not.toContain('S2');
  });

  it('shadow-work routes therapist → J4: the proposal and the delivery are different roles', () => {
    const summon = dispatchCouncil(state({ shadowWorkWarranted: true }));
    expect(summon.roles).toEqual(['therapist', 'J4']);
    expect(summon.foreground).toBe('J4'); // the companion who sits with it, not the one who proposes
  });

  it('the ordinary encounter is the default row and its guide follows the cell intent', () => {
    expect(dispatchCouncil(state({ cellIntent: 'game' })).roles).toEqual(['J1']);
    expect(dispatchCouncil(state({ cellIntent: 'test' })).roles).toEqual(['J2']);
    expect(dispatchCouncil(state({ cellIntent: 'diagnosis' })).roles).toEqual(['J3']);
    expect(dispatchCouncil(state()).trigger).toBe('encounter-open');
  });

  it('plateau and decay reach the Teacher council with the study strategy', () => {
    const plateau = dispatchCouncil(state({ depthPlateauTicks: 3 }));
    expect(plateau.trigger).toBe('depth-plateau');
    expect(plateau.roles).toEqual(['T1', 'T2']); // study order: the anchor first, then the remainder
    expect(plateau.strategy).toBe('study');
    expect(dispatchCouncil(state({ depthPlateauTicks: 2 })).trigger).toBe('encounter-open'); // threshold is 3
    expect(dispatchCouncil(state({ retentionDecay: true })).roles).toEqual(['T2']);
  });

  it('the health tick is background only — the player never meets S5', () => {
    const summon = dispatchCouncil(state({ loopHealthTick: true }));
    expect(summon.trigger).toBe('loop-health');
    expect(summon.roles).toEqual([]);
    expect(summon.foreground).toBeNull();
    expect(summon.background).toEqual(['S5', 'S2']);
  });

  it('is deterministic: same state ⇒ same summons, while the seed only reorders', () => {
    const a = dispatchCouncil(state({}, 'one'));
    const b = dispatchCouncil(state({}, 'one'));
    expect(a).toEqual(b);
    // A seed change may reorder the assembled presence but never the membership or the trigger.
    const c = dispatchCouncil(state({}, 'two'));
    expect(c.trigger).toBe(a.trigger);
    expect([...c.roles].sort()).toEqual([...a.roles].sort());
  });

  it('every foreground a trigger can summon is bound to a scope (never a band-less role)', () => {
    for (const row of TRIGGER_TABLE) {
      for (const role of row.roles(CLEAR)) {
        if (role === 'S5' || role === 'S2') continue; // the two lawful background exceptions
        expect(AGENT_ROLE_COUNCIL[role], `${row.trigger} summons ${role} with no binding`).not.toBeNull();
      }
    }
  });

  it('observationForTrigger round-trips: every named state fires exactly its own row', () => {
    // The inverse helper the CLI/`--trigger` drill and the tests rely on. If a predicate changes,
    // this fails — which is the point: the canonical state and the table cannot drift apart.
    for (const trigger of ALL_TRIGGERS) {
      const summon = dispatchCouncil({ ...observationForTrigger(trigger), seed: 'round-trip' });
      expect(summon.trigger, `observationForTrigger('${trigger}') fired '${summon.trigger}'`).toBe(trigger);
    }
    // The intent selects the guide for the default row and nothing else.
    expect(dispatchCouncil({ ...observationForTrigger('encounter-open', 'test'), seed: 's' }).roles).toEqual(['J2']);
    expect(dispatchCouncil({ ...observationForTrigger('encounter-open', 'diagnosis'), seed: 's' }).roles).toEqual(['J3']);
    expect(dispatchCouncil({ ...observationForTrigger('crisis', 'test'), seed: 's' }).roles).toEqual(['therapist']);
  });

  it('rationales are player-visible text: no stage label, no measurement vocabulary', () => {
    for (const row of TRIGGER_TABLE) {
      const text = row.rationale(CLEAR).toLowerCase();
      for (const banned of ['amber', 'turquoise', 'teal', 'cci', 'theta', 'score', 'stage']) {
        expect(text, `${row.trigger} rationale leaks '${banned}'`).not.toContain(banned);
      }
    }
  });
});

describe('d12 — the summoning tools', () => {
  const runs: AgentRole[] = [];
  const fakeOutcome = (role: AgentRole, ok = true): DelegateSessionOutcome => ({
    ok,
    ...(ok ? {} : { violation: { code: 'role_toolset_violation' as const, detail: `bad spec for ${role}` } }),
    sig: {} as never, world: {} as never, encountersExecuted: 1,
    log: { councilScope: 'assessment', toolCalls: [], transcript: [] } as never,
    ...(ok ? { result: { outcome: 'completion' as const, proposals: [{ kind: 'mastery_evidence' as const, payload: {}, rationale: 'r' }], signals: {} as never, logRef: {} as never } } : {}),
    ledger: emptyLedgerState(),
  });

  const integration = (observation: Partial<CouncilObservation>, cell?: { line: string; stage: string }) => councilIntegrationFrom({
    observation: { ...CLEAR, ...observation },
    seed: 'tool-seed',
    ...(cell ? { cell: cell as never } : {}),
    plannedRoles: ['T1', 'J1', 'therapist'] as readonly AgentRole[],
    run: async (role) => { runs.push(role); return fakeOutcome(role); },
  });

  it('declares the three tools and keeps the suffix in step with them', () => {
    expect(COUNCIL_TOOLS.map((t) => t.function.name).sort()).toEqual(['delegate_session', 'schedule_presence', 'summon_council']);
    expect(councilToolWiringViolations()).toEqual([]);
    expect(COUNCIL_RULES_SUFFIX).toContain('bypass');
  });

  it('summon_council runs exactly the roles the TABLE chose, not the ones the model guesses', async () => {
    runs.length = 0;
    const res = await handleCouncilTool('summon_council', '{}', { integration: integration({}, { line: 'Cognitive', stage: 'Amber' }) });
    expect(res.ok).toBe(true);
    expect(res.payload.trigger).toBe('encounter-open');
    expect(runs).toEqual(['J1']);
    // The payload carries kinds, never payloads or numbers (43 §4.7 at the tool seam).
    const sessions = res.payload.sessions as Record<string, unknown>[];
    expect(sessions[0]!.proposals).toEqual(['mastery_evidence']);
    expect(JSON.stringify(res.payload)).not.toContain('rationale');
  });

  it('a bypass summons is flagged so the model drops the fiction', async () => {
    runs.length = 0;
    const res = await handleCouncilTool('summon_council', '{}', { integration: integration({ crisis: true }) });
    expect(res.payload.bypass).toBe(true);
    expect(runs).toEqual(['therapist']);
  });

  it('a cell-bound summons without a cell is SKIPPED with a reason, never run against a bad spec', async () => {
    runs.length = 0;
    const res = await handleCouncilTool('summon_council', '{}', { integration: integration({}) });
    const sessions = res.payload.sessions as Record<string, unknown>[];
    expect(sessions[0]!.outcome).toBe('skipped');
    expect(sessions[0]!.reason).toMatch(/no cell/);
    expect(runs).toEqual([]); // nothing ran — G15 never had to refuse
    // With a cell, the same summons runs.
    runs.length = 0;
    await handleCouncilTool('summon_council', '{}', { integration: integration({}, { line: 'Cognitive', stage: 'Amber' }) });
    expect(runs).toEqual(['J1']);
  });

  it('schedule_presence is deterministic and strategy-shaped', async () => {
    const a = await handleCouncilTool('schedule_presence', '{"strategy":"therapy"}', { integration: integration({}) });
    const b = await handleCouncilTool('schedule_presence', '{"strategy":"therapy"}', { integration: integration({}) });
    expect(a.payload).toEqual(b.payload);
    expect((a.payload.order as string[])[0]).toBe('therapist');
    const study = await handleCouncilTool('schedule_presence', '{"strategy":"study"}', { integration: integration({}) });
    expect((study.payload.order as string[])[0]).toBe('T1');
    // An unknown strategy degrades to balanced rather than throwing.
    expect((await handleCouncilTool('schedule_presence', '{"strategy":"nope"}', { integration: integration({}) })).payload.strategy).toBe('balanced');
  });

  it('delegate_session refuses an unknown role and a missing purpose, and clamps the budget', async () => {
    const bad = await handleCouncilTool('delegate_session', '{"role":"Z9","purpose":"x"}', { integration: integration({}) });
    expect(bad.ok).toBe(false);
    const noPurpose = await handleCouncilTool('delegate_session', '{"role":"T1","purpose":"  "}', { integration: integration({}) });
    expect(noPurpose.ok).toBe(false);
    runs.length = 0;
    const ok = await handleCouncilTool('delegate_session', '{"role":"T1","purpose":"explain the thing","budget":99}', { integration: integration({}) });
    expect(ok.ok).toBe(true);
    expect(runs).toEqual(['T1']);
    const unknownTool = await handleCouncilTool('nope', '{}', { integration: integration({}) });
    expect(unknownTool.ok).toBe(false);
  });

  it('a refused spec is reported as a refusal, not as a session that ran', async () => {
    const refusing = councilIntegrationFrom({
      observation: CLEAR, seed: 's', plannedRoles: [], run: async (role) => fakeOutcome(role, false),
    });
    const res = await handleCouncilTool('delegate_session', '{"role":"A1","purpose":"probe"}', { integration: refusing });
    expect((res.payload.delegation as Record<string, unknown>).outcome).toBe('refused');
  });
});

describe('d12 — end to end: the dispatcher drives real delegated sessions', () => {
  it('a crisis summons runs the Therapist through delegate_session with the healing scope delivered', async () => {
    const sig = createSignificator('d12-e2e', {
      Cognitive: 'Amber', Emotional: 'Amber', Moral: 'Amber', Intrapersonal: 'Amber',
      Spiritual: 'Amber', Somatic: 'Amber', Willpower: 'Amber', Interpersonal: 'Amber',
    } as never, 'Amber');
    const world = createInitialWorldState([]);
    const session = { targetSessionLength: 2, encountersSoFar: 0, recentLines: [], sessionDurationMs: 0 };
    // The same envelope the live seam produces — so the standing block really carries a scoped view.
    const env = buildEnvelope(
      createOrchestrationServices(), sig,
      { usable: [], declaredInterests: ['music'], aversions: ['violence'], bands: { purposes: [{ kind: 'practice-vow', statement: 'sit each morning' }] } },
      { line: 'Cognitive' as never, stage: 'Amber' as never, modality: 'ScenarioChoice' as never },
      'a crisis summons', [], 1_000_000, null,
    );
    let ledger = emptyLedgerState();

    const integration = councilIntegrationFrom({
      observation: observationForTrigger('crisis'),
      seed: 'e2e',
      cell: { line: 'Cognitive', stage: 'Amber' } as never,
      plannedRoles: ['therapist', 'J1'] as readonly AgentRole[],
      run: async (role) => {
        const binding = AGENT_ROLE_COUNCIL[role];
        const out = await delegateSession({
          spec: {
            role, purpose: 'crisis summons (e2e)',
            readProjection: new Set([] as never),
            toolset: new Set([...ROLE_TOOLSETS[role]] as never[]),
            budget: { toolCallsMax: 8, virtualMsMax: 600_000 },
          },
          sig, world, session, seed: 'e2e', now: 1_000_000, ledger,
          ...(binding ? { scope: env.scopes[binding] } : {}),
        });
        if (out.ok) ledger = out.ledger;
        return out;
      },
    });

    const res = await handleCouncilTool('summon_council', '{}', { integration });
    expect(res.ok).toBe(true);
    expect(res.payload.trigger).toBe('crisis');
    expect(res.payload.bypass).toBe(true);
    const sessions = res.payload.sessions as Record<string, unknown>[];
    expect(sessions).toHaveLength(1);
    expect(sessions[0]!.role).toBe('therapist');
    expect(sessions[0]!.scope).toBe('healing');
    // The session log carries the binding AND the standing block — the Therapist knew who it was.
    const logged = JSON.parse(ledger.logs[0]!) as { councilScope?: string; standing?: string[] };
    expect(logged.councilScope).toBe('healing');
    expect(logged.standing?.some((l) => l.includes('[MY MANDATE] therapist'))).toBe(true);
    expect(logged.standing?.some((l) => l.includes('veto list: violence'))).toBe(true);
    expect(logged.standing?.join('\n')).not.toContain('music'); // affinities are never levers here
  });
});

describe('d12 — registration on the live loop', () => {
  const sig = createSignificator('d12-sig', {
    Cognitive: 'Red', Emotional: 'Red', Moral: 'Red', Intrapersonal: 'Red',
    Spiritual: 'Red', Somatic: 'Red', Willpower: 'Red', Interpersonal: 'Red',
  } as never, 'Red');
  const encounter = {
    id: 'd12-enc', moduleRef: 'Cognitive:Red', modality: 'ScenarioChoice', targetLines: ['Cognitive'],
    stage: 'Red', holonSource: 'test', shadowTarget: null, polarityMode: 'Exploring', difficulty: 0.5,
    sessionPosition: 'peak', priority: 0.5, driveTarget: null, executionMode: 'capacity',
  } as never;
  const base = {
    encounter, significator: sig as never, world: createInitialWorldState([]), history: [],
    conceptIndex: {}, uiHandler: { askUser: async () => ({ answers: [] }) } as never, noLlm: true,
  };

  it('without an integration: unchanged tool surface (no summoning)', () => {
    const orch = new AgenticOrchestrator(base as never);
    const names = (orch as unknown as { toolsForRun(): { function: { name: string } }[] }).toolsForRun().map((t) => t.function.name);
    expect(names).toHaveLength(2);
    for (const n of COUNCIL_TOOL_NAMES) expect(names).not.toContain(n);
  });

  it('with an integration: the three summoning tools are registered', () => {
    const orch = new AgenticOrchestrator({
      ...base,
      council: councilIntegrationFrom({ observation: CLEAR, seed: 's', plannedRoles: [], run: async () => { throw new Error('unused'); } }),
    } as never);
    const names = (orch as unknown as { toolsForRun(): { function: { name: string } }[] }).toolsForRun().map((t) => t.function.name);
    expect(names).toHaveLength(5);
    for (const n of COUNCIL_TOOL_NAMES) expect(names).toContain(n);
  });
});
