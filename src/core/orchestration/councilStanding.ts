/**
 * The council binding and the standing context — `43 §4.2` (the workforce) × `45 §6.1` (the
 * visibility scopes), implemented as one contract. Phase 13 d11
 * (`docs/audits/COUNCIL-ORTHOGONALITY-AUDIT-2026-09-24.md` §4–§6).
 *
 * Three things live here, and each closes a specific audit finding:
 *
 * 1. **The binding** (`AGENT_ROLE_COUNCIL`, finding O9). Every agent role is mapped to the scope it
 *    receives, or to `null` when it receives no player bands at all. A role with no binding runs
 *    unscoped — that was the state of the whole council before this module.
 * 2. **The read grants** (`BAND_READ_GRANTS` + `authorizeBandRead`) — what a role may read BEYOND
 *    its standing view, and why a refusal is a first-class outcome rather than an error.
 * 3. **The standing block** (`renderStandingBlock`) — the context every deployed agent carries
 *    in-window: its mandate, its view, its boundaries, its tools and its session. The user's ruling
 *    of 2026-09-24 made this mandatory: in a long-running loop the agent must always know who it is
 *    without asking, and must be able to reach more through authorized tools when it needs to audit,
 *    review or refactor its own mandate.
 *
 * Laws held here (none new — all from 43/45):
 * - **L4** — nothing in this module writes state. Reads only.
 * - **`45 §6.1`'s rule** — the more metric-bearing the role, the less it sees. `BAND_READ_GRANTS`
 *   may never grant a band the scope table withholds: the grants are checked against the binding.
 * - **The Veil (`20`, `43 §3.4`)** — every rendered line passes the banded-language guard. A
 *   standing block that would carry a stage label or a score renders as NOTHING for that line.
 */

import type { AgentRole, DelegatedTool } from './types.js';
import { isToolAllowedFor } from './types.js';
import type { CouncilRole, ScopedEnvelope, UdvBand } from '../personalization/scenarioContext.js';
import { ROLE_SCOPES } from '../personalization/scenarioContext.js';
import { isBandedText } from '../memory/retrievalFirewall.js';

/**
 * The binding (audit §6 step 1; `45 §6.1`'s rows × `43 §4.2`'s roles).
 *
 * `null` means the role receives NO player bands — the two roles that legitimately hold none:
 * **S2** (the Context Steward, who ASSEMBLES envelopes rather than receiving one) and **S5** (the
 * Ops agent, whose subject is the infrastructure, not the player). Everything else is mapped.
 */
export const AGENT_ROLE_COUNCIL: Readonly<Record<AgentRole, CouncilRole | null>> = Object.freeze({
  // The Journey-Guides embody the encounter — the catalyst's own view.
  J1: 'scenario-catalyst',
  J2: 'scenario-catalyst',
  J3: 'scenario-catalyst',
  J5: 'scenario-catalyst',
  // Healing: the shadow-work pair (Therapist proposes, J4 delivers — audit O2).
  J4: 'healing',
  therapist: 'healing',
  // Teacher council + the curriculum aligner: transfer targets, never analogy internals.
  T1: 'curriculum-teacher',
  T2: 'curriculum-teacher',
  T3: 'curriculum-teacher',
  S3: 'curriculum-teacher',
  // Assessor council + the pack operator: bands + catalyst target, never affinities.
  A1: 'assessment',
  A2: 'assessment',
  A3: 'assessment',
  A4: 'assessment',
  S1: 'assessment',
  // The consent surface and the crisis path.
  S4: 'safety',
  // No player bands: the producer and the operator.
  S2: null,
  S5: null,
});

/**
 * Every agent role, in the binding table's declared order (J → healing → T → A → S).
 * Exported so the dispatcher and the gates iterate one vocabulary instead of re-spelling it.
 */
export const ALL_AGENT_ROLES = Object.keys(AGENT_ROLE_COUNCIL) as readonly AgentRole[];

/**
 * What each role may read ON REQUEST, beyond its standing view (43 §5.6's `read_band`).
 *
 * This is deliberately NARROWER than "whatever its scope contains" in the cases that matter: the
 * assessment role may re-read its developmental band all session long, but it can never request the
 * interest graph — the table withholds it, and a request is refused rather than granted. The
 * catalyst may request any band it already holds (it holds the full envelope); the healing pair may
 * request its own three; the producer and the operator may request nothing.
 */
