# Mysterium CLI Distribution Plan

> **Goal:** Make Mysterium installable as `npm install -g mysterium` with a `mysterium` command that works out of the box.

---

## 1. Current State

| Aspect | Status | Issue |
|---|---|---|
| `"private": true` | ❌ | Blocks `npm publish` |
| No `"bin"` field | ❌ | No CLI command registered |
| CLI runs via `npx tsx` | ❌ | Requires `tsx` devDependency at runtime |
| Path aliases (`@core/*`) | ❌ | Won't resolve after install without bundling |
| Phaser in `dependencies` | ❌ | CLI doesn't use Phaser — adds ~2MB for nothing |
| No `"files"` field | ❌ | Would publish everything (tests, docs, etc.) |
| `.env` for LLM config | ⚠️ | Won't find `.env` on user machines |
| No first-run setup | ❌ | No `~/.mysterium/` directory, no config wizard |
| README has no install instructions | ❌ | Users can't discover the CLI |

---

## 2. Architecture: What Hermes-Agent Does (Reference)

Hermes-agent (Python) uses this pattern:

```
pip install hermes-agent       # installs package
hermes                         # global command via console_scripts
hermes setup                   # interactive first-run wizard
hermes model                   # configure LLM provider
```

Key patterns we adopt:
- **Binary wrapper:** `hermes` shell script → Python entry point
- **`setup` subcommand:** Interactive wizard for first-run config
- **Modular CLI:** `hermes_cli/` package with separate command modules
- **Remote install script:** `curl | bash` for one-liner setup
- **Config directory:** `~/.hermes/` for persistent state

---

## 3. What We're Building

```
npm install -g mysterium            # or npx mysterium
mysterium                           # interactive session
mysterium --help                    # usage info
mysterium --headless --no-llm       # automated test
mysterium setup                     # configure LLM API key
mysterium diagnostic                # system diagnostics
mysterium new-game                  # start fresh
```

---

## 4. Implementation Plan

### Phase 1: Bundle the CLI (Sprint 1)

**Problem:** The CLI currently runs via `npx tsx scripts/cli-game.ts`, which requires the full source tree + devDependencies. After `npm install -g`, none of that exists.

**Solution:** Use `tsup` (built on esbuild) to compile the CLI into a single self-contained JS file.

#### 4.1 Install tsup

```bash
npm install --save-dev tsup
```

#### 4.2 Create `tsup.config.ts`

```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['scripts/cli-game.ts'],
  outDir: 'dist/cli',
  format: ['esm'],
  target: 'node18',
  platform: 'node',
  bundle: true,
  clean: true,
  minify: false,  // Keep readable for debugging
  sourcemap: false,
  banner: {
    js: '#!/usr/bin/env node',
  },
  // Externalize native Node modules (already available at runtime)
  external: [],
  // Resolve path aliases during bundling
  noExternal: [],
});
```

#### 4.3 Handle Path Aliases

`tsup`/`esbuild` don't resolve `tsconfig.json` paths. Two options:

**Option A (Recommended): Use `tsc-alias`**
```bash
npm install --save-dev tsc-alias
```
Build script: `"build:cli": "tsc --noEmit && tsc-alias && tsup"`

**Option B: Use `package.json#imports`**
Add `"imports": { "@core/*": "./src/core/*" }` — modern Node.js resolves these natively. But tsup still needs the alias resolved at bundle time.

#### 4.4 Handle JSON Import

The CLI imports `red-layer-holons.json`. tsup handles this natively when bundling, but we need `resolveJsonModule: true` in tsconfig (already set).

#### 4.5 Handle env.ts Import

The CLI imports `../env.ts` for config. tsup bundles this automatically.

#### 4.6 Build Script

Add to `package.json`:
```json
{
  "scripts": {
    "build:cli": "tsup",
    "dev:cli": "tsx scripts/cli-game.ts",
    "cli": "tsx scripts/cli-game.ts"
  }
}
```

#### 4.7 Output Structure

After `npm run build:cli`:
```
dist/cli/
  cli-game.js    # Single bundled file with shebang
```

---

### Phase 2: Package for npm (Sprint 2)

#### 4.8 Update `package.json`

