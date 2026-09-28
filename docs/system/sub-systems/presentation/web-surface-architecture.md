# Web Surface Architecture

> **Rung:** system. **Organ:** `presentation`. **Extends, does not replace,** [[docs/system/sub-systems/presentation/rendering-layer|rendering-layer]] —
> that document names the *surfaces*; this one specifies the *architecture* they run on: the
> routing model, the state model, the token system, and the gaps between what the kernel can do
> and what the browser can show.
>
> **Status (2026-09-28): the substrate is built; the experience is not.** Every foundation below
> exists and works. The gaps in §7 are the actual work.

## 1. What this system is

A SvelteKit 2 + Svelte 5 (runes) app in **dual-target** mode, selected by `BUILD_TARGET`
(`svelte.config.js:27`):

| Target | Adapter | SSR | BFF `/api/*` | Used by |
|---|---|---|---|---|
| `cloudflare` (default) | adapter-cloudflare | on | reachable | `ci.yml`, `deploy.yml` — **the only production deploy** |
| `static` | adapter-static | off | **unreachable** | Capacitor + offline demo only |

The `static` target is not a deployment. It has no server endpoints, so save, recovery, telemetry
and the LLM proxy all degrade to device-local behaviour. This is stated in `svelte.config.js:16-20`
and is why no GitHub Pages workflow exists any more.

## 2. Routing model

`+layout.ts:19-20` sets the global `ssr`/`prerender` switch from `BUILD_TARGET`. **Most routes then
opt out individually** via their own `+page.ts` (`ssr = false`), making them client-only. Three do
not: `/curriculum`, `/curriculum/progress`, `/knowledge` — they still SSR on the cloudflare target,
which produces a cosmetic empty-state flash before hydration. This inconsistency is unintentional
and should be settled by one decision, not three exceptions.

**Two route families:**

1. **Player** — `/`, `/onboarding`, `/play`, `/profile`, `/journal`, `/codex`, `/knowledge`,
   `/curriculum`, `/curriculum/progress`, `/glossary`, `/diagnostic`, `/settings`, `/recover`,
   `/telemetry`, `/setup`, `/error`.
2. **BFF** — eight `+server.ts` under `src/routes/api/`: `save`, `recovery/generate`,
   `recovery/restore`, `telemetry`, `llm/chat`, `llm/tools`, `agent/observe`, `agent/probe`.

**The shell** (`+layout.svelte`, 90 lines) mounts the whole global frame: `StageTheme`,
`A11yApplier`, `AmbientLayer`, `Sidebar` (desktop) / `BottomNav` (mobile), `Toaster`, `AgentRunner`,
plus three boot concerns — the capability probe, `gameStore` hydration, and a `beforeunload` cloud
sync flush. It also carries the **Failure-Integrity route guard** (`routeGuardAgentic`): an
agentic route with `llmStatus.offline` redirects to `/setup` rather than failing mid-scene.

## 3. State model

Eleven Svelte stores under `src/lib/stores/`. The import graph, measured:

| Store | Importers | Role |
|---|---|---|
| `gameStore` | 14 | the live session: encounter, transformation, phase |
| `saveHydration` | 10 | restore-on-boot |
| `toastStore` | 6 | notifications |
| `llmStatus` | 4 | BFF reachability — drives the route guard |
| `accessibilityStore` | 3 | motion/contrast/telemetry opt-in → `A11yApplier` |
| `sessionControlStore` | 2 | the settings-parity pin fields (Phase 16 d8) |
| `vowStore` | 2 | the vow book |
| `cloudSyncStore` | 2 | encrypted save sync **+ `cloudSyncState`** |
| `profileStore` | 1 | profile list |
| `telemetryStore` | 1 | event batch |
| `agentBusy` | **0** | **dead — no caller** |

