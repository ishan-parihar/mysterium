# Campaign Report — 2026-09-25

**Scope:** the second dated reading of the live seam, taken after the Phase 16 instrument repairs
(d1–d5) and before any threshold was moved. It supersedes nothing:
`docs/audits/CAMPAIGN-REPORT-2026-09-24.md` remains the record of the **original** reading, and its
`1/432` Emotional result, its 74 % three-line share and its 12.5 % unknown-candidate share are
historical facts about the pre-repair engine.

> **`provisional-simulated-cohort`.** Every number below comes from a synthetic cohort driven
> deterministically through the live seam. It may **reject** and may never **certify**. Real raters and
> real play remain the only certification paths. Nothing here moves a threshold.

**Two passes, deliberately different instruments.** The wide pass answers *"what does the engine do
when it is free to choose?"*; the focused pass answers *"is one cell's composition variety even
measurable, and what does pinning a cell do to the pole mix?"* They are not two samples of the same
thing, and §3 explains why the focused pass **must not** be read as a wide-cohort result.

Commands, verbatim, so every figure can be reproduced:

```bash
npx tsx scripts/cohort-calibrate.ts --generated 2 --sessions 2 --encounters 4
npx tsx scripts/cohort-calibrate.ts --generated 0 --sessions 2 --encounters 6 --target-cell Cognitive:Red
```

---

## 1. What was repaired before this reading, and why it had to come first

None of the four 2026-09-24 open items were calibration problems; they were instrument problems. A
calibration pass cannot calibrate a floor against a scheduler that starves a line, or a threshold
against an observable nothing produces.

| Repair | What changed | Gate / evidence |
|---|---|---|
| **d1** | `memoryPage` gained a real producer (the envelope measures the page it builds and renders). `renderBudget` was **reclassified, not measured** — see §2. `engagementRegisterHits` stays deliberately unmeasured. | Production-path tests |
| **d2** | `driveFixation` delivered through the declared-stance channel. | Built 2026-09-25 |
| **d3** | The first developmental offer is reserved for the least-recently-served eligible line. | `MY-AD-0033`, `MY-RG-0033`, **G43** |
| **d4** | Candidate provenance reads the raw `candidateId`; `missing` and `unrecognised` are now separate statuses. | `candidateStampStatus` tests |
| **d5** | A focused campaign pins one `Line:Stage` cell and **fails loudly** if any encounter it finalizes leaves that cell. | Campaign focused-mode tests |

---

## 2. d1 in full: one producer, one reclassification, one deliberate absence

The 2026-09-24 report carried three dashes. This reading carries one.

**`memoryPage` is measured.** `buildEnvelope` already built the page and rendered it inline via
`memoryPageBlock` without returning it; the measurement is now taken there — the last place the page
exists. It reports three deliberately separate units: `blockLines`/`blockChars` (what the renderer
produced) and `continuityLines` (what survived the Veil guard and reached the prompt). The gap between
them is a guard working, not a smaller page.

> **Wide pass, observed:** 24 sessions, **84 encounters measured** of 96 — max block **1 line / 74
> chars**, mean **63 chars**, max continuity **1 line** (post-Veil). The 12-encounter gap is the
> denominator rule working, not a loss: an encounter that ran no personalization seam contributes no
> reading rather than a zero, and `encounters` is the count of those that did. A one-line page is the
> honest reading for a hermetic cohort with a near-empty feed — it is *not* evidence that the page is
> small in real play, where a populated feed produces a fuller page. The number is real; the
> population behind it is not.

**`renderBudget` was reclassified rather than fabricated.** An inherited implementation computed
prompt/history character counts at the orchestrator's LLM call site and published them under a field
named `requests`. Three things were wrong with it, and all three are reasons the number cannot exist
yet:

1. **It is not post-Veil, and on one path it cannot be.** The direct path applies `filterInput` inside
   `LLMClient`, but the WebUI BFF path returns to `proxyQueryLLMWithTools` **before** that filter runs
   (`LLMClient.ts:469-475` vs `:481`) — so the filtered prompt is knowable on one path and unknowable
   on the other. A count taken at the orchestrator measures the **pre**-filter prompt, which the
   transport then shrinks.
2. **One encounter is several requests.** The tool loop issues one request per turn with growing
   history, so "requests" was really "encounters that reached the loop" — an encounter-count proxy
   wearing a request count's name.
3. **There is no single seam.** `queryLLMWithTools` (tool loop), `queryLLMStream` (fallbacks) and the
   WebUI BFF proxy each send a different body.

The producer that would close it is a per-request counter in the transport layer, on both paths. Until
that exists the honest reading is *absent with a reason*, and the reason is carried in
`UNAVAILABLE_OBSERVABLES` where a reader sees it. The orphan `lastRenderBudget` field and both of its
write sites were **deleted**, not left dormant — a repo that computes a request budget while
declaring it unmeasurable is a contradiction waiting to be quoted.

