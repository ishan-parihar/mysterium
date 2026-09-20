---
ID: MY-RG-0025
Title: "A flattened stage-to-ray map absorbs a shared ray by inventing one"
Status: Active
Severity: High
Date: 2026-09-20
Organ: kernel
Source: "foundations/06-law-of-one-correspondence §5.1"
Description: "A Record<Stage, Ray> cannot say that two altitudes share a ray, so the missing distinction is absorbed by giving one of them a ray nobody has. Stage 8 carried Violet for a full re-index cycle while canon 06 §5.1 and KosmOS lenses/rays.md both read Turquoise as Indigo 6b. Guard: RAY_LENS is the source, no StageModule declares a ray, and tests/core/domain/StageLadder.test.ts asserts no altitude reads Violet."
Related: [MY-AD-0029, MY-AD-0030, MY-RG-0005]
---

## The regression class

A **lossy data shape does not stay lossy — it closes the gap by fabricating.** When a structure has
one slot where the domain has two values, the second value does not disappear; it reappears as a
wrong value in a neighbouring slot.

This is a distinct class from `MY-RG-0005` (canon and code drifting apart on a shared vocabulary),
which is about *the mapping being stale*. Here the mapping was maintained and still wrong, because the
container could not represent the truth:

| Truth (`06 §5.1`, `lenses/rays.md`) | Container | Forced representation |
|---|---|---|
| Teal = Indigo 6a, **Turquoise = Indigo 6b** | `Record<Stage, Ray>` — one ray per stage | two stages must differ ⇒ one of them gets a ray it does not have ⇒ `Turquoise: 'Violet'` |

The fabrication was invisible precisely because it looked principled: `Violet` *is* a real ray, and it
*is* adjacent to the top of the ladder (it is the closure). Nothing about `Turquoise: 'Violet'` reads as
an error on inspection. It survived an entire ladder re-index *and* the rename that changed the name
it was attached to.

## How it was found

Not by a test — no test asserted any stage's ray. It was found by comparing the code against the
ratified canon table while renaming stage identifiers for a different reason (`CODE-PASS`). That is
the diagnostic signature of this class: **the fabricated value has no failing test because the test
would have to know the truth the container cannot hold.**

Two corroborating symptoms existed and were read as unrelated:

1. `TransformationDetector`'s ray-readiness signal only worked for the top transition *because*
   Teal and Turquoise were assigned different rays. Fixing the map would have silently degraded it.
2. `StageModule.ray` restated the mapping per stage in a field nothing ever read — a second copy that
   agreed with the first because both were wrong the same way.

## The guard

1. **Single source.** `RAY_LENS` is the only place a ray is stated; `STAGE_RAY_MAP` and
   `STAGE_BLUE_FLOW` are derived from it and frozen. There is no second copy to drift.
2. **No per-stage ray field.** `StageModule` has no `ray` member, and the DG5 blacklist entry
   ``a per-stage `ray` field`` flags the pattern back into existence.
3. **The invariant is asserted, not assumed.** `tests/core/domain/StageLadder.test.ts` asserts:
   positional uniqueness across the ladder; that only Blue and Indigo are doubled; that Teal/Turquoise
   are 6a/6b on one ray; and — the direct one — that **no altitude reads Violet**.
4. **The closure is a named constant.** `CLOSURE_BINDING` means "the Violet position" is a thing a
   reader can find, so it stops being a free slot for whichever stage needs a ray of its own.

## Why this is worth a High severity

The affected terms are load-bearing: `STAGE_RAY_MAP` feeds encounter consequence (ray-centre
selection), encounter priority (`rayBoost`) and transformation detection, and `rayProfile.Violet` gates
the harvest. A fabricated ray at the top of the ladder is not cosmetic vocabulary drift — it is a
wrong address on the axis the endgame is measured by.
