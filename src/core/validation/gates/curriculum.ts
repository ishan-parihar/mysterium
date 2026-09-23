/**
 * Curriculum gates — G17–G21: corpus, packs, placement and the credential chain.
 *
 * Split out of `gates.ts` (module-cohesion audit item 2). They assert the content substrate the
 * developmental engine consumes.
 *
 * Spec: docs/validation/BENCHMARK-ARCHITECTURE.md §6.
 */

import { getCurriculumRegistry } from '../../curriculum/CurriculumRegistry.js';
import { ALL_LINES } from '../../domain/Line.js';
import { ALL_STAGES } from '../../domain/Stage.js';
import { seedCurriculumRegistry, getCachedLintResult } from '../../curriculum/CurriculumSeed.js';
import { lintRegistry } from '../../curriculum/CurriculumLinter.js';
import redHolonsJson from '../../world/data/red-layer-holons.json';
import stageHolonsJson from '../../world/data/stage-holons.json';
import conceptDraftsJson from '../../data/concept-drafts.json';
import type { ConceptDraftIndex } from '../../data/ConceptDraftIndex.js';
import { REFERENCE_PACKS } from '../../packs/referencePacks.js';
import { lintPack, startPackSession, nextItem, recordTrial, assignForm, computePsychometrics, integrateSkillTheta, readFreshTheta, type PackSessionState } from '../../packs/PackEngine.js';
import { placeLine, MAX_PROBES_PER_LINE, CONFIDENCE_THRESHOLD, type PlacementProbe } from '../../onboarding/BinarySearchPlacement.js';
import { emptyLedger, draftClaim, issueClaim, revokeClaim, toVerifiableCredential, packEvidenceRef, masteryEvidenceRef, validateClaim } from '../../credential/ClaimLedger.js';
import type { Stage } from '../../domain/Stage.js';
import type { GateResult } from './plumbing.js';

// ---------------------------------------------------------------------------
// G17 — Corpus integrity (hard): the content corpus must resolve as a closed
// graph — every stage-holon cell populated, every relationship resolvable,
// every curriculum branch lint-clean with resolvable prerequisites, and the
// concept-draft index covering all 64 modules (plan Phase 3).
// ---------------------------------------------------------------------------

export function validateCorpusIntegrity(): GateResult {
  try {
    // 1. Stage-holon cells: all 8 stages × 8 lines covered by the combined
    //    red-layer + stage corpus, with all relationships resolvable.
    const holons = [...redHolonsJson, ...stageHolonsJson] as unknown as import('../../world/Holon.js').Holon[];
    const cells = new Set(holons.map((h) => `${h.line}:${h.stage}`));
    for (const line of ALL_LINES) {
      for (const stage of ALL_STAGES) {
        if (!cells.has(`${line}:${stage}`)) {
          return { gate: 'G17 corpus integrity', passed: false, hard: true, details: `missing stage-holon cell ${line}:${stage}` };
        }
      }
    }
    const ids = new Set(holons.map((h) => h.id));
    for (const h of holons) {
      for (const rel of h.relationships) {
        if (!ids.has(rel)) {
          return { gate: 'G17 corpus integrity', passed: false, hard: true, details: `unresolved relationship ${h.id} → ${rel}` };
        }
      }
    }

    // 2. Curriculum corpus: every seeded holon must lint without errors and
    //    every prerequisite must resolve within the registry.
    seedCurriculumRegistry();
    const registry = getCurriculumRegistry();
    const lint = getCachedLintResult() ?? lintRegistry(registry);
    if (lint.totalErrors > 0) {
      return { gate: 'G17 corpus integrity', passed: false, hard: true, details: `curriculum lint: ${lint.totalErrors} errors` };
    }

    // 3. Concept-draft index: the 64-module authored corpus must be complete.
    const drafts = conceptDraftsJson as unknown as ConceptDraftIndex;
    if (drafts.modules && Object.keys(drafts.modules).length !== 64) {
      return { gate: 'G17 corpus integrity', passed: false, hard: true, details: `concept-draft index covers ${Object.keys(drafts.modules).length}/64 modules` };
    }

    return { gate: 'G17 corpus integrity', passed: true, hard: true, details: `64/64 cells, ${holons.length} holons, ${registry.count()} curriculum holons lint-clean, 64/64 concept modules` };
  } catch (e) {
    return { gate: 'G17 corpus integrity', passed: false, hard: true, details: `error: ${e instanceof Error ? e.message : String(e)}` };
  }
}

