import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { buttonAppearance } from '../recipes/button.js';
import { buttonCoreAppearance } from '../recipes/core/button.js';

const definition: ComponentDefinition = {
  name: 'Button',
  tagName: 'tp-button',
  kind: 'compound-reexport',
  axes: [
    {
      name: 'variant',
      values: ['default', 'secondary', 'destructive', 'outline', 'ghost', 'link'],
      default: 'default',
    },
    {
      name: 'size',
      values: ['xs', 'sm', 'default', 'lg', 'icon-xs', 'icon-sm', 'icon', 'icon-lg'],
      default: 'default',
    },
  ],
  parts: [
    {
      name: 'button',
      axes: ['variant', 'size'],
    },
    {
      name: 'button-leading-mark',
      axes: ['variant', 'size'],
    },
    {
      name: 'button-label',
      axes: ['variant', 'size'],
    },
    {
      name: 'button-trailing-mark',
      axes: ['variant', 'size'],
    },
  ],
};

export const buttonPresentation = definePresentation({
  definition,
  bindings: {
    'tp-button': {
      '.control': 'button',
      "[part~='button-leading-mark']": 'button-leading-mark',
      "[part~='button-trailing-mark']": 'button-trailing-mark',
    },
  },
  sources: [buttonAppearance, buttonCoreAppearance],
});
