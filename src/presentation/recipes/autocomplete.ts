import type { PresentationDictionary } from '../resolver.js';
import { selectCoreAppearance } from './core/surfaces.js';
import { selectAppearance } from './select.js';

/** Autocomplete part → the searchable Select part it presents as. */
export const autocompleteParts = {
  autocomplete: 'select',
  'autocomplete-input-group': 'select-anchor',
  'autocomplete-input': 'select-input',
  'autocomplete-trigger': 'select-trigger',
  'autocomplete-clear': 'select-clear',
  'autocomplete-content': 'select-content',
  'autocomplete-list': 'select-list',
  'autocomplete-group': 'select-group',
  'autocomplete-group-label': 'select-label',
  'autocomplete-item': 'select-option',
  'autocomplete-match': 'select-match',
  'autocomplete-row': 'select-row',
  'autocomplete-separator': 'select-separator',
  'autocomplete-empty-state': 'select-empty-state',
  'autocomplete-status': 'select-status',
} as const;

/** Each Autocomplete part reuses the searchable Select recipe, without the item indicator. */
export const autocompleteAppearance: PresentationDictionary = Object.fromEntries(
  Object.entries(autocompleteParts).map(([part, select]) => [
    part,
    [...(selectCoreAppearance[select] ?? []), ...(selectAppearance[select] ?? [])],
  ]),
);
