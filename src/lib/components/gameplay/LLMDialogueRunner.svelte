<script lang="ts">
  /**
   * LLMDialogueRunner — Svelte-native replacement for LLMDialogueRenderer.
   *
   * Implements the AgenticUIHandler interface. The gameEngine.runEncounter()
   * calls askUser(params) → this component renders the questions and returns
   * the user's answers via a Promise.
   *
   * Flow:
   *   1. gameEngine creates AgenticOrchestrator with this component as uiHandler
   *   2. Orchestrator calls LLM, gets ask_user_question tool call
   *   3. Orchestrator calls uiHandler.askUser(params) → we render + await user
   *   4. User selects options + optionally writes in
   *   5. We resolve the Promise with the answers
   *   6. Orchestrator continues until complete_encounter
   *   7. We call oncomplete
   */

  import type {
    AskUserQuestionParams,
    AskUserQuestionResult,
    MCQQuestion,
    UserAnswer,
  } from '$core/assessments/agentTypes.js';
  import type { AgenticUIHandler } from '$core/assessments/AgenticOrchestrator.js';
  import type { ScheduledEncounter } from '$core/domain/EncounterSpecNew.js';
  import { runEncounter } from '$lib/engine/gameEngine.js';
  import Card from '$lib/components/Card.svelte';
  import Button from '$lib/components/Button.svelte';
  import Input from '$lib/components/Input.svelte';
  import Stack from '$lib/components/Stack.svelte';
  import Cluster from '$lib/components/Cluster.svelte';
  import Badge from '$lib/components/Badge.svelte';
  import Spinner from '$lib/components/Spinner.svelte';
  import { stageFade, stageFly } from '$lib/transitions/stageMotion.js';
  import { showToast } from '$lib/stores/toastStore.js';

  interface Props {
    encounter: ScheduledEncounter;
    oncomplete: () => void;
    onerror: (message: string) => void;
    onexit: () => void;
  }

  let { encounter, oncomplete, onerror, onexit }: Props = $props();

  // ─── State ──────────────────────────────────────────────────────────

  type Phase = 'starting' | 'asking' | 'processing' | 'complete' | 'error';
  let phase: Phase = $state('starting');
  let currentQuestion: MCQQuestion | null = $state(null);
  let questionIndex: number = $state(0);
  let totalQuestions: number = $state(0);
  let errorMessage: string | null = $state(null);

  // User response state
  let selectedLabels: Set<string> = $state(new Set());
  let writeInValue: string = $state('');
  let showWriteIn: boolean = $state(false);

  // Pending Promise resolver (the orchestrator is waiting on this).
  // Resolves per-question with one UserAnswer; the handler assembles them
  // into AskUserQuestionResult when all questions are answered.
  let pendingResolver: ((answer: UserAnswer) => void) | null = null;

  // ─── AgenticUIHandler implementation ───────────────────────────────

  const uiHandler: AgenticUIHandler = {
    async askUser(params: AskUserQuestionParams): Promise<AskUserQuestionResult> {
      const answers: UserAnswer[] = [];

      for (let i = 0; i < params.questions.length; i++) {
        const q = params.questions[i]!;
        questionIndex = i;
        totalQuestions = params.questions.length;
        currentQuestion = q;
        selectedLabels = new Set();
        writeInValue = '';
        showWriteIn = false;
        phase = 'asking';

        // ponytail: B9 fix — race the user response against abort.
        // If the player exits, reject with AbortError so the orchestrator stops.
        const answer = await new Promise<UserAnswer>((resolve, reject) => {
          pendingResolver = resolve;
          const onAbort = () => {
            abortController?.signal.removeEventListener('abort', onAbort);
            reject(new DOMException('Encounter aborted', 'AbortError'));
          };
          if (abortController?.signal.aborted) {
            onAbort();
          } else {
            abortController?.signal.addEventListener('abort', onAbort);
          }
        });

        answers.push(answer);
      }

      return { answers };
    },
  };

  // ponytail: B9 fix — AbortController lets us cancel the orchestrator cleanly
  // when the player exits, instead of feeding it a fake response string.
  let abortController: AbortController | null = null;

  // ─── Lifecycle ──────────────────────────────────────────────────────

  $effect(() => {
    // Start the encounter once on mount
    if (phase === 'starting') {
      startEncounter();
    }
  });

  async function startEncounter() {
    try {
      phase = 'starting';
      abortController = new AbortController();
      await runEncounter(encounter, uiHandler, { signal: abortController.signal });
      phase = 'complete';
      showToast('Encounter complete', 'success', 3000);
      // Brief delay so the user sees the "complete" state before transition
      setTimeout(() => oncomplete(), 800);
    } catch (err) {
      // ponytail: B9 fix — AbortError is expected when the player exits; not an error.
      if (err instanceof DOMException && err.name === 'AbortError') {
        // Player exited — onexit() already called by exitEncounter. No-op here.
        return;
      }
      const msg = err instanceof Error ? err.message : String(err);
      errorMessage = msg;
      phase = 'error';
      onerror(msg);
    }
  }

  // ─── User interaction ───────────────────────────────────────────────

  function toggleOption(label: string) {
    if (currentQuestion?.multiSelect) {
      const next = new Set(selectedLabels);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      selectedLabels = next;
    } else {
      // Single-select: replace
      selectedLabels = new Set([label]);
    }
  }

  function toggleWriteIn() {
    showWriteIn = !showWriteIn;
    if (!showWriteIn) {
      writeInValue = '';
    }
  }

  function submitAnswer() {
    if (!pendingResolver) return;

    const labels = Array.from(selectedLabels);
    const hasWriteIn = showWriteIn && writeInValue.trim().length > 0;

    if (labels.length === 0 && !hasWriteIn) {
      showToast('Choose an option or write your own response', 'warning', 2500);
      return;
    }

    const answer: UserAnswer = {
      selectedLabels: labels,
      writeInValue: hasWriteIn ? writeInValue.trim() : undefined,
    };

    phase = 'processing';
    pendingResolver(answer);
    pendingResolver = null;
  }

  function exitEncounter() {
    // ponytail: B9 fix — abort the orchestrator cleanly instead of feeding
    // it a fake response string. The orchestrator throws AbortError, which
    // startEncounter() catches and treats as a clean exit.
    abortController?.abort();
    abortController = null;
    if (pendingResolver) {
      // If we're mid-question, reject the pending Promise so the orchestrator's
      // askUser() doesn't hang. The abort signal will propagate.
      pendingResolver = null;
    }
    onexit();
  }
