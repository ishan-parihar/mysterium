<script lang="ts">
  /**
   * StudyPlanner — canon `33 §3.1` View 4 (`:130-150`).
   *
   * A list of time-boxed recommendations, each carrying its own reason. Canon §3.2:170 gates the view
   * on the first few sessions, and that gate is honoured by the DATA rather than by a counter: with no
   * reached concepts there is nothing to review and nothing whose prerequisites are met, so the plan is
   * empty and this says so. A counter would be a number about the learner's history, not about what
   * they can do today.
   *
   * THE ENGINE'S OWN RATIONALE IS NOT RENDERED. `SessionStrategy.themeRationale` reads "CCI dominant
   * dimension: X; composite: 0.73", and canon §3.2:168 forbids scores on a player surface. The strategy
   * is an input; every sentence here is generated from the learner's own state.
   *
   * OVERRIDES ARE ABSENT ON PURPOSE. Canon §3.1:141-145 asks for skip / reorder / add / resize. The
   * kernel already honours session-local preferences through `PriorityComputation`'s weights and
   * `sessionControlStore`'s `encounterCount`, and a second override channel that nothing reads is the
   * documented-but-unwired class `AGENTS.md` §4.2 item 2 exists to catch. So this names the control that
   * already works instead of adding buttons that do nothing.
   */
  import type { CurriculumHolon, KnowledgeState } from '$core/curriculum/types.js';
  import { buildGraph } from '$core/curriculum/KnowledgeGraph.js';
  import { studyPlan, type PlanKind } from './plannerModel.js';

  interface Props {
    holons: readonly CurriculumHolon[];
    knowledge: KnowledgeState | undefined;
  }

  let { holons, knowledge }: Props = $props();

  const plan = $derived(studyPlan(holons, buildGraph(holons as never).adjacency, knowledge));

  const KIND_LABEL: Record<PlanKind, string> = {
    review: 'Review',
    new: 'New',
    connect: 'Connect',
  };
</script>

<section class="planner" aria-labelledby="planner-heading">
  <h2 id="planner-heading" class="section-title">A session, if you want one</h2>

  {#if plan.recommendations.length === 0}
    <p class="empty">
      Nothing is due and nothing is unlocked yet. As soon as something is, it will appear here with the
      reason.
    </p>
  {:else}
    <ol class="plan" aria-label="Recommended session">
      {#each plan.recommendations as r (r.conceptId + r.kind)}
        <li class="item">
          <div class="head">
            <span class="kind kind-{r.kind}">{KIND_LABEL[r.kind]}</span>
            <span class="name">{r.conceptName}</span>
            <span class="mins">{r.minutes} min</span>
          </div>
          <p class="reason">{r.reason}</p>
        </li>
      {/each}
    </ol>

    <p class="total">About {plan.totalMinutes} minutes in all. Order it however you like — the list is a
      suggestion, not a schedule.</p>
  {/if}

  {#if plan.blocked.length > 0}
    <details class="blocked">
      <summary>{plan.blocked.length} waiting on something</summary>
      <p class="blocked-note">
        These are ready once what they need has been reached. The list is not a to-do list; it is what
        the ladder opens next.
      </p>
      <ul>
        {#each plan.blocked.slice(0, 12) as name (name)}
          <li>{name}</li>
        {/each}
      </ul>
    </details>
  {/if}
</section>

<style>
  .planner {
    display: block;
  }

  .plan {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--mysterium-space-3);
  }

  .item {
    border: 1px solid var(--mysterium-border);
    border-radius: var(--mysterium-radius-md);
    padding: var(--mysterium-space-3);
  }

  .head {
    display: flex;
    align-items: baseline;
    gap: var(--mysterium-space-2);
  }

  .kind {
    font-size: var(--mysterium-text-xs);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--mysterium-fg-muted);
  }

  .kind-review {
    color: var(--mysterium-accent);
  }

  .kind-new {
    color: var(--mysterium-success, #34d399);
  }

  .kind-connect {
    color: var(--mysterium-info, #38bdf8);
  }

  .name {
    flex: 1;
    font-size: var(--mysterium-text-sm);
  }

  .mins {
    font-size: var(--mysterium-text-xs);
    color: var(--mysterium-fg-muted);
    font-variant-numeric: tabular-nums;
  }

  .reason,
  .total,
  .empty,
  .blocked-note {
    color: var(--mysterium-fg-muted);
    font-size: var(--mysterium-text-sm);
    margin-top: var(--mysterium-space-1);
  }

  .total {
    margin-top: var(--mysterium-space-3);
  }

  .blocked {
    margin-top: var(--mysterium-space-3);
    font-size: var(--mysterium-text-sm);
  }

  .blocked summary {
    cursor: pointer;
    color: var(--mysterium-fg-muted);
  }

  .blocked ul {
    list-style: none;
    margin: var(--mysterium-space-2) 0 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--mysterium-space-1);
    color: var(--mysterium-fg-muted);
  }
</style>
