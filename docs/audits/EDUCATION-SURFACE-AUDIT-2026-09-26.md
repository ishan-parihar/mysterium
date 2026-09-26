# Education-Surface Audit — 2026-09-26

**Scope:** the education-system dimension end to end — canon (`foundations/37–42`, the
`credentialing`/`cohort`/`curriculum` organs, the auditor surfaces of `16 §10.4` + `33 §7`)
contrasted against the tree that implements it — plus the full operational surface (WebUI parity,
CLI, gates, battery, deployment), so the proposed next phase is grounded in the whole system and
not one dimension.

**Method:** three read-only scouts (canon completeness, code presence, surface status), and every
headline claim below re-verified first-hand (the grep/read is cited inline; the few scout-only
detail rows are marked `[scout]`). The full battery ran on the tree this audit describes, after the
d9 correction set landed: 148 files / **1696 tests**, `tsc` clean, build green (adapter-cloudflare),
workspace-lint 0/0, `arch.py validate` 23/23, `arch.py fixtures` 23/23 **proven**, release smoke green.

**Predecessor:** `WIRING-CONTRAST-AUDIT-2026-09-23` (the in-vitro class), `CHECKED-SURFACE-AUDIT-2026-09-24`
(the checked-graph class). This audit asks the next question: *how much of the education SYSTEM —
the promise that separates a developmental instrument from a game with study content — exists
outside canon?*

## 0. Verdict

