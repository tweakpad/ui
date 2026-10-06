import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { accordionCoreAppearance } from '../recipes/core/accordion.js';

const definition: ComponentDefinition = {
  name: 'Accordion',
  tagName: 'tp-accordion',
  kind: 'compound-reexport',
  sourceNode: 'ucl16-accordion',
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
      publicName: 'Root',
      presentationKeys: [
        'accordion',
        'accordion-variant-plain',
        'accordion-variant-line',
        'accordion-variant-outline',
        'accordion-variant-separated',
      ],
      cardinality: 'exactly one public owner host per control instance',
    },
    {
      name: 'accordion-item',
      publicName: 'Item',
      presentationKeys: [
        'accordion-item',
        'accordion-item-variant-plain',
        'accordion-item-variant-line',
        'accordion-item-variant-outline',
        'accordion-item-variant-separated',
      ],
      cardinality: 'zero or more descendants of Root; cited behavior sets any stronger minimum',
    },
    {
      name: 'accordion-heading',
      publicName: 'Heading',
      presentationKeys: [
        'accordion-heading',
        'accordion-heading-variant-plain',
        'accordion-heading-variant-line',
        'accordion-heading-variant-outline',
        'accordion-heading-variant-separated',
      ],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'accordion-trigger',
      publicName: 'Trigger',
      presentationKeys: [
        'accordion-trigger',
        'accordion-trigger-variant-plain',
        'accordion-trigger-variant-line',
        'accordion-trigger-variant-outline',
        'accordion-trigger-variant-separated',
      ],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'accordion-leading',
      publicName: 'Leading',
      presentationKeys: [
        'accordion-leading',
        'accordion-leading-variant-plain',
        'accordion-leading-variant-line',
        'accordion-leading-variant-outline',
        'accordion-leading-variant-separated',
      ],
      cardinality:
        'exactly one descendant of Trigger; accepts zero or more nodes from the leading slot',
    },
    {
      name: 'accordion-label',
      publicName: 'Label',
      presentationKeys: [
        'accordion-label',
        'accordion-label-variant-plain',
        'accordion-label-variant-line',
        'accordion-label-variant-outline',
        'accordion-label-variant-separated',
      ],
      cardinality: 'exactly one descendant of Trigger; receives the label slot',
    },
    {
      name: 'accordion-trailing',
      publicName: 'Trailing',
      presentationKeys: [
        'accordion-trailing',
        'accordion-trailing-variant-plain',
        'accordion-trailing-variant-line',
        'accordion-trailing-variant-outline',
        'accordion-trailing-variant-separated',
      ],
      cardinality:
        'exactly one descendant of Trigger; accepts zero or more nodes from the trailing slot',
    },
    {
      name: 'accordion-content',
      publicName: 'Content',
      presentationKeys: [
        'accordion-content',
        'accordion-content-variant-plain',
        'accordion-content-variant-line',
        'accordion-content-variant-outline',
        'accordion-content-variant-separated',
      ],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'accordion-content-body',
      publicName: 'ContentBody',
      presentationKeys: [
        'accordion-content-body',
        'accordion-content-body-variant-plain',
        'accordion-content-body-variant-line',
        'accordion-content-body-variant-outline',
        'accordion-content-body-variant-separated',
      ],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
  ],
};

export const accordionPresentation = definePresentation({
  definition,
  sources: [accordionCoreAppearance],
  complete: true,
});
