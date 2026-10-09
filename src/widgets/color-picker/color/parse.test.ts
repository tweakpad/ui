import { describe, expect, it } from 'vitest';
import { convertColor } from './convert.js';
import { namedColorCount } from './named.js';
import { detectColorFormat, parseColor } from './parse.js';
import { serializeColor } from './serialize.js';

const hex = (input: string): string | null => {
  const parsed = parseColor(input);
  return parsed && serializeColor(parsed, 'hex');
};

describe('parseColor', () => {
  it('parses hex notations including tweakpane prefixes', () => {
    expect(hex('#123')).toBe('#112233');
    expect(hex('#1234')).toBe('#11223344');
    expect(hex('#12345678')).toBe('#12345678');
    expect(hex('0x112233')).toBe('#112233');
    expect(hex(' #FFF ')).toBe('#ffffff');
    expect(parseColor('112233')).toBeNull();
    expect(parseColor('#12345')).toBeNull();
    expect(parseColor('0x123')).toBeNull();
    expect(parseColor('#eeffgg')).toBeNull();
  });

  it('parses rgb in legacy and modern syntax', () => {
    expect(hex('rgb(0,128,255)')).toBe('#0080ff');
    expect(hex('rgba(255, 0, 0, .5)')).toBe('#ff000080');
    expect(hex('rgb(255 0 0 / 0.5)')).toBe('#ff000080');
    expect(hex('rgb(100% 0% 0% / 50%)')).toBe('#ff000080');
    expect(hex('rgb( 1 , 2 , 3 )')).toBe('#010203');
    expect(hex('rgb(none 0 0)')).toBe('#000000');
    expect(parseColor('rgb(1 2)')).toBeNull();
    expect(parseColor('rgb(1, 2, 3, 4, 5)')).toBeNull();
    expect(parseColor('rgb(10%, 20, 30)')).toBeNull();
  });

  it('parses hsl with angle units, hwb, hsv and cmyk', () => {
    expect(parseColor('hsl(120deg 100% 50%)')!.coords).toEqual([120, 100, 50]);
    expect(parseColor('hsla(120, 100%, 50%, 0.5)')!.alpha).toBe(0.5);
    expect(parseColor('hsl(120 100 50)')!.coords).toEqual([120, 100, 50]);
    expect(parseColor('hsl(-120 100% 50%)')!.coords[0]).toBe(240);
    expect(parseColor('hsl(3rad 100% 50%)')!.coords[0]).toBeCloseTo(171.887, 3);
    expect(parseColor('hsl(200grad 100% 50%)')!.coords[0]).toBeCloseTo(180, 6);
    expect(parseColor('hsl(0.25turn 100% 50%)')!.coords[0]).toBeCloseTo(90, 6);
    expect(parseColor('hsl(55, ..66, 78)')).toBeNull();
    expect(parseColor('hsl(1 2 3 4)')).toBeNull();
    expect(hex('hwb(120 0% 0%)')).toBe('#00ff00');
    expect(hex('hwb(0 50% 50%)')).toBe('#808080');
    expect(parseColor('hsv(0 100% 100%)')!.space).toBe('hsv');
    expect(hex('hsb(120 100% 100%)')).toBe('#00ff00');
    const cmyk = parseColor('device-cmyk(0% 81% 81% 30%)')!;
    expect(cmyk.space).toBe('cmyk');
    expect(cmyk.coords).toEqual([0, 81, 81, 30]);
    expect(parseColor('device-cmyk(0 0.5 1 0)')!.coords).toEqual([0, 50, 100, 0]);
  });

  it('parses lab, lch, oklab, oklch and color()', () => {
    expect(parseColor('lab(50% 0 0)')!.coords).toEqual([50, 0, 0]);
    expect(parseColor('lab(29.2345 39.3825 20.0664)')!.coords).toEqual([29.2345, 39.3825, 20.0664]);
    expect(parseColor('lch(50% 100% 0.5turn)')!.coords).toEqual([50, 150, 180]);
    const oklab = parseColor('oklab(50% 10% -20%)')!.coords;
    expect(oklab[0]).toBeCloseTo(0.5, 9);
    expect(oklab[1]).toBeCloseTo(0.04, 9);
    expect(oklab[2]).toBeCloseTo(-0.08, 9);
    expect(parseColor('oklch(70% 0.15 230)')!.coords).toEqual([0.7, 0.15, 230]);
    expect(parseColor('oklch(0.7 50% 230deg / 0.5)')!.coords).toEqual([0.7, 0.2, 230]);
    expect(hex('color(srgb 1 0 0)')).toBe('#ff0000');
    expect(hex('color(srgb-linear 1 0 0)')).toBe('#ff0000');
    expect(hex('color(xyz-d65 0.9505 1 1.089)')).toBe('#ffffff');
    expect(parseColor('color(xyz-d50 0.9643 1 0.8251)')!.space).toBe('xyz-d50');
    expect(parseColor('color(display-p3 1 0 0)')).toBeNull();
    expect(parseColor('lab(1, 2, 3)')).toBeNull();
  });

  it('parses named colors, transparent and rejects nonsense', () => {
    expect(namedColorCount()).toBe(148);
    expect(hex('rebeccapurple')).toBe('#663399');
    expect(hex('RED')).toBe('#ff0000');
    expect(parseColor('Transparent')).toMatchObject({ alpha: 0, coords: [0, 0, 0] });
    expect(parseColor('foo')).toBeNull();
    expect(parseColor('')).toBeNull();
    expect(parseColor('rgb(')).toBeNull();
  });

  it('never clamps channels but clamps alpha', () => {
    const wide = parseColor('rgb(300 -10 0 / 150%)')!;
    expect(wide.coords[0]).toBeCloseTo(300 / 255, 6);
    expect(wide.coords[1]).toBeCloseTo(-10 / 255, 6);
    expect(wide.alpha).toBe(1);
    expect(convertColor(wide, 'srgb').coords[0]).toBeGreaterThan(1);
  });

  it('detects the format of a string', () => {
    expect(detectColorFormat('#fff')).toBe('hex');
    expect(detectColorFormat('red')).toBe('hex');
    expect(detectColorFormat('rgb(1 2 3)')).toBe('rgb');
    expect(detectColorFormat('color(srgb 1 0 0)')).toBe('rgb');
    expect(detectColorFormat('hsla(1, 2%, 3%, 1)')).toBe('hsl');
    expect(detectColorFormat('hwb(1 2% 3%)')).toBe('hwb');
    expect(detectColorFormat('hsb(1 2% 3%)')).toBe('hsv');
    expect(detectColorFormat('lch(1 2 3)')).toBe('lab');
    expect(detectColorFormat('oklab(1 0 0)')).toBe('oklab');
    expect(detectColorFormat('oklch(1 0 0)')).toBe('oklch');
    expect(detectColorFormat('device-cmyk(0 0 0 1)')).toBe('cmyk');
    expect(detectColorFormat('nope')).toBeNull();
  });
});
