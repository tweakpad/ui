import { qrPathData } from '../../foundation/qr/path.js';
import type { QrCode } from '../../foundation/qr/types.js';

/** Export formats; `jpeg` downloads with the `.jpg` extension. */
export type QrExportFormat = 'png' | 'svg' | 'jpeg';

export const EXPORT_TYPES: Record<QrExportFormat, string> = {
  png: 'image/png',
  svg: 'image/svg+xml',
  jpeg: 'image/jpeg',
};

export const EXPORT_EXTENSIONS: Record<QrExportFormat, string> = {
  png: '.png',
  svg: '.svg',
  jpeg: '.jpg',
};

/** The largest export side; larger canvases fail on some mobile browsers. */
export const MAX_EXPORT_SIZE = 4096;

/** A concrete sRGB color with alpha in 0..1. */
export interface ExportColor {
  readonly r: number;
  readonly g: number;
  readonly b: number;
  readonly a: number;
}

export interface ExportColors {
  readonly foreground: ExportColor;
  readonly background: ExportColor;
}

export const FALLBACK_COLORS: ExportColors = {
  foreground: { r: 0, g: 0, b: 0, a: 1 },
  background: { r: 255, g: 255, b: 255, a: 1 },
};

const RGB = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+)(%)?)?\s*\)$/u;

/**
 * Resolves a computed CSS color to sRGB. `rgb()` is parsed directly; any other notation
 * (`oklch()`, `color()`) is painted on a 1 × 1 canvas of the owner document and read back.
 */
export function resolveColor(document: Document, color: string): ExportColor | null {
  const match = RGB.exec(color.trim());
  if (match) {
    const alpha = match[4] === undefined ? 1 : Number(match[4]) / (match[5] ? 100 : 1);
    return { r: Number(match[1]), g: Number(match[2]), b: Number(match[3]), a: alpha };
  }
  if (!color || color === 'none') return null;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return null;
    context.fillStyle = color;
    context.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = context.getImageData(0, 0, 1, 1).data;
    return { r: r!, g: g!, b: b!, a: a! / 255 };
  } catch {
    return null;
  }
}

export function hexColor(color: ExportColor): string {
  return `#${[color.r, color.g, color.b]
    .map((channel) => Math.round(channel).toString(16).padStart(2, '0'))
    .join('')}`;
}

function cssColor(color: ExportColor): string {
  return `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`;
}

/** WCAG relative luminance of an sRGB color. */
function luminance(color: ExportColor): number {
  const linear = (channel: number) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linear(color.r) + 0.7152 * linear(color.g) + 0.0722 * linear(color.b);
}

/**
 * Contrast ratio of the dark modules against the light background, negative when the modules are
 * not darker than the background (an inverted symbol).
 */
export function moduleContrast(colors: ExportColors): number {
  const dark = luminance(colors.foreground);
  const light = luminance(colors.background);
  const ratio = (Math.max(dark, light) + 0.05) / (Math.min(dark, light) + 0.05);
  return dark < light ? ratio : -ratio;
}

function escapeXml(text: string): string {
  return text.replace(/[<>&"']/gu, (character) => `&#${character.charCodeAt(0)};`);
}

function fillAttributes(color: ExportColor): string {
  return `fill="${hexColor(color)}"${color.a < 1 ? ` fill-opacity="${+color.a.toFixed(3)}"` : ''}`;
}

/** A standalone SVG document of the symbol at `size` pixels, titled by `title`. */
export function svgDocument(
  code: QrCode,
  quietZone: number,
  size: number,
  colors: ExportColors,
  title: string,
): string {
  const extent = code.size + quietZone * 2;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" ` +
    `viewBox="0 0 ${extent} ${extent}" shape-rendering="crispEdges">` +
    `<title>${escapeXml(title)}</title>` +
    `<rect width="${extent}" height="${extent}" ${fillAttributes(colors.background)}/>` +
    `<path d="${qrPathData(code, quietZone)}" ${fillAttributes(colors.foreground)}/>` +
    `</svg>`
  );
}

/**
 * Paints the symbol on a `size` × `size` canvas of the owner document, every module the same
 * whole number of pixels and the leftover added to the quiet zone, and encodes it. JPEG is
 * flattened on white because it has no alpha. Painting is synchronous; only encoding is not.
 */
export function rasterize(
  document: Document,
  code: QrCode,
  quietZone: number,
  size: number,
  colors: ExportColors,
  format: 'png' | 'jpeg',
  quality = 0.92,
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const context = canvas.getContext('2d');
  if (!context) return Promise.reject(new Error('A 2D canvas context is unavailable.'));
  const extent = code.size + quietZone * 2;
  const module = Math.max(1, Math.floor(size / extent));
  const origin = Math.floor((size - module * extent) / 2) + quietZone * module;
  if (format === 'jpeg') {
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, size, size);
  }
  context.fillStyle = cssColor(colors.background);
  context.fillRect(0, 0, size, size);
  context.fillStyle = cssColor(colors.foreground);
  const { modules } = code;
  for (let y = 0; y < code.size; y++) {
    let x = 0;
    while (x < code.size) {
      if (!modules[y * code.size + x]) {
        x++;
        continue;
      }
      const start = x;
      while (x < code.size && modules[y * code.size + x]) x++;
      context.fillRect(origin + start * module, origin + y * module, (x - start) * module, module);
    }
  }
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('The canvas could not be encoded.'))),
      EXPORT_TYPES[format],
      quality,
    );
  });
}
