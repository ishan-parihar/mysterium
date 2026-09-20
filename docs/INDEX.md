# Mysterium — Documentation Index

> **GENERATED FILE — do not edit.** Produced by `python3 scripts/arch.py emit` from
> `_org.yaml` plus the AD/RG records. Edit the source, then re-emit.
> Generated: 2026-09-20

## Rungs

| Rung | Path | Live | Authority |
|---|---|---|---|
| `canon` | `docs/foundations` | yes | `docs/foundations/AGENTS.md` |
| `canon-root` | `docs/00-vision.md`<br>`docs/01-first-principles.md`<br>`docs/02-glossary.md`<br>`docs/03-research-methodology.md` | yes | `docs/00-vision.md` |
| `canon-domain` | `docs/lines`<br>`docs/stages`<br>`docs/narrative`<br>`docs/progression` | yes | `docs/foundations/02-eight-stages-overview.md` |
| `system` | `docs/system` | yes | `docs/system/AGENTS.md` |
| `content` | `docs/concept-drafts` | yes | `docs/concept-drafts/README.md` |
| `records` | `docs/system/core/decisions`<br>`docs/system/core/regressions`<br>`docs/system/core/worklog` | yes | `—` |
| `plans` | `docs/DEVELOPMENT-PLAN.md`<br>`docs/ONBOARDING-REDESIGN-PLAN.md`<br>`docs/ARCHITECTURE-TRANSMUTATION-PLAN.md`<br>`docs/REQUIREMENTS.md` | yes | `docs/DEVELOPMENT-PLAN.md` |
| `historical` | `docs/historical` | no | `docs/historical/AGENTS.md` |
| `audits` | `docs/audits` | no | `—` |

## Organs

| Organ | Architecture doc | Code it describes |
|---|---|---|
| `kernel` | `docs/system/sub-systems/kernel/AGENTS.md` | `src/core/engines`, `src/core/assessments`, `src/core/registries`, `src/core/domain`, `src/core/logic`, `src/core/usecases` |
| `catalyst` | `docs/system/sub-systems/catalyst/AGENTS.md` | `src/core/practice`, `src/core/healing`, `src/core/braingame`, `src/core/GameLoop.ts` |
| `curriculum` | `docs/system/sub-systems/curriculum/AGENTS.md` | `src/core/curriculum`, `src/core/packs`, `src/core/training` |
| `profiling` | `docs/system/sub-systems/profiling/AGENTS.md` | `src/core/domain`, `src/infra/profiles` |
| `orchestration` | `docs/system/sub-systems/orchestration/AGENTS.md` | `src/core/orchestration`, `src/core/agent`, `src/core/fallback`, `src/infra/llm` |
| `world` | `docs/system/sub-systems/world/AGENTS.md` | `src/core/pods`, `src/infra/pods` |
| `onboarding` | `docs/system/sub-systems/onboarding/AGENTS.md` | `src/core/onboarding`, `src/core/adaptive` |
| `persistence` | `docs/system/sub-systems/persistence/AGENTS.md` | `src/infra/persistence`, `src/infra/native`, `src/infra/crypto`, `src/infra/profiles` |
| `presentation` | `docs/system/sub-systems/presentation/AGENTS.md` | `src/core/presentation`, `src/routes`, `src/lib`, `src/styles` |
| `safety` | `docs/system/sub-systems/safety/AGENTS.md` | `src/core/safety`, `src/core/accessibility` |
| `credentialing` | `docs/system/sub-systems/credentialing/AGENTS.md` | `src/core/credential` |
| `validation` | `docs/system/sub-systems/validation/AGENTS.md` | `src/core/validation`, `scripts/run-validation-benchmark.ts`, `src/core/braingame` |
| `platform` | `docs/system/sub-systems/platform/AGENTS.md` | `src/core/config`, `src/core/data`, `src/core/events`, `src/core/telemetry`, `src/infra/i18n`, `src/infra/telemetry`, `src/cli`, `src/shared` |

## Records (52)