The premise "the education docs are incomplete" is half right, and the half that is right is not
the half it points at. The canon is **not** thin: 37–42 are operational specs with real data models
(`CurriculumHolon.standardsTags?` exists at `src/core/curriculum/types.ts:326` with the blindness-law
comment; 38's interface is the one thing its own text calls a "sketch"). And the pure cores are
**built and gated**: the K-12 corpus rides every session (`seedCurriculumRegistry()` called
unconditionally at `src/core/GameLoop.ts:260` — 16 data files, 108 holons), the pod state machine
carries a hard privacy wall (G18), the journal surface is live at `src/routes/journal/+page.svelte`
("player journal + practice check-ins (doc 39)", five reflection prompts through VowService), the
claim chain is complete and G21-gated, and the levelling engine is kernel-tested (42:4).

What is missing is the **system** half, in one consistent shape: *every education surface that
needs a second party — a network peer, a live pack session, an educator's eyes — is dark.*

- `src/infra/pods/PodTransport.ts` — **zero production importers** (verified: `from '.*PodTransport'`
  in `src/` returns nothing). The M1 transport `DEVELOPMENT-PLAN` §8 marks ✅ was built and never wired.
- Pack sessions have **no live path at all** — three independent walls, each verified:
  (a) the runner, `orchestratorTools.delegateSession` (`orchestratorTools.ts:86`), is called by the
  gate at `validation/gates/orchestration.ts:54`, tests, and the CLI drill
  (`scripts/cli/delegateCmd.ts:201`) — never by play; (b) the pack engine's own registry is
  **test-only in production**: `registerPack` has zero production callers (only
  `tests/core/packs/PackEngine.test.ts:38`), so the one production `getPack` read
  (`delegate.ts:937`) is a fallback-masked always-miss — `getPack(pl.packId) ?? REFERENCE_PACKS.find(...)`
  — and `allPacks()` has no production caller at all; (c) the council's `delegate_session` tool is a
  name collision, not a path: it hands a bounded mandate to a council member (`councilTools.ts:212`),
  and no production process constructs a `CouncilIntegration` anyway (zero in `src/lib/` and
  `scripts/`), so the council surface never registers outside tests.
  The deterministic S1 pack mandate sits inside the runner (`delegate.ts:691`, `REFERENCE_PACKS` →
  `stablePick`). No pack has ever run in a session a player played.
- `src/core/credential/ClaimLedger.ts` is imported in `src/` by exactly **one module — the G21 gate**
  (`validation/gates/curriculum.ts:22`); the CLI writes the ledger file; nothing production reads it back.
- `src/core/domain/articulationLadder.ts` (16 §10.5, L0–L7, laws AL1–AL6) — **zero `src/` importers**
  (verified). The ladder every auditor surface must render through is in-vitro.
- `Guardian Mirror` / `Educator Desk` / `Therapeutic Pane` (33 §7) — **zero code matches anywhere in
  `src/`, `scripts/`, `tests/`** (verified; the only hits are the canon rows naming them:
  `AGENTS.md:182-183`).

So the tree can measure a player (G19), validate a claim (G21), and store it (CLI) — but **nothing
can show an educator, guardian, or therapist anything, and no claim is ever derived from a session
a player actually played.** Five canon↔tree divergences were found and verified in 37 (§3). The next
phase's spine follows directly (§6).

## 1. The tree this audit describes (d9 corrections, verified this session)

The audit rode on a correction set responding to post-commit advisories on `333c85b`, all committed
and battery-verified before this report was written:

- **CLI pin regression fixed** — d9 moved the seam-suppression rule behind `focusedCell`, which
  silently unmarked `scripts/cli/runtime.ts`'s two force-aware builders: a `--line X --stage Y` run
  kept the candidate cell filter but regained the four injection seams (a mixed-cohort run). Both
  builders now set `focusedCell: true as const` (`runtime.ts:541`, `:1711`, verified by gate).
- **Dead WebUI guard deleted** — the settings store has no `focusedCell` producer, so d8's
  `isDeliberateInstrumentPin(forceFields)` in `gameEngine.ts` evaluated a constant. G44 now
  **rejects** pin logic in the browser outright (the browser is not an instrument) and additionally
  counts CLI builders vs marks (`evaluateCliInstrumentMarking`, `gates/surface.ts`).
- **Tests made real** — the tautology predicate test replaced by a module-graph assertion (both
  kernel seams consult the shared predicate) plus two end-to-end player-path tests: an incidental
  settings pin keeps the training weave through `tickWithStrategy`; a deliberate pin loses it
  (`tests/engines/InstrumentPin.test.ts`).
- Plan/AGENTS text synced to the code (d8/d9 entries; `AGENTS.md` §4.2 item 2).

## 2. Full-surface status

### 2.1 WebUI parity (the standing largest item)

`src/lib/engine/gameEngine.ts:27-28` imports `startSession, applyResponseOnly, computeTrainingWeave`
from GameLoop and `scheduleNextWithHolonicReturn` from the scheduler. **`tickWithStrategy` is not
imported** — its four non-declaration callers are `validation/harness.ts`, `orchestration/delegate.ts`,
`simulation/campaign.ts`, and `scripts/cli/runtime.ts` (none in `src/lib`). The browser's
**assessment** path IS orchestrated (`runEncounter` builds an `AgenticOrchestrator`, `gameEngine.ts:284/:297`),
so personalization/memory ride the per-encounter loop there. The **scheduling** path is the gap: no
threshold mode, no curriculum interleave, and the training weave is mirrored by hand (WIRE-7) rather
than owned by the strategy. Consequence application goes through `applyResponseOnly`. This is the
same divergence class the d9 scope comment states plainly at `gameEngine.ts:208-211`.

### 2.2 CLI surface

`npm run cli` → `scripts/cli-game.ts` (commander): `profile`, `practice` (vows, pods — `runPodCommand`
drives `formPod/joinPod/startRitual/advanceRitual/publishAggregate/issueRecognition` against a local
`pods.json` — `scripts/cli/practiceCmd.ts:20`, registered `cli-game.ts:379-381`), `credential`
(`mysterium credential rpl` → `exportRPLPortfolio`), `delegate`, plus `cohort`/`cohort-run` for the
Phase-15 hermetic generator. Bundled: `dist/cli/cli-game.js` via `bin.mysterium` (`package.json:6-8`).
Capacitor targets exist (`cap:sync`, `cap:android`) with the static adapter (`BUILD_TARGET=static`,
no SSR/BFF — `svelte.config.js:31-37`).

### 2.3 Gates + battery

Roster: **44 gates** (44 `results.push` calls verified in `gates/roster.ts:36-117`), G1–G44, run by
`runValidationSuite`. Battery: 148 files / 1696 tests; `tsc` clean; build green; lint 0/0; doc gates
23/23 with **23/23 fixtures proven** (the DG13/DG20 stale anchors were re-anchored this week).

### 2.4 Deployment posture

`wrangler.toml` declares `SAVE_KV` and `RECOVERY_KV` with **placeholder IDs**
(`REPLACE_WITH_SAVE_KV_ID` etc.), the `ANALYTICS` dataset, and the deploy command
(`npx wrangler pages deploy .svelte-kit/cloudflare --project-name mysterium`). What is missing is
**account-holder action, not code**: create both namespaces, paste IDs, create the dataset, put
`LLM_API_KEY`. The pod transport (38 M1) additionally needs a hosting decision; 38's own documented
fallback (M0: KV + client polling, `38:149`) fits the already-declared KV bindings.

### 2.5 Phase 16 open items (carried, unchanged by this audit)

Interpersonal exclusion (structural slot deficit — round-robin serves the 8th line 8th and the 8th
offer is a training beat; fix = rotating tie-break seed or seam-priority change); inert polarity
loop; wide `shadow-facing` 0.0 %; real-rater RV1–RV7 thresholds; per-line saturation thresholds.
Evidence: `CAMPAIGN-REPORT-2026-09-25.md` §4.

## 3. Education canon — completeness, doc by doc

| Doc | Lines | Verdict | The incompleteness that is real |
|---|---|---|---|
| 37 K-12 | 197 | Operational spec; **the corpus outran the canon** — 10 of the 11 §4.1 trees shipped, the doc never reconciled | **Five verified divergences** (below); 4 open questions (guardian mode, jurisdiction authoring, simulations in-house vs consume, integral re-tiering) |
| 38 Cohort | 217 | Operational spec; its own §4.1 calls the domain model a "sketch" | M2 deferred by design; §4.5 minors/supervised pods is a hook (`CohortPod.supervision?`), not implementation; §4.6 orchestrator integration deferred |
| 39 Journal | 270 | **The most operationally complete doc in the dimension** | The live `/journal` route implements it; the crash-sidecar `sessionJournal.ts` is NOT it (different thing, same word) |
| 40 Packs | 207 | Operational spec; kernel precedent "load-bearing" | Competency claims explicitly **not yet covered** (`40:24`); external norm anchoring gated to 41-era; MP3 (evidence era) needs 38 cohorts |
| 41 Recognition | 212 | Architecture + a canon revision (§0) | Candid about externals: DPIA before any EU-facing credential feature (`41:54`), EQAR = multi-year endgame; roadmap is quarters-to-years by design |
| 30 Curriculum | 307 | Implemented backbone | Only Open Questions §5 remain (isomorphism count, cross-domain timing, novel knowledge, recursion depth, cultural variation) |
| 42 Levelling | 236 | **Implemented** (`42:4`: LevellingEngine, kernel-tested) | 4 open questions (cross-branch prereqs, rung display, theta staleness demotion, pod placement) |

**37's five verified divergences (audit findings, all first-hand — the corpus outran the canon and
the canon never recorded what was built):**

