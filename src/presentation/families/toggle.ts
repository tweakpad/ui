import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { toggleAppearance } from '../recipes/toggle.js';
import { buttonSizes } from '../recipes/core/button.js';
import { toggleCoreAppearance } from '../recipes/core/toggle.js';

const definition: ComponentDefinition = {
  name: 'Toggle',
  tagName: 'tp-toggle',
  kind: 'compound-reexport',
  axes: [
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
      name: 'toggle',
      description: 'The native button that carries the pressed state.',
      axes: ['variant', 'size'],
    },
    {
      name: 'toggle-content',
      description:
        'The label inside the button; its part contract can render content from the pressed state.',
      axes: ['variant', 'size'],
    },
  ],
};

export const togglePresentation = definePresentation({
  definition,
  sources: [toggleAppearance, toggleCoreAppearance],
});
