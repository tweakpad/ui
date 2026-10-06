import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { toastCoreAppearance } from '../recipes/core/surfaces.js';
import { toastAppearance } from '../recipes/toast.js';

const definition: ComponentDefinition = {
  name: 'Toast',
  tagName: 'tp-toast',
  kind: 'compound-reexport',
  sourceNode: 'ucl21-toast',
  axes: [],
  nonVisualParts: ['Manager', 'Provider'],
  parts: [
    {
      name: 'toast',
      publicName: 'Portal',
      presentationKeys: ['toast'],
      cardinality: 'exactly one public owner host per control instance',
    },
    {
      name: 'toast-viewport',
      publicName: 'Viewport',
      presentationKeys: ['toast-viewport'],
      cardinality:
        'zero or one descendant of Portal; cited behavior sets any required-presence condition',
    },
    {
      name: 'toast-toast',
      publicName: 'Toast',
      presentationKeys: ['toast-toast'],
      cardinality: 'zero or more descendants of Portal; cited behavior sets any stronger minimum',
    },
    {
      name: 'toast-content',
      publicName: 'Content',
      presentationKeys: ['toast-content'],
      cardinality:
        'zero or one descendant of Portal; cited behavior sets any required-presence condition',
    },
    {
      name: 'toast-title',
      publicName: 'Title',
      presentationKeys: ['toast-title'],
      cardinality:
        'zero or one descendant of Portal; cited behavior sets any required-presence condition',
    },
    {
      name: 'toast-description',
      publicName: 'Description',
      presentationKeys: ['toast-description'],
      cardinality:
        'zero or one descendant of Portal; cited behavior sets any required-presence condition',
    },
    {
      name: 'toast-action',
      publicName: 'Action',
      presentationKeys: ['toast-action'],
      cardinality: 'zero or more descendants of Portal; cited behavior sets any stronger minimum',
    },
    {
      name: 'toast-close',
      publicName: 'Close',
      presentationKeys: ['toast-close'],
      cardinality:
        'zero or one descendant of Portal; cited behavior sets any required-presence condition',
    },
    {
      name: 'toast-icon',
      publicName: 'Icon',
      presentationKeys: ['toast-icon'],
      cardinality:
        'zero or one descendant of Portal; cited behavior sets any required-presence condition',
    },
  ],
};

export const toastPresentation = definePresentation({
  definition,
  bindings: {
    'tp-toast': {
      '.toast': 'toast-toast',
      '.content': 'toast-content',
      '[part="close focusable"]': 'toast-close',
    },
  },
  sources: [toastCoreAppearance, toastAppearance],
});
