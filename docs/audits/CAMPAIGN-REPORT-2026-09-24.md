# Campaign Report — 2026-09-24

**Scope:** what the live seam does over trajectory time, measured by running the campaign runner
(`src/core/simulation/campaign.ts`) over the curated kernel personas plus a generated cohort, through
the same orchestrator path the CLI uses.

> **Addendum, 2026-09-24 (same day) — §4.2 item 5 was diagnosed and fixed.** The first reading of
> this report measured `polarityReadings: 0` and named it a symptom. Following it found an
> **unenterable loop**: the dialectic state advance was fed the pair the engine structurally
> *selected*, but `46 §5.3` forbids selecting on an `undiscovered` pair — the only state its own
> writer creates. The loop opens on *texture* engagement instead, and the same pass removed a second
> writer that reconciled a pair in one `sto` step against `46 §4.3`. **Item 5 is closed; items 1–4
> remain, and item 1 is now provably independent of item 5** (with the loop open, the unfamiliar
> share moved only 20.6 % → 21.2 %, still under the 0.25 floor). New gate **G41** (suite 40 → 41)
> locks both. Read §4.2 item 5 for the mechanism, the fix, and the before/after numbers.

**Provenance of every number below: `provenance: provisional-simulated-cohort`.** The cohort is
synthetic and the provider is stubbed. This report may **reject** — and it does, once, below. It may
never **certify**: real raters and real play remain the only certification paths, and nothing here
writes a threshold, flips `rvPassed`, or mutates the tree.

**Reproduce:**

```bash
npm run cohort -- --personas flourishing,constricted,golden-bypass --sessions 3 --encounters 4
npx tsx scripts/cohort-calibrate.ts --generated 40 --seed 1 --sessions 2 --encounters 4
```

**Scale of the run reported here:** 50 campaigns (10 curated + 40 generated) · 100 sessions ·
400 finalized encounters.

---

## 1. Why this report exists

Phase 15 was scheduled because the project could not answer its own central questions with evidence.
`createOrchestrationServices` had two production callers (the CLI and the WebUI engine), and the
kernel's `runPersonaTrajectory` drove the loop *directly* with no services — so gates G22–G35
exercised personalization and memory in isolated fixtures, G36 booted the CLI once, and **nothing ran
many sessions over trajectory time through the live seam**. The calibration list in `AGENTS.md §4.2`
item 3 was blocked on "real play data", and the architecture's central claims — adaptation to a
specific person, transformation over time, content variety that does not collapse — had no observed
evidence at all.

The Phase 14 ruling settled the method: headless exists so agents can test and debug everything, and a
surface an agent cannot reach is a blind spot by construction. So the play data this project needed
was generatable by its own agents, and generating it was cheaper and more truthful than waiting for
players.

**This report is the first result of that.** It found three defects the gates could not see, one of
which is the largest of the phase. Those come first, because they change what the numbers below mean.

---

## 2. What the campaign found that no gate could

### 2.1 The fallback path was not architecture-live (the largest finding)

`personalizationContext()` — the one function that selects the polarity pole, runs the candidate pool,
records composition telemetry, stashes the dialectic pair, and gathers the continuity material — was
called from `run()` and `runLanguageReflective` **only**. Both assemble an LLM prompt.

`runFallback` → `runModuleAssessment` never called it. That path is not an edge case: it is what runs
whenever no LLM is configured or the call fails, and it is what the **hermetic tier — the tier that
gates CI** — runs.

Measured before the fix, over a campaign:

| Observable | Before | After |
|---|---|---|
| `candidateSourceShare` | `{unknown: 1}` | `{npc, composed, recoloured-similar, authored-world, …}` |
| `poleShare` | `{none: 1}` | `{familiar, unfamiliar}` |
| `composedCells` | 0 | 2–3 per campaign |
| `compositionEvents` | 0 | 3–4 per campaign |
| `polarityReadings` | 0 | 0 *(unchanged — see §4.2)* |

So on the fallback path the pool never selected, `46 §11`'s monitors read an empty window, the
polarity coverage query had **no input ever**, and no scenario seed, world place, persona voice or
continuity line was gathered.

This is Phase 13's failure class — *a consumer named in the docs that no live seam calls* — one level
deeper: inside a single method's **branch**. It is invisible to every gate that calls `buildEnvelope`
directly, which is every gate that touches the envelope today. A test of a function cannot observe
that its caller does not call it.

