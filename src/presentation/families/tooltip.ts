import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { tooltipCoreAppearance } from '../recipes/core/anchored.js';

const definition: ComponentDefinition = {
  name: 'Tooltip',
  tagName: 'tp-tooltip',
  kind: 'flattening-compound',
  sourceNode: 'ucl19-tooltip',
  nonVisualParts: ['Provider'],
  axes: [],
  parts: [
    {
      name: 'tooltip',
      publicName: 'Root',
      presentationKeys: ['tooltip'],
      cardinality: 'exactly one public owner host per control instance',
    },
    {
      name: 'tooltip-trigger',
      publicName: 'Trigger',
      presentationKeys: ['tooltip-trigger'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'tooltip-content',
      publicName: 'Content',
      presentationKeys: ['tooltip-content'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'tooltip-positioner',
      publicName: 'Positioner',
      presentationKeys: ['tooltip-positioner'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'tooltip-portal',
      publicName: 'Portal',
      presentationKeys: ['tooltip-portal'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'tooltip-arrow',
      publicName: 'Arrow',
      presentationKeys: ['tooltip-arrow'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
  ],
};

export const tooltipPresentation = definePresentation({
  definition,
  sources: [tooltipCoreAppearance],
});
