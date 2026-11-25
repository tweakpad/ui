import { describe, expect, it } from 'vitest';
import { drawnDomain, strokeReach } from '../../../../src/widgets/plot/renderer.js';

describe('drawn y domain', () => {
  it('reaches half the widest drawn stroke plus a pixel of antialiasing', () => {
    expect(strokeReach([{}])).toBe(1.25);
    expect(strokeReach([{ lineWidth: 1 }, { lineWidth: 4 }])).toBe(2.5);
    expect(strokeReach([{ line: false, lineWidth: 8 }, { lineWidth: 2 }])).toBe(1.5);
    expect(strokeReach([{ line: false }])).toBe(0);
  });

  it('widens the domain so its bounds land `edge` pixels inside the plot', () => {
    const height = 72,
      edge = 2.5,
      [low, high] = drawnDomain([-1, 1], height, edge);
    const py = (v: number) => height - ((v - low) / (high - low)) * height;
    expect(py(1)).toBeCloseTo(edge);
    expect(py(-1)).toBeCloseTo(height - edge);
    expect(py(0)).toBeCloseTo(height / 2);
  });

  it('keeps the domain when there is no stroke, no room or no span', () => {
    expect(drawnDomain([0, 1], 72, 0)).toEqual([0, 1]);
    expect(drawnDomain([0, 1], 4, 2)).toEqual([0, 1]);
    expect(drawnDomain([3, 3], 72, 2)).toEqual([3, 3]);
  });
});
