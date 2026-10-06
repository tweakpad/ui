import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { avatarAppearance } from '../recipes/avatar.js';

const definition: ComponentDefinition = {
  name: 'Avatar',
  tagName: 'tp-avatar',
  kind: 'compound-reexport',
  sourceNode: 'ucl21-avatar',
  axes: [
    {
      name: 'size',
      values: ['sm', 'default', 'lg'],
      default: 'default',
    },
  ],
  parts: [
    {
      name: 'avatar',
      publicName: 'Root',
      presentationKeys: ['avatar', 'avatar-size-sm', 'avatar-size-default', 'avatar-size-lg'],
      cardinality: 'exactly one public owner host per control instance',
    },
    {
      name: 'avatar-image',
      publicName: 'Image',
      presentationKeys: [
        'avatar-image',
        'avatar-image-size-sm',
        'avatar-image-size-default',
        'avatar-image-size-lg',
      ],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'avatar-fallback',
      publicName: 'Fallback',
      presentationKeys: [
        'avatar-fallback',
        'avatar-fallback-size-sm',
        'avatar-fallback-size-default',
        'avatar-fallback-size-lg',
      ],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'avatar-badge',
      publicName: 'Badge',
      presentationKeys: [
        'avatar-badge',
        'avatar-badge-size-sm',
        'avatar-badge-size-default',
        'avatar-badge-size-lg',
      ],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'avatar-group',
      publicName: 'Group',
      presentationKeys: [
        'avatar-group',
        'avatar-group-size-sm',
        'avatar-group-size-default',
        'avatar-group-size-lg',
      ],
      cardinality: 'zero or more descendants of Root; cited behavior sets any stronger minimum',
    },
    {
      name: 'avatar-overflow-count',
      publicName: 'Overflow count',
      presentationKeys: [
        'avatar-overflow-count',
        'avatar-overflow-count-size-sm',
        'avatar-overflow-count-size-default',
        'avatar-overflow-count-size-lg',
      ],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
  ],
};

export const avatarPresentation = definePresentation({
  definition,
  bindings: {
    'tp-avatar': {
      ':host': 'avatar',
      img: 'avatar-image',
      "[part~='fallback']": 'avatar-fallback',
    },
    'tp-avatar-group': {
      '.group': 'avatar-group',
      '.count': 'avatar-overflow-count',
    },
  },
  sources: [avatarAppearance],
});
