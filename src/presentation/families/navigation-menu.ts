import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { navigationMenuAppearance, navigationMenuStructure } from '../recipes/navigation-menu.js';

const definition: ComponentDefinition = {
  name: 'Navigation menu',
  tagName: 'tp-navigation-menu',
  kind: 'flattening-compound',
  sourceNode: 'ucl20-navigation-menu',
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
      publicName: 'Root',
      presentationKeys: [
        'navigation-menu',
        'navigation-menu-orientation-horizontal',
        'navigation-menu-orientation-vertical',
      ],
      cardinality: 'exactly one public owner host per control instance',
    },
    {
      name: 'navigation-menu-list',
      publicName: 'List',
      presentationKeys: [
        'navigation-menu-list',
        'navigation-menu-list-orientation-horizontal',
        'navigation-menu-list-orientation-vertical',
      ],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'navigation-menu-item',
      publicName: 'Item',
      presentationKeys: [
        'navigation-menu-item',
        'navigation-menu-item-orientation-horizontal',
        'navigation-menu-item-orientation-vertical',
      ],
      cardinality: 'zero or more descendants of Root; cited behavior sets any stronger minimum',
    },
    {
      name: 'navigation-menu-trigger',
      publicName: 'Trigger',
      presentationKeys: [
        'navigation-menu-trigger',
        'navigation-menu-trigger-orientation-horizontal',
        'navigation-menu-trigger-orientation-vertical',
      ],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'navigation-menu-content',
      publicName: 'Content',
      presentationKeys: [
        'navigation-menu-content',
        'navigation-menu-content-orientation-horizontal',
        'navigation-menu-content-orientation-vertical',
      ],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'navigation-menu-link',
      publicName: 'Link',
      presentationKeys: [
        'navigation-menu-link',
        'navigation-menu-link-orientation-horizontal',
        'navigation-menu-link-orientation-vertical',
      ],
      cardinality: 'zero or more descendants of Root; cited behavior sets any stronger minimum',
    },
    {
      name: 'navigation-menu-indicator',
      publicName: 'Indicator',
      presentationKeys: [
        'navigation-menu-indicator',
        'navigation-menu-indicator-orientation-horizontal',
        'navigation-menu-indicator-orientation-vertical',
      ],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'navigation-menu-viewport',
      publicName: 'Viewport',
      presentationKeys: [
        'navigation-menu-viewport',
        'navigation-menu-viewport-orientation-horizontal',
        'navigation-menu-viewport-orientation-vertical',
      ],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'navigation-menu-positioner',
      publicName: 'Positioner',
      presentationKeys: [
        'navigation-menu-positioner',
        'navigation-menu-positioner-orientation-horizontal',
        'navigation-menu-positioner-orientation-vertical',
      ],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
  ],
};

export const navigationMenuPresentation = definePresentation({
  definition,
  structure: navigationMenuStructure,
  sources: [navigationMenuAppearance],
  complete: true,
});
