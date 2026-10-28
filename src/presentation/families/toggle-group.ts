import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { buttonSizes } from '../recipes/core/button.js';
import { toggleGroupAppearance } from '../recipes/toggle-group.js';

const definition: ComponentDefinition = {
  name: 'Toggle group',
  tagName: 'tp-toggle-group',
  kind: 'compound-reexport',
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
      values: buttonSizes,
      default: 'default',
    },
  ],
  parts: [
    {
      name: 'toggle-group',
      axes: ['orientation', 'variant', 'size'],
    },
    {
      name: 'toggle-group-item',
      axes: ['orientation', 'variant', 'size'],
    },
  ],
};

export const toggleGroupPresentation = definePresentation({
  definition,
  sources: [toggleGroupAppearance],
});
