# Mysterium Backend & CLI Upgrades Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix critical bugs in the Mysterium CLI and backend engines, including false-positive LLM error handling, fallback path stagnation, CLI forcing constraints, scheduling priority collapse, and recency tracking.

**Architecture:** Extend the core candidate generation and scheduling engines to support custom session forcing flags, add semantic fallback response mapping to drive scoring/polarity, fix slicing bugs, and implement modality-specific CLI rendering.

**Tech Stack:** TypeScript, Node.js, Vitest, tsx.

---

### Task 1: Fix LLM False-Positive Error Check

**Files:**
- Modify: `src/core/assessments/AgenticOrchestrator.ts:210-213`
- Test: `tests/core/assessments/AgenticOrchestrator.test.ts`

- [ ] **Step 1: Write a failing test for false positive error detection**
  Update `tests/core/assessments/AgenticOrchestrator.test.ts` to add a test case showing that a normal markdown response containing the word "error" in quotes does NOT trigger the fallback mechanism, but a literal JSON error object does.
  
  Add to `tests/core/assessments/AgenticOrchestrator.test.ts`:
  ```typescript
  it('should not trigger fallback when markdown content contains the word error', async () => {
    // Test logic to mock queryLLMWithTools returning content: "The Conqueror says: 'This is not an error.'"
    // Verify that runFallback is not called.
  });
  ```

- [ ] **Step 2: Run tests to verify failure**
  Run: `npx vitest run tests/core/assessments/AgenticOrchestrator.test.ts`
  Expected: FAIL (or verify the error check behaves as false-positive)

- [ ] **Step 3: Implement the fix in AgenticOrchestrator.ts**
  Modify line 211 in `src/core/assessments/AgenticOrchestrator.ts`:
  ```typescript
  // Replace:
  if (loopCount === 1 && res.content && res.content.includes('"error"') && (!res.toolCalls || res.toolCalls.length === 0)) {
  
  // With:
  if (loopCount === 1 && res.content && res.content.startsWith('{"error"') && (!res.toolCalls || res.toolCalls.length === 0)) {
  ```

- [ ] **Step 4: Run tests to verify they pass**
  Run: `npx vitest run tests/core/assessments/AgenticOrchestrator.test.ts`
  Expected: PASS

- [ ] **Step 5: Commit**
  ```bash
  git add src/core/assessments/AgenticOrchestrator.ts tests/core/assessments/AgenticOrchestrator.test.ts
  git commit -m "bugfix: fix false-positive LLM error detection in orchestrator"
  ```

---

### Task 2: Implement Differentiated Fallback in AgenticOrchestrator

**Files:**
- Modify: `src/core/assessments/AgenticOrchestrator.ts`
- Test: `tests/core/assessments/AgenticOrchestrator.test.ts`

- [ ] **Step 1: Write tests for fallback response evaluation**
  Add a test in `tests/core/assessments/AgenticOrchestrator.test.ts` that asserts choosing option `'attack'` returns STS polarity with high Agency/Eros, while `'negotiate'` returns STO polarity with high Communion/Agape, and `'withdraw'` returns `passed: false`.

- [ ] **Step 2: Run tests to verify they fail**
  Run: `npx vitest run tests/core/assessments/AgenticOrchestrator.test.ts`
  Expected: FAIL

