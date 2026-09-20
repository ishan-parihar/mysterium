---
ID: MY-AD-0001
Title: "Assessment-module execution replaces the ATB combat spine"
Status: Active
Date: 2026-09-20
Organ: kernel
Source: "foundations/26-unified-core-architecture"
Description: "Progression runs on assessment-module execution; narrative frames (including conflict) are delivery vehicles, never the progression mechanism."
Related: [MY-AD-0002, MY-RG-0005]
---

## Context
The original design used a time-bar (ATB) combat system as the progression spine. It measured
nothing developmental, and it forced every other mechanic to hang off damage and XP.

## Decision
The progression spine is **assessment-module execution** (`foundations/26`). Encounters are
delivered by the seven modalities (`foundations/11`); conflict may appear as a *narrative*
frame but never as the mechanism that advances the player. The superseded ATB design is
archived in `docs/historical/archive/atb-combat/`.

## Consequences
- Positive: every encounter is measurable; the module contract is the single integration point.
- Negative: the combat-fantasy appeal must be re-earned through narrative framing.
- Guard: `MY-RG-0005` (superseded-vocabulary regression) keeps the old vocabulary out.
