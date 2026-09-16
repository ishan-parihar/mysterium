# LLM Integration Architecture

> **Cross-references:** [[docs/foundations/20-veil-of-forgetting|20 — Veil Of Forgetting]] · [[docs/foundations/22-holon-context-engine|22 — Holon Context Engine]]
## 1. Purpose

Describes how LLMs are integrated as "voice, not brain" — providing narrative depth, qualitative assessment, and reflective prose while the deterministic engine handles scoring, scheduling, and state management. The LLM enriches the experience without becoming a single point of failure.

## 2. Scientific basis

- **LLM as narrative wrapper** — Foundations/22: holon context engine specification
- **Veil of Forgetting** — Foundations/20: all mechanics operate invisibly
- **Deterministic fallback** — when LLM is unavailable, the system continues with static content

## 3. Game-design mapping

### Architecture: Voice, Not Brain

The LLM provides:
- **Narrative framing** — encounter openers, summaries, reflective prose
- **Qualitative assessment** — scoring open-ended responses against developmental rubrics
- **Catalyst prompts** — pushing back on intellectualizing, dodging, repeating
- **Integration rituals** — session-end reflection capture

The LLM does NOT provide:
- **Scoring** — deterministic rubric-weighted scoring handles this
- **Scheduling** — EncounterScheduler handles this
- **State management** — Significator handles this
- **Difficulty adjustment** — DDA staircase handles this

### Key Components

| Component | File | Role |
|---|---|---|
| LLMClient | `src/infra/llm/LLMClient.ts` | Base LLM interface with streaming |
| ProxiedLLMClient | `src/infra/llm/ProxiedLLMClient.ts` | Proxied LLM for WebUI |
| ContextPipeline | `src/infra/llm/ContextPipeline.ts` | Builds prompts from Significator state |
| Templates | `src/infra/llm/templates.ts` | Pure-function prompt templates |
| VeilFilter | `src/core/presentation/veilDescriptors.ts` | Strips clinical language from LLM output |
| FallbackProvider | `src/core/fallback/FallbackProvider.ts` | Static content when LLM unavailable |

### Veil of Forgetting Integration

VeilFilter runs on all LLM output:
- Removes clinical metrics (percentages, scores, stage labels)
- Replaces with qualitative felt-sense descriptors ("clean", "tight", "loose", "fumbled")
- Ensures the player never sees the engine

### Failure Handling

- **LLM available** — full narrative path with opener + summary + options
- **LLM unavailable** — Veil-seam disclosure ("The mirror is silent; old reflections return to you.") + static fallback
- **No deterministic fallback for game logic** — when LLM fails, surfaces are hidden or blocked, not faked

## 4. Architectural contract

- `src/infra/llm/` — all LLM integration code
- `src/core/fallback/` — fallback content (domain concern, not infra)
- LLM calls are async with timeout and error handling
- VeilFilter runs on all LLM output before display

## 5. Open questions

- **Streaming wire** — new streaming interface needs production validation
- **VeilFilter mid-stream** — currently runs at end-of-stream, not per-chunk
- **LLM budget** — max 2 calls per encounter limits complex modalities

## 6. Principles served

Principles **5, 6, 7** — UX clarity, honest simulation, codebase honesty.
