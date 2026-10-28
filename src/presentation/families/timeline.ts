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
      description: 'The root grid whose tracks every item shares.',
      axes: ['orientation', 'align'],
    },
    {
      name: 'timeline-item',
      description: 'An item: one row of a vertical timeline or one column of a horizontal one.',
      axes: ['orientation', 'align'],
    },
    {
      name: 'timeline-item-marker',
      description: 'The box on the axis around the dot or the `marker` slot.',
      axes: ['orientation', 'align'],
    },
    {
      name: 'timeline-item-dot',
      description: 'The default marker, drawn for the item status.',
      axes: ['orientation', 'align'],
    },
    {
      name: 'timeline-item-connector-before',
      description: 'The line from the previous item to the marker; hidden on the first item.',
      axes: ['orientation', 'align'],
    },
    {
      name: 'timeline-item-connector-after',
      description: 'The line from the marker to the next item; hidden on the last item.',
      axes: ['orientation', 'align'],
    },
    {
      name: 'timeline-item-connector-fill',
      description: 'The fill drawn over a connector when the earlier item is complete.',
      axes: ['orientation', 'align'],
    },
    {
      name: 'timeline-item-content',
      description: 'The content region around the default slot.',
      axes: ['orientation', 'align'],
    },
    {
      name: 'timeline-item-opposite',
      description: 'The region across the axis around the `opposite` slot.',
      axes: ['orientation', 'align'],
    },
  ],
};

/** Timeline paints no surface; the Dot and Fill carry status (CL Timeline `tll-presentation`). */
export const timelinePresentation = definePresentation({
  definition,
  sources: [timelineAppearance],
});
