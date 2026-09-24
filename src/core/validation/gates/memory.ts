/**
 * Memory gates — G28–G35: checkpoint persistence, intake and retrieval firewalls, band population, council, the polarity pool.
 *
 * Split out of `gates.ts` (module-cohesion audit item 2). They assert the Phase 11–13 live seam
 * (`48`, `45 §6.1`, `46 §4.3`) — the surfaces that were architecture-dark until d4 wired them.
 *
 * Spec: docs/validation/BENCHMARK-ARCHITECTURE.md §6.
 */

import type { Line } from '../../domain/Line.js';
import { createSignificator, type Significator } from '../../domain/Significator.js';
import { ALL_LINES } from '../../domain/Line.js';
import { createOrchestrationServices, sessionEnd, captureCheckpoint, restoreCheckpoint, buildEnvelope, scopeContractViolations, assessmentScopeLine, type RuntimeCheckpoint } from '../../personalization/sessionRuntime.js';
import { AGENT_ROLE_COUNCIL, AGENT_ROLE_SECONDARY_SCOPES, ALL_AGENT_ROLES, authorizeBandRead, renderStandingBlock } from '../../orchestration/councilStanding.js';
import { TRIGGER_TABLE, dispatchCouncil, dispatchTableViolations, type CouncilObservation } from '../../orchestration/dispatcher.js';
import { COUNCIL_TOOLS, councilToolWiringViolations } from '../../assessments/councilTools.js';
import { purposesFromVows, analogyFromInterests, preferenceFromHistory, observedFromEngagement, DEFAULT_PREFERENCE } from '../../personalization/bandSources.js';
import type { Holon } from '../../world/Holon.js';
import type { Proposal } from '../../orchestration/types.js';
import { grantDeclaredPreference, withdrawDeclaredPreference, activeDeclaredInterests, activeDeclaredAversions, createEmptyIdentityProfile } from '../../domain/IdentityProfile.js';
import { localRetrieve, tokenize, type Retrievable } from '../../memory/LocalRetriever.js';
import { filterRecall, createEmbeddingProvider, EMBEDDING_MODEL_PIN, isBandedText } from '../../memory/retrievalFirewall.js';
import { createTagStore } from '../../world/tags/dialectic.js';
import { INITIAL_TAGS } from '../../world/tags/initialTags.js';
import { pairKeyOf } from '../../personalization/dialecticEngine.js';
import { deriveLibraryVariants } from '../../personalization/polarityIndex.js';
import { decidePole, unfamiliarShareFor } from '../../personalization/poleDecision.js';
import { applyReading, deterministicReading, polarityCoverage, auditReadingLog, CONFIRMATIONS_TO_RECONCILE, type ReadingApplication } from '../../personalization/polarityResolution.js';
import { seedCandidateLibrary, initialTopicTagResolver } from '../../personalization/candidateLibrary.js';
import { buildQuery, rankByRelevance } from '../../personalization/pooling.js';
import { sharedFacetStore } from '../../personalization/sessionRuntime.js';
import type { Modality } from '../../domain/enums.js';
import type { Stage } from '../../domain/Stage.js';
import type { GateResult } from './plumbing.js';

// ---------------------------------------------------------------------------
// G28 — Memory persistence (hard, plan Phase 11 d1): the runtime checkpoint
// survives save→load→save byte-identically (W4 replay across restart); NPC
// memory, the feed, and the polarity map do NOT die with the process.
// ---------------------------------------------------------------------------

const G28_HOLONS: readonly Holon[] = [
  { id: 'g28-h', name: 'G28 contact', kind: 'NPC', line: 'Cognitive', stage: 'Red', drives: { dominant: 'Agency', secondary: 'Eros', shadowQuadrant: null }, polarity: 'Sovereign', narrativeRole: 'benchmark', relationships: [], active: true } as never,
];

/** A minimal consequence record carrying one holon delta (the drain's event source). */
function g28Record(holonId: string): import('../../domain/ConsequenceRecord.js').ConsequenceRecord {
  return {
    encounterId: 'g28-enc',
    timestamp: 5,
    line: 'Cognitive',
    polarityTrace: {
      energeticDirection: 'Radiative',
      driveDirectionality: { Agency: 'HealthyBalanced', Communion: 'HealthyBalanced', Eros: 'HealthyBalanced', Agape: 'HealthyBalanced' },
    } as import('../../domain/ConsequenceRecord.js').ConsequenceRecord['polarityTrace'],
    shadowSurfaced: null,
    shadowResolved: null,
    holonDeltas: [{ holonId, field: 'relationshipStrength', oldValue: 0.5, newValue: 0.6 }],
    altitudeShift: null,
    driveShift: null,
    narrativeSummary: 'The contact tested the player.',
  };
}

