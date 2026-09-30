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
 *
 * `event.repeat` is refused because a real button's click does not repeat while a key is held. On
 * `/play` the card OPENS AN ENCOUNTER, so holding Space would otherwise re-fire it continuously.
 *
 * The callback is invoked with NO argument. `Card`'s prop is `onclick?: () => void` — it declares
 * none — so handing it the KeyboardEvent would be a lie about the signature, and a handler written
 * against the mouse contract (`e.stopPropagation()`) would be handed a key event. Note this is NOT
 * the same as the handler "not running": `onclick` is called on both paths, exactly as a real button
 * synthesises a click for both.
 */
export function cardKeydown(event: KeyboardEvent, onclick?: () => void): void {
  if (event.repeat) return;
  if (event.key !== 'Enter' && event.key !== ' ') return;
  // Required, not stylistic: the default Space action scrolls the page, so a keyboard player would
  // activate the card and be thrown to the top mid-encounter.
  event.preventDefault();
  onclick?.();
}
