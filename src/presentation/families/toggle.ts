import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { toggleAppearance } from '../recipes/toggle.js';
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
      values: ['sm', 'default', 'lg'],
      default: 'default',
    },
  ],
  parts: [
    {
      name: 'toggle',
      axes: ['variant', 'size'],
    },
    {
      name: 'toggle-content',
      axes: ['variant', 'size'],
    },
  ],
};

export const togglePresentation = definePresentation({
  definition,
  sources: [toggleAppearance, toggleCoreAppearance],
});
