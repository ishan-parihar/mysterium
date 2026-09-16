<script lang="ts">
  /**
   * Root page (/) — the main menu hub.
   *
   * Pure-Svelte entry point. Links to all routes:
   *   /play        → Svelte gameplay engine (world, encounter, reflection)
   *   /profile     → Developmental profile (8-line radar)
   *   /journal     → Journal (codex entries + vows)
   *   /codex       → Codex (unlocked knowledge)
   *   /settings    → Settings (a11y, privacy, reset)
   *   /recover     → Save recovery via 12-word mnemonic
   *   /telemetry   → Telemetry transparency
   *
   * If no Significator exists, redirects to /onboarding.
   *
   * Veil compliance: all stats use veilDescriptors (no raw numbers/labels).
   */

  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { browser } from '$app/environment';
  import Seo from '$lib/components/Seo.svelte';
  import VeiledStat from '$lib/components/VeiledStat.svelte';
  import Card from '$lib/components/Card.svelte';
  import Stack from '$lib/components/Stack.svelte';
  import Icon from '$lib/components/Icon.svelte';
  import { gameStore } from '$lib/stores/gameStore.js';
  import { loadSignificatorFromStorage } from '$lib/stores/saveHydration.js';
  import { setSignificator } from '$lib/stores/gameStore.js';
  import { describeSignificator } from '$core/presentation/veilDescriptors.js';
  import { stageFade, stageFly } from '$lib/transitions/stageMotion.js';

  const sig = $derived($gameStore.significator);
  const descriptors = $derived(sig ? describeSignificator(sig) : null);

  onMount(() => {
    if (!browser) return;
    if (!$gameStore.significator) {
      const loaded = loadSignificatorFromStorage();
      if (loaded) {
        setSignificator(loaded);
      } else {
        goto('/onboarding');
      }
    }
  });

  interface NavItem {
    readonly href: string;
    readonly label: string;
    readonly desc: string;
    readonly variant: 'primary' | 'default' | 'muted';
    readonly icon: 'play' | 'user' | 'book' | 'settings' | 'recover' | 'info';
  }

  const navItems: NavItem[] = [
    { href: '/play', label: 'Continue', desc: 'Enter the world', variant: 'primary', icon: 'play' },
    { href: '/profile', label: 'Developmental Profile', desc: 'Your 8-line developmental shape', variant: 'default', icon: 'user' },
    { href: '/journal', label: 'Journal', desc: 'Codex entries and vows', variant: 'default', icon: 'book' },
    { href: '/codex', label: 'Codex', desc: 'Unlocked knowledge', variant: 'default', icon: 'book' },
    { href: '/settings', label: 'Settings', desc: 'Accessibility, privacy, data', variant: 'muted', icon: 'settings' },
  ];

  const secondaryItems: NavItem[] = [
    { href: '/recover', label: 'Recover Save', desc: 'Restore on a new device', variant: 'muted', icon: 'recover' },
    { href: '/telemetry', label: 'Telemetry', desc: 'What data is collected', variant: 'muted', icon: 'info' },
  ];
</script>

<Seo
  title="Cognitive Combat"
  description="A Mysterium where every gameplay verb is a gamified developmental assessment across 8 lines of intelligence × 8 stages of consciousness."
/>

