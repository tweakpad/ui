import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { timelineAppearance } from '../recipes/timeline.js';

const definition: ComponentDefinition = {
  name: 'Timeline',
  tagName: 'tp-timeline',
  kind: 'compound-reexport',
  axes: [
    { name: 'orientation', values: ['vertical', 'horizontal', 'responsive'], default: 'vertical' },
    { name: 'align', values: ['start', 'end', 'alternate', 'alternate-reverse'], default: 'end' },
  ],
  parts: [
    {
      name: 'timeline',
      axes: ['orientation', 'align'],
    },
    {
      name: 'timeline-item',
      axes: ['orientation', 'align'],
    },
    {
      name: 'timeline-item-marker',
      axes: ['orientation', 'align'],
    },
    {
      name: 'timeline-item-dot',
      axes: ['orientation', 'align'],
    },
    {
      name: 'timeline-item-connector-before',
      axes: ['orientation', 'align'],
    },
    {
      name: 'timeline-item-connector-after',
      axes: ['orientation', 'align'],
    },
    {
      name: 'timeline-item-connector-fill',
      axes: ['orientation', 'align'],
    },
    {
      name: 'timeline-item-content',
      axes: ['orientation', 'align'],
    },
    {
      name: 'timeline-item-opposite',
      axes: ['orientation', 'align'],
    },
  ],
};

/** Timeline paints no surface; the Dot and Fill carry status (CL Timeline `tll-presentation`). */
export const timelinePresentation = definePresentation({
  definition,
  sources: [timelineAppearance],
});
