# Mysterium Svelte Frontend Audit — The Missing Web App

> **Date:** 2026-07-09
> **Severity:** CRITICAL — architectural gap between promise and delivery
> **Trigger:** User loaded localhost:5173 and saw a phone-shaped letterboxed Phaser game, not the cross-device Svelte web app they expected

---

## 0. Executive Summary

**The Svelte web app was never built. What exists is a Phaser mobile game wrapped in a thin Svelte shell.**

The `Mysterium-FRONTEND-ARCHITECTURE-PLAN.md` promised a "SvelteKit + Phaser hybrid" where 10 of 14 Phaser scenes would be migrated to Svelte routes, leaving Phaser as only the gameplay canvas. The worklog claims "Phase 1 COMPLETE" but only **1 scene** (SettingsScene → `/settings`) was actually migrated. The root route `/` and `/play` still boot the full Phaser game — a phone-portrait (1080×1920) canvas that renders as a narrow letterboxed strip on desktop.

**The user's experience:** Open `localhost:5173` on a desktop browser → see a tall, narrow phone-shaped game canvas centered on a black screen. This is not a "web app optimized for all devices."

---

## 1. The Promise — What the Architecture Plan Says

Source: `Mysterium-FRONTEND-ARCHITECTURE-PLAN.md` §6 and §7

### Phase 1: SvelteKit Shell + Phaser Bridge (3 weeks)

> "Stand up the SvelteKit DOM shell, **migrate 10 of 14 Phaser scenes to Svelte routes**, embed Phaser as a Svelte component on `/play`, wire the EventBus ↔ Svelte store bridge."

The plan explicitly lists which scenes migrate and which stay in Phaser:

| Scene → Svelte Route | Status |
|---|---|
| MainMenuScene → `src/routes/+page.svelte` (`/`) | ❌ **NOT MIGRATED** — still boots Phaser |
| OnboardingScene → `src/routes/onboarding/+page.svelte` | ❌ **NOT MIGRATED** — still in Phaser |
| RadialChartScene → `src/routes/profile/+page.svelte` | ❌ **NOT MIGRATED** — still in Phaser |
| CodexScene → `src/routes/codex/+page.svelte` | ❌ **NOT MIGRATED** — still in Phaser |
| JournalScene → `src/routes/journal/+page.svelte` | ❌ **NOT MIGRATED** — still in Phaser |
| SettingsScene → `src/routes/settings/+page.svelte` | ✅ MIGRATED |
| EncounterSelectionScene → `src/routes/encounters/+page.svelte` | ❌ **NOT MIGRATED** — still in Phaser |
| ReflectionScene → `src/routes/reflect/[encounterId]/+page.svelte` | ❌ **NOT MIGRATED** — still in Phaser |
| BootScene + PreloaderScene → Svelte loaders | ❌ **NOT MIGRATED** — still in Phaser |
| EncounterScene, UIOverlayScene, AssessmentScene, WorldScene | ℹ️ Stays in Phaser (gameplay surface) |

**Plan said 10 migrations. Only 1 was done.**

### The Plan's Vision for Desktop

> "Desktop 120fps, <5MB, <2s on broadband. Higher-quality shaders, audio."

> "Adaptive onboarding for any age, any altitude. Onboarding must work on a 7-year-old's phone and a researcher's desktop."

> "Responsive layouts: mobile-first design with breakpoints for tablet/desktop"

---

## 2. The Delivery — What Actually Exists

### 2.1 The Phaser Config (the root cause)

```ts
// src/game/config.ts
export const VIEWPORT = { width: 1080, height: 1920 } as const;
// ↑ Portrait 9:16 — hardcoded for phone screens

scale: {
  mode: Phaser.Scale.FIT,      // Fits within container, maintains aspect ratio
  autoCenter: Phaser.Scale.CENTER_BOTH,  // Centers in viewport
  width: VIEWPORT.width,       // 1080
  height: VIEWPORT.height,     // 1920
}
```

