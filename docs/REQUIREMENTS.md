# Mysterium Research Requirements — The Document of Documents

> **Cross-references:** [[docs/architecture/01-overview|Overview]] · [[docs/architecture/10-stage-assessment-architecture|Stage Assessment Architecture]] · [[docs/architecture/11-curriculum-authoring|Curriculum Authoring]] · [[docs/architecture/ONBOARDING-REDESIGN-PLAN|Onboarding Redesign Plan]] · [[docs/foundations/00-integral-theory|00 — Integral Theory]] · [[docs/foundations/36-curriculum-upgrade-plan|36 — Curriculum Upgrade Plan]]
> **Status:** Active — Research + Implementation phases running concurrently.
> See `architecture/01-overview.md` for the binding architectural contract.

---

## 0. Purpose of this file

This file is the **contract for the research and implementation phases**. It enumerates every document that must exist under `/docs/`, explains *why* each is necessary, and defines the mandatory structure for all documents.

If a topic is not covered in any document below, the design has a hole and the hole must be filled before implementation. Adding a new document is a first-class change to this file.

---

## 1. The eight first-principles the research must defend

Every document in `/docs/` is, ultimately, an answer to one of these eight questions. Whenever a document is written, the author must explicitly cite which of the eight principles it speaks to, and how.

| # | First-principle question | Why it matters |
|:-:|---|---|
| 1 | **What is the system actually training?** Not "cognition" abstractly — *which* lines of intelligence at *which* stages, in *which* modalities? | Determines every encounter, module, and metric. |
| 2 | **How do we know it is training that thing and not a proxy?** | Validity. Without this, the system is just stylised brain-training. |
| 3 | **How do we keep the player at their growth edge without breaking immersion?** | The 70.7% staircase, flow theory, narrative pacing. |
| 4 | **How do we make stage progression feel earned, not unlocked?** | Stages of consciousness cannot be bought; they must be *demonstrated*. |
| 5 | **How do we represent multi-line development on a phone screen without overwhelming the player?** | UX is the bottleneck. The richest model is useless if it cannot be felt in the thumb. |
| 6 | **How do we keep the simulation honest?** | Server authority, anti-cheat, data-privacy, ethical use of neuropsychometric data. |
| 7 | **How do we keep the codebase honest?** | Clean architecture so the cognitive science is testable in isolation from rendering, networking, or any future engine swap. |
| 8 | **How do we replace formal education with adaptive, depth-aware learning?** | The holonic curriculum must be self-contained, adaptive, and depth-aware across all 8 lines. |

Every document below ends with a **"Principles served"** footer listing the subset of {1…8} it advances.

---

## 2. The /docs directory tree

```
docs/
├── REQUIREMENTS.md                   ← this file (the contract)
│
├── 00-vision.md                      ← what the system is, in one read
├── 01-first-principles.md            ← the eight questions, expanded
├── 02-glossary.md                    ← every term used anywhere in /docs
├── 03-research-methodology.md        ← DSR, OMDE, INFORM, citation policy
│
├── foundations/                      ← the science the system is built on
│   ├── 00-integral-theory.md         ← through →
│   ├── 36-curriculum-upgrade-plan.md
│
├── lines/                            ← one document per line of intelligence
│   ├── 00-overview-multi-line.md
│   └── 01-...08-...
│
├── stages/                           ← one document per stage of consciousness
│   ├── 00-overview-eight-stages.md
│   └── 01-...08-...
│
├── architecture/                     ← the engineering contract
│   ├── 00-overview.md
│   └── 01-...08-...
│
├── architecture/10-stage-assessment-architecture.md  ← module contract, composition rules
├── ONBOARDING-REDESIGN-PLAN.md       ← binary-search composite assessment
│
├── progression/                      ← how the player grows
│   └── 00-progression-overview.md
│
├── narrative/                        ← story as developmental scaffolding
│   └── 00-narrative-architecture.md
│
├── architecture/11-curriculum-authoring.md           ← how to author curriculum holons
│
├── concept-drafts/                   ← 512 game concept documents
│
├── audits/                           ← active audit documents
│
├── superpowers/                      ← specs and plans
│
└── archive/                          ← superseded documents (preserved for history)
```

---

## 3. The mandatory contents of each document

Every document, regardless of section, **must contain** the following six headings, in order. This is so that any reader can scan the same six headings across the whole tree and assemble a complete picture of any topic.

```
1. Purpose                — the question this document answers in one paragraph.
2. Scientific basis       — the citations / models / frameworks underlying it.
3. Game-design mapping    — how the science becomes a mechanic.
4. Architectural contract — what the codebase must guarantee for this to work.
5. Open questions         — what is *not* yet resolved; lists pull-forward risk.
6. Principles served      — which of the eight first-principles (§1) it serves.
```

A document that lacks any of the six headings is not yet ready for review.

---

## 4. Open questions — resolved (canon decisions)

The load-bearing questions have been resolved by the user and are now **canon**:

| # | Question | Canon answer |
|:-:|---|---|
| 1 | Energy-ray / Law-of-One layer — canon or aesthetic? | **CANON.** Fully integrated. Seven rays as first-class types; harvest into 4th density as canonical endgame. See `foundations/06`. |
| 2 | MVP stage and line selection | **All 8 lines** registered with modules at MVP launch; **Red stage** as first playable content. |
| 3 | Multiplayer in MVP | **No.** Post-MVP integration path documented. Single-player MVP. |
| 4 | Clinical / IRB ambition | **No clinical / regulated claim.** Commitment to *legitimate efficacy* without clinical-device certification. |
| 5 | Audience / age band | **Adaptive — any age, any altitude.** The system self-calibrates to the player. |
| 6 | System identity | **Mysterium** — a contemplative practice for evolution. Renamed from CCRPG on 2026-07-24. |

---

## 5. Principles served

This file serves principles **1, 2, 3, 4, 5, 6, 7, 8** — i.e. all of them, because it is the index. Every individual document below will serve a strict subset.
