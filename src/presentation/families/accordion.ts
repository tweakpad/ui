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
      axes: ['variant'],
    },
    {
      name: 'accordion-item',
      axes: ['variant'],
    },
    {
      name: 'accordion-heading',
      axes: ['variant'],
    },
    {
      name: 'accordion-trigger',
      axes: ['variant'],
    },
    {
      name: 'accordion-leading',
      axes: ['variant'],
    },
    {
      name: 'accordion-label',
      axes: ['variant'],
    },
    {
      name: 'accordion-trailing',
      axes: ['variant'],
    },
    {
      name: 'accordion-content',
      axes: ['variant'],
    },
    {
      name: 'accordion-content-body',
      axes: ['variant'],
    },
  ],
};

export const accordionPresentation = definePresentation({
  definition,
  sources: [accordionCoreAppearance],
});
