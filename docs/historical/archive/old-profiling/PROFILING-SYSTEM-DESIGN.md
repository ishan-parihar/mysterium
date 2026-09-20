# User Profiling System — Architecture Audit + Design

## 1. Current State Audit

### 1.1 Storage: Single-user filesystem (JSON)

The current system uses `~/.mysterium/save-all.json` — a single JSON file containing:
- `sig` (Significator): the player's developmental state (altitudes, drives, shadows, polarity cells, ray profile, recent encounters, codex entries, transformation state)
- `world` (WorldState): the game world (holons, macro events, PESTLE tension)
- `version` + `savedAt`: envelope metadata

**No multi-user support.** The save is keyed to `cli-player` — a hardcoded ID. There's no concept of profiles, no user switching, no separation between users.

### 1.2 Memory: Amnesiac between sessions

The Significator carries:
- `recentEncounters` (max ~20): a rolling window of encounter records. Older encounters are dropped.
- `codexEntries`: empty in practice. Never populated.
- `UserMatrixModel`: stored in `globalThis` — NOT persisted. Resets every session.
- `SessionAgent`: cross-encounter synthesis within a session — NOT persisted.

**The game forgets everything between sessions except the raw state vectors.** It doesn't remember:
- What the user said (their actual words)
- What themes surfaced
- What insights the LLM offered
- What shadows were named
- What the user is working on

### 1.3 What's missing

1. **Long-term narrative memory** — the game can't reference what the user said 3 sessions ago
2. **Multi-user profiles** — no way for two people to play on the same system
3. **Cold-start context** — new sessions start from state vectors, not from a rich user profile
4. **Cross-session threading** — the LLM can thread within a session but not across sessions
5. **User identity** — no name, no preferences, no goals, no history

## 2. Design Decision: YAML-Schema Markdown Files

**Chosen over SQLite** because:

1. **Human-readable** — the user can inspect their own profile. This aligns with the Veil principle (qualitative, not clinical) while giving the user agency over their data.
2. **LLM-native** — YAML + markdown is the format the LLM reads/writes best. Context injection is trivial (just concatenate the files).
3. **Versionable** — profiles can be diffed, backed up, and version-controlled.
4. **Sandboxed** — the Mysterium agent can have access to a specific directory and nothing else.
5. **No binary dependencies** — no SQLite, no ORM, no migrations. Just files.
6. **Schema-validatable** — YAML schemas can be validated at load time.

## 3. Directory Architecture

```
~/.mysterium/
├── config.json                    # LLM config (global, not per-user)
├── profiles/
│   ├── _active                    # symlink → active profile dir
│   ├── maya/                      # one directory per user
│   │   ├── identity.yaml          # name, age, created, lifecycle
│   │   ├── developmental-state.yaml  # altitudes, drives, shadows, ray profile
│   │   ├── session-history.yaml   # last 20 sessions: date, encounters, themes, shifts
│   │   ├── narrative-memory.md    # long-term memory: key insights, reframes, patterns
│   │   ├── shadow-ledger.yaml     # surfaced shadows, integration status
│   │   ├── goals.yaml             # what the user is working on (self-declared + inferred)
│   │   └── preferences.yaml       # communication style, sensitivity, pacing
│   ├── jake/
│   │   ├── identity.yaml
│   │   ├── ...
│   └── sarah/
│       ├── identity.yaml
│       └── ...
└── saves/                          # game state (Significator JSON, backwards compat)
    ├── maya-save-all.json
    ├── jake-save-all.json
    └── sarah-save-all.json
```

## 4. YAML Schemas

### 4.1 identity.yaml
```yaml
# User identity — who they are, when they started, what lifecycle they're in
name: Maya Okonkwo
created: 2026-07-07T18:30:00Z
last_active: 2026-07-07T20:15:00Z
lifecycle: Exploring  # Onboarding → Exploring → Developing → Crystallizing → Transforming → Harvesting
total_sessions: 3
total_encounters: 9
current_stage: Red  # the Significator's currentStage
inferred_stage: Orange  # what the onboarding inferred
```

### 4.2 developmental-state.yaml
```yaml
# Developmental snapshot — mirrors Significator state but human-readable
altitudes:
  Cognitive: Red
  Emotional: Red
  Moral: Red
  Intrapersonal: Red
  Spiritual: Red
  Interpersonal: Red
  Somatic: Red
  Willpower: Red
drives:
  agency: 0.5
  communion: 0.5
  eros: 0.5
  agape: 0.5
ray_profile:
  Red: 0
  Orange: 0
  Yellow: 0.45
  Green: 0
  Blue: 0
  Indigo: 0
  Violet: 0
transformation:
  phase: idle
  target_stage: null
  sessions_in_phase: 0
  knots_resolved: 0
cci: 0.5036
```

