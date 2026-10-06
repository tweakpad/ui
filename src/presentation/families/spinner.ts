import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { spinnerAppearance } from '../recipes/spinner.js';

const definition: ComponentDefinition = {
  name: 'Spinner',
  tagName: 'tp-spinner',
  kind: 'presentational-primitive',
  sourceNode: 'ucl21-spinner',
  axes: [
    {
      name: 'size',
      values: ['default', 'sm', 'lg'],
      default: 'default',
    },
  ],
  parts: [
    {
      name: 'spinner',
      publicName: 'Indicator',
      presentationKeys: ['spinner', 'spinner-size-default', 'spinner-size-sm', 'spinner-size-lg'],
      cardinality: 'exactly one public owner host per control instance',
    },
    {
      name: 'spinner-accessible-label',
      publicName: 'Accessible label',
      presentationKeys: [
        'spinner-accessible-label',
        'spinner-accessible-label-size-default',
        'spinner-accessible-label-size-sm',
        'spinner-accessible-label-size-lg',
      ],
      cardinality:
        'zero or one descendant of Indicator; cited behavior sets any required-presence condition',
    },
  ],
};

export const spinnerPresentation = definePresentation({
  definition,
  bindings: {
    'tp-spinner': {
      ':host': 'spinner',
      '.visually-hidden': 'spinner-accessible-label',
    },
  },
  sources: [spinnerAppearance],
});
