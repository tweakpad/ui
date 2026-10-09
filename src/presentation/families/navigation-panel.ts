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
      axes: ['variant'],
    },
    {
      name: 'navigation-panel-trigger',
      axes: ['variant'],
    },
    {
      name: 'navigation-panel-resize-rail',
      axes: ['variant'],
    },
    {
      name: 'navigation-panel-inset',
      axes: ['variant'],
    },
    {
      name: 'navigation-panel-header',
      axes: ['variant'],
    },
    {
      name: 'navigation-panel-content',
      axes: ['variant'],
    },
    {
      name: 'navigation-panel-footer',
      axes: ['variant'],
    },
    {
      name: 'navigation-panel-group',
      axes: ['variant'],
    },
    {
      name: 'navigation-panel-group-label',
      axes: ['variant'],
    },
    {
      name: 'navigation-panel-group-action',
      axes: ['variant'],
    },
    {
      name: 'navigation-panel-group-content',
      axes: ['variant'],
    },
    {
      name: 'navigation-panel-menu',
      axes: ['variant'],
    },
    {
      name: 'navigation-panel-item',
      axes: ['variant'],
    },
    {
      name: 'navigation-panel-link',
      axes: ['variant'],
    },
    {
      name: 'navigation-panel-action',
      axes: ['variant'],
    },
    {
      name: 'navigation-panel-badge',
      axes: ['variant'],
    },
    {
      name: 'navigation-panel-loading-placeholder',
      axes: ['variant'],
    },
    {
      name: 'navigation-panel-submenu',
      axes: ['variant'],
    },
    {
      name: 'navigation-panel-subitem',
      axes: ['variant'],
    },
    {
      name: 'navigation-panel-sublink',
      axes: ['variant'],
    },
    {
      name: 'navigation-panel-input',
      axes: ['variant'],
    },
    {
      name: 'navigation-panel-separator',
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