**`engagementRegisterHits` stays unmeasured, deliberately.** The register holds authoring-time
*mechanism* records and answers a policy question; it has no runtime event. Counting its policy
consults would overcount (several per player-visible decision), and deriving "hits" from the pole mix
would re-report a number the row already carries. It becomes meaningful when `45 §7.3` defines what a
hit is.

---

## 3. The numbers

### 3.1 Wide pass — `provisional-simulated-cohort`, exit 0

**Scale: 12 campaigns · 24 sessions · 96 encounters.**

| | Observed | Floor | Verdict |
|---|---|---|---|
| Unfamiliar-pole share | **47.9 %** | 0.25 | **above-floor** |
| Familiar-pole share | 39.6 % | — | — |
| `shadow-facing` share | **0.0 %** | — | see §3.4 |
| Composition | 7 cells composed, **0 measurable** | entropy 0.5, min 8 compositions | **insufficient-data** |
| Exit code | — | — | 0 — *no defect observed over 96 encounters* |

**Candidate provenance (what actually rendered each encounter):**

| Source | Share |
|---|---|
| `npc` | 27.1 % |
| `recoloured-opposite` (`~opp`) | 25.0 % |
| `recoloured-similar` (`~sim`) | 22.9 % |
| `composed` | 12.5 % |
| `unknown` | 12.5 % |

**Candidate stamp status** — the d4 repair, and the reason the `unknown` row above is no longer
ambiguous: **present 87.5 % · missing 12.5 % · unrecognised 0.0 %.** The entire residual is
`missing` (the orchestrator reported no candidate id at all), **not** an unrecognised id scheme. The
2026-09-24 report's 12.5 % `unknown` is the same *magnitude* with a now-diagnosed cause; they are
different findings and are not to be conflated.

**Per-line coverage — seven of eight, evenly.** Seven lines took exactly 12 encounters each
(84 of 96) and `Interpersonal` took **0**. Compare the 2026-09-24 baseline, where three lines carried
74 % and the rest competed for the remainder. d3's reserve is a **clear improvement on that gradient**,
and the evenness across the seven is the shape it was designed to produce.

But this is **not** the same claim as the gate's, and the difference must not be blurred. **G43, run
directly on 2026-09-25, passes**: `every line offered · quietest/busiest 1/2` over its own roster
(`Cognitive 2 · Emotional 2 · Moral 2 · Intrapersonal 1 · Spiritual 1 · Somatic 1 · Willpower 1 ·
Interpersonal 1`) — all eight lines reached, floor held. G43 asserts over **one persona**
(`flourishing`); this calibration is a **12-campaign cohort**, and on that cohort one line is still
excluded entirely. So: the repair is confirmed on the gate's own population, and the cohort shows a
residual exclusion that the gate's single-persona roster cannot see. Whether the reserve should reach
`Interpersonal` on *this* population is open work, not something this report settles.

**Polarity loop:** readings 70 · pairs discovered 33 · reconciled 0 · distinct pairs 3 · proposed by
`deterministic-fallback` 70, `system1` 0. **Verdict `loop-open`** — the pair key now resolves (item 5
stays closed). But **every reading is a fallback proposal and no pair has reconciled**: the loop is
enterable and inert. That is a new finding, not a resolved one.

### 3.2 Focused pass — `provisional-simulated-cohort`, exit **1**

`--target-cell Cognitive:Red` · **10 campaigns · 20 sessions · 120 encounters.**

| | Observed | Floor | Verdict |
|---|---|---|---|
| `Cognitive:Red` compositions | **12** | 8 minimum | — |
| `Cognitive:Red` entropy | **2.138** | 0.5 | **above-floor** · `reachable` |
| Cells composed / measurable | 1 / 1 | — | **first measurable cell in the project's history** |
| Unfamiliar-pole share | **0.0 %** | 0.25 | **below-floor** |
| Familiar-pole share | 69.2 % | — | — |
| `shadow-facing` share | **30.8 %** | — | see §3.4 |
| Exit code | — | — | **1 — a defect was observed** |

**This closes the measurability question and simultaneously produces a rejection.** The 2026-09-24
report called entropy "unanswerable at this scale" and was right *at wide-cohort scale*. It is
answerable the moment the cohort is aimed at one cell: 12 compositions on one cell, entropy 2.138
against a 0.5 floor. **The wide pass's `insufficient-data` was a scale artefact, not a composition
defect** — the engine was never starving variety; the measurement was spread too thin to see it.

**The exit 1 is not a bug and must not be smoothed away.** Pinning one cell confines the dialectic
engine to one pair, so it can only ever propose the familiar side: unfamiliar-pole share goes to
**0.0 %** and shadow-facing rises to 30.8 %. This is the expected consequence of the instrument, and it
is the cleanest available evidence for §3.4 below.

### 3.3 The two passes are not comparable, and must not be averaged

| | Wide | Focused |
|---|---|---|
| Cells | 7 | 1 |
| Unfamiliar share | 47.9 % | 0.0 % |
| Verdict | above-floor | **below-floor** |

