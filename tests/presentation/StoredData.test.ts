// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { ensureLocalStorage } from '../helpers/localStorageMock.js';
import {
  DATA_GROUP_ORDER,
  deletableKeys,
  storedData,
  storedSummary,
} from '../../src/core/presentation/storedData.js';

describe('the privacy inventory reports what this device actually holds', () => {
  it('a fresh device holds nothing and says so', () => {
    ensureLocalStorage();
    const items = storedData((k) => localStorage.getItem(k) !== null);
    const s = storedSummary(items);
    expect(s.present).toBe(0);
    expect(s.total).toBeGreaterThan(0); // the inventory still names what the app CAN hold
    expect(deletableKeys(items)).toHaveLength(0);
  });

  it('it sees a profile AND the keys /settings reset never touched', () => {
    ensureLocalStorage();
    localStorage.setItem('profile:v1', '{}');
    localStorage.setItem('mysterium:profiles', '{}');
    localStorage.setItem('mysterium:device-id', 'abc');
    localStorage.setItem('mysterium.shares.v1', '[]');
    const items = storedData((k) => localStorage.getItem(k) !== null);
    expect(storedSummary(items).present).toBe(4);
    // The gap this page exists to close: the old settings reset removed 3 keys, and the device id,
    // profiles and shares survive it.
    expect(deletableKeys(items)).toContain('mysterium:device-id');
    expect(deletableKeys(items)).toContain('mysterium.shares.v1');
  });

  it('every group is non-empty, so a player never sees a group with no rows', () => {
    const items = storedData(() => true);
    for (const g of DATA_GROUP_ORDER) {
      expect(items.filter((i) => i.group === g).length).toBeGreaterThan(0);
    }
  });

  it('every item explains what it holds and carries a consequence', () => {
    for (const i of storedData(() => true)) {
      expect(i.label.length).toBeGreaterThan(3);
      expect(i.holds.length).toBeGreaterThan(20);
    }
  });
});

describe('deleting one group must touch nothing outside it', () => {
  it('the keys handed to a group delete are exactly that group’s present keys', () => {
    ensureLocalStorage();
    for (const k of [
      'profile:v1', 'world:v1', 'save:v1',
      'mysterium.shares.v1',
      'mysterium:profiles', 'mysterium:active-profile', 'mysterium:device-id',
      'mysterium:accessibility', 'mysterium:session-control',
    ]) {
      localStorage.setItem(k, 'seeded');
    }
    const items = storedData((k) => localStorage.getItem(k) !== null);
    const identity = deletableKeys(items.filter((i) => i.group === 'identity'));
    const play = deletableKeys(items.filter((i) => i.group === 'play'));

    // Disjoint, and each contains only its own group. An earlier run of this page was checked by
    // eye in a browser and a `.filter()` that lists SURVIVORS was read as a list of removals; the
    // property is easier to assert than to eyeball.
    expect(identity.filter((k) => play.includes(k))).toHaveLength(0);
    for (const k of identity) {
      expect(['mysterium:profiles', 'mysterium:active-profile', 'mysterium:device-id']).toContain(k);
    }
    for (const k of play) {
      expect(['profile:v1', 'world:v1', 'save:v1']).toContain(k);
    }
  });
});