**On desktop (1920×1080 viewport):** Phaser renders a 1080×1920 canvas and scales it down to fit. The result is a tall, narrow phone-shaped window (~300px wide) centered on screen with black bars on both sides.

### 2.2 The Route Tree

| Route | What it renders | Svelte-native? |
|---|---|---|
| `/` (root) | `<PhaserGameClient />` — full Phaser game | ❌ No — it's Phaser |
| `/play` | `<PhaserGameClient />` + thin HUD overlay | ❌ No — it's Phaser + Svelte HUD |
| `/settings` | Toggle switches, forms, modals | ✅ **Yes** — proper Svelte |
| `/recover` | 12-word mnemonic input grid | ✅ **Yes** — proper Svelte |
| `/telemetry` | Data collection transparency page | ✅ **Yes** — proper Svelte |
| `/api/*` | Server endpoints (LLM proxy, save, recovery) | ✅ Server-side |

### 2.3 What the User Sees on Desktop

1. **Root `/`:** A phone-shaped Phaser canvas (~300px wide) centered on a black background. The MainMenuScene renders inside it. No navigation to Svelte routes. No desktop-optimized layout. No responsive design.

2. **`/settings`:** A beautiful, properly responsive Svelte page with toggle switches, section headers, and a reset modal. This is what the ENTIRE app should look like.

3. **The dissonance:** The settings page demonstrates that the Svelte shell works perfectly — responsive, accessible, stage-themed. But it's an island. The rest of the app is still Phaser.

### 2.4 The Phaser Game Inside

All gameplay UI is rendered via Phaser primitives:
- `add.rectangle()` for backgrounds and cards
- `add.text()` for all text
- `add.tween()` for animations
- Custom `Button.ts` factory for interactive elements
- Assessment renderers (8 types) all drawn from canvas primitives
- No HTML/CSS anywhere in the gameplay surface

---

## 3. The Dissonance — Point by Point

### 3.1 "SvelteKit Shell" → Thin Phaser Wrapper

**Promise:** "SvelteKit replaces Vite as the meta-framework... the DOM shell uses shadcn-svelte + Tailwind v4"

**Reality:** The SvelteKit shell exists but contains almost nothing. The root route is just `<PhaserGameClient />`. There is no shadcn-svelte. There is no Tailwind. The only Svelte-native pages are `/settings`, `/recover`, and `/telemetry` — utility pages, not the main experience.

### 3.2 "Migrate 10 of 14 Scenes" → Migrated 1

**Promise:** Phase 1 explicitly lists 10 scene→route migrations.

**Reality:** Only SettingsScene → `/settings` was migrated. The worklog states "Phase 1 COMPLETE — /play and /settings routes work" but /play still boots Phaser.

### 3.3 "Desktop 120fps" → Phone Canvas on Desktop

**Promise:** Desktop as a first-class target with higher performance.

**Reality:** The game renders at 1080×1920 (phone portrait) on every device. On desktop, this appears as a narrow letterboxed strip. There is no desktop-optimized layout, no widescreen mode, no responsive canvas.

### 3.4 "Adaptive Onboarding for Any Age, Any Altitude" → Phone-Only Onboarding

**Promise:** Onboarding must work on a 7-year-old's phone and a researcher's desktop.

**Reality:** Onboarding is a Phaser scene (`OnboardingScene.ts`) rendered at 1080×1920. On desktop, the researcher sees the same phone-sized interface as the 7-year-old. No adaptation.

### 3.5 "Responsive Layouts" → Fixed 9:16

**Promise:** "Responsive layouts: mobile-first design with breakpoints for tablet/desktop"

**Reality:** The Phaser viewport is fixed at 1080×1920. `Scale.FIT` maintains this ratio on every screen. There are no breakpoints for the game canvas. The only responsive elements are in the Svelte utility pages (`/settings`, `/recover`).

### 3.6 "CapabilityProbe for Cross-Device" → Probe Exists, Nothing Reads It

