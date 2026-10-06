import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { alertAppearance } from '../recipes/alert.js';

const definition: ComponentDefinition = {
  name: 'Alert',
  tagName: 'tp-alert',
  kind: 'presentational-primitive',
  sourceNode: 'ucl22-alert',
  axes: [],
  parts: [
    {
      name: 'alert',
      publicName: 'Root',
      presentationKeys: ['alert'],
      cardinality: 'exactly one public owner host per control instance',
    },
    {
      name: 'alert-title',
      publicName: 'Title',
      presentationKeys: ['alert-title'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'alert-description',
      publicName: 'Description',
      presentationKeys: ['alert-description'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'alert-action',
      publicName: 'Action',
      presentationKeys: ['alert-action'],
      cardinality: 'zero or more descendants of Root; cited behavior sets any stronger minimum',
    },
    {
      name: 'alert-mark',
      publicName: 'Mark',
      presentationKeys: ['alert-mark'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
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
