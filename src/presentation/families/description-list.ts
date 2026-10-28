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
    {
      name: 'description-list',
      description: 'The native description list.',
      axes: ['orientation', 'layout', 'align'],
    },
    {
      name: 'description-list-viewport',
      description: 'The region that clips the list to the visible items while it is closed.',
    },
    { name: 'description-list-item', description: 'One label and value pair.' },
    { name: 'description-list-label', description: 'A term, holding the label.' },
    { name: 'description-list-value', description: 'A description, holding the value.' },
    {
      name: 'description-list-trigger',
      description: 'The Show more Button that shows or hides the items beyond the limit.',
    },
    { name: 'description-list-trigger-label', description: 'The text of the Show more Button.' },
    { name: 'description-list-indicator', description: 'The chevron of the Show more Button.' },
  ],
};

/** The list and its label–value pairs, and the Show more trigger, a composed link Button. */
export const descriptionListPresentation = definePresentation({
  definition,
  sources: [descriptionListAppearance],
});
