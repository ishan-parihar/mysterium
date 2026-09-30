---
ID: MY-RG-0034
Title: "Six kernel gates exist in code and are named in no live document"
Status: Active
Date: 2026-09-30
Organ: validation
Severity: high
Description: "G55/G56/G57 appear nowhere in AGENTS.md or any live doc; the root protocol ends its roster narrative at 51 while the roster is 57."
Related: []
Source: AGENTS.md §4.2 (the kernel gate roster narrative) + `src/core/validation/gates/roster.ts`
---

## The defect

Six kernel gates exist in `src/core/validation/gates/` and appear in **no live document**. Measured
2026-09-30, `AGENTS.md` included:

| Gate | Enforces | Live-doc mentions |
|---|---|---|
| G52 | the browser honours the no-LLM deployment mode | `PRODUCTION-DEPLOYMENT-PLAN.md` only |
| G53 | every BFF route is rate-limited | `PRODUCTION-DEPLOYMENT-PLAN.md` only |
| G54 | every route declares its SSR choice | production plan + `web-surface-architecture.md` |
| G55 | closed-register values never reach a player-facing surface | **NOWHERE** |
| G56 | every keyed list renders under `{#each}` with a stable key | **NOWHERE** |
| G57 | every route is reachable from a navigation surface | **NOWHERE** |

`AGENTS.md` §4.2 ends its roster narrative at "**51 gates**". The true roster is **57**.

## Why this is a defect and not a stale sentence

The roster narrative in `AGENTS.md` is the document an agent reads to form a model of what the kernel
*checks*. A gate named nowhere is a gate whose failure mode is never anticipated: the reader who
breaks the closed-register boundary in a new template has no idea a gate exists to stop it, and
`AGENTS.md` §5.4 states the Veil law in prose that the reader has been told is current.

G55, G56 and G57 are the three most consequential recent gates — Veil compliance, list-key
correctness and route reachability. G57 in particular has already caught a real orphan
(`/knowledge` was reachable only from `/profile`) that a reader of the current root protocol would
have no reason to look for.

## The deeper class

This is MY-RG-0005 (canon and code drift apart) in its **gate-coverage** form. A gate-count claim in
prose is a manually-maintained mirror of a machine-owned roster, and a mirror drifts silently: nothing
fails when a gate is added, because no gate reads the prose. `tests/validation/Benchmark.test.ts:132`
pins the count in code; no doc-governance gate pins it in prose.

## The class rule

**A hardcoded count or roster tail in a live document is a derived surface and must be emitted, not
typed.** `arch.py emit` regenerates `docs/INDEX.md` and organ routers; nothing regenerates a count
inside `AGENTS.md` §4.2. Until a gate or a record binds them, every future gate lands invisible.

## Severity

Active. Not cosmetic: the three unnamed gates are the newest and the least discoverable, and each
names a failure mode a reader is most likely to walk into.


<!-- 2026-09-30: DG15: a record must name the canon section it transcribes; this one transcribes the roster narrative against the roster. (recon 249d9de21c) -->
