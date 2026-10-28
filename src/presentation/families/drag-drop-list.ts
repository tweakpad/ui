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
      slot: 'root',
    },
    {
      name: 'drag-drop-list-list',
      slot: 'list',
    },
    {
      name: 'drag-drop-list-item',
      slot: 'item',
    },
    {
      name: 'drag-drop-list-handle',
      slot: 'handle',
    },
    {
      name: 'drag-drop-list-placeholder',
      slot: 'placeholder',
    },
    {
      name: 'drag-drop-list-overlay',
      slot: 'overlay',
    },
    {
      name: 'drag-drop-list-empty',
      slot: 'empty',
    },
    {
      name: 'drag-drop-list-instructions',
      slot: 'instructions',
    },
    {
      name: 'drag-drop-list-announcements',
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