```json
{
  "name": "mysterium",
  "version": "0.1.0",
  "description": "Mysterium — a gamified developmental assessment engine",
  "type": "module",
  "bin": {
    "mysterium": "./dist/cli/cli-game.js"
  },
  "files": [
    "dist/cli/",
    "src/core/data/",
    "README.md"
  ],
  "scripts": {
    "build:cli": "tsup",
    "dev:cli": "tsx scripts/cli-game.ts",
    "cli": "tsx scripts/cli-game.ts",
    "prepublishOnly": "npm run build:cli"
  },
  "dependencies": {
    "phaser": "^3.80.1"
  },
  "devDependencies": {
    "tsup": "^8.0.0",
    "tsx": "^4.22.2",
    "typescript": "^5.4.5",
    "vite": "^5.4.10",
    "vitest": "^2.1.4",
    "jsdom": "^29.1.1",
    "@capacitor/cli": "^6.1.2"
  },
  "engines": {
    "node": ">=18"
  }
}
```

Key changes:
- **Remove `"private": true`** — allows npm publish
- **Add `"bin"` field** — registers `mysterium` command
- **Add `"files"` field** — only publish CLI bundle + data + README
- **Add `"engines"` field** — specify Node.js >= 18
- **Add `"prepublishOnly"`** — auto-build CLI before publish
- **Move Phaser to `dependencies`** — only included because it's a game (but CLI doesn't need it; consider making it optional or peer)

#### 4.9 .npmignore (Alternative to files field)

If using `.npmignore` instead of `files`:
```
src/
tests/
docs/
scripts/
.github/
*.test.ts
tsconfig.json
vite.config.ts
capacitor.config.json
.env
.android/
dist/web/
```

**Recommendation:** Use `"files"` field (whitelist) — it's more explicit and less error-prone.

---

### Phase 3: First-Run Experience (Sprint 3)

#### 4.10 Config Directory: `~/.mysterium/`

Following hermes-agent's pattern, create a config directory on first run:

```
~/.mysterium/
  config.json      # LLM settings, preferences
  saves/            # Game saves
    significator.json
    world-state.json
  sessions/         # Session history (optional)
```

#### 4.11 `mysterium setup` Subcommand

```typescript
// In cli-game.ts, add a 'setup' mode:
case 'setup':
  await runSetup();
  break;

async function runSetup(): Promise<void> {
  banner('Mysterium Setup Wizard');
  
  // 1. Create config directory
  const configDir = path.join(os.homedir(), '.mysterium');
  fs.mkdirSync(configDir, { recursive: true });
  
  // 2. Check for existing config
  const configPath = path.join(configDir, 'config.json');
  const existing = fs.existsSync(configPath) 
    ? JSON.parse(fs.readFileSync(configPath, 'utf8')) 
    : {};
  
  // 3. Interactive prompts (or use LLM to guide)
  console.log('\n  This wizard will configure Mysterium for your system.\n');
  
  // LLM API Key
  const apiKey = await ask('  Enter your LLM API key (or press Enter to skip): ');
  
  // Model selection
  console.log('\n  Available models:');
  console.log('    1. gemma-4-31b-it (Google, free tier)');
  console.log('    2. gpt-4o-mini (OpenAI)');
  console.log('    3. claude-3-haiku (Anthropic)');
  console.log('    4. Local (Ollama, LM Studio)');
  const modelChoice = await ask('  Select model [1]: ');
  
  // Save config
  const config = {
    llm: {
      provider: /* based on choice */,
      apiKey: apiKey || undefined,
      model: /* based on choice */,
      baseUrl: /* based on choice */,
    },
    session: {
      defaultEncounters: 20,
      defaultMode: 'full',
    },
  };
  
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  
  // 4. Create save directory
  fs.mkdirSync(path.join(configDir, 'saves'), { recursive: true });
  
  success(`Configuration saved to ${configPath}`);
  console.log(`\n  Run ${C.bold}mysterium${C.reset} to start your developmental journey.\n`);
}
```

#### 4.12 Config Loading Priority

```
1. Environment variables (Mysterium_API_KEY, Mysterium_MODEL, etc.)
2. ~/.mysterium/config.json (setup wizard output)
3. .env file in current directory (development mode)
4. Built-in defaults (placeholder key, fallback model)
```

#### 4.13 Save File Location

Currently saves to current working directory. Change to:
```
~/.mysterium/saves/significator.json
~/.mysterium/saves/world-state.json
```

This ensures saves persist regardless of where `mysterium` is run from.

---

### Phase 4: CLI Polish (Sprint 4)

#### 4.14 Subcommand Structure

Transform from flag-based to subcommand-based CLI:

