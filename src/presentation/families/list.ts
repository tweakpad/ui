import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { listAppearance } from '../recipes/list.js';
import { passiveVariantAppearance } from '../recipes/core/passive.js';

const definition: ComponentDefinition = {
  name: 'List',
  tagName: 'tp-list',
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
      name: 'list',
      axes: ['variant', 'size'],
    },
    {
      name: 'list-item',
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
      name: 'list-separator',
      axes: ['variant', 'size'],
    },
  ],
};

/** The List container, its List item rows and the Separator members. */
export const listPresentation = definePresentation({
  definition,
  bindings: {
    'tp-list': {
      '.group': 'list',
    },
    'tp-list-separator': {
      '.separator': 'list-separator',
    },
    'tp-list-item': {
      '.item': 'list-item',
      '.description': 'list-item-description',
      '.media': 'list-item-media',
      '.content': 'list-item-content',
      '.title': 'list-item-title',
      '.actions': 'list-item-actions',
      '.header': 'list-item-header',
      '.footer': 'list-item-footer',
    },
  },
  sources: [listAppearance, passiveVariantAppearance(definition, 'list-item')],
});
