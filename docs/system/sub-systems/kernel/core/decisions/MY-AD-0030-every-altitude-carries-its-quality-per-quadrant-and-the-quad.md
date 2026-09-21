---
ID: MY-AD-0030
Title: "Every altitude carries its quality, per quadrant, and the quadrants are read from it"
Status: Active
Date: 2026-09-20
Organ: kernel
Source: "foundations/02-eight-stages-overview §3, foundations/44 §3 axis A"
Description: "StageQuality ingested from KosmOS stages/altitude.md gives each altitude an emergent order, per-quadrant integrity and pathology markers, threshold markers and identity band. This is what distinguishes two altitudes that share a ray (Teal gateway opens vs Turquoise gateway traversed), and because the markers are already per-quadrant it closes the AQAL deferral of AGENTS.md §6 with ratified ontology rather than new theory. agapeScan/erosScan make the dual vectors of AGENTS.md §5.3 computable."
Related: [MY-AD-0029, MY-AD-0017, MY-AD-0021]
Consumer: "`src/core/domain/StageQuality.ts` (buildDevelopmentalAgenda), `src/infra/llm/ContextPipeline.ts` (the agenda block), `src/infra/llm/FrequencyConditioner.ts` (lensRead), `src/core/engines/ShadowContentGenerator.ts` (pathologyIn via LINE_QUADRANT); fixture `tests/core/domain/QualityWiring.test.ts`"
---

## Context

The stage registry described each altitude in one `description` string with `stub: true`, and
`Ray.ts` supplied a ray. Neither says **what an altitude is**. KosmOS `_Ontology/stages/altitude.md`
(status: Ratified, and canonical where it speaks per `44`'s precedence rule) defines every altitude by
four things: an **emergent order**, per-quadrant **integrity** markers, per-quadrant **pathology**
markers, and **threshold** markers, plus an identity band.

Two problems were being carried by that omission.

**First, the ladder had no quality axis at all.** `MY-AD-0029` removes the ray as a way to tell Teal
from Turquoise, which is correct — and it would leave the two indistinguishable if nothing replaced
it. Canon already names what separates them, qualitatively rather than by index: *"the gateway opens"*
(vision-logic, meta-perspective holding all prior stages as necessary) versus *"the gateway is
traversed"* (the entity embodies the integration; trans-rational direct knowing). A distinction that
rests on the altitude's own character is a *finding*; a distinction that rests on a sub-octave integer
is a *convention*. The user's instruction was explicit that it must be the former.

**Second, `AGENTS.md §6` had deferred AQAL quadrant integration** pending "clarity on how quadrant
dynamics ADD to the existing architecture". Meanwhile the ontology Mysterium is already governed by
carries those markers **per quadrant** — and `_Ontology/pathologies.md` is the *same* fourfold model
(`dark/golden × addiction/allergy`) that `AGENTS.md §5.2` uses. So the quadrants did not need a new
architecture. They needed the existing one ingested.

## Decision

1. **`StageQuality` is the quality axis** (`src/core/domain/StageQuality.ts`), one record per altitude:
   `altitude` (L1–L8), `kosmosStage` span, `mhcOrder`, `kegan`, `identityBand`, `emergentOrder`,
   `integrityMarkers`, `pathologyMarkers`, `thresholdMarkers`, `source`.
2. **Markers are per quadrant** — `QuadrantMarkers` is `{ UL, UR, LL, LR }` for both integrity and
   pathology, and `QUADRANTS` is exported. No marker may be quadrant-less.
3. **Content is transcribed from KosmOS, not authored here.** Each record cites its source line.
   Where Mysterium needs a narrower distinction, that is a divergence and must be recorded with its
   compensation (`44` precedence rule).
4. **The dual vectors become computable** — `agapeScan(cog)` returns every altitude below the centre
   of gravity (the heal/evolve vector, §5.3 bottom-up) and `erosScan(cog)` returns the CoG's own
   threshold markers plus the altitude they are called toward (the evolve/heal vector, top-down).
   This is KosmOS `altitude.md`'s diagnosis protocol, and it is the same two directions the shadow
   model already names.
5. **The AQAL deferral is closed as a *data* question.** The quadrants are present in the altitude
   model and read from it. `AGENTS.md §6`'s remaining, genuinely-architectural question — how
   quadrant dynamics *feed the encounter architecture* — stays deferred and is now a wiring question
   rather than a missing-model question.
6. **Structured access only.** `qualityOf`, `pathologyIn(stage, quadrant)` and
   `integrityIn(stage, quadrant)` — callers do not reach into the record, so a later refinement of the
   marker model does not ripple.

## Consequences

- Positive: the Teal/Turquoise distinction is now a property of the altitudes rather than of their
  order, which is what canon's "gateway opens / gateway traversed" actually says.
- Positive: `10`'s four-quadrant shadow model gains its per-altitude content from a ratified source,
  and `AGENTS.md §5.6`'s "the holon is never outgrown" acquires a mechanism — `agapeScan` *is* the
  lower-stage maintenance agenda, enumerated.
- Positive: one ingestion answered three previously separate questions (the quality axis, the AQAL
  deferral, and computable dual vectors), which is the expected payoff when a divergence is closed by
  adopting the governing ontology instead of deciding locally.
- Resolved (2026-09-21, `QUALITY-WIRING` discharged): the markers have three runtime readers.
  **(1)** `buildDevelopmentalAgenda` computes AGENTS.md §5.3's BOTH vectors in one pure record and
  the `ContextPipeline` renders it as a Veil-safe `[DEVELOPMENTAL AGENDA]` block — Eros names the
  threshold the centre of gravity is being pulled across, Agape names the lower altitudes' live
  pathology content. **(2)** `generateFrequencySpec().lensRead` gives `RAY_LENS`'s
  `rayFunction`/`subtleBody` (and the emergent order) their consumer in frequency conditioning, so
  the LLM knows WHAT an altitude works, not only HOW to speak at it (also closes the unread-fields
  half of `MY-AD-0029`). **(3)** `buildShadowPromptSuffix` grounds shadow encounters in
  `pathologyIn(stage, LINE_QUADRANT[line])` — doc 10's shadow model now reads the ratified markers,
  selected through the *line's* AQAL quadrant, never the shadow quadrant (they are different axes;
  `10 §12`). Still true by design: assessment *scoring* is untouched — the wiring aims catalyst and
  conditions prompts; it does not move measurement, so the escalation-to-assessment-targeting path
  remains open for Phase 10's personalization work (`45`), where it belongs.
- Neutral: `stub: true` remains on the registry entries. The registry holds presentation concerns
  (palette, audio, gravity); quality is a different lateral, and merging them would recreate the
  redundancy `MY-RG-0025` is about.