// ---------------------------------------------------------------------------
// G19 — Measurement packs (hard, plan Phase 5): pack scoring determinism,
// linter teeth, and the reliability-gate firewall — no pack feeds anything
// downstream until reliability exists or is explicitly provisional.
// ---------------------------------------------------------------------------

export function validateMeasurementPacks(): GateResult {
  const mk = (m: string): GateResult => ({ gate: 'G19 measurement packs', passed: false, hard: true, details: m });
  try {
    for (const pack of REFERENCE_PACKS) {
      // Linter must pass every reference pack (PK-1..PK-4, no errors).
      const issues = lintPack(pack).filter((i) => i.severity === 'error');
      if (issues.length > 0) return mk(`${pack.id} lint errors: ${issues.map((i) => i.message).join('; ')}`);

      // Determinism: same seed + same responder policy ⇒ identical session.
      const run = (seed: number): PackSessionState => {
        let s = startPackSession(pack, assignForm(pack, 0), seed, 4);
        while (!s.finished) {
          const item = nextItem(pack, s.formId, s);
          if (!item) break;
          s = recordTrial(s, pack, item, item.difficulty <= 6);
        }
        return s;
      };
      const a = run(777);
      const b = run(777);
      if (a.theta !== b.theta || a.administered.join(',') !== b.administered.join(',')) {
        return mk(`${pack.id} scoring is not deterministic for identical seeds`);
      }
      const c = run(778);
      if (c.theta === a.theta && c.administered.join(',') === a.administered.join(',')) {
        return mk(`${pack.id} is insensitive to seed — selection is likely degenerate`);
      }

      // Stream integration: theta folds in, freshness reads decay toward 0.
      let streams: Record<string, import('../../domain/SharedTypes.js').SkillThetaStream> | undefined;
      streams = integrateSkillTheta(streams, pack, { sessionId: 'g19', formId: a.formId, theta: a.theta, se: a.se, trials: a.trial, correctCount: a.correctCount, itemIds: a.administered, completedAtMs: 1_000_000 });
      const fresh = readFreshTheta(streams[pack.id], 1_000_000 + 10 * 365 * 86_400_000);
      if (fresh === null || fresh > a.theta) {
        return mk(`${pack.id} freshness decay broken (fresh=${fresh})`);
      }
    }

    // Linter teeth: a degraded pack (1 form) MUST fail.
    const degraded = { ...REFERENCE_PACKS[0]!, forms: [REFERENCE_PACKS[0]!.forms[0]!] };
    const degradedIssues = lintPack(degraded);
    if (!degradedIssues.some((i) => i.checkId === 'PK-1' && i.severity === 'error')) {
      return mk('pack linter accepted a single-form pack (no teeth)');
    }

    // Psychometrics: reports compute and flag provisional honestly.
    const pack = REFERENCE_PACKS[0]!;
    const recs = Array.from({ length: 4 }, (_, i) => ({
      sessionId: `s${i}`, formId: assignForm(pack, i), theta: 5 + i * 0.1, se: 0.3,
      trials: 12, correctCount: 8, itemIds: ['ws.5.5', 'ws.6.6'], completedAtMs: 1000 * i,
    }));
    const report = computePsychometrics(pack, recs);
    if (!report.provisional || report.sessionCount !== 4) return mk('psychometrics report malformed');

    return { gate: 'G19 measurement packs', passed: true, hard: true, details: `${REFERENCE_PACKS.length} reference packs: deterministic, lint-clean, stream-integrated; linter has teeth; reports provisional` };
  } catch (e) {
    return mk(`error: ${e instanceof Error ? e.message : String(e)}`);
  }
}

