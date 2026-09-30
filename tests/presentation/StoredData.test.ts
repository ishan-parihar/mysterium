// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { ensureLocalStorage } from '../helpers/localStorageMock.js';
import {
  DATA_GROUP_ORDER,
  deletableKeys,
  storedData,
  storedSummary,
} from '../../src/core/presentation/storedData.js';

// The jsdom localStorage mock is a single shared store for the whole file, so without this a key
// seeded by one test is still there for the next — which is how a "this device never had the legacy
// key" assertion can fail against a device that two tests ago did.
beforeEach(() => {
  ensureLocalStorage();
  localStorage.clear();
});

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
    // The PHYSICAL key. The fixture used to seed bare `profile:v1`, which is the key the app does
    // NOT write — the repository namespaces it to `mysterium:profile:v1`. That made this test
    // agree with the inventory's bug: it passed while the page reported "nothing here is stored"
    // for a player with a real Significator. A fixture that seeds the wrong key pins the wrong
    // behaviour, so it is seeded the way the app actually writes.
    localStorage.setItem('mysterium:profile:v1', '{}');
    localStorage.setItem('mysterium:profiles', '{}');
    localStorage.setItem('mysterium:device-id', 'abc');
    localStorage.setItem('mysterium.shares.v1', '[]');
    const items = storedData((k) => localStorage.getItem(k) !== null);
    expect(storedSummary(items).present).toBe(4);
    // The gap this page exists to close: the old settings reset removed 3 keys, and the device id,
    // profiles and shares survive it.
    expect(deletableKeys(items)).toContain('mysterium:device-id');
    expect(deletableKeys(items)).toContain('mysterium.shares.v1');
    // And the play data the player actually holds is now reachable for deletion.
    expect(deletableKeys(items)).toContain('mysterium:profile:v1');
  });

  it('still finds and offers to delete a LEGACY bare play key', () => {
    ensureLocalStorage();
    // A player who calibrated before the repository namespaced its writes has their Significator at
    // the bare `profile:v1`. Reporting "nothing here is stored" for them would make real data
    // undeletable through the page whose whole job is deletion.
    localStorage.setItem('profile:v1', '{}');
    const items = storedData((k) => localStorage.getItem(k) !== null);
    const play = deletableKeys(items.filter((i) => i.group === 'play'), (k) => localStorage.getItem(k) !== null);
    expect(play).toContain('profile:v1');
  });

  it('does not hand a delete a legacy key the device never had', () => {
    ensureLocalStorage();
    // Only the namespaced form exists. The bare alias must NOT be reported, or the console receipt
    // and the count claim keys that were never written.
    localStorage.setItem('mysterium:profile:v1', '{}');
    const items = storedData((k) => localStorage.getItem(k) !== null);
    const play = deletableKeys(items.filter((i) => i.group === 'play'), (k) => localStorage.getItem(k) !== null);
    expect(play).toContain('mysterium:profile:v1');
    expect(play).not.toContain('profile:v1');
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
      'mysterium:profile:v1', 'mysterium:world:v1', 'mysterium:save:v1',
      'mysterium.shares.v1',
      'mysterium:profiles', 'mysterium:active-profile', 'mysterium:device-id',
      'mysterium:accessibility', 'mysterium:session-control',
    ]) {
      localStorage.setItem(k, 'seeded');
    }
    const items = storedData((k) => localStorage.getItem(k) !== null);
    const identity = deletableKeys(items.filter((i) => i.group === 'identity'));
    const play = deletableKeys(items.filter((i) => i.group === 'play'), (k) => localStorage.getItem(k) !== null);

    // Disjoint, and each contains only its own group. An earlier run of this page was checked by
    // eye in a browser and a `.filter()` that lists SURVIVORS was read as a list of removals; the
    // property is easier to assert than to eyeball.
    expect(identity.filter((k) => play.includes(k))).toHaveLength(0);
    for (const k of identity) {
      expect(['mysterium:profiles', 'mysterium:active-profile', 'mysterium:device-id']).toContain(k);
    }
    for (const k of play) {
      expect(['mysterium:profile:v1', 'mysterium:world:v1', 'mysterium:save:v1']).toContain(k);
    }
  });
});