### 4.3 session-history.yaml
```yaml
# Last 20 sessions — rolling window for cross-session context
sessions:
  - date: 2026-07-07T18:30:00Z
    encounters: 3
    lines_touched: [Moral, Spiritual, Interpersonal]
    themes: [people-pleasing, fear-of-mediocrity, performance-vs-authenticity]
    key_shift: "Recognized that achievement is a leash, not an identity"
    shadow_surfaced: DarkAllergy  # qualitative, not clinical
    llm_narrative_summary: "The hunger for supremacy was never the hunger..."
  - date: 2026-07-07T19:15:00Z
    encounters: 3
    ...
```

### 4.4 narrative-memory.md
```markdown
# Narrative Memory — Long-Term Context

## Key Insights (reframes the LLM offered that landed)
- **Session 1:** "The performance wasn't for the factions. It was the price she'd been paying to feel real." → Maya recognized achievement as coping.
- **Session 2:** "The performance of okay-ness is its own kind of hunger." → Maya stopped saying "I'm fine" to her mother.
- **Session 3:** "The need to be seen without performance." → Maya told her friend the truth.

## Patterns (recurring themes across sessions)
- People-pleasing as survival strategy
- Achievement as identity substitute
- Conflict avoidance → fear of disappearance

## Active Work (what the user is currently processing)
- Learning to be real without the grades
- The terror of authenticity

## Resolved (patterns that have been integrated)
- (none yet)

## Unresolved (patterns surfaced but not yet worked through)
- The "I'm fine" reflex
- Fear of mediocrity masked as ambition
```

### 4.5 shadow-ledger.yaml
```yaml
# Shadows surfaced — qualitative tracking
shadows:
  - first_surfaced: 2026-07-07T18:35:00Z
    line: Moral
    stage: Red
    pattern: "People-pleasing to avoid conflict"
    quadrant: DarkAllergy  # avoidance pattern
    status: surfacing  # surfacing → working → integrating → integrated
    last_touched: 2026-07-07T20:15:00Z
    sessions_active: 3
  - first_surfaced: 2026-07-07T19:20:00Z
    line: Intrapersonal
    stage: Red
    pattern: "Achievement as identity substitute"
    quadrant: GoldenAddiction  # emergent fixation
    status: working
    last_touched: 2026-07-07T20:15:00Z
    sessions_active: 2
```

### 4.6 goals.yaml
```yaml
# User goals — self-declared + inferred
self_declared:
  - "I want to understand myself better"
  - "I want to stop people-pleasing"
inferred:
  - "Learning to be authentic without performance"
  - "Processing the fear of disappearance"
active_focus: "The terror of authenticity"
```

### 4.7 preferences.yaml
```yaml
# Communication preferences
pronouns: she/her  # fixes the pronoun bug from Pilot R2
metaphor_preference: contemporary  # contemporary | mythic | clinical | poetic
intensity: moderate  # gentle | moderate | direct
pacing: reflective  # rapid | reflective | slow
```

## 5. Onboarding Process

### 5.1 Cold-start onboarding (new user)

```
mysterium setup-profile

→ "What should I call you?" → name
→ "What pronouns should I use?" → pronouns
→ "What brings you here?" → open-ended (feeds goals.yaml + narrative-memory.md)
→ "What are you working on?" → open-ended (feeds goals.yaml)
→ "How do you want me to talk to you?" → metaphor_preference + intensity + pacing

→ Creates ~/.mysterium/profiles/<name>/
→ Writes all 7 YAML/MD files
→ Sets _active symlink
→ Runs the binary-search onboarding (inferAltitudesFromAnswers)
→ Seeds developmental-state.yaml
```

### 5.2 Profile switching

```
mysterium profile list      → lists all profiles
mysterium profile switch <name>  → changes _active symlink
mysterium profile create <name>  → new onboarding
mysterium profile delete <name>  → removes profile (with confirmation)
```

## 6. Context Injection

When a session starts, the CLI reads all 7 files from the active profile directory and injects them into the LLM system prompt. This gives the LLM:

- Who the user is (identity.yaml)
- Where they are developmentally (developmental-state.yaml)
- What happened in recent sessions (session-history.yaml)
- What insights have landed (narrative-memory.md)
- What shadows are active (shadow-ledger.yaml)
- What they're working on (goals.yaml)
- How to communicate (preferences.yaml)

This is the "catch up easily and effectively" the user asked for. The LLM starts every session already knowing the user's history, patterns, and active work.

## 7. Implementation Plan

1. Create `src/infra/profiles/ProfileManager.ts` — the core profiling system
2. Create YAML schemas + validators
3. Add `profile` subcommand to CLI (list, switch, create, delete)
4. Add `setup-profile` onboarding flow
5. Wire profile loading into session startup (context injection)
6. Wire profile saving into session end (update state, history, memory)
7. Migrate existing save to profile format
