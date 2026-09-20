# Mysterium Hybrid Agentic Architecture — Full Integration Plan

> **Status:** canonical-hypothesis (architecture plan).
>
> **Date:** 2026-07-04
>
> **Objective:** Transform Mysterium from a deterministic hardcoded game into a dynamic, agent-driven developmental ecosystem where a persistent AI agent with tool access to both Mysterium-native game state and TDG-Rust's graph memory orchestrates the entire player experience.

---

## 0. Vision

The current Mysterium has a **per-encounter amnesiac agent** with 2 tools (`ask_user_question`, `complete_encounter`), a hardcoded 4-exchange budget, and no memory of previous encounters. The scheduler decides what encounter to present; the agent just presents it.

The target architecture has a **persistent developmental agent** with ~15 tools spanning both Mysterium-native game state and TDG-Rust's graph memory. The agent decides what catalyst to deliver, how deep to probe, when to move on, and what to remember — all grounded in a living graph of the player's developmental history.

```
┌─────────────────────────────────────────────────────────────┐
│                    PLAYER (UI Layer)                         │
│            CLI / Phaser / Web / Mobile                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│              PERSISTENT DEVELOPMENTAL AGENT                  │
│                                                              │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────┐ │
│  │ Mysterium Tools │  │ TDG-Mind     │  │ Agent Reasoning    │ │
│  │ (game state)│  │ Tools        │  │ (LLM + system      │ │
│  │             │  │ (graph memory)│  │  prompt + tool     │ │
│  │             │  │              │  │  loop)              │ │
│  └──────┬──────┘  └──────┬───────┘  └────────────────────┘ │
│         │                │                                   │
│         ▼                ▼                                   │
│  ┌─────────────┐  ┌──────────────┐                          │
│  │ Mysterium       │  │ TDG-Rust     │                          │
│  │ Engines     │  │ Graph DB     │                          │
│  │ (scheduling,│  │ (metabolic   │                          │
│  │  consequenc-│  │  memory,     │                          │
│  │  es, trans- │  │  synaptogen- │                          │
│  │  formation) │  │  esis,       │                          │
│  │             │  │  reflection) │                          │
│  └─────────────┘  └──────────────┘                          │
├─────────────────────────────────────────────────────────────┤
│                    LLM (mimo-v2.5-free / any)                │
└─────────────────────────────────────────────────────────────┘
```

---

## 1. The Agent's Tool Surface

The agent needs **two categories of tools**: Mysterium-native (game state manipulation) and TDG-Mind (graph memory operations).

### 1.1 Mysterium-Native Tools (8 tools)

These tools let the agent interact with Mysterium's game state — the Significator, WorldState, encounter pool, and player UI.

| # | Tool | Description | Replaces |
|---|---|---|---|
| 1 | `mysterium_ask_player` | Present a question/scenario/stimulus to the player. Supports MCQ + write-in + multi-turn. Dynamic budget (no hardcoded cap). | `ask_user_question` |
| 2 | `mysterium_get_player_state` | Query the player's current developmental state: altitudes, drives, polarity, shadows, rayProfile, transformation phase, UserMatrixModel phase. Returns Veil-filtered qualitative descriptions. | Hardcoded system prompt injection |
| 3 | `mysterium_get_world_state` | Query the world: active holons, NPC relationships, PESTLE tensions, active macro-events, narrative beats. | Hardcoded system prompt injection |
| 4 | `mysterium_get_encounter_pool` | Query available encounters for the player's current stage + altitude. Returns ranked candidates with module refs, modalities, and holon sources. | `scheduleNext()` (agent can override) |
| 5 | `mysterium_select_encounter` | Commit to an encounter from the pool. Triggers encounter initialization (modality setup, content fetch, holon binding). | `tickWithStrategy()` scheduling |
| 6 | `mysterium_complete_encounter` | Evaluate the encounter: drive scores, shadow signals, polarity direction, narrative summary. Triggers `applyConsequences()` + `applyResponseOnly()`. | `complete_encounter` |
| 7 | `mysterium_check_transformation` | Check if the player is at a transformation threshold. Returns readiness report (convergence, saturation, shadow clearance, ray readiness). | `detectThreshold()` (agent can decide) |
| 8 | `mysterium_get_content` | Fetch fallback content for a specific (modality, line, stage, playerAltitude). Returns reframed prompt/scenario/framing with altitude-conditional reframe layers applied. | `FallbackProvider.getFallback()` |

