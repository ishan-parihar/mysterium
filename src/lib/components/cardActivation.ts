/**
 * Keyboard activation for a clickable surface that advertises `role="button"`.
 *
 * WHY THIS IS A MODULE AND NOT INLINE IN THE COMPONENT. `Card.svelte` rendered
 * `role="button" tabindex="0"` with no key handler, so it was focusable (a tab-order audit passed)
 * and carried button semantics (an axe scan passed) while Enter and Space did nothing. `/play`'s
 * encounter cards — the core action of the game — were in that state. The fix is one handler, and it
 * lives here so it is directly testable: the repo has no component-test library, and adding one to
 * assert a key comparison would be the wrong trade. `CardKeyboard.test.ts` additionally asserts that
 * `Card.svelte` still binds this function, which is the part an extraction can let rot.
 *
 * Enter/Space only, matching what a real `<button>` accepts. A modifier chord is left alone: the
 * player who wants the raw key is the one we must not intercept.
 */
export function cardKeydown(event: KeyboardEvent, onclick?: () => void): void {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  // Required, not stylistic: the default Space action scrolls the page, so a keyboard player would
  // activate the card and be thrown to the top mid-encounter.
  event.preventDefault();
  onclick?.();
}