`src/lib/engine/gameEngine.ts` is the seam: it wraps the kernel's `GameLoop`,
`EncounterScheduler` and `AgenticOrchestrator` and bridges them into `gameStore` signals. This is
the file Phase 17 Track B made browser-equivalent to the CLI's `tickWithStrategy` (strategy weight
bias, bleed-through, curriculum interleave), and whose remaining browser-dark seam is threshold
mode — recorded in the plan, not silently narrowed.

**The rule the stores do not yet follow:** a store nobody renders is the same silent-success class
the kernel audits for. `cloudSyncState` (added for B-1) currently has **zero readers** — a save
that failed to reach durable storage is counted and logged but **invisible to the player**. That is
an unfinished delivery, and §7 lists it as work.

## 4. Design system — it already exists, and it is canon

There is **no Tailwind and no PostCSS**. The system is hand-rolled CSS custom properties in
`src/styles/`:

- **`tokens.css`** (262 lines) — the single source of truth. An 8-step spacing scale
  (`--mysterium-space-0..8`, 4px base), a modular 1.125 typography scale
  (`--mysterium-text-xs..xl`), a five-step radius scale, four easing curves and five motion
  durations (`--mysterium-duration-instant..glacial`), and **a per-stage palette**. All
  `--mysterium-*`; consumers read `var(--mysterium-*)` only.
- **`base.css`** — reset + element defaults. **`fonts.css`** — 8 local display faces.
  **`capabilities.css`** — adaptations for input method, motion preference, contrast and
  connection quality.

The design brief these tokens implement is
[[docs/system/sub-systems/presentation/design-brief|design-brief]] — derived from the canon, not
chosen, with the dials and the one deliberate divergence from the `website-design` skill's
defaults recorded there.

**The stage theming is the system's spine.** `<html data-stage="…">` drives everything, and
`app.html` sets that attribute **synchronously in `<head>` from `localStorage` before first paint**
specifically to prevent a flash of the default red theme for a player at another stage. A
player's entire visual register changes with their developmental altitude — the per-stage
aesthetics (Infrared *cave-dark, primal* → White *luminous silence, spacious*) are canon, and the
CSS is the implementation of it. **This is the single most important thing to preserve when
building the rest of the front end**: it is not decoration, it is the model made visible.

**`VeiledStat.svelte`** is the Veil (20) made structural. It accepts a **qualitative descriptor
string** (from `src/core/presentation/veilDescriptors.ts`) and renders only that — never a raw
number, stage label or drive percentage. Its doc comment states the contract directly: "NEVER
renders raw numbers, stage labels, drive percentages, or any Veil-violating data."

What it is NOT: a gate on the *closed* register class (polarity, shadow quadrants, ray profile,
harvest eligibility — the class AGENTS §5.4 keeps non-player-readable at any stage). It shapes
how a value is *expressed*; it does not decide whether a closed-register value may be shown at
all. That decision is still per-surface, which is a real risk the next surfaces should close by
convention — and it is why §7 lists the auditor surfaces as P1 work. Use `VeiledStat` for the
open register class (stage altitudes, line profiles, drive balance, theta freshness, curriculum
rungs) so nothing is presented clinically by accident; do not rely on it to hide closed-class
data, because nothing in the component enforces that.

**Component inventory** — 24 primitives plus 5 `displays/` and 3 `gameplay/`:

- Primitives: `Button`, `Card`, `Stack`, `Badge`, `Input`, `Toggle`, `Modal`, `Portal`, `Icon`,
  `Spinner`, `Toaster`, `BackButton`, `Seo`, `RouteShell`, `AmbientLayer`, `A11yApplier`,
  `StageTheme`, `StageTransitionOverlay`, `Sidebar`, `BottomNav`, `VeiledStat`.
- `displays/`: `CCIDisplay`, `DrivesCompass`, `KnowledgeDashboard`, `SessionPosition`,
  `ShadowsDisplay` — the 33 dashboard renderers.
- `gameplay/`: `HoldProbe`, `LLMDialogueRunner`, `TrainingBeatRunner`.

