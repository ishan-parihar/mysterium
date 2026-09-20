# Mysterium TUI Operationalization Plan

> **Goal:** Transform the CLI from raw readline/ANSI into a polished, interactive terminal experience with proper package installation, using industry-standard TUI libraries.

---

## 1. Current State Analysis

### What We Have Now
| Component | Implementation | Quality |
|---|---|---|
| **Colors** | Manual ANSI escape codes (`\x1b[32m`) | Fragile, no auto-detection |
| **Prompts** | Raw `readline.question()` | Basic, no validation UI |
| **Spinners** | Manual animated dots (`'.'`, `'..'`, `'...'`) | Janky, blocks output |
| **Layouts** | Manual string concatenation | No borders, no alignment |
| **Help** | Manual `console.log` template | No auto-generation |
| **Arg parsing** | Manual `--flag` detection | No type validation |
| **Progress** | Manual bar charts (`█░`) | No real-time updates |
| **Output** | 153 `console.log` touchpoints | Inconsistent formatting |

### What We Need
| Component | Target | Library |
|---|---|---|
| **Colors** | Auto-detecting, chainable colors | `chalk` |
| **Prompts** | Beautiful, accessible prompts | `@clack/prompts` |
| **Spinners** | Smooth, non-blocking spinners | `ora` |
| **Layouts** | Bordered boxes, sections | `boxen` |
| **Help** | Auto-generated from schema | `commander` |
| **Arg parsing** | Typed flags with validation | `commander` |
| **Progress** | Real-time bars, live updates | `@clack/prompts` spinner |
| **Streaming** | Clean line-by-line output | `chalk` + `ora` |

---

## 2. How Hermes-Agent Does It (Reference)

Hermes-agent uses a **three-layer TUI architecture**:

```
┌─────────────────────────────────────────────┐
│  Layer 1: CLI Entry (cli.py + hermes binary)│
│  - argparse for commands/flags              │
│  - Symlink to ~/.local/bin/ for global access│
│  - setup-hermes.sh for first-run            │
├─────────────────────────────────────────────┤
│  Layer 2: hermes_cli/ (modular commands)    │
│  - curses_ui.py (traditional TUI rendering) │
│  - pt_input_extras.py (prompt_toolkit)      │
│  - cli_output.py (formatted output)         │
│  - auth.py, backup.py, sessions.py          │
├─────────────────────────────────────────────┤
│  Layer 3: ui-tui/ (modern TypeScript TUI)   │
│  - Separate package with its own build      │
│  - React-based terminal UI                  │
│  - WebSocket transport for real-time data   │
├─────────────────────────────────────────────┤
│  Layer 4: tui_gateway/ (orchestration)      │
│  - server.py + ws.py (WebSocket server)     │
│  - render.py (UI rendering)                 │
│  - event_publisher.py (reactive events)     │
└─────────────────────────────────────────────┘
```

### Key Patterns We Adopt
1. **Modular command structure** — Each feature is a separate module
2. **Prompt library** — Use `prompt_toolkit` equivalent (Clack for Node)
3. **Formatted output** — Dedicated output formatting layer
4. **First-run wizard** — `hermes setup` pattern → our `mysterium setup`
5. **Global install** — Symlink pattern → our `npm link` / `npm install -g`

### Key Patterns We Skip (Too Heavy)
1. WebSocket gateway — Not needed for a single-user CLI
2. curses_ui.py — We use Ink or Clack instead
3. Separate TUI package — Keep it monolithic for now

---

## 3. Recommended Stack

### 3.1 Core Libraries

| Library | Purpose | Why |
|---|---|---|
| **`chalk`** | Terminal colors | Industry standard, 120M downloads, auto-detects color support |
| **`@clack/prompts`** | Interactive prompts | Used by create-t3-app, create-astro. Beautiful, accessible, modern |
| **`ora`** | Terminal spinners | 12M downloads, native console.log interception |
| **`boxen`** | Bordered boxes | Clean section separators, multiple border styles |
| **`commander`** | Command parsing | Battle-tested, auto-generates help, typed flags |
| **`ts-effect`** or **`effect`** | Error handling | Optional: structured error handling for complex flows |

### 3.2 Optional (Phase 2+)

| Library | Purpose | When |
|---|---|---|
| **`ink`** | React-based TUI | When we need real-time live-updating dashboards |
| **`@inkjs/ui`** | Ink UI components | When using Ink for complex layouts |
| **`cli-table3`** | Table rendering | For session summaries, comparison views |
| **`progress`** | Progress bars | For long-running operations |

