import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { fileUploadAppearance } from '../recipes/file-upload.js';

const parts = [
  'file-upload',
  'file-upload-dropzone',
  'file-upload-media',
  'file-upload-title',
  'file-upload-description',
  'file-upload-hint',
  'file-upload-trigger',
  'file-upload-input',
  'file-upload-summary',
  'file-upload-clear',
  'file-upload-items',
  'file-upload-item',
  'file-upload-item-preview',
  'file-upload-item-progress',
  'file-upload-item-retry',
  'file-upload-item-delete',
] as const;

/** CL `fupl-public-definition` and `fupl-presentation-keys`: every part follows the size axis. */
const definition: ComponentDefinition = {
  name: 'File upload',
  tagName: 'tp-file-upload',
  kind: 'compound-reexport',
  axes: [{ name: 'size', values: ['sm', 'default'], default: 'default' }],
  parts: parts.map((name) => ({ name, axes: ['size'] })),
};

export const fileUploadPresentation = definePresentation({
  definition,
  sources: [fileUploadAppearance],
});
