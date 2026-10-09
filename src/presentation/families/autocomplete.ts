import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { autocompleteAppearance, autocompleteParts } from '../recipes/autocomplete.js';

const definition: ComponentDefinition = {
  name: 'Autocomplete',
  tagName: 'tp-autocomplete',
  kind: 'flattening-compound',
  axes: [],
  parts: Object.keys(autocompleteParts).map((name) => ({ name })),
};

export const autocompletePresentation = definePresentation({
  definition,
  bindings: {
    'tp-autocomplete': Object.fromEntries(
      Object.keys(autocompleteParts).map((part) => [`[part~="${part}"]`, part]),
    ),
  },
  sources: [autocompleteAppearance],
});
