# Profiling Architecture Audit — Deep Investigation

## Executive Summary

The current architecture has a **dual-storage problem**: user state lives in BOTH `save-all.json` (the Significator, used during sessions) AND the YAML profile files (used for context injection). These two stores are **not synchronized** — the YAML is a stale snapshot updated only post-session, and critical data (shadows, session history, narrative memory) is **never populated** in the YAML at all.

The agent has **no read/write access** to the profile files during a session. It can only see what was injected via `process.env.Mysterium_PROFILE_CONTEXT` at startup, and it can only write via `updateProfileAfterSession()` after the session ends.

This is inadequate for the user's vision: an agent that can read and modulate the user's profile files in real-time, within a sandboxed directory, so the profile evolves WITH the game.

---

## 1. Current State Map — Where Everything Lives

### 1.1 The Significator (save-all.json) — LIVE game state

```
~/.mysterium/save-all.json
└── { sig: Significator, world: WorldState }
```

**What it stores:**
- `id`: "cli-player" (hardcoded, not profile-aware)
- `altitudes`: per-line stage (Cognitive:Red, Emotional:Red, ...)
- `currentStage`: dominant stage
- `drives.weights`: agency/communion/eros/agape (live-updated per encounter)
- `drives.fixationRisk`: per-drive addiction risk
- `polarity.cells`: 64-cell matrix (line×stage) with traceCount, dominantPattern, coherence
- `shadows.entries`: structured shadow records (line, stage, quadrant, severity, surfacedAt, resolvedAt)
- `rayProfile`: 7-ray activation levels
- `theta.lastEncounter`: per-cell timestamp (for decay)
- `transformations`: transformation records
- `codexEntries`: lore entries (barely used)
- `recentEncounters`: last ~20 encounter records (rolling window)
- `transformationPhase/SessionsInPhase/KnotsResolved/TotalKnots/TargetStage`
- `totalEncounters`, `totalSessions`
- `lifecycle`: Onboarding/Exploring/Developing/Crystallizing/Transforming/Harvesting
- `contactBoundaryPermeability`
- `internalizedHolons`
- `greatWayDirection`

**How it's updated:** `ConsequenceEngine.applyConsequences()` → called inside `AgenticOrchestrator.finalizeEncounter()` → called after every encounter → returns `updatedSig` → CLI assigns to `currentSig` → saved via `saveAll()` at session end.

**The problem:** This is a **single-user monolithic blob**. It's not profile-aware, not multi-user, and not readable by the agent during a session.

### 1.2 The YAML Profile (~/.mysterium/profiles/<name>/) — CONTEXT INJECTION

```
~/.mysterium/profiles/default/
├── identity.yaml          # name, totals, stage (DUPLICATES sig)
├── developmental-state.yaml  # altitudes, drives (DUPLICATES sig, STALE)
├── session-history.yaml   # sessions: [] (NEVER POPULATED)
├── narrative-memory.md    # template, no real insights written
├── shadow-ledger.yaml     # shadows: [] (NEVER POPULATED from sig)
├── goals.yaml             # empty (only set during setup-profile)
└── preferences.yaml       # pronouns, metaphor, intensity (UNIQUE — not in sig)
```

**How it's updated:** `updateProfileAfterSession()` → called ONCE at session end → updates identity + developmental-state + session-history (but sessionEntry is never passed) + narrative-memory (but narrativeInsight is never passed).

**The problems:**
1. **Dual storage:** identity + developmental-state duplicate the Significator but are stale snapshots
2. **Never populated:** session-history, narrative-memory, shadow-ledger are all empty
3. **No agent access:** the agent can't read or write these files during a session
4. **No sandbox:** the profile directory isn't exposed to the agent as a tool
5. **Not synchronized:** the YAML and JSON can diverge (e.g., drives in YAML show 0.01 but the sig has 0.5)

### 1.3 What's LOST between sessions (not persisted at all)

| Data | Where it lives | Persisted? |
|---|---|---|
| UserMatrixModel | `globalThis.__userMatrixModel` | ❌ NO — resets every session |
| SessionAgent synthesis | in-memory `SessionAgent` object | ❌ NO — resets every session |
| LLM message history | `AgenticOrchestrator.messages` | ❌ NO — resets every session |
| User's actual words (write-in answers) | `result.response.writeInValue` | ❌ NO — only in recentEncounters (structured, not text) |
| LLM narrative responses | `result.narrativeSummary` | ❌ NO — only in recentEncounters (truncated) |
| Cross-encounter themes | SessionAgent's internal model | ❌ NO |

**The game forgets the user's actual words and the LLM's actual responses between sessions.** The Significator stores structured state (drive scores, polarity traces) but not the narrative content that makes the therapeutic relationship continuous.

---

## 2. The Ideal Architecture

### 2.1 Design principles

1. **Single source of truth** — no dual storage. The profile IS the state.
2. **Agent r/w access** — the agent can read and write profile files during a session
3. **Sandboxed** — agent access is limited to the active profile directory
4. **Evolves with the game** — profile structure can grow without breaking old profiles
5. **Human-readable** — YAML/MD files the user can inspect
6. **Multi-user** — each user has their own profile directory

### 2.2 The unified profile directory

