<script lang="ts">
  /**
   * LearningTrajectory — canon `33 §3.1` View 3 (`:112-128`).
   *
   * X-axis TIME, Y-axis DEPTH LEVEL, one line per concept, with three things canon asks for called out
   * explicitly: milestones (":119-120"), forgetting dips (":124-125"), and a pace (":122-123").
   *
   * WHAT IS DELIBERATELY ABSENT. Canon §3.1:126-128 asks for pattern insights — "you learn faster in
   * morning sessions". That needs a clock on every session and a sample large enough to mean anything,
   * and no test can hold either. Shipping the claim without the data is the fabricated-threshold
   * mistake this project has already paid for once, so the view shows what the history actually
   * supports and says nothing about the rest.
   *
   * WHY A PLAIN SCATTER AND NOT A LINE CHART. Depth is ORDINAL, not continuous: a step from `applied`
   * to `analyzed` is a rung, not a magnitude, and a line between two points implies a smoothness the
   * data does not have — worse, it draws a descending line THROUGH a decay, which reads as "the learner
   * passed through the intermediate depths on the way down" when they did not. Points plus a step path
   * say what happened without inventing the journey.
   *
   * READ-REGISTER DISCIPLINE (`AGENTS.md` §5.4). Everything here is open register — concept, depth
   * level, date. Nothing on this surface may name a shadow quadrant, a polarity, a ray profile or a
   * harvest verdict, and `trajectoryModel.ts` generates every label rather than interpolating one.
   */
  import type { KnowledgeState, DepthLevel } from '$core/curriculum/types.js';
  import { ALL_DEPTH_LEVELS, depthOrdinal } from '$core/curriculum/types.js';
  import { trajectory, milestones, forgettingEvents, paceProjection, timeSpan } from './trajectoryModel.js';

  interface Props {
    knowledge: KnowledgeState | undefined;
    concepts: readonly { id: string; name: string }[];
  }

  let { knowledge, concepts }: Props = $props();

  const W = 520;
  const H = 220;
  const PAD = { top: 14, right: 14, bottom: 30, left: 74 };

  const points = $derived(trajectory(knowledge, concepts));
  const span = $derived(timeSpan(points));
  const pace = $derived(paceProjection(points, concepts));
  const decays = $derived(forgettingEvents(points));

  const xOf = (t: number): number => {
    if (!span || span.to === span.from) return PAD.left + (W - PAD.left - PAD.right) / 2;
    return PAD.left + ((t - span.from) / (span.to - span.from)) * (W - PAD.left - PAD.right);
  };

  const yOf = (level: DepthLevel): number => {
    const max = ALL_DEPTH_LEVELS.length - 1;
    return H - PAD.bottom - (depthOrdinal(level) / max) * (H - PAD.top - PAD.bottom);
  };

  const dateOf = (t: number): string => new Date(t).toISOString().slice(0, 10);

  /** A pace needs two ascending transitions; anything else is absent, not zero. */
  const paces = $derived(
    pace.slice(0, 3).map((p) => ({
      ...p,
      text: p.nextLevel
        ? `${p.conceptName}: about ${p.daysPerLevel.toFixed(0)} days per level toward '${p.nextLevel}'`
        : `${p.conceptName}: about ${p.daysPerLevel.toFixed(0)} days per level`,
    })),
  );
</script>

