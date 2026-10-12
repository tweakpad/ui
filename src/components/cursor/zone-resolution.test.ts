import { describe, expect, it } from 'vitest';
import {
  mouseLikePointer,
  readAdoptedProperties,
  selectActiveZone,
  unionBounds,
  zoneBounds,
  type HoveredZone,
} from './zone-resolution.js';

const hovered = (
  zone: string,
  depth: number,
  order: number,
  roots: readonly string[] | null = null,
  disabled = false,
): HoveredZone<string> => ({
  zone,
  depth,
  order,
  disabled,
  addresses: (root) => roots === null || roots.includes(root as string),
});

describe('selectActiveZone', () => {
  it('prefers the innermost zone, then the latest entered, and ignores disabled or foreign zones', () => {
    expect(selectActiveZone([hovered('outer', 2, 1), hovered('inner', 5, 2)], 'a')).toBe('inner');
    expect(selectActiveZone([hovered('first', 3, 1), hovered('second', 3, 2)], 'a')).toBe('second');
    expect(
      selectActiveZone([hovered('inner', 5, 2, null, true), hovered('outer', 2, 1)], 'a'),
    ).toBe('outer');
    expect(selectActiveZone([hovered('ring', 5, 1, ['ring']), hovered('any', 2, 2)], 'dot')).toBe(
      'any',
    );
    expect(selectActiveZone([hovered('ring', 5, 1, ['ring'])], 'dot')).toBeNull();
    expect(selectActiveZone([], 'a')).toBeNull();
  });
});

describe('mouseLikePointer', () => {
  it('accepts mouse, pen and untyped pointers only', () => {
    expect(['mouse', 'pen', '', undefined].map(mouseLikePointer)).toEqual([true, true, true, true]);
    expect(mouseLikePointer('touch')).toBe(false);
  });
});

describe('readAdoptedProperties', () => {
  it('reads the set adoptable properties and skips empty ones', () => {
    const values: Record<string, string> = {
      '--tp-cursor-size': ' 4rem ',
      '--tp-cursor-blend': 'difference',
      '--tp-cursor-opacity': '',
      '--tp-other': 'x',
    };
    expect([...readAdoptedProperties({ getPropertyValue: (name) => values[name] ?? '' })]).toEqual([
      ['--tp-cursor-size', '4rem'],
      ['--tp-cursor-blend', 'difference'],
    ]);
  });
});

const rect = (left: number, top: number, width: number, height: number) =>
  ({ left, top, width, height, right: left + width, bottom: top + height }) as DOMRectReadOnly;

describe('bounds', () => {
  it('unions boxes with area and ignores empty ones', () => {
    expect(unionBounds([rect(10, 10, 20, 20), rect(50, 5, 10, 40), rect(0, 0, 0, 0)])).toEqual({
      x: 10,
      y: 5,
      width: 50,
      height: 40,
    });
    expect(unionBounds([rect(0, 0, 0, 0)])).toBeNull();
  });

  it('uses the zone box when it has one, otherwise its element children', () => {
    const boxed = {
      getBoundingClientRect: () => rect(1, 2, 30, 40),
      children: [],
    } as unknown as Element;
    expect(zoneBounds(boxed)).toEqual(rect(1, 2, 30, 40));
    const contents = {
      getBoundingClientRect: () => rect(0, 0, 0, 0),
      children: [
        { localName: 'template', getBoundingClientRect: () => rect(0, 0, 999, 999) },
        { localName: 'button', getBoundingClientRect: () => rect(10, 10, 20, 20) },
        { localName: 'img', getBoundingClientRect: () => rect(40, 10, 20, 30) },
      ],
    } as unknown as Element;
    expect(zoneBounds(contents)).toEqual({ x: 10, y: 10, width: 50, height: 30 });
  });
});
