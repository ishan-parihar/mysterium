---
ID: MY-AD-0033
Title: "The first developmental offer reserves least-recently-served line coverage"
Status: Active
Date: 2026-09-25
Organ: catalyst
Source: "foundations/24-encounter-scheduler §3.3"
Description: "The scheduler's first developmental offer is reserved for the eligible line with the oldest positive theta timestamp. This is an offer-slot policy, not a ninth priority criterion: it may cross a priority band, changes no candidate priority, and leaves the non-primary ranked tail unchanged."
Related: [MY-AD-0025, MY-RG-0023, MY-RG-0029, MY-RG-0033]
Consumer: src/core/engines/EncounterScheduler.ts (selectReservedPrimaryByLineCoverage, latestPositiveLineTimestamp, scheduleNext) + src/core/validation/gates/campaign.ts (validateLineCoverage, G43) + tests/engines/TieBreakStarvation.test.ts
---

## Context

The first campaign reading found that the scheduler's tie comparator could reach its static
`refHash(moduleRef)` fallback after the substantive novelty and familiarity rules tied. Because the
hash is a reproducibility key, it must not silently become a developmental line-coverage policy.
The eight-criterion priority formula is already closed by `MY-AD-0025`; this decision does not add
a ninth score or alter the score of any candidate.

## Decision

For the **first developmental offer** in a scheduling step, reserve one eligible candidate from
the line with the least-recently-served positive theta timestamp. A line with no positive timestamp
has value `0` and therefore has not been served. When every eligible line is unserved, `ALL_LINES`
provides only the deterministic startup tie-break; it does not express relative developmental value.

The reserve is an offer-slot policy. It may cross a priority band, but it does not change any
candidate's `priority` value and does not reorder the remaining ranked tail. The non-primary tail
retains score-and-band order. Curriculum and training inserts are outside this developmental slot.

## Consequences and checks

- `24 §3.3` keeps its five comparator rules: starvation, modality novelty, recent-line novelty,
  unfamiliar-first, then the deterministic hash. The reserve selects the first developmental
  offer; the tail still uses the comparator.
- G43 exercises the production campaign path, counts finalized developmental provenance only,
  requires every canonical line, and retains the 2% quietest/busiest floor. It does not claim that
  every ambient or secondary offer contains every line.
- A zero timestamp is never inferred from a missing or future value as recent service. The test
  suite covers zero timestamps, cross-band reservation, and the resulting unchanged priority tail.

## Related authority

`docs/foundations/24-encounter-scheduler.md` §3.3–§3.4; `MY-AD-0025`; `MY-RG-0023`;
`MY-RG-0029`; `src/core/engines/EncounterScheduler.ts`; `src/core/validation/gates/campaign.ts`.


<!-- 2026-09-25: Bind the decision to its production consumers and related formula/recency guards (recon 9cc7baaf98) -->
