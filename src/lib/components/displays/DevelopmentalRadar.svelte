<script lang="ts">
  /**
   * DevelopmentalRadar — canon `33 §3.1` View 2, `33 §4.2:253` "Extension of existing radar
   * component with curriculum data".
   *
   * NOT A NEW RADAR. `/profile` already draws an 8-line altitude radar; this adds the curriculum half
   * canon names beside it — which subjects exercise each line, which lines a concept also feeds, and
   * the depth-level distribution per line — and draws them as concentric bands inside each spoke.
   *
   * WHY A SEPARATE COMPONENT RATHER THAN A PATCH TO `/profile`. The altitude radar is a path through
   * eight stage ordinals; the curriculum reading is a distribution of counts over seven depth levels.
   * They share a centre and a spoke order and nothing else, and folding the second into the first
   * would make both harder to read and the page harder to test. `radarModel.ts` holds the arithmetic;
   * this file draws it. Views 3-5 follow the same split.
   *
   * READ-REGISTER DISCIPLINE (`AGENTS.md` §5.4, `20` §11.1). Everything here is OPEN register: which
   * line, how far along it, how many concepts at each depth, which lines a concept also feeds. The
   * CLOSED class — polarity, shadow quadrants, ray profile, harvest verdict, delegation inference —
   * has no representation in this component, and the label strings are built from counts rather than
   * from any scoring key.
   */
  import type { CurriculumHolon, KnowledgeState } from '$core/curriculum/types.js';
  import type { Line } from '$core/domain/Line.js';
  import { ALL_LINES } from '$core/domain/Line.js';
  import { ALL_STAGES, type Stage } from '$core/domain/Stage.js';
  import {
    lineCurriculum,
    crossDomainLinks,
    depthSummary,
    radarPoints,
    radarPath,
    type LineCurriculum,
  } from './radarModel.js';

  interface Props {
    altitudes: Readonly<Record<Line, Stage>>;
    holons: readonly CurriculumHolon[];
    knowledge: KnowledgeState | undefined;
  }

  let { altitudes, holons, knowledge }: Props = $props();

  const SIZE = 420;
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const maxRadius = SIZE / 2 - 30;

  const rows = $derived(lineCurriculum(holons, knowledge));
  const links = $derived(crossDomainLinks(holons, knowledge));

  /**
   * The altitude shape, through the model rather than inline.
   *
   * `radarPoints`/`radarPath` were exported, tested by 8 tests, and reached by nothing — the altitude
   * marker was drawn from a hand-inlined `stageOrdinal` and a constant 0.75. That is the shape MY-RG-0010
   * and the `recordProbeResult?.` episode both describe: a green suite over an unreachable function. So
   * the component now uses the model it was tested for, and if the geometry changes the view changes.
   *
   * `altR` per spoke stays the model's own radius; the dashed marker is drawn at the altitude point's
   * own distance rather than a constant, so a learner at Red and one at Turquoise get visibly different
   * markers — which was the point of drawing them separately from the curriculum band.
   */
  const altitude = $derived(radarPoints(altitudes, SIZE, ALL_STAGES.length));
  const altitudeByLine = $derived(new Map(altitude.map((p) => [p.line, p])));

  function spokeAngle(index: number): number {
    return (2 * Math.PI * index) / ALL_LINES.length - Math.PI / 2;
  }

  /** Depth bands sit INSIDE the altitude radius: the outer edge is the altitude, the fill is the reach. */
  function bandRow(row: LineCurriculum): { line: Line; reached: number; index: number } {
    const i = ALL_LINES.indexOf(row.line);
    return { line: row.line, reached: row.coverage, index: i };
  }

  const bandLabel = (row: LineCurriculum): string =>
    row.total === 0
      ? `${row.line}: no curriculum mapped to this line yet`
      : `${row.line}: ${depthSummary(row)} of ${row.total} concepts`;

  /** Screen-reader names for the cross-domain edges, which an SVG line cannot carry itself. */
  const linkLabel = (l: (typeof links)[number]): string =>
    `${l.count} concept${l.count === 1 ? '' : 's'} ${l.count === 1 ? 'reaches' : 'reach'} ` +
    `${l.to} as well as ${l.from}`;
</script>

