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
      description: 'The host around the trigger and the tooltip.',
    },
    {
      name: 'tooltip-trigger',
      description: 'The element in the `trigger` slot.',
    },
    {
      name: 'tooltip-content',
      description: 'The tooltip surface.',
    },
    {
      name: 'tooltip-positioner',
      description: 'The layer that places the tooltip against its trigger.',
    },
    {
      name: 'tooltip-portal',
      description: 'The container the tooltip renders into when portaled.',
    },
    {
      name: 'tooltip-arrow',
      description: 'The arrow that points at the trigger.',
    },
  ],
};

export const tooltipPresentation = definePresentation({
  definition,
  sources: [tooltipCoreAppearance],
});
