import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { radioGroupAppearance } from '../recipes/radio-group.js';

const definition: ComponentDefinition = {
  name: 'Radio group',
  tagName: 'tp-radio-group',
  kind: 'compound-reexport',
  sourceNode: 'ucl16-radio-group',
  axes: [
    {
      name: 'orientation',
      values: ['horizontal', 'vertical'],
      default: 'vertical',
    },
  ],
  parts: [
    {
      name: 'radio-group',
      publicName: 'Group',
      presentationKeys: [
        'radio-group',
        'radio-group-orientation-horizontal',
        'radio-group-orientation-vertical',
      ],
      cardinality: 'exactly one public owner host per control instance',
    },
    {
      name: 'radio-group-item',
      publicName: 'Item',
      presentationKeys: [
        'radio-group-item',
        'radio-group-item-orientation-horizontal',
        'radio-group-item-orientation-vertical',
      ],
      cardinality: 'zero or more descendants of Group; cited behavior sets any stronger minimum',
    },
    {
      name: 'radio-group-indicator',
      publicName: 'Indicator',
      presentationKeys: [
        'radio-group-indicator',
        'radio-group-indicator-orientation-horizontal',
        'radio-group-indicator-orientation-vertical',
      ],
      cardinality:
        'zero or one descendant of Group; cited behavior sets any required-presence condition',
    },
  ],
};

export const radioGroupPresentation = definePresentation({
  definition,
  sources: [radioGroupAppearance],
});
