import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { tooltipCoreAppearance } from '../recipes/core/anchored.js';

const definition: ComponentDefinition = {
  name: 'Tooltip',
  tagName: 'tp-tooltip',
  kind: 'flattening-compound',
  axes: [],
  parts: [
    {
      name: 'tooltip',
    },
    {
      name: 'tooltip-trigger',
    },
    {
      name: 'tooltip-content',
    },
    {
      name: 'tooltip-positioner',
    },
    {
      name: 'tooltip-portal',
    },
    {
      name: 'tooltip-arrow',
    },
  ],
};

export const tooltipPresentation = definePresentation({
  definition,
  sources: [tooltipCoreAppearance],
});