<div class="menu-route" in:stageFade={{ duration: 500 }}>
  <div class="menu-content">
    <header class="menu-header" in:stageFly={{ y: 20, duration: 500 }}>
      <h1 class="menu-title">Mysterium</h1>
      <p class="menu-subtitle">Cognitive Combat RPG</p>
    </header>

    {#if descriptors}
      <div in:stageFly={{ y: 20, delay: 150, duration: 500 }}>
        <Card variant="accent" padding="space-5" class="profile-card">
          <Stack gap="space-3">
            <VeiledStat descriptor={descriptors.stageAesthetic} label="The World" variant="accent" />
            <VeiledStat descriptor={descriptors.driveDescriptor} label="Tendencies" variant="muted" />
            <VeiledStat descriptor={descriptors.encounterDescriptor} label="Path" variant="muted" />
            <VeiledStat descriptor={descriptors.sessionDescriptor} label="Presence" variant="muted" />
          </Stack>
        </Card>
      </div>
    {:else}
      <div in:stageFly={{ y: 20, delay: 150, duration: 500 }}>
        <Card padding="space-5" class="profile-card">
          <p class="no-save">No save found. Enter the world to begin.</p>
        </Card>
      </div>
    {/if}

    <nav class="nav-list" aria-label="Main navigation">
      {#each navItems as item, i (item.href)}
        <a
          class="nav-item nav-{item.variant}"
          href={item.href}
          in:stageFly={{ y: 24, delay: 300 + i * 80, duration: 400 }}
        >
          <span class="nav-icon" aria-hidden="true">
            <Icon name={item.icon} size={20} />
          </span>
          <span class="nav-text">
            <span class="nav-label">{item.label}</span>
            <span class="nav-desc">{item.desc}</span>
          </span>
          <span class="nav-arrow" aria-hidden="true"><Icon name="arrow-right" size={18} /></span>
        </a>
      {/each}
    </nav>

    <nav class="nav-list secondary" aria-label="Secondary navigation">
      {#each secondaryItems as item, i (item.href)}
        <a
          class="nav-item nav-{item.variant}"
          href={item.href}
          in:stageFly={{ y: 16, delay: 700 + i * 60, duration: 350 }}
        >
          <span class="nav-icon" aria-hidden="true">
            <Icon name={item.icon} size={18} />
          </span>
          <span class="nav-text">
            <span class="nav-label">{item.label}</span>
          </span>
          <span class="nav-arrow" aria-hidden="true"><Icon name="arrow-right" size={16} /></span>
        </a>
      {/each}
    </nav>
  </div>
</div>

<style>
  .menu-route {
    min-height: 100vh;
    min-height: 100dvh;
    background: var(--mysterium-bg);
    color: var(--mysterium-fg);
    font-family: var(--mysterium-font-body);
    padding: var(--mysterium-route-padding);
    padding-top: var(--mysterium-route-padding-top);
    padding-bottom: calc(var(--mysterium-route-padding-bottom) + var(--mysterium-nav-height));
    overflow-y: auto;
    touch-action: pan-y;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--mysterium-space-5);
  }

  .menu-content {
    width: 100%;
    max-width: var(--mysterium-content-max-width);
    display: flex;
    flex-direction: column;
    gap: var(--mysterium-space-5);
  }

  .menu-header {
    text-align: center;
  }

  .menu-title {
    font-family: var(--mysterium-font-display);
    font-size: var(--mysterium-text-3xl);
    font-weight: 700;
    color: var(--mysterium-fg);
    letter-spacing: var(--mysterium-tracking-wider);
    margin: 0;
    line-height: 1;
  }

  .menu-subtitle {
    font-family: var(--mysterium-font-body);
    font-size: var(--mysterium-text-sm);
    color: var(--mysterium-accent);
    letter-spacing: var(--mysterium-tracking-widest);
    text-transform: uppercase;
    margin: var(--mysterium-space-1) 0 0 0;
  }

  .profile-card {
    width: 100%;
  }

  .no-save {
    color: var(--mysterium-fg-muted);
    font-style: italic;
    margin: 0;
    text-align: center;
  }

  .nav-list {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: var(--mysterium-space-2);
  }

  .nav-list.secondary {
    max-width: 400px;
    margin: 0 auto;
  }

  .nav-item {
    display: flex;
    align-items: center;
    gap: var(--mysterium-space-3);
    padding: var(--mysterium-space-4) var(--mysterium-space-5);
    background: var(--mysterium-surface);
    border: 1px solid var(--mysterium-border);
    border-radius: var(--mysterium-radius-lg);
    text-decoration: none;
    color: var(--mysterium-fg);
    font-family: var(--mysterium-font-body);
    transition: background var(--mysterium-duration-fast) var(--mysterium-ease),
                border-color var(--mysterium-duration-fast) var(--mysterium-ease),
                transform var(--mysterium-duration-instant) var(--mysterium-ease),
                box-shadow var(--mysterium-duration-fast) var(--mysterium-ease);
    -webkit-tap-highlight-color: transparent;
  }

  .nav-item:hover {
    background: var(--mysterium-surface-elevated);
    border-color: var(--mysterium-accent);
    box-shadow: var(--mysterium-shadow-sm);
  }

  .nav-item:active {
    transform: scale(0.99);
  }

  .nav-item:focus-visible {
    outline: 2px solid var(--mysterium-accent);
    outline-offset: 2px;
  }

  .nav-primary {
    background: var(--mysterium-accent);
    border-color: var(--mysterium-accent);
    color: var(--mysterium-accent-fg);
  }

  .nav-primary:hover {
    background: var(--mysterium-accent-soft);
    border-color: var(--mysterium-accent);
    box-shadow: var(--mysterium-shadow-glow);
  }

  .nav-muted {
    background: transparent;
    border-color: transparent;
    padding: var(--mysterium-space-3) var(--mysterium-space-5);
  }

  .nav-muted:hover {
    background: var(--mysterium-surface);
    border-color: var(--mysterium-border);
  }

  .nav-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    color: var(--mysterium-fg-muted);
  }

  .nav-primary .nav-icon {
    color: var(--mysterium-accent-fg);
  }

  .nav-text {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .nav-label {
    font-size: var(--mysterium-text-base);
    font-weight: 500;
  }

  .nav-desc {
    font-size: var(--mysterium-text-sm);
    color: var(--mysterium-fg-muted);
  }

  .nav-primary .nav-desc {
    color: color-mix(in srgb, var(--mysterium-accent-fg) 80%, transparent);
  }

  .nav-muted .nav-desc {
    display: none;
  }

  .nav-arrow {
    flex-shrink: 0;
    color: var(--mysterium-fg-muted);
    display: flex;
    align-items: center;
  }

  .nav-primary .nav-arrow {
    color: var(--mysterium-accent-fg);
  }

  /* Desktop: hide nav-desc on primary cards to keep them compact */
  @media (max-width: 480px) {
    .nav-desc {
      display: none;
    }
    .nav-muted .nav-desc {
      display: none;
    }
  }

  /* Desktop: 2-column grid for nav items */
  @media (min-width: 1024px) {
    .nav-list {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: var(--mysterium-space-3);
    }
    .nav-list.secondary {
      max-width: none;
    }
  }
</style>
