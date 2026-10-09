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
      axes: ['orientation'],
    },
    {
      name: 'navigation-menu-list',
      axes: ['orientation'],
    },
    {
      name: 'navigation-menu-item',
      axes: ['orientation'],
    },
    {
      name: 'navigation-menu-trigger',
      axes: ['orientation'],
    },
    {
      name: 'navigation-menu-content',
      axes: ['orientation'],
    },
    {
      name: 'navigation-menu-link',
      axes: ['orientation'],
    },
    {
      name: 'navigation-menu-indicator',
      axes: ['orientation'],
    },
    {
      name: 'navigation-menu-viewport',
      axes: ['orientation'],
    },
    {
      name: 'navigation-menu-positioner',
      axes: ['orientation'],
    },
  ],
};

export const navigationMenuPresentation = definePresentation({
  definition,
  structure: navigationMenuStructure,
  sources: [navigationMenuAppearance],
});
