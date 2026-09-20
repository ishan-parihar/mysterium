/**
 * Mysterium Glossary — shared data consumed by both CLI (runGlossary) and WebUI (/glossary route).
 * ponytail: extracted from scripts/cli-game.ts to avoid duplication.
 *
 * R11-Y3 (Fresh-User UX Audit): glossary split into player-facing essentials
 * and full theoretical set. The 23-term dump was experienced by fresh users
 * as "walking into a graduate seminar 6 months late." The 5 player-facing
 * terms (Holon, Significator, Line, Stage, Shadow) cover what a player
 * actually needs to understand their first session. The full set is gated
 * behind --full for advanced users and developers.
 *
 * P2-U5 (Fresh-User UX Re-Audit): Progressive vocabulary unlock. The re-audit
 * found that `glossary --full` still exposes clinical definitions (CCI bands,
 * G_z/P_z, Shadow Quadrants) to any curious player who types it. The fix:
 * Tier 1 (always available): Line, Stage, Shadow — the 3 terms a player
 * needs before their first encounter.
 * Tier 2 (unlock-triggered): Holon, Significator, Resonance, etc. — each
 * unlocks when the LLM first references the concept in a narrative. The
 * `glossary` command shows Tier 1 + unlocked Tier 2 terms. The `--full`
 * flag is hidden behind --dev for engineers.
 */

export interface GlossaryTerm {
  readonly term: string;
  readonly def: string;
  /** 'player' = shown by default; 'advanced' = only with --full */
  readonly audience?: 'player' | 'advanced';
  /**
   * P2-U5: Unlock tier.
   * - 'tier1' = always available (shown before any encounters)
   * - 'tier2' = unlocks when the term is first encountered in play
   * - 'advanced' = only via --dev --full (engineering vocabulary)
   */
  readonly unlockTier?: 'tier1' | 'tier2' | 'advanced';
  /**
   * P2-U5: Keywords that trigger unlock when they appear in LLM narrative output.
   * The term unlocks when ANY of these keywords appears in a narrative response.
   * If omitted, the term unlocks when its own name appears in a narrative.
   */
  readonly unlockKeywords?: readonly string[];
}

/** Tier 1 essentials — always available, shown before any encounters.
 *  P2-R3 (Fresh-User UX Audit v2): Rewritten as player-voice testimonials. */
export const PLAYER_GLOSSARY_TERMS: readonly GlossaryTerm[] = [
  { term: 'Line', def: 'There are 8 lines of intelligence the game explores: Cognitive (how you think), Emotional (how you feel), Moral (how you choose), Intrapersonal (how you know yourself), Spiritual (what means most), Interpersonal (how you connect), Somatic (what your body knows), and Willpower (what holds you upright). Each session touches a different line; over time, all eight deepen together.', audience: 'player', unlockTier: 'tier1' },
  { term: 'Stage', def: 'When the game says you are at a stage — Red, Amber, Orange, and so on — it is not a judgment. It is a name for the way you have been showing up. Red feels fortress-sharp, weapon-walls. The game will not tell you to leave Red. It will tell you Red has something to offer, and something to outgrow. Stages unfold; they are not climbed.', audience: 'player', unlockTier: 'tier1' },
  { term: 'Shadow', def: 'A shadow is an unresolved pattern — something that keeps showing up because it wants to be met, not because it is wrong. The game surfaces shadows gently, in the language of movement rather than diagnosis. You will never see a clinical label about yourself. You will see: something stirs here. Something wants to move. The work is in the meeting.', audience: 'player', unlockTier: 'tier1' },
  { term: 'Encounter', def: 'A single developmental exchange — a question that meets you where you are. Each encounter touches one line of intelligence at your current stage. There are no wrong answers; the game reads how you think, feel, and choose, not what you believe.', audience: 'player', unlockTier: 'tier1' },
  { term: 'Holon', def: 'A whole that is also part of a larger whole. The world of Mysterium is made of holons — nested layers of meaning that shift as you grow. A holon at one stage becomes part of a larger pattern at the next.', audience: 'player', unlockTier: 'tier1' },
  { term: 'Significator', def: 'The game holds a living memory of you across sessions — not a score, not a label, but a pattern of what you have touched and what has touched you. It carries your developmental history so the game can meet you where you actually are, not where it assumes you should be.', audience: 'player', unlockTier: 'tier1' },
  { term: 'Transformation', def: 'A frame-change. When the resonance shifts, new encounters open and the work deepens. Transformation is not a climb — it is the same world seen from a new altitude.', audience: 'player', unlockTier: 'tier1' },
  { term: 'Veil', def: 'A design principle: the game never shows you clinical labels about yourself. You see qualitative felt-sense language, not diagnoses. The Veil is what makes the game a practice rather than a test.', audience: 'player', unlockTier: 'tier1' },
];

