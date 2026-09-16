# Shadow Work Architecture

## 1. Purpose

Describes the 4-quadrant shadow model, 256 shadow configurations, detection→surfacing→integration pipeline, and the ShadowDetector engine. Shadow work is the "forge" of Mysterium — it surfaces psychological patterns and provides the catalyst for integration.

## 2. Scientific basis

- **4-quadrant shadow model** — Foundations/10: Dark-Addiction, Dark-Allergy, Golden-Addiction, Golden-Allergy
- **256 configurations** — 4 quadrants × 4 drives × 8 stages × 2 domains = 256 unique shadow patterns
- **Shadow surfacing** — Foundations/14: catalyst→experience→integration mechanics

## 3. Game-design mapping

### The 4 Shadow Quadrants

| Quadrant | Pattern | Drive pathology | Detection signal |
|---|---|---|---|
| Dark-Addiction | Submergent fixation | Agency/Eros fixates on lower stage | Repetitive choices at lower stage, avoidance of growth |
| Dark-Allergy | Submergent aversion | Communion/Agape averts from lower stage | Rejection of lower-stage content, spiritual bypassing |
| Golden-Addiction | Emergent fixation | Bypasses toward higher without integration | Claims higher-stage capacity without evidence, intellectualizing |
| Golden-Allergy | Emergent aversion | Resists call to grow at growth edge | Avoidance of challenging encounters, refusal to engage |

### Detection Pipeline

1. **Keyword detection** — 4 static keyword lists (~30 phrases each) matched against write-in text
2. **Behavioral pattern recognition** — ShadowDetector.ts analyzes encounter patterns (currently dead code)
3. **Cross-line correlation** — compound shadows detected when same-quadrant shadows exist across lines
4. **Severity scoring** — Gap-based + altitude-based severity computation

### Shadow Surfacing Sequence

Each module specifies which capacity dimension surfaces which shadow first:
- **Cognitive line** — analytical capacity surfaces Golden-Addiction (intellectual bypassing)
- **Emotional line** — regulation capacity surfaces Dark-Allergy (emotional avoidance)
- **Moral line** — discernment capacity surfaces Golden-Allergy (moral superiority)
- **Somatic line** — embodiment capacity surfaces Dark-Addiction (physical fixation)

### Integration Mechanics

- **Heal/Evolve vector** (Agape + Agency) — integrates dark shadows
- **Evolve/Heal vector** (Eros + Communion) — dissolves golden shadows
- **Shadow encounters** — optional encounters that dramatize shadows for integration
- **Holonic return** — player pulled back to maintain neglected stages

## 4. Architectural contract

- `src/core/engines/ShadowContentGenerator.ts` — generates shadow-specific encounter content
- `src/core/assessments/AgenticOrchestrator.ts` — keyword-based shadow detection in evaluateResponse()
- `src/core/engines/ConsequenceEngine.ts` — shadow ledger updates
- `src/core/usecases/ShadowDetector.ts` — behavioral pattern detection

## 5. Open questions

- **Behavioral detection** — ShadowDetector.ts is implemented but never called from runtime
- **Compound shadows** — compoundPartner field always null
- **Shadow severity aging** — no time-based decay or outcome-based updates
- **Holonic return triggers** — detected but not executed

## 6. Principles served

Principles **1, 3, 4** — training clarity, growth edge, earned progression.
