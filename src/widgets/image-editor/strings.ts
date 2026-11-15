import type { ImageEditorMessages } from './types.js';

const round = (value: number) => Math.round(value);

export const DEFAULT_IMAGE_EDITOR_MESSAGES: ImageEditorMessages = {
  label: 'Image editor',
  roleDescription: 'image editor',
  region: 'Crop region',
  regionRoleDescription: 'crop region',
  controls: 'Image controls',
  zoom: 'Zoom',
  zoomIn: 'Zoom in',
  zoomOut: 'Zoom out',
  rotateLeft: 'Rotate left',
  rotateRight: 'Rotate right',
  rotation: 'Straighten',
  fit: 'Fit',
  actual: 'Actual size',
  reset: 'Reset',
  error: 'The image could not be loaded.',
  view: (zoom, rotation) => `Zoom ${round(zoom * 100)}%, rotated ${round(rotation)}°`,
  regionValue: (value) =>
    `${round(value.width)} × ${round(value.height)} at ${round(value.x)}, ${round(value.y)}`,
  instructions: (adjustable) =>
    adjustable
      ? 'Arrow keys pan, plus and minus zoom, brackets rotate, with Shift by a degree. On the region, arrow keys move it and Alt with an arrow resizes it.'
      : 'Arrow keys pan, plus and minus zoom, brackets rotate, with Shift by a degree, 0 fits and 1 shows actual size.',
};

export function resolveImageEditorMessages(
  messages: Partial<ImageEditorMessages> | undefined,
): ImageEditorMessages {
  return messages
    ? { ...DEFAULT_IMAGE_EDITOR_MESSAGES, ...messages }
    : DEFAULT_IMAGE_EDITOR_MESSAGES;
}