### 2.2 F7 was three sites, not one

`writeInValue`/`questionText` were declared on `ConsequenceRecord` to carry the player's own words onto
the record. They were populated on the LLM tool path only. The module-assessment path — again, the one
every production encounter takes, since a module is always supplied — read the answer into a local and
set neither field; so did the simple-fallback path.

All three now assign unconditionally, so an encounter offering no write-in **clears** the previous one
instead of reporting an earlier encounter's words as its own. The module path also had no way to report
the question it asked (the renderer composes it), so `presentedQuestionText()` joins the presenter's
existing `rendererEvaluate`/`taskStartTime` wire-backs.

### 2.3 The encounter log rendered a detached label

The live smoke showed the log writing `**Question:**` followed by a blank line and then the text,
because `_lastQuestionText` held the composed prompt (narrative intro glued to the question) and the
writer slices to 500 characters — so a long intro could push the actual question out of the evidence.
`appendEncounterLog` now collapses whitespace per value, and the field holds the question.

---

## 3. The numbers

### 3.1 Poles served — **REJECTED**

| | Observed | Threshold | Verdict |
|---|---|---|---|
| unfamiliar share | **21.0 %** | `EXPANSION_RATIO_FLOOR` **0.25** (`46 §5.2`) | **below floor** |
| familiar share | 66.5 % | — | — |
| shadow-facing share | **0.0 %** | — | never served |

The expansion ratio controls *the fraction of composed encounters whose structure must come from the
opposite pole*, and its floor exists because **a comfort engine is a failure mode, not a
preference**. Over 400 encounters the unfamiliar pole is served 21 % of the time against a 25 % floor,
and the third mode (`shadow-facing`) is served **never**.

This is stable rather than noisy: the same measurement at 78 encounters read 19.2 %, and at 400
encounters 21.0 %. It is the first calibration number this project has ever produced, and it is below
its threshold.

**It is not fixed here.** A number below a floor is the calibration pass doing its job; deciding
whether the engine under-serves the unfamiliar pole, or whether the campaign's short sessions
(4 encounters) cannot reach the pole rotation, is a question for the next phase — and answering it
requires a longer trajectory than this run used.

### 3.2 Composition variety — **insufficient data**, and that is itself the finding

| | Value |
|---|---|
| cells composed | 12 (of 64) |
| cells measurable (≥ `MIN_COMPOSITIONS` = 8 each) | **0** |
| min cell entropy | n/a (nothing measurable) |
| entropy floor | `ENTROPY_FLOOR` 0.5 (`46 §11`) |

400 encounters spread across 12 cells puts fewer than 8 compositions in any one cell, so the entropy
question is **unanswerable at this scale**. This is a cohort-scale finding, not a composition finding:
the visibility-collapse countermeasure cannot be evaluated until a cell is composed enough times to
measure, and no verdict is reported rather than a verdict inferred from noise.

An earlier 78-encounter run reached **5 cells with 0 measurable** and reported `minCellEntropy 1.099`
on the 2–3 cells it could see — above the 0.5 floor, which is encouraging but not evidence.

### 3.3 Candidate provenance — what rendered each encounter

| Source | Share |
|---|---|
| `npc` (derived from the authored holon corpus) | 46.5 % |
| `composed` (instantiated from the facet store) | 20.0 % |
| `recoloured-similar` (`~sim` — familiarity tier) | 13.0 % |
| **`unknown`** (no resolvable candidate) | **12.5 %** |
| `authored-world` | 5.5 % |
| `recoloured-opposite` (`~opp` — novelty tier) | 2.5 % |

Two things to read here. The **`~opp` share is 2.5 % against `~sim`'s 13 %** — a 5:1 familiarity skew
in the recolouring tiers, which is the same comfort-engine shape as §3.1 measured at a different
layer. And **12.5 % `unknown`** — one encounter in eight resolved no candidate id at all, which means
`candidateSource()` could not classify it. Either a new id scheme has appeared that the decoder does
not know, or some encounters reach the orchestrator with no composition stamp. Worth a follow-up;
the decoder deliberately reports `unknown` rather than guessing, which is why this is visible.

### 3.4 Per-line coverage — the scheduler reaches a third of the lines

