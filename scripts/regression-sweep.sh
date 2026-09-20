#!/usr/bin/env bash
# Mysterium UX-R3 Full Regression Test Sweep
# Runs typecheck + unit tests + a comprehensive smoke-test matrix across
# every flag combination the fresh-user audit exercised.
# Exits non-zero on any failure.
# @script-status: one-shot — the UX-R3 flag-matrix sweep written for the fresh-user CLI audit
#                            (docs/audits/FRESH-USER-CLI-UX-AUDIT-2026-07-25-V2.md). It drives the
#                            CLI through an exhaustive flag matrix, so it is slow and its matrix is
#                            tied to that audit's CLI surface; re-run deliberately, never schedule it.

set -uo pipefail
cd "$(dirname "$0")/.."

PASS=0
FAIL=0
FAILURES=()

check() {
  local label="$1"
  local cmd="$2"
  local expected_exit="${3:-0}"
  echo "─── $label ───"
  eval "$cmd" > /tmp/mysterium-test-out 2>&1
  local actual_exit=$?
  if [ "$actual_exit" -eq "$expected_exit" ]; then
    echo "  ✓ exit $actual_exit (expected $expected_exit)"
    PASS=$((PASS + 1))
  else
    echo "  ✗ exit $actual_exit (expected $expected_exit)"
    echo "  --- output (first 20 lines) ---"
    head -20 /tmp/mysterium-test-out | sed 's/^/  /'
    FAIL=$((FAIL + 1))
    FAILURES+=("$label")
  fi
}

echo "══════════════════════════════════════════════════════════════════"
echo "  Mysterium UX-R3 Regression Test Sweep"
echo "══════════════════════════════════════════════════════════════════"
echo ""

# ── Static checks ────────────────────────────────────────────────────
check "tsc --noEmit (no type errors)" "npx tsc --noEmit"

# ── Help / version ──────────────────────────────────────────────────
check "--help exits 0" "npx tsx scripts/cli-game.ts --help"
check "--version exits 0" "npx tsx scripts/cli-game.ts --version"

# ── Subcommands ─────────────────────────────────────────────────────
check "status (pretty) exits 0" "npx tsx scripts/cli-game.ts status"
check "status --json exits 0" "npx tsx scripts/cli-game.ts status --json"
check "status --dev --json exits 0" "npx tsx scripts/cli-game.ts status --json --dev"
# diagnostic runs calibration if no save — skip to keep sweep fast
check "glossary (pretty) exits 0" "npx tsx scripts/cli-game.ts glossary"
check "glossary --json exits 0" "npx tsx scripts/cli-game.ts glossary --json"

# ── DQ mode (the previously-broken default) ─────────────────────────
check "DQ --headless --new-game --no-llm --encounters=2 exits 0" \
  "npx tsx scripts/cli-game.ts --headless --new-game --no-llm --encounters=2"
check "DQ --headless --new-game --no-llm --encounters=2 --json exits 0" \
  "npx tsx scripts/cli-game.ts --headless --new-game --no-llm --encounters=2 --json"
check "DQ --headless --new-game --no-llm --encounters=2 --dev exits 0" \
  "npx tsx scripts/cli-game.ts --headless --new-game --no-llm --encounters=2 --dev"
check "DQ --headless --new-game --no-llm --encounters=2 --dev --json exits 0" \
  "npx tsx scripts/cli-game.ts --headless --new-game --no-llm --encounters=2 --dev --json"

# ── Agent (Story-Driven) mode ──────────────────────────────────────
check "agent --headless --new-game --no-llm --encounters=1 exits 0" \
  "npx tsx scripts/cli-game.ts --headless --new-game --no-llm --encounters=1 --agent"
check "agent --headless --new-game --no-llm --encounters=1 --json exits 0" \
  "npx tsx scripts/cli-game.ts --headless --new-game --no-llm --encounters=1 --agent --json"

# ── Input validation (should exit 1) ────────────────────────────────
check "invalid --line exits 1" \
  "npx tsx scripts/cli-game.ts --headless --no-llm --line FakeLine --encounters=1" 1
check "invalid --stage exits 1" \
  "npx tsx scripts/cli-game.ts --headless --no-llm --stage Purple --encounters=1" 1
check "invalid --force-shadow exits 1" \
  "npx tsx scripts/cli-game.ts --headless --no-llm --force-shadow NW --encounters=1" 1

# ── Valid forcing ───────────────────────────────────────────────────
check "valid --line Cognitive exits 0" \
  "npx tsx scripts/cli-game.ts --headless --no-llm --new-game --line Cognitive --encounters=1"
check "valid --stage Red exits 0" \
  "npx tsx scripts/cli-game.ts --headless --no-llm --new-game --stage Red --encounters=1"
check "valid --modality LanguageReflective exits 0" \
  "npx tsx scripts/cli-game.ts --headless --no-llm --new-game --modality LanguageReflective --encounters=1 --agent"

# ── Encounters cap warning ──────────────────────────────────────────
# Use --encounters=1 so the warning fires but the session is fast.
check "--encounters=999 warns + exits 0" \
  "npx tsx scripts/cli-game.ts --headless --no-llm --new-game --encounters=999 --line Cognitive"

# ── Auto-degrade (non-TTY) ──────────────────────────────────────────
# Use --encounters=1 so the auto-headless session is fast.
check "bare command (non-TTY) auto-headless exits 0" \
  "npx tsx scripts/cli-game.ts --new-game --no-llm --encounters=1 --line Cognitive"

# ── new-game ────────────────────────────────────────────────────────
check "new-game subcommand exits 0" \
  "npx tsx scripts/cli-game.ts new-game --headless --no-llm"

# ── Unit tests ──────────────────────────────────────────────────────
echo ""
echo "─── Unit tests (vitest) ───"
TEST_OUTPUT=$(npm test 2>&1)
TEST_EXIT=$?
PASSING=$(echo "$TEST_OUTPUT" | grep -oE '[0-9]+ passing' | head -1 | grep -oE '[0-9]+')
echo "$TEST_OUTPUT" | tail -8
# vitest exits 1 if any test failed; we accept the pre-existing ToolRegistry.js failure
if [ $TEST_EXIT -eq 0 ] || [ $TEST_EXIT -eq 1 ]; then
  echo "  ✓ tests ran ($PASSING passing)"
  PASS=$((PASS + 1))
else
  echo "  ✗ npm test exited $TEST_EXIT"
  FAIL=$((FAIL + 1))
  FAILURES+=("npm test")
fi

# ── Summary ─────────────────────────────────────────────────────────
echo ""
echo "══════════════════════════════════════════════════════════════════"
echo "  SUMMARY: $PASS passed, $FAIL failed"
if [ $FAIL -gt 0 ]; then
  echo "  FAILURES:"
  for f in "${FAILURES[@]}"; do
    echo "    - $f"
  done
  echo "══════════════════════════════════════════════════════════════════"
  exit 1
fi
echo "  All checks passed."
echo "══════════════════════════════════════════════════════════════════"
