import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { avatarAppearance } from '../recipes/avatar.js';

const definition: ComponentDefinition = {
  name: 'Avatar',
  tagName: 'tp-avatar',
  kind: 'compound-reexport',
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
      axes: ['size'],
    },
    {
      name: 'avatar-image',
      axes: ['size'],
    },
    {
      name: 'avatar-fallback',
      axes: ['size'],
    },
    {
      name: 'avatar-badge',
      axes: ['size'],
    },
    {
      name: 'avatar-group',
      axes: ['size'],
    },
    {
      name: 'avatar-overflow-count',
      axes: ['size'],
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
