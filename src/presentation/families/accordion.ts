import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { accordionCoreAppearance } from '../recipes/core/accordion.js';

const definition: ComponentDefinition = {
  name: 'Accordion',
  tagName: 'tp-accordion',
  kind: 'compound-reexport',
  axes: [
    {
      name: 'variant',
      values: ['plain', 'line', 'outline', 'separated'],
      default: 'plain',
    },
  ],
  parts: [
    {
      name: 'accordion',
      description: 'The root around the items.',
      axes: ['variant'],
    },
    {
      name: 'accordion-item',
      description: 'Each Accordion Item.',
      axes: ['variant'],
    },
    {
      name: 'accordion-heading',
      description: 'The heading around an item trigger.',
      axes: ['variant'],
    },
    {
      name: 'accordion-trigger',
      description: 'The native button that opens and closes an item.',
      axes: ['variant'],
    },
    {
      name: 'accordion-leading',
      description: 'The region before an item label: its `leading` slot or the chevron.',
      axes: ['variant'],
    },
    {
      name: 'accordion-label',
      description: 'The trigger text of an item.',
      axes: ['variant'],
    },
    {
      name: 'accordion-trailing',
      description: 'The region after an item label: its `trailing` slot or the chevron.',
      axes: ['variant'],
    },
    {
      name: 'accordion-content',
      description: 'The region of an item shown when open, whose block size animates.',
      axes: ['variant'],
    },
    {
      name: 'accordion-content-body',
      description:
        'The inner box of an item content; put padding here so it is measured with the content.',
      axes: ['variant'],
    },
  ],
};

export const accordionPresentation = definePresentation({
  definition,
  sources: [accordionCoreAppearance],
});
