# Cognitive / Infrared — Scenario-Choice Game Concept

> **Axis:** Survival choices — approach/avoid decisions based on sensory cues only.  **Why this axis for this module:** The most primitive cognitive "choice" is approach vs. avoid; this modality probes whether the perceptual system can discriminate safe from threatening stimuli and act accordingly.

---

## 1. Game Identity

**Name:** Flicker  
**Core loop:** Stimuli appear on screen — some "warm" (soft glow, slow pulse), some "sharp" (bright flash, jagged edge). Player swipes toward warm stimuli (approach) or away from sharp stimuli (avoid). No words, no narrative — pure sensory-cue-based decision.

**Session length:** 30–90 seconds per checkpoint. Infinite checkpoints.  
**Felt experience:** Instinctive. Like flinching from heat or reaching toward warmth. The body knows before the mind decides.

## 2. Catalyst Delivery

**DA surfacing:** All stimuli presented rapidly. Shadow response: player approaches OR avoids everything indiscriminately — cannot rest between decisions, treats every stimulus as urgent.  
**DAll surfacing:** Gentle stimuli appear slowly. Shadow response: player does not respond — neither approaches nor avoids. Latency grows. Stimuli expire without action.  
**GA surfacing:** Ambiguous stimuli (neither clearly warm nor sharp). Shadow response: player assigns meaning and acts on interpretation rather than sensory cue.  
**GAll surfacing:** Clear warm stimulus with emerging spatial pattern. Shadow response: approaches correctly but refuses to anticipate — never pre-positions toward the pattern.

**Catalyst → Experience → Integration:** Sensory cues ARE catalyst. Approach/avoid response IS experience. Integration = accurate discrimination + appropriate speed + comfortable ambiguity tolerance.

## 3. Game Design

**Mechanics:**
- Stimulus presentation: one stimulus appears per trial (1–3s display time).
- Binary response: swipe toward (approach) or swipe away (avoid). No-response = valid (rest).
- Cue dimensions: colour temperature (warm/cool), edge shape (round/jagged), pulse rate (slow/fast), size (growing/shrinking).
- Ambiguity trials: mixed cues (warm colour + jagged edge). Correct response: either or neither.
- Rest trials: blank screen, 2–4s. Any response = DA flag.
- Pattern emergence: after 10 trials, spatial regularity appears. Noticing = Eros readiness.

**Difficulty staircase:** Cue clarity (obvious → subtle), display time (3s → 0.5s), ambiguity ratio (0% → 30%), rest trial frequency. Adapts via accuracy + RT.

**Drive probing:**
- Agency: rest trials — can the player choose NOT to act?
- Communion: approach accuracy — can the player move TOWARD?
- Eros: pattern detection — does the player notice spatial regularity?
- Agape: return to simple trials after complex — can the player re-ground?

## 4. Item Pool

| Item ID | Type | Parameters | Shadow Probed |
|---|---|---|---|
| F-01 | Clear warm | Round, orange, slow pulse | Baseline approach |
| F-02 | Clear sharp | Jagged, blue-turquoise, fast flash | Baseline avoid |
| F-03 | Rapid sequence | 5 stimuli, 0.8s each | DA (urgency) |
| F-04 | Gentle slow | Dim, 3s display, soft | DAll (withdrawal) |
| F-05 | Ambiguous | Mixed warm/sharp cues | GA (over-interpretation) |
| F-06 | Patterned | Spatial regularity × 10 | GAll (pattern refusal) |
| F-07 | Rest trial | Blank 3s | DA (compulsive action) |
| F-08 | Reversal | Previously warm cue now sharp | Dishabituation |

**Adaptive selection:** IRT-based. Ambiguity and speed adapt to theta. Shadow probes inserted at 20% rate post-baseline.

## 5. Technical Requirements

**Input:** Swipe direction (toward/away from stimulus centre) or tap-hold vs. flick. Binary classification + RT.  
**Rendering:** Simple shapes with colour/edge/pulse variation. Minimal assets. Dark background.  
**Scoring engine:** Discrimination accuracy (d-prime). RT distribution. Rest-trial violation rate. Ambiguity response profile. Pattern anticipation index.  
**Data model:** Per-trial response (direction + RT) → discrimination-theta → drive-health decomposition → shadow flags.  
**Accessibility:** Shape and motion cues redundant with colour for colour-blind players. Haptic cue (gentle vibration = warm, sharp buzz = sharp) for low-vision.  
**Session persistence:** Checkpoint after every 12 trials. Resume from last checkpoint.
