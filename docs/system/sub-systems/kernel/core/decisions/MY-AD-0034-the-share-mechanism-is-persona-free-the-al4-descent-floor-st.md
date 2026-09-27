---
ID: MY-AD-0034
Title: "The share mechanism is persona-free; the AL4 descent floor starts at L1"
Status: Active
Date: 2026-09-27
Organ: kernel
Source: "docs/foundations/16-significator-architecture.md §2.4 + §10.5"
Description: "Owner ruling 2026-09-27: sharing is an API-key-permission shape (player-selected scopes = the entire security interface); L0 is never grantable to an auditor — the floor code already enforces is now canon, recorded with its compensation"
Consumer: "`src/core/domain/articulationLadder.ts` (renderLevel's enforced floor) and d3's share mechanism (Phase 17)"
Related: []
---

# The share mechanism is persona-free; the AL4 descent floor starts at L1

**Owner ruling (2026-09-27):** the Significator profile sharing system does not implement
second-party personas (parent / guardian-of-record / teacher / therapist) at this point. It is
implemented like an API-key permission level: a player intending to share their profile
creates a share and selects the scopes the recipient may see — **the scope selection is the
entire security interface.** No identity typing, no role classes, no guardian-of-record logic.

## What the code does that canon did not state

`renderLevel` (`src/core/domain/articulationLadder.ts`) enforces that an auditor grant's
scopes form a **contiguous run starting at L1** (`firstIdx >= 1`): L0 (felt-sense — the
player's own surface, 16 §10.5's table row) is never grantable to an auditor, and gapped
in-scope grants (e.g. `['L1','L3']`) are refused. Refused renders return a reason, never a
partial payload. Canon AL4 (16 §10.5, "descent only for auditors… progressive disclosure")
implied but never named the floor; the code pinned it. Pinned by `tests/core/presentation/LadderLive.test.ts` (LD3).

## Compensation (what an auditor loses)

Nothing. The L1 holonic span already carries the player's lived-experience summary in
rubric-named form; the auditor's traversal begins at exactly the level that carries
oversight-relevant content. L0 is the player's felt-sense narration — it carries no
oversight-relevant measurement that L1 lacks.

## Compensation (persona re-framing)

16 §2.4's persona rows (parent/teacher/therapist) are re-framed as **consumers** of the share
mechanism — the use cases 33 §7's render contracts serve — not implemented machinery. No
capability is removed: the three surfaces remain render contracts over the same shares; only
identity-typing is deferred until an institutional surface requires it.

## Consumers

- `renderLevel`'s scope check (`src/core/domain/articulationLadder.ts`) — the enforced floor.
- d3's share mechanism (Phase 17): share creation + scope selection + revoke, per this ruling.
- 16 §2.4.1 (the share contract) and 16 §10.5's amended AL4 row carry the canon text.