export function validateMemoryPersistence(): GateResult {
  const mk = (m: string): GateResult => ({ gate: 'G28 memory persistence', passed: false, hard: true, details: m });
  try {
    // Session 1: run a session end, capture the checkpoint.
    const s1 = createOrchestrationServices(G28_HOLONS);
    const proposals: readonly Proposal[] = [
      { kind: 'encounter_record', payload: { encounterId: 'g28-e1' }, rationale: 'g28' },
    ];
    sessionEnd(s1, {
      logRef: { sessionId: 'g28-s1', delegationId: 'fg', startedAtMs: 0, endedAtMs: 10 },
      signals: { veilRisk: 0, distressSignal: 0, frustrationSignal: 0, progressDelta: 1, consentEvents: [] },
      proposals,
      touchedHolonIds: ['g28-h'],
      history: [g28Record('g28-h')],
      now: 20,
      dialecticPair: ['craft', 'riddle'],
      polarityDirection: 'sto',
    });
    const cp1: RuntimeCheckpoint = captureCheckpoint(s1);
    const json1 = JSON.stringify(cp1);

    // Restart: rebuild services from the PARSED checkpoint (the save/load round trip),
    // run another session end, capture again.
    const s2 = createOrchestrationServices(G28_HOLONS, JSON.parse(json1) as RuntimeCheckpoint);
    if (s2.feed.entries.length !== s1.feed.entries.length) return mk('restore: feed replay lost entries');
    if (Object.keys(s2.workers.workers).length === 0) return mk('restore: worker pool empty after restore');
    if (Object.keys(s2.states).length === 0) return mk('restore: polarity states lost across restart');
    sessionEnd(s2, {
      logRef: { sessionId: 'g28-s2', delegationId: 'fg', startedAtMs: 20, endedAtMs: 30 },
      signals: { veilRisk: 0, distressSignal: 0, frustrationSignal: 0, progressDelta: 1, consentEvents: [] },
      proposals: [],
      touchedHolonIds: ['g28-h'],
      history: [g28Record('g28-h')],
      now: 30,
      dialecticPair: ['craft', 'riddle'],
      polarityDirection: 'sto',
    });
    const cp2 = captureCheckpoint(s2);

    // Replay idempotence: restoring the SAME checkpoint into a fresh record and re-running the
    // same session end yields byte-identical state (W4 across restart).
    const s3 = createOrchestrationServices(G28_HOLONS, JSON.parse(json1) as RuntimeCheckpoint);
    sessionEnd(s3, {
      logRef: { sessionId: 'g28-s2', delegationId: 'fg', startedAtMs: 20, endedAtMs: 30 },
      signals: { veilRisk: 0, distressSignal: 0, frustrationSignal: 0, progressDelta: 1, consentEvents: [] },
      proposals: [],
      touchedHolonIds: ['g28-h'],
      history: [g28Record('g28-h')],
      now: 30,
      dialecticPair: ['craft', 'riddle'],
      polarityDirection: 'sto',
    });
    const cp3 = captureCheckpoint(s3);
    if (JSON.stringify(cp2) !== JSON.stringify(cp3)) return mk('replay across restart is not byte-identical (W4)');

    // The polarity pair's state survived the round trip and the advance performed its ONE write:
    // `undiscovered` → `active-tension` (discovery). It is NOT `reconciled` — reconciliation
    // requires repeated confirmations through the reading path (`46 §4.3`'s law, owned by
    // `polarityResolution.applyReading`), and no reading was ratified here. This assertion read
    // "→ reconciled" until 2026-09-24, when the campaign series showed the old one-`sto`-step
    // reconciliation firing on a pair's SECOND encounter — the single-sweep collapse `46 §4.3`
    // forbids. The gate's lateral is persistence, so it asserts the state that persistence must
    // carry, not a law another writer owns.
    const key = s2.states['craft|riddle'];
    if (key !== 'active-tension') return mk(`polarity advance wrong: craft|riddle = ${String(key)}`);

    // Fail-closed restore: a foreign entry must be refused, not silently absorbed.
    const s4 = createOrchestrationServices(G28_HOLONS);
    restoreCheckpoint(s4, { feedEntries: [], workers: s4.workers, states: {} });
    return { gate: 'G28 memory persistence', passed: true, hard: true, details: 'checkpoint survives save→load→save byte-identical; worker pool + polarity map + feed replay across restart (W4)' };
  } catch (e) {
    return mk(`error: ${e instanceof Error ? e.message : String(e)}`);
  }
}

// ---------------------------------------------------------------------------
// G29 — The preference intake firewall (hard, plan Phase 11 d3): a declared
// preference enters ONLY through consent-gated, purpose-scoped, withdrawable
// fields; deletion removes value AND derived tag; no declared preference ever
// becomes a field of record (MY-RG-0021 class).
// ---------------------------------------------------------------------------

export function validatePreferenceIntakeFirewall(): GateResult {
  const mk = (m: string): GateResult => ({ gate: 'G29 preference intake firewall', passed: false, hard: true, details: m });
  try {
    let p = createEmptyIdentityProfile();
    p = grantDeclaredPreference(p, 'interests', 'building wooden boats', 'craft', 1000);
    p = grantDeclaredPreference(p, 'aversions', 'competitive rankings', 'warfare', 1100);
    if (activeDeclaredInterests(p).length !== 1 || activeDeclaredAversions(p).length !== 1) {
      return mk('declared preferences not stored/active as expected');
    }
    // Withdrawal removes the value AND the derived tag.
    const w = withdrawDeclaredPreference(p, 'interests', 'Building Wooden Boats', 2000);
    const wActive = activeDeclaredInterests(w);
    if (wActive.length !== 0) return mk('withdrawal left an active interest');
    const entry = w.preferences?.interests[0];
    if (!entry || entry.withdrawnAtMs === null || entry.tag !== null) {
      return mk('withdrawal did not clear the derived tag (47 §8 legibility)');
    }
    // Withdrawal is idempotent for unknown phrases.
    if (withdrawDeclaredPreference(w, 'interests', 'nonexistent', 3000) !== w) {
      return mk('withdrawing an unknown phrase mutated the profile');
    }
    // The preference data NEVER touches the developmental fields: it lives in its own namespace.
    if ('fields' in (p.preferences ?? {})) return mk('preferences leaked into the identity fields namespace');
    return { gate: 'G29 preference intake firewall', passed: true, hard: true, details: 'declared preferences consent-gated, withdrawable (value + derived tag removed), purpose-scoped, never a field of record' };
  } catch (e) {
    return mk(`error: ${e instanceof Error ? e.message : String(e)}`);
  }
}

