---
ID: MY-AD-0002
Title: "Layer rules: core is pure, infra integrates, surfaces consume, content is data"
Status: Active
Date: 2026-09-20
Organ: kernel
Source: "docs/system/AGENTS.md §3"
Description: "Four layer rules bounding src/core, src/infra, the rendering surfaces and content data."
Related: [MY-AD-0001]
Consumer: "`src/core`, `src/infra` layer boundaries, enforced by gate DG7 in `scripts/arch.py`"
---

## Context
Without a stated layer contract, engine code drifts into `src/infra/` and content hard-codes
into logic, which makes the system untestable and the curriculum unextendable.

## Decision
1. `src/core/` is pure TypeScript — no game engine, no native bridge, no networking.
2. `src/infra/` holds every external integration (LLM, persistence, profiles, telemetry, crypto).
3. Rendering surfaces (`src/routes/`, the CLI) are consumers and first-class peers.
4. A new line, stage, shadow archetype, curriculum concept or assessment item is a **data**
   change, not a code change.

## Consequences
- Positive: pure core = testable contracts; data-driven content = the corpus can grow without code.
- Negative: some integrations need adapters rather than direct calls.
- Enforcement: `G12-identity-firewall` and the kernel gates in `src/core/validation/gates.ts`.

<!-- 2026-09-20: DG19: declare where this law is consumed, or the pending key that will consume it (recon 2b4849c6b7) -->
