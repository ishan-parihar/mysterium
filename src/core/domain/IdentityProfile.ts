/**
 * IdentityProfile — consent-bound identity context for the HEALING layer.
 * Spec: docs/foundations/16-significator-architecture.md §2.1,
 *       docs/foundations/42-developmental-levelling-mechanism.md §1.1.
 *
 * The user's law: "competence is what matters for the evolution, but identity
 * matters for the healing." Identity fields (age band, sex/gender, lineage,
 * culture, region, language, life situation) are collected at onboarding under
 * EXPLICIT per-field consent and are usable ONLY through the purpose-bound
 * projector (`projectHealingContext`, src/core/healing/HealingContext.ts) for
 * presentation/voicing purposes. They are structurally unreachable from the
 * measurement machinery (levelling, difficulty, scoring, credentials) —
 * enforced by kernel firewall gate G12.
 *
 * Hard properties (doc 16 §2.1):
 *   1. Consent-gated existence — every field voluntary, revocable at any time.
 *   2. Purpose-bound exposure — raw fields never read directly by game systems.
 *   3. Separation from the developmental ledger — tunes HOW catalyst feels,
 *      never WHAT level is assigned or WHAT evidence counts.
 *
 * Pure data + pure functions. Serializable (plain objects only).
 */

// ---------------------------------------------------------------------------
// Fields
// ---------------------------------------------------------------------------

export const IDENTITY_FIELDS = [
  'ageBand',
  'sex',
  'gender',
  'lineage',
  'ethnicity',
  'culture',
  'region',
  'language',
  'lifeSituation',
] as const;

export type IdentityField = (typeof IDENTITY_FIELDS)[number];

/** Coarse age bands — healing texture only (lifeStageHint), never levelling input. */
export const AGE_BANDS = ['under-13', '13-17', '18-24', '25-34', '35-44', '45-59', '60+', 'prefer-not-to-say'] as const;

// ---------------------------------------------------------------------------
// Purposes (what identity may be used FOR)
// ---------------------------------------------------------------------------

export const HEALING_PURPOSES = [
  'narrativeVoice',      // metaphor/frame selection in LLM voicing
  'exampleDomains',      // culturally-resonant example domains in content
  'lifeStageTexture',    // life-situation resonance in practice objectives (39)
  'localeFormat',        // presentation language/locale
  'accessibility',       // derived presentation accommodations
] as const;

export type HealingPurpose = (typeof HEALING_PURPOSES)[number];

// ---------------------------------------------------------------------------
// Consent ledger
// ---------------------------------------------------------------------------

export interface FieldConsent {
  /** When consent was granted (ms epoch). */
  readonly grantedAtMs: number;
  /** Which healing purposes this field may serve. */
  readonly purposes: readonly HealingPurpose[];
  /** When consent was withdrawn (ms epoch), or null while active. */
  readonly withdrawnAtMs: number | null;
}

export interface IdentityProfile {
  /** Raw field values — client-local, never leaves the device (doc 41 §2.1). */
  readonly fields: Partial<Record<IdentityField, string>>;
  /** Per-field consent records. A field value without consent is unusable. */
  readonly consents: Partial<Record<IdentityField, FieldConsent>>;
  /**
   * Declared PREFERENCES (Phase 11 d3 / G29) — what draws and what repels, consent-gated per
   * entry exactly like the identity fields. ONE purpose ('preferenceVoicing'): declared
   * preferences tune what scenarios/worlds/NPCs the composition reaches for — NEVER difficulty,
   * progression, or scoring. They enter the UDV's declared band as ranking BIAS (45 §5: ranking,
   * not filtering) and pass the legibility contract (47 §8): the stored form is a free-text
   * phrase + the derived tag, the withdrawal removes the value AND the derived weight, and the
   * deletion itself is not recorded as a new memory of the preference.
   */
  readonly preferences?: {
    readonly interests: readonly DeclaredPreference[];
    readonly aversions: readonly DeclaredPreference[];
  };
  readonly version: 1;
}

/** One consented preference entry — 47 §8's legible stored form. */
export interface DeclaredPreference {
  /** The player's own words (what they typed) — kept verbatim for legibility on the dashboard. */
  readonly phrase: string;
  /** The store-resolved tag derived from the phrase (may be empty when nothing resolves). */
  readonly tag: string | null;
  readonly grantedAtMs: number;
  readonly withdrawnAtMs: number | null;
}

// ---------------------------------------------------------------------------
// Pure operations
// ---------------------------------------------------------------------------

export function createEmptyIdentityProfile(): IdentityProfile {
  return { fields: {}, consents: {}, preferences: { interests: [], aversions: [] }, version: 1 };
}

