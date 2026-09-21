---
ID: MY-AD-0029
Title: "The ray is a lens over the altitude ladder, never restated per stage"
Status: Active
Date: 2026-09-20
Organ: kernel
Source: "foundations/06-law-of-one-correspondence §5, §5.1, §8"
Description: "Ray is an overlay over Stage (a lens, never a place): RAY_LENS[stage] is the one source, STAGE_RAY_MAP is derived, SubOctave carries the 9 positions, Teal and Turquoise both read Indigo 6a/6b, and the Violet 7th position belongs to the closure event (CLOSURE_BINDING). No stage module declares a ray."
Related: [MY-AD-0025, MY-RG-0025, MY-AD-0030, MY-AD-0005, MY-RG-0030]
Consumer: "`src/core/domain/Ray.ts`, `tests/core/domain/StageLadder.test.ts`, and the DG5 blacklist in `docs/foundations/44-system-ontology-and-vocabulary.md`"
---

## Context

`06 §5`'s table is explicit and has been for the whole re-index cycle: **Teal = Indigo (6a) — "gateway
opens"**; **Turquoise = Indigo (6b) — "gateway traversed (adept)"**; and a third row, marked
*(closure, not a stage)*, **Violet (7th) — "total integration / harvest"**. KosmOS carries the same
table in `_Ontology/lenses/rays.md`, whose header states the governing law: the ray overlay is
*"a lens, never a place … available on request … not parsed by diagnose.py"*.

The code said otherwise. `STAGE_RAY_MAP` read `Turquoise: 'Indigo'` (correct — that is the altitude
now named Teal) and `White: 'Violet'`. Once the ladder was re-indexed, that pair became
`Teal: 'Indigo', Turquoise: 'Violet'` — **wrong twice over**: Turquoise is 6b, and no altitude holds
the Violet position at all.

The root cause is not the wrong value, it is the **shape**. A flat `Record<Stage, Ray>` can hold one
ray per altitude, so it cannot express that two altitudes share one. Presented with two altitudes on
one ray, the only way to keep them distinguishable *within that structure* is to invent a distinct
ray for one of them — so the `White → Violet` fusion survived the rename instead of being dissolved by
it. The registry compounded this: `StageModule.ray` restated the value per stage, in a field that
nothing read.

The conflation had a second effect, in the opposite direction. `TransformationDetector` measures a
frame-change signal from ray activation: *current ray saturated, target ray rising*. Teal→Turquoise
would satisfy that only if Teal and Turquoise were different rays — so the signal was silently
depending on the bug.

## Decision

1. **The lens is the source.** `RAY_LENS: Record<Stage, RayBinding>` lives in
   `src/core/domain/Ray.ts`, one binding per altitude, each carrying `ray`, `subOctave`,
   `rayFunction` and `subtleBody` transcribed from `06 §5` / `lenses/rays.md`.
2. **`SubOctave` is a first-class position type**: `'1st' | '2nd' | '3rd' | '4th' | '5a' | '5b' |
   '6a' | '6b' | '7th'`. Nine positions over seven rays — the arithmetic that lets a ray be shared.
3. **Teal = Indigo 6a, Turquoise = Indigo 6b.** No altitude reads Violet.
4. **The Violet position is addressed by the closure, not by an altitude**: `CLOSURE_BINDING`
   (`ray: 'Violet'`, `subOctave: '7th'`). There is no ninth stage, so there is no ninth entry in
   `Stage`.
5. **`STAGE_RAY_MAP` and `STAGE_BLUE_FLOW` are DERIVED from `RAY_LENS`**, never restated. The flat
   view survives only because three engines index it directly; it is generated, so it cannot drift.
6. **No `StageModule` declares a `ray`.** The member is removed from the registry's type. A per-stage
   ray field is a defect even when its value is correct — see `MY-RG-0025`.
7. **A shared ray is not a transition.** `sameRay(a, b)` is exported, and
   `TransformationDetector` abstains on the ray term for a same-ray step rather than reporting a
   boundary that does not exist. What separates 5a→5b and 6a→6b is quality (`MY-AD-0030`).
8. `stageAtRayPosition(ray, subOctave)` is the reverse lookup, so the a/b distinction is queryable
   rather than implied.

## Consequences

- Positive: the altitude framework and the ray framework are now separately addressable, which is the
  law KosmOS states in `framework-density.md` §"Three axes, never conflated" and `CONSTITUTION` rule
  13. A document or module can speak about altitude without implying a ray, and vice versa.
- Positive: `44` law 7 ("a ray is never restated per stage") is enforceable in principle and enforced
  in practice by the blacklist pattern `a per-stage \`ray\` field`.
- Positive: the harvest keeps its independently accumulated `rayProfile.Violet` accumulator, and the
  change *clarifies* why it must: the Violet ray is the position at which the harvest is assessed, so
  reading it as "the top stage's ray" was a category error, not a rounding difference.
- Resolved (2026-09-21): the accepted negative this record carried — that the old `checkHarvest`
  tested the Violet total alone and not the rainbow distinctness `lenses/rays.md` specifies ("each
  color distinct, none bypassed") — is now closed. `rainbowDistinctness` (R-G-B floors + a min/max
  distinctness floor) is part of `checkChoiceEligibility`, and `MY-AD-0005`/`MY-RG-0030` own the
  condition/event split and the lifecycle licence. See `06 §8`'s closing note.
- Neutral: this changes the ray read by `ConsequenceEngine`, `PriorityComputation` and
  `TransformationDetector` for stage-8 encounters, so the kernel battery and personas were re-verified
  in the same commit (`MY-AD-0025`'s rule for behaviour-moving changes).

<!-- 2026-09-21: link the record that now owns the rainbow-distinctness half (recon 4d88e38dc0) -->
