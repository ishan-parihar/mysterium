/**
 * Tests for the IdentityProfile consent machinery and the purpose-bound
 * HealingContext projector (docs 16 §2.1, 42 §1.1).
 *
 * Core guarantees under test:
 *   C1  Consent-gated existence — no value without active consent survives
 *       validation; withdrawal removes the value and records the audit trail.
 *   C2  Purpose-bound exposure — the projector serves only consented purposes
 *       and emits a derived view with NO raw identity fields.
 *   C3  Firewall — measurement modules (levelling) take no identity input;
 *       the G12 kernel gate enforces the import ban structurally.
 */
import { describe, it, expect } from 'vitest';
import {
  createEmptyIdentityProfile,
  grantIdentityField,
  withdrawIdentityField,
  isFieldUsable,
  IDENTITY_FIELDS,
} from '../../../src/core/domain/IdentityProfile.js';
import {
  projectHealingContext,
  EMPTY_HEALING_CONTEXT,
} from '../../../src/core/healing/HealingContext.js';
import { validateSignificator } from '../../../src/infra/persistence/validateSignificator.js';

const NOW = 1_700_000_000_000;
const ALL: Parameters<typeof grantIdentityField>[3] = ['narrativeVoice', 'exampleDomains', 'lifeStageTexture', 'localeFormat'];

// ---------------------------------------------------------------------------
// Consent ledger
// ---------------------------------------------------------------------------

describe('identity consent ledger', () => {
  it('starts empty and grants fields with recorded purposes', () => {
    let p = createEmptyIdentityProfile();
    expect(Object.keys(p.fields)).toHaveLength(0);
    p = grantIdentityField(p, 'region', 'europe', ALL, NOW);
    expect(p.fields.region).toBe('europe');
    expect(p.consents.region?.grantedAtMs).toBe(NOW);
    expect(p.consents.region?.withdrawnAtMs).toBeNull();
    expect(p.consents.region?.purposes).toEqual(ALL);
  });

  it('is usable only for consented purposes while consent is active', () => {
    let p = createEmptyIdentityProfile();
    p = grantIdentityField(p, 'culture', 'bengali', ['exampleDomains'], NOW);
    expect(isFieldUsable(p, 'culture', 'exampleDomains')).toBe(true);
    expect(isFieldUsable(p, 'culture', 'narrativeVoice')).toBe(false);
    expect(isFieldUsable(p, 'region', 'narrativeVoice')).toBe(false);
  });

  it('withdrawal removes the value and records the audit trail', () => {
    let p = createEmptyIdentityProfile();
    p = grantIdentityField(p, 'ageBand', '25-34', ALL, NOW);
    p = withdrawIdentityField(p, 'ageBand', NOW + 1000);
    expect(p.fields.ageBand).toBeUndefined();
    expect(p.consents.ageBand?.withdrawnAtMs).toBe(NOW + 1000);
    expect(isFieldUsable(p, 'ageBand', 'narrativeVoice')).toBe(false);
  });

  it('filters unknown purposes at grant time (defensive)', () => {
    let p = createEmptyIdentityProfile();
    const bad = [...ALL, 'notARealPurpose' as never] as Parameters<typeof grantIdentityField>[3];
    p = grantIdentityField(p, 'language', 'bengali', bad, NOW);
    expect(p.consents.language?.purposes.every(x => ALL.includes(x))).toBe(true);
  });

  it('exposes the full field vocabulary (onboarding coverage)', () => {
    // The user's directive: the entire range — age, sex, lineage, ethnicity,
    // location, etc. All must exist as consentable fields.
    for (const f of ['ageBand', 'sex', 'gender', 'lineage', 'ethnicity', 'region', 'language', 'lifeSituation', 'culture'] as const) {
      expect(IDENTITY_FIELDS).toContain(f);
    }
  });
});

// ---------------------------------------------------------------------------
// HealingContext projector (C2)
// ---------------------------------------------------------------------------

