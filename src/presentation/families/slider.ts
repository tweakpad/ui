import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { sliderAppearance } from '../recipes/slider.js';

const definition: ComponentDefinition = {
  name: 'Slider',
  tagName: 'tp-slider',
  kind: 'compound-reexport',
  sourceNode: 'ucl17-slider',
  axes: [
    {
      name: 'orientation',
      values: ['horizontal', 'vertical'],
      default: 'horizontal',
    },
    {
      // Thumbless scrubbing track (media timelines); the Thumb keeps its native input.
      name: 'variant',
      values: ['default', 'bar'],
      default: 'default',
    },
  ],
  parts: [
    {
      name: 'slider',
      publicName: 'Root',
      presentationKeys: [
        'slider',
        'slider-orientation-horizontal',
        'slider-orientation-vertical',
        'slider-variant-default',
        'slider-variant-bar',
      ],
      cardinality: 'exactly one public owner host per control instance',
    },
    {
      name: 'slider-track',
      publicName: 'Track',
      presentationKeys: [
        'slider-track',
        'slider-track-orientation-horizontal',
        'slider-track-orientation-vertical',
        'slider-track-variant-default',
        'slider-track-variant-bar',
      ],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'slider-range',
      publicName: 'Range',
      presentationKeys: [
        'slider-range',
        'slider-range-orientation-horizontal',
        'slider-range-orientation-vertical',
        'slider-range-variant-default',
        'slider-range-variant-bar',
      ],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'slider-thumb',
      publicName: 'Thumb',
      presentationKeys: [
        'slider-thumb',
        'slider-thumb-orientation-horizontal',
        'slider-thumb-orientation-vertical',
        'slider-thumb-variant-default',
        'slider-thumb-variant-bar',
      ],
      cardinality: 'zero or more descendants of Root; cited behavior sets any stronger minimum',
    },
    {
      name: 'slider-label',
      publicName: 'Label',
      presentationKeys: [
        'slider-label',
        'slider-label-orientation-horizontal',
        'slider-label-orientation-vertical',
      ],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'slider-output',
      publicName: 'Output',
      presentationKeys: [
        'slider-output',
        'slider-output-orientation-horizontal',
        'slider-output-orientation-vertical',
      ],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      // sec-148-slider mp-slider-media: optional non-semantic buffer ranges.
      name: 'slider-buffer',
      publicName: 'Buffer',
      presentationKeys: [
        'slider-buffer',
        'slider-buffer-orientation-horizontal',
        'slider-buffer-orientation-vertical',
        'slider-buffer-variant-default',
        'slider-buffer-variant-bar',
      ],
      cardinality: 'zero or more descendants of Track; one per normalized buffered range',
    },
    {
      // sec-148-slider mp-slider-media: optional non-semantic chapter segments.
      name: 'slider-chapter',
      publicName: 'Chapter',
      presentationKeys: [
        'slider-chapter',
        'slider-chapter-orientation-horizontal',
        'slider-chapter-orientation-vertical',
      ],
      cardinality: 'zero or more descendants of Track; one per normalized segment',
    },
  ],
};

export const sliderPresentation = definePresentation({
  definition,
  bindings: {
    'tp-slider': {
      '[part~="slider"]': 'slider',
      '[part~="slider-track"]': 'slider-track',
      '[part~="slider-range"]': 'slider-range',
      '[part~="slider-thumb"]': 'slider-thumb',
      '[part~="slider-label"]': 'slider-label',
      '[part~="slider-output"]': 'slider-output',
      '[part~="slider-buffer"]': 'slider-buffer',
      '[part~="slider-chapter"]': 'slider-chapter',
    },
    'tp-slider-thumb': {
      '[part~="slider-thumb"]': 'slider-thumb',
    },
  },
  sources: [sliderAppearance],
});
