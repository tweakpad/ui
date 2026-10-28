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
      axes: ['orientation'],
    },
    {
      name: 'carousel-viewport',
      axes: ['orientation'],
    },
    {
      name: 'carousel-track',
      axes: ['orientation'],
    },
    {
      name: 'carousel-effect-surface',
    },
    {
      name: 'carousel-item',
      axes: ['orientation'],
    },
    {
      name: 'carousel-previous',
      axes: ['orientation'],
    },
    {
      name: 'carousel-next',
      axes: ['orientation'],
    },
    {
      name: 'carousel-indicator',
      axes: ['orientation', 'indicatorType'],
    },
    {
      name: 'carousel-controls',
      axes: ['controlsPlacement'],
    },
    {
      name: 'carousel-status',
    },
    {
      name: 'carousel-scrollbar',
      axes: ['orientation'],
    },
    {
      name: 'carousel-thumb',
      axes: ['orientation'],
    },
    {
      name: 'carousel-autoplay-control',
    },
    {
      name: 'carousel-announcements',
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