The focused pass answers the **entropy** question and the wide pass answers the **pole** question. A
focused unfamiliar share of 0.0 % is an artefact of pinning; it is **not** evidence that the expansion
dimension is broken in normal play, and the wide pass's 47.9 % is **not** evidence that a single cell
stays varied under a dialectic engine that cannot leave it. Reading either number as the other is the
error the two-tier discipline exists to prevent.

### 3.4 `shadow-facing` — a separate diagnosis, still open

The wide pass serves `shadow-facing` **0.0 %**; the focused pass serves it **30.8 %**. Both figures are
simultaneously correct, and together they are the diagnosis:

- In **wide** play the pole mix is driven by `~opp` recolouring (25.0 %) — unfamiliar *texture* within
  a cell, not shadow work. Shadow-facing never wins the selection there.
- In **focused** play the one available pair resolves shadow-first, and shadow-facing becomes the
  fallback's *only* remaining option.

So `shadow-facing` is not broken and not dormant: it is **out-competed in wide play and forced in
focused play**. Two things follow. First, the wide `0.0 %` is a real finding about pole selection and
must not be reported as "shadow-facing does not work". Second, **`expansionRatio` is not decided** —
F-4 stands, the floor stays at 0.25, and the wide 47.9 % above it is one synthetic reading, not a
licence to move the number.

### 3.5 Rejections and confirmations, stated plainly

- **Confirmed by measurement:** line coverage improved after d3 — **seven of eight lines at 12
  encounters each, `Interpersonal` at 0** on this 12-campaign cohort, against the 2026-09-24
  three-line-74 % gradient. G43 independently passes on its own single-persona roster
  (`quietest/busiest 1/2`, all eight offered).
- **First ever measured:** per-cell composition entropy (2.138 on `Cognitive:Red`, above floor).
- **Rejection carried forward, unchanged:** `shadow-facing` wide-share 0.0 % (§3.4).
- **Rejection, new:** focused unfamiliar-pole share 0.0 % — an artefact of the instrument, recorded so
  it is not later mistaken for an engine defect.
- **Rejection, new:** polarity loop is enterable but inert — 70 readings, 0 reconciliations, 100 %
  fallback proposals.
- **Still insufficient data:** wide-cohort entropy (0 measurable cells) is *expected* at this scale and
  is no longer the open question.

---

## 4. Status

**Closed by this pass:** the wide-cohort entropy measurability question (§3.2) · the d4 ambiguity in
the candidate residual (§3.1) · d1's `memoryPage` and `renderBudget` questions (§2).

**Open, in priority order:**

1. **`Interpersonal` is excluded entirely on the 12-campaign cohort** (0 encounters) while G43 passes
   on its own single-persona roster (§3.1). **The mechanism is d3's tie-break, not a missing reserve.**
   `selectReservedPrimaryByLineCoverage` (`EncounterScheduler.ts:53-70`) breaks a fresh-significator
   tie — every cell at zero, so every line "never served" — by canonical `ALL_LINES` order, and
   `Interpersonal` is **last** in that order (`Line.ts:36`). It is therefore the one line that can
   never win a tie, while the reserve only ever reorders lines that already produced a candidate
   (`eligibleLines` is built from `ranked`, so a line filtered out upstream is unreachable — but at
   t=0 all eight lines *do* produce candidates, which is why the exclusion is state-dependent and not
   a static filter). The fix is in the tie-break's ordering or its freshness definition, **not** in
   widening the reserve. Separately, G43's roster should widen beyond one persona so a
   population-level exclusion is visible to the gate at all.
2. **The polarity loop is enterable and inert.** 70 readings, 0 reconciled, every proposal from
   `deterministic-fallback` and none from `system1`. The pair key resolves now (item 5), so the next
   step is *why no pair ever reconciles* — a state-machine question, not a measurement one.
3. **`shadow-facing` wide-share 0.0 %.** Diagnosed in shape (§3.4) but not in cause. Distinguishing
   "out-competed by `~opp`" from "never selected" needs a selection-reason event, which the
   architecture does not emit.
4. **Real-rater RV1–RV7 thresholds for the 8 authored probes.** Untouched by any of this; the RV
   harness runs, the hermetic tier cannot substitute raters. Unchanged since 2026-09-22.
5. **Per-line saturation thresholds.** Still awaiting real progression curves. Reported as a
   distribution on purpose.

**Explicitly unchanged:** `EXPANSION_RATIO_FLOOR` (0.25), `ENTROPY_FLOOR` (0.5), `MIN_COMPOSITIONS`
(8). No threshold moved on synthetic evidence, per F-4.

---

## 5. What this report is not

It is not a certification. The cohort is a **parameter space**, not a population, and every number
carries `provisional-simulated-cohort` for that reason. It is not a measurement of the game's
capacity to transform anyone. It is not a threshold decision: it can reject, and it has rejected twice
here, but it cannot certify and it moved no number.

And it is not the end of Phase 16. d6 is now measured, d7 is this document, and the phase remains
**active** — the open items above are instrument and calibration work that only real play data can
finish.
