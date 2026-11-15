import { describe, expect, it } from 'vitest';
import {
  REGION_HANDLES,
  centredView,
  clampView,
  containZoom,
  coverZoom,
  initialRegion,
  moveRegion,
  normalizeRotation,
  parseAspectRatio,
  resizeRegion,
  resolveLength,
  resolveMinZoom,
  rotateAround,
  rotatedBounds,
  straightenBase,
  valueOfView,
  viewOfValue,
  zoomRange,
  type Rect,
  type RegionLimits,
} from '../../../../src/widgets/image-editor/geometry.js';

const image = { width: 400, height: 200 };
const frame: Rect = { x: 0, y: 0, width: 200, height: 200 };
const fonts = { root: 16, element: 20 };
const free: RegionLimits = { minWidth: 20, minHeight: 20, maxWidth: 1000, maxHeight: 1000 };
const bounds: Rect = { x: 0, y: 0, width: 800, height: 600 };
const near = (value: number, expected: number) => expect(value).toBeCloseTo(expected, 6);

describe('image editor rotation', () => {
  it('normalizes to (-180, 180]', () => {
    expect(normalizeRotation(180)).toBe(180);
    expect(normalizeRotation(-180)).toBe(180);
    expect(normalizeRotation(270)).toBe(-90);
    expect(normalizeRotation(-0)).toBe(0);
    expect(normalizeRotation(Number.NaN)).toBe(0);
  });

  it('straightens from a quarter turn that keeps the ends of the range', () => {
    expect(straightenBase(0)).toBe(0);
    expect(straightenBase(45)).toBe(0);
    expect(straightenBase(-45)).toBe(0);
    expect(straightenBase(46)).toBe(90);
    expect(straightenBase(135)).toBe(90);
    expect(straightenBase(136)).toBe(180);
    expect(straightenBase(-136)).toBe(180);
    expect(straightenBase(-100)).toBe(-90);
  });

  it('swaps the bounding box at quarter turns exactly', () => {
    expect(rotatedBounds(image, 90)).toEqual({ width: 200, height: 400 });
    expect(rotatedBounds(image, 180)).toEqual(image);
    const box = rotatedBounds(image, 37);
    const radians = (37 * Math.PI) / 180;
    near(box.width, 400 * Math.cos(radians) + 200 * Math.sin(radians));
  });
});

describe('image editor zoom floors', () => {
  it('covers and contains a frame at 0° and 90°', () => {
    // 400×200 image in a 200×200 frame: covering needs the height, containing the width.
    near(coverZoom(image, 0, frame), 1);
    near(containZoom(image, 0, frame), 0.5);
    // A quarter turn makes it 200×400.
    near(coverZoom(image, 90, frame), 1);
    near(containZoom(image, 90, frame), 0.5);
  });

  it('covers a frame with the rotated image itself, not its bounding box', () => {
    const square = { width: 100, height: 100 };
    const zoom = coverZoom(square, 45, { width: 100, height: 100 });
    // A turned square must grow by √2 to keep the frame's corners on it.
    near(zoom, Math.SQRT2);
  });

  it('builds the range from the fit and the limits', () => {
    expect(zoomRange(image, 0, frame, 'cover', undefined, 8)).toEqual({ min: 1, max: 8, fit: 1 });
    expect(zoomRange(image, 0, frame, 'contain', 0.75, 8).min).toBe(0.75);
    expect(zoomRange(image, 0, frame, 'none', undefined, 8).min).toBe(0.25);
    expect(zoomRange(image, 0, frame, 'none', 0.1, 8).min).toBe(0.1);
    // The maximum never drops below the floor.
    expect(zoomRange(image, 0, frame, 'cover', undefined, 0.5).max).toBe(1);
  });

  it('reads min-zoom as a zoom or as a length of the longer side', () => {
    const length = (text: string) => resolveLength(text, 0, fonts);
    expect(resolveMinZoom(0.5, image, length)).toBe(0.5);
    expect(resolveMinZoom('0.5', image, length)).toBe(0.5);
    expect(resolveMinZoom('100px', image, length)).toBe(0.25);
    expect(resolveMinZoom('10rem', image, length)).toBe(0.4);
    expect(resolveMinZoom('nope', image, length)).toBeUndefined();
  });

  it('resolves CSS lengths', () => {
    expect(resolveLength('12px', 0, fonts)).toBe(12);
    expect(resolveLength('2rem', 0, fonts)).toBe(32);
    expect(resolveLength('2em', 0, fonts)).toBe(40);
    expect(resolveLength('50%', 300, fonts)).toBe(150);
    expect(resolveLength(7, 0, fonts)).toBe(7);
    expect(resolveLength('auto', 0, fonts)).toBeUndefined();
  });
});

