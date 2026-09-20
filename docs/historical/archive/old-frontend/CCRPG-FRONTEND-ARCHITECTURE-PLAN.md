# Mysterium — Frontend Architecture Plan for Online-Game Deployment

> **Document status:** Brainstorm + plan, **REVISED v2** (SvelteKit substitution
> + universality layer + far-future visuals phase).
> **Author:** Super Z (architecture pass) — for @ishan-parihar
> **Date:** 2026-07-08 (revised 2026-07-08)
> **Inputs read:** `AGENTS.md`, `README.md`, `package.json`, `vite.config.ts`,
> `src/main.ts`, `src/game/main.ts`, `src/game/config.ts`, `src/game/scenes/*`,
> `src/infra/llm/LLMClient.ts`, `src/infra/persistence/SaveRepository.ts`,
> `src/game/ui/Button.ts`, the three uploaded design-taste skills
> (`ui-ux-pro-max`, `design-taste-frontend`, `ui-styling`).
>
> **Purpose of this document:** enumerate every credible way to architect the
> Mysterium frontend for "deploy like an online game," then recommend a composite
> trajectory with a phased roadmap. The user picks the trajectory; we then
> write code.
>
> **Revision v2 changelog:**
> - §0 TL;DR updated to reflect SvelteKit substitution
> - §6 Recommended composite: Phase 1 framework changed from Vite+React to
>   SvelteKit; BFF collapsed into SvelteKit endpoints instead of separate
>   Cloudflare Worker repo
> - §7 Phase 1 rewritten for SvelteKit; new Phase 2.5 (Capability detection
>   + adaptive UI) inserted; Phase 3 restructured
> - §8 Risks updated: Svelte-specific risks added
> - §11 (NEW): Universality layer — 7 dimensions of universal UX
> - §12 (NEW): Far-future interactive visuals (Phase 5+, deferred)

---

## 0. TL;DR — The One-Paragraph Verdict (v2 — SvelteKit revision)

Mysterium today is a **single-player, local-only, Phaser 3.80 + TypeScript + Vite
+ Capacitor** game with a clean 3-layer core/infra/game architecture, 14
Phaser scenes drawn entirely from vector primitives, and a critical security
hole: the LLM API key is resolved from browser-env vars and called directly
from the client. To "deploy like an online game" with maximum universal
reach, the recommended trajectory is a **SvelteKit + Phaser hybrid**:
SvelteKit replaces Vite as the meta-framework (it IS Vite underneath, so
Phaser integration is trivial), the BFF collapses into SvelteKit
`+server.ts` endpoints (no separate Worker repo), the DOM shell uses
shadcn-svelte + Tailwind v4 + the included font catalogue, and Phaser is
mounted as a Svelte component inside the `/play` route. The 8-stage
aesthetic system becomes Svelte transitions (built-in, no framer-motion
dependency). A new Phase 2.5 adds a CapabilityProbe that drives
`data-capability` / `data-input` attributes for adaptive UI (10-foot TV
mode, reduced-motion, coarse-pointer enlargement). PWA + Cloudflare Pages
deploy + anonymous cloud sync with 12-word recovery code completes the
universal-UX spine. Total: 7–9 weeks to first shippable online version,
10–14 weeks to multi-platform. `core/` stays untouched throughout.

---

## 1. Current-State Diagnosis

### 1.1 Tech stack as it stands today

| Layer | Technology | Notes |
|---|---|---|
| Language | TypeScript 5.4, strict mode, `noUnusedLocals`, `exactOptionalPropertyTypes:false` | Clean, modern, well-typed |
| Bundler | Vite 5.4, ES2020 target, esbuild minify, manual `phaser` chunk | Already production-shaped |
| Game engine | Phaser 3.80.1 | `Phaser.AUTO` (WebGL fallback to canvas), `Scale.FIT` portrait 1080×1920 |
| Mobile shell | Capacitor 6.1 (`@capacitor/android`, `@capacitor/preferences`) | Android only; iOS not configured |
| CLI runtime | `tsx` + `tsup` + `commander` + `@clack/prompts` + `chalk` + `ora` + `boxen` | Same `core/` runs in Node as a TUI |
| Tests | Vitest 2.1 + jsdom | `npm test` runs the core suite |
| Persistence | `LocalStorageStore` (web) ⇄ `CapacitorPreferencesStore` (Android) ⇄ `fs` (CLI) | Strategy pattern via `createKeyValueStore()` |
| LLM | Direct `fetch()` to OpenAI/Anthropic-compatible endpoints, env-var config | **API key exposed to client.** |
| i18n | `infra/i18n/I18n.ts` | Present but light |
| Crypto | `infra/crypto/CryptoStore.ts` | For telemetry obfuscation |
| Native bridge | `infra/native/NativeBridge.ts` | Android back-button, etc. |

### 1.2 Architecture in three layers (already excellent — preserve it)

```
src/
├── core/      ← pure TS: domain, engines, assessments, registries, agents
├── infra/     ← I/O adapters: llm, persistence, telemetry, i18n, crypto, tdg, native
└── game/      ← Phaser-specific: scenes, ui, accessibility, onboarding, assessments/renderers
```

This separation is the single biggest asset the project has. `core/` runs in
Node, in tests, in the browser, anywhere — it has zero Phaser imports. That
means **any** frontend trajectory we pick leaves `core/` untouched. The
frontend decision is purely a `game/` and `infra/` decision.

### 1.3 What the `game/` layer actually does today

14 Phaser scenes, all drawn from primitives:

| Scene | Purpose | Visual approach |
|---|---|---|
| `BootScene` | Fade to preloader | Solid colour + camera fade |
| `PreloaderScene` | Asset load (none today) | Placeholder |
| `MainMenuScene` | Navigation surface | Tweens + rectangles + text + grid backdrop |
| `OnboardingScene` | Composite assessment onboarding | Probe interfaces × 8 lines |
| `WorldScene` | Stage world map | Phaser scene |
| `EncounterScene` | Catalyst delivery | Phaser scene |
| `EncounterSelectionScene` | Choose next encounter | Phaser scene |
| `AssessmentScene` | Modality-agnostic assessment shell | Phaser scene |
| `DilemmaScene` | Moral choice presentation | Phaser scene |
| `ReflectionScene` | Post-encounter integration | Phaser scene |
| `JournalScene` | Player's running record | Phaser scene |
| `CodexScene` | Game-world lore browser | Phaser scene |
| `RadialChartScene` | CCI developmental profile chart | Phaser scene |
| `SettingsScene` | Accessibility + LLM config | Phaser scene |
| `UIOverlayScene` | N-back / Stroop cognitive task panels | Runs parallel above EncounterScene |

Plus 8 assessment renderers (`ScenarioRenderer`, `DilemmaRenderer`,
`EmotionRenderer`, `HoldRenderer`, `NBackRenderer`, `PatternRenderer`,
`ReactionTimeRenderer`, `LLMDialogueRenderer`) and a small Phaser-UI kit
(`Button`, `StatBar`, `CognitiveOverlay`, `SceneTransitions`).

There is **no asset pipeline** — no sprite atlases, no texture packs, no
audio. Everything is `add.rectangle()`, `add.text()`, `add.tween()`. This is
both a strength (instant load, tiny bundle) and a ceiling (Phaser-primitive
UI cannot reach the polish of a designed DOM UI).

### 1.4 The four constraints that must hold in any trajectory

These are not negotiable — they are canon from `AGENTS.md` §5 and the README:

1. **Veil-of-Forgetting.** The player must never see raw stage labels, drive
   percentages, the 8×8 matrix, or assessment scores. Everything is
   qualitative felt-sense. `MainMenuScene` already implements this —
   e.g. `stageAesthetics[sig.currentStage]` renders `"cave-dark, primal"`
   instead of `"Infrared"`. **Any DOM-rendered UI must obey the same rule.**
2. **Infinite-checkpoint model.** Players leave at any checkpoint; progress
   is saved continuously; sessions are player-determined. Cloud sync must
   not break this — saves must work offline-first, sync opportunistically.
3. **Adaptive onboarding for any age, any altitude.** Onboarding must work
   on a 7-year-old's phone and a researcher's desktop. The visual layer
   must scale gracefully.
4. **LLM is the Holon Context Engine's mouthpiece, never the diagnostician.**
   The LLM never tells the player their stage. It speaks within the Veil.
   This means the LLM proxy must apply the existing `VeilFilter`
   bidirectionally — and that filter must run **server-side**, not
   client-side, so its rules can be updated without redeploying the client.

### 1.5 The five current pain-points a frontend pass must solve

1. **🔴 Critical security hole.** `LLMClient.ts` resolves the API key from
   `process.env.LLM_API_KEY` / `VITE_LLM_API_KEY` and calls the provider
   directly from the browser. Anyone opening devtools can extract the key.
   Must be fixed **before any public deployment** regardless of which
   trajectory is chosen.
2. **🟠 Visual ceiling.** Phaser-primitive UI cannot reach the polish the
   three uploaded design-taste skills imply (museum-quality, anti-slop,
   curated typography, glassmorphism / brutalism / etc.). Menus feel like
   a programmer drew them — because a programmer did.
3. **🟠 No asset pipeline.** No audio, no sprites, no shaders. The game is
   silent and visually uniform across all 8 stages, even though the canon
   says each stage has a distinct aesthetic (cave-dark / fortress-sharp /
   cathedral-ordered / etc.).
4. **🟡 No cloud persistence.** LocalStorage is wiped by browser data
   clearing; Capacitor Preferences survive app reinstalls on Android but
   not device transfers. A player who loses their phone loses their
   Significator — months of developmental progress.
5. **🟡 No deployable surface.** No PWA manifest, no service worker, no
   installable web app, no CDN config, no CI/CD. "Global deploy (web +
   Android)" is marked ⏳ Planned in the README.

---

## 2. The "Online Game" Ambition Unpacked

"Deployed like an online game" is not one decision — it is **ten**. Each
dimension has multiple credible options, and every trajectory in §4 is a
specific combination of choices across these ten. Surfacing them lets you
mix-and-match consciously instead of inheriting a default.

