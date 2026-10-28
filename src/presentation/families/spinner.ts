import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { spinnerAppearance } from '../recipes/spinner.js';

const definition: ComponentDefinition = {
  name: 'Spinner',
  tagName: 'tp-spinner',
  kind: 'presentational-primitive',
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
      axes: ['size'],
    },
    {
      name: 'spinner-accessible-label',
      axes: ['size'],
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