export const BAND_READ_GRANTS: Readonly<Record<AgentRole, readonly UdvBand[]>> = Object.freeze({
  J1: ['preference', 'analogy', 'purpose', 'developmental', 'interests', 'aversions', 'constraints'],
  J2: ['preference', 'analogy', 'purpose', 'developmental', 'interests', 'aversions', 'constraints'],
  J3: ['preference', 'analogy', 'purpose', 'developmental', 'interests', 'aversions', 'constraints'],
  J5: ['preference', 'analogy', 'purpose', 'developmental', 'interests', 'aversions', 'constraints'],
  J4: ['aversions', 'developmental', 'purpose'],
  therapist: ['aversions', 'developmental', 'purpose'],
  T1: ['developmental', 'purpose', 'constraints'],
  T2: ['developmental', 'purpose', 'constraints'],
  T3: ['developmental', 'purpose', 'constraints'],
  S3: ['developmental', 'purpose'],
  A1: ['developmental'],
  A2: ['developmental'],
  A3: ['developmental'],
  A4: ['developmental'],
  S1: ['developmental'],
  S4: ['aversions'],
  S2: [],
  S5: [],
});

export interface BandReadVerdict {
  readonly granted: boolean;
  /** Never empty: a grant states what it grants, a refusal states why (43 §5.6). */
  readonly reason: string;
}

/**
 * Authorize one band read. Fails closed on every axis:
 * - an unmapped role (defensive — the type system prevents it) is refused;
 * - a role bound to `null` is refused with the reason that it holds no player bands;
 * - a band the role's SCOPE does not receive is refused **even if it appears in a grant list** (the
 *   table is the law; the grants are the convenience);
 * - a grant that would widen the table is therefore inert by construction.
 */
export function authorizeBandRead(role: AgentRole, band: UdvBand): BandReadVerdict {
  const scope = AGENT_ROLE_COUNCIL[role];
  if (scope === undefined) return { granted: false, reason: `unknown role '${role}'` };
  if (scope === null) {
    return { granted: false, reason: `${role} holds no player bands (it ${role === 'S2' ? 'assembles envelopes' : 'operates the infrastructure'}), so there is nothing to read` };
  }
  const receives = ROLE_SCOPES[scope].receives as readonly UdvBand[];
  if (!receives.includes(band)) {
    return { granted: false, reason: `the ${scope} scope withholds '${band}' (45 §6.1) — the refusal is recorded, not silent` };
  }
  const grants = BAND_READ_GRANTS[role];
  if (!grants.includes(band)) {
    return { granted: false, reason: `${role} is not granted '${band}' beyond its standing view` };
  }
  return { granted: true, reason: `granted: ${band} (within the ${scope} scope)` };
}

/** The tools this role holds: its own allowlist plus the universal read surface (43 §4.3/§5.6). */
export function toolsForRole(role: AgentRole): readonly DelegatedTool[] {
  const all: DelegatedTool[] = [
    'get_concept', 'get_prereq_gaps', 'propose_mastery_evidence', 'propose_retention_estimate',
    'propose_trajectory', 'get_staircase_state', 'get_reflection_corpus', 'review_practice',
    'pack_administer', 'pack_score', 'propose_placement', 'get_module_spec', 'get_polarity_texture',
    'record_encounter', 'propose_shadow_entry', 'report_threshold_signal',
    'get_shadow_ledger_projection', 'propose_shadow_work', 'note_arc', 'read_identity_consent',
    'assemble_healing_context', 'propose_alignment_adjustment', 'consent_inform',
    'run_benchmark_tier', 'registry_health', 'read_my_scope', 'read_band',
  ];
  return all.filter((t) => isToolAllowedFor(role, t));
}