### Dimension 1 — Distribution surface

| Option | Reach | Effort | Notes |
|---|---|---|---|
| Static web URL (CDN) | Global, instant | Low | Cloudflare Pages / Vercel / Netlify |
| Installable PWA | Global + home-screen | Low | Adds webmanifest + service worker |
| Android APK (Capacitor) | Play Store or sideload | Medium | Already configured |
| iOS app (Capacitor) | App Store | Medium | Needs Apple Developer account + Capacitor iOS |
| Desktop (Tauri) | Win/Mac/Linux | Medium | Tauri 2.0 ships Nov 2025, stable |
| Itch.io / Steam wrap | PC gamers | Medium | Tauri/Electron wrapper + store submission |

### Dimension 2 — Persistence model

| Option | Sync | Account needed | Risk |
|---|---|---|---|
| Local-only (current) | None | None | Lost on data clear |
| Anonymous cloud sync | Across devices via device-ID + recovery code | None | Recovery code is the key |
| Account-based cloud sync | Email/OAuth/passkey | Yes | Friction at onboarding |
| End-to-end encrypted | Server never sees plaintext | None | CryptoStore already exists, extend it |

### Dimension 3 — Compute / where state lives

| Option | Trust model | Latency | Infra cost |
|---|---|---|---|
| Client-authoritative (current) | Trust client | Zero | Zero |
| Server-authoritative | Trust server | +round-trip | Medium |
| Hybrid: client-authoritative + signed telemetry | Trust client, audit server | Zero | Low |
| Hybrid: server-authoritative for LLM only | Trust server for narrative, client for state | +LLM-only | Low |

### Dimension 4 — LLM security posture

| Option | Key safety | Cost | Notes |
|---|---|---|---|
| Direct browser→provider (current) | 🔴 Key exposed | $0 infra | Unacceptable for public deploy |
| Stateless proxy (Cloudflare Worker / Vercel Edge) | ✅ Key server-side | ~$0 free tier | Best for static deploy |
| Streaming proxy (SSE/WebSocket) | ✅ Key server-side + streaming UX | Low | Better for long generations |
| Dedicated LLM gateway (LiteLLM / Portkey) | ✅ + rate-limit + multi-provider | Medium | Overkill at MVP scale |
| Fully self-hosted (vLLM on GPU box) | ✅ | High | Only if cost / privacy demands |

### Dimension 5 — Multiplayer / social

| Option | What it adds | Effort | Canon-fit? |
|---|---|---|---|
| None (current) | — | — | ✅ Single-player developmental practice |
| Async shared world | "Others have walked here" residue | Medium | ✅ Aligns with Great Way / holonic field |
| Co-op encounters | Two-player dilemmas | High | ⚠️ Changes assessment validity |
| Leaderboard | Competitive CCI | Low | ❌ Violates Veil (raw comparison) |
| PvP | — | — | ❌ Anti-canonical |

### Dimension 6 — Telemetry pipeline

| Option | Privacy | Latency | Effort |
|---|---|---|---|
| Local-only (current) | Best | Zero | Zero |
| Batched upload (session-end) | Good | Minutes | Low |
| Real-time stream (SSE/WS) | Fair | ms | Medium |
| Privacy-preserving aggregate (differential privacy) | Best | Hours | High |

### Dimension 7 — Identity

| Option | Friction | Recovery | Notes |
|---|---|---|---|
| Device-anonymous (current) | None | None | Lost on device loss |
| Device-ID + recovery code | Low | Code-based | Recommended default |
| Email + password | High | Email | Friction kills onboarding |
| Magic link (email) | Medium | Email | Better than pw |
| OAuth (Google/Apple) | Low | Provider | Best for mobile |
| Passkey | Low | iCloud/Google sync | Modern, but support varies |
| Web3 wallet | High | Seed phrase | Niche audience |

### Dimension 8 — Visual / rendering surface (the big one)

| Option | DOM or Canvas | Tech | Design ceiling | Migration cost |
|---|---|---|---|---|
| Pure Phaser (current) | Canvas | Phaser primitives | Low | Zero |
| Phaser + DOM HUD overlay | Both | Phaser + vanilla DOM / lit-html | Medium | Low |
| React shell + Phaser canvas (hybrid) | Both | React + Phaser | High | Medium |
| React + PixiJS (drop Phaser) | Both | React + Pixi | Highest | High |
| React + Three.js / R3F | Both | React + WebGL | Highest (3D possible) | Very high |
| Next.js full-stack | Both | Next.js + (Phaser or Pixi) | Highest | High |
| Native (SwiftUI/Compose) | Native | Per-platform | Highest | Very high — separate codebase per OS |

### Dimension 9 — Asset pipeline

