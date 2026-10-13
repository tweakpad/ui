import { describe, expect, it } from 'vitest';
import {
  collectMarkers,
  markerGeometry,
  markerId,
  markerPadding,
  normalizeMarker,
} from './markers.js';

describe('edge markers', () => {
  it('derives stable ids', () => {
    expect(markerId(undefined)).toBe('');
    expect(markerId('arrow')).toBe('arrow');
    expect(markerId('arrow', 'flow1')).toBe('flow1__arrow');
    expect(markerId({ type: 'arrowclosed', color: 'red', width: 10 })).toBe(
      'color=red&type=arrowclosed&width=10',
    );
    expect(markerId({ width: 10, type: 'arrowclosed', color: 'red' }, 'f')).toBe(
      'f__color=red&type=arrowclosed&width=10',
    );
  });

  it('normalizes definitions with defaults', () => {
    expect(normalizeMarker('circle')).toEqual({
      type: 'circle',
      width: 12.5,
      height: 12.5,
      strokeWidth: 1,
      orient: 'auto-start-reverse',
      units: 'strokeWidth',
    });
    expect(normalizeMarker({ type: 'arrow', color: 'blue', orient: 90 }).orient).toBe(90);
    expect(normalizeMarker({ type: 'arrow', color: 'blue' }).color).toBe('blue');
  });

  it('collects unique markers sorted by id', () => {
    const markers = collectMarkers(
      [
        { markerEnd: 'arrow' },
        { markerEnd: 'arrow', markerStart: { type: 'circle', color: 'red' } },
        { markerStart: { type: 'circle', color: 'red' } },
        {},
      ],
      { prefix: 'f', defaultColor: 'gray' },
    );
    expect(markers.map((marker) => marker.id)).toEqual(['f__arrow', 'f__color=red&type=circle']);
    expect(markers[0]!.color).toBe('gray');
    expect(markers[1]!.color).toBe('red');
    const defaults = collectMarkers([{}], { defaultMarkerEnd: 'arrowclosed' });
    expect(defaults).toHaveLength(1);
    expect(defaults[0]!.type).toBe('arrowclosed');
  });

  it('describes symbol geometry in a shared view box', () => {
    const arrow = markerGeometry('arrow');
    expect(arrow.viewBox).toEqual([-10, -10, 20, 20]);
    expect(arrow.shape).toEqual({
      kind: 'polyline',
      points: [
        { x: -5, y: -4 },
        { x: 0, y: 0 },
        { x: -5, y: 4 },
      ],
      closed: false,
      filled: false,
    });
    expect(arrow.d).toBe('M-5,-4 L0,0 L-5,4');
    expect(markerGeometry('arrowclosed').d.endsWith('Z')).toBe(true);
    expect(markerGeometry('circle').shape.kind).toBe('circle');
    expect(markerGeometry({ type: 'diamond' }).shape).toMatchObject({
      kind: 'polyline',
      closed: true,
      filled: true,
    });
  });

  it('pads bounds by the largest marker', () => {
    expect(markerPadding({})).toBe(0);
    expect(markerPadding({ markerEnd: 'arrow' })).toBe(12.5);
    expect(markerPadding({ markerEnd: 'arrow' }, 2)).toBe(25);
    expect(
      markerPadding({ markerStart: { type: 'circle', width: 20, units: 'userSpaceOnUse' } }, 2),
    ).toBe(20);
  });
});
