# Agentic-Loop Architecture Audit & TDG-Rust Integration Analysis

> **Status:** canonical-hypothesis (architecture analysis).
>
> **Date:** 2026-07-04
>
> **Scope:** Investigation of Mysterium's current agentic loop vs. the TDG-Rust (Teleological Developmental Graph) persistent-agent architecture, and whether adopting TDG-Rust as the Mysterium backend would create a better game architecture.

---

## 1. Current Mysterium Agentic Loop

### 1.1 Architecture

The current agentic loop has **4 layers**, each with specific responsibilities:

```
┌─────────────────────────────────────────────┐
│           CLI / Phaser (UI Layer)            │
│  cli-game.ts (2001 LOC) / WorldScene.ts     │
├─────────────────────────────────────────────┤
│         AgenticOrchestrator (1913 LOC)       │
│  Per-encounter agent with tool-calling loop  │
│  Tools: ask_user_question, complete_encounter│
│  Budget: 4 exchanges per encounter           │
├─────────────────────────────────────────────┤
│           SessionAgent (228 LOC)             │
│  Cross-encounter synthesis (per-session)     │
│  Pattern detection: drives, shadows, themes  │
├─────────────────────────────────────────────┤
│          GameLoop + Engines (497+ LOC)       │
│  Scheduling, consequences, transformation    │
│  UserMatrixModel, CCI, AutoModeStrategy      │
└─────────────────────────────────────────────┘
```

### 1.2 How the Loop Actually Works

1. **CLI/Phaser** calls `tickWithStrategy()` → gets a `ScheduledEncounter`
2. **CLI/Phaser** calls `runAgenticEncounter()` → creates an `AgenticOrchestrator`
3. **AgenticOrchestrator.run()** builds a system prompt from `ContextPipeline` + `FrequencyConditioner` + `ShadowContentGenerator`
4. **AgenticOrchestrator** enters a `while` loop (max 10 iterations):
   - Calls `queryLLMWithTools()` with the system prompt + messages + 2 tools
   - LLM responds with either `ask_user_question` or `complete_encounter`
   - `ask_user_question` → presents to UI, gets player response, appends to messages
   - `complete_encounter` → evaluates drives, shadows, polarity → returns `OrchestratorResult`
5. **CLI/Phaser** applies consequences via `applyConsequences()` + `applyResponseOnly()`
6. **SessionAgent** accumulates the encounter record and builds synthesis for the next encounter

### 1.3 Key Limitations

| Limitation | Impact |
|---|---|
| **Per-encounter agent** — messages reset every encounter | No cross-encounter memory in the LLM conversation. The SessionAgent builds a *synthesis string* but it's a lossy summary, not the full conversation history. |
| **4-exchange budget** — hardcoded cap | Prevents deep multi-turn probing. A Turquoise player processing Red shadow material may need 8-12 exchanges to reach genuine edge. |
| **2 tools only** — ask_user_question + complete_encounter | The agent can't query the world state, look up NPC history, check the player's polarity trajectory, or fetch previous encounter content. It's a blind presenter, not a developmental intelligence. |
| **No persistent memory** — `messages = []` at encounter start | The agent doesn't remember what it asked last encounter, what the player said, or what patterns it observed. Every encounter is amnesiac. |
| **No tool-based environment interaction** | The agent can't "look at" the world, "examine" an NPC, "check" the player's developmental state, or "search" for relevant content. It's a closed loop. |
| **CLI is 2001 LOC** — monolithic | Mode selection, encounter presentation, consequence display, status, diagnostic, setup — all in one file. |
| **AgenticOrchestrator is 1913 LOC** — monolithic | Fallback path, module-assessment path, language-reflective path, shadow path, LLM path — all in one class. |

---

## 2. TDG-Rust Architecture

### 2.1 What TDG-Rust Is

TDG-Rust (Teleological Developmental Graph) is a **persistent memory infrastructure for AI agents** built on the HoloOS ontology. It's not a game engine — it's a **brain** that gives an AI agent:

- **Graph-structured memory** (not flat vector DB) — every memory (holon) has nodes, edges, metabolic state, attractor fields
- **50 MCP tools** for the agent to create, search, connect, reflect, consolidate, and validate knowledge
- **Metabolic engine** — every memory runs the Lesser Cycle (M·P·C·E) and Greater Cycle (S·T·G·Ch), computing G_z/P_z health
- **Self-organization** — synaptogenesis (grows new edges from resonance), Hebbian LTP/LTD, sleep replay, value-based forgetting
- **5-Gate validation** — epistemic discipline (ai-draft → canonical-hypothesis → canonical)
- **ContextPack** — structured context retrieval for LLM prompts

### 2.2 Key TDG-Rust Capabilities for Mysterium