### 3.3 Why NOT Ink Right Now

Ink is excellent but overkill for our current needs:
- Adds React + JSX build complexity
- Requires a separate bundling step
- Our TUI is mostly sequential prompts + formatted output
- Clack + chalk + ora + boxen covers 90% of what we need
- **Ink becomes valuable when we add real-time CCI dashboards**

---

## 4. Implementation Plan

### Phase 1: Replace Raw ANSI with Chalk (Day 1)

**Scope:** Replace all 153 manual ANSI escape codes with chalk.

**Before:**
```typescript
const C = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
  green: '\x1b[32m', yellow: '\x1b[33m', blue: '\x1b[34m',
  magenta: '\x1b[35m', cyan: '\x1b[36m', red: '\x1b[31m',
};
console.log(`${C.bold}${C.cyan}Mysterium${C.reset} v${VERSION}`);
```

**After:**
```typescript
import chalk from 'chalk';
console.log(chalk.bold.cyan('Mysterium') + ` v${VERSION}`);
```

**Steps:**
1. Install chalk: `npm install chalk`
2. Remove the `C` helper object
3. Replace all `${C.green}` → `chalk.green` etc.
4. Replace all `${C.bold}${C.cyan}` → `chalk.bold.cyan`
5. Test: `mysterium --help`, `mysterium diagnostic`, `mysterium --headless --no-llm --encounters=3`

### Phase 2: Replace readline with Clack (Day 2)

**Scope:** Replace raw readline prompts with Clack's beautiful prompts.

**Before:**
```typescript
const answer = await ask('\n  Select: ');
const selections = answer.split(',').map(s => parseInt(s.trim(), 10));
```

**After:**
```typescript
import { select, multiselect, text, spinner } from '@clack/prompts';

const answer = await select({
  message: 'Select your response:',
  options: [
    { value: '1', label: 'Option 1 — Description' },
    { value: '2', label: 'Option 2 — Description' },
  ],
});
```

**Steps:**
1. Install clack: `npm install @clack/prompts`
2. Replace `ask()` function with clack prompts
3. Replace encounter question rendering with `select`/`multiselect`
4. Add input validation for write-in responses
5. Handle Ctrl+C gracefully (clack handles this automatically)
6. Test interactive session end-to-end

### Phase 3: Replace Spinners with ora (Day 2)

**Scope:** Replace manual animated dots with smooth ora spinners.

**Before:**
```typescript
const spinnerFrames = ['', '.', '..', '...'];
for (let f = 0; f < spinnerFrames.length; f++) {
  process.stdout.write(`\r  ... preparing encounter${spinnerFrames[f]}`);
  await new Promise(r => setTimeout(r, 200));
}
process.stdout.write('\x1b[2K\r');
```

**After:**
```typescript
import ora from 'ora';

const s = ora('Preparing encounter...').start();
// ... encounter logic ...
s.succeed('Encounter complete');
```

**Steps:**
1. Install ora: `npm install ora`
2. Replace spinner animation in `runFullSession` transition
3. Add spinner to LLM availability check
4. Add spinner to registry boot
5. Test: verify spinners don't break JSON output mode

### Phase 4: Add boxen Section Separators (Day 3)

**Scope:** Replace manual separator lines with bordered boxes.

**Before:**
```typescript
function separator(label: string): void {
  console.log(`\n${C.bold}${C.blue}── ${label} ──${C.reset}`);
}
```

**After:**
```typescript
import boxen from 'boxen';

function separator(label: string): void {
  console.log(boxen(chalk.bold(label), {
    padding: { left: 1, right: 1 },
    borderStyle: 'round',
    borderColor: 'cyan',
    margin: { top: 1, bottom: 0 },
  }));
}
```

**Steps:**
1. Install boxen: `npm install boxen`
2. Replace `separator()` with boxen-bordered boxes
3. Add boxen to session start/end banners
4. Add boxen to diagnostic output sections
5. Test visual appearance across terminal widths

### Phase 5: Replace Arg Parsing with Commander (Day 3)

**Scope:** Replace manual `--flag` detection with Commander's typed argument parsing.

**Before:**
```typescript
const flags = new Set(args.filter(a => a.startsWith('--')));
const getVal = (name: string): string | undefined =>
  args.find(a => a.startsWith(`--${name}=`))?.split('=')[1];
const HEADLESS = flags.has('--headless');
```

