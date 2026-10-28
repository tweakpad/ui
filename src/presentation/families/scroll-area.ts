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
      description: 'The root that positions the tracks over the viewport.',
      axes: ['orientation'],
    },
    {
      name: 'scroll-area-viewport',
      description: 'The native, focusable scrolling element.',
      axes: ['orientation'],
    },
    {
      name: 'scroll-area-content',
      description: 'The wrapper of the slotted content inside the viewport.',
      axes: ['orientation'],
    },
    {
      name: 'scroll-area-scrollbar',
      description: 'A track; its state names its orientation, so both tracks share one part.',
      axes: ['orientation'],
    },
    {
      name: 'scroll-area-thumb',
      description: 'The draggable thumb inside a track, sized to the visible share of the content.',
      axes: ['orientation'],
    },
    {
      name: 'scroll-area-corner',
      description: 'The square where a horizontal and a vertical track meet.',
      axes: ['orientation'],
    },
  ],
};

export const scrollAreaPresentation = definePresentation({
  definition,
  sources: [scrollAreaAppearance],
});
