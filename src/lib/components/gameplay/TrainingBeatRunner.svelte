<script lang="ts">
  /**
   * TrainingBeatRunner — the browser GameUiPort for training beats (doc 40 §6.2,
   * GameLoop training weave). When a ScheduledEncounter has isTrainingBeat=true,
   * this component adapts the paradigm's TrialPlans to the browser: renders
   * stimuli, collects key/tap responses with latency, and feeds them back to
   * the pure BrainGameEngine.
   *
   * Parity (WIRE-7 / trainingBridge): the beat runs on the calibrated baseline
   * with the adaptive staircase, and its outcome persists through the same path
   * as the CLI session weave — TrialRecordStore + CognitiveIndex + Calibration —
   * then lands in the shared reflection view as a Veil-safe felt-sense echo.
   *
   * Veil compliance: on completion only the felt-sense phrase is shown — never
   * raw accuracy, RT, or performance composites.
   */

  import type { ScheduledEncounter } from '$core/domain/EncounterSpecNew.js';
  import { getParadigm } from '$core/braingame/registry.js';
  import { BrainGameEngine, type GameUiPort } from '$core/braingame/BrainGameEngine.js';
  import type {
    CollectedResponse,
    GameSummary,
    TrialPlan,
    TrialRecord,
  } from '$core/braingame/types.js';
  import { prepareTrainingBeat, persistTrainingBeat } from '$lib/engine/trainingBridge.js';
  import Card from '$lib/components/Card.svelte';
  import Button from '$lib/components/Button.svelte';
  import Stack from '$lib/components/Stack.svelte';

  interface Props {
    encounter: ScheduledEncounter;
    oncomplete: () => void;
    onerror: (msg: string) => void;
    onexit: () => void;
  }
  let { encounter, oncomplete, onerror, onexit }: Props = $props();

  type Phase = 'loading' | 'show' | 'collect' | 'between' | 'done' | 'error';
  let phase: Phase = $state('loading');
  let showLines: readonly string[] = $state([]);
  let stimulusGlyph: string | null = $state(null);
  let stimulusColor: string | null = $state(null);
  let stimulusIsText = $state(false);
  let stimulusText = $state('');
  let choiceChoices: readonly { id: string; label: string }[] | null = $state(null);
  let keyHints: readonly string[] = $state([]);
  let feltNote: string = $state('');

  // Trial plumbing
  let trialResolve: ((r: CollectedResponse) => void) | null = null;
  let trialStartNs = 0;
  let trialTimer: ReturnType<typeof setTimeout> | null = null;
  let keyHandler: ((e: KeyboardEvent) => void) | null = null;

  let engine: BrainGameEngine | null = null;
  // Trial records collected via the engine sink — persisted post-run (CLI parity).
  let collectedTrials: TrialRecord[] = [];

  $effect(() => {
    startBeat();
    return () => cleanup();
  });

  function cleanup(): void {
    if (trialTimer !== null) {
      clearTimeout(trialTimer);
      trialTimer = null;
    }
    if (keyHandler !== null) {
      window.removeEventListener('keydown', keyHandler);
      keyHandler = null;
    }
  }

  function uiPort(): GameUiPort {
    return {
      async show(lines) {
        phase = 'between';
        showLines = lines;
        await wait(lines.length > 0 ? 900 : 350);
      },
      async runTrial(plan: TrialPlan): Promise<CollectedResponse> {
        // Preamble: fixation or text, then stimulus.
        if (plan.preamble) {
          phase = 'show';
          if (plan.preamble.kind === 'fixation') {
            stimulusGlyph = '+';
            stimulusColor = null;
            stimulusIsText = false;
          } else if (plan.preamble.kind === 'text') {
            stimulusIsText = true;
            stimulusText = plan.preamble.lines.join('\n');
          }
          await wait(plan.preambleMs ?? 300);
        }
        phase = 'show';
        renderStimulus(plan);
        return await collectResponse(plan);
      },
      onAbort() {
        /* browser exit is handled via onexit */
      },
    };
  }

  function renderStimulus(plan: TrialPlan): void {
    stimulusGlyph = null;
    stimulusColor = null;
    stimulusIsText = false;
    stimulusText = '';
    const st = plan.stimulus;
    if (st.kind === 'symbol') {
      stimulusGlyph = st.glyph;
      stimulusColor = st.color ?? null;
    } else if (st.kind === 'text') {
      stimulusIsText = true;
      stimulusText = st.lines.join('\n');
    } else if (st.kind === 'grid') {
      stimulusIsText = true;
      stimulusText = chunkGrid(st.cells, st.columns).join('\n');
    }
  }

  function chunkGrid(cells: readonly string[], columns: number): string[] {
    const rows: string[] = [];
    for (let i = 0; i < cells.length; i += columns) {
      rows.push(cells.slice(i, i + columns).join(' '));
    }
    return rows;
  }

  function collectResponse(plan: TrialPlan): Promise<CollectedResponse> {
    return new Promise<CollectedResponse>((resolve) => {
      trialResolve = resolve;
      trialStartNs = performance.now() * 1e6;
      const spec = plan.response;
      if (spec.mode === 'choice') {
        choiceChoices = spec.choices;
        keyHints = [];
      } else if (spec.mode === 'key') {
        choiceChoices = null;
        keyHints = spec.labels ?? spec.keys;
      } else {
        // Passive trial (mode 'none'): no input window (CLI parity — timedOut).
        choiceChoices = null;
        keyHints = [];
        finish({ value: null, latencyNs: null, timedOut: true });
        return;
      }

      // Keyboard collection
      if (spec.mode === 'key') {
        keyHandler = (e: KeyboardEvent) => {
          const k = e.key.toLowerCase();
          if (spec.keys.includes(k)) {
            finish({ value: k, latencyNs: BigInt(Math.max(0, Math.floor(performance.now() * 1e6 - trialStartNs))), timedOut: false });
          }
        };
        window.addEventListener('keydown', keyHandler);
      }

      // Response window
      if (plan.windowMs > 0) {
        trialTimer = setTimeout(() => {
          finish({ value: null, latencyNs: null, timedOut: true });
        }, plan.windowMs);
      } else {
        finish({ value: null, latencyNs: null, timedOut: true });
      }
    });
  }

  function tapChoice(id: string): void {
    if (!trialResolve) return;
    finish({ value: id, latencyNs: BigInt(Math.max(0, Math.floor(performance.now() * 1e6 - trialStartNs))), timedOut: false });
  }

  function finish(r: CollectedResponse): void {
    if (trialTimer !== null) {
      clearTimeout(trialTimer);
      trialTimer = null;
    }
    if (keyHandler !== null) {
      window.removeEventListener('keydown', keyHandler);
      keyHandler = null;
    }
    const resolve = trialResolve;
    trialResolve = null;
    choiceChoices = null;
    phase = 'collect';
    resolve?.(r);
  }

  function wait(ms: number): Promise<void> {
    return new Promise((res) => setTimeout(res, ms));
  }

  async function startBeat(): Promise<void> {
    if (encounter.isTrainingBeat !== true || !encounter.trainingParadigmId) {
      // Not ours — surface honestly.
      onerror('This encounter is not a training beat.');
      return;
    }
    const paradigmId = encounter.trainingParadigmId;
    const p = getParadigm(paradigmId);
    if (!p) {
      onerror(`Unknown training paradigm: ${paradigmId}`);
      return;
    }
    phase = 'loading';
    try {
      // Calibrated start + adaptive staircase (same path as the CLI runner).
      const prepared = await prepareTrainingBeat(paradigmId);
      collectedTrials = [];
      engine = new BrainGameEngine({
        paradigm: p,
        ui: uiPort(),
        params: prepared.startParams,
        adjustDifficulty: prepared.adjust,
        sink: (record) => collectedTrials.push(record),
      });
      const summary: GameSummary = await engine.run();
      // Persist telemetry + index + calibration (CLI session-weave parity).
      await persistTrainingBeat(paradigmId, summary, collectedTrials);
      feltNote = summary.feltSenseHint;
      phase = 'done';
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      onerror(msg);
    }
  }

  function exitBeat(): void {
    onexit();
  }

  function complete(): void {
    oncomplete();
  }
