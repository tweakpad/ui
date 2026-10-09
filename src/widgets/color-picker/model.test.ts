import { describe, expect, it } from 'vitest';
import { ALPHA_CHANNEL, channelDefinitions } from './color/channels.js';
import { convertColor } from './color/convert.js';
import { parseColor } from './color/parse.js';
import { serializeColor } from './color/serialize.js';
import { color } from './color/types.js';
import {
  channelDisplayValue,
  fromHsv,
  hsvOf,
  normalizeColorText,
  stickyHsv,
  toWorkingSpace,
  withAlpha,
  withChannel,
} from './model.js';

describe('color picker model', () => {
  it('normalizes any notation into the active format and alpha policy', () => {
    expect(normalizeColorText('rgb(255, 0, 0)', 'hex', true)).toBe('#ff0000');
    expect(normalizeColorText('#ff000080', 'hex', false)).toBe('#ff0000');
    expect(normalizeColorText('#ff000080', 'rgb', true)).toBe('rgb(255 0 0 / 0.5)');
    expect(normalizeColorText('not a color', 'hex', true)).toBe('');
  });

  it('keeps the color invariant across every working space', () => {
    const start = parseColor('#6d5dfc')!;
    let current = start;
    for (const format of [
      'rgb',
      'hsl',
      'hwb',
      'hsv',
      'lab',
      'oklab',
      'oklch',
      'cmyk',
      'hex',
    ] as const)
      current = toWorkingSpace(current, format);
    const back = convertColor(current, 'srgb');
    for (let index = 0; index < 3; index++)
      expect(back.coords[index]).toBeCloseTo(start.coords[index]!, 4);
    expect(serializeColor(current, 'hex')).toBe('#6d5dfc');
  });

  it('edits one channel from its display value, clamped or wrapped', () => {
    const base = toWorkingSpace(parseColor('#6d5dfc')!, 'hsl');
    const [hue, saturation] = channelDefinitions('hsl', false);
    expect(withChannel(base, hue!, 400).coords[0]).toBeCloseTo(40);
    expect(withChannel(base, hue!, 360).coords[0]).toBe(360);
    expect(channelDisplayValue(withChannel(base, saturation!, 150), saturation!)).toBe(100);
    expect(withChannel(base, ALPHA_CHANNEL, 50).alpha).toBe(0.5);
    expect(channelDisplayValue(withChannel(base, ALPHA_CHANNEL, 50), ALPHA_CHANNEL)).toBe(50);
  });

  it('builds a color from HSV in the working space of the format, keeping alpha', () => {
    const value = fromHsv({ h: 0, s: 100, v: 100 }, 0.25, 'oklch');
    expect(value.space).toBe('oklch');
    expect(value.alpha).toBe(0.25);
    expect(serializeColor(withAlpha(value, 1), 'hex')).toBe('#ff0000');
    const hue = hsvOf(value).h;
    expect(Math.min(hue, 360 - hue)).toBeLessThan(0.01);
  });

  it('keeps the last chromatic hue and saturation through black, white and gray', () => {
    const previous = { h: 200, s: 80, v: 60 };
    expect(stickyHsv(previous, color('srgb', [0, 0, 0]))).toEqual({ h: 200, s: 80, v: 0 });
    expect(stickyHsv(previous, color('srgb', [1, 1, 1]))).toEqual({ h: 200, s: 0, v: 100 });
    const chromatic = stickyHsv(previous, color('srgb', [1, 0, 0]));
    expect(chromatic.h).toBeCloseTo(0);
    expect(chromatic.s).toBeCloseTo(100);
  });
});