| Line | Encounters | Share |
|---|---|---|
| Spiritual | 138 | 34.5 % |
| Intrapersonal | 86 | 21.5 % |
| Cognitive | 73 | 18.3 % |
| Interpersonal | 32 | 8.0 % |
| Willpower | 10 | 2.5 % |
| Somatic | 7 | 1.8 % |
| Moral | 3 | 0.8 % |
| **Emotional** | **1** | **0.3 %** |

Every line's modal altitude is `Red` — the bench band the harness's world seeds (`ALL_STAGES.slice(0,
3)`), so the altitude column is a property of the benchmark world rather than a finding.

**The distribution is the finding.** Half the encounters land on three lines (Spiritual,
Intrapersonal, Cognitive = 74 %) and Emotional receives **one encounter in 400**. A developmental game
whose premise is 8 lines of intelligence cannot leave a line unexercised, and theta-decay on an
untouched line cannot be measured if the line is never touched. The scheduler's line coverage is a
first-class object of study, not a persona property — and the `neglectLines` cohort dimension, which
exists to exercise decay deliberately, is only meaningful against a scheduler that would otherwise
spread.

### 3.5 Observables that are pinned or unfit

| Observable | Reading | Assessment |
|---|---|---|
| `driveFixation` | **0** for all four drives, every persona, every configuration | pinned |
| `thetaStaleness` | **0.000** on every line | **unfit, not pinned** — see below |
| `shadowsSurfaced` | 0 for many personas, non-zero for others | persona-specific, working |

**`thetaStaleness` is a correction, recorded because the first reading was wrong.** It reads 0.000
everywhere, which looks like a second pinned observable beside `driveFixation`. It is not:
`observables.ts` computes raw staleness from `computeStaleness(..., Date.now(), ...)` and min-max
normalizes it ACROSS lines so the profile is *invariant to wall-clock injection*. A campaign runs on
the **virtual clock** (`BENCH_EPOCH`), so every cell saturates against the real `Date.now()`, the
per-line maxima are equal, `span === 0`, and every line reports exactly 0.

The observable does what it documents; it is simply not fit for a virtual-clock campaign. **G40
therefore asserts theta-decay over `sig.theta.lastEncounter` directly** — and it passes, which means
decay does land on the neglected lines. A gate written on the first reading would have failed on a
system whose decay works.

**`driveFixation` remains the open one.** It is 0 across every configuration observed — curated and
generated, all four drives, all stances, with and without a drive tilt authored to fixate. This is the
T2 pattern from Phase 14 d2a in a new location: a pinned number reads as a flat curve, not as a bug.

### 3.6 What could not be measured, and why

| Observable | Status | Reason |
|---|---|---|
| MemoryPage size / render budget | unmeasurable | the page is built inside `buildEnvelope` and consumed by `memoryPageBlock`; neither is returned to the caller, so the campaign cannot read its size |
| prompt render budget | unmeasurable | the assembled prompt is private (`this.messages`); measuring it needs a prompt-size hook at the LLM seam |
| engagement-register hits | unmeasurable | the register records MECHANISMS at authoring time, not hits at runtime; a hit count would be invented |
| polarity readings | **0** | a reading needs BOTH `context.poles` and `context.polarity`; the composition's canon-level poles are not the dialectic engine's player-level ones, so the pair key never resolves |
| probe offers / verdicts | **0** | the probe offer path is not reached within a 4-encounter session |

The first three are carried in `UNAVAILABLE_OBSERVABLES` with their reasons and **omitted from every
row**, so a reader can never mistake an absent number for a measured zero. The last two are measured
zeros, which is a different statement — and both are now *known* rather than unknown.

---

## 4. What the campaign closes, and what it opens

### 4.1 Closed

- The live seam has a long-horizon exerciser: `npm run cohort`, driven by the same orchestrator
  construction and response derivation the CLI uses (`usecases/EncounterSession.ts`) — structurally,
  not by discipline.
- The fallback path is architecture-live, so the hermetic tier genuinely exercises personalization.
- `writeInValue`/`questionText` are on the record for the ordinary production encounter.
- The calibration list is **discharged from observed distributions**, labelled provisional.
- **G39/G40** make these properties the kernel's conscience (suite 38 → 40), and they are the only
  gates that assert over a trajectory through the seam.

### 4.2 Open, in priority order

1. **The unfamiliar-pole share is below its floor (21 % vs 25 %) and `shadow-facing` is never
   served.** Reproducible. Needs a longer trajectory to separate "the engine under-serves novelty"
   from "4 encounters cannot reach the rotation".