| Option | Cost | Quality | Iterability |
|---|---|---|---|
| None (current) | $0 | Low | Infinite (it's code) |
| Procedural shaders (WebGL/GLSL) | Time | High | High |
| Hand-drawn / commissioned | $$$ | Highest | Low (one-shot) |
| AI-generated (Stable Diffusion / SDXL / image-gen APIs) | $ | Medium-High | Medium |
| Open-source game asset packs | $ | Medium | Low |
| Mixed: procedural + AI + curated | $$ | High | Medium |

### Dimension 10 — Performance budget

| Target | FPS | Bundle | First-paint | Constraints |
|---|---|---|---|---|
| Mobile-first 60fps | 60 | <2MB initial | <3s on 4G | Phaser FIT portrait, careful audio |
| Desktop 120fps | 120 | <5MB | <2s on broadband | Higher-quality shaders, audio |
| Streaming (asset-on-demand) | 60 | <500KB initial | <1s | Code-split by stage, lazy-load |
| SSR shell + hydrate | n/a | <100KB initial HTML | <500ms | Next.js / Astro for shell |

---

## 3. Constraints Inherited from the Three Uploaded Design Skills

The three uploaded skills collectively form your **design-taste brief**. They
are not just tools — they are aesthetic commitments. Any trajectory must
honour them or you will dislike the output.

### From `ui-ux-pro-max/SKILL.md`
- 50+ named styles (glassmorphism, claymorphism, minimalism, brutalism,
  neumorphism, bento grid, dark mode, skeuomorphism, flat design…)
- 161 colour palettes, 57 font pairings, 161 product types
- 10 stack supports (React, Next.js, Vue, Svelte, SwiftUI, React Native,
  Flutter, Tailwind, shadcn/ui, HTML/CSS)
- "Must Use" trigger: designing new pages, creating/refactoring UI
  components, choosing colour/typography/spacing standards, reviewing UI code
- **Implication:** The frontend should be DOM-based (React + Tailwind +
  shadcn) so this skill's catalogue is usable. Phaser-only would force us
  to translate every Tailwind class into Phaser-primitive equivalents — a
  lossy, slow, ugly path.

### From `design-taste-frontend/SKILL.md`
- "Anti-slop frontend skill" — the agent reads the brief, infers direction,
  ships interfaces that do **not** look templated
- Focus: landing pages, portfolios, redesigns (not dashboards)
- Section 0: "Read these signals first" — page kind, vibe words, reference
  signals, audience, existing brand assets
- Section 11: redesigns treat existing brand assets as starting material
- **Implication:** The visual direction must be **inferred from Mysterium's
  canon**, not picked from a template. The 8-stage aesthetic system
  (cave-dark → luminous-silence) is the brand asset to start from. Each
  stage gets its own palette, type pairing, and motion language.

### From `ui-styling/SKILL.md`
- Core stack: **shadcn/ui + Tailwind CSS + canvas-based visual design**
- Includes 40+ font files (Bricolage Grotesque, IBM Plex, JetBrains Mono,
  Lora, Outfit, Work Sans, Crimson Pro, Instrument Serif, Young Serif,
  Tektur, Pixelify Sans, etc.) — already on disk, ready to use
- References for shadcn components, theming, accessibility, Tailwind
  utilities, responsive design, customization
- Includes Python scripts (`shadcn_add.py`, `tailwind_config_gen.py`) for
  component installation and config generation
- **Implication:** The React shell should be built on shadcn/ui + Tailwind
  v4, with the included fonts as the typographic palette. Canvas-based
  visual design (the third layer of this skill) can drive the Phaser
  scene's procedural aesthetics — same tokens, different rendering.

### Synthesis: what the three skills collectively demand

1. The frontend must be **React + shadcn/ui + Tailwind v4** for the
   non-gameplay surfaces (menus, journal, codex, onboarding, settings,
   profile, marketing portal).
2. The Phaser gameplay canvas must adopt the **same design tokens** as
   the DOM shell — colours, type scale, motion easing — so the experience
  feels unified.
3. The visual direction must be **inferred from canon**, not templated.
   Concretely: 8 stage-specific palettes, 8 type pairings, 8 motion
   languages. The player feels which stage they're in without ever seeing
   the stage name.
4. The fonts already on disk (in `ui-styling/canvas-fonts/`) should be
   the typographic substrate. No external font CDN.

---

## 4. The Eight Architecture Trajectories (the brainstorm)

Each trajectory below is a coherent combination of choices across the ten
dimensions in §2. They are not mutually exclusive — §6 composes a
recommended hybrid — but each is internally shippable on its own.

For each: **Concept → Stack → Pros → Cons → Effort → Best fit for →
Canon-fit rating.**

---

### Trajectory 1 — "Polish-and-Ship" (Phaser-only refinement)

**Concept.** Keep Phaser as the only renderer. Add a real asset pipeline
(sprites, atlases, audio, fonts loaded into Phaser). Add a serverless BFF
only for LLM proxy + telemetry ingest. Ship as PWA + Android Capacitor.
Zero React, zero DOM shell.

**Stack.** Phaser 3.80 + Vite + Capacitor + Cloudflare Worker (BFF).
Persistence stays local-first. LLM goes through the proxy. Telemetry
batched to the proxy at session end.

**Pros.**
- Smallest blast radius. `core/` untouched. `infra/` gets one new
  `ProxiedLLMClient.ts`. `game/` gets an asset loader and texture atlas.
- Fastest to ship — 2–3 weeks.
- One runtime, one rendering model, one event loop.
- Lowest learning curve for anyone already in the project.

**Cons.**
- **Visual ceiling unchanged.** Phaser UI still feels like a programmer
  drew it. The three design-taste skills are largely unusable inside
  Phaser primitives.
- Every UI tweak is more code than the equivalent Tailwind class.
- No SSR / no SEO / no shareable URLs for journal entries.
- Accessibility requires the existing DOM overlay hack — feels bolted-on.

**Effort.** 2–3 weeks (LLM proxy + asset pipeline + PWA manifest + Capacitor
sync).

**Best fit for.** A "ship something next month" milestone. A proof that the
game can be deployed at all. Not the final form.

**Canon-fit.** ✅ Fully canon-compliant — no Veil risk, no multiplayer
complications.

---

### Trajectory 2 — "Hybrid DOM/Canvas" (React shell + Phaser gameplay) ⭐

**Concept.** Split the UI by *purpose*: every **non-gameplay** surface
becomes a React route (MainMenu, Onboarding, Journal, Codex, Settings,
RadialChart, Reflection, EncounterSelection, marketing/landing); the
**gameplay** surface (EncounterScene + UIOverlayScene + AssessmentScene)
stays as a Phaser canvas embedded inside one React route. Phaser events
bridge to React via a thin adapter over the existing `EventBus`.

**Stack.**
- **Shell:** Vite + React 18 + shadcn/ui + Tailwind v4 + TanStack Router
  (or React Router 7) + Zustand (UI state) + TanStack Query (BFF data)
- **Canvas:** Phaser 3.80, mounted into a `<div>` ref inside one React
  route (`/play`)
- **Bridge:** `EventBus` (existing) ↔ `phaserEventAdapter.ts` (new) ↔
  React store. Phaser emits `encounter_completed` → adapter pushes to
  React store → React updates HUD overlay.
- **BFF:** Cloudflare Workers / Vercel Edge Functions for LLM proxy +
  telemetry ingest + anonymous save sync.
- **Persistence:** LocalStorage (offline-first) + BFF sync (when online)
  with device-ID + recovery code.

**Pros.**
- **Best fit for the three design-taste skills.** DOM shell gets full
  shadcn/ui + Tailwind + the included font catalogue. Phaser canvas
  adopts the same design tokens.
- **`core/` untouched.** Pure-TS engines keep running in Node tests.
- **`infra/` minimally extended.** New `ProxiedLLMClient`, new
  `CloudSyncStore`, existing patterns hold.
- **`game/` shrinks.** 14 scenes become ~4 (Boot, Preloader, Encounter,
  UIOverlay). The other 10 become React routes. Less Phaser code = lower
  maintenance.
- **SEO + shareability.** Landing, journal, codex can SSR if we later
  move to Next.js. Marketing site is just another route.
- **Accessibility native.** DOM overlays become first-class React
  components — screen reader support is free.
- **Performance.** Phaser loads only on `/play`. Initial bundle for
  landing/menu is tiny.

**Cons.**
- **Two rendering worlds.** Must define a clean bridge pattern (events
  + shared store + token system) or scenes feel disconnected from menus.
- **Scene transitions across the boundary.** "Click encounter → React
  route changes → Phaser boots → encounter starts" needs careful
  choreography to feel instant.
- **Two build pipelines share one Vite config** — manageable but real.
- **Bundle size grows** with React + Radix + Tailwind. Mitigated by
  code-splitting.

**Effort.** 6–8 weeks (LLM proxy week 1, React shell + bridge weeks 2–4,
scene migration weeks 5–6, design system weeks 7–8, deploy + polish).

**Best fit for.** A game that wants **both** real visual polish **and**
shipped status, without rewriting `core/`. This is the trajectory the
uploaded design-taste skills were made for.

**Canon-fit.** ✅ Fully canon-compliant. Veil filter runs in BFF (better
than today). Infinite-checkpoint preserved (offline-first). Stage aesthetics
applied as React theme tokens.

---

### Trajectory 3 — "React-first" (drop Phaser, use PixiJS)

**Concept.** Rebuild `game/` in React + PixiJS (`@pixi/react`). Same `core/`
and `infra/`. One rendering technology across the whole app. Phaser is gone.

**Stack.** Vite + React 18 + PixiJS 8 + `@pixi/react` + shadcn/ui +
Tailwind v4. No Phaser.

**Pros.**
- **One tech stack.** One mental model, one bundle, one event loop.
- **Maximum design flexibility.** PixiJS gives WebGL shaders, particle
  systems, filters — beyond Phaser's primitives.
- **React reconciliation for the canvas.** `@pixi/react` lets you write
  Pixi scenes as JSX. Tooling matches the rest of the app.
- **Smaller bundle.** PixiJS core (~250KB) < Phaser (~1MB).

**Cons.**
- **Massive rewrite.** All 14 scenes + 8 assessment renderers must be
  rewritten. The Phaser tweens / scale manager / scene manager patterns
  don't translate 1:1.
- **`@pixi/react` is less battle-tested than Phaser.** Edge cases in
  reconciliation, lifecycle, and performance profiling.
- **Lose Phaser's batteries.** Physics, input manager, scale manager,
  audio, scene lifecycle — all must be rebuilt or replaced.
- **Higher risk.** Rewrites always ship late.

**Effort.** 12–16 weeks.

**Best fit for.** A multi-year project where the team is committed to
React-only stacks and Phaser's quirks are causing ongoing pain. **Not
recommended for Mysterium right now** — Phaser works fine for the gameplay
surface, and the rewrite cost buys no player-visible improvement over
Trajectory 2.

**Canon-fit.** ✅ Canon-compliant, but the rewrite cost is unjustified.

---

### Trajectory 4 — "Next.js Full-Stack" (one codebase, one deploy)

**Concept.** Migrate the entire app to Next.js 16. App Router. React Server
Components for marketing / journal / codex / settings (SSR + SEO). Phaser
(or Pixi) as a client component for gameplay. API routes for LLM proxy,
save sync, telemetry ingest, auth. Database (Postgres / Turso / Supabase)
for accounts + cloud saves + telemetry.

**Stack.**
- **App:** Next.js 16 + React 19 + shadcn/ui + Tailwind v4
- **Canvas:** Phaser 3.80 as a client component (`'use client'`)
- **API:** Next.js Route Handlers (`/api/llm`, `/api/save`, `/api/telemetry`,
  `/api/auth/*`)
- **Auth:** NextAuth / Auth.js or Lucia (email magic link + Google/Apple
  OAuth)
- **DB:** Turso (SQLite at edge) / Supabase (Postgres) / Neon (Postgres)
- **Deploy:** Vercel or Cloudflare Pages (with Workers for DB access)

**Pros.**
- **Most "online-game-like" deployment.** One Vercel/Cloudflare deploy
  gives you web + API + DB + auth + analytics.
- **SSR for marketing / journal.** Better SEO, faster first paint,
  shareable URLs.
- **Built-in auth.** Account-based cloud sync becomes trivial.
- **Edge functions for LLM proxy.** Free-tier covers MVP scale.
- **Future-ready.** Multiplayer, payments, community features all fit
  naturally.

**Cons.**
- **Largest migration.** Vite → Next.js is not trivial. Phaser needs
  dynamic imports + `'use client'` annotations. `localStorage` access
  must be guarded by `typeof window !== 'undefined'`.
- **Server / client boundary discipline.** `core/` and `infra/` must be
  audited for client-only APIs (LocalStorage, Capacitor, `fetch` to
  browser-only endpoints).
- **Heavier infra.** Database to manage, migrations to write, auth to
  configure.
- **Slower dev server.** Next.js dev is slower than Vite. HMR works but
  with more overhead.

**Effort.** 10–14 weeks.

**Best fit for.** When you need accounts + multiplayer + payments in the
same codebase, and you're willing to commit to Next.js as the platform.
**Not recommended as the first step** — start with Trajectory 2 (Vite +
React shell + Phaser) and migrate to Next.js later if/when the
server-side surface justifies it.

**Canon-fit.** ✅ Canon-compliant. Account-based sync adds friction at
onboarding — mitigate with optional auth (device-ID first, account
upgrade later).

---

### Trajectory 5 — "Authoritative Game Server" (Colyseus / Nakama)

**Concept.** Stand up a Node.js game server (Colyseus or Heroic Labs
Nakama) that holds authoritative Significator state. The client becomes a
thin renderer — never owns state. Server orchestrates LLM calls,
encounter scheduling, telemetry. Client renders and forwards input.

**Stack.**
- **Server:** Colyseus (Node.js + TypeScript) or Nakama (Go/Lua, hosted)
- **Transport:** WebSocket (real-time) or HTTP (turn-based)
- **Client:** Phaser or React+Phaser hybrid (Trajectory 2's frontend)
- **DB:** Redis (Colyseus) or Nakama's built-in storage
- **Deploy:** VM (DigitalOcean / Hetzner / Fly.io) — not serverless due
  to long-lived WS connections

**Pros.**
- **Anti-cheat.** State can't be tampered with client-side. Critical if
  the telemetry becomes clinically relevant.
- **Future multiplayer.** Co-op encounters, async shared world, all
  natural fits.
- **Server-driven LLM orchestration.** Persistent agent can run
  server-side across sessions, holding long-term context.
- **Rate limiting + abuse prevention.** Per-player LLM call quotas.

**Cons.**
- **Highest infrastructure cost.** Always-on server, monitoring,
  scaling, backups.
- **Latency.** Every action is a round-trip. Single-player becomes
  laggy on poor connections.
- **Operational burden.** Logs, alerts, on-call, security patches.
- **Overkill for current scope.** Mysterium is single-player. The
  "authoritative server" pattern is for multiplayer games.

**Effort.** 12–20 weeks (server + client refactor + ops setup).

**Best fit for.** A future phase when Mysterium adds co-op encounters or a
shared world. **Not now.** The hybrid Trajectory 2 + BFF covers 95% of
the value at 10% of the cost.

**Canon-fit.** ⚠️ Server-authoritative state changes the trust model —
players might feel surveilled. Mitigate with explicit consent + transparent
telemetry UI.

---

### Trajectory 6 — "Static PWA + Serverless BFF" (minimal viable online) ⭐

**Concept.** The leanest possible "online game" deployment. Static Vite
build (Phaser + optional React shell) on Cloudflare Pages / Vercel /
Netlify. One tiny serverless BFF (Cloudflare Workers / Vercel Edge /
Deno Deploy) for three endpoints: `POST /api/llm` (proxy), `POST /api/telemetry`
(ingest), `POST /api/save` + `GET /api/save` (anonymous cloud sync with
device-ID + recovery code). No accounts. No DB required — use Cloudflare KV
/ Vercel KV / Turso for save storage.

**Stack.**
- **Frontend:** Vite + (Phaser-only OR React shell + Phaser — composable
  with Trajectory 1 or 2)
- **BFF:** Cloudflare Workers (TypeScript, ~100 lines)
- **Storage:** Cloudflare KV (saves) + Cloudflare Analytics Engine
  (telemetry) — both have generous free tiers
- **Auth:** None (device-ID generated client-side, recovery code shown
  once)
- **Deploy:** `git push` → Cloudflare Pages builds + deploys

**Pros.**
- **Lowest infrastructure cost.** Free tier covers MVP scale (100K+
  players on Cloudflare free).
- **Fastest deployment.** Static + edge = global in 30 seconds.
- **No server to operate.** Workers are stateless, autoscaling,
  zero-config.
- **Privacy-friendly.** No accounts, no PII, no cookies. Just device-IDs.
- **Pairs with any frontend trajectory.** This is an *infra* trajectory,
  composable with Trajectory 1, 2, or 3.

**Cons.**
- **No real-time.** Save sync is request/response. No WebSocket.
- **No server-side state.** Each request is independent. Persistent
  agent across sessions must live in the client + DB.
- **Worker size limits.** 10MB compressed. Not a problem at MVP scale.
- **No long-running computations.** 30s wall-clock limit per request.
  Long LLM streams need chunked response or migration to a different
  runtime.

**Effort.** 1–2 weeks (BFF + deploy pipeline + PWA manifest + service
worker).

**Best fit for.** **The mandatory first step.** Regardless of which
frontend trajectory you pick, this BFF pattern is required to fix the
LLM-key-exposure hole. Compose it with Trajectory 2 for the recommended
combo.

**Canon-fit.** ✅ Fully canon-compliant. Anonymous device-ID preserves
the "built personally, deployed globally" ethos. Recovery code model
preserves the "infinite checkpoint" feel.

---

### Trajectory 7 — "Game Portal + Game" (decoupled marketing + play)

**Concept.** Two separate apps: a **portal** (Next.js or Astro) at
`mysterium.game` for marketing, docs, community, journal export, account
management, donations; and the **game** (Vite + Phaser + React shell) at
`play.mysterium.game` for gameplay only. Portal links to game. Game posts
  telemetry to portal's API.

**Stack.**
- **Portal:** Next.js 16 (or Astro 5) + shadcn/ui + Tailwind v4 + MDX
  for docs
- **Game:** Trajectory 2's hybrid React shell + Phaser
- **Shared:** A small `@mysterium/ui` package (design tokens, fonts, button
  component) shared via npm workspace or git submodule
- **Deploy:** Portal on Vercel, game on Cloudflare Pages (or both on
  Cloudflare)

**Pros.**
- **Concern separation.** Marketing site iterates independently of game.
- **SEO + content velocity.** Portal can have a blog, changelog, dev
  logs, lore wiki — all SSR'd, all indexable.
- **Community surface.** Portal can host forums, Discord OAuth, Patreon
  hooks — none of which belong in the game.
- **Brand polish.** Portal is where the public-facing design-taste
  skills shine brightest.
- **Game stays focused.** No marketing cruft in the game bundle.

**Cons.**
- **Two codebases to maintain.** Even with a shared UI package, two
  CI/CD pipelines, two deploys.
- **Cross-origin complexity.** Game calls portal API for account /
  telemetry — CORS, cookies, auth tokens.
- **Heavier initial setup.** Justify only when the portal is real
  content, not a placeholder.

**Effort.** 4–6 weeks for portal + integration (game side assumed to be
Trajectory 2).

**Best fit for.** When you're ready to market Mysterium publicly and want a
professional web presence separate from the game. **Defer until after
Trajectory 2 + 6 ship.** A single landing page inside the game's React
shell is sufficient for MVP.

**Canon-fit.** ✅ Canon-compliant.

---

### Trajectory 8 — "Multi-platform Single Codebase" (web + Android + iOS + desktop)

**Concept.** One codebase, four deployment surfaces. Web (PWA + static
URL), Android (Capacitor, already configured), iOS (Capacitor, add),
desktop (Tauri 2.0, add). All share the same Vite + React + Phaser hybrid
shell from Trajectory 2.

**Stack.**
- **App:** Trajectory 2's hybrid shell
- **Mobile:** Capacitor 6 (Android configured; add `@capacitor/ios`)
- **Desktop:** Tauri 2.0 (Rust shell, ~10MB binary vs Electron's 100MB+)
- **Store submission:** Play Store, App Store, Steam (Steamworks partner
  program), Itch.io (direct upload)

**Pros.**
- **Maximum reach.** Players can install natively on any device.
- **Native capabilities.** Haptics, push notifications, native
  share-sheet, file system access (Tauri).
- **Offline-first by default.** Native apps cache aggressively.
- **Discoverability.** App stores are still the primary discovery channel
  for mobile games.

**Cons.**
- **App store review processes.** Apple's review can take days; rejections
  for opaque reasons. Play Store is faster but has its own rules.
- **iOS Apple Developer account.** $99/year. Requires Mac for builds.
- **Tauri maturity on Windows.** Tauri 2.0 is solid but edge cases exist.
- **Native plugin maintenance.** Each platform has its own quirks.
- **Update latency.** Store updates take hours to propagate; web updates
  are instant.

**Effort.** 3–5 weeks on top of Trajectory 2 (iOS add + Tauri add + store
submissions).

**Best fit for.** A mature Mysterium ready for broad consumer distribution.
**Defer until after web + Android are stable on Trajectory 2 + 6.**

**Canon-fit.** ✅ Canon-compliant.

---

## 5. Visual / Design-System Layer (applying the three uploaded skills)

This section is **trajectory-agnostic** — it applies to any trajectory that
includes a DOM surface (Trajectories 2, 3, 4, 7, 8). Trajectory 1
(Phaser-only) can adopt the same tokens but cannot use shadcn/Tailwind.

### 5.1 The Stage Aesthetic System (the canon-derived brand asset)

Mysterium's canon already encodes 8 stages, each with a distinct aesthetic
register. This is the brand asset — the design system must express it.

| # | Stage | Aesthetic register (from `MainMenuScene`) | Palette direction | Type pairing (from `ui-styling/canvas-fonts/`) | Motion language |
|---|---|---|---|---|---|
| 1 | Infrared | "cave-dark, primal" | Deep charcoal + ember red + bone white. Low saturation. | Boldonse (display) + DMMono (body) | Flicker, pulse, breath |
| 2 | Magenta | "spirit-haunted, symbolic" | Violet + bruised purple + spectral white. | Italiana (display) + Lora Italic (body) | Drift, ghosting, fade |
| 3 | Red | "fortress-sharp, weapon-walls" | Blood crimson + iron black + brass. High contrast. | Big Shoulders Bold (display) + IBMPlexMono (body) | Snap, slam, lock |
| 4 | Amber | "cathedral-ordered, gold-stone" | Stained-glass gold + lapis + stone. | Young Serif (display) + LibreBaskerville (body) | Rise, chime, sustain |
| 5 | Orange | "mechanism-precise, steel-glass" | Cool steel + amber alert + glass white. | Tektur Medium (display) + InstrumentSans (body) | Tick, rotate, slide |
| 6 | Green | "garden-lush, earth-toned" | Moss + clay + sun-bleached green. | BricolageGrotesque Bold (display) + WorkSans (body) | Grow, unfurl, settle |
| 7 | Turquoise | "crystalline, translucent" | Ice cyan + frost white + deep teal. | PoiretOne (display) + Jura Light (body) | Refract, shimmer, freeze |
| 8 | White | "luminous silence, spacious" | Pure white + warm ivory + faint gold. | CrimsonPro Italic (display) + EricaOne (body) | Dissolve, expand, breathe |

These are **starting directions** — the `design-taste-frontend` skill's
Section 0 ("Read the Room") applies. The first implementation pass should
produce 8 theme presets, switchable via a `data-stage` attribute on `<html>`.

### 5.2 Token architecture (shared between DOM shell and Phaser canvas)

```css
/* src/styles/tokens.css — generated from a single source of truth */
:root {
  /* Stage-agnostic baseline */
  --mysterium-radius: 6px;
  --mysterium-ease: cubic-bezier(0.22, 1, 0.36, 1);
  --mysterium-duration-fast: 180ms;
  --mysterium-duration-base: 320ms;
  --mysterium-duration-slow: 540ms;
}

[data-stage="infrared"] {
  --mysterium-bg: #0a0707;
  --mysterium-surface: #140d0d;
  --mysterium-fg: #d8c8b4;
  --mysterium-muted: #6a5040;
  --mysterium-accent: #c44525;
  --mysterium-accent-soft: #6b2415;
  --mysterium-font-display: "Boldonse", system-ui;
  --mysterium-font-body: "DMMono", monospace;
  --mysterium-motion: pulse;
}

[data-stage="red"] {
  --mysterium-bg: #0d0a0a;
  --mysterium-surface: #1a0f0f;
  --mysterium-fg: #e8d4cc;
  --mysterium-muted: #8a5040;
  --mysterium-accent: #b8252a;
  --mysterium-accent-soft: #5a1318;
  --mysterium-font-display: "Big Shoulders", "Arial Narrow", sans-serif;
  --mysterium-font-body: "IBM Plex Mono", monospace;
  --mysterium-motion: snap;
}
/* ... 6 more stages ... */
```

Phaser reads the same tokens via `getComputedStyle(document.documentElement)`
at scene boot — single source of truth, two renderers.

### 5.3 Component strategy

**DOM shell (shadcn/ui + Tailwind):**
- Install via the included `scripts/shadcn_add.py`: `python shadcn_add.py
  button card dialog tabs form tooltip sonner`
- Custom Mysterium components layered on top: `<StageTheme>`, `<VeiledStat>`
  (renders qualitative descriptors only — never raw numbers), `<EncounterCard>`,
  `<JournalEntry>`, `<CodexEntry>`, `<RadialChart>` (replaces the Phaser
  `RadialChartScene` with a D3 or visx implementation), `<SettingsPanel>`.
- Every component reads `data-stage` tokens — switching stages re-skins the
  entire shell without a React re-render.

**Phaser canvas:**
- Boot scene reads tokens from `:root` at startup.
- `Button.ts` factory already exists — extend to read `--mysterium-accent` etc.
  instead of hardcoded hex.
- Text objects read `--mysterium-font-display` / `--mysterium-font-body` from the
  same source.
- Motion language per stage: a `MotionLibrary` maps `--mysterium-motion` token
  to Phaser tween configs (`pulse` = sine yoyo, `snap` = 80ms linear, etc.).

### 5.4 The Veil compliance layer (critical)

Any DOM-rendered stat must go through a `<VeiledStat>` component that
maps raw Significator values to qualitative descriptors. The mapping table
already exists in `MainMenuScene.drawProfileSummary()` — extract it into
`core/presentation/veilDescriptors.ts` (pure TS, used by both React and
Phaser).

```ts
// core/presentation/veilDescriptors.ts (new, pure TS, no React/Phaser imports)
export function describeStage(stage: Stage): string { /* ... */ }
export function describeDriveSpread(weights: DriveWeights): string { /* ... */ }
export function describeEncounterCount(n: number): string { /* ... */ }
export function describeCCI(cci: number): string { /* ... */ }
```

This becomes the **single source of truth** for Veil-compliant rendering.
Both DOM and Phaser call these functions. No raw number is ever shown to
the player, anywhere, period.

### 5.5 Asset pipeline recommendation

- **Audio:** Procedural via Web Audio API for stage ambiances (low drones
  for Infrared, chimes for Amber, white noise for White). One-shot SFX
  generated from oscillator + filter envelopes. Zero asset weight.
- **Sprites / textures:** Procedural via Phaser Graphics + GLSL shaders
  for stage backdrops. AI-generated (Stable Diffusion / image-gen APIs)
  for encounter illustrations — one illustration per encounter type,
  generated once, cached.
- **Icons:** Lucide (already in shadcn) for DOM; same icons rendered as
  Phaser Text for canvas.
- **Fonts:** All from `ui-styling/canvas-fonts/` — no external CDN. Loaded
  via `@font-face` with `font-display: swap`.

---

## 6. Recommended Composite Trajectory (v2 — SvelteKit substitution)

After surveying all eight trajectories and the user's signal toward maximum
universal reach, the recommendation is a **composite** that sequences them
rather than picking one. The v2 reasoning:

1. **Phase 0 (BFF) is mandatory regardless.** The LLM-key-exposure hole is
   a release blocker. In v2, the BFF collapses into SvelteKit `+server.ts`
   endpoints — no separate Cloudflare Worker repo. One deploy, one codebase.

2. **Phase 1 framework = SvelteKit (not Vite+React).** Three reasons:
   - **Bundle size is a universality feature.** SvelteKit ships ~40KB
     initial JS vs React's ~180KB. For "any age, any altitude, any device"
     canon, this matters. The game must load on a $40 Android phone on 2G.
   - **Svelte's built-in transitions are canon-aligned.** The 8 stage
     motion languages (pulse, drift, snap, chime, tick, grow, refract,
     dissolve) become 8 Svelte transition functions. No framer-motion
     dependency (~30KB saved).
   - **SvelteKit is Vite underneath.** Phaser integrates identically to
     the Vite+React path. No server/client boundary gymnastics like
     Next.js. `PhaserGameClient.svelte` is cleaner than the React
     equivalent.
   - **Cost:** shadcn-svelte has ~70% component parity with shadcn/ui
     React. Missing: Command Palette, advanced Data Table. Build those
     yourself or skip — YAGNI.

3. **Phase 2.5 (NEW — Capability detection + adaptive UI).** A
   `CapabilityProbe` runs at boot, sets `data-capability` and `data-input`
   attributes on `<html>`. Drives: 10-foot TV mode (large touch targets,
   4-directional nav), reduced-motion handling, coarse-pointer
   enlargement, WebGL-shader on/off, particle density scaling.

4. **Phase 8 (Multi-platform) is the natural sequel** once the web build
   is stable. Capacitor is already there for Android; iOS and Tauri are
   additive.

5. **Trajectory 4 (Next.js) is deferred** — SvelteKit covers SSR + API
   routes + auth. Migrate only if SvelteKit's ecosystem proves insufficient
   for a specific future need (e.g. heavy RSC-based content site).

6. **Trajectory 7 (Game portal) is deferred** until real marketing /
   community need. A single landing route inside the SvelteKit shell is
   enough for MVP.

7. **Trajectory 5 (Authoritative game server) is deferred indefinitely**
   unless co-op encounters become canon.

8. **Trajectories 1 (Phaser-only) and 3 (PixiJS rewrite) are rejected.**
   Trajectory 1 leaves the visual ceiling intact. Trajectory 3 is a
   rewrite-for-rewrite's-sake.

### The recommended composite, visualised (v2)

```
Now ──────────────────────────────────────────────────────────────────────►
                                                                          │
Phase 0  ┌─ SvelteKit migration + BFF endpoints          ──┐  1-2 wks      │
         │   - Install SvelteKit (Vite plugin)            │                │
         │   - src/routes/api/llm/+server.ts (proxy)      │                │
         │   - src/routes/api/telemetry/+server.ts        │                │
         │   - src/routes/api/save/+server.ts             │                │
         │   - VeilFilter runs server-side                │                │
         │   - ProxiedLLMClient (browser) → /api/llm      │                │
         └────────────────────────────────────────────────┘                │
                                                                          │
Phase 1  ┌─ SvelteKit shell + Phaser bridge              ──┐  3 wks        │
         │   - SvelteKit + shadcn-svelte + Tailwind v4    │                │
         │   - /play route mounts Phaser via onMount      │                │
         │   - Migrate 10 of 14 scenes to Svelte routes   │                │
         │   - EventBus ↔ Svelte store bridge             │                │
         │   - Lazy-load Phaser bundle on /play only      │                │
         └────────────────────────────────────────────────┘                │
                                                                          │
Phase 2  ┌─ Design System (Stage Aesthetic System)      ──┐  2 wks        │
         │   - 8 stage themes as CSS tokens               │                │
         │   - Font loading from ui-styling/canvas-fonts  │                │
         │   - <VeiledStat>, <StageTheme> Svelte comps    │                │
         │   - 8 Svelte transition functions (motion)     │                │
         │   - Phaser token bridge (getComputedStyle)      │                │
         │   - core/presentation/veilDescriptors.ts       │                │
         └────────────────────────────────────────────────┘                │
                                                                          │
Phase 2.5┌─ Universality Layer (NEW)                     ──┐  1 wk         │
         │   - CapabilityProbe (WebGL, mem, input, a11y)  │                │
         │   - data-capability / data-input attrs         │                │
         │   - 10-foot TV mode (≥64px targets, 4-dir nav) │                │
         │   - Reduced-motion handler (extends existing)  │                │
         │   - Coarse-pointer enlargement                 │                │
         │   - LLM-driven adaptive UI copy (cognitive)    │                │
         └────────────────────────────────────────────────┘                │
                                                                          │
Phase 3  ┌─ PWA + Cloud Sync + Deploy                    ──┐  1 wk         │
         │   - webmanifest + service worker (Workbox)     │                │
         │   - Cloudflare Pages CI                        │                │
         │   - Cloud sync wired into SaveRepository       │                │
         │   - Anonymous device-ID + 12-word recovery     │                │
         │   - Offline-first with background sync         │                │
         └────────────────────────────────────────────────┘                │
                                                                          │
Phase 4  ┌─ Multi-platform add-on: iOS + Tauri           ──┐  3-5 wks      │
         │   - @capacitor/ios                              │                │
         │   - Tauri 2.0 desktop shell                     │                │
         │   - Store submissions                           │                │
         └────────────────────────────────────────────────┘                │
                                                                          │
Phase 5  ┌─ Interactive visuals (FAR FUTURE, deferred)   ──┐  when ready  │
         │   - GLSL shader backdrops per stage             │                │
         │   - Particle systems for encounter moments      │                │
         │   - Post-processing filters (bloom, etc.)       │                │
         │   - Procedural Web Audio ambiance               │                │
         │   - Lives in src/game/effects/, never touches   │                │
         │     the DOM shell                               │                │
         └────────────────────────────────────────────────┘                │
                                                                          │
Future   ┌─ Trajectory 4 (Next.js migration)            ──┐  only if      │
         │   Triggered by: RSC-based content needs,       │                │
         │   or SvelteKit ecosystem gap                   │                │
         └────────────────────────────────────────────────┘                │
                                                                          ▼
```

Total time-to-first-shippable-online-version: **7–9 weeks** (Phases 0–3).
Total time-to-multi-platform: **10–14 weeks** (add Phase 4).
Phase 5 (interactive visuals): triggered when foundational game is tested
and verified, per user direction.

### The recommended composite, visualised (legacy v1 — preserved for reference)

The v1 visualisation (Vite+React) is preserved below for diff-traceability.
The active recommendation is the v2 visualisation above.

```
[legacy v1 — Vite+React+BFF — superseded by v2 SvelteKit above]
```

Total time-to-first-shippable-online-version (v1, superseded): 6–8 weeks.
Total time-to-multi-platform (v1, superseded): 9–13 weeks.

---

## 7. Phased Implementation Roadmap (detailed) — v2

### Phase 0 — SvelteKit Migration + BFF Endpoints (1–2 weeks) — critical

**Goal.** (a) Migrate the build from raw Vite to SvelteKit (which IS Vite
underneath, so Phaser integration is preserved). (b) Close the LLM-key-
exposure hole by adding SvelteKit `+server.ts` API endpoints that hold the
LLM key server-side. (c) Add telemetry ingest + save proxy endpoints.

**Deliverables.**
1. Install SvelteKit: `npm install -D @sveltejs/kit @sveltejs/adapter-auto
   svelte @sveltejs/vite-plugin-svelte`. Add `@sveltejs/adapter-cloudflare`
   for production deploy, `@sveltejs/adapter-static` for Capacitor.
2. Create `svelte.config.js` with adapter-auto (or adapter-cloudflare for
   prod). The existing `vite.config.ts` gets `sveltekit()` plugin added.
3. Move existing `index.html` content into `src/routes/+layout.svelte` +
   `src/routes/+page.svelte` (the root route = main menu, migrated in
   Phase 1; for Phase 0 it can be a placeholder that mounts the existing
   Phaser game via `startGame()` for backward compat).
4. Create `src/routes/api/llm/chat/+server.ts` — POST handler. Reads
   `LLM_API_KEY` from `process.env` (server-side only). Forwards to
   OpenAI/Anthropic. Applies `VeilFilter.filterInput` and `filterOutput`
   server-side (move `infra/llm/VeilFilter.ts` to a shared location
   importable by both client and server).
5. Create `src/routes/api/llm/tools/+server.ts` — POST handler for
   tool-calling LLM endpoint.
6. Create `src/routes/api/telemetry/+server.ts` — POST handler. Validates
   event schema. Writes to `platform.env.ANALYTICS` (Cloudflare Analytics
   Engine) on Cloudflare, or to a log file / KV in dev.
7. Create `src/routes/api/save/+server.ts` — GET and POST handlers.
   - `GET /api/save?deviceId=…` — returns latest encrypted save blob.
   - `POST /api/save` — accepts encrypted save blob + deviceId.
8. Create `src/routes/api/recovery/generate/+server.ts` and
   `src/routes/api/recovery/restore/+server.ts` — 12-word mnemonic
   recovery code flow.
9. Rate limiting via `@sveltejs/kit` hooks (`src/hooks.server.ts`) —
   per-device-ID LLM call quota (e.g. 100/day free tier).
10. CORS locked to the game's origin via the same hooks.
11. Secret management: `wrangler secret put LLM_API_KEY` for Cloudflare;
    `.env` for local dev (gitignored).

**Code changes in Mysterium.**
- New file: `src/infra/llm/ProxiedLLMClient.ts` — same interface as
  `LLMClient.ts` but posts to `/api/llm/*` instead of provider directly.
- `src/infra/llm/LLMClient.ts` becomes dev-only / CLI-only path (still
  used by `scripts/cli-game.ts`).
- `src/game/main.ts` (or its Svelte-mounted equivalent) chooses
  `ProxiedLLMClient` when running in browser, `LLMClient` when running
  in Node CLI.
- Move `src/infra/llm/VeilFilter.ts` to `src/shared/llm/VeilFilter.ts`
  (or similar) so it's importable by both client and server code.

**Acceptance criteria.**
- [ ] `npm run dev` boots SvelteKit at localhost:5173 with the existing
      Phaser game mounted (no visual regression).
- [ ] `npm test` still passes 703/713 (baseline preserved).
- [ ] `npm run build` produces a SvelteKit build (`.svelte-kit/output/`).
- [ ] Opening devtools on the running game shows zero LLM API keys in
      client bundle.
- [ ] LLM calls succeed end-to-end through `/api/llm/chat`.
- [ ] Telemetry events POSTed to `/api/telemetry` are accepted.
- [ ] Save data POSTed to `/api/save` is retrievable via GET.

**Risk.** SvelteKit's server-side `process.env` access requires
`$env/static/private` or `$env/dynamic/private` imports — not raw
`process.env`. This is a small refactor to the existing env-reading
code in `ProviderRegistry.ts`.

---

### Phase 1 — SvelteKit Shell + Phaser Bridge (3 weeks)

**Goal.** Stand up the SvelteKit DOM shell, migrate 10 of 14 Phaser scenes
to Svelte routes, embed Phaser as a Svelte component on `/play`, wire the
EventBus ↔ Svelte store bridge.

**Week 1 — Scaffolding.**
1. Add to `package.json`: `tailwindcss@^4`, `@tailwindcss/vite`,
   `bits-ui` (the headless library shadcn-svelte is built on),
   `clsx`, `tailwind-merge`, `lucide-svelte`, `mode-watcher` (dark mode).
2. Configure Tailwind v4 via `@tailwindcss/vite` plugin (no
   `tailwind.config.js` needed — uses `@theme` directive in CSS).
3. Init shadcn-svelte: `npx sv add shadcn-svelte` — pick "Default" style,
   "Zinc" base color (we'll override with stage themes anyway), CSS
   variables = yes.
4. Add the included fonts from `ui-styling/canvas-fonts/` to
   `static/fonts/` and register `@font-face` in `src/styles/fonts.css`.
5. Create `src/lib/` directory — the Svelte shell lives here.
6. Create `src/lib/components/PhaserGameClient.svelte` — a Svelte
   component that mounts Phaser into a `<div bind:this={container}>` in
   `onMount` and destroys it in `onDestroy`. Accepts a `scene` prop to
   boot directly into a specific scene (e.g. `<PhaserGameClient
   scene="World" />`).
7. Create `src/lib/stores/gameStore.svelte.ts` — a Svelte 5 runes-based
   store mirroring Significator + WorldState, hydrated from
   `SaveRepository` on boot.
8. Create `src/lib/bridge/phaserEventAdapter.ts` — subscribes to
   `EventBus`, forwards events to `gameStore`.
9. Create `src/lib/bridge/svelteToPhaserBridge.ts` — Svelte calls into
   Phaser via `game.registry.get('EventBus').emit(...)`.

**Week 2 — Routes + migration of menu surfaces.**
Migrate these scenes to Svelte routes (in priority order):

| Phaser scene → Svelte route | What it becomes |
|---|---|
| `MainMenuScene` → `src/routes/+page.svelte` (`/`) | Landing + main menu Svelte component |
| `OnboardingScene` → `src/routes/onboarding/+page.svelte` | Multi-step Svelte form |
| `RadialChartScene` → `src/routes/profile/+page.svelte` | D3/visx radial chart + VeiledStat descriptors |
| `CodexScene` → `src/routes/codex/+page.svelte` | Virtualised list + detail panel |
| `JournalScene` → `src/routes/journal/+page.svelte` | Virtualised list + entry reader |
| `SettingsScene` → `src/routes/settings/+page.svelte` | shadcn-svelte Tabs + Forms (a11y, LLM config, telemetry) |
| `EncounterSelectionScene` → `src/routes/encounters/+page.svelte` | Card grid of available encounters |
| `ReflectionScene` → `src/routes/reflect/[encounterId]/+page.svelte` | Post-encounter integration form |
| `DilemmaScene` → (stays in Phaser — part of `/play`) | Gameplay surface |
| `WorldScene` → (stays in Phaser — part of `/play`) | Gameplay surface |
| `EncounterScene` → (stays in Phaser — part of `/play`) | Gameplay surface |
| `UIOverlayScene` → (stays in Phaser — part of `/play`) | Gameplay surface |
| `AssessmentScene` → (stays in Phaser — part of `/play`) | Gameplay surface |
| `BootScene` + `PreloaderScene` → (become Svelte loaders) | Loading spinner / progress bar |

The 4 scenes that stay in Phaser are the **gameplay surface** — the parts
where Phaser's input manager, tween engine, and timing precision matter.
Everything menu-shaped moves to Svelte.

**Week 3 — EventBus ↔ Svelte store bridge + `/play` route.**
1. Define the bridge contract: list every event the gameplay surface
   emits and every command Svelte can send. Document in
   `src/lib/bridge/CONTRACT.md`.
2. Implement the `/play` route (`src/routes/play/+page.svelte`): on mount,
   dynamically import the Phaser bundle (`await import('$lib/phaser/...)
   `), instantiate the game into the container ref, hydrate the bridge,
   render the Phaser canvas + a minimal Svelte HUD overlay (top bar with
   stage descriptor, pause button, accessibility quick-toggles).
3. Test scene transitions: Svelte `/` → click "Continue to World" →
   SvelteKit navigates to `/play` → Phaser boots → `WorldScene` starts.
   Must feel instant (<300ms perceived latency).
4. Use Svelte's `{#await}` block for the dynamic import — shows a
   branded loading state while Phaser (~1MB) loads.

**Acceptance criteria.**
- [ ] All migrated routes render correctly with mocked Significator.
- [ ] `/play` boots Phaser, runs an encounter end-to-end, returns to `/`.
- [ ] Save data round-trips: change in Svelte → reflected in Phaser →
      persists on reload.
- [ ] Bundle split: initial JS for `/` is <80KB (Svelte runtime + app
      code); Phaser chunk loads only on `/play` (~1MB, lazy).
- [ ] Lighthouse score on `/` ≥ 95 on all four metrics.

---

### Phase 2 — Design System Implementation (2 weeks)

**Goal.** Apply the three uploaded design-taste skills. Produce the 8-stage
aesthetic system. Make Mysterium look like nothing else on the web.

**Week 1 — Tokens + fonts.**
1. Write `src/styles/tokens.css` with all 8 `[data-stage="…"]` blocks
   (palette + font + motion tokens per the table in §5.1).
2. Wire `data-stage` attribute to `<html>` from `gameStore` — when
   `sig.currentStage` changes, the entire shell re-skins.
3. Register all 40+ fonts from `ui-styling/canvas-fonts/` as
   `@font-face` declarations with `font-display: swap` and
   `unicode-range` where applicable.
4. Build the `<StageTheme>` Svelte component — reads current stage from
   `gameStore` and sets `data-stage` on `<html>` via an action.
5. Build the Phaser token bridge — `PhaserGameClient.svelte` reads
   `getComputedStyle` on boot, passes token map to `Phaser.Config`.
6. Build the 8 Svelte transition functions in
   `src/lib/transitions/stageMotion.ts` — `pulse`, `drift`, `snap`,
   `chime`, `tick`, `grow`, `refract`, `dissolve`. Each is a Svelte
   transition function (`(node, params) => {...}`) using the
   `--mysterium-duration-*` and `--mysterium-ease` tokens.

**Week 2 — Custom Mysterium components + asset pipeline.**
1. Build `<VeiledStat>` — takes a raw value + a descriptor function from
   `core/presentation/veilDescriptors.ts`, renders only the descriptor.
2. Build `<EncounterCard>`, `<JournalEntry>`, `<CodexEntry>`,
   `<RadialChart>` (using D3 or LayerChart).
3. Extract `veilDescriptors.ts` from `MainMenuScene` (the
   `stageAesthetics` map and `driveDescriptor` logic) into pure TS in
   `core/presentation/`.
4. Procedural audio: build `src/lib/audio/stageAmbiance.ts` — Web Audio
   API oscillators + filters per stage. Cross-fade on stage transition.
5. Procedural Phaser backdrops: `src/game/backdrops/StageBackdrop.ts` —
   GLSL shader per stage. Compiled at boot, swapped on stage change.
   (Deferred to Phase 5 if interactive visuals are deferred — see §12.)

**Acceptance criteria.**
- [ ] Switching stages visibly re-skins the entire shell (colours,
      fonts, motion) in <500ms.
- [ ] No raw number is ever visible to the player — `grep` the Svelte
      source for `sig.currentStage`, `sig.drives.weights`,
      `sig.totalEncounters` direct renders and find zero.
- [ ] Each stage's audio ambiance plays during gameplay and cross-fades
      on stage transition.
- [ ] Lighthouse Accessibility score ≥ 95 on all routes.

---

### Phase 2.5 — Universality Layer (1 week) — NEW in v2

**Goal.** Make Mysterium genuinely universal — work on a $40 Android phone on
2G, a 4K TV with a gamepad, a screen-reader user's laptop, a researcher's
desktop. This is the spine of "deployed like an online game" with maximum
reach.

**Deliverables.**
1. `src/lib/capabilities/CapabilityProbe.ts` — runs at boot, detects:
   - WebGL version (none / 1 / 2)
   - Device memory (`navigator.deviceMemory`)
   - CPU cores (`navigator.hardwareConcurrency`)
   - Connection type (`navigator.connection.effectiveType`: 4g/3g/2g/slow-2g)
   - Input methods: `pointer: fine | coarse`, `hover: hover | none`,
     `any-pointer: fine | coarse`, gamepad connected
   - Screen size + orientation
   - `prefers-reduced-motion`
   - `prefers-contrast: more`
   - `prefers-color-scheme: dark | light`
2. The probe sets `data-capability` and `data-input` attributes on
   `<html>` based on detection. CSS reads these via attribute selectors
   and adjusts: touch target size, motion intensity, particle density,
   shader on/off.
3. `data-input="touch"` (default) → 44px minimum touch targets.
   `data-input="gamepad"` → 64px targets + visible focus ring + 4-dir
   nav. `data-input="tv"` → 64px targets + high-contrast theme variant
   + 4-dir nav + larger typography.
4. Extend the existing `ReducedMotionGuard` (in
   `src/game/accessibility/`) to also read `data-capability="reduced-motion"`
   and disable stage motion transitions in the DOM shell.
5. LLM-driven adaptive UI copy: a `useAdaptiveCopy(key)` Svelte store
   that returns different text based on inferred cognitive load. The
   inference is conservative (uses onboarding calibration results, not
   live LLM calls) — Veil-compliant.
6. Progressive enhancement: the menu shell renders as semantic HTML that
   works without JS. JS hydrates into the interactive app. If JS fails
   to load (bad connection, blocked CDN, old browser), the player can
   still read their Journal, browse the Codex, view their Profile —
   read-only, but functional.

**Acceptance criteria.**
- [ ] CapabilityProbe runs in <50ms on a low-end device.
- [ ] `data-input="tv"` mode shows 64px+ targets and 4-directional
      keyboard/gamepad navigation works on all menu routes.
- [ ] `prefers-reduced-motion: reduce` disables all stage motion
      transitions in both DOM shell and Phaser.
- [ ] Disabling JS in the browser still renders `/journal`, `/codex`,
      `/profile` as read-only HTML (SvelteKit SSR fallback).
- [ ] Lighthouse Accessibility score = 100 on `/`.

---

### Phase 3 — PWA + Cloud Sync + Deploy (1 week)

**Goal.** Ship to a public URL. Make it installable. Wire anonymous cloud
sync.

**Deliverables.**
1. `public/manifest.webmanifest` — name, icons (generate from a single
   SVG), theme color per stage (or stage-agnostic neutral), display
   `standalone`, orientation `portrait`.
2. `src/app/pwa/serviceWorker.ts` — Workbox-generated, precaches app
   shell, runtime-caches fonts and LLM responses.
3. `vite-plugin-pwa` integration in `vite.config.ts`.
4. `src/infra/persistence/CloudSyncStore.ts` — wraps the BFF
   `/api/save` endpoints. Strategy: write-through to LocalStorage
   (sync), debounced push to BFF (every 30s + on `session_ended`).
5. On first launch: generate `deviceId` (UUID), store in LocalStorage +
   Capacitor Preferences. Show recovery code once. On subsequent
   launches: silent.
6. Recovery flow: `/recover` route accepts code, fetches device-ID
   from BFF, restores save.
7. CI/CD: GitHub Actions → Cloudflare Pages on `main` push. Preview
   deploy on every PR.
8. Capacitor sync: `npm run cap:sync` builds the same Vite output for
   Android. Same codebase, same bundle.

**Acceptance criteria.**
- [ ] `play.mysterium.game` (or chosen URL) loads in <3s on 4G.
- [ ] Installable as PWA on Chrome / Safari / Edge.
- [ ] Save data syncs to cloud within 30s of any change.
- [ ] Recovery code restores save on a fresh device.
- [ ] Android APK builds and installs via `cap:android`.
- [ ] Lighthouse PWA score = 100.

---

### Phase 4 — Multi-platform Add-on (3–5 weeks, optional)

**Goal.** Ship to iOS App Store, Play Store, and desktop (Tauri).

**Week 1 — iOS.**
1. `npm install @capacitor/ios && npx cap add ios`.
2. Apple Developer account ($99/year).
3. Xcode build + TestFlight beta.
4. App Store submission: privacy policy (required because of telemetry),
   app review (expect 1–3 days).

**Week 2–3 — Tauri desktop.**
1. `npm install -D @tauri-apps/cli && npx tauri init`.
2. Configure `tauri.conf.json` — window size, icons, updater endpoint.
3. Build for Win/Mac/Linux. Test on each.
4. Code-signing certificates for Mac (Apple Developer) and Windows
   (SSL.com or similar, ~$200/year).
5. Auto-updater via Tauri's built-in updater + GitHub Releases.

**Week 4–5 — Store submissions + polish.**
1. Play Store listing: screenshots, feature graphic, privacy policy URL.
2. App Store listing: same + App Privacy disclosure.
3. Steam (if desired): Steamworks partner program ($100 one-time),
   Steam SDK integration, build upload via SteamPipe.
4. Itch.io: direct upload, no review process.

**Acceptance criteria.**
- [ ] iOS app installed via TestFlight on at least 3 test devices.
- [ ] Tauri desktop app builds and runs on Win/Mac/Linux.
- [ ] At least one store (Play or App Store) has the app live.

---

## 8. Critical Risks & Open Decisions

### 8.1 Risks

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | LLM API key leaks before Phase 0 ships | High | Critical | Phase 0 first. No public deploy before it. |
| R2 | Phaser ↔ React bridge feels janky (latency, focus, scroll) | Medium | High | Define bridge contract early. Test perceived latency <300ms. |
| R3 | Veil compliance slips in DOM-rendered UI | Medium | Critical | Extract `veilDescriptors.ts`. Add ESLint rule banning direct `sig.*` rendering. |
| R4 | Save schema migration breaks existing local saves | Medium | High | Add `validateSignificator` (already exists) to all load paths. Version-bump on schema change. |
| R5 | Phaser canvas doesn't resize correctly inside React route | High | Medium | Use Phaser Scale.RESIZE mode (not FIT) when embedded. Listen to ResizeObserver. |
| R6 | Bundle bloat from React + shadcn + Phaser | High | Medium | Code-split /play route. Tree-shake unused shadcn components. |
| R7 | Cloud sync conflicts (same account on two devices) | Medium | Medium | Last-write-wins on most fields; CCI recomputed from encounter history. |
| R8 | Worker 30s timeout on long LLM generations | Medium | Medium | Use chunked SSE. Document max generation length. |
| R9 | iOS App Store rejects for "game-like" content classification | Low | High | Submit as "Educational" not "Game" if classification issues arise. |
| R10 | Stage aesthetic system feels gimmicky / exhausting | Medium | Medium | Allow player to disable stage theming in Settings (accessibility). Default on, opt-out. |

### 8.2 Open decisions to lock before Phase 1 starts

These are decisions only the project owner can make. Lock them in writing
before code is written.

1. **Domain.** `mysterium.game`? `play.mysterium.dev`? Something else? Affects
   CORS, PWA manifest, recovery-code branding.
2. **Cloudflare vs Vercel vs Netlify.** All three work. Cloudflare has
   the most generous free tier + KV + Workers + Pages in one platform.
   Recommended: Cloudflare.
3. **LLM provider for production.** OpenAI? Anthropic? A multi-provider
   gateway (OpenRouter, OpenAI-compatible)? Affects BFF code shape.
4. **Save encryption.** The `CryptoStore` already exists. Should saves
   be end-to-end encrypted (server never sees plaintext) or
   server-visible (enables server-side analytics)? Recommend E2E for
   canon compliance.
5. **Account upgrade path.** Anonymous device-ID first, then upgrade to
   email/OAuth later? Or stay anonymous forever? Recommend: anonymous
   forever, with optional email binding for cross-device sync.
6. **Recovery code format.** 12-word BIP-39 mnemonic? 24-char base32?
   Custom? Recommend: 12-word mnemonic — well-understood, error-correcting,
   familiar from crypto wallets.
7. **Stage theming opt-out.** Default on with opt-out, or default off
   with opt-in? Recommend: default on, opt-out in Settings (with the
   existing `ReducedMotionGuard` extended to disable stage motion).
8. **Monetisation surface.** The README has a Razorpay link. Is there a
   donation flow in the game? A Patreon tie-in? A "pay-what-you-want"
   unlock? Decide before Settings UI ships.
9. **CLI future.** The CLI (`scripts/cli-game.ts`) coexists with the
   web game. Does it stay? Get deprecated? Become a dev-only tool?
   Recommend: keep as dev/admin tool, don't ship publicly.
10. **Telemetry transparency.** Per canon, players must know what's
    collected. Build a `/telemetry` route showing every event type with
    a sample payload — transparent by design.

---

## 9. Trajectory Comparison Matrix

A single-page comparison to help the choice land. Scores are 1–5 (5 = best).

| Trajectory | Visual ceiling | Time to ship | Infra cost | Canon-fit | Design-skill fit | Long-term flexibility | Migration risk |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| 1. Polish-and-Ship (Phaser-only) | 2 | 5 | 1 | 5 | 1 | 2 | 5 |
| **2. Hybrid DOM/Canvas** | **4** | **3** | **2** | **5** | **5** | **4** | **4** |
| 3. React-first (PixiJS) | 5 | 1 | 2 | 5 | 5 | 5 | 1 |
| 4. Next.js Full-Stack | 5 | 1 | 4 | 4 | 5 | 5 | 2 |
| 5. Authoritative Server | 3 | 1 | 5 | 3 | 3 | 5 | 2 |
| **6. Static PWA + BFF** | n/a* | **5** | **1** | **5** | n/a* | **5** | **5** |
| 7. Game Portal + Game | 5 | 2 | 3 | 5 | 5 | 4 | 4 |
| 8. Multi-platform | 4 | 2 | 3 | 5 | 4 | 4 | 3 |

\* Trajectory 6 is an infra pattern, composable with any visual trajectory.

**Composite score (visual + infra combined): Trajectory 2 + 6 = highest.**

---

## 10. Next Action

The trajectory is locked: **SvelteKit composite (Phases 0 → 2.5 → 3)**, with
Phase 4 (multi-platform) and Phase 5 (interactive visuals) deferred to
post-foundational verification. Implementation proceeds immediately — see
worklog at `/home/z/my-project/worklog.md` for live progress tracking.

Open decisions still pending (will lock during implementation as needed):

1. **Cloudflare as the BFF + hosting platform?** Default: yes (SvelteKit
   adapter-cloudflare, generous free tier).
2. **Production LLM provider?** Default: OpenRouter (multi-provider
   gateway, single API key, easy swap).
3. **Domain name?** Default: `mysterium.game` (pending availability).
4. **Recovery code format?** Default: 12-word BIP-39 mnemonic.
5. **Save encryption?** Default: E2E (server never sees plaintext).

---

## 11. Universality Layer — 7 Dimensions of Universal UX

Framework choice buys ~20% of universality. The other 80% is in design
decisions that are framework-independent. This section enumerates the
seven dimensions and where Mysterium needs work in each.

### The 7 dimensions

| # | Dimension | What it means for Mysterium | Current state | Levers |
|---|---|---|---|---|
| 1 | **Screen-size universal** | Plays on 320px phone, 1080p desktop, 4K TV, foldable | 🟡 Phaser FIT portrait handles canvas; DOM shell needs responsive work | Tailwind breakpoints + container queries; TV-specific 10ft UI mode |
| 2 | **Input-method universal** | Touch (finger/stylus), mouse, keyboard, gamepad, switch, voice | 🟡 Touch + mouse only | Gamepad API for TV/desktop; full keyboard nav for menus; switch-device support via AccessibilityManager extension |
| 3 | **Cognitive-load universal** | Works for a 7-year-old, a researcher, an elder — adaptive | 🟡 Onboarding is adaptive; menus are not | LLM-driven content rephrasing per inferred cognitive load; "simple mode" toggle that hides Codex / advanced Settings |
| 4 | **Connection universal** | Works on 4G, 3G, offline, flaky | ❌ No service worker yet | Phase 3 PWA + Workbox; offline-first LocalStorage with background sync; LLM fallback when offline |
| 5 | **Device-capability universal** | 5-year-old Android, high-end iPhone, low-end Chromebook | 🟡 Phaser AUTO (WebGL→canvas fallback) | CapabilityProbe: if WebGL2 unavailable, drop shader backdrops; if <2GB RAM, reduce particle counts |
| 6 | **Language universal** | i18n with RTL, CJK, accessibility in any locale | 🟡 I18n module exists, light | Extend `infra/i18n/I18n.ts` to full ICU MessageFormat; RTL flip for Arabic/Hebrew; the `ui-styling/canvas-fonts/` already has CJK-friendly options |
| 7 | **Ability universal** | WCAG 2.2 AA, screen reader, keyboard nav, reduced motion, colorblind-safe | 🟡 AccessibilityManager exists but Phaser-only | Extend a11y layer to DOM shell; high-contrast theme per stage; colorblind-safe palette alternates; full keyboard nav in menus |

### The 4 high-leverage universality moves (framework-independent)

These are the moves that actually make Mysterium feel universal, regardless of
SvelteKit vs React vs Next.js:

**Move A — Capability detection layer.** `src/lib/capabilities/CapabilityProbe.ts`
runs at boot, reports WebGL version, device memory, CPU cores, connection
type, input methods, screen size, orientation, prefers-reduced-motion,
prefers-contrast, prefers-color-scheme. The game reads this and degrades
gracefully — shader backdrops off on weak GPUs, no motion on reduced-motion,
larger touch targets on coarse pointers. Implemented in Phase 2.5.

**Move B — Adaptive content via LLM.** This is canon-friendly and uniquely
possible because the game already has an LLM. The LLM doesn't just generate
encounter content — it *rephrases* UI text based on inferred cognitive load.
A 7-year-old sees "Tap to begin." A researcher sees "Initialize baseline
calibration." Same button, different copy. The Veil is preserved; the
accessibility is multiplied. Implemented in Phase 2.5 (conservative version
using onboarding calibration results, not live LLM calls).

**Move C — 10-foot UI mode for TV/console.** A `data-input="touch|mouse|gamepad|tv"`
attribute on `<html>`, set by CapabilityProbe. The `tv` mode enlarges all
touch targets to ≥64px, simplifies navigation to 4-directional + select, and
uses a high-contrast variant of the stage theme. This is how you eventually
ship to Apple TV / Android TV / Xbox web browser without a separate
codebase. Implemented in Phase 2.5.

**Move D — Progressive enhancement.** The menu shell renders as semantic
HTML that works without JS. JS hydrates into the interactive app. If JS
fails to load (bad connection, blocked CDN, old browser), the player can
still read their Journal, browse the Codex, view their Profile — read-only,
but functional. This is the difference between "online game" and "universally
accessible online game." SvelteKit SSR provides this by default. Implemented
in Phase 2.5.

---

## 12. Far-Future Interactive Visuals (Phase 5, deferred)

Per user direction, interactive visuals are deferred to far-later stages
of game development, triggered once the foundational game is tested and
verified. This section documents the plan so it is not lost.

**Trigger condition.** Phase 5 begins only after:
- Phases 0 → 3 are shipped and stable in production for ≥4 weeks
- The full test suite passes with no regressions
- At least 10 real players have completed onboarding + 5 encounters each
- Telemetry shows the universality layer is working (no device-class
  concentration >60%)

**Scope of Phase 5.**
1. **GLSL shader backdrops per stage** (`src/game/backdrops/StageBackdrop.ts`):
   - Infrared: ember-flicker noise shader on dark charcoal
   - Magenta: spectral drift shader with ghosting trails
   - Red: iron-grate parallax with blood-pulse accent
   - Amber: stained-glass light refraction with chime-synced ripples
   - Orange: mechanism-tick shader with rotating gear silhouettes
   - Green: organic-growth shader with vine-unfurling
   - Turquoise: crystal-refraction shader with ice-shimmer
   - White: luminous-dissolve shader with breath-synced alpha

2. **Particle systems for encounter moments** (`src/game/particles/`):
   - Catalyst ignition burst (player commits to encounter)
   - Integration settling dust (post-encounter reflection)
   - Transformation threshold aurora (stage-transition moment)
   - Veil-thinning mist (when LLM is generating)

3. **Post-processing filters** (`src/game/effects/`):
   - Bloom on accent colours (per stage palette)
   - Chromatic aberration during cognitive-task stimuli (N-back, Stroop)
   - Vignette intensification during shadow-surfaced moments
   - Depth-of-field shift during reflection scenes

4. **Procedural Web Audio ambiance** (`src/lib/audio/stageAmbiance.ts`):
   - Per-stage drone synthesizer (oscillator + filter + LFO)
   - Encounter stinger one-shots (procedurally generated, not sampled)
   - Cross-fade on stage transition (3-second linear fade)
   - Reduced-motion mode: silence (per accessibility canon)

**Architecture principle.** All Phase 5 work lives in `src/game/effects/`
and `src/lib/audio/`. It NEVER touches the DOM shell. The shell remains a
fast, accessible, semantic-HTML surface. The canvas becomes progressively
richer. This is exactly how games like *Cultist Simulator* and *Inscryption*
evolved — DOM menus, canvas gameplay, polish layered on over years.

**YAGNI discipline.** Phase 5 features are built only when the foundational
game's telemetry indicates they would meaningfully improve the catalyst →
experience → integration loop. If the foundational game works without
them, they stay unbuilt. The architecture (separate `effects/` directory,
capability-detection gating) ensures they can be added later without
rewrites.

---

*End of plan v2. Trajectory locked. Implementation proceeding — see
`/home/z/my-project/worklog.md` for live progress.*
