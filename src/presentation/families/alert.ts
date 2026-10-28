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
      description: 'The message surface, colored by the severity.',
    },
    {
      name: 'alert-title',
      description: 'The title row, from the `title` slot or the `title` text.',
    },
    {
      name: 'alert-description',
      description: 'The wrapper of the description in the default slot.',
    },
    {
      name: 'alert-action',
      description: 'The wrapper of the `actions` slot, at the end of the message.',
    },
    {
      name: 'alert-mark',
      description: 'The wrapper of the `icon` slot, before the text.',
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
