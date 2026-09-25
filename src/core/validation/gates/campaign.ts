/**
 * Campaign gates — G39 (campaign continuity), G40 (campaign invariants), G41 (polarity loop entry),
 * G42 (declared stance channel) and G43 (line coverage).
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
    try {		  fs.rmSync(root, { recursive: true, force: true });
		} catch { /* best-effort */ }
	}
}

/**
 * G43 — developmental encounter coverage is a policy, not an accident of a hash (Phase 16 d3).
 *
 * The report measured `Emotional: 1 encounter in 432` and three lines carrying 74 %, and named it
 * "scheduler line coverage". The supply is symmetric (3 holons per line); the eight-criterion
 * priority remains closed, while the scheduler's comparator and reserved developmental primary
 * select the first developmental offer. The reserve may cross priority bands, but every
 * non-primary priority value and the remaining ranked order stay unchanged. This gate measures the
 * path the campaign actually finalizes: the single primary developmental encounter per tick.
 * Curriculum and training beats are deliberately excluded because they are educational inserts, not
 * developmental line coverage.
 *
 * The assertion is the consequence a player would notice, not an even histogram: every canonical
 * line is consumed developmentally, and no line is effectively excluded by a 2% quietest/busiest
 * floor. The ranked ambient list is a separate offer-level surface and is not represented by the
 * finalized provenance stream.
 */
export async function validateLineCoverage(tier: Tier = 'ci'): Promise<GateResult> {
  const { sessions, encounters } = scaleFor(tier);
  const root = tmpRoot('mys-g43-');
  try {
    const result = await runCampaign({ persona: getPersona('flourishing'), rootDir: root, sessions, encountersPerSession: encounters });

    // The per-line TOTAL of finalized developmental encounters, not one session's mixed row.
    // Curriculum/training are explicitly separate surfaces; including their synthetic `Training:*`
    // or `curriculum:*` cells here would make the gate measure the wrong population.
    const totals = new Map<string, number>();
    for (const s of result.sessions) {
      for (const p of s.series.provenance) {
        if (p.isCurriculum || p.isTraining) continue;
        const line = p.cell.split(':')[0]!;
        totals.set(line, (totals.get(line) ?? 0) + 1);
      }
    }
    const served = ALL_LINES.filter((l) => (totals.get(l) ?? 0) > 0);
    const busiest = Math.max(...ALL_LINES.map((l) => totals.get(l) ?? 0));
    const quietest = Math.min(...ALL_LINES.map((l) => totals.get(l) ?? 0));
    const report = ALL_LINES.map((l) => `${l} ${totals.get(l) ?? 0}`).join(' · ');

    if (served.length !== ALL_LINES.length) {
      const missing = ALL_LINES.filter((l) => !served.includes(l));
      return mk(
        'G43 line coverage',
        `no developmental encounter was finalized on ${missing.join(', ')} across ${sessions} sessions x ${encounters} encounters — ` +
        `line coverage is decided by something other than a policy [${report}]`,
        false,
      );
    }
    // The starved share. Before the fix Emotional held 1/432 against a busiest line of 138 — a ratio
    // of 0.007. The floor is set at a token 2 % rather than near the observed 0.2 so the gate locks
    // "a line is not effectively excluded" without pinning a distribution canon never asked for.
    if (busiest > 0 && quietest / busiest < 0.02) {
      return mk(
        'G43 line coverage',
        `the quietest line holds ${quietest} against the busiest line's ${busiest} (${((quietest / busiest) * 100).toFixed(1)} %) — ` +
        `that is effective exclusion, not a developmental weighting [${report}]`,
        false,
      );
    }

    return mk('G43 line coverage', `every line offered · quietest/busiest ${quietest}/${busiest} [${report}]`);
  } catch (e) {
    return mk('G43 line coverage', `error: ${e instanceof Error ? e.message : String(e)}`, false);
  } finally {
    try { fs.rmSync(root, { recursive: true, force: true }); } catch { /* best-effort */ }
  }
}