```
mysterium                        # interactive session (default)
mysterium session                # same as above
mysterium session --encounters=10 --headless
mysterium setup                  # first-run wizard
mysterium diagnostic             # system diagnostics
mysterium new-game               # reset progress
mysterium status                 # show current state (stage, CCI, encounters)
mysterium help                   # usage info
```

#### 4.15 Help Text Enhancement

```
$ mysterium --help

  Mysterium — Mysterium
  Developmental Assessment Engine v0.1.0

  USAGE
    mysterium                    Start an interactive session
    mysterium setup              Configure LLM and preferences
    mysterium diagnostic         Show system diagnostics
    mysterium new-game           Reset progress and start fresh
    mysterium status             Show current developmental state

  SESSION OPTIONS
    --encounters=N           Number of encounters (default: 20)
    --headless               Run without user interaction
    --json                   Machine-readable JSON output
    --verbose                Show full narrative and feedback
    --no-llm                 Disable LLM, use module assessments only

  FORCED ENCOUNTERS (for testing)
    --line=LINE              Force a specific line (Cognitive, Emotional, etc.)
    --stage=STAGE            Force a specific stage (Red, Amber, etc.)
    --modality=MOD           Force modality (Deterministic, ScenarioChoice, etc.)
    --responses=1,2,3        Force specific option selections
    --force-shadow=Q         Force a shadow quadrant

  CONFIGURATION
    API key:   ~/.mysterium/config.json or Mysterium_API_KEY env var
    Model:     ~/.mysterium/config.json or Mysterium_MODEL env var
    Saves:     ~/.mysterium/saves/

  EXAMPLES
    mysterium                                    # interactive session
    mysterium --headless --no-llm                # quick automated test
    mysterium setup                              # configure API key
    mysterium session --encounters=5 --json      # JSON event stream
    mysterium diagnostic                         # system diagnostics

  DEVELOPMENTAL SYSTEM
    8 lines × 8 stages = 64 developmental modules
    7 modalities × 4 drives × 4 shadow quadrants
    Gamified assessment that simultaneously diagnoses AND heals
```

#### 4.16 Version Display

Add `--version` flag:
```typescript
const VERSION = '0.1.0';
if (flags.has('--version')) {
  console.log(`mysterium ${VERSION}`);
  return;
}
```

---

### Phase 5: Testing & Validation (Sprint 5)

#### 4.17 Local Testing with `npm link`

```bash
# Build the CLI
npm run build:cli

# Link globally (creates symlink: ~/.nvm/.../bin/mysterium → dist/cli/cli-game.js)
npm link

# Test from any directory
mysterium --help
mysterium --headless --no-llm --encounters=3
mysterium diagnostic

# Unlink when done
npm unlink -g mysterium
```

#### 4.18 Integration Tests

Add `tests/cli.test.ts` using `execa` (or native `child_process`):

```typescript
import { execSync } from 'child_process';
import { describe, it, expect } from 'vitest';

describe('CLI distribution', () => {
  it('prints help text', () => {
    const out = execSync('npx tsx scripts/cli-game.ts --help', {
      encoding: 'utf8',
      timeout: 10000,
    });
    expect(out).toContain('Mysterium');
    expect(out).toContain('USAGE');
    expect(out).toContain('mysterium');
  });

  it('runs diagnostic mode', () => {
    const out = execSync('npx tsx scripts/cli-game.ts --mode=diagnostic', {
      encoding: 'utf8',
      timeout: 15000,
    });
    expect(out).toContain('64');
    expect(out).toContain('modules loaded');
  });

  it('runs 3 headless encounters', () => {
    const out = execSync(
      'npx tsx scripts/cli-game.ts --headless --no-llm --encounters=3 --new-game',
      { encoding: 'utf8', timeout: 30000 }
    );
    expect(out).toContain('PASSED');
    expect(out).toContain('encounters completed');
  });

  it('produces valid JSON output', () => {
    const out = execSync(
      'npx tsx scripts/cli-game.ts --json --headless --no-llm --encounters=1 --new-game',
      { encoding: 'utf8', timeout: 15000 }
    );
    const lines = out.trim().split('\n');
    for (const line of lines) {
      expect(() => JSON.parse(line)).not.toThrow();
    }
    expect(out).toContain('"type":"session_started"');
    expect(out).toContain('"type":"session_ended"');
  });
});
```

#### 4.19 CI/CD: Publish to npm

Add to `.github/workflows/deploy.yml`:

```yaml
jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          registry-url: https://registry.npmjs.org
      - run: npm ci
      - run: npm run build:cli
      - run: node dist/cli/cli-game.js --help  # Smoke test
      - run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

---

## 5. File Changes Summary

| File | Action | Description |
|---|---|---|
| `tsup.config.ts` | **Create** | tsup bundler configuration |
| `package.json` | **Modify** | Add bin, files, engines, scripts; remove private |
| `scripts/cli-game.ts` | **Modify** | Add setup mode, subcommands, config loading |
| `src/infra/persistence/SaveRepository.ts` | **Modify** | Support `~/.mysterium/saves/` path |
| `.github/workflows/deploy.yml` | **Modify** | Add npm publish job |
| `tests/cli.test.ts` | **Create** | Integration tests for CLI |

---

## 6. Dependency Changes

| Package | Current | Action | Reason |
|---|---|---|---|
| `tsup` | — | **Add** devDep | Bundle CLI for distribution |
| `tsc-alias` | — | **Add** devDep | Resolve path aliases before bundling |
| `phaser` | dep | Keep as dep | Required for web build; CLI bundle externalizes it |
| `tsx` | devDep | Keep as devDep | Still needed for `npm run dev:cli` during development |
| `execa` | — | **Add** devDep | CLI integration testing |

---

## 7. Execution Order

```
Phase 1: Bundle the CLI (Day 1)
  ├── Install tsup + tsc-alias
  ├── Create tsup.config.ts
  ├── Build and verify dist/cli/cli-game.js works
  └── Smoke test: `node dist/cli/cli-game.js --help`

Phase 2: Package for npm (Day 1-2)
  ├── Update package.json (bin, files, engines, scripts)
  ├── Remove "private": true
  ├── Test with `npm link`
  └── Verify `mysterium --help` works globally

Phase 3: First-Run Experience (Day 2-3)
  ├── Add config directory support (~/.mysterium/)
  ├── Add `setup` subcommand
  ├── Update SaveRepository for ~/.mysterium/saves/
  └── Add config loading priority chain

Phase 4: CLI Polish (Day 3)
  ├── Add subcommand structure (session, diagnostic, status, new-game)
  ├── Enhance help text with full usage guide
  ├── Add --version flag
  └── Update README with install instructions

Phase 5: Testing & Validation (Day 4)
  ├── Write integration tests
  ├── Add CI/CD publish workflow
  ├── Test npm publish --dry-run
  └── Final smoke test
```

---

## 8. Success Criteria

- [ ] `npm install -g mysterium` installs successfully
- [ ] `mysterium --help` shows comprehensive usage
- [ ] `mysterium` starts an interactive session
- [ ] `mysterium --headless --no-llm --encounters=5` runs 5 automated encounters
- [ ] `mysterium setup` configures LLM API key
- [ ] Saves persist in `~/.mysterium/saves/` across sessions
- [ ] `mysterium diagnostic` shows 64 modules, 36 holons, CCI
- [ ] JSON mode produces clean, parseable output
- [ ] All 448+ tests pass
- [ ] Bundle size is reasonable (< 500KB)
- [ ] No Phaser code in the CLI bundle

---

## 9. Future Considerations

### 9.1 Homebrew Tap
Following hermes-agent's pattern, create a Homebrew formula:
```bash
brew tap ishanp/mysterium
brew install mysterium
```

### 9.2 Docker Support
```dockerfile
FROM node:20-slim
RUN npm install -g mysterium
ENTRYPOINT ["mysterium", "--headless", "--no-llm"]
```

### 9.3 Auto-Update Check
Check for new versions on startup (like hermes does):
```typescript
// In main(), before session start:
const latestVersion = await checkNpmVersion('mysterium');
if (latestVersion !== VERSION) {
  info('update', `New version available: ${latestVersion} (current: ${VERSION})`);
  info('update', `Run ${C.bold}npm update -g mysterium${C.reset} to upgrade`);
}
```

### 9.4 Interactive TUI (Ink/React Terminal)
For a richer interactive experience, consider migrating from readline to Ink (React for CLIs) — similar to how hermes-agent uses a TUI gateway. This would enable:
- Real-time CCI progress bars
- Animated transitions between encounters
- Color-coded shadow quadrant displays
- Interactive menu navigation

### 9.5 Plugin System
Allow users to add custom developmental modules:
```
mysterium plugin add @mysterium/custom-module
```