**Promise:** "CapabilityProbe runs at boot, detects... input methods, screen size, orientation... sets data-input/tv/gamepad attributes"

**Reality:** The CapabilityProbe exists and correctly sets `data-*` attributes on `<html>`. But the Phaser game doesn't read these attributes. The game config is hardcoded. The only consumers are the CSS in `capabilities.css` (touch target sizes, reduced motion) — minor cosmetic adjustments, not the fundamental layout adaptation the user expects.

### 3.7 "Phaser as One Route, Not the Whole App" → Phaser IS the App

**Promise:** "The 4 scenes that stay in Phaser are the gameplay surface — the parts where Phaser's input manager, tween engine, and timing precision matter. Everything menu-shaped moves to Svelte."

**Reality:** ALL menu surfaces are still Phaser:
- MainMenuScene (navigation, profile, world map) → Phaser
- OnboardingScene (multi-step assessment) → Phaser
- CodexScene (lore browser) → Phaser
- JournalScene (player record) → Phaser
- RadialChartScene (profile chart) → Phaser
- EncounterSelectionScene (choose encounter) → Phaser
- ReflectionScene (post-encounter) → Phaser

---

## 4. Root Cause Analysis

### 4.1 Phase 1 Was Marked Complete Prematurely

The worklog entry for Phase 1 states:

> "Task: Phase 1 — SvelteKit shell + Phaser bridge"
> "Created src/lib/stores/gameStore.ts, phaserEventAdapter.ts, PhaserGameClient.svelte"
> "Created /play route with minimal HUD overlay"
> "Created /settings route — PROOF-OF-PATTERN for scene migration"
> "**Stage Summary:** Bridge infrastructure complete... Remaining scene migrations follow the same pattern"

The proof-of-pattern (`/settings`) was created and works. But "remaining scene migrations follow the same pattern" was never executed. Phase 1 was marked complete with 1 of 10 migrations done.

### 4.2 The Phaser Config Was Never Updated for Desktop

The `VIEWPORT = { width: 1080, height: 1920 }` constant was never modified or made responsive. The plan's §8.1 Risk R5 explicitly flagged this:

> "R5: Phaser canvas doesn't resize correctly inside React route → Use Phaser Scale.RESIZE mode (not FIT) when embedded. Listen to ResizeObserver."

This risk was identified but never mitigated.

### 4.3 The Svelte Shell Became a Frame, Not a Foundation

The architecture intended the Svelte shell to be the foundation with Phaser as one embedded component. Instead, the Svelte shell became a frame that wraps the Phaser game. The game boots and controls the entire viewport. Svelte only surfaces on utility pages that don't touch the game.

### 4.4 No Tailwind, No shadcn-svelte, No Design System Integration

The plan called for "shadcn-svelte + Tailwind v4 + the included font catalogue." The reality:
- No Tailwind installed
- No shadcn-svelte installed
- Fonts exist in `static/fonts/` but only loaded via `@font-face` in `fonts.css`
- The design tokens exist (`tokens.css`) but are consumed by the 3 Svelte utility pages and Phaser (which mostly ignores them)
- The 8-stage aesthetic system (§5.1 of the plan) is implemented in CSS tokens but only visible on `/settings`

---

## 5. The User's Perspective

When the user opens `localhost:5173` on a desktop browser:

1. **Expectation:** A responsive web app that fills the viewport, adapts to desktop, has Svelte-native navigation, settings, journal, codex — with Phaser only for the gameplay encounter itself.

2. **Reality:** A phone-shaped game canvas (narrow, tall, centered) with Phaser's MainMenuScene inside it. Black bars on both sides. No desktop adaptation. No Svelte navigation shell. No way to access settings/journal/codex without clicking through the Phaser game's own menus.

3. **The Svelte pages exist** (`/settings`, `/recover`, `/telemetry`) but are unreachable from the main game flow without manually typing the URL. The Phaser game doesn't link to them.

