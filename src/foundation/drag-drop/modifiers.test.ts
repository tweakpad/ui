import { describe, expect, it } from 'vitest';
import { Rectangle } from './geometry.js';
import {
  applyModifiers,
  AxisModifier,
  RestrictToElement,
  RestrictToHorizontalAxis,
  RestrictToVerticalAxis,
  RestrictToWindow,
  restrictShapeToBoundingRectangle,
  SnapModifier,
} from './modifiers.js';
import type { ModifierOperation } from './modifiers.js';
const operation = (x: number, y: number): ModifierOperation => ({
  transform: { x, y },
  shape: null,
  source: null,
});
describe('source-derived modifiers', () => {
  it('uses ordered intermediate transforms, fixed axes and explicit disabled pass-through', () => {
    const axis = new AxisModifier({ axis: 'x', value: 7 });
    expect(applyModifiers(operation(5, -21), [axis, new SnapModifier()])).toEqual({
      x: 20,
      y: -20,
    });
    axis.disabled = true;
    expect(applyModifiers(operation(5, 3), [axis])).toEqual({ x: 5, y: 3 });
    expect(new RestrictToVerticalAxis().apply(operation(5, 3))).toEqual({ x: 0, y: 3 });
    expect(new RestrictToHorizontalAxis().apply(operation(5, 3))).toEqual({ x: 5, y: 0 });
  });
  it('uses ceil for negative deltas and independent positive finite grids', () => {
    expect(new SnapModifier({ size: { x: 5, y: 10 } }).apply(operation(-6, -11))).toEqual({
      x: -5,
      y: -10,
    });
    for (const size of [0, -1, NaN, Infinity]) expect(() => new SnapModifier({ size })).toThrow();
    expect(() => applyModifiers(operation(0, 0), [{ apply: () => ({ x: NaN, y: 0 }) }])).toThrow();
  });
  it('preserves source inclusive top/left precedence for oversized shapes', () => {
    const bounds = new Rectangle(10, 10, 100, 100);
    expect(
      restrictShapeToBoundingRectangle(new Rectangle(0, 0, 200, 200), { x: 0, y: 0 }, bounds),
    ).toEqual({ x: 10, y: 10 });
    expect(
      restrictShapeToBoundingRectangle(new Rectangle(20, 20, 20, 20), { x: 100, y: -100 }, bounds),
    ).toEqual({ x: 70, y: -10 });
  });
  it('constructs and applies absent DOM bounds without browser globals', () => {
    for (const modifier of [new RestrictToElement(), new RestrictToWindow()]) {
      expect(modifier.apply(operation(1, 2))).toEqual({ x: 1, y: 2 });
      modifier.destroy();
      modifier.destroy();
    }
  });
});