1. **§4.1's "domain trees to add" table is stale.** 10 of its 11 trees already ship:
   `CurriculumSeed.ts:29-34` imports bio/chem/history/geography ("Phase 3") and `:35-43` imports
   language-arts/arts/music/second-language/civics/health ("Post-plan completion … doc 37"). Only
   `earth-science` is absent. The gap is canon-reconciliation, not corpus authoring.
2. **A named branch with no file.** `37:123` names `earth-science` in the K1 academic spine; no
   `earth-science.foundations.json` exists in `src/core/curriculum/data/` (16 data files, verified
   by `ls`). Either geo absorbed it (then the table should say so) or the branch is missing.
3. **§4.2's "current" corpus row is stale.** It says 56 holons / 1,280 items; the shipped registry
   holds **108 holons** across 16 data files (measured this session: 56 pre-expansion + 52 from the
   10 shipped K1–K3 branches). No "items" unit exists in the data model — holons carry a fixed
   5-phase template — so the item budget has no measurable counterpart in the tree.
4. **The invariant 37 promises was never built.** `37:165`: "`check:invariants` gains a per-branch
   minimum-density invariant." `grep densit|branch|minimum scripts/check-invariants.ts` → zero
   matches; the linter's real inventory — 17 checkIds across five categories: structural
   (S-1..S-5, G-CB-MISSING, G-CYCLE), pedagogical (P-1..P-4), developmental (D-1..D-4),
   epistemic (E-1, E-2) — contains **no density, no difficulty, and no drive-probe check**.
   Measured
   against 35 §5.2's own minimum-viable bar (**97 holons: 1 branch + 2 subjects + 6 topics +
   18 concepts + 36 instances**), every branch is far below it — math/physics richest at 13; the ten
   K1–K3 branches ship 5–6 holons each and are **structurally flat** (branch + concepts, no
   subject/topic levels at all). Nothing gates any of this: G17 lints dangling references, not
   density. The check ships as a finding precisely because no instrument exists to observe it.
