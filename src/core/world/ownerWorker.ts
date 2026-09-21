/**
 * The per-holon owner worker — 22 §7.5 / MY-AD-0009 (`docs/foundations/22-holon-context-engine.md`).
 *
 * World-side state needs a writer without a global bottleneck: EACH holon has exactly ONE owning
 * worker, and that worker is its single writer (the local single-writer law — two writers over one
 * holon is a violation, exactly as two writers over the Significator would be under 43 W2).
 *
 * The three layers of §7.4 it maintains for its holon:
 * - L1 — the event ledger: append-only `ConsequenceRecord`s keyed (holonId, …). Owned by the
 *   caller (the World Consequence Ledger); this module only READS events for its holon.
 * - L2 — the live profile: the worker commits `driveState`/`shadowState`/`polarity`/
 *   `relationships` deltas from L1 events under §7.2's caps (±0.3/encounter) and world inertia.
 * - L3 — compressed memory: recency + archetypal pattern compression + relationship anchors,
 *   2–5 sentences in the holon's own voice — this is what generation consumes.
 *
 * Orchestrator boundary (§7.5): anything that affects the PLAYER is a Proposal ratified through
 * L4 — the world may write itself, but it may not unilaterally write the player. Owner-committed
 * L2 deltas ride the reporting feed as `proposalsOwnerCommitted` — recorded there, never ratified
 * there (43 §5.5 W2).
 *
 * Offline degradation: every commit is a pure function of (events, profile) — no LLM, no clock —
 * so the pipeline degrades to deterministic ledger replay and the world never forgets because a
 * worker didn't run.
 */

import type { ConsequenceRecord } from '../domain/ConsequenceRecord.js';
import type { Holon, HolonDriveState } from './Holon.js';
import type { EnergeticDirection } from '../domain/enums.js';

/** §7.2 rule 1 — no single numeric delta exceeds ±0.3 per encounter. */
export const MAX_DELTA_PER_ENCOUNTER = 0.3;
/** §7.4 L3 — recency window for the compressed digest. */
export const RECENT_EVENT_WINDOW = 3;

/** An archetypal pattern class for L3 compression (§7.4 L3). */
export type PatternClass =
  | 'betrayal' | 'debt' | 'gratitude' | 'vengeance'
  | 'alliance' | 'abandonment' | 'sacrifice' | 'reconciliation';

/** The worker's own view of its holon's evolving profile (L2). */
export interface HolonProfile {
  readonly holonId: string;
  readonly driveState: HolonDriveState;
  /** Rolling numeric state the §7.2 caps bind: drive intensities and relationship strengths. */
  readonly intensities: Readonly<Record<string, number>>;
  readonly polarity: EnergeticDirection;
  readonly relationships: readonly string[];
  /** Archetypal pattern classes accumulated from the holon's history (L3 compression). */
  readonly patterns: readonly { readonly kind: PatternClass; readonly withHolonId: string | null; readonly at: number }[];
  /** How many events this profile has absorbed — monotonic, the replay completeness marker. */
  readonly appliedEventCount: number;
}

export function createHolonProfile(holon: Holon): HolonProfile {
  const intensities: Record<string, number> = {
    [`drive:${holon.drives.dominant}`]: 0.6,
    [`drive:${holon.drives.secondary}`]: 0.4,
  };
  for (const rel of holon.relationships) intensities[`rel:${rel}`] = 0.3;
  return {
    holonId: holon.id,
    driveState: holon.drives,
    intensities,
    polarity: holon.polarity,
    relationships: [...holon.relationships],
    patterns: [],
    appliedEventCount: 0,
  };
}

function clamp(v: number): number {
  return Math.max(0, Math.min(1, v));
}

/** Apply one cap: |new − old| ≤ MAX_DELTA_PER_ENCOUNTER per encounter per key. */
function applyCapped(intensities: Record<string, number>, key: string, delta: number): void {
  const bounded = Math.max(-MAX_DELTA_PER_ENCOUNTER, Math.min(MAX_DELTA_PER_ENCOUNTER, delta));
  intensities[key] = clamp((intensities[key] ?? 0.5) + bounded);
}

/** Classify one consequence event into an L3 archetypal pattern (deterministic). */
export function classifyPattern(rec: ConsequenceRecord, holonId: string): PatternClass | null {
  const text = rec.narrativeSummary.toLowerCase();
  const isSubject = rec.holonDeltas.some((d) => d.holonId === holonId);
  if (!isSubject) return null;
  if (/betray|deceiv|turn(ed)? against|double-cross/.test(text)) return 'betrayal';
  if (/venge|retaliat|reprisal|revenge/.test(text)) return 'vengeance';
  if (/gratitude|thanked|indebted|saved (them|him|her)|aided/.test(text)) return 'gratitude';
  if (/debt|owed|owe|obligation|loan/.test(text)) return 'debt';
  if (/abandon|left (them|him|her)|desert/.test(text)) return 'abandonment';
  if (/sacrific|gave up|forfeit/.test(text)) return 'sacrifice';
  if (/alliance|joined forces|pact| allied/.test(text)) return 'alliance';
  if (/reconcil|mended|forgave|healed the rift/.test(text)) return 'reconciliation';
  return null;
}

