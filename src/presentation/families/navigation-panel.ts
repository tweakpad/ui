import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import {
  navigationPanelAppearance,
  navigationPanelStructure,
} from '../recipes/navigation-panel.js';

const definition: ComponentDefinition = {
  name: 'Navigation panel',
  tagName: 'tp-navigation-panel',
  kind: 'compound-reexport',
  axes: [
    {
      name: 'variant',
      values: ['integrated', 'floating', 'inset'],
      default: 'integrated',
    },
  ],
  parts: [
    {
      name: 'navigation-panel',
      description: 'The navigation surface, in the page or in the compact Drawer.',
      axes: ['variant'],
    },
    {
      name: 'navigation-panel-trigger',
      description: 'The toggle Button.',
      axes: ['variant'],
    },
    {
      name: 'navigation-panel-resize-rail',
      description: 'The edge Button between navigation and page.',
      axes: ['variant'],
    },
    {
      name: 'navigation-panel-inset',
      description: 'The main region of the page.',
      axes: ['variant'],
    },
    {
      name: 'navigation-panel-header',
      description: 'The top region of the navigation.',
      axes: ['variant'],
    },
    {
      name: 'navigation-panel-content',
      description: 'The scrolling middle region of the navigation.',
      axes: ['variant'],
    },
    {
      name: 'navigation-panel-footer',
      description: 'The bottom region of the navigation.',
      axes: ['variant'],
    },
    {
      name: 'navigation-panel-group',
      description: 'A titled section.',
      axes: ['variant'],
    },
    {
      name: 'navigation-panel-group-label',
      description: 'The title of a section.',
      axes: ['variant'],
    },
    {
      name: 'navigation-panel-group-action',
      description: 'The corner Button of a section.',
      axes: ['variant'],
    },
    {
      name: 'navigation-panel-group-content',
      description: 'The body of a section.',
      axes: ['variant'],
    },
    {
      name: 'navigation-panel-menu',
      description: 'The list of items.',
      axes: ['variant'],
    },
    {
      name: 'navigation-panel-item',
      description: 'One entry of a list.',
      axes: ['variant'],
    },
    {
      name: 'navigation-panel-link',
      description: 'A destination link.',
      axes: ['variant'],
    },
    {
      name: 'navigation-panel-action',
      description: 'A command Button.',
      axes: ['variant'],
    },
    {
      name: 'navigation-panel-badge',
      description: 'The Badge of an item.',
      axes: ['variant'],
    },
    {
      name: 'navigation-panel-loading-placeholder',
      description: 'A loading row.',
      axes: ['variant'],
    },
    {
      name: 'navigation-panel-submenu',
      description: 'The nested list of an item.',
      axes: ['variant'],
    },
    {
      name: 'navigation-panel-subitem',
      description: 'One entry of a nested list.',
      axes: ['variant'],
    },
    {
      name: 'navigation-panel-sublink',
      description: 'A nested destination link.',
      axes: ['variant'],
    },
    {
      name: 'navigation-panel-input',
      description: 'The Input of the navigation.',
      axes: ['variant'],
    },
    {
      name: 'navigation-panel-separator',
      description: 'A Separator between regions or groups.',
      axes: ['variant'],
    },
  ],
};

export const navigationPanelPresentation = definePresentation({
  definition,
  bindings: {
    'tp-navigation-panel': {
      '.panel': 'navigation-panel',
    },
  },
  structure: navigationPanelStructure,
  sources: [navigationPanelAppearance],
});
