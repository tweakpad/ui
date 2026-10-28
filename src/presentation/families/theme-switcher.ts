import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { themeSwitcherAppearance } from '../recipes/theme-switcher.js';

const definition: ComponentDefinition = {
  name: 'Theme switcher',
  tagName: 'tp-theme-switcher',
  kind: 'preset-composition',
  axes: [
    { name: 'variant', values: ['switch', 'button', 'group'], default: 'switch' },
    { name: 'size', values: ['sm', 'default'], default: 'default' },
  ],
  parts: [
    {
      name: 'theme-switcher',
      description: 'The host, which holds the composed control.',
      axes: ['variant', 'size'],
    },
    {
      name: 'theme-switcher-switch',
      description: 'The composed Switch of the `switch` control.',
      axes: ['size'],
    },
    {
      name: 'theme-switcher-button',
      description: 'The composed Button of the `button` control.',
      axes: ['size'],
    },
    {
      name: 'theme-switcher-group',
      description: 'The composed Toggle group of the `group` control.',
      axes: ['size'],
    },
    {
      name: 'theme-switcher-option',
      description: 'One Toggle of the `group` control: light, dark or system.',
      axes: ['size'],
    },
    {
      name: 'theme-switcher-icon',
      description: 'The sun, moon or monitor Icon that shows the scheme.',
      axes: ['size'],
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
