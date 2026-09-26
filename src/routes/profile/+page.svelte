<script lang="ts">
  /**
   * /profile route — developmental radial chart.
   *
   * Pure SVG radar chart (no D3). 8 spokes (one per Line) × 8 rings (one per Stage).
   * Veil-compliant: no raw stage labels — only qualitative descriptions.
   */

  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import Seo from '$lib/components/Seo.svelte';
  import RouteShell from '$lib/components/RouteShell.svelte';
  import Card from '$lib/components/Card.svelte';
  import VeiledStat from '$lib/components/VeiledStat.svelte';
  import Stack from '$lib/components/Stack.svelte';
  import CCIDisplay from '$lib/components/displays/CCIDisplay.svelte';
  import ShadowsDisplay from '$lib/components/displays/ShadowsDisplay.svelte';
  import DrivesCompass from '$lib/components/displays/DrivesCompass.svelte';
  import SessionPosition from '$lib/components/displays/SessionPosition.svelte';
  import { gameStore, setSignificator } from '$lib/stores/gameStore.js';
  import { engineStore } from '$lib/engine/gameEngine.js';
  import { loadSignificatorFromStorage } from '$lib/stores/saveHydration.js';
  import { describeStage, describeDriveSpread } from '$core/presentation/veilDescriptors.js';
  import { renderLevel } from '$core/domain/articulationLadder.js';
  import { buildLadderPayloads } from '$core/presentation/ladderProjections.js';
  import { toSnapshot } from '$core/domain/SignificatorSnapshot.js';
  import { computeCCI } from '$core/engines/CCIEngine.js';
  import { stageFade } from '$lib/transitions/stageMotion.js';
  import { ALL_LINES } from '$core/domain/Line.js';
  import { ALL_STAGES, stageOrdinal } from '$core/domain/Stage.js';
  import type { Line } from '$core/domain/Line.js';
  import type { Stage } from '$core/domain/Stage.js';

  const sig = $derived($gameStore.significator);

  // Phase 17 d2: the articulation ladder live in the browser — the same bridge + law-holder the
  // CLI renders through (16 §10.5). L1 holonic span + L2 line profile, self register, AL3
  // presentation applied by renderLevel.
  const ladder = $derived.by(() => {
    if (!sig) return null;
    const payloads = buildLadderPayloads(sig);
    const l1 = renderLevel({ register: 'self', level: 'L1', playerStage: sig.currentStage }, payloads);
    const l2 = renderLevel({ register: 'self', level: 'L2', playerStage: sig.currentStage }, payloads);
    if (!l1.allowed || !l2.allowed) return null;
    return {
      presentation: l1.presentation,
      l1: l1.payload?.narrative ?? '',
      l2: l2.payload?.narrative ?? '',
    };
  });

  onMount(() => {
    if (!browser) return;
    if (!$gameStore.significator) {
      const loaded = loadSignificatorFromStorage();
      if (loaded) setSignificator(loaded);
    }
  });

  const size = 360;
  const cx = size / 2;
  const cy = size / 2;
  const maxRadius = size * 0.4;
  const ringCount = ALL_STAGES.length;

  function point(lineIndex: number, stageIdx: number): { x: number; y: number } {
    const angle = (lineIndex / ALL_LINES.length) * Math.PI * 2 - Math.PI / 2;
    const r = (stageIdx / (ringCount - 1)) * maxRadius;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  }

  const profilePath = $derived.by(() => {
    if (!sig) return '';
    const pts = ALL_LINES.map((line, i) => {
      const stage = sig.altitudes[line as Line] ?? 'Infrared';
      const ord = stageOrdinal(stage as Stage);
      const p = point(i, ord);
      return `${p.x},${p.y}`;
    });
    return `M ${pts.join(' L ')} Z`;
  });

  function lineDescriptor(line: Line): string {
    if (!sig) return '';
    const stage = sig.altitudes[line] ?? 'Infrared';
    return describeStage(stage as Stage);
  }

  // ponytail: C.5 — compute CCI for display (parity with CLI status).
  const cci = $derived.by(() => {
    if (!sig) return null;
    try {
      const snapshot = toSnapshot(sig);
      return computeCCI(snapshot, sig);
    } catch {
      return null;
    }
  });

  // Session position from engineStore (if a session is active).
  const session = $derived($engineStore.session);
  const sessionPosition = $derived.by(() => {
    if (!session) return null;
    const total = session.strategy?.encounterBudget?.totalTarget ?? 5;
    const done = session.recentOutcomes.length;
    const progress = total > 0 ? done / total : 0;
    const position: 'warmup' | 'peak' | 'cooldown' =
      progress < 0.3 ? 'warmup' : progress > 0.7 ? 'cooldown' : 'peak';
    return { position, progress };
  });