// ---------------------------------------------------------------------------
// Declared preferences (Phase 11 d3 / G29)
// ---------------------------------------------------------------------------

/** The ONE purpose a declared preference may serve (G29: never a field of record). */
export const PREFERENCE_PURPOSE = 'preferenceVoicing' as const;

/**
 * Grant consent for one declared interest/aversion. The phrase is kept verbatim; the derived tag
 * is resolved by the caller (the CLI, against the tag store's labels) and stored alongside so the
 * dashboard shows the player exactly what the game derived. Pure — returns a new profile.
 */
export function grantDeclaredPreference(
  profile: IdentityProfile,
  kind: 'interests' | 'aversions',
  phrase: string,
  tag: string | null,
  nowMs: number,
): IdentityProfile {
  const current = profile.preferences ?? { interests: [], aversions: [] };
  const entry: DeclaredPreference = { phrase, tag, grantedAtMs: nowMs, withdrawnAtMs: null };
  return {
    ...profile,
    preferences: { ...current, [kind]: [...current[kind], entry] },
  };
}

/**
 * Withdraw one declared preference by phrase (case-insensitive). The value AND its derived tag
 * are removed; the withdrawal is recorded ONLY as `withdrawnAtMs` on the entry's own slot —
 * nothing new is learned or stored about the preference (47 §8: the deletion is not a memory).
 * Pure — returns a new profile. Returns the same profile untouched when no entry matches.
 */
export function withdrawDeclaredPreference(
  profile: IdentityProfile,
  kind: 'interests' | 'aversions',
  phrase: string,
  nowMs: number,
): IdentityProfile {
  const current = profile.preferences ?? { interests: [], aversions: [] };
  const target = phrase.trim().toLowerCase();
  const list = current[kind];
  if (!list.some((p) => p.withdrawnAtMs === null && p.phrase.trim().toLowerCase() === target)) return profile;
  return {
    ...profile,
    preferences: {
      ...current,
      [kind]: list.map((p) =>
        p.withdrawnAtMs === null && p.phrase.trim().toLowerCase() === target ? { ...p, withdrawnAtMs: nowMs, tag: null } : p,
      ),
    },
  };
}

/** Active (non-withdrawn) declared interests — the UDV declared band's only legal source. */
export function activeDeclaredInterests(profile: IdentityProfile | undefined): readonly DeclaredPreference[] {
  return (profile?.preferences?.interests ?? []).filter((p) => p.withdrawnAtMs === null);
}

/** Active (non-withdrawn) declared aversions — the aversion set's declared slice. */
export function activeDeclaredAversions(profile: IdentityProfile | undefined): readonly DeclaredPreference[] {
  return (profile?.preferences?.aversions ?? []).filter((p) => p.withdrawnAtMs === null);
}

/**
 * Grant consent for one field and set its value. Purpose list is recorded
 * verbatim (the UI offers the healing purposes; all are default-on in P0).
 * Pure — returns a new profile.
 */
export function grantIdentityField(
  profile: IdentityProfile,
  field: IdentityField,
  value: string,
  purposes: readonly HealingPurpose[],
  nowMs: number,
): IdentityProfile {
  const usablePurposes = purposes.filter(p => (HEALING_PURPOSES as readonly string[]).includes(p));
  return {
    ...profile,
    fields: { ...profile.fields, [field]: value },
    consents: {
      ...profile.consents,
      [field]: { grantedAtMs: nowMs, purposes: usablePurposes, withdrawnAtMs: null },
    },
  };
}

/**
 * Withdraw consent for one field. The raw value is REMOVED and the withdrawal
 * is recorded (audit trail). The game continues unimpaired — identity tunes
 * voicing, never progression. Pure — returns a new profile.
 */
export function withdrawIdentityField(profile: IdentityProfile, field: IdentityField, nowMs: number): IdentityProfile {
  const existing = profile.consents[field];
  const { [field]: _removed, ...remainingFields } = profile.fields;
  return {
    ...profile,
    fields: remainingFields,
    consents: {
      ...profile.consents,
      [field]: existing
        ? { ...existing, withdrawnAtMs: nowMs }
        : { grantedAtMs: 0, purposes: [], withdrawnAtMs: nowMs },
    },
  };
}

/** Is a field currently usable for a given purpose? (consent + no withdrawal) */
export function isFieldUsable(profile: IdentityProfile, field: IdentityField, purpose: HealingPurpose): boolean {
  const consent = profile.consents[field];
  if (!consent) return false;
  if (consent.withdrawnAtMs !== null) return false;
  if (!consent.purposes.includes(purpose)) return false;
  return profile.fields[field] !== undefined;
}
