# Polarity Engine Architecture

> **Cross-references:** [[docs/foundations/23-polarity-ontology|23 — Polarity Ontology]]

## 1. Purpose

Describes the 64-cell polarity texture catalogue, STO/STS crystallization, 4-level aggregation, and harvest mechanics. The polarity engine is the "compass" of Mysterium — it tracks the player's evolutionary direction across all dimensions.

## 2. Scientific basis

- **Polarity ontology** — Foundations/23: 64-cell texture catalogue (8 lines × 8 stages)
- **STO/STS vectors** — Foundations/19: Service-to-Others vs Service-to-Self crystallization
- **The closure** — Foundations/06 §7.4: the 4th-density harvest is the **Violet event** at the sub-octave closure (L8 Teal completed), scripted epilogue — never a stage

## 3. Game-design mapping

### The 64-Cell Polarity Texture Catalogue

Each (line × stage) cell has a unique polarity texture — the specific way STO/STS tendency expresses at that developmental point. Example:

| Cell | STO texture | STS texture |
|---|---|---|
| Cognitive:Red | Collaborative problem-solving | Competitive analysis |
| Emotional:Red | Empathic attunement | Emotional manipulation |
| Moral:Red | Rule-following for group benefit | Rule-breaking for personal gain |

### 4-Level Aggregation

1. **Per-encounter** — PolarityTrace captures energetic direction, drive directionality, stage orientation, source of nourishment
2. **Per-line** — Aggregates encounters on same line into line-level polarity profile
3. **Per-stage** — Aggregates across lines at same stage
4. **Master** — Final STO/STS crystallization state

### Polarity Modes

| Mode | Meaning | When active |
|---|---|---|
| Exploration | Player is sampling both STO and STS freely | Early game, before consistent pattern |
| Crystallizing | Player is developing a consistent polarity | Mid-game, patterns emerging |
| Crystallized | Player has committed to STO or STS trajectory | Late game, approaching harvest |

### Harvest Mechanics

At the closure (L8 Teal completed; the Violet event), the player's polarity crystallization determines their harvest:
- **STO harvest** — 4th-density positive harvest (service-to-others orientation)
- **STS harvest** — 4th-density negative harvest (service-to-self orientation)
- **No harvest** — insufficient crystallization (remains in 3rd density)

## 4. Architectural contract

- `src/core/engines/PolarityEngine.ts` — 4-level aggregation engine
- `src/core/domain/PolarityTrace.ts` — per-encounter polarity signal
- Polarity traces stored in Significator.polarityTraces
- Polarity mode computed from aggregated traces

## 5. Open questions

- **Polarity trace completeness** — currently only records direction, not depth
- **Mode transition thresholds** — when does exploration become crystallizing?
- **Harvest evaluation** — no endgame evaluation logic implemented

## 6. Principles served

Principles **1, 4, 6** — training clarity, earned progression, honest simulation.
