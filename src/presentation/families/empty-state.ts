import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { emptyStateAppearance } from '../recipes/empty-state.js';

const definition: ComponentDefinition = {
  name: 'Empty state',
  tagName: 'tp-empty-state',
  kind: 'presentational-primitive',
  sourceNode: 'ucl22-empty-state',
  axes: [],
  parts: [
    {
      name: 'empty-state',
      publicName: 'Root',
      presentationKeys: ['empty-state'],
      cardinality: 'exactly one public owner host per control instance',
    },
    {
      name: 'empty-state-header',
      publicName: 'Header',
      presentationKeys: ['empty-state-header'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'empty-state-media',
      publicName: 'Media',
      presentationKeys: ['empty-state-media'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'empty-state-title',
      publicName: 'Title',
      presentationKeys: ['empty-state-title'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'empty-state-description',
      publicName: 'Description',
      presentationKeys: ['empty-state-description'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'empty-state-content',
      publicName: 'Content',
      presentationKeys: ['empty-state-content'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
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