describe('image editor pan clamp', () => {
  it('keeps a covering image over every corner of the frame', () => {
    const view = clampView({ x: 50, y: 50, zoom: 1 }, image, 0, frame, 'cover');
    expect(view).toEqual({ x: 0, y: 0, zoom: 1 });
    const right = clampView({ x: -500, y: 0, zoom: 1 }, image, 0, frame, 'cover');
    expect(right.x).toBe(-200);
  });

  it('keeps a rotated covering image over the frame corners', () => {
    const square = { width: 100, height: 100 };
    const small: Rect = { x: 0, y: 0, width: 50, height: 50 };
    const view = clampView({ x: 400, y: 400, zoom: 1 }, square, 30, small, 'cover');
    const box = rotatedBounds(square, 30);
    const radians = (30 * Math.PI) / 180;
    for (const [cx, cy] of [
      [0, 0],
      [50, 0],
      [0, 50],
      [50, 50],
    ]) {
      // The corner in image-local coordinates lies inside the image.
      const dx = cx! - view.x - box.width / 2;
      const dy = cy! - view.y - box.height / 2;
      const lx = dx * Math.cos(radians) + dy * Math.sin(radians);
      const ly = -dx * Math.sin(radians) + dy * Math.cos(radians);
      expect(Math.abs(lx)).toBeLessThanOrEqual(50 + 1e-6);
      expect(Math.abs(ly)).toBeLessThanOrEqual(50 + 1e-6);
    }
  });

  it('centres a contained axis and stops gaps on a larger one', () => {
    const view = clampView({ x: 30, y: 30, zoom: 0.5 }, image, 0, frame, 'contain');
    // 200×100 at this zoom: the width fills the frame, the height centres.
    expect(view).toEqual({ x: 0, y: 50, zoom: 0.5 });
  });

  it('keeps the frame centre over the image without a fit', () => {
    const view = clampView({ x: 500, y: 0, zoom: 0.25 }, image, 0, frame, 'none');
    expect(view.x).toBe(100);
  });
});

describe('image editor value', () => {
  it('round-trips a view through a value', () => {
    const view = { x: -120, y: -40, zoom: 1.5 };
    const value = valueOfView(view, frame, 0);
    expect(value).toEqual({ x: 80, y: 80 / 3, width: 200 / 1.5, height: 200 / 1.5, rotation: 0 });
    const back = viewOfValue(value, frame);
    near(back.x, view.x);
    near(back.y, view.y);
    near(back.zoom, view.zoom);
  });

  it('centres an image at a zoom', () => {
    expect(centredView(image, 0, frame, 0.5)).toEqual({ x: 0, y: 50, zoom: 0.5 });
  });

  it('keeps the image point under the pivot when it turns', () => {
    const view = { x: 0, y: 50, zoom: 0.5 };
    const pivot = { x: 100, y: 100 };
    const turned = rotateAround(view, image, 0, 90, pivot);
    // The pivot is the image centre, so the turned box centres on it too.
    const box = rotatedBounds(image, 90);
    near(turned.x + (box.width / 2) * turned.zoom, 100);
    near(turned.y + (box.height / 2) * turned.zoom, 100);
  });
});

describe('image editor region', () => {
  it('parses aspect ratios', () => {
    expect(parseAspectRatio('16/9')).toBeCloseTo(16 / 9);
    expect(parseAspectRatio('4:3')).toBeCloseTo(4 / 3);
    expect(parseAspectRatio(1.5)).toBe(1.5);
    expect(parseAspectRatio('0')).toBeUndefined();
    expect(parseAspectRatio('')).toBeUndefined();
  });

  it('starts as the largest region of the ratio inside the inset, centred', () => {
    expect(initialRegion(bounds, 1, free, 20)).toEqual({ x: 120, y: 20, width: 560, height: 560 });
    expect(initialRegion(bounds, undefined, free, 0)).toEqual(bounds);
    const sized = initialRegion(bounds, 2, free, 0, 300);
    expect(sized).toEqual({ x: 250, y: 225, width: 300, height: 150 });
  });

  it('moves inside its bounds', () => {
    const region = { x: 10, y: 10, width: 100, height: 100 };
    expect(moveRegion(region, -50, 1000, bounds)).toEqual({
      x: 0,
      y: 500,
      width: 100,
      height: 100,
    });
  });

  it('resizes from every handle, keeping the ratio and the opposite side', () => {
    const start = { x: 300, y: 200, width: 200, height: 100 };
    for (const handle of REGION_HANDLES) {
      const next = resizeRegion(start, handle, 40, 40, 2, free, bounds);
      near(next.width / next.height, 2);
      if (handle.includes('e')) near(next.x, start.x);
      if (handle.includes('w')) near(next.x + next.width, start.x + start.width);
      if (handle.includes('s')) near(next.y, start.y);
      if (handle.includes('n')) near(next.y + next.height, start.y + start.height);
    }
  });

  it('lets a corner follow its dominant movement', () => {
    const start = { x: 300, y: 200, width: 200, height: 100 };
    const shrunk = resizeRegion(start, 'se', -100, -5, 2, free, bounds);
    expect(shrunk.width).toBe(100);
  });

  it('holds a free region to its limits and bounds', () => {
    const start = { x: 700, y: 500, width: 80, height: 80 };
    const limits = { minWidth: 50, minHeight: 50, maxWidth: 1000, maxHeight: 1000 };
    expect(resizeRegion(start, 'se', 500, 500, undefined, limits, bounds)).toEqual({
      x: 700,
      y: 500,
      width: 100,
      height: 100,
    });
    expect(resizeRegion(start, 'nw', 200, 200, undefined, limits, bounds)).toEqual({
      x: 730,
      y: 530,
      width: 50,
      height: 50,
    });
  });

  it('keeps a square circle region square at its limits', () => {
    const limits = { minWidth: 48, minHeight: 20, maxWidth: 300, maxHeight: 1000 };
    const next = resizeRegion(
      { x: 100, y: 100, width: 200, height: 200 },
      'e',
      500,
      0,
      1,
      limits,
      bounds,
    );
    expect(next.width).toBe(300);
    expect(next.height).toBe(300);
  });
});
