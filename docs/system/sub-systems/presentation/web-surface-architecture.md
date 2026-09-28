# Web Surface Architecture

> **Rung:** system. **Organ:** `presentation`. **Extends, does not replace,** [[docs/system/sub-systems/presentation/rendering-layer|rendering-layer]] —
> that document names the *surfaces*; this one specifies the *architecture* they run on: the
> routing model, the state model, the token system, and the gaps between what the kernel can do
> and what the browser can show.
>
> **Status (2026-09-28): the substrate is built; the experience is not.** Every foundation below
> exists and works. The gaps in §7 are the actual work.
>
> **Re-measured against the tree 2026-09-28 (P1 item 1 landed, `632d32a`).** Three claims in this
> document were a pre-build snapshot and are now false; §6 and §7 carry the corrections, and the
> gaps that survive are the real work:
>
> - **The three auditor surfaces are BUILT**, not ABSENT — `/auditor/{guardian,educator,therapeutic}`,
>   one consent seam (`auditorProjection.ts`), the share store, and **G51**. `33 §7`'s three panes
>   are routes.
> - **P0 (`cloudSyncState` has no reader) was FALSE.** `CloudSyncIndicator.svelte` reads it and is
>   mounted at `+layout.svelte:93`. The reader exists; §7 has been corrected to say so.
> - **P2's "20 CLI subcommands" was a miscount.** The real registry is the
>   `NON_INTERACTIVE_SUBCOMMANDS` set at `scripts/cli-game.ts:680` — 16 entries, and it is the
>   authority for which surfaces have no web route, not a number typed into prose.
>
> What §7 still holds: the ladder gap (L0 + L3–L7 + the auditor register), the P2 routes, and both
> P3 items.

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

`+layout.ts:19-20` sets the global `ssr`/`prerender` switch from `BUILD_TARGET`. **Every route then
opts out individually** via its own `+page.ts` (`ssr = false`), making them client-only. This was
settled as ONE decision on 2026-09-28 (`4129cac`): `/curriculum`, `/curriculum/progress` and
`/knowledge` were the only three `+page.svelte` routes with no `+page.ts`, so they still SSR'd on
the cloudflare target and flashed an empty state before hydration.

The inconsistency is now enforced rather than remembered — **G54** enumerates the routes from disk,
requires every one with a `+page.svelte` to have a sibling `+page.ts`, and **imports** each one to
read the exported `ssr`/`prerender` values. A comment promising client-only, a computed value, or a
wrong literal all fail; a string match would pass the first two. The failure mode is an absence, so
no runtime test could have seen it.

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

Ten Svelte store files under `src/lib/stores/`. The import graph, measured:

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
| *(deleted `4129cac`)* | — | `agentBusy` was a local signal inside `components/AgentRunner.svelte` with no caller. It was an **instance-script export**, which in Svelte 5 is component-local, so no consumer *could* reach it. Deleted rather than wired: every surface that blocks on a BFF round-trip already has a more precise local spinner. |

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

`/profile` is the self-register: a pure-SVG 8-spoke radar, CCI, the Articulation Ladder, and the
four `displays/` components. The ladder moved out of the route into
`src/lib/components/profile/ArticulationLadder.svelte` (`4129cac`) — see §6.

## 6. Canon surfaces — what is and is not rendered

**Articulation Ladder (16 §10.5) — SELF REGISTER BUILT 2026-09-28 (`4129cac`).**
`<ArticulationLadder>` renders **all six levels `SELF_RENDER_LEVELS` permits — L0, L1, L2, L3, L6,
L7** — behind a level selector, with AL3's stage-articulated presentation applied by `renderLevel`
for each. It previously rendered two hardcoded levels inline, so four permitted levels had a
payload derived by `buildLadderPayloads` and never drawn.

**L4 and L5 are correctly absent from the browser.** They are the `closed` register class and
`renderLevel` refuses them in the self register at any stage (`20 §11.1`, `MY-AD-0006`); the
component asks the law-holder which levels it may show rather than keeping its own list, because a
hand-kept list is a second place for that boundary to drift. They are reachable through a consented
grant, which is what the three auditor routes are for — so the **auditor register has a web path**,
and the drill-down is now **descent-only** (§7.2/AP3) and bounded by each surface's own consent
ceiling, which is a required prop.

**Educator Desk / Guardian Mirror / Therapeutic Pane (33 §7) — BUILT 2026-09-28 (`632d32a`).**
Three routes, one consent seam. `auditorProjection.ts` holds the four refusal steps in order
(no Significator → no/revoked grant → payload bridge → `renderLevel` per level, re-checked at
render per AL5); the three routes name only their scope, their ceiling and the one `33 §7.3` rule
that binds them, and **G51** fails a route that reaches the bridge or the law itself. The
surfaces differ in ceiling, not structure: guardian L5, educator L3, therapeutic L4.

**The first read-only consumer the canon names now exists in the web** — and closing it surfaced
a live consent failure, because the surface's `$effect` had subscribed to the share store's
*variable* rather than its value, so a revoked grant kept rendering until reload. Fixed, and
pinned.

## 7. Gaps — the actual work, in priority order

> **P0 was closed before this document was first read and is retained here only as the shape of
> the class.** A reader arriving fresh should skip it: the gap is a shipped defect with no front
> end, and `cloudSyncState` does have one.

**P0 — a shipped defect, not a feature.** ✅ **NOT A GAP — verified 2026-09-28.**

1. ~~**`cloudSyncState` has no reader.**~~ `CloudSyncIndicator.svelte` reads
   `$cloudSyncState.status`, `.consecutiveFailures` and `.lastError`, and **is mounted** at
   `+layout.svelte:93`. B-1's client half is complete. Kept in the document because the check
   that found it is the one worth repeating: a component that exists is not a surface.

