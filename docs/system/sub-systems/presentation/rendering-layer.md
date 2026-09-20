# Rendering Layer Architecture

> **Cross-references:** [[docs/foundations/20-veil-of-forgetting|20 — Veil Of Forgetting]]

## 1. Purpose

Describes the rendering surfaces of Mysterium — SvelteKit WebUI, CLI, and Capacitor native bridge. The rendering layer consumes the core via the infra layer and presents the contemplative practice to the player.

## 2. Scientific basis

- **Veil of Forgetting** — all rendering must hide the engine
- **Qualitative feedback** — felt-sense indicators replace clinical metrics
- **Adaptive rendering** — CapabilityProbe detects input method, motion preference, connection quality

## 3. Game-design mapping

### CLI (First-Class Surface)

`scripts/cli-game.ts` is the primary game surface, not a debug tool:
- Full encounter loop with assessment modules
- Qualitative descriptors ("clean", "tight", "loose", "fumbled")
- Embodied pause protocol (5s breath cue)
- Catalyst mode (LLM pushes back on intellectualizing)
- Integration ritual at session end
- `--dev` flag for engineering metrics

### SvelteKit WebUI

`src/routes/` — 8 routes:
- `/` — menu hub
- `/play` — mounts Phaser for gameplay
- `/profile` — radial altitude chart
- `/journal` — encounter history
- `/codex` — glossary and terms
- `/settings` — configuration
- `/recover` — save recovery
- `/telemetry` — opt-in telemetry

### Design Tokens

`src/styles/tokens.css` — 8 stage themes with:
- `--mysterium-bg`, `--mysterium-fg` — background/foreground
- `--mysterium-accent` — stage-specific accent color
- `--mysterium-font-display`, `--mysterium-font-body` — typography
- `--mysterium-motion` — animation duration
- `--mysterium-radius-sm`, `--mysterium-radius-lg` — border radius

### Capability Probe

`src/lib/capabilities/CapabilityProbe.ts` detects:
- Input method (touch, mouse, gamepad, TV)
- Motion preference (full, reduced)
- Contrast preference (normal, more)
- Connection quality (4g, 3g, 2g, slow-2g)
- WebGL support (none, 1, 2)

Writes 6 `data-*` attributes on `<html>` for CSS adaptation.

### Component Library

Currently minimal (5 components):
- `BackButton.svelte` — navigation
- `VeiledStat.svelte` — qualitative descriptor display
- `PhaserGameClient.svelte` — Phaser mount point
- `StageTheme.svelte` — sets `data-stage` on `<html>`
- `Seo.svelte` — meta tags

### Capacitor (Native Bridge)

`capacitor.config.json` — Android + iOS:
- Android back button handling
- Splash screen
- No native plugins yet (camera, haptics, push notifications deferred)

## 4. Architectural contract

- `src/routes/` — SvelteKit routes (DOM rendering)
- `src/game/` — Phaser scenes (canvas rendering)
- `scripts/cli-game.ts` — CLI (terminal rendering)
- `src/styles/` — CSS design tokens
- `src/lib/components/` — shared Svelte components

## 5. Open questions

- **Phaser migration** — 53% of Phaser code is dead; migration to SvelteKit incomplete
- **Component library** — missing Button, Card, Modal, Toggle primitives
- **Responsive design** — only 3 media queries in entire Svelte layer
- **i18n** — all strings English-only, no localization framework

## 6. Principles served

Principles **5, 7** — UX clarity, codebase honesty.
