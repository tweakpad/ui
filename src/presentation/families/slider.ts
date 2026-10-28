import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { sliderAppearance } from '../recipes/slider.js';

const definition: ComponentDefinition = {
  name: 'Slider',
  tagName: 'tp-slider',
  kind: 'compound-reexport',
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
      description: 'The root around the label, the output and the track.',
      axes: ['orientation', 'variant'],
    },
    {
      name: 'slider-track',
      description: 'The full length of the track.',
      axes: ['orientation', 'variant'],
    },
    {
      name: 'slider-range',
      description:
        'The filled part of the track: up to the value, or between the values of a range.',
      axes: ['orientation', 'variant'],
    },
    {
      name: 'slider-thumb',
      description: 'The handle around each native range input.',
      axes: ['orientation', 'variant'],
    },
    {
      name: 'slider-label',
      description: 'The visible label above the track.',
      axes: ['orientation'],
    },
    {
      name: 'slider-output',
      description: 'The formatted value beside the label.',
      axes: ['orientation'],
    },
    {
      // sec-148-slider mp-slider-media: optional non-semantic buffer ranges.
      name: 'slider-buffer',
      description: 'One buffered range drawn on the track, such as loaded media.',
      axes: ['orientation', 'variant'],
    },
    {
      // sec-148-slider mp-slider-media: optional non-semantic chapter segments.
      name: 'slider-chapter',
      description: 'One chapter segment of the track, such as a media chapter.',
      axes: ['orientation'],
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