**P1 — canon-required surfaces with no front end.**

2. **The auditor surfaces (33 §7)** — ✅ **BUILT `632d32a`.** All three, behind the share/consent law
   that already exists, through one seam rather than three consent decisions in `src/routes`.
3. ~~**Ladder L0 + L3–L7 and the auditor register (16 §10.5).**~~ **BUILT `4129cac`** — all six
   self-register levels render behind a selector; the auditor register and its descent-only
   drill-down ship with the three auditor surfaces (`632d32a`). **This was the remaining P1.**

**P2 — kernel capabilities with no web surface**, cross-referenced against the real registry —
**the `NON_INTERACTIVE_SUBCOMMANDS` set at `scripts/cli-game.ts:680`**, not a count in prose
(there are 16, and the earlier "20" was wrong):

| Command | Web route | Note |
|---|---|---|
| `insights` | none | cognitive/per-line aggregates exist in the kernel |
| `export` | none | **also a privacy gap** — see below |
| `events` | none | event tail; the pod CLI polls the same tail |
| `delegate` | none | `--summon` exists; the council is a CLI-only surface today |
| `pod` | none | M0 transport is built and gated (G48) |
| `credential` | none | |
| `pack` | none | pack engine is live and gated (G45) |
| `privacy` | `/telemetry` only | transparency page exists; **no export-your-own-data** |
| `calibrate` | `/onboarding` probes only | no headless equivalent |

**P3 — consistency debt.**

4. ~~`agentBusy` is dead.~~ **DELETED `4129cac`.** It was declared
   `export const agentBusy = writable<number>(0)` inside `AgentRunner.svelte`'s instance
   `<script>` and consumed only by a `derived` **in that same component**; the sole importer of
   the file is `+layout.svelte:28`, which imports the default component, not the store. In Svelte 5
   an instance-script export is component-local, so no consumer *could* reach it. Deleted rather
   than moved to `stores/`: every surface that blocks on a BFF round-trip already has a more
   precise local spinner, so a global pill would be a strictly worse duplicate.
5. ~~`/knowledge`, `/curriculum`, `/curriculum/progress` still SSR.~~ **BUILT `4129cac`, enforced
   by G54.** These were the only three `+page.svelte` routes with no `+page.ts`, against 16 that
   opted out. All three now declare `ssr = false; prerender = false;` like the rest, and G54 fails on
   any future route that does not — including a comment-only or computed declaration.

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
`0.2126R + 0.7152G + 0.0722B`, then `(L1+0.05)/(L2+0.05)`. Ratios cap at 21 by construction;
anything larger is an arithmetic error, not a result. All four columns clear their threshold on
all eight stages, and `tests/styles/stageTokens.test.ts` recomputes them from the file.

| Stage | `fg`/`bg` | `fg-muted`/`bg` | `accent-fg`/`accent` | `accent-soft-fg`/`accent-soft` |
|---|---|---|---|---|
| infrared | 12.27 | 5.94 | 4.97 | 11.12 |
| magenta | 13.98 | 6.98 | 5.49 | 12.37 |
| red | 13.82 | 6.54 | 6.29 | 13.63 |
| amber | 15.61 | 8.55 | 8.27 | 7.42 |
| orange | 14.50 | 7.87 | 5.31 | 8.83 |
| green | 15.10 | 8.69 | 6.13 | 9.07 |
| teal | 14.79 | 7.42 | 8.69 | 6.66 |
| turquoise | 13.91 | 5.55 | 6.05 | 10.44 |

Thresholds: **4.5:1** for every column — `fg` and `fg-muted` are body text on the background, and
the last two are *text on a fill*, which is ordinary text, not a decorative element.

**`accent` is not exempt.** An earlier version of this document recorded four stages failing AA on
`accent` and called it a design position, on the reasoning that accent is a fill and never carries
text. That reasoning was wrong twice over. Text *on* the fill is ordinary text and owes 4.5:1 —
which is what `accent-fg` and `accent-soft-fg` now guarantee per stage. And `accent` is not only a
fill: it is the **focus ring and border colour** at 17 sites across 8 components (Button,
BackButton, BottomNav, Card, Toggle, Sidebar, Toaster, LLMDialogueRunner), so WCAG 1.4.11 owes it
**3:1** against the background as a non-text UI colour. A focus indicator a keyboard user cannot
see is a broken navigation contract, not an aesthetic. All eight stages now clear 3:1 (lowest is
red at 3.13), and the gate asserts it.

**Two tokens, two fills, and why.****Two tokens, two fills, and why.** A stage's solid `accent` and its `accent-soft` differ in
lightness, so one text token cannot serve both. `accent-fg` is the text on the **solid** accent
(`Button.svelte` `.btn-primary`, `HoldProbe.svelte` `.hold-button`); `accent-soft-fg` is the text
on the **soft** fill (`Badge.svelte` `.badge-accent`, `Sidebar.svelte` `.nav-item.active`,
`LLMDialogueRunner.svelte` `.option.selected`). Amber, orange, green and teal need **dark** text on
the solid and **white** on the soft; infrared, magenta, red and turquoise need the reverse. Inverting
one to fix the other is how the other silently regressed, which is why the gate asserts both.

**Turquoise inherited a defect from the re-key.** It carries the retired block's dark gold
(`#b89025`) on the ladder's only light background — 2.75:1, the inverse of every other stage — and
its old `accent-fg` was white on a light soft fill at 1.82:1. Since the palette hexes appear
nowhere in `docs/foundations/`, they are implementation rather than canon, which makes this ours
to fix: darkened to `#7a5f10` (5.60:1 on bg), with `accent-soft-fg` set dark to suit the light soft
fill. Both pairs are now asserted, so neither can drift back.

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