5. **The difficulty-bell acceptance is unimplementable as specified.** `37:136-137`: "Difficulty
   distributions per branch must reproduce the observed bell curve (0.2→0.9, peak ≈ 0.5); branch
   linting (32) rejects otherwise" — but `CurriculumLinter.ts` has no difficulty check, and the
   data files carry no per-item difficulty field to check. Of the five acceptance criteria at
   `37:167-170` (density, acyclicity, difficulty bell, drive probes, voice audit), only (b) has a
   real mechanism (graph acyclicity: S-1 existence + G-CYCLE cycle detection).

**Organs:** `docs/system/sub-systems/{credentialing,cohort,curriculum}/` are **not stubs** — each
holds a real contract doc (e.g. `credentialing/claim-ledger-recognition.md`, 59 lines, 5 numbered
invariants, interface table naming `ClaimLedger`, `exportRPLPortfolio`, `ReliabilityCollector`,
G21) and a candid blocker line: blocked on an external institution. **Router:** the canon router
names 37–41 only as a `NN–MM` range — a findability nit, not an ownership hole: the full ownership
table owns all five (`44:291-295`: k12→37, cohort→38, journal→39, packs→40, credentialing→41).

## 4. Code presence map

| Dimension | Code state | Anchor evidence |
|---|---|---|
| K-12 corpus (37) | **live** — every session | `GameLoop.ts:260` → `CurriculumSeed.ts:70`; 16 data files, **108 holons** (measured); 12/13 map rows `present`, SEL `partial` by design (`subject-line-map.json`); density far below 35 §5.2's own 97-holon bar (§3 div. 4) |
| Grade bands (37 §2) | **deliberately absent** | `grep schoolStage|levelBand|gradeBand` → zero matches; the doc specifies the runtime never sees them |
| Cohort weave pure core (38) | **live via CLI only** | `podStateMachine.ts` (L1 privacy wall … L5 single-writer); `practiceCmd.ts:20` |
| Cohort transport (38 M1) | **dark** — zero production importers | `infra/pods/PodTransport.ts` (verified) |
| Journal (39) | **live in the WebUI** | `src/routes/journal/+page.svelte` (verified) |
| Measurement packs (40) | **pure core + gates; no live path** (§0 walls a–c) | registry test-only in production (`registerPack` zero production callers; `getPack`'s one read `delegate.ts:937` fallback-masked; `allPacks` unread); S1 mandate `delegate.ts:691`; runner callers = gate/tests/CLI drill |
| Recognition chain (41) | **complete, gated, unread** | `ClaimLedger` → G21 gate only (verified); CLI writes; `exportRPLPortfolio` CLI |
| Educator/Guardian/Therapist surfaces (16 §10.4, 33 §7) | **zero implementations** | grep verified; only canon rows name them |
| Articulation ladder (16 §10.5) | **in-vitro** | zero `src/` importers (verified); test-only |
| Curriculum + levelling (30, 42) | **live** | `LevellingEngine` kernel-tested; curriculum seed on the boot path |

## 5. Ranked gap list (implementation + operational)

1. **No auditor surface exists.** The education-SYSTEM promise (16 §10.4 / 33 §7) is canon-only.
   The T1–T3 council roles read bands as *prompt* scope (`councilStanding.ts`), not as screens for
   humans; 33 §7 is explicitly about parents/teachers/therapists looking at a dashboard.
2. **No claim derives from a real played session.** Pack sessions run only under gates/tests;
   the ledger is written by the CLI and read by nothing on a play path. The chain is trustworthy
   in vitro and evidentially empty in vivo.
3. **The networked half of 38 is dark.** PodTransport built, never wired; every multiplayer
   promise (and 40's MP3 A/B machinery, which needs cohorts) waits on it or its M0 fallback.
4. **37's acceptance layer was skipped while its corpus shipped.** Ten K1–K3 branches landed with
   zero gate able to observe their density, shape, or difficulty distribution against the canon's
   own acceptance criteria (§3 divergences 3–5); `earth-science` is a phantom row; the canon tables
   were never reconciled to what shipped. This is a *verifiable-acceptance* gap, not a content gap —
   the next phase's deliverable is the instrument, not more branches.
5. **WebUI scheduling parity** (standing largest engineering item, §2.1) — the browser is not a
   `tickWithStrategy` caller, so threshold mode and curriculum interleave never run for players.
6. **Interpersonal slot deficit** (Phase 16, diagnosed; fix scoped, not built).
7. **Deployment is user-blocked** (KV namespace IDs, analytics dataset, `LLM_API_KEY`, pod hosting
   decision) — no code items.
8. **41's externals are genuine externals** (DPIA, institution, EQAR) — correctly not code.

## 6. Phase 17 (PROPOSED 2026-09-26 — pending ratification) — the education-system second half

The pattern across 1–3 is one class: **the pure cores are built, the second party is missing.**
Phase 17 closes it in dependency order — each iteration makes the next one's evidence real. Detail
lives in this report; the plan entry (`DEVELOPMENT-PLAN.md` §4) points here.

**Track A — the education system (ordered by dependency):**

- **d1 — pack sessions on a live seam.** First the one-line repair the audit found: seed the
  engine's registry where the curriculum seeds (`registerPack` beside `seedCurriculumRegistry()`,
  `GameLoop.ts:260`), so `getPack`'s production read stops being a fallback-masked always-miss and
  `allPacks()` gains a reader. Then give packs a real-session path (wire the S1 mandate into a
  reachable delegation or a `mysterium practice pack` flow that plays through the same loop the
  campaign drives), so `ReliabilityCollector` accumulates from real play and claims can cite real
  sessions. Gate: a module-graph assertion in G44's style (absence-class: no runtime gate sees an
  unwired pack), plus a pack-session integration test.
