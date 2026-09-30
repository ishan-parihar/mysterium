// @vitest-environment jsdom
/**
 * A Card that advertises `role="button"` must be operable by a keyboard.
 *
 * THE DEFECT THIS PINS. `Card.svelte`'s clickable form renders `role="button" tabindex="0"` and
 * nothing else. It was therefore focusable — so a tab-order audit passed — and carried button
 * semantics — so an axe scan passed — while Enter and Space did nothing. `/play`'s encounter cards
 * are the core action of the game, and they were in that state: a browser driver could only find
 * them by DOM query, never by accessible name, which is the same wall a keyboard user hits.
 *
 * WHY AN INFRA-RED COMPONENT IS TESTED THROUGH ITS HANDLER. The repo has no component-test library
 * (`@testing-library/svelte` is not a dependency and adding one for a single assertion would be the
 * wrong trade), so the decision is factored into a pure `cardKeydown` and tested directly. That is
 * still behavioural with respect to the thing that was broken: before the extraction there was no
 * handler to test, and the source-level test below fails if the component stops using it.
 */

import { describe, expect, it, vi } from 'vitest';

import { cardKeydown } from '$lib/components/cardActivation.js';
import { readFileSync } from 'node:fs';

describe('Card keyboard activation', () => {
  it('fires the activation callback on Enter', () => {
    const onclick = vi.fn();
    const event = new KeyboardEvent('keydown', { key: 'Enter', cancelable: true });

    cardKeydown(event, onclick);

    expect(onclick, 'Enter did not activate the card').toHaveBeenCalledTimes(1);
  });

  it('fires the activation callback on Space', () => {
    const onclick = vi.fn();
    const event = new KeyboardEvent('keydown', { key: ' ', cancelable: true });

    cardKeydown(event, onclick);

    expect(onclick, 'Space did not activate the card').toHaveBeenCalledTimes(1);
  });

  it('ignores keys that are not activation keys', () => {
    for (const key of ['a', 'Tab', 'Escape', 'ArrowDown', 'x']) {
      const onclick = vi.fn();
      cardKeydown(new KeyboardEvent('keydown', { key, cancelable: true }), onclick);
      expect(onclick, `the key "${key}" fired the activation handler`).not.toHaveBeenCalled();
    }
  });

  it('does not preventDefault on a non-activation key', () => {
    const event = new KeyboardEvent('keydown', { key: 'a', cancelable: true });
    cardKeydown(event, vi.fn());
    expect(event.defaultPrevented).toBe(false);
  });

  it('preventDefaults the activation key so Space does not scroll the page', () => {
    // Not cosmetic: without preventDefault the default Space action scrolls, so a keyboard player
    // would activate a card and be thrown to the top of the page mid-encounter.
    for (const key of ['Enter', ' ']) {
      const event = new KeyboardEvent('keydown', { key, cancelable: true });
      cardKeydown(event, vi.fn());
      expect(event.defaultPrevented, `${key} was not preventDefault()ed`).toBe(true);
    }
  });

  it('tolerates a missing callback (a keyboard-focusable card with no action)', () => {
    expect(() => cardKeydown(new KeyboardEvent('keydown', { key: 'Enter' }), undefined)).not.toThrow();
  });

  it('THE COMPONENT IS WIRED TO THIS HANDLER — the binding is the part that can rot', () => {
    // The pure tests above pass even if `Card.svelte` stops using the handler, which is the failure
    // mode the extraction introduces. This asserts the wiring without a component library.
    const src = readFileSync('src/lib/components/Card.svelte', 'utf8');
    expect(src, 'Card.svelte no longer binds the activation handler').toMatch(/onkeydown=\{onKeydown\}/);
    expect(src, 'Card.svelte no longer declares the handler').toMatch(/cardKeydown/);
    // And the promise must still be kept: role and focusability only mean something with a handler.
    expect(src).toMatch(/role="button"/);
    expect(src).toMatch(/tabindex="0"/);
  });
});
