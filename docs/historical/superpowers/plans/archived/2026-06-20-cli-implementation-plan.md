# CLI Implementation Plan — Formal Reference

**Date:** June 20, 2026  
**Source:** AUDIT-REPORT.md v6 (12+ runtime tests, 5,000+ lines analyzed)  
**Status:** Implementation in progress  

---

## Quick Reference

| Sprint | Focus | Est. Time | Files | Status |
|---|---|---|---|---|
| 1 | Fix blocking issues | 4 hours | cli-game.ts, AgenticOrchestrator.ts | ✅ Done |
| 2 | Fix modality routing | 1 day | AgenticOrchestrator.ts | ✅ Done |
| 3 | Fix scoring & pass rate | 1 day | AgenticOrchestrator.ts, GameLoop.ts | ✅ Done |
| 4 | Persistence & onboarding | 2 days | SaveRepository.ts | ✅ Partial (persistence done, onboarding pending) |
| 5 | Narrative depth | 2 days | cli-game.ts, AgenticOrchestrator.ts | ✅ Done |
| 6 | UX polish | 1 day | cli-game.ts | ✅ Done |

---

## Sprint 1: Fix Blocking Issues

### 1.1 Auto-detect LLM availability (cli-game.ts)

**Problem:** Default mode waits 20-30s per encounter for unreachable LLM.  
**Fix:** At session start, do a fast HEAD request to the LLM endpoint with 2s timeout. If it fails, silently set `noLlm = true` for the session and print a warning.

**Implementation:**
```typescript
// At session start, after env bootstrap
async function checkLLMAvailability(baseUrl: string, apiKey: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`${baseUrl}/models`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return res.ok;
  } catch {
    return false;
  }
}
```

**Where:** Before `runFullSession()` loop, call `checkLLMAvailability()` and override `LLM_ACTIVE`.

### 1.2 Fix shadow label truncation (cli-game.ts)

**Problem:** `q.replace('Dark', '').replace('Golden', 'G').slice(0, 8)` produces "Addictio" instead of "DarkAddiction".  
**Fix:** Use full labels: `DarkAddict`, `DarkAvert`, `GoldAddict`, `GoldAvert`.

**Where:** `renderShadows()` function, line ~280.

### 1.3 Show score in non-verbose mode (cli-game.ts)

**Problem:** Only pass/fail icon shown. No dimension breakdown unless `--verbose`.  
**Fix:** After pass/fail, show the primary score and which drive was expressed.

**Where:** `runFullSession()` encounter result section.

**Changes:**
```typescript
// After pass/fail display, add:
const score = (encResult.dimensions.accuracy * 100).toFixed(0);
console.log(`  ${C.dim}score:${C.reset} ${passIcon.includes('PASSED') ? C.green : C.yellow}${score}%${C.reset}`);
```

---

## Sprint 2: Fix Modality Routing

### 2.1 Add modality fallback map (AgenticOrchestrator.ts)

**Problem:** `selectTaskForModality()` falls to `tasks[0]` when preferred types aren't available, showing wrong task types.  
**Fix:** Add a fallback chain per modality.

**Where:** `selectTaskForModality()` method.

**Changes:**
```typescript
// Add fallback chain after preferred types
const fallbackChain: Record<string, readonly TaskType[]> = {
  ScenarioChoice: ['dilemma', 'scenario', 'emotion_identification', 'self_report'],
  SocialCooperative: ['cooperation', 'dilemma', 'emotion_identification', 'scenario'],
  ImmersiveRPG: ['scenario', 'dilemma', 'llm_dialogue', 'emotion_identification'],
  Strategic: ['pattern_prediction', 'value_ranking', 'n_back', 'stroop'],
  Embodied: ['hold', 'rhythm', 'reaction_time', 'go_no_go'],
};

// In selectTaskForModality:
const chain = fallbackChain[modality] ?? preferredTypes;
for (const prefType of chain) {
  const match = module.tasks.find(t => t.type === prefType);
  if (match) return match;
}
```

### 2.2 Wire module-specific scenarios (AgenticOrchestrator.ts)

**Problem:** ImmersiveRPG shows generic dilemma pool instead of module's scenario content.  
**Fix:** When a `scenario` task is selected, use its `description` and `parameters` to generate module-specific options.

**Where:** `presentModuleTask()` method, when task.type is 'scenario'.

---

## Sprint 3: Fix Scoring & Pass Rate

### 3.1 Increase scoring spread (AgenticOrchestrator.ts)

**Problem:** Matched drive gets score, others get 0.5 — average always ~0.575.  
**Fix:** Unmatched drives get 0.3 instead of 0.5.

**Where:** `runModuleAssessment()` driveScores construction.

