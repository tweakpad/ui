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
      description: 'The avatar host: its size and circular shape.',
      axes: ['size'],
    },
    {
      name: 'avatar-image',
      description: 'The image.',
      axes: ['size'],
    },
    {
      name: 'avatar-fallback',
      description: 'The fallback shown while the image is unavailable.',
      axes: ['size'],
    },
    {
      name: 'avatar-badge',
      description: "The enclosure of the status mark on the avatar's edge.",
      axes: ['size'],
    },
    {
      name: 'avatar-group',
      description: 'The row that overlaps the avatars.',
      axes: ['size'],
    },
    {
      name: 'avatar-overflow-count',
      description: 'The avatar that counts the people the group leaves out.',
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