- [ ] **Step 3: Implement evaluateFallbackResponse helper and update runFallback**
  Add `evaluateFallbackResponse` as a private method in `src/core/assessments/AgenticOrchestrator.ts` and use it to populate `fallbackParams` in `runFallback`:
  ```typescript
  private evaluateFallbackResponse(selectedLabel: string): {
    passed: boolean;
    polarityDirection: 'sto' | 'sts' | 'neutral';
    driveScores: { agency: number; communion: number; eros: number; agape: number };
    driveSignals: { agency: string; communion: string; eros: string; agape: string };
    feedback: string;
  } {
    const label = selectedLabel.toLowerCase();

    let passed = true;
    let polarityDirection: 'sto' | 'sts' | 'neutral' = 'neutral';
    const driveScores = { agency: 0.5, communion: 0.5, eros: 0.5, agape: 0.5 };
    const driveSignals = {
      agency: 'HealthyBalanced',
      communion: 'HealthyBalanced',
      eros: 'HealthyBalanced',
      agape: 'HealthyBalanced'
    };
    let feedback = 'Completed the challenge via fallback choices.';

    // Explicit Mapping for authored Option IDs/labels
    if (
      label.includes('attack') ||
      label.includes('betray') ||
      label.includes('raid') ||
      label.includes('dominate') ||
      label.includes('strike') ||
      label.includes('profit') ||
      label.includes('sell') ||
      label.includes('enforce') ||
      label.includes('deceive') ||
      label.includes('obey')
    ) {
      polarityDirection = 'sts';
      driveScores.agency = 0.8;
      driveScores.communion = 0.3;
      driveScores.eros = 0.8;
      driveScores.agape = 0.3;
      if (label.includes('betray') || label.includes('raid') || label.includes('deceive')) {
        driveSignals.communion = 'DarkAverted';
        driveSignals.agape = 'DarkAverted';
        feedback = 'Your response prioritized self-protection and tactical advantage, showing highly active Agency but potential shadow aversion toward Communion.';
      } else {
        feedback = 'Your response prioritized self-interest, power, or direct force, favoring Agency/Eros over Communion/Agape.';
      }
    } else if (
      label.includes('alliance') ||
      label.includes('negotiate') ||
      label.includes('trust') ||
      label.includes('share') ||
      label.includes('mercy') ||
      label.includes('compassion') ||
      label.includes('reflect deeply') ||
      label.includes('refuse') ||
      label.includes('reform') ||
      label.includes('breathe')
    ) {
      polarityDirection = 'sto';
      driveScores.agency = 0.5;
      driveScores.communion = 0.8;
      driveScores.eros = 0.5;
      driveScores.agape = 0.8;
      feedback = 'Your response prioritized cooperation, empathy, and collective service, showing strong Communion and Agape alignment.';
    } else {
      polarityDirection = 'neutral';
      if (label.includes('verify') || label.includes('fortify') || label.includes('stay') || label.includes('hybrid') || label.includes('observe')) {
        driveScores.agency = 0.6;
        driveScores.communion = 0.6;
        driveScores.eros = 0.4;
        driveScores.agape = 0.5;
        feedback = 'Your response showed a balanced, cautious approach, securing current foundations before acting.';
      } else if (label.includes('withdraw') || label.includes('resist') || label.includes('sit with it') || label.includes('decline')) {
        driveScores.agency = 0.4;
        driveScores.communion = 0.5;
        driveScores.eros = 0.3;
        driveScores.agape = 0.5;
        driveSignals.eros = 'DarkAverted';
        feedback = 'Your choice to withdraw or resist shows a homeostatic focus, maintaining the boundary but delaying growth.';
      } else if (label.includes('respond instinctively') || label.includes('challenge') || label.includes('press forward') || label.includes('engage')) {
        driveScores.agency = 0.7;
        driveScores.communion = 0.4;
        driveScores.eros = 0.7;
        driveScores.agape = 0.4;
        feedback = 'Your response was active and assertive, pushing forward with strong Eros and Agency.';
      }
    }

    if (label.includes('withdraw') || label.includes('resist') || label.includes('decline')) {
      passed = false;
    }

    return { passed, polarityDirection, driveScores, driveSignals, feedback };
  }
  ```

  Update `runFallback` to use it:
  ```typescript
  const evaluated = this.evaluateFallbackResponse(narrativeSummary);

  const fallbackParams = {
    passed: evaluated.passed,
    feedback: evaluated.feedback,
    polarityDirection: evaluated.polarityDirection,
    driveScores: evaluated.driveScores,
    driveSignals: evaluated.driveSignals,
    narrativeSummary: typeof narrativeSummary === 'string' ? narrativeSummary : 'The player engaged with the encounter.',
  };

  const finalResult = this.createAssessmentResult(evaluated.passed, {}, evaluated.driveScores);
  const outcome = this.finalizeEncounter(fallbackParams, now);
  ```