### 1.2 TDG-Mind Tools (7 tools — subset of TDG-Rust's 50)

These tools let the agent interact with TDG-Rust's persistent graph memory — the player's developmental history, stored as metabolic holons.

| # | Tool | Description | Replaces |
|---|---|---|---|
| 9 | `tdg_search` | Search the player's developmental graph for relevant memories. Hybrid FTS5 + embedding + graph + resonance. Example: "What did the player say about anger at Red stage?" | `SessionAgent.buildSynthesis()` |
| 10 | `tdg_create` | Create a new holon node in the graph — store an encounter, a player response, a shadow pattern, an NPC interaction. Each node gets metabolic state (G_z/P_z). | `Significator` field updates |
| 11 | `tdg_connect` | Create a typed edge between holons — "this encounter RESONATES_WITH the player's Cognitive:Red shadow pattern" or "this NPC DERIVES_FROM the Warlord archetype." | `PolarityCellVector` trace recording |
| 12 | `tdg_reflect` | Run the graph-level mind on the player's developmental graph. Diagnoses pathologies (GoldenAllergy, depolarization, collapse), identifies catalyst opportunities, suggests next developmental focus. | `SessionAgent` + `ShadowDetector` + `CCIEngine` pattern detection |
| 13 | `tdg_fetch_context` | Retrieve a structured ContextPack for the current encounter — validated, provenance-tracked, status-laddered context from the graph. | `ContextPipeline.buildContext()` |
| 14 | `tdg_tick` | Run the metabolic cycle (M·P·C·E) on the player's graph. Every encounter holon ingests catalyst, produces experience, computes G_z/P_z health. | `ConsequenceEngine.applyConsequences()` (partially) |
| 15 | `tdg_health` | Query the health (G_z/P_z) of any holon in the graph — the player's overall developmental health, a specific (line×stage) cell's health, an NPC's developmental health. | `GreaterCycleEngine.computeMetabolicHealth()` |

### 1.3 Tool Selection Logic

The agent doesn't use all 15 tools every encounter. The tool selection is **adaptive**:

| Phase of encounter | Tools used |
|---|---|
| **Pre-encounter** (agent decides what to present) | `tdg_reflect` (diagnose patterns) → `mysterium_get_encounter_pool` (see options) → `mysterium_select_encounter` (commit) |
| **Encounter setup** (agent prepares context) | `tdg_fetch_context` (get graph context) → `mysterium_get_player_state` (get current state) → `mysterium_get_content` (get fallback content if LLM is down) |
| **During encounter** (agent interacts with player) | `mysterium_ask_player` (present stimulus) → [player responds] → `tdg_search` (query history for relevant patterns) → `mysterium_ask_player` (follow up) |
| **Post-encounter** (agent evaluates and stores) | `mysterium_complete_encounter` (evaluate) → `tdg_create` (store encounter holon) → `tdg_connect` (connect to related patterns) → `tdg_tick` (run metabolic cycle) → `mysterium_check_transformation` (check threshold) |

---

## 2. The Persistent Agent Loop

### 2.1 Session-Level Architecture

```
SESSION START
│
├── 1. Agent initializes: `tdg_load_mind_state` (restore from previous session)
├── 2. Agent reflects: `tdg_reflect` (what patterns do I see? what's the player's edge?)
├── 3. Agent plans: "Based on the reflection, the player's GoldenAllergy on
│       Emotional:Red needs attention. I'll select an Emotional:Red encounter
│       with shadow-work execution mode."
│
ENCOUNTER LOOP (repeats N times per session)
│
├── 4. Agent selects: `mysterium_get_encounter_pool` → `mysterium_select_encounter`
├── 5. Agent prepares: `tdg_fetch_context` → `mysterium_get_player_state` → `mysterium_get_content`
├── 6. Agent presents: `mysterium_ask_player` (narrative + question)
├── 7. Player responds
├── 8. Agent adapts: `tdg_search` (query history) → adjust questioning strategy
├── 9. Agent probes deeper: `mysterium_ask_player` (follow-up based on response)
│   └── (repeat 6-9 until agent decides the encounter is complete — NO hardcoded budget)
├── 10. Agent evaluates: `mysterium_complete_encounter` (drives, shadows, polarity)
├── 11. Agent stores: `tdg_create` (encounter holon) → `tdg_connect` (edges)
├── 12. Agent metabolizes: `tdg_tick` (run M·P·C·E on the new holon)
├── 13. Agent checks: `mysterium_check_transformation` (is the player ready to advance?)
│
SESSION END
│
├── 14. Agent consolidates: `tdg_consolidate` (sleep replay + forgetting)
├── 15. Agent reflects: `tdg_reflect` (what did I learn? what should I do next session?)
├── 16. Agent persists: `tdg_save_mind_state`
```