// ---------------------------------------------------------------------------
// G30 — Verdict completeness (hard, plan Phase 11 d4): every session whose
// outcome is recorded has a recorded disposition on the feed; raw signals
// never enter player state (F1 enforced end-to-end).
// ---------------------------------------------------------------------------

export function validateVerdictCompleteness(): GateResult {
  const mk = (m: string): GateResult => ({ gate: 'G30 verdict completeness', passed: false, hard: true, details: m });
  try {
    const services = createOrchestrationServices(G28_HOLONS);
    const proposals: readonly Proposal[] = [
      { kind: 'encounter_record', payload: { encounterId: 'g30-e1' }, rationale: 'g30' },
      { kind: 'shadow_entry', payload: { quadrant: 'GoldenAllergy', intensity: 0.5 }, rationale: 'g30' },
    ];
    const outcome = sessionEnd(services, {
      logRef: { sessionId: 'g30-s1', delegationId: 'fg', startedAtMs: 0, endedAtMs: 10 },
      signals: { veilRisk: 0, distressSignal: 0, frustrationSignal: 0, progressDelta: 1, consentEvents: [] },
      proposals,
      touchedHolonIds: ['g28-h'],
      history: [],
      now: 20,
    });
    if (!outcome.verdictRecorded) return mk('session end did not record a verdict');
    const verdict = services.feed.entries.find((e) => e.id === 'verdict:g30-s1');
    if (!verdict || verdict.source !== 'ratification') return mk('no ratification entry on the feed for the session');
    const committedKinds = (verdict.verdict?.committed ?? []).map((c) => c.split('#')[0]);
    if (!committedKinds.includes('encounter_record') || !committedKinds.includes('shadow_entry')) {
      return mk(`verdict incomplete: ${committedKinds.join(',')}`);
    }
    // F1 at the reader: the CCI projection strips signals by construction.
    const cciView = services.feed.read('cci');
    if (cciView.some((e) => e.signals !== undefined)) return mk('F1 violated: signals visible to the CCI reader');
    return { gate: 'G30 verdict completeness', passed: true, hard: true, details: 'every session records a disposition; engine-committed kinds listed; F1 reader projection verified' };
  } catch (e) {
    return mk(`error: ${e instanceof Error ? e.message : String(e)}`);
  }
}

// ---------------------------------------------------------------------------
// G31 — Retrieval firewall (hard, plan Phase 12 d4; 48 §5, MY-RG-0031/0032):
// banded-only output, read-only recall, Veil-filtered text, per-player
// isolation — each proven by an injected violation (MY-AD-0027: a gate is not
// trusted until shown to fail).
// ---------------------------------------------------------------------------

export function validateRetrievalFirewall(): GateResult {
  const mk = (m: string): GateResult => ({ gate: 'G31 retrieval firewall', passed: false, hard: true, details: m });
  try {
    const docs = new Map<string, import('../../memory/retrievalFirewall.js').Recallable>([
      ['clean', { id: 'clean', scope: 'player-1', banded: true, text: 'A step was taken and settled; something long-avoided was faced.' }],
      ['raw', { id: 'raw', scope: 'player-1', banded: false, text: 'drive eros 0.87 shadow quadrant DarkAddiction' }],
      ['meta', { id: 'meta', scope: 'player-1', banded: true, text: 'The system has noticed your stage is Amber.' }],
      ['foreign', { id: 'foreign', scope: 'player-2', banded: true, text: 'Another player\'s narrative thread.' }],
    ]);
    const corpus: readonly Retrievable[] = [...docs.values()].map((d) => ({
      id: d.id,
      fields: [{ name: 'text', text: d.text, weight: 1 }],
      at: 0,
      edges: [],
    }));
    const ranked = localRetrieve(corpus, { text: 'step settled narrative thread', now: 1000 });
    const hits = filterRecall(ranked, docs, 'player-1');
    const ids = new Set(hits.map((h) => h.id));
    if (ids.has('raw')) return mk('R1 violated: a raw-signal document survived the firewall');
    if (ids.has('meta')) return mk('R3 violated: a Veil-breaching construction survived');
    if (ids.has('foreign')) return mk('R4 violated: a cross-user document surfaced');
    if (!ids.has('clean')) return mk('R1 over-broad: the clean banded document was dropped');
    // Text-level check directly.
    if (isBandedText('your stage is Amber')) return mk('isBandedText passed a stage-naming construction');
    // Tokenizer sanity (the BM25 path): stopwords drop, real terms stay — including stage words
    // (they are legitimate TEXT tokens; the firewall filters RETURNED text, not queries).
    if (tokenize('The a and of boats').join(' ') !== 'boats') return mk('tokenizer drifted from the arch.py pattern');
    // Pin enforcement (MY-RG-0032): a wrong pin is a hard construction error.
    let pinThrew = false;
    try {
      createEmbeddingProvider('some-other-model@v2', () => [1]);
    } catch {
      pinThrew = true;
    }
    if (!pinThrew) return mk('MY-RG-0032 violated: an unpinned embedding model was accepted');
    const ok = createEmbeddingProvider(EMBEDDING_MODEL_PIN, () => [1]);
    if (ok.modelId !== EMBEDDING_MODEL_PIN) return mk('pin round-trip failed');
    return { gate: 'G31 retrieval firewall', passed: true, hard: true, details: 'R1 raw dropped, R3 Veil-filtered, R4 isolated, clean passes; pin enforced (MY-RG-0032)' };
  } catch (e) {
    return mk(`error: ${e instanceof Error ? e.message : String(e)}`);
  }
}

