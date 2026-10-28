import type { PartState } from '../../foundation/part.js';
import { stateMarkers } from '../../foundation/state-markers.js';

const SELECT_MARKERS = [
  'open',
  'searchable',
  'disabled',
  'readOnly',
  'required',
  'invalid',
  'valid',
  'empty',
  'filled',
  'touched',
  'dirty',
  'focused',
  'selected',
  'highlighted',
  'loading',
] as const;

/**
 * Canonical markers describe the owning compound on each actual rendered part. Only the
 * states a part's state object carries are published, so a native part keeps its own keys.
 */
export function selectStateMarkers(state: PartState): Record<string, unknown> {
  return stateMarkers(
    state,
    SELECT_MARKERS.filter((key) => key in state),
  );
}