- **d2 — the articulation ladder live.** Promote `articulationLadder.ts` from in-vitro to the render
  path it was built for; the ladder is the substrate every auditor surface reads through (16 §10.5).
- **d3 — the first auditor surface: Educator Desk** (33 §7), read-only, rendered from 16 §10.4
  projections + the d2 ladder. Educator first because the consent scaffolding exists (the council's
  educator roles); Guardian Mirror needs 38's supervision hook plus consent flows; Therapeutic Pane
  needs a clinician scope — both are follow-ups, deliberately sequenced after.
- **d4 — pod transport M0.** 38's own fallback: KV + client polling over the already-declared
  `RECOVERY_KV`-style bindings, driven by `podStateMachine`'s event discipline. M1 (Durable Objects)
  stays deferred until a hosting decision. Unblocks MP3's cohort machinery.
- **d5 — 37 canon↔tree reconciliation + the verifiable-acceptance layer.** The deliverable is NOT
  corpus authoring — 10 of 11 branches already ship. It is: (i) reconcile the canon tables to the
  measured registry (§4.1 "to add" → what exists; §4.2's stale 56/1,280 row → real counts; rule
  `earth-science` — author it or amend the table); (ii) build the per-branch density check in
  `check:invariants` that MEASURES against 35 §5.2's 97-holon minimum and shape rules and CAN FAIL
  on the shipped corpus — it ships reporting-first (per-branch numbers + verdict), and hardening it
  to a battery-failing gate is an explicit owner decision to take with the numbers on the table,
  because today every branch is below the bar and a hard gate would red the battery on arrival;
  (iii) give the remaining acceptance criteria (difficulty bell, drive probes) either a linter
  check or an explicit canon amendment that retires them — as specified, (c) is unimplementable (no
  difficulty field exists in the data model). Rule on the four open questions or mark them
  owned-open.

