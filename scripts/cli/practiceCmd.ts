import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import { vowFilePath, loadVowFile, saveVowFile } from './support.js';





// @script-status: wired — imported by cli-game.ts, which `npm run cli` runs.
/**
 * Practice-objective subcommands: `vow`, `pod`, `credential` (docs 39 · 38 · 41).
 *
 * Stage D, leaf 4 (module-cohesion audit item 1). The three commands that operate the
 * practice layer rather than the encounter loop — the vow book (practice objectives), the cohort
 * pods and the claim-based credentials. They share a shape (parse a variadic action, call into one
 * service, print) which is why they live together, and they reach only into `support.ts`.
 */

export async function runPodCommand(argv: string[]): Promise<void> {
  const action = argv.find((a) => !a.startsWith('--')) ?? 'status';
  const { emptyPodState, formPod, joinPod, startRitual, advanceRitual, publishAggregate, issueRecognition } = await import('../../src/core/pods/podStateMachine.js');
  const p = vowFilePath();
  const podFile = path.join(path.dirname(p), 'pods.json');
  const load = (): { state: ReturnType<typeof emptyPodState>; player: string } => {
    if (fs.existsSync(podFile)) {
      try { return JSON.parse(fs.readFileSync(podFile, 'utf8')); } catch { /* fall through */ }
    }
    return { state: emptyPodState(), player: 'local-player' };
  };
  const save = (data: unknown): void => { fs.writeFileSync(podFile, JSON.stringify(data, null, 2)); };
  const ctx = load();
  let state = ctx.state;
  const now = Date.now();

  if (action === 'form') {
    const id = argv[argv.indexOf('form') + 1] ?? `pod-${now.toString(36)}`;
    const formed = formPod(state, { id, covenant: 'we practice together', createdAtMs: now }, ctx.player);
    save({ state: formed, player: ctx.player });
    console.log(`\n  ${chalk.green('Pod formed:')} ${id}`);
    console.log(chalk.dim('  Others join with: mysterium pod join <podId> (same machine)'));
    return;
  }
  if (action === 'join') {
    const podId = argv[argv.indexOf('join') + 1];
    if (!podId || state.pod?.id !== podId) { console.error(`Pod '${podId ?? ''}' not found on this machine.`); process.exitCode = 1; return; }
    const r = joinPod(state, ctx.player, now);
    if (!r.ok) { console.error(r.reason); process.exitCode = 1; return; }
    state = r.state;
    save({ state, player: ctx.player });
    console.log(`\n  ${chalk.green('Joined.')} ${state.pod?.members.length ?? 0} members.`);
    return;
  }
  if (action === 'ritual') {
    const mode = (argv.includes('--collaborative') ? 'collaborative' : argv.includes('--assistive') ? 'assistive' : 'mirrored') as 'mirrored' | 'collaborative' | 'assistive';
    const members = Object.fromEntries((state.pod?.members ?? []).map((m) => [m.playerId, 'participant']));
    const r = startRitual(state, { encounterTemplateId: 'shared-encounter', mode, roles: members, now });
    if (!r.ok) { console.error(r.reason); process.exitCode = 1; return; }
    state = r.state;
    save({ state, player: ctx.player });
    console.log(`\n  ${chalk.green('Ritual open')} (${mode}) — ${chalk.dim('gathering')}`);
    return;
  }
  if (action === 'advance') {
    const r = advanceRitual(state);
    if (!r.ok) { console.error(r.reason); process.exitCode = 1; return; }
    state = r.state;
    save({ state, player: ctx.player });
    console.log(`\n  Ritual phase: ${chalk.cyan(state.ritual?.state ?? '?')}`);
    return;
  }
  if (action === 'recognize') {
    const to = argv[argv.indexOf('recognize') + 1];
    const kindArg = (argv.find((a) => a.startsWith('--kind=')) ?? '--kind=growth').split('=')[1] as 'consistency' | 'growth' | 'service';
    if (!to) { console.error('Usage: mysterium pod recognize <memberId> [--kind=consistency|growth|service]'); process.exitCode = 1; return; }
    const evidenceRef = `${to}:${kindArg}:local`;
    const memberIds = new Set((state.pod?.members ?? []).map((m) => m.playerId));
    if (!memberIds.has(to)) { console.error(`'${to}' is not a member.`); process.exitCode = 1; return; }
    const pub = state.publishedAggregates[evidenceRef] === undefined
      ? publishAggregate(state, evidenceRef, { kind: kindArg, publishedBy: to, at: now }, now)
      : { state, ok: true as const };
    if (!pub.ok) { console.error(pub.reason); process.exitCode = 1; return; }
    const rec = issueRecognition(pub.state, { fromMemberId: ctx.player, toMemberId: to, kind: kindArg, periodId: 'local', evidenceRef }, now);
    if (!rec.ok) { console.error(rec.reason); process.exitCode = 1; return; }
    state = rec.state;
    save({ state, player: ctx.player });
    console.log(`\n  ${chalk.green('Recognition offered:')} ${kindArg} → ${to}`);
    return;
  }
  // status
  console.log(`\n  Pod: ${state.pod ? chalk.cyan(state.pod.id) : chalk.dim('none — try: mysterium pod form')}`);
  if (state.pod) {
    console.log(`  Covenant: ${chalk.dim(state.pod.covenant)}`);
    for (const m of state.pod.members) console.log(`  · ${m.playerId} ${chalk.dim(`(${m.roles.join(', ')})`)}`);
    if (state.ritual) console.log(`  Ritual: ${state.ritual.mode} — ${chalk.cyan(state.ritual.state)}`);
    console.log(`  Recognitions: ${state.recognitions.length}`);
  }
  console.log('');
}