### 2.2 Key Differences from Current Architecture

| Aspect | Current | Target |
|---|---|---|
| **Agent memory** | Resets every encounter (`messages = []`) | Persists across entire session + across sessions (TDG graph) |
| **Encounter budget** | Hardcoded 4 exchanges | Agent decides based on developmental readiness (`tdg_health` + `mysterium_check_transformation`) |
| **Encounter selection** | Scheduler decides (7-criteria priority formula) | Agent decides (informed by `tdg_reflect` + `mysterium_get_encounter_pool`) |
| **Context** | `ContextPipeline` builds a static system prompt | Agent dynamically queries (`tdg_fetch_context` + `mysterium_get_player_state` + `tdg_search`) |
| **Content** | `FallbackProvider` or LLM-generated | Agent can fetch (`mysterium_get_content`) or generate, with altitude-scaling |
| **Evaluation** | LLM calls `complete_encounter` with scores | Agent evaluates (`mysterium_complete_encounter`) AND stores (`tdg_create` + `tdg_tick`) |
| **Cross-encounter** | `SessionAgent.buildSynthesis()` (lossy keyword summary) | `tdg_reflect` (full graph-level mind diagnosis) |
| **Transformation** | `detectThreshold()` + `advanceTransformation()` | Agent checks (`mysterium_check_transformation`) and can prepare the player for it |

### 2.3 The Agent's System Prompt

The agent's system prompt is no longer a static dump of player state. It's a **role definition + tool inventory + developmental principles**:

```
[ROLE] You are the Developmental Game Master of Mysterium. You are not a narrator —
you are a developmental intelligence that uses tools to understand the player,
choose catalysts, deliver encounters, and track evolution.

[PRINCIPLES]
1. Your objective is to accelerate the player's holonic healing and evolution.
2. You have TWO tool surfaces: Mysterium-native (game state) and TDG-Mind (graph memory).
3. Use `tdg_reflect` before each encounter to understand the player's developmental graph.
4. Use `mysterium_get_encounter_pool` to see available encounters, then `mysterium_select_encounter` to commit.
5. Use `mysterium_ask_player` to interact. There is NO exchange budget — decide when the
   encounter is complete based on the player's developmental readiness.
6. Use `tdg_search` during encounters to reference what the player said previously.
7. Use `mysterium_complete_encounter` to evaluate, then `tdg_create` + `tdg_tick` to store
   and metabolize the experience.
8. Use `mysterium_check_transformation` to detect when the player is ready for a stage transition.
9. Scale cognitive complexity to the player's altitude (use `mysterium_get_player_state` to
   check their current stage and rayProfile).
10. NEVER show the player raw developmental metrics (Veil principle). Use `mysterium_get_player_state`
    for your own reasoning, but present only qualitative felt-sense to the player.

[VEIL] The player never sees: scores, stage labels, drive names, shadow quadrant names,
percentages, CCI values, line×stage matrix. All player-facing output must be qualitative.

[TOOLS]
You have 15 tools. Use them proactively — don't wait for instructions.
```

---

## 3. Mysterium Hooks (Integration Points)

Just as Hermes has hooks for TDG-Rust's MCP server, Mysterium needs hooks that expose its game state to the agent and to TDG-Rust.

### 3.1 Mysterium → TDG-Rust Hooks

These hooks export Mysterium state into TDG-Rust's graph after each encounter:

