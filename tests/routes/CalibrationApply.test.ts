// @vitest-environment jsdom
/**
 * One click, one profile.
 *
 * SCOPE, STATED HONESTLY. This file has two halves. The behavioural tests exercise the guard's
 * LOGIC through the `makeApplier` copy below; the final test reads `+page.svelte` and asserts the
 * COMPONENT actually carries the guard and both `disabled` bindings. Neither half is sufficient
 * alone — a mirror cannot prove the component behaves this way, and a source scan cannot prove the
 * behaviour — so both are here, and both were verified to go red when the component was mutated.
 *
 * THE DEFECT THIS PINS. `calibrate/+page.svelte`'s apply button had no in-flight guard, and
 * `persistSignificator` awaits two dynamic imports before it writes — so the button stayed live for
 * the whole of that window. A double-click entered `applyResult` twice with `existing` still null, and
 * each pass took the `createSignificator(...)` branch and minted its OWN id. The second write won; the
 * first profile was orphaned on disk while the player was told they had one save. Nothing surfaced it:
 * the page rendered the same "Saved to this device" either way.
 *
 * WHY THE INTERLEAVING IS FORCED RATHER THAN TIMED. The window depends on how long the dynamic
 * imports take, so a test that clicks twice after a delay is a race, not a test — and a real
 * `setTimeout` in the mock would bind it to wall-clock time, which is what the project's test rules
 * forbid. Instead the mocked writer parks on a latch the test opens explicitly: the second call is
 * therefore guaranteed to arrive while the first is suspended at its `await`, which is precisely the
 * window a real double-click hits. Deterministic, and failing for the right reason if it fails.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

import { createSignificator } from '$core/domain/Significator.js';
import { persistSignificator } from '$lib/stores/saveHydration.js';

vi.mock('$lib/stores/saveHydration.js', () => ({
  persistSignificator: vi.fn(() => Promise.resolve()),
  loadSignificatorFromStorage: vi.fn(() => null),
}));

type Sig = ReturnType<typeof createSignificator>;

const ALTITUDES = {
  Cognitive: 'Amber', Emotional: 'Red', Moral: 'Red', Intrapersonal: 'Amber',
  Spiritual: 'Red', Somatic: 'Red', Willpower: 'Red', Interpersonal: 'Red',
} as const;

function ensureLocalStorage(): void {
  if (typeof globalThis.localStorage === 'undefined') {
    Object.defineProperty(globalThis, 'localStorage', {
      value: new Map<string, string>(), writable: true, configurable: true,
    });
  }
}

/**
 * The guarded body, MIRRORED FROM THE COMPONENT — and that mirroring is the weakness this file has
 * to compensate for, which is why `the component still declares the guard` below exists.
 *
 * The repo has no component-test library, so the double-click property is exercised here rather than
 * against a mounted `+page.svelte`. A mirror cannot prove the component behaves this way; it proves
 * the SHAPE of the fix does. The binding assertions close that gap the same way `CardKeyboard`
 * does: by reading the component and requiring the guard and both `disabled` bindings to be present.
 * If someone removes the guard from the component, this file's behavioural tests stay green and the
 * binding test goes red — which is the failure we need to catch.
 *
 * `hold` keeps the first call suspended at its `await` so a second call provably overlaps it. It is a
 * plain deferred, not a timer.
 */
