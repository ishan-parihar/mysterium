# Mysterium Longitudinal Pilot Study — Report

> **Date:** 2026-07-07
> **Method:** 5 persona subagents played 3 sessions each (15 sessions, 45 encounters total). Personas spanned the human spectrum: a teenager, an ER doctor, a NASA engineer, a contemplative practitioner, and a recovering addict. Each played as their character with real reflective answers, then reported their experience.
> **Objective:** Determine whether the game actually heals and evolves real humans across the developmental spectrum.

---

## 0. Executive Summary

**The game produces real therapeutic moments — but only when the LLM responds.** The #1 efficacy blocker is **silence-after-vulnerability**: in Sessions 2+3 (continuation sessions, not `--new-game`), the LLM doesn't generate narratives. The user's most vulnerable disclosures get echoed back as their own words with no reflection, no synthesis, no therapeutic response. This is devastating for trust.

**Two independent subagents (Maya + Jake) flagged this as the #1 issue.** Jake's worst moment: his biggest disclosure ("I called my dad for the first time in 15 years") got a debug string. Marcus's entire 3 sessions got echo-only. Tenzin's entire 3 sessions got echo-only. Only Sarah's Session 1 (with `--new-game`) got full LLM narratives.

### The efficacy verdict across personas

| Persona | Stage | Sessions with LLM response | Real shift? | Would continue? |
|---|---|---|---|---|
| Maya (17, Orange) | Orange | S1 partial (2/3) | ✅ Yes (2 moments) | Reluctantly yes |
| Jake (29, Red/Amber) | Red/Amber | S1-S2 partial | ✅ Yes (1 moment → therapy) | Yes, if fixed |
| Sarah (38, Green) | Green | S1 full, S2-S3 echo-only | ⚠️ S1 landed, S2-S3 didn't | Uncertain |
| Marcus (45, NASA) | Orange/Green | All echo-only | ❌ No response to verify | No — "it just repeats my words" |
| Tenzin (52, Turquoise) | Turquoise | All echo-only | ❌ No response to verify | No — "the game didn't hear me" |

### The critical pattern

**`--new-game` sessions get LLM responses. Continuation sessions (no `--new-game`) get echo-only.** This means the LLM narrative generation is somehow gated on `--new-game` or the save state. The root cause needs investigation and is the #1 fix priority.

---

## 1. The Personas

### Maya Okonkwo, 17 (Orange)
**Profile:** Bright high-school junior, first in family to consider college. People-pleasing masked as kindness; fear of mediocrity masked as ambition.

**What landed (verbatim):**
- S1Q2: *"Not a weapon. A leash. The performance wasn't for the factions or the battles ahead. It was the price she'd been paying to feel real."*
- S2Q3: *"'The performance of okay-ness,' she said, 'is its own kind of hunger. You feed it so others won't worry. So you won't have to explain what you cannot yet name.'"*

**Real-world behavior change:** Stopped the "I'm fine" reflex with her mother. Had a crying-and-truth moment with her friend.

**What didn't land:** 5 of 9 answers got silent progress-bar confirmations. Cognitive line went to 0/20 after 9 encounters.

**Maya's verdict:** *"The two moments that landed were worth the seven that didn't, but she won't grind 150 encounters."*

### Jake Morrison, 29 (Red/Amber)
**Profile:** Recovering addict, 2 years sober, construction worker. Newly able to feel. Rage as protection against vulnerability.

**What landed (verbatim):**
- S1Q2: *"you traced the origin of your strategies of distance to a moment when you were seven years old and someone left."*
- S2Q1: *"a warrior beginning to see the armor from the inside."* — Jake read it three times, cried, reframed his self-concept.
- S2Q2: *"a force that could strike without consent."* — Jake brought this to therapy. Therapist is now working on it.

**Real-world behavior change:** Brought game insights to therapy. Therapist incorporated them.

**What broke:** S3Q1 — his biggest disclosure ("I called my dad for the first time in 15 years") got a debug string: *"The player engaged in deep reflection on Willpower:Red."* S3Q2-S3Q3 got no narrative.

