import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { dragDropListAppearance } from '../recipes/drag-drop-list.js';

const definition: ComponentDefinition = {
  name: 'Drag Drop List',
  tagName: 'tp-drag-drop-list',
  kind: 'preset-composition',
  axes: [
    { name: 'variant', values: ['ghost', 'outline', 'subdued'], default: 'ghost' },
    { name: 'size', values: ['xs', 'sm', 'default'], default: 'default' },
    { name: 'orientation', values: ['vertical', 'horizontal'], default: 'vertical' },
  ],
  parts: [
    {
      name: 'drag-drop-list-root',
      description: 'The host.',
      slot: 'root',
    },
    {
      name: 'drag-drop-list-list',
      description: 'The native ordered list.',
      slot: 'list',
    },
    {
      name: 'drag-drop-list-item',
      description: 'The list element around each row; marked while dragging, dropping or targeted.',
      slot: 'item',
    },
    {
      name: 'drag-drop-list-handle',
      description: 'The grip Button that picks a row up.',
      slot: 'handle',
    },
    {
      name: 'drag-drop-list-placeholder',
      description: 'The stand-in that keeps the dragged row in place.',
      slot: 'placeholder',
    },
    {
      name: 'drag-drop-list-overlay',
      description: 'The custom overlay that follows the pointer.',
      slot: 'overlay',
    },
    {
      name: 'drag-drop-list-empty',
      description: 'The row shown while the list has no items.',
      slot: 'empty',
    },
    {
      name: 'drag-drop-list-instructions',
      description: 'The hidden keyboard instructions read with each handle.',
      slot: 'instructions',
    },
    {
      name: 'drag-drop-list-announcements',
      description: 'The polite live region announcing drag operations.',
      slot: 'announcements',
    },
  ],
};

export const dragDropListPresentation = definePresentation({
  definition,
  bindings: {
    'tp-drag-drop-list': {
      ':host': 'drag-drop-list-root',
      '.list': 'drag-drop-list-list',
      '.item': 'drag-drop-list-item',
      '.handle': 'drag-drop-list-handle',
      '.empty': 'drag-drop-list-empty',
    },
  },
  sources: [dragDropListAppearance],
});
