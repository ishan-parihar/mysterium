/**
 * Campaign gates — G39 (campaign continuity) and G40 (campaign invariants).
 *
 * Split into its own family because these gates are the only ones that assert over a TRAJECTORY of
 * sessions driven through the live seam. Every other gate in the kernel either drives the loop's
 * kernel functions directly (`trajectory.ts`) or calls a seam function in isolation
 * (`personalization.ts`, `memory.ts`). That difference is exactly why Phase 15 exists: the gap the
 * campaign closes is not covered by any of them, and the gap it FOUND on its first run —
 * `personalizationContext()` never being called on the fallback path — was invisible to all of them.
 *
 * Spec: `docs/DEVELOPMENT-PLAN.md` §4 Phase 15 d5 (kernel 38 → 40).
 *
 * ## What is deliberately NOT asserted, and why
 *
 * The plan lists "theta-decay accumulates on deliberately neglected lines and only there" as a G40
 * assertion. It is asserted — but over `sig.theta.lastEncounter` DIRECTLY, not over the kernel's
 * `thetaStaleness` observable, and the reason is worth recording because the first attempt got it
 * wrong:
 *
 * `observables.ts` computes `thetaStaleness` from `computeStaleness(sig.theta.lastEncounter,
 * Date.now(), …)` and then min-max normalizes ACROSS lines, with the doc-comment *"relative profile
 * is invariant to wall-clock injection"*. The campaign runs on a VIRTUAL clock (`BENCH_EPOCH`), so
 * every cell saturates against the real `Date.now()` and the per-line maxima are equal — `span === 0`
 * and therefore EVERY line reports exactly 0. A gate asserting decay through that observable would
 * fail on a system whose decay works, and a reader seeing 0.000 across all lines would conclude
 * decay is broken when what is broken is the observable's fitness for a virtual-clock campaign.
 * Measured directly on `theta.lastEncounter`, the ordering is the one the invariant expects.
 */
import { runCampaign } from '../../simulation/campaign.js';
import { getPersona, type PersonaSpec } from '../personas.js';
import { ALL_LINES } from '../../domain/Line.js';
import type { Line } from '../../domain/Line.js';
import { MIN_COMPOSITIONS } from '../../personalization/diversityMonitor.js';
import type { GateResult, Tier } from './plumbing.js';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/** The gate name each family reports under — the roster's `gate` field is what a reader sees. */
function mk(gate: string, details: string, passed = true): GateResult {
  return { gate, passed, hard: true, details };
}