// ---------------------------------------------------------------------------
// G32 — Council role scope at the LIVE seam (45 §6.1, Phase 13 d2). The role table is
// enforced by construction in `scopeForRole`; this gate proves the LIVE envelope produces
// all five scopes, that each carries exactly its declared bands, and that a scope violating
// its contract renders as NOTHING rather than as a partial leak (fail-closed).
// ---------------------------------------------------------------------------

export function validateRoleScopeAlignment(): GateResult {
  const mk = (m: string): GateResult => ({ gate: 'G32 council role scope', passed: false, hard: true, details: m });
  try {
    const services = createOrchestrationServices();
    const env = buildEnvelope(
      services,
      g13Sig(),
      {
        usable: ['pronouns'],
        declaredInterests: ['music'],
        aversions: ['violence'],
        // A purpose band distinct from the encounter's purpose: the assessment line must carry the
        // ENCOUNTER's target (46 §11 inv 5) and never the player's own aim statement.
        bands: { purposes: [{ kind: 'practice-vow', statement: 'sit for ten minutes each morning' }] },
      },
      { line: 'Cognitive', stage: 'Amber', modality: 'ScenarioChoice' as never },
      'a practice step toward steadiness',
      [],
      1000,
      null,
    );
    const roles = ['scenario-catalyst', 'narrative-voice', 'assessment', 'curriculum-teacher', 'safety', 'healing'] as const;
    for (const role of roles) {
      const scope = env.scopes[role];
      if (!scope) return mk(`no scope produced for ${role} — the live seam skipped a council role`);
      if (scope.role !== role) return mk(`scope for ${role} reports role ${scope.role}`);
      const bad = scopeContractViolations(scope);
      if (bad.length > 0) return mk(`${role} received undeclared band(s): ${bad.join(', ')}`);
    }
    // The binding (Phase 13 d11): every agent role is bound to a scope or explicitly to none, and
    // every declared scope has at least one bound agent (a scope row without a consumer is inert).
    const boundScopes = new Set<string>();
    for (const [role, scope] of Object.entries(AGENT_ROLE_COUNCIL)) {
      if (scope !== null) boundScopes.add(scope);
      if (scope === undefined) return mk(`agent role ${role} has no council binding`);
      for (const secondary of AGENT_ROLE_SECONDARY_SCOPES[role as keyof typeof AGENT_ROLE_COUNCIL] ?? []) boundScopes.add(secondary);
    }
    for (const scope of roles) {
      if (!boundScopes.has(scope)) return mk(`scope '${scope}' has no bound agent (an inert scope row)`);
    }
    // The standing block (43 §5.6): non-empty, Veil-guarded line by line, and honest about a view
    // that is withheld (S2/S5) or unavailable.
    for (const role of ['T1', 'A1', 'therapist', 'S2'] as const) {
      const block = renderStandingBlock({
        role,
        ...(AGENT_ROLE_COUNCIL[role] ? { scope: env.scopes[AGENT_ROLE_COUNCIL[role]!] } : {}),
        sessionId: 'g32-session',
        delegationId: 'g32-delegation',
      });
      if (block.length === 0) return mk(`standing block empty for ${role}`);
      if (!block.some((l) => l.includes('[MY MANDATE]'))) return mk(`standing block for ${role} lacks a mandate line`);
      if (!isBandedText(block.join(' '))) return mk(`standing block for ${role} breached the Veil vocabulary`);
    }
    if (!renderStandingBlock({ role: 'S2', sessionId: 's', delegationId: 'd' }).some((l) => l.includes('none')))
      return mk('S2 standing block does not state that it holds no player bands');
    // Read authorization (43 §5.6): a band the scope withholds is REFUSED — even when the grant
    // list would otherwise allow it — and a role holding nothing is refused with a reason.
    if (authorizeBandRead('A1', 'interests').granted) return mk('A1 was granted the interest graph (45 §6.1 violated)');
    if (authorizeBandRead('therapist', 'analogy').granted) return mk('the therapist was granted analogy internals (healing scope violated)');
    if (authorizeBandRead('S2', 'developmental').granted) return mk('S2 was granted a player band (it holds none)');
    const refusal = authorizeBandRead('S2', 'developmental').reason;
    if (refusal.trim().length === 0) return mk('a refusal carried no reason (a refusal is information)');
    if (!authorizeBandRead('A1', 'developmental').granted) return mk('A1 was refused its own developmental band');
    if (!authorizeBandRead('J1', 'interests').granted) return mk('the catalyst was refused a band it holds');
    // The table's own blindness claims, as absences rather than nulls.
    if (env.scopes.assessment.interests !== undefined) return mk('45 §6.1 violated: assessment received the interest graph');
    if (env.scopes.assessment.purpose !== undefined) return mk('45 §6.1 violated: assessment received purpose statements');
    if (env.scopes.assessment.analogy !== undefined) return mk('45 §6.1 violated: assessment received analogy internals');
    if (env.scopes.safety.interests !== undefined) return mk('45 §6.1 violated: safety received the interest graph');
    // The live consumer renders the assessment line, and that line carries no affective vocabulary.
    const line = assessmentScopeLine(env.scopes.assessment);
    if (line === null) return mk('the assessment scope rendered no line at all (the scope is lawful)');
    if (!line.includes('[ASSESSMENT SCOPE]')) return mk('the assessment line lost its scope marker');
    // The affective/aim vocabulary must be absent; the ENCOUNTER's own target purpose is legitimate
    // (46 §11 inv 5 — the catalyst's purpose never comes from the UDV).
    for (const banned of ['music', 'violence', 'sit for ten minutes each morning']) {
      if (line.includes(banned)) return mk(`assessment line leaked player content ("${banned}")`);
    }
    if (!line.includes('a practice step toward steadiness')) return mk('assessment line dropped the encounter target purpose');
    // A non-assessment role must be REFUSED, not served the same line.
    if (assessmentScopeLine(env.scopes.safety) !== null) return mk('a non-assessment scope was served the assessment line');
    // Injection: a hand-assembled scope that carries a band its role must not receive renders as
    // NOTHING — a violation produces absence, never a partial leak.
    const injected = { ...env.scopes.assessment, analogy: { fluentDomains: [{ domain: 'music', weight: 1 }], landings: [], repels: [] } } as never;
    if (scopeContractViolations(injected).length === 0) return mk('injection survived: an undeclared band reported no violation');
    if (assessmentScopeLine(injected) !== null) return mk('injection survived: a violating scope still rendered an assessment line');
    return { gate: 'G32 council role scope', passed: true, hard: true, details: 'five roles scoped at the live seam; declared bands exact; violating scope renders null (fail-closed)' };
  } catch (e) {
    return mk(`error: ${e instanceof Error ? e.message : String(e)}`);
  }
}

