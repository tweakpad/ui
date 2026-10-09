import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { alertAppearance } from '../recipes/alert.js';

const definition: ComponentDefinition = {
  name: 'Alert',
  tagName: 'tp-alert',
  kind: 'presentational-primitive',
  axes: [],
  parts: [
    {
      name: 'alert',
    },
    {
      name: 'alert-title',
    },
    {
      name: 'alert-description',
    },
    {
      name: 'alert-action',
    },
    {
      name: 'alert-mark',
    },
  ],
};

export const alertPresentation = definePresentation({
  definition,
  bindings: {
    'tp-alert': {
      '.alert': 'alert',
      '.title': 'alert-title',
    },
  },
  sources: [alertAppearance],
});
