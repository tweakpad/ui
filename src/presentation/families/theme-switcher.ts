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
      axes: ['variant', 'size'],
    },
    {
      name: 'theme-switcher-switch',
      axes: ['size'],
    },
    {
      name: 'theme-switcher-button',
      axes: ['size'],
    },
    {
      name: 'theme-switcher-group',
      axes: ['size'],
    },
    {
      name: 'theme-switcher-option',
      axes: ['size'],
    },
    {
      name: 'theme-switcher-icon',
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
