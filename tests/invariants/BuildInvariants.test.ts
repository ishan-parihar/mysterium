import { describe, it, expect } from 'vitest';
import { bootRegistries } from '../../src/core/registries/boot.js';
import { allModuleKeys } from '../../src/core/data/ConceptDraftIndex.js';
import { createRegistry } from '../../src/core/world/store/HolonStore.js';
import { ALL_MODALITIES, ALL_SHADOW_QUADRANTS, ALL_HOLON_KINDS } from '../../src/core/domain/enums.js';

describe('Build Invariants', () => {
  it('bootRegistries() does not throw', () => {
    expect(() => bootRegistries()).not.toThrow();
  });

  it('ConceptDraftIndex exports allModuleKeys', () => {
    expect(typeof allModuleKeys).toBe('function');
  });

  it('HolonRegistry can create empty registry', () => {
    const r = createRegistry([]);
    expect(r.holons).toHaveLength(0);
  });

  it('ALL_MODALITIES has members', () => {
    expect(ALL_MODALITIES.length).toBeGreaterThan(0);
  });

  it('ALL_SHADOW_QUADRANTS has members', () => {
    expect(ALL_SHADOW_QUADRANTS.length).toBeGreaterThan(0);
  });

  it('ALL_HOLON_KINDS has members', () => {
    expect(ALL_HOLON_KINDS.length).toBeGreaterThan(0);
  });
});