```
~/.mysterium/profiles/<name>/
├── identity.yaml              # UNIQUE: name, pronouns, lifecycle (not in sig)
├── preferences.yaml           # UNIQUE: metaphor, intensity, pacing (not in sig)
├── goals.yaml                 # UNIQUE: self-declared + inferred goals
├── narrative-memory.md        # UNIQUE: long-term insights, patterns, active work
│
├── developmental-snapshot.yaml  # MIRROR: altitudes, drives, CCI (synced from sig)
├── shadow-ledger.yaml         # MIRROR: shadows (synced from sig, qualitative)
├── session-log.yaml           # UNIQUE: last 20 sessions with themes + shifts
│
├── encounter-log.md           # NEW: running log of encounters (user words + LLM responses)
├── live-state.json            # NEW: the Significator JSON (replaces save-all.json)
└── world-state.json           # NEW: the WorldState JSON (per-profile)
```

**Key changes from current:**
- `live-state.json` + `world-state.json` move INTO the profile directory — no more `~/.mysterium/save-all.json`
- `encounter-log.md` is NEW — captures the user's words and LLM responses (the therapeutic conversation)
- `developmental-snapshot.yaml` and `shadow-ledger.yaml` are MIRRORS — synced from the sig, not independent
- `identity.yaml`, `preferences.yaml`, `goals.yaml`, `narrative-memory.md` are UNIQUE — not in the sig

### 2.3 Agent tools for profile r/w

The agent gets two new tools:

```
mysterium_read_profile_file(filename)
  → Returns the contents of a profile file (narrative-memory.md, goals.yaml, etc.)
  → Sandboxed: can only read files in the active profile directory
  → Valid filenames: identity.yaml, preferences.yaml, goals.yaml,
     narrative-memory.md, shadow-ledger.yaml, session-log.yaml,
     developmental-snapshot.yaml, encounter-log.md

mysterium_write_profile_file(filename, content, mode)
  → Writes/appends to a profile file
  → Sandboxed: can only write to the active profile directory
  → mode: 'overwrite' | 'append'
  → Valid filenames: narrative-memory.md, goals.yaml, encounter-log.md
     (NOT identity.yaml, preferences.yaml, developmental-snapshot.yaml — those are system-managed)
```

### 2.4 When each file gets updated

| File | When | Who |
|---|---|---|
| identity.yaml | Session start (load) + session end (update totals) | CLI (system-managed) |
| preferences.yaml | setup-profile (create) + manual edit | User (via setup-profile) |
| developmental-snapshot.yaml | After every encounter (sync from sig) | CLI (system-managed) |
| shadow-ledger.yaml | After every encounter (sync from sig) | CLI (system-managed) |
| session-log.yaml | Session end (append entry) | CLI (system-managed) |
| goals.yaml | During session (agent can update inferred goals) | Agent (r/w) + CLI |
| narrative-memory.md | During session (agent appends insights) + session end | Agent (r/w) |
| encounter-log.md | After every encounter (append user words + LLM response) | CLI (system-managed) |
| live-state.json | After every encounter (save sig) | CLI (system-managed) |
| world-state.json | After every encounter (save world) | CLI (system-managed) |

### 2.5 The sync model

**The Significator (live-state.json) is the source of truth for game state.** The YAML files are either:
- **UNIQUE** (identity, preferences, goals, narrative-memory, encounter-log) — not in the sig
- **MIRRORS** (developmental-snapshot, shadow-ledger) — synced FROM the sig after every encounter

This eliminates the dual-storage problem: there's one source of truth for game state (the sig), and the YAML mirrors are just human-readable projections.

**The narrative-memory.md and encounter-log.md are the agent's domain.** The agent can read and write these during a session. The CLI doesn't touch them except to create the initial template.

---

## 3. What Needs to Change

### 3.1 Move save files into the profile directory

**Current:** `~/.mysterium/save-all.json`
**Ideal:** `~/.mysterium/profiles/<name>/live-state.json` + `world-state.json`

This makes the save per-profile and eliminates the `getSaveFilePath()` indirection.

### 3.2 Add encounter logging

After every encounter, append to `encounter-log.md`:
```markdown
## Encounter N — 2026-07-07T22:15:00Z
**Line:** Moral | **Stage:** Red | **NPC:** Elder Ashmark
**Question:** When does honesty become cruel?
**User's answer:** I people-please because conflict makes me feel like I'm going to die.
**LLM narrative:** The warrior paused. The question cut deeper than any blade...
**Drive signals:** DarkAllergy (Communion)
**Shadow surfaced:** People-pleasing as conflict avoidance
```

This preserves the therapeutic conversation across sessions — the thing the pilot personas needed most.

### 3.3 Sync shadows and developmental state to YAML after every encounter

Currently `updateProfileAfterSession()` runs once at session end. It should run after every encounter (or at least sync the YAML mirrors).

### 3.4 Add agent tools for profile r/w

Add `mysterium_read_profile_file` and `mysterium_write_profile_file` to the MysteriumTools registry. These give the agent real-time access to the user's narrative memory and goals during a session.

### 3.5 Populate session-log.yaml with real entries

Currently `sessionEntry` is never passed to `updateProfileAfterSession()`. The session end should construct a proper entry with themes, key shifts, and LLM narrative summary.

### 3.6 Persist UserMatrixModel

Currently stored in `globalThis` — lost between sessions. Should be saved to the profile (either as a YAML file or as part of live-state.json).
