import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { oneTimeCodeAppearance } from '../recipes/otp-field.js';

const definition: ComponentDefinition = {
  name: 'One-time code field',
  tagName: 'tp-otp-field',
  kind: 'compound-reexport',
  sourceNode: 'ucl17-one-time-code',
  axes: [],
  parts: [
    {
      name: 'one-time-code-field',
      publicName: 'Root',
      presentationKeys: ['one-time-code-field'],
      cardinality: 'exactly one public owner host per control instance',
    },
    {
      name: 'one-time-code-field-group',
      publicName: 'Group',
      presentationKeys: ['one-time-code-field-group'],
      cardinality: 'zero or more descendants of Root; cited behavior sets any stronger minimum',
    },
    {
      name: 'one-time-code-field-slot',
      publicName: 'Slot',
      presentationKeys: ['one-time-code-field-slot'],
      cardinality: 'zero or more descendants of Root; cited behavior sets any stronger minimum',
    },
    {
      name: 'one-time-code-field-separator',
      publicName: 'Separator',
      presentationKeys: ['one-time-code-field-separator'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
  ],
};

export const otpFieldPresentation = definePresentation({
  definition,
  bindings: {
    'tp-otp-field': {
      '.root': 'one-time-code-field',
      '.group': 'one-time-code-field-group',
      '.slot': 'one-time-code-field-slot',
    },
  },
  sources: [oneTimeCodeAppearance],
});
