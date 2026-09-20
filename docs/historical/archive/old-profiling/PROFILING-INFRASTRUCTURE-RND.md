# Mysterium Profiling Infrastructure — R&D Design Document

## Hermes-Agent Architecture Study — Key Insights

### 1. Frozen Snapshot Pattern (memory_tool.py)

Hermes uses a **frozen snapshot** pattern for memory injection:
- `MEMORY.md` (agent's notes) and `USER.md` (user profile) are loaded at session start
- The loaded content becomes a **frozen snapshot** injected into the system prompt
- Mid-session writes update files on disk immediately (durable) but do NOT change the system prompt
- The snapshot refreshes on the NEXT session start

**Why this matters for Mysterium:** We currently inject profile context via `process.env.Mysterium_PROFILE_CONTEXT` — this IS the frozen snapshot pattern. But we don't have the mid-session write capability (the agent can't update `narrative-memory.md` during a session). The agent r/w tools I built (`agentReadProfileFile` / `agentWriteProfileFile`) need to be wired as actual Mysterium tools.

### 2. Session Search (session_search_tool.py)

Hermes stores all sessions in SQLite with FTS5 full-text search. The agent can:
- **DISCOVERY**: search past sessions by query → returns snippets + context windows
- **SCROLL**: drill into a specific session, scroll forward/backward
- **BROWSE**: list recent sessions chronologically

**Why this matters for Mysterium:** Our `encounter-log.md` is the equivalent — but it's a flat file, not searchable. For the current scale (single user, ~20 encounters/session), a flat file is sufficient. For future scale (longitudinal use, hundreds of sessions), SQLite + FTS5 would be needed.

### 3. Skill Management (skill_manager_tool.py)

Hermes has **procedural memory** — skills the agent creates/edits/deletes:
- `create`: new skill (SKILL.md + directory structure)
- `edit`: full rewrite of skill content
- `patch`: targeted find-and-replace
- `delete`: remove skill
- `write_file`: add supporting files

Skills are the agent's **procedural memory** — "how to do a specific type of task." This is different from declarative memory (MEMORY.md = facts, USER.md = user knowledge).

**Why this matters for Mysterium:** The Mysterium agent doesn't have procedural memory yet. It can't learn "this user responds better to somatic prompts than cognitive ones" and adjust its approach. This is a future enhancement — for now, the preferences.yaml captures static preferences, but the agent can't evolve its strategy.

### 4. Self-Evolution (background_review)

Hermes has a **background review** fork that can autonomously evolve skills — but only skills it has actually read (provenance tracking). This prevents the agent from rewriting content it only inferred from the transcript.

**Why this matters for Mysterium:** Post-session synthesis is our equivalent — the system updates the profile after each session. But we could go further: an autonomous "profile review" that reads the encounter log and updates narrative-memory.md with patterns it noticed.

## Mysterium Profiling Infrastructure Design

### Design Principle: YAML-Canonical, JSON-Transmuted

**All profile files are YAML/MD (canonical).** The Significator JSON is an internal implementation detail — it's the in-memory game state that gets transmuted TO YAML for persistence and context injection.

```
In-memory (TypeScript objects)
  ↓ save
YAML files (canonical, human-readable, agent-accessible)
  ↓ load
In-memory (TypeScript objects, reconstructed from YAML)
  ↓ context injection
LLM system prompt (frozen snapshot of YAML content)
```

This eliminates the dual-storage problem: YAML is the single source of truth. The JSON save is replaced by YAML.

### The Canonical Profile Directory

```
~/.mysterium/profiles/<name>/
├── identity.yaml              # System-managed: name, pronouns, lifecycle, totals
├── preferences.yaml           # User-managed: metaphor, intensity, pacing
├── developmental-state.yaml   # System-managed: altitudes, drives, ray profile, CCI
├── shadow-ledger.yaml         # System-managed: shadows (synced from in-memory)
├── session-history.yaml       # System-managed: last 20 sessions
├── goals.yaml                 # Agent r/w: self-declared + inferred goals
├── narrative-memory.md        # Agent r/w: insights, patterns, active work
├── encounter-log.md           # System-managed: per-encounter log
├── sig.yaml                   # System-managed: full Significator state (replaces live-state.json)
└── world.yaml                 # System-managed: WorldState (replaces world-state.json)
```

