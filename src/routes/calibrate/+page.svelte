<script lang="ts">
  /**
   * /calibrate route — quick calibration, in the browser.
   *
   * The scoring is not here. `QuickCalibrationScoring.ts` already decides what an answer means and
   * `calibrationPrompts.ts` already holds the authored prompts; `CalibrationRun.ts` holds the
   * answers. What was missing was a page, which is why §7 of the web-surface record listed
   * `calibrate` as having no headless equivalent while the CLI's `runQuickCalibration` ran the
   * identical instrument. This page is that instrument, not a second implementation of it.
   *
   * Three honesty properties, all inherited rather than invented:
   *
   *  1. THE TIMING PROBE IS NOT OPTIONAL. Somatic and Willpower are probed by holding a button for
   *     a target duration. A choice among three reflective options cannot discriminate capacities
   *     that show up as embodied regulation — the reasoning is in `probeKindFor`. Offering a
   *     choice there would produce a number, and the number would be noise.
   *  2. A LINE THAT DID NOT SCORE IS SHOWN AS UNANSWERED, not as Red. `altitudesFrom` omits it,
   *     and this page renders "not probed". Defaulting would claim we measured something we did
   *     not, and `progressFor` returning `outcome: null` is the shape that says so.
   *  3. WRITING THE RESULT IS A SEPARATE ACT, AND A CONFIRMED ONE. A run that silently overwrote
   *     an existing Significator's altitudes would destroy real progression behind a button that
   *     says "save". So the run produces a result, and the page states plainly whether a profile
   *     already exists and what saving would replace.
   *
   * The stage a line lands on IS shown — the open register class (AGENTS.md §5.4), player-readable
   * at any stage per `foundations/16` §10.5. Never for a line the run did not score.
   */
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import Seo from '$lib/components/Seo.svelte';
  import RouteShell from '$lib/components/RouteShell.svelte';
  import Card from '$lib/components/Card.svelte';
  import Stack from '$lib/components/Stack.svelte';
  import Button from '$lib/components/Button.svelte';
  import { ALL_LINES } from '$core/domain/Line.js';
  import type { Line } from '$core/domain/Line.js';
  import {
    altitudesFrom,
    choicePromptFor,
    holdTargetFor,
    progressFor,
    remainingLines,
    type CalibrationAnswer,
    type CalibrationAnswers,
  } from '$core/usecases/CalibrationRun.js';
  import { feltSenseLabel } from '$core/usecases/QuickCalibrationScoring.js';
  import { loadSignificatorFromStorage } from '$lib/stores/saveHydration.js';
  import { setSignificator } from '$lib/stores/gameStore.js';
  import { createSignificator } from '$core/domain/Significator.js';
  import type { Significator } from '$core/domain/Significator.js';
  import type { Stage } from '$core/domain/Stage.js';

  let answers = $state<CalibrationAnswers>({});
  let current = $state<Line | null>(null);
  let holdStartedAt = $state<number | null>(null);
  let holdElapsed = $state<number>(0);
  let existing = $state<Significator | null>(null);
  let saved = $state(false);
  let applyError = $state<string | null>(null);
  let holdAborted = $state(false);
  let tick: ReturnType<typeof setInterval> | null = null;

  onMount(() => {
    current = ALL_LINES[0] ?? null;
    existing = loadSignificatorFromStorage();
    const onVisibility = (): void => {
      if (document.visibilityState === 'hidden') abortHold();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      if (tick !== null) clearInterval(tick);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  });

  const progress = $derived(progressFor(ALL_LINES, answers));
  const remaining = $derived(remainingLines(ALL_LINES, answers));
  const altitudes = $derived(altitudesFrom(answers));
  const answeredCount = $derived(ALL_LINES.length - remaining.length);
  const complete = $derived(answeredCount === ALL_LINES.length);
  /**
   * The altitudes to persist, or `null` when the run did not score every line.
   *
   * `altitudesFrom` deliberately returns a PARTIAL map — an unprobed line is absent, because
   * defaulting it to `Red` would claim a measurement that did not happen. `createSignificator`
   * wants a complete one, so this is where the two meet: a run that scored every line may seed a
   * profile, and a partial run may not. Seeding from a partial map would write a profile whose
   * missing lines read as Red, which is the exact claim the map was built to avoid.
   *
   * The completeness check is a RUNTIME one and the type is narrowed by hand, because a length
   * comparison does not make a `Partial<Record<…>>` a `Record<…>` to the compiler. The runtime
   * check is the real guard: the page's own completion condition is the same predicate, so the
   * branch below is unreachable when the button is rendered, and the assertion documents that.
   */
  const seedable = $derived.by<Readonly<Record<Line, Stage>> | null>(() => {
    if (Object.keys(altitudes).length !== ALL_LINES.length) return null;
    // Every line is present by the check above, so each read is defined. The filter is what makes
    // that true to the compiler without a cast: a partial map cannot reach this branch.
    const complete: Partial<Record<Line, Stage>> = { ...altitudes };
    return ALL_LINES.every((l) => complete[l] !== undefined)
      ? (complete as Record<Line, Stage>)
      : null;
  });
  const currentPrompt = $derived(current === null ? null : choicePromptFor(current));
  const currentHold = $derived(current === null ? null : holdTargetFor(current));

  function record(line: Line, answer: CalibrationAnswer): void {
    answers = { ...answers, [line]: answer };
    current = remainingLines(ALL_LINES, { ...answers, [line]: answer })[0] ?? null;
  }

  function startHold(): void {
    holdStartedAt = performance.now();
    holdElapsed = 0;
    // The counter is what makes the probe fair: without it the page reads "0.0s of 3.0s" until
    // release, so the player is holding blind and the measurement is of their memory, not their
    // timing.
    //
    // The visibility guard is the other half. A backgrounded tab keeps a `setInterval` alive, so a
    // player who switches away mid-hold returns to a hold that has silently run long and scores a
    // deliberate miss. Aborting on `visibilitychange` costs one measured probe and saves a false
    // one — a timing instrument that can be defeated by an alt-tab is not an instrument.
    if (tick !== null) clearInterval(tick);
    tick = setInterval(() => {
      if (holdStartedAt !== null) holdElapsed = Math.round(performance.now() - holdStartedAt);
    }, 100);
  }

  /** Discard an in-flight hold rather than scoring it. Called when the tab loses visibility. */
  function abortHold(): void {
    if (tick !== null) {
      clearInterval(tick);
      tick = null;
    }
    if (holdStartedAt === null) return;
    holdStartedAt = null;
    holdElapsed = 0;
    holdAborted = true;
  }

  function releaseHold(line: Line): void {
    if (tick !== null) {
      clearInterval(tick);
      tick = null;
    }
    if (holdStartedAt === null) return;
    const elapsed = Math.round(performance.now() - holdStartedAt);
    holdStartedAt = null;
    holdElapsed = 0;
    record(line, { kind: 'hold', elapsedMs: elapsed });
  }

  function answerChoice(line: Line, index: number): void {
    record(line, { kind: 'choice', choiceIndex: index });
  }

  /**
   * Carry the scored altitudes into a profile.
   *
   * The write goes through the SAME path `onboarding/+page.svelte:255` uses — `createSignificator`
   * then `localStorage.setItem('profile:v1', …)` then `setSignificator` — because that is the
   * established client-side writer for this key. Routing through `setSignificator` alone would
   * update the store and leave the durable save stale, so the run would vanish on reload; reaching
   * for a new abstraction instead would be a second binding for one serialization (M8).
   *
   * A calibration run is a seed, not a verdict: `stage` starts at `Red` and the game moves it as
   * the player plays. Applying it to an existing profile REPLACES the eight line altitudes and
   * nothing else, and the page says so on the button before the click.
   */
  function applyResult(): void {
    if (seedable === null) {
      applyError = 'A run that did not score every line cannot be used as a starting point.';
      return;
    }
    const sig = existing
      ? { ...existing, altitudes: { ...existing.altitudes, ...seedable } }
      : createSignificator(
          `sig-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          seedable,
          'Red',
        );
    // A GUARD THAT SKIPS THE WRITE WITHOUT SAYING SO IS A FALSE CLAIM. `if (browser)` on the
    // write alone skipped the storage call and then fell straight through to `saved = true`, so
    // the page could render "Saved to this device" having saved nothing — the same store-says-one-
    // thing-disk-says-another shape the settings reset and the /privacy delete both had. It cannot
    // fire from a click today, which is exactly why nothing caught it. The branch reports instead.
    if (!browser) {
      applyError = 'This page can only save from a browser, so nothing was written.';
      return;
    }
    try {
      localStorage.setItem('profile:v1', JSON.stringify(sig));
    } catch (err) {
      console.error('[calibrate] offline save failed:', err);
      applyError = 'The result could not be saved on this device, so it was not applied.';
      return;
    }
    setSignificator(sig as Significator);
    existing = sig as Significator;
    applyError = null;
    saved = true;
  }

  function restart(): void {
    answers = {};
    saved = false;
    applyError = null;
    holdAborted = false;
    current = ALL_LINES[0] ?? null;
  }
</script>

<Seo title="Calibration" description="A brief probe of each developmental line." />

<RouteShell title="Calibration" back="/settings" backLabel="Settings">
  <Stack>
    <Card padding="space-5">
      <p>Eight lines, one question each. This sets where you start; it is not a score.</p>
      {#if complete}
        <p data-testid="calibrate-complete">
          All eight lines probed. {Object.keys(altitudes).length} scored.
        </p>
      {:else}
        <p data-testid="calibrate-progress">
          {answeredCount} of {ALL_LINES.length} lines probed. {remaining.length} remaining.
        </p>
      {/if}
    </Card>

    {#if !complete && current !== null}
      {@const line = current}
      {@const hold = currentHold}
      {@const prompt = currentPrompt}
      <Card padding="space-5">
        <p class="eyebrow">{line}</p>
        {#if hold !== null}
          <p>
            Hold the button for about {(hold / 1000).toFixed(1)} seconds. This line is measured by
            timing rather than by a question, because a choice among words cannot tell us about it.
          </p>
          {#if holdStartedAt === null}
            <Button onclick={() => startHold()}>Start</Button>
          {:else}
            <p data-testid="hold-elapsed">
              Holding — {(holdElapsed / 1000).toFixed(1)}s of {(hold / 1000).toFixed(1)}s
            </p>
            <Button onclick={() => releaseHold(line)}>Release</Button>
          {/if}
          {#if holdAborted}
            <p data-testid="hold-aborted">That one was discarded when you left the page. Start again.</p>
          {/if}
        {:else if prompt}
          <p>{prompt.prompt}</p>
          <Stack>
            {#each prompt.options as option, i (option)}
              <Button onclick={() => answerChoice(line, i)}>{option}</Button>
            {/each}
          </Stack>
        {:else}
          <p>This line has no probe available, so it is left unprobed rather than guessed.</p>
        {/if}
      </Card>
    {/if}

    <Card padding="space-5">
      <p class="eyebrow">Per line</p>
      {#each progress as row (row.line)}
        <p data-testid="calibrate-row-{row.line}">
          {row.line} —
          {#if !row.answered}
            <span data-testid="state-unprobed">not probed</span>
          {:else if row.outcome === null}
            <span data-testid="state-unscored">answer out of contract</span>
          {:else}
            <span data-testid="state-stage">{row.outcome.stage}</span>
            · {feltSenseLabel(row.outcome.confidence)}
          {/if}
        </p>
      {/each}
    </Card>

    {#if complete}
      <Card padding="space-5">
        <p class="eyebrow">What this did</p>
        {#if saved}
          <p data-testid="calibrate-saved">
            Saved to this device as your starting altitudes. They move as you play.
          </p>
        {:else if applyError}
          <p data-testid="calibrate-error">{applyError}</p>
        {:else if existing}
          <p data-testid="calibrate-would-replace">
            A profile already exists. Carrying these altitudes in will replace the eight line
            altitudes in it; everything else in the profile is kept.
          </p>
          <Button onclick={applyResult}>Replace the eight altitudes</Button>
        {:else}
          <p>No profile exists yet, so this will create one seeded with these altitudes.</p>
          <Button onclick={applyResult}>Use these as your starting altitudes</Button>
        {/if}
        <Button onclick={restart}>Run it again</Button>
      </Card>
    {/if}
  </Stack>
</RouteShell>