/** Tier 2 terms — unlock when encountered in play.
 *  P2-U5: These terms are NOT shown by default. They unlock when the LLM
 *  first references the concept in a narrative response. The unlock is
 *  persisted to the profile's unlocked-terms.json.
 *
 *  IMPORTANT: The unlock keywords are chosen to match what the LLM ACTUALLY
 *  says in its mythopoetic narratives, not the engine term names. For example,
 *  the LLM never says "significator" but it does say "persistent pattern"
 *  and "soul-pattern". The keywords are tuned to the LLM's actual vocabulary. */
export const TIER2_GLOSSARY_TERMS: readonly GlossaryTerm[] = [
  { term: 'Resonance', def: 'A poetic 2-3 word description of your current stage\'s aesthetic (e.g. "fortress-sharp, weapon-walls" for Red). The resonance shifts as you move through stages — it is the felt texture of where you are, not a label.', audience: 'player', unlockTier: 'tier2', unlockKeywords: ['resonance', 'cathedral-ordered', 'fortress-sharp', 'weapon-walls', 'gold-stone', 'the world feels'] },
  { term: 'Transformation', def: 'A stage transition. When you transform, the resonance shifts, new encounter types unlock, and the work deepens. Transformation is not a climb; it is a frame-change — the same world seen from a new altitude.', audience: 'player', unlockTier: 'tier2', unlockKeywords: ['transform', 'transformation', 'stage transition', 'frame-change', 'new altitude', 'something shifted', 'the work deepens'] },
  { term: 'Veil', def: 'A design principle: the game never shows you clinical labels about yourself. You see qualitative felt-sense language, not diagnoses. The Veil is what makes the game a practice rather than a test.', audience: 'player', unlockTier: 'tier2', unlockKeywords: ['veil', 'the game never shows', 'qualitative', 'felt-sense', 'contemplative frame'] },
];

/** Advanced theoretical set — only shown with `mysterium glossary --full` (now requires --dev).
 *  P2-U5: These terms are engineering vocabulary, not player vocabulary.
 *  They are only accessible via `--dev --full` for developers. */
