import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { descriptionListAppearance } from '../recipes/description-list.js';

const definition: ComponentDefinition = {
  name: 'Description list',
  tagName: 'tp-description-list',
  kind: 'preset-composition',
  axes: [
    {
      name: 'orientation',
      values: ['vertical', 'horizontal'],
      default: 'vertical',
    },
    {
      name: 'layout',
      values: ['inline', 'stacked'],
      default: 'inline',
    },
    {
      name: 'align',
      values: ['start', 'center'],
      default: 'start',
    },
  ],
  parts: [
    { name: 'description-list', axes: ['orientation', 'layout', 'align'] },
    { name: 'description-list-viewport' },
    { name: 'description-list-item' },
    { name: 'description-list-label' },
    { name: 'description-list-value' },
    { name: 'description-list-trigger' },
    { name: 'description-list-trigger-label' },
    { name: 'description-list-indicator' },
  ],
};

/** The list and its label–value pairs, and the Show more trigger, a composed link Button. */
export const descriptionListPresentation = definePresentation({
  definition,
  sources: [descriptionListAppearance],
});