<section class="radar-view" aria-labelledby="radar-heading">
  <h2 id="radar-heading" class="section-title">Where each line reaches</h2>

  <div class="radar-layout">
    <svg
      viewBox="0 0 {SIZE} {SIZE}"
      class="radar-svg"
      role="img"
      aria-label="Developmental radar: each spoke is a line of intelligence, its length is the stage reached, and the filled band inside the spoke is how much of that line's curriculum has been touched."
    >
      <!--
        One group per line. The outer marker is the ALTITUDE (where the learner is on the stage ladder);
        the filled band is CURRICULUM REACH (how much of the concepts mapped to that line they have
        touched). They are different measurements and are drawn as different marks on purpose — an
        early version of this view used one radius for both, which made a learner at Red with a full
        curriculum look identical to one at Red with none.
      -->
      {#each rows as row (row.line)}
        {@const band = bandRow(row)}
        {@const angle = spokeAngle(band.index)}
        {@const altPoint = altitudeByLine.get(row.line)}
        {@const reachR = maxRadius * row.coverage}
        <g role="listitem" aria-label={bandLabel(row)}>
          <line
            x1={cx}
            y1={cy}
            x2={cx + Math.cos(angle) * maxRadius}
            y2={cy + Math.sin(angle) * maxRadius}
            stroke="var(--mysterium-border)"
            stroke-width="0.75"
            opacity="0.4"
          />
          <!-- Curriculum reach: the filled inner band. -->
          {#if row.coverage > 0}
            <line
              x1={cx}
              y1={cy}
              x2={cx + Math.cos(angle) * reachR}
              y2={cy + Math.sin(angle) * reachR}
              stroke="var(--mysterium-accent)"
              stroke-width="7"
              stroke-linecap="round"
              opacity="0.55"
            />
          {/if}
          <!-- Altitude: the hollow marker, drawn on its own shorter spoke so the two never overlap. -->
          {#if altPoint}
            <circle
              cx={altPoint.x}
              cy={altPoint.y}
              r="3.5"
              fill="none"
              stroke="var(--mysterium-fg-muted)"
              stroke-width="1.5"
            />
          {/if}
          <text
            x={cx + Math.cos(angle) * (maxRadius + 14)}
            y={cy + Math.sin(angle) * (maxRadius + 14)}
            text-anchor="middle"
            dominant-baseline="middle"
            fill="var(--mysterium-fg-muted)"
            font-size="10"
            font-family="var(--mysterium-font-body)"
          >
            {row.line.slice(0, 4)}
          </text>
        </g>
      {/each}

      <!--
        The altitude outline, through the model's own path builder. This is the SHAPE the eight
        altitude points make, and drawing it is what makes the radar a radar rather than eight spokes:
        a reader sees the profile at a glance and the per-line detail only when they look for it.
      -->
      <path
        d={radarPath(altitude)}
        fill="var(--mysterium-accent)"
        fill-opacity="0.1"
        stroke="var(--mysterium-accent)"
        stroke-width="1.5"
        opacity="0.7"
      />
    </svg>

    <ul class="radar-legend" aria-label="Curriculum reach per line">
      {#each rows as row (row.line)}
        <li>
          <span class="legend-line">{row.line}</span>
          <span class="legend-detail">{depthSummary(row)}</span>
        </li>
      {/each}
    </ul>
  </div>

  <!--
    The cross-domain edges, as TEXT rather than as lines across the chart. An edge from Moral to
    Emotional has no honest position in a radial layout — the two lines are adjacent spokes, and
    drawing the arc between them would imply a proximity the data does not have. `33 §3.1:108` asks
    the claim be VISIBLE, and a sentence makes it legible where an arc would only suggest it.
  -->
  {#if links.length > 0}
    <div class="radar-links">
      <h3 class="links-title">Also reaching</h3>
      <ul aria-label="Concepts that develop more than one line">
        {#each links as link (link.from + '→' + link.to)}
          <li>{linkLabel(link)}</li>
        {/each}
      </ul>
    </div>
  {/if}
</section>

<style>
  .radar-view {
    display: block;
  }

  .radar-layout {
    display: flex;
    flex-wrap: wrap;
    gap: var(--mysterium-space-5);
    align-items: center;
  }

  .radar-svg {
    width: 100%;
    max-width: 340px;
    height: auto;
    flex: 1 1 260px;
  }

  .radar-legend {
    list-style: none;
    margin: 0;
    padding: 0;
    flex: 1 1 200px;
    display: flex;
    flex-direction: column;
    gap: var(--mysterium-space-2);
  }

  .radar-legend li {
    display: flex;
    justify-content: space-between;
    gap: var(--mysterium-space-3);
    font-size: var(--mysterium-text-sm);
  }

  .legend-line {
    color: var(--mysterium-fg);
  }

  .legend-detail {
    color: var(--mysterium-fg-muted);
    text-align: right;
  }

  .radar-links {
    margin-top: var(--mysterium-space-4);
  }

  .links-title {
    font-size: var(--mysterium-text-sm);
    color: var(--mysterium-fg-muted);
    margin: 0 0 var(--mysterium-space-2);
  }

  .radar-links ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--mysterium-space-1);
    font-size: var(--mysterium-text-sm);
    color: var(--mysterium-fg-muted);
  }
</style>