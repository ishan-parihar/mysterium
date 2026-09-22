---
ID: MY-RG-0031
Title: "A recall path bypasses the firewalls that guard the render path"
Status: Active
Date: 2026-09-22
Organ: platform
Severity: high
Source: "foundations/48-memory-architecture section 5"
Description: "Retrieval output banded-only, read-only, Veil-filtered, per-player isolated; G31 fails closed with injected fixtures."
Related: []
---

## The failure

Render-time filtering (the Veil seam, the UDV projection firewall, `MY-AD-0020`) guards the path
that *composes* a prompt. Memory recall is a **second path** by which data reaches LLM context:
a retriever that ranks over raw signals and returns them unfiltered — or persists a recall hit
into profile state — passes every render gate while leaking through the read side. The same
leak exists for isolation: a retrieval scoped to "the corpus" rather than the player's store can
surface another user's narrative. None of today's gates would notice, because today there is no
retrieval surface at all — the guard must exist before the surface, not after the first leak.

## The guard

**G31 — retrieval firewall** (transcribed from `foundations/48` §5) fails closed unless every
retrieval surface proves:

1. **Banded-only output** — returned content carries no raw C1/C2 signals, no scores, no
   assessment vocabulary (injected fixture: a raw-signal document seeded into the corpus must
   never appear in output).
2. **Read-only** — recall output is never persisted into significator, evidence ledger, or
   profile state (F1 at the read side; fixture asserts no store mutation from a rank call).
3. **Veil-filtered** — recall text passes the same filter as prompt-render (`22 §13.2`): no
   stage naming of the player, no "the system has noticed…" constructions.
4. **Isolation** — a cross-user seeded fixture never resolves (class LM-f), proven by injected
   violation per `MY-AD-0027`.

Related: [MY-AD-0032, MY-AD-0020, MY-AD-0027]