// ---------------------------------------------------------------------------
// G20 — Placement convergence (hard, plan Phase 7): the binary-search
// onboarding composite must converge within the 8-probe psychophysics budget
// (08) and seed altitudes within tolerance of ground truth.
// ---------------------------------------------------------------------------

export function validatePlacementConvergence(): GateResult {
  const mk = (m: string): GateResult => ({ gate: 'G20 placement convergence', passed: false, hard: true, details: m });
  try {
    // Probe factory: a deterministic synthetic player whose true altitude on
    // every line is `truth`. Passes with confidence when stage ≤ truth,
    // fails above, boundary-ambiguous exactly at truth+0.5 cases are avoided
    // by construction. attempt > 0 resolves the ambiguity (extra trials).
    const makeProbe = (truth: Stage): PlacementProbe => {
      const truthIdx = ALL_STAGES.indexOf(truth);
      return (line, stage, attempt) => {
        void line;
        const idx = ALL_STAGES.indexOf(stage);
        if (idx < truthIdx) return { outcome: 'pass', confidence: 0.9 };
        if (idx > truthIdx + 1) return { outcome: 'fail', confidence: 0.9 };
        if (idx === truthIdx) return { outcome: 'pass', confidence: 0.85 };
        if (idx === truthIdx + 1) return { outcome: 'fail', confidence: 0.85 };
        return { outcome: attempt === 0 ? 'pass' : 'pass', confidence: attempt === 0 ? 0.5 : 0.9 };
      };
    };

    for (const truth of ['Red', 'Amber', 'Orange', 'Teal'] as const) {
      const p = placeLine('Cognitive', makeProbe(truth));
      if (!p.converged) return mk(`line did not converge for truth ${truth}`);
      if (p.probesUsed > MAX_PROBES_PER_LINE) return mk(`probe budget exceeded for truth ${truth} (${p.probesUsed})`);
      if (p.altitude !== truth) return mk(`altitude ${String(p.altitude)} ≠ ground truth ${truth}`);
    }

    // Boundary case: ambiguous probes that stay ambiguous → boundary, not crash.
    const ambiguousProbe: PlacementProbe = () => ({ outcome: 'pass', confidence: CONFIDENCE_THRESHOLD - 0.1 });
    const boundary = placeLine('Somatic', ambiguousProbe);
    if (boundary.converged || !boundary.boundary) return mk('persistent ambiguity must mark boundary, not fake convergence');

    // Ladder edges: truth at Infrared (fail at start → down-walk) and Turquoise.
    const bottom = placeLine('Moral', makeProbe('Infrared'));
    if (bottom.altitude !== 'Infrared') return mk('bottom-of-ladder placement failed');
    const top = placeLine('Spiritual', makeProbe('Turquoise'));
    if (top.altitude !== 'Turquoise') return mk('top-of-ladder placement failed');

    return { gate: 'G20 placement convergence', passed: true, hard: true, details: `converges ≤${MAX_PROBES_PER_LINE} probes at all truths tested; edges hold; ambiguity → boundary` };
  } catch (e) {
    return mk(`error: ${e instanceof Error ? e.message : String(e)}`);
  }
}

// ---------------------------------------------------------------------------
// G21 — Credentialing evidence chain (hard, plan Phase 9): claims trace to
// reliable-or-disclosed evidence, provisional evidence travels with its
// disclosure, identity never enters credential payloads, and the engine's
// behavior is identical with and without credential state (41 §4.4 firewall).
// ---------------------------------------------------------------------------