/**
 * Secondary scopes — a role may render through more than one view when its work has two faces.
 *
 * Found by G32 on first run (2026-09-24): the `narrative-voice` scope had NO bound agent, making it
 * an inert row. The resolution is not to invent a voice agent but to bind the row to the roles that
 * actually DO the voicing: the Journey-Guides (and the Therapist in its in-world voice) render the
 * encounter narration, so they are bound primarily to `scenario-catalyst` and secondarily to
 * `narrative-voice` — which is also why the voice row withholds developmental numbers: the same
 * agent must not narrate from measurements.
 */
export const AGENT_ROLE_SECONDARY_SCOPES: Readonly<Partial<Record<AgentRole, readonly CouncilRole[]>>> = Object.freeze({
  J1: ['narrative-voice'],
  J2: ['narrative-voice'],
  J3: ['narrative-voice'],
  J4: ['narrative-voice'],
  J5: ['narrative-voice'],
  therapist: ['narrative-voice'],
});

/** Every scope a role may render through — its primary binding plus any secondary one. */
export function scopesForRole(role: AgentRole): readonly CouncilRole[] {
  const primary = AGENT_ROLE_COUNCIL[role];
  const secondary = AGENT_ROLE_SECONDARY_SCOPES[role] ?? [];
  return primary ? [primary, ...secondary] : [...secondary];
}

/** What the standing block needs — deliberately small, so any caller can assemble it. */
export interface StandingBlockInput {
  readonly role: AgentRole;
  /** The role's scoped envelope (`buildEnvelope(...).scopes[bound]`), when one was produced. */
  readonly scope?: ScopedEnvelope;
  readonly sessionId: string;
  readonly delegationId: string;
  /** 43 §5.1's eager reading: this role's prior delegations, most recent first. */
  readonly priorSessions?: readonly string[];
}

/** One band's standing line — how many entries and, when safe, their names. */
function bandLine(band: UdvBand, scope: ScopedEnvelope): string | null {
  switch (band) {
    case 'interests': {
      const topics = (scope.interests ?? []).map((i) => i.topic).filter((t) => t.length > 0);
      return topics.length > 0 ? `interests: ${topics.slice(0, 6).join(', ')}` : 'interests: none declared';
    }
    case 'purpose': {
      const aims = (scope.purpose ?? []).map((p) => p.statement).filter((s) => s.length > 0);
      return aims.length > 0 ? `aims: ${aims.slice(0, 3).join('; ')}` : 'aims: none stated';
    }
    case 'analogy': {
      const domains = (scope.analogy?.fluentDomains ?? []).map((d) => d.domain);
      return domains.length > 0 ? `fluent domains: ${domains.slice(0, 5).join(', ')}` : 'fluent domains: none known';
    }
    case 'preference': {
      const p = scope.preference;
      if (!p) return null;
      const modes = Object.keys(p.modalityMix ?? {});
      return `preference: appetite ${p.difficultyAppetite}${modes.length > 0 ? `, draws toward ${modes.join('/')}` : ''}`;
    }
    case 'constraints': {
      const a = scope.constraints?.accessibility ?? [];
      return a.length > 0 ? `constraints: ${a.join(', ')}` : 'constraints: none declared';
    }
    case 'developmental': {
      const bands = (scope.developmental?.lineAltitudeBand ?? []).map((b) => `${b.line} ${b.band}`);
      return bands.length > 0 ? `placement (banded): ${bands.join(', ')}` : 'placement (banded): unplaced';
    }
    case 'aversions': {
      const a = scope.aversions ?? [];
      return a.length > 0 ? `veto list: ${a.join(', ')}` : 'veto list: empty';
    }
    default:
      return null;
  }
}

/**
 * Render the standing block (43 §5.6). Every line is Veil-guarded: a line that would carry a stage
 * label, a score or a system-observation construction is DROPPED, not softened — the block is a
 * prompt surface, and the render-path law binds it exactly as it binds the envelope.
 *
 * The block is deterministic given its inputs (same scope + session ⇒ same lines), so it can be
 * replayed and asserted.
 */
