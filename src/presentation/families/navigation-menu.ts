import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { navigationMenuAppearance, navigationMenuStructure } from '../recipes/navigation-menu.js';

const definition: ComponentDefinition = {
  name: 'Navigation menu',
  tagName: 'tp-navigation-menu',
  kind: 'flattening-compound',
  axes: [
    {
      name: 'orientation',
      values: ['horizontal', 'vertical'],
      default: 'horizontal',
    },
  ],
  parts: [
    {
      name: 'navigation-menu',
      description: 'The navigation landmark around the list.',
      axes: ['orientation'],
    },
    {
      name: 'navigation-menu-list',
      description: 'The list of items.',
      axes: ['orientation'],
    },
    {
      name: 'navigation-menu-item',
      description: 'Each item of the list.',
      axes: ['orientation'],
    },
    {
      name: 'navigation-menu-trigger',
      description: 'The trigger of an item with a panel.',
      axes: ['orientation'],
    },
    {
      name: 'navigation-menu-content',
      description: 'The panel of an item.',
      axes: ['orientation'],
    },
    {
      name: 'navigation-menu-link',
      description: "A link, the caller's own anchor.",
      axes: ['orientation'],
    },
    {
      name: 'navigation-menu-indicator',
      description: 'The chevron after a trigger.',
      axes: ['orientation'],
    },
    {
      name: 'navigation-menu-viewport',
      description: 'The shared viewport that holds the open panel and resizes between panels.',
      axes: ['orientation'],
    },
    {
      name: 'navigation-menu-positioner',
      description: 'The layer that places the viewport against the open trigger.',
      axes: ['orientation'],
    },
  ],
};

export const navigationMenuPresentation = definePresentation({
  definition,
  structure: navigationMenuStructure,
  sources: [navigationMenuAppearance],
});