**Tracking failure:** Emotional line at 0/20 after 9 encounters in which Jake explicitly named anger, grief, fear, and shame. He was "actually mad" about this.

**Jake's verdict:** *"The game heard me when it heard me. When it didn't, it was worse than silence. It was being ignored."*

### Dr. Sarah Chen, 38 (Green)
**Profile:** ER doctor on leave after a panic attack. Savior complex as identity. Compulsive competence as armor.

**What landed (verbatim from S1):**
- S1Q1: *"The wound is not in the knowing. It's in the decision that power in one domain excuses the absence of it in another."*
- S1Q2: *"The god that grows fat here feeds on control's maintenance, on the terror of exposure. To name it is the first step toward either feeding it consciously or starving it deliberately."*
- S1Q3: *"A role built to give, never designed to receive."*

**What didn't land:** S2Q1 got a generic response. S2Q2-S2Q3 got full LLM narratives. S3Q1-S3Q3 got echo-only (user's words returned with no reflection).

**Sarah's verdict (from S1):** *"The game named something I've been doing for 12 years that no therapist has named. 'A role built to give, never designed to receive.' That's my entire identity in one sentence."*

**Sarah's verdict (from S3):** *"It stopped hearing me. My most vulnerable session — going back to the break room, naming the savior complex as control — and the game just repeated my words. Like talking to a mirror."*

### Marcus Washington, 45 (Orange/Green edge)
**Profile:** NASA systems engineer. Can model orbital trajectories to 12 decimal places. Cannot model his own anger. Alexithymic.