- [ ] **Step 4: Run tests to verify they pass**
  Run: `npx vitest run tests/core/assessments/AgenticOrchestrator.test.ts`
  Expected: PASS

- [ ] **Step 5: Commit**
  ```bash
  git add src/core/assessments/AgenticOrchestrator.ts tests/core/assessments/AgenticOrchestrator.test.ts
  git commit -m "feat: implement differentiated fallback response evaluation and scoring"
  ```

---

### Task 3: Support Forcing Flags in SessionContext & Candidate Generation

**Files:**
- Modify: `src/core/engines/PriorityComputation.ts`
- Modify: `src/core/engines/CandidateGeneration.ts`
- Test: `tests/engines/EncounterScheduler.test.ts`

- [ ] **Step 1: Write test cases in EncounterScheduler.test.ts for forced fields**
  Add a test asserting that if `forceLine = 'Cognitive'` and `forceStage = 'Amber'` are passed in the session context, the scheduler returns a Cognitive:Amber encounter candidate, ignoring altitudes and layer checks.

- [ ] **Step 2: Run tests to verify failure**
  Run: `npx vitest run tests/engines/EncounterScheduler.test.ts`
  Expected: FAIL

- [ ] **Step 3: Update SessionContext interface in PriorityComputation.ts**
  Add the optional fields:
  ```typescript
  export interface SessionContext {
    readonly encountersSoFar: number;
    readonly sessionDurationMs: number;
    readonly targetSessionLength: number;
    readonly recentLines: readonly string[];
    readonly estimatedTimeAvailable?: number;
    readonly inferredEnergy?: 'high' | 'moderate' | 'low';
    readonly patienceSignals?: {
      readonly avoidanceRate: number;
      readonly responseLatencyTrend: 'decreasing' | 'stable' | 'increasing';
      readonly earlyExits: number;
    };
    readonly forceLine?: string;
    readonly forceStage?: string;
    readonly forceModality?: string;
  }
  ```

