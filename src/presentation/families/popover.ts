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
      description: 'The host around the trigger and the popup.',
    },
    {
      name: 'popover-trigger',
      description: 'The element in the `trigger` slot.',
    },
    {
      name: 'popover-anchor',
      description: 'The element in the `anchor` slot.',
    },
    {
      name: 'popover-content',
      description: 'The popup surface.',
    },
    {
      name: 'popover-header',
      description: 'The header that holds the title and the description.',
    },
    {
      name: 'popover-title',
      description: 'The heading that names the popup.',
    },
    {
      name: 'popover-description',
      description: 'The text that describes the popup.',
    },
    {
      name: 'popover-positioner',
      description: 'The layer that places the popup against its anchor.',
    },
    {
      name: 'popover-portal',
      description: 'The container the popup renders into when portaled.',
    },
  ],
};

export const popoverPresentation = definePresentation({
  definition,
  sources: [popoverAppearance],
});