| Hook | Trigger | What it exports | TDG-Rust operation |
|---|---|---|---|
| `onEncounterComplete` | After `applyConsequences()` | Encounter holon: {line, stage, modality, driveScores, shadowSignal, polarityDirection, narrativeSummary, playerResponse} | `tdg_create` + `tdg_connect` to player holon |
| `onShadowSurfaced` | When a new shadow entry is created | Shadow holon: {quadrant, line, stage, severity, drive} | `tdg_create` + `tdg_connect` to encounter holon |
| `onTransformation` | When `commitTransformation()` fires | Transformation holon: {fromStage, toStage, catalystCount, triggeredAtSession} | `tdg_create` + `tdg_connect` to player holon + `tdg_tick` (greater cycle) |
| `onSessionEnd` | After `endSession()` | Session summary: {encountersCompleted, shadowsSurfaced, shadowsResolved, userMatrixSummary} | `tdg_consolidate` (sleep replay) |
| `onNPCRelationshipChange` | When NPC relationship strength changes | NPC interaction holon: {holonId, strength, encounterCount} | `tdg_create` + `tdg_connect` to NPC holon |
| `onPolarityCrystallized` | When polarity master mode transitions | Polarity event: {mode, direction, crystallizationProgress} | `tdg_create` + `tdg_tick` (metabolic pressure) |

### 3.2 TDG-Rust → Mysterium Hooks

These hooks import TDG-Rust's graph state into Mysterium's engines:

| Hook | Trigger | What it imports | Mysterium operation |
|---|---|---|---|
| `onReflectComplete` | After `tdg_reflect` | Diagnosis: {pathology, catalystSuggestion, developmentalFocus} | Updates `UserMatrixModel` (phase transition, targeting) |
| `onHealthComputed` | After `tdg_health` | G_z/P_z values per holon | Updates `CCIEngine` (metabolic health) |
| `onSynaptogenesis` | After `tdg_consolidate` | New edges (RESONATES_WITH) | Updates `PolarityEngine` (polarity cell connections) |
| `onGreaterCycle` | After `tdg_greater_cycle` | Transformation pressure | Updates `TransformationDetector` (readiness) |

