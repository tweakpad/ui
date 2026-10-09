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
    },
    {
      name: 'preview-card-trigger',
    },
    {
      name: 'preview-card-content',
    },
    {
      name: 'preview-card-positioner',
    },
    {
      name: 'preview-card-portal',
    },
  ],
};

export const previewCardPresentation = definePresentation({
  definition,
  sources: [previewCardCoreAppearance],
});