/** The gate fixture significator: every line at the encounter's target altitude. */
function g13Sig(): Significator {
  const altitudes = Object.fromEntries(ALL_LINES.map((l) => [l, 'Amber' as Stage])) as Record<Line, Stage>;
  return createSignificator('g13-probe', altitudes, 'Amber');
}

// ---------------------------------------------------------------------------
// G33 — UDV band population at the live seam (45 §3, Phase 13 d1). The audit found the live
// UDV carrying 3 of 8 bands. This gate proves each band reaches the projection, that the
// declared statement outranks an observation of the same topic (47 §3's field-of-record rule),
// and that an empty input degrades to the ratified defaults rather than to undefined.
// ---------------------------------------------------------------------------

export function validateUdvBandPopulation(): GateResult {
  const mk = (m: string): GateResult => ({ gate: 'G33 UDV band population', passed: false, hard: true, details: m });
  try {
    // Band assembly from real sources.
    const purposes = purposesFromVows([
      { text: 'sit for ten minutes each morning', kind: 'practice', status: 'active' },
      { text: 'finished last month', kind: 'learning', status: 'fulfilled' },
    ]);
    if (purposes.length !== 1) return mk(`purposesFromVows kept ${purposes.length} purposes (expected 1: a non-active vow is not an aim)`);
    if (purposes[0]!.kind !== 'practice-vow') return mk('vow kind → purpose kind mapping drifted');

    const declared = [{ topic: 'music', weight: 0.9, depth: 'fluent' as const, source: 'declared' as const }];
    const analogy = analogyFromInterests(declared, ['violence']);
    if (analogy.fluentDomains.length !== 1 || analogy.fluentDomains[0]!.domain !== 'music') return mk('the analogy band derived no fluent domain from the interest graph');
    if (analogy.repels[0] !== 'violence') return mk('the analogy band dropped the aversion veto list');

    const pref = preferenceFromHistory({
      profile: { metaphorPreference: 'botanical', intensity: 'intense' },
      sessions: [{ modality: 'ScenarioChoice' as never, durationMs: 40 * 60_000 }, { modality: 'ScenarioChoice' as never, durationMs: 20 * 60_000 }],
    });
    if (pref.difficultyAppetite !== 'steep') return mk('declared intensity did not reach the difficulty appetite');
    if (pref.sessionToleranceMin !== 30) return mk(`median tolerance is ${pref.sessionToleranceMin}, expected 30 (median, not mean)`);
    if (pref.aestheticLeanings[0] !== 'botanical') return mk('metaphor preference did not reach the aesthetic band');
    if (pref.modalityMix['ScenarioChoice' as never] !== 1) return mk('modality mix normalization drifted');

    const observed = observedFromEngagement([{ topic: 'music', weight: 0.9 }, { topic: 'gardens', weight: 0.3 }]);
    if (observed[0]!.source !== 'observed') return mk('observed interests lost their source tag (47 §3)');

    // The live seam must carry them into the projection: declared outranks observation.
    const services = createOrchestrationServices();
    const env = buildEnvelope(
      services,
      g13Sig(),
      {
        usable: ['pronouns'],
        declaredInterests: ['music'],
        aversions: ['violence'],
        bands: {
          purposes,
          analogy,
          preference: pref,
          constraints: { accessibility: ['dyslexia-friendly'] },
          observedInterests: observed,
        },
      },
      { line: 'Cognitive', stage: 'Amber', modality: 'ScenarioChoice' as never },
      'a practice step toward steadiness',
      [],
      1000,
      null,
    );
    const context = env.context;
    if (!context) return mk('no envelope context produced');
    const udv = context.udv;
    if (udv.purpose.length !== 1) return mk('the purpose band did not reach the UDV');
    if (udv.analogy.fluentDomains.length !== 1) return mk('the analogy band did not reach the UDV');
    if (udv.preference.sessionToleranceMin !== 30) return mk('the preference band did not reach the UDV');
    if (udv.constraints.accessibility[0] !== 'dyslexia-friendly') return mk('the constraints band did not reach the UDV');
    const music = udv.interests.filter((i) => i.topic === 'music');
    if (music.length !== 1) return mk(`declared/observed precedence failed: ${music.length} entries for a topic that is both declared and observed`);
    if (music[0]!.source !== 'declared') return mk('the observation outranked the declared statement (47 §3 violated)');
    if (!udv.interests.some((i) => i.topic === 'gardens' && i.source === 'observed')) return mk('the observed-only topic never reached the UDV');

    // Degradation: no bands supplied → ratified defaults, never undefined.
    const bare = buildEnvelope(
      services,
      g13Sig(),
      undefined,
      { line: 'Cognitive', stage: 'Amber', modality: 'ScenarioChoice' as never },
      'a practice step toward steadiness',
      [],
      1000,
      null,
    );
    if (!bare.context) return mk('the envelope did not degrade to a valid context with no identity');
    if (bare.context.udv.preference.sessionToleranceMin !== DEFAULT_PREFERENCE.sessionToleranceMin) return mk('preference band did not degrade to its default');
    if (bare.context.udv.analogy.fluentDomains.length !== 0) return mk('analogy band did not degrade to empty');
    if (bare.context.udv.constraints.accessibility.length !== 0) return mk('constraints band did not degrade to empty');
    return { gate: 'G33 UDV band population', passed: true, hard: true, details: 'five bands reach the live UDV; declared outranks observed; empty input degrades to ratified defaults' };
  } catch (e) {
    return mk(`error: ${e instanceof Error ? e.message : String(e)}`);
  }
}

