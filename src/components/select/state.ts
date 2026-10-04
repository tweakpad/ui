import type { PartState } from '../../foundation/part.js';

/** Canonical markers describe the owning compound on each actual rendered part. */
export function selectStateMarkers(state: PartState): Record<string, unknown> {
  const markers: Record<string, unknown> = {};
  for (const [attribute, key] of Object.entries({
    'data-open': 'open',
    'data-searchable': 'searchable',
    'data-disabled': 'disabled',
    'data-readonly': 'readOnly',
    'data-required': 'required',
    'data-invalid': 'invalid',
    'data-valid': 'valid',
    'data-empty': 'empty',
    'data-filled': 'filled',
    'data-touched': 'touched',
    'data-dirty': 'dirty',
    'data-focused': 'focused',
    'data-selected': 'selected',
    'data-highlighted': 'highlighted',
    'data-loading': 'loading',
  })) {
    if (key in state) markers[attribute] = state[key] === true;
  }
  if (typeof state.open === 'boolean') markers['data-closed'] = !state.open;
  if (typeof state.selected === 'boolean') markers['data-unselected'] = !state.selected;
  return markers;
}