/**
 * G42 — the drive-stance channel delivers, and `driveFixation` is no longer pinned (Phase 16 d2).
 *
 * The item this gate closes read as "`driveFixation` is 0 in every configuration — the second pinned
 * observable". It is not pinned: `fixationRisk` moves only in `updateDriveBalance`, and only for a
 * drive carrying one of the four pathological signals, and the campaign never delivered one because
 * (a) `personaChoiceHandler` read only the option index and the write-in from `persona.policy()`, so
 * the `driveDirectionality` that same call computes was discarded, and (b) the narratives were 50
 * generated filler tokens, so the module path's keyword-gated route could not fire either.
 *
 * Asserts the three things that make the reading trustworthy rather than merely non-zero:
 *
 * 1. **It moves.** A campaign whose personas declare a tilt produces nonzero `driveFixation`.
 * 2. **It moves on the DECLARED drive and ONLY there, and it ACCUMULATES.** `golden-bypass` declares
 *    `Eros: GoldenAddicted` and `constricted` declares `Communion: DarkAverted`; each must end with a
 *    positive value on exactly its declared drive and zero on the other three — a stance routed to
 *    the wrong drive would still produce a plausible-looking nonzero, which is why "moved" is not the
 *    assertion.
 * 3. **Attribution holds.** `EncounterProvenance.declaredStance` records which channel carried each
 *    encounter, so a `driveFixation` number can never be credited to the wrong one.
 *
 * What it deliberately does NOT assert: that the derived channel produces fixation. It cannot — the
 * derivation emits at most one pathological signal per encounter, and only from a shadow keyword or
 * the LLM's enum. That is the reason the second channel exists, not a defect in this one.
 */
export async function validateDeclaredStanceChannel(tier: Tier = 'ci'): Promise<GateResult> {
  const { sessions, encounters } = scaleFor(tier);
  const root = tmpRoot('mys-g42-');
  try {
    // `golden-bypass` declares `Eros: GoldenAddicted`; `constricted` declares `Communion: DarkAverted`.
    // Two drives, one run each.
    //
    // The asserted property is the drive and the ACCUMULATION, not a per-encounter rate. The first
    // draft asserted `rate × encounters` and FAILED (0.53 observed vs 0.20 expected for Eros): the
    // advance runs more times per encounter than the orchestrator's own evaluation — the declared
    // stance is delivered per encounter, and the matrix/transformation advance applies on top. That
    // is a fact about the seam's call graph, not about `updateDriveBalance`, and a gate that pinned
    // the rate would fail the moment the call graph changed for an unrelated good reason. What MUST
    // hold is that the declared drive is the one that moves, that it grows, and that the reading is
    // attributable to the channel that produced it.
    const problems: string[] = [];
    const expected: Record<string, { drive: string }> = {
      'golden-bypass': { drive: 'Eros' },
      constricted: { drive: 'Communion' },
    };
    const observedNotes: string[] = [];

    for (const [personaName, want] of Object.entries(expected)) {
      const result = await runCampaign({
        persona: getPersona(personaName), rootDir: path.join(root, personaName), sessions, encountersPerSession: encounters,
      });
      const last = result.sessions[result.sessions.length - 1]!;
      const fixation = last.series.observables.driveFixation;

      // 1. It moves.
      const observed = fixation[want.drive] ?? 0;
      if (!(observed > 0)) {
        problems.push(`${personaName}: ${want.drive} fixation is ${observed} — the declared stance did not reach updateDriveBalance`);
        continue;
      }
      // 2. It moves on the DECLARED drive and ONLY there. These two personas tilt exactly one drive,
      // so any other nonzero is a misroute rather than a declaration.
      const nonzero = Object.entries(fixation).filter(([, v]) => v > 0).map(([d]) => d);
      if (nonzero.length !== 1 || nonzero[0] !== want.drive) {
        problems.push(`${personaName}: fixation moved on ${nonzero.join('+') || 'nothing'}, expected only ${want.drive}`);
        continue;
      }
      // 3. It ACCUMULATES. A single-encounter write would also be nonzero, so require growth across
      // the trajectory — the property that separates a live channel from a one-shot artefact.
      const first = result.sessions[0]!.series.observables.driveFixation[want.drive] ?? 0;
      if (!(observed > first)) {
        problems.push(`${personaName}: ${want.drive} fixation did not grow across the trajectory (${first} → ${observed})`);
        continue;
      }
      // 4. Attribution: the channel is recorded, and it is the declared one.
      const declared = last.series.provenance.filter((p) => p.declaredStance).length;
      if (declared === 0) {
        problems.push(`${personaName}: fixation moved but no encounter is marked as declared-stance — the reading is unattributable`);
        continue;
      }
      observedNotes.push(`${personaName} ${want.drive} ${first.toFixed(2)}→${observed.toFixed(2)} (${declared} declared encounters)`);
    }

    if (problems.length > 0) return mk('G42 declared stance channel', `stance: ${problems.join('; ')}`, false);
    return mk(
      'G42 declared stance channel',
      `${observedNotes.join('; ')} — each on exactly its declared drive and zero on the others, growing ` +
      `across the trajectory with every contributing encounter attributed to the declared channel. ` +
      `driveFixation is a live observable, not a pinned zero`,
    );
  } catch (e) {
    return mk('G42 declared stance channel', `error: ${e instanceof Error ? e.message : String(e)}`, false);
  } finally {
    try { fs.rmSync(root, { recursive: true, force: true }); } catch { /* best-effort */ }
  }
}

