import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { carouselAppearance } from '../recipes/carousel.js';

const definition: ComponentDefinition = {
  name: 'Carousel',
  tagName: 'tp-carousel',
  kind: 'compound-reexport',
  sourceNode: 'ucl21-carousel',
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
  states: [
    'disabled',
    'readonly',
    'selected',
    'dragging',
    'transitioning',
    'locked',
    'visible',
    'fully-visible',
    'autoplay-running',
    'autoplay-paused',
    'virtual',
  ],
  motionRoles: [
    {
      name: 'track',
      target: 'carousel-track',
      kind: 'state',
      phases: ['change'],
      completion: 'non-blocking',
    },
    {
      name: 'transition',
      target: 'carousel-viewport',
      kind: 'state',
      phases: ['change'],
      completion: 'non-blocking',
    },
    {
      name: 'auto-height',
      target: 'carousel-viewport',
      kind: 'state',
      phases: ['change'],
      completion: 'non-blocking',
    },
    {
      name: 'scrollbar-visibility',
      target: 'carousel-scrollbar',
      kind: 'state',
      phases: ['change'],
      completion: 'non-blocking',
    },
  ],
  parts: [
    {
      name: 'carousel',
      publicName: 'Root',
      presentationKeys: [
        'carousel',
        'carousel-orientation-horizontal',
        'carousel-orientation-vertical',
      ],
      cardinality: 'One owner',
    },
    {
      name: 'carousel-viewport',
      publicName: 'Viewport',
      presentationKeys: [
        'carousel-viewport',
        'carousel-viewport-orientation-horizontal',
        'carousel-viewport-orientation-vertical',
      ],
      cardinality: 'One in Root',
    },
    {
      name: 'carousel-track',
      publicName: 'Track',
      presentationKeys: [
        'carousel-track',
        'carousel-track-orientation-horizontal',
        'carousel-track-orientation-vertical',
      ],
      cardinality: 'One in Viewport',
    },
    {
      name: 'carousel-effect-surface',
      publicName: 'Effect surface',
      presentationKeys: ['carousel-effect-surface'],
      cardinality: 'Zero or one in Viewport; present while an effect is active',
    },
    {
      name: 'carousel-item',
      publicName: 'Item',
      presentationKeys: [
        'carousel-item',
        'carousel-item-orientation-horizontal',
        'carousel-item-orientation-vertical',
      ],
      cardinality: 'Zero or more in Track',
    },
    {
      name: 'carousel-previous',
      publicName: 'Previous',
      presentationKeys: [
        'carousel-previous',
        'carousel-previous-orientation-horizontal',
        'carousel-previous-orientation-vertical',
      ],
      cardinality: 'Zero or one generated role',
    },
    {
      name: 'carousel-next',
      publicName: 'Next',
      presentationKeys: [
        'carousel-next',
        'carousel-next-orientation-horizontal',
        'carousel-next-orientation-vertical',
      ],
      cardinality: 'Zero or one generated role',
    },
    {
      name: 'carousel-indicator',
      publicName: 'Indicator',
      presentationKeys: [
        'carousel-indicator',
        'carousel-indicator-orientation-horizontal',
        'carousel-indicator-orientation-vertical',
        'carousel-indicator-type-bullets',
        'carousel-indicator-type-fraction',
        'carousel-indicator-type-progress',
        'carousel-indicator-type-custom',
      ],
      cardinality: 'Zero or one region with zero or more items',
    },
    {
      name: 'carousel-controls',
      publicName: 'Controls',
      presentationKeys: [
        'carousel-controls',
        'carousel-controls-placement-footer',
        'carousel-controls-placement-inside',
        'carousel-controls-placement-outside',
      ],
      cardinality: 'Zero or one group',
    },
    {
      name: 'carousel-status',
      publicName: 'Status',
      presentationKeys: ['carousel-status'],
      cardinality: 'Zero or one position text',
    },
    {
      name: 'carousel-scrollbar',
      publicName: 'Scrollbar',
      presentationKeys: [
        'carousel-scrollbar',
        'carousel-scrollbar-orientation-horizontal',
        'carousel-scrollbar-orientation-vertical',
      ],
      cardinality: 'Zero or one active-axis region',
    },
    {
      name: 'carousel-thumb',
      publicName: 'Thumb',
      presentationKeys: [
        'carousel-thumb',
        'carousel-thumb-orientation-horizontal',
        'carousel-thumb-orientation-vertical',
      ],
      cardinality: 'One within scrollbar',
    },
    {
      name: 'carousel-autoplay-control',
      publicName: 'Autoplay control',
      presentationKeys: ['carousel-autoplay-control'],
      cardinality: 'Zero or one action',
    },
    {
      name: 'carousel-announcements',
      publicName: 'Announcements',
      presentationKeys: ['carousel-announcements'],
      cardinality: 'One owned region when initialized',
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
  complete: true,
});
