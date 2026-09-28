<script lang="ts">
  /**
   * The one shell all three auditor surfaces render inside — 33 §7.
   *
   * It carries the three things 33 §7 says every surface has: an identity banner (who this view
   * is for, which consent scopes are active), a window selector (30d / 90d / all), and the
   * granularity stepper (summary → line → line-stage → line-stage-cell) that maps 1:1 to the
   * projection granularity ladder.
   *
   * It renders NO data. 33 §7 is explicit: the scope projections arrive pre-filtered and
   * consent-checked, and this layer adds visual hierarchy and interaction only — so a component
   * that both decided what was allowed and drew it would be a second, weaker permission system.
   */
  import type { ShareRecord } from '$core/domain/shares.js';
  import type { LadderLevel } from '$core/domain/articulationLadder.js';
  import { SURFACE_LABEL, type AuditorSurface } from '$lib/stores/shareStore.js';

  // The ladder and the ceiling decision live in `granularityStepper.ts` as PURE functions, so
  // they are testable as values. Two defects lived here first and neither was findable by a
  // component test: a plain `const` snapshotting the prop (label frozen on the first step) and a
  // ceiling comparison that could never be true before the last rung. This component still
  // `$derived`s them — a plain const would reintroduce the first.
  import { stepperState, nextGranularity } from './granularityStepper.js';
  import type { Granularity } from './granularityStepper.js';

  interface Props {
    surface: AuditorSurface;
    /** The live grant this view is rendering through, or undefined when there is none. */
    consent?: ShareRecord;
    /** The refusal reason when there is no usable grant. Shown instead of content, never around it. */
    refusal?: string;
    level: LadderLevel;
    /** 33 §7.2 — the deepest level this surface's grant permits. REQUIRED, and not defaulted: a
     *  surface that omitted it would silently be granted the whole ladder, and the deepest rung
     *  resolves to the ceiling — so the omission would be a full-scope disclosure with no error
     *  anywhere. Every surface declares its ceiling from its own `33 §7` row, and TypeScript now
     *  makes a fourth surface state one.
     *
     *  The deepest rung REQUESTS the ceiling rather than stopping one short of it: `topLevelOf`
     *  maps `line-stage-cell` to this value, so a therapeutic surface's L4 is reached, and the
     *  rung after it does not exist. An earlier comment here said it "must refuse to offer the
     *  step that would request L5" — that described a mapping where the deepest rung was a fixed
     *  L4, and stopped the therapeutic surface one level short of what its own grant permits. */
    ceiling: LadderLevel;
    granularity?: Granularity;
    window?: '30d' | '90d' | 'all';
    onGranularity?: (g: Granularity) => void;
    onWindow?: (w: '30d' | '90d' | 'all') => void;
    children?: import('svelte').Snippet;
  }

  let {
    surface,
    consent,
    refusal,
    level,
    ceiling,
    granularity = 'summary',
    window = '90d',
    onGranularity,
    onWindow,
    children,
  }: Props = $props();

  // AP3 — the ONE forward step, derived from where the view currently sits. `next` is undefined
  // at the end of the ladder; `atCeiling` is a separate flag rather than `!next` so the control can
  // DISABLE with a reason instead of vanishing, which is what a reader needs to know.
  const stepper = $derived(stepperState(granularity, ceiling));
</script>

