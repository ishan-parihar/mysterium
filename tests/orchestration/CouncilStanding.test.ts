/**
 * Phase 13 d11 — the council binding, the authorized read surface, and the standing context
 * (`43 §4.2` × `45 §6.1`/`§5.6`). Audit: `docs/audits/COUNCIL-ORTHOGONALITY-AUDIT-2026-09-24.md`.
 *
 * Locks (the parts Frontier's dispatch tests do NOT cover):
 *  - the binding is TOTAL: 18 roles mapped, every scope bound once the Journey-Guides' second face
 *    (`narrative-voice`) is counted — the inert row G32 found;
 *  - band reads FAIL CLOSED and the grants can never widen the scope table;
 *  - every refusal carries a reason (a refusal is information, never silence);
 *  - the standing block renders mandate/view/boundaries/tools/session, states withheld bands, and
 *    NEVER renders the encounter's stage label (Veil at the agent seam);
 *  - degradation is honest: no scope → "unavailable", no bands → "none", never a false claim;
 *  - the live delegation path carries the binding + block on the log and records its read_band call
 *    as GRANTED or REFUSED-with-reason depending on the role's view.
 */
import { describe, it, expect } from 'vitest';
import { createSignificator } from '../../src/core/domain/Significator.js';
import { ALL_LINES } from '../../src/core/domain/Line.js';
import type { Line } from '../../src/core/domain/Line.js';
import type { Stage } from '../../src/core/domain/Stage.js';
import { createInitialWorldState } from '../../src/core/engines/CandidateGeneration.js';
import {
  AGENT_ROLE_COUNCIL, AGENT_ROLE_SECONDARY_SCOPES, BAND_READ_GRANTS,
  authorizeBandRead, renderStandingBlock, scopesForRole, toolsForRole,
} from '../../src/core/orchestration/councilStanding.js';
import {
  ROLE_TOOLSETS, UNIVERSAL_READ_TOOLS, isToolAllowedFor,
  type AgentRole, type DelegatedTool, type DelegationSpec,
} from '../../src/core/orchestration/types.js';
import { ROLE_SCOPES, type CouncilRole, type ScopedEnvelope, type UdvBand } from '../../src/core/personalization/scenarioContext.js';
import { createOrchestrationServices, buildEnvelope } from '../../src/core/personalization/sessionRuntime.js';
import { delegateSession, emptyLedgerState } from '../../src/core/orchestration/orchestratorTools.js';

const ALL_ROLES = Object.keys(AGENT_ROLE_COUNCIL) as AgentRole[];
const ALL_COUNCIL: readonly CouncilRole[] = [
  'scenario-catalyst', 'narrative-voice', 'assessment', 'curriculum-teacher', 'safety', 'healing',
];
const ALL_BANDS: readonly UdvBand[] = [
  'preference', 'analogy', 'purpose', 'developmental', 'interests', 'aversions', 'constraints',
];

const sig = () => createSignificator(
  'd11-probe',
  Object.fromEntries(ALL_LINES.map((l) => [l, 'Amber' as Stage])) as Record<Line, Stage>,
  'Amber',
);

const TARGET = { line: 'Cognitive' as unknown as Line, stage: 'Amber' as Stage, modality: 'ScenarioChoice' as never };

/** One live envelope with every band populated — the richest scope input available. */
function envelope() {
  return buildEnvelope(
    createOrchestrationServices(),
    sig(),
    {
      usable: [],
      declaredInterests: ['music'],
      aversions: ['violence'],
      bands: { purposes: [{ kind: 'practice-vow', statement: 'sit each morning' }] },
    },
    TARGET,
    'a practice step toward steadiness',
    [],
    1000,
    null,
  );
}

// ─────────────────────────────────────────────────────────────────────────────────────────────
// The binding (O9)
// ─────────────────────────────────────────────────────────────────────────────────────────────