- [ ] **Step 4: Modify generateCandidates to support forcing**
  Update `generateCandidates` in `src/core/engines/CandidateGeneration.ts` to respect forcing context and bypass filters:
  ```typescript
  export function generateCandidates(
    sig: Significator,
    world: WorldState,
    now: number,
    session?: SessionContext,
  ): EncounterCandidate[] {
    const forceLine = session?.forceLine;
    const forceStage = session?.forceStage;
    const forceModality = session?.forceModality;
    const anyForcing = !!(forceLine || forceStage || forceModality);

    const maxStageOrd = stageOrdinal(sig.currentStage) + 1;
    const candidates: EncounterCandidate[] = [];
    const recent = world.recentEncounters ?? [];

    const blockedModalities = new Set<Modality>();
    if (session?.inferredEnergy === 'low') {
      ENERGY_GATED.forEach(m => blockedModalities.add(m));
    }
    if (session?.estimatedTimeAvailable !== undefined && session.estimatedTimeAvailable < 900000) {
      TIME_GATED.forEach(m => blockedModalities.add(m));
    }

    for (const holon of world.holons) {
      if (!holon.active) continue;

      // Filter by forced line/stage first
      if (forceLine && holon.line !== forceLine) continue;
      if (forceStage && holon.stage !== forceStage) continue;

      // Filter 1: Layer-perception (bypass if forcing stage)
      if (!forceStage && stageOrdinal(holon.stage) > maxStageOrd) continue;

      // Filter 2: Altitude requirement (bypass if forcing line or stage)
      const lineAltOrd = stageOrdinal(sig.altitudes[holon.line]);
      if (!forceLine && !forceStage && stageOrdinal(holon.stage) > lineAltOrd + 1) continue;

      const moduleRef = `${holon.line}:${holon.stage}`;

      // Force modality or get eligible
      let eligible = getEligibleModalities(holon, blockedModalities);
      if (forceModality) {
        eligible = [forceModality as Modality];
      }

      for (const modality of eligible) {
        // Filter 3: Cooldown (bypass if forcing active)
        const tupleKey = `${holon.line}:${holon.stage}:${modality}`;
        const cooldownTs = world.cooldowns[tupleKey] ?? world.cooldowns[moduleRef] ?? 0;
        if (!anyForcing && now < cooldownTs) continue;

        // Filter 3: Cooldown — recency-based (bypass if forcing active)
        const last3 = recent.slice(-3); // Fix slicing bug here too
        if (!anyForcing && last3.some(r => r.line === holon.line && r.stage === holon.stage && r.modality === modality)) continue;

        const last2 = recent.slice(-2); // Fix slicing bug here too
        if (!anyForcing && last2.some(r => r.line === holon.line && r.stage === holon.stage)) continue;

        candidates.push({
          moduleRef,
          line: holon.line,
          stage: holon.stage,
          modality,
          holonId: holon.id,
          cooldownClear: true,
        });
      }
    }

    return candidates;
  }
  ```

- [ ] **Step 5: Run tests to verify success**
  Run: `npx vitest run tests/engines/EncounterScheduler.test.ts`
  Expected: PASS

- [ ] **Step 6: Commit**
  ```bash
  git add src/core/engines/PriorityComputation.ts src/core/engines/CandidateGeneration.ts tests/engines/EncounterScheduler.test.ts
  git commit -m "feat: support forcing flags in session context and candidate generation"
  ```

---

### Task 4: Fix Recency Slicing & Implement Modality Rotation Constraint

**Files:**
- Modify: `src/core/engines/CandidateGeneration.ts`
- Test: `tests/engines/EncounterScheduler.test.ts`

- [ ] **Step 1: Write a test for modality rotation constraint**
  Add a test to `tests/engines/EncounterScheduler.test.ts` showing that if the last two encounters both had the `'Deterministic'` modality, `Deterministic` candidates are filtered out to force modality rotation.

- [ ] **Step 2: Run tests to verify failure**
  Run: `npx vitest run tests/engines/EncounterScheduler.test.ts`
  Expected: FAIL

- [ ] **Step 3: Fix recency slices and implement rotation filter in CandidateGeneration.ts**
  In `generateCandidates`:
  ```typescript
  // Replace:
  const last3 = recent.slice(-3);
  if (!anyForcing && last3.some(r => r.line === holon.line && r.stage === holon.stage && r.modality === modality)) continue;

  const last2 = recent.slice(-2);
  if (!anyForcing && last2.some(r => r.line === holon.line && r.stage === holon.stage)) continue;

  // Add modality rotation constraint:
  if (!anyForcing && recent.length >= 2) {
    const last2Modalities = recent.slice(-2);
    if (last2Modalities[0].modality === last2Modalities[1].modality && modality === last2Modalities[0].modality) {
      continue; // Skip to rotate modality
    }
  }
  ```

- [ ] **Step 4: Run tests to verify success**
  Run: `npx vitest run tests/engines/EncounterScheduler.test.ts`
  Expected: PASS

- [ ] **Step 5: Commit**
  ```bash
  git add src/core/engines/CandidateGeneration.ts tests/engines/EncounterScheduler.test.ts
  git commit -m "bugfix: correct recency slicing filter and add modality rotation constraint"
  ```

---

### Task 5: Add Scheduler Tie-Breaker to Priority Formula