**After:**
```typescript
import { Command } from 'commander';

const program = new Command()
  .name('mysterium')
  .version(VERSION)
  .description('Mysterium — Developmental Assessment Engine')
  .option('--headless', 'Run without user interaction')
  .option('--json', 'Machine-readable JSON output')
  .option('--verbose', 'Show full narrative and feedback')
  .option('--no-llm', 'Disable LLM, use module assessments only')
  .option('--new-game', 'Start fresh (delete saved progress)')
  .option('-e, --encounters <n>', 'Number of encounters', '20')
  .option('-m, --model <name>', 'Override LLM model name')
  .option('-l, --line <line>', 'Force a specific line')
  .option('-s, --stage <stage>', 'Force a specific stage')
  .option('--modality <mod>', 'Force a specific modality');

// Subcommands
program.command('setup').description('Configure LLM and preferences').action(runSetup);
program.command('status').description('Show current developmental state').action(runStatus);
program.command('new-game').description('Reset progress and start fresh').action(runNewGame);
program.command('diagnostic').description('Show system diagnostics').action(runDiagnostic);
```

**Steps:**
1. Install commander: `npm install commander`
2. Define program with options and subcommands
3. Extract options from `program.opts()` instead of manual parsing
4. Auto-generate `--help` from Commander's schema
5. Test: `mysterium --help`, `mysterium --version`, `mysterium setup`, etc.

### Phase 6: Add Real-Time Session Dashboard (Day 4-5)

**Scope:** Create a live-updating session view with CCI progress, altitude chart, and encounter results.

**Option A: Clack + ora (Simple)**
```typescript
import { spinner } from '@clack/prompts';

// After each encounter:
console.log(chalk.bold.cyan(`\n── Encounter ${i+1}/${count} ──`));
console.log(chalk.green(`  ✓ PASSED`) + ` score: ${chalk.yellow('80%')}`);
console.log(`  CCI: ${chalk.cyan('51.4%')} [${'█'.repeat(10)}${'░'.repeat(10)}]`);
console.log(`  ${chalk.dim('drives:')} ${chalk.green('Agy:ok')} ${chalk.green('Com:ok')} ${chalk.yellow('Ero:DkA')} ${chalk.green('Aga:ok')}`);
```

**Option B: Ink Dashboard (Advanced)**
```tsx
import React, { useState, useEffect } from 'react';
import { render, Box, Text } from 'ink';
import { ProgressBar } from '@inkjs/ui';

function SessionDashboard({ encounters, cci, altitudes }) {
  return (
    <Box flexDirection="column">
      <Text bold cyan>SESSION {encounters.length}/{targetCount}</Text>
      <ProgressBar value={cci.composite * 100} />
      {altitudes.map(([line, stage]) => (
        <Text key={line}>  {line.padEnd(14)} {renderBar(stage)} {stage}</Text>
      ))}
    </Box>
  );
}
```

**Recommendation:** Start with Option A (Clack + chalk). Migrate to Option B (Ink) when we need real-time streaming updates during LLM-powered encounters.

### Phase 7: Polish and Package (Day 5-6)

**Scope:** Final polish, npm publish, and distribution.

**Steps:**
1. Add `ora` spinner to `npm run build:cli` in prepublishOnly
2. Verify `npm pack` output includes only `dist/cli/`, `src/core/data/`, `README.md`
3. Test `npm link` → `mysterium --help` → `mysterium --headless --no-llm --encounters=3`
4. Test `npm publish --dry-run` to verify package contents
5. Add CI/CD workflow for auto-publish on tag
6. Update README with install instructions:
   ```markdown
   ## Quick Start
   ```bash
   npm install -g mysterium
   mysterium setup          # Configure your LLM API key
   mysterium                # Start your developmental journey
   ```
   ```

---

## 5. File Changes Summary

| File | Action | Phase |
|---|---|---|
| `package.json` | Add chalk, @clack/prompts, ora, boxen, commander to dependencies | 1-5 |
| `tsup.config.ts` | No changes needed (already bundles everything) | — |
| `scripts/cli-game.ts` | Major refactor: replace ANSI→chalk, readline→clack, spinner→ora, separator→boxen, arg parsing→commander | 1-5 |
| `README.md` | Add install instructions and usage guide | 7 |
| `.github/workflows/deploy.yml` | Add npm publish on tag | 7 |

---

## 6. Dependency Changes

