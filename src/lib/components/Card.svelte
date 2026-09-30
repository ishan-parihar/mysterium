<script lang="ts">
  /**
   * Card — surface container with stage-aware styling.
   * Replaces .profile-card, .entry-card, .event-card, .setting-row, etc.
   */
  import type { Snippet } from 'svelte';
  import { cardKeydown } from './cardActivation.js';

  type Variant = 'default' | 'elevated' | 'accent' | 'ghost';
  type Padding = 'space-0' | 'space-2' | 'space-3' | 'space-4' | 'space-5' | 'space-6';

  interface Props {
    variant?: Variant;
    padding?: Padding;
    as?: keyof HTMLElementTagNameMap;
    interactive?: boolean;
    class?: string;
    onclick?: () => void;
    href?: string;
    children: Snippet;
  }

  let {
    variant = 'default',
    padding = 'space-5',
    as = 'div',
    interactive = false,
    class: className = '',
    onclick,
    href,
    children,
  }: Props = $props();

  const isInteractive = $derived(interactive || onclick !== undefined || href !== undefined);

  /**
   * Keyboard activation for the clickable-card form.
   *
   * This element advertises `role="button"` and `tabindex="0"`, which promises a control a keyboard
   * and a screen reader can operate. It did not deliver one: with no key handler, Enter and Space
   * did nothing, so the promise was a lie in the exact sense that matters — the element was FOCUSABLE
   * (so it passed a tab-order audit) and NAMED-BY-ROLE (so it passed an axe scan) while being
   * unreachable. The decision itself lives in `cardActivation.ts` so it can be tested without a
   * component library; `CardKeyboard.test.ts` pins that this element stays bound to it.
   */
  function onKeydown(event: KeyboardEvent): void {
    cardKeydown(event, onclick);
  }
</script>

{#if href && isInteractive}
  <a class="card card-{variant} interactive {className}" {href} style="padding: var(--mysterium-{padding});">
    {@render children()}
  </a>
{:else if onclick && isInteractive}
  <svelte:element
    this={as}
    class="card card-{variant} interactive {className}"
    style="padding: var(--mysterium-{padding});"
    onclick={onclick}
    onkeydown={onKeydown}
    role="button"
    tabindex="0"
  >
    {@render children()}
  </svelte:element>
{:else}
  <svelte:element this={as} class="card card-{variant} {className}" style="padding: var(--mysterium-{padding});">
    {@render children()}
  </svelte:element>
{/if}

<style>
  .card {
    background: var(--mysterium-surface);
    border: 1px solid var(--mysterium-border);
    border-radius: var(--mysterium-radius-lg);
    transition: background var(--mysterium-duration-fast) var(--mysterium-ease),
                border-color var(--mysterium-duration-fast) var(--mysterium-ease),
                box-shadow var(--mysterium-duration-fast) var(--mysterium-ease),
                transform var(--mysterium-duration-instant) var(--mysterium-ease);
  }

  .card-elevated {
    background: var(--mysterium-surface-elevated);
    box-shadow: var(--mysterium-shadow-md);
  }

  .card-accent {
    border-top: 2px solid var(--mysterium-accent);
  }

  .card-ghost {
    background: transparent;
    border-color: transparent;
  }

  .interactive {
    cursor: pointer;
    text-decoration: none;
    color: inherit;
    -webkit-tap-highlight-color: transparent;
  }
  .interactive:hover {
    background: var(--mysterium-surface-elevated);
    border-color: var(--mysterium-accent);
    box-shadow: var(--mysterium-shadow-md);
  }
  .interactive:active {
    transform: scale(0.99);
  }
  .interactive:focus-visible {
    outline: 2px solid var(--mysterium-accent);
    outline-offset: 2px;
  }
</style>
