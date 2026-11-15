import { rotatedBounds } from './geometry.js';
import type {
  ImageEditorBlobOptions,
  ImageEditorExportOptions,
  ImageEditorValue,
} from './types.js';

/**
 * Draws the value's region of a loaded image onto a new canvas at natural resolution, or scaled
 * down so its longer side is `maxSize`. Parts of the region outside the image stay transparent.
 * Throws when the image is cross-origin without CORS, since its pixels cannot be read back.
 */
export function drawRegion(
  image: HTMLImageElement,
  value: ImageEditorValue,
  options: ImageEditorExportOptions = {},
): HTMLCanvasElement {
  const natural = { width: image.naturalWidth, height: image.naturalHeight };
  if (!natural.width || !natural.height) throw new Error('The image has not loaded.');
  const longest = Math.max(value.width, value.height);
  const scale =
    options.maxSize && options.maxSize > 0 && longest > options.maxSize
      ? options.maxSize / longest
      : 1;
  const canvas = image.ownerDocument.createElement('canvas');
  canvas.width = Math.max(1, Math.round(value.width * scale));
  canvas.height = Math.max(1, Math.round(value.height * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('A 2D canvas is not available.');
  const box = rotatedBounds(natural, value.rotation);
  context.imageSmoothingQuality = 'high';
  context.scale(canvas.width / value.width, canvas.height / value.height);
  context.translate(-value.x + box.width / 2, -value.y + box.height / 2);
  context.rotate((value.rotation * Math.PI) / 180);
  context.drawImage(image, -natural.width / 2, -natural.height / 2);
  try {
    // A tainted canvas throws on read-back; probe one pixel so the caller learns now.
    context.getImageData(0, 0, 1, 1);
  } catch {
    throw new Error(
      'The image is cross-origin without CORS; set crossorigin="anonymous" and serve it with CORS headers to export it.',
    );
  }
  return canvas;
}

/** `drawRegion`, encoded. */
export function regionBlob(
  image: HTMLImageElement,
  value: ImageEditorValue,
  options: ImageEditorBlobOptions = {},
): Promise<Blob> {
  const canvas = drawRegion(image, value, options);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('The image could not be encoded.'))),
      options.type ?? 'image/png',
      options.quality,
    );
  });
}