| Package | Current | Action | Phase | Bundle Impact |
|---|---|---|---|---|
| `chalk` | — | **Add** dep | 1 | ~20KB (ESM) |
| `@clack/prompts` | — | **Add** dep | 2 | ~50KB (ESM) |
| `ora` | — | **Add** dep | 3 | ~15KB (ESM) |
| `boxen` | — | **Add** dep | 4 | ~10KB (ESM) |
| `commander` | — | **Add** dep | 5 | ~30KB (ESM) |
| `ink` | — | **Add** dep (optional) | 6 | ~200KB (React + Yoga) |
| `@inkjs/ui` | — | **Add** dep (optional) | 6 | ~50KB |

**Total bundle increase:** ~125KB (without Ink) → ~375KB (with Ink)
**Current bundle:** 839KB → **Projected:** ~965KB (without Ink) or ~1.2MB (with Ink)

---

## 7. Migration Strategy

### Phase 1-4: Incremental Library Adoption
Each phase replaces one raw implementation with a library. Tests run after each phase.

```
Phase 1: chalk        → All colors auto-detect terminal support
Phase 2: clack        → Beautiful prompts, accessible, validation built-in
Phase 3: ora          → Smooth spinners, non-blocking
Phase 4: boxen        → Clean section borders
Phase 5: commander    → Auto-generated help, typed flags
Phase 6: Ink (opt)    → Real-time dashboard (future)
Phase 7: npm publish  → Global install via npm install -g
```

### Backward Compatibility
- JSON output mode (`--json`) must remain clean (no TUI artifacts)
- Headless mode (`--headless`) must skip all interactive prompts
- All existing flags (`--line`, `--stage`, `--modality`, etc.) must work
- Subcommands (`setup`, `status`, `new-game`, `diagnostic`) must work

---

## 8. Testing Checklist

After each phase, verify:
- [ ] `npx tsc --noEmit` — clean compilation
- [ ] `npx vitest run` — 448/448 tests pass
- [ ] `npm run build:cli` — bundle builds successfully
- [ ] `node dist/cli/cli-game.js --help` — shows formatted help
- [ ] `node dist/cli/cli-game.js --version` — shows version
- [ ] `node dist/cli/cli-game.js diagnostic` — shows system diagnostics
- [ ] `node dist/cli/cli-game.js status` — shows game state
- [ ] `node dist/cli/cli-game.js --headless --no-llm --encounters=5 --new-game` — runs session
- [ ] `node dist/cli/cli-game.js --json --headless --no-llm --encounters=1` — clean JSON
- [ ] `npm link` → `mysterium --help` → `mysterium --headless --no-llm --encounters=3` — global install works
- [ ] Terminal width < 80 columns — no visual breakage
- [ ] Terminal with no color support — graceful fallback

---

## 9. Success Criteria

- [ ] `npm install -g mysterium` installs cleanly
- [ ] `mysterium --help` shows auto-generated, beautifully formatted help
- [ ] `mysterium setup` uses Clack prompts for interactive configuration
- [ ] `mysterium` starts an interactive session with Clack prompts
- [ ] Spinners animate smoothly during loading states
- [ ] Session output uses chalk colors with auto-detection
- [ ] Section separators use boxen borders
- [ ] JSON mode produces clean output (no TUI artifacts)
- [ ] Bundle size stays under 1.2MB
- [ ] All 448+ tests pass
- [ ] TypeScript compiles with zero errors

---

## 10. Future Considerations

### 10.1 Ink Dashboard (Phase 6)
When we need real-time streaming during LLM-powered encounters:
- Live CCI progress bar updating after each response
- Real-time altitude chart with animated transitions
- Shadow detection alerts with visual emphasis
- Encounter history sidebar

### 10.2 Plugin System
Allow users to add custom developmental modules:
```
mysterium plugin add @mysterium/custom-module
mysterium plugin list
```

### 10.3 Auto-Update Check
```typescript
import { checkForUpdate } from './update.js';
// On startup:
const update = await checkForUpdate('mysterium');
if (update) {
  console.log(chalk.yellow(`Update available: ${update.latest}`));
  console.log(chalk.dim(`Run ${chalk.bold('npm update -g mysterium')} to upgrade`));
}
```

### 10.4 Docker Support
```dockerfile
FROM node:20-slim
RUN npm install -g mysterium
ENTRYPOINT ["mysterium", "--headless", "--no-llm"]
```

### 10.5 Homebrew Tap
Following hermes-agent's pattern:
```bash
brew tap ishanp/mysterium
brew install mysterium
```
