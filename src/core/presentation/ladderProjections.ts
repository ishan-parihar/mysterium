/**
 * Ladder projections — the derivation bridge that feeds the articulation ladder (16 §10.5).
 *
 * Phase 17 d2 (`EDUCATION-SURFACE-AUDIT-2026-09-26` §6 d2): `articulationLadder.ts` was
 * in-vitro — zero `src/` importers, so the ladder (the substrate every auditor surface reads
 * through) rendered nowhere. This module is the ladder's ONLY payload producer: it derives the
 * purpose-scoped payload of each level from the live Significator. The ladder keeps the render
 * laws (AL1–AL6); this module only derives.
 *
 * Register discipline (AL2): the CLOSED levels (L4 quadrant, L5 polarity cell) are derived as
 * NARRATIVE ONLY — no metric leaves this module for the closed class, and the self register
 * never receives them at all (renderLevel refuses; 20 §11.1). They exist for the consented
 * auditor traversal (d3's Educator Desk).
 */
import type { Significator } from '../domain/Significator.js';
import { ALL_LINES, type Line } from '../domain/Line.js';
import { stageOrdinal } from '../domain/Stage.js';
import { LADDER, type LadderLevel, type LevelPayload } from '../domain/articulationLadder.js';
import { describeStage, describePersonalResonance, describeDriveSpread } from './veilDescriptors.js';

export interface LadderDerivationOptions {
  /** Freshness clock (ms epoch). Defaults to Date.now(); tests pin it. */
  readonly now?: number;
}

const DAY_MS = 86_400_000;

/** Days since a line's current cell was last exercised; undefined when never touched. */
function freshnessDays(sig: Significator, line: Line, now: number): number | undefined {
  const ts = sig.theta.lastEncounter[`${line}:${sig.altitudes[line]}`] ?? 0;
  if (ts <= 0) return undefined;
  return (now - ts) / DAY_MS;
}

/**
 * Derive every level's payload from the live Significator. Every number and phrase below traces
 * to a field the Significator actually carries — nothing is invented, and empty state renders as
 * honest emptiness, never as a fabricated zero.
 */