---

## 6. What Was Actually Built (Credit Where Due)

The infrastructure work IS solid:
- ✅ SvelteKit migration (Phase 0) — zero regressions
- ✅ BFF endpoints (LLM proxy, save, recovery, telemetry)
- ✅ ProxiedLLMClient (API key no longer exposed)
- ✅ Design tokens system (`tokens.css` with 8 stage themes)
- ✅ Font loading (16 fonts from `ui-styling/canvas-fonts/`)
- ✅ VeiledStat component (Veil-compliant rendering)
- ✅ StageTheme component (data-stage on <html>)
- ✅ CapabilityProbe (input, motion, contrast, connection detection)
- ✅ PWA manifest + service worker
- ✅ Three fully functional Svelte pages: `/settings`, `/recover`, `/telemetry`
- ✅ PhaserGameClient component (mount/unmount lifecycle)
- ✅ EventBus ↔ gameStore bridge
- ✅ Custom error page (`+error.svelte`)

**The foundation is built. The house was never constructed on top of it.**

---

## 7. Gap Analysis: Plan vs Reality

| Plan Deliverable | Status | Gap |
|---|---|---|
| SvelteKit migration | ✅ Done | — |
| BFF endpoints | ✅ Done | — |
| MainMenuScene → Svelte `/` | ❌ Not done | Root route still boots Phaser |
| OnboardingScene → Svelte | ❌ Not done | Still a Phaser scene |
| RadialChartScene → Svelte | ❌ Not done | Still a Phaser scene |
| CodexScene → Svelte | ❌ Not done | Still a Phaser scene |
| JournalScene → Svelte | ❌ Not done | Still a Phaser scene |
| EncounterSelectionScene → Svelte | ❌ Not done | Still a Phaser scene |
| ReflectionScene → Svelte | ❌ Not done | Still a Phaser scene |
| BootScene → Svelte loader | ❌ Not done | Still a Phaser scene |
| DilemmaScene → stays in Phaser | ✅ Correct | — |
| Phaser on `/play` only (lazy-loaded) | ⚠️ Partial | Boots on both `/` and `/play` |
| EventBus ↔ Svelte store bridge | ✅ Done | — |
| shadcn-svelte + Tailwind v4 | ❌ Not done | Not installed |
| 8-stage token system | ✅ Done | Only visible on `/settings` |
| CapabilityProbe | ✅ Done | Phaser doesn't read it |
| Desktop-optimized layout | ❌ Not done | Fixed 1080×1920 portrait |
| Responsive canvas (Scale.RESIZE) | ❌ Not done | Still Scale.FIT |
| Lazy Phaser load (only on /play) | ❌ Not done | Boots on root `/` |
| Design tokens in Phaser | ⚠️ Minimal | Phaser mostly ignores CSS vars |
| VeiledStat for DOM rendering | ✅ Done | Only used on `/settings` |
| PWA + service worker | ✅ Done | — |
| Cloud sync | ❌ Not done | Save endpoints exist, no client sync |
| Anonymous device-ID | ❌ Not done | — |
| Recovery code flow | ✅ Done (UI) | `/recover` works |

**Completion: ~40% of Phase 1, 0% of Phase 1's scene migrations beyond the proof-of-pattern.**

---

## 8. The Distortion Map

