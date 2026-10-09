import { barycentric, triangleVertices, type Point, type TriangleVertices } from './geometry.js';

/** sRGB bytes of a fully saturated, fully bright hue. */
export function hueBytes(hue: number): readonly [number, number, number] {
  const h = (((hue % 360) + 360) % 360) / 60;
  const x = 1 - Math.abs((h % 2) - 1);
  const [r, g, b] =
    h < 1
      ? [1, x, 0]
      : h < 2
        ? [x, 1, 0]
        : h < 3
          ? [0, 1, x]
          : h < 4
            ? [0, x, 1]
            : h < 5
              ? [x, 0, 1]
              : [1, 0, x];
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

export interface TrianglePaintOptions {
  readonly hue: number;
  /** Stroke color of the outline; empty paints no outline. */
  readonly outline: string;
  readonly pixelRatio: number;
}

/** The HSV triangle inscribed in the canvas circle, in device pixels. */
export function triangleGeometry(width: number, height: number, hue: number): TriangleVertices {
  const radius = Math.max(0, Math.min(width, height) / 2 - 1);
  return triangleVertices({ x: width / 2, y: height / 2 }, radius, hue);
}

/**
 * Paints the saturation/brightness triangle of a hue: the hue vertex, white and black mixed
 * by barycentric weight per pixel, with a one-pixel soft edge and an optional outline.
 */
export function paintTriangle(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  options: TrianglePaintOptions,
): TriangleVertices {
  context.clearRect(0, 0, width, height);
  const vertices = triangleGeometry(width, height, options.hue);
  if (width <= 0 || height <= 0) return vertices;
  const [hr, hg, hb] = hueBytes(options.hue);
  const image = context.createImageData(width, height);
  const data = image.data;
  // Barycentric weights scale with the triangle height: one unit equals this many pixels.
  const side = Math.hypot(vertices.hue.x - vertices.white.x, vertices.hue.y - vertices.white.y);
  const unit = (side * Math.sqrt(3)) / 2;
  const point: { x: number; y: number } = { x: 0, y: 0 };
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      point.x = x + 0.5;
      point.y = y + 0.5;
      const { hue, white, black } = barycentric(point as Point, vertices);
      const edge = Math.min(hue, white, black) * unit;
      if (edge < -1) continue;
      const alpha = Math.max(0, Math.min(1, edge + 0.5));
      const h = Math.max(0, hue);
      const w = Math.max(0, white);
      const total = h + w + Math.max(0, black) || 1;
      const offset = (y * width + x) * 4;
      data[offset] = Math.round(((h * hr + w * 255) / total) | 0);
      data[offset + 1] = Math.round(((h * hg + w * 255) / total) | 0);
      data[offset + 2] = Math.round(((h * hb + w * 255) / total) | 0);
      data[offset + 3] = Math.round(alpha * 255);
    }
  }
  context.putImageData(image, 0, 0);
  if (options.outline) {
    context.save();
    context.beginPath();
    context.moveTo(vertices.hue.x, vertices.hue.y);
    context.lineTo(vertices.white.x, vertices.white.y);
    context.lineTo(vertices.black.x, vertices.black.y);
    context.closePath();
    context.lineJoin = 'round';
    context.lineWidth = Math.max(1, options.pixelRatio);
    context.strokeStyle = options.outline;
    context.stroke();
    context.restore();
  }
  return vertices;
}