## 5. The player loop, as built

`/onboarding` (573L — the largest route) runs a **DirectorAgent SSE probe loop** against
`/api/agent/probe`, accepts polarity + free-text input, observes through `/api/agent/observe`, and
synthesizes a Significator at `calibration >= 0.8` before redirecting to `/play`. This is the
binary-search composite assessment of `ONBOARDING-REDESIGN-PLAN`, and it is the first thing a new
player sees.

`/play` (503L) boots the engine, starts a session, and renders encounters as cards with modality,
badge and holon — with `LLMDialogueRunner` for the adaptive content, `TrainingBeatRunner` for the
training weave, `StageTransitionOverlay` for frame-change, and a reflection phase.

`/profile` (358L) is the self-register: a pure-SVG 8-spoke radar, CCI, the L1/L2 Articulation
Ladder via `renderLevel` + `buildLadderPayloads`, and the four `displays/` components.

## 6. Canon surfaces — what is and is not rendered

**Articulation Ladder (16 §10.5) — PARTIAL.** `/profile` renders **L1 and L2, self register
only** (`+page.svelte:39-50`, `:198-208`), with AL3's stage-articulated presentation applied. L0,
L3–L7 have **no web render**; only the CLI `ladder` command reaches them. The **auditor register
(AL2's second traversal) has no web path at all**, and there is no level selector or drill-down.

**Educator Desk / Guardian Mirror / Therapeutic Pane (33 §7) — ABSENT.** Zero routes, zero
components, zero stores. `grep` for `Educator|Guardian|Therapeutic` across `src/routes` and
`src/lib` returns nothing; every hit is core-domain. The share system
(`src/core/domain/shares.ts`) exists and is gated (G47), but its only consumers are the CLI
(`shareCmd.ts`) and the tests — **the first read-only consumer the canon names was never built in
the web.** This is the single largest canon gap in the front end.

## 7. Gaps — the actual work, in priority order

**P0 — a shipped defect, not a feature.**

1. **`cloudSyncState` has no reader.** The player cannot see that a save failed. `/settings` is the
   surface; `+layout.svelte:32` is the import site. Until this renders, B-1's client half is
   incomplete: the server refuses correctly, the client counts correctly, and the player still
   sees nothing.

**P1 — canon-required surfaces with no front end.**

2. **The auditor surfaces (33 §7)** — all three, behind the share/consent law that already exists.
   The share mechanism is built and gated; it needs a route. `MY-AD-0034` makes scopes the entire
   security interface and the law is re-checked at render, so the surface is bounded by design.
3. **Ladder L0 + L3–L7 and the auditor register (16 §10.5).** The payloads exist
   (`buildLadderPayloads`); the rendering does not.

**P2 — kernel capabilities with no web surface** (cross-referenced against the CLI's 20
subcommands): `insights`, `export`, `events`, `delegate`, `pod`, `credential`, `pack` have no
route. `calibrate` is partial (onboarding probes, no headless equivalent). `privacy` is partial
(transparency page exists; no export/inspect-own-data).

**P3 — consistency debt.**

4. `agentBusy` is dead — delete it or wire it.
5. `/knowledge`, `/curriculum`, `/curriculum/progress` still SSR; the empty-state flash is a
   consequence of the split, not a decision.

## 8. The design brief (website-design skill, adapted)

The skill's `briefing` node says a DESIGN BRIEF must be extracted and re-read by every later
phase. This project already has one — the canon's own stage vocabulary — so the brief is
*derived from `describeStage()`* rather than chosen. The skill targets marketing sites; the two
nodes that transfer (briefing, direction) are applied, the two that do not (marketing `components/`
recipes, static-host `deploy/`) are recorded as not-applicable rather than applied blindly.

**The dials, and the one place this product diverges from the skill's default answer:** the skill's
"quiet constraints" rule caps accessibility-critical briefs at VARIANCE 4 / MOTION 3 *whatever the
vibe words say*. That cap is adopted — and it matters more here than it would on a marketing site,
because Mysterium's vibe words are unusually strong and unusually load-bearing. **The canon's drama
is carried by colour and type, not by layout variance or motion volume.** VARIANCE 4, MOTION 3,
DENSITY 6 (between the skill's "dashboard" 7 and "e-commerce" 5 — `/profile` is dense, `/play` is
not, and density is a per-route decision).

**The one rule this yields, which the skill's own §0.5 implies:** visual choices follow the
subject's vernacular. Mysterium's subject supplies its own — the developmental ladder. A player at
Infrared must not be able to mistake their experience for a player at Turquoise, which makes
`data-stage` a **semantic contract, not a skin**. It is set synchronously in `<head>` before first
paint for exactly that reason, and it is why a retired stage (`White`) could leave a palette
behind while a live stage (`Teal`) had none: the ladder was being copied instead of imported.

**Foundation: none needed.** The skill's §5.A honesty rule — never recreate a system you already
have — means no package is installed. `src/styles/tokens.css` is already a complete, canon-derived
system: 8 stage palettes, a spacing scale, a modular type scale, motion durations and easings.

## 9. Measured contrast (WCAG 2.1, computed from `tokens.css`)

Computed with correct channel linearisation — `((c/255 + 0.055)/1.055)^2.4`, then
`0.2126R + 0.7152G + 0.0722B`, then `(L1+0.05)/(L2+0.05)`. Ratios are capped at 21 by
construction; anything larger is an arithmetic error, not a result.

| Stage | `fg`/`bg` | `fg-muted`/`bg` | `accent`/`bg` |
|---|---|---|---|
| infrared | 12.27 | 5.94 | **4.04** |
| magenta | 13.98 | 6.98 | **3.60** |
| red (default) | 13.82 | 6.54 | **3.13** |
| amber | 15.61 | 8.55 | 8.57 |
| orange | 14.50 | 7.87 | 5.44 |
| green | 15.10 | 8.69 | 6.32 |
| teal | 14.79 | 7.42 | 8.73 |
| turquoise | 13.91 | 5.55 | **2.75** |

**Body text passes AA (4.5:1) on all 8 stages**, for both `fg` and `fg-muted`, and this is now a
test rather than a claim. **`accent` fails AA on 4 stages (2.75–4.04) — and that is by design**:
accent is the stage's *identity* colour, and the palette is canon, not a choice. It is a fill,
border, glow and focus-ring colour. **It must never carry body text.** `accent-fg` is the token
for text *on* an accent fill, and the semantic pairs (`danger`/`success`/`warning`/`info`, each
with a `-soft` fill and an `-fg`) are the correct choice for status. Locked by
`tests/styles/stageTokens.test.ts`.

## 10. How to extend this surface


- **Read `tokens.css` before writing CSS.** Every colour, space, size and duration comes from a
  token. If a value is not a token, either it should be (add it) or it should not exist.
- **Route a new page under `src/routes/`, and give it a `+page.ts` with `ssr = false`** unless it
  has a genuine reason to SSR, in which case say why in the page's doc comment.
- **New state goes in a store with a named reader in the same commit.** A store with no reader is
  the write-only defect class; the importer count is the assertion.
- **Closed-register data must not be rendered here at all.** `VeiledStat` shapes *expression*, not
  permission — it takes a pre-computed `descriptor: string` and has no register logic, so it cannot
  decide whether a value may be shown. The closed register class (polarity, shadow quadrants, ray
  profile, harvest eligibility — AGENTS §5.4) is non-player-readable at any stage; deciding that per
  surface is the failure mode, so when a surface wants closed-class data, the answer is a new law in
  20, not a new conditional.
- **After any surface change, check the ADR ledger** (`arch.py context src/routes/…`) — the Veil
  and the ladder laws constrain what may be shown, and DG19 fails a law with no declared consumer.
