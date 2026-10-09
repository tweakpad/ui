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
      axes: ['orientation', 'variant'],
    },
    {
      name: 'slider-track',
      axes: ['orientation', 'variant'],
    },
    {
      name: 'slider-range',
      axes: ['orientation', 'variant'],
    },
    {
      name: 'slider-thumb',
      axes: ['orientation', 'variant'],
    },
    {
      name: 'slider-label',
      axes: ['orientation'],
    },
    {
      name: 'slider-output',
      axes: ['orientation'],
    },
    {
      // sec-148-slider mp-slider-media: optional non-semantic buffer ranges.
      name: 'slider-buffer',
      axes: ['orientation', 'variant'],
    },
    {
      // sec-148-slider mp-slider-media: optional non-semantic chapter segments.
      name: 'slider-chapter',
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