function makeApplier(existing: { value: Sig | null }, hold?: Promise<void>) {
  let applying = false;

  return async function applyResult(): Promise<void> {
    if (applying) return;
    const sig = existing.value
      ? ({ ...existing.value, altitudes: { ...existing.value.altitudes, ...ALTITUDES } } as Sig)
      : createSignificator(
          `sig-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          { ...ALTITUDES },
          'Red',
        );
    applying = true;
    try {
      if (hold) await hold;
      await persistSignificator(sig as never);
    } finally {
      applying = false;
    }
    existing.value = sig;
  };
}

function idsWritten(): string[] {
  return vi.mocked(persistSignificator).mock.calls.map(
    ([sig]) => (sig as unknown as { id: string }).id,
  );
}

describe('calibration apply is re-entrancy safe', () => {
  beforeEach(() => {
    ensureLocalStorage();
    localStorage.clear();
    vi.mocked(persistSignificator).mockClear();
  });

  it('a second click arriving mid-save does NOT mint a second profile', async () => {
    const existing: { value: Sig | null } = { value: null };
    let release = (): void => {};
    const gate = new Promise<void>((r) => { release = r; });
    const apply = makeApplier(existing, gate);

    // First click parks inside the save; second click must be refused, not queued.
    const first = apply();
    const second = apply();
    release();
    await Promise.all([first, second]);

    const ids = idsWritten();
    expect(ids.length, 'the guarded second click still wrote').toBe(1);
    expect(existing.value?.id).toBe(ids[0]);
  });

  it('three concurrent clicks still write exactly one profile', async () => {
    const existing: { value: Sig | null } = { value: null };
    let release = (): void => {};
    const gate = new Promise<void>((r) => { release = r; });
    const apply = makeApplier(existing, gate);

    const runs = [apply(), apply(), apply()];
    release();
    await Promise.all(runs);

    expect(new Set(idsWritten()).size, `concurrent clicks minted ${new Set(idsWritten()).size} ids`).toBe(1);
  });

  it('a single click writes one profile and adopts it', async () => {
    const existing: { value: Sig | null } = { value: null };
    const apply = makeApplier(existing);

    await apply();

    expect(vi.mocked(persistSignificator)).toHaveBeenCalledTimes(1);
    expect(existing.value?.id).toBe(idsWritten()[0]);
    expect(existing.value?.altitudes.Cognitive).toBe('Amber');
  });

  it('the guard releases: a later run still applies, to the SAME profile', async () => {
    // A guard that never released would be its own defect — the button must be reusable.
    const existing: { value: Sig | null } = { value: null };
    const apply = makeApplier(existing);

    await apply();
    const firstId = existing.value!.id;
    await apply();

    expect(existing.value!.id).toBe(firstId);   // updated in place, not re-minted
    expect(vi.mocked(persistSignificator)).toHaveBeenCalledTimes(2);
  });

  it('a failed save does not leave the button stuck', async () => {
    // The guard clears in a `finally`, so a rejected write must not permanently disable the control.
    const existing: { value: Sig | null } = { value: null };
    const apply = makeApplier(existing);
    vi.mocked(persistSignificator).mockRejectedValueOnce(new Error('quota'));

    await expect(apply()).rejects.toThrow('quota');
    vi.mocked(persistSignificator).mockResolvedValue(undefined as never);
    await apply();   // would hang forever if `applying` had not been released

    expect(vi.mocked(persistSignificator)).toHaveBeenCalledTimes(2);
  });

  it('THE COMPONENT carries the guard and disables BOTH apply buttons', () => {
    // The half a mirror cannot prove. Every test above stays green if the guard is deleted from
    // `+page.svelte`, because they exercise the copy above rather than the component. This reads
    // the component, so removing `if (applying) return` — or a `disabled={applying}` from either
    // button — fails here.
    const src = readFileSync('src/routes/calibrate/+page.svelte', 'utf8');

    expect(src, 'the in-flight guard is gone from applyResult').toMatch(/if \(applying\) return;/);
    expect(src, 'applying is never reset, so the button would stick').toMatch(/applying = false/);

    // BOTH buttons: one seeds a new profile, one replaces altitudes on an existing one. Either can
    // be double-clicked, and each mints or overwrites.
    const disabledBindings = src.match(/disabled=\{applying\}/g) ?? [];
    expect(
      disabledBindings.length,
      `expected both apply buttons to be disabled while saving, found ${disabledBindings.length}`,
    ).toBe(2);

    // And the state the guard reads must exist and be reset, not declared and never used.
    expect(src).toMatch(/let applying = \$state\(false\)/);
  });
});