**Track B — production readiness (carried, in parallel):**

- **WebUI parity**: make `gameEngine.ts` a `tickWithStrategy` caller (the audit's §2.1 mechanism) —
  the single change that puts threshold mode, curriculum interleave, and the strategy weave on the
  player path, and the prerequisite for d3's surfaces being worth a dashboard.
- **Interpersonal fix** (Phase 16 item): rotating tie-break seed or seam-priority change, with a
  scale-independent coverage assertion in G43.
- **Deploy smoke**: once the user pastes KV IDs, a `wrangler pages deploy` + `/api/save` round-trip
  check closes the last code-side deploy item.

**Explicitly not in this phase (user-reserved):** KV namespace/dataset/secret creation, pod hosting
decision (M1), real raters for RV1–RV7, partner institutions for 41, DPIA.

## 7. Verification ledger

| Claim | How verified |
|---|---|
| 1696 tests / 148 files, fixtures 23/23, validate 23/23, lint 0/0, release smoke | full battery run this session (post-d9 tree) |
| CLI builders marked (2/2) | `evaluateCliInstrumentMarking` on the live tree: `passed: true, every force-aware CLI builder (2)` |
| Zero educator surfaces | `grep Guardian Mirror|Educator Desk|Therapeutic Pane` across repo — canon/plan mentions only |
| ClaimLedger single production import | `grep from '.*ClaimLedger'` — gate + tests only |
| PodTransport zero importers | `grep from '.*PodTransport'` in `src/` — none |
| articulationLadder in-vitro | `grep from '.*articulationLadder'` in `src/` — none |
| delegateSession callers | grep — definition + `gates/orchestration.ts:54` only |
| 37 density invariant absent | `grep densit|branch|minimum scripts/check-invariants.ts` — zero |
| earth-science phantom | `37:123` names it; `ls src/core/curriculum/data/` — 14 subject files, none earth-science |
| wrangler placeholders | `cat wrangler.toml` |
| WebUI not a `tickWithStrategy` caller | `gameEngine.ts:27-28` import block + caller grep (4, none in `src/lib`) |
| `/journal` route live | `ls src/routes/journal/` + header read |
| K-12 corpus on the boot path | `GameLoop.ts:260` (scout, consistent with `CurriculumSeed` imports) |
| Registry real counts (108 holons / 16 files / per-branch level shape) | node count script over `src/core/curriculum/data/`, this session |
| Pack registry test-only in production | grep `registerPack(`/`allPacks(`/`getPack(`: definitions `PackEngine.ts:101-111`; production callers — `getPack` one (`delegate.ts:937`), `registerPack`/`allPacks` none; tests only at `PackEngine.test.ts:38-41` |
| Council surface never registers in production | grep `CouncilIntegration` in `src/lib/` + `scripts/`: zero constructors; `councilTools.ts:212` shows the council `delegate_session` is a mandate tool, not the pack runner |
| Linter check inventory (complete) | `CurriculumLinter.ts`: S-1..S-5 + G-CB-MISSING/G-CYCLE (structural), P-1..P-4 (pedagogical — P-3 `warning` practice-problems, P-4 `info` misconception coverage), D-1..D-4 (developmental depth/modality), E-1/E-2 (epistemic description/rubric) — verified none is a density, difficulty, or drive-probe check |
| 35 §5.2 minimum = 97 holons per branch | `35:205-218` |

All `[scout]` rows from the first pass were re-verified first-hand in the advisory follow-up
(2026-09-26): the pack-registry and registry-count findings above are now grep/script-verified.