2. ~~**`driveFixation` is 0 in every configuration.**~~ **DIAGNOSED 2026-09-24 (Phase 16 d2).** It is
   **not a pinned observable — it is a starved input.** `driveFixation` reads `sig.drives.fixationRisk`,
   which only `updateDriveBalance` writes, and only for a drive whose directionality is one of the four
   pathological signals (`HealthyBalanced` *decrements* it toward 0). The campaign harness never
   delivers one, for **two independent reasons**:

   - **The persona harness drops the stance it declares.** `personaChoiceHandler`
     (`src/core/simulation/campaign.ts:170`) reads exactly two things from `persona.policy()` — the
     option index and `narrativeSummary` — so the `driveDirectionality` the same call computes
     (`personas.ts:84`, from the authored `options.drives` override) is **never consumed**. The kernel
     harness can pass it (`runPersonaTrajectory` hands its response object straight to
     `processOutcome`), but the campaign path cannot: the orchestrator *derives* the evaluation, so the
     fixture has no seam to declare its stance through. This is the same failure class the campaign
     keeps finding — **a fixture path that reaches less of the engine than the path it mirrors** — and
     it is why "with and without a drive tilt authored to fixate" made no difference: the tilt exists,
     it just never arrives.
   - **The narratives are filler, so the keyword channel is dead.** `personas.ts:81` generates
     `narrativeSummary` as 50 tokens of `w${(step*7+i)%50}`. On the fallback/module path a drive signal
     becomes non-healthy only when `detectWriteInShadow` finds a shadow keyword in the free text — so a
     write-in of `w0 w1 w2 …` can never fire, and all four signals stay `HealthyBalanced`.

   **The arithmetic confirms it rather than suggesting it:** `HealthyBalanced` adds exactly `+0.01` to
   the weight and `−0.02` (floored at 0) to the risk, and the measured weights are **0.03 after 3
   encounters and 0.06 after 6** — 1 × 0.01 per drive per encounter, all four drives, every encounter,
   for every persona including `golden-bypass` and `constricted`, which are authored to accumulate
   exactly this. `fixationRisk` is therefore *provably* 0 under the current harness, and the observable
   is not at fault: hand the same engine a non-healthy signal and G40's predecessor already proves the
   write moves (`ConsequenceEngine.ts:416`).

   **The repair (F-6, ratified: BOTH, for different questions).** The fix was not "repair
   `driveFixation`" but **"give the campaign a way to declare a drive stance"** — and the two channels
   answer different questions, so both are now in place:

   - **(a) Prose, for the end-to-end question.** `personas.ts` gained a `prose` option; the personas
     with a shadow stance now write in the vocabulary that stance would use, so `detectWriteInShadow`
     is exercised as production exercises it. Every line is ≥ 40 words, matching the reflective-depth
     estimator's full-bonus length. The filler default stays for personas with no shadow stance — it
     keeps the word-count heuristics measurable without injecting vocabulary the other channel reads.
   - **(b) An explicit fixture-only seam, for the coverage question.** `declaredDirectionality` on the
     orchestrator (and on `EncounterSessionInput`) replaces the derived directionality. It exists
     because the derivation can emit at most ONE pathological signal per encounter, so the 4-quadrant
     × 4-drive model `driveFixation` exists to watch is unreachable from anything a player can produce.
     **No production caller sets it** — a declared stance in production would assert a player's
     evaluation instead of measuring it (`43 §4.1` L4) — and `EncounterProvenance.declaredStance`
     records which channel carried each encounter, so a reading is never attributed to the wrong one.

   **Measured after, both channels firing:** `golden-bypass` surfaces `GoldenAddiction` shadows from
   its own prose (2 in 4 encounters, 3 in 8) with `Eros` fixation **0.13 → 0.53**; `constricted`
   reaches **Communion 0.07 → 0.31** through the declaration (its `avoid: true` empties the write-in, so
   the prose channel cannot serve it — which is precisely why (a) alone was not enough); generated
   cohort members move their authored drive only. Locked by **G42**, which asserts the stance moves the
   **declared** drive, **only** that drive, that it **accumulates** across the trajectory, and that
   every contributing encounter is **attributed** to the channel.

   **A correction the gate itself produced, kept because it is instructive:** G42's first draft asserted
   `rate × encounters` and FAILED (0.53 observed vs 0.20 expected). The advance runs more times per
   encounter than the orchestrator's own evaluation — the declaration is delivered per encounter and the
   matrix/transformation advance applies on top — so the true rate is a fact about the seam's CALL
   GRAPH, not about `updateDriveBalance`. Pinning it would fail the moment the call graph changed for an
   unrelated good reason, so the gate asserts the drive, the direction of change and the attribution
   instead. **A gate that encodes the wrong model of the call graph is the same failure as a fabricated
   zero, one level up.**

   **One further mismatch found and NOT fixed (new, for Phase 16):** the kernel harness drives personas
   with a **cumulative** `step`, while the campaign passes a per-question step plus a **session-label
   hash** as the offset. Any persona whose stance is indexed by step or by session (`therapy-arc`'s
   "surface in session 1, engage healthily after"; the `s % 3` alternations) therefore resolves
   DIFFERENTLY in a campaign than in a kernel trajectory — `therapy-arc` declares its surfacing arc and
   produced **0 shadows and 0 fixation** in a 2-session campaign. Its kernel gate (G4) passes, so this
   is a campaign-harness fidelity gap, not an engine one, and it belongs to this phase's sweep because
   item 1's re-measurement inherits it.
