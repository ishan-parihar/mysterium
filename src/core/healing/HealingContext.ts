/**
 * HealingContext — the ONLY sanctioned consumer of IdentityProfile raw fields.
 * Spec: docs/foundations/16 §2.1, doc 42 §1.1's competence/identity firewall.
 *
 * Converts consented identity into a DERIVED, raw-field-free view for the
 * healing paths (narrative voicing, example domains, life-stage texture,
 * locale). Measurement paths (levelling/difficulty/scoring/credentials) are
 * forbidden from importing this module — kernel firewall gate G12 asserts
 * this by source lint: `src/core/curriculum/**`, `src/core/engines/**`, and
 * `src/core/adaptive/**` must not reference HealingContext/IdentityProfile
 * (IdentityProfile *types* are permitted as type-only in the persistence
 * validator).
 *
 * The one-way rule: healing context may be built FROM engine state; engine
 * state is never built FROM healing context.
 */
import {
  isFieldUsable,
  type HealingPurpose,
  type IdentityField,
  type IdentityProfile,
} from '../domain/IdentityProfile.js';

// ---------------------------------------------------------------------------
// Derived view (raw-field-free)
// ---------------------------------------------------------------------------

export type VoicingTone = 'plain' | 'communal' | 'formal';

export interface HealingContext {
  /** True when at least one consented field informed the context. */
  readonly informed: boolean;
  /** Metaphor-set hint for LLM voicing (narrativeVoice purpose). */
  readonly metaphorHint: string | null;
  /** Culturally-resonant example-domain hint (exampleDomains purpose). */
  readonly exampleDomainHint: string | null;
  /** Life-stage texture for practice objectives (lifeStageTexture purpose). */
  readonly lifeStageHint: string | null;
  /** Presentation locale hint (localeFormat purpose). */
  readonly localeHint: string | null;
  /** Presentation accommodation hint (accessibility purpose). */
  readonly accessibilityHint: string | null;
  /** Which purposes were actually served (for the player's data dashboard). */
  readonly purposesServed: readonly HealingPurpose[];
}

export const EMPTY_HEALING_CONTEXT: HealingContext = {
  informed: false,
  metaphorHint: null,
  exampleDomainHint: null,
  lifeStageHint: null,
  localeHint: null,
  accessibilityHint: null,
  purposesServed: [],
};

// ---------------------------------------------------------------------------
// Projector
// ---------------------------------------------------------------------------

/** Region → metaphor-set hint. Coarse, prescriptive-by-design derivations. */
const REGION_METAPHORS: Readonly<Record<string, string>> = {
  'north-america': 'frontier and open-road imagery',
  'europe': 'old-world craft and seasonal-cycle imagery',
  'south-asia': 'monsoon, weaving, and pilgrimage imagery',
  'east-asia': 'river, mountain, and craftsmanship imagery',
  'mena': 'caravan, starway, and oasis imagery',
  'africa': 'baobab, rhythm, and storyteller-fire imagery',
  'latam': 'jungle, fiesta, and ancestral-river imagery',
  'oceania': 'voyaging, tide, and navigation-star imagery',
  'global': 'universal elemental imagery (water, stone, wind)',
};

const LIFE_SITUATION_HINTS: Readonly<Record<string, string>> = {
  'student': 'learning-load texture: objectives sized for a study life',
  'parent': 'caregiver-load texture: objectives sized in small windows',
  'professional': 'work-cycle texture: objectives anchored to work rhythms',
  'retired': 'harvest texture: objectives honoring accumulated experience',
  'in-transition': 'threshold texture: objectives honoring instability gently',
};

/**
 * Derive the healing context. Pure. Checks consent per field per purpose —
 * an unconsented or withdrawn field is as if absent.
 */
export function projectHealingContext(identity: IdentityProfile | undefined): HealingContext {
  if (!identity) return EMPTY_HEALING_CONTEXT;

  const purposesServed: HealingPurpose[] = [];
  const usable = (field: IdentityField, purpose: HealingPurpose): string | null => {
    if (!isFieldUsable(identity, field, purpose)) return null;
    return identity.fields[field] ?? null;
  };

  // narrativeVoice ← region (metaphor family) — voicing, never leveling.
  const region = usable('region', 'narrativeVoice');
  const metaphorHint = region ? (REGION_METAPHORS[region] ?? null) : null;
  if (metaphorHint) purposesServed.push('narrativeVoice');

  // exampleDomains ← culture/lineage — culturally-resonant example domains.
  const culture = usable('culture', 'exampleDomains') ?? usable('lineage', 'exampleDomains');
  const exampleDomainHint = culture
    ? `examples drawn from ${culture} contexts where natural`
    : null;
  if (exampleDomainHint) purposesServed.push('exampleDomains');

  // lifeStageTexture ← lifeSituation (+ age band as life-stage TEXTURE only —
  // it tunes how objectives are framed, never what rung is assigned).
  const lifeSituation = usable('lifeSituation', 'lifeStageTexture');
  const ageBand = usable('ageBand', 'lifeStageTexture');
  const lifeStageHint = lifeSituation
    ? (LIFE_SITUATION_HINTS[lifeSituation] ?? `objectives attuned to a ${lifeSituation} life situation`)
    : ageBand
      ? `objectives framed for the ${ageBand} life stage`
      : null;
  if (lifeStageHint) purposesServed.push('lifeStageTexture');

  // localeFormat ← language/region.
  const language = usable('language', 'localeFormat');
  const localeHint = language
    ? `present in ${language}`
    : region && isFieldUsable(identity, 'region', 'localeFormat')
      ? `present for ${region} conventions`
      : null;
  if (localeHint) purposesServed.push('localeFormat');

  // accessibility purpose: reserved — no free-text field ships in P0
  // (IDENTITY_FIELDS has none); stays null until a consented field exists.
  const accessibilityHint: string | null = null;

  const informed = purposesServed.length > 0;

  return {
    informed,
    metaphorHint,
    exampleDomainHint,
    lifeStageHint,
    localeHint,
    accessibilityHint,
    purposesServed,
  };
}
