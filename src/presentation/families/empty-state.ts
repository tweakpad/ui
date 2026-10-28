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
      description: 'The section around everything, centered; it has no surface until you style it.',
    },
    {
      name: 'empty-state-header',
      description: 'The header holding the media, the title and the description.',
    },
    {
      name: 'empty-state-media',
      description: 'The wrapper of the `media` slot, sized by the media treatment.',
    },
    {
      name: 'empty-state-title',
      description: 'The heading.',
    },
    {
      name: 'empty-state-description',
      description: 'The description under the heading, in muted text.',
    },
    {
      name: 'empty-state-content',
      description: 'The region holding the default, `content` and `actions` slots.',
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
