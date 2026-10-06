import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { toggleGroupAppearance } from '../recipes/toggle-group.js';

const definition: ComponentDefinition = {
  name: 'Toggle group',
  tagName: 'tp-toggle-group',
  kind: 'compound-reexport',
  sourceNode: 'ucl16-toggle-group',
  axes: [
    {
      name: 'orientation',
      values: ['horizontal', 'vertical'],
      default: 'horizontal',
    },
    {
      name: 'variant',
      values: ['ghost', 'outline'],
      default: 'ghost',
    },
    {
      name: 'size',
      values: ['sm', 'default', 'lg'],
      default: 'default',
    },
  ],
  parts: [
    {
      name: 'toggle-group',
      publicName: 'Group',
      presentationKeys: [
        'toggle-group',
        'toggle-group-orientation-horizontal',
        'toggle-group-orientation-vertical',
        'toggle-group-variant-ghost',
        'toggle-group-variant-outline',
        'toggle-group-size-sm',
        'toggle-group-size-default',
        'toggle-group-size-lg',
      ],
      cardinality: 'exactly one public owner host per control instance',
    },
    {
      name: 'toggle-group-item',
      publicName: 'Item',
      presentationKeys: [
        'toggle-group-item',
        'toggle-group-item-orientation-horizontal',
        'toggle-group-item-orientation-vertical',
        'toggle-group-item-variant-ghost',
        'toggle-group-item-variant-outline',
        'toggle-group-item-size-sm',
        'toggle-group-item-size-default',
        'toggle-group-item-size-lg',
      ],
      cardinality: 'zero or more descendants of Group; cited behavior sets any stronger minimum',
    },
  ],
};

export const toggleGroupPresentation = definePresentation({
  definition,
  sources: [toggleGroupAppearance],
});
