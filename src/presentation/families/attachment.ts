import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { attachmentCoreAppearance } from '../recipes/core/surfaces.js';
import { attachmentAppearance } from '../recipes/attachment.js';

const definition: ComponentDefinition = {
  name: 'Attachment',
  tagName: 'tp-attachment',
  kind: 'preset-composition',
  axes: [
    {
      name: 'size',
      values: ['xs', 'sm', 'default'],
      default: 'default',
    },
    {
      name: 'orientation',
      values: ['horizontal', 'vertical'],
      default: 'horizontal',
    },
  ],
  parts: [
    {
      name: 'attachment',
      axes: ['size', 'orientation'],
    },
    {
      name: 'attachment-root',
      axes: ['size', 'orientation'],
    },
    {
      name: 'attachment-media',
      axes: ['size', 'orientation'],
    },
    {
      name: 'attachment-content',
      axes: ['size', 'orientation'],
    },
    {
      name: 'attachment-title',
      axes: ['size', 'orientation'],
    },
    {
      name: 'attachment-description',
      axes: ['size', 'orientation'],
    },
    {
      name: 'attachment-actions',
      axes: ['size', 'orientation'],
    },
    {
      name: 'attachment-action',
      axes: ['size', 'orientation'],
    },
    {
      name: 'attachment-trigger',
      axes: ['size', 'orientation'],
    },
  ],
};

export const attachmentPresentation = definePresentation({
  definition,
  sources: [attachmentCoreAppearance, attachmentAppearance],
});
