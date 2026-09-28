<script lang="ts">
  /**
   * Button — shared button component with variants and sizes.
   * Replaces ~12 hand-rolled button classes across routes.
   *
   * Variants: primary | default | muted | danger | ghost
   * Sizes: sm | md | lg
   */
  import type { Snippet } from 'svelte';

  type Variant = 'primary' | 'default' | 'muted' | 'danger' | 'ghost';
  type Size = 'sm' | 'md' | 'lg';

  interface Props {
    variant?: Variant;
    size?: Size;
    onclick?: (e: MouseEvent) => void;
    href?: string;
    disabled?: boolean;
    loading?: boolean;
    type?: 'button' | 'submit' | 'reset';
    ariaLabel?: string;
    class?: string;
    children: Snippet;
  }

  let {
    variant = 'default',
    size = 'md',
    onclick,
    href,
    disabled = false,
    loading = false,
    type = 'button',
    ariaLabel,
    class: className = '',
    children,
  }: Props = $props();

  function handleClick(e: MouseEvent) {
    if (disabled || loading) {
      e.preventDefault();
      return;
    }
    onclick?.(e);
  }
</script>

{#if href && !disabled}
  <a
    class="btn btn-{variant} btn-{size} {className}"
    {href}
    aria-label={ariaLabel}
    onclick={handleClick}
  >
    {#if loading}<span class="btn-spinner" aria-hidden="true"></span>{/if}
    <span class="btn-content" class:loading>{@render children()}</span>
  </a>
{:else}
  <button
    class="btn btn-{variant} btn-{size} {className}"
    {type}
    {disabled}
    aria-label={ariaLabel}
    onclick={handleClick}
  >
    {#if loading}<span class="btn-spinner" aria-hidden="true"></span>{/if}
    <span class="btn-content" class:loading>{@render children()}</span>
  </button>
{/if}

<style>
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--mysterium-space-2);
    border: 1px solid transparent;
    border-radius: var(--mysterium-radius);
    cursor: pointer;
    font-family: var(--mysterium-font-body);
    font-weight: 500;
    text-decoration: none;
    transition: background var(--mysterium-duration-fast) var(--mysterium-ease),
                border-color var(--mysterium-duration-fast) var(--mysterium-ease),
                transform var(--mysterium-duration-instant) var(--mysterium-ease),
                box-shadow var(--mysterium-duration-fast) var(--mysterium-ease);
    -webkit-tap-highlight-color: transparent;
    user-select: none;
  }

  .btn:active:not(:disabled) {
    transform: scale(0.98);
  }

  .btn:focus-visible {
    outline: 2px solid var(--mysterium-accent);
    outline-offset: 2px;
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Sizes */
  .btn-sm { padding: var(--mysterium-space-1) var(--mysterium-space-3); font-size: var(--mysterium-text-sm); }
  .btn-md { padding: var(--mysterium-space-2) var(--mysterium-space-4); font-size: var(--mysterium-text-base); }
  .btn-lg { padding: var(--mysterium-space-3) var(--mysterium-space-5); font-size: var(--mysterium-text-md); }

  /* Variants */
  .btn-primary {
    background: var(--mysterium-accent);
    border-color: var(--mysterium-accent);
    color: var(--mysterium-accent-fg);
  }
  /* Hover swaps the fill to accent-soft, so the text must swap with it — the same pair rule
     the .badge-accent consumers follow. Without this the label keeps the solid token's
     contrast against a soft fill, which is a different lightness. */
  .btn-primary:hover:not(:disabled) {
    background: var(--mysterium-accent-soft);
    color: var(--mysterium-accent-soft-fg);
    box-shadow: var(--mysterium-shadow-glow);
  }

  .btn-default {
    background: var(--mysterium-surface);
    border-color: var(--mysterium-border);
    color: var(--mysterium-fg);
  }
  .btn-default:hover:not(:disabled) {
    background: var(--mysterium-surface-elevated);
    border-color: var(--mysterium-accent);
  }

  .btn-muted {
    background: transparent;
    border-color: transparent;
    color: var(--mysterium-fg-muted);
  }
  .btn-muted:hover:not(:disabled) {
    background: var(--mysterium-surface);
    border-color: var(--mysterium-border);
  }

  .btn-danger {
    background: var(--mysterium-danger);
    border-color: var(--mysterium-danger);
    color: var(--mysterium-danger-fg);
  }
  .btn-danger:hover:not(:disabled) {
    background: var(--mysterium-danger-soft);
    border-color: var(--mysterium-danger);
    box-shadow: 0 0 24px var(--mysterium-danger-soft);
  }

  .btn-ghost {
    background: transparent;
    border-color: transparent;
    color: var(--mysterium-fg);
  }
  .btn-ghost:hover:not(:disabled) {
    background: color-mix(in srgb, var(--mysterium-surface) 50%, transparent);
  }

  /* Spinner */
  .btn-spinner {
    width: 1em;
    height: 1em;
    border: 2px solid currentColor;
    border-top-color: transparent;
    border-radius: 50%;
    animation: btn-spin 0.6s linear infinite;
  }
  @keyframes btn-spin {
    to { transform: rotate(360deg); }
  }

  .btn-content.loading {
    opacity: 0.7;
  }
</style>
