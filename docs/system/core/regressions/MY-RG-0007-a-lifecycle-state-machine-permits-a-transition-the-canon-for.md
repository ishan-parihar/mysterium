---
ID: MY-RG-0007
Title: "A lifecycle state machine permits a transition the canon forbids"
Status: Active
Date: 2026-09-20
Organ: profiling
Severity: High
Source: "foundations/19-choice-and-polarity-engine §9.6"
Description: "Significator.ts allowed Exploring -> Harvesting directly, bypassing Developing, Crystallizing and Transforming."
Related: [MY-AD-0005]
---

## Symptom
A profile can reach the harvest state from the exploration state, skipping the crystallisation the
Choice requires — the endgame fires for a player who never crystallised.

## Root cause
`VALID_TRANSITIONS` was written as a set of reachable states rather than as the canon's gated path,
and no test asserted that the forbidden transition is actually rejected.

## Detection
A transition contract test asserting each forbidden edge is refused and each allowed edge is gated.

## Prevention
- The lifecycle test enumerates the canon's path (`19 §9.6`) and fails on any extra edge.
- `MY-AD-0005` owns the eligibility/event distinction the machine must express.