**Files:**
- Modify: `src/core/engines/PriorityComputation.ts`
- Test: `tests/engines/EncounterScheduler.test.ts`

- [ ] **Step 1: Write test validating diverse priority scores**
  Write a test in `tests/engines/EncounterScheduler.test.ts` validating that all candidates scheduled at session start do NOT return the exact same priority value.

- [ ] **Step 2: Run tests to verify failure**
  Run: `npx vitest run tests/engines/EncounterScheduler.test.ts`
  Expected: FAIL

- [ ] **Step 3: Update computePriority to include deterministic tie-breaker**
  In `src/core/engines/PriorityComputation.ts`:
  ```typescript
  export function computePriority(
    candidate: EncounterCandidate,
    sig: Significator,
    world: WorldState,
    session: SessionContext,
    now: number,
    weights: PriorityWeights = DEFAULT_WEIGHTS,
  ): number {
    const t = computeThetaUrgency(candidate, sig, now);
    const s = computeShadowActivation(candidate, sig);
    const p = computePolarityAlignment(candidate, sig);
    const tr = computeTransformationReadiness(candidate, sig);
    const d = computeDriveCorrection(candidate, sig, world);
    const n = computeNarrativeCoherence(candidate, world);
    const sf = computeSessionFit(candidate, session);

    const base = weights.thetaUrgency * t
      + weights.shadowActivation * s
      + weights.polarityAlignment * p
      + weights.transformationReadiness * tr
      + weights.driveCorrection * d
      + weights.narrativeCoherence * n
      + weights.sessionFit * sf;

    // Add deterministic tie-breaker (max 0.0099)
    const hash = (candidate.moduleRef.charCodeAt(0) + candidate.modality.charCodeAt(0)) % 100;
    const tieBreaker = hash / 10000;

    return base + tieBreaker;
  }
  ```

- [ ] **Step 4: Run tests to verify success**
  Run: `npx vitest run tests/engines/EncounterScheduler.test.ts`
  Expected: PASS

- [ ] **Step 5: Commit**
  ```bash
  git add src/core/engines/PriorityComputation.ts tests/engines/EncounterScheduler.test.ts
  git commit -m "feat: add deterministic tie-breaker to candidate priority score"
  ```

---

### Task 6: CLI Runner Forcing Integration & Themed Rendering

**Files:**
- Modify: `scripts/cli-game.ts`
- Test: Manual CLI validation

- [ ] **Step 1: Inject forcing flags into SessionContext in cli-game.ts**
  Modify the `session` object instantiation in `runSingleEncounter()` and `runFullSession()` in `scripts/cli-game.ts`:
  ```typescript
  const session: SessionContext = {
    encountersSoFar: 0,
    sessionDurationMs: 0,
    targetSessionLength: 1, // or encounterCount
    recentLines: [],
    ...(FORCE_LINE ? { forceLine: FORCE_LINE } : {}),
    ...(FORCE_STAGE ? { forceStage: FORCE_STAGE } : {}),
    ...(FORCE_MODALITY ? { forceModality: FORCE_MODALITY } : {}),
  } as any;
  ```

