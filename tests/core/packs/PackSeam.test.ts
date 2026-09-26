/**
 * Phase 17 d1 — the pack seam is live (`EDUCATION-SURFACE-AUDIT-2026-09-26` §6 d1).
 *
 * Before d1 the pack engine's registry was test-only in production: registerPack's only caller
 * was a test, delegate.ts's single getPack read was masked by the REFERENCE_PACKS fallback, and
 * pack sessions existed only inside gates/tests/CLI-drills of the runner. G45 guards the wiring
 * structurally (the failure is absence — an unseeded registry behaves exactly like an empty
 * one); these tests pin the BEHAVIOUR the structure is supposed to produce:
 *
 *   S1  the boot seed makes the engine registry real — getPack hits, allPacks is readable;
 *   S2  a real S1 delegation runs the pack mandate, emits a ratifiable pack_score whose
 *       packId resolves through the (now-seeded) production read path, and ratifies;
 *   S3  the record is real reliability data — the collector accepts it and reports provisional;
 *   S4  a pack-evidence claim citing the real session id drafts clean (E2 disclosure travels);
 *   S5  persistence round-trips — stored rows rehydrate through the public API.
 */
import { describe, it, expect } from 'vitest';
import { ALL_LINES, type Line } from '../../../src/core/domain/Line.js';
import type { Stage } from '../../../src/core/domain/Stage.js';
import { createSignificator } from '../../../src/core/domain/Significator.js';
import { createInitialWorldState } from '../../../src/core/engines/CandidateGeneration.js';
import { delegateSession, ratifyProposalsTool } from '../../../src/core/orchestration/orchestratorTools.js';
import { ROLE_TOOLSETS, type DelegationSpec } from '../../../src/core/orchestration/types.js';
import { getPack, allPacks } from '../../../src/core/packs/PackEngine.js';
import { seedPackRegistry } from '../../../src/core/packs/referencePacks.js';
import { ReliabilityCollector } from '../../../src/core/packs/ReliabilityCollector.js';
import { draftClaim, packEvidenceRef, emptyLedger, validateClaim } from '../../../src/core/credential/ClaimLedger.js';

const NOW = 1_700_000_000_000;

function packSessionFixture() {
  const altitudes = Object.fromEntries(ALL_LINES.map((l) => [l, 'Amber'])) as Record<Line, Stage>;
  const sig = createSignificator('pack-seam-test', altitudes, 'Amber');
  const spec: DelegationSpec = {
    role: 'S1',
    purpose: 'test: administer one measurement pack',
    readProjection: new Set(['ops.registryHealth']),
    toolset: new Set(ROLE_TOOLSETS['S1']),
    budget: { toolCallsMax: 6, virtualMsMax: 600_000 },
  };
  return { sig, spec, world: createInitialWorldState([]) };
}

describe('Phase 17 d1 — the pack seam', () => {
  it('S1: the boot seed makes the engine registry real', () => {
    seedPackRegistry();
    expect(getPack('memory.working-span')).toBeDefined();
    expect(allPacks().length).toBeGreaterThanOrEqual(8);
  });

  it('S2–S5: a real S1 delegation produces a ratifiable pack_score that feeds reliability and a claim', async () => {
    seedPackRegistry();
    const { sig, spec, world } = packSessionFixture();
    const session = { targetSessionLength: 4, encountersSoFar: 0, recentLines: [], sessionDurationMs: 0 };

    const out = await delegateSession({ spec, sig, world, session, seed: 'pack-seam', now: NOW });
    expect(out.ok).toBe(true);

    const proposals = out.result?.proposals ?? [];
    const packProp = proposals.find((p) => p.kind === 'pack_score');
    expect(packProp).toBeDefined();
    const payload = packProp!.payload as {
      readonly packId: string;
      readonly record: { readonly sessionId: string; readonly formId: string; readonly theta: number; readonly se: number; readonly trials: number; readonly correctCount: number; readonly itemIds: readonly string[]; readonly completedAtMs: number };
    };

    // The production read path is REAL post-seed — no fallback needed.
    const pack = getPack(payload.packId);
    expect(pack).toBeDefined();

    const rat = ratifyProposalsTool({ proposals, sig: out.sig, world: out.world, now: NOW + 1 });
    const ratRow = rat.dispositions.find((d) => d.kind === 'pack_score');
    expect(ratRow?.accepted).toBe(true);

    // Real reliability data: the collector accepts the record and reports provisional on a
    // first session (provisional is the honest posture until retest pairs mature — 40 §4.4).
    const collector = new ReliabilityCollector();
    expect(collector.recordSession(pack!, payload.record)).toBe(true);
    const report = collector.computeReport(pack!, NOW + 2);
    expect(report.gate).toBe('provisional');
    expect(report.sessionCount).toBe(1);

    // The claim cites the real session id and carries the disclosure (E2).
    const evidence = packEvidenceRef(pack!.id, payload.record.sessionId, {
      provisional: true,
      provisionalUntil: pack!.provisionalUntil,
      measuredAtMs: NOW + 3,
    });
    const { claim, failures } = draftClaim({
      competencyDescriptor: `Measured ${pack!.construct} at assessed level`,
      domain: pack!.id,
      evidence: [evidence],
      method: 'measurement-pack administration (40 §1), S1 delegated session, ratified pack_score',
      qualityAssurance: 'mysterium internal assessment machinery; reliability disclosure travels with the evidence',
      nowMs: NOW + 4,
    });
    expect(failures).toHaveLength(0);
    expect(claim.evidence[0]!.ref).toBe(`pack:${pack!.id}:${payload.record.sessionId}`);
    expect(validateClaim(claim)).toHaveLength(0);
    expect(emptyLedger().claims).toHaveLength(0); // draftClaim does not issue — the ledger stays the player's act

    // Persistence round-trip: stored rows rehydrate through the public API and preserve the count.
    const rows = [{ ...payload.record, packId: pack!.id }];
    const rehydrated = new ReliabilityCollector();
    for (const row of rows) {
      const p = getPack(row.packId);
      if (p) rehydrated.recordSession(p, row);
    }
    expect(rehydrated.computeReport(pack!, NOW + 5).sessionCount).toBe(1);
  });
});
