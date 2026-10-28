import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { overflowListAppearance } from '../recipes/overflow-list.js';

const definition: ComponentDefinition = {
  name: 'Overflow list',
  tagName: 'tp-overflow-list',
  kind: 'presentational-primitive',
  axes: [],
  parts: [
    {
      name: 'overflow-list',
    },
    {
      name: 'overflow-list-count',
    },
  ],
};

export const overflowListPresentation = definePresentation({
  definition,
  bindings: {
    'tp-overflow-list': {
      '.list': 'overflow-list',
      '.count-badge': 'overflow-list-count',
    },
  },
  sources: [overflowListAppearance],
});