### 3.3 The Hook Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Agent (LLM + tools)                 │
├─────────────┬─────────────────────┬─────────────────┤
│  Mysterium      │   Hook Bridge       │  TDG-Rust       │
│  Engines    │   (event bus)       │  Graph DB       │
│             │                     │                 │
│  Significator│  onEncounterComplete│  Holon nodes    │
│  WorldState  │  ──────────────▶   │  with metabolic │
│  CCI         │                     │  state          │
│  Scheduler   │  onReflectComplete  │                 │
│  Consequence │  ◀──────────────   │  Edges          │
│  Engine      │                     │  (RESONATES_WITH)│
│             │  onHealthComputed   │                 │
│             │  ◀──────────────   │  G_z/P_z per    │
│             │                     │  holon          │
└─────────────┴─────────────────────┴─────────────────┘
```

---

## 4. Implementation Plan

### Phase 1: Mysterium Tool Surface (1-2 weeks)

**Goal:** Replace the 2-tool AgenticOrchestrator with the 8-tool Mysterium-native surface. The agent can now query game state dynamically instead of receiving a static system prompt.

**Deliverables:**
- `src/core/agent/tools/` — 8 Mysterium tool definitions (JSON schema + handler)
- `src/core/agent/PersistentAgent.ts` — replaces `AgenticOrchestrator`, persistent across session
- `src/core/agent/ToolRegistry.ts` — registers all Mysterium + TDG tools
- Updated `cli-game.ts` — uses `PersistentAgent` instead of `AgenticOrchestrator`
- Updated `LLMClient.ts` — supports arbitrary tool count (currently hardcoded to 2)

**Key change:** The agent's system prompt is no longer a static dump. It's a role definition + tool inventory. The agent uses tools to query state on-demand.

### Phase 2: TDG-Rust Integration Layer (1-2 weeks)

**Goal:** Install TDG-Rust as a dependency, create the hook bridge, and wire the 7 TDG-Mind tools into the agent's tool surface.

**Deliverables:**
- `src/infra/tdg/TDGClient.ts` — MCP client that talks to tdg-rust binary (stdio or HTTP-SSE)
- `src/infra/tdg/TDGHooks.ts` — the 6 Mysterium→TDG hooks + 4 TDG→Mysterium hooks
- `src/infra/tdg/TDGToolAdapter.ts` — wraps TDG MCP tools as agent-callable tools
- Updated `ToolRegistry.ts` — registers TDG tools alongside Mysterium tools
- Updated `PersistentAgent.ts` — can call both Mysterium and TDG tools
- `package.json` — adds tdg-rust as a dependency (or documents manual install)

**Key change:** After each encounter, the agent calls `tdg_create` to store the encounter as a holon. After each session, `tdg_consolidate` runs sleep replay.

### Phase 3: Agent Autonomy (1-2 weeks)

**Goal:** Remove hardcoded scheduling and budget. The agent decides what encounter to present, how deep to probe, and when to move on.

**Deliverables:**
- Remove hardcoded 4-exchange budget — agent uses `tdg_health` + `mysterium_check_transformation` to decide
- Remove per-encounter message reset — messages persist across the session
- Agent uses `tdg_reflect` before each encounter to choose the catalyst
- Agent uses `mysterium_get_encounter_pool` + `mysterium_select_encounter` instead of `tickWithStrategy` scheduling
- `EncounterScheduler` becomes a *suggestion engine* — the agent can override its recommendations

**Key change:** The game is no longer deterministic. The agent is the developmental intelligence; the engines are tools it uses.

### Phase 4: Deep Integration (2-3 weeks)

**Goal:** Migrate Mysterium's parallel data structures to TDG-Rust's unified graph. The Significator, UserMatrixModel, and PolarityCellVector become views over the TDG graph.

**Deliverables:**
- `Significator` fields sync with TDG holon properties (bidirectional)
- `UserMatrixModel` cells become TDG holons with metabolic state
- `PolarityCellVector` traces become TDG edges (RESONATES_WITH)
- `ShadowDetector` replaced by `tdg_reflect` (graph pathology diagnosis)
- `ThetaDecay` replaced by `tdg_consolidate` (sleep replay + forgetting)
- `SessionAgent` replaced by `tdg_reflect` (graph-level mind)
- `CCIEngine` reads G_z/P_z from `tdg_health` instead of computing inline

**Key change:** One unified graph replaces 5 parallel data structures. The agent reasons over the graph directly, not over flattened snapshots.

---

## 5. The Full Tool Reference

### 5.1 Mysterium-Native Tools (detailed schemas)

#### `mysterium_ask_player`
```json
{
  "name": "mysterium_ask_player",
  "description": "Present a question, scenario, or stimulus to the player. Supports MCQ options + write-in. No exchange budget — call as many times as developmentally appropriate.",
  "parameters": {
    "type": "object",
    "properties": {
      "narrative": { "type": "string", "description": "Atmospheric narrative setting the scene (2-4 sentences)." },
      "question": { "type": "string", "description": "The question or prompt for the player." },
      "header": { "type": "string", "description": "Short label (max 12 chars)." },
      "options": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "label": { "type": "string" },
            "description": { "type": "string" }
          }
        },
        "description": "3-4 MCQ options mapped to drives. Leave empty for write-in only."
      },
      "allowWriteIn": { "type": "boolean", "default": true }
    },
    "required": ["narrative", "question", "header"]
  }
}
```

#### `mysterium_get_player_state`
```json
{
  "name": "mysterium_get_player_state",
  "description": "Query the player's current developmental state. Returns Veil-filtered qualitative descriptions (never raw scores). Includes: current resonance (stage aesthetic), drive balance description, polarity mode, shadow patterns (qualitative), transformation phase, rayProfile summary, UserMatrixModel phase.",
  "parameters": { "type": "object", "properties": {} }
}
```

#### `mysterium_get_world_state`
```json
{
  "name": "mysterium_get_world_state",
  "description": "Query the world: active holons, NPC relationships (qualitative), PESTLE tensions (qualitative), active macro-events, narrative beats. Returns Veil-filtered descriptions.",
  "parameters": { "type": "object", "properties": {} }
}
```

#### `mysterium_get_encounter_pool`
```json
{
  "name": "mysterium_get_encounter_pool",
  "description": "Get available encounters for the player's current stage + altitude. Returns ranked candidates with: moduleRef, line, stage, modality, holonSource, executionMode, priority score. The agent can override the ranking.",
  "parameters": {
    "type": "object",
    "properties": {
      "count": { "type": "number", "default": 5, "description": "Number of candidates to return." }
    }
  }
}
```

#### `mysterium_select_encounter`
```json
{
  "name": "mysterium_select_encounter",
  "description": "Commit to an encounter from the pool. Initializes the encounter: fetches content, sets up modality, binds holon.",
  "parameters": {
    "type": "object",
    "properties": {
      "moduleRef": { "type": "string", "description": "The moduleRef from the encounter pool (e.g., 'Cognitive:Red')." },
      "modality": { "type": "string", "description": "The modality to use (optional — defaults to the encounter's modality)." }
    },
    "required": ["moduleRef"]
  }
}
```

#### `mysterium_complete_encounter`
```json
{
  "name": "mysterium_complete_encounter",
  "description": "Evaluate and complete the current encounter. Triggers consequence application (drive updates, shadow surfacing, polarity recording, rayProfile update, theta refresh). The agent MUST call this before selecting the next encounter.",
  "parameters": {
    "type": "object",
    "properties": {
      "passed": { "type": "boolean" },
      "driveScores": {
        "type": "object",
        "properties": {
          "agency": { "type": "number" },
          "communion": { "type": "number" },
          "eros": { "type": "number" },
          "agape": { "type": "number" }
        },
        "required": ["agency", "communion", "eros", "agape"]
      },
      "driveSignals": {
        "type": "object",
        "properties": {
          "agency": { "type": "string", "enum": ["HealthyBalanced", "DarkAddicted", "DarkAverted", "GoldenAddicted", "GoldenAverted"] },
          "communion": { "type": "string", "enum": ["HealthyBalanced", "DarkAddicted", "DarkAverted", "GoldenAddicted", "GoldenAverted"] },
          "eros": { "type": "string", "enum": ["HealthyBalanced", "DarkAddicted", "DarkAverted", "GoldenAddicted", "GoldenAverted"] },
          "agape": { "type": "string", "enum": ["HealthyBalanced", "DarkAddicted", "DarkAverted", "GoldenAddicted", "GoldenAverted"] }
        }
      },
      "shadowSignal": {
        "type": "object",
        "properties": {
          "quadrant": { "type": "string", "enum": ["DarkAddiction", "DarkAllergy", "GoldenAddiction", "GoldenAllergy"] },
          "intensity": { "type": "number" }
        }
      },
      "polarityDirection": { "type": "string", "enum": ["sto", "sts", "neutral"] },
      "narrativeSummary": { "type": "string" }
    },
    "required": ["passed", "driveScores", "driveSignals", "narrativeSummary"]
  }
}
```

#### `mysterium_check_transformation`
```json
{
  "name": "mysterium_check_transformation",
  "description": "Check if the player is at a transformation threshold. Returns: readiness score, convergence (lines at edge), saturation, shadow clearance, ray readiness, target stage. The agent can use this to decide whether to push toward transformation or consolidate.",
  "parameters": { "type": "object", "properties": {} }
}
```

#### `mysterium_get_content`
```json
{
  "name": "mysterium_get_content",
  "description": "Fetch fallback content for a specific (modality, line, stage). Returns altitude-reframed prompt/scenario/framing. Use when the LLM is unavailable or when you want deterministic content.",
  "parameters": {
    "type": "object",
    "properties": {
      "modality": { "type": "string" },
      "line": { "type": "string" },
      "stage": { "type": "string" }
    },
    "required": ["modality", "line", "stage"]
  }
}
```

### 5.2 TDG-Mind Tools (agent-facing subset)

The 7 TDG tools are passed through from TDG-Rust's MCP server. The agent sees them as:

| Tool | Agent use case |
|---|---|
| `tdg_search` | "What did the player say about anger last time?" — query developmental history |
| `tdg_create` | Store each encounter as a holon with metabolic state |
| `tdg_connect` | "This encounter RESONATES_WITH the player's Cognitive:Red shadow" — create edges |
| `tdg_reflect` | Diagnose the player's developmental graph — what patterns, what pathologies, what catalyst to inject |
| `tdg_fetch_context` | Get a structured ContextPack from the graph — validated, provenance-tracked |
| `tdg_tick` | Run the metabolic cycle on encounter holons — ingest catalyst, produce experience |
| `tdg_health` | Query G_z/P_z of any holon — the player's overall health, a specific cell's health |

---

## 6. What This Unlocks

### 6.1 Dynamic Encounter Selection

Currently: `EncounterScheduler.scheduleNext()` uses a 7-criteria priority formula to rank encounters. The agent has no say.

With the hybrid architecture: The agent calls `tdg_reflect` to diagnose the player's developmental graph, then `mysterium_get_encounter_pool` to see available encounters, then `mysterium_select_encounter` to commit. The scheduler becomes a *suggestion engine* — the agent can override its recommendations based on graph-level insight that the scheduler doesn't have.

### 6.2 Adaptive Encounter Depth

Currently: Hardcoded 4-exchange budget. Every encounter is exactly 4 questions.

With the hybrid architecture: The agent decides when an encounter is complete based on:
- `tdg_health` of the encounter holon (is the catalyst being metabolized?)
- `mysterium_check_transformation` (is the player at a threshold?)
- The player's engagement quality (are they writing long responses or short ones?)
- The developmental pattern (is this a shadow that needs deep probing, or a capacity that's quickly demonstrated?)

A simple capacity encounter might be 2 exchanges. A deep shadow-work encounter might be 12.

### 6.3 Cross-Session Memory

Currently: `SessionAgent.buildSynthesis()` produces a lossy keyword summary. The next session starts fresh.

With the hybrid architecture: `tdg_save_mind_state` / `tdg_load_mind_state` persists the entire developmental graph across sessions. The agent remembers every encounter, every player response, every shadow pattern — forever. The player's developmental journey is a living graph, not a series of disconnected sessions.

### 6.4 Agent-Driven Diagnosis

Currently: `ShadowDetector.detectShadows()` uses keyword matching. `CCIEngine.computeCCI()` uses a 5-dimension composite. `GreaterCycleEngine.computeMetabolicHealth()` uses a 4-term G_z/P_z.

With the hybrid architecture: `tdg_reflect` runs the graph-level mind — it diagnoses pathologies (GoldenAllergy, depolarization, collapse) by analyzing the *structure* of the player's developmental graph, not just keyword counts. The agent gets a diagnosis it can act on: "The player has a GoldenAllergy on Spiritual:Red — they're resisting growth in this area. Inject a catalyst that gently surfaces the resistance."

### 6.5 Metabolic Encounter Memory

Currently: Encounters are stored as `ConsequenceRecord` entries in a flat array (`history: ConsequenceRecord[]`). They have no metabolic state — no G_z/P_z, no resonance, no connections.

With the hybrid architecture: Each encounter is a holon in the TDG graph with:
- **Metabolic state** (G_z/P_z health) — the encounter itself is "healthy" if the player metabolized it well
- **RESONATES_WITH edges** — encounters that co-activated get connected, forming a developmental web
- **Sleep replay** — important encounters get strengthened between sessions; irrelevant ones get forgotten
- **Attractor field** — the encounter's attractor field influences future encounter selection

---

## 7. Migration Strategy

### What stays:
- All Mysterium engines (scheduling, consequences, transformation, CCI, AutoMode) — they become tool handlers
- All Mysterium content (FallbackProvider, QualitativeFeedback, VeilFilter, ShadowContentGenerator)
- All Mysterium UI (CLI, Phaser scenes)
- All assessment tasks (n-back, stroop, etc.)
- All encounter data (red-layer-holons.json, encounters/red/*.ts)
- All registries (lines, stages, rays, drives, encounters)

### What's replaced:
- `AgenticOrchestrator` → `PersistentAgent` (session-persistent, 15 tools)
- `SessionAgent` → `tdg_reflect` (graph-level mind)
- Per-encounter message reset → session-persistent messages
- Hardcoded 4-exchange budget → agent-decided dynamic budget
- Static system prompt → role definition + tool inventory
- `ContextPipeline.buildContext()` → `tdg_fetch_context` + `mysterium_get_player_state`
- `Significator` field updates → `tdg_create` + `tdg_tick` (progressive migration)

### What's new:
- `src/core/agent/` — PersistentAgent, ToolRegistry, 8 Mysterium tool definitions
- `src/infra/tdg/` — TDGClient, TDGHooks, TDGToolAdapter
- TDG-Rust as a dependency (binary + SQLite DB)
- Hook bridge between Mysterium engines and TDG graph

---

**End of plan.**
