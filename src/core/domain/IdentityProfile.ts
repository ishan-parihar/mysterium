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
  readonly version: 1;
}

// ---------------------------------------------------------------------------
// Pure operations
// ---------------------------------------------------------------------------

export function createEmptyIdentityProfile(): IdentityProfile {
  return { fields: {}, consents: {}, version: 1 };
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
