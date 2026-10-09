import { describe, expect, it } from 'vitest';
import { channelDefinitions, clampChannel, formatChannelValue, wrapHue } from './channels.js';
import { colorEquals, hueDistance } from './equality.js';
import { deltaEOK, inGamut, toGamut } from './gamut.js';
import { parseColor } from './parse.js';
import { displayColor, serializeColor } from './serialize.js';
import { COLOR_FORMATS, color } from './types.js';

const parse = (input: string) => parseColor(input)!;

describe('serializeColor', () => {
  it('serializes canonical strings per format with the precision table', () => {
    const red = parse('#ff0000');
    expect(serializeColor(red, 'hex')).toBe('#ff0000');
    expect(serializeColor(red, 'rgb')).toBe('rgb(255 0 0)');
    expect(serializeColor(red, 'hsl')).toBe('hsl(0 100% 50%)');
    expect(serializeColor(red, 'hsv')).toBe('hsv(0 100% 100%)');
    expect(serializeColor(red, 'hwb')).toBe('hwb(0 0% 0%)');
    expect(serializeColor(red, 'cmyk')).toBe('device-cmyk(0% 100% 100% 0%)');
    expect(serializeColor(red, 'lab')).toBe('lab(54.3 80.8 69.9)');
    expect(serializeColor(red, 'oklab')).toBe('oklab(0.628 0.225 0.126)');
    expect(serializeColor(red, 'oklch')).toBe('oklch(0.628 0.258 29.2)');
  });

  it('matches the tweakpane parity cases with modern syntax', () => {
    expect(serializeColor(parse('rgb(0,128,255)'), 'rgb')).toBe('rgb(0 128 255)');
    expect(serializeColor(parse('rgba(12,34,56,0.7)'), 'rgb')).toBe('rgb(12 34 56 / 0.7)');
    expect(serializeColor(color('srgb', [0, 0, 0], 0.4), 'hex')).toBe('#00000066');
    expect(serializeColor(color('srgb', [0, 0, 0], 0.4), 'rgb')).toBe('rgb(0 0 0 / 0.4)');
    // hex rounds (deviation from tweakpane's floor)
    expect(serializeColor(color('srgb', [3.14 / 255, 0, 0]), 'hex')).toBe('#030000');
    expect(serializeColor(color('srgb', [400 / 255, 200 / 255, 0]), 'hex')).toBe('#ffc800');
    expect(serializeColor(color('srgb', [0.5, 0.5, 0.5], 0.5), 'hex')).toBe('#80808080');
  });

  it('omits alpha at 1 after rounding, formats small alpha and normalizes -0', () => {
    expect(serializeColor(color('srgb', [1, 1, 1], 0.999), 'rgb')).toBe('rgb(255 255 255)');
    expect(serializeColor(color('srgb', [1, 1, 1], 0.005), 'rgb')).toBe('rgb(255 255 255 / 0.01)');
    expect(serializeColor(color('oklab', [0.5, -0.0001, 0]), 'oklab')).toBe('oklab(0.5 0 0)');
    expect(serializeColor(color('hsl', [360, 50, 50]), 'hsl')).toBe('hsl(360 50% 50%)');
    expect(serializeColor(color('hsl', [361, 50, 50]), 'hsl')).toBe('hsl(1 50% 50%)');
  });

  it('serializes out-of-gamut colors exactly in lab-like formats and mapped otherwise', () => {
    const vivid = color('oklch', [0.9, 0.4, 150]);
    expect(inGamut(vivid)).toBe(false);
    expect(serializeColor(vivid, 'oklch')).toBe('oklch(0.9 0.4 150)');
    const mapped = serializeColor(vivid, 'hex');
    expect(mapped).toMatch(/^#[0-9a-f]{6}$/);
    expect(inGamut(parse(mapped))).toBe(true);
    for (const format of COLOR_FORMATS) expect(() => serializeColor(vivid, format)).not.toThrow();
  });

  it('paints with rgb() strings for the browser', () => {
    expect(displayColor(parse('#ff0000'))).toBe('rgb(255 0 0)');
    expect(displayColor(parse('#ff0000'), 0.5)).toBe('rgb(255 0 0 / 0.5)');
    expect(displayColor(color('oklch', [0.9, 0.4, 150]))).toMatch(/^rgb\(\d+ \d+ \d+\)$/);
  });
});

describe('channels', () => {
  it('defines every format with the documented domains', () => {
    for (const format of COLOR_FORMATS) {
      const channels = channelDefinitions(format, true);
      expect(channels.at(-1)!.key).toBe('alpha');
      expect(channelDefinitions(format, false).some((entry) => entry.key === 'alpha')).toBe(false);
      for (const entry of channels) {
        expect(entry.min).toBeLessThan(entry.max);
        expect(entry.step).toBeGreaterThan(0);
        expect(entry.smallStep).toBeLessThanOrEqual(entry.step);
        expect(entry.largeStep).toBeGreaterThan(entry.step);
      }
    }
    expect(channelDefinitions('cmyk', false)).toHaveLength(4);
    expect(channelDefinitions('hsl', false)[0]).toMatchObject({
      key: 'hue',
      wrap: true,
      unit: '°',
    });
    expect(channelDefinitions('rgb', false)[0]).toMatchObject({ max: 255, scale: 255 });
    expect(channelDefinitions('oklch', false)[2]).toMatchObject({ key: 'hue', precision: 1 });
  });

  it('wraps hue like tweakpane and clamps everything else', () => {
    const [hue, saturation] = channelDefinitions('hsv', false);
    expect(wrapHue(360)).toBe(360);
    expect(wrapHue(361)).toBe(1);
    expect(wrapHue(-10)).toBe(350);
    expect(clampChannel(hue!, 370)).toBe(10);
    expect(clampChannel(saturation!, 110)).toBe(100);
    expect(clampChannel(saturation!, -10)).toBe(0);
    expect(clampChannel(saturation!, Number.NaN)).toBe(0);
    const [red] = channelDefinitions('rgb', false);
    expect(clampChannel(red!, 300)).toBe(255);
    expect(formatChannelValue(red!, 254.6)).toBe('255');
    expect(formatChannelValue(channelDefinitions('oklab', false)[0]!, 0.12345)).toBe('0.123');
    expect(formatChannelValue(red!, -0.2)).toBe('0');
  });
});

describe('gamut and equality', () => {
  it('maps out-of-gamut colors by reducing chroma and keeping lightness and hue', () => {
    const vivid = color('oklch', [0.7, 0.4, 150]);
    const mapped = toGamut(vivid);
    expect(mapped.space).toBe('srgb');
    expect(inGamut(mapped)).toBe(true);
    const back = parse(serializeColor(mapped, 'oklch'));
    expect(Math.abs(back.coords[0] - 0.7)).toBeLessThan(0.01);
    expect(back.coords[1]).toBeLessThan(0.4);
    expect(hueDistance(back.coords[2], 150)).toBeLessThan(5);
    expect(toGamut(color('srgb', [0.2, 0.3, 0.4])).coords).toEqual([0.2, 0.3, 0.4]);
    expect(toGamut(color('oklch', [1.2, 0.1, 10])).coords).toEqual([1, 1, 1]);
    expect(toGamut(color('oklch', [-0.2, 0.1, 10])).coords).toEqual([0, 0, 0]);
    expect(deltaEOK(color('srgb', [0, 0, 0]), color('srgb', [1, 1, 1]))).toBeCloseTo(1, 6);
  });

  it('compares colors with tolerance and circular hue', () => {
    expect(colorEquals(parse('#ff0000'), parse('hsl(360 100% 50%)'))).toBe(true);
    expect(colorEquals(color('hsl', [0, 0, 50]), color('hsl', [200, 0, 50]))).toBe(true);
    expect(colorEquals(color('hsl', [0, 50, 50]), color('hsl', [200, 50, 50]))).toBe(false);
    expect(colorEquals(parse('#ff0000'), color('srgb', [1, 0, 0], 0.5))).toBe(false);
    expect(colorEquals(parse('#ff0000'), parse('#ff0001'), 1 / 255)).toBe(true);
    expect(hueDistance(10, 350)).toBe(20);
  });
});
