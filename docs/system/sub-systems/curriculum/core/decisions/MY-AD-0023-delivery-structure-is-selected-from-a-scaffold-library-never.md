---
ID: MY-AD-0023
Title: "Delivery structure is selected from a scaffold library, never authored per encounter and never left unfaded"
Status: Active
Date: 2026-09-20
Organ: curriculum
Source: "docs/foundations/47-preference-inference-and-scaffolding.md section 6"
Description: "29 section 2.7 owns ZPD and fading as learning science but nothing selects which scaffold for which person, and 11's modalities are catalyst axes rather than scaffolds. Ten scaffolds are declared (worked-example, stepped-ladder, choice-set, estrangement, immersion, compare-and-contrast, quest-chain, moment-press, witness-and-invite, solo-inquiry), each carrying the meta-program readings that select it, its modality and depth compatibility, and its fading rule. Selection is a multiplicative bias in the same seam as every other bias (MY-AD-0008) rather than a fork of 24; the catalyst target is fixed before the scaffold is chosen; fading is mandatory because a scaffold that never fades is a crutch, and the expansion-ratio floor of 46 section 5.2 applies to the scaffold set as well as to the tag set."
Related: ["MY-AD-0021", "MY-AD-0008", "MY-AD-0018", "MY-RG-0017"]
Deferral: PROFILE-INFERENCE
---

## Decision

A **scaffold** is a structural arrangement of a facet sequence — *how* composed content is presented,
independent of the content — and it is a **selectable object with a library, a compatibility set and a
fading rule**, not a decision re-made by an author for every encounter.

```
compatible = { s ∈ ScaffoldStore :
                 modality ∈ s.modalities
               ∧ depth ≥ s.depthFloor
               ∧ stage ≥ s.stageFloor
               ∧ coherent(s, catalystTarget)              // 46 §7 step 5's coherence check
               ∧ exposures(target, s) < s.maxExposures }

chosen = argmax over compatible of  fit(s, metaProgramProfile) × developmentalFit(s, depth, stage)

subject to   aversion veto                        (45 §3.1 rule 2)
             structural fidelity to C              (45 §5.4)
             the expansion floor on scaffold set   (46 §5.2)
             the load-bearing rule                 (47 §5.3)
```

### The ten scaffolds

`worked-example` · `stepped-ladder` · `choice-set` · `estrangement` · `immersion` ·
`compare-and-contrast` · `quest-chain` · `moment-press` · `witness-and-invite` · `solo-inquiry`.
Each declares the meta-program readings that favour it, its modality and depth/stage compatibility,
and its `fadesTo` edges (`47 §6.2`).

## Four ratified properties

1. **The catalyst target is fixed before selection.** A scaffold arranges; it never chooses what is
   being developed (`45 §4`). The developmental agenda cannot be reached by preference.
2. **Selection is a multiplicative bias in the same seam as every other bias** (`MY-AD-0008`,
   `45 §5.3`) — never a second scheduler, never a filter wrapped around `24`'s ONE priority formula.
3. **Determinism.** The same `(profile, target, seed)` yields the same scaffold, recorded with its
   inputs exactly as a composition is (`46 §7.1`), so the player can ask why an encounter was shaped
   as it was and receive a record rather than a model.
4. **The expansion floor applies to scaffolds, not only to tags.** A player who always reads as
   in-time still meets `quest-chain` at the `46 §5.2` ratio; otherwise the scaffold library becomes the
   comfort engine the tag store is already guarded against.

## Fading is a path, not a setting

`solo-inquiry` is the only scaffold with no exposure cap, because the graph is a DAG **converging on
unassisted practice**. Fading is therefore movement *along* the graph, and `31`'s depth ceiling caps
how long a support can legitimately remain. Two rules follow:

- **Every scaffold has a `maxExposures` for a given target.** A scaffold that never fades keeps
  performance high and competence unchanged — the growth-edge rule (`16 §6.4`) in its scaffolding form.
- **Scaffold hardening is a defect, not a preference.** If one scaffold exceeds a declared share of a
  player's encounters, that is a fault to fix (`47 §9` check 9), not a personalisation success.

## What is not a scaffold

Three existing axes are orthogonal and must not be folded in: `11`'s **modalities** (a modality is
*what* probes — a scaffold is compatible with one, never a substitute for one); `08`'s **staircase**
(difficulty is a parameter of an encounter, and proactivity is kept structural precisely so a scaffold
cannot become a difficulty dial); `29 §2.2`'s **spacing/retrieval schedule** (time-domain, owned by
`29`; this decision schedules nothing).

## The player can see it

Legibility is `45 §3.1` rule 3, stated in plain language ("this was shown to you as a worked example
first") rather than meta-program jargon — a scaffold the player cannot inspect is indistinguishable
from being handled.

## References

- `docs/foundations/47-preference-inference-and-scaffolding.md` §6, §6.1–§6.5, §9
- `docs/foundations/29-meta-learning-science.md` §2.7, §2.8, §2.2
- `docs/foundations/31-depth-assessment-model.md` §3.5a (the depth ceiling)
- `docs/foundations/16-significator-architecture.md` §6.4 (growth edge)
- `docs/foundations/11-game-modalities.md`, `docs/foundations/08-psychophysics-and-staircase.md`
- `MY-AD-0008`, `MY-AD-0018`, `MY-AD-0021`, `MY-RG-0017`

<!-- 2026-09-20: DG19: declare where this law is consumed, or the pending key that will consume it (recon 2b4849c6b7) -->
