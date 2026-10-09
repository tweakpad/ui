import { describe, expect, it } from 'vitest';
import { channelDefinitions } from './color/channels.js';
import { parseColor } from './color/parse.js';
import { color } from './color/types.js';
import {
  alphaGradient,
  areaGradient,
  channelGradient,
  flatGradient,
  hueConicGradient,
  hueGradient,
  wheelGradient,
} from './gradients.js';

const stops = (gradient: string) => gradient.match(/\d+(\.\d+)?%/g) ?? [];

describe('color picker gradients', () => {
  it('spans the hue spectrum along the writing-direction axis', () => {
    const gradient = hueGradient();
    expect(gradient.startsWith('linear-gradient(var(--_tp-color-picker-axis, to right)')).toBe(
      true,
    );
    expect(gradient).toContain('hsl(0 100% 50%) 0.00%');
    expect(gradient).toContain('hsl(360 100% 50%) 100.00%');
    expect(hueConicGradient()).toContain('conic-gradient(from 90deg');
    expect(wheelGradient()).toContain('radial-gradient(circle, rgb(255 255 255)');
  });

  it('paints the plane and the alpha track from the current color', () => {
    expect(areaGradient(240)).toContain('hsl(240 100% 50%)');
    expect(areaGradient(-120)).toContain('hsl(240 100% 50%)');
    const red = color('srgb', [1, 0, 0], 0.5);
    expect(alphaGradient(red)).toBe(
      'linear-gradient(var(--_tp-color-picker-axis, to right), rgb(255 0 0 / 0), rgb(255 0 0))',
    );
    expect(flatGradient(red)).toBe('linear-gradient(rgb(255 0 0 / 0.5), rgb(255 0 0 / 0.5))');
  });

  it('varies exactly one channel across its domain with a bounded stop count', () => {
    const base = parseColor('hsl(120 50% 50%)')!;
    const [, saturation] = channelDefinitions('hsl', false);
    const gradient = channelGradient(base, saturation!, 4);
    expect(stops(gradient)).toEqual(['0.00%', '25.00%', '50.00%', '75.00%', '100.00%']);
    expect(
      gradient.startsWith(
        'linear-gradient(var(--_tp-color-picker-axis, to right), rgb(128 128 128) 0.00%',
      ),
    ).toBe(true);
    expect(gradient.endsWith('rgb(0 255 0) 100.00%)')).toBe(true);
    expect(stops(channelGradient(base, saturation!, 500))).toHaveLength(65);
  });
});