<section class="trajectory" aria-labelledby="trajectory-heading">
  <h2 id="trajectory-heading" class="section-title">How far you have come</h2>

  {#if points.length === 0}
    <p class="empty">No depth has been recorded yet. Every milestone appears here once it happens.</p>
  {:else}
    <svg
      viewBox="0 0 {W} {H}"
      class="trajectory-svg"
      role="img"
      aria-label="Learning trajectory: time across, depth level up, one mark per depth a concept has reached."
    >
      <!-- Depth levels, faintest at the bottom: `absent` is drawn because the axis starts there. -->
      {#each ALL_DEPTH_LEVELS as level (level)}
        <line
          x1={PAD.left}
          y1={yOf(level)}
          x2={W - PAD.right}
          y2={yOf(level)}
          stroke="var(--mysterium-border)"
          stroke-width="0.5"
          opacity="0.3"
        />
        <text
          x={PAD.left - 8}
          y={yOf(level)}
          text-anchor="end"
          dominant-baseline="middle"
          fill="var(--mysterium-fg-muted)"
          font-size="9"
          font-family="var(--mysterium-font-body)"
        >
          {level}
        </text>
      {/each}

      {#if span}
        <text x={PAD.left} y={H - 10} fill="var(--mysterium-fg-muted)" font-size="9">
          {dateOf(span.from)}
        </text>
        <text x={W - PAD.right} y={H - 10} text-anchor="end" fill="var(--mysterium-fg-muted)" font-size="9">
          {dateOf(span.to)}
        </text>
      {/if}

      <!--
        ONE POLYLINE PER CONCEPT, not one for the whole history. A single merged line would connect a
        concept's memorised date to a different concept's applied date and draw a slope between two
        unrelated subjects — the timeline's most misleading possible error.
      -->
      {#each [...new Set(points.map((p) => p.conceptId))] as conceptId (conceptId)}
        {@const own = points.filter((p) => p.conceptId === conceptId)}
        <polyline
          points={own.map((p) => `${xOf(p.timestamp)},${yOf(p.level)}`).join(' ')}
          fill="none"
          stroke="var(--mysterium-accent)"
          stroke-width="1"
          opacity="0.4"
        />
        {#each own as p (p.timestamp + p.level)}
          <circle
            cx={xOf(p.timestamp)}
            cy={yOf(p.level)}
            r={p.isDecay ? 3.5 : 2.5}
            fill={p.isDecay ? 'var(--mysterium-danger, #ef4444)' : 'var(--mysterium-accent)'}
          >
            <title>{p.label}</title>
          </circle>
        {/each}
      {/each}
    </svg>

    {#if decays.length > 0}
      <p class="decay-note">
        {decays.length} dip{decays.length === 1 ? '' : 's'} — depth that was reached and then let go.
        Reviewing is what brings it back.
      </p>
    {/if}

    {#if paces.length > 0}
      <div class="pace">
        <h3 class="pace-title">Pace</h3>
        <ul>
          {#each paces as p (p.conceptId)}
            <li>{p.text}</li>
          {/each}
        </ul>
        <p class="pace-note">
          From concepts with at least two recorded rises. A single step is not a rate, so it is not shown.
        </p>
      </div>
    {/if}

    <!--
      The milestone LIST, not just the chart. A point with a `title` is invisible to a keyboard user
      and unselectable on touch, and canon's own example is a sentence — "Newton's Laws reached
      'comprehension'" — so the sentences are the surface and the chart is the picture of them.
    -->
    <details class="milestones">
      <summary>{milestones(points).length} milestone{milestones(points).length === 1 ? '' : 's'}</summary>
      <ul>
        {#each milestones(points) as m (m.conceptId + m.timestamp + m.level)}
          <li>
            <span class="when">{dateOf(m.timestamp)}</span>
            <span class="what" class:is-decay={m.isDecay}>{m.label}</span>
          </li>
        {/each}
      </ul>
    </details>
  {/if}
</section>

<style>
  .trajectory {
    display: block;
  }

  .trajectory-svg {
    width: 100%;
    max-width: 560px;
    height: auto;
  }

  .empty {
    color: var(--mysterium-fg-muted);
    font-size: var(--mysterium-text-sm);
  }

  .decay-note,
  .pace-note {
    color: var(--mysterium-fg-muted);
    font-size: var(--mysterium-text-sm);
    margin-top: var(--mysterium-space-2);
  }

  .pace-title {
    font-size: var(--mysterium-text-sm);
    color: var(--mysterium-fg-muted);
    margin: var(--mysterium-space-3) 0 var(--mysterium-space-1);
  }

  .pace ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--mysterium-space-1);
    font-size: var(--mysterium-text-sm);
  }

  .milestones {
    margin-top: var(--mysterium-space-3);
    font-size: var(--mysterium-text-sm);
  }

  .milestones summary {
    cursor: pointer;
    color: var(--mysterium-fg-muted);
  }

  .milestones ul {
    list-style: none;
    margin: var(--mysterium-space-2) 0 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--mysterium-space-1);
  }

  .milestones li {
    display: flex;
    gap: var(--mysterium-space-3);
  }

  .when {
    color: var(--mysterium-fg-muted);
    font-variant-numeric: tabular-nums;
    flex: 0 0 5.5rem;
  }

  .what.is-decay {
    color: var(--mysterium-danger, #ef4444);
  }
</style>