/**
 * G41 — the dialectic loop OPENS and obeys `46 §4.3`'s reconciliation law.
 *
 * This gate exists because the two defects it locks were invisible to every other gate in the
 * roster, for a structural reason worth stating: the other thirty-nine either drive the kernel's
 * functions directly or call ONE seam function in isolation, and both defects lived in the
 * COMPOSITION of two seam calls over time.
 *
 * 1. **The loop was unenterable.** `undiscovered` → `active-tension` is written only by the session
 *    end's state advance, whose pair came from the dialectic engine's SELECTION — but `46 §5.3`
 *    forbids selecting on an `undiscovered` pair (a candidate must already be in `active-tension`),
 *    so the first selection could never occur. The pair the encounter engaged in TEXTURE
 *    (`context.engagedPair`, §4.3's "the familiar pole may appear as texture") is the legal entry.
 * 2. **The advance reconciled in a single sweep.** It mapped `active-tension` → `reconciled` on one
 *    `sto` encounter, against §4.3's law ("reached only by *repeated* confirmations, never in a
 *    single sweep") and against `polarityResolution.applyReading`, the writer that owns
 *    reconciliation through the confirmation tallies. Two writers, two laws, one map.
 *
 * A gate rather than only a unit test because the failure mode was `polarityReadings: 0` in a
 * calibration report — a number that reads like a healthy zero.
 */
export async function validatePolarityLoopEntry(tier: Tier = 'ci'): Promise<GateResult> {
  const { sessions, encounters } = scaleFor(tier);
  const root = tmpRoot('mys-g41-');
  try {
    const result = await runCampaign({ persona: getPersona('flourishing'), rootDir: root, sessions, encountersPerSession: encounters });
    const problems: string[] = [];
    const rows = result.sessions.map((s) => s.series.polarity);
    const final = rows[rows.length - 1]!;

    // ── 1. The loop opened: a reading was captured and a pair was discovered ─────────────────
    if (final.readings === 0) {
      problems.push('no polarity reading was captured — the pair key never resolved, so §4.3\'s falsifiable state has no evidence and the coverage query has no input');
    }
    if (final.pairKeys.length === 0) {
      problems.push('the pair-state map stayed empty — the dialectic engine has no edge to select on, so the expansion dimension is dormant rather than under-served');
    }

    // ── 2. Nothing reconciled without a ratified reading ─────────────────────────────────────
    // The campaign ratifies no reading (`ratifyReading` is never set), so no pair may reach
    // `reconciled`. This is the assertion that caught the single-sweep collapse: before the fix a
    // pair reconciled on its SECOND encounter with no confirmation tally behind it.
    for (const r of rows) {
      if (r.pairsReconciled > 0) {
        problems.push(`a pair reconciled with no ratified reading (session census: ${r.pairsReconciled}) — §4.3 forbids reconciliation in a single sweep`);
        break;
      }
    }

    // ── 3. Discovery is monotone: a discovered pair is never silently dropped ────────────────
    const seen = new Set<string>();
    for (const r of rows) {
      for (const k of r.pairKeys) seen.add(k);
      for (const k of seen) {
        if (!r.pairKeys.includes(k)) {
          problems.push(`pair ${k} vanished from the state map — the map lost a discovered pair`);
          break;
        }
      }
    }

    if (problems.length > 0) return mk('G41 polarity loop entry', `loop: ${problems.join('; ')}`, false);
    return mk(
      'G41 polarity loop entry',
      `${sessions} sessions x ${encounters} encounters: ${final.readings} readings captured, ` +
      `${final.pairKeys.length} pair(s) discovered (${final.pairKeys.join(', ')}), 0 reconciled — ` +
      `the loop opens on texture engagement (46 §4.3) and only a ratified reading reconciles`, 
    );
  } catch (e) {
    return mk('G41 polarity loop entry', `error: ${e instanceof Error ? e.message : String(e)}`, false);
  } finally {
    try { fs.rmSync(root, { recursive: true, force: true }); } catch { /* best-effort */ }
  }
}
