# UI-COMPLETENESS-REMEDIATION-PLAN — 2026-09-30

> **Status: AWAITING APPROVAL. Nothing below is built.**
>
> Every number in this document was measured against the tree on 2026-09-30, not read from a
> document. Where an earlier claim is corrected, the correction and its evidence are given. Where
> something is asserted about runtime behaviour it is browser- or gate-observed; anything unmeasured
> is marked `[UNMEASURED]`.

**Authority:** none — this is a plan, not a contract. Canon (`docs/foundations/`) wins on conflict and
this document is revised in place. The live-sequencing predecessor is
`docs/audits/UI-COMPLETENESS-PLAN-2026-09-30.md`; that file lives in the `audits` rung, which is
`live: false`, so it was **not** consulted by `arch.py context` — the gap this document closes.

---

## 0. The document-drift findings this plan answers

Four blind spots were found by measuring the tree against the docs. Three are now records; the
fourth is item 3 below.

| # | Finding | Evidence | Record |
|---|---|---|---|
| 1 | **G55, G56, G57 exist in code and are named in no live document.** `AGENTS.md` §4.2 ends its roster narrative at "51 gates"; the roster is **57**. | `grep -c 'G5[2-7]' AGENTS.md` → 0 for all three; `roster.ts` has 57 `results.push`; `Benchmark.test.ts:132` asserts 57 | **MY-RG-0034** |
| 2 | A process-global `DirectorAgent` made every browser on an isolate share one player's calibration. Both callers discarded a session id they had already parsed. | `63b363b`; mutation turns 6/9 tests red, one reading "b was completed by a" | **MY-AD-0036** |
| 3 | **§4.2 of the dashboard canon names five renderers where six exist, four of which were never built** — and states no per-view status, so a plan reads as an inventory. | importer counts: `DevelopmentalRadar`/`LearningTrajectory`/`StudyPlanner`/`IntegrationMap` = 0; `KnowledgeDashboard` = 1 | **MY-AD-0035** |
| 4 | A hardcoded roster count in prose is a **derived surface with no emitter**, so every future gate lands invisible. | `arch.py emit` regenerates `INDEX.md` + organ routers; nothing regenerates `AGENTS.md` §4.2 | item 3 below |

**Item 1 is the one with the widest blast radius.** G55 is the closed-register Veil gate, G56 the
keyed-`{#each}` gate, G57 the route-reachability gate. A reader of the current root protocol is told
the kernel checks 51 things and has never been told those three exist. G57 has already caught a real
orphan (`/knowledge` was reachable only from `/profile`) that a reader of the current protocol would
have had no reason to look for.

---

## 1. What is DONE and needs no further work

Measured, not inherited. Every item was browser- or gate-observed before being marked done.

- **Save persistence.** `/calibrate` writes through `persistSignificator`; the journal and recovery
  paths write and read the same key. A player who completes calibration can reach `/play`.
- **`endGameSession` is reached** (`/play`, plus `beforeunload`/`pagehide` in the layout).
  `totalSessions` 0→1 observed leaving `/play`.
- **Skip does something.** Four consecutive Skips yield four different cards; the decline is recorded
  in `avoidedEncounters` and persisted.
- **Calibration thresholds match their contract.** Per-line declared-stage assertion, both maps.
  All six choice lines read **Orange** at the deepest option, in the browser.
- **G57 is real and currently green.** `/knowledge` is now linked from Settings.
- **The agent runtime is per-session**, LRU-bounded at 64.
- **Battery green**: `tsc` 0 · `svelte-check` 0/0 · **182 files / 2006 tests** · **arch 23/23**.

---

## 2. P3 — the four missing dashboard views (the only feature work)

Canon order: 2, 3, 4, 5. **All four are presentation debt — the data exists.** The bar set by
MY-AD-0035: *a view with no pure-logic module extracted is not finished.*

### View 2 — `DevelopmentalRadar` (`33 §3.1:98-110`)
Extend `/profile`'s **existing inline SVG radar** with per-line curriculum depth. Canon names the three
additions precisely: subjects per line, cross-domain strengthening, depth-level distribution per line.
- Pure module: `depthDistributionByLine(knowledge) → Record<Line, Record<DepthLevel, count>>`
- Data: `dev.primaryLine` / `dev.secondaryLines` (the cross-domain edge canon names), `ConceptState.depthLevel`
- **Read-register gate:** line/altitude is **open** register (`AGENTS.md` §5.4). `ShadowQuadrant` and
  `polarityMode` are **closed** — they must not appear in the label or the tooltip.

### View 3 — `LearningTrajectory` (`33 §3.1:112-128`)
Depth level over time. Milestones on new-depth-reached, forgetting dips, and a pace projection.
- Pure module: `trajectorySeries(conceptStates) → {t, depth}[]` + `milestones(series)`
- Data: `ConceptState.depthHistory` + `lastReviewedAt`
- **The one open question:** canon asks for time *and* a projection. A projection needs ≥2 depth
  transitions per concept; with one concept having two, the projection is a two-point line. Either ship
  it honestly labelled as an estimate or defer the projection — do not render a confident dotted line
  over n=2. `[UNMEASURED — measure the transition count before deciding.]`

