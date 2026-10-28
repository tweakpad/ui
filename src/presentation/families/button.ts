import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { buttonAppearance } from '../recipes/button.js';
import { buttonCoreAppearance, buttonSizes } from '../recipes/core/button.js';

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
      values: buttonSizes,
      default: 'default',
    },
  ],
  parts: [
    {
      name: 'button',
      description:
        'The native button or link: the target of focus, activation and the variant appearance.',
      axes: ['variant', 'size'],
    },
    {
      name: 'button-leading-mark',
      description: 'The mark before the label: the icon, the Spinner or the `icon-start` slot.',
      axes: ['variant', 'size'],
    },
    {
      name: 'button-label',
      description: 'The label; hidden visually in an icon size and when it has no content.',
      axes: ['variant', 'size'],
    },
    {
      name: 'button-trailing-mark',
      description: 'The mark after the label: the icon, the Spinner or the `icon-end` slot.',
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
