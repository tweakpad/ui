import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { listItemAppearance } from '../recipes/list-item.js';
import { passiveVariantAppearance } from '../recipes/core/passive.js';

const definition: ComponentDefinition = {
  name: 'List item',
  tagName: 'tp-list-item',
  kind: 'preset-composition',
  sourceNode: 'ucl22-list-item',
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
      publicName: 'Group',
      presentationKeys: [
        'list-item',
        'list-item-variant-ghost',
        'list-item-variant-outline',
        'list-item-variant-subdued',
        'list-item-size-xs',
        'list-item-size-sm',
        'list-item-size-default',
      ],
      cardinality: 'exactly one public owner host per control instance',
    },
    {
      name: 'list-item-root',
      publicName: 'Root',
      presentationKeys: [
        'list-item-root',
        'list-item-root-variant-ghost',
        'list-item-root-variant-outline',
        'list-item-root-variant-subdued',
        'list-item-root-size-xs',
        'list-item-root-size-sm',
        'list-item-root-size-default',
      ],
      cardinality:
        'zero or one descendant of Group; cited behavior sets any required-presence condition',
    },
    {
      name: 'list-item-media',
      publicName: 'Media',
      presentationKeys: [
        'list-item-media',
        'list-item-media-variant-ghost',
        'list-item-media-variant-outline',
        'list-item-media-variant-subdued',
        'list-item-media-size-xs',
        'list-item-media-size-sm',
        'list-item-media-size-default',
      ],
      cardinality:
        'zero or one descendant of Group; cited behavior sets any required-presence condition',
    },
    {
      name: 'list-item-content',
      publicName: 'Content',
      presentationKeys: [
        'list-item-content',
        'list-item-content-variant-ghost',
        'list-item-content-variant-outline',
        'list-item-content-variant-subdued',
        'list-item-content-size-xs',
        'list-item-content-size-sm',
        'list-item-content-size-default',
      ],
      cardinality:
        'zero or one descendant of Group; cited behavior sets any required-presence condition',
    },
    {
      name: 'list-item-title',
      publicName: 'Title',
      presentationKeys: [
        'list-item-title',
        'list-item-title-variant-ghost',
        'list-item-title-variant-outline',
        'list-item-title-variant-subdued',
        'list-item-title-size-xs',
        'list-item-title-size-sm',
        'list-item-title-size-default',
      ],
      cardinality:
        'zero or one descendant of Group; cited behavior sets any required-presence condition',
    },
    {
      name: 'list-item-description',
      publicName: 'Description',
      presentationKeys: [
        'list-item-description',
        'list-item-description-variant-ghost',
        'list-item-description-variant-outline',
        'list-item-description-variant-subdued',
        'list-item-description-size-xs',
        'list-item-description-size-sm',
        'list-item-description-size-default',
      ],
      cardinality:
        'zero or one descendant of Group; cited behavior sets any required-presence condition',
    },
    {
      name: 'list-item-actions',
      publicName: 'Actions',
      presentationKeys: [
        'list-item-actions',
        'list-item-actions-variant-ghost',
        'list-item-actions-variant-outline',
        'list-item-actions-variant-subdued',
        'list-item-actions-size-xs',
        'list-item-actions-size-sm',
        'list-item-actions-size-default',
      ],
      cardinality:
        'zero or one descendant of Group; cited behavior sets any required-presence condition',
    },
    {
      name: 'list-item-header',
      publicName: 'Header',
      presentationKeys: [
        'list-item-header',
        'list-item-header-variant-ghost',
        'list-item-header-variant-outline',
        'list-item-header-variant-subdued',
        'list-item-header-size-xs',
        'list-item-header-size-sm',
        'list-item-header-size-default',
      ],
      cardinality:
        'zero or one descendant of Group; cited behavior sets any required-presence condition',
    },
    {
      name: 'list-item-footer',
      publicName: 'Footer',
      presentationKeys: [
        'list-item-footer',
        'list-item-footer-variant-ghost',
        'list-item-footer-variant-outline',
        'list-item-footer-variant-subdued',
        'list-item-footer-size-xs',
        'list-item-footer-size-sm',
        'list-item-footer-size-default',
      ],
      cardinality:
        'zero or one descendant of Group; cited behavior sets any required-presence condition',
    },
    {
      name: 'list-item-separator',
      publicName: 'Separator',
      presentationKeys: [
        'list-item-separator',
        'list-item-separator-variant-ghost',
        'list-item-separator-variant-outline',
        'list-item-separator-variant-subdued',
        'list-item-separator-size-xs',
        'list-item-separator-size-sm',
        'list-item-separator-size-default',
      ],
      cardinality:
        'zero or one descendant of Group; cited behavior sets any required-presence condition',
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
  complete: true,
});