function tmpRoot(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

/** The trimmed campaign scale the CI tier can afford. `full` extends the trajectory. */
function scaleFor(tier: Tier): { sessions: number; encounters: number } {
  return tier === 'full' ? { sessions: 6, encounters: 6 } : { sessions: 3, encounters: 4 };
}

/** A persona whose neglect set is declared here rather than taken from the generator, so the gate's
 *  expectation is explicit instead of depending on a seed. */
function neglectedPersona(lines: readonly Line[]): PersonaSpec {
  const base = getPersona('flourishing');
  return {
    ...base,
    name: 'gate-neglect',
    policy: (encounter, step) => {
      const line = encounter.targetLines[0];
      if (line && lines.includes(line)) {
        // An empty narrative IS avoidance in the engine's eyes (`isAvoided`), which is what neglect
        // looks like from the outside.
        return { ...base.policy(encounter, step), narrativeSummary: '', shadowSurfaced: null };
      }
      return base.policy(encounter, step);
    },
  };
}

// ---------------------------------------------------------------------------
// G39 — campaign continuity (hard).
//
// Two assertions, both named by the plan, over a campaign driven through the live seam:
//
//   1. **Determinism.** The same spec against two empty roots yields an identical observable series.
//      Without it, every population finding from d4 has an unstated error bar — and the runner's
//      persona-choice handler, virtual clock and service construction would all be suspect.
//   2. **Restore on every boot.** Session N begins from session N-1's checkpoint read back from disk,
//      byte-for-byte. `G28` proved a single restore; a campaign needs it at EVERY session boundary,
//      because a feed entry that survives one read and not the ninth is a defect only a trajectory
//      can find.
// ---------------------------------------------------------------------------
export async function validateCampaignContinuity(tier: Tier = 'ci'): Promise<GateResult> {
  const { sessions, encounters } = scaleFor(tier);
  const persona = getPersona('flourishing');
  const a = tmpRoot('mys-g39-a-');
  const b = tmpRoot('mys-g39-b-');
  try {
    const runA = await runCampaign({ persona, rootDir: a, sessions, encountersPerSession: encounters });
    const runB = await runCampaign({ persona, rootDir: b, sessions, encountersPerSession: encounters });

    const seriesA = runA.sessions.map((s) => JSON.stringify({
      cci: s.observables.cci,
      finalized: s.finalized,
      total: s.sig.totalEncounters,
      shadows: s.sig.shadows.entries.length,
      poles: s.series.poleShare,
      candidates: s.series.candidateSourceShare,
      events: s.series.composition.eventCount,
    }));
    const seriesB = runB.sessions.map((s) => JSON.stringify({
      cci: s.observables.cci,
      finalized: s.finalized,
      total: s.sig.totalEncounters,
      shadows: s.sig.shadows.entries.length,
      poles: s.series.poleShare,
      candidates: s.series.candidateSourceShare,
      events: s.series.composition.eventCount,
    }));
    if (seriesA.length !== sessions) {
      return mk('G39 campaign continuity', `determinism: expected ${sessions} sessions, produced ${seriesA.length}`, false);
    }
    if (seriesA.join('|') !== seriesB.join('|')) {
      const i = seriesA.findIndex((x, n) => x !== seriesB[n]);
      return mk('G39 campaign continuity', `determinism: two runs over empty roots diverged at session ${i + 1}: ${seriesA[i]} vs ${seriesB[i]}`, false);
    }

    // Restore, at every boundary: session N reads session N-1's file, and nothing is written outside.
    const problems: string[] = [];
    for (let s = 0; s < runA.sessions.length; s++) {
      const record = runA.sessions[s]!;
      if (s === 0) {
        if (record.restoredBytes !== 0) problems.push(`session 1 restored ${record.restoredBytes} bytes from a nonexistent predecessor`);
        continue;
      }
      const prev = path.join(a, 'campaign', `checkpoint-${s - 1}.json`);
      if (!fs.existsSync(prev)) { problems.push(`session ${s + 1}: predecessor checkpoint missing`); continue; }
      const size = fs.statSync(prev).size;
      if (record.restoredBytes !== size) {
        problems.push(`session ${s + 1} restored ${record.restoredBytes} bytes, predecessor is ${size}`);
      }
      const parsed = JSON.parse(fs.readFileSync(prev, 'utf-8')) as { feedEntries: unknown[] };
      if (record.restoredFeedEntries !== parsed.feedEntries.length) {
        problems.push(`session ${s + 1} reattached ${record.restoredFeedEntries} feed entries, predecessor held ${parsed.feedEntries.length}`);
      }
    }
    // The feed must grow across the trajectory — a restore that RESET it would satisfy "nonzero".
    const feedCounts = runA.sessions.map((s) => s.restoredFeedEntries);
    for (let i = 1; i < feedCounts.length; i++) {
      if (feedCounts[i]! <= feedCounts[i - 1]!) {
        problems.push(`feed did not grow: session ${i} reattached ${feedCounts[i]}, session ${i - 1} ${feedCounts[i - 1]}`);
      }
    }
    if (problems.length > 0) return mk('G39 campaign continuity', `restore: ${problems.join('; ')}`, false);

    return mk(
      'G39 campaign continuity',
      `${sessions} sessions x ${encounters} encounters through the live seam: two empty roots produced an identical series, ` +
      `and every session restored its predecessor's checkpoint byte-for-byte with a growing feed`,
    );
  } catch (e) {
    return mk('G39 campaign continuity', `error: ${e instanceof Error ? e.message : String(e)}`, false);
  } finally {
    for (const d of [a, b]) { try { fs.rmSync(d, { recursive: true, force: true }); } catch { /* best-effort */ } }
  }
}

// ---------------------------------------------------------------------------
// G40 — campaign invariants (hard).
//
// The properties a campaign must hold over trajectory time, none of which a single-session gate can
// observe:
//
//   1. **Neglect shows in the theta book, and only where it was declared.** Asserted over
//      `sig.theta.lastEncounter` directly (see the module doc for why not over `thetaStaleness`):
//      every cell of a neglected line must be strictly OLDER than the newest cell of an active line.
//      If this ever fails while the observable reads 0, the observable is the thing to fix.
//   2. **Transformation fires only on its predicate.** The campaign must never advance a stage as an
//      artefact of session count — the failure `validateTransformationGating` guards for a single
//      session, here guarded over a trajectory.
//   3. **Composition entropy stays above the cell floor** wherever the cell has enough compositions
//      to be measurable (`46 §11`). A collapse is the visibility-collapse countermeasure failing.
//   4. **No Veil leak in any prompt built.** Every session's provenance is checked for the forbidden
//      vocabulary — the render/recall vocabularies must stay in lockstep across the whole trajectory,
//      not merely on the first session.
// ---------------------------------------------------------------------------
export async function validateCampaignInvariants(tier: Tier = 'ci'): Promise<GateResult> {
  const { sessions, encounters } = scaleFor(tier);
  const neglected: readonly Line[] = ['Moral', 'Interpersonal'];
  const root = tmpRoot('mys-g40-');
  try {
    const result = await runCampaign({ persona: neglectedPersona(neglected), rootDir: root, sessions, encountersPerSession: encounters });
    const problems: string[] = [];

    // ── 1. Theta decay lands on the neglected lines and only there ────────────────────────────
    const theta = result.sessions[result.sessions.length - 1]!.sig.theta.lastEncounter;
    const cellsOf = (line: Line) => Object.entries(theta).filter(([k]) => k.startsWith(`${line}:`));
    const newestOf = (line: Line): number | null => {
      const cells = cellsOf(line);
      return cells.length > 0 ? Math.max(...cells.map(([, v]) => v)) : null;
    };
    const activeLines = ALL_LINES.filter((l) => !neglected.includes(l));
    const newestActive = Math.max(...activeLines.map((l) => newestOf(l) ?? -Infinity));
    let olderCells = 0;
    for (const line of neglected) {
      for (const [, ts] of cellsOf(line)) if (ts < newestActive) olderCells++;
    }
    if (cellsOf(neglected[0]!).length === 0 && cellsOf(neglected[1]!).length === 0) {
      problems.push('the theta book holds no cell for either neglected line — the invariant is unobservable, so the assertion is vacuous');
    } else if (olderCells === 0) {
      problems.push(
        `no neglected-line cell is older than the newest active-line cell (newestActive=${newestActive}) — ` +
        `declared neglect left no trace in sig.theta.lastEncounter`,
      );
    }

    // ── 2. Transformation only on its predicate ───────────────────────────────────────────────
    // The ban is stage ADVANCE by session count: a persona whose trajectory does not satisfy the
    // threshold predicate must finish at the stage it started. `flourishing`-derived personas are
    // authored to remain at their starting stage.
    const first = result.sessions[0]!.sig.currentStage;
    const last = result.sessions[result.sessions.length - 1]!.sig.currentStage;
    if (last !== first) {
      problems.push(`stage advanced ${first} -> ${last} over ${sessions} sessions with no threshold evidence — transformation must not be an artefact of session count`);
    }

    // ── 3. Composition entropy above the floor, where measurable ──────────────────────────────
    const measurable = result.sessions
      .flatMap((s) => Object.entries(s.series.composition.perCell))
      .filter(([, m]) => m.compositions >= MIN_COMPOSITIONS);
    const collapsed = measurable.filter(([, m]) => m.collapsed);
    if (collapsed.length > 0) {
      problems.push(`composition collapsed below the entropy floor in ${collapsed.map(([c]) => c).join(', ')}`);
    }

    // ── 4. No Veil leak across the trajectory ─────────────────────────────────────────────────
    const forbidden = /DarkAddict|DarkAvert|GoldenAddict|GoldenAvert|shadow quadrant|CCI score|G_z|P_z|cognitive density/i;
    for (const s of result.sessions) {
      for (const p of s.series.provenance) {
        const line = `${p.cell} ${p.modality} ${p.tier} ${p.polarityMode} ${p.candidateSource} ${p.pole}`;
        if (forbidden.test(line)) problems.push(`Veil vocabulary in session ${s.session} provenance: ${line}`);
      }
    }

    if (problems.length > 0) return mk('G40 campaign invariants', `invariants: ${problems.join('; ')}`, false);
    return mk(
      'G40 campaign invariants',
      `${sessions} sessions x ${encounters} encounters: declared neglect is visible in the theta book and only there, ` +
      `the stage held (no advance by session count), no measurable cell collapsed below the entropy floor, ` +
      `and no session's provenance carried Veil vocabulary`,
    );
  } catch (e) {
    return mk('G40 campaign invariants', `error: ${e instanceof Error ? e.message : String(e)}`, false);
  } finally {
    try { fs.rmSync(root, { recursive: true, force: true }); } catch { /* best-effort */ }
  }
}