### View 4 — `StudyPlanner` (`33 §3.1:130-150`)
The auto-mode strategy engine's recommendations, made visible, with rationale per recommendation and
learner overrides.
- `docs/foundations/27-auto-mode-strategy-engine.md` owns the engine; this is its renderer.
- Override actions write through the same path the CLI uses, or the override is cosmetic.

### View 5 — `IntegrationMap` (`33 §3.1:152-163`)
Cross-domain analogy edges, **gated on 'analyzed' depth** (`33 §3.2:170`). Ship **last**: the gate
depends on the depth model the earlier views surface.
- Nodes: concepts at 'analyzed'+. Edges: shared structural pattern across domains.

### Sequencing, and the first task
**First: extract and test `KnowledgeMap`'s layout logic** (`depthOrdinalFor`, `placed`, `gapIds`). It
ships untested, and Views 2–5 will copy its shape — a debt copied four times is a debt compounded four
times. Prove it red by mutating each helper.

---

## 3. Document maintenance — the drift closes only if something emits

`MY-RG-0034` records the finding; a record alone does not stop recurrence. The shape:

- **Amend `AGENTS.md` §4.2** to name G52–G57 with what each enforces, and to state the roster size
  as "as of `roster.ts`" rather than a bare number.
- **A gate that fails when a gate is added and no doc names it.** This is the only real fix. The
  failure is an *absence* — a new gate has no shape a runtime gate rejects — so the enforcement is a
  **module-graph/document assertion** in the same shape as G44 and G36: for every gate id in
  `roster.ts`, some non-audit document must name it.
  - Mutation: add a gate, run the gate, confirm red; name the gate, confirm green.
- **Bound the count claim.** Once the assertion exists, the bare "51" in `AGENTS.md` stops being
  load-bearing prose and becomes a hint.

---

## 4. Carried findings, unchanged, and not this plan's work

Honest status. None of these are new; none are fixed by anything above.

- **Nested interactive inside `role="button"`** on `/play`'s encounter card: a `<button>` ("Skip")
  inside a `role="button"`. Invalid ARIA — a control inside a control. Pre-existing; the `cardKeydown`
  containment guard mitigated the keyboard symptom but did not fix the structure. Fix: move Skip
  outside the card, or make the card a non-interactive wrapper with its own Enter/Space handling.
- **`flushEngine` has zero callers.** A tab close still loses the session unless `beforeunload` in the
  layout covers it — `[UNMEASURED: the layout does register `beforeunload`; whether it reaches
  `flushEngine` specifically is not confirmed.]`
- **`checkTermUnlocks` — 0 callers in `src/`.** Check `scripts/` and the CLI before touching its loop.
  If genuinely uncalled, wire it or record it as documented in-vitro. Do not quietly broaden semantics.
- **`inferAltitudesFromAnswers` — unused.** `/calibrate` uses `QuickCalibrationScoring`. Delete or wire.
- **`docs/audits/UI-COMPLETENESS-PLAN-2026-09-30.md` is in the wrong rung** — this document supersedes
  it as the live sequence. Moving the predecessor is a separate change with a router edit.
- **Deploy blockers (user-deferred, not code work):** the Cloudflare account mismatch
  (`wrangler whoami` → `the.understrata@proton.me`; the project lives under a different account);
  CNAME for `mysterium.ishanparihar.com` needs `Zone:DNS:Edit`; credential rotation for the two
  secrets named in an earlier session.
- **`arch.py fixtures` has not been run since the gate roster changed shape.**

---

## 5. Approval checklist

Each line is a decision, not a task. Nothing starts until these are answered.

| # | Question | My recommendation |
|---|---|---|
| 1 | Ship Views 2–5 at all, or hold the dashboard at View 1 until deploy is unblocked? | **Ship.** They are canon-declared, the data exists, and Views 2–5 are what makes the curriculum visible. |
| 2 | If shipping: one commit per view, or one commit for all four? | **One per view**, each browser-verified. A four-view commit cannot be bisected when a view is wrong. |
| 3 | The doc-drift gate (item 3) — build it now, or record the finding and fix it after the views? | **Now.** It is small, it is the only thing that stops recurrence, and every week it waits is another unnamed gate. |
| 4 | Move `UI-COMPLETENESS-PLAN-2026-09-30.md` out of `audits`? | **Yes**, to `plans` with a router entry. Cheap, and it is why `arch.py context` never surfaced it. |
| 5 | The nested Skip/card ARIA violation — fix now, or with the view work? | **Now.** It is a small, self-contained a11y defect in a live surface. |
| 6 | `checkTermUnlocks` / `inferAltitudesFromAnswers` — delete or wire? | **Check callers first**, then decide. Deleting an unused export is the lazy correct answer if nothing calls it in `scripts/` either. |
