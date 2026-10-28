import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { emptyStateAppearance } from '../recipes/empty-state.js';

const definition: ComponentDefinition = {
  name: 'Empty state',
  tagName: 'tp-empty-state',
  kind: 'presentational-primitive',
  axes: [],
  parts: [
    {
      name: 'empty-state',
    },
    {
      name: 'empty-state-header',
    },
    {
      name: 'empty-state-media',
    },
    {
      name: 'empty-state-title',
    },
    {
      name: 'empty-state-description',
    },
    {
      name: 'empty-state-content',
    },
  ],
};

export const emptyStatePresentation = definePresentation({
  definition,
  bindings: {
    'tp-empty-state': {
      '.root': 'empty-state',
      '.description': 'empty-state-description',
    },
  },
  sources: [emptyStateAppearance],
});
