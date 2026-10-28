import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { fileUploadAppearance } from '../recipes/file-upload.js';

/** Every part follows the size axis. */
const definition: ComponentDefinition = {
  name: 'File upload',
  tagName: 'tp-file-upload',
  kind: 'compound-reexport',
  axes: [{ name: 'size', values: ['sm', 'default'], default: 'default' }],
  parts: [
    {
      name: 'file-upload',
      description: 'The root around the drop surface, the summary and the files.',
      axes: ['size'],
    },
    {
      name: 'file-upload-dropzone',
      description: 'The dashed drop surface that opens the picker.',
      axes: ['size'],
    },
    {
      name: 'file-upload-media',
      description: 'The mark of the drop surface.',
      axes: ['size'],
    },
    {
      name: 'file-upload-title',
      description: 'The title of the drop surface.',
      axes: ['size'],
    },
    {
      name: 'file-upload-description',
      description: 'The hint sentence of accepted types and size.',
      axes: ['size'],
    },
    {
      name: 'file-upload-hint',
      description: 'The row of Badges of accepted types and size.',
      axes: ['size'],
    },
    {
      name: 'file-upload-trigger',
      description: 'The Browse Button of the drop surface.',
      axes: ['size'],
    },
    {
      name: 'file-upload-input',
      description: 'The visually hidden native file input, which takes focus.',
      axes: ['size'],
    },
    {
      name: 'file-upload-summary',
      description: 'The file count and the Clear all Button.',
      axes: ['size'],
    },
    {
      name: 'file-upload-clear',
      description: 'The Clear all Button.',
      axes: ['size'],
    },
    {
      name: 'file-upload-items',
      description: 'The list of files.',
      axes: ['size'],
    },
    {
      name: 'file-upload-item',
      description: 'One file, as an Attachment or an image tile.',
      axes: ['size'],
    },
    {
      name: 'file-upload-item-preview',
      description: 'The Image preview of an image file.',
      axes: ['size'],
    },
    {
      name: 'file-upload-item-progress',
      description: 'The upload bar of a file.',
      axes: ['size'],
    },
    {
      name: 'file-upload-item-retry',
      description: 'The Retry Button of a failed upload.',
      axes: ['size'],
    },
    {
      name: 'file-upload-item-delete',
      description: 'The Remove Button of a file.',
      axes: ['size'],
    },
  ],
};

export const fileUploadPresentation = definePresentation({
  definition,
  sources: [fileUploadAppearance],
});