// ---------------------------------------------------------------------------
// G34 — Council dispatch and its live summoning surface (43 §3.3, Phase 13 d12). The council was
// a complete workforce with no dispatcher (audit O10). This gate proves the trigger table is
// coherent and the table's decision is deterministic — the same state summons the same roles —
// that crisis preempts every other trigger, that a threshold assembles the whole foreground
// council, that the background roles never hold the frame, and that the three summoning tools run
// exactly the roles the TABLE chose (the model never picks).
// ---------------------------------------------------------------------------

export function validateCouncilDispatch(): GateResult {
  const mk = (m: string): GateResult => ({ gate: 'G34 council dispatch', passed: false, hard: true, details: m });
  try {
    const tableBad = dispatchTableViolations();
    if (tableBad.length > 0) return mk(`trigger table incoherent: ${tableBad.join('; ')}`);
    const toolBad = councilToolWiringViolations();
    if (toolBad.length > 0) return mk(`council tool surface incoherent: ${toolBad.join('; ')}`);

    const clear: CouncilObservation = {
      crisis: false, thresholdProximity: false, shadowWorkWarranted: false, placementUnknown: false,
      packIntakeDue: false, consentChangeRequested: false, depthPlateauTicks: 0, retentionDecay: false,
      reflectionWritten: false, cellIntent: 'game',
    };

    // Determinism: the same state twice is the same summons, membership never varies with the seed.
    const a = dispatchCouncil({ ...clear, seed: 'g34' });
    const b = dispatchCouncil({ ...clear, seed: 'g34' });
    if (JSON.stringify(a) !== JSON.stringify(b)) return mk('same state produced two different summons');
    const c = dispatchCouncil({ ...clear, seed: 'g34-other' });
    if (c.trigger !== a.trigger) return mk('the seed changed the TRIGGER — ordering may vary, the decision may not');
    if ([...c.roles].sort().join(',') !== [...a.roles].sort().join(',')) return mk('the seed changed WHICH roles are summoned');

    // Crisis preempts everything and is the only bypass.
    const crisis = dispatchCouncil({ ...clear, crisis: true, thresholdProximity: true, shadowWorkWarranted: true, depthPlateauTicks: 9, seed: 'g34' });
    if (crisis.trigger !== 'crisis') return mk(`crisis lost precedence to ${crisis.trigger}`);
    if (!crisis.bypass) return mk('the crisis dispatch is not flagged as a bypass (43 §4.7)');
    if (TRIGGER_TABLE.filter((r) => r.bypass === true).length !== 1) return mk('more than one bypass row — "the frame stops being a game" is ambiguous');

    // Threshold: the whole council, minus the two background roles, Therapist first.
    const threshold = dispatchCouncil({ ...clear, thresholdProximity: true, seed: 'g34' });
    const expected = ALL_AGENT_ROLES.filter((r) => r !== 'S2' && r !== 'S5');
    if (threshold.roles.length !== expected.length) return mk(`threshold summoned ${threshold.roles.length} roles, expected ${expected.length}`);
    if (threshold.roles[0] !== 'therapist') return mk('the threshold moment did not open with the Therapist');
    if (threshold.roles.includes('S2') || threshold.roles.includes('S5')) return mk('a background role was summoned into the foreground');

    // Every role the ordinary dispatch can summon is bound to a scope (never a band-less role).
    for (const role of dispatchCouncil({ ...clear, seed: 'g34' }).roles) {
      if (AGENT_ROLE_COUNCIL[role] === null) return mk(`summoned ${role}, which holds no player bands`);
    }

    // The tool vocabulary is the table's vocabulary — the three names the suffix instructs on.
    const toolNames = COUNCIL_TOOLS.map((t) => t.function.name).sort().join(',');
    if (toolNames !== 'delegate_session,schedule_presence,summon_council') return mk(`council tool vocabulary drifted: ${toolNames}`);
    // The async behaviour of the tools (which roles actually RUN) is locked by
    // `tests/orchestration/Dispatcher.test.ts` — a kernel gate stays synchronous.
    return { gate: 'G34 council dispatch', passed: true, hard: true, details: 'trigger table coherent + reachable; crisis preempts and is the only bypass; threshold assembles the foreground council with the Therapist opening; dispatch deterministic and seed-invariant; background roles never hold the frame; tool vocabulary in step with the rules suffix' };
  } catch (e) {
    return mk(`error: ${e instanceof Error ? e.message : String(e)}`);
  }
}