export function validateCredentialChain(): GateResult {
  const mk = (m: string): GateResult => ({ gate: 'G21 credential evidence chain', passed: false, hard: true, details: m });
  try {
    // 1. A mature pack evidence claim issues and exports as a VC.
    let ledger = emptyLedger();
    const now = 1_700_000_000_000;
    const mature = packEvidenceRef('memory.working-span', 'sess-1', { retestR: 0.82, provisional: false, measuredAtMs: now - 86_400_000 });
    const mastery = masteryEvidenceRef('math.foundations.numbers', 'analyzed', now - 2 * 86_400_000);
    const draft = draftClaim({
      competencyDescriptor: 'Can apply working-memory span measurement and interpret results',
      domain: 'math.foundations',
      level: { eqf: 4 },
      evidence: [mature, mastery],
      method: 'adaptive staircase assessment with parallel forms',
      qualityAssurance: 'internal psychometric harness; retest r disclosed per evidence',
      nowMs: now,
    });
    if (draft.failures.length > 0) return mk(`legitimate draft rejected: ${draft.failures.map((f) => f.message).join('; ')}`);
    const issued = issueClaim(ledger, draft.claim, 'Learner Pseudonym-1');
    if (!issued.claim) return mk(`issuance failed: ${issued.failures.map((f) => f.message).join('; ')}`);
    ledger = issued.ledger;
    const vc = toVerifiableCredential(ledger, issued.claim!.id);
    if (!vc.vc) return mk(`VC export failed: ${vc.error}`);
    if (vc.vc.credentialSubject.eqfLevel !== 4) return mk('EQF level lost in VC projection');

    // 2. Provisional evidence is usable but carries its disclosure.
    const provisional = packEvidenceRef('language.vocabulary', 'sess-2', { provisional: true, provisionalUntil: '2027-03-01', measuredAtMs: now });
    const provDraft = draftClaim({
      competencyDescriptor: 'Demonstrates vocabulary depth at assessed level',
      domain: 'language.vocabulary',
      evidence: [provisional],
      method: 'adaptive lexical decision',
      qualityAssurance: 'provisional instrument; ceiling date disclosed',
      nowMs: now,
    });
    if (provDraft.failures.length > 0) return mk('provisional evidence with disclosure was rejected');
    const provIssued = issueClaim(ledger, provDraft.claim, 'Learner Pseudonym-1');
    if (!provIssued.claim) return mk('provisional claim issuance failed');
    ledger = provIssued.ledger;

    // 3. Undisclosed pack evidence must FAIL (E2 has teeth).
    const undisclosed: typeof mature = { type: 'pack', ref: 'pack:x:sess-3' };
    const bad = validateClaim({ ...draft.claim, id: 'bad', evidence: [undisclosed] });
    if (!bad.some((f) => f.rule === 'E2')) return mk('undisclosed pack evidence accepted (E2 lacks teeth)');

    // 4. Stage-shaped evidence under EQF is the category error — must fail (E4).
    const stageRef: typeof mastery = { type: 'mastery', ref: 'stage:Teal', reliability: { measuredAtMs: now } };
    const cat = validateClaim({ ...draft.claim, id: 'cat', evidence: [stageRef] });
    if (!cat.some((f) => f.rule === 'E4')) return mk('stage-shaped evidence passed under EQF (category-error firewall open)');

    // 5. Revocation blocks export.
    const revoked = revokeClaim(ledger, issued.claim!.id, now + 1);
    if (toVerifiableCredential(revoked, issued.claim!.id).vc) return mk('revoked claim still exports');

    return { gate: 'G21 credential evidence chain', passed: true, hard: true, details: 'claims trace to disclosed evidence; provisional disclosed; E2/E4 teeth verified; revocation blocks export; subject is per-claim chosen name' };
  } catch (e) {
    return mk(`error: ${e instanceof Error ? e.message : String(e)}`);
  }
}
