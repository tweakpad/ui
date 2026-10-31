/** Color spaces of the conversion graph. Coordinates use the CSS reference ranges. */
export type ColorSpace =
  | 'srgb'
  | 'srgb-linear'
  | 'hsl'
  | 'hsv'
  | 'hwb'
  | 'cmyk'
  | 'xyz-d65'
  | 'xyz-d50'
  | 'lab'
  | 'lch'
  | 'oklab'
  | 'oklch';

/** Serialization formats offered by the color picker. */
export type ColorFormat =
  'hex' | 'rgb' | 'hsl' | 'hwb' | 'hsv' | 'lab' | 'oklab' | 'oklch' | 'cmyk';

/** Three coordinates, or four for device CMYK. */
export type Coords = readonly [number, number, number] | readonly [number, number, number, number];

/**
 * Immutable floating-point color. `srgb` and `srgb-linear` coordinates are 0–1; `hsl`,
 * `hsv` and `hwb` use hue 0–360 and percentages 0–100; `cmyk` uses four percentages
 * 0–100; `lab` uses L 0–100 and a/b around ±125; `lch` adds C 0–150 and H 0–360;
 * `oklab` uses L 0–1 and a/b around ±0.4; `oklch` adds C 0–0.4 and H 0–360; `xyz-*`
 * are unbounded.
 */
export interface ColorValue {
  readonly space: ColorSpace;
  readonly coords: Coords;
  readonly alpha: number;
}

export const COLOR_FORMATS: readonly ColorFormat[] = [
  'hex',
  'rgb',
  'hsl',
  'hwb',
  'hsv',
  'lab',
  'oklab',
  'oklch',
  'cmyk',
];

export const workingSpaceOf: Readonly<Record<ColorFormat, ColorSpace>> = {
  hex: 'srgb',
  rgb: 'srgb',
  hsl: 'hsl',
  hwb: 'hwb',
  hsv: 'hsv',
  lab: 'lab',
  oklab: 'oklab',
  oklch: 'oklch',
  cmyk: 'cmyk',
};

export function color(space: ColorSpace, coords: Coords, alpha = 1): ColorValue {
  const copy =
    coords.length === 4
      ? ([coords[0], coords[1], coords[2], coords[3]] as const)
      : ([coords[0], coords[1], coords[2]] as const);
  return Object.freeze({ space, coords: Object.freeze(copy) as Coords, alpha });
}

export function isColorFormat(value: unknown): value is ColorFormat {
  return typeof value === 'string' && (COLOR_FORMATS as readonly string[]).includes(value);
}