/**
 * `mysterium credential` — local claim-ledger surface (doc 41 §4.3).
 * Draft → review → issue flow, consent-first: subject naming is the player's
 * per-claim act; export produces W3C-VC-shaped JSON for portability.
 */

export async function runCredentialCommand(argv: string[]): Promise<void> {
  const action = argv.find((a) => !a.startsWith('--')) ?? 'list';
  const cred = await import('../../src/core/credential/ClaimLedger.js');
  const p = vowFilePath();
  const credFile = path.join(path.dirname(p), 'credentials.json');
  const load = (): import('../../src/core/credential/ClaimLedger.js').ClaimLedger => {
    if (fs.existsSync(credFile)) {
      try { return JSON.parse(fs.readFileSync(credFile, 'utf8')); } catch { /* fall through */ }
    }
    return cred.emptyLedger();
  };
  const save = (l: import('../../src/core/credential/ClaimLedger.js').ClaimLedger): void => { fs.writeFileSync(credFile, JSON.stringify(l, null, 2)); };
  let ledger = load();

  if (action === 'draft') {
    const domain = argv[argv.indexOf('draft') + 1] ?? 'math.foundations';
    const descriptor = argv.slice(argv.indexOf('draft') + 2).join(' ') || 'Demonstrates assessed competency at measured depth';
    const mastery = cred.masteryEvidenceRef(domain, 'applied', Date.now());
    const { claim, failures } = cred.draftClaim({
      competencyDescriptor: descriptor,
      domain,
      evidence: [mastery],
      method: 'in-game depth assessment (31 dual-depth model)',
      qualityAssurance: 'mysterium internal assessment machinery; evidence refs disclosed',
      nowMs: Date.now(),
    });
    if (failures.length > 0) { console.error(`Draft rejected: ${failures.map((f) => f.message).join('; ')}`); process.exitCode = 1; return; }
    // Store drafts by appending with empty subject; issuance completes them.
    ledger = { ...ledger, claims: [...ledger.claims, claim] };
    save(ledger);
    console.log(`\n  ${chalk.green('Claim drafted:')} ${claim.id}`);
    console.log(chalk.dim(`  Review it, then: mysterium credential issue ${claim.id} <chosen-name>`));
    return;
  }
  if (action === 'issue') {
    const id = argv[argv.indexOf('issue') + 1];
    const subject = argv[argv.indexOf('issue') + 2];
    const claim = ledger.claims.find((c) => c.id === id);
    if (!claim) { console.error(`Claim '${id ?? ''}' not found.`); process.exitCode = 1; return; }
    if (claim.subject) { console.error('Claim already issued.'); process.exitCode = 1; return; }
    const out = cred.issueClaim({ ...ledger, claims: ledger.claims.filter((c) => c.id !== id) }, claim, subject ?? '');
    if (!out.claim) { console.error(out.failures.map((f) => f.message).join('; ')); process.exitCode = 1; return; }
    save(out.ledger);
    console.log(`\n  ${chalk.green('Issued:')} ${out.claim.id} → ${out.claim.subject}`);
    console.log(chalk.dim(`  Export: mysterium credential export ${out.claim.id}`));
    return;
  }
  if (action === 'revoke') {
    const id = argv[argv.indexOf('revoke') + 1];
    const out = cred.revokeClaim(ledger, id ?? '', Date.now());
    save(out);
    console.log(`\n  ${chalk.yellow('Revoked (tombstoned):')} ${id}`);
    return;
  }
  if (action === 'export') {
    const id = argv[argv.indexOf('export') + 1];
    const { vc, error } = cred.toVerifiableCredential(ledger, id ?? '');
    if (!vc) { console.error(error); process.exitCode = 1; return; }
    console.log(JSON.stringify(vc, null, 2));
    return;
  }
  if (action === 'rpl') {
    // RPL portfolio export (doc 41 §4.5 step 3): the evidence package a
    // partner institution's assessor receives. Subject is chosen at export.
    const nameIdx = argv.indexOf('--name');
    const candidateName = nameIdx >= 0 ? argv[nameIdx + 1] ?? '' : '';
    const onlyIdx = argv.indexOf('--claims');
    const onlyClaimIds = onlyIdx >= 0 ? (argv[onlyIdx + 1] ?? '').split(',').filter(Boolean) : undefined;
    const out = cred.exportRPLPortfolio(ledger, candidateName, { onlyClaimIds });
    if (out.error || !out.portfolio) { console.error(out.error ?? 'RPL export failed'); process.exitCode = 1; return; }
    console.log(JSON.stringify(out.portfolio, null, 2));
    return;
  }
  // list
  console.log(`\n  Credential claims`);
  if (ledger.claims.length === 0) console.log(chalk.dim('  none — try: mysterium credential draft <domain> <descriptor...>'));
  for (const c of ledger.claims) {
    const status = cred.isRevoked(ledger, c.id) ? chalk.yellow('revoked') : c.subject ? chalk.green('issued') : chalk.dim('draft');
    console.log(`  · [${status}] ${c.id} ${chalk.dim(c.domain)} — ${c.competencyDescriptor.slice(0, 60)}${c.competencyDescriptor.length > 60 ? '…' : ''}`);
  }
  console.log('');
}

