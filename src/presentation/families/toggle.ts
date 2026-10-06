import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { toggleAppearance } from '../recipes/toggle.js';
import { toggleCoreAppearance } from '../recipes/core/toggle.js';

const definition: ComponentDefinition = {
  name: 'Toggle',
  tagName: 'tp-toggle',
  kind: 'compound-reexport',
  sourceNode: 'ucl16-toggle',
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
      publicName: 'Control',
      presentationKeys: [
        'toggle',
        'toggle-variant-ghost',
        'toggle-variant-outline',
        'toggle-size-sm',
        'toggle-size-default',
        'toggle-size-lg',
      ],
      cardinality: 'exactly one public owner host per control instance',
    },
    {
      name: 'toggle-content',
      publicName: 'Content',
      presentationKeys: [
        'toggle-content',
        'toggle-content-variant-ghost',
        'toggle-content-variant-outline',
        'toggle-content-size-sm',
        'toggle-content-size-default',
        'toggle-content-size-lg',
      ],
      cardinality:
        'zero or one descendant of Control; cited behavior sets any required-presence condition',
    },
  ],
};

export const togglePresentation = definePresentation({
  definition,
  sources: [toggleAppearance, toggleCoreAppearance],
});
