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
      description: 'The element with the group role that holds the Toggles.',
      axes: ['orientation', 'variant', 'size'],
    },
    {
      name: 'toggle-group-item',
      description: 'Each Toggle in the group, joined at its seams when the spacing is zero.',
      axes: ['orientation', 'variant', 'size'],
    },
  ],
};

export const toggleGroupPresentation = definePresentation({
  definition,
  sources: [toggleGroupAppearance],
});