| TDG-Rust capability | Mysterium analog | Advantage |
|---|---|---|
| **`tdg_create`** — create persistent holon nodes | Significator fields stored in JSON | Nodes persist across sessions, have metabolic state, form edges |
| **`tdg_search`** — hybrid FTS5 + embedding + graph + resonance search | EncounterScheduler priority formula | Agent can *search* its own memory for relevant patterns, not just compute priority |
| **`tdg_connect`** — create typed edges between holons | PolarityCellVector traceCount | Edges have weight, co-activation count, type (RESONATES_WITH, DERIVES_FROM, etc.) |
| **`tdg_reflect`** — agent self-reflection on its knowledge graph | SessionAgent.buildSynthesis() | Full graph-level mind diagnosis (GoldenAllergy, depolarization, collapse) → catalyst injection |
| **`tdg_consolidate`** — sleep replay + forgetting | ThetaDecay | Biologically-grounded memory consolidation with value-based forgetting |
| **`tdg_tick`** — metabolic cycle execution | CCIEngine.computeCCI() | Every memory runs M·P·C·E, computes G_z/P_z, accumulates attractor-field pressure |
| **`tdg_context`** / **`tdg_fetch_context`** — ContextPack | ContextPipeline.buildContext() | Structured context with 5-Gate validation, provenance, status ladder |
| **`tdg_health`** / **`tdg_resonance`** | GreaterCycleEngine.computeMetabolicHealth | Per-holon health + inter-holon resonance computation |
| **`tdg_greater_cycle`** | TransformationDetector | Greater Cycle (S·T·G·Ch) execution on the knowledge graph |
| **`tdg_validate_synthesis`** | (none — Mysterium has no epistemic validation) | 5-Gate validation of agent-generated content |

### 2.3 What TDG-Rust Would Replace

If Mysterium adopted TDG-Rust as its backend:

| Mysterium component | TDG-Rust replacement | LOC saved |
|---|---|---|
| `Significator` (153 LOC) | TDG holon nodes with metabolic state | ~153 |
| `UserMatrixModel` (479 LOC) | TDG graph with per-cell holons + metabolic cycles | ~479 |
| `GreaterCycleEngine` (257 LOC) | `tdg_greater_cycle` + `tdg_health` + `tdg_tick` | ~257 |
| `CCIEngine` (801 LOC) | `tdg_mind_state` + `tdg_graph_health` | ~801 |
| `ContextPipeline` (437 LOC) | `tdg_fetch_context` (ContextPack) | ~437 |
| `FrequencyConditioner` (186 LOC) | TDG attractor-field + resonance-based conditioning | ~186 |
| `SessionAgent` (228 LOC) | `tdg_reflect` (graph-level mind) | ~228 |
| `PolarityEngine` (210 LOC) | TDG edges (RESONATES_WITH) + metabolic health | ~210 |
| `ShadowDetector` (121 LOC) | `tdg_reflect` (diagnoses GoldenAllergy, depolarization) | ~121 |
| `ThetaDecay` (69 LOC) | `tdg_consolidate` (sleep replay + forgetting) | ~69 |
| `MacroCatalystEngine` (261 LOC) | `tdg_tick` (metabolic pressure accumulation) | ~261 |
| **Total** | | **~3202 LOC** |

### 2.4 What TDG-Rust Would NOT Replace

| Mysterium component | Why it stays |
|---|---|
| `AgenticOrchestrator` (1913 LOC) | TDG-Rust is a memory infrastructure, not a game master. The orchestrator's tool-calling loop, budget enforcement, and UI handler are game-specific. |
| `EncounterScheduler` + `PriorityComputation` (540 LOC) | TDG-Rust can search and retrieve, but the 7-criteria priority formula + UserMatrixModel targeting is game-specific scheduling. |
| `ConsequenceEngine` (377 LOC) | TDG-Rust stores state, but the consequence *application* (polarity traces, shadow surfacing, drive updates, rayProfile) is game-specific. |
| `FallbackProvider` (1161 LOC) | TDG-Rust doesn't provide game content. The deterministic content pools are Mysterium-specific. |
| `QualitativeFeedback` (130 LOC) | Veil-compliant feedback mapping is game-specific. |
| `VeilFilter` (92 LOC) | Veil enforcement is Mysterium-specific. |
| `cli-game.ts` (2001 LOC) | CLI presentation, mode selection, save/load — all game-specific. |
| All Phaser scenes | Game rendering is Mysterium-specific. |
| All assessment tasks (n-back, stroop, etc.) | Psychometric instruments are Mysterium-specific. |

---

## 3. The Architectural Question: Should Mysterium Adopt TDG-Rust?

### 3.1 What TDG-Rust Would Give Mysterium

**A persistent, self-organizing developmental memory that the agent can query via tools.**

Currently, the AgenticOrchestrator is **blind** — it receives a system prompt with qualitative state signals and must generate content from that alone. With TDG-Rust, the agent could:

1. **`tdg_search`** for previous encounters on the same (line, stage) — "What did this player say last time they encountered Cognitive:Red?"
2. **`tdg_get_related`** for the player's polarity trajectory — "Show me all encounters where the player chose STS direction"
3. **`tdg_reflect`** on the player's developmental graph — "What patterns do I see? What's the GoldenAllergy? What catalyst should I inject?"
4. **`tdg_fetch_context`** for a structured ContextPack — validated, provenance-tracked, status-laddered context
5. **`tdg_tick`** to run the metabolic cycle on every encounter holon — the encounter itself has G_z/P_z health
6. **`tdg_connect`** to create edges between encounters — "This encounter RESONATES_WITH the player's Cognitive:Red shadow pattern"
7. **`tdg_consolidate`** between sessions — sleep replay strengthens important memories, forgets irrelevant ones

This would transform the AgenticOrchestrator from a **blind presenter** into a **developmental intelligence** that can reason about the player's entire history.

### 3.2 What It Would Cost

**Architecture complexity.** Mysterium currently has a clean 3-layer architecture (core/infra/game). Adding TDG-Rust introduces:
- A Rust binary dependency (tdg-rust)
- An MCP transport layer (stdio or HTTP-SSE)
- A SQLite database (graph.db)
- An ONNX runtime (for embeddings)
- 50 MCP tools the agent must learn to use
- A Hermes gateway (or equivalent MCP host)

**Latency.** Every `tdg_search` / `tdg_create` / `tdg_reflect` call adds network/IPC latency. The current AgenticOrchestrator loop is already slow (20-30s per encounter with LLM). Adding 5-10 TDG tool calls per encounter could double the latency.

**Ontological alignment.** TDG-Rust implements HoloOS 02.1 (canonical) — the same ontology Mysterium's docs reference. But Mysterium's *runtime* has diverged from pure HoloOS (AQAL 7-tuple, Wilber-specific Line axis, Mysterium-specific Stage enum). The mapping between Mysterium's domain types and TDG's holon types would need careful design.

**Maintenance.** Two codebases to maintain (Mysterium TypeScript + TDG-Rust Rust). The TDG-Rust API would need to stay backward-compatible as Mysterium evolves.

### 3.3 The Hybrid Architecture (Recommended)

Rather than replacing Mysterium's backend with TDG-Rust, **integrate TDG-Rust as a memory layer** that the AgenticOrchestrator can optionally query:

```
┌─────────────────────────────────────────────┐
│           CLI / Phaser (UI Layer)            │
├─────────────────────────────────────────────┤
│     AgenticOrchestrator (game master)        │
│  Tools: ask_user_question, complete_encounter│
│  + NEW: tdg_search, tdg_reflect, tdg_create  │
├──────────────────────────┬──────────────────┤
│   Mysterium Engines          │  TDG-Rust        │
│  (scheduling,            │  (persistent     │
│   consequences,          │   memory graph,  │
│   transformation)        │   metabolic      │
│                          │   cycles,        │
│                          │   reflection)    │
├──────────────────────────┴──────────────────┤
│         LLM (mimo-v2.5-free / any)           │
└─────────────────────────────────────────────┘
```

**What changes:**
1. **AgenticOrchestrator gains 3 new tools**: `tdg_search`, `tdg_reflect`, `tdg_create` — the agent can query its own memory, reflect on patterns, and store new encounter holons
2. **After each encounter**: `complete_encounter` calls `tdg_create` to store the encounter as a holon node with metabolic state
3. **Between encounters**: `tdg_reflect` runs to diagnose the player's developmental graph and suggest the next catalyst
4. **SessionAgent** is replaced by `tdg_reflect` — the graph-level mind does what SessionAgent's keyword-based pattern detection does, but with full graph awareness

**What stays:**
- All Mysterium engines (scheduling, consequences, transformation, CCI, AutoMode)
- All Mysterium content (FallbackProvider, QualitativeFeedback, VeilFilter)
- All Mysterium UI (CLI, Phaser scenes)
- All assessment tasks (n-back, stroop, etc.)

### 3.4 The Persistent Agent vs. Per-Encounter Agent Question

The user's question is whether a **persistent agent** (one that lives across the entire session, with tool access to its environment) would be better than the current **per-encounter agent** (one that resets every encounter).

**Current per-encounter agent:**
- Messages reset every encounter (`this.messages = []`)
- No memory of what it asked or what the player said in previous encounters
- SessionAgent provides a lossy synthesis string, but the agent can't query its own history
- 4-exchange budget per encounter — can't sustain deep probing

