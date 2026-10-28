import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { toastCoreAppearance } from '../recipes/core/surfaces.js';
import { toastAppearance } from '../recipes/toast.js';

const definition: ComponentDefinition = {
  name: 'Toast',
  tagName: 'tp-toast',
  kind: 'compound-reexport',
  axes: [],
  parts: [
    {
      name: 'toast',
    },
    {
      name: 'toast-viewport',
    },
    {
      name: 'toast-toast',
    },
    {
      name: 'toast-content',
    },
    {
      name: 'toast-title',
    },
    {
      name: 'toast-description',
    },
    {
      name: 'toast-action',
    },
    {
      name: 'toast-close',
    },
    {
      name: 'toast-icon',
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