describe('healing context projector', () => {
  it('returns the empty context for undefined identity', () => {
    expect(projectHealingContext(undefined)).toEqual(EMPTY_HEALING_CONTEXT);
  });

  it('serves only consented purposes and never leaks raw fields', () => {
    let p = createEmptyIdentityProfile();
    p = grantIdentityField(p, 'region', 'south-asia', ALL, NOW);
    p = grantIdentityField(p, 'culture', 'bengali', ['exampleDomains'], NOW);
    const ctx = projectHealingContext(p);
    expect(ctx.informed).toBe(true);
    expect(ctx.metaphorHint).toContain('monsoon');
    expect(ctx.exampleDomainHint).toContain('bengali');
    expect(ctx.purposesServed).toContain('narrativeVoice');
    expect(ctx.purposesServed).toContain('exampleDomains');
    // C2 precise form: values appear ONLY in hints serving their consented
    // purpose. narrativeVoice derives a coarse metaphor (no raw value needed),
    // so a region consented ONLY for narrativeVoice must not appear anywhere.
    let voicingOnly = createEmptyIdentityProfile();
    voicingOnly = grantIdentityField(voicingOnly, 'region', 'south-asia', ['narrativeVoice'], NOW);
    const voicingCtx = projectHealingContext(voicingOnly);
    expect(voicingCtx.metaphorHint).toContain('monsoon');
    expect(voicingCtx.localeHint).toBeNull();
    expect(JSON.stringify(voicingCtx)).not.toContain('south-asia');
  });

  it('never surfaces values from fields with no usable consent', () => {
    let p = createEmptyIdentityProfile();
    p = grantIdentityField(p, 'sex', 'female', [], NOW); // no purposes ⇒ unusable
    const ctx = projectHealingContext(p);
    expect(ctx.informed).toBe(false);
    expect(JSON.stringify(ctx)).not.toContain('female');
  });

  it('respects withdrawal — withdrawn fields stop informing the context', () => {
    let p = createEmptyIdentityProfile();
    p = grantIdentityField(p, 'region', 'europe', ALL, NOW);
    p = withdrawIdentityField(p, 'region', NOW + 500);
    const ctx = projectHealingContext(p);
    expect(ctx.informed).toBe(false);
    expect(ctx.metaphorHint).toBeNull();
  });

  it('respects purpose scoping — field consented only for one purpose serves only that purpose', () => {
    let p = createEmptyIdentityProfile();
    p = grantIdentityField(p, 'language', 'bengali', ['localeFormat'], NOW);
    const ctx = projectHealingContext(p);
    expect(ctx.localeHint).toContain('bengali');
    expect(ctx.purposesServed).toEqual(['localeFormat']);
  });
});

// ---------------------------------------------------------------------------
// Persistence round-trip (C1)
// ---------------------------------------------------------------------------

describe('identity persistence validation', () => {
  const baseSig = {
    id: 'test-player',
    createdAt: NOW,
    lifecycle: 'Exploring',
    currentStage: 'Red',
    altitudes: {},
    drives: { weights: {}, fixationRisk: {} },
    theta: { lastEncounter: {} },
    transformations: [],
    codexEntries: [],
    totalEncounters: 0,
    totalSessions: 0,
    avoidedEncounters: [],
    recentEncounters: [],
  };

  function sigWithIdentity(identity: unknown): Record<string, unknown> {
    return { ...baseSig, identity };
  }

  it('round-trips a consented identity profile', () => {
    let p = createEmptyIdentityProfile();
    p = grantIdentityField(p, 'region', 'europe', ALL, NOW);
    p = grantIdentityField(p, 'ageBand', '25-34', ['lifeStageTexture'], NOW);
    const sig = validateSignificator(sigWithIdentity(JSON.parse(JSON.stringify(p))));
    expect(sig).not.toBeNull();
    expect(sig!.identity?.fields.region).toBe('europe');
    expect(sig!.identity?.fields.ageBand).toBe('25-34');
    expect(sig!.identity?.consents.ageBand?.purposes).toEqual(['lifeStageTexture']);
  });

  it('DROPS values without active consent on load (consent-gated existence)', () => {
    // Attacker/corruption case: a field value with no consent record at all.
    const sig = validateSignificator(sigWithIdentity({
      fields: { region: 'europe' },
      consents: {},
      version: 1,
    }));
    expect(sig).not.toBeNull();
    expect(sig!.identity).toBeUndefined();
  });

  it('DROPS values whose consent was withdrawn (withdrawal is deletion on load)', () => {
    const sig = validateSignificator(sigWithIdentity({
      fields: { region: 'europe' },
      consents: { region: { grantedAtMs: NOW, purposes: ALL, withdrawnAtMs: NOW } },
      version: 1,
    }));
    expect(sig!.identity).toBeUndefined();
  });

  it('drops fields with no valid purposes', () => {
    const sig = validateSignificator(sigWithIdentity({
      fields: { sex: 'female' },
      consents: { sex: { grantedAtMs: NOW, purposes: [], withdrawnAtMs: null } },
      version: 1,
    }));
    expect(sig!.identity).toBeUndefined();
  });

  it('keeps the whole identity absent when absent — old saves load untouched', () => {
    const sig = validateSignificator(baseSig);
    expect(sig).not.toBeNull();
    expect(sig!.identity).toBeUndefined();
  });
});