**Persistent agent with TDG-Rust:**
- Messages persist across the entire session (the agent remembers everything)
- `tdg_search` lets the agent query its own memory — "What did the player say about anger last time?"
- `tdg_reflect` lets the agent diagnose patterns — "The player has been avoiding Emotional:Red for 3 encounters; time to press harder"
- Budget can be dynamic — the agent decides when an encounter is complete based on developmental readiness, not a hardcoded 4-exchange cap
- The agent can "look at" the world via `tdg_get_related` — "Show me the NPC's relationship history with this player"

**Verdict: Yes, a persistent agent with TDG-Rust would be a fundamentally better architecture.** The current per-encounter agent is structurally limited by amnesia. A persistent agent with graph memory would be able to:

1. **Build genuine developmental rapport** — remember what the player said, reference it naturally
2. **Adapt its questioning strategy** — if the player avoided a question last encounter, the agent knows and can approach from a different angle
3. **Diagnose the player's developmental graph** — not just compute a CCI score, but *understand* the pattern (GoldenAllergy, depolarization, collapse)
4. **Choose its own catalysts** — instead of the scheduler deciding what encounter to present, the agent could use `tdg_search` to find the most developmentally relevant content
5. **Track its own effectiveness** — the agent can reflect on whether its previous interventions worked, and adapt

### 3.5 The TDG-Mind Concept

TDG-Rust's "graph mind" (`tdg_mind_state`, `tdg_reflect`) is the key differentiator. It's not just memory storage — it's **metabolic memory** where every holon:

- Runs the Lesser Cycle (M·P·C·E) — ingesting catalyst, producing experience
- Computes G_z/P_z health — knows when it's "stuck" vs "polarizing" vs "transitional"
- Forms RESONATES_WITH edges — memories that co-activate get connected
- Undergoes sleep replay — important memories get strengthened, irrelevant ones forgotten
- Can be diagnosed — the graph mind detects pathologies (GoldenAllergy = resistance to growth, depolarization = loss of direction, collapse = fragmentation)

This is exactly what Mysterium's `UserMatrixModel` + `GreaterCycleEngine` + `CCIEngine` + `ShadowDetector` + `SessionAgent` try to do — but TDG-Rust does it with a **unified graph-based architecture** instead of 5 separate engines with parallel data structures.

---

## 4. Implementation Plan (If We Proceed)

### Phase 1: TDG-Rust as Read-Only Memory (1-2 weeks)
- Install TDG-Rust as a dependency
- After each encounter, call `tdg_create` to store the encounter as a holon
- Add `tdg_search` as a tool in AgenticOrchestrator — agent can search its own memory
- Keep all Mysterium engines unchanged

### Phase 2: TDG-Rust as Developmental Intelligence (2-3 weeks)
- Replace SessionAgent with `tdg_reflect` — graph-level mind diagnosis
- Add `tdg_fetch_context` as the ContextPipeline's primary context source
- Let the agent use `tdg_get_related` to query NPC relationship history
- Dynamic encounter budget based on `tdg_health` (agent decides when to complete)

### Phase 3: TDG-Rust as Primary State (3-4 weeks)
- Migrate Significator fields to TDG holon properties
- Migrate UserMatrixModel to TDG graph (256 cells → 256 holons with metabolic state)
- Migrate PolarityEngine to TDG edges (RESONATES_WITH)
- Migrate ShadowDetector to `tdg_reflect` (graph pathology diagnosis)
- Migrate ThetaDecay to `tdg_consolidate` (sleep replay + forgetting)

### Phase 4: Persistent Agent (1-2 weeks)
- Remove per-encounter message reset — messages persist across the session
- Remove hardcoded 4-exchange budget — agent uses `tdg_health` to decide
- Agent uses `tdg_create` / `tdg_connect` to build its own understanding of the player
- Agent uses `tdg_reflect` to choose its own catalysts (replacing the scheduler)

---

## 5. Recommendation

**Yes, a persistent agent with TDG-Rust would be a fundamentally better Mysterium architecture.** The current per-encounter agent is structurally limited by amnesia and blindness. TDG-Rust would give the agent:

1. **Persistent memory** — the agent remembers every encounter, every player response, every pattern
2. **Tool-based environment interaction** — the agent can search, query, reflect, and create
3. **Metabolic state** — every memory has G_z/P_z health, not just a timestamp
4. **Self-organization** — memories form connections through resonance, strengthen through co-activation
5. **Graph-level mind** — the agent can diagnose the player's developmental graph and choose its own interventions

**But the implementation should be phased** — start with TDG-Rust as a read-only memory layer (Phase 1), then progressively migrate Mysterium's engines to TDG-Rust's primitives (Phases 2-4). This avoids a big-bang rewrite while incrementally improving the agent's intelligence.

**The biggest win is Phase 4** — the persistent agent. Removing the per-encounter amnesia and the hardcoded 4-exchange budget would transform the game from "a series of disconnected mini-games" into "a developmental practice that remembers you."

---

**End of analysis.**