<section class="shell" aria-label={SURFACE_LABEL[surface]}>
  <header class="banner">
    <div>
      <h1>{SURFACE_LABEL[surface]}</h1>
      <!-- Who this view is for. The surface names an audience (33 §7.1); it does not assert an
           identity — there is none. Access is the grant, below. -->
      <p class="aud">auditor view for a {surface}</p>
    </div>
    {#if consent}
      <div class="scopes">
        <span class="k">Active consent</span>
        <span class="v">{consent.scopes.join(' · ')}</span>
        <span class="k">Entry level</span>
        <span class="v">{level}</span>
      </div>
    {:else}
      <div class="scopes refused">
        <span class="k">No live grant</span>
        <span class="v">{refusal ?? 'access is a player-issued, revocable link'}</span>
      </div>
    {/if}
  </header>

  {#if consent}
    <div class="controls">
      <div class="ctl" role="group" aria-label="Window">
        <span class="k">Window</span>
        {#each ['30d', '90d', 'all'] as const as w}
          <button class:on={window === w} onclick={() => onWindow?.(w)}>{w}</button>
        {/each}
      </div>
      <div class="ctl" role="group" aria-label="Granularity">
        <span class="k">Granularity</span>
        <!-- 33 §7.2.1 + AP3, and this is the piece the comment above used to describe without
             implementing: the ladder is DESCENT-ONLY. Each request issues exactly ONE level
             deeper than the current view, and no deeper level is reachable directly. Four
             buttons all live at once is a level selector, not a stepper — it lets an auditor
             jump straight to the most detailed view the grant permits, which is the opposite of
             progressive disclosure. So the only forward control is "one level deeper", and it
             is disabled (and says so) once the grant's own ceiling is reached. -->
        <button
          class="on"
          disabled={stepper.atCeiling}
          onclick={() => { const n = nextGranularity(granularity); if (n) onGranularity?.(n); }}
          title={stepper.atCeiling ? 'The consent grant reaches no further' : 'Expand one level deeper'}
        >
          {stepper.label}
        </button>
      </div>
    </div>

    {@render children?.()}

    <footer class="audit-note">
      Expansion is audited: each request records scope, granularity and time (33 §7.2.3). No
      background refresh pushes detail into an expanded view — re-request is explicit.
    </footer>
  {:else}
    <!-- A refused render shows the reason, never a partial payload (16 §2.4.1). -->
    <div class="refusal">
      <p><strong>Nothing to show.</strong> {refusal ?? 'no live consent grant'}</p>
      <p class="sub">
        This surface renders only what a player-issued, revocable link grants. A revoked link
        nulls the projection instantly — there is no cached view to fall back on.
      </p>
    </div>
  {/if}
</section>

<style>
  .shell{max-width:1000px}
  .banner{display:flex;justify-content:space-between;align-items:flex-start;gap:24px;flex-wrap:wrap;
          padding-bottom:16px;border-bottom:1px solid var(--mysterium-border);margin-bottom:18px}
  h1{font-family:var(--mysterium-font-display);font-size:28px;letter-spacing:.06em;
     text-transform:uppercase;margin:0 0 4px;color:var(--mysterium-fg)}
  .aud{margin:0;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--mysterium-fg-muted)}
  .scopes{text-align:right;font-size:12px;display:grid;grid-template-columns:auto auto;gap:3px 10px;
          align-items:baseline}
  .scopes .k{font-size:9.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--mysterium-muted)}
  .scopes .v{font-family:var(--mysterium-font-display);letter-spacing:.06em;color:var(--mysterium-accent)}
  .scopes.refused .v{color:var(--mysterium-fg-muted);letter-spacing:0;font-size:11.5px;max-width:34ch}
  .controls{display:flex;gap:20px;flex-wrap:wrap;margin-bottom:20px}
  .ctl{display:flex;align-items:center;gap:6px}
  .ctl .k{font-size:9.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--mysterium-muted);margin-right:4px}
  .ctl button{background:transparent;border:1px solid var(--mysterium-border);color:var(--mysterium-fg-muted);
              padding:4px 11px;font-family:var(--mysterium-font-body);font-size:11.5px;cursor:pointer}
  .ctl button:hover{border-color:var(--mysterium-accent);color:var(--mysterium-fg)}
  .ctl button.on{background:var(--mysterium-accent-soft);color:var(--mysterium-accent-soft-fg);
                 border-color:var(--mysterium-accent)}
  .refusal{background:var(--mysterium-surface);border:1px solid var(--mysterium-border);
           border-left:2px solid var(--mysterium-accent);padding:20px}
  .refusal p{margin:0 0 8px;font-size:13px;color:var(--mysterium-fg)}
  .refusal .sub{font-size:12px;color:var(--mysterium-fg-muted);margin:0}
  .audit-note{margin-top:20px;padding-top:12px;border-top:1px solid var(--mysterium-border);
              font-size:11px;color:var(--mysterium-fg-muted)}
</style>
