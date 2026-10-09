import { convertColor, mixColors, normalizeHue } from './convert.js';
import { toGamut } from './gamut.js';
import { color, type ColorValue } from './types.js';

export type SchemeRowId =
  'tints' | 'shades' | 'tones' | 'analogous' | 'complementary' | 'triad' | 'tetrad';

export interface SchemeRow {
  readonly id: SchemeRowId;
  readonly colors: readonly ColorValue[];
}

const WHITE = color('srgb', [1, 1, 1]);
const BLACK = color('srgb', [0, 0, 0]);
const STEPS = 7;

const range = (count: number): number[] => Array.from({ length: count }, (_, index) => index);

function withHue(base: ColorValue, offset: number, lightnessOffset = 0): ColorValue {
  const [l, c, h] = base.coords;
  return color(
    'oklch',
    [Math.min(1, Math.max(0, l + lightnessOffset)), c, normalizeHue(h + offset)],
    base.alpha,
  );
}

/**
 * Scheme rows generated from one color in OKLab/OKLCH, every entry gamut-mapped to sRGB.
 * Used by the schemes view when the consumer supplies no palettes.
 */
export function generateSchemeRows(base: ColorValue): readonly SchemeRow[] {
  const oklch = convertColor(base, 'oklch');
  const opaque = color('oklch', oklch.coords, 1);
  const map = (colors: readonly ColorValue[]): readonly ColorValue[] =>
    colors.map((entry) => color('srgb', toGamut(entry).coords, base.alpha));
  const steps = range(STEPS).map((index) => index / STEPS);
  return [
    { id: 'tints', colors: map(steps.map((t) => mixColors(opaque, WHITE, t))) },
    { id: 'shades', colors: map(steps.map((t) => mixColors(opaque, BLACK, t))) },
    {
      id: 'tones',
      colors: map(
        steps.map((t) =>
          color('oklch', [oklch.coords[0], oklch.coords[1] * (1 - t), oklch.coords[2]]),
        ),
      ),
    },
    {
      id: 'analogous',
      colors: map([-45, -30, -15, 0, 15, 30, 45].map((offset) => withHue(opaque, offset))),
    },
    {
      id: 'complementary',
      colors: map(steps.map((t) => mixColors(opaque, withHue(opaque, 180), t))),
    },
    {
      id: 'triad',
      colors: map([
        ...[0, 120, 240].map((offset) => withHue(opaque, offset)),
        ...[0, 120, 240].map((offset) => withHue(opaque, offset, 0.15)),
      ]),
    },
    {
      id: 'tetrad',
      colors: map([
        ...[0, 90, 180, 270].map((offset) => withHue(opaque, offset)),
        ...[0, 90, 180, 270].map((offset) => withHue(opaque, offset, 0.15)),
      ]),
    },
  ];
}
