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
      axes: ['variant'],
    },
    {
      name: 'status-dot-indicator',
      axes: ['variant'],
    },
    {
      name: 'status-dot-label',
    },
    {
      name: 'status-dot-description',
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