</script>

<div class="training-runner">
  {#if phase === 'loading'}
    <div class="beat-center">
      <p class="beat-hint">The pattern forms…</p>
      <Button size="sm" variant="ghost" onclick={exitBeat}>Leave the practice</Button>
    </div>
  {:else if phase === 'between'}
    <div class="beat-center">
      {#each showLines as line (line)}
        <p class="beat-line">{line}</p>
      {/each}
    </div>
  {:else if phase === 'show' || phase === 'collect'}
    <div class="beat-center">
      {#if stimulusGlyph !== null}
        <span class="beat-glyph" style={stimulusColor ? `color: var(--mysterium-${stimulusColor === 'magenta' ? 'accent' : stimulusColor})` : ''}>{stimulusGlyph}</span>
      {:else if stimulusIsText}
        <pre class="beat-text">{stimulusText}</pre>
      {/if}
      {#if choiceChoices}
        <div class="beat-choices-wrap">
          <Stack gap="space-2">
          {#each choiceChoices as c (c.id)}
            <Button variant="ghost" onclick={() => tapChoice(c.id)}>{c.label}</Button>
          {/each}
          </Stack>
        </div>
      {:else if keyHints.length > 0}
        <p class="beat-hints">{keyHints.join('   ·   ')}</p>
      {/if}
    </div>
  {:else if phase === 'done'}
    <Card variant="elevated" padding="space-6">
      <Stack gap="space-3" align="center">
        <h2 class="beat-title">The exercise settles</h2>
        <p class="beat-felt">{feltNote}</p>
        <Button variant="primary" onclick={complete}>Continue</Button>
      </Stack>
    </Card>
  {/if}
</div>

<style>
  .training-runner {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 55vh;
  }
  .beat-center {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--mysterium-space-3);
    text-align: center;
  }
  .beat-glyph {
    font-size: 4rem;
    font-weight: 600;
    letter-spacing: 0.05em;
  }
  .beat-text {
    font-family: var(--mysterium-font-body);
    font-size: var(--mysterium-text-xl);
    white-space: pre-wrap;
  }
  .beat-line {
    font-family: var(--mysterium-font-body);
    font-size: var(--mysterium-text-lg);
    color: var(--mysterium-fg-muted);
  }
  .beat-hints {
    font-family: var(--mysterium-font-body);
    font-size: var(--mysterium-text-sm);
    color: var(--mysterium-fg-muted);
    letter-spacing: 0.08em;
  }
  .beat-hint {
    font-family: var(--mysterium-font-body);
    color: var(--mysterium-fg-muted);
  }
  .beat-choices-wrap {
    margin-top: var(--mysterium-space-4);
    min-width: 16rem;
  }
  .beat-title {
    font-size: var(--mysterium-text-xl);
  }
  .beat-felt {
    font-family: var(--mysterium-font-body);
    font-style: italic;
    color: var(--mysterium-fg-muted);
    max-width: 30rem;
  }
</style>
