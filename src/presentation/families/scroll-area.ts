import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { scrollAreaAppearance } from '../recipes/scroll-area.js';

const definition: ComponentDefinition = {
  name: 'Scroll area',
  tagName: 'tp-scroll-area',
  kind: 'compound-reexport',
  sourceNode: 'ucl21-scroll-area',
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
      publicName: 'Root',
      presentationKeys: [
        'scroll-area',
        'scroll-area-orientation-vertical',
        'scroll-area-orientation-horizontal',
      ],
      cardinality: 'exactly one public owner host per control instance',
    },
    {
      name: 'scroll-area-viewport',
      publicName: 'Viewport',
      presentationKeys: [
        'scroll-area-viewport',
        'scroll-area-viewport-orientation-vertical',
        'scroll-area-viewport-orientation-horizontal',
      ],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'scroll-area-content',
      publicName: 'Content',
      presentationKeys: [
        'scroll-area-content',
        'scroll-area-content-orientation-vertical',
        'scroll-area-content-orientation-horizontal',
      ],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'scroll-area-scrollbar',
      publicName: 'Scrollbar',
      presentationKeys: [
        'scroll-area-scrollbar',
        'scroll-area-scrollbar-orientation-vertical',
        'scroll-area-scrollbar-orientation-horizontal',
      ],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'scroll-area-thumb',
      publicName: 'Thumb',
      presentationKeys: [
        'scroll-area-thumb',
        'scroll-area-thumb-orientation-vertical',
        'scroll-area-thumb-orientation-horizontal',
      ],
      cardinality: 'zero or more descendants of Root; cited behavior sets any stronger minimum',
    },
    {
      name: 'scroll-area-corner',
      publicName: 'Corner',
      presentationKeys: [
        'scroll-area-corner',
        'scroll-area-corner-orientation-vertical',
        'scroll-area-corner-orientation-horizontal',
      ],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
  ],
};

export const scrollAreaPresentation = definePresentation({
  definition,
  sources: [scrollAreaAppearance],
});