export const ADVANCED_GLOSSARY_TERMS: readonly GlossaryTerm[] = [
  { term: 'Module', def: 'A specific Line × Stage combination. 8 lines × 8 stages = 64 modules total, each with its own assessment content.', audience: 'advanced', unlockTier: 'advanced' },
  { term: 'Modality', def: 'How an encounter is delivered. 7 types: Deterministic (timed trials), LanguageReflective (open questions), ScenarioChoice, Embodied, Strategic, SocialCooperative, ImmersiveRPG.', audience: 'advanced', unlockTier: 'advanced' },
  { term: 'CCI', def: 'Cumulative Consciousness Index — a 0-1 composite of altitude, drive health, polarity, shadow topology, and transformation readiness. Most players start around 0.50. Interpretation: below 0.40 = struggling (heavy shadow load); 0.40-0.55 = working (the common range); 0.55-0.70 = developing (integrating); above 0.70 = flourishing. A drop in CCI during shadow work is expected — shadows surfacing is part of the work, not a sign of getting worse.', audience: 'advanced', unlockTier: 'advanced' },
  { term: 'rayProfile', def: 'Activation level (0-1) of each of the 7 energy rays: Red, Orange, Yellow, Green, Blue, Indigo, Violet. Maps to stages.', audience: 'advanced', unlockTier: 'advanced' },
  { term: 'G_z / P_z', def: 'Metabolic-health primitives. G_z = generative z-potential (capacity to grow); P_z = pathogenic z-potential (distortion load). Higher G_z, lower P_z is healthier.', audience: 'advanced', unlockTier: 'advanced' },
  { term: 'Arc', def: 'Session position: WARMUP (first 1-2 encounters), PEAK (middle), COOLDOWN (last 1-2). Maps to how contemplative practice actually works.', audience: 'advanced', unlockTier: 'advanced' },
  { term: 'Saturation', def: 'How many encounters you have completed at your current stage per line. Reaching the threshold is required for stage transition.', audience: 'advanced', unlockTier: 'advanced' },
  { term: 'Drive', def: 'One of 4 fundamental drives: Agency, Communion, Eros, Agape. Each can be healthy-balanced or distorted (DarkAddicted, DarkAverted, GoldenAddicted, GoldenAverted).', audience: 'advanced', unlockTier: 'advanced' },
  { term: 'Shadow Quadrant', def: 'The four shadow patterns: DarkAddiction (submergent fixation — clings to a lower capacity), DarkAllergy (submergent aversion — rejects a lower capacity), GoldenAddiction (emergent fixation — bypasses toward higher without integration), GoldenAllergy (emergent aversion — refuses the call to grow). The game surfaces these qualitatively, never as clinical labels.', audience: 'advanced', unlockTier: 'advanced' },
  { term: 'Polarity', def: 'The energetic direction of an encounter: Absorptive (taking in), Radiative (giving out), or Homeostatic (balanced).', audience: 'advanced', unlockTier: 'advanced' },
  { term: 'Aesthetic Label', def: 'The bracketed word next to each developmental line in status output (e.g. [power]). It is the short form of your current stage: primal=Infrared, symbolic=Magenta, power=Red, order=Amber, reason=Orange, harmony=Green, integral=Teal, unity=Turquoise.', audience: 'advanced', unlockTier: 'advanced' },
  { term: 'Theme', def: 'The session strategy that biases encounter selection (e.g. "balanced-development"). Shown in diagnostic. Different themes emphasize different lines or shadow work.', audience: 'advanced', unlockTier: 'advanced' },
  { term: 'Calibration', def: 'The initial 8-question session that establishes your baseline across all 8 lines. Runs automatically on first play.', audience: 'advanced', unlockTier: 'advanced' },
];

/** All terms (tier1 + tier2 + advanced), for backwards-compat imports. */
export const GLOSSARY_TERMS: readonly GlossaryTerm[] = [
  ...PLAYER_GLOSSARY_TERMS,
  ...TIER2_GLOSSARY_TERMS,
  ...ADVANCED_GLOSSARY_TERMS,
];

/**
 * P2-U5: Check which Tier 2 terms should unlock based on a narrative text.
 * Returns the list of term names that should be newly unlocked.
 * A term unlocks when any of its unlockKeywords appears in the text (case-insensitive).
 */
export function checkTermUnlocks(narrativeText: string, alreadyUnlocked: readonly string[]): readonly string[] {
  const newlyUnlocked: string[] = [];
  const lowerText = narrativeText.toLowerCase();
  for (const term of TIER2_GLOSSARY_TERMS) {
    if (alreadyUnlocked.includes(term.term)) continue;
    const keywords = term.unlockKeywords ?? [term.term.toLowerCase()];
    if (keywords.some(kw => lowerText.includes(kw.toLowerCase()))) {
      newlyUnlocked.push(term.term);
    }
  }
  return newlyUnlocked;
}
