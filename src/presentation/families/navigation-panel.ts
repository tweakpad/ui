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
  sourceNode: 'ucl23-navigation-panel',
  nonVisualParts: ['Provider'],
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
      publicName: 'Panel',
      presentationKeys: [
        'navigation-panel',
        'navigation-panel-variant-integrated',
        'navigation-panel-variant-floating',
        'navigation-panel-variant-inset',
      ],
      cardinality: 'exactly one public owner host per control instance',
    },
    {
      name: 'navigation-panel-trigger',
      publicName: 'Trigger',
      presentationKeys: [
        'navigation-panel-trigger',
        'navigation-panel-trigger-variant-integrated',
        'navigation-panel-trigger-variant-floating',
        'navigation-panel-trigger-variant-inset',
      ],
      cardinality:
        'zero or one descendant of Panel; cited behavior sets any required-presence condition',
    },
    {
      name: 'navigation-panel-resize-rail',
      publicName: 'Resize rail',
      presentationKeys: [
        'navigation-panel-resize-rail',
        'navigation-panel-resize-rail-variant-integrated',
        'navigation-panel-resize-rail-variant-floating',
        'navigation-panel-resize-rail-variant-inset',
      ],
      cardinality:
        'zero or one descendant of Panel; cited behavior sets any required-presence condition',
    },
    {
      name: 'navigation-panel-inset',
      publicName: 'Inset',
      presentationKeys: [
        'navigation-panel-inset',
        'navigation-panel-inset-variant-integrated',
        'navigation-panel-inset-variant-floating',
        'navigation-panel-inset-variant-inset',
      ],
      cardinality:
        'zero or one descendant of Panel; cited behavior sets any required-presence condition',
    },
    {
      name: 'navigation-panel-header',
      publicName: 'Header',
      presentationKeys: [
        'navigation-panel-header',
        'navigation-panel-header-variant-integrated',
        'navigation-panel-header-variant-floating',
        'navigation-panel-header-variant-inset',
      ],
      cardinality:
        'zero or one descendant of Panel; cited behavior sets any required-presence condition',
    },
    {
      name: 'navigation-panel-content',
      publicName: 'Content',
      presentationKeys: [
        'navigation-panel-content',
        'navigation-panel-content-variant-integrated',
        'navigation-panel-content-variant-floating',
        'navigation-panel-content-variant-inset',
      ],
      cardinality:
        'zero or one descendant of Panel; cited behavior sets any required-presence condition',
    },
    {
      name: 'navigation-panel-footer',
      publicName: 'Footer',
      presentationKeys: [
        'navigation-panel-footer',
        'navigation-panel-footer-variant-integrated',
        'navigation-panel-footer-variant-floating',
        'navigation-panel-footer-variant-inset',
      ],
      cardinality:
        'zero or one descendant of Panel; cited behavior sets any required-presence condition',
    },
    {
      name: 'navigation-panel-group',
      publicName: 'Group',
      presentationKeys: [
        'navigation-panel-group',
        'navigation-panel-group-variant-integrated',
        'navigation-panel-group-variant-floating',
        'navigation-panel-group-variant-inset',
      ],
      cardinality: 'zero or more descendants of Panel; cited behavior sets any stronger minimum',
    },
    {
      name: 'navigation-panel-group-label',
      publicName: 'GroupLabel',
      presentationKeys: [
        'navigation-panel-group-label',
        'navigation-panel-group-label-variant-integrated',
        'navigation-panel-group-label-variant-floating',
        'navigation-panel-group-label-variant-inset',
      ],
      cardinality:
        'zero or one descendant of Panel; cited behavior sets any required-presence condition',
    },
    {
      name: 'navigation-panel-group-action',
      publicName: 'GroupAction',
      presentationKeys: [
        'navigation-panel-group-action',
        'navigation-panel-group-action-variant-integrated',
        'navigation-panel-group-action-variant-floating',
        'navigation-panel-group-action-variant-inset',
      ],
      cardinality: 'zero or more descendants of Panel; cited behavior sets any stronger minimum',
    },
    {
      name: 'navigation-panel-group-content',
      publicName: 'GroupContent',
      presentationKeys: [
        'navigation-panel-group-content',
        'navigation-panel-group-content-variant-integrated',
        'navigation-panel-group-content-variant-floating',
        'navigation-panel-group-content-variant-inset',
      ],
      cardinality:
        'zero or one descendant of Panel; cited behavior sets any required-presence condition',
    },
    {
      name: 'navigation-panel-menu',
      publicName: 'Menu',
      presentationKeys: [
        'navigation-panel-menu',
        'navigation-panel-menu-variant-integrated',
        'navigation-panel-menu-variant-floating',
        'navigation-panel-menu-variant-inset',
      ],
      cardinality:
        'zero or one descendant of Panel; cited behavior sets any required-presence condition',
    },
    {
      name: 'navigation-panel-item',
      publicName: 'Item',
      presentationKeys: [
        'navigation-panel-item',
        'navigation-panel-item-variant-integrated',
        'navigation-panel-item-variant-floating',
        'navigation-panel-item-variant-inset',
      ],
      cardinality: 'zero or more descendants of Panel; cited behavior sets any stronger minimum',
    },
    {
      name: 'navigation-panel-link',
      publicName: 'Link',
      presentationKeys: [
        'navigation-panel-link',
        'navigation-panel-link-variant-integrated',
        'navigation-panel-link-variant-floating',
        'navigation-panel-link-variant-inset',
      ],
      cardinality: 'zero or more descendants of Panel; cited behavior sets any stronger minimum',
    },
    {
      name: 'navigation-panel-action',
      publicName: 'Action',
      presentationKeys: [
        'navigation-panel-action',
        'navigation-panel-action-variant-integrated',
        'navigation-panel-action-variant-floating',
        'navigation-panel-action-variant-inset',
      ],
      cardinality: 'zero or more descendants of Panel; cited behavior sets any stronger minimum',
    },
    {
      name: 'navigation-panel-badge',
      publicName: 'Badge',
      presentationKeys: [
        'navigation-panel-badge',
        'navigation-panel-badge-variant-integrated',
        'navigation-panel-badge-variant-floating',
        'navigation-panel-badge-variant-inset',
      ],
      cardinality:
        'zero or one descendant of Panel; cited behavior sets any required-presence condition',
    },
    {
      name: 'navigation-panel-loading-placeholder',
      publicName: 'LoadingPlaceholder',
      presentationKeys: [
        'navigation-panel-loading-placeholder',
        'navigation-panel-loading-placeholder-variant-integrated',
        'navigation-panel-loading-placeholder-variant-floating',
        'navigation-panel-loading-placeholder-variant-inset',
      ],
      cardinality:
        'zero or one descendant of Panel; cited behavior sets any required-presence condition',
    },
    {
      name: 'navigation-panel-submenu',
      publicName: 'Submenu',
      presentationKeys: [
        'navigation-panel-submenu',
        'navigation-panel-submenu-variant-integrated',
        'navigation-panel-submenu-variant-floating',
        'navigation-panel-submenu-variant-inset',
      ],
      cardinality: 'zero or more descendants of Panel; cited behavior sets any stronger minimum',
    },
    {
      name: 'navigation-panel-subitem',
      publicName: 'Subitem',
      presentationKeys: [
        'navigation-panel-subitem',
        'navigation-panel-subitem-variant-integrated',
        'navigation-panel-subitem-variant-floating',
        'navigation-panel-subitem-variant-inset',
      ],
      cardinality: 'zero or more descendants of Panel; cited behavior sets any stronger minimum',
    },
    {
      name: 'navigation-panel-sublink',
      publicName: 'Sublink',
      presentationKeys: [
        'navigation-panel-sublink',
        'navigation-panel-sublink-variant-integrated',
        'navigation-panel-sublink-variant-floating',
        'navigation-panel-sublink-variant-inset',
      ],
      cardinality: 'zero or more descendants of Panel; cited behavior sets any stronger minimum',
    },
    {
      name: 'navigation-panel-input',
      publicName: 'Input',
      presentationKeys: [
        'navigation-panel-input',
        'navigation-panel-input-variant-integrated',
        'navigation-panel-input-variant-floating',
        'navigation-panel-input-variant-inset',
      ],
      cardinality:
        'zero or one descendant of Panel; cited behavior sets any required-presence condition',
    },
    {
      name: 'navigation-panel-separator',
      publicName: 'Separator',
      presentationKeys: [
        'navigation-panel-separator',
        'navigation-panel-separator-variant-integrated',
        'navigation-panel-separator-variant-floating',
        'navigation-panel-separator-variant-inset',
      ],
      cardinality:
        'zero or one descendant of Panel; cited behavior sets any required-presence condition',
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
