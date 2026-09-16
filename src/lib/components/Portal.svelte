<script lang="ts">
  /**
   * Portal — renders children into document.body via Svelte 5 actions.
   * Used by Modal, Toaster, and other overlays that must escape parent stacking contexts.
   *
   * Implementation: creates a div under document.body on mount, uses a
   * Svelte action to teleport the rendered content into that div.
   */
  import type { Snippet } from 'svelte';
  import { browser } from '$app/environment';
  import { onMount, onDestroy } from 'svelte';

  let { children }: { children: Snippet } = $props();

  let host: HTMLDivElement | null = null;

  onMount(() => {
    if (!browser) return;
    host = document.createElement('div');
    host.dataset.portal = 'true';
    host.style.cssText = 'position: fixed; inset: 0; pointer-events: none; z-index: var(--mysterium-z-modal);';
    document.body.appendChild(host);
  });

  onDestroy(() => {
    if (host?.parentNode) {
      host.parentNode.removeChild(host);
    }
  });

  // Action: move the wrapper element into the host div
  function teleport(node: HTMLElement) {
    if (host) {
      host.appendChild(node);
      node.style.pointerEvents = 'auto';
    }
    return {
      destroy() {
        // host cleanup happens in onDestroy
      },
    };
  }
</script>

{#if browser && host}
  <div use:teleport>
    {@render children()}
  </div>
{/if}