</script>

<Seo
  title="Developmental Profile"
  description="View your 8-line developmental shape — a radar chart of your current capacities."
  indexable={false}
/>

<RouteShell title="Developmental Profile" back="/">
  {#if !sig}
    <p class="empty-state">No save found. Enter the world to begin your developmental journey.</p>
  {:else}
    <Stack gap="space-5">
      <div class="chart-container" in:stageFade={{ duration: 500 }}>
        <svg viewBox="0 0 {size} {size}" class="radar-chart" role="img" aria-label="Developmental radar chart showing 8 lines of intelligence">
          {#each Array(ringCount) as _, ringIdx}
            <polygon
              points={ALL_LINES.map((_, lineIdx) => {
                const p = point(lineIdx, ringIdx);
                return `${p.x},${p.y}`;
              }).join(' ')}
              fill="none"
              stroke="var(--mysterium-border)"
              stroke-width={ringIdx === ringCount - 1 ? 1.5 : 0.75}
              opacity={0.3 + ringIdx * 0.05}
            />
          {/each}

          {#each ALL_LINES as _, lineIdx}
            <line
              x1={cx}
              y1={cy}
              x2={point(lineIdx, ringCount - 1).x}
              y2={point(lineIdx, ringCount - 1).y}
              stroke="var(--mysterium-border)"
              stroke-width="0.5"
              opacity="0.3"
            />
          {/each}

          <path d={profilePath} fill="var(--mysterium-accent)" fill-opacity="0.15" stroke="var(--mysterium-accent)" stroke-width="2" />

          {#each ALL_LINES as line, lineIdx}
            {@const stage = sig.altitudes[line as Line] ?? 'Infrared'}
            {@const ord = stageOrdinal(stage as Stage)}
            {@const p = point(lineIdx, ord)}
            <circle cx={p.x} cy={p.y} r="4" fill="var(--mysterium-accent)" stroke="var(--mysterium-bg)" stroke-width="1.5" />
          {/each}

          {#each ALL_LINES as line, lineIdx}
            {@const angle = (lineIdx / ALL_LINES.length) * 360 - 90}
            {@const labelR = maxRadius + 20}
            {@const lp = {
              x: cx + labelR * Math.cos((angle * Math.PI) / 180),
              y: cy + labelR * Math.sin((angle * Math.PI) / 180),
            }}
            <text
              x={lp.x}
              y={lp.y}
              text-anchor="middle"
              dominant-baseline="middle"
              fill="var(--mysterium-fg-muted)"
              font-size="9"
              font-family="var(--mysterium-font-body)"
            >
              {line.slice(0, 4)}
            </text>
          {/each}
        </svg>
      </div>

      <Card variant="accent" padding="space-5">
        <Stack gap="space-3">
          <VeiledStat descriptor={`The world feels ${describeStage(sig.currentStage)}.`} label="World" variant="accent" />
          <VeiledStat descriptor={describeDriveSpread(sig.drives.weights)} label="Tendencies" variant="muted" />
        </Stack>
      </Card>

      {#if cci}
        <Stack gap="space-3">
          <h2 class="section-title">Consciousness Index</h2>
          <Card padding="space-5">
            <CCIDisplay composite={cci.composite} dimensions={cci.dimensions} />
          </Card>
        </Stack>
      {/if}

      {#if ladder}
        <Stack gap="space-3">
          <h2 class="section-title">Articulation</h2>
          <Card padding="space-5">
            <div class="ladder-line">L1 · whole-person span <span class="ladder-pres">({ladder.presentation})</span></div>
            <p class="ladder-narrative">{ladder.l1}</p>
            <div class="ladder-line">L2 · line profile</div>
            <p class="ladder-narrative">{ladder.l2}</p>
          </Card>
        </Stack>
      {/if}

      {#if sessionPosition}
        <Stack gap="space-3">
          <h2 class="section-title">Session Arc</h2>
          <Card padding="space-5">
            <SessionPosition position={sessionPosition.position} progress={sessionPosition.progress} />
          </Card>
        </Stack>
      {/if}

      <Stack gap="space-3">
        <h2 class="section-title">Drive Balance</h2>
        <Card padding="space-5">
          <DrivesCompass drives={sig.drives} />
        </Card>
      </Stack>

      <Stack gap="space-3">
        <h2 class="section-title">Active Patterns</h2>
        <Card padding="space-5">
          <ShadowsDisplay shadows={sig.shadows} />
        </Card>
      </Stack>

      <Stack gap="space-3">
        <h2 class="section-title">Knowledge</h2>
        <a href="/knowledge" class="knowledge-link">
          <Card padding="space-4">
            <span class="link-text">View Knowledge Dashboard →</span>
          </Card>
        </a>
      </Stack>

      <Stack gap="space-3">
        <h2 class="section-title">Capacities</h2>
        <Card padding="space-0">
          <ul class="line-list" role="list">
            {#each ALL_LINES as line, i}
              <li class="line-row" class:divider={i > 0}>
                <span class="line-name">{line}</span>
                <span class="line-desc">{lineDescriptor(line)}</span>
              </li>
            {/each}
          </ul>
        </Card>
      </Stack>
    </Stack>
  {/if}
</RouteShell>

<style>
  .empty-state {
    color: var(--mysterium-fg-muted);
    font-style: italic;
    text-align: center;
    padding: var(--mysterium-space-7) var(--mysterium-space-4);
  }

  .ladder-line {
    font-size: 0.8rem;
    letter-spacing: 0.04em;
    color: var(--mysterium-fg-muted);
    margin-bottom: var(--mysterium-space-1);
  }

  .ladder-pres {
    font-size: 0.7rem;
    opacity: 0.7;
  }

  .ladder-narrative {
    margin: 0 0 var(--mysterium-space-4);
    line-height: 1.55;
  }

  .chart-container {
    display: flex;
    justify-content: center;
  }

  .radar-chart {
    width: 100%;
    max-width: 360px;
    height: auto;
  }

  .section-title {
    font-family: var(--mysterium-font-display);
    font-size: var(--mysterium-text-sm);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: var(--mysterium-tracking-wider);
    color: var(--mysterium-accent);
    margin: 0;
  }

  .line-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .line-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--mysterium-space-3);
    padding: var(--mysterium-space-3) var(--mysterium-space-5);
  }

  .line-row.divider {
    border-top: 1px solid var(--mysterium-border);
  }

  .line-name {
    font-family: var(--mysterium-font-body);
    font-size: var(--mysterium-text-sm);
    font-weight: 500;
    color: var(--mysterium-fg);
  }

  .line-desc {
    font-family: var(--mysterium-font-body);
    font-size: var(--mysterium-text-sm);
    color: var(--mysterium-fg-muted);
    font-style: italic;
    text-align: right;
  }

  .knowledge-link {
    text-decoration: none;
    display: block;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }

  .knowledge-link:hover {
    transform: translateY(-2px);
  }

  .knowledge-link:hover :global(.card) {
    box-shadow: 0 4px 12px var(--mysterium-shadow-md);
  }

  .link-text {
    font-family: var(--mysterium-font-body);
    font-size: var(--mysterium-text-sm);
    color: var(--mysterium-accent);
    font-weight: 500;
  }
</style>
