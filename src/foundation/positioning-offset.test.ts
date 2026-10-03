import { describe, expect, it } from 'vitest';
import {
  computeSurfacePosition,
  geometryOffsets,
  rect,
  type PositioningOffsetContext,
} from './positioning.js';

describe('shared geometry offset stage', () => {
  it('evaluates dimensions and alignment on each collision candidate', () => {
    const contexts: PositioningOffsetContext[] = [];
    const result = computeSurfacePosition(
      rect(50, 5, 30, 10),
      rect(0, 0, 40, 20),
      rect(0, 0, 200, 200),
      {
        placement: 'top-start',
        padding: 0,
        offset: geometryOffsets(
          (context) => {
            contexts.push(context);
            return context.anchor.height;
          },
          (context) => context.positioner.width / 10,
        ),
      },
    );
    expect(result?.placement).toBe('bottom-start');
    expect(result?.x).toBe(54);
    expect(result?.y).toBe(25);
    expect(contexts).toContainEqual({
      side: 'top',
      align: 'start',
      anchor: { width: 30, height: 10 },
      positioner: { width: 40, height: 20 },
    });
    expect(contexts).toContainEqual({
      side: 'bottom',
      align: 'start',
      anchor: { width: 30, height: 10 },
      positioner: { width: 40, height: 20 },
    });
  });
  it('keeps numeric callers equivalent and reverses end alignment in RTL', () => {
    const args = [rect(70, 60, 30, 10), rect(0, 0, 40, 20), rect(0, 0, 200, 200)] as const;
    const old = computeSurfacePosition(
      ...args,
      { placement: 'bottom-end', offset: { mainAxis: 7, crossAxis: 3, alignmentAxis: 3 } },
      'rtl',
    );
    const current = computeSurfacePosition(
      ...args,
      { placement: 'bottom-end', offset: geometryOffsets(7, 3) },
      'rtl',
    );
    expect(current).toEqual(old);
    expect(current?.stageData.offset).toMatchObject({ x: 3, y: 7 });
  });
  it('reads new geometry on subsequent passes and rejects a non-finite result', () => {
    const offset = geometryOffsets((context) => context.anchor.width / 2, 0);
    const surface = rect(0, 0, 10, 10),
      boundary = rect(0, 0, 200, 200);
    expect(computeSurfacePosition(rect(20, 20, 20, 10), surface, boundary, { offset })?.y).toBe(40);
    expect(computeSurfacePosition(rect(20, 20, 40, 10), surface, boundary, { offset })?.y).toBe(50);
    expect(
      computeSurfacePosition(rect(20, 20, 20, 10), surface, boundary, {
        offset: geometryOffsets(() => NaN, 0),
      }),
    ).toBeNull();
  });
});
