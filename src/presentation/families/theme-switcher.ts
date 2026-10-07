import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { themeSwitcherAppearance } from '../recipes/theme-switcher.js';

const sized = (part: string) => [part, `${part}-size-default`, `${part}-size-sm`];

const definition: ComponentDefinition = {
  name: 'Theme switcher',
  tagName: 'tp-theme-switcher',
  kind: 'preset-composition',
  sourceNode: 'ucl16-theme-switcher',
  axes: [
    { name: 'variant', values: ['switch', 'button', 'group'], default: 'switch' },
    { name: 'size', values: ['sm', 'default'], default: 'default' },
  ],
  parts: [
    {
      name: 'theme-switcher',
      publicName: 'Root',
      presentationKeys: [
        ...sized('theme-switcher'),
        'theme-switcher-variant-switch',
        'theme-switcher-variant-button',
        'theme-switcher-variant-group',
      ],
      cardinality: 'exactly one per instance',
    },
    {
      name: 'theme-switcher-switch',
      publicName: 'Switch',
      presentationKeys: sized('theme-switcher-switch'),
      cardinality: 'one composed Switch in the switch variant',
    },
    {
      name: 'theme-switcher-button',
      publicName: 'Button',
      presentationKeys: sized('theme-switcher-button'),
      cardinality: 'one composed Button in the button variant',
    },
    {
      name: 'theme-switcher-group',
      publicName: 'Group',
      presentationKeys: sized('theme-switcher-group'),
      cardinality: 'one composed Toggle group in the group variant',
    },
    {
      name: 'theme-switcher-option',
      publicName: 'Option',
      presentationKeys: sized('theme-switcher-option'),
      cardinality: 'three composed Toggles in the group variant',
    },
    {
      name: 'theme-switcher-icon',
      publicName: 'Icon',
      presentationKeys: sized('theme-switcher-icon'),
      cardinality: 'one Icon per preference the variant shows',
    },
  ],
  motionRoles: [
    {
      name: 'icon',
      target: 'theme-switcher-icon',
      kind: 'state',
      phases: ['change'],
      completion: 'non-blocking',
    },
  ],
};

export const themeSwitcherPresentation = definePresentation({
  definition,
  bindings: {
    'tp-theme-switcher': {
      ':host': 'theme-switcher',
      'tp-switch': 'theme-switcher-switch',
      'tp-button': 'theme-switcher-button',
      'tp-toggle-group': 'theme-switcher-group',
      'tp-toggle': 'theme-switcher-option',
      'tp-icon': 'theme-switcher-icon',
    },
  },
  sources: [themeSwitcherAppearance],
});