**Key change:** `sig.yaml` replaces `live-state.json`. The Significator — with all its nested structures (polarity cells, shadow entries, transformation records) — is serialized as YAML, not JSON. This makes the ENTIRE game state human-readable and agent-accessible.

### Profile Lifecycle

#### Phase 1: Cold Start (Onboarding)
```
mysterium setup-profile
  → User provides: name, pronouns, metaphor preference, intensity, goals
  → Creates profile directory with 10 files
  → All developmental state seeded at Red
  → narrative-memory.md seeded with user's stated goals
  → Sets profile as active
```

#### Phase 2: Session Start (Context Injection)
```
mysterium --headless --encounters=3 --answer "..."
  1. Load active profile (10 YAML/MD files)
  2. Parse sig.yaml → Significator object (in-memory)
  3. Parse world.yaml → WorldState object (in-memory)
  4. Build frozen snapshot from identity + preferences + goals + narrative-memory + shadow-ledger + session-history
  5. Inject frozen snapshot into LLM system prompt
  6. Begin session
```

#### Phase 3: During Session (Live Updates)
```
After each encounter:
  1. Update in-memory Significator (applyConsequences)
  2. Append to encounter-log.md (user words + LLM response)
  3. [Future] Agent can read narrative-memory.md via mysterium_read_profile_file
  4. [Future] Agent can append insights to narrative-memory.md via mysterium_write_profile_file
  5. [Future] Agent can update goals.yaml via mysterium_write_profile_file
```

#### Phase 4: Session End (Synthesis)
```
After session ends:
  1. Save in-memory Significator → sig.yaml
  2. Save in-memory WorldState → world.yaml
  3. Sync developmental-state.yaml (mirror from sig)
  4. Sync shadow-ledger.yaml (mirror from sig)
  5. Update identity.yaml (totals, last_active, lifecycle)
  6. Append session entry to session-history.yaml
  7. [Future] Post-session synthesis: LLM reads encounter-log.md, extracts insights, appends to narrative-memory.md
```

#### Phase 5: Cross-Session (Profile Evolution)
```
Over multiple sessions:
  - narrative-memory.md accumulates insights → patterns become visible
  - shadow-ledger.yaml tracks shadow progression (surfacing → working → integrating → integrated)
  - goals.yaml evolves (new goals inferred, old goals resolved)
  - session-history.yaml builds a longitudinal arc
  - [Future] Session search: agent can search past encounters by keyword
  - [Future] Procedural memory: agent learns which approaches work for this user
```

### The Significator-as-YAML Problem

The Significator has deeply nested structures:
- `polarity.cells`: 64-cell matrix (line×stage) with traceCount, dominantPattern, coherence, crystallization
- `shadows.entries`: array of shadow records
- `recentEncounters`: array of encounter records
- `transformations`: array of transformation records

These are currently JSON-serialized. Converting to YAML requires a deep serializer that handles:
- Nested objects in arrays
- Read-only records (immutable)
- Numbers, strings, booleans, null

**Approach:** Use a recursive YAML serializer that handles arbitrary depth. The existing `serializeSimpleYaml` needs to be upgraded to handle the Significator's full structure.

### Implementation Priority

1. **NOW: Wire agent r/w tools into the Mysterium tool registry** — the functions exist but aren't accessible to the LLM during a session
2. **NOW: Post-session synthesis** — after saving, use the LLM to read the encounter log and extract insights for narrative-memory.md
3. **NEXT: sig.yaml** — replace live-state.json with YAML (requires deep serializer)
4. **NEXT: Session search** — for longitudinal use, add a search tool over encounter-log.md
5. **FUTURE: Procedural memory** — the agent learns which approaches work for this user
6. **FUTURE: Background review** — autonomous profile synthesis between sessions
