/**
 * Content stops while the widget is disabled (Widgets `uwg-te-req-prop-3`, `uwg-te-req-a11y-shared-1`).
 *
 * A link in the content is a sequential tab stop, a task checkbox is enabled and a table's scroll
 * wrapper keeps its own focus behavior only while the editing root is a tab stop. Every engine
 * reads the root's tab index from the record it receives through `setRootAttributes` through the one
 * rule here, and writes the stops through the two writers, so the content stays exposed and
 * readable (links keep their `href` and text, checkboxes their name and state) without a stop.
 */
import type { TextEditorRootAttributes } from '../../engine.js';

/**
 * Whether content stops are active after a root attribute record: a `tabindex` with a value makes
 * them active, a `tabindex` of `null` inactive, and a record without the key keeps `current`. The
 * key is matched without regard to case.
 */
export function contentStopsActive(
  attributes: TextEditorRootAttributes,
  current: boolean,
): boolean {
  let active = current;
  for (const [name, value] of Object.entries(attributes))
    if (name.toLowerCase() === 'tabindex') active = value !== null;
  return active;
}

/** Makes an element a sequential tab stop as it is by default, or takes it out with `-1`. */
export function writeContentTabStop(element: Element, tabStop: boolean): void {
  if (tabStop) {
    if (element.hasAttribute('tabindex')) element.removeAttribute('tabindex');
  } else if (element.getAttribute('tabindex') !== '-1') element.setAttribute('tabindex', '-1');
}

/** Sets a task checkbox's native `disabled`, only on a change. */
export function writeTaskCheckboxDisabled(input: HTMLInputElement, disabled: boolean): void {
  if (input.disabled !== disabled) input.disabled = disabled;
}
