import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { popoverAppearance } from '../recipes/popover.js';

const definition: ComponentDefinition = {
  name: 'Popover',
  tagName: 'tp-popover',
  kind: 'flattening-compound',
  axes: [],
  parts: [
    {
      name: 'popover',
    },
    {
      name: 'popover-trigger',
    },
    {
      name: 'popover-anchor',
    },
    {
      name: 'popover-content',
    },
    {
      name: 'popover-header',
    },
    {
      name: 'popover-title',
    },
    {
      name: 'popover-description',
    },
    {
      name: 'popover-positioner',
    },
    {
      name: 'popover-portal',
    },
  ],
};

export const popoverPresentation = definePresentation({
  definition,
  sources: [popoverAppearance],
});