</script>

<div class="dialogue-runner">
  {#if phase === 'starting'}
    <div class="runner-loading" in:stageFade={{ duration: 400 }}>
      <Spinner size="lg" />
      <p class="loading-text">The scene forms...</p>
    </div>
  {:else if phase === 'asking' && currentQuestion}
    <div class="question-view" in:stageFly={{ y: 20, duration: 400 }}>
      <Cluster gap="space-2" justify="between" wrap={false} class="question-meta">
        <Badge variant="accent">{encounter.modality}</Badge>
        {#if totalQuestions > 1}
          <Badge variant="default">{questionIndex + 1} / {totalQuestions}</Badge>
        {/if}
      </Cluster>

      <Card variant="elevated" padding="space-6" class="question-card">
        <Stack gap="space-5">
          <div class="question-text">{currentQuestion.question}</div>

          <Stack gap="space-2" class="options-list">
            {#each currentQuestion.options as option, i (option.label)}
              <button
                class="option"
                class:selected={selectedLabels.has(option.label)}
                onclick={() => toggleOption(option.label)}
                aria-pressed={selectedLabels.has(option.label)}
                style="animation-delay: {i * 60}ms"
              >
                <div class="option-marker" aria-hidden="true">
                  {#if currentQuestion.multiSelect}
                    {#if selectedLabels.has(option.label)}✓{:else}○{/if}
                  {:else}
                    {#if selectedLabels.has(option.label)}●{:else}○{/if}
                  {/if}
                </div>
                <div class="option-content">
                  <div class="option-label">{option.label}</div>
                  {#if option.description}
                    <div class="option-desc">{option.description}</div>
                  {/if}
                </div>
              </button>
            {/each}
          </Stack>

          {#if currentQuestion.allowWriteIn}
            <div class="writein-section">
              {#if showWriteIn}
                <Input
                  type="textarea"
                  value={writeInValue}
                  oninput={(v) => writeInValue = v}
                  placeholder="Speak in your own words..."
                  maxlength={500}
                />
              {:else}
                <button class="writein-toggle" onclick={toggleWriteIn}>
                  + Write your own response
                </button>
              {/if}
            </div>
          {/if}
        </Stack>
      </Card>

      <Cluster gap="space-3" justify="between" class="question-actions">
        <Button variant="ghost" onclick={exitEncounter}>Leave</Button>
        <Button variant="primary" onclick={submitAnswer} disabled={selectedLabels.size === 0 && !writeInValue.trim()}>
          Respond
        </Button>
      </Cluster>
    </div>
  {:else if phase === 'processing'}
    <div class="runner-loading" in:stageFade={{ duration: 200 }}>
      <Spinner size="md" />
      <p class="loading-text">The moment settles...</p>
    </div>
  {:else if phase === 'complete'}
    <div class="runner-complete" in:stageFade={{ duration: 400 }}>
      <div class="complete-icon" aria-hidden="true">✦</div>
      <p class="complete-text">The encounter concludes</p>
    </div>
  {:else if phase === 'error'}
    <div class="runner-error" in:stageFade={{ duration: 400 }}>
      <p class="error-title">The way is blocked</p>
      <p class="error-detail">{errorMessage}</p>
      <Button variant="primary" onclick={exitEncounter}>Return</Button>
    </div>
  {/if}
</div>

<style>
  .dialogue-runner {
    width: 100%;
    min-height: 60vh;
  }

  .runner-loading,
  .runner-complete,
  .runner-error {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--mysterium-space-4);
    padding: var(--mysterium-space-8) var(--mysterium-space-4);
    color: var(--mysterium-fg);
    text-align: center;
  }

  .loading-text {
    font-family: var(--mysterium-font-body);
    font-size: var(--mysterium-text-sm);
    color: var(--mysterium-fg-muted);
    font-style: italic;
  }

  .complete-icon {
    font-size: var(--mysterium-text-3xl);
    color: var(--mysterium-accent);
    animation: complete-pulse 1.5s var(--mysterium-ease) infinite;
  }

  @keyframes complete-pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.6; transform: scale(1.15); }
  }

  .complete-text {
    font-family: var(--mysterium-font-display);
    font-size: var(--mysterium-text-lg);
    color: var(--mysterium-fg);
  }

  .error-title {
    font-family: var(--mysterium-font-display);
    font-size: var(--mysterium-text-lg);
    color: var(--mysterium-danger);
  }

  .error-detail {
    font-family: var(--mysterium-font-body);
    font-size: var(--mysterium-text-sm);
    color: var(--mysterium-fg-muted);
    max-width: 32rem;
  }

  .question-view {
    display: flex;
    flex-direction: column;
    gap: var(--mysterium-space-4);
  }

  .question-meta {
    min-height: 1.5rem;
  }

  .question-card {
    width: 100%;
  }

  .question-text {
    font-family: var(--mysterium-font-body);
    font-size: var(--mysterium-text-md);
    line-height: var(--mysterium-leading-relaxed);
    color: var(--mysterium-fg);
    white-space: pre-wrap;
  }

  .options-list {
    gap: var(--mysterium-space-2);
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
    -webkit-tap-highlight-color: transparent;
    transition: background var(--mysterium-duration-fast) var(--mysterium-ease),
                border-color var(--mysterium-duration-fast) var(--mysterium-ease),
                transform var(--mysterium-duration-instant) var(--mysterium-ease);
    animation: option-enter var(--mysterium-duration-base) var(--mysterium-ease-out) backwards;
  }

  @keyframes option-enter {
    from { opacity: 0; transform: translateX(-8px); }
    to { opacity: 1; transform: translateX(0); }
  }

  .option:hover {
    background: var(--mysterium-surface-elevated);
    border-color: var(--mysterium-accent);
  }

  .option:active {
    transform: scale(0.99);
  }

  .option:focus-visible {
    outline: 2px solid var(--mysterium-accent);
    outline-offset: 2px;
  }

  .option.selected {
    background: var(--mysterium-accent-soft);
    border-color: var(--mysterium-accent);
    color: var(--mysterium-accent-fg);
  }

  .option-marker {
    flex-shrink: 0;
    width: 1.5rem;
    height: 1.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: var(--mysterium-text-base);
    color: var(--mysterium-accent);
  }

  .option.selected .option-marker {
    color: var(--mysterium-accent-fg);
  }

  .option-content {
    flex: 1;
    min-width: 0;
  }

  .option-label {
    font-size: var(--mysterium-text-base);
    font-weight: 500;
    line-height: var(--mysterium-leading-normal);
  }

  .option-desc {
    font-size: var(--mysterium-text-sm);
    color: var(--mysterium-fg-muted);
    margin-top: var(--mysterium-space-1);
    line-height: var(--mysterium-leading-normal);
  }

  .option.selected .option-desc {
    color: color-mix(in srgb, var(--mysterium-accent-fg) 80%, transparent);
  }

  .writein-section {
    margin-top: var(--mysterium-space-2);
  }

  .writein-toggle {
    background: transparent;
    border: 1px dashed var(--mysterium-border);
    border-radius: var(--mysterium-radius);
    padding: var(--mysterium-space-3) var(--mysterium-space-4);
    color: var(--mysterium-fg-muted);
    font-family: var(--mysterium-font-body);
    font-size: var(--mysterium-text-sm);
    cursor: pointer;
    width: 100%;
    text-align: left;
    -webkit-tap-highlight-color: transparent;
    transition: border-color var(--mysterium-duration-fast) var(--mysterium-ease),
                color var(--mysterium-duration-fast) var(--mysterium-ease);
  }

  .writein-toggle:hover {
    border-color: var(--mysterium-accent);
    color: var(--mysterium-accent);
  }

  .question-actions {
    margin-top: var(--mysterium-space-2);
  }
</style>
