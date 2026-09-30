---
ID: MY-AD-0035
Title: "The four missing dashboard views are a ratified build sequence, and 33 section 4.2 is a plan that reads as an inventory"
Status: Active
Date: 2026-09-30
Organ: presentation
Description: "Four of five canon-named dashboard components have zero importers; canon names five renderers where six exist and states no per-view status."
Related: []
Consumer: "`src/lib/components/displays/KnowledgeDashboard.svelte` + the renderer list in `docs/foundations/33-self-directed-dashboard.md` §4.2"
Source: "`docs/foundations/33-self-directed-dashboard.md` §3.1 and §4.2"
---

## The decision

**The player-facing WebUI is a declared architecture surface, and its dashboard views are a build
sequence, not a wishlist.** `docs/foundations/33-self-directed-dashboard.md` §4.2 names five components.
One exists. Four do not. This record ratifies the sequence, the ownership, and the honest status.

## What exists and what does not (measured 2026-09-30)

| Canon §4.2 component | File | Importers |
|---|---|---|
| `KnowledgeMap.svelte` | `src/lib/components/displays/KnowledgeMap.svelte` | 1 (`/knowledge`) |
| `DevelopmentalRadar.svelte` | — | **0** |
| `LearningTrajectory.svelte` | — | **0** |
| `StudyPlanner.svelte` | — | **0** |
| `IntegrationMap.svelte` | — | **0** |

The three components §4.2 calls "existing" — `StageTheme.svelte` (2 importers), `A11yApplier.svelte`
(3), `StageTransitionOverlay.svelte` (1) — all exist and all are mounted. That part of §4.2 is
accurate.

**One correction to canon.** §4.2 lists five dashboard components. A sixth display surface exists and
canon does not list it: `src/lib/components/displays/KnowledgeDashboard.svelte` (1 importer,
`/knowledge/+page.svelte:72`), which renders the curriculum knowledge state that `KnowledgeMap` draws
into. §4.2 is therefore not an inventory — it is a *plan* that reads as an inventory. The renderer is
two components; only one is named.

## Why canon is not simply wrong

Canon states the **destination**; the four missing views are presentation debt, not model gaps. The
data each needs already exists in production:

- **View 2 (Developmental Radar)** — canon §3.1:100 says "extension of existing radar component with
  curriculum data", so the radar itself is on `/profile`; the missing half is the per-line curriculum
  depth distribution. `CurriculumHolon` carries `prerequisites`; concept states carry
  `depthHistory`/`lastReviewedAt`.
- **View 3 (Learning Trajectory)** — needs time-series depth over sessions. `ConceptState`
  timestamps exist; whether a *session-indexed* series does is the open measurement.
- **View 4 (Study Planner)** — canon §3.1:132 says "the auto-mode strategy engine's recommendations,
  made visible". The engine exists (Phase 27, `docs/foundations/27-auto-mode-strategy-engine.md`);
  the renderer is absent.
- **View 5 (Integration Map)** — needs cross-domain analogy edges. Gated on 'analyzed' depth per
  §3.2:170, so it is the *last* to ship and must not precede the depth model that gates it.

## The ruling

Ship in canon order — 2, 3, 4, 5 — each with: a pure-logic module (testable without a browser, the
`KnowledgeMap` layout-helper shape), a component, a route or a mount on an existing one, a
mutation-proven test, and a browser read of the rendered surface. **A view with no pure module
extracted is not finished**, because `KnowledgeMap` shipped its layout logic untested and that is
precisely the debt View 2 would inherit.

## What this record does NOT authorise

It does not authorise a partial view, a placeholder, or a "sessions coming soon" card. Canon §3.2
rests the dashboard on earned disclosure; a stub would break that contract in the one place a player
looks to see their own progress.

## Consumer

The build sequence is tracked in the UI-completeness plan. §4.2's renderer list gains a
`KnowledgeDashboard.svelte` row and its status is marked per-view rather than implied complete.


<!-- 2026-09-30: DG19: a law with no consumer is invisible pending work; the consumer is the canon section that reads as a completed inventory. (recon 249d9de21c) -->

<!-- 2026-09-30: DG19: consumer must resolve to a readable path; backticked unquoted, matching MY-AD-0018/0029. (recon 249d9de21c) -->

<!-- 2026-09-30: DG15: name the canon section transcribed; the dashboard view list and render contract. (recon 249d9de21c) -->