**Changes:**
```typescript
const driveScores = {
  agency: effectiveDrive === 'agency' ? writeInScore : effectiveDrive !== null ? 0.3 : writeInScore,
  communion: effectiveDrive === 'communion' ? writeInScore : effectiveDrive !== null ? 0.3 : writeInScore,
  eros: effectiveDrive === 'eros' ? writeInScore : effectiveDrive !== null ? 0.3 : writeInScore,
  agape: effectiveDrive === 'agape' ? writeInScore : effectiveDrive !== null ? 0.3 : writeInScore,
};
```

### 3.2 Recompute CCI after altitude shifts (cli-game.ts)

**Problem:** CCI only recomputed every 5 encounters.  
**Fix:** After altitude shift, recompute CCI immediately.

**Where:** `runFullSession()` after `tickResult.transformation` check.

### 3.3 Add narrative variety (AgenticOrchestrator.ts)

**Problem:** 4 opening/closing pools per pass/fail.  
**Fix:** Expand to 8+ pools, add line-specific and stage-specific flavor text.

**Where:** `buildModuleNarrative()` method.

---

## Sprint 4: Persistence & Onboarding

### 4.1 JSON file persistence (NEW: src/infra/persistence/SaveRepository.ts)

**Problem:** `createDefaultSignificator()` hardcodes all Red every run.  
**Fix:** Save/load Significator to `~/.mysterium/save.json`.

**Implementation:**
```typescript
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const SAVE_DIR = path.join(os.homedir(), '.mysterium');
const SAVE_FILE = path.join(SAVE_DIR, 'save.json');

export function loadSave(): Significator | null {
  try {
    if (fs.existsSync(SAVE_FILE)) {
      return JSON.parse(fs.readFileSync(SAVE_FILE, 'utf8'));
    }
  } catch {}
  return null;
}

export function saveGame(sig: Significator): void {
  fs.mkdirSync(SAVE_DIR, { recursive: true });
  fs.writeFileSync(SAVE_FILE, JSON.stringify(sig, null, 2));
}
```

**Wire:** In `cli-game.ts`, before `createDefaultSignificator()`, try `loadSave()` first.

### 4.2 Capacity calibration onboarding (NEW: src/core/assessments/cli/Onboarding.ts)

**Problem:** Every player starts at Red.  
**Fix:** 3-question capacity estimation based on self-report.

**Questions:**
1. "When faced with a complex problem, do you typically: (a) Analyze it systematically, (b) Trust your intuition, (c) Seek others' input, (d) Act decisively"
2. "How often do you reflect on your emotions before responding to others? (a) Always, (b) Sometimes, (c) Rarely, (d) Never"
3. "When you encounter a moral dilemma, do you: (a) Follow established rules, (b) Consider all perspectives, (c) Trust your gut feeling, (d) Seek a compromise"

**Scoring:** Map answers to line altitudes (Cognitive, Emotional, Moral, etc.) and set initial stage accordingly.

---

## Sprint 5: Narrative Depth

### 5.1 Pass encounter history into context (cli-game.ts)

**Problem:** Each encounter is context-free.  
**Fix:** Pass last 3 encounter summaries into the encounter context.

**Where:** `runAgenticEncounter()` — add `recentHistory` parameter.

### 5.2 Add failure consequences (GameLoop.ts, ConsequenceEngine.ts)

**Problem:** No stakes for failure.  
**Fix:** On failure, accelerate theta-decay by 2x and degrade NPC relationship by 0.1 (instead of 0.05).

**Where:** `applyConsequences()` in ConsequenceEngine.ts.

### 5.3 Rich session closure (cli-game.ts)

**Problem:** Stats-only session end.  
**Fix:** Thematic wrap-up based on what happened.

**Where:** `runFullSession()` session end section.

---

## Sprint 6: UX Polish

### 6.1 Fix CCI labels (cli-game.ts)

**Problem:** `alt:29% drH:100%` cryptic.  
**Fix:** Use `altitude:29% driveH:100% polarity:0% shadow:90% transform:0%`.

### 6.2 Add processing indicators (cli-game.ts)

**Problem:** No visual feedback during evaluation.  
**Fix:** Add "..." or spinner while processing responses.

### 6.3 Enrich drive compass (cli-game.ts)

**Problem:** Shows fixation % but not direction.  
**Fix:** Show arrow indicators (↑ over-expressed, ↓ under-expressed) relative to 0.5 baseline.

### 6.4 Add visual flair (cli-game.ts)

**Problem:** Tasks feel clinical.  
**Fix:** Add ASCII borders, progress bars for timed tasks, colored section headers.

---

## Validation Checklist (Post-Implementation)

- [ ] `--headless --encounters=5` completes in < 10 seconds
- [ ] `--headless --encounters=5` produces exactly 5 encounters
- [ ] Pass rate across 5 encounters is 40-60%
- [ ] Each encounter shows a different narrative even for same line×stage
- [ ] Session end shows a thematic wrap-up
- [ ] Significator persists across CLI runs
- [ ] New player gets capacity calibration
- [ ] `--modality=ScenarioChoice` on any module shows dilemma/scenario
- [ ] All 447 tests still pass
- [ ] TypeScript compiles cleanly
