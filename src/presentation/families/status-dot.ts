import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { statusDotAppearance } from '../recipes/status-dot.js';

const definition: ComponentDefinition = {
  name: 'Status dot',
  tagName: 'tp-status-dot',
  kind: 'presentational-primitive',
  axes: [
    {
      name: 'variant',
      values: ['default', 'secondary', 'success', 'warning', 'destructive'],
      default: 'default',
    },
  ],
  parts: [
    {
      name: 'status-dot',
      description: 'The host, around the dot and the label.',
      axes: ['variant'],
    },
    {
      name: 'status-dot-indicator',
      description: 'The dot, in the variant color.',
      axes: ['variant'],
    },
    {
      name: 'status-dot-label',
      description: 'The label beside the dot, while `show-label` is set.',
    },
    {
      name: 'status-dot-description',
      description: 'The Tooltip presenting the label while it is not shown.',
    },
  ],
};

export const statusDotPresentation = definePresentation({
  definition,
  bindings: {
    'tp-status-dot': {
      ':host': 'status-dot',
      '.indicator': 'status-dot-indicator',
      '.label': 'status-dot-label',
    },
  },
  sources: [statusDotAppearance],
});