export async function runVowCommand(argv: string[]): Promise<void> {
  const action = argv.find((a) => !a.startsWith('--')) ?? 'list';
  const get = (name: string): string | undefined => {
    const i = argv.indexOf(name);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const kind = (get('--kind') ?? 'practice') as 'practice' | 'exposure' | 'learning' | 'service';
  const line = (get('--line') ?? 'Intrapersonal') as import('../../src/core/domain/Line.js').Line;

  const { proposeObjectives, processCheckIn, reviewPractice, detectCrisis } = await import('../../src/core/practice/practiceTools.js');
  // declineVow renders the conversational refusal path ("not this one, not now" — 39 §4.2): it was
  // used below without being destructured, so the whole decline path threw ReferenceError. The
  // VowService move (engines/ → practice/) left this consumer stale
  // (CHECKED-SURFACE-AUDIT-2026-09-24, P0-3).
  const { acceptVow, declineVow, discoverLapses } = await import('../../src/core/practice/VowService.js');
  const { createSignificator } = await import('../../src/core/domain/Significator.js');
  const { createInitialWorldState } = await import('../../src/core/engines/CandidateGeneration.js');
  const { ALL_LINES } = await import('../../src/core/domain/Line.js');

  const state = loadVowFile();
  const altitudes = Object.fromEntries(ALL_LINES.map((l) => [l, 'Red'])) as Record<import('../../src/core/domain/Line.js').Line, import('../../src/core/domain/Stage.js').Stage>;
  const sig = createSignificator('vow-cli', altitudes, 'Red');
  const world = createInitialWorldState([]);
  const now = Date.now();

  // Lapse discovery at every visit (never notifications — 39 §3.2).
  const lapses = discoverLapses(state.book, now);
  if (lapses.lapsed.length > 0 && action !== 'list') {
    console.log(chalk.dim(`  (a practice horizon quietly passed — it waits, without judgment)`));
  }

  if (action === 'list') {
    console.log(`\n  Practice objectives`);
    if (state.book.vows.length === 0) console.log(chalk.dim('  none yet — try: mysterium vow propose'));
    for (const v of state.book.vows) {
      const status = v.status ?? 'active';
      const mark = status === 'fulfilled' ? chalk.green('●') : status === 'lapsed' ? chalk.yellow('○') : chalk.cyan('◐');
      console.log(`  ${mark} [${status}] ${v.text} ${chalk.dim(`· ${v.checkInCount ?? 0} check-ins`)}`);
    }
    return;
  }

  if (action === 'propose') {
    const proposals = proposeObjectives({ needs: [], activeShadows: [] });
    const valueFlags = new Set(['--kind', '--line']);
    const customParts: string[] = [];
    for (let i = 0; i < argv.length; i++) {
      const a = argv[i];
      if (a === action || a.startsWith('--')) { if (valueFlags.has(a)) i++; continue; }
      customParts.push(a);
    }
    const customText = customParts.join(' ');
    const chosen = { text: customText || proposals[0]?.text || 'One small honest step.', kind };
    if (argv.includes('--decline')) {
      const book = declineVow(lapses.book, { ...chosen, rationale: 'declined in CLI' });
      saveVowFile({ book });
      console.log(`\n  ${chalk.dim('Declined — noted as preference signal only. Nothing expected of you.')}`);
      return;
    }
    const { book, vow } = acceptVow(lapses.book, { ...chosen, rationale: 'authored by you' }, now);
    saveVowFile({ book });
    console.log(`\n  ${chalk.green('Accepted:')} ${vow.text}`);
    console.log(chalk.dim('  No deadlines. Check in with: mysterium vow check-in "what happened" ...'));
    return;
  }

  if (action === 'check-in' || action === 'checkin') {
    const answers = argv.filter((a) => !a.startsWith('--') && a !== action);
    if (answers.length === 0) {
      console.error('Give your reflection: mysterium vow check-in "what happened" "what you noticed" ...');
      process.exitCode = 1;
      return;
    }
    if (detectCrisis(answers.join(' '))) {
      console.log(chalk.bold.red('\n  Some things are too heavy for a journal to hold alone.'));
      console.log('  Please reach out to someone you trust, or a local crisis line.');
      console.log(chalk.dim('  (This reflection was not saved or scored.)'));
      return;
    }
    const vow = lapses.book.vows.find((v) => (v.status ?? 'active') === 'active');
    const out = processCheckIn({ book: lapses.book, sig, world, vow, answers, now, primaryLine: line });
    saveVowFile({ book: out.book });
    console.log(`\n  ${chalk.green('Recorded.')} ${chalk.dim('Held privately — nothing to act on, nothing to perform.')}`);
    // `vowFulfilled` was never a field of `CheckInOutcome`; fulfilment lives on the vow inside the
    // RETURNED book. The old property access was always `undefined`, so this line could never
    // print even when the objective had been met.
    const settled = vow ? out.book.vows.find((v) => v.text === vow.text) : undefined;
    if (settled?.fulfilled || settled?.status === 'fulfilled') {
      console.log(chalk.green('  The objective feels met — it settles into fulfilled.'));
    }
    return;
  }

  if (action === 'review') {
    const review = reviewPractice({ ...sig, reflections: state.book.vows.length > 0 ? [{ id: 'cli', prompts: [], createdAtMs: now }] : [] } as never);
    console.log(`\n  ${chalk.italic(review.narrative)}`);
    return;
  }

  console.error(`Unknown vow action: ${action} (list | propose | check-in | review)`);
  process.exitCode = 1;
}
