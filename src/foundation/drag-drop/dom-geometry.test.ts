import { expect, it } from 'vitest';
import {
  applyTransform,
  getFrameTransform,
  inverseTransform,
  parseTransform,
} from './dom-geometry.js';
import { Rectangle } from './geometry.js';
it('parses independent values, comma spacing and matrix3d without NaN defaults', () => {
  expect(
    parseTransform({ translate: '12px', scale: '2', transform: 'matrix(1,0,0,3,5,6)' }),
  ).toEqual({ x: 17, y: 6, z: 0, scaleX: 2, scaleY: 6 });
  expect(parseTransform({ transform: 'matrix3d(1, 0,0,0,0,2,0,0,0,0,1,0,10,20,0,1)' })).toEqual({
    x: 10,
    y: 20,
    scaleX: 1,
    scaleY: 2,
  });
  expect(parseTransform({ scale: 'none', translate: 'none', transform: 'none' })).toBeNull();
  expect(parseTransform({ translate: 'NaN' })).toBeNull();
});
it('normalizes negative scale rectangles and round trips origins', () => {
  const rect = new Rectangle(10, 20, 50, 80),
    transform = { x: 4, y: 8, scaleX: -2, scaleY: 0.5 };
  const projected = applyTransform(rect, transform, '25px 40px');
  expect(projected.width).toBe(100);
  expect(inverseTransform(projected, transform, '25px 40px')).toEqual(rect);
  expect(() => inverseTransform(rect, { ...transform, scaleX: 0 })).toThrow();
});
it('composes scaled nested owner frames including frame borders', () => {
  const frame = (left: number, top: number, parent: unknown) => ({
    offsetWidth: 100,
    offsetHeight: 100,
    clientLeft: 1,
    clientTop: 2,
    getBoundingClientRect: () => ({ left, top, width: 200, height: 300 }),
    ownerDocument: { defaultView: parent },
  });
  const outer = frame(100, 200, { frameElement: null });
  const inner = frame(10, 20, { frameElement: outer });
  const element = { ownerDocument: { defaultView: { frameElement: inner } } } as unknown as Element;
  expect(getFrameTransform(element)).toEqual({ x: 126, y: 284, scaleX: 4, scaleY: 9 });
});
