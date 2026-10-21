/**
 * Keeps focus and the selection where they are for a primary-button pointer press by
 * preventing the press's default action; the pressed control still activates through its
 * `click`, and propagation continues (`uwg-te-tb-req-press`, `uwg-te-req-key-8`).
 * Returns whether this call prevented the press.
 */
export function preserveFocusOnPress(event: PointerEvent): boolean {
  if (event.button !== 0 || event.defaultPrevented) return false;
  event.preventDefault();
  return event.defaultPrevented;
}
