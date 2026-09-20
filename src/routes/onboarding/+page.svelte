<script lang="ts">
  /**
   * /onboarding — the entry point for new players.
   *
   * BACKGROUND-AGENTIC-ARCHITECTURE Phase 2 rewrite: replaces the
   * deterministic CALIBRATION_PROMPTS list (8 fixed pre-authored
   * prompts) with a CalibrationAgent-driven loop.
   *
   * The flow is now:
   *   1. Welcome screen — explains the game.
   *   2. DirectorAgent generates a probe (Veil register, 4+1 contract).
   *      The probe is generated fresh from the current Director Agent
   *      state — two distinct Director states can produce different
   *      probes from identical inputs (anti-determinism, Decision 6).
   *   3. Player picks a polarity and writes a free-input (+1).
   *   4. POST /api/agent/observe (op="probe-response") advances
   *      calibration confidence through the DirectorAgent.
   *   5. When calibration confidence >= 0.8, the Director emits
   *      calibration_complete and we synthesize the Significator
   *      from accumulated lateral profiles. The loop is bounded by
   *      `MAX_PROBES` as a safety net against runaway LLM calls.
   *   6. Player is redirected to /play.
   *
   * Failure Integrity: if the Director surface returns an error frame,
   * we route the player to /setup (route guard). Deterministic
   * game-logic fallbacks are forbidden on this surface.
   *
   * The original CLI parity logic (Somatic / Willpower hold probes,
   * thresholdToStage mapping) is preserved as a *side-effect*
   * computed from accumulated MCQ polarities — never as a static
   * starting point.
   */

  import { goto } from '$app/navigation';
  import { browser } from '$app/environment';
  import Seo from '$lib/components/Seo.svelte';
  import Card from '$lib/components/Card.svelte';
  import Button from '$lib/components/Button.svelte';
  import Input from '$lib/components/Input.svelte';
  import Stack from '$lib/components/Stack.svelte';
  import Cluster from '$lib/components/Cluster.svelte';
  import Spinner from '$lib/components/Spinner.svelte';
  import Badge from '$lib/components/Badge.svelte';
  import { stageFade, stageFly } from '$lib/transitions/stageMotion.js';
  import { createSignificator } from '$core/domain/Significator.js';
  import { placeAllLines, altitudesFromPlacement } from '$core/onboarding/BinarySearchPlacement.js';
  import type { Line } from '$core/domain/Line.js';
  import type { Stage } from '$core/domain/Stage.js';
  import { stageOrdinal } from '$core/domain/Stage.js';
  import { ALL_LINES } from '$core/domain/Line.js';
  import { setSignificator } from '$lib/stores/gameStore.js';
  import { showToast } from '$lib/stores/toastStore.js';
  import {
    type AgenticProbe,
    type AgenticProbeResponse,
    type ProbePolarity,
    PROBE_POLARITIES,
  } from '$core/agent/AgenticProbe.js';

  const POLARITY_SET = new Set<ProbePolarity>(PROBE_POLARITIES);

  type Phase = 'welcome' | 'calibrating' | 'creating' | 'done' | 'offline';
  let phase: Phase = $state('welcome');

  // Director-driven calibration state
  let currentProbe = $state<AgenticProbe | null>(null);
  let selectedIndex = $state<number | null>(null);
  let freeText = $state('');
  let probeCount = $state(0);
  let calibrationProgress = $state(0);
  let sessionId = $state('');
  let offlineReason = $state('');
  let submitting = $state(false);

  // Hard upper bound on Director-driven loop length. The progressive
  // threshold (>= 0.8) is the primary stop; this guard catches any case
  // where the LLM under-weights and would never reach 0.8.
  const MAX_PROBES = 6;

  // polarity log: each entry is (line, polarity) so we can roll up
  // lateral profiles when calibration completes.
  const polarityLog: Array<{ line: Line; polarity: ProbePolarity }> = [];

  function newSessionId(): string {
    return `sess-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function beginCalibration() {
    if (!browser) return;
    phase = 'calibrating';
    sessionId = newSessionId();
    selectedIndex = null;
    freeText = '';
    probeCount = 0;
    polarityLog.length = 0;
    calibrationProgress = 0;
    void fetchNextProbe();
  }

  async function fetchNextProbe(): Promise<void> {
    submitting = true;
    try {
      const res = await fetch(`/api/agent/probe?session=${encodeURIComponent(sessionId)}`);
      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response body');
      const decoder = new TextDecoder();
      let buf = '';
      let found: { probe?: AgenticProbe; error?: string } = {};
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const pieces = buf.split('\n\n');
        buf = pieces.pop() ?? '';
        for (const piece of pieces) {
          for (const line of piece.split('\n')) {
            if (!line.startsWith('data:')) continue;
            const raw = line.slice(5).trim();
            if (!raw || raw === '[DONE]') continue;
            try {
              const frame = JSON.parse(raw);
              if (frame['probe']) found.probe = frame['probe'] as AgenticProbe;
              if (frame['error']) found.error = frame['error'] as string;
              if (frame['signal'] && typeof frame['signal']['calibrationProgress'] === 'number') {
                calibrationProgress = frame['signal']['calibrationProgress'];
              }
              if (frame['signal']?.calibrationComplete) {
                found = { probe: undefined, error: undefined };
                phase = 'creating';
                return;
              }
            } catch {
              // ignore malformed line
            }
          }
        }
      }
      if (found.error) {
        offlineReason = found.error;
        phase = 'offline';
        return;
      }
      if (found.probe) {
        currentProbe = found.probe;
        selectedIndex = null;
        freeText = '';
      } else {
        offlineReason = 'No probe was returned by the Director.';
        phase = 'offline';
      }
    } catch (err) {
      offlineReason = err instanceof Error ? err.message : String(err);
      phase = 'offline';
    } finally {
      submitting = false;
    }
  }

  function selectChoice(idx: number) {
    selectedIndex = idx;
  }

  async function submitResponse() {
    if (!currentProbe || selectedIndex === null) return;
    submitting = true;
    try {
      const opt = currentProbe.options[selectedIndex];
      if (!opt || !POLARITY_SET.has(opt.polarity)) {
        offlineReason = 'Selected option is not aligned with the contract.';
        phase = 'offline';
        return;
      }

      const response: AgenticProbeResponse = {
        probeId: currentProbe.id,
        selectedPolarity: opt.polarity,
        selectedIndex: selectedIndex as 0 | 1 | 2 | 3,
        freeInput: freeText,
      };
      // FIX: distribute probes across 8 lines (was hardcoded to Cognitive for all)
      const lineForThisProbe = ALL_LINES[probeCount % ALL_LINES.length]!;
      polarityLog.push({ line: lineForThisProbe, polarity: opt.polarity });

      const obsRes = await fetch('/api/agent/observe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ op: 'probe-response', sessionId, response }),
      });
      const obsData = (await obsRes.json()) as {
        ok?: boolean;
        snapshot?: { calibrationProgress?: number; calibrationComplete?: boolean };
      };
      if (!obsData.ok) {
        offlineReason = 'DirectorAgent rejected the probe response.';
        phase = 'offline';
        return;
      }

      if (typeof obsData.snapshot?.calibrationProgress === 'number') {
        calibrationProgress = obsData.snapshot.calibrationProgress;
      }
      probeCount++;

      if (obsData.snapshot?.calibrationComplete || probeCount >= MAX_PROBES) {
        await completeCalibration();
      } else {
        await fetchNextProbe();
      }
    } catch (err) {
      offlineReason = err instanceof Error ? err.message : String(err);
      phase = 'offline';
    } finally {
      submitting = false;
    }
  }

  /**
   * Polarity evidence → stage verdict for one line (doc ONBOARDING-REDESIGN).
   * Upper-quadrant gravitation (integrative/communion) is treated as a
   * capacity signal: high ratio passes the probed stage. Confidence scales
   * with sample size — thin evidence is genuinely ambiguous, which the
   * binary search handles via its extra-trials and bounds machinery.
   */
  function probeOutcomeForLine(line: Line, stage: Stage): { outcome: 'pass' | 'fail'; confidence: number } {
    const forLine = polarityLog.filter((p) => p.line === line);
    // If this line had no probe, fall back to global distribution so early
    // exit (probeCount < 8) still seeds sensibly.
    const source = forLine.length > 0 ? forLine : polarityLog;
    const ratios = source.reduce((acc, p) => {
      acc[p.polarity] = (acc[p.polarity] ?? 0) + 1;
      return acc;
    }, {} as Record<ProbePolarity, number>);
    const upper = (ratios['integrative'] ?? 0) + (ratios['communion'] ?? 0);
    const total = source.length || 1;
    const upperRatio = upper / total;
    // Stage gates: the ratio required to pass climbs with the stage.
    const stageGates: Record<string, number> = {
      Infrared: 0.05, Magenta: 0.1, Red: 0.2, Amber: 0.34,
      Orange: 0.5, Green: 0.66, Teal: 0.8, Turquoise: 0.95,
    };
    const gate = stageGates[stage] ?? 0.34;
    const margin = upperRatio - gate;
    // Confidence: distance from the gate, damped by sample size.
    const confidence = Math.min(1, Math.abs(margin) * 2) * (source.length / (source.length + 2));
    return { outcome: margin >= 0 ? 'pass' : 'fail', confidence };
  }

  async function completeOffline() {
    phase = 'creating';
    const altitudes: Record<Line, Stage> = {} as Record<Line, Stage>;
    for (const line of ALL_LINES) altitudes[line] = 'Red';
    const id = `sig-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const sig = createSignificator(id, altitudes, 'Red');
    try {
      if (browser) localStorage.setItem('profile:v1', JSON.stringify(sig));
    } catch (err) {
      console.error('[onboarding] offline save failed:', err);
      showToast('Failed to save progress', 'danger');
      phase = 'welcome';
      return;
    }
    setSignificator(sig);
    showToast('Starting from Red — the game will learn as you play', 'success', 3000);
    phase = 'done';
    setTimeout(() => goto('/play'), 1200);
  }

  async function completeCalibration() {
    phase = 'creating';
    // Kernel placement: binary-search each line's altitude from the polarity
    // evidence (doc ONBOARDING-REDESIGN-PLAN — the composite replaces the
    // single-probe heuristic). Placement is pure and instant — no extra
    // probes are shown to the player; the MCQ answers ARE the evidence.
    const placement = placeAllLines((line, stage) => {
      const { outcome, confidence } = probeOutcomeForLine(line, stage);
      return { outcome, confidence };
    });
    const { altitudes } = altitudesFromPlacement(placement);

    const currentStage = (Object.values(altitudes) as Stage[]).reduce<Stage>(
      (max, s) => (stageOrdinal(s) > stageOrdinal(max) ? s : max),
      'Red',
    );

    const id = `sig-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const sig = createSignificator(id, altitudes as Record<Line, Stage>, currentStage);

    try {
      if (browser) localStorage.setItem('profile:v1', JSON.stringify(sig));
    } catch (err) {
      console.error('[onboarding] failed to persist Significator:', err);
      showToast('Failed to save progress', 'danger');
      phase = 'calibrating';
      void err;
      return;
    }

    setSignificator(sig);
    showToast('Calibration complete — your journey begins', 'success', 3000);
    phase = 'done';
    setTimeout(() => goto('/play'), 1200);
  }
</script>

<Seo
  title="Begin"
  description="A new beginning — your developmental journey starts here."
  indexable={false}
/>

<div class="onboarding-route" in:stageFade={{ duration: 600 }}>
  <div class="onboarding-content">
    {#if phase === 'welcome'}
      <div in:stageFly={{ y: 20, duration: 500 }}>
        <Stack gap="space-6" align="center">
          <div class="welcome-mark" aria-hidden="true">Mysterium</div>
          <h1 class="welcome-title">A journey of healing and evolution</h1>
          <p class="welcome-text">
            Every encounter here is a developmental practice — a way to see yourself
            more clearly and grow across eight dimensions of intelligence. The game
            learns from how you engage, and the world shifts to meet you.
          </p>
          <p class="welcome-sub">
            First, a brief calibration: 8 short questions to set your starting altitudes.
            There are no wrong answers.
          </p>
          <Button variant="primary" size="lg" onclick={beginCalibration}>
            Begin Calibration
          </Button>
        </Stack>
      </div>
    {:else if phase === 'calibrating' && currentProbe}
      <div in:stageFade={{ duration: 400 }}>
        <Stack gap="space-5">
          <Cluster gap="space-2" justify="between" wrap={false}>
            <h2 class="calibration-title">Calibration</h2>
            <Badge variant="default">{probeCount + 1} · {(calibrationProgress * 100).toFixed(0)}%</Badge>
          </Cluster>

          <Card variant="elevated" padding="space-6">
            <Stack gap="space-4">
              <p class="prompt-text">{currentProbe.prompt}</p>
              <Stack gap="space-2">
                {#each currentProbe.options as option, i (i)}
                  <button
                    class="option"
                    class:selected={selectedIndex === i}
                    onclick={() => selectChoice(i)}
                    aria-pressed={selectedIndex === i}
                    data-polarity={option.polarity}
                  >
                    <span class="option-marker" aria-hidden="true">
                      {#if selectedIndex === i}●{:else}○{/if}
                    </span>
                    <span class="option-label">{option.label}</span>
                    <span class="option-polarity" aria-label="polarity">{option.polarity}</span>
                  </button>
                {/each}
              </Stack>
              <label class="free-input-label" for="onboarding-free-input">+1 free input</label>
              <Input
                id="onboarding-free-input"
                placeholder={currentProbe.freeInputPlaceholder}
                value={freeText}
                oninput={(v) => (freeText = v)}
              />
            </Stack>
          </Card>
          <Cluster gap="space-3" justify="end">
            <Button variant="primary" onclick={submitResponse} disabled={selectedIndex === null || submitting}>
              {submitting ? 'Tracing…' : 'Send'}
            </Button>
          </Cluster>
        </Stack>
      </div>
    {:else if phase === 'creating'}
      <div in:stageFade={{ duration: 400 }}>
        <Stack gap="space-4" align="center">
          <Spinner size="lg" />
          <p class="creating-text">The world takes shape...</p>
        </Stack>
      </div>
    {:else if phase === 'done'}
      <div in:stageFade={{ duration: 500 }}>
        <Stack gap="space-4" align="center">
          <div class="done-mark" aria-hidden="true">✦</div>
          <p class="done-text">Your journey begins</p>
        </Stack>
      </div>
    {:else if phase === 'offline'}
      <div in:stageFade={{ duration: 400 }}>
        <Stack gap="space-4" align="center">
          <h2 class="calibration-title">Director is silent</h2>
          <p class="welcome-text">
            The calibration service is offline. You can continue with a gentle
            starting point and the game will learn as you play — or connect
            an LLM and return for a richer calibration.
          </p>
          <p class="error-detail">{offlineReason}</p>
          <Cluster gap="space-3">
            <Button variant="primary" onclick={completeOffline}>Continue offline</Button>
            <Button variant="ghost" onclick={() => goto('/setup')}>Open /setup</Button>
            <Button variant="ghost" onclick={() => goto('/')}>Back</Button>
          </Cluster>
        </Stack>
      </div>
    {/if}
  </div>
</div>

<style>
  .onboarding-route {
    min-height: 100vh;
    min-height: 100dvh;
    background: var(--mysterium-bg);
    color: var(--mysterium-fg);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--mysterium-space-5) var(--mysterium-space-4);
    padding-top: calc(var(--mysterium-space-5) + env(safe-area-inset-top, 0px));
    padding-bottom: calc(var(--mysterium-space-5) + env(safe-area-inset-bottom, 0px) + var(--mysterium-nav-height));
    overflow-y: auto;
  }

  .onboarding-content {
    width: 100%;
    max-width: var(--mysterium-content-max-width-narrow);
  }

  .welcome-mark {
    font-family: var(--mysterium-font-display);
    font-size: var(--mysterium-text-3xl);
    font-weight: 700;
    color: var(--mysterium-accent);
    letter-spacing: var(--mysterium-tracking-wider);
    line-height: 1;
  }

  .welcome-title {
    font-family: var(--mysterium-font-display);
    font-size: var(--mysterium-text-2xl);
    font-weight: 700;
    color: var(--mysterium-fg);
    text-align: center;
    margin: 0;
    letter-spacing: var(--mysterium-tracking-wide);
  }

  .welcome-text {
    font-family: var(--mysterium-font-body);
    font-size: var(--mysterium-text-base);
    line-height: var(--mysterium-leading-relaxed);
    color: var(--mysterium-fg-muted);
    text-align: center;
    max-width: 32rem;
    margin: 0;
  }

  .welcome-sub {
    font-family: var(--mysterium-font-body);
    font-size: var(--mysterium-text-sm);
    color: var(--mysterium-fg-muted);
    text-align: center;
    font-style: italic;
    margin: 0;
  }

  .calibration-title {
    font-family: var(--mysterium-font-display);
    font-size: var(--mysterium-text-xl);
    font-weight: 700;
    color: var(--mysterium-accent);
    margin: 0;
    letter-spacing: var(--mysterium-tracking-wide);
  }

  .prompt-text {
    font-family: var(--mysterium-font-body);
    font-size: var(--mysterium-text-md);
    line-height: var(--mysterium-leading-relaxed);
    color: var(--mysterium-fg);
    margin: 0;
  }

  .option {
    display: flex;
    align-items: flex-start;
    gap: var(--mysterium-space-3);
    width: 100%;
    padding: var(--mysterium-space-3) var(--mysterium-space-4);
    background: var(--mysterium-surface);
    border: 1px solid var(--mysterium-border);
    border-radius: var(--mysterium-radius);
    cursor: pointer;
    text-align: left;
    color: var(--mysterium-fg);
    font-family: var(--mysterium-font-body);
    font-size: var(--mysterium-text-sm);
    -webkit-tap-highlight-color: transparent;
    transition: background var(--mysterium-duration-fast) var(--mysterium-ease),
                border-color var(--mysterium-duration-fast) var(--mysterium-ease);
  }

  .option:hover {
    background: var(--mysterium-surface-elevated);
    border-color: var(--mysterium-accent);
  }

  .option.selected {
    background: var(--mysterium-accent-soft);
    border-color: var(--mysterium-accent);
    color: var(--mysterium-accent-fg);
  }

  .option-marker {
    flex-shrink: 0;
    color: var(--mysterium-accent);
  }

  .option.selected .option-marker {
    color: var(--mysterium-accent-fg);
  }

  .creating-text {
    font-family: var(--mysterium-font-body);
    font-size: var(--mysterium-text-sm);
    color: var(--mysterium-fg-muted);
    font-style: italic;
  }

  .done-mark {
    font-size: var(--mysterium-text-3xl);
    color: var(--mysterium-accent);
    animation: done-pulse 1.5s var(--mysterium-ease) infinite;
  }

  @keyframes done-pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.6; transform: scale(1.15); }
  }

  .done-text {
    font-family: var(--mysterium-font-display);
    font-size: var(--mysterium-text-lg);
    color: var(--mysterium-fg);
  }

  .option-polarity {
    margin-left: auto;
    font-size: var(--mysterium-text-xs);
    color: var(--mysterium-fg-muted);
    text-transform: lowercase;
    letter-spacing: var(--mysterium-tracking-wide);
  }

  .free-input-label {
    font-size: var(--mysterium-text-xs);
    color: var(--mysterium-fg-muted);
    text-transform: uppercase;
    letter-spacing: var(--mysterium-tracking-wider);
  }

  .error-detail {
    font-family: var(--mysterium-font-mono, monospace);
    font-size: var(--mysterium-text-xs);
    color: var(--mysterium-fg-muted);
    text-align: center;
    max-width: 28rem;
    margin: 0;
    word-break: break-word;
  }
</style>
