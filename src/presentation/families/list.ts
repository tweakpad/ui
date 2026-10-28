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
      description: 'The stack holding the rows.',
      axes: ['variant', 'size'],
    },
    {
      name: 'list-item',
      description:
        'The row: the native host a link or button delegate replaces, and the host of the variant appearance.',
      axes: ['variant', 'size'],
    },
    {
      name: 'list-item-media',
      description: 'The wrapper of the `media` slot, sized by the media treatment.',
      axes: ['variant', 'size'],
    },
    {
      name: 'list-item-content',
      description: 'The column holding the title and the description.',
      axes: ['variant', 'size'],
    },
    {
      name: 'list-item-title',
      description: 'The wrapper of the title.',
      axes: ['variant', 'size'],
    },
    {
      name: 'list-item-description',
      description: 'The wrapper of the description, in muted text.',
      axes: ['variant', 'size'],
    },
    {
      name: 'list-item-actions',
      description:
        'The wrapper of the `actions` slot, beside the row so its controls stay separate tab stops.',
      axes: ['variant', 'size'],
    },
    {
      name: 'list-item-header',
      description: 'The full-width region above the main content.',
      axes: ['variant', 'size'],
    },
    {
      name: 'list-item-footer',
      description: 'The full-width region below the main content.',
      axes: ['variant', 'size'],
    },
    {
      name: 'list-separator',
      description: 'The divider between rows.',
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
