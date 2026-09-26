/**
 * Phase 17 d2 — the articulation ladder is live (`EDUCATION-SURFACE-AUDIT-2026-09-26` §6 d2).
 *
 * Until d2 the ladder (16 §10.5) was in-vitro: law-holding render code with zero importers, so
 * no surface rendered through it. G46 guards the wiring structurally; these tests pin the
 * BEHAVIOUR the structure is supposed to produce:
 *
 *   LD1 the bridge derives a payload for every level from a real Significator;
 *   LD2 the self register reaches every OPEN level at any altitude (AL1/AL3-availability), with
 *       presentation articulated by stage (AL3), and is refused the CLOSED levels (20 §11.1);
 *   LD3 the auditor register is refused without a live consent grant (AL5), and within a grant is
 *       bounded by its scopes (16 §2.4);
 *   LD4 the closed-class payloads carry narrative only — no metric leaves the bridge for the
 *       closed register, in either register (AL2); the auditor's rubric-named metrics arrive with
 *       d3's Educator Desk, not smuggled through the bridge early.
 */
import { describe, it, expect } from 'vitest';
import { ALL_LINES, type Line } from '../../../src/core/domain/Line.js';
import type { Stage } from '../../../src/core/domain/Stage.js';
import { createSignificator } from '../../../src/core/domain/Significator.js';
import { renderLevel, LADDER_LEVELS, type ConsentLink } from '../../../src/core/domain/articulationLadder.js';
import { buildLadderPayloads } from '../../../src/core/presentation/ladderProjections.js';

const NOW = 1_700_000_000_000;

function sigAt(stage: Stage) {
  const altitudes = Object.fromEntries(ALL_LINES.map((l) => [l, stage])) as Record<Line, Stage>;
  return createSignificator('ladder-live-test', altitudes, stage);
}

describe('Phase 17 d2 — the articulation ladder live', () => {
  it('LD1: the bridge derives a payload for every level, tracing real Significator fields', () => {
    const sig = sigAt('Amber');
    const payloads = buildLadderPayloads(sig, { now: NOW });
    for (const level of LADDER_LEVELS) {
      expect(payloads.get(level), level).toBeDefined();
    }
    const l7 = payloads.get('L7')!;
    expect(l7.metrics?.totalEncounters).toBe(0); // honest emptiness, not a fabricated zero
  });

  it('LD2: the self register reaches every open level, is refused the closed ones, and presentation follows the stage', () => {
    const sig = sigAt('Amber');
    const payloads = buildLadderPayloads(sig, { now: NOW });
    for (const level of ['L0', 'L1', 'L2', 'L3', 'L6', 'L7'] as const) {
      const r = renderLevel({ register: 'self', level, playerStage: 'Amber' }, payloads);
      expect(r.allowed, level).toBe(true);
      expect(r.payload?.narrative.length ?? 0, level).toBeGreaterThan(0);
    }
    for (const level of ['L4', 'L5'] as const) {
      const r = renderLevel({ register: 'self', level, playerStage: 'Amber' }, payloads);
      expect(r.allowed, level).toBe(false);
      expect(r.reason).toContain('closed register class');
    }
    // AL3: presentation is stage-articulated — same availability, different articulation.
    expect(renderLevel({ register: 'self', level: 'L2', playerStage: 'Infrared' }, payloads).presentation).toBe('concrete-markers');
    expect(renderLevel({ register: 'self', level: 'L2', playerStage: 'Amber' }, payloads).presentation).toBe('standard');
    expect(renderLevel({ register: 'self', level: 'L2', playerStage: 'Turquoise' }, payloads).presentation).toBe('full-structure');
  });

  it('LD3: the auditor register requires a live consent grant, bounded by its scopes (AL5)', () => {
    const sig = sigAt('Amber');
    const payloads = buildLadderPayloads(sig, { now: NOW });
    const noConsent = renderLevel({ register: 'auditor', level: 'L1', playerStage: 'Amber' }, payloads);
    expect(noConsent.allowed).toBe(false);
    expect(noConsent.reason).toContain('consent');

    const granted: ConsentLink = { grantId: 'g1', scopes: ['L1', 'L2'], revoked: false };
    const inScope = renderLevel({ register: 'auditor', level: 'L2', playerStage: 'Amber', consent: granted }, payloads);
    expect(inScope.allowed).toBe(true);
    expect(inScope.payload?.metrics?.['Cognitive.altitude']).toBe('Amber');
    const outOfScope = renderLevel({ register: 'auditor', level: 'L3', playerStage: 'Amber', consent: granted }, payloads);
    expect(outOfScope.allowed).toBe(false);
    expect(outOfScope.reason).toContain('scope');

    const revoked: ConsentLink = { grantId: 'g1', scopes: ['L1', 'L2'], revoked: true };
    expect(renderLevel({ register: 'auditor', level: 'L1', playerStage: 'Amber', consent: revoked }, payloads).allowed).toBe(false);
  });

  it('LD4: closed-class payloads carry narrative only — no metric leaves the bridge for L4/L5', () => {
    const sig = sigAt('Amber');
    const payloads = buildLadderPayloads(sig, { now: NOW });
    for (const level of ['L4', 'L5'] as const) {
      const p = payloads.get(level)!;
      expect(p.metrics, level).toBeUndefined();
      expect(p.narrative.length).toBeGreaterThan(0);
    }
  });
});
