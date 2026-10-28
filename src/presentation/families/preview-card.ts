import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { previewCardCoreAppearance } from '../recipes/core/anchored.js';

const definition: ComponentDefinition = {
  name: 'Preview card',
  tagName: 'tp-preview-card',
  kind: 'flattening-compound',
  axes: [],
  parts: [
    {
      name: 'preview-card',
      description: 'The host around the trigger and the card.',
    },
    {
      name: 'preview-card-trigger',
      description: 'The element in the `trigger` slot.',
    },
    {
      name: 'preview-card-content',
      description: 'The card surface.',
    },
    {
      name: 'preview-card-positioner',
      description: 'The layer that places the card against its trigger.',
    },
    {
      name: 'preview-card-portal',
      description: 'The container the card renders into when portaled.',
    },
  ],
};

export const previewCardPresentation = definePresentation({
  definition,
  sources: [previewCardCoreAppearance],
});