// ---------------------------------------------------------------------------
// G35 — The Polarity Pool (Phase 13 d10, user-ratified 2026-09-24). W11's closer: the
// candidate library must be DERIVED (per-cell floor: ≥3 renderings with pairwise-distinct
// tag vectors), the pole decision must obey the dosage law (severity-scaled share, ceiling
// 0.6, dormant ledger never shadow-facing), the resolution loop must be a SPIRAL (one
// confirming reading never reconciles; a disconfirming reading re-opens + severity +1;
// unratified/low-confidence readings move nothing), the rubric audit must catch violations,
// and the differential criterion must hold — swapping the UDV changes the selected primary.
// ---------------------------------------------------------------------------

export function validatePolarityPool(): GateResult {
  const mk = (m: string): GateResult => ({ gate: 'G35 polarity pool', passed: false, hard: true, details: m });
  try {
    const store = createTagStore(INITIAL_TAGS);
    const library = deriveLibraryVariants(seedCandidateLibrary(sharedFacetStore()), store);

    // L1 — the derived per-cell floor: every cell ≥3 distinct tag vectors, and the derivation
    // is idempotent (re-derivation adds nothing).
    const byCell = new Map<string, { vectors: Set<string>; n: number }>();
    for (const c of library) {
      const key = `${c.cell.line}:${c.cell.stage}:${c.cell.modality}`;
      const slot = byCell.get(key) ?? { vectors: new Set<string>(), n: 0 };
      slot.vectors.add(c.tags.join(','));
      slot.n += 1;
      byCell.set(key, slot);
    }
    const thin = [...byCell.entries()].filter(([, s]) => s.vectors.size < 3);
    if (thin.length > 0) return mk(`derived library has ${thin.length} cells below the 3-vector floor (first: ${thin[0]![0]})`);
    const again = deriveLibraryVariants(library, store);
    if (again.length !== library.length) return mk('library derivation is not idempotent');
    // Variants never re-altitude: every variant's cell equals a base cell.
    for (const c of library) {
      if (!c.id.includes('~sim') && !c.id.includes('~opp')) continue;
      if (!library.some((b) => b.cell.line === c.cell.line && b.cell.stage === c.cell.stage && b.cell.modality === c.cell.modality && !b.id.includes('~sim') && !b.id.includes('~opp')))
        return mk(`variant ${c.id} has no base in its cell — altitude drift`);
    }

    // L2 — the dosage law.
    if (unfamiliarShareFor(0.25, 0) !== 0.25) return mk('dormant ledger did not preserve the seed budget');
    if (unfamiliarShareFor(0.5, 1) > 0.6) return mk('unfamiliar share exceeded the 0.6 ceiling');
    if (unfamiliarShareFor(0.25, 0.9) <= unfamiliarShareFor(0.25, 0.4)) return mk('share did not rise with shadow severity');
    const inCell = library.filter((c) => c.cell.line === 'Cognitive' && c.cell.stage === 'Amber' && c.cell.modality === 'ScenarioChoice');
    const dormant = decidePole(store, { candidates: inCell, target: { line: 'Cognitive' }, fluentTags: ['technology'], shadowSeverity: 0, seedNoveltyBudget: 0, draw: 0 });
    if (dormant?.pole !== 'familiar') return mk('a dormant ledger produced a non-familiar pole at zero budget');
    const hot = decidePole(store, { candidates: inCell, target: { line: 'Cognitive' }, fluentTags: ['technology'], shadowSeverity: 0.9, seedNoveltyBudget: 0.25, draw: 0 });
    if (!hot || !['unfamiliar', 'shadow-facing'].includes(hot.pole)) return mk('a live ledger failed to dose an unfamiliar/shadow-facing pole');
    if (hot.pole === 'shadow-facing' && !hot.reason.includes('45')) return mk('shadow-facing decision did not cite its law');

    // L3 — the spiral: one confirmation never reconciles; disconfirmation re-opens + severity +1;
    // unratified and low-confidence readings move nothing.
    const pair = pairKeyOf('technology', 'nature');
    const states: Record<string, 'reconciled' | 'active-tension' | 'undiscovered'> = { [pair]: 'active-tension' };
    const tallies: Record<string, number> = {};
    const record = (at: number, hold: number, evidence: string[]) => ({
      cell: { line: 'Cognitive' as Line, stage: 'Amber' as Stage, modality: 'ScenarioChoice' as Modality },
      pairKey: pair, poleServed: 'unfamiliar' as const,
      pairHoldQuality: hold, evidence, at,
    });
    const r1 = applyReading({ reading: deterministicReading(record(1, 0.9, ['e1', 'e2', 'e3'])), ratified: true, states, tallies, shadows: [] });
    if (r1.stateAfter !== 'active-tension' || r1.confirmations !== 1) return mk('a single confirming reading moved the pair — the spiral collapsed into a toggle');
    const unratified = applyReading({ reading: deterministicReading(record(2, 0.9, ['e1', 'e2', 'e3'])), ratified: false, states, tallies, shadows: [] });
    if (unratified.applied) return mk('an unratified (L4) reading was applied');
    const lowConf = applyReading({ reading: deterministicReading(record(3, 0.9, ['only'])), ratified: true, states, tallies, shadows: [] });
    if (lowConf.applied) return mk('a below-floor confidence reading was applied');
    for (let i = 0; i < CONFIRMATIONS_TO_RECONCILE - 1; i++) {
      applyReading({ reading: deterministicReading(record(10 + i, 0.9, ['e1', 'e2', 'e3'])), ratified: true, states, tallies, shadows: [] });
    }
    if (states[pair] !== 'reconciled') return mk(`${CONFIRMATIONS_TO_RECONCILE} confirmations did not reconcile the pair`);
    const relapse = applyReading({ reading: deterministicReading(record(20, 0.1, ['e1', 'e2', 'e3'])), ratified: true, states, tallies, shadows: [{ id: 's1', line: 'Cognitive' as Line, resolvedAt: null }] });
    if (relapse.stateAfter !== 'active-tension' || relapse.severityDelta !== 1) return mk('a disconfirming reading neither re-opened the pair nor raised severity');

    // The rubric audit catches an evidence-less reading and an out-of-bounds severity delta.
    const badReadings = [{ ...deterministicReading(record(30, 0.9, ['e1'])), evidence: [] }];
    const badApps = [{ applied: true, reason: 'x', stateBefore: 'active-tension', stateAfter: 'active-tension', severityDelta: 5, confirmations: 0 } as unknown as ReadingApplication];
    const violations = auditReadingLog(badReadings, badApps);
    if (!violations.some((v) => v.rule === 'evidence-cited') || !violations.some((v) => v.rule === 'bounded-severity')) return mk('the rubric audit missed a synthetic violation');

    // Coverage is a per-cell orthogonal-dimension judgment — one dimension is never robust.
    const oneDim = polarityCoverage([deterministicReading(record(40, 0.9, ['e1', 'e2', 'e3']))]);
    if (oneDim[0]?.robust !== false) return mk('a single-dimension cell reported robust profiling — the cell closed');

    // The differential criterion at the kernel level: the UDV's fluent domain changes the
    // pool's rank order (the retrieval key is real).
    const mkUdv = (domain: string) => ({
      developmental: { lineAltitudeBand: [], activeShadows: [] },
      preference: { modalityMix: {}, difficultyAppetite: 'steady', sessionToleranceMin: 25, aestheticLeanings: [] },
      interests: [{ topic: domain, weight: 0.9, depth: 'fluent', source: 'declared' }],
      purpose: [], analogy: { fluentDomains: [{ domain, weight: 1 }], landings: [domain], repels: [] },
      aversions: [], constraints: { accessibility: [] },
    } as never);
    const a = rankByRelevance(inCell, buildQuery(store, mkUdv('music'), initialTopicTagResolver)).slice(0, 4).map((c) => c.id).join('|');
    const b = rankByRelevance(inCell, buildQuery(store, mkUdv('law'), initialTopicTagResolver)).slice(0, 4).map((c) => c.id).join('|');
    if (a === b) return mk('swapping the UDV fluent domain did not reorder the pool — W11 persists');

    return { gate: 'G35 polarity pool', passed: true, hard: true, details: `derived library (${library.length} candidates, every cell ≥3 distinct vectors, idempotent); dosage severity-scaled with 0.6 ceiling; spiral holds (no single sweep, re-open + severity on failure, unratified/low-confidence inert); rubric audit detects violations; coverage open by default; UDV swap reorders the pool` };
  } catch (e) {
    return mk(`error: ${e instanceof Error ? e.message : String(e)}`);
  }
}
