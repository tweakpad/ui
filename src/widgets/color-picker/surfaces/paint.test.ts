import { describe, expect, it } from 'vitest';
import { hueBytes, paintTriangle, triangleGeometry } from './paint.js';

interface Call {
  readonly name: string;
  readonly args: unknown[];
}
function fakeContext(width: number) {
  const calls: Call[] = [];
  let image: { data: Uint8ClampedArray; width: number; height: number } | undefined;
  const record =
    (name: string) =>
    (...args: unknown[]) => {
      calls.push({ name, args });
    };
  const context = {
    createImageData: (w: number, h: number) => {
      image = { data: new Uint8ClampedArray(w * h * 4), width: w, height: h };
      return image;
    },
    putImageData: record('putImageData'),
    clearRect: record('clearRect'),
    save: record('save'),
    restore: record('restore'),
    beginPath: record('beginPath'),
    moveTo: record('moveTo'),
    lineTo: record('lineTo'),
    closePath: record('closePath'),
    stroke: record('stroke'),
    lineJoin: 'miter',
    lineWidth: 1,
    strokeStyle: '',
  } as unknown as CanvasRenderingContext2D;
  return {
    context,
    calls,
    pixel: (x: number, y: number) => [
      ...image!.data.slice((y * width + x) * 4, (y * width + x) * 4 + 4),
    ],
  };
}

describe('triangle raster', () => {
  it('converts hues to bytes', () => {
    expect(hueBytes(0)).toEqual([255, 0, 0]);
    expect(hueBytes(120)).toEqual([0, 255, 0]);
    expect(hueBytes(240)).toEqual([0, 0, 255]);
    expect(hueBytes(-120)).toEqual([0, 0, 255]);
  });

  it('paints hue, white and black corners with a transparent outside and an outline', () => {
    const size = 120;
    const { context, calls, pixel } = fakeContext(size);
    const vertices = paintTriangle(context, size, size, { hue: 0, outline: 'red', pixelRatio: 2 });
    expect(vertices).toEqual(triangleGeometry(size, size, 0));
    const inside = (vertex: { x: number; y: number }, towardsCenter = 6) => {
      const dx = size / 2 - vertex.x;
      const dy = size / 2 - vertex.y;
      const length = Math.hypot(dx, dy) || 1;
      return [
        Math.round(vertex.x + (dx / length) * towardsCenter),
        Math.round(vertex.y + (dy / length) * towardsCenter),
      ] as const;
    };
    const [hx, hy] = inside(vertices.hue);
    const hue = pixel(hx, hy);
    expect(hue[0]).toBeGreaterThan(200);
    expect(hue[1]).toBeLessThan(60);
    expect(hue[3]).toBe(255);
    const [wx, wy] = inside(vertices.white);
    const white = pixel(wx, wy);
    expect(Math.min(white[0]!, white[1]!, white[2]!)).toBeGreaterThan(200);
    const [bx, by] = inside(vertices.black);
    const black = pixel(bx, by);
    expect(Math.max(black[0]!, black[1]!, black[2]!)).toBeLessThan(60);
    expect(pixel(0, 0)[3]).toBe(0);
    expect(calls.map((call) => call.name)).toContain('putImageData');
    expect(calls.map((call) => call.name)).toContain('stroke');
    expect((context as unknown as { lineWidth: number }).lineWidth).toBe(2);
  });

  it('skips the outline when none is requested and tolerates an empty canvas', () => {
    const { context, calls } = fakeContext(0);
    paintTriangle(context, 0, 0, { hue: 90, outline: '', pixelRatio: 1 });
    expect(calls.map((call) => call.name)).toEqual(['clearRect']);
  });
});