| ID | Kind | Organ | Status | Title |
|---|---|---|---|---|
| `MY-AD-0001` | AD | kernel | Active | Assessment-module execution replaces the ATB combat spine |
| `MY-AD-0002` | AD | kernel | Active | Layer rules: core is pure, infra integrates, surfaces consume, content is data |
| `MY-AD-0003` | AD | kernel | Active | Vocabulary is owned by foundations/44; the ladder is ratified |
| `MY-AD-0004` | AD | catalyst | Active | The objective is continuing development, not the harvest |
| `MY-AD-0005` | AD | catalyst | Active | Eligibility is a condition; the closure is an event |
| `MY-AD-0006` | AD | profiling | Active | Register classes: the full metric register is available at any stage |
| `MY-AD-0007` | AD | profiling | Active | One articulation ladder, two registers, no privilege tiers |
| `MY-AD-0008` | AD | catalyst | Active | Objective alignment biases catalyst selection; it never replaces it |
| `MY-AD-0009` | AD | world | Active | Two-fold world memory with a per-holon owner worker |
| `MY-AD-0010` | AD | orchestration | Active | One foreground orchestrator; background workers for menial jobs |
| `MY-AD-0011` | AD | safety | Active | Human intervention is integrated, not a privileged handoff path |
| `MY-AD-0012` | AD | kernel | Active | Grading is evidence-only; competence and identity never mix |
| `MY-AD-0013` | AD | platform | Active | Documentation is governed as a three-record system |
| `MY-RG-0001` | RG | platform | Active | A one-way migration script looks idempotent and is not |
| `MY-RG-0002` | RG | platform | Active | Stage vocabulary drift (superseded names reappearing in active canon) |
| `MY-RG-0003` | RG | platform | Active | A document claims authority it does not own |
| `MY-RG-0004` | RG | platform | Active | A dormant directory reads as live canon |
| `MY-RG-0005` | RG | kernel | Active | Canon and code drift apart on a shared vocabulary |
| `MY-RG-0006` | RG | orchestration | Active | A ratified policy seam with no consumer (dormant proposals) |
| `MY-RG-0007` | RG | profiling | Active | A lifecycle state machine permits a transition the canon forbids |
| `MY-RG-0008` | RG | platform | Active | Two documents own one formula |
| `MY-RG-0009` | RG | kernel | Active | A partial purge leaves the old system's vocabulary in place |
| `MY-RG-0010` | RG | validation | Active | A gate passes because its fixture cannot fail |
| `MY-AD-0018` | AD | kernel | Active | The player's dimensionality is a first-class retrieval key |
| `MY-AD-0019` | AD | kernel | Active | World, NPC and scenario libraries are pooled before selection |
| `MY-RG-0017` | RG | kernel | Active | Engagement mechanisms drift into manipulation |
| `MY-AD-0025` | AD | catalyst | Active | The priority formula is closed: eight criteria, everything else is a multiplicative bias |
| `MY-AD-0026` | AD | catalyst | Active | The aversion veto routes a catalyst, it never cancels one |
| `MY-RG-0023` | RG | catalyst | Active | An additive term outside the ratified criteria silently outranks them |
| `MY-AD-0023` | AD | curriculum | Active | Delivery structure is selected from a scaffold library, never authored per encounter and never left unfaded |
| `MY-AD-0022` | AD | profiling | Active | Preference is inferred under an evidence tier, and only the instrumented tier becomes a field of record |
| `MY-RG-0020` | RG | profiling | Active | A language-derived inference becomes a field of record without a tier, a data class, or consent |
| `MY-RG-0021` | RG | profiling | Active | A preference prior hardens into an identity label |
| `MY-AD-0021` | AD | world | Active | World entities are composed from facets, not stored whole |
| `MY-RG-0019` | RG | world | Active | A static store reasserts itself beside the generated one |
| `MY-AD-0020` | AD | safety | Active | Ethics and data privacy is a binding contract on every organ |
| `MY-RG-0018` | RG | safety | Active | A stored field has no declared data class |
| `MY-AD-0014` | AD | platform | Active | The doc set is readable as a map: route resolves code and context emits the bundle |
| `MY-AD-0015` | AD | platform | Active | The knowledge-base is queried, not only validated |
| `MY-AD-0016` | AD | platform | Active | Relationality is enforced when creating, modifying and validating the knowledge-base |
| `MY-AD-0017` | AD | platform | Active | Documentation declares a phase from the tree, never from memory |
| `MY-AD-0024` | AD | platform | Active | A rung's router must name every document in its rung |
| `MY-AD-0027` | AD | platform | Active | A gate is not trusted until it has been shown to fail |
| `MY-AD-0028` | AD | platform | Active | A ratified law declares its consumer or a tracked deferral |
| `MY-RG-0011` | RG | platform | Active | A generated surface drifts and the commit still looks green |
| `MY-RG-0012` | RG | platform | Active | A declared rung that no gate reads |
| `MY-RG-0013` | RG | platform | Active | A verification step mutates the artefact it verifies, or a restore discards unrelated work |
| `MY-RG-0014` | RG | platform | Active | A declaration claims enforcement that no gate performs |
| `MY-RG-0015` | RG | platform | Active | A registry is hand-maintained where the tree could be discovered |
| `MY-RG-0016` | RG | platform | Active | A reference that resolves to nothing passes every gate |
| `MY-RG-0022` | RG | platform | Active | A document omitted from its rung router passes every gate |
| `MY-RG-0024` | RG | platform | Active | A law with no consumer passes every gate |

## Generated surfaces (never hand-edited)

- `docs/INDEX.md`
