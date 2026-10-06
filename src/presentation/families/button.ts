import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { buttonAppearance } from '../recipes/button.js';
import { buttonCoreAppearance } from '../recipes/core/button.js';

const definition: ComponentDefinition = {
  name: 'Button',
  tagName: 'tp-button',
  kind: 'compound-reexport',
  sourceNode: 'ucl16-button',
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
      publicName: 'Control',
      presentationKeys: [
        'button',
        'button-variant-default',
        'button-variant-secondary',
        'button-variant-destructive',
        'button-variant-outline',
        'button-variant-ghost',
        'button-variant-link',
        'button-size-xs',
        'button-size-sm',
        'button-size-default',
        'button-size-lg',
        'button-size-icon-xs',
        'button-size-icon-sm',
        'button-size-icon',
        'button-size-icon-lg',
      ],
      cardinality: 'exactly one public owner host per control instance',
    },
    {
      name: 'button-leading-mark',
      publicName: 'Leading mark',
      presentationKeys: [
        'button-leading-mark',
        'button-leading-mark-variant-default',
        'button-leading-mark-variant-secondary',
        'button-leading-mark-variant-destructive',
        'button-leading-mark-variant-outline',
        'button-leading-mark-variant-ghost',
        'button-leading-mark-variant-link',
        'button-leading-mark-size-xs',
        'button-leading-mark-size-sm',
        'button-leading-mark-size-default',
        'button-leading-mark-size-lg',
        'button-leading-mark-size-icon-xs',
        'button-leading-mark-size-icon-sm',
        'button-leading-mark-size-icon',
        'button-leading-mark-size-icon-lg',
      ],
      cardinality:
        'zero or one descendant of Control; cited behavior sets any required-presence condition',
    },
    {
      name: 'button-label',
      publicName: 'Label',
      presentationKeys: [
        'button-label',
        'button-label-variant-default',
        'button-label-variant-secondary',
        'button-label-variant-destructive',
        'button-label-variant-outline',
        'button-label-variant-ghost',
        'button-label-variant-link',
        'button-label-size-xs',
        'button-label-size-sm',
        'button-label-size-default',
        'button-label-size-lg',
        'button-label-size-icon-xs',
        'button-label-size-icon-sm',
        'button-label-size-icon',
        'button-label-size-icon-lg',
      ],
      cardinality:
        'zero or one descendant of Control; cited behavior sets any required-presence condition',
    },
    {
      name: 'button-trailing-mark',
      publicName: 'Trailing mark',
      presentationKeys: [
        'button-trailing-mark',
        'button-trailing-mark-variant-default',
        'button-trailing-mark-variant-secondary',
        'button-trailing-mark-variant-destructive',
        'button-trailing-mark-variant-outline',
        'button-trailing-mark-variant-ghost',
        'button-trailing-mark-variant-link',
        'button-trailing-mark-size-xs',
        'button-trailing-mark-size-sm',
        'button-trailing-mark-size-default',
        'button-trailing-mark-size-lg',
        'button-trailing-mark-size-icon-xs',
        'button-trailing-mark-size-icon-sm',
        'button-trailing-mark-size-icon',
        'button-trailing-mark-size-icon-lg',
      ],
      cardinality:
        'zero or one descendant of Control; cited behavior sets any required-presence condition',
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
