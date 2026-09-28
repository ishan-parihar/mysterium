<script lang="ts">
  /**
   * Root layout — wraps every route.
   *
   * Pure-Svelte frontend: no Phaser mount. Provides:
   *   - Stage theme (data-stage attribute)
   *   - Accessibility applier (data-motion, data-contrast)
   *   - Capability probe (data-input, data-capability, etc.)
   *   - Desktop sidebar + mobile bottom nav
   *   - Toaster for notifications
   *   - Cloud sync on beforeunload
   *   - <AgentRunner /> (BACKGROUND-AGENTIC-ARCHITECTURE, Decision 9)
   *   - Failure Integrity route guard (Decision 10)
   */

  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';
  import '../styles/tokens.css';
  import '../styles/base.css';
  import '../styles/fonts.css';
  import '../styles/capabilities.css';
  import StageTheme from '$lib/components/StageTheme.svelte';
  import A11yApplier from '$lib/components/A11yApplier.svelte';
  import AmbientLayer from '$lib/components/AmbientLayer.svelte';
  import Sidebar from '$lib/components/Sidebar.svelte';
  import BottomNav from '$lib/components/BottomNav.svelte';
  import Toaster from '$lib/components/Toaster.svelte';
  import AgentRunner from '$lib/components/AgentRunner.svelte';
  import CloudSyncIndicator from '$lib/components/CloudSyncIndicator.svelte';
  import { applyCapabilities, watchCapabilities } from '$lib/capabilities/CapabilityProbe.js';
  import { setSignificator } from '$lib/stores/gameStore.js';
  import { loadSignificatorFromStorage } from '$lib/stores/saveHydration.js';
  import { flushSync } from '$lib/stores/cloudSyncStore.js';
  import { get } from 'svelte/store';
  import { gameStore } from '$lib/stores/gameStore.js';
  import { llmStatus } from '$lib/stores/llmStatus.js';
  import { routeGuardAgentic } from '$lib/agents/routeGuard.js';

  let { children } = $props();

  let unwatch: (() => void) | null = null;
  let beforeUnloadHandler: (() => void) | null = null;
  let prevPath = '';

  onMount(() => {
    if (!browser) return;

    // 1. Run capability probe immediately on boot.
    applyCapabilities();
    // 2. Watch for changes (orientation flip, gamepad connect, motion toggle).
    unwatch = watchCapabilities();

    // 3. Hydrate gameStore from localStorage (lightweight — no engine import).
    const sig = loadSignificatorFromStorage();
    if (sig) setSignificator(sig);

    // 4. Flush cloud sync on beforeunload (tab close / navigate away).
    beforeUnloadHandler = () => {
      const state = get(gameStore);
      if (state.significator) void flushSync(state.significator);
    };
    window.addEventListener('beforeunload', beforeUnloadHandler);
  });

  onDestroy(() => {
    if (unwatch) unwatch();
    if (browser && beforeUnloadHandler) {
      window.removeEventListener('beforeunload', beforeUnloadHandler);
    }
  });

  // Failure Integrity: if llmStatus flips offline while the user is on
  // (or navigates to) an agentic route, redirect them to /setup. Reads
  // the current path on each tick and applies the guard.
  $effect(() => {
    if (!browser) return;
    const status = $llmStatus;
    const path = window.location.pathname;
    if (path !== prevPath) prevPath = path;
    if (status.offline) routeGuardAgentic(path);
  });
</script>

<StageTheme />
<A11yApplier />
<AmbientLayer />
<Sidebar />
{@render children()}
<BottomNav />
<Toaster />
<AgentRunner />
<!-- B-1: a save that did not reach durable storage must be visible, on every route. -->
<CloudSyncIndicator />