3. ~~**Three lines receive zero encounters across 400.**~~ **DIAGNOSED 2026-09-24 (Phase 16 d3) — the
   tie-break's final key, a hash meant for reproducibility, is deciding line coverage.** Not supply,
   and not the priority formula:

   - **Supply is symmetric.** The bench world has **3 holons per line, same stages, all active** — so
     no line is starved of candidates.
   - **Priorities are effectively identical.** Measured over the first tick's 72 candidates, the
     per-line mean priority spans **0.145–0.147**, and five of the eight criteria (`thetaUrgency`,
     `shadowActivation`, `driveCorrection`, `narrativeCoherence`, `masteryAlignment`) are **0.000** at
     session start. So one tie band holds the entire candidate set (65–72 of 72) and the band's own
     comparator — not `computePriority` — selects the encounter.
   - **The comparator's three substantive rules all tie.** Logged per tick: the winner and Emotional's
     best candidate BOTH carry a modality absent from the last 3, BOTH carry a line absent from the
     last 2, and (once each line has been touched) BOTH are equally "familiar". Rule 1 ties, rule 2
     ties, rule 3 ties — and rule 4 is `refHash(moduleRef)`, a **static** function.
   - **So the hash decides, and it decides the same way every time.** `24 §3.3` names the hash as
     "deterministic final key — reproducibility" (never a score), and the doc-comment above it even
     warns about reading the right END of `world.recentEncounters`. Careful reasoning, applied to a
     fallback that is in practice doing the policy work: the only thing that changes tick to tick is
     which modalities sit in the 3-encounter recency window, so the rotation cycles through just the
     lines whose modality offer happens to match the currently-unused set — Spiritual, Intrapersonal
     and Cognitive — at exactly the 74 % share measured.

   **Why this is not a fixture artefact and cannot be fixed by cohort scale:** the same comparator
   runs in production (`scheduleNext` → `rankCandidates`), so a real player's line coverage is
   hash-decided too, and the personas DO differ on stance — they are simply never offered the lines.
   The report's earlier guess ("a scheduler line-coverage question rather than a persona one") is
   confirmed, and the object of study is narrower than "the scheduler": it is **the tie-break's key
   ORDER, and what should outrank the hash**.

   **The repair is a ratification (Phase 16 d3, open).** The canon-compatible shape is a **starvation
   term** ahead of the hash (how long a line has gone unserved, or its encounter share against the
   eligible set) — `24 §3.3` already owns variety, and asking a reproducibility key to carry policy is
   the actual defect. The counter-argument is real and worth stating: the band is defined as "the set
   of candidates whose developmental value is indistinguishable", so a starvation term is only
   permissible if line coverage is a *developmental* value rather than an administrative one — which
   `46 §11`'s visibility-collapse countermeasure and `AGENTS.md`'s holonic-integrity commitment
   (`§5.6`: lower stages must remain healthy) both argue it is. Measured, for the record: Emotional
   received **1 encounter in 432** and three lines carried 74 %.
