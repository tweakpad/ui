import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { scrollAreaAppearance } from '../recipes/scroll-area.js';

const definition: ComponentDefinition = {
  name: 'Scroll area',
  tagName: 'tp-scroll-area',
  kind: 'compound-reexport',
  axes: [
    {
      name: 'orientation',
      values: ['vertical', 'horizontal'],
      default: 'vertical',
    },
  ],
  parts: [
    {
      name: 'scroll-area',
      axes: ['orientation'],
    },
    {
      name: 'scroll-area-viewport',
      axes: ['orientation'],
    },
    {
      name: 'scroll-area-content',
      axes: ['orientation'],
    },
    {
      name: 'scroll-area-scrollbar',
      axes: ['orientation'],
    },
    {
      name: 'scroll-area-thumb',
      axes: ['orientation'],
    },
    {
      name: 'scroll-area-corner',
      axes: ['orientation'],
    },
  ],
};

export const scrollAreaPresentation = definePresentation({
  definition,
  sources: [scrollAreaAppearance],
});