```
PLAN                                    REALITY
────                                    ───────
SvelteKit DOM shell                    Phaser game with Svelte wrapper
├── MainMenu (Svelte)                  ├── MainMenu (Phaser) ← STILL PHASER
├── Onboarding (Svelte)                ├── Onboarding (Phaser) ← STILL PHASER
├── Profile/RadialChart (Svelte)       ├── RadialChart (Phaser) ← STILL PHASER
├── Codex (Svelte)                     ├── Codex (Phaser) ← STILL PHASER
├── Journal (Svelte)                   ├── Journal (Phaser) ← STILL PHASER
├── Settings (Svelte) ← DONE          ├── Settings (Phaser) ← Svelte REPLACED
├── Encounters (Svelte)                ├── EncounterSelection (Phaser) ← STILL PHASER
├── Reflection (Svelte)                ├── Reflection (Phaser) ← STILL PHASER
│                                      │
│   Phaser on /play only:              │   Phaser on EVERYTHING:
│   ├── EncounterScene                 │   ├── EncounterScene
│   ├── UIOverlayScene                 │   ├── UIOverlayScene
│   ├── AssessmentScene                │   ├── AssessmentScene
│   └── WorldScene                     │   ├── WorldScene
│                                      │   ├── MainMenuScene ← SHOULD BE SVELTE
│                                      │   ├── OnboardingScene ← SHOULD BE SVELTE
│                                      │   └── ... (10 more scenes)
│                                      │
│   Responsive canvas:                 │   Fixed 1080×1920:
│   ├── Scale.RESIZE on desktop        │   ├── Scale.FIT everywhere
│   ├── Breakpoints per device         │   └── Phone canvas on desktop
│   └── Widescreen desktop mode        │
│                                      │
│   shadcn-svelte + Tailwind:          │   Raw CSS only:
│   ├── Component library              │   ├── No Tailwind installed
│   ├── Utility-first styling          │   └── No component library
│   └── Professional UI kit            │
```

---

## 9. What the User Actually Asked For

> "Deploy this to dev server so that I can test the webui"
> "Is this the latest svelte frontend?"
> "I am seeing a mobile like screen with a fucked up ui on 5173"
> "Where the fuck is the svelte frontend that I developed?"
> "The game was supposed to be on the svelte frontend optimized for web-app across all devices, not just phone"

**The user expected:** A Svelte web application that works like a modern web app — responsive, adaptive, desktop-friendly — with Phaser as an embedded gameplay component.

**The user got:** A Phaser mobile game (1080×1920 portrait) with a thin Svelte frame around it.

---

## 10. Recommended Remediation

### Priority 1: Make the Phaser game responsive (1-2 days)

Change `src/game/config.ts`:
- Use `Phaser.Scale.RESIZE` instead of `Phaser.Scale.FIT`
- Make `VIEWPORT` dynamic based on `window.innerWidth/Height`
- Add a `ResizeObserver` on the container div
- This alone would make the game fill the desktop viewport

### Priority 2: Make `/` a Svelte landing page, not a Phaser boot (1 day)

- Create a proper Svelte `+page.svelte` for `/` with navigation to `/play`, `/settings`, `/recover`
- Move Phaser boot to `/play` only (lazy-load the Phaser bundle)
- Add a navigation shell (header/nav bar) visible on all routes

### Priority 3: Migrate the remaining 8 scenes (2-3 weeks)

Per the original Phase 1 plan, migrate:
1. MainMenuScene → Svelte `/` (landing + navigation)
2. OnboardingScene → Svelte `/onboarding`
3. CodexScene → Svelte `/codex`
4. JournalScene → Svelte `/journal`
5. RadialChartScene → Svelte `/profile`
6. EncounterSelectionScene → Svelte `/encounters`
7. ReflectionScene → Svelte `/reflect/[id]`
8. BootScene + PreloaderScene → Svelte loading states

### Priority 4: Install shadcn-svelte + Tailwind (1 day)

Per the plan, these were supposed to be part of Phase 1 Week 1.

---

## 11. Conclusion

The Svelte frontend development stalled at "proof of pattern." The infrastructure (SvelteKit, BFF, tokens, CapabilityProbe, PWA) was built correctly and completely. But the core promise — migrating Phaser scenes to Svelte routes — was never executed. The result is a mobile-first Phaser game wearing a Svelte shell that only shows on utility pages.

**The user is right to be frustrated.** The architecture plan was clear and well-designed. The execution stopped after the foundation and never built the house.

---

*End of audit. No code changes were made — this is a read-only analysis.*