describe('d11 — the binding (45 §6.1 × 43 §4.2)', () => {
  it('is total over the 18 roles, and every declared scope has a bound agent', () => {
    expect(ALL_ROLES).toHaveLength(18);
    const bound = new Set<CouncilRole>();
    for (const role of ALL_ROLES) {
      const primary = AGENT_ROLE_COUNCIL[role];
      if (primary) bound.add(primary);
      for (const s of AGENT_ROLE_SECONDARY_SCOPES[role] ?? []) bound.add(s);
    }
    for (const scope of ALL_COUNCIL) expect(bound.has(scope), `scope ${scope} is unbound`).toBe(true);
  });

  it('binds the councils to the scopes their work needs', () => {
    expect(AGENT_ROLE_COUNCIL.J1).toBe('scenario-catalyst');
    expect(AGENT_ROLE_COUNCIL.A1).toBe('assessment');
    expect(AGENT_ROLE_COUNCIL.A2).toBe('assessment');
    expect(AGENT_ROLE_COUNCIL.T1).toBe('curriculum-teacher');
    expect(AGENT_ROLE_COUNCIL.S3).toBe('curriculum-teacher');
    expect(AGENT_ROLE_COUNCIL.S4).toBe('safety');
    expect(AGENT_ROLE_COUNCIL.therapist).toBe('healing');
    expect(AGENT_ROLE_COUNCIL.J4).toBe('healing');
  });

  it('S2 (producer) and S5 (operator) hold no player bands (O7)', () => {
    expect(AGENT_ROLE_COUNCIL.S2).toBeNull();
    expect(AGENT_ROLE_COUNCIL.S5).toBeNull();
    expect(BAND_READ_GRANTS.S2).toHaveLength(0);
    expect(BAND_READ_GRANTS.S5).toHaveLength(0);
  });

  it('the Journey-Guides carry narrative-voice as their SECOND face (the inert row becomes live)', () => {
    for (const j of ['J1', 'J2', 'J3', 'J4', 'J5'] as const) {
      expect(scopesForRole(j)[0]).toBe(AGENT_ROLE_COUNCIL[j]); // primary first
      expect(scopesForRole(j)).toContain('narrative-voice');
    }
    // The voice row withholds developmental numbers — the narrator must not narrate from scores.
    expect(ROLE_SCOPES['narrative-voice'].receives as readonly string[]).not.toContain('developmental');
  });
});

// ─────────────────────────────────────────────────────────────────────────────────────────────
// Band reads (43 §5.6)
// ─────────────────────────────────────────────────────────────────────────────────────────────