export function buildLadderPayloads(sig: Significator, opts: LadderDerivationOptions = {}): ReadonlyMap<LadderLevel, LevelPayload> {
  const now = opts.now ?? Date.now();
  const cog = stageOrdinal(sig.currentStage);
  const payloads = new Map<LadderLevel, LevelPayload>();

  // L0 — felt-sense / lived experience: the existing tested felt-sense renderers.
  payloads.set('L0', {
    level: 'L0',
    narrative: `${describePersonalResonance(sig)} ${describeDriveSpread(sig.drives.weights ?? {})}`,
  });

  // L1 — whole-person holonic span: centre of gravity + which lower capacities carry it and
  // which of those are in recent motion (theta on their current cells).
  const lowerLines = ALL_LINES.filter((l) => stageOrdinal(sig.altitudes[l]) < cog);
  const lowerInMotion = lowerLines.filter((l) => freshnessDays(sig, l, now) !== undefined);
  payloads.set('L1', {
    level: 'L1',
    narrative: `Your centre of gravity rests ${describeStage(sig.currentStage)}, carried by ${lowerLines.length} capacities below it`
      + (lowerInMotion.length > 0 ? ` — ${lowerInMotion.length} of them in recent motion.` : '.'),
    metrics: {
      centreOfGravity: sig.currentStage,
      lowerAltitudeLines: lowerLines.length,
      lowerLinesInMotion: lowerInMotion.length,
    },
  });

  // L2 — line profile: 8 altitudes + theta freshness per line's current cell.
  const l2Metrics: Record<string, number | string> = {};
  let freshest: { line: Line; age: number } | undefined;
  let stalest: { line: Line; age: number } | undefined;
  for (const l of ALL_LINES) {
    const age = freshnessDays(sig, l, now);
    l2Metrics[`${l}.altitude`] = sig.altitudes[l];
    if (age !== undefined) {
      l2Metrics[`${l}.freshnessDays`] = Math.round(age * 10) / 10;
      if (!freshest || age < freshest.age) freshest = { line: l, age };
      if (!stalest || age > stalest.age) stalest = { line: l, age };
    }
  }
  payloads.set('L2', {
    level: 'L2',
    narrative: freshest && stalest && stalest.age > freshest.age
      ? `${freshest.line} is your most recently lived capacity; ${stalest.line} has waited the longest.`
      : 'Your capacities are evenly touched or yet untouched — no line stands out yet.',
    metrics: l2Metrics,
  });

  // L3 — line × stage stalls: the staleness ranking, worst first.
  const ranked = ALL_LINES
    .map((l) => ({ line: l, age: freshnessDays(sig, l, now) ?? Number.POSITIVE_INFINITY }))
    .sort((a, b) => b.age - a.age);
  const stalled = ranked.filter((r) => Number.isFinite(r.age));
  payloads.set('L3', {
    level: 'L3',
    narrative: stalled.length >= 2
      ? `Growth waits most in ${stalled[0]!.line}, then ${stalled[1]!.line} — each at its current altitude.`
      : stalled.length === 1
        ? `Growth waits most in ${stalled[0]!.line} at its current altitude.`
        : 'No capacity has been exercised yet — there is no stall pattern to read.',
    metrics: stalled.length > 0
      ? Object.fromEntries(stalled.map((r) => [`${r.line}.stallDays`, Math.round(r.age * 10) / 10]))
      : {},
  });

  // L4 / L5 — CLOSED class: narrative only. No metric is derived for the closed register, and
  // the self register never receives these payloads at all (renderLevel refuses, 20 §11.1).
  payloads.set('L4', {
    level: 'L4',
    narrative: 'The stance-diagnostics core: active shadow patterns hold quadrant structure. Met by the player only as narrative consequence; rendered to a consented auditor with rubric names (16 §10.4).',
  });
  payloads.set('L5', {
    level: 'L5',
    narrative: 'Polarity cell texture (23\'s 64-cell catalogue over live state): legible in the story the game tells back, never as a number to the player.',
  });

  // L6 — evidence layer: skill-θ streams (40), honestly empty until instruments run.
  const streams = Object.entries(sig.skillTheta ?? {});
  const l6Metrics: Record<string, number | string> = {};
  for (const [id, s] of streams) {
    l6Metrics[`${id}.theta`] = Math.round(s.theta * 100) / 100;
    l6Metrics[`${id}.se`] = Math.round(s.se * 100) / 100;
    l6Metrics[`${id}.sessions`] = s.sessionCount;
  }
  payloads.set('L6', {
    level: 'L6',
    narrative: streams.length > 0
      ? `${streams.length} instrument stream(s) carry measured evidence${streams[0] ? ` (freshest: ${streams[0][0]})` : ''}.`
      : 'No instrument streams yet — evidence begins when a measurement pack runs (mysterium pack).',
    metrics: l6Metrics,
  });

  // L7 — derivation / provenance: which play produced the signals.
  payloads.set('L7', {
    level: 'L7',
    narrative: `${sig.totalEncounters} encounter(s) and ${sig.totalSessions} session(s) produced this picture; provenance rides the session logs (43 §4.4).`,
    metrics: {
      totalEncounters: sig.totalEncounters,
      totalSessions: sig.totalSessions,
      recentEncounters: sig.recentEncounters.length,
    },
  });

  // Contract: every ladder level has a payload — the bridge can never leave a level dark silently.
  for (const spec of LADDER) {
    if (!payloads.has(spec.level)) {
      throw new Error(`ladder bridge did not derive a payload for ${spec.level}`);
    }
  }
  return payloads;
}

/** The default self-render levels for CLI/WebUI listing (open class, in ladder order). */
export const SELF_RENDER_LEVELS: readonly LadderLevel[] = ['L0', 'L1', 'L2', 'L3', 'L6', 'L7'];