export function renderStandingBlock(input: StandingBlockInput): readonly string[] {
  const { role, scope } = input;
  const council = AGENT_ROLE_COUNCIL[role];
  const lines: string[] = [];

  lines.push(`[MY MANDATE] ${role}${council ? ` · council scope: ${council}` : ' · no player bands'}`);
  lines.push(`[MY MANDATE] the one thing I do: ${MANDATE_LINE[role]}; what I return: ${RETURN_LINE[role]}`);

  if (council === null) {
    lines.push('[MY VIEW] none — this role holds no player bands (45 §6.1)');
  } else if (!scope) {
    // Degradation (45 §5): an absent envelope is not an error, but the agent must know its view is
    // unpopulated rather than assume the player has no preferences.
    lines.push('[MY VIEW] envelope unavailable this deployment — behave as unpersonalized');
  } else {
    const receives = ROLE_SCOPES[council].receives as readonly UdvBand[];
    const rendered = receives.map((b) => bandLine(b, scope)).filter((l): l is string => l !== null);
    if (rendered.length === 0) lines.push('[MY VIEW] no bands populated this deployment');
    for (const r of rendered) lines.push(`[MY VIEW] ${r}`);
    // The encounter this role serves, stated WITHOUT its stage label. `assessmentScopeLine` (45 §6.1)
    // may name the cell because it is a dashboard line for the metric-bearing role; this block is a
    // PROMPT surface, and the same Veil guard that filters every other line here would drop a stage
    // name anyway — so the block names the line and the modality and lets the encounter block (which
    // the orchestrator assembles separately) carry the register. Fail-closed by construction, not by
    // hoping the filter catches it.
    const t = scope.catalystTarget;
    lines.push(`[MY VIEW] the encounter I serve: ${t.line} line, ${t.modality} modality — ${t.purpose}`);
  }

  const mustNot = council ? ROLE_SCOPES[council].mustNotReceive : [];
  lines.push(`[MY BOUNDARIES] I must not receive: ${mustNot.length > 0 ? mustNot.join(' · ') : 'nothing withheld (full envelope)'}`);
  lines.push('[MY BOUNDARIES] the Veil: I never assert a measurement, a score, or a stage name of the player');

  const tools = toolsForRole(role);
  lines.push(`[MY TOOLS] ${tools.join(', ')}`);
  const grants = BAND_READ_GRANTS[role];
  lines.push(`[MY TOOLS] read_band may reach: ${grants.length > 0 ? grants.join(', ') : 'nothing beyond my standing view'}`);

  lines.push(`[MY SESSION] ${input.sessionId} · delegation ${input.delegationId}`);
  if (input.priorSessions && input.priorSessions.length > 0) {
    lines.push(`[MY SESSION] my prior delegations with this player: ${input.priorSessions.slice(0, 3).join(', ')}`);
  }

  // The Veil guard, applied to every line (M4/R3 at the agent seam rather than the prompt seam).
  return lines.filter((l) => isBandedText(l));
}

/** The one thing each role does — 43 §4.2's "foreground behavior" column, one line each. */
const MANDATE_LINE: Readonly<Record<AgentRole, string>> = Object.freeze({
  T1: 'explain one concept until it lands', T2: 'recover a fading band', T3: 'prescribe what to study next',
  A1: 'probe this cell for evidence', A2: 'reflect the player\'s own words back', A3: 'judge an instrument',
  A4: 'place difficulty', J1: 'run this cell\'s encounter', J2: 'run a bounded ordeal',
  J3: 'probe a suspected imbalance', J4: 'sit with the heavy thing', J5: 'walk the threshold',
  therapist: 'hold the healing frame', S1: 'operate a pack', S2: 'assemble envelopes',
  S3: 'align syllabus to engine', S4: 'execute consent', S5: 'keep the loop healthy',
});

/** What each role returns — 43 §4.2's return contract, one line each. */
const RETURN_LINE: Readonly<Record<AgentRole, string>> = Object.freeze({
  T1: 'mastery evidence', T2: 'retention estimate', T3: 'a trajectory proposal',
  A1: 'depth evidence', A2: 'qualitative narrative', A3: 'a reliability verdict',
  A4: 'placement parameters', J1: 'an encounter record', J2: 'measurement records',
  J3: 'shadow-surfacing evidence', J4: 'resolution evidence', J5: 'threshold counsel',
  therapist: 'a shadow-work proposal', S1: 'a scored trial record', S2: 'a projected envelope',
  S3: 'an alignment proposal', S4: 'a consent record', S5: 'an ops report',
});