describe('d11 — read_band authorization (43 §5.6)', () => {
  it('grants a band the role both receives and is granted', () => {
    expect(authorizeBandRead('A1', 'developmental').granted).toBe(true);
    expect(authorizeBandRead('J1', 'interests').granted).toBe(true);
    expect(authorizeBandRead('therapist', 'aversions').granted).toBe(true);
    expect(authorizeBandRead('S4', 'aversions').granted).toBe(true);
  });

  it('refuses a band the SCOPE withholds, even for a role that holds other bands', () => {
    expect(authorizeBandRead('A1', 'interests').granted).toBe(false);
    expect(authorizeBandRead('A1', 'purpose').granted).toBe(false);
    expect(authorizeBandRead('T1', 'analogy').granted).toBe(false);
    expect(authorizeBandRead('therapist', 'analogy').granted).toBe(false);
    expect(authorizeBandRead('S4', 'interests').granted).toBe(false);
    expect(authorizeBandRead('A2', 'preference').granted).toBe(false);
  });

  it('grants can NEVER widen the table: every grant is inside the role’s scope', () => {
    for (const role of ALL_ROLES) {
      const scope = AGENT_ROLE_COUNCIL[role];
      if (scope === null) {
        expect(BAND_READ_GRANTS[role], `${role} holds no bands yet has grants`).toHaveLength(0);
        continue;
      }
      const receives = ROLE_SCOPES[scope].receives as readonly string[];
      for (const band of BAND_READ_GRANTS[role]) {
        expect(receives, `${role} may read '${band}' outside its ${scope} scope`).toContain(band);
      }
    }
  });

  it('every refusal carries a non-empty reason (a refusal is information)', () => {
    for (const role of ALL_ROLES) {
      for (const band of ALL_BANDS) {
        const v = authorizeBandRead(role, band);
        if (!v.granted) expect(v.reason.trim().length, `${role}/${band} refused silently`).toBeGreaterThan(0);
        else expect(v.reason.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('the band-less roles are refused WITH the reason they hold nothing', () => {
    for (const role of ['S2', 'S5'] as const) {
      const v = authorizeBandRead(role, 'developmental');
      expect(v.granted).toBe(false);
      expect(v.reason).toMatch(/no player bands/);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────────────────────
// The standing block (43 §5.6)
// ─────────────────────────────────────────────────────────────────────────────────────────────

describe('d11 — the standing block (43 §5.6)', () => {
  const env = envelope();
  const block = (role: AgentRole, scope?: ScopedEnvelope) => renderStandingBlock({
    role, ...(scope ? { scope } : {}), sessionId: 's1', delegationId: 'd1',
  });

  it('renders mandate · view · boundaries · tools · session for a scoped role', () => {
    const text = block('A1', env.scopes.assessment).join('\n');
    expect(text).toContain('[MY MANDATE] A1 · council scope: assessment');
    expect(text).toContain('[MY VIEW]');
    expect(text).toContain('[MY BOUNDARIES] I must not receive: interest graph');
    expect(text).toContain('[MY TOOLS]');
    expect(text).toContain('[MY SESSION] s1 · delegation d1');
  });

  it('withholds what the scope withholds — assessment sees no interests, no aims', () => {
    const text = block('A1', env.scopes.assessment).join('\n');
    expect(text).not.toContain('music');
    expect(text).not.toContain('sit each morning');
    expect(text).toContain('placement (banded)');
    expect(text).toContain('read_my_scope');
  });

  it('the catalyst gets its full view; the healing pair gets stakes and the veto list only', () => {
    const catalyst = block('J1', env.scopes['scenario-catalyst']).join('\n');
    expect(catalyst).toContain('music');
    expect(catalyst).toContain('sit each morning');

    const healing = block('therapist', env.scopes.healing).join('\n');
    expect(healing).toContain('veto list: violence');
    expect(healing).toContain('aims: sit each morning');
    expect(healing).not.toContain('music'); // affinities are never levers in shadow-work
    expect(healing).not.toContain('fluent domains');
  });

  it('NEVER renders the encounter’s stage label — Veil at the agent seam', () => {
    // The envelope's catalyst target is (Cognitive / Amber); 'amber' is forbidden recall vocabulary,
    // and the block must not rely on the filter catching it: it must not emit it at all.
    for (const role of ALL_ROLES) {
      const scope = AGENT_ROLE_COUNCIL[role];
      const text = block(role, scope ? env.scopes[scope] : undefined).join('\n').toLowerCase();
      for (const stage of ['amber', 'turquoise', 'teal', 'magenta', 'infrared', 'cci']) {
        expect(text, `${role} leaked '${stage}'`).not.toContain(stage);
      }
      expect(text).not.toContain('your stage');
      expect(text).not.toContain('your assessment');
    }
  });

  it('degrades honestly: no scope → unavailable; no bands → states none; S2 → holds none', () => {
    expect(block('J1').join('\n')).toContain('envelope unavailable');
    expect(block('S2').join('\n')).toContain('none — this role holds no player bands');
    // A scope with the band ABSENT still renders, but states the absence instead of a placement:
    // "unplaced" is honest, a fabricated band would not be.
    const bare = renderStandingBlock({
      role: 'A1', scope: { ...env.scopes.assessment, developmental: undefined }, sessionId: 's', delegationId: 'd',
    }).join('\n');
    expect(bare).toContain('placement (banded): unplaced');
    for (const band of ['emerging', 'active', 'consolidating']) expect(bare).not.toContain(band);
  });

  it('is deterministic and non-empty for every role', () => {
    for (const role of ALL_ROLES) {
      const scope = AGENT_ROLE_COUNCIL[role];
      const input = { role, ...(scope ? { scope: env.scopes[scope] } : {}), sessionId: 's', delegationId: 'd' };
      const a = renderStandingBlock(input);
      const b = renderStandingBlock(input);
      expect(a.length).toBeGreaterThan(0);
      expect(a).toEqual(b);
    }
  });

  it('grants the universal read tools to every role WITHOUT widening the act surface', () => {
    for (const role of ALL_ROLES) {
      const tools = toolsForRole(role);
      for (const t of UNIVERSAL_READ_TOOLS) expect(tools).toContain(t);
      for (const t of ROLE_TOOLSETS[role]) expect(tools).toContain(t);
      // The act surface stays role-specific: a teacher still cannot score a pack.
      expect(isToolAllowedFor(role, 'pack_score')).toBe(ROLE_TOOLSETS[role].includes('pack_score'));
      expect(isToolAllowedFor('T1', 'pack_score')).toBe(false);
      expect(isToolAllowedFor('A1', 'read_band')).toBe(true);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────────────────────
// Delivery in the live delegation path
// ─────────────────────────────────────────────────────────────────────────────────────────────

describe('d11 — delivery through delegate_session', () => {
  const world = createInitialWorldState([{
    id: 'h-Cognitive-Amber', name: 'd11 contact', kind: 'NPC',
    line: 'Cognitive', stage: 'Amber',
    drives: { dominant: 'Agency', secondary: 'Eros', shadowQuadrant: null },
    polarity: 'Sovereign', narrativeRole: 'test', relationships: [], active: true,
  } as never]);
  const session = { targetSessionLength: 5, encountersSoFar: 0, recentLines: [], sessionDurationMs: 0 };

  const specFor = (role: AgentRole): DelegationSpec => ({
    role,
    purpose: `d11 delivery probe: ${role}`,
    readProjection: new Set([] as never),
    toolset: new Set<DelegatedTool>(ROLE_TOOLSETS[role] as readonly DelegatedTool[]),
    budget: { toolCallsMax: 8, virtualMsMax: 600_000 },
  });

  it('records the binding and the standing block, and a GRANTED band read', async () => {
    const env = envelope();
    const run = await delegateSession({
      spec: specFor('A1'), sig: sig(), world, session, seed: 'd11-grant', now: 1_000_000,
      ledger: emptyLedgerState(), scope: env.scopes.assessment,
    });
    expect(run.ok).toBe(true);
    expect(run.log.councilScope).toBe('assessment');
    expect(run.log.standing?.some((l) => l.includes('[MY MANDATE] A1'))).toBe(true);
    const readBand = run.log.toolCalls.find((t) => t.tool === 'read_band');
    expect(readBand).toBeDefined();
    expect(readBand!.ok).toBe(true);
    expect(readBand!.note).toBeUndefined();
    expect(run.log.toolCalls.some((t) => t.tool === 'read_my_scope')).toBe(true);
    expect(run.log.transcript.some((e) => e.text.includes('read_band(developmental) granted'))).toBe(true);
  });

  it('records a REFUSAL with its reason for a role that holds no player bands', async () => {
    const run = await delegateSession({
      spec: specFor('S2'), sig: sig(), world, session, seed: 'd11-refuse', now: 1_000_000,
      ledger: emptyLedgerState(),
    });
    expect(run.ok).toBe(true);
    expect(run.log.councilScope).toBeUndefined();
    const readBand = run.log.toolCalls.find((t) => t.tool === 'read_band');
    expect(readBand).toBeDefined();
    expect(readBand!.ok).toBe(false);
    expect(readBand!.note ?? '').toMatch(/no player bands/);
    expect(run.log.transcript.some((e) => e.text.includes('refused'))).toBe(true);
  });

  it('a deployed agent without a scope does not fabricate a view', async () => {
    const run = await delegateSession({
      spec: specFor('A4'), sig: sig(), world, session, seed: 'd11-unscoped', now: 1_000_000,
      ledger: emptyLedgerState(),
    });
    expect(run.log.standing?.some((l) => l.includes('envelope unavailable'))).toBe(true);
    expect(run.log.standing?.some((l) => l.includes('placement (banded)'))).toBe(false);
  });
});
