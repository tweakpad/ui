import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { carouselAppearance } from '../recipes/carousel.js';

const definition: ComponentDefinition = {
  name: 'Carousel',
  tagName: 'tp-carousel',
  kind: 'compound-reexport',
  axes: [
    {
      name: 'orientation',
      values: ['horizontal', 'vertical'],
      default: 'horizontal',
    },
    {
      name: 'indicatorType',
      values: ['bullets', 'fraction', 'progress', 'custom'],
      default: 'fraction',
    },
    { name: 'controlsPlacement', values: ['footer', 'inside', 'outside'], default: 'footer' },
  ],
  parts: [
    {
      name: 'carousel',
      description: 'The root region holding the viewport and its controls.',
      axes: ['orientation'],
    },
    {
      name: 'carousel-viewport',
      description: 'The clipping window the slides move through.',
      axes: ['orientation'],
    },
    {
      name: 'carousel-track',
      description: 'The moving strip of slides.',
      axes: ['orientation'],
    },
    {
      name: 'carousel-effect-surface',
      description: 'The layer an effect draws on in place of the moving track.',
    },
    {
      name: 'carousel-item',
      description: 'The shell around one slide.',
      axes: ['orientation'],
    },
    {
      name: 'carousel-previous',
      description: 'The built-in previous button.',
      axes: ['orientation'],
    },
    {
      name: 'carousel-next',
      description: 'The built-in next button.',
      axes: ['orientation'],
    },
    {
      name: 'carousel-indicator',
      description: 'The indicators: a fraction, bullets or a progress bar.',
      axes: ['orientation', 'indicatorType'],
    },
    {
      name: 'carousel-controls',
      description: 'The row of controls, placed in the footer, inside or outside the viewport.',
      axes: ['controlsPlacement'],
    },
    {
      name: 'carousel-status',
      description: 'The visible position text.',
    },
    {
      name: 'carousel-scrollbar',
      description: 'The optional scrollbar track.',
      axes: ['orientation'],
    },
    {
      name: 'carousel-thumb',
      description: 'The thumb of the scrollbar.',
      axes: ['orientation'],
    },
    {
      name: 'carousel-autoplay-control',
      description: 'The pause and resume button autoplay adds.',
    },
    {
      name: 'carousel-announcements',
      description: 'The polite live region announcing the position.',
    },
  ],
};

export const carouselPresentation = definePresentation({
  definition,
  bindings: {
    'tp-carousel': {
      '[part~="carousel"]': 'carousel',
      '[part~="carousel-viewport"]': 'carousel-viewport',
      '[part~="carousel-track"]': 'carousel-track',
      '[part~="carousel-item"]': 'carousel-item',
      '[part~="carousel-previous"]': 'carousel-previous',
      '[part~="carousel-next"]': 'carousel-next',
      '[part~="carousel-indicator"]': 'carousel-indicator',
      '[part~="carousel-controls"]': 'carousel-controls',
      '[part~="carousel-status"]': 'carousel-status',
      '[part~="carousel-scrollbar"]': 'carousel-scrollbar',
      '[part~="carousel-thumb"]': 'carousel-thumb',
      '[part~="carousel-autoplay-control"]': 'carousel-autoplay-control',
      '[part~="carousel-announcements"]': 'carousel-announcements',
    },
  },
  sources: [carouselAppearance],
});