4. **12.5 % of encounters resolve no candidate id.** Either a new id scheme or a missing stamp.
5. ~~**`polarityReadings` is 0 because the pair key never resolves.**~~ **DIAGNOSED AND FIXED
   2026-09-24 (same day) — and it was not a missing input, it was an unenterable loop.** The report's
   first reading was the symptom; the cause is two writers with two laws and one missing parameter:

   - `sessionEnd`'s state advance is the ONLY `undiscovered` → `active-tension` writer, and it is fed
     `AgenticOrchestrator.lastDialecticPair`, which was built from `context.poles` — the pair the
     dialectic engine *structurally selected*. But `46 §5.3` forbids selecting on an `undiscovered`
     pair, and a pair only leaves `undiscovered` through that advance. **The loop had no entry point:
     `poles` was null for every one of the 400 encounters** (verified: 0/24 envelopes on a bench
     sweep, with `polarity` non-null in 16/24 — the pool selected a rendering; no dialectic pole was
     ever selectable). `lastPairKey`, and therefore the reading and the coverage query, inherit that
     null.
   - The advance **reconciled a pair in a single sweep**: it mapped `active-tension` → `reconciled`
     on one `sto` encounter, against `46 §4.3`'s law (*repeated* confirmations only) and against
     `polarityResolution.applyReading`, the writer that actually owns reconciliation through the
     confirmation tallies. Measured on a 3-session campaign: `nature|technology` went
     `undiscovered` → `active-tension` → **`reconciled` on its second encounter**, with no tally
     behind it — and since a reconciled pair is unselectable as a structural pole (§5.3's saturation
     guard), the single-sweep bug permanently removes the player's only edge after two encounters.
   - The advance read its direction from a stashed field (`lastPolarityDirection`, set by
     `finalizeEncounter`). The **module-assessment path** — the one the hermetic tier and
     production-with-modules take — calls `recordSessionEnd` *without* `finalizeEncounter`, so the
     advance ran with `direction === undefined` and returned the map unchanged. Instrumented: of 8
     advances in a 2-session campaign, 6 had *both* pair and direction missing, 1 had a pair and no
     direction. This is the **same failure class as the d3 composition-stamp finding and F7**: a
     fallback path that stashes less than the path it mirrors. Same shape, third occurrence.

   **Fix (3 files):** the engaged pair is now exposed on the envelope (the pool's primary candidate's
   tag + its dialectical opposite — `ScenarioContext.engagedPair`) and is the discovery writer's
   input, so the loop opens on texture engagement, exactly as `46 §4.3`'s table allows; the advance
   now *discovers only* and reconciliation is solely `applyReading`'s; and `recordSessionEnd` takes
   `direction` as a **required parameter**, so the ordering invariant that three call sites violated
   no longer exists to violate. Locked by **G41** (suite 40 → 41) plus two campaign-series tests.

   **Measured after (50 campaigns / 150 sessions / 627 encounters):** `polarityReadings 243 · pairs
   discovered 80 · reconciled 0 · distinct pairs 4` and the pass verdict moves from
   `loop-unenterable` to **`loop-open`**. The unfamiliar-pole share moves only 20.6 % → 21.2 %
   (still below the 0.25 floor) — so **the floor breach is NOT explained by the closed loop**, and
   item 1 stays open as an independent defect. The new reading to watch is `distinct pairs 4` across
   627 encounters: the engine's edge is thin, which is the next hypothesis for item 1 and the first
   thing a longer trajectory should test.

   The pass gained a `polarity` section for this. It is worth stating why a section rather than a
   line in the report: `polarityReadings: 0` read as a healthy zero, and a measure that returns zero
   for a *structural* reason must be reported by the instrument that produces it, or its silence
   looks like health.
6. **Composition entropy is unmeasurable at this cohort size.** Needs more encounters per cell, not
   more cells.
7. **Scale.** 50 campaigns × 100 sessions is affordable in CI; whether the entropy floor and the
   saturation thresholds can ever be measured hermetically, or need the experiential tier, is the next
   question the plan must answer.

---

## 5. What this report is not

It is not a certification, and no number in it should be quoted without the
`provisional-simulated-cohort` label. The cohort is synthetic: it is a **parameter space**, not a
population. Its personas are authored stances, so a finding about "what players do" cannot come from
it — only a finding about **what the engine does when handed a stance**. That distinction is the
reason the campaign exists: before it, the engine's behaviour under *any* stance was unobserved.

It is also not a measurement of the game's capacity to transform anyone. Transformation is asserted
only where its threshold predicate holds (G40), and the campaign's own personas do not cross it. What
the campaign can say is that transformation does **not** fire as an artefact of session count — which
is the failure that would make every progression claim false.
