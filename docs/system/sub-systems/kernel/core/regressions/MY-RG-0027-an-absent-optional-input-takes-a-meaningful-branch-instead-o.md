---
ID: MY-RG-0027
Title: "An absent optional input takes a meaningful branch instead of its default"
Status: Active
Date: 2026-09-20
Organ: kernel
Severity: medium
Source: foundations/24-encounter-scheduler §3.2.7
Description: "When a numeric input is optional and the code compares it without a default, the language answers instead of the domain: undefined < 900000 is false, so an unrecorded duration reads as a LONG session; a 0 sentinel compares as data where the code meant 'never visited'. Two paths that differ only in whether they stamp the field then produce different behaviour, and the difference is invisible because nothing errors."
Related: [MY-RG-0023, MY-RG-0028, MY-RG-0014]
---

## The failure

`SessionContext.sessionDurationMs` is required by its type, but a caller may leave it off — and
the browser binding does not stamp it at all (it starts a session with `sessionDurationMs: 0`,
while `src/core/validation/harness.ts` omitted the field entirely). `sessionFitScore` then read:

```ts
const shortSession = (session.estimatedTimeAvailable ?? session.sessionDurationMs) < 900_000;
```

With the field omitted, the right-hand side is `undefined < 900_000`, which is **false**. So
"no duration recorded yet" — the freshest possible session — was scored as a **long** session,
while the same session carrying `0` was scored as short. The two paths ranked candidates
differently, and nothing threw.

The cost was not a crash. It was a **parity gate reading green on a divergence it existed to
catch**: the kernel harness and the browser binding scheduled different encounters for the same
persona, and `PAR-3` still passed because a *separate* substituted criterion (a never-visited cell
scoring maximum theta urgency) flattened the differing dimension out of the CCI it asserted on.
The gate only began failing once `24 §3.2.1` was implemented faithfully and the flattening term
was removed — the bug was found by fixing a different bug.

The same class covers the sentinel half of the name. `thetaDecayScore` treats a timestamp of `0`
as "never visited" (this codebase's convention — `createSignificator` initialises every cell to
0), and canon agrees that such a cell scores `0.0`. But the two meanings of `0` — "never visited"
and "visited at the epoch" — are only distinguishable because the timer never returns 0 in
practice. Anything that reads a raw numeric field as data without checking whether it is *present*
is in this class.

## Why the gates missed it

Nothing was wrong in any checkable sense. The field is optional at one call site and set at
another; both compile; neither errors; the ranking that results is a valid ranking. The gate that
would have caught it (WebUI parity) was itself masked by a second substitution — a defect can hide
another defect when both are in the same formula.

## The guard

**Absence equivalence**: omitting an optional input must score exactly what its documented default
scores. `sessionFitScore` now writes the default explicitly —

```ts
const shortSession = (session.estimatedTimeAvailable ?? session.sessionDurationMs ?? 0) < 900_000;
```

— and `tests/engines/PriorityFormulaClosure.test.ts` asserts `computePriority` with
`sessionDurationMs: 0` equals `computePriority` with the field omitted, so the two spellings
cannot drift apart again. `thetaDecayScore` records its sentinel rule in the code itself: a cell
with no record or a `0` record scores `0.0`, and the test pins both halves (a fresh significator
scores `0` theta urgency; a cell stamped at epoch+1ms and long past its half-life scores `> 0.9`).

## The wider rule

When a field is optional, the default belongs in the expression — not in the language's coercion
rules. `undefined` and `0` are different answers to `x < 900_000`, and only one of them is the
domain's.

## Related

- `24 §3.2.7` — session fit, the criterion this was found in
- `24 §3.2.1` — theta urgency, where the same `0`-as-absence convention lives
- `MY-RG-0023` — the substituted term that masked this one
- `MY-RG-0028` — the parity harness that should have caught it first


<!-- 2026-09-20: link to the masking term, the parity harness that should have caught it, and the gate-fixture law (recon ba28734641) -->

<!-- 2026-09-20: Source must name a resolvable document path (DG15); link the record to its family (recon ee7385c595) -->
