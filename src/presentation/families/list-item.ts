import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { listItemAppearance } from '../recipes/list-item.js';
import { passiveVariantAppearance } from '../recipes/core/passive.js';

const definition: ComponentDefinition = {
  name: 'List item',
  tagName: 'tp-list-item',
  kind: 'preset-composition',
  axes: [
    {
      name: 'variant',
      values: ['ghost', 'outline', 'subdued'],
      default: 'ghost',
    },
    {
      name: 'size',
      values: ['xs', 'sm', 'default'],
      default: 'default',
    },
  ],
  parts: [
    {
      name: 'list-item',
      axes: ['variant', 'size'],
    },
    {
      name: 'list-item-root',
      axes: ['variant', 'size'],
    },
    {
      name: 'list-item-media',
      axes: ['variant', 'size'],
    },
    {
      name: 'list-item-content',
      axes: ['variant', 'size'],
    },
    {
      name: 'list-item-title',
      axes: ['variant', 'size'],
    },
    {
      name: 'list-item-description',
      axes: ['variant', 'size'],
    },
    {
      name: 'list-item-actions',
      axes: ['variant', 'size'],
    },
    {
      name: 'list-item-header',
      axes: ['variant', 'size'],
    },
    {
      name: 'list-item-footer',
      axes: ['variant', 'size'],
    },
    {
      name: 'list-item-separator',
      axes: ['variant', 'size'],
    },
  ],
};

export const listItemPresentation = definePresentation({
  definition,
  bindings: {
    'tp-list-item-separator': {
      '.separator': 'list-item-separator',
    },
    'tp-list-item-group': {
      '.group': 'list-item',
    },
    'tp-list-item': {
      '.item': 'list-item-root',
      '.description': 'list-item-description',
      '.media': 'list-item-media',
      '.content': 'list-item-content',
      '.title': 'list-item-title',
      '.actions': 'list-item-actions',
      '.header': 'list-item-header',
      '.footer': 'list-item-footer',
    },
  },
  sources: [listItemAppearance, passiveVariantAppearance(definition, 'list-item-root')],
});