/**
 * The owner worker's ONE commit path: drain the holon's L1 events into its L2 profile + L3
 * patterns. Pure: (events, profile) → new profile. Caps enforced per event (§7.2).
 */
export function commitEvents(
  profile: HolonProfile,
  events: readonly ConsequenceRecord[],
): { readonly profile: HolonProfile; readonly proposals: readonly OwnerProposal[] } {
  let intensities = { ...profile.intensities };
  let polarity = profile.polarity;
  let relationships = [...profile.relationships];
  const patterns = [...profile.patterns];
  const proposals: OwnerProposal[] = [];

  for (const rec of events) {
    // L2 — numeric deltas from this holon's own deltas in the record, capped per §7.2 rule 1.
    for (const d of rec.holonDeltas) {
      if (d.holonId !== profile.holonId) continue;
      const n = typeof d.newValue === 'number' ? d.newValue : null;
      const o = typeof d.oldValue === 'number' ? d.oldValue : null;
      if (n === null || o === null) {
        // Non-numeric field changes (e.g. a new relationship edge) — record the edge, no cap applies.
        if (d.field === 'relationship' && typeof d.newValue === 'string' && !relationships.includes(d.newValue)) {
          relationships = [...relationships, d.newValue];
          if (intensities[`rel:${d.newValue}`] === undefined) intensities[`rel:${d.newValue}`] = 0.3;
        }
        continue;
      }
      applyCapped(intensities, `field:${d.field}`, n - o);
    }

    // Player-facing effects are PROPOSALS, never direct writes (§7.5 orchestrator boundary):
    // a surfaced shadow or an altitude/drive shift in the record means the encounter moved the
    // player — the worker proposes the world's read of it; L4 ratifies.
    if (rec.shadowSurfaced !== null) {
      proposals.push({
        kind: 'shadow_entry',
        payload: { source: 'holon-owner', holonId: profile.holonId, shadow: rec.shadowSurfaced, encounterId: rec.encounterId },
        rationale: `holon ${profile.holonId}: encounter ${rec.encounterId} surfaced ${rec.shadowSurfaced} — owner-worker read, pending L4`,
      });
    }

    // L3 — archetypal compression.
    const pattern = classifyPattern(rec, profile.holonId);
    if (pattern) {
      const partner = rec.holonDeltas.map((d) => d.holonId).find((id) => id !== profile.holonId) ?? null;
      patterns.push({ kind: pattern, withHolonId: partner, at: rec.timestamp });
    }
  }

  const next: HolonProfile = {
    holonId: profile.holonId,
    driveState: profile.driveState,
    intensities,
    polarity,
    relationships,
    patterns: patterns.slice(-32), // bounded — L3 compresses, it does not accumulate raw
    appliedEventCount: profile.appliedEventCount + events.length,
  };
  return { profile: next, proposals };
}

/** A world-side proposal — the only thing the owner worker sends toward the player's record. */
export interface OwnerProposal {
  readonly kind: 'shadow_entry' | 'threshold_signal' | 'encounter_record';
  readonly payload: unknown;
  readonly rationale: string;
}

/** Does this worker own this holon? Single-writer assertion (§7.5). */
export function isOwner(workerHolonId: string, holonId: string): boolean {
  return workerHolonId === holonId;
}

/**
 * L3 digest — what generation consumes (§7.4): profile state + compressed history-with-player in
 * the holon's voice register. Deterministic; bounded to the recency window plus pattern classes.
 */
export function digest(profile: HolonProfile, holon: Holon): string {
  const hot = Object.entries(profile.intensities)
    .filter(([k, v]) => k.startsWith('field:') && (v > 0.65 || v < 0.35))
    .map(([k, v]) => `${k.slice(6)}=${v.toFixed(2)}`);
  const recentPatterns = profile.patterns.slice(-RECENT_EVENT_WINDOW).map((p) => p.kind);
  const parts = [
    `${holon.name} (${holon.kind}) — ${holon.narrativeRole}`,
    `drives: ${profile.driveState.dominant}+${profile.driveState.secondary}${profile.driveState.shadowQuadrant ? `, shadow ${profile.driveState.shadowQuadrant}` : ''}`,
    hot.length > 0 ? `shifted: ${hot.join(', ')}` : null,
    recentPatterns.length > 0 ? `history: ${[...new Set(recentPatterns)].join(', ')}` : null,
    profile.relationships.length > 0 ? `bound to: ${profile.relationships.join(', ')}` : null,
  ].filter((s): s is string => s !== null);
  return parts.join(' · ');
}
