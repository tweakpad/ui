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
      description: 'The landmark that holds the stack.',
    },
    {
      name: 'toast-viewport',
      description: 'The fixed layer that places the stack at its position.',
    },
    {
      name: 'toast-toast',
      description: 'Each notification.',
    },
    {
      name: 'toast-content',
      description: 'The text of a notification: its title and description.',
    },
    {
      name: 'toast-title',
      description: 'The title of a notification.',
    },
    {
      name: 'toast-description',
      description: 'The description of a notification.',
    },
    {
      name: 'toast-action',
      description: 'The action Button of a notification.',
    },
    {
      name: 'toast-close',
      description: 'The Close button of a notification.',
    },
    {
      name: 'toast-icon',
      description: 'The icon of a notification type, or its Spinner while loading.',
    },
    {
      name: 'positioner',
      description: 'The layer that places a notification in the stack, or against its anchor.',
    },
    {
      name: 'arrow',
      description: 'The arrow of a notification anchored to a control, with `showArrow`.',
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
