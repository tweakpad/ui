import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { autocompleteAppearance, autocompleteParts } from '../recipes/autocomplete.js';

const publicNames: Record<keyof typeof autocompleteParts, [string, string]> = {
  autocomplete: ['Root', 'exactly one public owner host per control instance'],
  'autocomplete-input-group': ['InputGroup', 'exactly one in Root'],
  'autocomplete-input': ['Input', 'exactly one in InputGroup'],
  'autocomplete-trigger': ['Trigger', 'zero or one in InputGroup'],
  'autocomplete-clear': ['Clear', 'zero or one in InputGroup'],
  'autocomplete-content': ['Content', 'zero or one; mounted while open'],
  'autocomplete-list': ['List', 'exactly one in Content'],
  'autocomplete-group': ['Group', 'zero or more in List'],
  'autocomplete-group-label': ['GroupLabel', 'zero or one per Group'],
  'autocomplete-item': ['Item', 'zero or more in List or Group'],
  'autocomplete-match': ['Match', 'zero or more in Item'],
  'autocomplete-row': ['Row', 'zero or more in List (grid)'],
  'autocomplete-separator': ['Separator', 'zero or more in List'],
  'autocomplete-empty-state': ['Empty state', 'zero or one in List'],
  'autocomplete-status': ['Status', 'zero or one in List; while a source loads or after it fails'],
};

const definition: ComponentDefinition = {
  name: 'Autocomplete',
  tagName: 'tp-autocomplete',
  kind: 'flattening-compound',
  sourceNode: 'ucl18-autocomplete',
  axes: [],
  parts: Object.entries(publicNames).map(([name, [publicName, cardinality]]) => ({
    name,
    publicName,
    presentationKeys: [name],
    cardinality,
  })),
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