- [ ] **Step 2: Implement modality-specific rendering in askUser UI handler**
  In the `askUser` function inside `scripts/cli-game.ts`:
  ```typescript
      for (const q of params.questions) {
        if (!JSON_MODE) {
          const modality = q.header;
          console.log(`\n  ${C.magenta}⚡ [${modality.toUpperCase()} MODALITY]${C.reset}`);
          
          switch (modality) {
            case 'Deterministic':
              console.log(`  ${C.yellow}⏰ TIMED TRIAL — DECIDE SWIFTLY!${C.reset}`);
              console.log(`  ${C.bold}${q.question}${C.reset}`);
              console.log(`  ${C.dim}[====================] 100% (Time Remaining: 5s)${C.reset}`);
              break;
            case 'LanguageReflective':
              console.log(`  ${C.blue}✍️  REFLECTION BEAT — CONTEMPLATE${C.reset}`);
              console.log(`  ${C.italic}${q.question}${C.reset}`);
              break;
            case 'ScenarioChoice':
              console.log(`  ${C.red}⚖️  DECISION CROSSROADS — MORAL DILEMMA${C.reset}`);
              console.log(`  ${C.bold}${q.question}${C.reset}`);
              break;
            case 'Embodied':
              console.log(`  ${C.green}🧘 SOMATIC SCAN — SENSE YOUR BODY${C.reset}`);
              console.log(`  ${C.italic}${q.question}${C.reset}`);
              break;
            case 'Strategic':
              console.log(`  ${C.cyan}🗺️  TACTICAL WAR-TABLE — ALLOCATE RESOURCES${C.reset}`);
              console.log(`  ${C.bold}${q.question}${C.reset}`);
              break;
            case 'SocialCooperative':
              console.log(`  ${C.yellow}👥 RELATIONSHIP BRIDGES — DIPLOMACY & LEADERSHIP${C.reset}`);
              console.log(`  ${C.bold}${q.question}${C.reset}`);
              break;
            case 'ImmersiveRPG':
              console.log(`  ${C.magenta}📖 WORLD NARRATIVE — STEP INTO THE STORY${C.reset}`);
              console.log(`  ${C.bold}${q.question}${C.reset}`);
              break;
            default:
              console.log(`  ${C.bold}${q.question}${C.reset}`);
              break;
          }

          if (q.options?.length) {
            console.log(`\n  ${C.bold}Available Options:${C.reset}`);
            for (let i = 0; i < q.options.length; i++) {
              const opt = q.options[i];
              console.log(`    ${C.cyan}[${i + 1}]${C.reset} ${C.bold}${opt.label}${C.reset} \n        ↳ ${opt.description}`);
            }
          }
          if (q.allowWriteIn) {
            console.log(`    ${C.cyan}[5]${C.reset} ${C.italic}Write-in your own custom action...${C.reset}`);
          }
        }
  ```

- [ ] **Step 3: Update input parsing to isolate simple numeric option selects**
  In the `askUser` function inside `scripts/cli-game.ts`, prevent simple selections from leaking as `writeInValue`:
  ```typescript
        if (HEADLESS) {
          const forcedIdx = FORCE_RESPONSES?.shift();
          const selectedOpt = (forcedIdx && q.options && forcedIdx >= 1 && forcedIdx <= q.options.length)
            ? q.options[forcedIdx - 1]
            : q.options?.[0];
          answers.push({ selectedLabels: selectedOpt ? [selectedOpt.label] : [] });
        } else {
          const promptText = q.multiSelect
            ? '\n  Select (comma-separated): '
            : '\n  Select: ';
          const answer = await ask(promptText);
          const selections = answer.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
          const selectedLabels = selections
            .filter(n => n >= 1 && n <= (q.options?.length ?? 0))
            .map(n => q.options![n - 1]!.label);

          const isOnlyNumericSelection = selections.length > 0 && selections.every(n => n >= 1 && n <= (q.options?.length ?? 0));
          const writeInValue = (q.allowWriteIn && !isOnlyNumericSelection) ? answer.trim() : undefined;

          answers.push({ selectedLabels, writeInValue: writeInValue || undefined });
        }
  ```

- [ ] **Step 4: Run CLI game manually to verify**
  Run: `npm run cli -- --mode=encounter --line=Cognitive --stage=Red --modality=ScenarioChoice`
  Expected:
  - Correct modality header printed (ScenarioChoice)
  - Options and narrative match ScenarioChoice Red
  - Completes with correct scores.

- [ ] **Step 5: Commit**
  ```bash
  git add scripts/cli-game.ts
  git commit -m "feat: integrate CLI forcing flags into GameLoop and add premium modality-themed rendering"
  ```
