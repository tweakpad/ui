import { nothing } from 'lit';
import type { PartState } from './part.js';

/**
 * Shared state-marker vocabulary (docs/conventions.md, "State markers").
 *
 * A boolean marker is present only while its state is true; an enumeration marker carries
 * one declared value. Parts publish markers through `stateMarkers`, which maps a part state
 * to the canonical `data-*` names, and hosts that mirror a state object onto themselves use
 * `applyMarkers`. Both treat `false`, `null`, `undefined` and `nothing` as "absent".
 */

/** State keys whose canonical marker name is not their kebab-cased spelling. */
const CANONICAL_NAMES: Readonly<Record<string, string>> = Object.freeze({
  readOnly: 'readonly',
});

/** Boolean states that also publish their complement while false. */
const COMPLEMENTS: Readonly<Record<string, string>> = Object.freeze({
  checked: 'unchecked',
  open: 'closed',
  selected: 'unselected',
  pressed: 'unpressed',
});

/** The canonical `data-*` attribute for a state key (`readOnly` → `data-readonly`). */
export function markerName(key: string): string {
  const name =
    CANONICAL_NAMES[key] ?? key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
  return `data-${name}`;
}

/** `true` when a marker value publishes the attribute. */
export function markerPresent(value: unknown): boolean {
  return !(value === false || value === null || value === undefined || value === nothing);
}

/** The attribute value a present marker writes (`''` for a boolean marker). */
export function markerText(value: unknown): string {
  return value === true ? '' : String(value);
}

/**
 * Builds the `data-*` host properties of a rendered part from its state.
 *
 * Every listed key is emitted, as `true`/`false` for the boolean keys and as the raw state value
 * for `values`, so the part keeps ownership of each marker in `renderPart` (a consumer contract
 * cannot override a key the part declares). `bindPart` removes an attribute bound to `false`,
 * matching the convention that boolean markers are absent while false.
 *
 * Keys in the shared complement table (`checked`/`unchecked`, `open`/`closed`,
 * `selected`/`unselected`, `pressed`/`unpressed`) publish both markers when the state value is
 * a boolean. Spread a literal after the result to override a derived marker.
 */
export function stateMarkers<S extends PartState>(
  state: S,
  booleans: readonly (keyof S & string)[],
  values: readonly (keyof S & string)[] = [],
): Record<string, unknown> {
  const markers: Record<string, unknown> = {};
  for (const key of booleans) {
    const value = state[key];
    markers[markerName(key)] = value === true;
    const complement = COMPLEMENTS[key];
    if (complement && typeof value === 'boolean') markers[`data-${complement}`] = !value;
  }
  for (const key of values) markers[markerName(key)] = state[key];
  return markers;
}

/**
 * Writes a marker map onto an element imperatively. `previous` lists the names written last
 * time so a marker that disappeared from the map is removed; the returned set is the next
 * `previous`.
 */
export function applyMarkers(
  element: Element,
  markers: Readonly<Record<string, unknown>>,
  previous: Iterable<string> = [],
): Set<string> {
  const names = new Set(Object.keys(markers));
  for (const name of previous) if (!names.has(name)) element.removeAttribute(name);
  for (const [name, value] of Object.entries(markers)) {
    if (markerPresent(value)) element.setAttribute(name, markerText(value));
    else element.removeAttribute(name);
  }
  return names;
}