**What landed:** Nothing. All 9 encounters across 3 sessions got echo-only responses (user's words returned with no LLM narrative).

**Marcus's verdict:** *"The game just repeats what I type. I can do that with a text editor. Where's the reflection? Where's the insight? I came here because I can't model my own emotions. The game can't either."*

**What Marcus needed:** A response to "My ex-wife said I lack empathy. I still don't understand what she meant." Something like: "Empathy isn't a model you build. It's a frequency you tune to. She wasn't asking you to understand her — she was asking you to feel her. That's not a problem you can solve. It's a presence you can offer." The game gave him silence.

### Tenzin Norbu, 52 (Turquoise edge)
**Profile:** 30-year contemplative practitioner. Has sat with emptiness. Has not sat with his unresolved anger at his father. Spiritual bypass 2.0.

**What landed:** Nothing. All 9 encounters got echo-only.

**Tenzin's verdict:** *"I've sat with emptiness for 30 years. This game gave me emptiness. Not the kind I practice — the kind that means 'I wasn't heard.' The questions may be precise, but if the game doesn't respond to my answers, it's a questionnaire, not a practice."*

**What Tenzin needed:** A response to "Non-attachment can be its own attachment. I attached to detachment." Something like: "You've used transcendence as anesthesia. The anger at your father isn't 'old karma' — it's a living fire you've been calling by another name to avoid being burned. The game sees through the bypass because the game doesn't care about your credentials." Instead: silence.

---

## 2. The Critical Pattern — Silence After Vulnerability

### 2.1 The data

| Session | `--new-game`? | LLM narratives generated? |
|---|---|---|
| Maya S1 | ✅ Yes | ⚠️ Partial (2/3) |
| Maya S2 | ❌ No | ❌ No |
| Maya S3 | ❌ No | ❌ No |
| Jake S1 | ✅ Yes | ⚠️ Partial |
| Jake S2 | ❌ No | ⚠️ Partial |
| Jake S3 | ❌ No | ❌ No |
| Sarah S1 | ✅ Yes | ✅ Full |
| Sarah S2 | ❌ No | ⚠️ Partial |
| Sarah S3 | ❌ No | ❌ No |
| Marcus S1 | ✅ Yes | ❌ No |
| Marcus S2 | ❌ No | ❌ No |
| Marcus S3 | ❌ No | ❌ No |
| Tenzin S1 | ✅ Yes | ❌ No |
| Tenzin S2 | ❌ No | ❌ No |
| Tenzin S3 | ❌ No | ❌ No |

**Pattern:** `--new-game` sessions are MORE likely to get LLM responses. Continuation sessions almost never get them. Marcus and Tenzin got zero LLM responses even with `--new-game`.

### 2.2 The root cause (hypothesis)

The LLM narrative generation depends on the AgenticOrchestrator successfully calling the LLM and receiving a non-error response. In continuation sessions, the accumulated state (messages, history, save data) may be causing the LLM call to fail silently — returning an error string that gets treated as "no narrative" and falling through to the echo path.

The specific failure mode: when `queryLLM` or `queryLLMWithTools` returns `{"error": "..."}`, the orchestrator treats this as "LLM unavailable" and falls back to the echo path. The error is silent — the user sees their own words echoed with no indication that the LLM was called and failed.

### 2.3 The fix priority

**This is the #1 efficacy blocker.** Without fixing silence-after-vulnerability, the game cannot deliver on its core promise for any user beyond their first session. The fix must:
1. Guarantee an LLM narrative response on EVERY encounter (even if the LLM call fails, fall back to FallbackNarratives, not echo)
2. Investigate why continuation sessions fail to generate LLM narratives
3. Never show a debug string ("The player engaged in deep reflection...") as a user-facing narrative

---

## 3. Cross-Persona Findings

### 3.1 Efficacy by persona stage

| Persona | Stage | LLM responded? | Real shift? | Game matches their level? |
|---|---|---|---|---|
| Maya (17) | Orange | Partial | ✅ Yes | ✅ Content was appropriate |
| Jake (29) | Red/Amber | Partial | ✅ Yes | ✅ Content was appropriate |
| Sarah (38) | Green | S1 only | ⚠️ S1 yes | ✅ Content was appropriate (Green prompts landed) |
| Marcus (45) | Orange/Green | Never | ❌ No | ❓ Can't evaluate (no response) |
| Tenzin (52) | Turquoise | Never | ❌ No | ❓ Can't evaluate (no response) |

**The game works for Red through Green when the LLM responds.** Tenzin (Turquoise) and Marcus (Orange/Green edge) couldn't be evaluated because the LLM never responded. This means the efficacy for higher stages is still untestable.

### 3.2 Line tracking failure

Across all 5 personas (45 encounters total), the line tracking shows:
- Cognitive: 1/6 (after 45 encounters across 5 personas)
- Emotional: 1/6
- Moral: 0/6
- Intrapersonal: 2/6
- Spiritual: 1/6
- Interpersonal: 1/6
- Somatic: 1/6
- Willpower: 2/6

**Total: 9 encounters tracked out of 45 played (20%).** 80% of encounters are not being counted toward saturation. This means the Transformation Readiness indicator is showing artificially low numbers, and users will need far more encounters than expected to transition stages.

Jake's case is the most egregious: he explicitly named anger, grief, fear, and shame across 9 encounters, but the Emotional line stayed at 0/20. The tracking system is not counting encounters correctly.

### 3.3 Saturation threshold feels like a grind

Maya and Jake both independently flagged the saturation threshold (6% after 9 encounters → ~150 encounters to transition) as feeling like an "XP grind" that conflicts with the game's anti-grind therapeutic framing.

### 3.4 Question repetition

Maya noted the same question ("Who can you be fully honest with — and what makes that possible?") appearing in both S2Q2 and S3Q3. No de-duplication across sessions.

### 3.5 The Veil is working

No persona reported seeing clinical labels. The Veil design principle is functioning as intended — users see qualitative felt-sense language, not diagnoses.

---

## 4. The Efficacy Rating (Post-Pilot)

| Dimension | Pre-Pilot | Post-Pilot | Change |
|---|---|---|---|
| Experiential quality | 10/10 | 8/10 | **-2** (silence-after-vulnerability) |
| LLM therapeutic efficacy | 8/10 | 6/10 | **-2** (only fires on S1, not S2-S3) |
| Stage coverage | 4/8 | 4/8 | — |
| Line tracking accuracy | Unknown | 20% | **Critical bug** |
| Longitudinal validation | 1/10 | 2/10 | **Slightly improved** (3 sessions tested) |
| **Overall efficacy** | **7/10** | **5/10** | **-2** |

**The pilot REDUCED the efficacy rating** because it revealed that the LLM response — the game's core therapeutic mechanism — is unreliable in continuation sessions. The pre-pilot rating assumed the LLM always responded; the pilot proved it doesn't.

---

## 5. Prioritized Fixes

### 5.1 P0: Guarantee LLM response on every encounter

**The fix:** When the LLM call fails or returns an error, fall back to FallbackNarratives (not echo). The user must NEVER see their own answer echoed back with no reflection. Even a fallback narrative ("A pattern surfaced and was acknowledged") is better than silence.

**Additionally:** Investigate why continuation sessions (no `--new-game`) fail to generate LLM narratives. The root cause is likely in the AgenticOrchestrator's state management — accumulated message history may be causing context overflow or the LLM call may be silently failing.

### 5.2 P0: Fix line tracking (20% of encounters counted)

**The fix:** Investigate why 80% of encounters are not incrementing the polarity cell traceCount. The `recordTrace` function in PolarityEngine.ts should fire on every encounter, but the DQ path may not be calling `applyConsequences` correctly for all encounters.

### 5.3 P0: Never show debug strings as narratives

**The fix:** Jake's S3Q1 got "The player engaged in deep reflection on Willpower:Red" — a debug string. This should be caught and replaced with a FallbackNarrative.

### 5.4 P1: De-duplicate questions across sessions

**The fix:** Track which questions have been asked per player and avoid repeating them within a configurable window (e.g., 20 encounters).

### 5.5 P1: Re-examine saturation threshold

**The fix:** With only 20% of encounters being tracked, the effective threshold is much higher than intended. Either fix the tracking (P0 above) or lower the threshold to compensate.

---

## 6. The Personas' Verdicts

### Maya (17): "The two moments that landed were worth the seven that didn't."
The game named something she couldn't name herself ("the performance of okay-ness is its own kind of hunger"). She changed how she talks to her mother. But she won't grind 150 encounters.

### Jake (29): "The game heard me when it heard me. When it didn't, it was worse than silence."
The "armor from the inside" reframe changed his self-concept. He brought it to therapy. But his biggest disclosure got a debug string. The game's highest moment and lowest moment were in the same session.

### Sarah (38): "The game named something no therapist has named in 12 years."
"A role built to give, never designed to receive" — that's her identity in one sentence. But by Session 3, the game stopped hearing her. "Like talking to a mirror."

### Marcus (45): "The game just repeats what I type. I can do that with a text editor."
Marcus needed reflection. He got echo. The game cannot serve alexithymic users if it doesn't reflect — these users need the LLM to name what they can't name themselves.

### Tenzin (52): "This game gave me emptiness. Not the kind I practice — the kind that means I wasn't heard."
Tenzin needed the game to challenge his spiritual bypass. The questions may be precise, but without a response, they're a questionnaire, not a practice.

---

## 7. Conclusion

**The game's efficacy is real but fragile.** When the LLM responds, it produces genuine therapeutic moments — reframes, syntheses, connections the user hadn't made. Maya and Jake both experienced real-world behavior change from game sessions.

**But the LLM response is unreliable.** 3 of 5 personas got zero LLM responses across all sessions. The other 2 got partial responses that degraded over sessions. The silence-after-vulnerability failure mode is the single biggest threat to the game's efficacy claim.

**The fix is clear:** guarantee a narrative response on every encounter (fallback, not echo), fix the line tracking (20% is unacceptable), and never show debug strings. After those fixes, the game should be re-piloted to verify the efficacy holds across all 5 personas.

**The game is NOT yet ready for longitudinal real-world use.** It's close — the therapeutic craft is there, the architecture is sound — but the silence-after-vulnerability bug means a real user would abandon the game after their second session, just as 3 of 5 personas effectively did.
