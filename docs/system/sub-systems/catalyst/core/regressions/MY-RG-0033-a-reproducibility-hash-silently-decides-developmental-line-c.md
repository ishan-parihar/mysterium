---
ID: MY-RG-0033
Title: "A reproducibility hash silently decides developmental line coverage"
Status: Active
Date: 2026-09-25
Organ: catalyst
Severity: high
Source: "foundations/24-encounter-scheduler §3.3; src/core/engines/EncounterScheduler.ts"
Description: G43 reports finalized developmental line totals and the quietest/busiest ratio; the scheduler policy remains independently testable without claiming a production selection-reason telemetry stream.
Related: [MY-AD-0025, MY-RG-0023, MY-RG-0029, MY-AD-0033]
Consumer: src/core/engines/EncounterScheduler.ts (selectReservedPrimaryByLineCoverage, latestPositiveLineTimestamp) + src/core/validation/gates/campaign.ts (validateLineCoverage, G43) + tests/engines/TieBreakStarvation.test.ts
---
## The failure

When all substantive tie-break rules are equal, a static `refHash(moduleRef)` fallback can decide
which developmental line is offered. The result is deterministic but semantically wrong: a
reproducibility key becomes a starvation policy, and a line can remain effectively excluded from
the finalized developmental encounter stream.

## The guard

The first developmental offer reserves the eligible line with the oldest positive theta timestamp.
A never-served line is represented by `0`; missing or non-positive values cannot masquerade as
recent service. The reserve may cross a priority band, but it changes prominence only: candidate
`priority` values and the remaining ranked tail stay unchanged. Curriculum and training inserts are
excluded from the developmental reserve.

G43 runs the production campaign path and asserts that every canonical line has finalized
developmental provenance, with a quietest/busiest ratio of at least 2%. The production-path tests
cover the all-zero startup case, cross-band reservation, comparator ordering, and the unchanged
priority tail. G43 reports the finalized line totals and ratio; selection policy is covered by
production-path tests rather than an unimplemented reason telemetry stream.

## Why this guard is distinct

`MY-RG-0023` protects the closed eight-criterion priority formula from additive terms. This guard
protects a separate seam: an offer-slot reserve may exist without silently becoming a ninth score.
`MY-RG-0029` protects recency readers from reading the wrong end of a chronological trace. Together
they keep the formula, comparator, and developmental offer policy independently auditable.

## Consumer

`src/core/engines/EncounterScheduler.ts` (`selectReservedPrimaryByLineCoverage` and
`latestPositiveLineTimestamp`); `src/core/validation/gates/campaign.ts` (`validateLineCoverage`,
G43); `tests/engines/TieBreakStarvation.test.ts`; `tests/validation/Benchmark.test.ts`.

## Related authority

`docs/foundations/24-encounter-scheduler.md` §3.3–§3.4; `MY-AD-0025`; `MY-RG-0023`;
`MY-RG-0029`; the reserved-primary decision record in this organ.

<!-- 2026-09-25: Replace the false selection-reason claim with the gate behavior actually implemented; preserve policy coverage in production-path tests. (recon bfc2f1287f) -->
