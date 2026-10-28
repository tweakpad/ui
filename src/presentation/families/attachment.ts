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
      description: 'The scrolling row of an Attachment group.',
      axes: ['size', 'orientation'],
    },
    {
      name: 'attachment-root',
      description: 'The attachment surface, whose border follows the status.',
      axes: ['size', 'orientation'],
    },
    {
      name: 'attachment-media',
      description: 'The area holding the file mark, image or Spinner.',
      axes: ['size', 'orientation'],
    },
    {
      name: 'attachment-content',
      description: 'The column of title, description and extra content.',
      axes: ['size', 'orientation'],
    },
    {
      name: 'attachment-title',
      description: 'The title.',
      axes: ['size', 'orientation'],
    },
    {
      name: 'attachment-description',
      description: 'The description or status line, announced politely when it changes.',
      axes: ['size', 'orientation'],
    },
    {
      name: 'attachment-actions',
      description: 'The row of actions.',
      axes: ['size', 'orientation'],
    },
    {
      name: 'attachment-action',
      description: 'Each action Button, including the generated Remove button.',
      axes: ['size', 'orientation'],
    },
    {
      name: 'attachment-trigger',
      description: 'The trigger Button that covers the attachment.',
      axes: ['size', 'orientation'],
    },
  ],
};

export const attachmentPresentation = definePresentation({
  definition,
  sources: [attachmentCoreAppearance, attachmentAppearance],
});
