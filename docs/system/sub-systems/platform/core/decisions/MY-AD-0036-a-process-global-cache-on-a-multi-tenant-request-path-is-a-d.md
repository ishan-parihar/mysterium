---
ID: MY-AD-0036
Title: "A process-global cache on a multi-tenant request path is a defect by construction"
Status: Active
Date: 2026-09-30
Organ: platform
Description: "agentRegistry held one DirectorAgent; both callers discarded a session id they had already parsed, so the first player to calibrate calibrated for all."
Related: []
Consumer: "`src/lib/server/agentRegistry.ts` + the platform battery module-graph assertion"
Source: AGENTS.md §7.4 M9 (the checked-graph rule) + MY-RG-0005 (canon and code drift apart)
---

## The decision

**Every process-scoped singleton on a multi-tenant request path must declare its key.** A module
global that holds per-player state is a defect by construction, not a performance shortcut.

## The instance that forced the ruling

`src/lib/server/agentRegistry.ts` held **one** `DirectorAgent` for the whole process. Both callers had
already parsed a session id and discarded it:

- `src/routes/api/agent/probe/+server.ts:28` — `void sessionId; // reserved for per-session routing later`
- `src/routes/api/agent/observe/+server.ts` — validated that `sessionId` was present in the body,
  returned 400 when it was not, then called `getOrCreateAgentRuntime()` with no argument

The effect: the first browser to complete calibration completed it for every other browser on the
isolate, and each new arrival overwrote the previous player's probe state.

**The part that makes this a ruling and not a bug report.** There was no dispose path in the request
lifecycle, so the state persisted until the isolate recycled — which application code does not
control. A leak that is cleaned up by a process boundary the code cannot observe is not a leak with
a known blast radius; it is a leak with an unknown one.

The `void sessionId; // reserved for later` line is the shape to name: **a discarded argument is a
deferred decision that reads as a completed one.** It type-checks, it lints, and it appears in a code
review as a comment acknowledging a known limitation. Fixed 2026-09-30 (`63b363b`): keyed by session,
LRU-bounded at 64, both endpoints pass their id.

## The ruling

1. A module-global cache keyed by nothing is **forbidden** on any path a second player's request can
   reach. If it must be global, the key is the session.
2. A cache on a request path **must be bounded**. An unbounded map behind a public endpoint is a
   memory leak; the bound is LRU so a player mid-session is never evicted by another player's traffic.
3. A parameter that is parsed, validated, and then discarded is a **defect on sight**. A comment
   deferring it does not discharge it.
4. LRU requires a *move on access*. A `Map` preserves insertion order, so `get` alone leaves the key
   where it was and the eviction picks a session still in use — a subtle silent failure that reads
   correct.

## Consumer

`src/lib/server/agentRegistry.ts` (the instance) and every future server-side registry. A module-graph
assertion is the enforcement shape for (1) and (2), because the failure is an ABSENCE — a process
global has no shape a runtime gate can reject. See the same reasoning that produced G44 for the
session-control store.


<!-- 2026-09-30: DG19: a law with no consumer is invisible pending work; the consumer is the registry the law constrains. (recon 249d9de21c) -->

<!-- 2026-09-30: DG19: consumer must resolve to a readable path; backticked unquoted, matching MY-AD-0018/0029. (recon 249d9de21c) -->

<!-- 2026-09-30: DG15: a record must name the canon section it transcribes; this one transcribes the M9 checked-graph rule. (recon 249d9de21c) -->
